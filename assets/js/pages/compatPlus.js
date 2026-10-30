import { el, clear, toast, ymdPicker } from "../utils/dom.js";
import { pageHeader, backLink, noticeBox, loadDisclaimer } from "./shared.js";
import { getMyBirth, getPeople } from "../state.js";
import { relEmoji, savePersonOffer, chargeNewPeople, NEW_PERSON_NOTE } from "./people.js";
import { computeSaju } from "../saju/manse.js";
import { analyzeStrength } from "../saju/strength.js";
import { tenGod } from "../saju/fortune.js";
import { analyzeCompat } from "../saju/compat.js";
import { harmonyBetween } from "../saju/relationship.js";
import { dayNightStyle, cheatIndex } from "../saju/spouse.js";
import { isUnlocked, unlock, getCoins, costOf, noCoinToast, notePair } from "../wallet.js";
/* =========================================================
   궁합 특집 — 관계별 정통 궁합 · 오행 · 일주 동물 · 오늘 · 재물 · 낮져밤이/바람기 · 여행
   · 상대의 경제 관념 · 만약 연인이 된다면 · 선물 · 초콜릿 · 색
   작성: HAE · 모두 재미·참고용
   ========================================================= */
const SH = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"], SK = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const BH = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"], BK = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const STEM_E = ["wood", "wood", "fire", "fire", "earth", "earth", "metal", "metal", "water", "water"];
const BR_E = ["water", "earth", "wood", "wood", "earth", "fire", "fire", "earth", "metal", "metal", "earth", "water"];
const EK = { wood: "목(木)", fire: "화(火)", earth: "토(土)", metal: "금(金)", water: "수(水)" };
const EL5 = ["wood", "fire", "earth", "metal", "water"];
const GEN = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
const CTRL = { wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" };
const KILLER = { wood: "metal", fire: "water", earth: "wood", metal: "fire", water: "earth" };
const grp = (g) => (["비견", "겁재"].includes(g) ? "비겁" : ["식신", "상관"].includes(g) ? "식상" : ["편재", "정재"].includes(g) ? "재성" : ["편관", "정관"].includes(g) ? "관성" : "인성");
const gz = (s, b) => `${SH[s]}${BH[b]}(${SK[s]}${BK[b]})`;
const BR_MAIN = [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8];

const REL_KR = { lover: "연인", some: "썸", friend: "친구", work: "직장 동료", family: "가족" };
export const RELS = [["lover", "💗 연인"], ["some", "💌 썸"], ["friend", "🤝 친구"], ["work", "💼 동료"], ["family", "🏠 가족"]];
const REL_NM = { lover: "연인", some: "썸", friend: "친구", work: "동료", family: "가족" };

/* 십신 그룹 개수 (천간 + 지지 본기) */
function tally(profile) {
  const ds = profile.pillars.day.stemIdx; const t = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  ["year", "month", "day", "hour"].forEach((k) => { const p = profile.pillars[k]; if (!p) return; if (k !== "day") t[grp(tenGod(ds, p.stemIdx))]++; t[grp(tenGod(ds, BR_MAIN[p.branchIdx]))]++; });
  return t;
}

/* ---------- 일주 동물 ---------- */
const COLOR = ["푸른", "푸른", "붉은", "붉은", "노란", "노란", "하얀", "하얀", "검은", "검은"];
const ANIMAL = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];
const STEM_T = ["곧게 뻗는 리더형", "부드럽게 감싸는 적응형", "밝게 타오르는 열정형", "따뜻하게 비추는 섬세형", "묵직하게 품는 산 같은 형", "다정하게 기르는 밭 같은 형", "단단하게 결단하는 강철형", "예리하고 세련된 보석형", "크게 흐르는 바다형", "촉촉하게 스며드는 이슬형"];
const ANIMAL_T = ["눈치 빠르고 실속 있는", "우직하고 끈기 있는", "용감하고 자존심 센", "온화하고 감각적인", "스케일 크고 꿈이 많은", "영리하고 신중한", "자유롭고 활동적인", "순하고 배려 깊은", "재치 있고 다재다능한", "깔끔하고 완벽주의인", "의리 있고 정직한", "넉넉하고 낙천적인"];
export function iljuAnimal(profile) {
  const p = profile.pillars.day; return { name: `${COLOR[p.stemIdx]} ${ANIMAL[p.branchIdx]}`, gz: gz(p.stemIdx, p.branchIdx), trait: `${ANIMAL_T[p.branchIdx]} ${STEM_T[p.stemIdx]}` };
}

/* ---------- 선물·초콜릿·색 (용신 오행) ---------- */
const GIFT = {
  wood: ["화분·꽃다발 같은 살아 있는 선물", "좋아하는 작가의 책·다이어리", "원목 소품(펜·스탠드·트레이)", "초록·민트색 니트나 머플러", "식물 키우기 키트", "숲 산책·식물원 데이트"],
  fire: ["향초·무드등 같은 빛나는 소품", "공연·전시·콘서트 티켓", "레드·코랄 포인트 립·네일 제품", "사진 앨범·폴라로이드 카메라", "매운 맛집·화끈한 디저트 투어", "따뜻한 담요"],
  earth: ["손에 감기는 도자기 머그", "포근한 쿠션·홈웨어", "좋은 쌀·꿀·잼 같은 먹거리 선물", "베이지·브라운 가죽 지갑", "맛집 식사권·코스 요리", "향 좋은 차(茶) 세트"],
  metal: ["깔끔한 액세서리(목걸이·반지·시계)", "만년필·금속 소품", "화이트·실버 톤 테크 기기", "향수(시트러스·머스크)", "정리 수납용품·좋은 키링", "깔끔한 셔츠"],
  water: ["향수·바디미스트 같은 향 선물", "와인·좋은 음료·텀블러", "스파·수영·바다 여행권", "블루·네이비 톤 옷이나 소품", "음악 플레이리스트+이어폰", "어항·수경 식물"],
};
const AVOID = { wood: "날카로운 금속·철제 위주 선물", fire: "차가운 물·얼음 테마 선물", earth: "생화·나무 위주 선물만", metal: "불·열 테마(향초 위주) 선물만", water: "흙·도자기만 잔뜩" };
/* 초콜릿 — 오미(五味)와 한열(寒熱)로 분류
   오미: 신맛=목(木) · 쓴맛=화(火) · 단맛=토(土) · 매운·화한 맛=금(金) · 짠맛=수(水)
   한열: -1 서늘(민트 같은 辛涼(신량)) ~ +1 따뜻(시나몬 같은 辛熱(신열)) */
