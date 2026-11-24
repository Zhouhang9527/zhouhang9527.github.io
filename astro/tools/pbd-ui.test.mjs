import test from 'node:test';
import assert from 'node:assert/strict';
import {decodePbd,normalizePbd} from './pbd-ui.mjs';
const str=value=>({$type:'string',value}),int=value=>({$type:'integer',value});
const dict=obj=>({$type:'dictionary',entries:Object.entries(obj).map(([key,value])=>({key,value}))});
test('typed PBD nodes, null, and prototype-safe keys',()=>{
 const result=decodePbd({$type:'dictionary',entries:[{key:'__proto__',value:str('inert')},{key:'values',value:{$type:'array',items:[int(0),{$type:'void'},str('x')]}}]});
 assert.equal(Object.getPrototypeOf(result),null);assert.equal(result.__proto__,'inert');assert.deepEqual(result.values,[0,null,'x']);
 assert.throws(()=>decodePbd({$type:'bogus'}));assert.throws(()=>decodePbd(dict({a:{$type:'integer',value:'bad'}})));
});
test('normalize logical rect, rotated crop and opaque script data',()=>{
 const state=dict({cx:int(18),cy:int(136),cw:int(16),ch:int(107),cr:int(1),ox:int(11),oy:int(11),w:int(166),h:int(38),storage:str('atlas')});
 const start=dict({class:str('button'),x:int(62),y:int(328),width:int(166),height:int(38),exp:str('throw new Error("never execute")'),uistates:dict({off:state})});
 const raw={schema:'krkr-xp3-brute/pbd-v1',root:dict({result:dict({start})})};
 const m=normalizePbd(raw,'fixture');assert.deepEqual(m.controls.start.bounds,[62,328,166,38]);assert.deepEqual(m.controls.start.states.off.crop,[18,136,16,107]);assert.equal(m.controls.start.states.off.rotation,90);assert.equal(m.controls.start.states.off.opacity,null);assert.match(m.controls.start.actions.exp,/never execute/);
 assert.throws(()=>normalizePbd({...raw,schema:'unknown'},'fixture'));
});
