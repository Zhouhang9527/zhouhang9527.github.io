(function () {
  'use strict';
  if (window.__ginkaReadingBound) return;
  window.__ginkaReadingBound = true;
  const memory = new Map();
  let tableObserver;

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); return; } catch (_) { /* Try selection fallback. */ }
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
    finally { input.remove(); if (focused && focused.isConnected) focused.focus({ preventScroll: true }); }
    if (!copied) throw new Error('Clipboard unavailable');
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
      if (tableObserver) { wrapper._ginkaTableUpdate = update; tableObserver.observe(wrapper); tableObserver.observe(table); table._ginkaTableUpdate = update; }
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
      const toolbar = document.createElement('div');
      toolbar.className = 'journal-code-toolbar';
      const label = document.createElement('span');
      label.textContent = (code.className.match(/language-([\w+-]+)/)?.[1] || [...block.classList].find(name => name !== 'highlight') || 'CODE').toUpperCase();
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'journal-copy';
      button.textContent = '复制代码';
      button.setAttribute('aria-live', 'polite');
      button.addEventListener('click', async () => {
        button.disabled = true;
        try { await copyText(text); button.textContent = '已复制'; }
        catch (_) { button.textContent = '复制失败，请手动选择'; }
        finally { button.disabled = false; }
        clearTimeout(button._reset);
        button._reset = setTimeout(() => { button.textContent = '复制代码'; }, 2500);
      });
      toolbar.append(label, button);
      const shell = document.createElement('div');
      shell.className = 'journal-code';
      block.before(shell);
      shell.append(toolbar, block);
    });
  }

  function initFeedback(panel) {
    if (panel.dataset.bound) return;
    panel.dataset.bound = '1';
    const original = panel.dataset.postPath;
    const path = '/' + original.replace(/^\/+|index\.html$|\/+$/g, '').replace(/\/+$/, '');
    const key = 'ginka:reading-like:' + path;
    const button = panel.querySelector('.post-like-btn');
    const status = panel.querySelector('.journal-feedback-status');
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
      button.querySelector('.like-text').textContent = liked ? '已点赞' : '点赞';
    }
    render(read());
    button.addEventListener('click', () => {
      const liked = button.getAttribute('aria-pressed') !== 'true';
      memory.set(key, liked);
      render(liked);
      try {
        localStorage.setItem(key, liked ? '1' : '0');
        status.textContent = '';
      } catch (_) { status.textContent = '暂时无法保存点赞状态。'; }
    });
    panel._syncLike = () => render(read());
    panel.querySelector('.journal-share').addEventListener('click', async () => {
      const url = new URL(location.href);
      url.hash = '';
      try { await copyText(url.href); status.textContent = '文章链接已复制。'; }
      catch (_) { status.textContent = '复制失败，请从地址栏复制文章链接。'; }
    });
  }

  function initReadingStats() {
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

  function boot() {
    initReadingStats();
    if (tableObserver) tableObserver.disconnect();
    tableObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(entries => entries.forEach(entry => entry.target._ginkaTableUpdate?.())) : null;
    document.querySelectorAll('.post-body').forEach(body => {
      initTables(body);
      initCode(body);
      body.querySelectorAll('h2[id], h3[id], h4[id]').forEach(heading => {
        if (heading.querySelector('.journal-heading-link')) return;
        const link = document.createElement('a');
        link.className = 'journal-heading-link';
        link.href = '#' + encodeURIComponent(heading.id);
        link.setAttribute('aria-label', '链接到章节：' + heading.textContent.trim());
        link.textContent = '#';
        heading.appendChild(link);
      });
    });
    document.querySelectorAll('.journal-feedback').forEach(initFeedback);
  }
  window.addEventListener('storage', () => document.querySelectorAll('.journal-feedback').forEach(panel => panel._syncLike?.()));
  document.addEventListener('pjax:send', () => tableObserver?.disconnect());
  document.addEventListener('pjax:complete', boot);
  document.addEventListener('page:loaded', boot);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
