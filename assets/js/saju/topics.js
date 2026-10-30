/* =========================================================
   운세 카테고리 해석 — 십신(十神) 구조 기반.
   연애/재회/이별/재물/학업/문서 = 명식의 해당 십신 강약으로,
   오늘/평일/주말 = 일진(todayFortune)으로 생성.
   톤: 좋은 말만 X, 조심할 점·개선을 함께. 미래 확정·공포 금지.
   ========================================================= */

import { todayFortune } from "./fortune.js";
import { computeSaju } from "./manse.js";
const computeSajuLite = (date) => computeSaju({ calendarType: "solar", birthDate: date, birthTime: "12:00", timeUnknown: true, gender: "male", timezone: "Asia/Seoul" });

const GEN = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
const CTRL = { wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" };
const CTRL_BY = { wood: "metal", fire: "water", earth: "wood", metal: "fire", water: "earth" };
const RESOURCE = { wood: "water", fire: "wood", earth: "fire", metal: "earth", water: "metal" };
const ELEM_KR = { wood: "목(木)", fire: "화(火)", earth: "토(土)", metal: "금(金)", water: "수(水)" };
const ELEM_COLOR = { wood: "초록", fire: "빨강·주황", earth: "노랑·베이지", metal: "흰색·골드", water: "검정·네이비" };

/** 십신 그룹별 글자 수 (일간 기준) */
function sip(profile) {
  const e = profile.dayMasterElem, c = profile.elementCounts || {};
  return {
    peer: c[e] || 0,                 // 비겁
    output: c[GEN[e]] || 0,          // 식상
    wealth: c[CTRL[e]] || 0,         // 재성
    officer: c[CTRL_BY[e]] || 0,     // 관성
    resource: c[RESOURCE[e]] || 0,   // 인성
  };
}
function level(n, total) {
  const r = total ? n / total : 0;
  return r >= 0.30 ? "강" : r >= 0.12 ? "중" : "약";
}
// 명식+토픽 고정 해시 → 점수 변주(항상 같은 값이 나오도록)
function jitter(profile, id) {
  const s = (profile.pillars.day.gz || "") + (profile.pillars.year.gz || "") + id;
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
  return h % 9; // 0~8
}
function scoreFor(lv, profile, id) {
  const base = lv === "강" ? 74 : lv === "중" ? 60 : 46;
  return base + jitter(profile, id) - 2; // ±
}

/* 각 토픽 콘텐츠 — anchor 십신 + 강/중/약 */
const C = {
  love: {
    anchor: (s, gender) => (gender === "female" ? s.officer : s.wealth),
    other: "배우자성(남자는 재성, 여자는 관성)",
    강: {
      summary: "이성을 끌어들이는 기운이 뚜렷해요. 인연의 기회 자체는 잘 열립니다.",
      pros: ["매력·인기의 기운이 강해 만남의 폭이 넓어요.", "감정을 표현하는 데 주저함이 적어 관계 진전이 빨라요."],
      cons: ["끌림이 강한 만큼 여러 인연이 겹쳐 흔들리기 쉬워요.", "속도가 빨라 상대의 속도를 놓칠 수 있어요."],
      advice: "선택지가 많을수록 ‘한 사람에게 집중’이 관건이에요. 설렘과 진심을 구분해 보세요.",
    },
    중: {
      summary: "무난한 연애 기운이에요. 큰 굴곡 없이 노력한 만큼 관계가 만들어져요.",
      pros: ["안정적으로 관계를 쌓아가는 데 어울려요.", "상대를 배려하는 균형 감각이 있어요."],
      cons: ["먼저 다가가는 적극성이 약하면 기회를 놓치기도 해요.", "익숙함에 표현이 줄기 쉬워요."],
      advice: "기다리기보다 한 발 먼저 표현해 보세요. 작은 신호가 인연을 살립니다.",
    },
    약: {
      summary: "지금은 인연의 기운이 조용한 편이에요. 조급함이 오히려 방해가 돼요.",
      pros: ["나를 돌보고 매력을 다듬기 좋은 시기예요.", "가벼운 만남보다 깊은 관계에 어울려요."],
      cons: ["‘없다’는 조급함이 잘못된 선택으로 이어지기 쉬워요.", "혼자 마음을 키우다 지칠 수 있어요."],
      advice: "인연을 좇기보다 나의 리듬을 채우세요. 준비된 매력이 때를 만듭니다.",
    },
  },
  reunion: {
    anchor: (s, gender) => (gender === "female" ? s.officer : s.wealth),
    강: {
      summary: "다시 이어질 기운은 살아 있어요. 다만 ‘왜 헤어졌는지’를 넘어야 진짜 재회예요.",
      pros: ["서로를 다시 끌어당기는 기운이 있어요.", "연락·계기가 자연스럽게 생기기 쉬워요."],
      cons: ["끌림만으로 돌아가면 같은 이유로 또 멀어져요.", "미련과 사랑을 혼동하기 쉬워요."],
      advice: "돌아가기 전에 헤어진 원인이 ‘바뀌었는지’부터 확인하세요. 감정보다 변화가 핵심.",
    },
    중: {
      summary: "재회 가능성은 반반이에요. 두 사람의 선택이 운보다 크게 작용해요.",
      pros: ["시간이 지나 감정이 정리되면 대화의 여지가 열려요."],
      cons: ["어정쩡한 연락은 서로를 더 지치게 해요."],
      advice: "재회를 원한다면 ‘무엇이 달라질지’를 먼저 정리해 제안하세요.",
    },
    약: {
      summary: "지금은 되돌리는 기운이 약해요. 붙잡기보다 나를 회복할 시기예요.",
      pros: ["관계를 객관적으로 돌아보며 성장할 수 있어요."],
      cons: ["집착은 나를 소모시키고 상대를 더 멀어지게 해요."],
      advice: "매달리는 대신 나의 일상을 채우세요. 회복이 다음 인연의 바탕이 됩니다.",
    },
  },
  breakup: {
    anchor: (s) => s.officer + s.wealth,     // 관계성 십신 손상/과다
    강: {
      summary: "관계의 긴장이 커지기 쉬운 흐름이에요. 감정이 앞서면 후회할 말이 나와요.",
      pros: ["문제를 정면으로 마주해 정리할 힘은 있어요."],
      cons: ["욱하는 이별·통보는 관계를 회복 불가로 만들어요.", "책임을 상대 탓으로만 돌리기 쉬워요."],
      advice: "결정은 감정이 가라앉은 뒤에. 헤어짐도 ‘대화’로 마무리해야 상처가 얕아요.",
    },
    중: {
      summary: "권태·소통 부족이 쌓이기 쉬운 시기예요. 방치하면 거리가 벌어져요.",
      pros: ["작은 노력으로도 관계를 다시 데울 수 있어요."],
      cons: ["‘알아주겠지’ 하는 침묵이 오해를 키워요."],
      advice: "불만을 참기보다 부드럽게 꺼내 보세요. 표현이 이별을 막습니다.",
    },
    약: {
      summary: "지금은 관계가 비교적 안정적이에요. 큰 위기 요소는 적어요.",
      pros: ["편안함이 오래가는 관계의 바탕이 돼요."],
      cons: ["안정에 기대 표현이 줄면 서서히 식을 수 있어요."],
      advice: "안정할수록 작은 표현을 챙기세요. 익숙함이 무심함이 되지 않게.",
    },
  },
  wealth: {
    anchor: (s) => s.wealth,
    강: {
      summary: "돈을 끌어오는 기운이 강해요. 기회를 현실 수익으로 바꾸는 감각이 좋아요.",
      pros: ["수입원·거래 기회가 잘 보여요.", "실속을 챙기는 현실 감각이 있어요."],
      cons: ["욕심이 커지면 무리한 투자로 새어나가요.", "돈 문제로 인간관계가 얽히기 쉬워요."],
      advice: "버는 것보다 ‘지키는 구조’가 관건. 감당 가능한 규모로만 벌리세요.",
    },
    중: {
      summary: "노력한 만큼 벌리는 무난한 재물 기운이에요. 한 방보다 꾸준함이 맞아요.",
      pros: ["성실하게 모으는 데 어울려요."],
      cons: ["큰 욕심·투기는 오히려 손실로 이어져요."],
      advice: "고정 수입을 지키며 작은 파이프라인을 늘리세요.",
    },
    약: {
      summary: "지금은 재물의 흐름이 조용해요. 확장보다 관리·절약의 시기예요.",
      pros: ["지출을 정리하고 체력을 비축하기 좋아요."],
      cons: ["무리한 대출·투자는 특히 조심해야 해요."],
      advice: "새로 벌이기보다 새는 곳을 막으세요. 지키는 것이 버는 것.",
    },
  },
  study: {
    anchor: (s) => s.resource + s.output * 0.5,   // 인성(학문)+식상(표현)
    강: {
      summary: "배우고 정리하는 기운이 좋아요. 집중과 흡수력이 살아나는 시기예요.",
      pros: ["장기 공부·자격·시험 준비에 유리해요.", "핵심을 정리하고 기억하는 힘이 좋아요."],
      cons: ["완벽주의로 시작이 늦어지기 쉬워요.", "인풋만 늘고 아웃풋(문제풀이·표현)이 밀릴 수 있어요."],
      advice: "‘완벽한 계획’보다 오늘의 한 챕터. 배운 걸 바로 써먹으세요.",
    },
    중: {
      summary: "무난한 학업 기운이에요. 루틴을 잡으면 성과가 안정적으로 쌓여요.",
      pros: ["꾸준히 하면 결과가 따라와요."],
      cons: ["집중이 흩어질 때 관리가 필요해요."],
      advice: "짧고 규칙적인 학습 블록을 정하세요. 리듬이 실력을 만듭니다.",
    },
    약: {
      summary: "지금은 집중이 흩어지기 쉬운 시기예요. 분량보다 방법이 중요해요.",
      pros: ["가볍게 기초를 다지고 흥미를 붙이기 좋아요."],
      cons: ["장시간 몰입은 쉽게 지쳐요."],
      advice: "짧게 자주, 환경부터 정리하세요. 작은 성취로 흐름을 만드세요.",
    },
  },
  document: {
    anchor: (s) => s.resource,       // 인성 = 문서·계약·부동산·자격
    강: {
      summary: "계약·문서·부동산·자격 등 ‘도장 찍는 일’에 기운이 붙어요.",
      pros: ["합격·승인·계약 성사의 기운이 있어요.", "자격·인증 취득에 유리해요."],
      cons: ["기운이 좋을수록 조건을 꼼꼼히 안 보고 서명하기 쉬워요.", "보증·명의 관련은 특히 신중해야 해요."],
      advice: "잘 풀릴 때일수록 계약서 조항을 두 번 확인. 명의·보증은 거리 두기.",
    },
    중: {
      summary: "무난한 문서 기운이에요. 준비를 갖추면 원하는 결과에 다가가요.",
      pros: ["서류·절차를 차근차근 밟기 좋아요."],
      cons: ["급하게 처리하면 실수·누락이 생겨요."],
      advice: "마감 전 여유를 두고 서류를 점검하세요.",
    },
    약: {
      summary: "지금은 문서·계약 운이 조용해요. 큰 서명은 때를 고르는 게 좋아요.",
      pros: ["준비·자료 정리에 집중하기 좋아요."],
      cons: ["서두른 계약·보증은 분쟁의 씨앗이 되기 쉬워요."],
      advice: "중요한 계약은 급하게 결정하지 말고 검토 시간을 확보하세요.",
    },
  },
};

/* 사업운 anchor 추가 */
C.business = {
  anchor: (s) => s.officer + s.wealth * 0.8 + s.output * 0.6,   // 관(직위)+재(수익)+식상(추진)
  강: {
    summary: "사업·확장의 기운이 강해요. 벌이고 키우는 데 운이 붙어요.",
    pros: ["새 사업·거래·확장에 유리해요.", "추진력과 수완이 성과로 이어져요."],
    cons: ["욕심이 커지면 무리한 확장으로 위험해져요.", "동업·자금 관리에서 갈등이 생기기 쉬워요."],
    advice: "벌이되 리스크를 나누세요. 계약·자금은 문서로 명확히.",
  },
  중: {
    summary: "무난한 사업 기운이에요. 기반을 다지며 한 걸음씩 키우기 좋아요.",
    pros: ["실무·거래를 착실히 쌓는 데 어울려요."],
    cons: ["큰 베팅보다 검증된 방식이 안전해요."],
    advice: "작게 시작해 데이터를 보고 키우세요.",
  },
  약: {
    summary: "지금은 확장보다 관리·준비의 시기예요. 무리한 시작은 조심.",
    pros: ["체력·자금을 비축하고 준비하기 좋아요."],
    cons: ["빚내서 벌이는 확장은 특히 위험해요."],
    advice: "지금은 지키고 배우는 때. 다음 기회를 위해 내실을 다지세요.",
  },
};
C.yearlove = C.love;   // 올해의 연애운 = 연애 십신 콘텐츠 재사용

/* 기간(월/년) 운세용 십신 그룹 테마 */
const GROUP_THEME = {
  비겁: { theme: "주도적으로 밀고 나가기 좋아요. 스스로 결정할수록 흐름이 붙어요.", love: "먼저 다가가기 좋지만 고집은 금물.", work: "주도권을 잡되 협업에선 공을 나눠요.", money: "지출·투자 욕구가 커요. 큰 결정은 미루기.", advice: "‘내가 한다’는 힘이 강해요. 주변과 보조를 맞추세요." },
  식상: { theme: "표현·활동·새 시도에 운이 따라요. 아이디어가 통합니다.", love: "매력 발산에 좋아요. 솔직한 표현이 통해요.", work: "기획·발표·콘텐츠에 유리해요.", money: "재능이 돈으로 이어질 기회.", advice: "떠오른 걸 실행에 옮기되 말실수는 조심." },
  재성: { theme: "돈·실속·인연에 기회가 열려요. 현실 감각이 살아나요.", love: "새 인연·설레는 만남이 생기기 쉬워요.", work: "성과·거래·실무에 유리해요.", money: "수입 기회가 보여요. 욕심만 눌러요.", advice: "기회를 잡되 감당 가능한 규모로." },
  관성: { theme: "책임·인정·중요한 일이 들어와요. 무게감이 커져요.", love: "진지한 관계·약속에 어울려요.", work: "승진·평가·중책에 좋아요.", money: "고정·의무 지출이 늘기 쉬워요.", advice: "책임 범위를 분명히 하고 압박은 나눠 지세요." },
  인성: { theme: "배우고 정리하고 회복하기 좋아요. 귀인의 도움도.", love: "안정적이고 편안한 교감에 어울려요.", work: "공부·문서·자격·준비에 유리해요.", money: "확장보다 지키고 관리하기 좋아요.", advice: "서두르지 말고 배움·휴식을 챙기되 실행은 미루지 마세요." },
};
const BRANCH_ELEM = ["water", "earth", "wood", "wood", "earth", "fire", "fire", "earth", "metal", "metal", "earth", "water"];
// 양력 월 → 월지 index (자0..해11): 절기 근사(참고용)
const MONTH_BRANCH = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0];
function sipOfElement(dayElem, el2) {
  if (el2 === dayElem) return "비겁";
  if (GEN[dayElem] === el2) return "식상";
  if (CTRL[dayElem] === el2) return "재성";
  if (CTRL_BY[dayElem] === el2) return "관성";
  return "인성";
}
function monthGroup(profile, month) { // month 1~12
  const br = MONTH_BRANCH[month - 1];
  return sipOfElement(profile.dayMasterElem, BRANCH_ELEM[br]);
}
// 그 달이 일간에게 얼마나 유리한지(행운의 달 계산용)
function monthFavor(profile, month, yong) {
  const br = MONTH_BRANCH[month - 1];
  const e = BRANCH_ELEM[br];
  let s = 50;
  if (yong.includes(e)) s += 22;                 // 용신 달
  if (RESOURCE[profile.dayMasterElem] === e) s += 10; // 인성
  if (CTRL_BY[profile.dayMasterElem] === e) s -= 8;   // 관성 압박
  return s + (month % 3) * 2;
}


