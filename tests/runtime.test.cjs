const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function runtime(options = {}) {
  const document = new EventTarget();
  const window = new EventTarget();
  const idle = [], nodes = [], timers = [];
  document.readyState = 'complete';
  document.hidden = false;
  document.documentElement = { classList: { add() {} } };
  document.head = { appendChild(node) { nodes.push(node); } };
  document.createElement = () => ({ remove() { this.removed = true; } });
  window.innerWidth = options.width || 1440;
  window.matchMedia = query => ({ matches: !!options.reducedMotion && query.includes('reduced-motion') });
  window.requestIdleCallback = callback => idle.push(callback);
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/ginka-runtime.js'), 'utf8'), {
    window, document, navigator: { connection: { saveData: !!options.saveData } },
    screen: { width: window.innerWidth }, location: { href: 'https://blog.test/' }, URL, console,
    setTimeout(callback, delay) { const timer = { callback, delay }; timers.push(timer); return timer; },
    clearTimeout(timer) { if (timer) timer.cleared = true; }
  });
  return { api: window.GINKA_RUNTIME, document, idle, nodes, timers,
    flushIdle() { for (const callback of idle.splice(0)) callback(); } };
}

test('interaction tasks wait for idle time and execute once', () => {
  const r = runtime();
  let calls = 0;
  r.api.scheduleBackgroundTask('optional', () => { calls++; }, { requireInteraction: true });
  assert.equal(r.idle.length, 0);
  r.document.dispatchEvent(new Event('pointerdown'));
  assert.equal(r.api.hasInteracted, true);
  assert.equal(calls, 0, 'the input handler must not perform background work');
  r.flushIdle();
  r.document.dispatchEvent(new Event('keydown'));
  r.flushIdle();
  assert.equal(calls, 1);
});

test('tasks scheduled after an interaction do not require a second gesture', () => {
  const r = runtime();
  r.document.dispatchEvent(new Event('wheel'));
  let called = false;
  r.api.scheduleBackgroundTask('optional', () => { called = true; }, { requireInteraction: true });
  r.flushIdle();
  assert.equal(called, true);
});

test('hidden tabs postpone background tasks until visible', () => {
  const r = runtime();
  r.document.hidden = true;
  let calls = 0;
  r.api.scheduleBackgroundTask('optional', () => { calls++; });
  r.flushIdle();
  assert.equal(calls, 0);
  r.document.hidden = false;
  r.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(calls, 1);
});

test('concurrent script requests share one load and remain cached after success', async () => {
  const r = runtime();
  const first = r.api.loadScript('/feature.js');
  const second = r.api.loadScript('https://blog.test/feature.js');
  assert.equal(first, second);
  assert.equal(r.nodes.length, 1);
  r.nodes[0].onload();
  await first;
  assert.equal(r.api.loadScript('/feature.js'), first);
});

test('failed loads can be retried and failed tags do not accumulate', async () => {
  const r = runtime();
  const first = r.api.loadStylesheet('/feature.css');
  r.nodes[0].onerror();
  await assert.rejects(first, /Unable to load/);
  assert.equal(r.nodes[0].removed, true);
  assert.equal(r.nodes[0].onerror, null);
  const retry = r.api.loadStylesheet('/feature.css');
  assert.notEqual(retry, first);
  r.nodes[1].onload();
  assert.equal((await retry).rel, 'stylesheet');
});

test('timed out resources release their state before retry', async () => {
  const r = runtime();
  const first = r.api.loadScript('/feature.js');
  r.timers.find(timer => timer.delay === 15000).callback();
  await assert.rejects(first, /Timed out/);
  const retry = r.api.loadScript('/feature.js');
  r.nodes[1].onload();
  await retry;
});

test('small screens, reduced motion and data saving use low power mode', () => {
  assert.equal(runtime({ width: 390 }).api.isLowPower, true);
  assert.equal(runtime({ reducedMotion: true }).api.isLowPower, true);
  assert.equal(runtime({ saveData: true }).api.isLowPower, true);
  assert.equal(runtime().api.isLowPower, false);
});
