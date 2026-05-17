/* ============================================================
   FireOps — Service Worker (PWA)
   ============================================================ */

const CACHE_NAME = 'fireops-v5';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './style-dispatch.css',
  './config.js',
  './firebase-config.js',
  './sounds.js',
  './tactical.js',
  './dispatch.js',
  './firefighters.js',
  './apparatus.js',
  './scheduling.js',
  './equipment.js',
  './training.js',
  './op-log.js',
  './reports.js',
  './settings.js',
  './app.js',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, copy));
        }
        return response;
      }).catch(() => cached)
    )
  );
});
