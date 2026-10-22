import { daeunColumns } from "./manseryeok.js";
import { analyzeStrength } from "./strength.js";
import { computeZiwei } from "./ziwei.js";
import { lunarToSolar, lunarMonthDays } from "./astro.js";
import { tenGod } from "./fortune.js";
/* =========================================================
   토정비결식 올해의 운세.
   음력 생월·생일 + 그해 태세로 상·중·하 괘를 세워(팔괘 상수법 방식) 144괘 중 하나를 얻고,
   상괘(팔괘)의 성질로 올해 흐름을 풀어 준다. 전통 토정비결 '원문'이 아니라 그 방식을 따른 참고 해석.
   ========================================================= */

const ELEM_COLOR = { wood: "초록", fire: "빨강·주황", earth: "노랑·베이지", metal: "흰색·골드", water: "검정·네이비" };
const RESOURCE = { wood: "water", fire: "wood", earth: "fire", metal: "earth", water: "metal" };
const ELEM_KR = { wood: "목(木)", fire: "화(火)", earth: "토(土)", metal: "금(金)", water: "수(水)" };

// 팔괘(상괘) — 이름·상징·올해 톤
const PAL = {
  1: { name: "건(乾)", sym: "하늘", verse: "용이 하늘에 오르니 만사가 형통하다", tone: "강",
    summary: "밀고 나가는 힘이 강한 해예요. 시작하고 넓히는 데 운이 따릅니다.",
    pros: ["새 일·확장·리더 역할에 유리해요.", "결단력이 성과로 이어져요."],
    cons: ["과욕·독단이 화를 부를 수 있어요.", "혼자 다 짊어지면 지칩니다."],
    advice: "크게 벌이되 사람을 얻으세요. 밀어붙이는 만큼 나눠야 오래갑니다." },
  2: { name: "태(兌)", sym: "못", verse: "연못에 물이 고이니 기쁜 소식이 온다", tone: "중강",
    summary: "기쁨·인연·재물의 기운이 도는 해예요. 사람으로 인해 일이 풀립니다.",
    pros: ["연애·인간관계·즐거운 만남이 늘어요.", "말과 매력이 기회를 만들어요."],
    cons: ["구설·과소비를 조심하세요.", "달콤함에 판단이 흐려질 수 있어요."],
    advice: "즐기되 입과 지갑을 단속하세요. 인연은 넓히고 씀씀이는 좁히기." },
  3: { name: "리(離)", sym: "불", verse: "불이 밝게 타오르니 이름이 드러난다", tone: "중강",
    summary: "명예·인정·표현의 해예요. 드러내고 인정받는 일에 운이 붙어요.",
    pros: ["시험·합격·발표·문서에 유리해요.", "이름을 알리기 좋은 시기예요."],
    cons: ["조급함·감정 기복이 발목을 잡아요.", "화려함에 실속을 놓칠 수 있어요."],
    advice: "빛날 때일수록 뿌리를 챙기세요. 감정은 한 박자 눌러서." },
  4: { name: "진(震)", sym: "우레", verse: "우레가 크게 울리니 변화가 시작된다", tone: "중",
    summary: "움직임·이동·새 출발의 해예요. 흔들림 속에서 기회가 생겨요.",
    pros: ["이직·이사·도전에 어울려요.", "묵은 것을 털고 새로 시작하기 좋아요."],
    cons: ["불안정·조급함으로 일을 그르치기 쉬워요.", "충동적인 결정은 금물."],
    advice: "변화는 받아들이되 방향을 정하고 움직이세요. 놀람은 곧 기회예요." },
  5: { name: "손(巽)", sym: "바람", verse: "바람이 두루 부니 사람과 재물이 따른다", tone: "중",
    summary: "인연·거래·유연함의 해예요. 부드럽게 스며들면 멀리 갑니다.",
    pros: ["협력·중개·영업·거래에 유리해요.", "관계로 기회가 열려요."],
    cons: ["우유부단하면 기회를 놓쳐요.", "귀가 얇아 휘둘리기 쉬워요."],
    advice: "부드럽되 심지는 세우세요. 결정은 스스로, 실행은 함께." },
  6: { name: "감(坎)", sym: "물", verse: "깊은 물을 건너니 지혜로 위기를 넘는다", tone: "약",
    summary: "인내와 지혜가 필요한 해예요. 무리하기보다 깊이를 더할 때.",
    pros: ["공부·연구·내실을 다지기 좋아요.", "위기를 넘기며 단단해져요."],
    cons: ["곤란·구설·건강을 조심하세요.", "큰 확장·투자는 특히 신중히."],
    advice: "물 흐르듯 낮추고 기다리세요. 지키는 것이 올해의 이김입니다." },
  7: { name: "간(艮)", sym: "산", verse: "산이 우뚝 멈추니 자리를 지켜 이롭다", tone: "중약",
    summary: "멈춤·정리·안정의 해예요. 벌이기보다 다지고 정돈할 때.",
    pros: ["부동산·정리·저축·마무리에 유리해요.", "묵묵히 지키면 신뢰가 쌓여요."],
    cons: ["정체감·고집이 답답함을 줄 수 있어요.", "새 시도는 힘이 덜 붙어요."],
    advice: "멈춤도 전략이에요. 내실을 다지며 다음 봄을 준비하세요." },
  8: { name: "곤(坤)", sym: "땅", verse: "너른 땅이 만물을 기르니 꾸준함이 복이 된다", tone: "중",
    summary: "포용·축적·꾸준함의 해예요. 서두르지 않으면 차곡차곡 쌓여요.",
    pros: ["성실히 모으고 기르는 데 유리해요.", "사람을 품어 신망을 얻어요."],
    cons: ["수동적이면 흐름을 놓쳐요.", "결단이 늦어 기회를 흘리기 쉬워요."],
    advice: "묵묵히 쌓되 결정할 땐 미루지 마세요. 꾸준함이 가장 큰 재능." },
};

export function tojeongYear(profile, year) {
  const lunar = profile.lunar || { month: 6, day: 15 };
  const age = year - (profile.solar ? profile.solar.Y : year) + 1; // 세는나이
  const yStem = ((year - 4) % 10 + 10) % 10;   // 0甲..9癸
  const yBranch = ((year - 4) % 12 + 12) % 12;  // 0子..11亥

  // 전통 작괘법(태세수·월건수·일진수)으로 정확히 — tojeongGwae 참고
  const G = tojeongGwae(lunar, profile.solar ? profile.solar.Y : year, year, { lunarToSolar, lunarMonthDays });
  const up = G.up, mid = G.mid, low = G.low;
  const gwaeNo = (up - 1) * 18 + (mid - 1) * 3 + low;          // 1~144

  const p = PAL[up];
  const score = 46 + ((7 - Math.abs(4 - up)) * 4) + (mid % 3) * 3 + (low - 2) * 2;
  const luckyElem = RESOURCE[profile.dayMasterElem];

  // 강조 달 — 괘수 기반 결정적 선택
  const months = [];
  for (let i = 0; i < 3; i++) months.push(((gwaeNo + i * 4) % 12) + 1);

  return {
    year, gwaeNo, gwae: `${up}${mid}${low}`, code: G.code, calc: G.calc, leapNote: G.leapNote, up, mid, low, palName: p.name, palSym: p.sym, verse: p.verse,
    score: Math.max(28, Math.min(92, score)),
    summary: p.summary, pros: p.pros, cons: p.cons, advice: p.advice,
    goodMonths: months.sort((a, b) => a - b),
    luckyColor: ELEM_COLOR[luckyElem], luckyElem: ELEM_KR[luckyElem],
  };
}

const S_EL = ["wood", "wood", "fire", "fire", "earth", "earth", "metal", "metal", "water", "water"];
const B_EL = ["water", "earth", "wood", "wood", "earth", "fire", "fire", "earth", "metal", "metal", "earth", "water"];
const EL_KR2 = { wood: "목", fire: "화", earth: "토", metal: "금", water: "수" };

