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
