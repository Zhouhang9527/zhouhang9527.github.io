/* GINKA · 月夜篇主题控制
   三种状态：system / moonlit / day，写在 <html data-theme-mode>，解析结果写在 data-theme。
   依赖 ginka-theme-init.js 在首屏先把 data-theme 定好，这里负责切换、持久化和同步。 */
(function () {
  var STORAGE_KEY = 'ginka-theme';
  var MODES = ['system', 'moonlit', 'day'];
  var LABELS = { system: '跟随系统', moonlit: '月夜', day: '日间' };
  var ICONS = {
    system: '<path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10 1.4 1.4m0-12.8-1.4 1.4m-10 10L5.6 18.4"/><circle cx="12" cy="12" r="4"/>',
    moonlit: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>',
    day: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.2m0 14.4v2.2M2.6 12h2.2m14.4 0h2.2M5.4 5.4l1.6 1.6m10 10 1.6 1.6m0-13.2-1.6 1.6m-10 10L5.4 18.6"/>'
  };
  var media = window.matchMedia('(prefers-color-scheme: dark)');
  var root = document.documentElement;

  function readMode() {
    try {
      var stored = window.localStorage.getItem(STORAGE_KEY);
      return MODES.indexOf(stored) === -1 ? 'system' : stored;
    } catch (error) {
      return 'system';
    }
  }

  function resolve(mode) {
    if (mode === 'system') return media.matches ? 'moonlit' : 'day';
    return mode;
  }

  // Giscus is cross-origin. Set the initial configuration before its lazy
  // loader runs, and repeat after the iframe handshake (including PJAX).
  var giscusFrames = new WeakMap();
  var giscusVerified = new Map();
  var giscusPending = new Map();
  function giscusTheme(resolved) {
    var fallback = resolved === 'moonlit' ? 'dark_dimmed' : 'light';
    var meta = document.querySelector('meta[name="ginka-giscus-theme-base"]');
    var configured = meta && meta.content;
    if (!configured && location.protocol !== 'https:') return fallback;
    try {
      var base = configured || new URL('css/', location.origin + (window.CONFIG?.root || '/')).href;
      var url = new URL('giscus-' + (resolved === 'moonlit' ? 'moonlit' : 'day') + '.css', base);
      if (url.protocol !== 'https:') return fallback;
      var build = document.querySelector('meta[name="ginka-build"]')?.content;
      if (build) url.searchParams.set('v', build);
      // Check custom CSS availability. A broken theme must not make comments unreadable.
      var key = url.href;
      if (giscusVerified.get(key)) return key;
      if (!giscusPending.has(key)) {
        var pending = fetch(key, { mode: 'cors', credentials: 'omit' })
          .then(function (response) {
            var mime = response.headers.get('content-type') || '';
            var cors = response.headers.get('access-control-allow-origin');
            var sameOrigin = url.origin === location.origin;
            return response.ok && /text\/css/i.test(mime) &&
              (!sameOrigin || cors === '*' || cors === 'https://giscus.app');
          }).catch(function () { return false; })
          .then(function (ok) {
            giscusVerified.set(key, ok);
            if (ok) syncGiscus(root.getAttribute('data-theme'));
          });
        giscusPending.set(key, pending);
      }
      return fallback;
    } catch (error) {
      return fallback;
    }
  }

  function sendGiscus(frame, selected, force) {
    if (!frame.contentWindow) return;
    if (!force && giscusFrames.get(frame) === selected) return;
    giscusFrames.set(frame, selected);
    frame.contentWindow.postMessage({ giscus: { setConfig: { theme: selected } } }, 'https://giscus.app');
  }

  function syncGiscus(resolved) {
    var selected = giscusTheme(resolved);
    if (window.CONFIG && window.CONFIG.giscus) window.CONFIG.giscus.theme = selected;
    var frames = document.querySelectorAll('iframe.giscus-frame');
    for (var index = 0; index < frames.length; index += 1) {
      sendGiscus(frames[index], selected, false);
    }
  }

  function bindGiscus() {
    // The load event is captured because iframe load does not bubble.
    document.addEventListener('load', function (event) {
      var frame = event.target;
      if (frame && frame.matches && frame.matches('iframe.giscus-frame')) {
        sendGiscus(frame, giscusTheme(root.getAttribute('data-theme')), true);
      }
    }, true);
    var ready = new WeakSet();
    window.addEventListener('message', function (event) {
      if (event.origin !== 'https://giscus.app' || !event.data || !event.data.giscus) return;
      var frames = document.querySelectorAll('iframe.giscus-frame');
      for (var i = 0; i < frames.length; i += 1) {
        var frame = frames[i];
        if (frame.contentWindow !== event.source || ready.has(frame)) continue;
        ready.add(frame);
        sendGiscus(frame, giscusTheme(root.getAttribute('data-theme')), true);
      }
    });
    document.addEventListener('page:loaded', function () {
      syncGiscus(root.getAttribute('data-theme'));
    }, true);
  }

  function syncButtons(mode) {
    var buttons = document.querySelectorAll('[data-ginka-theme-toggle]');
    for (var index = 0; index < buttons.length; index += 1) {
      var button = buttons[index];
      var label = button.querySelector('.journal-theme-toggle-label');
      var next = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
      if (label) label.textContent = LABELS[mode];
      button.setAttribute('aria-label', '当前主题：' + LABELS[mode] + '，点击切换到' + LABELS[next]);
      button.setAttribute('title', '当前主题：' + LABELS[mode]);
      button.setAttribute('data-theme-state', mode);
      var svg = button.querySelector('svg');
      if (svg) svg.innerHTML = ICONS[mode];
    }
  }

  function syncScenes(resolved) {
    // The drawer survives PJAX. Read its artwork from the newly swapped main.
    var main = document.getElementById('main-content');
    var cover = document.querySelector('#journal-sidebar [data-sidebar-src-day]');
    if (main && cover) {
      var day = main.getAttribute('data-sidebar-scene-day');
      var night = main.getAttribute('data-sidebar-scene-night');
      if (day && night) {
        cover.setAttribute('data-sidebar-src-day', day);
        cover.setAttribute('data-sidebar-src-night', night);
        var chosen = resolved === 'moonlit' ? night : day;
        if (document.body.classList.contains('sidebar-active') && cover.getAttribute('src') !== chosen) cover.src = chosen;
      }
    }
    var links = document.querySelectorAll('.journal-scene-card[data-full-day]');
    for (var index = 0; index < links.length; index += 1) {
      var link = links[index];
      var full = resolved === 'moonlit' ? link.getAttribute('data-full-night') : link.getAttribute('data-full-day');
      if (full) link.setAttribute('href', full);
    }
    // 首屏用 <picture> + prefers-color-scheme 只下载一张；用户手动改了主题时，
    // 去掉 <source> 直接改 img，避免浏览器继续按系统偏好挑图。
    var hero = document.querySelector('.journal-hero-image .journal-hero-art[data-src-day]');
    if (!hero) return;
    var picture = hero.parentElement;
    var sources = picture && picture.tagName === 'PICTURE' ? picture.querySelectorAll('source') : null;
    if (sources && sources.length) {
      for (var i = 0; i < sources.length; i += 1) sources[i].parentNode.removeChild(sources[i]);
    }
    var night = resolved === 'moonlit';
    var src = hero.getAttribute(night ? 'data-src-night' : 'data-src-day');
    var srcset = hero.getAttribute(night ? 'data-srcset-night' : 'data-srcset-day');
    if (src && hero.getAttribute('src') !== src) hero.setAttribute('src', src);
    if (srcset && hero.getAttribute('srcset') !== srcset) hero.setAttribute('srcset', srcset);
  }

  function apply(mode, persist) {
    var resolved = resolve(mode);
    root.setAttribute('data-theme-mode', mode);
    root.setAttribute('data-theme', resolved);
    if (persist) {
      try { window.localStorage.setItem(STORAGE_KEY, mode); } catch (error) {}
    }
    var colorMeta = document.querySelector('meta[name="theme-color"]:not([media])');
    if (colorMeta) colorMeta.setAttribute('content', resolved === 'moonlit' ? '#111923' : '#f4f7fa');
    syncButtons(mode);
    syncScenes(resolved);
    syncGiscus(resolved);
    document.dispatchEvent(new CustomEvent('ginka:themechange', { detail: { mode: mode, theme: resolved } }));
  }

  function cycle() {
    var current = root.getAttribute('data-theme-mode') || readMode();
    var next = MODES[(MODES.indexOf(current) + 1) % MODES.length];
    apply(next, true);
  }

  function bind() {
    document.addEventListener('click', function (event) {
      var button = event.target && event.target.closest && event.target.closest('[data-ginka-theme-toggle]');
      if (!button) return;
      event.preventDefault();
      cycle();
    });
    var onSystemChange = function () {
      if ((root.getAttribute('data-theme-mode') || 'system') === 'system') apply('system', false);
    };
    if (typeof media.addEventListener === 'function') media.addEventListener('change', onSystemChange);
    else if (typeof media.addListener === 'function') media.addListener(onSystemChange);
    ['pjax:success', 'pjax:complete', 'page:loaded'].forEach(function (name) {
      document.addEventListener(name, function () {
        var mode = root.getAttribute('data-theme-mode') || readMode();
        syncButtons(mode);
        syncScenes(root.getAttribute('data-theme'));
        syncGiscus(root.getAttribute('data-theme'));
      });
    });
    document.addEventListener('ginka:comments-ready', function () {
      syncGiscus(root.getAttribute('data-theme'));
    });
  }

  window.GINKA_THEME = {
    get mode() { return root.getAttribute('data-theme-mode') || readMode(); },
    get theme() { return root.getAttribute('data-theme') || resolve(readMode()); },
    set: function (mode) { if (MODES.indexOf(mode) !== -1) apply(mode, true); },
    cycle: cycle
  };

  bindGiscus();
  bind();
  var initialMode = root.getAttribute('data-theme-mode');
  apply(MODES.indexOf(initialMode) === -1 ? readMode() : initialMode, false);
})();
