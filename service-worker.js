/* ============================================================
   LIBVENTORY SERVICE WORKER
   Icon/PWA cache refresh - v5
============================================================ */

const CACHE_NAME = "libventory-cache-v6";

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "icon-192.png?v=6",
  "icon-512.png?v=6"
];

/* ============================================================
   INSTALL
============================================================ */

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );

  self.skipWaiting();
});

/* ============================================================
   ACTIVATE
============================================================ */

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith("libventory-cache-") && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

/* ============================================================
   FETCH
============================================================ */

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        return cached;
      }

      return fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const copy = response.clone();

            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, copy);
            });
          }

          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