const CHOCO = [
  ["민트 초콜릿", "화하고 시원한 첫맛", { metal: 2, water: 0.5 }, -1],
  ["말차 초콜릿", "쌉싸름하고 싱그러운 맛", { fire: 1, wood: 1 }, -0.5],
  ["피스타치오 프랄린", "고소하고 부드러운 맛", { earth: 1.5, wood: 0.5 }, 0],
  ["얼그레이 가나슈", "은은한 베르가못 향", { metal: 1, fire: 0.5 }, 0],
  ["라즈베리 다크", "새콤 쌉쌀한 맛", { wood: 1.5, fire: 1 }, 0],
  ["칠리·시나몬 초콜릿", "톡 쏘고 따끈한 반전", { metal: 2, fire: 0.5 }, 1],
  ["체리 봉봉", "새콤달콤하게", { wood: 1, earth: 1 }, 0],
  ["오렌지 필 다크", "상큼 쌉쌀한 껍질 향", { wood: 1, fire: 1 }, 0.3],
  ["밀크 캐러멜 초콜릿", "부드럽고 포근한 단맛", { earth: 2.5 }, 0.5],
  ["헤이즐넛 잔두야", "고소한 안정감", { earth: 2 }, 0.3],
  ["꿀·아몬드 초콜릿", "든든한 단맛", { earth: 2 }, 0.5],
  ["화이트 초콜릿", "깔끔하고 순한 단맛", { earth: 2, metal: 0.5 }, 0],
  ["솔티드 카라멜", "단짠의 세련됨", { water: 1.5, earth: 1 }, 0.3],
  ["유자·레몬 초콜릿", "또렷한 새콤함", { wood: 2, metal: 0.5 }, -0.3],
  ["다크 70% 이상", "깊고 진한 쌉쌀함", { fire: 2.5 }, 0],
  ["바다소금 다크", "쌉쌀 짭짤한 여운", { fire: 1.5, water: 1.5 }, 0],
  ["블루베리 가나슈", "촉촉한 새콤함", { wood: 1, water: 0.5 }, -0.3],
  ["모카·커피 초콜릿", "쌉쌀한 어른의 맛", { fire: 2, water: 0.5 }, 0.3],
];
const TASTE = { wood: "신맛", fire: "쌉쌀한(쓴) 맛", earth: "단맛", metal: "화하거나 매콤한 맛", water: "짭짤한 맛" };
const STEM_KR = ["甲(갑)목", "乙(을)목", "丙(병)화", "丁(정)화", "戊(무)토", "己(기)토", "庚(경)금", "辛(신)금", "壬(임)수", "癸(계)수"];
/* 점수 = ①일간의 오미(타고난 입맛) ②용신의 오미(기운 보충) ③신강은 서늘한 맛, 신약은 따뜻한 맛 */
function josaEunNeun(w) { const c = String(w || "").trim().slice(-1).charCodeAt(0); if (c >= 0xac00 && c <= 0xd7a3) return (c - 0xac00) % 28 ? "은" : "는"; return "은(는)"; }
function chocoRank(P, S) {
  const like = P.dayMasterElem;
  const w = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  w[like] += 3; w[S.yongsin[0]] += 2; if (S.yongsin[1]) w[S.yongsin[1]] += 1;
  const cnt = P.elementCounts || {}; const top = EL5.slice().sort((x, y) => (cnt[y] || 0) - (cnt[x] || 0))[0];
  if (top !== like && (cnt[top] || 0) >= 3) w[top] -= 0.5; // 이미 넘치는 기운은 살짝 덜
  const strong = /강|왕/.test(S.strength || S.levelName || "");
  const tw = strong ? -1 : 1; // 신강 → 서늘한 맛(-)이 +점수, 신약 → 따뜻한 맛(+)이 +점수
  const why = (tags, t) => {
    const r = Object.keys(tags).filter((e) => w[e] > 0).sort((x, y) => tags[y] * w[y] - tags[x] * w[x]).slice(0, 2)
      .map((e) => e === like ? `타고난 입맛 ${EK[e]}` : `용신 ${EK[e]}`);
    if (t * tw >= 0.5) r.push(strong ? "서늘함이 잘 맞음" : "따뜻함이 잘 맞음");
    return r.slice(0, 2);
  };
  const list = CHOCO.map(([n, d, tags, t], i) => ({ n, d, why: why(tags, t), sc: Object.entries(tags).reduce((a, [e, v]) => a + v * w[e], 0) + t * tw - i * 0.001 }))
    .sort((x, y) => y.sc - x.sc);
  return { like, strong, likeT: `${STEM_KR[P.pillars.day.stemIdx]} 일간이라 ${TASTE[like]}`, list };
}
const COLORS = { wood: [["초록", "#7fb88f"], ["민트", "#a8e0c8"], ["올리브", "#9aa86a"]], fire: [["코랄", "#ff8f80"], ["레드", "#e0525a"], ["핑크", "#ff9fc0"]], earth: [["베이지", "#e8d2b0"], ["카멜", "#c99a5e"], ["머스터드", "#e0b84a"]], metal: [["화이트", "#f4f1ea"], ["실버", "#c8ccd4"], ["골드", "#e6c46a"]], water: [["네이비", "#2e3f6e"], ["블랙", "#2a2a33"], ["딥블루", "#3d6fb0"]] };

