/* Resolve the theme before stylesheets; storage failure still follows the OS. */
(function () {
  var mode = 'system';
  try {
    var stored = window.localStorage.getItem('ginka-theme');
    if (['system', 'day', 'moonlit'].indexOf(stored) !== -1) mode = stored;
  } catch (error) {}
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  var resolved = mode === 'moonlit' || (mode === 'system' && prefersDark) ? 'moonlit' : 'day';
  document.documentElement.setAttribute('data-theme', resolved);
  document.documentElement.setAttribute('data-theme-mode', mode);
})();
