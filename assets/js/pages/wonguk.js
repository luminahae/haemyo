/* =========================================================
   사주 원국 한눈에 (#/wonguk) — HAE
   계산은 saju/wonguk.js(엔진)가 다 하고, 이 파일은 결과를 그리기만 해요.
   ① 네 기둥(천간·지지·십성 → 상세: 지장간·십이운성 2기준·납음·신살)
   ② 형·충·회·합 관계도 (+ 성립/완성 구분 · 근거 · 규칙 · 전통 해석)
   ③ 관계는 어떻게 생길까 — 12지지 원 그림 사전
   ④ 신살·공망  ⑤ 오행·강약  ⑥ 대운·세운
   모바일: 네 기둥 유지 + 상세는 접기 / 태블릿·PC: 관계도를 넓게, 상세는 펼친 채로
   ========================================================= */
import { el, clear } from "../utils/dom.js";
import { pageHeader, backLink, noticeBox } from "./shared.js";
import { getMyBirth } from "../state.js";
import { personSwitch } from "./people.js";
import { computeSaju } from "../saju/manse.js";
import { buildWonguk, STAGE_INFO, REL_GUIDE, BRANCH_H, BRANCH_KR, ELEM_KR, sinsal12 } from "../saju/wonguk.js";
import { relTermKey } from "../utils/glossary.js";

const POS = ["시주", "일주", "월주", "년주"];
const AGE_KEY = "str.agemode.v1";
const ageMode = () => { try { return localStorage.getItem(AGE_KEY) === "man" ? "man" : "kr"; } catch { return "kr"; } };
const ageOff = (W) => (ageMode() === "man" && W.daeunStart ? W.daeunStart.manStart - W.daeunStart.num : 0);
const SVGNS = "http://www.w3.org/2000/svg";
const svg = (tag, attrs = {}, kids = []) => { const n = document.createElementNS(SVGNS, tag); for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v); kids.forEach((c) => c && n.appendChild(c)); return n; };
const wide = () => window.matchMedia && window.matchMedia("(min-width: 760px)").matches;
const TYPE_ICON = { 천간합: "🤝", 천간충: "⚡", 육합: "🤝", 삼합: "🔺", 방합: "🧭", 충: "⚡", 형: "⚠️", 자형: "🔁", 해: "🕳️", 파: "💢", 원진: "😤" };

/** 접는 상세 — PC에선 펼친 채로 시작 */
function more(label, kids, { open } = {}) {
  const d = el("details", { class: "wg-more" }, [el("summary", { "data-noterm": "" }, [el("span", { text: label })]), el("div", { class: "wg-more-body" }, kids.filter(Boolean))]);
  if (open ?? wide()) d.open = true;
  return d;
}
const section = (id, eyebrow, title, kids, extraClass = "", fold = null) => {
  if (!fold) return el("section", { class: "wrap wg-s", id }, [
    el("div", { class: `panel wg-sec ${extraClass}` }, [el("p", { class: "eyebrow", text: eyebrow }), el("h2", { class: "serif wg-h", text: title }), ...kids.filter(Boolean)]),
  ]);
  // 열어 봐야 열리는 카드 — 닫혀 있어도 한 줄 요약은 보여요
  const d = el("details", { class: `panel wg-sec wg-fold ${extraClass}` }, [
    el("summary", { class: "wg-fold-sum", "data-noterm": "" }, [
      el("span", { class: "wg-fold-txt" }, [el("span", { class: "eyebrow", text: eyebrow }), el("span", { class: "serif wg-h", text: title }), el("span", { class: "wg-fold-one", text: fold })]),
      el("span", { class: "wg-fold-chev", "aria-hidden": "true" }),
    ]),
    el("div", { class: "wg-fold-body" }, kids.filter(Boolean)),
  ]);
  return el("section", { class: "wrap wg-s", id }, [d]);
};
const badge = (h, kr, elem, extra = "") => el("span", { class: `og-badge el-${elem} wg-badge ${extra}`, "data-nokr": "" }, [el("b", { text: h }), el("small", { text: kr })]);
const ref = (t) => el("p", { class: "wg-ref" }, [el("span", { class: "wg-ref-tag", text: "전통 해석 · 참고" }), el("span", { text: t })]);
const kv = (k, v) => el("div", { class: "wg-kv" }, [el("b", { text: k }), el("p", { text: v })]);

export function renderWonguk({ navigate }) {
  const root = el("div", { class: "wg", "data-noterm": "" });
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/saju", "사주 리포트")]));
  root.append(pageHeader("사주 원국 · 무료", "한 화면에 보는 내 사주 원국", "원국 네 기둥부터 십성·십이운성·형충회합·신살·오행·대운까지 — 왜 그렇게 나왔는지 근거도 함께 보여 드려요."));
  root.append(personSwitch(navigate, { title: "누구로 볼까?" }));
  const my = getMyBirth();
  if (!my) {
    root.append(el("section", { class: "wrap section-gap" }, [noticeBox("info", "생년월일이 필요해요."), el("button", { class: "btn btn-primary", onclick: () => navigate("/saju") }, [el("span", { text: "내 정보 입력하고 시작" })])]));
    return root;
  }
  let W;
  try { W = buildWonguk(computeSaju(my)); } catch (e) { root.append(el("section", { class: "wrap" }, [noticeBox("warn", "원국을 계산하지 못했어요. 생년월일을 다시 확인해 주세요.")])); return root; }

  // 바로가기
  const jumps = [["wg-pillars", "네 기둥"], ["wg-luck", "대운·세운·월운·일운"], ["wg-power", "강약·격국"], ["wg-rel", "형충회합"], ["wg-sinsal", "신살·공망"], ["wg-elem", "오행"], ["wg-guide", "관계 설명"]];
  root.append(el("nav", { class: "wrap wg-jump", "aria-label": "바로가기", "data-noterm": "" }, jumps.map(([id, t]) => el("button", { type: "button", class: "chip", onclick: () => { const t2 = document.getElementById(id); if (!t2) return; const d = t2.querySelector("details.wg-fold"); if (d) d.open = true; t2.scrollIntoView({ behavior: "smooth", block: "start" }); } }, [el("span", { text: t })]))));
  root.append(el("div", { class: "wrap" }, [noticeBox("info", W.disclaimer)]));

  root.append(headCard(W, navigate));
  root.append(pillarsSection(W));
  root.append(luckSection(W));
  root.append(strengthSection(W));
  root.append(relationSection(W));
  root.append(sinsalSection(W));
  root.append(elemSection(W));
  root.append(guideSection(W));
  return root;
}

