import { el, clear, toast, copyText, validateBirthInput, icon, ymdPicker } from "../utils/dom.js";
import { sijinPicker, sijinLabel } from "./manseView.js";
import { inviteLinkFor } from "./invite.js";
import { getPeople, savePerson, deletePerson, getOwnBirth as getMyBirth, makeId, stash, getViewAs, setViewAs, getOwnBirth, reorderPeople } from "../state.js";
import { pageHeader, backLink, noticeBox, loadDisclaimer, openModal } from "./shared.js";
import { spend, getCoins, costOf, grantFriendBundle, isUnlocked, unlock, noCoinToast } from "../wallet.js";
import { computeSaju } from "../saju/manse.js";
import { benefactorCheck } from "../saju/guiin.js";
import { analyzeCompat } from "../saju/compat.js";
import { charmSpirits } from "../saju/spouse.js";
import { analyzeStrength } from "../saju/strength.js";
import { tenGod } from "../saju/fortune.js";
/* 친구 카드 — 펼친 카드 기억(이 탭 동안) · 순서 편집 모드 */
const OPEN_IDS = new Set();
export function renderPeople({ navigate }) {
  loadDisclaimer();
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(pageHeader("사람 · 친구", "내 사람들",
    "친구·가족·연인의 사주를 저장해 두면, 언제든 그 사람의 리포트를 보고 나와의 궁합·귀인 여부까지 바로 확인할 수 있어요."));

  const listWrap = el("section", { class: "wrap section-gap" });
  root.append(listWrap);

  let relFilter = "전체";
  function refresh() {
    clear(listWrap);
    const my = getMyBirth();

    // 내 정보 카드 (없으면 안내)
    if (my) {
      listWrap.append(personCard({
        name: (my.name || "나"), input: my, isMe: true, navigate, refresh,
      }));
    } else {
      listWrap.append(noticeBox("info",
        "‘나와 궁합·귀인 체크’를 하려면 먼저 내 출생 정보가 필요해요. 사주 정보를 한 번 입력하면 자동으로 저장됩니다."));
      listWrap.append(el("div", { style: "margin: var(--sp-3) 0;" }, [
        el("button", { class: "btn btn-primary btn-sm", onclick: () => navigate("/saju") },
          [icon("saju"), el("span", { text: "내 정보 먼저 입력" })]),
      ]));
    }

    // 친구 목록
    const people = getPeople();
    if (people.length) {
      listWrap.append(el("div", { class: "pp-head" }, [
        el("h2", { style: "font-size:1.05rem;", text: `저장한 친구 ${people.length}명` }),
        el("button", { type: "button", class: "btn btn-primary btn-sm pp-add", onclick: () => openAddChooser(refresh, navigate) }, [icon("plus"), el("span", { text: "친구 추가" })]),
      ]));
      const rels = [...new Set(people.map((p) => p.relation).filter(Boolean))];
      const cards = el("div", {});
      // 도구줄 — 모두 펼치기/접기 (순서는 왼쪽 손잡이를 끌어서)
      const allBtn = el("button", { type: "button", class: "pp-tool" });
      const paintTools = () => {
        const allOpen = people.every((p) => OPEN_IDS.has(p.id));
        allBtn.textContent = allOpen ? "모두 접기" : "모두 펼치기";
      };
      allBtn.addEventListener("click", () => { const allOpen = people.every((p) => OPEN_IDS.has(p.id)); people.forEach((p) => (allOpen ? OPEN_IDS.delete(p.id) : OPEN_IDS.add(p.id))); paintTools(); paintList(); });
      const saveOrder = () => {
        const ids = [...cards.querySelectorAll("[data-pid]")].map((n) => n.dataset.pid).filter((x) => x && x !== "me");
        reorderPeople(ids);
        people.splice(0, people.length, ...getPeople());
      };
      const paintList = () => {
        clear(cards);
        const all = relFilter === "전체";
        const shown = all ? people : relFilter === "미지정" ? people.filter((p) => !p.relation) : people.filter((p) => p.relation === relFilter);
        shown.forEach((p) => cards.append(personCard({
          name: p.name, input: p.input, id: p.id, relation: p.relation, navigate, refresh, hasMe: !!my,
          drag: all && shown.length > 1 ? { list: cards, onDrop: saveOrder } : null,
          open: OPEN_IDS.has(p.id), onToggle: (on) => { if (on) OPEN_IDS.add(p.id); else OPEN_IDS.delete(p.id); paintTools(); },
        })));
      };
      listWrap.append(el("div", { class: "pp-tools" }, [el("span", { class: "pp-tip", text: "카드를 끌어서 순서를 바꿔요 (폰은 꾹 누른 뒤)" }), allBtn]));
      paintTools();
      if (rels.length) {
        const opts = ["전체", ...rels, ...(people.some((p) => !p.relation) ? ["미지정"] : [])];
        if (!opts.includes(relFilter)) relFilter = "전체";
        const bar = el("div", { class: "rel-filter" }, opts.map((o) => {
          const n = o === "전체" ? people.length : o === "미지정" ? people.filter((p) => !p.relation).length : people.filter((p) => p.relation === o).length;
          const b = el("button", { type: "button", class: "chip rel-chip" + (o === relFilter ? " is-selected" : ""), text: `${o === "전체" || o === "미지정" ? "" : relEmoji(o) + " "}${o} ${n}` });
          b.addEventListener("click", () => { relFilter = o; bar.querySelectorAll("button").forEach((x) => x.classList.toggle("is-selected", x === b)); paintList(); });
          return b;
        }));
        listWrap.append(bar);
      }
      listWrap.append(cards); paintList();
    } else {
      listWrap.append(el("p", { class: "muted tiny", style: "margin-top: var(--sp-4);", text: "아직 저장한 친구가 없어요. 아래에서 추가해 보세요." }));
    }

    // 테마 (셔플릿식 큐레이션) — 친구 2명 이상 + 내 정보 있을 때
    if (my && people.length >= 1) listWrap.append(themesSection(my, people, navigate, refresh));
    if (my) listWrap.append(compatPlusBanner(navigate));
    if (my && people.length >= 1) listWrap.append(allRankSection(my, people, navigate, refresh));

    // 친구 추가
    listWrap.append(addSection(refresh, navigate));
  }

  refresh();
  return root;
}

