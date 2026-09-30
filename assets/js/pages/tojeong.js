import { el, clear, toast } from "../utils/dom.js";
import { backLink, pageHeader, noticeBox, loadDisclaimer } from "./_shared.js";
import { getMyBirth } from "../state.js";
import { computeSaju } from "../saju/manse.js";
import { tojeongYear } from "../saju/tojeong.js";
import { isUnlocked, unlock, getCoins, costOf } from "../wallet.js";

export function renderTojeong({ navigate }) {
  loadDisclaimer();
  const my = getMyBirth();
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(pageHeader("토정비결", "올해의 운세 흐름", "음력 생월·생일과 그해 태세로 괘를 세워 올해 흐름을 봅니다. 전통 방식을 따른 참고 해석이에요."));

  if (!my) {
    root.append(el("section", { class: "wrap section-gap" }, [
      noticeBox("info", "토정비결을 보려면 먼저 생년월일이 필요해요. 한 번 입력하면 저장됩니다."),
      el("button", { class: "btn btn-primary", onclick: () => navigate("/saju") }, [el("span", { text: "내 정보 입력하고 시작" })]),
    ]));
    return root;
  }

  const profile = computeSaju(my);
  const year = new Date().getFullYear();
  const itemId = `tojeong:${my.birthDate}:${year}`;
  const cost = costOf("tojeong");
  const host = el("section", { class: "wrap", style: "margin-top: var(--sp-2);" });
  root.append(host);

  function paint() {
    clear(host);
    if (!isUnlocked(itemId)) { host.append(lockCard()); return; }
    const r = tojeongYear(profile, year);
    host.append(view(r));
    host.append(noticeBox("info", "참고용 콘텐츠예요. 미래를 확정하지 않으며, 중요한 결정은 실제 정보와 함께 검토하세요."));
  }
  function lockCard() {
    const coins = getCoins();
    const box = el("div", { class: "panel premium-lock", style: "margin-top: var(--sp-4);" }, [
      el("span", { class: "lock-badge" }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: `코인 ${cost}개` })]),
      el("h3", { class: "serif", style: "margin-top:10px;", text: `${year}년 토정비결 열어 보기` }),
      el("p", { class: "muted", style: "font-size:var(--fs-sm);", text: "올해의 괘와 전체 흐름, 강조되는 달, 조언을 풀어 드려요. 한 번 열면 다시 볼 땐 무료예요." }),
    ]);
    if (coins >= cost) {
      const btn = el("button", { class: "btn btn-primary btn-block", style: "margin-top: var(--sp-4);", onclick: () => {
        const res = unlock(itemId, cost);
        if (res.ok) { toast(res.reason === "spent" ? "토정비결을 열었어요" : "이미 열어 둔 해석이에요."); paint(); }
        else { toast("코인이 부족해요."); navigate("/store"); }
      } }, [el("span", { text: `코인 ${cost}개로 열기 · 보유 ${coins}개` })]);
      box.append(btn);
    } else {
      box.append(el("p", { class: "muted tiny", style: "margin-top:8px;", text: `보유 코인 ${coins}개 · ${cost}개 필요해요.` }));
      box.append(el("button", { class: "btn btn-primary btn-block", style: "margin-top: var(--sp-3);", onclick: () => navigate("/store") }, [el("span", { text: "코인 받으러 가기" })]));
    }
    return box;
  }
  paint();
  return root;
}

function view(r) {
  const ring = el("div", { class: "score-ring", style: `--deg:${Math.round(r.score * 3.6)}deg;` }, [
    el("div", { class: "score-ring-in" }, [el("span", { class: "score-n", text: String(r.score) }), el("span", { class: "score-u", text: "점" })]),
  ]);
  return el("div", { class: "section-gap", style: "margin-top: var(--sp-4);" }, [
    el("div", { class: "panel", style: "text-align:center;" }, [
      el("p", { class: "eyebrow", style: "justify-content:center;", text: `${r.year}년 · 제 ${r.gwaeNo}괘` }),
      el("p", { class: "serif", style: "font-size:1.5rem; margin-top:8px;", text: `${r.palName} · ${r.palSym}` }),
      el("p", { class: "muted", style: "font-style:italic; margin-top:6px;", text: `“${r.verse}”` }),
      el("div", { style: "margin-top: var(--sp-4); display:flex; justify-content:center;" }, [ring]),
    ]),
    el("div", { class: "panel" }, [el("p", { style: "font-weight:600;", text: r.summary })]),
    block("올해 잘 풀리는 것", r.pros, "good"),
    block("올해 조심할 것", r.cons, "warn"),
    el("div", { class: "panel", style: "text-align:center;" }, [
      el("p", { class: "muted tiny", text: "흐름이 좋은 달" }),
      el("p", { class: "serif", style: "font-size:1.2rem; margin-top:4px;", text: r.goodMonths.map((m) => m + "월").join(" · ") }),
    ]),
    el("div", { class: "insight", text: r.advice }),
    el("div", { class: "lucky-row" }, [
      el("span", { class: "lucky-chip" }, [el("b", { text: "행운색 " }), el("span", { text: r.luckyColor })]),
      el("span", { class: "lucky-chip" }, [el("b", { text: "행운 기운 " }), el("span", { text: r.luckyElem })]),
    ]),
  ]);
}
function block(label, items, tag) {
  return el("div", { class: `block tag-${tag}` }, [el("span", { class: "block-label" }, [el("span", { text: label })]), ...items.map((t) => el("p", { text: t }))]);
}
