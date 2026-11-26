import test from 'node:test';
import assert from 'node:assert/strict';
import {readerActions,isReaderAction,resolveOriginalAction,parseSceneAction,resolveSceneNumber,sampleSceneEasing,SceneActionScheduler} from '../src/domain/vn-actions.ts';

test('exact SystemAction whitelist; never executes arbitrary expressions',()=>{
 for(const [key,expression] of Object.entries(readerActions)){assert.equal(isReaderAction(key),true);assert.equal(resolveOriginalAction(expression),key);}
 for(const expression of ['SystemAction.save();alert(1)','SystemAction.save(1)','global.SystemAction.save()','constructor','__proto__',null])assert.equal(resolveOriginalAction(expression),null);
 assert.equal(isReaderAction('constructor'),false);assert.equal(isReaderAction('unknown'),false);
});

// Synthetic, asset-free arithmetic fixtures. They exercise source-backed
// algorithms, not private scene records, original artwork, voices or pixels.
const initial=()=>({objects:{actor:{properties:{xpos:20,ypos:0,zoomx:100,opacity:255,visvalue:100}}},camera:{properties:{camerax:0,camerazoom:100}}});
const scheduler=(options)=>new SceneActionScheduler(initial(),options);
const move=(value,time=100,extra={})=>({handler:'MoveAction',value,time,...extra});
const env=(action,extra=[])=>['envupdate','update',[{name:'actor',action}],...extra];
const wait=(list,extra={})=>['envwait','list',list,...Object.entries(extra).flat()];
const actionWait=(extra={})=>wait([{name:'actor',mode:0}],extra);
const x=q=>q.frame().objects.actor.properties.xpos;
const dispatch=(q,raw)=>{const result=q.dispatch(raw);assert.equal(result.ok,true,JSON.stringify(result.diagnostics));return result;};
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-10,`${actual} != ${expected}`);

test('bounded relative arithmetic accepts absolute values but never evaluates expressions',()=>{
 for(const [value,expected] of [[3,3],['-2.5',-2.5],['.5',.5],['@',8],['@+2',10],['@-3',5],['@*2',16],['@/4',2]])assert.equal(resolveSceneNumber(value,8),expected);
 for(const value of ['@/0','@+Infinity','@+1+2','Math.random()','1e2','0x20',' ','#&this.x','@+(() => 1)()',true,null,{},Infinity,NaN])assert.equal(resolveSceneNumber(value,8),null);
 assert.equal(resolveSceneNumber('@+1'),null);
 assert.equal(resolveSceneNumber('@*2',Number.MAX_VALUE),null);
});

test('source polynomial/cosine easing, never CSS approximations',()=>{
 for(const [easing,value] of [['const',.25],['accel',.0625],['decel',.4375],['acdec',.15625],['accos',(1-Math.cos(Math.PI/4))/2],[2,.015625],[-2,.578125]]){
  near(sampleSceneEasing(easing,.25),value);assert.equal(sampleSceneEasing(easing,-1),0);assert.equal(sampleSceneEasing(easing,2),1);
 }
});

test('envupdate parses finite numeric projection and normalized parameters',()=>{
 const result=parseSceneAction(env([['xpos','8'],['ypos',[move('@+10','100',{delay:null,speed:'2',starttime:'5',accel:'ACDEC',nowait:'1',nofast:0})],0]]));
 assert.equal(result.ok,true);
 assert.deepEqual(result.action.updates[0].actions,[{property:'xpos',value:8},{property:'ypos',value:[{handler:'MoveAction',value:'@+10',time:100,delay:0,speed:2,starttime:5,accel:'acdec',nowait:true,nofast:false}]}]);
 assert.equal(parseSceneAction(['envupdate','update',[],'wait',{list:[]}]).ok,true);
});

test('bytecode-verified array tuple 0/1 has identical action behavior, unlike scalar timing',()=>{
 const frames=[];
 for(const mode of [undefined,0,1]){
  const q=scheduler(),tuple=['xpos',[move('@+20',100)]];if(mode!==undefined)tuple.push(mode);
  dispatch(q,env([tuple]));q.advance(25);frames.push(q.frame());
 }
 assert.deepEqual(frames[0],frames[1]);assert.deepEqual(frames[1],frames[2]);
 assert.equal(parseSceneAction(env([['xpos',10,1]])).ok,false);
});