/* =========================================================
   인생 흐름 — 초년·중년·장년·노년 + 10년 단위
   나이마다 그해 토정 괘를 세워 점수·주된 괘를 모아 본다. (세는나이 기준)
   ========================================================= */
export const LIFE_STAGES = [
  { id: "cho", name: "초년운", from: 1, to: 20, theme: "배움·가정·기초를 다지는 시기" },
  { id: "jung", name: "중년운", from: 21, to: 40, theme: "사회 진출·연애·결혼·자리 잡는 시기" },
  { id: "jang", name: "장년운", from: 41, to: 60, theme: "성취·책임·재물을 굳히는 시기" },
  { id: "no", name: "노년운", from: 61, to: 90, theme: "결실·건강·여유를 누리는 시기" },
];
const BAND = (s) => s >= 68 ? { k: "순풍", line: "순풍에 돛 단 듯 잘 풀리는 흐름이에요." }
  : s >= 60 ? { k: "상승", line: "무난하게 오르막을 타는 흐름이에요." }
  : s >= 52 ? { k: "굴곡", line: "오르내림이 있지만 그 속에서 단단해지는 흐름이에요." }
  : { k: "인내", line: "버티고 다지는 힘이 필요한 흐름이에요. 무리한 확장보다 내실이 답." };
const STAGE_TIP = {
  cho: { 순풍: "재능이 일찍 드러나요. 칭찬받는 분야를 깊게 파 두면 평생 무기가 돼요.", 상승: "기초를 성실히 쌓을수록 중년에 크게 돌아와요.", 굴곡: "환경의 흔들림이 있었을 수 있어요. 그 경험이 남다른 공감력이 됩니다.", 인내: "어린 시절 허전함이 있었다면, 스스로를 돌보는 법을 배운 시간이에요." },
  jung: { 순풍: "사회에서 이름을 알리기 좋아요. 기회가 오면 망설이지 말고 잡으세요.", 상승: "한 우물을 파면 30대 후반부터 탄탄해져요. 인연도 이때 무르익어요.", 굴곡: "이직·이사·관계 변화가 잦을 수 있어요. 방향만 잃지 않으면 모두 경험치.", 인내: "남보다 늦게 자리 잡아도 괜찮아요. 이 시기의 공부·저축이 장년을 받쳐 줘요." },
  jang: { 순풍: "그동안 쌓은 것이 성과·재물로 돌아오는 황금기예요. 나눌수록 더 커져요.", 상승: "안정 속 성장. 무리한 투자만 피하면 착실히 불어나요.", 굴곡: "책임이 커지는 만큼 부침도 있어요. 건강과 가족을 먼저 챙기세요.", 인내: "지키는 것이 버는 것. 보증·큰 투자는 특히 신중히." },
  no: { 순풍: "편안하고 존중받는 노년이에요. 취미·배움으로 삶이 풍성해져요.", 상승: "자녀·주변의 덕을 보며 여유가 생겨요.", 굴곡: "건강 관리가 곧 운 관리예요. 규칙적인 생활이 복을 지켜요.", 인내: "욕심을 내려놓을수록 마음이 편해져요. 작은 즐거움을 모으세요." },
};

export function tojeongLife(profile) {
  const birthY = profile.solar ? profile.solar.Y : new Date().getFullYear() - 30;
  const rows = [];
  for (let age = 1; age <= 90; age++) {
    const year = birthY + age - 1;
    const r = tojeongYear(profile, year);
    rows.push({ age, year, score: r.score, up: r.up });
  }
  const mode = (list) => { const c = {}; list.forEach((x) => { c[x.up] = (c[x.up] || 0) + 1; }); return Number(Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]); };
  const avg = (list) => Math.round(list.reduce((a, x) => a + x.score, 0) / list.length);
  const palOf = (up) => ({ name: PAL[up].name, sym: PAL[up].sym, summary: PAL[up].summary.replace("해예요", "시기예요") });
  const nowAge = new Date().getFullYear() - birthY + 1;
  const daeunList = (profile.daeun && profile.daeun.list) || [];

  // 대운(10년 운)이 나에게 도움 되는 오행(용신·조후)인지 → 점수 보정
  let helpful = [];
  try { helpful = analyzeStrength(profile).helpful || []; } catch { /* ignore */ }
  const P = profile.pillars;
  const favOf = (sIdx, bIdx) => {
    const se = S_EL[sIdx], be = B_EL[bIdx];
    let f = 54;
    if (helpful.includes(se)) f += 13;
    if (helpful.includes(be)) f += 11;
    if (!helpful.includes(se) && !helpful.includes(be)) f -= 8;
    return { f, se, be };
  };
  const luckAt = (age) => {
    const d = [...daeunList].reverse().find((x) => x.age != null && age >= x.age);
    if (d) return { ...favOf(d.stemIdx, d.branchIdx), hanja: d.hanja };
    return { ...favOf(P.month.stemIdx, P.month.branchIdx), hanja: null }; // 대운 시작 전은 월주 기운
  };
  rows.forEach((x) => { const L = luckAt(x.age); x.mix = Math.max(32, Math.min(94, Math.round(x.score * 0.45 + L.f * 0.55))); x.luck = L; });
  const avgMix = (list) => Math.round(list.reduce((a, x) => a + x.mix, 0) / list.length);

  const decades = [];
  for (let d = 0; d < 9; d++) {
    const from = d * 10 + 1, to = d * 10 + 10;
    const part = rows.filter((x) => x.age >= from && x.age <= to);
    const a = avgMix(part), b = BAND(a), up = mode(part);
    const helpEl = [...new Set(part.flatMap((x) => [x.luck.se, x.luck.be]).filter((e) => helpful.includes(e)))];
    const best = [...part].sort((x, y) => y.mix - x.mix)[0];
    const worst = [...part].sort((x, y) => x.mix - y.mix)[0];
    const dy = daeunList.filter((x) => x.age != null && x.age <= to && x.age + 9 >= from).map((x) => x.hanja);
    decades.push({ from, to, years: `${birthY + from - 1}–${birthY + to - 1}`, score: a, band: b.k, line: b.line,
      pal: palOf(up), best, worst, daeun: dy, isNow: nowAge >= from && nowAge <= to,
      luckNote: helpEl.length ? `대운에 나를 돕는 ${helpEl.map((e) => EL_KR2[e]).join("·")} 기운이 들어와 힘이 붙어요.` : "대운이 나와 결이 달라 스스로 다지는 힘이 필요해요.",
      trend: d === 0 ? 0 : a - decades[d - 1].score });
  }
  const stages = LIFE_STAGES.map((st) => {
    const part = rows.filter((x) => x.age >= st.from && x.age <= st.to);
    const a = avgMix(part), b = BAND(a), up = mode(part);
    return { ...st, score: a, band: b.k, line: b.line, tip: STAGE_TIP[st.id][b.k], pal: palOf(up),
      years: `${birthY + st.from - 1}–${birthY + st.to - 1}`, isNow: nowAge >= st.from && nowAge <= st.to };
  });

  return { birthY, nowAge, stages, decades };
}

/* =========================================================
   수명 운 (관리자 전용) — 전통 명리·토정 방식의 '명(命)이 다하기 쉬운 시기'
   대운이 나를 돕는 오행(용신·조후)인지, 일간의 12운성(사·묘·절), 일지·월지 충으로 10년마다 점수를 매기고
   노년(68세 이후) 중 가장 약한 대운을 '사주상 수명의 고비', 토정 노년 최저 해를 '토정상 고비'로 본다.
   원인은 사주에서 가장 약한 오행의 장부 + 그 대운의 충·흉살 여부. 어디까지나 옛 방식의 참고.
   ========================================================= */
