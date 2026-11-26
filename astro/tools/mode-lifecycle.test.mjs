import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import {parseSaveRecord} from '../src/domain/reading-state.ts';
import {PLAYBACK_KEY,parsePlayback} from '../src/domain/vn-options.ts';
import {computeMascotGeometry,projectMascotCamera} from '../src/lib/mascot-geometry.ts';
const sceneActionsSource=stripTypeScriptTypes(readFileSync(new URL('../src/domain/vn-actions.ts',import.meta.url),'utf8')).replace(/^export /gm,'');

// Execute the complete production modules, with only their imports replaced by
// fixture boundaries. This is deterministic DOM/event/RAF coverage, not a real
// browser, real media playback, or a claim that two browser tabs were exercised.
const sources=Object.fromEntries(['vn-ui','vn-reader-controls','vn-mascot'].map(name=>{
 const source=readFileSync(new URL(`../src/runtime/${name}.ts`,import.meta.url),'utf8');
 return [name,stripTypeScriptTypes(source.replace(/^import .*\r?\n/gm,'').replace(/^export \{\};?\s*$/gm,'').replace(/^export (?=(?:async )?function )/gm,''))];
}));

class FixtureEvent {
 constructor(type,properties={}){Object.assign(this,{type,target:null,defaultPrevented:false,button:0},properties);}
 preventDefault(){this.defaultPrevented=true;}
}
class EventHub {
 listeners=new Map();
 addEventListener(type,callback,options={}){
  const entries=this.listeners.get(type)||[];
  const capture=options===true||!!options.capture;
  if(!entries.some(entry=>entry.callback===callback&&entry.capture===capture))entries.push({callback,capture,once:!!options.once});
  this.listeners.set(type,entries);
 }
 removeEventListener(type,callback){this.listeners.set(type,(this.listeners.get(type)||[]).filter(entry=>entry.callback!==callback));}
 dispatchEvent(event){
  if(!event.target)event.target=this;
  for(const entry of [...(this.listeners.get(event.type)||[])].sort((a,b)=>Number(b.capture)-Number(a.capture))){
   if(!(this.listeners.get(event.type)||[]).includes(entry))continue;
   if(entry.once)this.removeEventListener(event.type,entry.callback);
   entry.callback(event);
  }
  return !event.defaultPrevented;
 }
 listenerCount(type){return (this.listeners.get(type)||[]).length;}
}
const dataName=name=>name.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());
class FixtureElement extends EventHub {
 constructor(tag='div',attributes={}){
  super();this.tagName=tag.toUpperCase();this.dataset={};this.attributes=new Map();this.children=[];this.parentElement=null;
  this.hidden=false;this.disabled=false;this.textContent='';this.value='';this.checked=false;this.focusVisible=false;this.scrollIntoViewCount=0;this.rect={top:0,bottom:100,height:100};
  const properties=new Map();this.style={setProperty:(key,value)=>properties.set(key,value),removeProperty:key=>properties.delete(key),getPropertyValue:key=>properties.get(key)||''};
  for(const [key,value] of Object.entries(attributes))this.setAttribute(key,value);
 }
 setAttribute(name,value){
  value=String(value);this.attributes.set(name,value);
  if(name.startsWith('data-'))this.dataset[dataName(name)]=value;
  if(name==='hidden')this.hidden=true;
  if(name==='disabled')this.disabled=true;
  if(name==='name'||name==='value'||name==='src')this[name]=value;
 }
 getAttribute(name){
  if(name.startsWith('data-'))return this.dataset[dataName(name)]??null;
  if(name==='hidden')return this.hidden?'':null;
  if(name==='disabled')return this.disabled?'':null;
  if(name==='src')return this.src||null;
  return this.attributes.get(name)??null;
 }
 hasAttribute(name){return this.getAttribute(name)!==null;}
 removeAttribute(name){this.attributes.delete(name);if(name.startsWith('data-'))delete this.dataset[dataName(name)];if(name==='src')this.src='';if(name==='hidden')this.hidden=false;}
 toggleAttribute(name,force){const value=force??!this.hasAttribute(name);if(value)this.setAttribute(name,'');else this.removeAttribute(name);return value;}
 matches(selector){
  if(selector===':focus-visible')return this.focusVisible;
  return selector.split(',').some(part=>{
   let candidate=part.trim();const exclusions=[...candidate.matchAll(/:not\(([^)]+)\)/g)].map(match=>match[1]);
   if(exclusions.some(exclusion=>this.matches(exclusion)))return false;
   candidate=candidate.replace(/:not\([^)]+\)/g,'');
   for(const match of candidate.matchAll(/\[([\w-]+)(?:=["']?([^\]"']*)["']?)?\]/g)){
    if(!this.hasAttribute(match[1])||match[2]!==undefined&&this.getAttribute(match[1])!==match[2])return false;
   }
   candidate=candidate.replace(/\[[^\]]+\]/g,'');
   for(const match of candidate.matchAll(/\.([\w-]+)/g))if(!(this.getAttribute('class')||'').split(/\s+/).includes(match[1]))return false;
   const id=candidate.match(/#([\w-]+)/);if(id&&this.getAttribute('id')!==id[1])return false;
   const tag=candidate.replace(/[.#][\w-]+/g,'').trim();return !tag||tag.toUpperCase()===this.tagName;
  });
 }
 append(...children){for(const child of children){child.parentElement=this;this.children.push(child);}}
 replaceChildren(...children){for(const child of this.children)child.parentElement=null;this.children=[];this.append(...children);}
 querySelectorAll(selector){return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]??null;}
 closest(selector){for(let node=this;node;node=node.parentElement)if(node.matches(selector))return node;return null;}
 contains(element){return element===this||this.children.some(child=>child.contains(element));}
 get isConnected(){return this.connectedRoot===true||!!this.parentElement?.isConnected;}
 getBoundingClientRect(){return this.rect;}
 focus(){}
 scrollIntoView(){this.scrollIntoViewCount++;}
}
class FixtureInput extends FixtureElement {constructor(attributes={}){super('input',attributes);}}
class FixtureSelect extends FixtureElement {constructor(attributes={}){super('select',attributes);this.options=[];}}
class FixtureImage extends FixtureElement {
 constructor(){super('img');this.complete=true;this.naturalWidth=80;this.naturalHeight=160;}
 decode(){return Promise.resolve();}
}
class FixtureAudio extends FixtureElement {
 constructor(){super('audio',{'data-mascot-audio':''});this.paused=true;this.ended=false;this.volume=1;this.muted=false;}
 pause(){this.paused=true;this.dispatchEvent(new FixtureEvent('pause'));}
 play(){this.paused=false;return Promise.resolve();}
 load(){}
}
function storageFixture(initial={}){
 const values=new Map(Object.entries(initial));
 return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key),clear:()=>values.clear()};
}
const MODE='ginka.vn.mode.v1',MOTION='ginka.vn.motion.v1';
const asset=index=>`/__ginka_local_mascot__/asset-${index}.png`;
const pose={layers:null,canvas:{width:80,height:160},character:'child',phase:'main',outfit:'verified',expression:'normal',gesture:'standing',base:asset(0),blink:asset(1),mouth:asset(2),motion:[{image:asset(3),ms:100}]};
const line={id:'fixture-line',speaker:'Fixture',text:'Deterministic original-line fixture.',pose:'fixture',phase:'main',voice:null};
const nextLine={...line,id:'fixture-next',text:'Next deterministic line.'};
const pack={version:2,defaultPose:'fixture',poses:{fixture:pose},lines:[line,nextLine]};

