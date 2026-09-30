/* =========================================================
   상세 만세력 — 십신·지장간·십이운성·납음. 명식을 정통 방식으로 펼친다.
   (타 앱보다 친절하게: 각 요소가 뭔지 설명까지 함께.)
   ========================================================= */

import { tenGod } from "./fortune.js";

const STEM_H = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const STEM_KR = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const BRANCH_H = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const BRANCH_KR = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const STEM_ELEM = ["wood", "wood", "fire", "fire", "earth", "earth", "metal", "metal", "water", "water"];
const BRANCH_ELEM = ["water", "earth", "wood", "wood", "earth", "fire", "fire", "earth", "metal", "metal", "earth", "water"];
const ZODIAC = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];

// 지장간 (여기→중기→정기 순, stem index)
const JIJANG = [
  [8, 9], [9, 7, 5], [4, 2, 0], [0, 1], [1, 9, 4], [4, 6, 2],
  [2, 5, 3], [3, 1, 5], [4, 8, 6], [6, 7], [7, 3, 4], [4, 0, 8],
];
// 십이운성 — 일간별 장생 지지 + 방향
const CHANGSAENG = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3];
const STAGES12 = ["장생", "목욕", "관대", "건록", "제왕", "쇠", "병", "사", "묘", "절", "태", "양"];
// 납음 (30쌍) — 이름(오행은 끝 글자)
const NAPEUM = ["해중금", "노중화", "대림목", "노방토", "검봉금", "산두화", "간하수", "성두토", "백랍금", "양류목",
  "정천수", "옥상토", "벽력화", "송백목", "장류수", "사중금", "산하화", "평지목", "벽상토", "금박금",
  "복등화", "천하수", "대역토", "채천금", "상자목", "대계수", "사중토", "천상화", "석류목", "대해수"];

const mod = (n, m) => ((n % m) + m) % m;
function sexIdx(stem, branch) { for (let n = 0; n < 60; n++) if (n % 10 === stem && n % 12 === branch) return n; return 0; }
function twelveStage(dayStem, branch) {
  const dir = dayStem % 2 === 0 ? 1 : -1;
  return STAGES12[mod((branch - CHANGSAENG[dayStem]) * dir, 12)];
}

/* ===== 지지 관계(합·충·형·해·파) ===== */
const YUKHAP = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]]; // 육합
const SAMHAP = [{ b: [8, 0, 4], el: "水" }, { b: [2, 6, 10], el: "火" }, { b: [11, 3, 7], el: "木" }, { b: [5, 9, 1], el: "金" }];
const HAE = [[0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10]]; // 해(害)
const PA = [[0, 9], [6, 3], [4, 1], [10, 7], [2, 11], [8, 5]];   // 파(破)
const HYEONG_GROUPS = [[2, 5, 8], [1, 10, 7], [0, 3]];          // 형(인사신·축술미·자묘)
const SELF_HYEONG = [4, 6, 9, 11];                              // 자형(진오유해)
const inPair = (list, a, b) => list.some((p) => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));

/** 두 지지의 관계 (없으면 null) */
function branchRel(a, b) {
  if (a === b) return null;
  if (Math.abs(a - b) === 6) return { kind: "충", cls: "warn" };
  if (inPair(YUKHAP, a, b)) return { kind: "육합", cls: "good" };
  for (const s of SAMHAP) if (s.b.includes(a) && s.b.includes(b)) return { kind: "삼합", el: s.el, cls: "good" };
  if (HYEONG_GROUPS.some((g) => g.includes(a) && g.includes(b))) return { kind: "형", cls: "warn" };
  if (inPair(HAE, a, b)) return { kind: "해", cls: "warn" };
  if (inPair(PA, a, b)) return { kind: "파", cls: "warn" };
  return null;
}

