/* =========================================================
   부가 운세 — 띠(60간지) · 별자리 · 바이오리듬.
   모두 생년월일로 계산. 재미·참고용.
   ========================================================= */

import { majorBgStyle } from "../tarot/cardArt.js";
import { computeSaju } from "./manse.js";
import { tenGod } from "./fortune.js";

/* ---------------- 띠 (60간지) ---------------- */
const ZODIAC = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];
const ZTRAIT = {
  쥐: { p: "영리하고 재빨라 기회를 잘 잡아요.", s: "적응력·생활력·눈치", c: "잔걱정이 많고 인색해 보일 수 있어요." },
  소: { p: "성실하고 뚝심 있게 밀고 나가요.", s: "끈기·신뢰·인내", c: "고집스럽고 변화에 느릴 수 있어요." },
  호랑이: { p: "당당하고 추진력 있는 리더예요.", s: "용기·카리스마·정의감", c: "욱하거나 독단이 될 수 있어요." },
  토끼: { p: "온화하고 센스 있어 인기가 많아요.", s: "친화력·감각·배려", c: "우유부단하고 상처를 잘 받아요." },
  용: { p: "스케일이 크고 자신감이 넘쳐요.", s: "야망·매력·주도력", c: "허세·기복이 클 수 있어요." },
  뱀: { p: "깊고 지혜로우며 통찰이 뛰어나요.", s: "직관·집중·신비로움", c: "속을 잘 안 보여 오해받기도." },
  말: { p: "밝고 활동적이며 자유로워요.", s: "열정·추진·사교성", c: "싫증을 잘 내고 참을성이 약해요." },
  양: { p: "부드럽고 예술적이며 정이 많아요.", s: "감성·배려·심미안", c: "의존적이고 걱정이 많아요." },
  원숭이: { p: "재치 있고 영리해 문제 해결이 빨라요.", s: "기지·응용력·유머", c: "변덕·잔꾀로 보일 수 있어요." },
  닭: { p: "부지런하고 꼼꼼하며 완벽을 추구해요.", s: "성실·계획·미의식", c: "잔소리·비판이 셀 수 있어요." },
  개: { p: "의리 있고 정직하며 헌신적이에요.", s: "충실·정의·책임감", c: "예민하고 걱정을 안고 살아요." },
  돼지: { p: "너그럽고 복스러우며 정이 깊어요.", s: "포용·재복·낙천", c: "물러 터지거나 과하게 베풀어요." },
};
// 지지 관계: 삼합/육합/충/해
const HAP6 = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
const SAMHAP = [[8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7]];
const HAE = [[0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10]];
const inP = (list, a, b) => list.some((p) => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));
function branchRel(a, b) {
  if (Math.abs(a - b) === 6) return { rel: "충", good: false, line: "부딪힘·변동이 큰 날. 감정이 앞서기 쉬워요." };
  if (inP(HAP6, a, b)) return { rel: "육합", good: true, line: "잘 맞고 편안한 날. 인연·협력이 순조로워요." };
  if (SAMHAP.some((g) => g.includes(a) && g.includes(b)) && a !== b) return { rel: "삼합", good: true, line: "기운이 잘 통해 일이 술술 풀리는 날." };
  if (inP(HAE, a, b)) return { rel: "해", good: false, line: "사소한 마찰·오해를 조심할 날." };
  if (a === b) return { rel: "동일", good: true, line: "내 기운이 도드라지는 날. 주도적으로!" };
  return { rel: "무난", good: true, line: "무난한 하루. 평소 페이스대로 가면 좋아요." };
}

export function zodiacFortune(profile, today = new Date()) {
  const yb = profile.pillars.year.branchIdx;
  const p = (n) => String(n).padStart(2, "0");
  const t = computeSaju({ calendarType: "solar", birthDate: `${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}`, birthTime: "12:00", timeUnknown: true, gender: "male", timezone: "Asia/Seoul" });
  const tb = t.pillars.day.branchIdx;
  const rel = branchRel(yb, tb);
  const tr = ZTRAIT[ZODIAC[yb]];
  return {
    name: ZODIAC[yb] + "띠", gapja: profile.pillars.year.gz + "년생",
    persona: tr.p, strength: tr.s, caution: tr.c,
    todayRel: rel.rel, todayGood: rel.good, todayLine: rel.line,
    todayZodiac: ZODIAC[tb] + "띠",
    score: rel.good ? 66 + (tb % 5) * 4 : 44 + (tb % 5) * 3,
  };
}

/* ---------------- 별자리 ---------------- */
const SIGNS = [
  { name: "물병자리", from: [1, 20], to: [2, 18], p: "독창적이고 자유로운 아이디어 뱅크예요.", love: "친구 같은 편안한 연애를 좋아해요." },
  { name: "물고기자리", from: [2, 19], to: [3, 20], p: "감성 깊고 상상력이 풍부해요.", love: "헌신적이고 낭만적인 사랑을 해요." },
  { name: "양자리", from: [3, 21], to: [4, 19], p: "열정적이고 도전을 즐겨요.", love: "직진! 솔직하고 빠른 연애." },
  { name: "황소자리", from: [4, 20], to: [5, 20], p: "안정적이고 끈기 있어요.", love: "느리지만 깊고 오래가는 사랑." },
  { name: "쌍둥이자리", from: [5, 21], to: [6, 21], p: "호기심 많고 말솜씨가 좋아요.", love: "지루할 틈 없는 대화형 연애." },
  { name: "게자리", from: [6, 22], to: [7, 22], p: "따뜻하고 가족적이에요.", love: "포근하게 챙겨주는 사랑." },
  { name: "사자자리", from: [7, 23], to: [8, 22], p: "당당하고 주목받는 걸 즐겨요.", love: "표현 확실한 화려한 연애." },
  { name: "처녀자리", from: [8, 23], to: [9, 22], p: "꼼꼼하고 분석적이에요.", love: "세심하게 챙기는 현실 연애." },
  { name: "천칭자리", from: [9, 23], to: [10, 22], p: "균형 감각과 미적 센스가 좋아요.", love: "매너 있고 조화로운 사랑." },
  { name: "전갈자리", from: [10, 23], to: [11, 22], p: "깊고 강렬하며 집중력이 커요.", love: "올인하는 진한 연애." },
  { name: "사수자리", from: [11, 23], to: [12, 24], p: "자유롭고 낙천적인 모험가예요.", love: "구속 없는 쿨한 연애." },
  { name: "염소자리", from: [12, 25], to: [1, 19], p: "성실하고 목표 지향적이에요.", love: "진지하고 책임감 있는 사랑." },
];
/** 별자리 이름 → "6월 22일 ~ 7월 22일" */
export const SIGN_RANGE = Object.fromEntries(SIGNS.map((sg) => [sg.name, `${sg.from[0]}월 ${sg.from[1]}일 ~ ${sg.to[0]}월 ${sg.to[1]}일`]));
export function starSign(profile) {
  const s = profile.solar; const m = s.M, d = s.D;
  const sign = SIGNS.find((sg) => {
    const [fm, fd] = sg.from, [tm, td] = sg.to;
    if (fm === tm) return m === fm && d >= fd && d <= td;
    if (fm < tm) return (m === fm && d >= fd) || (m === tm && d <= td) || (m > fm && m < tm);
    return (m === fm && d >= fd) || (m === tm && d <= td); // 해 넘어감(염소)
  }) || SIGNS[0];
  return { name: sign.name, persona: sign.p, love: sign.love, date: `${m}월 ${d}일생`, range: `${sign.from[0]}월 ${sign.from[1]}일 ~ ${sign.to[0]}월 ${sign.to[1]}일` };
}

