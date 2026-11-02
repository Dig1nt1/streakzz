// Streakz service worker.
// The app always loads the latest website from the network, so every deploy reaches
// installed apps immediately. Only a small offline page is kept for when there is no connection.
const OFFLINE_CACHE = "streakz-offline-v2";
// Cloudflare Pages serves offline.html at /offline (and redirects /offline.html there);
// a redirected copy can't be shown for a page load, so cache the final address
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== OFFLINE_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Page loads: always the network; the offline page only when the network fails.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
});
