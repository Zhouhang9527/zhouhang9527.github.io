import test from 'node:test';
import assert from 'node:assert/strict';
import mainline from '../config/vn-mainline.json' with {type:'json'};
import {empty,parse,visit,savePosition,isPath,LIMIT,unlockMain,startAfterstory,readingUnlocks,readingStage,startReadingRun,captureReadingStory,restoreReadingStory,parseSaveRecord,parseSaveSlots,validSlot,SAVE_LIMIT,KEY,SAVE_KEY} from '../src/domain/reading-state.ts';
const path='/2026/11/24/article/';
const position={ratio:.4,heading:null,section:.4};
const record={path,title:'Example',at:1,position};
test('migrate completed-only records without replacing progress or save keys',()=>{
 const old={version:1,last:path,completed:[path,path,'https://evil.invalid/']};
 assert.deepEqual(parse(JSON.stringify(old)),{...empty(),last:path,completed:[path]});
 assert.deepEqual(parse('{broken'),empty());
 assert.equal(KEY,'ginka.vn.progress.v1');assert.equal(SAVE_KEY,'ginka.vn.saves.v1');
 assert.deepEqual(Object.keys(empty()),['version','completed','last','recent','bookmarks','positions','mainCleared','afterstoryStarted']);
 for(const value of ['/2026/11/24/%2e%2e/','/2026/11/24/a%5cb/','/2026/11/24/%00/','/2026/11/24/a\n/','https://invalid.test/','//invalid.test/2026/11/24/a/'])assert.equal(isPath(value),false,value);
});
test('bounded history and valid section positions',()=>{
 let state=visit(empty(),path,1);
 state=savePosition(state,path,{ratio:.5,heading:'section',section:.25});
 assert.deepEqual(parse(JSON.stringify(state)),state);
 for(let i=0;i<LIMIT;i++)state=visit(state,'/2026/11/24/post-'+i+'/',i+2);
 assert.equal(Object.keys(state.recent).length,LIMIT);assert.equal(state.positions[path],undefined);
});
test('raw storage rejects damaged positions and timestamps; typed position writes copy their input',()=>{
 const state=visit(empty(),path,1);
 assert.deepEqual(parse(JSON.stringify({...state,positions:{[path]:{ratio:2,heading:'x',section:0}}})).positions,{});
 for(const at of [NaN,Infinity,-1])assert.equal(parseSaveRecord({...record,at}),null);
 for(const p of [{...position,ratio:2},{...position,section:NaN},{...position,heading:'x'.repeat(513)}])assert.equal(parseSaveRecord({...record,position:p}),null);
 const p={...position};const next=savePosition(state,path,p);p.ratio=0;assert.equal(next.positions[path].ratio,.4);
});
test('main clear is persistent, afterstory starts only after unlocking',()=>{
 const initial=empty(),required=[path,'/2026/11/24/second/'];
 assert.equal(unlockMain(initial,[]).mainCleared,false);
 assert.equal(unlockMain({...initial,completed:['invalid']},['invalid']).mainCleared,false);
 assert.equal(unlockMain({...initial,completed:[path]},required).mainCleared,false);
 assert.equal(startAfterstory(initial).afterstoryStarted,false);
 const cleared=unlockMain({...initial,completed:required},required);assert.equal(cleared.mainCleared,true);
 const started=startAfterstory(cleared);assert.equal(started.afterstoryStarted,true);
 assert.deepEqual(parse(JSON.stringify(started)),started);
 assert.equal(unlockMain({...started,completed:[]},[...required,'/2026/11/25/new/']).mainCleared,true);
});
test('fixed fifteen v1 paths exclude future articles and duplicate read marks',()=>{
 assert.equal(mainline.version,1);assert.equal(mainline.routes.length,15);
 const required=mainline.routes.map(route=>'/'+route.split('/').map(encodeURIComponent).join('/'));
 const state={...empty(),completed:[...required.slice(0,-1),path,path]};
 assert.equal(unlockMain(state,required).mainCleared,false);
 assert.equal(readingStage(state,required).completed,14);
 const cleared=unlockMain({...state,completed:[...state.completed,required.at(-1)]},required);
 assert.equal(cleared.mainCleared,true);assert.equal(readingStage(cleared,required).total,15);
 assert.equal(readingStage({...cleared,completed:[]},required).stage,'main-cleared');
 assert.equal(readingStage(startAfterstory(cleared),required).stage,'afterstory');
});
test('independent manual slot validation and 15 pages of ten slots',()=>{
 assert.equal(SAVE_LIMIT,150);assert.equal(validSlot(149),true);assert.equal(validSlot(150),false);
 assert.deepEqual(parseSaveRecord(record),record);
 assert.equal(parseSaveRecord({...record,path:'https://evil.invalid/'}),null);
 assert.equal(parseSaveRecord({...record,position:{...position,ratio:2}}),null);
 const parsed=parseSaveSlots(JSON.stringify({version:1,slots:{0:record,149:record,150:record,'01':record,2:{...record,at:-1}}}));
 assert.deepEqual(parsed,{0:record,149:record});assert.deepEqual(parseSaveSlots('broken'),{});
});
test('optional story snapshot is copied, round trips and rejects malformed extensions',()=>{
 const source={...empty(),completed:[path],mainCleared:true,afterstoryStarted:false};
 const story=captureReadingStory(source);source.completed.push('/2026/11/24/later/');assert.deepEqual(story.completed,[path]);
 assert.deepEqual(parseSaveRecord({...record,story}),{...record,story});
 const slots=parseSaveSlots(JSON.stringify({version:1,slots:{0:record,149:{...record,story}}}));
 assert.deepEqual(slots,{0:record,149:{...record,story}});
 for(const broken of [null,{},[],{...story,completed:['invalid']},{...story,mainCleared:1},{...story,mainCleared:false,afterstoryStarted:true}])assert.equal(parseSaveRecord({...record,story:broken}),null);
 // A legacy position-only save is not silently promoted to an empty story.
 assert.equal(Object.hasOwn(parseSaveRecord(record),'story'),false);
});
test('LOAD restores slot-local read marks but preserves global earned unlocks and library state',()=>{
 const state={...visit(empty(),path,123),completed:[path],bookmarks:[path],positions:{[path]:position},mainCleared:true,afterstoryStarted:true};
 const snapshot={completed:[],mainCleared:false,afterstoryStarted:false};
 const restored=restoreReadingStory(state,snapshot);
 assert.deepEqual(restored.completed,[]);assert.deepEqual(readingUnlocks(restored),{mainCleared:true,afterstoryStarted:true});
 assert.equal(restored.recent,state.recent);assert.equal(restored.bookmarks,state.bookmarks);assert.equal(restored.positions,state.positions);
 assert.equal(restoreReadingStory(state),state);
 const unlocked=restoreReadingStory(empty(),{completed:[path],mainCleared:true,afterstoryStarted:false});
 assert.equal(unlocked.mainCleared,true);assert.equal(unlocked.afterstoryStarted,false);
});
test('NEW GAME clears only the current route, never earned unlocks, history or favorites',()=>{
 const state={...visit(empty(),path,123),completed:[path],bookmarks:[path],positions:{[path]:position},mainCleared:true,afterstoryStarted:true};
 const restarted=startReadingRun(state);
 assert.deepEqual(restarted,{...state,completed:[],last:null,positions:{}});
 assert.equal(restarted.recent,state.recent);assert.equal(restarted.bookmarks,state.bookmarks);
 assert.deepEqual(readingUnlocks(restarted),{mainCleared:true,afterstoryStarted:true});
 assert.equal(state.last,path);assert.deepEqual(state.completed,[path]);
});
