/* =========================================================
   원국 엔진 (HAE) — 사주 원국 한눈에 보기용 "계산 전용" 모듈
   - 화면(UI)은 이 결과만 받아서 보여 줘요. 여기에는 DOM 코드가 없어요.
   - 네 기둥 · 십성 · 지장간 · 십이운성(일간 기준/자좌 기준) · 납음
   - 형·충·회·합(천간합·천간충·육합·삼합·방합·충·형·자형·해·파·원진)
     → 성립 여부와 완성 여부를 나눠서, 어떤 글자끼리 왜 묶였는지 근거와 함께
   - 신살·공망 → 산출 근거 + 전통적 해석
   - 오행 분포 → 계산 방식 + 신강·신약
   - 대운·세운 → 각 운의 십성 · 십이운성 · 원국과의 관계 변화
   기둥 순서: 0 시주 · 1 일주 · 2 월주 · 3 년주 (화면 순서와 같음)
   ========================================================= */
import { tenGod } from "./fortune.js";
import { analyzeStrength } from "./strength.js";
import { SINSAL_MEANING } from "./manseryeok.js";

export const STEM_H = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
export const STEM_KR = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
export const BRANCH_H = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
export const BRANCH_KR = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const ANIMAL = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];
const STEM_ELEM = ["wood", "wood", "fire", "fire", "earth", "earth", "metal", "metal", "water", "water"];
const BRANCH_ELEM = ["water", "earth", "wood", "wood", "earth", "fire", "fire", "earth", "metal", "metal", "earth", "water"];
export const ELEMS = ["wood", "fire", "earth", "metal", "water"];
export const ELEM_KR = { wood: "목(木)", fire: "화(火)", earth: "토(土)", metal: "금(金)", water: "수(水)" };
const ELEM_K1 = { wood: "목", fire: "화", earth: "토", metal: "금", water: "수" };
const K1_ELEM = { 목: "wood", 화: "fire", 토: "earth", 금: "metal", 수: "water" };
const GEN = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
const CTRL = { wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" };
const POS = ["시주", "일주", "월주", "년주"];
const POS1 = ["시", "일", "월", "년"];
const POS_MEAN = ["말년·자녀·결과", "나 자신·배우자 자리", "부모·형제·사회(청년기)", "조상·집안·어린 시절"];
const mod = (n, m) => ((n % m) + m) % m;
const bh = (b) => `${BRANCH_H[b]}(${BRANCH_KR[b]})`;
const sh = (s) => `${STEM_H[s]}(${STEM_KR[s]})`;

/* ---------- 지장간 · 십이운성 · 납음 ---------- */
const JIJANG = [[8, 9], [9, 7, 5], [4, 2, 0], [0, 1], [1, 9, 4], [4, 6, 2], [2, 5, 3], [3, 1, 5], [4, 8, 6], [6, 7], [7, 3, 4], [4, 0, 8]];
const CHANGSAENG = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3];
export const STAGES12 = ["장생", "목욕", "관대", "건록", "제왕", "쇠", "병", "사", "묘", "절", "태", "양"];
const NAPEUM = ["해중금", "노중화", "대림목", "노방토", "검봉금", "산두화", "간하수", "성두토", "백랍금", "양류목",
  "정천수", "옥상토", "벽력화", "송백목", "장류수", "사중금", "산하화", "평지목", "벽상토", "금박금",
  "복등화", "천하수", "대역토", "채천금", "상자목", "대계수", "사중토", "천상화", "석류목", "대해수"];
const NAPEUM_H = ["海中金", "爐中火", "大林木", "路傍土", "劍鋒金", "山頭火", "澗下水", "城頭土", "白蠟金", "楊柳木",
  "泉中水", "屋上土", "霹靂火", "松柏木", "長流水", "沙中金", "山下火", "平地木", "壁上土", "金箔金",
  "覆燈火", "天河水", "大驛土", "釵釧金", "桑柘木", "大溪水", "沙中土", "天上火", "石榴木", "大海水"];
function sexIdx(s, b) { for (let n = 0; n < 60; n++) if (n % 10 === s && n % 12 === b) return n; return 0; }
/** 십이운성 — 양간은 순행, 음간은 역행(양순음역) */
export function stageOf(stem, branch) { const dir = stem % 2 === 0 ? 1 : -1; return STAGES12[mod((branch - CHANGSAENG[stem]) * dir, 12)]; }
const mainStem = (b) => JIJANG[b][JIJANG[b].length - 1];

/** 십이운성 풀이 — 12단계 모두 (사·묘 포함). 글자 뜻 그대로(죽음·무덤) 읽지 않아요. */
export const STAGE_INFO = {
  장생: { h: "長生", power: "중강", life: "갓 태어난 아기", key: "시작·성장·사랑받음", desc: "새싹이 돋는 자리예요. 배우는 속도가 빠르고 주변의 도움을 잘 받아요. 순수하고 낙천적이지만, 보호받는 데 익숙하면 의존적일 수 있어요." },
  목욕: { h: "沐浴", power: "중", life: "처음 씻기고 꾸미는 아이", key: "멋·호기심·감수성", desc: "처음 세상에 몸을 드러내는 자리라 멋과 유행, 새로운 것에 관심이 많아요. 감각적이고 매력적이지만 마음이 쉽게 흔들려 끈기가 숙제예요." },
  관대: { h: "冠帶", power: "강", life: "관을 쓰는 청년", key: "의욕·자존심·도전", desc: "어른이 되어 갓을 쓰는 청년기예요. 자신감과 추진력이 넘치고 승부욕이 강해요. 경험보다 의욕이 앞서 고집·마찰을 조심하면 좋아요." },
  건록: { h: "建祿", power: "강", life: "직장을 얻은 성인", key: "자립·성실·실력", desc: "스스로 녹(월급)을 받는 자리예요. 남에게 기대지 않고 실력으로 자리를 잡는 자수성가형. 책임감이 크고 꾸준해요." },
  제왕: { h: "帝旺", power: "최강", life: "정상에 선 왕", key: "정점·리더십·주도권", desc: "기운이 가장 센 정점이에요. 주도하고 이끄는 힘이 크지만, 꼭대기 다음은 내리막이라 겸손과 완급 조절이 필요해요." },
  쇠: { h: "衰", power: "중", life: "노련해진 중년", key: "노련함·신중·안정", desc: "힘이 정점에서 내려와 노련함으로 바뀐 자리예요. 앞에 나서기보다 경험으로 판단하고, 무리하지 않는 안정형이에요." },
  병: { h: "病", power: "약", life: "기력이 줄어든 노년", key: "배려·감수성·공감", desc: "몸의 기운이 약해진 대신 마음이 섬세해진 자리예요. 남의 아픔을 잘 알아 돌봄·상담·예술에 재능이 있어요. 체력 관리가 숙제예요." },
  사: { h: "死", power: "약", life: "몸이 멈추고 정신이 남은 때", key: "사색·집중·정신세계", desc: "몸의 움직임은 멈추고 정신이 깨어 있는 자리예요. 생각이 깊고 한 가지를 파고드는 집중력·연구심이 강해요. 철학·종교·예술·기술처럼 머리를 쓰는 분야에 맞고, 한번 정하면 잘 안 바꾸는 고집이 있어요. ※ 실제 죽음·불행과는 관계없어요." },
  묘: { h: "墓", power: "약(저장)", life: "창고에 넣어 둔 보물", key: "저장·절약·관리·전통", desc: "묘(墓)는 ‘곳간·창고(庫)’ 자리예요. 모으고 지키고 관리하는 힘이 커서 저축·자산 관리·연구·기록·전통을 다루는 일에 강해요. 한 우물을 깊게 파지만, 집착과 미련은 덜어 내면 좋아요. ※ 무덤이라는 뜻 그대로 해석하지 않아요." },
  절: { h: "絶", power: "최약", life: "끊어지고 다시 시작하는 때", key: "단절·전환·새 출발", desc: "이전 흐름이 끊기고 새것이 들어오는 자리예요. 변화가 잦고 결단이 빠르며, 새로운 환경에 적응하는 힘이 있어요. 마음이 쉽게 바뀌는 건 조심." },
  태: { h: "胎", power: "약", life: "막 잉태된 생명", key: "가능성·계획·호기심", desc: "새 생명이 잉태된 자리예요. 아이디어와 가능성이 많고 계획을 잘 세워요. 아직 형태가 없으니 실행으로 옮기는 연습이 필요해요." },
  양: { h: "養", power: "중", life: "뱃속에서 자라는 아기", key: "보호·준비·인복", desc: "엄마 뱃속에서 길러지는 자리예요. 주변의 보살핌과 인복이 있고, 서두르지 않고 차근차근 준비해서 때를 기다리는 힘이 있어요." },
};
export const STAGE_BASIS = {
  ilgan: { title: "일간 기준 (봉법 · 逢法)", desc: "나(일간)가 각 기둥의 지지를 만났을 때 얼마나 힘을 쓰는지 봐요. ‘그 자리(시기·사람)에서 내가 어떤 모습이 되는가’ — 보통 사주 앱이 보여 주는 십이운성이 이것이에요." },
  jajwa: { title: "천간 기준 (자좌·自坐 · 거법)", desc: "각 기둥의 천간이 자기 바로 아래 지지에 앉은 상태를 봐요. ‘그 기둥(년=조상·월=부모·시=자녀) 자체의 힘’을 읽을 때 써요." },
  rule: "양간 甲·丙·戊·庚·壬은 순행, 음간 乙·丁·己·辛·癸는 역행으로 세는 ‘양순음역’ 방식이에요. (음간도 양간과 같이 세는 학파도 있어요)",
};

