// A single persistent lifecycle for the VN visual shell. Native links remain links.
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
function setView(value:'game'|'reader'){
 view=value;try{localStorage.setItem(VIEW_KEY,view);}catch{}mount();
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
 mount();
});
document.addEventListener('astro:before-swap',event=>apply((event as Event & {newDocument:Document}).newDocument));
document.addEventListener('astro:page-load',mount);
window.addEventListener('storage',event=>{if(event.key===KEY||event.key===VIEW_KEY||event.key===null){load();mount();}});
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
 const button=document.querySelector<HTMLButtonElement>('[data-vn-fullscreen]');
 if(button){button.hidden=!document.fullscreenEnabled;button.textContent=document.fullscreenElement?'退出全屏':'全屏';}
}
document.addEventListener('fullscreenchange',fullscreenState);
document.addEventListener('astro:page-load',fullscreenState);
document.addEventListener('click',event=>{
 const button=(event.target as Element|null)?.closest('[data-vn-fullscreen]');
 if(!button)return;
 if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});
 else if(document.fullscreenEnabled)void document.documentElement.requestFullscreen().catch(()=>{});
});
fullscreenState();

export {};

document.addEventListener('click',event=>{
 const button=(event.target as Element|null)?.closest<HTMLButtonElement>('[data-vn-log-scroll]');
 if(!button)return;
 const log=button.closest<HTMLElement>('[data-vn-backlog]');if(!log)return;
 const bounds=log.getBoundingClientRect(),offset=scrollY;
 const top=offset+bounds.top,bottom=offset+bounds.bottom-innerHeight;
 const target=Math.max(top,Math.min(Math.max(top,bottom),offset+(button.dataset.vnLogScroll==='up'?-1:1)*innerHeight*.8));
 window.scrollTo({top:target,behavior:mode==='reduced'||matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
});
