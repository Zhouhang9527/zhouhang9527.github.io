(function () {
  'use strict';
  let pending = null;
  const entry = document.querySelector('script[data-music-src]');
  const source = entry?.dataset.musicSrc || '/js/ginka-music.js';
  function load() {
    if (window.__ginkaMusicBooted) return Promise.resolve();
    if (pending) return pending;
    const root = document.getElementById('music-player');
    root?.setAttribute('data-ginka-music-state', 'loading');
    pending = window.GINKA_RUNTIME.loadScript(source).then(() => {
      window.GINKA_BOOT_MUSIC();
    }).catch(error => {
      pending = null;
      root?.setAttribute('data-ginka-music-state', 'error');
      const title = document.getElementById('music-title');
      if (title) title.textContent = '音乐加载失败，点击播放重试';
      throw error;
    });
    return pending;
  }
  window.GINKA_LOAD_MUSIC = load;
  document.addEventListener('click', event => {
    if (window.__ginkaMusicBooted || !event.target.closest('#music-toggle')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    load().then(() => document.getElementById('music-toggle')?.click()).catch(() => {});
  }, true);
})();
