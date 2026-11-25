import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';
import test from 'node:test';
import matter from 'gray-matter';
import {buildMapTopics} from '../src/lib/map-topics.ts';
import legacy from '../config/legacy-routes.json' with {type: 'json'};
import config from '../config/site.json' with {type: 'json'};
import scenes from '../config/vn-scenes.json' with {type: 'json'};
import mainline from '../config/vn-mainline.json' with {type: 'json'};
import {readPostDates} from './post-frontmatter.mjs';

// Read only tracked real metadata and frozen routes. Never run prepare/build or copy media.
const root = fileURLToPath(new URL('../../', import.meta.url));
const files = execFileSync('git', ['ls-files', '-z', 'source/_posts/*.md'], {cwd: root, encoding: 'utf8'})
  .split('\0').filter(Boolean);
const byStem = new Map(legacy.filter(route => /^20\d\d\//.test(route))
  .map(route => [route.replace(/\/$/, '').split('/').at(-1), route]));
const list = value => Array.isArray(value) ? value.flat(Infinity).map(String) : value == null ? [] : [String(value)];
const posts = files.map(file => {
  const stem = file.split('/').at(-1).slice(0, -3);
  const route = byStem.get(stem);
  assert.ok(route, 'Frozen route for ' + file);
  const parsed = matter(fs.readFileSync(new URL('../../' + file, import.meta.url), 'utf8').replace(/^\uFEFF/, ''),{});
  const {date}=readPostDates(parsed,file);
  return {id: stem, data: {route, title: String(parsed.data.title), date, tags: list(parsed.data.tags), categories: list(parsed.data.categories)}};
});
const expected = {android: 2, windows: 1, linux: 1, unity: 1, python: 1, crypto: 8, analysis: 9, unpacking: 3};
const topicCounts = result => Object.fromEntries(result.topics.map(topic => [topic.id, topic.posts.length]));
const post = (route, tags = [], categories = []) => ({data: {route, title: route, tags, categories}});

test('real tracked corpus has 15 articles, one reverse category and 32 actual tags', () => {
  assert.equal(posts.length, 15);
  assert.equal(new Set(posts.flatMap(item => item.data.tags)).size, 32);
  assert.deepEqual(buildMapTopics(posts).categories, [{name: 'reverse', count: 15}]);
  assert.deepEqual(topicCounts(buildMapTopics(posts)), expected);
});

test('every displayed tag and article is backed by real metadata and a frozen route', () => {
  const result = buildMapTopics(posts);
  const covered = new Set();
  for (const topic of result.topics) {
    assert.ok(topic.posts.length > 0);
    for (const tag of topic.tags) assert.ok(topic.posts.some(item => item.data.tags.includes(tag)), topic.id + ': ' + tag);
    for (const item of topic.posts) {
      assert.ok(posts.includes(item), 'Preserve original post reference');
      assert.ok(legacy.includes(item.data.route), item.data.route);
      assert.ok(item.data.tags.some(tag => topic.tags.includes(tag)));
      covered.add(item.data.route);
    }
  }
  assert.equal(covered.size, posts.length);
});

test('empty and unknown tags never invent a group, location or taxonomy term', () => {
  assert.deepEqual(buildMapTopics([]), {topics: [], categories: []});
  const ungrouped = post('unmapped/', ['NewTopic'], ['ActualCategory']);
  ungrouped.data.title = 'Android Unity Linux'; // Titles are not taxonomy evidence.
  assert.deepEqual(buildMapTopics([ungrouped]), {topics: [], categories: [{name: 'ActualCategory', count: 1}]});
  const android = buildMapTopics([post('android/', ['Frida'])]);
  assert.deepEqual(android.topics.map(topic => topic.id), ['android']);
  assert.deepEqual(android.topics[0].tags, ['Frida']);
});

test('multiple matching tags and duplicate routes count each article once per group', () => {
  const first = post('one/', ['Android', 'Frida', '梆梆', 'Android'], ['reverse', 'reverse']);
  const result = buildMapTopics([first, {...first}, post('two/', ['Android'], ['reverse'])]);
  assert.equal(result.topics.find(topic => topic.id === 'android').posts.length, 2);
  assert.equal(result.topics.find(topic => topic.id === 'unpacking').posts.length, 1);
  assert.deepEqual(result.categories, [{name: 'reverse', count: 2}]);
  assert.strictEqual(result.topics[0].posts[0], first);
});

test('stable group identities do not depend on post order and preserve supplied article order', () => {
  const forward = buildMapTopics(posts);
  const backward = buildMapTopics([...posts].reverse());
  assert.deepEqual(backward.topics.map(topic => topic.id), forward.topics.map(topic => topic.id));
  for (const topic of forward.topics) {
    const reversed = backward.topics.find(candidate => candidate.id === topic.id);
    assert.deepEqual(reversed.posts, [...topic.posts].reverse());
  }
});

test('projection is immutable and includes future real articles without an unlock gate', () => {
  const freeze = item => Object.freeze({data: Object.freeze({...item.data, tags: Object.freeze([...item.data.tags]), categories: Object.freeze([...item.data.categories])})});
  const input = Object.freeze([freeze(post('existing/', ['Android'], ['reverse'])), freeze(post('future/', ['Frida'], ['new-category']))]);
  const before = JSON.stringify(input);
  const result = buildMapTopics(input);
  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(result.topics[0].posts.map(item => item.data.route), ['existing/', 'future/']);
  assert.deepEqual(result.categories, [{name: 'new-category', count: 1}, {name: 'reverse', count: 1}]);
});

// Compile real map/GamePanel templates in memory with the real helper, site route
// functions and scene manifest. Only Layout and astro:content are fixtures: no
// generated assets, browser, network, private bytes or persistent state are used.
const require = createRequire(import.meta.url);
const {transform} = require('@astrojs/compiler');
const ts = require('typescript');
const {experimental_AstroContainer} = await import(pathToFileURL(require.resolve('astro/container')).href);
const runtime = pathToFileURL(require.resolve('astro/compiler-runtime')).href;
const moduleURL = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
const jsonModule = data => moduleURL('export default ' + JSON.stringify(data));
const read = relative => fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
function rewrite(source, imports) {
  for (const [specifier, url] of Object.entries(imports)) {
    source = source.replaceAll(JSON.stringify(specifier), JSON.stringify(url)).replaceAll("'" + specifier + "'", JSON.stringify(url));
  }
  return source;
}
function compileTS(source, filename, imports = {}) {
  const compiled = ts.transpileModule(rewrite(source, imports), {
    fileName: filename, reportDiagnostics: true,
    compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022},
  });
  assert.deepEqual(compiled.diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error), [], filename + ' transpile errors');
  return moduleURL(compiled.outputText);
}
const content = data => moduleURL(`export async function getCollection(name){if(name!=='posts')throw Error('Unexpected collection');return ${JSON.stringify(data)};}`);
const siteSource = read('../src/lib/site.ts');
function siteModule(data) {
  return compileTS(siteSource, 'site.ts', {
    'astro:content': content(data),
    '../../config/legacy-routes.json': jsonModule(legacy), '../../config/vn-mainline.json': jsonModule(mainline),
    '../../config/site.json': jsonModule(config), '../../tools/post-dates.mjs': new URL('./post-dates.mjs',import.meta.url).href,
  });
}
const realSiteURL = siteModule(posts);
const realSite = await import(realSiteURL);
const runtimeSceneURL = compileTS(read('../src/lib/vn-scenes-runtime.ts'), 'vn-scenes-runtime.ts');
const sceneURL = compileTS(read('../src/lib/vn-scenes.ts'), 'vn-scenes.ts', {'../../config/vn-scenes.json': jsonModule(scenes), './vn-scenes-runtime': runtimeSceneURL});
const helperURL = new URL('../src/lib/map-topics.ts', import.meta.url).href;
async function compile(source, filename, imports = {}, original = false) {
  const compiled = await transform(source, {filename, internalURL: runtime, renderScript: true, resolvePath: specifier => imports[specifier] || specifier});
  assert.deepEqual(compiled.diagnostics.filter(item => item.severity === 1), [], filename + ' compile errors');
  const code = compiled.code.replaceAll('import.meta.env.DEV', String(original))
    .replaceAll('process.env.GINKA_MAP_DATA', JSON.stringify(original ? '/fixture-not-read' : ''));
  // Node has no Vite CSS loader: resolve the actual compiled scoped stylesheet
  // as an in-memory module, without removing the style block before compiling.
  const cssImports = Object.fromEntries(compiled.css.map((css, index) => {
    assert.ok(css.length > 0, filename + ' emitted stylesheet');
    return [filename + '?astro&type=style&index=' + index + '&lang.css', jsonModule(css)];
  }));
  return compileTS(code, filename, {...imports, ...cssImports});
}
const layoutURL = await compile('<main data-layout-fixture><slot /></main>', 'LayoutFixture.astro');
const panelURL = await compile(read('../src/components/game/GamePanel.astro'), 'GamePanel.astro', {'../../lib/vn-scenes': sceneURL});
const mapSource = read('../src/pages/map.astro');
async function renderMap({data = posts, original = false} = {}) {
  const mapURL = await compile(mapSource, 'map.astro', {
    '../layouts/Layout.astro': layoutURL, '../components/game/GamePanel.astro': panelURL,
    '../lib/site': data === posts ? realSiteURL : siteModule(data), '../lib/vn-scenes': sceneURL,
    '../lib/map-topics': helperURL,
  }, original);
  const {default: MapPage} = await import(mapURL);
  const container = await experimental_AstroContainer.create();
  return container.renderToString(MapPage, {request: new Request(config.url + '/map/')});
}
const count = (html, pattern) => (html.match(pattern) || []).length;
const decodeAttribute = text => text.replaceAll('&quot;', '"').replaceAll('&#34;', '"').replaceAll('&amp;', '&').replaceAll('&#39;', "'");

