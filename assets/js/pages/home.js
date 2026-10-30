import { el, icon, toast } from "../utils/dom.js";
import { getMyBirth, getOwnBirth, getAdminView, getPeople, hasWrittenReview, stash, getViewAs, setViewAs } from "../state.js";
import { personSwitch, buildAddForm, relEmoji } from "./people.js";
import { openModal } from "./shared.js";
import { getCoins, checkInStatus, claimCheckIn, STREAK_BONUS, isAdmin, canSeeLifespan, grantOnce, getWallet } from "../wallet.js";
import { lunarToSolar } from "../saju/astro.js";
import { todayLine, loveSoon } from "./special.js";
import { computeSaju } from "../saju/manse.js";
import { biorhythm, bioSvg, monthScores } from "../saju/extras.js";
import { MENU, findItem, iconBtn, shelfCard } from "./menu.js";
import { premiumSection } from "./premium.js";
import { sijinLabel } from "./manseView.js";
import { reviewShowcase } from "./about.js";
import { noticeBanner } from "./store.js";
import { getNotice } from "../cloud.js";
export function renderHome({ navigate }) {
  const my = getMyBirth();
  const root = el("div", { class: "home2" });
  const sec = (kids, gap = "var(--sp-4)") => el("section", { class: "wrap", style: `margin-top:${gap};` }, Array.isArray(kids) ? kids : [kids]);

  // 0) 관리자 공지 — 있으면 맨 위에 (닫으면 그 공지는 다시 안 뜸)
  root.append(homeNotice());
  // 0-0) 특별한 날 — 내 생일 축하 배너 · 오늘 생일인 내 사람
  { const sd = specialDayBanner(navigate); if (sd) root.append(sd); }
  setTimeout(() => { try { birthdayCheck(); } catch { /* ignore */ } }, 900); // 생일이면 축하 팝업 (하루 한 번)
  setTimeout(() => { try { reviewAsk(navigate); } catch { /* ignore */ } }, 2600); // 좀 써 본 사람에게 후기 부탁
  // 1) 인사 + 물어보기 (간결하게)
  root.append(sec(haemyoHero(navigate, my), "var(--sp-3)"));
  // 2) 누구 기준으로 볼지 (한 줄)
  root.append(sec(my ? personBar(navigate, my) : startCard(navigate)));
  // 2-1) 오늘의 한 줄 · 출석 · 인연 D-day · 이달의 리포트 — '오늘의 해묘' 위
  root.append(sec(homeDaily(navigate, my)));
  // 3) 오늘의 해묘 — 가로로 넘기는 작은 카드
  root.append(sec([sectionTitle("오늘의 해묘", todayLabel(), "🌙", "#ffc3d1"), todayStrip(navigate, my), bioCard(navigate, my)].filter(Boolean), "var(--sp-5)"));
  // 4) 바로가기 아이콘 8개
  root.append(sec(el("div", { class: "panel qi-panel" }, [
    el("div", { class: "mi-grid qi" }, [
      ...QUICK.map((id) => { const it = findItem(id); const g = MENU.find((x) => x.id === it.group); return iconBtn(it, navigate, g.color); }),
      el("button", { type: "button", class: "mi-btn", onclick: () => navigate("/menu") }, [el("span", { class: "mi-ic all", text: "☰" }), el("span", { class: "mi-name", text: "전체 메뉴" })]),
    ]),
  ])));
  // 4-0) 프리미엄 리스트 — 오늘의 추천 · 신규
  root.append(premiumSection(navigate, { eyebrow: "이 운세를 찾고 계셨나요?", title: "오늘의 추천 운세", pick: "today", limit: 5 }));
  root.append(premiumSection(navigate, { eyebrow: "바로 확인하세요!", title: "신규 프리미엄 운세 ✨", pick: "new", limit: 5 }));
  // 4-1) 오늘의 타로 — 카드가 펼쳐지는 피처 카드
  root.append(sec(todayTarot(navigate), "var(--sp-5)"));
  // 5) 주제별 선반
  SHELVES.forEach((gid) => {
    const g = MENU.find((x) => x.id === gid);
    root.append(sec([
      el("div", { class: "sh-head" }, [
        el("h2", {}, [el("span", { class: "mn-em", style: `--c:${g.color};`, text: g.em }), el("span", { text: g.title })]),
        el("button", { type: "button", class: "sh-more", onclick: () => { window.__menuGroup = g.id; navigate("/menu"); } }, [el("span", { text: "전체 ›" })]),
      ]),
      el("div", { class: "sh-row" }, [...g.items, ...(SHELF_EXTRA[g.id] || []).map(findItem)].slice(0, 8).map((it) => shelfCard(it, navigate, g.color))),
    ], "var(--sp-5)"));
  });
  // 6) 이용자 후기 — 바로 보이게
  root.append(el("section", { class: "wrap", style: "margin-top: var(--sp-6, 32px);" }, [reviewShowcase(navigate)]));
  // 7) 바닥글
  root.append(el("section", { class: "wrap home-foot" }, [
    el("div", { class: "hf-links" }, [
      el("a", { href: "#/study", text: "📚 사주 공부방" }),
      el("a", { href: "#/reviews", text: "💬 후기 쓰고 코인 10개" }),
      el("a", { href: "#/about", text: "이용 안내" }),
      el("a", { href: "#/privacy", text: "개인정보" }),
    ]),
    el("p", { class: "tiny muted", text: "좋은 말만 반복하지 않고, 조심할 점까지 함께 알려 드려요. 모든 풀이는 참고용이며, 로그인 없이 쓰는 정보는 이 브라우저 안에만 저장돼요." }),
  ]));
  return root;
}

