// Subir este número en cada cambio de lógica del propio Service Worker —
// es lo único que hace que el navegador detecte "hay un sw.js nuevo" y
// dispare install/activate (con muchas actualizaciones seguidas en camino,
// que esto quede desactualizado es justo lo que hace que alguien vea la
// app vieja aunque ya se haya desplegado la nueva).
const CACHE = 'dedicalo-v5';
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
    // No confiar en la caché HTTP del navegador para el documento: siempre
    // ir a la red primero (cache: 'no-store') y solo caer a la copia
    // guardada si de verdad no hay conexión — así cada carga trae el
    // index.html real, que a su vez apunta a los archivos con el hash
    // correcto del último build.
    e.respondWith(
      fetch(request, { cache: 'no-store' }).catch(() => caches.match('/index.html'))
    );
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
