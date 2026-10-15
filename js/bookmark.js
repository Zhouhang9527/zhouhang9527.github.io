document.addEventListener('DOMContentLoaded', () => {
  const button = document.querySelector('.book-mark-link');
  if (!button) return;
  const memory = new Map();
  let restoring = false;
  let restoredRoot = null;
  function save() {
    if (restoring) return;
    const key = 'bookmark' + location.pathname;
    memory.set(key, window.scrollY);
    try { localStorage.setItem(key, String(window.scrollY)); } catch (_) {}
  }
  function restore() {
    const root = document.getElementById('main-content');
    if (root === restoredRoot) return;
    restoredRoot = root;
    if (location.hash) return;
    const key = 'bookmark' + location.pathname;
    let value = memory.get(key);
    try { value = localStorage.getItem(key) ?? value; } catch (_) {}
    const position = Number(value);
    if (!Number.isFinite(position) || position <= 0) return;
    restoring = true;
    // Wait for reading tools to finish changing layout before restoring offsets.
    window.scrollTo({ top: position, behavior: 'instant' });
    restoring = false;
  }
  button.setAttribute('aria-label', '保存当前阅读位置');
  button.title = '保存当前阅读位置';
  button.tabIndex = 0;
  button.addEventListener('click', () => {
    save();
    button.setAttribute('aria-label', '阅读位置已保存');
    button.title = '阅读位置已保存';
  });
  button.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); button.click(); }
  });
  window.addEventListener('scroll', () => button.classList.toggle('book-mark-link-fixed', window.scrollY === 0), { passive: true });
  if (CONFIG.bookmark.save === 'auto') {
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
    document.addEventListener('pjax:send', save);
  }
  document.addEventListener('ginka:reading-ready', restore);
});
