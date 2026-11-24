// A single persistent lifecycle for the VN visual shell. Native links remain links.
const KEY='ginka.vn.motion.v1';
let mode:'system'|'reduced'='system';
function load(){try{mode=localStorage.getItem(KEY)==='reduced'?'reduced':'system';}catch{}}
function apply(root:Document=document){root.documentElement.dataset.vnMotion=mode;}
function mount(){
 apply();
 const config=document.querySelector<HTMLElement>('[data-vn-config]');
 if(config){config.hidden=false;config.querySelectorAll<HTMLInputElement>('input[name="vn-motion"]').forEach(el=>el.checked=el.value===mode);}
}
load();mount();
document.addEventListener('change',event=>{
 const input=event.target;
 if(!(input instanceof HTMLInputElement)||input.name!=='vn-motion')return;
 mode=input.value==='reduced'?'reduced':'system';
 try{localStorage.setItem(KEY,mode);}catch{}
 mount();
});
document.addEventListener('astro:before-swap',event=>apply((event as Event & {newDocument:Document}).newDocument));
document.addEventListener('astro:page-load',mount);
window.addEventListener('storage',event=>{if(event.key===KEY||event.key===null){load();mount();}});
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