/* ---- 테마 큐레이션 — 저장한 친구들을 사주로 랭킹 ---- */
function themesSection(my, people, navigate, refresh) {
  const mp = computeSaju(my);
  const scored = people.map((p) => {
    const fp = computeSaju(p.input);
    const charm = charmSpirits(fp);
    return {
      name: p.name || "친구", id: p.id, input: p.input,
      guiinToMe: benefactorCheck(mp, fp).score,          // 친구가 나에게
      guiinToThem: benefactorCheck(fp, mp).score,        // 내가 친구에게
      compat: analyzeCompat(mp, fp, { a: "나", b: p.name || "친구" }).score,
      charmScore: (charm.dohwa ? 2 : 0) + (charm.hongyeom ? 2 : 0) + (charm.hwagae ? 1 : 0),
      charm,
    };
  });
  const top = (key) => [...scored].sort((a, b) => b[key] - a[key]); // 전부 — 1~3위는 바로, 나머지는 ‘더 보기’

  const wrap = el("div", { style: "margin-top: var(--sp-6);" });
  wrap.append(el("div", { style: "display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom: var(--sp-3);" }, [
    el("h2", { class: "serif", style: "font-size:1.15rem;", text: "테마 — 내 사람 랭킹" }),
    el("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => { refresh(); toast("순위를 새로 계산했어요."); } }, [el("span", { text: "🔄 순위 새로고침" })]),
  ]));
  wrap.append(el("p", { class: "muted tiny", style: "margin-bottom: var(--sp-2);", text: `랭킹마다 코인 ${costOf("rank")}개로 한 번 열면, 사람을 더 추가해도 계속 무료로 업데이트돼요.` }));

  // 잠금 — 랭킹별로 한 번만 결제 (내 정보 기준, 사람 수와 무관)
  const gate = (key, eyebrow, title, ic, buildRows) => {
    const itemId = `rank:${key}:${my.birthDate}`;
    if (isUnlocked(itemId)) return themeCard(eyebrow, title, ic, buildRows());
    const cost = costOf("rank");
    const card = el("div", { class: "panel theme-card", style: "margin-top: var(--sp-3);" }, [
      el("p", { class: "eyebrow", text: eyebrow }),
      el("div", { style: "display:flex; align-items:center; gap:8px; margin:2px 0 10px;" }, [
        el("span", { style: "color:var(--c-gold); display:inline-flex;" }, [icon(ic)]),
        el("h3", { class: "serif", text: title }),
      ]),
      el("div", { class: "rank-blur", "aria-hidden": "true" }, [
        el("div", { class: "rank-row" }, [el("span", { class: "rank-medal gold", text: "①" }), el("span", { class: "rank-name", text: "??? " }), el("span", { class: "rank-meta muted tiny", text: "잠겨 있어요" })]),
        el("div", { class: "rank-row" }, [el("span", { class: "rank-medal", text: "②" }), el("span", { class: "rank-name", text: "??? " }), el("span", { class: "rank-meta muted tiny", text: "잠겨 있어요" })]),
      ]),
      el("button", { class: "btn btn-primary btn-block", style: "margin-top: var(--sp-3);", type: "button", onclick: () => {
        const r = unlock(itemId, cost);
        if (r.ok) { toast(`${title}을(를) 열었어요 · 앞으로 사람을 추가해도 무료로 업데이트돼요`); refresh(); }
        else { noCoinToast(); navigate("/store"); }
      } }, [el("span", { text: `코인 ${cost}개로 열기 · 보유 ${getCoins()}개` })]),
    ]);
    return card;
  };

  // 귀인 친구 찾기
  wrap.append(gate("guiin", "평생 꽉 잡아야 될", "귀인 친구 찾기", "compass",
    () => top("guiinToMe").map((s, i) => rankRow(i, s.name, `귀인지수 ${s.guiinToMe}`, navigate, s.id))));

  // 결혼운 (궁합 TOP)
  wrap.append(gate("marry", "결혼까지 간다면", "결혼운 순위", "heart",
    () => top("compat").map((s, i) => rankRow(i, s.name, `궁합 ${s.compat}%`, navigate, s.id))));

  // 도화살 순위
  wrap.append(gate("dohwa", "만나면 설레는", "도화살 순위", "sparkle",
    () => top("charmScore").map((s, i) => rankRow(i, s.name,
      [s.charm.dohwa ? "도화" : null, s.charm.hongyeom ? "홍염" : null, s.charm.hwagae ? "화개" : null].filter(Boolean).join("·") || "은은한 매력",
      navigate, s.id))));

  // 우정의 작대기 (양방향)
  const cupidId = `rank:cupid:${my.birthDate}`;
  if (!isUnlocked(cupidId)) {
    wrap.append(gate("cupid", "나 → 너  vs  너 → 나", "우정의 작대기", "users", () => []));
    return wrap;
  }
  const cupidRows = scored.slice().sort((a, b) => (b.guiinToMe + b.guiinToThem) - (a.guiinToMe + a.guiinToThem)).map((s) =>
      el("div", { class: "cupid-row" }, [
        el("span", { class: "cupid-name", text: s.name }),
        el("span", { class: "cupid-arrows" }, [
          el("span", { class: "cupid-a", title: "내가 그 친구에게 힘이 되는 정도", text: `나→ ${s.guiinToThem}` }),
          el("span", { class: "cupid-mid", text: s.guiinToMe > s.guiinToThem + 8 ? "←❤" : s.guiinToThem > s.guiinToMe + 8 ? "❤→" : "❤" }),
          el("span", { class: "cupid-b", title: "그 친구가 나에게 힘이 되는 정도", text: `${s.guiinToMe} ←너` }),
        ]),
      ]));
  const cf = foldRows(cupidRows);
  wrap.append(el("div", { class: "panel theme-card", style: "margin-top: var(--sp-3);" }, [
    rankHead([el("p", { class: "eyebrow", text: "나 → 너  vs  너 → 나" }), el("h3", { class: "serif", style: "margin:2px 0 12px;", text: "우정의 작대기" })], cf.tog),
    cf.top, cf.rest,
    el("p", { class: "muted tiny", style: "margin-top:8px;", text: "서로 힘이 되는 사이부터 순서대로 · 화살표는 ‘누가 더 힘이 되어 주는지’ 방향이에요. 재미로 봐 주세요." }),
  ].filter(Boolean)));

  return wrap;
}

/* 궁합 특집 바로가기 */
function compatPlusBanner(navigate) {
  return el("button", { type: "button", class: "deep-cta", style: "margin-top: var(--sp-5);", onclick: () => navigate("/compat-plus") }, [
    el("span", { class: "deep-cta-ic", text: "💞" }),
    el("span", { class: "deep-cta-txt" }, [el("b", { text: "궁합 특집 — 관계별로 깊이" }), el("span", { class: "tiny muted", text: "연인·친구·동료 정통 궁합 · 오행 · 일주 동물 · 재물 · 여행 · 선물·초콜릿·색" })]),
    el("span", { class: "deep-cta-go", text: "보기 ›" }),
  ]);
}

/* ---- 우리 모두 순위 (나 포함) — 각자의 사주로 매긴 순위 ---- */
const STEM_E2 = ["wood", "wood", "fire", "fire", "earth", "earth", "metal", "metal", "water", "water"];
const BR_E2 = ["water", "earth", "wood", "wood", "earth", "fire", "fire", "earth", "metal", "metal", "earth", "water"];
const BR_MAIN2 = [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8];
const KILL2 = { wood: "metal", fire: "water", earth: "wood", metal: "fire", water: "earth" };
const GUIIN2 = { 0: [1, 7], 4: [1, 7], 6: [1, 7], 1: [0, 8], 5: [0, 8], 2: [11, 9], 3: [11, 9], 7: [2, 6], 8: [5, 3], 9: [5, 3] };
const grp2 = (g) => (["비견", "겁재"].includes(g) ? "비겁" : ["식신", "상관"].includes(g) ? "식상" : ["편재", "정재"].includes(g) ? "재성" : ["편관", "정관"].includes(g) ? "관성" : "인성");
function selfScores(p, gender) {
  const ds = p.pillars.day.stemIdx, db = p.pillars.day.branchIdx;
  const S = analyzeStrength(p), help = new Set(S.yongsin), gi = KILL2[S.yongsin[0]];
  const t = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  ["year", "month", "day", "hour"].forEach((k) => { const x = p.pillars[k]; if (!x) return; if (k !== "day") t[grp2(tenGod(ds, x.stemIdx))]++; t[grp2(tenGod(ds, BR_MAIN2[x.branchIdx]))]++; });
  const Y = new Date().getFullYear(), ys = ((Y - 4) % 10 + 10) % 10, yb = ((Y - 4) % 12 + 12) % 12;
  const ygod = grp2(tenGod(ds, ys));
  const strong = S.level != null ? S.level : (S.strength === "신강" ? 1 : S.strength === "신약" ? -1 : 0);
  const clamp = (v) => Math.max(20, Math.min(99, Math.round(v)));
  const year = clamp(60 + (help.has(STEM_E2[ys]) ? 14 : 0) + (help.has(BR_E2[yb]) ? 8 : 0) - (STEM_E2[ys] === gi ? 12 : 0) - (Math.abs(yb - db) === 6 ? 8 : 0));
  const wealth = clamp(48 + t.재성 * 9 + t.식상 * 5 + (t.재성 && t.비겁 >= 1 ? 6 : 0) - (t.재성 >= 4 && t.비겁 === 0 ? 8 : 0) + (help.has({ wood: "earth", fire: "metal", earth: "water", metal: "wood", water: "fire" }[p.dayMasterElem]) ? 8 : 0));
  const sp = gender === "male" ? t.재성 : t.관성;
  const charm = charmSpirits(p);
  const marry = clamp(52 + (sp >= 1 && sp <= 2 ? 16 : sp >= 3 ? 6 : -6) + (help.has(BR_E2[db]) ? 10 : 0) + (["year", "month", "hour"].some((k) => p.pillars[k] && Math.abs(p.pillars[k].branchIdx - db) === 6) ? -8 : 4) + (charm.dohwa ? 4 : 0) + t.인성 * 2);
  const charmS = clamp(40 + (charm.dohwa ? 22 : 0) + (charm.hongyeom ? 16 : 0) + (charm.hwagae ? 6 : 0) + t.식상 * 6);
  const career = clamp(48 + t.관성 * 8 + t.인성 * 5 + (t.관성 && t.인성 ? 8 : 0) + (S.yongsin.some((e) => e === { wood: "metal", fire: "water", earth: "wood", metal: "fire", water: "earth" }[p.dayMasterElem]) ? 6 : 0));
  const loveYear = clamp(50 + ((gender === "male" ? ["재성"] : ["관성"]).includes(ygod) ? 22 : 0) + (ygod === "식상" ? 10 : 0) + (charm.dohwa ? 6 : 0) + (Math.abs(yb - db) === 6 ? 6 : 0));
  const guiin = clamp(45 + ["year", "month", "day", "hour"].filter((k) => p.pillars[k] && (GUIIN2[ds] || []).includes(p.pillars[k].branchIdx)).length * 18 + t.인성 * 4);
  const counts = Object.values(p.elementCounts || {}); const mean = counts.reduce((a, b) => a + b, 0) / 5;
  const health = clamp(90 - counts.reduce((a, b) => a + (b - mean) ** 2, 0) * 6 - counts.filter((v) => v === 0).length * 6);
  return { year, wealth, marry, charm: charmS, career, loveYear, guiin, health };
}
const RANKS = [
  ["year", "🌅", `올해운 TOP`, "올해 세운이 가장 순풍인 사람"], ["wealth", "💰", "재물운 순위", "타고난 재물 그릇"], ["marry", "💍", "결혼운 순위", "각자의 결혼운 · 나와의 궁합 아님"],
  ["charm", "🌸", "도화·매력 순위", "도화·홍염·표현력"], ["loveYear", "💗", "올해 연애운 순위", "올해 인연이 들어오는 사람"], ["career", "💼", "성공·명예운 순위", "관성·인성으로 본 출세운"],
  ["guiin", "🧭", "귀인복 순위", "천을귀인·도움 받는 복"], ["health", "🌿", "건강 균형 순위", "오행이 고른 사람"],
];
function allRankSection(my, people, navigate, refresh) {
  const all = [{ name: `${my.name || "나"} (나)`, me: true, input: my }, ...people.map((p) => ({ name: p.name || "친구", id: p.id, input: p.input }))];
  const rows = all.map((x) => { try { return { ...x, sc: selfScores(computeSaju(x.input), x.input.gender) }; } catch { return null; } }).filter(Boolean);
  const allId = `rankall:${my.birthDate}`, costA = costOf("rankall");
  let cur = window.__rankCur || "year";
  const wrap = el("div", { style: "margin-top: var(--sp-6);" });
  function paint() {
    clear(wrap);
    wrap.append(el("h2", { class: "serif", style: "font-size:1.15rem;", text: "우리 모두 순위 · 나 포함" }),
      el("p", { class: "muted tiny", style: "margin:4px 0 10px;", text: "나와의 궁합이 아니라, 각자의 사주로 매긴 순위예요. 사람을 추가하면 자동으로 다시 매겨져요." }),
      el("div", { class: "rk-tabs" }, RANKS.map(([k, em, t]) => el("button", { type: "button", class: "rk-tab" + (cur === k ? " on" : ""), onclick: () => { cur = k; window.__rankCur = k; paint(); } }, [el("span", { class: "rk-em", text: em }), el("span", { text: t.replace(" 순위", "").replace(" TOP", "") })]))));
    const R = RANKS.find((x) => x[0] === cur);
    const one = `rankself:${cur}:${my.birthDate}`;
    if (!isUnlocked(allId) && !isUnlocked(one)) {
      const c1 = costOf("rankself");
      wrap.append(el("div", { class: "panel theme-card" }, [
        el("p", { class: "eyebrow", text: R[3] }), el("h3", { class: "serif", style: "margin:2px 0 10px;", text: `${R[1]} ${R[2]}` }),
        el("div", { class: "rank-blur", "aria-hidden": "true" }, [1, 2, 3].map((i) => el("div", { class: "rank-row" }, [el("span", { class: "rank-medal", text: ["①", "②", "③"][i - 1] }), el("span", { class: "rank-name", text: "???" }), el("span", { class: "rank-meta muted tiny", text: "잠겨 있어요" })]))),
        el("div", { class: "dd-buy" }, [
          el("button", { class: "btn btn-primary btn-block", type: "button", onclick: () => { const r = unlock(allId, costA); if (r.ok) { toast("순위 8가지를 모두 열었어요"); paint(); } else noCoinToast(costA); } }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: `순위 8가지 전부 열기 · 코인 ${costA}개` })]),
          el("button", { class: "btn btn-ghost btn-block", type: "button", onclick: () => { const r = unlock(one, c1); if (r.ok) { toast(`${R[2]}을(를) 열었어요`); paint(); } else noCoinToast(c1); } }, [el("span", { text: `이 순위만 열기 · 코인 ${c1}개` })]),
        ]),
      ]));
      return;
    }
    const sorted = rows.slice().sort((a, b) => b.sc[cur] - a.sc[cur]);
    const meAt = sorted.findIndex((x) => x.me);
    const af = foldRows(sorted.map((x, i) => el("div", { class: "rank-row rk-row" + (x.me ? " me" : "") }, [
        el("span", { class: "rank-medal" + (i === 0 ? " gold" : ""), text: ["①", "②", "③"][i] || String(i + 1) }),
        el("span", { class: "rank-name", text: x.name }),
        el("span", { class: "rk-bar" }, [el("i", { style: `width:${x.sc[cur]}%` })]),
        el("span", { class: "rank-meta tiny", text: String(x.sc[cur]) }),
      ])));
    wrap.append(el("div", { class: "panel theme-card" }, [
      rankHead([el("p", { class: "eyebrow", text: R[3] }), el("h3", { class: "serif", style: "margin:2px 0 10px;", text: `${R[1]} ${R[2]}` })], af.tog),
      af.top, af.rest,
      meAt >= 3 ? el("p", { class: "rk-me-hint tiny", text: `나는 ${meAt + 1}위 · 오른쪽 위 ‘전체 ${sorted.length}명’에서 볼 수 있어요` }) : null,
      el("p", { class: "muted tiny", style: "margin-top:8px;", text: "사주로 본 재미용 순위예요. 점수가 낮아도 노력과 선택이 더 크게 작용해요." }),
    ].filter(Boolean)));
  }
  paint();
  return wrap;
}

