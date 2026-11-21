'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { load } = require('cheerio');
const $ = load(fs.readFileSync('public/index.html', 'utf8'));
assert.equal($('.menu-item-tools').length, 0, 'no redundant tools entry');
assert.equal($('.journal-sidebar-edge[aria-controls="journal-sidebar"]').length, 1, 'edge also remains keyboard accessible');

function scenario(hidden = false) {
  class Node extends EventTarget {
    constructor() {
      super(); this.attrs = new Map(); this.inert = false; this.tabIndex = 0;
      const classes = new Set();
      this.classList = { contains: n => classes.has(n), add: n => classes.add(n), remove: n => classes.delete(n) };
    }
    querySelectorAll() { return []; }
    setAttribute(k, v) { this.attrs.set(k, String(v)); }
    contains(n) { return n === this; }
    getClientRects() { return []; }
  }
  const sidebar = new Node(), toggle = new Node(), edge = new Node();
  const document = new Node();
  document.body = new Node(); document.documentElement = new Node();
  document.hidden = hidden; document.readyState = 'complete'; document.activeElement = null;
  document.querySelector = s => s === '.sidebar' ? sidebar : s === '.sidebar-toggle' ? toggle : null;
  document.querySelectorAll = s => s === '[data-journal-sidebar-open]' ? [edge] : [];
  document.getElementById = () => null;
  const window = new Node();
  let now = 0, next = 0;
  const timers = new Map();
  window.setTimeout = (fn, delay = 0) => { const id = ++next; timers.set(id, { fn, due: now + delay }); return id; };
  window.clearTimeout = id => timers.delete(id);
  window.requestAnimationFrame = fn => window.setTimeout(fn, 16);
  window.matchMedia = () => ({ matches: true });
  window.addEventListener('sidebar:show', () => document.body.classList.add('sidebar-active'));
  window.addEventListener('sidebar:hide', () => document.body.classList.remove('sidebar-active'));
  vm.runInNewContext(fs.readFileSync('source/js/ginka-controls.js', 'utf8'), {
    window, document, Event, MutationObserver: class { observe() {} }, getComputedStyle: () => ({ visibility: 'visible' })
  });
  function advance(amount) {
    const target = now + amount;
    while (true) {
      const due = [...timers].sort((a, b) => a[1].due - b[1].due).find(([, value]) => value.due <= target);
      if (!due) break;
      now = due[1].due; timers.delete(due[0]); due[1].fn();
    }
    now = target;
  }
  function pointer(target, type, props = {}) {
    const event = new Event(type); Object.assign(event, { pointerType: 'mouse', clientX: 5 }, props); target.dispatchEvent(event);
  }
  return { window, document, sidebar, edge, advance, pointer, open: () => document.body.classList.contains('sidebar-active') };
}
const page = scenario();
assert.equal(page.open(), true, 'initial page shows the drawer');
page.advance(1499); assert.equal(page.open(), true);
page.advance(1); assert.equal(page.open(), false, 'initial peek closes after 1500ms');
page.pointer(page.document, 'pointermove'); assert.equal(page.open(), true, 'left edge reveals');
page.pointer(page.sidebar, 'pointerenter'); page.advance(2000); assert.equal(page.open(), true, 'hover keeps it open');
page.pointer(page.sidebar, 'pointerleave'); page.advance(350); assert.equal(page.open(), false, 'leaving folds it');
page.pointer(page.document, 'pointermove', { pointerType: 'touch' }); assert.equal(page.open(), false, 'touch is not treated as hover');
page.document.dispatchEvent(new Event('pjax:complete')); page.advance(2000); assert.equal(page.open(), false, 'PJAX does not restart preview');
const background = scenario(true);
assert.equal(background.open(), false, 'background page waits until visible');
background.document.hidden = false; background.document.dispatchEvent(new Event('visibilitychange'));
assert.equal(background.open(), true); background.advance(1500); assert.equal(background.open(), false);
const focus = scenario(); focus.document.activeElement = focus.sidebar;
focus.sidebar.dispatchEvent(new Event('focusin')); focus.advance(2000);
assert.equal(focus.open(), true, 'keyboard interaction is not interrupted');
console.log('PASS sidebar 1500ms peek, edge hover, hover hold, delayed fold, touch guard, PJAX, visibility, and keyboard focus');
