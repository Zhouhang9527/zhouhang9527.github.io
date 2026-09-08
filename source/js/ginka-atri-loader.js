(function () {
  'use strict';

  var runtime = window.GINKA_RUNTIME;
  var root = (window.CONFIG && window.CONFIG.root) || '/';
  var base = root.endsWith('/') ? root : root + '/';
  var state = 'idle';
  var promise = null;
  var injected = new Map();
  var LOAD_TIMEOUT_MS = 10000;

  function setState(nextState, error) {
    state = nextState;
    window.GINKA_ATRI_LOADER.state = state;
    window.GINKA_ATRI_LOADER.error = error || null;
  }

  function normalizeUrl(path) {
    if (/^(?:https?:)?\/\//.test(path)) return path;
    return base + String(path || '').replace(/^\//, '');
  }

  function cleanupScript(url) {
    var script = injected.get(url);
    if (script && script.parentNode && script.dataset.ginkaLoaded !== '1') {
      script.parentNode.removeChild(script);
    }
    if (script && script.dataset.ginkaLoaded !== '1') {
      injected.delete(url);
    }
  }

  function loadScript(path) {
    var url = normalizeUrl(path);
    var existing = injected.get(url) || document.querySelector('script[data-ginka-atri-src="' + url + '"]');
    if (existing && existing.dataset.ginkaLoaded === '1') {
      injected.set(url, existing);
      return Promise.resolve(existing);
    }
    if (existing && existing.dataset.ginkaLoading === '1' && existing.__ginkaLoadPromise) {
      return existing.__ginkaLoadPromise;
    }

    var script = existing || document.createElement('script');
    script.src = url;
    script.async = false;
    script.setAttribute('data-ginka-atri-src', url);
    script.dataset.ginkaLoading = '1';

    var loadPromise = new Promise(function (resolve, reject) {
      var timer = window.setTimeout(function () {
        script.dataset.ginkaLoading = '0';
        cleanupScript(url);
        reject(new Error('Timed out loading ' + path));
      }, LOAD_TIMEOUT_MS);

      script.onload = function () {
        window.clearTimeout(timer);
        script.dataset.ginkaLoaded = '1';
        script.dataset.ginkaLoading = '0';
        resolve(script);
      };

      script.onerror = function () {
        window.clearTimeout(timer);
        script.dataset.ginkaLoading = '0';
        cleanupScript(url);
        reject(new Error('Unable to load ' + path));
      };
    });

    script.__ginkaLoadPromise = loadPromise;
    injected.set(url, script);
    if (!script.parentNode) document.head.appendChild(script);
    return loadPromise;
  }

  async function start(options) {
    var opt = options || {};
    if (state === 'ready') return true;
    if (state === 'loading' && promise) return promise;
    if (state === 'error' && !opt.retry) return false;

    setState('loading');
    promise = (async function () {
      try {
        for (var path of [
          'js/live2d-libs/live2d.min.js',
          'js/live2d-libs/live2dcubismcore.min.js',
          'js/live2d-libs/pixi.min.js',
          'js/live2d-libs/pixi-live2d-display.min.js',
          'js/ginka-atri.js'
        ]) {
          await loadScript(path);
        }
        setState('ready');
        return true;
      } catch (error) {
        setState('error', error);
        promise = null;
        console.warn('[ATRI] Optional widget could not load:', error);
        return false;
      }
    })();

    return promise;
  }

  function retry() {
    return start({ retry: true });
  }

  window.GINKA_ATRI_LOADER = {
    state: state,
    error: null,
    start: start,
    retry: retry
  };

  if (runtime) {
    runtime.scheduleBackgroundTask('atri-widget', start, {
      timeout: 2400,
      requireInteraction: runtime.isLowPower
    });
  } else if (document.readyState === 'complete') {
    window.setTimeout(start, 0);
  } else {
    window.addEventListener('load', start, { once: true });
  }
})();
