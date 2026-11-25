import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import test from 'node:test';
import matter from 'gray-matter';
import {createMarkdownProcessor} from '@astrojs/markdown-remark';
import {fromHtml} from 'hast-util-from-html';
import config from '../astro.config.mjs';
import legacy from '../config/legacy-headings.json' with {type:'json'};
import routes from '../config/legacy-routes.json' with {type:'json'};
import rehypeLegacyHeadings from './legacy-headings/rehype-legacy-headings.mjs';
import {readPostDates} from './post-frontmatter.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const sourceURL=file=>pathToFileURL(path.join(root,'source/_posts',file));
const stagedURL=file=>pathToFileURL(path.join(root,'astro/.generated/posts',file));
const walk=(node,fn,parent)=>{fn(node,parent);for(const child of node.children??[])walk(child,fn,node);};
const text=node=>node.type==='text'?node.value:(node.children??[]).map(text).join('');
const elements=html=>{const all=[];walk(fromHtml(html,{fragment:true}),(node,parent)=>{if(node.type==='element')all.push({node,parent});});return all;};
const aliasPattern=/<span id="[^"]*" aria-hidden="true" data-legacy-heading-alias="[^"]*"><\/span>/g;
const isLegacyHeadingsPlugin=plugin=>(Array.isArray(plugin)?plugin[0]:plugin)===rehypeLegacyHeadings;
const otherRehypePlugins=(config.markdown.rehypePlugins??[]).filter(plugin=>!isLegacyHeadingsPlugin(plugin));
const baselineMarkdown={...config.markdown,rehypePlugins:otherRehypePlugins};
const withLegacy={...baselineMarkdown,rehypePlugins:[...otherRehypePlugins,rehypeLegacyHeadings]};
assert.equal(baselineMarkdown.rehypePlugins.filter(isLegacyHeadingsPlugin).length,0,'baseline explicitly excludes legacy heading plugin');
assert.equal(withLegacy.rehypePlugins.filter(isLegacyHeadingsPlugin).length,1,'compatible renderer uses legacy heading plugin exactly once');
const plain=await createMarkdownProcessor(baselineMarkdown);
const compatible=await createMarkdownProcessor(withLegacy);
const require=createRequire(import.meta.url);
const {transform}=require('@astrojs/compiler');
const ts=require('typescript');
const {experimental_AstroContainer}=await import(pathToFileURL(require.resolve('astro/container')).href);
const runtime=pathToFileURL(require.resolve('astro/compiler-runtime')).href;
const moduleURL=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
async function compile(source,filename,imports={}){
 const output=await transform(source,{filename,internalURL:runtime,renderScript:true,resolvePath:specifier=>imports[specifier]??specifier});
 assert.deepEqual(output.diagnostics.filter(d=>d.severity===1),[],filename+' compile errors');
 let code=output.code.replaceAll('import.meta.env.DEV','false');
 for(const [specifier,url] of Object.entries(imports))code=code.replaceAll(JSON.stringify(specifier),JSON.stringify(url)).replaceAll("'"+specifier+"'",JSON.stringify(url));
 return moduleURL(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
}
// Actual Article template/TOC and Markdown HTML. Only unrelated comments and
// reader controls use inert fixtures; nothing fetches media or mounts Giscus.
const content=moduleURL('export async function render(post){return {Content:post.fixtureContent,headings:post.fixtureHeadings};}');
const site=moduleURL('export const href=v=>"/"+v.split("/").map(encodeURIComponent).join("/");export const tagSlug=v=>v.toLowerCase();');
const fixture=await compile('<span data-shell-fixture></span>','ShellFixture.astro');
const articleURL=await compile(fs.readFileSync(new URL('../src/components/Article.astro',import.meta.url),'utf8'),'Article.astro',{'astro:content':content,'../lib/site':site,'./Comments.astro':fixture,'./game/ReaderControls.astro':fixture});
const {default:Article}=await import(articleURL);
const list=value=>Array.isArray(value)?value.flat(Infinity).map(String):value==null?[]:[String(value)];

function assertCoverage(entry,baseline,result){
 assert.deepEqual(result.metadata.headings,baseline.metadata.headings,'new TOC metadata must not change');
 assert.equal(result.code.replace(aliasPattern,''),baseline.code,'only empty alias spans may be added');
 const all=elements(result.code),ids=all.filter(({node})=>node.properties.id!==undefined);
 assert.equal(new Set(ids.map(({node})=>node.properties.id)).size,ids.length,'all body IDs unique');
 let aliases=0;
 for(let index=0;index<entry.headings.length;index++){
  const old=entry.headings[index],now=result.metadata.headings[index];
  assert.deepEqual({depth:now.depth,text:now.text},{depth:old.depth,text:old.text});
  const target=ids.find(({node})=>node.properties.id===old.id);assert.ok(target,'missing old #'+old.id);
  if(old.id===now.slug)assert.equal(target.node.tagName,'h'+old.depth);
  else{
   aliases++;
   assert.equal(target.node.tagName,'span');assert.equal(target.node.properties.ariaHidden,'true');
   assert.equal(target.node.properties.dataLegacyHeadingAlias,now.slug);
   assert.equal(target.parent.properties.id,now.slug,'alias must be inside the corresponding heading');
   assert.equal(target.node.children.length,0);
  }
 }
 return aliases;
}

test('renderer and Markdown package match the committed lockfile',()=>{
 const lock=JSON.parse(fs.readFileSync(new URL('../../package-lock.json',import.meta.url),'utf8'));
 for(const name of ['astro','@astrojs/markdown-remark']){
  const installed=JSON.parse(fs.readFileSync(name==='astro'?require.resolve('astro/package.json'):path.resolve(path.dirname(require.resolve(name)),'../package.json'),'utf8'));
  assert.equal(installed.version,lock.packages['node_modules/'+name].version);
 }
 assert.equal(lock.packages['node_modules/astro'].version,'5.18.2');
 assert.equal(legacy.source.renderer,'astro@5.16.0');
});

test('all 15 real Markdown bodies retain 52 old fragments and the real Article TOC uses new IDs',async t=>{
 assert.deepEqual(legacy.articles.map(a=>a.route),routes.filter(route=>/^20\d\d\//.test(route)));
 let headings=0,aliases=0;
 for(const entry of legacy.articles)await t.test(entry.file,async()=>{
  const parsed=matter(fs.readFileSync(sourceURL(entry.file),'utf8'));
  const dates=readPostDates(parsed,entry.file);
  const frontmatter={...parsed.data,...dates,route:entry.route};
  // Source and actual staging paths must both select the same manifest entry.
  const baseline=await plain.render(parsed.content,{fileURL:sourceURL(entry.file),frontmatter});
  const result=await compatible.render(parsed.content,{fileURL:stagedURL(entry.file),frontmatter});
  aliases+=assertCoverage(entry,baseline,result);headings+=entry.headings.length;
  const sourceResult=await compatible.render(parsed.content,{fileURL:sourceURL(entry.file),frontmatter});
  assert.equal(sourceResult.code,result.code);
  const {default:Content}=await import(await compile('<Fragment set:html={'+JSON.stringify(result.code)+'}/>','Body.astro'));
  const container=await experimental_AstroContainer.create();
  const html=await container.renderToString(Article,{props:{post:{data:{...frontmatter,title:String(parsed.data.title),tags:list(parsed.data.tags),categories:list(parsed.data.categories)},fixtureContent:Content,fixtureHeadings:result.metadata.headings}}});
  const rendered=elements(html),outline=rendered.find(({node})=>node.properties?.dataJournalOutline!==undefined)?.node;
  assert.ok(outline,'real Article outline rendered');
  const links=[];walk(outline,node=>{if(node.tagName==='a')links.push(node);});
  const expected=result.metadata.headings.filter(h=>h.depth>=2&&h.depth<=4);
  assert.deepEqual(links.map(n=>decodeURIComponent(n.properties.href.slice(1))),expected.map(h=>h.slug));
  assert.deepEqual(links.map(text),expected.map(h=>h.text));
  const ids=rendered.flatMap(({node})=>node.properties.id===undefined?[]:[node.properties.id]);
  assert.equal(new Set(ids).size,ids.length,'Article/header must not duplicate a body ID');
 });
 assert.equal(headings,52);assert.equal(aliases,31);assert.equal(headings-aliases,21);
 t.diagnostic('15/15 real articles; 52/52 legacy fragments; 31 aliases + 21 unchanged IDs; 52/52 new TOC links; 0 duplicate IDs');
});

const fixtureManifest=(headings=[{depth:3,text:'Same',id:'Legacy-Same'},{depth:3,text:'Same',id:'Legacy-Same-1'}])=>({version:1,articles:[{file:'legacy-fixture.md',route:'2099/01/01/legacy-fixture/',headings}]});
async function fixtureRenderer(manifest=fixtureManifest(),before=[],after=[]){
 return createMarkdownProcessor({syntaxHighlight:false,rehypePlugins:[...before,[rehypeLegacyHeadings,{manifest}],...after]});
}
const fixtureOptions={fileURL:stagedURL('legacy-fixture.md'),frontmatter:{route:'2099/01/01/legacy-fixture/'}};

test('repeated heading text preserves Astro disambiguation and legacy occurrence order',async()=>{
 const result=await (await fixtureRenderer()).render('### Same\n\n### Same',fixtureOptions);
 assert.deepEqual(result.metadata.headings.map(h=>h.slug),['same','same-1']);
 assertCoverage(fixtureManifest().articles[0],await (await createMarkdownProcessor({syntaxHighlight:false})).render('### Same\n\n### Same'),result);
});

test('same ID requires no alias, including inline formatting and HTML entities',async()=>{
 const manifest=fixtureManifest([{depth:3,text:'Hello code & link',id:'hello-code--link'}]);
 const markdown='### **Hello** `code` & [link](#target)';
 const baseline=await (await createMarkdownProcessor({syntaxHighlight:false})).render(markdown);
 assert.equal(baseline.metadata.headings[0].slug,'hello-code--link');
 const result=await (await fixtureRenderer(manifest)).render(markdown,fixtureOptions);
 assert.equal(result.code,baseline.code);assert.deepEqual(result.metadata.headings,baseline.metadata.headings);
});

test('unrelated pages, external files, unknown articles and missing identity stay untouched',async()=>{
 const entry=legacy.articles[5],markdown='### 题目八:ez_tea';
 const baseline=await plain.render(markdown);
 for(const options of [
  {},
  {frontmatter:{route:'2099/01/01/unknown/'}},
  {fileURL:new URL('../.generated/pages/'+encodeURIComponent(entry.file),import.meta.url),frontmatter:{route:entry.route}},
  {fileURL:pathToFileURL(path.join(root,'unrelated/source/_posts',entry.file)),frontmatter:{route:entry.route}},
  {fileURL:sourceURL('unknown.md')}
 ])assert.equal((await compatible.render(markdown,options)).code,baseline.code);
});

test('an explicit frozen route works without a file URL',async()=>{
 const result=await (await fixtureRenderer()).render('### Same\n\n### Same',{frontmatter:fixtureOptions.frontmatter});
 assert.match(result.code,/id="Legacy-Same"/);assert.match(result.code,/id="Legacy-Same-1"/);
});

test('contradicting route on a known article fails rather than using its basename',async t=>{
 t.mock.method(console,'error',()=>{}); // Astro logs expected rejection paths.
 await assert.rejects((await fixtureRenderer()).render('### Same\n\n### Same',{...fixtureOptions,frontmatter:{route:'2099/01/02/other/'}}),/File\/route disagreement/);
});

test('missing, added, changed or re-leveled headings fail without speculative mappings',async t=>{
 t.mock.method(console,'error',()=>{});
 const processor=await fixtureRenderer();
 for(const markdown of ['### Same','### Same\n\n### Same\n\n### Extra','### Renamed\n\n### Same','## Same\n\n### Same']){
  await assert.rejects(processor.render(markdown,fixtureOptions),/Heading (count|1) changed/);
 }
});

test('raw HTML cannot steal a legacy fragment',async t=>{
 t.mock.method(console,'error',()=>{});
 await assert.rejects((await fixtureRenderer()).render('### Same\n\n<div id="Legacy-Same"></div>\n\n### Same',fixtureOptions),/Legacy id.*collides/);
});

test('existing duplicate raw HTML or heading IDs are rejected',async t=>{
 t.mock.method(console,'error',()=>{});
 await assert.rejects((await fixtureRenderer()).render('### Same\n\n### Same\n\n<i id="duplicate"></i><i id="duplicate"></i>',fixtureOptions),/Duplicate current HTML id/);
 const duplicateIds=()=>tree=>walk(tree,node=>{if(node.tagName==='h3')node.properties.id='duplicate';});
 await assert.rejects((await fixtureRenderer(fixtureManifest(),[duplicateIds])).render('### Same\n\n### Same',fixtureOptions),/Duplicate current HTML id/);
});

test('a legacy ID matching another new heading is a collision, not a valid alias',async t=>{
 t.mock.method(console,'error',()=>{});
 const manifest=fixtureManifest([{depth:3,text:'Same',id:'other'},{depth:3,text:'Other',id:'old-other'}]);
 await assert.rejects((await fixtureRenderer(manifest)).render('### Same\n\n### Other',fixtureOptions),/Legacy id.*collides/);
});

test('running the transformer twice is idempotent',async()=>{
 const again=()=>rehypeLegacyHeadings({manifest:fixtureManifest()});
 const once=await (await fixtureRenderer()).render('### Same\n\n### Same',fixtureOptions);
 const twice=await (await fixtureRenderer(fixtureManifest(),[],[again])).render('### Same\n\n### Same',fixtureOptions);
 assert.equal(twice.code,once.code);assert.deepEqual(twice.metadata,once.metadata);
});

test('invalid or ambiguous frozen manifests are rejected',()=>{
 for(const change of [m=>{m.version=2;},m=>{m.articles.push(structuredClone(m.articles[0]));},m=>{m.articles[0].file='../other.md';},m=>{m.articles[0].headings[1].id='Legacy-Same';},m=>{m.articles[0].headings[0].id='bad id';}]){
  const manifest=fixtureManifest();change(manifest);assert.throws(()=>rehypeLegacyHeadings({manifest}),/\[legacy-headings\]/);
 }
});
