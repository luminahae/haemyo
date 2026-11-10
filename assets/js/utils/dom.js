/* append/prepend 에 null·false 가 들어가면 화면에 'null' 글자가 찍히는 것 방지 (조건부 요소용) — HAE */
(() => {
  if (typeof Element === "undefined" || Element.prototype.__haeSafe) return;
  const wrap = (name) => { const orig = Element.prototype[name]; Element.prototype[name] = function (...xs) { return orig.apply(this, xs.filter((x) => x != null && x !== false)); }; };
  ["append", "prepend"].forEach(wrap);
  Element.prototype.__haeSafe = true;
})();
import { lunarMonthDays, lunarLeapMonth } from "../saju/astro.js";


/* 가벼운 DOM 헬퍼 — 프레임워크 없이 사용 */

/** 태그 생성 헬퍼. attrs 중 on* 는 이벤트, dataset/aria 지원 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "text") node.textContent = v;
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === "for") node.htmlFor = v;
    else node.setAttribute(k, v === true ? "" : String(v));
  }
  appendChildren(node, children);
  return node;
}

function appendChildren(node, children) {
  const arr = Array.isArray(children) ? children : [children];
  for (const c of arr) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
}

export const $ = (sel, ctx = document) => ctx.querySelector(sel);
export const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

/** 간단 토스트 */
let toastWrap;
export function toast(msg, ms = 2200, action = null) {
  if (!toastWrap) {
    toastWrap = el("div", { class: "toast-wrap", "aria-live": "polite" });
    document.body.appendChild(toastWrap);
  }
  if (typeof ms === "object" && ms) { action = ms; ms = 4500; }
  const t = el("div", { class: "toast" + (action ? " has-action" : ""), role: "status" }, [el("span", { text: msg })]);
  if (action && action.label) {
    t.append(el("button", { type: "button", class: "toast-act", onclick: () => { try { action.onClick(); } finally { t.remove(); } } }, [el("span", { text: action.label })]));
  }
  toastWrap.appendChild(t);
  setTimeout(() => {
    t.style.transition = "opacity .3s, transform .3s";
    t.style.opacity = "0";
    t.style.transform = "translateY(6px)";
    setTimeout(() => t.remove(), 320);
  }, ms);
}

/** 클립보드 복사 (fallback 포함) */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = el("textarea", { class: "sr-only" });
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

/** prefers-reduced-motion 여부 */
export const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** 결정론적 해시(seed) — 같은 입력 → 같은 결과 */
export function seedFromString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** seed 기반 의사난수 생성기(mulberry32) */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ===== (합침) validation.js ===== */
/* 입력 검증 — 생년월일/시간 등. 브라우저 기본 Date API만 사용. */

/** YYYY-MM-DD 문자열을 검증하고 파싱. 잘못된 조합/미래 날짜 판별 */
/* 생년월일 선택기 — 년/월/일 셀렉트 3개 (음력 30일·윤달도 입력 가능)
   반환 요소는 input처럼 .value('YYYY-MM-DD')를 읽고 쓸 수 있고 change/input 이벤트를 낸다.
   opts.mode(): { lunar, leap } 를 돌려주면 음력 달 길이에 맞춰 일(日) 목록을 바꾼다. */
