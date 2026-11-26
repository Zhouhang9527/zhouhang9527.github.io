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
type SceneTiming={time:number|null;delay:number;speed:number;starttime:number;nowait:boolean;nofast:boolean};
export type SceneVibration=SceneTiming&{handler:'SinAction'|'CosAction'|'RandomAction'|'SquareAction'|'TriangleAction';
 value:SceneNumber;offset:SceneNumber;mag:number;cycle:number|null;angvel:number|null;waittime:number|null;ontime:number|null;offtime:number|null;seed:number|null};
export type SceneLoopMove=SceneTiming&{handler:'LoopMoveAction';min:SceneNumber;max:SceneNumber;start?:SceneNumber;loop:number};
export type SceneStep=SceneMove|SceneHold|SceneVibration|SceneLoopMove;
export type SceneSchedulerOptions={reducedMotion?:boolean;random?:{policy:'indexed-preview';seed:number};loopCompletion?:'left-limit'};
export type ScenePropertyAction={property:SceneProperty;value:number|SceneStep[]};
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
 if(value==='@')return initial;if(value==='-@')return -initial;
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
    const steps:SceneStep[]=[];
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
     const numberValue=(v:unknown)=>numeric(v)!==null||typeof v==='string'&&(v==='@'||v==='-@'||/^@[+\-*/](\d+(?:\.\d+)?|\.\d+)$/.test(v));
     if(['SinAction','CosAction','RandomAction','SquareAction','TriangleAction','LoopMoveAction'].includes(String(step.handler))){
      const timing:SceneTiming={time:step.time==null?null:nonnegative(step.time,s+'.time'),delay:nonnegative(step.delay,s+'.delay',0),
       speed:step.speed==null?1:numeric(step.speed)??0,starttime:nonnegative(step.starttime,s+'.starttime',0),
       nowait:bool(step.nowait,s+'.nowait'),nofast:bool(step.nofast,s+'.nofast')};
      if(timing.speed<=0)issue(s+'.speed','expected positive finite speed');
      if(step.handler==='LoopMoveAction'){
       keys(step,['handler','time','delay','speed','starttime','nowait','nofast','min','max','start','loop'],s);
       const loop=step.loop==null?timing.time:numeric(step.loop);
       if(!numberValue(step.min)||!numberValue(step.max)||step.start!=null&&!numberValue(step.start))issue(s,'unsupported loop range');
       if(loop===null||loop<=0)issue(s+'.loop','expected positive finite loop duration');
       steps.push({...timing,handler:'LoopMoveAction',min:step.min as SceneNumber,max:step.max as SceneNumber,loop:loop??1,
        ...(step.start==null?{}:{start:step.start as SceneNumber})});continue;
      }
      const handler=step.handler as SceneVibration['handler'];
      const specific=handler==='RandomAction'?['waittime','seed']:handler==='SquareAction'||handler==='TriangleAction'?['ontime','offtime']:['cycle','angvel'];
      keys(step,['handler','time','delay','speed','starttime','nowait','nofast','value','vibration','offset','mag',...specific],s);
      const value=step.value??step.vibration,offset=step.offset??0,mag=step.mag==null?1:numeric(step.mag);
      if(!numberValue(value)||!numberValue(offset)||mag===null)issue(s,'unsupported vibration parameters');
      // RandomAction's constructor overwrites VibrateAction's relative value;
      // only its numeric amplitude is supported, not fabricated @ evaluation.
      if(handler==='RandomAction'&&numeric(value)===null)issue(s,'RandomAction requires numeric amplitude');
      const seed=step.seed==null?null:numeric(step.seed),waittime=step.waittime==null?null:numeric(step.waittime);
      const cycle=step.cycle==null?null:numeric(step.cycle),angvel=step.angvel==null?null:numeric(step.angvel);
      const ontime=step.ontime==null?null:numeric(step.ontime),offtime=step.offtime==null?null:numeric(step.offtime);
      if(handler==='RandomAction'&&(waittime===null||waittime<=0||step.seed!=null&&(seed===null||!Number.isFinite(seed*4294967295))))issue(s,'invalid random interval or seed');
      if((handler==='SinAction'||handler==='CosAction')&&((cycle===null&&angvel===null)||(step.cycle!=null&&(cycle===null||cycle<=0))||(step.angvel!=null&&angvel===null)))issue(s,'invalid wave period or angular velocity');
      if((handler==='SquareAction'||handler==='TriangleAction')&&(ontime===null||ontime<=0||offtime===null||offtime<0||!Number.isFinite(ontime+offtime)))issue(s,'invalid on/off durations');
      steps.push({...timing,handler,value:value as SceneNumber,offset:offset as SceneNumber,mag:mag??1,seed,waittime,cycle,angvel,ontime,offtime});continue;
     }
     if(step.handler!==undefined&&step.handler!=='MoveAction'){issue(s,'unsupported action handler');continue;}
     keys(step,['handler','value','start','time','delay','speed','starttime','accel','nowait','nofast'],s);
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

