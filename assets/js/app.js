import { el, $, clear, icon, toast as _toast } from "./utils/dom.js";
import { renderHome } from "./pages/home.js";
import { renderSajuInput } from "./pages/sajuInput.js";
import { renderSajuLoading, renderSajuResult } from "./pages/sajuResult.js";
import { renderTarotQuestion, renderTarotSpread } from "./pages/tarotQuestion.js";
import { renderTarotSelect } from "./pages/tarotSelect.js";
import { renderTarotResult } from "./pages/tarotResult.js";
import { renderCompatInput } from "./pages/compatInput.js";
import { renderCompatResult } from "./pages/compatResult.js";
import { renderZiweiResult } from "./pages/ziweiResult.js";
import { renderOracle } from "./pages/oracle.js";
import { renderPeople, renderRanks } from "./pages/people.js";
import { renderGuiinResult } from "./pages/guiinResult.js";
import { renderStore, renderAdminUsers } from "./pages/store.js";
import { renderFortuneHub, renderTopicReading } from "./pages/fortuneHub.js";
import { renderTojeong } from "./pages/tojeong.js";
import { renderInvite, renderAddFriend } from "./pages/invite.js";
import { renderZodiac, renderStar, renderBiorhythm, renderCharm, renderLuckyCard, renderPull, renderPullPair } from "./pages/extras.js";
import { renderInyeon } from "./pages/inyeon.js";
import { renderExplore, renderThemeReading } from "./pages/explore.js";
import { renderDream } from "./pages/dream.js";
import { renderCalendar } from "./pages/calendar.js";
import { renderGwansang } from "./pages/gwansang.js";
import { renderSaved, renderResultById } from "./pages/saved.js";
import { renderAbout, renderPrivacy, renderNotFound, renderReviews, renderInquiry } from "./pages/about.js";
import { renderProfile } from "./pages/profile.js";
import { renderManse, startHanjaObserver } from "./pages/manseView.js";
import { renderWonguk } from "./pages/wonguk.js";
import { renderStudy } from "./pages/study.js";
import { renderDday, renderPastLife } from "./pages/destiny.js";
import { renderMenu } from "./pages/menu.js";
import { renderPremium } from "./pages/premium.js";
import { renderFreeItem } from "./pages/freeGenre.js";
import { renderRich, renderBizJob, renderMoneyTime } from "./pages/rich.js";
import { renderSal } from "./pages/sinsal2.js";
import { renderLuck12, renderLove10, renderBlueprint, renderSpouseLuck, renderStory } from "./pages/reports2.js";
import { renderDohwa, renderGwimun, renderLoveCount, renderNoMarry, renderChildren, renderManual, renderTimeline, renderCompleteMe, renderFate3, renderIdolCompat, renderSoYukim, renderAstroDice, renderDiary, renderHwagae, renderYeokma, renderReunionDeep, renderLoveFunItem, renderMonthlyReport } from "./pages/special.js";
import { renderPalm, renderNameReading, renderSajuMbti, renderStudyLuck, renderNaming } from "./pages/more.js";
import { renderIching, renderGaeun, renderLuckyNumber, renderSajuToon, renderClassic, renderHealthSaju } from "./pages/fun.js";
import { startTermTips } from "./utils/glossary.js";
import { renderLifespan, renderTojeongPlus, renderTojeongCompat, renderTojeongTheme } from "./pages/tojeong.js";
import { renderCompatPlus } from "./pages/compatPlus.js";
import { getActiveProfile } from "./auth.js";
import { getViewAs, setViewAs } from "./state.js";
import { downloadPanel } from "./utils/shareImage.js";
import { getCoins, isUnlimited, grantDailyLogin, grantMonthly } from "./wallet.js";
import { isCloudEnabled, handleRedirect, pullState, pushState, collectState, clearGuestSlot, loginGoogle, pullResults, takeGifts, checkResetCode, doResetPassword, doApplyCode } from "./cloud.js";
import { ensureProfile, setActive as setActiveProfile, getActiveId as activeIdNow, avatarEl, setProfilePhoto } from "./auth.js";
/* ===== (합침) router.js ===== */
/* 해시 기반 라우터.
   GitHub Pages 정적 배포에서 새로고침 404가 나지 않도록 해시 라우팅을 사용한다.
   경로 예: #/, #/saju, #/saju/result, #/tarot, #/result/:id */

const routes = [];
let notFoundHandler = null;
let currentCleanup = null;

