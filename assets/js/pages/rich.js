import { el, clear, toast } from "../utils/dom.js";
import { pageHeader, backLink, noticeBox, loadDisclaimer } from "./shared.js";
import { getMyBirth } from "../state.js";
import { computeSaju } from "../saju/manse.js";
import { analyzeStrength } from "../saju/strength.js";
import { godTally } from "../saju/spouse.js";
import { tenGod, yearFlow, daeunTimeline, ageFromSolar } from "../saju/fortune.js";
import { computeZiwei } from "../saju/ziwei.js";
import { loadTarotData, getCard, cardFrontHTML } from "../tarot/cardArt.js";
import { isUnlocked, unlock, getCoins, costOf, noCoinToast } from "../wallet.js";
import { personSwitch } from "./people.js";
/* =========================================================
   부자 특집 (프리미엄) — 작성: HAE
   ① #/rich      나는 부자가 될까? — 사주 · 관상 · 타로 + 종합 부자 지수
   ② #/bizjob    창업 vs 취업 — 사주 · 자미두수 · 타로 + 종합 판정
   ③ #/moneytime 돈 버는 시기 · 모으는 시기 — 앞으로 10년 + 올해 12달 + 대운
   ========================================================= */

const GROUP = { 비견: "비겁", 겁재: "비겁", 식신: "식상", 상관: "식상", 정재: "재성", 편재: "재성", 정관: "관성", 편관: "관성", 정인: "인성", 편인: "인성" };
const JIJANG_MAIN = [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8];
const STEM_H = ["甲(갑)", "乙(을)", "丙(병)", "丁(정)", "戊(무)", "己(기)", "庚(경)", "辛(신)", "壬(임)", "癸(계)"];
const BR_H = ["子(자)", "丑(축)", "寅(인)", "卯(묘)", "辰(진)", "巳(사)", "午(오)", "未(미)", "申(신)", "酉(유)", "戌(술)", "亥(해)"];
const GOD_H = { 비견: "비견(比肩)", 겁재: "겁재(劫財)", 식신: "식신(食神)", 상관: "상관(傷官)", 정재: "정재(正財)", 편재: "편재(偏財)", 정관: "정관(正官)", 편관: "편관(偏官)", 정인: "정인(正印)", 편인: "편인(偏印)" };
const clamp = (n, a = 30, b = 97) => Math.max(a, Math.min(b, Math.round(n)));
const mod = (n, m) => ((n % m) + m) % m;

/* ---------- 공통: 프리미엄 잠금 화면 ---------- */
export function gated({ navigate, title, h, desc, costKey, build }) {
  loadDisclaimer();
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/special", "프리미엄")]));
  root.append(pageHeader(title, h, desc));
  root.append(personSwitch(navigate, { title: "누구로 볼까?" }));
  const host = el("section", { class: "wrap section-gap" });
  root.append(host);
  const my = getMyBirth();
  if (!my) { host.append(noticeBox("info", "생년월일이 필요해요."), el("button", { class: "btn btn-primary", onclick: () => navigate("/saju") }, [el("span", { text: "내 정보 입력하고 시작" })])); return root; }
  const sig = `${my.birthDate}_${my.timeUnknown ? "x" : my.birthTime || "-"}_${my.gender || ""}`;
  const id = `${costKey}:${sig}`;
  function paint() {
    clear(host);
    const cost = costOf(costKey);
    if (cost && !isUnlocked(id)) {
      const coins = getCoins();
      host.append(el("div", { class: "panel premium-lock" }, [
        el("span", { class: "lock-badge" }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: `코인 ${cost}개` })]),
        el("h3", { class: "serif", style: "margin-top:10px;", text: `${title} 열어 보기` }),
        el("p", { class: "muted", style: "font-size:var(--fs-sm);", text: desc }),
        el("button", { class: "btn btn-primary btn-block", style: "margin-top: var(--sp-4);", onclick: () => { const r = unlock(id, cost); if (r.ok) { toast(`${title}을(를) 열었어요 · 코인 ${cost} 차감`); paint(); } else noCoinToast(cost); } },
          [el("span", { text: coins >= cost ? `코인 ${cost}개로 열기 · 보유 ${coins}개` : "코인 받으러 가기" })]),
      ]));
      return;
    }
    const P = computeSaju(my);
    build(host, { my, P, S: analyzeStrength(P), T: godTally(P), sig, navigate });
  }
  paint();
  return root;
}

