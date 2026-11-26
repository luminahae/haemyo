import { el, clear, toast } from "../utils/dom.js";
import { pageHeader, backLink, noticeBox, loadDisclaimer } from "./shared.js";
import { getMyBirth, stash } from "../state.js";
import { personSwitch } from "./people.js";
/* (합침) ./calendar.js 에서 가져오던 것 — 이제 같은 파일 */
import { themes as sajuThemes, banner as themeBanner } from "./explore.js";
import { computeSaju } from "../saju/manse.js";
import { TOPICS, topicMeta, readTopic, isPeriodTopic, readTopicPeriod, PERIODS } from "../saju/topics.js";
import { methodReading, METHODS } from "../saju/strength.js";
import { radarScores, radarSvg, monthScores } from "../saju/extras.js";
import { getCoins, isUnlocked, unlock, grant, costOf, markDayViewed, COIN_PRICE_KRW, isUnlimited, noCoinToast } from "../wallet.js";
import { premiumRelated } from "./special.js";
import { freeList, freeCount } from "./freeGenre.js";
/* 기본 운세는 모두 무료 — 코인은 프리미엄 특집에만 */
function isFreeCombo() { return true; }
/* 기본 운세 아래 붙는 연관 프리미엄 (깊이 보기) */
const LOVE_REL = ["reuniondeep", "dohwa", "lovecount", "ddaylove", "completeme"];
const JOB_REL = ["manual", "yeokma", "t-true-calling", "t-quit-job", "s-career"];
const MONEY_REL = ["gaeun", "bujeok", "s-wealth", "t-money-when", "t-money-flow"];
const RELATED = {
  reunion: ["reuniondeep", "pastlove", "t-ex-50", "t-no-contact", "s-reunion"],
  breakup: ["reuniondeep", "pastlove", "t-ex-50", "t-breakup-today", "lovecount"],
  todaylove: LOVE_REL, tomorrowlove: LOVE_REL, daylove: ["s-some-date", ...LOVE_REL.slice(0, 4)], monthlove: ["t-month-love", ...LOVE_REL.slice(0, 4)], yearlove: ["s-solo-escape", ...LOVE_REL.slice(0, 4)], love: LOVE_REL,
  today: ["timeline", "manual", "yukim", "diary"], tomorrow: ["timeline", "manual", "yukim", "diary"], weekday: ["timeline", "manual", "astrodice", "diary"], weekend: ["timeline", "manual", "astrodice", "diary"],
  month: ["healthsaju", "t-good-this-month", "s-year-12", "timeline"], nextmonth: ["healthsaju", "s-year-12", "timeline", "bujeok"],
  year: ["tojeong", "s-year-12", "timeline", "ziwei"], h1lucky: ["timeline", "tojeong", "bujeok"], h2lucky: ["timeline", "tojeong", "bujeok"],
  study: ["studyluck", "hwagae", "t-job-exam", "t-job-pass"], document: ["studyluck", "t-job-pass", "iching"], interview: ["t-job-interview", "studyluck", "manual", "t-job-pass"],
  job: JOB_REL, jobmonth: ["t-job-when", ...JOB_REL.slice(0, 3)], worktype: JOB_REL, jobchange: ["yeokma", "t-quit-job", "t-job-change", "timeline"], promotion: ["t-job-boss", ...JOB_REL.slice(0, 3)], coworker: ["s-people", "manual", "t-work-careful"], startup: ["t-money-biz", "manual", "timeline", "gaeun"],
  wealth: MONEY_REL, moneymonth: MONEY_REL, moneytype: MONEY_REL, windfall: ["t-money-windfall", ...MONEY_REL.slice(0, 3)], saving: ["t-money-save", ...MONEY_REL.slice(0, 3)], invest: ["t-money-invest", ...MONEY_REL.slice(0, 3)], spending: MONEY_REL, sidejob: ["t-money-side", ...MONEY_REL.slice(0, 3)], business: ["t-money-biz", ...MONEY_REL.slice(0, 3)],
};
const DEEP_CTA = {
  reunion: ["그 사람 사주를 넣고 더 깊이", "왜 헤어졌는지 · 재회 궁합 점수 · 다시 열리는 달까지"],
  breakup: ["헤어진 이유, 두 사람 사주로 보기", "엇갈린 결 · 그때의 기운 · 재회 궁합까지"],
};