const QUICK = ["saju", "special", "tarot", "compat", "fortune", "manse", "dream"];
const SHELVES = ["love", "fun"];
const SHELF_EXTRA = { luck: ["studyluck", "luckycard"], fun: ["mbti"] }; // PC에서 4칸 × 2줄로 딱 맞게 8개씩
function todayLabel() { const d = new Date(); return `${d.getMonth() + 1}월 ${d.getDate()}일 ${"일월화수목금토"[d.getDay()]}요일`; }

function todayTarot(navigate) {
  const cards = el("div", { class: "tt-cards", "aria-hidden": "true" },
    [0, 1, 2].map((i) => el("span", { class: `tt-card tt-${i}`, style: 'background-image:url("assets/img/card-back.webp");' })));
  return el("div", { class: "today-tarot tt-home" }, [
    el("span", { class: "eyebrow", text: "오늘의 타로" }),
    cards,
    el("h2", { class: "serif tt-title", text: "카드가 당신을 기다리고 있어요" }),
    el("p", { class: "muted tt-sub", text: "고양이 카드 한 장으로 오늘의 흐름을 알아봐요" }),
    el("div", { class: "tt-btns" }, [
      el("button", { class: "holo-btn", onclick: () => navigate("/fortune/tarot/today") }, [el("span", { text: "무료로 카드 뽑기" })]),
      el("button", { class: "btn btn-quiet btn-sm", onclick: () => navigate("/tarot") }, [el("span", { text: "타로 테마 보기 ›" })]),
    ]),
  ]);
}

function startCard(navigate) {
  return el("button", { class: "panel start-card", onclick: () => navigate("/saju") }, [
    el("span", { class: "sc-em", text: "🐾" }),
    el("div", {}, [el("b", { text: "생년월일을 알려 주면 시작해요" }), el("p", { class: "tiny muted", text: "한 번 입력하면 모든 메뉴가 내 사주로 맞춰져요" })]),
    el("span", { class: "wide-arrow", text: "→" }),
  ]);
}

function personBar(navigate, my) {
  const va = getViewAs();
  const who = va ? `${va.relation ? relEmoji(va.relation) + " " : ""}${va.name || "이름없음"}` : (my.name || "나");
  const sw = personSwitch(navigate, { title: "" });
  sw.classList.remove("wrap"); sw.classList.add("pb-switch");
  const edit = () => {
    if (!va) return navigate("/saju");
    const m = openModal([], { title: `${va.name || "이름없음"} 님 정보 수정` });
    m.body.append(buildAddForm(() => { m.close(); setViewAs(va.id); }, navigate, va));
  };
  return el("div", { class: "panel person-bar" }, [
    el("div", { class: "pb-top" }, [
      el("div", { class: "pb-who" }, [
        el("b", { text: va ? `${who} 님 기준으로 보는 중` : `${who}님 기준` }),
        el("span", { class: "tiny muted", text: `${my.birthDate}${my.timeUnknown ? " · 시간 모름" : (my.birthTime ? " · " + sijinLabel(my) : "")}` }),
      ]),
      el("button", { class: "btn btn-quiet btn-sm", onclick: edit }, [el("span", { text: "수정" })]),
      el("button", { class: "btn btn-primary btn-sm", onclick: () => { stash("saju:input", my); navigate("/saju/loading"); } }, [el("span", { text: "내 사주 →" })]),
    ]),
    sw,
  ]);
}

