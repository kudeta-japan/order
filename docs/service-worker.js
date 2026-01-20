/* simple offline cache */
const CACHE = 'order-assist-v5';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './master_seed.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if(cached) return cached;
      try {
        const fresh = await fetch(req);
        // cache same-origin GETs
        if(req.method === 'GET' && new URL(req.url).origin === self.location.origin){
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch (e) {
        // fallback to app shell
        return caches.match('./index.html');
      }
    })()
  );
});
