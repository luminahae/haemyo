import { el, clear, toast, seedFromString, mulberry32 } from "../utils/dom.js";
import { pageHeader, backLink, noticeBox, loadDisclaimer } from "./shared.js";
import { getMyBirth } from "../state.js";
import { personSwitch } from "./people.js";
import { computeSaju } from "../saju/manse.js";
import { analyzeStrength } from "../saju/strength.js";
import { isUnlocked, unlock, getCoins, costOf, noCoinToast } from "../wallet.js";
import { exportNodeAsImage } from "../utils/shareImage.js";
/* =========================================================
   재미·개운 모음 — 주역점 · 풍수 개운 · 개운 부적 · 행운 번호 · 사주툰 · 이달의 명심보감 · 사주 건강운
   작성: HAE · 모두 재미·참고용 콘텐츠
   ========================================================= */

const STEM_ELEM = ["wood", "wood", "fire", "fire", "earth", "earth", "metal", "metal", "water", "water"];
const BRANCH_ELEM = ["water", "earth", "wood", "wood", "earth", "fire", "fire", "earth", "metal", "metal", "earth", "water"];
const EK = { wood: "목(木)", fire: "화(火)", earth: "토(土)", metal: "금(金)", water: "수(水)" };
const EH = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
const STEM_KR = ["갑(甲)", "을(乙)", "병(丙)", "정(丁)", "무(戊)", "기(己)", "경(庚)", "신(辛)", "임(壬)", "계(癸)"];
const rnd = () => { const a = new Uint32Array(1); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : (a[0] = Math.random() * 2 ** 32); return a[0] / 2 ** 32; };
const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

function needBirth(root, navigate) {
  root.append(el("section", { class: "wrap section-gap" }, [noticeBox("info", "생년월일이 필요해요."),
    el("button", { class: "btn btn-primary", onclick: () => navigate("/saju") }, [el("span", { text: "내 정보 입력하고 시작" })])]));
  return root;
}
function lockBox(title, desc, cost, onOpen) {
  const coins = getCoins();
  return el("div", { class: "panel premium-lock" }, [
    el("span", { class: "lock-badge" }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: `코인 ${cost}개` })]),
    el("h3", { class: "serif", style: "margin-top:10px;", text: title }),
    el("p", { class: "muted", style: "font-size:var(--fs-sm);", text: desc }),
    el("button", { class: "btn btn-primary btn-block", style: "margin-top: var(--sp-4);", onclick: onOpen },
      [el("span", { text: coins >= cost ? `코인 ${cost}개로 열기 · 보유 ${coins}개` : "코인 받으러 가기" })]),
  ]);
}
function gate(itemId, cost, label, after) {
  if (!cost) return after(); // 운세 탭 점술은 무료
  const r = unlock(itemId, cost);
  if (r.ok) { if (r.reason !== "already") toast(`${label} · 코인 ${cost} 차감`); after(); }
  else noCoinToast(cost);
}
function head(root, navigate, title, h, desc, who) {
  loadDisclaimer();
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(pageHeader(title, h, desc));
  if (who) root.append(personSwitch(navigate, { title: who }));
}

/* ======================= 1. 주역점 (64괘) ======================= */
// 소성괘: 효는 아래→위 (1=양, 0=음)
const TRI = {
  qian: { h: "乾", kr: "건", img: "天", imgKr: "하늘", lines: [1, 1, 1], sym: "☰" },
  dui: { h: "兌", kr: "태", img: "澤", imgKr: "연못", lines: [1, 1, 0], sym: "☱" },
  li: { h: "離", kr: "리", img: "火", imgKr: "불", lines: [1, 0, 1], sym: "☲" },
  zhen: { h: "震", kr: "진", img: "雷", imgKr: "우레", lines: [1, 0, 0], sym: "☳" },
  xun: { h: "巽", kr: "손", img: "風", imgKr: "바람", lines: [0, 1, 1], sym: "☴" },
  kan: { h: "坎", kr: "감", img: "水", imgKr: "물", lines: [0, 1, 0], sym: "☵" },
  gen: { h: "艮", kr: "간", img: "山", imgKr: "산", lines: [0, 0, 1], sym: "☶" },
  kun: { h: "坤", kr: "곤", img: "地", imgKr: "땅", lines: [0, 0, 0], sym: "☷" },
};
const KW_ORDER = ["qian", "zhen", "kan", "gen", "kun", "xun", "li", "dui"];
const KW = [ // [위괘][아래괘]
  [1, 25, 6, 33, 12, 44, 13, 10], [34, 51, 40, 62, 16, 32, 55, 54], [5, 3, 29, 39, 8, 48, 63, 60], [26, 27, 4, 52, 23, 18, 22, 41],
  [11, 24, 7, 15, 2, 46, 36, 19], [9, 42, 59, 53, 20, 57, 37, 61], [14, 21, 64, 56, 35, 50, 30, 38], [43, 17, 47, 31, 45, 28, 49, 58],
];
// [한자, 한글, 키워드, 풀이, 길흉(3길 2평 1조심)]
const HEX = {
  1: ["乾爲天", "건위천", "하늘의 힘", "용이 하늘로 오르는 괘. 스스로 굳세게 밀고 나가면 크게 이뤄요. 다만 너무 높이 오르면 후회가 생기니 겸손을 함께 챙기세요.", 3],
  2: ["坤爲地", "곤위지", "땅의 포용", "앞장서기보다 따르고 받쳐 줄 때 길해요. 꾸준함과 너그러움이 결국 큰 결실이 됩니다.", 3],
  3: ["水雷屯", "수뢰둔", "새싹의 진통", "막 시작하는 일이라 어수선하고 더뎌요. 혼자 서두르지 말고 도와줄 사람을 세우면 풀립니다.", 2],
  4: ["山水蒙", "산수몽", "배움의 시기", "아직 안개 속이에요. 모르는 걸 인정하고 배우는 자세가 길을 열어 줘요. 같은 질문을 반복하면 답이 흐려집니다.", 2],
  5: ["水天需", "수천수", "기다림", "때가 오기를 기다리는 괘. 먹고 마시며 힘을 비축하세요. 조급하게 건너면 젖고, 기다리면 건넙니다.", 2],
  6: ["天水訟", "천수송", "다툼", "시비와 소송의 기운. 끝까지 이기려 들면 손해예요. 중간에서 합의하고, 큰일은 미루는 게 좋아요.", 1],
  7: ["地水師", "지수사", "무리를 이끎", "사람을 모아 질서 있게 움직이는 괘. 믿을 만한 리더·원칙이 있으면 이겨요.", 2],
  8: ["水地比", "수지비", "가까이함", "서로 돕고 친해지는 괘. 좋은 사람과 손잡기 좋은 때예요. 망설이다 늦으면 자리를 놓쳐요.", 3],
  9: ["風天小畜", "풍천소축", "작게 모음", "구름은 끼었는데 비가 아직 안 와요. 작은 것부터 차곡차곡 쌓으면 곧 내립니다.", 2],
  10: ["天澤履", "천택리", "조심히 밟기", "호랑이 꼬리를 밟아도 물리지 않는 괘. 예의와 조심성만 지키면 위험한 일도 무사히 넘어가요.", 2],
  11: ["地天泰", "지천태", "태평", "하늘과 땅이 통하는 최고의 길괘! 막혔던 일이 뚫리고 사람·돈이 모여요. 좋을 때 겸손히 다음을 준비하세요.", 3],
  12: ["天地否", "천지비", "막힘", "위아래가 통하지 않는 시기. 억지로 밀기보다 내실을 다지며 지나가길 기다리세요. 곧 바뀝니다.", 1],
  13: ["天火同人", "천화동인", "함께하는 사람", "뜻이 같은 사람과 손잡는 괘. 넓게 열린 마음으로 모이면 큰일도 해내요.", 3],
  14: ["火天大有", "화천대유", "크게 가짐", "하늘 위의 해처럼 크게 얻는 괘. 재물·명예가 따르니 나누면 더 커져요.", 3],
  15: ["地山謙", "지산겸", "겸손", "높은 산이 땅 아래 숨은 모습. 겸손하면 모든 일이 끝까지 잘 풀리는 드문 괘예요.", 3],
  16: ["雷地豫", "뇌지예", "즐거움·준비", "기쁨과 흥이 오르는 때. 미리 준비해 두면 즐거움이 길게 가요. 들뜸만 조심.", 3],
  17: ["澤雷隨", "택뢰수", "따름", "흐름을 따라가면 좋은 괘. 고집을 내려놓고 좋은 사람·변화를 따라가세요.", 2],
  18: ["山風蠱", "산풍고", "썩은 것을 고침", "오래 묵은 문제가 드러나요. 고치기 시작하면 오히려 새 출발의 기회가 됩니다.", 2],
  19: ["地澤臨", "지택림", "다가옴", "좋은 기운이 다가오는 괘. 적극적으로 나서면 일이 커져요. 다만 좋은 때도 끝이 있으니 미리 대비를.", 3],
  20: ["風地觀", "풍지관", "바라봄", "한발 물러서 크게 보는 때. 섣불리 움직이기보다 관찰하고 배우면 방향이 보여요.", 2],
  21: ["火雷噬嗑", "화뢰서합", "씹어 끊음", "가운데 걸린 장애물을 깨물어 끊어야 해요. 미루던 문제를 단호하게 해결할 때.", 2],
  22: ["山火賁", "산화비", "꾸밈", "겉을 아름답게 꾸미는 괘. 작은 일엔 좋지만, 꾸밈보다 속을 채우는 게 오래 가요.", 2],
  23: ["山地剝", "산지박", "벗겨짐", "깎이고 떨어져 나가는 시기. 새 일을 벌이지 말고 지킬 것만 지키세요. 바닥을 치면 다시 올라와요.", 1],
  24: ["地雷復", "지뢰복", "회복", "겨울 끝에 봄 기운이 돌아오는 괘. 다시 시작하기 좋아요. 천천히, 한 걸음씩.", 3],
  25: ["天雷无妄", "천뢰무망", "순수함", "꾀 부리지 않고 진심으로 하면 길해요. 요행을 바라면 뜻밖의 일이 생겨요.", 2],
  26: ["山天大畜", "산천대축", "크게 쌓음", "실력·재물을 크게 쌓는 괘. 공부·저축에 아주 좋고, 쌓은 뒤엔 큰 강을 건너도 돼요.", 3],
  27: ["山雷頤", "산뢰이", "기름(養)", "무엇을 먹고 무엇을 말하느냐가 중요해요. 몸·마음을 잘 먹이고, 말은 아끼세요.", 2],
  28: ["澤風大過", "택풍대과", "지나침", "기둥이 휠 만큼 짐이 무거워요. 혼자 다 지려 하지 말고 나누면 넘어갑니다.", 1],
  29: ["坎爲水", "감위수", "거듭된 험난함", "물이 겹친 어려운 괘. 그래도 물은 멈추지 않고 흘러 바다에 닿아요. 진심과 꾸준함으로 건너세요.", 1],
  30: ["離爲火", "이위화", "밝음·붙음", "불처럼 밝게 빛나는 괘. 좋은 사람·원칙에 붙어 있으면 빛나요. 너무 타오르면 금방 꺼져요.", 3],
  31: ["澤山咸", "택산함", "느낌·끌림", "마음이 서로 통하는 연애의 괘! 끌림과 설렘이 커요. 진심으로 다가가면 이어져요.", 3],
  32: ["雷風恒", "뇌풍항", "변치 않음", "오래 가는 관계·꾸준한 일에 좋은 괘. 하던 대로 꾸준히 지키면 길해요.", 3],
  33: ["天山遯", "천산돈", "물러남", "잠시 물러서는 게 이기는 때. 체면보다 실리를 챙기며 한발 빠지세요.", 1],
  34: ["雷天大壯", "뇌천대장", "크게 씩씩함", "힘이 넘쳐요. 하지만 힘으로만 밀면 뿔이 울타리에 걸려요. 바른 방향이 중요해요.", 2],
  35: ["火地晉", "화지진", "나아감", "해가 땅 위로 떠오르는 괘. 승진·인정·발전의 기운이 강해요. 적극적으로 나서세요.", 3],
  36: ["地火明夷", "지화명이", "빛을 감춤", "밝음이 땅에 묻힌 때. 실력을 드러내기보다 조용히 지키며 때를 기다리세요.", 1],
  37: ["風火家人", "풍화가인", "집안", "가족·내 사람을 챙길 때 길해요. 집 안의 질서가 바로 서면 바깥 일도 풀려요.", 3],
  38: ["火澤睽", "화택규", "어긋남", "서로 생각이 엇갈려요. 큰일은 어렵지만 작은 일은 괜찮아요. 다름을 인정하면 길이 보여요.", 1],
  39: ["水山蹇", "수산건", "절름거림", "앞에 물, 뒤에 산. 막혔을 땐 나를 돌아보고 도와줄 사람을 찾으세요. 서남쪽이 이로워요.", 1],
  40: ["雷水解", "뇌수해", "풀림", "얼었던 일이 풀리는 괘. 묵은 갈등·걱정이 해소돼요. 풀리면 빨리 정리하고 다음으로!", 3],
  41: ["山澤損", "산택손", "덜어냄", "덜어내야 더해지는 괘. 욕심·지출·나쁜 습관을 줄이면 결국 이득이에요.", 2],
  42: ["風雷益", "풍뢰익", "더함", "위에서 덜어 아래를 채우는 이로운 괘. 새로운 도전·투자·배움에 좋아요.", 3],
  43: ["澤天夬", "택천쾌", "결단", "끊어내야 할 것을 단호히 끊는 괘. 다만 감정적으로 싸우지 말고 공개적으로 정당하게.", 2],
  44: ["天風姤", "천풍구", "뜻밖의 만남", "갑자기 찾아온 만남·기회. 끌리지만 너무 깊이 빠지기 전에 잘 살펴보세요.", 2],
  45: ["澤地萃", "택지췌", "모임", "사람과 재물이 모이는 괘. 모임·행사·협업에 길해요. 모인 만큼 관리도 필요해요.", 3],
  46: ["地風升", "지풍승", "올라감", "나무가 땅을 뚫고 자라듯 차근차근 오르는 괘. 꾸준하면 승진·합격이 따라요.", 3],
  47: ["澤水困", "택수곤", "곤궁", "물이 빠진 연못. 말이 잘 안 통하고 지치는 때예요. 말보다 행동, 버티면 끝은 길해요.", 1],
  48: ["水風井", "수풍정", "우물", "마르지 않는 우물처럼 꾸준히 나누는 괘. 기본기를 닦고 사람을 돕는 일에 좋아요.", 2],
  49: ["澤火革", "택화혁", "변혁", "낡은 것을 바꾸는 괘. 이직·이사·변신에 좋아요. 때가 무르익었을 때 확실히 바꾸세요.", 3],
  50: ["火風鼎", "화풍정", "솥·새로움", "솥에 새 음식을 익히는 괘. 새 자리·새 역할을 맡아 크게 길해요.", 3],
  51: ["震爲雷", "진위뢰", "우레", "깜짝 놀랄 일이 와요. 처음엔 놀라도 침착하면 웃으며 지나가요.", 2],
  52: ["艮爲山", "간위산", "멈춤", "산처럼 멈출 때. 움직이지 말고 마음을 고요히 하면 허물이 없어요.", 2],
  53: ["風山漸", "풍산점", "점점 나아감", "단계를 밟아 천천히 가는 괘. 연애·결혼은 순서대로 가면 아주 좋아요.", 3],
  54: ["雷澤歸妹", "뇌택귀매", "서두른 관계", "순서를 건너뛴 관계·결정은 탈이 나요. 지금은 조급함을 내려놓을 때.", 1],
  55: ["雷火豐", "뇌화풍", "풍요", "한낮의 해처럼 가장 풍성한 때. 마음껏 누리되, 정점 뒤엔 기울기도 하니 나눔을.", 3],
  56: ["火山旅", "화산려", "나그네", "낯선 곳·이동의 괘. 여행·출장엔 괜찮지만 자리 잡기는 아직. 겸손하게 처신하세요.", 2],
  57: ["巽爲風", "손위풍", "스며듦", "바람처럼 부드럽게 스며드는 괘. 강하게 밀기보다 설득·소통으로 가면 길해요.", 2],
  58: ["兌爲澤", "태위택", "기쁨", "기쁨과 즐거운 대화가 넘치는 괘. 사람을 만나고 말하는 일에 좋아요. 달콤한 말만은 경계.", 3],
  59: ["風水渙", "풍수환", "흩어짐", "얼음이 녹아 흩어지는 괘. 뭉친 감정·오해가 풀려요. 흩어진 것을 다시 모을 중심을 세우세요.", 2],
  60: ["水澤節", "수택절", "절제", "적당히 끊고 아끼는 괘. 지출·감정·일정에 선을 그으면 길해요. 지나친 절제는 오히려 괴로워요.", 2],
  61: ["風澤中孚", "풍택중부", "속 깊은 믿음", "진심이 통하는 괘. 믿음을 주고받으면 큰일도 이뤄져요.", 3],
  62: ["雷山小過", "뇌산소과", "조금 지나침", "작은 일은 되고 큰일은 아직. 높이 날기보다 낮게, 조심스럽게 가세요.", 2],
  63: ["水火旣濟", "수화기제", "이미 이룸", "일이 완성된 괘. 지금은 좋지만 끝이 어지러울 수 있으니 마무리를 단단히.", 2],
  64: ["火水未濟", "화수미제", "아직 못 이룸", "아직 완성 전이에요. 끝이 아니라 시작! 신중하게 한 걸음씩 가면 결국 건너요.", 2],
};
const IC_TOPIC = {
  all: { name: "종합", 3: "흐름이 당신 편이에요. 미뤘던 일을 지금 시작하세요.", 2: "서두르지 않으면 무난하게 풀려요. 준비와 점검이 열쇠.", 1: "지금은 버티고 지킬 때. 큰 결정은 잠시 미뤄요." },
  love: { name: "연애", 3: "마음이 통하는 시기예요. 먼저 연락하거나 고백해도 좋아요.", 2: "천천히 알아 가면 좋아져요. 확답을 재촉하진 마세요.", 1: "오해가 생기기 쉬워요. 감정적인 말은 하루 묵혀 두세요." },
  work: { name: "일·합격", 3: "인정·합격·승진 기운이 있어요. 적극적으로 지원하세요.", 2: "실력을 쌓으면 다음 기회에 붙어요. 기본기 점검을.", 1: "지금 판을 크게 바꾸기보다 버티며 준비하는 게 이득이에요." },
  money: { name: "재물", 3: "돈이 모이는 흐름이에요. 계획한 투자·거래는 진행해도 좋아요.", 2: "들어오는 만큼 나가요. 고정지출부터 줄이세요.", 1: "돈거래·보증·충동구매는 금물. 지키는 게 버는 거예요." },
  health: { name: "건강", 3: "컨디션이 오르는 때예요. 새 운동을 시작하기 좋아요.", 2: "무리만 안 하면 괜찮아요. 수면·식사 리듬을 지켜요.", 1: "피로가 쌓이기 쉬워요. 쉬는 것도 일이에요." },
};
function hexOf(lines6) {
  const key = (ls) => Object.keys(TRI).find((k) => TRI[k].lines.join("") === ls.join(""));
  const lo = key(lines6.slice(0, 3)), up = key(lines6.slice(3));
  return { n: KW[KW_ORDER.indexOf(up)][KW_ORDER.indexOf(lo)], up, lo };
}
function hexSvg(lines, moving = []) {
  const NS = "http://www.w3.org/2000/svg";
  const s = document.createElementNS(NS, "svg");
  s.setAttribute("viewBox", "0 0 100 92"); s.setAttribute("class", "ic-hex"); s.setAttribute("aria-hidden", "true");
  s.innerHTML = lines.map((v, i) => {
    const y = 80 - i * 15, c = moving.includes(i) ? "ic-mv" : "";
    return v ? `<rect x="6" y="${y}" width="88" height="9" rx="3" class="ic-yang ${c}"/>`
      : `<rect x="6" y="${y}" width="38" height="9" rx="3" class="ic-yin ${c}"/><rect x="56" y="${y}" width="38" height="9" rx="3" class="ic-yin ${c}"/>`;
  }).join("");
  return s;
}

