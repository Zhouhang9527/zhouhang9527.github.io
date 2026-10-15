(function () {
  'use strict';

  if (window.GINKA_RUNTIME) return;
  const assets = new Map();
  let hasInteracted = false;
  const interactionEvents = ['pointerdown', 'keydown', 'touchstart', 'wheel'];
  interactionEvents.forEach(event => document.addEventListener(event, () => { hasInteracted = true; }, { once: true, capture: true, passive: true }));

  function hasMatchMedia(query) {
    try {
      return !!(window.matchMedia && window.matchMedia(query).matches);
    } catch (_error) {
      return false;
    }
  }

  function getConnection() {
    return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
  }

  function isLowPowerDevice() {
    const connection = getConnection();
    const slowNetwork = !!(connection && /(?:^|slow-)?2g/.test(String(connection.effectiveType || '')));
    const saveData = !!(connection && connection.saveData);
    const touchOnly = hasMatchMedia('(hover: none) and (pointer: coarse)');
    const reducedMotion = hasMatchMedia('(prefers-reduced-motion: reduce)');
    const smallScreen = Math.min(window.innerWidth || 0, screen.width || 0) > 0
      ? Math.min(window.innerWidth || screen.width, screen.width || window.innerWidth) <= 768
      : (window.innerWidth || 0) <= 768;

    return slowNetwork || saveData || touchOnly || reducedMotion || smallScreen;
  }

  function runOnLoad(task) {
    if (document.readyState === 'complete' || document.body) {
      task();
      return;
    }
    window.addEventListener('load', task, { once: true });
  }

  function scheduleBackgroundTask(name, task, options) {
    const opt = options || {};
    const timeout = Math.max(300, Number(opt.timeout) || 1800);
    const requireInteraction = !!opt.requireInteraction;
    let started = false;
    let scheduled = false;

    function start() {
      if (started) return;
      if (document.hidden) {
        document.addEventListener('visibilitychange', function resume() {
          if (document.hidden) return;
          document.removeEventListener('visibilitychange', resume);
          start();
        });
        return;
      }
      started = true;
      interactionEvents.forEach((eventName) => {
        document.removeEventListener(eventName, enqueue, true);
      });
      try {
        const result = task();
        if (result && typeof result.catch === 'function') {
          result.catch(function(error) {
            console.warn(`[GINKA Runtime] ${name || 'task'} failed:`, error);
          });
        }
      } catch (error) {
        console.warn(`[GINKA Runtime] ${name || 'task'} failed:`, error);
      }
    }

    function enqueue() {
      if (scheduled || started) return;
      scheduled = true;
      interactionEvents.forEach(event => document.removeEventListener(event, enqueue, true));
      runOnLoad(function () {
        if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: timeout });
        else window.setTimeout(start, Math.min(timeout, 300));
      });
    }
    if (requireInteraction && !hasInteracted) interactionEvents.forEach(event => document.addEventListener(event, enqueue, { capture: true, once: true, passive: true }));
    else enqueue();

    return start;
  }

  function loadAsset(path, type) {
    const url = new URL(path, location.href).href;
    if (assets.has(url)) return assets.get(url);
    const promise = new Promise((resolve, reject) => {
      const node = document.createElement(type === 'script' ? 'script' : 'link');
      const timeout = setTimeout(() => fail(new Error('Timed out loading ' + path)), 15000);
      function fail(error) {
        clearTimeout(timeout); node.onload = node.onerror = null;
        node.remove(); assets.delete(url); reject(error);
      }
      node.onload = () => { clearTimeout(timeout); node.onload = node.onerror = null; resolve(node); };
      node.onerror = () => fail(new Error('Unable to load ' + path));
      if (type === 'script') { node.src = url; node.async = true; }
      else { node.rel = 'stylesheet'; node.href = url; }
      document.head.appendChild(node);
    });
    assets.set(url, promise);
    return promise;
  }

  const runtime = {
    isLowPower: isLowPowerDevice(),
    scheduleBackgroundTask: scheduleBackgroundTask,
    get hasInteracted() { return hasInteracted; },
    loadScript: path => loadAsset(path, 'script'),
    loadStylesheet: path => loadAsset(path, 'style')
  };

  if (runtime.isLowPower) {
    document.documentElement.classList.add('ginka-low-power');
  }

  window.GINKA_RUNTIME = runtime;
  if ('serviceWorker' in navigator) {
    scheduleBackgroundTask('service-worker', () => navigator.serviceWorker.register('/sw.js').catch(() => {}), { timeout: 1800 });
  }
})();
