// Quotzen Service Worker — v2
const CACHE_VERSION = "quotzen-v2";
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;

const MAX_IMAGE_ENTRIES = 80;
const MAX_DYNAMIC_ENTRIES = 60;
const NAVIGATION_TIMEOUT_MS = 3500;

// Core assets to pre-cache on install for immediate offline readiness
const PRECACHE_ASSETS = [
  "/",
  "/offline",
  "/saved",
  "/categories",
  "/tags",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/maskable-icon-512x512.png",
  "/icons/apple-touch-icon.png",
  "/icons/icon.svg",
];

// Helper: Batch trim cache to maximum allowed entries (O(N) LRU eviction)
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      const excess = keys.length - maxItems;
      for (let i = 0; i < excess; i++) {
        await cache.delete(keys[i]);
      }
    }
  } catch (err) {
    console.warn("[SW] Cache trimming error:", err);
  }
}

// Helper: Network fetch with configurable timeout for fast offline fallback
function fetchWithTimeout(request, timeoutMs = NAVIGATION_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Network timeout"));
    }, timeoutMs);

    fetch(request)
      .then((response) => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// 1. Install Event: Cache app shell, root, saved notebook & offline sanctuary
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

// 2. Activate Event: Clean up outdated caches & immediately claim clients
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

// 3. Fetch Event: Intelligent routing, LRU eviction and resilient offline fallbacks
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and unsupported protocols
  if (request.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // Skip admin surfaces, mutating APIs, and analytics telemetry
  if (
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/api/admin") ||
    url.pathname.startsWith("/api/users") ||
    url.pathname.startsWith("/_vercel")
  ) {
    return;
  }

  // Strategy A: HTML Page Navigations (Fast Network-First with Timeout & Multi-Tier Fallback)
  if (request.mode === "navigate") {
    event.respondWith(
      fetchWithTimeout(request, NAVIGATION_TIMEOUT_MS)
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
          // Tier 1: Check exact requested URL
          const cachedPage = await caches.match(request);
          if (cachedPage) {
            return cachedPage;
          }

          // Tier 2: Check URL stripped of query parameters & hash
          const cleanUrl = url.origin + url.pathname;
          const cachedClean = await caches.match(cleanUrl);
          if (cachedClean) {
            return cachedClean;
          }

          // Tier 3: Known pre-cached primary routes
          if (url.pathname === "/saved") {
            const cachedSaved = await caches.match("/saved");
            if (cachedSaved) return cachedSaved;
          }
          if (url.pathname === "/" || url.pathname === "") {
            const cachedRoot = await caches.match("/");
            if (cachedRoot) return cachedRoot;
          }
          if (url.pathname === "/categories") {
            const cachedCat = await caches.match("/categories");
            if (cachedCat) return cachedCat;
          }
          if (url.pathname === "/tags") {
            const cachedTags = await caches.match("/tags");
            if (cachedTags) return cachedTags;
          }

          // Tier 4: Fall back to the dedicated Offline Sanctuary page
          const offlinePage = await caches.match("/offline");
          if (offlinePage) {
            return offlinePage;
          }

          // Tier 5: Terminal offline response
          return new Response(
            "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Offline — Quotzen</title><meta name='viewport' content='width=device-width,initial-scale=1'></head><body style='font-family:serif;background:#f5efe6;color:#212529;padding:40px;text-align:center;'><h1>Quotzen — Offline</h1><p>You are currently offline. Please reconnect to resume discovery.</p></body></html>",
            {
              status: 503,
              headers: { "Content-Type": "text/html; charset=utf-8" },
            }
          );
        })
    );
    return;
  }

  // Strategy B: Static Next.js Chunks, Web Manifest & Static Icons (Cache-First)
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/screenshots/") ||
    url.pathname === "/favicon.ico" ||
    url.pathname === "/manifest.webmanifest"
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

  // Strategy C: Images & Open Graph Social Cards (Stale-While-Revalidate with LRU limits)
  const isImage =
    request.destination === "image" ||
    url.pathname.includes("opengraph-image") ||
    url.pathname.includes("twitter-image") ||
    url.hostname.includes("wikimedia.org") ||
    url.hostname.includes("openlibrary.org") ||
    /\.(png|jpg|jpeg|svg|webp|avif|gif|ico)$/i.test(url.pathname);

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

  // Strategy D: Next.js App Router RSC Payload Prefetches & API reads
  if (url.searchParams.has("_rsc") || url.pathname.startsWith("/api/quotes/")) {
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
    return;
  }

  // Strategy E: Other requests (Default Network with cache fallback)
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

// 4. Message Event: Support immediate update skipWaiting from client
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
