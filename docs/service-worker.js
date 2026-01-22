const CACHE_NAME = 'order-assist-v7'; // ←デプロイごとに増やす
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './master_seed.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => k !== CACHE_NAME ? caches.delete(k) : null));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // GET以外はキャッシュしない（POSTのクラウド同期等を壊さない）
  if (req.method !== 'GET') return;

  // 同一オリジン以外は触らない
  if (url.origin !== self.location.origin) return;

  // ページ遷移は network-first（更新が反映される）
  const isNav = req.mode === 'navigate'
    || (req.headers.get('accept') || '').includes('text/html');

  if (isNav) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch('./index.html', { cache: 'no-store' });
        const cache = await caches.open(CACHE_NAME);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await caches.match('./index.html');
        return cached || Response.error();
      }
    })());
    return;
  }

  // それ以外は cache-first
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    const res = await fetch(req);
    const cache = await caches.open(CACHE_NAME);
    cache.put(req, res.clone());
    return res;
  })());
});