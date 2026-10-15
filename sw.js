/* Documents use the network first so returning visitors receive new posts. */
const CACHE_SHELL = 'ginka-shell-v5';
const CACHE_RUNTIME = 'ginka-runtime-v5';
const MAX_RUNTIME_ENTRIES = 150;
const NAVIGATION_FALLBACK_MS = 2500;
const SHELL_FILES = ['/', '/manifest.webmanifest', '/images/avatar.jpg', '/images/favicon.jpg'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_SHELL).then(cache => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => /^ginka-(shell|runtime)-/.test(key) && key !== CACHE_SHELL && key !== CACHE_RUNTIME)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

async function save(request, response) {
  if (!response.ok || response.type === 'opaque' || response.headers.get('Cache-Control')?.includes('no-store')) return;
  const cache = await caches.open(CACHE_RUNTIME);
  await cache.put(request, response);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_RUNTIME_ENTRIES)).map(key => cache.delete(key)));
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/api/')) return;
  const documentRequest = request.mode === 'navigate' || request.destination === 'document'
    || /(?:\/|\.html)$/.test(url.pathname) || request.headers.get('Accept')?.includes('text/html');
  const staticRequest = ['style', 'script', 'image', 'font'].includes(request.destination) || url.pathname === '/search.xml';
  // Model and voice assets are large and already have browser HTTP caching.
  if (!documentRequest && (!staticRequest || /\/(?:live2d|live2d-libs)\//.test(url.pathname))) return;

  const immutable = !documentRequest && (/^[a-f0-9]{10}$/.test(url.searchParams.get('v') || '')
    || (url.pathname.startsWith('/vendor/') && /\/\d+\.\d+\.\d+\//.test(url.pathname)));
  const cachedResponse = Promise.all([caches.open(CACHE_RUNTIME), caches.open(CACHE_SHELL)])
    .then(async ([runtime, shell]) => await runtime.match(request) || await shell.match(request));
  const update = cachedResponse.then(cached => {
    if (immutable && cached) return null;
    return fetch(request).then(response => ({ response, saved: save(request, response.clone()).catch(() => {}) }));
  });
  event.waitUntil(update.then(result => result?.saved).catch(() => {}));
  event.respondWith((async () => {
    const cached = await cachedResponse;
    if (!documentRequest && url.pathname !== '/search.xml' && cached) return cached;
    let timeout;
    try {
      const fresh = update.then(result => result.response.status >= 500 && cached ? cached : result.response);
      if (!cached) return await fresh;
      // A stalled connection must not block an already cached article indefinitely.
      return await Promise.race([fresh, new Promise(resolve => { timeout = setTimeout(() => resolve(cached), NAVIGATION_FALLBACK_MS); })]);
    }
    catch (_) {
      if (cached) return cached;
      // Never silently display the homepage at an uncached article's URL.
      if (documentRequest) return new Response('<!doctype html><html lang="zh-CN"><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><title>暂时离线 · GINKA</title><body style="font:16px/1.8 system-ui;max-width:36rem;margin:15vh auto;padding:24px;color:#24364b;background:#eef0f5"><h1>这篇文章还没有离线缓存</h1><p>恢复网络后刷新即可继续阅读。</p><a href="/">返回 GINKA 首页</a></body></html>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      return Response.error();
    } finally { clearTimeout(timeout); }
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys
      .filter(key => /^ginka-(shell|runtime)-/.test(key))
      .map(key => caches.delete(key)))).then(() => event.ports[0]?.postMessage({ success: true })));
  }
});
