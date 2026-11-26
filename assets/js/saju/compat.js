/* =========================================================
   궁합 분석 — 두 사람의 사주(일간 오행 + 오행 분포)로 '성향 조화도'를 본다.
   원칙: 운명적 길흉 판정이 아니라, 두 사람의 성향이 어떻게 맞물리고
   어디서 부딪히는지 현실적으로 설명한다. 좋은 관계에도 마찰 지점을,
   자극적인(극) 관계에도 강점을 함께 제시한다.
   ========================================================= */

/* (합침) ./relationship.js 에서 가져오던 것 — 이제 같은 파일 */

const GEN = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" }; // X가 생하는 것
const CTRL = { wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" }; // X가 극하는 것
const ELEM_KR = { wood: "목(木)", fire: "화(火)", earth: "토(土)", metal: "금(金)", water: "수(水)" };
const ELEM_TRAIT = { wood: "성장·추진", fire: "표현·열정", earth: "안정·포용", metal: "원칙·결단", water: "사고·유연" };

/** 받침 여부 */
function hasBatchim(name) {
  if (!name) return false;
  const c = name.charCodeAt(name.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return false; // 한글 음절 아니면 false
  return (c - 0xac00) % 28 !== 0;
}
/** 이름 뒤 조사를 받침에 맞게 교정 (정확히 이름+조사 경계만) */
function fixParticles(text, name) {
  if (!name) return text;
  const b = hasBatchim(name);
  const pairs = b
    ? [["가", "이"], ["를", "을"], ["는", "은"], ["와", "과"]]
    : [["이", "가"], ["을", "를"], ["은", "는"], ["과", "와"]];
  let out = text;
  for (const [wrong, right] of pairs) {
    out = out.split(name + wrong).join(name + right);
  }
  return out;
}
function fixAll(content, labels) {
  const fix = (s) => fixParticles(fixParticles(s, labels.a), labels.b);
  const fixArr = (arr) => arr.map(fix);
  return {
    title: fix(content.title), summary: fix(content.summary),
    good: fixArr(content.good), friction: fixArr(content.friction), advice: fixArr(content.advice),
  };
}

export function analyzeCompat(a, b, labels = { a: "A", b: "B" }) {
  const ea = a.dayMasterElem, eb = b.dayMasterElem;
  const rel = relationType(ea, eb);
  const content = fixAll(RELATION[rel.type](labels, ea, eb, rel), labels);
  const harmony = harmonyBetween(a, b, labels); // 합·충 궁합

  // 오행 보완도: 두 명식의 오행을 합쳐 얼마나 고르게 채워지는지
  const combined = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  for (const k of Object.keys(combined)) combined[k] = (a.elementCounts[k] || 0) + (b.elementCounts[k] || 0);
  const vals = Object.values(combined);
  const mean = vals.reduce((x, y) => x + y, 0) / 5;
  const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / 5;
  const missing = Object.entries(combined).filter(([, v]) => v === 0).map(([k]) => ELEM_KR[k]);
  const balanceScore = Math.max(0, 100 - variance * 9); // 고를수록 높음

  // 보완: 한쪽의 약한 오행을 다른 쪽이 채워주는가
  const compNote = complementNote(a, b, labels);

  // 성향 조화 강도(운명 판정 아님)
  let score = Math.round(rel.base * 0.62 + balanceScore * 0.38 + compNote.bonus);
  score = Math.max(38, Math.min(93, score));

  return {
    type: rel.type,
    aElem: ea, bElem: eb,
    aElemKr: ELEM_KR[ea], bElemKr: ELEM_KR[eb],
    score,
    title: content.title,
    summary: content.summary,
    good: content.good,
    friction: content.friction,
    advice: content.advice,
    combined, missing,
    complement: fixParticles(fixParticles(compNote.text, labels.a), labels.b),
    dayMasters: { a: a.dayMaster, b: b.dayMaster },
    harmony,
  };
}

function relationType(ea, eb) {
  if (ea === eb) return { type: "same", base: 74 };
  if (GEN[ea] === eb) return { type: "a_gen_b", base: 84 };
  if (GEN[eb] === ea) return { type: "b_gen_a", base: 84 };
  if (CTRL[ea] === eb) return { type: "a_ctrl_b", base: 62 };
  if (CTRL[eb] === ea) return { type: "b_ctrl_a", base: 62 };
  return { type: "same", base: 70 };
}

function complementNote(a, b, L) {
  const weakA = Object.entries(a.elementCounts).sort((x, y) => x[1] - y[1])[0];
  const weakB = Object.entries(b.elementCounts).sort((x, y) => x[1] - y[1])[0];
  const strongOtherForA = (b.elementCounts[weakA[0]] || 0) >= 2;
  const strongOtherForB = (a.elementCounts[weakB[0]] || 0) >= 2;
  let bonus = 0;
  const parts = [];
  if (strongOtherForA) { bonus += 3; parts.push(`${L.a}에게 부족한 ${ELEM_KR[weakA[0]]} 기운을 ${L.b}가 넉넉히 지녀 서로를 채워줍니다.`); }
  if (strongOtherForB) { bonus += 3; parts.push(`${L.b}에게 부족한 ${ELEM_KR[weakB[0]]} 기운을 ${L.a}가 보완해 줍니다.`); }
  if (!parts.length) parts.push("두 사람은 비슷한 오행 구성을 가져, 잘 통하는 만큼 같은 부분에서 함께 약해질 수 있습니다.");
  return { bonus, text: parts.join(" ") };
}

/* 관계 유형별 서술 (균형 잡힌 톤) */
const RELATION = {
  same: (L, ea) => ({
    title: "닮은 결 — 비화(比和) 관계",
    summary: `두 사람 모두 ${ELEM_KR[ea]}(${ELEM_TRAIT[ea]}) 기운이 중심이라, 말이 잘 통하고 가치관이 비슷합니다. 편안한 만큼, 닮은 단점이 함께 커지는 관계이기도 합니다.`,
    good: [
      "감정과 속도의 결이 비슷해, 설명하지 않아도 통하는 편안함이 있습니다.",
      "같은 것을 중요하게 여겨, 큰 방향에서 부딪힐 일이 적습니다.",
    ],
    friction: [
      "둘 다 잘하는 영역이 겹쳐, 정작 서로 채워줘야 할 부분이 비게 됩니다.",
      "같은 약점을 공유해, 한 사람이 무너질 때 함께 흔들리기 쉽습니다.",
      "비슷해서 경쟁심이 생기거나, ‘내가 맞다’로 부딪힐 수 있습니다.",
    ],
    advice: [
      "역할을 일부러 나누세요. 둘 다 피하는 일을 누가 맡을지 미리 정해 두면 좋습니다.",
      "닮은 점보다 서로 다른 점을 대화 주제로 삼아 관계에 폭을 더하세요.",
    ],
  }),
  a_gen_b: (L, ea, eb) => ({
    title: `${L.a}가 ${L.b}를 북돋는 — 상생(相生) 관계`,
    summary: `${L.a}의 ${ELEM_KR[ea]} 기운이 ${L.b}의 ${ELEM_KR[eb]} 기운을 살려주는 흐름입니다. ${L.a}가 먼저 베풀고 ${L.b}가 피어나는, 자연스러운 지지 관계입니다.`,
    good: [
      `${L.a}는 ${L.b}의 가능성을 끌어내고, ${L.b}는 그 지지 속에서 편안하게 자기 색을 냅니다.`,
      "한쪽이 방향을 주고 한쪽이 실현하는, 역할이 잘 맞물리는 조합입니다.",
    ],
    friction: [
      `베풂이 한쪽으로만 흐르면, ${L.a}가 ‘나만 준다’고 느껴 지칠 수 있습니다.`,
      `${L.b}가 지지에 익숙해져 스스로 결정하기를 미룰 수 있습니다.`,
    ],
    advice: [
      `${L.b}도 ${L.a}에게 돌려주는 방식을 찾으세요. 고마움을 말로 표현하는 것부터가 균형의 시작입니다.`,
      `${L.a}는 다 챙기려 하지 말고, ${L.b}가 스스로 할 몫을 남겨 두세요.`,
    ],
  }),
  b_gen_a: (L, ea, eb) => ({
    title: `${L.b}가 ${L.a}를 북돋는 — 상생(相生) 관계`,
    summary: `${L.b}의 ${ELEM_KR[eb]} 기운이 ${L.a}의 ${ELEM_KR[ea]} 기운을 살려주는 흐름입니다. ${L.b}가 먼저 베풀고 ${L.a}가 피어나는 지지 관계입니다.`,
    good: [
      `${L.b}는 ${L.a}의 가능성을 끌어내고, ${L.a}는 그 안에서 편안하게 자기 색을 냅니다.`,
      "한쪽이 힘을 주고 한쪽이 실현하는, 서로 기대기 좋은 조합입니다.",
    ],
    friction: [
      `${L.b}가 ‘나만 베푼다’고 느끼면 서운함이 쌓일 수 있습니다.`,
      `${L.a}가 받는 데 익숙해져 스스로 결정을 미룰 수 있습니다.`,
    ],
    advice: [
      `${L.a}도 ${L.b}에게 돌려주는 방식을 찾으세요. 표현과 인정이 균형의 시작입니다.`,
      `${L.b}는 다 짊어지지 말고, ${L.a}의 몫을 남겨 두세요.`,
    ],
  }),
  a_ctrl_b: (L, ea, eb) => ({
    title: `자극과 긴장이 있는 — 상극(相剋) 관계`,
    summary: `${L.a}의 ${ELEM_KR[ea]} 기운이 ${L.b}의 ${ELEM_KR[eb]} 기운을 누르는 흐름입니다. 극(剋)은 나쁜 것이 아니라 서로를 다듬는 자극입니다. 잘 쓰면 성장, 못 쓰면 소모가 됩니다.`,
    good: [
      `${L.a}는 ${L.b}가 흐트러질 때 기준을 잡아주고, 긴장감이 관계에 생기를 줍니다.`,
      "서로 다르기에, 상대에게서 자신에게 없는 것을 배울 수 있습니다.",
    ],
    friction: [
      `${L.a}의 방식이 강해지면 ${L.b}가 눌린다고 느껴 위축되거나 반발할 수 있습니다.`,
      "옳고 그름을 가리다 감정이 상하기 쉽고, 사소한 일이 기싸움이 됩니다.",
    ],
    advice: [
      `${L.a}는 바로잡기 전에 ${L.b}의 입장을 먼저 인정하는 한마디를 붙이세요.`,
      "서로의 방식이 ‘틀린 것’이 아니라 ‘다른 것’임을 전제로 대화하세요.",
    ],
  }),
  b_ctrl_a: (L, ea, eb) => ({
    title: `자극과 긴장이 있는 — 상극(相剋) 관계`,
    summary: `${L.b}의 ${ELEM_KR[eb]} 기운이 ${L.a}의 ${ELEM_KR[ea]} 기운을 누르는 흐름입니다. 극(剋)은 서로를 다듬는 자극입니다. 잘 쓰면 성장, 못 쓰면 소모가 됩니다.`,
    good: [
      `${L.b}는 ${L.a}가 흐트러질 때 중심을 잡아주고, 적당한 긴장이 관계에 활력을 줍니다.`,
      "다른 방식을 가진 만큼, 서로에게서 부족한 면을 배울 수 있습니다.",
    ],
    friction: [
      `${L.b}의 방식이 강해지면 ${L.a}가 눌린다고 느껴 위축되거나 반발할 수 있습니다.`,
      "누가 맞는지 따지다 감정이 상하고, 작은 일이 기싸움으로 번질 수 있습니다.",
    ],
    advice: [
      `${L.b}는 지적보다 인정을 먼저 건네세요. 상대가 방어를 풀어야 대화가 됩니다.`,
      "서로의 차이를 우열이 아니라 역할 분담으로 바꿔 보세요.",
    ],
  }),
};

/* ===================================================================
   (합침) relationship.js — 파일 수를 줄이려고 이 파일 안으로 옮김 (HAE)
   =================================================================== */
/* =========================================================
   연애·관계 타이밍 분석.
   사귄 날/헤어진 날의 '운(대운·세운)'을 본인 일간과 대조해 십신으로
   그 시기의 기운을 읽는다. 배우자성(남=재성, 여=관성)의 상태로
   만남·이별의 흐름과 재회 가능성을 추론한다.
   원칙: 상대·본인 탓으로 단정하지 않고 '그 시기의 기운'으로 설명.
   확정 예언 금지, 재회는 운보다 두 사람의 선택이 크다는 점을 명시.
   ========================================================= */

import { computeSaju } from "./manse.js";
import { tenGod } from "./fortune.js";

const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const SPOUSE = { male: ["정재", "편재"], female: ["정관", "편관"] };
const GROUP = {
  비견: "비겁", 겁재: "비겁", 식신: "식상", 상관: "식상",
  정재: "재성", 편재: "재성", 정관: "관성", 편관: "관성", 정인: "인성", 편인: "인성",
};

/** 특정 날짜의 세운(년)·일진 십신 + 그때의 대운 */
function dateEnergy(profile, dateStr) {
  const dIdx = profile.pillars.day.stemIdx;
  const tz = "Asia/Seoul";
  const d = computeSaju({ calendarType: "solar", birthDate: dateStr, birthTime: "12:00", timeUnknown: true, gender: "male", timezone: tz });
  const yearGod = tenGod(dIdx, d.pillars.year.stemIdx);
  const dayGod = tenGod(dIdx, d.pillars.day.stemIdx);
  // 그 시점의 대운
  const age = d.saJuYear - (profile.solar ? profile.solar.Y : d.saJuYear);
  let daeunGod = null, daeunGz = null;
  const list = (profile.daeun && profile.daeun.list) || [];
  for (const du of list) {
    if (age >= du.age && age < du.age + 10) {
      const sIdx = du.stemIdx != null ? du.stemIdx : STEMS.indexOf(du.gz[0]);
      daeunGod = tenGod(dIdx, sIdx); daeunGz = du.gz; break;
    }
  }
  return { yearGZ: d.pillars.year.gz, yearGod, dayGod, daeunGod, daeunGz, year: d.saJuYear };
}

/** 만남 분석 */
export function analyzeStart(profile, dateStr, gender) {
  const e = dateEnergy(profile, dateStr);
  const spouse = SPOUSE[gender] || SPOUSE.female;
  const gods = [e.yearGod, e.daeunGod].filter(Boolean);
  const reasons = [];
  const has = (g) => gods.includes(g) || gods.map((x) => GROUP[x]).includes(g);

  if (gods.some((g) => spouse.includes(g))) {
    reasons.push("배우자·인연의 기운(남자는 재성, 여자는 관성)이 들어오던 시기예요. 마음이 자연스럽게 열려 인연이 맺어지기 쉬웠습니다.");
  }
  if (has("식상")) reasons.push("표현과 매력이 활발해지던 때라, 상대에게 끌림을 주고 먼저 다가가기 좋았습니다.");
  if (has("인성")) reasons.push("안정과 정서적 교감을 원하던 시기라, 편안하게 기댈 수 있는 상대에게 마음이 갔습니다.");
  if (has("재성") && gender === "female") reasons.push("현실적 안정과 활동에 관심이 커지던 때라, 함께 무언가를 만들어갈 상대에게 끌렸습니다.");
  if (has("비겁")) reasons.push("활동과 자극이 많던 시기라 인연을 만나기 쉬웠지만, 자기 주관이 강해 초반부터 주도권 조율이 필요했을 수 있어요.");
  if (!reasons.length) reasons.push("특정 인연운이 강하기보다, 일상 속 자연스러운 접점에서 관계가 시작된 흐름으로 보입니다.");

  return {
    when: `${e.year}년`, yearGZ: e.yearGZ, yearGod: e.yearGod, daeunGz: e.daeunGz, daeunGod: e.daeunGod,
    title: "왜 사귀게 되었을까",
    reasons,
    note: "시작이 좋았다는 뜻이지 옳고 그름은 아니에요. 당시 서로가 원했던 것이 무엇이었는지 돌아보는 용도로 보세요.",
  };
}

/** 이별 분석 */
export function analyzeBreakup(profile, dateStr, gender) {
  const e = dateEnergy(profile, dateStr);
  const gods = [e.yearGod, e.daeunGod].filter(Boolean);
  const has = (g) => gods.includes(g) || gods.map((x) => GROUP[x]).includes(g);
  const reasons = [];

  if (gender === "female" && has("식상")) {
    reasons.push("상관·식신의 기운이 강해지던 때예요(상관견관). 관계의 규칙이나 상대의 방식이 답답하게 느껴져, 참기보다 벗어나고 싶어졌을 수 있습니다.");
  }
  if (gender === "male" && has("비겁")) {
    reasons.push("비겁의 기운이 강해지던 때라, 재성(인연)이 분산·경쟁에 흔들리기 쉬웠어요. 자기 일·주변 관계·금전이 끼어들며 둘 사이가 멀어지기 쉬웠습니다.");
  }
  if (has("비겁") && gender === "female") reasons.push("자기중심과 독립심이 강해지던 시기라, 맞춰주기보다 내 방식을 지키고 싶어 부딪히기 쉬웠습니다.");
  if (has("관성") && gender === "male") reasons.push("책임·일·압박이 커지던 시기라, 관계에 쓸 에너지가 줄며 소홀해지기 쉬웠어요.");
  if (has("재성") && gender === "female") reasons.push("현실·일·돈에 몰두하던 시기라, 감정 교류가 뒤로 밀리며 거리감이 생기기 쉬웠습니다.");
  if (has("인성")) reasons.push("혼자만의 시간과 안정을 원하던 시기라, 관계의 갈등을 마주하기보다 회피로 흘렀을 수 있어요.");
  if (!reasons.length) reasons.push("특정 흉운이라기보다, 서로의 흐름이 어긋나며 쌓인 것이 그 시기에 표면화된 것으로 보입니다.");

  return {
    when: `${e.year}년`, yearGZ: e.yearGZ, yearGod: e.yearGod, daeunGz: e.daeunGz, daeunGod: e.daeunGod,
    title: "왜 헤어지게 되었을까",
    reasons,
    note: "‘그 시기의 기운’이 이런 방향이라 흔들리기 쉬웠다는 뜻이에요. 누구의 잘못을 가리는 게 아니라, 반복을 줄이기 위한 참고로 봐 주세요.",
  };
}

/* ---- 두 사람 합·충 궁합 (상대방 생일 입력 시) ---- */
const HAP6 = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]]; // 육합
const SAMHAP = [[8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7]]; // 삼합
const HYEONG = [[2, 5, 8], [1, 10, 7], [0, 3]]; // 형(자형 별도)
const SELF_HYEONG = [4, 6, 9, 11];
const HAE = [[0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10]]; // 해
const inPair = (list, a, b) => list.some((p) => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));
const sameGroup = (groups, a, b) => groups.some((g) => g.includes(a) && g.includes(b));

