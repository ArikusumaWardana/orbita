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
