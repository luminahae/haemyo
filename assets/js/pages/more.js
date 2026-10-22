import { el, clear, toast } from "../utils/dom.js";
import { pageHeader, backLink, noticeBox, loadDisclaimer } from "./shared.js";
import { getMyBirth } from "../state.js";
import { personSwitch } from "./people.js";
import { computeSaju } from "../saju/manse.js";
import { analyzeStrength } from "../saju/strength.js";
import { tenGod } from "../saju/fortune.js";
import { dayCalendar } from "../saju/manseryeok.js";
import { isUnlocked, unlock, getCoins, costOf, noCoinToast, spend, isUnlimited as isUnlimitedW } from "../wallet.js";
/* =========================================================
   손금 · 이름풀이 · 사주 MBTI — 재미·참고용
   작성: HAE
   ========================================================= */
const EK = { wood: "목(木)", fire: "화(火)", earth: "토(土)", metal: "금(金)", water: "수(水)" };
const GEN = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
const CTRL = { wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" };

function head(root, navigate, title, h, desc, who) {
  loadDisclaimer();
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/menu", "전체 메뉴")]));
  root.append(pageHeader(title, h, desc));
  if (who) root.append(personSwitch(navigate, { title: who }));
}
function lockBox(title, desc, cost, onOpen) {
  const coins = getCoins();
  return el("div", { class: "panel premium-lock" }, [
    el("span", { class: "lock-badge" }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: `코인 ${cost}개` })]),
    el("h3", { class: "serif", style: "margin-top:10px;", text: title }),
    el("p", { class: "muted", style: "font-size:var(--fs-sm);", text: desc }),
    el("button", { class: "btn btn-primary btn-block", style: "margin-top: var(--sp-4);", onclick: onOpen },
      [el("span", { text: coins >= cost ? `코인 ${cost}개로 보기 · 보유 ${coins}개` : "코인 받으러 가기" })]),
  ]);
}

/* ======================= 손금 ======================= */
const HAND_SVG = `<svg viewBox="0 0 200 250" class="palm-svg" aria-hidden="true">
  <g class="pm-hand"><rect x="44" y="104" width="116" height="128" rx="34"/><rect x="50" y="34" width="24" height="84" rx="12"/><rect x="78" y="20" width="25" height="96" rx="12.5"/>
  <rect x="107" y="28" width="24" height="88" rx="12"/><rect x="135" y="52" width="21" height="68" rx="10.5"/><rect x="14" y="124" width="26" height="74" rx="13" transform="rotate(-32 27 161)"/></g>
  <path data-l="life" d="M66 120 C 44 150, 46 192, 80 226"/>
  <path data-l="head" d="M66 122 C 92 132, 122 142, 152 152"/>
  <path data-l="heart" d="M156 128 C 132 114, 102 112, 74 116"/>
  <path data-l="fate" d="M104 230 C 104 192, 104 152, 101 118"/>
  <path data-l="marriage" d="M160 120 L 145 122"/>
</svg>`;
const PALM_Q = [
  { l: "shape", q: "손바닥과 손가락 모양은?", hint: "손바닥이 네모인지 길쭉한지, 손가락이 손바닥보다 짧은지 긴지 보세요.", opts: [
    ["네모난 손바닥 + 짧은 손가락", "earth", "땅의 손 — 성실하고 손재주가 좋아요. 한번 맡은 일은 끝까지 책임지는 믿음직한 타입."],
    ["네모난 손바닥 + 긴 손가락", "metal", "공기의 손 — 말과 생각이 빨라요. 분석·소통·글쓰기에 강하고 호기심이 많아요."],
    ["긴 손바닥 + 짧은 손가락", "fire", "불의 손 — 열정과 추진력이 넘쳐요. 일단 해 보고 생각하는 행동파!"],
    ["긴 손바닥 + 긴 손가락", "water", "물의 손 — 감수성이 깊고 직관이 좋아요. 예술·상담·돌봄에 재능이 있어요."],
  ] },
  { l: "life", q: "생명선 (엄지를 둥글게 감싸는 선)", hint: "생명선은 수명이 아니라 ‘에너지를 쓰는 방식’이에요.", opts: [
    ["크게 둥글고 길다", "fire", "에너지가 넘치고 회복이 빨라요. 활동적인 일·운동이 운을 키워요."],
    ["엄지 쪽에 바짝 붙어 있다", "water", "에너지를 아껴 쓰는 섬세한 타입. 쉬는 시간을 꼭 챙기면 오래 달려요."],
    ["중간에 끊기거나 갈라진다", "wood", "인생의 큰 전환점(이사·직업 변화)이 있는 손. 변화가 오히려 기회가 돼요."],
  ] },
  { l: "head", q: "두뇌선 (손바닥 가운데를 가로지르는 선)", hint: "생명선과 같은 곳에서 출발해 옆으로 뻗는 선이에요.", opts: [
    ["곧게 옆으로 뻗는다", "metal", "현실적이고 논리적이에요. 계획·숫자·분석이 필요한 일에 강해요."],
    ["아래로 둥글게 휘어 내려간다", "water", "상상력과 감성이 풍부해요. 창작·기획·예술 쪽 감각이 좋아요."],
    ["끝이 두 갈래로 갈라진다", "wood", "‘작가의 갈래’ — 현실 감각과 상상력을 둘 다 가진 다재다능형!"],
  ] },
  { l: "heart", q: "감정선 (손가락 바로 아래 가로선)", hint: "새끼손가락 아래에서 시작해 검지 쪽으로 가는 선이에요.", opts: [
    ["검지 아래까지 길게 간다", "fire", "사랑에 진심인 이상주의자. 한번 마음 주면 깊고 오래가요."],
    ["중지 아래쯤에서 끝난다", "earth", "연애도 현실적으로. 말보다 행동으로 챙기는 타입이에요."],
    ["짧고 곧다", "metal", "쿨하고 담백해요. 표현이 서툴 뿐 속정은 깊어요."],
    ["끝이 여러 갈래로 갈라진다", "wood", "다정다감해서 인기가 많아요. 사람 사이에서 에너지를 얻어요."],
  ] },
  { l: "fate", q: "운명선 (손목에서 중지 쪽으로 올라가는 세로선)", hint: "없는 사람도 많아요. 없다고 나쁜 게 아니에요!", opts: [
    ["뚜렷하고 길다", "metal", "일찍 길을 정하고 한 우물을 파는 타입. 꾸준함이 큰 성과가 돼요."],
    ["손바닥 중간부터 시작한다", "earth", "늦게 피는 꽃! 30대 이후 자기 자리를 찾고 크게 올라가요."],
    ["희미하거나 거의 없다", "water", "정해진 길보다 자유로운 커리어. 여러 일을 해 보며 나만의 길을 만들어요."],
  ] },
  { l: "marriage", q: "결혼선 (새끼손가락 아래 옆면의 짧은 가로선)", hint: "손을 살짝 오므리면 잘 보여요.", opts: [
    ["한 줄이 뚜렷하다", "earth", "한 사람과 깊고 오래가는 인연을 만나는 손이에요."],
    ["두세 줄이 있다", "wood", "마음을 크게 움직이는 인연이 여러 번 와요. 그만큼 사랑을 배우는 타입."],
    ["끝이 위로 휘어 올라간다", "fire", "결혼보다 내 일·내 삶을 먼저 세우는 타입. 늦게 만나 더 잘 맞는 사람과 함께해요."],
  ] },
];
const PALM_ELEM = {
  wood: "성장형 — 새로운 걸 배우고 넓혀 갈수록 운이 커지는 손", fire: "열정형 — 사람을 끌어당기고 앞장설 때 빛나는 손",
  earth: "신뢰형 — 꾸준함과 책임감으로 결국 다 이뤄 내는 손", metal: "결단형 — 기준이 분명하고 실력으로 인정받는 손", water: "직관형 — 깊은 감성과 눈치로 사람의 마음을 얻는 손",
};
export function renderPalm({ navigate }) {
  const root = el("div", {});
  head(root, navigate, "손금", "내 손을 보며 따라 하는 손금 풀이", "그림에서 반짝이는 선을 내 손에서 찾아 가장 비슷한 모양을 골라요. 주로 쓰는 손을 보면 돼요.", "누구의 사주와 함께 볼까?");
  const host = el("section", { class: "wrap section-gap" });
  root.append(host);
  const ans = [];
  const my = getMyBirth();
  function paint() {
    clear(host);
    const i = ans.length;
    if (i < PALM_Q.length) {
      const Q = PALM_Q[i];
      const fig = el("div", { class: "palm-fig", html: HAND_SVG });
      fig.querySelectorAll("path").forEach((p) => p.classList.toggle("on", p.dataset.l === Q.l));
      if (Q.l === "shape") fig.querySelector(".pm-hand").classList.add("on");
      host.append(el("div", { class: "panel palm-q" }, [
        el("div", { class: "palm-prog" }, PALM_Q.map((_, k) => el("span", { class: k < i ? "done" : k === i ? "now" : "" }))),
        fig,
        el("p", { class: "eyebrow", text: `${i + 1} / ${PALM_Q.length}` }),
        el("h2", { class: "serif", style: "font-size:1.25rem;", text: Q.q }),
        el("p", { class: "tiny muted", text: Q.hint }),
        el("div", { class: "palm-opts" }, Q.opts.map((o, k) => el("button", { type: "button", class: "palm-opt", onclick: () => { ans.push(k); paint(); } }, [el("span", { text: o[0] })]))),
        i ? el("button", { class: "btn btn-quiet btn-sm", onclick: () => { ans.pop(); paint(); } }, [el("span", { text: "‹ 이전 질문" })]) : null,
      ].filter(Boolean)));
      return;
    }
    const id = `palm:${ans.join("")}`, cost = costOf("palm");
    if (!isUnlocked(id)) {
      host.append(lockBox("내 손금 풀이 보기", "손 모양 · 생명선 · 두뇌선 · 감정선 · 운명선 · 결혼선 풀이 + 손금과 사주가 겹치는 부분", cost, () => {
        const r = unlock(id, cost); if (r.ok) { toast(`손금 풀이를 열었어요 · 코인 ${cost} 차감`); paint(); } else noCoinToast(cost);
      }), el("button", { class: "btn btn-quiet btn-sm", onclick: () => { ans.length = 0; paint(); } }, [el("span", { text: "처음부터 다시 고르기" })]));
      return;
    }
    const picks = PALM_Q.map((Q, k) => ({ Q, o: Q.opts[ans[k]] }));
    const cnt = {}; picks.forEach(({ o }) => { cnt[o[1]] = (cnt[o[1]] || 0) + 1; });
    const main = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
    let sajuLine = null;
    if (my) {
      const S = analyzeStrength(computeSaju(my));
      const y = S.yongsin[0];
      sajuLine = main === y ? `손금의 중심 기운이 사주의 용신 ${EK[y]}과 같아요! 타고난 손이 부족한 기운을 스스로 채워 주는, 아주 좋은 조합이에요.`
        : main === S.dayElem ? `손금과 사주 일간이 모두 ${EK[main]}이에요. 내 색깔이 아주 뚜렷한 사람 — 장점을 밀고 가되, 용신 ${EK[y]}로 균형을 맞춰 주세요.`
          : `손금은 ${EK[main]}, 사주의 용신은 ${EK[y]}. 손금이 보여 주는 재능에 ${EK[y]}의 기운(사람·환경)을 더하면 운이 크게 열려요.`;
    }
    host.append(
      el("div", { class: "panel panel-gold", style: "text-align:center;" }, [
        el("div", { class: "palm-fig sm", html: HAND_SVG }),
        el("p", { class: "eyebrow", style: "justify-content:center;", text: "나의 손금 한 줄 요약" }),
        el("p", { class: "serif", style: "font-size:1.3rem;", text: PALM_ELEM[main] }),
      ]),
      el("div", { class: "panel section-gap" }, picks.map(({ Q, o }) => el("div", { class: "palm-res" }, [
        el("b", { text: Q.q.split(" (")[0] }), el("span", { class: "tiny muted", text: `· ${o[0]}` }), el("p", { text: o[2] }),
      ]))),
      sajuLine ? el("div", { class: "block tag-good" }, [el("span", { class: "block-label", text: "손금 × 내 사주" }), el("p", { text: sajuLine })]) : null,
      el("button", { class: "btn btn-ghost btn-block", onclick: () => { ans.length = 0; paint(); } }, [el("span", { text: "다른 손으로 다시 보기" })]),
      noticeBox("info", "손금은 살면서 조금씩 변해요. 재미로 보는 참고용 풀이예요."),
    );
  }
  paint();
  return root;
}

