(function () {
  'use strict';
  if (window.__ginkaReadingBound) return;
  window.__ginkaReadingBound = true;

  const memory = new Map();
  const resetTimers = new Set();
  let tableObserver = null;
  let scrollFrame = 0;
  let scrollRuntimeActive = false;
  let outlineLinks = [];
  let outlineHeadings = [];

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); return; } catch (_) { /* Use the selection fallback. */ }
    }
    const input = document.createElement('textarea');
    input.value = text;
    input.className = 'journal-copy-buffer';
    input.setAttribute('readonly', '');
    const focused = document.activeElement;
    document.body.appendChild(input);
    input.select();
    let copied = false;
    try { copied = document.execCommand('copy'); }
    finally {
      input.remove();
      if (focused && focused.isConnected) focused.focus({ preventScroll: true });
    }
    if (!copied) throw new Error('Clipboard unavailable');
  }

  function clearResetTimer(button) {
    if (!button || !button._readingResetTimer) return;
    clearTimeout(button._readingResetTimer);
    resetTimers.delete(button._readingResetTimer);
    button._readingResetTimer = 0;
  }

  function setCopyState(button, state) {
    const paths = {
      idle: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
      copied: '<path d="m5 12 4 4L19 6"/>',
      failed: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 4h.01"/>'
    };
    const label = state === 'copied' ? '已复制' : state === 'failed' ? '复制失败，点击重试' : '复制代码';
    button.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[state]}</svg>`;
    button.dataset.copyState = state;
    button.setAttribute('aria-label', label);
    button.title = label;
  }

  function scheduleButtonReset(button, feedback) {
    clearResetTimer(button);
    const timer = setTimeout(() => {
      resetTimers.delete(timer);
      if (button.isConnected) { setCopyState(button, 'idle'); feedback.textContent = ''; }
      button._readingResetTimer = 0;
    }, 2500);
    button._readingResetTimer = timer;
    resetTimers.add(timer);
  }

  function initTables(body) {
    body.querySelectorAll('table').forEach((table, index) => {
      if (table.closest('figure.highlight, pre, .code-container')) return;
      let wrapper = table.closest('.journal-table-scroll') || table.parentElement;
      if (!wrapper.classList.contains('table-container') && !wrapper.classList.contains('journal-table-scroll')) {
        wrapper = document.createElement('div');
        table.before(wrapper);
        wrapper.appendChild(table);
      }
      wrapper.classList.add('journal-table-scroll');
      wrapper.setAttribute('role', 'region');
      wrapper.setAttribute('aria-label', table.caption?.textContent.trim() || `文章表格 ${index + 1}`);
      table.querySelectorAll('thead th').forEach(th => { if (!th.hasAttribute('scope')) th.scope = 'col'; });
      let hint = wrapper.previousElementSibling;
      if (!hint?.classList.contains('journal-table-hint')) {
        hint = document.createElement('p');
        hint.className = 'journal-table-hint';
        hint.textContent = '左右滑动查看完整表格，键盘可使用方向键。';
        wrapper.before(hint);
      }
      const update = () => {
        const overflow = wrapper.scrollWidth > wrapper.clientWidth + 1;
        hint.hidden = !overflow;
        if (overflow) wrapper.tabIndex = 0;
        else wrapper.removeAttribute('tabindex');
      };
      update();
      wrapper._ginkaTableUpdate = update;
      if (tableObserver) {
        tableObserver.observe(wrapper);
        tableObserver.observe(table);
      }
    });
  }

  function initCode(body) {
    body.querySelectorAll('figure.highlight, pre').forEach(block => {
      if (block.tagName === 'PRE' && block.closest('figure.highlight')) return;
      if (block.querySelector('.mermaid') || block.dataset.readingCode) return;
      block.dataset.readingCode = '1';
      const code = block.querySelector('.code pre, code') || block;
      const source = code.cloneNode(true);
      source.querySelectorAll('br').forEach(br => br.replaceWith(document.createTextNode('\n')));
      const text = source.textContent;
      // Hexo's table renderer keeps short lines offscreen when a long signature
      // is scrolled sideways. Render each logical line as its own wrapping row,
      // so its line number expands with it and no content needs horizontal panning.
      if (block.tagName === 'FIGURE' && code.matches('td.code > pre')) {
        const lines = Array.from(code.children).filter(node => node.matches('span.line'));
        if (lines.length) {
          const pre = document.createElement('pre');
          pre.className = 'journal-code-pre';
          const listing = document.createElement('code');
          listing.className = 'journal-code-lines';
          lines.forEach((line, index) => {
            const row = document.createElement('span');
            row.className = 'journal-code-line';
            row.dataset.line = String(index + 1);
            const content = document.createElement('span');
            content.className = 'journal-code-text';
            content.append(...Array.from(line.childNodes));
            content.querySelectorAll('span').forEach(token => {
              Array.from(token.classList).forEach(name => {
                if (!name.startsWith('hljs-')) token.classList.replace(name, 'hljs-' + name);
              });
            });
            row.append(content);
            listing.append(row);
            if (index < lines.length - 1) listing.append(document.createTextNode('\n'));
          });
          pre.append(listing);
          block.replaceChildren(pre);
        }
      }
      const toolbar = document.createElement('div');
      toolbar.className = 'journal-code-toolbar';
      const label = document.createElement('span');
      const classes = `${code.className || ''} ${block.className || ''}`;
      const language = classes.match(/(?:^|\s)language-([\w+#.-]+)/i)?.[1]
        || [...block.classList].find(name => !['highlight', 'code', 'hljs', 'line-numbers', 'table-container'].includes(name));
      label.textContent = (language || 'CODE').toUpperCase();
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'journal-copy';
      setCopyState(button, 'idle');
      const feedback = document.createElement('span');
      feedback.className = 'journal-visually-hidden';
      feedback.setAttribute('role', 'status');
      button.addEventListener('click', async () => {
        clearResetTimer(button);
        button.disabled = true;
        try { await copyText(text); setCopyState(button, 'copied'); feedback.textContent = '代码已复制'; }
        catch (_) { setCopyState(button, 'failed'); feedback.textContent = '复制失败，请手动选择代码'; }
        finally { button.disabled = false; }
        if (button.isConnected) scheduleButtonReset(button, feedback);
      });
      const wrapButton = document.createElement('button');
      wrapButton.type = 'button';
      wrapButton.className = 'journal-code-wrap';
      wrapButton.setAttribute('aria-pressed', 'false');
      wrapButton.textContent = '自动换行';
      wrapButton.addEventListener('click', () => {
        const shell = wrapButton.closest('.journal-code');
        if (!shell) return;
        const on = shell.getAttribute('data-code-wrap') === 'on';
        if (on) shell.removeAttribute('data-code-wrap');
        else shell.setAttribute('data-code-wrap', 'on');
        wrapButton.setAttribute('aria-pressed', String(!on));
      });
      const actions = document.createElement('span');
      actions.className = 'journal-code-actions';
      actions.append(wrapButton, button);
      toolbar.append(label, actions, feedback);
      const shell = document.createElement('div');
      shell.className = 'journal-code';
      block.before(shell);
      shell.append(toolbar, block);
    });
  }

  function initFeedback(panel) {
    if (panel.dataset.bound) return;
    panel.dataset.bound = '1';
    const original = panel.dataset.postPath || '';
    const path = '/' + original.replace(/^\/+|index\.html$|\/+$/g, '').replace(/\/+$/, '');
    const key = 'ginka:reading-like:' + path;
    const button = panel.querySelector('.post-like-btn');
    const status = panel.querySelector('.journal-feedback-status');
    if (!button) return;

    function read() {
      try {
        const saved = localStorage.getItem(key);
        if (saved !== null) return saved === '1';
        const legacy = JSON.parse(localStorage.getItem('likedPosts') || '{}');
        return !!(legacy && typeof legacy === 'object' && legacy[original]);
      } catch (_) { return memory.get(key) || false; }
    }
    function render(liked) {
      button.setAttribute('aria-pressed', String(liked));
      const text = button.querySelector('.like-text');
      if (text) text.textContent = liked ? '已点赞' : '点赞';
    }
    render(read());
    button.addEventListener('click', () => {
      const liked = button.getAttribute('aria-pressed') !== 'true';
      memory.set(key, liked);
      render(liked);
      try {
        localStorage.setItem(key, liked ? '1' : '0');
        if (status) status.textContent = '';
      } catch (_) {
        if (status) status.textContent = '暂时无法保存点赞状态。';
      }
    });
    panel._syncLike = () => render(read());
    panel.querySelector('.journal-share')?.addEventListener('click', async () => {
      const url = new URL(location.href);
      url.hash = '';
      try {
        await copyText(url.href);
        if (status) status.textContent = '文章链接已复制。';
      } catch (_) {
        if (status) status.textContent = '复制失败，请从地址栏复制文章链接。';
      }
    });
  }

  function initReadingStats() {
    const meta = document.querySelector('.journal-reading-shell .post-header .post-meta');
    if (meta && !meta.querySelector('[data-reading-stats]')) {
      const stats = document.createElement('span');
      stats.className = 'post-meta-item journal-reading-stat';
      stats.setAttribute('data-reading-stats', '');
      meta.appendChild(stats);
    }
    document.querySelectorAll('[data-reading-stats]').forEach(node => {
      const body = node.closest('.post')?.querySelector('.post-body');
      const text = (node.dataset.readingText || body?.textContent || '').replace(/\s+/g, ' ').trim();
      const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length;
      const latin = (text.match(/[A-Za-z0-9_]+/g) || []).length;
      const count = chinese + latin;
      const minutes = Math.max(1, Math.ceil(count / 420));
      node.textContent = `约 ${minutes} 分钟 · ${count} 字`;
    });
  }

  function decodeHash(link) {
    try { return decodeURIComponent(new URL(link.href, location.href).hash.slice(1)); }
    catch (_) { return ''; }
  }

  function updateScrollState() {
    scrollFrame = 0;
    const article = document.querySelector('.post-content');
    const progress = document.querySelector('.journal-reading-progress');
    if (article && progress) {
      const top = article.getBoundingClientRect().top + window.scrollY;
      const travel = Math.max(1, article.offsetHeight - window.innerHeight);
      const amount = Math.max(0, Math.min(1, (window.scrollY - top) / travel));
      const bar = progress.querySelector('span');
      if (bar) bar.style.transform = `scaleX(${amount})`;
      progress.setAttribute('aria-valuenow', String(Math.round(amount * 100)));
    }

    if (!outlineLinks.length || !outlineHeadings.length) return;
    let current = outlineHeadings[0];
    for (const heading of outlineHeadings) {
      if (heading.getBoundingClientRect().top <= 136) current = heading;
      else break;
    }
    outlineLinks.forEach(link => {
      const active = decodeHash(link) === current.id;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  function scheduleScrollUpdate() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScrollState);
  }

  function initOutlineAndProgress() {
    const article = document.querySelector('.post-content');
    if (!article) return;
    outlineHeadings = Array.from(article.querySelectorAll('.post-body h2[id], .post-body h3[id], .post-body h4[id]'));
    article.querySelectorAll('.post-body h2[id], .post-body h3[id], .post-body h4[id]').forEach(heading => {
      if (heading.querySelector('.journal-heading-link')) return;
      const link = document.createElement('a');
      link.className = 'journal-heading-link';
      link.href = '#' + encodeURIComponent(heading.id);
      link.setAttribute('aria-label', '链接到章节：' + heading.textContent.trim());
      link.textContent = '#';
      heading.appendChild(link);
    });
    const outline = document.querySelector('[data-journal-outline]');
    outlineLinks = outline ? Array.from(outline.querySelectorAll('a[href^="#"]')) : [];
    if (!scrollRuntimeActive) {
      window.addEventListener('scroll', scheduleScrollUpdate, { passive: true });
      window.addEventListener('resize', scheduleScrollUpdate, { passive: true });
      scrollRuntimeActive = true;
    }
    updateScrollState();
  }

  function cleanupRuntime() {
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
    if (scrollRuntimeActive) {
      window.removeEventListener('scroll', scheduleScrollUpdate);
      window.removeEventListener('resize', scheduleScrollUpdate);
      scrollRuntimeActive = false;
    }
    if (tableObserver) tableObserver.disconnect();
    tableObserver = null;
    document.querySelectorAll('.journal-table-scroll').forEach(wrapper => { wrapper._ginkaTableUpdate = null; });
    resetTimers.forEach(timer => clearTimeout(timer));
    resetTimers.clear();
    document.querySelectorAll('.journal-copy').forEach(button => { button._readingResetTimer = 0; });
    outlineLinks = [];
    outlineHeadings = [];
  }

  function boot() {
    cleanupRuntime();
    initReadingStats();
    tableObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(entries => entries.forEach(entry => entry.target._ginkaTableUpdate?.()))
      : null;
    document.querySelectorAll('.post-body').forEach(body => {
      initTables(body);
      initCode(body);
    });
    document.querySelectorAll('.journal-feedback').forEach(initFeedback);
    initOutlineAndProgress();
  }

  window.addEventListener('storage', () => {
    document.querySelectorAll('.journal-feedback').forEach(panel => panel._syncLike?.());
  });
  document.addEventListener('pjax:send', cleanupRuntime);
  document.addEventListener('pjax:complete', boot);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