/* ① 네 기둥 — 한 장짜리 원국표 (한글 크게 · 한자 작게) ---------- */
const EL_WORD = { wood: "나무", fire: "불", earth: "흙", metal: "쇠", water: "물" };
const EL_K = { wood: "목", fire: "화", earth: "토", metal: "금", water: "수" };
const EL_H = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
const ELEM_WORD = { wood: "나무木", fire: "불火", earth: "흙土", metal: "쇠金", water: "물水" };
/** 사주 리포트 명식 카드와 똑같은 글자 칸 — 세리프 한자 + "+병,불火" */
const tile = (h, kr, elem, yy, extra = "") => el("span", { class: `ms-tile el-${elem} wg-mt ${extra}`, "data-nokr": "", "data-noterm": "", title: `${kr}(${h}) · ${yy}${EL_K[elem]} — ${EL_WORD[elem]}` }, [
  el("span", { class: "ms-tile-ch", text: h }),
  el("span", { class: "ms-tile-sub" }, [el("span", { text: `${yy === "양" ? "+" : "-"}${kr},` }), el("span", { class: "wg-mt-el", text: ELEM_WORD[elem] })]),
]);
function pillarsSection(W) {
  const P = W.pillars;
  const cells = (f, cls = "") => P.map((p) => el("div", { class: `wg2-c ${cls}` + (p.isDay ? " is-day" : "") }, p.empty ? [el("span", { class: "wg2-none", text: "—" })] : [].concat(f(p)).filter(Boolean)));
  const row = (label, f, cls = "") => el("div", { class: `wg2-row ${cls}` }, [el("span", { class: "wg2-lab", text: label }), ...cells(f)]);
  const relChip = (r) => el("span", { class: `wg2-rel tone-${r.tone}${r.part ? " part" : ""}`, "data-term": relTermKey(r.type === "삼합" ? `삼합 ${r.el}국` : r.type === "천간합" || r.type === "천간충" ? "" : r.type) || (r.type.startsWith("천간") ? r.type : undefined) }, [el("b", { text: r.type + (r.el && ["삼합", "방합", "육합", "천간합"].includes(r.type) ? `·${r.el}` : "") }), r.with.length ? el("small", { text: `↔${r.with.join("·")}` }) : null].filter(Boolean));
  const table = el("div", { class: "wg2", "data-nokr": "", "data-noterm": "" }, [
    el("div", { class: "wg2-row wg2-head" }, [el("span", { class: "wg2-lab" }), ...P.map((p) => el("div", { class: "wg2-c" + (p.isDay ? " is-day" : "") }, [el("b", { text: p.isDay ? "일주 · 나" : p.pos }), el("small", { text: p.posMean })]))]),
    row("천간 십성", (p) => el("span", { class: "wg2-god" + (p.isDay ? " me" : ""), text: p.isDay ? "나 (일간)" : p.stemGod })),
    row("천간", (p) => tile(p.stemH, p.stemKr, p.stemElem, p.stemYY, p.isDay ? "is-me" : ""), "wg2-tiles"),
    row("지지", (p) => tile(p.branchH, p.branchKr, p.branchElem, BR_YY(p.branchKr), p.gongmang ? "is-gm" : ""), "wg2-tiles"),
    row("지지 십성", (p) => el("span", { class: "wg2-god", text: p.branchGod })),
    row("지장간", (p) => el("div", { class: "wg2-jj" }, p.jijang.map((j) => el("span", { class: `wg2-jj-i e-${j.elem}` }, [el("i", { text: j.h }), el("b", { text: j.kr }), el("small", { text: j.god })])))),
    row("십이운성", (p) => [el("span", { class: "wg2-stage", "data-term": p.stageIlgan, text: p.stageIlgan }), el("small", { class: "wg2-stage-j", text: `천간 기준 ` }, [el("span", { "data-term": p.stageJajwa, text: p.stageJajwa })])]),
    row("관계", (p) => p.rels.length ? el("div", { class: "wg2-rels" }, p.rels.map(relChip)) : el("span", { class: "wg2-none", text: "—" }), "wg2-band"),
    row("12신살", (p) => el("div", { class: "wg2-ss" }, [el("span", { text: p.sinsalYear || "—" }), p.sinsalDay && p.sinsalDay !== p.sinsalYear ? el("small", { text: `일 ${p.sinsalDay}` }) : null].filter(Boolean))),
    row("길신·흉살", (p) => p.spirits.length || p.gongmang ? el("div", { class: "wg2-sp" }, [...p.spirits.map((x) => el("span", { class: `tone-${x.tone}`, text: x.name })), p.gongmang ? el("span", { class: "tone-gm", text: "공망" }) : null].filter(Boolean)) : el("span", { class: "wg2-none", text: "—" })),
    row("납음", (p) => el("span", { class: "wg2-np" }, [el("b", { text: p.napeum }), el("small", { text: p.napeumH })])),
  ]);
  // 오행 한 줄 + 핵심 요약 줄
  const E = W.elements;
  const elemLine = el("div", { class: "wg2-elems" }, E.map((e) => el("span", { class: `wg2-el t-${e.key}` + (e.count === 0 ? " zero" : "") }, [el("i"), el("b", { text: `${EL_K[e.key]}(${EL_H[e.key]})` }), el("span", { text: `${e.count}` })])));
  const facts = el("div", { class: "wg2-facts", "data-nokr": "" }, [
    ["공망", kfirst(`${W.gongmang.day.join(" ")}${W.gongmang.hits.length ? ` · ${W.gongmang.hits.join(", ")}` : ""}`)],
    ["천을귀인", kfirst(W.guiin.join(" "))],
    ["월령", kfirst(W.wollyeong)],
    ["강약", `${W.strength.level} · 용신 ${W.strength.yongsinKr.join("·")}`],
  ].map(([k, v]) => el("div", { class: "wg2-fact" }, [el("span", { text: k }), el("b", { text: v })])));
  // 대운 미니 줄
  const D = W.daeun;
  const strip = el("div", { class: "wg2-dw", "data-nokr": "", "data-noterm": "" }, D.map((c) => el("button", { type: "button", class: "wg2-dw-c" + (c.isNow ? " is-now" : ""), onclick: () => { const t = document.getElementById("wg-luck"); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); } }, [
    el("span", { class: "wg2-dw-age", text: `${c.age + ageOff(W)}세` }), el("small", { text: c.stemGod }),
    tile(c.stemH, c.stemKr, c.stemElem, STEM_YY(c.stemKr), "sm"), tile(c.branchH, c.branchKr, c.branchElem, BR_YY(c.branchKr), "sm"),
    el("small", { text: c.branchGod }), el("span", { class: "wg2-dw-st", text: c.stage }),
  ])));
  setTimeout(() => { const n = strip.querySelector(".is-now"); if (n && strip.scrollWidth > strip.clientWidth) strip.scrollLeft = n.offsetLeft - strip.clientWidth / 2 + n.clientWidth / 2; }, 60);

  const B = W.stageBasis;
  const stageCards = el("div", { class: "wg-stage-grid" }, P.filter((p) => !p.empty).map((p) => {
    const A = STAGE_INFO[p.stageIlgan], J = STAGE_INFO[p.stageJajwa];
    return el("article", { class: "wg-stage-card" }, [
      el("p", { class: "wg-stage-pos", text: `${p.pos} · ${p.branchKr}(${p.branchH})` }),
      el("h4", { text: `${p.stageIlgan}(${A.h}) · ${A.key}` }),
      el("p", { class: "wg-stage-life", text: `${A.life} · 기운 ${A.power}` }),
      el("p", { text: A.desc }),
      el("p", { class: "wg-stage-j", text: `천간 기준: ${p.stemKr}(${p.stemH})이 ${p.branchKr}(${p.branchH}) 위에 앉으면 ${p.stageJajwa}(${J.h}) — ${J.key}` }),
    ]);
  }));
  return section("wg-pillars", `나는 ${W.dayMaster.kr}${EL_K[W.dayMaster.elem]} · ${EL_WORD[W.dayMaster.elem]}의 기운`, "사주 네 기둥", [
    el("p", { class: "wg-lead", text: "위 칸이 천간(겉으로 드러난 나), 아래 칸이 지지(속마음·환경)예요. 가운데 ‘나’ 칸을 기준으로 나머지 글자의 역할(십성)을 읽어요. 칸 색은 오행이에요 — 초록 나무 · 빨강 불 · 노랑 흙 · 흰색 쇠 · 검정 물." }),
    table,
    W.timeKnown ? null : el("p", { class: "tiny muted", text: "태어난 시간을 몰라 시주는 비워 두었어요." }),
    elemLine, facts,
    more("십이운성은 무슨 뜻? · 두 가지 기준과 풀이", [
      el("div", { class: "wg-basis" }, [kv(B.ilgan.title, B.ilgan.desc), kv(B.jajwa.title, B.jajwa.desc), el("p", { class: "tiny muted", text: B.rule })]),
      stageCards,
    ], { open: false }),
  ]);
}
/** "戌(술) 亥(해)" → "술(戌) 해(亥)" — 한글을 앞에 */
const kfirst = (t) => String(t || "").replace(/([\u4e00-\u9fff]+)\(([가-힣]+)\)/g, "$2($1)");
const STEM_YY = (kr) => ("갑병무경임".includes(kr) ? "양" : "음");
const BR_YY = (kr) => ("인진사신술해".includes(kr) ? "양" : "음");

