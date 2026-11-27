/* =========================================================
   🔮 해묘 상담소 · 🐱 AI 상담 (HAE)
   · /consult        상담소 — AI 상담 입구 + 상담사(관리자가 답함) 목록 + 내 상담
   · /consult/:id    상담 한 건 (주고받기)
   · /ai-consult     AI 상담 — 내 사주 · 타로 · 연애 상대 사주를 바탕으로 바로 답해요
   ========================================================= */
import { el, clear, toast, icon } from "../utils/dom.js";
import { pageHeader, backLink, noticeBox, openModal } from "./shared.js";
import { getMyBirth, getPeople } from "../state.js";
import { computeSaju } from "../saju/manse.js";
import { analyzeStrength } from "../saju/strength.js";
import { todayFortune, tenGod } from "../saju/fortune.js";
import { analyzeCompat } from "../saju/compat.js";
import { loadTarotData, cardFrontHTML } from "../tarot/cardArt.js";
import { getCoins, spend, addCoins, isAdmin, noCoinToast } from "../wallet.js";
import { getUser, getExperts, createConsult, myConsults, getConsult, addConsultMsg, markConsultRead, adminConsults, adminReplyConsult, adminDeleteConsult, adminSetExperts, DEFAULT_EXPERTS, rateConsult, getMyRating, getExpertRatings, adminDeleteRating, myExpertLink, myExpertApply, applyExpert, cancelExpertApply, expertConsults, adminExpertAccounts, adminFindUserByEmail, adminLinkExpert, adminUnlinkExpert, adminRejectExpert, aiChatsList, aiChatSave, aiChatDelete } from "../cloud.js";
import { aiReady, openChat, ask, aiErrorText, aiErrorRaw } from "../ai.js";
import { getConfig } from "../config.js";

const STEM_KR = "갑을병정무기경신임계", STEM_H = "甲乙丙丁戊己庚辛壬癸";
const EK = { wood: "목(木)", fire: "화(火)", earth: "토(土)", metal: "금(金)", water: "수(水)" };
const ymd = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmt = (t) => new Date(t).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

/** AI · 상담사에게 보낼 사주 요약 (생일 전체 대신 태어난 해 + 여덟 글자) */
export function sajuSummary(input, label = "나") {
  const P = computeSaju(input), S = analyzeStrength(P), now = new Date(), Y = now.getFullYear();
  const ds = P.pillars.day.stemIdx;
  const pil = [["year", "연"], ["month", "월"], ["day", "일"], ["hour", "시"]].filter(([k]) => P.pillars[k] && !(k === "hour" && input.timeUnknown))
    .map(([k, t]) => `${t}주 ${P.pillars[k].hanja}(${P.pillars[k].gz})`).join(", ");
  const ec = P.elementCounts || {};
  const dw = ((P.daeun && P.daeun.list) || []).filter((d) => d.startYear <= Y).pop();
  const yg = (k) => tenGod(ds, ((Y + k - 4) % 10 + 10) % 10);
  const tf = todayFortune(P, now);
  return [
    `${label}: ${input.gender === "male" ? "남성" : input.gender === "female" ? "여성" : "성별 모름"}, ${String(input.birthDate).slice(0, 4)}년생${input.timeUnknown ? " (태어난 시간 모름)" : ""}`,
    `사주 여덟 글자: ${pil}`,
    `일간 ${STEM_H[ds]}(${STEM_KR[ds]}) — ${EK[P.dayMasterElem]}, ${S.strength}, 도움 되는 기운(용신) ${S.yongsinKr.join(" · ")}`,
    `오행 개수: ${Object.keys(EK).map((k) => `${EK[k]} ${ec[k] || 0}`).join(", ")}`,
    dw ? `지금 대운: ${dw.hanja}(${dw.gz}) — ${tenGod(ds, dw.stemIdx)}의 10년 (${dw.age}세부터)` : "",
    `${Y}년은 ${yg(0)}의 해, ${Y + 1}년은 ${yg(1)}의 해`,
    `오늘(${ymd(now)}) 일진 ${tf.iljinH || tf.iljin}(${tf.iljin}) — ${tf.dayGod}의 날: ${tf.theme}`,
  ].filter(Boolean).join("\n");
}
function birthLine(input) {
  return `${input.birthDate} ${input.timeUnknown ? "시간 모름" : input.birthTime || ""} · ${input.calendarType === "lunar" ? "음력" : "양력"} · ${input.gender === "male" ? "남" : "여"}`;
}
async function needLogin(host, navigate, what) {
  const u = await getUser().catch(() => null);
  if (u) return u;
  host.append(el("div", { class: "panel center cs-need" }, [
    el("p", { class: "cs-need-em", text: "🐾" }),
    el("p", { style: "font-weight:700;", text: `${what}은 로그인한 뒤에 쓸 수 있어요.` }),
    el("p", { class: "tiny muted", text: "게스트로 시작해도 괜찮아요." }),
    el("button", { type: "button", class: "btn btn-primary", onclick: () => navigate("/profile") }, [el("span", { text: "로그인하러 가기" })]),
  ]));
  return null;
}

/* =========================== 🔮 상담소 =========================== */
export function renderConsult({ navigate }) {
  const root = el("div", { class: "cs" });
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(pageHeader("COUNSEL", "해묘 상담소", "AI 고양이에게 바로 묻거나, 상담사에게 천천히 깊게 물어보세요. 내 사주(四柱)를 함께 보내면 더 정확해요."));
  const host = el("section", { class: "wrap" });
  root.append(host);
  (async () => {
    // AI 상담 입구
    host.append(el("button", { type: "button", class: "cs-ai", onclick: () => navigate("/ai-consult") }, [
      el("span", { class: "cs-ai-pic", style: 'background-image:url("assets/img/haemyo.webp")', "aria-hidden": "true" }),
      el("span", { class: "cs-ai-tx" }, [
        el("b", { text: "🐱 해묘냥 AI 상담" }),
        el("small", { text: aiReady() ? `지금 바로 답해 줘요 · 질문마다 코인 ${getConfig().ai.costPerQ || 5}개` : "준비 중이에요 · 곧 열려요" }),
      ]),
      el("span", { class: "cs-ai-go", "aria-hidden": "true", text: "›" }),
    ]));
    // 상담사
    host.append(el("p", { class: "eyebrow cs-h", text: "상담사에게 묻기 · 24시간 안에 답해요" }));
    const grid = el("div", { class: "cs-grid" }, [el("p", { class: "tiny muted", text: "불러오는 중…" })]);
    host.append(grid);
    const [exAll, rates] = await Promise.all([getExperts().catch(() => DEFAULT_EXPERTS), getExpertRatings().catch(() => ({}))]);
    const ex = exAll.filter((e) => e.on !== false);
    clear(grid);
    ex.forEach((e) => grid.append(el("article", { class: "panel cs-ex" }, [
      el("div", { class: "cs-ex-top" }, [el("span", { class: "cs-ex-em", text: e.em }), el("div", {}, [el("b", { text: e.name }), el("span", { class: "cs-tag", text: `${e.field} 상담` })])]),
      rateLine(e, rates[e.id]),
      el("p", { class: "cs-ex-in", text: e.intro }),
      el("div", { class: "cs-ex-foot" }, [
        el("span", { class: "cs-cost", text: e.cost ? `코인 ${e.cost}개` : "무료" }),
        el("button", { type: "button", class: "btn btn-primary btn-sm", onclick: () => newConsult(e, navigate) }, [el("span", { text: "상담 신청" })]),
      ]),
    ])));
    // 내 상담
    host.append(el("p", { class: "eyebrow cs-h", text: "내 상담" }));
    const mine = el("div", { class: "cs-mine" });
    host.append(mine);
    const u = await getUser().catch(() => null);
    if (!u) { mine.append(el("p", { class: "tiny muted", text: "로그인하면 내 상담을 여기서 모아 볼 수 있어요." })); }
    else {
      const list = await myConsults();
      if (!list || !list.length) mine.append(el("p", { class: "tiny muted", text: "아직 보낸 상담이 없어요." }));
      else list.forEach((c) => mine.append(el("button", { type: "button", class: "cs-row" + (c.unreadUser ? " new" : ""), onclick: () => navigate("/consult/" + c.id) }, [
        el("span", { class: "cs-st " + c.status, text: c.unreadUser ? "답변 도착" : c.status === "wait" ? "답변 대기" : c.status === "done" ? "상담 끝" : "답변 완료" }),
        el("span", { class: "cs-row-t" }, [el("b", { text: c.title || "(제목 없음)" }), el("small", { text: `${c.expertName} · ${c.field} · ${fmt(c.updatedAt)}` })]),
        el("span", { class: "cs-ai-go", "aria-hidden": "true", text: "›" }),
      ])));
    }
    if (u) host.append(expertEntry(u, ex, navigate));
    host.append(noticeBox("info", "상담은 사주 · 타로로 보는 참고 의견이에요. 건강 · 법률 · 돈 문제는 꼭 전문가와 상의해 주세요. 마음이 많이 힘들면 109(자살예방상담) · 1577-0199(정신건강위기상담)로 연락해 주세요."));
  })();
  return root;
}