/* 1~3위만 먼저 · 오른쪽 위 '전체 n명' 버튼으로 나머지 펼치기 (랭킹 카드 공통) */
function foldRows(rows) {
  const more = rows.length > 3;
  const rest = more ? el("div", { class: "rank-rest", hidden: true }, rows.slice(3)) : null;
  const tog = more ? el("button", { type: "button", class: "rank-all", "aria-expanded": "false" }, [el("span", { text: `전체 ${rows.length}명` }), el("i", { class: "chev-line", "aria-hidden": "true" })]) : null;
  if (tog) tog.addEventListener("click", () => {
    const on = rest.hidden; rest.hidden = !on;
    tog.setAttribute("aria-expanded", on ? "true" : "false"); tog.classList.toggle("on", on);
    tog.firstChild.textContent = on ? "접기" : `전체 ${rows.length}명`;
  });
  return { top: el("div", { class: "rank-top" }, rows.slice(0, 3)), rest, tog };
}
const rankHead = (kids, tog) => el("div", { class: "rank-head" }, [el("div", { class: "rank-head-t" }, kids), tog].filter(Boolean));
function themeCard(eyebrow, title, ic, rows) {
  const f = foldRows(rows);
  return el("div", { class: "panel theme-card", style: "margin-top: var(--sp-3);" }, [
    rankHead([
      el("p", { class: "eyebrow", text: eyebrow }),
      el("div", { style: "display:flex; align-items:center; gap:8px; margin:2px 0 10px;" }, [
        el("span", { style: "color:var(--c-gold); display:inline-flex;" }, [icon(ic)]),
        el("h3", { class: "serif", text: title }),
      ]),
    ], f.tog),
    rows.length ? f.top : el("p", { class: "muted tiny", text: "친구를 더 추가하면 랭킹이 채워져요." }),
    f.rest,
  ].filter(Boolean));
}