/* ===== 취업 · 직장 / 재물 · 돈 확장 (십신 기반) ===== */
const C2 = {
  job: {
    anchor: (s) => s.officer + s.resource * 0.6,
    강: { summary: "조직·직장과 인연이 강한 사주예요. 자리를 얻는 힘(관성)과 나를 뒷받침하는 힘(인성)이 함께 있어 취업 문이 잘 열려요.",
      pros: ["서류·면접에서 ‘믿음직한 사람’으로 보이기 쉬워요.", "공채·공기업·대기업처럼 체계 있는 곳과 궁합이 좋아요.", "윗사람·추천인의 도움이 붙기 쉬워요."],
      cons: ["눈이 높아져 좋은 기회를 ‘애매하다’며 흘려보내기 쉬워요.", "합격 후 책임감에 짓눌려 번아웃이 오기 쉬워요."],
      advice: "지원 범위를 너무 좁히지 마세요. 붙고 나서 고르는 게 이 사주에 맞는 전략이에요." },
    중: { summary: "준비한 만큼 열리는 무난한 취업운이에요. 운보다 전략(지원 시기·직무 선택)이 결과를 크게 바꿔요.",
      pros: ["직무 경험·포트폴리오를 쌓으면 바로 효과가 나요.", "인턴·계약직에서 정규직으로 이어지는 길이 잘 맞아요."],
      cons: ["‘아무 데나’ 지원하면 합격해도 오래 못 버티기 쉬워요.", "비교하며 조급해지면 면접에서 긴장이 드러나요."],
      advice: "가고 싶은 직무를 2~3개로 정하고, 그 직무 언어로 자기소개서를 다시 써 보세요." },
    약: { summary: "조직에 들어가는 기운(관성)이 약한 편이라 공채 경쟁에서 시간이 걸릴 수 있어요. 대신 전문성·프리랜스·작은 조직에서 빛나는 타입이에요.",
      pros: ["자격증·기술처럼 ‘내 이름으로 증명되는 것’이 강한 무기가 돼요.", "스타트업·소규모 팀에서 빠르게 인정받기 쉬워요."],
      cons: ["대규모 공채에만 매달리면 지치기 쉬워요.", "틀에 맞춘 면접 답변이 오히려 매력을 가려요."],
      advice: "‘어디에 붙을까’보다 ‘무엇으로 증명할까’를 먼저 정하세요. 실력이 문을 열어 주는 사주예요." },
  },
  interview: {
    anchor: (s) => s.resource + s.officer * 0.5 + s.output * 0.3,
    강: { summary: "시험·면접에 강한 기운이에요. 문서(인성)와 평가(관성)의 기운이 받쳐 줘서 합격 소식을 듣기 좋은 사주예요.",
      pros: ["필기·서류처럼 정리된 평가에서 특히 강해요.", "면접관에게 ‘차분하고 준비된 사람’으로 보여요."],
      cons: ["완벽하게 준비하려다 지원 타이밍을 놓치기 쉬워요."],
      advice: "준비가 80%면 일단 지원하세요. 실전에서 더 잘하는 타입이에요." },
    중: { summary: "실력만큼 나오는 합격운이에요. 컨디션 관리와 말하기 연습이 당락을 가르기 쉬워요.",
      pros: ["모의 면접·스터디를 하면 실력이 빠르게 붙어요."],
      cons: ["긴장하면 말이 길어지거나 핵심을 놓치기 쉬워요."],
      advice: "답변은 ‘결론 → 근거 하나 → 경험 하나’로 짧게. 1분 답변 연습이 효과적이에요." },
    약: { summary: "평가 자리에서 긴장이 크게 오는 편이에요. 실력보다 결과가 덜 나오는 느낌이 들 수 있지만, 준비 방식으로 충분히 바꿀 수 있어요.",
      pros: ["실기·포트폴리오·과제형 전형처럼 결과물로 보여 주는 평가에서는 강해요."],
      cons: ["말로만 하는 면접에서 저평가되기 쉬워요.", "한 번 떨어지면 자신감이 크게 흔들려요."],
      advice: "면접에 ‘보여 줄 것’(작업물·숫자·사례)을 하나씩 들고 가세요. 말보다 증거가 대신 말해 줘요." },
  },
  jobchange: {
    anchor: (s) => s.output + s.peer * 0.6,
    강: { summary: "변화를 원하는 기운이 강해요. 지금 자리가 답답하게 느껴지고 이직·전직 욕구가 커지기 쉬운 사주예요.",
      pros: ["새 환경에서 빠르게 적응하고 존재감을 드러내요.", "연봉·조건 협상에서 할 말을 하는 힘이 있어요."],
      cons: ["감정적으로 사표를 내면 ‘옮겨도 똑같네’가 되기 쉬워요.", "자주 옮기면 경력이 흩어져 보여요."],
      advice: "이직은 ‘도망’이 아니라 ‘이동’이어야 해요. 다음 자리를 확정한 뒤 움직이세요." },
    중: { summary: "필요하면 옮길 수 있는 균형 잡힌 흐름이에요. 지금 자리에서 얻을 것을 다 얻었는지가 판단 기준이에요.",
      pros: ["경력을 쌓은 뒤 한 단계 올라가는 이직이 잘 맞아요."],
      cons: ["애매한 불만으로 옮기면 비슷한 문제가 반복돼요."],
      advice: "‘이직하면 무엇이 좋아지는지’를 숫자(연봉·시간·역할)로 적어 보세요. 답이 선명해져요." },
    약: { summary: "지금은 한 자리에서 버티며 쌓을 때예요. 변동보다 안정이 운을 키우는 시기예요.",
      pros: ["꾸준히 머무를수록 신뢰와 평판이 쌓여요."],
      cons: ["불만을 참기만 하면 어느 순간 크게 터질 수 있어요."],
      advice: "옮기기보다 지금 자리에서 역할·업무를 조정해 보세요. 그게 더 큰 기회를 불러요." },
  },
  promotion: {
    anchor: (s) => s.officer,
    강: { summary: "인정·승진의 기운이 뚜렷해요. 맡은 일이 커지고 이름이 알려지는 사주예요.",
      pros: ["책임 있는 자리·중요 프로젝트가 잘 들어와요.", "윗사람에게 ‘믿고 맡길 사람’으로 보여요."],
      cons: ["일이 몰려 과부하가 오기 쉬워요.", "평가에 예민해져 스스로를 몰아붙이기 쉬워요."],
      advice: "성과를 혼자 끌어안지 말고 팀의 성과로 보여 주세요. 그게 다음 자리로 이어져요." },
    중: { summary: "성과가 쌓이면 자연스럽게 올라가는 흐름이에요. 눈에 보이는 결과물이 열쇠예요.",
      pros: ["꾸준한 성과 기록이 평가로 이어지기 좋아요."],
      cons: ["일만 하고 드러내지 않으면 기회가 다른 사람에게 가요."],
      advice: "한 달에 한 번, 내가 한 일을 짧게 정리해 공유하세요. 보이는 성과가 승진을 불러요." },
    약: { summary: "조직 안에서의 승진보다 실력·전문성으로 인정받는 쪽이 잘 맞아요.",
      pros: ["전문가·실무 리더로서 존재감이 커요."],
      cons: ["사내 정치·눈치 싸움에서 손해를 보기 쉬워요."],
      advice: "직함보다 ‘이 일은 저 사람’ 하는 전문 분야를 하나 만드세요. 그게 승진보다 오래가요." },
  },
  coworker: {
    anchor: (s) => s.peer + s.resource * 0.4,
    강: { summary: "동료와 어울리는 힘이 강해요. 팀 안에서 내 편이 잘 생기는 사주예요.",
      pros: ["협업·팀 프로젝트에서 분위기를 이끌어요.", "어려울 때 도와줄 동료가 생겨요."],
      cons: ["경쟁심이 붙으면 같은 편과 부딪히기 쉬워요.", "공과 몫을 두고 미묘한 신경전이 생길 수 있어요."],
      advice: "공을 나누면 사람이 남아요. 칭찬은 공개적으로, 피드백은 따로 하세요." },
    중: { summary: "무난한 직장 인간관계예요. 적당한 거리감이 오히려 관계를 오래 가게 해요.",
      pros: ["업무 중심으로 깔끔하게 관계를 맺어요."],
      cons: ["친해지는 데 시간이 걸려 오해를 받기도 해요."],
      advice: "가벼운 인사·커피 한 잔 같은 작은 교류를 늘려 보세요." },
    약: { summary: "혼자 일하는 게 편한 타입이라 직장에서 외롭게 느껴질 수 있어요.",
      pros: ["독립적으로 맡은 일을 깔끔하게 끝내요."],
      cons: ["도움을 청하지 않아 혼자 짊어지기 쉬워요."],
      advice: "도움 요청도 능력이에요. 작은 부탁부터 해 보면 관계가 열려요." },
  },
  startup: {
    anchor: (s) => s.output + s.wealth,
    강: { summary: "아이디어를 돈으로 바꾸는 힘이 강해요. 내 일을 벌이는 창업·사업과 궁합이 좋은 사주예요.",
      pros: ["상품·서비스를 기획하고 파는 감각이 있어요.", "기회를 빨리 알아보고 실행해요."],
      cons: ["벌이는 속도가 빨라 자금·체력이 먼저 바닥날 수 있어요.", "동업 시 돈 문제가 관계를 흔들기 쉬워요."],
      advice: "작게 시작해서 반응을 확인하고 키우세요. 계약서는 친한 사이일수록 꼼꼼하게." },
    중: { summary: "준비된 창업이라면 해볼 만한 흐름이에요. 부업으로 먼저 검증하는 게 잘 맞아요.",
      pros: ["회사 다니며 사이드 프로젝트로 시작하면 성공률이 높아요."],
      cons: ["한 번에 크게 투자하면 부담이 커요."],
      advice: "첫 매출 10건을 먼저 만들어 보세요. 그다음에 규모를 정해도 늦지 않아요." },
    약: { summary: "지금은 혼자 사업을 벌이기보다 조직·파트너와 함께하는 쪽이 안전해요.",
      pros: ["좋은 파트너를 만나면 내 강점이 살아나요."],
      cons: ["혼자 자금·영업·운영을 다 맡으면 금방 지쳐요."],
      advice: "창업은 ‘언젠가’로 미뤄 두고, 지금은 그 분야의 경험과 사람을 모으세요." },
  },
  sidejob: {
    anchor: (s) => s.output + s.wealth * 0.4,
    강: { summary: "재능이 돈이 되는 사주예요. 부업·N잡·콘텐츠로 수입원을 늘리기 좋아요.",
      pros: ["글·디자인·영상·강의처럼 손끝 재능이 수익으로 이어져요.", "SNS·온라인 판매와 잘 맞아요."],
      cons: ["일을 너무 많이 벌여 본업이 흔들릴 수 있어요."],
      advice: "부업은 한 가지를 3개월 꾸준히. 여러 개를 동시에 하면 흐지부지돼요." },
    중: { summary: "부업으로 소소한 수입을 만들기 좋은 흐름이에요.",
      pros: ["본업과 연결된 부업(강의·컨설팅·외주)이 특히 잘 맞아요."],
      cons: ["수익보다 시간이 더 드는 일을 고르기 쉬워요."],
      advice: "시간당 수익을 계산해 보고, 내 시간을 가장 비싸게 쓰는 일을 고르세요." },
    약: { summary: "지금은 부업보다 본업에 집중하는 게 더 이득인 시기예요.",
      pros: ["본업 실력을 키우면 몸값 자체가 올라가요."],
      cons: ["부업에 체력을 쓰면 본업 성과가 떨어지기 쉬워요."],
      advice: "새 부업 대신 연봉 협상·자격증처럼 본업의 몸값을 올리는 데 투자하세요." },
  },
  windfall: {
    anchor: (s) => s.wealth + s.output * 0.5,
    강: { summary: "뜻밖의 돈이 들어오는 기운이 살아 있어요. 보너스·상여·부수입·당첨처럼 예상 밖의 수입이 생기기 쉬운 사주예요.",
      pros: ["사람을 통해 돈 될 정보·기회가 들어와요.", "타이밍을 잘 잡으면 한 번에 크게 버는 경험을 해요."],
      cons: ["쉽게 들어온 돈은 쉽게 나가요.", "‘한 방’을 노리다 손실을 볼 수 있어요."],
      advice: "뜻밖의 돈이 들어오면 절반은 바로 따로 떼어 두세요. 그게 진짜 재물이 돼요." },
    중: { summary: "작은 행운이 종종 찾아오는 흐름이에요. 크게 노리기보다 소소하게 즐기는 게 좋아요.",
      pros: ["포인트·환급·이벤트 같은 작은 이득을 잘 챙겨요."],
      cons: ["작은 이득을 좇다 큰 시간을 쓰기도 해요."],
      advice: "복권은 재미로만, 돈은 꾸준한 곳에서 벌어요." },
    약: { summary: "공짜 돈보다 땀 흘린 돈이 남는 사주예요. 대신 한 번 쌓으면 잘 안 무너져요.",
      pros: ["꾸준한 수입 구조를 만드는 데 강해요."],
      cons: ["투기·코인·도박성 투자와는 궁합이 나빠요."],
      advice: "‘쉽게 번다’는 제안은 일단 의심하세요. 이 사주는 성실함이 곧 횡재예요." },
  },
  saving: {
    anchor: (s) => Math.max(0, s.wealth + s.resource * 0.6 - s.peer * 0.7),
    강: { summary: "돈을 모으고 지키는 힘이 좋아요. 시간이 갈수록 자산이 불어나는 사주예요.",
      pros: ["계획적인 소비·저축 습관이 잘 자리 잡아요.", "부동산·적금처럼 묵히는 자산과 궁합이 좋아요."],
      cons: ["아끼는 데 집중하다 꼭 필요한 투자(자기계발·건강)를 미루기 쉬워요."],
      advice: "모으는 힘이 있으니, 모은 돈의 일부는 나를 키우는 데 쓰세요. 그게 더 큰 재물로 돌아와요." },
    중: { summary: "마음먹으면 모이는 흐름이에요. 자동이체 같은 ‘구조’가 의지를 대신해 줘요.",
      pros: ["목표가 분명하면 저축 속도가 붙어요."],
      cons: ["기분 따라 쓰는 날이 쌓이면 티가 나요."],
      advice: "월급날 바로 저축·투자 통장으로 먼저 빼 두세요. 남은 돈으로 사는 습관이 핵심이에요." },
    약: { summary: "들어온 돈이 사람·모임·충동구매로 잘 새는 사주예요. 버는 것보다 지키는 게 과제예요.",
      pros: ["사람에게 베푸는 만큼 인맥은 넓어져요."],
      cons: ["경조사·모임·한턱이 지출의 큰 구멍이 되기 쉬워요.", "보증·돈 빌려주기는 특히 조심해야 해요."],
      advice: "‘내 돈이 아닌 통장’을 하나 만들어 보이지 않게 모으세요. 돈 빌려주는 건 줄 수 있는 만큼만." },
  },
  invest: {
    anchor: (s) => s.wealth + s.peer * 0.5,
    강: { summary: "돈을 굴리는 감각이 있는 사주예요. 다만 욕심이 커지는 순간이 가장 위험해요.",
      pros: ["시장의 흐름을 빨리 읽고 기회를 잡아요.", "공부한 만큼 수익으로 연결돼요."],
      cons: ["수익이 나면 판을 키우다 한 번에 잃기 쉬워요.", "남의 말만 믿고 들어가면 손실이 커요."],
      advice: "투자 원칙(손절 기준·비중)을 미리 적어 두고 지키세요. 원칙이 이 사주의 안전벨트예요." },
    중: { summary: "공부한 만큼 버는 무난한 투자운이에요. 분산·장기가 맞아요.",
      pros: ["적립식·장기 투자에서 꾸준한 결과가 나요."],
      cons: ["단타·유행 종목에선 손해 보기 쉬워요."],
      advice: "모르는 곳엔 넣지 마세요. 내가 설명할 수 있는 곳에만 투자하세요." },
    약: { summary: "지금은 공격적인 투자보다 지키는 게 이득인 흐름이에요.",
      pros: ["예금·적금처럼 안전한 자산으로 차곡차곡 쌓는 데 맞아요."],
      cons: ["남들 따라 급하게 들어가면 손실로 이어지기 쉬워요."],
      advice: "투자는 공부부터. 소액으로 연습하며 나만의 기준을 만드는 시기예요." },
  },
  spending: {
    anchor: (s) => s.peer + s.output * 0.6,
    강: { summary: "돈이 새는 구멍이 뚜렷한 사주예요. 사람·기분·경험에 돈을 아끼지 않는 타입이에요.",
      pros: ["경험에 투자해 시야가 넓어요.", "베푸는 만큼 사람이 따라요."],
      cons: ["모임·선물·한턱 지출이 쌓여 월말에 놀라기 쉬워요.", "스트레스를 쇼핑으로 푸는 습관이 생기기 쉬워요."],
      advice: "‘기분 지출’ 예산을 따로 정해 두세요. 그 안에서는 마음껏 써도 괜찮아요." },
    중: { summary: "필요할 땐 쓰고 아낄 땐 아끼는 균형형이에요. 작은 구독·자동결제를 점검하면 충분해요.",
      pros: ["큰 지출 전에 한 번 더 따져 보는 습관이 있어요."],
      cons: ["작은 결제가 모여 생각보다 많이 나가요."],
      advice: "한 달에 한 번 카드 내역을 훑어보고, 안 쓰는 구독을 하나씩 끊어 보세요." },
    약: { summary: "돈 새는 곳이 적은 알뜰한 사주예요.",
      pros: ["충동구매가 적고 실속을 챙겨요."],
      cons: ["너무 아끼다 기회비용(시간·건강)을 놓치기 쉬워요."],
      advice: "아낀 만큼 가끔은 나를 위한 보상도 주세요. 그래야 오래 지켜져요." },
  },
};
const WORK_BY_GROUP = {
  비겁: { title: "독립·주도형", jobs: ["자영업·창업", "프리랜서", "영업·세일즈", "운동·스포츠 관련", "팀 리더·현장 관리"], why: "스스로 결정하고 밀고 나갈 때 힘이 나는 사주예요." },
  식상: { title: "표현·창작형", jobs: ["디자인·콘텐츠 크리에이터", "기획·마케팅", "강사·교육", "요리·뷰티·서비스", "개발·연구(아이디어 중심)"], why: "머릿속 아이디어를 밖으로 꺼낼 때 빛나는 사주예요." },
  재성: { title: "실무·재무형", jobs: ["금융·회계·재무", "무역·유통·MD", "부동산·자산관리", "경영·사업 관리", "데이터·분석"], why: "숫자·현실 감각이 좋아 성과를 돈으로 바꾸는 사주예요." },
  관성: { title: "조직·공공형", jobs: ["공무원·공기업", "대기업·관리직", "법·행정", "군·경찰·보안", "품질·안전 관리"], why: "체계 있는 조직에서 책임을 맡을 때 인정받는 사주예요." },
  인성: { title: "전문·지식형", jobs: ["연구원·교수·교사", "의료·상담·복지", "출판·문서·기록", "자격증 기반 전문직", "IT 설계·분석"], why: "배우고 정리하는 힘이 강해 전문성으로 승부하는 사주예요." },
};
const MONEY_TYPE = {
  강: { title: "큰 그릇 · 돈을 부르는 사주", line: "돈을 끌어오는 재성이 강해 기회 자체가 많아요. 관건은 ‘지키는 구조’예요." },
  중: { title: "차곡차곡 · 쌓아 올리는 사주", line: "한 방보다 꾸준함으로 부자가 되는 사주예요. 시간이 편이에요." },
  약: { title: "재능 환전형 · 실력으로 버는 사주", line: "돈을 좇기보다 실력·전문성을 키우면 돈이 따라오는 사주예요." },
};
function readCareerMoney(profile, id) {
  const meta = topicMeta(id);
  const s = sip(profile);
  const total = s.peer + s.output + s.wealth + s.officer + s.resource || 1;
  const luckyElem = RESOURCE[profile.dayMasterElem];
  const lucky = { luckyColor: ELEM_COLOR[luckyElem], luckyElem: ELEM_KR[luckyElem] };
  if (id === "worktype") {
    const map = { 비겁: s.peer, 식상: s.output, 재성: s.wealth, 관성: s.officer, 인성: s.resource };
    const order = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const g1 = WORK_BY_GROUP[order[0][0]], g2 = WORK_BY_GROUP[order[1][0]];
    return { kind: "saju", id, name: meta.name, score: 60 + Math.min(30, order[0][1] * 6), level: g1.title,
      summary: `${g1.title} — ${g1.why} 두 번째로 강한 기운은 ${g2.title}이라, 두 성향을 섞은 일이 특히 잘 맞아요.`,
      pros: [`잘 맞는 직업: ${g1.jobs.join(" · ")}`, `함께 보면 좋은 분야: ${g2.jobs.slice(0, 3).join(" · ")}`],
      cons: [order[4][1] === 0 ? `${order[4][0]} 기운이 비어 있어 ${{ 비겁: "혼자 밀어붙이는 일", 식상: "말·표현으로 승부하는 일", 재성: "숫자·영업 압박이 큰 일", 관성: "규율이 엄격한 조직", 인성: "오래 공부해야 하는 일" }[order[4][0]]}은 처음엔 버겁게 느껴질 수 있어요.` : "어느 한쪽으로 치우치지 않아 여러 분야를 넘나들 수 있지만, 그만큼 방향을 정하는 데 시간이 걸릴 수 있어요."],
      advice: "직업 이름보다 ‘하루를 어떻게 보내는 일인지’를 보고 고르세요. 사주가 가리키는 건 일하는 방식이에요.", ...lucky };
  }
  if (id === "moneytype") {
    const lv = level(s.wealth, total);
    const t = MONEY_TYPE[lv];
    return { kind: "saju", id, name: meta.name, score: Math.max(20, Math.min(92, scoreFor(lv, profile, id))), level: t.title,
      summary: t.line,
      pros: [s.output >= 2 ? "재능·기술(식상)이 돈을 만들어 주는 구조예요 — 실력이 곧 수입이에요." : "현실 감각으로 꾸준히 버는 구조예요.", s.resource >= 2 ? "문서·자격·부동산처럼 ‘묵히는 재산’과 인연이 있어요." : "현금 흐름을 잘 굴리는 편이에요."],
      cons: [s.peer >= 3 ? "비겁(경쟁·동료)이 강해 돈이 사람을 따라 새어 나가기 쉬워요. 동업·보증은 조심!" : "돈 문제로 크게 흔들릴 요소는 적지만, 큰 욕심은 금물이에요."],
      advice: lv === "강" ? "들어오는 돈의 30%는 무조건 자동으로 떼어 두세요." : lv === "중" ? "10년 단위 목표를 세우면 이 사주는 반드시 해내요." : "몸값(실력)을 올리는 데 쓰는 돈은 아끼지 마세요. 그게 이 사주의 재테크예요.", ...lucky };
  }
  const def = C2[id];
  const lv = level(def.anchor(s), total);
  const body = def[lv];
  return { kind: "saju", id, name: meta.name, score: Math.max(20, Math.min(92, scoreFor(lv, profile, id))), level: lv,
    summary: body.summary, pros: body.pros, cons: body.cons, advice: body.advice, ...lucky };
}
/* 올해 취업·합격이 잘 되는 달 / 돈 들어오는 달 */
function readTiming(profile, id, today) {
  const meta = topicMeta(id);
  const yr = today.getFullYear();
  const good = id === "jobmonth" ? { 관성: 26, 인성: 20, 식상: 6, 재성: 4, 비겁: -4 } : { 재성: 26, 식상: 18, 관성: 4, 인성: 0, 비겁: -8 };
  const yong = [RESOURCE[profile.dayMasterElem], profile.dayMasterElem];
  const scored = [];
  for (let m = 1; m <= 12; m++) {
    const g = monthGroup(profile, m);
    scored.push({ m, g, s: 40 + (good[g] || 0) + (monthFavor(profile, m, yong) - 50) * 0.5 });
  }
  const best = [...scored].sort((a, b) => b.s - a.s).slice(0, 3).map((x) => x.m).sort((a, b) => a - b);
  const nowM = today.getMonth() + 1;
  const next = best.find((m) => m >= nowM);
  const luckyElem = RESOURCE[profile.dayMasterElem];
  const why = id === "jobmonth"
    ? "관성(자리·합격)과 인성(문서·도움)의 달에 지원·면접을 몰아 보세요."
    : "재성(돈)과 식상(재능이 돈 되는) 기운의 달에 협상·판매·투자 결정을 배치해 보세요.";
  return {
    kind: "lucky", id, name: meta.name, label: `${yr}년 · ${id === "jobmonth" ? "취업·합격에 힘이 실리는 달" : "돈이 들어오는 달"}`,
    bestMonths: best,
    detail: scored.map((x) => ({ month: x.m, level: x.s >= 62 ? "좋음" : x.s >= 48 ? "무난" : "조용" })),
    advice: `${why} ${next ? `가장 가까운 기회는 ${next}월이에요 — 그 전 달부터 준비해 두면 좋아요.` : "올해 좋은 달은 지났지만, 내년 같은 기운의 달을 미리 준비해 두세요."} 조용한 달엔 무리한 승부보다 준비·공부를 권해요.`,
    luckyColor: ELEM_COLOR[luckyElem], luckyElem: ELEM_KR[luckyElem],
  };
}

