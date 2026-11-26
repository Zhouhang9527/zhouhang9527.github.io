// A single persistent lifecycle for the VN visual shell. Native links remain links.
import {KEY as PROGRESS_KEY,parse} from '../domain/reading-state';
const KEY='ginka.vn.motion.v1',VIEW_KEY='ginka.vn.mode.v1';
let view:'game'|'reader'='game';
let mode:'system'|'reduced'='system';
function load(){try{mode=localStorage.getItem(KEY)==='reduced'?'reduced':'system';view=localStorage.getItem(VIEW_KEY)==='reader'?'reader':'game';}catch{}}
function apply(root:Document=document){root.documentElement.dataset.vnMotion=mode;root.documentElement.dataset.vnMode=view;}
function mount(){
 apply();
 const config=document.querySelector<HTMLElement>('[data-vn-config]');
 if(config){config.hidden=false;config.querySelectorAll<HTMLInputElement>('input[name="vn-motion"]').forEach(el=>el.checked=el.value===mode);config.querySelectorAll<HTMLInputElement>('input[name="vn-mode"]').forEach(el=>el.checked=el.value===view);}
 document.querySelectorAll<HTMLButtonElement>('[data-vn-mode-toggle]').forEach(el=>{el.hidden=false;el.textContent=view==='game'?'阅读模式':'游戏模式';el.setAttribute('aria-label',view==='game'?'切换到阅读模式':'切换到游戏模式');});
}
// Notify consumers only after both DOM preferences and controls are current.
function publish(){mount();document.dispatchEvent(new Event('vn:view-change'));}
function setView(value:'game'|'reader'){
 view=value;try{localStorage.setItem(VIEW_KEY,view);}catch{}publish();
}
load();mount();
document.addEventListener('click',event=>{
 if(event.defaultPrevented||event.button!==0||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
 const target=(event.target as Element|null)?.closest<HTMLElement>('[data-vn-mode-set],[data-vn-mode-toggle]');
 if(!target)return;
 if(target.hasAttribute('data-vn-mode-toggle')){
  setView(view==='game'?'reader':'game');
  if(location.pathname==='/'){window.scrollTo({top:0,behavior:'instant'});const next=document.querySelector<HTMLElement>(view==='game'?'[data-vn-start]':'#main-content');next?.focus({preventScroll:true});}
 }else{setView(target.dataset.vnModeSet==='reader'?'reader':'game');}
},true);
document.addEventListener('change',event=>{
 const input=event.target;
 if(!(input instanceof HTMLInputElement))return;
 if(input.name==='vn-mode'){setView(input.value==='reader'?'reader':'game');return;}
 if(input.name!=='vn-motion')return;
 mode=input.value==='reduced'?'reduced':'system';
 try{localStorage.setItem(KEY,mode);}catch{}
 publish();
});
document.addEventListener('astro:before-swap',event=>apply((event as Event & {newDocument:Document}).newDocument));
document.addEventListener('astro:page-load',mount);
window.addEventListener('storage',event=>{if(event.key===KEY||event.key===VIEW_KEY||event.key===null){load();publish();}});
document.addEventListener('keydown',event=>{
 if(event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
 if(!['ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
 const target=event.target;
 if(!(target instanceof HTMLElement))return;
 const group=target.closest('.vn-menu,.vn-choices');
 if(!group)return;
 const items=Array.from(group.querySelectorAll<HTMLElement>('a[href],button:not([disabled])')).filter(el=>!el.closest('[hidden]'));
 const i=items.indexOf(target);if(i<0||!items.length)return;
 const next=event.key==='Home'?0:event.key==='End'?items.length-1:(i+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;
 event.preventDefault();items[next].focus();
});

function fullscreenState(){
 document.querySelectorAll<HTMLButtonElement>('[data-vn-fullscreen]').forEach(button=>{
  button.hidden=!document.fullscreenEnabled;button.textContent=document.fullscreenElement?'退出全屏':'全屏';button.setAttribute('aria-pressed',String(!!document.fullscreenElement));
 });
}
export async function setVNFullscreen(full:boolean):Promise<boolean>{
 const status=document.querySelector<HTMLElement>('[data-vn-display-feedback]');
 try{
  if(full&&!document.fullscreenEnabled)throw Error('Fullscreen unavailable');
  if(full&&!document.fullscreenElement)await document.documentElement.requestFullscreen();
  else if(!full&&document.fullscreenElement)await document.exitFullscreen();
  if(status)status.textContent=full?'已进入全屏':'已退出全屏';fullscreenState();return true;
 }catch{if(status)status.textContent='浏览器未允许全屏；可以重试或使用窗口模式';fullscreenState();return false;}
}
document.addEventListener('fullscreenchange',fullscreenState);
document.addEventListener('astro:page-load',fullscreenState);
document.addEventListener('click',event=>{
 const button=(event.target as Element|null)?.closest('[data-vn-fullscreen]');
 if(button)void setVNFullscreen(!document.fullscreenElement);
});
fullscreenState();

// EXTRA uses the same blog mainline unlock as the title menu, not guessed CG flags.
// This is a local presentation preference, never an access-control boundary.
function readGalleryUnlock(){try{return parse(localStorage.getItem(PROGRESS_KEY)).mainCleared;}catch{return false;}}
let galleryUnlocked=readGalleryUnlock();
function renderGallery(){
 const root=document.querySelector<HTMLElement>('[data-vn-gallery]');if(!root)return;
 root.dataset.vnGalleryUnlocked=String(galleryUnlocked);
 root.querySelectorAll<HTMLElement>('[data-vn-gallery-locked]').forEach(node=>node.hidden=galleryUnlocked);
 root.querySelectorAll<HTMLElement>('[data-vn-gallery-content]').forEach(node=>node.hidden=!galleryUnlocked);
 if(galleryUnlocked)root.querySelectorAll<HTMLImageElement>('img[data-vn-gallery-src]').forEach(image=>{if(!image.hasAttribute('src'))image.src=image.dataset.vnGallerySrc||'';});
 if(!galleryUnlocked){const modal=document.querySelector<HTMLDialogElement>('.astro-gallery[open]');modal?.close();}
}
document.addEventListener('astro:page-load',renderGallery);
document.addEventListener('vn:progress-change',event=>{const state=(event as CustomEvent<{mainCleared?:boolean}>).detail;galleryUnlocked=typeof state?.mainCleared==='boolean'?state.mainCleared:readGalleryUnlock();renderGallery();});
document.addEventListener('vn:progress-reset',()=>{galleryUnlocked=false;renderGallery();});
window.addEventListener('storage',event=>{if(event.key===PROGRESS_KEY||event.key===null){galleryUnlocked=readGalleryUnlock();renderGallery();}});
renderGallery();

