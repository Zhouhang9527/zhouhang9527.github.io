/* Pure search ranking and excerpts, shared with the regression tests. */
(function (root) {
  'use strict';
  function tokens(query) {
    return [...new Set(query.toLowerCase().trim().split(/\s+/).filter(Boolean))].slice(0, 8);
  }
  function snippets(content, words) {
    const lower = content.toLowerCase();
    const windows = [];
    for (const word of words) {
      let offset = 0;
      for (let count = 0; count < 20; count++) {
        const at = lower.indexOf(word, offset);
        if (at < 0) break;
        const start = Math.max(0, at - 36), end = Math.min(content.length, at + Math.max(120, word.length));
        windows.push({ start, end, score: words.filter(value => lower.slice(start, end).includes(value)).length });
        offset = at + word.length;
      }
    }
    windows.sort((a, b) => b.score - a.score || a.start - b.start);
    const selected = [];
    for (const window of windows) {
      if (selected.every(other => window.end <= other.start || window.start >= other.end)) selected.push(window);
      if (selected.length === 2) break;
    }
    if (!selected.length) selected.push({ start: 0, end: Math.min(content.length, 156) });
    return selected.sort((a, b) => a.start - b.start).map(({ start, end }) => ({
      text: content.slice(start, end), prefix: start > 0 ? '…' : '', suffix: end < content.length ? '…' : ''
    }));
  }
  function rank(entries, query) {
    const words = tokens(query);
    if (!words.length) return [];
    return entries.map(entry => {
      const title = entry.title.toLowerCase(), tags = (entry.tags || '').toLowerCase(), content = entry.content.toLowerCase();
      if (!words.every(word => title.includes(word) || tags.includes(word) || content.includes(word))) return null;
      const score = words.reduce((sum, word) => {
        let count = 0, offset = 0;
        while (count < 10) {
          const at = content.indexOf(word, offset);
          if (at < 0) break;
          count++; offset = at + word.length;
        }
        return sum + (title.includes(word) ? 30 : 0) + (tags.includes(word) ? 20 : 0) + count;
      }, 0);
      return { entry, score, snippets: snippets(entry.content, words) };
    }).filter(Boolean).sort((a, b) => b.score - a.score || (b.entry.date || '').localeCompare(a.entry.date || '') || a.entry.title.localeCompare(b.entry.title));
  }
  const api = { tokens, snippets, rank };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GinkaSearch = api;
})(typeof window === 'undefined' ? {} : window);