function classifyBranch(a, b) {
  if (a === b) return SELF_HYEONG.includes(a) ? "자형" : "동일";
  if (Math.abs(a - b) === 6) return "충";
  if (inPair(HAP6, a, b)) return "육합";
  if (sameGroup(SAMHAP, a, b)) return "삼합";
  if (HYEONG.some((g) => g.includes(a) && g.includes(b))) return "형";
  if (inPair(HAE, a, b)) return "해";
  return "무관";
}

const BRANCH_REL_DESC = {
  육합: "잘 맞물려 편안한 결이에요. 함께 있을 때 안정감이 큽니다.",
  삼합: "방향과 목표가 통해, 같이 무언가를 도모하기 좋은 조합이에요.",
  충: "강하게 끌리지만 부딪힘도 큰 역동적 조합이에요. 만남·이별·재결합이 반복되기 쉬워, 거리 조절이 관건입니다.",
  형: "가까워질수록 서로의 예민한 부분을 건드리기 쉬워요. 선을 존중하는 태도가 필요합니다.",
  자형: "서로 비슷한 지점에서 스스로를 갉아먹기 쉬운 결이에요. 각자의 회복 루틴이 중요합니다.",
  해: "사소한 오해가 조용히 쌓이기 쉬워요. 확인하는 대화가 관계를 지킵니다.",
  동일: "닮아서 편하지만, 같은 약점도 공유하는 조합이에요.",
  무관: "특별한 합·충 없이 무난한 결이에요. 그만큼 노력한 만큼 관계가 만들어집니다.",
};

