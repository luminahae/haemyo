/* 🔔 해묘 운세 알림 — 백그라운드에서 알림을 받아 보여 주는 서비스 워커 (HAE)
   · 화면 저장(캐시)은 하지 않아요 — 알림만 담당 (새 버전이 바로 반영되게)
   · 서버(push/send.mjs)가 data 메시지로 { title, body, link } 를 보냄 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let d = {};
  try { const j = e.data ? e.data.json() : {}; d = j.data || j.notification || j; } catch { d = { body: e.data ? e.data.text() : "" }; }
  const title = d.title || "🌙 오늘의 해묘";
  const opts = {
    body: d.body || "오늘의 운세를 확인해 보세요 🐾",
    icon: "assets/img/icon-192.png",
    badge: "assets/img/icon-192.png",
    tag: d.tag || "hae-daily",
    renotify: true,
    data: { link: d.link || "#/fortune/saju/today" },
  };
  e.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.link) || "#/", self.registration.scope).href;
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) { if (c.url.startsWith(self.registration.scope)) { try { await c.focus(); c.navigate(url); return; } catch { /* ignore */ } } }
    await self.clients.openWindow(url);
  })());
});