test('topic/category URLs use the actual existing site route and slug contract', async () => {
  // routes() exposes catch-all params without the trailing slash; public hrefs
  // retain the existing trailing-slash URL contract used by the real templates.
  const available = new Set((await realSite.routes()).map(route => realSite.href(route.params.path + '/')));
  for (const topic of buildMapTopics(posts).topics) {
    for (const tag of topic.tags) assert.ok(available.has(realSite.href('tags/' + realSite.tagSlug(tag) + '/')), tag);
    for (const item of topic.posts) assert.ok(available.has(realSite.href(item.data.route)), item.data.route);
  }
  for (const category of buildMapTopics(posts).categories) assert.ok(available.has(realSite.href('categories/' + realSite.tagSlug(category.name) + '/')));
});

test('real map template renders native no-JS topics below the intact artwork, with truthful labels', async () => {
  const html = await renderMap();
  assert.equal(count(html, /data-vn-map-art(?:\s|=|>)/g), 1);
  assert.equal(count(html, /data-map-enhancement(?:\s|=|>)/g), 1);
  assert.equal(count(html, /<details\b/g), 8);
  assert.equal(count(html, /<summary\b/g), 8);
  assert.ok(html.indexOf('data-map-enhancement') > html.indexOf('data-vn-map-art'));
  assert.match(html, /ENHANCEMENT · 博客新增/);
  assert.match(html, /不代表原作地点或热点/);
  assert.match(html, /原作地点坐标与阶段脚本尚未恢复/);
  assert.match(html, /不受阅读进度限制/);
  assert.match(html, /同一文章可出现在多个主题/);
  for (const id of Object.keys(expected)) assert.match(html, new RegExp('id="map-topic-' + id + '"'));
  assert.doesNotMatch(html, /__ginka_local_|<script\b|<area\b|<map\b|aria-disabled="true"|data-vn-(?:next|extra|start|resume)\b/);
  const renderedLinks = new Set([...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(match => decodeAttribute(match[1])));
  for (const item of posts) assert.ok(renderedLinks.has(realSite.href(item.data.route)), item.data.route);
  for (const target of ['/archives/', '/categories/', '/tags/', '/library/', '/search/', '/']) assert.ok(renderedLinks.has(target), target);
});

test('map phase, progress paths and private-frame selection remain the existing scene contract', async () => {
  const sitePosts = await realSite.allPosts();
  const state = (await import(sceneURL)).resolveMapState(0);
  for (const original of [false, true]) {
    const html = await renderMap({original});
    const mapTag = html.match(/<div\b[^>]*\sdata-vn-map\s[^>]*>/)?.[0];
    assert.ok(mapTag);
    const paths = mapTag.match(/data-vn-paths="([^"]+)"/)?.[1];
    assert.deepEqual(JSON.parse(decodeAttribute(paths)), sitePosts.map(item => realSite.href(item.data.route)));
    assert.ok(mapTag.includes(`data-vn-map-phase="${state.id}"`));
    assert.ok(mapTag.includes(`data-vn-map-frame="${state.id}"`));
    assert.ok(mapTag.includes(`data-vn-map-original="${original}"`));
    assert.match(html, /阅读记录 0 \/ 15/);
    assert.equal(count(html, /<details\b/g), 8);
    if (original) {
      const privateState=scenes.map.states.find(item=>item.id===state.id);
      assert.ok(privateState);
      assert.ok(mapTag.includes('data-vn-private-frame-map='));
      assert.ok(html.includes('/__ginka_local_ui__/map-' + privateState.frame + '.png'));
    } else {
      assert.doesNotMatch(mapTag,/data-vn-private-frame-map/);
      assert.doesNotMatch(html, /__ginka_local_/);
    }
  }
  assert.doesNotMatch(mapSource, /localStorage|sessionStorage|resolveTitleState|<script\b|canonical|data-vn-mainline/);
});

test('empty corpus compiles without invented topic links or unavailable controls', async () => {
  const html = await renderMap({data: []});
  assert.match(html, /暂无可分组的主题文章/);
  assert.equal(count(html, /<details\b/g), 0);
  assert.doesNotMatch(html, /href="\/(?:tags|categories)\/[^"/]+\/"/);
  assert.match(html, /href="\/archives\/"/);
  assert.match(html, /href="\/search\/"/);
});