/* ② 형·충·회·합 ------------------------------------------- */
function relationSection(W) {
  const R = W.relations;
  if (!R.length) return section("wg-rel", "형 · 충 · 회 · 합", "글자들 사이의 관계", [el("p", { class: "wg-lead", text: "원국 여덟 글자 사이에 뚜렷한 합·충·형·해가 없어요. 큰 부딪힘 없이 각자 제자리에서 움직이는 구조예요. 운(대운·세운)에서 들어오는 글자와의 관계는 위 ‘대운·세운·월운·일운’에서 볼 수 있어요." })], "", "원국 안에 뚜렷한 합·충이 없어요");
  const diagram = relDiagram(W);
  let filter = "all";
  const list = el("div", { class: "wg-rel-list" });
  const highlight = (k) => {
    diagram.querySelectorAll("[data-rel]").forEach((n) => n.classList.toggle("is-dim", k != null && n.dataset.rel !== String(k)));
    list.querySelectorAll(".wg-rel-card").forEach((c) => c.classList.toggle("is-on", c.dataset.k === String(k)));
  };
  const paint = () => {
    clear(list);
    R.forEach((r, k) => {
      if (filter === "good" && r.tone !== "good") return;
      if (filter === "warn" && r.tone !== "warn") return;
      const dots = r.need === 3 ? el("span", { class: "wg-dots", "aria-label": `${r.have}/3 글자` }, [0, 1, 2].map((n) => el("i", { class: n < r.have ? "on" : "" }))) : null;
      list.append(el("article", { class: `wg-rel-card tone-${r.tone} st-${r.status}`, "data-k": String(k), tabindex: "0", onclick: (e) => { if (e.target.closest("details")) return; highlight(list.querySelector(`.wg-rel-card.is-on[data-k="${k}"]`) ? null : k); } }, [
        el("div", { class: "wg-rel-top" }, [
          el("span", { class: "wg-rel-no", text: String(k + 1) }),
          el("span", { class: "wg-rel-type", text: `${TYPE_ICON[r.type] || ""} ${r.type}`, "data-term": r.type.startsWith("천간") ? r.type : (relTermKey(r.type === "삼합" ? `삼합 ${(r.element && ELEM_KR[r.element] || "").slice(0, 1)}국` : r.type) || undefined) }),
          el("span", { class: `wg-st st-${r.status}${r.weak ? " weak" : ""}` }, [dots, el("span", { text: r.statusLabel })].filter(Boolean)),
        ]),
        el("h4", { class: "wg-rel-name", text: r.name + (r.sub ? ` · ${r.sub}` : "") }),
        el("p", { class: "wg-rel-link", text: r.nodes.map((n) => `${n.pos1}${n.kind === "s" ? "간" : "지"} ${n.h}(${n.kr})`).join("  ↔  ") }),
        el("p", { class: "wg-rel-key", text: r.keyword }),
        r.missing && r.missing.length ? el("p", { class: "wg-rel-miss", text: `빠진 글자: ${r.missing.join("·")} — 대운·세운에서 오면 ${r.type === "형" ? "삼형" : "완성"}` }) : null,
        more("왜 이렇게 나왔나요?", [kv("근거 · 어떤 글자끼리", r.basis), kv("성립 조건 · 적용 규칙", r.rule), ref(r.mean)], { open: false }),
      ].filter(Boolean)));
    });
    if (!list.children.length) list.append(el("p", { class: "muted tiny", text: "이 분류에 해당하는 관계가 없어요." }));
  };
  const S = W.relSummary;
  const filters = el("div", { class: "wg-filter", "data-noterm": "" }, [["all", `전체 ${R.length}`], ["good", `합 ${S.good}`], ["warn", `충·형·해·파 ${S.warn}`]].map(([f, t]) => el("button", { type: "button", class: "chip" + (f === filter ? " is-selected" : ""), onclick: (e) => { filter = f; e.currentTarget.parentNode.querySelectorAll(".chip").forEach((c) => c.classList.toggle("is-selected", c === e.currentTarget)); highlight(null); paint(); } }, [el("span", { text: t })])));
  paint();
  diagram.addEventListener("click", (e) => { const g = e.target.closest("[data-rel]"); if (g) highlight(Number(g.dataset.rel)); else highlight(null); });
  return section("wg-rel", "형 · 충 · 회 · 합", "글자들 사이의 관계도", [
    el("p", { class: "wg-lead", text: `합 ${S.good}개 · 충·형·해·파·원진 ${S.warn}개 · 세 글자 묶음 중 완성 ${S.complete}개, 일부만 있는 것 ${S.partial}개. 실선은 성립·완성, 점선은 일부(2/3)만 있는 관계예요. 카드나 선을 누르면 해당 관계만 강조돼요.` }),
    el("div", { class: "wg-rel-wrap" }, [el("div", { class: "wg-rel-fig", "data-nokr": "" }, [diagram, legend()]), el("div", { class: "wg-rel-side" }, [filters, list])]),
  ], "wg-sec-rel", `합 ${S.good} · 충·형·해·파·원진 ${S.warn} · ${R.filter((r) => r.need === 3).map((r) => `${r.name.split(" ")[1] || r.name} ${r.have}/3`).slice(0, 2).join(" · ") || "세 글자 묶음 없음"}`);
}
function legend() {
  const it = (cls, t) => el("span", { class: "wg-lg-i" }, [el("i", { class: cls }), el("span", { text: t })]);
  return el("div", { class: "wg-legend" }, [it("lg-good", "합(合)"), it("lg-warn", "충·형·해·파·원진"), it("lg-part", "일부만(2/3)")]);
}
/** 관계도 SVG — 위: 천간 네 개, 아래: 지지 네 개. 천간 관계는 위로, 지지 관계는 아래로 휘어진 선 */
function relDiagram(W) {
  const Wd = 400, X = (i) => 70 + i * 90, LANE = 24;
  const R = W.relations;
  const stemRels = R.map((r, k) => [r, k]).filter(([r]) => r.nodes[0].kind === "s");
  const brRels = R.map((r, k) => [r, k]).filter(([r]) => r.nodes[0].kind === "b");
  const yS = 34 + stemRels.length * LANE + 30, yB = yS + 82;
  const nodeY = (k) => (k === "s" ? yS : yB);
  const H = yB + 34 + brRels.length * LANE + 14;
  const root = svg("svg", { viewBox: `0 0 ${Wd} ${H}`, class: "wg-fig", role: "img", "aria-label": "형충회합 관계도" });
  W.pillars.forEach((p, i) => root.appendChild(svg("text", { x: X(i), y: 16, class: "wg-fig-pos", "text-anchor": "middle" }, [document.createTextNode(p.pos)])));
  const draw = (list, up) => list.forEach(([r, k], n) => {
    const xs = [...new Set(r.nodes.map((nd) => nd.i))].sort((a, b) => a - b).map(X);
    const y0 = nodeY(r.nodes[0].kind) + (up ? -24 : 24), depth = up ? y0 - 14 - (list.length - 1 - n) * LANE : y0 + 14 + n * LANE;
    const cls = `wg-ln tone-${r.tone}${r.status === "partial" ? " part" : ""}${r.weak ? " weak" : ""}`;
    const g = svg("g", { "data-rel": String(k), class: "wg-ln-g" });
    const d = xs.length === 1 ? `M${xs[0] - 14} ${y0} L${xs[0] - 14} ${depth} L${xs[0] + 14} ${depth} L${xs[0] + 14} ${y0}` : `M${xs[0]} ${y0} L${xs[0]} ${depth} L${xs[xs.length - 1]} ${depth} L${xs[xs.length - 1]} ${y0}`;
    g.appendChild(svg("path", { d, class: cls, fill: "none" }));
    xs.slice(1, -1).forEach((x) => g.appendChild(svg("path", { d: `M${x} ${y0} L${x} ${depth}`, class: cls, fill: "none" })));
    const mx = (xs[0] + xs[xs.length - 1]) / 2, tw = 70;
    root.appendChild(g);
    const tg = svg("g", { "data-rel": String(k), class: "wg-ln-g wg-ln-tagg" });
    tg.appendChild(svg("rect", { x: mx - tw / 2, y: depth - 10, width: tw, height: 20, rx: 10, class: `wg-ln-tag tone-${r.tone}` }));
    tg.appendChild(svg("text", { x: mx, y: depth + 4.5, "text-anchor": "middle", class: "wg-ln-t" }, [document.createTextNode(`${k + 1} ${r.type}`)]));
    tags.push(tg);
  });
  const tags = [];
  draw(stemRels, true); draw(brRels, false);
  tags.forEach((t) => root.appendChild(t));
  W.pillars.forEach((p, i) => {
    if (p.empty) return;
    [["s", p.stemH, p.stemKr, p.stemElem], ["b", p.branchH, p.branchKr, p.branchElem]].forEach(([k, h, kr, elem]) => {
      const y = nodeY(k);
      root.appendChild(svg("rect", { x: X(i) - 24, y: y - 24, width: 48, height: 48, rx: 13, class: `wg-node el-${elem}${p.isDay && k === "s" ? " is-me" : ""}` }));
      root.appendChild(svg("text", { x: X(i), y: y + 5, "text-anchor": "middle", class: `wg-node-h el-${elem}` }, [document.createTextNode(h)]));
      root.appendChild(svg("text", { x: X(i), y: y + 18, "text-anchor": "middle", class: `wg-node-k el-${elem}` }, [document.createTextNode(kr)]));
    });
  });
  root.appendChild(svg("text", { x: 4, y: yS + 4, class: "wg-fig-side" }, [document.createTextNode("천간")]));
  root.appendChild(svg("text", { x: 4, y: yB + 4, class: "wg-fig-side" }, [document.createTextNode("지지")]));
  return root;
}

