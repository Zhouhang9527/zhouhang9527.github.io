/* Lazy, external Giscus loader. No inline executable script, no zero-height observer. */
(() => {
  'use strict';
  const mounted = new WeakSet();
  let observed = null;
  let observer = null;
  let cueObserver = null;
  let cueTarget = null;
  const playedCues = new WeakSet();
  function detach() {
    observer?.disconnect();
    observer = null;
    observed = null;
  }
  function load(container) {
    if (!container.isConnected || mounted.has(container)) return;
    mounted.add(container);
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
    script.setAttribute('data-theme', window.GINKA_THEME?.commentTheme ||
      (document.documentElement.dataset.theme === 'moonlit' ? 'dark_dimmed' : 'light'));
    script.addEventListener('load', () => {
      status?.remove();
      if (container.isConnected) document.dispatchEvent(new CustomEvent('ginka:comments-ready'));
    }, {once:true});
    script.addEventListener('error', () => {
      script.remove();
      mounted.delete(container);
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
  function mountCue() {
    const cue = document.querySelector('.journal-dialogue-has-advance .journal-dialogue-next');
    if (!cue || playedCues.has(cue) || cue === cueTarget) return;
    cueObserver?.disconnect();
    cueTarget = cue;
    if (!('IntersectionObserver' in window)) { playedCues.add(cue); return; }
    cueObserver = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      cue.classList.add('is-entered');
      playedCues.add(cue);
      cueObserver?.disconnect();
      cueObserver = null;
      cueTarget = null;
    }, { threshold: .5 });
    cueObserver.observe(cue);
  }
  function mount() {
    mountCue();
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
  document.addEventListener('pjax:send', () => {
    detach();
    cueObserver?.disconnect();
    cueObserver = null;
    cueTarget = null;
  });
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
