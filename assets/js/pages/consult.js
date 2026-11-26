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
import { getUser, getExperts, createConsult, myConsults, getConsult, addConsultMsg, markConsultRead, adminConsults, adminReplyConsult, adminDeleteConsult, adminSetExperts, DEFAULT_EXPERTS } from "../cloud.js";
import { aiReady, openChat, ask, aiErrorText } from "../ai.js";
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
        el("b", { text: "🐱 해묘 AI 상담" }),
        el("small", { text: aiReady() ? `지금 바로 답해 줘요 · 질문마다 코인 ${getConfig().ai.costPerQ || 5}개` : "준비 중이에요 · 곧 열려요" }),
      ]),
      el("span", { class: "cs-ai-go", "aria-hidden": "true", text: "›" }),
    ]));
    // 상담사
    host.append(el("p", { class: "eyebrow cs-h", text: "상담사에게 묻기 · 24시간 안에 답해요" }));
    const grid = el("div", { class: "cs-grid" }, [el("p", { class: "tiny muted", text: "불러오는 중…" })]);
    host.append(grid);
    const ex = (await getExperts().catch(() => DEFAULT_EXPERTS)).filter((e) => e.on !== false);
    clear(grid);
    ex.forEach((e) => grid.append(el("article", { class: "panel cs-ex" }, [
      el("div", { class: "cs-ex-top" }, [el("span", { class: "cs-ex-em", text: e.em }), el("div", {}, [el("b", { text: e.name }), el("span", { class: "cs-tag", text: `${e.field} 상담` })])]),
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

/* =========================== 🐱 AI 상담 =========================== */
const MODES = [
  { id: "saju", em: "🔮", name: "사주 상담", hint: ["올해 나한테 제일 중요한 게 뭐야?", "나한테 맞는 일은 어떤 쪽이야?", "요즘 왜 이렇게 지칠까?"] },
  { id: "tarot", em: "🃏", name: "타로 상담", hint: ["그 사람 지금 내 생각 할까?", "이번 선택, 해도 될까?", "이번 달 나에게 필요한 메시지는?"] },
  { id: "love", em: "💗", name: "연애 상담", hint: ["우리 둘 잘 맞아?", "먼저 연락해도 될까?", "이 관계 오래갈 수 있을까?"] },
];
const HIST_KEY = "str.aichat.v1", USE_KEY = "str.aiuse.v1";
const readJ = (k, fb) => { try { return JSON.parse(localStorage.getItem(k) || "null") || fb; } catch { return fb; } };
const writeJ = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };
function rnd() { try { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; } catch { return Math.random(); } }

export function renderAIConsult({ navigate }) {
  const root = el("div", { class: "cs ai" });
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/consult", "상담소")]));
  root.append(pageHeader("AI COUNSEL", "해묘 AI 상담", "내 사주(四柱) · 타로 · 그 사람 사주를 바탕으로 해묘 고양이가 바로 답해요. 대화는 이 기기에만 남아요."));
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
    if (!(await needLogin(host, navigate, "AI 상담"))) return;
    const my = getMyBirth();
    if (!my) {
      host.append(noticeBox("info", "AI 상담은 내 사주를 바탕으로 답해요. 생년월일을 먼저 넣어 주세요."));
      host.append(el("button", { type: "button", class: "btn btn-primary", onclick: () => navigate("/saju") }, [el("span", { text: "내 정보 넣기" })]));
      return;
    }
    const people = getPeople().filter((p) => p && p.input && p.input.birthDate);
    let mode = "saju", pid = people[0] ? people[0].id : "", chat = null, busy = false;
    const hist = readJ(HIST_KEY, {});
    let cards = [];
    try { cards = (await loadTarotData()).cards; } catch { /* 타로 없이 */ }

    const tabs = el("div", { class: "cs-tabs", role: "tablist" });
    const sub = el("div", { class: "cs-sub" });
    const log = el("div", { class: "cs-msgs ai-log", "aria-live": "polite" });
    const hints = el("div", { class: "chip-slide cs-hints" });
    const ta = el("textarea", { class: "input cs-ta", rows: "2", maxlength: "500", placeholder: "궁금한 걸 편하게 물어봐요 (500자까지)" });
    const sendB = el("button", { type: "button", class: "btn btn-primary cs-send", "aria-label": "보내기" }, [el("span", { text: "보내기" })]);
    const meter = el("p", { class: "tiny muted cs-meter" });
    host.append(tabs, sub, log, hints, el("div", { class: "cs-reply" }, [ta, sendB]), meter,
      el("div", { class: "cs-ai-foot" }, [
        el("button", { type: "button", class: "btn btn-quiet btn-sm", onclick: () => { hist[mode] = []; writeJ(HIST_KEY, hist); chat = null; paintLog(); } }, [el("span", { text: "이 대화 지우기" })]),
        el("button", { type: "button", class: "btn btn-quiet btn-sm", onclick: () => navigate("/consult") }, [el("span", { text: "사람 상담사에게 묻기 ›" })]),
      ]),
      noticeBox("info", "AI가 사주 · 타로로 본 참고 의견이에요. 틀릴 수 있고, 중요한 결정은 꼭 스스로 · 전문가와 함께 내려 주세요. 질문과 사주 요약은 답을 만들려고 Google Gemini로 보내지며, 대화 기록은 이 기기에만 남아요."));

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
      MODES.forEach((md) => tabs.append(el("button", { type: "button", role: "tab", "aria-selected": String(md.id === mode), class: "chip" + (md.id === mode ? " on" : ""), onclick: () => { if (busy) return; mode = md.id; chat = null; paintAll(); } }, [el("span", { text: `${md.em} ${md.name}` })])));
      clear(sub);
      if (mode === "love") {
        sub.append(el("p", { class: "tiny muted", text: "누구와의 연애를 물어볼까?" }), el("div", { class: "chip-slide" }, [
          el("button", { type: "button", class: "chip" + (!pid ? " on" : ""), onclick: () => { pid = ""; chat = null; paintAll(); } }, [el("span", { text: "🌙 아직 없음" })]),
          ...people.map((p) => el("button", { type: "button", class: "chip" + (p.id === pid ? " on" : ""), onclick: () => { pid = p.id; chat = null; paintAll(); } }, [el("span", { text: p.name || "이름 없음" })])),
          el("button", { type: "button", class: "chip", onclick: () => navigate("/people") }, [el("span", { text: "＋ 사람 추가" })]),
        ]));
      }
    };
    const histKey = () => (mode === "love" ? `love:${pid || "none"}` : mode);
    const paintLog = () => {
      clear(log);
      const h = hist[histKey()] || [];
      if (!h.length) log.append(bubble("ex", mode === "tarot" ? "질문을 적으면 제가 카드 세 장을 뽑아서 읽어 드릴게요. 마음속으로 질문을 한 번 떠올려 봐요 🐾" : mode === "love" ? "그 사람과의 이야기, 편하게 털어놔요. 두 사람 사주를 같이 보고 답할게요 💗" : "안녕하세요, 해묘예요. 당신의 사주를 펼쳐 놓고 기다리고 있었어요. 무엇이든 물어봐요 🐾", "해묘"));
      h.forEach((m) => {
        if (m.cards) log.append(cardRow(m.cards));
        log.append(bubble(m.role === "user" ? "me" : "ex", m.text, m.role === "user" ? "나" : "해묘"));
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
    const paintAll = () => { paintTabs(); paintLog(); paintHints(); paintMeter(); };

    const send = async () => {
      const q = ta.value.trim();
      if (!q || busy) return;
      const n = use();
      if (!isAdmin() && n >= (cfg.maxPerDay || 20)) { toast("오늘은 여기까지 물어볼 수 있어요. 내일 또 만나요 🐾"); return; }
      const cost = cfg.costPerQ || 5;
      if (!isAdmin() && n >= (cfg.freePerDay || 0)) { const r = spend(cost, { kind: "ai", label: "AI 상담" }); if (!r.ok) { noCoinToast(cost); return; } }
      writeJ(USE_KEY, { d: ymd(), n: n + 1 });
      busy = true; sendB.disabled = true; ta.value = "";
      const key = histKey(), h = (hist[key] = hist[key] || []);
      let msg = q, drawn = null;
      if (mode === "tarot" && cards.length) {
        const pool = cards.map((_, i) => i);
        drawn = ["과거", "현재", "조언"].map((pos) => { const k = Math.floor(rnd() * pool.length); const c = cards[pool.splice(k, 1)[0]]; const rev = rnd() < 0.3; return { pos, name: c.name, en: c.nameEn, rev, kw: (c.keywords || []).slice(0, 3).join(", "), es: ((rev ? c.reversed : c.upright) || {}).essence || "" }; });
        msg = `${q}\n\n[뽑은 카드]\n${drawn.map((c) => `${c.pos}: ${c.name}(${c.en})${c.rev ? " 역방향" : " 정방향"} — ${c.kw} / ${c.es}`).join("\n")}`;
        log.append(cardRow(drawn));
      }
      log.append(bubble("me", q, "나"));
      const out = bubble("ex", "…", "해묘"); out.classList.add("typing");
      log.append(out); log.scrollTop = log.scrollHeight;
      const tx = out.querySelector(".cs-b-tx");
      try {
        if (!chat) chat = await openChat(context(), h.slice(-12).map((m) => ({ role: m.role, text: m.raw || m.text })));
        const ans = await ask(chat, msg, (t) => { clear(tx); t.split(/\n+/).forEach((p) => tx.append(el("p", { text: p }))); log.scrollTop = log.scrollHeight; });
        h.push({ role: "user", text: q, raw: msg, cards: drawn || undefined }, { role: "model", text: ans || "음… 잘 모르겠어요. 다르게 물어봐 줄래요?" });
        hist[key] = h.slice(-20); writeJ(HIST_KEY, hist);
      } catch (e) {
        clear(tx); tx.append(el("p", { text: aiErrorText(e) }));
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
    body.append(expertEditor());
  };
  fold.addEventListener("toggle", () => { if (fold.open) load(); });
  adminConsults().then((r) => { if (!r.error) { const n = r.list.filter((c) => c.unreadAdmin || c.status === "wait").length; badge.textContent = n ? `대기 ${n}` : "대기 없음 ✓"; badge.classList.toggle("hot", n > 0); } else badge.textContent = "-"; });
  return sec;
}
function openAdminThread(c, reload) {
  const ta = el("textarea", { class: "input cs-ta", rows: "6", maxlength: "3000", placeholder: `${c.expertName}(으)로 답장 쓰기` });
  const msgs = el("div", { class: "cs-msgs" }, (c.msgs || []).map((m) => bubble(m.by === "u" ? "ex" : "me", m.t, m.by === "u" ? c.name : c.expertName, m.at)));
  const sendB = el("button", { type: "button", class: "btn btn-primary btn-sm" }, [el("span", { text: "답변 보내기" })]);
  const closeB = el("button", { type: "button", class: "btn btn-ghost btn-sm" }, [el("span", { text: "상담 끝내기" })]);
  let armed = false;
  const delB = el("button", { type: "button", class: "ev-del" }, [el("span", { text: "지우기" })]);
  const m = openModal([
    el("p", { class: "tiny muted", text: `${c.name} · ${fmt(c.createdAt)} · ${c.field} 상담 (${c.expertName})` }),
    c.birth ? el("pre", { class: "cs-birth", text: c.birth }) : el("p", { class: "tiny muted", text: "사주 정보 없이 보낸 상담이에요." }),
    msgs, ta, el("div", { class: "btn-row" }, [sendB, closeB, delB]),
  ], { title: c.title || "상담" });
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
