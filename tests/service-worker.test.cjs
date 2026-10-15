// Run with: node --test tests/service-worker.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function worker() {
  const stores = new Map();
  const listeners = new Map();
  const state = { skipCount: 0, network: async () => new Response('new content') };
  const keyOf = request => typeof request === 'string' ? new URL(request, 'https://blog.test').href : request.url;
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        async put(request, response) { store.set(keyOf(request), response.clone()); },
        async match(request) { return store.get(keyOf(request))?.clone(); },
        async keys() { return [...store.keys()].map(url => new Request(url)); },
        async delete(request) { return store.delete(keyOf(request)); },
        async addAll() {}
      };
    },
    async match(request) {
      for (const store of stores.values()) {
        const response = store.get(keyOf(request));
        if (response) return response.clone();
      }
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); }
  };
  const self = {
    location: { origin: 'https://blog.test' },
    clients: { async claim() {} },
    async skipWaiting() { state.skipCount++; },
    addEventListener(name, callback) { listeners.set(name, callback); }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8'), {
    self, caches, URL, Response, clearTimeout,
    setTimeout: (callback, delay) => state.fastTimeout ? (queueMicrotask(callback), 0) : setTimeout(callback, delay),
    fetch: request => state.network(request)
  });
  async function dispatch(type, properties = {}) {
    const waits = [];
    let response;
    listeners.get(type)({ ...properties,
      waitUntil(promise) { waits.push(promise); },
      respondWith(promise) { response = promise; }
    });
    const result = await response;
    await Promise.all(waits);
    return result;
  }
  async function seed(url, text, name = 'ginka-runtime-v5') {
    await (await caches.open(name)).put(new Request(new URL(url, self.location.origin)), new Response(text));
  }
  return { state, stores, caches, dispatch, seed,
    fetch: url => dispatch('fetch', { request: new Request(new URL(url, self.location.origin)) }) };
}

test('returning readers receive fresh article HTML and search index', async () => {
  const w = worker();
  for (const url of ['/2026/09/18/article/', '/search.xml']) {
    await w.seed(url, 'old content');
    assert.equal(await (await w.fetch(url)).text(), 'new content');
    assert.equal(await (await w.caches.match(new Request('https://blog.test' + url))).text(), 'new content');
  }
});

test('offline reading uses the exact article and never substitutes the homepage', async () => {
  const w = worker();
  await w.seed('/', 'homepage', 'ginka-shell-v5');
  await w.seed('/saved-article/', 'saved article');
  w.state.network = async () => { throw new TypeError('offline'); };
  assert.equal(await (await w.fetch('/saved-article/')).text(), 'saved article');
  const missing = await w.fetch('/unvisited-article/');
  assert.equal(missing.status, 503);
  assert.match(await missing.text(), /这篇文章还没有离线缓存/);
});

test('static assets are served from cache and refreshed in the background', async () => {
  const w = worker();
  await w.seed('/css/main.css?v=1', 'cached CSS');
  const request = new Request('https://blog.test/css/main.css?v=1');
  Object.defineProperty(request, 'destination', { value: 'style' });
  const response = await w.dispatch('fetch', { request });
  assert.equal(await response.text(), 'cached CSS');
  assert.equal(await (await w.caches.match(request)).text(), 'new content');
});

test('large models, APIs and third party resources bypass the worker', async () => {
  const w = worker();
  w.state.network = () => { throw new Error('worker should not intercept'); };
  for (const url of ['/api/posts', '/live2d/model.json', '/js/live2d-libs/pixi.min.js', 'https://other.test/file.js']) {
    const request = new Request(new URL(url, 'https://blog.test'));
    Object.defineProperty(request, 'destination', { value: 'script' });
    assert.equal(await w.dispatch('fetch', { request }), undefined);
  }
});

test('activation and cache clearing preserve caches owned by other applications', async () => {
  const w = worker();
  await w.seed('/', 'old', 'ginka-shell-v3');
  await w.seed('/', 'current', 'ginka-shell-v5');
  await w.seed('/', 'other', 'other-app-cache');
  await w.dispatch('activate');
  assert.deepEqual(await w.caches.keys(), ['ginka-shell-v5', 'other-app-cache']);
  await w.dispatch('message', { data: { type: 'SKIP_WAITING' } });
  assert.equal(w.state.skipCount, 1);
  let result;
  await w.dispatch('message', { data: { type: 'CLEAR_CACHE' }, ports: [{ postMessage(message) { result = message.success; } }] });
  assert.equal(result, true);
  assert.deepEqual(await w.caches.keys(), ['other-app-cache']);
});

test('runtime cache evicts old pages once it reaches the storage limit', async () => {
  const w = worker();
  for (let i = 0; i < 151; i++) await w.fetch(`/article-${i}/`);
  assert.equal(w.stores.get('ginka-runtime-v5').size, 150);
  assert.equal(await w.caches.match(new Request('https://blog.test/article-0/')), undefined);
  assert.equal(await (await w.caches.match(new Request('https://blog.test/article-150/'))).text(), 'new content');
});

test('versioned static assets make no network request on a warm cache', async () => {
  const w = worker();
  await w.seed('/css/main.css?v=123456789a', 'immutable CSS');
  w.state.network = () => { throw new Error('unexpected revalidation'); };
  const request = new Request('https://blog.test/css/main.css?v=123456789a');
  Object.defineProperty(request, 'destination', { value: 'style' });
  assert.equal(await (await w.dispatch('fetch', { request })).text(), 'immutable CSS');
});

test('server errors preserve readable cached articles', async () => {
  const w = worker();
  await w.seed('/article/', 'saved article');
  w.state.network = async () => new Response('server error', { status: 503 });
  assert.equal(await (await w.fetch('/article/')).text(), 'saved article');
});

test('pinned vendor versions are reused without revalidation', async () => {
  const w = worker();
  const url = '/vendor/web-vitals/6.2.3/web-vitals.iife.js';
  await w.seed(url, 'pinned vendor');
  w.state.network = () => { throw new Error('unexpected revalidation'); };
  const request = new Request('https://blog.test' + url);
  Object.defineProperty(request, 'destination', { value: 'script' });
  assert.equal(await (await w.dispatch('fetch', { request })).text(), 'pinned vendor');
});

test('slow navigation serves the saved page while the network update completes', async () => {
  const w = worker();
  await w.seed('/article/', 'saved article');
  w.state.fastTimeout = true;
  let resolveNetwork;
  w.state.network = () => new Promise(resolve => { resolveNetwork = resolve; });
  const result = w.fetch('/article/');
  await new Promise(resolve => setImmediate(resolve));
  resolveNetwork(new Response('updated article'));
  assert.equal(await (await result).text(), 'saved article');
  assert.equal(await (await w.caches.match(new Request('https://blog.test/article/'))).text(), 'updated article');
});

test('offline reads never reuse another application cache', async () => {
  const w = worker();
  await w.seed('/article/', 'other app content', 'another-application');
  w.state.network = async () => { throw new TypeError('offline'); };
  assert.equal((await w.fetch('/article/')).status, 503);
});
