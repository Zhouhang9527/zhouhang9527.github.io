import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
import * as domain from '../src/domain/reading-state.ts';
import mainline from '../config/vn-mainline.json' with {type:'json'};
import {resolveTitleState,resolveMapState} from '../src/lib/vn-scenes-runtime.ts';

// Execute the complete production runtime, with imported navigation/geometry and
// DOM boundaries instrumented. These are reducer/lifecycle tests, not a browser.
const source=stripTypeScriptTypes(readFileSync(new URL('../src/runtime/vn-progress.ts',import.meta.url),'utf8')
 .replace(/^import .*\r?\n/gm,'').replaceAll('import.meta.env.DEV','false').replace(/\bexport /g,''));
const path='/2026/11/24/article/',second='/2026/11/24/second/';
const position={ratio:.4,section:.4,heading:null};
const record={path,title:'A',at:1,position,story:{completed:[],mainCleared:false,afterstoryStarted:false}};
class Hub{
 listeners=new Map();
 addEventListener(type,fn){this.listeners.set(type,[...(this.listeners.get(type)||[]),fn]);}
 dispatchEvent(event){event.target??=this;for(const fn of this.listeners.get(event.type)||[])fn(event);return !event.defaultPrevented;}
}
class Event{constructor(type,opts={}){Object.assign(this,{type,defaultPrevented:false,button:0},opts);}preventDefault(){this.defaultPrevented=true;}}
const dataKey=name=>name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
class Element extends Hub{
 constructor(tag='div',attrs={}){super();this.tagName=tag.toUpperCase();this.dataset={};this.attrs=new Map();this.children=[];this.parentElement=null;this.hidden=false;this.disabled=false;this.textContent='';this.style={setProperty(){},removeProperty(){}};for(const [k,v] of Object.entries(attrs))this.setAttribute(k,v);}
 setAttribute(name,value){this.attrs.set(name,String(value));if(name.startsWith('data-'))this.dataset[dataKey(name)]=String(value);}
 getAttribute(name){return name.startsWith('data-')?this.dataset[dataKey(name)]??null:this.attrs.get(name)??null;}
 hasAttribute(name){return this.getAttribute(name)!==null;}
 removeAttribute(name){this.attrs.delete(name);if(name.startsWith('data-'))delete this.dataset[dataKey(name)];}
 toggleAttribute(name,yes){if(yes)this.setAttribute(name,'');else this.removeAttribute(name);}
 matches(query){return query.split(',').some(part=>{let s=part.trim();for(const [,k,v] of s.matchAll(/\[([\w-]+)(?:=["']?([^\]"']*)["']?)?\]/g))if(!this.hasAttribute(k)||v!==undefined&&this.getAttribute(k)!==v)return false;s=s.replace(/\[[^\]]+\]/g,'');const cl=s.match(/\.([\w-]+)/);if(cl&&!(this.getAttribute('class')||'').split(' ').includes(cl[1]))return false;s=s.replace(/\.[\w-]+/g,'');return !s||this.tagName===s.toUpperCase();});}
 append(...nodes){for(const node of nodes){node.parentElement=this;this.children.push(node);}}
 replaceChildren(...nodes){for(const node of this.children)node.parentElement=null;this.children=[];this.append(...nodes);}
 querySelectorAll(query){return this.children.flatMap(node=>[...(node.matches(query)?[node]:[]),...node.querySelectorAll(query)]);}
 querySelector(query){return this.querySelectorAll(query)[0]??null;}
 closest(query){for(let node=this;node;node=node.parentElement)if(node.matches(query))return node;return null;}
 contains(node){return node===this||this.children.some(child=>child.contains(node));}
 get isConnected(){return this.connectedRoot===true||!!this.parentElement?.isConnected;}
 focus(){}
}
function storage(initial={},blocked=false){const map=new Map(Object.entries(initial));return {map,getItem(key){if(blocked)throw Error('denied');return map.get(key)??null;},setItem(key,value){if(blocked)throw Error('denied');map.set(key,String(value));},removeItem(key){if(blocked)throw Error('denied');map.delete(key);}};}
function harness({kind='article',stored={},session={},pathname=path,blocked=false,confirm=async()=>true}={}){
 const document=new Hub(),window=new Hub(),html=new Element('html');html.connectedRoot=true;document.documentElement=html;document.hidden=false;
 document.querySelector=s=>html.querySelector(s);document.querySelectorAll=s=>html.querySelectorAll(s);document.activeElement=html;
 const localStorage=storage(stored,blocked),sessionStorage=storage(session),location=new URL('http://127.0.0.1:4321'+pathname),navigations=[],restores=[],rafs=new Map(),timers=new Map(),events=[];let id=0;
 const add=(tag,attrs,parent=html)=>{const node=new Element(tag,attrs);parent.append(node);return node;};
 let article,title;
 const install=(nextKind,nextPath=location.pathname)=>{
  html.replaceChildren();location.pathname=nextPath;location.hash='';article=title=null;
  if(nextKind==='article'){
   article=add('article',{'data-vn-article':nextPath});add('h1',{},article).textContent='A';
   add('button',{'data-vn-mark':''},article);add('button',{'data-vn-save-position':''},article);add('span',{'data-vn-save-feedback':''},article);
  }else if(nextKind==='title'){
   title=add('section',{'data-vn-title':'','data-vn-paths':JSON.stringify([path,second]),'data-vn-mainline':JSON.stringify(mainline.routes.map(route=>'/'+route.split('/').map(encodeURIComponent).join('/')))});
   for(const attr of ['progress','continue','no-save','next','no-next','extra','no-extra','next-new','title-feedback'])add(attr==='continue'?'a':'span',{['data-vn-'+attr]:''},title);
  }else if(nextKind==='afterstory'){
   const root=add('div',{'data-vn-afterstory':'','data-vn-paths':JSON.stringify(mainline.routes.map(route=>'/'+route.split('/').map(encodeURIComponent).join('/')))});
   add('section',{'data-vn-afterstory-content':''},root);add('section',{'data-vn-afterstory-locked':''},root);
  }
 };
 install(kind);
 const raf=fn=>{const key=++id;rafs.set(key,fn);return key;},cancel=key=>rafs.delete(key);
 Object.assign(window,{setTimeout:(fn)=>{const key=++id;timers.set(key,fn);return key;},clearTimeout:key=>timers.delete(key)});
 const context=vm.createContext({...domain,mainline,resolveTitleState,resolveMapState,rectStyle(){return '';},stateStyle(){return '';},
  document,window,location,URL,history:{state:null,replaceState(_s,_t,url){const next=new URL(url,location);location.href=next.href;}},
  localStorage,sessionStorage,Element,HTMLElement:Element,HTMLButtonElement:Element,Event,CustomEvent:Event,
  requestAnimationFrame:raf,cancelAnimationFrame:cancel,setTimeout:window.setTimeout,clearTimeout:window.clearTimeout,
  matchMedia:()=>({matches:false,addEventListener(){}}),confirmVN:confirm,
  capturePosition:()=>({...position}),restorePosition:(owner,pos)=>restores.push({owner,position:pos}),navigate:url=>{navigations.push(url);return Promise.resolve();},
 });
 document.addEventListener('vn:progress-change',event=>events.push(event.detail));
 vm.runInContext(source+'\n;globalThis.api={captureSaveRecord,restoreSave,beginReadingRun,refresh,read,write};',context);
 return {api:context.api,document,window,html,localStorage,sessionStorage,location,navigations,restores,rafs,events,
  get article(){return article;},get title(){return title;},install,
  mount(){document.dispatchEvent(new Event('astro:page-load'));},
  prepare(to=second){document.dispatchEvent(new Event('astro:before-preparation',{to:new URL(to,location)}));},
  state(){return JSON.parse(localStorage.getItem(domain.KEY));},
  frame(){for(const [key,fn] of [...rafs]){rafs.delete(key);fn();}},
  storage(state){localStorage.setItem(domain.KEY,JSON.stringify(state));window.dispatchEvent(new Event('storage',{key:domain.KEY}));},
 };
}
const plain=value=>JSON.parse(JSON.stringify(value));
test('capture validates active owner and canonical article path; story is a copied snapshot',()=>{
 const h=harness({stored:{[domain.KEY]:JSON.stringify({...domain.empty(),completed:[path]})}});
 const captured=h.api.captureSaveRecord(h.article);assert.deepEqual(plain(captured.story.completed),[path]);
 assert.deepEqual(plain(captured.position),position);
 assert.equal(h.api.captureSaveRecord(new Element('article',{'data-vn-article':path})),null);
 h.article.dataset.vnArticle=second;assert.equal(h.api.captureSaveRecord(h.article),null);
});
test('same-page LOAD restores completion/position without navigation or revoking global unlocks',()=>{
 const progress={...domain.empty(),completed:[path],mainCleared:true,afterstoryStarted:true,bookmarks:[path]};
 const h=harness({stored:{[domain.KEY]:JSON.stringify(progress)}});
 assert.equal(h.api.restoreSave(record),true);assert.deepEqual(h.navigations,[]);
 assert.deepEqual(h.state().completed,[]);assert.deepEqual(h.state().bookmarks,[path]);
 assert.equal(h.state().mainCleared,true);assert.equal(h.state().afterstoryStarted,true);
 assert.deepEqual(plain(h.restores[0].position),position);assert.equal(h.restores[0].owner,h.article);
 assert.deepEqual(plain(h.events.at(-1)),{mainCleared:true,afterstoryStarted:true});
});
test('legacy position-only LOAD preserves current story and malformed story is rejected',()=>{
 const h=harness({stored:{[domain.KEY]:JSON.stringify({...domain.empty(),completed:[path]})}});
 assert.equal(h.api.restoreSave({...record,story:undefined}),true);assert.deepEqual(h.state().completed,[path]);
 const before=JSON.stringify(h.state());assert.equal(h.api.restoreSave({...record,story:{}}),false);assert.equal(JSON.stringify(h.state()),before);
});
test('cross-page LOAD applies only at matching target and cancels stale captured-owner RAF',()=>{
 const h=harness({kind:'title',pathname:'/'});assert.equal(h.api.restoreSave(record),true);
 assert.deepEqual(h.navigations,[path]);assert.ok(h.sessionStorage.getItem('ginka.vn.slot-restore.v1'));
 h.prepare(path);h.install('article',path);h.mount();assert.deepEqual(h.state().completed,[]);
 const queued=[...h.rafs.values()][0];assert.ok(queued);
 h.prepare(second);h.install('article',second);h.mount();queued();assert.deepEqual(h.restores,[]);
 assert.equal(h.sessionStorage.getItem('ginka.vn.slot-restore.v1'),null);
});
test('a fresh cross-document envelope restores, while expired/future/mismatched envelopes do not',()=>{
 for(const [at,target,expected] of [[Date.now(),path,true],[Date.now()-20000,path,false],[Date.now()+60000,path,false],[Date.now(),second,false]]){
  const h=harness({session:{'ginka.vn.slot-restore.v1':JSON.stringify({record,at})},pathname:target});h.frame();
  assert.equal(h.restores.length,expected?1:0);assert.equal(h.sessionStorage.getItem('ginka.vn.slot-restore.v1'),null);
 }
});
test('NEW GAME confirms route reset and preserves manual/quick data, unlocks and history',async()=>{
 const progress={...domain.empty(),completed:[path],last:path,recent:{[path]:123},positions:{[path]:position},bookmarks:[path],mainCleared:true,afterstoryStarted:true};
 const saved='unchanged';const h=harness({kind:'title',pathname:'/',stored:{[domain.KEY]:JSON.stringify(progress),[domain.SAVE_KEY]:saved,'ginka.vn.quick.v1':saved}});
 assert.equal(await h.api.beginReadingRun(h.title),true);
 assert.deepEqual(h.state(),{...progress,completed:[],last:null,positions:{}});
 assert.equal(h.localStorage.getItem(domain.SAVE_KEY),saved);assert.equal(h.localStorage.getItem('ginka.vn.quick.v1'),saved);
 assert.equal(h.title.dataset.vnFrame,'familiar');assert.equal(h.title.querySelector('[data-vn-continue]').hidden,true);
 assert.equal(h.title.querySelector('[data-vn-next]').hidden,false);assert.equal(h.title.querySelector('[data-vn-next-new]').hidden,true);
});
test('NEW GAME cancellation, navigation and concurrent route edits cannot reset a newer route',async()=>{
 const progress={...domain.empty(),completed:[path],last:path};
 const canceled=harness({kind:'title',pathname:'/',stored:{[domain.KEY]:JSON.stringify(progress)},confirm:async()=>false});
 assert.equal(await canceled.api.beginReadingRun(canceled.title),false);assert.deepEqual(canceled.state(),progress);
 for(const kind of ['navigation','storage']){
  let resolve;const h=harness({kind:'title',pathname:'/',stored:{[domain.KEY]:JSON.stringify(progress)},confirm:()=>new Promise(fn=>resolve=fn)});
  const pending=h.api.beginReadingRun(h.title);
  if(kind==='navigation')h.install('article',path);else h.storage({...progress,completed:[second]});
  resolve(true);assert.equal(await pending,false);assert.notDeepEqual(h.state().completed,[]);
 }
});
test('direct locked afterstory never sets NEW marker consumed; storage unlock is published then entry is consumed',()=>{
 const h=harness({kind:'afterstory',pathname:'/afterstory/'});assert.equal(h.api.read().afterstoryStarted,false);
 assert.equal(h.html.querySelector('[data-vn-afterstory-content]').hidden,true);
 h.storage({...domain.empty(),mainCleared:true});assert.equal(h.state().afterstoryStarted,true);
 assert.equal(h.html.querySelector('[data-vn-afterstory-content]').hidden,false);
 assert.deepEqual(plain(h.events.at(-1)),{mainCleared:true,afterstoryStarted:true});
});
test('storage denial preserves volatile story and reports session-only instead of pretending persistence',()=>{
 const h=harness({blocked:true});assert.equal(h.api.restoreSave({...record,story:{...record.story,mainCleared:true}}),true);
 assert.equal(h.api.read().mainCleared,true);assert.equal(h.html.dataset.vnProgressStorage,'session-only');
 assert.match(h.article.querySelector('[data-vn-save-feedback]').textContent,/无法持久化/);
});