export function ymdPicker(value = "", opts = {}) {
  const wrap = el("div", { class: "ymd", role: "group", "aria-label": opts.label || "생년월일" });
  if (opts.id) wrap.id = opts.id;
  const nowY = new Date().getFullYear();
  const mk = (cls, ph) => el("select", { class: "input ymd-" + cls, "aria-label": ph });
  const yS = mk("y", "년"), mS = mk("m", "월"), dS = mk("d", "일");
  yS.append(el("option", { value: "", text: "년" }), ...Array.from({ length: nowY - 1899 }, (_, i) => el("option", { value: String(nowY - i), text: `${nowY - i}년` })));
  mS.append(el("option", { value: "", text: "월" }), ...Array.from({ length: 12 }, (_, i) => el("option", { value: String(i + 1), text: `${i + 1}월` })));
  function maxDay() {
    const y = +yS.value, m = +mS.value;
    if (!y || !m) return 31;
    let md = {}; try { md = opts.mode ? opts.mode() : {}; } catch { md = {}; }
    if (md.lunar) return lunarMonthDays(y, m, !!md.leap) || 30;
    return new Date(y, m, 0).getDate();
  }
  function fillDays() {
    const cur = dS.value, n = maxDay();
    dS.replaceChildren(el("option", { value: "", text: "일" }), ...Array.from({ length: n }, (_, i) => el("option", { value: String(i + 1), text: `${i + 1}일` })));
    if (cur && +cur <= n) dS.value = cur;
  }
  const emit = () => { wrap.dispatchEvent(new Event("input", { bubbles: true })); wrap.dispatchEvent(new Event("change", { bubbles: true })); };
  [yS, mS].forEach((x) => x.addEventListener("change", (e) => { e.stopPropagation(); fillDays(); emit(); }));
  dS.addEventListener("change", (e) => { e.stopPropagation(); emit(); });
  dS.addEventListener("focus", fillDays); dS.addEventListener("mousedown", fillDays);
  Object.defineProperty(wrap, "value", {
    get() { return yS.value && mS.value && dS.value ? `${yS.value}-${String(mS.value).padStart(2, "0")}-${String(dS.value).padStart(2, "0")}` : ""; },
    set(v) {
      const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(v || "");
      if (!m) { yS.value = ""; mS.value = ""; fillDays(); dS.value = ""; return; }
      yS.value = String(+m[1]); mS.value = String(+m[2]); fillDays();
      if (!dS.querySelector(`option[value="${+m[3]}"]`)) dS.append(el("option", { value: String(+m[3]), text: `${+m[3]}일` }));
      dS.value = String(+m[3]);
    },
  });
  wrap.refresh = fillDays;
  wrap.append(yS, mS, dS);
  fillDays();
  wrap.value = value;
  return wrap;
}

export function validateBirthDate(dateStr, lunar = false) {
  if (!dateStr) return { ok: false, message: "생년월일을 입력해 주세요." };
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return { ok: false, message: "날짜 형식이 올바르지 않습니다." };
  const y = +m[1], mo = +m[2], d = +m[3];

  if (y < 1900) return { ok: false, message: "1900년 이후 날짜를 입력해 주세요." };
  if (mo < 1 || mo > 12) return { ok: false, message: "월은 1~12 사이여야 합니다." };

  // 잘못된 날짜 조합 검증 (예: 2월 30일) — 음력은 아래에서 음력 달 길이로 따로 검증
  const dt = new Date(y, mo - 1, Math.min(d, lunar ? 28 : d));
  if (lunar) { if (d < 1 || d > 30) return { ok: false, message: "음력 날짜는 1~30일이에요." }; }
  else if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
    return { ok: false, message: "존재하지 않는 날짜입니다. 다시 확인해 주세요." };
  }

  // 미래 날짜 검증
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (dt.getTime() > today.getTime()) {
    return { ok: false, message: "미래 날짜는 입력할 수 없습니다." };
  }

  return { ok: true, date: dt };
}

/** HH:MM 검증 */
export function validateBirthTime(timeStr, unknown) {
  if (unknown) return { ok: true };
  if (!timeStr) return { ok: false, message: "출생 시간을 입력하거나 ‘모름’을 선택해 주세요." };
  const m = /^(\d{2}):(\d{2})$/.exec(timeStr);
  if (!m) return { ok: false, message: "시간 형식이 올바르지 않습니다." };
  const h = +m[1], mi = +m[2];
  if (h > 23 || mi > 59) return { ok: false, message: "시간이 올바르지 않습니다." };
  return { ok: true };
}

