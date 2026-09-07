(function () {
  'use strict';

  var runtime = window.GINKA_RUNTIME;
  var root = (window.CONFIG && window.CONFIG.root) || '/';
  var base = root.endsWith('/') ? root : root + '/';
  var started = false;

  function loadScript(path) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = base + path;
      script.onload = resolve;
      script.onerror = function () { reject(new Error('Unable to load ' + path)); };
      document.head.appendChild(script);
    });
  }

  async function start() {
    if (started) return;
    started = true;
    try {
      // Preserve the dependency order without blocking HTML parsing.
      for (var path of [
        'js/live2d-libs/live2d.min.js',
        'js/live2d-libs/live2dcubismcore.min.js',
        'js/live2d-libs/pixi.min.js',
        'js/live2d-libs/pixi-live2d-display.min.js',
        'js/ginka-atri.js?v=20260907'
      ]) {
        await loadScript(path);
      }
    } catch (error) {
      console.warn('[ATRI] Optional widget could not load:', error);
    }
  }

  if (runtime) {
    runtime.scheduleBackgroundTask('atri-widget', start, {
      timeout: 2400,
      requireInteraction: runtime.isLowPower
    });
  } else {
    window.addEventListener('load', start, { once: true });
  }
})();
