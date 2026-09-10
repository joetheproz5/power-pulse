const CACHE = "hart-el-sett-power-v35";
const APP_FILES = ["./", "./index.html", "./styles.css?v=20260910.33", "./app.js?v=20260910.17", "./manifest.webmanifest", "./icon.svg"];
const NOTIFICATION_CACHE = "hart-el-sett-notification-state-v1";
const NOTIFICATION_PREFERENCE = new Request(new URL("./notification-preference", self.location.origin));
const NOTIFICATION_STATE = new Request(new URL("./notification-state", self.location.origin));

async function notificationCache(){return caches.open(NOTIFICATION_CACHE)}
async function notificationsEnabled(){const cache=await notificationCache(),response=await cache.match(NOTIFICATION_PREFERENCE);return response?.text().then(value=>value==="true")||false}
function sourceKey(data){const latest=data.timeline?.[data.timeline.length-1]||[];return latest[1]?"grid":latest[2]?"generator":"off"}
function notificationBody(source){return source==="grid"?"EDL is now supplying your home.":source==="generator"?"Your generator is now supplying your home.":"There is currently no power supply."}
async function showPowerNotification(title,body){await self.registration.showNotification(title,{body,icon:"icon.svg",badge:"icon.svg",tag:"hart-el-sett-power",renotify:true,data:{url:"./"}})}
async function checkPowerStatus(){if(!await notificationsEnabled())return;const response=await fetch(new URL("./data/status.json",self.location.origin),{cache:"no-store"});if(!response.ok)throw Error(`HTTP ${response.status}`);const state=sourceKey(await response.json()),cache=await notificationCache(),previous=await cache.match(NOTIFICATION_STATE);if(previous&&await previous.text()!==state)await showPowerNotification("Power source changed",notificationBody(state));await cache.put(NOTIFICATION_STATE,new Response(state))}

self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_FILES)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE && key !== NOTIFICATION_CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.mode === "navigate") { event.respondWith(fetch(request).catch(() => caches.match("./"))); return; }
  if (new URL(request.url).pathname.endsWith("/data/status.json")) return;
  event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
});
self.addEventListener("message",event=>{if(event.data?.type!=="notification-preference")return;event.waitUntil(notificationCache().then(cache=>cache.put(NOTIFICATION_PREFERENCE,new Response(String(Boolean(event.data.enabled))))))});
self.addEventListener("periodicsync",event=>{if(event.tag==="power-status-check")event.waitUntil(checkPowerStatus())});
self.addEventListener("push",event=>{let payload={};try{payload=event.data?.json()||{}}catch{payload={body:event.data?.text()}}event.waitUntil(showPowerNotification(payload.title||"Power source changed",payload.body||"Open Hart El Sett Power for the latest status."))});
self.addEventListener("notificationclick",event=>{event.notification.close();const target=new URL(event.notification.data?.url||"./",self.location.origin).href;event.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(windows=>{const existing=windows.find(client=>client.url.startsWith(self.location.origin));return existing?existing.focus():clients.openWindow(target)}))});