/* ===== 12신살 ===== */
const WANGJI = { 8: 0, 0: 0, 4: 0, 2: 6, 6: 6, 10: 6, 11: 3, 3: 3, 7: 3, 5: 9, 9: 9, 1: 9 };
const SINSAL12 = ["겁살", "재살", "천살", "지살", "도화살", "월살", "망신살", "장성살", "반안살", "역마살", "육해살", "화개살"];
function sinsalOf(baseBranch, target) {
  const geop = mod(WANGJI[baseBranch] + 5, 12);
  return SINSAL12[mod(target - geop, 12)];
}

/* ===== 길신·흉살 (일간·지지 기준) ===== */
// 천을귀인 (일간 → 지지 2개)
const CHEONEUL = [[1, 7], [0, 8], [11, 9], [11, 9], [1, 7], [0, 8], [1, 7], [2, 6], [5, 3], [5, 3]];
// 건록 / 양인(양간) / 금여 / 문창귀인 (일간 → 지지)
const LOK = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0];
const YANGIN = { 0: 3, 2: 6, 4: 6, 6: 9, 8: 0 };
const GEUMYEO = [4, 5, 7, 8, 7, 8, 10, 11, 1, 2];
const MUNCHANG = [5, 6, 8, 9, 8, 9, 11, 0, 2, 3];
// 현침살: 천간 甲辛 / 지지 卯午申
const HYEONCHIM_STEM = [0, 7], HYEONCHIM_BRANCH = [3, 6, 8];

/** 명식 → 상세 만세력 데이터 */
export function buildManse(profile) {
  const P = profile.pillars;
  const dayStem = P.day.stemIdx;
  const order = [
    { key: "hour", pos: "시주", posH: "時" },
    { key: "day", pos: "일주", posH: "日" },
    { key: "month", pos: "월주", posH: "月" },
    { key: "year", pos: "년주", posH: "年" },
  ];
  // 기준 지지들
  const yearB = P.year ? P.year.branchIdx : null;
  const dayB = P.day ? P.day.branchIdx : null;
  const present = order.filter(({ key }) => P[key]);
  const guiin = CHEONEUL[dayStem]; // 천을귀인 지지 2개

  const pillars = order.map(({ key, pos, posH }) => {
    const p = P[key];
    if (!p) return { pos, posH, empty: true };
    const s = p.stemIdx, b = p.branchIdx;
    const isDay = key === "day";
    const jj = JIJANG[b].map((hs) => ({ hanja: STEM_H[hs], god: tenGod(dayStem, hs) }));
    const sex = sexIdx(s, b);
    const nap = NAPEUM[Math.floor(sex / 2)];

    // 다른 기둥 지지와의 관계(합·충·형·해·파)
    const relations = [];
    present.forEach((o) => {
      if (o.key === key) return;
      const r = branchRel(b, P[o.key].branchIdx);
      if (r) relations.push({ with: o.pos, kind: r.kind + (r.el ? `(${r.el})` : ""), cls: r.cls });
    });

    // 12신살 (년지 기준 / 일지 기준)
    const sinsal = [];
    if (yearB != null) sinsal.push({ base: "년", name: sinsalOf(yearB, b) });
    if (dayB != null) sinsal.push({ base: "일", name: sinsalOf(dayB, b) });

    // 길신·흉살
    const spirits = [];
    if (guiin.includes(b)) spirits.push("천을귀인");
    if (LOK[dayStem] === b) spirits.push("건록");
    if (YANGIN[dayStem] === b) spirits.push("양인");
    if (GEUMYEO[dayStem] === b) spirits.push("금여");
    if (MUNCHANG[dayStem] === b) spirits.push("문창귀인");
    if (HYEONCHIM_STEM.includes(s) || HYEONCHIM_BRANCH.includes(b)) spirits.push("현침살");

    return {
      pos, posH, key,
      stemH: STEM_H[s], stemKr: STEM_KR[s], stemElem: STEM_ELEM[s],
      branchH: BRANCH_H[b], branchKr: BRANCH_KR[b], branchElem: BRANCH_ELEM[b],
      zodiac: ZODIAC[b],
      stemGod: isDay ? "일간(我)" : tenGod(dayStem, s),
      branchGod: tenGod(dayStem, JIJANG[b][JIJANG[b].length - 1]), // 지지 정기 기준
      jijang: jj,
      stage: twelveStage(dayStem, b),
      napeum: nap, napeumElem: nap.slice(-1),
      relations, sinsal, spirits,
      isGuiin: guiin.includes(b),
      isDay,
    };
  });

  // 지지 관계 요약(쌍 단위, 중복 제거)
  const pairRels = [];
  for (let i = 0; i < present.length; i++) for (let j = i + 1; j < present.length; j++) {
    const A = present[i], B = present[j];
    const r = branchRel(P[A.key].branchIdx, P[B.key].branchIdx);
    if (r) pairRels.push({ a: A.pos, b: B.pos, kind: r.kind + (r.el ? `(${r.el})` : ""), cls: r.cls,
      ah: BRANCH_H[P[A.key].branchIdx], bh: BRANCH_H[P[B.key].branchIdx] });
  }

  // 공망 (년주·일주 순중)
  const gongmang = (pillarKey) => {
    const p = P[pillarKey]; if (!p) return null;
    const D = sexIdx(p.stemIdx, p.branchIdx);
    const headB = mod(D - mod(D, 10), 12);
    return [mod(headB + 10, 12), mod(headB + 11, 12)];
  };
  const gmYear = gongmang("year"), gmDay = gongmang("day");
  const wollyeong = P.month ? STEM_H[JIJANG[P.month.branchIdx][JIJANG[P.month.branchIdx].length - 1]] : null;

  const summary = {
    guiinH: guiin.map((x) => BRANCH_H[x]),
    guiinHit: present.some((o) => guiin.includes(P[o.key].branchIdx)),
    gongmangYearH: gmYear ? gmYear.map((x) => BRANCH_H[x]) : null,
    gongmangDayH: gmDay ? gmDay.map((x) => BRANCH_H[x]) : null,
    wollyeongH: wollyeong,
    elementCounts: profile.elementCounts,
  };

  return { pillars, pairRels, summary, dayMaster: STEM_KR[dayStem] + "(" + STEM_H[dayStem] + ")", elementCounts: profile.elementCounts };
}

