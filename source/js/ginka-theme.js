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

  function syncGiscus(resolved) {
    var frames = document.querySelectorAll('iframe.giscus-frame');
    for (var index = 0; index < frames.length; index += 1) {
      if (!frames[index].contentWindow) continue;
      frames[index].contentWindow.postMessage({
        giscus: { setConfig: { theme: resolved === 'moonlit' ? 'dark_dimmed' : 'light' } }
      }, 'https://giscus.app');
    }
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
    if (colorMeta) colorMeta.setAttribute('content', resolved === 'moonlit' ? '#111923' : '#f3f6fa');
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

  bind();
  apply(root.getAttribute('data-theme-mode') || readMode(), false);
})();
