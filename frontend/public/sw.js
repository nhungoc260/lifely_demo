/* LIFELY service worker: nhận Web Push và hiển thị trang ngoại tuyến.
 * Quyền riêng tư: KHÔNG cache bất kỳ phản hồi API hay trang có dữ liệu cá nhân. Chỉ cache trang offline và biểu tượng. */
const CACHE = "lifely-shell-v1";
const SHELL = ["/offline.html", "/icons/icon-192.png", "/icons/badge-96.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

// Chỉ can thiệp khi điều hướng trang bị lỗi mạng: trả về trang offline. Mọi request khác đi thẳng ra mạng.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.mode !== "navigate") return;
  event.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
});

// Chỉ cho phép mở đường dẫn cùng nguồn (chống bị lợi dụng để chuyển hướng ra ngoài).
function safeUrl(u) {
  try {
    const url = new URL(u || "/", self.location.origin);
    return url.origin === self.location.origin ? url.pathname + url.search : "/";
  } catch {
    return "/";
  }
}

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : "" }; }
  const title = typeof data.title === "string" && data.title ? data.title : "LIFELY";
  const options = {
    body: typeof data.body === "string" ? data.body : "",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-96.png",
    tag: typeof data.tag === "string" ? data.tag : undefined,
    data: { url: safeUrl(data.url) },
    lang: "vi",
    requireInteraction: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) { c.navigate(target).catch(() => {}); return c.focus(); }
      }
      return self.clients.openWindow ? self.clients.openWindow(target) : undefined;
    }),
  );
});
