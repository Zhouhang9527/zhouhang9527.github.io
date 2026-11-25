import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import matter from 'gray-matter';
import {normalizePostTimestamp, comparePublicationDates, comparePosts, postTimestamps} from './post-dates.mjs';
import {readPostDates, withPostDates, legacyPostRoutes, postRoute} from './post-frontmatter.mjs';

const root = new URL('../../', import.meta.url);
const legacy = JSON.parse(fs.readFileSync(new URL('astro/config/legacy-routes.json', root), 'utf8'));
const routeByStem = legacyPostRoutes(legacy);
// Independent golden source dates, not dates inferred from generated staging.
const originals = [
  ['NSSCTF2025入门题目-花指令', '2025-10-19 20:00:00'],
  ['[HUBUCTF 2022 新生赛]simple_RE', '2025-10-10 18:00:00'],
  ['[NSSCTF 2025 秋招赛]CodeRunner', '2025-11-05 11:30:00'],
  ['[NSSCTF 2025 秋招赛]Ultimate Packer for eXecutables', '2025-11-05 10:30:00'],
  ['[NSSCTF 2025 秋招赛]debuggggg', '2025-11-05 10:45:00'],
  ['[NSSCTF 2025 秋招赛]ez_tea', '2025-11-05 12:30:00'],
  ['[NSSCTF 2025 秋招赛]fl-ow-er', '2025-11-05 09:30:00'],
  ['[NSSCTF 2025 秋招赛]一种很新的签到', '2025-11-05 09:00:00'],
  ['[NSSCTF 2025 秋招赛]哈基米', '2025-11-05 10:00:00'],
  ['[NSSCTF 2025 秋招赛]来了嗷，常见加密大杂烩！', '2025-11-05 12:00:00'],
  ['[miniVN] Crackme', '2025-12-23 10:20:00'],
  ['[miniVN] VSnake', '2025-12-23 10:40:00'],
  ['[miniVN] ezAndroid', '2025-12-23 10:00:00'],
  ['va-to-pa-walk', '2026-03-20 19:07:02'],
  ['学x通-梆梆企业版分析', '2026-09-18 23:50:00']
];
const fixture = frontmatter => matter('---\n' + frontmatter + '\n---\nFixture body\n', {});

// This suite reads original Markdown/attachments and configuration only. Detect
// accidental writes even when run outside Node's read-only permission mode.
function snapshot(url) {
  if (!fs.existsSync(url)) return null;
  const stat = fs.statSync(url);
  if (stat.isFile()) return createHash('sha256').update(fs.readFileSync(url)).digest('hex');
  return fs.readdirSync(url).sort().map(name => [name, snapshot(new URL(encodeURIComponent(name) + (fs.statSync(new URL(encodeURIComponent(name), url)).isDirectory() ? '/' : ''), url))]);
}
const protectedPaths = ['source/_posts/', 'astro/config/legacy-routes.json', 'astro/public/', 'astro/.generated/', 'astro/dist/'];
const before = protectedPaths.map(path => snapshot(new URL(path, root)));
after(() => assert.deepEqual(protectedPaths.map(path => snapshot(new URL(path, root))), before, 'Read-only tests changed protected inputs or outputs'));

function sourcePosts() {
  return originals.map(([stem]) => {
    const source = fs.readFileSync(new URL('source/_posts/' + encodeURIComponent(stem) + '.md', root), 'utf8');
    const parsed = matter(source, {});
    const dates = readPostDates(parsed, stem + '.md');
    return {id: stem, parsed, data: {...withPostDates(parsed.data, dates), route: postRoute(stem, dates.dateOnly, routeByStem)}};
  });
}

test('all 15 source frontmatters retain their exact Shanghai publication instants', () => {
  const posts = sourcePosts();
  assert.equal(posts.length, 15);
  assert.equal(fs.readdirSync(new URL('source/_posts/', root)).filter(name => name.endsWith('.md')).length, 15);
  for (const [index, post] of posts.entries()) {
    assert.ok(post.parsed.data.date instanceof Date, 'Exercise actual YAML Date conversion');
    assert.equal(post.data.date, originals[index][1].replace(' ', 'T') + '+08:00');
    assert.equal(post.data.dateOnly, originals[index][1].slice(0, 10));
    assert.equal(post.parsed.data.updated, undefined, 'No source modification history is currently available');
    assert.equal(post.data.updated, undefined);
    const roundtrip = matter(matter.stringify(post.parsed.content, post.data));
    assert.equal(typeof roundtrip.data.date, 'string');
    assert.equal(roundtrip.data.date, post.data.date, 'Staging serialization must not recreate a YAML Date');
    assert.equal(roundtrip.data.dateOnly, post.data.dateOnly);
    // gray-matter always adds a final LF. Match its existing serialization,
    // rather than changing Markdown body/newline behavior as part of this fix.
    assert.equal(roundtrip.content, matter(matter.stringify(post.parsed.content, post.parsed.data)).content);
    assert.deepEqual(roundtrip.data.tags, post.data.tags);
    assert.deepEqual(postTimestamps(post.data), {published: post.data.date, modified: post.data.date});
  }
});