/* 카테고리별 파스텔 면(배경 tint) + 코너 악센트(부드러운 오브) — 아이콘/이모지 대신 색으로 구분 */
const TINT = {
  today: "linear-gradient(155deg, rgba(255,214,190,.26), rgba(255,190,170,.08))",
  weekday: "linear-gradient(155deg, rgba(214,226,255,.24), rgba(190,205,255,.07))",
  weekend: "linear-gradient(155deg, rgba(255,224,236,.26), rgba(255,196,222,.08))",
  love: "linear-gradient(155deg, rgba(255,196,214,.30), rgba(249,168,196,.10))",
  reunion: "linear-gradient(155deg, rgba(224,196,246,.26), rgba(200,168,236,.08))",
  breakup: "linear-gradient(155deg, rgba(210,196,220,.22), rgba(190,170,200,.07))",
  wealth: "linear-gradient(155deg, rgba(255,224,180,.26), rgba(240,200,150,.08))",
  study: "linear-gradient(155deg, rgba(196,232,220,.26), rgba(170,220,205,.08))",
  document: "linear-gradient(155deg, rgba(214,222,236,.24), rgba(190,205,225,.07))",
};
const ACCENT = {
  today: "#ffd0b0", tomorrow: "#ffe0c4", tomorrowlove: "#ffcadb", daylove: "#f7b6d0", weekday: "#cdd8ff", weekend: "#ffcfe4",
  month: "#ffe0b0", nextmonth: "#c9e0d0", year: "#e8cff0",
  todaylove: "#ffc2d4", monthlove: "#ffb8cf",
  love: "#ffbfd2", yearlove: "#ffb0c8", reunion: "#d9c4f2", breakup: "#d2c4dc",
  wealth: "#ffdca6", business: "#e0d0b0", study: "#c4e8dc", document: "#cdd6ec",
  h1lucky: "#ffe2b0", h2lucky: "#c4dcec",
  job: "#c8dcff", jobmonth: "#b8e0d2", interview: "#d6ccff", worktype: "#c4e8dc", jobchange: "#cfe3f0", promotion: "#e6d3ff", coworker: "#d0e4ff", startup: "#ffd7b0",
  moneymonth: "#ffe2a0", moneytype: "#ffd59a", windfall: "#ffe7b8", saving: "#e8dcb0", invest: "#f5cfa0", spending: "#ffc9b8", sidejob: "#fde0bd",
};
const tint = (id) => `linear-gradient(155deg, ${hexA(ACCENT[id] || "#ecabb0", .26)}, transparent)`;
function hexA(hex, a) {
  const h = hex.replace("#", ""); const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function dateKey(id) {
  const d = new Date(); const p = (n) => String(n).padStart(2, "0");
  if (id === "today") return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  // 주 단위(연도-주차)
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}W${week}`;
}
/* 지정일 연애운의 날짜 (기본: 내일) */
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function tomorrowStr() { const d = new Date(); d.setDate(d.getDate() + 1); return ymd(d); }
function dayLoveDate() { return window.__dayLoveDate || tomorrowStr(); }
function itemIdFor(method, id, input) {
  if (id === "tomorrow" || id === "tomorrowlove") return `${method}:${id}:${tomorrowStr()}`;
  if (id === "daylove") return `${method}:${id}:${dayLoveDate()}`;
  const meta = topicMeta(id);
  const d = new Date(); const ym = `${d.getFullYear()}-${d.getMonth() + 1}`;
  const sig = `${input.birthDate || ""}_${input.timeUnknown ? "x" : (input.birthTime || "-")}`;
  const p = `${method}:${id}`;
  if (meta && meta.kind === "daily") return `${p}:${dateKey(id)}`;
  if (id === "todaylove") return `${p}:${dateKey("today")}`;
  if (id === "month" || id === "monthlove") return `${p}:${ym}`;
  if (id === "nextmonth") return `${p}:${d.getFullYear()}-${d.getMonth() + 2}`;
  if (id === "year" || id === "h1lucky" || id === "h2lucky" || id === "jobmonth" || id === "moneymonth") return `${p}:${d.getFullYear()}${id.endsWith("month") ? ":" + sig : ""}`;
  return `${p}:${sig}`;
}
const METHOD_DESC = {
  saju: "실제 만세력 명식(십신)으로 풀어요.",
  tarot: "해묘가 카드 한 장을 펼쳐 풀어요.",
  ziwei: "자미두수 명반의 관련 궁으로 봐요.",
  tojeong: "올해의 괘(토정비결)로 봐요.",
};
/* 다른 화면으로 가는 인연 타일 */
const LINK_TILES = {
  "dday-love": { name: "연애 시작 D-day", blurb: "새 연애까지 며칠 남았을까", to: (m) => m === "tarot" ? "/dday/love/tarot" : "/dday/love", cost: 2, accent: "#ffb0c8" },
  "dday-marry": { name: "결혼 D-day", blurb: "결혼까지 며칠 남았을까", to: (m) => m === "tarot" ? "/dday/marry/tarot" : "/dday/marry", cost: 2, accent: "#ffc6d6" },
  "dday-meet": { name: "인연은 어디서", blurb: "동서남북·지역·외국인 힌트", to: (m) => m === "tarot" ? "/dday/meet/tarot" : "/dday/meet", cost: 2, accent: "#cdd8ff" },
  "past-love": { name: "지난 연애 맞히기", blurb: "사주로 맞히는 과거 연애한 해", to: "/dday/past", cost: 2, accent: "#d9c4f2" },
  "inyeon-me": { name: "나의 인연 알아보기", blurb: "이상형·초상화·바람기", to: "/inyeon", cost: 5, accent: "#ffb3c8" },
  "iching": { name: "주역점", blurb: "동전으로 묻는 64괘", to: "/iching", cost: 0, accent: "#cdd8ff" },
  "gaeun": { name: "풍수 · 개운", blurb: "용신 맞춤 방 배치·습관", to: "/gaeun", cost: 2, accent: "#bfe1d1" },
  "bujeok": { name: "개운 부적", blurb: "소원 담은 용신 색 부적", to: "/bujeok", cost: 1, accent: "#ffd9a8" },
  "luckynumber": { name: "행운 번호", blurb: "오늘 사주가 고른 숫자", to: "/luckynumber", cost: 0, accent: "#ffe0cf" },
  "sajutoon": { name: "사주툰", blurb: "나의 하루 4컷 만화", to: "/sajutoon", cost: 2, accent: "#ffc6d6" },
  "classic": { name: "이달의 명심보감", blurb: "고전 한 구절 · 무료", to: "/classic", cost: 0, accent: "#e7d2f3" },
  "health-saju": { name: "사주 건강운", blurb: "이달 컨디션 · 약한 오행", to: "/health-saju", cost: 2, accent: "#c2f2d8" },
  "study-luck": { name: "공부운", blurb: "공부 스타일·12달·시험 좋은 날", to: "/study-luck", cost: 2, accent: "#c4e8dc" },
  "pastlife-me": { name: "전생 이야기", blurb: "전생의 나 · 잘 맞는 직업", to: "/pastlife", cost: 3, accent: "#d6ccff" },
};
/* 타일 아이콘 */
const EMO = {
  today: "☀️", tomorrow: "🌤️", weekday: "🗓️", weekend: "🎈", month: "🌙", nextmonth: "🌛", year: "🎆",
  "dday-love": "💗", "dday-marry": "💍", "dday-meet": "🧭", "past-love": "🔙", todaylove: "💞", tomorrowlove: "💌", daylove: "📆", monthlove: "🌹", yearlove: "💝", reunion: "🔁", breakup: "💔", "inyeon-me": "🌸", "pastlife-me": "⏳",
  job: "💼", jobmonth: "📈", interview: "🎤", worktype: "🧑‍💻", jobchange: "🚪", promotion: "🏅", coworker: "🤝", study: "📚", document: "📝",
  wealth: "💰", moneymonth: "🪙", moneytype: "🏺", windfall: "🎁", saving: "🐷", invest: "📊", spending: "🧾", sidejob: "🧩", business: "🏪", startup: "🚀",
  "health-saju": "💊", "study-luck": "🎓", h1lucky: "🍀", h2lucky: "🌾", luckynumber: "🔢", gaeun: "🏠", bujeok: "🧧", iching: "🪙", sajutoon: "🐱", classic: "📜",
};
/* 카테고리 그룹 */
const GROUPS = [
  { label: "오늘 · 내일 · 이번 주", ids: ["today", "tomorrow", "weekday", "weekend"] },
  { label: "이달 · 올해", ids: ["month", "nextmonth", "year"] },
  { label: "연애 · 인연", ids: ["todaylove", "tomorrowlove", "daylove", "monthlove", "yearlove", "reunion", "breakup", "dday-love", "dday-marry", "dday-meet", "past-love", "inyeon-me", "pastlife-me"] },
  { label: "공부 · 시험", ids: ["study", "interview", "document", "study-luck"] },
  { label: "취업 · 직장", ids: ["job", "jobmonth", "worktype", "jobchange", "promotion", "coworker"] },
  { label: "재물 · 돈", ids: ["wealth", "moneymonth", "moneytype", "windfall", "saving", "invest", "spending", "sidejob", "business", "startup"] },
  { label: "건강 · 행운의 달", ids: ["h1lucky", "h2lucky", "health-saju", "luckynumber"] },
  { label: "개운 · 재미", ids: ["gaeun", "bujeok", "iching", "sajutoon", "classic"] },
];

/* ---------------- 카탈로그 ---------------- */
export function renderFortuneHub({ navigate }) {
  loadDisclaimer();
  const my = getMyBirth();
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(pageHeader("운세 · 타로", "사주로도, 카드로도 — 기본 운세는 전부 무료",
    "같은 주제를 사주·타로·자미두수·토정비결로 골라 볼 수 있어요. 더 깊은 풀이는 각 운세 아래 👑 프리미엄에서!"));
  root.append(personSwitch(navigate, { title: "누구의 운세를 볼까?" }));

  // 이번 달 운세 캘린더 — 맨 위, 접어 두고 오늘 점수만 보여 줌 (누르면 펼침)
  if (my) {
    let todaySc = "";
    try { const d = new Date(); const sc = monthScores(computeSaju(my), d.getFullYear(), d.getMonth() + 1).find((x) => x.day === d.getDate()); if (sc) todaySc = sc.score + "점"; } catch {}
    const body = el("div", { class: "fc-body" });
    const box = el("details", { class: "fh-calbox" }, [
      el("summary", {}, [
        el("span", { class: "fc-ic", "aria-hidden": "true", text: "📅" }),
        el("div", { class: "fc-txt" }, [el("b", { text: "이번 달 나의 운세" }), el("p", { class: "tiny muted", text: "모든 날짜 무료 · 날짜를 누르면 그날 운세" })]),
        todaySc ? el("span", { class: "fc-score" }, [el("small", { text: "오늘" }), el("b", { text: todaySc.replace("점", "") }), el("small", { text: "점" })]) : null,
        el("span", { class: "fc-open", "aria-hidden": "true" }),
      ].filter(Boolean)),
      body,
    ]);
    box.addEventListener("toggle", () => {
      if (box.open && !body.childNodes.length) body.append(renderCalendar({ navigate, embedded: true }));
    });
    root.append(el("section", { class: "wrap", style: "margin-top: var(--sp-3);" }, [box]));
  }

  if (!my) {
    root.append(el("section", { class: "wrap section-gap", style: "margin-top: var(--sp-4);" }, [
      noticeBox("info", "맞춤 운세를 보려면 먼저 내 생년월일이 필요해요. 한 번 입력하면 자동으로 저장됩니다."),
      el("button", { class: "btn btn-primary", onclick: () => navigate("/saju") }, [el("span", { text: "내 정보 입력하고 시작" })]),
    ]));
    return root;
  }

  let method = window.__fortuneMethod || "saju"; // 운세·타로 통합 — 방법을 골라 같은 주제를 봄
  const tabsHost = el("section", { class: "wrap", style: "margin-top: var(--sp-2);" });
  const gridHost = el("section", { class: "wrap", style: "margin-top: var(--sp-4);" });
  root.append(tabsHost, gridHost);

  // 점술 선반 — 사주·타로는 아래 주제 운세의 '방법'을 바꾸고, 나머지는 각 점술 화면으로
  const ARTS = [
    { id: "saju", em: "☯️", name: "사주", sub: "주제별 운세" },
    { id: "tarot", em: "🃏", name: "타로", sub: "주제별 카드" },
    { id: "ziwei", em: "🌌", name: "자미두수", sub: "12궁 명반" },
    { id: "star", em: "⭐", name: "별자리", sub: "금성·화성 운세" },
    { id: "palm", em: "✋", name: "손금", sub: "내 손 보며" },
    { id: "tojeong", em: "📖", name: "토정비결", sub: "올해의 괘", to: "/tojeong" },
    { id: "iching", em: "🪙", name: "주역", sub: "동전 64괘", to: "/iching" },
    { id: "yukim", em: "🖐️", name: "소육임", sub: "지금 이 순간", to: "/so-yukim" },
    { id: "astro", em: "🎲", name: "점성술", sub: "다이스 3개", to: "/astro-dice" },
    { id: "dream", em: "💭", name: "꿈해몽", sub: "어젯밤 그 꿈", to: "/dream" },
  ];
  function goArt(a) {
    if (!a.to) { method = a.id; window.__fortuneMethod = a.id; paintTabs(); paintGrid(); return; }
    if (a.id === "ziwei" && my) { stash("ziwei:input", my); return navigate("/ziwei/result"); }
    navigate(a.to);
  }
  function paintTabs() {
    const prevX = tabsHost.querySelector(".art-grid")?.scrollLeft;
    clear(tabsHost);
    tabsHost.append(el("p", { class: "fg-group fg-art-h", text: "어떤 점술로 볼까?" }));
    const artRow = el("div", { class: "art-grid", role: "list" }, ARTS.map((a) => el("button", { type: "button", class: "art-btn" + (a.id === method ? " on" : "") + (a.to ? " go" : ""), "aria-pressed": a.to ? null : String(a.id === method), onclick: () => goArt(a) }, [
      el("span", { class: "art-ic", text: a.em }), el("b", { text: a.name }), el("small", { text: a.sub }),
    ])));
    const artWrap = el("div", { class: "art-slide" }, [artRow]);
    tabsHost.append(artWrap);
    const edge = () => { const m = artRow.scrollWidth - artRow.clientWidth; artWrap.classList.toggle("at-start", artRow.scrollLeft < 4); artWrap.classList.toggle("at-end", artRow.scrollLeft > m - 4); };
    artRow.addEventListener("scroll", edge, { passive: true });
    requestAnimationFrame(() => {
      if (prevX != null) artRow.scrollLeft = prevX;
      else { const on = artRow.querySelector(".art-btn.on"); if (on && on.offsetLeft + on.offsetWidth > artRow.clientWidth) artRow.scrollLeft = on.offsetLeft - 16; }
      edge();
    });
    const MNAME = { saju: "☯️ 사주", tarot: "🃏 타로", ziwei: "🌌 자미두수", star: "⭐ 별자리", palm: "✋ 손금" };
    tabsHost.append(el("p", { class: "fg-group", text: ["saju", "tarot"].includes(method) ? `${MNAME[method]}로 보는 주제별 운세 · 무료` : `${MNAME[method]} 무료 운세` }));
    tabsHost.append(el("p", { class: "muted tiny", style: "margin-top:-4px;", text: METHOD_DESC[method] || { ziwei: "태어난 날의 별자리 명반(12궁)으로 성격·연애·돈·일을 봐요.", star: "태어난 날의 태양·금성·화성 자리로 매력과 이달 흐름을 봐요.", palm: "내 손바닥을 보면서 비슷한 모양을 고르면 돼요." }[method] }));
    if (method === "tarot") tabsHost.append(el("div", { class: "fh-links" }, [
      el("button", { type: "button", class: "fh-link", onclick: () => navigate("/tarot") }, [el("span", { class: "fh-link-ic", text: "🃏" }), el("span", {}, [el("b", { text: "타로에게 직접 묻기" }), el("small", { text: "질문 · 스프레드 · 78장" })])]),
      el("button", { type: "button", class: "fh-link", onclick: () => navigate("/oracle") }, [el("span", { class: "fh-link-ic", text: "🐾" }), el("span", {}, [el("b", { text: "예·아니오 오라클" }), el("small", { text: "쓸데없는 고민 한 장" })])]),
    ]));
  }
  function tileFor(id) {
    const L = LINK_TILES[id];
    if (L) {
      const to = typeof L.to === "function" ? L.to(method) : L.to;
      return el("button", { class: "topic-tile", style: `--tint:${tint(id)}; --accent:${L.accent};`, onclick: () => navigate(to) }, [
        el("span", { class: "topic-ic", text: EMO[id] || "✨" }),
        el("span", { class: "topic-name serif", text: typeof L.name === "function" ? L.name(method) : L.name }),
        el("span", { class: "topic-blurb muted", text: L.blurb }),
        el("span", { class: "topic-cost" }, L.cost ? [coinMark("sm"), el("span", { text: String(L.cost) })] : [el("span", { text: "무료" })]),
      ]);
    }
    const t = topicMeta(id);
    if (!t) return null;
    return el("button", {
      class: "topic-tile", style: `--tint:${tint(id)}; --accent:${ACCENT[id] || "#ecabb0"};`,
      onclick: () => navigate(`/fortune/${method}/${id}`),
    }, [
      el("span", { class: "topic-ic", text: EMO[id] || "✨" }),
      el("span", { class: "topic-name serif", text: t.name }),
      el("span", { class: "topic-blurb muted", text: t.blurb }),
      el("span", { class: "topic-cost free", text: "무료" }),
    ]);
  }
  let grp = window.__fortuneGroup || GROUPS[0].label;
  function paintGrid() {
    clear(gridHost);
    // 자미두수 · 별자리 · 손금 — 그 점술의 무료 운세 목록
    if (["ziwei", "star", "palm"].includes(method)) {
      gridHost.append(freeList(method, navigate));
      if (method === "ziwei") gridHost.append(el("button", { type: "button", class: "btn btn-ghost btn-block", style: "margin-top: var(--sp-3);", onclick: () => { stash("ziwei:input", my); navigate("/ziwei/result"); } }, [el("span", { text: "🌌 내 자미두수 명반 전체 보기 ›" })]));
      gridHost.append(el("p", { class: "tiny muted", style: "text-align:center; margin-top: var(--sp-5);", text: "모두 무료예요 · 참고용 콘텐츠" }));
      return;
    }
    const GEM = { "오늘 · 내일 · 이번 주": "☀️", "이달 · 올해": "🌙", "연애 · 인연": "💗", "공부 · 시험": "📚", "취업 · 직장": "💼", "재물 · 돈": "💰", "건강 · 행운의 달": "🍀", "개운 · 재미": "🔮", "전체": "✨" };
    gridHost.append(el("div", { class: "fg-chips", role: "tablist" }, [...GROUPS.map((g) => g.label), "전체"].map((lb) =>
      el("button", { type: "button", role: "tab", "aria-selected": String(grp === lb), class: "fg-chip" + (grp === lb ? " on" : ""), onclick: () => { grp = lb; window.__fortuneGroup = lb; paintGrid(); } }, [
        GEM[lb] ? el("span", { class: "fg-chip-em", text: GEM[lb] }) : null, el("span", { text: { "오늘 · 내일 · 이번 주": "오늘·이번 주" }[lb] || lb }),
      ]))));
    requestAnimationFrame(() => { const bar = gridHost.querySelector(".fg-chips"), on = bar && bar.querySelector(".fg-chip.on");
      if (on) bar.scrollLeft = on.offsetLeft - bar.clientWidth / 2 + on.clientWidth / 2; });
    GROUPS.filter((g) => grp === "전체" || g.label === grp).forEach((g) => {
      if (grp === "전체") gridHost.append(el("p", { class: "fg-group", text: g.label }));
      gridHost.append(el("div", { class: "topic-grid compact" }, g.ids.map(tileFor).filter(Boolean)));
    });
    // 그 밖의 무료 운세 (예전 '장르별 무료 운세'에 있던 것들)
    if (freeCount(method)) gridHost.append(el("p", { class: "fg-group", text: `${method === "tarot" ? "🃏 타로" : "☯️ 사주"} 무료 운세 더 보기` }), freeList(method, navigate));
    gridHost.append(el("p", { class: "tiny muted", style: "text-align:center; margin-top: var(--sp-5);", text: "기본 운세는 모두 무료예요 · 더 깊이 보고 싶다면 각 풀이 아래 👑 프리미엄 · 참고용 콘텐츠" }));
  }
  paintTabs(); paintGrid();
  return root;
}

/* ---------------- 카테고리 리딩 (방법별) ---------------- */
export function renderTopicReading({ navigate, method = "saju", id }) {
  loadDisclaimer();
  const meta = topicMeta(id);
  const my = getMyBirth();
  const mName = (METHODS.find((m) => m.id === method) || {}).name || "사주";
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/fortune", "운세")]));
  root.append(personSwitch(navigate, { title: "누구의 운세를 볼까?" }));
  if (!meta || !METHODS.some((m) => m.id === method)) { root.append(noticeBox("warn", "알 수 없는 운세예요.")); return root; }
  if (!my) { navigate("/fortune"); return root; }

  const profile = computeSaju(my);
  let period = "life";
  let itemId = itemIdFor(method, id, my);
  const cost = costOf(id);

  const host = el("section", { class: "wrap", style: "margin-top: var(--sp-2);" });
  root.append(host);

  function paint() {
    clear(host);
    // 헤더 (방법 + 토픽)
    host.append(el("div", { class: "topic-head", style: `--tint:${tint(id)}; --accent:${ACCENT[id] || "#ecabb0"};` }, [
      el("p", { class: "eyebrow", text: `${mName}로 보는` }),
      el("h1", { class: "serif", style: "font-size:1.8rem; margin-top:2px;", text: meta.name }),
    ]));

    // 방법 전환 탭 — 각 방법은 따로 결제(다른 페이지로)
    host.append(el("div", { class: "method-tabs" }, METHODS.map((m) =>
      el("button", { class: "method-tab" + (m.id === method ? " on" : ""), onclick: () => { if (m.id !== method) navigate(`/fortune/${m.id}/${id}`); } },
        [el("span", { text: m.name })]))));

    // 지정일 연애운 — 날짜 고르기
    if (id === "daylove") {
      const di = el("input", { class: "input", type: "date", value: dayLoveDate(), min: ymd(new Date()), "aria-label": "연애운 볼 날짜" });
      di.addEventListener("change", () => { if (!di.value) return; window.__dayLoveDate = di.value; itemId = itemIdFor(method, id, my); paint(); });
      host.append(el("div", { class: "panel", style: "margin-top: var(--sp-3);" }, [
        el("p", { style: "font-weight:700; margin-bottom:6px;", text: "어느 날의 연애운을 볼까?" }),
        el("p", { class: "muted tiny", style: "margin-bottom:8px;", text: "데이트·고백·기념일처럼 궁금한 날짜를 골라요." }),
        di,
      ]));
    }
    // 기본 운세는 모두 무료 — 잠금 없음

    // 오늘의 운세를 열면 캘린더에 그날이 기록됨
    if (id === "today") { const d = new Date(); markDayViewed(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`); }


    let view;
    if (method === "saju" && isPeriodTopic(id)) {
      host.append(el("div", { class: "period-tabs" }, PERIODS.map((pp) =>
        el("button", { type: "button", class: "period-tab" + (pp.id === period ? " on" : ""), onclick: () => { period = pp.id; paint(); } }, [el("span", { text: pp.label })]))));
    }
    if (method === "saju" && isPeriodTopic(id) && period !== "life") {
      view = periodTopicView(readTopicPeriod(profile, id, period), meta);
    } else if (method === "saju") {
      const r = readTopic(profile, id, id === "daylove" ? new Date(dayLoveDate() + "T12:00:00") : new Date());
      view = r.kind === "daily" ? dailyView(r)
        : r.kind === "period" ? periodView(r)
          : r.kind === "lovetime" ? loveTimeView(r)
            : r.kind === "lucky" ? luckyView(r)
              : sajuView(r);
    } else {
      view = methodView(methodReading(profile, id, method, id === "daylove" ? { ...my, targetDate: dayLoveDate() + "T12:00:00" } : my));
    }
    host.append(view);
    // 오늘의 운세(사주)엔 5분야 레이더
    if (method === "saju" && id === "today") {
      host.append(el("div", { class: "panel", style: "margin-top: var(--sp-4);" }, [
        el("p", { class: "eyebrow", style: "justify-content:center; text-align:center;", text: "오늘의 운세 흐름" }),
        el("div", { class: "radar-wrap", html: radarSvg(radarScores(profile)) }),
      ]));
    }
    host.append(noticeBox("info", "참고용 콘텐츠예요. 방법마다 관점이 달라요. 좋은 말만 하지 않되 미래를 확정하지 않아요."));
    // 더 깊이 — 상대 사주 입력형 CTA + 연관 프리미엄
    const cta = DEEP_CTA[id];
    if (cta) host.append(el("button", { type: "button", class: "deep-cta", onclick: () => navigate("/reunion-deep") }, [
      el("span", { class: "deep-cta-ic", text: "🔁" }),
      el("span", { class: "deep-cta-txt" }, [el("b", { text: cta[0] }), el("span", { class: "tiny muted", text: cta[1] })]),
      el("span", { class: "deep-cta-go" }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: String(costOf("reunioncompat")) })]),
    ]));
    const rel = premiumRelated(navigate, RELATED[id] || ["manual", "timeline", "reuniondeep"]);
    if (rel) { rel.classList.remove("wrap"); host.append(rel); }
  }

  function lockCard() {
    const coins = getCoins();
    const box = el("div", { class: "panel premium-lock", style: "margin-top: var(--sp-4);" }, [
      el("span", { class: "lock-badge" }, [coinMark("sm"), el("span", { text: `코인 ${cost}개` })]),
      el("h3", { class: "serif", style: "margin-top:10px;", text: `${mName}로 ${meta.name} 보기` }),
      el("p", { class: "muted", style: "font-size:var(--fs-sm);", text: `${METHOD_DESC[method]} 한 번 열면 다시 볼 땐 무료예요. (다른 방법은 따로 코인이 들어요)` }),
    ]);
    if (coins >= cost) {
      const btn = el("button", { class: "btn btn-primary btn-block", style: "margin-top: var(--sp-4);" },
        [el("span", { text: `코인 ${cost}개로 열기 · 보유 ${coins}개` })]);
      btn.addEventListener("click", () => {
        const res = unlock(itemId, cost);
        if (res.ok) { toast(res.reason === "spent" ? `${mName}로 ${meta.name}을(를) 열었어요` : "이미 열어 둔 운세예요."); paint(); }
        else { noCoinToast(); navigate("/store"); }
      });
      box.append(btn);
    } else {
      box.append(el("p", { class: "muted tiny", style: "margin-top:8px;", text: `보유 코인 ${coins}개 · ${cost}개 필요해요. 출석·충전으로 코인을 받을 수 있어요.` }));
      box.append(el("button", { class: "btn btn-primary btn-block", style: "margin-top: var(--sp-3);", onclick: () => navigate("/store") },
        [el("span", { text: "코인 받으러 가기" })]));
    }
    return box;
  }

  paint();
  return root;
}