function harness({modules=['vn-ui','vn-reader-controls'],stored={},services={}}={}){
 const document=new EventHub(),window=new EventHub();
 const html=new FixtureElement('html');html.connectedRoot=true;document.documentElement=html;document.hidden=false;
 document.querySelector=selector=>html.querySelector(selector);document.querySelectorAll=selector=>html.querySelectorAll(selector);
 document.getElementById=id=>html.querySelector(`#${id}`);document.createElement=tag=>new FixtureElement(tag);document.createDocumentFragment=()=>new FixtureElement('fragment');document.createTextNode=text=>Object.assign(new FixtureElement('text'),{textContent:text});
 const localStorage=storageFixture(stored),sessionStorage=storageFixture(),rafs=new Map(),timers=new Map();
 let nextId=0,now=0;const scrolls=[];
 const requestAnimationFrame=callback=>{const id=++nextId;rafs.set(id,callback);return id;};
 const cancelAnimationFrame=id=>rafs.delete(id);
 const setTimeout=(callback,ms)=>{const id=++nextId;timers.set(id,{callback,ms});return id;};
 const clearTimeout=id=>timers.delete(id);
 Object.assign(window,{requestAnimationFrame,cancelAnimationFrame,setTimeout,clearTimeout,scrollBy:(...args)=>scrolls.push(args),scrollTo(){}});
 const add=(parent,tag,attributes={})=>{const child=tag==='input'?new FixtureInput(attributes):new FixtureElement(tag,attributes);parent.append(child);return child;};
 const toggle=add(html,'button',{'data-vn-mode-toggle':''});
 const modeSet=add(html,'a',{'data-vn-mode-set':'reader'});
 const config=add(html,'section',{'data-vn-config':''});
 const readerRadio=add(config,'input',{name:'vn-mode',value:'reader'}),gameRadio=add(config,'input',{name:'vn-mode',value:'game'});
 const reducedRadio=add(config,'input',{name:'vn-motion',value:'reduced'}),systemRadio=add(config,'input',{name:'vn-motion',value:'system'});
 const article=add(html,'article',{'data-vn-article':'/fixture/'});add(article,'h1').textContent='Fixture article';
 const body=add(article,'div',{class:'post-body'});body.rect={top:0,bottom:3000,height:3000};
 const actions=add(article,'div',{class:'vn-reader-actions'});actions.rect={top:2900,bottom:3000,height:100};
 const reader=add(article,'div',{'data-vn-game-reader':''});reader.hidden=true;
 const gameWindow=add(reader,'div',{'data-vn-game-window':''});gameWindow.rect={top:600,bottom:800,height:200};
 const heading=add(gameWindow,'span',{'data-vn-current-heading':''}),gameDescription=add(gameWindow,'p',{'data-vn-game-description':''});
 const gameSpeaker=add(gameWindow,'span',{'data-vn-dialogue-speaker':''}),gameText=add(gameWindow,'p',{'data-vn-dialogue-text':''});gameSpeaker.hidden=gameText.hidden=true;
 const quickToggle=add(reader,'button',{'data-vn-quick-toggle':''}),quick=add(reader,'aside',{'data-vn-quick-menu':''});quick.hidden=true;
 const auto=add(reader,'button',{'data-vn-game-action':'auto'}),hold=add(reader,'button',{'data-vn-game-action':'hold'});
 const qsave=add(reader,'button',{'data-vn-game-action':'qsave'}),qload=add(reader,'button',{'data-vn-game-action':'qload'});
 const feedback=add(reader,'span',{'data-vn-game-feedback':''}),restored=[];
 const mascot=add(html,'div',{'data-ginka-mascot':'','data-mascot-source':'/fixture-manifest.json'});mascot.hidden=true;
 const launcher=add(mascot,'button',{'data-mascot-action':'open'}),character=add(mascot,'div',{'data-mascot-character':''});character.hidden=true;
 const portrait=add(character,'button',{class:'ginka-mascot-portrait','data-mascot-action':'next'});
 for(const kind of ['base','blink','mouth']){const image=new FixtureImage();image.setAttribute(`data-mascot-${kind}`,'');image.hidden=kind!=='base';portrait.append(image);}
 const mascotWindow=add(mascot,'section',{'data-mascot-window':''});mascotWindow.hidden=true;
 add(mascotWindow,'span',{'data-mascot-speaker':''});const mascotText=add(mascotWindow,'p',{'data-mascot-text':''});
 const audio=new FixtureAudio();mascot.append(audio);
 const mediaPreference=new EventHub();mediaPreference.matches=false;
 const context=vm.createContext({
  document,window,localStorage,sessionStorage,location:{pathname:'/fixture/'},innerHeight:800,scrollY:0,
  Event:FixtureEvent,CustomEvent:FixtureEvent,Element:FixtureElement,HTMLElement:FixtureElement,HTMLInputElement:FixtureInput,HTMLSelectElement:FixtureSelect,Image:FixtureImage,
  requestAnimationFrame,cancelAnimationFrame,setTimeout,clearTimeout,performance:{now:()=>now},matchMedia:()=>mediaPreference,
  fetch:async()=>({ok:true,json:async()=>pack}),
  // Imported services are not the subject of these lifecycle tests.
  navigate(){throw Error('unexpected navigation');},capturePosition:()=>({ratio:.2,section:0,heading:null}),restorePosition(){throw Error('unexpected restore');},
  isPath:value=>typeof value==='string'&&value.startsWith('/'),parseSaveRecord,PLAYBACK_KEY,parsePlayback,computeMascotGeometry,projectMascotCamera,confirmVN:async()=>false,beginManualSave(){},beginManualLoad(){},
  captureSaveRecord:()=>({path:'/2026/11/26/fixture/',position:{ratio:.2,section:0,heading:null},title:'Fixture article',at:100}),
  restoreSave:record=>{restored.push(record);return true;},isReaderAction:value=>['auto','hold','qsave','qload'].includes(value),
  KEY:'ginka.vn.reading.v1',PROGRESS_KEY:'ginka.vn.progress.v1',parse:()=>({mainCleared:false}),HISTORY_KEY:'ginka.vn.voice.history.v1',parseHistory:()=>[],appendHistory:()=>[],
  ...services
 });
 // Run the production scheduler in the same realm as the fixture host. This
 // preserves its actual plain-record boundary rather than bypassing it for VM objects.
 vm.runInContext(sceneActionsSource,context,{filename:'vn-actions.ts'});
 for(const module of modules)vm.runInContext(`(()=>{${sources[module]}\n})();`,context,{filename:module+'.ts'});
 const dispatch=(type,target,extra={})=>document.dispatchEvent(new FixtureEvent(type,{target,...extra}));
 return {document,window,html,localStorage,rafs,timers,scrolls,toggle,modeSet,readerRadio,gameRadio,reducedRadio,systemRadio,article,reader,quickToggle,quick,auto,hold,qsave,qload,feedback,restored,gameSpeaker,gameText,heading,gameDescription,mascotWindow,mascotText,launcher,audio,mediaPreference,
  click:(target,extra={})=>dispatch('click',target,extra),change:target=>dispatch('change',target),
  storage:(key,value)=>{if(key===null)localStorage.clear();else if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);window.dispatchEvent(new FixtureEvent('storage',{key,newValue:value}));},
  pageLoad:()=>dispatch('astro:page-load',document),
  frame(time=now+16){now=time;for(const [id,callback] of [...rafs]){if(!rafs.delete(id))continue;callback(now);}},
  fireTimer(ms){const entry=[...timers].find(([,timer])=>timer.ms===ms);assert.ok(entry,`expected ${ms}ms timer`);timers.delete(entry[0]);entry[1].callback();},
  async settle(){for(let index=0;index<8;index++)await Promise.resolve();}
 };
}
function assertStopped(h){assert.equal(h.auto.getAttribute('aria-pressed'),'false');assert.equal(h.quick.hidden,true);assert.equal(h.quickToggle.getAttribute('aria-expanded'),'false');}
function startReader(h){h.click(h.quickToggle);h.click(h.hold);h.click(h.auto);h.frame(100);h.frame(150);assert.ok(h.scrolls.some(([,amount])=>amount>0),'AUTO must actually scroll before the switch');assert.equal(h.quick.hidden,false);}