/* ---------- 관계 표 ---------- */
const STEM_HAP = { "0-5": { el: "earth", name: "중정지합(中正之合)" }, "1-6": { el: "metal", name: "인의지합(仁義之合)" }, "2-7": { el: "water", name: "위엄지합(威嚴之合)" }, "3-8": { el: "wood", name: "인수지합(仁壽之合)" }, "4-9": { el: "fire", name: "무정지합(無情之合)" } };
const STEM_CHUNG = ["0-6", "1-7", "2-8", "3-9"];
const YUKHAP = { "0-1": "earth", "2-11": "wood", "3-10": "fire", "4-9": "metal", "5-8": "water", "6-7": "fire" };
const SAMHAP = [
  { b: [8, 0, 4], el: "water", name: "申子辰 수국(水局)", key: "지혜·소통·유연함·이동" },
  { b: [2, 6, 10], el: "fire", name: "寅午戌 화국(火局)", key: "열정·표현·명예·확장" },
  { b: [11, 3, 7], el: "wood", name: "亥卯未 목국(木局)", key: "성장·배움·기획·인정" },
  { b: [5, 9, 1], el: "metal", name: "巳酉丑 금국(金局)", key: "결단·원칙·실리·전문성" },
];
const BANGHAP = [
  { b: [2, 3, 4], el: "wood", name: "寅卯辰 동방 목(木)", season: "봄", key: "같은 계절의 결속 — 추진·성장의 세력" },
  { b: [5, 6, 7], el: "fire", name: "巳午未 남방 화(火)", season: "여름", key: "같은 계절의 결속 — 열기·표현의 세력" },
  { b: [8, 9, 10], el: "metal", name: "申酉戌 서방 금(金)", season: "가을", key: "같은 계절의 결속 — 결실·결단의 세력" },
  { b: [11, 0, 1], el: "water", name: "亥子丑 북방 수(水)", season: "겨울", key: "같은 계절의 결속 — 지혜·저장의 세력" },
];
const HYEONG3 = [
  { b: [2, 5, 8], name: "寅巳申 삼형", sub: "지세지형(恃勢之刑)", key: "힘을 믿고 밀어붙이다 부딪힘", mean: "추진력·권력 지향이 강한 만큼 경쟁·법·규칙 문제로 마찰이 생기기 쉽다고 봐요. 의료·법·군경처럼 ‘형(刑)을 다루는’ 일로 쓰면 장점이 된다고도 해요." },
  { b: [1, 10, 7], name: "丑戌未 삼형", sub: "무은지형(無恩之刑)", key: "은혜를 모르고 서운함이 쌓임", mean: "가까운 사이에서 베푼 만큼 돌아오지 않는 서운함, 고집 대 고집의 마찰로 해석해요. 토(土) 창고끼리라 재산·가족 문제와 엮이기도 해요." },
];
const JAMYO = [0, 3];
const SELF_HYEONG = [4, 6, 9, 11];
const HAE = [[0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10]];
const PA = [[0, 9], [6, 3], [4, 1], [10, 7], [2, 11], [8, 5]];
const WONJIN = [[0, 7], [1, 6], [2, 9], [3, 8], [4, 11], [5, 10]];
const WONJIN_STORY = { "0-7": "쥐는 양의 배설물(냄새)을 싫어한다", "1-6": "소는 말이 일은 안 하고 노는 걸 싫어한다", "2-9": "호랑이는 닭 울음(새벽)을 싫어한다", "3-8": "토끼는 원숭이의 엉덩이를 보면 싫어한다", "4-11": "용은 돼지의 코(얼굴)를 싫어한다", "5-10": "뱀은 개 짖는 소리를 싫어한다" };
const CHUNG_KEY = { "0-6": "물·불의 정면충돌 — 감정과 이성, 마음의 흔들림", "1-7": "토 창고끼리의 충 — 재산·집안 일의 재정리", "2-8": "생지(生地)끼리의 충 — 이동·이사·직업 변동", "3-9": "목·금의 충 — 관계·환경의 급한 변화", "4-10": "토 창고끼리의 충 — 창고가 열려 묵은 것이 정리됨", "5-11": "생지(生地)끼리의 충 — 분주한 이동·역마" };
const key2 = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
const inPair = (list, a, b) => list.some((p) => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));
const yukhapPartner = (b) => { for (const k of Object.keys(YUKHAP)) { const [x, y] = k.split("-").map(Number); if (x === b) return y; if (y === b) return x; } return null; };

/** 관계가 어떻게 생기는지 — 관계 사전 (화면의 ‘관계 설명’ 탭에서 그대로 사용) */
export const REL_GUIDE = [
  { type: "천간합", h: "天干合", tone: "good", how: "열 천간을 둥글게 놓았을 때 다섯 칸 떨어진 양간과 음간이 짝을 이뤄요(甲己·乙庚·丙辛·丁壬·戊癸). 양간이 극(剋)하는 음간을 아내로 맞는 ‘부부의 합’이라고 불러요.", rule: "합이 되면 서로 묶여 본래 역할이 줄어요(합거·合去). 태어난 달(월령)이 합해서 나오는 오행을 도와줘야 실제로 오행이 바뀌는 ‘합화(合化)’가 된다고 봐요.", mean: "끌림·약속·계약·협력. 일간이 합하면 정이 많고 사람에게 잘 묶이는 성향으로 읽어요." },
  { type: "천간충", h: "天干沖", tone: "warn", how: "일곱 번째 천간끼리(甲庚·乙辛·丙壬·丁癸), 같은 음양이면서 서로 극하고 방위도 정반대라 부딪혀요. 戊·己(중앙 토)는 충이 없어요.", rule: "가까운 기둥끼리일수록 작용이 커요. 생각·계획(천간)의 충돌이라 겉으로 드러나는 갈등으로 봐요.", mean: "의견 충돌·방향 전환·결단." },
  { type: "육합", h: "六合", tone: "good", how: "열두 지지를 원으로 놓고 위아래로 마주 보는 두 글자가 짝이에요(子丑·寅亥·卯戌·辰酉·巳申·午未). 해가 지나가는 자리(월건)와 북두칠성 자루가 가리키는 자리(월장)가 만나는 짝이라고 설명해요.", rule: "두 글자가 있으면 ‘묶임’은 성립. 합해서 나온 오행을 월지나 천간이 받쳐 주면 합화(合化)가 강해져요. 바로 옆 기둥끼리면 힘이 크고 떨어지면 약해요.", mean: "1:1의 친밀함·결속·숨은 인연." },
  { type: "삼합", h: "三合", tone: "good", how: "같은 오행의 생지(장생)·왕지(제왕)·고지(묘) 세 글자가 원 위에서 120°씩 떨어진 정삼각형을 이뤄요. 예) 水는 申에서 태어나(장생) 子에서 가장 세고(제왕) 辰에 저장돼요(묘) → 申子辰.", rule: "세 글자가 다 있으면 ‘완성(국·局)’, 왕지를 포함한 두 글자면 ‘반합(半合)’, 왕지 없이 생지+고지면 묶음이 약해 학파에 따라 인정하지 않아요. 빠진 한 글자가 대운·세운으로 오면 그때 완성돼요.", mean: "공동의 목표를 향한 사회적 결합 — 팀·조직·큰 흐름." },
  { type: "반합", h: "半合", tone: "good", how: "삼합 세 글자 중 두 글자만 모인 거예요. 가운데 가장 센 글자(왕지 子·午·卯·酉)와 한 글자가 만나면 반합이 돼요. 예) 寅午(화국 반합), 午戌(화국 반합).", rule: "왕지가 낀 두 글자는 반합으로 인정해요. 왕지 없이 생지+고지(예: 寅戌)만 있으면 묶음이 약해 학파에 따라 인정하지 않아요. 빠진 한 글자가 대운·세운으로 오면 삼합이 완성돼요.", mean: "아직 다 모이지 않은 팀 — 방향은 정해졌고 마지막 한 사람을 기다리는 모양이에요." },
  { type: "방합", h: "方合", tone: "good", how: "같은 계절(같은 방위)의 세 지지가 모여요. 寅卯辰=봄·동쪽 木, 巳午未=여름·남쪽 火, 申酉戌=가을·서쪽 金, 亥子丑=겨울·북쪽 水.", rule: "세 글자가 다 있어야 완성. 두 글자만 있으면 그 계절 기운이 조금 모인 정도로 봐요. 삼합보다 혈연·가족·동류의 결속에 가까워요.", mean: "같은 무리의 세력 — 가족·동료·고향." },
  { type: "충", h: "沖", tone: "warn", how: "원에서 정반대(180°, 여섯 칸 떨어진) 두 지지예요. 子午·丑未·寅申·卯酉·辰戌·巳亥 — 대부분 오행끼리도 서로 극해요.", rule: "가까운 기둥(특히 월지·일지)끼리일수록 크게 봐요. 합이 함께 있으면 합이 충을 풀거나(合解沖), 충이 합을 깨기도(沖破合) 해요.", mean: "변화·이동·분리·재정리. 나쁜 일만이 아니라 ‘움직여야 풀리는’ 힘이에요." },
  { type: "형", h: "刑", tone: "warn", how: "삼합 글자와 방합 글자를 위아래로 맞대어 생겨요. 申子辰(삼합)과 寅卯辰(방합)을 맞대면 申↔寅, 子↔卯, 辰↔辰 / 寅午戌과 巳午未 → 寅↔巳, 午↔午, 戌↔未 / 巳酉丑과 申酉戌 → 巳↔申, 酉↔酉, 丑↔戌 / 亥卯未와 亥子丑 → 亥↔亥, 卯↔子, 未↔丑. 여기서 寅巳申(지세지형)·丑戌未(무은지형)·子卯(무례지형)·辰午酉亥 자형(自刑)이 나와요.", rule: "寅巳申·丑戌未는 세 글자가 다 있으면 ‘삼형 완성’, 두 글자면 ‘형 성립(2/3)’. 子卯는 두 글자로 성립. 자형은 같은 글자가 두 번 있을 때예요.", mean: "조정·교정·수술·법 — 바로잡는 과정의 마찰. 의료·법·기술 분야에선 오히려 재능으로 봐요." },
  { type: "해", h: "害", tone: "warn", how: "내 육합 짝을 충(沖)해서 합을 깨뜨리는 글자와의 관계예요. 예) 子는 丑과 합하는데 未가 丑을 충하므로 子와 未는 해(害·천穿이라고도 해요).", rule: "다른 관계보다 작용은 은근하고 약해요. 가까이 붙어 있을 때 더 느껴져요.", mean: "보이지 않는 방해·서운함·관계의 틈." },
  { type: "파", h: "破", tone: "warn", how: "양(陽) 지지는 거꾸로 세 칸, 음(陰) 지지는 앞으로 세 칸(90°) 떨어진 글자예요. 子酉·午卯·申巳·寅亥·辰丑·戌未.", rule: "작용이 가장 약한 관계라 참고로만 봐요. 다른 합·충과 겹칠 때만 의미를 더해요.", mean: "작은 균열·계획 변경." },
  { type: "12신살", h: "十二神殺", tone: "good", how: "년지(태어난 해의 띠)가 속한 삼합을 기준으로, 열두 지지에 겁살부터 화개살까지 열두 기운을 차례로 붙여요. 삼합의 생지를 충하는 글자가 역마살, 왕지 다음 글자가 도화살, 고지가 화개살, 왕지가 장성살이에요.", rule: "보통 년지 기준으로 보고, 일지 기준을 함께 보기도 해요. 같은 신살도 어느 기둥에 있느냐에 따라 뜻이 달라져요.", mean: "겁살·재살·천살(조심) · 지살·역마살(이동) · 도화살(매력) · 월살(정체) · 망신살(노출) · 장성살(리더십) · 반안살(안정·승진) · 육해살(소모) · 화개살(예술·학문)." },
  { type: "원진", h: "怨嗔", tone: "warn", how: "충 자리의 바로 옆 글자예요(子未·丑午·寅酉·卯申·辰亥·巳戌). ‘쥐는 양의 냄새를 싫어한다’처럼 띠 동물 이야기로 전해져요.", rule: "주로 일지·월지 사이나 궁합에서 봐요.", mean: "미워하면서도 끌리는 애증, 괜한 서운함." },
];