/* ---- 뷰 ---- */
function scoreRing(score) {
  const deg = Math.round(score * 3.6);
  return el("div", { class: "score-ring", style: `--deg:${deg}deg;` }, [
    el("div", { class: "score-ring-in" }, [
      el("span", { class: "score-n", text: String(score) }),
      el("span", { class: "score-u", text: "점" }),
    ]),
  ]);
}
function block(label, items, tag) {
  return el("div", { class: `block tag-${tag}` }, [
    el("span", { class: "block-label" }, [el("span", { text: label })]),
    ...items.map((t) => el("p", { text: t })),
  ]);
}
function luckyRow(r) {
  return el("div", { class: "lucky-row" }, [
    el("span", { class: "lucky-chip" }, [el("b", { text: "행운색 " }), el("span", { text: r.luckyColor })]),
    el("span", { class: "lucky-chip" }, [el("b", { text: "행운 기운 " }), el("span", { text: r.luckyElem })]),
  ]);
}

function periodTopicView(r, meta) {
  if (!r) return el("div");
  return el("div", { class: "section-gap", style: "margin-top: var(--sp-4);" }, [
    el("div", { class: "panel", style: "display:flex; gap:16px; align-items:center;" }, [
      scoreRing(r.score),
      el("div", { style: "flex:1;" }, [
        el("p", { class: "eyebrow", text: `${r.label} · ${meta.name}` }),
        el("p", { style: "font-weight:700; margin-top:4px;", text: r.head }),
        el("p", { class: "muted tiny", style: "margin-top:4px;", text: `${r.hanja}(${r.gz}) · ${r.god}(${r.group})의 기운` }),
      ]),
    ]),
    block("이때의 흐름", [r.line].concat(r.sub ? [r.sub] : []), r.score >= 55 ? "good" : "warn"),
    el("div", { class: "insight", text: r.tip }),
  ]);
}