function todayStrip(navigate, my) {
  const cards = [];
  const card = (em, title, val, sub, to, cls = "") => el("button", { type: "button", class: "td-card " + cls, "data-noterm": "", onclick: () => navigate(to) }, [
    el("span", { class: "td-em", text: em }), el("span", { class: "td-t", text: title }),
    el("b", { class: "td-v", text: val }), el("span", { class: "td-s", text: sub }),
  ]);
  if (my) {
    try {
      const prof = computeSaju(my); const d = new Date();
      const sc = (monthScores(prof, d.getFullYear(), d.getMonth() + 1).find((x) => x.day === d.getDate()) || {}).score;
      if (sc) cards.push(card("🌙", "오늘의 운세", `${sc}점`, "무료로 자세히 보기", "/fortune", "hot"));
      const b = biorhythm(prof); const bt = Math.round(((b.physical.v + b.emotional.v + b.intellectual.v) / 3 + 100) / 2);
      cards.push(card("📈", "바이오리듬", `${bt}점`, "신체·감성·지성 총점", "/biorhythm"));
    } catch {}
  }
  cards.push(card("☀️", "오늘의 타로", "한 장", "무료", "/fortune/tarot/today"));
  cards.push(card("🔢", "행운 번호", "6개", "하루 한 번 무료", "/luckynumber"));
  const canClaim = !checkInStatus().claimedToday;
  cards.push(card("🪙", canClaim ? "출석 코인" : "보유 코인", canClaim ? "받기" : String(getCoins()), canClaim ? "오늘 아직 안 받았어요" : "충전·출석", "/store", canClaim ? "hot" : ""));
  cards.push(card("📜", "이달의 고전", "명심보감", "한 구절 · 무료", "/classic"));
  return el("div", { class: "td-row" }, cards);
}

/* 홈 — 오늘의 바이오리듬 (신체·감성·지성 한눈에) */
function bioCard(navigate, my) {
  if (!my) return null;
  let b; try { b = biorhythm(computeSaju(my)); } catch { return null; }
  const row = (lb, o, c) => el("div", { class: "hb-row" }, [
    el("span", { class: "hb-lb", text: lb }),
    el("span", { class: "hb-track" }, [el("span", { class: "hb-mid" }), el("span", { class: "hb-fill " + (o.v >= 0 ? "pos" : "neg"), style: `--c:${c}; ${o.v >= 0 ? "left:50%" : `right:50%`}; width:${Math.abs(o.v) / 2}%;` })]),
    el("b", { class: "hb-v", style: `color:${c};`, text: `${o.v > 0 ? "+" : ""}${o.v}` }),
    el("span", { class: "hb-lv", text: o.level }),
  ]);
  return el("button", { type: "button", class: "hb-card", "data-noterm": "", onclick: () => navigate("/biorhythm"), "aria-label": "오늘의 바이오리듬 자세히 보기" }, [
    el("div", { class: "hb-head" }, [el("span", {}, [el("span", { text: "📈 " }), el("b", { text: "오늘의 바이오리듬" }), el("span", { class: "hb-total", text: ` 총점 ${Math.round(((b.physical.v + b.emotional.v + b.intellectual.v) / 3 + 100) / 2)}점` })]), el("span", { class: "hb-more", text: "그래프 보기 ›" })]),
    row("신체", b.physical, "#ffa3b5"), row("감성", b.emotional, "#dcb6ff"), row("지성", b.intellectual, "#ffd39a"),
    el("p", { class: "hb-tip", text: b.tip }),
  ]);
}

/* ---- 조각들 ---- */
function sectionTitle(title, sub, em = "✨", color = "#ffd9c2") {
  return el("div", { class: "sh-head" }, [
    el("h2", {}, [el("span", { class: "mn-em", style: `--c:${color};`, text: em }), el("span", { text: title })]),
    sub ? el("span", { class: "sh-sub", text: sub }) : null,
  ].filter(Boolean));
}


function haemyoHero(navigate, my) {
  const input = el("input", { class: "haemyo-input", type: "text", maxlength: "60",
    placeholder: "예: 그 사람은 나를 어떻게 생각할까?", "aria-label": "해묘에게 물어볼 질문" });
  const ask = () => {
    const q = input.value.trim();
    if (q) stash("oracle:question", q);
    navigate("/oracle");
  };
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") ask(); });

  return el("div", { class: "haemyo-hero" }, [
    el("div", { class: "haemyo-orb", "aria-hidden": "true" }),
    el("div", { class: "haemyo-brand" }, [
      el("span", { class: "haemyo-cat", "aria-hidden": "true" }),
      el("div", {}, [
        el("h1", { class: "serif brand-title", html: '해묘 <span class="brand-en">解猫</span>' }),
        el("p", { class: "muted tiny", text: "인생이 묘할 때, 해묘" }),
      ]),
    ]),
    el("h2", { class: "serif haemyo-ask", text: `${my && my.name ? my.name + ", " : ""}오늘 무슨 일이 묘해?` }),
    el("div", { class: "haemyo-inputrow" }, [
      input,
      el("button", { class: "holo-btn haemyo-go", onclick: ask }, [el("span", { text: "물어보기" })]),
    ]),
  ]);
}