export function renderIching({ navigate }) {
  const root = el("div", {});
  head(root, navigate, "주역점", "동전 세 개로 묻는 64괘", "마음속 질문 하나를 떠올리고 동전을 여섯 번 던져요. 아래에서 위로 효(爻)가 쌓여 괘가 완성돼요.");
  const host = el("section", { class: "wrap section-gap" });
  root.append(host);
  let topic = "all", lines = [], vals = [], q = "";
  const cost = costOf("iching");
  function paint() {
    clear(host);
    const qIn = el("input", { class: "input", maxlength: "60", placeholder: "질문 (예: 이번 이직, 해도 될까?)", value: q, oninput: (e) => { q = e.target.value; } });
    host.append(el("div", { class: "panel section-gap" }, [
      el("p", { class: "eyebrow", text: "1. 무엇이 궁금한가요?" }), qIn,
      el("div", { class: "chip-grid" }, Object.entries(IC_TOPIC).map(([id, t]) => el("button", { type: "button", class: "theme-chip" + (topic === id ? " on" : ""), onclick: () => { topic = id; paint(); } }, [el("span", { text: t.name })]))),
    ]));
    const board = el("div", { class: "panel ic-board" }, [
      el("p", { class: "eyebrow", text: `2. 동전 던지기 (${lines.length}/6)` }),
      el("div", { class: "ic-stack" }, [...lines.map((v, i) => el("div", { class: "ic-line" + (vals[i] === 6 || vals[i] === 9 ? " mv" : "") }, [
        el("span", { class: "tiny muted", text: `${i + 1}효` }),
        v ? el("span", { class: "ic-bar yang" }) : el("span", { class: "ic-bar yin" }, [el("i"), el("i")]),
        el("span", { class: "tiny", text: { 6: "노음 ×(변함)", 7: "소양", 8: "소음", 9: "노양 ○(변함)" }[vals[i]] }),
      ])).reverse()]),
      el("div", { class: "ic-coins", "aria-live": "polite" }),
    ]);
    host.append(board);
    if (lines.length < 6) {
      host.append(el("button", { class: "btn btn-primary btn-block", onclick: () => {
        if (lines.length === 0) {
          const id = `iching:${Date.now()}`;
          return gate(id, cost, "주역점 시작", () => toss(board));
        }
        toss(board);
      } }, [el("span", { text: lines.length === 0 ? `🪙 동전 던지기 시작 · 코인 ${cost}개` : `🪙 ${lines.length + 1}번째 던지기` })]));
      host.append(el("p", { class: "tiny muted", text: "앞면=3, 뒷면=2. 세 동전의 합이 7·9면 양(—), 6·8이면 음(- -). 6·9는 ‘변하는 효’라 앞으로 바뀔 괘(지괘)를 만들어요." }));
    } else result();
  }
  function toss(board) {
    const coins = [0, 1, 2].map(() => (rnd() < 0.5 ? 3 : 2));
    const sum = coins.reduce((a, b) => a + b, 0);
    vals.push(sum); lines.push(sum % 2 === 1 ? 1 : 0);
    const box = board.querySelector(".ic-coins");
    box.replaceChildren(...coins.map((c) => el("span", { class: "ic-coin" + (c === 3 ? " front" : ""), text: c === 3 ? "앞" : "뒤" })));
    setTimeout(paint, 650);
  }
  function result() {
    const b = hexOf(lines);
    const moving = vals.map((v, i) => (v === 6 || v === 9 ? i : -1)).filter((i) => i >= 0);
    const changed = lines.map((v, i) => (moving.includes(i) ? 1 - v : v));
    const c = moving.length ? hexOf(changed) : null;
    const H = HEX[b.n], C = c ? HEX[c.n] : null;
    const tp = IC_TOPIC[topic];
    host.append(
      el("div", { class: "panel panel-gold ic-result" }, [
        el("p", { class: "eyebrow", text: q ? `질문: ${q}` : "당신의 괘" }),
        el("div", { class: "ic-res-top" }, [hexSvg(lines, moving), el("div", {}, [
          el("p", { class: "serif ic-name", text: `${b.n}. ${H[0]}` }),
          el("p", { class: "ic-kr", text: `${H[1]} — ${H[2]}` }),
          el("p", { class: "tiny muted", text: `위 ${TRI[b.up].sym} ${TRI[b.up].img}(${TRI[b.up].imgKr}) · 아래 ${TRI[b.lo].sym} ${TRI[b.lo].img}(${TRI[b.lo].imgKr})` }),
        ])]),
        el("span", { class: "ic-luck l" + H[4], text: ["", "조심 · 지킬 때", "보통 · 준비할 때", "길 · 나아갈 때"][H[4]] }),
        el("p", { style: "margin-top:10px;", text: H[3] }),
      ]),
      el("div", { class: "panel section-gap" }, [
        el("p", { class: "eyebrow", text: `${tp.name}으로 본 풀이` }),
        el("p", { text: tp[H[4]] }),
        ...(topic === "all" ? ["love", "work", "money"].map((k) => el("p", { class: "tiny" }, [el("b", { text: IC_TOPIC[k].name + " · " }), document.createTextNode(IC_TOPIC[k][H[4]])])) : []),
      ]),
      C ? el("div", { class: "panel section-gap" }, [
        el("p", { class: "eyebrow", text: "앞으로 바뀌어 갈 모습 (지괘 之卦)" }),
        el("div", { class: "ic-res-top" }, [hexSvg(changed), el("div", {}, [
          el("p", { class: "serif ic-name", text: `${c.n}. ${C[0]}` }), el("p", { class: "ic-kr", text: `${C[1]} — ${C[2]}` }),
        ])]),
        el("p", { text: `변하는 효: ${moving.map((i) => i + 1 + "효").join("·")}. 지금은 ‘${H[2]}’의 상황이지만, 흐름이 ‘${C[2]}’ 쪽으로 옮겨 가요. ${C[3]}` }),
      ]) : el("p", { class: "tiny muted", text: "변하는 효가 없어요 — 지금의 상황이 한동안 그대로 이어진다는 뜻이에요." }),
      el("button", { class: "btn btn-ghost btn-block", onclick: () => { lines = []; vals = []; paint(); window.scrollTo({ top: 0, behavior: "smooth" }); } }, [el("span", { text: "다른 질문으로 다시 던지기" })]),
      noticeBox("info", "주역점은 미래를 정해 주는 것이 아니라 지금 상황을 비춰 보는 거울이에요. 같은 질문을 여러 번 던지면 답이 흐려진다고 해요."),
    );
  }
  paint();
  return root;
}

/* ======================= 2. 풍수 · 개운 ======================= */
const FS = {
  wood: { dir: "동쪽", color: "초록·민트", item: "초록 식물·원목 가구·세로 줄무늬", place: "숲·공원·식물원", food: "푸른 채소·새싹·신맛 과일", time: "아침 5~9시", num: "3·8" },
  fire: { dir: "남쪽", color: "빨강·코랄·보라", item: "따뜻한 조명·캔들·삼각형 소품", place: "햇살 좋은 카페·공연장", food: "쌉싸름한 차·붉은 과일", time: "낮 11~15시", num: "2·7" },
  earth: { dir: "집의 가운데·남서/북동", color: "베이지·노랑·브라운", item: "도자기·러그·네모난 쿠션", place: "들판·전통 시장·도예 공방", food: "고구마·호박·잡곡", time: "환절기·식사 시간", num: "5·10" },
  metal: { dir: "서쪽", color: "화이트·실버·골드", item: "금속 액세서리·동그란 거울·시계", place: "전시장·잘 정돈된 도서관", food: "무·배·견과류", time: "저녁 15~19시", num: "4·9" },
  water: { dir: "북쪽", color: "네이비·블랙·딥블루", item: "어항·물 그림·물결무늬", place: "바다·강변·수영장", food: "해조류·검은콩·국물 요리", time: "밤 21~1시", num: "1·6" },
};
const KILLER = { wood: "metal", fire: "water", earth: "wood", metal: "fire", water: "earth" };
const GAEUN_TASKS = {
  wood: ["아침 산책 10분", "화분에 물 주기", "새 책 10쪽 읽기", "스트레칭으로 몸 늘리기", "하고 싶은 일 1줄 쓰기", "초록 옷·소품 하나 지니기", "누군가를 칭찬하기"],
  fire: ["햇볕 15분 쬐기", "좋아하는 노래 크게 듣기", "감사한 일 3개 쓰기", "밝은 색 옷 입기", "사진 한 장 SNS에 올리기", "친구에게 먼저 연락하기", "따뜻한 차 한 잔"],
  earth: ["책상 한 칸 정리하기", "제때 세 끼 먹기", "가계부 한 줄 쓰기", "약속 시간 5분 먼저 가기", "흙 밟기·맨발 걷기", "오래된 물건 하나 비우기", "가족에게 안부 묻기"],
  metal: ["귀걸이·시계 깨끗이 닦기", "미루던 결정 하나 하기", "근력 운동 10분", "옷장 정리", "할 일 목록 지우기", "흰 옷 입기", "깊게 숨 10번 쉬기"],
  water: ["물 8잔 마시기", "11시 전에 눕기", "일기·명상 5분", "반신욕·족욕", "조용한 음악 듣기", "궁금한 것 하나 찾아보기", "네이비·블랙 소품 지니기"],
};
const BUJEOK = [
  { id: "love", name: "연애·인연", h: "緣", kr: "연", sub: "좋은 인연을 부르는 부적", wish: "좋은 사람과 따뜻한 인연이 닿기를" },
  { id: "money", name: "재물", h: "招財", kr: "초재", sub: "재물을 부르는 부적", wish: "들어오는 돈은 머물고 새는 돈은 막히기를" },
  { id: "pass", name: "합격·시험", h: "合格", kr: "합격", sub: "합격을 비는 부적", wish: "준비한 만큼, 그 이상으로 결과가 나오기를" },
  { id: "health", name: "건강", h: "安康", kr: "안강", sub: "몸과 마음이 편안하길 비는 부적", wish: "아프지 않고 푹 자고 잘 먹기를" },
  { id: "people", name: "인간관계", h: "和合", kr: "화합", sub: "사람 사이를 부드럽게 하는 부적", wish: "곁의 사람들과 오해 없이 가까워지기를" },
  { id: "guard", name: "액막이", h: "除厄", kr: "제액", sub: "나쁜 기운을 막는 부적", wish: "올 나쁜 일은 비켜 가고 좋은 일만 머물기를" },
  { id: "job", name: "취업·승진", h: "登龍", kr: "등룡", sub: "용문에 오르길 비는 부적", wish: "원하는 자리에 당당히 오르기를" },
];
const FCOL = { wood: ["#2f7d5b", "#e6f5ec"], fire: ["#c0392b", "#fff0ea"], earth: ["#a2700f", "#fff6dc"], metal: ["#6b667e", "#fbfbff"], water: ["#1f3b73", "#e8efff"] };