/* ---------- 리포트들 ---------- */
const REPORTS = [
  { id: "classic", em: "📜", name: "정통 궁합", sub: "관계에 맞춘 합·충·오행", cost: "cpclassic" },
  { id: "elem", em: "☯️", name: "오행 궁합", sub: "서로 채워 주는 기운", cost: "cpelem" },
  { id: "animal", em: "🐾", name: "일주 동물 궁합", sub: "성격 궁합", cost: "cpanimal" },
  { id: "today", em: "☀️", name: "오늘의 궁합", sub: "오늘 만나면? · 무료", cost: null },
  { id: "money", em: "💰", name: "재물 궁합", sub: "돈 쓰는 결 · 지갑 관리", cost: "cpmoney" },
  { id: "night", em: "🌙", name: "낮져밤이 · 바람기", sub: "반전 매력과 끼 지수", cost: "cpnight" },
  { id: "travel", em: "✈️", name: "여행 궁합", sub: "여행 스타일 · 추천 여행지", cost: "cptravel" },
  { id: "eco", em: "🧾", name: "상대의 경제 관념", sub: "그 사람의 돈 습관", cost: "cpeco" },
  { id: "ifover", em: "💞", name: "만약 연인이 된다면", sub: "연애하면 이런 모습", cost: "cpif" },
  { id: "gift", em: "🎁", name: "선물 추천", sub: "그 사람 사주 맞춤", cost: "cpgift" },
  { id: "choco", em: "🍫", name: "초콜릿 추천", sub: "취향 맞춤 맛", cost: "cpgift" },
  { id: "color", em: "🎨", name: "색 추천", sub: "선물·데이트 룩 컬러", cost: "cpgift" },
];

function sig(inp) { return `${inp.birthDate}_${inp.timeUnknown ? "x" : inp.birthTime || "-"}`; }
function card(title, kids) { return el("div", { class: "panel cp-card" }, [el("p", { class: "eyebrow", text: title }), ...kids.filter(Boolean)]); }
function list(arr) { return el("ul", { class: "cp-list" }, arr.filter(Boolean).map((t) => el("li", { text: t }))); }
function meter(label, v, max = 100) { return el("div", { class: "cp-meter" }, [el("span", { text: label }), el("span", { class: "cp-bar" }, [el("i", { style: `width:${Math.round((v / max) * 100)}%` })]), el("b", { text: String(v) })]); }