test('quoted/unquoted YAML, comments, CRLF and Date-vs-string preserve source wall time', () => {
  for (const date of ['2025-12-23 10:40:00', "'2025-12-23 10:40:00'", '"2025-12-23 10:40:00"']) {
    const parsed = fixture('date: ' + date + ' # publication\nupdated: 2025-12-24 01:02:03');
    const dates = readPostDates(parsed);
    assert.deepEqual(dates, {date: '2025-12-23T10:40:00+08:00', dateOnly: '2025-12-23', updated: '2025-12-24T01:02:03+08:00'});
    const staged = matter(matter.stringify(parsed.content, {...parsed.data, ...dates}));
    assert.equal(staged.data.updated, dates.updated);
    assert.equal(typeof staged.data.updated, 'string');
  }
  const crlf = matter('---\r\ndate: 2025-12-23 10:40:00\r\n---\r\nbody\r\n');
  assert.equal(readPostDates(crlf).date, '2025-12-23T10:40:00+08:00');
  const yamlDate = fixture('date: 2025-12-23 10:40:00');
  assert.equal(yamlDate.data.date.toISOString(), '2025-12-23T10:40:00.000Z');
  assert.equal(readPostDates(yamlDate).date, '2025-12-23T10:40:00+08:00', 'Do not turn the YAML Date into 18:40 Shanghai');
});

test('absent or YAML-null updated stays optional through staging and JSON', () => {
  for (const updated of ['', '\nupdated:', '\nupdated: null', '\nupdated: ~']) {
    const parsed = fixture('date: 2025-12-23 10:40:00' + updated);
    const data = withPostDates(parsed.data, readPostDates(parsed));
    assert.equal(data.updated, undefined);
    assert.equal(matter(matter.stringify(parsed.content, data)).data.updated, undefined);
    assert.equal(JSON.parse(JSON.stringify(data)).updated, undefined);
    assert.equal(postTimestamps(data).modified, data.date);
  }
});

test('raw frontmatter is retained on repeated parses when gray-matter caching is disabled', () => {
  const source = '---\ndate: 2025-12-23 10:40:02\n---\ncache fixture\n';
  matter(source);
  const cached = matter(source);
  assert.equal(cached.matter, undefined, 'gray-matter cache clones omit non-enumerable raw matter');
  assert.throws(() => readPostDates(cached), /Unsupported original date scalar/);
  for (let i = 0; i < 2; i++) assert.equal(readPostDates(matter(source, {})).date, '2025-12-23T10:40:02+08:00');
});

test('date-only input means Shanghai midnight, while offsets and milliseconds retain the instant', () => {
  assert.equal(normalizePostTimestamp('2025-12-23'), '2025-12-23T00:00:00+08:00');
  assert.equal(readPostDates(fixture('date: 2025-12-23')).date, '2025-12-23T00:00:00+08:00');
  assert.equal(normalizePostTimestamp('2025-12-22T16:30:01Z'), '2025-12-23T00:30:01+08:00');
  assert.equal(normalizePostTimestamp('2025-12-23T10:40:00+0800'), '2025-12-23T10:40:00+08:00');
  assert.equal(normalizePostTimestamp('2025-12-23T10:40:00.123+08:00'), '2025-12-23T10:40:00.123+08:00');
  assert.equal(normalizePostTimestamp(new Date('2025-12-23T02:40:00.001Z')), '2025-12-23T10:40:00.001+08:00');
  assert.equal(readPostDates(fixture('date: 2025-12-22T16:30:01Z')).dateOnly, '2025-12-23');
});