const ORGAN = {
  wood: { kr: "목(木)", part: "간·담·신경계·근육", tip: "과음·과로를 줄이고 스트레칭·숙면으로 간을 쉬게 하세요." },
  fire: { kr: "화(火)", part: "심장·혈관·혈압", tip: "짠 음식·흡연을 피하고 혈압·심장 검진을 꾸준히 받으세요." },
  earth: { kr: "토(土)", part: "위장·비장·혈당", tip: "규칙적인 식사, 당·과식 조절, 위내시경을 챙기세요." },
  metal: { kr: "금(金)", part: "폐·기관지·대장", tip: "금연, 미세먼지 피하기, 대장 내시경을 챙기세요." },
  water: { kr: "수(水)", part: "신장·방광·생식기·뼈", tip: "물 충분히, 짠 음식 줄이기, 하체 근력·뼈 건강을 챙기세요." },
};
/* 자미두수로 본 수명: 명궁 주성의 수명 기운 + 질액궁 + 대한(10년) 중 노년 최약 구간 */
const ZW_LONG = { 천부: 8, 천량: 8, 천동: 6, 자미: 6, 태음: 3, 천상: 4, 녹존: 5, 좌보: 2, 우필: 2, 문창: 1, 문곡: 1 };
const ZW_HARD = { 칠살: 7, 파군: 7, 경양: 6, 타라: 5, 염정: 4, 거문: 3, 탐랑: 2, 무곡: 2 };
const ZW_ORGAN = {
  자미: "비위·소화기", 천기: "간·신경·팔다리", 태양: "눈·머리·혈압", 무곡: "폐·호흡기·뼈", 천동: "신장·방광·비만", 염정: "혈액·심혈관·부인과",
  천부: "위장·피부", 태음: "신장·호르몬·눈", 탐랑: "간·신장·생식기", 거문: "입·위장·소화", 천상: "피부·방광·당뇨", 천량: "위장·만성 질환",
  칠살: "폐·대장·사고성 외상", 파군: "신장·허리·출혈·수술",
};
function zwScore(stars) {
  let s = 0; const tags = [];
  for (const st of stars) {
    if (ZW_LONG[st.name]) s += ZW_LONG[st.name];
    if (ZW_HARD[st.name]) { s -= ZW_HARD[st.name]; if (ZW_HARD[st.name] >= 5) tags.push(st.name); }
    if (st.sihua && st.sihua.includes("기")) { s -= 8; tags.push(`${st.name} 화기(化忌)`); }
    if (st.sihua && st.sihua.includes("록")) s += 4;
  }
  return { s, tags };
}
export function ziweiLifespan(input, gender) {
  const z = computeZiwei(input);
  const P = z.palaces, n = 12, fixI = (i) => ((i % n) + n) % n;
  const ming = P[z.mingIndex];
  const jil = P.find((p) => p.name === "질액궁");
  const mingSc = zwScore(ming.stars.concat(P[fixI(z.mingIndex + 6)].stars.map((s) => ({ name: s.name }))));
  // 대한: 양남음녀 순행(+1), 음남양녀 역행(-1). 시작 나이 = 오행국 수
  const yangYear = ["갑", "병", "무", "경", "임"].includes(z.yearGZ[0]);
  const fwd = (yangYear && gender === "male") || (!yangYear && gender !== "male");
  const daehan = [];
  for (let k = 0; k < 10; k++) {
    const pal = P[fixI(z.mingIndex + (fwd ? k : -k))];
    const from = z.bureau + k * 10;
    const own = zwScore(pal.stars);
    const isJil = pal.name === "질액궁";
    daehan.push({ from, to: from + 9, palace: pal.name, branch: `${pal.branchH}(${pal.branch})`, score: own.s - (isJil ? 4 : 0), tags: own.tags.concat(isJil ? ["질액궁에 드는 대한"] : []) });
  }
  const late = daehan.filter((d) => d.from >= 62);
  const worst = (late.length ? late : daehan).slice().sort((a, b) => a.score - b.score)[0];
  const main = jil.stars.filter((s) => ZW_ORGAN[s.name]).map((s) => s.name);
  const opp = P[fixI(P.indexOf(jil) + 6)].stars.filter((s) => ZW_ORGAN[s.name]).map((s) => s.name);
  const organStars = main.length ? main : opp;
  return {
    mingStars: z.mingStars.length ? z.mingStars : z.oppStars,
    longevity: mingSc.s >= 6 ? "장수성이 명궁을 받쳐 주는 편" : mingSc.s <= -5 ? "살성이 강해 고비를 겪으며 버티는 편" : "무난한 편",
    worst, jilStars: organStars, jilPart: organStars.map((s) => ZW_ORGAN[s]).join(" · ") || "뚜렷한 주성이 없어 전반적인 체력 관리",
    timeUnknown: z.timeUnknown,
  };
}

export function lifespanReading(profile, input) {
  let helpful = [];
  try { helpful = analyzeStrength(profile).helpful || []; } catch { /* ignore */ }
  const P = profile.pillars, dayB = P.day.branchIdx, monB = P.month.branchIdx;
  const list = (profile.daeun && profile.daeun.list) || [];
  const cols = daeunColumns(profile);
  const scored = cols.map((c, i) => {
    const b = list[i].branchIdx;
    let s = 60; const why = [];
    if (helpful.includes(c.stemElem)) s += 12; else { s -= 8; }
    if (helpful.includes(c.branchElem)) s += 10; else { s -= 8; }
    if (["사", "묘", "절"].includes(c.stage)) { s -= 9; why.push(`일간이 ‘${c.stage}’에 드는 운`); }
    else if (["병", "쇠"].includes(c.stage)) { s -= 4; why.push(`기운이 기우는 ‘${c.stage}’ 운`); }
    else if (["장생", "건록", "제왕", "관대"].includes(c.stage)) s += 5;
    if (Math.abs(b - dayB) === 6) { s -= 9; why.push("일지(몸·배우자 자리)를 치는 충"); }
    if (Math.abs(b - monB) === 6) { s -= 5; why.push("월지(뿌리)를 치는 충"); }
    if (["겁살", "재살", "망신살"].includes(c.sinsal)) { s -= 3; why.push(`${c.sinsal}`); }
    return { ...c, score: s, why, clash: why.some((w) => w.includes("충")) || ["겁살", "재살"].includes(c.sinsal) };
  });
  const late = scored.filter((c) => c.age >= 68);
  const end = late.length ? [...late].sort((a, b) => a.score - b.score)[0] : scored[scored.length - 1];
  const early = scored.filter((c) => c.age < 60);
  const crisis = early.length ? [...early].sort((a, b) => a.score - b.score)[0] : null;
  // 원인: 가장 약한 오행 (동률이면 그 대운이 누르는 오행)
  const EC = profile.elementCounts || {};
  const CTRL = { wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" };
  const elems = ["wood", "fire", "earth", "metal", "water"];
  const minC = Math.min(...elems.map((e) => EC[e] || 0));
  const weak = elems.filter((e) => (EC[e] || 0) === minC);
  const hit = weak.find((e) => CTRL[end.stemElem] === e || CTRL[end.branchElem] === e) || weak[0];
  // 토정: 61세 이후 10년 단위 중 가장 낮은 해
  let toj = null;
  try {
    const L = tojeongLife(profile);
    const cands = L.decades.filter((d) => d.from >= 71).map((d) => d.worst);
    toj = cands.sort((a, b) => a.mix - b.mix)[0];
  } catch { /* ignore */ }
  const birthY = profile.solar ? profile.solar.Y : 0;
  return {
    end: { from: end.age, to: end.age + 9, years: `${end.startYear}~${end.startYear + 9}`, hanja: `${end.stemH}${end.branchH}`, kr: `${end.stemKr}${end.branchKr}`, why: end.why, score: end.score },
    crisis: crisis && crisis.score < 55 ? { from: crisis.age, to: crisis.age + 9, years: `${crisis.startYear}~${crisis.startYear + 9}`, hanja: `${crisis.stemH}${crisis.branchH}`, kr: `${crisis.stemKr}${crisis.branchKr}`, why: crisis.why } : null,
    cause: { ...ORGAN[hit], accident: end.clash },
    tojeong: toj ? { year: toj.year, age: toj.age } : null,
    longevity: end.score >= 58 ? "장수형" : end.score >= 48 ? "보통" : "고비가 뚜렷한 편",
    ziwei: input ? (() => { try { return ziweiLifespan(input, input.gender); } catch { return null; } })() : null,
    birthY,
  };
}

/* =========================================================
   전통 작괘법 (토정비결 조견표와 같은 수)
   상괘 = (세는나이 + 태세수) % 8 · 중괘 = (그해 생월 날수 + 월건수) % 6 · 하괘 = (음력 생일 + 일진수) % 3  (나머지 0 → 8·6·3)
   태세수·월건수·일진수 = 천간수 + 지지수 (지지수는 쓰임마다 다름)
   검증: 조견표 60갑자 전부 일치 · 예) 1976 음 8/26생의 2005년 = 212괘
   ========================================================= */
export const TJ_STEM = [9, 8, 7, 6, 5, 9, 8, 7, 6, 5];               // 甲己9 乙庚8 丙辛7 丁壬6 戊癸5
export const TJ_BR_YEAR = [11, 13, 10, 10, 13, 9, 9, 13, 12, 12, 13, 11]; // 태세용 子~亥
export const TJ_BR_MONTH = [9, 8, 7, 6, 5, 4, 9, 8, 7, 6, 5, 4];          // 월건용(선천수)
export const TJ_BR_DAY = [9, 11, 8, 8, 11, 7, 7, 11, 10, 10, 11, 9];      // 일진용
const SH2 = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"], SK2 = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const BH2 = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"], BK2 = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
export const gzName = (s, b) => `${SH2[s]}${BH2[b]}(${SK2[s]}${BK2[b]})`;
const jdnOf = (Y, M, D) => { const a = Math.floor((14 - M) / 12), y = Y + 4800 - a, m = M + 12 * a - 3; return D + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045; };
export const dayGZ = (Y, M, D) => { const i = ((jdnOf(Y, M, D) + 49) % 60 + 60) % 60; return { s: i % 10, b: i % 12 }; };
export const yearGZ2 = (Y) => ({ s: ((Y - 4) % 10 + 10) % 10, b: ((Y - 4) % 12 + 12) % 12 });
export const monthGZ2 = (Y, m) => { const ys = yearGZ2(Y).s; return { s: (((ys % 5) * 2 + 2) + (m - 1)) % 10, b: (m + 1) % 12 }; };
const rem = (n, d) => (n % d) || d;