function rankRow(i, name, meta, navigate, id) {
  const medal = ["①", "②", "③"][i] || `${i + 1}`;
  return el("div", { class: "rank-row" }, [
    el("span", { class: "rank-medal" + (i === 0 ? " gold" : "") + (i > 2 ? " num" : ""), text: medal }),
    el("span", { class: "rank-name" }, [
      el("span", { text: name }),
      (() => { const r = id && (getPeople().find((p) => p.id === id) || {}).relation; return r ? el("span", { class: "rel-tag", text: `${relEmoji(r)} ${r}` }) : null; })(),
    ].filter(Boolean)),
    el("span", { class: "rank-meta muted tiny", text: meta }),
  ]);
}

/* ---- 사람 카드 ---- */
function personCard({ name, input, id, isMe, hasMe, navigate, refresh, relation, drag = null, open = true, onToggle = null }) {
  const summary = `${input.birthDate || "생일 미입력"}${input.timeUnknown ? " · 시간 모름" : (input.birthTime ? " · " + sijinLabel(input) : "")}` +
    (input.calendarType === "lunar" ? " · 음력" : "");
  const gLabel = input.gender === "female" ? "여성" : input.gender === "male" ? "남성" : "";

  const btns = [
    actBtn("saju", "사주", "primary", () => { stash("saju:input", input); navigate("/saju/loading"); }),
    actBtn("sparkle", "자미두수", "ghost", () => { stash("ziwei:input", input); navigate("/ziwei/result"); }),
  ];
  if (!isMe && id) {
    const viewing = (getViewAs() || {}).id === id;
    btns.unshift(actBtn("eye", viewing ? "이 사람 시점 보는 중 · 해제" : "이 사람 시점으로 보기", viewing ? "quiet" : "primary", () => {
      setViewAs(viewing ? null : id);
      toast(viewing ? "내 시점으로 돌아왔어요." : `이제 ${name} 님 시점으로 모든 운세를 봐요.`);
      if (!viewing) navigate("/"); else refresh();
    }));
  }
  if (!isMe) {
    btns.push(actBtn("users", "나와 궁합", "ghost", () => {
      const my = getMyBirth();
      if (!my) { toast("먼저 내 정보를 입력해 주세요."); return; }
      stash("compat:input", { a: my, b: input }); navigate("/compat/result");
    }));
    btns.push(actBtn("compass", "나에게 귀인?", "gold", () => {
      const my = getMyBirth();
      if (!my) { toast("먼저 내 정보를 입력해 주세요."); return; }
      stash("guiin:input", { me: my, other: input }); navigate("/guiin/result");
    }));
  } else {
    btns.push(actBtn("info", "정보 수정", "quiet", () => navigate("/saju")));
  }
  if (!isMe && id) {
    btns.push(actBtn("info", "정보 수정", "quiet", () => {
      const person = getPeople().find((p) => p.id === id);
      if (!person) return;
      const m = openModal([], { title: `${name} 님 정보 수정` });
      m.body.append(buildAddForm(() => { m.close(); refresh(); }, navigate, person));
    }));
  }

  const grip = drag ? el("span", { class: "pp-grip", role: "button", tabindex: "0", "aria-label": `${name} 순서 옮기기 (끌거나 위·아래 화살표)` }, [el("i"), el("i"), el("i"), el("i"), el("i"), el("i")]) : null;
  const head = el("div", { style: "display:flex; align-items:center; gap:10px;" }, [
    el("span", { style: "color:var(--c-gold); display:inline-flex;" }, [icon(isMe ? "saju" : "users")]),
    el("div", { style: "flex:1; min-width:0;" }, [
      el("p", { style: "font-weight:700; display:flex; align-items:center; gap:6px;" }, [
        el("span", { text: name }),
        isMe ? el("span", { style: "font-size:0.68rem; font-weight:700; color:var(--c-gold); border:1px solid var(--c-gold-line); border-radius:999px; padding:1px 8px;", text: "나" }) : null,
        gLabel ? el("span", { class: "muted tiny", text: gLabel }) : null,
        relation ? el("span", { class: "rel-tag", text: `${relEmoji(relation)} ${relation}` }) : null,
      ].filter(Boolean)),
      el("p", { class: "muted tiny", text: summary }),
    ]),
    id ? delBtn(name, id, refresh) : null,
    onToggle ? el("span", { class: "pp-chev", "aria-hidden": "true" }) : null,
    grip, // 오른손으로 잡기 쉽게 맨 오른쪽
  ].filter(Boolean));

  const body = el("div", { class: "btn-row pp-body", style: "margin-top:12px; flex-wrap:wrap; gap:8px;" }, btns);
  const card = el("div", { class: "panel pp-card" + (onToggle ? " pp-fold" : "") + (open || !onToggle ? " pp-open" : ""), "data-pid": id || "me", style: "margin-top: var(--sp-3);" }, [head, body]);
  if (grip) attachDrag(grip, card, drag, head);
  if (onToggle) {
    head.classList.add("pp-head-btn");
    head.setAttribute("role", "button"); head.setAttribute("tabindex", "0"); head.setAttribute("aria-expanded", open ? "true" : "false");
    const toggle = (e) => {
      if (e.target.closest("button, .pp-grip") || card.dataset.justDragged) return; // 삭제 버튼 · 손잡이 · 방금 끌어 놓은 건 그대로
      const on = !card.classList.contains("pp-open");
      card.classList.toggle("pp-open", on); head.setAttribute("aria-expanded", on ? "true" : "false"); onToggle(on);
    };
    head.addEventListener("click", toggle);
    head.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(e); } });
  }
  return card;
}