function adjacency(i, j) { const d = Math.abs(i - j); return d === 1 ? { near: true, txt: "바로 옆 기둥이라 작용이 커요" } : { near: false, txt: `${d}칸 떨어진 기둥이라 작용은 약한 편이에요` }; }

/** 원국 안의 형·충·회·합 — 성립/완성 구분 + 근거 */
function natalRelations(cols, ds, monthB) {
  const out = [];
  const stemsElems = cols.filter(Boolean).map((c) => STEM_ELEM[c.s]);
  const node = (i, kind) => ({ i, kind, pos: POS[i], pos1: POS1[i], h: kind === "s" ? STEM_H[cols[i].s] : BRANCH_H[cols[i].b], kr: kind === "s" ? STEM_KR[cols[i].s] : BRANCH_KR[cols[i].b] });
  const label = (n) => `${n.pos1}${n.kind === "s" ? "간" : "지"} ${n.h}(${n.kr})`;
  const idx = [0, 1, 2, 3].filter((i) => cols[i]);
  // 천간
  for (let x = 0; x < idx.length; x++) for (let y = x + 1; y < idx.length; y++) {
    const i = idx[x], j = idx[y], a = cols[i].s, b = cols[j].s, k = key2(a, b);
    const A = node(i, "s"), B = node(j, "s"), adj = adjacency(i, j);
    if (STEM_HAP[k]) {
      const el = STEM_HAP[k].el, hwa = BRANCH_ELEM[monthB] === el;
      out.push({ cat: "stem", type: "천간합", tone: "good", nodes: [A, B], name: `${A.h}${B.h} 합 → ${ELEM_KR[el]}`, sub: STEM_HAP[k].name, status: "formed", statusLabel: hwa ? "합화(合化) 성립" : "합 성립 · 묶임", have: 2, need: 2, element: el,
        keyword: hwa ? `두 글자가 ${ELEM_K1[el]} 기운으로 바뀌어 힘을 합쳐요` : "서로 끌려 묶이고, 각자 역할은 조금 약해져요",
        basis: `${label(A)}와 ${label(B)}는 다섯 칸 떨어진 양간·음간 짝이라 천간합이에요.`,
        rule: `${adj.txt}. 월지 ${bh(monthB)}가 ${BRANCH_ELEM[monthB] === el ? `${ELEM_KR[el]}이라 합화 조건을 갖췄어요` : `${ELEM_KR[BRANCH_ELEM[monthB]]}이라 합화(오행 변화)까지는 안 되고 ‘묶임’으로 봐요`}.${(i === 1 || j === 1) ? " 일간(나)이 합하는 경우라 나 자신이 그 글자와 정으로 묶이는 성향이에요." : ""}`,
        mean: REL_GUIDE[0].mean });
    } else if (STEM_CHUNG.includes(k)) {
      out.push({ cat: "stem", type: "천간충", tone: "warn", nodes: [A, B], name: `${A.h}${B.h} 충`, status: "formed", statusLabel: "충 성립", have: 2, need: 2,
        keyword: "생각·방향이 정면으로 부딪혀요", basis: `${label(A)}와 ${label(B)}는 일곱 번째 천간끼리(같은 음양·상극·정반대 방위)라 충이에요.`, rule: adj.txt + ".", mean: REL_GUIDE[1].mean });
    }
  }
  // 지지 — 쌍 관계
  for (let x = 0; x < idx.length; x++) for (let y = x + 1; y < idx.length; y++) {
    const i = idx[x], j = idx[y], a = cols[i].b, b = cols[j].b, k = key2(a, b);
    const A = node(i, "b"), B = node(j, "b"), adj = adjacency(i, j);
    const both = `${label(A)}와 ${label(B)}`;
    if (a === b) {
      if (SELF_HYEONG.includes(a)) out.push({ cat: "branch", type: "자형", tone: "warn", nodes: [A, B], name: `${A.h}${B.h} 자형(自刑)`, status: "formed", statusLabel: "자형 성립", have: 2, need: 2,
        keyword: "스스로를 몰아붙이고 자책하기 쉬워요", basis: `같은 글자 ${bh(a)}가 두 번 있어요. ${bh(a)}는 삼합·방합을 맞댈 때 자기 자신과 마주 보는 글자(辰·午·酉·亥)라 자형이에요.`, rule: adj.txt + ".", mean: "같은 기운이 넘쳐 스스로 부딪힘 — 완벽주의·자책. 자기 기준을 조금 낮추면 편해져요." });
      continue;
    }
    if (Math.abs(a - b) === 6) out.push({ cat: "branch", type: "충", tone: "warn", nodes: [A, B], name: `${A.h}${B.h} 충`, status: "formed", statusLabel: "충 성립", have: 2, need: 2,
      keyword: CHUNG_KEY[k], basis: `${both}는 원에서 정반대(여섯 칸) 자리라 충이에요.`, rule: `${adj.txt}.${(i === 1 && j === 2) || (i === 2 && j === 1) ? " 월지·일지 충이라 생활 환경(집·직장) 변화로 크게 느끼는 자리예요." : ""}`, mean: REL_GUIDE[5].mean });
    if (YUKHAP[k]) {
      const el = YUKHAP[k], hwa = BRANCH_ELEM[monthB] === el || stemsElems.includes(el);
      out.push({ cat: "branch", type: "육합", tone: "good", nodes: [A, B], name: `${A.h}${B.h} 합 → ${ELEM_KR[el]}`, status: "formed", statusLabel: hwa ? "합 성립 · 합화 조건 있음" : "합 성립 · 묶임", have: 2, need: 2, element: el,
        keyword: "1:1로 끈끈하게 묶이는 친밀함", basis: `${both}는 원 위에서 위아래로 마주 보는 육합 짝이에요.`,
        rule: `${adj.txt}. ${hwa ? `월지나 천간에 ${ELEM_KR[el]} 기운이 있어 합해서 ${ELEM_K1[el]}으로 변하는 힘이 있어요.` : `${ELEM_KR[el]}을 받쳐 주는 글자가 없어 오행이 바뀌기보다는 서로 묶이는 정도예요.`}${a + b === 13 ? " (午未합은 화·토 두 가지로 보는 학파가 있어요)" : ""}`, mean: REL_GUIDE[2].mean });
    }
    if (JAMYO.includes(a) && JAMYO.includes(b)) out.push({ cat: "branch", type: "형", tone: "warn", nodes: [A, B], name: "子卯 형", sub: "무례지형(無禮之刑)", status: "formed", statusLabel: "형 성립", have: 2, need: 2,
      keyword: "예의·선을 넘는 마찰", basis: `${both}는 亥卯未(삼합)와 亥子丑(방합)을 맞댈 때 卯↔子로 마주 보는 짝이라 형이에요.`, rule: adj.txt + ".", mean: "가까운 사이일수록 말과 태도의 선을 지키는 게 중요하다고 봐요." });
    if (inPair(HAE, a, b)) {
      const pa = yukhapPartner(a);
      out.push({ cat: "branch", type: "해", tone: "warn", nodes: [A, B], name: `${A.h}${B.h} 해`, status: "formed", statusLabel: "해 성립", have: 2, need: 2,
        keyword: "보이지 않는 방해·서운함", basis: `${bh(a)}의 육합 짝은 ${bh(pa)}인데, ${bh(b)}가 ${bh(pa)}를 충해서 합을 깨뜨려요. 그래서 ${both}는 해(害)예요.`, rule: adj.txt + ".", mean: REL_GUIDE[7].mean });
    }
    if (inPair(PA, a, b)) out.push({ cat: "branch", type: "파", tone: "warn", nodes: [A, B], name: `${A.h}${B.h} 파`, status: "formed", statusLabel: "파 성립 (약함)", have: 2, need: 2, weak: true,
      keyword: "작은 균열·계획 변경", basis: `${both}는 90°(세 칸) 떨어진 파(破) 짝이에요.`, rule: "작용이 약해 참고로만 봐요.", mean: REL_GUIDE[8].mean });
    if (inPair(WONJIN, a, b)) out.push({ cat: "branch", type: "원진", tone: "warn", nodes: [A, B], name: `${A.h}${B.h} 원진`, status: "formed", statusLabel: "원진 성립", have: 2, need: 2,
      keyword: "미워하면서 끌리는 애증", basis: `${both}는 충 자리 바로 옆 글자라 원진이에요. (${WONJIN_STORY[k] || ""})`, rule: adj.txt + ".", mean: REL_GUIDE[9].mean });
  }
  // 지지 — 세 글자 묶음(삼합·방합·삼형): 몇 글자 있는지 + 완성 여부
  const groupRel = (g, type) => {
    const nodes = idx.filter((i) => g.b.includes(cols[i].b)).map((i) => node(i, "b"));
    const have = new Set(nodes.map((n) => BRANCH_H.indexOf(n.h)));
    if (have.size < 2) return null;
    const missing = g.b.filter((b) => !have.has(b));
    return { nodes, have: have.size, missing };
  };
  for (const g of SAMHAP) {
    const r = groupRel(g, "삼합"); if (!r) continue;
    const wang = g.b[1], full = r.have === 3, withWang = r.missing.every((m) => m !== wang);
    const statusLabel = full ? "완성 (3/3)" : withWang ? "반합 (2/3)" : "생지+고지 (2/3 · 약함)";
    out.push({ cat: "branch", type: "삼합", tone: "good", nodes: r.nodes, name: g.name, status: full ? "complete" : "partial", statusLabel, have: r.have, need: 3, element: g.el, weak: !full && !withWang,
      keyword: g.key, missing: r.missing.map(bh),
      basis: `${g.b.map(bh).join("·")}는 ${ELEM_KR[g.el]}의 장생(${BRANCH_H[g.b[0]]})·제왕(${BRANCH_H[g.b[1]]})·묘(${BRANCH_H[g.b[2]]}) 자리예요. 원국에 ${r.nodes.map(label).join(", ")}가 있어요.`,
      rule: full ? "세 글자가 모두 있어 국(局)이 완성됐어요. 이 오행의 힘이 사주 전체에서 크게 작용해요." : withWang ? `왕지 ${bh(wang)}가 있어 반합으로 성립해요. 빠진 ${r.missing.map(bh).join("")}가 대운·세운에서 오면 완성돼요.` : `가장 센 왕지 ${bh(wang)}가 없어 묶음이 약해요(학파에 따라 인정하지 않아요). ${bh(wang)}가 운에서 오면 완성돼요.`,
      mean: `${REL_GUIDE[3].mean} 이 사주에선 ${ELEM_KR[g.el]} 기운(나에게 ${groupOf(STEM_ELEM[ds], g.el)})으로 모여요.` });
  }
  for (const g of BANGHAP) {
    const r = groupRel(g, "방합"); if (!r) continue;
    const full = r.have === 3;
    out.push({ cat: "branch", type: "방합", tone: "good", nodes: r.nodes, name: g.name, status: full ? "complete" : "partial", statusLabel: full ? "완성 (3/3)" : "일부 (2/3)", have: r.have, need: 3, element: g.el, weak: !full,
      keyword: g.key, missing: r.missing.map(bh),
      basis: `${g.b.map(bh).join("·")}는 모두 ${g.season}(${ELEM_KR[g.el]})의 지지예요. 원국에 ${r.nodes.map(label).join(", ")}가 있어요.`,
      rule: full ? `${g.season}의 세 글자가 다 모여 방합이 완성됐어요. ${ELEM_KR[g.el]}이 한 무리로 아주 강해져요.` : `두 글자만 있어 방합은 아직 완성되지 않았어요. ${g.season} 기운이 조금 모인 정도로 보고, ${r.missing.map(bh).join("")}가 운에서 오면 완성돼요.`,
      mean: REL_GUIDE[4].mean });
  }
  for (const g of HYEONG3) {
    const r = groupRel(g, "형"); if (!r) continue;
    const full = r.have === 3;
    out.push({ cat: "branch", type: "형", tone: "warn", nodes: r.nodes, name: g.name, sub: g.sub, status: full ? "complete" : "partial", statusLabel: full ? "삼형 완성 (3/3)" : "형 성립 (2/3)", have: r.have, need: 3,
      keyword: g.key, missing: r.missing.map(bh),
      basis: `${g.b.map(bh).join("·")}는 삼합과 방합을 맞댔을 때 서로 마주 보는 글자들이에요. 원국에 ${r.nodes.map(label).join(", ")}가 있어요.`,
      rule: full ? "세 글자가 다 있어 삼형이 완성됐어요. 작용을 크게 봐요." : `두 글자로 형은 성립했지만 삼형은 미완성이에요. ${r.missing.map(bh).join("")}가 운에서 오면 삼형이 돼요.`,
      mean: g.mean });
  }
  const ORDER = ["삼합", "방합", "육합", "천간합", "충", "형", "자형", "천간충", "해", "원진", "파"];
  return out.sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type) || (a.status === "complete" ? -1 : 0) - (b.status === "complete" ? -1 : 0));
}
function groupOf(dm, e) { return e === dm ? "비겁(比劫)" : GEN[dm] === e ? "식상(食傷)" : CTRL[dm] === e ? "재성(財星)" : CTRL[e] === dm ? "관성(官星)" : "인성(印星)"; }

