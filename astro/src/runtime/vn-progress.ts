import {resolveTitleState} from '../lib/vn-scenes';

const KEY='ginka.vn.progress.v1';
type Progress={version:1;completed:string[];last:string|null};
const empty=():Progress=>({version:1,completed:[],last:null});
const isPath=(value:unknown):value is string=>typeof value==='string'&&/^\/20\d{2}\/\d{2}\/\d{2}\/[^?#]+\/$/.test(value)&&!value.includes('\\');
let memory=empty();
function parse(raw:string|null):Progress {
 try {
  const value=JSON.parse(raw||'null');
  if(value?.version!==1||!Array.isArray(value.completed))return empty();
  return {version:1,completed:Array.from(new Set<string>(value.completed.filter(isPath))),last:isPath(value.last)?value.last:null};
 } catch {return empty();}
}
function read():Progress {
 try {memory=parse(localStorage.getItem(KEY));} catch {}
 return memory;
}
function write(value:Progress) {
 memory=value;
 try{localStorage.setItem(KEY,JSON.stringify(value));}catch{}
}
function renderTitle(root:Document=document) {
 const title=root.querySelector<HTMLElement>('[data-vn-title]');
 if(!title)return;
 let paths:string[]=[];
 try{paths=JSON.parse(title.dataset.vnPaths||'[]');}catch{}
 const progress=read(),allowed=new Set(paths);
 const count=progress.completed.filter(path=>allowed.has(path)).length;
 const state=resolveTitleState(count);
 title.dataset.vnStage=state.id;
 title.dataset.vnCharacterPresent=String(state.present);
 title.dataset.vnExpression=state.expression??'none';
 const character=title.querySelector<HTMLImageElement>('[data-vn-character-art]');
 // A missing verified character difference must never substitute another location
 // or unrelated story illustration. Keep the fixed torii composition.
 const src=state.present?state.asset?.src:null;
 title.dataset.vnCharacterRender=src?'asset':state.present?'unavailable':'none';
 if(character){
  if(src){
   if(character.getAttribute('src')!==src)character.setAttribute('src',src);
   character.hidden=false;
  }else{
   character.hidden=true;
   character.removeAttribute('src');
  }
 }
 const label=title.querySelector<HTMLElement>('[data-vn-progress]');
 if(label)label.textContent=`阅读记录 ${count} / ${paths.length}`;
 const resume=title.querySelector<HTMLAnchorElement>('[data-vn-continue]');
 const placeholder=title.querySelector<HTMLElement>('[data-vn-no-save]');
 const target=progress.last&&allowed.has(progress.last)?progress.last:null;
 if(resume){resume.hidden=!target;if(target)resume.href=target;}
 if(placeholder)placeholder.hidden=!!target;
}
function renderArticle(recordVisit:boolean) {
 const article=document.querySelector<HTMLElement>('[data-vn-article]');
 const path=article?.dataset.vnArticle;
 if(!isPath(path))return;
 const state=read();
 if(recordVisit&&state.last!==path)write({...state,last:path});
 const button=article?.querySelector<HTMLButtonElement>('[data-vn-mark]');
 if(button){
  const done=state.completed.includes(path);
  button.hidden=false;
  button.setAttribute('aria-pressed',String(done));
  button.textContent=done?'已读 · 取消标记':'标记已读';
 }
}
function mount(){renderTitle();renderArticle(true);}
document.addEventListener('click',event=>{
 const button=(event.target as Element|null)?.closest<HTMLButtonElement>('[data-vn-mark]');
 if(!button)return;
 const path=button.closest<HTMLElement>('[data-vn-article]')?.dataset.vnArticle;
 if(!isPath(path))return;
 const state=read();
 const completed=state.completed.includes(path)?state.completed.filter(x=>x!==path):[...state.completed,path];
 write({...state,completed,last:path});renderArticle(false);
});
document.addEventListener('astro:before-swap',event=>{renderTitle((event as Event & {newDocument:Document}).newDocument);});
document.addEventListener('astro:page-load',mount);
window.addEventListener('storage',event=>{if(event.key===KEY||event.key===null){renderTitle();renderArticle(false);}});
mount();