/* ======================= 이름풀이 (발음 오행) ======================= */
const CHO = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const CHO_EL = { ㄱ: "wood", ㄲ: "wood", ㅋ: "wood", ㄴ: "fire", ㄷ: "fire", ㄸ: "fire", ㄹ: "fire", ㅌ: "fire", ㅇ: "earth", ㅎ: "earth", ㅅ: "metal", ㅆ: "metal", ㅈ: "metal", ㅉ: "metal", ㅊ: "metal", ㅁ: "water", ㅂ: "water", ㅃ: "water", ㅍ: "water" };
const EL_NAME_TRAIT = { wood: "곧게 자라는 성장의 소리", fire: "밝게 퍼지는 표현의 소리", earth: "포근하게 감싸는 안정의 소리", metal: "또렷하고 단단한 결단의 소리", water: "부드럽게 흐르는 지혜의 소리" };
function nameElems(name) {
  return [...name].filter((ch) => ch >= "가" && ch <= "힣").map((ch) => {
    const c = CHO[Math.floor((ch.charCodeAt(0) - 0xac00) / 588)];
    return { ch, c, e: CHO_EL[c] };
  });
}
function flowOf(list) {
  const pairs = [];
  for (let i = 0; i < list.length - 1; i++) {
    const a = list[i].e, b = list[i + 1].e;
    const kind = GEN[a] === b || GEN[b] === a ? "상생" : a === b ? "비화" : "상극";
    pairs.push({ a: list[i], b: list[i + 1], kind });
  }
  const score = Math.max(40, Math.min(98, 70 + pairs.reduce((s, p) => s + (p.kind === "상생" ? 10 : p.kind === "비화" ? 3 : -9), 0)));
  return { pairs, score };
}
/* --- 한자 성명학 데이터 (assets/hanja-name.json: 원획·자원오행·훈) --- */
let _hanja = null;
function loadHanja() {
  if (!_hanja) _hanja = fetch(new URL("../../hanja-name.json", import.meta.url)).then((r) => r.json()).catch(() => ({ pick: {}, all: {} }));
  return _hanja;
}
const GOOD81 = new Set([1, 3, 5, 6, 7, 8, 11, 13, 15, 16, 17, 18, 21, 23, 24, 25, 29, 31, 32, 33, 35, 37, 38, 39, 41, 45, 47, 48, 52, 57, 61, 63, 65, 67, 68, 81]);
const HALF81 = new Set([27, 30, 40, 51, 55, 58, 71, 73, 75, 77, 78]);
const n81 = (n) => { while (n > 81) n -= 80; return n; };
const lucky81 = (n) => (GOOD81.has(n81(n)) ? 2 : HALF81.has(n81(n)) ? 1 : 0);
const GYEOK = [
  ["원격", "元", "초년운 · 0~20세", ["어릴 때 시행착오가 있지만 그 경험이 단단한 뿌리가 돼요.", "무난하게 자라며 꾸준히 재능을 키워 가요.", "어릴 때부터 재능이 일찍 피고 주변의 사랑을 받아요."]],
  ["형격", "亨", "청년운 · 20~40세", ["사회 초년에 굴곡이 있어도 버티면 실력으로 올라서요.", "노력한 만큼 차근차근 자리를 잡아 가요.", "일과 사람 운이 함께 트여 이름이 빨리 알려져요."]],
  ["이격", "利", "중년운 · 40~60세", ["중년엔 무리한 확장보다 지키는 쪽이 이득이에요.", "안정 속에 실속을 챙기는 시기예요.", "쌓아 온 것이 재물·명예로 크게 돌아와요."]],
  ["정격", "貞", "총운 · 평생", ["평생 기복이 있지만 위기 때마다 다시 일어서는 힘이 있어요.", "크게 튀진 않아도 오래 편안한 이름이에요.", "평생을 받쳐 주는 큰 복이 깃든 이름이에요."]],
];
const BRIGHT = new Set(["ㅏ", "ㅑ", "ㅗ", "ㅛ", "ㅐ", "ㅘ", "ㅙ", "ㅚ"]);
const JUNG = ["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ"];
const SOUND_OF = { wood: ["ㄱ", "ㅋ"], fire: ["ㄴ", "ㄷ", "ㄹ", "ㅌ"], earth: ["ㅇ", "ㅎ"], metal: ["ㅅ", "ㅈ", "ㅊ"], water: ["ㅁ", "ㅂ", "ㅍ"] };
const NICK = {
  wood: ["가온", "가람", "규리", "기쁨", "코코", "가을", "그린", "키키", "고은", "가비", "꼬마", "기린", "가윤", "고요", "가희", "꿀비", "가든", "구름", "깨비", "가야"],
  fire: ["나래", "다온", "루나", "라라", "도담", "누리", "단비", "토리", "나린", "다솜", "라온", "노을", "달리", "티티", "다래", "로아", "나비", "도토", "라엘", "누리봄"],
  earth: ["하늘", "아라", "온새", "이든", "해솔", "유리", "하람", "여름", "아토", "윤슬", "해나", "이솔", "하루", "온유", "오름", "예솔", "히히", "아리", "한별", "은솔"],
  metal: ["소라", "세아", "지안", "시엘", "주아", "새봄", "솔이", "채움", "슬기", "지니", "초코", "샤샤", "소담", "치치", "젤리", "새라", "찬비", "소미", "지오"],
  water: ["모아", "봄이", "미소", "보라", "마루", "포비", "별이", "민트", "모모", "빛나", "바다", "미루", "보미", "파랑", "버찌", "몽이", "푸름", "보담", "마음", "봄비"],
};
function syl(ch) { const k = ch.charCodeAt(0) - 0xac00; return { cho: CHO[Math.floor(k / 588)], jung: JUNG[Math.floor((k % 588) / 28)], jong: k % 28 }; }
/* 한자 이름 고르기 (성+이름 → 글자별 한자) — 궁합 등에서 재사용 */
function hanjaNamePicker(H, label, initial, onChange) {
  const st = { sur: initial ? [...initial][0] : "", given: initial ? [...initial].slice(1).join("") : "", picks: {} };
  const sur = el("input", { class: "input", maxlength: "2", placeholder: "성", value: st.sur, style: "flex:0 0 72px;" });
  const giv = el("input", { class: "input", maxlength: "3", placeholder: "이름", value: st.given });
  const rows = el("div", { class: "hnp-rows" });
  const box = el("div", { class: "panel section-gap hnp" }, [el("p", { class: "eyebrow", text: `${label}의 한자 이름` }), el("div", { class: "hj-inrow" }, [sur, giv, el("button", { class: "btn btn-primary", onclick: () => { st.sur = sur.value.trim(); st.given = giv.value.trim(); st.picks = {}; draw(); } }, [el("span", { text: "한자 고르기" })])]), rows]);
  function draw() {
    clear(rows);
    const sylls = [...(st.sur + st.given)].filter((c) => c >= "가" && c <= "힣");
    if (!st.sur || !st.given) { onChange(null); return; }
    sylls.forEach((sy, i) => {
      const list = (H.pick[sy] || H.pick[DUEUM[sy]] || []).map(([ch, hun, s2, e]) => ({ ch, hun, st: s2, e }));
      const curOther = st.picks[i] && !list.some((x) => x.ch === st.picks[i].ch) ? st.picks[i] : null;
      rows.append(el("div", { class: "hj-row" }, [el("span", { class: "hj-syl", text: sy }), el("div", { class: "hj-opts" }, [
        ...list.map((x) => el("button", { type: "button", class: "hj-opt" + (st.picks[i] && st.picks[i].ch === x.ch ? " on" : ""), onclick: () => { st.picks[i] = { ...x, e: x.e || CHO_EL[syl(sy).cho] }; draw(); } }, [el("b", { class: "serif", "data-nokr": "", text: x.ch }), el("span", { text: `${x.hun} ${sy}` }), el("small", { text: `${x.st}획` })])),
        el("button", { type: "button", class: "hj-find" + (curOther ? " on" : ""), onclick: () => openHanjaFinder(H, sy, (pk) => { st.picks[i] = { ...pk, e: pk.e || CHO_EL[syl(sy).cho] }; draw(); }) },
          curOther ? [el("b", { class: "serif", "data-nokr": "", text: curOther.ch }), el("span", { text: `${curOther.hun || ""} ${sy}` }), el("small", { text: "다시 찾기" })] : [el("span", { class: "hj-find-ic", text: "🔍" }), el("span", { text: list.length ? "다른 한자" : "한자 찾기" }), el("small", { text: `‘${sy}’ 자 전체` })]),
      ])]));
    });
    const done = sylls.length >= 2 && sylls.every((_, i) => st.picks[i]);
    onChange(done ? { P: sylls.map((sy, i) => ({ sy, ...st.picks[i] })), nSur: [...st.sur].length, name: st.sur + st.given } : null);
  }
  if (st.sur && st.given) setTimeout(draw, 0);
  return box;
}
function nameInfo(X) {
  const P = X.P, nSur = X.nSur;
  const surSt = P.slice(0, nSur).reduce((a, b) => a + b.st, 0), g = P.slice(nSur);
  const g1 = g[0] ? g[0].st : 0, g2 = g[1] ? g[1].st : 0, g3 = g[2] ? g[2].st : 0;
  const vals = [g.length === 1 ? g1 : g1 + g2 + g3, surSt + g1, g.length === 1 ? surSt : surSt + (g.length === 3 ? g2 + g3 : g2), surSt + g1 + g2 + g3];
  return { P, name: X.name, vals, lk: vals.map(lucky81), els: [...new Set(P.map((x) => x.e))], main: (g[0] || P[0]).e };
}
/* 한자 찾기 — 같은 소리(두음법칙 포함)의 한자를 뜻과 함께 모두 보여 주는 시트 */
function hanjaByReading(H, sy) {
  const keys = new Set([sy, DUEUM[sy]].filter(Boolean));
  const out = [];
  for (const [ch, v] of Object.entries(H.all)) if (keys.has(v[2])) out.push({ ch, st: v[0], e: v[1], r: v[2], hun: v[3] || "", ord: v[4] || 99999 });
  return out.sort((a, b) => (!!b.hun - !!a.hun) || a.ord - b.ord);
}
function openHanjaFinder(H, sy, onPick) {
  const all = hanjaByReading(H, sy);
  const prev = document.querySelector(".hjs-sheet"); if (prev) prev.remove();
  const q = el("input", { class: "input", type: "search", placeholder: "뜻으로 찾기 (예: 맑을, 빛날)", "aria-label": "한자 뜻으로 찾기" });
  const grid = el("div", { class: "hjs-grid" });
  const count = el("p", { class: "tiny muted" });
  const close = () => { sheet.remove(); document.removeEventListener("keydown", onKey); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  const EKS = { wood: "목(木)", fire: "화(火)", earth: "토(土)", metal: "금(金)", water: "수(水)" };
  function paint() {
    clear(grid);
    const k = q.value.trim();
    let list = all;
    if (k) {
      const direct = [...k].filter((c) => H.all[c]);
      list = direct.length ? direct.map((ch) => ({ ch, st: H.all[ch][0], e: H.all[ch][1], hun: H.all[ch][3] || "", r: H.all[ch][2] })) : all.filter((x) => x.hun.includes(k));
    }
    count.textContent = k ? `${list.length}개 찾았어요` : `‘${sy}’${DUEUM[sy] ? `·‘${DUEUM[sy]}’` : ""} 소리 한자 ${all.length}개 · 뜻이 있는 글자부터`;
    if (!list.length) { grid.append(el("p", { class: "muted tiny", style: "grid-column:1/-1; text-align:center; padding:20px 0;", text: "찾는 한자가 없어요. 다른 뜻으로 찾아볼까요?" })); return; }
    list.slice(0, 240).forEach((x) => grid.append(el("button", { type: "button", class: "hj-opt", onclick: () => { onPick({ ch: x.ch, hun: x.hun, st: x.st, e: x.e }); close(); } }, [
      el("b", { class: "serif", "data-nokr": "", text: x.ch }), el("span", { text: `${x.hun || "—"} ${x.r || sy}` }), el("small", { text: `${x.st}획${x.e ? " · " + EKS[x.e] : ""}` }),
    ])));
  }
  q.addEventListener("input", paint);
  const sheet = el("div", { class: "hjs-sheet", "data-nocapture": "" }, [
    el("div", { class: "hjs-back", onclick: close }),
    el("div", { class: "hjs-card", role: "dialog", "aria-modal": "true", "aria-label": `${sy} 한자 찾기` }, [
      el("div", { class: "hjs-head" }, [el("span", { class: "hj-syl", text: sy }), el("div", {}, [el("b", { text: `‘${sy}’ 자 한자 찾기` }), count]), el("button", { type: "button", class: "dl-x", "aria-label": "닫기", text: "✕", onclick: close })]),
      q, grid,
      el("p", { class: "tiny muted", style: "text-align:center;", text: "획수는 성명학에서 쓰는 원획(原劃) 기준이에요. 가족관계증명서·도장에 적힌 한자와 같은 글자를 골라 주세요." }),
    ]),
  ]);
  document.body.append(sheet); document.addEventListener("keydown", onKey);
  paint(); setTimeout(() => q.focus({ preventScroll: true }), 50);
}
const DUEUM = { 이: "리", 리: "이", 임: "림", 림: "임", 유: "류", 류: "유", 노: "로", 로: "노", 양: "량", 량: "양", 여: "려", 려: "여", 연: "련", 나: "라", 라: "나", 육: "륙", 염: "렴", 용: "룡" };

export function renderNameReading({ navigate, tab = "hangul" }) {
  const root = el("div", {});
  head(root, navigate, "이름풀이", "이름에 담긴 기운 풀어 보기", "한자를 몰라도 OK — 한글 소리로 보기, 한자 획수로 보는 성명학, 내 사주에 맞는 닉네임까지. 모두 무료!", "누구의 사주와 맞춰 볼까?");
  const my = getMyBirth();
  const S = my ? analyzeStrength(computeSaju(my)) : null;
  const host = el("section", { class: "wrap section-gap" });
  root.append(host);
  let cur = ["hangul", "hanja", "pair", "nick"].includes(tab) ? tab : "hangul";
  const myName = (my && my.name) || "";
  const state = { full: myName.length >= 3 ? myName : "", sur: myName.length >= 3 ? myName[0] : "", given: myName.length >= 3 ? myName.slice(1) : myName, picks: {} };

  /* 이름풀이 — 처음 한 번 무료, 이름·한자를 바꿔 다시 보면 코인 */
  const NG_KEY = `hae.nameGate.v1:${my ? my.birthDate : "guest"}`;
  const readG = () => { try { return JSON.parse(localStorage.getItem(NG_KEY)) || { free: {}, owned: [] }; } catch { return { free: {}, owned: [] }; } };
  const writeG = (g) => { try { localStorage.setItem(NG_KEY, JSON.stringify(g)); } catch { /* ignore */ } };
  const fixCost = costOf("namefix");
  const gateNotice = (kind) => {
    const g = readG(), used = g.free[kind];
    return el("div", { class: "notice nm-gate-note", role: "note" }, [el("span", { class: "nm-gate-ic", text: "ℹ️" }), el("p", { text: used
      ? `${(my && my.name) || "이 사람"}의 ${kind === "hanja" ? "한자 이름" : "이름"} 풀이 무료 1회는 ‘${used.split("|")[0]}’로 사용했어요. 이미 본 이름은 계속 무료지만, 이름이나 한자를 바꿔서 새로 보면 코인 ${fixCost}개가 들어요.`
      : `${kind === "hanja" ? "한자 이름" : "이름"} 풀이는 사람마다 처음 한 번만 무료예요. (위에서 사람을 바꾸면 그 사람도 1번 무료) 이후 이름이나 ${kind === "hanja" ? "한자" : "글자"}를 바꿔서 새로 보면 코인 ${fixCost}개가 들어요.` })]);
  };
  function gateName(kind, sig, show, out) {
    const g = readG(), key = `${kind}:${sig}`;
    if (g.owned.includes(key)) return show();
    if (!g.free[kind]) { g.free[kind] = sig; g.owned.push(key); writeG(g); show(); toast("무료 1회로 풀었어요 · 다시 볼 땐 계속 무료"); return; }
    clear(out);
    out.append(el("div", { class: "panel premium-lock" }, [
      el("span", { class: "lock-badge" }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: `코인 ${fixCost}개` })]),
      el("h3", { class: "serif", style: "margin-top:10px;", text: `‘${sig.split("|")[0]}’ 새로 풀어 보기` }),
      el("p", { class: "muted", style: "font-size:var(--fs-sm);", text: `무료 1회는 ‘${g.free[kind].split("|")[0]}’에 이미 썼어요. 이름이나 한자를 바꿔서 보려면 코인 ${fixCost}개가 들어요. 한 번 연 이름은 다시 볼 때 무료예요.` }),
      el("button", { class: "btn btn-primary btn-block", style: "margin-top: var(--sp-4);", onclick: () => {
        const r = spend(fixCost, { kind: "namefix" }); if (!r.ok) return noCoinToast(fixCost);
        const g2 = readG(); g2.owned.push(key); writeG(g2); toast(`코인 ${fixCost}개로 풀었어요`); show();
      } }, [el("span", { text: `코인 ${fixCost}개로 풀기 · 보유 ${getCoins()}개` })]),
    ]));
  }

  function paint() {
    clear(host);
    host.append(el("div", { class: "nm-tabs", role: "tablist" }, [["hangul", "🔤", "한자 없이"], ["hanja", "📜", "한자 이름"], ["pair", "💞", "한자 궁합"], ["nick", "🏷️", "닉네임"], ["make", "🖋️", "작명·개명"]].map(([id, em, t]) =>
      el("button", { type: "button", role: "tab", "aria-selected": String(cur === id), class: "nm-tab" + (cur === id ? " on" : ""), onclick: () => { if (id === "make") return navigate("/naming"); cur = id; paint(); } }, [el("span", { class: "nm-tab-ic", text: em }), el("span", { text: t })]))));
    if (cur === "hangul") paintHangul(); else if (cur === "hanja") paintHanja(); else if (cur === "pair") paintPair(); else paintNick();
  }

  /* ---------- 1) 한자 없이: 한글 소리 ---------- */
  function paintHangul() {
    const n1 = el("input", { class: "input", maxlength: "5", placeholder: "이름 (예: 김해묘)", value: state.full || (state.sur + state.given) });
    const n2 = el("input", { class: "input", maxlength: "5", placeholder: "(선택) 궁금한 사람 이름 — 이름 궁합" });
    const out = el("div", { class: "section-gap" });
    host.append(gateNotice("hangul"));
    const go = () => {
      const nm = n1.value.trim();
      if (nameElems(nm).length < 2) { clear(out); out.append(noticeBox("warn", "한글 이름을 두 글자 이상 적어 주세요.")); return; }
      gateName("hangul", nm, show, out);
    };
    const show = () => {
      clear(out);
      state.full = n1.value.trim();
      const A = nameElems(state.full);
      if (A.length < 2) { out.append(noticeBox("warn", "한글 이름을 두 글자 이상 적어 주세요.")); return; }
      const F = flowOf(A);
      const chip = (x) => el("span", { class: `nm-ch elem-${x.e}` }, [el("b", { text: x.ch }), el("small", { text: `${x.c} · ${EK[x.e]}` })]);
      // 모음 밝기 · 받침
      const parts = A.map((x) => syl(x.ch));
      const bright = parts.filter((p) => BRIGHT.has(p.jung)).length;
      const closed = parts.filter((p) => p.jong).length;
      const tags = [
        bright >= Math.ceil(parts.length / 2) ? "☀️ 밝고 경쾌한 첫인상" : "🌙 차분하고 깊은 첫인상",
        closed >= Math.ceil(parts.length / 2) ? "🪨 단단하고 믿음직한 울림" : "🫧 부드럽고 친근한 울림",
        F.pairs.some((p) => p.kind === "상극") ? "⚡ 개성 있고 기억에 남는 이름" : "🌊 막힘없이 술술 불리는 이름",
      ];
      out.append(el("div", { class: "panel panel-gold", style: "text-align:center;" }, [
        el("div", { class: "nm-row" }, A.flatMap((x, i) => i ? [el("span", { class: "nm-arrow", text: F.pairs[i - 1].kind === "상생" ? "→" : F.pairs[i - 1].kind === "비화" ? "=" : "×" }), chip(x)] : [chip(x)])),
        el("p", { class: "serif", style: "font-size:2rem; margin-top:8px;", text: `${F.score}점` }),
        el("p", { class: "muted", text: F.score >= 85 ? "소리가 막힘없이 흘러가는 이름이에요." : F.score >= 65 ? "무난하게 흐르는 이름이에요. 부르기 편하고 정감 있어요." : "글자끼리 부딪히는 곳이 있지만, 그만큼 개성이 강한 이름이에요." }),
        el("div", { class: "nm-tags" }, tags.map((t) => el("span", { text: t }))),
      ]));
      out.append(el("div", { class: "panel" }, [
        el("p", { class: "eyebrow", text: "글자별 소리 기운 (발음 오행)" }),
        ...A.map((x) => el("p", {}, [el("b", { text: `${x.ch}(${x.c}) ` }), document.createTextNode(`${EK[x.e]} — ${EL_NAME_TRAIT[x.e]}`)])),
        ...F.pairs.map((p) => el("p", { class: "tiny muted", text: `${p.a.ch}→${p.b.ch}: ${p.kind}${p.kind === "상생" ? " (서로 살려 줘요)" : p.kind === "비화" ? " (같은 기운이 이어져요)" : " (서로 부딪혀요)"}` })),
      ]));
      if (S) out.append(sajuBlock(A.map((x) => x.e)));
      const B = nameElems(n2.value.trim());
      if (B.length >= 2) {
        const a = A[A.length > 2 ? 1 : 0].e, b = B[B.length > 2 ? 1 : 0].e;
        const rel = GEN[a] === b ? [92, "내 이름이 상대 이름을 살려 줘요. 내가 챙겨 주고 상대가 빛나는 관계."] : GEN[b] === a ? [90, "상대 이름이 내 이름을 살려 줘요. 함께 있으면 내가 힘을 얻어요."]
          : a === b ? [80, "같은 기운끼리 — 말이 잘 통하는 친구 같은 사이예요."] : CTRL[a] === b ? [62, "내가 상대를 이끄는 구도. 주도권 다툼만 조심하면 좋아요."] : [60, "상대가 나를 다잡아 주는 구도. 잔소리도 애정이라고 생각해 주세요."];
        out.append(el("div", { class: "panel" }, [
          el("p", { class: "eyebrow", text: "이름 궁합" }),
          el("p", { class: "serif", style: "font-size:1.2rem;", text: `${n1.value.trim()} × ${n2.value.trim()} — ${rel[0]}점` }),
          el("p", { text: rel[1] }),
          el("p", { class: "tiny muted", text: "성(姓)을 뺀 이름 첫 글자의 소리 기운으로 본 재미용 궁합이에요." }),
        ]));
      }
    };
    host.append(el("div", { class: "panel section-gap" }, [
      el("label", { class: "tiny muted", text: "이름 (성까지 쓰면 더 정확해요)" }), n1, el("label", { class: "tiny muted", text: "이름 궁합 (선택)" }), n2,
      el("button", { class: "btn btn-primary btn-block", onclick: go }, [el("span", { text: "이름 풀어 보기" })]),
    ]), out);
    [n1, n2].forEach((x) => x.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); }));
    if (n1.value) go();
  }

  /* ---------- 2) 한자 이름: 원획 수리 4격 + 자원오행 ---------- */
  function paintHanja() {
    const sur = el("input", { class: "input", maxlength: "2", placeholder: "성", value: state.sur, style: "flex:0 0 72px;" });
    const giv = el("input", { class: "input", maxlength: "3", placeholder: "이름 (예: 혜인)", value: state.given });
    const pickHost = el("div", { class: "section-gap" });
    const out = el("div", { class: "section-gap" });
    let drawPick = () => {};
    host.append(gateNotice("hanja"));
    host.append(el("div", { class: "panel section-gap" }, [
      el("p", { class: "tiny muted", text: "성과 이름을 한글로 적으면, 글자마다 많이 쓰는 한자를 뜻과 함께 보여 줘요. 목록에 없으면 ‘한자 찾기’로 같은 소리의 한자를 모두 찾아볼 수 있어요." }),
      el("div", { class: "hj-inrow" }, [sur, giv, el("button", { class: "btn btn-primary", onclick: () => { state.sur = sur.value.trim(); state.given = giv.value.trim(); state.picks = {}; drawPick(); } }, [el("span", { text: "한자 고르기" })])]),
    ]), pickHost, out);
    loadHanja().then((H) => {
      drawPick = function () {
        clear(pickHost); clear(out);
        const sylls = [...(state.sur + state.given)].filter((c) => c >= "가" && c <= "힣");
        if (!state.sur || state.given.length < 1) { pickHost.append(noticeBox("info", "성과 이름을 각각 적고 ‘한자 고르기’를 눌러 주세요.")); return; }
        sylls.forEach((sy, i) => {
          const list = H.pick[sy] || H.pick[DUEUM[sy]] || [];
          const row = el("div", { class: "hj-row" }, [
            el("span", { class: "hj-syl", text: sy }),
            el("div", { class: "hj-opts" }, [
              ...list.map(([ch, hun, st, e]) => el("button", { type: "button", class: "hj-opt" + (state.picks[i] && state.picks[i].ch === ch ? " on" : ""), onclick: () => { state.picks[i] = { ch, hun, st, e: e || pronElem(sy) }; drawPick(); } }, [
                el("b", { class: "serif", "data-nokr": "", text: ch }), el("span", { text: `${hun} ${sy}` }), el("small", { text: `${st}획` }),
              ])),
              (() => {
                const cur = state.picks[i] && !list.some((x) => x[0] === state.picks[i].ch) ? state.picks[i] : null;
                return el("button", { type: "button", class: "hj-find" + (cur ? " on" : ""), "aria-label": `${sy} 한자 찾기`, onclick: () => openHanjaFinder(H, sy, (pk) => { state.picks[i] = { ...pk, e: pk.e || pronElem(sy) }; drawPick(); }) },
                  cur ? [el("b", { class: "serif", "data-nokr": "", text: cur.ch }), el("span", { text: `${cur.hun ? cur.hun + " " : ""}${sy}` }), el("small", { text: "다시 찾기" })]
                    : [el("span", { class: "hj-find-ic", text: "🔍" }), el("span", { text: list.length ? "다른 한자 찾기" : "한자 찾기" }), el("small", { text: `‘${sy}’ 자 전체` })]);
              })(),
            ]),
          ]);
          pickHost.append(row);
        });
        const done = sylls.every((_, i) => state.picks[i]);
        const sigH = () => `${state.sur}${state.given}(${sylls.map((_, i) => state.picks[i].ch).join("")})`;
        const run = () => gateName("hanja", sigH(), () => result(sylls), out);
        pickHost.append(el("button", { class: "btn btn-primary btn-block", disabled: !done, onclick: run }, [el("span", { text: done ? "한자 이름 풀이 보기" : `한자를 모두 골라 주세요 (${Object.keys(state.picks).length}/${sylls.length})` })]));
        if (done) { const g = readG(); if (g.owned.includes(`hanja:${sigH()}`)) result(sylls); }
      };
      function result(sylls) {
        clear(out);
        const P = sylls.map((sy, i) => ({ sy, ...state.picks[i] }));
        const nSur = [...state.sur].length;
        const surSt = P.slice(0, nSur).reduce((a, b) => a + b.st, 0);
        const g = P.slice(nSur);
        const g1 = g[0] ? g[0].st : 0, g2 = g[1] ? g[1].st : 0, g3 = g[2] ? g[2].st : 0;
        const won = g.length === 1 ? g1 : g1 + g2 + g3;
        const hyeong = surSt + g1;
        const ie = g.length === 1 ? surSt : surSt + (g.length === 3 ? g2 + g3 : g2);
        const jeong = surSt + g1 + g2 + g3;
        const vals = [won, hyeong, ie, jeong];
        const lk = vals.map(lucky81);
        const yin = P.map((x) => x.st % 2);
        const balanced = yin.includes(0) && yin.includes(1);
        const els = P.map((x) => x.e);
        const flow = [];
        for (let i = 0; i < els.length - 1; i++) flow.push(GEN[els[i]] === els[i + 1] || GEN[els[i + 1]] === els[i] ? "상생" : els[i] === els[i + 1] ? "비화" : "상극");
        const score = Math.round(Math.max(40, Math.min(99, 55 + lk.reduce((a, b) => a + b * 6, 0) + (balanced ? 6 : -4) + flow.reduce((a, f) => a + (f === "상생" ? 4 : f === "상극" ? -4 : 1), 0) - (lk[3] === 0 ? 6 : 0))));
        out.append(
          el("div", { class: "panel panel-gold", style: "text-align:center;" }, [
            el("p", { class: "eyebrow", style: "justify-content:center;", text: "나의 한자 이름" }),
            el("div", { class: "hj-name" }, P.map((x) => el("div", { class: `hj-big elem-${x.e}` }, [el("b", { class: "serif", "data-nokr": "", text: x.ch }), el("span", { text: `${x.hun ? x.hun + " " : ""}${x.sy}` }), el("small", { text: `${x.st}획 · ${EK[x.e]}` })]))),
            el("p", { class: "serif", style: "font-size:2.2rem; margin-top:8px;", text: `${score}점` }),
            el("p", { class: "muted", text: score >= 85 ? "획수·음양·오행이 고루 맞는 아주 좋은 이름이에요!" : score >= 70 ? "좋은 기운이 많은 이름이에요. 부족한 부분은 사주로 채워요." : "아쉬운 격이 있지만, 이름은 불리는 대로 쌓여요. 아래 풀이를 참고해요." }),
          ]),
          el("div", { class: "panel" }, [
            el("p", { class: "eyebrow", text: "수리 4격 (원형이정 元亨利貞) — 획수로 보는 시기별 운" }),
            el("div", { class: "hj-gyeok" }, GYEOK.map(([nm, hj, when, txt], k) => el("div", { class: "hj-g l" + lk[k] }, [
              el("div", { class: "hj-g-top" }, [el("b", { text: `${nm} ${hj}(${["원", "형", "이", "정"][k]})` }), el("span", { class: "hj-num", text: `${vals[k]}수` }), el("span", { class: "hj-badge", text: ["흉", "반길", "길"][lk[k]] })]),
              el("span", { class: "tiny muted", text: when }),
              el("p", { text: txt[lk[k]] }),
            ]))),
            el("p", { class: "tiny muted", text: `계산: 성 ${surSt}획 · 이름 ${g.map((x) => x.st + "획").join(" + ")} (원획법 · 81수리 기준)` }),
          ]),
          el("div", { class: "panel" }, [
            el("p", { class: "eyebrow", text: "음양 (획수 홀짝) · 자원오행 (한자 뜻의 오행)" }),
            el("div", { class: "hj-yy", "data-nokr": "" }, P.map((x) => el("span", { class: x.st % 2 ? "yang" : "yin", text: `${x.ch} ${x.st % 2 ? "양 ●" : "음 ○"}` }))),
            el("p", { text: balanced ? "음과 양이 섞여 있어 균형이 좋아요. 성격과 운이 한쪽으로 치우치지 않아요." : `글자 획수가 모두 ${yin[0] ? "홀수(양)" : "짝수(음)"}라 한쪽으로 치우쳤어요. ${yin[0] ? "추진력은 좋지만 쉬어 가는 연습을" : "차분하지만 먼저 나서는 연습을"} 해 보세요.` }),
            el("p", { class: "tiny muted", text: `오행 흐름: ${P.map((x) => `${x.ch}(${EK[x.e]})`).join(" → ")} · ${flow.join(", ") || "-"}` }),
          ]),
        );
        if (S) out.append(sajuBlock(els));
        out.append(noticeBox("info", "성명학은 학파마다 획수 세는 법·해석이 조금씩 달라요. 원획법(부수를 본래 모양으로 세는 법) 기준의 재미용 풀이예요."));
      }
      drawPick();
    });
  }

  /* ---------- 3) 닉네임 추천 ---------- */
  /* ---------- 한자 이름 궁합 ---------- */
  function paintPair() {
    const out = el("div", { class: "section-gap" });
    const picked = { a: null, b: null };
    const btn = el("button", { class: "btn btn-primary btn-block", disabled: true, onclick: () => showPair() }, [el("span", { text: "두 사람 한자를 모두 골라 주세요" })]);
    const upd = () => { const ok = picked.a && picked.b; btn.disabled = !ok; btn.querySelector("span").textContent = ok ? "한자 이름 궁합 보기 💞" : "두 사람 한자를 모두 골라 주세요"; };
    host.append(el("p", { class: "tiny muted", style: "margin-bottom:8px;", text: "두 사람의 한자 이름으로 자원오행(한자 뜻의 오행)이 서로를 채워 주는지, 획수 운이 어울리는지 봐요." }));
    loadHanja().then((H) => {
      host.append(
        hanjaNamePicker(H, "나", state.sur + state.given, (P) => { picked.a = P; upd(); clear(out); }),
        hanjaNamePicker(H, "상대", "", (P) => { picked.b = P; upd(); clear(out); }),
        btn, out,
      );
    });
    function showPair() {
      clear(out);
      const A = nameInfo(picked.a), B = nameInfo(picked.b);
      const relOf = (x, y) => (GEN[x] === y ? "생" : GEN[y] === x ? "받" : x === y ? "같" : "극");
      const ra = relOf(A.main, B.main);
      const lackA = NK_EL.filter((e) => !A.els.includes(e)), lackB = NK_EL.filter((e) => !B.els.includes(e));
      const fillA = lackA.filter((e) => B.els.includes(e)), fillB = lackB.filter((e) => A.els.includes(e));
      const cover = new Set([...A.els, ...B.els]).size;
      const sumLk = lucky81(A.vals[3] + B.vals[3]);
      const yy = [...A.P, ...B.P].map((x) => x.st % 2), yang = yy.filter(Boolean).length, yin = yy.length - yang;
      let sc = 58 + (ra === "생" || ra === "받" ? 14 : ra === "같" ? 8 : -2) + (fillA.length + fillB.length) * 4 + (cover - 3) * 4 + sumLk * 5 + (Math.abs(yang - yin) <= 1 ? 5 : 0) + (A.lk[3] + B.lk[3]) * 2;
      sc = Math.max(42, Math.min(98, Math.round(sc)));
      const relTxt = { 생: `${A.name}의 대표 기운(${EK[A.main]})이 ${B.name}(${EK[B.main]})을 생해 주는 관계 — 내가 챙겨 주고 상대가 그 덕에 피어나는 사이예요.`, 받: `${B.name}의 대표 기운(${EK[B.main]})이 ${A.name}(${EK[A.main]})을 생해 주는 관계 — 상대가 나를 받쳐 주고, 나는 그 힘으로 앞으로 나아가요.`, 같: `둘 다 ${EK[A.main]} 기운 — 닮은 꼴이라 말이 잘 통하지만, 같은 약점도 공유해요.`, 극: `${EK[A.main]}와 ${EK[B.main]}가 부딪히는 관계 — 끌림은 강하지만 서로를 바꾸려 하면 지쳐요. 다름을 재미로 받아들이면 최고의 팀이 돼요.` }[ra];
      const nameCard = (X) => el("div", { class: "hp-name" }, [el("div", { class: "nm-hj", "data-nokr": "" }, X.P.map((x) => el("b", { class: `serif elem-${x.e}`, text: x.ch }))), el("b", { text: X.name }), el("small", { text: `${X.P.map((x) => EK[x.e].slice(0, 1)).join("")} · 정격 ${X.vals[3]}수` })]);
      out.append(
        el("div", { class: "panel panel-gold", style: "text-align:center;" }, [
          el("p", { class: "eyebrow", style: "justify-content:center;", text: "한자 이름 궁합" }),
          el("div", { class: "hp-two" }, [nameCard(A), el("span", { class: "hp-heart", text: "💞" }), nameCard(B)]),
          el("p", { class: "serif", style: "font-size:2.2rem; margin-top:6px;", text: `${sc}점` }),
          el("p", { class: "muted", text: sc >= 85 ? "이름끼리 서로를 채워 주는 아주 좋은 짝이에요!" : sc >= 70 ? "잘 어울리는 이름이에요. 부족한 부분은 마음으로 채워요." : "개성이 강한 조합 — 다름을 존중하면 오래 가요." }),
        ]),
        el("div", { class: "panel" }, [el("p", { class: "eyebrow", text: "대표 기운 · 이름 첫 글자" }), el("p", { text: relTxt })]),
        el("div", { class: "panel" }, [el("p", { class: "eyebrow", text: "서로 채워 주는 오행" }),
          el("p", { text: fillA.length ? `${B.name}의 이름이 ${A.name}에게 없는 ${fillA.map((e) => EK[e]).join("·")}을(를) 채워 줘요.` : `${A.name}에게 없는 기운을 ${B.name}의 이름이 채워 주진 않아요.` }),
          el("p", { text: fillB.length ? `${A.name}의 이름이 ${B.name}에게 없는 ${fillB.map((e) => EK[e]).join("·")}을(를) 채워 줘요.` : `${B.name}에게 없는 기운을 ${A.name}의 이름이 채워 주진 않아요.` }),
          el("p", { class: "tiny muted", text: `두 이름을 합치면 오행 ${cover}가지가 모여요 (5가지가 다 모이면 가장 고른 조합).` })]),
        el("div", { class: "panel" }, [el("p", { class: "eyebrow", text: "획수 · 음양" }),
          el("p", { text: `두 이름의 정격(총획)을 더하면 ${A.vals[3] + B.vals[3]}수 — ${["함께하면 고비가 있지만 넘을수록 단단해지는", "무난하게 함께 쌓아 가는", "함께할수록 복이 커지는"][sumLk]} 수예요.` }),
          el("p", { text: `양(홀수 획) ${yang}자 · 음(짝수 획) ${yin}자 — ${Math.abs(yang - yin) <= 1 ? "음양이 고르게 섞여 균형이 좋아요." : yang > yin ? "둘 다 추진력이 강해, 쉬어 가는 쪽을 정해 두면 좋아요." : "둘 다 차분해, 먼저 움직이는 쪽을 정해 두면 좋아요."}` })]),
        noticeBox("info", "이름만으로 본 재미용 궁합이에요. 사주 궁합은 ‘궁합’ 메뉴에서 더 정확하게 볼 수 있어요."),
      );
      out.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  function paintNick() {
    if (!S) { host.append(noticeBox("info", "생년월일이 있으면 내 사주의 용신 소리로 닉네임을 골라 드려요."), el("button", { class: "btn btn-primary", onclick: () => navigate("/saju") }, [el("span", { text: "내 정보 입력하기" })])); return; }
    const y = S.yongsin[0], h = MOTHER[y];
    const shuffle = (arr, seed) => arr.map((x, i) => ({ x, k: ((i + 1) * 7919 + seed * 104729) % 1013 })).sort((p, q) => p.k - q.k).map((o) => o.x);
    const nickSeed = window.__nickSeed || 0;
    const ng = window.__nickG || (my && my.gender === "male" ? "male" : my && my.gender === "female" ? "female" : "any");
    let np = window.__nickP || "sns"; if (np === "en") np = "sns";
    const langs = window.__nickL || { ko: true, en: false };
    const mmdd = my && my.birthDate ? my.birthDate.slice(5).replace("-", "") : "";
    const EN_SUF = ["log", "diary", "studio", "tv", "lab", "notes", "daily", "film"];
    const deco = (n, i, lang) => {
      if (lang === "en") {
        if (np === "game") return n;
        if (np === "blog") return `${n.toLowerCase()}.${EN_SUF[(i + nickSeed) % EN_SUF.length]}`;
        const st = [(x) => x.toLowerCase(), (x) => `${x.toLowerCase()}_${mmdd}`, (x) => `the.${x.toLowerCase()}`, (x) => `${x.toLowerCase()}.zip`, (x) => `${x}${mmdd.slice(2)}`]; return st[(i + nickSeed) % st.length](n);
      }
      if (np === "blog") { const suf = BLOG_SUF[ng]; return n.replace(/(일상|로그|스냅)$/, "") + suf[(i + nickSeed) % suf.length]; }
      return n;
    };
    const both = langs.ko && langs.en, nY = both ? 3 : 6, nH = both ? 1 : 2;
    const make = (lang, off) => [...shuffle(nkList(np, ng, y, lang), nickSeed + off).slice(0, nY).map((n) => [n, y]), ...shuffle(nkList(np, ng, h, lang), nickSeed + off + 3).slice(0, nH).map((n) => [n, h])]
      .map(([n, e], i) => ({ raw: n, show: deco(n, i, lang), e, lang }));
    const list = [...(langs.ko ? make("ko", 0) : []), ...(langs.en ? make("en", 7) : [])];
    const seg = (opts, cur, on, cols) => el("div", { class: "rd-seg", style: `grid-template-columns: repeat(${cols}, 1fr); margin-bottom: var(--sp-3);` }, opts.map(([v, lb]) =>
      el("button", { type: "button", class: "rd-seg-btn" + (cur === v ? " on" : ""), onclick: () => on(v) }, [el("span", { text: lb })])));
    host.append(el("div", { class: "nk-purpose" }, NK_PURPOSE.map(([v, lb]) => el("button", { type: "button", class: "nk-p" + (np === v ? " on" : ""), onclick: () => { window.__nickP = v; window.__nickSeed = 0; paint(); } }, [el("span", { text: lb })]))));
    host.append(seg([["female", "여자 느낌"], ["male", "남자 느낌"], ["any", "중성"]], ng, (v) => { window.__nickG = v; window.__nickSeed = 0; paint(); }, 3));
    host.append(el("div", { class: "nk-lang" }, [el("span", { class: "tiny muted", text: "언어" }), ...[["ko", "한글"], ["en", "영문"]].map(([k, lb]) => el("button", { type: "button", role: "checkbox", "aria-checked": String(!!langs[k]), class: "nk-l" + (langs[k] ? " on" : ""), onclick: () => { const n2 = { ...langs, [k]: !langs[k] }; if (!n2.ko && !n2.en) return toast("한글·영문 중 하나는 골라 주세요"); window.__nickL = n2; window.__nickSeed = 0; paint(); } }, [el("span", { class: "nk-box", text: langs[k] ? "✓" : "" }), el("span", { text: lb })]))]));
    const sub = (n) => (n.lang === "en" ? `${n.raw[0]} 소리 · ${EK[n.e].slice(0, 1)} · 복사` : `${nameElems(n.raw).map((x) => x.c).join("")} · ${EK[n.e].slice(0, 1)} · 복사`);
    host.append(el("div", { class: "panel panel-gold", style: "text-align:center;" }, [
      el("p", { class: "eyebrow", style: "justify-content:center;", text: `용신 ${EK[y]} · 행운 소리 ${[langs.ko ? SOUND_OF[y].join("") : "", langs.en ? EN_EL[y] : ""].filter(Boolean).join(" / ")}` }),
      el("p", { class: "muted", text: { game: "게임 캐릭터 이름 — 세고 강한 느낌으로, 용신 소리로 시작해요.", sns: "인스타·카톡·SNS 프로필·아이디용 — 짧고 부르기 쉬운 이름이에요." + (langs.en ? ` 영문은 생일(${mmdd.slice(0, 2)}월 ${mmdd.slice(2)}일)을 살짝 넣은 것도 있어요.` : ""), blog: "블로그·유튜브 채널명 — 이름 뒤에 로그·노트·TV 같은 꼬리를 붙였어요." }[np] + ` 언어마다 앞쪽은 용신, 마지막은 희신 소리예요.` }),
      el("div", { class: "nk-grid", "data-noterm": "" }, list.map((n) => el("button", { type: "button", class: "nk-chip", onclick: () => { copy(n.show); } }, [el("b", { text: n.show }), el("small", { text: sub(n) })]))),
      el("button", { type: "button", class: "btn btn-ghost btn-block nk-more", onclick: () => { window.__nickSeed = nickSeed + 1; paint(); } }, [el("span", { text: "🔄 다른 이름 추천 받기" })]),
    ]), el("div", { class: "panel" }, [
      el("p", { class: "eyebrow", text: "내가 직접 지은 닉네임 확인" }),
      (() => {
        const inp = el("input", { class: "input", maxlength: "8", placeholder: "닉네임 (한글)" });
        const res = el("p", { class: "tiny" });
        inp.addEventListener("input", () => {
          const A = nameElems(inp.value.trim());
          if (!A.length) { res.textContent = ""; return; }
          const hit = A.filter((x) => S.yongsin.includes(x.e) || x.e === h).length;
          res.textContent = hit ? `👍 용신·희신 소리가 ${hit}글자 들어 있어요. 좋은 닉네임!` : `🙂 용신 소리(${SOUND_OF[y].join("·")})가 없어요. 첫 글자만 바꿔 봐도 좋아요.`;
        });
        return el("div", { class: "section-gap" }, [inp, res]);
      })(),
    ]));
  }
  function copy(t) { try { navigator.clipboard.writeText(t); toast(`‘${t}’ 복사했어요`); } catch { toast(t); } }
  function pronElem(sy) { return CHO_EL[syl(sy).cho]; }
  function sajuBlock(els) {
    const y = S.yongsin[0];
    const has = els.filter((e) => S.yongsin.includes(e)).length;
    return el("div", { class: has ? "block tag-good" : "block tag-warn" }, [
      el("span", { class: "block-label", text: `이름 × 내 사주 (용신 ${EK[y]})` }),
      el("p", { text: has ? `이름 속 ${has}글자가 용신 기운을 품고 있어요. 이름이 불릴 때마다 부족한 기운을 채워 주는 셈이에요!` : `이름에 용신 ${EK[y]} 기운은 없어요. 닉네임·아이디에 ${SOUND_OF[y].join("·")} 소리를 넣어 보는 것도 재밌는 개운법이에요. (‘닉네임 추천’ 탭)` }),
    ]);
  }
  paint();
  return root;
}

/* 용도 × 느낌 × 용신 소리별 닉네임 (각 줄: 목 | 화 | 토 | 금 | 수 — 첫소리로 오행을 맞춤) */
const NK_SRC = {
  game: {
    male: "광기 광전사 귀신잡는자 검은사신 칼춤 킬러본능 갈가리 극독 광폭룡 검은학살 | 데스나이트 도륙자 뇌신 타락천사 늑대왕 대학살 독니 라그나로크 대마왕 투신 | 학살자 흑염룡 혈귀 악귀 야차 염라 혈풍 해골기사 외눈마왕 화염지옥 | 사신 저승사자 지옥견 처형인 참수자 철혈 질풍마검 심연 서슬 죽음의기사 | 무자비 멸망 파멸자 피의군주 마왕 블러드 폭군 버서커 망령 백골",
    female: "검은장미 광기의여왕 가시공주 칼날요정 크림슨 광란의마녀 그림자암살자 귀화 | 독사 독거미여왕 데스퀸 타락요정 늪의마녀 레드위치 독장미 뒤틀린인형 | 혈월 흑장미 얼음마녀 악녀 야차공주 혈나비 해골공주 흑요정 | 저주인형 사신공주 칠흑마녀 죽음의꽃 절망 천벌 서슬 심연의마녀 | 마녀사냥 블러디로즈 피의여왕 무덤지기 밤의여왕 파멸의꽃 멸망의꽃 붉은달",
    any: "검은그림자 광기 귀신 그림자 칼바람 극독 킬존 고스트 | 독안개 데드샷 늑대인간 타락 뒤틀림 노데스 다크매터 라스트맨 | 흑염 혈귀 야수 악몽 원혼 해골 외로운늑대 헬게이트 | 사신 저주 지옥불 심연 참극 절멸 천둥 서리늑대 | 무간지옥 멸망 파멸 피바람 마왕 망령 백귀 폭주",
  },
  sns: {
    male: "강이 건우로그 겨울바다 고요한하루 케이 곰돌남 강산스냅 기운찬 | 도담 단단 태양 테오 레오 다올 루카 도윤일상 | 이안 하랑 한결 우주 해랑 윤재 오늘의준 하온 | 시온 선우 준이 찬솔 서진로그 제이 지오 세찬 | 무진 바람 민재 범이 마루 백호 바다남 무드",
    female: "가윤 고은 가희 규리 가을 가비 코코 꽃별 | 나래 다솜 루나 라라 나린 노을 다래 로아 | 아라 윤슬 해나 하루 예솔 은솔 유리 아리 | 소라 세아 시엘 주아 새봄 소담 지니 새라 | 봄이 미소 보라 모모 빛나 보미 몽이 봄비",
    any: "가온 가람 구름 고요 그린 꼬미 겨울 기록 | 다온 도담 누리 단비 노을 라온 토리 달리 | 하늘 온새 이든 해솔 여름 오름 한별 이음 | 소담 지안 솔이 채움 새벽 시월 초록 숲속 | 모아 마루 별이 바다 마음 보담 파랑 민트",
  },
  engame: {
    male: "Grim Kraken Knight Ghost Kaiser Crusher Claw Gravedigger | Doom Reaper Titan Nightmare Raven Thunder Ravager Deathbringer | Hellhound Havoc Inferno Onyx Abyss Hydra Overlord Executioner | Slayer Savage Zero Shadow Sniper Juggernaut Chaosking Scythe | Menace Bloodfang Phantom Venom Warlord Feral Berserker Wraith",
    female: "Crimson Karma Kitsune Ghostqueen Cobra Glacia Cursed Grimrose | Nyx Raven Toxic Lethal Thorn Dahlia Doll Requiem | Hex Inferna Hydra Envy Eclipse Ivory Omen Harpy | Siren Scarlet Serpent Shade Stiletto Sable Zephyra Jinx | Venom Banshee Mystic Wicked Phantom Medusa Valkyrie Wraith",
    any: "Ghost Grim Chaos Kill Crow Cipher Glitch Kraken | Doom Rogue Reaper Toxin Nox Rift Talon Dread | Havoc Omen Abyss Hex Echo Inferno Onyx Exile | Shadow Zero Scythe Sin Specter Static Jinx Storm | Phantom Venom Wraith Blaze Mayhem Fury Vortex Malice",
  },
  en: {
    male: "Kai Kane Knox Kyle Glen Klaus Gale Grayson | Noah Dylan Ryan Theo Leo Ray Dean Thor | Ian Ethan Hunter Owen Ash Hugo Ace Eli | Sean Jay Zane Jin Shane Chase Sol Silas | Max Ben Felix Mason Wolf Blake Victor Miles",
    female: "Kaia Grace Kiki Gia Kate Gemma Kira Coco | Luna Nana Ruby Rose Tara Lily Daisy Nora | Ella Hana Iris Amy Hazel Ivy Aria Eve | Sia Jenny Sora Zoe Stella Jewel Chloe Sunny | Mia Bella Mimi Penny Bloom Fiona Mona Violet",
    any: "Kit Gray Kiwi Clover Cloud Gem Koa Comet | River Rain Dawn Lumi Nova Tofu Dot Lucky | Echo Haru Indigo Oak Arrow Halo Ocean Uni | Sky Sage Jun Star Zen Sol Shadow Cheese | Mint Pebble Mango Moon Breeze Wave Muffin Bean",
  },
};
const NK_EL = ["wood", "fire", "earth", "metal", "water"];
const NK_PURPOSE = [["game", "🎮 게임"], ["sns", "📸 SNS·인스타"], ["blog", "✍️ 블로그·유튜브"]];
const BLOG_SUF = { male: ["로그", "의 기록", "노트", "TV", "스튜디오", "연구소", "라이프", "일지"], female: ["로그", "의 하루", "다이어리", "노트", "의 기록", "TV", "살롱", "라이프"], any: ["로그", "의 기록", "노트", "다이어리", "TV", "스튜디오", "의 하루", "연구소"] };
function nkList(purpose, g, e, lang = "ko") {
  const key = lang === "en" ? (purpose === "game" ? "engame" : "en") : (purpose === "blog" ? "sns" : purpose);
  const src = NK_SRC[key][g];
  return src.split("|")[NK_EL.indexOf(e)].trim().split(/\s+/);
}
const EN_EL = { wood: "G·K", fire: "N·D·R·T·L", earth: "모음·H", metal: "S·J·Z·Ch", water: "M·B·P·F·V·W" };
const MOTHER = { wood: "water", fire: "wood", earth: "fire", metal: "earth", water: "metal" };

/* ======================= 사주 MBTI ======================= */
const MB = {
  ISTJ: ["원칙을 지키는 수호자", "약속·규칙·기록의 달인. 맡기면 끝까지 해내요."], ISFJ: ["다정한 살림꾼", "티 안 나게 다 챙겨 주는 따뜻한 사람."],
  INFJ: ["조용한 예언자", "사람 마음을 꿰뚫어 보는 깊은 통찰가."], INTJ: ["큰 그림 설계자", "10년 뒤를 미리 계산해 두는 전략가."],
  ISTP: ["말없는 해결사", "문제가 생기면 조용히 손으로 풀어내요."], ISFP: ["감성 아티스트", "자기만의 취향과 색이 확실한 사람."],
  INFP: ["꿈꾸는 시인", "마음속에 세계 하나를 품고 사는 이상주의자."], INTP: ["호기심 연구자", "왜?를 끝까지 파고드는 생각 부자."],
  ESTP: ["현장의 승부사", "일단 부딪혀 보고 기회를 잡는 행동파."], ESFP: ["무대 위의 분위기 메이커", "있는 곳마다 파티가 되는 사람."],
  ENFP: ["불꽃 아이디어 뱅크", "새로운 사람·생각에 늘 설레는 에너자이저."], ENTP: ["재치 있는 발명가", "토론과 새로운 판을 즐기는 아이디어꾼."],
  ESTJ: ["듬직한 현장 리더", "일정·사람·돈을 정확하게 굴리는 관리자."], ESFJ: ["모두의 반장", "사람들을 챙기고 모으는 따뜻한 리더."],
  ENFJ: ["다정한 선생님", "사람의 가능성을 믿고 이끌어 주는 멘토."], ENTJ: ["타고난 사령관", "목표를 정하면 판 전체를 움직이는 리더."],
};
function sajuMbti(profile) {
  const C = profile.elementCounts || {};
  const v = (k) => C[k] || 0;
  const P = profile.pillars;
  const ds = P.day.stemIdx, mb = P.month.branchIdx, db = P.day.branchIdx;
  const why = [];
  const ei = v("fire") + v("wood") - (v("water") + v("metal"));
  const E = ei > 0 || (ei === 0 && ds % 2 === 0);
  why.push(E ? `E — 화(火)·목(木)이 ${v("fire") + v("wood")}개로 밖으로 뻗는 기운이 강해요.` : `I — 수(水)·금(金)이 ${v("water") + v("metal")}개로 안으로 모으는 기운이 강해요.`);
  const sn = v("earth") + v("metal") - (v("water") + v("wood"));
  const S = sn > 0 || (sn === 0 && [1, 4, 7, 10, 8, 9].includes(mb));
  why.push(S ? "S — 토(土)·금(金)이 단단해 눈앞의 현실과 경험을 믿어요." : "N — 수(水)·목(木)이 흘러 가능성과 상상을 먼저 봐요.");
  const T = [0, 6, 7, 4, 8].includes(ds);
  why.push(T ? `T — 일간 ${"갑을병정무기경신임계"[ds]}(${"甲乙丙丁戊己庚辛壬癸"[ds]})는 기준과 논리로 판단하는 편이에요.` : `F — 일간 ${"갑을병정무기경신임계"[ds]}(${"甲乙丙丁戊己庚辛壬癸"[ds]})는 마음과 관계를 먼저 살피는 편이에요.`);
  const fixed = [0, 3, 6, 9, 1, 4, 7, 10];
  const J = [mb, db].filter((b) => fixed.includes(b)).length >= 1 && !([2, 5, 8, 11].includes(mb) && [2, 5, 8, 11].includes(db));
  why.push(J ? "J — 월지·일지에 자리를 지키는 지지(왕지·고지)가 있어 계획형이에요." : "P — 월지·일지가 움직이는 지지(인신사해, 역마 기운)라 즉흥형이에요.");
  const type = `${E ? "E" : "I"}${S ? "S" : "N"}${T ? "T" : "F"}${J ? "J" : "P"}`;
  return { type, why };
}
export function renderSajuMbti({ navigate }) {
  const root = el("div", {});
  head(root, navigate, "사주 MBTI", "내 사주는 무슨 유형일까?", "오행의 많고 적음, 일간, 월지·일지로 사주를 MBTI 네 글자로 바꿔 봐요. 실제 내 MBTI와 비교도!", "누구의 사주로 볼까?");
  const my = getMyBirth();
  const host = el("section", { class: "wrap section-gap" });
  root.append(host);
  if (!my) { host.append(noticeBox("info", "생년월일이 필요해요."), el("button", { class: "btn btn-primary", onclick: () => navigate("/saju") }, [el("span", { text: "내 정보 입력하고 시작" })])); return root; }
  const profile = computeSaju(my);
  const id = `sajumbti:${my.birthDate}_${my.birthTime || "-"}`, cost = costOf("sajumbti");
  function paint() {
    clear(host);
    if (!isUnlocked(id)) {
      host.append(lockBox("내 사주 MBTI 보기", "사주로 본 네 글자 · 글자마다 사주 근거 · 실제 MBTI와 일치도", cost, () => {
        const r = unlock(id, cost); if (r.ok) { toast(`사주 MBTI를 열었어요 · 코인 ${cost} 차감`); paint(); } else noCoinToast(cost);
      }));
      return;
    }
    const R = sajuMbti(profile);
    const M = MB[R.type];
    const cmp = el("div", {});
    host.append(
      el("div", { class: "panel panel-gold", style: "text-align:center;" }, [
        el("p", { class: "eyebrow", style: "justify-content:center;", text: "사주로 본 나의 유형" }),
        el("div", { class: "mb-type" }, [...R.type].map((c) => el("span", { text: c }))),
        el("p", { class: "serif", style: "font-size:1.3rem; margin-top:6px;", text: M[0] }),
        el("p", { class: "muted", text: M[1] }),
      ]),
      el("div", { class: "panel" }, [el("p", { class: "eyebrow", text: "왜 이 글자일까?" }), ...R.why.map((w) => el("p", { class: "mb-why", text: w }))]),
      el("div", { class: "panel" }, [
        el("p", { class: "eyebrow", text: "실제 내 MBTI는?" }),
        el("div", { class: "mb-grid" }, Object.keys(MB).map((t) => el("button", { type: "button", class: "theme-chip", onclick: (e) => {
          host.querySelectorAll(".mb-grid .on").forEach((x) => x.classList.remove("on")); e.currentTarget.classList.add("on");
          const same = [...t].filter((c, i) => c === R.type[i]).length;
          clear(cmp);
          cmp.append(el("p", { class: "serif", style: "font-size:1.15rem; margin-top:10px;", text: `일치도 ${same}/4 ${["🙃", "🤔", "🙂", "😮", "🎯"][same]}` }),
            el("p", { class: "muted", text: same === 4 ? "사주와 MBTI가 완전히 같아요! 타고난 그대로 살고 있는 사람." : same >= 2 ? `${[...t].map((c, i) => (c === R.type[i] ? null : `${R.type[i]}→${c}`)).filter(Boolean).join(", ")} — 타고난 기질을 환경과 경험으로 다듬어 온 부분이에요.` : "타고난 기질과 지금의 내가 꽤 달라요. 그만큼 스스로 많이 바꿔 온 사람이에요." }));
        } }, [el("span", { text: t })]))),
        cmp,
      ]),
      noticeBox("info", "MBTI는 심리 검사, 사주는 동양 철학이라 기준이 달라요. 둘을 엮어 보는 재미용 콘텐츠예요."),
    );
  }
  paint();
  return root;
}

/* ======================= 공부운 ======================= */
const ST_SCORE = { 정인: 92, 편인: 84, 정관: 82, 식신: 78, 비견: 70, 편관: 66, 상관: 64, 정재: 60, 겁재: 58, 편재: 52 };
const ST_MONTH = {
  정인: "머리에 쏙쏙 들어오는 달! 개념 공부·암기·인강 몰아 듣기에 최고예요.", 편인: "직감과 응용력이 살아나요. 어려운 문제·새 과목 시작에 좋아요.",
  정관: "시험·자격·합격 기운이 강해요. 시험 일정이 있다면 이달에 맞추세요.", 식신: "이해한 걸 술술 풀어내는 달. 문제 풀이·실기·서술형에 강해요.",
  비견: "스터디·친구와 함께할 때 효율이 올라요. 서로 체크해 주세요.", 편관: "압박이 크지만 그만큼 집중력도 올라가요. 마감 효과를 활용하세요.",
  상관: "말·발표·실기는 좋지만 암기는 새기 쉬워요. 소리 내어 설명하며 공부해요.", 정재: "꼼꼼하게 정리·복습하기 좋은 달. 오답 노트를 만드세요.",
  겁재: "경쟁심은 오르지만 산만해지기 쉬워요. 휴대폰을 멀리!", 편재: "관심사가 많아져 흩어지기 쉬워요. 하루 목표를 딱 하나로.",
};
const STYLE = {
  인성: ["📖 이해·암기형", "책과 강의로 차분히 쌓을 때 실력이 붙어요. 개념을 완전히 이해해야 다음으로 넘어가는 타입."],
  식상: ["✍️ 실전·출력형", "문제를 풀고 남에게 설명할 때 머리에 남아요. 읽기만 하면 졸려요 — 손으로 쓰고 말로 풀어요."],
  관성: ["🗓️ 계획·규칙형", "시간표와 마감이 있어야 달려요. 하루 계획표·타이머 공부가 딱 맞아요."],
  재성: ["🎯 목표·보상형", "점수·자격증처럼 눈에 보이는 목표가 있을 때 불타요. 작은 보상을 걸어 두세요."],
  비겁: ["🤝 경쟁·스터디형", "혼자보다 함께, 라이벌이 있을 때 실력이 올라요. 스터디·인증 챌린지 추천."],
};
const EL_STUDY = {
  wood: ["아침형", "아침 6~9시 집중력이 최고. 새 단원은 아침에, 밤엔 가벼운 복습."], fire: ["몰입 단거리형", "25분 집중 + 5분 휴식(뽀모도로)이 딱. 낮 시간에 어려운 과목을."],
  earth: ["자리 고정형", "늘 같은 자리·같은 시간에 앉을수록 잘 돼요. 공부 루틴을 만들어요."], metal: ["반복 정리형", "기출 반복·오답 정리에 강해요. 같은 문제 3회독이 효과 최고."],
  water: ["밤 몰입형", "밤 9시 이후 깊이 파고들 때 머리가 맑아요. 잠은 꼭 7시간!"],
};
const GROUP_OF = (g) => (["정인", "편인"].includes(g) ? "인성" : ["식신", "상관"].includes(g) ? "식상" : ["정관", "편관"].includes(g) ? "관성" : ["정재", "편재"].includes(g) ? "재성" : "비겁");
const RES = { wood: "water", fire: "wood", earth: "fire", metal: "earth", water: "metal" };
const CTRLBY = { wood: "metal", fire: "water", earth: "wood", metal: "fire", water: "earth" };
const STUDY_COLOR = { wood: "초록 펜·민트 노트", fire: "빨강·분홍 형광펜", earth: "베이지·노랑 포스트잇", metal: "흰색·은색 문구", water: "남색·검정 펜" };
const STUDY_DIR = { wood: "동쪽", fire: "남쪽", earth: "가운데(벽을 등지고)", metal: "서쪽", water: "북쪽" };
export function renderStudyLuck({ navigate }) {
  const root = el("div", {});
  const now = new Date(), Y = now.getFullYear(), M = now.getMonth() + 1;
  head(root, navigate, "공부운", "공부·시험·자격증, 언제 잘 될까?", "사주의 인성(배움)·관성(시험)·식상(실력 발휘) 기운으로 나의 공부 스타일, 올해·12달 공부운, 이번 달 집중 잘 되는 날까지 알려 드려요.", "누구의 공부운을 볼까?");
  const my = getMyBirth();
  const host = el("section", { class: "wrap section-gap" });
  root.append(host);
  if (!my) { host.append(noticeBox("info", "생년월일이 필요해요."), el("button", { class: "btn btn-primary", onclick: () => navigate("/saju") }, [el("span", { text: "내 정보 입력하고 시작" })])); return root; }
  const profile = computeSaju(my);
  const S = analyzeStrength(profile);
  const dE = profile.dayMasterElem, ds = profile.pillars.day.stemIdx;
  const id = `studyluck:${my.birthDate}_${my.birthTime || "-"}:${Y}-${M}`, cost = costOf("studyluck");
  function paint() {
    clear(host);
    if (!isUnlocked(id)) {
      host.append(lockBox(`${M}월 공부운 열기`, "나의 공부 스타일 · 올해 공부운 · 12달 공부운 그래프 · 이번 달 시험·집중 좋은 날 · 공부 개운법", cost, () => {
        const r = unlock(id, cost); if (r.ok) { toast(`공부운을 열었어요 · 코인 ${cost} 차감`); paint(); } else noCoinToast(cost);
      }));
      return;
    }
    const C = profile.elementCounts || {};
    const grp = { 인성: C[RES[dE]] || 0, 식상: C[GEN[dE]] || 0, 관성: C[CTRLBY[dE]] || 0, 재성: C[CTRL[dE]] || 0, 비겁: (C[dE] || 0) - 1 };
    const top = Object.keys(grp).sort((a, b) => grp[b] - grp[a])[0];
    const yp = computeSaju({ calendarType: "solar", birthDate: `${Y}-07-01`, birthTime: "12:00", timeUnknown: true, gender: "male", timezone: "Asia/Seoul" });
    const yGod = tenGod(ds, yp.pillars.year.stemIdx);
    const months = [];
    for (let k = 0; k < 12; k++) {
      let yy = Y, mm = M + k; while (mm > 12) { mm -= 12; yy++; }
      const t = computeSaju({ calendarType: "solar", birthDate: `${yy}-${String(mm).padStart(2, "0")}-15`, birthTime: "12:00", timeUnknown: true, gender: "male", timezone: "Asia/Seoul" });
      const g = tenGod(ds, t.pillars.month.stemIdx);
      months.push({ yy, mm, g, sc: ST_SCORE[g] || 60 });
    }
    const thisM = months[0];
    const cal = dayCalendar(profile, Y, M);
    const good = cal.days.filter((d) => d.day >= now.getDate() && ["정인", "편인", "정관", "식신"].includes(d.stemGod))
      .map((d) => ({ ...d, sc: (ST_SCORE[d.stemGod] || 60) + (d.guiin ? 6 : 0) })).sort((a, b) => b.sc - a.sc).slice(0, 6).sort((a, b) => a.day - b.day);
    const best = months.slice().sort((a, b) => b.sc - a.sc).slice(0, 3);
    const y = S.yongsin[0];
    host.append(
      el("div", { class: "panel panel-gold", style: "text-align:center;" }, [
        el("p", { class: "eyebrow", style: "justify-content:center;", text: `${Y}년 ${M}월 공부운` }),
        el("p", { class: "serif", style: "font-size:2.4rem;", text: `${thisM.sc}점` }),
        el("p", { class: "muted", text: `이달 기운: ${thisM.g} — ${ST_MONTH[thisM.g]}` }),
      ]),
      el("div", { class: "ys-grid" }, [
        el("div", { class: "panel sl-card" }, [el("p", { class: "eyebrow", text: "나의 공부 스타일" }), el("b", { class: "sl-big", text: STYLE[top][0] }), el("p", { text: STYLE[top][1] })]),
        el("div", { class: "panel sl-card" }, [el("p", { class: "eyebrow", text: "나의 집중 리듬" }), el("b", { class: "sl-big", text: `⏰ ${EL_STUDY[dE][0]}` }), el("p", { text: EL_STUDY[dE][1] })]),
      ]),
      el("div", { class: "panel" }, [
        el("p", { class: "eyebrow", text: `${Y}년 올해의 공부운 — ${yGod}의 해` }),
        el("p", { text: ST_MONTH[yGod].replace("달", "해") }),
        el("p", { class: "tiny muted", text: `가장 공부가 잘 되는 달: ${best.map((b) => `${b.mm}월(${b.sc}점)`).join(" · ")}` }),
      ]),
      el("div", { class: "panel" }, [
        el("p", { class: "eyebrow", text: "앞으로 12달 공부운" }),
        el("div", { class: "sl-bars" }, months.map((mo, i) => el("div", { class: "sl-bar" + (i === 0 ? " now" : "") + (best.includes(mo) ? " best" : ""), title: `${mo.yy}.${mo.mm} ${mo.g} ${mo.sc}점` }, [
          el("span", { class: "sl-v", text: String(mo.sc) }),
          el("span", { class: "sl-fill", style: `height:${Math.round((mo.sc - 40) / 55 * 100)}%;` }),
          el("span", { class: "sl-m", text: `${mo.mm}월` }),
        ]))),
        el("p", { class: "tiny muted", text: "★ 진한 막대가 공부운이 가장 좋은 세 달이에요. 시험·자격증 일정을 이 달에 맞춰 보세요." }),
      ]),
      el("div", { class: "panel" }, [
        el("p", { class: "eyebrow", text: `이번 달 집중·시험 잘 되는 날 (${M}월 ${now.getDate()}일 이후)` }),
        good.length ? el("div", { class: "sl-days" }, good.map((d) => el("div", { class: "sl-day" }, [
          el("b", { text: `${M}/${d.day}` }), el("span", { text: `${"일월화수목금토"[d.dow]}요일` }), el("small", { text: `${d.stemGod}${d.guiin ? " · 귀인" : ""}` }),
        ]))) : el("p", { class: "muted", text: "이번 달 남은 날 중엔 특별히 튀는 날이 없어요. 꾸준함이 답인 달!" }),
        el("p", { class: "tiny muted", text: "정인·편인 날은 개념 공부, 정관 날은 시험·제출, 식신 날은 문제 풀이에 좋아요." }),
      ]),
      el("div", { class: "block tag-good" }, [
        el("span", { class: "block-label", text: `공부 개운법 — 용신 ${EK[y]}` }),
        el("ul", {}, [
          el("li", { text: `책상은 ${STUDY_DIR[y]}을 바라보게 두면 집중 기운이 커져요.` }),
          el("li", { text: `필기구·노트는 ${STUDY_COLOR[y]}로.` }),
          el("li", { text: top === "식상" ? "공부한 내용을 친구에게 설명하거나 녹음해 보세요." : top === "인성" ? "개념 노트를 먼저 만들고, 문제는 그다음에." : "하루 목표를 체크리스트로 쓰고 지우는 재미를 느껴 보세요." }),
          el("li", { text: "시험 전날엔 새로운 것보다 오답 노트만 — 그리고 일찍 자기!" }),
        ]),
      ]),
      noticeBox("info", "공부운이 낮은 달은 ‘안 되는 달’이 아니라 복습·정리에 집중할 달이에요. 결국 성적은 꾸준함이 만들어요!"),
    );
  }
  paint();
  return root;
}

/* ======================= 작명 (프리미엄) ======================= */
const KILL_N = { wood: "metal", fire: "water", earth: "wood", metal: "fire", water: "earth" };
const PURE_NAMES = {
  female: ["하늘", "나래", "다솜", "윤슬", "가람", "보라", "아라", "소담", "새봄", "한별", "다온", "라온", "이슬", "단비", "노을", "은솔", "해솔", "가을", "나린", "하람", "슬기", "아름", "예솔", "초롱", "빛나", "하나", "누리", "다인", "봄이", "꽃님", "새벽", "별님", "가온", "이음", "여름", "온새미로", "하예린", "나비", "고은", "미리내"],
  male: ["한결", "마루", "가람", "하람", "다온", "우람", "힘찬", "한솔", "바다", "버들", "슬찬", "미르", "누리", "온새", "이든", "해람", "찬솔", "다솔", "가온", "든솔", "한빛", "새힘", "늘찬", "보람", "아름솔", "한울", "나라", "샛별", "가람솔", "벼리"],
};
PURE_NAMES.any = [...new Set([...PURE_NAMES.female.slice(0, 20), ...PURE_NAMES.male.slice(0, 20)])];
const NAME_POOL = {
  female: ["서", "지", "하", "윤", "수", "아", "은", "민", "예", "채", "다", "유", "연", "소", "주", "현", "혜", "원", "나", "린", "율", "희", "정", "경", "진", "슬", "가", "담", "온", "해", "인", "영", "선", "세", "미", "보", "효", "나"],
  male: ["준", "도", "민", "서", "현", "우", "진", "호", "재", "건", "시", "윤", "지", "한", "승", "태", "원", "성", "훈", "혁", "찬", "율", "규", "범", "결", "강", "환", "동", "영", "석", "주", "하", "은", "유", "온", "인", "상", "형"],
};
NAME_POOL.any = [...new Set([...NAME_POOL.female.slice(0, 22), ...NAME_POOL.male.slice(0, 22)])];
const BAD_HUN = /죽|병|슬플|괴로|망할|미워|원망|근심|가난|도둑|죄|해칠|성낼|울|어두|거짓|늙|시체|귀신|흉|상할|아플|무덤|독|피|싸울|버릴|잃|끊|꺾|게으|어리석|천할|더러|부끄|겁|홀아비|과부|종|노예|요망|간사|탐할|미칠|벌레|뱀|쥐|개|돼지|오줌|똥|방귀|불알|좆|씹|음란|기생|첩/;
function nameHanjaFor(H, sy, limit = 4) {
  const cur = (H.pick[sy] || []).filter(([, hun]) => !BAD_HUN.test(hun)).map(([ch, hun, st, e]) => ({ ch, hun, st, e }));
  const seen = new Set(cur.map((x) => x.ch));
  const extra = [];
  for (const [ch, v] of Object.entries(H.all)) if (v[2] === sy && v[3] && !seen.has(ch) && !BAD_HUN.test(v[3])) extra.push({ ch, hun: v[3], st: v[0], e: v[1], ord: v[4] || 99999 });
  extra.sort((a, b) => a.ord - b.ord);
  return [...cur, ...extra].filter((x) => x.e).slice(0, limit);
}
export function renderNaming({ navigate }) {
  const root = el("div", {});
  head(root, navigate, "작명 · 개명", "사주에 맞춘 이름 짓기 · 바꾸기", "아기 이름 짓기도, 지금 이름 바꾸기(개명)도 — 사주(용신)에 맞춰 수리 4격·음양·자원오행·발음오행이 고루 맞는 한자 이름을 골라 드려요.", "누구의 사주로 지을까?");
  const my = getMyBirth();
  const host = el("section", { class: "wrap section-gap" });
  root.append(host);
  if (!my) { host.append(noticeBox("info", "이름을 받을 사람의 생년월일이 필요해요. (아기라면 출생일·예정일로)"), el("button", { class: "btn btn-primary", onclick: () => navigate("/saju") }, [el("span", { text: "생년월일 입력하기" })])); return root; }
  const profile = computeSaju(my);
  const S = analyzeStrength(profile);
  const id = `naming:${my.birthDate}_${my.birthTime || "-"}`, cost = costOf("naming");
  const st = { sur: (my.name || "").trim().slice(0, 1) || "", surPick: null, gender: my.gender === "male" ? "male" : my.gender === "female" ? "female" : "any", fixed: "", fixedPos: 0, seed: 0, mode: window.__nmMode || "baby", oldName: (my.name || "").trim(), similar: false };
  function paint() {
    clear(host);
    loadHanja().then((H) => build(H));
  }
  let runId = null;
  const savedHost = el("div", { class: "section-gap", style: "margin-top: var(--sp-5);" });
  const RUN_KEY = "hae.namingRuns.v1";
  const readRuns = () => { try { return JSON.parse(localStorage.getItem(RUN_KEY) || "[]"); } catch { return []; } };
  function saveRun(id, data) {
    const runs = readRuns(); const i = runs.findIndex((r) => r.id === id);
    if (i >= 0) { const seen = new Set(runs[i].names.map((n) => n.kr + n.hj)); runs[i].names.push(...data.names.filter((n) => !seen.has(n.kr + n.hj))); }
    else runs.unshift({ id, ...data });
    try { localStorage.setItem(RUN_KEY, JSON.stringify(runs.slice(0, 40))); } catch { /* ignore */ }
  }
  function paintSaved() {
    clear(savedHost);
    const runs = readRuns();
    if (!runs.length) return;
    const LB = { 1: "외자", 2: "두 글자", 3: "세 글자", pure: "순우리말" };
    savedHost.append(el("p", { class: "fg-group", style: "margin-top:0;", text: `💾 내가 받은 이름 · ${runs.length}번` }),
      ...runs.map((r) => el("details", { class: "panel nm-saved" }, [
        el("summary", {}, [el("b", { text: `${r.mode === "rename" ? "🔁 개명" : "👶 작명"} · ${r.sur}(${r.surCh}) · ${LB[r.len] || "두 글자"}${r.fixed ? ` · 돌림자 ${r.fixed}` : ""}` }), el("span", { class: "tiny muted", text: ` ${new Date(r.t).toLocaleDateString("ko-KR")} · ${r.names.length}개${r.who ? ` · ${r.who}` : ""}` })]),
        el("div", { class: "nm-saved-list" }, r.names.map((n) => el("button", { type: "button", class: "nm-saved-n", onclick: () => { try { navigator.clipboard.writeText(`${n.kr} ${n.hj}`.trim()); toast(`‘${n.kr}’ 복사했어요`); } catch { toast(n.kr); } } }, [el("b", { text: n.kr }), n.hj ? el("span", { class: "serif", "data-nokr": "", text: n.hj }) : null, el("small", { text: `${n.mean} · ${n.pct}점` })].filter(Boolean)))),
        el("button", { type: "button", class: "btn btn-quiet btn-sm", onclick: () => { try { localStorage.setItem(RUN_KEY, JSON.stringify(readRuns().filter((x) => x.id !== r.id))); } catch { /* ignore */ } paintSaved(); toast("기록을 지웠어요"); } }, [el("span", { text: "🗑 이 기록 지우기" })]),
      ])));
  }
  /* 개명 — 지금 이름 간단 운세 + 바꿀 이름과 비교표 (무료) */
  function renameCompare(H) {
    const y = S.yongsin[0], hee = MOTHER[y];
    const box = el("div", { class: "panel section-gap nm-cmp" });
    const res = el("div", {});
    const pick = { cur: null, nw: null };
    const scoreOf = (X) => {
      const I = nameInfo(X), given = I.P.slice(X.nSur);
      const yong = given.filter((x) => x.e === y).length, heeN = given.filter((x) => x.e === hee).length;
      const yy = I.P.map((x) => x.st % 2), mixed = yy.includes(0) && yy.includes(1);
      const pe = [...X.name].map((c) => CHO_EL[syl(c).cho]); let flow = 0; for (let i = 0; i < pe.length - 1; i++) flow += GEN[pe[i]] === pe[i + 1] || GEN[pe[i + 1]] === pe[i] ? 2 : pe[i] === pe[i + 1] ? 1 : 0;
      const sc = Math.max(40, Math.min(99, Math.round(52 + I.lk.reduce((a, b) => a + b * 5, 0) + yong * 8 + heeN * 4 + (mixed ? 5 : -3) + flow * 2 - (I.lk[3] === 0 ? 6 : 0))));
      return { I, yong, heeN, mixed, pe, flow, sc };
    };
    const FORT = ["어릴 때 시행착오가 많지만 단단해져요.", "무난하게 자라요.", "일찍 재능이 피어요."];
    function draw() {
      clear(res);
      if (!pick.cur) return;
      const A = scoreOf(pick.cur);
      res.append(el("div", { class: "nm-cur" }, [
        el("p", { class: "eyebrow", text: `지금 이름 ‘${pick.cur.name}’ 간단 운세` }),
        el("p", { class: "serif", style: "font-size:1.6rem;", text: `${A.sc}점` }),
        el("p", { class: "tiny", text: `총운(정격 ${A.I.vals[3]}수) — ${["굴곡이 있지만 위기마다 다시 일어서는", "크게 튀진 않아도 오래 편안한", "평생을 받쳐 주는 큰 복이 깃든"][A.I.lk[3]]} 이름이에요. 초년: ${FORT[A.I.lk[0]]}` }),
        el("p", { class: "tiny", text: A.yong + A.heeN ? `용신·희신 한자가 ${A.yong + A.heeN}자 들어 있어요.` : `용신(${EK[y]})·희신(${EK[hee]}) 한자가 없어요 — 개명으로 채울 수 있는 부분이에요.` }),
      ]));
      if (!pick.nw) { res.append(el("p", { class: "tiny muted", text: "아래에 바꾸고 싶은 이름을 넣으면 비교표가 나와요. (추천받은 이름을 넣어 봐도 좋아요)" })); return; }
      const B = scoreOf(pick.nw);
      const row = (k, a, b, better) => el("tr", {}, [el("th", { text: k }), el("td", { class: better === 1 ? "win" : "", text: a }), el("td", { class: better === 2 ? "win" : "", text: b })]);
      const cmp = (x, z) => (x > z ? 1 : z > x ? 2 : 0);
      res.append(el("table", { class: "nm-table" }, [
        el("thead", {}, [el("tr", {}, [el("th", { text: "" }), el("th", { text: pick.cur.name }), el("th", { text: pick.nw.name })])]),
        el("tbody", {}, [
          row("한자", pick.cur.P.map((x) => x.ch).join(""), pick.nw.P.map((x) => x.ch).join(""), 0),
          ...["원격(초년)", "형격(청년)", "이격(중년)", "정격(총운)"].map((g, j) => row(g, `${A.I.vals[j]}수 ${["흉", "반길", "길"][A.I.lk[j]]}`, `${B.I.vals[j]}수 ${["흉", "반길", "길"][B.I.lk[j]]}`, cmp(A.I.lk[j], B.I.lk[j]))),
          row("용신·희신 한자", `${A.yong + A.heeN}자`, `${B.yong + B.heeN}자`, cmp(A.yong * 2 + A.heeN, B.yong * 2 + B.heeN)),
          row("음양 조화", A.mixed ? "○" : "×", B.mixed ? "○" : "×", cmp(+A.mixed, +B.mixed)),
          row("소리 흐름", `${A.flow}`, `${B.flow}`, cmp(A.flow, B.flow)),
          row("총점", `${A.sc}`, `${B.sc}`, cmp(A.sc, B.sc)),
        ]),
      ]), el("p", { class: "tiny", style: "margin-top:6px;", text: B.sc > A.sc ? `‘${pick.nw.name}’이(가) ${B.sc - A.sc}점 높아요 — 특히 ${B.yong + B.heeN > A.yong + A.heeN ? "부족한 기운을 채워 주는 점" : B.I.lk[3] > A.I.lk[3] ? "총운 수리" : "전체 균형"}이 좋아져요.` : B.sc === A.sc ? "두 이름이 비슷해요. 부르기 편한 쪽을 고르세요." : `지금 이름이 ${A.sc - B.sc}점 더 높아요. 굳이 바꾸지 않아도 괜찮을 수 있어요.` }));
    }
    box.append(el("p", { class: "eyebrow", text: "개명 비교표 · 무료" }),
      hanjaNamePicker(H, "지금", st.oldName, (P) => { pick.cur = P; draw(); }),
      hanjaNamePicker(H, "바꿀", "", (P) => { pick.nw = P; draw(); }), res);
    return box;
  }
  function build(H) {
    clear(host);
    const y = S.yongsin[0], hee = MOTHER[y];
    const surI = el("input", { class: "input", maxlength: "2", placeholder: "성 (예: 김)", value: st.sur, "aria-label": "성" });
    const surOpts = el("div", { class: "hj-opts" });
    const paintSur = () => {
      clear(surOpts);
      const sy = surI.value.trim().slice(0, 1);
      if (!sy) return;
      const list = (H.pick[sy] || H.pick[DUEUM[sy]] || []).map(([ch, hun, s2, e]) => ({ ch, hun, st: s2, e }));
      if (!st.surPick || st.surPick.sy !== sy) st.surPick = list[0] ? { ...list[0], sy } : null;
      list.forEach((x) => surOpts.append(el("button", { type: "button", class: "hj-opt" + (st.surPick && st.surPick.ch === x.ch ? " on" : ""), onclick: () => { st.surPick = { ...x, sy }; paintSur(); } }, [el("b", { class: "serif", "data-nokr": "", text: x.ch }), el("span", { text: `${x.hun} ${sy}` }), el("small", { text: `${x.st}획` })])));
      surOpts.append(el("button", { type: "button", class: "hj-find" + (st.surPick && !list.some((x) => x.ch === st.surPick.ch) ? " on" : ""), onclick: () => openHanjaFinder(H, sy, (pk) => { st.surPick = { ...pk, e: pk.e || CHO_EL[syl(sy).cho], sy }; paintSur(); }) },
        st.surPick && !list.some((x) => x.ch === st.surPick.ch) ? [el("b", { class: "serif", "data-nokr": "", text: st.surPick.ch }), el("span", { text: `${st.surPick.hun || ""} ${sy}` }), el("small", { text: "다시 찾기" })] : [el("span", { class: "hj-find-ic", text: "🔍" }), el("span", { text: "한자 찾기" }), el("small", { text: `‘${sy}’ 자 전체` })]));
    };
    surI.addEventListener("input", paintSur);
    const seg = (opts, cur, on) => el("div", { class: "rd-seg", style: `grid-template-columns: repeat(${opts.length}, 1fr);` }, opts.map(([v, lb]) => el("button", { type: "button", class: "rd-seg-btn" + (cur === v ? " on" : ""), onclick: () => on(v) }, [el("span", { text: lb })])));
    const gHost = el("div", {}); const paintG = () => { clear(gHost); gHost.append(seg([["female", "여자 이름"], ["male", "남자 이름"], ["any", "중성 이름"]], st.gender, (v) => { st.gender = v; paintG(); })); }; paintG();
    const lHost = el("div", {}); const paintL = () => { clear(lHost); lHost.append(seg([["2", "두 글자"], ["1", "외자"], ["3", "세 글자"], ["pure", "순우리말"]], st.len || "2", (v) => { st.len = v; paintL(); fixWrap.hidden = v === "pure" || v === "1"; })); }; paintL();
    const fixI = el("input", { class: "input", maxlength: "1", placeholder: "돌림자 (선택)", value: st.fixed, "aria-label": "돌림자" });
    const posHost = el("div", {}); const paintPos = () => { clear(posHost); posHost.append(seg([[0, "앞 글자"], [1, "뒤 글자"]], st.fixedPos, (v) => { st.fixedPos = v; paintPos(); })); }; paintPos();
    const fixWrap = el("div", { hidden: st.len === "pure" || st.len === "1" }, [el("label", { class: "tiny muted", text: "꼭 넣을 글자 (돌림자 · 선택)" }), el("div", { class: "nm-fix" }, [fixI, posHost])]);
    const out = el("div", { class: "section-gap" });
    const oldI = el("input", { class: "input", maxlength: "4", placeholder: "지금 이름 (예: 하유숙)", value: st.oldName, "aria-label": "지금 이름" });
    oldI.addEventListener("input", () => { const v = oldI.value.trim(); if (v.length >= 2) { surI.value = v[0]; paintSur(); } });
    const simC = el("input", { type: "checkbox" }); simC.checked = st.similar;
    host.append(el("div", { class: "rd-seg nm-mode", style: "grid-template-columns: 1fr 1fr; margin-bottom: var(--sp-3);" }, [["baby", "👶 새 이름 짓기"], ["rename", "🔁 개명하기"]].map(([v, lb]) =>
      el("button", { type: "button", class: "rd-seg-btn" + (st.mode === v ? " on" : ""), onclick: () => { st.mode = v; window.__nmMode = v; build(H); } }, [el("span", { text: lb })]))));
    host.append(...[
      el("div", { class: "panel panel-gold", style: "text-align:center;" }, [
        el("p", { class: "eyebrow", style: "justify-content:center;", text: `${my.name || "이 사람"}의 용신 ${EK[y]} · 희신 ${EK[hee]}` }),
        el("p", { class: "muted tiny", text: `이름에 ${EK[y]}·${EK[hee]} 기운의 한자를 넣어 부족한 기운을 채우고, 획수로 평생 운(수리 4격)을 맞춰요.` }),
      ]),
      el("div", { class: "panel section-gap nm-form" }, [
        ...(st.mode === "rename" ? [el("label", { class: "tiny muted", text: "지금 이름" }), oldI, el("label", { class: "rd-check tiny" }, [simC, el("span", { text: "지금 이름과 소리가 비슷한 이름 위주로 (주변 사람이 부르기 편하게)" })])] : []),
        el("label", { class: "tiny muted", text: "성" }), surI, surOpts,
        el("label", { class: "tiny muted", text: "어떤 느낌의 이름?" }), gHost,
        el("label", { class: "tiny muted", text: "이름 형태" }), lHost,
        fixWrap,
        el("button", { class: "btn btn-primary btn-block", style: "margin-top: var(--sp-3);", onclick: () => { st.sur = surI.value.trim().slice(0, 1); st.fixed = fixI.value.trim().slice(0, 1); st.oldName = oldI.value.trim(); st.similar = simC.checked; st.seed = 0; gen({ charge: true }); } }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: `코인 ${cost}개로 ${st.mode === "rename" ? "바꿀 이름 추천받기" : "이름 받기"} (보유 ${getCoins()}개)` })]),
        el("p", { class: "tiny muted", style: "text-align:center;", text: "한 번 받을 때마다 코인이 들어요 · 받은 이름은 아래 ‘내가 받은 이름’에 저장돼 언제든 다시 볼 수 있어요 · 같은 조건에서 ‘다른 이름 더 보기’는 무료" }),
      ]),
      st.mode === "rename" ? renameCompare(H) : null,
      out, savedHost,
    ].filter(Boolean));
    paintSaved();
    paintSur();
    function gen(opt = {}) {
      clear(out);
      if (!st.sur || !(st.sur >= "가" && st.sur <= "힣")) { out.append(noticeBox("warn", "성을 한글로 적어 주세요.")); return; }
      if (!st.surPick) { out.append(noticeBox("warn", "성의 한자를 골라 주세요. 목록에 없으면 ‘한자 찾기’를 눌러요.")); return; }
      if (st.fixed && !(st.fixed >= "가" && st.fixed <= "힣")) { out.append(noticeBox("warn", "돌림자는 한글 한 글자로 적어 주세요.")); return; }
      const S0 = st.surPick, surE = S0.e || CHO_EL[syl(st.sur).cho];
      const pool = NAME_POOL[st.gender].filter((x) => x !== st.sur);
      const cand = pool.map((sy) => ({ sy, hs: nameHanjaFor(H, sy) })).filter((x) => x.hs.length);
      const fixedHs = st.fixed ? nameHanjaFor(H, st.fixed, 6) : null;
      if (st.fixed && !fixedHs.length) { out.append(noticeBox("warn", `‘${st.fixed}’ 자의 이름용 한자를 찾지 못했어요. 다른 글자로 해 볼까요?`)); return; }
      const rel = (a, b) => (GEN[a] === b || GEN[b] === a ? 2 : a === b ? 1 : 0);
      if (opt.charge && getCoins() < cost && !isUnlimitedW()) { noCoinToast(cost); out.append(noticeBox("warn", `이름 받기는 코인 ${cost}개가 필요해요. (보유 ${getCoins()}개)`)); return; }
      const renaming = st.mode === "rename";
      const oldGiven = renaming && st.oldName.length >= 2 ? [...st.oldName].slice(1).join("") : "";
      if (renaming && oldGiven) {
        const oe = nameElems(st.oldName), hits = oe.slice(1).filter((x) => x.e === y || x.e === hee).length;
        const fl = oe.slice(0, -1).map((x, i) => rel(x.e, oe[i + 1].e));
        out.append(el("div", { class: "panel", style: "margin-bottom: var(--sp-3);" }, [
          el("p", { class: "eyebrow", text: `지금 이름 ‘${st.oldName}’ 진단` }),
          el("p", { text: `소리 오행: ${oe.map((x) => `${x.ch}(${EK[x.e]})`).join(" → ")}` }),
          el("p", { text: hits ? `이름(성 뺀 부분)에 용신·희신 소리가 ${hits}글자 있어요.` : `이름에 용신(${EK[y]})·희신(${EK[hee]}) 소리가 없어요 — 개명하면 채울 수 있어요.` }),
          el("p", { class: "tiny muted", text: fl.every((v) => v >= 1) ? "소리 흐름은 막힘없이 이어져요. 한자를 바꾸는 것만으로도 충분할 수 있어요 (‘이름풀이 → 한자 이름’에서 지금 한자 점수를 확인해 보세요)." : "소리끼리 부딪히는 곳이 있어, 이름 글자를 바꾸면 흐름이 좋아질 수 있어요." }),
        ]));
      }
      const res = [];
      const L = st.len || "2";
      if (L === "pure") {
        const pool = PURE_NAMES[st.gender].filter((n) => !(renaming && n === oldGiven));
        for (const n of pool) {
          const sy = [...n], pe = [st.sur, ...sy].map((c) => CHO_EL[syl(c).cho]);
          let sound = 0; for (let i = 0; i < pe.length - 1; i++) sound += rel(pe[i], pe[i + 1]);
          const yongHit = pe.slice(1).filter((e) => e === y).length, heeHit = pe.slice(1).filter((e) => e === hee).length;
          let score = 56 + sound * 4 + yongHit * 10 + heeHit * 6 - (sy.length > 2 ? 2 : 0);
          if (renaming && st.similar && oldGiven) { if (syl(sy[0]).cho === syl(oldGiven[0]).cho) score += 6; }
          res.push({ pure: true, parts: sy.map((x) => ({ sy: x })), pe, score, yongHit, heeHit, sound });
        }
      } else {
        const n = L === "1" ? 1 : L === "3" ? 3 : 2;
        let pool = cand;
        if (n === 3) pool = cand.map((c) => ({ ...c, hs: c.hs.slice(0, 2), q: c.hs.filter((h) => h.e === y || h.e === hee).length })).sort((p1, p2) => p2.q - p1.q).slice(0, 14);
        const slot = (i) => (st.fixed && ((st.fixedPos === 0 && i === 0) || (st.fixedPos === 1 && i === n - 1)) && n > 1 ? [{ sy: st.fixed, hs: fixedHs }] : pool);
        const combos = [];
        const walk = (i, acc) => { if (i === n) { combos.push(acc); return; } for (const c of slot(i)) { if (acc.some((x) => x.sy === c.sy)) continue; walk(i + 1, [...acc, c]); } };
        walk(0, []);
        for (const C of combos) {
          if (renaming && C.map((x) => x.sy).join("") === oldGiven) continue;
          const hcombos = C.reduce((accs, c) => accs.flatMap((ac) => c.hs.map((h) => [...ac, h])), [[]]);
          for (const H of hcombos) {
            const g = H.map((h) => h.st), sum = g.reduce((x1, x2) => x1 + x2, 0), Ss = S0.st;
            const vals = n === 1 ? [g[0] + 1, Ss + g[0], Ss + 1, Ss + g[0]] : n === 2 ? [sum, Ss + g[0], Ss + g[1], Ss + sum] : [sum, Ss + g[0], Ss + g[1] + g[2], Ss + sum];
            const lk = vals.map(lucky81);
            if ((n === 1 ? [0, 1, 3] : [0, 1, 2, 3]).some((j) => lk[j] === 0)) continue; // 외자는 성+1(이격)이 성씨에 따라 늘 흉이 되기 쉬워 이격은 참고만
            const els = [surE, ...H.map((h) => h.e)];
            const yongHit = H.filter((h) => h.e === y).length, heeHit = H.filter((h) => h.e === hee).length;
            const yy = [Ss, ...g].map((v) => v % 2); const mixed = yy.includes(0) && yy.includes(1);
            const pe = [st.sur, ...C.map((c) => c.sy)].map((c) => CHO_EL[syl(c).cho]);
            let sound = 0, flow = 0, ji = 0;
            for (let i = 0; i < pe.length - 1; i++) { sound += rel(pe[i], pe[i + 1]); flow += rel(els[i], els[i + 1]); }
            for (let i = 0; i < C.length - 1; i++) if (syl(C[i].sy).jong && syl(C[i + 1].sy).cho === "ㅇ") ji -= 2;
            const norm = 2 / Math.max(1, pe.length - 1);
            let score = 50 + lk.reduce((s2, v) => s2 + v * 4, 0) + (yongHit * 9 + heeHit * 5) * (n === 3 ? 0.8 : n === 1 ? 1.6 : 1) + (mixed ? 5 : -3) + (sound * 2 + flow * 2) * norm + ji;
            const tot = Ss + sum; if (tot >= 20 && tot <= 40) score += 1.5;
            const jongs = C.filter((c) => syl(c.sy).jong).length; if (n >= 2 && jongs >= 1 && jongs < n) score += 1;
            const vow = new Set(C.map((c) => syl(c.sy).jung)); if (vow.size === n) score += 1;
            if (H[0].e === y) score += 1.2;
            if (H.some((h) => h.e === KILL_N[y])) score -= 3;
            if (renaming && st.similar && oldGiven) { if (syl(C[0].sy).cho === syl(oldGiven[0]).cho) score += 7; if (oldGiven[1] && C[1] && syl(C[1].sy).cho === syl(oldGiven[1]).cho) score += 5; }
            res.push({ parts: C.map((c, i) => ({ sy: c.sy, h: H[i] })), vals, lk, score, yongHit, heeHit, mixed, els, pe });
          }
        }
      }
      res.sort((x, z) => z.score - x.score);
      // 다양하게 — 같은 한글 이름은 한 번, 같은 첫 글자는 최대 2번
      const picked = [], seenN = new Set(), firstCnt = {};
      const skip = st.seed * 12;
      let k = 0;
      for (const r of res) {
        const nm = r.parts.map((x) => x.sy).join("");
        if (seenN.has(nm)) continue;
        const f = r.parts[0].sy;
        if ((firstCnt[f] || 0) >= (st.fixed && st.fixedPos === 0 ? 99 : 2)) continue;
        seenN.add(nm); firstCnt[f] = (firstCnt[f] || 0) + 1;
        if (k++ < skip) continue;
        picked.push(r); if (picked.length >= 12) break;
      }
      if (!picked.length) { out.append(noticeBox("info", st.seed ? "더 뽑을 이름이 없어요. 처음부터 다시 볼까요?" : "조건에 맞는 이름이 없어요. 이름 형태·돌림자·성 한자를 바꿔 볼까요?")); if (st.seed) out.append(el("button", { class: "btn btn-ghost btn-block", onclick: () => { st.seed = 0; gen(); } }, [el("span", { text: "처음 이름으로" })])); return; }
      if (opt.charge) {
        const r = spend(cost, { kind: "naming" });
        if (!r.ok) { clear(out); noCoinToast(cost); out.append(noticeBox("warn", `이름 받기는 코인 ${cost}개가 필요해요. (보유 ${getCoins()}개)`)); return; }
        toast(`코인 ${cost}개로 이름을 받았어요 · 저장됨`);
        runId = `run${Date.now()}`;
      }
      const LBL = { 1: "외자", 2: "두 글자", 3: "세 글자", pure: "순우리말" };
      if (runId) saveRun(runId, { t: Date.now(), who: my.name || "", mode: st.mode, len: L, gender: st.gender, sur: st.sur, surCh: S0.ch, fixed: st.fixed, oldName: renaming ? st.oldName : "",
        names: picked.map((r) => ({ kr: st.sur + r.parts.map((x) => x.sy).join(""), hj: r.pure ? "" : S0.ch + r.parts.map((x) => x.h.ch).join(""), mean: r.pure ? "순우리말" : r.parts.map((x) => `${x.h.hun} ${x.sy}`).join(" · "), pct: Math.max(62, Math.min(99, Math.round(58 + (r.score - 50) * 0.5))) })) }), paintSaved();
      out.append(el("p", { class: "eyebrow", text: `${LBL[L]} 추천 이름 ${picked.length}개 · ${st.seed + 1}번째 묶음` }));
      out.append(el("div", { class: "nm-list" }, picked.map((r, i) => {
        const pct = Math.max(62, Math.min(99, Math.round(58 + (r.score - 50) * 0.5)));
        const kr = st.sur + r.parts.map((x) => x.sy).join("");
        const why = r.pure
          ? [r.yongHit ? `용신 소리 ${r.yongHit}자` : null, r.heeHit ? `희신 소리 ${r.heeHit}자` : null, r.sound >= r.parts.length * 2 - 1 ? "소리 흐름 상생" : "부르기 편한 소리"].filter(Boolean)
          : [r.yongHit ? `용신 ${EK[y]} 한자 ${r.yongHit}자` : null, r.heeHit ? `희신 ${EK[hee]} ${r.heeHit}자` : null, r.lk.every((v) => v === 2) ? "4격 모두 길" : "4격 길·반길", r.mixed ? "음양 조화" : null].filter(Boolean);
        const hanjaStr = r.pure ? "" : S0.ch + r.parts.map((x) => x.h.ch).join("");
        return el("details", { class: "nm-card" + (i === 0 && !st.seed ? " best" : "") }, [
          el("summary", {}, [
            r.pure ? el("div", { class: "nm-hj nm-pure" }, [st.sur, ...r.parts.map((x) => x.sy)].map((c, j) => el("b", { class: `serif elem-${r.pe[j]}`, text: c })))
              : el("div", { class: "nm-hj", "data-nokr": "" }, [S0.ch, ...r.parts.map((x) => x.h.ch)].map((c, j) => el("b", { class: `serif elem-${r.els[j]}`, text: c }))),
            el("div", { class: "nm-txt" }, [el("b", { class: "nm-kr", text: kr }), el("span", { class: "tiny muted", text: r.pure ? "순우리말 이름 · 한자 없음" : r.parts.map((x) => `${x.h.hun} ${x.sy}`).join(" · ") }), el("span", { class: "nm-why", text: why.join(" · ") })]),
            el("span", { class: "nm-score" }, [el("b", { text: String(pct) }), el("small", { text: "점" })]),
          ]),
          el("div", { class: "nm-body" }, r.pure ? [
            el("p", { class: "tiny", text: `발음오행 ${[st.sur, ...r.parts.map((x) => x.sy)].map((c, j) => `${c}(${EK[r.pe[j]]})`).join(" → ")}` }),
            el("p", { class: "tiny muted", text: "순우리말 이름은 한자가 없어 수리 4격 대신 소리의 오행(발음오행)과 흐름으로 봐요. 가족관계등록부에 한글로만 올릴 수 있어요." }),
            el("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: () => { try { navigator.clipboard.writeText(kr); toast("이름을 복사했어요"); } catch { toast(kr); } } }, [el("span", { text: "📋 이름 복사" })]),
          ] : [
            el("div", { class: "nm-gy" }, ["원격", "형격", "이격", "정격"].map((g, j) => el("span", { class: "l" + r.lk[j] }, [el("b", { text: g }), el("span", { text: `${r.vals[j]}수 · ${["흉", "반길", "길"][r.lk[j]]}` })]))),
            el("p", { class: "tiny", text: `자원오행 ${[S0, ...r.parts.map((x) => x.h)].map((x, j) => `${x.ch}(${EK[r.els[j]]})`).join(" → ")}` }),
            el("p", { class: "tiny", text: `발음오행 ${[st.sur, ...r.parts.map((x) => x.sy)].map((c, j) => `${c}(${EK[r.pe[j]]})`).join(" → ")}` }),
            el("p", { class: "tiny", text: `획수 ${[S0.st, ...r.parts.map((x) => x.h.st)].join("·")} (원획) · 음양 ${[S0.st, ...r.parts.map((x) => x.h.st)].map((v) => (v % 2 ? "양" : "음")).join("")}` }),
            el("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: () => { try { navigator.clipboard.writeText(`${kr} ${hanjaStr}`); toast("이름을 복사했어요"); } catch { toast(hanjaStr); } } }, [el("span", { text: "📋 이름 복사" })]),
          ]),
        ]);
      })));
      out.append(el("button", { class: "btn btn-ghost btn-block", style: "margin-top: var(--sp-3);", onclick: () => { st.seed++; gen(); out.scrollIntoView({ behavior: "smooth", block: "start" }); } }, [el("span", { text: "🔄 다른 이름 더 보기 (같은 조건 · 무료)" })]));
      out.append(noticeBox("info", (renaming ? "개명은 가정법원 허가 절차가 필요해요. " : "") + "원획법·81수리·자원오행 기준의 추천이에요. 실제 신고에는 대법원 인명용 한자인지 꼭 한 번 더 확인해 주세요. 마음에 드는 이름은 ‘이름풀이 → 한자 이름’에서 자세히 볼 수 있어요."));
    }
  }
  paint();
  return root;
}
