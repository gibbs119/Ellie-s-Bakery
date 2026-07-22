/* Elise's Bakery — service worker (offline app shell + runtime cache) */
const VERSION = 'eb-v1';
const SHELL = VERSION + '-shell';
const RUNTIME = VERSION + '-runtime';

/* App-shell files (relative to the SW scope so it works under a subpath). */
const SHELL_FILES = [
  './',
  './index.html',
  './classic.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL).then(cache =>
      /* cache best-effort: never let one 404 fail the whole install */
      Promise.all(SHELL_FILES.map(url =>
        cache.add(url).catch(() => {})
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* Same-origin: cache-first, fall back to network and cache it. */
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(SHELL).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html')))
    );
    return;
  }

  /* Cross-origin (CDN: Three.js, fonts): stale-while-revalidate. */
  event.respondWith(
    caches.open(RUNTIME).then(cache =>
      cache.match(req).then(hit => {
        const fetching = fetch(req).then(res => {
          if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
          return res;
        }).catch(() => hit);
        return hit || fetching;
      })
    )
  );
});
