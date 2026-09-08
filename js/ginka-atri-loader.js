(function () {
  'use strict';

  var runtime = window.GINKA_RUNTIME;
  var root = (window.CONFIG && window.CONFIG.root) || '/';
  var base = root.endsWith('/') ? root : root + '/';
  var state = 'idle';
  var promise = null;
  var injected = new Map();
  var LOAD_TIMEOUT_MS = 10000;
  var restore = document.createElement('button');
  restore.id = 'atri-restore';
  restore.type = 'button';
  restore.textContent = 'ATRI · 唤回';
  restore.hidden = true;
  restore.setAttribute('aria-controls', 'atri-live2d-widget');
  document.body.appendChild(restore);

  function isCollapsed() {
    if (window.ATRI) return !window.ATRI.isVisible;
    try { return localStorage.getItem('atri_collapsed') === '1'; } catch (_) { return false; }
  }

  function canLoad() {
    return window.innerWidth >= 1200 && !document.hidden && !isCollapsed();
  }

  function syncEntry() {
    restore.hidden = window.innerWidth < 1200 || (!isCollapsed() && state !== 'error');
    restore.disabled = state === 'loading';
    restore.textContent = state === 'error' ? 'ATRI · 重试' : 'ATRI · 唤回';
  }
  restore.addEventListener('click', function () {
    try { localStorage.setItem('atri_collapsed', '0'); } catch (_) {}
    if (window.ATRI) window.ATRI.setVisible(true);
    else start({ retry: true });
    syncEntry();
  });
  document.addEventListener('atri:visibility', syncEntry);
  window.addEventListener('resize', function () { syncEntry(); if (canLoad()) start(); });
  document.addEventListener('visibilitychange', function () { if (canLoad()) start(); });

  function setState(nextState, error) {
    state = nextState;
    window.GINKA_ATRI_LOADER.state = state;
    window.GINKA_ATRI_LOADER.error = error || null;
    syncEntry();
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
    if (!canLoad()) { syncEntry(); return false; }
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
          if (!canLoad()) { setState('idle'); promise = null; return false; }
          await loadScript(path);
        }
        await window.__ginkaAtriReady;
        if (!window.ATRI || !window.ATRI.model) throw new Error('ATRI model unavailable');
        setState('ready');
        return true;
      } catch (error) {
        var entryUrl = normalizeUrl('js/ginka-atri.js');
        var entry = injected.get(entryUrl);
        if (entry) entry.remove();
        injected.delete(entryUrl);
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
  syncEntry();

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
