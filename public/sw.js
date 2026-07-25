/* Elise's Bakery — service worker (offline app shell + runtime cache) */
const VERSION = 'eb-v3';
const SHELL = VERSION + '-shell';
const RUNTIME = VERSION + '-runtime';

/* App-shell files (relative to the SW scope so it works under a subpath). */
const SHELL_FILES = [
  './',
  './index.html',
  './classic.html',
  './manifest.json',
  './fonts/fonts.css',
  './fonts/baloo2-latin.woff2',
  './fonts/nunito-latin.woff2',
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

  if (url.origin === self.location.origin) {
    /* The page itself is fetched NETWORK-FIRST. The built JS/CSS filenames
       contain a content hash that changes on every deploy, so serving a cached
       page could hand the browser a filename that no longer exists on the
       server — which loads nothing and leaves the game on its loading screen.
       Fresh HTML always references assets that exist; the cache is only a
       fallback for being offline. */
    const isDoc = req.mode === 'navigate' ||
                  req.destination === 'document' ||
                  url.pathname === '/' ||
                  url.pathname.endsWith('.html');
    if (isDoc) {
      event.respondWith(
        fetch(req).then(res => {
          const copy = res.clone();
          caches.open(SHELL).then(c => c.put(req, copy)).catch(() => {});
          return res;
        }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
      );
      return;
    }
    /* Everything else (hashed assets, models, fonts, icons) is immutable for a
       given URL, so cache-first is both safe and fast. */
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(SHELL).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }))
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
