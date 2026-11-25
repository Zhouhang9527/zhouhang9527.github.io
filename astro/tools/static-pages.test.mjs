import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import test from 'node:test';
import config from '../config/site.json' with {type:'json'};

// Render real templates in memory. Markdown and scene URLs are fixtures, not game media.
// No prepare/build, filesystem writes or network requests occur.
const require=createRequire(import.meta.url);
const {transform}=require('@astrojs/compiler');
const ts=require('typescript');
const {experimental_AstroContainer}=await import(pathToFileURL(require.resolve('astro/container')).href);
const runtime=pathToFileURL(require.resolve('astro/compiler-runtime')).href;
const moduleURL=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
const site=moduleURL(`export const config=${JSON.stringify(config)};export const scene=()=>({day:'/fixture-day.webp',night:'/fixture-night.webp'});`);
async function compile(source,filename,imports={}){
 const compiled=await transform(source,{filename,internalURL:runtime,renderScript:true,resolvePath:specifier=>imports[specifier]||specifier});
 assert.deepEqual(compiled.diagnostics.filter(d=>d.severity===1),[],filename+' compile errors');
 let code=compiled.code.replaceAll('import.meta.env.DEV','false');
 for(const [specifier,url] of Object.entries(imports)){
  code=code.replaceAll(JSON.stringify(specifier),JSON.stringify(url)).replaceAll("'"+specifier+"'",JSON.stringify(url));
 }
 return moduleURL(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
}
const read=relative=>fs.readFileSync(new URL(relative,import.meta.url),'utf8');
const body=await compile('<p data-static-body>Static Markdown fixture</p>','StaticBody.astro');
const content=moduleURL(`import Content from ${JSON.stringify(body)};export async function getEntry(collection,id){if(collection!=='pages')throw Error('Unexpected collection');return {id};}export async function render(){return {Content};}`);
const comments=await compile(read('../src/components/Comments.astro'),'Comments.astro',{'../lib/site':site});
const staticSource=read('../src/components/StaticPage.astro');
const staticPage=await compile(staticSource,'StaticPage.astro',{'astro:content':content,'../lib/site':site,'./Comments.astro':comments});
const {default:StaticPage}=await import(staticPage);
async function renderPage(kind){
 const container=await experimental_AstroContainer.create();
 return container.renderToString(StaticPage,{props:{kind,title:kind},request:new Request(config.url+'/'+kind+'/')});
}
const count=(html,pattern)=>(html.match(pattern)||[]).length;

test('legacy about reuses the shared pathname discussion identity',()=>{
 assert.equal(config.giscus.repo,'Zhouhang9527/blog-comments');
 assert.equal(config.giscus.repoId,'R_kgDORD1-mg');
 assert.equal(config.giscus.categoryId,'DIC_kwDORD1-ms4C1lSK');
 assert.equal(config.giscus.mapping,'pathname');
 assert.match(staticSource,/import Comments from ['"]\.\/Comments\.astro['"]/);
 assert.equal(count(staticSource,/<Comments\s*\/>/g),1);
 assert.doesNotMatch(staticSource,/giscus-container|<iframe\b|giscus\.app\/client\.js/);
});

test('about renders one configured Giscus container after its content',async()=>{
 const html=await renderPage('about');
 assert.equal(count(html,/class="giscus-container"/g),1);
 assert.equal(count(html,/id="journal-comments"/g),1);
 assert.equal(count(html,/\sdata-vn-backlog(?:\s|=|>)/g),1);
 const container=html.match(/<div\b[^>]*class="giscus-container"[^>]*>/)?.[0];assert.ok(container);
 for(const [attribute,key] of Object.entries({'repo':'repo','repo-id':'repoId','category':'category','category-id':'categoryId','mapping':'mapping','strict':'strict','reactions-enabled':'reactions','emit-metadata':'metadata','lang':'lang','input-position':'inputPosition'})){
  assert.ok(container.includes(`data-${attribute}="${config.giscus[key]}"`),'Giscus '+attribute);
 }
 assert.ok(html.indexOf('id="journal-comments"')>html.indexOf('</article>'));
 assert.match(html,/data-static-body/);
 assert.ok(html.includes('https://github.com/'+config.giscus.repo+'/discussions'));
 assert.doesNotMatch(html,/<iframe\b|data-term=|giscus\.app\/client\.js|__ginka_local_/);
});

test('links renders content without comments or a fake backlog',async()=>{
 const html=await renderPage('links');assert.match(html,/data-static-body/);
 assert.doesNotMatch(html,/giscus-container|journal-comments|data-vn-backlog|<iframe\b/);
});

test('INFORMATION remains separate from the legacy about discussion',()=>{
 const information=read('../src/pages/information.astro');assert.match(information,/href="\/about\/"/);
 assert.doesNotMatch(information,/<Comments\b|giscus-container|<iframe\b|data-vn-backlog/);
});
