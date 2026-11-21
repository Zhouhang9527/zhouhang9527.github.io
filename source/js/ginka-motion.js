(() => {
  'use strict';
  if (window.GinkaMotion) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');
  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
  const body = document.body;
  const html = document.documentElement;
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

  function isPaused() {
    return document.hidden || body.classList.contains('search-active') ||
      body.classList.contains('sidebar-active') || html.classList.contains('with-fancybox');
  }

  function watchPause(scope, listener) {
    const observer = new MutationObserver(listener);
    observer.observe(body, { attributes: true, attributeFilter: ['class'] });
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });
    scope.on(document, 'visibilitychange', listener);
    scope.dispose(() => observer.disconnect());
    listener();
  }

  function wheelScroll(scope) {
    if (reduce.matches || !desktop.matches || navigator.connection?.saveData || typeof window.Lenis !== 'function') return null;
    const lenis = new window.Lenis({
      lerp: 0.088, smoothWheel: true, syncTouch: false, autoRaf: false,
      prevent: node => node instanceof Element && node.matches(
        '[data-lenis-prevent], .search-popup, .search-pop-overlay, .sidebar, .fancybox__container, .journal-table-scroll, .journal-code, .journal-outline'
      )
    });
    let frame = 0;
    let paused = false;
    function cancel() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    }
    function advance(time) {
      frame = 0;
      if (paused) return;
      lenis.raf(time);
      if (lenis.isScrolling === 'smooth') frame = requestAnimationFrame(advance);
    }
    function kick() {
      if (paused || frame) return;
      // Prime Lenis's clock after idle rather than advancing by the idle time.
      lenis.raf(performance.now());
      frame = requestAnimationFrame(advance);
    }
    const unsubscribe = lenis.on('virtual-scroll', ({ event }) => {
      if (!event.ctrlKey && event.type === 'wheel') kick();
    });
    watchPause(scope, () => {
      const next = isPaused();
      if (next === paused) return;
      paused = next;
      if (paused) { cancel(); lenis.stop(); }
      else lenis.start();
    });
    scope.dispose(() => { cancel(); unsubscribe(); lenis.destroy(); });
    return {
      to(target) {
        if (paused) return false;
        const offset = typeof target === 'number' ? 0 : -(
          (parseFloat(getComputedStyle(html).scrollPaddingTop) || 0) +
          (parseFloat(getComputedStyle(target).scrollMarginTop) || 0)
        );
        lenis.resize();
        kick();
        lenis.scrollTo(target, { offset: Number.isFinite(offset) ? offset : 0 });
        return true;
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

  function bindAnchors(scope, scrolling, home) {
    scope.on(document, 'click', event => {
      const link = event.target.closest?.('a[href]');
      if (!link || !plainClick(event) || link.matches('[data-fancybox], [download]') || (link.target && link.target !== '_self')) return;
      const next = new URL(link.href, location.href);
      if (next.origin !== location.origin || routeKey(next.pathname) !== routeKey(location.pathname)) return;
      const top = link.hasAttribute('data-ginka-top') || (home && link.matches('.menu-item-home > a, .journal-brand') && !next.search);
      const target = top ? 0 : hashTarget(next.hash);
      if (target === null || (!top && (next.search !== location.search || link.closest('.post-toc')))) return;
      const smooth = scrolling?.to(target);
      if (!smooth && !top) return; // Keep native anchors on touch/reduced motion.
      event.preventDefault();
      if (!smooth) window.scrollTo({ top: 0, behavior: 'instant' });
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

  function bindHero(scope, hero, playIntro) {
    if (reduce.matches) return;
    const art = hero.querySelector('.hero-art');
    const image = hero.querySelector('.journal-hero-image');
    const dust = hero.querySelector('.journal-hero-dust');
    const button = hero.querySelector('.btn-art-primary');
    const pointer = desktop.matches && !!image && !!dust;
    let visible = false;
    let paused = false;
    let frame = 0;
    let x = 0, y = 0, toX = 0, toY = 0;
    let bx = 0, by = 0, toBX = 0, toBY = 0;
    let ripple;

    function clear() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      x = y = toX = toY = bx = by = toBX = toBY = 0;
      [image, dust, button].forEach(node => node?.style.removeProperty('translate'));
      ripple?.cancel();
    }
    function sync() {
      const playing = visible && !paused;
      hero.classList.toggle('ginka-hero-playing', playing);
      if (!playing) clear();
    }
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
      observer.observe(hero);
      scope.dispose(() => observer.disconnect());
    }
    watchPause(scope, () => {
      const next = isPaused();
      if (next !== paused) { paused = next; sync(); }
    });
    if (playIntro && scrollY < 60 && !location.hash && art) {
      hero.classList.add('ginka-hero-intro');
      scope.on(art, 'animationend', () => hero.classList.remove('ginka-hero-intro'), { once: true });
    }
    scope.dispose(() => { clear(); hero.classList.remove('ginka-hero-intro', 'ginka-hero-playing'); });
    if (!pointer) return;

    function advance() {
      frame = 0;
      if (!visible || paused) return;
      const approach = (from, to) => Math.abs(from - to) < 0.08 ? to : from + (to - from) * 0.055;
      x = approach(x, toX); y = approach(y, toY);
      bx = approach(bx, toBX); by = approach(by, toBY);
      image.style.translate = `${x}px ${y}px`;
      dust.style.translate = `${2 * x}px ${2 * y}px`;
      if (button) button.style.translate = `${bx}px ${by}px`;
      if (x !== toX || y !== toY || bx !== toBX || by !== toBY) frame = requestAnimationFrame(advance);
    }
    function kick() { if (!frame && visible && !paused) frame = requestAnimationFrame(advance); }
    function position(value, start, length) { return Math.max(-1, Math.min(1, 2 * (value - start) / length - 1)); }
    scope.on(hero, 'pointermove', event => {
      if (event.pointerType !== 'mouse' || !visible || paused) return;
      const box = hero.getBoundingClientRect();
      toX = -9 * position(event.clientX, box.left, box.width);
      toY = -9 * position(event.clientY, box.top, box.height);
      toBX = toBY = 0;
      if (button?.contains(event.target)) {
        const rect = button.getBoundingClientRect();
        toBX = 3.5 * position(event.clientX + bx, rect.left, rect.width);
        toBY = 3.5 * position(event.clientY + by, rect.top, rect.height);
      }
      kick();
    }, { passive: true });
    scope.on(hero, 'pointerleave', () => { toX = toY = toBX = toBY = 0; kick(); });
    if (!button) return;
    scope.on(button, 'click', event => {
      // The delegated anchor handler may have already prevented navigation.
      if (!event.detail || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || !button.animate) return;
      const rect = button.getBoundingClientRect();
      const ring = document.createElement('span');
      ripple?.cancel();
      ring.className = 'ginka-water-ring';
      ring.style.left = `${event.clientX - rect.left}px`;
      ring.style.top = `${event.clientY - rect.top}px`;
      button.append(ring);
      ripple = scope.animate(ring, [
        { transform: 'translate(-50%, -50%) scale(.2)', opacity: .72 },
        { transform: 'translate(-50%, -50%) scale(14)', opacity: 0 }
      ], { duration: 450 });
      ripple.finished.catch(() => {}).then(() => ring.remove());
    }, { capture: true });
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

  function bindGallery(scope, gallery) {
    const mat = gallery.querySelector('.art-mat');
    const plates = [...gallery.querySelectorAll('[data-plate]')];
    const thumbs = [...gallery.querySelectorAll('[data-plate-select]')];
    const caption = mat.querySelector('.art-caption');
    let inView = false;
    let active = plates.find(plate => plate.classList.contains('is-active'));
    const play = () => gallery.classList.toggle('ginka-gallery-playing', inView && !isPaused());
    function select(id) {
      const plate = plates.find(item => item.dataset.plate === id);
      if (!plate || plate === active) return;
      active = plate;
      if (!reduce.matches) active.classList.add('ginka-plate-primed');
      for (const slide of plates) {
        slide.classList.toggle('is-active', slide === active);
        slide.toggleAttribute('inert', slide !== active);
        if (slide === active) { slide.removeAttribute('aria-hidden'); slide.removeAttribute('tabindex'); }
        else { slide.setAttribute('aria-hidden', 'true'); slide.tabIndex = -1; }
      }
      for (const thumb of thumbs) {
        if (thumb.dataset.plateSelect === id) thumb.setAttribute('aria-current', 'true');
        else thumb.removeAttribute('aria-current');
      }
      caption.textContent = `PLATE ${id} · ${plate.dataset.plateTitle}`;
    }
    // A gallery image is an ordinary link without JS. With Fancybox, run its
    // handler before Pjax can mistake the local JPG/WebP for an HTML route.
    scope.on(gallery, 'click', event => {
      if (!plainClick(event)) return;
      const thumb = event.target.closest('[data-plate-select]');
      if (thumb) { event.preventDefault(); select(thumb.dataset.plateSelect); return; }
      const slide = event.target.closest('[data-plate].is-active');
      if (!slide) return;
      if (!window.Fancybox?.show) { event.stopPropagation(); return; }
      event.preventDefault();
      window.Fancybox.show(plates.map(item => ({ src: item.href, caption: item.dataset.caption, type: 'image' })), {
        startIndex: plates.indexOf(slide), triggerEl: slide
      });
    }, { capture: true });
    scope.on(gallery, 'keyup', event => {
      if (event.key === 'Enter' && event.target.closest('[data-plate], [data-plate-select]')) event.preventDefault();
    }, { capture: true });
    if (reduce.matches || !('IntersectionObserver' in window)) return;
    active?.classList.add('ginka-plate-primed');
    const reveal = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      reveal.unobserve(mat);
      mat.classList.remove('ginka-mat-pending');
      mat.classList.add('ginka-mat-seen');
    }, { threshold: 0.12 });
    const visible = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; play(); });
    mat.classList.add('ginka-mat-pending');
    reveal.observe(mat);
    visible.observe(mat);
    watchPause(scope, play);
    scope.dispose(() => {
      reveal.disconnect();
      visible.disconnect();
      mat.classList.remove('ginka-mat-pending', 'ginka-mat-seen');
      gallery.classList.remove('ginka-gallery-playing');
      plates.forEach(plate => plate.classList.remove('ginka-plate-primed'));
    });
  }

  function cleanup() {
    if (!current) return;
    current.destroy();
    current = null;
  }

  function mount(playIntro) {
    cleanup();
    const main = document.querySelector('.main-inner');
    if (!main) return;
    current = pageScope(main);
    const hero = main.querySelector('.journal-hero');
    bindMasthead(current);
    bindAnchors(current, wheelScroll(current), !!hero);
    if (!hero) return;
    bindIndex(current);
    bindHero(current, hero, playIntro);
    const gallery = main.querySelector('[data-journal-gallery]');
    if (gallery) bindGallery(current, gallery);
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

  function arrive(event) {
    const navigation = trip;
    if (!navigation) return;
    // Pjax updates the history before dispatching complete but applies its own
    // scroll position afterwards. Offset hash targets only after that step.
    queueMicrotask(() => {
      if (trip !== navigation) return;
      const main = document.querySelector('.main-inner');
      const replaced = main && main !== navigation.main;
      discardTrip();
      if (reduce.matches) meter.removeAttribute('data-state');
      else meter.dataset.state = 'done';
      if (replaced && event.history !== false) {
        const target = hashTarget(location.hash);
        if (target) target.scrollIntoView({ block: 'start', behavior: 'instant' });
        else window.scrollTo({ top: 0, behavior: 'instant' });
      }
      mount(replaced);
      if (replaced && !reduce.matches) main.classList.add('ginka-pjax-arriving');
    });
  }

  meter = document.createElement('div');
  meter.className = 'ginka-pjax-meter';
  meter.setAttribute('aria-hidden', 'true');
  meter.append(document.createElement('i'));
  body.append(meter);
  document.addEventListener('pjax:send', leave);
  document.addEventListener('pjax:complete', arrive);
  document.addEventListener('pjax:error', arrive);
  window.addEventListener('pagehide', () => { cleanup(); discardTrip(); meter.removeAttribute('data-state'); });
  window.addEventListener('pageshow', event => { if (event.persisted) mount(false); });
  [reduce, desktop].forEach(query => query.addEventListener('change', () => {
    if (!trip) mount(false);
  }));
  window.GinkaMotion = { cleanup };
  mount(true);
})();