/* ---------- 신살·공망 ---------- */
const CHEONEUL = [[1, 7], [0, 8], [11, 9], [11, 9], [1, 7], [0, 8], [1, 7], [2, 6], [5, 3], [5, 3]];
const LOK = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0];
const YANGIN = { 0: 3, 2: 6, 4: 6, 6: 9, 8: 0 };
const GEUMYEO = [4, 5, 7, 8, 7, 8, 10, 11, 1, 2];
const MUNCHANG = [5, 6, 8, 9, 8, 9, 11, 0, 2, 3];
const HAKDANG = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3];
const HONGYEOM = [6, 6, 2, 7, 4, 4, 10, 9, 0, 8];
const AMROK = [11, 10, 8, 7, 8, 7, 5, 4, 2, 1];
const GOEGANG = ["6-4", "6-10", "8-4", "8-10", "4-10"];
const BAEKHO = ["0-4", "1-7", "2-10", "3-1", "4-4", "8-10", "9-1"];
const CHEONDEOK = { 2: ["s", 3], 3: ["b", 8], 4: ["s", 8], 5: ["s", 7], 6: ["b", 11], 7: ["s", 0], 8: ["s", 9], 9: ["b", 2], 10: ["s", 2], 11: ["s", 1], 0: ["b", 5], 1: ["s", 6] };
const WOLDEOK = { 2: 2, 6: 2, 10: 2, 8: 8, 0: 8, 4: 8, 11: 0, 3: 0, 7: 0, 5: 6, 9: 6, 1: 6 };
const WANGJI = { 8: 0, 0: 0, 4: 0, 2: 6, 6: 6, 10: 6, 11: 3, 3: 3, 7: 3, 5: 9, 9: 9, 1: 9 };
const SINSAL12 = ["겁살", "재살", "천살", "지살", "도화살", "월살", "망신살", "장성살", "반안살", "역마살", "육해살", "화개살"];
export function sinsal12(base, target) { return SINSAL12[mod(target - mod(WANGJI[base] + 5, 12), 12)]; }
const samhapName = (b) => (SAMHAP.find((g) => g.b.includes(b)) || {}).name || "";
function gongmangOf(s, b) { const D = sexIdx(s, b); const h = mod(D - mod(D, 10), 12); return [mod(h + 10, 12), mod(h + 11, 12)]; }
const XUN = (s, b) => { const D = sexIdx(s, b); const st = D - mod(D, 10); return `${STEM_H[0]}${BRANCH_H[mod(st, 12)]}(갑${BRANCH_KR[mod(st, 12)]})순`; };