/* 신살·길신 한 줄 뜻 (마우스 오버 툴팁용) */
export const SINSAL_MEANING = {
  "천을귀인": "최고의 길신. 위기에 귀인의 도움을 받고 흉을 길로 바꾸는 힘.",
  "건록": "스스로 벌어 자리를 만드는 자수성가의 힘. 성실하고 독립적.",
  "양인": "칼처럼 강한 추진력·승부욕. 과하면 사고·다툼을 조심.",
  "금여": "배우자 복·재물 복의 길신. 편안하고 귀한 인연이 따름.",
  "문창귀인": "학문·시험·문서운. 머리가 맑고 글재주가 있음.",
  "현침살": "바늘처럼 예리한 재주. 의료·기술·손재주, 말·글이 날카로움.",
  "장성살": "리더십·중심. 무리를 이끌고 책임지는 자리.",
  "반안살": "말안장 — 승진·안정·출세의 기운. 윗사람의 도움.",
  "역마살": "이동·이사·해외·변화. 한곳에 머물기보다 움직일 때 풀림.",
  "화개살": "예술·종교·학문·고독. 남다른 감성과 재능, 혼자만의 세계.",
  "도화살": "매력·인기·이성운. 사람을 끄는 힘(과하면 구설).",
  "육해살": "소모·발목잡힘. 건강·관계에서 신경 쓸 일이 생기기 쉬움.",
  "겁살": "예기치 못한 손실·빼앗김. 욕심을 조절할 자리.",
  "재살(수옥살)": "구속·송사·경쟁. 다툼과 시비를 조심.",
  "재살": "구속·송사·경쟁. 다툼과 시비를 조심.",
  "천살": "하늘이 내린 변수. 내 힘 밖의 일, 겸손이 약.",
  "지살": "이동·역마의 시작. 분주하게 움직이며 자리를 넓힘.",
  "월살(고초살)": "메마름·정체. 결실 직전 힘 빠지기 쉬워 꾸준함이 필요.",
  "월살": "메마름·정체. 결실 직전 힘 빠지기 쉬워 꾸준함이 필요.",
  "망신살": "체면·실수 노출. 말과 처신을 조심할 자리.",
  "홍염살": "은은한 색기·분위기 미남미녀. 가만히 있어도 눈길을 끄는 매력.",
};

