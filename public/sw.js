self.addEventListener("install", (event) => {
  event.waitUntil(caches.open("orbita-shell-v1").then((cache) => cache.addAll([
    "/offline",
    "/icon.svg",
    "/pwa/icon-192.png",
    "/pwa/icon-512.png",
    "/pwa/icon-maskable-512.png",
  ])));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys
      .filter((key) => key.startsWith("orbita-") && key !== "orbita-shell-v1" && key !== "orbita-static-v1")
      .map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline")));
    return;
  }

  const isStaticAsset = url.pathname.startsWith("/_next/static/")
    || url.pathname.startsWith("/pwa/")
    || url.pathname === "/icon.svg";

  if (!isStaticAsset) return;

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (!response.ok || response.type !== "basic") return response;
    const copy = response.clone();
    caches.open("orbita-static-v1").then((cache) => cache.put(request, copy));
    return response;
  })));
});

self.addEventListener("push", (event) => {
  let payload = { title: "Orbita", body: "Ada pengingat baru.", url: "/events" };
  if (event.data) {
    try { payload = { ...payload, ...event.data.json() }; } catch { payload.body = event.data.text(); }
  }
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    data: { url: payload.url },
    tag: payload.tag || undefined,
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => client.url === targetUrl);
    return existing ? existing.focus() : clients.openWindow(targetUrl);
  }));
});
