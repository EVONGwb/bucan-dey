self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {
      title: "BUCAN DEY",
      body: event.data ? event.data.text() : "Tienes una nueva notificacion.",
    };
  }

  const title = payload.title || "BUCAN DEY";
  const options = {
    body: payload.body || "Tienes una nueva notificacion.",
    icon: "/icons/icon.svg",
    badge: "/icons/icon.svg",
    data: {
      url: payload.url || "/notifications",
      type: payload.type || "notification",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || "/notifications",
    self.location.origin
  ).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }

        return undefined;
      })
  );
});