function spirits(cols, ds) {
  const out = [];
  const db = cols[1] && cols[1].b, yb = cols[3] && cols[3].b, mb = cols[2] && cols[2].b;
  const at = (pred) => [0, 1, 2, 3].filter((i) => cols[i] && pred(cols[i], i));
  const where = (is, kind = "b") => is.map((i) => `${POS1[i]}${kind === "b" ? "지" : kind === "s" ? "간" : "주"} ${kind === "s" ? sh(cols[i].s) : kind === "p" ? `${STEM_H[cols[i].s]}${BRANCH_H[cols[i].b]}` : bh(cols[i].b)}`).join(", ");
  const push = (name, tone, is, kind, basis) => { if (is.length) out.push({ name, tone, where: where(is, kind), at: is, kind, basis, mean: SINSAL_MEANING[name] || "" }); };
  push("천을귀인", "good", at((c) => CHEONEUL[ds].includes(c.b)), "b", `일간 ${sh(ds)} 기준 천을귀인은 ${CHEONEUL[ds].map(bh).join("·")}예요.`);
  push("문창귀인", "good", at((c) => MUNCHANG[ds] === c.b), "b", `일간 ${sh(ds)} 기준 문창귀인은 ${bh(MUNCHANG[ds])}예요. (일간이 낳는 식신의 건록 자리)`);
  push("학당귀인", "good", at((c) => HAKDANG[ds] === c.b), "b", `일간 ${sh(ds)}의 장생 자리 ${bh(HAKDANG[ds])}가 학당귀인이에요.`);
  push("건록", "good", at((c) => LOK[ds] === c.b), "b", `일간 ${sh(ds)}가 녹(祿)을 얻는 건록 자리는 ${bh(LOK[ds])}예요.`);
  push("암록", "good", at((c) => AMROK[ds] === c.b), "b", `일간 ${sh(ds)} 기준 암록은 ${bh(AMROK[ds])}예요. (건록과 육합하는 글자)`);
  push("금여", "good", at((c) => GEUMYEO[ds] === c.b), "b", `일간 ${sh(ds)} 기준 금여는 ${bh(GEUMYEO[ds])}예요. (건록에서 두 칸 앞)`);
  if (YANGIN[ds] != null) push("양인", "warn", at((c) => YANGIN[ds] === c.b), "b", `양간 ${sh(ds)}의 제왕 자리 ${bh(YANGIN[ds])}가 양인(羊刃)이에요.`);
  push("홍염살", "neutral", at((c) => HONGYEOM[ds] === c.b), "b", `일간 ${sh(ds)} 기준 홍염살은 ${bh(HONGYEOM[ds])}예요.`);
  if (mb != null) {
    const cd = CHEONDEOK[mb];
    push("천덕귀인", "good", at((c) => (cd[0] === "s" ? c.s === cd[1] : c.b === cd[1])), cd[0], `월지 ${bh(mb)} 기준 천덕귀인은 ${cd[0] === "s" ? sh(cd[1]) : bh(cd[1])}예요.`);
    push("월덕귀인", "good", at((c) => c.s === WOLDEOK[mb]), "s", `월지 ${bh(mb)}가 속한 ${samhapName(mb)}의 양간 ${sh(WOLDEOK[mb])}가 월덕귀인이에요.`);
  }
  push("괴강살", "neutral", at((c) => GOEGANG.includes(`${c.s}-${c.b}`)), "p", "庚辰·庚戌·壬辰·壬戌·戊戌 다섯 간지가 괴강이에요.");
  push("백호살", "warn", at((c) => BAEKHO.includes(`${c.s}-${c.b}`)), "p", "甲辰·乙未·丙戌·丁丑·戊辰·壬戌·癸丑 일곱 간지가 백호예요.");
  // 역마·도화·화개 — 년지·일지 기준 (자기 자리 제외)
  const three = [["역마살", "neutral", 0, "생지(生地)를 충하는 글자"], ["도화살", "neutral", 1, "왕지 바로 다음 글자(목욕지)"], ["화개살", "neutral", 2, "고지(庫地·묘)"]];
  for (const [nm, tone, kind, how] of three) {
    const hits = new Map();
    for (const [base, bi] of [[yb, 3], [db, 1]]) {
      if (base == null) continue;
      const g = SAMHAP.find((x) => x.b.includes(base));
      const tgt = kind === 0 ? mod(g.b[0] + 6, 12) : kind === 1 ? mod(g.b[1] + 9, 12) : g.b[2];
      [0, 1, 2, 3].forEach((i) => { if (i !== bi && cols[i] && cols[i].b === tgt) hits.set(i, `${POS1[bi]}지 ${bh(base)} → ${g.name}의 ${how} ${bh(tgt)}`); });
    }
    if (hits.size) out.push({ name: nm, tone, where: where([...hits.keys()], "b"), at: [...hits.keys()], kind: "b", basis: [...new Set(hits.values())].join(" / "), mean: SINSAL_MEANING[nm] || "" });
  }
  return out;
}

/* ---------- 오행 분포 ---------- */
function elementsOf(cols, ds) {
  const cnt = Object.fromEntries(ELEMS.map((e) => [e, 0])), hidden = Object.fromEntries(ELEMS.map((e) => [e, 0]));
  cols.forEach((c) => {
    if (!c) return;
    cnt[STEM_ELEM[c.s]] += 1; cnt[BRANCH_ELEM[c.b]] += 1;
    const jj = JIJANG[c.b], w = jj.length === 2 ? [0.3, 0.7] : [0.2, 0.3, 0.5];
    jj.forEach((x, k) => { hidden[STEM_ELEM[x]] += w[k]; });
  });
  const total = ELEMS.reduce((a, e) => a + cnt[e], 0) || 1;
  const dm = STEM_ELEM[ds];
  return ELEMS.map((e) => ({ key: e, kr: ELEM_KR[e], count: cnt[e], pct: Math.round((cnt[e] / total) * 100), hidden: Math.round(hidden[e] * 10) / 10, group: groupOf(dm, e), isMe: e === dm }));
}

/* ---------- 운(대운·세운)과 원국의 관계 ---------- */
function luckRelations(cols, s, b) {
  const items = [];
  const idx = [0, 1, 2, 3].filter((i) => cols[i]);
  const tag = (i, k) => `${POS1[i]}${k}`;
  idx.forEach((i) => {
    const k = key2(s, cols[i].s);
    if (STEM_HAP[k]) items.push({ tone: "good", label: `${STEM_H[s]}${STEM_H[cols[i].s]}합`, with: tag(i, "간"), txt: `운의 ${sh(s)}가 ${tag(i, "간")} ${sh(cols[i].s)}와 합 → ${ELEM_KR[STEM_HAP[k].el]}` });
    if (STEM_CHUNG.includes(k)) items.push({ tone: "warn", label: `${STEM_H[s]}${STEM_H[cols[i].s]}충`, with: tag(i, "간"), txt: `운의 ${sh(s)}가 ${tag(i, "간")} ${sh(cols[i].s)}와 충` });
    const c = cols[i].b, kb = key2(b, c);
    if (b !== c && Math.abs(b - c) === 6) items.push({ tone: "warn", label: `${BRANCH_H[b]}${BRANCH_H[c]}충`, with: tag(i, "지"), txt: `운의 ${bh(b)}가 ${tag(i, "지")} ${bh(c)}와 충 — ${POS_MEAN[i]} 쪽 변화` });
    if (YUKHAP[kb] && b !== c) items.push({ tone: "good", label: `${BRANCH_H[b]}${BRANCH_H[c]}합`, with: tag(i, "지"), txt: `운의 ${bh(b)}가 ${tag(i, "지")} ${bh(c)}와 육합 → ${ELEM_KR[YUKHAP[kb]]}` });
    if (inPair(HAE, b, c)) items.push({ tone: "warn", label: `${BRANCH_H[b]}${BRANCH_H[c]}해`, with: tag(i, "지"), txt: `운의 ${bh(b)}가 ${tag(i, "지")} ${bh(c)}와 해` });
    if (inPair(WONJIN, b, c)) items.push({ tone: "warn", label: `${BRANCH_H[b]}${BRANCH_H[c]}원진`, with: tag(i, "지"), txt: `운의 ${bh(b)}가 ${tag(i, "지")} ${bh(c)}와 원진` });
    if (JAMYO.includes(b) && JAMYO.includes(c) && b !== c) items.push({ tone: "warn", label: "子卯형", with: tag(i, "지"), txt: `운의 ${bh(b)}가 ${tag(i, "지")} ${bh(c)}와 형` });
    if (b === c && SELF_HYEONG.includes(b)) items.push({ tone: "warn", label: `${BRANCH_H[b]}${BRANCH_H[b]}자형`, with: tag(i, "지"), txt: `운의 ${bh(b)}가 ${tag(i, "지")}와 같은 글자 — 자형` });
  });
  const natal = new Set(idx.map((i) => cols[i].b));
  for (const g of [...SAMHAP.map((x) => ({ ...x, t: "삼합" })), ...BANGHAP.map((x) => ({ ...x, t: "방합" })), ...HYEONG3.map((x) => ({ ...x, t: "삼형" }))]) {
    if (!g.b.includes(b)) continue;
    const others = g.b.filter((x) => x !== b);
    const haveN = others.filter((x) => natal.has(x));
    if (haveN.length === 2 && !natal.has(b)) items.push({ tone: g.t === "삼형" ? "warn" : "good", label: `${g.t} 완성`, with: "원국", txt: `원국의 ${haveN.map(bh).join("·")}에 운의 ${bh(b)}가 더해져 ${g.name} 완성 (원국 2 + 운 1)` });
    else if (haveN.length === 1 && g.t === "삼합" && (b === g.b[1] || haveN[0] === g.b[1]) && !natal.has(b)) items.push({ tone: "good", label: "반합", with: "원국", txt: `운의 ${bh(b)}와 원국 ${bh(haveN[0])}가 ${g.name.split(" ")[0]} 반합 (2/3)` });
  }
  return items;
}
function luckCol(cols, ds, s, b, extra) {
  return { ...extra, s, b, stemH: STEM_H[s], stemKr: STEM_KR[s], branchH: BRANCH_H[b], branchKr: BRANCH_KR[b], stemElem: STEM_ELEM[s], branchElem: BRANCH_ELEM[b],
    stemGod: tenGod(ds, s), branchGod: tenGod(ds, mainStem(b)), stage: stageOf(ds, b), rels: luckRelations(cols, s, b) };
}