/* 해묘의 오늘 추천 — 방법×토픽 큐레이션 (포스텔러/점신식 리스트를 해묘 톤으로) */
const RECO = [
  { to: "/fortune/tarot/today", mLabel: "무료 타로", name: "오늘 나에게 필요한 한 마디", tag: "luck" },
  { to: "/fortune/saju/yearlove", mLabel: "사주", name: "올해, 내 사랑은 어떻게 흘러갈까?", tag: "love" },
  { to: "/fortune/tarot/todaylove", mLabel: "타로", name: "오늘 그 사람 마음, 카드로 엿보기", tag: "love" },
  { to: "/ziwei", mLabel: "자미두수", name: "내 명반과 8단계 심화 풀이", tag: "wealth" },
  { to: "/fortune/saju/business", mLabel: "사주", name: "나에게 맞는 직업·사업의 길", tag: "work" },
  { to: "/tojeong", mLabel: "토정비결", name: "올해의 괘로 보는 한 해 흐름", tag: "luck" },
];
const TAG_COLOR = { love: "#eda9ca", wealth: "#e0b878", work: "#9fbfe0", luck: "#c9a6e6" };

function recoList(navigate) {
  return el("div", {}, [
    sectionTitle("해묘의 오늘 추천", "이런 게 궁금하지 않아?", "💡", "#ffe0a3"),
    el("div", { class: "reco-list" }, RECO.map((r) =>
      el("button", { class: "reco-row", onclick: () => navigate(r.to) }, [
        el("span", { class: "reco-tag", "data-noterm": "", style: `--c:${TAG_COLOR[r.tag] || "#eda9ca"};`, text: r.mLabel }),
        el("span", { class: "reco-name", text: r.name }),
        el("span", { class: "reco-arrow", text: "›" }),
      ]))),
  ]);
}



/* 홈 공지 — 세션에 잠깐 기억해 두고 바로 그린 뒤, 클라우드에서 최신으로 다시 확인 */
function homeNotice() {
  const box = el("section", { class: "wrap hn-wrap" });
  const seenKey = "str.noticeseen.v1";
  const paint = (n) => {
    box.textContent = "";
    let seen = 0; try { seen = +localStorage.getItem(seenKey) || 0; } catch { /* ignore */ }
    if (!n || !n.on || !n.text || seen === n.updatedAt) { box.hidden = true; return; }
    box.hidden = false;
    box.append(noticeBanner(n, () => { try { localStorage.setItem(seenKey, String(n.updatedAt)); } catch { /* ignore */ } box.hidden = true; }));
  };
  let cached = null; try { cached = JSON.parse(sessionStorage.getItem("str.notice.v1") || "null"); } catch { /* ignore */ }
  paint(cached);
  getNotice().then((n) => { if (n === null) return; try { sessionStorage.setItem("str.notice.v1", JSON.stringify(n)); } catch { /* ignore */ } paint(n); });
  return box;
}


/* 오늘의 한 줄 — 일진 한 줄 + 행운 색 + 출석(7일 연속 보너스) + 인연 D-3 · 이달의 리포트 배지 */
function homeDaily(navigate, my) {
  const box = el("div", { class: "panel hd-card", "data-noterm": "" });
  const d = new Date(), wk = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  let T = null; try { T = todayLine(my); } catch { T = null; }
  const ck = el("div", { class: "hd-ck" });
  const paintCk = () => {
    ck.textContent = "";
    const s = checkInStatus();
    const cyc = s.streak % 7, filled = s.claimedToday ? ((s.streak > 0 && cyc === 0) ? 7 : cyc) : (s.nextStreak - 1) % 7;
    const dots = el("div", { class: "hd-dots", "aria-label": `연속 출석 ${s.claimedToday ? s.streak : Math.max(0, s.nextStreak - 1)}일` }, Array.from({ length: 7 }, (_, i) => el("i", { class: (i < filled ? "on" : "") + (i === 6 ? " gift" : ""), text: i === 6 ? "🎁" : "" })));
    const msg = s.claimedToday
      ? (filled === 7 ? `7일 연속 달성! 보너스 +${STREAK_BONUS} 받았어요 🎉` : `${s.streak}일째 출석 · ${7 - filled}일 더 오면 +${STREAK_BONUS}`)
      : (s.bonus ? `오늘 출석하면 7일 연속! +${s.reward}코인` : `출석하면 +1 · 7일 연속이면 보너스 +${STREAK_BONUS}`);
    const btn = s.claimedToday
      ? el("span", { class: "hd-done", text: "✓ 출석 완료" })
      : el("button", { type: "button", class: "btn btn-primary btn-sm hd-go", onclick: () => {
          const r = claimCheckIn();
          if (r.ok) { toast(`출석 완료 · 코인 +${r.reward}${r.bonus ? ` (7일 연속 보너스 +${r.bonus} 포함 🎁)` : ""}`); const n = document.getElementById("coin-balance"); if (n) n.textContent = String(getCoins()); paintCk(); }
        } }, [el("span", { text: s.bonus ? `출석 +${s.reward}` : "출석 +1" })]);
    ck.append(el("div", { class: "hd-ck-l" }, [dots, el("small", { text: msg })]), btn);
  };
  paintCk();
  const badges = el("div", { class: "hd-badges" });
  let soon = null; try { soon = loveSoon(my); } catch { soon = null; }
  if (soon) badges.append(el("button", { type: "button", class: "hd-badge love", onclick: () => navigate("/love-fun/countdown") }, [
    el("b", { text: soon.days <= 0 ? "D-DAY 💗" : `D-${soon.days} 💗` }), el("span", { text: `${soon.label} · ${soon.ymd.slice(5).replace("-", "/")}` }),
  ]));
  if (my) badges.append(el("button", { type: "button", class: "hd-badge month" + (d.getDate() <= 7 ? " new" : ""), onclick: () => navigate("/monthly") }, [
    el("b", { text: d.getDate() <= 7 ? "NEW 🗓" : "🗓" }), el("span", { text: `${d.getMonth() + 1}월 흐름 리포트 · 무료` }),
  ]));
  box.append(
    el("div", { class: "hd-top" }, [
      el("p", { class: "hd-eb", text: `오늘의 한 줄 · ${d.getMonth() + 1}월 ${d.getDate()}일 (${wk})` }),
      T ? el("span", { class: "hd-gz", text: `${T.day}일${T.god ? ` · ${T.god}` : ""}` }) : null,
    ].filter(Boolean)),
    T ? el("p", { class: "hd-line", text: T.line }) : null,
    T ? el("div", { class: "hd-luck" }, [el("i", { class: "hd-sw", style: `background:${T.lucky.hex}` }), el("span", {}, [el("b", { text: `행운 색 ${T.lucky.name}` }), el("small", { text: T.lucky.item })])]) : null,
    ck,
    badges.childElementCount ? badges : null,
  );
  return box;
}