/* ③ 관계 사전 — 12지지 원 ---------------------------------- */
const CIRCLE_SETS = {
  육합: { lines: [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]], tone: "good" },
  삼합: { polys: [[8, 0, 4], [2, 6, 10], [11, 3, 7], [5, 9, 1]], tone: "good" },
  방합: { polys: [[2, 3, 4], [5, 6, 7], [8, 9, 10], [11, 0, 1]], tone: "good" },
  충: { lines: [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]], tone: "warn" },
  형: { polys: [[2, 5, 8], [1, 10, 7]], lines: [[0, 3]], selfs: [4, 6, 9, 11], tone: "warn" },
  해: { lines: [[0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10]], tone: "warn" },
  파: { lines: [[0, 9], [6, 3], [4, 1], [10, 7], [2, 11], [8, 5]], tone: "warn" },
  원진: { lines: [[0, 7], [1, 6], [2, 9], [3, 8], [4, 11], [5, 10]], tone: "warn" },
  반합: { lines: [[8, 0], [0, 4], [2, 6], [6, 10], [11, 3], [3, 7], [5, 9], [9, 1]], tone: "good" },
};
const KUK = [
  { name: "수국", h: "水局", el: "water", b: [8, 0, 4], key: "지혜·소통·유연함·이동", story: "물은 申(원숭이)에서 태어나 子(쥐)에서 가장 세지고 辰(용)의 창고에 담겨요." },
  { name: "화국", h: "火局", el: "fire", b: [2, 6, 10], key: "열정·표현·명예·확장", story: "불은 寅(호랑이)에서 태어나 午(말)에서 가장 뜨겁고 戌(개)의 창고에 담겨요." },
  { name: "목국", h: "木局", el: "wood", b: [11, 3, 7], key: "성장·배움·기획·인정", story: "나무는 亥(돼지)에서 태어나 卯(토끼)에서 가장 무성하고 未(양)의 창고에 담겨요." },
  { name: "금국", h: "金局", el: "metal", b: [5, 9, 1], key: "결단·원칙·실리·전문성", story: "쇠는 巳(뱀)에서 태어나 酉(닭)에서 가장 단단하고 丑(소)의 창고에 담겨요." },
];
function guideSection(W) {
  const mine = new Set(W.pillars.filter((p) => !p.empty).map((p) => BRANCH_H.indexOf(p.branchH)));
  const types = [...REL_GUIDE.map((g) => g.type)];
  types.splice(types.indexOf("반합") + 1, 0, "4국");
  let cur = "삼합";
  const yb = W.pillars[3] && !W.pillars[3].empty ? BRANCH_H.indexOf(W.pillars[3].branchH) : null;
  const fig = el("div", { class: "wg-circle-fig", "data-nokr": "" });
  const text = el("div", { class: "wg-guide-text", "data-nokr": "" });
  const paint = () => {
    clear(fig); clear(text);
    if (cur === "4국") {
      fig.append(circleSvg(CIRCLE_SETS.삼합, mine, "삼합"));
      text.append(el("h3", { class: "wg-h3", text: "삼합이 만드는 네 가지 국(局)" }), el("p", { class: "wg-lead", text: "같은 오행이 태어나는 곳(생지)·가장 센 곳(왕지)·저장되는 곳(고지) 세 글자가 모이면 그 오행의 ‘국’이 돼요. 세 글자가 다 있으면 완성, 두 글자면 반합이에요." }),
        el("div", { class: "wg-kuk" }, KUK.map((k) => {
          const have = k.b.filter((b) => mine.has(b)).length;
          return el("article", { class: `wg-kuk-c t-${k.el}` }, [
            el("div", { class: "wg-kuk-top" }, [el("b", { text: `${k.name}(${k.h})` }), el("span", { class: "wg-dots" }, [0, 1, 2].map((n) => el("i", { class: n < have ? "on" : "" }))), el("small", { text: have === 3 ? "완성" : have === 2 ? "반합" : `${have}/3` })]),
            el("div", { class: "wg-kuk-b", "data-nokr": "" }, k.b.map((b, i) => el("span", { class: mine.has(b) ? "on" : "" }, [el("small", { text: ["생지", "왕지", "고지"][i] }), el("b", { text: BRANCH_H[b] }), el("em", { text: BRANCH_KR[b] })]))),
            el("p", { class: "wg-kuk-key", text: k.key }), el("p", { class: "tiny muted", text: k.story }),
          ]);
        })));
      return;
    }
    const G = REL_GUIDE.find((g) => g.type === cur);
    const set = CIRCLE_SETS[cur];
    if (cur === "12신살") fig.append(circleSvg({ lines: [], tone: "good" }, mine, cur, yb != null ? (b) => sinsal12(yb, b) : null));
    else if (set) fig.append(circleSvg(set, mine, cur));
    else fig.append(el("div", { class: "wg-stem-ring" }, [el("p", { class: "tiny muted", text: "천간 관계는 열 천간 사이의 관계라 아래 설명을 봐 주세요." }), el("p", { class: "serif wg-stem-pairs", text: cur === "천간합" ? "甲己 · 乙庚 · 丙辛 · 丁壬 · 戊癸" : "甲庚 · 乙辛 · 丙壬 · 丁癸" })]));
    text.append(el("h3", { class: "wg-h3", text: `${G.type}(${G.h})` }), kv("어떻게 생기나요?", G.how), kv("성립 조건 · 적용 규칙", G.rule), ref(G.mean));
    if (cur === "12신살") { text.append(el("p", { class: "wg-guide-mine", text: yb != null ? `내 년지 ${BRANCH_KR[yb]}(${BRANCH_H[yb]}) 기준 — 원국 지지: ${W.pillars.filter((p) => !p.empty).map((p) => `${p.pos1}지 ${p.branchKr} ${p.sinsalYear}`).join(" · ")}` : "" })); return; }
    const hits = W.relations.filter((r) => r.type === cur || (cur === "형" && r.type === "자형") || (cur === "반합" && r.type === "삼합" && r.status === "partial"));
    text.append(el("p", { class: "wg-guide-mine", text: hits.length ? `내 원국: ${hits.map((r) => `${r.name} (${r.statusLabel})`).join(" / ")}` : "내 원국에는 이 관계가 없어요." }));
  };
  const tabs = el("div", { class: "wg-filter wg-guide-tabs", "data-noterm": "" }, types.map((t) => el("button", { type: "button", class: "chip" + (t === cur ? " is-selected" : ""), onclick: (e) => { cur = t; tabs.querySelectorAll(".chip").forEach((c) => c.classList.toggle("is-selected", c === e.currentTarget)); paint(); } }, [el("span", { text: t })])));
  paint();
  return section("wg-guide", "관계 설명", "형충회합 · 국 · 12신살은 어떻게 생길까?", [
    el("p", { class: "wg-lead", text: "열두 지지를 시계처럼 둥글게 놓으면 모든 관계가 ‘모양’으로 보여요. 진하게 표시된 글자가 내 원국에 있는 지지예요." }),
    tabs, el("div", { class: "wg-guide-wrap" }, [fig, text]),
  ], "", "육합·삼합·반합·방합·화국·수국·충·형·해·파·원진·12신살을 그림으로");
}
function circleSvg(set, mine, type, labelOf) {
  const C = 120, Rr = labelOf ? 78 : 92;
  const pt = (b) => { const a = ((90 + b * 30) * Math.PI) / 180; return [C + Rr * Math.cos(a), C + Rr * Math.sin(a)]; };
  const s = svg("svg", { viewBox: labelOf ? "-6 -6 252 252" : "0 0 240 240", class: "wg-circle", role: "img", "aria-label": `${type} 원 그림` });
  s.appendChild(svg("circle", { cx: C, cy: C, r: Rr, class: "wg-c-ring", fill: "none" }));
  const has = (arr) => arr.every((b) => mine.has(b));
  const some = (arr) => arr.filter((b) => mine.has(b)).length >= 2;
  (set.lines || []).forEach(([a, b]) => { const [x1, y1] = pt(a), [x2, y2] = pt(b); s.appendChild(svg("line", { x1, y1, x2, y2, class: `wg-c-ln tone-${set.tone}${has([a, b]) ? " is-mine" : ""}` })); });
  (set.polys || []).forEach((arr) => s.appendChild(svg("polygon", { points: arr.map((b) => pt(b).join(",")).join(" "), class: `wg-c-ln tone-${set.tone}${has(arr) ? " is-mine" : some(arr) ? " is-part" : ""}`, fill: "none" })));
  (set.selfs || []).forEach((b) => { const [x, y] = pt(b); s.appendChild(svg("circle", { cx: x, cy: y, r: 19, class: `wg-c-ln tone-${set.tone}`, fill: "none" })); });
  for (let b = 0; b < 12; b++) {
    const [x, y] = pt(b), on = mine.has(b);
    s.appendChild(svg("circle", { cx: x, cy: y, r: 14, class: `wg-c-node${on ? " on" : ""}` }));
    s.appendChild(svg("text", { x, y: y + 2, "text-anchor": "middle", class: `wg-c-h${on ? " on" : ""}` }, [document.createTextNode(BRANCH_H[b])]));
    s.appendChild(svg("text", { x, y: y + 10.5, "text-anchor": "middle", class: `wg-c-k${on ? " on" : ""}` }, [document.createTextNode(BRANCH_KR[b])]));
    if (labelOf) { const a = ((90 + b * 30) * Math.PI) / 180, lx = C + 108 * Math.cos(a), ly = C + 108 * Math.sin(a); s.appendChild(svg("text", { x: lx, y: ly + 3, "text-anchor": "middle", class: `wg-c-lab${on ? " on" : ""}` }, [document.createTextNode(labelOf(b))])); }
  }
  return s;
}

