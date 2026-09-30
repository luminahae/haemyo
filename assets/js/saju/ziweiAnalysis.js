/* =========================================================
   자미두수 전문 심화 분석 (8단계).
   명반(computeZiwei 결과)을 받아 삼방사정·대궁·격국·사화·길흉 조합·
   현대 직업·최종 요약을 산출한다.
   ========================================================= */

import { STAR_DEEP, AUX_DEEP, SIHUA_EFFECT, STAR_FAMILY, GEKGUK } from "./ziweiDeep.js";

const MAIN = new Set(Object.keys(STAR_DEEP));
const AUX_LUCKY = ["좌보", "우필", "문창", "문곡", "녹존"];
const AUX_SHA = ["경양", "타라"];

const byName = (z, name) => z.palaces.find((p) => p.name === name);
const mainOf = (p) => (p ? p.stars.filter((s) => MAIN.has(s.name)) : []);
const auxOf = (p) => (p ? p.stars.filter((s) => !MAIN.has(s.name)) : []);
const names = (arr) => arr.map((s) => s.name);

export function analyzeZiweiDeep(z) {
  const ming = byName(z, "명궁");
  const spouse = byName(z, "부처궁");
  const wealth = byName(z, "재백궁");
  const career = byName(z, "관록궁");
  const travel = byName(z, "천이궁");

  const mingMain = mainOf(ming);
  // 공궁이면 대궁(천이) 차성
  const useMing = mingMain.length ? mingMain : mainOf(travel);
  const empty = mingMain.length === 0;

  // 삼방사정 = 명궁 + 재백 + 관록 + 천이(대궁)
  const trine = [ming, wealth, career, travel];
  const trineStars = [];
  trine.forEach((p) => mainOf(p).forEach((s) => trineStars.push(s.name)));

  // 격국: 삼방(명+재백+관록) 주성 계열 최다
  const famCount = {};
  [ming, wealth, career].forEach((p) => mainOf(p).forEach((s) => {
    const f = STAR_FAMILY[s.name]; if (f) famCount[f] = (famCount[f] || 0) + 1;
  }));
  let gekKey = Object.entries(famCount).sort((a, b) => b[1] - a[1])[0];
  gekKey = gekKey ? gekKey[0] : "자부";
  const gekguk = GEKGUK[gekKey];

  // 사화 위치
  const sihuaHits = z.sihua.map((sh) => {
    const pal = z.palaces.find((p) => p.stars.some((s) => s.name === sh.star));
    return { label: sh.label, star: sh.star, palace: pal ? pal.name : "명반 밖", effect: SIHUA_EFFECT[sh.label] };
  });

  // 대궁(천이) 충돌
  const travelAux = names(auxOf(travel));
  const travelHasSha = travelAux.some((n) => AUX_SHA.includes(n));
  const travelHasKi = (travel ? travel.stars : []).some((s) => s.sihua === "화기(忌)");
  const travelLucky = travelAux.filter((n) => AUX_LUCKY.includes(n));

  // 길흉 조합
  const good = [];
  const bad = [];
  const trineAux = [];
  trine.forEach((p) => auxOf(p).forEach((s) => trineAux.push(s.name)));
  if (trineAux.includes("좌보") && trineAux.includes("우필")) good.push("좌보·우필이 삼방을 도와 ‘군신경회(君臣慶會)’의 결 — 사람 복과 조력이 따릅니다.");
  if (trineAux.includes("문창") && trineAux.includes("문곡")) good.push("문창·문곡이 함께 비쳐 학문·시험·전문성이 강화됩니다(연구·개발·자격에 유리).");
  if (trineAux.includes("녹존")) good.push("녹존이 삼방에 들어 재물의 기초가 안정적입니다.");
  const mingHua = (ming ? ming.stars : []).filter((s) => s.sihua && s.sihua !== "화기(忌)");
  if (mingHua.length) good.push(`명궁의 ${mingHua.map((s) => s.name + " " + s.sihua).join(", ")} — 타고난 강점 축이 뚜렷합니다.`);

  const mingSha = names(auxOf(ming)).filter((n) => AUX_SHA.includes(n));
  if (mingSha.length) bad.push(`명궁에 ${mingSha.join("·")}(살성)이 있어 조급함·마찰·기복이 커질 수 있습니다(전문 기술로 승화 가능).`);
  const mingKi = (ming ? ming.stars : []).find((s) => s.sihua === "화기(忌)");
  if (mingKi) bad.push(`명궁의 ${mingKi.name} 화기 — 그 영역에 집착·과제가 생기니 균형이 필요합니다.`);
  if (travelHasKi) bad.push("대궁(천이)에 화기가 있어, 밖에서의 견제·환경 변화가 잦을 수 있습니다.");
  if (empty) bad.push("명궁이 공궁이라 환경·관계의 영향을 크게 받습니다(대궁 차성으로 성향을 봄).");
  if (!good.length) good.push("두드러진 길성 조합은 약하지만, 그만큼 노력한 만큼 결과가 정직하게 쌓이는 구조입니다.");
  if (!bad.length) bad.push("큰 살성 충돌이 적어 비교적 안정적인 구조입니다(자극이 적어 추진력은 스스로 만들어야 함).");

  // 현대 직업 종합
  const jobSet = [];
  useMing.forEach((s) => (STAR_DEEP[s.name]?.jobs || []).forEach((j) => { if (!jobSet.includes(j)) jobSet.push(j); }));
  (gekguk.jobs || []).forEach((j) => { if (!jobSet.includes(j)) jobSet.push(j); });

  // 최종 요약
  const summary = {
    성격: describe(useMing, "modern", empty ? "명궁이 비어 주변 환경에 따라 색이 달라지되, 대궁의 " : ""),
    연애: loveMarryField(spouse, "love"),
    결혼: loveMarryField(spouse, "marry"),
    직업: `${gekguk.name.split(" — ")[0]} 격 + 관록궁 ${starList(career)}. ${describe(mainOf(career), "modern", "")}`,
    재물: `재백궁 ${starList(wealth)}. ${trineAux.includes("녹존") ? "녹존이 있어 안정적 축적에 유리합니다." : "수입은 실력·성과에 비례하는 편, 관리 습관이 관건입니다."}`,
    성공: good.length >= bad.length
      ? "길성이 살성보다 우세해, 방향만 맞으면 성취가 쌓이기 좋은 구조입니다."
      : "자극·변동이 있는 구조라, 리스크 관리와 꾸준함을 더하면 성공 가능성이 크게 올라갑니다.",
    조언: `${useMing[0] ? STAR_DEEP[useMing[0].name].caution + " " : ""}${gekguk.caution}`,
  };

  return {
    empty, useMing, mingMain, ming, spouse, wealth, career, travel,
    trineStars, gekguk, gekKey, sihuaHits,
    daegung: { stars: names(mainOf(travel)), lucky: travelLucky, hasSha: travelHasSha, hasKi: travelHasKi },
    good, bad, jobs: jobSet.slice(0, 8), summary,
  };
}