/* ---------- 신강신약 점수표 (자리별 가중) ----------
   천간(일간 제외) 각 10점 · 월지 30점 · 일지 20점 · 년지·시지 각 10점 = 100점
   비견·겁재·정인·편인(나를 돕는 글자)이면 만점, 아니면 지장간 중 돕는 글자 비율만큼 */
const HELP_GODS = ["비견", "겁재", "정인", "편인"];
const JJ_W3 = [0.3, 0.2, 0.5], JJ_W2 = [0.3, 0.7];
function strengthScore(cols, ds) {
  const cells = [];
  const W = { s: [10, 0, 10, 10], b: [10, 20, 30, 10] };
  [0, 1, 2, 3].forEach((i) => {
    const c = cols[i]; if (!c) { cells.push({ i, kind: "s", max: 0, score: 0, empty: true }, { i, kind: "b", max: 0, score: 0, empty: true }); return; }
    if (i !== 1) { const g = tenGod(ds, c.s); cells.push({ i, kind: "s", god: g, max: 10, score: HELP_GODS.includes(g) ? 10 : 0, help: HELP_GODS.includes(g), why: HELP_GODS.includes(g) ? `${g}라 나를 도와요` : `${g}라 내 힘을 써요` }); }
    else cells.push({ i, kind: "s", me: true, max: 0, score: 0 });
    const max = W.b[i], g = tenGod(ds, mainStem(c.b));
    if (HELP_GODS.includes(g)) cells.push({ i, kind: "b", god: g, max, score: max, help: true, why: `${g}라 나를 도와요 (만점)` });
    else {
      const jj = JIJANG[c.b], w = jj.length === 2 ? JJ_W2 : JJ_W3;
      let r = 0; const parts = [];
      jj.forEach((x, k) => { const gg = tenGod(ds, x); if (HELP_GODS.includes(gg)) { r += w[k]; parts.push(`${STEM_KR[x]}(${STEM_H[x]}) ${gg}`); } });
      const sc = Math.round(max * r);
      cells.push({ i, kind: "b", god: g, max, score: sc, help: sc > 0, partial: sc > 0 && sc < max, why: sc ? `${g}지만 지장간 속 ${parts.join("·")}가 조금 도와요` : `${g}라 내 힘을 써요` });
    }
  });
  const total = cells.reduce((a, c) => a + c.score, 0), max = cells.reduce((a, c) => a + c.max, 0) || 100;
  const pct = Math.round((total / max) * 100);
  const levels = [[0, 25, "극신약"], [26, 44, "신약"], [45, 55, "중화"], [56, 74, "신강"], [75, 100, "극신강"]];
  const lv = levels.find(([a, b]) => pct >= a && pct <= b) || levels[2];
  const lean = lv[2] === "중화" ? (pct < 50 ? "신약에 가까운 중화" : pct > 50 ? "신강에 가까운 중화" : "딱 중화") : lv[2];
  return { cells, total, max, pct, level: lv[2], lean, levels: levels.map((l) => l[2]),
    method: "십성 중 비견·겁재·정인·편인은 나를 강하게 하는 글자, 그 밖의 글자는 내 힘을 쓰게 하는 글자예요. 월지의 영향이 가장 커서 30점, 그다음 일지 20점, 나머지 자리는 10점으로 계산해요. 지지가 돕는 글자가 아니어도 그 속 지장간에 돕는 글자가 있으면 비율(여기 30%·중기 20%·정기 50%)만큼 점수를 줘요." };
}

/* ---------- 격국 찾기 ---------- */
const GYEOK_INFO = {
  정재격: { key: "성실하게 모으는 현실가", good: "식상(재능)이 재물을 낳아 주고, 관성이 지켜 주면 좋아요", bad: "비겁(경쟁자)이 재물을 나눠 가지면 흔들려요", need: ["식상", "관성"], harm: ["비겁"] },
  편재격: { key: "크게 굴리는 사업가", good: "식상이 재물을 낳고 내 힘(비겁·인성)이 받쳐 주면 좋아요", bad: "내 힘이 약한데 재물만 많으면 감당이 어려워요", need: ["식상"], harm: ["비겁"] },
  정관격: { key: "원칙을 지키는 리더", good: "재성이 관을 돕고 인성이 관의 힘을 나에게 전해 주면 좋아요", bad: "상관이 관을 치면 규칙과 부딪혀요", need: ["재성", "인성"], harm: ["상관"] },
  편관격: { key: "압박을 이겨 내는 승부사", good: "식신이 편관을 다스리거나 인성이 기운을 바꿔 주면 좋아요", bad: "다스리는 글자 없이 편관만 강하면 스트레스가 커요", need: ["식상", "인성"], harm: ["재성"] },
  정인격: { key: "배우고 가르치는 학자", good: "관성이 인성을 낳아 주면 좋아요", bad: "재성이 인성을 깨면 공부가 끊기기 쉬워요", need: ["관성"], harm: ["재성"] },
  편인격: { key: "남다른 직관의 전문가", good: "편재가 넘치는 편인을 눌러 주면 좋아요", bad: "편인이 식신을 치면(도식) 표현이 막혀요", need: ["재성"], harm: ["식상"] },
  식신격: { key: "꾸준히 만드는 장인", good: "식신이 재물을 낳아 주면(식신생재) 좋아요", bad: "편인이 식신을 치면(도식) 흐름이 끊겨요", need: ["재성"], harm: ["인성"] },
  상관격: { key: "틀을 깨는 표현가", good: "상관이 재물을 낳거나 인성이 상관을 다듬어 주면 좋아요", bad: "상관이 정관을 치면 구설이 생기기 쉬워요", need: ["재성", "인성"], harm: ["관성"] },
  건록격: { key: "스스로 일어서는 자립가", good: "내 힘이 넘치니 재성·관성·식상으로 힘을 써 주면 좋아요", bad: "인성·비겁만 더 오면 고집이 세져요", need: ["재성", "관성", "식상"], harm: ["인성"] },
  양인격: { key: "칼을 쥔 개척자", good: "편관이 칼을 다스려 주면(양인합살) 크게 써요", bad: "다스리는 관이 없으면 기운이 거칠어져요", need: ["관성"], harm: ["비겁"] },
  월겁격: { key: "경쟁 속에서 크는 사람", good: "식상·재성·관성으로 넘치는 힘을 써 주면 좋아요", bad: "비겁만 더 오면 재물이 새기 쉬워요", need: ["식상", "재성", "관성"], harm: ["비겁"] },
};
const GROUP5 = { 비견: "비겁", 겁재: "비겁", 식신: "식상", 상관: "식상", 편재: "재성", 정재: "재성", 편관: "관성", 정관: "관성", 편인: "인성", 정인: "인성" };
function gyeokOf(god, ds, b) {
  if (god === "비견") return "건록격";
  if (god === "겁재") return ds % 2 === 0 && YANGIN[ds] === b ? "양인격" : "월겁격";
  return `${god}격`;
}
function gyeokguk(cols, ds) {
  const mb = cols[2] ? cols[2].b : null; if (mb == null) return null;
  const jj = JIJANG[mb], roles = jj.length === 2 ? ["여기", "정기"] : ["여기", "중기", "정기"];
  const shown = [0, 2, 3].filter((i) => cols[i]).map((i) => ({ i, s: cols[i].s }));
  const order = [...jj.keys()].reverse(); // 정기 → 중기 → 여기
  const picks = [];
  order.forEach((k) => {
    const x = jj[k], hit = shown.filter((t) => t.s === x);
    if (!hit.length) return;
    const god = tenGod(ds, x), name = gyeokOf(god, ds, mb);
    picks.push({ name, god, stem: x, role: roles[k], at: hit.map((t) => t.i),
      basis: `${BRANCH_KR[mb]}월(${BRANCH_H[mb]}月)에 ${STEM_KR[x]}${ELEM_K1[STEM_ELEM[x]]}(${STEM_H[x]}${{ wood: "木", fire: "火", earth: "土", metal: "金", water: "水" }[STEM_ELEM[x]]})가 ${hit.map((t) => POS1[t.i] + "간").join("·")}에 투간(透干 · 천간으로 드러남)해서 ${STEM_KR[x]} ${god}을 격으로 삼아요.` });
  });
  let main = picks[0];
  if (!main) {
    const x = jj[jj.length - 1], god = tenGod(ds, x);
    main = { name: gyeokOf(god, ds, mb), god, stem: x, role: "정기", at: [], basis: `월지 지장간 중 천간에 드러난 글자가 없어, ${BRANCH_KR[mb]}월(${BRANCH_H[mb]}月)의 정기 ${STEM_KR[x]}(${STEM_H[x]}) ${god}을 격으로 삼아요.` };
    picks.push(main);
  }
  const groupsPresent = new Set();
  cols.forEach((c, i) => { if (!c) return; if (i !== 1) groupsPresent.add(GROUP5[tenGod(ds, c.s)]); groupsPresent.add(GROUP5[tenGod(ds, mainStem(c.b))]); });
  return {
    month: `${BRANCH_KR[mb]}월(${BRANCH_H[mb]})`, jijang: jj.map((x, k) => ({ kr: STEM_KR[x], h: STEM_H[x], role: roles[k], god: tenGod(ds, x), shown: shown.some((t) => t.s === x) })),
    list: picks.map((g) => {
      const I = GYEOK_INFO[g.name] || GYEOK_INFO[`${g.god}격`] || { key: "", good: "", bad: "", need: [], harm: [] };
      const has = I.need.filter((x) => groupsPresent.has(x)), harm = I.harm.filter((x) => groupsPresent.has(x));
      return { ...g, key: I.key, good: I.good, bad: I.bad,
        check: `원국에 ${has.length ? `도와주는 ${has.join("·")}가 있고` : "도와주는 글자는 운에서 기다려야 하고"}${harm.length ? `, 조심할 ${harm.join("·")}도 함께 있어요` : ", 크게 방해하는 글자는 없어요"}.` };
    }),
    what: "격국(格局)은 사주의 중심 기운이에요. 태어난 달(월지)을 기준으로, 월지 속 글자(지장간)가 천간에 드러난(투간) 것을 격으로 정해요. 드러난 글자가 없으면 월지의 정기로 정해요.",
  };
}

