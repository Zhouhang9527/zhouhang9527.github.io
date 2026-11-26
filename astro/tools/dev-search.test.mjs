import test from 'node:test';
import assert from 'node:assert/strict';
import {indexDevArticles} from './dev-search.mjs';

const article=(title,text)=>`<!doctype html><html lang="en"><head><title>${title}</title></head><body><nav>Navigation</nav><article data-pagefind-body><h1 data-pagefind-meta="title">${title}</h1><p>${text}</p></article></body></html>`;

test('development search indexes actual current rendered articles with the production Pagefind engine',async()=>{
 const rendered=[],routes=['/2026/11/26/current/','/2026/11/26/other/'];
 const files=await indexDevArticles(routes,async url=>{rendered.push(url);return article(url.includes('current')?'Current title':'Other title','Current Android reverse engineering article');});
 assert.deepEqual(rendered,routes);
 assert.ok(files.has('pagefind.js'),'Expected the existing browser module URL');
 assert.ok([...files.keys()].some(path=>/^wasm\..+\.pagefind$/.test(path)),'Expected the real packed Pagefind WebAssembly bundle');
 assert.ok([...files.keys()].filter(path=>path.endsWith('.pf_fragment')).length>=2,'Both documents must be indexed');
 assert.ok([...files.values()].every(bytes=>Buffer.isBuffer(bytes)&&bytes.length>0));
});

test('a failed current render rejects indexing, releases the service and permits a real retry',async()=>{
 await assert.rejects(indexDevArticles(['/missing/'],async()=>{throw Error('Current article returned 404');}),/Current article returned 404/);
 const files=await indexDevArticles(['/retry/'],async()=>article('Retry title','Successfully retried current content'));
 assert.ok(files.has('pagefind.js'));
});
