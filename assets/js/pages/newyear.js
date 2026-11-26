import { el, clear, toast, seedFromString, mulberry32 } from "../utils/dom.js";
import { pageHeader, backLink, noticeBox, loadDisclaimer, openModal } from "./shared.js";
import { getMyBirth, getPeople, getResults, saveResult } from "../state.js";
import { personSwitch } from "./people.js";
import { computeSaju } from "../saju/manse.js";
import { yearFlow, tenGod } from "../saju/fortune.js";
import { STEM_H, STEM_KR, BRANCH_H, BRANCH_KR, stageOf, STAGE_INFO } from "../saju/wonguk.js";
import { monthScores } from "../saju/extras.js";
import { isUnlocked, unlock, getCoins, costOf, noCoinToast } from "../wallet.js";
import { loadTarotData, cardFrontHTML } from "../tarot/cardArt.js";
import { shareText } from "../utils/shareImage.js";
import { buildLoveBook } from "../saju/lovebook.js";
/* =========================================================
   🐑 2027 신년 특집 · 📅 이번 주 타로 · 📖 타로 카드 사전 (HAE)
   ========================================================= */

const NY = 2027; // 丁未(정미)년 · 붉은 양의 해
const BR_KR = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const BR_ANI = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];

/* 💬 카톡 · 문자로 결과 한 줄 공유 (링크 미리보기 카드가 함께 떠요) */
const SITE = "https://luminahae.github.io/haemyo/";
function shareRow(title, text, hash) {
  const url = SITE + (hash ? "#" + hash : "");
  const b = el("button", { type: "button", class: "btn btn-ghost btn-sm share-line", "data-nocapture": "" }, [el("span", { text: "💬 친구에게 공유하기" })]);
  b.addEventListener("click", async () => {
    const full = `${text}\n\n🐾 해묘 解猫에서 나도 보기 → ${url}`;
    if (navigator.share) { try { await navigator.share({ title, text: `${text}\n\n🐾 해묘 解猫에서 나도 보기`, url }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
    try { await navigator.clipboard.writeText(full); toast("공유 문구를 복사했어요 · 카톡에 붙여 넣어 주세요."); } catch { toast("복사하지 못했어요."); }
  });
  return el("div", { class: "share-row", "data-nocapture": "" }, [b]);
}

function head(root, navigate, eyebrow, title, desc, who) {
  loadDisclaimer();
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(pageHeader(eyebrow, title, desc));
  if (who) root.append(personSwitch(navigate, { title: who }));
}
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
    el("button", { class: "btn btn-primary btn-block", style: "margin-top: var(--sp-4);", onclick: onOpen }, [el("span", { text: coins >= cost ? `코인 ${cost}개로 열기 · 보유 ${coins}개` : "코인 받으러 가기" })]),
  ]);
}
function gate(id, cost, label, after) {
  const r = unlock(id, cost);
  if (r.ok) { if (r.reason !== "already") toast(`${label} · 코인 ${cost} 차감`); after(); } else noCoinToast(cost);
}
/** 고양이 카드 그림 (작게) — 역방향이면 뒤집어서 */
function cardPic(card, rev, size = "") {
  const p = el("span", { class: "nyt-pic" + (rev ? " rev" : "") + (size ? " " + size : "") });
  p.innerHTML = cardFrontHTML(card);
  return p;
}
/** 같은 사람 · 같은 기간이면 늘 같은 카드 */
function drawCards(seedStr, n, cards) {
  const rnd = mulberry32(seedFromString(seedStr));
  const idx = cards.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx.slice(0, n).map((i) => ({ card: cards[i], rev: rnd() < 0.3 }));
}
function cardModal(card, rev) {
  const u = card.upright || {}, r = card.reversed || {};
  const sec = (t, o, on) => el("div", { class: "td-sec" + (on ? " on" : "") }, [
    el("b", { text: t }),
    o.essence ? el("p", { text: o.essence }) : null,
    o.positive ? el("p", { class: "tiny" }, [el("span", { class: "td-k", text: "좋은 쪽 " }), document.createTextNode(o.positive)]) : null,
    o.obstacle ? el("p", { class: "tiny" }, [el("span", { class: "td-k", text: "걸림돌 " }), document.createTextNode(o.obstacle)]) : null,
    o.action ? el("p", { class: "tiny" }, [el("span", { class: "td-k", text: "이렇게 " }), document.createTextNode(o.action)]) : null,
  ].filter(Boolean));
  openModal([
    el("div", { class: "td-top" }, [cardPic(card, false, "lg"), el("div", {}, [
      el("p", { class: "tiny muted", text: card.nameEn || "" }),
      el("div", { class: "td-kw" }, (card.keywords || []).map((k) => el("span", { text: k }))),
      card.symbol ? el("p", { class: "tiny muted", style: "margin-top:6px;", text: `그림 속 상징 · ${card.symbol}` }) : null,
    ].filter(Boolean))]),
    sec("⬆ 정방향", u, rev === false), sec("⬇ 역방향", r, rev === true),
    card.reflect ? el("div", { class: "insight", text: card.reflect }) : null,
  ].filter(Boolean), { title: card.name });
}

