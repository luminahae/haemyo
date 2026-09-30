/* 저장된 결과 열기 — 타입에 따라 사주/타로 렌더로 분기 */
import { el } from "../utils/dom.js";
import { icon } from "../utils/icons.js";
import { getResult } from "../state.js";
import { buildSajuReportNode } from "./sajuResult.js";
import { buildTarotReadingNode } from "./tarotResult.js";
import { buildCompatNode } from "./compatResult.js";
import { buildZiweiNode } from "./ziweiResult.js";
import { loadTarotData } from "../tarot/deck.js";
import { pageHeader, backLink } from "./_shared.js";

export function renderResultById({ navigate, id }) {
  const r = getResult(id);
  if (!r) {
    return el("div", {}, [
      el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/saved", "저장함")]),
      pageHeader("", "결과를 찾을 수 없어요", "이미 삭제되었거나 다른 기기에서 저장된 결과일 수 있습니다."),
    ]);
  }

  if (r.type === "saju") {
    return buildSajuReportNode(
      { input: r.input, profile: r.profile, report: r.report },
      { navigate, saved: true, savedId: r.id }
    );
  }

  if (r.type === "compat") {
    return buildCompatNode(
      { result: r.result, nameA: r.nameA, nameB: r.nameB, pa: r.pa, pb: r.pb, genderA: r.genderA, genderB: r.genderB },
      { navigate, saved: true, savedId: r.id }
    );
  }

  if (r.type === "ziwei") {
    return buildZiweiNode(
      { z: r.z, input: r.input },
      { navigate, saved: true, savedId: r.id }
    );
  }

  // tarot — 저장된 reading 사용. 카드 아트 렌더에 필요한 데이터가 self-contained.
  const root = el("div", {});
  root.append(el("div", { class: "wrap" }, [el("h1", { class: "sr-only", text: "타로 리딩" })]));
  loadTarotData().then(() => {
    root.replaceChildren(buildTarotReadingNode(r.reading, { navigate, saved: true, savedId: r.id }));
  });
  return root;
}