function starList(p) {
  const m = names(mainOf(p));
  return m.length ? m.join("·") : "공궁";
}
function describe(stars, field, prefix) {
  if (!stars.length) return prefix + "성향이 뚜렷하지 않아 유연합니다.";
  return prefix + stars.map((s) => STAR_DEEP[s.name] ? STAR_DEEP[s.name][field] : "").filter(Boolean).join(" ");
}
function relField(p, label, palaceName) {
  const m = mainOf(p);
  if (!m.length) return `${palaceName}이 공궁이라 상대·상황에 따라 유동적입니다. 상대의 성향이 관계 색을 크게 좌우합니다.`;
  return `${palaceName}에 ${names(m).join("·")}. ${m.map((s) => STAR_DEEP[s.name]?.modern).filter(Boolean)[0] || ""}`;
}

/* 부처궁 주성별 연애/결혼 결 — 연애와 결혼을 다르게 서술 */
const LOVE_MARRY = {
  자미: { love: "품격 있고 주도하는 연애. 존중받고 싶어 하며 아무나 만나지 않아요.", marry: "듬직하고 자기 세계가 뚜렷한 배우자. 가정의 중심을 세우려는 편이에요." },
  천기: { love: "머리로 하는 연애 — 대화가 통하고 센스가 맞아야 끌려요.", marry: "지혜롭고 임기응변이 좋은 배우자. 변화·이동이 잦은 결혼 생활." },
  태양: { love: "밝고 먼저 베푸는 헌신형 연애. 티 나게 챙겨 줘요.", marry: "활동적이고 사회적인 배우자. 밖으로 향하는 에너지가 커요." },
  무곡: { love: "표현은 서툴러도 행동으로 보여주는 진국형 연애.", marry: "현실적이고 책임에 충실한 배우자. 재무 감각이 뚜렷해요." },
  천동: { love: "다정하고 편안한 연애. 정서적 교감을 가장 중요하게 여겨요.", marry: "온화한 배우자와 소소한 행복 위주의 가정." },
  염정: { love: "밀당과 매력이 강한 연애. 끌림이 크지만 감정 기복도 있어요.", marry: "개성 강한 배우자. 열정과 갈등이 함께하는 결혼." },
  천부: { love: "안정을 보는 신중한 연애. 조건과 미래도 함께 살펴요.", marry: "살림 잘하고 안정적인 배우자. 풍요를 지향하는 가정." },
  태음: { love: "섬세하고 로맨틱한 연애. 분위기와 감성을 중시해요.", marry: "자상하고 가정적인 배우자. 정서적 안정이 큰 결혼." },
  탐랑: { love: "매력·인기가 많고 다채로운 연애. 새로운 자극을 즐겨요.", marry: "사교적이고 다재다능한 배우자. 지루하지 않은 결혼 생활." },
  거문: { love: "대화로 깊어지는 연애. 다만 오해·말다툼도 잦을 수 있어요.", marry: "논리적이고 할 말은 하는 배우자. 소통 방식이 관건." },
  천상: { love: "배려 깊고 매너 좋은 연애. 상대를 편하게 해 줘요.", marry: "조화롭고 신의 있는 배우자. 안정적인 결혼 생활." },
  천량: { love: "보호본능을 자극하는 연애. 연상·든든한 상대에게 끌려요.", marry: "어른스럽고 문제를 해결해 주는 배우자." },
  칠살: { love: "강렬하고 직진하는 연애. 빠르게 타오르는 편이에요.", marry: "독립적이고 카리스마 있는 배우자. 부침이 있는 결혼." },
  파군: { love: "변화 많고 개척적인 연애. 예측하기 어려운 매력.", marry: "개성 강한 배우자. 결혼 생활에 변동·리모델링이 잦아요." },
};
function loveMarryField(p, mode) {
  const m = mainOf(p);
  if (!m.length) return mode === "love"
    ? "부처궁이 공궁이라 정해진 연애 스타일보다 그때그때 상대에 따라 달라져요. 상대의 색에 잘 물드는 편이에요."
    : "부처궁이 공궁이라 배우자상이 고정적이지 않아요. 대궁(관록)의 기운과 상대의 성향이 결혼 색을 크게 좌우합니다.";
  const line = m.map((s) => LOVE_MARRY[s.name] && LOVE_MARRY[s.name][mode]).filter(Boolean)[0];
  return `부처궁에 ${names(m).join("·")}. ${line || (STAR_DEEP[m[0].name]?.modern || "")}`;
}
