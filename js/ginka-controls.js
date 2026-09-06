(function () {
  'use strict';
  if (window.__ginkaControlsReady) return;
  window.__ginkaControlsReady = true;
  function syncDrawer() {
    var sidebar = document.querySelector('.sidebar');
    var toggle = document.querySelector('.sidebar-toggle');
    var open = document.body.classList.contains('sidebar-active');
    if (sidebar) { sidebar.inert = !open; sidebar.setAttribute('aria-hidden', String(!open)); }
    if (toggle) toggle.setAttribute('aria-expanded', String(open));
  }
  function closeDrawer() {
    window.dispatchEvent(new Event('sidebar:hide'));
    var toggle = document.querySelector('.sidebar-toggle');
    if (toggle) toggle.focus({ preventScroll: true });
  }
  function setup() {
    var toggle = document.querySelector('.sidebar-toggle');
    if (toggle) {
      toggle.tabIndex = 0;
      toggle.setAttribute('aria-label', '打开导航与文章目录');
      toggle.setAttribute('aria-controls', 'journal-sidebar');
    }
    document.querySelectorAll('.sidebar-nav li').forEach(function (tab) { tab.tabIndex = 0; tab.setAttribute('role', 'button'); });
    document.querySelectorAll('#music-player button').forEach(function (button) { if (button.title) button.setAttribute('aria-label', button.title); });
    var progress = document.getElementById('music-progress');
    if (progress) {
      progress.tabIndex = 0;
      progress.setAttribute('role', 'slider');
      progress.setAttribute('aria-label', '播放进度');
      progress.setAttribute('aria-valuemin', '0');
      progress.setAttribute('aria-valuemax', '100');
    }
    syncDrawer();
  }
  document.addEventListener('click', function (event) {
    if (event.target.closest('.journal-sidebar-close')) closeDrawer();
    if (event.target.closest('.sidebar-toggle')) {
      window.requestAnimationFrame(function () {
        syncDrawer();
        if (document.body.classList.contains('sidebar-active')) {
          var close = document.querySelector('.journal-sidebar-close');
          if (close) close.focus({ preventScroll: true });
        }
      });
    }
    if (event.target.closest('.sidebar a') && window.innerWidth < 768) closeDrawer();
  });
  document.addEventListener('keydown', function (event) {
    var target = event.target;
    if ((event.key === 'Enter' || event.key === ' ') && target.matches('.sidebar-toggle, .sidebar-nav li')) { event.preventDefault(); target.click(); }
    var sidebar = document.querySelector('.sidebar');
    if (sidebar && document.body.classList.contains('sidebar-active') && sidebar.contains(target)) {
      if (event.key === 'Escape') { event.preventDefault(); closeDrawer(); }
      if (event.key === 'Tab') {
        var nodes = Array.from(sidebar.querySelectorAll('a[href],button,[tabindex="0"]')).filter(function (node) { return node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden'; });
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
      event.preventDefault(); audio.currentTime = Math.max(0, Math.min(next, audio.duration));
    }
  });
  function start() {
    setup();
    new MutationObserver(syncDrawer).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    var audio = document.getElementById('bg-music');
    if (audio) audio.addEventListener('timeupdate', function () {
      var progress = document.getElementById('music-progress');
      if (progress) progress.setAttribute('aria-valuenow', String(Math.round(audio.duration ? audio.currentTime / audio.duration * 100 : 0)));
    });
  }
  document.addEventListener('pjax:success', setup);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
