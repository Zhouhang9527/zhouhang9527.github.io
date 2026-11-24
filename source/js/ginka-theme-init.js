/* 首屏主题判定：必须在样式表之前同步执行，避免月夜模式闪白。 */
(function () {
  try {
    var mode = window.localStorage.getItem('ginka-theme') || 'system';
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var resolved = mode === 'moonlit' || (mode !== 'day' && prefersDark) ? 'moonlit' : 'day';
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.setAttribute('data-theme-mode', mode);
  } catch (error) {
    document.documentElement.setAttribute('data-theme', 'day');
  }
})();