export function route(pattern, handler) {
  // pattern: "/saju/result" 또는 "/result/:id"
  const keys = [];
  const rx = new RegExp(
    "^" +
      pattern
        .replace(/\/+$/, "")
        .replace(/:[^/]+/g, (m) => {
          keys.push(m.slice(1));
          return "([^/]+)";
        })
        .replace(/\//g, "\\/") +
      "\\/?$"
  );
  routes.push({ rx, keys, handler });
}

export function setNotFound(handler) {
  notFoundHandler = handler;
}

export function navigate(path) {
  if (("#" + path) === location.hash) {
    // 동일 경로면 강제 재렌더
    handleRoute();
  } else {
    location.hash = path;
  }
}

function parseHash() {
  let h = location.hash.replace(/^#/, "");
  if (!h) h = "/";
  const [pathPart, queryPart] = h.split("?");
  const path = pathPart.replace(/\/+$/, "") || "/";
  const query = {};
  if (queryPart) {
    new URLSearchParams(queryPart).forEach((v, k) => (query[k] = v));
  }
  return { path, query };
}

async function handleRoute() {
  const { path, query } = parseHash();

  // 이전 페이지 정리 훅
  if (typeof currentCleanup === "function") {
    try { currentCleanup(); } catch { /* ignore */ }
    currentCleanup = null;
  }

  // 게스트(로그인 안 함)는 무료 운세만 — 내 정보를 저장해야 하는 풀이는 로그인 먼저
  if (!isMember() && !GUEST_OK.some((rx) => rx.test(path))) {
    window.scrollTo(0, 0);
    mountLoginWall(path);
    return;
  }

  for (const r of routes) {
    const m = r.rx.exec(path);
    if (m) {
      const params = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      window.scrollTo(0, 0);
      const cleanup = await r.handler({ params, query, path });
      if (typeof cleanup === "function") currentCleanup = cleanup;
      logViewSoon(path);
      return;
    }
  }

  if (notFoundHandler) {
    window.scrollTo(0, 0);
    notFoundHandler({ path });
  }
}

export function startRouter() {
  window.addEventListener("hashchange", handleRoute);
  handleRoute();
}

export function currentPath() {
  return parseHash().path;
}

/* ===== (원래) ===== */
/* 앱 진입점 — 셸(헤더/뷰) 구성 + 라우트 등록 + 라우터 시작 */


const NAV = [
  { path: "/store", label: "충전소" },
  { path: "/saved", label: "보관함" },
  { path: "/about", label: "이용 안내" },
  { path: "/privacy", label: "개인정보" },
];

function buildShell() {
  const app = $("#app");
  clear(app);

  const brandMark = icon("moon");
  brandMark.classList.add("mark");
  const brand = el("a", { class: "brand", href: "#/", "aria-label": "홈으로" }, [
    brandMark,
    el("span", { html: '해묘 <span style="opacity:.6;font-size:.85em;">解猫</span>' }),
  ]);

  // 로그인/프로필 칩
  const loginChip = el("a", { class: "login-chip", href: "#/profile", "data-nav": "/profile", "aria-label": "로그인/프로필" });
  const refreshChip = () => {
    clear(loginChip);
    const p = getActiveProfile();
    loginChip.append(p ? avatarEl(p.id, p.name, { size: 22, google: p.photo || "", cls: "av-chip" }) : icon("moon"), el("span", { text: p ? p.name : "로그인" }));
  };
  refreshChip();
  window.addEventListener("profilechange", refreshChip);

  // 코인 칩 (로그인 옆) — 잔액 표시 + 충전소로
  const coinChip = el("a", { class: "coin-chip", href: "#/store", "data-nav": "/store", "aria-label": "코인 충전소" });
  const refreshCoin = () => { clear(coinChip); coinChip.append(el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: isUnlimited() ? "∞" : String(getCoins()) })); };
  refreshCoin();
  let lastCoin = getCoins();
  window.addEventListener("walletchange", () => {
    refreshCoin();
    const now = getCoins();
    if (now !== lastCoin && !isUnlimited()) { coinChip.classList.remove("bump"); void coinChip.offsetWidth; coinChip.classList.add("bump", now < lastCoin ? "down" : "up"); setTimeout(() => coinChip.classList.remove("bump", "down", "up"), 900); }
    lastCoin = now;
  });
  window.addEventListener("hashchange", refreshCoin);

  // 뒤로 가기 — 홈·탭 첫 화면이 아니면 헤더 왼쪽에 항상 보임(스크롤해도 그대로)
  const backBtn = el("button", { class: "hdr-back", type: "button", "aria-label": "뒤로 가기", hidden: true, onclick: () => goBack() }, [icon("back")]);
  const header = el("header", { class: "app-header" }, [el("div", { class: "header-left" }, [backBtn, brand]), el("div", { class: "header-right" }, [coinChip, loginChip])]);
  // 시점 전환 배너 — 다른 사람 시점으로 보는 중일 때만
  const viewBar = el("div", { class: "viewas-bar", role: "status" });
  const refreshViewBar = () => {
    clear(viewBar);
    // 관리자 열람 중엔 위쪽 노란 띠가 이미 '회원 › 사람 시점'을 보여 줌
    let adm = false; try { adm = !!sessionStorage.getItem("str.adminview.v1"); } catch { /* ignore */ }
    const va = adm ? null : getViewAs();
    viewBar.hidden = !va;
    if (!va) return;
    viewBar.append(
      el("span", { html: `<b>${(va.name || "그 사람").replace(/[<>&]/g, "")}</b> 님 시점으로 보는 중` }),
      el("button", { class: "viewas-back", type: "button", onclick: () => { setViewAs(null); } }, [el("span", { text: "내 시점으로" })]),
    );
  };
  refreshViewBar();
  window.addEventListener("viewaschange", () => { refreshViewBar(); navigate(currentPath() || "/"); });
  const view = el("div", { id: "view" });
  const main = el("main", { id: "main", class: "app-main", tabindex: "-1" }, [view]);

  app.append(header, viewBar, main, buildTabBar());
  try { startHanjaObserver(document.body); } catch { /* 병기 실패해도 앱은 계속 */ }
  try { startTermTips(document.body); } catch { /* 용어 풀이 실패해도 앱은 계속 */ }
  return view;
}

const TABS = [
  { path: "/", label: "홈", icon: "home" },
  { path: "/fortune", label: "운세·타로", icon: "moon", also: ["/tarot", "/oracle", "/calendar", "/free"] },
  { path: "/special", label: "프리미엄", icon: "crown", center: true },
  { path: "/people", label: "내 사람", icon: "heart", also: ["/guiin", "/compat", "/inyeon", "/ranks"] },
  { path: "/profile", label: "마이", icon: "users" },
];
function buildTabBar() {
  return el("nav", { class: "tab-bar", "aria-label": "하단 메뉴" },
    TABS.map((t) => el("a", {
      class: "tab" + (t.center ? " tab-center" : ""), href: "#" + t.path, "data-nav": t.path, "data-also": (t.also || []).join(","), "aria-label": t.label,
    }, [
      el("span", { class: "tab-ic" }, [icon(t.icon)]),
      el("span", { class: "tab-label", text: t.label }),
    ]))
  );
}

let viewEl;