/* =========================================================
   🎂 특별한 날 — 내 생일엔 홈 맨 위 축하 배너 + 팝업 · 폭죽 · 선물 리본을 풀면 코인 50개
   · 선물은 '나(계정)' 기준 1년에 한 번만 (내 사람 시점으로 바꿔도 다시 안 줌)
   · 내 사람 중 오늘 생일인 사람은 배너에 함께 알려 줌 (선물 없음)
   · 음력 생일은 올해 양력 날짜로 바꿔서 확인 · 관리자 열람 중엔 안 뜸 — HAE
   ========================================================= */
const BDAY_COINS = 50;
const bdayKey = () => `birthday-${new Date().getFullYear()}`;
const bdayClaimed = () => { try { return (getWallet().bonuses || []).includes(bdayKey()); } catch { return false; } };
function birthdayToday(b) {
  if (!b || !b.birthDate) return false;
  const [, m, d] = b.birthDate.split("-").map(Number);
  const now = new Date(), Y = now.getFullYear();
  let M = m, D = d;
  if (b.calendarType === "lunar") {
    let s = null;
    try { s = lunarToSolar(Y, m, !!b.leapMonth, d) || (b.leapMonth ? lunarToSolar(Y, m, false, d) : null) || lunarToSolar(Y, m, false, Math.min(d, 29)); } catch { s = null; }
    if (!s || s.Y !== Y) return false;
    M = s.M; D = s.D;
  } else if (m === 2 && d === 29 && !(Y % 4 === 0 && (Y % 100 !== 0 || Y % 400 === 0))) { M = 2; D = 28; } // 윤년 생일은 평년엔 2/28
  return now.getMonth() + 1 === M && now.getDate() === D;
}
function myBirthdayNow() { if (getAdminView()) return null; const b = getOwnBirth(); return birthdayToday(b) ? b : null; }
function friendsBirthdayNow() { if (getAdminView()) return []; try { return getPeople().filter((p) => p.input && birthdayToday(p.input)); } catch { return []; } }

