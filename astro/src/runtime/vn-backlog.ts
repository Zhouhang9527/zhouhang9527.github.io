// One live Giscus iframe stays in its original DOM position. BACKLOG's native
// voiced history and the blog discussion are separate views, never mixed rows.
let active:HTMLElement|null=null,trigger:HTMLElement|null=null;
let inerted:HTMLElement[]=[],previousOverflow='';
type LogView='comments'|'dialogue';
const positions=new WeakMap<HTMLElement,Partial<Record<LogView,number>>>();
function reduced(){return document.documentElement.dataset.vnMotion==='reduced'||matchMedia('(prefers-reduced-motion: reduce)').matches;}
function selectHistory(log:HTMLElement,key:LogView,latest=false){
 const port=log.querySelector<HTMLElement>('[data-vn-log-scrollport]'),saved=positions.get(log)||{};
 const previous=log.dataset.vnLogView as LogView|undefined;if(previous&&port)saved[previous]=port.scrollTop;
 positions.set(log,saved);log.dataset.vnLogView=key;
 const panel=log.querySelector<HTMLElement>('[data-vn-log-panel="'+previous+'"]');
 const focusMoved=previous!==key&&!!panel?.contains(document.activeElement);
 log.querySelectorAll<HTMLElement>('[data-vn-log-panel]').forEach(el=>el.hidden=el.dataset.vnLogPanel!==key);
 log.querySelectorAll<HTMLButtonElement>('[data-vn-log-tab]').forEach(el=>{const selected=el.dataset.vnLogTab===key;el.setAttribute('aria-pressed',String(selected));el.setAttribute('aria-selected',String(selected));el.tabIndex=selected?0:-1;if(selected&&focusMoved)el.focus({preventScroll:true});});
 port?.scrollTo({top:latest?port.scrollHeight:saved[key]??0,behavior:'instant'});
}
function close(restoreFocus=true){
 const log=active;if(!log)return;
 active=null;document.dispatchEvent(new Event('vn:backlog-close'));selectHistory(log,'comments');delete log.dataset.vnLogOpen;log.removeAttribute('role');log.removeAttribute('aria-modal');log.removeAttribute('aria-labelledby');
 for(const node of inerted)node.inert=false;inerted=[];
 document.documentElement.style.overflow=previousOverflow;delete document.documentElement.dataset.vnBacklogOpen;
 if(restoreFocus){
  const fallback=document.querySelector<HTMLElement>('[data-vn-log-open]:not([hidden])');
  const target=trigger?.isConnected&&trigger.getClientRects().length?trigger:fallback;
  if(target?.getClientRects().length)target.focus({preventScroll:true});
 }
 trigger=null;
}
function open(log:HTMLElement,from:HTMLElement){
 if(active||document.querySelector('dialog[open]'))return;
 active=log;trigger=from;document.dispatchEvent(new Event('vn:backlog-opened'));
 previousOverflow=document.documentElement.style.overflow;
 document.documentElement.style.overflow='hidden';document.documentElement.dataset.vnBacklogOpen='true';
 log.dataset.vnLogOpen='true';log.setAttribute('role','dialog');log.setAttribute('aria-modal','true');log.setAttribute('aria-labelledby','vn-log-title');
 const hasHistory=!!log.querySelector('.vn-voice-history-row');selectHistory(log,hasHistory?'dialogue':'comments',hasHistory);
 // Inert siblings of each ancestor, but never reparent or reload Giscus.
 for(let branch:HTMLElement|null=log;branch&&branch!==document.body;branch=branch.parentElement){
  const parent:HTMLElement|null=branch.parentElement;if(!parent)break;
  for(const sibling of Array.from(parent.children)){
   if(!(sibling instanceof HTMLElement)||sibling===branch||sibling.inert||['SCRIPT','STYLE','LINK'].includes(sibling.tagName))continue;
   sibling.inert=true;inerted.push(sibling);
  }
 }
 log.querySelector<HTMLElement>('[data-vn-log-close]')?.focus({preventScroll:true});
}
document.addEventListener('vn:backlog-open',event=>{
 const from=(event as CustomEvent<unknown>).detail;
 const log=document.querySelector<HTMLElement>('[data-vn-backlog]');
 if(from instanceof HTMLElement&&from.isConnected&&log&&document.documentElement.dataset.vnMode!=='reader')open(log,from);
});
document.addEventListener('click',event=>{
 if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return;
 const target=(event.target as Element|null)?.closest<HTMLElement>('[data-vn-log-open],[data-vn-log-close],[data-vn-log-scroll],[data-vn-log-tab]');if(!target)return;
 if(target.hasAttribute('data-vn-log-tab')){const log=target.closest<HTMLElement>('[data-vn-backlog]');if(log&&active===log)selectHistory(log,target.dataset.vnLogTab==='dialogue'?'dialogue':'comments');return;}
 if(target.hasAttribute('data-vn-log-open')){
  if(document.documentElement.dataset.vnMode==='reader')return;
  const log=document.querySelector<HTMLElement>('[data-vn-backlog]');if(!log)return;
  event.preventDefault();open(log,target);return;
 }
 if(target.hasAttribute('data-vn-log-close')&&active){event.preventDefault();close();return;}
 if(!target.hasAttribute('data-vn-log-scroll'))return;
 const log=target.closest<HTMLElement>('[data-vn-backlog]');if(!log)return;
 const action=target.dataset.vnLogScroll,direction=action==='up'?-1:1,behavior:ScrollBehavior=reduced()?'instant':'smooth';
 if(active===log){const port=log.querySelector<HTMLElement>('[data-vn-log-scrollport]');if(port){if(action==='top'||action==='end')port.scrollTo({top:action==='top'?0:port.scrollHeight,behavior});else port.scrollBy({top:direction*port.clientHeight*.8,behavior});}}
 else{const bounds=log.getBoundingClientRect(),top=scrollY+bounds.top,bottom=Math.max(top,scrollY+bounds.bottom-innerHeight);window.scrollTo({top:action==='top'?top:action==='end'?bottom:Math.max(top,Math.min(bottom,scrollY+direction*innerHeight*.8)),behavior});}
},true);
function focusable(log:HTMLElement){return Array.from(log.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),iframe,[tabindex="0"]')).filter(node=>node.getClientRects().length&&!node.closest('[hidden],[inert]')&&getComputedStyle(node).visibility!=='hidden');}
document.addEventListener('keydown',event=>{
 if(!active||event.defaultPrevented||document.querySelector('dialog[open]'))return;
 if(event.key==='Escape'){event.preventDefault();close();return;}
 const target=event.target;
 if(target instanceof HTMLElement&&target.matches('[data-vn-log-tab]')&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
  event.preventDefault();const key=event.key==='Home'?'comments':event.key==='End'?'dialogue':target.dataset.vnLogTab==='comments'?'dialogue':'comments';selectHistory(active,key);active.querySelector<HTMLElement>('[data-vn-log-tab="'+key+'"]')?.focus();return;
 }
 if(event.key!=='Tab')return;
 const nodes=focusable(active),first=nodes[0],last=nodes.at(-1);if(!first||!last)return;
 if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
 else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
});
document.addEventListener('focusin',event=>{if(active&&event.target instanceof Node&&!active.contains(event.target)&&!document.querySelector('dialog[open]'))focusable(active)[0]?.focus({preventScroll:true});});
document.addEventListener('astro:before-preparation',()=>close(false));
window.addEventListener('pagehide',()=>close(false));
document.addEventListener('vn:view-change',()=>{if(document.documentElement.dataset.vnMode==='reader')close();});
window.addEventListener('storage',()=>{if(document.documentElement.dataset.vnMode==='reader')close(false);});
export {};
