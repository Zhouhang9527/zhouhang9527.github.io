import {vnScenes} from '../lib/vn-scenes';
const timing=vnScenes.motion.title;
let seen=false,active:HTMLElement|null=null,timer=0;
function finish(){clearTimeout(timer);if(active){delete active.dataset.vnTitleIntro;active=null;}}
function prepare(root:Document=document){
 const title=root.querySelector<HTMLElement>('[data-vn-title][data-vn-original=true]');if(!title||title===active)return;
 finish();
 const restored=seen;seen=true;
 if(root.documentElement.dataset.vnMotion==='reduced'||root.documentElement.dataset.vnMode==='reader'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 title.style.setProperty('--vn-title-bg-ms',timing.backgroundMs+'ms');
 title.style.setProperty('--vn-title-logo-ms',timing.logoMs+'ms');
 title.style.setProperty('--vn-title-menu-ms',timing.menuMs+'ms');
 title.style.setProperty('--vn-title-menu-delay',timing.backgroundMs+timing.logoMs+timing.holdMs+'ms');
 title.style.setProperty('--vn-title-restore-ms',timing.restoreMs+'ms');
 title.dataset.vnTitleIntro=restored?'restore':'fresh';active=title;
 timer=window.setTimeout(finish,restored?timing.restoreMs:timing.backgroundMs+timing.logoMs+timing.holdMs+timing.menuMs);
}
document.addEventListener('astro:before-swap',event=>prepare((event as Event&{newDocument:Document}).newDocument));
document.addEventListener('astro:before-preparation',finish);
document.addEventListener('pointerdown',event=>{if(active?.contains(event.target as Node))finish();},true);
document.addEventListener('focusin',event=>{if(active?.contains(event.target as Node))finish();});
document.addEventListener('keydown',event=>{if(active&&event.key==='Escape')finish();});
window.addEventListener('pagehide',finish);
prepare();
export {};
