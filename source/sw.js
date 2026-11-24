// GINKA: exact-route offline fallback, immutable content hashes, scoped caches.
const VERSION = 'ginka-blog-3.1.0';
const PAGES = 'ginka-pages-' + VERSION;
const ASSETS = 'ginka-assets-' + VERSION;
const KEEP = [PAGES, ASSETS];
const owned = name => /^ginka-(?:shell|runtime|pages|assets)-ginka-blog-/.test(name);

self.addEventListener('install', event => {
  event.waitUntil(Promise.all([caches.open(PAGES), caches.open(ASSETS)]));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(
    names.filter(name => owned(name) && !KEEP.includes(name)).map(name => caches.delete(name))
  )).then(() => self.clients.claim()));
});

async function save(cache, request, response, limit) {
  if (!response?.ok || response.headers.get('vary') === '*' || /no-store|private/i.test(response.headers.get('cache-control') || '')) return;
  try {
    await cache.put(request, response.clone());
    const keys = await cache.keys();
    if (keys.length > limit) await Promise.all(keys.slice(0, keys.length - limit).map(key => cache.delete(key)));
  } catch (_) {
    // Cache quota/write failures must never discard a successful network response.
  }
}
async function retrieve(request, {name, limit, immutable = false, page = false}) {
  let cache;
  try { cache = await caches.open(name); } catch (_) {}
  if (immutable && cache) {
    const hit = await cache.match(request).catch(() => null);
    if (hit) return hit;
  }
  try {
    const fresh = await fetch(request, immutable ? undefined : {cache:'no-cache'});
    if (cache) await save(cache, request, fresh, limit);
    return fresh;
  } catch (_) {
    const cached = cache && await cache.match(request).catch(() => null);
    if (cached) return cached;
    return new Response(page ? '当前页面尚未离线缓存，请联网后重试' : '', {
      status: page ? 503 : 504,
      headers: {'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}
    });
  }
}
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.includes('/api/') ||
      url.pathname.endsWith('/site-version.json') || url.pathname.endsWith('/sw.js') ||
      request.headers.has('range')) return;
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(retrieve(request,{name:PAGES,limit:30,page:true}));
  } else if (['style','script','image','font','manifest'].includes(request.destination)) {
    const immutable = /^[a-f0-9]{10}$/i.test(url.searchParams.get('v') || '');
    event.respondWith(retrieve(request,{name:ASSETS,limit:180,immutable}));
  }
});
self.addEventListener('message', event => {
  const type = event.data?.type;
  if (type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
  } else if (type === 'CLEAR_CACHE') {
    event.waitUntil(caches.keys().then(names => Promise.all(names.filter(owned).map(name => caches.delete(name))))
      .then(() => event.ports?.[0]?.postMessage({success:true}))
      .catch(() => event.ports?.[0]?.postMessage({success:false})));
  }
});
