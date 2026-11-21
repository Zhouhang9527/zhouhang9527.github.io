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
      sidebar.querySelectorAll('[data-sidebar-src]').forEach(function (img) {
        img.src = img.getAttribute('data-sidebar-src');
        img.removeAttribute('data-sidebar-src');
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

    // Preserve NexT's search shortcut without binding or replacing its popup behavior.
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      var search = document.querySelector('.popup-trigger[aria-label="搜索文章"], .popup-trigger[aria-label="搜索"]');
      if (search) {
        event.preventDefault();
        search.click();
      }
    }
  });

  function bindSidebarReveal() {
    var sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    var timer = 0;
    var initialPeekPending = true;
    var hovering = false;

    function clearTimer() { window.clearTimeout(timer); timer = 0; }
    function isOpen() { return document.body.classList.contains('sidebar-active'); }
    function hasFocus() { return sidebar.contains(document.activeElement); }
    function hide() {
      clearTimer();
      if (hasFocus()) return;
      window.dispatchEvent(new Event('sidebar:hide'));
      syncDrawer();
    }
    function hideAfter(delay) {
      clearTimer();
      timer = window.setTimeout(function () {
        timer = 0;
        if (!hovering && !hasFocus()) hide();
      }, delay);
    }
    function show() {
      clearTimer();
      if (!isOpen()) window.dispatchEvent(new Event('sidebar:show'));
      syncDrawer();
    }
    function showInitialPeek() {
      if (!initialPeekPending || document.hidden) return;
      initialPeekPending = false;
      if (document.body.classList.contains('search-active') || document.documentElement.classList.contains('with-fancybox')) return;
      show();
      hideAfter(1500);
    }
    sidebar.addEventListener('pointerenter', function (event) {
      if (event.pointerType !== 'mouse') return;
      hovering = true;
      clearTimer();
    });
    sidebar.addEventListener('pointerleave', function (event) {
      if (event.pointerType !== 'mouse') return;
      hovering = false;
      if (isOpen()) hideAfter(350);
    });
    sidebar.addEventListener('focusin', clearTimer);
    sidebar.addEventListener('focusout', function () {
      if (!hovering && isOpen()) hideAfter(350);
    });
    document.addEventListener('pointermove', function (event) {
      if (!finePointer.matches || event.pointerType !== 'mouse' || document.hidden || isOpen()) return;
      if (event.clientX > 12 || event.clientX < 0 || document.body.classList.contains('search-active') || document.documentElement.classList.contains('with-fancybox')) return;
      show();
      hideAfter(1500);
    }, { passive: true });
    window.addEventListener('sidebar:show', clearTimer);
    window.addEventListener('sidebar:hide', function () { clearTimer(); hovering = false; });
    document.addEventListener('pjax:send', function () {
      initialPeekPending = false;
      clearTimer();
      window.dispatchEvent(new Event('sidebar:hide'));
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        clearTimer();
        hovering = false;
        window.dispatchEvent(new Event('sidebar:hide'));
      } else showInitialPeek();
    });
    window.addEventListener('pageshow', showInitialPeek);
    window.addEventListener('pagehide', clearTimer);
    showInitialPeek();
  }

  function start() {
    setup();
    bindSidebarReveal();
    if (!window.__ginkaControlsDrawerObserver) {
      window.__ginkaControlsDrawerObserver = new MutationObserver(syncDrawer);
      window.__ginkaControlsDrawerObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
    var audio = document.getElementById('bg-music');
    if (audio && !audio.__ginkaProgressBound) {
      audio.__ginkaProgressBound = true;
      audio.addEventListener('timeupdate', function () {
        var progress = document.getElementById('music-progress');
        if (progress) progress.setAttribute('aria-valuenow', String(Math.round(audio.duration ? audio.currentTime / audio.duration * 100 : 0)));
      });
    }
  }

  document.addEventListener('pjax:success', setup);
  document.addEventListener('pjax:complete', setup);
  document.addEventListener('page:loaded', setup);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
