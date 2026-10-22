/* =========================================================
   코인 지갑 — 점신/포스텔러식 소액결제(충전 → 회당 차감).
   · 충전(코인 구매)은 외부 결제사 호스티드 페이지에서 처리(서버 없이).
   · 해석 1회 = 1코인(기본 500원). 한 번 연 해석은 다시 볼 때 무료(unlocked 저장).

   ⚠️ 정직한 한계: 정적 사이트라 코인 잔액은 이 브라우저(localStorage)에 있어서
   기술적으로 조작이 가능하다. 실제 매출 보호가 필요하면 서버리스 함수에서
   잔액·차감을 관리해야 한다(SETUP.md). MVP로는 이 방식으로 시작한다.
   ========================================================= */

import { getActiveId } from "./auth.js";
import { toast } from "./utils/dom.js";
import { getPaymentConfig, isCloudEnabled } from "./config.js";

export const COIN_PRICE_KRW = 500;

/* 해석별 코인 가격(티어). 여기서 한 번에 조정. 1코인 ≈ 500원.
   무료: 기본 명식·성향, 타로 뽑기, 오라클(가벼운 재미), 홈. */
export const COIN_COST = {
  // ── 가벼운 (1코인) ─────────────────
  today: 1, tomorrow: 1, tomorrowlove: 1, weekday: 1, weekend: 1, todaylove: 1, biorhythm: 0, luckycard: 1, charmtoday: 1, taegil: 1,
  dayfortune: 1, iching: 0, oracle: 0, bujeok: 1, sajumbti: 1, palm: 2, studyluck: 2, dohwa: 2, gwimun: 2, lovecount: 2, nomarry: 2, children: 2, completeme: 2, fate3: 3, rich: 3, bizjob: 3, moneytime: 3, luck12: 3, sal_yangin: 2, sal_goegang: 2, sal_baekho: 2, sal_hyeonchim: 2, sal_gongmang: 2, sal_gosin: 2, sal_cheonra: 2, sal_samjae: 2, sal_munchang: 2, sal_cheondeok: 2, sal_geupgak: 2, sal_amrok: 2, sal_geumyeo: 2, sal_gilsin: 3, sal_gwiti: 2, love10: 3, blueprint: 5, spouseluck: 3, story: 2, manual: 0, timeline: 3, soyukim: 0, astrodice: 0, lottoagain: 1, gaeun: 2, sajutoon: 2, healthsaju: 2, hwagae: 2, yeokma: 2, reunioncompat: 3, naming: 10, namefix: 10, daeundetail: 1, daeunall: 5, tojeongplus: 3, cpclassic: 2, cpelem: 2, cpanimal: 2, cpmoney: 2, cpnight: 2, cptravel: 2, cpeco: 2, cpif: 2, cpgift: 2, rankself: 2, rankall: 10,     // 만세력·캘린더 하루 상세 (당일 무료)
  job: 2, interview: 2, jobchange: 2, promotion: 2, coworker: 2, startup: 2, windfall: 2, saving: 2, invest: 2, spending: 2, sidejob: 2,
  jobmonth: 3, moneymonth: 3, worktype: 3, moneytype: 3, dday: 3, pastlife: 3, pastlove: 2, ddaylove: 2, ddaymarry: 2, ddaymeet: 2,
  daypreview: 2,      // 운세 캘린더 지정일 미리보기 (이후 24h 내 1코인)
  // ── 중간 (2코인) ──────────────────
  study: 2, wealth: 2, document: 2, guiin: 2, "saju-strength": 2, gwansang: 2,
  month: 2, nextmonth: 2, monthlove: 2, daylove: 2, business: 2, h1lucky: 2, h2lucky: 2,
  zodiac: 0, star: 0, charmmonth: 2,
  // ── 심층 성격 (30코인) · 캘린더 한 달 한 번에 (60코인) ──
  sajudeep: 30, calendar: 60,
  // ── 묵직·인기 (3코인) ─────────────
  love: 3, pull: 3, yearlove: 3, reunion: 3, breakup: 3, "ziwei-deep": 3, tojeong: 3, tojeonglife: 5, tojeongcompat: 3, tjt_love: 3, tjt_money: 3, tjt_success: 3, tjt_spouse: 3, tjt_fate: 3, tarot: 3, year: 3,
  // ── 나의 인연 (5코인) : 진입 + 초상화 개당 ──
  inyeon: 5, "spouse-portrait": 5, "portrait-date": 5, "portrait-avoid": 5,
  // ── 종합·고가 (5코인) ─────────────
  compat: 5,
  rank: 5,           // 내 사람 랭킹(귀인·결혼운·도화살·우정의 작대기) 각각 — 한 번 열면 사람 추가돼도 계속 무료
  pullpair: 5,        // 내 매력 사주 — 그 사람과 끌림 궁합          // 궁합 — 두 사람 종합
  reuniondeep: 5,     // 재회 심화 — 사귄·헤어진 날짜로 재회 가능 시기까지
  friendadd: 10,      // 친구 직접 입력 추가 (카톡 초대 추가는 무료)
};
export function costOf(kind) { return kind in COIN_COST ? COIN_COST[kind] : 1; }

