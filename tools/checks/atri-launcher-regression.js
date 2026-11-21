'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('source/js/ginka-atri-loader.js', 'utf8');
const { load } = require('cheerio');
const markup = load(fs.readFileSync('public/index.html', 'utf8'));
assert.equal(markup('#atri-launcher-shell button').length, 1, 'only the butterfly is actionable');
assert.equal(markup('#atri-entry').length, 0, 'no intermediate entry button');
assert.equal(markup('#atri-launcher').attr('aria-controls'), 'atri-live2d-widget');
assert.equal(markup('#atri-toggle svg').length, 1, 'close icon does not depend on fonts or hidden spans');

function harness() {
  class Element extends EventTarget {
    constructor() {
      super();
      this.attrs = new Map();
      this.dataset = {};
      this.hidden = false;
      this.textContent = '';
      const classes = new Set();
      this.classList = { add: v => classes.add(v), remove: v => classes.delete(v), contains: v => classes.has(v) };
    }
    setAttribute(name, value) { this.attrs.set(name, String(value)); }
    removeAttribute(name) { this.attrs.delete(name); }
    getAttribute(name) { return this.attrs.get(name) ?? null; }
    click() { this.dispatchEvent(new Event('click')); }
    remove() { this.parentNode = null; }
  }
  const ids = Object.fromEntries(['atri-launcher-shell', 'atri-launcher', 'atri-launcher-status', 'atri-live2d-widget'].map(id => [id, new Element()]));
  const doc = new EventTarget();
  const scripts = [];
  let home = true;
  let opens = 0;
  let fail = false;
  let manual = false;
  const storage = new Map();
  const win = new EventTarget();
  win.CONFIG = { root: '/' };
  win.location = { href: 'https://fixture.test/', pathname: '/' };
  win.localStorage = { setItem: (k, v) => storage.set(k, String(v)), removeItem: k => storage.delete(k) };
  win.setTimeout = setTimeout;
  win.clearTimeout = clearTimeout;
  doc.hidden = false;
  doc.documentElement = new Element();
  doc.getElementById = id => ids[id] || null;
  doc.createElement = () => new Element();
  doc.querySelector = selector => {
    if (selector === '.journal-hero') return home ? {} : null;
    if (selector === '.post') return home ? null : {};
    const match = selector.match(/^script\[data-ginka-atri-src="(.+)"\]$/);
    return match ? scripts.find(script => script.parentNode && script.attrs.get('data-ginka-atri-src') === match[1]) || null : null;
  };
  function loaded(script) {
    if (script.src.endsWith('ginka-atri.js')) {
      win.ATRI = {
        model: {},
        isVisible: false,
        voicePlayer: {},
        setVisible(visible) {
          this.isVisible = !!visible;
          if (visible) opens++;
          doc.dispatchEvent(new Event('atri:visibility'));
        }
      };
      win.__ginkaAtriReady = Promise.resolve();
    }
    script.onload();
  }
  doc.head = {
    removeChild(script) { script.parentNode = null; },
    appendChild(script) {
      script.parentNode = doc.head;
      scripts.push(script);
      if (!manual) queueMicrotask(() => fail ? script.onerror() : loaded(script));
    }
  };
  vm.runInNewContext(source, { window: win, document: doc, URL, Map, Promise, console: { warn() {} } });
  const wait = async predicate => {
    for (let n = 0; n < 30 && !predicate(); n++) await new Promise(resolve => setImmediate(resolve));
    assert.ok(predicate(), 'loader settles within bounded microtasks');
  };
  return {
    ids, scripts, win, doc, storage, wait,
    click: () => ids['atri-launcher'].click(),
    opens: () => opens,
    fail: value => { fail = value; },
    manual: value => { manual = value; },
    loaded,
    leave() {
      doc.dispatchEvent(new Event('pjax:send'));
      home = false;
      win.location.pathname = '/article/';
      doc.dispatchEvent(new Event('pjax:complete'));
    }
  };
}

(async () => {
  const direct = harness();
  assert.equal(direct.scripts.length, 0, 'no libraries before interaction');
  direct.click();
  direct.click();
  assert.equal(direct.ids['atri-launcher'].getAttribute('aria-disabled'), 'true');
  await direct.wait(() => direct.win.GINKA_ATRI_LOADER.state === 'ready');
  assert.equal(direct.opens(), 1, 'one click opens; repeated clicks while loading do not duplicate');
  assert.equal(direct.scripts.length, 5);
  assert.equal(direct.ids['atri-live2d-widget'].hidden, false);
  assert.equal(direct.ids['atri-launcher-shell'].hidden, true);
  assert.equal(direct.ids['atri-launcher-status'].textContent, '');
  direct.win.ATRI.setVisible(false);
  assert.equal(direct.ids['atri-launcher-shell'].hidden, false);
  direct.click();
  assert.equal(direct.opens(), 2, 'a collapsed model reopens in one click');
  assert.equal(direct.scripts.length, 5, 'reopening reuses the model');
  direct.leave();
  assert.equal(direct.win.ATRI.isVisible, false, 'navigation closes the existing model');
  assert.equal(direct.ids['atri-launcher-shell'].hidden, true);
  direct.click();
  assert.equal(direct.opens(), 2, 'cannot reopen away from home');

  const error = harness();
  error.fail(true);
  error.click();
  await error.wait(() => error.win.GINKA_ATRI_LOADER.state === 'error');
  assert.equal(error.ids['atri-launcher'].getAttribute('aria-disabled'), null, 'failure remains retryable');
  assert.equal(error.ids['atri-launcher'].getAttribute('aria-label'), '重试打开看板娘');
  error.fail(false);
  error.click();
  await error.wait(() => error.win.GINKA_ATRI_LOADER.state === 'ready');
  assert.equal(error.opens(), 1, 'retry also opens without another click');

  const stale = harness();
  stale.manual(true);
  stale.click();
  assert.equal(stale.scripts.length, 1);
  stale.leave();
  stale.loaded(stale.scripts[0]);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(stale.scripts.length, 1, 'navigation abandons pending library chain');
  assert.equal(stale.opens(), 0, 'late resource load never reveals a model off-home');

  console.log('PASS ATRI one-click open, no preload, busy guard, cached reopen, error retry, and PJAX stale-load cancellation');
})().catch(error => { console.error(error); process.exitCode = 1; });