/* 결과 화면마다 'PDF·이미지로 받기' 패널을 붙인다 */
const DOWNLOADABLE = [
  [/^\/saju\/result/, "해묘-사주리포트"], [/^\/tarot\/result/, "해묘-타로"], [/^\/ziwei\/result/, "해묘-자미두수"],
  [/^\/compat\/result/, "해묘-궁합"], [/^\/compat-plus/, "해묘-궁합특집"], [/^\/guiin\/result/, "해묘-귀인"], [/^\/result\//, "해묘-저장결과"],
  [/^\/fortune\/.+/, "해묘-운세"], [/^\/pull\/pair/, "해묘-끌림궁합"], [/^\/pull$/, "해묘-내매력사주"], [/^\/theme\//, "해묘-테마운세"],
  [/^\/inyeon/, "해묘-나의인연"], [/^\/dday/, "해묘-인연디데이"], [/^\/pastlife/, "해묘-전생"], [/^\/iching/, "해묘-주역점"], [/^\/menu/, "해묘-전체메뉴"], [/^\/special/, "해묘-프리미엄"], [/^\/(dohwa|hwagae|yeokma|reunion-deep|gwimun|love-count|no-marry|children|manual|timeline|complete-me|fate3|rich|bizjob|moneytime|idol-compat)/, "해묘-프리미엄"], [/^\/sal\//, "해묘-신살체크"], [/^\/free/, "해묘-무료운세"], [/^\/so-yukim/, "해묘-소육임"], [/^\/astro-dice/, "해묘-점성술다이스"], [/^\/diary/, "해묘-운세일기장"], [/^\/palm/, "해묘-손금"], [/^\/study-luck/, "해묘-공부운"], [/^\/naming/, "해묘-작명"], [/^\/name/, "해묘-이름풀이"], [/^\/saju-mbti/, "해묘-사주MBTI"], [/^\/(gaeun|bujeok)/, "해묘-풍수개운"], [/^\/luckynumber/, "해묘-행운번호"], [/^\/sajutoon/, "해묘-사주툰"], [/^\/classic/, "해묘-명심보감"], [/^\/health-saju/, "해묘-건강운"], [/^\/tojeong-plus/, "해묘-토정월별일별"], [/^\/tojeong-compat/, "해묘-토정궁합"], [/^\/tojeong-theme/, "해묘-토정테마"], [/^\/tojeong/, "해묘-토정비결"], [/^\/charm/, "해묘-매력지수"],
  [/^\/love-fun\//, "해묘-연애사주"], [/^\/monthly/, "해묘-이달의흐름"],
  [/^\/zodiac/, "해묘-띠운세"], [/^\/star/, "해묘-별자리"], [/^\/biorhythm/, "해묘-바이오리듬"],
  [/^\/luckycard/, "해묘-행운카드"], [/^\/gwansang/, "해묘-관상"], [/^\/dream/, "해묘-꿈해몽"],
  [/^\/oracle/, "해묘-물어보기"], [/^\/calendar/, "해묘-운세캘린더"], [/^\/manse/, "해묘-만세력"], [/^\/wonguk/, "해묘-사주원국"],
];
/* ---- 앱 안 이동 기록 — '뒤로 가기'가 실제로 왔던 화면으로 돌아가게 ---- */
const ROOTS = ["/", "/fortune", "/special", "/people", "/profile"];
const NAV_NAME = { "/": "홈", "/fortune": "운세·타로", "/special": "프리미엄", "/people": "내 사람", "/profile": "마이", "/menu": "전체 메뉴", "/tarot": "타로", "/store": "충전소" };
const navHist = []; // [{ path, title }]
function trackNav(path) {
  if (/\/loading$/.test(path)) return; // 로딩 화면은 기록하지 않음 (뒤로 가면 다시 로딩되는 문제 방지)
  const n = navHist.length;
  if (n >= 2 && navHist[n - 2].path === path) navHist.pop();      // 뒤로 온 경우
  else if (!n || navHist[n - 1].path !== path) navHist.push({ path, title: NAV_NAME[path] || "" });
  if (navHist.length > 50) navHist.splice(0, navHist.length - 50);
}
function parentOf(path) {
  if (path.startsWith("/fortune/") || ["/tarot", "/oracle", "/iching", "/so-yukim", "/astro-dice", "/dream", "/tojeong", "/calendar"].some((x) => path.startsWith(x))) return "/fortune";
  if (["/compat", "/guiin", "/inyeon", "/invite", "/addfriend"].some((x) => path.startsWith(x))) return "/people";
  if (["/store", "/saved", "/about", "/privacy", "/reviews", "/inquiry"].some((x) => path.startsWith(x))) return "/profile";
  return "/";
}
function prevEntry() { return navHist.length >= 2 ? navHist[navHist.length - 2] : null; }
function goBack(fallback) {
  const e = prevEntry();
  if (e) { navHist.pop(); navigate(e.path); }
  else { const bl = document.querySelector("#view .back-link"); navigate(fallback || (bl && bl.dataset.to) || parentOf(currentPath())); }
}
// 화면을 그리는 중(아직 기록 전)에도 '이 화면의 이전 화면'을 알려 줌
function prevFor(cur) {
  const n = navHist.length;
  let e = null;
  if (n >= 2 && navHist[n - 2].path === cur) e = navHist[n - 3] || null;
  else if (n && navHist[n - 1].path === cur) e = navHist[n - 2] || null;
  else e = navHist[n - 1] || null;
  return e ? { path: e.path, title: e.title } : null;
}
window.__haeNav = { prev: () => prevFor(currentPath()), back: goBack };
function refreshBack() {
  const b = document.querySelector(".hdr-back"); if (!b) return;
  const p = currentPath();
  b.hidden = ROOTS.includes(p) && !prevEntry();
  if (p === "/") b.hidden = true;
  const e = prevEntry();
  b.setAttribute("aria-label", e && e.title ? `${e.title}(으)로 돌아가기` : "뒤로 가기");
}

let mountObs = null;
function mount(node, opts = {}) {
  clear(viewEl);
  const dl = DOWNLOADABLE.find(([rx]) => rx.test(currentPath()));
  if (mountObs) { mountObs.disconnect(); mountObs = null; }
  viewEl.appendChild(node);
  if (dl) {
    // 저장 버튼 — 하단 액션 바가 있으면 바 안에(겹침 없음), 없으면 오른쪽 아래
    const fab = downloadPanel(node, dl[1]);
    const place = () => {
      const bar = node.querySelector(".action-bar");
      if (bar) { if (fab.parentNode !== bar) { fab.classList.remove("float"); fab.classList.add("in-bar"); bar.appendChild(fab); } return true; }
      if (!fab.parentNode) { fab.classList.add("float"); node.appendChild(fab); }
      return false;
    };
    if (!place()) { mountObs = new MutationObserver(() => { if (place()) { mountObs.disconnect(); mountObs = null; } }); mountObs.observe(node, { childList: true, subtree: true }); }
  }
  highlightNav();
  trackNav(currentPath());
  { const h1 = node.querySelector("h1"); const cur = navHist[navHist.length - 1]; if (cur && !NAV_NAME[cur.path] && h1) cur.title = h1.textContent.trim().replace(/\s+/g, " ").slice(0, 12); }
  refreshBack();
  // 포커스 관리(접근성): 새 화면 진입 시 제목으로 포커스
  const h = node.querySelector("h1");
  if (h && !opts.noFocus) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  updateToTop();
}

function highlightNav() {
  const p = currentPath();
  $("#app").querySelectorAll("[data-nav]").forEach((a) => {
    const path = a.getAttribute("data-nav");
    const also = (a.getAttribute("data-also") || "").split(",").filter(Boolean);
    const on = path === "/" ? (p === "/" || p === "") : (p.startsWith(path) || also.some((x) => p.startsWith(x)));
    a.classList.toggle("is-current", on);
    if (on) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

/* ---- Back-to-top 버튼 ---- */
let toTopBtn;
function setupToTop() {
  toTopBtn = el("button", {
    class: "to-top", type: "button", "aria-label": "맨 위로 이동",
    onclick: () => window.scrollTo({ top: 0, behavior: "smooth" }),
  }, [icon("arrowUp")]);
  document.body.appendChild(toTopBtn);
  window.addEventListener("scroll", updateToTop, { passive: true });
}
function updateToTop() {
  if (!toTopBtn) return;
  toTopBtn.classList.toggle("show", window.scrollY > 400);
}

/* ---- 라우트 정의 ---- */
function registerRoutes() {
  route("/", () => mount(renderHome({ navigate })));
  route("/saju", () => mount(renderSajuInput({ navigate })));
  route("/saju/loading", () => renderSajuLoading({ navigate, mount }));
  route("/saju/result", () => mount(renderSajuResult({ navigate })));
  route("/tarot", () => mount(renderTarotQuestion({ navigate })));
  route("/tarot/spread", () => mount(renderTarotSpread({ navigate })));
  route("/tarot/select", () => mount(renderTarotSelect({ navigate })));
  route("/tarot/result", () => mount(renderTarotResult({ navigate })));
  route("/oracle", () => mount(renderOracle({ navigate })));
  route("/tojeong", () => mount(renderTojeong({ navigate })));
  route("/tojeong-plus", () => mount(renderTojeongPlus({ navigate })));
  route("/tojeong-compat", () => mount(renderTojeongCompat({ navigate })));
  route("/tojeong-theme/:id", ({ params }) => mount(renderTojeongTheme({ navigate, id: params.id })));
  route("/gwansang", () => mount(renderGwansang({ navigate })));
  route("/zodiac", () => mount(renderZodiac({ navigate })));
  route("/star", () => mount(renderStar({ navigate })));
  route("/biorhythm", () => mount(renderBiorhythm({ navigate })));
  route("/dream", () => mount(renderDream({ navigate })));
  route("/charm", () => mount(renderCharm({ navigate })));
  route("/pull", () => mount(renderPull({ navigate })));
  route("/pull/pair", () => mount(renderPullPair({ navigate })));
  route("/luckycard", () => mount(renderLuckyCard({ navigate })));
  route("/inyeon", () => mount(renderInyeon({ navigate })));
  route("/explore", () => mount(renderPremium({ navigate }))); // 테마 운세 → 프리미엄으로 통합
  route("/theme/:id", ({ params }) => mount(renderThemeReading({ navigate, id: params.id })));
  route("/manse", () => mount(renderManse({ navigate })));
  route("/wonguk", () => mount(renderWonguk({ navigate })));
  route("/study", () => mount(renderStudy({ navigate })));
  route("/lifespan", () => mount(renderLifespan({ navigate })));
  route("/dday", () => mount(renderDday({ navigate })));
  route("/dday/:kind", ({ params }) => mount(renderDday({ navigate, kind: params.kind })));
  route("/dday/:kind/:method", ({ params }) => mount(renderDday({ navigate, kind: params.kind, method: params.method })));
  route("/pastlife", () => mount(renderPastLife({ navigate })));
  route("/menu", () => mount(renderMenu({ navigate })));
  route("/special", () => mount(renderPremium({ navigate })));
  route("/dohwa", () => mount(renderDohwa({ navigate })));
  route("/hwagae", () => mount(renderHwagae({ navigate })));
  route("/yeokma", () => mount(renderYeokma({ navigate })));
  route("/reunion-deep", () => mount(renderReunionDeep({ navigate })));
  route("/gwimun", () => mount(renderGwimun({ navigate })));
  route("/love-count", () => mount(renderLoveCount({ navigate })));
  route("/love-fun", () => mount(renderPremium({ navigate }))); // 예전 주소 → 프리미엄 안으로 합침
  route("/love-fun/:id", ({ params }) => mount(renderLoveFunItem({ navigate, id: params.id })));
  route("/monthly", () => mount(renderMonthlyReport({ navigate })));
  route("/no-marry", () => mount(renderNoMarry({ navigate })));
  route("/children", () => mount(renderChildren({ navigate })));
  route("/manual", () => mount(renderManual({ navigate })));
  route("/timeline", () => mount(renderTimeline({ navigate })));
  route("/complete-me", () => mount(renderCompleteMe({ navigate })));
  route("/fate3", () => mount(renderFate3({ navigate })));
  route("/rich", () => mount(renderRich({ navigate })));
  route("/bizjob", () => mount(renderBizJob({ navigate })));
  route("/moneytime", () => mount(renderMoneyTime({ navigate })));
  route("/luck12", () => mount(renderLuck12({ navigate })));
  route("/sal/:id", ({ params }) => mount(renderSal({ navigate, id: params.id })));
  route("/love10", () => mount(renderLove10({ navigate })));
  route("/blueprint", () => mount(renderBlueprint({ navigate })));
  route("/spouseluck", () => mount(renderSpouseLuck({ navigate })));
  route("/story", () => mount(renderStory({ navigate })));
  route("/free", () => mount(renderFortuneHub({ navigate }))); // 장르별 무료 운세 → 운세·타로 '어떤 점술로 볼까?'에 합침
  route("/free/:id", ({ params }) => mount(renderFreeItem({ navigate, id: params.id })));
  route("/idol-compat", () => mount(renderIdolCompat({ navigate })));
  route("/so-yukim", () => mount(renderSoYukim({ navigate })));
  route("/astro-dice", () => mount(renderAstroDice({ navigate })));
  route("/diary", () => mount(renderDiary({ navigate })));
  route("/study-luck", () => mount(renderStudyLuck({ navigate })));
  route("/palm", () => mount(renderPalm({ navigate })));
  route("/name", () => mount(renderNameReading({ navigate })));
  route("/name/:tab", ({ params }) => mount(renderNameReading({ navigate, tab: params.tab })));
  route("/naming", () => mount(renderNaming({ navigate })));
  route("/saju-mbti", () => mount(renderSajuMbti({ navigate })));
  route("/iching", () => mount(renderIching({ navigate })));
  route("/gaeun", () => mount(renderGaeun({ navigate })));
  route("/bujeok", () => mount(renderGaeun({ navigate, tab: "bujeok" })));
  route("/luckynumber", () => mount(renderLuckyNumber({ navigate })));
  route("/sajutoon", () => mount(renderSajuToon({ navigate })));
  route("/classic", () => mount(renderClassic({ navigate })));
  route("/health-saju", () => mount(renderHealthSaju({ navigate })));
  route("/study/:id", ({ params }) => mount(renderStudy({ navigate, id: params.id })));
  route("/calendar", () => mount(renderCalendar({ navigate })));
  route("/fortune", () => mount(renderFortuneHub({ navigate })));
  route("/fortune/:method/:id", ({ params }) => mount(renderTopicReading({ navigate, method: params.method, id: params.id })));
  route("/fortune/:id", ({ params }) => mount(renderTopicReading({ navigate, method: "saju", id: params.id })));
  route("/admin-users", () => mount(renderAdminUsers({ navigate })));
  route("/store", () => mount(renderStore({ navigate })));
  route("/premium", () => mount(renderStore({ navigate }))); // 이전 경로 호환
  route("/people", () => mount(renderPeople({ navigate })));
  route("/compat-plus", () => mount(renderCompatPlus({ navigate })));
  route("/ranks", () => mount(renderRanks({ navigate })));
  route("/invite", () => mount(renderInvite({ navigate })));
  route("/invite/:data", ({ params }) => mount(renderInvite({ navigate, data: params.data })));
  route("/addfriend/:data", ({ params }) => mount(renderAddFriend({ navigate, data: params.data })));
  route("/guiin/result", () => mount(renderGuiinResult({ navigate })));
  route("/compat", () => mount(renderCompatInput({ navigate })));
  route("/compat/result", () => mount(renderCompatResult({ navigate })));
  route("/ziwei", () => mount(renderSajuInput({ navigate, mode: "ziwei" })));
  route("/ziwei/result", () => mount(renderZiweiResult({ navigate })));
  route("/saved", () => mount(renderSaved({ navigate })));
  route("/about", () => mount(renderAbout({ navigate })));
  route("/privacy", () => mount(renderPrivacy({ navigate })));
  route("/profile", () => mount(renderProfile({ navigate })));
  route("/reviews", () => mount(renderReviews({ navigate })));
  route("/inquiry", () => mount(renderInquiry({ navigate })));
  route("/result/:id", ({ params }) => mount(renderResultById({ navigate, id: params.id })));
  setNotFound(() => mount(renderNotFound({ navigate })));
}


/* =========================================================
   게스트 모드 (HAE) — 로그인 전엔 무료 운세만, 사주·궁합 등은 로그인 후
   ========================================================= */
const GUEST_OK = [
  /^\/$/, /^\/free$/, /^\/free\/[^/]+$/, /^\/tarot(\/.*)?$/, /^\/oracle$/, /^\/dream$/, /^\/iching$/, /^\/palm$/,
  /^\/explore$/, /^\/theme\/[^/]+$/, /^\/menu$/, /^\/about$/, /^\/privacy$/, /^\/profile$/, /^\/reviews$/, /^\/inquiry$/,
  /^\/store$/, /^\/premium$/, /^\/special$/, /^\/fortune$/, /^\/classic$/, /^\/luckycard$/, /^\/astro-dice$/, /^\/so-yukim$/,
];
export function isMember() {
  if (!isCloudEnabled()) return true;                       // 클라우드 설정 전(로컬 모드)엔 제한 없음
  try { if (localStorage.getItem("str.devnogate.v1")) return true; } catch { /* ignore */ }
  const id = activeIdNow();
  return !!(id && id.startsWith("cloud_"));
}
function mountLoginWall(path) {
  try { sessionStorage.setItem("str.afterlogin", path); } catch { /* ignore */ }
  const busyG = el("button", { type: "button", class: "btn au-google btn-block", onclick: async () => {
    busyG.disabled = true; const r = await loginGoogle(); busyG.disabled = false;
    if (r.error) { _toast(r.error); return; }
    const u = r.user, pid = "cloud_" + u.uid;
    ensureProfile(pid, u.user_metadata.name || (u.email || "").split("@")[0] || (u.anonymous ? "게스트" : "내 계정")); setActiveProfile(pid);
    await pullState(pid);
    try { const pulled = await pullResults(); if (pulled.length) { const { importBackup } = await import("./state.js"); pulled.forEach((x) => { x.profileId = pid; }); importBackup({ app: "saju-tarot-report", version: 1, results: pulled }, "merge"); } } catch { /* ignore */ }
    window.dispatchEvent(new Event("profilechange")); _toast("로그인했어요!");
    try { sessionStorage.removeItem("str.afterlogin"); } catch { /* ignore */ }
    handleRoute();
  } }, [el("span", { class: "au-g", "aria-hidden": "true", html: '<svg viewBox="0 0 48 48" width="18" height="18"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.2 0-11.5-4.1-13.4-9.8l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>' }), el("span", { text: "Google로 계속하기" })]);
  const free = [["🃏", "타로", "/tarot"], ["🎁", "무료 운세", "/fortune"], ["🌙", "꿈해몽", "/dream"], ["☯", "주역점", "/iching"]];
  mount(el("section", { class: "wrap lw" }, [
    el("div", { class: "panel au lw-card" }, [
      el("div", { class: "au-head" }, [el("span", { class: "au-moon", "aria-hidden": "true", text: "☾" }), el("div", {}, [
        el("h2", { class: "serif lw-h", text: "로그인하고 볼 수 있어요" }),
        el("p", { class: "muted tiny", text: "사주·궁합·토정비결처럼 생년월일을 저장해 두고 보는 풀이는 로그인이 필요해요. 한 번 로그인하면 폰·PC 어디서든 내 정보가 그대로 이어져요." }),
      ])]),
      busyG,
      (() => { const b = el("button", { type: "button", class: "btn btn-ghost btn-block au-guest" }, [el("span", { text: "👤 게스트로 시작하기" }), el("small", { text: "가입 없이 바로" })]);
        b.addEventListener("click", async () => {
          b.disabled = true; const { loginGuest } = await import("./cloud.js"); const r = await loginGuest(); b.disabled = false;
          if (r.error) { _toast(r.error); return; }
          const pid = "cloud_" + r.user.uid; ensureProfile(pid, "게스트"); setActiveProfile(pid); await pullState(pid);
          window.dispatchEvent(new Event("profilechange")); _toast("게스트로 시작했어요 · 마이에서 Google을 연결하면 계정을 지킬 수 있어요");
          try { sessionStorage.removeItem("str.afterlogin"); } catch { /* ignore */ }
          handleRoute();
        }); return b; })(),
      el("button", { type: "button", class: "btn btn-primary btn-block", onclick: () => navigate("/profile") }, [el("span", { text: "이메일로 로그인 · 회원가입" })]),
      el("p", { class: "tiny muted", style: "text-align:center;", text: "처음 가입하면 축하 코인 +5 🎁" }),
    ]),
    el("div", { class: "panel lw-free" }, [
      el("p", { class: "eyebrow", text: "로그인 없이 바로 보는 무료 운세" }),
      el("div", { class: "lw-grid" }, free.map(([em, t, to]) => el("button", { type: "button", class: "lw-b", onclick: () => navigate(to) }, [el("span", { class: "lw-em", text: em }), el("b", { text: t })]))),
    ]),
  ]));
}


/* 메일 링크(비밀번호 재설정·이메일 인증)로 들어왔을 때 — 앱 안에서 처리 */
async function mailActionIfAny() {
  let q; try { q = new URLSearchParams(location.search); } catch { return; }
  const mode = q.get("mode"), code = q.get("oobCode");
  if (!mode || !code) return;
  const clean = () => { try { history.replaceState({}, "", location.pathname + "#/profile"); } catch { /* ignore */ } };
  const box = el("div", { class: "panel au" });
  mount(el("section", { class: "wrap lw" }, [box]));
  const head = (t, d) => el("div", { class: "au-head" }, [el("span", { class: "au-moon", "aria-hidden": "true", text: "☾" }), el("div", {}, [el("h2", { class: "serif lw-h", text: t }), el("p", { class: "muted tiny", text: d })])]);
  if (mode === "resetPassword") {
    box.append(head("새 비밀번호 정하기", "링크를 확인하는 중이에요…"));
    const r = await checkResetCode(code);
    clear(box);
    if (r.error) { box.append(head("링크를 쓸 수 없어요", r.error), el("button", { class: "btn btn-primary btn-block", onclick: () => { clean(); navigate("/profile"); handleRoute(); } }, [el("span", { text: "로그인 화면으로" })])); return; }
    const p1 = el("input", { class: "input", type: "password", placeholder: "새 비밀번호 (6자 이상)", autocomplete: "new-password" });
    const p2 = el("input", { class: "input", type: "password", placeholder: "새 비밀번호 한 번 더", autocomplete: "new-password" });
    const msg = el("p", { class: "field-error", "aria-live": "polite" });
    const btn = el("button", { type: "submit", class: "btn btn-primary btn-block" }, [el("span", { text: "비밀번호 바꾸기" })]);
    const form = el("form", { class: "au-form", onsubmit: async (e) => {
      e.preventDefault(); msg.textContent = "";
      if (p1.value.length < 6) { msg.textContent = "비밀번호는 6자 이상으로 해 주세요."; return; }
      if (p1.value !== p2.value) { msg.textContent = "두 비밀번호가 달라요."; return; }
      btn.disabled = true; const rr = await doResetPassword(code, p1.value); btn.disabled = false;
      if (rr.error) { msg.textContent = rr.error; return; }
      clean(); _toast("비밀번호를 바꿨어요. 새 비밀번호로 로그인해 주세요."); navigate("/profile"); handleRoute();
    } }, [p1, p2, msg, btn]);
    box.append(head("새 비밀번호 정하기", `${r.email} 계정의 새 비밀번호를 정해 주세요.`), form);
    return;
  }
  if (mode === "verifyEmail") {
    const r = await doApplyCode(code);
    clean(); _toast(r.error || "이메일 인증이 끝났어요 ✓"); navigate("/profile"); handleRoute(); return;
  }
  clean(); handleRoute();
}


/* 풀이 화면을 본 기록 (무료 풀이 포함) — 메뉴·목록 화면은 빼고 */
const VIEW_SKIP = /^\/(|menu|profile|store|premium|special|fortune|explore|about|privacy|people|saved|reviews|inquiry|admin-users|free|invite.*|addfriend.*|saju|saju\/loading|compat|tarot|tarot\/spread|tarot\/select|ziwei|theme\/.*|study)$/;
const PAIR_PATHS = /^\/(compat-plus|compat\/result|pull\/pair)$/; // 두 사람 화면은 '누구와'를 붙여 따로 기록 (notePair)
const LOADING_TXT = /준비하고 있어요|불러오는 중|계산하는 중|잠시만/;
function logViewSoon(path, tries = 0) {
  if (VIEW_SKIP.test(path) || PAIR_PATHS.test(path)) return;
  setTimeout(async () => {
    try {
      if ((location.hash || "").replace(/^#/, "").split("?")[0] !== path) return; // 그새 다른 화면으로 갔으면 기록 안 함
      const h = viewEl && viewEl.querySelector("h1"), eb = viewEl && viewEl.querySelector(".page-header .eyebrow, .eyebrow");
      const dt = /^해묘-/.test(document.title || "") ? document.title.slice(3).trim() : "";
      const head = dt || (eb ? eb.textContent.trim() : "");
      const sub = h ? h.textContent.trim() : "";
      if (LOADING_TXT.test(head + sub)) { if (tries < 4) logViewSoon(path, tries + 1); return; } // 아직 로딩 화면이면 조금 뒤 다시
      const title = ([head, sub].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).join(" · ") || path).slice(0, 50);
      const { logOpen } = await import("./wallet.js");
      logOpen({ id: "view:" + path, c: 0, via: "view", title });
    } catch { /* ignore */ }
  }, tries ? 1500 : 500);
}

/* 관리자 선물 받기 — 로그인한 계정 앞으로 온 코인 선물을 코인에 더하고 알려 줌 */
let _giftBusy = false;
async function receiveGifts() {
  const pid = activeIdNow(); if (_giftBusy || !pid || !pid.startsWith("cloud_")) return;
  _giftBusy = true;
  try {
    const gifts = await takeGifts();
    if (gifts.length) {
      const { grantOnce } = await import("./wallet.js");
      let total = 0; const memos = [];
      gifts.forEach((g) => { const r = grantOnce("gift:" + g.id, g.coins, { kind: "gift" }); if (r.ok) { total += g.coins; if (g.memo) memos.push(g.memo); } });
      if (total) {
        await pushState(pid);
        window.dispatchEvent(new CustomEvent("walletchange"));
        showGiftPop(total, memos);
      }
    }
  } catch { /* ignore */ }
  _giftBusy = false;
}
function showGiftPop(total, memos) {
  const ov = el("div", { class: "popup-ov", onclick: (e) => { if (e.target === ov) ov.remove(); } }, [
    el("div", { class: "popup-card" }, [
      el("div", { class: "popup-sun", "aria-hidden": "true", text: "🎁" }),
      el("p", { class: "serif", style: "font-size:1.35rem; font-weight:700; line-height:1.4;", text: `해묘가 코인 ${total}개를 선물했어요!` }),
      memos.length ? el("p", { class: "muted", style: "margin-top:8px; word-break:keep-all;", text: memos.map((m) => `“${m}”`).join(" ") }) : null,
      el("button", { class: "btn btn-primary btn-block", style: "margin-top: var(--sp-4);", onclick: () => ov.remove() }, [el("span", { text: "고마워, 해묘 🐈" })]),
    ].filter(Boolean)),
  ]);
  document.body.appendChild(ov);
}

/* 클라우드 자동 저장 — 계정 프로필로 로그인한 동안, 바뀐 게 있으면 올림 */
function startCloudAutoSync() {
  let last = "";
  const tick = () => {
    if (window.__haeQuitting) return;
    const pid = activeIdNow();
    if (!pid || !pid.startsWith("cloud_")) return;
    const now = JSON.stringify(collectState(pid));
    if (now === last) return;
    pushState(pid).then((ok) => { if (ok) last = now; });
  };
  setInterval(tick, 30000);
  // 친구 추가·삭제·생년월일 수정은 바로(1.5초 뒤) 올림 — 다른 기기에서 곧바로 보이게
  let soon = null;
  window.addEventListener("hae-statechange", () => { clearTimeout(soon); soon = setTimeout(tick, 1500); });
  window.addEventListener("pagehide", tick);
  window.addEventListener("hae-statepulled", () => { try { window.dispatchEvent(new Event("profilechange")); handleRoute(); } catch { /* ignore */ } });
  setTimeout(receiveGifts, 1500);
  setInterval(receiveGifts, 120000);
  window.addEventListener("profilechange", () => setTimeout(receiveGifts, 800));
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") tick(); });
  window.addEventListener("profilechange", () => { last = ""; });
}

/* 삼성 인터넷 + 폰 다크 모드 → 삼성 인터넷이 색을 강제로 어둡게 바꾸므로, 이때만 해묘 전용 다크 테마(html.sb-dark)로 직접 칠함 */
function samsungDark() {
  try {
    if (!/SamsungBrowser/i.test(navigator.userAgent) || !window.matchMedia) return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => document.documentElement.classList.toggle("sb-dark", mq.matches);
    apply();
    if (mq.addEventListener) mq.addEventListener("change", apply); else if (mq.addListener) mq.addListener(apply);
  } catch { /* ignore */ }
}
samsungDark();

/* 관리자 '회원 시점으로 보는 중' 띠 */
function adminViewBar() {
  const paint = async () => {
    const { getAdminView, setAdminView } = await import("./state.js");
    let bar = document.querySelector(".av-bar"); const v = getAdminView();
    if (!v) { if (bar) bar.remove(); return; }
    if (!bar) { bar = el("div", { class: "av-bar", "data-nocapture": "" }); document.body.appendChild(bar); }
    clear(bar);
    bar.append(el("span", { text: `🛡 관리자 열람 중 · ${v.name} 시점` }), el("button", { type: "button", onclick: () => { setAdminView(null); location.hash = "#/admin-users"; } }, [el("span", { text: "끝내기" })]));
  };
  window.addEventListener("hae-adminview", paint); paint();
}

function init() {
  viewEl = buildShell();
  adminViewBar();
  setupToTop();
  registerRoutes();
  try { grantDailyLogin(); } catch { /* ignore */ }   // 로그인 사용자 매일 1코인
  try { grantMonthly().forEach((m, i) => setTimeout(() => _toast(`${m.emoji} ${m.name} — 이달의 선물, 코인 +${m.coins}`, 3200), 800 + i * 3400)); } catch { /* ignore */ }
  window.addEventListener("profilechange", () => { try { grantDailyLogin(); } catch { /* ignore */ } });
  // 클라우드 OAuth 복귀 처리(설정된 경우) 후 라우터 시작
  if (isCloudEnabled()) {
    // 로그인 상태 복원 → 계정 프로필로 전환 → 클라우드 정보 받아오기 (최대 4초만 기다리고 시작)
    const boot = handleRedirect().then(async (u) => {
      // 로그아웃 상태 — 계정 정보가 화면에 남지 않게 (인스타 앱 안 브라우저 등 예전 버전이 남긴 것도 정리)
      if (!u) { const a = activeIdNow(); if (a && a.startsWith("cloud_")) setActiveProfile(null); try { clearGuestSlot(); } catch { /* ignore */ } return; }
      const pid = "cloud_" + u.uid;
      ensureProfile(pid, u.user_metadata.name || (u.email || "").split("@")[0] || (u.anonymous ? "게스트" : "내 계정"));
      setProfilePhoto(pid, u.user_metadata.avatar || "");
      if (activeIdNow() !== pid) setActiveProfile(pid);
      await pullState(pid);
      try { window.dispatchEvent(new CustomEvent("walletchange")); } catch { /* ignore */ }
    }).catch(() => {});
    let started = false;
    const go = () => { if (started) return; started = true; window.dispatchEvent(new Event("profilechange")); startRouter(); setTimeout(mailActionIfAny, 60); };
    window.addEventListener("hae-blocked", () => {
      const a = activeIdNow(); if (a && a.startsWith("cloud_")) setActiveProfile(null);
      window.dispatchEvent(new Event("profilechange"));
      const ov = el("div", { class: "popup-ov" }, [el("div", { class: "popup-card" }, [
        el("div", { class: "popup-sun", "aria-hidden": "true", text: "🔒" }),
        el("p", { class: "serif", style: "font-size:1.25rem; font-weight:700; line-height:1.4;", text: "탈퇴 처리된 계정이에요" }),
        el("p", { class: "muted", style: "margin-top:8px; word-break:keep-all;", text: "관리자가 이 계정을 삭제했어요. 궁금한 점이 있으면 해묘에 문의해 주세요. 지금은 게스트로 볼 수 있어요." }),
        el("button", { class: "btn btn-primary btn-block", style: "margin-top: var(--sp-4);", onclick: () => { ov.remove(); navigate("/"); } }, [el("span", { text: "확인" })]),
      ])]);
      document.body.appendChild(ov);
    });
    boot.finally(go); setTimeout(go, 4000);
    startCloudAutoSync();
  } else {
    startRouter();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else init();

/* ---- 새 버전을 올린 뒤 예전 파일이 섞여 보이는 문제 막기 (HAE) ----
   GitHub Pages는 파일마다 따로 10분쯤 캐시해서, 올린 직후엔 새 파일 · 예전 파일이 섞여
   화면이 됐다 안 됐다 할 수 있음. index.html의 data-build가 바뀐 걸 알아채면
   이 페이지가 쓰는 파일을 캐시 없이 다시 받아 두고 한 번만 새로고침. */
(function freshCheck() {
  const KEY = "str.build.v1";
  const run = async () => {
    try {
      if (!/^https?:$/.test(location.protocol)) return;
      const res = await fetch("index.html?b=" + Date.now(), { cache: "no-store" });
      if (!res.ok) return;
      const m = (await res.text()).match(/data-build="([^"]+)"/); if (!m) return;
      const latest = m[1], running = document.documentElement.dataset.build || "";
      let seen = null; try { seen = localStorage.getItem(KEY); } catch { /* ignore */ }
      if (seen === latest && running === latest) return;
      const urls = performance.getEntriesByType("resource").map((e) => e.name)
        .filter((u) => u.startsWith(location.origin) && /\.(js|css|json)(\?|$)/.test(u));
      urls.push(location.origin + location.pathname);
      await Promise.all([...new Set(urls)].map((u) => fetch(u, { cache: "reload" }).catch(() => null)));
      try { localStorage.setItem(KEY, latest); } catch { /* ignore */ }
      // 처음 오는 사람은 받은 파일이 이미 최신 → 새로고침 없이 캐시만 정리
      if (!seen && running === latest) return;
      if (sessionStorage.getItem("str.freshreload") === latest) return; // 무한 새로고침 방지
      sessionStorage.setItem("str.freshreload", latest);
      if (document.querySelector("input:focus, textarea:focus")) return; // 입력 중이면 다음에
      location.reload();
    } catch { /* ignore */ }
  };
  setTimeout(run, 2500);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") run(); });
})();

export { mount };


/* ---- 사용성: 에러 방지 — 코인 5개 이상 쓰는 버튼은 한 번 더 눌러 확인 ----
   버튼 글자에 '코인 N개로'가 있고 N≥5면 첫 탭은 확인 문구로 바꾸고, 3초 안에 다시 누르면 진행. */
document.addEventListener("click", (e) => {
  const btn = e.target.closest && e.target.closest("button");
  if (!btn || btn.dataset.coinOk === "1") return;
  const m = (btn.textContent || "").match(/코인\s*(\d+)\s*개로/);
  if (!m) return;
  const need = Number(m[1]);
  if (need < 5 || isUnlimited() || getCoins() < need) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const label = btn.querySelector("span:last-child") || btn;
  const orig = label.textContent;
  label.textContent = `한 번 더 누르면 코인 ${need}개를 써요 (보유 ${getCoins()}개)`;
  btn.dataset.coinOk = "1"; btn.classList.add("confirm-arm");
  setTimeout(() => { if (btn.isConnected) { label.textContent = orig; btn.dataset.coinOk = ""; btn.classList.remove("confirm-arm"); } }, 3000);
}, true);
