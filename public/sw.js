const CACHE_NAME = 'finance-app-v2';
const BASE = '/my-finance-app';

// 安裝：預快取核心檔案
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll([
      BASE + '/',
      BASE + '/index.html',
    ])).then(() => self.skipWaiting())
  );
});

// 啟用：清舊版快取
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 攔截請求：快取優先，背景更新（stale-while-revalidate）
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
        return res;
      }).catch(() =>
        caches.match(e.request).then(m => m || caches.match(BASE + '/index.html'))
      )
    );
    return;
  }
  e.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(e.request).then(cached => {
        const fetched = fetch(e.request).then(res => {
          if (res && res.status === 200) cache.put(e.request, res.clone());
          return res;
        }).catch(() => cached);
        return cached || fetched;
      })
    )
  );
});
