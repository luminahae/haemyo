import { el, prefersReducedMotion } from "../utils/dom.js";
import { stash, unstash } from "../state.js";
import { computeSaju } from "../saju/manse.js";
import { buildSajuReport } from "../saju/report.js";

let sectionsDef = null;
async function loadSections() {
  if (sectionsDef) return sectionsDef;
  sectionsDef = await fetch(new URL("../../data/saju-sections.json", import.meta.url)).then((r) => r.json());
  return sectionsDef;
}

const STEPS = [
  "절기와 삭을 계산해 명식을 세우는 중…",
  "오행의 균형과 일간을 읽는 중…",
  "인간관계·연애 패턴을 살피는 중…",
  "현실적인 조언을 다듬는 중…",
];

export async function renderSajuLoading({ navigate, mount }) {
  const input = unstash("saju:input");
  if (!input) { navigate("/saju"); return; }

  const stepText = el("p", { class: "muted", text: STEPS[0], "aria-live": "polite" });
  const view = el("div", { class: "wrap" }, [
    el("div", { class: "loader" }, [
      el("div", { class: "loader-orbit" }, [el("span", { class: "loader-dot" })]),
      el("div", {}, [
        el("h1", { class: "serif", style: "font-size: var(--fs-h2);", text: "리포트를 준비하고 있어요" }),
        stepText,
      ]),
    ]),
  ]);
  mount(view, { noFocus: true });

  const sections = await loadSections();
  const profile = computeSaju(input);
  const report = buildSajuReport(profile, input, sections);
  stash("saju:result", { input, profile, report });

  if (prefersReducedMotion()) {
    navigate("/saju/result");
    return;
  }

  // 짧은 단계 애니메이션 후 이동
  let i = 0;
  const iv = setInterval(() => {
    i++;
    if (i < STEPS.length) stepText.textContent = STEPS[i];
    else { clearInterval(iv); navigate("/saju/result"); }
  }, 460);

  return () => clearInterval(iv);
}