/** 상대방과의 합·충 궁합 */
export function harmonyBetween(a, b, labels = { a: "나", b: "상대" }) {
  const asd = a.pillars.day.stemIdx, bsd = b.pillars.day.stemIdx;
  const adb = a.pillars.day.branchIdx, bdb = b.pillars.day.branchIdx;
  const ayb = a.pillars.year.branchIdx, byb = b.pillars.year.branchIdx;

  const ganhap = Math.abs(asd - bsd) === 5; // 천간합
  const dayRel = classifyBranch(adb, bdb);
  const yearRel = classifyBranch(ayb, byb);

  const reasons = [];
  if (ganhap) reasons.push("두 사람의 일간이 천간합을 이뤄, 서로에게 자연스럽게 끌리고 묶이는 힘이 강해요. 깊은 유대가 되기도, 과하면 못 벗어나는 집착이 되기도 합니다.");
  reasons.push(`배우자궁(일지)이 ‘${dayRel}’ 관계 — ${BRANCH_REL_DESC[dayRel]}`);
  if (yearRel !== "무관") reasons.push(`띠(년지)는 ‘${yearRel}’ 관계 — 사회적 인연·첫인상의 결에 영향을 줍니다.`);

  // 재회 관점 힌트
  let reunionHint;
  if (dayRel === "충") reunionHint = "일지 충 조합은 재회 가능성이 낮지 않지만, 다시 만나도 같은 이유로 부딪히기 쉬워요. 무엇을 바꿀지가 분명해야 합니다.";
  else if (ganhap || dayRel === "육합" || dayRel === "삼합") reunionHint = "서로 끌리는 힘이 남아 있는 조합이라, 계기가 생기면 재회로 이어지기 쉬워요. 다만 헤어진 이유가 풀렸는지가 핵심입니다.";
  else if (dayRel === "형" || dayRel === "해") reunionHint = "다시 만나더라도 예전의 마찰이 반복되기 쉬운 조합이에요. 거리와 대화 방식을 먼저 정리하는 게 좋습니다.";
  else reunionHint = "특별히 재회를 부르거나 막는 힘은 약해요. 재회 여부는 두 사람의 실제 변화에 달렸습니다.";

  return {
    ganhap, dayRel, yearRel, reasons, reunionHint,
    dayMasters: { a: a.pillars.day.stem, b: b.pillars.day.stem },
    labels,
  };
}