/** 카탈로그 메타 */
export const TOPICS = [
  // 시간대별 종합
  { id: "today", name: "오늘의 운세", cost: 1, kind: "daily", blurb: "오늘 하루의 흐름·연애·일·돈·행운" },
  { id: "tomorrow", name: "내일의 운세", cost: 1, kind: "daily", blurb: "내일 하루 미리 보기" },
  { id: "weekday", name: "이번 평일 운세", cost: 1, kind: "daily", blurb: "이번 주 평일의 전반 흐름" },
  { id: "weekend", name: "이번 주말 운세", cost: 1, kind: "daily", blurb: "다가오는 주말의 기운" },
  { id: "month", name: "이달의 운세", cost: 2, kind: "period", blurb: "이번 달 전반의 흐름" },
  { id: "nextmonth", name: "다음달 운세", cost: 2, kind: "period", blurb: "다음 달 미리 보기" },
  { id: "year", name: "올해의 운세", cost: 3, kind: "period", blurb: "이번 해 전체 흐름" },
  // 연애운 — 시간대별
  { id: "todaylove", name: "오늘의 연애운", cost: 1, kind: "lovetime", blurb: "오늘 연애·인연의 기운" },
  { id: "tomorrowlove", name: "내일의 연애운", cost: 1, kind: "lovetime", blurb: "내일 연애·인연의 기운" },
  { id: "daylove", name: "지정일 연애운", cost: 2, kind: "lovetime", blurb: "데이트·고백할 날의 연애운" },
  { id: "monthlove", name: "이달의 연애운", cost: 2, kind: "lovetime", blurb: "이번 달 연애·인연 흐름" },
  { id: "yearlove", name: "올해의 연애운", cost: 3, kind: "saju", blurb: "올해 인연·매력·관계의 전반 흐름" },
  // 명식 기반 카테고리
  { id: "reunion", name: "재회운", cost: 3, kind: "saju", blurb: "다시 이어질 가능성과 조건" },
  { id: "breakup", name: "이별운", cost: 3, kind: "saju", blurb: "관계의 위기 신호와 지키는 법" },
  { id: "wealth", name: "재물운", cost: 2, kind: "saju", blurb: "돈의 흐름·기회·관리 포인트" },
  { id: "business", name: "사업운", cost: 2, kind: "saju", blurb: "확장·거래·자금의 기운" },
  { id: "study", name: "학업운", cost: 2, kind: "saju", blurb: "집중·시험·자격의 기운" },
  { id: "document", name: "문서운", cost: 2, kind: "saju", blurb: "계약·합격·부동산·자격" },
  // 행운의 달
  // 취업 · 직장
  { id: "job", name: "취업운", cost: 2, kind: "career", blurb: "취업 문이 열리는 힘·전략" },
  { id: "jobmonth", name: "올해 취업·합격 시기", cost: 3, kind: "timing", blurb: "지원·면접을 몰아야 할 달" },
  { id: "interview", name: "면접·합격운", cost: 2, kind: "career", blurb: "시험·면접에서의 강점과 약점" },
  { id: "worktype", name: "나에게 맞는 직업", cost: 3, kind: "career", blurb: "사주로 보는 일하는 방식·직업군" },
  { id: "jobchange", name: "이직운", cost: 2, kind: "career", blurb: "옮길 때인지, 버틸 때인지" },
  { id: "promotion", name: "승진·인정운", cost: 2, kind: "career", blurb: "성과가 평가로 이어지는 힘" },
  { id: "coworker", name: "직장 인간관계운", cost: 2, kind: "career", blurb: "동료·상사와의 궁합" },
  { id: "startup", name: "창업운", cost: 2, kind: "career", blurb: "내 일을 벌여도 될까" },
  // 재물 · 돈
  { id: "moneymonth", name: "올해 돈 들어오는 달", cost: 3, kind: "timing", blurb: "수입·기회가 몰리는 달" },
  { id: "moneytype", name: "나의 재물 그릇", cost: 3, kind: "career", blurb: "타고난 돈 버는 방식" },
  { id: "windfall", name: "횡재·부수입운", cost: 2, kind: "career", blurb: "뜻밖의 돈이 들어올까" },
  { id: "saving", name: "돈 모으는 운", cost: 2, kind: "career", blurb: "저축·자산이 쌓이는 힘" },
  { id: "invest", name: "투자운", cost: 2, kind: "career", blurb: "돈을 굴려도 될까" },
  { id: "spending", name: "돈이 새는 곳", cost: 2, kind: "career", blurb: "지출 구멍과 막는 법" },
  { id: "sidejob", name: "부업·N잡운", cost: 2, kind: "career", blurb: "재능이 돈이 되는 길" },
  { id: "h1lucky", name: "상반기 행운의 달", cost: 2, kind: "lucky", blurb: "1~6월 중 기운 좋은 달" },
  { id: "h2lucky", name: "하반기 행운의 달", cost: 2, kind: "lucky", blurb: "7~12월 중 기운 좋은 달" },
];
export function topicMeta(id) { return TOPICS.find((t) => t.id === id); }

