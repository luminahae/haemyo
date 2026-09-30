import { el } from "../utils/dom.js";
import { icon } from "../utils/icons.js";
import { loadTarotData, getSpreads, getSpreadGroups } from "../tarot/deck.js";
import { stash, unstash } from "../state.js";
import { pageHeader, backLink } from "./_shared.js";

/* 덱 종류 — 메이저 22장(고양이 카드) / 78장 전체(마이너 56장 포함) */
const DECKS = [
  { id: "major", label: "메이저 22장", desc: "해묘 고양이 카드로 굵직한 흐름을" },
  { id: "full", label: "78장 전체", desc: "마이너 56장까지 넣어 일상의 디테일까지" },
];

export function renderTarotSpread({ navigate }) {
  const topic = unstash("tarot:topic");
  if (!topic) { navigate("/tarot"); return el("div"); }

  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/tarot", "질문 선택")]));
  root.append(pageHeader("STEP 2", "카드 배열 선택", `‘${topic.label}’ 질문을 어떤 방식으로 볼까요?`));

  // 덱 선택
  let deck = unstash("tarot:deck") || "major";
  const deckHost = el("section", { class: "wrap" });
  function paintDeck() {
    deckHost.replaceChildren(
      el("p", { class: "muted tiny", style: "margin-bottom:8px;", text: "어떤 카드로 볼까요?" }),
      el("div", { class: "deck-toggle", role: "radiogroup", "aria-label": "카드 덱 선택" }, DECKS.map((d) =>
        el("button", {
          class: "deck-opt" + (d.id === deck ? " on" : ""), role: "radio", "aria-checked": String(d.id === deck),
          onclick: () => { deck = d.id; stash("tarot:deck", deck); paintDeck(); },
        }, [el("b", { text: d.label }), el("span", { text: d.desc })]))),
    );
  }
  stash("tarot:deck", deck);
  paintDeck();
  root.append(deckHost);

  const list = el("div", { class: "wrap" }, [el("p", { class: "muted", text: "불러오는 중…" })]);
  root.append(list);

  loadTarotData().then(() => {
    const spreads = getSpreads();
    const nodes = [];
    for (const g of getSpreadGroups()) {
      const inGroup = spreads.filter((s) => (s.group || "기본") === g);
      if (!inGroup.length) continue;
      nodes.push(el("h2", { class: "spread-group-title", text: g }));
      nodes.push(el("div", { class: "section-gap" }, inGroup.map((s) => spreadCard(s, navigate))));
    }
    list.replaceChildren(...nodes);
  });

  return root;
}

function spreadCard(s, navigate) {
  const dots = el("div", { style: "display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;" },
    Array.from({ length: s.count }).map(() =>
      el("span", { style: "width:20px; height:32px; border-radius:4px; border:1px solid var(--c-gold-line); background:var(--c-gold-glow);" })
    )
  );
  return el("button", {
    class: "panel", style: "display:block; width:100%; text-align:left; cursor:pointer;",
    onclick: () => { stash("tarot:spread", s); navigate("/tarot/select"); },
    "aria-label": `${s.label} 선택`,
  }, [
    el("div", { style: "display:flex; align-items:center; justify-content:space-between; gap:12px;" }, [
      el("div", {}, [
        el("h3", { text: `${s.label} · ${s.count}장` }),
        el("p", { class: "muted", style: "font-size:var(--fs-sm); margin-top:4px;", text: s.desc }),
        dots,
      ]),
      el("span", { style: "color:var(--c-gold); display:inline-flex;" }, [icon("arrowRight")]),
    ]),
  ]);
}