test('property tracks run in parallel while each property sequence is serial',()=>{
 const q=scheduler();
 dispatch(q,env([['xpos',[move(60,100),move(100,100)]],['ypos',[move(80,200)]]]));
 q.advance(50);assert.equal(x(q),40);assert.equal(q.frame().objects.actor.properties.ypos,20);
 q.advance(100);assert.equal(x(q),80);assert.equal(q.frame().objects.actor.properties.ypos,60);
 q.advance(50);assert.equal(x(q),100);assert.equal(q.frame().objects.actor.properties.ypos,80);assert.equal(q.frame().active,false);
});

test('relative targets capture dispatch baseline, omitted starts capture preceding endpoint',()=>{
 const q=scheduler();dispatch(q,env([['xpos',[move('@+20'),move('@*3')]]]));
 q.advance(100);assert.equal(x(q),40);
 q.advance(50);assert.equal(x(q),50);
 q.advance(50);assert.equal(x(q),60); // Not 120: @ belongs to construction-time value 20.
});

test('same property tuples in one update append, a numeric set replaces that sequence',()=>{
 const q=scheduler();dispatch(q,env([['xpos',0],['xpos',[move(10)]],['xpos',[move(30)]]]));
 q.advance(150);assert.equal(x(q),20);
 dispatch(q,env([['xpos',[move(99)]],['xpos',7]]));q.advance(1000);assert.equal(x(q),7);assert.equal(q.frame().active,false);
});

test('explicit starts apply after delay; scalar pretrans precedes update',()=>{
 const q=scheduler();dispatch(q,['envupdate','update',[{name:'actor',action:[['xpos',[move(100,100,{start:0,delay:10})]]]}],
  'pretrans',[{name:'actor',action:[['xpos',40]]}]]);
 assert.equal(x(q),40);q.advance(9);assert.equal(x(q),40);q.advance(1);assert.equal(x(q),0);
 q.advance(50);assert.equal(x(q),50);q.advance(50);assert.equal(x(q),100);
});

test('speed/starttime use (elapsed + starttime) * speed, not elapsed*speed + starttime',()=>{
 const q=scheduler();dispatch(q,env([['xpos',[move(100,200,{start:0,speed:2,starttime:25})]]]));
 assert.equal(x(q),25);q.advance(25);assert.equal(x(q),50);q.advance(50);assert.equal(x(q),100);assert.equal(q.frame().active,false);
 const already=scheduler();dispatch(already,env([['xpos',[move(80,10,{starttime:100})]]]));assert.equal(x(already),80);assert.equal(already.frame().active,false);
});

test('zero-duration moves and zero-time waits finish without a hidden tick',()=>{
 const q=scheduler();dispatch(q,env([['xpos',[move(90,0)]],['ypos',[{handler:'wait',time:0},move(10,0)]]],['wait',{list:[{name:'actor',mode:0}]}]));
 assert.equal(x(q),90);assert.equal(q.frame().objects.actor.properties.ypos,10);assert.equal(q.frame().waiting,false);assert.equal(q.frame().active,false);
});

test('property wait segment holds its preceding value and scales its own duration',()=>{
 const q=scheduler();dispatch(q,env([['xpos',[move(40),{handler:'wait',time:100,speed:2},move(80)]]]));
 q.advance(125);assert.equal(x(q),40);q.advance(75);assert.equal(x(q),60);q.advance(50);assert.equal(x(q),80);
});

test('numeric projection replacement settles the old property; explicit host cancel freezes it',()=>{
 const q=scheduler();dispatch(q,env([['xpos',[move(100)]]]));q.advance(25);assert.equal(x(q),40);
 dispatch(q,env([['xpos',[move('@+20')]]]));assert.equal(x(q),100);q.advance(100);assert.equal(x(q),120);
 const frozen=scheduler();dispatch(frozen,env([['xpos',[move(100)]]]));frozen.advance(25);frozen.cancel('actor',false,'xpos');
 assert.equal(x(frozen),40);dispatch(frozen,env([['xpos',[move('@+20')]]]));assert.equal(x(frozen),40);frozen.advance(100);assert.equal(x(frozen),60);
});