/** 카테고리 해석 생성 */
export function readTopic(profile, id, today = new Date()) {
  const meta = topicMeta(id);
  if (!meta) return null;
  if (meta.kind === "daily") return readDaily(profile, id, today);
  if (meta.kind === "period") return readPeriod(profile, id, today);
  if (meta.kind === "lovetime") return readLoveTime(profile, id, today);
  if (meta.kind === "lucky") return readLucky(profile, id, today);
  if (meta.kind === "career") return readCareerMoney(profile, id);
  if (meta.kind === "timing") return readTiming(profile, id, today);

  const s = sip(profile);
  const def = C[id];
  const total = s.peer + s.output + s.wealth + s.officer + s.resource || 1;
  const raw = def.anchor(s, profile.gender || profile.sex);
  const lv = level(raw, total);
  const body = def[lv];
  const luckyElem = RESOURCE[profile.dayMasterElem];
  return {
    kind: "saju", id, name: meta.name, emoji: meta.emoji,
    score: Math.max(20, Math.min(92, scoreFor(lv, profile, id))),
    level: lv,
    summary: body.summary, pros: body.pros, cons: body.cons, advice: body.advice,
    luckyColor: ELEM_COLOR[luckyElem], luckyElem: ELEM_KR[luckyElem],
  };
}