/* ---------- 작은 UI 조각 ---------- */
const card = (eyebrow, kids) => el("div", { class: "panel rc-card" }, [el("p", { class: "eyebrow", text: eyebrow }), ...kids.filter(Boolean)]);
const p = (t) => el("p", { class: "rc-p", text: t });
const meter = (label, v, sub) => el("div", { class: "rc-meter" }, [
  el("div", { class: "rc-meter-top" }, [el("b", { text: label }), el("span", { class: "rc-meter-v", text: `${v}점` })]),
  el("div", { class: "rc-bar" }, [el("i", { style: `width:${v}%` })]),
  sub ? el("small", { class: "muted", text: sub }) : null,
].filter(Boolean));
function tabs(list, onPick) {
  const host = el("div", { class: "rc-tabs", role: "tablist" });
  let cur = list[0][0];
  const paint = () => { clear(host); list.forEach(([id, lb]) => host.append(el("button", { type: "button", role: "tab", "data-noterm": "", "aria-selected": String(cur === id), class: "rc-tab" + (cur === id ? " on" : ""), onclick: () => { cur = id; paint(); onPick(id); } }, [el("span", { text: lb })]))); };
  paint();
  return host;
}
function hero(eyebrow, big, sub, score) {
  return el("div", { class: "panel panel-gold rc-hero" }, [
    el("p", { class: "eyebrow", text: eyebrow }),
    score != null ? el("div", { class: "rc-ring", style: `--v:${score}` }, [el("b", { text: String(score) }), el("small", { text: "점" })]) : null,
    el("p", { class: "serif rc-big", text: big }),
    sub ? el("p", { class: "muted", text: sub }) : null,
  ].filter(Boolean));
}

/* ---------- 타로: 사람+날짜로 정해지는 3장 (다시 열어도 같은 카드) ---------- */
function seeded(str) { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return () => { h ^= h << 13; h >>>= 0; h ^= h >> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; }; }
function draw3(seedStr) {
  const r = seeded(seedStr); const picks = [];
  while (picks.length < 3) { const i = Math.floor(r() * 78); if (!picks.some((x) => x.i === i)) picks.push({ i, rev: r() < 0.3 }); }
  return picks.map((x) => ({ c: getCard(x.i), rev: x.rev }));
}
const MAJOR_GOOD = { 0: 0, 1: 1, 2: 0, 3: 1, 4: 1, 5: 0, 6: 1, 7: 1, 8: 1, 9: 0, 10: 1, 11: 0, 12: -1, 13: -1, 14: 0, 15: -1, 16: -1, 17: 1, 18: -1, 19: 1, 20: 0, 21: 1 };
const cardVal = (x) => { const base = !x.c.suit || x.c.suit === "major" ? (MAJOR_GOOD[x.c.number] || 0) * 1.5 : x.c.suit === "pentacles" ? 1.2 : 0.8; return x.rev ? -Math.abs(base) * 0.8 : base; };
const cardName = (x) => `${x.c.name}${x.rev ? "(역)" : ""}`;
const dir = (x) => (x.rev ? x.c.reversed : x.c.upright) || {};
function tarotRow(cards, labels, texts) {
  return el("div", { class: "rc-tarot" }, cards.map((x, i) => el("div", { class: "rc-tcard" }, [
    el("p", { class: "rc-tpos", text: labels[i] }),
    el("div", { class: "rc-tface" + (x.rev ? " rev" : ""), html: cardFrontHTML(x.c) }),
    el("b", { text: cardName(x) }),
    el("p", { class: "rc-p", text: texts[i] }),
  ])));
}
const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

/* =========================================================
   ① 나는 부자가 될까?
   ========================================================= */
