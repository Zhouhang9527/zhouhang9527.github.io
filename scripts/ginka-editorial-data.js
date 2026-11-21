'use strict';

const fs = require('node:fs');
const path = require('node:path');

const topics = [
  ['android', 'Android'], ['windows', 'Windows'], ['ctf', 'CTF 题解'],
  ['crypto', '加密算法'], ['unity', 'Unity'], ['linux', 'Linux']
];
const topical = new Map(topics.map(([key, name]) => [(key === 'ctf' ? 'CTF' : name).toLowerCase(), key]));
const cryptography = /^(?:aes|rc4|xtea|tea|md5|sha-?\d+|rsa|des|异或解密)$/i;
let variants = {};

function journalIndex(pagePosts, sitePosts, home) {
  const onPage = pagePosts.toArray();
  const seen = new Set(onPage.map(post => post.path));
  const posts = home ? onPage.concat(sitePosts.sort('date', -1).toArray().filter(post => !seen.has(post.path))) : onPage;
  const available = new Set();
  const rows = posts.map((post, index) => {
    const tags = post.tags ? post.tags.toArray() : [];
    const distinct = new Map(tags.map(tag => [tag.name.trim().toLowerCase(), tag]));
    const keys = [...distinct.keys()];
    const selected = keys.find(key => key !== 'ctf' && topical.has(key)) || keys.find(key => key !== 'reverse' && key !== 'ctf') || keys.find(key => key === 'ctf');
    const filters = [...new Set(keys.map(key => topical.get(key) || (cryptography.test(key) ? 'crypto' : '')).filter(Boolean))];
    filters.forEach(key => available.add(key));
    return {
      post,
      domain: selected ? distinct.get(selected).name : '',
      tags: [...distinct.entries()].filter(([key]) => key !== selected && key !== 'reverse').slice(0, 4).map(([, tag]) => tag),
      filters: filters.join(' '),
      defaultVisible: index < onPage.length,
      latest: home && index === 0
    };
  });
  return { rows, topics: topics.filter(([key]) => available.has(key)).map(([key, name]) => ({key, name})) };
}

function journalSrcset(src) {
  return (variants[src] || []).map(item => `${hexo.extend.helper.get('url_for').call({ config: hexo.config }, item.src)} ${item.width}w`).join(', ');
}

hexo.extend.filter.register('before_generate', () => {
  const file = path.join(hexo.source_dir, 'images/ginka/responsive/manifest.json');
  variants = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const brand = fs.readFileSync(path.join(hexo.base_dir, 'layouts/header-brand.njk'), 'utf8');
  hexo.theme.setView('_partials/header/brand.njk', brand);

  // The article progress indicator and transitions belong to one lifecycle,
  // not to both NexT defaults and the project scripts. Keep search and PJAX enabled.
  const theme = hexo.theme.config;
  if (theme.motion) theme.motion.enable = false;
  if (theme.reading_progress) theme.reading_progress.enable = false;
  if (theme.footer) theme.footer.copyright = false;
});

hexo.extend.helper.register('ginka_journal_index', journalIndex);
hexo.extend.helper.register('ginka_journal_srcset', journalSrcset);
hexo.extend.filter.register('template_locals', locals => {
  locals.ginka_journal_index = journalIndex;
  locals.ginka_journal_srcset = journalSrcset;
  return locals;
});
