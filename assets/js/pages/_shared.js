/* 페이지 간 공용 UI 조각 */
import { el } from "../utils/dom.js";
import { icon } from "../utils/icons.js";

let _disclaimer = null;
export async function loadDisclaimer() {
  if (_disclaimer) return _disclaimer;
  _disclaimer = await fetch(new URL("../../data/disclaimer.json", import.meta.url)).then((r) => r.json());
  return _disclaimer;
}
export function getDisclaimerSync() { return _disclaimer; }

export function pageHeader(eyebrow, title, sub) {
  return el("header", { class: "wrap section-gap", style: "margin-bottom: var(--sp-5);" }, [
    eyebrow ? el("span", { class: "eyebrow", text: eyebrow }) : null,
    el("h1", { text: title }),
    sub ? el("p", { class: "muted", text: sub }) : null,
  ].filter(Boolean));
}

export function backLink(navigate, to, label = "이전으로") {
  return el("button", {
    class: "btn btn-quiet btn-sm", onclick: () => navigate(to),
    style: "padding-left:8px;",
  }, [icon("back"), el("span", { text: label })]);
}

export function noticeBox(kind, text, iconName) {
  const cls = kind === "warn" ? "notice notice-warn" : kind === "privacy" ? "notice notice-privacy" : "notice";
  return el("div", { class: cls, role: "note" }, [
    icon(iconName || (kind === "warn" ? "alert" : kind === "privacy" ? "shield" : "info")),
    el("p", { text }),
  ]);
}

export function shortDisclaimer(text) {
  return el("p", { class: "tiny muted", style: "margin-top: var(--sp-4);", text });
}

export const TYPE_META = {
  saju: { icon: "saju", label: "사주 리포트" },
  tarot: { icon: "cards", label: "타로 리딩" },
  compat: { icon: "users", label: "성향 궁합" },
  ziwei: { icon: "sparkle", label: "자미두수 명반" },
};

/** 저장된 결과 미리보기 카드 */
export function recentCard(r, navigate) {
  const meta = TYPE_META[r.type] || TYPE_META.saju;
  const date = formatDate(r.createdAt);
  return el("button", {
    class: "panel", style: "text-align:left; width:100%; cursor:pointer; display:flex; gap:14px; align-items:center;",
    onclick: () => navigate("/result/" + r.id),
    "aria-label": `${r.title} 결과 열기`,
  }, [
    el("span", { style: "color:var(--c-gold); display:inline-flex;" }, [icon(meta.icon)]),
    el("div", { style: "flex:1; min-width:0;" }, [
      el("p", { style: "font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;", text: r.title }),
      el("p", { class: "muted tiny", text: `${meta.label} · ${date}` }),
    ]),
    icon("arrowRight"),
  ]);
}

export function formatDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

/** 하단 고정 액션바 */
export function actionBar(children) {
  return el("div", { class: "action-bar" }, children);
}

/** 인사이트 강조 박스 */
export function insight(text) {
  return el("div", { class: "insight", text });
}

/** 블록(요약/해석/사례/주의/행동) 렌더 */
export function renderBlock(b) {
  const body = Array.isArray(b.body)
    ? b.body.map((t) => el("p", { text: t }))
    : b.body.ul
      ? [el("ul", {}, b.body.ul.map((t) => el("li", { text: t })))]
      : [el("p", { text: String(b.body) })];

  const label = el("span", { class: "block-label" }, [
    el("span", { class: "ic" }, [icon(b.icon || "info")]),
    el("span", { text: b.label }),
  ]);
  return el("div", { class: `block tag-${b.tag}` }, [label, ...body]);
}