/* 카드 끌어서 순서 바꾸기 (HAE)
   · ⠿ 손잡이: 누르자마자 끌기
   · 카드 머리: 마우스는 살짝 끌면 바로, 손가락은 꾹(0.35초) 누른 뒤 끌기 — 그냥 스크롤과 안 헷갈리게
   · 화살표 키(손잡이에 초점)로도 위·아래 */
function attachDrag(grip, card, { list, onDrop }, head) {
  let startDoc = 0, dragging = false, raf = 0, lastY = 0, cap = null, pend = null;
  const docY = (y) => y + window.scrollY;
  const settle = () => {
    const dy = docY(lastY) - startDoc;
    const prev = card.previousElementSibling, next = card.nextElementSibling;
    if (dy < 0 && prev && prev.dataset.pid && -dy > prev.offsetHeight / 2) {
      const t0 = card.offsetTop; list.insertBefore(prev, card.nextSibling); startDoc += card.offsetTop - t0; // 끌고 있는 카드는 그대로, 옆 카드를 옮김
    } else if (dy > 0 && next && next.dataset.pid && dy > next.offsetHeight / 2) {
      const t0 = card.offsetTop; list.insertBefore(next, card); startDoc += card.offsetTop - t0;
    }
    card.style.transform = `translateY(${docY(lastY) - startDoc}px)`;
  };
  const tick = () => {
    if (!dragging) return;
    const edge = 90, vh = window.innerHeight;
    const v = lastY < edge ? -Math.ceil((edge - lastY) / 6) : lastY > vh - edge - 70 ? Math.ceil((lastY - (vh - edge - 70)) / 6) : 0; // 화면 끝에 가면 저절로 스크롤
    if (v) { window.scrollBy(0, v); settle(); }
    raf = requestAnimationFrame(tick);
  };
  const begin = (y, node, pid) => {
    dragging = true; lastY = y; startDoc = docY(y); cap = node;
    try { node.setPointerCapture(pid); } catch { /* ignore */ }
    card.classList.add("pp-dragging"); list.classList.add("pp-sorting");
    if (navigator.vibrate) try { navigator.vibrate(10); } catch { /* ignore */ }
    raf = requestAnimationFrame(tick);
  };
  const end = () => {
    if (pend) { clearTimeout(pend.timer); pend = null; }
    if (!dragging) return;
    dragging = false; cancelAnimationFrame(raf); cap = null;
    card.style.transform = ""; card.classList.remove("pp-dragging"); list.classList.remove("pp-sorting");
    card.classList.add("pp-dropped"); setTimeout(() => card.classList.remove("pp-dropped"), 450);
    card.dataset.justDragged = "1"; setTimeout(() => { delete card.dataset.justDragged; }, 60); // 놓을 때 '펼치기'가 같이 눌리지 않게
    onDrop();
  };
  const onMove = (e) => {
    if (pend && !dragging) {
      const moved = Math.abs(e.clientY - pend.y) + Math.abs(e.clientX - pend.x);
      if (pend.mouse && moved > 6) { const p = pend; pend = null; begin(e.clientY, p.node, e.pointerId); }
      else if (!pend.mouse && moved > 10) { clearTimeout(pend.timer); pend = null; } // 손가락이 먼저 움직이면 그냥 스크롤
      return;
    }
    if (!dragging) return;
    e.preventDefault(); lastY = e.clientY; settle();
  };
  const bind = (node) => {
    node.addEventListener("pointermove", onMove);
    node.addEventListener("pointerup", end);
    node.addEventListener("pointercancel", end);
    node.addEventListener("lostpointercapture", () => { if (dragging) end(); });
  };
  grip.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    e.preventDefault(); e.stopPropagation();
    begin(e.clientY, grip, e.pointerId);
  });
  bind(grip);
  if (head) {
    head.addEventListener("pointerdown", (e) => {
      if (e.button > 0 || e.target.closest("button, .pp-grip")) return;
      const mouse = e.pointerType === "mouse";
      pend = { x: e.clientX, y: e.clientY, mouse, node: head };
      if (!mouse) {
        const pid = e.pointerId, y0 = e.clientY;
        pend.timer = setTimeout(() => { if (pend) { pend = null; begin(y0, head, pid); } }, 350);
      }
    });
    head.addEventListener("contextmenu", (e) => { if (dragging || pend) e.preventDefault(); }); // 꾹 누를 때 뜨는 메뉴 막기
    bind(head);
    // 손가락으로 끄는 동안엔 화면이 같이 스크롤되지 않게
    head.addEventListener("touchmove", (e) => { if (dragging) e.preventDefault(); }, { passive: false });
  }
  grip.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const sib = e.key === "ArrowUp" ? card.previousElementSibling : card.nextElementSibling;
    if (!sib || !sib.dataset.pid) return;
    if (e.key === "ArrowUp") list.insertBefore(card, sib); else list.insertBefore(sib, card);
    grip.focus(); onDrop();
  });
}

/* 삭제 — 네이티브 confirm 없이 2탭 확인 (일부 환경에서 confirm이 막혀 삭제가 안 되던 문제 수정) */
function delBtn(name, id, refresh) {
  let armed = false, timer = null;
  const btn = el("button", { class: "btn btn-quiet btn-sm", "aria-label": name + " 삭제" }, [icon("trash")]);
  btn.addEventListener("click", () => {
    if (!armed) {
      armed = true;
      clear(btn); btn.append(el("span", { style: "color:var(--c-danger); font-weight:700;", text: "삭제?" }));
      timer = setTimeout(() => { armed = false; clear(btn); btn.append(icon("trash")); }, 3000);
      return;
    }
    if (timer) clearTimeout(timer);
    const backup = getPeople().find((p) => p.id === id);
    deletePerson(id);
    toast(`'${name}' 님을 삭제했어요.`, { label: "되돌리기", onClick: () => { if (backup) { savePerson(backup); toast(`'${name}' 님을 되살렸어요.`); refresh(); } } });
    refresh();
  });
  return btn;
}

function actBtn(ic, label, kind, onClick) {
  const cls = kind === "primary" ? "btn btn-primary btn-sm"
    : kind === "quiet" ? "btn btn-quiet btn-sm" : "btn btn-ghost btn-sm";
  const attrs = { class: cls, onclick: onClick };
  if (kind === "gold") attrs.style = "color:var(--c-gold); border-color:var(--c-gold-line);";
  return el("button", attrs, [icon(ic), el("span", { text: label })]);
}

