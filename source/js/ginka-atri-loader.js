(function () {
  'use strict';

  if (window.__ginkaAtriLoaderBooted) return;
  window.__ginkaAtriLoaderBooted = true;

  var root = (window.CONFIG && window.CONFIG.root) || '/';
  var base = root.endsWith('/') ? root : root + '/';
  var shell = document.getElementById('atri-launcher-shell');
  var badge = document.getElementById('atri-launcher');
  var status = document.getElementById('atri-launcher-status');
  var widget = document.getElementById('atri-live2d-widget');
  var controllerPath = badge && badge.getAttribute('data-atri-script') || 'js/ginka-atri.js';
  var state = 'idle';
  var promise = null;
  var pageHome = false;
  var pageEpoch = Number(window.GINKA_ATRI_PAGE_EPOCH) || 0;
  var requestSerial = 0;
  var injected = new Map();
  window.GINKA_ATRI_PAGE_EPOCH = pageEpoch;
  var LOAD_TIMEOUT_MS = 12000;

  function safeStorageSet(key, value) {
    try { window.localStorage.setItem(key, value); } catch (_error) {}
  }

  function safeStorageRemove(key) {
    try { window.localStorage.removeItem(key); } catch (_error) {}
  }

  // Clear only the retired ATRI drag coordinate and force the new collapsed default.
  safeStorageRemove('atri_widget_pos');
  safeStorageSet('atri_collapsed', '1');

  function normalizedPath(path) {
    var value = String(path || '/').replace(/\/{2,}/g, '/');
    if (value.length > 1) value = value.replace(/\/+$/, '');
    return value || '/';
  }

  function isJournalHome() {
    if (!document.querySelector('.journal-hero') || document.querySelector('.post')) return false;
    try {
      var homePath = new URL(base, window.location.href).pathname;
      return normalizedPath(window.location.pathname) === normalizedPath(homePath);
    } catch (_error) {
      return normalizedPath(window.location.pathname) === normalizedPath(base);
    }
  }

  function canLoad() {
    return pageHome && !document.hidden;
  }

  function isVisible() {
    return !!(window.ATRI && window.ATRI.isVisible);
  }

  function setState(nextState, error) {
    state = nextState;
    if (window.GINKA_ATRI_LOADER) {
      window.GINKA_ATRI_LOADER.state = state;
      window.GINKA_ATRI_LOADER.error = error || null;
    }
    syncUi();
  }

  function syncUi() {
    var visible = isVisible();
    var loading = state === 'loading';
    var failed = state === 'error';
    if (shell) shell.hidden = !pageHome || document.hidden || visible;
    if (badge) {
      badge.setAttribute('aria-expanded', String(visible));
      badge.setAttribute('aria-label', loading ? '正在加载看板娘' : failed ? '重试打开看板娘' : '打开看板娘');
      if (loading) badge.setAttribute('aria-disabled', 'true');
      else badge.removeAttribute('aria-disabled');
    }
    if (status) {
      var message = loading ? '正在加载…' : failed ? '加载失败，点蝴蝶重试' : '';
      if (status.textContent !== message) status.textContent = message;
    }
    if (widget) {
      widget.hidden = !pageHome || !visible;
      widget.setAttribute('aria-hidden', String(!pageHome || !visible));
    }
  }

  function collapseWithoutFocus() {
    safeStorageSet('atri_collapsed', '1');
    if (window.ATRI && typeof window.ATRI.setVisible === 'function') {
      window.ATRI.setVisible(false, { focus: false, silentMessage: true });
    }
  }

  function syncPageState() {
    var nextHome = isJournalHome() && !document.hidden;
    if (!nextHome) {
      if (pageHome) {
        pageEpoch += 1;
        window.GINKA_ATRI_PAGE_EPOCH = pageEpoch;
      }
      if (pageHome || isVisible()) collapseWithoutFocus();
      pageHome = false;
      document.documentElement.classList.remove('ginka-atri-home');
      syncUi();
      return;
    }

    var enteredHome = !pageHome;
    pageHome = true;
    document.documentElement.classList.add('ginka-atri-home');
    if (enteredHome) collapseWithoutFocus();
    syncUi();
  }

  function normalizeUrl(path) {
    if (/^(?:https?:)?\/\//.test(path) || String(path).startsWith('/')) return path;
    return base + String(path || '').replace(/^\//, '');
  }

  function cleanupScript(url) {
    var script = injected.get(url);
    if (script && script.parentNode && script.dataset.ginkaLoaded !== '1') {
      script.parentNode.removeChild(script);
    }
    if (script && script.dataset.ginkaLoaded !== '1') injected.delete(url);
  }

  function loadScript(path, forceReload) {
    var url = normalizeUrl(path);
    var existing = injected.get(url) || document.querySelector('script[data-ginka-atri-src="' + url + '"]');
    if (forceReload && existing && existing.dataset.ginkaLoaded === '1') {
      existing.remove();
      injected.delete(url);
      existing = null;
    }
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
    if (!canLoad()) return false;
    if (state === 'ready' && window.ATRI && window.ATRI.model) return true;
    if (state === 'loading' && promise) return promise;
    if (state === 'error' && !opt.retry) return false;

    var requestId = ++requestSerial;
    var requestEpoch = pageEpoch;
    function isStaleRequest() {
      return requestId !== requestSerial || requestEpoch !== pageEpoch || !canLoad();
    }
    function abandonRequest() {
      if (requestId === requestSerial) {
        setState('idle');
        promise = null;
      }
      return false;
    }

    setState('loading');
    promise = (async function () {
      try {
        for (var path of [
          'js/live2d-libs/live2d.min.js',
          'js/live2d-libs/live2dcubismcore.min.js',
          'js/live2d-libs/pixi.min.js',
          'js/live2d-libs/pixi-live2d-display.min.js',
          controllerPath
        ]) {
          if (isStaleRequest()) return abandonRequest();
          await loadScript(path, path === controllerPath && !(window.ATRI && window.ATRI.model) && !window.__ginkaAtriBooting);
          if (isStaleRequest()) return abandonRequest();
        }
        await window.__ginkaAtriReady;
        if (isStaleRequest()) return abandonRequest();
        if (!window.ATRI || !window.ATRI.model) throw new Error('ATRI model unavailable');
        setState('ready');
        return true;
      } catch (error) {
        if (isStaleRequest()) return abandonRequest();
        var entryUrl = normalizeUrl(controllerPath);
        var atriScript = injected.get(entryUrl);
        if (atriScript && atriScript.dataset.ginkaLoaded !== '1') atriScript.remove();
        injected.delete(entryUrl);
        setState('error', error);
        promise = null;
        console.warn('[ATRI] Optional widget could not load:', error);
        return false;
      }
    })();

    return promise;
  }

  async function openWidget() {
    if (!canLoad() || isVisible() || state === 'loading') return;
    var launchEpoch = pageEpoch;
    var reuseModel = !!(window.ATRI && window.ATRI.model);
    if (!reuseModel && !await start({ retry: state === 'error' })) return;
    if (!canLoad() || launchEpoch !== pageEpoch) return;

    var atri = window.ATRI;
    if (!atri || typeof atri.setVisible !== 'function') return;
    atri.pageEpoch = pageEpoch;
    if (reuseModel && !atri.voicePlayer && typeof atri.scheduleVoiceInit === 'function') atri.scheduleVoiceInit();
    if (state !== 'ready') setState('ready');
    atri.setVisible(true);
  }

  if (badge) badge.addEventListener('click', openWidget);
  document.addEventListener('atri:visibility', syncUi);
  document.addEventListener('pjax:send', function () {
    // Hide synchronously before PJAX swaps the view; no late load may reveal ATRI off-home.
    pageEpoch += 1;
    requestSerial += 1;
    window.GINKA_ATRI_PAGE_EPOCH = pageEpoch;
    promise = null;
    if (state === 'loading') setState('idle');
    pageHome = false;
    document.documentElement.classList.remove('ginka-atri-home');
    collapseWithoutFocus();
    syncUi();
  });
  ['pjax:success', 'pjax:complete', 'page:loaded', 'pjax:error'].forEach(function (eventName) {
    document.addEventListener(eventName, syncPageState);
  });
  document.addEventListener('visibilitychange', syncPageState);
  window.addEventListener('pagehide', function () {
    pageEpoch += 1;
    requestSerial += 1;
    window.GINKA_ATRI_PAGE_EPOCH = pageEpoch;
    promise = null;
    if (state === 'loading') setState('idle');
    pageHome = false;
    document.documentElement.classList.remove('ginka-atri-home');
    collapseWithoutFocus();
    syncUi();
  });
  window.addEventListener('pageshow', syncPageState);

  window.GINKA_ATRI_LOADER = {
    state: state,
    error: null,
    start: start,
    retry: function () { return start({ retry: true }); },
    isHome: function () { return pageHome; }
  };

  syncPageState();
})();
