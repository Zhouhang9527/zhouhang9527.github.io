const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pages = JSON.parse(read('site-source/pages.json'));
const articles = JSON.parse(read('article-index.json'));

test('one layout builds all pages without losing article code or page metadata', () => {
  assert.equal(pages.length, 65);
  assert.ok(!read('site-source/templates/layout.html').includes('ginka_style.css'));
  for (const page of pages) {
    const source = JSON.parse(read('site-source/' + page.source));
    const output = read(page.output);
    const main = source.main_file ? read('site-source/' + source.main_file) : source.main;
    const code = main.match(/<figure\b[^>]*class="[^"]*highlight[^"]*"[^>]*>[\s\S]*?<\/figure>/g) || [];
    for (const block of code) assert.ok(output.includes(block), page.output + ': changed code');
    assert.ok(output.includes(source.metadata), page.output + ': missing metadata');
    assert.ok(!/<link[^>]+(?:ginka_style\.css|\/css\/main\.css|\/animate\.css\/)/.test(output), page.output);
    assert.ok(!output.includes('src="/js/motion.js"'), page.output);
  }
});

test('article recommendations are unique, published and never point back to themselves', () => {
  assert.equal(articles.length, 15);
  const urls = new Set(articles.map(article => article.url));
  for (const article of articles) {
    const file = decodeURIComponent(new URL(article.url, 'https://site.test').pathname).replace(/^\//, '') + 'index.html';
    const html = read(file);
    const section = html.match(/<section class="journal-related"[\s\S]*?<\/section>/)?.[0];
    assert.ok(section, article.title);
    const related = [...section.matchAll(/class="journal-related-card" href="([^"]+)"/g)].map(match => match[1]);
    assert.equal(related.length, 3);
    assert.equal(new Set(related).size, 3);
    assert.ok(related.every(url => url !== article.url && urls.has(url)));
  }
});

test('responsive images keep original fallbacks and verified variant bytes', () => {
  const manifest = JSON.parse(read('images/ginka/responsive/manifest.json'));
  for (const [source, variants] of Object.entries(manifest)) {
    assert.equal(variants.at(-1).src, source);
    assert.equal(new Set(variants.map(item => item.width)).size, variants.length);
    for (const item of variants) {
      const digest = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, item.src))).digest('hex');
      assert.equal(digest, item.sha256, item.src);
    }
  }
  const home = read('index.html');
  assert.match(home, /class="journal-hero-art"[^>]+srcset=/);
  assert.match(home, /imagesrcset="[^"]+hero-silver-640.webp/);
  assert.match(home, /data-sidebar-srcset=/);
});
