(function () {
  'use strict';
  if (window.__ginkaReadingBound) return;
  window.__ginkaReadingBound = true;
  const memory = new Map();
  let tableObserver;
  let bootFrame = 0;
  let sectionHeadings = [];
  let sectionLinks = [];
  let outlineFrame = 0;
  let wrapCode = false;
  try { wrapCode = localStorage.getItem('ginka:wrap-code') === '1'; } catch (_) { /* Optional preference. */ }

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
      shell.dataset.wrap = String(wrapCode);
      const wrap = document.createElement('button');
      wrap.type = 'button'; wrap.className = 'journal-code-wrap';
      wrap.textContent = '自动换行'; wrap.setAttribute('aria-pressed', String(wrapCode));
      wrap.addEventListener('click', () => {
        wrapCode = !wrapCode;
        try { localStorage.setItem('ginka:wrap-code', wrapCode ? '1' : '0'); } catch (_) { /* Session still works. */ }
        document.querySelectorAll('.journal-code').forEach(region => {
          region.dataset.wrap = String(wrapCode);
          region.querySelector('.journal-code-wrap')?.setAttribute('aria-pressed', String(wrapCode));
        });
      });
      toolbar.insertBefore(wrap, button);
      const lines = text.split('\n').length;
      if (lines > 40) {
        const expand = document.createElement('button');
        expand.type = 'button'; expand.className = 'journal-code-expand';
        expand.setAttribute('aria-expanded', 'false');
        shell.dataset.collapsed = 'true';
        block.id ||= 'journal-code-' + body.querySelectorAll('.journal-code').length;
        expand.setAttribute('aria-controls', block.id);
        expand.textContent = `展开全部代码 · ${lines} 行`;
        expand.addEventListener('click', () => {
          const expanded = shell.dataset.collapsed === 'true';
          shell.dataset.collapsed = String(!expanded);
          expand.setAttribute('aria-expanded', String(expanded));
          expand.textContent = expanded ? '收起长代码' : `展开全部代码 · ${lines} 行`;
          if (!expanded && shell.getBoundingClientRect().top < 0) shell.scrollIntoView({ block: 'start', behavior: 'instant' });
        });
        shell.appendChild(expand);
      }
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
      if (!node.dataset.readingCount) {
        const source = body?.cloneNode(true);
        source?.querySelectorAll('.journal-code-toolbar, .journal-heading-link, .copy-btn, .code-lang, .gutter').forEach(element => element.remove());
        const text = (node.dataset.readingText || source?.textContent || '').replace(/\s+/g, ' ').trim();
        const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length;
        const latin = (text.match(/[A-Za-z0-9_]+/g) || []).length;
        node.dataset.readingCount = String(chinese + latin);
      }
      const count = Number(node.dataset.readingCount);
      const minutes = Math.max(1, Math.ceil(count / 420));
      node.textContent = `约 ${minutes} 分钟 · ${count} 字`;
    });
  }

  function updateOutline() {
    outlineFrame = 0;
    if (!sectionHeadings.length) return;
    let active = sectionHeadings[0];
    for (const heading of sectionHeadings) {
      if (heading.getBoundingClientRect().top > 140) break;
      active = heading;
    }
    for (const link of sectionLinks) {
      if (decodeURIComponent(link.hash.slice(1)) === active.id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }

  function initOutline() {
    sectionHeadings = []; sectionLinks = [];
    const toc = document.querySelector('.post .journal-article-toc nav');
    if (!toc) return;
    let outline = document.querySelector('.journal-outline');
    if (!outline) {
      outline = document.createElement('nav');
      outline.className = 'journal-outline'; outline.setAttribute('aria-label', '本页章节');
      const title = document.createElement('p'); title.textContent = '本页目录';
      outline.append(title, toc.querySelector('ol').cloneNode(true));
      document.querySelector('.main-inner').appendChild(outline);
    }
    sectionLinks = [...document.querySelectorAll('.journal-article-toc nav a, .journal-outline a')];
    sectionHeadings = [...toc.querySelectorAll('a')].map(link => document.getElementById(decodeURIComponent(link.hash.slice(1)))).filter(Boolean);
    updateOutline();
  }

  function initCodeScroll(body) {
    body.querySelectorAll('.journal-code .table-container, .journal-code > pre').forEach(region => {
      region.setAttribute('role', 'region');
      region.setAttribute('aria-label', '代码，内容超出时可使用左右方向键滚动');
      const update = () => {
        if (region.scrollWidth > region.clientWidth + 1) region.tabIndex = 0;
        else region.removeAttribute('tabindex');
      };
      update();
      region._ginkaTableUpdate = update;
      tableObserver?.observe(region);
      const table = region.querySelector('table');
      if (table) { table._ginkaTableUpdate = update; tableObserver?.observe(table); }
    });
  }

  function boot() {
    initReadingStats();
    if (tableObserver) tableObserver.disconnect();
    tableObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(entries => entries.forEach(entry => entry.target._ginkaTableUpdate?.())) : null;
    document.querySelectorAll('.post-body').forEach(body => {
      initTables(body);
      initCode(body);
      initCodeScroll(body);
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
    initOutline();
    document.dispatchEvent(new Event('ginka:reading-ready'));
  }
  function scheduleBoot() {
    cancelAnimationFrame(bootFrame);
    // NexT adds table wrappers during its own page handlers. Enhance those last.
    bootFrame = requestAnimationFrame(() => { bootFrame = 0; boot(); });
  }
  window.addEventListener('storage', () => document.querySelectorAll('.journal-feedback').forEach(panel => panel._syncLike?.()));
  window.addEventListener('scroll', () => {
    if (!outlineFrame && sectionHeadings.length) outlineFrame = requestAnimationFrame(updateOutline);
  }, { passive: true });
  document.addEventListener('pjax:send', () => {
    cancelAnimationFrame(bootFrame); cancelAnimationFrame(outlineFrame); outlineFrame = 0;
    sectionHeadings = []; sectionLinks = []; tableObserver?.disconnect();
  });
  document.addEventListener('pjax:complete', scheduleBoot);
  document.addEventListener('page:loaded', scheduleBoot);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleBoot, { once: true });
  else scheduleBoot();
})();
