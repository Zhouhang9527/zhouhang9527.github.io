/* Lazy, external Giscus loader. No inline executable script, no zero-height observer. */
(() => {
  'use strict';
  const mounted = new WeakSet();
  let observed = null;
  let observer = null;
  function setBusy(container, busy) {
    const cue = container.closest('.journal-dialogue')?.querySelector('.journal-dialogue-next');
    if (cue) cue.setAttribute('aria-busy', String(busy));
  }
  function detach() {
    observer?.disconnect();
    observer = null;
    observed = null;
  }
  async function load(container) {
    if (!container.isConnected || mounted.has(container)) return;
    mounted.add(container);
    setBusy(container, true);
    detach();
    const status = container.querySelector('.journal-comments-status');
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    for (const name of ['repo','repo-id','category','category-id','mapping','strict','reactions-enabled','emit-metadata','lang','input-position','loading']) {
      const value = container.getAttribute('data-' + name);
      if (value !== null) script.setAttribute('data-' + name, value);
    }
    // Our own observer already implements lazy loading; do not defer the
    // iframe again once the user is at the comments.
    script.setAttribute('data-loading', 'eager');
    let selected;
    try { selected = await window.GINKA_THEME?.prepareCommentTheme?.(); } catch (_) {}
    if (!container.isConnected) { mounted.delete(container); return; }
    script.setAttribute('data-theme', selected || window.GINKA_THEME?.commentTheme ||
      (document.documentElement.dataset.theme === 'moonlit' ? 'dark_dimmed' : 'light'));
    script.addEventListener('load', () => {
      const frame = container.querySelector('iframe.giscus-frame');
      if (frame) frame.addEventListener('load', () => setBusy(container, false), {once:true});
      else setBusy(container, false);
      // Never leave the visual indicator spinning indefinitely on a blocked iframe.
      window.setTimeout(() => setBusy(container, false), 15000);
      status?.remove();
      if (container.isConnected) document.dispatchEvent(new CustomEvent('ginka:comments-ready'));
    }, {once:true});
    script.addEventListener('error', () => {
      script.remove();
      mounted.delete(container);
      setBusy(container, false);
      if (!status || !container.isConnected) return;
      status.textContent = '评论加载失败';
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = '重试';
      retry.addEventListener('click', () => {status.textContent = '评论加载中…'; load(container);}, {once:true});
      status.append(retry);
    }, {once:true});
    container.append(script);
  }
  function mount() {
    const container = document.querySelector('.journal-dialogue .giscus-container');
    if (!container || mounted.has(container)) { detach(); return; }
    if (observed === container) return;
    detach();
    observed = container;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) load(container);
      }, {rootMargin:'240px 0px'});
      observer.observe(container);
    } else load(container);
  }
  document.addEventListener('pjax:send', detach);
  document.addEventListener('click', event => {
    const cue = event.target.closest?.('.journal-dialogue-next');
    if (!cue) return;
    const target = document.getElementById('journal-comments');
    if (!target) return;
    event.preventDefault();
    const container = target.querySelector('.giscus-container');
    if (container) load(container);
    target.focus({preventScroll:true});
    target.scrollIntoView({block:'start',behavior:'auto'});
  });
  ['page:loaded','pjax:success','pjax:complete','DOMContentLoaded'].forEach(name => document.addEventListener(name,mount));
  if (document.readyState !== 'loading') mount();
})();