/* ④ 신살·공망 --------------------------------------------- */
function sinsalSection(W) {
  const sp = W.spirits, G = W.gongmang;
  const chips = el("div", { class: "wg-ss-chips" }, [
    ...sp.map((x) => el("span", { class: `wg-ss tone-${x.tone}`, "data-tip": x.mean }, [el("b", { text: x.name }), el("small", { text: x.where })])),
    el("span", { class: "wg-ss tone-neutral" }, [el("b", { text: "공망" }), el("small", { text: `${G.day.join("·")}${G.hits.length ? ` · 원국 ${G.hits.join(", ")}` : " · 원국엔 없음"}` })]),
  ]);
  const fold1 = sp.length ? `${sp.slice(0, 4).map((x) => x.name).join(" · ")}${sp.length > 4 ? ` 외 ${sp.length - 4}개` : ""} · 공망 ${G.day.map((t) => t.replace(/^(.)\((.)\)$/, "$2")).join("")}` : "두드러진 신살 없음";
  return section("wg-sinsal", "신살 · 공망", "내 사주에 있는 별", [
    el("p", { class: "wg-lead", text: sp.length ? `원국에서 찾은 신살 ${sp.length}가지와 공망이에요. 신살은 성향을 보는 보조 지표라, 길신이 있다고 무조건 좋고 흉살이 있다고 나쁜 일이 생기는 건 아니에요.` : "원국에 두드러진 신살은 없어요. 공망만 확인해 보세요." }),
    chips,
    more("상세 보기 · 산출 근거 · 전통적 해석", [
      ...sp.map((x) => el("div", { class: `wg-ss-row tone-${x.tone}` }, [el("h4", { text: `${x.name} — ${x.where}` }), kv("산출 근거", x.basis), x.mean ? ref(x.mean) : null].filter(Boolean))),
      el("div", { class: "wg-ss-row tone-neutral" }, [el("h4", { text: `공망 — ${G.day.join("·")} (일주 기준)` }), kv("산출 근거", G.dayBasis + (G.year ? ` · 년주 기준: ${G.yearBasis}` : "")), kv("원국에서", G.hits.length ? `${G.hits.join(", ")}가 공망 자리에 있어요.` : "원국 지지 중 공망에 해당하는 글자는 없어요."), ref(G.mean)]),
    ]),
  ], "", fold1);
}