const QUICK='ginka.vn.quick.v1';
const quickRecord={path:'/2026/11/26/fixture/',position:{ratio:.7,section:.3,heading:'saved'},title:'Saved article',at:50};
function pendingConfirmation(){let resolve;const promise=new Promise(done=>resolve=done);return {promise,accept:()=>resolve(true),cancel:()=>resolve(false)};}

test('quick slots use the same persisted record validation as manual slots',()=>{
 for(const invalid of [{...quickRecord,at:undefined},{...quickRecord,at:-1},{...quickRecord,title:''},{...quickRecord,position:{...quickRecord.position,ratio:2}}]){
  const h=harness({stored:{[QUICK]:JSON.stringify(invalid)}});assert.equal(h.qload.disabled,true);
 }
 const h=harness({stored:{[QUICK]:JSON.stringify(quickRecord)}});assert.equal(h.qload.disabled,false);
});

test('quick save captures through the shared save path and confirms an overwrite',async()=>{
 const confirmations=[],h=harness({services:{confirmVN:async(...args)=>{confirmations.push(args);return true;}}});
 h.click(h.qsave);await h.settle();
 assert.equal(JSON.parse(h.localStorage.getItem(QUICK)).at,100);assert.equal(confirmations.length,0);
 h.click(h.qsave);await h.settle();assert.deepEqual(confirmations,[['覆盖快速存档？','qsave']]);
 assert.equal(h.feedback.textContent,'快速存档已保存');
});