/* ---------------- 십신 그룹(공용) ---------------- */
const GEN2 = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
const CTRL2 = { wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" };
const CTRL_BY2 = { wood: "metal", fire: "water", earth: "wood", metal: "fire", water: "earth" };
const RES2 = { wood: "water", fire: "wood", earth: "fire", metal: "earth", water: "metal" };
function sipG(profile) {
  const e = profile.dayMasterElem, c = profile.elementCounts || {};
  return { peer: c[e] || 0, output: c[GEN2[e]] || 0, wealth: c[CTRL2[e]] || 0, officer: c[CTRL_BY2[e]] || 0, resource: c[RES2[e]] || 0 };
}
function hashN(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff; return h; }
const clampS = (n) => Math.max(28, Math.min(98, Math.round(n)));

/* ---------------- 매력 스타일 가이드 — 일간 오행 + 매력 기운 ---------------- */
const CHARM_STYLE = {
  wood: {
    talk: ["상대의 목표·요즘 하는 일을 먼저 물어보는 말투가 잘 통해요.", "‘그거 좋다, 해 보자’처럼 응원하고 같이 시작하자는 말이 매력 포인트예요.", "너무 가르치듯 말하는 건 피하기 — 조언보다 공감 먼저."],
    look: ["색: 올리브·세이지 그린, 베이지, 크림", "스타일: 셔츠·니트·린넨처럼 자연스러운 소재, 깔끔한 일자 실루엣", "헤어: 결 살린 생머리나 자연스러운 C컬, 이마가 살짝 보이게", "향: 우디·그린티·풀내음 계열"],
  },
  fire: {
    talk: ["리액션을 크게 — 웃음과 감탄이 당신의 최대 무기예요.", "칭찬은 바로바로, 구체적으로 (‘오늘 그 색 진짜 잘 어울린다’).", "흥분해서 말이 빨라질 땐 한 박자 쉬고 상대 말을 끝까지 들어 주기."],
    look: ["색: 코랄·레드 포인트, 화이트, 선명한 컬러 한 가지", "스타일: 포인트 아이템 하나(립·가방·니트)로 시선 모으기", "헤어: 볼륨감 있는 웨이브나 생기 있는 컬", "향: 시트러스·스파이시·과일 계열"],
  },
  earth: {
    talk: ["느긋하고 차분한 말투, 약속을 꼭 지키는 모습이 신뢰를 줘요.", "‘밥은 먹었어?’처럼 일상을 챙기는 한마디가 가장 강해요.", "다 맞춰 주기만 하지 말고, 내 취향도 가끔 분명하게 말하기."],
    look: ["색: 카멜·브라운·아이보리·베이지 톤온톤", "스타일: 부드러운 니트·가디건·코트, 편안하지만 단정하게", "헤어: 단정한 단발이나 자연스러운 웨이브, 둥근 느낌", "향: 바닐라·머스크·파우더리 계열"],
  },
  metal: {
    talk: ["짧고 분명한 말투 — 빈말 없이 진심만 말하는 게 매력이에요.", "내 기준과 취향을 또렷하게 말할수록 더 궁금해해요.", "평가하는 말투(‘그건 아니지’)는 부드럽게 바꾸기 — ‘나는 이게 더 좋더라’."],
    look: ["색: 화이트·그레이·블랙·실버, 모노톤", "스타일: 재킷·셔츠처럼 선이 분명한 옷, 미니멀한 액세서리", "헤어: 깔끔한 단발·슬릭한 스타일·투블럭, 잔머리 정리", "향: 깨끗한 코튼·알데하이드·화이트 머스크"],
  },
  water: {
    talk: ["천천히, 낮은 톤으로 — 여운을 남기는 말투가 잘 어울려요.", "상대 감정을 먼저 알아봐 주는 공감형 대화가 강점이에요.", "속마음을 너무 숨기면 무관심으로 오해받으니, 좋을 땐 좋다고 말하기."],
    look: ["색: 네이비·딥블루·블랙·차콜", "스타일: 흐르는 소재(실크·저지), 톤 다운된 무드", "헤어: 긴 웨이브나 자연스럽게 떨어지는 머리, 촉촉한 광", "향: 아쿠아·머스크·은은한 플로럴"],
  },
};
export function charmStyle(profile) {
  const e = profile.dayMasterElem;
  const s = sipG(profile);
  const extra = s.output >= 2 ? "표현의 기운이 강해서, 말과 리액션이 곧 매력이에요. 대화할 때 가장 빛나요."
    : s.wealth >= 2 ? "함께하는 시간을 즐겁게 만드는 힘이 있어요. 같이 뭔가를 ‘해 보는’ 데이트가 잘 맞아요."
      : s.resource >= 2 ? "품어 주는 분위기가 매력이에요. 차분하게 들어 주는 모습에 상대가 마음을 열어요."
        : s.officer >= 2 ? "단정하고 믿음직한 인상이 매력이에요. 흐트러짐 없는 모습이 신뢰를 줘요."
          : "자연스러운 모습이 제일 매력적인 타입이에요. 과한 꾸밈보다 나다운 스타일이 통해요.";
  return { ...CHARM_STYLE[e], extra };
}

/* ---------------- 매력 지수 (오늘/이달) ---------------- */
export function charmIndex(profile, period = "today", today = new Date()) {
  const s = sipG(profile);
  // 도화(자오묘유) 개수
  const dohwa = [profile.pillars.year, profile.pillars.month, profile.pillars.day, profile.pillars.hour]
    .filter(Boolean).filter((p) => [0, 3, 6, 9].includes(p.branchIdx)).length;
  const base = 46 + dohwa * 9 + s.output * 5 + s.wealth * 4;
  const key = period === "today" ? `${today.getFullYear()}${today.getMonth()}${today.getDate()}` : `${today.getFullYear()}${today.getMonth()}`;
  const j = hashN((profile.pillars.day.gz || "") + key) % 16 - 6;
  const score = clampS(base + j);
  const grade = score >= 88 ? "A+" : score >= 78 ? "A" : score >= 68 ? "A-" : score >= 58 ? "B+" : score >= 48 ? "B" : "C";
  return {
    period, label: period === "today" ? "오늘" : "이달",
    score, grade,
    line: score >= 78 ? "매력이 반짝이는 시기! 사람들이 당신에게 끌려요. 먼저 다가가도 좋아요."
      : score >= 58 ? "은은한 매력이 통하는 흐름이에요. 자연스러운 모습이 제일 예뻐요."
        : "무리해서 어필하기보다 나를 가꾸며 컨디션을 채울 때예요.",
    tip: dohwa >= 2 ? "타고난 도화(매력) 기운이 있어 표현할수록 빛나요." : "말·스타일에 조금만 신경 쓰면 호감도가 확 올라요.",
  };
}

/* ---------------- 행운 카드 (오늘의 럭키 타로) ---------------- */
const MAJORS = ["바보", "마법사", "여사제", "여황제", "황제", "교황", "연인", "전차", "힘", "은둔자", "운명의 수레바퀴", "정의", "매달린 사람", "죽음", "절제", "악마", "탑", "별", "태양", "달", "심판", "세계"];
const LUCKY_MSG = ["새로 시작해 봐, 두려워 말고.", "네 능력을 믿고 실행할 때야.", "직관을 믿어, 답은 이미 알아.", "풍요와 애정이 함께해.", "중심을 잡으면 흐름이 붙어.", "배움과 조언이 행운을 불러.", "좋은 인연·선택이 기다려.", "밀어붙이면 이겨.", "부드러운 용기가 통해.", "잠깐의 성찰이 길을 밝혀.", "전환점! 기회를 잡아.", "공정하게, 결과가 따라와.", "관점을 바꾸면 풀려.", "끝은 새 시작이야.", "중용을 지키면 안정돼.", "얽매인 걸 끊어낼 때.", "묵은 걸 무너뜨려 새로.", "희망을 놓지 마, 곧 회복돼.", "환하게 풀리는 날!", "혼란은 곧 걷혀.", "다시 일어설 기회가 와.", "드디어 완성·성취!"];
export function luckyCard(profile, today = new Date()) {
  const seed = hashN(`${profile.pillars.day.gz}_${today.getFullYear()}${today.getMonth()}${today.getDate()}`);
  const idx = seed % 22;
  return { idx, name: MAJORS[idx], bgStyle: majorBgStyle(idx), message: LUCKY_MSG[idx], luckyColor: ["빨강", "주황", "노랑", "초록", "파랑", "보라", "분홍", "흰색"][seed % 8] };
}

/* ---------------- 오늘의 운세 레이더 (5분야) ---------------- */
export function radarScores(profile, today = new Date()) {
  const s = sipG(profile);
  const total = s.peer + s.output + s.wealth + s.officer + s.resource || 1;
  const dohwa = [profile.pillars.year, profile.pillars.month, profile.pillars.day, profile.pillars.hour]
    .filter(Boolean).filter((p) => [0, 3, 6, 9].includes(p.branchIdx)).length;
  const key = `${today.getFullYear()}${today.getMonth()}${today.getDate()}`;
  const jit = (name) => hashN(profile.pillars.day.gz + key + name) % 20 - 8;
  const norm = (v, name) => clampS(45 + (v / total) * 90 + jit(name));
  return [
    { key: "재물운", v: norm(s.wealth + s.output * 0.4, "money") },
    { key: "연애운", v: norm(s.wealth * 0.5 + s.officer * 0.5 + dohwa, "love") },
    { key: "사업운", v: norm(s.officer + s.wealth * 0.6, "work") },
    { key: "건강운", v: norm(s.peer + s.resource * 0.5, "health") },
    { key: "학업운", v: norm(s.resource + s.output * 0.4, "study") },
  ];
}
export function radarSvg(scores) {
  const W = 260, cx = W / 2, cy = 140, R = 92, n = scores.length;
  const pt = (i, r) => { const a = -Math.PI / 2 + (2 * Math.PI * i) / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
  let rings = "";
  for (const f of [1, 0.66, 0.33]) rings += `<polygon points="${scores.map((_, i) => pt(i, R * f).map((x) => x.toFixed(1)).join(",")).join(" ")}" fill="none" stroke="rgba(255,255,255,0.10)"/>`;
  let axes = "", labels = "";
  scores.forEach((sc, i) => {
    const [ex, ey] = pt(i, R); axes += `<line x1="${cx}" y1="${cy}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="rgba(255,255,255,0.08)"/>`;
    const [lx, ly] = pt(i, R + 18);
    labels += `<text x="${lx.toFixed(1)}" y="${(ly + 3).toFixed(1)}" text-anchor="middle" font-size="11" fill="#d7c4c8">${sc.key} ${sc.v}</text>`;
  });
  const poly = scores.map((sc, i) => pt(i, R * (sc.v / 100)).map((x) => x.toFixed(1)).join(",")).join(" ");
  return `<svg viewBox="0 0 ${W} ${W}" width="100%" role="img" aria-label="오늘의 운세 레이더">${rings}${axes}<polygon points="${poly}" fill="rgba(236,171,176,0.28)" stroke="#ecabb0" stroke-width="2"/>${labels}</svg>`;
}

/* ---------------- 바이오리듬 ---------------- */
export function biorhythm(profile, today = new Date()) {
  const s = profile.solar;
  const birth = new Date(s.Y, s.M - 1, s.D);
  const days = Math.floor((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(birth.getFullYear(), birth.getMonth(), birth.getDate())) / 86400000);
  const cyc = (period, d = days) => Math.round(Math.sin((2 * Math.PI * d) / period) * 100);
  const phys = cyc(23), emo = cyc(28), intel = cyc(33);
  const lv = (v) => v >= 60 ? "좋음" : v >= 20 ? "무난" : v >= -20 ? "주의(전환)" : v >= -60 ? "낮음" : "저조";

  // 곡선용 시계열 (오늘 기준 -15 ~ +15일, 31점)
  const SPAN = 15;
  const physical = [], emotional = [], intellectual = [], xdates = [];
  for (let o = -SPAN; o <= SPAN; o++) {
    physical.push(cyc(23, days + o));
    emotional.push(cyc(28, days + o));
    intellectual.push(cyc(33, days + o));
    const dt = new Date(today); dt.setDate(dt.getDate() + o);
    xdates.push({ i: o + SPAN, day: dt.getDate(), isToday: o === 0 });
  }
  return {
    days, span: SPAN, todayIndex: SPAN,
    series: { physical, emotional, intellectual }, xdates,
    physical: { v: phys, level: lv(phys), desc: "체력·활력·컨디션" },
    emotional: { v: emo, level: lv(emo), desc: "감정·기분·직감" },
    intellectual: { v: intel, level: lv(intel), desc: "집중·판단·논리" },
    tip: phys < -20 || emo < -20 || intel < -20
      ? "곡선이 0을 지나는 ‘전환일’ 근처예요. 무리한 결정·과로는 피하고 컨디션 관리를 우선하세요."
      : "전반적으로 안정적인 흐름이에요. 좋은 리듬을 활용해 계획한 일을 밀어붙여 보세요.",
  };
}

/* 바이오리듬 곡선 SVG — 부드러운 베지어 곡선 + 은은한 글로우 */
export function bioSvg(b, H = 150) {
  const W = 320, padX = 12, botPad = 18, mid = (H - botPad) / 2 + 4, amp = (H - botPad) / 2 - 8;
  const n = b.series.physical.length;
  const X = (i) => padX + (i / (n - 1)) * (W - padX * 2);
  const Y = (v) => mid - (v / 100) * amp;
  // Catmull-Rom → 부드러운 곡선 path
  const smooth = (arr) => {
    const p = arr.map((v, i) => [X(i), Y(v)]);
    let d = `M ${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p[i + 1];
      const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
  };
  const curve = (arr, color) => `<path d="${smooth(arr)}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" filter="url(#bioGlow)"/>`;
  const dot = (arr, color) => { const cx = X(b.todayIndex).toFixed(1), cy = Y(arr[b.todayIndex]).toFixed(1); return `<circle cx="${cx}" cy="${cy}" r="4.5" fill="${color}" stroke="#fff" stroke-width="1.6"/>`; };
  let grid = "";
  for (const gy of [amp, amp / 2, -amp / 2, -amp]) grid += `<line x1="${padX}" y1="${(mid - gy).toFixed(1)}" x2="${W - padX}" y2="${(mid - gy).toFixed(1)}" stroke="rgba(255,230,240,0.16)" stroke-dasharray="1 6"/>`;
  const zero = `<line x1="${padX}" y1="${mid}" x2="${W - padX}" y2="${mid}" stroke="rgba(255,217,194,0.55)" stroke-width="1"/><text x="${W - padX}" y="${mid - 4}" text-anchor="end" font-size="8.5" fill="rgba(255,225,205,0.9)">0 · 전환선</text>`;
  const tx = X(b.todayIndex).toFixed(1);
  const todayLine = `<line x1="${tx}" y1="2" x2="${tx}" y2="${H - botPad}" stroke="rgba(255,195,209,0.7)" stroke-width="1" stroke-dasharray="2 4"/>`;
  let labels = "";
  b.xdates.forEach((d) => { if (d.i % 5 === 0 || d.isToday) labels += `<text x="${X(d.i).toFixed(1)}" y="${H - 3}" text-anchor="middle" font-size="9" font-weight="${d.isToday ? "700" : "400"}" fill="${d.isToday ? "#ffd9c2" : "#e8c6d6"}">${d.isToday ? "오늘" : d.day}</text>`; });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="바이오리듬 곡선">`
    + `<defs><filter id="bioGlow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="0" stdDeviation="2.2" flood-color="#5a2a50" flood-opacity="0.35"/></filter></defs>`
    + `${grid}${zero}${todayLine}`
    + curve(b.series.intellectual, "#ffd39a") + curve(b.series.emotional, "#dcb6ff") + curve(b.series.physical, "#ffa3b5")
    + dot(b.series.intellectual, "#ffd39a") + dot(b.series.emotional, "#dcb6ff") + dot(b.series.physical, "#ffa3b5")
    + `${labels}</svg>`;
}

/* ---------------- 운세 캘린더 (월별 날짜 점수) ---------------- */
const GROUP_BASE = { 비견: 58, 겁재: 55, 식신: 70, 상관: 66, 정재: 74, 편재: 70, 정관: 64, 편관: 60, 정인: 68, 편인: 64 };
const p2 = (n) => String(n).padStart(2, "0");
export function monthScores(profile, year, month) {
  const dim = new Date(year, month, 0).getDate();
  const myStem = profile.pillars.day.stemIdx;
  const out = [];
  for (let d = 1; d <= dim; d++) {
    const t = computeSaju({ calendarType: "solar", birthDate: `${year}-${p2(month)}-${p2(d)}`, birthTime: "12:00", timeUnknown: true, gender: "male", timezone: "Asia/Seoul" });
    const god = tenGod(myStem, t.pillars.day.stemIdx);
    const base = GROUP_BASE[god] || 60;
    const j = hashN((profile.pillars.day.gz || "") + year + month + d) % 16 - 8;
    out.push({ day: d, score: clampS(base + j), iljin: t.pillars.day.gz, god });
  }
  return out;
}

/* ---------------- 택일 (좋은 날 잡기) ---------------- */
const TG_STEM_E = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
function tenGodT(ds, ts) { // 십신 그룹 (일간 기준)
  const a = TG_STEM_E[ds], b = TG_STEM_E[ts], d = (b - a + 5) % 5;
  return ["비겁", "식상", "재성", "관성", "인성"][d];
}
export const TAEGIL_PURPOSES = [
  { id: "meet", name: "약속·만남", good: [0, 3, 6, 9], tip: "편안하고 즐거운 만남·모임에 좋은 날이에요." },
  { id: "date", name: "데이트·고백", good: [3, 9, 6, 5], tip: "설렘과 끌림이 커지는 날이에요. 데이트·소개팅·고백하기 좋아요." },
  { id: "move", name: "이사", good: [2, 8, 5, 11], tip: "이동·새 출발에 힘이 실리는 날이에요." },
  { id: "contract", name: "계약·서명", good: [4, 10, 1, 7], tip: "안정적으로 도장 찍기 좋은 날이에요." },
  { id: "open", name: "개업·오픈", good: [2, 6, 10], tip: "재물·번영의 기운이 도는 날이에요." },
  { id: "travel", name: "여행", good: [2, 8, 5, 11], tip: "길 위에서 운이 트이는 날이에요." },
  { id: "exam", name: "시험·면접", good: [], godW: { 인성: 12, 관성: 10, 식상: 6, 비겁: -2, 재성: -6 }, tip: "공부한 만큼 실력이 나오고 평가가 후한 날이에요. 시험·면접·자격증·발표에 좋아요." },
  { id: "doc", name: "서류·발표", good: [], godW: { 인성: 10, 식상: 9, 관성: 6, 재성: 0, 비겁: -3 }, tip: "말과 글이 잘 통하는 날이에요. 서류 제출·발표·지원서에 좋아요." },
];

/* 택일 이유 — 점수에 들어간 것들을 쉬운 말로 (+ 좋음 / - 아쉬움) */
const TB_H = "子丑寅卯辰巳午未申酉戌亥", TB_K = "자축인묘진사오미신유술해";
const bn = (i) => `${TB_H[i]}(${TB_K[i]})`;
const GOD_WHY = {
  인성: "배움·문서·도움을 받는 기운(인성)",
  관성: "평가·책임·명예의 기운(관성)",
  식상: "말·표현·아이디어의 기운(식상)",
  재성: "결과·돈·현실 감각의 기운(재성)",
  비겁: "경쟁·고집·내 힘으로 밀어붙이는 기운(비겁)",
};
function taegilWhy(P, myB, b, myStem, dStem) {
  const w = [];
  if (inP(HAP6, myB, b)) w.push({ g: 1, t: `내 일지 ${bn(myB)}와 이날 ${bn(b)}가 육합(六合)해요 — 사람·일이 서로 맞물리는 날` });
  else if (SAMHAP.some((g) => g.includes(myB) && g.includes(b)) && myB !== b) w.push({ g: 1, t: `내 일지 ${bn(myB)}와 이날 ${bn(b)}가 삼합(三合) 짝이에요 — 힘을 모아 주는 날` });
  else if (Math.abs(myB - b) === 6) w.push({ g: -1, t: `내 일지 ${bn(myB)}와 이날 ${bn(b)}가 충(沖)이에요 — 부딪힘·변동·예정이 틀어지기 쉬운 날` });
  else if (inP(HAE, myB, b)) w.push({ g: -1, t: `내 일지 ${bn(myB)}와 이날 ${bn(b)}가 해(害)예요 — 사소한 오해·서운함이 생기기 쉬운 날` });
  if (P.good.includes(b)) w.push({ g: 1, t: `${bn(b)}일은 '${P.name}'에 잘 맞는 날의 기운이에요` });
  if (P.godW) {
    const g = tenGodT(myStem, dStem), v = P.godW[g] || 0;
    if (v > 0) w.push({ g: 1, t: `이날은 나에게 ${GOD_WHY[g]}이 들어와 '${P.name}'에 유리해요` });
    else if (v < 0) w.push({ g: -1, t: `이날은 나에게 ${GOD_WHY[g]}이 강해 '${P.name}'에는 집중이 흐트러지기 쉬워요` });
  }
  if (!w.length) w.push({ g: 0, t: `내 일지 ${bn(myB)}와 이날 ${bn(b)} 사이에 특별히 돕거나 부딪히는 관계가 없어 무난한 날이에요` });
  return w;
}
export function taegilMonth(profile, year, month, purposeId) {
  const P = TAEGIL_PURPOSES.find((x) => x.id === purposeId) || TAEGIL_PURPOSES[0];
  const myB = profile.pillars.day.branchIdx;
  const dim = new Date(year, month, 0).getDate();
  const days = [];
  for (let d = 1; d <= dim; d++) {
    const t = computeSaju({ calendarType: "solar", birthDate: `${year}-${p2(month)}-${p2(d)}`, birthTime: "12:00", timeUnknown: true, gender: "male", timezone: "Asia/Seoul" });
    const b = t.pillars.day.branchIdx;
    let s = 52;
    if (inP(HAP6, myB, b)) s += 14; else if (SAMHAP.some((g) => g.includes(myB) && g.includes(b)) && myB !== b) s += 12;
    else if (Math.abs(myB - b) === 6) s -= 16; else if (inP(HAE, myB, b)) s -= 8;
    if (P.good.includes(b)) s += 12;
    if (P.godW) { const g = tenGodT(profile.pillars.day.stemIdx, t.pillars.day.stemIdx); s += P.godW[g] || 0; }
    s += hashN(profile.pillars.day.gz + year + month + d + purposeId) % 10 - 5;
    days.push({ day: d, score: clampS(s), iljin: t.pillars.day.gz, why: taegilWhy(P, myB, b, profile.pillars.day.stemIdx, t.pillars.day.stemIdx) });
  }
  const sorted = [...days].sort((a, b) => b.score - a.score);
  return { purpose: P, tip: P.tip, days, best: sorted.slice(0, 5).sort((a, b) => a.day - b.day), caution: sorted.slice(-3).sort((a, b) => a.day - b.day) };
}

/* ---------------- 별자리 상세 (설화·성향·연애·조언·별 모양) ---------------- */
// pts: 별 위치(0~100), ln: 이은 선, big: 밝은 별 index — 모양은 알아보기 쉽게 단순화
export const SIGN_DETAIL = {
  양자리: { sym: "♈", en: "Aries", el: "불", ruler: "화성", color: "#ff9a8a", stone: "다이아몬드", lucky: "빨강 · 화요일",
    pts: [[12, 62], [44, 44], [68, 38], [86, 46]], ln: [[0, 1], [1, 2], [2, 3]], big: [2],
    myth: "구름의 여신 네펠레가 위험에 빠진 두 아이를 구하려고 보낸 황금 털의 숫양이에요. 숫양은 아이들을 등에 태우고 바다를 건넜고, 그 용기를 기려 하늘의 별이 되었다고 해요.",
    traits: ["생각보다 몸이 먼저 나가는 행동파", "새로 시작하는 일에 가장 먼저 손을 드는 개척자", "솔직하고 뒤끝이 없어요", "지루함과 기다림이 제일 힘들어요"],
    love: "좋으면 바로 표현하는 직진형이에요. 밀당보다 확실한 답을 좋아하고, 함께 새로운 걸 해 보는 데이트에서 마음이 커져요. 다만 식는 속도도 빠를 수 있어 ‘설렘 이후’를 같이 만들어 갈 상대가 잘 맞아요.",
    match: ["사자자리", "사수자리", "쌍둥이자리"], advice: "시작한 일의 ‘마무리 체크리스트’를 하나 만들어 두세요. 끝까지 해낸 경험이 쌓일수록 당신의 추진력은 진짜 무기가 돼요." },
  황소자리: { sym: "♉", en: "Taurus", el: "흙", ruler: "금성", color: "#a8d8a0", stone: "에메랄드", lucky: "초록 · 금요일",
    pts: [[10, 18], [38, 46], [50, 56], [62, 46], [90, 20], [50, 80]], ln: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5]], big: [2],
    myth: "제우스가 공주 에우로페에게 반해 눈부신 하얀 황소로 변했어요. 황소는 공주를 태우고 바다를 건너 크레타섬에 닿았고, 그 모습이 하늘에 새겨졌다고 전해져요.",
    traits: ["한번 정하면 끝까지 가는 뚝심", "맛·향·촉감 같은 감각이 예민한 미식가", "돈과 생활을 안정적으로 꾸리는 현실 감각", "변화엔 시간이 필요해요"],
    love: "천천히 마음을 열지만, 한번 열면 오래 가는 사랑을 해요. 말보다 맛있는 밥·선물·함께하는 일상으로 사랑을 표현해요. 갑작스러운 변화나 불안한 상대는 힘들어요.",
    match: ["처녀자리", "염소자리", "게자리"], advice: "‘익숙한 것’ 하나를 이번 달에 바꿔 보세요. 새 길 하나가 고집을 감각으로 바꿔 줘요." },
  쌍둥이자리: { sym: "♊", en: "Gemini", el: "공기", ruler: "수성", color: "#ffe38a", stone: "아게이트", lucky: "노랑 · 수요일",
    pts: [[25, 10], [20, 40], [18, 70], [10, 92], [60, 12], [62, 42], [66, 72], [76, 92]], ln: [[0, 1], [1, 2], [2, 3], [4, 5], [5, 6], [6, 7], [0, 4]], big: [0, 4],
    myth: "쌍둥이 형제 카스토르와 폴룩스는 늘 함께였어요. 형이 세상을 떠나자 동생은 자신의 영원한 생명을 나눠 형과 함께하길 바랐고, 그렇게 둘은 나란히 빛나는 별이 되었어요.",
    traits: ["궁금한 게 많고 배우는 속도가 빨라요", "말과 글로 사람을 사로잡는 재치", "여러 일을 동시에 굴리는 멀티 플레이어", "마음이 자주 바뀐다는 오해를 받아요"],
    love: "대화가 통해야 사랑이 시작돼요. 같이 수다 떨고 웃기는 사람에게 끌리고, 너무 무거운 관계엔 숨이 막혀요. 친구 같은 연인이 최고예요.",
    match: ["천칭자리", "물병자리", "양자리"], advice: "하루 한 가지만 ‘끝까지’ 해 보는 연습을 해 보세요. 넓은 관심이 깊이를 만나면 따라올 사람이 없어요." },
  게자리: { sym: "♋", en: "Cancer", el: "물", ruler: "달", color: "#c8d8ff", stone: "진주", lucky: "은색 · 월요일",
    pts: [[50, 50], [50, 14], [20, 80], [82, 82], [50, 34]], ln: [[1, 4], [4, 0], [0, 2], [0, 3]], big: [0],
    myth: "영웅 헤라클레스가 괴물 히드라와 싸울 때, 헤라 여신이 보낸 작은 게가 그의 발을 물며 맞섰어요. 작지만 끝까지 용감했던 게를 헤라가 하늘에 올려 주었다고 해요.",
    traits: ["내 사람은 끝까지 챙기는 보호자", "분위기와 감정을 빨리 알아채요", "집·가족·추억을 소중히 해요", "상처를 오래 품는 편이에요"],
    love: "편안하고 안전하다고 느껴야 마음을 열어요. 한번 사랑하면 엄마처럼 챙겨 주는 헌신형이에요. 서운함을 말 대신 표정으로 보여 주니, 말로 꺼내는 연습이 필요해요.",
    match: ["전갈자리", "물고기자리", "황소자리"], advice: "남을 챙기는 만큼 나를 챙기는 시간을 달력에 먼저 적어 두세요. 내가 편해야 사랑도 오래 가요." },
  사자자리: { sym: "♌", en: "Leo", el: "불", ruler: "태양", color: "#ffc070", stone: "루비", lucky: "금색 · 일요일",
    pts: [[30, 20], [18, 30], [22, 46], [36, 52], [40, 36], [70, 58], [88, 76], [62, 80]], ln: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [3, 5], [5, 6], [6, 7], [7, 3]], big: [3],
    myth: "네메아 숲에 화살도 뚫지 못하는 사자가 살았어요. 헤라클레스가 맨손으로 사자를 이겨 내고, 그 위엄을 기억하려 하늘에 사자를 그려 넣었다고 전해져요.",
    traits: ["어디서든 존재감이 빛나는 주인공", "의리 있고 통이 커요", "칭찬을 받으면 두 배로 해내요", "자존심이 상하면 크게 상처받아요"],
    love: "사랑도 화끈하고 로맨틱하게! 이벤트와 표현을 아끼지 않아요. 나를 자랑스러워해 주는 사람, 진심으로 박수 쳐 주는 사람에게 깊이 빠져요.",
    match: ["양자리", "사수자리", "천칭자리"], advice: "무대 밖의 사람에게도 주인공 자리를 내어 주세요. 함께 빛날 때 당신의 빛은 더 오래 가요." },
  처녀자리: { sym: "♍", en: "Virgo", el: "흙", ruler: "수성", color: "#c9e6c0", stone: "사파이어", lucky: "베이지 · 수요일",
    pts: [[10, 20], [28, 34], [44, 40], [60, 34], [78, 22], [46, 62], [36, 86], [70, 80]], ln: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [5, 6], [5, 7]], big: [6],
    myth: "곡식의 여신 데메테르의 딸, 혹은 정의의 여신 아스트라이아라고 해요. 사람들이 다투기 시작하자 마지막까지 땅에 남아 있다가 하늘로 올라가 밀 이삭을 든 별이 되었대요.",
    traits: ["디테일을 놓치지 않는 꼼꼼함", "누군가를 실질적으로 돕는 걸 좋아해요", "계획과 정리가 마음을 편하게 해요", "나에게 너무 엄격해요"],
    love: "말보다 행동으로 챙기는 현실 연애형이에요. 상대의 작은 습관까지 기억해 줘요. 다만 잔소리처럼 들리지 않게 ‘고마워’를 먼저 건네면 사랑이 더 부드러워져요.",
    match: ["황소자리", "염소자리", "게자리"], advice: "80점이면 충분해요. 완벽하지 않은 채로 내놓는 용기가 기회를 두 배로 만들어 줘요." },
  천칭자리: { sym: "♎", en: "Libra", el: "공기", ruler: "금성", color: "#f7c6dc", stone: "오팔", lucky: "분홍 · 금요일",
    pts: [[50, 12], [22, 42], [78, 42], [28, 78], [72, 78]], ln: [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4]], big: [0],
    myth: "정의의 여신 아스트라이아가 들고 있던 저울이에요. 옳고 그름을 공평하게 재던 저울이 여신과 함께 하늘로 올라가, 처녀자리 곁에서 빛나고 있다고 해요.",
    traits: ["어느 쪽도 다치지 않게 균형을 잡아요", "예쁜 것을 알아보는 미적 감각", "매너와 분위기 메이커", "결정을 내리기 어려워해요"],
    love: "배려와 매너가 있는 로맨스를 좋아해요. 다툼을 싫어해 맞춰 주다가 지칠 때가 있어요. ‘나는 이게 좋아’라고 말하는 순간 관계가 더 단단해져요.",
    match: ["쌍둥이자리", "물병자리", "사자자리"], advice: "고민을 3분 타이머 안에 끝내 보세요. 완벽한 선택보다 내가 고른 선택이 운을 끌어와요." },
  전갈자리: { sym: "♏", en: "Scorpio", el: "물", ruler: "명왕성·화성", color: "#d6a8e8", stone: "토파즈", lucky: "버건디 · 화요일",
    pts: [[8, 20], [16, 32], [10, 46], [30, 40], [46, 48], [56, 62], [60, 78], [74, 88], [88, 80], [92, 66]], ln: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9]], big: [3],
    myth: "자신이 세상 최고의 사냥꾼이라 뽐내던 오리온을 막으려고 대지의 여신이 보낸 전갈이에요. 그래서 지금도 전갈자리가 떠오르면 오리온자리는 반대편으로 숨는다고 해요.",
    traits: ["한번 꽂히면 끝까지 파고드는 집중력", "사람 속마음을 꿰뚫는 통찰", "겉은 차분해도 속은 뜨거워요", "믿기까지 시간이 오래 걸려요"],
    love: "가볍게 시작하지 않지만, 시작하면 온 마음을 다하는 진한 사랑을 해요. 비밀과 신뢰가 가장 중요하고, 한번 배신당하면 다시 문을 열기 어려워요.",
    match: ["게자리", "물고기자리", "처녀자리"], advice: "마음속 의심을 혼자 키우기 전에 한 번 물어보세요. 확인하는 대화가 당신의 깊은 사랑을 지켜 줘요." },
  사수자리: { sym: "♐", en: "Sagittarius", el: "불", ruler: "목성", color: "#b9a8ff", stone: "터키석", lucky: "보라 · 목요일",
    pts: [[20, 60], [36, 50], [50, 56], [44, 74], [28, 76], [60, 36], [72, 20], [80, 48]], ln: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [2, 5], [5, 6], [5, 7]], big: [2],
    myth: "반은 사람, 반은 말인 켄타우로스 중 가장 지혜로운 스승 케이론이에요. 수많은 영웅을 가르친 그가 활을 겨눈 모습으로 하늘에 남았다고 전해져요.",
    traits: ["새로운 곳·생각을 찾아 떠나는 모험가", "웃음과 긍정 에너지가 넘쳐요", "솔직함이 매력이자 가끔은 화살", "구속받으면 답답해해요"],
    love: "함께 여행하고 배우며 자라는 연애를 꿈꿔요. 서로의 자유를 존중해 주는 사람과 오래 가요. 너무 많은 확인과 간섭엔 멀어지기 쉬워요.",
    match: ["양자리", "사자자리", "물병자리"], advice: "큰 계획 하나를 ‘이번 주에 할 작은 행동’으로 쪼개 보세요. 화살은 과녁을 정했을 때 가장 멀리 날아가요." },
  염소자리: { sym: "♑", en: "Capricorn", el: "흙", ruler: "토성", color: "#c8bca8", stone: "가넷", lucky: "갈색 · 토요일",
    pts: [[12, 26], [30, 40], [52, 64], [74, 70], [90, 42], [62, 36]], ln: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]], big: [4],
    myth: "목신 판이 괴물을 피해 강으로 뛰어들다, 물에 잠긴 아랫몸은 물고기 꼬리로, 윗몸은 염소로 변해 버렸어요. 그 재치 있는 모습을 제우스가 하늘에 새겨 주었대요.",
    traits: ["목표를 정하면 한 계단씩 오르는 인내", "책임감이 강해 믿고 맡기는 사람", "현실적인 판단과 계획", "쉬는 법을 잘 몰라요"],
    love: "진지하고 책임감 있는 사랑을 해요. 처음엔 무뚝뚝해 보여도 미래를 함께 그리는 사람에겐 누구보다 든든해요. 일보다 사랑을 앞에 두는 날을 가끔 만들어 주세요.",
    match: ["황소자리", "처녀자리", "전갈자리"], advice: "‘오늘 잘한 일 3개’를 적고 자 보세요. 쉼표가 있어야 정상까지 오래 올라가요." },
  물병자리: { sym: "♒", en: "Aquarius", el: "공기", ruler: "천왕성·토성", color: "#9fd6f2", stone: "자수정", lucky: "하늘색 · 토요일",
    pts: [[14, 20], [32, 26], [50, 18], [60, 38], [44, 56], [58, 74], [76, 66], [86, 84]], ln: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]], big: [2],
    myth: "아름다운 소년 가니메데스가 신들의 연회에서 물과 술을 따르는 일을 맡게 되었어요. 물병에서 쏟아지는 물줄기가 별이 되어 하늘을 적신다고 해요.",
    traits: ["남들과 다른 생각을 하는 아이디어 뱅크", "모두에게 공평한 친구", "자유와 개성을 중요하게 여겨요", "감정 표현이 담백한 편이에요"],
    love: "친구에서 연인으로 이어지는 연애가 많아요. 대화가 통하고 서로의 세계를 존중해 주는 관계가 좋아요. 너무 감정적인 몰아붙임에는 거리를 두기도 해요.",
    match: ["쌍둥이자리", "천칭자리", "사수자리"], advice: "머릿속 아이디어 하나를 이번 주에 세상에 꺼내 보세요. 작게라도 실행할 때 당신의 별이 반짝여요." },
  물고기자리: { sym: "♓", en: "Pisces", el: "물", ruler: "해왕성·목성", color: "#a8e0d8", stone: "아쿠아마린", lucky: "바다색 · 목요일",
    pts: [[10, 30], [22, 22], [26, 36], [40, 52], [56, 68], [70, 80], [82, 70], [90, 56], [80, 46]], ln: [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 6]], big: [5],
    myth: "아프로디테와 아들 에로스가 괴물 티폰을 피해 물고기로 변해 강으로 뛰어들었어요. 서로를 잃지 않으려 리본으로 꼬리를 묶은 두 물고기가 그대로 별이 되었대요.",
    traits: ["상대의 아픔에 함께 우는 공감력", "상상력과 예술 감각이 풍부해요", "직감이 잘 맞아요", "현실의 경계가 흐려질 때가 있어요"],
    love: "영화 같은 낭만적인 사랑을 꿈꾸고, 사랑하면 모든 걸 내어 주는 헌신형이에요. 나를 지켜 줄 줄 아는 사람, 감정을 소중히 다뤄 주는 사람과 잘 맞아요.",
    match: ["게자리", "전갈자리", "염소자리"], advice: "‘아니요’라고 말해도 사랑받을 수 있어요. 경계를 지킬수록 당신의 다정함은 더 오래 빛나요." },
};
export function signSvg(name) {
  const d = SIGN_DETAIL[name]; if (!d) return "";
  const P = d.pts.map(([x, y]) => [20 + x * 2.6, 14 + y * 1.6]);
  const bg = Array.from({ length: 26 }, (_, i) => { const x = (i * 97 + 31) % 300, y = (i * 53 + 17) % 190; return `<circle cx="${x}" cy="${y}" r="${(i % 3) * .35 + .5}" fill="#fff" opacity="${.18 + (i % 4) * .08}"/>`; }).join("");
  const ln = d.ln.map(([a, b]) => `<line x1="${P[a][0]}" y1="${P[a][1]}" x2="${P[b][0]}" y2="${P[b][1]}" stroke="${d.color}" stroke-opacity=".55" stroke-width="1.4"/>`).join("");
  const st = P.map(([x, y], i) => { const big = d.big.includes(i); return `<circle cx="${x}" cy="${y}" r="${big ? 9 : 6}" fill="${d.color}" opacity=".22"/><circle cx="${x}" cy="${y}" r="${big ? 3.6 : 2.4}" fill="#fff"/>`; }).join("");
  return `<svg viewBox="0 0 300 190" role="img" aria-label="${name} 별자리 모양" class="star-svg"><defs><radialGradient id="sg" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#3b2550"/><stop offset="1" stop-color="#1e1430"/></radialGradient></defs><rect width="300" height="190" rx="18" fill="url(#sg)"/>${bg}${ln}${st}<text x="282" y="178" text-anchor="end" font-size="40" fill="${d.color}" opacity=".35">${d.sym}</text></svg>`;
}
