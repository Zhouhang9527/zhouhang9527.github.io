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
 });
 // Claim normal gallery activations before Astro's document-level navigation.
 // Modified clicks and no-JS links still open the actual image.
 document.addEventListener('click',e=>{
  if(e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
  const el=e.target.closest?.('a.journal-scene-card');if(!el)return;
  const dialog=$('.astro-gallery');if(!dialog||typeof dialog.showModal!=='function')return;
  const img=dialog.querySelector('img'),caption=dialog.querySelector('p');if(!img||!caption)return;
  e.preventDefault();if(dialog.open)return;
  const night=document.documentElement.dataset.vnMode==='reader'&&document.documentElement.dataset.theme==='moonlit';
  img.src=(night?el.dataset.fullNight:el.dataset.fullDay)||el.href;img.alt=el.dataset.caption||'';caption.textContent=el.dataset.caption||'';
  opener=el;dialog.showModal();
 },true);
 // Explicit escape handling avoids the search input consuming its first Escape.
 document.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  const dialog=$('.astro-search[open],.astro-gallery[open]');
  if(dialog){e.preventDefault();dialog.close();}
 },true);
 document.addEventListener('close',e=>{if(e.target.matches('.astro-search,.astro-gallery')){++queryToken;const target=opener;opener=null;if(target?.isConnected)target.focus({preventScroll:true});}},true);
 document.addEventListener('input',async e=>{
  if(e.target.id!=='astro-query'&&!e.target.matches?.('[data-vn-query]'))return;const q=e.target.value.trim(),token=++queryToken,results=e.target.id==='astro-query'?$('#astro-results'):$('[data-vn-results]');if(!results)return;results.replaceChildren();if(!q)return;
  results.textContent='检索中…';
  try{
   searchModule ||= import('/pagefind/pagefind.js').then(async m=>{await m.init();return m;});
   const index=await searchModule, data=await index.search(q);
   const hits=await Promise.all(data.results.slice(0,20).map(r=>r.data()));
   if(token!==queryToken||!results.isConnected)return;results.replaceChildren();
   if(!hits.length){results.textContent='没有匹配的文章';return;}
   for(const hit of hits){const a=document.createElement('a');a.href=hit.url;const title=document.createElement('strong');title.textContent=hit.meta.title||hit.url;const p=document.createElement('p');const fragment=new DOMParser().parseFromString(hit.excerpt||'','text/html');p.textContent=fragment.body.textContent;a.append(title,p);results.append(a);}
  }catch(err){if(token===queryToken){searchModule=null;results.textContent='搜索暂时不可用，请重试';}}
 });
 document.addEventListener('astro:before-preparation',()=>{++queryToken;drawer(false);document.querySelectorAll('dialog[open]').forEach(d=>d.close());});
 document.addEventListener('astro:after-swap',()=>{try{window.GINKA_THEME?.set(localStorage.getItem('ginka-theme')||'system');}catch{}drawer(false);});
 function mount(){updateOutline();const search=$('[data-vn-search]');if(search)search.hidden=false;}
 document.addEventListener('astro:page-load',mount);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