/* 홈 맨 위 — 특별한 날 배너 */
function specialDayBanner(navigate) {
  const me = myBirthdayNow(), fr = friendsBirthdayNow();
  if (!me && !fr.length) return null;
  const wrap = el("section", { class: "wrap sd-wrap" });
  if (me) {
    const name = me.name || "";
    const claimed = bdayClaimed();
    const btn = el("button", { type: "button", class: "sd-btn" + (claimed ? "" : " hot"), onclick: () => openBirthday(me) }, [el("span", { text: claimed ? "축하 다시 보기 →" : `🎁 생일 선물 열기 · 코인 ${BDAY_COINS}개 →` })]);
    wrap.append(el("div", { class: "sd-hero", role: "img", "aria-label": "생일 축하 배너" }, [
      el("div", { class: "sd-sky", "aria-hidden": "true" }, Array.from({ length: 14 }, (_, i) => el("i", { style: `left:${(i * 37) % 100}%;top:${(i * 23) % 60}%;animation-delay:${(i % 5) * 0.6}s` }))),
      el("div", { class: "sd-flags", "aria-hidden": "true" }, ["#ffb3cf", "#ffd38a", "#9fe0c4", "#c9a6e6", "#ff8fa8", "#a6c8ff", "#fff1a8"].map((c) => el("i", { style: `--c:${c}` }))),
      el("div", { class: "sd-tx" }, [
        el("p", { class: "sd-d", text: (() => { const d = new Date(); return `${d.getMonth() + 1}/${d.getDate()} ${"일월화수목금토"[d.getDay()]} · HAPPY BIRTHDAY`; })() }),
        el("p", { class: "sd-hi", text: name ? `${name}님,` : "오늘의 주인공," }),
        el("h2", { class: "sd-h", html: "당신의 생일을<br>진심으로<br>축하드려요!" }),
        btn,
      ]),
      el("div", { class: "sd-art", "aria-hidden": "true" }, [
        el("span", { class: "sd-cat", style: 'background-image:url("assets/img/haemyo.webp")' }),
        el("span", { class: "sd-hat" }),
        el("span", { class: "sd-cake", text: "🎂" }),
        el("span", { class: "sd-gift", text: "🎁" }),
        el("span", { class: "sd-bal b1", text: "🎈" }), el("span", { class: "sd-bal b2", text: "🎈" }),
      ]),
    ]));
  }
  if (fr.length) {
    wrap.append(el("div", { class: "sd-fr" }, [
      el("span", { class: "sd-fr-em", text: "🎉" }),
      el("p", {}, [el("b", { text: `오늘은 ${fr.slice(0, 3).map((p) => p.name || "이름없음").join(" · ")}${fr.length > 3 ? ` 외 ${fr.length - 3}명` : ""}님 생일이에요` }), el("small", { text: "축하 한마디 건네 보세요 · 그 사람 시점으로 오늘 운세도 볼 수 있어요" })]),
      el("button", { type: "button", class: "chip", onclick: () => setViewAs(fr[0].id) }, [el("span", { text: "운세 보기" })]),
    ]));
  }
  return wrap;
}

/* 하루 한 번 자동으로 축하 팝업 (선물 받기 전이면) */
function birthdayCheck() {
  if (document.querySelector(".bd-ov")) return;
  const me = myBirthdayNow(); if (!me) return;
  if (bdayClaimed()) return;
  const k = `str.bdaypop.v1`, today = new Date().toDateString();
  try { if (sessionStorage.getItem(k) === today) return; sessionStorage.setItem(k, today); } catch { /* ignore */ }
  openBirthday(me);
}