function build(id, ctx) {
  const { A, B, my, pi, rel, nm, me } = ctx;
  const SA = analyzeStrength(A), SB = analyzeStrength(B);
  const C = analyzeCompat(A, B, { a: me, b: nm }), H = harmonyBetween(A, B, { a: me, b: nm });
  const TA = tally(A), TB = tally(B);
  const yB = SB.yongsin[0];
  if (id === "classic") {
    let sc = C.score + (H.ganhap ? 4 : 0);
    const relKey = rel === "work" ? "month" : rel === "friend" || rel === "family" ? "year" : "day";
    const bRel = (() => { const a = A.pillars[relKey], b = B.pillars[relKey]; if (!a || !b) return "무관"; const d = Math.abs(a.branchIdx - b.branchIdx); return d === 6 ? "충" : [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]].some(([x, y]) => (x === a.branchIdx && y === b.branchIdx) || (y === a.branchIdx && x === b.branchIdx)) ? "육합" : d === 4 || d === 8 ? "삼합" : "무관"; })();
    sc += bRel === "육합" || bRel === "삼합" ? 6 : bRel === "충" ? -5 : 0;
    sc = Math.max(35, Math.min(97, Math.round(sc)));
    const seat = { day: "배우자 자리(일지)", month: "사회 자리(월지)", year: "띠(년지)" }[relKey];
    const RT = {
      lover: ["연인으로서", "감정 표현의 속도를 맞추는 게 오래 가는 비결이에요."], some: ["썸 단계에서", "확인받고 싶은 마음을 한 번은 말로 꺼내 보세요."],
      friend: ["친구로서", "자주보다 ‘필요할 때 꼭 있어 주는’ 관계가 잘 맞아요."], work: ["동료로서", "역할과 마감을 문서로 나누면 부딪힐 일이 확 줄어요."], family: ["가족으로서", "기대를 말로 꺼내야 서운함이 쌓이지 않아요."],
    }[rel];
    return [
      el("div", { class: "panel panel-gold cp-hero" }, [el("p", { class: "eyebrow", text: `${me} × ${nm} · ${REL_NM[rel]} 궁합` }), el("p", { class: "serif cp-big", text: `${sc}점` }), el("p", { class: "muted", text: C.title })]),
      card(`${RT[0]} 두 사람`, [el("p", { text: C.summary }), el("p", { class: "tiny", text: `${seat}: ‘${bRel}’ — ${bRel === "충" ? "부딪히며 자극을 주는 사이" : bRel === "무관" ? "특별한 끌림·충돌 없이 담백한 사이" : "자연스럽게 손발이 맞는 사이"}${H.ganhap ? " · 일간 천간합으로 묘하게 끌림" : ""}` })]),
      card("잘 맞는 점", [list(C.good)]), card("부딪히는 지점", [list(C.friction)]),
      el("div", { class: "block tag-action" }, [el("span", { class: "block-label", text: "이 관계의 팁" }), el("p", { text: `${RT[1]} ${Array.isArray(C.advice) ? C.advice[0] : C.advice || ""}` })]),
    ];
  }
  if (id === "elem") {
    const ca = A.elementCounts || {}, cb = B.elementCounts || {};
    const lackA = EL5.filter((e) => !(ca[e] > 0)), lackB = EL5.filter((e) => !(cb[e] > 0));
    const fillA = lackA.filter((e) => cb[e] > 0), fillB = lackB.filter((e) => ca[e] > 0);
    const yA = SA.yongsin[0], giveA = (cb[yA] || 0) >= 2, giveB = (ca[yB] || 0) >= 2;
    const mx = Math.max(1, ...EL5.map((e) => (ca[e] || 0) + (cb[e] || 0)));
    return [
      card("두 사람의 오행", [el("div", { class: "cp-elem" }, EL5.map((e) => el("div", { class: "cp-erow" }, [el("b", { class: `elem-${e}`, text: EK[e] }), el("span", { class: "cp-ebar" }, [el("i", { class: "a", style: `width:${((ca[e] || 0) / mx) * 100}%` }), el("i", { class: "b", style: `width:${((cb[e] || 0) / mx) * 100}%` })]), el("small", { text: `${ca[e] || 0} · ${cb[e] || 0}` })]))), el("p", { class: "tiny muted", text: `분홍 = ${me} · 보라 = ${nm}` })]),
      card("서로 채워 주는 기운", [
        el("p", { text: fillA.length ? `${nm}이(가) ${me}에게 없는 ${fillA.map((e) => EK[e]).join("·")}을(를) 채워 줘요.` : `${me}에게 없는 기운을 ${nm}이(가) 직접 채워 주진 않아요.` }),
        el("p", { text: fillB.length ? `${me}이(가) ${nm}에게 없는 ${fillB.map((e) => EK[e]).join("·")}을(를) 채워 줘요.` : `${nm}에게 없는 기운을 ${me}이(가) 직접 채워 주진 않아요.` }),
        el("p", { text: `${giveA ? `${nm}은(는) ${me}의 용신(${EK[yA]})을 넉넉히 가진 ‘귀한 사람’이에요. ` : ""}${giveB ? `${me}은(는) ${nm}의 용신(${EK[yB]})을 채워 주는 사람이에요.` : ""}` || "용신을 직접 채워 주진 않지만, 서로의 다름이 시야를 넓혀 줘요." }),
      ]),
    ];
  }
  if (id === "animal") {
    const a = iljuAnimal(A), b = iljuAnimal(B);
    const pairT = { 육합: "서로 등을 맡길 수 있는 짝꿍 동물이에요.", 삼합: "같은 방향을 보는 팀플레이 동물이에요.", 충: "정반대 성향이라 티격태격하지만 서로에게 없는 걸 배워요.", 형: "가까울수록 예민한 곳을 건드려요. 선을 지켜 주세요.", 해: "사소한 오해가 쌓이기 쉬워 확인 대화가 필요해요.", 자형: "닮은 고집끼리 부딪혀요. 각자 쉬는 시간이 약.", 동일: "같은 동물! 말 안 해도 통하지만 단점도 닮았어요.", 무관: "서로 다른 세계를 가진 동물 — 호기심으로 다가가면 좋아요." }[H.dayRel] || "";
    return [
      el("div", { class: "cp-two" }, [a, b].map((x, i) => el("div", { class: "panel cp-ani" }, [el("p", { class: "tiny muted", text: i ? nm : me }), el("p", { class: "serif cp-ani-n", text: x.name }), el("p", { class: "tiny", text: x.gz }), el("p", { class: "tiny", text: x.trait })]))),
      card("두 동물의 성격 궁합", [el("p", { text: `${a.name} × ${b.name} — ${pairT}` }), el("p", { class: "tiny muted", text: `일지(일주의 동물) 관계: ${H.dayRel}` })]),
    ];
  }
  if (id === "today") {
    const d = new Date();
    const T = computeSaju({ calendarType: "solar", birthDate: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, birthTime: "12:00", timeUnknown: true, gender: "male", timezone: "Asia/Seoul" });
    const ts = T.pillars.day.stemIdx, tb = T.pillars.day.branchIdx;
    const gA = grp(tenGod(A.pillars.day.stemIdx, ts)), gB = grp(tenGod(B.pillars.day.stemIdx, ts));
    const helpA = SA.yongsin.includes(STEM_E[ts]), helpB = SB.yongsin.includes(STEM_E[ts]);
    const chA = Math.abs(tb - A.pillars.day.branchIdx) === 6, chB = Math.abs(tb - B.pillars.day.branchIdx) === 6;
    let sc = 60 + (helpA ? 10 : 0) + (helpB ? 10 : 0) - (chA ? 8 : 0) - (chB ? 8 : 0) + (gA === gB ? 6 : 0);
    sc = Math.max(30, Math.min(98, sc));
    const ACT = { 비겁: "같이 운동·게임·활동적인 데이트", 식상: "맛집·전시·수다 데이트", 재성: "쇼핑·실속 있는 일 처리", 관성: "약속 지키기·진지한 대화", 인성: "카페에서 책·영화·조용한 시간" };
    return [
      el("div", { class: "panel panel-gold cp-hero" }, [el("p", { class: "eyebrow", text: `오늘 ${d.getMonth() + 1}월 ${d.getDate()}일 · 일진 ${gz(ts, tb)}` }), el("p", { class: "serif cp-big", text: `${sc}점` }), el("p", { class: "muted", text: sc >= 75 ? "오늘 만나면 잘 통하는 날!" : sc >= 55 ? "무난한 날 — 가볍게 만나기 좋아요." : "서로 예민한 날 — 짧게, 다정하게." })]),
      card("오늘의 두 사람", [el("p", { text: `${me}: 오늘은 ${gA} 기운 ${helpA ? "· 컨디션 좋음" : ""}${chA ? "· 조금 예민" : ""}` }), el("p", { text: `${nm}: 오늘은 ${gB} 기운 ${helpB ? "· 컨디션 좋음" : ""}${chB ? "· 조금 예민" : ""}` }), el("p", { text: `추천: ${ACT[gA]} / 상대는 ${ACT[gB]} 쪽이 좋아요.` })]),
    ];
  }
  if (id === "money" || id === "eco") {
    const style = (t, S) => t.재성 >= 3 ? ["버는 감각형", "돈 냄새를 잘 맡고 기회를 잘 잡아요. 대신 크게 벌이는 만큼 크게 쓰기도 해요."] : t.비겁 >= 3 ? ["나눠 쓰는 의리형", "사람에게 쓰는 돈이 많아요. 빌려주기·더치 안 하기를 조심."] : t.식상 >= 3 ? ["경험 소비형", "맛집·여행·취미 같은 경험에 아낌없이 써요. 즐거움이 곧 동기."] : t.인성 >= 3 ? ["모으는 안정형", "쓰기 전에 고민이 많고 저축을 좋아해요. 다만 투자엔 소극적."] : t.관성 >= 3 ? ["계획 관리형", "가계부·예산을 지키는 원칙주의자. 큰 결정은 느리지만 실수가 적어요."] : ["균형형", "벌고 쓰고 모으는 균형이 비교적 고른 편이에요."];
    const sa = style(TA, SA), sb = style(TB, SB);
    if (id === "eco") {
      const risk = Math.max(10, Math.min(95, 40 + TB.재성 * 8 + TB.식상 * 5 - TB.인성 * 6 - TB.관성 * 4));
      const save = Math.max(10, Math.min(95, 40 + TB.인성 * 9 + TB.관성 * 6 - TB.식상 * 5 - TB.비겁 * 4));
      const spend = Math.max(10, Math.min(95, 35 + TB.식상 * 8 + TB.비겁 * 7 + TB.재성 * 3 - TB.인성 * 5));
      return [
        el("div", { class: "panel panel-gold cp-hero" }, [el("p", { class: "eyebrow", text: `${nm}의 경제 관념` }), el("p", { class: "serif cp-big", style: "font-size:1.6rem;", text: sb[0] }), el("p", { class: "muted", text: sb[1] })]),
        card("돈 습관 지수", [meter("모으기", save), meter("쓰기", spend), meter("투자·모험", risk)]),
        card(`${nm}와(과) 돈 얘기하는 법`, [list([save >= 60 ? "‘얼마나 모였는지’ 숫자로 함께 확인하면 신뢰가 쌓여요." : "목표 금액을 같이 정해 주면 의외로 잘 지켜요.", spend >= 60 ? "경험에 쓰는 돈은 존중하고, 대신 월 한도를 함께 정해 보세요." : "작은 사치 하나를 허락해 주면 숨통이 트여요.", risk >= 60 ? "투자 얘기는 좋아하지만, 결정은 하루 묵혀서 하자고 제안하세요." : "안정적인 상품부터 같이 알아보면 좋아해요."])]),
      ];
    }
    const lead = TA.인성 + TA.관성 >= TB.인성 + TB.관성 ? me : nm;
    const sc = Math.max(40, Math.min(95, 62 + (sa[0] !== sb[0] ? 6 : 2) + ((A.elementCounts || {})[CTRL[A.dayMasterElem]] > 0 && (B.elementCounts || {})[CTRL[B.dayMasterElem]] > 0 ? 6 : 0) + (H.ganhap ? 4 : 0)));
    return [
      el("div", { class: "panel panel-gold cp-hero" }, [el("p", { class: "eyebrow", text: "재물 궁합" }), el("p", { class: "serif cp-big", text: `${sc}점` }), el("p", { class: "muted", text: sa[0] === sb[0] ? "돈 쓰는 결이 닮은 두 사람" : "서로 다른 돈 감각이 균형을 맞추는 두 사람" })]),
      el("div", { class: "cp-two" }, [[me, sa], [nm, sb]].map(([n, s]) => el("div", { class: "panel cp-ani" }, [el("p", { class: "tiny muted", text: n }), el("p", { class: "serif cp-ani-n", style: "font-size:1.15rem;", text: s[0] }), el("p", { class: "tiny", text: s[1] })]))),
      card("함께라면", [list([`지갑 관리는 ${lead} 쪽이 맡으면 안정적이에요.`, sa[0] === sb[0] ? "닮은 만큼 같은 실수(과소비·과절약)를 같이 하기 쉬워요. 한 명은 브레이크 역할을!" : "서로 다른 감각이라 부딪힐 수 있지만, 역할을 나누면 최고의 재테크 팀이에요.", "공동 목표(여행·이사·적금)를 하나 정해 두면 돈 다툼이 줄어요."])]),
    ];
  }
  if (id === "night") {
    const a = dayNightStyle(A), b = dayNightStyle(B), ca = cheatIndex(A, my.gender), cb = cheatIndex(B, pi.gender);
    const chem = a.key === b.key ? "같은 스타일이라 편하지만 설렘을 일부러 만들어야 해요." : (a.key === "낮져밤이" || b.key === "낮져밤이") ? "한 명의 반전 매력이 관계에 불꽃을 더해요." : "서로 다른 리듬이라 맞춰 가는 재미가 있어요.";
    return [
      el("div", { class: "cp-two" }, [[me, a, ca], [nm, b, cb]].map(([n, s, c]) => el("div", { class: "panel cp-ani" }, [el("p", { class: "tiny muted", text: n }), el("p", { class: "serif cp-ani-n", style: "font-size:1.15rem;", text: s.key }), el("p", { class: "tiny", text: s.title }), meter("바람기", c.score), el("p", { class: "tiny muted", text: `(${c.tier})` })]))),
      card("두 사람의 케미", [el("p", { text: chem }), el("p", { class: "tiny", text: `${nm}: ${b.line}` }), el("p", { class: "tiny", text: `${nm}의 끼: ${cb.line}` })]),
      el("p", { class: "tiny muted", text: "바람기 지수는 매력·자유로운 기질을 본 재미용 지표예요. 사람의 선택을 단정하지 않아요." }),
    ];
  }
  if (id === "travel") {
    const STY = { wood: ["자연·트레킹형", "숲길·수목원·트레킹"], fire: ["핫플·축제형", "축제·야경·핫플 투어"], earth: ["맛집·힐링형", "시골 맛집·온천·한옥 스테이"], metal: ["계획·도시형", "도시 미술관·쇼핑·깔끔한 호텔"], water: ["바다·즉흥형", "바닷가·호수·크루즈"] };
    const DIR = { wood: "동쪽", fire: "남쪽", earth: "가운데·산", metal: "서쪽", water: "북쪽·바다" };
    const dom = (p) => EL5.slice().sort((x, y) => ((p.elementCounts || {})[y] || 0) - ((p.elementCounts || {})[x] || 0))[0];
    const da = dom(A), db = dom(B);
    const yeok = (p) => { const G = { 2: 0, 6: 0, 10: 0, 8: 1, 0: 1, 4: 1, 5: 2, 9: 2, 1: 2, 11: 3, 3: 3, 7: 3 }; const Y = [8, 2, 11, 5]; const t = [p.pillars.year.branchIdx, p.pillars.day.branchIdx].map((b) => Y[G[b]]); return ["year", "month", "day", "hour"].some((k) => p.pillars[k] && t.includes(p.pillars[k].branchIdx)); };
    const ya = yeok(A), yb = yeok(B);
    const sc = Math.max(45, Math.min(96, 64 + (da === db ? 10 : GEN[da] === db || GEN[db] === da ? 7 : CTRL[da] === db || CTRL[db] === da ? -4 : 2) + (ya === yb ? 6 : 0)));
    const both = SA.yongsin[0] === yB ? SA.yongsin[0] : yB;
    return [
      el("div", { class: "panel panel-gold cp-hero" }, [el("p", { class: "eyebrow", text: "여행 궁합" }), el("p", { class: "serif cp-big", text: `${sc}점` }), el("p", { class: "muted", text: da === db ? "취향이 같아 일정 짜기 쉬운 두 사람" : "서로의 취향을 하루씩 번갈아 넣으면 완벽한 여행" })]),
      el("div", { class: "cp-two" }, [[me, da, ya], [nm, db, yb]].map(([n, e, y]) => el("div", { class: "panel cp-ani" }, [el("p", { class: "tiny muted", text: n }), el("p", { class: "serif cp-ani-n", style: "font-size:1.15rem;", text: STY[e][0] }), el("p", { class: "tiny", text: `좋아하는 곳: ${STY[e][1]}` }), el("p", { class: "tiny muted", text: y ? "역마 기운 — 즉흥 출발도 OK" : "익숙한 곳에서 편안함을 느끼는 편" })]))),
      card("추천 여행", [list([`둘에게 좋은 방향: ${DIR[both]} (${nm}의 용신 ${EK[yB]})`, `일정: ${STY[da][1].split("·")[0]} 하루 + ${STY[db][1].split("·")[0]} 하루`, ya !== yb ? "한 명은 꽉 찬 일정, 한 명은 여유 — 오전만 계획하고 오후는 자유로!" : "속도가 비슷해 다툼 없이 다닐 수 있어요."])]),
    ];
  }
  if (id === "ifover") {
    const b = dayNightStyle(B), Hs = H.dayRel;
    const exprB = TB.식상 + TB.비겁, holdB = TB.관성 + TB.인성;
    return [
      el("div", { class: "panel panel-gold cp-hero" }, [el("p", { class: "eyebrow", text: `만약 ${nm}와(과) 연인이 된다면…` }), el("p", { class: "serif cp-big", style: "font-size:1.5rem;", text: exprB > holdB ? "표현 많은 다정한 연애" : holdB > exprB ? "느리지만 깊은 연애" : "친구 같은 편안한 연애" }), el("p", { class: "muted", text: b.title })]),
      card("이런 장면이 그려져요", [list([
        `첫 데이트: ${exprB > holdB ? `${nm}이(가) 먼저 코스를 짜 오고 대화를 이끌어요.` : `${nm}은(는) 조용히 맞춰 주지만, 다음 약속을 먼저 묻는 건 ${me} 쪽이에요.`}`,
        `연락 스타일: ${TB.식상 >= 2 ? "수시로 일상 사진·이모티콘" : TB.관성 >= 2 ? "정해진 시간의 꾸준한 연락" : "필요할 때 짧고 확실하게"}`,
        `다툴 때: ${Hs === "충" ? "불꽃 튀게 싸우고 빨리 풀어요." : Hs === "형" || Hs === "해" ? "말없이 쌓아 두다 한 번에 터지기 쉬워요." : "크게 싸우기보다 서운함을 조용히 말해요."}`,
        `기념일: ${TB.재성 >= 2 ? "실속 있는 선물" : TB.식상 >= 2 ? "이벤트·편지" : "같이 보내는 시간 자체"}을(를) 중요하게 여겨요.`,
      ])]),
      el("div", { class: "block tag-action" }, [el("span", { class: "block-label", text: "오래 가려면" }), el("p", { text: Hs === "충" ? "부딪힘은 끌림의 다른 얼굴이에요. 싸운 날엔 그날 안에 풀기!" : "서로의 속도를 존중하면, 시간이 갈수록 더 단단해지는 사이예요." })]),
    ];
  }
  if (id === "gift") {
    return [
      card(`${nm}에게 좋은 선물 (용신 ${EK[yB]})`, [list(GIFT[yB])]),
      card("피하면 좋은 선물", [el("p", { text: AVOID[yB] })]),
      el("p", { class: "tiny muted", text: "용신(부족해서 채우면 좋은 기운)의 오행에 맞춘 추천이에요." }),
    ];
  }
  if (id === "choco") {
    const R = chocoRank(B, SB); const best = R.list[0], more = R.list.slice(1, 7), worst = R.list[R.list.length - 1];
    return [
      card(`${nm}의 인생 초콜릿`, [
        el("div", { class: "cp-choco-best" }, [el("span", { class: "cp-choco-em", text: "🍫" }), el("div", {}, [el("b", { text: best.n }), el("small", { text: best.d }), el("p", { class: "cp-choco-why", text: best.why.join(" · ") })])]),
      ]),
      card("이런 맛도 좋아할 거예요", [el("div", { class: "cp-choco" }, more.map((o) => el("div", { class: "cp-ch" }, [el("span", { text: "🍫" }), el("b", { text: o.n }), el("small", { text: o.d }), el("small", { class: "cp-ch-why", text: o.why[0] || "" })])))]),
      card("이렇게 골랐어요", [list([
        `타고난 입맛: ${nm}${josaEunNeun(nm)} ${R.likeT}에 본능적으로 끌려요. (오미(五味): 신맛 목(木) · 쓴맛 화(火) · 단맛 토(土) · 화한 맛 금(金) · 짠맛 수(水))`,
        `기운 보충: 용신 ${SB.yongsin.map((e) => EK[e]).join("·")} — 이 기운의 맛에 점수를 더했어요.`,
        R.strong ? "체질: 사주 힘이 센 편(신강)이라 민트처럼 서늘하게 식혀 주는 맛이 잘 맞아요." : "체질: 사주 힘이 여린 편(신약)이라 차고 화한 맛보단 따뜻하고 진한 맛이 잘 맞아요.",
        `굳이 안 골라도 되는 맛: ${worst.n}`,
        `포장은 ${COLORS[yB][0][0]} 계열로!`,
      ])]),
    ];
  }

  if (id === "color") {
    const yA = SA.yongsin[0], kB = KILLER[yB];
    return [
      card(`${nm}에게 행운의 색`, [el("div", { class: "cp-sw" }, COLORS[yB].map(([n, c]) => el("div", {}, [el("i", { style: `background:${c}` }), el("small", { text: n })])))]),
      card("둘이 맞춰 입기 좋은 데이트 룩", [el("div", { class: "cp-sw" }, [...COLORS[yA].slice(0, 2), ...COLORS[yB].slice(0, 2)].map(([n, c]) => el("div", {}, [el("i", { style: `background:${c}` }), el("small", { text: n })]))), el("p", { class: "tiny", text: `${me}은(는) ${COLORS[yA][0][0]}, ${nm}은(는) ${COLORS[yB][0][0]} 포인트로 맞추면 서로의 기운을 채워 줘요.` })]),
      card("피하면 좋은 색", [el("p", { text: `${nm}에게는 ${COLORS[kB].map((x) => x[0]).join("·")} 위주는 피해 주세요 (기운을 누르는 색).` })]),
    ];
  }
  return [];
}

