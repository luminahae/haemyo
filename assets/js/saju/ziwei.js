/* =========================================================
   자미두수(紫微斗數) 명반 계산 엔진.
   - 음력 월·일·시 기반. (사주와 달리 입춘이 아니라 음력 정월/설날 기준의
     년간지를 사용한다.)
   - 명궁/신궁 → 오행국(납음) → 자미성 안성 → 14주성 배치 → 12궁 → 보조성 → 사화.
   - 궁 index 기준: 0=寅, 1=卯 … 순행. palaceBranch(i) = (i+2)%12 (자=0).
   - 자미성 안성법은 iztro(오픈소스)와 검색 예제(22일·목3국→亥)로 검증한 표준식.
   ========================================================= */

import { solarToLunar } from "./lunar.js";

const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const BRANCH_H = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const STEM_H = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];

// 12궁 이름 (명궁부터 역행)
const PALACE_NAMES = ["명궁", "형제궁", "부처궁", "자녀궁", "재백궁", "질액궁",
  "천이궁", "노복궁", "관록궁", "전택궁", "복덕궁", "부모궁"];

// 납음 오행 (60갑자 30쌍) → 국
const NAYIN_ELEM = [
  "금", "화", "목", "토", "금", "화", "수", "토", "금", "목",
  "수", "토", "화", "목", "수", "금", "화", "목", "토", "금",
  "화", "수", "토", "금", "목", "수", "토", "화", "목", "수",
];
const ELEM_TO_BUREAU = { 수: 2, 목: 3, 금: 4, 토: 5, 화: 6 };
const BUREAU_NAME = { 2: "수이국(水二局)", 3: "목삼국(木三局)", 4: "금사국(金四局)", 5: "토오국(土五局)", 6: "화육국(火六局)" };

const mod = (n, m) => ((n % m) + m) % m;
const fix = (i) => mod(i, 12);
const palaceBranch = (idx) => (idx + 2) % 12; // 궁 index → 지지 index(자=0)

// 사화표: 년간 → [화록, 화권, 화과, 화기] (中州派 표준)
const SIHUA = {
  갑: ["염정", "파군", "무곡", "태양"],
  을: ["천기", "천량", "자미", "태음"],
  병: ["천동", "천기", "문창", "염정"],
  정: ["태음", "천동", "천기", "거문"],
  무: ["탐랑", "태음", "우필", "천기"],
  기: ["무곡", "탐랑", "천량", "문곡"],
  경: ["태양", "무곡", "태음", "천동"],
  신: ["거문", "태양", "문곡", "문창"],
  임: ["천량", "자미", "좌보", "무곡"],
  계: ["파군", "거문", "태음", "탐랑"],
};
const SIHUA_LABEL = ["화록(祿)", "화권(權)", "화과(科)", "화기(忌)"];

// 녹존 지지 (년간)
const LU_BRANCH = { 갑: "인", 을: "묘", 병: "사", 정: "오", 무: "사", 기: "오", 경: "신", 신: "유", 임: "해", 계: "자" };