/* ---- 월(月) 단위 타이밍 ---- */
export function monthlyFlow(profile, gender, fromYear, fromMonth, count) {
  const dIdx = profile.pillars.day.stemIdx;
  const spouse = SPOUSE[gender] || SPOUSE.female;
  const out = [];
  let Y = fromYear, M = fromMonth;
  for (let k = 0; k < count; k++) {
    const date = `${Y}-${String(M).padStart(2, "0")}-15`;
    const d = computeSaju({ calendarType: "solar", birthDate: date, birthTime: "12:00", timeUnknown: true, gender: "male", timezone: "Asia/Seoul" });
    const god = tenGod(dIdx, d.pillars.month.stemIdx);
    const g = GROUP[god];
    const favorable = spouse.includes(god) || g === "인성";
    out.push({ y: Y, m: M, gz: d.pillars.month.gz, god, favorable });
    M++; if (M > 12) { M = 1; Y++; }
  }
  return out;
}

/** 재회 가능 '시기' — 앞으로 N개월을 월 단위로 스캔해 유리한 구간을 묶어 준다. */
export function reunionTiming(profile, gender, fromYear, fromMonth, months = 18) {
  const flow = monthlyFlow(profile, gender, fromYear, fromMonth, months);
  // 연속된 유리한 달을 하나의 '창(window)'으로 묶기
  const windows = [];
  let cur = null;
  for (const m of flow) {
    if (m.favorable) {
      if (cur) cur.push(m); else cur = [m];
    } else if (cur) { windows.push(cur); cur = null; }
  }
  if (cur) windows.push(cur);
  const label = (w) => {
    const f = w[0], l = w[w.length - 1];
    if (f.y === l.y && f.m === l.m) return `${f.y}년 ${f.m}월`;
    if (f.y === l.y) return `${f.y}년 ${f.m}~${l.m}월`;
    return `${f.y}년 ${f.m}월 ~ ${l.y}년 ${l.m}월`;
  };
  const best = windows.map((w) => ({
    label: label(w),
    span: w.length,
    god: w[0].god,
    note: SPOUSE[gender].includes(w[0].god)
      ? "배우자·인연의 기운이 실제로 드나드는 시기예요. 먼저 연락하거나 마주칠 계기가 생기기 쉽습니다."
      : "마음이 안정돼 관계를 회복할 여유가 생기는 시기예요. 무겁지 않게 다가가기 좋아요.",
  })).sort((a, b) => b.span - a.span).slice(0, 3);
  const summary = best.length
    ? `앞으로 ${months}개월 중 재회의 문이 상대적으로 열리는 때는 ${best.map((b) => b.label).join(", ")}예요. 다만 그 시기가 ‘반드시 재회’를 뜻하진 않아요 — 문이 열렸을 때 무엇을 바꿔서 다가가느냐가 핵심입니다.`
    : `앞으로 ${months}개월은 재회를 밀어붙이기보다, 스스로를 정비하며 자연스러운 계기를 기다리기 좋은 흐름이에요.`;
  return { best, summary, months };
}

