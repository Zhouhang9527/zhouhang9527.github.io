/* Search stays available across PJAX navigation and failed requests. */
function initGinkaSearch() {
  if (window.__ginkaSearchReady) return;
  if (!CONFIG.path) return;
  window.__ginkaSearchReady = true;
  const search = new LocalSearch({ path: CONFIG.path, ...CONFIG.localsearch });
  const overlay = document.querySelector('.search-pop-overlay');
  const dialog = overlay.querySelector('.search-popup');
  const input = overlay.querySelector('.search-input');
  const results = overlay.querySelector('.search-result-container');
  let pending = null;
  let opener = null;
  let debounce = 0;
  let composing = false;

  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', '搜索博客文章');
  input.setAttribute('aria-label', '搜索文章标题和正文');
  input.placeholder = '搜索标题、技术或关键词…';
  const status = document.createElement('p');
  status.className = 'journal-search-status';
  status.setAttribute('role', 'status');
  results.before(status);

  function highlight(text, queryWords) {
    const fragment = document.createDocumentFragment();
    if (!queryWords.length) { fragment.append(text); return fragment; }
    const pattern = new RegExp(queryWords.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((a, b) => b.length - a.length).join('|'), 'gi');
    let previous = 0;
    for (const match of text.matchAll(pattern)) {
      fragment.append(text.slice(previous, match.index));
      const mark = document.createElement('mark'); mark.className = 'search-keyword'; mark.textContent = match[0];
      fragment.append(mark); previous = match.index + match[0].length;
    }
    fragment.append(text.slice(previous));
    return fragment;
  }

  function render() {
    if (!search.isfetched) return;
    const query = input.value.trim().toLowerCase();
    if (!query) {
      status.textContent = '输入关键词，搜索全部文章。支持 Ctrl / ⌘ K 快速打开。';
      results.replaceChildren();
      const suggestions = document.createElement('div'); suggestions.className = 'journal-search-suggestions';
      for (const keyword of ['CTF', 'Android', 'Windows', 'IDA Pro']) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = keyword;
        button.addEventListener('click', () => { input.value = keyword; input.focus(); render(); });
        suggestions.appendChild(button);
      }
      results.appendChild(suggestions);
      return;
    }
    const hits = GinkaSearch.rank(search.datas, query);
    status.textContent = hits.length ? `找到 ${hits.length} 篇相关文章` : '没有找到相关文章，试试「CTF」「Android」或「逆向」。';
    results.replaceChildren();
    const words = GinkaSearch.tokens(query);
    if (hits.length) {
      const list = document.createElement('ul'); list.className = 'search-result-list';
      for (const { entry, snippets } of hits) {
        const destination = new URL(entry.url, location.origin);
        if (destination.origin !== location.origin || !['http:', 'https:'].includes(destination.protocol)) continue;
        destination.searchParams.set('highlight', words.join(' '));
        const item = document.createElement('li');
        const title = document.createElement('a'); title.className = 'search-result-title'; title.href = destination.href;
        title.append(highlight(entry.title, words)); item.appendChild(title);
        const meta = document.createElement('p'); meta.className = 'journal-search-meta';
        meta.textContent = [entry.date, entry.tags].filter(Boolean).join(' · '); item.appendChild(meta);
        for (const snippet of snippets) {
          const link = document.createElement('a'); link.href = destination.href;
          const paragraph = document.createElement('p'); paragraph.className = 'search-result';
          paragraph.append(snippet.prefix, highlight(snippet.text, words), snippet.suffix);
          link.appendChild(paragraph); item.appendChild(link);
        }
        list.appendChild(item);
      }
      results.appendChild(list);
    }
    if (typeof pjax === 'object') pjax.refresh(results);
  }

  function load() {
    if (search.isfetched) { render(); return Promise.resolve(); }
    if (pending) return pending;
    status.textContent = '正在加载文章索引…';
    results.replaceChildren();
    results.setAttribute('aria-busy', 'true');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    pending = (async () => {
      try {
        const response = await fetch(CONFIG.path, { signal: controller.signal });
        if (!response.ok) throw new Error('Search index unavailable');
        const source = await response.text();
        const xml = new DOMParser().parseFromString(source, 'text/xml');
        if (xml.querySelector('parsererror') || !xml.querySelector('search')) throw new Error('Invalid search index');
        search.datas = [...xml.querySelectorAll('entry')].map(entry => ({
          title: entry.querySelector('title')?.textContent.trim() || '',
          content: xml.documentElement.getAttribute('format') === 'text' ? (entry.querySelector('content')?.textContent.trim() || '') : striptags(entry.querySelector('content')?.textContent.trim() || ''),
          url: entry.querySelector('url')?.textContent.trim() || '',
          tags: entry.querySelector('tags')?.textContent.trim() || '',
          date: entry.querySelector('date')?.textContent.trim() || ''
        })).filter(entry => entry.title && entry.url);
        search.isfetched = true;
        render();
      } catch (_) {
        status.textContent = '文章索引加载失败，请检查网络后重试。';
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'journal-search-retry';
        retry.textContent = '重新加载';
        retry.addEventListener('click', () => { input.focus(); load(); });
        results.replaceChildren(retry);
      } finally {
        clearTimeout(timeout);
        results.setAttribute('aria-busy', 'false');
        pending = null;
      }
    })();
    return pending;
  }

  function open(trigger) {
    if (!document.body.classList.contains('search-active')) opener = trigger || document.activeElement;
    document.querySelectorAll('.journal-mobile-menu[open]').forEach(menu => { menu.open = false; });
    NexT.utils.setGutter();
    document.body.classList.add('search-active');
    input.focus({ preventScroll: true });
    load();
  }

  function close(restoreFocus = true) {
    if (!document.body.classList.contains('search-active')) return;
    clearTimeout(debounce);
    NexT.utils.setGutter('0');
    document.body.classList.remove('search-active');
    if (restoreFocus && opener?.isConnected) opener.focus({ preventScroll: true });
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest('.popup-trigger');
    if (trigger) { event.preventDefault(); open(trigger); }
    if (event.target === overlay || event.target.closest('.popup-btn-close')) close();
  });
  input.addEventListener('compositionstart', () => { composing = true; });
  input.addEventListener('compositionend', () => { composing = false; render(); });
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    if (!composing) debounce = setTimeout(render, 100);
  });
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault(); open(); return;
    }
    if (!document.body.classList.contains('search-active')) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key === 'Tab') {
      const nodes = [...dialog.querySelectorAll('input,button,a[href],[tabindex="0"]')].filter(node => !node.disabled && node.getClientRects().length);
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (!dialog.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  document.addEventListener('pjax:success', () => {
    search.highlightSearchWords(document.querySelector('.post-body'));
    close(false);
  });
  search.highlightSearchWords(document.querySelector('.post-body'));
  if (CONFIG.localsearch.preload) load();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initGinkaSearch, { once: true });
else initGinkaSearch();
