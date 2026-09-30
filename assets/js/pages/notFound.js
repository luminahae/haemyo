import { el } from "../utils/dom.js";
import { icon } from "../utils/icons.js";

export function renderNotFound({ navigate }) {
  return el("div", { class: "wrap center", style: "padding-top: var(--sp-7);" }, [
    el("div", { class: "loader-orbit", style: "margin: 0 auto var(--sp-5);" }, [el("span", { class: "loader-dot" })]),
    el("h1", { class: "serif", style: "font-size: var(--fs-hero);", text: "404" }),
    el("p", { class: "muted", style: "margin-top: var(--sp-2);", text: "요청하신 화면을 찾을 수 없어요. 주소가 바뀌었거나 사라진 페이지일 수 있습니다." }),
    el("div", { class: "btn-row", style: "justify-content:center; margin-top: var(--sp-5);" }, [
      el("button", { class: "btn btn-primary", onclick: () => navigate("/") }, [icon("home"), el("span", { text: "홈으로" })]),
    ]),
  ]);
}
