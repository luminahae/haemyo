import { el, clear, toast } from "../utils/dom.js";
import { grantOnce, isAdmin } from "../wallet.js";
import { getReviews, hasWrittenReview, submitReview, deleteReview } from "../reviews.js";
import { pageHeader, backLink, noticeBox, formatDate } from "./_shared.js";

const REWARD = 10;

export function renderReviews({ navigate }) {
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(pageHeader("해묘 후기", "후기 남기고 코인 받기", "서비스를 이용한 느낌을 들려주세요. 첫 후기 작성 시 코인 10개를 드려요."));

  const composeHost = el("section", { class: "wrap" });
  const listHost = el("section", { class: "wrap section-gap", style: "margin-top: var(--sp-5);" });
  root.append(composeHost, listHost);

  function paint() {
    clear(composeHost); clear(listHost);
    composeHost.append(reviewForm(paint));
    listHost.append(reviewList(paint));
  }
  paint();
  return root;
}

function reviewForm(repaint) {
  const alreadyWritten = hasWrittenReview();
  const box = el("div", { class: "panel panel-gold" });
  const ratingLabel = el("p", { class: "muted tiny", style: "margin-top:6px;", text: "별점을 선택해 주세요." });
  let rating = 0;
  const stars = Array.from({ length: 5 }, (_, i) => el("button", {
    class: "review-star", type: "button", "aria-label": `${i + 1}점`, "aria-pressed": "false",
    onclick: () => {
      rating = i + 1;
      stars.forEach((star, n) => { star.classList.toggle("on", n < rating); star.setAttribute("aria-pressed", n < rating ? "true" : "false"); });
      ratingLabel.textContent = `${rating}점 · 고마워요!`;
    },
  }, [el("span", { text: "★" })]));
  const nickname = el("input", { class: "input", type: "text", maxlength: "16", placeholder: "닉네임 (선택)", autocomplete: "nickname" });
  const content = el("textarea", { class: "input", maxlength: "500", rows: "5", placeholder: "해묘를 이용해 본 느낌을 20자 이상 남겨 주세요.", "aria-label": "후기 내용" });
  const counter = el("p", { class: "muted tiny", style: "text-align:right; margin-top:5px;", text: "0 / 500" });
  const error = el("p", { class: "field-error", "aria-live": "polite", style: "margin-top:8px;" });
  content.addEventListener("input", () => { counter.textContent = `${content.value.length} / 500`; });
  const submit = el("button", { class: "btn btn-primary btn-block", type: "button", style: "margin-top: var(--sp-3);" }, [
    el("span", { text: alreadyWritten ? "후기 등록하기" : `후기 등록하고 코인 +${REWARD} 받기` }),
  ]);
  submit.addEventListener("click", () => {
    const result = submitReview({ rating, nickname: nickname.value, content: content.value });
    if (!result.ok) { error.textContent = result.message; return; }
    const reward = grantOnce("review:write", REWARD, { kind: "review" });
    toast(reward.ok ? `후기 등록 완료 · 코인 +${REWARD}` : "후기가 등록됐어요. 후기 보상은 이미 받으셨어요.");
    repaint();
  });

  box.append(
    el("div", { style: "display:flex; justify-content:space-between; gap:12px; align-items:flex-start;" }, [
      el("div", {}, [
        el("p", { style: "font-weight:700;", text: "이용 후기를 들려주세요" }),
        el("p", { class: "muted tiny", style: "margin-top:4px;", text: alreadyWritten ? "후기는 더 남길 수 있어요. 보상은 이 프로필(로그인 전에는 이 브라우저) 기준 1회예요." : "첫 후기 등록을 완료하면 코인 10개가 즉시 지급돼요." }),
      ]),
      el("span", { class: "review-reward", text: `+${REWARD} 코인` }),
    ]),
    el("div", { class: "review-stars", role: "group", "aria-label": "별점", style: "margin-top: var(--sp-4);" }, stars),
    ratingLabel,
    el("label", { class: "sr-only", for: "review-nickname", text: "닉네임" }), nickname,
    content, counter, error, submit,
  );
  nickname.id = "review-nickname";
  return box;
}

function reviewList(repaint) {
  const reviews = getReviews();
  const host = el("div", {});
  host.append(
    el("div", { style: "display:flex; justify-content:space-between; align-items:baseline; margin-bottom: var(--sp-3);" }, [
      el("h2", { style: "font-size:1.1rem;", text: "후기 보기" }),
      el("span", { class: "muted tiny", text: `${reviews.length}개` }),
    ]),
    noticeBox("info", "현재 정적 버전에서는 이 기기에 작성된 후기만 보입니다. 모든 이용자의 후기를 함께 보이게 하려면 클라우드 저장 기능을 연결해야 해요."),
  );
  if (!reviews.length) {
    host.append(el("div", { class: "panel", style: "margin-top: var(--sp-3); text-align:center;" }, [
      el("p", { style: "font-weight:700;", text: "아직 작성된 후기가 없어요" }),
      el("p", { class: "muted tiny", style: "margin-top:6px;", text: "첫 번째 후기를 남겨 해묘에게 힘을 주세요." }),
    ]));
    return host;
  }
  host.append(el("div", { class: "review-list", style: "margin-top: var(--sp-3);" }, reviews.map((r) => reviewCard(r, repaint))));
  return host;
}

function reviewCard(review, repaint) {
  // 확인 창(confirm)은 일부 환경(미리보기·앱 안 웹뷰)에서 막혀 있어서, 버튼을 두 번 누르는 방식으로 확인한다
  let adminBar = null;
  if (isAdmin()) {
    const label = el("span", { text: "관리자 · 삭제" });
    const btn = el("button", { class: "btn btn-quiet btn-sm", type: "button" }, [label]);
    let armed = false, timer = null;
    btn.addEventListener("click", () => {
      if (!armed) {
        armed = true; label.textContent = "한 번 더 누르면 삭제"; btn.style.color = "var(--c-danger)";
        timer = setTimeout(() => { armed = false; label.textContent = "관리자 · 삭제"; btn.style.color = ""; }, 4000);
        return;
      }
      clearTimeout(timer);
      deleteReview(review.id); toast("후기를 삭제했어요."); repaint();
    });
    adminBar = el("div", { style: "display:flex; justify-content:flex-end; margin-top:10px;" }, [btn]);
  }
  return el("article", { class: "panel review-card" }, [
    el("div", { style: "display:flex; justify-content:space-between; gap:12px; align-items:baseline;" }, [
      el("p", { style: "font-weight:700;", text: review.nickname }),
      el("span", { class: "muted tiny", text: formatDate(review.createdAt) }),
    ]),
    el("p", { class: "review-rating", "aria-label": `별점 ${review.rating}점`, text: "★".repeat(review.rating) + "☆".repeat(5 - review.rating) }),
    el("p", { style: "white-space:pre-wrap; margin-top:8px; line-height:1.65;", text: review.content }),
    adminBar,
  ].filter(Boolean));
}
