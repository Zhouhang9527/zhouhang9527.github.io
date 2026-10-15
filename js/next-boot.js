/* Idempotent theme integration also works when a CDN proxies load events. */
(function () {
  'use strict';
  const utils = NexT.utils;
  NexT.boot = {
    registerEvents() {
      utils.registerScrollPercent();
      utils.registerCanIUseTag();
      utils.updateFooterPosition();
      document.querySelector('.site-nav-toggle .toggle')?.addEventListener('click', event => {
        event.currentTarget.classList.toggle('toggle-close');
        const nav = document.querySelector('.site-nav');
        nav?.style.setProperty('--scroll-height', nav.scrollHeight + 'px');
        document.body.classList.toggle('site-nav-on');
      });
      document.querySelectorAll('.sidebar-nav li').forEach((tab, index) => {
        tab.addEventListener('click', () => utils.activateSidebarPanel(index));
      });
      window.addEventListener('hashchange', () => {
        if (!location.hash || /%\S{2}/.test(location.hash)) return;
        document.querySelector('.tabs ul.nav-tabs li a[href="' + CSS.escape(location.hash) + '"]')?.click();
      });
      window.addEventListener('tabs:click', event => utils.registerCodeblock(event.target));
    },
    refresh() {
      const root = document.getElementById('main-content');
      if (!root || root.dataset.ginkaThemeReady) return;
      root.dataset.ginkaThemeReady = '1';
      if (CONFIG.exturl) utils.registerExtURL();
      utils.wrapTableWithBox();
      utils.registerCodeblock();
      utils.registerTabsTag();
      utils.registerActiveMenuItem();
      utils.registerLangSelect();
      utils.registerSidebarTOC();
      utils.registerPostReward();
      utils.registerVideoIframe();
      document.dispatchEvent(new Event('page:loaded'));
    },
    motion() { utils.updateSidebarPosition(); },
    start() {
      if (window.__ginkaThemeBooted) return;
      window.__ginkaThemeBooted = true;
      NexT.boot.registerEvents(); NexT.boot.refresh(); NexT.boot.motion();
    }
  };
  if (document.getElementById('main-content')) NexT.boot.start();
  else document.addEventListener('DOMContentLoaded', NexT.boot.start, { once: true });
})();