const MONTH_NAMES = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

function readPeriod(profile, id, today) {
  const meta = topicMeta(id);
  const luckyElem = RESOURCE[profile.dayMasterElem];
  if (id === "year") {
    const yr = today.getFullYear();
    const g = monthGroup(profile, ((yr % 12) || 12)); // 근사 연 십신
    const t = GROUP_THEME[g];
    const months = luckyTop(profile, 1, 12, 3);
    return {
      kind: "period", id, name: meta.name, label: `${yr}년`,
      group: g, score: 52 + (yr % 5) * 4,
      theme: t.theme, love: t.love, work: t.work, money: t.money, advice: t.advice,
      goodMonths: months,
      luckyColor: ELEM_COLOR[luckyElem], luckyElem: ELEM_KR[luckyElem],
    };
  }
  // month / nextmonth
  const d = new Date(today);
  if (id === "nextmonth") d.setMonth(d.getMonth() + 1);
  const m = d.getMonth() + 1;
  const g = monthGroup(profile, m);
  const t = GROUP_THEME[g];
  return {
    kind: "period", id, name: meta.name, label: `${d.getFullYear()}년 ${MONTH_NAMES[m - 1]}`,
    group: g, score: monthFavor(profile, m, [luckyElem]) + 4,
    theme: t.theme, love: t.love, work: t.work, money: t.money, advice: t.advice,
    luckyColor: ELEM_COLOR[luckyElem], luckyElem: ELEM_KR[luckyElem],
  };
}

