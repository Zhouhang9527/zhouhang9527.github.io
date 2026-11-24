import {capturePosition,restorePosition} from './vn-reading-position';
import {isPath,type Position} from '../domain/reading-state';
import {confirmVN} from './vn-confirm';
const KEY='ginka.vn.quick.v1',PENDING='ginka.vn.quick-restore.v1';
type Quick={path:string;position:Position;title:string;at:number};
let root:HTMLElement|null=null,article:HTMLElement|null=null,auto=false,held=false,frame=0,last=0,previewTimer=0;
const find=(s:string)=>root?.querySelector<HTMLElement>(s);
function readQuick():Quick|null{try{const v=JSON.parse(localStorage.getItem(KEY)||'null');const p=v?.position;if(!v||!isPath(v.path)||!p||![p.ratio,p.section].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1)||!(p.heading===null||typeof p.heading==='string')||typeof v.title!=='string')return null;return v;}catch{return null;}}
function feedback(s:string){const el=find('[data-vn-game-feedback]');if(el)el.textContent=s;}
function sync(){root?.querySelectorAll<HTMLButtonElement>('[data-vn-game-action]').forEach(b=>{const a=b.dataset.vnGameAction;if(a==='qload')b.disabled=!readQuick();if(a==='auto'||a==='hold')b.setAttribute('aria-pressed',String(a==='auto'?auto:held));});}
function showQuick(open:boolean){const menu=find('[data-vn-quick-menu]');if(menu)menu.hidden=!open;find('[data-vn-quick-toggle]')?.setAttribute('aria-expanded',String(open));}
function stop(){auto=false;cancelAnimationFrame(frame);frame=0;last=0;sync();}
function step(t:number){if(!auto||!article?.isConnected){stop();return;}const body=article.querySelector('.post-body');if(!body||body.getBoundingClientRect().bottom<=innerHeight-90){stop();return;}const dt=last?Math.min(50,t-last):0;last=t;window.scrollBy(0,dt*.045);frame=requestAnimationFrame(step);}
function jump(dir:number){const body=article?.querySelector('.post-body');if(!body)return;const headings=Array.from(body.querySelectorAll<HTMLElement>('h2[id],h3[id],h4[id],h5[id],h6[id]'));const offset=Math.min(100,innerHeight*.16),positions=[body.getBoundingClientRect().top,...headings.map(h=>h.getBoundingClientRect().top),body.getBoundingClientRect().bottom];const target=dir>0?positions.find(p=>p>offset+8):positions.reverse().find(p=>p<offset-8);if(target!==undefined)window.scrollTo({top:Math.max(0,scrollY+target-offset),behavior:'instant'});}
function status(){if(!article||!root)return;const p=capturePosition(article);if(!p)return;const heading=p.heading?document.getElementById(p.heading):null;const name=find('[data-vn-current-heading]'),desc=find('[data-vn-game-description]');if(name)name.textContent=heading?.textContent?.trim()||article.querySelector('h1')?.textContent?.trim()||'阅读中';if(desc)desc.textContent='阅读进度 '+Math.round(p.ratio*100)+'%';}
function preview(q:Quick){const box=find('[data-vn-quick-preview]'),summary=find('[data-vn-quick-summary]');if(!box)return;if(summary)summary.textContent=q.title+' · '+Math.round(q.position.ratio*100)+'%';box.hidden=false;clearTimeout(previewTimer);previewTimer=window.setTimeout(()=>box.hidden=true,1800);}
function mount(){const next=document.querySelector<HTMLElement>('[data-vn-game-reader]');if(root===next)return;stop();root=next;article=root?.closest<HTMLElement>('[data-vn-article]')??null;held=false;if(!root||!article)return;root.hidden=false;sync();status();try{const p=JSON.parse(sessionStorage.getItem(PENDING)||'null');sessionStorage.removeItem(PENDING);const q=readQuick();if(p&&q&&p.path===article.dataset.vnArticle&&q.path===p.path&&Date.now()-p.at<15000)requestAnimationFrame(()=>{if(article?.isConnected)restorePosition(article,q.position);});}catch{}}
document.addEventListener('click',async event=>{
 const target=(event.target as Element|null)?.closest<HTMLElement>('[data-vn-game-action],[data-vn-quick-toggle],[data-vn-reader-reopen]');if(!target||!root?.contains(target)||!article)return;
 if(target.hasAttribute('data-vn-quick-toggle')){showQuick(find('[data-vn-quick-menu]')?.hidden??true);return;}
 if(target.hasAttribute('data-vn-reader-reopen')){target.hidden=true;const w=find('[data-vn-game-window]');if(w)w.hidden=false;return;}
 const action=target.dataset.vnGameAction;
 if(action==='hold'){held=!held;sync();return;}
 if(action==='hide'){showQuick(false);const w=find('[data-vn-game-window]'),r=find('[data-vn-reader-reopen]');if(w)w.hidden=true;if(r){r.hidden=false;r.focus();}stop();return;}
 if(action==='save'){article.querySelector<HTMLButtonElement>('[data-vn-save-position]')?.click();feedback('阅读位置已保存');}
 else if(action==='load'){location.assign('/library/');}
 else if(action==='option'){location.assign('/settings/');}
 else if(action==='log'){article.querySelector<HTMLAnchorElement>('[data-vn-log-open]')?.click();}
 else if(action==='qsave'){const path=article.dataset.vnArticle,position=capturePosition(article);if(!isPath(path)||!position)return;const q={path,position,title:article.querySelector('h1')?.textContent?.trim()||'阅读记录',at:Date.now()};try{localStorage.setItem(KEY,JSON.stringify(q));preview(q);feedback('快速存档已保存');sync();}catch{feedback('无法写入本机快速存档');}}
 else if(action==='qload'){const q=readQuick();if(!q||!await confirmVN('读取快速存档？'))return;stop();if(article?.dataset.vnArticle===q.path){restorePosition(article,q.position);status();}else{try{sessionStorage.setItem(PENDING,JSON.stringify({path:q.path,at:Date.now()}));}catch{}location.assign(q.path);}}
 else if(action==='xprev'||action==='next'){stop();jump(action==='next'?1:-1);}
 else if(action==='skip'){stop();const b=article.querySelector('.post-body');if(b)window.scrollTo({top:scrollY+b.getBoundingClientRect().bottom-innerHeight*.5,behavior:'instant'});}
 else if(action==='auto'){if(auto)stop();else{auto=true;last=0;frame=requestAnimationFrame(step);sync();}}
 if(!held&&action!=='auto'&&action!=='hold')showQuick(false);
});
window.addEventListener('scroll',status,{passive:true});
window.addEventListener('wheel',stop,{passive:true});
window.addEventListener('touchstart',event=>{if(!root?.contains(event.target as Node))stop();},{passive:true});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.querySelector('[data-vn-confirm][open],[data-vn-log-open=true]')){showQuick(false);stop();}});
document.addEventListener('astro:before-preparation',()=>{stop();clearTimeout(previewTimer);});
document.addEventListener('astro:page-load',mount);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
document.addEventListener('vn:progress-reset',sync);
window.addEventListener('storage',sync);
mount();
