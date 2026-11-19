/* 🔔 해묘 운세 알림 보내기 — GitHub Actions가 1시간마다 실행 (HAE)
   push/{uid} 중 켜져 있고(on) 지금 한국 시각(hour)이 맞는 사람에게,
   그 사람 사주로 만든 '오늘의 한 줄'을 보냄. 같은 날 두 번은 안 보냄(lastSent). */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

// 앱 코드(브라우저용)를 그대로 쓰기 위한 최소한의 흉내 — 화면은 안 그림
const mem = {};
globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
globalThis.sessionStorage = globalThis.localStorage;
globalThis.window = globalThis;
globalThis.location = { hash: "", href: "https://luminahae.github.io/haemyo/" };
globalThis.addEventListener = () => {};
const fakeEl = () => ({ style: {}, dataset: {}, setAttribute() {}, append() {}, appendChild() {}, addEventListener() {}, classList: { add() {}, remove() {}, toggle() {} } });
globalThis.document = { createElement: fakeEl, createElementNS: fakeEl, createTextNode: () => ({}), addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, documentElement: { dataset: {}, style: {} }, head: fakeEl(), body: fakeEl() };
globalThis.matchMedia = () => ({ matches: false, addEventListener() {} });

const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!sa) { console.log("FIREBASE_SERVICE_ACCOUNT 비밀 값이 없어요 — 저장소 Settings › Secrets에 넣어 주세요."); process.exit(0); }
initializeApp({ credential: cert(JSON.parse(sa)) });
const db = getFirestore(), fcm = getMessaging();

// 한국 시각
const now = new Date(Date.now() + 9 * 3600e3);
const H = now.getUTCHours(), Y = now.getUTCFullYear(), M = now.getUTCMonth() + 1, D = now.getUTCDate();
const today = `${Y}-${String(M).padStart(2, "0")}-${String(D).padStart(2, "0")}`;
// 앱 코드의 '오늘'도 한국 날짜가 되도록
process.env.TZ = "Asia/Seoul";

const { computeSaju } = await import("../assets/js/saju/manse.js");
const { monthScores } = await import("../assets/js/saju/extras.js");
let todayLine = null;
try { ({ todayLine } = await import("../assets/js/pages/special.js")); } catch (e) { console.log("한 줄 불러오기 실패 — 기본 문장으로", e.message); }
const { todayFortune } = await import("../assets/js/saju/fortune.js");
const { solarToLunar, lunarToSolar } = await import("../assets/js/saju/astro.js");

/* 🎉 특별한 날 — 생일 · 새해 · 설날 · 추석 · 크리스마스 이브 · 크리스마스 · 관리자 기념일
   (이런 날은 '좋은 날만'으로 설정한 사람에게도 보냄) */
let L = null; try { L = solarToLunar(Y, M, D); } catch { /* ignore */ }
const HOLI = [];
if (M === 1 && D === 1) HOLI.push({ tag: "newyear", title: "🎍 새해 복 많이 받으세요!", body: "올 한 해도 해묘가 곁에서 응원할게요. 새해 선물 🪙 10개가 기다리고 있어요 🐾" });
if (L && !L.isLeap && L.month === 1 && L.day === 1) HOLI.push({ tag: "seol", title: "🧧 설날 · 새해 복 많이 받으세요!", body: "따뜻하고 넉넉한 설 명절 보내세요. 설날 선물 🪙 10개 받아 가세요 🐾" });
if (L && !L.isLeap && L.month === 8 && L.day === 15) HOLI.push({ tag: "chuseok", title: "🌕 풍성한 한가위 되시길 바라요!", body: "보름달처럼 넉넉한 추석 보내세요. 한가위 선물 🪙 10개 받아 가세요 🐾" });
if (M === 12 && D === 24) HOLI.push({ tag: "xmas-eve", title: "🎄 메리 크리스마스 이브!", body: "설레는 이브 보내세요 ✨ 오늘 밤 소원 하나 빌어 봐요 🐾" });
if (M === 12 && D === 25) HOLI.push({ tag: "xmas", title: "🎅 메리 크리스마스!!", body: "따뜻하고 행복한 크리스마스 보내세요 🎁 해묘가 늘 응원해요 🐾" });
// 관리자가 달력에 만든 기념일 (시작일에 한 번)
try {
  const ev = await db.collection("notice").doc("events").get();
  const list = (ev.exists && ev.data().list) || [];
  list.filter((e) => e.date === today).forEach((e) => HOLI.push({ tag: `ev-${e.id}`, title: `${e.emoji || "🎁"} ${e.title}`, body: `${e.msg || ""} · 해묘에서 🪙 ${e.coins}개 선물 받아 가세요` }));
} catch { /* ignore */ }
function birthdayToday(b) {
  if (!b || !b.birthDate) return false;
  const [, m, d] = b.birthDate.split("-").map(Number);
  if (b.calendarType === "lunar") {
    const conv = (ly) => { try { return lunarToSolar(ly, m, !!b.leapMonth, d) || (b.leapMonth ? lunarToSolar(ly, m, false, d) : null) || lunarToSolar(ly, m, false, Math.min(d, 29)); } catch { return null; } };
    return [Y, Y - 1].some((ly) => { const s = conv(ly); return s && s.Y === Y && s.M === M && s.D === D; });
  }
  let mm = m, dd = d;
  if (m === 2 && d === 29 && !(Y % 4 === 0 && (Y % 100 !== 0 || Y % 400 === 0))) { mm = 2; dd = 28; }
  return mm === M && dd === D;
}
function specialsFor(birth) {
  const out = [];
  const name = birth.name ? `${birth.name}님, ` : "";
  if (birthdayToday(birth)) out.push({ tag: "bday", title: `🎂 ${name}생일 축하해요!`, body: "태어나서 이 세상에서 사느라 정말 고생 많았어요. 해묘에 생일 선물 🪙 50개가 기다리고 있어요 🎁", link: "#/" });
  HOLI.forEach((h) => out.push({ ...h, link: "#/" }));
  return out.slice(0, 2); // 하루에 최대 두 개 (생일이 먼저)
}

