// Custom service-worker code, merged into the next-pwa generated worker.
//
// The service worker runs in the background — even with no tab open — which is
// exactly why push works: the push service wakes THIS worker and fires a `push`
// event. We turn the payload into a visible notification; a click deep-links into
// the app (focusing an existing tab if there is one).

// PUSH: the encrypted payload arrives; show it as an OS notification.
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: "SchoolSync", body: event.data ? event.data.text() : "" }; }
  const title = data.title || "SchoolSync";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",   // shown in the notification
    badge: "/icons/icon-192.png",  // monochrome status-bar glyph (Android)
    data: { url: data.url || "/" },// carried through to the click handler
    tag: data.type || "general",   // collapses duplicates of the same type
  };
  // waitUntil keeps the worker alive until the notification is shown.
  event.waitUntil(self.registration.showNotification(title, options));
});

// CLICK: focus an open tab if we have one, otherwise open a new window at the URL.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        // Already open somewhere → focus it and navigate there.
        if ("focus" in client) { client.focus(); if ("navigate" in client) client.navigate(url); return; }
      }
      // Nothing open → open a fresh window.
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