/** 전체 폼 검증. 반환: { ok, errors: {fieldName: message} } */
export function validateBirthInput(input) {
  const errors = {};
  const bd = validateBirthDate(input.birthDate, input.calendarType === "lunar");
  if (!bd.ok) errors.birthDate = bd.message;
  else if (input.calendarType === "lunar") {
    const [Y, M, D] = input.birthDate.split("-").map(Number);
    const lp = lunarLeapMonth(Y);
    if (input.leapMonth && lp !== M) errors.birthDate = `음력 ${Y}년에는 ${M}월 윤달이 없어요.${lp ? ` (그해 윤달은 ${lp}월)` : " (그해는 윤달이 없어요)"} ‘윤달’ 체크를 다시 확인해 주세요.`;
    else {
      const days = lunarMonthDays(Y, M, !!input.leapMonth);
      if (days && D > days) errors.birthDate = `음력 ${Y}년 ${input.leapMonth ? "윤" : ""}${M}월은 ${days}일까지만 있어요. 날짜를 다시 확인해 주세요.`;
    }
  }

  const bt = validateBirthTime(input.birthTime, input.timeUnknown);
  if (!bt.ok) errors.birthTime = bt.message;

  if (!input.gender) errors.gender = "성별을 선택해 주세요.";
  if (!input.focus || input.focus.length === 0) {
    errors.focus = "집중해서 보고 싶은 분야를 하나 이상 선택해 주세요.";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

/* ===== (합침) icons.js ===== */
/* 인라인 SVG 아이콘 — 외부 아이콘 라이브러리 없이 직접 관리.
   stroke=currentColor 기반, 24x24 viewBox. */

const svg = (paths, opts = {}) =>
  `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" ` +
  `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${opts.attr || ""}>${paths}</svg>`;

export const icons = {
  eye: svg('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'),
  crown: svg('<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5L3 8Z"/><path d="M5 21h14"/>'),
  moon: svg('<path d="M20 14.5A8 8 0 1 1 10 4a6.5 6.5 0 0 0 10 10.5Z"/>'),
  sparkle: svg('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>'),
  saju: svg('<path d="M4 5h16M4 12h16M4 19h16M9 3v18M15 3v18"/>'),
  cards: svg('<rect x="4" y="6" width="11" height="15" rx="2"/><path d="M8.5 4.5 18 7.2a2 2 0 0 1 1.4 2.5l-2.6 9.3"/>'),
  arrowRight: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  arrowUp: svg('<path d="M12 19V5M6 11l6-6 6 6"/>'),
  chevronDown: svg('<path d="M6 9l6 6 6-6"/>'),
  check: svg('<path d="M4 12l5 5L20 6"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
  shield: svg('<path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  alert: svg('<path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 10v4M12 17h.01"/>'),
  copy: svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>'),
  share: svg('<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8 15.8 6.2M8.2 13.2l7.6 4.6"/>'),
  download: svg('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>'),
  trash: svg('<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  home: svg('<path d="M4 11l8-7 8 7M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9"/>'),
  heart: svg('<path d="M12 20s-7-4.4-9.3-8.5C1 8 3 4.5 6.5 4.5c2 0 3.2 1 5.5 3 2.3-2 3.5-3 5.5-3C21 4.5 23 8 21.3 11.5 19 15.6 12 20 12 20Z"/>'),
  briefcase: svg('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/>'),
  coins: svg('<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3M15 11.2c2.8.3 6 1.5 6 3.3 0 1.7-2.7 3-6 3s-6-1.3-6-3"/>'),
  users: svg('<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5"/><path d="M16 5.5a3 3 0 0 1 0 5.8M21 20c0-2.6-1.5-4.2-3.8-4.8"/>'),
  compass: svg('<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5 5-2Z"/>'),
  back: svg('<path d="M15 6l-6 6 6 6"/>'),
  x: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  bookmark: svg('<path d="M6 4h12v16l-6-4-6 4V4Z"/>'),
  lightbulb: svg('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.3 1 2.5h6c0-1.2.2-1.7 1-2.5A6 6 0 0 0 12 3Z"/>'),
};

/** 아이콘을 span으로 감싸 반환 (class 지정 가능) */
export function icon(name, className = "") {
  const span = document.createElement("span");
  span.className = className;
  span.setAttribute("aria-hidden", "true");
  span.style.display = "inline-flex";
  span.innerHTML = icons[name] || "";
  return span;
}