test('a quick save confirmation cannot overwrite a slot changed in another tab',async()=>{
 const pending=pendingConfirmation(),h=harness({stored:{[QUICK]:JSON.stringify(quickRecord)},services:{confirmVN:()=>pending.promise}});
 h.click(h.qsave);const replacement={...quickRecord,at:51};h.storage(QUICK,JSON.stringify(replacement));pending.accept();await h.settle();
 assert.deepEqual(JSON.parse(h.localStorage.getItem(QUICK)),replacement);assert.match(h.feedback.textContent,/其他标签页变化/);
});

test('a quick load confirmation cannot restore a replaced or deleted slot',async()=>{
 for(const replacement of [null,JSON.stringify({...quickRecord,at:51})]){
  const pending=pendingConfirmation(),h=harness({stored:{[QUICK]:JSON.stringify(quickRecord)},services:{confirmVN:()=>pending.promise}});
  h.click(h.qload);h.storage(QUICK,replacement);pending.accept();await h.settle();assert.equal(h.restored.length,0);assert.match(h.feedback.textContent,/其他标签页变化/);
 }
});

test('quick load delegates the accepted snapshot to the same restore path as manual load',async()=>{
 const calls=[],h=harness({stored:{[QUICK]:JSON.stringify(quickRecord)},services:{confirmVN:async(...args)=>{calls.push(args);return true;}}});
 h.click(h.qload);await h.settle();assert.deepEqual(calls,[['读取快速存档？','qload']]);assert.deepEqual(h.restored,[quickRecord]);
});