function newConsult(expert, navigate) {
  const my = getMyBirth();
  const people = getPeople().filter((p) => p && p.input && p.input.birthDate);
  const title = el("input", { class: "input", maxlength: "60", placeholder: "예: 그 사람과 다시 만날 수 있을까요?" });
  const body = el("textarea", { class: "input cs-ta", maxlength: "1500", rows: "6", placeholder: "지금 상황과 궁금한 점을 편하게 적어 주세요. 자세할수록 정확해요. (1,500자까지)" });
  const cnt = el("p", { class: "tiny muted cs-cnt", text: "0 / 1500" });
  body.addEventListener("input", () => { cnt.textContent = `${body.value.length} / 1500`; });
  const withMe = el("input", { type: "checkbox", checked: !!my });
  const who = el("select", { class: "input" }, [el("option", { value: "", text: "함께 볼 사람 없음" }), ...people.map((p) => el("option", { value: p.id, text: p.name || "이름 없음" }))]);
  const err = el("p", { class: "field-error", "aria-live": "polite" });
  const send = el("button", { type: "button", class: "btn btn-primary btn-block" }, [el("span", { text: expert.cost && !isAdmin() ? `코인 ${expert.cost}개로 상담 보내기 · 보유 ${getCoins()}개` : "상담 보내기" })]);
  const m = openModal([
    el("p", { class: "tiny muted", text: `${expert.em} ${expert.name} · ${expert.field} 상담 — 보통 24시간 안에 답이 와요. 답이 오면 알림을 켜 둔 기기로 알려 드려요.` }),
    el("label", { class: "cs-lb", text: "제목" }), title,
    el("label", { class: "cs-lb", text: "상담 내용" }), body, cnt,
    my ? el("label", { class: "chip cs-chk" }, [withMe, el("span", { class: "check" }, [icon("check")]), el("span", { text: "내 사주 정보 같이 보내기" })]) : el("p", { class: "tiny muted", text: "내 생년월일을 넣어 두면 사주 정보를 함께 보낼 수 있어요." }),
    people.length ? el("label", { class: "cs-lb", text: "함께 볼 사람 (궁합 · 연애 상담일 때)" }) : null, people.length ? who : null,
    err, send,
  ].filter(Boolean), { title: "상담 신청" });
  send.addEventListener("click", async () => {
    err.textContent = "";
    if (title.value.trim().length < 2) { err.textContent = "제목을 적어 주세요."; return; }
    if (body.value.trim().length < 10) { err.textContent = "상담 내용을 10자 이상 적어 주세요."; return; }
    const u = await getUser().catch(() => null);
    if (!u) { m.close(); toast("로그인한 뒤에 상담을 보낼 수 있어요."); navigate("/profile"); return; }
    const cost = isAdmin() ? 0 : (expert.cost || 0);
    if (cost) { const r = spend(cost, { kind: "consult", label: `${expert.field} 상담` }); if (!r.ok) { noCoinToast(cost); return; } }
    const lines = [];
    if (withMe.checked && my) lines.push(`[나] ${birthLine(my)}`);
    const p = people.find((x) => x.id === who.value);
    if (p) lines.push(`[${p.name || "상대"}] ${birthLine(p.input)}`);
    send.disabled = true;
    const r = await createConsult({ expert, title: title.value.trim(), body: body.value.trim(), birth: lines.join("\n"), name: (my && my.name) || (u.user_metadata && u.user_metadata.name) || "익명" });
    send.disabled = false;
    if (r.error) { if (cost) addCoins(cost, { kind: "refund", label: "상담 보내기 실패 환불" }); err.textContent = r.error; return; }
    m.close(); toast("상담을 보냈어요 · 답이 오면 알려 드릴게요"); navigate("/consult/" + r.id);
  });
}

export function renderConsultThread({ navigate, id }) {
  const root = el("div", { class: "cs" });
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/consult", "상담소")]));
  const host = el("section", { class: "wrap" });
  root.append(host);
  (async () => {
    if (!(await needLogin(host, navigate, "상담"))) return;
    let c = await getConsult(id);
    if (!c) { host.append(noticeBox("warn", "상담을 찾지 못했어요. 지워졌거나 다른 계정의 상담이에요.")); return; }
    if (c.unreadUser) markConsultRead(c.id);
    const paint = () => {
      clear(host);
      host.append(el("header", { class: "cs-th-h" }, [
        el("span", { class: "cs-tag", text: `${c.expertName} · ${c.field} 상담` }),
        el("h1", { class: "serif cs-th-t", text: c.title || "상담" }),
        el("p", { class: "tiny muted", text: `${fmt(c.createdAt)} 시작 · ${c.status === "wait" ? "답변을 기다리고 있어요" : c.status === "done" ? "끝난 상담이에요" : "답변이 도착했어요"}` }),
      ]));
      host.append(el("div", { class: "cs-msgs" }, (c.msgs || []).map((mm) => bubble(mm.by === "u" ? "me" : "ex", mm.t, mm.by === "u" ? "나" : c.expertName, mm.at))));
      if (c.status !== "done" && (c.msgs || []).length < 30) {
        const ta = el("textarea", { class: "input cs-ta", rows: "3", maxlength: "1500", placeholder: "덧붙여 묻고 싶은 걸 적어 주세요." });
        const b = el("button", { type: "button", class: "btn btn-primary btn-sm" }, [el("span", { text: "보내기" })]);
        b.addEventListener("click", async () => {
          if (ta.value.trim().length < 2) return;
          b.disabled = true;
          const r = await addConsultMsg(c, ta.value.trim());
          b.disabled = false;
          if (r.error) { toast(r.error); return; }
          c = { ...c, msgs: r.msgs, status: "wait" }; paint();
        });
        host.append(el("div", { class: "cs-reply" }, [ta, b]));
      }
      if (c.status !== "wait" && (c.msgs || []).some((mm) => mm.by === "e")) host.append(rateBox(c));
    };
    paint();
  })();
  return root;
}
function bubble(side, text, who, at) {
  return el("div", { class: "cs-b " + side }, [
    side !== "me" ? el("span", { class: "cs-b-av", "aria-hidden": "true", style: 'background-image:url("assets/img/haemyo.webp")' }) : null,
    el("div", { class: "cs-b-in" }, [
      el("span", { class: "cs-b-who", text: at ? `${who} · ${fmt(at)}` : who }),
      el("div", { class: "cs-b-tx" }, String(text || "").split(/\n+/).map((t) => el("p", { text: t }))),
    ]),
  ].filter(Boolean));
}

