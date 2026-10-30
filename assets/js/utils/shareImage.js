/* 공유용 결과 카드 이미지 생성 (Canvas) + Web Share / 다운로드.
   개인정보 보호: 생년월일 전체 대신 'YYYY년생', 시간 미공개, 닉네임만 노출. */

const CW = 1080, CH = 1350; // 4:5 세로 카드

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapLines(ctx, text, maxW) {
  const words = text.split(/(\s+)/);
  const lines = [];
  let line = "";
  for (const w of words) {
    if (ctx.measureText(line + w).width > maxW && line) {
      lines.push(line.trimEnd());
      line = w.trimStart();
    } else line += w;
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}

/** 안전한 프로필 라벨 (민감정보 마스킹) */
export function maskedProfileLabel(meta) {
  const parts = [];
  if (meta.nickname) parts.push(meta.nickname);
  if (meta.birthYear) parts.push(`${meta.birthYear}년생`);
  parts.push(meta.timeUnknown ? "출생 시간 미공개" : "출생 시간 비공개");
  return parts.join(" · ");
}

/**
 * @param {object} opts { kind:'saju'|'tarot', eyebrow, title, summary, tags:[], profileLabel }
 * @returns {Promise<Blob>}
 */
export function renderShareCard(opts) {
  const canvas = document.createElement("canvas");
  canvas.width = CW; canvas.height = CH;
  const ctx = canvas.getContext("2d");

  // 배경 (핑크 오로라 밤)
  const g = ctx.createLinearGradient(0, 0, CW, CH);
  g.addColorStop(0, "#2a1030");
  g.addColorStop(1, "#150a1a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CW, CH);

  // 은은한 로즈 광
  const rg = ctx.createRadialGradient(CW * 0.8, CH * 0.1, 50, CW * 0.8, CH * 0.1, 760);
  rg.addColorStop(0, "rgba(236,131,190,0.24)");
  rg.addColorStop(1, "rgba(236,131,190,0)");
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, CW, CH);
  // 라벤더 광 (반대쪽)
  const rg2 = ctx.createRadialGradient(CW * 0.15, CH * 0.9, 40, CW * 0.15, CH * 0.9, 640);
  rg2.addColorStop(0, "rgba(184,132,216,0.18)");
  rg2.addColorStop(1, "rgba(184,132,216,0)");
  ctx.fillStyle = rg2;
  ctx.fillRect(0, 0, CW, CH);

  // 별
  ctx.fillStyle = "rgba(245,220,235,0.75)";
  const starSeed = [[120,180,3],[900,240,2],[820,120,2],[200,300,2],[980,520,3],[80,620,2],[1000,900,2],[140,1000,2]];
  for (const [x, y, r] of starSeed) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }

  // 프레임
  ctx.strokeStyle = "rgba(228,131,187,0.5)";
  ctx.lineWidth = 2;
  roundRect(ctx, 48, 48, CW - 96, CH - 96, 28);
  ctx.stroke();

  const padX = 110, maxW = CW - padX * 2;
  let y = 210;

  // eyebrow
  ctx.fillStyle = "#f2b0d6";
  ctx.font = "600 34px 'Pretendard', 'Apple SD Gothic Neo', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText((opts.eyebrow || "").toUpperCase(), padX, y);
  y += 70;

  // title (serif)
  ctx.fillStyle = "#f4ecd8";
  ctx.font = "600 76px Georgia, 'Nanum Myeongjo', serif";
  for (const line of wrapLines(ctx, opts.title, maxW)) {
    ctx.fillText(line, padX, y);
    y += 92;
  }
  y += 16;

  // divider
  ctx.strokeStyle = "rgba(228,131,187,0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(padX, y); ctx.lineTo(padX + 120, y); ctx.stroke();
  y += 60;

  // summary body
  ctx.fillStyle = "#f4e9f1";
  ctx.font = "400 40px 'Pretendard', 'Apple SD Gothic Neo', sans-serif";
  const bodyLines = wrapLines(ctx, opts.summary, maxW).slice(0, 9);
  for (const line of bodyLines) {
    ctx.fillText(line, padX, y);
    y += 62;
  }

  // tags
  if (opts.tags && opts.tags.length) {
    y += 30;
    let tx = padX;
    ctx.font = "500 32px 'Pretendard', sans-serif";
    for (const tag of opts.tags.slice(0, 4)) {
      const tw = ctx.measureText(tag).width + 44;
      if (tx + tw > CW - padX) break;
      ctx.strokeStyle = "rgba(228,131,187,0.5)";
      roundRect(ctx, tx, y - 34, tw, 52, 26);
      ctx.stroke();
      ctx.fillStyle = "#f2b0d6";
      ctx.fillText(tag, tx + 22, y);
      tx += tw + 18;
    }
  }

  // footer: 프로필(마스킹) + 서비스명
  ctx.textAlign = "left";
  ctx.fillStyle = "#cfb4cd";
  ctx.font = "400 30px 'Pretendard', sans-serif";
  ctx.fillText(opts.profileLabel || "", padX, CH - 150);

  ctx.fillStyle = "#e483bb";
  ctx.font = "600 30px 'Pretendard', sans-serif";
  ctx.fillText("해묘 解猫 · 인생이 묘할 때, 해묘", padX, CH - 100);

  ctx.fillStyle = "#9d83a3";
  ctx.font = "400 26px 'Pretendard', sans-serif";
  ctx.fillText("자기이해를 위한 참고 콘텐츠 · 미래를 확정하지 않습니다", padX, CH - 62);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png", 0.95));
}

/** 이미지 다운로드 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Web Share API로 공유(가능하면 파일 포함), 아니면 false 반환 */
export async function shareImage(blob, { title, text }) {
  const file = new File([blob], "saju-tarot-result.png", { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ title, text, files: [file] });
      return true;
    } catch (e) {
      if (e && e.name === "AbortError") return true; // 사용자가 취소
      return false;
    }
  }
  return false;
}

/** 텍스트만 공유(파일 미지원 환경) */
export async function shareText({ title, text }) {
  if (navigator.share) {
    try { await navigator.share({ title, text }); return true; }
    catch (e) { return e && e.name === "AbortError"; }
  }
  return false;
}

/* =========================================================
   리포트 통째로 저장 — 이미지(PNG) / PDF
   html2canvas·jsPDF는 처음 누를 때만 CDN(jsDelivr)에서 받아 온다.
   ========================================================= */
/* 저장 도구 — 앱 안에 같이 넣어 둔 파일을 먼저 쓰고, 안 되면 CDN */
const LOCAL = (f) => new URL(`../../vendor/${f}`, import.meta.url).href;
const CDN = "https://cdn.jsdelivr.net/npm";
function loadScript(src, globalName) {
  if (window[globalName]) return Promise.resolve(window[globalName]);
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.async = true;
    s.onload = () => (window[globalName] ? res(window[globalName]) : rej(new Error("load")));
    s.onerror = () => { s.remove(); rej(new Error("load")); };
    document.head.appendChild(s);
  });
}
const loadEither = (local, cdn, g) => loadScript(LOCAL(local), g).catch(() => loadScript(cdn, g));
async function loadH2C() {
  const m = await loadEither("html2canvas.min.js", `${CDN}/html2canvas-pro@2.4.3/dist/html2canvas-pro.min.js`, "html2canvas");
  return typeof m === "function" ? m : m.default;
}
const loadPDF = () => loadEither("jspdf.min.js", `${CDN}/jspdf@4.2.1/dist/jspdf.umd.min.js`, "jspdf");