export function renderGaeun({ navigate, tab = "fengshui" }) {
  const root = el("div", {});
  head(root, navigate, "풍수 · 개운", "내 사주에 맞춘 방 배치와 개운법", "용신(나에게 필요한 오행)으로 방향·색·소품을 정하고, 7일 개운 습관과 개운 부적까지 만들어요.", "누구 기준으로 볼까?");
  const my = getMyBirth();
  if (!my) return needBirth(root, navigate);
  const profile = computeSaju(my);
  const S = analyzeStrength(profile);
  const y = S.yongsin[0], g = KILLER[y], F = FS[y];
  const host = el("section", { class: "wrap section-gap" });
  root.append(host);
  let cur = tab;
  const sig = `${my.birthDate}_${my.timeUnknown ? "x" : my.birthTime || "-"}`;
  function paint() {
    clear(host);
    host.append(el("div", { class: "method-tabs" }, [["fengshui", "🏠 풍수"], ["habit", "🌱 개운 습관"], ["bujeok", "🧧 부적"]].map(([id, t]) =>
      el("button", { class: "method-tab" + (cur === id ? " on" : ""), onclick: () => { cur = id; paint(); } }, [el("span", { text: t })]))));
    host.append(el("div", { class: "panel fs-key" }, [
      el("span", { class: `ys-h elem-${y}`, text: EH[y] }),
      el("div", {}, [el("b", { text: `나의 용신 ${EK[y]}` }), el("p", { class: "tiny muted", text: `${S.levelName} 사주 · 일간 ${profile.dayMaster}. ${S.yongsinDesc}` })]),
    ]));
    if (cur === "fengshui") paintFs(); else if (cur === "habit") paintHabit(); else paintBujeok();
  }
  function paintFs() {
    const id = `gaeun:${sig}`, cost = costOf("gaeun");
    if (!isUnlocked(id)) return host.append(lockBox("내 사주 맞춤 풍수 배치 열기", "침대 머리 방향 · 책상 방향 · 현관 · 행운 색 · 피할 배치 · 집 밖 개운 장소", cost, () => gate(id, cost, "풍수 배치를 열었어요", paint)));
    const rows = [
      ["🛏️ 침대 머리 방향", `${F.dir}을 향하게 두면 자는 동안 ${EK[y]} 기운을 채워요. 어렵다면 그쪽 벽에 ${F.color} 계열 패브릭을.`],
      ["🖥️ 책상·공부 자리", `앉았을 때 ${F.dir}을 바라보거나, 책상 위에 ${F.item.split("·")[0]}를 하나 두세요. 등 뒤는 벽이 있으면 안정감이 커져요.`],
      ["🚪 현관", "현관은 기운이 들어오는 입구예요. 신발은 3켤레 이하로, 밝은 조명과 깨끗한 매트 하나면 충분해요."],
      ["🎨 행운 색·소품", `${F.color} / ${F.item}`],
      ["🍽️ 개운 음식", F.food],
      ["⏰ 기운이 오르는 시간", `${F.time} — 중요한 연락·공부는 이 시간대에.`],
      ["🔢 행운 숫자", F.num],
      ["🧭 집 밖 개운 장소", F.place],
    ];
    host.append(
      el("div", { class: "panel section-gap" }, [el("p", { class: "eyebrow", text: "내 방 풍수 배치" }), el("div", { class: "fs-rows" }, rows.map(([k, v]) => el("div", { class: "fs-row" }, [el("b", { text: k }), el("p", { text: v })])))]),
      el("div", { class: "block tag-warn" }, [el("span", { class: "block-label", text: `피하면 좋은 것 — 기신(忌神) ${EK[g]}` }),
        el("p", { text: `${FS[g].color} 계열이 방을 가득 채우거나, ${FS[g].item.split("·")[0]}가 너무 많으면 기운이 눌려요. 완전히 없애기보다 ‘포인트’ 정도로만 두세요.` })]),
      S.johu.element && S.johu.element !== y ? el("div", { class: "block tag-good" }, [el("span", { class: "block-label", text: `계절 보정(조후) — ${EK[S.johu.element]}` }), el("p", { text: `${S.johu.note} ${FS[S.johu.element].item.split("·")[0]} 하나를 더하면 좋아요.` })]) : null,
      noticeBox("info", "풍수·개운은 생활을 정돈하는 재미있는 참고 방법이에요. 무리한 이사·구매보다 작은 것부터 바꿔 보세요."),
    );
  }
  function paintHabit() {
    const KEY = "hm.gaeun.v1";
    let st = {}; try { st = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch {}
    const tasks = GAEUN_TASKS[y];
    const k = `${sig}:${today()}`;
    const done = new Set(st[k] || []);
    const streak = (() => { let n = 0; const d = new Date(); for (let i = 0; i < 60; i++) { const key = `${sig}:${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; if ((st[key] || []).length) n++; else if (i) break; d.setDate(d.getDate() - 1); } return n; })();
    const save = () => { st[k] = [...done]; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} };
    host.append(el("div", { class: "panel section-gap" }, [
      el("p", { class: "eyebrow", text: `${EK[y]} 기운을 채우는 오늘의 개운 습관` }),
      el("p", { class: "tiny muted", text: `하나만 해도 충분해요. 체크하면 오늘 날짜로 기록돼요. 연속 ${streak}일째 🌱` }),
      el("div", { class: "gh-list" }, tasks.map((t, i) => {
        const b = el("button", { type: "button", class: "gh-item" + (done.has(i) ? " on" : ""), "aria-pressed": String(done.has(i)), onclick: () => {
          done.has(i) ? done.delete(i) : done.add(i); save(); b.classList.toggle("on"); b.setAttribute("aria-pressed", String(done.has(i)));
          if (done.size === tasks.length) toast("오늘 개운 습관 올클리어! 🎉");
        } }, [el("span", { class: "gh-c", text: "✓" }), el("span", { text: t })]);
        return b;
      })),
    ]));
  }
  function paintBujeok() {
    let pick = BUJEOK[0];
    const area = el("div", {});
    const chips = el("div", { class: "chip-grid" });
    const draw = () => {
      clear(chips); clear(area);
      BUJEOK.forEach((b) => chips.append(el("button", { type: "button", class: "theme-chip" + (pick.id === b.id ? " on" : ""), onclick: () => { pick = b; draw(); } }, [el("span", { text: b.name })])));
      const id = `bujeok:${sig}:${pick.id}`, cost = costOf("bujeok");
      if (!isUnlocked(id)) { area.append(lockBox(`${pick.name} 부적 만들기`, `${pick.sub} — 내 용신 색(${F.color})으로 그려 드려요. 한 번 만들면 다시 보기·저장은 무료예요.`, cost, () => gate(id, cost, "부적을 만들었어요", draw))); return; }
      const [ink, paper] = FCOL[y];
      const card = el("div", { class: "bj-card", style: `--ink:${ink}; --paper:${paper};` }, [
        el("span", { class: "bj-top", text: "解猫 符" }),
        el("span", { class: "bj-main serif" }, [...pick.h].map((ch) => el("span", { text: ch }))),
        el("span", { class: "bj-kr", text: `${pick.h}(${pick.kr})` }),
        el("div", { class: "bj-seal", text: EH[y] }),
        el("span", { class: "bj-name", text: `${my.name || "나"} · ${EK[y]} 용신` }),
        el("span", { class: "bj-wish", text: pick.wish }),
      ]);
      area.append(el("div", { class: "panel section-gap", style: "justify-items:center; text-align:center;" }, [
        card,
        el("p", { class: "tiny muted", text: "폰 배경화면이나 지갑 속에 두고, 소원을 하루 한 번 떠올려 보세요." }),
        el("button", { class: "btn btn-primary", onclick: () => exportNodeAsImage(card, `haemyo-bujeok-${pick.id}.png`).catch(() => toast("이미지 저장에 실패했어요. 화면을 캡처해 주세요.")) }, [el("span", { text: "이미지로 저장" })]),
      ]));
    };
    host.append(el("div", { class: "panel section-gap" }, [el("p", { class: "eyebrow", text: "어떤 소원을 담을까요?" }), chips]), area);
    draw();
  }
  paint();
  return root;
}

/* ======================= 3. 행운 번호 ======================= */
export function renderLuckyNumber({ navigate }) {
  const root = el("div", {});
  head(root, navigate, "행운 번호", "오늘 내 사주가 고른 숫자", "용신 숫자와 오늘의 일진으로 1~45 중 여섯 개를 골라요. 하루 한 번 무료!", "누구의 행운 번호를 볼까?");
  const my = getMyBirth();
  if (!my) return needBirth(root, navigate);
  const S = analyzeStrength(computeSaju(my));
  const y = S.yongsin[0];
  const ends = FS[y].num.split("·").map(Number).map((n) => n % 10);
  const host = el("section", { class: "wrap section-gap" });
  root.append(host);
  let extra = 0;
  function pickNums(seedStr) {
    const r = mulberry32(seedFromString(seedStr));
    const pool = []; for (let n = 1; n <= 45; n++) pool.push({ n, w: ends.includes(n % 10) ? 2.6 : 1 });
    const out = [];
    while (out.length < 7) { const tot = pool.reduce((a, b) => a + b.w, 0); let x = r() * tot; const i = pool.findIndex((p) => (x -= p.w) <= 0); out.push(pool.splice(i < 0 ? 0 : i, 1)[0].n); }
    return { main: out.slice(0, 6).sort((a, b) => a - b), bonus: out[6] };
  }
  const ballCls = (n) => n <= 10 ? "b1" : n <= 20 ? "b2" : n <= 30 ? "b3" : n <= 40 ? "b4" : "b5";
  function paint() {
    clear(host);
    const sets = [];
    for (let i = 0; i <= extra; i++) sets.push(pickNums(`${my.birthDate}|${my.birthTime || ""}|${today()}|${i}`));
    host.append(el("div", { class: "panel panel-gold", style: "text-align:center;" }, [
      el("p", { class: "eyebrow", style: "justify-content:center;", text: `${today()} · 용신 ${EK[y]} · 행운 끝자리 ${ends.join("·")}` }),
      ...sets.map((s, i) => el("div", { class: "ln-row" }, [
        el("span", { class: "tiny muted", text: i ? `추가 ${i}` : "오늘" }),
        ...s.main.map((n) => el("span", { class: `ln-ball ${ballCls(n)}` + (ends.includes(n % 10) ? " lucky" : ""), text: String(n) })),
        el("span", { class: "ln-plus", text: "+" }),
        el("span", { class: `ln-ball ${ballCls(s.bonus)}`, text: String(s.bonus) }),
      ])),
      el("p", { class: "tiny muted", style: "margin-top:8px;", text: "반짝이는 공은 나의 용신 숫자로 끝나는 번호예요." }),
    ]));
    host.append(el("button", { class: "btn btn-ghost btn-block", onclick: () => {
      const id = `lotto:${my.birthDate}:${today()}:${extra + 1}`, cost = costOf("lottoagain");
      gate(id, cost, "번호를 하나 더 뽑았어요", () => { extra++; paint(); });
    } }, [el("span", { text: `한 세트 더 뽑기 · 코인 ${costOf("lottoagain")}개` })]));
    host.append(noticeBox("info", "재미로 보는 숫자예요. 당첨을 약속하지 않으며, 복권은 꼭 여유 돈 안에서 즐겨 주세요."));
  }
  paint();
  return root;
}

/* ======================= 4. 사주툰 (4컷) ======================= */
const TOON = [
  [["🌳", "아침부터 계획표 세우는 중!", "오늘도 쑥쑥 자라야지"], ["💼", "일할 땐 직진", "돌아가는 길은 모르는 편"], ["💗", "연애할 땐 든든한 나무", "그늘이 되어 줄게"], ["🌙", "밤엔 내일 할 일 또 추가", "…나 좀 쉬어야 하나?"]],
  [["🌱", "일어나서 분위기부터 살펴요", "오늘 다들 기분 괜찮나?"], ["🗂️", "일할 땐 꼼꼼 유연 모드", "틈새를 기막히게 찾아내요"], ["🌸", "연애는 덩굴처럼 스르륵", "어느새 곁에 있어요"], ["🛋️", "밤엔 혼자 서운함 정리", "말할까 말까 100번 고민"]],
  [["☀️", "기상! 텐션 100%", "오늘도 내가 분위기 메이커"], ["📣", "회의에선 아이디어 폭발", "다들 내 말 좀 들어 봐!"], ["🔥", "연애는 화끈하게 직진", "좋으면 좋다고 말해요"], ["🎆", "밤엔 갑자기 방전", "불꽃은 짧고 굵게…"]],
  [["🕯️", "조용히 촛불 켜고 시작", "작은 것도 정성스럽게"], ["🎨", "일할 땐 디테일 장인", "남들이 못 본 걸 봐요"], ["💌", "연애는 은근한 배려", "티 안 나게 다 챙겨요"], ["🌌", "밤엔 감성 폭발", "옛날 노래 들으며 생각 정리"]],
  [["⛰️", "아침에도 흔들림 없음", "알람? 다섯 번 울려야 일어나요"], ["🏛️", "일할 땐 듬직한 버팀목", "다들 나한테 물어봐요"], ["🤝", "연애는 묵직한 신뢰", "말보다 행동으로 보여 줘요"], ["😴", "밤엔 일찍 꿈나라", "고민은 내일의 내가 해요"]],
  [["🌾", "아침엔 텃밭 가꾸듯 정리", "오늘 할 일 차곡차곡"], ["🧮", "일할 땐 살림꾼", "예산·일정 다 맞춰요"], ["🍲", "연애는 밥 챙겨 주는 사랑", "먹었어? 가 사랑 표현"], ["📒", "밤엔 가계부 정리", "오늘도 알뜰했다!"]],
  [["⚔️", "아침부터 결단력 MAX", "할 건 하고 끝낸다"], ["📏", "일할 땐 원칙주의자", "대충은 용납 못 해요"], ["🛡️", "연애는 츤데레 보디가드", "말은 툭툭, 행동은 든든"], ["🏋️", "밤엔 운동으로 마무리", "땀 흘려야 개운해요"]],
  [["💎", "거울 앞 5분 점검", "오늘도 빛나야지"], ["✂️", "일할 땐 칼같이 정확", "실수 하나도 안 넘어가요"], ["💍", "연애는 기준이 확실", "아무나 안 만나요"], ["🫧", "밤엔 예민 레이더 작동", "오늘 그 말… 무슨 뜻이지?"]],
  [["🌊", "아침엔 큰 그림부터", "오늘의 흐름을 읽어요"], ["🧠", "일할 땐 전략가", "판 전체를 봐요"], ["🐳", "연애는 깊고 넓게", "다 품어 줄게"], ["🌀", "밤엔 생각이 바다처럼", "끝없이 깊어져요"]],
  [["💧", "아침 이슬처럼 조용히", "눈치 빠르게 하루 시작"], ["🔍", "일할 땐 숨은 해결사", "몰래 다 해 놓아요"], ["☔", "연애는 촉촉한 공감왕", "네 기분 다 알아"], ["📖", "밤엔 혼자만의 세계", "책·영화로 충전 중"]],
];
export function renderSajuToon({ navigate }) {
  const root = el("div", {});
  head(root, navigate, "사주툰", "내 사주로 그린 4컷 만화", "태어난 날의 천간(일간)으로 나의 하루를 해묘 고양이가 4컷으로 그려 줘요.", "누구의 사주툰을 볼까?");
  const my = getMyBirth();
  if (!my) return needBirth(root, navigate);
  const profile = computeSaju(my);
  const si = profile.pillars.day.stemIdx;
  const S = analyzeStrength(profile);
  const host = el("section", { class: "wrap section-gap" });
  root.append(host);
  const id = `sajutoon:${my.birthDate}`, cost = costOf("sajutoon");
  function paint() {
    clear(host);
    if (!isUnlocked(id)) return host.append(lockBox("나의 사주툰 열기", "아침 · 일할 때 · 연애할 때 · 밤 — 일간으로 그린 나의 하루 4컷 + 한 줄 총평", cost, () => gate(id, cost, "사주툰을 열었어요", paint)));
    const T = TOON[si];
    const strip = el("div", { class: "toon" }, [
      el("p", { class: "toon-title serif", text: `${my.name || "나"}의 하루 — 일간 ${STEM_KR[si]}` }),
      el("div", { class: "toon-grid" }, T.map(([em, a, b], i) => el("div", { class: `toon-cell t${i}` }, [
        el("span", { class: "toon-no", text: String(i + 1) }),
        el("div", { class: "toon-bub" }, [el("b", { text: a }), el("span", { text: b })]),
        el("img", { class: "toon-cat", src: "assets/img/haemyo.webp", alt: "" }),
        el("span", { class: "toon-em", text: em }),
      ]))),
      el("p", { class: "toon-foot", text: `총평 · ${S.levelName} 사주 — ${S.strength === "신강" ? "에너지가 넘치니 쉬는 법도 배워요!" : S.strength === "신약" ? "좋은 사람 곁에서 더 빛나는 타입이에요!" : "균형 잡힌 하루, 이대로만 가요!"}` }),
      el("span", { class: "toon-mark", text: "해묘 解猫" }),
    ]);
    host.append(strip, el("div", { class: "toon-acts" }, [
      el("button", { class: "btn btn-primary", onclick: () => exportNodeAsImage(strip, "haemyo-sajutoon.png").catch(() => toast("이미지 저장에 실패했어요. 화면을 캡처해 주세요.")) }, [el("span", { text: "이미지로 저장" })]),
      el("button", { class: "btn btn-ghost", onclick: () => navigate("/saju") }, [el("span", { text: "사주 자세히 보기" })]),
    ]));
  }
  paint();
  return root;
}

/* ======================= 5. 이달의 명심보감 ======================= */
// 명심보감(明心寶鑑, 고려 말 편찬 고전) — 원문 · 한글 독음 · 해묘 풀이
const CLASSIC = [
  ["繼善篇", "계선편", "爲善者 天報之以福", "위선자 천보지이복", "착한 일을 하는 사람에게는 하늘이 복으로 갚는다.", "새해 첫 달, 작은 선행 하나로 한 해의 복을 미리 심어 두세요."],
  ["繼善篇", "계선편", "勿以善小而不爲 勿以惡小而爲之", "물이선소이불위 물이악소이위지", "선이 작다고 안 하지 말고, 악이 작다고 하지 마라.", "사소한 친절이 쌓여 운이 돼요. 이번 달은 ‘작은 것’에 집중!"],
  ["安分篇", "안분편", "知足常足 終身不辱", "지족상족 종신불욕", "만족할 줄 알면 늘 넉넉하고, 평생 욕되지 않는다.", "봄맞이 욕심이 커지는 때. 가진 것을 세어 보면 마음이 넉넉해져요."],
  ["存心篇", "존심편", "責人之心責己 恕己之心恕人", "책인지심책기 서기지심서인", "남을 꾸짖는 마음으로 나를 꾸짖고, 나를 용서하는 마음으로 남을 용서하라.", "관계가 바빠지는 달. 서운함보다 이해를 먼저 꺼내 보세요."],
  ["省心篇", "성심편", "家和萬事成", "가화만사성", "집안이 화목하면 모든 일이 이루어진다.", "가정의 달! 가족·내 사람에게 먼저 연락하면 운이 열려요."],
  ["戒性篇", "계성편", "忍一時之忿 免百日之憂", "인일시지분 면백일지우", "한때의 분함을 참으면 백 날의 근심을 면한다.", "더위에 예민해지기 쉬운 달. 화가 날 땐 딱 10초만 참아요."],
  ["正己篇", "정기편", "一日淸閑 一日仙", "일일청한 일일선", "하루가 맑고 한가로우면 그 하루는 신선이다.", "한여름, 하루쯤은 아무것도 하지 않는 날을 선물하세요."],
  ["交友篇", "교우편", "不知其子 視其友", "부지기자 시기우", "그 사람을 모르겠거든 그 친구를 보라.", "나를 만드는 건 곁의 사람들. 좋은 기운의 친구를 가까이."],
  ["勸學篇", "권학편", "少年易老學難成 一寸光陰不可輕", "소년이로학난성 일촌광음불가경", "젊음은 쉬 늙고 배움은 이루기 어려우니, 짧은 시간도 가벼이 말라.", "공부하기 좋은 가을의 시작. 하루 30분을 나에게 투자해요."],
  ["省心篇", "성심편", "黃金千兩未爲貴 得人一語勝千金", "황금천냥미위귀 득인일어승천금", "황금 천 냥이 귀한 게 아니라, 사람의 좋은 말 한마디가 천금보다 낫다.", "이번 달은 말 한마디가 운을 바꿔요. 고마움을 꼭 말로 전하세요."],
  ["省心篇", "성심편", "人無遠慮 難成大業", "인무원려 난성대업", "멀리 내다보는 생각이 없으면 큰일을 이루기 어렵다.", "한 해의 끝이 보일 때, 내년의 큰 그림을 한 장 그려 보세요."],
  ["存心篇", "존심편", "但存心裏正 不用問前程", "단존심리정 불용문전정", "마음속을 바르게 지키면 앞길을 물을 필요가 없다.", "한 해를 정리하며, 나를 믿어 주는 것이 최고의 개운이에요."],
];
const CL_ELEM = {
  wood: "목(木) 일간인 당신은 성장욕이 커요. 이 구절을 ‘속도보다 방향’으로 읽어 보세요.",
  fire: "화(火) 일간인 당신은 표현이 빨라요. 이 구절을 ‘한 박자 쉬어 가기’로 읽어 보세요.",
  earth: "토(土) 일간인 당신은 책임감이 커요. 이 구절을 ‘나도 돌보기’로 읽어 보세요.",
  metal: "금(金) 일간인 당신은 기준이 분명해요. 이 구절을 ‘부드러운 원칙’으로 읽어 보세요.",
  water: "수(水) 일간인 당신은 생각이 깊어요. 이 구절을 ‘생각을 행동으로’로 읽어 보세요.",
};
export function renderClassic({ navigate }) {
  const root = el("div", {});
  const m = new Date().getMonth();
  head(root, navigate, "이달의 명심보감", `${new Date().getFullYear()}년 ${m + 1}월의 한 구절`, "고전 명심보감(明心寶鑑)에서 이달에 어울리는 한 구절을 골라, 내 일간에 맞춰 풀어 드려요. 무료!", "누구에게 맞춰 풀까?");
  const my = getMyBirth();
  const elem = my ? computeSaju(my).dayMasterElem : null;
  const host = el("section", { class: "wrap section-gap" });
  root.append(host);
  let sel = m;
  function paint() {
    clear(host);
    const c = CLASSIC[sel];
    host.append(el("div", { class: "panel cl-card" }, [
      el("p", { class: "eyebrow", text: `${sel + 1}월 · ${c[0]}(${c[1]})` }),
      el("p", { class: "cl-h serif", text: c[2] }),
      el("p", { class: "cl-r", text: c[3] }),
      el("p", { class: "cl-t", text: `“${c[4]}”` }),
      el("p", { text: c[5] }),
      elem ? el("p", { class: "block tag-good", text: CL_ELEM[elem] }) : null,
    ].filter(Boolean)));
    host.append(el("div", { class: "cl-months" }, CLASSIC.map((x, i) => el("button", { type: "button", class: "theme-chip" + (i === sel ? " on" : ""), onclick: () => { sel = i; paint(); } }, [el("span", { text: `${i + 1}월` })]))));
  }
  paint();
  return root;
}

/* ======================= 6. 사주 건강운 ======================= */
const ORGAN = {
  wood: { org: "간·담(쓸개)·눈·근육", sign: "눈이 쉽게 피로하거나, 뻐근하고 쉽게 짜증이 나요.", care: "스트레칭, 일찍 자기, 초록 채소, 눈 쉬게 하기" },
  fire: { org: "심장·소장·혈액순환", sign: "가슴이 두근거리거나 잠이 얕고 얼굴이 쉽게 달아올라요.", care: "격한 감정 다스리기, 충분한 수면, 카페인 줄이기" },
  earth: { org: "위·비장(소화)·피부", sign: "소화가 더디고 더부룩하거나 군것질이 늘어요.", care: "규칙적인 세 끼, 천천히 씹기, 따뜻한 음식" },
  metal: { org: "폐·대장·호흡기·피부", sign: "목이 칼칼하고 건조하거나 장이 예민해져요.", care: "가습, 깊은 호흡, 유산소 운동, 물 자주 마시기" },
  water: { org: "신장·방광·귀·뼈·생식", sign: "몸이 붓거나 허리가 뻐근하고 쉽게 추워요.", care: "몸 따뜻하게, 짠 음식 줄이기, 충분한 휴식" },
};
export function renderHealthSaju({ navigate }) {
  const root = el("div", {});
  const now = new Date(), Y = now.getFullYear(), Mo = now.getMonth() + 1;
  head(root, navigate, "사주 건강운", `${Mo}월, 내 몸은 어떤 기운?`, "오행의 많고 적음으로 타고난 체질 포인트를, 이달의 월운으로 신경 쓸 곳을 알려 드려요.", "누구의 건강운을 볼까?");
  const my = getMyBirth();
  if (!my) return needBirth(root, navigate);
  const profile = computeSaju(my);
  const host = el("section", { class: "wrap section-gap" });
  root.append(host);
  const id = `healthsaju:${my.birthDate}:${Y}-${Mo}`, cost = costOf("healthsaju");
  function paint() {
    clear(host);
    if (!isUnlocked(id)) return host.append(lockBox(`${Mo}월 사주 건강운 열기`, "타고난 약한 오행 · 넘치는 오행 · 이달 월운이 건드리는 곳 · 생활 관리 팁 · 컨디션 좋은 날", cost, () => gate(id, cost, "건강운을 열었어요", paint)));
    const EC = profile.elementCounts || {};
    const order = Object.keys(ORGAN).sort((a, b) => (EC[a] || 0) - (EC[b] || 0));
    const weak = order[0], strong = order[4];
    const t = computeSaju({ calendarType: "solar", birthDate: `${Y}-${String(Mo).padStart(2, "0")}-15`, birthTime: "12:00", timeUnknown: true, gender: "male", timezone: "Asia/Seoul" });
    const mE = BRANCH_ELEM[t.pillars.month.branchIdx], mS = STEM_ELEM[t.pillars.month.stemIdx];
    const hit = KILLER[weak] === mE || KILLER[weak] === mS;
    const score = Math.max(48, Math.min(92, 74 + (EC[mE] ? 0 : 4) - (hit ? 14 : 0) + (mE === weak || mS === weak ? 10 : 0)));
    const card = (e, title, txt) => el("div", { class: `ys-card elem-${e}` }, [
      el("div", { class: "ys-top" }, [el("span", { class: "ys-h", text: EH[e] }), el("div", {}, [el("span", { class: "ys-role", text: title }), el("b", { text: `${EK[e]} · ${ORGAN[e].org}` })])]),
      el("p", { class: "tiny", text: txt }),
      el("p", { class: "tiny" }, [el("b", { text: "관리: " }), document.createTextNode(ORGAN[e].care)]),
    ]);
    host.append(
      el("div", { class: "panel panel-gold", style: "text-align:center;" }, [
        el("p", { class: "eyebrow", style: "justify-content:center;", text: `${Y}년 ${Mo}월 컨디션 지수` }),
        el("p", { class: "serif", style: "font-size:2.4rem;", text: `${score}점` }),
        el("p", { class: "muted", text: `이달 월운 ${t.pillars.month.hanja || ""} — ${EK[mS]}·${EK[mE]} 기운이 들어와요.` }),
      ]),
      el("div", { class: "ys-grid section-gap" }, [
        card(weak, "타고난 약한 오행", `${EK[weak]} 기운이 적어 ${ORGAN[weak].sign} 이런 신호가 오면 쉬어 가세요.`),
        card(strong, "넘치는 오행", `${EK[strong]} 기운이 많아 이 부분을 많이 쓰는 편이에요. 과로하면 ${ORGAN[strong].sign}`),
      ]),
      el("div", { class: hit ? "block tag-warn" : "block tag-good" }, [
        el("span", { class: "block-label", text: hit ? `이달 주의 — ${EK[weak]}이(가) 눌리는 달` : "이달은 비교적 무난해요" }),
        el("p", { text: hit ? `이달 들어오는 기운이 약한 ${EK[weak]}를 눌러요. ${ORGAN[weak].care}를 평소보다 신경 써 주세요.` : `이달 기운이 약한 ${EK[weak]}을(를) 크게 건드리지 않아요. 지금 리듬을 유지하면서 ${ORGAN[weak].care.split(",")[0]}만 챙겨요.` }),
      ]),
      noticeBox("warn", "전통 오행 이론에 따른 생활 관리 참고 콘텐츠로, 의학적 진단이 아니에요. 몸이 불편하면 꼭 병원 진료를 받으세요."),
    );
  }
  paint();
  return root;
}

/* ===================================================================
   (합침) dream.js — 파일 수를 줄이려고 이 파일 안으로 옮김 (HAE)
   =================================================================== */
/* 꿈해몽 사전 — 상징 140여 개 + 비슷한 말(별칭) + 꿈속 행동·기분 풀이.
   사전에 딱 맞는 단어가 없어도 '꿈의 결'로 풀어 줘요. 재미·참고용. */
const RAW = `돼지|길|재물·행운의 대표 길몽이에요. 뜻밖의 수입이나 좋은 기회가 다가와요.|재물운이 열리는 시기 — 계약·기회를 놓치지 마세요.|돼지꿈,멧돼지,새끼돼지,아기돼지|동물
똥|길|대표적인 재물운! 몸에 묻을수록 더 큰 재물을 뜻해요.|금전 기회가 오면 적극적으로.|대변,변,화장실똥,응가|몸
뱀|길|재물·지혜·태몽의 상징. 뱀을 잡거나 품으면 특히 길해요.|임신·재물 소식의 전조로도 봐요.|구렁이,독사,큰뱀,흰뱀|동물
피|길|피는 재물의 상징이에요. 피를 보면 오히려 금전운이 열려요.|돈 들어올 일을 기대해도 좋아요.|코피,출혈,피흘|몸
아기|길|새 시작·기회·태몽. 예쁜 아기일수록 길해요.|새 프로젝트·인연의 전조.|아이,신생아,갓난아기,애기|사람
죽음|길|죽는 꿈은 오히려 재생·변화·새 출발의 길몽이에요.|낡은 것을 정리하고 새로 시작하기 좋아요.|죽는,죽었,사망,장례식,시체,송장|사건
불|중|크게 타오르면 번성·재물, 꺼지면 손실. 불길이 셀수록 길해요.|감정 조절이 필요한 시기일 수도.|화재,불나,불타,불길|자연
물|중|맑은 물은 재물·정화, 흐린 물은 근심. 물의 상태가 핵심이에요.|물이 맑았는지 떠올려 보세요.|맑은물,흙탕물,홍수,강물,냇물|자연
비|중|촉촉한 비는 해갈·재물, 폭우는 근심을 뜻해요.|감정이 씻겨 내려가는 시기.|폭우,빗물,소나기,장마|자연
돈|중|받으면 지출·부담, 주우면 뜻밖의 이익으로도 봐요(해석 분분).|금전 관리를 점검하세요.|지폐,동전,현금,돈다발,돈벼락|물건
시험|중|현실의 압박·평가에 대한 불안. 잘 봤으면 자신감, 못 봤으면 준비 신호.|지금 신경 쓰는 일을 점검해 보세요.|수능,면접,시험지,낙방,합격|사건
결혼|중|변화·결합·새 국면. 큰 변화의 신호로 봐요.|중요한 결정이 다가올 수 있어요.|결혼식,웨딩,신부,신랑,웨딩드레스|사건
이사|중|환경·마음의 변화. 좋은 집이면 상황이 나아져요.|변화를 받아들일 준비를.|이삿짐,새집|사건
연예인|중|인정 욕구·주목받고 싶은 마음. 친밀했다면 인기운 상승.|자기표현의 기회를 살려 보세요.|아이돌,배우,가수,유명인|사람
이빨|흉|이 빠지는 꿈은 가까운 사람의 우환·구설·건강 주의로 봐요.|무리한 말·행동을 조심하세요.|치아,이가,이빠,어금니,앞니,이 빠|몸
쫓김|흉|스트레스·회피하고 싶은 문제를 뜻해요.|미루던 일을 마주할 때예요.|쫓기,쫓아,추격,도망|행동
떨어짐|중|불안·통제력 상실감. 크게 다치지 않았다면 곧 안정돼요.|무리한 확장을 조심하세요.|추락,떨어지,낭떠러지,절벽|행동
거미|중|재물·인연의 그물. 거미줄은 관계·기회를 엮는 의미.|인맥을 챙겨 보세요.|거미줄,타란튤라|동물
신발|중|잃어버리면 이별·이동, 새 신발은 새 출발·인연을 뜻해요.|관계·직장 변화 가능성.|구두,운동화,슬리퍼,신발잃|물건
머리카락|흉|빠지면 근심·손실, 길고 풍성하면 건강·재물이에요.|건강 관리에 신경 쓰세요.|머리털,탈모,머리자르,머리 자르,삭발|몸
용|길|최고의 길몽! 승진·성공·명예, 태몽으로는 큰 인물을 뜻해요.|큰 목표에 도전하기 좋은 때예요.|승천,용꿈,청룡,황룡|동물
호랑이|길|권위·명예·강한 후원자를 뜻해요. 태몽이면 리더형 아이.|윗사람의 도움이 들어와요.|범,백호,호랑|동물
사자|길|힘·권력·리더십. 사자를 다스리면 큰 성취예요.|자신감 있게 나서도 좋아요.|수사자,암사자|동물
소|길|성실한 노력이 재물로 돌아와요. 황소는 특히 재물 길몽.|꾸준함이 보상받는 시기.|황소,젖소,송아지,한우|동물
말|길|빠른 발전·승진·소식. 흰 말은 귀인, 달리는 말은 출세.|기회가 빠르게 와요 — 준비해 두세요.|백마,흑마,조랑말,말타|동물
개|중|충성·친구·도움. 짖거나 물면 구설·배신 주의.|가까운 사람과의 관계를 살펴요.|강아지,멍멍이,개한테,큰개|동물
고양이|중|직감·독립·여성성. 다가오면 인연, 할퀴면 질투·뒷말 주의.|촉을 믿되 말조심.|냥이,새끼고양이,검은고양이|동물
쥐|흉|작은 손실·뒷말·걱정거리. 쥐를 잡으면 근심 해결.|지출·잔고장을 점검하세요.|생쥐,들쥐|동물
닭|중|소식·부지런함. 우는 닭은 좋은 소식, 알을 낳으면 재물.|연락이 올 수 있어요.|수탉,암탉,병아리|동물
새|길|소식·자유·희망. 새가 품에 들면 좋은 소식이나 인연.|기다리던 연락이 올 수 있어요.|참새,까치,비둘기,독수리,학,봉황|동물
까마귀|흉|불길한 소식·구설을 조심하라는 신호로 봐요.|말과 문서를 꼼꼼히.|까마귀|동물
물고기|길|재물·풍요·태몽. 큰 물고기를 잡으면 큰 재물이에요.|수입 기회를 노려 보세요.|잉어,붕어,고기잡,낚시,금붕어,생선|동물
거북|길|장수·안정·재물. 거북이 집에 들어오면 복이 들어와요.|천천히 가도 확실한 결과.|거북이,자라|동물
곰|길|태몽(아들)·든든한 후원·인내의 결실.|버티면 결실을 봐요.|반달곰,곰돌이,곰한테|동물
여우|흉|유혹·속임수·이중적인 사람을 조심하라는 꿈.|달콤한 제안은 한 번 더 확인.|여우|동물
늑대|흉|경쟁자·위협·외로움. 물리면 손해 주의.|경계를 늦추지 마세요.|늑대|동물
원숭이|중|재치·장난·잔꾀. 가벼운 구설 주의.|말과 행동을 가볍게 하지 마세요.|원숭이,침팬지|동물
코끼리|길|큰 재물·든든한 지원·태몽.|큰 그림을 그려도 좋아요.|코끼리|동물
토끼|중|순발력·작은 행운·연애 기운.|가벼운 기회를 놓치지 마세요.|토끼|동물
양|길|평화·순한 인연·재물 축적.|사람과의 조화가 복이 돼요.|염소,어린양|동물
사슴|길|명예·승진·고운 인연.|좋은 평판이 기회를 불러요.|노루,꽃사슴|동물
벌|중|벌떼는 재물·성과, 쏘이면 구설·작은 다툼.|협업이 성과를 내요.|꿀벌,말벌,벌떼,벌에 쏘|동물
나비|길|변화·사랑·좋은 소식.|새로운 인연이나 변신의 시기.|나비|동물
벌레|흉|작은 걱정·잡음·건강 신호.|사소한 문제를 미루지 마세요.|구더기,애벌레,바퀴벌레,지네,벌레|동물
상어|흉|위협·경쟁·큰 손실 주의.|위험한 투자·모험은 보류.|상어|동물
고래|길|큰 재물·포용·큰 기회.|크게 생각하면 크게 얻어요.|고래|동물
악어|흉|숨은 위험·배신 주의.|겉과 속이 다른 사람을 조심.|악어|동물
개구리|길|재물·다산·변화의 시작.|작은 시작이 크게 불어나요.|두꺼비,올챙이|동물
조개|길|재물·태몽(딸)·숨은 보물.|숨은 기회를 찾아보세요.|진주,굴,전복|동물
게|중|재물이지만 집게에 물리면 다툼.|금전 거래는 깔끔하게.|꽃게,가재,새우|동물
엄마|길|보호·안정·위로. 엄마가 웃으면 집안이 평안해요.|가족에게 연락해 보세요.|어머니,엄마가,친정엄마|사람
아빠|중|권위·책임·도움. 화를 내면 스스로를 다그치는 마음.|책임감에 너무 짓눌리지 마세요.|아버지,아빠가|사람
조상|길|조상이 나타나 무언가를 주면 큰 복, 당부하면 조심하라는 뜻.|중요한 결정 전 한 번 더 살피세요.|할머니,할아버지,돌아가신,고인|사람
전남친|중|정리되지 않은 감정·과거에 대한 미련, 또는 새 연애의 신호.|과거를 정리하면 새 인연이 와요.|전남자친구,전여친,전 애인,전연인,헤어진|사람
연인|중|관계에 대한 기대와 불안이 섞여 있어요. 다정했다면 관계 순항.|솔직한 대화가 필요해요.|남자친구,여자친구,애인,남친,여친|사람
짝사랑|중|그 사람이 꿈에 나오면 마음이 깊어졌다는 신호, 혹은 상대도 생각 중일 수 있어요.|용기 내도 좋은 타이밍.|좋아하는 사람,썸남,썸녀,그사람|사람
모르는 사람|중|새로운 기회·나의 숨은 모습. 친절했다면 귀인이 와요.|새로운 만남에 열려 있어요.|낯선 사람,낯선사람,모르는사람|사람
친구|중|관계·도움·나를 비추는 거울. 다투면 오히려 화해 신호.|오랜 친구에게 연락해 보세요.|친구,동창,베프|사람
선생님|중|조언·평가·배움에 대한 마음.|배움에 투자하면 좋아요.|교수,선생,담임|사람
대통령|길|큰 명예·승진·귀인의 도움. 악수했다면 특히 길해요.|윗사람에게 인정받을 기회.|왕,임금,대통령,장관|사람
귀신|흉|불안·스트레스·마음속 두려움. 물리치면 문제 해결.|휴식과 정리가 필요해요.|유령,혼령,처녀귀신,악귀|초자연
스님|길|마음 정리·지혜·귀인.|조용히 정리하면 길이 보여요.|스님,신부님,목사님,무당|사람
임신|길|새로운 계획·재물·실제 임신 소식.|무언가를 품고 키우기 좋은 시기.|임신,배부른,태몽,출산|사건
싸움|중|억눌린 감정·경쟁. 이기면 성취, 지면 소모 주의.|감정을 쌓아두지 마세요.|싸우,싸움,다투,때리,맞는,폭행|행동
울음|길|우는 꿈은 오히려 근심이 풀리고 좋은 일이 생기는 길몽이에요.|속 시원히 풀리는 일이 생겨요.|울다,울었,눈물,엉엉|행동
웃음|중|과하게 웃으면 오히려 구설 주의, 잔잔한 미소는 평안.|말을 아끼면 좋아요.|웃다,웃었,웃음|행동
날기|길|자유·성취·한계 돌파. 높이 날수록 큰 성공.|도전하기 좋은 시기예요.|날다,날았,하늘을 날,비행|행동
수영|중|감정의 흐름을 잘 타고 있다는 뜻. 잘 헤엄치면 순조로움.|흐름에 몸을 맡겨 보세요.|헤엄,수영|행동
도망|흉|회피하고 싶은 일이 있어요.|문제를 정면으로 보면 의외로 쉬워요.|도망치,숨다,숨었,숨바꼭질|행동
길 잃음|중|방향에 대한 고민·선택의 기로.|우선순위를 정리해 보세요.|길을 잃,길잃,헤매|행동
지각|중|놓칠까 봐 불안한 마음. 준비 부족의 신호.|일정을 한 번 점검하세요.|늦다,늦었,지각,버스를 놓|행동
화장실|길|근심 해소·재물. 깨끗하면 길, 더러우면 스트레스.|묵은 문제를 털어내요.|변기,화장실|장소
집|중|나 자신·마음 상태. 새 집은 변화, 무너진 집은 불안.|마음 컨디션을 돌보세요.|우리집,새집,집이,큰집|장소
학교|중|과거·배움·평가에 대한 마음.|배움을 다시 시작해도 좋아요.|교실,학교,캠퍼스|장소
병원|중|회복·점검 신호. 치료받으면 문제 해결.|건강검진을 챙겨 보세요.|입원,병원,주사,수술|장소
바다|길|넓은 기회·재물·감정의 깊이. 잔잔하면 순조로움.|큰 무대로 나가도 좋아요.|바닷가,해변,파도|자연
산|길|목표·성취. 정상에 오르면 큰 성공이에요.|한 걸음씩 오르면 돼요.|산에,등산,정상|자연
하늘|길|희망·자유·명예. 맑은 하늘은 좋은 소식.|뜻을 크게 가져요.|맑은하늘,파란하늘|자연
해|길|성공·명예·태몽. 해가 품에 들어오면 대길.|자신감을 가지세요.|태양,해돋이,일출|자연
달|길|소원·여성적 기운·인연. 보름달은 소원 성취.|소원을 빌어 보세요.|보름달,초승달,달빛|자연
별|길|희망·재능·영감. 별이 떨어지면 소원·태몽.|아이디어를 기록해 두세요.|별똥별,유성|자연
무지개|길|행운·소원 성취·좋은 소식.|기분 좋은 일이 다가와요.|무지개|자연
눈|길|흰 눈은 정화·재물·새 출발.|깨끗한 마음으로 다시 시작.|눈이,함박눈,눈사람,눈 내|자연
천둥|중|갑작스러운 소식·각성. 놀랐다면 변화의 신호.|변화에 유연하게.|번개,벼락,천둥|자연
지진|흉|기반이 흔들리는 불안·큰 변화.|무리한 결정을 미루세요.|지진,땅이 흔들|자연
태풍|흉|감정의 소용돌이·혼란.|지나가면 맑아져요 — 버티세요.|태풍,폭풍,회오리|자연
나무|길|성장·건강·가족의 번창. 열매 맺으면 결실.|꾸준히 키워 온 것이 자라요.|큰나무,나무,숲|자연
꽃|길|사랑·기쁨·좋은 소식. 활짝 피면 연애운 상승.|마음을 표현해 보세요.|장미,벚꽃,꽃다발,꽃밭,해바라기|자연
과일|길|결실·재물·태몽. 탐스러울수록 길해요.|그동안의 노력이 열매를 맺어요.|사과,복숭아,감,포도,딸기,수박,귤,배|음식
밥|길|풍요·안정·재물. 함께 먹으면 인연이 깊어져요.|가까운 사람과 식사해 보세요.|밥을,식사,밥상,잔치|음식
고기|길|재물·에너지. 구워 먹으면 횡재수.|기운을 챙기면 일도 풀려요.|고기,삼겹살,소고기,갈비|음식
술|중|즐거움이지만 과하면 구설.|모임에서 말조심.|술,소주,맥주,와인,취하|음식
떡|길|복·재물·잔치. 떡을 받으면 좋은 소식.|나누면 더 커지는 복이에요.|떡,떡볶이|음식
반지|길|약속·인연·결혼. 받으면 연애·결혼운.|관계가 한 단계 깊어질 수 있어요.|반지,커플링,금반지,다이아|물건
금|길|재물·명예. 금을 얻으면 큰 재물이에요.|가치 있는 기회를 잡으세요.|황금,금덩이,금괴|물건
보석|길|재능·가치·귀한 인연.|나의 가치를 알아봐 주는 사람이 와요.|보석,루비,에메랄드|물건
옷|중|이미지·사회적 역할. 새 옷은 새 출발, 찢어진 옷은 체면 주의.|나를 보여 주는 방식을 점검.|옷,새옷,옷을 입|물건
가방|중|가진 것·책임. 잃어버리면 걱정, 새 가방은 새 기회.|소지품·일정 관리를 꼼꼼히.|가방,지갑|물건
휴대폰|중|소통·연결. 잃어버리면 연락 단절 걱정, 고장나면 소통 문제.|미뤄 둔 연락을 해 보세요.|핸드폰,폰,전화,스마트폰,문자|물건
차|중|인생의 방향·속도. 잘 달리면 순조, 고장·사고는 브레이크 신호.|속도를 조절하세요.|자동차,운전,차가|물건
사고|흉|예상치 못한 변수 주의. 실제로는 조심하라는 경고.|이동·운전 시 주의하세요.|교통사고,사고,부딪|사건
비행기|길|도약·먼 곳의 기회·해외운.|큰 기회가 날아올 수 있어요.|비행기,공항,여행|물건
기차|중|정해진 흐름·계획. 놓치면 기회 상실 걱정.|일정을 미리 챙기세요.|기차,지하철,버스|물건
열쇠|길|해결·기회·비밀. 열쇠를 받으면 문제가 풀려요.|막힌 일의 실마리가 보여요.|열쇠,키,자물쇠|물건
거울|중|자기 성찰. 깨진 거울은 관계 균열 주의.|나를 돌아보기 좋은 때.|거울|물건
칼|중|결단·단절. 칼을 받으면 권한, 다치면 다툼 주의.|단호해야 할 일이 있어요.|칼,가위,흉기|물건
총|흉|공격·갈등·압박감.|감정적인 대응을 피하세요.|총,총알|물건
책|길|지식·합격·좋은 정보.|공부·자격 준비에 좋아요.|책,도서관,공책|물건
편지|길|소식·고백·연락.|반가운 연락이 와요.|편지,카드,택배,선물|물건
선물|길|뜻밖의 기쁨·인정·인연.|주는 만큼 돌아와요.|선물받,선물|물건
문|중|기회·전환. 열리면 기회, 잠기면 막힘.|새 문을 두드려 보세요.|문이,대문,현관|장소
계단|중|단계적 성장. 오르면 상승, 내려가면 쉬어 갈 때.|한 단계씩 차근차근.|계단,엘리베이터,에스컬레이터|장소
다리|중|전환·연결. 건너면 새로운 단계.|망설이던 결정을 내려도 좋아요.|다리를 건,교량|장소
화산|중|억눌린 감정의 폭발 또는 큰 재물.|감정을 건강하게 풀어 주세요.|화산,용암|자연
알|길|가능성·재물·태몽.|작은 씨앗을 소중히.|달걀,계란,알|음식
손|중|능력·도움. 손을 잡으면 협력, 다치면 일 문제.|도움을 청해도 괜찮아요.|손을,손이,악수|몸
발|중|이동·기반. 다치면 계획 지연.|발밑을 단단히.|발을,발이,맨발|몸
눈물|길|해소·정화의 길몽.|마음이 가벼워져요.|눈물|몸
임금님|길|최고의 명예·출세운.|큰 자리에 도전해 보세요.|왕비,공주,왕자|사람
도둑|흉|손실·빼앗길까 하는 불안. 도둑을 잡으면 손해 회복.|소지품·개인정보를 챙기세요.|도둑,강도,소매치기|사람
경찰|중|규칙·통제·도움. 잡히면 양심의 가책.|약속과 규칙을 지키면 편해요.|경찰,경찰관|사람
군대|중|규율·압박·의무감.|해야 할 일에 집중해요.|군대,입대,군인|장소
쌍둥이|길|겹경사·두 배의 기회.|두 가지 일이 함께 풀려요.|쌍둥이|사람
청소|길|정리·해결. 깨끗해지면 근심이 풀려요.|주변 정리부터 해 보세요.|청소,빨래,설거지|행동
목욕|길|정화·새 출발·건강.|몸과 마음을 리셋하기 좋아요.|목욕,샤워,온천,씻|행동
노래|중|감정 표현·즐거움. 잘 부르면 인기운.|하고 싶은 말을 전해 보세요.|노래,노래방,공연|행동
춤|길|기쁨·해방감·인기.|즐겁게 움직이면 운도 따라와요.|춤,춤추|행동
키스|중|애정 욕구·관계 진전.|마음을 솔직하게 표현해 봐요.|키스,뽀뽀|행동
섹스|중|친밀함·에너지·결합에 대한 욕구.|관계에 솔직해져도 좋아요.|성관계,잠자리|행동
고백|길|감정 표현·관계의 진전.|용기 내도 좋은 시기.|고백,프러포즈,청혼|행동
이별|중|변화·정리. 실제 이별보다 마음의 정리를 뜻해요.|놓아야 할 것을 정리해요.|이별,헤어지,차였,차이|사건
바람|중|불안·신뢰 문제. 연인이 바람피우면 오히려 애정이 깊다는 뜻도.|불안을 대화로 풀어 보세요.|바람피,외도,불륜|사건
화장|중|이미지 관리·변신 욕구.|새로운 모습을 시도해 봐요.|화장,메이크업|행동
머리|중|생각·자존심. 다치면 고민 과다.|생각을 비우는 시간을.|머리를,두통|몸
다침|흉|조심하라는 경고. 회복하면 문제 해결.|무리한 일정을 줄이세요.|다치,상처,부상,골절|사건
병|중|휴식 필요 신호. 회복되면 근심 해소.|컨디션을 챙기세요.|아프,병에,감기,열이|사건
감옥|흉|답답함·속박감.|스스로를 너무 옭아매지 마세요.|감옥,교도소,갇히|장소
숫자|길|복권·행운의 숫자일 수 있어요.|기억나는 숫자를 적어 두세요.|숫자,번호|물건
복권|길|뜻밖의 행운·도전 욕구.|작은 도전은 즐겁게.|복권,로또,당첨|물건
월급|중|노력의 대가·평가에 대한 마음.|일한 만큼 요구해도 좋아요.|월급,보너스,연봉|물건
회사|중|일·책임·평가에 대한 신경.|업무 우선순위를 정리해요.|회사,직장,상사,출근,퇴사,해고|장소`;
const LUCK = { 길: "길몽", 흉: "흉몽", 중: "중립" };
const DREAM = {};
RAW.split("\n").forEach((line) => {
  const [k, l, m, tip, al, cat] = line.split("|");
  DREAM[k] = { luck: LUCK[l] || "중립", m, tip, aliases: (al || "").split(",").map((x) => x.replace(/\s+/g, "")).filter(Boolean), cat: cat || "기타" };
});
const KEYS = Object.keys(DREAM);
const POPULAR = ["돼지", "똥", "뱀", "이빨", "죽음", "물", "불", "용", "돈", "아기", "전남친", "귀신", "쫓김", "떨어짐", "결혼", "시험"];
const CATS = ["동물", "사람", "몸", "자연", "음식", "물건", "장소", "행동", "사건", "초자연"];
const LUCK_COLOR = { 길몽: "#9fd3b7", 흉몽: "#e2919a", 중립: "#e0b878" };

/* 꿈속 행동 — 문장에 들어 있으면 풀이에 덧붙임 */
const ACTS = [
  [/잡았|잡아|잡는|붙잡/, "잡았다면 그 기운을 내 것으로 만든다는 뜻이라, 좋은 상징일수록 더 길해요."],
  [/먹었|먹는|먹어|마셨|마시/, "먹었다면 그 기운을 몸에 받아들인다는 뜻 — 길한 상징이면 복이 커져요."],
  [/죽였|죽이|물리쳤|이겼|이기/, "물리쳤다면 걱정거리를 이겨 내고 주도권을 잡는다는 뜻이에요."],
  [/물렸|물리는|물어|쏘였|쏘이/, "물리거나 쏘였다면 그 기운이 강하게 들어온다는 뜻 — 길몽이면 더 길하고, 흉몽이면 주의 신호예요."],
  [/잃어|잃었|놓쳤|놓치/, "잃어버렸다면 그것과 관련된 걱정이나 변화가 다가온다는 뜻이에요. 미리 챙기면 괜찮아요."],
  [/주웠|줍|받았|받는|얻었|얻는|생겼/, "받거나 얻었다면 그 복이 나에게 들어온다는 뜻이에요."],
  [/줬|주었|주는|나눠/, "남에게 주었다면 내 것을 나누거나 내보내는 흐름 — 베푼 만큼 돌아와요."],
  [/빠졌|빠지|부러|깨졌|깨지|무너/, "빠지거나 깨졌다면 무언가가 끝나고 바뀌는 신호예요. 정리하면 새로 채워져요."],
  [/탔|타고|올라|올랐/, "타거나 올랐다면 그 흐름을 타고 위로 나아간다는 뜻이에요."],
  [/들어왔|들어오|안겼|품에/, "집이나 품으로 들어왔다면 복이 굴러 들어오는 대표적인 길한 장면이에요."],
  [/도망|쫓겼|쫓기|숨었/, "피하거나 도망쳤다면 마주하기 싫은 일이 있다는 뜻 — 정면으로 보면 의외로 쉬워요."],
  [/많|떼|여러|가득/, "여러 개·떼로 나왔다면 그 의미가 몇 배로 커진다는 뜻이에요."],
];
const MOODS = [
  { id: "good", label: "😊 좋았어", line: "꿈속 기분이 좋았다면 길한 쪽으로 읽어요. 실제로도 기분 좋은 일이 이어지기 쉬워요." },
  { id: "flutter", label: "💗 설렜어", line: "설렜다면 마음속에 새로운 기대가 피어나는 중이에요. 연애·인연운이 살아나요." },
  { id: "scary", label: "😨 무서웠어", line: "무서웠다면 요즘 쌓인 긴장·불안이 꿈으로 나온 거예요. 흉몽이라기보다 '쉬어 가라'는 신호예요." },
  { id: "sad", label: "😢 슬펐어", line: "슬펐다면 마음의 짐이 풀려 나가는 과정이에요. 꿈에서 울면 오히려 근심이 풀린다고 봐요." },
  { id: "weird", label: "🌀 이상했어", line: "이상하고 뒤죽박죽이었다면 머릿속 정리가 필요하다는 뜻이에요. 생각을 적어 보면 길이 보여요." },
];
/* 사전에 없는 꿈 — '꿈의 결'로 보는 일반 풀이 */
const GENERAL = [
  ["변화의 꿈", "평소와 다른 장면은 생활에 작은 변화가 다가온다는 신호로 봐요. 새로운 제안이나 만남에 열려 있어 보세요."],
  ["마음 정리의 꿈", "요즘 마음에 걸린 일이 상징으로 나타난 꿈이에요. 미뤄 둔 일을 하나만 정리해도 운이 가벼워져요."],
  ["소식의 꿈", "선명하게 기억나는 꿈은 반가운 연락·소식의 전조로 봐요. 며칠 안에 기다리던 소식이 올 수 있어요."],
  ["기회의 꿈", "낯선 대상이 나오는 꿈은 아직 모르는 기회를 뜻해요. 평소 안 하던 선택을 해 보면 길이 열려요."],
  ["관계의 꿈", "꿈속 대상이 사람과의 관계를 비추는 경우가 많아요. 가까운 사람에게 먼저 안부를 전해 보세요."],
];

/* 꿈 장면(스토리) 풀이 — 단어 하나가 아니라 '무슨 일이 벌어졌는지'를 먼저 읽는다 */
const SELF_VICTIM = /(나를|날\s|내가\s?(죽|찔|맞|당)|찔렸|당했|죽임을|살해당|칼에\s?맞|총에\s?맞)/;
const SCENES = [
  { id: "kill", rx: /(죽였|죽이|찔러|찔렀|찌르|살해|베었|베어|쐈|쏴|목을\s?졸)/, not: SELF_VICTIM, luck: "길몽", title: "누군가를 해치는 장면",
    m: "꿈에서 누군가를 찌르거나 죽이는 건 실제 폭력이 아니라, 나를 괴롭히던 문제·감정·관계를 내 손으로 끊어 내는 장면이에요. 전통 해몽에서는 큰 걱정이 풀리고 재물·성취가 들어오는 길몽으로 봐요.",
    extra: (q) => /칼|찔/.test(q) ? "칼로 찔렀다면 ‘결단’의 기운이 특히 강해요 — 미루던 일을 단칼에 정리하게 될 수 있어요." : "" },
  { id: "selfdie", rx: SELF_VICTIM, luck: "길몽", title: "내가 당하거나 죽는 장면",
    m: "내가 다치거나 죽는 꿈은 무섭지만, 해몽에서는 낡은 내가 끝나고 새로 태어나는 ‘재생’의 길몽이에요. 요즘 스트레스가 컸다는 신호이기도 해요.", extra: () => "" },
  { id: "revive", rx: /(살아나|살아났|살아서|되살|부활|다시\s?살|안\s?죽|죽지\s?않|좀비)/, luck: "중립", title: "죽어도 다시 살아나는 장면",
    m: "끝냈다고 생각한 일이 다시 고개를 드는 흐름이에요. 마음속에 정리되지 않은 감정·문제가 남아 있거나, 지나간 줄 알았던 기회가 한 번 더 찾아온다는 뜻이에요.", extra: () => "" },
  { id: "loop", rx: /(회귀|반복|계속|또다시|되풀이|루프|다시\s?처음|처음으로\s?돌아|무한|몇\s?번이나|여러\s?번)/, luck: "중립", title: "같은 일이 되풀이되는 장면",
    m: "같은 장면이 반복되는 꿈은 현실에서 비슷한 상황·패턴이 되풀이되고 있다는 신호예요. ‘이번엔 다른 선택을 해 봐’라는 메시지이고, 회귀물처럼 다시 해 볼 기회가 주어진다는 재도전운으로도 읽어요.", extra: () => "" },
  { id: "chase", rx: /(쫓기|쫓겼|쫓아오|따라오|도망|숨었|숨어)/, luck: "흉몽", title: "쫓기거나 도망치는 장면",
    m: "피하고 싶은 일·사람이 있다는 뜻이에요. 꿈에서 끝까지 잡히지 않았다면 결국 잘 넘긴다는 뜻이고, 잡혔다면 정면으로 마주할 때가 왔다는 신호예요.", extra: () => "" },
  { id: "drown", rx: /(물에\s?빠|빠져\s?죽|가라앉|허우적)/, luck: "중립", title: "물에 빠지는 장면",
    m: "감정에 휩쓸리는 느낌을 뜻해요. 빠져나왔다면 위기를 넘기고, 맑은 물이었다면 오히려 재물이 들어오는 꿈으로 봐요.", extra: () => "" },
  { id: "housefire", rx: /(집에\s?불|집이\s?타|불이\s?나|활활)/, luck: "길몽", title: "불이 크게 나는 장면",
    m: "집이나 건물이 활활 타는 꿈은 대표적인 대길몽이에요. 번창·재물·사업 성공의 기운이 크게 일어나요.", extra: () => "" },
  { id: "fly", rx: /(하늘을\s?날|날아다|날았|날아올)/, luck: "길몽", title: "하늘을 나는 장면",
    m: "자유와 상승의 꿈이에요. 막혀 있던 일이 풀리고 한 단계 올라서는 시기예요.", extra: () => "" },
  { id: "teeth", rx: /(이가\s?빠|이빨이\s?빠|이\s?빠지|이가\s?부러)/, luck: "흉몽", title: "이가 빠지는 장면",
    m: "가까운 사람의 건강·구설을 조심하라는 전통적인 경고 꿈이에요. 피가 났다면 오히려 액땜으로 봐요.", extra: () => "" },
  { id: "reunion", rx: /(전남친|전여친|전\s?애인|헤어진).*(만나|다시|재회|사귀|연락)|(재회)/, luck: "중립", title: "옛 연인을 다시 만나는 장면",
    m: "실제 재회보다는 그 시절의 나·감정을 정리하고 있다는 뜻이 커요. 꿈에서 편안했다면 새 인연이 다가오는 신호예요.", extra: () => "" },
];
function findScenes(q) {
  const out = [];
  for (const sc of SCENES) {
    const m = sc.rx.exec(q);
    if (!m) continue;
    if (sc.not && sc.not.test(q) && sc.id === "kill") continue;
    out.push({ ...sc, pos: m.index });
  }
  // 'selfdie'와 'kill'이 둘 다 잡히면 문장 앞쪽 것을 우선
  return out.sort((a, b) => a.pos - b.pos);
}
function sceneSummary(q, scenes) {
  const ids = new Set(scenes.map((s) => s.id));
  const harmed = ids.has("kill") || ids.has("selfdie");
  if (harmed && (ids.has("revive") || ids.has("loop"))) {
    return { luck: "반전 길몽", line: "정리하면 — 큰 문제를 끝내려고 하는데, 그게 자꾸 되살아나 다시 시작되는 꿈이에요. 끝냈다고 생각한 고민·관계·습관이 아직 완전히 끝나지 않았다는 뜻이고, 같은 방식으로 계속 맞서기보다 이번엔 근본 원인을 다르게 다뤄 보라는 메시지예요. 그래도 꿈속에서 끝까지 맞섰다는 건 결국 이겨 낼 힘이 있다는 뜻이라, 흉몽이 아니라 ‘몇 번의 시도 끝에 풀리는’ 반전 길몽으로 봐요.",
      tip: "요즘 해결했다고 생각했는데 자꾸 떠오르는 일이 있는지 떠올려 보세요. 그걸 메모해 두고 방법을 바꿔 보면 정말로 끝낼 수 있어요." };
  }
  if (ids.has("loop") && ids.has("revive")) return { luck: "중립", line: "정리하면 — 같은 일이 되풀이되며 끝나지 않는 꿈이에요. 현실의 반복되는 패턴을 알아차리라는 신호예요.", tip: "반복되는 상황에서 내가 늘 하는 선택을 하나만 바꿔 보세요." };
  const good = scenes.filter((s) => s.luck === "길몽").length, bad = scenes.filter((s) => s.luck === "흉몽").length;
  if (good > bad) return { luck: "길몽", line: "정리하면 — 무섭거나 이상해 보여도 전체 흐름은 걱정이 풀리고 좋은 기운이 들어오는 꿈이에요.", tip: "미뤄 둔 결정을 내리기 좋은 때예요." };
  if (bad > good) return { luck: "흉몽", line: "정리하면 — 조심하라는 경고가 담긴 꿈이에요. 다만 미리 알고 대비하면 큰일 없이 지나가요.", tip: "말과 행동을 한 번 더 살피고, 무리한 일정은 줄이세요." };
  return { luck: "중립", line: "정리하면 — 마음속 고민과 변화가 그대로 비친 꿈이에요. 꿈속 장면을 지금 상황에 하나씩 대입해 보면 메시지가 보여요.", tip: "꿈을 꾼 날의 기분과 요즘 고민을 함께 적어 보세요." };
}

const PARTICLE = /^(이|가|을|를|에|에서|은|는|도|의|로|으로|랑|이랑|과|와|꿈|속|들|한테|이요|요)?$/;
function oneCharHit(q, t) {
  return q.split(/\s+/).some((tok) => tok.startsWith(t) && PARTICLE.test(tok.slice(t.length)));
}
function findHits(q) {
  const n = q.replace(/\s+/g, "");
  if (!n) return [];
  const found = [];
  for (const k of KEYS) {
    const terms = [k, ...DREAM[k].aliases].filter((t) => t.length >= 1);
    const hit = terms.filter((t) => (t.length === 1 ? oneCharHit(q, t) : n.includes(t)) || (t.length >= 2 && t.includes(n) && n.length >= 2)).sort((a, b) => b.length - a.length)[0];
    if (hit) found.push({ k, term: hit });
  }
  found.sort((a, b) => b.term.length - a.term.length);
  const out = [];
  for (const f of found) {
    if (out.some((o) => o.term.includes(f.term) && o.term !== f.term)) continue; // '비행기' 안의 '비' 같은 겹침 제외
    if (!out.some((o) => o.k === f.k)) out.push(f);
  }
  return out.slice(0, 4).map((o) => o.k);
}
function similar(q) {
  const chars = new Set(q.replace(/\s+/g, "").split(""));
  return KEYS.map((k) => ({ k, s: [k, ...DREAM[k].aliases].join("").split("").filter((c) => chars.has(c)).length }))
    .filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 6).map((x) => x.k);
}

export function renderDream({ navigate }) {
  loadDisclaimer();
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(pageHeader("꿈해몽", "무슨 꿈 꿨어?", "꿈에 나온 걸 단어나 문장으로 적어 봐. 예: '돼지가 집에 들어왔어', '이가 빠졌어'. 해묘가 풀어줄게. (재미·참고용)"));

  const result = el("section", { class: "wrap", style: "margin-top: var(--sp-2);" });
  const input = el("input", { class: "input", type: "text", maxlength: "40", placeholder: "예: 돼지가 집에 들어왔어 / 이빨 빠지는 꿈", "aria-label": "꿈 내용" });
  let mood = "";
  const moodRow = el("div", { class: "chip-grid" }, MOODS.map((mo) => {
    const b = el("button", { class: "chip rel-chip", type: "button", text: mo.label });
    b.addEventListener("click", () => { mood = mood === mo.id ? "" : mo.id; moodRow.querySelectorAll("button").forEach((x, i) => x.classList.toggle("is-selected", MOODS[i].id === mood)); if (input.value.trim()) search(); });
    return b;
  }));
  const search = () => {
    const q = input.value.trim();
    if (!q) { clear(result); result.append(noticeBox("info", "꿈에 나온 걸 한 단어라도 적어 주세요. 아래 단어를 눌러도 돼요.")); return; }
    show(q, findHits(q));
  };
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") search(); });
  const chip = (k) => el("button", { class: "chip", type: "button", onclick: () => { input.value = k; search(); } }, [el("span", { text: k })]);

  let cat = "";
  const allBox = el("div", {});
  const paintAll = () => {
    clear(allBox);
    allBox.append(el("div", { class: "rel-filter", style: "flex-wrap:wrap;" }, CATS.map((c) => {
      const n = KEYS.filter((k) => DREAM[k].cat === c).length;
      return el("button", { type: "button", class: "chip rel-chip" + (c === cat ? " is-selected" : ""), onclick: () => { cat = cat === c ? "" : c; paintAll(); }, text: `${c} ${n}` });
    })));
    if (cat) allBox.append(el("div", { class: "chip-grid", style: "margin-top:8px;" }, KEYS.filter((k) => DREAM[k].cat === cat).map(chip)));
  };
  paintAll();

  root.append(el("section", { class: "wrap section-gap" }, [
    el("div", { style: "display:flex; gap:8px;" }, [input, el("button", { class: "btn btn-primary btn-sm", onclick: search }, [el("span", { text: "해몽" })])]),
    el("p", { class: "muted tiny", text: "꿈속 기분은 어땠어? (선택)" }),
    moodRow,
  ]));
  root.append(result);
  root.append(el("section", { class: "wrap section-gap", style: "margin-top: var(--sp-5);" }, [
    el("p", { class: "muted tiny", text: "자주 찾는 꿈" }),
    el("div", { class: "chip-grid" }, POPULAR.map(chip)),
    el("p", { class: "muted tiny", text: `종류별로 찾기 · 상징 ${KEYS.length}개` }),
    allBox,
  ]));

  function show(q, hits) {
    clear(result);
    const acts = findScenes(q).length ? [] : ACTS.filter(([rx]) => rx.test(q)).map(([, t]) => t);
    const moodLine = (MOODS.find((m) => m.id === mood) || {}).line;
    const box = el("div", { class: "section-gap" });
    result.append(box);
    const scenes = findScenes(q);
    if (scenes.length) {
      const sum = sceneSummary(q, scenes);
      const sc = sum.luck.includes("길") ? LUCK_COLOR.길몽 : sum.luck === "흉몽" ? LUCK_COLOR.흉몽 : LUCK_COLOR.중립;
      box.append(el("div", { class: "panel panel-gold section-gap" }, [
        el("p", { class: "eyebrow", text: "해묘의 종합 해몽" }),
        el("div", { style: "display:flex; align-items:center; gap:8px; flex-wrap:wrap;" }, [
          el("span", { class: "serif", style: "font-size:1.15rem;", text: `‘${q.length > 24 ? q.slice(0, 24) + "…" : q}’` }),
          el("span", { style: `font-size:.72rem; font-weight:800; color:${sc}; border:1px solid ${sc}66; border-radius:999px; padding:2px 10px;`, text: sum.luck }),
        ]),
        el("div", { class: "overall-flow" }, scenes.map((s, i) => el("div", { class: "overall-step" }, [
          el("span", { class: "overall-dot", text: String(i + 1) }),
          el("p", {}, [el("b", { text: s.title + " — " }), document.createTextNode(s.m + (s.extra(q) ? " " + s.extra(q) : ""))]),
        ]))),
        el("p", { style: "font-weight:600;", text: sum.line }),
        el("div", { class: "insight", text: sum.tip }),
      ]));
      if (hits.length) box.append(el("p", { class: "muted tiny", style: "margin-top:4px;", text: "꿈에 나온 상징도 함께 볼게요" }));
    }
    if (hits.length) {
      hits.forEach((k) => {
        const d = DREAM[k], c = LUCK_COLOR[d.luck];
        box.append(el("div", { class: "panel section-gap" }, [
          el("div", { style: "display:flex; align-items:center; gap:8px; flex-wrap:wrap;" }, [
            el("span", { class: "serif", style: "font-size:1.3rem;", text: k + " 꿈" }),
            el("span", { style: `font-size:.72rem; font-weight:800; color:${c}; border:1px solid ${c}66; border-radius:999px; padding:2px 10px;`, text: d.luck }),
            el("span", { class: "tiny muted", text: d.cat }),
          ]),
          el("p", { text: d.m }),
          el("div", { class: "insight", text: d.tip }),
        ]));
      });
    } else if (!scenes.length) {
      const g = GENERAL[seedFromString(q) % GENERAL.length];
      const sim = similar(q);
      box.append(el("div", { class: "panel section-gap" }, [
        el("div", { style: "display:flex; align-items:center; gap:8px; flex-wrap:wrap;" }, [
          el("span", { class: "serif", style: "font-size:1.3rem;", text: `‘${q}’ 꿈` }),
          el("span", { style: "font-size:.72rem; font-weight:800; color:#e0b878; border:1px solid #e0b87866; border-radius:999px; padding:2px 10px;", text: "해묘 풀이" }),
        ]),
        el("p", { class: "tiny muted", text: `사전에 딱 맞는 상징은 없어서, 꿈의 결로 풀어 봤어요 — ${g[0]}` }),
        el("p", { text: g[1] }),
        moodLine ? null : el("div", { class: "insight", text: "꿈속 기분(좋았어·무서웠어…)을 골라 주면 더 정확하게 풀어 줄게요." }),
        sim.length ? el("p", { class: "tiny muted", text: "혹시 이런 꿈이었어?" }) : null,
        sim.length ? el("div", { class: "chip-grid" }, sim.map(chip)) : null,
      ].filter(Boolean)));
    }
    if (acts.length || moodLine) {
      box.append(el("div", { class: "panel section-gap" }, [
        el("h3", { class: "serif", style: "font-size:1.05rem;", text: "꿈속 장면·기분으로 더 보기" }),
        ...acts.map((t) => el("p", { text: "• " + t })),
        moodLine ? el("p", { text: "• " + moodLine }) : null,
      ].filter(Boolean)));
    }
    result.append(noticeBox("info", "꿈 해석은 문맥·감정에 따라 크게 달라져요. 재미로 참고만 하세요."));
    try { result.scrollIntoView({ behavior: "smooth", block: "start" }); } catch { /* ignore */ }
  }
  return root;
}

/* ===================================================================
   (합침) extras.js — 파일 수를 줄이려고 이 파일 안으로 옮김 (HAE)
   =================================================================== */
import { validateBirthInput } from "../utils/dom.js";

import { stash, unstash } from "../state.js";

import { zodiacFortune, starSign, biorhythm, bioSvg, charmIndex, luckyCard, charmStyle, SIGN_DETAIL, signSvg } from "../saju/extras.js";
import { solarToLunar } from "../saju/astro.js";
import { notePair } from "../wallet.js";
import { pullReading, pullPair, loveCount } from "../saju/pull.js";
import { savePersonOffer, chargeNewPeople, NEW_PERSON_NOTE } from "./people.js";
import { personBlock } from "./compatPlus.js";
/* 공용: 로그인 없으면 안내, 코인 게이트 후 render(profile) 실행 */
function gatedPage({ navigate, id, eyebrow, title, sub, itemSuffix, buildView, backTo = "/", backLabel = "홈" }) {
  loadDisclaimer();
  const my = getMyBirth();
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, backTo, backLabel)]));
  root.append(pageHeader(eyebrow, title, sub));
  if (id !== "pullpair") root.append(personSwitch(navigate));
  if (!my) {
    root.append(el("section", { class: "wrap section-gap" }, [
      noticeBox("info", "생년월일이 필요해요. 한 번 입력하면 저장됩니다."),
      el("button", { class: "btn btn-primary", onclick: () => navigate("/saju") }, [el("span", { text: "내 정보 입력하고 시작" })]),
    ]));
    return root;
  }
  const profile = computeSaju(my);
  const cost = costOf(id);
  const itemId = `${id}:${my.birthDate}${itemSuffix ? ":" + itemSuffix : ""}`;
  const host = el("section", { class: "wrap", style: "margin-top: var(--sp-2);" });
  root.append(host);
  function paint() {
    clear(host);
    if (cost && !isUnlocked(itemId)) { host.append(lock()); return; }
    host.append(buildView(profile));
    host.append(noticeBox("info", "재미·참고용 콘텐츠예요. 미래를 확정하지 않아요."));
  }
  function lock() {
    const coins = getCoins();
    const box = el("div", { class: "panel premium-lock", style: "margin-top: var(--sp-4);" }, [
      el("span", { class: "lock-badge" }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: `코인 ${cost}개` })]),
      el("h3", { class: "serif", style: "margin-top:10px;", text: title + " 열어 보기" }),
      el("p", { class: "muted", style: "font-size:var(--fs-sm);", text: "한 번 열면 다시 볼 땐 무료예요." }),
    ]);
    if (coins >= cost) {
      box.append(el("button", { class: "btn btn-primary btn-block", style: "margin-top: var(--sp-4);", onclick: () => {
        const r = unlock(itemId, cost); if (r.ok) { toast(`${title}을(를) 열었어요`); paint(); } else { noCoinToast(); navigate("/store"); }
      } }, [el("span", { text: `코인 ${cost}개로 열기 · 보유 ${coins}개` })]));
    } else {
      box.append(el("p", { class: "muted tiny", style: "margin-top:8px;", text: `보유 코인 ${coins}개 · ${cost}개 필요해요.` }));
      box.append(el("button", { class: "btn btn-primary btn-block", style: "margin-top: var(--sp-3);", onclick: () => navigate("/store") }, [el("span", { text: "코인 받으러 가기" })]));
    }
    return box;
  }
  paint();
  return root;
}
const block = (label, items, tag) => el("div", { class: `block tag-${tag}` }, [el("span", { class: "block-label" }, [el("span", { text: label })]), ...(Array.isArray(items) ? items : [items]).map((t) => el("p", { text: t }))]);
const ring = (score) => el("div", { class: "score-ring", style: `--deg:${Math.round(Math.max(0, Math.min(100, score)) * 3.6)}deg;` }, [el("div", { class: "score-ring-in" }, [el("span", { class: "score-n", text: String(score) }), el("span", { class: "score-u", text: "점" })])]);

/* ---- 띠 운세 ---- */
export function renderZodiac({ navigate }) {
  const d = new Date();
  return gatedPage({
    navigate, id: "zodiac", eyebrow: "띠 운세", title: "내 띠와 오늘의 띠운", sub: "태어난 해의 띠(60간지)로 보는 성향과 오늘의 흐름이에요.",
    itemSuffix: `${d.getFullYear()}${d.getMonth()}${d.getDate()}`,
    buildView: (profile) => {
      const z = zodiacFortune(profile);
      return el("div", { class: "section-gap", style: "margin-top: var(--sp-4);" }, [
        el("div", { class: "panel", style: "text-align:center;" }, [
          el("p", { class: "serif", style: "font-size:1.8rem;", text: z.name }),
          el("p", { class: "muted tiny", text: z.gapja }),
          el("p", { style: "margin-top:8px; font-weight:600;", text: z.persona }),
        ]),
        block("강점", z.strength, "good"),
        block("조심할 점", z.caution, "warn"),
        el("div", { class: "panel", style: "display:flex; gap:14px; align-items:center;" }, [
          ring(z.score),
          el("div", { style: "flex:1;" }, [
            el("p", { class: "eyebrow", text: `오늘은 ${z.todayZodiac}날 · 내 띠와 ‘${z.todayRel}’` }),
            el("p", { style: "font-weight:600; margin-top:4px;", text: z.todayLine }),
          ]),
        ]),
      ]);
    },
  });
}

/* ---- 별자리 운세 ---- */
export function renderStar({ navigate }) {
  return gatedPage({
    navigate, id: "star", eyebrow: "별자리", title: "나의 별자리", sub: "양력 생일로 보는 서양 별자리 — 별자리 설화부터 성향·연애·조언까지.",
    buildView: (profile) => {
      const s = starSign(profile), D = SIGN_DETAIL[s.name] || {};
      const { Y, M, D: dd } = profile.solar;
      let lunar = ""; try { const l = solarToLunar(Y, M, dd); lunar = `음력 ${l.year}년 ${l.isLeap ? "윤" : ""}${l.month}월 ${l.day}일`; } catch {}
      const EL_KR = { wood: "목(木)", fire: "화(火)", earth: "토(土)", metal: "금(金)", water: "수(水)" };
      const EAST = { 불: "fire", 흙: "earth", 공기: "metal", 물: "water" };
      const dm = profile.dayMasterElem, same = EAST[D.el] === dm;
      const chip = (t) => el("span", { class: "st-chip", text: t });
      return el("div", { class: "section-gap", style: "margin-top: var(--sp-4);" }, [
        el("div", { class: "panel st-hero", style: `--sc:${D.color || "#d9c4f2"};` }, [
          el("div", { class: "st-art", html: signSvg(s.name) }),
          el("div", { class: "st-head" }, [
            el("span", { class: "st-sym", text: D.sym || "✦" }),
            el("div", {}, [el("p", { class: "serif st-name", text: s.name }), el("p", { class: "tiny muted", text: `${D.en || ""} · ${s.range}` })]),
          ]),
          el("div", { class: "st-born" }, [
            el("div", {}, [el("small", { text: "양력 생일" }), el("b", { text: `${Y}년 ${M}월 ${dd}일` })]),
            el("div", {}, [el("small", { text: "음력 생일" }), el("b", { text: lunar.replace("음력 ", "") || "-" })]),
          ]),
          el("div", { class: "st-chips" }, [chip(`원소 · ${D.el}`), chip(`수호성 · ${D.ruler}`), chip(`탄생석 · ${D.stone}`), chip(`행운 · ${D.lucky}`)]),
        ]),
        el("div", { class: "panel" }, [el("p", { class: "eyebrow", text: "별자리 이야기" }), el("p", { class: "st-myth", text: D.myth || "" })]),
        el("div", { class: "panel" }, [el("p", { class: "eyebrow", text: "이런 사람이에요" }), el("p", { style: "font-weight:700; margin:4px 0 6px;", text: s.persona }),
          el("ul", { class: "st-list" }, (D.traits || []).map((t) => el("li", { text: t })))]),
        el("div", { class: "panel" }, [el("p", { class: "eyebrow", text: "💗 연애 스타일" }), el("p", { text: D.love || s.love }),
          el("p", { class: "tiny muted", style: "margin-top:8px;", text: "잘 맞는 별자리" }),
          el("div", { class: "st-chips" }, (D.match || []).map((m) => el("span", { class: "st-chip on", text: `${(SIGN_DETAIL[m] || {}).sym || ""} ${m}` })))]),
        el("div", { class: "panel" }, [el("p", { class: "eyebrow", text: "☯️ 동양 × 서양" }),
          el("p", { text: `사주의 일간 오행은 ${EL_KR[dm]}, 별자리 원소는 ‘${D.el}’이에요. ${same ? "동양과 서양이 같은 기운을 가리켜요 — 이 성향이 특히 뚜렷하게 드러나는 사람이에요." : "두 기운이 서로 달라요 — 상황에 따라 다른 얼굴이 나오는, 입체적인 사람이에요."}` })]),
        el("div", { class: "block tag-action" }, [el("span", { class: "block-label", text: "별이 건네는 조언" }), el("p", { text: D.advice || "" })]),
      ]);
    },
  });
}

/* ---- 바이오리듬 ---- */
export function renderBiorhythm({ navigate }) {
  const d = new Date();
  return gatedPage({
    navigate, id: "biorhythm", eyebrow: "바이오리듬", title: "오늘의 바이오리듬", sub: "생년월일만으로 계산하는 신체·감성·지성 주기예요.",
    itemSuffix: `${d.getFullYear()}${d.getMonth()}${d.getDate()}`,
    buildView: (profile) => {
      const b = biorhythm(profile);
      const stat = (o, color) => el("div", { class: "bio-stat" }, [
        el("span", { class: "bio-dot", style: `background:${color};` }),
        el("span", { class: "bio-stat-lb muted", text: o.desc.split("·")[0] }),
        el("b", { style: `color:${color};`, text: `${o.v > 0 ? "+" : ""}${o.v}%` }),
      ]);
      return el("div", { class: "section-gap", style: "margin-top: var(--sp-4);" }, [
        el("div", { class: "panel" }, [
          el("p", { class: "muted tiny", text: `태어난 지 ${b.days.toLocaleString()}일째 · 오늘 기준 ±15일` }),
          el("div", { class: "bio-chart", html: bioSvg(b, 160) }),
          el("div", { class: "bio-stats" }, [stat(b.physical, "#ffa3b5"), stat(b.emotional, "#dcb6ff"), stat(b.intellectual, "#ffd39a")]),
          el("p", { class: "muted tiny", style: "margin-top:10px;", text: "곡선이 가운데 ‘0 선’을 지나는 날이 전환일이에요 — 그 무렵엔 컨디션이 불안정해요." }),
        ]),
        el("div", { class: "insight", text: b.tip }),
        noticeBox("info", "바이오리듬은 사주·타로·자미두수와 무관한, 20세기 초 서양에서 나온 이론이에요. 생년월일만으로 신체(23일)·감성(28일)·지성(33일) 주기를 그린 재미용 참고 자료입니다."),
      ]);
    },
  });
}

/* ---- 매력 지수 (오늘/이달) ---- */
export function renderCharm({ navigate }) {
  const d = new Date();
  return gatedPage({
    navigate, id: "charmtoday", eyebrow: "매력 지수", title: "오늘의 매력 온도", sub: "사주의 도화·표현 기운으로 보는 오늘·이달의 매력이에요.",
    itemSuffix: `${d.getFullYear()}${d.getMonth()}${d.getDate()}`,
    buildView: (profile) => {
      const t = charmIndex(profile, "today"), m = charmIndex(profile, "month");
      const card = (c) => el("div", { class: "panel", style: "display:flex; gap:16px; align-items:center;" }, [
        ring(c.score),
        el("div", { style: "flex:1;" }, [
          el("p", { class: "eyebrow", text: `${c.label} 매력 · 등급 ${c.grade}` }),
          el("p", { style: "font-weight:600; margin-top:4px;", text: c.line }),
        ]),
      ]);
      const st = charmStyle(profile);
      return el("div", { class: "section-gap", style: "margin-top: var(--sp-4);" }, [
        card(t), card(m), el("div", { class: "insight", text: t.tip }),
        el("p", { class: "muted", style: "font-size:var(--fs-sm);", text: st.extra }),
        block("이런 말투가 매력 포인트", st.talk, "good"),
        block("추천 스타일 · 색 · 헤어 · 향", st.look, "action"),
      ]);
    },
  });
}

/* ---- 행운 카드 (오늘의 럭키 타로) ---- */
export function renderLuckyCard({ navigate }) {
  const d = new Date();
  return gatedPage({
    navigate, id: "luckycard", eyebrow: "행운 카드", title: "오늘의 행운 카드", sub: "해묘가 오늘 너를 지켜줄 카드 한 장을 골라뒀어.",
    itemSuffix: `${d.getFullYear()}${d.getMonth()}${d.getDate()}`,
    buildView: (profile) => {
      const c = luckyCard(profile);
      return el("div", { class: "section-gap", style: "margin-top: var(--sp-4);" }, [
        el("div", { class: "panel", style: "text-align:center;" }, [
          el("div", { class: "lucky-card-img", style: c.bgStyle }),
          el("p", { class: "serif", style: "font-size:1.4rem; margin-top:12px;", text: c.name }),
          el("p", { style: "font-weight:600; margin-top:6px;", text: `“${c.message}”` }),
          el("p", { class: "muted tiny", style: "margin-top:8px;", text: `오늘의 행운색 · ${c.luckyColor}` }),
        ]),
      ]);
    },
  });
}

/* 단계 패널 — 1·2·3 단계 */
function stepsPanel(title, steps) {
  return el("div", { class: "panel panel-gold section-gap" }, [
    el("p", { class: "eyebrow", text: "단계별 공략" }),
    el("h3", { class: "serif", style: "font-size:1.2rem;", text: title }),
    el("div", { class: "overall-flow" }, steps.map((t, i) => {
      const [head, ...rest] = t.split(" — ");
      return el("div", { class: "overall-step" }, [
        el("span", { class: "overall-dot", text: String(i + 1) }),
        el("p", {}, [el("b", { text: head }), document.createTextNode(rest.length ? " — " + rest.join(" — ") : "")]),
      ]);
    })),
  ]);
}

/* 받침에 따라 이/가 */
const iga = (w) => { const c = (w || "").charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? w + "이" : w + "가"; };

/* ---- 내 매력 사주 (끌림 타입 + 그 사람과 끌림 궁합) ---- */
export function renderPull({ navigate }) {
  const root = gatedPage({
    navigate, id: "pull", eyebrow: "내 매력 사주", title: "사주로 보는 내 매력", sub: "타고난 매력 포인트, 이성이 빠져드는 이유, 나다운 연애 스타일까지 해묘가 풀어 줄게.",
    buildView: (profile) => {
      const r = pullReading(profile);
      return el("div", { class: "section-gap", style: "margin-top: var(--sp-4);" }, [
        el("div", { class: "panel", style: "display:flex; gap:16px; align-items:center;" }, [
          ring(r.score),
          el("div", { style: "flex:1;" }, [
            el("p", { class: "eyebrow", text: `일간 ${r.stemKr} · 빠져드는 지수` }),
            el("p", { class: "serif", style: "font-size:1.35rem; margin-top:4px;", text: r.type.name }),
            el("p", { class: "muted tiny", style: "margin-top:4px;", text: `등급: ${r.grade}${r.badges.length ? " · " + r.badges.join("·") : ""}` }),
          ]),
        ]),
        el("div", { class: "insight", text: r.type.hook }),
        block("상대가 빠져드는 포인트", r.type.points, "good"),
        block("사주 속 끌림의 비밀", r.secret, "action"),
        block(`연애 반전 스타일 · ${r.style.title}`, r.style.line, "good"),
        block("특히 깊게 빠지는 사람", r.type.weak, "action"),
        (() => { const g = getMyBirth().gender === "male" ? "male" : "female"; const c = loveCount(profile, g); return block(`사주로 보는 내 연애 횟수 · ${c.label}`, [c.line, ...c.why], "good"); })(),
        block("자꾸 생각나게 만드는 법", r.moves, "good"),
        block("매력이 식는 순간", r.type.fade, "warn"),
        noticeBox("info", r.healthy),
      ]);
    },
  });
  if (getMyBirth()) root.append(pairForm(navigate));
  return root;
}

/* 그 사람 정보 입력 */
function pairForm(navigate) {
  const prev = unstash("pull:partner") || {};
  const sec = el("section", { class: "wrap section-gap", style: "margin-top: var(--sp-6, 40px);" });
  sec.append(el("div", { class: "panel panel-gold" }, [
    el("p", { class: "eyebrow", text: "그 사람과 끌림 궁합" }),
    el("h2", { class: "serif", style: "margin-top:6px;", text: "그 사람도 넣어 볼래?" }),
    el("p", { class: "muted", style: "font-size:var(--fs-sm); margin-top:6px;", text: "내 사주와 그 사람 사주를 함께 보고, 그 사람이 나에게 빠질 이유와 그 사람에게 맞는 다가가는 법을 알려 줄게." }),
  ]));

  let blockRef = personBlock("pp", "그 사람", prev);
  const blockHost = el("div", {}, [blockRef.node]);

  sec.append(blockHost);

  const err = el("p", { class: "field-error", style: "text-align:center;", "aria-live": "polite" });
  const go = el("button", { class: "btn btn-primary btn-block" }, [el("span", { text: `그 사람과 끌림 궁합 보기 · 코인 ${costOf("pullpair")}개` })]);
  go.addEventListener("click", () => {
    const input = blockRef.collect();
    const v = validateBirthInput(input);
    blockRef.showErrors(v.errors);
    if (!v.ok) { err.textContent = "그 사람의 생년월일과 성별을 입력해 주세요."; return; }
    err.textContent = "";
    const paid = chargeNewPeople([{ input, name: input.name, relation: "썸" }], { navigate });
    if (!paid.ok) { err.textContent = "새로 입력하는 사람은 코인 10개가 필요해요."; return; }
    stash("pull:partner", input);
    navigate("/pull/pair");
  });
  sec.append(el("p", { class: "tiny muted", style: "text-align:center; margin:10px 0;", text: NEW_PERSON_NOTE }), err, go);
  return sec;
}

/* 두 사람 결과 */
export function renderPullPair({ navigate }) {
  const partner = unstash("pull:partner");
  if (!partner) { navigate("/pull"); return el("div"); }
  const who = partner.name || "그 사람";
  notePair(`나 × ${who} · 끌림 궁합`);
  const root = gatedPage({
    navigate, id: "pullpair", eyebrow: "그 사람과 끌림 궁합", title: `${iga(who)} 나에게 빠지는 법`,
    sub: "두 사람의 사주로 본 끌림의 이유와, 그 사람에게 맞는 다가가는 법이에요.", backTo: "/pull", backLabel: "내 매력 사주",
    itemSuffix: `${partner.birthDate}_${partner.birthTime || "x"}_${partner.gender}`,
    buildView: (profile) => {
      const you = computeSaju(partner);
      const r = pullPair(profile, you, partner);
      return el("div", { class: "section-gap", style: "margin-top: var(--sp-4);" }, [
        el("div", { class: "panel", style: "display:flex; gap:16px; align-items:center;" }, [
          ring(r.score),
          el("div", { style: "flex:1;" }, [
            el("p", { class: "eyebrow", text: `나 ${r.myElemKr} × ${r.yName} ${r.yElemKr}` }),
            el("p", { class: "serif", style: "font-size:1.3rem; margin-top:4px;", text: r.grade }),
            el("p", { class: "muted tiny", style: "margin-top:4px;", text: "빠져들 가능성 지수" }),
          ]),
        ]),
        el("div", { class: "insight", text: r.core }),
        stepsPanel(`${iga(r.yName)} 나에게 푹 빠지게 만드는 법`, r.steps),
        block("두 사람 맞춤 공략", r.custom, "action"),
        block("타이밍", r.timingLine, "good"),
        block(`${r.yName}의 사주 속 이상형 · ${r.ideal.elemKr}`, [r.ideal.line, r.ideal.look, `나와의 일치도: ${r.ideal.match}`, r.ideal.tip], "action"),
        block(`${r.yName}의 연애 횟수 · ${r.yCount.label}`, [r.yCount.line, ...r.yCount.why], "good"),
        block(`${iga(r.yName)} 당신에게 빠지는 이유`, r.reasons, "good"),
        block("두 사람의 기운 흐름", r.flow, "action"),
        block(`${r.yName}의 연애 스타일 · ${r.style.title}`, r.style.line, "good"),
        block("평소에 이렇게 해 주세요", r.doList, "good"),
        block("이것만은 피하세요", r.avoidList, "warn"),
        r.cautions.length ? block("두 사람이 조심할 점", r.cautions, "warn") : null,
        noticeBox("info", r.healthy),
        savePersonOffer(partner, { name: partner.name, relation: "썸", navigate }),
      ].filter(Boolean));
    },
  });
  return root;
}