/* ---------- 용신·희신·기신·구신·한신 ---------- */
function yonghui(S) {
  const y = S.yongsin[0];
  const genBy = (e) => ELEMS.find((x) => GEN[x] === e), ctrlBy = (e) => ELEMS.find((x) => CTRL[x] === e);
  const hee = genBy(y), gi = ctrlBy(y), gu = genBy(gi);
  const han = ELEMS.find((e) => ![y, hee, gi, gu].includes(e));
  const row = (role, e, desc) => ({ role, elem: e, kr: ELEM_KR[e], desc });
  return [
    row("용신", y, "가장 필요한 기운 — 이 기운의 사람·색·일이 나를 살려요"),
    row("희신", hee, "용신을 낳아 돕는 기운 — 두 번째로 반가워요"),
    row("기신", gi, "용신을 누르는 기운 — 많아지면 힘이 빠져요"),
    row("구신", gu, "기신을 키우는 기운 — 기신 다음으로 조심"),
    row("한신", han, "큰 영향 없는 기운 — 무난해요"),
  ];
}

/* ---------- 추가 신살 (기둥별) ---------- */
const TAEGEUK = [[0, 6], [0, 6], [3, 9], [3, 9], [4, 10, 1, 7], [4, 10, 1, 7], [2, 11], [2, 11], [5, 8], [5, 8]];
const CHEONJU = [5, 6, 5, 6, 8, 9, 11, 0, 2, 3];
const MUNGOK = [11, 0, 2, 3, 2, 3, 5, 6, 8, 9];
const GEUPGAK = { 2: [11, 0], 3: [11, 0], 4: [11, 0], 5: [3, 7], 6: [3, 7], 7: [3, 7], 8: [2, 10], 9: [2, 10], 10: [2, 10], 11: [1, 4], 0: [1, 4], 1: [1, 4] };
const HYOSIN = ["0-0", "1-11", "2-2", "3-3", "4-6", "5-5", "6-4", "6-10", "7-1", "7-7", "8-8", "9-9"];
const EXTRA_MEAN = {
  태극귀인: "시작과 끝을 잘 맺는 복 — 조상·종교·명예의 도움.", 천주귀인: "먹을 복·식록 — 의식주가 넉넉하고 대접받아요.", 문곡귀인: "문학·예술·말재주 — 글과 말로 인정받는 재능.",
  천의성: "하늘의 의사 — 치유·돌봄의 별. 의료·상담·교육에 인연.", 급각살: "다리·관절을 조심 — 서두르면 넘어지기 쉬운 자리(참고).", 효신살: "일지에 인성이 앉은 자리 — 생각이 많고 어머니 영향이 크다고 봐요.",
  원진살: "띠끼리 서로 미워하며 끌리는 애증(참고).",
  현침살: "바늘처럼 예리한 재주 — 의료·기술·손재주, 말·글이 날카로워요.",
};
function extraSpirits(cols, ds) {
  const out = [], mb = cols[2] ? cols[2].b : null, yb = cols[3] ? cols[3].b : null, db = cols[1].b;
  const add = (name, tone, at, basis) => { if (at.length) out.push({ name, tone, at, where: at.map((i) => `${POS1[i]}지 ${bh(cols[i].b)}`).join(", "), basis, mean: EXTRA_MEAN[name] }); };
  const atB = (pred) => [0, 1, 2, 3].filter((i) => cols[i] && pred(cols[i].b, i));
  add("태극귀인", "good", atB((b) => TAEGEUK[ds].includes(b)), `일간 ${sh(ds)} 기준 태극귀인은 ${TAEGEUK[ds].map(bh).join("·")}예요.`);
  add("천주귀인", "good", atB((b) => CHEONJU[ds] === b), `일간 ${sh(ds)} 기준 천주귀인은 ${bh(CHEONJU[ds])}예요.`);
  add("문곡귀인", "good", atB((b) => MUNGOK[ds] === b), `일간 ${sh(ds)} 기준 문곡귀인은 ${bh(MUNGOK[ds])}예요.`);
  if (mb != null) {
    const ui = mod(mb - 1, 12);
    add("천의성", "good", atB((b) => b === ui), `월지 ${bh(mb)} 바로 앞 글자 ${bh(ui)}가 천의성이에요.`);
    add("급각살", "warn", atB((b, i) => i !== 2 && GEUPGAK[mb].includes(b)), `월지 ${bh(mb)}의 계절 기준 급각살은 ${GEUPGAK[mb].map(bh).join("·")}예요.`);
  }
  if (HYOSIN.includes(`${ds}-${db}`)) out.push({ name: "효신살", tone: "neutral", at: [1], where: `일주 ${STEM_H[ds]}${BRANCH_H[db]}`, basis: "일주가 甲子·乙亥·丙寅·丁卯·戊午·己巳·庚辰·庚戌·辛丑·辛未·壬申·癸酉 중 하나라 효신살이에요.", mean: EXTRA_MEAN.효신살 });
  // 현침살 — 글자 모양이 바늘 같은 천간 甲(갑)·辛(신), 지지 卯(묘)·午(오)·申(신) (사주 리포트 신살표와 같은 기준)
  const hcS = [0, 1, 2, 3].filter((i) => cols[i] && [0, 7].includes(cols[i].s)), hcB = atB((b) => [3, 6, 8].includes(b));
  const hcAt = [...new Set([...hcS, ...hcB])].sort((a, b) => a - b);
  if (hcAt.length) out.push({ name: "현침살", tone: "neutral", at: hcAt, kind: "p",
    where: [...hcS.map((i) => `${POS1[i]}간 ${sh(cols[i].s)}`), ...hcB.map((i) => `${POS1[i]}지 ${bh(cols[i].b)}`)].join(", "),
    basis: "천간 甲(갑)·辛(신), 지지 卯(묘)·午(오)·申(신)은 글자 끝이 바늘처럼 뾰족해서 현침살이에요.", mean: EXTRA_MEAN.현침살 });
  const wj = atB((b, i) => [[yb, 3], [db, 1]].some(([x, xi]) => x != null && xi !== i && inPair(WONJIN, b, x)));
  add("원진살", "warn", wj, "년지·일지와 원진 짝인 지지예요.");
  return out;
}

/* ---------- 정확한 대운 시작 · 나이 기준 ---------- */
function daeunStart(profile) {
  const D = profile.daeun; if (!D || !D.startDate) return null;
  const b = profile.solar, st = D.startDate;
  let months = (st.Y - b.Y) * 12 + (st.M - b.M), days = st.D - b.D;
  if (days < 0) { months -= 1; days += new Date(st.Y, st.M - 1, 0).getDate(); }
  return { num: D.startAge, forward: D.forward, date: `${st.Y}년 ${st.M}월 ${st.D}일 ${st.h}시`, after: `생후 ${Math.floor(months / 12)}년 ${months % 12}개월 ${days}일`, manStart: Math.floor(months / 12) };
}
/* ---------- 머리 카드 (일주 이름 · 시간 보정) ---------- */
function headInfo(profile, cols) {
  const m = profile.meta || {}, f = m.solarFix || {};
  const ds = cols[1].s, db = cols[1].b, mb = cols[2] ? cols[2].b : null;
  return {
    ilju: `${STEM_KR[ds]}${BRANCH_KR[db]}일주`, iljuH: `${STEM_H[ds]}${BRANCH_H[db]}`,
    monthDay: mb != null ? `${BRANCH_KR[mb]}월 ${STEM_KR[ds]}${ELEM_K1[STEM_ELEM[ds]]}` : "",
    animal: cols[3] ? `${ANIMAL[cols[3].b]}띠` : "",
    timeKnown: !!m.timeKnown, trueTime: f.trueTime || null, total: f.total || 0, lonCorr: f.lonCorr || 0, eot: f.eot || 0, dst: !!f.dst,
    jeolip: m.jeolip ? `${m.jeolip.name} ${m.jeolip.M}월 ${m.jeolip.D}일 ${m.jeolip.h}:${String(m.jeolip.m).padStart(2, "0")}` : "",
    lunar: profile.lunar ? `${profile.lunar.Y || profile.lunar.y || ""}.${profile.lunar.M || profile.lunar.m || ""}.${profile.lunar.D || profile.lunar.d || ""}${profile.lunar.leap ? " (윤)" : ""}` : "",
  };
}

/* ---------- 조사 자동 (乙(을)와 → 乙(을)과) ---------- */
const hasBatchim = (ch) => { const c = ch.charCodeAt(0) - 0xac00; return c >= 0 && c <= 11171 && c % 28 !== 0; };
const JOSA = [["이에요", "예요"], ["과", "와"], ["은", "는"], ["이", "가"], ["을", "를"]];
function fixJosa(t) {
  return t.replace(/([가-힣])\)(이에요|예요|와|과|는|은|가|이|를|을)(?=[\s,.)·]|$)/g, (m, ch, j) => {
    const pair = JOSA.find((x) => x.includes(j)); if (!pair) return m;
    return `${ch})${hasBatchim(ch) ? pair[0] : pair[1]}`;
  });
}
function deepFix(o) {
  if (typeof o === "string") return fixJosa(o);
  if (Array.isArray(o)) return o.map(deepFix);
  if (o && typeof o === "object") { const r = {}; for (const k of Object.keys(o)) r[k] = deepFix(o[k]); return r; }
  return o;
}