/* =========================================================
   저장용 '결과지' 만들기 (HAE)
   화면을 그대로 찍지 않고, 결과만 골라 담은 깔끔한 종이를 따로 만들어 찍는다.
   - 빼는 것: 입력 칸 · 고르기 버튼 · 탭 · 잠금 카드 · 이동 링크 · '~볼까?' 같은 질문 문구 · 빈 상자
   - 넣는 것: 위에 해묘 머리말(제목·이름·날짜), 아래에 꼬리말
   ========================================================= */
const DROP = [
  "form", "input", "select", "textarea", ".field", "label.chip", "[role=tablist]", "[role=tab]",
  ".action-bar", ".person-switch", ".pb-switch", ".to-top", ".dl-fab", ".dl-sheet", ".back-link", "[data-nocapture]",
  ".premium-lock", ".lock-badge", ".modal-card", ".popup-ov", ".reopen", ".toast-wrap", ".sdk-tip",
  ".btn", ".chip", ".seg", ".tab", ".ps-chip", ".tjt-more", ".tjt-grid", ".deep-cta", ".pm-tg", ".pm-list", ".pm-related", ".fg-hands", ".fg-hands-note",
  "a[href^='#/']", "nav", ".tabbar", ".bottom-nav",
];
const KEEP_BUTTON = ".lk-col, .cal-d, .tcard, [data-keep], .ms-tile, .wg2-cell";
export function buildExportSheet(root, title, mode = "pdf") {
  const clone = root.cloneNode(true);
  const img = mode === "img";
  // 이미지: 요약만 — 접혀 있던 자세한 풀이·안내문·연관 메뉴는 빼고 지금 펼쳐 보이는 핵심만
  if (img) {
    const src = [...root.querySelectorAll("details")], cl = [...clone.querySelectorAll("details")];
    cl.forEach((d, i) => {
      if (src[i] && !src[i].open) { d.remove(); return; }
      // 펼쳐진 상세 풀이는 제목 + 첫 핵심 한 문단만
      const sum = d.querySelector(":scope > summary");
      const first = [...d.querySelectorAll("p")].find((x) => !(sum && sum.contains(x)) && (x.textContent || "").trim().length > 12);
      [...d.children].forEach((c) => { if (c !== sum) c.remove(); });
      if (first) { const keep = document.createElement("div"); keep.className = "xp-brief"; keep.appendChild(first); d.appendChild(keep); }
    });
    clone.querySelectorAll(".rc-chevron, [class*='chevron']").forEach((e) => e.remove());
    clone.querySelectorAll(".notice, [role=note], .fg-note, .disclaimer, [class*='disclaim'], .pm-related, .deep-cta").forEach((e) => e.remove());
  }
  clone.querySelectorAll("details").forEach((d) => { d.open = true; d.setAttribute("open", ""); });
  // 질문 문구('몇 년도 운세를 볼까?')가 있는 고르기 상자 — 컨트롤을 뺀 뒤 남는 게 거의 없으면 상자째 뺀다
  const asks = [];
  clone.querySelectorAll("p, h2, h3, h4, span.eyebrow, legend, .tjc-l").forEach((e) => {
    const t = (e.textContent || "").trim();
    if (t.length < 30 && /[?？)]$/.test(t) && /[?？]/.test(t) && e.parentElement && e.parentElement.querySelector("button, input, select, .chip, .seg")) asks.push([e, e.parentElement, t.length]);
  });
  // 잠긴 풀이(🔒 · 코인으로 열기) 안내 상자
  clone.querySelectorAll("div, section, article").forEach((e) => {
    if (!clone.contains(e)) return;
    const t = (e.textContent || "").trim();
    if (t.length < 160 && (/^🔒/.test(t) || /코인 \d+개로 열기|열어 보기|특별 코드를 입력/.test(t)) && !e.querySelector("h1")) e.remove();
  });
  // 따옴표 장식(::before/::after)은 캡처 때 한쪽으로 몰려서 — 진짜 글자로 바꿔 넣음
  clone.querySelectorAll(".insight").forEach((q) => {
    q.classList.add("xp-q");
    const o = document.createElement("span"); o.className = "xp-qm"; o.textContent = "“";
    const c = document.createElement("span"); c.className = "xp-qm"; c.textContent = "”";
    q.prepend(o); q.append(c);
  });
  clone.querySelectorAll(DROP.join(",")).forEach((e) => { if (!e.matches(KEEP_BUTTON) && !e.querySelector(KEEP_BUTTON)) e.remove(); });
  // 고르기용 버튼(카드 모양 선택지 등)은 빼고, 결과 표 안의 버튼(대운 칸·달력 칸)은 남김
  clone.querySelectorAll("button").forEach((b) => { if (!b.matches(KEEP_BUTTON) && !b.closest(KEEP_BUTTON)) b.remove(); });
  asks.forEach(([q, box, n]) => {
    if (!clone.contains(box)) return;
    if (((box.textContent || "").trim().length - n) < 24 && !box.querySelector("img, svg, canvas, .tcard")) box.remove(); else q.remove();
  });
  // '누구와 볼까?' '무엇을 볼까?' 같은 질문 문구
  clone.querySelectorAll("p, h2, h3, h4, span.eyebrow, legend, .tjc-l").forEach((e) => {
    const t = (e.textContent || "").trim();
    if (t.length < 30 && /[?？]$/.test(t)) e.remove();
  });
  // 비어 버린 상자 정리 (안쪽부터 여러 번)
  for (let k = 0; k < 4; k++) {
    clone.querySelectorAll("div, section, article, header, p, span, details, summary, ul, li").forEach((e) => {
      if (!clone.contains(e)) return;
      const hasMedia = e.querySelector("img, svg, canvas, .tcard-img, .tcard-sprite, i, .og-badge, [style*='background-image']");
      if (!(e.textContent || "").trim() && !hasMedia && !e.matches("i, .tcard-img, .tcard-sprite, [style*='background-image'], .bar, .tjm-bt, .tjm-bt i")) e.remove();
    });
  }
  // 이름표 하나만 덩그러니 남은 맨 위 묶음(‘테마로 보기’ 등)
  clone.querySelectorAll("section").forEach((e) => {
    if (!clone.contains(e)) return;
    const t = (e.textContent || "").trim();
    if (t.length < 24 && !e.querySelector("img, svg, canvas, .tcard, h1, h2")) { e.remove(); return; }
    // 제목·설명만 남고 내용 상자는 비어 버린 묶음
    const onlyHead = !e.querySelector("div, ul, ol, table, img, svg, canvas, details, blockquote, dl")
      && [...e.querySelectorAll("p")].every((x) => /muted|lead|tiny|sub|desc|eyebrow/.test(x.className));
    if (onlyHead && t.length < 160) e.remove();
  });
  // 첫 화면 머리(eyebrow·h1·설명)는 머리말이 대신함
  const h1 = root.querySelector("h1");
  const head = h1 ? clone.querySelector("h1") : null;
  if (head && head.parentElement && head.parentElement.tagName === "HEADER") head.parentElement.remove();
  // 이름 · 날짜
  let who = "";
  try {
    const pid = localStorage.getItem("str.activeProfile.v1") || "guest";
    const va = JSON.parse(localStorage.getItem("str.viewas.v1") || "null");
    const my = JSON.parse(localStorage.getItem("str.mybirth.v1") || "{}")[pid];
    who = (va && va.name) || (my && my.name) || "";
  } catch { /* ignore */ }
  if (img) {
    const tt = ((h1 && h1.textContent) || title || "").replace(/\s+/g, "");
    clone.querySelectorAll("h1, h2, h3").forEach((h) => {
      if (!clone.contains(h) || (h.textContent || "").replace(/\s+/g, "") !== tt) return;
      const box = h.closest(".panel, section, article, header, [class*='hero'], [class*='card']");
      if (box && clone.contains(box) && box !== clone && (box.textContent || "").trim().length < 260) box.remove(); else h.remove();
    });
  }
  const d = new Date(), ds = `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
  const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const sheet = mk("div", "xp-sheet");
  const top = mk("div", "xp-head");
  top.append(mk("div", "xp-brand", "☾ 해묘 解猫"), mk("h1", "xp-title", (h1 && h1.textContent.trim()) || title || "해묘 리포트"),
    mk("p", "xp-meta", [who ? `${who}님의 풀이` : "", ds].filter(Boolean).join(" · ")));
  const body = mk("div", "xp-body"); body.appendChild(clone);
  const disclaim = /참고용 콘텐츠예요[^]*$/;
  const bodyText = (clone.textContent || "").replace(/\s+/g, " ").replace(disclaim, "").trim();
  const hasPic = !!clone.querySelector("img, canvas, .tcard") || [...clone.querySelectorAll("svg[viewBox]")].some((v) => +(v.getAttribute("viewBox").split(/[\s,]+/)[2]) > 40);
  const foot = mk("div", "xp-foot", "해묘 解猫 · 사주·타로·운세 · 재미와 자기 이해를 위한 참고용 풀이예요");
  sheet.append(top, body, foot);
  const holder = mk("div", "xp-holder"); holder.setAttribute("aria-hidden", "true"); holder.appendChild(sheet);
  document.body.appendChild(holder);
  return { node: sheet, cleanup: () => holder.remove(), empty: bodyText.length < 60 && !hasPic };
}

/** 화면의 한 부분을 캔버스로 — 접힌 섹션은 펼치고, 버튼·메뉴는 빼고 찍는다 */
async function captureNode(node, onClone) {
  const h2c = await loadH2C();
  const opened = [];
  node.querySelectorAll("details:not([open])").forEach((d) => { d.open = true; opened.push(d); });
  document.body.classList.add("is-capturing");
  await new Promise((r) => setTimeout(r, 120));
  try {
    const h = node.scrollHeight;
    const scale = Math.max(1, Math.min(2, 14000 / Math.max(1, h)));
    return await h2c(node, {
      backgroundColor: node.classList && node.classList.contains("xp-sheet") ? "#5e4064" : "#8a5d86", scale, useCORS: true, logging: false,
      ignoreElements: (el) => !!(el.hasAttribute && (el.hasAttribute("data-nocapture") || (el.classList && (el.classList.contains("action-bar") || el.classList.contains("person-switch") || el.classList.contains("to-top") || el.classList.contains("dl-sheet"))))),
      windowWidth: Math.max(390, node.scrollWidth), scrollX: 0, scrollY: 0,
      // 실제로 그려지는 복사본에서 위치를 잼 (화면 쪽 위치와 몇 px씩 어긋나서)
      onclone: onClone ? (doc) => { try { const n = doc.querySelector(".xp-holder .xp-sheet"); if (n) onClone(n); } catch { /* ignore */ } } : undefined,
    });
  } finally {
    document.body.classList.remove("is-capturing");
    opened.forEach((d) => { d.open = false; });
  }
}

export async function nodeToPngBlob(node) {
  const canvas = await captureNode(node);
  return await new Promise((r) => canvas.toBlob(r, "image/png"));
}
/* PDF 쪽 나누기 — 카드·문단 한가운데가 잘리지 않게, 경계(틈)에서 자른다 */
function breakBoxes(node) {
  const top = node.getBoundingClientRect().top;
  const H = node.scrollHeight || 1;
  const box = (e) => { const r = e.getBoundingClientRect(); return r.height > 0 ? [r.top - top, r.bottom - top] : null; };
  const big = [], small = [], cards = [];
  node.querySelectorAll(".xp-body .panel, .xp-body [class*='card'], .xp-body section, .xp-body article, .xp-body details, .xp-body .insight, .xp-body blockquote, .xp-body [class*='box'], .xp-body table, .xp-body ul, .xp-body ol, .xp-head").forEach((e) => { const b = box(e); if (b) big.push(b); });
  node.querySelectorAll(".xp-body p, .xp-body li, .xp-body h2, .xp-body h3, .xp-body h4, .xp-body tr, .xp-body img, .xp-body svg, .xp-body canvas, .xp-body .tcard, .xp-body b, .xp-body strong, .xp-body small, .xp-body span, .xp-body [class*='row'], .xp-body [class*='item'], .xp-body [class*='cell']").forEach((e) => { const b = box(e); if (b) small.push(b); });
  // 테두리나 바탕색이 있는 작은 상자(타일·칸)도 통째로 — 상자 한가운데서 안 자르게
  node.querySelectorAll(".xp-body div, .xp-body button, .xp-body li, .xp-body article, .xp-body section, .xp-body aside, .xp-body figure, .xp-body table, .xp-body tr, .xp-body details, .xp-body a").forEach((e) => {
    const b = box(e); if (!b) return;
    const cs = (e.ownerDocument.defaultView || window).getComputedStyle(e);
    const painted = (cs.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor)) || cs.backgroundImage !== "none" || parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderLeftWidth) > 0;
    if (painted) { big.push(b); cards.push(b); }
  });
  // 실제 글자 줄 하나하나 — 어떤 경우에도 글자 줄 한가운데로는 자르지 않음
  const lines = [];
  const body = node.querySelector(".xp-body") || node;
  const D = node.ownerDocument || document;
  const tw = D.createTreeWalker(body, NodeFilter.SHOW_TEXT, { acceptNode: (t) => (t.nodeValue.trim() ? 1 : 3) });
  const rg = D.createRange();
  for (let t = tw.nextNode(); t; t = tw.nextNode()) {
    rg.selectNodeContents(t);
    for (const r of rg.getClientRects()) if (r.height > 0 && r.width > 0) lines.push([r.top - top - 3, r.bottom - top + 3]);
  }
  node.querySelectorAll(".xp-body img, .xp-body svg, .xp-body canvas, .xp-body .tcard, .xp-body summary, .xp-body label").forEach((e) => { const b = box(e); if (b) lines.push([b[0] - 2, b[1] + 2]); });
  lines.sort((a, b) => a[0] - b[0]);
  const cands = new Set();
  [...big, ...small].forEach(([t, bt]) => { cands.add(Math.floor(t) - 2); cands.add(Math.ceil(bt) + 2); });
  lines.forEach(([t, bt]) => { cands.add(Math.floor(t)); cands.add(Math.ceil(bt)); });
  return { H, big, small, lines, cards, cands: [...cands].filter((y) => y > 0 && y < H).sort((x, y) => x - y) };
}
/* 글자 줄을 절대 가르지 않게 — 캡처된 그림에서 '아무것도 없는 가로 띠'를 찾아 그 가운데서 자름 */
function blankBands(canvas, from, to, minBand) {
  from = Math.max(1, Math.floor(from)); to = Math.min(canvas.height - 1, Math.floor(to));
  if (to - from < minBand) return [];
  const W = canvas.width, x0 = Math.floor(W * 0.03), x1 = Math.floor(W * 0.97), step = 3;
  const data = canvas.getContext("2d").getImageData(0, from - 1, W, to - from + 1).data;
  const lum = (r, x) => { const i = (r * W + x) * 4; return data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11; };
  const bands = []; let run = 0;
  for (let r = 1; r <= to - from; r++) {
    let d = 0, n = 0;
    for (let x = x0; x < x1; x += step) { d += Math.abs(lum(r, x) - lum(r - 1, x)); n++; }
    if (d / n < 0.9) run++;
    else { if (run >= minBand) bands.push([from + r - run, from + r - 1]); run = 0; }
  }
  if (run >= minBand) bands.push([from + (to - from) - run, to]);
  return bands;
}
function pickCut(canvas, info, k, y, limit, sliceH) {
  const lo = y + sliceH * 0.42;
  const bands = blankBands(canvas, lo, limit, Math.max(6, Math.round(k * 4)));
  const mid = (b) => Math.round((b[0] + b[1]) / 2);
  const pg = sliceH / k;
  const inBig = (yy) => info && info.big.some(([t, b]) => {
    const c = yy / k; if (!(c > t + 2 && c < b - 2)) return false;
    if ((b - t) < pg * 0.95) return true;              // 한 쪽에 들어가는 상자는 통째로
    return (c - t) < pg * 0.22 || (b - c) < pg * 0.12; // 긴 상자도 머리만/꼬리만 떨어지지 않게
  });
  // 1순위: 카드 밖 빈 틈(카드째 다음 쪽으로)  2순위: 카드 안이라도 글줄 사이 빈 띠
  const outside = bands.filter((b) => !inBig(mid(b)));
  if (outside.length) {
    const cut = mid(outside[outside.length - 1]), c = cut / k;
    return { cut, split: !!(info && info.cards.some(([t, b]) => c > t + 2 && c < b - 2)) }; // 긴 카드 안에서 넘기면 '이어져요' 표시
  }
  if (bands.length) {
    // 긴 카드 안 — 띠가 넓은(문단 사이) 곳을 쪽 끝 가까이에서 우선
    const wide = bands.filter((b) => b[1] - b[0] >= Math.round(k * 10) && mid(b) > y + sliceH * 0.7);
    const b = (wide.length ? wide : bands)[(wide.length ? wide : bands).length - 1];
    return { cut: mid(b), split: true };
  }
  const any = blankBands(canvas, y + sliceH * 0.2, limit, 3);
  return any.length ? { cut: mid(any[any.length - 1]), split: true } : { cut: limit, split: true };
}
/* '이어져요' 작은 알약 — 그림 위가 아니라 쪽 여백에 붙임 */
function notePill(text) {
  const S = 12; // 1mm = 12px
  const c = document.createElement("canvas"); const x = c.getContext("2d");
  const font = getComputedStyle(document.body).fontFamily || "sans-serif";
  x.font = `600 ${2.7 * S}px ${font}`; const tw = x.measureText(text).width + 8 * S, h = 5.4 * S;
  c.width = Math.ceil(tw); c.height = Math.ceil(h);
  x.fillStyle = "#5e4064"; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = "rgba(255,255,255,.07)"; x.strokeStyle = "rgba(255,195,209,.6)"; x.lineWidth = 0.3 * S;
  x.beginPath(); if (x.roundRect) x.roundRect(1, 1, c.width - 2, c.height - 2, h / 2); else x.rect(1, 1, c.width - 2, c.height - 2); x.fill(); x.stroke();
  x.font = `600 ${2.7 * S}px ${font}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = "#ffd9c2"; x.fillText(text, c.width / 2, c.height / 2 + 0.2 * S);
  return { url: c.toDataURL("image/png"), w: c.width / S, h: c.height / S };
}
/* PDF 목차용 — 결과 안의 파트 제목과 위치 */
function sectionsOf(node) {
  const top = node.getBoundingClientRect().top;
  const raw = [];
  node.querySelectorAll(".xp-body h2, .xp-body h3, .xp-body .eyebrow, .xp-body .wg-h, .xp-body [class*='title']").forEach((e) => {
    const r = e.getBoundingClientRect(); if (!r.height) return;
    const t = (e.textContent || "").replace(/^[\s→—–·\-]+/, "").replace(/\s+/g, " ").trim();
    if (t.length < 2 || t.length > 40) return;
    raw.push({ y: r.top - top, t, eb: e.classList.contains("eyebrow") });
  });
  raw.sort((x, y) => x.y - y.y);
  const out = [];
  for (const r of raw) {
    const last = out[out.length - 1];
    if (last && r.y - last.y < 44) { if (last.eb && !r.eb) { last.t = r.t; last.eb = false; } continue; } // 작은 머리말 + 제목은 하나로
    out.push({ ...r });
  }
  const seen = new Set();
  return out.filter((x) => (seen.has(x.t) ? false : (seen.add(x.t), true))).slice(0, 28);
}
/* 목차 쪽을 그림으로 그림 (PDF 기본 글꼴엔 한글이 없어서) — 줄마다 위치를 돌려줌 */
function drawToc(W, H, pxPerMm, title, items) {
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d"); const mm = (v) => v * pxPerMm;
  const font = (getComputedStyle(document.body).fontFamily || "sans-serif");
  x.fillStyle = "#5e4064"; x.fillRect(0, 0, W, H);
  x.textBaseline = "alphabetic"; x.textAlign = "center";
  x.fillStyle = "#ffc3d1"; x.font = `600 ${mm(3.4)}px ${font}`; x.fillText("☾ 해묘 解猫", W / 2, mm(16));
  x.fillStyle = "#f6eef1"; x.font = `800 ${mm(7)}px ${font}`; x.fillText(title, W / 2, mm(30), W - mm(20));
  x.fillStyle = "#e0bcc8"; x.font = `600 ${mm(3.6)}px ${font}`; x.fillText("목차 · 제목을 누르면 그 쪽으로 이동해요", W / 2, mm(39));
  x.strokeStyle = "rgba(255,238,244,.25)"; x.lineWidth = Math.max(1, mm(0.3)); x.beginPath(); x.moveTo(mm(8), mm(46)); x.lineTo(W - mm(8), mm(46)); x.stroke();
  const avail = H / pxPerMm - 58, rowH = Math.min(11, Math.max(8, avail / Math.max(1, items.length)));
  const rows = [];
  items.forEach((it, i) => {
    const y0 = 52 + i * rowH, base = mm(y0 + rowH * 0.62);
    x.fillStyle = i % 2 ? "rgba(255,255,255,.04)" : "rgba(255,255,255,.08)";
    x.fillRect(mm(6), mm(y0), W - mm(12), mm(rowH - 1.2));
    x.textAlign = "left"; x.fillStyle = "#ffc3d1"; x.font = `800 ${mm(rowH * 0.36)}px ${font}`; x.fillText(String(i + 1).padStart(2, "0"), mm(10), base);
    x.fillStyle = "#f6eef1"; x.font = `600 ${mm(rowH * 0.4)}px ${font}`; x.fillText(it.t, mm(22), base, W - mm(52));
    x.textAlign = "right"; x.fillStyle = "#ffd9c2"; x.font = `700 ${mm(rowH * 0.36)}px ${font}`; x.fillText(`${it.page}쪽  ›`, W - mm(10), base);
    rows.push({ y: y0, h: rowH - 1.2, page: it.page });
  });
  return { canvas: c, rows };
}
export async function nodeToPdfBlob(node) {
  let info = null, secs = [];
  const measure = (n) => { try { info = breakBoxes(n); } catch { info = null; } try { secs = sectionsOf(n); } catch { secs = []; } };
  const [canvas, lib] = await Promise.all([captureNode(node, measure), loadPDF()]);
  if (!info) measure(node);
  const { jsPDF } = lib;
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = 210, pageH = 297, margin = 10;
  const imgW = pageW - margin * 2;
  const pxPerMm = canvas.width / imgW;
  const sliceH = Math.floor((pageH - margin * 2) * pxPerMm);
  const k = info ? canvas.height / info.H : 1; // 화면 px → 캔버스 px
  const starts = []; let prevSplit = false;
  for (let y = 0, i = 0; y < canvas.height - 2; i++) {
    const remain = canvas.height - y;
    let h = Math.min(sliceH, remain);
    let fitAll = false, split = false;
    if (remain > sliceH && remain <= sliceH * 1.16) { h = remain; fitAll = true; } // 꼬리만 남는 장 대신 마지막 장을 살짝 줄여 한 장에
    else if (y + h < canvas.height - 2) {
      const r = pickCut(canvas, info, k, y, y + sliceH, sliceH);
      h = Math.max(1, Math.min(sliceH, r.cut - y)); split = r.split;
    }
    starts.push(y / k);
    const part = document.createElement("canvas");
    part.width = canvas.width; part.height = h;
    const ctx = part.getContext("2d");
    ctx.fillStyle = "#5e4064"; ctx.fillRect(0, 0, part.width, h);
    ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
    if (i > 0) pdf.addPage();
    pdf.setFillColor(94, 64, 100); pdf.rect(0, 0, pageW, pageH, "F");
    const sh = fitAll ? sliceH / h : 1, w = imgW * sh;
    pdf.addImage(part.toDataURL("image/jpeg", 0.92), "JPEG", margin + (imgW - w) / 2, margin, w, (h / pxPerMm) * sh);
    if (prevSplit) { const n1 = notePill("↑ 앞 쪽에서 이어져요"); pdf.addImage(n1.url, "PNG", (pageW - n1.w) / 2, (margin - n1.h) / 2, n1.w, n1.h); }
    if (split) { const n2 = notePill("다음 쪽에 이어져요 ↓"); pdf.addImage(n2.url, "PNG", (pageW - n2.w) / 2, Math.min(pageH - 14, margin + h / pxPerMm + 1.5), n2.w, n2.h); }
    prevSplit = split;
    y += h;
  }
  // 목차 — 파트가 3개 이상이고 2쪽 이상일 때 맨 앞에 한 장
  const pages = pdf.getNumberOfPages();
  const pageOf = (yy) => { let p = 0; starts.forEach((st, i) => { if (yy >= st - 2) p = i; }); return p + 1; };
  const items = secs.map((x) => ({ t: x.t, page: pageOf(x.y) }));
  const hasToc = pages >= 3 && items.length >= 3;
  if (hasToc) {
    const title = (node.querySelector(".xp-title") || {}).textContent || "해묘 리포트";
    items.forEach((it) => { it.page += 1; });
    const toc = drawToc(canvas.width, sliceH, pxPerMm, title.trim(), items);
    pdf.insertPage(1);
    pdf.setPage(1);
    pdf.setFillColor(94, 64, 100); pdf.rect(0, 0, pageW, pageH, "F");
    pdf.addImage(toc.canvas.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, imgW, sliceH / pxPerMm);
    toc.rows.forEach((r) => pdf.link(margin + 6, margin + r.y, imgW - 12, r.h, { pageNumber: r.page }));
  }
  const n = pdf.getNumberOfPages();
  if (n > 1) for (let p = 1; p <= n; p++) {
    pdf.setPage(p); pdf.setFontSize(8); pdf.setTextColor(230, 200, 215);
    pdf.text(`${p} / ${n}`, pageW / 2, pageH - 4, { align: "center" });
    if (hasToc && p > 1) { pdf.text("CONTENTS", pageW - margin, pageH - 4, { align: "right" }); pdf.link(pageW - margin - 18, pageH - 8, 18, 6, { pageNumber: 1 }); }
  }
  return pdf.output("blob");
}
/* 이미지 저장 — 짧으면 1장, 길면 2장, 아주 길면 최대 3장 (폰 화면 비율까지) */
export async function nodeToPngPages(node) {
  let info = null;
  const measure = (n) => { try { info = breakBoxes(n); } catch { info = null; } };
  const canvas = await captureNode(node, measure);
  if (!info) measure(node);
  // 되도록 '한 장'으로 — 세로 길이는 내용에 맞춰 늘리되(최대 폰 화면 비율 1080×2400), 넘치면 글자를 조금 줄이고(최대 62%), 그래도 넘칠 때만 2장 이상으로
  const W = 1080, pad = 40, headH = 92, footH = 76, MINH = 1080, MAXH = 2560;
  const frame = headH + footH + 8;
  const s0 = (W - pad * 2) / canvas.width;
  const need = (sc) => canvas.height * sc;
  const area0 = MAXH - frame;
  // 짧은 건 무조건 1장. 길면 글자를 줄여(1장은 50%까지) 1장 → 그래도 넘치면 2장 → 아주 길면 최대 3장
  let s = s0, nPages = 1;
  if (need(s0) > area0) {
    const fitN = (n) => (n * area0 * (n > 1 ? 0.92 : 1)) / canvas.height; // 여러 장은 자르는 틈 여유 8%
    if (fitN(1) >= s0 * 0.5) s = fitN(1);
    else if (fitN(2) >= s0 * 0.62) { nPages = 2; s = Math.min(s0, fitN(2)); }
    else { nPages = 3; s = Math.max(s0 * 0.5, Math.min(s0, fitN(3))); }
  }
  const dw = Math.round(canvas.width * s), dx = Math.round((W - dw) / 2);
  const sliceH = Math.floor(area0 / s);
  const k = info ? canvas.height / info.H : 1;
  const cuts = [];
  if (nPages === 1) cuts.push([0, canvas.height, false]);
  else for (let y = 0; y < canvas.height - 2;) {
    const remain = canvas.height - y;
    let h = Math.min(sliceH, remain), split = false;
    if (remain > sliceH) { const r = pickCut(canvas, info, k, y, y + sliceH, sliceH); h = Math.max(1, Math.min(sliceH, r.cut - y)); split = r.split; }
    cuts.push([y, h, split]); y += h;
  }
  // 장마다 높이는 내용에 맞춤 (여러 장이면 같은 높이로 맞춰 나란히 보기 좋게)
  const hOf = (h) => Math.max(MINH, Math.min(MAXH, Math.round(h * s) + frame));
  const Hall = cuts.length > 1 ? Math.max(...cuts.map(([, h]) => hOf(h))) : null;
  const font = getComputedStyle(document.body).fontFamily || "sans-serif";
  const N = cuts.length, out = [];
  for (let i = 0; i < N; i++) {
    const [y, h, split] = cuts[i];
    const H = Hall || hOf(h);
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d");
    x.fillStyle = "#5e4064"; x.fillRect(0, 0, W, H);
    // 머리띠: 브랜드 · 쪽수
    x.textBaseline = "middle"; x.textAlign = "left"; x.fillStyle = "#ffc3d1"; x.font = `700 28px ${font}`;
    x.fillText("☾ 해묘 解猫", pad, headH / 2 + 4);
    if (N > 1) {
      const t = `${i + 1} / ${N}`; x.font = `700 24px ${font}`; const tw = x.measureText(t).width + 36;
      x.fillStyle = "rgba(255,255,255,.12)"; roundRect(x, W - pad - tw, headH / 2 - 20, tw, 40, 20); x.fill();
      x.fillStyle = "#ffe3d8"; x.textAlign = "center"; x.fillText(t, W - pad - tw / 2, headH / 2 + 2);
    }
    x.strokeStyle = "rgba(255,225,236,.22)"; x.lineWidth = 2; x.beginPath(); x.moveTo(pad, headH); x.lineTo(W - pad, headH); x.stroke();
    // 본문 조각
    // 본문이 짧은 장은 위아래 가운데에 (빈 공간이 한쪽에 몰리지 않게)
    const dh = Math.round(h * s), area = H - frame;
    const dy = headH + 8 + (i === 0 ? 0 : Math.max(0, Math.round((area - dh) / 2)));
    x.drawImage(canvas, 0, y, canvas.width, h, dx, dy, dw, dh);
    // 아래띠
    x.textAlign = "center"; x.textBaseline = "middle";
    if (i < N - 1) {
      const t = split ? "다음 장에 이어져요  →" : "다음 장  →"; x.font = `700 24px ${font}`; const tw = x.measureText(t).width + 44;
      x.fillStyle = "rgba(255,195,209,.16)"; roundRect(x, (W - tw) / 2, H - footH / 2 - 22, tw, 44, 22); x.fill();
      x.fillStyle = "#ffd9c2"; x.fillText(t, W / 2, H - footH / 2);
    } else {
      x.fillStyle = "rgba(255,235,242,.55)"; x.font = `600 22px ${font}`;
      x.fillText("재미와 자기 이해를 위한 참고용 풀이예요", W / 2, H - footH / 2);
    }
    out.push(await new Promise((r) => c.toBlob(r, "image/png")));
  }
  return out;
}
export async function exportNodeAsImage(node, filename = "haemyo-report.png") { downloadBlob(await nodeToPngBlob(node), filename); }
export async function exportNodeAsPdf(node, filename = "haemyo-report.pdf") { downloadBlob(await nodeToPdfBlob(node), filename); }