/* ---------------- 🧑‍💼 상담사 계정 ---------------- */
function expertEntry(u, ex, navigate) {
  const box = el("div", { class: "cs-xp" });
  (async () => {
    const link = await myExpertLink();
    if (link) {
      const e = ex.find((x) => x.id === link.expertId) || { em: "🧑‍💼", name: link.expertId, field: "" };
      box.append(el("button", { type: "button", class: "cs-ai cs-xp-desk", onclick: () => navigate("/consult-desk") }, [
        el("span", { class: "cs-xp-em", "aria-hidden": "true", text: e.em }),
        el("span", { class: "cs-ai-tx" }, [el("b", { text: `🧑‍💼 상담사 화면 · ${e.name}` }), el("small", { text: "내게 들어온 상담을 보고 답해요" })]),
        el("span", { class: "cs-ai-go", "aria-hidden": "true", text: "›" }),
      ]));
      return;
    }
    if (u.anonymous) return;
    const ap = await myExpertApply();
    if (ap && ap.status === "wait") {
      box.append(el("div", { class: "cs-xp-st" }, [el("span", { class: "tiny muted", text: "🧑‍💼 상담사 계정 신청을 보냈어요 · 관리자가 확인하면 여기에 상담사 화면이 생겨요" }),
        el("button", { type: "button", class: "cs-rate-more", onclick: async () => { const r = await cancelExpertApply(); if (r.error) { toast(r.error); return; } toast("신청을 취소했어요"); clear(box); box.append(applyLink(ex, box)); } }, [el("span", { text: "취소" })])]));
      return;
    }
    if (ap && ap.status === "no") box.append(el("p", { class: "tiny muted", text: "지난 상담사 신청은 이번엔 함께하지 못하게 됐어요. 다시 신청할 수 있어요." }));
    box.append(applyLink(ex, box));
  })();
  return box;
}
function applyLink(ex, box) {
  return el("button", { type: "button", class: "cs-rate-more cs-xp-apply", onclick: () => openApply(ex, box) }, [el("span", { text: "🧑‍💼 상담사로 활동하고 싶어요 · 계정 연결 신청 ›" })]);
}
function openApply(ex, box) {
  const who = el("select", { class: "input" }, [...ex.map((e) => el("option", { value: e.id, text: `${e.em} ${e.name} (${e.field})` })), el("option", { value: "new", text: "새 상담사로 (관리자와 정하기)" })]);
  const name = el("input", { class: "input", maxlength: "20", placeholder: "이름 또는 활동명" });
  const msg = el("textarea", { class: "input cs-ta", rows: "4", maxlength: "500", placeholder: "간단한 소개 · 경력 · 연락받을 방법 (500자까지)" });
  const err = el("p", { class: "field-error", "aria-live": "polite" });
  const b = el("button", { type: "button", class: "btn btn-primary btn-block" }, [el("span", { text: "신청 보내기" })]);
  const m = openModal([
    el("p", { class: "tiny muted", text: "관리자가 확인한 뒤 지금 로그인한 계정을 상담사와 연결해 드려요. 연결되면 그 상담사로 들어온 상담만 보고 답할 수 있어요." }),
    el("label", { class: "cs-lb", text: "어느 상담사로 활동할까요?" }), who,
    el("label", { class: "cs-lb", text: "이름" }), name,
    el("label", { class: "cs-lb", text: "소개" }), msg, err, b,
  ], { title: "상담사 계정 신청" });
  b.addEventListener("click", async () => {
    err.textContent = "";
    if (name.value.trim().length < 1) { err.textContent = "이름을 적어 주세요."; return; }
    if (msg.value.trim().length < 10) { err.textContent = "소개를 10자 이상 적어 주세요."; return; }
    b.disabled = true; const r = await applyExpert({ expertId: who.value, name: name.value, msg: msg.value }); b.disabled = false;
    if (r.error) { err.textContent = r.error; return; }
    m.close(); toast("신청을 보냈어요 🐾");
    clear(box); box.append(el("p", { class: "tiny muted", text: "🧑‍💼 상담사 계정 신청을 보냈어요 · 관리자가 확인하면 여기에 상담사 화면이 생겨요" }));
  });
}
export function renderExpertDesk({ navigate }) {
  const root = el("div", { class: "cs" });
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/consult", "상담소")]));
  const host = el("section", { class: "wrap" });
  root.append(host);
  (async () => {
    if (!(await needLogin(host, navigate, "상담사 화면"))) return;
    const link = await myExpertLink();
    if (!link) { host.append(pageHeader("DESK", "상담사 화면", ""), noticeBox("warn", "아직 상담사로 연결된 계정이 아니에요. 상담소에서 ‘상담사로 활동하고 싶어요’로 신청해 주세요.")); return; }
    const [exAll, rates] = await Promise.all([getExperts().catch(() => DEFAULT_EXPERTS), getExpertRatings().catch(() => ({}))]);
    const e = exAll.find((x) => x.id === link.expertId) || { id: link.expertId, em: "🧑‍💼", name: link.expertId, field: "" };
    host.append(pageHeader("DESK", `${e.em} ${e.name} 상담사 화면`, `${e.field ? e.field + " 상담 · " : ""}여기서 보내는 답은 ‘${e.name}’ 이름으로 가요. 답을 보내면 알림을 켠 이용자에게 1시간 안에 알림이 가요.`));
    host.append(el("div", { class: "panel cs-xp-rate" }, [el("span", { class: "tiny muted", text: "받은 평점" }), rateLine(e, rates[e.id])]));
    const body = el("div", { class: "cs-mine" });
    host.append(body);
    let filter = "wait";
    const load = async () => {
      clear(body);
      const r = await expertConsults(link.expertId);
      if (r.error) { body.append(noticeBox("warn", r.error)); return; }
      const waitN = r.list.filter((c) => c.status === "wait").length;
      body.append(el("div", { class: "dash-tabs" }, [["wait", `답변 대기 ${waitN}`], ["all", `전체 ${r.list.length}`]].map(([k, t]) => el("button", { type: "button", class: "dash-tab" + (k === filter ? " on" : ""), onclick: () => { filter = k; load(); } }, [el("span", { text: t })]))));
      const list = filter === "wait" ? r.list.filter((c) => c.status === "wait") : r.list;
      if (!list.length) body.append(el("p", { class: "muted tiny", text: filter === "wait" ? "기다리는 상담이 없어요 🐾" : "아직 들어온 상담이 없어요." }));
      list.forEach((c) => body.append(el("button", { type: "button", class: "cs-row" + (c.status === "wait" ? " new" : ""), onclick: () => openAdminThread(c, load, { expert: true }) }, [
        el("span", { class: "cs-st " + c.status, text: c.status === "wait" ? "대기" : c.status === "done" ? "끝" : "답함" }),
        el("span", { class: "cs-row-t" }, [el("b", { text: c.title || "(제목 없음)" }), el("small", { text: `${c.name} · ${fmt(c.updatedAt)} · ${(c.msgs || []).length}개` })]),
        el("span", { class: "cs-ai-go", "aria-hidden": "true", text: "›" }),
      ])));
    };
    load();
  })();
  return root;
}

