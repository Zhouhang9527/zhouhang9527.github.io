import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const runtime = readFileSync(new URL('../../source/js/ginka-music.js', import.meta.url), 'utf8');

function productionSlice(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, `expected production marker: ${startMarker}`);
  assert.ok(end > start, `expected production end marker: ${endMarker}`);
  return source.slice(start, end);
}

// Run the real seek function, progress event bindings and existing page lifecycle
// handlers. This is deterministic event simulation, not browser/pointer hardware QA.
function progressSource(source) {
  return [
    productionSlice(source, '    function seekByClientX(clientX) {', '    function isInputLike(target) {'),
    productionSlice(source, "    progressContainer.addEventListener('click',", "    audio.addEventListener('timeupdate',"),
    productionSlice(source, "    window.addEventListener('pagehide',", "    const storedSource = 'online';")
  ].join('\n');
}

class FakeTarget {
  listeners = new Map();
  addCounts = new Map();

  addEventListener(type, listener, options = false) {
    const capture = typeof options === 'boolean' ? options : !!options.capture;
    const once = typeof options === 'object' && !!options.once;
    this.addCounts.set(type, (this.addCounts.get(type) || 0) + 1);
    const listeners = this.listeners.get(type) || [];
    if (!listeners.some(entry => entry.listener === listener && entry.capture === capture)) {
      listeners.push({listener, capture, once});
    }
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener, options = false) {
    const capture = typeof options === 'boolean' ? options : !!options.capture;
    this.listeners.set(type, (this.listeners.get(type) || [])
      .filter(entry => entry.listener !== listener || entry.capture !== capture));
  }

  listenersFor(type) {
    return this.listeners.get(type) || [];
  }

  dispatch(type, properties = {}) {
    const event = {
      type, target: this, currentTarget: this, defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; },
      stopPropagation() { this.propagationStopped = true; },
      ...properties
    };
    for (const entry of [...this.listenersFor(type)]) {
      if (!this.listenersFor(type).includes(entry)) continue;
      if (entry.once) this.removeEventListener(type, entry.listener, entry.capture);
      entry.listener(event);
    }
    return event;
  }
}

const pointer = (pointerId, clientX, extra = {}) => ({
  pointerId, clientX, pointerType: 'mouse', button: 0, buttons: 1, ...extra
});
const dragTypes = ['pointermove', 'pointerup', 'pointercancel'];

function createHarness(source = runtime) {
  const document = new FakeTarget();
  const window = new FakeTarget();
  const progressContainer = new FakeTarget();
  const rect = {left: 10, width: 100};
  progressContainer.getBoundingClientRect = () => rect;
  const seekWrites = [], persists = [], storage = new Map();
  const audio = {
    duration: 200, paused: false, time: 0,
    get currentTime() { return this.time; },
    set currentTime(value) { this.time = value; seekWrites.push(value); }
  };
  let progressUpdates = 0;
  const context = vm.createContext({
    document, window, progressContainer, audio,
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    updateProgressUI() { progressUpdates++; },
    persistPlaybackState(force) { persists.push(force); },
    masterVolume: 0.75, playbackWanted: true,
    STORAGE: {volume: 'volume', playing: 'playing'},
    storageSet: (key, value) => storage.set(key, String(value)),
    stopAutoGainSampler() {}
  });
  vm.runInContext(progressSource(source), context, {filename: 'ginka-music-progress.production.js'});
  return {document, window, progressContainer, audio, rect, seekWrites, persists, storage,
    get progressUpdates() { return progressUpdates; }};
}

function assertDragListeners(harness, count) {
  for (const type of dragTypes) {
    assert.equal(harness.document.listenersFor(type).length, count, type);
    for (const entry of harness.document.listenersFor(type)) {
      assert.equal(entry.capture, true, `${type} must retain capture registration`);
    }
  }
}

function start(harness, id = 1, x = 30, extra = {}) {
  return harness.progressContainer.dispatch('pointerdown', pointer(id, x, extra));
}

