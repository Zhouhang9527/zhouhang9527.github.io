'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const init = read('source/js/ginka-theme-init.js');
const script = read('source/js/ginka-theme.js');
const css = read('source/css/ginka-theme.css');

function setup(stored, dark, throws = false) {
  const attrs = new Map();
  const documentElement = {
    getAttribute: k => attrs.get(k) || null,
    setAttribute: (k, v) => attrs.set(k, String(v))
  };
  const listeners = new Map(), windowListeners = new Map(), messages = [];
  const frame = { matches: s => s === 'iframe.giscus-frame',
    contentWindow: { postMessage: (data, origin) => messages.push({data, origin}) } };
  const doc = { documentElement,
    querySelector: () => null,
    querySelectorAll: s => s === 'iframe.giscus-frame' ? [frame] : [],
    addEventListener: (s, fn) => { const a = listeners.get(s) || []; a.push(fn); listeners.set(s, a); },
    dispatchEvent: () => {}
  };
  const win = { CONFIG: { giscus: {} }, localStorage: {
    getItem: () => { if (throws) throw Error('storage denied'); return stored; },
    setItem: () => {}
  }, matchMedia: () => ({matches: dark, addEventListener: () => {}}),
    addEventListener: (s, fn) => windowListeners.set(s, fn)
  };
  const context = vm.createContext({document: doc, window: win, location: {protocol: 'http:'}, CustomEvent: class {}});
  vm.runInContext(init, context);
  vm.runInContext(script, context);
  return {attrs, win, listeners, windowListeners, messages, frame};
}

for (const [stored, dark, throws, expected] of [
  ['system', true, false, 'moonlit'], ['day', true, false, 'day'],
  ['moonlit', false, false, 'moonlit'], ['invalid', true, false, 'moonlit'],
  [null, true, true, 'moonlit'], [null, false, true, 'day']
]) {
  const result = setup(stored, dark, throws);
  assert.equal(result.attrs.get('data-theme'), expected);
  assert.equal(result.win.CONFIG.giscus.theme, expected === 'moonlit' ? 'dark_dimmed' : 'light');
}
const t = setup('day', false);
t.win.GINKA_THEME.set('moonlit');
assert.equal(t.attrs.get('data-theme'), 'moonlit');
assert.equal(t.messages.at(-1).data.giscus.setConfig.theme, 'dark_dimmed');
assert.equal(t.messages.at(-1).origin, 'https://giscus.app');
const before = t.messages.length;
t.windowListeners.get('message')({origin: 'https://example.com', source: t.frame.contentWindow, data: {giscus: {}}});
assert.equal(t.messages.length, before);
t.windowListeners.get('message')({origin: 'https://giscus.app', source: t.frame.contentWindow, data: {giscus: {}}});
assert.equal(t.messages.length, before + 1);
t.windowListeners.get('message')({origin: 'https://giscus.app', source: t.frame.contentWindow, data: {giscus: {}}});
assert.equal(t.messages.length, before + 1);
for (const name of ['bg', 'panel', 'surface', 'border', 'title', 'text', 'muted', 'accent', 'track', 'hover', 'on-accent']) {
  assert.ok(css.includes('--music-' + name + ':'), 'Missing moonlit music token: ' + name);
}
console.log('PASS theme initialization, Giscus local fallback/handshake, moonlit music tokens');
