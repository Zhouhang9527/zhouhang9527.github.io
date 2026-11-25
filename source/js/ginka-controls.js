(function () {
  'use strict';
  if (window.__ginkaControlsReady) return;
  window.__ginkaControlsReady = true;

  function syncDrawer() {
    var sidebar = document.querySelector('.sidebar');
    var toggle = document.querySelector('.sidebar-toggle');
    var open = document.body.classList.contains('sidebar-active');
    if (sidebar) {
      sidebar.inert = !open;
      sidebar.setAttribute('aria-hidden', String(!open));
    }
    if (open && sidebar) {
      var night = document.documentElement.getAttribute('data-theme') === 'moonlit';
      sidebar.querySelectorAll('[data-sidebar-src-day]').forEach(function (img) {
        var main = document.getElementById('main-content');
        var src = main && main.getAttribute(night ? 'data-sidebar-scene-night' : 'data-sidebar-scene-day');
        src = src || img.getAttribute(night ? 'data-sidebar-src-night' : 'data-sidebar-src-day');
        if (src && img.getAttribute('src') !== src) img.src = src;
      });
      if (!window.__ginkaMusicBooted && typeof window.GINKA_BOOT_MUSIC === 'function') window.GINKA_BOOT_MUSIC();
    }
    document.querySelectorAll('[data-journal-sidebar-open]').forEach(function (opener) {
      opener.setAttribute('aria-expanded', String(open));
    });
    if (toggle) {
      toggle.tabIndex = 0;
      toggle.setAttribute('aria-label', '打开导航、音乐与文章目录');
      toggle.setAttribute('aria-controls', 'journal-sidebar');
      toggle.setAttribute('aria-expanded', String(open));
    }
  }

  var drawerTrigger = null;

  function closeDrawer() {
    window.dispatchEvent(new Event('sidebar:hide'));
    var toggle = drawerTrigger || document.querySelector('.sidebar-toggle');
    if (toggle && toggle.getClientRects().length) toggle.focus({ preventScroll: true });
    drawerTrigger = null;
  }

  function setup() {
    syncDrawer();
    document.querySelectorAll('.sidebar-nav li').forEach(function (tab) {
      tab.tabIndex = 0;
      tab.setAttribute('role', 'button');
    });
    document.querySelectorAll('#music-player button').forEach(function (button) {
      if (button.title) button.setAttribute('aria-label', button.title);
    });
    var progress = document.getElementById('music-progress');
    if (progress) {
      progress.tabIndex = 0;
      progress.setAttribute('role', 'slider');
      progress.setAttribute('aria-label', '播放进度');
      progress.setAttribute('aria-valuemin', '0');
      progress.setAttribute('aria-valuemax', '100');
    }
  }

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;
    if (target.closest('.journal-sidebar-close')) closeDrawer();
    var opener = target.closest('[data-journal-sidebar-open]');
    if (opener) {
      var details = opener.closest('details');
      drawerTrigger = details ? details.querySelector('summary') : opener;
      if (details) details.open = false;
      window.dispatchEvent(new Event('sidebar:show'));
      syncDrawer();
    }
    if (opener || target.closest('.sidebar-toggle')) {
      if (!opener) drawerTrigger = null;
      window.requestAnimationFrame(function () {
        syncDrawer();
        if (document.body.classList.contains('sidebar-active')) {
          var close = document.querySelector('.journal-sidebar-close');
          if (close) close.focus({ preventScroll: true });
        }
      });
    }
    if (target.closest('.sidebar a') && document.body.classList.contains('sidebar-active')) closeDrawer();
  });

  document.addEventListener('keydown', function (event) {
    var target = event.target;
    if (!target || !target.matches) return;
    if ((event.key === 'Enter' || event.key === ' ') && target.matches('.sidebar-toggle, .sidebar-nav li')) {
      event.preventDefault();
      target.click();
    }

    var sidebar = document.querySelector('.sidebar');
    if (sidebar && document.body.classList.contains('sidebar-active') && sidebar.contains(target)) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDrawer();
      }
      if (event.key === 'Tab') {
        var nodes = Array.from(sidebar.querySelectorAll('a[href],button,input,select,textarea,[tabindex="0"]')).filter(function (node) {
          return !node.disabled && !node.closest('[inert]') && node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden';
        });
        var first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && target === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && target === last) { event.preventDefault(); first.focus(); }
      }
    }

    if (target.id === 'music-progress') {
      var audio = document.getElementById('bg-music');
      if (!audio || !Number.isFinite(audio.duration)) return;
      var next = audio.currentTime;
      if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next += 5;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next -= 5;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = audio.duration;
      else return;
      event.preventDefault();
      audio.currentTime = Math.max(0, Math.min(next, audio.duration));
    }

    // Open the single Pagefind search dialog with the journal shortcut.
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      var search = document.querySelector('.popup-trigger[aria-label="搜索文章"], .popup-trigger[aria-label="搜索"]');
      if (search) {
        event.preventDefault();
        search.click();
      }
    }
  });

  function bindSidebarReveal() {
    // Intentional activation only: pointer movement must not steal clicks.
    document.addEventListener('astro:before-preparation', function () {
      window.dispatchEvent(new Event('sidebar:hide'));
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) window.dispatchEvent(new Event('sidebar:hide'));
    });
  }

  function bindDrawerObserver() {
    var observer = window.__ginkaControlsDrawerObserver;
    if (!observer) observer = window.__ginkaControlsDrawerObserver = new MutationObserver(syncDrawer);
    observer.disconnect();
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    syncDrawer();
  }

  function start() {
    setup();
    bindSidebarReveal();
    bindDrawerObserver();
    var audio = document.getElementById('bg-music');
    if (audio && !audio.__ginkaProgressBound) {
      audio.__ginkaProgressBound = true;
      audio.addEventListener('timeupdate', function () {
        var progress = document.getElementById('music-progress');
        if (progress) progress.setAttribute('aria-valuenow', String(Math.round(audio.duration ? audio.currentTime / audio.duration * 100 : 0)));
      });
    }
  }

  document.addEventListener('astro:after-swap', bindDrawerObserver);
  document.addEventListener('astro:page-load', setup);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
