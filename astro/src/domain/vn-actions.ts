// Exact original SystemAction calls only. Never evaluate recovered TJS/PBD expressions.
export const readerActions={
 hold:'SystemAction.toggleHold()',save:'SystemAction.save()',load:'SystemAction.load()',
 qsave:'SystemAction.qsave()',qload:'SystemAction.qload()',xprev:'SystemAction.qmprev()',
 next:'SystemAction.qmnext()',auto:'SystemAction.auto()',skip:'SystemAction.skip()',
 log:'SystemAction.log()',option:'SystemAction.option()',hide:'SystemAction.hide()',
 vreplay:'SystemAction.vreplay()',vsave:'SystemAction.vsave()'
} as const;
export type ReaderAction=keyof typeof readerActions;
export function isReaderAction(value:unknown):value is ReaderAction{
 return typeof value==='string'&&Object.hasOwn(readerActions,value);
}
export function resolveOriginalAction(expression:unknown):ReaderAction|null{
 if(typeof expression!=='string')return null;
 for(const key of Object.keys(readerActions)){if(isReaderAction(key)&&readerActions[key]===expression)return key;}
 return null;
}

// Numeric scene actions share this whitelist boundary. No script, image, audio,
// redraw, object-creation, custom handler or callback is executable here. Hosts
// seed only verified objects/initial values and own the single render clock.
export const sceneProperties=[
 'xpos','ypos','zpos','offsetx','offsety','offsetz','originx','originy',
 'centerx','centery','rcenterx','rcentery','zcenterx','zcentery',
 'zoomx','zoomy','rotate','slantx','slanty','flipx','flipy','order','opacity','visvalue',
 'camerax','cameray','cameraz','camerazoom','camerarotate','cameraoffsetx','cameraoffsety',
 'cameraoffsetz','cameraoffsetzmax','cameraox','cameraoy','camerarh',
 'basezoom','scalex','scaley','shiftx','shifty'
] as const;
export type SceneProperty=typeof sceneProperties[number];
export type SceneProperties=Partial<Record<SceneProperty,number>>;
export type SceneActionObject={properties:SceneProperties};
export type SceneActionState={objects:Record<string,SceneActionObject>;camera:SceneActionObject};
export type SceneActionFrame=SceneActionState&{time:number;active:boolean;waiting:boolean;generation:number};
export type SceneActionDiagnostic={path:string;reason:string};
export type SceneNumber=number|string;
export type SceneEasing=number|'const'|'accel'|'decel'|'acdec'|'accos';
export type SceneMove={handler:'MoveAction';value:SceneNumber;start?:SceneNumber;time:number;
 delay:number;speed:number;starttime:number;accel:SceneEasing;nowait:boolean;nofast:boolean};
export type SceneHold={handler:'wait';time:number;speed:number;nofast:boolean};
export type ScenePropertyAction={property:SceneProperty;value:number|(SceneMove|SceneHold)[]};
export type SceneActionWait={kind:'actions';names:string[];extra:number;canSkip:boolean}|{kind:'time';time:number;canSkip:boolean};
export type SceneAction={kind:'update';updates:{name:string;actions:ScenePropertyAction[]}[];wait?:SceneActionWait}|SceneActionWait;
export type SceneActionResult={ok:true;action:SceneAction;diagnostics:[]}|{ok:false;action:null;diagnostics:SceneActionDiagnostic[]};

const own=(o:object,k:PropertyKey)=>Object.hasOwn(o,k);
const record=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&[null,Object.prototype].includes(Object.getPrototypeOf(x));
const nameOK=(x:unknown):x is string=>typeof x==='string'&&x.length>0&&x.length<=128&&!['__proto__','constructor','prototype'].includes(x);
const propertyOK=(x:unknown):x is SceneProperty=>typeof x==='string'&&(sceneProperties as readonly string[]).includes(x);
const decimal=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
function numeric(x:unknown):number|null{
 if(typeof x==='number')return Number.isFinite(x)?x:null;
 return typeof x==='string'&&decimal.test(x)&&Number.isFinite(Number(x))?Number(x):null;
}
// Deliberately smaller than the original expression language. In particular,
// #/& expressions, functions and chained @ arithmetic never reach eval.
export function resolveSceneNumber(value:unknown,initial?:number):number|null{
 const absolute=numeric(value);if(absolute!==null)return absolute;
 if(typeof value!=='string'||initial===undefined||!Number.isFinite(initial))return null;
 if(value==='@')return initial;
 const match=/^@([+\-*/])(\d+(?:\.\d+)?|\.\d+)$/.exec(value);if(!match)return null;
 const n=Number(match[2]);
 const result=match[1]==='+'?initial+n:match[1]==='-'?initial-n:match[1]==='*'?initial*n:initial/n;
 return Number.isFinite(result)?result:null;
}
function easingValue(value:unknown):SceneEasing|null{
 if(value==null||value==='')return 0;
 if(typeof value==='string'&&['const','accel','decel','acdec','accos'].includes(value.toLowerCase()))return value.toLowerCase() as SceneEasing;
 return numeric(value);
}
export function sampleSceneEasing(value:SceneEasing,progress:number):number{
 const t=Math.max(0,Math.min(1,progress));
 if(value==='accel')return t*t;
 if(value==='decel')return t*(2-t);
 if(value==='acdec')return t*t*(3-2*t);
 if(value==='accos')return (1-Math.cos(Math.PI*t))/2;
 if(value==='const'||value===0)return t;
 return value>0?t**(value+1):1-(1-t)**(1-value);
}
const flag=(x:unknown,defaultValue=false):boolean|null=>x==null?defaultValue:x===true||x===1||x==='1'||x==='true'?true:x===false||x===0||x==='0'||x==='false'?false:null;

