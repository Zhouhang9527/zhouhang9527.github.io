import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {assertPublicStagingApproved} from './public-asset-policy.mjs';

// These are nonexistent names. The policy tests never read or create game media.
test('non-scene tracked paths do not claim or require a scene exception',()=>{
 assert.doesNotThrow(()=>assertPublicStagingApproved([]));
 assert.doesNotThrow(()=>assertPublicStagingApproved(['source/images/ginka/header-logo.png','source/_posts/article.md']));
});

test('pending scene paths fail closed including case and separator variants',()=>{
 for(const file of ['source/images/ginka/scenes/__fake.webp','SOURCE/IMAGES/GINKA/SCENES/__fake.png','source\\images\\ginka\\scenes\\__fake.webp']){
  assert.throws(()=>assertPublicStagingApproved([file]),/Public asset staging blocked: 1 tracked path/);
 }
});

test('blocked diagnostics count paths without dumping a large inventory',()=>{
 const fake=Array.from({length:48},(_,i)=>`source/images/ginka/scenes/__fake-${i}.webp`);
 assert.throws(()=>assertPublicStagingApproved(fake),error=>{
  assert.match(error.message,/48 tracked path/);assert.match(error.message,/and 43 more/);
  assert.match(error.message,/No staging writes were made/);assert.doesNotMatch(error.message,/__fake-47/);
  return true;
 });
});

test('actual prepare preflight runs before any staging deletion or creation',()=>{
 const source=fs.readFileSync(new URL('./prepare.mjs',import.meta.url),'utf8');
 const start=source.indexOf('const root=');
 const end=source.indexOf('function copy(',start);
 assert.ok(start>=0&&end>start,'expected bounded prepare staging setup');
 const writes=[];
 const context={
  path,project:path.resolve('/fixture/astro'),
  fs:{rmSync:(...args)=>writes.push(['rm',...args]),mkdirSync:(...args)=>writes.push(['mkdir',...args])},
  execFileSync:()=>['source/images/ginka/header-logo.png','source/images/ginka/scenes/__fake.webp'].join('\0'),
  assertPublicStagingApproved
 };
 assert.throws(()=>vm.runInNewContext(source.slice(start,end),context),/Public asset staging blocked/);
 assert.deepEqual(writes,[],'rejecting a pending path must not clear or write existing staging output');
});
