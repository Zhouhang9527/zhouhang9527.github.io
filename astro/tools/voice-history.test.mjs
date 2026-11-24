import test from 'node:test';
import assert from 'node:assert/strict';
import {appendHistory,parseHistory,HISTORY_LIMIT} from '../src/domain/voice-history.ts';
test('only bounded line IDs and valid playback metadata persist',()=>{
 const first={id:'line-1',at:1,path:'/archives/'};
 const valid=parseHistory(JSON.stringify({version:1,entries:[{...first,text:'not persisted'},{id:'../bad',at:2},{id:'line-2',at:3,path:'//outside'}]}));
 assert.deepEqual(valid,[first,{id:'line-2',at:3,path:null}]);assert.deepEqual(parseHistory('broken'),[]);
 let history=valid;
 for(let i=0;i<110;i++)history=appendHistory(history,{id:'line-1',at:10+i,path:null});
 assert.equal(history.length,HISTORY_LIMIT);assert.equal(history.at(-1).at,119);
});