test('mouse drag retains real seeking, clamping and forced persistence; pointerup disposes', () => {
  const h = createHarness();
  assert.equal(start(h).defaultPrevented, true);
  assertDragListeners(h, 1);
  h.document.dispatch('pointermove', pointer(1, 60));
  h.document.dispatch('pointermove', pointer(1, -50));
  h.document.dispatch('pointermove', pointer(1, 250));
  assert.deepEqual(h.seekWrites, [40, 100, 0, 200]);
  assert.equal(h.progressUpdates, 4);
  assert.deepEqual(h.persists, [true, true, true, true]);
  h.document.dispatch('pointerup', pointer(1, 70, {buttons: 0}));
  assertDragListeners(h, 0);
  h.document.dispatch('pointermove', pointer(1, 80));
  assert.equal(h.seekWrites.length, 4);
});

test('touch drag works without mouse buttons and matching pointercancel disposes', () => {
  const h = createHarness();
  start(h, 12, 30, {pointerType: 'touch'});
  h.document.dispatch('pointermove', pointer(12, 85, {pointerType: 'touch', buttons: 0}));
  assert.deepEqual(h.seekWrites, [40, 150]);
  assertDragListeners(h, 1);
  h.document.dispatch('pointercancel', pointer(12, 90, {pointerType: 'touch', buttons: 0}));
  assertDragListeners(h, 0);
  h.document.dispatch('pointermove', pointer(12, 95, {pointerType: 'touch'}));
  assert.equal(h.audio.currentTime, 150);
});

test('primary pen input still seeks and ends normally', () => {
  const h = createHarness();
  start(h, 4, 20, {pointerType: 'pen'});
  h.document.dispatch('pointermove', pointer(4, 50, {pointerType: 'pen'}));
  assert.deepEqual(h.seekWrites, [20, 80]);
  h.document.dispatch('pointerup', pointer(4, 50, {pointerType: 'pen', buttons: 0}));
  assertDragListeners(h, 0);
});

test('other pointer IDs cannot seek or cancel the active drag', () => {
  const h = createHarness();
  start(h, 7);
  h.document.dispatch('pointermove', pointer(8, 90, {buttons: 0}));
  h.document.dispatch('pointerup', pointer(8, 90));
  h.document.dispatch('pointercancel', pointer(8, 90));
  assert.deepEqual(h.seekWrites, [40]);
  assertDragListeners(h, 1);
  h.document.dispatch('pointermove', pointer(7, 50));
  assert.equal(h.audio.currentTime, 80);
  h.document.dispatch('pointerup', pointer(7, 50));
  assertDragListeners(h, 0);
});

test('a new drag replaces an unfinished drag and stale callbacks cannot affect its owner', () => {
  const h = createHarness();
  start(h, 1);
  const oldMove = h.document.listenersFor('pointermove')[0].listener;
  const oldUp = h.document.listenersFor('pointerup')[0].listener;
  const oldCancel = h.document.listenersFor('pointercancel')[0].listener;
  start(h, 2, 50, {pointerType: 'touch'});
  assertDragListeners(h, 1);
  const before = h.seekWrites.length;
  oldMove(pointer(1, 100));
  oldUp(pointer(1, 100));
  oldCancel(pointer(1, 100));
  h.document.dispatch('pointermove', pointer(1, 100));
  assert.equal(h.seekWrites.length, before);
  assertDragListeners(h, 1);
  h.document.dispatch('pointermove', pointer(2, 85, {pointerType: 'touch'}));
  assert.equal(h.audio.currentTime, 150);
  h.document.dispatch('pointerup', pointer(2, 85, {pointerType: 'touch'}));
  assertDragListeners(h, 0);
});

test('repeated starts with the same pointer ID retain one drag and invalidate old closures', () => {
  const h = createHarness();
  start(h);
  const oldMove = h.document.listenersFor('pointermove')[0].listener;
  const oldUp = h.document.listenersFor('pointerup')[0].listener;
  for (let index = 0; index < 100; index++) {
    start(h);
    assertDragListeners(h, 1);
  }
  const before = h.seekWrites.length;
  oldMove(pointer(1, 100));
  oldUp(pointer(1, 100));
  assert.equal(h.seekWrites.length, before);
  assertDragListeners(h, 1);
  h.document.dispatch('pointermove', pointer(1, 80));
  assert.equal(h.seekWrites.length, before + 1);
  h.document.dispatch('pointerup', pointer(1, 80));
  assertDragListeners(h, 0);
});

for (const buttons of [0, 2]) {
  test(`a missed mouse release is detected from available buttons=${buttons} before seeking`, () => {
    const h = createHarness();
    start(h);
    h.document.dispatch('pointermove', pointer(1, 90, {buttons}));
    assertDragListeners(h, 0);
    assert.deepEqual(h.seekWrites, [40]);
    h.document.dispatch('pointermove', pointer(1, 100));
    assert.deepEqual(h.seekWrites, [40]);
  });
}