/* 스토어/안내용 가격표 (그룹별) */
export const PRICE_TABLE = [
  { group: "기본 운세 · 무료", items: [["오늘·내일·이번 주 운세", 0], ["이달·다음달·올해 운세", 0], ["연애운 (오늘·내일·지정일·이달·올해) · 재회운 · 이별운", 0], ["공부·시험·면접·문서운", 0], ["취업·직장·이직·승진·창업운", 0], ["재물·횡재·저축·투자·지출·부업·사업운", 0], ["상·하반기 행운의 달", 0], ["운세 캘린더 · 날짜별 하루 상세 · 택일", 0], ["주역점 · 소육임 · 점성술 다이스 · 오라클 · 꿈해몽", 0], ["띠 운세 · 별자리 · 바이오리듬", 0], ["사주팔자 사용설명서", 0]] },
  { group: "가벼운 프리미엄 · 1코인", items: [["사주 MBTI", 1], ["개운 부적 (소원별)", 1], ["행운 번호 추가 세트 (하루 1세트 무료)", 1]] },
  { group: "프리미엄 · 2코인", items: [["귀티 나는 사주 체크", 2], ["잘사는 별 체크 — 금여·천을·건록·암록·천주·천덕월덕·문창 한 번에", 3], ["신살 체크 — 금여·양인·괴강·백호·현침·공망·고신과숙·천라지망·삼재·문창학당·천덕월덕·급각·암록 (각각)", 2], ["사주 스토리 리딩 (음성 해설)", 2], ["지난 연애 맞히기", 2], ["연애 시작 D-day · 결혼 D-day · 인연은 어디서 (사주·타로 각각)", 2], ["귀인 체크", 2], ["관상", 2], ["풍수 배치 · 개운", 2], ["사주툰 4컷", 2], ["손금 풀이", 2], ["공부운 특집", 2], ["도화살 · 화개살 · 역마살 · 귀문관살", 2], ["남은 연애 횟수 · 결혼하면 안 되는 상대 · 자녀운 · 나를 완성시켜 줄 사람", 2], ["이달 사주 건강운", 2]] },
  { group: "묵직·인기 프리미엄 · 3코인", items: [["토정비결 궁합 (한 해 궁합 · 결혼 궁합 · 어느 해든)", 3], ["토정비결 테마 — 연애운·재물운·성공운·배우자복·운명의 사람 (각각)", 3], ["십이운성 신년운세 (열두 달 · 다른 해는 한 해씩 추가)", 3], ["연애운 10년 연대기", 3], ["나의 배우자복", 3], ["헤어진 이유 · 재회 궁합 (상대 사주)", 3], ["궁합 특집 — 정통·오행·일주동물·재물·낮져밤이·여행·경제관념·만약 연인이라면 (각각, 사람마다)", 2], ["궁합 특집 — 선물·초콜릿·색 추천 (한 번에)", 2], ["우리 모두 순위(나 포함) — 하나 2코인 · 8가지 전부 10코인", 2], ["이름풀이 — 처음 1번 무료 · 이름·한자를 바꿔 새로 볼 때마다", 10], ["작명 · 개명 (이름 받을 때마다 · 받은 이름은 저장 · 같은 조건 더 보기 무료)", 10], ["올해 취업·합격 시기 · 돈 들어오는 달", 3], ["나에게 맞는 직업 · 나의 재물 그릇", 3], ["전생 이야기", 3], ["내 매력 사주", 3], ["타로 리딩", 3], ["자미두수 8단계 심화", 3], ["토정비결", 3], ["토정비결 월별 · 일별 (그해)", 3], ["내 인생 타임라인", 3], ["운명의 세 사람 (귀인 · 인생의 반쪽 · 나를 단련시키는 사람)", 3], ["나는 부자가 될까? (사주·관상·타로)", 3], ["창업 vs 취업 (사주·자미두수·타로)", 3], ["돈 버는 시기 · 모으는 시기", 3], ["타임라인 대운 상세 (10년 하나 1코인 · 전부 5코인)", 1]] },
  { group: "종합 · 5코인", items: [["5년 인생 설계 (Blueprint)", 5], ["궁합", 5], ["내 사람 랭킹 (귀인·결혼운·도화살·우정) 각각 · 한 번 열면 계속 무료", 5], ["그 사람과 끌림 궁합", 5], ["관계 흐름 분석 (사귄·헤어진 날짜 → 재회 시기)", 5]] },
  { group: "나의 인연 · 5코인", items: [["나의 인연 알아보기 (이상형·낮져밤이·바람기)", 5], ["배우자 초상화", 5], ["연애할 사람 초상화", 5], ["만나면 안 될 사람 초상화", 5]] },
  { group: "친구 · 10코인", items: [["새 사람 직접 입력 (궁합 등에서 입력하면 내 사람에 바로 저장 · 초대 링크는 무료)", 10]] },
  { group: "심층 · 30코인", items: [["심층 성격 분석 (분야별 전체)", 30]] },
];

const KEY = "str.wallet.v1";
const walletKey = () => getActiveId() || "guest";

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
function readMine() {
  const w = readAll()[walletKey()];
  return w && typeof w === "object" ? w : { coins: 0, unlocked: [], spent: 0 };
}
function writeMine(w) {
  const all = readAll();
  all[walletKey()] = w;
  localStorage.setItem(KEY, JSON.stringify(all));
  try { window.dispatchEvent(new CustomEvent("walletchange")); } catch { /* ignore */ }
}