/* 파일 건네기 — 폰은 공유 시트(사진·파일에 저장), PC는 바로 다운로드 */
async function deliver(blob, filename, mime) {
  const touch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  try {
    const file = new File([blob], filename, { type: mime });
    if (touch && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: filename });
      return "shared";
    }
  } catch (e) { if (e && e.name === "AbortError") return "cancel"; }
  try { downloadBlob(blob, filename); return "download"; } catch { return "fail"; }
}

async function deliverMany(blobs, names) {
  if (blobs.length === 1) return deliver(blobs[0], names[0], "image/png");
  const touch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  try {
    const files = blobs.map((b, i) => new File([b], names[i], { type: "image/png" }));
    if (touch && navigator.canShare && navigator.canShare({ files })) { await navigator.share({ files, title: names[0] }); return "shared"; }
  } catch (e) { if (e && e.name === "AbortError") return "cancel"; }
  try { for (let i = 0; i < blobs.length; i++) { downloadBlob(blobs[i], names[i]); await new Promise((r) => setTimeout(r, 350)); } return "download"; } catch { return "fail"; }
}


/* =========================================================
   인스타 스토리용 (9:16 · 1080×1920) 한 장 요약 — HAE
   결과 화면에서 제목 · 핵심 한 문장 · 소제목별 첫 문장 4개를 뽑아 그림
   ========================================================= */
