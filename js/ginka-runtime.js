(function () {
  'use strict';

  if (window.GINKA_RUNTIME) return;

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
    if (document.readyState === 'complete') {
      task();
      return;
    }
    window.addEventListener('load', task, { once: true });
  }

  function scheduleBackgroundTask(name, task, options) {
    const opt = options || {};
    const timeout = Math.max(300, Number(opt.timeout) || 1800);
    const requireInteraction = !!opt.requireInteraction;
    const interactionEvents = ['pointerdown', 'keydown', 'touchstart'];
    let started = false;

    function start() {
      if (started) return;
      started = true;
      interactionEvents.forEach((eventName) => {
        document.removeEventListener(eventName, start, true);
      });
      try {
        task();
      } catch (error) {
        console.warn(`[GINKA Runtime] ${name || 'task'} failed:`, error);
      }
    }

    if (requireInteraction) {
      interactionEvents.forEach((eventName) => {
        document.addEventListener(eventName, start, { capture: true, once: true });
      });
      return start;
    }

    runOnLoad(function () {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(start, { timeout: timeout });
        return;
      }
      window.setTimeout(start, Math.min(timeout, 1200));
    });

    return start;
  }

  const runtime = {
    isLowPower: isLowPowerDevice(),
    scheduleBackgroundTask: scheduleBackgroundTask
  };

  window.GINKA_RUNTIME = runtime;
})();
