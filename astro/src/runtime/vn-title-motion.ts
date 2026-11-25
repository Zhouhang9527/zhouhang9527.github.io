import {navigate} from 'astro:transitions/client';
import {runtimeScenes} from '../lib/vn-scenes-runtime';
let timing=runtimeScenes.motion.title;
function timingFor(root:Document){
 const title=root.querySelector<HTMLElement>('[data-vn-title][data-vn-original=true]');
 return import.meta.env.DEV&&title?.dataset.vnPrivateTitleTiming?JSON.parse(title.dataset.vnPrivateTitleTiming):runtimeScenes.motion.title;
}
timing=timingFor(document);
let seen=false,active:HTMLElement|null=null,timer=0;
type Departure={overlay:HTMLElement;animation:Animation;url:string;navigating:boolean};
let departure:Departure|null=null;
function reduced(){return document.documentElement.dataset.vnMotion==='reduced'||document.documentElement.dataset.vnMode==='reader'||matchMedia('(prefers-reduced-motion: reduce)').matches;}
function cancelDeparture(){const d=departure;departure=null;if(d){d.animation.cancel();d.overlay.remove();}}
async function proceed(d:Departure){if(departure!==d||d.navigating)return;d.navigating=true;try{await navigate(d.url);}catch{if(departure===d)location.assign(d.url);}finally{if(departure===d)cancelDeparture();}}
function skipDeparture(){if(departure&&!departure.navigating){departure.animation.finish();void proceed(departure);}}
// custom.ks *title_fadeout: 1000ms fade. The blog preserves its independent persistent BGM.
document.addEventListener('click',event=>{
 if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||reduced()||document.hidden)return;
 const link=(event.target as Element|null)?.closest<HTMLAnchorElement>('a[data-vn-start],a[data-vn-next]');
 if(!link||link.hidden||!link.closest('[data-vn-title]')||link.origin!==location.origin||link.target&&link.target!=='_self'||typeof Element.prototype.animate!=='function')return;
 event.preventDefault();if(departure){skipDeparture();return;}finish();
 const overlay=document.createElement('div');overlay.dataset.vnTitleDeparture='';overlay.setAttribute('aria-hidden','true');document.body.append(overlay);
 const animation=overlay.animate([{opacity:0},{opacity:1}],{duration:timing.leaveMs,easing:'linear',fill:'forwards'});
 const d={overlay,animation,url:link.href,navigating:false};departure=d;
 void animation.finished.then(()=>proceed(d)).catch(()=>{});
},true);
function finish(){clearTimeout(timer);if(active){delete active.dataset.vnTitleIntro;active=null;}}
function prepare(root:Document=document){
 timing=timingFor(root);
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
document.addEventListener('astro:before-preparation',()=>{finish();if(departure&&!departure.navigating)cancelDeparture();});
document.addEventListener('astro:after-swap',cancelDeparture);
document.addEventListener('visibilitychange',()=>{if(document.hidden)skipDeparture();});
document.addEventListener('pointerdown',event=>{if(active?.contains(event.target as Node))finish();},true);
document.addEventListener('focusin',event=>{if(active?.contains(event.target as Node))finish();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){if(departure){event.preventDefault();skipDeparture();}else if(active)finish();}});
window.addEventListener('pagehide',()=>{finish();cancelDeparture();});
prepare();
export {};