export function getCoins() { return readMine().coins || 0; }
export function getWallet() { return readMine(); }

/** 보너스 코인 1회 지급 (회원가입·소셜연동 등). key가 이미 지급됐으면 무시 */
export function grantOnce(key, amount, meta = {}) {
  const w = readMine();
  w.bonuses = w.bonuses || [];
  if (w.bonuses.includes(key)) return { ok: false, already: true };
  w.bonuses.push(key); writeMine(w);
  addCoins(amount, { kind: "bonus", key, ...meta });
  return { ok: true, amount };
}

/* 하루 무제한 코드 — 입력한 날 자정까지 무제한, 코드마다 한 사람당 3번 */
export const DAYPASS_MAX = 3;
export const DAYPASS_CODES = [
  { id: "hakuna", name: "하쿠나 마타타", scope: "all", emoji: "🦁", popup: "걱정 마세요, 다 잘 될 거예요", aliases: ["hakunamatata", "하쿠나마타타"] },
  { id: "abra", name: "아브라카다브라", scope: "all", emoji: "🪄", popup: "말한 대로 이루어지길 바라요", aliases: ["abracadabra", "avracadabra", "아브라카다브라"] },
  { id: "roopre", name: "루프리 텔캄", scope: "all", emoji: "🌟", popup: "모든 것을 이루길, 저도 간절히 같이 바랄게요", aliases: ["roopretelcham", "루프리텔캄"] },
];
function todayKey() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
/* 무제한 범위 — 항목 id 앞머리로 구분 */
export const DAYPASS_SCOPES = [
  { id: "saju", name: "사주·운세", desc: "사주 리포트·테마 운세·궁합·인연·캘린더 등" },
  { id: "tarot", name: "타로", desc: "타로·테마 타로·물어보기·행운 카드" },
  { id: "ziwei", name: "자미두수", desc: "명반 심화 풀이" },
  { id: "tojeong", name: "토정비결", desc: "해마다 토정비결·인생 흐름" },
  { id: "all", name: "전부 다", desc: "모든 해석" },
];
export function scopeOf(itemId) {
  const k = String(itemId || "");
  if (/^(tarot|oracle|luckycard)/.test(k)) return "tarot";
  if (/^ziwei/.test(k)) return "ziwei";
  if (/^tojeong/.test(k)) return "tojeong";
  return "saju";
}
function passInfo() {
  const p = readMine().daypass;
  if (!p) return null;
  if (typeof p === "string") return p === todayKey() ? { date: p, scope: "all" } : null; // 예전 형식
  return p.date === todayKey() ? p : null;
}
/** 오늘 켜진 하루 무제한 범위 (없으면 null) */
export function dayPassScope() { try { const p = passInfo(); return p ? p.scope : null; } catch { return null; } }
export function isDayPass(itemId) {
  const sc = dayPassScope();
  if (!sc) return false;
  if (itemId === undefined) return true;
  return sc === "all" || sc === scopeOf(itemId);
}
export function dayPassScopeName() { const sc = dayPassScope(); return sc ? (DAYPASS_SCOPES.find((x) => x.id === sc) || {}).name : null; }
function dayPassCheck(dp) {
  const used = (readMine().dayUses || {})[dp.id] || 0;
  if (dayPassScope()) return { ok: false, message: `오늘은 이미 하루 무제한(${dayPassScopeName()})이 켜져 있어요. 내일 다시 써 주세요 (횟수는 차감되지 않았어요).` };
  if (used >= DAYPASS_MAX) return { ok: false, message: `‘${dp.name}’는 한 사람당 ${DAYPASS_MAX}번까지만 쓸 수 있어요. 이미 ${DAYPASS_MAX}번 모두 사용했어요.` };
  return null;
}
/** 하루 무제한 적용 (범위 선택 후 호출) */
export function applyDayPass(id, scope) {
  const dp = DAYPASS_CODES.find((m) => m.id === id);
  if (!dp) return { ok: false, message: "유효하지 않은 코드예요." };
  const chk = dayPassCheck(dp); if (chk) return chk;
  const w = readMine(); w.dayUses = w.dayUses || {};
  const used = w.dayUses[dp.id] || 0;
  w.dayUses[dp.id] = used + 1; w.daypass = { date: todayKey(), scope }; writeMine(w);
  try { window.dispatchEvent(new CustomEvent("walletchange")); } catch { /* ignore */ }
  const sname = (DAYPASS_SCOPES.find((x) => x.id === scope) || {}).name || "전부";
  return { ok: true, kind: "daypass", popup: dp.popup, emoji: dp.emoji,
    popupSub: `오늘 하루(자정까지) ${scope === "all" ? "모든 해석" : sname} 무제한 · 이 코드는 한 사람당 ${DAYPASS_MAX}번까지 (남은 횟수 ${DAYPASS_MAX - used - 1}번)`,
    message: `${dp.name} · 오늘 하루 ${sname} 무제한!` };
}
/** 코드별 사용 횟수 [{...code, used, left}] */
export function dayPassStatus() {
  const u = readMine().dayUses || {};
  return DAYPASS_CODES.map((c) => ({ ...c, used: u[c.id] || 0, left: DAYPASS_MAX - (u[c.id] || 0) }));
}