export function renderCompatPlus({ navigate }) {
  loadDisclaimer();
  const my = getMyBirth();
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/people", "내 사람")]));
  root.append(pageHeader("궁합 특집", "관계별로 깊이 보는 우리 궁합", "연인·썸·친구·동료·가족 — 관계를 고르면 정통 궁합부터 재물·여행 궁합, 선물·초콜릿·색 추천까지 그 사람 사주로 맞춰 드려요."));
  const host = el("section", { class: "wrap section-gap" });
  root.append(host);
  if (!my) { host.append(noticeBox("info", "내 생년월일이 필요해요."), el("button", { class: "btn btn-primary", onclick: () => navigate("/saju") }, [el("span", { text: "내 정보 입력하고 시작" })])); return root; }
  const A = computeSaju(my), me = my.name || "나";
  let people = getPeople().filter((p) => p.input && p.input.birthDate);
  if (window.__cpRepName) { const rr = REPORTS.find((x) => x.name === window.__cpRepName); if (rr) window.__cpRep = rr.id; window.__cpRepName = null; }
  const st = { pick: window.__cpPick || (people[0] ? people[0].id : "manual"), rel: window.__cpRel || "lover", report: window.__cpRep || "classic", manual: null };
  const nameI = el("input", { class: "input", maxlength: "20", placeholder: "상대 이름" });
  const dateI = ymdPicker("");
  let mG = "female";
  const out = el("div", {});
  function partner() {
    if (st.pick === "manual") return st.manual;
    const p = people.find((x) => x.id === st.pick); return p ? { name: p.name, input: p.input, relation: p.relation } : null;
  }
  function paint() {
    clear(host);
    host.append(el("p", { class: "fg-group", style: "margin-top:0;", text: "누구와 볼까?" }));
    host.append(el("div", { class: "cp-people" }, [...people.map((p) => el("button", { type: "button", class: "chip" + (st.pick === p.id ? " is-selected" : ""), onclick: () => { st.pick = p.id; window.__cpPick = p.id; paint(); } }, [el("span", { text: `${relEmoji(p.relation)} ${p.name}` })])),
      el("button", { type: "button", class: "chip" + (st.pick === "manual" ? " is-selected" : ""), onclick: () => { st.pick = "manual"; window.__cpPick = "manual"; paint(); } }, [el("span", { text: "✏️ 직접 입력" })])]));
    if (st.pick === "manual") {
      const segG = el("div", { class: "rd-seg" }, [["female", "여성"], ["male", "남성"]].map(([v, lb]) => el("button", { type: "button", class: "rd-seg-btn" + (mG === v ? " on" : ""), onclick: (e) => { mG = v; segG.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b === e.currentTarget)); } }, [el("span", { text: lb })])));
      host.append(el("div", { class: "panel section-gap cp-manual" }, [nameI, dateI, segG, el("button", { class: "btn btn-primary btn-block", onclick: () => {
        if (!dateI.value) return toast("상대 생년월일을 골라 주세요");
        const nm = nameI.value.trim() || "그 사람";
        const input = { calendarType: "solar", birthDate: dateI.value, birthTime: "", timeUnknown: true, gender: mG, timezone: "Asia/Seoul", name: nm };
        const r = chargeNewPeople([{ input, name: nm, relation: REL_KR[st.rel] || "" }], { navigate });
        if (!r.ok) return;
        const saved = r.people[0];
        if (saved) { if (!people.some((x) => x.id === saved.id)) people.push(saved); st.pick = saved.id; window.__cpPick = saved.id; paint(); return; }
        st.manual = { name: nm, input }; paintReport();
      } }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: "이 사람으로 볼게요 · 코인 10개" })]), el("p", { class: "tiny muted", style: "margin-top:6px;", text: NEW_PERSON_NOTE })]));
    }
    host.append(el("p", { class: "fg-group", text: "어떤 관계?" }));
    host.append(el("div", { class: "cp-rels" }, RELS.map(([v, lb]) => el("button", { type: "button", class: "cp-rel" + (st.rel === v ? " on" : ""), onclick: () => { st.rel = v; window.__cpRel = v; paint(); } }, [el("span", { class: "cp-rel-em", text: lb.split(" ")[0] }), el("span", { text: lb.split(" ")[1] })]))));
    host.append(el("p", { class: "fg-group", text: "무엇을 볼까?" }));
    host.append(el("div", { class: "cp-grid" }, REPORTS.map((r) => el("button", { type: "button", class: "cp-tile" + (st.report === r.id ? " on" : ""), onclick: () => { st.report = r.id; window.__cpRep = r.id; paint(); setTimeout(() => out.scrollIntoView({ behavior: "smooth", block: "start" }), 50); } }, [
      el("span", { class: "cp-ic", text: r.em }), el("b", { text: r.name }), el("small", { text: r.sub }),
      el("span", { class: "cp-cost" + (r.cost ? "" : " free") }, r.cost ? [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: String(costOf(r.cost)) })] : [el("span", { text: "무료" })]),
    ]))));
    host.append(out);
    paintReport();
  }
  function paintReport() {
    clear(out);
    const P = partner();
    if (!P) { out.append(noticeBox("info", people.length ? "위에서 사람을 고르거나 직접 입력해 주세요." : "저장한 사람이 없어요. ‘직접 입력’으로 상대 생일을 넣어 주세요.")); return; }
    let B; try { B = computeSaju(P.input); } catch { out.append(noticeBox("warn", "상대 생년월일을 확인해 주세요.")); return; }
    const R = REPORTS.find((x) => x.id === st.report);
    const itemId = R.cost ? `cp:${R.cost}:${sig(my)}:${sig(P.input)}` : null;
    const pairTxt = `${me} × ${P.name} · ${R.name}`;
    notePair(pairTxt);
    out.append(el("div", { class: "cp-head" }, [el("span", { class: "cp-ic", text: R.em }), el("div", {}, [el("b", { text: `${me} × ${P.name} · ${R.name}` }), el("small", { class: "tiny muted", text: `${RELS.find((x) => x[0] === st.rel)[1]} 관계로 보는 중` })])]));
    if (st.pick === "manual") {
      const offer = savePersonOffer(P.input, { name: P.name, relation: REL_KR[st.rel], navigate, onSaved: (person) => {
        people = getPeople().filter((p) => p.input && p.input.birthDate); st.pick = person.id; window.__cpPick = person.id; paint();
      } });
      if (offer) { offer.style.marginBottom = "var(--sp-3)"; out.append(offer); };
    }
    if (itemId && !isUnlocked(itemId)) {
      const c = costOf(R.cost), coins = getCoins();
      out.append(el("div", { class: "panel premium-lock" }, [
        el("span", { class: "lock-badge" }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: `코인 ${c}개` })]),
        el("h3", { class: "serif", style: "margin-top:10px;", text: `${P.name}와(과)의 ${R.name}` }),
        el("p", { class: "muted", style: "font-size:var(--fs-sm);", text: `${R.sub} — 한 번 열면 이 사람과는 계속 무료예요.${R.cost === "cpgift" ? " (선물·초콜릿·색은 한 번에 같이 열려요)" : ""}` }),
        el("button", { class: "btn btn-primary btn-block", style: "margin-top: var(--sp-4);", onclick: () => { const x = unlock(itemId, c); if (x.ok) { toast(`열었어요 · 코인 ${c}`); paintReport(); } else noCoinToast(c); } }, [el("span", { text: coins >= c ? `코인 ${c}개로 열기 · 보유 ${coins}개` : "코인 받으러 가기" })]),
      ]));
      return;
    }
    const ctx = { A, B, my, pi: P.input, rel: st.rel, nm: P.name, me };
    notePair(pairTxt, { log: true });
    try { out.append(el("div", { class: "section-gap" }, build(R.id, ctx))); } catch (e) { out.append(noticeBox("warn", "이 사람의 정보로는 풀이를 만들지 못했어요.")); }
    out.append(noticeBox("info", "사주로 본 재미·참고용 궁합이에요. 관계는 두 사람의 마음과 노력이 만들어요."));
  }
  paint();
  return root;
}
