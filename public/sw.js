// Quotzen Service Worker
const CACHE_VERSION = "quotzen-v1";
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;

const MAX_IMAGE_ENTRIES = 60;
const MAX_DYNAMIC_ENTRIES = 40;

// Core assets to pre-cache on install
const PRECACHE_ASSETS = [
  "/offline",
  "/saved",
  "/favicon.ico",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/maskable-icon-512x512.png",
  "/icons/apple-touch-icon.png",
  "/icons/icon.svg",
];

// Helper: Trim cache to maximum allowed entries (LRU eviction)
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      await cache.delete(keys[0]);
      await trimCache(cacheName, maxItems);
    }
  } catch (err) {
    console.warn("[SW] Cache trimming error:", err);
  }
}

// 1. Install Event: Cache app shell, saved notebook & offline sanctuary
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch((err) => {
        console.warn("[SW] Precache failed:", err);
      })
  );
});

// 2. Activate Event: Clean up outdated caches & claim clients
self.addEventListener("activate", (event) => {
  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!currentCaches.includes(cacheName)) {
              console.log("[SW] Deleting stale cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// 3. Fetch Event: Intelligent routing, LRU eviction and offline fallbacks
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and unsupported protocols
  if (request.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // Skip admin, api, and vercel telemetry endpoints
  if (
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/_vercel") ||
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "[::1]"
  ) {
    return;
  }

  // Strategy A: HTML Page Navigations (Network-First with dynamic cache & offline fallback)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
              trimCache(DYNAMIC_CACHE, MAX_DYNAMIC_ENTRIES);
            });
          }
          return response;
        })
        .catch(async () => {
          // If network failed, check if the visited page is in cache
          const cachedPage = await caches.match(request);
          if (cachedPage) {
            return cachedPage;
          }
          // If navigating to /saved and not cached, check if static /saved exists
          if (url.pathname === "/saved") {
            const cachedSaved = await caches.match("/saved");
            if (cachedSaved) return cachedSaved;
          }
          // Otherwise fall back to the dedicated offline sanctuary page
          const offlinePage = await caches.match("/offline");
          return (
            offlinePage ||
            new Response("You are currently offline.", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            })
          );
        })
    );
    return;
  }

  // Strategy B: Static Next.js Bundles, Fonts & Static Icons (Cache-First)
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/screenshots/") ||
    url.pathname === "/favicon.ico"
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, clone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Strategy C: Images (Wikimedia, SVG, PNG) (Stale-While-Revalidate with LRU limits)
  const isImage =
    request.destination === "image" ||
    url.hostname.includes("wikimedia.org") ||
    /\.(png|jpg|jpeg|svg|webp|avif|gif)$/i.test(url.pathname);

  if (isImage) {
    event.respondWith(
      caches.match(request).then((cachedImage) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(IMAGE_CACHE).then((cache) => {
                cache.put(request, clone);
                trimCache(IMAGE_CACHE, MAX_IMAGE_ENTRIES);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedImage);

        return cachedImage || fetchPromise;
      })
    );
    return;
  }

  // Strategy D: Other assets (Default Network with dynamic fallback)
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, clone);
            trimCache(DYNAMIC_CACHE, MAX_DYNAMIC_ENTRIES);
          });
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// 4. Message Event: Support immediate update skipWaiting
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
