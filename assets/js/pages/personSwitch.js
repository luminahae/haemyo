/* 누구 기준으로 볼까? — 나 / 내가 추가한 사람 칩 + 바로 추가하기.
   선택하면 앱 전체 '시점'이 그 사람으로 바뀐다(state.setViewAs). */
import { el, clear } from "../utils/dom.js";
import { icon } from "../utils/icons.js";
import { getPeople, getViewAs, setViewAs, getOwnBirth } from "../state.js";
import { buildAddForm } from "./people.js";

export function personSwitch(navigate, { title = "누구 기준으로 볼까?" } = {}) {
  const box = el("section", { class: "wrap person-switch" });
  let adding = false;
  function paint() {
    clear(box);
    const cur = getViewAs();
    const people = getPeople().filter((p) => p.input && p.input.birthDate);
    const own = getOwnBirth();
    const chip = (label, on, onClick, extra = "") =>
      el("button", { class: "ps-chip" + (on ? " on" : "") + extra, type: "button", "aria-pressed": String(on), onclick: onClick }, [el("span", { text: label })]);
    const chips = [
      chip(own && own.name ? `나 (${own.name})` : "나", !cur, () => { if (cur) setViewAs(null); }),
      ...people.map((p) => chip(p.name || "이름없음", cur && cur.id === p.id, () => { if (!cur || cur.id !== p.id) setViewAs(p.id); })),
      el("button", { class: "ps-chip ps-add" + (adding ? " on" : ""), type: "button", onclick: () => { adding = !adding; paint(); } }, [icon("plus"), el("span", { text: "사람 추가" })]),
    ];
    box.append(
      el("p", { class: "ps-title", text: title }),
      el("div", { class: "ps-row", role: "group", "aria-label": title }, chips),
    );
    if (adding) {
      const form = buildAddForm(() => {
        adding = false;
        const list = getPeople();
        if (list[0]) setViewAs(list[0].id); // 방금 추가한 사람 시점으로 바로 전환
        else paint();
      }, navigate);
      box.append(el("div", { class: "panel", style: "margin-top: var(--sp-3);" }, [
        el("p", { class: "muted tiny", style: "margin-bottom:8px;", text: "추가하면 바로 그 사람 기준으로 볼 수 있어요. (내 사람 목록에도 저장돼요)" }),
        form,
      ]));
    }
  }
  paint();
  return box;
}