/* ⑤ 오행 ---------------------------------------------------- */
function elemSection(W) {
  const E = W.elements, S = W.strength;
  const max = Math.max(...E.map((e) => e.count), 1);
  const bars = el("div", { class: "wg-el" }, E.map((e) => el("div", { class: "wg-el-row" + (e.isMe ? " is-me" : "") }, [
    el("span", { class: `wg-el-name el-t-${e.key}`, text: e.kr }),
    el("span", { class: "wg-el-bar" }, [el("i", { class: `el-bg-${e.key}`, style: `width:${Math.max(4, (e.count / max) * 100)}%` })]),
    el("span", { class: "wg-el-n", text: `${e.count}개 · ${e.pct}%` }),
  ])));
  const chk = (ok, t, d) => el("li", { class: ok ? "ok" : "" }, [el("b", { text: `${ok ? "✓" : "✗"} ${t}` }), el("span", { text: d })]);
  return section("wg-elem", "오행", "다섯 기운의 분포", [
    el("p", { class: "wg-lead", text: `나(일간)는 ${W.dayMaster.elemKr} · ${S.level} — 용신 ${S.yongsinKr.join("·")}` }),
    bars,
    el("p", { class: "tiny muted", text: E.filter((e) => e.count === 0).length ? `없는 기운: ${E.filter((e) => e.count === 0).map((e) => e.kr).join("·")} (지장간 속엔 ${E.filter((e) => e.count === 0 && e.hidden > 0).map((e) => e.kr).join("·") || "없음"})` : "다섯 기운이 모두 있어요." }),
    more("상세 보기 · 계산 방식 · 강약 분석", [
      kv("계산 방식", W.elemMethod),
      el("div", { class: "wg-el-hidden" }, E.map((e) => el("span", { text: `${e.kr} ${e.count} + 숨은 ${e.hidden} · ${e.group}${e.isMe ? " (나)" : ""}` }))),
      kv("신강·신약을 보는 법", S.method),
      el("ul", { class: "wg-chk" }, [chk(S.deukryeong, "득령", "태어난 달이 나를 도와요"), chk(S.deukji, "득지", "앉은 자리(일지)가 나를 도와요"), chk(S.deukse, "득세", "주변 글자 중 나를 돕는 글자가 많아요")]),
      kv(`결과: ${S.level}`, S.summary),
      kv("용신", S.yongsinDesc),
    ]),
  ], "", E.map((e) => `${EL_K[e.key]} ${e.count}`).join(" · ") + ` · ${S.level}`);
}