function readLoveTime(profile, id, today) {
  const meta = topicMeta(id);
  const luckyElem = RESOURCE[profile.dayMasterElem];
  if (id === "todaylove" || id === "tomorrowlove" || id === "daylove") {
    const target = new Date(today);
    if (id === "tomorrowlove") target.setDate(target.getDate() + 1);
    const f = todayFortune(profile, target);
    const label = id === "todaylove" ? "오늘" : id === "tomorrowlove" ? "내일" : `${target.getMonth() + 1}월 ${target.getDate()}일`;
    return {
      kind: "lovetime", id, name: meta.name, label, date: f.date, iljin: f.iljin,
      score: 50 + (target.getDate() % 40),
      headline: f.love,
      love: f.love,
      tip: `${label}은 ` + (/\b매력|먼저|솔직/.test(f.love) ? "먼저 표현해도 좋은 날" : "무리하지 말고 편안하게 다가가는 날") + "이에요.",
      luckyColor: f.luckyColor, luckyElem: f.luckyElem,
    };
  }
  // monthlove
  const d = new Date(today);
  const m = d.getMonth() + 1;
  const g = monthGroup(profile, m);
  const t = GROUP_THEME[g];
  return {
    kind: "lovetime", id, name: meta.name, label: `${MONTH_NAMES[m - 1]}`,
    score: monthFavor(profile, m, [luckyElem]) + (m % 4) * 2,
    headline: t.love,
    love: t.love,
    tip: `이번 달은 ${g} 기운이 도드라져요. ${g === "재성" ? "새 인연·설렘의 기회가 늘어요." : g === "관성" ? "진지한 관계로 나아가기 좋아요." : g === "인성" ? "편안하고 안정적인 교감에 어울려요." : g === "식상" ? "매력을 드러내기 좋아요." : "먼저 다가가되 고집은 조심."}`,
    luckyColor: ELEM_COLOR[luckyElem], luckyElem: ELEM_KR[luckyElem],
  };
}

