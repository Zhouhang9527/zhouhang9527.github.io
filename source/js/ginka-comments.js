/* Route-scoped Giscus loader with explicit recovery and a non-blocking timeout. */
(() => {
  'use strict';
  if (window.__ginkaCommentsMounted) return;
  window.__ginkaCommentsMounted = true;
  const states = new WeakMap();
  let observer = null, observed = null, queued = false;
  function detach() {
    observer?.disconnect();
    observer = null;
    observed = null;
  }
  function showStatus(container, text, retry, link) {
    let status = container.querySelector('.journal-comments-status');
    if (!status) {
      status = document.createElement('p');
      status.className = 'journal-comments-status';
      status.setAttribute('role','status');
      container.prepend(status);
    }
    status.textContent = text;
    status.classList.toggle('is-pending', !retry && !link);
    if (retry) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = '重试';
      button.addEventListener('click', () => load(container), {once:true});
      status.append(button);
    }
    if (link) {
      const a = document.createElement('a');
      a.textContent = '前往 GitHub 讨论';
      a.href = 'https://github.com/' + container.dataset.repo + '/discussions';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      status.append(a);
    }
  }
  async function load(container) {
    if (!container?.isConnected || ['pending','ready'].includes(states.get(container)?.phase)) return;
    detach();
    const attempt = {phase:'pending'};
    states.set(container, attempt);
    showStatus(container, '评论加载中…', false, false);
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    for (const name of ['repo','repo-id','category','category-id','mapping','strict','reactions-enabled','emit-metadata','lang','input-position']) {
      const value = container.getAttribute('data-' + name);
      if (value !== null) script.setAttribute('data-' + name, value);
    }
    script.setAttribute('data-loading','eager');
    let selected;
    try { selected = await window.GINKA_THEME?.prepareCommentTheme?.(); } catch (_) {}
    if (!container.isConnected || states.get(container) !== attempt) return;
    script.setAttribute('data-theme', selected || window.GINKA_THEME?.commentTheme ||
      (document.documentElement.dataset.theme === 'moonlit' ? 'dark_dimmed' : 'light'));
    let timer, changes;
    function finish() {
      clearTimeout(timer);
      changes?.disconnect();
    }
    function ready() {
      if (!container.isConnected) { finish(); return false; }
      if (!container.querySelector('iframe.giscus-frame')) return false;
      if (attempt.phase === 'ready') return true;
      attempt.phase = 'ready';
      finish();
      container.querySelector('.journal-comments-status')?.remove();
      document.dispatchEvent(new CustomEvent('ginka:comments-ready'));
      return true;
    }
    function failed() {
      if (ready()) return;
      finish();
      script.remove();
      if (!container.isConnected || states.get(container) !== attempt) return;
      attempt.phase = 'error';
      showStatus(container,'评论暂时无法加载',true,true);
    }
    changes = new MutationObserver(ready);
    changes.observe(container,{childList:true,subtree:true});
    script.addEventListener('load', ready,{once:true});
    script.addEventListener('error', failed,{once:true});
    timer = setTimeout(() => {
      if (ready() || !container.isConnected) { finish(); return; }
      // A slow dynamic script may still execute: never inject a second one.
      showStatus(container,'评论加载时间较长',false,true);
    },12000);
    container.append(script);
  }
  function checkNear() {
    queued = false;
    const c = observed;
    if (!c?.isConnected) return;
    const r = c.getBoundingClientRect();
    if (r.bottom >= -240 && r.top <= innerHeight + 240) load(c);
  }
  function scheduleCheck() {
    if (observed && !queued) { queued = true; requestAnimationFrame(checkNear); }
  }
  function mount() {
    const container = document.querySelector('.journal-dialogue .giscus-container');
    if (!container || states.has(container)) { detach(); return; }
    if (observed !== container) {
      detach();
      observed = container;
      if ('IntersectionObserver' in window) {
        observer = new IntersectionObserver(entries => {
          if (entries.some(entry => entry.isIntersecting)) load(container);
        },{rootMargin:'240px 0px'});
        observer.observe(container);
      }
    }
    scheduleCheck();
  }
  window.addEventListener('scroll',scheduleCheck,{passive:true});
  window.addEventListener('resize',scheduleCheck,{passive:true});
  window.addEventListener('pageshow',mount);
  document.addEventListener('focusin',event => {
    const c = event.target.closest?.('.journal-dialogue')?.querySelector('.giscus-container');
    if (c && !states.has(c)) load(c);
  });
  document.addEventListener('pjax:send',detach);
  ['page:loaded','pjax:success','pjax:complete','pjax:error','DOMContentLoaded'].forEach(name=>document.addEventListener(name,mount));
  if (document.readyState !== 'loading') mount();
})();
