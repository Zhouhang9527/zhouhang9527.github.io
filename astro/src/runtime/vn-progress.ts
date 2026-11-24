import {navigate} from 'astro:transitions/client';
import {resolveTitleState,localTitleFrame,resolveMapState,localMapFrame} from '../lib/vn-scenes';

import {KEY,empty,isPath,parse,visit,savePosition,unlockMain,startAfterstory,SAVE_KEY,SAVE_PAGES,SAVE_PAGE_SIZE,parseSaveRecord,parseSaveSlots,validSlot,type SaveRecord,type SaveSlots,type Progress} from '../domain/reading-state';
import {confirmVN} from './vn-confirm';
import {capturePosition,restorePosition} from './vn-reading-position';
let memory=empty(), volatile=false;
function read():Progress{
 if(!volatile){try{memory=parse(localStorage.getItem(KEY));}catch{volatile=true;}}
 return memory;
}
function write(value:Progress){
 memory=value;
 try{localStorage.setItem(KEY,JSON.stringify(value));volatile=false;}catch{volatile=true;}
}
function renderTitle(root:Document=document) {
 const title=root.querySelector<HTMLElement>('[data-vn-title]');
 if(!title)return;
 let paths:string[]=[];
 try{paths=JSON.parse(title.dataset.vnPaths||'[]');}catch{}
 const previous=read(),progress=unlockMain(previous,paths),allowed=new Set(paths);
 if(progress!==previous)write(progress);
 const count=progress.completed.filter(path=>allowed.has(path)).length;
 const state=resolveTitleState(count);
 title.dataset.vnStage=state.id;
 title.dataset.vnCharacterPresent=String(state.present);
 title.dataset.vnExpression=state.expression??'none';
 // All three original images contain the complete composition. Select one
 // frame, never composite a character over the torii or invent a night variant.
 title.dataset.vnFrame=state.frame;
 const original=title.dataset.vnOriginal==='true';
 const art=title.querySelector<HTMLElement>('[data-vn-art]');
 title.dataset.vnFrameRender=original?'original':'fallback';
 if(art){
  if(original)art.style.setProperty('--vn-original-frame',`url('${localTitleFrame(state.frame)}')`);
  else art.style.removeProperty('--vn-original-frame');
 }
 const label=title.querySelector<HTMLElement>('[data-vn-progress]');
 if(label)label.textContent=`阅读记录 ${count} / ${paths.length}`;
 const resume=title.querySelector<HTMLAnchorElement>('[data-vn-continue]');
 const placeholder=title.querySelector<HTMLElement>('[data-vn-no-save]');
 const target=progress.last&&allowed.has(progress.last)?progress.last:null;
 if(resume){resume.hidden=!target;if(target)resume.href=target;}
 if(placeholder)placeholder.hidden=!!target;
 const next=title.querySelector<HTMLAnchorElement>('[data-vn-next]');
 const noNext=title.querySelector<HTMLElement>('[data-vn-no-next]');
 const unlocked=progress.mainCleared;
 title.dataset.vnTitleUnlocked=String(unlocked);
 if(next)next.hidden=!unlocked;
 if(noNext)noNext.hidden=unlocked;
 const extra=title.querySelector<HTMLElement>('[data-vn-extra]'),lockedExtra=title.querySelector<HTMLElement>('[data-vn-no-extra]'),badge=title.querySelector<HTMLElement>('[data-vn-next-new]');
 if(extra)extra.hidden=!unlocked;if(lockedExtra)lockedExtra.hidden=unlocked;
 if(badge)badge.hidden=!unlocked||progress.afterstoryStarted;
}
function renderArticle(recordVisit:boolean) {
 const article=document.querySelector<HTMLElement>('[data-vn-article]');
 const path=article?.dataset.vnArticle;
 if(!isPath(path))return;
 const state=read();
 if(recordVisit)write(visit(state,path,Date.now()));
 const save=article?.querySelector<HTMLButtonElement>('[data-vn-save-position]');if(save)save.hidden=false;
 const bookmark=article?.querySelector<HTMLButtonElement>('[data-vn-bookmark]');
 if(bookmark){bookmark.hidden=false;showBookmark(bookmark,state.bookmarks.includes(path));}
 const button=article?.querySelector<HTMLButtonElement>('[data-vn-mark]');
 if(button){
  const done=state.completed.includes(path);
  button.hidden=false;
  button.setAttribute('aria-pressed',String(done));
  button.textContent=done?'已读 · 取消标记':'标记已读';
 }
}
function showBookmark(button:HTMLButtonElement,on:boolean){
 button.setAttribute('aria-pressed',String(on));button.textContent=on?'已收藏':'收藏';
}
let libraryFilter='manual',libraryPage=0,libraryRoot:HTMLElement|null=null;
const PAGE_SIZE=SAVE_PAGE_SIZE,DRAFT='ginka.vn.manual-draft.v1',RESTORE='ginka.vn.slot-restore.v1';
let draft:SaveRecord|null=null,restoreMemory:SaveRecord|null=null,saveMode=false;
function localSlots():SaveSlots{try{return parseSaveSlots(localStorage.getItem(SAVE_KEY));}catch{return {};}}
function quickRecord():SaveRecord|null{try{return parseSaveRecord(JSON.parse(localStorage.getItem('ginka.vn.quick.v1')||'null'));}catch{return null;}}
function manualFeedback(message:string){const node=document.querySelector<HTMLElement>('[data-vn-manual-feedback]');if(node)node.textContent=message;}
function writeSlots(slots:SaveSlots){try{localStorage.setItem(SAVE_KEY,JSON.stringify({version:1,slots}));return true;}catch{manualFeedback('无法写入本机存档');return false;}}
function loadDraft(){try{draft=parseSaveRecord(JSON.parse(sessionStorage.getItem(DRAFT)||'null'))??draft;}catch{}return draft;}
function clearDraft(){draft=null;try{sessionStorage.removeItem(DRAFT);}catch{}}
export function beginManualSave(article:HTMLElement){
 const path=article.dataset.vnArticle,position=capturePosition(article);if(!isPath(path)||!position)return;
 draft={path,position,title:(article.querySelector('h1')?.textContent?.trim()||'阅读记录').slice(0,1024),at:Date.now()};
 try{sessionStorage.setItem(DRAFT,JSON.stringify(draft));}catch{}
 void navigate('/library/?mode=save');
}
function restoreSave(record:SaveRecord){restoreMemory=record;try{sessionStorage.setItem(RESTORE,JSON.stringify({record,at:Date.now()}));}catch{}void navigate(record.path);}
function consumeSlotRestore(path:string|null){let record=restoreMemory;restoreMemory=null;try{const value=JSON.parse(sessionStorage.getItem(RESTORE)||'null');sessionStorage.removeItem(RESTORE);if(value&&typeof value.at==='number'&&Date.now()-value.at<15000)record=parseSaveRecord(value.record);}catch{}return record&&record.path===path&&!location.hash?record.position:null;}
function renderManual(pages:number){
 const grid=document.querySelector<HTMLElement>('[data-vn-manual-grid]');if(!grid)return;
 const manual=libraryFilter==='manual',quick=libraryFilter==='quick';grid.hidden=!manual&&!quick;if(grid.hidden)return;
 const slots=localSlots(),q=quickRecord();
 for(const [i,node] of Array.from(grid.querySelectorAll<HTMLElement>('[data-vn-manual-slot]')).entries()){
  const index=libraryPage*PAGE_SIZE+i,record=quick?(i===0?q:null):slots[index]??null;
  node.dataset.vnManualSlot=String(index);node.toggleAttribute('data-vn-manual-empty',!record);
  const button=node.querySelector<HTMLButtonElement>('[data-vn-manual-action]'),del=node.querySelector<HTMLButtonElement>('[data-vn-manual-delete]');
  if(button){button.dataset.vnManualAction=String(index);button.disabled=!saveMode&&!record;button.setAttribute('aria-label',(saveMode?'保存到': '读取')+'槽 '+(index+1)+(record?' '+record.title:' No Data'));}
  if(del){del.dataset.vnManualDelete=String(index);del.hidden=!record||quick||saveMode;}
  const title=node.querySelector<HTMLElement>('[data-vn-manual-title]'),date=node.querySelector<HTMLElement>('[data-vn-manual-date]'),status=node.querySelector<HTMLElement>('[data-vn-manual-status]');
  if(title)title.textContent=record?.title||'No Data';if(date)date.textContent=record?new Date(record.at).toLocaleString():'';if(status)status.textContent=record?'阅读进度 '+Math.round(record.position.ratio*100)+'%':'';
 }
 renderPages(pages);
}
function renderPages(pages:number){
 const nav=document.querySelector<HTMLElement>('[data-vn-library-pages]');if(!nav)return;
 nav.hidden=false;nav.querySelectorAll<HTMLButtonElement>('[data-vn-page-step]').forEach(b=>b.disabled=Number(b.dataset.vnPageStep)<0?libraryPage===0:libraryPage===pages-1);
 const numbers=nav.querySelector<HTMLElement>('[data-vn-page-numbers]');if(!numbers)return;
 const first=Math.max(0,Math.min(libraryPage-2,pages-5)),last=Math.min(pages,first+5),existing=Array.from(numbers.querySelectorAll<HTMLButtonElement>('[data-vn-page]'));
 if(existing.length!==last-first||existing[0]?.dataset.vnPage!==String(first)){const fragment=document.createDocumentFragment();for(let p=first;p<last;p++){const b=document.createElement('button');b.type='button';b.dataset.vnPage=String(p);b.setAttribute('aria-label','第 '+(p+1)+' 页');b.textContent=String(p+1);fragment.append(b);}numbers.replaceChildren(fragment);}
 numbers.querySelectorAll<HTMLButtonElement>('[data-vn-page]').forEach(b=>{if(Number(b.dataset.vnPage)===libraryPage)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
}
function renderLibrary(){
 const root=document.querySelector<HTMLElement>('[data-vn-library]');
 if(!root){libraryRoot=null;return;}
 if(libraryRoot!==root){libraryRoot=root;libraryPage=0;libraryFilter='manual';saveMode=new URLSearchParams(location.search).get('mode')==='save'&&!!loadDraft();if(!saveMode)clearDraft();}
 const stage=root.closest<HTMLElement>('[data-vn-screen]');if(stage)stage.dataset.vnSaveMode=String(saveMode);
 const heading=stage?.querySelector<HTMLElement>('#vn-load-title');if(heading)heading.textContent=saveMode?'SAVE':'LOAD';
 const back=stage?.querySelector<HTMLElement>('.vn-load-return'),saveBack=stage?.querySelector<HTMLButtonElement>('[data-vn-save-back]');if(back)back.hidden=saveMode;if(saveBack)saveBack.hidden=!saveMode;
 const state=read();
 const tabs=document.querySelector<HTMLElement>('[data-vn-library-tabs]');
 if(tabs){tabs.hidden=false;tabs.querySelectorAll<HTMLButtonElement>('[data-vn-filter]').forEach(b=>{b.hidden=saveMode&&b.dataset.vnFilter!=='manual';b.setAttribute('aria-pressed',String(b.dataset.vnFilter===libraryFilter));});}
 const manual=libraryFilter==='manual',quick=libraryFilter==='quick';
 root.hidden=manual||quick;const grid=document.querySelector<HTMLElement>('[data-vn-manual-grid]');if(grid)grid.hidden=!root.hidden;
 if(root.hidden){const pages=manual?SAVE_PAGES:1;libraryPage=Math.max(0,Math.min(libraryPage,pages-1));renderManual(pages);return;}
 const slots=Array.from(root.querySelectorAll<HTMLElement>('[data-vn-slot]')).sort((a,b)=>(state.recent[b.dataset.vnSlot||'']||0)-(state.recent[a.dataset.vnSlot||'']||0));
 const matching=slots.filter(slot=>{
  const path=slot.dataset.vnSlot||'';
  return libraryFilter==='bookmarks'?state.bookmarks.includes(path):libraryFilter==='completed'?state.completed.includes(path):!!state.recent[path]||state.last===path;
 });
 const pages=Math.max(1,Math.ceil(matching.length/PAGE_SIZE));
 libraryPage=Math.max(0,Math.min(libraryPage,pages-1));
 const visible=new Set(matching.slice(libraryPage*PAGE_SIZE,(libraryPage+1)*PAGE_SIZE));
 for(const slot of slots){
  const path=slot.dataset.vnSlot||'';
  const done=state.completed.includes(path),saved=state.bookmarks.includes(path),stamp=state.recent[path];
  slot.hidden=!visible.has(slot);
  const date=slot.querySelector<HTMLElement>('[data-vn-slot-date]');
  if(date)date.textContent=stamp?new Date(stamp).toLocaleString():date.dataset.published||'';
  const status=slot.querySelector<HTMLElement>('[data-vn-slot-status]');
  if(status){const pos=state.positions[path];status.textContent=done?'已读':pos?'阅读进度 '+Math.round(pos.ratio*100)+'%':'阅读记录';}
  const button=slot.querySelector<HTMLButtonElement>('[data-vn-bookmark]');
  if(button)showBookmark(button,saved);
 }
 let i=0;
 for(const slot of slots){if(root.children[i]!==slot)root.insertBefore(slot,root.children[i]||null);i++;}
 root.querySelectorAll<HTMLElement>('[data-vn-empty-slot]').forEach((slot,i)=>slot.hidden=i>=PAGE_SIZE-visible.size);
 const empty=document.querySelector<HTMLElement>('[data-vn-library-empty]');
 if(empty){empty.hidden=matching.length>0;empty.textContent=libraryFilter==='bookmarks'?'暂无收藏':libraryFilter==='completed'?'暂无已读记录':'暂无阅读记录';}
 renderPages(pages);
}
function renderChapter(){
 const state=read();
 document.querySelectorAll<HTMLAnchorElement>('[data-vn-post]').forEach(link=>{
  const path=link.getAttribute('href')||'';
  link.dataset.vnRead=String(state.completed.includes(path));
 });
}
function renderMap(){
 const map=document.querySelector<HTMLElement>('[data-vn-map]');if(!map)return;
 let paths:string[]=[];try{paths=JSON.parse(map.dataset.vnPaths||'[]');}catch{}
 const allowed=new Set(paths),count=read().completed.filter(p=>allowed.has(p)).length,state=resolveMapState(count);
 map.dataset.vnMapPhase=state.id;map.dataset.vnMapFrame=state.frame;
 const label=map.querySelector<HTMLElement>('[data-vn-map-count]');if(label)label.textContent='阅读记录 '+count+' / '+paths.length;
 const art=map.querySelector<HTMLElement>('[data-vn-map-art]');
 if(art&&map.dataset.vnMapOriginal==='true'){
  const url=localMapFrame(state.frame);art.style.setProperty('--vn-map-frame',`url('${url}')`);
 }
}
function renderAfterstory(){
 const root=document.querySelector<HTMLElement>('[data-vn-afterstory]');if(!root)return;
 let paths:string[]=[];try{paths=JSON.parse(root.dataset.vnPaths||'[]');}catch{}
 const previous=read(),state=startAfterstory(unlockMain(previous,paths));if(state!==previous)write(state);
 root.querySelectorAll<HTMLElement>('[data-vn-afterstory-content]').forEach(el=>el.hidden=!state.mainCleared);
 root.querySelectorAll<HTMLElement>('[data-vn-afterstory-locked]').forEach(el=>el.hidden=state.mainCleared);
}
function refresh(){renderAfterstory();renderTitle();renderArticle(false);renderLibrary();renderChapter();renderMap();}
const RESUME='ginka.vn.resume.v1';
let current:HTMLElement|null=null, timer=0, dirty=false, pendingResume:string|null=null, restoreFrame=0;
function flush(){
 clearTimeout(timer);timer=0;
 if(!dirty||!current?.isConnected)return;
 dirty=false;
 const path=current.dataset.vnArticle;
 if(!isPath(path))return;
 const position=capturePosition(current);
 if(position)write(savePosition(read(),path,position));
}
function consumeResume(path:string|null){
 let target=pendingResume;pendingResume=null;
 try{
  const stored=JSON.parse(sessionStorage.getItem(RESUME)||'null');
  sessionStorage.removeItem(RESUME);
  if(stored&&typeof stored.at==='number'&&Date.now()-stored.at<15000&&isPath(stored.path))target=stored.path;
 }catch{}
 return !!path&&target===path&&!location.hash;
}
function mount(){
 const next=document.querySelector<HTMLElement>('[data-vn-article]');
 if(next!==current){
  clearTimeout(timer);timer=0;dirty=false;cancelAnimationFrame(restoreFrame);current=next;
  const path=next?.dataset.vnArticle||null;
  const resume=consumeResume(path);
  const slotPosition=consumeSlotRestore(path);
  const position=slotPosition??(path&&resume?read().positions[path]:null);
  renderArticle(true);
  if(next&&position){
   restoreFrame=requestAnimationFrame(()=>{if(current===next&&next.isConnected)restorePosition(next,position);});
  }
 }else{renderArticle(false);}
 renderTitle();renderLibrary();renderChapter();renderMap();renderAfterstory();
}
document.addEventListener('click',event=>{
 if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return;
 const link=(event.target as Element|null)?.closest<HTMLAnchorElement>('a[data-vn-resume]');
 if(!link||link.origin!==location.origin||!isPath(link.pathname)||link.target&&link.target!=='_self')return;
 pendingResume=link.pathname;
 try{sessionStorage.setItem(RESUME,JSON.stringify({path:link.pathname,at:Date.now()}));}catch{}
},true);
window.addEventListener('scroll',()=>{
 if(!current||!current.isConnected)return;
 dirty=true;clearTimeout(timer);timer=window.setTimeout(flush,600);
},{passive:true});
document.addEventListener('astro:before-preparation',()=>{flush();cancelAnimationFrame(restoreFrame);});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush();});
window.addEventListener('pagehide',flush);
document.addEventListener('click',event=>{
 const el=(event.target as Element|null)?.closest<HTMLButtonElement>('[data-vn-mark],[data-vn-bookmark],[data-vn-filter],[data-vn-reset],[data-vn-page],[data-vn-page-step],[data-vn-save-position],[data-vn-manual-action],[data-vn-manual-delete],[data-vn-save-back]');
 if(!el)return;
 if(el.hasAttribute('data-vn-save-back')){const record=draft;if(record){clearDraft();restoreSave(record);}return;}
 if(el.hasAttribute('data-vn-manual-action')||el.hasAttribute('data-vn-manual-delete')){
  const index=Number(el.dataset.vnManualAction??el.dataset.vnManualDelete),owner=libraryRoot;if(!validSlot(index)||!owner)return;
  const quick=libraryFilter==='quick',record=quick?quickRecord():localSlots()[index];
  const remove=el.hasAttribute('data-vn-manual-delete'),saving=saveMode&&!!draft&&!remove;
  if(!record&&!saving)return;
  const message=saving&&record?'覆盖存档 '+(index+1)+'？':remove?'删除存档 '+(index+1)+'？':!saving?'读取存档？':null;
  void (async()=>{if(message&&!await confirmVN(message))return;if(libraryRoot!==owner||!owner.isConnected)return;
   if(saving||remove){const slots=localSlots();if(JSON.stringify(slots[index]??null)!==JSON.stringify(record??null)){manualFeedback('存档已在其他标签页变化，请重新选择');renderLibrary();return;}
    if(remove)delete slots[index];else if(draft)slots[index]={...draft,at:Date.now()};else return;
    if(writeSlots(slots)){renderLibrary();manualFeedback(remove?'存档已删除':'存档已保存');}
   }else if(record)restoreSave(record);
  })();return;
 }
 if(el.hasAttribute('data-vn-save-position')){
  const article=el.closest<HTMLElement>('[data-vn-article]');const path=article?.dataset.vnArticle;
  if(article&&isPath(path)){const position=capturePosition(article);if(position){write(savePosition(visit(read(),path,Date.now()),path,position));const feedback=article.querySelector<HTMLElement>('[data-vn-save-feedback]');if(feedback)feedback.textContent='阅读位置已保存';el.dataset.vnSaved='true';window.setTimeout(()=>delete el.dataset.vnSaved,600);}}
  return;
 }
 if(el.hasAttribute('data-vn-reset')){
  void confirmVN('清除本机全部阅读记录和收藏？').then(ok=>{if(!ok)return;clearTimeout(timer);dirty=false;pendingResume=null;try{sessionStorage.removeItem(RESUME);localStorage.removeItem('ginka.vn.quick.v1');localStorage.removeItem(SAVE_KEY);sessionStorage.removeItem(RESTORE);clearDraft();}catch{}write(empty());refresh();document.dispatchEvent(new Event('vn:progress-reset'));});
  return;
 }
 if(el.dataset.vnFilter){if(saveMode&&el.dataset.vnFilter!=='manual')return;libraryFilter=el.dataset.vnFilter;libraryPage=0;renderLibrary();return;}
 if(el.dataset.vnPage!==undefined||el.dataset.vnPageStep!==undefined){libraryPage=el.dataset.vnPage!==undefined?Number(el.dataset.vnPage):libraryPage+Number(el.dataset.vnPageStep);renderLibrary();return;}
 const path=el.closest<HTMLElement>('[data-vn-slot]')?.dataset.vnSlot||el.closest<HTMLElement>('[data-vn-article]')?.dataset.vnArticle;
 if(!isPath(path))return;
 const state=read();
 if(el.hasAttribute('data-vn-bookmark')){
  const bookmarks=state.bookmarks.includes(path)?state.bookmarks.filter(x=>x!==path):[...state.bookmarks,path];
  write({...state,bookmarks});
 }else{
  const completed=state.completed.includes(path)?state.completed.filter(x=>x!==path):[...state.completed,path];
  write({...state,completed,last:path});
 }
 refresh();
});
document.addEventListener('astro:before-swap',event=>{renderTitle((event as Event & {newDocument:Document}).newDocument);});
document.addEventListener('astro:page-load',mount);
window.addEventListener('storage',event=>{if(event.key===KEY||event.key===null){volatile=false;refresh();}else if(event.key===SAVE_KEY||event.key==='ginka.vn.quick.v1')renderLibrary();});
mount();
