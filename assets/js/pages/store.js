import { el, clear, toast } from "../utils/dom.js";
import { stash, setAdminView } from "../state.js";
import { adminInquiries, getNotice, adminSetNotice } from "../cloud.js";
import { adminListUsers, adminUserResults, adminGiftCoins, adminDeleteUser, adminListTrash, adminRestoreUser, adminPurgeUser, adminGiftPending, adminCancelGift } from "../cloud.js";
import { pageHeader, backLink, noticeBox } from "./shared.js";
import { openLabel } from "../openLog.js";
import { openModal as _openModal } from "./shared.js";
import { getPaymentConfig, isPaymentReady } from "../config.js";
import { getCoins, checkInStatus, claimCheckIn, redeemLicense, creditPaidReturn, COIN_PRICE_KRW, PRICE_TABLE, redeemCode, isAdmin, setAdmin, isFamily, setFamily, monthlyCodes, MONTHLY_CODES, isDayPass, dayPassStatus, DAYPASS_MAX, applyDayPass, dayPassScopeName, logGift, getGiftLog, markGiftCanceled, STREAK_BONUS } from "../wallet.js";

export function renderStore({ navigate }) {
  const root = el("div", {});

  // 결제 성공 후 리다이렉트로 돌아온 경우 → 코인 자동 충전 (키 입력 없이)
  handlePaidReturn();
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(pageHeader("코인 충전소", "코인으로 더 깊게 보기",
    "깊이 있는 해석은 코인으로 열어요. 매일 출석하면 무료 코인도 받을 수 있어요."));

  // 코인 잔액
  root.append(el("section", { class: "wrap" }, [
    el("div", { class: "panel panel-gold", style: "display:flex; align-items:center; gap:14px;" }, [
      coinMark("lg"),
      el("div", { style: "flex:1;" }, [
        el("p", { class: "muted tiny", text: "내 코인" }),
        el("p", { id: "coin-balance", class: "serif", style: "font-size:2rem; font-weight:800; color:var(--c-gold-soft); line-height:1;", text: String(getCoins()) }),
      ]),
      el("span", { class: "muted tiny", text: `코인 1개 = 해석 1회` }),
    ]),
  ]));

  // 출석체크
  root.append(el("section", { class: "wrap", style: "margin-top: var(--sp-4);" }, [checkInCard()]));

  // 충전 패키지
  root.append(el("section", { class: "wrap section-gap", style: "margin-top: var(--sp-5);" }, [
    el("h2", { style: "font-size:1.1rem;", text: "코인 충전" }),
    chargeArea(),
  ]));

  // 결제=자동 충전 안내 (+ 안 들어왔을 때만 쓰는 수동 키 입력)
  root.append(el("section", { class: "wrap", style: "margin-top: var(--sp-4);" }, [topupInfoCard()]));

  // 쿠폰 · 관리자 코드
  root.append(el("section", { class: "wrap", style: "margin-top: var(--sp-4);" }, [codeBox()]));

  // 코인 사용 안내 + 정직한 고지
  root.append(el("section", { class: "wrap section-gap", style: "margin-top: var(--sp-4);" }, [
    el("div", { class: "panel" }, [
      el("p", { style: "font-weight:700; margin-bottom:10px;", text: "가격표" }),
      ...PRICE_TABLE.map((g) => el("div", { style: "margin-bottom: var(--sp-3);" }, [
        el("p", { class: "eyebrow", style: "margin-bottom:6px;", text: g.group }),
        el("div", { class: "price-rows" }, g.items.map(([name, cost]) => el("div", { class: "price-row" }, [
          el("span", { text: name }),
          cost ? el("span", { class: "price-coin" }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: String(cost) })]) : el("span", { class: "price-coin free", text: "무료" }),
        ]))),
      ])),
      el("p", { class: "muted tiny", style: "margin-top:6px;", text: "기본 운세(오늘·이달·올해·연애·재물·직업 등)와 운세 캘린더는 모두 무료예요. 코인은 프리미엄 특집에만 들어가고, 한 번 연 프리미엄은 다시 볼 때 무료!" }),
    ]),
    noticeBox("info", "코인은 로그인하면 내 계정에 저장돼서 다른 기기에서도 그대로 쓸 수 있어요. 회원 탈퇴 시 남은 코인과 열어 둔 풀이는 모두 사라지며, 탈퇴 후 7일이 지나면 복구·환불되지 않고 해묘는 이에 대해 책임지지 않아요."),
  ]));

  return root;
}

function refreshBalance() {
  const n = document.getElementById("coin-balance");
  if (n) n.textContent = String(getCoins());
}

/* 결제 성공 리다이렉트 처리 — URL의 pack·order 파라미터로 코인 자동 지급 후 파라미터 제거 */
function handlePaidReturn() {
  let params = {};
  try {
    const hash = location.hash || "";
    const qi = hash.indexOf("?");
    if (qi >= 0) params = Object.fromEntries(new URLSearchParams(hash.slice(qi + 1)));
    // 일부 결제사는 해시가 아닌 실제 쿼리스트링으로 되돌려줌
    if (!params.order && !params.order_id && location.search) {
      params = Object.assign(Object.fromEntries(new URLSearchParams(location.search)), params);
    }
  } catch { /* ignore */ }
  if (!(params.pack || params.coins || params.paid)) return;
  const res = creditPaidReturn(params);
  // 파라미터 정리(새로고침 중복 방지 표시)
  try { history.replaceState(null, "", location.pathname + location.search + "#/store"); } catch { /* ignore */ }
  if (res.ok) {
    setTimeout(() => showPopup(`코인 ${res.added}개가 충전됐어요!`, "결제 완료 · 바로 사용 가능"), 60);
  } else if (res.reason === "dup") {
    setTimeout(() => toast("이미 충전된 결제예요."), 60);
  }
}

function checkInCard() {
  const wrap = el("div", { class: "panel" });
  function render() {
    clear(wrap);
    const s = checkInStatus();
    wrap.append(
      el("div", { style: "display:flex; align-items:center; gap:10px;" }, [
        coinMark(),
        el("div", { style: "flex:1;" }, [
          el("p", { style: "font-weight:700;", text: "매일 출석 체크" }),
          el("p", { class: "muted tiny", text: s.streak ? `연속 ${s.streak}일째 · 7일마다 보너스 +${STREAK_BONUS}` : "출석하면 무료 코인을 드려요 · 7일 연속 보너스" }),
        ]),
      ]),
      el("div", { class: "streak-dots", style: "display:flex; gap:6px; margin:12px 0;" },
        (() => {
          const cyc = s.streak % 7;
          const filled = (s.streak > 0 && cyc === 0) ? 7 : cyc;
          return Array.from({ length: 7 }, (_, i) => el("span", { class: "streak-dot" + (i < filled ? " on" : "") + (i === 6 ? " bonus" : "") }));
        })()),
      s.claimedToday
        ? el("button", { class: "btn btn-ghost btn-block", disabled: true }, [el("span", { text: "오늘 출석 완료" })])
        : el("button", { class: "btn btn-primary btn-block", onclick: () => {
            const r = claimCheckIn();
            if (r.ok) {
              toast(`출석 완료 · 코인 +${r.reward}${r.bonus ? " (연속 보너스 포함)" : ""}`);
              refreshBalance(); render();
            }
          } }, [el("span", { text: `출석하고 코인 받기 · +${s.reward}` })]),
    );
  }
  render();
  return wrap;
}

