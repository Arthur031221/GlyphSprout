const files = __MANIFEST__;
const prefix = `glyphsprout:${self.registration.scope}:`;
const cacheName = `${prefix}__VERSION__`;
const base = new URL(".", self.location);
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(files.map((file) => new URL(file, base).href))));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(prefix) && key !== cacheName).map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]));
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return;
  event.respondWith(caches.open(cacheName).then(async (cache) => {
    const key = new URL(url); key.search = "";
    const cached = await cache.match(key.href);
    if (cached) return cached;
    if (event.request.mode === "navigate" && (url.pathname === base.pathname || url.pathname === `${base.pathname}index.html`)) {
      const index = await cache.match(new URL("index.html", base).href);
      if (index) return index;
    }
    return fetch(event.request);
  }));
});