/* -------------------- 🐑 2027 신년운세 -------------------- */
const NY_KEY = { 비겁: "독립 · 뚝심", 식상: "표현 · 재능", 재성: "돈 · 성과", 관성: "책임 · 인정", 인성: "배움 · 문서" };
const NY_FIELD = {
  비겁: { love: "내 주장이 세지는 해 — 연애는 '맞춰 주기'보다 동등한 파트너십이 핵심이에요.", money: "들어오는 만큼 나가기 쉬운 해. 공동 투자 · 보증 · 큰 빌려주기는 피하세요.", work: "독립 · 창업 · 팀을 이끄는 역할에 힘이 실려요. 동료와 경쟁도 생겨요.", health: "참고 버티는 습관이 무리로 이어지기 쉬워요. 근육 · 관절 피로 챙기기." },
  식상: { love: "매력과 표현력이 살아나 새 인연이 잘 생기는 해예요. 먼저 말 걸어도 좋아요.", money: "재능이 돈이 되는 해 — 부업 · 콘텐츠 · 손재주에 좋아요.", work: "기획 · 발표 · 창작이 빛나요. 다만 말실수와 윗사람과의 마찰만 조심.", health: "에너지를 많이 써서 소화 · 수면 리듬이 흐트러지기 쉬워요." },
  재성: { love: "현실적인 만남이 늘어요. 진지한 관계 · 결혼 이야기가 나오기 쉬운 해.", money: "돈 흐름이 커지는 해 — 수입도 지출도 굵직해요. 기록이 곧 재산.", work: "성과가 숫자로 보이는 해. 영업 · 사업 · 협상에 유리해요.", health: "바쁜 만큼 과로 주의. 끼니 거르지 않기가 올해의 보약." },
  관성: { love: "약속과 책임의 해. 연애가 진지해지고 결혼운이 들어오기 쉬워요.", money: "안정 수입 위주의 해 — 무리한 투자보다 꾸준한 저축이 이겨요.", work: "승진 · 자격 · 맡는 일이 늘어요. 평가받는 자리에 강한 해.", health: "스트레스 · 긴장성 두통 주의. 쉬는 날은 꼭 지키기." },
  인성: { love: "기대고 싶은 마음이 커지는 해. 어른 소개 · 편안한 인연이 잘 맞아요.", money: "문서 · 계약 · 집 문제의 해 — 큰돈은 서류를 꼼꼼히.", work: "공부 · 자격증 · 이직 준비에 최고의 해예요.", health: "생각이 많아 몸이 처지기 쉬워요. 가벼운 산책 · 스트레칭." },
};
function zodiacLine(yb) {
  const a = BR_ANI[yb];
  if (yb === 7) return `${a}띠 — 본명년(나의 해)이에요. 시작 · 변화가 많은 해라, 새 출발엔 좋고 건강검진은 꼭 챙겨요.`;
  if (yb === 1) return `${a}띠 — 정미년과 沖(충)이에요. 이사 · 이직 같은 변동이 생기기 쉬우니 큰 결정은 한 박자 천천히.`;
  if (yb === 6) return `${a}띠 — 未(미)와 合(합)이에요. 귀인 · 협력운이 좋아 사람 덕을 보는 해.`;
  if (yb === 11 || yb === 3) return `${a}띠 — 亥卯未(해묘미) 삼합으로 같은 편 기운이에요. 하는 일이 술술 풀리기 쉬워요.`;
  if (yb === 10) return `${a}띠 — 丑戌未(축술미) 刑(형)이에요. 말 · 서류 다툼만 조심하면 무난해요.`;
  if (yb === 0) return `${a}띠 — 未(미)와 원진이에요. 가까운 사이의 사소한 서운함을 쌓아 두지 마세요.`;
  return `${a}띠 — 정미년과 크게 부딪히는 게 없는 무난한 해예요.`;
}
export function renderNewYear({ navigate }) {
  const root = el("div", {});
  head(root, navigate, `${NY} 신년 특집`, `${NY} 丁未(정미)년, 나의 한 해`, "붉은 양의 해 — 사주로 보는 총운 · 12달 흐름 · 분야별 운 · 띠 운, 그리고 달마다 한 장씩 신년 타로 12장.", "누구의 신년운세를 볼까?");
  const my = getMyBirth();
  if (!my) return needBirth(root, navigate);
  const profile = computeSaju(my);
  const Y = yearFlow(profile, NY, 1, new Date().getFullYear())[0];
  const host = el("section", { class: "wrap section-gap" });
  root.append(host);
  const id = `newyear:${my.birthDate}:${my.birthTime || ""}:${NY}`, cost = costOf("newyear");
  function paint() {
    clear(host);
    // 무료 미리보기
    host.append(el("div", { class: "panel panel-gold ny-hero" }, [
      el("p", { class: "ny-eb", text: "🐑 2027 丁未(정미)년 · 붉은 양의 해" }),
      el("p", { class: "serif ny-key", text: NY_KEY[Y.group] }),
      el("p", { class: "ny-sub", text: `${my.name ? my.name + "님의 " : ""}올해 십성은 ${Y.tenGod} — ${Y.label}` }),
      el("p", { class: "ny-line", text: Y.line }),
    ]));
    if (!isUnlocked(id)) {
      host.append(lockBox("2027 신년운세 전체 열기", "12달 운세 그래프(좋은 달 · 조심할 달) · 연애 · 돈 · 일 · 건강 · 띠로 보는 정미년 · 달마다 한 장 신년 타로 12장", cost, () => gate(id, cost, "신년운세를 열었어요", paint)));
      return;
    }
    // 12달 흐름
    const ms = Array.from({ length: 12 }, (_, i) => { const a = monthScores(profile, NY, i + 1); return { m: i + 1, s: Math.round(a.reduce((x, y) => x + y.score, 0) / a.length) }; });
    const sorted = [...ms].sort((a, b) => b.s - a.s), best = sorted.slice(0, 3).map((x) => x.m), low = sorted.slice(-2).map((x) => x.m);
    const mx = Math.max(...ms.map((x) => x.s)), mn = Math.min(...ms.map((x) => x.s));
    host.append(el("div", { class: "panel ny-sec" }, [
      el("p", { class: "eyebrow", text: "12달 운세 흐름" }),
      el("div", { class: "ny-bars", role: "img", "aria-label": `좋은 달 ${best.join(", ")}월, 조심할 달 ${low.join(", ")}월` }, ms.map((x) => el("div", { class: "ny-bar" + (best.includes(x.m) ? " hi" : low.includes(x.m) ? " lo" : "") }, [
        el("span", { class: "ny-v", text: String(x.s) }),
        el("i", { style: `height:${18 + Math.round(((x.s - mn) / Math.max(1, mx - mn)) * 72)}%;` }),
        el("b", { text: `${x.m}월` }),
      ]))),
      el("p", { class: "ny-legend" }, [el("span", { class: "hi", text: `✨ 좋은 달 ${best.sort((a, b) => a - b).join(" · ")}월` }), el("span", { class: "lo", text: `🌧 조심할 달 ${low.sort((a, b) => a - b).join(" · ")}월` })]),
    ]));
    // 분야별
    const F = NY_FIELD[Y.group];
    host.append(el("div", { class: "ny-grid" }, [["💗 연애", F.love], ["🪙 돈", F.money], ["💼 일", F.work], ["🌿 건강", F.health]].map(([t, d]) => el("div", { class: "panel ny-f" }, [el("b", { text: t }), el("p", { text: d })]))));
    host.append(el("div", { class: "panel ny-sec" }, [
      el("p", { class: "eyebrow", text: "띠로 보는 정미년" }),
      el("p", { text: zodiacLine(profile.pillars.year.branchIdx) }),
      el("p", { class: "tiny muted", style: "margin-top:8px;", text: `올해 할 일 — ${Y.do}${Y.sinsal && Y.sinsal.length ? ` · 올해 신살 ${Y.sinsal.join(" · ")}` : ""}` }),
    ]));
    // 신년 타로 12장
    const tHost = el("div", { class: "panel ny-sec" }, [el("p", { class: "eyebrow", text: "🃏 신년 타로 — 달마다 한 장" }), el("p", { class: "tiny muted", text: "카드를 불러오는 중…" })]);
    host.append(tHost);
    loadTarotData().then(({ cards }) => {
      const picks = drawCards(`${my.birthDate}|${my.birthTime || ""}|${my.name || ""}|${NY}|newyear`, 12, cards);
      clear(tHost);
      tHost.append(el("p", { class: "eyebrow", text: "🃏 신년 타로 — 달마다 한 장" }), el("p", { class: "tiny muted", text: "카드를 누르면 자세한 뜻이 나와요. 같은 사람은 언제 봐도 같은 카드예요." }),
        el("div", { class: "nyt-list" }, picks.map((p, i) => {
          const o = p.rev ? p.card.reversed : p.card.upright;
          return el("button", { type: "button", class: "nyt-row", onclick: () => cardModal(p.card, p.rev) }, [
            el("span", { class: "nyt-m", text: `${i + 1}월` }),
            cardPic(p.card, p.rev),
            el("span", { class: "nyt-tx" }, [el("b", { text: `${p.card.name}${p.rev ? " · 역방향" : ""}` }), el("small", { text: (o && o.essence) || "" })]),
          ]);
        })));
    }).catch(() => { clear(tHost); tHost.append(el("p", { class: "muted", text: "타로 카드를 불러오지 못했어요. 새로고침해 주세요." })); });
    host.append(shareRow("2027 신년운세 · 해묘", `🐑 나의 2027 정미년 키워드: ${NY_KEY[Y.group]}\n✨ 좋은 달 ${best.join(" · ")}월 · 🌧 조심할 달 ${low.join(" · ")}월`, "/newyear"));
    host.append(noticeBox("info", "사주 · 타로로 본 참고용 풀이예요. 한 해를 정해 놓는 게 아니라, 흐름을 알고 준비하자는 뜻으로 봐 주세요."));
  }
  paint();
  return root;
}

