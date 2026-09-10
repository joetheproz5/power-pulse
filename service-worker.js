const CACHE = "hart-el-sett-power-v5";
const APP_FILES = ["./", "./index.html", "./styles.css?v=20260910.7", "./app.js?v=20260910.6", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_FILES))));
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", event => {
  const request = event.request;
  if (new URL(request.url).pathname.endsWith("/data/status.json")) return;
  event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
});