function sajuView(r) {
  return el("div", { class: "section-gap", style: "margin-top: var(--sp-4);" }, [
    el("div", { class: "panel", style: "display:flex; gap:16px; align-items:center;" }, [
      scoreRing(r.score),
      el("div", { style: "flex:1;" }, [
        el("p", { class: "eyebrow", text: ["강", "중", "약"].includes(r.level) ? `${r.name} · 기운 ${r.level}` : `${r.name} · ${r.level}` }),
        el("p", { style: "font-weight:600; margin-top:4px;", text: r.summary }),
      ]),
    ]),
    block("잘 풀리는 지점", r.pros, "good"),
    block("조심할 지점", r.cons, "warn"),
    el("div", { class: "insight", text: r.advice }),
    luckyRow(r),
  ]);
}

function dailyView(r) {
  return el("div", { class: "section-gap", style: "margin-top: var(--sp-4);" }, [
    el("div", { class: "panel", style: "text-align:center;" }, [
      el("p", { class: "muted tiny", text: `${r.label} · ${r.date} · 일진 ${/[가-힣]/.test(r.iljinH || "") ? r.iljinH : `${r.iljin}(${r.iljinH})`}` }),
      el("p", { class: "serif", style: "font-size:1.15rem; margin-top:8px;", text: r.theme }),
    ]),
    el("div", { class: "daily-grid" }, [
      dailyCell("연애", r.love, "#ffbfd2"), dailyCell("일", r.work, "#cdd8ff"), dailyCell("돈", r.money, "#ffdca6"),
    ]),
    el("div", { class: "insight", text: r.advice }),
    luckyRow(r),
  ]);
}
function dailyCell(label, text, accent) {
  return el("div", { class: "panel daily-cell", style: `--accent:${accent};` }, [
    el("span", { class: "daily-label", text: label }),
    el("p", { class: "muted", style: "font-size:var(--fs-sm);", text }),
  ]);
}