/* ---- 친구 추가 폼 (접었다 펴기) ---- */
function addSection(refresh, navigate) {
  const wrap = el("div", { style: "margin-top: var(--sp-6); display:flex; flex-direction:column; gap: var(--sp-3);" });
  const addCost = costOf("friendadd");
  const toggle = el("button", { class: "btn btn-ghost btn-block" }, [icon("plus"), el("span", { text: `직접 친구 추가 · 코인 ${addCost}` })]);
  const kakao = el("button", { class: "btn btn-primary btn-block", onclick: () => inviteFriend() }, [icon("share"), el("span", { text: "링크로 초대해서 추가 · 무료" })]);
  const hint = el("p", { class: "muted tiny", style: "text-align:center; margin-top:8px;", text: "초대 링크를 보내면 내 정보도 같이 가서 서로 친구로 추가돼요 · 무료! 어느 방식이든 추가하면 그 친구의 사주·나와의 궁합·자미두수·귀인 여부를 무료로 볼 수 있어요." });
  toggle.addEventListener("click", () => {
    const m = openModal([], { title: "직접 친구 추가" });
    m.body.append(buildAddForm(() => { m.close(); refresh(); }, navigate));
  });
  wrap.append(kakao, toggle, hint);
  return wrap;
}

/* 목록 위 '친구 추가' — 링크 초대(무료) / 직접 추가(코인) 선택 */
function openAddChooser(refresh, navigate, { title = "친구 추가", note = "" } = {}) {
  const addCost = costOf("friendadd");
  const m = openModal([], { title });
  const direct = el("button", { type: "button", class: "btn btn-ghost btn-block" }, [icon("plus"), el("span", { text: `직접 입력해서 추가 · 코인 ${addCost}` })]);
  direct.addEventListener("click", () => {
    clear(m.body);
    if (note) m.body.append(el("p", { class: "muted tiny", style: "margin-bottom:8px;", text: note }));
    m.body.append(buildAddForm(() => { m.close(); refresh(); }, navigate));
  });
  m.body.append(
    el("div", { style: "display:flex; flex-direction:column; gap:10px;" }, [
      el("button", { type: "button", class: "btn btn-primary btn-block", onclick: () => { m.close(); inviteFriend(); } }, [icon("share"), el("span", { text: "링크로 초대해서 추가 · 무료" })]),
      direct,
      el("p", { class: "muted tiny", style: "text-align:center;", text: "초대 링크로 들어오면 서로 친구로 추가돼요. 어느 방식이든 그 친구의 사주·궁합·자미두수·귀인은 무료로 볼 수 있어요." }),
    ]),
  );
}

async function inviteFriend() {
  const mine = getMyBirth();
  const link = inviteLinkFor(mine);
  const text = mine
    ? "해묘에서 서로 친구 하자! 내 생일은 링크에 같이 넣었어. 너도 생일만 입력하면 서로 친구 추가되고 궁합도 볼 수 있어 🐈\n"
    : "해묘에서 너랑 궁합 보려고! 아래 링크 눌러서 생일만 입력하고 다시 보내줘 🐈\n";
  if (navigator.share) {
    try { await navigator.share({ title: "해묘 친구 초대", text, url: link }); return; }
    catch (e) { if (e && e.name === "AbortError") return; }
  }
  const ok = await copyText(link);
  toast(ok ? "초대 링크를 복사했어요. 카톡·문자·DM 어디든 붙여넣어 보내세요." : "복사에 실패했어요.");
}

export function buildAddForm(onSaved, navigate, existing = null) {
  const form = el("form", { class: "panel section-gap", novalidate: true });

  const nameI = el("input", { class: "input", type: "text", maxlength: "20", placeholder: "예: 지민 / 엄마 / 그 사람" });
  const dateI = ymdPicker("", { mode: () => ({ lunar: (calSeg.querySelector("input:checked") || {}).value === "lunar", leap: leapC.checked }) });
  const timeI = el("input", { class: "input", type: "time" });
  const unknownC = el("input", { type: "checkbox" });
  unknownC.addEventListener("change", () => { timeI.disabled = unknownC.checked; timeI.style.opacity = unknownC.checked ? "0.5" : "1"; });

  const calSeg = seg("p-cal", [{ v: "solar", label: "양력" }, { v: "lunar", label: "음력" }], "solar");
  const leapC = el("input", { type: "checkbox" });
  const leapWrap = el("label", { class: "chip", style: "width:fit-content; margin-top:8px; display:none;" }, [
    leapC, el("span", { class: "check" }, [icon("check")]), el("span", { text: "윤달(閏月)" }),
  ]);
  calSeg.addEventListener("change", () => { leapWrap.style.display = calSeg.querySelector('input[value="lunar"]').checked ? "" : "none"; });

  const relPick = relationPicker(existing ? existing.relation : "");
  const genSeg = seg("p-gender", [{ v: "female", label: "여성" }, { v: "male", label: "남성" }], "");
  const errBox = el("p", { class: "field-error", "aria-live": "polite" });
  const sijin = sijinPicker(timeI, () => ({ birthDate: dateI.value, birthTime: timeI.value, timeUnknown: unknownC.checked,
    calendarType: calSeg.querySelector("input:checked")?.value || "solar", leapMonth: leapC.checked }));
  [unknownC, dateI, calSeg, leapC].forEach((x) => x.addEventListener("change", () => sijin.refresh()));

  if (existing) {
    const ex = existing.input || {};
    nameI.value = existing.name && existing.name !== "이름없음" ? existing.name : (ex.name || "");
    dateI.value = ex.birthDate || "";
    timeI.value = ex.birthTime || "";
    unknownC.checked = !!ex.timeUnknown;
    timeI.disabled = unknownC.checked; timeI.style.opacity = unknownC.checked ? "0.5" : "1";
    const calR = calSeg.querySelector(`input[value="${ex.calendarType === "lunar" ? "lunar" : "solar"}"]`); if (calR) calR.checked = true;
    leapC.checked = !!ex.leapMonth;
    leapWrap.style.display = ex.calendarType === "lunar" ? "" : "none";
    const gR = ex.gender && genSeg.querySelector(`input[value="${ex.gender}"]`); if (gR) gR.checked = true;
    sijin.refresh();
  }

  form.append(
    fld("이름 / 호칭", nameI, "실명이 아니어도 돼요. 목록에 표시됩니다."),
    fld("생년월일", dateI, null, true),
    fld("달력 기준", el("div", {}, [calSeg, leapWrap]), "음력이면 자동으로 양력 변환해 계산해요."),
    fld("출생 시간", el("div", { class: "section-gap" }, [
      timeI,
      el("label", { class: "chip", style: "width:fit-content;" }, [unknownC, el("span", { class: "check" }, [icon("check")]), el("span", { text: "시간 모름" })]),
      sijin,
    ]), "모르면 시주를 빼고 봅니다."),
    fld("성별", genSeg, "대운 방향 계산에 필요해요.", true),
    fld("나와의 관계", relPick, "선택 안 해도 돼요. 목록에서 관계별로 모아 볼 수 있어요."),
    errBox,
    el("div", { class: "btn-row", style: "margin-top: var(--sp-3);" }, [
      el("button", { type: "submit", class: "btn btn-primary btn-sm" }, [icon("check"), el("span", { text: existing ? "수정 저장" : "저장" })]),
    ]),
  );

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = {
      name: nameI.value.trim(),
      birthDate: dateI.value,
      birthTime: timeI.value,
      timeUnknown: unknownC.checked,
      calendarType: calSeg.querySelector("input:checked")?.value || "solar",
      leapMonth: leapC.checked,
      gender: genSeg.querySelector("input:checked")?.value || "",
      timezone: "Asia/Seoul",
      focus: ["personality", "relationship", "love"],
    };
    const { ok, errors } = validateBirthInput(input);
    if (!ok) { errBox.textContent = errors.birthDate || errors.gender || errors.birthTime || "입력을 확인해 주세요."; return; }
    // 수정: 코인 없이 그대로 덮어쓰기 (순서·id 유지)
    if (existing) {
      const fixed = { ...(existing.input || {}), ...input, focus: (existing.input && existing.input.focus) || input.focus };
      savePerson({ ...existing, name: input.name || "이름없음", relation: relPick.getValue(), input: fixed, updatedAt: Date.now() });
      grantFriendBundle(getMyBirth(), fixed);
      toast(`'${input.name || "이름없음"}' 님 정보를 수정했어요.`);
      onSaved();
      return;
    }
    // 직접 입력 추가는 코인 10개
    const addCost = costOf("friendadd");
    const r = spend(addCost, { kind: "friendadd" });
    if (!r.ok) {
      errBox.textContent = `직접 추가는 코인 ${addCost}개가 필요해요. (보유 ${getCoins()}개) · 초대 링크로 추가하면 무료예요.`;
      if (navigate) navigate("/store");
      return;
    }
    grantFriendBundle(getMyBirth(), input); // 사주·궁합·자미·귀인 무료 열람
    savePerson({ id: makeId("p"), name: input.name || "이름없음", relation: relPick.getValue(), input, createdAt: Date.now() });
    toast(`친구를 저장했어요 · 코인 ${addCost} 차감 · 이 친구의 궁합·귀인은 무료!`);
    onSaved();
  });

  return form;
}

