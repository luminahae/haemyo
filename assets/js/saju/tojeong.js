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

  const up = ((age + lunar.month) % 8) + 1;                    // 1~8 상괘
  const mid = ((lunar.day + yBranch) % 6) + 1;                 // 1~6 중괘
  const low = ((lunar.month + lunar.day + yStem) % 3) + 1;     // 1~3 하괘
  const gwaeNo = (up - 1) * 18 + (mid - 1) * 3 + low;          // 1~144

  const p = PAL[up];
  const score = 46 + ((7 - Math.abs(4 - up)) * 4) + (mid % 3) * 3 + (low - 2) * 2;
  const luckyElem = RESOURCE[profile.dayMasterElem];

  // 강조 달 — 괘수 기반 결정적 선택
  const months = [];
  for (let i = 0; i < 3; i++) months.push(((gwaeNo + i * 4) % 12) + 1);

  return {
    year, gwaeNo, gwae: `${up}·${mid}·${low}`, palName: p.name, palSym: p.sym, verse: p.verse,
    score: Math.max(28, Math.min(92, score)),
    summary: p.summary, pros: p.pros, cons: p.cons, advice: p.advice,
    goodMonths: months.sort((a, b) => a - b),
    luckyColor: ELEM_COLOR[luckyElem], luckyElem: ELEM_KR[luckyElem],
  };
}
