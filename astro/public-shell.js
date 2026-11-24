/* Astro navigation and native dialogs; no NexT/PJAX engine. */
(() => {
 if(window.__astroShell) return;window.__astroShell=true;
 const $=s=>document.querySelector(s);
 let opener=null,searchModule=null,queryToken=0;
 function drawer(open){
  document.body.classList.toggle('sidebar-active',open);
  const side=$('#journal-sidebar');if(side){side.inert=!open;side.setAttribute('aria-hidden',String(!open));}
  document.querySelectorAll('[data-journal-sidebar-open]').forEach(el=>el.setAttribute('aria-expanded',String(open)));
 }
 window.addEventListener('sidebar:show',()=>drawer(true));
 window.addEventListener('sidebar:hide',()=>drawer(false));
 function search(){
  const dialog=$('.astro-search');if(!dialog||dialog.open)return;opener=document.activeElement===document.body?$('.popup-trigger'):document.activeElement;dialog.showModal();$('#astro-query')?.focus();
 }
 function updateOutline(){
  const target=$('[data-sidebar-outline]'),outline=$('[data-journal-outline]');if(target){target.replaceChildren();if(outline){const copy=outline.cloneNode(true);copy.removeAttribute('data-journal-outline');target.append(copy);}}
 }
 document.addEventListener('click',e=>{
  const el=e.target.closest?.('button,a,[data-drawer-close]');if(!el)return;
  if(el.matches('[data-drawer-close]'))window.dispatchEvent(new Event('sidebar:hide'));
  if(el.matches('.popup-trigger'))search();
  if(el.matches('[data-gallery-close]'))$('.astro-gallery')?.close();
  if(el.matches('.journal-scene-card')&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey){
   e.preventDefault();const dialog=$('.astro-gallery');const img=dialog.querySelector('img');img.src=el.href;img.alt=el.dataset.caption||'';dialog.querySelector('p').textContent=el.dataset.caption||'';opener=el;dialog.showModal();
  }
 });
 // Explicit escape handling avoids the search input consuming its first Escape.
 document.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  const dialog=$('.astro-search[open],.astro-gallery[open]');
  if(dialog){e.preventDefault();dialog.close();}
 },true);
 document.addEventListener('close',e=>{if(e.target.matches('.astro-search,.astro-gallery')){++queryToken;const target=opener;opener=null;if(target?.isConnected)target.focus({preventScroll:true});}},true);
 document.addEventListener('input',async e=>{
  if(e.target.id!=='astro-query')return;const q=e.target.value.trim(),token=++queryToken,results=$('#astro-results');results.replaceChildren();if(!q)return;
  results.textContent='检索中…';
  try{
   searchModule ||= import('/pagefind/pagefind.js').then(async m=>{await m.init();return m;});
   const index=await searchModule, data=await index.search(q);
   const hits=await Promise.all(data.results.slice(0,20).map(r=>r.data()));
   if(token!==queryToken)return;results.replaceChildren();
   if(!hits.length){results.textContent='没有匹配的文章';return;}
   for(const hit of hits){const a=document.createElement('a');a.href=hit.url;const title=document.createElement('strong');title.textContent=hit.meta.title||hit.url;const p=document.createElement('p');const fragment=new DOMParser().parseFromString(hit.excerpt||'','text/html');p.textContent=fragment.body.textContent;a.append(title,p);results.append(a);}
  }catch(err){if(token===queryToken){searchModule=null;results.textContent='搜索暂时不可用，请重试';}}
 });
 document.addEventListener('astro:before-preparation',()=>{++queryToken;drawer(false);document.querySelectorAll('dialog[open]').forEach(d=>d.close());});
 document.addEventListener('astro:after-swap',()=>{try{window.GINKA_THEME?.set(localStorage.getItem('ginka-theme')||'system');}catch{}drawer(false);});
 document.addEventListener('astro:page-load',updateOutline);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',updateOutline,{once:true});else updateOutline();
})();