/* -------------------- 📅 이번 주 타로 (무료) -------------------- */
const WD = ["월", "화", "수", "목", "금", "토", "일"];
export function renderWeekTarot({ navigate }) {
  const root = el("div", {});
  const now = new Date();
  const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
  const md = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
  head(root, navigate, `${md(mon)} ~ ${md(sun)}`, "이번 주 타로", "월요일부터 일요일까지 하루 한 장씩 — 한 주를 미리 훑어보고 준비해요. 무료예요.");
  const my = getMyBirth();
  let who = "guest"; try { who = (my && `${my.birthDate}|${my.birthTime || ""}|${my.name || ""}`) || localStorage.getItem("str.activeProfile.v1") || "guest"; } catch { /* ignore */ }
  const host = el("section", { class: "wrap section-gap" }, [el("p", { class: "muted", text: "카드를 섞는 중…" })]);
  root.append(host);
  loadTarotData().then(({ cards }) => {
    const picks = drawCards(`${who}|week|${mon.getFullYear()}-${mon.getMonth() + 1}-${mon.getDate()}`, 7, cards);
    const ti = (now.getDay() + 6) % 7;
    const up = picks.filter((p) => !p.rev).length;
    clear(host);
    host.append(
      el("div", { class: "panel panel-gold ny-hero" }, [
        el("p", { class: "ny-eb", text: "🗓 이번 주 한 줄" }),
        el("p", { class: "serif ny-key", text: up >= 5 ? "술술 풀리는 한 주" : up >= 3 ? "고르게 흘러가는 한 주" : "숨 고르며 가는 한 주" }),
        el("p", { class: "ny-sub", text: `정방향 ${up}장 · 역방향 ${7 - up}장 — ${picks[ti].card.name} 카드가 오늘을 맡았어요.` }),
      ]),
      el("div", { class: "nyt-list" }, picks.map((p, i) => {
        const o = p.rev ? p.card.reversed : p.card.upright;
        const d = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i);
        return el("button", { type: "button", class: "nyt-row" + (i === ti ? " today" : i < ti ? " past" : ""), onclick: () => cardModal(p.card, p.rev) }, [
          el("span", { class: "nyt-m" }, [el("b", { text: WD[i] }), el("small", { text: i === ti ? "오늘" : md(d) })]),
          cardPic(p.card, p.rev),
          el("span", { class: "nyt-tx" }, [el("b", { text: `${p.card.name}${p.rev ? " · 역방향" : ""}` }), el("small", { text: (o && o.action) || (o && o.essence) || "" })]),
        ]);
      })),
      el("p", { class: "tiny muted", style: "margin-top:10px;", text: "카드를 누르면 자세한 뜻이 나와요. 이번 주 안에는 언제 봐도 같은 카드예요." }),
    );
  }).catch(() => { clear(host); host.append(el("p", { class: "muted", text: "카드를 불러오지 못했어요. 새로고침해 주세요." })); });
  return root;
}

/* -------------------- 📖 타로 카드 사전 (무료) -------------------- */
const SUITS = [["all", "전체"], ["major", "메이저"], ["wands", "완드"], ["cups", "컵"], ["swords", "소드"], ["pentacles", "펜타클"]];
export function renderTarotDict({ navigate }) {
  const root = el("div", {});
  head(root, navigate, "타로 카드 사전", "고양이 타로 78장, 뜻 한눈에", "카드를 누르면 정방향 · 역방향 뜻과 그림 속 상징, 생각해 볼 질문이 나와요.");
  const host = el("section", { class: "wrap section-gap" }, [el("p", { class: "muted", text: "카드를 불러오는 중…" })]);
  root.append(host);
  loadTarotData().then(({ cards }) => {
    let suit = "all", q = "";
    const chips = el("div", { class: "ev-modes" });
    const grid = el("div", { class: "td-grid" });
    const search = el("input", { class: "input", type: "search", placeholder: "🔍 카드 이름 · 키워드로 찾기 (예: 연인, 시작)", "aria-label": "카드 찾기", oninput: () => { q = search.value.trim(); paint(); } });
    const paintChips = () => { clear(chips); SUITS.forEach(([k, lab]) => chips.append(el("button", { type: "button", class: "chip" + (k === suit ? " on" : ""), "aria-pressed": String(k === suit), onclick: () => { suit = k; paintChips(); paint(); } }, [el("span", { text: lab })]))); };
    const paint = () => {
      clear(grid);
      const list = cards.filter((c) => (suit === "all" || (suit === "major" ? !c.suit : c.suit === suit)) && (!q || `${c.name} ${c.nameEn || ""} ${(c.keywords || []).join(" ")}`.toLowerCase().includes(q.toLowerCase())));
      if (!list.length) { grid.append(el("p", { class: "muted", text: "맞는 카드가 없어요." })); return; }
      list.forEach((c) => grid.append(el("button", { type: "button", class: "td-card", onclick: () => cardModal(c, null), "aria-label": `${c.name} 뜻 보기` }, [cardPic(c, false), el("b", { text: c.name }), el("small", { text: (c.keywords || []).slice(0, 2).join(" · ") })])));
    };
    paintChips(); paint();
    clear(host); host.append(search, chips, grid);
  }).catch(() => { clear(host); host.append(el("p", { class: "muted", text: "카드를 불러오지 못했어요. 새로고침해 주세요." })); });
  return root;
}


