import { el } from "../utils/dom.js";
import { icon } from "../utils/icons.js";
import { pageHeader, backLink, loadDisclaimer } from "./_shared.js";

export function renderPrivacy({ navigate }) {
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(pageHeader("PRIVACY", "개인정보 처리 안내", "무엇을, 어디에, 왜 저장하는지 투명하게 안내합니다."));

  const body = el("div", { class: "wrap section-gap" });
  root.append(body);

  loadDisclaimer().then((d) => {
    body.append(
      el("div", { class: "panel section-gap" }, [
        el("div", { style: "display:flex; gap:10px; align-items:center; color:var(--c-gold);" }, [icon("shield"), el("h3", { style: "color:var(--c-text);", text: "핵심 원칙" })]),
        el("ul", { style: "display:grid; gap:10px;" }, d.privacy.map((t) => el("li", { text: t }))),
      ]),
      el("div", { class: "panel section-gap" }, [
        el("h3", { text: "어떤 정보를 다루나요?" }),
        kv("생년월일 · 출생 시간", "성향 계산에만 사용. 민감정보로 취급하며 서버로 보내지 않습니다."),
        kv("이름/닉네임", "결과 표시와 공유 이미지에만 사용. 실명이 아니어도 됩니다."),
        kv("저장한 결과", "이 브라우저의 localStorage에만 보관. 언제든 저장함에서 삭제할 수 있습니다."),
        kv("입력 임시값", "편의를 위해 현재 세션에만 임시 저장(sessionStorage)되며, 탭을 닫으면 사라집니다."),
      ]),
      el("div", { class: "panel section-gap" }, [
        el("h3", { text: "공유 이미지와 개인정보" }),
        el("p", { class: "muted", text: "공유용 이미지에는 생년월일 전체가 기본적으로 표시되지 않습니다. 예: ‘1994년생 · 출생 시간 미공개 · 닉네임만 표시’ 형태로 노출됩니다." }),
      ]),
      el("div", { class: "panel section-gap" }, [
        el("h3", { text: "데이터 삭제" }),
        el("p", { class: "muted", text: "저장함에서 개별 결과 또는 전체 결과를 즉시 삭제할 수 있습니다. 브라우저의 사이트 데이터 삭제로도 모든 저장 내용이 제거됩니다." }),
        el("a", { href: "#/saved", class: "btn btn-ghost btn-sm", style: "margin-top: var(--sp-2);", text: "저장함으로 이동" }),
      ]),
    );
  });

  return root;
}

function kv(k, v) {
  return el("div", {}, [
    el("p", { style: "font-weight:600;", text: k }),
    el("p", { class: "muted", style: "font-size:var(--fs-sm);", text: v }),
  ]);
}