/* ---------------- ⭐ 상담사 평점 ---------------- */
const starTxt = (n) => "★".repeat(Math.round(n)) + "☆".repeat(5 - Math.round(n));
function rateLine(e, r) {
  if (!r || !r.n) return el("div", { class: "cs-rate none" }, [el("span", { class: "cs-stars", text: "☆☆☆☆☆" }), el("span", { class: "tiny muted", text: "아직 후기가 없어요" })]);
  return el("div", { class: "cs-rate" }, [
    el("span", { class: "cs-stars", "aria-label": `별점 ${r.avg.toFixed(1)}점`, text: starTxt(r.avg) }),
    el("b", { text: r.avg.toFixed(1) }), el("span", { class: "tiny muted", text: `(${r.n})` }),
    el("button", { type: "button", class: "cs-rate-more", onclick: () => openRatings(e, r) }, [el("span", { text: "후기 ›" })]),
  ]);
}
function openRatings(e, r) {
  const dist = [5, 4, 3, 2, 1].map((k) => { const n = r.list.filter((x) => x.s === k).length; return el("div", { class: "cs-dist" }, [el("span", { text: `${k}점` }), el("i", {}, [el("b", { style: `width:${r.n ? Math.round(n / r.n * 100) : 0}%` })]), el("span", { class: "tiny muted", text: String(n) })]); });
  const list = r.list.slice(0, 50).map((x) => el("div", { class: "cs-rv" }, [
    el("div", { class: "cs-rv-h" }, [el("span", { class: "cs-stars", text: starTxt(x.s) }), el("span", { class: "tiny muted", text: `${x.name || "익명"} · ${fmt(x.at)}` })]),
    x.c ? el("p", { text: x.c }) : el("p", { class: "tiny muted", text: "별점만 남겼어요." }),
  ]));
  openModal([
    el("div", { class: "cs-rate big" }, [el("span", { class: "cs-stars", text: starTxt(r.avg) }), el("b", { text: r.avg.toFixed(1) }), el("span", { class: "tiny muted", text: `후기 ${r.n}개` })]),
    el("div", { class: "cs-dists" }, dist), el("div", { class: "cs-rvs" }, list),
    el("p", { class: "tiny muted", text: "답변을 받은 상담에서만 남길 수 있는 후기예요. 이름은 가려서 보여요." }),
  ], { title: `${e.em} ${e.name} 상담사 후기` });
}
function rateBox(c) {
  const box = el("div", { class: "panel cs-rbox" });
  let cur = 0;
  const paintBox = (mine, edit) => {
    clear(box);
    if (mine && !edit) {
      box.append(el("div", { class: "cs-rbox-done" }, [
        el("span", { text: "내 평점" }), el("span", { class: "cs-stars", text: starTxt(mine.s) }),
        mine.c ? el("span", { class: "tiny muted cs-rbox-c", text: `“${mine.c}”` }) : null,
        el("button", { type: "button", class: "cs-rate-more", onclick: () => paintBox(mine, true) }, [el("span", { text: "수정" })]),
      ].filter(Boolean)));
      return;
    }
    cur = mine ? mine.s : 0;
    const stars = [1, 2, 3, 4, 5].map((k) => el("button", { type: "button", class: "cs-star", "aria-label": `${k}점`, text: "★" }));
    const hint = el("span", { class: "tiny muted", text: cur ? `${cur}점` : "별을 눌러 주세요" });
    const LAB = ["", "아쉬웠어요", "그저 그랬어요", "괜찮았어요", "좋았어요", "최고였어요"];
    const show = () => { stars.forEach((b, i) => b.classList.toggle("on", i < cur)); hint.textContent = cur ? `${cur}점 · ${LAB[cur]}` : "별을 눌러 주세요"; };
    stars.forEach((b, i) => b.addEventListener("click", () => { cur = i + 1; show(); }));
    const ta = el("input", { class: "input", maxlength: "100", placeholder: "한 줄 후기 (없어도 돼요 · 100자까지)", value: mine ? mine.c || "" : "" });
    const sb = el("button", { type: "button", class: "btn btn-primary btn-sm" }, [el("span", { text: mine ? "고치기" : "평점 남기기" })]);
    sb.addEventListener("click", async () => {
      if (!cur) { toast("별점을 먼저 골라 주세요"); return; }
      sb.disabled = true;
      const r = await rateConsult(c, cur, ta.value, c.name); sb.disabled = false;
      if (r.error) { toast(r.error); return; }
      toast("고마워요! 평점을 남겼어요 ⭐"); paintBox(r.rating, false);
    });
    box.append(el("p", { class: "eyebrow", text: `${c.expertName} 상담사는 어땠나요?` }), el("div", { class: "cs-stars-in" }, [...stars, hint]), ta, el("div", { class: "btn-row" }, [sb]));
    show();
  };
  box.append(el("p", { class: "tiny muted", text: "평점 불러오는 중…" }));
  getMyRating(c.id).then((mine) => paintBox(mine, false));
  return box;
}

/* =========================== 🐱 AI 상담 =========================== */
const MODES = [
  { id: "saju", em: "🔮", name: "사주 상담", hint: ["올해 나한테 제일 중요한 게 뭐야?", "나한테 맞는 일은 어떤 쪽이야?", "요즘 왜 이렇게 지칠까?"] },
  { id: "tarot", em: "🃏", name: "타로 상담", hint: ["그 사람 지금 내 생각 할까?", "이번 선택, 해도 될까?", "이번 달 나에게 필요한 메시지는?"] },
  { id: "love", em: "💗", name: "연애 상담", hint: ["우리 둘 잘 맞아?", "먼저 연락해도 될까?", "이 관계 오래갈 수 있을까?"] },
];
const HIST_KEY = "str.aichat.v1", USE_KEY = "str.aiuse.v1", SESS_KEY = "str.aichats.v2", MAX_SESS = 60, MAX_MSGS = 60;
const readJ = (k, fb) => { try { return JSON.parse(localStorage.getItem(k) || "null") || fb; } catch { return fb; } };
const writeJ = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };
function rnd() { try { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; } catch { return Math.random(); } }