/* ===================================================================
   📇 60일주 도감 · 👨‍👩‍👧 가족 사주 한눈에 · 🐾 반려동물 궁합 · 📒 타로 기록장 (HAE)
   =================================================================== */
const S_ELEM = ["wood", "wood", "fire", "fire", "earth", "earth", "metal", "metal", "water", "water"];
const B_ELEM = ["water", "earth", "wood", "wood", "earth", "fire", "fire", "earth", "metal", "metal", "earth", "water"];
const B_MAIN = [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8];
const EKR = { wood: "목(木)", fire: "화(火)", earth: "토(土)", metal: "금(金)", water: "수(水)" };
const EEM = { wood: "🌳", fire: "🔥", earth: "⛰️", metal: "⚔️", water: "🌊" };
const GEN = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
const CTL = { wood: "earth", fire: "metal", earth: "water", metal: "wood", water: "fire" };
const GRP = { 비견: "비겁", 겁재: "비겁", 식신: "식상", 상관: "식상", 편재: "재성", 정재: "재성", 편관: "관성", 정관: "관성", 편인: "인성", 정인: "인성" };
const STEM_IMG = [
  ["큰 나무", "곧게 뻗어 올라가는 리더 — 한번 정하면 밀고 나가는 뚝심이 있어요."],
  ["꽃 · 덩굴", "어디서든 뿌리내리는 유연한 생존력 — 부드럽지만 질겨요."],
  ["태양", "밝고 화끈한 분위기 메이커 — 숨기는 게 서툴고 정이 많아요."],
  ["촛불", "조용히 오래 타는 따뜻함 — 한 사람 · 한 가지에 깊게 집중해요."],
  ["큰 산", "듬직한 중심 — 쉽게 흔들리지 않고 사람들을 품어요."],
  ["기름진 밭", "섬세한 살림꾼 — 실속 있게 키우고 챙기는 데 강해요."],
  ["바위 · 쇠", "의리 있는 결단가 — 옳다고 믿으면 단칼에 정리해요."],
  ["보석", "빛나는 완벽주의 — 예민하고 감각이 뛰어나요."],
  ["큰 바다", "큰 그림을 그리는 자유인 — 머리가 빠르고 품이 넓어요."],
  ["비 · 이슬", "조용한 지혜 — 겉으론 순해도 속이 깊고 눈치가 빨라요."],
];
const BR_SEAT = [
  "밤의 물(쥐) — 머리 회전이 빠르고 속을 잘 안 보여요.", "겨울 땅(소) — 끈기 있고 차곡차곡 모으는 타입.", "새벽 숲(호랑이) — 시작하고 밀어붙이는 힘.", "봄 꽃밭(토끼) — 감성적이고 사람을 잘 사귀어요.",
  "물을 품은 땅(용) — 스케일이 크고 변화에 강해요.", "초여름 불(뱀) — 계산이 빠르고 속에 열정이 있어요.", "한낮의 불(말) — 솔직하고 빠르고 화끈해요.", "늦여름 땅(양) — 참을성 있고 은근한 고집.",
  "가을 쇠(원숭이) — 재주가 많고 실리를 잘 챙겨요.", "가을 보석(닭) — 정리정돈 · 깔끔함 · 날카로운 말.", "가을 끝 땅(개) — 의리와 책임감이 강해요.", "겨울 물(돼지) — 포용력 있고 여유로워요.",
];
const SPOUSE_SEAT = { 비겁: "배우자 자리에 나와 같은 기운 — 친구 같은 부부, 대신 고집 대결은 조심.", 식상: "배우자 자리에 내가 표현하는 기운 — 아끼는 마음을 잘 드러내는 사이.", 재성: "배우자 자리에 재물 기운 — 현실 감각 있는 배우자 · 살림 복.", 관성: "배우자 자리에 나를 다잡는 기운 — 서로 책임감 있게 지켜 주는 사이.", 인성: "배우자 자리에 나를 돕는 기운 — 엄마처럼 챙겨 주는 배우자 복." };
const GOEGANG = ["경진", "경술", "임진", "임술", "무술"], BAEKHO = ["갑진", "을미", "병술", "정축", "무진", "임술", "계축"];
function iljuInfo(si, bi) {
  const kr = STEM_KR[si] + BRANCH_KR[bi], st = stageOf(si, bi), g = GRP[tenGod(si, B_MAIN[bi])];
  const tags = []; if (GOEGANG.includes(kr)) tags.push("괴강"); if (BAEKHO.includes(kr)) tags.push("백호");
  return { kr, h: STEM_H[si] + BRANCH_H[bi], st, stInfo: STAGE_INFO[st] || {}, g, tags, se: S_ELEM[si], be: B_ELEM[bi] };
}
export function renderIlju({ navigate }) {
  const root = el("div", {});
  head(root, navigate, "60일주 도감", "나는 무슨 일주일까?", "태어난 날의 기둥(일주) 60가지 — 내 일주 성격 카드를 보고, 내 사람들은 어느 일주인지도 찾아봐요.");
  const my = getMyBirth();
  let mine = -1;
  const owners = {}; // 일주 번호 → 이름들
  const add = (b, name) => { try { const p = computeSaju(b); const d = p.pillars.day; const i = [...Array(60).keys()].find((k) => k % 10 === d.stemIdx && k % 12 === d.branchIdx); (owners[i] = owners[i] || []).push(name); return i; } catch { return -1; } };
  if (my) mine = add(my, "나");
  getPeople().forEach((p) => { if (p.input) add(p.input, p.name || "?"); });
  const host = el("section", { class: "wrap section-gap" });
  root.append(host);
  const detail = (i) => {
    const I = iljuInfo(i % 10, i % 12), S = STEM_IMG[i % 10];
    openModal([
      el("div", { class: "il-big" }, [el("span", { class: `il-h e-${I.se}`, "data-nokr": "", text: I.h }), el("div", {}, [el("b", { text: `${I.kr} 일주` }), el("p", { class: "tiny muted", text: `${EKR[I.se]} 위에 ${EKR[I.be]} · 12운성 ${I.st}(${I.stInfo.h || ""})` })])]),
      I.tags.length ? el("div", { class: "td-kw" }, I.tags.map((t) => el("span", { text: t === "괴강" ? "괴강 — 센 카리스마" : "백호 — 강한 추진력" }))) : null,
      el("div", { class: "td-sec" }, [el("b", { text: `${S[0]}의 기운` }), el("p", { text: S[1] })]),
      el("div", { class: "td-sec" }, [el("b", { text: "앉은 자리" }), el("p", { text: BR_SEAT[i % 12] })]),
      el("div", { class: "td-sec" }, [el("b", { text: `12운성 · ${I.st}` }), el("p", { text: `${I.stInfo.life || ""} — ${I.stInfo.key || ""}` })]),
      el("div", { class: "td-sec" }, [el("b", { text: "배우자 자리" }), el("p", { text: SPOUSE_SEAT[I.g] })]),
      owners[i] ? el("p", { class: "tiny", style: "margin-top:10px;", text: `이 일주인 사람: ${owners[i].join(", ")}` }) : null,
    ].filter(Boolean), { title: `${I.h}(${I.kr}) 일주` });
  };
  if (mine >= 0) {
    const I = iljuInfo(mine % 10, mine % 12);
    host.append(el("button", { type: "button", class: "panel panel-gold il-mine", onclick: () => detail(mine) }, [
      el("span", { class: `il-h e-${I.se}`, "data-nokr": "", text: I.h }),
      el("span", { class: "nyt-tx" }, [el("b", { text: `나는 ${I.kr} 일주` }), el("small", { text: `${STEM_IMG[mine % 10][0]} · ${I.stInfo.key || ""} — 눌러서 자세히` })]),
    ]));
    host.append(shareRow("나의 일주 · 해묘", `🌳 나는 ${I.h}(${I.kr}) 일주 — ${STEM_IMG[mine % 10][0]} · ${I.stInfo.key || ""}\n너는 60일주 중 뭐야?`, "/ilju"));
  } else host.append(noticeBox("info", "생년월일을 넣으면 내 일주가 표시돼요."));
  host.append(el("div", { class: "il-grid" }, [...Array(60).keys()].map((i) => {
    const I = iljuInfo(i % 10, i % 12);
    return el("button", { type: "button", "data-nokr": "", "data-noterm": "", class: `il-cell e-${I.se}` + (i === mine ? " me" : "") + (owners[i] ? " has" : ""), onclick: () => detail(i), "aria-label": `${I.kr} 일주` }, [
      el("b", { text: I.h }), el("small", { text: I.kr }), owners[i] ? el("i", { text: owners[i].length > 1 ? `${owners[i][0]} 외` : owners[i][0] }) : null,
    ].filter(Boolean));
  })));
  return root;
}