test('right/middle mouse presses do not start a seek or replace a valid drag', () => {
  const h = createHarness();
  for (const button of [1, 2]) {
    assert.equal(start(h, 9, 100, {button}).defaultPrevented, false);
  }
  assertDragListeners(h, 0);
  assert.deepEqual(h.seekWrites, []);
  start(h);
  start(h, 9, 100, {button: 2});
  assertDragListeners(h, 1);
  h.document.dispatch('pointermove', pointer(1, 50));
  assert.deepEqual(h.seekWrites, [40, 80]);
});

test('missing optional button state or pointer fields does not break usable input', () => {
  const h = createHarness();
  start(h);
  h.document.dispatch('pointermove', {pointerId: 1, clientX: 50});
  assert.equal(h.audio.currentTime, 80);
  assertDragListeners(h, 1);
  h.document.dispatch('pointerup', {pointerId: 1});
  assertDragListeners(h, 0);
  h.progressContainer.dispatch('pointerdown', {button: 0, clientX: 30});
  h.document.dispatch('pointermove', {clientX: 60});
  assert.equal(h.audio.currentTime, 100);
  h.document.dispatch('pointerup');
  assertDragListeners(h, 0);
});

test('single click seeking is preserved without starting a document drag', () => {
  const h = createHarness();
  const event = h.progressContainer.dispatch('click', {clientX: 60});
  assert.equal(event.defaultPrevented, true);
  assert.equal(event.propagationStopped, true);
  assert.deepEqual(h.seekWrites, [100]);
  assertDragListeners(h, 0);
});

test('unavailable metadata causes no seek and does not prevent drag cleanup', () => {
  const h = createHarness();
  h.audio.duration = NaN;
  start(h);
  h.document.dispatch('pointermove', pointer(1, 90));
  assert.deepEqual(h.seekWrites, []);
  h.document.dispatch('pointercancel', pointer(1, 90));
  assertDragListeners(h, 0);
});

for (const [target, event] of [
  ['window', 'blur'], ['window', 'pagehide'],
  ['document', 'astro:before-preparation']
]) {
  test(`${event} clears an interrupted drag, rejects stale callbacks and permits later drags`, () => {
    const h = createHarness();
    const audioIdentity = h.audio;
    assert.equal(h[target].listenersFor(event).length, 1, 'one boot-time lifecycle listener');
    for (let index = 0; index < 25; index++) {
      start(h);
      const oldMove = h.document.listenersFor('pointermove')[0].listener;
      const oldUp = h.document.listenersFor('pointerup')[0].listener;
      h[target].dispatch(event);
      assertDragListeners(h, 0);
      const before = h.seekWrites.length;
      oldMove(pointer(1, 100));
      oldUp(pointer(1, 100));
      h.document.dispatch('pointermove', pointer(1, 100));
      h.document.dispatch('pointerup', pointer(1, 100));
      assert.equal(h.seekWrites.length, before);
      assert.equal(h[target].listenersFor(event).length, 1);
      assert.equal(h[target].addCounts.get(event), 1, 'navigation must not resubscribe');
    }
    start(h, 3, 50);
    h.document.dispatch('pointermove', pointer(3, 80));
    assert.equal(h.audio.currentTime, 140);
    assert.equal(h.audio, audioIdentity);
    assert.equal(h.audio.paused, false, 'cleanup must not pause persistent BGM');
    h.document.dispatch('pointerup', pointer(3, 80));
    assertDragListeners(h, 0);
  });
}

test('pagehide retains existing playback/volume persistence and idle cleanup is harmless', () => {
  const h = createHarness();
  h.window.dispatch('blur');
  h.document.dispatch('astro:before-preparation');
  assert.deepEqual(h.seekWrites, []);
  start(h);
  h.window.dispatch('pagehide');
  assertDragListeners(h, 0);
  assert.deepEqual(h.persists, [true, true]);
  assert.equal(h.storage.get('volume'), '0.75');
  assert.equal(h.storage.get('playing'), 'true');
  h.window.dispatch('pagehide');
  assertDragListeners(h, 0);
  assert.deepEqual(h.persists, [true, true, true]);
});