/** 정확한 토정 괘 — astro: { lunarToSolar, lunarMonthDays } 주입 */
export function tojeongGwae(birthLunar, birthSolarY, year, astro) {
  const age = year - birthSolarY + 1;                                   // 세는나이
  const ty = yearGZ2(year), tm = monthGZ2(year, birthLunar.month);
  const taese = TJ_STEM[ty.s] + TJ_BR_YEAR[ty.b];
  const wolgeon = TJ_STEM[tm.s] + TJ_BR_MONTH[tm.b];
  const days = astro.lunarMonthDays(year, birthLunar.month, false) || 30; // 그해 생월이 큰달(30)인지 작은달(29)인지
  const d = Math.min(birthLunar.day, days);                                // 그해 생월이 작은달이면 그믐(29일)로
  const sol = astro.lunarToSolar(year, birthLunar.month, false, d);
  const dg = sol ? dayGZ(sol.Y, sol.M, sol.D) : { s: 0, b: 0 };
  const iljin = TJ_STEM[dg.s] + TJ_BR_DAY[dg.b];
  const up = rem(age + taese, 8), mid = rem(days + wolgeon, 6), low = rem(birthLunar.day + iljin, 3);
  return {
    year, age, up, mid, low, code: `${up}${mid}${low}`,
    calc: {
      taese: { gz: gzName(ty.s, ty.b), n: taese }, wolgeon: { gz: gzName(tm.s, tm.b), n: wolgeon, days }, iljin: { gz: gzName(dg.s, dg.b), n: iljin, solar: sol, day: d },
      lines: [`상괘 = (나이 ${age} + 태세수 ${taese}) ÷ 8의 나머지 = ${up}`, `중괘 = (생월 날수 ${days} + 월건수 ${wolgeon}) ÷ 6의 나머지 = ${mid}`, `하괘 = (음력 생일 ${birthLunar.day} + 일진수 ${iljin}) ÷ 3의 나머지 = ${low}`],
    },
    leapNote: birthLunar.isLeap ? "윤달생은 전통대로 같은 달(평달)로 계산했어요." : "",
  };
}

/* =========================================================
   월별 · 일별 — 그해 괘(상괘 팔괘의 오행)와 그 달 월건·그날 일진의 관계 + 내 일간 십신으로 푼 해묘 해석
   (토정비결 원문 문장이 아니라, 정확히 세운 괘를 바탕으로 한 해석)
   ========================================================= */
const PAL_EL = { 1: "metal", 2: "metal", 3: "fire", 4: "wood", 5: "wood", 6: "water", 7: "earth", 8: "earth" };
const GEN3 = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
const CTRL3 = { wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" };
const S_EL3 = ["wood", "wood", "fire", "fire", "earth", "earth", "metal", "metal", "water", "water"];
const B_EL3 = ["water", "earth", "wood", "wood", "earth", "fire", "fire", "earth", "metal", "metal", "earth", "water"];
const GRP3 = (g) => (["비견", "겁재"].includes(g) ? "비겁" : ["식신", "상관"].includes(g) ? "식상" : ["편재", "정재"].includes(g) ? "재성" : ["편관", "정관"].includes(g) ? "관성" : "인성");
const MONTH_GOD = {
  비겁: ["사람·경쟁", "친구·동료와 함께할 일이 많아요. 의리는 지키되 돈거래와 보증은 피하세요."],
  식상: ["표현·연애", "말과 재능이 빛나는 달이에요. 연애·발표·창작·영업에 힘이 붙어요."],
  재성: ["돈·실속", "돈이 돌고 거래가 생기는 달이에요. 들어온 만큼 지키는 게 관건."],
  관성: ["일·명예", "책임이 커지고 평가받는 달이에요. 원칙대로 하면 인정이 따라와요."],
  인성: ["문서·도움", "공부·계약·윗사람의 도움이 따르는 달이에요. 서류는 꼼꼼히."],
};
const TONE = {
  순풍: [8, "괘의 기운을 달이 북돋아 주니 일이 순하게 풀려요."],
  평온: [3, "괘와 달의 기운이 같아 큰 파도 없이 흘러가요."],
  베풂: [0, "내가 기운을 내어 주는 달 — 애쓴 만큼 사람을 얻어요."],
  노력: [-3, "내가 이끌어야 풀리는 달 — 한 번 더 확인하면 성과가 나요."],
  고비: [-9, "괘의 기운을 달이 누르니 서두르면 꼬여요. 지키는 쪽이 이겨요."],
};
function toneOf(ge, me) { return GEN3[me] === ge ? "순풍" : me === ge ? "평온" : GEN3[ge] === me ? "베풂" : CTRL3[ge] === me ? "노력" : "고비"; }
export function tojeongMonths(profile, year) {
  const Y = tojeongYear(profile, year), ge = PAL_EL[Y.up];
  const ds = profile.pillars.day.stemIdx;
  let help = [], gi = null;
  try { const S = analyzeStrength(profile); help = S.yongsin; gi = Object.keys(CTRL3).find((k) => CTRL3[k] === S.yongsin[0]); } catch {}
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const g = monthGZ2(year, m), me = B_EL3[g.b];
    const tone = toneOf(ge, me), god = tenGod(ds, g.s), grp = GRP3(god);
    let sc = Y.score + TONE[tone][0] + (help.includes(S_EL3[g.s]) ? 5 : 0) + (help.includes(me) ? 3 : 0) - (S_EL3[g.s] === gi ? 5 : 0);
    sc = Math.max(25, Math.min(95, Math.round(sc)));
    const s1 = lunarToSolar(year, m, false, 1), len = lunarMonthDays(year, m, false) || 30;
    months.push({ m, gz: gzName(g.s, g.b), god, grp, tone, sc, area: MONTH_GOD[grp][0], text: `${TONE[tone][1]} ${MONTH_GOD[grp][1]}`, badge: sc >= 70 ? "길" : sc >= 55 ? "평" : "주의", solarStart: s1, len });
  }
  return { year: Y, months };
}
export function tojeongDays(profile, year, m) {
  const M = tojeongMonths(profile, year), mo = M.months[m - 1];
  const ds = profile.pillars.day.stemIdx, db = profile.pillars.day.branchIdx;
  let help = [], gi = null;
  try { const S = analyzeStrength(profile); help = S.yongsin; gi = Object.keys(CTRL3).find((k) => CTRL3[k] === S.yongsin[0]); } catch {}
  const LINE = { 비겁: "사람을 만나고 함께 움직이기 좋아요. 돈 얘기는 다음으로.", 식상: "표현하고 보여 주기 좋은 날. 고백·발표·SNS에 힘이 실려요.", 재성: "실속 챙기기 좋은 날. 쇼핑·거래는 계획한 만큼만.", 관성: "맡은 일을 깔끔하게 끝내기 좋은 날. 윗사람 눈에 들어요.", 인성: "배우고 정리하기 좋은 날. 계약·서류·공부에 도움이 와요." };
  const days = [];
  for (let d = 1; d <= mo.len; d++) {
    const sol = lunarToSolar(year, m, false, d); if (!sol) continue;
    const g = dayGZ(sol.Y, sol.M, sol.D), god = tenGod(ds, g.s), grp = GRP3(god);
    const chung = Math.abs(g.b - db) === 6;
    let sc = mo.sc + (help.includes(S_EL3[g.s]) ? 8 : 0) + (help.includes(B_EL3[g.b]) ? 4 : 0) - (S_EL3[g.s] === gi ? 8 : 0) - (chung ? 7 : 0);
    sc = Math.max(20, Math.min(98, Math.round(sc)));
    days.push({ d, sol, gz: gzName(g.s, g.b), god, grp, chung, sc, text: LINE[grp] + (chung ? " 일지와 충(沖)이 드는 날이라 이동·약속 변경에 주의하세요." : "") });
  }
  return { month: mo, days };
}

