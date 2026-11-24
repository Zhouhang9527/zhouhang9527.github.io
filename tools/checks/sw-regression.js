'use strict';
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const listeners = {};
const store = new Map();
let network = true, fetches = 0;
const key = request => typeof request==='string'?request:request.url;
const caches = {
  async open(name) {
    if (!store.has(name)) store.set(name,new Map());
    const map=store.get(name);
    return {match:async r=>map.get(key(r))?.clone(),put:async(r,v)=>map.set(key(r),v.clone()),keys:async()=>[...map.keys()],delete:async r=>map.delete(key(r))};
  },
  keys:async()=>[...store.keys()],delete:async n=>store.delete(n)
};
const self = {location:{origin:'https://example.test'},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(n,f)=>listeners[n]=f};
vm.runInNewContext(fs.readFileSync('source/sw.js','utf8'),{self,caches,URL,Response,Promise,fetch:async()=>{++fetches;if(!network)throw Error('offline');return new Response('network-'+fetches);}});
const event = async(name,extra={})=>{
 let promise;
 listeners[name]({...extra,waitUntil:p=>promise=p,respondWith:p=>promise=p});
 return promise;
};
const request=(path,destination,mode='cors')=>({url:'https://example.test'+path,method:'GET',destination,mode,headers:new Headers()});
(async()=>{
 await caches.open('unrelated-app');await caches.open('ginka-runtime-ginka-blog-3.0.0');
 await event('install');await event('activate');
 assert.ok(store.has('unrelated-app'));assert.ok(!store.has('ginka-runtime-ginka-blog-3.0.0'));
 const v=request('/css/site.css?v=abcdef1234','style');
 const a=await (await event('fetch',{request:v})).text();
 assert.equal(await (await event('fetch',{request:v})).text(),a);
 const u=request('/css/site.css','style');
 const x=await (await event('fetch',{request:u})).text();
 assert.notEqual(await (await event('fetch',{request:u})).text(),x);
 const article=request('/article/','document','navigate');
 const saved=await (await event('fetch',{request:article})).text();
 network=false;
 assert.equal(await (await event('fetch',{request:article})).text(),saved);
 assert.equal((await event('fetch',{request:request('/uncached/','document','navigate')})).status,503);
 assert.equal(await event('fetch',{request:request('/site-version.json','document')}),undefined);
 await event('message',{data:{type:'CLEAR_CACHE'}});
 assert.ok(store.has('unrelated-app'));
 console.log('PASS SW immutable assets, unversioned revalidation, exact offline route and scoped cleanup');
})().catch(error=>{console.error(error);process.exit(1)});