/** 재회 가능성 — 앞으로 3년 세운 스캔 */
export function reunionOutlook(profile, gender, fromYear) {
  const dIdx = profile.pillars.day.stemIdx;
  const spouse = SPOUSE[gender] || SPOUSE.female;
  const years = [];
  for (let k = 0; k < 3; k++) {
    const Y = fromYear + k;
    const idx = ((Y - 1984) % 60 + 60) % 60;
    const s = idx % 10, b = idx % 12;
    const god = tenGod(dIdx, s);
    const g = GROUP[god];
    const favorable = spouse.includes(god) || g === "인성";
    let note;
    if (spouse.includes(god)) note = "배우자·인연의 기운이 들어오는 해. 재회든 새 인연이든 관계가 다시 열리기 쉬운 흐름이에요.";
    else if (g === "인성") note = "마음이 안정되고 관계를 회복할 여유가 생기는 해. 감정 정리와 재접점에 나쁘지 않아요.";
    else if (g === "비겁") note = "자기 세계와 활동이 커지는 해. 재회보다 스스로에게 집중하기 좋은 흐름이에요.";
    else if (g === "식상") note = "표현·활동이 활발해 새로운 만남이 생기기 쉬운 해. 과거보다 앞을 보기 좋아요.";
    else if (g === "관성" && gender === "male") note = "책임·일 중심의 해. 관계는 서두르지 말고 안정된 뒤 움직이는 게 좋아요.";
    else note = "관계보다 현실·일의 비중이 커지는 해. 재회를 원한다면 조급함은 내려놓는 게 좋아요.";
    years.push({ year: Y, gz: STEMS[s] + BRANCHES[b], god, favorable, note });
  }
  const best = years.filter((y) => y.favorable);
  const summary = best.length
    ? `가능성이 상대적으로 열리는 해는 ${best.map((y) => y.year + "년").join(", ")}이에요. 다만 재회 여부는 사주의 운보다 두 사람이 그동안 무엇을 바꿨는지가 훨씬 크게 좌우합니다.`
    : "앞으로 3년은 재회 자체보다 스스로를 정비하고 앞으로 나아가기 좋은 흐름이에요. 재회는 운을 기다리기보다 두 사람의 실제 변화가 있어야 가능합니다.";
  return { years, summary };
}