/* 선물 상자 — 리본 끝을 잡아 옆으로 당기면 매듭이 풀리며 열림 (탭해도 자동으로 풀림) */
const GIFT_SVG = `<svg class="gf" viewBox="0 0 220 200" aria-hidden="true">
  <defs>
    <linearGradient id="gfB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd0df"/><stop offset="1" stop-color="#ff9dbb"/></linearGradient>
    <linearGradient id="gfL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe0ea"/><stop offset="1" stop-color="#ffb6cc"/></linearGradient>
  </defs>
  <ellipse cx="110" cy="192" rx="84" ry="7" fill="rgba(0,0,0,.18)"/>
  <g class="gf-body"><rect x="40" y="98" width="140" height="90" rx="10" fill="url(#gfB)"/><rect class="gf-band" x="101" y="98" width="18" height="90" fill="#e8505a"/></g>
  <g class="gf-lid"><rect x="30" y="76" width="160" height="28" rx="8" fill="url(#gfL)"/><rect class="gf-band" x="101" y="76" width="18" height="28" fill="#e8505a"/></g>
  <g class="gf-bow">
    <path class="gf-loop gf-loopL" d="M110 76 C 84 38, 46 48, 58 70 C 66 84, 94 82, 110 76Z" fill="#f05c66"/>
    <path class="gf-loop gf-loopR" d="M110 76 C 136 38, 174 48, 162 70 C 154 84, 126 82, 110 76Z" fill="#f05c66"/>
    <path class="gf-tail gf-tailL" d="M106 80 C 98 96, 90 106, 80 122" stroke="#e8505a" stroke-width="10" stroke-linecap="round" fill="none"/>
    <path class="gf-tail gf-tailR" d="M114 80 C 124 96, 134 108, 148 122" stroke="#e8505a" stroke-width="10" stroke-linecap="round" fill="none"/>
    <circle class="gf-knot" cx="110" cy="77" r="10" fill="#d9404b"/>
    <circle class="gf-grab" cx="148" cy="122" r="15"/>
  </g>
</svg>`;
function openBirthday(b) {
  if (document.querySelector(".bd-ov")) return;
  const name = (b && b.name) || "";
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const already = bdayClaimed();
  const cv = el("canvas", { class: "bd-fx", "aria-hidden": "true" });
  const coinTx = el("p", { class: "bd-got", "aria-live": "polite" });
  const giftEl = el("div", { class: "bd-gift" + (already ? " open" : ""), role: "button", tabindex: "0", "aria-label": already ? "올해 생일 선물은 이미 받았어요" : `리본을 풀어서 선물 열기 · 코인 ${BDAY_COINS}개`, html: GIFT_SVG });
  const coin = el("span", { class: "bd-coin", "aria-hidden": "true", text: "🪙" });
  giftEl.append(coin);
  const hint = el("p", { class: "bd-hint", text: already ? "" : "리본 끝을 잡고 옆으로 쭉 당겨 풀어 보세요 →" });
  const closeBtn = el("button", { type: "button", class: "btn btn-sm bd-later " + (already ? "btn-primary" : "btn-quiet"), text: already ? "고마워요 💕" : "나중에 열기" });
  if (already) coinTx.textContent = "올해 생일 선물은 이미 받았어요 💝 다시 한번 생일 축하해요!";
  const card = el("div", { class: "bd-card", role: "dialog", "aria-modal": "true", "aria-label": "생일 축하" }, [
    el("p", { class: "bd-eb", text: "HAPPY BIRTHDAY 🎂" }),
    el("h2", { class: "serif bd-h", text: `${name ? name + "님, " : ""}생일 축하해요!` }),
    el("p", { class: "bd-msg", text: "태어나서 이 세상에서 사느라 정말 고생 많았어요. 오늘 하루만큼은 마음껏 축하받고, 행복한 것만 가득하길 해묘가 빌게요 🐾" }),
    giftEl, hint, coinTx, closeBtn,
  ].filter(Boolean));
  const ov = el("div", { class: "bd-ov" }, [cv, card]);
  document.body.appendChild(ov);
  const fx = confetti(cv, reduce);
  fx.burst(already ? 90 : 160);
  const done = () => { fx.stop(); ov.classList.add("out"); setTimeout(() => ov.remove(), 260); window.removeEventListener("hashchange", done); };
  window.addEventListener("hashchange", done);
  closeBtn.addEventListener("click", done);
  if (already) return;
  const svg = giftEl.querySelector("svg"), tail = svg.querySelector(".gf-tailR"), grab = svg.querySelector(".gf-grab"), bow = svg.querySelectorAll(".gf-loop");
  const K = { x: 114, y: 80 }, E0 = { x: 148, y: 122 };
  let opened = false, dragging = false, start = null, auto = 0;
  const setEnd = (x, y) => {
    const d = Math.hypot(x - E0.x, y - E0.y), s = Math.max(0.15, 1 - d / 75);
    tail.setAttribute("d", `M${K.x} ${K.y} C ${K.x + 10} ${K.y + 16}, ${(K.x + x) / 2 + 6} ${(K.y + y) / 2 + 12}, ${x} ${y}`);
    grab.setAttribute("cx", x); grab.setAttribute("cy", y);
    bow.forEach((p) => { p.style.transform = `scale(${s})`; });
    return d;
  };
  const toSvg = (e) => { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const m = svg.getScreenCTM(); return m ? pt.matrixTransform(m.inverse()) : { x: E0.x, y: E0.y }; };
  const open = () => {
    if (opened) return; opened = true; cancelAnimationFrame(auto);
    giftEl.classList.add("open"); hint.textContent = "";
    const r = grantOnce(bdayKey(), BDAY_COINS, { kind: "birthday" });
    coinTx.textContent = r.ok ? `🪙 생일 선물 코인 ${BDAY_COINS}개를 받았어요! 행복한 하루 보내요 💝` : "올해 생일 선물은 이미 받았어요 💝 생일 축하해요!";
    const n = document.getElementById("coin-balance"); if (n) n.textContent = String(getCoins());
    document.querySelectorAll(".sd-btn").forEach((x) => { x.classList.remove("hot"); x.firstChild.textContent = "축하 다시 보기 →"; });
    closeBtn.textContent = "고마워요 💕"; closeBtn.classList.remove("btn-quiet"); closeBtn.classList.add("btn-primary");
    fx.burst(260); setTimeout(() => fx.burst(180), 450);
  };
  // 탭만 하면 리본이 스르륵 당겨지며 풀림
  const autoPull = () => {
    if (opened) return;
    const t0 = performance.now(), dur = reduce ? 1 : 650;
    const stepA = (t) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      setEnd(E0.x + 70 * e, E0.y - 6 * e + 20 * e * e);
      if (k < 1) auto = requestAnimationFrame(stepA); else open();
    };
    auto = requestAnimationFrame(stepA);
  };
  giftEl.addEventListener("pointerdown", (e) => { if (opened) return; dragging = true; start = { x: e.clientX, y: e.clientY }; try { giftEl.setPointerCapture(e.pointerId); } catch { /* ignore */ } });
  giftEl.addEventListener("pointermove", (e) => {
    if (!dragging || opened) return;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < 4) return;
    const p = toSvg(e);
    if (setEnd(Math.max(30, Math.min(250, p.x)), Math.max(40, Math.min(200, p.y))) > 58) { dragging = false; open(); }
  });
  giftEl.addEventListener("pointerup", (e) => {
    if (!dragging) return; dragging = false;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < 6) autoPull(); else if (!opened) setEnd(E0.x, E0.y);
  });
  giftEl.addEventListener("pointercancel", () => { dragging = false; if (!opened) setEnd(E0.x, E0.y); });
  giftEl.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); autoPull(); } });
}

