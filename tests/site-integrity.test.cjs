// Run with: node --test tests/*.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (['.git', '.playwright-mcp', 'vendor', 'node_modules', '.artifacts'].includes(entry.name)) return [];
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : entry.name === 'index.html' ? [full] : [];
  });
}
const pages = walk(root).map(file => ({ file, html: fs.readFileSync(file, 'utf8') }))
  .filter(page => page.html.includes('<main class="main">'));
const attr = (tag, name) => tag.match(new RegExp('(?:^|\\s)' + name + '="([^"]*)"'))?.[1];

test('every generated page has valid internal resources and a main content target', () => {
  assert.ok(pages.length > 0);
  for (const { file, html } of pages) {
    assert.equal((html.match(/id="main-content"/g) || []).length, 1, file);
    for (const [tag] of html.matchAll(/<(?:a|link|script|img)\b[^>]*>/g)) {
      const value = attr(tag, tag.startsWith('<a ') || tag.startsWith('<link ') ? 'href' : 'src');
      if (!value || /^(?:[a-z]+:|\/\/|#)/i.test(value)) continue;
      const pathname = decodeURIComponent(value.split(/[?#]/)[0]);
      const target = pathname.startsWith('/') ? path.join(root, pathname) : path.resolve(path.dirname(file), pathname);
      assert.ok(fs.existsSync(target), `${file}: missing ${value}`);
    }
  }
});

test('images reserve layout space and article images work without JavaScript', () => {
  for (const { file, html } of pages) {
    for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) {
      assert.ok(Number(attr(tag, 'width')) > 0 && Number(attr(tag, 'height')) > 0, `${file}: image dimensions`);
      assert.notEqual(attr(tag, 'alt'), undefined, `${file}: image alternative text`);
      assert.equal(attr(tag, 'data-src'), undefined, `${file}: legacy image loader`);
    }
  }
});

test('long articles have a complete contents list with valid heading targets', () => {
  let count = 0;
  for (const { file, html } of pages.filter(page => page.html.includes('itemprop="articleBody"'))) {
    const headings = [...html.matchAll(/<h[23]\s+id="([^"]+)"/g)].map(match => match[1]);
    if (headings.length < 2) continue;
    const toc = html.match(/<details class="journal-article-toc">([\s\S]*?)<\/details>/)?.[1];
    assert.ok(toc, file);
    const links = [...toc.matchAll(/href="#([^"]+)"/g)].map(match => decodeURIComponent(match[1]));
    assert.deepEqual(links, headings, file);
    count++;
  }
  assert.ok(count > 0);
});

test('shared asset versions match their file content on every page', () => {
  const assets = ['css/ginka-editorial.css', 'css/ginka-pages.css', 'css/ginka-reading.css', 'css/ginka-icons.css', 'css/noscript.css',
    'js/bookmark.js', 'js/ginka-reading.js', 'js/ginka-navigation.js', 'js/ginka-runtime.js',
    'js/ginka-controls.js', 'js/ginka-ui-shell.js', 'js/ginka-atri-loader.js', 'js/ginka-effects-loader.js', 'js/ginka-page-effects.js',
    'js/ginka-performance-monitor.js', 'js/ginka-music-loader.js', 'js/ginka-music.js',
    'js/third-party/fancybox.js', 'js/third-party/search/local-search.js'];
  for (const asset of assets) {
    const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, asset))).digest('hex').slice(0, 10);
    for (const { file, html } of pages) assert.ok(html.includes(`/${asset}?v=${hash}"`), `${file}: stale ${asset}`);
  }
});

test('initial pages never eagerly load deferred features or obsolete image libraries', () => {
  for (const { file, html } of pages) {
    const scripts = [...html.matchAll(/<script\b[^>]*>/g)].map(match => attr(match[0], 'src')).filter(Boolean);
    for (const source of scripts) assert.ok(!/(?:ginka-music\.js|fancybox\.umd|lozad|live2d-libs)/.test(source), `${file}: eager ${source}`);
    assert.ok(!html.includes('/vendor/fonts/noto-serif-sc/wght.css'), `${file}: unused font CSS`);
    assert.ok(html.includes('"lazyload":false'), `${file}: native image loading required`);
  }
});

test('the icon subset and fonts stay within their byte budgets', () => {
  const budget = JSON.parse(fs.readFileSync(path.join(root, 'reports/performance-budget.json')));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'vendor/ginka-icons/manifest.json')));
  const css = fs.readFileSync(path.join(root, 'css/ginka-icons.css'));
  assert.ok(css.length <= budget.iconCssMaxBytes);
  let total = 0;
  for (const [name, font] of Object.entries(manifest.fonts)) {
    const file = fs.readFileSync(path.join(root, 'vendor/ginka-icons', name.replace('.woff2', '-subset.woff2')));
    assert.equal(file.length, font.after);
    assert.equal(crypto.createHash('sha256').update(file).digest('hex').slice(0, 10), font.sha256);
    total += file.length;
  }
  assert.ok(total <= budget.iconFontMaxBytes);
  assert.equal(crypto.createHash('sha256').update(css).digest('hex'), manifest.cssSha256);
});

test('home pagination and the archive expose all published articles', () => {
  const home = ['index.html', 'page/2/index.html'].map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('');
  const archive = fs.readFileSync(path.join(root, 'archives/index.html'), 'utf8');
  const urls = (html, className) => [...html.matchAll(new RegExp(`<article class="${className}[^>]*>[\\s\\S]*?<h3><a href="([^"]+)"`, 'g'))].map(match => match[1]);
  const homeArticles = [...new Set(urls(home, 'journal-entry'))].sort();
  const expectedArticles = Number(home.match(/site-state-posts[\s\S]*?site-state-item-count">(\d+)/)?.[1]);
  assert.ok(expectedArticles > 0);
  assert.equal(homeArticles.length, expectedArticles);
  assert.deepEqual(homeArticles, [...new Set(urls(archive, 'journal-archive-row'))].sort());
});

test('installable icon metadata matches the real image format and dimensions', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest')));
  for (const icon of manifest.icons) {
    const image = fs.readFileSync(path.join(root, icon.src));
    let width, height, type;
    if (image.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') {
      width = image.readUInt32BE(16); height = image.readUInt32BE(20); type = 'image/png';
    } else if (image.readUInt16BE(0) === 0xffd8) {
      type = 'image/jpeg';
      for (let offset = 2; offset < image.length - 9;) {
        if (image[offset] !== 0xff) { offset++; continue; }
        const marker = image[offset + 1];
        if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
          height = image.readUInt16BE(offset + 5); width = image.readUInt16BE(offset + 7); break;
        }
        offset += 2 + image.readUInt16BE(offset + 2);
      }
    }
    assert.ok(width && height, 'Unsupported or invalid icon');
    assert.equal(icon.type, type);
    assert.equal(icon.sizes, `${width}x${height}`);
  }
});

test('the custom not found page works without scripts and is excluded from indexing', () => {
  const html = fs.readFileSync(path.join(root, '404.html'), 'utf8');
  assert.ok(html.includes('content="noindex, follow"'));
  assert.ok(!html.includes('<script'));
  for (const link of ['/', '/archives/', '/tags/']) assert.ok(html.includes(`href="${link}"`));
});