test('navigation or reader mode during confirmation invalidates the original quick operation',async()=>{
 for(const action of ['qsave','qload'])for(const change of ['navigation','reader']){
  const pending=pendingConfirmation(),h=harness({stored:{[QUICK]:JSON.stringify(quickRecord)},services:{confirmVN:()=>pending.promise}});
  h.click(h[action]);if(change==='reader')h.storage(MODE,'reader');else h.document.dispatchEvent(new FixtureEvent('astro:after-swap'));
  pending.accept();await h.settle();assert.equal(h.restored.length,0);assert.deepEqual(JSON.parse(h.localStorage.getItem(QUICK)),quickRecord);
 }
});

test('modified or already handled clicks never start a quick save operation',async()=>{
 const h=harness();for(const extra of [{defaultPrevented:true},{button:1},{ctrlKey:true},{shiftKey:true}])h.click(h.qsave,extra);
 await h.settle();assert.equal(h.localStorage.getItem(QUICK),null);
});

test('pointer focus never moves the clicked article link, while keyboard focus avoids the dock',()=>{
 const h=harness(),link=new FixtureElement('a',{href:'/'});link.rect={top:650,bottom:694,height:44};h.article.append(link);
 h.document.dispatchEvent(new FixtureEvent('focusin',{target:link}));assert.equal(link.scrollIntoViewCount,0);
 link.focusVisible=true;h.document.dispatchEvent(new FixtureEvent('focusin',{target:link}));assert.equal(link.scrollIntoViewCount,1);
});