/* 💬 좀 써 본 사람에게 후기 부탁 — 풀이 10번 이상 · 3일 이상 들어온 사람 · 후기 안 쓴 사람 · 7일 간격 · 최대 3번 */
function reviewAsk(navigate) {
  if (getAdminView() || document.querySelector(".bd-ov, .popup-ov")) return;
  try { if (hasWrittenReview()) return; } catch { /* ignore */ }
  const w = getWallet(), log = (w && w.openLog) || [];
  const days = new Set(log.map((x) => new Date(x.t).toDateString())).size;
  if (log.length < 10 || days < 3) return;
  const KEY = "str.reviewask.v1", id = (localStorage.getItem("str.activeProfile.v1") || "guest");
  let all = {}; try { all = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { all = {}; }
  const st = all[id] || { n: 0, last: 0 };
  if (st.done || st.n >= 3 || Date.now() - st.last < 7 * 864e5) return;
  all[id] = { ...st, n: st.n + 1, last: Date.now() }; try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* ignore */ }
  const m = openModal([
    el("div", { class: "ra-box" }, [
      el("span", { class: "ra-cat", style: 'background-image:url("assets/img/haemyo.webp")', "aria-hidden": "true" }),
      el("p", { class: "ra-h", text: "해묘, 써 보니 어땠어요? 🐾" }),
      el("p", { class: "ra-p", text: `벌써 풀이를 ${log.length}번이나 열어 봤네요! 짧게라도 후기를 남겨 주면 해묘가 더 좋아질 수 있어요. 후기를 쓰면 코인 10개를 드려요.` }),
      el("div", { class: "ra-btns" }, [
        el("button", { type: "button", class: "btn btn-primary btn-block", onclick: () => { m.close(); navigate("/reviews"); } }, [el("span", { text: "💬 후기 쓰러 가기 · 코인 10개" })]),
        el("button", { type: "button", class: "btn btn-quiet btn-block", onclick: () => { m.close(); } }, [el("span", { text: "다음에 할게요" })]),
        el("button", { type: "button", class: "ra-never", onclick: () => { all[id] = { ...all[id], done: 1 }; try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* ignore */ } m.close(); } }, [el("span", { text: "다시 묻지 않기" })]),
      ]),
    ]),
  ], { title: "" });
}

/* 폭죽 — 캔버스 종이 조각 (가볍게 · 움직임 줄이기 설정이면 조금만) */
function confetti(cv, reduce) {
  const ctx = cv.getContext("2d"), dpr = Math.min(2, window.devicePixelRatio || 1);
  const fit = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  fit(); window.addEventListener("resize", fit);
  const COL = ["#ffb3cf", "#ffd38a", "#c9a6e6", "#9fe0c4", "#ff8fa8", "#fff1a8", "#a6c8ff"];
  let parts = [], raf = 0, alive = true;
  const step = () => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter((p) => p.y < innerHeight + 40 && p.life-- > 0);
    for (const p of parts) {
      p.vy += 0.12; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
      if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.s / 2, 0, 7); ctx.fill(); } else ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      ctx.restore();
    }
    if (alive && parts.length) raf = requestAnimationFrame(step); else raf = 0;
  };
  return {
    burst(n) {
      if (!alive) return;
      const k = reduce ? Math.round(n / 5) : n;
      for (const side of [0.15, 0.85, 0.5]) for (let i = 0; i < k / 3; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.3, v = 7 + Math.random() * 8;
        parts.push({ x: innerWidth * side, y: innerHeight * (side === 0.5 ? 0.35 : 0.75), vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, s: 6 + Math.random() * 7, c: COL[(Math.random() * COL.length) | 0], round: Math.random() < 0.3, life: 260 });
      }
      if (!raf) raf = requestAnimationFrame(step);
    },
    stop() { alive = false; cancelAnimationFrame(raf); window.removeEventListener("resize", fit); },
  };
}
