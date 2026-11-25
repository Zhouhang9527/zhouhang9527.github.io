import {navigate} from 'astro:transitions/client';
import {capturePosition,restorePosition} from './vn-reading-position';
import {isPath,type Position} from '../domain/reading-state';
import {confirmVN} from './vn-confirm';
import {beginManualSave,beginManualLoad} from './vn-progress';
import {isReaderAction} from '../domain/vn-actions';
const KEY='ginka.vn.quick.v1',PENDING='ginka.vn.quick-restore.v1';
type Quick={path:string;position:Position;title:string;at:number};
let root:HTMLElement|null=null,article:HTMLElement|null=null,auto=false,held=false,frame=0,last=0,previewTimer=0,statusFrame=0;
const find=(s:string)=>root?.querySelector<HTMLElement>(s);
let dockObserver:ResizeObserver|null=null,dockHeight=0,dockFrame=0;
// The fixed message frame must yield to the article's real actions and comments.
// Its natural-flow location is after the action bar, not in front of it.
function layoutDock(){
 if(!root||!article||!root.isConnected)return;
 const win=find('[data-vn-game-window]'),actions=article.querySelector<HTMLElement>('.vn-reader-actions');
 if(!win||!actions)return;
 const inline=root.dataset.vnDockInline==='true';
 if(!inline&&win.getBoundingClientRect().height>0)dockHeight=win.getBoundingClientRect().height;
 const active=document.documentElement.dataset.vnMode!=='reader'&&!win.hidden&&dockHeight>0;
 const yieldDock=active&&actions.getBoundingClientRect().top<=innerHeight-dockHeight+12;
 if(yieldDock!==inline){if(yieldDock)showQuick(false);root.dataset.vnDockInline=String(yieldDock);}
 document.documentElement.style.setProperty('--vn-dock-space',active&&!yieldDock?Math.ceil(dockHeight+12)+'px':'0px');
}
function queueDock(){if(dockFrame)return;dockFrame=requestAnimationFrame(()=>{dockFrame=0;layoutDock();});}
function cleanupDock(){dockObserver?.disconnect();dockObserver=null;cancelAnimationFrame(dockFrame);dockFrame=0;dockHeight=0;document.documentElement.style.removeProperty('--vn-dock-space');}
function readQuick():Quick|null{try{const v=JSON.parse(localStorage.getItem(KEY)||'null');const p=v?.position;if(!v||!isPath(v.path)||!p||![p.ratio,p.section].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1)||!(p.heading===null||typeof p.heading==='string')||typeof v.title!=='string')return null;return v;}catch{return null;}}
function feedback(s:string){const el=find('[data-vn-game-feedback]');if(el)el.textContent=s;}
function sync(){root?.querySelectorAll<HTMLButtonElement>('[data-vn-game-action]').forEach(b=>{const a=b.dataset.vnGameAction;if(a==='qload')b.disabled=!readQuick();if(a==='vreplay'||a==='vsave')b.disabled=!document.documentElement.hasAttribute('data-vn-voice-ready');if(a==='auto'||a==='hold')b.setAttribute('aria-pressed',String(a==='auto'?(auto||document.documentElement.hasAttribute('data-vn-mascot-auto')):held));});}
function showQuick(open:boolean){const menu=find('[data-vn-quick-menu]');if(menu)menu.hidden=!open;find('[data-vn-quick-toggle]')?.setAttribute('aria-expanded',String(open));}
function stop(){auto=false;cancelAnimationFrame(frame);frame=0;last=0;sync();}
function step(t:number){if(!auto||!article?.isConnected){stop();return;}const body=article.querySelector('.post-body');if(!body||body.getBoundingClientRect().bottom<=innerHeight-90){stop();return;}const dt=last?Math.min(50,t-last):0;last=t;window.scrollBy(0,dt*.045);frame=requestAnimationFrame(step);}
function jump(dir:number){const body=article?.querySelector('.post-body');if(!body)return;const headings=Array.from(body.querySelectorAll<HTMLElement>('h2[id],h3[id],h4[id],h5[id],h6[id]'));const offset=Math.min(100,innerHeight*.16),positions=[body.getBoundingClientRect().top,...headings.map(h=>h.getBoundingClientRect().top),body.getBoundingClientRect().bottom];const target=dir>0?positions.find(p=>p>offset+8):positions.reverse().find(p=>p<offset-8);if(target!==undefined)window.scrollTo({top:Math.max(0,scrollY+target-offset),behavior:'instant'});}
function status(){if(!article||!root)return;const p=capturePosition(article);if(!p)return;const heading=p.heading?document.getElementById(p.heading):null;const name=find('[data-vn-current-heading]'),desc=find('[data-vn-game-description]');if(name)name.textContent=heading?.textContent?.trim()||article.querySelector('h1')?.textContent?.trim()||'阅读中';if(desc)desc.textContent='阅读进度 '+Math.round(p.ratio*100)+'%';}
function preview(q:Quick){const box=find('[data-vn-quick-preview]'),summary=find('[data-vn-quick-summary]');if(!box)return;if(summary)summary.textContent=q.title+' · '+Math.round(q.position.ratio*100)+'%';box.hidden=false;clearTimeout(previewTimer);previewTimer=window.setTimeout(()=>box.hidden=true,1800);}
function mount(){const next=document.querySelector<HTMLElement>('[data-vn-game-reader]');if(root===next){queueDock();return;}stop();cleanupDock();root=next;article=root?.closest<HTMLElement>('[data-vn-article]')??null;held=false;if(!root||!article)return;root.hidden=false;sync();status();layoutDock();if(typeof ResizeObserver!=='undefined'){dockObserver=new ResizeObserver(queueDock);const win=find('[data-vn-game-window]'),actions=article.querySelector('.vn-reader-actions');if(win)dockObserver.observe(win);if(actions)dockObserver.observe(actions);}try{const p=JSON.parse(sessionStorage.getItem(PENDING)||'null');sessionStorage.removeItem(PENDING);const q=readQuick();if(p&&q&&p.path===article.dataset.vnArticle&&q.path===p.path&&Date.now()-p.at<15000)requestAnimationFrame(()=>{if(article?.isConnected)restorePosition(article,q.position);});}catch{}}
document.addEventListener('click',async event=>{
 const target=(event.target as Element|null)?.closest<HTMLElement>('[data-vn-game-action],[data-vn-quick-toggle],[data-vn-reader-reopen]');if(!target||!root?.contains(target)||!article)return;
 if(target.hasAttribute('data-vn-quick-toggle')){showQuick(find('[data-vn-quick-menu]')?.hidden??true);return;}
 if(target.hasAttribute('data-vn-reader-reopen')){target.hidden=true;const w=find('[data-vn-game-window]');if(w)w.hidden=false;queueDock();return;}
 const action=target.dataset.vnGameAction;if(!isReaderAction(action))return;
 if(action==='hold'){held=!held;sync();return;}
 if(action==='hide'){document.dispatchEvent(new CustomEvent('vn:voice-action',{detail:'close'}));showQuick(false);const w=find('[data-vn-game-window]'),r=find('[data-vn-reader-reopen]');if(w)w.hidden=true;if(r){r.hidden=false;r.focus();}stop();queueDock();return;}
 if(action==='save'){stop();article.querySelector<HTMLButtonElement>('[data-vn-save-position]')?.click();beginManualSave(article);}
 else if(action==='load'){stop();beginManualLoad(article);}
 else if(action==='option'){void navigate('/settings/');}
 else if(action==='vreplay'||action==='vsave'){document.dispatchEvent(new CustomEvent('vn:voice-action',{detail:action==='vreplay'?'replay':'save'}));}
 else if(action==='log'){stop();showQuick(false);const opener=target.closest('[data-vn-quick-menu]')?find('[data-vn-quick-toggle]'):target;document.dispatchEvent(new CustomEvent('vn:backlog-open',{detail:opener}));}
 else if(action==='qsave'){const path=article.dataset.vnArticle,position=capturePosition(article);if(!isPath(path)||!position)return;const q={path,position,title:article.querySelector('h1')?.textContent?.trim()||'阅读记录',at:Date.now()};try{localStorage.setItem(KEY,JSON.stringify(q));preview(q);feedback('快速存档已保存');sync();}catch{feedback('无法写入本机快速存档');}}
 else if(action==='qload'){const q=readQuick();if(!q)return;const owner=article;if(!await confirmVN('读取快速存档？')||article!==owner||!owner.isConnected)return;stop();if(article?.dataset.vnArticle===q.path){restorePosition(article,q.position);status();}else{try{sessionStorage.setItem(PENDING,JSON.stringify({path:q.path,at:Date.now()}));}catch{}void navigate(q.path);}}
 else if(action==='xprev'||action==='next'){stop();if(document.documentElement.hasAttribute('data-vn-mascot-dialogue'))document.dispatchEvent(new CustomEvent('vn:voice-action',{detail:action==='next'?'next':'previous'}));else jump(action==='next'?1:-1);}
 else if(action==='skip'){stop();if(document.documentElement.hasAttribute('data-vn-mascot-dialogue')){document.dispatchEvent(new CustomEvent('vn:voice-action',{detail:'skip'}));return;}const b=article.querySelector('.post-body');if(b)window.scrollTo({top:scrollY+b.getBoundingClientRect().bottom-innerHeight*.5,behavior:'instant'});}
 else if(action==='auto'){if(document.documentElement.hasAttribute('data-vn-mascot-dialogue')){stop();document.dispatchEvent(new CustomEvent('vn:voice-action',{detail:'auto'}));}else if(auto)stop();else{auto=true;last=0;frame=requestAnimationFrame(step);sync();}}
 if(!held&&action!=='auto')showQuick(false);
});
window.addEventListener('scroll',()=>{queueDock();if(statusFrame)return;statusFrame=requestAnimationFrame(()=>{statusFrame=0;status();});},{passive:true});
window.addEventListener('resize',queueDock,{passive:true});
window.visualViewport?.addEventListener('resize',queueDock,{passive:true});
document.addEventListener('focusin',event=>{const target=event.target;if(!(target instanceof HTMLElement)||!article?.contains(target)||root?.contains(target)||document.documentElement.dataset.vnMode==='reader')return;layoutDock();const win=find('[data-vn-game-window]');if(!win||win.hidden||root?.dataset.vnDockInline==='true')return;const rect=target.getBoundingClientRect(),limit=win.getBoundingClientRect().top;if(rect.bottom>limit&&rect.top<innerHeight)target.scrollIntoView({block:'center',behavior:'instant'});});
window.addEventListener('wheel',stop,{passive:true});
window.addEventListener('touchstart',event=>{if(!root?.contains(event.target as Node))stop();},{passive:true});
document.addEventListener('change',event=>{if(event.target instanceof HTMLInputElement&&event.target.name==='vn-mode'){if(event.target.value==='reader'){stop();showQuick(false);}queueDock();}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.querySelector('[data-vn-confirm][open],[data-vn-log-open=true]')){showQuick(false);stop();}});
document.addEventListener('astro:before-preparation',()=>{stop();clearTimeout(previewTimer);cancelAnimationFrame(statusFrame);statusFrame=0;cleanupDock();});
document.addEventListener('astro:after-swap',()=>{root=null;article=null;});
document.addEventListener('astro:page-load',mount);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
document.addEventListener('vn:backlog-open',stop);
document.addEventListener('vn:mascot-open',stop);
document.addEventListener('vn:progress-reset',sync);
document.addEventListener('vn:voice-state',sync);
window.addEventListener('storage',()=>{sync();queueDock();});
document.addEventListener('vn:view-change',queueDock);
mount();