// Atomic, bounded parsing of the supported numeric projection, not a second
// KAG interpreter. Unsupported fields/targets/modes remain explicit errors.
// Media/transition waits require a verified host adapter and are not guessed.
export function parseSceneAction(raw:unknown):SceneActionResult{
 const diagnostics:SceneActionDiagnostic[]=[];
 const issue=(path:string,reason:string)=>{if(diagnostics.length<32)diagnostics.push({path,reason});};
 let budget=4096;
 const spend=(path:string)=>{if(--budget>=0)return true;if(budget===-1)issue(path,'scene action budget exceeded');return false;};
 const keys=(o:Record<string,unknown>,allowed:readonly string[],path:string)=>{
  for(const key of Object.keys(o))if(!allowed.includes(key))issue(path,'unsupported field');
 };
 const nonnegative=(value:unknown,path:string,fallback?:number)=>{
  const n=value==null&&fallback!==undefined?fallback:numeric(value);
  if(n===null||n<0){issue(path,'expected non-negative finite number');return 0;}return n;
 };
 const bool=(value:unknown,path:string,fallback=false)=>{const b=flag(value,fallback);if(b===null)issue(path,'expected boolean flag');return b??false;};
 const parseWait=(value:unknown,path:string):SceneActionWait=>{
  if(!record(value)){issue(path,'expected action wait');return {kind:'actions',names:[],extra:0,canSkip:false};}
  keys(value,['list','wait','canskip'],path);
  const names:string[]=[];
  if(!Array.isArray(value.list))issue(path+'.list','expected wait target list');
  else for(const [i,target] of value.list.entries()){
   if(!spend(path))break;const p=path+'.list.'+i;
   if(!record(target)){issue(p,'transition wait requires host support');continue;}
   keys(target,['name','mode'],p);
   if(!nameOK(target.name)||numeric(target.mode)!==0){issue(p,'only named action wait mode 0 is supported');continue;}
   if(!names.includes(target.name))names.push(target.name);
  }
  return {kind:'actions',names,extra:nonnegative(value.wait,path+'.wait',0),canSkip:bool(value.canskip,path+'.canskip',true)};
 };
 const parseUpdates=(value:unknown,path:string)=>{
  const updates:{name:string;actions:ScenePropertyAction[]}[]=[];
  if(!Array.isArray(value)){issue(path,'expected numeric object updates');return updates;}
  for(const [i,item] of value.entries()){
   if(!spend(path))break;const p=path+'.'+i;
   if(!record(item)||!nameOK(item.name)){issue(p,'expected existing named object update');continue;}
   keys(item,['name','action'],p);
   const actions:ScenePropertyAction[]=[];
   if(!Array.isArray(item.action)){issue(p+'.action','expected property action list');continue;}
   for(const [j,tuple] of item.action.entries()){
    if(!spend(p))break;const q=p+'.action.'+j;
    // Original null/integer stop slots depend on environment exclusions and
    // callbacks. Do not silently treat them as reserved/empty array slots.
    if(!Array.isArray(tuple)||tuple.length<2||tuple.length>3||!propertyOK(tuple[0])){issue(q,'unsupported property tuple or original stop slot');continue;}
    const property=tuple[0],value=tuple[1];
    if(!Array.isArray(value)){
     const n=numeric(value);
     if(n===null||tuple.length===3&&numeric(tuple[2])!==0){issue(q,'only immediate finite numeric sets are supported');continue;}
     actions.push({property,value:n});continue;
    }
    // Verified bytecode takes array values straight to addAction; tuple[2]
    // is read only on the scalar setProperty path, never on this array path.
    // Accept the observed 0/1 forms; scalar timing remains separately rejected.
    if(tuple.length===3&&![0,1].includes(numeric(tuple[2])??-1)){issue(q,'unsupported action tuple mode');continue;}
    const steps:(SceneMove|SceneHold)[]=[];
    if(!value.length)issue(q,'empty action sequence');
    for(const [k,step] of value.entries()){
     if(!spend(q))break;const s=q+'.'+k;
     if(!record(step)){issue(s,'composite or non-record action requires host support');continue;}
     if(step.handler==='wait'){
      keys(step,['handler','time','speed','nofast'],s);
      const speed=step.speed==null?1:numeric(step.speed);
      if(speed===null||speed<=0)issue(s+'.speed','expected positive finite speed');
      steps.push({handler:'wait',time:nonnegative(step.time,s+'.time'),speed:speed??1,nofast:bool(step.nofast,s+'.nofast')});continue;
     }
     if(step.handler!==undefined&&step.handler!=='MoveAction'){issue(s,'unsupported action handler');continue;}
     keys(step,['handler','value','start','time','delay','speed','starttime','accel','nowait','nofast'],s);
     const numberValue=(v:unknown)=>numeric(v)!==null||typeof v==='string'&&(v==='@'||/^@[+\-*/](\d+(?:\.\d+)?|\.\d+)$/.test(v));
     if(!numberValue(step.value)||step.start!=null&&!numberValue(step.start)){issue(s,'unsupported numeric or relative value');continue;}
     const speed=step.speed==null?1:numeric(step.speed),accel=easingValue(step.accel);
     if(speed===null||speed<=0)issue(s+'.speed','expected positive finite speed');
     if(accel===null)issue(s+'.accel','unsupported easing');
     steps.push({handler:'MoveAction',value:step.value as SceneNumber,...(step.start==null?{}:{start:step.start as SceneNumber}),
      time:nonnegative(step.time,s+'.time'),delay:nonnegative(step.delay,s+'.delay',0),speed:speed??1,
      starttime:nonnegative(step.starttime,s+'.starttime',0),accel:accel??0,
      nowait:bool(step.nowait,s+'.nowait'),nofast:bool(step.nofast,s+'.nofast')});
    }
    actions.push({property,value:steps});
   }
   updates.push({name:item.name,actions});
  }
  return updates;
 };
 if(!Array.isArray(raw)||typeof raw[0]!=='string'||raw.length%2!==1||raw.length>33)return {ok:false,action:null,diagnostics:[{path:'action',reason:'expected bounded flattened scene tag'}]};
 const params:Record<string,unknown>=Object.create(null);
 for(let i=1;i<raw.length;i+=2){
  if(typeof raw[i]!=='string'||own(params,raw[i] as string)){issue('action','invalid or duplicate tag parameter');continue;}
  params[raw[i] as string]=raw[i+1];
 }
 let action:SceneAction|null=null;
 if(raw[0]==='envupdate'){
  keys(params,['pretrans','update','wait'],'envupdate');
  if(!own(params,'pretrans')&&!own(params,'update')&&!own(params,'wait'))issue('envupdate','empty numeric update');
  action={kind:'update',updates:[...(own(params,'pretrans')?parseUpdates(params.pretrans,'pretrans'):[]),...(own(params,'update')?parseUpdates(params.update,'update'):[])],
   ...(own(params,'wait')?{wait:parseWait(params.wait,'wait')}:{})};
 }else if(raw[0]==='envwait')action=parseWait(params,'envwait');
 else if(raw[0]==='wait'){
  keys(params,['time','canskip'],'wait');action={kind:'time',time:nonnegative(params.time,'wait.time'),canSkip:bool(params.canskip,'wait.canskip')};
 }else issue('action','unsupported scene command');
 return diagnostics.length||!action?{ok:false,action:null,diagnostics}:{ok:true,action,diagnostics:[]};
}

