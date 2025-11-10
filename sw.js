const CACHE_NAME = 'astrofood-premiumgold-v1';
const OFFLINE_URL = '/index.html';
const ASSETS_TO_CACHE = [
  '/index.html',
  '/manifest.json',
  '/assets/logo-premiumgold.png',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/qr-astrofood.png',
  '/assets/qr-placeholder.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // navigation fallback
        if (event.request.mode === 'navigate') return caches.match(OFFLINE_URL);
      });
    })
  );
});