function periodView(r) {
  return el("div", { class: "section-gap", style: "margin-top: var(--sp-4);" }, [
    el("div", { class: "panel", style: "display:flex; gap:16px; align-items:center;" }, [
      scoreRing(Math.max(20, Math.min(92, r.score))),
      el("div", { style: "flex:1;" }, [
        el("p", { class: "eyebrow", text: `${r.label} · ${r.group} 기운` }),
        el("p", { style: "font-weight:600; margin-top:4px;", text: r.theme }),
      ]),
    ]),
    el("div", { class: "daily-grid" }, [
      dailyCell("연애", r.love, "#ffbfd2"), dailyCell("일", r.work, "#cdd8ff"), dailyCell("돈", r.money, "#ffdca6"),
    ]),
    r.goodMonths ? el("div", { class: "panel", style: "text-align:center;" }, [
      el("p", { class: "muted tiny", text: "흐름이 좋은 달" }),
      el("p", { class: "serif", style: "font-size:1.2rem; margin-top:4px;", text: r.goodMonths.map((m) => m + "월").join(" · ") }),
    ]) : null,
    el("div", { class: "insight", text: r.advice }),
    luckyRow(r),
  ].filter(Boolean));
}

function loveTimeView(r) {
  return el("div", { class: "section-gap", style: "margin-top: var(--sp-4);" }, [
    el("div", { class: "panel", style: "display:flex; gap:16px; align-items:center;" }, [
      scoreRing(Math.max(20, Math.min(95, r.score))),
      el("div", { style: "flex:1;" }, [
        el("p", { class: "eyebrow", text: `${r.label} 연애운` }),
        el("p", { style: "font-weight:600; margin-top:4px;", text: r.headline }),
      ]),
    ]),
    el("div", { class: "insight", text: r.tip }),
    luckyRow(r),
  ]);
}

