// Offline: app files and story text are cached; pictures are cached the first time they are seen. Audio is streamed.
const SHELL = "lesebuch-shell-v2", IMG = "lesebuch-img-v1";
const FILES = ["./", "index.html", "style.css", "app.js", "data/stories.json", "manifest.webmanifest", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== SHELL && x !== IMG).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname === "raw.githubusercontent.com") {
    e.respondWith(caches.open(IMG).then(async c => { const hit = await c.match(req); if (hit) return hit; const res = await fetch(req); c.put(req, res.clone()); return res; }));
    return;
  }
  if (url.origin !== location.origin) return;
  e.respondWith(fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(SHELL).then(c => c.put(req, copy)); } return res; })
    .catch(() => caches.match(req).then(r => r || caches.match("index.html"))));
});
