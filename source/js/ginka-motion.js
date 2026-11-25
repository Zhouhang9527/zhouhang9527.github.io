(() => {
  'use strict';
  if (window.GinkaMotion) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
  let body = document.body;
  let current = null;
  let trip = null;
  let settleTimer = 0;
  let meter;

  function pageScope(main) {
    const controller = new AbortController();
    const disposers = [];
    const animations = new Set();
    return {
      main,
      on(target, type, listener, options) {
        target.addEventListener(type, listener, { ...options, signal: controller.signal });
      },
      dispose(fn) { disposers.push(fn); },
      animate(node, frames, options) {
        if (!node.animate) return;
        const animation = node.animate(frames, { easing: ease, ...options });
        animations.add(animation);
        animation.onfinish = animation.oncancel = () => animations.delete(animation);
        return animation;
      },
      destroy() {
        controller.abort();
        for (const animation of animations) animation.cancel();
        animations.clear();
        for (const dispose of disposers.reverse()) dispose();
      }
    };
  }

  function plainClick(event) {
    return !event.defaultPrevented && event.button === 0 && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
  }

  function hashTarget(hash) {
    if (!hash) return null;
    try { return document.getElementById(decodeURIComponent(hash.slice(1))); }
    catch (_) { return null; }
  }

  function routeKey(path) { return path.replace(/(?:\/index\.html)?\/+$/, '').replace(/\/index\.html$/, '') || '/'; }

  function bindAnchors(scope, home) {
    scope.on(document, 'click', event => {
      const link = event.target.closest?.('a[href]');
      if (!link || !plainClick(event) || link.matches('[data-fancybox], [download]') || (link.target && link.target !== '_self')) return;
      const next = new URL(link.href, location.href);
      if (next.origin !== location.origin || routeKey(next.pathname) !== routeKey(location.pathname)) return;
      const top = link.hasAttribute('data-ginka-top') || (home && link.matches('.menu-item-home > a, .journal-brand') && !next.search);
      const target = top ? 0 : hashTarget(next.hash);
      if (target === null || (!top && (next.search !== location.search || link.closest('.post-toc')))) return;
      // Native wheel and hash scrolling avoid competing scroll controllers.
      if (!top) return;
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: reduce.matches ? 'instant' : 'smooth' });
      const hash = top ? '' : next.hash;
      if (location.hash !== hash) {
        const url = new URL(location.href);
        url.hash = hash;
        // Change the deep link without adding a fake PJAX page to Back/Forward.
        history.replaceState(history.state ? { ...history.state, url: url.href } : null, '', url);
      }
    }, { capture: true });
  }

  function bindMasthead(scope) {
    let solid;
    const sync = () => {
      const next = scrollY > 28;
      if (next !== solid) { solid = next; body.classList.toggle('ginka-header-solid', next); }
    };
    scope.on(window, 'scroll', sync, { passive: true });
    sync();
    const path = routeKey(location.pathname);
    document.querySelectorAll('.main-menu > li > a, .journal-mobile-links a').forEach(link => {
      const url = new URL(link.href, location.href);
      if (url.origin === location.origin && !url.hash && routeKey(url.pathname) === path) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function bindIndex(scope) {
    const rows = [...scope.main.querySelectorAll('.entry-row')];
    const filters = scope.main.querySelector('.journal-filters');
    if (!rows.length) return;
    const pending = new Set();
    const running = new Map();
    let gap = 45;
    const observer = !reduce.matches && 'IntersectionObserver' in window && Element.prototype.animate
      ? new IntersectionObserver(entries => {
        entries.filter(entry => entry.isIntersecting).sort((a, b) => rows.indexOf(a.target) - rows.indexOf(b.target))
          .forEach(({ target }, index) => reveal(target, Math.min(index, 6) * gap));
      }, { threshold: 0.12 }) : null;

    function reveal(row, delay) {
      observer?.unobserve(row);
      if (!pending.delete(row)) return;
      row.classList.remove('ginka-await-reveal');
      if (!delay && row.contains(document.activeElement)) return;
      const animation = scope.animate(row, [
        { transform: 'translateY(14px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }
      ], { duration: 520, delay, fill: 'backwards' });
      running.set(row, animation);
      animation.finished.catch(() => {}).then(() => { if (running.get(row) === animation) running.delete(row); });
    }
    function arm() {
      if (!observer) return;
      rows.filter(row => !row.hidden).forEach(row => {
        row.classList.add('ginka-await-reveal');
        pending.add(row);
        observer.observe(row);
      });
    }
    function clear() {
      observer?.disconnect();
      pending.forEach(row => row.classList.remove('ginka-await-reveal'));
      pending.clear();
      running.forEach(anim => anim.cancel());
      running.clear();
    }
    scope.dispose(clear);
    scope.on(scope.main, 'focusin', event => {
      const row = event.target.closest('.entry-row');
      if (row) { reveal(row, 0); running.get(row)?.cancel(); }
    });
    arm();
    if (!filters) return;
    filters.hidden = false;
    const buttons = Array.from(filters.querySelectorAll('[data-journal-filter]'));
    const status = scope.main.querySelector('[data-filter-status]');
    const pagination = scope.main.querySelector('.journal-pagination');
    scope.on(filters, 'click', event => {
      const selected = event.target.closest('[data-journal-filter]');
      if (!selected || selected.getAttribute('aria-pressed') === 'true') return;
      const topic = selected.dataset.journalFilter;
      clear();
      for (const button of buttons) button.setAttribute('aria-pressed', String(button === selected));
      let count = 0;
      for (const row of rows) {
        row.hidden = topic === 'all' ? row.hasAttribute('data-filter-only') : !row.dataset.topics.split(' ').includes(topic);
        if (!row.hidden) count++;
      }
      if (pagination) pagination.hidden = topic !== 'all';
      if (status) status.textContent = `当前显示 ${count} 篇文章`;
      gap = 35;
      arm();
    });
  }

  function cleanup() {
    if (!current) return;
    current.destroy();
    current = null;
  }

  function mount() {
    cleanup();
    const main = document.querySelector('.main-inner');
    if (!main) return;
    current = pageScope(main);
    bindMasthead(current);
    bindAnchors(current, location.pathname === '/');
    bindIndex(current);
  }

  function discardTrip() {
    clearTimeout(settleTimer);
    trip?.main?.classList.remove('ginka-pjax-leaving');
    trip = null;
    body.classList.remove('ginka-pjax-travel');
  }

  function leave() {
    discardTrip();
    cleanup();
    const main = document.querySelector('.main-inner');
    trip = { main };
    body.classList.add('ginka-pjax-travel');
    if (!reduce.matches) {
      meter.dataset.state = 'loading';
      main?.classList.remove('ginka-pjax-arriving');
      main?.classList.add('ginka-pjax-leaving');
      // A slow request must not make the current content unreadable.
      settleTimer = setTimeout(() => main?.classList.remove('ginka-pjax-leaving'), 850);
    }
  }

  meter = document.createElement('div');
  meter.className = 'ginka-pjax-meter';
  meter.setAttribute('aria-hidden', 'true');
  meter.append(document.createElement('i'));
  body.append(meter);
  document.addEventListener('astro:before-preparation', leave);
  document.addEventListener('astro:after-swap', () => { body = document.body; body.append(meter); });
  document.addEventListener('astro:page-load', () => { discardTrip(); meter.removeAttribute('data-state'); mount(); });
  window.addEventListener('pagehide', () => { cleanup(); discardTrip(); meter.removeAttribute('data-state'); });
  window.addEventListener('pageshow', event => { if (event.persisted) mount(); });
  reduce.addEventListener('change', () => { if (!trip) mount(); });
  window.GinkaMotion = { cleanup };
  mount();
})();