test('Reader AUTO uses persisted speed and applies live same-tab and storage changes',()=>{
 const h=harness({stored:{[PLAYBACK_KEY]:JSON.stringify({version:1,autoScrollSpeed:180})}});
 h.click(h.auto);h.frame(100);h.frame(150);assert.equal(h.scrolls.at(-1)[1],9);
 h.storage(PLAYBACK_KEY,JSON.stringify({version:1,autoScrollSpeed:10}));h.frame(200);assert.equal(h.scrolls.at(-1)[1],.5);
 h.localStorage.setItem(PLAYBACK_KEY,JSON.stringify({version:1,autoScrollSpeed:100}));h.document.dispatchEvent(new FixtureEvent('vn:playback-change'));h.frame(250);assert.equal(h.scrolls.at(-1)[1],5);
 h.storage(PLAYBACK_KEY,null);h.frame(300);assert.equal(h.scrolls.at(-1)[1],2.25);
});

test('all local and storage preference paths publish after applying state',()=>{
 const h=harness({modules:['vn-ui']}),observed=[];
 h.document.addEventListener('vn:view-change',()=>observed.push([h.html.dataset.vnMode,h.html.dataset.vnMotion]));
 h.click(h.toggle);h.change(h.gameRadio);h.change(h.reducedRadio);h.storage(MODE,'reader');h.storage(MOTION,'system');h.storage(null,null);h.storage('unrelated','value');
 assert.deepEqual(observed,[['reader','system'],['game','system'],['game','reduced'],['reader','reduced'],['reader','system'],['game','system']]);
 assert.equal(h.toggle.textContent,'阅读模式');assert.equal(h.gameRadio.checked,true);assert.equal(h.systemRadio.checked,true);
});

test('header switch stops live Reader AUTO, closes even held quick menu, and never resumes it',()=>{
 const h=harness();startReader(h);h.click(h.toggle);assert.equal(h.html.dataset.vnMode,'reader');assertStopped(h);
 const count=h.scrolls.length;h.frame(200);h.click(h.toggle);h.frame(250);assert.equal(h.scrolls.length,count);assertStopped(h);
});

test('storage mode switch stops live Reader AUTO and releases dock space',()=>{
 const h=harness();startReader(h);h.storage(MODE,'reader');assertStopped(h);
 const count=h.scrolls.length;h.frame(200);assert.equal(h.scrolls.length,count);assert.equal(h.html.style.getPropertyValue('--vn-dock-space'),'0px');
 h.storage(MODE,'game');h.frame(250);assertStopped(h);assert.equal(h.scrolls.length,count);
});

test('a queued Reader step cannot scroll or reschedule after presentation becomes reader',()=>{
 const h=harness();h.click(h.auto);const queued=[...h.rafs.values()][0];assert.ok(queued);
 h.html.dataset.vnMode='reader';h.rafs.clear();queued(100);assert.equal(h.scrolls.length,0);assert.equal(h.auto.getAttribute('aria-pressed'),'false');assert.equal(h.rafs.size,0);
 h.click(h.auto);assert.equal(h.auto.getAttribute('aria-pressed'),'false','hidden controls must not restart AUTO');assert.equal(h.rafs.size,0);
});

test('same-tab radio and explicit mode link use the same Reader shutdown path',()=>{
 const h=harness();startReader(h);h.change(h.readerRadio);assertStopped(h);h.change(h.gameRadio);
 h.click(h.auto);h.click(h.quickToggle);h.click(h.modeSet);assertStopped(h);assert.equal(h.html.dataset.vnMode,'reader');
});