const SW = 1080, SH = 1920;
const FONT = "'Pretendard Variable', 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
const firstSentence = (t, max = 70) => {
  const c = String(t || "").replace(/\s+/g, " ").trim();
  const m = c.match(/^.{8,}?[.!?。…](?=\s|$)|^.{8,}?(?:요|다|죠|네요)(?=[.!\s]|$)/);
  let o = (m ? m[0] : c).trim();
  if (o.length > max) o = o.slice(0, max - 1).trim() + "…";
  return o;
};
function storyData(node, fallbackTitle) {
  const title = ((node.querySelector(".xp-title") || {}).textContent || fallbackTitle || "해묘 리포트").trim();
  const meta = ((node.querySelector(".xp-meta") || {}).textContent || "").trim();
  const body = node.querySelector(".xp-body") || node;
  const tt = title.replace(/\s+/g, "");
  const okText = (t) => t && t.length >= 12 && !/참고용|재미로|코인|로그인|저장|공유/.test(t);
  // 큰 숫자(점수 · 퍼센트 · D-day)
  let stat = "";
  const cd = body.querySelector(".lf-cd b"); // 카운트다운 시계 → 'N일'
  if (cd) { const u = cd.parentElement.querySelector("small"); stat = `${cd.textContent.trim()}${u ? u.textContent.trim() : ""}`; }
  if (!stat) for (const e of body.querySelectorAll("b, strong, .sp-big, [class*='score'], [class*='num'], [class*='big']")) {
    const t = (e.textContent || "").replace(/\s+/g, " ").trim();
    if (/^(D-?\d{1,3}|\d{1,3}(\.\d)?\s*(점|%|일|개월|년)|[★☆]{3,5})$/.test(t)) { stat = t; break; }
  }
  // 핵심 한 문장: 인용 · 금빛 상자 · 첫 문단
  let lead = "";
  const sentence = (t) => /(요|다|죠|니다|[.!?…])\)?$/.test(t) || /—/.test(t) || /\d+일/.test(t);
  for (const e of body.querySelectorAll(".insight, .sp-hero p:not(.eyebrow), .panel-gold p:not(.eyebrow), .xp-brief p, p:not(.eyebrow)")) {
    if (e.classList.contains("tiny")) continue;
    const t = (e.textContent || "").replace(/\s+/g, " ").replace(/[“”]/g, "").trim();
    if (okText(t) && sentence(t) && t.replace(/\s+/g, "") !== tt) { lead = firstSentence(t, 88); break; }
  }
  // 소제목 + 그 아래 첫 문장
  const heads = [...body.querySelectorAll("h2, h3, h4, summary, .eyebrow, .sp-card > .eyebrow")];
  const pts = [], seen = new Set([lead]);
  for (const h of heads) {
    const ht = (h.textContent || "").replace(/\s+/g, " ").replace(/^[\s→—–·\-]+/, "").trim();
    if (ht.length < 2 || ht.length > 30 || ht.replace(/\s+/g, "") === tt || seen.has(ht)) continue;
    let txt = "";
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_ELEMENT);
    walker.currentNode = h;
    let n, steps = 0;
    while ((n = walker.nextNode()) && steps++ < 60) {
      if (heads.includes(n)) break;
      if (!/^(P|LI|BLOCKQUOTE|DD)$/.test(n.tagName)) continue;
      const t = (n.textContent || "").replace(/\s+/g, " ").trim();
      if (okText(t)) { txt = firstSentence(t, 66); break; }
    }
    if (!txt || seen.has(txt)) continue;
    seen.add(ht); seen.add(txt);
    pts.push({ h: ht, t: txt });
    if (pts.length >= 4) break;
  }
  return { title, meta, stat, lead, pts };
}
function clampLines(ctx, text, maxW, maxN) {
  const lines = wrapLines(ctx, text, maxW);
  if (lines.length <= maxN) return lines;
  const out = lines.slice(0, maxN);
  let last = out[maxN - 1];
  while (last.length > 1 && ctx.measureText(last + "…").width > maxW) last = last.slice(0, -1);
  out[maxN - 1] = last.trim() + "…";
  return out;
}
export async function renderStory(data) {
  try { await document.fonts.ready; } catch { /* ignore */ }
  const c = document.createElement("canvas"); c.width = SW; c.height = SH;
  const ctx = c.getContext("2d");
  // 배경
  const g = ctx.createLinearGradient(0, 0, SW * 0.4, SH);
  g.addColorStop(0, "#3a1838"); g.addColorStop(0.55, "#24112a"); g.addColorStop(1, "#140a18");
  ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
  const glow = (x, y, r, col) => { const rg = ctx.createRadialGradient(x, y, 10, x, y, r); rg.addColorStop(0, col); rg.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = rg; ctx.fillRect(0, 0, SW, SH); };
  glow(SW * 0.85, 260, 820, "rgba(255,150,195,0.30)");
  glow(SW * 0.1, SH * 0.82, 760, "rgba(190,140,230,0.22)");
  glow(SW * 0.6, SH * 0.5, 600, "rgba(255,196,166,0.08)");
  ctx.fillStyle = "rgba(255,235,245,0.8)";
  [[120, 210, 3], [960, 170, 2], [880, 420, 2], [70, 760, 2], [1010, 980, 3], [150, 1380, 2], [990, 1560, 2], [540, 120, 2]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); });
  const padX = 96, maxW = SW - padX * 2;
  // ---- 내용 배치 (먼저 높이를 재고 가운데 정렬) ----
  const ops = []; let y = 0;
  const push = (h, draw) => { const yy = y; ops.push((oy) => draw(oy + yy)); y += h; };
  ctx.font = `600 30px ${FONT}`;
  if (data.meta) push(64, (yy) => { ctx.fillStyle = "#f2b8d4"; ctx.font = `600 30px ${FONT}`; ctx.fillText(data.meta, padX, yy + 30); });
  ctx.font = `800 84px ${FONT}`;
  const tl = clampLines(ctx, data.title, maxW, 3);
  push(tl.length * 102 + 18, (yy) => { ctx.fillStyle = "#fff4f8"; ctx.font = `800 84px ${FONT}`; tl.forEach((l, i) => ctx.fillText(l, padX, yy + 84 + i * 102)); });
  if (data.stat) push(170, (yy) => {
    ctx.font = `800 120px ${FONT}`; const gg = ctx.createLinearGradient(padX, yy, padX + 500, yy + 120); gg.addColorStop(0, "#ffd6e2"); gg.addColorStop(1, "#ffc39a");
    ctx.fillStyle = gg; ctx.fillText(data.stat, padX, yy + 128);
  });
  if (data.lead) {
    ctx.font = `600 42px ${FONT}`;
    const ll = clampLines(ctx, data.lead, maxW - 96, 4), h = ll.length * 62 + 92;
    y += 24;
    push(h + 40, (yy) => {
      ctx.fillStyle = "rgba(255,255,255,0.09)"; roundRect(ctx, padX, yy, maxW, h, 36); ctx.fill();
      ctx.strokeStyle = "rgba(255,190,214,0.45)"; ctx.lineWidth = 2; roundRect(ctx, padX, yy, maxW, h, 36); ctx.stroke();
      ctx.fillStyle = "#ffb3cf"; ctx.font = `800 70px Georgia, serif`; ctx.fillText("“", padX + 34, yy + 78);
      const ty = yy + (h - ll.length * 62) / 2 + 44;
      ctx.fillStyle = "#fff1f6"; ctx.font = `600 42px ${FONT}`; ll.forEach((l, i) => ctx.fillText(l, padX + 64, ty + i * 62));
    });
  }
  data.pts.forEach((pt, i) => {
    ctx.font = `400 34px ${FONT}`;
    const tl2 = clampLines(ctx, pt.t, maxW - 96, 2), h = 56 + tl2.length * 48 + 30;
    if (y + h > 1220) return;
    push(h, (yy) => {
      ctx.fillStyle = "rgba(255,190,214,0.9)"; ctx.beginPath(); ctx.arc(padX + 26, yy + 30, 26, 0, 7); ctx.fill();
      ctx.fillStyle = "#4a1f38"; ctx.font = `800 28px ${FONT}`; ctx.textAlign = "center"; ctx.fillText(String(i + 1), padX + 26, yy + 40); ctx.textAlign = "left";
      ctx.fillStyle = "#ffd9c2"; ctx.font = `800 38px ${FONT}`; ctx.fillText(clampLines(ctx, pt.h, maxW - 96, 1)[0], padX + 80, yy + 44);
      ctx.fillStyle = "#f3dde8"; ctx.font = `400 34px ${FONT}`; tl2.forEach((l, k) => ctx.fillText(l, padX + 80, yy + 98 + k * 48));
    });
  });
  // 인스타 위 · 아래 가림 영역(약 250px)을 피해 가운데에
  const top = 300, bottom = SH - 420, oy = Math.max(top, top + (bottom - top - y) / 2);
  ops.forEach((f) => f(oy));
  // 머리 · 꼬리
  ctx.fillStyle = "#ffc2d8"; ctx.font = `800 36px ${FONT}`; ctx.fillText("☾ 해묘 解猫", padX, 200);
  ctx.fillStyle = "rgba(255,230,240,0.6)"; ctx.font = `500 28px ${FONT}`; ctx.textAlign = "right";
  const d = new Date(); ctx.fillText(`${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`, SW - padX, 200); ctx.textAlign = "left";
  const fy = SH - 360;
  ctx.strokeStyle = "rgba(255,190,214,0.35)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(padX, fy); ctx.lineTo(padX + 140, fy); ctx.stroke();
  ctx.fillStyle = "#fff0f6"; ctx.font = `700 36px ${FONT}`; ctx.fillText("나도 내 풀이 보러 가기 →", padX, fy + 66);
  ctx.fillStyle = "#ffb3cf"; ctx.font = `600 30px ${FONT}`; ctx.fillText((location.host + location.pathname).replace(/\/$/, "").replace(/index\.html$/, ""), padX, fy + 114);
  ctx.fillStyle = "rgba(230,200,220,0.55)"; ctx.font = `400 24px ${FONT}`; ctx.fillText("사주 · 타로 · 운세 · 재미와 자기 이해를 위한 참고용 풀이예요", padX, fy + 160);
  return new Promise((res) => c.toBlob((b) => res(b), "image/png", 0.95));
}

