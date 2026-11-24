import test from 'node:test';
import assert from 'node:assert/strict';
import {empty,parse,visit,savePosition,isPath,LIMIT,unlockMain,startAfterstory} from '../src/domain/reading-state.ts';
const path='/2026/11/24/article/';
test('migrate completed-only records',()=>{
 const old={version:1,last:path,completed:[path,path,'https://evil.invalid/']};
 const next=parse(JSON.stringify(old));
 assert.deepEqual(next,{...empty(),last:path,completed:[path]});
 assert.deepEqual(parse('{broken'),empty());
 assert.equal(isPath('/2026/11/24/%2e%2e/'),false);
});
test('bounded history and valid section positions',()=>{
 let state=visit(empty(),path,1);
 state=savePosition(state,path,{ratio:.5,heading:'section',section:.25});
 assert.deepEqual(parse(JSON.stringify(state)),state);
 for(let i=0;i<LIMIT;i++)state=visit(state,'/2026/11/24/post-'+i+'/',i+2);
 assert.equal(Object.keys(state.recent).length,LIMIT);
 assert.equal(state.positions[path],undefined);
});
test('reject damaged position data',()=>{
 const state=visit(empty(),path,1);
 assert.deepEqual(parse(JSON.stringify({...state,positions:{[path]:{ratio:2,heading:'x',section:0}}})).positions,{});
});

test('main clear is persistent, afterstory starts only after unlocking',()=>{
 const initial=empty(),required=[path,'/2026/11/24/second/'];
 assert.equal(unlockMain(initial,[]).mainCleared,false);
 assert.equal(unlockMain({...initial,completed:[path]},required).mainCleared,false);
 assert.equal(startAfterstory(initial).afterstoryStarted,false);
 const cleared=unlockMain({...initial,completed:required},required);
 assert.equal(cleared.mainCleared,true);
 const started=startAfterstory(cleared);assert.equal(started.afterstoryStarted,true);
 assert.deepEqual(parse(JSON.stringify(started)),started);
 assert.equal(unlockMain({...started,completed:[]},[...required,'/2026/11/25/new/']).mainCleared,true);
});
