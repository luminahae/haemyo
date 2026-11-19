import { el, clear } from "../utils/dom.js";
import { pageHeader, backLink, noticeBox, loadDisclaimer } from "./shared.js";
import { getMyBirth } from "../state.js";
import { computeSaju } from "../saju/manse.js";
import { monthScores, taegilMonth, TAEGIL_PURPOSES } from "../saju/extras.js";
import { todayFortune } from "../saju/fortune.js";
import { isUnlocked, unlock, getCoins, costOf, getViewedDays, dayPreviewCost, buyDayPreview, noCoinToast } from "../wallet.js";
import { toast } from "../utils/dom.js";
import { openDayFortune } from "./sajuResult.js";
import { personSwitch } from "./people.js";
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