test('camera properties share the numeric clock without assuming projection constants',()=>{
 const q=scheduler();dispatch(q,['envupdate','update',[{name:'env',action:[['camerax',[move(10)]],['camerazoom',[move(120)]]]}]]);
 q.advance(50);assert.equal(q.frame().camera.properties.camerax,5);assert.equal(q.frame().camera.properties.camerazoom,110);assert.equal(x(q),20);
});

test('action wait excludes nowait tracks, and post-wait uses exact completion boundary',()=>{
 const setup=()=>{const q=scheduler();dispatch(q,env([['xpos',[move(40)]],['ypos',[move(200,200,{nowait:true})]]],['wait',{list:[{name:'actor',mode:0}],wait:25}]));return q;};
 const coarse=setup(),fine=setup();assert.equal(coarse.frame().waiting,true);
 coarse.advance(150);for(let i=0;i<150;i++)fine.advance(1);
 assert.deepEqual(coarse.frame(),fine.frame());assert.equal(coarse.frame().waiting,false);assert.equal(coarse.frame().active,true);
 assert.equal(coarse.frame().objects.actor.properties.ypos,150);
 coarse.advance(50);assert.equal(coarse.frame().active,false);
});

test('envwait and time waits have independent skip defaults; nofast remains active',()=>{
 const q=scheduler();dispatch(q,['wait','time',100]);assert.equal(q.skipWait(),false);q.advance(100);assert.equal(q.frame().waiting,false);
 dispatch(q,['wait','time',100,'canskip',1]);assert.equal(q.skipWait(),true);assert.equal(q.frame().waiting,false);
 dispatch(q,env([['xpos',[move(100,100,{nofast:true})]],['ypos',[move(100)]]]));dispatch(q,actionWait({wait:50}));
 assert.equal(q.skipWait(),true);assert.equal(q.frame().waiting,true);assert.equal(x(q),20);assert.equal(q.frame().objects.actor.properties.ypos,100);
 q.advance(100);assert.equal(q.frame().waiting,false);assert.equal(q.frame().active,false);
 dispatch(q,wait([],{wait:20,canskip:0}));assert.equal(q.skipWait(),false);q.advance(20);assert.equal(q.frame().waiting,false);
});

test('scoped cancellation leaves other tracks running; lifecycle cancellation drops all waits',()=>{
 const q=scheduler();dispatch(q,env([['xpos',[move(100)]],['ypos',[move(100)]]]));dispatch(q,actionWait());q.advance(25);
 q.cancel('actor',false,'xpos');assert.equal(x(q),40);assert.equal(q.frame().waiting,true);q.advance(75);assert.equal(x(q),40);assert.equal(q.frame().objects.actor.properties.ypos,100);
 dispatch(q,['wait','time',100]);q.cancel();assert.equal(q.frame().waiting,false);assert.equal(q.frame().active,false);assert.equal(q.frame().generation,2);
 q.advance(10000);assert.equal(x(q),40);
 dispatch(q,env([['xpos',[move(60)]]]));q.advance(50);assert.equal(x(q),50); // No stale animation can resume.
});

test('finish cancellation lands on last endpoint and clears an action barrier',()=>{
 const q=scheduler();dispatch(q,env([['xpos',[move(40),move(80)]]]));dispatch(q,actionWait());q.advance(10);q.cancel('actor',true);
 assert.equal(x(q),80);assert.equal(q.frame().active,false);assert.equal(q.frame().waiting,false);
});

test('reduced motion settles numeric motion, not explicit script or post-action time waits',()=>{
 const q=scheduler({reducedMotion:true});dispatch(q,env([['xpos',[move(100,1000,{delay:500,nofast:true})]]],['wait',{list:[{name:'actor',mode:0}],wait:20}]));
 assert.equal(x(q),100);assert.equal(q.frame().waiting,true);q.advance(20);assert.equal(q.frame().active,false);
 dispatch(q,['wait','time',50]);q.setReducedMotion(true);assert.equal(q.frame().waiting,true);q.advance(50);assert.equal(q.frame().active,false);
 q.setReducedMotion(false);dispatch(q,env([['xpos',[move(200)]]]));q.advance(25);assert.equal(x(q),125);
 q.setReducedMotion(true);assert.equal(x(q),200);assert.equal(q.frame().active,false);q.setReducedMotion(false);q.advance(100);assert.equal(x(q),200);
});

