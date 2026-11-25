import test from 'node:test';
import assert from 'node:assert/strict';
import {rectStyle,stateStyle} from '../src/lib/vn-control.ts';
test('logical rectangle in a subcanvas',()=>{
 assert.equal(rectStyle([10,20,20,10],[0,10,100,50]),'--vn-x:10%;--vn-y:20%;--vn-w:20%;--vn-h:20%');
 assert.throws(()=>rectStyle([0,0,1,1],[0,0,0,1]));
});
test('registered local states are opt-in, and public fallback has no URL',()=>{
 assert.equal(stateStyle(false,()=>{throw Error('must not resolve');}),'');
 assert.equal(stateStyle(true,s=>s==='normal'?'sprite-normal':null),'--vn-normal:url(/__ginka_local_ui__/sprite-normal.png)');
 assert.throws(()=>stateStyle(true,()=>'/outside'));
});