/* =========================================================
   분야별 토정비결 (HAE) — 그해 괘(상괘 팔괘의 성질) + 열두 달 월건 십성으로
   재물·애정·직업·학업·건강·가정·대인 7분야 점수와 좋은 달
   ========================================================= */
// 상괘(1 건 · 2 태 · 3 리 · 4 진 · 5 손 · 6 감 · 7 간 · 8 곤)마다 분야별 기울기 (-2 ~ +2)
const TRI_TOPIC = {
  1: { money: 0, love: -1, work: 2, study: 1, health: 0, home: -1, people: 1 },
  2: { money: 1, love: 2, work: 0, study: 0, health: -1, home: 1, people: 2 },
  3: { money: -1, love: 1, work: 1, study: 2, health: -1, home: 0, people: 1 },
  4: { money: -1, love: 0, work: 2, study: 0, health: -1, home: -1, people: 1 },
  5: { money: 2, love: 1, work: 1, study: 1, health: 0, home: 0, people: 2 },
  6: { money: -1, love: -1, work: 0, study: 2, health: -2, home: 0, people: -1 },
  7: { money: 1, love: 0, work: -1, study: 1, health: 1, home: 2, people: -1 },
  8: { money: 1, love: 2, work: 0, study: 0, health: 1, home: 2, people: 1 },
};
const TOPIC_DEF = [
  { id: "money", name: "재물운", em: "💰", grp: ["재성"], good: "들어오는 돈의 길이 열리는 해예요. 부수입·저축 계획을 세우면 잘 쌓여요.", mid: "들고 나는 돈이 비슷해요. 고정 지출을 정리하면 여유가 생겨요.", low: "새는 돈을 막는 게 먼저인 해예요. 보증·큰 투자는 미뤄 두세요." },
  { id: "love", name: "애정운", em: "💗", grp: null, good: "인연이 쉽게 닿는 해예요. 소개·모임에 나가면 좋은 사람이 보여요.", mid: "잔잔하게 이어지는 해예요. 지금 관계를 다정하게 다듬어 보세요.", low: "오해가 쌓이기 쉬운 해예요. 말보다 행동으로 마음을 보여 주세요." },
  { id: "work", name: "직업운", em: "💼", grp: ["관성"], good: "인정과 자리가 따라오는 해예요. 승진·이직·합격을 노려 볼 만해요.", mid: "맡은 일을 꾸준히 해내면 평가가 쌓이는 해예요.", low: "윗사람·규칙과 부딪히기 쉬워요. 무리한 이직보다 실력 다지기." },
  { id: "study", name: "학업·문서운", em: "📚", grp: ["인성"], good: "머리가 맑고 문서운이 좋은 해예요. 시험·자격증·계약에 힘이 실려요.", mid: "꾸준히 하면 결과가 나오는 해예요. 계획표가 답이에요.", low: "집중이 흩어지기 쉬워요. 공부 시간을 작게 쪼개 보세요." },
  { id: "health", name: "건강운", em: "🌿", grp: null, good: "몸이 가벼운 해예요. 새 운동 습관을 들이기 좋아요.", mid: "무난하지만 과로만 조심하면 돼요.", low: "체력이 쉽게 떨어지는 해예요. 잠·식사·정기검진을 챙기세요." },
  { id: "home", name: "가정운", em: "🏠", grp: null, good: "집안이 화목하고 이사·집 문제도 순조로운 해예요.", mid: "가족과 큰일 없이 지내는 해예요. 함께하는 시간을 조금 더.", low: "가족 사이 서운함이 생기기 쉬워요. 먼저 안부를 건네 보세요." },
  { id: "people", name: "대인운", em: "🤝", grp: ["식상", "비겁"], good: "귀인과 동료 운이 좋은 해예요. 협업·모임에서 기회가 와요.", mid: "사람 관계가 무난해요. 오래된 인연을 챙기면 좋아요.", low: "경쟁·구설을 조심하는 해예요. 돈거래와 비밀 이야기는 아끼세요." },
];
export function tojeongTopics(profile, year, gender) {
  const M = tojeongMonths(profile, year), Y = M.year, tri = TRI_TOPIC[Y.up] || TRI_TOPIC[8];
  const loverGrp = gender === "male" ? "재성" : "관성";
  return TOPIC_DEF.map((t, i) => {
    const grps = t.id === "love" ? [loverGrp] : t.grp;
    const matched = grps ? M.months.filter((m) => grps.includes(m.grp)) : [];
    const avg = (list) => list.reduce((a, m) => a + m.sc, 0) / (list.length || 1);
    let sc = Y.score + tri[t.id] * 5 + ((Y.mid + i) % 3 - 1) * 2;
    if (matched.length) sc += Math.round((avg(matched) - Y.score) * 0.5) + Math.min(4, matched.length);
    if (t.id === "health") sc += Math.round((avg(M.months) - Y.score) * 0.4) - M.months.filter((m) => m.badge === "주의").length;
    sc = Math.max(30, Math.min(95, Math.round(sc)));
    const pool = (matched.length ? matched : M.months).slice().sort((a, b) => b.sc - a.sc);
    const best = pool.slice(0, 2).map((m) => m.m).sort((a, b) => a - b);
    const level = sc >= 70 ? "good" : sc >= 55 ? "mid" : "low";
    return { id: t.id, name: t.name, em: t.em, sc, level, label: level === "good" ? "좋음" : level === "mid" ? "보통" : "조심", text: t[level], best, half: Y.low === 1 ? "상반기" : Y.low === 3 ? "하반기" : "중반" };
  });
}

/* =========================================================
   토정비결 테마 리포트 (HAE) — 연애운 · 재물운 · 성공운 · 배우자복 · 운명의 사람
   해마다 세운 토정 괘(상괘·중괘·하괘)와 분야별 점수를 10년·평생으로 모아 본다.
   ========================================================= */
