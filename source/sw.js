// ===================================================
// GINKA Blog Service Worker
// 策略：HTML 在线优先；静态资源缓存优先（URL 自带内容版本）；
// 更新只在用户点「刷新」后 skipWaiting，不打断阅读与音乐。
// ===================================================

const VERSION = 'ginka-blog-3.0.0';
const SHELL_CACHE = 'ginka-shell-' + VERSION;
const RUNTIME_CACHE = 'ginka-runtime-' + VERSION;
const KEEP = [SHELL_CACHE, RUNTIME_CACHE];

// 离线兜底需要的最小集合；带 ?v= 的 CSS/JS 不预缓存，避免留下无版本号副本。
const SHELL_FILES = [
  '/',
  '/manifest.webmanifest',
  '/images/avatar.png',
  '/images/favicon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      Promise.all(SHELL_FILES.map((file) =>
        cache.add(file).catch((error) => console.warn('[SW] skip shell file', file, error))
      ))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((name) => !KEEP.includes(name)).map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    const fallback = await caches.match('/');
    if (fallback) return fallback;
    return new Response('离线状态，请稍后重试。', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8' }
    });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch (error) {
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/api/')) return;

  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkFirst(request));
    return;
  }
  if (['style', 'script', 'image', 'font', 'manifest'].includes(request.destination)) {
    event.respondWith(cacheFirst(request));
  }
});

self.addEventListener('message', (event) => {
  const type = event.data && event.data.type;
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys()
        .then((names) => Promise.all(names.map((name) => caches.delete(name))))
        .then(() => {
          if (event.ports && event.ports[0]) event.ports[0].postMessage({ success: true });
        })
    );
  }
});
