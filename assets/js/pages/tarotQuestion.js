import { el } from "../utils/dom.js";
import { icon } from "../utils/icons.js";
import { loadTarotData, getTopics } from "../tarot/deck.js";
import { stash, unstash } from "../state.js";
import { pageHeader, backLink, noticeBox } from "./_shared.js";

export function renderTarotQuestion({ navigate }) {
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(pageHeader("STEP 1", "무엇이 궁금한가요?", "질문 분야를 정하면, 그 관점에서 카드를 해석해 드립니다."));

  // 구체적인 질문 (선택) — 적으면 결과에서 '질문에 대한 답'을 따로 풀어 줌
  const qArea = el("textarea", { class: "input", rows: "2", maxlength: "120", placeholder: "예: 이 사람은 나랑 뭘 어쩌고 싶을까? / 연락 올까? / 왜 요즘 답이 늦을까?", "aria-label": "구체적인 질문" });
  qArea.value = unstash("tarot:question") || "";
  qArea.addEventListener("input", () => stash("tarot:question", qArea.value));
  root.append(el("div", { class: "wrap field", style: "margin-bottom: var(--sp-4);" }, [
    el("label", { text: "궁금한 걸 구체적으로 적어 보세요 (선택)" }), qArea,
    el("p", { class: "hint", text: "적으면 카드 전체로 질문에 대한 답을 따로 풀어 드려요." }),
  ]));

  const grid = el("div", { class: "wrap" }, [
    el("div", { class: "chip-grid", role: "list", style: "gap: var(--sp-3);" }, [el("p", { class: "muted", text: "불러오는 중…" })]),
  ]);
  root.append(grid);

  loadTarotData().then(() => {
    const selected = unstash("tarot:topic");
    const items = getTopics().map((t) => topicCard(t, navigate, selected && selected.id === t.id));
    const container = el("div", { class: "grid-2", style: "gap: var(--sp-3);" }, items);
    grid.replaceChildren(container);
    grid.append(el("div", { style: "margin-top: var(--sp-4);" }, [
      noticeBox("info", "타로는 미래를 확정하는 도구가 아니라, 지금의 마음과 상황을 다른 각도에서 돌아보게 하는 참고 콘텐츠입니다."),
    ]));
  });

  return root;
}

function topicCard(t, navigate, isSel) {
  return el("button", {
    class: "topic-btn" + (isSel ? " on" : ""), type: "button",
    onclick: () => { stash("tarot:topic", t); navigate("/tarot/spread"); },
    "aria-label": t.label + " 선택",
  }, [
    el("span", { class: "tb-ic" }, [icon(t.icon)]),
    el("span", { class: "tb-name", text: t.label }),
    el("span", { class: "tb-arrow" }, [icon("arrowRight")]),
  ]);
}