function chargeArea() {
  const cfg = getPaymentConfig();
  if (!isPaymentReady()) {
    return el("div", { class: "panel", style: "text-align:center;" }, [
      el("p", { style: "font-weight:700;", text: "충전 준비 중" }),
      el("p", { class: "muted tiny", style: "margin-top:6px;", text: "코인 충전은 곧 열려요. 지금은 매일 출석 코인으로 이용해 보세요." }),
    ]);
  }
  const grid = el("div", { class: "coin-packs" });
  cfg.packages.filter((p) => p && p.checkoutUrl).forEach((p) => {
    grid.append(el("button", { class: "panel coin-pack", onclick: () => { window.open(p.checkoutUrl, "_blank", "noopener"); toast("결제 페이지를 새 탭에서 열었어요. 결제 후 받은 키를 입력해 충전하세요."); } }, [
      p.badge ? el("span", { class: "pack-badge", text: p.badge }) : null,
      el("span", { class: "pack-coins" }, [coinMark(), el("span", { text: String(p.coins) })]),
      el("span", { class: "pack-price", text: p.priceLabel || "" }),
    ].filter(Boolean)));
  });
  return grid;
}

/* 결제=자동충전 안내 카드 (수동 키 입력 창은 제거) */
function topupInfoCard() {
  return el("div", { class: "panel" }, [
    el("div", { style: "display:flex; align-items:center; gap:10px;" }, [
      coinMark(),
      el("div", { style: "flex:1;" }, [
        el("p", { style: "font-weight:700;", text: "결제하면 코인이 자동 충전돼요" }),
        el("p", { class: "muted tiny", style: "margin-top:4px;", text: "충전 패키지를 결제하면 완료 후 자동으로 코인이 쌓여요. 따로 키를 입력할 필요가 없어요." }),
      ]),
    ]),
  ]);
}

function redeemBox(bare) {
  const input = el("input", { class: "input", type: "text", placeholder: "결제 후 받은 충전 키", autocomplete: "off", spellcheck: "false" });
  const msg = el("p", { class: "field-error", "aria-live": "polite", style: "margin-top:6px;" });
  const btn = el("button", { class: "btn btn-ghost btn-block", style: "margin-top:10px;" }, [el("span", { text: "충전 키로 코인 받기" })]);
  btn.addEventListener("click", async () => {
    msg.style.color = ""; msg.textContent = "";
    btn.disabled = true; clear(btn); btn.append(el("span", { text: "확인 중…" }));
    const res = await redeemLicense(input.value);
    if (res.ok) {
      toast(`코인 ${res.added}개 충전 완료`);
      refreshBalance(); input.value = "";
      btn.disabled = false; clear(btn); btn.append(el("span", { text: "충전 키로 코인 받기" }));
    } else {
      msg.style.color = "var(--c-danger)"; msg.textContent = res.message;
      btn.disabled = false; clear(btn); btn.append(el("span", { text: "충전 키로 코인 받기" }));
    }
  });
  return el("div", { class: "panel" }, [
    el("p", { style: "font-weight:700; margin-bottom:8px;", text: "이미 결제하셨나요?" }),
    el("p", { class: "muted tiny", style: "margin-bottom:8px;", text: "결제 후 이메일로 받은 키를 입력하면 코인이 충전돼요." }),
    input, btn, msg,
  ]);
}

function codeBox() {
  const wrap = el("div", { class: "panel" });
  function render() {
    clear(wrap);
    if (isAdmin()) {
      wrap.append(
        el("p", { style: "font-weight:700; color:var(--c-gold-soft);", text: "관리자 모드 · 무제한 이용 중" }),
        el("p", { class: "muted tiny", style: "margin:6px 0 10px;", text: "모든 해석이 코인 없이 열려요. (내 코인 ∞)" }),
        el("div", { class: "btn-row" }, [
          el("button", { class: "btn btn-primary btn-sm", onclick: () => { location.hash = "/admin-users"; } }, [el("span", { text: "👥 회원 정보 보기" })]),
          el("button", { class: "btn btn-ghost btn-sm", onclick: () => { location.hash = "/inquiry"; } }, [el("span", { text: "💬 문의 · 후기" })]),
          el("button", { class: "btn btn-quiet btn-sm", onclick: () => { setAdmin(false); toast("관리자 모드를 껐어요."); render(); } }, [el("span", { text: "관리자 모드 끄기" })]),
        ]),
      );
      return;
    }
    if (isFamily()) {
      wrap.append(
        el("p", { style: "font-weight:700; color:var(--c-gold-soft);", text: "엄마 모드 · 무제한 이용 중 💗" }),
        el("p", { class: "muted tiny", style: "margin:6px 0 10px;", text: "모든 해석을 코인 없이 볼 수 있어요. (내 코인 ∞)" }),
        el("button", { class: "btn btn-quiet btn-sm", onclick: () => { setFamily(false); toast("엄마 모드를 껐어요."); render(); } }, [el("span", { text: "엄마 모드 끄기" })]),
      );
      return;
    }
    const input = el("input", { class: "input", type: "text", placeholder: "쿠폰 또는 코드 입력 (대·소문자 상관없음)", autocomplete: "off", autocapitalize: "off", autocorrect: "off", spellcheck: "false" });
    const msg = el("p", { class: "field-error", "aria-live": "polite", style: "margin-top:6px;" });
    const btn = el("button", { class: "btn btn-ghost btn-block", style: "margin-top:10px;" }, [el("span", { text: "코드 적용" })]);
    btn.addEventListener("click", () => {
      const res = redeemCode(input.value);
      if (res.ok && res.kind === "daypass-choose") {
        const m = _openModal([
          el("p", { class: "muted", style: "margin-bottom:10px;", text: "오늘 하루 무엇을 무제한으로 볼까요? 하나를 골라 주세요. (이 코드는 한 사람당 3번까지)" }),
          el("div", { class: "dp-opts" }, res.options.map((o) => el("button", { class: "dp-opt", type: "button", onclick: () => {
            const r2 = applyDayPass(res.id, o.id); m.close();
            if (r2.ok) { showPopup(r2.popup, r2.popupSub, r2.emoji); refreshBalance(); input.value = ""; render(); }
            else { msg.style.color = "var(--c-danger)"; msg.textContent = r2.message; }
          } }, [el("b", { text: o.name }), el("span", { class: "tiny muted", text: o.desc })]))),
        ], { title: `${res.emoji} ${res.name}` });
        return;
      }
      if (res.ok) {
        if (res.popup) showPopup(res.popup, res.popupSub || `코인 +${res.coins} 🎁`, res.emoji || "☀️");
        else toast(res.message);
        if (res.kind === "coupon" || res.kind === "daypass") refreshBalance();
        input.value = ""; render();
      } else { msg.style.color = "var(--c-danger)"; msg.textContent = res.message; }
    });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") btn.click(); });
    wrap.append(
      el("p", { style: "font-weight:700; margin-bottom:4px;", text: "쿠폰 · 코드" }),
      el("p", { class: "muted tiny", style: "margin-bottom:8px;", text: "이벤트 쿠폰이나 관리자 코드를 입력하세요. 하루 무제한 코드는 코드마다 한 사람당 3번까지 쓸 수 있어요." }),
      input, btn, msg,
    );
    if (isDayPass()) wrap.append(el("p", { class: "tiny", style: "margin-top:8px; color:#c6f0d8; font-weight:800;", text: `🌈 오늘 하루 ${dayPassScopeName()} 무제한 이용 중 · 자정까지 열려요` }));
    const usedDP = dayPassStatus().filter((c) => c.used > 0);
    if (usedDP.length) wrap.append(el("p", { class: "tiny muted", style: "margin-top:6px;", text: "하루 무제한 코드 남은 횟수 · " + usedDP.map((c) => `${c.emoji} ${c.name} ${c.left}/${DAYPASS_MAX}`).join(" · ") }));
    const d = new Date(); const nm = d.getMonth() === 11 ? 1 : d.getMonth() + 2;
    monthlyCodes().forEach((id) => {
      const mc = MONTHLY_CODES.find((m) => m.id === id); if (!mc) return;
      wrap.append(el("p", { class: "tiny", style: "margin-top:8px; color:var(--c-gold-soft); font-weight:700;", text: `${mc.emoji} ${mc.name} 등록됨 · 다음 코인 ${mc.coins}개는 ${nm}월 1일에 들어와요` }));
    });
  }
  render();
  return wrap;
}