test('snapshots, constructor inputs and dispatch inputs cannot mutate active work',()=>{
 const input=initial(),q=new SceneActionScheduler(input),raw=env([['xpos',[move(40)]]]);dispatch(q,raw);
 input.objects.actor.properties.xpos=999;raw[2][0].action[0][1][0].value=999;
 const frame=q.frame();frame.objects.actor.properties.xpos=999;frame.camera.properties.camerax=999;
 q.advance(50);assert.equal(x(q),30);assert.equal(q.frame().camera.properties.camerax,0);
});

test('unsupported handlers, expressions, stop slots, metadata and wait modes fail closed',()=>{
 for(const raw of [
  env([null]),env([1]),env([['constructor',1]]),env([['xpos',[move('#&steal()')]]]),env([['xpos',[move('@+1+2')]]]),
  env([['xpos',[move(1,10,{complete:'evil()'})]]]),env([['xpos',[move(1,10,{accel:'function(t){return t}'})]]]),
  env([['xpos',[{handler:'RandomAction',time:10}]]]),env([['xpos',[[move(1),move(2)]]]]),env([['xpos',1,10]]),
  env([['xpos',[move(1)],2]]),env([['xpos',1,1]]),env([['xpos',[move(1,10,{speed:0})]]]),env([['xpos',[move(1,10,{speed:-1})]]]),env([['xpos',[move(1,-1)]]]),
  env([['xpos',[move(1,10,{delay:Infinity})]]]),env([['xpos',[move(1,10,{nowait:'maybe'})]]]),
  ['envupdate','update',[],'trans',{time:10}],['envupdate','update',[{name:'actor',action:[],redraw:{}}]],
  ['envupdate','update',[['new','actor','bu']]],wait([null]),wait([{name:'actor',mode:1}]),wait([{name:'actor',mode:2}]),
  ['delayrun',10,'envupdate','update',[]],['eval','code','evil()'],['envupdate','update',[],'update',[]],['envupdate','update'],
  ['envupdate','update',[{name:'__proto__',action:[]}]],['wait','time','100;evil()']
 ]){const result=parseSceneAction(raw);assert.equal(result.ok,false,JSON.stringify(raw));assert.ok(result.diagnostics.length>0);assert.equal(result.action,null);}
});

test('unresolved values/objects and overflow reject the entire dispatch without altering tracks',()=>{
 const q=scheduler();dispatch(q,env([['xpos',[move(100)]]]));q.advance(25);const before=q.frame();
 for(const raw of [
  env([['ypos',5],['zoomy',[move(200)]]]),env([['ypos',5],['xpos',[move('@/0')]]]),
  ['envupdate','update',[{name:'missing',action:[['xpos',0]]}]],wait([{name:'missing',mode:0}]),
  env([['xpos',[move(-Number.MAX_VALUE,Number.MAX_VALUE,{start:Number.MAX_VALUE})]]]),
  env([['xpos',[move(1,Number.MAX_VALUE,{speed:Number.MIN_VALUE})]]])
 ]){assert.equal(q.dispatch(raw).ok,false,JSON.stringify(raw));assert.deepEqual(q.frame(),before);}
 q.advance(75);assert.equal(x(q),100);
});

test('empty/oversized/malformed input and unsafe seed state are rejected',()=>{
 for(const raw of [null,'SystemAction.save()',{},[],['envupdate'],['envupdate','update',[{name:'actor',action:new Array(5000).fill(['xpos',1])}]]])assert.equal(parseSceneAction(raw).ok,false);
 for(const state of [null,{objects:{},camera:{properties:{xpos:NaN}}},{objects:{env:{properties:{}}},camera:{properties:{}}},
  {objects:{actor:{properties:{unknown:0}}},camera:{properties:{}}},JSON.parse('{"objects":{"__proto__":{"properties":{}}},"camera":{"properties":{}}}')])assert.throws(()=>new SceneActionScheduler(state));
 const q=scheduler();for(const elapsed of [-1,NaN,Infinity,'1'])assert.throws(()=>q.advance(elapsed));assert.equal(q.frame().time,0);
});