/* 👨‍👩‍👧 가족 사주 한눈에 */
export function renderFamily({ navigate }) {
  const root = el("div", {});
  head(root, navigate, "가족 사주 한눈에", "우리 가족, 기운이 어떻게 맞물릴까?", "나와 내 사람들의 일간(타고난 기운)을 한 장에 — 누가 나를 채워 주고, 누구와 부딪히는지 보여 드려요.");
  const my = getMyBirth();
  if (!my) return needBirth(root, navigate);
  const isFam = (r) => /엄마|아빠|부모|형제|자매|오빠|언니|누나|형|동생|자녀|아들|딸|배우자|남편|아내|가족|할머니|할아버지/.test(String(r || ""));
  const all = getPeople().filter((p) => p.input);
  const fam = all.filter((p) => isFam(p.relation));
  const list = (fam.length ? fam : all).slice(0, 8);
  const host = el("section", { class: "wrap section-gap" });
  root.append(host);
  if (!list.length) {
    host.append(noticeBox("info", "내 사람에 가족을 저장하면 여기서 한눈에 볼 수 있어요. (관계를 엄마 · 아빠 · 형제 · 자녀처럼 고르면 가족만 모아 보여요)"),
      el("button", { class: "btn btn-primary", onclick: () => navigate("/people") }, [el("span", { text: "내 사람에 가족 추가하기" })]));
    return root;
  }
  const me = computeSaju(my), mE = me.dayMasterElem;
  const ppl = list.map((p) => { let P = null; try { P = computeSaju(p.input); } catch { /* ignore */ } return P && { name: p.name || "?", rel: p.relation || "", P, e: P.dayMasterElem }; }).filter(Boolean);
  const relOf = (e) => e === mE ? ["same", "같은 기운 — 말이 잘 통하는 편"] : GEN[e] === mE ? ["give", "나를 살려 주는 사람 — 기댈 수 있는 사이"] : GEN[mE] === e ? ["take", "내가 챙겨 주는 사람 — 내 사랑을 먹고 커요"] : CTL[e] === mE ? ["press", "나를 다잡는 사람 — 잔소리가 약이 되는 사이"] : ["ctrl", "내가 다잡는 사람 — 내 말이 세게 들릴 수 있어요"];
  // 그림 (가운데 나, 둘레에 가족)
  const W = 320, C = 160, R = 112;
  const LC = { same: "#ffd38a", give: "#7be0a6", take: "#a9c8ff", press: "#ff8fa3", ctrl: "#d9b3ff" };
  let svg = `<svg viewBox="0 0 ${W} ${W}" class="fm-svg" role="img" aria-label="가족 기운 관계도">`;
  const pos = ppl.map((_, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / ppl.length; return [C + R * Math.cos(a), C + R * Math.sin(a)]; });
  ppl.forEach((p, i) => { const [x, y] = pos[i]; svg += `<line x1="${C}" y1="${C}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${LC[relOf(p.e)[0]]}" stroke-width="3" stroke-linecap="round" opacity=".85"/>`; });
  const node = (x, y, r, e, t1, t2) => { x = +x; y = +y; return `<circle cx="${x}" cy="${y}" r="${r}" class="fm-n e-${e}"/><text x="${x}" y="${(y - 2).toFixed(1)}" text-anchor="middle" class="fm-t1">${t1}</text><text x="${x}" y="${(y + 14).toFixed(1)}" text-anchor="middle" class="fm-t2">${t2}</text>`; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  ppl.forEach((p, i) => { const [x, y] = pos[i]; svg += node(x.toFixed(1), y.toFixed(1), 30, p.e, esc(p.name.slice(0, 4)), EKR[p.e]); });
  svg += node(C, C, 38, mE, "나", EKR[mE]) + "</svg>";
  const pic = el("div", { class: "fm-pic" }); pic.innerHTML = svg;
  // 가족 전체 오행
  const tot = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  [me, ...ppl.map((p) => p.P)].forEach((P) => Object.keys(tot).forEach((k) => { tot[k] += (P.elementCounts || {})[k] || 0; }));
  const sum = Object.values(tot).reduce((a, b) => a + b, 0) || 1;
  const order = Object.keys(tot).sort((a, b) => tot[b] - tot[a]);
  const myWeak = Object.keys(me.elementCounts || {}).sort((a, b) => (me.elementCounts[a] || 0) - (me.elementCounts[b] || 0))[0];
  const fillers = ppl.filter((p) => p.e === myWeak || GEN[p.e] === myWeak).map((p) => p.name);
  host.append(
    el("div", { class: "panel fm-card" }, [pic, el("div", { class: "fm-leg" }, [["give", "나를 살려 줌"], ["take", "내가 챙겨 줌"], ["same", "같은 기운"], ["press", "나를 다잡음"], ["ctrl", "내가 다잡음"]].map(([k, t]) => el("span", {}, [el("i", { style: `background:${LC[k]};` }), el("small", { text: t })])))]),
    el("div", { class: "panel ny-sec" }, [
      el("p", { class: "eyebrow", text: "우리 가족 오행" }),
      el("div", { class: "fm-bars" }, Object.keys(tot).map((k) => el("div", { class: "fm-b" }, [el("small", { text: `${EEM[k]} ${EKR[k]}` }), el("span", {}, [el("i", { class: `e-${k}`, style: `width:${Math.round((tot[k] / sum) * 100)}%;` })]), el("b", { text: `${Math.round((tot[k] / sum) * 100)}%` })]))),
      el("p", { class: "tiny", text: `가족 전체로는 ${EKR[order[0]]} 기운이 가장 많고 ${EKR[order[4]]} 기운이 가장 적어요. ${tot[order[4]] === 0 ? `${EKR[order[4]]}이 아예 없어서, 집에 그 색 · 물건을 두면 기운을 채워 준다고 봐요.` : ""}` }),
      el("p", { class: "tiny", text: fillers.length ? `내게 부족한 ${EKR[myWeak]}을 채워 주는 사람: ${fillers.join(", ")} — 힘들 때 이 사람 곁에 있으면 편해져요.` : `내게 부족한 ${EKR[myWeak]}을 채워 주는 사람은 아직 목록에 없어요.` }),
    ]),
    el("div", { class: "nyt-list" }, ppl.map((p) => { const [k, t] = relOf(p.e); return el("div", { class: "nyt-row fm-row" }, [el("span", { class: `il-h sm e-${p.e}`, text: EEM[p.e] }), el("span", { class: "nyt-tx" }, [el("b", { text: `${p.name}${p.rel ? ` · ${p.rel}` : ""}` }), el("small", { text: `${EKR[p.e]} — ${t}` })]), el("i", { class: "fm-dot", style: `background:${LC[k]};` })]); })),
  );
  return root;
}

/* 🐾 반려동물 궁합 (무료) — 생일 또는 데려온 날로 */
const PETS_KEY = "str.pets.v1";
const loadPets = () => { try { return JSON.parse(localStorage.getItem(PETS_KEY) || "[]"); } catch { return []; } };
const savePets = (l) => { try { localStorage.setItem(PETS_KEY, JSON.stringify(l.slice(0, 12))); } catch { /* ignore */ } };
const PET_TRAIT = {
  wood: "호기심 대장 — 새 장난감 · 새 산책길을 좋아하고, 자라는 속도가 빨라요.",
  fire: "애교 폭발 · 텐션 높은 아이 — 관심 받는 걸 좋아하고 감정 표현이 커요.",
  earth: "느긋한 집순이 · 집돌이 — 익숙한 자리와 루틴이 있으면 안정돼요.",
  metal: "깔끔하고 자기 기준이 확실해요 — 싫은 건 분명히 싫다고 해요.",
  water: "눈치 백단 · 섬세한 아이 — 보호자 기분을 귀신같이 알아채요.",
};
const PET_CARE = {
  wood: "산책 코스나 장난감을 자주 바꿔 주면 스트레스가 풀려요.", fire: "하루 한 번은 온전히 놀아 주는 시간 — 칭찬을 크게 해 주세요.", earth: "밥 · 잠 · 산책 시간을 일정하게 — 갑작스런 변화는 천천히.",
  metal: "억지로 안거나 만지기보다 스스로 다가올 때까지 기다려 주세요.", water: "조용한 쉼터를 만들어 주세요 — 큰 소리에 예민할 수 있어요.",
};
export function renderPet({ navigate }) {
  const root = el("div", {});
  head(root, navigate, "반려동물 궁합", "우리 아이와 나, 기운이 맞을까?", "강아지 · 고양이의 생일(모르면 데려온 날)로 보는 기질과 우리 사이 궁합 — 재미로 보는 무료 풀이예요.");
  const my = getMyBirth();
  if (!my) return needBirth(root, navigate);
  const me = computeSaju(my), mE = me.dayMasterElem;
  const host = el("section", { class: "wrap section-gap" });
  root.append(host);
  let kind = "cat";
  const name = el("input", { class: "input", maxlength: 12, placeholder: "아이 이름 (예: 콩이)", "aria-label": "반려동물 이름" });
  const date = el("input", { type: "date", class: "input nt-date", "aria-label": "생일 또는 데려온 날", max: new Date().toISOString().slice(0, 10) });
  const kinds = el("div", { class: "ev-modes" });
  const paintKinds = () => { clear(kinds); [["dog", "🐶 강아지"], ["cat", "🐱 고양이"], ["etc", "🐰 다른 친구"]].forEach(([k, t]) => kinds.append(el("button", { type: "button", class: "chip" + (k === kind ? " on" : ""), "aria-pressed": String(k === kind), onclick: () => { kind = k; paintKinds(); } }, [el("span", { text: t })]))); };
  paintKinds();
  const out = el("div", {});
  const listHost = el("div", { class: "nyt-list" });
  const show = (pet) => {
    let P; try { P = computeSaju({ birthDate: pet.date, timeUnknown: true, calendarType: "solar", gender: "female", timezone: "Asia/Seoul" }); } catch { toast("날짜를 확인해 주세요."); return; }
    const e = P.dayMasterElem;
    const [score, rel, line] = e === mE ? [84, "닮은꼴 단짝", "성격이 닮아서 말 안 해도 통해요. 둘 다 고집 부릴 땐 간식으로 화해!"]
      : GEN[mE] === e ? [88, "내가 키우는 사랑둥이", "내 손길로 쑥쑥 크는 사이 — 보호자의 사랑이 그대로 아이 힘이 돼요."]
      : GEN[e] === mE ? [94, "나를 치유하는 힐링 메이트", "아이가 내 기운을 채워 줘요 — 지친 날 곁에만 있어도 회복되는 사이."]
      : CTL[mE] === e ? [74, "훈육 담당 보호자", "내가 규칙을 잡아 주는 사이 — 혼낼 땐 짧게, 칭찬은 길게 해 주세요."]
      : [78, "집안의 진짜 상전", "아이가 나를 쥐락펴락 — 알면서도 져 주게 되는 사이예요 😹"];
    const ani = pet.kind === "dog" ? "🐶" : pet.kind === "cat" ? "🐱" : "🐰";
    clear(out);
    out.append(el("div", { class: "panel panel-gold ny-hero", style: "margin-top: var(--sp-4);" }, [
      el("p", { class: "ny-eb", text: `${ani} ${pet.name || "우리 아이"} × 나` }),
      el("p", { class: "serif ny-key", text: `${score}점 · ${rel}` }),
      el("p", { class: "ny-line", text: line }),
    ]), el("div", { class: "ny-grid" }, [
      el("div", { class: "panel ny-f" }, [el("b", { text: `${pet.name || "아이"}의 기질 · ${EKR[e]}` }), el("p", { text: PET_TRAIT[e] })]),
      el("div", { class: "panel ny-f" }, [el("b", { text: "이렇게 해 주면 좋아해요" }), el("p", { text: PET_CARE[e] })]),
    ]), shareRow("반려동물 궁합 · 해묘", `${ani} ${pet.name || "우리 아이"} × 나 = ${score}점 · ${rel}\n${line}`, "/pet"), el("p", { class: "tiny muted", style: "margin-top:8px;", text: "재미로 보는 풀이예요. 건강 문제는 꼭 수의사 선생님과 상담하세요." }));
  };
  const paintList = () => {
    clear(listHost);
    loadPets().forEach((p, i) => listHost.append(el("div", { class: "nyt-row fm-row" }, [
      el("span", { class: "il-h sm", text: p.kind === "dog" ? "🐶" : p.kind === "cat" ? "🐱" : "🐰" }),
      el("button", { type: "button", class: "nyt-tx pet-open", onclick: () => show(p) }, [el("b", { text: p.name || "이름 없음" }), el("small", { text: `${p.date} · 눌러서 궁합 보기` })]),
      el("button", { type: "button", class: "ev-del", onclick: () => { const l = loadPets(); l.splice(i, 1); savePets(l); paintList(); } }, [el("span", { text: "지우기" })]),
    ])));
  };
  const go = el("button", { type: "button", class: "btn btn-primary btn-sm" }, [el("span", { text: "🐾 궁합 보기" })]);
  go.addEventListener("click", () => {
    if (!date.value) { toast("생일이나 데려온 날을 골라 주세요."); return; }
    const pet = { name: name.value.trim(), kind, date: date.value };
    const l = loadPets().filter((p) => !(p.name === pet.name && p.date === pet.date)); l.unshift(pet); savePets(l); paintList();
    show(pet);
  });
  host.append(el("div", { class: "panel" }, [
    name, el("p", { class: "ev-lab", style: "margin-top:10px;", text: "어떤 친구예요?" }), kinds,
    el("label", { class: "hc-date" }, [el("small", { text: "생일 (모르면 데려온 날)" }), date]),
    el("div", { class: "nt-btns", style: "margin-top:12px;" }, [go]),
  ]), out, el("p", { class: "ev-lab", style: "margin-top:16px;", text: "저장한 아이들" }), listHost);
  paintList();
  return root;
}

/* 📒 타로 기록장 — 저장한 타로를 모아 보고 '맞았어요' 체크 → 내 타로 적중률 */
export function renderTarotLog({ navigate }) {
  const root = el("div", {});
  head(root, navigate, "타로 기록장", "내 타로, 얼마나 맞았을까?", "저장한 타로 결과가 여기 쌓여요. 시간이 지나 맞았는지 체크하면 내 타로 적중률이 보여요.");
  const host = el("section", { class: "wrap section-gap" });
  root.append(host);
  const paint = () => {
    clear(host);
    const list = getResults().filter((r) => r.type === "tarot" && r.reading && r.reading.items);
    const rated = list.filter((r) => r.hit != null);
    const pct = rated.length ? Math.round((rated.reduce((a, r) => a + (r.hit === 1 ? 1 : r.hit === 0.5 ? 0.5 : 0), 0) / rated.length) * 100) : null;
    host.append(el("div", { class: "panel panel-gold ny-hero" }, [
      el("p", { class: "ny-eb", text: "📒 내 타로 적중률" }),
      el("p", { class: "serif ny-key", text: pct == null ? "— %" : `${pct}%` }),
      el("p", { class: "ny-sub", text: `저장한 타로 ${list.length}개 · 체크한 것 ${rated.length}개` }),
    ]));
    if (!list.length) {
      host.append(noticeBox("info", "타로를 본 뒤 결과 화면에서 '결과 저장'을 누르면 여기에 쌓여요."), el("button", { class: "btn btn-primary", style: "margin-top:10px;", onclick: () => navigate("/tarot") }, [el("span", { text: "타로 보러 가기" })]));
      return;
    }
    host.append(el("div", { class: "nyt-list", style: "margin-top: var(--sp-3);" }, list.map((r) => {
      const it = r.reading.items[0] || {};
      const pic = el("span", { class: "nyt-pic" + (it.reversed ? " rev" : "") }); pic.innerHTML = cardFrontHTML({ number: it.cardNumber, name: it.cardName, art: it.art });
      const d = new Date(r.createdAt), days = Math.floor((Date.now() - r.createdAt) / 864e5);
      const btn = (v, t) => el("button", { type: "button", class: "chip" + (r.hit === v ? " on" : ""), onclick: () => { saveResult({ ...r, hit: r.hit === v ? null : v }); paint(); } }, [el("span", { text: t })]);
      return el("div", { class: "tl-row" }, [
        el("button", { type: "button", class: "tl-main", onclick: () => navigate("/result/" + r.id) }, [pic, el("span", { class: "nyt-tx" }, [
          el("b", { text: r.title || "타로" }),
          el("small", { text: `${d.getMonth() + 1}/${d.getDate()} · ${days ? `${days}일 전` : "오늘"} · ${r.reading.items.map((x) => `${x.cardName}${x.reversed ? "(역)" : ""}`).join(", ")}` }),
        ])]),
        el("div", { class: "tl-hit" }, [el("small", { text: "맞았나요?" }), btn(1, "⭕ 맞았어요"), btn(0.5, "🔺 반쯤"), btn(0, "❌ 아니었어요")]),
      ]);
    })));
  };
  paint();
  return root;
}


/* -------------------- 💌 연애 비록(秘錄) — 11장 인연 리포트 -------------------- */
const LB_FREE_CH = 1; // 첫 장은 무료 미리보기
export function renderLoveBook({ navigate }) {
  const root = el("div", { class: "lb" });
  head(root, navigate, "LOVE BOOK", "연애 비록(秘錄)", "내 사주(四柱)와 그 사람 사주로 쓴 11장짜리 인연 리포트예요. 지금 연애 날씨부터 속마음, 엇갈림, 인연이 드는 달까지 한 권으로 읽어요.");
  const my = getMyBirth();
  if (!my) return needBirth(root, navigate);
  const host = el("section", { class: "wrap" });
  root.append(host);
  const people = getPeople().filter((p) => p && p.input && p.input.birthDate);
  let pid = "";
  let openAll = false;

  const paint = () => {
    clear(host);
    const you = people.find((p) => p.id === pid);
    const youInput = you ? { ...you.input, name: you.name || you.input.name || "그 사람" } : null;
    let R;
    try { R = buildLoveBook(my, youInput, new Date()); } catch (e) { host.append(noticeBox("warn", "리포트를 만들지 못했어요. 생년월일을 다시 확인해 주세요.")); return; }
    const id = `lovebook:${my.birthDate}:${my.birthTime || ""}:${youInput ? youInput.birthDate + (youInput.birthTime || "") : "solo"}`;
    const cost = costOf("lovebook");
    const open = isUnlocked(id);

    // 그 사람 고르기
    host.append(el("div", { class: "panel lb-pick", "data-nocapture": "" }, [
      el("p", { class: "lb-pick-h", text: "💞 그 사람을 골라 주세요" }),
      el("p", { class: "tiny muted", text: "고르지 않으면 ‘내 사주가 끌어당기는 사람’ 기준으로 풀어요. 사람마다 따로 열어요." }),
      el("div", { class: "chip-slide lb-chips" }, [
        el("button", { type: "button", class: "chip" + (!pid ? " on" : ""), onclick: () => { pid = ""; paint(); } }, [el("span", { text: "🌙 아직 없음 · 내 인연" })]),
        ...people.map((p) => el("button", { type: "button", class: "chip" + (p.id === pid ? " on" : ""), onclick: () => { pid = p.id; paint(); } }, [el("span", { text: p.name || "이름 없음" })])),
        el("button", { type: "button", class: "chip lb-add", onclick: () => navigate("/people") }, [el("span", { text: "＋ 사람 추가" })]),
      ]),
    ]));

    // 표지
    const lockedN = R.book.slice(LB_FREE_CH).reduce((a, c) => a + c.secs.length, 0);
    host.append(el("div", { class: "lb-cover" }, [
      el("p", { class: "lb-cover-eb", text: R.partner ? `나 × ${R.yName}` : "나 × 내 인연" }),
      el("h2", { class: "serif lb-cover-t", text: "연애 비록(秘錄)" }),
      el("p", { class: "lb-cover-s", text: `전 ${R.book.length}장 · 총 ${R.total}편 · 약 ${R.chars.toLocaleString("ko-KR")}자` }),
      open ? el("p", { class: "lb-cover-ok", text: "✓ 전체를 열었어요 · 다시 볼 땐 무료" }) : el("p", { class: "lb-cover-ok", text: `1장은 무료 · 나머지 ${lockedN}편은 코인 ${cost}개로 한 번에 열려요` }),
    ]));

    // 목차 · 본문
    const tools = el("div", { class: "lb-tools", "data-nocapture": "" }, [
      el("button", { type: "button", class: "btn btn-quiet btn-sm lb-fold", onclick: (e) => { openAll = !openAll; host.querySelectorAll(".lb-sec:not(.locked)").forEach((d) => { d.open = openAll; }); e.currentTarget.firstChild.textContent = openAll ? "모두 접기" : "모두 펼치기"; } }, [el("span", { text: openAll ? "모두 접기" : "모두 펼치기" })]),
    ].filter(Boolean));
    host.append(tools);
    R.book.forEach((c, ci) => {
      const free = ci < LB_FREE_CH, can = open || free;
      const first = c.secs[0].no, last = c.secs[c.secs.length - 1].no;
      host.append(el("article", { class: "lb-ch" + (can ? "" : " locked") }, [
        el("header", { class: "lb-ch-h" }, [
          el("div", {}, [el("h3", { class: "serif", text: `${ci + 1}장. ${c.title}` }), el("p", { class: "lb-ch-sub", text: c.sub })]),
          el("span", { class: "lb-ch-n", text: `${first}~${last}편` }),
        ]),
        can && c.intro ? el("p", { class: "lb-intro", text: c.intro }) : null,
        el("div", { class: "lb-list" }, c.secs.map((x) => can
          ? el("details", { class: "lb-sec", open: openAll, "data-no": String(x.no) }, [
            el("summary", {}, [el("span", { class: "lb-no", text: String(x.no) }), el("span", { class: "lb-t", text: x.t }), el("span", { class: "lb-arrow", "aria-hidden": "true", text: "⌄" })]),
            el("div", { class: "lb-body" }, [
              ...x.p.map((t) => el("p", { text: t })),
              x.tip ? el("p", { class: "lb-tip", text: `💡 ${x.tip}` }) : null,
            ].filter(Boolean)),
          ])
          : el("div", { class: "lb-sec locked", "aria-label": `${x.no}편 ${x.t} · 잠김` }, [el("span", { class: "lb-no", text: String(x.no) }), el("span", { class: "lb-t", text: x.t }), el("span", { class: "lb-lock", text: "잠김" })]))),
      ].filter(Boolean)));
      if (!open && ci === LB_FREE_CH - 1) {
        host.append(lockBox(`나머지 ${R.book.length - LB_FREE_CH}장 · ${lockedN}편 한 번에 열기`, R.partner ? `${R.yName}의 속마음 · 두 사람 궁합 · 엇갈림 · 인연이 드는 달 · 다가가는 법까지` : "나의 사랑법 · 내 인연이 될 사람 · 살(煞) 풀기 · 인연이 드는 달 · 다가가는 법까지", cost, () => gate(id, cost, "연애 비록을 열었어요", paint)));
      }
    });
    if (open) host.append(shareRow("연애 비록 · 해묘", `💌 해묘 연애 비록 — ${R.partner ? `나 × ${R.yName}` : "나 × 내 인연"}\n전 ${R.book.length}장 · ${R.total}편으로 읽은 내 연애`, "/love-book"));
    host.append(noticeBox("info", "사주로 본 연애 흐름이에요. 사람의 마음은 사주만으로 정해지지 않으니, 참고하며 내 마음을 먼저 믿어 주세요."));
  };
  paint();
  return root;
}