/* 용어 설명 (타 앱보다 친절하게) */
export const MANSE_GLOSSARY = [
  { term: "천간·지지 (天干·地支)", desc: "위 글자가 천간(하늘 기운·드러난 나), 아래 글자가 지지(땅 기운·속마음·환경)예요. 둘을 합쳐 ‘간지’, 네 기둥이 사주팔자(四柱八字)입니다." },
  { term: "일간 (日干)", desc: "일주의 천간 = 바로 ‘나 자신’. 사주 해석의 기준점이에요. 나머지 글자들은 모두 이 일간과의 관계로 읽습니다." },
  { term: "십신 (十神)", desc: "각 글자가 나(일간)에게 어떤 역할인지예요. 재성=재물·이성, 관성=직위·규율, 인성=문서·학문·보호, 식상=표현·재능, 비겁=경쟁·동료." },
  { term: "지장간 (支藏干)", desc: "지지 속에 숨어 있는 천간이에요. 겉(지지)과 속(지장간)이 달라, 드러나지 않은 성향·잠재력을 봅니다." },
  { term: "십이운성 (十二運星)", desc: "일간이 각 지지에서 얼마나 기운이 센지(장생→제왕→묘…)를 12단계로 본 것. 제왕·건록은 강, 묘·절·사는 약." },
  { term: "납음오행 (納音五行)", desc: "간지 한 쌍에 붙는 상징 오행(예: 대림목=큰 숲의 나무). 옛 이름풀이·궁합에서 참고해요." },
  { term: "오행 분포", desc: "목·화·토·금·수의 개수. 많은 기운은 강점이자 과잉, 없는 기운은 채워야 할 부분(용신·처방과 연결)이에요." },
  { term: "합·충 (合·沖)", desc: "지지끼리의 관계예요. 육합·삼합은 힘을 합쳐 안정·협력, 충은 강하게 부딪혀 변화·이동, 형·해·파는 마찰·소모를 뜻해요. 내 팔자 안에서, 그리고 그해 운(세운)과의 관계로 사건이 드러납니다." },
  { term: "천을귀인 (天乙貴人)", desc: "가장 귀한 길신. 내 사주에 있으면 위기 때 귀인의 도움을 받고, 흉을 길로 바꾸는 힘이 있다고 봐요. 그해 운에서 만나도 도움이 들어옵니다." },
  { term: "공망 (空亡)", desc: "‘비어 있는’ 지지예요. 그 자리(년·일 기준)의 기운은 채워지지 않아 허전하거나, 집착을 내려놓아야 편해지는 영역을 뜻해요." },
  { term: "12신살 (十二神殺)", desc: "년지·일지를 기준으로 각 지지에 붙는 12가지 기운. 도화살=매력·인기, 역마살=이동·해외, 화개살=예술·종교·고독, 장성살=리더십, 망신살·겁살·재살 등은 조심할 자리예요." },
  { term: "건록·양인·금여·문창·현침", desc: "건록=자수성가의 힘, 양인=강한 추진력(과하면 사고), 금여=배우자·재물 복, 문창귀인=학문·시험운, 현침살=날카로운 재주(의료·기술)이자 말·글의 예리함이에요." },
  { term: "월령 (月令)", desc: "태어난 달(월지)의 기운. 일간이 이 계절 기운을 얻었는지(득령)가 신강·신약 판단의 핵심이에요." },
];