/* ---- 다른 화면에서 입력한 사람 → 내 사람 저장 (항상 코인 10개 · 초대 링크만 무료) ---- */
function samePerson(a, input) {
  return a && a.birthDate === input.birthDate && (a.gender || "") === (input.gender || "") &&
    (!!a.timeUnknown === !!input.timeUnknown) && (input.timeUnknown || (a.birthTime || "") === (input.birthTime || ""));
}
/** 이미 저장된 사람 찾기 — 나 자신이면 "self", 저장돼 있으면 그 사람, 없으면 null */
export function findSavedPerson(input) {
  if (!input || !input.birthDate) return null;
  if (samePerson(getOwnBirth(), input)) return "self";
  return getPeople().find((p) => samePerson(p.input, input)) || null;
}
/**
 * 새 사람 직접 입력 — 입력하는 순간 코인 10개를 쓰고 내 사람에 바로 저장 (HAE)
 * 나 자신이거나 이미 저장된 사람이면 무료로 통과. 여러 명이면 한 번에 계산.
 * @returns {{ok:boolean, people:Array}}
 */
export function chargeNewPeople(list, { navigate } = {}) {
  const fresh = [];
  const out = [];
  for (const it of list) {
    const inp = it && it.input; if (!inp || !inp.birthDate) { out.push(null); continue; }
    const f = findSavedPerson(inp) || fresh.find((x) => samePerson(x.input, inp));
    if (f) { out.push(f === "self" ? null : f); continue; }
    const nm = (it.name || inp.name || "").trim() || "이름없음";
    const { focus, ...clean } = inp;
    const p = { id: makeId("p"), name: nm, relation: it.relation || "", input: { ...clean, name: nm, gender: clean.gender || "female", focus: ["personality", "relationship", "love"] }, createdAt: Date.now() };
    fresh.push(p); out.push(p);
  }
  if (!fresh.length) return { ok: true, people: out };
  const cost = costOf("friendadd") * fresh.length;
  const r = spend(cost, { kind: "friendadd" });
  if (!r.ok) {
    toast(`새 사람을 입력하려면 코인 ${cost}개가 필요해요 (보유 ${getCoins()}개) · 초대 링크로 추가하면 무료예요`);
    if (navigate) setTimeout(() => navigate("/store"), 900);
    return { ok: false, people: [] };
  }
  fresh.forEach((p) => { savePerson(p); grantFriendBundle(getOwnBirth(), p.input); });
  toast(`${fresh.map((p) => `'${p.name}'`).join(", ")} 님을 내 사람에 저장했어요 · 코인 ${cost} 차감`);
  return { ok: true, people: out };
}
export const NEW_PERSON_NOTE = "새로 입력하는 사람은 코인 10개 · 입력하면 내 사람에 바로 저장돼요 (이미 저장된 사람·나는 무료 · 초대 링크로 추가하면 무료)";

/** "내 사람에 저장 · 코인 10개로" 카드. 나 자신·이미 저장된 사람이면 null */
export function savePersonOffer(input, { name, relation = "", navigate, onSaved } = {}) {
  return null; // v70: 새 사람은 입력할 때 코인을 쓰고 바로 저장되므로 결과 화면의 저장 제안은 안 띄움
  // eslint-disable-next-line no-unreachable
  if (!input || !input.birthDate || !input.gender || findSavedPerson(input)) return null;
  const nm = name || input.name || "이 사람";
  const cost = costOf("friendadd");
  const box = el("div", { class: "panel save-offer" });
  box.append(
    el("p", { style: "font-weight:700;", text: `${nm} 님을 내 사람에 저장할까요?` }),
    el("p", { class: "muted tiny", style: "margin-top:4px;", text: "저장하면 다음부터 고르기만 하면 되고, 이 사람의 사주·궁합·귀인 체크도 무료로 볼 수 있어요. (초대 링크로 추가하면 무료)" }),
    el("button", { type: "button", class: "btn btn-ghost btn-block", style: "margin-top:10px;", onclick: () => {
      if (findSavedPerson(input)) { toast(`'${nm}' 님은 이미 내 사람에 있어요.`); return; }
      const r = spend(cost, { kind: "friendadd" });
      if (!r.ok) { noCoinToast(cost); if (navigate) navigate("/store"); return; }
      const { focus, ...clean } = input;
      const person = savePerson({ id: makeId("p"), name: nm, relation, input: { ...clean, name: nm, focus: ["personality", "relationship", "love"] }, createdAt: Date.now() });
      grantFriendBundle(getOwnBirth(), person.input);
      toast(`'${nm}' 님을 내 사람에 저장했어요 · 코인 ${cost} 차감`);
      clear(box); box.append(el("p", { style: "font-weight:700; color:var(--c-gold-soft);", text: `✓ ${nm} 님을 내 사람에 저장했어요` }));
      if (onSaved) onSaved(person);
    } }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: `내 사람에 저장 · 코인 ${cost}개로` })]),
  );
  return box;
}

/* ---- 나와의 관계 ---- */
export const RELATIONS = [
  { v: "가족", e: "🏠" }, { v: "엄마", e: "👩" }, { v: "아빠", e: "👨" }, { v: "형제·자매", e: "🧸" },
  { v: "연인", e: "💞" }, { v: "배우자", e: "💍" }, { v: "썸", e: "🌸" }, { v: "짝사랑", e: "💌" }, { v: "전 연인", e: "🥀" },
  { v: "친구", e: "🤝" }, { v: "절친", e: "🫶" }, { v: "직장 동료", e: "💼" }, { v: "상사", e: "📋" }, { v: "선후배", e: "🎓" }, { v: "지인", e: "🙂" },
];
export function relEmoji(r) { const f = RELATIONS.find((x) => x.v === r); return f ? f.e : "✏️"; }
function relationPicker(current) {
  let value = current || "";
  const isPreset = (v) => RELATIONS.some((x) => x.v === v);
  const custom = el("input", { class: "input", type: "text", maxlength: "12", placeholder: "예: 사촌 언니 / 룸메이트", style: "margin-top:8px;" });
  const chips = [];
  const paint = () => {
    chips.forEach((c) => {
      const on = c.dataset.v === "__custom" ? (value && !isPreset(value)) || custom.dataset.open === "1" : c.dataset.v === value;
      c.classList.toggle("is-selected", !!on); c.setAttribute("aria-pressed", on ? "true" : "false");
    });
    custom.style.display = custom.dataset.open === "1" || (value && !isPreset(value)) ? "" : "none";
  };
  const mk = (v, label) => {
    const b = el("button", { type: "button", class: "chip rel-chip", "data-v": v, text: label });
    b.addEventListener("click", () => {
      if (v === "__custom") { custom.dataset.open = "1"; value = custom.value.trim(); custom.focus(); }
      else { custom.dataset.open = ""; value = value === v ? "" : v; }
      paint();
    });
    chips.push(b); return b;
  };
  const grid = el("div", { class: "chip-grid rel-grid" }, [
    ...RELATIONS.map((r) => mk(r.v, `${r.e} ${r.v}`)), mk("__custom", "✏️ 직접 입력"),
  ]);
  custom.addEventListener("input", () => { value = custom.value.trim(); });
  if (value && !isPreset(value)) { custom.value = value; custom.dataset.open = "1"; }
  paint();
  const wrap = el("div", {}, [grid, custom]);
  wrap.getValue = () => value;
  return wrap;
}

