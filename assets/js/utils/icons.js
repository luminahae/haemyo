/* 인라인 SVG 아이콘 — 외부 아이콘 라이브러리 없이 직접 관리.
   stroke=currentColor 기반, 24x24 viewBox. */

const svg = (paths, opts = {}) =>
  `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" ` +
  `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${opts.attr || ""}>${paths}</svg>`;

export const icons = {
  eye: svg('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'),
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