type SegmentBase={from:number;to:number;start:number;end:number;speed:number;starttime:number};
type Segment=SegmentBase&({kind:'move';duration:number;accel:SceneEasing}|{kind:'hold';duration:number;accel:SceneEasing}|
 {kind:'vibration';duration:number|null;handler:SceneVibration['handler'];vibration:number;offset:number;cycle:number|null;angvel:number|null;
  waittime:number|null;ontime:number|null;offtime:number|null;seed:number}|
 {kind:'loop';duration:number|null;min:number;max:number;loopStart:number;loop:number});
// Explicit indexed PREVIEW RNG: the original Math.RandomGenerator stream and
// tick catch-up are unresolved. A host must opt into this deterministic policy.
function indexedSceneRandom(seed:number,index:number){
 let x=(seed+Math.imul(index+1,0x9e3779b9))>>>0;
 x=Math.imul(x^(x>>>16),0x21f0aaad);x=Math.imul(x^(x>>>15),0x735a2d97);
 return ((x^(x>>>15))>>>0)/4294967296;
}
function loopSceneValue(segment:{min:number;max:number;loopStart:number;loop:number},local:number){
 const span=segment.max-segment.min;
 return segment.min+(segment.loopStart-segment.min+span*((local%segment.loop)/segment.loop))%span;
}
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
 private randomPolicy:SceneSchedulerOptions['random'];
 private randomSerial=0;
 private loopCompletion:SceneSchedulerOptions['loopCompletion'];
 constructor(initial:SceneActionState={objects:{},camera:{properties:{}}},options:SceneSchedulerOptions={}){
  if(!record(initial)||!record(initial.objects)||!record(initial.camera)||!record(initial.camera.properties))throw Error('Invalid scene action state');
  for(const [name,o] of [['env',initial.camera],...Object.entries(initial.objects)] as [string,SceneActionObject][]){
   if(!nameOK(name)||!record(o)||!record(o.properties))throw Error('Invalid scene action object');
   for(const [property,value] of Object.entries(o.properties))if(!propertyOK(property)||typeof value!=='number'||!Number.isFinite(value))throw Error('Invalid scene action property');
  }
  if(own(initial.objects,'env'))throw Error('env is reserved for camera properties');
  if(options.random&&(options.random.policy!=='indexed-preview'||!Number.isFinite(options.random.seed)))throw Error('Invalid host random policy');
  if(options.loopCompletion!==undefined&&options.loopCompletion!=='left-limit')throw Error('Invalid host loop completion policy');
  this.state=copyState(initial);this.reducedMotion=options.reducedMotion===true;
  this.randomPolicy=options.random?{...options.random}:undefined;this.loopCompletion=options.loopCompletion;
 }
 private object(name:string,state=this.state){return name==='env'?state.camera:own(state.objects,name)?state.objects[name]:undefined;}
 private sample(track:Track,at=this.time){
  let value=track.initial;
  for(const segment of track.segments){
   if(at<segment.start)break;
   if(at>=segment.end){value=segment.to;continue;}
   if(segment.kind==='hold')return segment.from;
   // Source ActionHandler order: add starttime BEFORE multiplying speed.
   const local=(at-segment.start+segment.starttime)*segment.speed;
   if(!Number.isFinite(local))throw Error('Action clock overflow');
   if(segment.kind==='move')return segment.from+(segment.to-segment.from)*sampleSceneEasing(segment.accel,segment.duration===0?1:local/segment.duration);
   if(segment.kind==='loop')return loopSceneValue(segment,local);
   let factor=0;
   if(segment.handler==='RandomAction')factor=2*indexedSceneRandom(segment.seed,Math.floor(local/segment.waittime!))-1;
   else if(segment.handler==='SquareAction'||segment.handler==='TriangleAction'){
    const on=segment.ontime!,off=segment.offtime!,phase=local%(on+off);
    factor=segment.handler==='SquareAction'?(phase<on?1:-1):phase>on?(off>0?(off-(phase-on))/off:0):phase/on;
   }else{
    const period=360000/Math.abs(segment.angvel??0);
    const turns=segment.cycle!==null?(local%segment.cycle)/segment.cycle:segment.angvel===0?0:
     Number.isFinite(period)?((local%period)/period)*Math.sign(segment.angvel!):local*segment.angvel!/360000;
    factor=segment.handler==='CosAction'?Math.cos(2*Math.PI*turns):Math.sin(2*Math.PI*turns);
   }
   return segment.from+segment.offset+segment.vibration*factor;
  }
  return value;
 }
 private sync(){
  const samples=[...this.tracks].map(([key,track])=>({key,track,value:this.sample(track)}));
  if(samples.some(s=>!Number.isFinite(s.value)))throw Error('Non-finite scene action sample');
  for(const {key,track,value} of samples){this.object(track.name)!.properties[track.property]=value;if(this.time>=track.end)this.tracks.delete(key);}
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
  let randomSerial=this.randomSerial;
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
     // Recovered bytecode removes the old property action once before adding
     // its replacement; delAction settles its finite numeric endpoint. This
     // does not establish native renderer or full scene/tick parity.
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
     if(!Number.isFinite(track.end)){diagnostics.push({path,reason:'action follows an indefinite segment'});break;}
     const delay=step.handler==='wait'?0:step.delay,starttime=step.handler==='wait'?0:step.starttime;
     const start=track.end+delay,end=step.time===null?Infinity:start+Math.max(0,step.time/step.speed-starttime);
     if(!Number.isFinite(start)||!Number.isFinite(starttime*step.speed)||(step.time!==null&&!Number.isFinite(end))){diagnostics.push({path,reason:'non-finite action clock'});break;}
     const timing={start,end,speed:step.speed,starttime};
     if(step.handler==='wait'||step.handler==='MoveAction'){
      // @ targets capture construction-time state; an omitted start takes the
      // preceding endpoint only when execution reaches this segment.
      const from=step.handler==='wait'?previous:step.start===undefined?previous:resolveSceneNumber(step.start,baseline);
      const to=step.handler==='wait'?previous:resolveSceneNumber(step.value,baseline);
      if(from==null||to==null||![from,to,to-from].every(Number.isFinite)){diagnostics.push({path,reason:'unresolved initial or non-finite relative range'});break;}
      track.segments.push({...timing,kind:step.handler==='wait'?'hold':'move',from,to,duration:step.time,accel:step.handler==='wait'?0:step.accel});
     }else if(step.handler==='LoopMoveAction'){
      const min=resolveSceneNumber(step.min,baseline),max=resolveSceneNumber(step.max,baseline),loopStart=step.start===undefined?previous:resolveSceneNumber(step.start,baseline);
      if(min===null||max===null||loopStart===null||max<=min||![max-min,loopStart-min,loopStart-min+(max-min)].every(Number.isFinite)){diagnostics.push({path,reason:'unresolved loop range'});break;}
      if(step.time!==null&&this.loopCompletion!=='left-limit'){diagnostics.push({path,reason:'finite LoopMoveAction requires explicit host completion policy'});break;}
      const segment:Segment={...timing,kind:'loop',from:previous,to:previous,duration:step.time,min,max,loopStart,loop:step.loop};
      // Original completion does not write a new value. A finite continuous
      // preview endpoint is opt-in, not a claim about the last native tick.
      if(step.time!==null)segment.to=loopSceneValue(segment,Math.max(starttime*step.speed,step.time-Math.max(1e-7,Math.abs(step.time)*Number.EPSILON*4)));
      track.segments.push(segment);
     }else{
      const vibration=resolveSceneNumber(step.value,baseline),offset=resolveSceneNumber(step.offset,baseline);
      if(vibration===null||offset===null||![vibration*step.mag,previous+offset+vibration*step.mag,previous+offset-vibration*step.mag].every(Number.isFinite)){diagnostics.push({path,reason:'unresolved or non-finite vibration range'});break;}
      if(step.handler==='RandomAction'&&!this.randomPolicy){diagnostics.push({path,reason:'RandomAction requires explicit host random policy'});break;}
      const seed=step.seed===null?((this.randomPolicy?.seed??0)+ ++randomSerial)>>>0:Math.trunc(step.seed*4294967295)>>>0;
      track.segments.push({...timing,kind:'vibration',from:previous,to:previous,duration:step.time,handler:step.handler,
       vibration:vibration*step.mag,offset,cycle:step.cycle,angvel:step.angvel,waittime:step.waittime,ontime:step.ontime,offtime:step.offtime,seed});
     }
     track.end=end;track.nofast||=step.nofast;if(step.handler!=='wait')track.nowait||=step.nowait;
    }
    if(track.segments.length)tracks.set(key,track);
   }
  }
  if(waits?.kind==='actions')for(const name of waits.names)if(!this.object(name,state))diagnostics.push({path:'wait',reason:'missing verified wait object'});
  const waitDuration=waits?.kind==='time'?waits.time:waits?.extra??0;
  const lastEnd=Math.max(this.time,...[...tracks.values()].map(t=>t.end).filter(Number.isFinite));
  if(!Number.isFinite(lastEnd+waitDuration))diagnostics.push({path:'wait',reason:'non-finite wait clock'});
  if(diagnostics.length)return {ok:false,action:null,diagnostics};
  this.state=state;this.tracks=tracks;this.randomSerial=randomSerial;
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