function luckyTop(profile, from, to, n) {
  const yong = [RESOURCE[profile.dayMasterElem], profile.dayMasterElem];
  const arr = [];
  for (let m = from; m <= to; m++) arr.push({ m, s: monthFavor(profile, m, yong) });
  arr.sort((a, b) => b.s - a.s);
  return arr.slice(0, n).map((x) => x.m).sort((a, b) => a - b);
}

function readLucky(profile, id, today) {
  const meta = topicMeta(id);
  const half = id === "h1lucky" ? [1, 6] : [7, 12];
  const yong = [RESOURCE[profile.dayMasterElem], profile.dayMasterElem];
  const scored = [];
  for (let m = half[0]; m <= half[1]; m++) scored.push({ m, s: monthFavor(profile, m, yong) });
  scored.sort((a, b) => b.s - a.s);
  const best = scored.slice(0, 2).map((x) => x.m).sort((a, b) => a - b);
  const luckyElem = RESOURCE[profile.dayMasterElem];
  return {
    kind: "lucky", id, name: meta.name, label: id === "h1lucky" ? "상반기(1~6월)" : "하반기(7~12월)",
    bestMonths: best,
    detail: scored.sort((a, b) => a.m - b.m).map((x) => ({ month: x.m, level: x.s >= 68 ? "좋음" : x.s >= 55 ? "무난" : "조용" })),
    advice: `${best.map((m) => MONTH_NAMES[m - 1]).join("·")}에 중요한 일·시작·만남을 배치하면 기운이 받쳐 줘요. 반대로 조용한 달엔 무리한 확장보다 준비를 권해요.`,
    luckyColor: ELEM_COLOR[luckyElem], luckyElem: ELEM_KR[luckyElem],
  };
}

function readDaily(profile, id, today) {
  const target = new Date(today);
  if (id === "tomorrow") target.setDate(target.getDate() + 1);
  else if (id === "weekday") { // 다음 평일
    do { target.setDate(target.getDate() + (target.getDay() === 5 ? 3 : target.getDay() === 6 ? 2 : 1)); } while (target.getDay() === 0 || target.getDay() === 6);
  } else if (id === "weekend") { // 다가오는 토요일
    const add = (6 - target.getDay() + 7) % 7 || 7;
    target.setDate(target.getDate() + (target.getDay() === 6 ? 0 : add));
  }
  const f = todayFortune(profile, target);
  const meta = topicMeta(id);
  const label = id === "today" ? "오늘" : id === "tomorrow" ? "내일" : id === "weekday" ? "이번 평일" : "이번 주말";
  return {
    kind: "daily", id, name: meta.name, emoji: meta.emoji, label,
    date: f.date, iljin: f.iljin, iljinH: f.iljinH,
    theme: f.theme, love: f.love, work: f.work, money: f.money, advice: f.advice,
    luckyColor: f.luckyColor, luckyElem: f.luckyElem,
  };
}

