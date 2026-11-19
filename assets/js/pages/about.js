import { el, icon, clear, toast } from "../utils/dom.js";
import { pageHeader, backLink, noticeBox, loadDisclaimer, formatDate } from "./shared.js";
import { grantOnce, isAdmin } from "../wallet.js";
import { getReviews, hasWrittenReview, submitReview, deleteReview } from "../state.js";
import { isCloudEnabled, getUser as getCloudUser, adminListUsers, cloudAddReview, cloudListReviews, cloudDeleteReview, sendInquiry, myInquiries, adminInquiries, adminReplyInquiry, deleteInquiry } from "../cloud.js";
export function renderAbout({ navigate }) {
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(pageHeader("ABOUT", "이용 안내 · 도움말", "사용 방법, 자주 묻는 질문, 결과를 읽는 법과 면책 안내예요."));

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

  // 도움말 — 자주 묻는 질문 (사용성 10원칙: 도움말과 문서화)
  const FAQ = [
    ["코인은 어떻게 쓰이나요?", "풀이를 처음 열 때만 코인이 빠지고, 한 번 연 풀이는 다시 볼 때 무료예요. 오른쪽 위 동그란 숫자가 지금 남은 코인이에요. 코인 5개 이상 쓰는 버튼은 실수 방지를 위해 한 번 더 눌러야 진행돼요."],
    ["코인은 어디서 받나요?", "충전소에서 매일 출석하면 무료 코인을 받고, 후기를 남기거나 쿠폰·코드를 입력해도 받을 수 있어요."],
    ["날짜를 누르면 나오는 하루 운세는?", "만세력 일진 달력에서 날짜를 누르면 그날의 운세가 떠요. 오늘은 무료, 다른 날은 코인 1개예요. 운세 캘린더에서 이미 연 날은 추가 코인 없이 볼 수 있어요."],
    ["다른 사람 기준으로 보고 싶어요", "홈·운세·마이의 ‘누구로 볼까?’ 줄에서 내 사람을 누르면 그 사람 시점으로 모든 운세를 볼 수 있어요. 위쪽 띠의 ‘내 시점으로’를 누르면 돌아와요."],
    ["친구는 어떻게 추가하나요?", "내 사람 › ‘+ 친구 추가’에서 초대 링크(무료) 또는 직접 입력(코인)으로 추가해요. 궁합 등에서 새 사람을 직접 입력하면 코인 10개가 들고, 그 사람은 내 사람에 바로 저장돼요. 이미 저장한 사람을 고르면 무료예요."],
    ["친구를 잘못 지웠어요", "삭제 직후 아래에 뜨는 ‘되돌리기’를 누르면 바로 되살릴 수 있어요. 정보가 틀렸다면 카드의 ‘정보 수정’으로 고치면 돼요."],
    ["태어난 시간을 몰라요", "‘시간 모름’을 체크하면 시주(時柱)를 빼고 봐요. 자시(子時)·축시(丑時)처럼 시진만 알면 시진 버튼을 눌러도 돼요."],
    ["내 정보는 어디에 저장되나요?", "로그인하면 내 정보·내 사람·코인·저장한 풀이가 내 계정(Google Firebase 클라우드)에 저장돼서 다른 기기에서도 이어서 볼 수 있어요. 내 계정 데이터는 나와 (문의·오류 확인이 필요할 때) 관리자만 볼 수 있고, 마이 › 회원 탈퇴로 언제든 모두 지울 수 있어요 (탈퇴 후 7일, 최대 30일간 보관되다 자동 삭제). 로그인 전 정보는 이 브라우저에만 있어요."],
  ];
  body.append(el("div", { class: "panel section-gap" }, [
    el("h3", { text: "자주 묻는 질문" }),
    ...FAQ.map(([q, a]) => el("details", { class: "faq-item" }, [el("summary", { text: q }), el("p", { class: "muted", style: "font-size:var(--fs-sm); margin-top:6px;", text: a })])),
  ]));

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
        el("ul", {}, ["코인 충전 결제", "푸시 알림"].map((t) => el("li", { text: t }))),
        el("p", { class: "tiny muted", text: "타로·무료 운세는 로그인 없이, 사주·궁합처럼 내 정보를 저장하는 풀이는 Google·이메일 로그인 후 이용할 수 있어요." }),
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

/* ---- 개인정보 (합침) ---- */

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
        kv("생년월일 · 출생 시간", "성향 계산에만 사용해요. 로그인한 경우 기기 간 이어보기를 위해 내 계정(Firebase 클라우드)에 저장되며, 본인과 (문의·오류 확인이 필요할 때) 관리자만 볼 수 있어요."),
        kv("이름/닉네임 · 이메일", "닉네임은 결과 표시와 공유 이미지에, 이메일은 로그인에만 사용해요. 닉네임은 실명이 아니어도 돼요."),
        kv("열어 본 풀이 · 보관함", "열어 본 풀이는 7일 동안, 보관한 풀이는 계속 내 계정에 남아요. 마이 › 보관함에서 지우거나, 회원 탈퇴로 계정과 함께 모두 삭제할 수 있어요 (탈퇴 후 7일, 최대 30일 보관 뒤 자동 삭제)."),
        kv("탈퇴 · 삭제 후 보관", "개인정보는 탈퇴 후 7일, 최대 30일간 보관되다 자동으로 삭제돼요."),
        kv("실수로 삭제한 계정 복구", "실수로 삭제한 계정은 삭제 후 7일 안에 1:1 문의로 요청하면 복구할 수 있어요. 7일이 지나면 정보가 완전히 지워져 복구할 수 없어요."),
        kv("관리자 열람", "관리자는 고객 문의·코인 오류 확인을 위해 필요시 열람 기록(언제, 코인 사용 여부 등)을 볼 수 있어요."),
        kv("후기 · 1:1 문의", "후기는 모든 이용자에게 공개돼요. ‘익명으로 올리기’를 고르거나 닉네임을 비우면 닉네임·계정 이름이 보이지 않아요. 1:1 문의는 나와 관리자만 볼 수 있어요."),
      ]),
      el("div", { class: "panel section-gap" }, [
        el("h3", { text: "공유 이미지와 개인정보" }),
        el("p", { class: "muted", text: "공유용 이미지에는 생년월일 전체가 기본적으로 표시되지 않습니다. 예: ‘1994년생 · 출생 시간 미공개 · 닉네임만 표시’ 형태로 노출됩니다." }),
      ]),
      el("div", { class: "panel section-gap" }, [
        el("h3", { text: "데이터 삭제" }),
        el("p", { class: "muted", text: "마이 › 보관함에서 보관한 풀이를 바로 지울 수 있어요. 계정까지 지우려면 마이 › 계정 관리 › 회원 탈퇴를 누르면 클라우드에 저장된 내 정보도 7일, 최대 30일간 보관되다 자동으로 삭제돼요." }),
        el("a", { href: "#/saved", class: "btn btn-ghost btn-sm", style: "margin-top: var(--sp-2);", text: "마이 › 보관함으로 이동" }),
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

/* ---- 404 (합침) ---- */

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

/* ===== (합침) reviews.js ===== */
const REWARD = 10;

export function renderReviews({ navigate }) {
  CLOUD_REVIEWS = null; MY_UID = undefined; // 계정이 바뀌었을 수 있으니 매번 새로
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(pageHeader("해묘 후기", "후기 남기고 코인 받기", "서비스를 이용한 느낌을 들려주세요. 첫 후기 작성 시 코인 10개를 드려요."));

  root.append(el("section", { class: "wrap", style: "margin-bottom: var(--sp-5);" }, [reviewShowcase(navigate, { title: "다른 분들의 후기" })]));
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
  if (isCloudEnabled() && MY_UID === null) {
    box.append(el("p", { style: "font-weight:800;", text: "로그인하면 후기를 남길 수 있어요" }),
      el("p", { class: "muted tiny", style: "margin-top:6px;", text: "게스트로 시작해도 돼요. 게스트 후기는 ‘게스트’ 표시가 붙어요." }),
      el("button", { class: "btn btn-primary btn-block", style: "margin-top:12px;", onclick: () => { location.hash = "#/profile"; } }, [el("span", { text: "로그인 · 게스트로 시작하기" })]));
    return box;
  }
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
  const nickname = el("input", { class: "input", type: "text", maxlength: "16", placeholder: "닉네임 (안 적으면 '익명'으로 올라가요)", autocomplete: "off" });
  const anonBox = el("input", { type: "checkbox", id: "review-anon" });
  anonBox.addEventListener("change", () => { nickname.disabled = anonBox.checked; if (anonBox.checked) nickname.value = ""; });
  const anonRow = el("label", { class: "rv-anon", for: "review-anon" }, [anonBox, el("span", { text: "익명으로 올리기" }), el("small", { text: "닉네임·계정 이름이 보이지 않아요" })]);
  const content = el("textarea", { class: "input", maxlength: "500", rows: "5", placeholder: "해묘를 이용해 본 느낌을 20자 이상 남겨 주세요.", "aria-label": "후기 내용" });
  const counter = el("p", { class: "muted tiny", style: "text-align:right; margin-top:5px;", text: "0 / 500" });
  const error = el("p", { class: "field-error", "aria-live": "polite", style: "margin-top:8px;" });
  content.addEventListener("input", () => { counter.textContent = `${content.value.length} / 500`; });
  const submit = el("button", { class: "btn btn-primary btn-block", type: "button", style: "margin-top: var(--sp-3);" }, [
    el("span", { text: alreadyWritten ? "후기 등록하기" : `후기 등록하고 코인 +${REWARD} 받기` }),
  ]);
  submit.addEventListener("click", () => {
    const result = submitReview({ rating, nickname: nickname.value, content: content.value, anon: anonBox.checked });
    if (!result.ok) { error.textContent = result.message; return; }
    cloudAddReview(result.review).then((cr) => { if (cr && cr.error && cr.error !== "login") toast(cr.error); CLOUD_REVIEWS = null; repaint(); }).catch(() => {});
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
    el("label", { class: "sr-only", for: "review-nickname", text: "닉네임" }), nickname, anonRow,
    content, counter, error, submit,
  );
  nickname.id = "review-nickname";
  return box;
}

let CLOUD_REVIEWS = null, MY_UID = undefined;
function reviewList(repaint) {
  const cloud = isCloudEnabled();
  // 클라우드를 쓰면 서버의 후기만 — 이 기기에 남은 예전(다른 계정) 후기가 섞여 '내 후기'처럼 보이지 않게
  const reviews = (cloud ? (CLOUD_REVIEWS || []) : getReviews()).slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (CLOUD_REVIEWS === null && cloud) { CLOUD_REVIEWS = []; cloudListReviews().then((l) => { CLOUD_REVIEWS = l || []; repaint(); }); }
  if (MY_UID === undefined && cloud) { MY_UID = null; getCloudUser().then((u) => { MY_UID = (u && u.uid) || null; repaint(); }).catch(() => {}); }
  const host = el("div", {});
  host.append(
    el("div", { style: "display:flex; justify-content:space-between; align-items:baseline; margin-bottom: var(--sp-3);" }, [
      el("h2", { style: "font-size:1.1rem;", text: "후기 보기" }),
      el("span", { class: "muted tiny", text: `${reviews.length}개` }),
    ]),
    ...(isCloudEnabled() ? [] : [noticeBox("info", "지금은 이 기기에 작성된 후기만 보여요.")]),
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
  // 지우기: 관리자는 전부, 작성자는 '그 계정으로 로그인해 있을 때'만 (게스트가 로그아웃하면 관리자만 지울 수 있음)
  // 확인 창(confirm)은 일부 환경에서 막혀 있어서, 버튼을 두 번 누르는 방식
  let bar = null;
  const mine = !!(MY_UID && review.uid && review.uid === MY_UID);
  if (isAdmin() || mine) {
    const base = isAdmin() && !mine ? "관리자 · 삭제" : "내 후기 삭제";
    const label = el("span", { text: base });
    const btn = el("button", { class: "btn btn-quiet btn-sm", type: "button" }, [label]);
    let armed = false, timer = null;
    btn.addEventListener("click", async () => {
      if (!armed) { armed = true; label.textContent = "한 번 더 누르면 삭제"; btn.style.color = "var(--c-danger)"; timer = setTimeout(() => { armed = false; label.textContent = base; btn.style.color = ""; }, 4000); return; }
      clearTimeout(timer);
      await cloudDeleteReview(review.id); deleteReview(review.id); CLOUD_REVIEWS = (CLOUD_REVIEWS || []).filter((r) => r.id !== review.id); toast("후기를 삭제했어요."); repaint();
    });
    bar = el("div", { style: "display:flex; justify-content:flex-end; margin-top:10px;" }, [btn]);
  }
  return el("article", { class: "panel review-card" }, [
    el("div", { style: "display:flex; justify-content:space-between; gap:12px; align-items:baseline;" }, [
      el("p", { class: "rv-name" }, [el("span", { text: review.nickname || "익명의 해묘 친구" }), review.guest ? el("i", { class: "rv-guest", text: "게스트" }) : null, mine ? el("i", { class: "rv-mine", text: "내 후기" }) : null].filter(Boolean)),
      el("span", { class: "muted tiny", text: formatDate(review.createdAt) }),
    ]),
    el("p", { class: "review-rating", "aria-label": `별점 ${review.rating}점`, text: "★".repeat(review.rating) + "☆".repeat(5 - review.rating) }),
    el("p", { style: "white-space:pre-wrap; margin-top:8px; line-height:1.65;", text: review.content }),
    bar,
  ].filter(Boolean));
}

/* ===== 1:1 문의 (HAE) — 회원: 보내기 · 내 문의와 답변 / 관리자: 받은 문의 · 답변 · 후기 모아 보기 ===== */
const INQ_CATS = ["코인·결제", "오류 신고", "풀이 질문", "제안", "기타"];
const SEEN_KEY = "str.inqseen.v1";
const seenIds = () => { try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]")); } catch { return new Set(); } };
const markSeen = (ids) => { try { const s = seenIds(); ids.forEach((i) => s.add(i)); localStorage.setItem(SEEN_KEY, JSON.stringify([...s].slice(-200))); } catch { /* ignore */ } };
/** 새로 도착한 답변 수 (마이 화면 배지용) */
export async function unreadReplies() {
  if (!isCloudEnabled()) return 0;
  const l = await myInquiries().catch(() => null); if (!l) return 0;
  const s = seenIds(); return l.filter((q) => q.status === "done" && !s.has(q.id + ":" + q.repliedAt)).length;
}
const fmtT = (t) => { const d = new Date(t); return `${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

export function renderInquiry({ navigate }) {
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/profile", "마이")]));
  const admin = isAdmin();
  root.append(pageHeader(admin ? "관리자" : "고객센터", admin ? "문의 · 후기 관리" : "1:1 문의", admin ? "받은 문의에 답하고, 남겨진 후기를 한눈에 봐요." : "궁금한 점·불편한 점을 남겨 주세요. 답변이 오면 여기와 마이 화면에 알려 드려요."));
  const host = el("section", { class: "wrap section-gap" });
  root.append(host);
  if (!isCloudEnabled()) { host.append(noticeBox("info", "지금 버전은 클라우드 연결 전이라 문의를 보낼 수 없어요.")); return root; }
  host.append(el("p", { class: "muted center", text: "불러오는 중…" }));
  getCloudUser().then((u) => {
    clear(host);
    if (!u) {
      host.append(el("div", { class: "panel iq-login" }, [
        el("p", { style: "font-weight:800;", text: "로그인하면 문의를 남길 수 있어요" }),
        el("p", { class: "muted tiny", style: "margin-top:6px;", text: "답변을 내 계정으로 받아야 해서 로그인(게스트도 가능)이 필요해요." }),
        el("button", { class: "btn btn-primary btn-block", style: "margin-top:12px;", onclick: () => navigate("/profile") }, [el("span", { text: "로그인하러 가기" })]),
      ]));
      return;
    }
    if (admin) adminInbox(host); else userInquiry(host, u);
  });
  return root;
}

function userInquiry(host, u) {
  let cat = INQ_CATS[0];
  const chips = el("div", { class: "iq-cats", role: "radiogroup", "aria-label": "문의 종류" });
  const paintCats = () => { clear(chips); INQ_CATS.forEach((c) => chips.append(el("button", { type: "button", role: "radio", "aria-checked": String(c === cat), class: "iq-cat" + (c === cat ? " on" : ""), onclick: () => { cat = c; paintCats(); } }, [el("span", { text: c })]))); };
  paintCats();
  const title = el("input", { class: "input", type: "text", maxlength: "60", placeholder: "제목 (예: 코인이 안 들어왔어요)" });
  const body = el("textarea", { class: "input", rows: "6", maxlength: "2000", placeholder: "자세히 적어 주실수록 빨리 도와드릴 수 있어요. (언제 · 어떤 화면에서 · 무엇이)" });
  const err = el("p", { class: "field-error", "aria-live": "polite" });
  const send = el("button", { class: "btn btn-primary btn-block", type: "button" }, [el("span", { text: "문의 보내기" })]);
  const listHost = el("div", { class: "iq-list" });
  send.addEventListener("click", async () => {
    const t = title.value.trim(), b = body.value.trim();
    if (t.length < 2) { err.textContent = "제목을 2자 이상 적어 주세요."; return; }
    if (b.length < 10) { err.textContent = "내용을 10자 이상 적어 주세요."; return; }
    err.textContent = ""; send.disabled = true;
    let name = ""; try { const pid = localStorage.getItem("str.activeProfile.v1"); const ps = JSON.parse(localStorage.getItem("str.profiles.v1") || "[]"); name = (ps.find((x) => x.id === pid) || {}).name || ""; } catch { /* ignore */ }
    const r = await sendInquiry({ cat, title: t, body: b, name });
    send.disabled = false;
    if (r.error) { err.textContent = r.error === "login" ? "먼저 로그인해 주세요." : r.error; return; }
    title.value = ""; body.value = ""; toast("문의를 보냈어요. 답변이 오면 알려 드릴게요."); loadList();
  });
  host.append(el("div", { class: "panel iq-form" }, [
    el("p", { class: "iq-h", text: "무엇을 도와드릴까요?" }), chips, title, body, err, send,
    el("p", { class: "muted tiny", style: "text-align:center;", text: "보낸 문의는 나와 관리자만 볼 수 있어요." }),
  ]), el("p", { class: "iq-h2", text: "내 문의" }), listHost);
  async function loadList() {
    clear(listHost); listHost.append(el("p", { class: "muted tiny center", text: "불러오는 중…" }));
    const l = await myInquiries();
    clear(listHost);
    if (!l) { listHost.append(noticeBox("info", "문의 목록을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.")); return; }
    if (!l.length) { listHost.append(el("div", { class: "iq-empty" }, [el("p", { text: "아직 보낸 문의가 없어요" })])); return; }
    const before = seenIds();
    l.forEach((q) => listHost.append(inqCard(q, { fresh: q.status === "done" && !before.has(q.id + ":" + q.repliedAt) })));
    markSeen(l.filter((q) => q.status === "done").map((q) => q.id + ":" + q.repliedAt));
  }
  loadList();
}

function inqCard(q, { fresh = false, admin = false, onReply, onDelete } = {}) {
  const done = q.status === "done";
  const kids = [
    el("div", { class: "iq-top" }, [
      el("span", { class: "iq-badge" + (done ? " done" : ""), text: done ? "답변 완료" : "답변 대기" }),
      el("span", { class: "iq-cat-tag", text: q.cat || "기타" }),
      fresh ? el("span", { class: "iq-new", text: "NEW" }) : null,
      el("span", { class: "iq-time", text: fmtT(q.createdAt) }),
    ].filter(Boolean)),
    el("p", { class: "iq-title", text: q.title }),
    admin ? el("p", { class: "iq-who", text: `${q.name || "이름 없음"}${q.anonymous ? " · 게스트" : ""}${q.email ? " · " + q.email : ""}` }) : null,
    el("p", { class: "iq-body", text: q.body }),
  ];
  if (done) kids.push(el("div", { class: "iq-reply" }, [el("p", { class: "iq-reply-h", text: `☾ 해묘의 답변 · ${fmtT(q.repliedAt)}` }), el("p", { text: q.reply })]));
  if (admin) {
    const ta = el("textarea", { class: "input", rows: "3", maxlength: "2000", placeholder: done ? "답변 고치기" : "답변을 적어 주세요" });
    if (done) ta.value = q.reply || "";
    const sendB = el("button", { class: "btn btn-primary btn-sm", type: "button" }, [el("span", { text: done ? "답변 고치기" : "답변 보내기" })]);
    sendB.addEventListener("click", async () => { if (ta.value.trim().length < 2) { toast("답변을 적어 주세요."); return; } sendB.disabled = true; await onReply(q, ta.value.trim()); sendB.disabled = false; });
    const delL = el("span", { text: "삭제" }); const delB = el("button", { class: "btn btn-quiet btn-sm", type: "button" }, [delL]);
    let armed = false; delB.addEventListener("click", () => { if (!armed) { armed = true; delL.textContent = "한 번 더 누르면 삭제"; setTimeout(() => { armed = false; delL.textContent = "삭제"; }, 4000); return; } onDelete(q); });
    kids.push(el("div", { class: "iq-admin" }, [ta, el("div", { class: "btn-row", style: "justify-content:flex-end;" }, [delB, sendB])]));
  }
  return el("article", { class: "panel iq-card" + (done ? " done" : "") + (fresh ? " fresh" : "") }, kids.filter(Boolean));
}

function adminInbox(host) {
  let tab = "wait", data = [], reviews = [];
  const users = {};
  const tabs = el("div", { class: "iq-tabs", role: "tablist" });
  const body = el("div", { class: "iq-list" });
  host.append(tabs, body);
  const paint = () => {
    clear(tabs); clear(body);
    const wait = data.filter((q) => q.status !== "done"), done = data.filter((q) => q.status === "done");
    [["wait", `답변 대기 ${wait.length}`], ["done", `답변 완료 ${done.length}`], ["rev", `후기 ${reviews.length}`]].forEach(([k, t]) =>
      tabs.append(el("button", { type: "button", role: "tab", "aria-selected": String(tab === k), class: "iq-tab" + (tab === k ? " on" : ""), onclick: () => { tab = k; paint(); } }, [el("span", { text: t })])));
    if (tab === "rev") {
      if (!reviews.length) { body.append(el("div", { class: "iq-empty" }, [el("p", { text: "아직 후기가 없어요" })])); return; }
      const avg = (reviews.reduce((a, r) => a + (r.rating || 0), 0) / reviews.length).toFixed(1);
      body.append(el("p", { class: "iq-avg", text: `평균 ★ ${avg} · ${reviews.length}개` }));
      reviews.forEach((r) => {
        const who = users[r.uid];
        const delL = el("span", { text: "후기 삭제" }); const delB = el("button", { class: "btn btn-quiet btn-sm", type: "button" }, [delL]);
        let armed = false;
        delB.addEventListener("click", async () => {
          if (!armed) { armed = true; delL.textContent = "한 번 더 누르면 삭제"; delB.style.color = "var(--c-danger)"; setTimeout(() => { armed = false; delL.textContent = "후기 삭제"; delB.style.color = ""; }, 4000); return; }
          await cloudDeleteReview(r.id); deleteReview(r.id); reviews = reviews.filter((x) => x.id !== r.id); CLOUD_REVIEWS = null; toast("후기를 삭제했어요."); paint();
        });
        body.append(el("article", { class: "panel iq-card" }, [
          el("div", { class: "iq-top" }, [el("span", { class: "iq-stars", text: "★".repeat(r.rating || 0) + "☆".repeat(5 - (r.rating || 0)) }), r.guest ? el("span", { class: "iq-cat-tag", text: "게스트 후기" }) : null, el("span", { class: "iq-time", text: fmtT(r.createdAt) })].filter(Boolean)),
          el("p", { class: "iq-title", text: r.nickname || "익명의 해묘 친구" }),
          el("p", { class: "iq-who", text: who ? `작성자 · ${who.name || "이름 없음"}${who.anonymous ? " (게스트)" : ""}${who.email ? " · " + who.email : ""} — 관리자만 보여요` : (r.uid ? "작성자 · 회원 목록에 없음" : "작성자 · 로그인 전 작성") }),
          el("p", { class: "iq-body", text: r.content }),
          el("div", { class: "btn-row", style: "justify-content:flex-end;" }, [delB]),
        ]));
      });
      return;
    }
    const list = tab === "wait" ? wait : done;
    if (!list.length) { body.append(el("div", { class: "iq-empty" }, [el("p", { text: tab === "wait" ? "답변할 문의가 없어요 ✓" : "아직 답변한 문의가 없어요" })])); return; }
    list.forEach((q) => body.append(inqCard(q, { admin: true,
      onReply: async (qq, txt) => { const r = await adminReplyInquiry(qq.id, txt); if (r.error) { toast(r.error); return; } qq.reply = txt; qq.status = "done"; qq.repliedAt = Date.now(); toast("답변을 보냈어요."); paint(); },
      onDelete: async (qq) => { await deleteInquiry(qq.id); data = data.filter((x) => x.id !== qq.id); toast("문의를 삭제했어요."); paint(); },
    })));
  };
  body.append(el("p", { class: "muted tiny center", text: "불러오는 중…" }));
  Promise.all([adminInquiries(), cloudListReviews(), adminListUsers().catch(() => ({}))]).then(([r, rv, us]) => {
    if (r.error) { clear(body); body.append(noticeBox("warn", r.error)); return; }
    data = r.list || []; reviews = (rv || []).slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    (us && us.users || []).forEach((u) => { users[u.uid] = u; });
    paint();
  });
}


/* 홈 · 후기 화면 위 — 다른 이용자들의 후기를 바로 보이게 (평균 별점 + 옆으로 넘기는 카드) */
export function reviewShowcase(navigate, { title = "이용자 후기" } = {}) {
  const box = el("div", { class: "rvs" });
  const paint = (list) => {
    clear(box);
    const n = list.length, avg = n ? list.reduce((a, r) => a + (r.rating || 0), 0) / n : 0;
    box.append(el("div", { class: "rvs-head" }, [
      el("div", {}, [el("h2", { text: title }), n ? el("p", { class: "rvs-score" }, [el("b", { text: `★ ${avg.toFixed(1)}` }), el("span", { text: ` · 후기 ${n}개` })]) : el("p", { class: "rvs-score", text: "첫 후기를 기다리고 있어요" })]),
      el("button", { type: "button", class: "sh-more", onclick: () => navigate("/reviews") }, [el("span", { text: n ? "전체 ›" : "후기 쓰기 ›" })]),
    ]));
    if (!n) { box.append(el("button", { type: "button", class: "rvs-empty", onclick: () => navigate("/reviews") }, [el("span", { text: "💬 첫 후기를 남기고 코인 10개 받기" })])); return; }
    const pick = [...list].sort((a, b) => (b.rating - a.rating) || (b.createdAt - a.createdAt)).slice(0, 10);
    box.append(el("div", { class: "rvs-row" }, pick.map((r) => el("article", { class: "rvs-card" }, [
      el("p", { class: "rvs-stars", "aria-label": `별점 ${r.rating}점`, text: "★".repeat(r.rating || 0) + "☆".repeat(5 - (r.rating || 0)) }),
      el("p", { class: "rvs-txt", text: r.content }),
      el("p", { class: "rvs-by" }, [el("span", {}, [el("span", { text: r.nickname || "익명의 해묘 친구" }), r.guest ? el("i", { class: "rv-guest", text: "게스트" }) : null].filter(Boolean)), el("small", { text: formatDate(r.createdAt) })]),
    ]))));
  };
  if (isCloudEnabled()) { paint([]); cloudListReviews().then((l) => { if (l) paint(l); }); }
  else paint(getReviews());
  return box;
}