export const TRI_INFO = {
  1: { name: "건(乾)", sym: "하늘", el: "metal", person: "리더형 — 책임감 있고 당당한 사람", love: "확신을 주는 직진형 연애" },
  2: { name: "태(兌)", sym: "연못", el: "metal", person: "밝고 말이 잘 통하는 사람", love: "웃음이 많은 다정한 연애" },
  3: { name: "리(離)", sym: "불", el: "fire", person: "화려하고 열정적인 사람", love: "뜨겁고 표현이 많은 연애" },
  4: { name: "진(震)", sym: "우레", el: "wood", person: "추진력 있고 활동적인 사람", love: "빠르게 가까워지는 연애" },
  5: { name: "손(巽)", sym: "바람", el: "wood", person: "부드럽고 사교적인 사람", love: "천천히 스며드는 연애" },
  6: { name: "감(坎)", sym: "물", el: "water", person: "지혜롭고 속이 깊은 사람", love: "깊고 진지한 연애" },
  7: { name: "간(艮)", sym: "산", el: "earth", person: "듬직하고 한결같은 사람", love: "믿음이 쌓이는 오래가는 연애" },
  8: { name: "곤(坤)", sym: "땅", el: "earth", person: "포근하고 헌신적인 사람", love: "편안하게 품어 주는 연애" },
};
const PAIR8 = { 1: 8, 8: 1, 6: 3, 3: 6, 4: 5, 5: 4, 7: 2, 2: 7 };
/** 그해(year)에 birthY년생이 받는 상괘 — (세는나이 + 태세수) ÷ 8의 나머지 */
export function upOf(year, birthY) { const ty = yearGZ2(year); return rem(year - birthY + 1 + TJ_STEM[ty.s] + TJ_BR_YEAR[ty.b], 8); }
const ZOD = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];
const animalOf = (y) => ZOD[((y - 4) % 12 + 12) % 12];

export function tojeongTheme(profile, gender, id, span = 10) {
  const Y0 = new Date().getFullYear(), birthY = profile.solar ? profile.solar.Y : Y0 - 25;
  const years = [];
  for (let k = 0; k < span; k++) {
    const y = Y0 + k, T = tojeongTopics(profile, y, gender), R = tojeongYear(profile, y);
    const g = (key) => T.find((t) => t.id === key).sc;
    years.push({ y, age: y - birthY + 1, up: R.up, base: R.score, love: g("love"), money: g("money"), work: g("work"), study: g("study"), home: g("home"), people: g("people"), T });
  }
  const pick = (f, n = 3) => years.slice().sort((a, b) => f(b) - f(a)).slice(0, n).sort((a, b) => a.y - b.y);
  // 좋은 해 고르기 — 80점 넘는 해는 모두(최대 6개), 그보다 적으면 상위 3개
  const goodOf = (arr, f, line = 80, max = 6) => { const srt = arr.slice().sort((a, b) => f(b) - f(a) || a.y - b.y); const hi = srt.filter((r) => f(r) >= line).slice(0, max); return (hi.length >= 3 ? hi : srt.slice(0, 3)).sort((a, b) => a.y - b.y); };
  const bestMonths = (yr, key) => (yr.T.find((t) => t.id === key) || {}).best || [];
  if (id === "love") {
    const val = (r) => r.love;
    const top = goodOf(years, val), low = pick((r) => -r.love, 2);
    return { id, title: "토정비결 연애운", unit: "연애운", years: years.map((r) => ({ y: r.y, age: r.age, v: val(r), up: r.up })), top: top.map((r) => ({ y: r.y, age: r.age, v: val(r), months: bestMonths(r, "love"), up: r.up })), low: low.map((r) => ({ y: r.y, v: val(r) })),
      lead: `앞으로 ${span}년 중 연애운이 가장 뜨거운 해는 ${top.map((r) => r.y).join("·")}년이에요.`, now: years[0], nowText: `올해 괘는 ${TRI_INFO[years[0].up].name}·${TRI_INFO[years[0].up].sym} — ${TRI_INFO[years[0].up].love}가 어울리는 해예요.` };
  }
  if (id === "money") {
    const val = (r) => Math.round(r.money * 0.75 + r.base * 0.25);
    const top = goodOf(years, val), low = pick((r) => -val(r), 2);
    const life = tojeongLife(profile);
    return { id, title: "토정비결 재물운", unit: "재물운", years: years.map((r) => ({ y: r.y, age: r.age, v: val(r), up: r.up })), top: top.map((r) => ({ y: r.y, age: r.age, v: val(r), months: bestMonths(r, "money"), up: r.up })), low: low.map((r) => ({ y: r.y, v: val(r) })),
      lead: `돈이 모이는 해는 ${top.map((r) => r.y).join("·")}년, 지출을 조심할 해는 ${low.map((r) => r.y).join("·")}년이에요.`, life, now: years[0] };
  }
  if (id === "success") {
    const val = (r) => Math.round(r.work * 0.6 + r.study * 0.25 + r.base * 0.15);
    const top = goodOf(years, val), low = pick((r) => -val(r), 2);
    const life = tojeongLife(profile);
    return { id, title: "토정비결 성공운", unit: "성공운", years: years.map((r) => ({ y: r.y, age: r.age, v: val(r), up: r.up })), top: top.map((r) => ({ y: r.y, age: r.age, v: val(r), months: bestMonths(r, "work"), up: r.up })), low: low.map((r) => ({ y: r.y, v: val(r) })),
      lead: `승진·합격·이름을 알리기 좋은 해는 ${top.map((r) => r.y).join("·")}년이에요.`, life, now: years[0] };
  }
  if (id === "spouse") {
    // 결혼 적령기(세는나이 26~40) 중 아직 오지 않은 해
    const win = [];
    for (let y = Math.max(Y0, birthY + 25); y <= birthY + 39; y++) { const T = tojeongTopics(profile, y, gender), R = tojeongYear(profile, y); win.push({ y, age: y - birthY + 1, up: R.up, v: Math.round((T.find((t) => t.id === "home").sc + T.find((t) => t.id === "love").sc) / 2), T }); }
    const base = win.length ? win : years.map((r) => ({ y: r.y, age: r.age, up: r.up, v: Math.round((r.home + r.love) / 2), T: r.T }));
    const top = goodOf(base, (r) => r.v, 78);
    const ups = {}; base.forEach((r) => { ups[r.up] = (ups[r.up] || 0) + 1; });
    const myUp = Number(Object.entries(ups).sort((a, b) => b[1] - a[1])[0][0]), mateUp = PAIR8[myUp];
    const idx = Math.round(base.reduce((a, r) => a + r.v, 0) / base.length);
    return { id, title: "토정비결 배우자복", unit: "결혼운", years: base.map((r) => ({ y: r.y, age: r.age, v: r.v, up: r.up })), top: top.map((r) => ({ y: r.y, age: r.age, v: r.v, months: bestMonths(r, "home"), up: r.up })), low: [],
      lead: `결혼·동거처럼 가정을 꾸리기 좋은 해는 ${top.map((r) => r.y).join("·")}년이에요.`, index: idx, myUp, mateUp, mate: TRI_INFO[mateUp] };
  }
  if (id === "fate") {
    const meetOf = (r) => {
      const want = PAIR8[r.up], gen = [];
      const adult = (by) => r.y - by + 1 >= 18; // 그해 상대도 성인(세는나이 18세 이상)인 경우만
      for (let by = birthY - 7; by <= birthY + 7; by++) { if (adult(by) && upOf(r.y, by) === want) gen.push(by); }
      const sameEl = []; if (!gen.length) for (let by = birthY - 7; by <= birthY + 7; by++) { if (adult(by) && TRI_INFO[upOf(r.y, by)].el === TRI_INFO[r.up].el && by !== birthY) sameEl.push(by); }
      const list = (gen.length ? gen : sameEl).sort((a, b) => Math.abs(a - birthY) - Math.abs(b - birthY)).slice(0, 3).sort((a, b) => a - b);
      return { y: r.y, age: r.age, v: r.love, myUp: r.up, wantUp: want, kind: gen.length ? "천생 짝" : "같은 기운", births: list.map((by) => ({ by, animal: animalOf(by), diff: by - birthY, nowAge: Y0 - by + 1 })), months: bestMonths(r, "love") };
    };
    const meets = goodOf(years, (r) => r.love).map(meetOf);
    // 지나간 해 — 세는나이 18세부터 작년까지 (이미 만났을 수도 있는 인연)
    const pastYears = [];
    for (let y = Math.max(birthY + 17, Y0 - 25); y < Y0; y++) {
      const T = tojeongTopics(profile, y, gender), R = tojeongYear(profile, y);
      pastYears.push({ y, age: y - birthY + 1, up: R.up, love: T.find((t) => t.id === "love").sc, T });
    }
    const past = goodOf(pastYears, (r) => r.love).map(meetOf);
    return { id, title: "토정비결 운명의 사람", unit: "인연운", years: years.map((r) => ({ y: r.y, age: r.age, v: r.love, up: r.up })), top: meets, low: [],
      pastYears: pastYears.map((r) => ({ y: r.y, age: r.age, v: r.love, up: r.up })), past,
      lead: past.length ? `이미 스쳐 갔을 수도 있는 해 ${past.map((m) => m.y).join("·")}년 · 다가오는 해 ${meets.map((m) => m.y).join("·")}년` : `운명의 인연이 다가오는 해: ${meets.map((m) => m.y).join("·")}년`, birthY };
  }
  return null;
}

