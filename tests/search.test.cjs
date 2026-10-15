const { test } = require('node:test');
const assert = require('node:assert/strict');
const { tokens, rank, snippets } = require('../js/ginka-search-core.js');

test('search handles Chinese, punctuation and repeated query terms', () => {
  assert.deepEqual(tokens('  逆向  AES-128  逆向  '), ['逆向', 'aes-128']);
  const hits = rank([{ title: '逆向 AES-128', tags: '', content: '实验记录' }], '逆向 AES-128');
  assert.equal(hits.length, 1);
  assert.equal(rank([{ title: '逆向', tags: '', content: '记录' }], '逆向 Android').length, 0);
});

test('title and topic matches rank ahead of repeated body matches', () => {
  const entries = [
    { title: '其他题目', content: 'android '.repeat(100), tags: '' },
    { title: 'Android 逆向', content: '分析记录', tags: 'Android' }
  ];
  assert.equal(rank(entries, 'Android')[0].entry.title, 'Android 逆向');
});

test('excerpts expose separated matches without losing literal code', () => {
  const content = '开头 ' + 'a '.repeat(120) + '<img onerror="x"> Android' + ' b'.repeat(150) + ' Frida 结尾';
  const result = snippets(content, ['android', 'frida']);
  assert.equal(result.length, 2);
  assert.ok(result.some(item => item.text.includes('<img onerror="x">')));
  assert.ok(result.some(item => item.text.includes('Frida')));
  assert.ok(result.every(item => item.text.length <= 156));
});