function bullet(text) {
  return el("p", { style: "display:flex; gap:8px; align-items:flex-start; font-size:var(--fs-sm);" }, [
    el("span", { style: "color:var(--c-gold);", text: "•" }), el("span", { class: "muted", text }),
  ]);
}

/* 코인 마크 — 이모지 대신 CSS 골드 디스크 */
function coinMark(size) {
  return el("span", { class: "coin-mark" + (size === "lg" ? " lg" : size === "sm" ? " sm" : ""), "aria-hidden": "true" });
}

/* 특별 쿠폰 팝업 */
function showPopup(title, sub, emoji = "☀️") {
  const ov = el("div", { class: "popup-ov", onclick: (e) => { if (e.target === ov) ov.remove(); } }, [
    el("div", { class: "popup-card" }, [
      el("div", { class: "popup-sun", "aria-hidden": "true", text: emoji }),
      el("p", { class: "serif", style: "font-size:1.35rem; font-weight:700; line-height:1.4;", text: title }),
      sub ? el("p", { style: "margin-top:8px; font-weight:800; color:var(--c-gold-soft);", text: sub }) : null,
      el("button", { class: "btn btn-primary btn-block", style: "margin-top: var(--sp-4);", onclick: () => ov.remove() }, [el("span", { text: "고마워, 해묘 🐈" })]),
    ].filter(Boolean)),
  ]);
  document.body.appendChild(ov);
}

/* =========================================================
   관리자 — 회원 정보 보기 (HAE) · #/admin-users
   Firestore 규칙에서 관리자 이메일로 로그인한 경우만 읽을 수 있음
   ========================================================= */