const RICH_TYPE = {
  salary: ["월급 쌓기형 부자", "정재(正財)가 중심 — 꾸준한 수입을 차곡차곡 쌓아 부자가 돼요. 자동 저축·적금·연금이 최고의 무기예요."],
  biz: ["사업형 부자", "편재(偏財)와 힘이 함께 — 판을 키우고 사람을 움직여 큰돈을 만들어요. 혼자보다 ‘시스템’을 만들 때 커져요."],
  talent: ["재능 수익형 부자", "식상(食傷)이 재성을 낳는 구조 — 내 재능·콘텐츠·기술이 그대로 돈이 돼요. 내 이름을 걸수록 수입이 늘어요."],
  pro: ["전문직·자격형 부자", "인성(印星)·관성(官星)이 받쳐 줌 — 공부·자격·직급이 쌓일수록 몸값이 올라가요."],
  invest: ["투자·한방형 부자", "편재가 강하고 기복이 커요 — 기회를 보는 눈이 있지만, 한 번에 다 거는 순간 위험해요. 나눠서 들어가는 규칙이 필수!"],
  team: ["동업·네트워크형 부자", "비겁(比劫)이 강해요 — 사람과 함께 벌 때 크지만, 돈 관계는 계약서로 선을 그어야 지켜져요."],
};
function sajuRich(P, S, T) {
  const g = T.group, e = T.each;
  const strong = /강|왕/.test(S.strength || "");
  let sc = 55 + Math.min(g.재성, 3) * 7 + Math.min(g.식상, 3) * 5 + (strong ? 6 : -2);
  if (g.재성 === 0) sc -= 10;
  if (g.재성 >= 4 && !strong) sc -= 8; // 재다신약(財多身弱) — 돈이 스쳐 감
  if (S.yongsin[0] === wealthElem(P)) sc += 6;
  const k = (e.편재 || 0) >= 2 && !strong ? "invest" : (e.편재 || 0) >= 1 && strong ? "biz" : g.식상 >= 2 && g.재성 >= 1 ? "talent" : g.비겁 >= 3 ? "team" : g.인성 + g.관성 >= 3 ? "pro" : "salary";
  const notes = [];
  notes.push(`재성(財星, 돈의 별) ${g.재성}개 · 식상(食傷, 돈을 만드는 힘) ${g.식상}개 · 사주 힘 ${S.strength || "보통"}`);
  if (g.재성 === 0) notes.push("재성이 겉으로 드러나지 않은 사주 — ‘돈 욕심’보다 ‘실력’이 먼저 쌓이고, 돈은 뒤따라와요. 대운에서 재성이 올 때 크게 열려요.");
  else if (g.재성 >= 4 && !strong) notes.push("돈은 많이 보이는데 내 힘이 약한 ‘재다신약(財多身弱)’ — 버는 것보다 지키는 힘(저축·계약·건강)을 먼저 키우면 부자가 돼요.");
  else if (strong) notes.push("내 힘이 강해서 돈을 ‘감당’할 수 있는 사주 — 큰돈이 들어와도 무너지지 않아요.");
  else notes.push("내 힘이 여린 편이라 무리한 확장보다, 안전한 수입원을 여러 개 만드는 게 맞아요.");
  return { score: clamp(sc), type: RICH_TYPE[k], notes };
}
function wealthElem(P) { const CT = { wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" }; return CT[P.dayMasterElem]; }

const FACE = [
  { k: "forehead", h: "이마 (초년 재물·부모 덕)", o: [["넓고 둥글게 시원해요", 9], ["보통이에요", 5], ["좁거나 각져요", 2]] },
  { k: "nose", h: "코 (재물궁 — 돈이 모이는 곳)", o: [["콧방울이 도톰하고 둥글어요", 12], ["콧대가 오뚝하고 곧아요", 9], ["작고 얇은 편이에요", 3], ["콧구멍이 정면에서 잘 보여요", 2]] },
  { k: "ear", h: "귓불 (복 주머니)", o: [["두툼하고 길어요", 10], ["보통이에요", 5], ["얇거나 거의 없어요", 2]] },
  { k: "mouth", h: "입 (말복·식복)", o: [["입꼬리가 올라가요", 9], ["입이 크고 입술이 도톰해요", 8], ["입꼬리가 내려가요", 2]] },
  { k: "chin", h: "턱 (말년 재물·지키는 힘)", o: [["둥글고 살집이 있어요", 10], ["각지고 단단해요", 8], ["뾰족하거나 짧아요", 3]] },
];
const FACE_LINE = {
  forehead: ["이마가 시원해 일찍부터 기회가 보이는 상", "", "이마는 평범 — 초년보다 중년 이후 재물이 커지는 상"],
  nose: ["콧방울이 도톰해 돈이 ‘고이는’ 코 — 재물궁이 좋아요", "콧대가 서서 스스로 돈을 버는 자수성가형 코", "코가 작아 큰돈보다 꾸준한 돈이 맞는 상", "콧구멍이 보이는 코는 돈이 잘 나가요 — 지갑 관리가 핵심!"],
  ear: ["귓불이 두툼한 복귀 — 사람 복·돈 복이 함께 와요", "", "귓불이 얇아 남의 말에 돈이 새기 쉬워요 — 보증·빌려주기 주의"],
  mouth: ["입꼬리가 올라간 상 — 말로 돈을 부르는 상", "입이 큰 상은 식복·사업운이 커요", "입꼬리가 내려가면 복이 새기 쉬워요 — 웃는 연습이 개운법!"],
  chin: ["턱이 둥근 상은 말년에 재물이 쌓여요", "각진 턱은 끝까지 지키는 힘 — 모은 돈을 안 잃어요", "턱이 짧으면 말년 대비를 일찍 시작하면 좋아요"],
};

export function renderRich({ navigate }) {
  return gated({ navigate, title: "나는 부자가 될까?", h: "사주 · 관상 · 타로로 보는 나의 부자 지수", desc: "사주의 재물 그릇, 얼굴의 재물궁, 카드가 말하는 돈의 흐름 — 세 가지로 보고 종합 부자 지수와 부자 유형을 알려 드려요.", costKey: "rich", build(host, { P, S, T, sig }) {
    const R = sajuRich(P, S, T);
    const face = {}, faceI = {}; let tarotV = null;
    const body = el("div", { class: "section-gap" });
    const total = el("div", {});
    function paintTotal() {
      clear(total);
      const fs = Object.keys(face).length === FACE.length ? clamp(35 + Object.values(face).reduce((a, b) => a + b, 0) * 1.25) : null;
      const parts = [["사주", R.score], ["관상", fs], ["타로", tarotV]].filter((x) => x[1] != null);
      const avg = Math.round(parts.reduce((a, x) => a + x[1], 0) / parts.length);
      total.append(card("종합 부자 지수", [
        el("div", { class: "rc-total" }, [el("b", { class: "serif", text: `${avg}점` }), el("span", { text: avg >= 80 ? "부자가 될 기운이 뚜렷해요 💰" : avg >= 65 ? "꾸준히 하면 부자 되는 사주예요" : "모으는 습관이 부를 만드는 사주예요" })]),
        ...[["사주", R.score], ["관상", fs], ["타로", tarotV]].map(([n, v]) => v == null ? p(`${n}: ${n === "관상" ? "관상 탭에서 5가지를 모두 고르면 반영돼요" : "타로 탭을 열면 반영돼요"}`) : meter(n, v)),
        p(`당신은 ‘${R.type[0]}’ — ${R.type[1].split(" — ")[1] || R.type[1]}`),
      ]));
    }
    function show(id) {
      clear(body);
      if (id === "saju") body.append(hero("사주로 본 재물 그릇", R.type[0], `일간 ${STEM_H[P.pillars.day.stemIdx]} · ${S.strength || ""}`, R.score),
        card("부자 유형", [el("b", { text: R.type[0] }), p(R.type[1])]),
        card("사주 근거", R.notes.map(p)),
        card("부자가 되는 습관", [p(`용신(用神) 기운인 ${["목(木)", "화(火)", "토(土)", "금(金)", "수(水)"][["wood", "fire", "earth", "metal", "water"].indexOf(S.yongsin[0])]}을 생활에 들이면 재물 흐름이 부드러워져요.`), p(R.type[0].includes("투자") ? "수익의 30%는 무조건 안전 자산으로 — ‘잃지 않는 것’이 이 사주의 부자 비결이에요." : "매달 같은 날 자동이체 — 이 사주는 ‘시스템’을 만들면 돈이 스스로 쌓여요.")]));
      if (id === "face") {
        body.append(p("거울을 보며 내 얼굴에 가까운 것을 골라 주세요. (관상의 재물 자리 5곳)"));
        FACE.forEach((f) => body.append(card(f.h, [el("div", { class: "rc-opts" }, f.o.map(([t, v], i) => el("button", { type: "button", class: "chip" + (faceI[f.k] === i ? " is-selected" : ""), onclick: () => { face[f.k] = v; faceI[f.k] = i; show("face"); } }, [el("span", { text: t })]))),
          faceI[f.k] != null && FACE_LINE[f.k][faceI[f.k]] ? p(FACE_LINE[f.k][faceI[f.k]]) : null])));
      }
      if (id === "tarot") {
        body.append(p("카드를 불러오는 중…"));
        loadTarotData().then(() => {
          const C = draw3(`rich:${sig}:${today()}`);
          tarotV = clamp(62 + C.reduce((a, x) => a + cardVal(x), 0) * 7);
          clear(body);
          body.append(hero("타로로 본 돈의 흐름", tarotV >= 75 ? "돈이 들어오는 흐름" : tarotV >= 60 ? "모으면 커지는 흐름" : "새는 곳부터 막을 흐름", "오늘 뽑힌 카드 3장 (오늘 하루는 같은 카드)", tarotV),
            tarotRow(C, ["지금 나의 돈 습관", "부를 막는 것", "부자가 되는 열쇠"], [dir(C[0]).essence || "", dir(C[1]).obstacle || "", dir(C[2]).action || ""]));
          paintTotal();
        });
      }
      paintTotal();
    }
    host.append(tabs([["saju", "☯️ 사주"], ["face", "🙂 관상"], ["tarot", "🃏 타로"]], show), body, total);
    show("saju");
    host.append(el("div", { class: "rc-links" }, [el("a", { href: "#/free/palm-rise", class: "btn btn-ghost btn-sm", text: "✋ 인생 떡상 손금 (무료)" }), el("a", { href: "#/free/palm-stock", class: "btn btn-ghost btn-sm", text: "✋ 주식 잘하는 손가락 (무료)" }), el("a", { href: "#/moneytime", class: "btn btn-ghost btn-sm", text: "📅 돈 버는 시기 보기" })]),
      noticeBox("info", "사주·관상·타로로 본 재미·참고용 지수예요. 진짜 부자는 습관이 만들어요 — 투자 결정은 꼭 스스로 따져 보세요."));
  } });
}

/* =========================================================
   ② 창업 vs 취업
   ========================================================= */
const BIZ_STAR = { 자미: 2, 칠살: 3, 파군: 3, 탐랑: 2, 무곡: 2, 태양: 1, 염정: 1 };
const JOB_STAR = { 천부: 2, 천상: 3, 천량: 3, 천동: 2, 태음: 2, 천기: 2, 거문: 1 };
const FORM = {
  biz: ["1인 창업·내 브랜드", "가게·온라인 쇼핑몰·내 이름을 건 서비스"],
  side: ["직장 + 사이드 프로젝트", "월급으로 안전판을 깔고, 부업을 키워 독립하는 길"],
  free: ["프리랜서·전문 계약직", "회사에 묶이지 않고 실력으로 일을 따는 길"],
  job: ["안정적인 조직(대기업·공기업·공무원)", "체계 안에서 직급과 전문성을 쌓는 길"],
};
function sajuBiz(T, S) {
  const g = T.group, e = T.each; const strong = /강|왕/.test(S.strength || "");
  const biz = g.비겁 * 8 + g.식상 * 9 + (e.편재 || 0) * 10 + (e.편관 || 0) * 6 + (strong ? 12 : 0);
  const job = (e.정관 || 0) * 11 + (e.정인 || 0) * 9 + (e.편인 || 0) * 5 + (e.정재 || 0) * 9 + (strong ? 0 : 12);
  const pct = clamp(50 + (biz - job) * 1.6, 8, 92);
  const why = [];
  if (g.식상) why.push(`식상(食傷) ${g.식상}개 — 내 아이디어·재능을 밖으로 꺼내는 힘 (창업 +)`);
  if (e.편재) why.push(`편재(偏財) ${e.편재}개 — 큰 판을 벌이는 사업가의 돈 감각 (창업 +)`);
  if (g.비겁) why.push(`비겁(比劫) ${g.비겁}개 — 독립심과 경쟁심 (창업 +, 단 동업은 계약서 필수)`);
  if (e.정관) why.push(`정관(正官) ${e.정관}개 — 조직·규칙 안에서 인정받는 힘 (취업 +)`);
  if (e.정인 || e.편인) why.push(`인성(印星) ${(e.정인 || 0) + (e.편인 || 0)}개 — 배움·자격·윗사람의 도움 (취업·전문직 +)`);
  if (e.정재) why.push(`정재(正財) ${e.정재}개 — 꾸준한 월급형 재물 (취업 +)`);
  why.push(`사주 힘 ${S.strength || "보통"} — ${strong ? "혼자 버틸 힘이 있어 창업 리스크를 감당해요" : "든든한 울타리가 있을 때 실력이 더 나와요"}`);
  return { pct, why };
}
function ziweiBiz(my) {
  let z; try { z = computeZiwei(my); } catch { return null; }
  const pal = (n) => z.palaces.find((x) => x.name === n) || { stars: [] };
  let b = 0, j = 0; const lines = [];
  [["명궁", 1], ["관록궁", 1.5], ["재백궁", 1]].forEach(([n, w]) => {
    const st = pal(n).stars.map((s) => s.name);
    st.forEach((s) => { b += (BIZ_STAR[s] || 0) * w; j += (JOB_STAR[s] || 0) * w; });
    const main = st.filter((s) => BIZ_STAR[s] || JOB_STAR[s]);
    lines.push(`${n}: ${main.length ? main.join("·") : "주성 없음(맞은편 궁의 별을 빌려 씀)"}${main.some((s) => BIZ_STAR[s]) ? " — 개척형 별" : main.some((s) => JOB_STAR[s]) ? " — 안정·참모형 별" : ""}`);
  });
  const lu = (z.sihua || []).find((x) => /록/.test(x.label));
  if (lu) lines.push(`화록(化祿, 돈이 붙는 별): ${lu.star} — ${BIZ_STAR[lu.star] ? "개척하는 일에서 돈이 붙어요" : "안정된 자리에서 돈이 붙어요"}`);
  const pct = clamp(50 + (b - j) * 4, 8, 92);
  return { pct, lines, timeUnknown: !!my.timeUnknown };
}

export function renderBizJob({ navigate }) {
  return gated({ navigate, title: "창업 vs 취업", h: "나에게 맞는 길은 창업일까, 취업일까?", desc: "사주의 십신, 자미두수의 명궁·관록궁·재백궁, 타로 카드 — 세 가지로 보고 종합해서 나에게 맞는 일하는 방식을 알려 드려요.", costKey: "bizjob", build(host, { my, S, T, sig }) {
    const A = sajuBiz(T, S), Z = ziweiBiz(my);
    let tarotPct = null;
    const body = el("div", { class: "section-gap" }), total = el("div", {});
    const verdict = (pct) => pct >= 62 ? "biz" : pct >= 50 ? "side" : pct >= 38 ? "free" : "job";
    const bar = (pct) => el("div", { class: "rc-vs" }, [el("span", { text: `창업 ${pct}%` }), el("div", { class: "rc-vs-bar" }, [el("i", { style: `width:${pct}%` })]), el("span", { text: `취업 ${100 - pct}%` })]);
    function paintTotal() {
      clear(total);
      const parts = [["사주", A.pct], ["자미두수", Z && Z.pct], ["타로", tarotPct]].filter((x) => x[1] != null);
      const avg = Math.round(parts.reduce((a, x) => a + x[1], 0) / parts.length);
      const F = FORM[verdict(avg)];
      total.append(card("종합 판정", [bar(avg), el("p", { class: "serif rc-big", text: F[0] }), p(F[1]),
        ...parts.map(([n, v]) => p(`${n}: 창업 ${v}% · 취업 ${100 - v}%`)), tarotPct == null ? p("타로 탭을 열면 종합에 반영돼요.") : null]));
    }
    function show(id) {
      clear(body);
      if (id === "saju") body.append(hero("사주로 본 일하는 방식", FORM[verdict(A.pct)][0], `창업 ${A.pct}% · 취업 ${100 - A.pct}%`), bar(A.pct), card("사주 근거", A.why.map(p)));
      if (id === "ziwei") {
        if (!Z) body.append(noticeBox("warn", "자미두수 명반을 만들지 못했어요."));
        else body.append(hero("자미두수로 본 일하는 방식", FORM[verdict(Z.pct)][0], `창업 ${Z.pct}% · 취업 ${100 - Z.pct}%`), bar(Z.pct), card("명반 근거", Z.lines.map(p)),
          Z.timeUnknown ? noticeBox("info", "태어난 시간을 모르면 자미두수 명궁 위치가 달라질 수 있어요. 시간을 알면 더 정확해요.") : null);
      }
      if (id === "tarot") {
        body.append(p("카드를 불러오는 중…"));
        loadTarotData().then(() => {
          const C = draw3(`bizjob:${sig}:${today()}`);
          const vA = cardVal(C[0]), vB = cardVal(C[1]);
          tarotPct = clamp(50 + (vA - vB) * 14, 10, 90);
          clear(body);
          body.append(hero("타로로 본 두 갈래 길", vA >= vB ? "창업 쪽 카드가 더 밝아요" : "취업 쪽 카드가 더 밝아요", "오늘 뽑힌 카드 3장 (오늘 하루는 같은 카드)"), bar(tarotPct),
            tarotRow(C, ["창업하면", "취업하면", "결정의 열쇠"], [dir(C[0]).positive || dir(C[0]).essence || "", dir(C[1]).positive || dir(C[1]).essence || "", dir(C[2]).action || ""]));
          paintTotal();
        });
      }
      paintTotal();
    }
    host.append(tabs([["saju", "☯️ 사주"], ["ziwei", "🌌 자미두수"], ["tarot", "🃏 타로"]], show), body, total);
    show("saju");
    host.append(el("div", { class: "rc-links" }, [el("a", { href: "#/moneytime", class: "btn btn-ghost btn-sm", text: "📅 돈 버는 시기 · 모으는 시기" }), el("a", { href: "#/rich", class: "btn btn-ghost btn-sm", text: "💰 나는 부자가 될까?" })]),
      noticeBox("info", "운세로 본 성향 참고예요. 실제 창업·이직은 자금·시장·경험을 꼭 함께 따져 보세요."));
  } });
}

/* =========================================================
   ③ 돈 버는 시기 · 모으는 시기
   ========================================================= */
const KIND = {
  earn: ["💰 버는 해", "재성(財星)이 들어와 수입·기회가 커지는 때 — 연봉 협상·부업·사업 확장에 좋아요."],
  make: ["🌱 벌 기회를 만드는 해", "식상(食傷)이 들어와 재능·활동이 돈으로 이어지는 씨앗을 뿌리는 때 — 새 프로젝트·포트폴리오에 좋아요."],
  save: ["🏦 모으기 좋은 해", "인성(印星)·관성(官星)이 들어와 안정·신용이 쌓이는 때 — 저축·자격증·내 집 마련 준비에 좋아요."],
  guard: ["🛡️ 지키는 해", "비겁(比劫)이 들어와 지출·경쟁이 늘어나는 때 — 보증·동업·충동 투자는 조심, 비상금을 지키세요."],
};
const MONTH_LB = { earn: "버는 달", make: "기회 만드는 달", save: "모으는 달", guard: "지키는 달" };
const kindOf = (g) => (g === "재성" ? "earn" : g === "식상" ? "make" : g === "인성" || g === "관성" ? "save" : "guard");
function monthGods(P, Y) {
  const d = P.pillars.day.stemIdx; const out = [];
  for (let M = 1; M <= 12; M++) {
    const order = mod(M - 2, 12), sajuY = M === 1 ? Y - 1 : Y, ys = mod(sajuY - 4, 10);
    const s = mod(ys * 2 + 2 + order, 10), b = mod(order + 2, 12);
    const gs = GROUP[tenGod(d, s)], gb = GROUP[tenGod(d, JIJANG_MAIN[b])];
    const k = gs === "재성" || gb === "재성" ? "earn" : gs === "식상" ? "make" : (gs === "인성" || gs === "관성") ? "save" : kindOf(gb);
    out.push({ M, gz: `${STEM_H[s]}${BR_H[b]}`, k, god: tenGod(d, s) });
  }
  return out;
}

export function renderMoneyTime({ navigate }) {
  return gated({ navigate, title: "돈 버는 시기 · 모으는 시기", h: "언제 벌고, 언제 모아야 할까?", desc: "앞으로 10년의 세운(歲運)과 올해 12달, 10년 단위 대운(大運)으로 돈이 들어오는 때와 모으기 좋은 때를 짚어 드려요.", costKey: "moneytime", build(host, { my, P }) {
    const now = new Date(), Y = now.getFullYear();
    const yf = yearFlow(P, Y, 10, Y).map((y) => {
      const kb = kindOf(GROUP[y.branchGod] || y.group), ks = kindOf(y.group);
      const k = ks === "earn" || kb === "earn" ? "earn" : ks;
      return { ...y, k };
    });
    const earnY = yf.filter((y) => y.k === "earn").map((y) => y.year), saveY = yf.filter((y) => y.k === "save").map((y) => y.year);
    host.append(hero("앞으로 10년의 돈 흐름", earnY.length ? `버는 해: ${earnY.slice(0, 3).join("·")}년` : "꾸준히 쌓는 10년", saveY.length ? `모으기 좋은 해: ${saveY.slice(0, 3).join("·")}년` : ""));
    host.append(card("10년 돈 달력", [el("div", { class: "rc-years" }, yf.map((y) => el("div", { class: `rc-y k-${y.k}` + (y.isCurrent ? " now" : "") }, [
      el("b", { text: `${y.year}` }), el("small", { text: `${y.hanja.replace(/(.)(.)/, (m, a, b) => `${a}${b}`)}` }), el("span", { text: KIND[y.k][0] }),
    ]))), el("div", { class: "rc-legend" }, Object.values(KIND).map(([t, d]) => p(`${t} — ${d}`)))]));
    // 올해 12달
    const mg = monthGods(P, Y);
    host.append(card(`${Y}년 12달 — 이달엔 벌까, 모을까?`, [el("div", { class: "rc-months" }, mg.map((m) => el("div", { class: `rc-m k-${m.k}` + (m.M === now.getMonth() + 1 ? " now" : "") }, [
      el("b", { text: `${m.M}월` }), el("span", { text: KIND[m.k][0].split(" ")[0] }), el("small", { text: MONTH_LB[m.k] }),
    ]))), p(`이번 달은 ‘${MONTH_LB[mg[now.getMonth()].k]}’ — ${KIND[mg[now.getMonth()].k][1].replace(/때 —/, "달 —")}`)]));
    // 대운
    let age = 0; try { age = ageFromSolar(P.solar, now); } catch { /* ignore */ }
    let dt = []; try { dt = daeunTimeline(P, age); } catch { /* ignore */ }
    const big = dt.filter((d) => (d.group === "재성" || d.group === "식상") && d.ageEnd >= age && d.ageStart <= 90);
    host.append(card("10년 단위 큰 흐름 (대운)", [
      el("div", { class: "rc-daeun" }, dt.slice(0, 8).map((d) => el("div", { class: `rc-d k-${kindOf(d.group)}` + (d.isCurrent ? " now" : "") }, [el("b", { text: `${d.ageStart}~${d.ageEnd}세` }), el("small", { text: d.hanja }), el("span", { text: KIND[kindOf(d.group)][0].split(" ").slice(1).join(" ") })]))),
      p(big.length ? `큰돈이 들어오는 10년: ${big.map((d) => `${d.ageStart}~${d.ageEnd}세`).join(", ")} — 이때 벌 수 있는 그릇(실력·자금)을 미리 준비해 두세요.` : "대운이 꾸준한 흐름이라, 한 방보다 ‘복리’로 커지는 사주예요."),
    ]));
    host.append(el("div", { class: "rc-links" }, [el("a", { href: "#/rich", class: "btn btn-ghost btn-sm", text: "💰 나는 부자가 될까?" }), el("a", { href: "#/bizjob", class: "btn btn-ghost btn-sm", text: "🧭 창업 vs 취업" })]),
      noticeBox("info", "사주의 흐름으로 본 참고 시기예요. 실제 재테크는 내 상황에 맞게 계획하세요."));
  } });
}