/* ⑥ 운의 흐름 — 대운·세운·월운·일운을 한 카드에 ------------------ */
function luckSection(W) {
  const detail = el("div", { class: "wg-luck-detail", "data-nokr": "" });
  const show = (c, title) => {
    clear(detail);
    const info = STAGE_INFO[c.stage];
    detail.append(
      el("h4", { text: title }),
      el("div", { class: "wg-luck-gods", "data-nokr": "", "data-noterm": "" }, [
        el("span", {}, [el("small", { text: "천간" }), el("b", { text: `${c.stemKr}(${c.stemH})` }), el("em", { text: c.stemGod })]),
        el("span", {}, [el("small", { text: "지지" }), el("b", { text: `${c.branchKr}(${c.branchH})` }), el("em", { text: c.branchGod })]),
        el("span", {}, [el("small", { text: "십이운성" }), el("b", { class: "wg-stage", "data-term": c.stage, text: c.stage }), el("em", { text: info ? info.key : "" })]),
      ]),
      c.rels.length
        ? el("ul", { class: "wg-luck-rels" }, c.rels.map((r) => el("li", { class: `tone-${r.tone}` }, [el("b", { text: r.label }), el("span", { text: r.txt })])))
        : el("p", { class: "tiny muted", text: "원국 글자와 뚜렷한 합·충·형은 없어요 — 이 운의 십성 기운이 그대로 작용해요." }),
    );
  };
  const all = [];
  const col = (c, top, sub, title) => {
    const b = el("button", { type: "button", class: "wg-lk" + (c.isNow ? " is-now" : ""), "data-nokr": "", onclick: () => { all.forEach((x) => x.classList.toggle("is-sel", x === b)); show(c, title); } }, [
      el("span", { class: "wg-lk-top", text: top }), sub ? el("span", { class: "wg-lk-sub", text: sub }) : null,
      el("span", { class: "wg-lk-god", text: c.stemGod }),
      tile(c.stemH, c.stemKr, c.stemElem, STEM_YY(c.stemKr), "sm"), tile(c.branchH, c.branchKr, c.branchElem, BR_YY(c.branchKr), "sm"),
      el("span", { class: "wg-lk-god", text: c.branchGod }), el("span", { class: "wg-lk-st", text: c.stage }),
      el("span", { class: "wg-lk-n" + (c.rels.length ? "" : " none"), text: c.rels.length ? `관계 ${c.rels.length}` : "·" }),
    ].filter(Boolean));
    all.push(b); return b;
  };
  const rowOf = (label, hint, items) => {
    const r = el("div", { class: "wg-lk-row", "data-noterm": "" }, items);
    setTimeout(() => { const n = r.querySelector(".is-now"); if (n && r.scrollWidth > r.clientWidth) r.scrollLeft = n.offsetLeft - r.clientWidth / 2 + n.clientWidth / 2; }, 80);
    return el("div", { class: "wg-lk-block" }, [el("p", { class: "wg-lk-label" }, [el("b", { text: label }), el("span", { text: hint })]), r]);
  };
  const off = ageOff(W), D = W.daeun, now = W.daeunNow;
  const dRow = rowOf("대운", "10년마다 바뀌는 큰 흐름", D.map((c) => col(c, `${c.age + off}세`, `${c.startYear}`, `대운 ${c.stemKr}${c.branchKr}(${c.stemH}${c.branchH}) · ${c.age + off}~${c.age + off + 9}세 (${c.startYear}~${c.startYear + 9})`)));
  const sRow = rowOf("세운", "1년의 흐름", W.seun.map((c) => col(c, `${c.year}`, `${c.age}세`, `${c.year}년 세운 ${c.stemKr}${c.branchKr}(${c.stemH}${c.branchH})`)));
  const mRow = rowOf("월운", `${W.wolun[0].year}년 열두 달 (절기 기준)`, W.wolun.map((c) => col(c, `${c.month}월`, "", `${c.year}년 ${c.month}월 월운 ${c.stemKr}${c.branchKr}(${c.stemH}${c.branchH})`)));
  const iRow = rowOf("일운", "오늘 앞뒤 일주일", W.ilun.map((c) => col(c, `${c.month}/${c.day}`, c.isNow ? "오늘" : c.dow, `${c.month}월 ${c.day}일(${c.dow}) 일운 ${c.stemKr}${c.branchKr}(${c.stemH}${c.branchH})`)));
  const cur = D[now], seNow = W.seun.find((x) => x.isNow), moNow = W.wolun.find((x) => x.isNow), dayNow = W.ilun.find((x) => x.isNow);
  if (dayNow) { setTimeout(() => { const b = all.find((x) => x.closest(".wg-lk-block:last-of-type") && x.classList.contains("is-now")); if (b) b.classList.add("is-sel"); }, 0); show(dayNow, `오늘 ${dayNow.month}월 ${dayNow.day}일 일운 ${dayNow.stemKr}${dayNow.branchKr}(${dayNow.stemH}${dayNow.branchH})`); }
  const nowLine = el("div", { class: "wg-now", "data-nokr": "", "data-noterm": "" }, [
    cur ? ["지금 대운", `${cur.stemKr}${cur.branchKr}`, `${cur.stemGod}·${cur.branchGod}`] : null,
    seNow ? [`${seNow.year}년`, `${seNow.stemKr}${seNow.branchKr}`, `${seNow.stemGod}·${seNow.branchGod}`] : null,
    moNow ? [`${moNow.month}월`, `${moNow.stemKr}${moNow.branchKr}`, `${moNow.stemGod}·${moNow.branchGod}`] : null,
    dayNow ? ["오늘", `${dayNow.stemKr}${dayNow.branchKr}`, `${dayNow.stemGod}·${dayNow.branchGod}`] : null,
  ].filter(Boolean).map(([k, v, g]) => el("div", { class: "wg-now-c" }, [el("span", { text: k }), el("b", { text: v }), el("small", { text: g })])));
  const DS = W.daeunStart;
  const ageToggle = el("div", { class: "wg-age", role: "group", "aria-label": "나이 기준", "data-noterm": "" }, [["kr", "한국나이"], ["man", "만나이"]].map(([k, t]) => el("button", { type: "button", class: "wg-age-b" + (ageMode() === k ? " on" : ""), onclick: () => { try { localStorage.setItem(AGE_KEY, k); } catch { /* ignore */ } window.dispatchEvent(new HashChangeEvent("hashchange")); } }, [el("span", { text: t })])));
  const exact = DS ? el("div", { class: "wg-exact" }, [
    el("div", {}, [el("span", { class: "wg-exact-k", text: "정확한 대운 시작" }), el("b", { text: `양력 ${DS.date}부터` }), el("small", { text: `${DS.after} · 10년 주기 · 대운수 ${DS.num} · ${DS.forward ? "순행" : "역행"}` })]),
    ageToggle,
  ]) : null;
  return section("wg-luck", "대운 · 세운 · 월운 · 일운", "운의 흐름", [
    nowLine, exact, dRow, sRow, mRow, iRow,
    el("p", { class: "wg-sub", text: "칸을 누르면 그 운의 십성·십이운성과 원국 글자와의 합·충·형이 아래에 나와요." }),
    detail,
    el("p", { class: "tiny muted", text: "운에서 들어온 글자가 원국의 두 글자와 만나 삼합·방합·삼형이 완성되면 그 운에서 해당 기운이 특히 크게 작용한다고 봐요. 방향을 보는 참고 정보예요." }),
  ]);
}

/* 머리 카드 — 일주 이름 · 태어난 시간 보정 ------------------- */
function headCard(W, navigate) {
  const H = W.head, my = getMyBirth() || {};
  const fix = H.timeKnown && H.trueTime ? `${my.birthTime} → ${H.trueTime}` : "시간 모름";
  const fixWhy = H.timeKnown ? `서울 경도 보정 ${H.lonCorr > 0 ? "+" : ""}${H.lonCorr}분 · 균시차 ${H.eot > 0 ? "+" : ""}${H.eot}분${H.dst ? " · 서머타임 −60분" : ""} = ${H.total > 0 ? "+" : ""}${H.total}분` : "태어난 시간을 모르면 시주를 비워요";
  return el("section", { class: "wrap wg-s" }, [el("div", { class: "panel wg-head", "data-nokr": "", "data-noterm": "" }, [
    el("div", { class: "wg-head-id" }, [
      el("p", { class: "eyebrow", text: `${H.animal} · ${my.gender === "male" ? "남성" : "여성"}` }),
      el("h2", { class: "serif wg-head-name", text: `${H.ilju} · ${H.monthDay}` }),
      el("p", { class: "wg-head-sub", text: `${W.dayMaster.kr}(${W.dayMaster.h}) 일간이 ${H.monthDay.split(" ")[0]}에 태어났어요` }),
    ]),
    el("div", { class: "wg-head-facts" }, [
      el("div", {}, [el("span", { text: "생일" }), el("b", { text: `양력 ${String(my.birthDate || "").replace(/-/g, ".")}` }), H.lunar && !H.lunar.startsWith(".") ? el("small", { text: `음력 ${H.lunar}` }) : null].filter(Boolean)),
      el("div", {}, [el("span", { text: "태어난 시간 → 사주 기준 시간" }), el("b", { text: fix }), el("small", { text: fixWhy })]),
      el("div", {}, [el("span", { text: "절기 기준 달" }), el("b", { text: H.jeolip || "-" }), el("small", { text: "사주의 달은 1일이 아니라 절기(節氣)로 바뀌어요" })]),
    ]),
  ])]);
}