/* =========================================================
   메인 — 원국 전체 결과
   ========================================================= */
export function buildWonguk(profile, today = new Date()) {
  const P = profile.pillars;
  const cols = ["hour", "day", "month", "year"].map((k) => (P[k] ? { s: P[k].stemIdx, b: P[k].branchIdx } : null));
  const ds = cols[1].s, monthB = cols[2] ? cols[2].b : cols[1].b;
  const gmDay = gongmangOf(cols[1].s, cols[1].b), gmYear = cols[3] ? gongmangOf(cols[3].s, cols[3].b) : null;
  const yb = cols[3] ? cols[3].b : null, db = cols[1].b;

  const pillars = cols.map((c, i) => {
    if (!c) return { i, pos: POS[i], pos1: POS1[i], empty: true, posMean: POS_MEAN[i] };
    const sx = sexIdx(c.s, c.b), np = Math.floor(sx / 2);
    const stI = stageOf(ds, c.b), stJ = stageOf(c.s, c.b);
    return {
      i, pos: POS[i], pos1: POS1[i], posMean: POS_MEAN[i], isDay: i === 1,
      stemH: STEM_H[c.s], stemKr: STEM_KR[c.s], stemElem: STEM_ELEM[c.s],
      branchH: BRANCH_H[c.b], branchKr: BRANCH_KR[c.b], branchElem: BRANCH_ELEM[c.b], animal: ANIMAL[c.b],
      stemGod: i === 1 ? "일간(나)" : tenGod(ds, c.s), branchGod: tenGod(ds, mainStem(c.b)),
      jijang: JIJANG[c.b].map((x, k, arr) => ({ h: STEM_H[x], kr: STEM_KR[x], elem: STEM_ELEM[x], god: tenGod(ds, x), role: arr.length === 2 ? ["여기", "정기"][k] : ["여기", "중기", "정기"][k] })),
      stageIlgan: stI, stageJajwa: stJ,
      napeum: NAPEUM[np], napeumH: NAPEUM_H[np], napeumElem: K1_ELEM[NAPEUM[np].slice(-1)],
      sinsalYear: yb != null ? sinsal12(yb, c.b) : null, sinsalDay: i !== 1 ? sinsal12(db, c.b) : null,
      gongmang: gmDay.includes(c.b) && i !== 1, gongmangYear: gmYear ? gmYear.includes(c.b) && i !== 3 : false,
    };
  });

  const relations = natalRelations(cols, ds, monthB);
  const spiritList = spirits(cols, ds);
  // 기둥별로 모아 두기 — 이 기둥이 끼어 있는 관계 / 신살 (화면 표의 한 줄로 바로 씀)
  pillars.forEach((p) => {
    if (p.empty) return;
    p.rels = [];
    relations.forEach((r, k) => {
      const mineN = r.nodes.filter((n) => n.i === p.i); if (!mineN.length) return;
      const others = [...new Set(r.nodes.filter((n) => n.i !== p.i).map((n) => n.pos1))];
      mineN.forEach((n) => p.rels.push({ k, type: r.type, tone: r.tone, part: r.status === "partial", kind: n.kind, with: others, el: r.element ? ELEM_K1[r.element] : "" }));
    });
    p.spirits = spiritList.filter((x) => x.at.includes(p.i)).map((x) => ({ name: x.name, tone: x.tone }));
    p.stemYY = STEM_KR.indexOf(p.stemKr) % 2 === 0 ? "양" : "음";
    p.branchYY = BRANCH_KR.indexOf(p.branchKr) % 2 === 0 ? "양" : "음";
  });
  const S = analyzeStrength(profile);
  const elements = elementsOf(cols, ds);

  // 대운 — 현재 + 앞뒤
  const birthY = profile.solar ? profile.solar.Y : today.getFullYear();
  const age = today.getFullYear() - birthY;
  const list = (profile.daeun && profile.daeun.list) || [];
  let cur = list.findIndex((d) => age >= d.age && age < d.age + 10);
  if (cur < 0) cur = age < (list[0] ? list[0].age : 0) ? -1 : list.length - 1;
  const daeun = list.map((d, k) => luckCol(cols, ds, d.stemIdx, d.branchIdx, { age: d.age, startYear: d.startYear, isNow: k === cur, k }));
  const Y = today.getFullYear();
  const seun = [Y - 2, Y - 1, Y, Y + 1, Y + 2, Y + 3].map((y) => luckCol(cols, ds, mod(y - 4, 10), mod(y - 4, 12), { year: y, age: y - birthY + 1, isNow: y === Y }));
  // 월운 — 올해 12달 (그달 절입 뒤의 월주)
  const wolun = [];
  for (let M = 1; M <= 12; M++) {
    const order = mod(M - 2, 12), ys = mod((M === 1 ? Y - 1 : Y) - 4, 10);
    wolun.push(luckCol(cols, ds, mod(ys * 2 + 2 + order, 10), mod(order + 2, 12), { year: Y, month: M, isNow: M === today.getMonth() + 1 }));
  }
  // 일운 — 오늘 앞뒤 (1900-01-01 = 甲戌일 기준)
  const jdn = (y, m, d) => { const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3; return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045; };
  const ilun = [];
  for (let k = -3; k <= 3; k++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + k);
    const idx = mod(jdn(d.getFullYear(), d.getMonth() + 1, d.getDate()) - 2415021 + 10, 60);
    ilun.push(luckCol(cols, ds, idx % 10, idx % 12, { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), dow: "일월화수목금토"[d.getDay()], isNow: k === 0 }));
  }

  const extraSp = extraSpirits(cols, ds);
  pillars.forEach((p) => { if (!p.empty) extraSp.filter((x) => x.at.includes(p.i)).forEach((x) => p.spirits.push({ name: x.name, tone: x.tone })); });
  return deepFix({
    head: headInfo(profile, cols),
    score: strengthScore(cols, ds),
    gyeok: gyeokguk(cols, ds),
    yonghui: yonghui(S),
    daeunStart: daeunStart(profile),
    birthY,
    dayMaster: { h: STEM_H[ds], kr: STEM_KR[ds], elem: STEM_ELEM[ds], elemKr: ELEM_KR[STEM_ELEM[ds]] },
    timeKnown: !!cols[0],
    pillars, relations,
    relSummary: {
      good: relations.filter((r) => r.tone === "good").length, warn: relations.filter((r) => r.tone === "warn").length,
      complete: relations.filter((r) => r.status === "complete").length, partial: relations.filter((r) => r.status === "partial").length,
    },
    spirits: [...spiritList, ...extraSp],
    guiin: CHEONEUL[ds].map(bh),
    wollyeong: (() => { const m = mainStem(monthB); return `${STEM_H[m]}(${STEM_KR[m]})`; })(),
    gongmang: {
      day: gmDay.map(bh), dayBasis: `일주 ${STEM_H[cols[1].s]}${BRANCH_H[cols[1].b]}는 ${XUN(cols[1].s, cols[1].b)}에 속해요. 열 천간이 열두 지지와 짝을 짓고 남는 두 지지 ${gmDay.map(bh).join("·")}가 공망이에요.`,
      year: gmYear ? gmYear.map(bh) : null, yearBasis: gmYear ? `년주 ${STEM_H[cols[3].s]}${BRANCH_H[cols[3].b]}는 ${XUN(cols[3].s, cols[3].b)} → ${gmYear.map(bh).join("·")}` : "",
      hits: pillars.filter((p) => p.gongmang).map((p) => `${p.pos1}지 ${p.branchH}(${p.branchKr})`),
      mean: "‘비어 있는 자리’라 그 기둥의 일이 마음먹은 만큼 채워지지 않거나, 물질보다 정신적인 쪽으로 쓰인다고 봐요. 충·합을 만나면 공망이 풀린다(해공)고도 해요.",
    },
    elements,
    elemMethod: "드러난 여덟 글자(천간 4 + 지지 4)를 한 글자에 1점씩 세었어요(시간을 모르면 여섯 글자). 지지 속에 숨은 지장간은 여기·중기·정기 비율(예: 0.2·0.3·0.5)로 따로 더해 ‘숨은 힘’으로 보여 줘요.",
    strength: { level: S.levelName, strength: S.strength, score: S.score, deukryeong: S.deukryeong, deukji: S.deukji, deukse: S.deukse, yongsinKr: S.yongsinKr, yongsinDesc: S.yongsinDesc, summary: S.summary,
      method: "신강·신약은 ① 득령(得令) — 태어난 달(월지)이 나를 돕는가, ② 득지(得地) — 앉은 자리(일지)가 나를 돕는가, ③ 득세(得勢) — 나머지 글자 중 나를 돕는(비겁·인성) 글자가 많은가를 합쳐서 판단해요. 월지의 힘을 가장 크게 봐요." },
    daeun, daeunNow: cur, seun, wolun, ilun,
    stageBasis: STAGE_BASIS,
    disclaimer: "여기 나오는 해석은 명리학의 전통적인 풀이를 참고용으로 정리한 거예요. 합·충·형이나 신살이 있다고 결혼·이별·사고 같은 일이 정해지지 않아요. 같은 글자도 위치·월령·운에 따라 다르게 작용해요.",
  });
}
