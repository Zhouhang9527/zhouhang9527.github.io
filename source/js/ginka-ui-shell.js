(() => {
  'use strict';
  if (window.__ginkaUiShellBooted) return;
  window.__ginkaUiShellBooted = true;

  // Don't let the published site's offline cache interfere with local previews.
  if ('serviceWorker' in navigator && !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
    const register = () => navigator.serviceWorker.register(`${window.CONFIG?.root || '/'}sw.js`).catch(() => {});
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }

  const menu = document.getElementById('custom-context-menu');
  let closeTimer = 0;
  function closeContextMenu() {
    clearTimeout(closeTimer);
    if (menu) menu.style.display = 'none';
  }
  if (menu && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.addEventListener('contextmenu', event => {
      // Preserve the native menu for controls, links, and selected article text.
      if (event.target.closest?.('a, input, textarea, button, [contenteditable]') || window.getSelection()?.toString()) {
        closeContextMenu();
        return;
      }
      event.preventDefault();
      menu.style.display = 'block';
      const rect = menu.getBoundingClientRect();
      const x = Math.max(5, Math.min(event.clientX + 5, innerWidth - rect.width - 5));
      const y = Math.max(5, Math.min(event.clientY + 5, innerHeight - rect.height - 5));
      menu.style.left = `${x}px`;
      menu.style.top = `${y}px`;
    });
    document.addEventListener('click', closeContextMenu);
    window.addEventListener('scroll', () => {
      if (menu.style.display !== 'block') return;
      clearTimeout(closeTimer);
      closeTimer = setTimeout(closeContextMenu, 100);
    }, { passive: true });
    menu.addEventListener('click', event => {
      const item = event.target.closest('[data-action]');
      if (!item) return;
      closeContextMenu();
      switch (item.dataset.action) {
        case 'back': history.back(); break;
        case 'forward': history.forward(); break;
        case 'refresh': location.reload(); break;
        case 'home': document.querySelector('.journal-brand')?.click(); break;
        case 'top': document.querySelector('[data-ginka-top]')?.click(); break;
        case 'music':
          window.GINKA_BOOT_MUSIC?.();
          document.getElementById('music-toggle')?.click();
          break;
      }
    });
  }

  function closeMoreMenu(restoreFocus) {
    const details = document.querySelector('.journal-mobile-menu[open]');
    if (!details) return;
    details.open = false;
    if (restoreFocus) details.querySelector('summary')?.focus({ preventScroll: true });
  }
  document.addEventListener('click', event => {
    if (!event.target.closest?.('.journal-mobile-menu') || event.target.closest('.journal-mobile-links a')) closeMoreMenu(false);
  });
  document.addEventListener('focusin', event => {
    if (!event.target.closest?.('.journal-mobile-menu')) closeMoreMenu(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    closeContextMenu();
    closeMoreMenu(true);
  });
  document.addEventListener('pjax:send', () => {
    closeContextMenu();
    closeMoreMenu(false);
  });

  // Measure the real available row, not a guessed device breakpoint. Moving
  // existing list items preserves PJAX handlers and avoids duplicate tab stops.
  function bindAdaptiveNavigation() {
    const nav = document.querySelector('.header .site-nav');
    const row = nav?.querySelector('.main-menu');
    const more = row?.querySelector('.menu-item-more');
    const details = more?.querySelector('details');
    const overflow = details?.querySelector('.journal-mobile-links');
    if (!overflow) return;
    const items = Array.from(row.children).filter(item => !item.matches('.menu-item-more, .menu-item-search'));
    const search = row.querySelector('.menu-item-search');
    let layoutTimer = 0;
    let hiddenCount = -1;
    nav.classList.add('journal-nav-ready');

    function layout() {
      layoutTimer = 0;
      const available = nav.getBoundingClientRect().width;
      if (!available) return;
      const focus = document.activeElement;
      const wasOpen = details.open;
      items.forEach(item => row.insertBefore(item, more));
      more.hidden = false;
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      const widths = items.map(item => item.getBoundingClientRect().width);
      const searchWidth = search?.getBoundingClientRect().width || 0;
      let visible = items.length;
      let width = widths.reduce((sum, value) => sum + value, 0) + searchWidth + gap * (items.length + (search ? 1 : 0) - 1);
      if (width > available + .5) {
        width += more.getBoundingClientRect().width + gap;
        while (visible > 1 && width > available + .5) width -= widths[--visible] + gap;
      }
      items.slice(visible).forEach(item => overflow.append(item));
      more.hidden = visible === items.length;
      const nextHiddenCount = items.length - visible;
      if (more.hidden || (hiddenCount !== nextHiddenCount && !wasOpen)) details.open = false;
      hiddenCount = nextHiddenCount;
      if (focus && focus !== document.body && nav.contains(focus)) {
        if (overflow.contains(focus)) details.open = true;
        if (document.activeElement !== focus) focus.focus({ preventScroll: true });
      }
    }
    function schedule() {
      if (!layoutTimer) layoutTimer = setTimeout(layout, 0);
    }
    // Also handle viewport media-query changes that leave the nav's own width
    // unchanged; a backgrounded browser must not strand an animation callback.
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('pageshow', schedule);
    if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(nav);
    document.fonts?.ready.then(schedule);
    document.fonts?.addEventListener('loadingdone', schedule);
    layout();
  }
  bindAdaptiveNavigation();
})();
