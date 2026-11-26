/* 🔔 해묘 운세 알림 + 📴 인터넷 끊김 대비 서비스 워커 (HAE)
   · 인터넷이 되면 언제나 새 파일을 받아요 (새 버전이 바로 반영) → 받은 파일은 한 벌 보관
   · 인터넷이 끊기면 보관해 둔 파일로 열어요 (한 번이라도 열어 본 화면만)
   · 서버(push/send.mjs)가 data 메시지로 { title, body, link } 를 보냄 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil((async () => {
  const keep = [CACHE];
  for (const k of await caches.keys()) if (k.startsWith("hae-") && !keep.includes(k)) await caches.delete(k);
  await self.clients.claim();
})()));

/* 📴 인터넷 먼저 → 안 되면 보관본 (같은 사이트 파일만 · Firebase 등 바깥 요청은 손대지 않음) */
const CACHE = "hae-files-v1";
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("firebase-messaging-sw.js")) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res && res.ok && res.type === "basic") {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    } catch (err) {
      const c = await caches.open(CACHE);
      const hit = await c.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === "navigate") {
        const home = (await c.match("./", { ignoreSearch: true })) || (await c.match("./index.html", { ignoreSearch: true }));
        if (home) return home;
        return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>해묘 解猫</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#2a1834;color:#f3ead8;font-family:sans-serif;text-align:center;padding:24px"><div><p style="font-size:2.4rem;margin:0">🐾</p><h1 style="font-size:1.3rem">인터넷 연결을 확인해 주세요</h1><p style="opacity:.8;line-height:1.6">해묘를 처음 열 때는 인터넷이 필요해요.<br>연결된 뒤 다시 열어 주세요.</p><button onclick="location.reload()" style="margin-top:8px;padding:12px 22px;border-radius:999px;border:0;background:#f6c9d6;color:#2a1834;font-weight:700;font-size:1rem">다시 열기</button></div></body>', { headers: { "Content-Type": "text/html; charset=utf-8" } });
      }
      throw err;
    }
  })());
});

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