/* ---- 작은 헬퍼 ---- */
function fld(label, control, hint, required) {
  return el("div", { class: "field" }, [
    el("label", { html: label + (required ? ' <span class="gold">*</span>' : "") }),
    control,
    hint ? el("p", { class: "hint", text: hint }) : null,
  ].filter(Boolean));
}
function seg(name, options, current) {
  return el("div", { class: "seg", role: "radiogroup" },
    options.map((o) => el("label", { class: "seg-opt" }, [
      el("input", { type: "radio", name, value: o.v, checked: current === o.v }),
      el("span", { text: o.label }),
    ])));
}
function todayStr() {
  const d = new Date(); const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* ===== (합침) personSwitch.js ===== */
/* 누구 기준으로 볼까? — 나 / 내가 추가한 사람 칩 + 바로 추가하기.
   선택하면 앱 전체 '시점'이 그 사람으로 바뀐다(state.setViewAs). */

/* 관리자가 회원 시점으로 보는 중엔 '사람 추가'를 숨김 (관리자 내 사람에 섞이지 않게) */
const adminViewing = () => { try { return !!sessionStorage.getItem("str.adminview.v1"); } catch { return false; } };
export function personSwitch(navigate, { title = "누구 기준으로 볼까?" } = {}) {
  const box = el("section", { class: "wrap person-switch" });
  function paint() {
    clear(box);
    const cur = getViewAs();
    const people = getPeople().filter((p) => p.input && p.input.birthDate);
    const own = getOwnBirth();
    const chip = (label, on, onClick, extra = "") =>
      el("button", { class: "ps-chip" + (on ? " on" : "") + extra, type: "button", "aria-pressed": String(on), onclick: onClick }, [el("span", { text: label })]);
    const chips = [
      chip(own && own.name ? `나 (${own.name})` : "나", !cur, () => { if (cur) setViewAs(null); }),
      ...people.map((p) => chip((p.relation ? relEmoji(p.relation) + " " : "") + (p.name || "이름없음"), cur && cur.id === p.id, () => { if (!cur || cur.id !== p.id) setViewAs(p.id); })),
      adminViewing() ? null : el("button", { class: "ps-chip ps-add", type: "button", onclick: () => openAdd() }, [icon("plus"), el("span", { text: "사람 추가" })]),
    ].filter(Boolean);
    box.append(
      el("p", { class: "ps-title", text: title }),
      el("div", { class: "ps-row", role: "group", "aria-label": title }, chips),
    );
  }
  function openAdd() {
    openAddChooser(() => {
      const list = getPeople();
      if (list[0]) setViewAs(list[0].id); // 방금 추가한 사람 시점으로 바로 전환
      else paint();
    }, navigate, { title: "사람 추가", note: "추가하면 바로 그 사람 기준으로 볼 수 있어요. (내 사람 목록에도 저장돼요)" });
  }
  paint();
  return box;
}


/* ---- 결과 화면용 사람 고르기 — 지금 보고 있는 입력(current)을 표시하고, 누르면 onPick(input) ---- */
export function personPicker({ title = "누구의 사주로 볼까?", current = null, onPick, navigate } = {}) {
  const box = el("section", { class: "wrap person-switch" });
  const same = (a, b) => a && b && a.birthDate === b.birthDate && (a.birthTime || "") === (b.birthTime || "") && (a.gender || "") === (b.gender || "");
  function paint() {
    clear(box);
    const own = getOwnBirth();
    const list = [];
    if (own && own.birthDate) list.push({ label: own.name ? `나 (${own.name})` : "나", input: own });
    getPeople().filter((p) => p.input && p.input.birthDate).forEach((p) => list.push({ label: `${p.relation ? relEmoji(p.relation) + " " : ""}${p.name || "이름없음"}`, input: { ...p.input, name: p.name && p.name !== "이름없음" ? p.name : (p.input.name || "") } }));
    const chips = list.map((x) => {
      const on = same(x.input, current);
      return el("button", { class: "ps-chip" + (on ? " on" : ""), type: "button", "aria-pressed": String(!!on), onclick: () => { if (!on) onPick(x.input); } }, [el("span", { text: x.label })]);
    });
    if (!adminViewing()) chips.push(el("button", { class: "ps-chip ps-add", type: "button", onclick: () => openAddChooser(() => paint(), navigate, { title: "사람 추가" }) }, [icon("plus"), el("span", { text: "사람 추가" })]));
    box.append(el("p", { class: "ps-title", text: title }), el("div", { class: "ps-row", role: "group", "aria-label": title }, chips));
  }
  paint();
  return box;
}

/* 내 사람 랭킹 단독 화면 (#/ranks) — 귀인·결혼운·도화살·우정의 작대기 + 나 포함 순위 */
export function renderRanks({ navigate }) {
  loadDisclaimer();
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/people", "내 사람")]));
  root.append(pageHeader("내 사람 랭킹", "평생 잡아야 할 귀인은 누구?", "저장한 내 사람들로 귀인·결혼운·도화살 순위, 우정의 작대기, 그리고 나까지 포함한 올해운·재물운·결혼운 순위를 매겨 봐요."));
  const host = el("section", { class: "wrap section-gap" });
  root.append(host);
  const paint = () => {
    clear(host);
    const my = getMyBirth(), people = getPeople();
    if (!my) { host.append(noticeBox("info", "내 생년월일이 필요해요."), el("button", { class: "btn btn-primary", onclick: () => navigate("/saju") }, [el("span", { text: "내 정보 입력하고 시작" })])); return; }
    if (!people.length) {
      host.append(noticeBox("info", "아직 저장한 사람이 없어요. 친구·가족·연인을 추가하면 랭킹이 만들어져요. (초대 링크로 추가하면 무료)"),
        el("button", { class: "btn btn-primary btn-block", onclick: () => navigate("/people") }, [el("span", { text: "내 사람 추가하러 가기" })]));
      return;
    }
    host.append(themesSection(my, people, navigate, paint), allRankSection(my, people, navigate, paint), compatPlusBanner(navigate),
      el("button", { class: "btn btn-ghost btn-block", style: "margin-top: var(--sp-4);", onclick: () => navigate("/people") }, [el("span", { text: `👥 내 사람 ${people.length}명 관리하기 · 추가하기` })]));
  };
  paint();
  return root;
}
