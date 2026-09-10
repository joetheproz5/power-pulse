const CACHE = "hart-el-sett-power-v25";
const APP_FILES = ["./", "./index.html", "./styles.css?v=20260910.8", "./refinements.css?v=20260910.17", "./light.css?v=20260910.9", "./app.js?v=20260910.12", "./assets/model-viewer.min.js", "./assets/home-3d.glb", "./assets/home-3d-poster.jpg", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_FILES)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.mode === "navigate") { event.respondWith(fetch(request).catch(() => caches.match("./"))); return; }
  if (new URL(request.url).pathname.endsWith("/data/status.json")) return;
  event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
});
