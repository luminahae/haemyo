import { el } from "../utils/dom.js";
import { icon } from "../utils/icons.js";
import { pageHeader, backLink, noticeBox, loadDisclaimer } from "./_shared.js";

export function renderAbout({ navigate }) {
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(pageHeader("ABOUT", "이용 안내 및 면책", "이 서비스를 어떻게 읽으면 좋은지 안내합니다."));

  const body = el("div", { class: "wrap section-gap" });
  root.append(body);

  body.append(
    card("이 서비스는 무엇인가요?", [
      "사주와 타로를 통해 당신의 성격·인간관계·연애·결혼·직업·금전 습관을 현실적으로 돌아보는 자기이해형 콘텐츠입니다.",
      "막연한 길흉 판단이 아니라, 반복되는 행동 패턴과 선택 방식을 점검하는 데 초점을 둡니다.",
    ]),
    card("결과를 읽을 때 기억해 주세요", [
      "좋은 말만 반복하지 않습니다. 장점의 부작용과 조심할 지점도 함께 다룹니다.",
      "부정적으로 보이는 해석에는 반드시 현실적인 대응 방법을 함께 제시합니다.",
      "누구에게나 적용되는 일반적인 문장보다, 구체적인 상황과 행동을 이야기하려 합니다.",
    ]),
  );

  loadDisclaimer().then((d) => {
    body.append(
      el("div", { class: "panel section-gap" }, [
        el("h3", { text: "면책 안내" }),
        el("p", { text: d.full }),
      ]),
      noticeBox("warn", d.demoNotice),
    );
    body.append(
      el("div", { class: "panel section-gap" }, [
        el("h3", { text: "이번 버전에서 제공하지 않는 것" }),
        el("ul", {}, ["결제·유료 기능", "소셜 로그인·회원가입", "커뮤니티·채팅 상담", "푸시 알림"].map((t) => el("li", { text: t }))),
        el("p", { class: "tiny muted", text: "핵심 기능은 로그인 없이 이용할 수 있습니다." }),
      ]),
      el("div", { class: "btn-row", style: "margin-top: var(--sp-4);" }, [
        el("a", { href: "#/privacy", class: "btn btn-ghost btn-sm", text: "개인정보 처리 안내" }),
        el("a", { href: "#/", class: "btn btn-quiet btn-sm", text: "홈으로" }),
      ]),
    );
  });

  return root;
}

function card(title, paras) {
  return el("div", { class: "panel section-gap" }, [
    el("h3", { text: title }),
    ...paras.map((p) => el("p", { class: "muted", text: p })),
  ]);
}