export function renderAdminUsers({ navigate }) {
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/store", "코인 · 코드")]));
  root.append(pageHeader("ADMIN", "회원 정보 보기", "가입한 회원의 내 정보·내 사람·코인·저장한 풀이를 볼 수 있어요. 관리자만 보이는 화면이에요."));
  const host = el("section", { class: "wrap section-gap" });
  root.append(host);
  if (!isAdmin()) { host.append(noticeBox("info", "관리자 코드를 먼저 입력해 주세요.")); return root; }
  const dashHost = el("section", { class: "wrap", style: "margin-bottom: var(--sp-4);" }, [el("div", { class: "panel dash", "data-noterm": "" }, [el("p", { class: "muted tiny", text: "대시보드 불러오는 중…" })])]);
  root.insertBefore(dashHost, host);
  root.insertBefore(noticeEditor(), host);
  root.insertBefore(siteAddrCard(), host);
  const glHost = el("div", {});
  const paintGl = () => { clear(glHost); glHost.append(giftLogCard()); };
  paintGl(); window.addEventListener("hae-giftlog", paintGl);
  root.insertBefore(glHost, host);
  const trashHost = el("section", { class: "wrap" });
  root.insertBefore(trashHost, host);
  const paintTrash = () => trashBox(trashHost, () => { setTimeout(() => location.reload(), 900); });
  paintTrash(); window.addEventListener("hae-trash", paintTrash);
  host.append(el("p", { class: "muted", text: "불러오는 중…" }));
  const fmt = (t) => (t ? new Date(t).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" }) : "-");
  const birthTxt = (b) => (b && b.birthDate ? `${b.birthDate}${b.calendarType === "lunar" ? "(음력)" : ""} ${b.timeUnknown ? "시간 모름" : b.birthTime || ""} · ${b.gender === "male" ? "남" : b.gender === "female" ? "여" : ""}` : "미입력");
  adminListUsers().then((r) => {
    clear(host);
    paintDash(dashHost, r, navigate);
    if (r.error) { host.append(noticeBox("info", r.error)); return; }
    const list = r.users.slice();
    // 회원이 많아져도 보기 편하게 — 검색 · 정렬 · 걸러 보기 · 20명씩
    const SORTS = [["active", "최근 활동"], ["new", "가입 최신"], ["old", "가입 오래된"], ["coin", "코인 많은"], ["name", "이름순"]];
    const FILTERS = [["all", "전체"], ["member", "회원"], ["guest", "게스트"], ["today", "오늘 가입"], ["quiet", "30일 안 들어옴"]];
    const PAGE = 20;
    let q = "", sortBy = "active", filt = "all", limit = PAGE;
    try { const pref = JSON.parse(sessionStorage.getItem("str.admsort.v1") || "{}"); if (pref.s) sortBy = pref.s; if (pref.f) filt = pref.f; } catch { /* ignore */ }
    const savePref = () => { try { sessionStorage.setItem("str.admsort.v1", JSON.stringify({ s: sortBy, f: filt })); } catch { /* ignore */ } };
    const isGuest = (u) => u.anonymous || !u.email;
    const coinsOf = (u) => +(((u.state || {})["str.wallet.v1"] || {}).coins || 0);
    const birthName = (u) => (((u.state || {})["str.mybirth.v1"] || {}).name || "");
    const listHost = el("div", { class: "adm-list" });
    const countEl = el("small", { class: "tiny muted" });
    const search = el("input", { class: "input", type: "search", placeholder: "이름 · 이메일 · 생년월일 이름으로 찾기", oninput: () => { q = search.value.trim().toLowerCase(); limit = PAGE; paint(); } });
    const segRow = (items, cur, set) => el("div", { class: "adm-seg", role: "group" }, items.map(([k, lab]) => el("button", { type: "button", class: "chip" + (k === cur() ? " on" : ""), "aria-pressed": String(k === cur()), onclick: () => { set(k); limit = PAGE; savePref(); paintCtl(); paint(); } }, [el("span", { text: lab })])));
    const ctlHost = el("div", { class: "adm-ctl" });
    const paintCtl = () => { clear(ctlHost); ctlHost.append(
      el("div", { class: "adm-ctl-r" }, [el("span", { class: "adm-ctl-l", text: "정렬" }), segRow(SORTS, () => sortBy, (k) => { sortBy = k; })]),
      el("div", { class: "adm-ctl-r" }, [el("span", { class: "adm-ctl-l", text: "보기" }), segRow(FILTERS, () => filt, (k) => { filt = k; })]),
    ); };
    const paint = () => {
      clear(listHost);
      const t0 = dayStart(), q30 = Date.now() - 30 * DAY_MS;
      let shown = list.filter((u) => !q || `${u.name} ${u.email} ${birthName(u)} ${u.uid}`.toLowerCase().includes(q));
      if (filt === "member") shown = shown.filter((u) => !isGuest(u));
      if (filt === "guest") shown = shown.filter(isGuest);
      if (filt === "today") shown = shown.filter((u) => joinedAt(u) >= t0);
      if (filt === "quiet") shown = shown.filter((u) => (u.updatedAt || 0) < q30);
      const by = {
        active: (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0),
        new: (a, b) => joinedAt(b) - joinedAt(a),
        old: (a, b) => (joinedAt(a) || 9e15) - (joinedAt(b) || 9e15),
        coin: (a, b) => coinsOf(b) - coinsOf(a),
        name: (a, b) => (a.name || a.email || "힣").localeCompare(b.name || b.email || "힣", "ko"),
      }[sortBy];
      shown.sort(by);
      countEl.textContent = shown.length === list.length ? `전체 ${list.length}명` : `${shown.length}명 · 전체 ${list.length}명 중`;
      if (!shown.length) { listHost.append(el("p", { class: "muted", text: q ? "찾는 회원이 없어요." : "이 조건에 맞는 회원이 없어요." })); return; }
      const page = shown.slice(0, limit);
      page.forEach((u) => {
        const st = u.state || {}, me = st["str.mybirth.v1"], ppl = st["str.people.v1"] || [], w = st["str.wallet.v1"] || {};
        const detail = el("div", { class: "adm-detail" });
        const card = el("details", { class: "panel adm-u" }, [
          el("summary", {}, [
            el("span", { class: "au-av au-av0 adm-av", text: (u.name || u.email || "?").slice(0, 1) }),
            el("div", { class: "adm-s" }, [el("b", {}, [el("span", { text: u.name || (u.anonymous || !u.email ? "게스트" : "(이름 없음)") }), u.anonymous || !u.email ? el("span", { class: "adm-guest", text: "👤 게스트" }) : null].filter(Boolean)), el("small", { text: `${u.email || `게스트 · ${u.uid.slice(0, 8)}`}${joinedAt(u) ? ` · ${new Date(joinedAt(u)).toLocaleDateString("ko-KR", { year: "2-digit", month: "numeric", day: "numeric" })} 가입${u.createdAt ? "" : "(추정)"}` : ""}` })]),
            el("span", { class: "adm-c", text: `🪙 ${w.coins ?? "-"}` }),
          ]),
          detail,
        ]);
        card.addEventListener("toggle", async () => {
          if (!card.open || detail.dataset.done) return;
          detail.dataset.done = "1";
          const res = await adminUserResults(u.uid);
          detail.append(
            el("div", { class: "adm-row" }, [el("span", { text: "최근 저장" }), el("b", { text: fmt(u.updatedAt) })]),
            el("div", { class: "adm-row" }, [el("span", { text: "내 정보" }), el("b", { text: `${(me && me.name) || ""} ${birthTxt(me)}` })]),
            el("div", { class: "adm-row" }, [el("span", { text: "코인 · 열어 본 풀이" }), el("b", { text: `${w.coins ?? 0}개 · ${(w.unlocked || []).length}건 · 쓴 코인 ${w.spent || 0}개` })]),
            openedList(w, u, st),
            el("div", { class: "adm-row" }, [el("span", { text: `내 사람 ${ppl.length}명` }), el("b", { text: ppl.map((p) => `${p.name}(${p.input && p.input.birthDate ? p.input.birthDate : "-"})`).join(", ") || "-" })]),
            (() => { const g = getGiftLog().filter((x) => x.uid === u.uid); const sum = g.reduce((a, x) => a + (x.coins || 0), 0);
              return el("div", { class: "adm-row" }, [el("span", { text: "받은 코인 선물" }), el("b", { text: g.length ? `총 ${sum}개 · ${g.length}번 (최근 ${fmt(g[0].t)})` : "아직 없어요" })]); })(),
            savedList(u, res),
            giftBox(u),
            delBox(u, card),
            el("p", { class: "tiny muted", text: `UID ${u.uid}` }),
          );
        });
        listHost.append(card);
      });
      if (shown.length > limit) listHost.append(el("button", { type: "button", class: "btn btn-ghost btn-block adm-more", onclick: () => { limit += PAGE; paint(); } }, [el("span", { text: `${Math.min(PAGE, shown.length - limit)}명 더 보기 · 남은 ${shown.length - limit}명` })]));
      if (page.length > 1) listHost.append(el("button", { type: "button", class: "adm-foldall", onclick: () => listHost.querySelectorAll("details.adm-u[open]").forEach((d) => { d.open = false; }) }, [el("span", { text: "펼친 회원 모두 접기" })]));
    };
    paintCtl();
    const fold = el("details", { class: "panel adm-fold", open: "" }, [
      el("summary", {}, [el("span", { class: "adm-fold-h" }, [el("b", { text: `👥 회원 목록 ${list.length}명` }), countEl]), el("span", { class: "op-chev", "aria-hidden": "true" })]),
      el("div", { class: "adm-fold-b" }, [search, ctlHost, listHost]),
    ]);
    host.append(fold);
    paint();
  });
  return root;
}

/* 관리자 — 회원에게 코인 선물 */
function giftBox(u) {
  const amt = el("input", { class: "input", type: "number", min: "1", max: "1000", inputmode: "numeric", placeholder: "코인 개수", "aria-label": "선물할 코인 개수" });
  const memo = el("input", { class: "input", type: "text", maxlength: "60", placeholder: "한마디 (선택) · 예: 가입 축하해요!", "aria-label": "선물 메시지" });
  const quick = el("div", { class: "adm-gq" }, [5, 10, 30, 50].map((n) => el("button", { type: "button", class: "chip", onclick: () => { amt.value = String(n); } }, [el("span", { text: `${n}개` })])));
  let armed = false;
  const label = el("span", { text: "🎁 코인 선물하기" });
  const btn = el("button", { type: "button", class: "btn btn-primary btn-block" }, [label]);
  const done = el("p", { class: "tiny", style: "color:#c6f0d8; font-weight:700;" });
  btn.addEventListener("click", async () => {
    const n = Math.floor(Number(amt.value));
    if (!n || n < 1 || n > 1000) { toast("코인은 1~1000개 사이로 넣어 주세요."); amt.focus(); return; }
    if (!armed) { armed = true; label.textContent = `${u.name || "이 회원"}에게 ${n}개 — 한 번 더 누르면 보내요`; setTimeout(() => { armed = false; label.textContent = "🎁 코인 선물하기"; }, 4000); return; }
    armed = false; btn.disabled = true; label.textContent = "보내는 중…";
    const r = await adminGiftCoins(u.uid, n, memo.value.trim());
    btn.disabled = false; label.textContent = "🎁 코인 선물하기";
    if (r.error) { toast(r.error); return; }
    logGift({ id: r.id, uid: u.uid, name: u.name || "", email: u.email || "", coins: n, memo: memo.value.trim() });
    toast(`${u.name || "회원"}에게 코인 ${n}개를 보냈어요 🎁`);
    window.dispatchEvent(new Event("hae-giftlog"));
    done.textContent = `✓ ${n}개 보냄 · 상대가 다음에 앱을 열면 받아요`; amt.value = ""; memo.value = "";
  });
  return el("div", { class: "adm-gift" }, [
    el("p", { class: "eyebrow", text: "코인 선물" }),
    quick, el("div", { class: "adm-grow" }, [amt, memo]), btn, done,
  ]);
}

/* 관리자 — 회원 시점으로 풀이 열기 (이 탭에서만 · 위 띠의 '끝내기'로 돌아옴) */
function viewAsMember(u, st, r) {
  const me = st["str.mybirth.v1"], ppl = (st["str.people.v1"] || []).filter((p) => p.input && p.input.birthDate);
  const myName = (me && me.name) || u.name || "나";
  const nick = u.name || (me && me.name) || "회원";   // '나 (닉네임)'으로 보이게
  const base = { own: me || null, ownName: nick, people: ppl, uid: u.uid };
  let who = me, label = nick, pid = null;
  if (r.who && me && r.who !== me.name) { const f = ppl.find((p) => p.name === r.who); if (f) { who = f.input; label = `${nick} › ${f.name}`; pid = f.id; } }
  if (!who || !who.birthDate) { toast("이 회원은 생년월일 정보가 없어서 다시 열 수 없어요."); return; }
  // 궁합 — 기록에 남은 'A × B · 리포트'에서 상대를 찾아 회원의 내 사람 정보로 다시 열기
  const pair = (r.with || "").split("·")[0].split("×").map((x) => x.trim()).filter(Boolean);
  const findP = (nm) => (nm === myName || nm === "나") ? { name: myName, input: me } : ppl.find((p) => p.name === nm);
  if (/^\/compat/.test(r.p) || pair.length === 2) {
    const A = pair[0] ? findP(pair[0]) : null, B = pair[1] ? findP(pair[1]) : null;
    if (!A || !B || !A.input || !B.input) { toast("궁합 상대가 회원의 내 사람 목록에 없어서 다시 열 수 없어요."); return; }
    setAdminView({ ...base, name: `${label} · ${A.name} × ${B.name}`, input: A.input, pid: A.input === me ? null : (A.id || null) });
    if (r.p === "/compat-plus") {
      const rep = (r.with || "").split("·")[1]; window.__cpPick = B.id || null; window.__cpRep = null;
      if (rep) { try { window.__cpRepName = rep.trim(); } catch { /* ignore */ } }
      location.hash = "#/compat-plus"; return;
    }
    if (r.p === "/compat/result") { stash("compat:input", { a: { ...A.input, name: A.name }, b: { ...B.input, name: B.name } }); location.hash = "#/compat/result"; return; }
    location.hash = "#" + r.p; return;
  }
  setAdminView({ ...base, name: label, input: who, pid });
  location.hash = "#" + r.p;
}
function savedList(u, res) {
  if (!res.length) return el("div", { class: "adm-row" }, [el("span", { text: "저장한 풀이" }), el("b", { text: "-" })]);
  return el("details", { class: "adm-open" }, [
    el("summary", {}, [el("span", { text: `저장한 풀이 ${res.length}건 보기` })]),
    el("div", { class: "adm-ol" }, res.map((x) => el("div", { class: "adm-oi" }, [
      el("b", { text: x.title || x.type || x.id }),
      el("button", { type: "button", class: "adm-view", onclick: () => { stash("admin:result:" + x.id, x); setAdminView({ name: u.name || "회원", input: null, uid: u.uid, saved: true }); location.hash = "#/result/" + x.id; } }, [el("span", { text: "풀이 보기" })]),
    ]))),
  ]);
}
function openedList(w, u, st) {
  const un = w.unlocked || [];
  const log = (w.openLog || []).slice().sort((a, b) => b.t - a.t);
  const seen = new Set(log.map((x) => x.id));
  const old = un.filter((id) => !seen.has(id)).map((id) => ({ id, t: 0, c: null, via: "coin" }));
  const rows = [...log, ...old];
  if (!rows.length) return el("div", { class: "adm-row" }, [el("span", { text: "열어 본 풀이" }), el("b", { text: "아직 없어요" })]);
  const fmtT = (t) => (t ? new Date(t).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "예전 기록");
  const fmtLong = (t) => { if (!t) return "예전 기록 (시간 모름)"; const d = new Date(t); return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`; };
  const VIA = { admin: "관리자 무제한", family: "가족 코드", daypass: "하루 무제한 코드", view: "무료" };
  const tag = (r) => (r.via && VIA[r.via]) ? VIA[r.via] : (r.c ? `🪙 ${r.c}` : "코인");
  const name = (r) => (r.via === "view" ? (r.title || r.id.replace(/^view:/, "")) : openLabel(r.id));
  const nCoin = rows.filter((r) => r.c > 0 || (r.c == null && r.via === "coin")).length, nFree = rows.length - nCoin;
  return el("details", { class: "adm-open" }, [
    el("summary", {}, [el("span", { text: `열어 본 풀이 ${rows.length}건 보기 (코인 ${nCoin} · 무료·코드 ${nFree})` })]),
    el("div", { class: "adm-ol" }, rows.map((r) => el("div", { class: "adm-oi" + (r.via && r.via !== "coin" ? " free" : "") }, [
      el("b", { text: name(r) }),
      el("small", { text: [fmtLong(r.t), r.c > 0 ? `🪙 ${r.c}코인 사용` : tag(r), r.who ? `${r.who} 기준` : "", r.with ? `상대 · ${r.with}` : ""].filter(Boolean).join(" · ") }),
      r.p && u && !/^\/(tarot|oracle)/.test(r.p)
        ? el("button", { type: "button", class: "adm-view", onclick: () => viewAsMember(u, st, r) }, [el("span", { text: "풀이 보기" })])
        : el("small", { class: "adm-norep", text: r.p ? "카드를 매번 새로 뽑아 다시 열 수 없어요 · 기록만" : "예전 기록이라 어느 화면인지 남아 있지 않아요 · 기록만" }),
    ].filter(Boolean)))),
  ]);
}

/* 관리자 — 회원 삭제 (두 번 확인) */
function delBox(u, card) {
  const label = el("span", { text: "회원 삭제" });
  const btn = el("button", { type: "button", class: "adm-del" }, [label]);
  let armed = false, t = null;
  btn.addEventListener("click", async () => {
    if (!armed) {
      armed = true; label.textContent = `${u.name || u.email || "이 회원"}의 정보를 모두 지워요 — 한 번 더 누르면 삭제`; btn.classList.add("armed");
      t = setTimeout(() => { armed = false; label.textContent = "회원 삭제"; btn.classList.remove("armed"); }, 5000);
      return;
    }
    clearTimeout(t); btn.disabled = true; label.textContent = "삭제하는 중…";
    const r = await adminDeleteUser(u.uid, u.email);
    if (r.error) { btn.disabled = false; armed = false; btn.classList.remove("armed"); label.textContent = "회원 삭제"; toast(r.error); return; }
    toast(`${u.name || "회원"}을(를) 삭제했어요.`);
    window.dispatchEvent(new Event("hae-trash"));
    card.replaceWith(el("div", { class: "panel adm-gone" }, [
      el("b", { text: `🗑 ${u.name || "(이름 없음)"} · ${u.email || u.uid} — 삭제됨 · 30일 동안 위 '삭제한 회원'에 보관돼요 (이용자 안내 복구 기간은 7일)` }),
      el("p", { class: "tiny muted", text: "이 계정으로 로그인하면 바로 로그아웃되고 '탈퇴 처리된 계정' 안내가 떠요. 로그인 기록까지 완전히 지우려면 Firebase 콘솔 › Authentication › 사용자에서 이 이메일을 삭제해 주세요." }),
    ]));
  });
  return el("div", { class: "adm-delw" }, [btn]);
}

/* 관리자 — Firebase 콘솔에 넣을 이 사이트 주소 (복사 버튼) */
/* 관리자 — 코인 선물 내역 (누구에게 · 몇 개 · 언제 · 한마디) */
function giftLogCard() {
  const log = getGiftLog();
  const sum = log.filter((x) => !x.canceled).reduce((a, x) => a + (x.coins || 0), 0);
  const people = new Set(log.map((x) => x.uid)).size;
  const when = (t) => new Date(t).toLocaleString("ko-KR", { year: "2-digit", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  return el("section", { class: "wrap", style: "margin-bottom: var(--sp-4);" }, [
    el("details", { class: "panel adm-gl" }, [
      el("summary", {}, [el("span", { class: "adm-gl-ic", text: "🎁" }), el("div", { class: "adm-s" }, [el("b", { text: "코인 선물 내역" }), el("small", { text: log.length ? `${people}명에게 ${log.length}번 · 총 ${sum}개` : "아직 보낸 선물이 없어요" })])]),
      log.length ? el("div", { class: "adm-gl-list" }, log.map((x) => el("div", { class: "adm-gl-row" }, [
        el("div", { class: "adm-gl-who" }, [el("b", { text: x.name || "(이름 없음)" }), el("small", { text: [x.email, x.memo ? `“${x.memo}”` : ""].filter(Boolean).join(" · ") })]),
        el("div", { class: "adm-gl-amt" }, [el("b", { class: x.canceled ? "adm-gl-cx" : "", text: `🪙 ${x.coins}` }), el("small", { text: when(x.t) }), giftState(x)]),
      ]))) : el("p", { class: "tiny muted", style: "margin-top:10px;", text: "회원 카드를 열어 ‘코인 선물하기’로 보내면 여기에 쌓여요. (이 기능이 생긴 뒤 보낸 것부터 기록돼요)" }),
    ]),
  ]);
}
function siteAddrCard() {
  const url = location.origin + location.pathname, host = location.hostname;
  const row = (label, val, hint) => el("div", { class: "adm-addr" }, [
    el("small", { text: label }),
    el("div", { class: "adm-addr-v" }, [el("code", { text: val }), el("button", { type: "button", class: "chip", onclick: async () => { try { await navigator.clipboard.writeText(val); toast("복사했어요"); } catch { toast("길게 눌러 직접 복사해 주세요"); } } }, [el("span", { text: "복사" })])]),
    el("p", { class: "tiny muted", text: hint }),
  ]);
  return el("section", { class: "wrap", style: "margin-bottom: var(--sp-4);" }, [el("div", { class: "panel adm-site" }, [
    el("p", { class: "eyebrow", text: "Firebase 콘솔에 넣을 이 사이트 주소" }),
    row("① 작업 URL 맞춤설정 (비밀번호 재설정 메일 링크)", url, "Authentication › 템플릿 › 비밀번호 재설정 › 연필 › '작업 URL 맞춤설정'에 붙여 넣고 저장"),
    row("② 승인된 도메인 (Google 로그인)", host, "Authentication › 설정 › 승인된 도메인 › 도메인 추가에 붙여 넣기 (이미 있으면 그대로)"),
  ])]);
}

/* 관리자 — 삭제한 회원 · 탈퇴한 회원 (30일 보관 · 이용자 안내 복구 기간 7일) */
function trashBox(host, onChange) {
  clear(host);
  adminListTrash().then((r) => {
    clear(host);
    if (r.error) { host.append(noticeBox("info", r.error)); return; }
    const list = r.list || [];
    const d = el("details", { class: "panel adm-trash" }, [
      el("summary", {}, [el("span", { class: "adm-tr-h" }, [el("b", { text: `🗑 삭제 · 탈퇴한 회원 ${list.length}명` }), el("small", { text: "30일 보관 후 자동 삭제 · 이용자에겐 '7일 안 문의 시 복구'로 안내돼요" })]), el("span", { class: "op-chev", "aria-hidden": "true" })]),
    ]);
    if (!list.length) d.append(el("p", { class: "muted tiny", style: "padding:4px 2px 2px;", text: "삭제한 회원이 없어요." }));
    list.forEach((u) => {
      const lab = el("span", { text: "복구" });
      const btn = el("button", { type: "button", class: "btn btn-primary btn-sm" }, [lab]);
      // 스스로 탈퇴한 회원은 옛 로그인이 없어져서 → 다시 가입한 새 계정 이메일로 복구
      const mail = u.self ? el("input", { class: "input adm-tr-mail", type: "email", placeholder: "다시 가입한 이메일", value: u.email || "", autocomplete: "off" }) : null;
      let armed = false;
      btn.addEventListener("click", async () => {
        if (!armed) { armed = true; lab.textContent = "한 번 더 누르면 복구"; setTimeout(() => { armed = false; lab.textContent = "복구"; }, 4000); return; }
        btn.disabled = true; lab.textContent = "복구하는 중…";
        let to = null;
        if (u.self) {
          const want = (mail.value || "").trim().toLowerCase();
          const all = await adminListUsers();
          const hit = (all.users || []).filter((x) => !x.anonymous && (x.email || "").toLowerCase() === want && x.uid !== u.uid);
          if (!want || !hit.length) { btn.disabled = false; armed = false; lab.textContent = "복구"; toast("그 이메일로 다시 가입한 계정이 없어요. 먼저 다시 가입해 달라고 안내해 주세요."); mail.focus(); return; }
          to = hit[0].uid;
        }
        const res = await adminRestoreUser(u.uid, to);
        if (res.error) { btn.disabled = false; armed = false; lab.textContent = "복구"; toast(res.error); return; }
        toast(u.self ? `${u.name || u.email || "회원"}의 정보를 새 계정으로 옮겼어요 · 앱을 다시 열면 보여요` : `${u.name || u.email || "회원"}을(를) 복구했어요 · 다시 로그인할 수 있어요`); onChange && onChange();
      });
      d.append(el("div", { class: "adm-tr-row" }, [
        el("div", { class: "adm-tr-tx" }, [
          el("b", {}, [
            el("span", { text: u.name || (u.anonymous ? "게스트" : "(이름 없음)") }),
            el("i", { class: "adm-tr-kind", text: u.self ? "스스로 탈퇴" : "관리자 삭제" }),
            el("i", { class: "op-dday" + (u.left <= 3 ? " soon" : ""), text: `D-${u.left}` }),
          ]),
          el("small", { text: `${u.email || "이메일 없음"} · ${new Date(u.deletedAt).toLocaleDateString("ko-KR")} ${u.self ? "탈퇴" : "삭제"} · 저장한 풀이 ${u.nResults}건${u.late ? " · 안내한 복구 기간(7일) 지남" : ""}` }),
          mail,
        ]),
        el("div", { class: "adm-tr-btns" }, [btn, purgeBtn(u)]),
      ]));
    });
    host.append(d);
  });
}

/* 선물 상태 — 받기 전이면 '취소' (두 번 눌러 확인), 이미 받았으면 '받음' */
function giftState(x) {
  const box = el("span", { class: "adm-gl-st" });
  if (x.canceled) { box.append(el("i", { class: "gs-cx", text: "취소함" })); return box; }
  if (!x.id) { box.append(el("i", { class: "gs-old", text: "예전 기록" })); return box; }
  box.append(el("i", { class: "gs-wait", text: "확인 중…" }));
  adminGiftPending(x.uid, x.id).then((pending) => {
    clear(box);
    if (pending === null) { box.append(el("i", { class: "gs-old", text: "확인 못 함" })); return; }
    if (!pending) { box.append(el("i", { class: "gs-done", text: "✓ 받음" })); return; }
    const lab = el("span", { text: "받기 전 · 취소" });
    const b = el("button", { type: "button", class: "gs-btn" }, [lab]);
    let armed = false;
    b.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!armed) { armed = true; lab.textContent = "한 번 더 누르면 취소"; b.classList.add("armed"); setTimeout(() => { armed = false; lab.textContent = "받기 전 · 취소"; b.classList.remove("armed"); }, 4000); return; }
      b.disabled = true; lab.textContent = "취소하는 중…";
      const r = await adminCancelGift(x.uid, x.id);
      if (r.error) { toast(r.error); clear(box); box.append(el("i", { class: "gs-done", text: "✓ 받음" })); return; }
      markGiftCanceled(x.id); toast(`${x.name || "회원"}에게 보낸 코인 ${x.coins}개를 취소했어요`);
      window.dispatchEvent(new Event("hae-giftlog"));
    });
    box.append(b);
  });
  return box;
}

/* 휴지통 — 30일 기다리지 않고 바로 완전 삭제 (복구 불가 · 두 번 눌러 확인) */
function purgeBtn(u) {
  const lab = el("span", { text: "바로 완전 삭제" });
  const b = el("button", { type: "button", class: "adm-purge" }, [lab]);
  let armed = false;
  b.addEventListener("click", async () => {
    if (!armed) { armed = true; lab.textContent = "복구 못 해요 · 한 번 더 누르면 삭제"; b.classList.add("armed"); setTimeout(() => { armed = false; lab.textContent = "바로 완전 삭제"; b.classList.remove("armed"); }, 4500); return; }
    b.disabled = true; lab.textContent = "지우는 중…";
    const r = await adminPurgeUser(u.uid);
    if (r.error) { toast(r.error); b.disabled = false; armed = false; lab.textContent = "바로 완전 삭제"; b.classList.remove("armed"); return; }
    toast(`${u.name || u.email || "회원"}의 정보를 완전히 지웠어요`);
    window.dispatchEvent(new Event("hae-trash"));
  });
  return b;
}


/* =========================================================
   관리자 대시보드 (HAE) — 가입 · 방문 · 코인 · 문의 · 인기 풀이
   ========================================================= */
const DAY_MS = 864e5;
const dayStart = (t = Date.now()) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return +d; };
const OWNER_MAIL = "lumina.hae@gmail.com";
function joinedAt(u) {
  if (u.createdAt) return u.createdAt;
  // 대시보드 전에 가입한 회원 — 가장 이른 기록으로 짐작
  const st = u.state || {}, w = st["str.wallet.v1"] || {};
  const ts = [u.updatedAt, ...Object.values(st.__stamp || {}), ...(w.openLog || []).map((x) => x.t)].filter((x) => x > 0);
  return ts.length ? Math.min(...ts) : 0;
}
function paintDash(host, r, navigate) {
  const box = host.querySelector(".dash"); clear(box);
  if (r.error) { box.append(el("p", { class: "muted tiny", text: r.error })); return; }
  const users = (r.users || []).filter((u) => (u.email || "").toLowerCase() !== OWNER_MAIL);
  const t0 = dayStart(), w0 = t0 - 6 * DAY_MS;
  const logs = [];
  users.forEach((u) => ((u.state || {})["str.wallet.v1"] || {}).openLog?.forEach((x) => { if (x && x.t) logs.push(x); }));
  const sumC = (from) => logs.filter((x) => x.t >= from && x.c > 0).reduce((a, x) => a + x.c, 0);
  const joinT = users.filter((u) => joinedAt(u) >= t0).length, joinW = users.filter((u) => joinedAt(u) >= w0).length;
  const visitT = users.filter((u) => (u.updatedAt || 0) >= t0).length, visitW = users.filter((u) => (u.updatedAt || 0) >= w0).length;
  const coinT = sumC(t0), coinW = sumC(w0), coinAll = sumC(0);
  const tile = (em, label, big, sub, onClick, hot) => el(onClick ? "button" : "div", { class: "dash-t" + (hot ? " hot" : ""), type: onClick ? "button" : undefined, onclick: onClick }, [
    el("span", { class: "dash-l", text: `${em} ${label}` }), el("b", { class: "dash-n", text: String(big) }), el("small", { class: "dash-s", text: sub }),
  ]);
  const inqTile = tile("💬", "답변 대기 문의", "…", "불러오는 중", () => navigate("/inquiry"));
  box.append(
    el("div", { class: "dash-h" }, [el("p", { class: "eyebrow", text: "오늘의 해묘 · 대시보드" }), el("small", { class: "tiny muted", text: new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" }) })]),
    el("div", { class: "dash-grid" }, [
      tile("🌱", "오늘 가입", joinT, `7일 ${joinW}명 · 전체 ${users.length}명`),
      tile("👣", "오늘 들어온 회원", visitT, `7일 ${visitW}명`),
      tile("🪙", "오늘 쓴 코인", coinT, `7일 ${coinW}개 · 누적 ${coinAll}개`),
      inqTile,
    ]),
    topBox(logs),
    el("p", { class: "tiny muted dash-foot", text: "관리자 계정은 빼고 세요. 대시보드 전에 가입한 회원은 첫 기록 날짜로 가입일을 짐작해요." }),
  );
  adminInquiries().then((q) => {
    const n = q.error ? null : (q.list || []).filter((x) => x.status !== "done").length;
    inqTile.replaceWith(tile("💬", "답변 대기 문의", n == null ? "-" : n, n == null ? "불러오지 못했어요" : n ? "답변하러 가기 →" : "모두 답변했어요 ✓", () => navigate("/inquiry"), n > 0));
  });
}
function topBox(logs) {
  const RANGES = [["오늘", 0], ["7일", 6], ["30일", 29], ["전체", null]];
  let pick = 1;
  const list = el("div", { class: "dash-top" }), tabs = el("div", { class: "dash-tabs", role: "tablist" });
  const nameOf = (x) => (x.via === "view" ? (x.title || String(x.id).replace(/^view:/, "")) : openLabel(x.id));
  const paint = () => {
    clear(tabs); clear(list);
    RANGES.forEach(([lab], i) => tabs.append(el("button", { type: "button", role: "tab", "aria-selected": String(i === pick), class: "dash-tab" + (i === pick ? " on" : ""), onclick: () => { pick = i; paint(); } }, [el("span", { text: lab })])));
    const back = RANGES[pick][1], from = back == null ? 0 : dayStart() - back * DAY_MS;
    const m = new Map();
    logs.filter((x) => x.t >= from).forEach((x) => {
      const k = nameOf(x) || "(이름 없음)"; const v = m.get(k) || { n: 0, c: 0 };
      v.n++; v.c += x.c > 0 ? x.c : 0; m.set(k, v);
    });
    const top = [...m.entries()].sort((a, b) => b[1].n - a[1].n || b[1].c - a[1].c).slice(0, 5);
    if (!top.length) { list.append(el("p", { class: "tiny muted", style: "padding:6px 2px;", text: "이 기간엔 열린 풀이가 없어요." })); return; }
    const max = top[0][1].n;
    top.forEach(([k, v], i) => list.append(el("div", { class: "dash-r" }, [
      el("span", { class: "dash-rk" + (i === 0 ? " first" : ""), text: String(i + 1) }),
      el("div", { class: "dash-rb" }, [
        el("b", { text: k }),
        el("div", { class: "dash-bar" }, [el("i", { style: `width:${Math.max(6, Math.round((v.n / max) * 100))}%` })]),
      ]),
      el("div", { class: "dash-rv" }, [el("b", { text: `${v.n}회` }), el("small", { text: v.c ? `🪙 ${v.c}` : "무료" })]),
    ])));
  };
  paint();
  return el("div", { class: "dash-topbox" }, [el("div", { class: "dash-th" }, [el("b", { text: "🔥 많이 열린 풀이 TOP 5" }), tabs]), list]);
}

/* 공지 띄우기 — 모든 회원 홈 맨 위에 */
const TONES = { info: ["📢", "안내"], event: ["🎉", "이벤트"], fix: ["🛠", "점검"] };
function noticeEditor() {
  let tone = "info", cur = null;
  const ta = el("textarea", { class: "input nt-ta", rows: 3, maxlength: 140, placeholder: "예) 10월 31일 밤 11시~12시 점검이 있어요 · 신규 가입 코인 2배 이벤트 중 🎁" });
  const cnt = el("small", { class: "tiny muted", text: "0 / 140" });
  ta.addEventListener("input", () => { cnt.textContent = `${ta.value.length} / 140`; prev(); });
  const toneRow = el("div", { class: "nt-tones" });
  const preview = el("div", { class: "nt-prev" });
  const state = el("p", { class: "tiny muted nt-state", text: "지금 공지를 불러오는 중…" });
  const paintTones = () => { clear(toneRow); Object.entries(TONES).forEach(([k, [em, lab]]) => toneRow.append(el("button", { type: "button", class: "chip" + (k === tone ? " on" : ""), "aria-pressed": String(k === tone), onclick: () => { tone = k; paintTones(); prev(); } }, [el("span", { text: `${em} ${lab}` })]))); };
  const prev = () => { clear(preview); const t = ta.value.trim(); if (!t) return; preview.append(el("p", { class: "tiny muted", text: "미리 보기" }), noticeBanner({ text: t, tone }, null)); };
  const paintState = () => { state.textContent = cur && cur.on && cur.text ? `지금 떠 있는 공지 · ${TONES[cur.tone] ? TONES[cur.tone][0] : "📢"} ${cur.text} (${new Date(cur.updatedAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} 게시)` : "지금 떠 있는 공지가 없어요."; off.hidden = !(cur && cur.on); };
  const go = el("button", { type: "button", class: "btn btn-primary btn-sm" }, [el("span", { text: "공지 올리기" })]);
  const off = el("button", { type: "button", class: "btn btn-ghost btn-sm", hidden: true }, [el("span", { text: "공지 내리기" })]);
  go.addEventListener("click", async () => {
    if (!ta.value.trim()) { toast("공지 문장을 적어 주세요."); ta.focus(); return; }
    go.disabled = true; const r = await adminSetNotice({ text: ta.value, tone, on: true }); go.disabled = false;
    if (r.error) { toast(r.error); return; }
    cur = r.notice; paintState(); toast("공지를 올렸어요 · 회원 홈 맨 위에 떠요"); try { sessionStorage.removeItem("str.notice.v1"); } catch { /* ignore */ }
  });
  off.addEventListener("click", async () => {
    off.disabled = true; const r = await adminSetNotice({ text: cur ? cur.text : "", tone: cur ? cur.tone : "info", on: false }); off.disabled = false;
    if (r.error) { toast(r.error); return; }
    cur = r.notice; paintState(); toast("공지를 내렸어요"); try { sessionStorage.removeItem("str.notice.v1"); } catch { /* ignore */ }
  });
  paintTones();
  getNotice().then((n) => { cur = n; if (n && n.text) { ta.value = n.text; tone = TONES[n.tone] ? n.tone : "info"; cnt.textContent = `${ta.value.length} / 140`; paintTones(); prev(); } paintState(); if (n === null) state.textContent = "공지를 불러오지 못했어요. (Firestore 규칙에 notice 줄이 있는지 확인)"; });
  return el("section", { class: "wrap", style: "margin-bottom: var(--sp-4);" }, [el("div", { class: "panel nt-ed" }, [
    el("p", { class: "eyebrow", text: "공지 띄우기 · 모든 회원 홈 맨 위" }),
    toneRow, ta, el("div", { class: "nt-meta" }, [cnt]), preview, state,
    el("div", { class: "nt-btns" }, [go, off]),
  ])]);
}
/** 공지 띠 (홈 · 미리 보기 같이 씀) — onClose 없으면 닫기 버튼 없음 */
export function noticeBanner(n, onClose) {
  const [em] = TONES[n.tone] || TONES.info;
  return el("div", { class: "hn-bar tone-" + (TONES[n.tone] ? n.tone : "info"), role: "status" }, [
    el("span", { class: "hn-em", "aria-hidden": "true", text: em }),
    el("p", { class: "hn-tx", text: n.text }),
    onClose ? el("button", { type: "button", class: "hn-x", "aria-label": "공지 닫기", onclick: onClose }, [el("span", { text: "✕" })]) : null,
  ].filter(Boolean));
}
