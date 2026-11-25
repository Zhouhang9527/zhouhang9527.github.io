import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import matter from 'gray-matter';
import {renderAtomFeed} from './atom-feed.mjs';
import {readPostDates, legacyPostRoutes, postRoute} from './post-frontmatter.mjs';

const site = 'https://example.test';
const entryBlocks = xml => [...xml.matchAll(/<entry>(.*?)<\/entry>/gs)].map(match => match[1]);
const value = (xml, tag) => xml.match(new RegExp('<' + tag + '>(.*?)</' + tag + '>'))?.[1];
const post = (route, date, updated) => ({route, date, ...(updated ? {updated} : {}), title: route, description: ''});

test('Atom feed updated is the latest effective modification, not the newest publication', () => {
  const posts = Object.freeze([
    Object.freeze(post('new/', '2026-09-18T23:50:00+08:00')),
    Object.freeze(post('old/', '2025-12-23T10:40:00+08:00', '2026-11-25T11:02:03Z'))
  ]);
  const xml = renderAtomFeed(posts, site);
  assert.equal(value(xml, 'updated'), '2026-11-25T19:02:03+08:00');
  const [newEntry, oldEntry] = entryBlocks(xml);
  assert.equal(value(newEntry, 'published'), '2026-09-18T23:50:00+08:00');
  assert.equal(value(newEntry, 'updated'), '2026-09-18T23:50:00+08:00');
  assert.equal(value(oldEntry, 'published'), '2025-12-23T10:40:00+08:00');
  assert.equal(value(oldEntry, 'updated'), '2026-11-25T19:02:03+08:00');
});

test('Atom chronology compares instants, uses deterministic equal-time routes and ignores sticky', () => {
  const xml = renderAtomFeed([
    {...post('sticky-old/', '2025-12-23T01:00:00Z'), sticky: 10},
    post('z/', '2025-12-23T02:40:00Z'),
    post('a/', '2025-12-23T10:40:00+08:00'),
    post('middle/', '2025-12-23T10:30:00+08:00')
  ], site);
  assert.deepEqual(entryBlocks(xml).map(entry => value(entry, 'title')), ['a/', 'z/', 'middle/', 'sticky-old/']);
  assert.equal(value(xml, 'updated'), '2025-12-23T10:40:00+08:00');
});

test('all original frontmatters produce full Atom published/updated and unchanged encoded links in memory', () => {
  const root = new URL('../../', import.meta.url);
  const routes = legacyPostRoutes(JSON.parse(fs.readFileSync(new URL('astro/config/legacy-routes.json', root), 'utf8')));
  const dir = new URL('source/_posts/', root);
  const posts = fs.readdirSync(dir).filter(name => name.endsWith('.md')).map(file => {
    const parsed = matter(fs.readFileSync(new URL(encodeURIComponent(file), dir), 'utf8'), {});
    const dates = readPostDates(parsed, file);
    return {...dates, route: postRoute(file.slice(0, -3), dates.dateOnly, routes), title: parsed.data.title, description: parsed.data.description};
  });
  const xml = renderAtomFeed(posts, site);
  const entries = entryBlocks(xml);
  assert.equal(entries.length, 15);
  assert.equal(value(xml, 'updated'), '2026-09-18T23:50:00+08:00');
  assert.deepEqual(entries.filter(entry => value(entry, 'published').startsWith('2025-12-23')).map(entry => value(entry, 'title')),
    ['[miniVN] VSnake', '[miniVN] Crackme!', '[miniVN] ezAndroid']);
  for (const original of posts) {
    const href = site + '/' + original.route.split('/').map(encodeURIComponent).join('/');
    const entry = entries.find(entry => entry.includes('<id>' + href + '</id>'));
    assert.ok(entry, 'Keep original encoded URL: ' + original.route);
    assert.equal(value(entry, 'published'), original.date);
    assert.equal(value(entry, 'updated'), original.date, 'No invented original modified history');
  }
});

test('Atom emits valid escaped scalar content and fails on invalid or empty dated inputs', () => {
  const xml = renderAtomFeed([{...post('a b/', '2025-12-23'), title: '<A & "B">', description: "x < y & 'quoted'"}], site);
  assert.ok(xml.includes('<title>&lt;A &amp; &quot;B&quot;&gt;</title>'));
  assert.ok(xml.includes('<summary>x &lt; y &amp; &apos;quoted&apos;</summary>'));
  assert.ok(xml.includes('<id>https://example.test/a%20b/</id>'));
  assert.equal(value(xml, 'updated'), '2025-12-23T00:00:00+08:00');
  assert.throws(() => renderAtomFeed([], site), /without dated posts/);
  assert.throws(() => renderAtomFeed([post('invalid/', 'not-a-date')], site), /timestamp/);
});
