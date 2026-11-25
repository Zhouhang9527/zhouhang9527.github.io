// Keep one live Giscus iframe in its original DOM position.
// Explicit Log opens a modal-like fixed surface; inline comments remain accessible.
let active:HTMLElement|null=null,trigger:HTMLElement|null=null;
let inerted:HTMLElement[]=[],previousOverflow='';
function reduced(){return document.documentElement.dataset.vnMotion==='reduced'||matchMedia('(prefers-reduced-motion: reduce)').matches;}
function selectHistory(log:HTMLElement,key:'comments'|'dialogue'){
 log.querySelectorAll<HTMLElement>('[data-vn-log-panel]').forEach(el=>el.hidden=el.dataset.vnLogPanel!==key);
 log.querySelectorAll<HTMLButtonElement>('[data-vn-log-tab]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.vnLogTab===key)));
 log.querySelector<HTMLElement>('[data-vn-log-scrollport]')?.scrollTo({top:0,behavior:'instant'});
}
function close(restoreFocus=true){
 const log=active;if(!log)return;
 active=null;selectHistory(log,'comments');delete log.dataset.vnLogOpen;log.removeAttribute('role');log.removeAttribute('aria-modal');log.removeAttribute('aria-labelledby');
 for(const node of inerted)node.inert=false;inerted=[];
 document.documentElement.style.overflow=previousOverflow;delete document.documentElement.dataset.vnBacklogOpen;
 if(restoreFocus&&trigger?.isConnected){
  const fallback=document.querySelector<HTMLElement>('[data-vn-log-open]:not([hidden])');
  const target=trigger.getClientRects().length?trigger:fallback;
  if(target?.getClientRects().length)target.focus({preventScroll:true});
 }
 trigger=null;
}
function open(log:HTMLElement,from:HTMLElement){
 if(active)return;active=log;trigger=from;selectHistory(log,'comments');
 previousOverflow=document.documentElement.style.overflow;
 document.documentElement.style.overflow='hidden';document.documentElement.dataset.vnBacklogOpen='true';
 log.dataset.vnLogOpen='true';log.setAttribute('role','dialog');log.setAttribute('aria-modal','true');log.setAttribute('aria-labelledby','vn-log-title');
 // Inert siblings of each ancestor without moving the iframe or changing its origin.
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
 const target=(event.target as Element|null)?.closest<HTMLElement>('[data-vn-log-open],[data-vn-log-close],[data-vn-log-scroll],[data-vn-log-tab]');
 if(!target)return;
 if(target.hasAttribute('data-vn-log-tab')){const log=target.closest<HTMLElement>('[data-vn-backlog]');if(log&&active===log)selectHistory(log,target.dataset.vnLogTab==='dialogue'?'dialogue':'comments');return;}
 if(target.hasAttribute('data-vn-log-open')){
  if(document.documentElement.dataset.vnMode==='reader')return;
  const log=document.querySelector<HTMLElement>('[data-vn-backlog]');if(!log)return;
  event.preventDefault();open(log,target);return;
 }
 if(target.hasAttribute('data-vn-log-close')&&active){event.preventDefault();close();return;}
 if(!target.hasAttribute('data-vn-log-scroll'))return;
 const log=target.closest<HTMLElement>('[data-vn-backlog]');if(!log)return;
 const action=target.dataset.vnLogScroll;
 const direction=action==='up'?-1:1;
 const behavior:ScrollBehavior=reduced()?'instant':'smooth';
 if(active===log){const port=log.querySelector<HTMLElement>('[data-vn-log-scrollport]');if(port){if(action==='top'||action==='end')port.scrollTo({top:action==='top'?0:port.scrollHeight,behavior});else port.scrollBy({top:direction*port.clientHeight*.8,behavior});}}
 else{const bounds=log.getBoundingClientRect(),top=scrollY+bounds.top,bottom=Math.max(top,scrollY+bounds.bottom-innerHeight);window.scrollTo({top:action==='top'?top:action==='end'?bottom:Math.max(top,Math.min(bottom,scrollY+direction*innerHeight*.8)),behavior});}
},true);
document.addEventListener('keydown',event=>{
 if(!active||event.defaultPrevented)return;
 if(event.key==='Escape'){event.preventDefault();close();return;}
 if(event.key!=='Tab')return;
 const focusable=Array.from(active.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),iframe,[tabindex="0"]')).filter(node=>node.getClientRects().length&&!node.closest('[hidden]')&&getComputedStyle(node).visibility!=='hidden');
 const first=focusable[0],last=focusable.at(-1);if(!first||!last)return;
 if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
 else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
});
document.addEventListener('astro:before-preparation',()=>close(false));
window.addEventListener('pagehide',()=>close(false));
window.addEventListener('storage',()=>{if(document.documentElement.dataset.vnMode==='reader')close(false);});
export {};