function luckyView(r) {
  return el("div", { class: "section-gap", style: "margin-top: var(--sp-4);" }, [
    el("div", { class: "panel", style: "text-align:center;" }, [
      el("p", { class: "eyebrow", style: "justify-content:center;", text: r.label }),
      el("p", { class: "serif", style: "font-size:1.6rem; margin-top:8px; color:var(--c-gold-soft);", text: r.bestMonths.map((m) => m + "월").join(" · ") }),
      el("p", { class: "muted tiny", style: "margin-top:4px;", text: "가장 기운이 좋은 달" }),
    ]),
    el("div", { class: "panel" }, [
      el("p", { style: "font-weight:700; margin-bottom:8px;", text: "달별 흐름" }),
      el("div", { class: "month-rows" }, r.detail.map((d) => el("div", { class: "month-row" }, [
        el("span", { text: d.month + "월" }),
        el("span", { class: "month-lv lv-" + d.level, text: d.level }),
      ]))),
    ]),
    el("div", { class: "insight", text: r.advice }),
    luckyRow(r),
  ]);
}

function methodView(r) {
  if (!r) return el("div");
  const head = el("div", { class: "panel", style: "display:flex; gap:14px; align-items:center;" }, [
    r.mediaStyle ? el("span", { class: "method-card", style: r.mediaStyle }) : null,
    el("div", { style: "flex:1;" }, [
      el("p", { class: "eyebrow", text: r.methodName }),
      el("p", { class: "serif", style: "font-size:1.2rem; margin-top:4px;", text: r.title }),
    ]),
  ].filter(Boolean));
  const lead = el("div", { class: "panel", style: "font-style:italic;" }, [el("p", { class: "muted", text: r.lead })]);
  const points = r.points.map((p) => el("div", { class: "panel" }, [
    el("p", { class: "eyebrow", style: "margin-bottom:6px;", text: p.label }),
    el("p", { text: p.text }),
  ]));
  const extra = [];
  if (r.goodMonths) extra.push(el("div", { class: "panel", style: "text-align:center;" }, [
    el("p", { class: "muted tiny", text: "흐름이 좋은 달" }),
    el("p", { class: "serif", style: "font-size:1.2rem; margin-top:4px;", text: r.goodMonths.map((m) => m + "월").join(" · ") }),
  ]));
  return el("div", { class: "section-gap", style: "margin-top: var(--sp-4);" }, [head, lead, ...points, ...extra, el("div", { class: "insight", text: r.advice })]);
}

/* 코인 마크 — 이모지 대신 CSS 골드 디스크 */
function coinMark(size) {
  return el("span", { class: "coin-mark" + (size === "sm" ? " sm" : ""), "aria-hidden": "true" });
}

/* ===================================================================
   (합침) calendar.js — 파일 수를 줄이려고 이 파일 안으로 옮김 (HAE)
   =================================================================== */
import { taegilMonth, TAEGIL_PURPOSES } from "../saju/extras.js";
import { todayFortune } from "../saju/fortune.js";
import { getViewedDays, dayPreviewCost, buyDayPreview } from "../wallet.js";

import { openDayFortune } from "./sajuResult.js";

import { dayCalendar } from "../saju/manseryeok.js";

const WD = ["일", "월", "화", "수", "목", "금", "토"];
const scoreColor = (s) => s >= 78 ? "#9fd3b7" : s >= 60 ? "#e0b878" : s >= 45 ? "#d7c4c8" : "#e2919a";

