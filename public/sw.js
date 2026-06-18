const CACHE = 'dedicalo-v1';
const PRECACHE = ['/index.html', '/manifest.json', '/images/icon-app.png', '/images/logo-main.png', '/dedi.mp3'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    e.respondWith(fetch(request).catch(() => caches.match('/index.html')));
    return;
  }

  e.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res.ok) {
          const p = url.pathname;
          if (p.startsWith('/images/') || p.startsWith('/data/') || p === '/manifest.json' || p === '/dedi.mp3') {
            caches.open(CACHE).then((c) => c.put(request, res.clone()));
          }
        }
        return res;
      });
    })
  );
});
