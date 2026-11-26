import {navigate} from 'astro:transitions/client';
import {resolveTitleState,resolveMapState} from '../lib/vn-scenes-runtime';
import {rectStyle,stateStyle} from '../lib/vn-control';
import mainline from '../../config/vn-mainline.json';
const requiredMainline=mainline.routes.map(route=>'/'+route.split('/').map(encodeURIComponent).join('/'));

import {KEY,empty,isPath,parse,visit,savePosition,unlockMain,startAfterstory,readingUnlocks,readingStage,startReadingRun,captureReadingStory,restoreReadingStory,SAVE_KEY,SAVE_PAGES,SAVE_PAGE_SIZE,parseSaveRecord,parseSaveSlots,validSlot,type SaveRecord,type SaveSlots,type Progress,type Position} from '../domain/reading-state';
import {confirmVN} from './vn-confirm';
import {capturePosition,restorePosition} from './vn-reading-position';
let memory=empty(), volatile=false;
function read():Progress{
 if(!volatile){try{memory=parse(localStorage.getItem(KEY));}catch{volatile=true;}}
 return memory;
}
function publishProgress(){document.dispatchEvent(new CustomEvent('vn:progress-change',{detail:readingUnlocks(memory)}));}
function write(value:Progress){
 memory=unlockMain(value,requiredMainline);
 try{localStorage.setItem(KEY,JSON.stringify(memory));volatile=false;}catch{volatile=true;}
 document.documentElement.dataset.vnProgressStorage=volatile?'session-only':'persistent';
 publishProgress();
 return !volatile;
}
function privateFrameUrl(node:HTMLElement,stateId:string){
 const frames=JSON.parse(node.dataset.vnPrivateFrameMap||'{}') as Record<string,string>;
 return frames[stateId]||'';
}
function renderTitle(root:Document=document) {
 const title=root.querySelector<HTMLElement>('[data-vn-title]');
 if(!title)return;
 let paths:string[]=[];
 try{paths=JSON.parse(title.dataset.vnPaths||'[]');}catch{}
 let required:string[]=[];try{required=JSON.parse(title.dataset.vnMainline||'[]');}catch{}
 const previous=read(),progress=unlockMain(previous,required),allowed=new Set(paths);
 if(progress!==previous)write(progress);
 const summary=readingStage(progress,required),count=summary.completed;
 // The untouched blog landing models original hfclear=0/clear=0. Once a
 // reading route has begun, keep the intermediate title frame on return; this
 // is an observed blog mapping, not a claim that browser progress writes sf flags.
 const started=progress.last!==null;
 const state=resolveTitleState(progress.mainCleared?required.length:started?Math.max(1,count):count);
 title.dataset.vnReadingStage=summary.stage;
 title.dataset.vnMenuPhase=progress.mainCleared?'next':started?'main':'first';
 title.dataset.vnStage=state.id;
 title.dataset.vnCharacterPresent=String(state.present);
 title.dataset.vnExpression=state.expression??'none';
 // All three original images contain the complete composition. Select one
 // frame, never composite a character over the torii or invent a night variant.
 title.dataset.vnFrame=state.id;
 const frameUrl=import.meta.env.DEV&&title.dataset.vnOriginal==='true'?privateFrameUrl(title,state.id):'';
  const original=!!frameUrl;
 const art=title.querySelector<HTMLElement>('[data-vn-art]');
 title.dataset.vnFrameRender=original?'original':'unavailable';
 if(art){
  if(original)art.style.setProperty('--vn-original-frame',`url('${frameUrl}')`);
  else art.style.removeProperty('--vn-original-frame');
 }
 const label=title.querySelector<HTMLElement>('[data-vn-progress]');
 if(label)label.textContent=`主线阅读 ${count} / ${required.length}`+(volatile?' · 浏览器存储不可用，本次会话有效':'');
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
const libraryFilters=['manual','quick','recent','bookmarks','completed'] as const;
type LibraryFilter=typeof libraryFilters[number];
const isLibraryFilter=(value:unknown):value is LibraryFilter=>typeof value==='string'&&(libraryFilters as readonly string[]).includes(value);
let libraryFilter:LibraryFilter='manual',libraryPage=0,libraryRoot:HTMLElement|null=null;
const PAGE_SIZE=SAVE_PAGE_SIZE,DRAFT='ginka.vn.manual-draft.v1',RESTORE='ginka.vn.slot-restore.v1';
type PendingRestore={record:SaveRecord;at:number};
let draft:SaveRecord|null=null,restoreMemory:PendingRestore|null=null,saveMode=false;
const QUICK='ginka.vn.quick.v1';
function manualFeedback(message:string){const node=document.querySelector<HTMLElement>('[data-vn-manual-feedback],[data-vn-save-feedback],[data-vn-title-feedback]');if(node){node.hidden=false;node.textContent=message;}}
function localSlots():SaveSlots|null{
 try{
  const raw=localStorage.getItem(SAVE_KEY);if(raw===null)return {};
  const value=JSON.parse(raw);if(!value||value.version!==1||!value.slots||typeof value.slots!=='object'||Array.isArray(value.slots))throw Error('Invalid save slots');
  for(const [key,entry] of Object.entries(value.slots)){if(validSlot(Number(key))&&String(Number(key))===key&&!parseSaveRecord(entry))throw Error('Invalid save record');}
  return parseSaveSlots(raw);
 }catch{manualFeedback('无法读取本机存档，请检查浏览器存储或损坏的数据');return null;}
}
function quickRecord():SaveRecord|null{
 try{const raw=localStorage.getItem(QUICK);if(raw===null)return null;const record=parseSaveRecord(JSON.parse(raw));if(!record)throw Error('Invalid quick save');return record;}
 catch{manualFeedback('无法读取快速存档，请检查浏览器存储或损坏的数据');return null;}
}
function writeSlots(slots:SaveSlots){try{localStorage.setItem(SAVE_KEY,JSON.stringify({version:1,slots}));return true;}catch{manualFeedback('无法写入本机存档');return false;}}
function loadDraft(){try{draft=parseSaveRecord(JSON.parse(sessionStorage.getItem(DRAFT)||'null'))??draft;}catch{}return draft;}
function clearDraft(){draft=null;try{sessionStorage.removeItem(DRAFT);}catch{}}
function matchesPath(expected:string,actual:string){return isPath(expected)&&isPath(actual)&&decodeURIComponent(expected)===decodeURIComponent(actual);}
export function captureSaveRecord(article:HTMLElement):SaveRecord|null{
 const path=article.dataset.vnArticle;
 if(!article.isConnected||article!==document.querySelector('[data-vn-article]')||!isPath(path)||!matchesPath(path,location.pathname))return null;
 const position=capturePosition(article);if(!position)return null;
 return parseSaveRecord({path,position,title:(article.querySelector('h1')?.textContent?.trim()||'阅读记录').slice(0,1024),at:Date.now(),story:captureReadingStory(unlockMain(read(),requiredMainline))});
}
function captureLibraryDraft(article:HTMLElement){
 const record=captureSaveRecord(article);if(!record)return false;draft=record;
 try{sessionStorage.setItem(DRAFT,JSON.stringify(draft));}catch{manualFeedback('浏览器无法暂存；本次保存仅在当前导航会话内可用');}
 return true;
}
export function beginManualSave(article:HTMLElement){if(captureLibraryDraft(article))void navigate('/library/?mode=save');}
export function beginManualLoad(article:HTMLElement){captureLibraryDraft(article);void navigate('/library/');}
function selectLibrary(filter:LibraryFilter,saving=false){
 if(!libraryRoot?.isConnected||saving&&!draft)return;
 if(libraryFilter!==filter)libraryPage=0;
 libraryFilter=filter;saveMode=saving;
 const url=new URL(location.href);if(saveMode)url.searchParams.set('mode','save');else url.searchParams.delete('mode');
 history.replaceState(history.state,'',url);renderLibrary();
}
export async function beginReadingRun(owner:HTMLElement):Promise<boolean>{
 if(!owner.isConnected||owner!==document.querySelector('[data-vn-title]'))return false;
 const route=(state:Progress)=>JSON.stringify([state.completed,state.last,state.positions]),before=route(read());
 if(!await confirmVN('重新开始当前阅读路线？仅清除本轮已读标记、继续位置；永久解锁、历史、收藏、手动档和快速档均保留。'))return false;
 if(!owner.isConnected||owner!==document.querySelector('[data-vn-title]'))return false;
 const state=read();if(route(state)!==before){manualFeedback('阅读路线已在其他标签页变化，请重新选择 START');return false;}
 clearTimeout(timer);dirty=false;pendingResume=null;cancelAnimationFrame(restoreFrame);restoreGeneration++;clearSlotRestore();clearDraft();
 try{sessionStorage.removeItem(RESUME);}catch{}
 const persisted=write(startReadingRun(state));refresh();
 if(!persisted)manualFeedback('当前路线仅在本次会话重开；浏览器拒绝持久化');
 return true;
}
function clearSlotRestore(){restoreMemory=null;try{sessionStorage.removeItem(RESTORE);}catch{}}
function fresh(at:unknown):at is number{return typeof at==='number'&&Number.isFinite(at)&&Date.now()>=at&&Date.now()-at<15000;}
function applySaveStory(record:SaveRecord){
 const state=savePosition(visit(restoreReadingStory(read(),record.story),record.path,Date.now()),record.path,record.position);
 write(state);
}
// true means the validated request was accepted, not that a navigation finished.
export function restoreSave(input:SaveRecord):boolean{
 const record=parseSaveRecord(input);if(!record){manualFeedback('存档已损坏，无法读取');return false;}
 clearTimeout(timer);timer=0;dirty=false;cancelAnimationFrame(restoreFrame);restoreGeneration++;
 pendingResume=null;try{sessionStorage.removeItem(RESUME);}catch{}
 const article=document.querySelector<HTMLElement>('[data-vn-article]');
 if(article?.isConnected&&article.dataset.vnArticle===record.path&&matchesPath(record.path,location.pathname)){
  clearSlotRestore();if(location.hash)history.replaceState(history.state,'',location.pathname+location.search);
  applySaveStory(record);restorePosition(article,record.position);refresh();
  document.dispatchEvent(new Event('vn:save-restored'));
  manualFeedback(volatile?'存档已读取；浏览器无法持久化本次状态':'存档已读取');return true;
 }
 const pending:PendingRestore={record,at:Date.now()};restoreMemory=pending;
 try{sessionStorage.setItem(RESTORE,JSON.stringify(pending));}catch{manualFeedback('浏览器无法暂存恢复请求；将尝试当前导航会话');}
 void navigate(record.path).catch(()=>{if(restoreMemory===pending){clearSlotRestore();manualFeedback('无法打开存档文章，请重试');}});
 return true;
}
function consumeSlotRestore(path:string|null):SaveRecord|null{
 let pending=restoreMemory;
 try{const value=JSON.parse(sessionStorage.getItem(RESTORE)||'null'),record=parseSaveRecord(value?.record);if(!pending&&record&&fresh(value?.at))pending={record,at:value.at};}catch{}
 clearSlotRestore();
 return pending&&fresh(pending.at)&&pending.record.path===path&&!location.hash?pending.record:null;
}
function renderManual(pages:number){
 const grid=document.querySelector<HTMLElement>('[data-vn-manual-grid]');if(!grid)return;
 const manual=libraryFilter==='manual',quick=libraryFilter==='quick';grid.hidden=!manual&&!quick;if(grid.hidden)return;
 const slots=localSlots()??{},q=quick?quickRecord():null;
 for(const [i,node] of Array.from(grid.querySelectorAll<HTMLElement>('[data-vn-manual-slot]')).entries()){
  const index=libraryPage*PAGE_SIZE+i,record=quick?(i===0?q:null):slots[index]??null,number=quick?'Q':String(index+1).padStart(3,'0');
  node.hidden=quick&&i>0;node.dataset.vnManualSlot=String(index);node.toggleAttribute('data-vn-manual-empty',!record);
  const button=node.querySelector<HTMLButtonElement>('[data-vn-manual-action]'),del=node.querySelector<HTMLButtonElement>('[data-vn-manual-delete]');
  if(button){button.dataset.vnManualAction=String(index);button.disabled=!saveMode&&!record;button.setAttribute('aria-label',(saveMode?'保存到': '读取')+(quick?'快速存档':'槽 '+number)+(record?' '+record.title:' No Data'));}
  if(del){del.dataset.vnManualDelete=String(index);del.hidden=!record||saveMode;del.setAttribute('aria-label',quick?'删除快速存档':'删除槽 '+number);}
  const title=node.querySelector<HTMLElement>('[data-vn-manual-title]'),date=node.querySelector<HTMLElement>('[data-vn-manual-date]'),status=node.querySelector<HTMLElement>('[data-vn-manual-status]'),label=node.querySelector<HTMLElement>('[data-vn-manual-number]');
  if(label)label.textContent=number;
  if(title)title.textContent=record?.title||'No Data';if(date)date.textContent=record?new Date(record.at).toLocaleString():'';
  if(status)status.textContent=record?'阅读进度 '+Math.round(record.position.ratio*100)+'%'+(record.story?' · 已读 '+record.story.completed.length+' 篇':' · 旧版位置存档'):'';
  const image=node.querySelector<HTMLImageElement>('img[data-vn-manual-thumbnail]');
  if(image){
   const source=record?Array.from(libraryRoot?.querySelectorAll<HTMLElement>('[data-vn-slot]')??[]).find(slot=>slot.dataset.vnSlot===record.path)?.dataset.vnThumbnail:null;
   let url:URL|null=null;try{if(source)url=new URL(source,location.href);}catch{}
   image.hidden=!url||url.origin!==location.origin;if(image.hidden)image.removeAttribute('src');else if(url)image.src=url.href;
  }
 }
 renderPages(pages);
}
function renderPages(pages:number){
 const nav=document.querySelector<HTMLElement>('[data-vn-library-pages]');if(!nav)return;
 const focused=document.activeElement,hadFocus=!!focused&&nav.contains(focused);
 nav.hidden=libraryFilter==='quick';nav.querySelectorAll<HTMLButtonElement>('[data-vn-page-step]').forEach(b=>b.disabled=Number(b.dataset.vnPageStep)<0?libraryPage===0:libraryPage===pages-1);
 const numbers=nav.querySelector<HTMLElement>('[data-vn-page-numbers]');if(!numbers)return;
 const original=import.meta.env.DEV&&!!nav.closest('[data-vn-ui-original=true]'),full=original&&libraryFilter==='manual'&&matchMedia('(min-width:960px)').matches;
 let privatePageGeometry:{canvas:number[];controls:Record<string,number[]>}={canvas:[0,0,0,0],controls:{}};if(original){try{privatePageGeometry=JSON.parse(nav.dataset.vnPrivatePageGeometry||'{"canvas":[0,0,0,0],"controls":{}}');}catch{}}
  nav.dataset.vnFullPages=String(full);
 const first=full?0:Math.max(0,Math.min(libraryPage-2,pages-5)),last=full?pages:Math.min(pages,first+5),existing=Array.from(numbers.querySelectorAll<HTMLButtonElement>('[data-vn-page]'));
 if(existing.length!==last-first||existing[0]?.dataset.vnPage!==String(first)){const fragment=document.createDocumentFragment();for(let p=first;p<last;p++){const b=document.createElement('button');b.type='button';b.dataset.vnPage=String(p);b.setAttribute('aria-label','第 '+(p+1)+' 页');b.textContent=String(p+1);fragment.append(b);}numbers.replaceChildren(fragment);}
 numbers.querySelectorAll<HTMLButtonElement>('[data-vn-page]').forEach(b=>{
 const page=Number(b.dataset.vnPage),key='page'+(page+1);
 if(page===libraryPage)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
 if(original&&page>=0&&page<SAVE_PAGES){
  const rect=privatePageGeometry.controls[key];
  if(rect)b.style.cssText=rectStyle(rect,[0,0,...privatePageGeometry.canvas])+';'+stateStyle(true,s=>s==='normal'||s==='hover'||s==='selected'?'loadRows-'+key+'-'+s:null);else b.removeAttribute('style');
 }else b.removeAttribute('style');
 });
 if(hadFocus&&!nav.hidden&&(!focused?.isConnected||(focused instanceof HTMLButtonElement&&focused.disabled)))numbers.querySelector<HTMLButtonElement>('[aria-current="page"]')?.focus();
}
function renderLibrary(){
 const root=document.querySelector<HTMLElement>('[data-vn-library]');
 if(!root){if(libraryRoot)clearDraft();libraryRoot=null;return;}
 if(libraryRoot!==root){
  libraryRoot=root;libraryPage=0;libraryFilter='manual';
  const source=loadDraft();
  if(source&&!Array.from(root.querySelectorAll<HTMLElement>('[data-vn-slot]')).some(slot=>slot.dataset.vnSlot===source.path))clearDraft();
  saveMode=new URLSearchParams(location.search).get('mode')==='save'&&!!draft;
 }
 const stage=root.closest<HTMLElement>('[data-vn-screen]');if(stage)stage.dataset.vnSaveMode=String(saveMode);
 if(stage)stage.dataset.vnLibraryFilter=libraryFilter;
 const heading=stage?.querySelector<HTMLElement>('#vn-load-title');if(heading)heading.textContent=saveMode?'SAVE':libraryFilter==='quick'?'Q.LOAD':'LOAD';
 const back=stage?.querySelector<HTMLElement>('.vn-load-return'),saveBack=stage?.querySelector<HTMLButtonElement>('[data-vn-save-back]');if(back)back.hidden=!!draft;if(saveBack)saveBack.hidden=!draft;
 const help=stage?.querySelector<HTMLElement>('[data-vn-library-help]');if(help)help.textContent=saveMode?'选择存档槽，保存当前文章阅读位置':libraryFilter==='quick'?'读取独立的快速存档':'选择存档或阅读索引，恢复阅读位置';
 const state=read();
 const tabs=document.querySelector<HTMLElement>('[data-vn-library-tabs]');
 if(tabs){
  tabs.hidden=false;
  const saveTab=tabs.querySelector<HTMLButtonElement>('[data-vn-save-tab]');if(saveTab){saveTab.disabled=!draft;saveTab.setAttribute('aria-pressed',String(saveMode));}
  tabs.querySelectorAll<HTMLButtonElement>('[data-vn-filter]').forEach(b=>{b.setAttribute('aria-pressed',String(!saveMode&&b.dataset.vnFilter===libraryFilter));});
 }
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
  const done=state.completed.includes(path);link.dataset.vnRead=String(done);
  const label=link.querySelector<HTMLElement>('[data-vn-read-status]');if(label)label.textContent=done?' · 已读':' · 未读';
 });
}
function renderMap(){
 const map=document.querySelector<HTMLElement>('[data-vn-map]');if(!map)return;
 let paths:string[]=[];try{paths=JSON.parse(map.dataset.vnPaths||'[]');}catch{}
 const progress=read(),summary=readingStage(progress,paths),count=summary.completed,state=resolveMapState(progress.mainCleared?paths.length:count);
 map.dataset.vnMapPhase=state.id;map.dataset.vnMapFrame=state.id;map.dataset.vnReadingStage=summary.stage;
 const label=map.querySelector<HTMLElement>('[data-vn-map-count]');if(label)label.textContent='主线阅读 '+count+' / '+paths.length;
 const art=map.querySelector<HTMLElement>('[data-vn-map-art]');
 const mapFrameUrl=import.meta.env.DEV&&map.dataset.vnMapOriginal==='true'?privateFrameUrl(map,state.id):'';
 if(art&&mapFrameUrl){
  art.style.setProperty('--vn-map-frame',`url('${mapFrameUrl}')`);
 }else art?.style.removeProperty('--vn-map-frame');
}
function renderAfterstory(){
 const root=document.querySelector<HTMLElement>('[data-vn-afterstory]');if(!root)return;
 let paths:string[]=[];try{paths=JSON.parse(root.dataset.vnPaths||'[]');}catch{}
 const previous=read(),state=startAfterstory(unlockMain(previous,paths));if(state!==previous)write(state);
 root.querySelectorAll<HTMLElement>('[data-vn-afterstory-content]').forEach(el=>el.hidden=!state.mainCleared);
 root.querySelectorAll<HTMLElement>('[data-vn-afterstory-locked]').forEach(el=>el.hidden=state.mainCleared);
}
function refresh(){const previous=read(),state=unlockMain(previous,requiredMainline);if(state!==previous)write(state);renderAfterstory();renderTitle();renderArticle(false);renderLibrary();renderChapter();renderMap();}
const RESUME='ginka.vn.resume.v1';
let current:HTMLElement|null=null, timer=0, dirty=false, pendingResume:{path:string;at:number}|null=null, restoreFrame=0,restoreGeneration=0;
function queueRestore(owner:HTMLElement,position:Position){
 cancelAnimationFrame(restoreFrame);const generation=++restoreGeneration;
 restoreFrame=requestAnimationFrame(()=>{if(generation===restoreGeneration&&current===owner&&owner.isConnected&&owner===document.querySelector('[data-vn-article]')){restorePosition(owner,position);document.dispatchEvent(new Event('vn:save-restored'));}});
}
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
  if(stored&&fresh(stored.at)&&isPath(stored.path))target={path:stored.path,at:stored.at};
 }catch{}
 return !!path&&!!target&&fresh(target.at)&&target.path===path&&!location.hash;
}
function mount(){
 const next=document.querySelector<HTMLElement>('[data-vn-article]');
 if(next!==current){
  clearTimeout(timer);timer=0;dirty=false;cancelAnimationFrame(restoreFrame);current=next;
  const path=next?.dataset.vnArticle||null;
  const resume=consumeResume(path);
  const slot=consumeSlotRestore(path);
  if(slot)applySaveStory(slot);
  const position=slot?.position??(path&&resume?read().positions[path]:null);
  renderArticle(true);
  if(next&&position){queueRestore(next,position);if(slot)manualFeedback(volatile?'存档已读取；浏览器无法持久化本次状态':'存档已读取');}
 }else{renderArticle(false);if(!next){clearSlotRestore();consumeResume(null);}}
 renderTitle();renderLibrary();renderChapter();renderMap();renderAfterstory();
}
document.addEventListener('click',event=>{
 if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return;
 const target=event.target as Element|null;
 const libraryLink=target?.closest<HTMLAnchorElement>('a[href="/library/"]'),source=libraryLink?.closest<HTMLElement>('[data-vn-article]');
 if(source&&libraryLink?.origin===location.origin&&(!libraryLink.target||libraryLink.target==='_self'))captureLibraryDraft(source);
 const link=target?.closest<HTMLAnchorElement>('a[data-vn-resume]');
 if(!link||link.origin!==location.origin||!isPath(link.pathname)||link.target&&link.target!=='_self')return;
 pendingResume={path:link.pathname,at:Date.now()};
 try{sessionStorage.setItem(RESUME,JSON.stringify(pendingResume));}catch{}
},true);
window.addEventListener('scroll',()=>{
 if(!current||!current.isConnected)return;
 dirty=true;clearTimeout(timer);timer=window.setTimeout(flush,600);
},{passive:true});
document.addEventListener('astro:before-preparation',event=>{flush();cancelAnimationFrame(restoreFrame);restoreGeneration++;const to=(event as Event&{to?:URL}).to;if(restoreMemory&&to?.pathname&&to.pathname!==restoreMemory.record.path)clearSlotRestore();});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush();});
window.addEventListener('pagehide',flush);
document.addEventListener('click',event=>{
 const el=(event.target as Element|null)?.closest<HTMLButtonElement>('[data-vn-mark],[data-vn-bookmark],[data-vn-filter],[data-vn-reset],[data-vn-page],[data-vn-page-step],[data-vn-save-position],[data-vn-manual-action],[data-vn-manual-delete],[data-vn-save-back],[data-vn-save-tab]');
 if(!el||el.disabled)return;
 if(el.hasAttribute('data-vn-save-back')){const record=draft;if(record){clearDraft();restoreSave({...record,story:undefined});}return;}
 if(el.hasAttribute('data-vn-save-tab')){if(!el.disabled)selectLibrary('manual',true);return;}
 if(el.hasAttribute('data-vn-manual-action')||el.hasAttribute('data-vn-manual-delete')){
  const index=Number(el.dataset.vnManualAction??el.dataset.vnManualDelete),owner=libraryRoot;if(!validSlot(index)||!owner)return;
  const filter=libraryFilter,page=libraryPage,quick=filter==='quick',initialSlots=quick?{}:localSlots();if(!initialSlots)return;
  const record=quick?quickRecord():initialSlots[index];
  const remove=el.hasAttribute('data-vn-manual-delete'),snapshot=draft,saving=saveMode&&!!snapshot&&!remove;
  if(!record&&!saving||quick&&index!==0)return;
  const name=quick?'快速存档':'存档 '+String(index+1).padStart(3,'0');
  const message=saving&&record?'覆盖'+name+'？':remove?'删除'+name+'？':!saving?'读取'+name+'？':null;
  const action=saving?'overwrite':remove?'delete':quick?'qload':'load';
  void (async()=>{if(message&&!await confirmVN(message,action))return;if(libraryRoot!==owner||!owner.isConnected||libraryFilter!==filter||libraryPage!==page||saving&&draft!==snapshot)return;
   const slots=quick?{}:localSlots();if(!slots)return;
   const latest=quick?quickRecord():slots[index];
   if(JSON.stringify(latest??null)!==JSON.stringify(record??null)){manualFeedback('存档已在其他标签页变化，请重新选择');renderLibrary();return;}
   if(saving||remove){
    if(quick){try{localStorage.removeItem(QUICK);}catch{manualFeedback('无法删除快速存档');return;}}
    else{if(remove)delete slots[index];else if(snapshot)slots[index]={...snapshot,at:Date.now()};else return;if(!writeSlots(slots))return;}
    renderLibrary();manualFeedback(remove?name+'已删除':name+'已保存');
    if(remove&&el.hidden)document.querySelector<HTMLButtonElement>('[data-vn-filter="'+filter+'"]')?.focus();
   }else if(record){manualFeedback('正在读取'+name);restoreSave(record);}
  })();return;
 }
 if(el.hasAttribute('data-vn-save-position')){
  const article=el.closest<HTMLElement>('[data-vn-article]');const path=article?.dataset.vnArticle;
  if(article&&isPath(path)){const position=capturePosition(article);if(position){write(savePosition(visit(read(),path,Date.now()),path,position));const feedback=article.querySelector<HTMLElement>('[data-vn-save-feedback]');if(feedback)feedback.textContent='阅读位置已保存';el.dataset.vnSaved='true';window.setTimeout(()=>delete el.dataset.vnSaved,600);}}
  return;
 }
 if(el.hasAttribute('data-vn-reset')){
  void confirmVN('清除本机全部阅读路线、永久解锁、收藏、手动存档和快速存档？此操作无法撤销。').then(ok=>{if(!ok||!el.isConnected)return;clearTimeout(timer);dirty=false;pendingResume=null;cancelAnimationFrame(restoreFrame);restoreGeneration++;clearSlotRestore();clearDraft();let failed=false;for(const key of [QUICK,SAVE_KEY]){try{localStorage.removeItem(key);}catch{failed=true;}}try{sessionStorage.removeItem(RESUME);}catch{failed=true;}const persisted=write(empty());refresh();document.dispatchEvent(new Event('vn:progress-reset'));manualFeedback(failed||!persisted?'浏览器拒绝了部分清除操作，请检查本机存储':'本机阅读与存档已清除');});
  return;
 }
 if(isLibraryFilter(el.dataset.vnFilter)){selectLibrary(el.dataset.vnFilter);return;}
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
matchMedia('(min-width:960px)').addEventListener('change',()=>{if(libraryRoot?.isConnected)renderLibrary();});
window.addEventListener('storage',event=>{if(event.key===KEY||event.key===null){volatile=false;refresh();publishProgress();}else if(event.key===SAVE_KEY||event.key===QUICK)renderLibrary();});
if(location.pathname!=='/library/')clearDraft();
mount();