export function computeZiwei(input) {
  // 1) 음력 월·일 + 윤달 + 시지
  let lunar;
  if (input.calendarType === "lunar") {
    const [y, m, d] = input.birthDate.split("-").map(Number);
    lunar = { year: y, month: m, day: d, isLeap: !!input.leapMonth };
  } else {
    const [y, m, d] = input.birthDate.split("-").map(Number);
    lunar = solarToLunar(y, m, d, 9);
  }
  const month = lunar.month;
  const day = lunar.day;

  // 시지: 미상이면 午시(정오) 가정 + 플래그
  const timeUnknown = !!input.timeUnknown;
  const hh = timeUnknown ? 12 : Number((input.birthTime || "12:00").split(":")[0]);
  const mm = timeUnknown ? 0 : Number((input.birthTime || "12:00").split(":")[1]);
  const hourIndex = mod(Math.floor((hh * 60 + mm + 60) / 120), 12); // 子=0

  // 2) 년간지 (음력 정월 기준)
  const yStem = mod(lunar.year - 1984, 10);
  const yBranch = mod(lunar.year - 1984, 12);
  const yearStemKr = STEMS[yStem];

  // 3) 명궁·신궁 (index 0=寅)
  const mingIndex = fix((month - 1) - hourIndex);
  const shenIndex = fix((month - 1) + hourIndex);

  // 4) 명궁 천간 → 오행국(납음)
  const tigerStem = mod(yStem * 2 + 2, 10); // 五虎遁: 寅궁 천간
  const mingBranch = palaceBranch(mingIndex);
  const stepsFromYin = mod(mingBranch - 2, 12);
  const mingStem = mod(tigerStem + stepsFromYin, 10);
  const k = sexagenary(mingStem, mingBranch);
  const bureau = ELEM_TO_BUREAU[NAYIN_ELEM[Math.floor(k / 2)]];

  // 5) 자미성 안성
  const ziweiIndex = ziweiStart(bureau, day);
  const tianfuIndex = fix(12 - ziweiIndex);

  // 6) 14주성 배치
  const stars = {}; // palaceIndex → [{name, sihua}]
  const put = (name, idx) => { (stars[idx] = stars[idx] || []).push({ name }); };
  // 자미계열 (역행)
  put("자미", fix(ziweiIndex));
  put("천기", fix(ziweiIndex - 1));
  put("태양", fix(ziweiIndex - 3));
  put("무곡", fix(ziweiIndex - 4));
  put("천동", fix(ziweiIndex - 5));
  put("염정", fix(ziweiIndex - 8));
  // 천부계열 (순행)
  put("천부", fix(tianfuIndex));
  put("태음", fix(tianfuIndex + 1));
  put("탐랑", fix(tianfuIndex + 2));
  put("거문", fix(tianfuIndex + 3));
  put("천상", fix(tianfuIndex + 4));
  put("천량", fix(tianfuIndex + 5));
  put("칠살", fix(tianfuIndex + 6));
  put("파군", fix(tianfuIndex + 10));

  // 7) 주요 보조성
  put("좌보", fix(2 + (month - 1)));
  put("우필", fix(8 - (month - 1)));
  put("문창", fix(8 - hourIndex));
  put("문곡", fix(2 + hourIndex));
  const luBranch = BRANCHES.indexOf(LU_BRANCH[yearStemKr]);
  const luIdx = fix(luBranch - 2);
  put("녹존", luIdx);
  put("경양", fix(luIdx + 1));
  put("타라", fix(luIdx - 1));

  // 8) 사화 부여
  const sihuaMap = {}; // starName → label
  const sh = SIHUA[yearStemKr];
  sh.forEach((starName, i) => { sihuaMap[starName] = SIHUA_LABEL[i]; });
  for (const idx of Object.keys(stars)) {
    for (const s of stars[idx]) if (sihuaMap[s.name]) s.sihua = sihuaMap[s.name];
  }

  // 9) 12궁 조립
  const palaces = [];
  for (let i = 0; i < 12; i++) {
    palaces.push({
      index: i,
      branch: BRANCHES[palaceBranch(i)],
      branchH: BRANCH_H[palaceBranch(i)],
      name: PALACE_NAMES[fix(mingIndex - i)],
      isMing: i === mingIndex,
      isShen: i === shenIndex,
      stars: (stars[i] || []),
    });
  }

  // 명궁 주성 (없으면 공궁 → 대궁 차성)
  const mingStars = (stars[mingIndex] || []).map((s) => s.name);
  const oppStars = (stars[fix(mingIndex + 6)] || []).map((s) => s.name);

  return {
    isZiwei: true,
    lunar, hourIndex,
    yearGZ: STEMS[yStem] + BRANCHES[yBranch],
    yearGZH: STEM_H[yStem] + BRANCH_H[yBranch],
    mingIndex, shenIndex,
    mingBranch: BRANCHES[palaceBranch(mingIndex)],
    shenBranch: BRANCHES[palaceBranch(shenIndex)],
    bureau, bureauName: BUREAU_NAME[bureau],
    ziweiBranch: BRANCHES[palaceBranch(ziweiIndex)],
    palaces,
    mingStars, oppStars,
    sihua: sh.map((star, i) => ({ label: SIHUA_LABEL[i], star })),
    timeUnknown,
  };
}

/* 자미성 시작 궁 index (iztro 검증식) */
function ziweiStart(bureau, day) {
  let remainder = -1, offset = -1, quotient = 0;
  do {
    offset++;
    const divisor = day + offset;
    quotient = Math.floor(divisor / bureau);
    remainder = divisor % bureau;
  } while (remainder !== 0);
  quotient %= 12;
  let idx = quotient - 1;
  idx += offset % 2 === 0 ? offset : -offset;
  return fix(idx);
}

/* 천간(0-9)·지지(0-11) → 60갑자 index(0-59) */
function sexagenary(stem, branch) {
  for (let t = 0; t < 6; t++) {
    const kk = stem + 10 * t;
    if (kk % 12 === branch) return kk;
  }
  return 0;
}