type Segment={kind:'move'|'hold';from:number;to:number;start:number;end:number;duration:number;speed:number;starttime:number;accel:SceneEasing};
type Track={name:string;property:SceneProperty;initial:number;segments:Segment[];end:number;nowait:boolean;nofast:boolean};
type Barrier={kind:'time';until:number;canSkip:boolean}|{kind:'actions';tracks:Track[];extra:number;until:number|null;canSkip:boolean};
const trackKey=(name:string,property:SceneProperty)=>JSON.stringify([name,property]);
const copyState=(state:SceneActionState):SceneActionState=>({camera:{properties:{...state.camera.properties}},objects:Object.fromEntries(Object.entries(state.objects).map(([name,o])=>[name,{properties:{...o.properties}}]))});

// A deterministic host-clock reducer. This owns no RAF, timer, DOM, audio or
// mutable input objects. The browser host cancels on scene/selection/visibility
// changes and resets its timestamp baseline before attaching its single RAF.
export class SceneActionScheduler{
 private state:SceneActionState;
 private tracks=new Map<string,Track>();
 private barrier:Barrier|null=null;
 private time=0;
 private generation=0;
 private reducedMotion:boolean;
 constructor(initial:SceneActionState={objects:{},camera:{properties:{}}},options:{reducedMotion?:boolean}={}){
  if(!record(initial)||!record(initial.objects)||!record(initial.camera)||!record(initial.camera.properties))throw Error('Invalid scene action state');
  for(const [name,o] of [['env',initial.camera],...Object.entries(initial.objects)] as [string,SceneActionObject][]){
   if(!nameOK(name)||!record(o)||!record(o.properties))throw Error('Invalid scene action object');
   for(const [property,value] of Object.entries(o.properties))if(!propertyOK(property)||typeof value!=='number'||!Number.isFinite(value))throw Error('Invalid scene action property');
  }
  if(own(initial.objects,'env'))throw Error('env is reserved for camera properties');
  this.state=copyState(initial);this.reducedMotion=options.reducedMotion===true;
 }
 private object(name:string,state=this.state){return name==='env'?state.camera:own(state.objects,name)?state.objects[name]:undefined;}
 private sample(track:Track,at=this.time){
  let value=track.initial;
  for(const segment of track.segments){
   if(at<segment.start)break;
   if(at>=segment.end){value=segment.to;continue;}
   if(segment.kind==='hold')return segment.from;
   // Source ActionHandler order: add starttime BEFORE multiplying speed.
   const t=segment.duration===0?1:((at-segment.start+segment.starttime)*segment.speed)/segment.duration;
   return segment.from+(segment.to-segment.from)*sampleSceneEasing(segment.accel,t);
  }
  return value;
 }
 private sync(){
  for(const [key,track] of this.tracks){this.object(track.name)!.properties[track.property]=this.sample(track);if(this.time>=track.end)this.tracks.delete(key);}
 }
 private refreshWait(){
  const wait=this.barrier;if(!wait)return;
  if(wait.kind==='actions'){
   if(wait.tracks.some(t=>this.tracks.get(trackKey(t.name,t.property))===t))return;
   if(wait.until===null)wait.until=this.time+wait.extra;
  }
  if(wait.until!==null&&this.time>=wait.until)this.barrier=null;
 }
 private startWait(wait:SceneActionWait){
  this.barrier=wait.kind==='time'?{kind:'time',until:this.time+wait.time,canSkip:wait.canSkip}:{kind:'actions',
   tracks:[...this.tracks.values()].filter(t=>wait.names.includes(t.name)&&!t.nowait),extra:wait.extra,until:null,canSkip:wait.canSkip};
  this.refreshWait();
 }
 dispatch(raw:unknown):SceneActionResult{
  const parsed=parseSceneAction(raw);if(!parsed.ok)return parsed;
  const action=parsed.action,state=copyState(this.state),tracks=new Map(this.tracks),groups=new Map<string,Track>();
  const diagnostics:SceneActionDiagnostic[]=[];
  const waits=action.kind==='update'?action.wait:action;
  // Plan against detached state; an unresolved initial/overflow never partly
  // mutates the active scene, old tracks or the current wait boundary.
  if(action.kind==='update')for(const [i,update] of action.updates.entries()){
   const object=this.object(update.name,state);
   if(!object){diagnostics.push({path:'update.'+i,reason:'missing verified object'});continue;}
   for(const [j,entry] of update.actions.entries()){
    const key=trackKey(update.name,entry.property),path='update.'+i+'.action.'+j;
    if(!groups.has(key)){
     const old=tracks.get(key);
     // The numeric projection settles the old property before replacement,
     // following delAction's endpoint behavior. The recovered envupdate array
     // branch is incomplete: full replacement parity is NOT established.
     // Explicit host cancel(false) instead freezes the sampled current value.
     if(old)object.properties[entry.property]=old.segments.at(-1)!.to;
     tracks.delete(key);
    }
    if(typeof entry.value==='number'){
     object.properties[entry.property]=entry.value;groups.delete(key);tracks.delete(key);continue;
    }
    const baseline=object.properties[entry.property];
    if(baseline===undefined){diagnostics.push({path,reason:'missing verified initial property'});continue;}
    let track=groups.get(key);
    if(!track){track={name:update.name,property:entry.property,initial:baseline,segments:[],end:this.time,nowait:false,nofast:false};groups.set(key,track);}
    for(const step of entry.value){
     const previous=track.segments.at(-1)?.to??baseline;
     // Each handler captures @ against the dispatch-time property, whereas an
     // omitted start takes the preceding segment's value at execution time.
     const from=step.handler==='wait'?previous:step.start===undefined?previous:resolveSceneNumber(step.start,baseline);
     const to=step.handler==='wait'?previous:resolveSceneNumber(step.value,baseline);
     if(from==null||to==null){diagnostics.push({path,reason:'unresolved initial or relative value'});break;}
     const delay=step.handler==='wait'?0:step.delay,starttime=step.handler==='wait'?0:step.starttime;
     const start=track.end+delay,end=start+Math.max(0,step.time/step.speed-starttime);
     if(![from,to,to-from,start,end].every(Number.isFinite)){diagnostics.push({path,reason:'non-finite action range or clock'});break;}
     track.segments.push({kind:step.handler==='wait'?'hold':'move',from,to,start,end,duration:step.time,speed:step.speed,starttime,accel:step.handler==='wait'?0:step.accel});
     track.end=end;track.nofast||=step.nofast;if(step.handler==='MoveAction')track.nowait||=step.nowait;
    }
    if(track.segments.length)tracks.set(key,track);
   }
  }
  if(waits?.kind==='actions')for(const name of waits.names)if(!this.object(name,state))diagnostics.push({path:'wait',reason:'missing verified wait object'});
  const waitDuration=waits?.kind==='time'?waits.time:waits?.extra??0;
  const lastEnd=Math.max(this.time,...[...tracks.values()].map(t=>t.end));
  if(!Number.isFinite(lastEnd+waitDuration))diagnostics.push({path:'wait',reason:'non-finite wait clock'});
  if(diagnostics.length)return {ok:false,action:null,diagnostics};
  this.state=state;this.tracks=tracks;
  if(this.reducedMotion)this.finishTracks();else this.sync();
  if(waits)this.startWait(waits);else this.refreshWait();
  return parsed;
 }
 advance(ms:number):SceneActionFrame{
  const end=this.time+ms;if(!Number.isFinite(ms)||ms<0||!Number.isFinite(end))throw Error('Clock must advance by finite non-negative milliseconds');
  // Visit completion boundaries even for a large host delta: post-action waits
  // begin at completion, not at the end of the caller's coarse frame.
  while(this.time<end){
   let next=end;
   for(const track of this.tracks.values())if(track.end>this.time)next=Math.min(next,track.end);
   if(this.barrier?.until!=null&&this.barrier.until>this.time)next=Math.min(next,this.barrier.until);
   this.time=next;this.sync();this.refreshWait();
  }
  return this.frame();
 }
 frame():SceneActionFrame{return {...copyState(this.state),time:this.time,active:this.tracks.size>0||this.barrier!==null,waiting:this.barrier!==null,generation:this.generation};}
 private finishTracks(){
  for(const track of this.tracks.values())this.object(track.name)!.properties[track.property]=track.segments.at(-1)!.to;
  this.tracks.clear();this.refreshWait();
 }
 // Host cancellation is intentionally distinct from original null/integer stop
 // slots: false freezes the sampled value; true lands at the numeric endpoint.
 // Whole-scene cancellation also drops script waits and invalidates old work.
 cancel(name?:string,finish=false,property?:SceneProperty):void{
  for(const [key,track] of this.tracks)if((name===undefined||track.name===name)&&(property===undefined||track.property===property)){
   this.object(track.name)!.properties[track.property]=finish?track.segments.at(-1)!.to:this.sample(track);this.tracks.delete(key);
  }
  if(name===undefined&&property===undefined)this.barrier=null;else this.refreshWait();
  this.generation++;
 }
 setReducedMotion(value:boolean):void{
  this.reducedMotion=value;
  // Accessibility policy: settle numeric movement including nofast; preserve
  // explicit dialogue/time waits. This is not an original engine skip mode.
  if(value)this.finishTracks();
 }
 skipWait():boolean{
  const wait=this.barrier;if(!wait||!wait.canSkip)return false;
  if(wait.kind==='time'){this.barrier=null;return true;}
  for(const track of wait.tracks)if(!track.nofast&&this.tracks.get(trackKey(track.name,track.property))===track){
   this.object(track.name)!.properties[track.property]=track.segments.at(-1)!.to;this.tracks.delete(trackKey(track.name,track.property));
  }
  wait.extra=0;wait.until=null;this.refreshWait();return true;
 }
}
