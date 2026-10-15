/* Small page enhancements; links and article contents also work without JS. */
(function () {
  'use strict';

  function syncMenu() {
    const current = location.pathname.replace(/index\.html$/, '');
    document.querySelectorAll('.header .menu-item a[href]').forEach(link => {
      const path = link.pathname.replace(/index\.html$/, '');
      const active = current === path || (path !== '/' && current.startsWith(path));
      link.classList.toggle('menu-item-active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function initTopics() {
    const tools = document.querySelector('.journal-topic-tools');
    if (!tools || tools.dataset.bound) return;
    tools.dataset.bound = '1';
    tools.hidden = false;
    const input = tools.querySelector('input');
    const clear = tools.querySelector('button');
    const status = tools.querySelector('[role="status"]');
    const items = [...document.querySelectorAll('.journal-taxonomy-item')];
    const empty = document.querySelector('.journal-topic-empty');
    function update() {
      const query = input.value.trim().toLocaleLowerCase();
      let count = 0;
      items.forEach(item => {
        const matches = item.querySelector('h2').textContent.toLocaleLowerCase().includes(query);
        item.hidden = !matches;
        if (matches) count++;
      });
      status.textContent = query ? `找到 ${count} / ${items.length} 个标签` : `共 ${items.length} 个标签`;
      clear.disabled = !input.value;
      empty.hidden = count > 0;
    }
    input.addEventListener('input', update);
    clear.addEventListener('click', () => { input.value = ''; update(); input.focus(); });
    input.addEventListener('keydown', event => {
      if (event.key === 'Escape' && input.value) {
        event.preventDefault(); input.value = ''; update();
      }
    });
    update();
  }

  function boot() { syncMenu(); initTopics(); }
  document.addEventListener('pjax:complete', boot);
  if (document.readyState === 'loading' && !document.body) document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