export function renderAIConsult({ navigate }) {
  const root = el("div", { class: "cs ai" });
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/consult", "상담소")]));
  root.append(pageHeader("AI COUNSEL", "해묘냥 AI 상담", "내 사주(四柱) · 타로 · 그 사람 사주를 바탕으로 해묘냥이 바로 답해요. 나눈 대화는 내 계정에 저장돼서 나중에 다시 열어 볼 수 있어요."));
  const host = el("section", { class: "wrap" });
  root.append(host);
  (async () => {
    const cfg = getConfig().ai || {};
    if (!aiReady()) {
      host.append(el("div", { class: "panel center cs-need" }, [
        el("p", { class: "cs-need-em", text: "🐱" }),
        el("p", { style: "font-weight:700;", text: "AI 상담은 준비 중이에요" }),
        el("p", { class: "tiny muted", text: "그동안 상담사에게 물어봐 주세요. 24시간 안에 답해 드려요." }),
        el("button", { type: "button", class: "btn btn-primary", onclick: () => navigate("/consult") }, [el("span", { text: "상담소로 가기" })]),
        isAdmin() ? noticeBox("info", "관리자 안내: Firebase 콘솔 › AI Logic 켜기 + App Check(reCAPTCHA) 사이트 키를 config.js › ai.siteKey 에 넣으면 열려요. 자세한 방법은 SETUP.md › AI 상담.") : null,
      ].filter(Boolean)));
      return;
    }
    const me = await needLogin(host, navigate, "AI 상담");
    if (!me) return;
    const my = getMyBirth();
    if (!my) {
      host.append(noticeBox("info", "AI 상담은 내 사주를 바탕으로 답해요. 생년월일을 먼저 넣어 주세요."));
      host.append(el("button", { type: "button", class: "btn btn-primary", onclick: () => navigate("/saju") }, [el("span", { text: "내 정보 넣기" })]));
      return;
    }
    const people = getPeople().filter((p) => p && p.input && p.input.birthDate);
    let mode = "saju", pid = people[0] ? people[0].id : "", chat = null, busy = false;
    // 💬 대화 기록 — 이 기기(계정별) + 내 계정(클라우드)에 함께 저장
    const SK = `${SESS_KEY}:${me.uid || "me"}`;
    let sessions = readJ(SK, null);
    if (!sessions) { // 예전 기록(모드마다 하나)을 대화로 옮기기
      sessions = [];
      const old = readJ(HIST_KEY, {});
      Object.entries(old).forEach(([k, msgs], i) => {
        if (!Array.isArray(msgs) || !msgs.length) return;
        const [md, p2] = k.split(":"); const pp = people.find((x) => x.id === p2);
        const t = Date.now() - i * 1000;
        sessions.push({ id: "a" + t.toString(36) + i, mode: md, pid: pp ? pp.id : "", pname: pp ? pp.name || "" : "", title: String((msgs.find((m) => m.role === "user") || {}).text || "지난 대화").slice(0, 40), msgs, createdAt: t, updatedAt: t });
      });
      writeJ(SK, sessions);
    }
    const saveLocal = () => { sessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)); sessions = sessions.slice(0, MAX_SESS); writeJ(SK, sessions); };
    let cur = null; // 지금 이어 가는 대화 (null = 새 대화)
    let cards = [];
    try { cards = (await loadTarotData()).cards; } catch { /* 타로 없이 */ }

    const histBtn = el("button", { type: "button", class: "btn btn-ghost btn-sm ai-histbtn" }, [el("span", { text: "💬 지난 대화" })]);
    const newBtn = el("button", { type: "button", class: "btn btn-ghost btn-sm" }, [el("span", { text: "＋ 새 대화" })]);
    const curLab = el("span", { class: "tiny muted ai-cur" });
    const bar = el("div", { class: "ai-bar" }, [curLab, el("div", { class: "ai-bar-b" }, [newBtn, histBtn])]);
    const tabs = el("div", { class: "cs-tabs", role: "tablist" });
    const sub = el("div", { class: "cs-sub" });
    const log = el("div", { class: "cs-msgs ai-log", "aria-live": "polite" });
    const hints = el("div", { class: "chip-slide cs-hints" });
    const ta = el("textarea", { class: "input cs-ta", rows: "2", maxlength: "500", placeholder: "궁금한 걸 편하게 물어봐요 (500자까지)" });
    const sendB = el("button", { type: "button", class: "btn btn-primary cs-send", "aria-label": "보내기" }, [el("span", { text: "보내기" })]);
    const meter = el("p", { class: "tiny muted cs-meter" });
    host.append(bar, tabs, sub, log, hints, el("div", { class: "cs-reply" }, [ta, sendB]), meter,
      el("div", { class: "cs-ai-foot" }, [
        el("button", { type: "button", class: "btn btn-quiet btn-sm", onclick: () => { if (busy || !cur) return; delSession(cur.id); cur = null; chat = null; paintAll(); toast("이 대화를 지웠어요"); } }, [el("span", { text: "이 대화 지우기" })]),
        el("button", { type: "button", class: "btn btn-quiet btn-sm", onclick: () => navigate("/consult") }, [el("span", { text: "사람 상담사에게 묻기 ›" })]),
      ]),
      noticeBox("info", "AI가 사주 · 타로로 본 참고 의견이에요. 틀릴 수 있고, 중요한 결정은 꼭 스스로 · 전문가와 함께 내려 주세요. 질문과 사주 요약은 답을 만들려고 Google Gemini로 보내져요. 대화 기록은 내 계정에만 저장되고(관리자도 못 봐요) 언제든 지울 수 있어요."));

    const use = () => { const u = readJ(USE_KEY, {}); return u.d === ymd() ? u.n || 0 : 0; };
    const paintMeter = () => {
      const n = use(), free = Math.max(0, (cfg.freePerDay || 0) - n);
      const cost = cfg.costPerQ || 5;
      meter.textContent = isAdmin() ? "관리자는 코인 없이 물어볼 수 있어요." : free ? `오늘 무료 ${free}번 남았어요 · 그다음부터 질문마다 코인 ${cost}개 (보유 ${getCoins()}개)` : `질문마다 코인 ${cost}개 · 답을 못 받으면 돌려드려요 · 보유 ${getCoins()}개 · 오늘 ${n}/${cfg.maxPerDay || 20}번`;
    };
    const context = () => {
      const parts = [sajuSummary(my, `나(${my.name || "이용자"})`)];
      if (mode === "love") {
        const p = people.find((x) => x.id === pid);
        if (p) {
          parts.push(sajuSummary(p.input, `상대(${p.name || "그 사람"})`));
          try { const c = analyzeCompat(computeSaju(my), computeSaju(p.input), { a: "나", b: p.name || "상대" }); parts.push(`두 사람 궁합: ${c.title} · ${c.score}점 — ${c.summary}`); } catch { /* ignore */ }
        } else parts.push("상대: 아직 정하지 않음 (내 사주가 끌어당기는 인연 기준으로)");
      }
      parts.push(`상담 종류: ${MODES.find((x) => x.id === mode).name}${mode === "tarot" ? " — 질문마다 사용자가 뽑은 카드 3장(과거 · 현재 · 조언)이 함께 와. 카드 의미를 사주 흐름과 엮어서 풀어 줘." : ""}`);
      return parts.join("\n\n");
    };
    const paintTabs = () => {
      clear(tabs);
      MODES.forEach((md) => tabs.append(el("button", { type: "button", role: "tab", "aria-selected": String(md.id === mode), class: "chip" + (md.id === mode ? " on" : ""), onclick: () => { if (busy || md.id === mode) return; mode = md.id; cur = null; chat = null; paintAll(); } }, [el("span", { text: `${md.em} ${md.name}` })])));
      clear(sub);
      if (mode === "love") {
        sub.append(el("p", { class: "tiny muted", text: "누구와의 연애를 물어볼까?" }), el("div", { class: "chip-slide" }, [
          el("button", { type: "button", class: "chip" + (!pid ? " on" : ""), onclick: () => { if (busy) return; pid = ""; cur = null; chat = null; paintAll(); } }, [el("span", { text: "🌙 아직 없음" })]),
          ...people.map((p) => el("button", { type: "button", class: "chip" + (p.id === pid ? " on" : ""), onclick: () => { if (busy) return; pid = p.id; cur = null; chat = null; paintAll(); } }, [el("span", { text: p.name || "이름 없음" })])),
          el("button", { type: "button", class: "chip", onclick: () => navigate("/people") }, [el("span", { text: "＋ 사람 추가" })]),
        ]));
      }
    };
    const modeOf = (id) => MODES.find((x) => x.id === id) || MODES[0];
    const delSession = (id) => { sessions = sessions.filter((x) => x.id !== id); saveLocal(); aiChatDelete(id); };
    const paintCur = () => {
      const n = sessions.length;
      histBtn.firstChild.textContent = n ? `💬 지난 대화 ${n}` : "💬 지난 대화";
      curLab.textContent = cur ? `이어서 이야기 중 · ${cur.title}` : "새 대화";
    };
    const openSession = (sv) => {
      mode = MODES.some((x) => x.id === sv.mode) ? sv.mode : "saju";
      pid = sv.mode === "love" ? (people.some((x) => x.id === sv.pid) ? sv.pid : "") : pid;
      cur = sv; chat = null; paintAll();
    };
    const openHistory = () => {
      if (busy) return;
      const list = el("div", { class: "ai-hist" });
      const m = openModal([list, el("p", { class: "tiny muted", text: `최근 ${MAX_SESS}개 대화까지 내 계정에 저장돼요. 다른 기기에서 같은 계정으로 들어와도 보여요.` })], { title: "💬 지난 해묘냥 대화" });
      const paintList = () => {
        clear(list);
        if (!sessions.length) { list.append(el("p", { class: "muted tiny center", text: "아직 저장된 대화가 없어요. 첫 질문을 해 봐요 🐾" })); return; }
        sessions.forEach((sv) => {
          const md = modeOf(sv.mode);
          let armed = false;
          const del = el("button", { type: "button", class: "ev-del", "aria-label": "이 대화 지우기" }, [el("span", { text: "지우기" })]);
          del.addEventListener("click", (e) => {
            e.stopPropagation();
            if (!armed) { armed = true; del.classList.add("armed"); del.firstChild.textContent = "한 번 더"; return; }
            delSession(sv.id); if (cur && cur.id === sv.id) { cur = null; chat = null; paintAll(); } paintList(); paintCur();
          });
          const q = sv.msgs.filter((x) => x.role === "user").length;
          list.append(el("div", { class: "ai-hist-r" + (cur && cur.id === sv.id ? " on" : ""), role: "button", tabindex: "0", onclick: () => { m.close(); openSession(sv); }, onkeydown: (e) => { if (e.key === "Enter") { m.close(); openSession(sv); } } }, [
            el("span", { class: "ai-hist-em", "aria-hidden": "true", text: md.em }),
            el("span", { class: "ai-hist-t" }, [el("b", { text: sv.title || "(제목 없음)" }), el("small", { text: `${new Date(sv.updatedAt).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })} · ${md.name.replace(" 상담", "")}${sv.mode === "love" && sv.pname ? ` · ${sv.pname}` : ""} · 질문 ${q}개` })]),
            del,
          ]));
        });
      };
      paintList();
    };
    histBtn.addEventListener("click", openHistory);
    newBtn.addEventListener("click", () => { if (busy) return; cur = null; chat = null; paintAll(); ta.focus(); });
    const paintLog = () => {
      clear(log);
      const h = cur ? cur.msgs : [];
      if (!h.length) log.append(bubble("ex", mode === "tarot" ? "질문을 적으면 제가 카드 세 장을 뽑아서 읽어 드릴게요. 마음속으로 질문을 한 번 떠올려 봐요 🐾" : mode === "love" ? "그 사람과의 이야기, 편하게 털어놔요. 두 사람 사주를 같이 보고 답할게요 💗" : "안녕하세요, 해묘냥이에요. 당신의 사주를 펼쳐 놓고 기다리고 있었어요. 무엇이든 물어봐요 🐾", "해묘냥"));
      h.forEach((m) => {
        if (m.cards) log.append(cardRow(m.cards));
        log.append(bubble(m.role === "user" ? "me" : "ex", m.text, m.role === "user" ? "나" : "해묘냥"));
      });
      requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; });
    };
    const cardRow = (cs) => el("div", { class: "ai-cards" }, cs.map((c) => {
      const card = cards.find((x) => x.nameEn === c.en) || null;
      const pic = el("span", { class: "nyt-pic sm" + (c.rev ? " rev" : "") });
      if (card) pic.innerHTML = cardFrontHTML(card);
      return el("div", { class: "ai-card" }, [pic, el("small", { text: `${c.pos} · ${c.name}${c.rev ? " (역)" : ""}` })]);
    }));
    const paintHints = () => {
      clear(hints);
      MODES.find((x) => x.id === mode).hint.forEach((q) => hints.append(el("button", { type: "button", class: "chip", onclick: () => { ta.value = q; ta.focus(); } }, [el("span", { text: q })])));
    };
    const paintAll = () => { paintTabs(); paintLog(); paintHints(); paintMeter(); paintCur(); };

    const send = async () => {
      const q = ta.value.trim();
      if (!q || busy) return;
      const n = use();
      if (!isAdmin() && n >= (cfg.maxPerDay || 20)) { toast("오늘은 여기까지 물어볼 수 있어요. 내일 또 만나요 🐾"); return; }
      const cost = cfg.costPerQ || 5;
      if (!isAdmin() && n >= (cfg.freePerDay || 0)) { const r = spend(cost, { kind: "ai", label: "AI 상담" }); if (!r.ok) { noCoinToast(cost); return; } }
      writeJ(USE_KEY, { d: ymd(), n: n + 1 });
      busy = true; sendB.disabled = true; ta.value = "";
      if (cur && cur.msgs.length >= MAX_MSGS) { cur = null; chat = null; paintLog(); toast("대화가 길어서 새 대화로 이어 갈게요 🐾"); }
      const h = cur ? cur.msgs : [];
      let msg = q, drawn = null;
      if (mode === "tarot" && cards.length) {
        const pool = cards.map((_, i) => i);
        drawn = ["과거", "현재", "조언"].map((pos) => { const k = Math.floor(rnd() * pool.length); const c = cards[pool.splice(k, 1)[0]]; const rev = rnd() < 0.3; return { pos, name: c.name, en: c.nameEn, rev, kw: (c.keywords || []).slice(0, 3).join(", "), es: ((rev ? c.reversed : c.upright) || {}).essence || "" }; });
        msg = `${q}\n\n[뽑은 카드]\n${drawn.map((c) => `${c.pos}: ${c.name}(${c.en})${c.rev ? " 역방향" : " 정방향"} — ${c.kw} / ${c.es}`).join("\n")}`;
        log.append(cardRow(drawn));
      }
      log.append(bubble("me", q, "나"));
      const out = bubble("ex", "…", "해묘냥"); out.classList.add("typing");
      log.append(out); log.scrollTop = log.scrollHeight;
      const tx = out.querySelector(".cs-b-tx");
      try {
        if (!chat) chat = await openChat(context(), h.slice(-12).map((m) => ({ role: m.role, text: m.raw || m.text })));
        const ans = await ask(chat, msg, (t) => { clear(tx); t.split(/\n+/).forEach((p) => tx.append(el("p", { text: p }))); log.scrollTop = log.scrollHeight; });
        if (!cur) {
          const p = mode === "love" ? people.find((x) => x.id === pid) : null;
          cur = { id: "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), mode, pid: p ? p.id : "", pname: p ? p.name || "" : "", title: q.replace(/\s+/g, " ").slice(0, 40), msgs: [], createdAt: Date.now(), updatedAt: Date.now() };
          sessions.unshift(cur);
        }
        const um = { role: "user", text: q, raw: msg }; if (drawn) um.cards = drawn;
        cur.msgs.push(um, { role: "model", text: ans || "음… 잘 모르겠어요. 다르게 물어봐 줄래요?" });
        cur.updatedAt = Date.now(); saveLocal(); aiChatSave(cur); paintCur();
      } catch (e) {
        clear(tx); tx.append(el("p", { text: aiErrorText(e) })); if (isAdmin()) tx.append(el("p", { class: "tiny muted", text: "관리자만 보여요 · " + aiErrorRaw(e) }));
        chat = null;
        if (!isAdmin() && n >= (cfg.freePerDay || 0)) { addCoins(cost, { kind: "refund", label: "AI 상담 실패 환불" }); toast(`답을 못 받아서 코인 ${cost}개를 돌려드렸어요`); }
        writeJ(USE_KEY, { d: ymd(), n });
      }
      out.classList.remove("typing");
      busy = false; sendB.disabled = false; paintMeter();
    };
    sendB.addEventListener("click", send);
    ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });
    paintAll();
    // 다른 기기에서 나눈 대화도 불러와서 합치기
    aiChatsList().then((cl) => {
      if (!cl || !cl.length) { if (cl && sessions.length) sessions.forEach((x) => aiChatSave(x)); return; }
      const by = new Map(sessions.map((x) => [x.id, x]));
      let changed = false;
      cl.forEach((x) => { const a = by.get(x.id); if (!a || (x.updatedAt || 0) > (a.updatedAt || 0)) { by.set(x.id, x); changed = true; } });
      const cloudIds = new Set(cl.map((x) => x.id));
      sessions.filter((x) => !cloudIds.has(x.id)).forEach((x) => aiChatSave(x)); // 이 기기에만 있던 건 올리기
      if (changed) { sessions = [...by.values()]; saveLocal(); if (cur) cur = sessions.find((x) => x.id === cur.id) || cur; if (!busy) paintAll(); }
    });
  })();
  return root;
}

