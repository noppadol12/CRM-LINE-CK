/* CK CRM service worker — รับแจ้งเตือน (Web Push) และเปิดห้องแชทเมื่อกด */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "CK CRM", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "CK CRM";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "มีข้อความใหม่",
      tag: data.tag,
      renotify: Boolean(data.tag),
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      data: { url: data.url || "/chats" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/chats", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        if (new URL(c.url).origin === self.location.origin && "focus" in c) {
          await c.focus();
          if ("navigate" in c) return c.navigate(url);
          return;
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});

// ไม่แคชหน้าเว็บ (ข้อมูลลูกค้าต้องสดเสมอ) — มี fetch handler เพื่อให้ติดตั้งเป็นแอปได้ทุกเบราว์เซอร์
self.addEventListener("fetch", () => {});