/* 강약 · 격국 · 용희기구한 ----------------------------------- */
function strengthSection(W) {
  const SC = W.score, P = W.pillars;
  const body = el("div", { class: "wg-pw-body" });
  const tabsDef = [["score", "신강·신약"], ["gyeok", "격국 찾기"], ["yh", "용신·희신·기신"]];
  let cur = "score";
  const scoreView = () => {
    const cell = (c) => {
      const p = P[c.i];
      if (c.empty) return el("div", { class: "wg-sc-c empty" }, [el("span", { class: "wg2-none", text: "—" })]);
      const h = c.kind === "s" ? p.stemH : p.branchH, kr = c.kind === "s" ? p.stemKr : p.branchKr, elem = c.kind === "s" ? p.stemElem : p.branchElem;
      return el("div", { class: "wg-sc-c" + (c.me ? " me" : "") }, [
        el("span", { class: "wg-sc-pos", text: `${p.pos1}${c.kind === "s" ? "간" : "지"}${c.me ? " · 나" : ""}` }),
        el("span", { class: "wg-sc-tile" }, [tile(h, kr, elem, c.kind === "s" ? p.stemYY : BR_YY(p.branchKr), "md")]),
        el("span", { class: "wg-sc-god", text: c.me ? "기준" : c.god }),
        el("i", { class: "wg-sc-plus" + (c.help ? (c.partial ? " part" : "") : " off"), text: c.help ? (c.partial ? "조금 도움" : "도움") : "·", "aria-hidden": c.help ? "false" : "true" }),
        c.me ? el("span", { class: "wg-sc-pt muted", text: "—" }) : el("span", { class: "wg-sc-pt", text: `${c.score}/${c.max}점` }),
        c.me ? null : el("span", { class: "wg-sc-bar" }, [el("i", { style: `width:${c.max ? (c.score / c.max) * 100 : 0}%` })]),
      ].filter(Boolean));
    };
    const rowS = SC.cells.filter((c) => c.kind === "s"), rowB = SC.cells.filter((c) => c.kind === "b");
    const gauge = el("div", { class: "wg-gauge" }, [
      el("div", { class: "wg-gauge-bar" }, [el("i", { class: "wg-gauge-pin", style: `left:${Math.min(98, Math.max(2, SC.pct))}%` })]),
      el("div", { class: "wg-gauge-lab" }, SC.levels.map((t) => el("span", { class: t === SC.level ? "on" : "", text: t }))),
    ]);
    return [
      el("div", { class: "wg-sc-total" }, [el("b", { text: `${SC.total}점` }), el("span", { text: ` / ${SC.max}점 · ${SC.lean}` })]),
      gauge,
      el("div", { class: "wg-sc-grid", "data-nokr": "", "data-noterm": "" }, [...rowS.map(cell), ...rowB.map(cell)]),
      el("div", { class: "wg-sc-legend" }, [
        el("span", {}, [el("i", { class: "wg-sc-key", text: "도움" }), el("span", { text: "나(일간)에게 힘을 보태는 글자 (비겁·인성)" })]),
        el("span", {}, [el("i", { class: "wg-sc-key part", text: "조금 도움" }), el("span", { text: "속에 숨은 글자(지장간)가 조금 도와요" })]),
        el("span", {}, [el("i", { class: "wg-sc-key none", text: "표시 없음" }), el("span", { text: "내 힘을 쓰게 하는 글자 (0점)" })]),
      ]),
      el("p", { class: "tiny muted", text: `종합 판단(계절·뿌리까지 본 것): ${W.strength.level} — 점수식과 함께 참고해요.` }),
      more("신강신약 계산법 · 자리별 이유", [kv("계산법", SC.method), el("ul", { class: "wg-sc-why" }, SC.cells.filter((c) => !c.empty && !c.me).map((c) => el("li", {}, [el("b", { text: `${POS[c.i]} ${c.kind === "s" ? "천간" : "지지"} ${c.score}/${c.max}` }), el("span", { text: c.why })])))], { open: false }),
    ];
  };
  const gyeokView = () => {
    const G = W.gyeok; if (!G) return [el("p", { class: "muted", text: "월주가 없어 격국을 정할 수 없어요." })];
    return [
      el("p", { class: "wg-lead", text: G.what }),
      el("p", { class: "wg-sub", text: `${G.month} 속 글자(지장간) — 천간에 드러난 글자에 ✓` }), el("div", { class: "wg-gk-jj", "data-nokr": "" }, [...G.jijang.map((j) => el("span", { class: "wg-gk-j" + (j.shown ? " on" : "") }, [el("b", { text: j.h }), el("small", { text: `${j.kr} · ${j.role} · ${j.god}` }), j.shown ? el("i", { text: "✓ 투간" }) : null].filter(Boolean)))]),
      ...G.list.map((g, k) => el("article", { class: "wg-gk" + (k === 0 ? " main" : "") }, [
        el("div", { class: "wg-gk-top" }, [el("h4", { class: "serif", text: g.name }), k === 0 ? el("span", { class: "wg-st st-complete", text: "대표 격" }) : el("span", { class: "wg-st", text: "함께 드러난 격" })]),
        el("p", { class: "wg-gk-key", text: g.key }),
        el("p", { class: "wg-gk-basis", text: g.basis }),
        kv("잘 풀리는 조건", g.good), kv("흔들리는 조건", g.bad), ref(g.check),
      ])),
    ];
  };
  const yhView = () => [
    el("div", { class: "wg-yh" }, W.yonghui.map((y) => el("div", { class: `wg-yh-c r-${y.role}` }, [el("span", { class: "wg-yh-role", text: y.role }), el("span", { class: `wg-yh-dot t-${y.elem}` }), el("b", { text: y.kr }), el("small", { text: y.desc })]))),
    kv("어떻게 정했나요?", `${W.strength.yongsinDesc} 용신을 기준으로, 용신을 낳는 기운이 희신, 용신을 누르는 기운이 기신, 기신을 키우는 기운이 구신, 나머지가 한신이에요.`),
  ];
  const paint = () => { clear(body); body.append(...(cur === "score" ? scoreView() : cur === "gyeok" ? gyeokView() : yhView())); };
  const tabs = el("div", { class: "wg-tabs", role: "tablist", "data-noterm": "" }, tabsDef.map(([k, t]) => el("button", { type: "button", role: "tab", class: "wg-tab" + (k === cur ? " on" : ""), onclick: (e) => { cur = k; tabs.querySelectorAll(".wg-tab").forEach((b) => b.classList.toggle("on", b === e.currentTarget)); paint(); } }, [el("span", { text: t })])));
  paint();
  return section("wg-power", "강약 · 격국 · 용신", "내 사주의 힘과 중심", [tabs, body], "", `${SC.total}점 · ${SC.lean}${W.gyeok ? ` · ${W.gyeok.list[0].name}` : ""} · 용신 ${W.yonghui[0].kr}`);
}