/* 매달 1일(그달 처음 앱을 열 때) 코인이 들어오는 코드들 */
export const MONTHLY_CODES = [
  { id: "serendipity", name: "세렌디피티", coins: 10, emoji: "🍀", popup: "‘뜻밖의 행운’이 생기길 바라며", aliases: ["serendipity", "세렌디피티"] },
  { id: "castorpollux", name: "카스트로폴룩스", coins: 15, emoji: "✨", popup: "‘당신의 행복을 기원해요. 항상 행복하세요’", aliases: ["castorpollux", "카스트로폴룩스", "카스트로폴로스", "카스토르폴룩스", "카스토르폴룩"] },
];
export const SEREN_COINS = 10;
/** 등록된 매달 코드 id 목록 (예전 세렌디피티 등록도 포함) */
export function monthlyCodes() {
  const w = readMine();
  return [...new Set([...(w.monthly || []), ...(w.serendipity ? ["serendipity"] : [])])];
}
export function hasSerendipity() { return monthlyCodes().includes("serendipity"); }
/** 이번 달 몫 지급 — 반환: 이번에 새로 지급된 코드들 [{id,name,coins,emoji}] */
export function grantMonthly(onlyId) {
  const d = new Date(); const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const out = [];
  for (const id of monthlyCodes()) {
    if (onlyId && id !== onlyId) continue;
    const mc = MONTHLY_CODES.find((m) => m.id === id); if (!mc) continue;
    if (grantOnce(`${id}:${ym}`, mc.coins, { kind: "monthly", code: id }).ok) out.push(mc);
  }
  return out;
}
export function grantSerendipity() { return { ok: grantMonthly("serendipity").length > 0 }; }