/* 결과 화면 공통 — '저장' 버튼 → 아래에서 올라오는 시트에서 PDF / 이미지 고르기 */
let sheetEl = null;
function openSheet(root, baseName) {
  const mk = (tag, attrs = {}, kids = []) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === "text") e.textContent = v; else if (k === "class") e.className = v; else e.setAttribute(k, v); } kids.forEach((k) => e && k && e.appendChild(k)); return e; };
  if (sheetEl) sheetEl.remove();
  const status = mk("p", { class: "dl-status", "aria-live": "polite" });
  const preview = mk("div", { class: "dl-preview" });
  const close = () => { sheetEl && sheetEl.remove(); sheetEl = null; document.removeEventListener("keydown", onKey); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  const run = async (btn, kind) => {
    if (btn.disabled) return;
    sheet.querySelectorAll(".dl-opt").forEach((b) => { b.disabled = true; });
    preview.textContent = ""; status.className = "dl-status";
    status.textContent = kind === "pdf" ? "PDF 만드는 중… (긴 리포트는 몇 초 걸려요)" : kind === "story" ? "스토리 이미지 만드는 중…" : "이미지 만드는 중…";
    const stamp = new Date(); const ds = `${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, "0")}${String(stamp.getDate()).padStart(2, "0")}`;
    const filename = `${baseName}${kind === "story" ? "-스토리" : ""}-${ds}.${kind === "pdf" ? "pdf" : "png"}`;
    let blob;
    let xp = null;
    try { xp = buildExportSheet(root, baseName, kind === "pdf" ? "pdf" : "img");
      if (xp.empty) { xp.cleanup(); status.className = "dl-status err"; status.textContent = "아직 저장할 결과가 없어요. 풀이를 먼저 열어 본 뒤 눌러 주세요."; sheet.querySelectorAll(".dl-opt").forEach((b) => { b.disabled = false; }); return; }
      xp.node.classList.add("xp-pdf"); if (kind !== "pdf") xp.node.classList.add("xp-img");
      await new Promise((r) => setTimeout(r, 250));
      blob = kind === "pdf" ? await nodeToPdfBlob(xp.node) : kind === "story" ? [await renderStory(storyData(xp.node, baseName))] : await nodeToPngPages(xp.node); }
    catch (e) {
      status.className = "dl-status err";
      status.textContent = String(e && e.message) === "load" ? "저장 도구를 불러오지 못했어요. 잠시 뒤 다시 눌러 주세요." : "이 화면을 파일로 만들지 못했어요. 다시 한 번 눌러 주세요.";
      sheet.querySelectorAll(".dl-opt").forEach((b) => { b.disabled = false; });
      if (xp) xp.cleanup();
      return;
    }
    if (xp) xp.cleanup();
    const pages = kind !== "pdf" ? blob : null;
    const names = pages ? pages.map((_, i) => pages.length > 1 ? filename.replace(/\.png$/, `-${i + 1}.png`) : filename) : null;
    const how = pages ? await deliverMany(pages, names) : await deliver(blob, filename, "application/pdf");
    sheet.querySelectorAll(".dl-opt").forEach((b) => { b.disabled = false; });
    const cnt = pages ? (pages.length > 1 ? ` · 카드 ${pages.length}장` : "") : "";
    status.className = "dl-status ok";
    status.textContent = how === "shared" ? `저장했어요${cnt} ✓` : how === "cancel" ? "저장을 취소했어요." : `다운로드했어요${cnt} ✓`;
    // 다운로드가 막힌 환경(앱 안 브라우저·미리보기 창)에서도 받을 수 있게 — 직접 저장 경로
    if (pages) {
      const gal = mk("div", { class: "dl-gal" });
      pages.forEach((b, i) => { const u = URL.createObjectURL(b); gal.append(mk("a", { class: "dl-pg", href: u, download: names[i], target: "_blank", rel: "noopener" }, [mk("img", { src: u, alt: `저장한 카드 ${i + 1}` })])); });
      preview.append(gal, mk("p", { class: "dl-hint", text: "안 받아졌다면 카드를 눌러 한 장씩 저장할 수 있어요" }));
    } else {
      const url = URL.createObjectURL(blob);
      preview.append(mk("a", { class: "dl-link", href: url, download: filename, target: "_blank", rel: "noopener", text: "PDF 다시 열기" }));
    }
  };
  const pdfBtn = mk("button", { class: "dl-opt pdf", type: "button" }, [mk("span", { class: "dl-opt-ic", text: "📄" }), mk("span", { class: "dl-opt-tx" }, [mk("b", { text: "PDF로 받기" }), mk("span", { text: "A4 · 목차 · 인쇄용" })])]);
  const imgBtn = mk("button", { class: "dl-opt", type: "button" }, [mk("span", { class: "dl-opt-ic", text: "🖼️" }), mk("span", { class: "dl-opt-tx" }, [mk("b", { text: "이미지로 받기" }), mk("span", { text: "한 장 요약 · 사진첩 저장" })])]);
  const stBtn = mk("button", { class: "dl-opt story", type: "button" }, [mk("span", { class: "dl-opt-ic", text: "📱" }), mk("span", { class: "dl-opt-tx" }, [mk("b", { text: "인스타 스토리" }), mk("span", { text: "9:16 · 한 장 요약" })])]);
  stBtn.addEventListener("click", () => run(stBtn, "story"));
  pdfBtn.addEventListener("click", () => run(pdfBtn, "pdf"));
  imgBtn.addEventListener("click", () => run(imgBtn, "img"));
  const x = mk("button", { class: "dl-x", type: "button", "aria-label": "닫기", text: "✕" });
  x.addEventListener("click", close);
  const sheet = mk("div", { class: "dl-card", role: "dialog", "aria-modal": "true", "aria-label": "결과 파일로 저장" }, [
    mk("div", { class: "dl-grab" }),
    mk("div", { class: "dl-head" }, [mk("div", {}, [mk("p", { class: "dl-title", text: "결과 파일로 저장" }), mk("p", { class: "dl-sub", text: "입력 칸·버튼은 빼고 결과만 깔끔하게 담아요" })]), x]),
    mk("div", { class: "dl-opts" }, [pdfBtn, imgBtn, stBtn]), status, preview,
  ]);
  const back = mk("div", { class: "dl-back" });
  back.addEventListener("click", close);
  sheetEl = mk("div", { class: "dl-sheet", "data-nocapture": "" }, [back, sheet]);
  document.body.appendChild(sheetEl);
  document.addEventListener("keydown", onKey);
  pdfBtn.focus({ preventScroll: true });
}

/** '저장' 버튼 — 하단 액션 바가 있는 화면은 바 안에, 없으면 오른쪽 아래 둥근 버튼 */
export function downloadPanel(root, baseName = "해묘-리포트") {
  const fab = document.createElement("button");
  fab.type = "button"; fab.className = "dl-fab"; fab.setAttribute("data-nocapture", ""); fab.setAttribute("aria-label", "결과를 PDF·이미지로 저장");
  fab.innerHTML = '<span class="dl-fab-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg></span><span class="dl-fab-tx">PDF·이미지</span>';
  fab.addEventListener("click", (e) => { e.stopPropagation(); openSheet(root, baseName); });
  return fab;
}