/* =========================== 🛠 관리자: 상담소 =========================== */
export function consultAdminPanel() {
  const sec = el("section", { class: "wrap", style: "margin-bottom: var(--sp-4);" });
  const fold = el("details", { class: "panel adm-fold cs-adm" });
  const badge = el("span", { class: "er-badge", text: "…" });
  const body = el("div", { class: "adm-fold-b" });
  fold.append(el("summary", {}, [el("span", { class: "adm-fold-h" }, [el("b", { text: "🔮 상담소" }), el("small", { class: "tiny muted", text: "상담사 이름으로 답해요 · 상담사 목록 고치기" })]), badge]), body);
  sec.append(fold);
  let filter = "wait";
  const load = async () => {
    clear(body);
    const r = await adminConsults();
    if (r.error) { badge.textContent = "-"; body.append(el("p", { class: "muted tiny", text: r.error })); return; }
    const waitN = r.list.filter((c) => c.unreadAdmin || c.status === "wait").length;
    badge.textContent = waitN ? `대기 ${waitN}` : "대기 없음 ✓"; badge.classList.toggle("hot", waitN > 0);
    body.append(el("div", { class: "dash-tabs" }, [["wait", "답변 대기"], ["all", "전체"]].map(([k, t]) => el("button", { type: "button", class: "dash-tab" + (k === filter ? " on" : ""), onclick: () => { filter = k; load(); } }, [el("span", { text: t })]))));
    const list = filter === "wait" ? r.list.filter((c) => c.unreadAdmin || c.status === "wait") : r.list;
    if (!list.length) body.append(el("p", { class: "muted tiny", text: filter === "wait" ? "기다리는 상담이 없어요 🐾" : "상담이 아직 없어요." }));
    list.forEach((c) => body.append(el("button", { type: "button", class: "cs-row" + (c.unreadAdmin ? " new" : ""), onclick: () => openAdminThread(c, load) }, [
      el("span", { class: "cs-st " + c.status, text: c.unreadAdmin ? "새 질문" : c.status === "wait" ? "대기" : c.status === "done" ? "끝" : "답함" }),
      el("span", { class: "cs-row-t" }, [el("b", { text: c.title || "(제목 없음)" }), el("small", { text: `${c.name} → ${c.expertName}(${c.field}) · ${fmt(c.updatedAt)} · ${(c.msgs || []).length}개` })]),
      el("span", { class: "cs-ai-go", "aria-hidden": "true", text: "›" }),
    ])));
    body.append(expertEditor(), expertAccountsBox());
  };
  fold.addEventListener("toggle", () => { if (fold.open) load(); });
  adminConsults().then((r) => { if (!r.error) { const n = r.list.filter((c) => c.unreadAdmin || c.status === "wait").length; badge.textContent = n ? `대기 ${n}` : "대기 없음 ✓"; badge.classList.toggle("hot", n > 0); } else badge.textContent = "-"; });
  return sec;
}
function openAdminThread(c, reload, { expert = false } = {}) {
  const ta = el("textarea", { class: "input cs-ta", rows: "6", maxlength: "3000", placeholder: `${c.expertName}(으)로 답장 쓰기` });
  const msgs = el("div", { class: "cs-msgs" }, (c.msgs || []).map((m) => bubble(m.by === "u" ? "ex" : "me", m.t, m.by === "u" ? c.name : c.expertName, m.at)));
  const sendB = el("button", { type: "button", class: "btn btn-primary btn-sm" }, [el("span", { text: "답변 보내기" })]);
  const closeB = el("button", { type: "button", class: "btn btn-ghost btn-sm" }, [el("span", { text: "상담 끝내기" })]);
  let armed = false;
  const delB = el("button", { type: "button", class: "ev-del" }, [el("span", { text: "지우기" })]);
  const rv = el("div", { class: "cs-rv-admin" });
  const m = openModal([
    el("p", { class: "tiny muted", text: `${c.name} · ${fmt(c.createdAt)} · ${c.field} 상담 (${c.expertName})` }),
    c.birth ? el("pre", { class: "cs-birth", text: c.birth }) : el("p", { class: "tiny muted", text: "사주 정보 없이 보낸 상담이에요." }),
    msgs, rv, ta, el("div", { class: "btn-row" }, expert ? [sendB, closeB] : [sendB, closeB, delB]),
  ], { title: c.title || "상담" });
  getMyRating(c.id).then((x) => {
    if (!x) return;
    const dB = expert ? null : el("button", { type: "button", class: "ev-del" }, [el("span", { text: "평점 지우기" })]);
    if (dB) dB.addEventListener("click", async () => { const r = await adminDeleteRating(c.id); if (r.error) { toast(r.error); return; } toast("평점을 지웠어요"); clear(rv); });
    rv.append(el("div", { class: "cs-rbox-done" }, [el("span", { text: "받은 평점" }), el("span", { class: "cs-stars", text: starTxt(x.s) }), x.c ? el("span", { class: "tiny muted cs-rbox-c", text: `“${x.c}”` }) : null, dB].filter(Boolean)));
  });
  sendB.addEventListener("click", async () => {
    if (ta.value.trim().length < 2) return; sendB.disabled = true;
    const r = await adminReplyConsult(c, ta.value.trim()); sendB.disabled = false;
    if (r.error) { toast(r.error); return; }
    toast("답변을 보냈어요 · 알림을 켠 이용자에겐 1시간 안에 알림이 가요"); m.close(); reload();
  });
  closeB.addEventListener("click", async () => { const r = await adminReplyConsult(c, ta.value.trim(), { close: true }); if (r.error) { toast(r.error); return; } toast("상담을 끝냈어요"); m.close(); reload(); });
  delB.addEventListener("click", async () => {
    if (!armed) { armed = true; delB.classList.add("armed"); delB.firstChild.textContent = "한 번 더 누르면 지워요"; return; }
    const r = await adminDeleteConsult(c.id); if (r.error) { toast(r.error); return; } toast("지웠어요"); m.close(); reload();
  });
}
function expertAccountsBox() {
  const box = el("div", { class: "cs-exed" }, [el("p", { class: "eyebrow", text: "상담사 계정 연결" }), el("p", { class: "tiny muted", text: "연결된 계정은 상담소에 ‘상담사 화면’이 생기고, 고른 상담사로 들어온 상담만 보고 답할 수 있어요." })]);
  const inner = el("div", { class: "cs-xa" });
  box.append(inner);
  const load = async () => {
    clear(inner);
    const [r, exAll] = await Promise.all([adminExpertAccounts(), getExperts().catch(() => DEFAULT_EXPERTS)]);
    if (r.error) { inner.append(el("p", { class: "muted tiny", text: r.error })); return; }
    const exName = (id) => { const e = exAll.find((x) => x.id === id); return e ? `${e.em} ${e.name}` : id === "new" ? "새 상담사" : id; };
    const pick = (val) => { const x = el("select", { class: "input" }, exAll.map((e) => el("option", { value: e.id, text: `${e.em} ${e.name} (${e.field})` }))); if (exAll.some((e) => e.id === val)) x.value = val; return x; };
    const wait = r.applies.filter((a) => a.status === "wait");
    inner.append(el("p", { class: "cs-lb", text: `신청 ${wait.length}건` }));
    if (!wait.length) inner.append(el("p", { class: "tiny muted", text: "새 신청이 없어요." }));
    wait.forEach((a) => {
      const sel = pick(a.expertId);
      inner.append(el("div", { class: "cs-xa-r" }, [
        el("div", { class: "cs-xa-t" }, [el("b", { text: `${a.name || "이름 없음"} · ${a.email}` }), el("small", { class: "tiny muted", text: `희망: ${exName(a.expertId)} · ${fmt(a.at)}` }), a.msg ? el("p", { class: "tiny", text: a.msg }) : null].filter(Boolean)),
        el("div", { class: "cs-exed-line" }, [sel,
          el("button", { type: "button", class: "btn btn-primary btn-sm", onclick: async () => { const x = await adminLinkExpert({ uid: a.uid, email: a.email, name: a.name, expertId: sel.value }); if (x.error) { toast(x.error); return; } toast(`${a.name || a.email} → ${exName(sel.value)} 연결했어요`); load(); } }, [el("span", { text: "연결" })]),
          el("button", { type: "button", class: "ev-del", onclick: async () => { const x = await adminRejectExpert(a.uid); if (x.error) { toast(x.error); return; } toast("거절했어요"); load(); } }, [el("span", { text: "거절" })]),
        ]),
      ]));
    });
    // 이메일로 바로 연결
    const em = el("input", { class: "input", type: "email", placeholder: "회원 이메일로 바로 연결", maxlength: "80" });
    const sel = pick(exAll[0] && exAll[0].id);
    const go = el("button", { type: "button", class: "btn btn-ghost btn-sm" }, [el("span", { text: "연결" })]);
    go.addEventListener("click", async () => {
      if (!/@/.test(em.value)) { toast("이메일을 적어 주세요"); return; }
      go.disabled = true; const f = await adminFindUserByEmail(em.value); if (f.error) { go.disabled = false; toast(f.error); return; }
      const x = await adminLinkExpert({ uid: f.user.uid, email: f.user.email, name: f.user.name, expertId: sel.value }); go.disabled = false;
      if (x.error) { toast(x.error); return; } toast(`${f.user.email} → ${exName(sel.value)} 연결했어요`); load();
    });
    inner.append(el("p", { class: "cs-lb", text: "이메일로 바로 연결" }), el("div", { class: "cs-exed-line" }, [em, sel, go]));
    inner.append(el("p", { class: "cs-lb", text: `연결된 계정 ${r.links.length}개` }));
    if (!r.links.length) inner.append(el("p", { class: "tiny muted", text: "아직 연결된 상담사 계정이 없어요." }));
    r.links.forEach((l) => {
      let armed = false;
      const un = el("button", { type: "button", class: "ev-del" }, [el("span", { text: "해제" })]);
      un.addEventListener("click", async () => {
        if (!armed) { armed = true; un.classList.add("armed"); un.firstChild.textContent = "한 번 더 누르면 해제"; return; }
        const x = await adminUnlinkExpert(l.uid); if (x.error) { toast(x.error); return; } toast("연결을 풀었어요"); load();
      });
      inner.append(el("div", { class: "cs-xa-r" }, [
        el("div", { class: "cs-xa-t" }, [el("b", { text: `${exName(l.expertId)} ← ${l.name || "이름 없음"}` }), el("small", { class: "tiny muted", text: `${l.email} · ${fmt(l.at)}` })]),
        un,
      ]));
    });
  };
  load();
  return box;
}
function expertEditor() {
  const box = el("div", { class: "cs-exed" }, [el("p", { class: "eyebrow", text: "상담사 목록" })]);
  const rows = el("div", { class: "cs-exed-rows" });
  box.append(rows);
  let list = [];
  const paint = () => {
    clear(rows);
    list.forEach((e, i) => {
      const inp = (k, ph, w) => { const x = el("input", { class: "input", value: e[k] == null ? "" : String(e[k]), placeholder: ph, style: w ? `max-width:${w}` : "" }); x.addEventListener("input", () => { e[k] = k === "cost" ? +x.value || 0 : x.value; }); return x; };
      const on = el("input", { type: "checkbox", checked: e.on !== false }); on.addEventListener("change", () => { e.on = on.checked; });
      rows.append(el("div", { class: "cs-exed-r" }, [
        el("div", { class: "cs-exed-line" }, [inp("em", "🔮", "64px"), inp("name", "이름"), inp("field", "분야(타로/사주/연애)"), inp("cost", "코인", "80px")]),
        inp("intro", "한 줄 소개 (120자)"),
        el("div", { class: "cs-exed-line" }, [el("label", { class: "chip" }, [on, el("span", { text: "보이기" })]), el("button", { type: "button", class: "ev-del", onclick: () => { list.splice(i, 1); paint(); } }, [el("span", { text: "빼기" })])]),
      ]));
    });
  };
  const save = el("button", { type: "button", class: "btn btn-primary btn-sm" }, [el("span", { text: "상담사 목록 저장" })]);
  save.addEventListener("click", async () => { const r = await adminSetExperts(list); if (r.error) { toast(r.error); return; } list = r.list; paint(); toast("상담사 목록을 저장했어요"); });
  box.append(el("div", { class: "btn-row" }, [el("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: () => { list.push({ id: "x" + Date.now().toString(36), name: "", em: "🔮", field: "사주", intro: "", cost: 3, on: true }); paint(); } }, [el("span", { text: "＋ 상담사 추가" })]), save]));
  getExperts().then((l) => { list = JSON.parse(JSON.stringify(l || DEFAULT_EXPERTS)); paint(); });
  return box;
}
