// ===================================================
// GINKA Blog Service Worker - PWA Support
// Version: 2.0.1
// ===================================================

const CACHE_VERSION = 'ginka-blog-v2.0.1';
const CACHE_SHELL = 'ginka-shell-v2';
const CACHE_RUNTIME = 'ginka-runtime-v2';

// 关键资源 - 预缓存
const SHELL_FILES = [
  '/',
  '/manifest.webmanifest',
  '/css/ginka-custom.css',
  '/css/ginka-editorial.css',
  '/css/ginka-reading.css',
  '/css/ginka-runtime.css',
  '/js/ginka-main.js',
  '/images/avatar.png',
  '/images/favicon.png'
];

// 安装事件 - 预缓存关键资源
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker v' + CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_SHELL)
      .then((cache) => {
        console.log('[SW] Caching shell files');
        return cache.addAll(SHELL_FILES);
      })
      .then(() => self.skipWaiting())
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker v' + CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_SHELL && cacheName !== CACHE_RUNTIME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 请求拦截 - 缓存策略
self.addEventListener('fetch', (event) => {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') return;
  
  // 只处理同源请求
  if (!event.request.url.startsWith(self.location.origin)) return;
  
  const url = new URL(event.request.url);
  
  // 跳过 API 请求
  if (url.pathname.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 缓存命中
      if (cachedResponse) {
        // 返回缓存，同时在后台更新
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            caches.open(CACHE_RUNTIME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {
          // 网络错误，忽略
        });
        
        return cachedResponse;
      }
      
      // 缓存未命中，从网络获取
      return fetch(event.request).then((networkResponse) => {
        // 只缓存成功的响应
        if (networkResponse && networkResponse.ok) {
          const responseClone = networkResponse.clone();
          
          // 缓存静态资源
          const cacheable = event.request.destination === 'style' 
                         || event.request.destination === 'script'
                         || event.request.destination === 'image'
                         || event.request.destination === 'font'
                         || url.pathname.endsWith('.html');
          
          if (cacheable) {
            caches.open(CACHE_RUNTIME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
        }
        
        return networkResponse;
      }).catch(() => {
        // 网络失败，尝试返回首页（离线页面）
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
        
        // 其他资源返回空响应
        return new Response('', {
          status: 408,
          statusText: 'Network request timeout'
        });
      });
    })
  );
});

// 消息处理 - 支持手动清理缓存
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWait();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});