/* =========================================================
   괘별 상세 풀이 (HAE) — 팔괘의 전통 괘상(가족·몸·성질)을 바탕으로
   건=아버지·머리 / 곤=어머니·배 / 진=장남·발 / 손=장녀·허벅지
   감=중남·귀 / 리=중녀·눈 / 간=소남·손 / 태=소녀·입
   ========================================================= */
export const TRI_DEEP = {
  1: {
    look: "이마가 넓고 이목구비가 또렷한 얼굴, 자세가 곧고 어깨가 반듯해요. 단정한 셔츠·코트처럼 깔끔한 옷차림이 잘 어울리는 사람.",
    first: "처음엔 조금 어렵고 무게감 있어 보이지만, 말을 나눠 보면 의외로 배려가 깊어요.",
    char: "책임감이 강하고 약속을 지켜요. 결정이 빠르고 자기 기준이 분명해서, 기대면 든든하지만 고집도 있어요.",
    job: "조직을 이끄는 일 — 관리자·공무원·법·금융·경영, 혹은 자기 사업",
    place: ["직장·회의·업무 미팅", "공식 행사·세미나·학회", "선배·윗사람의 소개"],
    how: "일이나 공적인 자리에서 먼저 실력을 알아보고, 그 사람이 먼저 다가오는 경우가 많아요.",
    love: "애매하게 끌지 않고 확실하게 표현해요. 기념일·계획을 챙기는 리드형.",
    marry: "가장 역할을 자처해서 경제·큰 결정을 책임지는 든든한 결혼 생활. 대신 집안의 기준을 그 사람이 세우려 할 수 있어요.",
    clash: "자존심이 부딪히면 둘 다 물러서지 않아요. 지시하는 말투에 서운해지기 쉬워요.",
    keep: "그 사람의 판단을 먼저 인정해 주고, 내 의견은 ‘제안’처럼 건네면 오래가요.",
    loveYear: "확신을 주는 사람이 나타나는 해 — 공식적인 만남(소개·모임)이 잘 풀려요.",
    moneyYear: "월급·승진·계약처럼 ‘정식으로 들어오는 돈’이 커지는 해예요.",
    workYear: "책임 있는 자리를 맡거나, 윗사람에게 인정받아 한 단계 올라서는 해예요.",
  },
  2: {
    look: "입매가 예쁘고 웃는 얼굴이 인상적이에요. 표정이 풍부하고 목소리가 좋아요. 밝은 색 옷, 액세서리로 포인트를 주는 스타일.",
    first: "처음 만나도 낯가림 없이 말을 잘 걸어 줘서, 금방 편해져요.",
    char: "유머 감각이 있고 분위기를 살려요. 감정 표현이 솔직하지만 기분이 얼굴에 바로 드러나요.",
    job: "말과 사람을 다루는 일 — 영업·서비스·강사·방송·마케팅·요식업",
    place: ["맛집·카페·술자리", "동호회·취미 모임", "친구의 친구 생일·파티"],
    how: "가볍게 대화를 나누다가 ‘말이 너무 잘 통해서’ 연락을 이어 가는 식으로 시작돼요.",
    love: "연락이 잦고 데이트가 즐거운 연애. 칭찬과 애정 표현이 많아요.",
    marry: "웃음이 끊이지 않는 집. 친구 같은 부부로 주말마다 놀러 다니는 결혼 생활이에요. 씀씀이는 같이 관리해야 해요.",
    clash: "말로 상처를 주고받기 쉬워요. 농담이 지나치거나 약속을 가볍게 여기면 서운해져요.",
    keep: "말보다 행동으로 신뢰를 보여 주고, 둘만의 즐거운 루틴을 만들면 오래가요.",
    loveYear: "웃음이 많은 연애가 시작되는 해 — 모임·맛집·술자리에서 인연이 닿아요.",
    moneyYear: "말과 사람으로 돈이 들어오는 해 — 영업·부업·소개로 생기는 수입이 좋아요. 지출도 같이 늘어요.",
    workYear: "발표·협상·면접처럼 ‘말’로 하는 일에서 성과가 나는 해예요.",
  },
  3: {
    look: "눈이 크고 반짝여서 눈빛이 먼저 기억나요. 피부가 환하고 화사한 인상, 패션 감각이 좋아서 사진이 잘 나오는 사람.",
    first: "어디서든 눈에 띄어요. 첫 만남부터 강한 인상을 남겨요.",
    char: "열정적이고 표현이 많아요. 아름다운 것을 좋아하고 자존감이 높아요. 감정이 빨리 뜨겁고 빨리 식을 수도 있어요.",
    job: "보여 주는 일 — 디자인·예술·미디어·뷰티·교육·IT",
    place: ["전시회·공연·축제", "학교·수업·스터디", "SNS·사진을 통한 연결"],
    how: "서로 첫눈에 끌리는 경우가 많아요. 외모나 재능에 먼저 반하고 대화로 확신해요.",
    love: "뜨겁고 로맨틱한 연애. 이벤트와 기념사진을 남기는 걸 좋아해요.",
    marry: "집을 예쁘게 꾸미고 문화생활을 같이 즐기는 결혼 생활. 서로에게 계속 설레려는 노력이 필요해요.",
    clash: "감정이 앞서서 다툼이 커지기 쉬워요. 관심이 줄었다고 느끼면 크게 서운해해요.",
    keep: "칭찬과 관심을 아끼지 말고, 다툰 날은 한숨 자고 이야기하면 오래가요.",
    loveYear: "첫눈에 끌리는 사람이 나타나는 해 — 학교·전시·SNS에서 인연이 닿아요.",
    moneyYear: "이름이 알려지면서 돈이 따라오는 해 — 꾸밈·자기 계발에 쓰는 돈도 커지니 균형이 중요해요.",
    workYear: "실력이 드러나고 평가를 받는 해 — 합격·수상·포트폴리오가 빛나요.",
  },
  4: {
    look: "다리가 길고 키가 큰 편이거나 몸이 탄탄해요. 걸음이 빠르고 활동적인 인상, 운동복·캐주얼이 잘 어울려요.",
    first: "에너지가 넘쳐서 같이 있으면 덩달아 기운이 나요.",
    char: "추진력이 좋고 행동이 먼저예요. 솔직하고 뒤끝이 없지만 성격이 급하고 즉흥적이에요.",
    job: "움직이는 일 — 스포츠·영업·창업·운송·현장 기술·스타트업",
    place: ["운동·헬스장·러닝 크루", "여행지·공항·이동 중", "새로 시작한 일·이직한 곳"],
    how: "우연히, 갑자기 시작돼요. 생각지 못한 곳에서 만나 짧은 시간에 가까워져요.",
    love: "빠르게 가까워지는 연애. 같이 여행 다니고 새로운 걸 해 보는 걸 좋아해요.",
    marry: "활기찬 결혼 생활. 이사·도전을 같이 하며 키워 가는 집이에요. 큰 결정을 성급하게 하지 않도록 브레이크가 필요해요.",
    clash: "급한 성격 때문에 말이 먼저 나가요. 계획 없이 결정하면 다툼이 생겨요.",
    keep: "운동·여행처럼 몸을 같이 움직이는 시간을 만들고, 큰돈 쓰기 전엔 하루 미루는 약속을 해 두세요.",
    loveYear: "갑작스럽게 시작되는 인연의 해 — 여행·운동·새로운 환경에서 만나요.",
    moneyYear: "움직이는 만큼 버는 해 — 새 일·이직·창업으로 돈의 흐름이 바뀌어요. 성급한 투자는 조심.",
    workYear: "새 출발의 해 — 이직·창업·새 프로젝트를 시작하기 좋아요.",
  },
  5: {
    look: "키가 크고 선이 가늘어요. 머리카락이 부드럽고 손이 고운 편, 차분한 톤의 옷이 잘 어울리는 단정한 인상.",
    first: "부드럽고 친절해서 ‘좋은 사람이다’ 싶은데, 속마음은 천천히 보여 줘요.",
    char: "배려심이 많고 눈치가 빨라요. 갈등을 싫어해서 맞춰 주지만, 결정을 미루는 편이에요.",
    job: "사람을 잇는 일 — 무역·유통·홍보·상담·비서·출판·여행",
    place: ["지인 소개·소개팅", "SNS·메신저·앱", "카페·서점·조용한 모임"],
    how: "바람처럼 스며들어요. 지인을 통해 몇 번 마주치다 연락이 이어지고, 자연스럽게 연애가 돼요.",
    love: "천천히 스며드는 연애. 연락은 꾸준하고 다정하지만, 고백은 오래 걸릴 수 있어요.",
    marry: "서로 존중하는 조용하고 평화로운 결혼 생활. 양가와도 원만해요. 중요한 결정은 내가 이끌어야 할 때가 있어요.",
    clash: "속마음을 말 안 하고 쌓아 두다가 한 번에 멀어질 수 있어요.",
    keep: "정기적으로 속마음을 묻는 시간을 만들고, 작은 결정은 그 사람에게 맡겨 자신감을 주세요.",
    loveYear: "천천히 스며드는 인연의 해 — 소개·SNS·지인 모임에서 시작돼요.",
    moneyYear: "사람을 통해 돈이 들어오는 해 — 소개·거래·유통으로 버는 돈이 좋아요.",
    workYear: "인맥이 길을 여는 해 — 추천·소개로 기회가 오고 협업이 잘 풀려요.",
  },
  6: {
    look: "귀가 잘생기고 눈빛이 깊어요. 피부가 하얗거나 촉촉한 인상, 어두운 톤·모노톤 옷이 잘 어울리는 분위기 있는 사람.",
    first: "조용하고 신비로워요. 말수가 적은데 한마디 한마디가 기억에 남아요.",
    char: "생각이 깊고 똑똑해요. 남의 이야기를 잘 들어 주지만, 혼자 고민을 끌어안는 편이에요.",
    job: "생각하고 연구하는 일 — 연구·의료·IT·금융 분석·심리·작가",
    place: ["물가·바다·강변 여행", "밤의 대화·늦은 술자리", "공부·스터디·도서관"],
    how: "고민을 나누다 깊어지는 인연이에요. 힘든 시기에 곁에 있어 준 사람이 운명이 돼요.",
    love: "깊고 진지한 연애. 둘만 아는 이야기가 많아지는 사이가 돼요.",
    marry: "정서적으로 깊이 기대는 결혼 생활. 돈 관리를 꼼꼼히 해서 조용히 모으는 집이에요. 대화가 끊기지 않게 신경 써야 해요.",
    clash: "속으로 삭이다가 혼자 결론을 내 버려요. 의심이 생기면 오래 가요.",
    keep: "솔직하게 자주 이야기하고, 그 사람이 혼자 있는 시간을 존중해 주면 오래가요.",
    loveYear: "깊은 대화로 시작되는 인연의 해 — 고민 상담·스터디·물가 여행에서 만나요.",
    moneyYear: "조용히 모이는 해 — 저축·공부·자격증처럼 ‘나중에 커지는 돈’을 준비하기 좋아요. 보증은 금물.",
    workYear: "실력을 쌓는 해 — 공부·연구·자격증에 운이 있어요. 겉으론 조용해도 속은 크게 자라요.",
  },
  7: {
    look: "콧대가 있고 손이 크고 단단해요. 체격이 듬직하고 표정이 차분해요. 편안한 니트·아웃도어 스타일이 잘 어울려요.",
    first: "말이 많지 않아 무뚝뚝해 보이지만, 볼수록 믿음이 가요.",
    char: "한결같고 우직해요. 한 번 정하면 쉽게 안 변하고, 성실하게 쌓아 가요. 융통성은 부족할 수 있어요.",
    job: "쌓아 올리는 일 — 건축·부동산·공무원·제조·기술직·교육",
    place: ["오래 다닌 곳(학교·회사·동네)", "등산·캠핑·자연", "오래 알던 친구·동창"],
    how: "오래 알던 사이에서 어느 날 ‘이 사람이다’ 싶어지는 인연이에요. 시간이 쌓여 연애가 돼요.",
    love: "믿음이 쌓이는 오래가는 연애. 화려하진 않아도 늘 그 자리에 있어요.",
    marry: "안정적인 결혼 생활. 집·부동산처럼 단단한 자산을 같이 모아요. 변화가 적어 지루하지 않게 새 경험을 넣어 주세요.",
    clash: "고집이 세서 한 번 막히면 대화가 멈춰요. 표현이 적어 서운함이 쌓여요.",
    keep: "표현을 부탁하기보다 내가 먼저 고마움을 말해 주면, 그 사람도 천천히 따라와요.",
    loveYear: "오래 알던 사람이 다르게 보이는 해 — 동창·오랜 동료·같은 동네에서 인연이 닿아요.",
    moneyYear: "쌓는 해 — 큰 수익보다 저축·부동산·적금처럼 단단히 모으기 좋아요.",
    workYear: "버티면 인정받는 해 — 묵묵히 한 일이 성과로 쌓이고 자리가 단단해져요.",
  },
  8: {
    look: "얼굴이 둥글고 포근한 인상이에요. 살결이 부드럽고 체형이 편안해요. 넉넉하고 편한 옷이 잘 어울리는 따뜻한 사람.",
    first: "처음 봐도 편안해요. 같이 있으면 마음이 놓이는 사람.",
    char: "헌신적이고 인내심이 많아요. 남을 잘 챙기지만, 자기 의견을 잘 말하지 않아요.",
    job: "돌보고 키우는 일 — 교육·간호·복지·요리·농업·부동산·살림 관련",
    place: ["가족·친척의 소개", "집 근처·동네·단골 가게", "봉사·종교·돌봄 모임"],
    how: "주변 어른이나 가족이 연결해 주는 인연이에요. 편안함이 쌓여서 결혼까지 자연스럽게 가요.",
    love: "편안하게 품어 주는 연애. 맛있는 걸 해 주고, 아플 때 곁에 있어 줘요.",
    marry: "가정적인 결혼 생활. 살림과 아이를 잘 챙기고 집이 따뜻해요. 그 사람이 혼자 다 떠안지 않게 나눠 주세요.",
    clash: "참다가 한 번에 서운함이 터져요. 내가 당연하게 여기면 상처받아요.",
    keep: "그 사람의 헌신을 당연하게 여기지 말고, 작은 것에도 고맙다고 말해 주면 오래가요.",
    loveYear: "편안한 인연의 해 — 가족·어른의 소개, 동네·단골 가게에서 만나요.",
    moneyYear: "모으고 지키는 해 — 집·살림 관련 돈의 흐름이 좋고, 차곡차곡 모으기 좋아요.",
    workYear: "기반을 다지는 해 — 혼자 튀기보다 팀을 받쳐 줄 때 인정받아요.",
  },
};
export const TRI_PAIRMATE = PAIR8;