test('invalid dates, silent rollover, unknown offsets and unsupported YAML Date aliases fail loudly', () => {
  for (const date of ['2025-02-29 10:00:00', '2025-02-30', '2025-13-01', '2025-12-23 24:00:00', '2025-12-23T10:40:60Z', '2025-12-23T10:40:00+24:00', '2025-12-23T10:40:00-00:00', '2025-12-23T10:40:00.1234Z', 'not a date']) {
    assert.throws(() => normalizePostTimestamp(date), undefined, date);
  }
  assert.throws(() => normalizePostTimestamp(new Date(NaN)));
  assert.throws(() => readPostDates(fixture('title: missing')), /Missing original date/);
  assert.throws(() => readPostDates(fixture('date: 123')), /Invalid original date/);
  assert.throws(() => readPostDates(fixture('date: 2025-12-23\nupdated: nope')), /Invalid original updated/);
  assert.throws(() => readPostDates(fixture('date: 2025-02-30 10:00:00')), /Invalid original date/);
  assert.throws(() => readPostDates(fixture('original: &day 2025-12-23 10:40:00\ndate: *day')), /Invalid original date/);
});

test('named Shanghai timezone rejects DST gaps/overlaps rather than guessing', () => {
  assert.equal(normalizePostTimestamp('1991-06-01 12:00:00'), '1991-06-01T12:00:00+09:00');
  assert.throws(() => normalizePostTimestamp('1991-04-14 02:30:00'), /nonexistent/);
  assert.throws(() => normalizePostTimestamp('1991-09-15 01:30:00'), /Ambiguous/);
  assert.equal(normalizePostTimestamp('1991-09-15T01:30:00+09:00'), '1991-09-15T01:30:00+09:00');
});

test('same-day order uses precise publication time: VSnake, Crackme, ezAndroid', () => {
  const posts = sourcePosts();
  assert.deepEqual(posts.filter(post => post.data.dateOnly === '2025-12-23').sort(comparePosts).map(post => post.id),
    ['[miniVN] VSnake', '[miniVN] Crackme', '[miniVN] ezAndroid']);
  assert.deepEqual(posts.filter(post => post.data.dateOnly === '2025-11-05').sort(comparePosts).map(post => post.data.date.slice(11, 19)),
    ['12:30:00', '12:00:00', '11:30:00', '10:45:00', '10:30:00', '10:00:00', '09:30:00', '09:00:00']);
});

test('instant comparison, sticky priority and equal-instant id tie-break remain deterministic', () => {
  assert.ok(comparePublicationDates('2025-12-23T10:40:00+08:00', '2025-12-23T02:30:00Z') < 0);
  assert.equal(comparePublicationDates('2025-12-23T10:40:00+08:00', '2025-12-23T02:40:00Z'), 0);
  const a = {id: 'a', data: {date: '2025-12-23T10:40:00+08:00'}};
  const b = {id: 'b', data: {date: '2025-12-23T02:40:00Z'}};
  const sticky = {id: 'sticky', data: {date: '2020-01-01', sticky: 2}};
  assert.deepEqual([b, a, sticky].sort(comparePosts).map(post => post.id), ['sticky', 'a', 'b']);
});

test('all 15 canonical legacy routes are frozen; only fallback URLs use Shanghai date-only', () => {
  const posts = sourcePosts();
  assert.deepEqual(posts.map(post => post.data.route).sort(), legacy.filter(route => /^20\d\d\//.test(route)).sort());
  for (const post of posts) {
    assert.equal(postRoute(post.id, '2030-01-01', routeByStem), post.data.route, 'Never regenerate a published legacy URL');
  }
  const dates = readPostDates(fixture('date: 2025-12-23T20:30:00Z'));
  assert.equal(dates.dateOnly, '2025-12-24');
  assert.equal(postRoute('new article', dates.dateOnly, routeByStem), '2025/12/24/new article/');
  assert.throws(() => postRoute('new article', dates.date, routeByStem), /date-only/);
});

test('article publication and modification use source updated, or the documented publication fallback', () => {
  assert.deepEqual(postTimestamps({date: '2025-12-23T10:40:00+08:00', updated: '2025-12-24T00:30:00Z'}),
    {published: '2025-12-23T10:40:00+08:00', modified: '2025-12-24T08:30:00+08:00'});
  assert.deepEqual(postTimestamps({date: '2025-12-23T10:40:00+08:00'}),
    {published: '2025-12-23T10:40:00+08:00', modified: '2025-12-23T10:40:00+08:00'});
});