export function renderCalendar({ navigate, embedded = false }) {
  loadDisclaimer();
  const my = getMyBirth();
  const root = el("div", {});
  if (!embedded) root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  if (!embedded) root.append(pageHeader("운세 캘린더", "날짜별 운세 한눈에", "이 달의 날짜별 운세 점수를 한눈에 · 모든 날짜 무료"));
  if (!embedded) root.append(personSwitch(navigate, { title: "누구의 운세 캘린더를 볼까?" }));
  if (!my) {
    if (embedded) return root;
    root.append(el("section", { class: "wrap section-gap" }, [
      noticeBox("info", "생년월일이 필요해요."),
      el("button", { class: "btn btn-primary", onclick: () => navigate("/saju") }, [el("span", { text: "내 정보 입력하고 시작" })]),
    ]));
    return root;
  }
  const profile = computeSaju(my);
  const now = new Date();
  let year = now.getFullYear(), month = now.getMonth() + 1;
  const cost = costOf("calendar");

  const host = el("section", { class: "wrap", style: "margin-top: var(--sp-2);" });
  root.append(host);

  function itemId() { return `calendar:${my.birthDate}:${year}-${month}`; }
  let mode = "fortune";
  let taegilPurpose = "meet";
  let taegilX = null;

  function paint() {
    clear(host);
    // 모드 탭
    host.append(el("div", { class: "method-tabs", style: "margin-bottom: var(--sp-3);" }, [
      el("button", { class: "method-tab" + (mode === "fortune" ? " on" : ""), onclick: () => { mode = "fortune"; paint(); } }, [el("span", { text: "운세 캘린더" })]),
      el("button", { class: "method-tab" + (mode === "taegil" ? " on" : ""), onclick: () => { mode = "taegil"; paint(); } }, [el("span", { text: "택일 (좋은 날)" })]),
    ]));
    // 월 네비
    host.append(el("div", { class: "cal-nav" }, [
      el("button", { class: "cal-arrow", "aria-label": "이전 달", onclick: () => { month--; if (month < 1) { month = 12; year--; } paint(); } }, [el("span", { text: "‹" })]),
      el("span", { class: "serif", style: "font-size:1.2rem;", text: `${year}년 ${month}월` }),
      el("button", { class: "cal-arrow", "aria-label": "다음 달", onclick: () => { month++; if (month > 12) { month = 1; year++; } paint(); } }, [el("span", { text: "›" })]),
    ]));

    if (mode === "taegil") { paintTaegil(); return; }

    const allUnlocked = true; // 기본 운세는 모두 무료
    const viewed = new Set(getViewedDays());
    const scores = monthScores(profile, year, month);
    const byDay = {}; scores.forEach((s) => { byDay[s.day] = s; });
    const first = new Date(year, month - 1, 1).getDay();
    const dim = new Date(year, month, 0).getDate();
    const isThisMonth = (year === now.getFullYear() && month === now.getMonth() + 1);
    const isOpen = (d) => allUnlocked || viewed.has(`${year}-${month}-${d}`) || (isThisMonth && d === now.getDate()); // 오늘은 무료

    // 한 번에 보기 (열어본 날 비율만큼 할인)
    if (!allUnlocked) {
      const coins = getCoins();
      const openedInMonth = [...viewed].filter((k) => k.startsWith(`${year}-${month}-`)).length;
      const discPct = Math.round((openedInMonth / dim) * 100);
      const payCost = Math.max(1, Math.round(cost * (1 - openedInMonth / dim)));
      host.append(el("button", { class: "btn btn-primary btn-block", style: "margin-bottom:6px;", onclick: () => {
        if (coins >= payCost) { const r = unlock(itemId(), payCost); if (r.ok) { toast(`${month}월 전체를 열었어요`); paint(); } else { noCoinToast(); navigate("/store"); } }
        else { toast(`한 번에 보기는 코인 ${payCost}개가 필요해요.`); navigate("/store"); }
      } }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: `이 달 한 번에 보기 · 코인 ${payCost}개` })]));
      host.append(el("p", { class: "muted tiny", style: "text-align:center; margin-bottom: 6px;",
        text: discPct > 0 ? `이 달에 ${openedInMonth}일 열어봐서 ${discPct}% 할인! (원가 ${cost}코인)` : `날마다 ‘오늘의 운세’를 열면 열어본 만큼 할인돼요 (원가 ${cost}코인)` }));
      const pcv = dayPreviewCost();
      host.append(el("p", { class: "muted tiny", style: "text-align:center; margin-bottom: var(--sp-3);",
        text: pcv.discounted ? `‘?’ 날짜를 눌러 미리보기 · 지금 코인 ${pcv.cost}개 (24시간 할인 중!)` : "‘?’ 날짜를 눌러 그날만 미리보기 · 코인 2개 (한 번 열면 24시간 동안 다른 날은 1코인)" }));
    }

    let selDay = null;
    const grid = el("div", { class: "cal-grid fc-grid" });
    WD.forEach((w, i) => grid.append(el("span", { class: "cal-wd" + (i === 0 ? " sun" : i === 6 ? " sat" : ""), text: w })));
    for (let i = 0; i < first; i++) grid.append(el("span", {}));
    for (let d = 1; d <= dim; d++) {
      const sc = byDay[d];
      const isToday = isThisMonth && d === now.getDate();
      if (isOpen(d)) {
        grid.append(el("button", { class: "cal-day" + (isToday ? " today" : ""), "data-day": String(d), onclick: () => { if (selDay === d) openDetail(d); else { showDay(d, sc); const bx = host.querySelector("#cal-detail"); if (bx) { const want = window.innerHeight - 260, top = bx.getBoundingClientRect().top; if (top > want) window.scrollBy({ top: top - want, behavior: "smooth" }); } } } }, [
          el("span", { class: "fc-dn", text: String(d) }),
          el("span", { class: "cal-score", style: `color:${scoreColor(sc.score)};`, text: String(sc.score) }),
        ]));
      } else {
        grid.append(el("button", { class: "cal-day cal-locked" + (isToday ? " today" : ""), onclick: () => previewDay(d) }, [
          el("span", { class: "fc-dn", text: String(d) }),
          el("span", { class: "cal-score", style: "color:var(--c-text-faint);", text: "?" }),
        ]));
      }
    }
    host.append(grid);
    const detail = el("div", { id: "cal-detail", style: "margin-top: var(--sp-4);" });
    host.append(detail);
    host.append(el("p", { class: "fd-note", text: "ⓘ 점수는 그날의 일진과 내 사주의 관계로 낸 참고 지표예요. 낮다고 나쁜 날이 아니라 페이스 조절이 필요한 날이에요." }));
    const openDays = [];
    for (let d = 1; d <= dim; d++) if (isOpen(d)) openDays.push(d);
    const showFirst = (isThisMonth && isOpen(now.getDate())) ? now.getDate() : openDays[0];
    if (showFirst) showDay(showFirst, byDay[showFirst]);
    else detail.append(el("p", { class: "muted center tiny", text: "아직 이 달에 연 날이 없어요. ‘오늘의 운세’를 열거나 한 번에 보기로 확인하세요." }));

    function showDay(d, sc) {
      const box = host.querySelector("#cal-detail"); if (!box) return;
      selDay = d;
      host.querySelectorAll(".cal-day.is-sel").forEach((b) => b.classList.remove("is-sel"));
      const cur = host.querySelector(`.cal-day[data-day="${d}"]`); if (cur) cur.classList.add("is-sel");
      const f = todayFortune(profile, new Date(year, month - 1, d));
      clear(box);
      const wd = WD[new Date(year, month - 1, d).getDay()];
      const tone = sc.score >= 78 ? "아주 좋은 날" : sc.score >= 60 ? "무난하게 좋은 날" : sc.score >= 45 ? "페이스 조절하는 날" : "쉬어 가는 날";
      box.append(el("article", { class: "fd-card" }, [
        el("header", { class: "fd-head" }, [
          el("div", { class: "fd-score", style: `--sc:${scoreColor(sc.score)};` }, [el("b", { text: String(sc.score) }), el("small", { text: "점" })]),
          el("div", { class: "fd-when" }, [
            el("p", { class: "fd-date", text: `${month}월 ${d}일 ${wd}요일` }),
            el("p", { class: "fd-sub" }, [el("span", { class: "fd-tag", text: tone }), el("span", { text: `일진 ${sc.iljin} · ${sc.god}` })]),
          ]),
        ]),
        el("p", { class: "fd-theme", text: f.theme }),
        el("ul", { class: "fd-list" }, [mini("💗", "연애", f.love), mini("💼", "일", f.work), mini("💰", "돈", f.money)]),
        el("p", { class: "fd-advice", text: f.advice }),
        el("button", { type: "button", class: "btn btn-primary btn-block fd-go", onclick: () => openDetail(d) }, [el("span", { text: "이날 운세 자세히 보기" })]),
        el("p", { class: "fd-hint", text: "달력에서 같은 날짜를 한 번 더 눌러도 자세히 볼 수 있어요" }),
      ]));
    }
    // 하루 상세 팝업 (캘린더에서 이미 연 날이라 추가 코인 없이)
    let calC = null;
    function openDetail(d) {
      try {
        calC = calC || dayCalendar(profile, year, month);
        const dd = calC.days.find((x) => x.day === d);
        if (dd) openDayFortune(profile, year, month, dd, { free: true });
      } catch (e) { /* ignore */ }
    }
    function mini(ic, l, t) { return el("li", { class: "fd-row" }, [el("span", { class: "fd-ic", "aria-hidden": "true", text: ic }), el("b", { text: l }), el("span", { class: "fd-txt", text: t })]); }

    // 지정일 미리보기 — 2코인 (구매 후 24h 내 다른 날은 1코인). 네이티브 confirm 대신 인라인 프롬프트.
    function previewDay(d) {
      const dateStr = `${year}-${month}-${d}`;
      const pc = dayPreviewCost();
      const coins = getCoins();
      const box = host.querySelector("#cal-detail"); if (!box) return;
      clear(box);
      const card = el("div", { class: "panel section-gap" }, [
        el("p", { style: "font-weight:700;", text: `${month}월 ${d}일 미리보기` }),
        el("p", { class: "muted tiny", text: pc.discounted
          ? `24시간 할인 적용 중! 코인 ${pc.cost}개로 열 수 있어요. (보유 ${coins}개)`
          : `코인 ${pc.cost}개로 이 날을 열어요. 지금 열면 24시간 동안 다른 날은 1코인! (보유 ${coins}개)` }),
      ]);
      if (coins >= pc.cost) {
        card.append(el("button", { class: "btn btn-primary btn-block", onclick: () => {
          const r = buyDayPreview(dateStr);
          if (r.ok) { toast(`${month}월 ${d}일을 열었어요${r.discounted ? " · 할인 적용" : " · 24시간 동안 다른 날 1코인"}`); paint(); }
          else { noCoinToast(); navigate("/store"); }
        } }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: `코인 ${pc.cost}개로 열기` })]));
      } else {
        card.append(el("button", { class: "btn btn-primary btn-block", onclick: () => navigate("/store") }, [el("span", { text: "코인 받으러 가기" })]));
      }
      box.append(card);
      box.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function taegilItemId() { return `taegil:${my.birthDate}:${year}-${month}:${taegilPurpose}`; }
  function paintTaegil() {
    // 목적 선택 칩
    host.append(el("p", { class: "muted tiny", style: "text-align:center; margin-bottom:8px;", text: "무슨 날을 잡을까요?" }));
    const purpRow = el("div", { class: "chip-slide" }, TAEGIL_PURPOSES.map((p) =>
      el("button", { class: "chip" + (p.id === taegilPurpose ? " is-selected" : ""), type: "button", onclick: () => { taegilPurpose = p.id; paint(); } }, [el("span", { text: p.name })])));
    purpRow.addEventListener("scroll", () => { taegilX = purpRow.scrollLeft; }, { passive: true });
    host.append(purpRow);
    requestAnimationFrame(() => {
      if (taegilX != null) purpRow.scrollLeft = taegilX;
      const on = purpRow.querySelector(".is-selected");
      if (on && (on.offsetLeft + on.offsetWidth > purpRow.scrollLeft + purpRow.clientWidth || on.offsetLeft < purpRow.scrollLeft)) purpRow.scrollLeft = on.offsetLeft - 16;
    });

    const cost = costOf("taegil");
    const box = el("div", { style: "margin-top: var(--sp-4);" });
    host.append(box);
    if (false) { // 택일도 기본 기능 — 무료
      const coins = getCoins();
      const lock = el("div", { class: "panel premium-lock" }, [
        el("span", { class: "lock-badge" }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: `코인 ${cost}개` })]),
        el("h3", { class: "serif", style: "margin-top:10px;", text: `${year}년 ${month}월 · ${TAEGIL_PURPOSES.find((p) => p.id === taegilPurpose).name} 좋은 날` }),
        el("p", { class: "muted", style: "font-size:var(--fs-sm);", text: "이 달의 좋은 날·조심할 날을 골라 드려요. 한 번 열면 다시 볼 땐 무료예요." }),
      ]);
      if (coins >= cost) {
        lock.append(el("button", { class: "btn btn-primary btn-block", style: "margin-top: var(--sp-4);", onclick: () => { const r = unlock(taegilItemId(), cost); if (r.ok) { toast("택일을 열었어요"); paint(); } else { noCoinToast(); navigate("/store"); } } }, [el("span", { text: `코인 ${cost}개로 좋은 날 보기 · 보유 ${coins}개` })]));
      } else {
        lock.append(el("button", { class: "btn btn-primary btn-block", style: "margin-top: var(--sp-4);", onclick: () => navigate("/store") }, [el("span", { text: "코인 받으러 가기" })]));
      }
      box.append(lock);
      return;
    }
    const r = taegilMonth(profile, year, month, taegilPurpose);
    const why = el("div", { class: "tg-why", "aria-live": "polite" });
    let tgSel = null;
    const showWhy = (o, good) => {
      tgSel = o.day;
      box.querySelectorAll(".taegil-day.is-sel").forEach((x) => x.classList.remove("is-sel"));
      const cur = box.querySelector(`.taegil-day[data-day="${o.day}"]`); if (cur) cur.classList.add("is-sel");
      const wd = WD[new Date(year, month - 1, o.day).getDay()];
      const verdict = good
        ? (o.score >= 80 ? `'${r.purpose.name}'에 이 달 손꼽히는 날이에요.` : `'${r.purpose.name}'에 무난하게 좋은 날이에요.`)
        : `'${r.purpose.name}'은(는) 이날보다 다른 날이 나아요. 꼭 해야 한다면 아래 점을 조심하세요.`;
      clear(why);
      why.className = "tg-why on " + (good ? "good" : "bad");
      why.append(...[
        el("div", { class: "tg-why-head" }, [
          el("b", { class: "tg-why-sc", text: `${o.score}점` }),
          el("div", {}, [el("p", { class: "tg-why-date", text: `${month}월 ${o.day}일 ${wd}요일` }), el("p", { class: "tg-why-iljin", text: `일진 ${o.iljin}일` })]),
        ]),
        el("p", { class: "tg-why-verdict", text: verdict }),
        el("p", { class: "tg-why-label", text: good ? "왜 좋은 날일까?" : "왜 점수가 낮을까?" }),
        el("ul", { class: "tg-why-list" }, (o.why || []).map((w) => el("li", { class: w.g > 0 ? "plus" : w.g < 0 ? "minus" : "zero" }, [el("span", { class: "tg-why-ic", "aria-hidden": "true", text: w.g > 0 ? "＋" : w.g < 0 ? "－" : "·" }), el("span", { text: w.t })]))),
        good ? null : el("p", { class: "tg-why-tip", text: "💡 일정을 옮길 수 없다면: 시간 여유를 넉넉히, 중요한 말·결정은 한 번 더 확인하고, 무리한 약속은 줄이세요." }),
        el("button", { type: "button", class: "btn btn-ghost btn-block tg-why-go", onclick: () => { try { const cc = dayCalendar(profile, year, month); const dd = cc.days.find((x) => x.day === o.day); if (dd) openDayFortune(profile, year, month, dd, { free: true }); } catch (e) { /* ignore */ } } }, [el("span", { text: "이날 운세 전체 보기" })]),
      ].filter(Boolean));
      const top = why.getBoundingClientRect().top, want = window.innerHeight - 280;
      if (top > want) window.scrollBy({ top: top - want, behavior: "smooth" });
    };
    const dayChip = (o, good) => el("button", { type: "button", class: "taegil-day " + (good ? "good" : "bad"), "data-day": String(o.day), "aria-label": `${o.day}일 ${o.score}점 이유 보기`, onclick: () => { if (tgSel === o.day) { tgSel = null; clear(why); why.className = "tg-why"; box.querySelectorAll(".taegil-day.is-sel").forEach((x) => x.classList.remove("is-sel")); } else showWhy(o, good); } }, [el("b", { text: o.day + "일" }), el("span", { class: "tiny", text: o.score + "점" })]);
    box.append(el("div", { class: "section-gap tg-wrap" }, [
      el("div", { class: "panel tg-panel" }, [
        el("p", { class: "tg-h good", text: `${r.purpose.name} · 좋은 날` }),
        el("div", { class: "taegil-days" }, r.best.map((o) => dayChip(o, true))),
      ]),
      el("div", { class: "panel tg-panel" }, [
        el("p", { class: "tg-h bad", text: "피하면 좋은 날" }),
        el("div", { class: "taegil-days" }, r.caution.map((o) => dayChip(o, false))),
      ]),
      el("p", { class: "tg-tap", text: "날짜를 누르면 왜 좋은지 · 왜 아쉬운지 알려 드려요" }),
      why,
      el("div", { class: "insight", text: r.tip }),
      noticeBox("info", "내 사주와 그날 일진의 관계로 낸 참고 지표예요. 실제 일정은 상황·상대와 함께 정하세요."),
    ]));
  }

  paint();
  return root;
}