test('storage view changes relocate open Mascot dialogue without replacing its audio or adding listeners',async()=>{
 const h=harness({modules:['vn-ui','vn-reader-controls','vn-mascot']});await h.settle();h.click(h.launcher);h.frame(2000);await h.settle();
 assert.equal(h.html.hasAttribute('data-vn-mascot-dialogue'),true);assert.equal(h.gameText.textContent,line.text);assert.equal(h.mascotWindow.hidden,true);
 const voiceListeners=h.audio.listenerCount('ended'),viewListeners=h.document.listenerCount('vn:view-change');
 for(let index=0;index<4;index++)h.pageLoad();
 h.storage(MODE,'reader');assert.equal(h.html.hasAttribute('data-vn-mascot-dialogue'),false);assert.equal(h.gameText.hidden,true);assert.equal(h.heading.hidden,false);assert.equal(h.mascotWindow.hidden,false);assert.equal(h.mascotText.textContent,line.text);
 h.storage(MODE,'game');assert.equal(h.html.hasAttribute('data-vn-mascot-dialogue'),true);assert.equal(h.gameText.hidden,false);assert.equal(h.mascotWindow.hidden,true);
 assert.equal(h.document.querySelector('[data-mascot-audio]'),h.audio);assert.equal(h.audio.listenerCount('ended'),voiceListeners);assert.equal(h.document.listenerCount('vn:view-change'),viewListeners);assert.equal(h.document.listenerCount('change'),2,'only UI preferences and Mascot selectors need change listeners');
});

test('storage motion changes finish reveal, cancel motion, and resume one timer pair',async()=>{
 const h=harness({modules:['vn-ui','vn-reader-controls','vn-mascot']});await h.settle();h.click(h.launcher);await h.settle();
 assert.equal(h.gameText.textContent,'');assert.ok(h.rafs.size>0);assert.equal(h.timers.size,2,'one blink and one verified frame timer');
 h.storage(MOTION,'reduced');assert.equal(h.gameText.textContent,line.text);assert.equal(h.timers.size,0);h.frame(2000);assert.equal(h.gameText.textContent,line.text);
 h.storage(MOTION,'system');assert.equal(h.timers.size,2);for(let index=0;index<4;index++)h.pageLoad();assert.equal(h.timers.size,2);
 h.change(h.reducedRadio);assert.equal(h.timers.size,0);h.change(h.systemRadio);assert.equal(h.timers.size,2);
 h.mediaPreference.matches=true;h.mediaPreference.dispatchEvent(new FixtureEvent('change'));assert.equal(h.timers.size,0,'OS reduced motion still takes precedence');
});

test('motion-only notification preserves reveal and reduced motion still advances silent AUTO',async()=>{
 const h=harness({modules:['vn-ui','vn-reader-controls','vn-mascot']});await h.settle();h.click(h.launcher);await h.settle();
 h.change(h.systemRadio);assert.equal(h.gameText.textContent,'','a motion-only event must not relocate or complete the current line');
 h.click(h.auto);assert.equal(h.html.hasAttribute('data-vn-mascot-auto'),true);
 h.storage(MOTION,'reduced');assert.equal(h.gameText.textContent,line.text);assert.equal(h.timers.size,1,'only the pending AUTO advance remains');
 h.fireTimer(700);assert.equal(h.gameText.textContent,nextLine.text);assert.equal(h.html.hasAttribute('data-vn-mascot-auto'),false);
});

test('view relocation completes the current line without stranding silent Mascot AUTO',async()=>{
 const h=harness({modules:['vn-ui','vn-reader-controls','vn-mascot']});await h.settle();h.click(h.launcher);await h.settle();h.click(h.auto);
 h.storage(MODE,'reader');assert.equal(h.mascotText.textContent,line.text);h.fireTimer(700);h.frame(2000);
 assert.equal(h.mascotText.textContent,nextLine.text);assert.equal(h.html.hasAttribute('data-vn-mascot-auto'),false);
});

test('storage clear simultaneously restores default view and motion in an open Mascot',async()=>{
 const h=harness({modules:['vn-ui','vn-reader-controls','vn-mascot'],stored:{[MODE]:'reader',[MOTION]:'reduced'}});await h.settle();h.click(h.launcher);await h.settle();
 assert.equal(h.mascotWindow.hidden,false);assert.equal(h.mascotText.textContent,line.text);assert.equal(h.timers.size,0);
 h.storage(null,null);assert.equal(h.html.dataset.vnMode,'game');assert.equal(h.html.dataset.vnMotion,'system');assert.equal(h.html.hasAttribute('data-vn-mascot-dialogue'),true);assert.equal(h.mascotWindow.hidden,true);assert.equal(h.gameText.textContent,line.text);assert.equal(h.timers.size,2);
});