/* ===== 평생 · 올해 · 이번 달 · 오늘 · 내일 — 토픽별 기간 운세 ===== */
const GOD_GROUP = { 비견: "비겁", 겁재: "비겁", 식신: "식상", 상관: "식상", 정재: "재성", 편재: "재성", 정관: "관성", 편관: "관성", 정인: "인성", 편인: "인성" };
const FAMILY_OF = {
  job: "job", interview: "job", promotion: "job", study: "study", document: "study",
  jobchange: "change", coworker: "people", startup: "biz", sidejob: "biz", business: "biz",
  wealth: "money", windfall: "money", invest: "money", saving: "save", spending: "spend",
};
const FAMILY = {
  job: { w: { 관성: 26, 인성: 18, 식상: 4, 재성: 8, 비겁: -8 }, t: {
    관성: "자리·평가의 기운이 들어와요. 지원·면접·보고처럼 ‘평가받는 일’에 힘이 실려요.",
    인성: "서류·추천·도움의 기운이에요. 자기소개서·자격 준비·윗사람 연락이 잘 풀려요.",
    식상: "말과 표현이 살아나요. 면접에서 내 강점을 드러내기 좋지만 말실수는 조심.",
    재성: "실무·성과가 눈에 띄어요. 숫자로 보여 줄 수 있는 경험을 정리해 두세요.",
    비겁: "경쟁자가 많아지는 흐름이에요. 남과 비교하기보다 나만의 무기 하나에 집중하세요." } },
  study: { w: { 인성: 26, 관성: 16, 식상: 6, 재성: -6, 비겁: 2 }, t: {
    인성: "머리에 쏙쏙 들어오는 때예요. 공부·자격·문서 일이 잘 풀려요.",
    관성: "시험·평가·마감이 몰려요. 계획표대로만 가면 결과가 나요.",
    식상: "아이디어·발표에 강해요. 정리한 걸 말로 설명해 보면 기억이 오래가요.",
    재성: "현실 일(돈·약속)에 마음이 흩어지기 쉬워요. 공부 시간을 먼저 떼어 두세요.",
    비겁: "함께 공부하면 힘이 나요. 스터디·같이 하는 사람이 도움이 돼요." } },
  change: { w: { 식상: 24, 비겁: 14, 재성: 8, 인성: 0, 관성: -10 }, t: {
    식상: "변화 욕구가 커지고 새 판을 짜기 좋아요. 이직 준비를 시작하기 좋은 때.",
    비겁: "‘내가 결정한다’는 힘이 강해요. 조건 협상·결단에 유리해요.",
    재성: "더 나은 조건이 눈에 들어와요. 연봉·조건을 비교해 보기 좋아요.",
    인성: "당장 옮기기보다 정보를 모을 때예요. 경력 정리·포트폴리오 준비를.",
    관성: "지금 자리의 책임이 무거워져요. 섣불리 그만두기보다 버티며 쌓을 때." } },
  people: { w: { 비겁: 22, 인성: 16, 식상: 8, 재성: 2, 관성: -4 }, t: {
    비겁: "동료와 어울리는 기운이 커요. 같이 밥 먹고 협업하기 좋아요.",
    인성: "윗사람·선배의 도움이 들어와요. 조언을 구하면 길이 열려요.",
    식상: "분위기 메이커가 되기 좋아요. 다만 농담이 지나치지 않게.",
    재성: "일·성과 중심으로 관계가 흘러가요. 공은 나눌수록 좋아요.",
    관성: "평가·눈치가 신경 쓰이는 때예요. 선을 지키며 조용히 내 일 하기." } },
  biz: { w: { 식상: 24, 재성: 22, 관성: 4, 인성: 0, 비겁: -8 }, t: {
    식상: "아이디어가 돈이 되는 흐름이에요. 상품·콘텐츠를 내놓기 좋아요.",
    재성: "매출·거래·계약 기회가 와요. 가격·조건을 분명히 하세요.",
    관성: "규칙·신고·계약서 같은 형식을 챙길 때예요.",
    인성: "확장보다 공부·준비가 맞아요. 시장 조사를 해 두세요.",
    비겁: "동업·경쟁으로 돈이 나뉘기 쉬워요. 돈 얘기는 문서로." } },
  money: { w: { 재성: 28, 식상: 18, 관성: 2, 인성: -2, 비겁: -14 }, t: {
    재성: "돈이 들어오는 기운이 강해요. 수입·기회·뜻밖의 이득이 생기기 쉬워요.",
    식상: "재능·부지런함이 돈이 되는 때예요. 일한 만큼 들어와요.",
    관성: "고정 지출·의무가 늘기 쉬워요. 큰 결정보다 관리에 집중.",
    인성: "돈보다 문서·공부·준비에 운이 쏠려요. 계약서는 꼼꼼히.",
    비겁: "돈이 사람·모임으로 새기 쉬워요. 빌려주기·보증·충동구매 주의!" } },
  save: { w: { 인성: 20, 재성: 18, 관성: 10, 식상: -4, 비겁: -16 }, t: {
    인성: "지키고 모으기 좋은 흐름이에요. 저축·적금 시작하기 좋아요.",
    재성: "들어오는 돈이 있어요. 들어온 날 바로 떼어 두면 쌓여요.",
    관성: "계획대로 쓰는 힘이 생겨요. 예산표를 짜 보세요.",
    식상: "사고 싶은 게 많아지는 때예요. 장바구니에 하루 묵혀 두기.",
    비겁: "모임·선물·한턱으로 돈이 새기 쉬워요. 이번엔 지갑을 단속하세요." } },
  spend: { w: { 비겁: -22, 식상: -12, 재성: 6, 관성: 10, 인성: 14 }, t: {
    비겁: "지출 경보! 사람·모임·기분 지출이 커지기 쉬워요.",
    식상: "경험·취미·쇼핑에 돈이 나가기 쉬워요. 예산을 정해 두세요.",
    재성: "들어오는 만큼 나가는 흐름이에요. 큰돈은 하루 생각하고 결정.",
    관성: "고정비·의무 지출이 드러나요. 구독·보험을 점검하기 좋아요.",
    인성: "돈 새는 곳이 적은 차분한 때예요. 아끼기 좋아요." } },
};
export function isPeriodTopic(id) { return !!FAMILY_OF[id]; }
export const PERIODS = [
  { id: "life", label: "평생" }, { id: "year", label: "올해" }, { id: "month", label: "이번 달" },
  { id: "today", label: "오늘" }, { id: "tomorrow", label: "내일" },
];
export function readTopicPeriod(profile, id, period, today = new Date()) {
  const fam = FAMILY[FAMILY_OF[id]];
  if (!fam) return null;
  const d = new Date(today);
  if (period === "tomorrow") d.setDate(d.getDate() + 1);
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const t = computeSajuLite(period === "year" ? `${d.getFullYear()}-06-15` : period === "month" ? `${ymd.slice(0, 8)}15` : ymd);
  const pillar = period === "year" ? t.pillars.year : period === "month" ? t.pillars.month : t.pillars.day;
  const god = tenGodLite(profile.pillars.day.stemIdx, pillar.stemIdx);
  const grp = GOD_GROUP[god];
  // 지지도 한 번 더 — 같은 그룹이면 힘이 실림
  const bGod = BRANCH_GROUP(profile.dayMasterElem, pillar.branchIdx);
  let score = 58 + (fam.w[grp] || 0) * 0.9 + (fam.w[bGod] || 0) * 0.35;
  score = Math.round(Math.max(22, Math.min(95, score)));
  const label = period === "year" ? `${d.getFullYear()}년` : period === "month" ? `${d.getFullYear()}년 ${d.getMonth() + 1}월` : `${period === "today" ? "오늘" : "내일"} · ${d.getMonth() + 1}월 ${d.getDate()}일`;
  const head = score >= 75 ? "기운이 크게 받쳐 줘요" : score >= 60 ? "무난하게 흘러가요" : score >= 45 ? "조금 조심할 때예요" : "쉬어 가는 게 좋아요";
  return {
    label, god, group: grp, gz: pillar.gz, hanja: pillar.hanja, score, head,
    line: fam.t[grp],
    sub: bGod && bGod !== grp ? fam.t[bGod] : "",
    tip: score >= 60 ? "기운이 받쳐 줄 때 미뤄 둔 일을 하나 실행해 보세요." : "무리한 결정은 미루고, 준비와 정리에 시간을 쓰세요.",
  };
}
const STEM_E = ["wood", "wood", "fire", "fire", "earth", "earth", "metal", "metal", "water", "water"];
function tenGodLite(a, b) {
  const eD = STEM_E[a], eT = STEM_E[b], same = (a % 2) === (b % 2);
  if (eT === eD) return same ? "비견" : "겁재";
  if (GEN[eD] === eT) return same ? "식신" : "상관";
  if (CTRL[eD] === eT) return same ? "편재" : "정재";
  if (CTRL[eT] === eD) return same ? "편관" : "정관";
  return same ? "편인" : "정인";
}
function BRANCH_GROUP(dayElem, branchIdx) { return sipOfElement(dayElem, BRANCH_ELEM[branchIdx]); }