/** 로그인 사용자에게 매일 1코인 (하루 1회). 게스트는 제외. */
export function grantDailyLogin() {
  if (!getActiveId()) return { ok: false };
  const d = new Date(); const p = (n) => String(n).padStart(2, "0");
  const key = `login:${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return grantOnce(key, 1, { kind: "login" });
}

/** 코인 충전 — 결제 성공(라이선스/영수증) 확인 후 호출 */
export function addCoins(n, meta = {}) {
  const w = readMine();
  w.coins = (w.coins || 0) + Math.max(0, Math.floor(n));
  w.history = (w.history || []).concat([{ t: Date.now(), add: n, ...meta }]).slice(-50);
  writeMine(w);
  return w.coins;
}

/* ---- 관리자(무제한) + 쿠폰 ---- */
const ADMIN_KEY = "str.admin.v1";
// 평문 노출 방지용 해시(FNV-1a). 진짜 보안은 서버 필요(SETUP.md).
const ADMIN_CODE_HASH = 3655689097; // 관리자 코드 (소문자·공백 제거 후 비교)
const FAMILY_KEY = "str.family.v1";
const FAMILY_CODE_HASH = 1938178408; // 가족(엄마) 코드 — 무제한 열람만, 관리 권한 없음
function fnv(s) { let x = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619) >>> 0; } return x >>> 0; }
// 쿠폰: 별칭(정규화: 영문 대·소문자 무시, 띄어쓰기 무시) → 같은 id면 한 번만 사용
const COUPONS = [
  { id: "haemyo", coins: 10, aliases: ["해묘", "haemyo"], old: ["myonyang"] },
  { id: "sunshine", coins: 30, msg: "☀️ 당신은 햇살 같은 존재랍니다!", aliases: ["youaremysunshine", "urmysunshine"], old: ["you are my sunshine", "u r my sunshine"] },
];
/** 코드 정규화 — 전각→반각, 대문자→소문자, 공백 제거 */
function normCode(s) { return String(s || "").normalize("NFKC").toLowerCase().replace(/\s+/g, ""); }

/** 수명 운을 볼 수 있는지 — 관리자 또는 VITA 코드 입력자 */
export function canSeeLifespan() { try { return isAdmin() || !!readMine().vita; } catch { return false; } }
/* 관리자는 오너 이메일(lumina.hae@gmail.com)로 로그인한 경우에만 — 다른 계정이면 코드가 있어도 꺼짐 */
const OWNER_EMAIL = "lumina.hae@gmail.com";
function ownerSignedIn() {
  if (!isCloudEnabled()) return true; // 로그인 기능이 꺼진 로컬 모드에선 예전처럼 코드만으로
  try {
    const act = getActiveId() || "", own = localStorage.getItem("str.owneruid.v1") || "";
    if (own && act === own) return true; // 오너 계정으로 로그인해 둔 상태면 확인이 잠깐 늦어도 관리자 유지
    return (localStorage.getItem("str.cloudmail.v1") || "").toLowerCase() === OWNER_EMAIL && act.startsWith("cloud_");
  } catch { return false; }
}
export function isAdmin() {
  try { return localStorage.getItem(ADMIN_KEY) === "1" && ownerSignedIn(); } catch { return false; }
}
export function setAdmin(on) {
  try { if (on) localStorage.setItem(ADMIN_KEY, "1"); else localStorage.removeItem(ADMIN_KEY); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent("walletchange")); } catch { /* ignore */ }
}

export function isFamily() {
  try { return localStorage.getItem(FAMILY_KEY) === "1"; } catch { return false; }
}
export function setFamily(on) {
  try { if (on) localStorage.setItem(FAMILY_KEY, "1"); else localStorage.removeItem(FAMILY_KEY); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent("walletchange")); } catch { /* ignore */ }
}
/** 코인 없이 무제한 열람 (관리자 또는 가족) */
export function isUnlimited() { return isAdmin() || isFamily() || dayPassScope() === "all"; }
/** 이 항목이 무제한으로 열리는지 (관리자·가족·하루 무제한 범위) */
function freeFor(itemId) { return isAdmin() || isFamily() || isDayPass(itemId); }

/** 관리자 코드 / 쿠폰 코드 인증 */
export function redeemCode(raw) {
  const code = (raw || "").trim();
  if (!code) return { ok: false, message: "코드를 입력해 주세요." };
  const key = normCode(code);
  if (fnv(key) === ADMIN_CODE_HASH) {
    if (!ownerSignedIn()) return { ok: false, message: "관리자 인증은 관리자 계정(lumina.hae@gmail.com)으로 로그인한 상태에서만 할 수 있어요." };
    setAdmin(true);
    return { ok: true, kind: "admin", message: "관리자 모드가 켜졌어요. 모든 해석이 무제한입니다." };
  }
  if (fnv(key) === FAMILY_CODE_HASH) {
    setFamily(true);
    return { ok: true, kind: "family", message: "엄마 모드가 켜졌어요 💗 모든 해석을 무제한으로 볼 수 있어요." };
  }
  // 수명 운 열람 코드
  if (key === "vita") {
    const w = readMine();
    if (w.vita) return { ok: false, message: "이미 수명 운이 열려 있어요. 홈 › 수명 운에서 볼 수 있어요." };
    w.vita = true; writeMine(w);
    try { window.dispatchEvent(new CustomEvent("walletchange")); } catch { /* ignore */ }
    return { ok: true, kind: "vita", popup: "수명 운이 열렸어요", emoji: "🕯️", popupSub: "홈 › 수명 운에서 사주·토정비결·자미두수로 본 수명의 고비를 볼 수 있어요. 옛 방식으로 본 풀이라 맞지 않을 수도 있고, 얼마든지 달라질 수 있어요." };
  }
  // 하루 무제한 코드 (한 사람당 코드마다 3번)
  const dp = DAYPASS_CODES.find((m) => m.aliases.map(normCode).includes(key));
  if (dp) {
    const chk = dayPassCheck(dp);
    if (chk) return chk;
    if (dp.scope === "choose") return { ok: true, kind: "daypass-choose", id: dp.id, name: dp.name, emoji: dp.emoji, options: DAYPASS_SCOPES, message: "무엇을 무제한으로 볼지 골라 주세요" };
    return applyDayPass(dp.id, dp.scope);
  }
  // 매달 코인 코드 (세렌디피티 10개 · 카스토르폴룩스 15개) — 한 번 등록하면 매달 1일마다
  const mc = MONTHLY_CODES.find((m) => m.aliases.map(normCode).includes(key));
  if (mc) {
    if (monthlyCodes().includes(mc.id)) return { ok: false, message: `이미 ${mc.name}가 등록돼 있어요. 매달 1일에 코인 ${mc.coins}개가 들어와요 ${mc.emoji}` };
    const w = readMine(); w.monthly = [...new Set([...(w.monthly || []), mc.id])]; writeMine(w);
    const g = grantMonthly(mc.id);
    return { ok: true, kind: "coupon", coins: g.length ? mc.coins : 0, popup: mc.popup, emoji: mc.emoji,
      popupSub: `이번 달 코인 +${mc.coins} · 앞으로 매달 1일마다 ${mc.coins}개씩 들어와요 ${mc.emoji}`, message: `${mc.name} 등록!` };
  }
  const cp = COUPONS.find((c) => c.aliases.map(normCode).includes(key));
  if (cp) {
    const w = readMine(); w.coupons = w.coupons || [];
    if ([cp.id, ...(cp.old || [])].some((k) => w.coupons.includes(k))) return { ok: false, message: "이미 사용한 쿠폰이에요." };
    w.coupons.push(cp.id); writeMine(w);
    addCoins(cp.coins, { kind: "coupon", code: cp.id });
    return { ok: true, kind: "coupon", coins: cp.coins, popup: cp.msg || null, message: `${cp.msg ? cp.msg + " " : "쿠폰 적용! "}코인 +${cp.coins}` };
  }
  return { ok: false, message: "유효하지 않은 코드예요." };
}

export function isUnlocked(itemId) {
  if (freeFor(itemId)) return true;           // 관리자·가족·하루 무제한
  return readMine().unlocked?.includes(itemId) || false;
}

/**
 * 해석 열기. 이미 열었으면 무료로 통과. 아니면 코인 1개 차감.
 * @returns {{ok:boolean, reason?:"already"|"spent"|"insufficient", coins:number}}
 */
/* 열람 기록 (관리자가 볼 수 있음) — 코인으로 연 것 · 코드로 무제한 연 것 · 무료로 본 것 모두 */
function curPath() { try { return (location.hash || "").replace(/^#/, "").split("?")[0] || ""; } catch { return ""; } }
/* 누구의 풀이인지 · 누구와의 궁합인지 (보관함에 보여 줌) */
function viewerName() {
  try {
    const pid = localStorage.getItem("str.activeProfile.v1") || "guest";
    const va = JSON.parse(localStorage.getItem("str.viewas.v1") || "null");
    if (va && va.name) return va.name;
    const my = JSON.parse(localStorage.getItem("str.mybirth.v1") || "{}")[pid];
    return (my && my.name) || "";
  } catch { return ""; }
}
function curPair() { try { const q = window.__haePair; return q && q.path === curPath() && Date.now() - q.t < 20 * 60 * 1000 ? q.text : ""; } catch { return ""; } }
/** 궁합 화면 — 지금 보는 두 사람을 알려 두면 열람 기록에 '누구와'가 붙음. log:true면 '봤다'고 기록 */
export function notePair(text, { log = false } = {}) {
  try {
    window.__haePair = { path: curPath(), text, t: Date.now() };
    if (!log) return;
    const w = readMine(); const last = [...(w.openLog || [])].reverse().find((x) => x.id === "view:" + curPath() && x.title);
    logOpen({ id: "view:" + curPath(), c: 0, via: "view", title: last ? last.title : (document.querySelector("#app h1") || {}).textContent || "", with: text });
  } catch { /* ignore */ }
}
export function logOpen(entry) {
  try {
    if (sessionStorage.getItem("str.adminview.v1")) return; // 관리자가 회원 시점으로 보는 중엔 기록 안 함 (회원·관리자 기록 모두 그대로)
    const w = readMine(); const log = w.openLog || [];
    const e = { t: Date.now(), p: curPath(), who: viewerName(), with: curPair(), ...entry };
    const last = [...log].reverse().find((x) => x.id === e.id && (x.with || "") === (e.with || ""));
    if (last && Date.now() - last.t < 30 * 60 * 1000 && (last.via || "") === (e.via || "")) return; // 30분 안 같은 열람은 한 번만
    w.openLog = log.concat([e]).slice(-400);
    writeMine(w);
  } catch { /* ignore */ }
}
/* 관리자 — 코인 선물 내역 (관리자 계정에 쌓임 · 클라우드로 같이 저장) */
export function logGift(e) { const w = readMine(); w.giftLog = [{ t: Date.now(), ...e }, ...(w.giftLog || [])].slice(0, 500); writeMine(w); }
export function getGiftLog() { return readMine().giftLog || []; }
export function markGiftCanceled(id) { const w = readMine(); w.giftLog = (w.giftLog || []).map((x) => (x.id === id ? { ...x, canceled: Date.now() } : x)); writeMine(w); }
/* 보관함 — 로그인한 계정에 영구 보관 (열람 기록은 7일) */
export function getKept() { return readMine().kept || []; }
export function keepItem(item) {
  try { if (sessionStorage.getItem("str.adminview.v1")) return false; } catch { /* ignore */ }
  const w = readMine(); const k = w.kept || [];
  if (k.some((x) => x.key === item.key)) return false;
  w.kept = [{ ...item, keptAt: Date.now() }, ...k].slice(0, 300);
  writeMine(w); return true;
}
/** 보관 해제 — 열어 본 목록으로 돌려보내서 해제한 날부터 7일 동안 보이다 사라짐 */
export function unkeepItem(key) {
  try { if (sessionStorage.getItem("str.adminview.v1")) return; } catch { /* ignore */ }
  const w = readMine(); const k = (w.kept || []).find((x) => x.key === key);
  w.kept = (w.kept || []).filter((x) => x.key !== key);
  if (k && k.path) {
    w.openLog = (w.openLog || []).concat([{ id: "view:" + k.path, c: 0, via: "view", t: Date.now(), p: k.path, title: k.name, who: k.who || "", with: k.with || "", keepTag: k.tag, unkept: 1 }]).slice(-400);
  }
  writeMine(w);
}
export function unlock(itemId, cost = 1) {
  if (freeFor(itemId)) { logOpen({ id: itemId, c: 0, via: isAdmin() ? "admin" : isFamily() ? "family" : "daypass" }); return { ok: true, reason: "admin", coins: Infinity }; }
  const w = readMine();
  w.unlocked = w.unlocked || [];
  if (w.unlocked.includes(itemId)) return { ok: true, reason: "already", coins: w.coins || 0 };
  if ((w.coins || 0) < cost) return { ok: false, reason: "insufficient", coins: w.coins || 0 };
  w.coins -= cost;
  w.spent = (w.spent || 0) + cost;
  w.unlocked.push(itemId);
  w.openLog = (w.openLog || []).concat([{ id: itemId, c: cost, t: Date.now(), p: curPath(), who: viewerName(), with: curPair() }]).slice(-400); // 관리자 열람 기록용
  writeMine(w);
  return { ok: true, reason: "spent", coins: w.coins };
}

/* ---- 열어본 날짜 기록 (운세 캘린더용) ---- */
export function markDayViewed(dateStr) {
  const w = readMine(); w.viewedDays = w.viewedDays || [];
  if (!w.viewedDays.includes(dateStr)) { w.viewedDays.push(dateStr); w.viewedDays = w.viewedDays.slice(-500); writeMine(w); }
}
export function getViewedDays() { return readMine().viewedDays || []; }

/* ---- 지정일 미리보기 (2코인, 구매 후 24시간 내 다른 날은 1코인) ---- */
export const DAYPREVIEW_FULL = 2, DAYPREVIEW_DISC = 1, DAYPREVIEW_WINDOW_MS = 24 * 3600 * 1000;
/** 지금 지정일 미리보기 가격 (24h 할인 여부 포함) */
export function dayPreviewCost() {
  const w = readMine();
  const last = w.lastPreviewAt || 0;
  const disc = last > 0 && (Date.now() - last) < DAYPREVIEW_WINDOW_MS;
  return { cost: disc ? DAYPREVIEW_DISC : DAYPREVIEW_FULL, discounted: disc, until: disc ? last + DAYPREVIEW_WINDOW_MS : null };
}
/** 지정일 미리보기 구매 — 성공 시 그 날을 열고(기록) 24h 할인창을 갱신 */
export function buyDayPreview(dateStr) {
  if (freeFor("calendar")) { markDayViewed(dateStr); return { ok: true, cost: 0, discounted: false }; }
  const { cost, discounted } = dayPreviewCost();
  const w = readMine();
  if ((w.coins || 0) < cost) return { ok: false, reason: "insufficient", coins: w.coins || 0, cost };
  w.coins -= cost; w.spent = (w.spent || 0) + cost;
  w.lastPreviewAt = Date.now();
  w.viewedDays = w.viewedDays || [];
  if (!w.viewedDays.includes(dateStr)) w.viewedDays.push(dateStr);
  w.viewedDays = w.viewedDays.slice(-500);
  w.history = (w.history || []).concat([{ t: Date.now(), sub: cost, kind: "daypreview", date: dateStr }]).slice(-50);
  writeMine(w);
  return { ok: true, cost, discounted, coins: w.coins };
}

/** 테스트/무료제공용 — 코인 없이 열어 주기(예: 첫 해석 무료 이벤트) */
export function grant(itemId) {
  const w = readMine();
  w.unlocked = w.unlocked || [];
  if (!w.unlocked.includes(itemId)) { w.unlocked.push(itemId); writeMine(w); }
}

/** 소모성 차감(열람권이 아니라 즉시 소모: 예 친구 직접 추가). 부족하면 실패. */
export function spend(amount, meta = {}) {
  if (freeFor(meta.kind || "")) return { ok: true, coins: Infinity };
  const w = readMine();
  if ((w.coins || 0) < amount) return { ok: false, reason: "insufficient", coins: w.coins || 0 };
  w.coins -= amount; w.spent = (w.spent || 0) + amount;
  w.history = (w.history || []).concat([{ t: Date.now(), sub: amount, ...meta }]).slice(-50);
  writeMine(w);
  return { ok: true, coins: w.coins };
}

/** 친구를 추가하면 그 친구의 사주(심층)·자미두수·나와의 궁합·귀인 여부를 무료로 열어 준다. */
export function grantFriendBundle(myInput, friendInput) {
  if (!friendInput || !friendInput.birthDate) return;
  grant(chartItemId("sajudeep", friendInput));
  grant(chartItemId("ziwei-deep", friendInput));
  if (myInput && myInput.birthDate) {
    grant(`compat:${myInput.birthDate}_${friendInput.birthDate}`);
    grant(`compat:${friendInput.birthDate}_${myInput.birthDate}`);
    grant(`guiin:${myInput.birthDate}_${friendInput.birthDate}`);
  }
}

export function resetWallet() { const all = readAll(); delete all[walletKey()]; localStorage.setItem(KEY, JSON.stringify(all)); }

/* ---- 출석체크(무료 코인) — 매일 1개, 연속 7일마다 보너스 ---- */
export const DAILY_REWARD = 1;
export const STREAK_BONUS = 5;      // 7일 연속 시 추가 (보너스 5코인)
const dayStr = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export function checkInStatus() {
  const w = readMine();
  const today = dayStr();
  const claimedToday = w.lastCheck === today;
  const streak = w.streak || 0;
  const nextStreak = claimedToday ? streak : streakAfter(w.lastCheck, streak);
  const bonus = nextStreak > 0 && nextStreak % 7 === 0 ? STREAK_BONUS : 0;
  return { claimedToday, streak, nextStreak, reward: DAILY_REWARD + bonus, bonus };
}

function streakAfter(lastCheck, streak) {
  if (!lastCheck) return 1;
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (lastCheck === dayStr(y)) return (streak || 0) + 1; // 어제 출석 → 연속
  if (lastCheck === dayStr()) return streak || 1;
  return 1; // 끊김 → 리셋
}

/** 오늘의 출석 코인 받기. 하루 1회. */
export function claimCheckIn() {
  const w = readMine();
  const today = dayStr();
  if (w.lastCheck === today) return { ok: false, reason: "already", coins: w.coins || 0 };
  const newStreak = streakAfter(w.lastCheck, w.streak || 0);
  const bonus = newStreak % 7 === 0 ? STREAK_BONUS : 0;
  const reward = DAILY_REWARD + bonus;
  w.lastCheck = today;
  w.streak = newStreak;
  w.coins = (w.coins || 0) + reward;
  w.history = (w.history || []).concat([{ t: Date.now(), add: reward, kind: "checkin", streak: newStreak }]).slice(-50);
  writeMine(w);
  return { ok: true, reward, bonus, streak: newStreak, coins: w.coins };
}

/* ---- 충전: 결제 후 라이선스 키 검증 → 코인 지급(중복 방지) ---- */
export async function redeemLicense(licenseRaw) {
  const cfg = getPaymentConfig();
  const license = (licenseRaw || "").trim();
  if (!license) return { ok: false, message: "라이선스 키를 입력해 주세요." };

  const w = readMine();
  if ((w.redeemed || []).includes(license)) return { ok: false, message: "이미 충전에 사용한 키예요." };

  try {
    let variantId = "", productId = "", valid = false;
    if (cfg.provider === "gumroad") {
      const pkgP = cfg.packages.find((p) => p.productId);
      const r = await fetch("https://api.gumroad.com/v2/licenses/verify", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ product_id: (pkgP && pkgP.productId) || "", license_key: license, increment_uses_count: "false" }),
      });
      const d = await r.json().catch(() => ({}));
      valid = !!(d && d.success && d.purchase && !d.purchase.refunded && !d.purchase.chargebacked);
      productId = d && d.purchase && (d.purchase.product_id || d.purchase.product_permalink);
    } else {
      const r = await fetch("https://api.lemonsqueezy.com/v1/licenses/validate", {
        method: "POST", headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ license_key: license }),
      });
      const d = await r.json().catch(() => ({}));
      valid = !!(d && d.valid);
      variantId = d && d.meta && String(d.meta.variant_id || "");
      productId = d && d.meta && String(d.meta.product_id || "");
    }
    if (!valid) return { ok: false, message: "유효하지 않거나 만료된 키예요." };

    // 어떤 패키지인지 매칭 → 코인 수 결정
    let pkg = cfg.packages.find((p) => (p.variantId && String(p.variantId) === variantId) || (p.productId && String(p.productId) === productId));
    if (!pkg) pkg = cfg.packages[0]; // 매칭 실패 시 첫 패키지로 폴백
    const coins = (pkg && pkg.coins) || 1;

    const w2 = readMine();
    w2.redeemed = (w2.redeemed || []).concat([license]).slice(-100);
    writeMine(w2);
    addCoins(coins, { kind: "topup", license });
    return { ok: true, coins, added: coins };
  } catch (e) {
    return { ok: false, message: "검증 중 네트워크 오류가 났어요. 잠시 후 다시 시도해 주세요." };
  }
}

/* ---- 결제 후 자동 충전 (라이선스 키 입력 없이) ----
   결제사(레몬스퀴지/Stripe 등)의 '결제 성공 후 리다이렉트 URL'을
   #/store?pack=<코인수>&order=<주문id> 형태로 돌아오게 설정해 두면,
   앱이 돌아온 순간 코인을 자동 지급합니다. order(주문id)당 1회만 지급해
   새로고침으로 중복 충전되지 않게 합니다. (정적 사이트라 서버 검증은 없으며,
   완전한 위·변조 방지가 필요하면 SETUP.md의 웹훅 방식을 참고하세요.) */
export function creditPaidReturn(params) {
  const order = String(params.order || params.order_id || params.checkout_id || params.session_id || "").trim();
  const packCoins = parseInt(String(params.pack || params.coins || params.paid || ""), 10);
  if (!order || !packCoins || packCoins < 1) return { ok: false, reason: "no-params" };
  const cfg = getPaymentConfig();
  const list = cfg.packages || [];
  // 가격표에 있는 패키지의 코인 수만 인정(임의 금액 차단). 패키지 미설정이면 그대로 인정.
  if (list.length && !list.some((p) => Number(p.coins) === packCoins)) return { ok: false, reason: "unknown-pack" };
  const w = readMine();
  w.orders = w.orders || [];
  if (w.orders.includes(order)) return { ok: false, reason: "dup", coins: packCoins };
  w.orders = w.orders.concat([order]).slice(-200);
  writeMine(w);
  addCoins(packCoins, { kind: "topup-auto", order });
  return { ok: true, coins: packCoins, added: packCoins };
}

/** 명식 기반 해석의 고유 id (같은 사람·같은 종류는 한 번 결제로 계속 열람) */
export function chartItemId(kind, input) {
  const sig = `${input.birthDate || ""}_${input.timeUnknown ? "x" : (input.birthTime || "-")}_${input.calendarType || "solar"}${input.leapMonth ? "L" : ""}`;
  return `${kind}:${sig}`;
}


/* 코인 부족 안내 — 얼마나 모자란지 + 바로 충전소로 (사용성: 명확한 에러 표시) */
export function noCoinToast(need) {
  const have = getCoins();
  const lack = need ? Math.max(1, need - have) : 0;
  toast(need ? `코인이 ${lack}개 모자라요 · 보유 ${have}개 / 필요 ${need}개` : `코인이 부족해요 · 보유 ${have}개`,
    { label: "충전하러 가기", onClick: () => { location.hash = "#/store"; } });
}
