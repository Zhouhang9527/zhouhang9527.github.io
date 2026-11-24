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
    const art = hero.querySelector('.journal-hero-art');
    const picture = hero.querySelector('.journal-hero-image');
    const layer = hero.querySelector('.journal-hero-light');
    if (!art || !picture || !layer || reduce.matches) return;
    let visible = !('IntersectionObserver' in window);
    let paused = isPaused();
    let introPending = playIntro && scrollY < 60 && !location.hash;
    let cueTimer = 0;
    let dead = false;
    let cue = null;
    let oldImage = null;
    let fade = null;
    let stableSrc = art.complete && art.naturalWidth ? art.currentSrc : '';
    let pending = null;
    let serial = 0;
    const ns = 'http://www.w3.org/2000/svg';

    function svg(name, attrs, parent) {
      const node = document.createElementNS(ns, name);
      for (const [key, val] of Object.entries(attrs)) node.setAttribute(key, val);
      if (parent) parent.append(node);
      return node;
    }

    // All coordinates are in the original 640x360 composition, not percentages
    // of the viewport. Match object-fit:cover and its actual object-position.
    const stage = svg('svg', { viewBox: '0 0 640 360', class: 'ginka-sword-stage',
      'aria-hidden': 'true', focusable: 'false' }, layer);
    const defs = svg('defs', {}, stage);
    const clip = svg('clipPath', { id: 'ginka-blade-clip' }, defs);
    svg('path', { d: 'M-8 315 Q107 209 249 113 L259 126 Q116 220 -8 348 Z' }, clip);
    const soft = svg('radialGradient', { id: 'ginka-glint-soft' }, defs);
    svg('stop', { offset: '0', 'stop-color': '#f4fbff', 'stop-opacity': '.92' }, soft);
    svg('stop', { offset: '.24', 'stop-color': '#b8dfff', 'stop-opacity': '.35' }, soft);
    svg('stop', { offset: '1', 'stop-color': '#b8dfff', 'stop-opacity': '0' }, soft);
    const streak = svg('g', { 'clip-path': 'url(#ginka-blade-clip)' }, stage);
    const moving = svg('g', { class: 'ginka-sword-trace' }, streak);
    if (desktop.matches && hero.dataset.streakArt) {
      svg('image', { href: hero.dataset.streakArt, x: '-25', y: '-35', width: '50', height: '70',
        transform: 'rotate(50)' }, moving);
    } else {
      svg('ellipse', { rx: '31', ry: '5', transform: 'rotate(-40)', fill: 'url(#ginka-glint-soft)' }, moving);
      svg('path', { d: 'M-22 19 22 -19', stroke: '#e8f6ff', 'stroke-width': '1.3',
        'stroke-linecap': 'round' }, moving);
    }
    const star = svg('g', { class: 'ginka-sword-star' }, stage);
    // The original night CG has its strongest glint at (119, 216).
    if (desktop.matches && hero.dataset.glintArt) {
      svg('image', { href: hero.dataset.glintArt, x: '64', y: '185', width: '110', height: '62' }, star);
    } else {
      svg('ellipse', { cx: '119', cy: '216', rx: '37', ry: '10', fill: 'url(#ginka-glint-soft)' }, star);
      svg('path', { d: 'M91 216 Q116 215 119 205 Q122 215 147 216 Q122 217 119 227 Q116 217 91 216Z',
        fill: '#eaf6ff' }, star);
    }

    function positionStage() {
      const r = art.getBoundingClientRect();
      const h = hero.getBoundingClientRect();
      const style = getComputedStyle(art);
      const pos = style.objectPosition.split(/\s+/).map(v => parseFloat(v) / 100);
      const x = Number.isFinite(pos[0]) ? pos[0] : .62;
      const y = Number.isFinite(pos[1]) ? pos[1] : .36;
      const scale = Math.max(r.width / 640, r.height / 360);
      const width = 640 * scale, height = 360 * scale;
      stage.style.width = width + 'px';
      stage.style.height = height + 'px';
      stage.style.left = r.left - h.left + (r.width - width) * x + 'px';
      stage.style.top = r.top - h.top + (r.height - height) * y + 'px';
    }
    function stopCue() {
      clearTimeout(cueTimer);
      cueTimer = 0;
      if (cue) { cue.forEach(a => a?.cancel()); cue = null; }
      layer.classList.remove('ginka-sword-live');
    }
    function playCue() {
      if (!introPending || paused || !visible || !desktop.matches || !art.complete || !art.naturalWidth) return;
      introPending = false;
      cueTimer = setTimeout(() => {
        cueTimer = 0;
        if (dead || paused || !visible) return;
        positionStage();
        const b = stage.getBoundingClientRect();
        const h = hero.getBoundingClientRect();
        // On very narrow/wide crops the sword may be outside the visible image.
        const px = b.left + 119 / 640 * b.width, py = b.top + 216 / 360 * b.height;
        if (px < h.left || px > h.right || py < h.top || py > h.bottom) return;
        layer.classList.add('ginka-sword-live');
        cue = [
          scope.animate(moving, [
            { transform: 'translate(34px, 299px)', opacity: 0 },
            { transform: 'translate(75px, 260px)', opacity: .22, offset: .25 },
            { transform: 'translate(119px, 216px)', opacity: .34, offset: .53 },
            { transform: 'translate(235px, 137px)', opacity: 0 }
          ], { duration: 700, easing: 'linear' }),
          scope.animate(star, [
            { opacity: 0 }, { opacity: .38, offset: .3 }, { opacity: 0 }
          ], { duration: 450, delay: 270, easing: 'ease-out' })
        ];
        Promise.all(cue.filter(Boolean).map(a => a.finished.catch(() => {}))).then(() => {
          cue = null;
          if (!dead) layer.classList.remove('ginka-sword-live');
        });
      }, 680);
    }

    function dropOldImage() {
      fade?.cancel();
      fade = null;
      oldImage?.remove();
      oldImage = null;
    }
    function showOldImage(src) {
      if (!src || oldImage?.getAttribute('src') === src) return;
      dropOldImage();
      const node = document.createElement('img');
      node.className = 'journal-hero-art ginka-hero-previous';
      node.alt = '';
      node.setAttribute('aria-hidden', 'true');
      node.decoding = 'async';
      node.src = src;
      picture.after(node);
      // The previous image must share the same crop as the live picture.
      node.style.inset = getComputedStyle(picture).inset;
      oldImage = node;
    }
    function matching(src, desired) {
      return !!src && src.includes('hero-katana-' + desired + '-');
    }
    function settle() {
      if (!pending) {
        if (art.complete && art.naturalWidth) stableSrc = art.currentSrc;
        playCue();
        return;
      }
      const request = pending;
      if (request.settling || !art.complete || !art.naturalWidth || !matching(art.currentSrc, request.mode)) return;
      request.settling = true;
      Promise.resolve(art.decode ? art.decode() : undefined).catch(() => {}).then(() => {
        if (dead || pending !== request || !matching(art.currentSrc, request.mode)) return;
        stableSrc = art.currentSrc;
        pending = null;
        if (!oldImage || paused || !visible || reduce.matches || !oldImage.complete || !oldImage.naturalWidth) {
          dropOldImage();
          return;
        }
        const outgoing = oldImage;
        fade = scope.animate(outgoing, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, easing: 'ease-in-out' });
        if (!fade) { dropOldImage(); return; }
        fade.finished.catch(() => {}).then(() => {
          if (oldImage === outgoing) { outgoing.remove(); oldImage = null; fade = null; }
        });
      });
    }

    scope.on(art, 'load', settle);
    scope.on(art, 'error', () => { pending = null; dropOldImage(); });
    scope.on(document, 'ginka:themechange', event => {
      const mode = event.detail?.theme === 'moonlit' ? 'night' : 'day';
      if (pending?.mode === mode) return;
      if (!pending && matching(stableSrc, mode)) return;
      stopCue();
      introPending = false;
      hero.classList.remove('ginka-hero-intro');
      // Do not preload the opposite CG. Keep only the previously displayed
      // responsive candidate until the new one is decoded.
      if (!paused && visible && stableSrc) showOldImage(stableSrc);
      pending = { mode, id: ++serial, settling: false };
      settle();
    });
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (!visible) stopCue();
        else playCue();
      }, { threshold: .15 });
      observer.observe(hero);
      scope.dispose(() => observer.disconnect());
    }
    watchPause(scope, () => {
      paused = isPaused();
      if (paused) {
        stopCue();
        hero.classList.remove('ginka-hero-intro');
        if (!pending) dropOldImage();
      } else playCue();
    });
    scope.on(window, 'resize', () => { if (cue) positionStage(); }, { passive: true });
    if (introPending && !paused) {
      hero.classList.add('ginka-hero-intro');
      scope.on(art, 'animationend', () => hero.classList.remove('ginka-hero-intro'), { once: true });
    }
    playCue();
    scope.dispose(() => {
      dead = true;
      pending = null;
      stopCue();
      dropOldImage();
      stage.remove();
      hero.classList.remove('ginka-hero-intro', 'ginka-hero-playing');
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

  // 三张画幅并列：只接管 Fancybox 打开，不再有画幅切换状态。
  function bindGallery(scope, gallery) {
    scope.on(gallery, 'click', event => {
      if (!plainClick(event)) return;
      const link = event.target.closest('.journal-scene-card');
      if (!link) return;
      if (!window.Fancybox?.show) return; // 没有 Fancybox 时保留原生链接
      const links = [...gallery.querySelectorAll('.journal-scene-card')];
      const items = links.map(item => ({
        src: item.href,
        caption: item.dataset.caption,
        type: 'image'
      }));
      event.preventDefault();
      window.Fancybox.show(items, { startIndex: links.indexOf(link), triggerEl: link });
    }, { capture: true });
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