function messageFor(birth, mode) {
  const p = computeSaju(birth);
  let score = 60;
  try { score = monthScores(p, Y, M)[D - 1].score; } catch { /* ignore */ }
  let line = "", lucky = "";
  try { const T = todayLine && todayLine(birth); if (T) { line = T.line; lucky = T.lucky && T.lucky.name; } } catch { /* ignore */ }
  if (!line) { try { line = todayFortune(p, new Date(Y, M - 1, D)).theme; } catch { line = "오늘의 운세를 확인해 보세요."; } }
  const good = score >= 72;
  if (mode === "good" && !good) return null;
  const name = birth.name ? `${birth.name}님, ` : "";
  return {
    title: good ? `✨ ${name}오늘은 날이 좋아요! (${score}점)` : score >= 60 ? `🌙 ${name}오늘의 해묘 · ${score}점` : `🌙 ${name}오늘의 해묘`,
    body: `${line}${lucky ? ` · 행운 색 ${lucky}` : ""}`,
    link: "#/fortune/saju/today",
  };
}

const testUid = (process.env.TEST_UID || "").trim();
let snap;
if (testUid) { const d = await db.collection("push").doc(testUid).get(); snap = { docs: d.exists ? [d] : [] }; }
else snap = await db.collection("push").where("on", "==", true).where("hour", "==", H).get();
console.log(`${today} ${H}시 · 대상 ${snap.docs.length}명${testUid ? " (테스트)" : ""}`);

let sent = 0, skipped = 0, dead = 0;
for (const doc of snap.docs) {
  const s = doc.data();
  if (!testUid && s.lastSent === today) { skipped++; continue; }
  if (!s.token || !s.birth || !s.birth.birthDate) { skipped++; continue; }
  let msg, sp = [];
  try { sp = specialsFor(s.birth); msg = sp.length ? sp[0] : messageFor(s.birth, s.mode); } catch (e) { console.log("풀이 실패", doc.id, e.message); skipped++; continue; }
  if (!msg) { await doc.ref.update({ lastSent: today }); skipped++; continue; } // 좋은 날만 — 오늘은 조용히
  try {
    const msgs = sp.length ? sp : [msg];
    for (const m of msgs) await fcm.send({ token: s.token, data: { title: m.title, body: m.body, link: m.link, tag: `hae-${today}-${m.tag || "daily"}` }, webpush: { headers: { Urgency: "high", TTL: "21600" } } });
    await doc.ref.update({ lastSent: today });
    sent++;
  } catch (e) {
    const code = (e && e.code) || "";
    if (code.includes("registration-token-not-registered") || code.includes("invalid-registration-token") || code.includes("invalid-argument")) { await doc.ref.update({ on: false, offReason: code }); dead++; }
    else console.log("보내기 실패", doc.id, code || e.message);
  }
}
console.log(`보냄 ${sent} · 건너뜀 ${skipped} · 끊긴 기기 ${dead}`);
process.exit(0);
