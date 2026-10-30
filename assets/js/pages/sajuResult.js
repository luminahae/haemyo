import { relTermKey } from "../utils/glossary.js";
import { daeunFlowBlock } from "./special.js";
import { el, clear, toast, copyText, seedFromString, icon, prefersReducedMotion } from "../utils/dom.js";
import { unstash, saveResult, makeId, getResult, stash } from "../state.js";
import { backLink, noticeBox, insight, renderBlock, loadDisclaimer, openModal } from "./shared.js";
import { renderShareCard, maskedProfileLabel, downloadBlob, shareImage, exportNodeAsImage, exportNodeAsPdf } from "../utils/shareImage.js";
import { daeunTimeline, yearFlow, ageFromSolar, todayFortune, benefactorFoe } from "../saju/fortune.js";
import { analyzeStart, analyzeBreakup, reunionOutlook, harmonyBetween, monthlyFlow } from "../saju/relationship.js";
import { computeSaju } from "../saju/manse.js";
import { analyzeStrength, STRENGTH_ELEM_KR, analyzeStrength as _anStr } from "../saju/strength.js";
import { buildManse, MANSE_GLOSSARY, SINSAL_MEANING, sajuDeep, manseInfo, daeunColumns, yearColumns, monthColumns, dayCalendar } from "../saju/manseryeok.js";
import { charmSpirits, idealType, spousePortrait, portraitSvg } from "../saju/spouse.js";
import { isAIConfigured, getAIConfig, setAIConfig, clearAIConfig, streamChat } from "../saju/ai.js";
import { isUnlocked, unlock, getCoins, costOf, chartItemId, noCoinToast } from "../wallet.js";
import { sijinLabel, hk } from "./manseView.js";
import { lifespanCard } from "./tojeong.js";
import { personPicker } from "./people.js";
import { buildSajuReport } from "../saju/report.js";
const hkOnly = (h) => { const m = /\(([^)]*)\)/.exec(hk(h)); return m ? m[1] : ""; };

export function renderSajuResult({ navigate }) {
  const data = unstash("saju:result");
  if (!data) { navigate("/saju"); return el("div"); }
  return buildSajuReportNode(data, { navigate, saved: false });
}

/** 저장/미저장 공통 렌더. data = {input, profile, report} (+ id, createdAt when saved) */
export function buildSajuReportNode(data, { navigate, saved = false, savedId = null } = {}) {
  loadDisclaimer();
  const { input, profile, report } = data;
  const root = el("div", {});

  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [
    backLink(navigate, saved ? "/saved" : "/", saved ? "보관함" : "홈"),
  ]));
  if (navigate) root.append(personPicker({ title: "누구의 사주를 볼까?", current: input, navigate,
    onPick: (inp) => { stash("saju:input", inp); navigate("/saju/loading"); } }));

  // 헤더 + 프로필 메타
  const head = el("section", { class: "wrap" }, [
    el("div", { class: "panel report-head" }, [
      el("span", { class: "eyebrow", text: "사주 행동 패턴 리포트" }),
      el("h1", { class: "serif", style: "margin-top:6px;", text: (input.name ? input.name + "님의 " : "") + "성향 리포트" }),
      profileMeta(input, profile),
    ]),
  ]);
  root.append(head);

  // ===== 탭 구성: 한눈에 · 만세력 · 오행 · 신살 · 신강/신약 · 대운 · 일진 · 인연 · 상담/심층 · 전체 =====
  const sec = (tabs, node, gap = "var(--sp-4)") => node ? el("section", { class: "wrap rt-sec", "data-tabs": tabs, style: `margin-top:${gap};` }, [node]) : null;
  let D = null; try { D = sajuDeep(profile); } catch {}
  const M = buildManse(profile);
  const S = analyzeStrength(profile);
  const parts = [
    sec("over", overviewCard(profile, input, S, M, (t) => go(t))),
    input.timeUnknown ? sec("over manse", noticeBox("warn", "출생 시간 ‘모름’으로 진행했습니다. 시주(時柱)를 제외한 여섯 글자로 분석하므로, 시간대에 따라 달라지는 부분의 정밀도가 낮아질 수 있습니다.", "clock")) : null,
    sec("over", todayCard(profile)),
    sec("manse", myeongsikCard(profile, input, { lean: true })),
    D ? sec("manse", tabPanel("users", "사주관계 (천간·지지)", "네 기둥끼리 합·충·형·해·파로 어떻게 엮였는지", [relPanel(D)])) : null,
    sec("ohaeng", tabPanel("compass", "오행 분석", "다섯 기운의 분포와 십성(十星)", [elemDist(M), D ? ohaengPanel(D) : null,
      el("div", { class: "summary-card", style: "margin-top:14px;" }, [el("h3", { text: "성향 강도 요약" }), el("p", { class: "summary-lead", text: report.summaryLead }), metersView(report.meters),
        el("p", { class: "tiny muted", text: "※ 수치는 운의 좋고 나쁨이 아니라 ‘성향의 강도’를 나타내는 보조 정보입니다." })])])),
    sec("sinsal", tabPanel("sparkle", "신살과 길성", "내 사주에 깃든 별(神殺)과 귀인", [spiritSummary(M.summary), D ? spiritPanel(D) : null])),
    sec("sinsal", guiinCard(profile)),
    sec("strength", strengthCard(profile, S)),
    sec("luck", tabPanel("clock", "대운 · 세운 · 월운", "10년 → 1년 → 1달 순서로 눌러 내려가 보세요", [luckTable(profile, { mode: "luck" })])),
    sec("luck", flowSection(profile, input)),
    sec("luck", lifespanCard(profile, input), "var(--sp-3)"),
    sec("cal", tabPanel("moon", "일진 달력", "날짜를 누르면 그날이 나에게 어떤 날인지 (오늘은 무료)", [luckTable(profile, { mode: "cal" })])),
    sec("love", reunionCard(profile, input)),
    sec("love", relationshipTool(profile, input, navigate)),
    sec("love", el("button", { class: "btn btn-ghost btn-block", onclick: () => navigate("/inyeon") }, [icon("heart"), el("span", { text: "나의 인연 알아보기 — 이상형·초상화·바람기 지수" })])),
    sec("deep", aiChatCard(profile, input)),
  ].filter(Boolean);

  const TABS = [["over", "한눈에"], ["manse", "만세력"], ["ohaeng", "오행 분석"], ["sinsal", "신살·길성"], ["strength", "신강/신약"],
    ["luck", "대운·연운"], ["cal", "일진 달력"], ["love", "인연·관계"], ["deep", "상담·심층"], ["all", "전체 보기"]];
  let cur = "over";
  try { const v = localStorage.getItem("hm.sajutab"); if (v && TABS.some((t) => t[0] === v)) cur = v; } catch {}
  const pills = TABS.map(([id, label]) => el("button", { type: "button", role: "tab", class: "rt-pill", "data-id": id, onclick: () => go(id, true) }, [el("span", { text: label })]));
  // '다른 사주 보기'는 위쪽 '누구로 볼까?'에서 사람을 바꾸면 돼서 뺐어요
  const bar = el("nav", { class: "rt-bar", role: "tablist", "aria-label": "사주 결과 항목" }, [el("div", { class: "rt-track" }, pills)]);
  const deepHost = el("div", { class: "rt-sec", "data-tabs": "deep" });
  function go(id, scroll) {
    cur = id;
    try { localStorage.setItem("hm.sajutab", id); } catch {}
    pills.forEach((p) => { const on = p.dataset.id === id; p.classList.toggle("on", on); p.setAttribute("aria-selected", on ? "true" : "false"); if (on) p.scrollIntoView({ block: "nearest", inline: "center" }); });
    root.querySelectorAll(".rt-sec").forEach((n) => { n.hidden = !(id === "all" || (n.dataset.tabs || "").split(" ").includes(id)); });
    if (scroll) { const top = bar.getBoundingClientRect().top + window.scrollY - 8; if (window.scrollY > top) window.scrollTo({ top, behavior: "smooth" }); }
  }
  root.append(el("section", { class: "wrap", style: "margin-top: var(--sp-3);" }, [bar]));
  parts.forEach((n) => root.append(n));
  root.append(deepHost);

  // 심층 성격 분석 (분야별) — 30코인 게이트
  const deepItemId = `sajudeep:${input.birthDate || "?"}_${input.timeUnknown ? "x" : (input.birthTime || "-")}_${input.calendarType || "solar"}${input.leapMonth ? "L" : ""}`;
  paintDeep();

  function paintDeep() {
    clear(deepHost);
    const cost = costOf("sajudeep");
    if (!isUnlocked(deepItemId)) {
      const coins = getCoins();
      const box = el("div", { class: "panel premium-lock" }, [
        el("span", { class: "lock-badge" }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: `코인 ${cost}개` })]),
        el("h3", { class: "serif", style: "margin-top:10px;", text: "심층 성격 분석 열어 보기" }),
        el("p", { class: "muted", style: "font-size:var(--fs-sm);", text: "기본 성격·인간관계 패턴·연애 스타일·결혼·재물·직업·가치관까지 분야별로 깊게 풀어 드려요. 한 번 열면 저장·재열람은 무료예요." }),
      ]);
      if (coins >= cost) {
        box.append(el("button", { class: "btn btn-primary btn-block", style: "margin-top: var(--sp-4);", onclick: () => {
          const r = unlock(deepItemId, cost);
          if (r.ok) { toast(r.reason === "already" ? "이미 열어 둔 분석이에요." : `심층 분석을 열었어요 · 코인 ${cost} 차감`); paintDeep(); }
          else { noCoinToast(); navigate("/store"); }
        } }, [el("span", { text: `코인 ${cost}개로 열기 · 보유 ${coins}개` })]));
      } else {
        box.append(el("p", { class: "muted tiny", style: "margin-top:8px;", text: `보유 코인 ${coins}개 · ${cost}개 필요해요.` }));
        box.append(el("button", { class: "btn btn-primary btn-block", style: "margin-top: var(--sp-3);", onclick: () => navigate("/store") }, [el("span", { text: "코인 받으러 가기" })]));
      }
      deepHost.append(el("section", { class: "wrap", style: "margin-top: var(--sp-5);" }, [box]));
      return;
    }

    // 분야 점프 메뉴
    const allSections = [...report.sections, { id: "habits", title: "개선해야 할 습관" }];
    const JUMP = { personality: ["🙂", "성격"], relationship: ["💬", "관계"], love: ["💗", "연애"], marriage: ["💍", "결혼"], money: ["💰", "돈"], career: ["💼", "직업"], timeline: ["⏳", "시기"], loveflow: ["🌹", "연애운"], habits: ["🔧", "습관"] };
    const jump = el("nav", { class: "jump-nav", "aria-label": "분야별 이동", "data-nocapture": "" },
      allSections.map((s) => {
        const [em, lb] = JUMP[s.id] || ["✦", shortTitle(s.title)];
        return el("a", { href: "#/saju/result", "data-jump": s.id, title: s.title, "aria-label": s.title,
          onclick: (e) => { e.preventDefault(); openAndScroll(s.id); } }, [el("span", { class: "jn-em", text: em }), el("span", { text: lb })]);
      })
    );
    deepHost.append(el("section", { class: "wrap", style: "margin-top: var(--sp-5);" }, [jump]));

    // 섹션 카드들
    const sectionsWrap = el("section", { class: "wrap section-gap", style: "margin-top: var(--sp-4);" });
    report.sections.forEach((sec, idx) => sectionsWrap.append(sectionCard(sec, idx + 1)));
    // 습관 카드
    sectionsWrap.append(habitsCard(report.habits, report.sections.length + 1));
    deepHost.append(sectionsWrap);
    setupScrollSpy(root);
  }

  // 마무리 면책 + 성찰
  root.append(el("section", { class: "wrap", style: "margin-top: var(--sp-5);" }, [
    noticeBox("info", "이 리포트는 자기이해와 오락을 위한 참고 콘텐츠입니다. 미래를 확정하지 않으며, 중요한 결정은 실제 상황과 신뢰할 수 있는 정보, 필요하면 전문가의 조언을 함께 검토하세요."),
  ]));

  // 하단 액션바 (저장/공유/복사)
  root.classList.add("has-action-bar");
  root.append(buildActionBar({ data, navigate, saved, savedId, report, input, profile }));

  // 진입 시 스크롤스파이 + 탭 적용
  setupScrollSpy(root);
  go(cur);
  return root;
}

/* ---- 조각들 ---- */
function profileMeta(input, profile) {
  const items = [];
  if (input.name) items.push(["닉네임", input.name]);
  const s = profile.solar;
  const solarStr = s ? `${s.Y}.${pad(s.M)}.${pad(s.D)} 양력` : input.birthDate;
  items.push(["양력", solarStr]);
  if (profile.lunar) {
    const l = profile.lunar;
    items.push(["음력", `${l.year}.${pad(l.month)}.${pad(l.day)}${l.isLeap ? " (윤달)" : ""}`]);
  }
  items.push(["출생 시간", sijinLabel(input)]);
  return el("div", { class: "report-meta" },
    items.map(([k, v]) => el("span", {}, [document.createTextNode(k + " "), el("b", { text: v })]))
  );
}
const pad = (n) => String(n).padStart(2, "0");

/** 사주 명식(팔자) + 대운 카드 */
/* 오행 색 타일 — 한자 + (+/-)한글·오행 */
const STEM_PLUS = ["甲", "丙", "戊", "庚", "壬"];
const BRANCH_PLUS = ["寅", "辰", "巳", "申", "戌", "亥"]; // 체용 기준(巳·亥 양, 子·午 음)
const ELEM_WORD = { wood: "나무木", fire: "불火", earth: "흙土", metal: "쇠金", water: "물水" };
const AGE_OF = { "시주": "말년운", "일주": "장년운", "월주": "청년운", "년주": "초년운" };
function elemTile(hanja, kr, elem, plus, guiin) {
  return el("span", { class: `ms-tile el-${elem}` + (guiin ? " ms-guiin" : ""), title: `${kr} · ${ELEM_WORD[elem]}${guiin ? " · 천을귀인" : ""}` }, [
    el("span", { class: "ms-tile-ch", text: hanja }),
    el("span", { class: "ms-tile-sub" }, [el("span", { text: `${plus ? "+" : "-"}${kr},` }), el("span", { text: ELEM_WORD[elem] })]),
  ]);
}

export function myeongsikCard(profile, input, opts = {}) {
  const P = profile.pillars;
  const cols = [
    { key: "hour", label: "시주", sub: "時" },
    { key: "day", label: "일주", sub: "日" },
    { key: "month", label: "월주", sub: "月" },
    { key: "year", label: "년주", sub: "年" },
  ];
  // 상세 만세력 (십신·지장간·십이운성·납음)
  const M = buildManse(profile);
  const grid = el("div", { class: "manse-grid" },
    M.pillars.map((p) => {
      if (p.empty) return el("div", { class: "ms-col" }, [
        el("span", { class: "ms-pos", text: p.pos }),
        el("div", { class: "ms-gz ms-empty" }, [el("span", { class: "ms-ch", text: "?" }), el("span", { class: "ms-ch", text: "?" })]),
        el("span", { class: "ms-kr muted tiny", text: "시간 모름" }),
      ]);
      return el("div", { class: "ms-col" + (p.isDay ? " ms-day" : "") }, [
        el("span", { class: "ms-pos", text: p.pos + (p.isDay ? " · 나" : "") }),
        el("span", { class: "ms-age tiny", text: AGE_OF[p.pos] || "" }),
        el("span", { class: "ms-god", text: p.stemGod }),
        elemTile(p.stemH, p.stemKr, p.stemElem, STEM_PLUS.includes(p.stemH)),
        elemTile(p.branchH, p.branchKr, p.branchElem, BRANCH_PLUS.includes(p.branchH), p.isGuiin),
        el("span", { class: "ms-god", text: p.branchGod }),
        el("span", { class: "ms-kr", text: p.stemKr + p.branchKr + (p.key === "year" ? ` · ${p.zodiac}띠` : "") }),
        p.relations && p.relations.length
          ? el("div", { class: "ms-rels" }, p.relations.map((r) => el("span", { class: "ms-rel rel-" + r.cls, text: r.kind, "data-term": relTermKey(r.kind) || undefined })))
          : null,
        el("div", { class: "ms-extra" }, [
          msRow("지장간", p.jijang.map((j) => j.hanja).join(" ")),
          msRow("십이운성", p.stage, p.stage),
          msRow("납음", p.napeum),
          msRow("공망", [
            (M.summary.gongmangYearH || []).includes(p.branchH) ? "[년]공망" : null,
            (M.summary.gongmangDayH || []).includes(p.branchH) ? "[일]공망" : null,
          ].filter(Boolean).join(" ") || "-"),
          termRow("신살", (p.sinsal || []).map((s) => s.name).filter((v, i, a) => a.indexOf(v) === i)),
          (p.spirits && p.spirits.length) ? termRow("길·흉신", p.spirits) : null,
        ].filter(Boolean)),
      ]);
    })
  );

  // 오행 분포
  const EC = M.elementCounts || {};
  const ELEMS = [["wood", "목 木"], ["fire", "화 火"], ["earth", "토 土"], ["metal", "금 金"], ["water", "수 水"]];
  const maxC = Math.max(1, ...ELEMS.map(([k]) => EC[k] || 0));
  const elemBar = el("div", { class: "elem-dist" }, ELEMS.map(([k, label]) =>
    el("div", { class: "elem-cell" }, [
      el("div", { class: "elem-bar-track" }, [el("div", { class: `elem-bar elem-${k}`, style: `height:${Math.round(((EC[k] || 0) / maxC) * 100)}%;` })]),
      el("span", { class: "elem-n", text: String(EC[k] || 0) }),
      el("span", { class: "elem-lb tiny muted", text: label }),
    ])));

  // 만세력 읽는 법 (친절한 설명)
  const guide = el("details", { class: "manse-guide" }, [
    el("summary", {}, [el("span", { text: "만세력 읽는 법 (자세히)" }), el("span", { class: "rc-chevron" }, [icon("chevronDown")])]),
    el("div", { class: "manse-guide-body" }, MANSE_GLOSSARY.map((g) =>
      el("div", { class: "gloss" }, [el("b", { text: g.term }), el("p", { class: "muted", text: g.desc })]))),
  ]);

  const daeun = profile.daeun
    ? el("div", { class: "daeun" }, [
        el("div", { class: "daeun-head" }, [
          el("span", { class: "block-label", style: "color:var(--c-gold-soft);" }, [icon("clock"), el("span", { text: "대운 (10년 주기 흐름)" })]),
          el("span", { class: "tiny muted", text: `${profile.daeun.forward ? "순행" : "역행"} · ${profile.daeun.startAge}세부터` }),
        ]),
        el("div", { class: "daeun-row" }, profile.daeun.list.slice(0, 8).map((d) =>
          el("div", { class: "daeun-item" }, [
            el("span", { class: "daeun-age", text: d.age + "세" }),
            el("span", { class: "daeun-gz", "data-nokr": "" }, [document.createTextNode(d.hanja), el("small", { class: "gz-kr", text: hkOnly(d.hanja) })]),
          ])
        )),
      ])
    : null;

  return el("details", { class: "panel report-card", open: true, id: "sec-myeongsik" }, [
    el("summary", {}, [
      el("span", { class: "rc-index" }, [icon("saju")]),
      el("span", { class: "rc-title" }, [
        document.createTextNode("사주 명식 (팔자)"),
        el("span", { class: "rc-sub", text: `일간 ${profile.dayMaster} · 실제 만세력 계산` }),
      ]),
      el("span", { class: "rc-chevron" }, [icon("chevronDown")]),
    ]),
    el("div", { class: "rc-body" }, [
      grid,
      infoPanel(profile, input),
      opts.lean ? null : luckTable(profile),
      relsBlock(M.pairRels),
      opts.lean ? null : spiritSummary(M.summary),
      gongmangBlock(M),
      opts.lean ? null : deepTabs(profile),
      guide,
      el("p", { class: "tiny muted", style: "margin-top:12px;", text: "절기(태양 황경)와 삭을 천문 계산해 세운 실제 명식입니다. 진태양시·시간대는 대표 경도로 보정했습니다." }),
      el("a", { href: "#/study", class: "btn btn-ghost btn-block", style: "margin-top:10px;" }, [el("span", { text: "📚 용어가 어렵다면? 사주 공부방 가기" })]),
    ].filter(Boolean)),
  ]);
}

/* 합·충 관계 요약 */
function relsBlock(pairRels) {
  if (!pairRels || !pairRels.length) {
    return el("div", { class: "ms-relsum" }, [
      el("p", { class: "ms-section-label tiny", text: "지지 합·충 관계" }),
      el("p", { class: "muted tiny", text: "네 기둥 사이에 뚜렷한 합·충·형·해·파가 없어요. 그만큼 기복이 적고 무난한 짜임이에요." }),
    ]);
  }
  return el("div", { class: "ms-relsum" }, [
    el("p", { class: "ms-section-label tiny", text: "지지 합·충 관계" }),
    el("div", { class: "hap-tags" }, pairRels.map((r) =>
      el("span", { class: "hap-tag " + (r.cls === "warn" ? "hap-warn" : "hap-good") },
        [document.createTextNode(`${r.a}·${r.b} ${r.ah}${r.bh} ${r.kind}`)]))),
  ]);
}

/* =========================================================
   명식 심화 탭: 오행과 십성 · 사주관계(천간·지지) · 신살과 길성
   ========================================================= */
const EL_KR_H = { wood: "목 木", fire: "화 火", earth: "토 土", metal: "금 金", water: "수 水" };
function deepTabs(profile) {
  let D;
  try { D = sajuDeep(profile); } catch { return null; }
  const TABS = [["ohaeng", "오행과 십성"], ["rel", "사주관계"], ["spirit", "신살과 길성"]];
  const body = el("div", { class: "dt-body" });
  const chips = TABS.map(([id, label]) => el("button", { type: "button", class: "dt-tab", "data-id": id, onclick: () => show(id) }, [el("span", { text: label })]));
  function show(id) {
    chips.forEach((c) => c.classList.toggle("on", c.dataset.id === id));
    clear(body);
    body.append(id === "ohaeng" ? ohaengPanel(D) : id === "rel" ? relPanel(D) : spiritPanel(D));
  }
  const box = el("div", { class: "deep-tabs" }, [el("div", { class: "dt-tabs", role: "tablist" }, chips), body]);
  show("ohaeng");
  return box;
}

/* --- 오행 오각형 + 십성 표 --- */
const PENTA = { fire: [160, 58], earth: [272, 140], metal: [230, 262], water: [90, 262], wood: [48, 140] };
const PCOL = { wood: ["#dcebff", "#8db8f5", "#2f64b8"], fire: ["#ffe1dd", "#f59a90", "#c9423b"], earth: ["#fff1c8", "#f1cb62", "#9c700c"],
  metal: ["#ffffff", "#e2deea", "#6b667e"], water: ["#8a83ab", "#4a4466", "#ffffff"] };
const GEN_ORDER = ["wood", "fire", "earth", "metal", "water"];
const CTRL_PAIRS = [["wood", "earth"], ["earth", "water"], ["water", "fire"], ["fire", "metal"], ["metal", "wood"]];
function pentagonSvg(D) {
  const R = 38, CX = 160, CY = 170;
  const by = Object.fromEntries(D.elements.map((e) => [e.key, e]));
  const sh = (a, b, pad) => { const [x1, y1] = a, [x2, y2] = b; const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
    return [x1 + dx / L * pad, y1 + dy / L * pad, x2 - dx / L * pad, y2 - dy / L * pad]; };
  let out = `<defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="rgba(255,240,246,.9)"/></marker>
  <marker id="ahd" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0L10,5L0,10z" fill="rgba(255,240,246,.5)"/></marker>`;
  GEN_ORDER.forEach((k) => { const [x, y] = PENTA[k]; out += `<clipPath id="cp-${k}"><circle cx="${x}" cy="${y}" r="${R}"/></clipPath>`; });
  out += `</defs>`;
  // 극 (점선 별)
  CTRL_PAIRS.forEach(([a, b]) => { const [x1, y1, x2, y2] = sh(PENTA[a], PENTA[b], R + 6);
    out += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(255,240,246,.45)" stroke-width="1.3" stroke-dasharray="4 4" marker-end="url(#ahd)"/>`; });
  // 생 (바깥 곡선)
  GEN_ORDER.forEach((a, i) => { const b = GEN_ORDER[(i + 1) % 5]; const [x1, y1, x2, y2] = sh(PENTA[a], PENTA[b], R + 8);
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2; const ox = mx - CX, oy = my - CY, L = Math.hypot(ox, oy);
    const qx = mx + ox / L * 22, qy = my + oy / L * 22;
    out += `<path d="M${x1},${y1} Q${qx},${qy} ${x2},${y2}" fill="none" stroke="rgba(255,240,246,.85)" stroke-width="1.6" marker-end="url(#ah)"/>`; });
  // 원 + 채움
  GEN_ORDER.forEach((k) => {
    const [x, y] = PENTA[k], e = by[k], [l, m, d] = PCOL[k];
    const fill = Math.min(1, e.pct / 50);
    const top = y + R - 2 * R * fill;
    const wave = `M${x - R},${top} Q${x - R / 2},${top - 6} ${x},${top} T${x + R},${top} L${x + R},${y + R} L${x - R},${y + R}Z`;
    out += `<circle cx="${x}" cy="${y}" r="${R}" fill="rgba(255,255,255,.14)" stroke="${e.isMe ? "#ffe2a8" : "rgba(255,255,255,.35)"}" stroke-width="${e.isMe ? 2.2 : 1.2}"/>`;
    if (fill > 0) out += `<g clip-path="url(#cp-${k})"><path d="${wave}" fill="${m}" opacity=".95"/></g>`;
    out += `<text x="${x}" y="${y - 4}" text-anchor="middle" font-size="16" font-weight="800" fill="#fff" style="paint-order:stroke" stroke="rgba(60,30,60,.35)" stroke-width="2">${e.pct}%</text>`;
    out += `<rect x="${x - 26}" y="${y + 10}" width="52" height="20" rx="10" fill="${l}" stroke="${m}"/>`;
    out += `<text x="${x}" y="${y + 24}" text-anchor="middle" font-size="11" font-weight="800" fill="${k === "water" ? "#2c2745" : d}">${EL_KR_H[k]}</text>`;
    if (e.isMe) out += `<text x="${x}" y="${y - R - 6}" text-anchor="middle" font-size="10" font-weight="800" fill="#ffe2a8">나(일간)</text>`;
  });
  return `<svg viewBox="0 0 320 320" class="penta-svg" role="img" aria-label="오행 분포 오각형">${out}</svg>`;
}
function ohaengPanel(D) {
  const svg = el("div", { class: "penta-wrap", "data-nokr": "" });
  svg.innerHTML = pentagonSvg(D);
  const legend = el("div", { class: "penta-legend tiny" }, [
    el("span", {}, [el("i", { class: "lg-solid" }), document.createTextNode(" 생(도와줌)")]),
    el("span", {}, [el("i", { class: "lg-dash" }), document.createTextNode(" 극(눌러줌)")]),
  ]);
  const order = ["인성", "비겁", "식상", "재성", "관성"];
  const rows = [...D.elements].sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group)).map((e) =>
    el("div", { class: "og-row" }, [
      el("div", { class: "og-left" }, [
        el("span", { class: `og-badge el-${e.key}`, text: e.h }),
        el("div", {}, [
          el("p", { class: "og-name" }, [el("b", { text: `${e.kr}(${e.group})` }), el("span", { class: `og-st st-${e.status}`, text: e.status })]),
          el("p", { class: "tiny muted", text: e.meaning }),
        ]),
      ]),
      el("div", { class: "og-gods" }, e.gods.map((g) => el("p", {}, [el("span", { class: "muted", text: g.name }), el("b", { text: `${g.pct}%` })]))),
      el("p", { class: "og-tip tiny", text: e.tip }),
    ]));
  return el("div", { class: "section-gap" }, [legend, svg, el("div", { class: "og-list" }, rows)]);
}

/* --- 사주관계 다이어그램 (천간 위 · 지지 아래) --- */
function laneAssign(rels) {
  const sorted = [...rels].sort((a, b) => (a.j - a.i) - (b.j - b.i) || a.i - b.i);
  const lanes = [];
  sorted.forEach((r) => {
    let L = 0;
    while ((lanes[L] || []).some((o) => !(r.j < o.i || o.j < r.i))) L++;
    (lanes[L] = lanes[L] || []).push(r); r.lane = L;
  });
  return { rels: sorted, n: lanes.length };
}
function relSvg(D) {
  const W = 340, cx = (i) => 42.5 + i * 85, T = 60, GAP = 30;
  const top = laneAssign(D.stemRels), bot = laneAssign(D.branchRels);
  const topH = top.n * GAP + 18, stemLabelY = topH + 12, stemY = stemLabelY + 8, brY = stemY + T + 14, brLabelY = brY + T + 16, botStart = brLabelY + 8;
  const H = botStart + bot.n * GAP + 26;
  let o = `<defs>${Object.entries(PCOL).map(([k, [l, m]]) => `<linearGradient id="tg-${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${l}"/><stop offset="1" stop-color="${m}"/></linearGradient>`).join("")}</defs>`;
  const col = (c) => c === "good" ? "#c6f0d8" : "#ffc4b8";
  const lbl = (items) => items.map((x) => x.label).join(", ");
  const dx = (lane, side) => (side ? -1 : 1) * (6 + (lane % 3) * 5);
  top.rels.forEach((r) => {
    const y = topH - 8 - r.lane * GAP, x1 = cx(r.i) + dx(r.lane, 0), x2 = cx(r.j) + dx(r.lane, 1), c = col(r.items[0].cls);
    o += `<path d="M${x1},${stemLabelY - 12} V${y} H${x2} V${stemLabelY - 12}" fill="none" stroke="${c}" stroke-width="1.4" stroke-linejoin="round"/>`;
    o += `<text x="${(x1 + x2) / 2}" y="${y - 5}" text-anchor="middle" font-size="12.5" font-weight="800" fill="${c}" stroke="#7a5a86" stroke-width="4" paint-order="stroke" stroke-linejoin="round">${lbl(r.items)}</text>`;
  });
  bot.rels.forEach((r) => {
    const y = botStart + 10 + r.lane * GAP, x1 = cx(r.i) + dx(r.lane, 0), x2 = cx(r.j) + dx(r.lane, 1), c = col(r.items.some((x) => x.cls === "warn") ? "warn" : "good");
    o += `<path d="M${x1},${brLabelY + 4} V${y} H${x2} V${brLabelY + 4}" fill="none" stroke="${c}" stroke-width="1.4" stroke-linejoin="round"/>`;
    o += `<text x="${(x1 + x2) / 2}" y="${y + 15}" text-anchor="middle" font-size="12.5" font-weight="800" fill="${c}" stroke="#7a5a86" stroke-width="4" paint-order="stroke" stroke-linejoin="round">${lbl(r.items)}</text>`;
  });
  D.cols.forEach((c, i) => {
    const x = cx(i);
    o += `<text x="${x}" y="${stemLabelY}" text-anchor="middle" font-size="11" fill="rgba(255,240,246,.8)">${["시간", "일간", "월간", "년간"][i]}</text>`;
    o += `<text x="${x}" y="${brLabelY}" text-anchor="middle" font-size="11" fill="rgba(255,240,246,.8)">${["시지", "일지", "월지", "년지"][i]}</text>`;
    if (!c) { o += `<rect x="${x - T / 2}" y="${stemY}" width="${T}" height="${T}" rx="16" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.25)" stroke-dasharray="4 3"/><text x="${x}" y="${stemY + T / 2 + 5}" text-anchor="middle" font-size="11" fill="rgba(255,255,255,.6)">시간 모름</text>`; return; }
    [[c.stemH, c.stemKr, c.stemElem, stemY], [c.branchH, c.branchKr, c.branchElem, brY]].forEach(([h, kr, e, y]) => {
      const ink = PCOL[e][2];
      o += `<rect x="${x - T / 2}" y="${y}" width="${T}" height="${T}" rx="16" fill="url(#tg-${e})" stroke="${PCOL[e][1]}"/>`;
      o += `<text x="${x}" y="${y + 32}" text-anchor="middle" font-size="24" font-weight="800" font-family="serif" fill="${ink}">${h}</text>`;
      o += `<text x="${x}" y="${y + 48}" text-anchor="middle" font-size="10" font-weight="700" fill="${ink}" opacity=".85">${kr}</text>`;
    });
  });
  return `<svg viewBox="0 0 ${W} ${H}" class="rel-svg" role="img" aria-label="천간과 지지 관계도">${o}</svg>`;
}
const REL_MEANING = [
  ["합", "서로 끌어당겨 묶이는 관계. 협력·인연·조화 (반합은 셋 중 둘만 모인 합, 방합은 같은 계절끼리 모임)"],
  ["충", "정면으로 부딪히는 관계. 변화·이동·갈등, 잘 쓰면 돌파력"],
  ["극", "한쪽이 다른 쪽을 누르는 관계. 긴장·압박, 자기 통제"],
  ["형", "서로 벌주는 관계. 시비·수술·법적 문제 조심, 전문직(의료·법)으로 쓰기도"],
  ["해", "은근히 해치는 관계. 오해·서운함이 쌓이기 쉬움"],
  ["파", "깨뜨리는 관계. 약속·계획이 틀어지기 쉬움"],
  ["원진", "이유 없이 미운 관계. 애증·신경전, 거리 두기가 약"],
];
function relPanel(D) {
  const wrap = el("div", { class: "rel-wrap", "data-nokr": "" }); wrap.innerHTML = relSvg(D);
  const none = !D.stemRels.length && !D.branchRels.length;
  return el("div", { class: "section-gap" }, [
    el("p", { class: "tiny muted", text: "위쪽은 천간끼리, 아래쪽은 지지끼리의 관계예요. 초록 선은 합(조화), 주황 선은 충·형·해·파·원진(긴장)이에요." }),
    wrap,
    none ? el("p", { class: "tiny", text: "네 기둥 사이에 뚜렷한 합·충이 없어요. 기복이 적고 무난한 짜임이에요." }) : null,
    el("details", { class: "gm-box" }, [
      el("summary", {}, [el("span", { class: "ms-section-label tiny", text: "관계 용어 풀이" }), el("span", { class: "rc-chevron" }, [icon("chevronDown")])]),
      el("div", { class: "rel-gloss" }, REL_MEANING.map(([k, v]) => el("p", { class: "tiny" }, [el("b", { text: k + " " }), document.createTextNode(v)]))),
    ]),
  ].filter(Boolean));
}

/* --- 신살과 길성 표 --- */
const GOOD_SP = /귀인|록|금여|덕/;
function spiritPanel(D) {
  const tile = (h, kr, e) => el("span", { class: `sp-tile el-${e}`, "data-nokr": "" }, [el("b", { text: h }), el("small", { text: kr })]);
  const cell = (list) => el("div", { class: "sp-cell" }, list == null ? [el("span", { class: "muted tiny", text: "시간 모름" })]
    : list.length ? list.map((t) => el("span", { class: "sp-term " + (GOOD_SP.test(t) ? "sp-good" : "sp-warn"), title: SINSAL_MEANING[t] || "", text: t })) : [el("span", { class: "muted", text: "-" })]);
  const row = (label, nodes) => [el("span", { class: "sp-lbl tiny muted", text: label }), ...nodes];
  const heads = D.cols.map((c, i) => el("span", { class: "sp-head tiny muted", text: ["시주", "일주", "월주", "년주"][i] }));
  const grid = el("div", { class: "sp-grid" }, [
    el("span", {}), ...heads,
    ...row("천간", D.cols.map((c) => c ? tile(c.stemH, c.stemKr, c.stemElem) : el("span", { class: "sp-tile sp-empty", text: "?" }))),
    ...row("신살·길성", D.spirits.stems.map(cell)),
    ...row("지지", D.cols.map((c) => c ? tile(c.branchH, c.branchKr, c.branchElem) : el("span", { class: "sp-tile sp-empty", text: "?" }))),
    ...row("신살·길성", D.spirits.branches.map(cell)),
  ]);
  const found = [...new Set([...D.spirits.stems, ...D.spirits.branches].flat().filter(Boolean))];
  return el("div", { class: "section-gap" }, [
    el("p", { class: "tiny muted", text: "분홍은 길성(귀인·록 등 좋은 별), 주황은 신살(조심할 기운)이에요. 신살도 잘 쓰면 재능이 돼요." }),
    grid,
    found.length ? el("div", { class: "gm-box" }, [
      el("p", { class: "ms-section-label tiny", text: "내 사주의 신살·길성 풀이" }),
      el("div", { class: "rel-gloss" }, found.map((t) => el("p", { class: "tiny" }, [el("b", { class: GOOD_SP.test(t) ? "sp-good-t" : "sp-warn-t", text: t + " " }), document.createTextNode(SINSAL_MEANING[t] || "")]))),
    ]) : null,
  ].filter(Boolean));
}

/* ---- 만세력 정보판 (출생 정보·보정·절입·대운 시작·귀인·명궁·삼재·조후) ---- */
function infoPanel(profile, input) {
  const m = profile.meta || {}, s = profile.solar, l = profile.lunar, p2 = (n) => String(n).padStart(2, "0");
  const rows = [];
  rows.push(["양력", s ? `${s.Y}년 ${p2(s.M)}월 ${p2(s.D)}일` : input.birthDate]);
  if (l) rows.push(["음력", `${l.year}년 ${p2(l.month)}월 ${p2(l.day)}일${l.isLeap ? " (윤달)" : ""}`]);
  rows.push(["출생 시간", sijinLabel(input)]);
  if (m.solarFix) {
    rows.push(["진태양시", `${m.solarFix.trueTime} (경도 ${m.solarFix.lonCorr > 0 ? "+" : ""}${m.solarFix.lonCorr}분 · 균시차 ${m.solarFix.eot > 0 ? "+" : ""}${m.solarFix.eot}분 보정)`]);
    if (m.solarFix.dst) rows.push(["서머타임", "출생 당시 서머타임 기간이라 1시간을 빼고 계산했어요"]);
    if (m.solarFix.offset && m.solarFix.offset !== 9) rows.push(["당시 표준시", `UTC+${Math.floor(m.solarFix.offset)}:${String(Math.round((m.solarFix.offset % 1) * 60)).padStart(2, "0")} (출생 당시 한국 표준시 기준)`]);
    rows.push(["자시 기준", m.solarFix.jasi === "yaja" ? "야자시 (23~24시는 그날 일주)" : "통자시 (23시부터 다음 날 일주)"]);
  }
  if (m.jeolip) rows.push(["절입", `${m.jeolip.name} ${m.jeolip.Y}.${p2(m.jeolip.M)}.${p2(m.jeolip.D)} ${p2(m.jeolip.h)}:${p2(m.jeolip.m)}`]);
  if (profile.daeun && profile.daeun.startDate) {
    const d = profile.daeun.startDate;
    rows.push(["첫 대운", `${d.Y}.${p2(d.M)}.${p2(d.D)} · ${profile.daeun.startAge}세 · ${profile.daeun.forward ? "순행" : "역행"}`]);
  }
  let johu = null;
  try { const st = _anStr(profile); johu = [`${st.strength} · 도움 오행 ${st.helpfulKr.join("·")}`, st.johu && st.johu.note]; } catch { /* ignore */ }
  const spirits = manseInfo(profile);
  return el("div", { class: "mi-panel" }, [
    el("p", { class: "ms-section-label tiny", text: "만세력 정보" }),
    el("div", { class: "mi-grid" }, rows.map(([k, v]) => el("div", { class: "mi-row" }, [el("span", { class: "mi-k", text: k }), el("span", { class: "mi-v", text: v })]))),
    el("div", { class: "mi-grid mi-sp" }, [
      ...spirits.map(([k, v, tip]) => el("div", { class: "mi-row", title: tip }, [el("span", { class: "mi-k", text: k }), el("span", { class: "mi-v" }, [el("b", { text: v }), el("small", { class: "mi-tip", text: tip })])])),
      johu ? el("div", { class: "mi-row" }, [el("span", { class: "mi-k", text: "신강·조후" }), el("span", { class: "mi-v" }, [el("b", { text: johu[0] }), johu[1] ? el("small", { class: "mi-tip", text: johu[1] }) : null].filter(Boolean))]) : null,
    ].filter(Boolean)),
  ]);
}

/* ---- 대운 10개 + 선택한 대운의 세운 10년 ---- */
function luckCol(c, { top, onClick, sel }) {
  return el("button", { type: "button", class: "lk-col" + (c.isNow ? " is-now" : "") + (sel ? " is-sel" : ""), onclick: onClick, "data-nokr": "" }, [
    el("span", { class: "lk-top", text: top }),
    el("span", { class: "lk-god", text: c.stemGod }),
    el("span", { class: `lk-t og-badge el-${c.stemElem}` }, [el("b", { text: c.stemH }), el("small", { text: c.stemKr })]),
    el("span", { class: `lk-t og-badge el-${c.branchElem}` + (c.guiin ? " lk-guiin" : "") }, [el("b", { text: c.branchH }), el("small", { text: c.branchKr })]),
    el("span", { class: "lk-god", text: c.branchGod }),
    el("span", { class: "lk-st", text: c.stage, "data-term": c.stage }),
    el("span", { class: "lk-ss", text: c.sinsal }),
    c.sinsal2 && c.sinsal2 !== c.sinsal ? el("span", { class: "lk-ss", text: c.sinsal2 }) : null,
    c.samjae ? el("span", { class: "lk-sj", text: "삼재" }) : null,
  ].filter(Boolean));
}
function luckTable(profile, opts = {}) {
  const cols = daeunColumns(profile);
  if (!cols.length) return null;
  const now = new Date();
  let sel = Math.max(0, cols.findIndex((c) => c.isNow));
  let selY = now.getFullYear(), selM = now.getMonth() + 1, selD = now.getDate();
  if (!(selY >= cols[sel].startYear && selY <= cols[sel].startYear + 9)) selY = cols[sel].startYear;
  const dRow = el("div", { class: "lk-row" });
  const yHead = el("p", { class: "ms-section-label tiny", style: "margin-top:12px;" });
  const yRow = el("div", { class: "lk-row" });
  const mHead = el("p", { class: "ms-section-label tiny", style: "margin-top:12px;" });
  const mRow = el("div", { class: "lk-row" });
  const calBox = el("div", { class: "cal-box" });
  const center = (row) => { const n = row.querySelector(".is-sel"); if (n) requestAnimationFrame(() => { row.scrollLeft = n.offsetLeft - row.clientWidth / 2 + n.clientWidth / 2; }); };

  function paintD() {
    clear(dRow);
    cols.forEach((c, i) => dRow.append(luckCol(c, { top: `${c.age}세\n${c.startYear}`, sel: i === sel, onClick: () => {
      sel = i; selY = c.startYear <= now.getFullYear() && now.getFullYear() <= c.startYear + 9 ? now.getFullYear() : c.startYear; selM = 1; selD = 1; paintD(); } })));
    center(dRow); paintY();
  }
  function paintY() {
    clear(yRow);
    const c = cols[sel];
    yHead.textContent = `${c.hanja}(${c.stemKr}${c.branchKr}) 대운의 세운 · ${c.startYear}~${c.startYear + 9} · 누르면 12달 월운`;
    yearColumns(profile, c.startYear, 10).forEach((y) => yRow.append(luckCol(y, { top: `${y.year}\n${y.age + 1}세`, sel: y.year === selY, onClick: () => {
      selY = y.year; selM = selY === now.getFullYear() ? now.getMonth() + 1 : 1; selD = 1; paintY(); } })));
    center(yRow); paintM();
  }
  function paintM() {
    clear(mRow);
    mHead.textContent = mHead.dataset.nocal ? `${selY}년 월운 (12달) · 일진은 ‘일진 달력’ 탭에서` : `${selY}년 월운 · 누르면 그달 일진 달력`;
    monthColumns(profile, selY).forEach((m) => mRow.append(luckCol(m, { top: `${m.month}월\n${m.termName} ${m.termDay}일`, sel: m.month === selM, onClick: () => { selM = m.month; selD = 1; paintM(); } })));
    center(mRow); paintCal();
  }
  function paintCal() {
    clear(calBox);
    const C = dayCalendar(profile, selY, selM);
    const detail = el("div", { class: "cal-detail" });
    const showDay = (d) => {
      clear(detail);
      detail.append(
        el("p", {}, [el("b", { text: `${selY}.${selM}.${d.day} ${d.stemH}${d.branchH}(${d.stemKr}${d.branchKr})일` }), document.createTextNode(`  · 음력 ${d.lunar}${d.term ? " · " + d.term : ""}`)]),
        el("p", { class: "tiny", text: `천간 ${d.stemGod} · 지지 ${d.branchGod} · 12운성 ${d.stage} · ${d.sinsal}${d.sinsal2 !== d.sinsal ? "·" + d.sinsal2 : ""}${d.guiin ? " · 천을귀인 날 ✓" : ""}` }),
        el("button", { type: "button", class: "btn btn-primary btn-sm", style: "margin-top:6px; justify-self:start;", onclick: () => openDayFortune(profile, selY, selM, d) }, [el("span", { text: "이날 운세 자세히 보기 →" })]),
      );
    };
    const grid = el("div", { class: "cal-grid", "data-nokr": "" }, [
      ...["일", "월", "화", "수", "목", "금", "토"].map((w, i) => el("span", { class: "cal-w" + (i === 0 ? " sun" : i === 6 ? " sat" : ""), text: w })),
      ...Array.from({ length: C.first }, () => el("span", { class: "cal-empty" })),
      ...C.days.map((d) => el("button", { type: "button", class: "cal-d" + (d.isToday ? " today" : "") + (d.day === selD ? " is-sel" : "") + (d.guiin ? " guiin" : ""), onclick: (e) => {
        selD = d.day; grid.querySelectorAll(".cal-d.is-sel").forEach((x) => x.classList.remove("is-sel")); e.currentTarget.classList.add("is-sel"); showDay(d); openDayFortune(profile, selY, selM, d); } }, [
        el("span", { class: "cal-n" + (d.dow === 0 ? " sun" : d.dow === 6 ? " sat" : ""), text: String(d.day) }),
        el("span", { class: "cal-gz" }, [el("b", { class: `cz-${d.stemElem}`, text: d.stemH }), el("b", { class: `cz-${d.branchElem}`, text: d.branchH })]),
        el("span", { class: "cal-kr", text: d.stemKr + d.branchKr }),
        d.term ? el("span", { class: "cal-term", text: d.term }) : null,
        el("span", { class: "cal-lu", text: d.lunar }),
      ].filter(Boolean))),
    ]);
    const prev = () => { selM--; if (selM < 1) { selM = 12; selY--; } selD = 1; paintM(); };
    const next = () => { selM++; if (selM > 12) { selM = 1; selY++; } selD = 1; paintM(); };
    calBox.append(
      el("div", { class: "cal-head" }, [
        el("button", { type: "button", class: "tj-step", "aria-label": "이전 달", onclick: prev }, [el("span", { text: "‹" })]),
        el("b", { class: "serif", text: `${selY}년 ${String(selM).padStart(2, "0")}월 일진` }),
        el("button", { type: "button", class: "tj-step", "aria-label": "다음 달", onclick: next }, [el("span", { text: "›" })]),
      ]),
      grid, detail,
      el("p", { class: "tiny muted", text: "칸마다 날짜 · 일진(그날 간지) · 한글 · 절기 · 음력. 노란 점은 천을귀인 날이에요. 날짜를 누르면 나에게 어떤 날인지 보여줘요." }),
    );
    const dd = C.days[Math.min(selD, C.days.length) - 1];
    if (dd) showDay(dd);
  }
  if (selY === now.getFullYear()) { selM = now.getMonth() + 1; selD = now.getDate(); }
  paintD();
  if (opts.mode === "cal") return el("div", { class: "lk-box" }, [calBox]);
  if (opts.mode === "luck") mHead.dataset.nocal = "1";
  return el("div", { class: "lk-box" }, [
    el("p", { class: "ms-section-label tiny", text: "대운 (10년 운) · 누르면 그 10년의 세운" }),
    el("p", { class: "tiny muted", text: "위에서부터 천간 십성 · 천간 · 지지 · 지지 십성 · 12운성 · 12신살(년지·일지 기준). 분홍 테두리가 지금이에요." }),
    dRow, yHead, yRow, mHead, mRow, opts.mode === "luck" ? null : calBox,
  ].filter(Boolean));
}

/* ---- 날짜를 누르면 뜨는 '사주 일간 운세' 팝업 ---- */
const DAY_HEAD = {
  비견: ["내 편이 생기고 자신감이 붙는 날이에요.", "혼자보다 함께할 때 힘이 나요. 동료·친구와 손발이 잘 맞아요."],
  겁재: ["승부욕이 불타지만 지출도 커지기 쉬운 날이에요.", "경쟁에서 밀리지 않되, 돈 거래·내기는 오늘만큼은 피하세요."],
  식신: ["에너지가 넘치고 창의력과 표현력이 유창해집니다.", "당신의 능력을 주변에 자랑할 수 있는 날이에요."],
  상관: ["말과 재치가 반짝이는 날이에요.", "아이디어는 빛나지만 말 한마디가 화근이 될 수 있으니 윗사람 앞에선 한 번 더 생각하기."],
  편재: ["뜻밖의 기회와 돈이 움직이는 날이에요.", "활동적으로 움직일수록 수확이 커요. 새로운 사람에게서 좋은 소식이 와요."],
  정재: ["차곡차곡 쌓은 것이 보상으로 돌아오는 날이에요.", "꼼꼼하게 챙긴 일이 결실을 맺어요. 계획대로 움직이면 실속이 커요."],
  편관: ["압박과 책임이 몰려오지만 버티면 성장하는 날이에요.", "갑작스러운 일이 생길 수 있어요. 서두르지 말고 하나씩 처리하세요."],
  정관: ["인정받고 신뢰를 얻는 날이에요.", "원칙대로 움직이면 평가가 좋아요. 공식적인 자리·서류 일에 유리해요."],
  편인: ["직감이 날카로워지는 날이에요.", "남다른 생각이 떠올라요. 다만 생각만 많고 몸이 안 따라줄 수 있어요."],
  정인: ["도움과 응원이 들어오는 날이에요.", "윗사람·귀인의 도움을 받기 쉬워요. 공부·계약·문서 일이 잘 풀려요."],
};
const DAY_SCORE = { 비견: 70, 겁재: 58, 식신: 82, 상관: 72, 편재: 76, 정재: 80, 편관: 55, 정관: 78, 편인: 64, 정인: 84 };
const STAGE_DAY = {
  장생: "새싹이 돋듯 새로 시작하는 기운이에요. 처음 해 보는 일, 새 만남에 운이 따라요.",
  목욕: "꾸미고 싶고 마음이 들뜨는 기질이에요. 멋 부리기·연애엔 좋지만 충동구매는 조심하세요.",
  관대: "의욕과 자존심이 높아지는 기질이에요. 자신 있게 나서되 고집은 한 번 내려놓기.",
  건록: "스스로 일어서는 힘이 강한 날이에요. 혼자 맡은 일을 깔끔하게 해낼 수 있어요.",
  제왕: "기세가 최고조인 날이에요. 리더 역할에 딱이지만 너무 밀어붙이면 반발을 사요.",
  쇠: "노련하지만 기운이 살짝 꺾이는 날이에요. 무리한 일정보다 경험을 살린 정리가 좋아요.",
  병: "몸과 마음이 예민해지는 날이에요. 감수성은 깊어지지만 컨디션 관리가 먼저예요.",
  사: "머리가 복잡한 데 반해 몸은 무기력한 기질이에요. 행동보다 사색·공상에 빠지기 쉽고, 운이 나쁠 땐 가까운 사람이 아프거나 뜻밖의 지출이 생길 수 있어요.",
  묘: "모으고 저장하는 기운이에요. 저축·정리·마무리엔 좋지만 새 일을 벌이긴 아쉬운 날.",
  절: "끊고 새 판을 짜는 기운이에요. 변화가 갑작스러울 수 있으니 중요한 결정은 하루 미뤄도 좋아요.",
  태: "가능성을 품은 순수한 기운이에요. 계획을 세우고 씨앗을 뿌리기 좋은 날.",
  양: "보살핌을 받으며 크는 기운이에요. 주변의 도움을 편하게 받아들이면 운이 커져요.",
};
const SINSAL_DAY = {
  겁살: "예기치 못한 손실·빼앗김의 기운이에요. 소지품·돈 관리에 신경 쓰고 욕심은 줄이세요.",
  재살: "다툼·시비의 기운이에요. 말싸움·운전은 한 템포 늦춰서.",
  천살: "내 힘 밖의 변수가 생기는 기운이에요. 겸손하게, 계획엔 여유를 두세요.",
  지살: "이동과 시작의 기운이에요. 외출·출장·새 장소에서 좋은 일이 생겨요.",
  도화살: "매력과 인기가 올라가는 기운이에요. 사람을 만나면 호감을 사기 쉬워요.",
  월살: "메마르고 정체되는 기운이에요. 결과를 서두르기보다 꾸준히 버티는 게 답.",
  망신살: "체면이 깎일 수 있는 기운이에요. 말실수·SNS 글은 한 번 더 확인하세요.",
  장성살: "변화와 확장의 기운이에요. 리더십과 명예, 업무 성공을 돕는 날. 무리한 욕심만 부리지 않으면 부족한 운도 보충할 수 있어요.",
  반안살: "말안장에 오르듯 안정과 승진의 기운이에요. 윗사람의 도움이 들어와요.",
  역마살: "움직일수록 풀리는 기운이에요. 이동·여행·연락이 활발해져요.",
  육해살: "소모되고 발목 잡히기 쉬운 기운이에요. 건강과 관계에서 무리하지 마세요.",
  화개살: "혼자만의 시간이 빛나는 기운이에요. 공부·예술·명상에 집중하기 좋아요.",
};
/* 하루 상세 — 1코인 (당일은 무료, 이미 연 날은 다시 무료) */
export function openDayFortune(profile, Y, M, d, opts = {}) {
  const now = new Date();
  const isToday = now.getFullYear() === Y && now.getMonth() + 1 === M && now.getDate() === d.day;
  const P = profile.pillars;
  const who = `${P.year.gz}${P.month.gz}${P.day.gz}${P.hour ? P.hour.gz : ""}`;
  const itemId = `dayfortune:${who}:${Y}-${M}-${d.day}`;
  const cost = costOf("dayfortune");
  if (true) return showDayFortune(profile, Y, M, d);
  const coins = getCoins();
  const m = openModal([
    el("div", { class: "df-hero" }, [
      el("div", {}, [
        el("p", { class: "tiny", style: "opacity:.8;", text: `${M}월 ${d.day}일 · ${d.stemH}${d.branchH}(${d.stemKr}${d.branchKr})일 · 음력 ${d.lunar}` }),
        el("p", { class: "df-score", text: "🔒" }),
        el("p", { class: "df-hero-line", text: "이날의 점수·총운·연애·일·돈, 12신살과 운성으로 보는 하루" }),
      ]),
      el("img", { class: "df-cat", src: "assets/img/haemyo.webp", alt: "", "aria-hidden": "true" }),
    ]),
    el("p", { class: "muted tiny", style: "margin:12px 0 10px; text-align:center;", text: `오늘 날짜는 무료예요. 다른 날은 코인 ${cost}개로 열고, 한 번 열면 다시 볼 땐 무료! (보유 ${coins}개)` }),
    coins >= cost
      ? el("button", { type: "button", class: "btn btn-primary btn-block", onclick: () => {
          const r = unlock(itemId, cost);
          if (r.ok) { m.close(); showDayFortune(profile, Y, M, d); } else { noCoinToast(); }
        } }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: `코인 ${cost}개로 이날 운세 보기` })])
      : el("button", { type: "button", class: "btn btn-primary btn-block", onclick: () => { m.close(); location.hash = "#/store"; } }, [el("span", { text: "코인 받으러 가기" })]),
  ], { title: "사주 일간 운세" });
}
function showDayFortune(profile, Y, M, d) {
  const date = new Date(Y, M - 1, d.day);
  let f = null; try { f = todayFortune(profile, date); } catch { /* ignore */ }
  const [head, sub] = DAY_HEAD[d.stemGod] || ["", ""];
  let score = DAY_SCORE[d.stemGod] || 65;
  if (["제왕", "건록"].includes(d.stage)) score += 6; else if (["장생", "관대"].includes(d.stage)) score += 4;
  else if (["쇠", "병"].includes(d.stage)) score -= 3; else if (["사", "묘", "절"].includes(d.stage)) score -= 6;
  if (d.guiin) score += 6;
  score = Math.max(35, Math.min(96, score));
  const name = (getMyBirthName() || "당신");
  const WDK = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  const tone = score >= 85 ? "최고의 날" : score >= 75 ? "기분 좋은 날" : score >= 60 ? "무난한 날" : score >= 48 ? "숨 고르는 날" : "쉬어 가는 날";
  const label = (t) => el("p", { class: "dz-label", text: t });
  const row = (ic, k, v) => el("li", { class: "fd-row" }, [el("span", { class: "fd-ic", "aria-hidden": "true", text: ic }), el("b", { text: k }), el("span", { class: "fd-txt", text: v })]);
  const tile = (k, nm, sub2, body) => el("div", { class: "dz-tile" }, [el("span", { class: "dz-tile-k", text: k }), el("b", { class: "dz-tile-n", text: nm }), el("p", { class: "dz-tile-s", text: sub2 }), el("p", { class: "dz-tile-b", text: body })]);
  const m = openModal([
    el("div", { class: "dz-hero" }, [
      el("div", { class: "dz-hero-txt" }, [
        el("p", { class: "dz-date", text: `${M}월 ${d.day}일 ${WDK}요일 · ${d.stemH}${d.branchH}(${d.stemKr}${d.branchKr})일` }),
        el("p", { class: "dz-score" }, [el("b", { text: String(score) }), el("span", { text: "점" }), el("em", { text: tone })]),
        el("div", { class: "dz-meter", "aria-hidden": "true" }, [el("i", { style: `width:${score}%` })]),
        el("p", { class: "dz-head", text: head }),
        el("p", { class: "dz-lunar", text: `음력 ${d.lunar}` }),
      ]),
      el("img", { class: "dz-cat", src: "assets/img/haemyo.webp", alt: "", "aria-hidden": "true" }),
    ]),
    el("section", { class: "dz-sec" }, [label("오늘의 흐름"), el("p", { class: "dz-lead", text: `${sub} ${f ? f.theme : ""}`.trim() })]),
    f ? el("section", { class: "dz-sec" }, [label("연애 · 일 · 돈"), el("ul", { class: "fd-list" }, [row("💗", "연애", f.love), row("💼", "일", f.work), row("💰", "돈", f.money)])]) : null,
    el("section", { class: "dz-sec" }, [
      label("12운성 · 12신살로 보는 하루"),
      el("div", { class: "dz-tiles" }, [
        tile("12운성", d.stage, "나에게 작용하는 기질", STAGE_DAY[d.stage] || ""),
        tile("12신살", d.sinsal, "영향을 줄 수 있는 기운", SINSAL_DAY[d.sinsal] || ""),
      ]),
      (d.guiin || d.term) ? el("div", { class: "dz-flags" }, [
        d.guiin ? el("p", { class: "dz-flag gold" }, [el("b", { text: "✨ 천을귀인(天乙貴人)이 드는 날" }), el("span", { text: "위기 때 도와줄 사람이 나타나요. 부탁할 일이 있다면 오늘!" })]) : null,
        d.term ? el("p", { class: "dz-flag" }, [el("b", { text: `🍃 절기 · ${d.term}` }), el("span", { text: "계절의 기운이 바뀌는 날. 컨디션과 마음가짐을 새로 정돈해 보세요." })]) : null,
      ].filter(Boolean)) : null,
    ].filter(Boolean)),
    f ? el("section", { class: "dz-sec" }, [
      label("해묘의 한마디"),
      el("p", { class: "fd-advice", text: f.advice }),
      el("div", { class: "dz-lucky" }, [
        el("span", { class: "dz-chip" }, [el("small", { text: "행운색" }), el("b", { text: f.luckyColor })]),
        el("span", { class: "dz-chip" }, [el("small", { text: "행운 기운" }), el("b", { text: f.luckyElem })]),
      ]),
    ]) : null,
    el("footer", { class: "dz-foot" }, [
      el("p", { class: "dz-sign", text: `${name}님, 오늘도 해묘의 행운이 함께하기를 🐈` }),
      el("p", { class: "dz-note", text: "일간 운세는 흐름을 알려 줄 뿐 미래를 정하지 않아요. 흐름을 읽고 준비하면 더 좋은 하루가 돼요." }),
    ]),
  ].filter(Boolean), { title: "사주 일간 운세" });
  m.card.classList.add("dz-modal");
}
function getMyBirthName() { try { const m = JSON.parse(localStorage.getItem("str.mybirth.v1") || "{}"); const v = Object.values(m)[0]; return v && v.name; } catch { return ""; } }

/* 공망 풀이 — 뜻 + 내 사주 어느 자리가 비었는지 */
const GM_SEAT = {
  "년주": { area: "조상·집안·어린 시절", good: "집안 배경에 덜 얽매이고 스스로 길을 개척하는 힘이 있어요.", care: "윗대·집안의 도움을 기대하기보다 일찍 독립하는 편이 편해요. 어린 시절 허전함이 있었을 수 있어요." },
  "월주": { area: "부모·형제·사회(직장)", good: "틀에 박힌 조직보다 자유로운 방식·전문 분야에서 빛나요.", care: "직장·동료 덕이 약하게 느껴질 수 있어 이직·변동이 잦을 수 있어요. 기댈 곳보다 내 실력을 믿을 것." },
  "일주": { area: "배우자 자리·나 자신", good: "정신적·예술적 감수성이 깊고, 관계에서 집착이 적어요.", care: "배우자·연인에게 채워지지 않는 허전함을 느끼기 쉬워요. 상대에게 완벽을 바라기보다 각자의 시간을 존중하면 편해요." },
  "시주": { area: "자녀·말년·결실", good: "노후에 욕심을 내려놓고 취미·신앙·배움으로 채우는 삶이 잘 맞아요.", care: "자녀 문제나 일의 마무리에서 기대만큼 안 채워지는 느낌이 있을 수 있어요. 결과보다 과정에 의미를 두세요." },
};
function gongmangBlock(M) {
  const s = M.summary || {};
  const hits = [];
  M.pillars.forEach((p) => {
    if (p.empty) return;
    const by = [];
    if ((s.gongmangYearH || []).includes(p.branchH)) by.push("년주 기준");
    if ((s.gongmangDayH || []).includes(p.branchH)) by.push("일주 기준");
    if (by.length) hits.push({ p, by });
  });
  const rows = hits.map(({ p, by }) => {
    const g = GM_SEAT[p.pos] || {};
    return el("div", { class: "gm-hit" }, [
      el("p", { class: "gm-hit-t" }, [el("b", { text: `${p.pos} ${p.branchH}(${p.branchKr}) 공망` }), el("span", { class: "tiny muted", text: ` · ${by.join("·")} · ${g.area || ""}` })]),
      g.good ? el("p", { class: "tiny", text: "🌙 좋게 쓰면: " + g.good }) : null,
      g.care ? el("p", { class: "tiny", text: "⚠️ 조심할 점: " + g.care }) : null,
    ].filter(Boolean));
  });
  return el("details", { class: "gm-box", open: true }, [
    el("summary", {}, [el("span", { class: "ms-section-label tiny", text: "공망(空亡)이 뭐야?" }), el("span", { class: "rc-chevron" }, [icon("chevronDown")])]),
    el("p", { class: "tiny muted", style: "margin-top:6px;", text: "60갑자는 천간 10개·지지 12개가 짝을 지어 돌아서, 10일(순)마다 지지 2개가 짝 없이 남아요. 이 ‘비어 있는’ 두 지지가 공망이에요. 사주에서 그 글자가 있는 자리는 기운이 텅 비어 ‘채우려 해도 덜 채워지는’ 영역이 돼요. 대신 욕심을 내려놓으면 오히려 자유롭고 정신적인 힘이 커지는 자리이기도 해요. (합·충을 만나면 공망이 풀리기도 해요.)" }),
    el("p", { class: "tiny", style: "margin-top:6px;", text: `내 공망 글자 — 년주 기준 ${(s.gongmangYearH || []).map(hk).join("·") || "-"} / 일주 기준 ${(s.gongmangDayH || []).map(hk).join("·") || "-"}` }),
    hits.length
      ? el("div", { class: "gm-hits" }, rows)
      : el("p", { class: "tiny", style: "margin-top:6px;", text: "✓ 내 사주 네 기둥에는 공망 글자가 없어요. 비어 있는 자리 없이 기운이 고르게 채워진 편이라, 노력한 만큼 결과가 잘 붙는 구조예요. (대운·세운에서 공망 글자가 오는 해엔 일이 헛돌기 쉬우니 욕심을 줄이세요.)" }),
  ]);
}

/* 귀인·공망·월령 요약 */
function spiritSummary(s) {
  if (!s) return null;
  const rows = [];
  rows.push(["천을귀인", `${s.guiinH.join("·")}${s.guiinHit ? " · 내 사주에 있음 ✓" : " (내 사주엔 없음)"}`]);
  if (s.wollyeongH) rows.push(["월령", s.wollyeongH]);
  if (s.gongmangYearH) rows.push(["공망(년주 기준)", s.gongmangYearH.join("·")]);
  if (s.gongmangDayH) rows.push(["공망(일주 기준)", s.gongmangDayH.join("·")]);
  return el("div", { class: "ms-spiritsum" }, [
    el("p", { class: "ms-section-label tiny", text: "귀인·공망·월령" }),
    el("div", { class: "spirit-grid" }, rows.map(([k, v]) =>
      el("div", { class: "spirit-row" + (k === "천을귀인" && s.guiinHit ? " is-hit" : "") }, [
        el("span", { class: "spirit-k tiny muted", text: k }), el("span", { class: "spirit-v", text: v }),
      ]))),
  ]);
}

function msRow(label, val, term) {
  return el("div", { class: "ms-row" }, [el("span", { class: "ms-row-l", text: label }), el("span", { class: "ms-row-v", text: val, ...(term ? { "data-term": term } : {}) })]);
}

/* 신살·길흉신 — 각 용어에 마우스오버 뜻풀이(title) */
function termRow(label, terms) {
  if (!terms || !terms.length) return el("div", { class: "ms-row" }, [el("span", { class: "ms-row-l", text: label }), el("span", { class: "ms-row-v", text: "-" })]);
  return el("div", { class: "ms-row" }, [
    el("span", { class: "ms-row-l", text: label }),
    el("span", { class: "ms-row-v ms-terms" }, terms.map((t) =>
      el("span", { class: "ms-term", title: SINSAL_MEANING[t] || t, tabindex: "0" }, [el("span", { text: t })]))),
  ]);
}

/* ---- AI 대화형 상담 ---- */
const AI_CHAT_LOCKED = true; // 잠깐 잠금 — 다시 켜려면 false로
function aiChatCard(profile, input) {
  if (AI_CHAT_LOCKED) {
    return el("div", { class: "panel report-card ai-locked", style: "opacity:.85;" }, [
      el("div", { style: "display:flex; align-items:center; gap:10px;" }, [
        el("span", { class: "rc-index", style: "opacity:.6;" }, [icon("lock")]),
        el("div", { style: "flex:1;" }, [
          el("span", { class: "rc-title", style: "display:block;" }, [document.createTextNode("AI 상담 (대화형)")]),
          el("span", { class: "rc-sub", text: "준비 중이에요 · 곧 다시 열려요" }),
        ]),
        el("span", { class: "hap-tag", text: "잠금" }),
      ]),
    ]);
  }
  const body = el("div", { class: "rc-body" });
  const details = el("details", { class: "panel report-card", open: false, id: "sec-ai" }, [
    el("summary", {}, [
      el("span", { class: "rc-index" }, [icon("sparkle")]),
      el("span", { class: "rc-title" }, [document.createTextNode("AI 상담 (대화형)"), el("span", { class: "rc-sub", text: "내 명식을 근거로 자유롭게 물어보기" })]),
      el("span", { class: "rc-chevron" }, [icon("chevronDown")]),
    ]),
    body,
  ]);
  render();
  return details;

  function render() {
    clear(body);
    if (!isAIConfigured()) renderSetup(); else renderChat();
  }

  function renderSetup() {
    const provSeg = el("div", { class: "seg", role: "radiogroup" }, [
      segOpt("ai-prov", "anthropic", "Anthropic (Claude)", true),
      segOpt("ai-prov", "openai", "OpenAI (GPT)", false),
    ]);
    const keyI = el("input", { class: "input", type: "password", placeholder: "sk-... (API 키)", autocomplete: "off", "aria-label": "API 키" });
    const modelI = el("input", { class: "input", type: "text", placeholder: "모델(선택) — 예: claude-3-5-haiku-latest / gpt-4o-mini" });
    const err = el("p", { class: "field-error" });
    body.append(el("div", { class: "section-gap" }, [
      el("p", { class: "muted", style: "font-size:var(--fs-sm);", text: "명식을 근거로 대화형 상담을 받으려면 본인 API 키가 필요해요. 정적 웹앱이라 서버 없이 브라우저에서 직접 호출합니다." }),
      fieldWrap("AI 제공자", provSeg),
      fieldWrap("API 키", keyI),
      fieldWrap("모델 (선택)", modelI),
      err,
      el("button", { class: "btn btn-primary btn-block", onclick: () => {
        if (!keyI.value.trim()) { err.textContent = "API 키를 입력해 주세요."; return; }
        setAIConfig({ provider: provSeg.querySelector("input:checked").value, apiKey: keyI.value.trim(), model: modelI.value.trim() });
        toast("AI 상담이 켜졌어요."); render();
      } }, [icon("sparkle"), el("span", { text: "연결하고 상담 시작" })]),
      noticeBox("privacy", "API 키는 이 브라우저(localStorage)에만 저장돼요. 공용 기기에서는 입력하지 마세요. 사용료는 본인 키로 청구됩니다. 키는 Anthropic(console.anthropic.com) 또는 OpenAI(platform.openai.com)에서 발급받을 수 있어요."),
    ]));
  }

  function renderChat() {
    const cfg = getAIConfig();
    const messages = [];
    const log = el("div", { class: "ai-log" });
    const ta = el("textarea", { class: "input", rows: "2", placeholder: "예: 올해 이직해도 될까요? 지금 만나는 사람과 잘 맞을까요?", "aria-label": "질문" });
    const sendBtn = el("button", { class: "btn btn-primary", onclick: send }, [icon("arrowRight")]);
    let busy = false;

    const suggestions = ["올해 흐름이 어떤가요?", "지금 이직해도 될까요?", "재물운은 언제 풀리나요?", "저는 어떤 사람과 잘 맞나요?"];
    const chips = el("div", { class: "chip-grid", style: "margin-bottom:10px;" }, suggestions.map((q) =>
      el("button", { class: "chip", style: "min-height:auto; padding:6px 12px; cursor:pointer;", onclick: () => { ta.value = q; send(); } }, [el("span", { text: q })])));

    body.append(el("div", { class: "section-gap" }, [
      el("div", { style: "display:flex; align-items:center; justify-content:space-between; gap:8px;" }, [
        el("span", { class: "tiny muted", text: `${cfg.provider === "openai" ? "OpenAI" : "Anthropic"} · ${cfg.model || "기본 모델"}` }),
        el("button", { class: "btn btn-quiet btn-sm", onclick: () => { clearAIConfig(); toast("AI 설정을 초기화했어요."); render(); } }, [el("span", { text: "설정 변경" })]),
      ]),
      log, chips,
      el("div", { style: "display:flex; gap:8px; align-items:flex-end;" }, [ta, sendBtn]),
      el("p", { class: "tiny muted", text: "AI는 명식을 근거로 답하지만 완벽하지 않아요. 재미·참고용이며, 중요한 결정은 실제 정보·전문가와 함께 판단하세요." }),
    ]));

    ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });

    function bubble(role, text) {
      const b = el("div", { class: "ai-msg ai-" + role }, [el("div", { class: "ai-bubble", text })]);
      log.append(b); log.scrollTop = log.scrollHeight;
      return b.querySelector(".ai-bubble");
    }

    async function send() {
      const q = ta.value.trim();
      if (!q || busy) return;
      ta.value = ""; busy = true; sendBtn.disabled = true;
      bubble("user", q);
      messages.push({ role: "user", content: q });
      const out = bubble("assistant", "");
      out.classList.add("ai-typing"); out.textContent = "…";
      try {
        let acc = "";
        await streamChat({
          messages, profile, input,
          onToken: (t) => { acc += t; out.classList.remove("ai-typing"); out.textContent = acc; log.scrollTop = log.scrollHeight; },
        });
        messages.push({ role: "assistant", content: acc });
      } catch (e) {
        out.classList.remove("ai-typing");
        out.textContent = "⚠️ " + (e && e.message ? e.message : "요청에 실패했어요. 키·모델·네트워크를 확인해 주세요.");
      } finally { busy = false; sendBtn.disabled = false; }
    }
  }
}

function segOpt(name, value, label, checked) {
  return el("label", { class: "seg-opt" }, [
    el("input", { type: "radio", name, value, checked }),
    el("span", { text: label }),
  ]);
}
function fieldWrap(label, control) {
  return el("div", { class: "field" }, [el("label", { text: label }), control]);
}

/* ---- 연애·관계 타이밍 분석 (관계 흐름 분석 · 5코인) ---- */
function relationshipTool(profile, input, navigate) {
  const gender = input.gender === "male" ? "male" : "female";
  const relItemId = `reuniondeep:${input.birthDate || "?"}_${input.timeUnknown ? "x" : (input.birthTime || "-")}`;
  const startI = el("input", { class: "input", type: "date", max: todayStr(), "aria-label": "사귄 날" });
  const endI = el("input", { class: "input", type: "date", max: todayStr(), "aria-label": "헤어진 날" });

  // 상대방 정보(선택)
  const pDate = el("input", { class: "input", type: "date", max: todayStr(), "aria-label": "상대 생년월일" });
  const pTime = el("input", { class: "input", type: "time", "aria-label": "상대 출생 시간" });
  const pUnknown = el("input", { type: "checkbox" });
  pUnknown.addEventListener("change", () => { pTime.disabled = pUnknown.checked; pTime.style.opacity = pUnknown.checked ? "0.5" : "1"; });
  const pCal = segRadio("p-cal", [["solar", "양력"], ["lunar", "음력"]], "solar");
  const pLeap = el("input", { type: "checkbox" });
  const pLeapWrap = el("label", { class: "chip", style: "margin-top:8px; display:none;" }, [pLeap, el("span", { class: "check" }, [icon("check")]), el("span", { text: "윤달" })]);
  pCal.addEventListener("change", () => { pLeapWrap.style.display = pCal.querySelector('input[value="lunar"]').checked ? "" : "none"; });
  const pGender = segRadio("p-gender", [["female", "여성"], ["male", "남성"]], gender === "male" ? "female" : "male");

  const partnerBlock = el("details", { class: "sub-fold" }, [
    el("summary", { text: "상대방 정보 입력 (선택) — 합·충 궁합으로 더 정밀하게" }),
    el("div", { class: "section-gap", style: "margin-top: var(--sp-3);" }, [
      el("div", { class: "field" }, [el("label", { text: "상대 생년월일" }), pDate]),
      fieldLabelLocal("달력 기준", el("div", {}, [pCal, pLeapWrap])),
      el("div", { class: "field" }, [el("label", { text: "상대 출생 시간" }),
        el("div", { class: "section-gap" }, [pTime, el("label", { class: "chip", style: "width:fit-content;" }, [pUnknown, el("span", { class: "check" }, [icon("check")]), el("span", { text: "시간 모름" })])])]),
      fieldLabelLocal("상대 성별", pGender),
    ]),
  ]);

  const results = el("div", { class: "section-gap", style: "margin-top: var(--sp-4);", "aria-live": "polite" });
  const err = el("p", { class: "field-error" });
  const relCost = costOf("reuniondeep");
  const analyzeBtn = el("button", { class: "btn btn-primary btn-block", type: "button" },
    [icon("heart"), el("span", { text: isUnlocked(relItemId) ? "관계 흐름 분석하기" : `관계 흐름 분석하기 · 코인 ${relCost}` })]);

  const partnerVal = (name) => { const c = partnerBlock.querySelector(`input[name="${name}"]:checked`); return c ? c.value : ""; };

  analyzeBtn.addEventListener("click", () => {
    err.textContent = "";
    const sd = startI.value, ed = endI.value;
    if (!sd && !ed) { err.textContent = "사귄 날 또는 헤어진 날 중 하나 이상 입력해 주세요."; return; }
    // 5코인 게이트 — 한 번 열면 이 사람은 계속 무료
    if (!isUnlocked(relItemId)) {
      const u = unlock(relItemId, relCost);
      if (!u.ok) { err.textContent = `관계 흐름 분석은 코인 ${relCost}개가 필요해요. (보유 ${getCoins()}개)`; noCoinToast(); if (navigate) navigate("/store"); return; }
      toast(`관계 흐름 분석을 열었어요 · 코인 ${relCost} 차감`);
      clear(analyzeBtn); analyzeBtn.append(icon("heart"), el("span", { text: "관계 흐름 분석하기" }));
    }
    clear(results);

    if (sd) results.append(analysisCard(analyzeStart(profile, sd, gender), "heart"));
    if (ed) results.append(analysisCard(analyzeBreakup(profile, ed, gender), "alert"));

    // 상대방 궁합 (합·충)
    let partnerProfile = null;
    if (pDate.value) {
      partnerProfile = computeSaju({
        calendarType: partnerVal("p-cal") || "solar", birthDate: pDate.value,
        birthTime: pTime.value, timeUnknown: pUnknown.checked,
        leapMonth: pLeap.checked, gender: partnerVal("p-gender") || "female", timezone: input.timezone || "Asia/Seoul",
      });
      const h = harmonyBetween(profile, partnerProfile, { a: input.name || "나", b: "상대" });
      results.append(el("div", { class: "panel section-gap" }, [
        el("div", { class: "block-label", style: "color:var(--c-gold-soft);" }, [el("span", { class: "ic" }, [icon("users")]), el("span", { text: "상대방과의 합·충 궁합" })]),
        el("p", { class: "tiny muted", text: `내 일간 ${h.dayMasters.a} · 상대 일간 ${h.dayMasters.b} / 일지 ${h.dayRel}${h.ganhap ? " · 천간합" : ""}` }),
        el("ul", {}, h.reasons.map((t) => el("li", { text: t }))),
        insight(h.reunionHint),
      ]));
    }

    if (ed) {
      const now = new Date();
      const r = reunionOutlook(profile, gender, now.getFullYear());
      results.append(el("div", { class: "panel section-gap" }, [
        el("div", { class: "block-label", style: "color:var(--c-gold-soft);" }, [el("span", { class: "ic" }, [icon("clock")]), el("span", { text: "재회 가능성 — 연 단위 (앞으로 3년)" })]),
        el("div", { class: "year-flow" }, r.years.map((y) =>
          el("div", { class: "yf-item" + (y.favorable ? " is-current" : "") }, [
            el("div", { class: "yf-top" }, [
              el("span", { class: "yf-year", text: `${y.year}` }), el("span", { class: "yf-gz", text: y.gz }), el("span", { class: "yf-god", text: y.god }),
              y.favorable ? el("span", { class: "dt-now", text: "가능성↑" }) : null,
            ].filter(Boolean)),
            el("p", { class: "yf-line", text: y.note }),
          ])
        )),
        insight(r.summary),
      ]));

      // 월 단위 타이밍 (앞으로 12개월)
      const mf = monthlyFlow(profile, gender, now.getFullYear(), now.getMonth() + 1, 12);
      const favMonths = mf.filter((m) => m.favorable).map((m) => `${m.y}.${m.m}월`);
      results.append(el("div", { class: "panel section-gap" }, [
        el("div", { class: "block-label", style: "color:var(--c-gold-soft);" }, [el("span", { class: "ic" }, [icon("clock")]), el("span", { text: "월 단위 타이밍 (앞으로 12개월)" })]),
        el("div", { class: "month-grid" }, mf.map((m) =>
          el("div", { class: "mo-item" + (m.favorable ? " is-fav" : "") }, [
            el("span", { class: "mo-ym", text: `${String(m.y).slice(2)}.${m.m}` }),
            el("span", { class: "mo-god", text: m.god }),
          ]))),
        el("p", { class: "yf-line", text: favMonths.length ? `관계가 열리기 상대적으로 좋은 달: ${favMonths.join(", ")}. 인연·안정의 기운이 드는 시기예요.` : "앞으로 12개월은 관계보다 자신을 정비하기 좋은 흐름이에요." }),
      ]));
    }

    results.append(noticeBox("info", "이 분석은 ‘그 시기의 기운’을 사주로 읽은 참고 해석입니다. 관계의 시작·끝·재회는 운보다 두 사람의 마음과 선택이 훨씬 크게 좌우합니다. 불안이나 미련을 키우는 용도로 쓰지 마세요."));
    results.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  return el("details", { class: "panel report-card", id: "sec-love-timing" }, [
    el("summary", {}, [
      el("span", { class: "rc-index" }, [icon("heart")]),
      el("span", { class: "rc-title" }, [
        document.createTextNode("연애·관계 타이밍 분석"),
        el("span", { class: "rc-sub", text: "사귄 날·헤어진 날, 상대 생일로 합·충까지" }),
      ]),
      el("span", { class: "rc-chevron" }, [icon("chevronDown")]),
    ]),
    el("div", { class: "rc-body" }, [
      el("div", { class: "grid-2" }, [
        el("div", { class: "field" }, [el("label", { text: "사귄 날 (선택)" }), startI]),
        el("div", { class: "field" }, [el("label", { text: "헤어진 날 (선택)" }), endI]),
      ]),
      partnerBlock,
      err,
      analyzeBtn,
      results,
    ]),
  ]);
}

function segRadio(name, options, current) {
  return el("div", { class: "seg", role: "radiogroup" },
    options.map(([v, label]) => el("label", { class: "seg-opt" }, [
      el("input", { type: "radio", name, value: v, checked: current === v }),
      el("span", { text: label }),
    ])));
}
function fieldLabelLocal(label, control) {
  return el("fieldset", { class: "field" }, [el("legend", { class: "fieldset-label", text: label }), control]);
}

function analysisCard(a, ic) {
  return el("div", { class: "panel section-gap" }, [
    el("div", { style: "display:flex; align-items:baseline; gap:8px; flex-wrap:wrap;" }, [
      el("h3", { text: a.title }),
      el("span", { class: "tiny gold", text: `${a.when} · ${a.yearGZ}(${a.yearGod})${a.daeunGz ? " · 대운 " + a.daeunGz + "(" + a.daeunGod + ")" : ""}` }),
    ]),
    el("ul", {}, a.reasons.map((t) => el("li", { text: t }))),
    el("p", { class: "tiny muted", text: a.note }),
  ]);
}
function todayStr() { const d = new Date(); const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }

/* ---- 탭 공용 패널 ---- */
function tabPanel(ic, title, sub, children) {
  return el("div", { class: "panel report-card rt-panel" }, [
    el("div", { class: "rt-panel-head" }, [
      el("span", { class: "rc-index" }, [icon(ic)]),
      el("span", { class: "rc-title" }, [document.createTextNode(title), sub ? el("span", { class: "rc-sub", text: sub }) : null].filter(Boolean)),
    ]),
    el("div", { class: "rc-body" }, children.filter(Boolean)),
  ]);
}

const EL5 = [["wood", "목", "木"], ["fire", "화", "火"], ["earth", "토", "土"], ["metal", "금", "金"], ["water", "수", "水"]];
function elemDist(M) {
  const EC = M.elementCounts || {};
  const total = EL5.reduce((a, [k]) => a + (EC[k] || 0), 0) || 1;
  const maxC = Math.max(1, ...EL5.map(([k]) => EC[k] || 0));
  const msg = EL5.filter(([k]) => !(EC[k] || 0)).map(([, kr, h]) => `${h}(${kr})`);
  const over = EL5.filter(([k]) => (EC[k] || 0) >= 3).map(([, kr, h]) => `${h}(${kr})`);
  return el("div", { class: "ed-wrap" }, [
    el("div", { class: "elem-dist" }, EL5.map(([k, kr, h]) => el("div", { class: "elem-cell" }, [
      el("span", { class: "elem-n", text: `${EC[k] || 0}개 · ${Math.round(((EC[k] || 0) / total) * 100)}%` }),
      el("div", { class: "elem-bar-track" }, [el("div", { class: `elem-bar elem-${k}`, style: `height:${Math.max(4, Math.round(((EC[k] || 0) / maxC) * 100))}%;` })]),
      el("span", { class: "elem-lb", text: `${h}(${kr})` }),
    ]))),
    el("p", { class: "tiny muted", style: "margin-top:8px;", text:
      (msg.length ? `없는 오행: ${msg.join("·")} — 이 기운은 사람·환경·습관으로 채워 주면 좋아요. ` : "다섯 오행이 모두 있어요 — 고루 갖춘 편이에요. ") +
      (over.length ? `많은 오행: ${over.join("·")} — 이 기운의 장점이 크지만 지나치면 단점도 커져요.` : "") }),
  ]);
}

/* ---- 한눈에 ---- */
function overviewCard(profile, input, S, M, go) {
  const mini = el("div", { class: "ov-pillars" }, M.pillars.map((p) => p.empty
    ? el("div", { class: "ov-col" }, [el("span", { class: "ov-pos", text: p.pos }), el("span", { class: "ov-q", text: "?" }), el("span", { class: "ov-q", text: "?" })])
    : el("div", { class: "ov-col" + (p.isDay ? " is-day" : "") }, [
        el("span", { class: "ov-pos", text: p.pos + (p.isDay ? "·나" : "") }),
        elemTile(p.stemH, p.stemKr, p.stemElem, STEM_PLUS.includes(p.stemH)),
        elemTile(p.branchH, p.branchKr, p.branchElem, BRANCH_PLUS.includes(p.branchH), p.isGuiin),
      ])));
  const ys = S.yongsin[0];
  const tiles = [
    ["manse", "🗓️", "만세력", "여덟 글자·지장간·12운성"],
    ["ohaeng", "🌿", "오행 분석", "많은 기운·없는 기운"],
    ["sinsal", "✨", "신살·길성", "도화·역마·귀인 별"],
    ["strength", "⚖️", "신강/신약", `${S.levelName} · 용신 ${YS[ys].h}(${YS[ys].kr})`],
    ["luck", "🌊", "대운·연운", "10년·1년·1달 흐름"],
    ["cal", "📅", "일진 달력", "오늘은 무료로 보기"],
    ["love", "💞", "인연·관계", "재회·사귄 날 분석"],
    ["deep", "🔮", "상담·심층", "AI 상담·분야별 풀이"],
  ];
  return el("div", { class: "panel ov-card" }, [
    el("p", { class: "eyebrow", text: "한눈에 보는 내 사주" }),
    mini,
    el("div", { class: "ov-badges" }, [
      (() => { const dp = M.pillars.find((x) => x.isDay); return el("span", { class: "ov-badge", text: dp ? `일간 ${dp.stemH}(${dp.stemKr})` : `일간 ${profile.dayMaster}` }); })(),
      el("span", { class: "ov-badge st", text: `${S.levelName}` }),
      el("span", { class: `ov-badge ys elem-${ys}`, text: `용신 ${YS[ys].h}(${YS[ys].kr})` }),
      S.johu.element ? el("span", { class: "ov-badge", text: `조후 ${YS[S.johu.element].h}(${YS[S.johu.element].kr})` }) : null,
    ].filter(Boolean)),
    el("p", { class: "ov-lead", text: S.summary }),
    el("button", { type: "button", class: "ov-wonguk", onclick: () => { location.hash = "#/wonguk"; } }, [el("span", { class: "ov-em", text: "🧭" }), el("span", {}, [el("b", { text: "사주 원국 한눈에 보기" }), el("small", { text: "원국·십성·십이운성·형충회합·신살·대운을 한 화면에, 근거까지" })]), el("span", { class: "ov-go", text: "›" })]),
    el("div", { class: "ov-tiles" }, tiles.map(([id, em, t, d]) => el("button", { type: "button", class: "ov-tile", onclick: () => go(id) }, [
      el("span", { class: "ov-em", text: em }), el("b", { text: t }), el("span", { class: "tiny muted", text: d }),
    ]))),
  ]);
}

/* ---- 신강/신약 지수 · 용신 ---- */
const YS = {
  wood: { h: "木", kr: "목", color: "초록·청록", dir: "동쪽", num: "3·8", season: "봄", taste: "신맛·푸른 채소", thing: "화분·원목 소품", act: "산책·새로운 공부 시작" },
  fire: { h: "火", kr: "화", color: "빨강·분홍·보라", dir: "남쪽", num: "2·7", season: "여름", taste: "쓴맛·따뜻한 차", thing: "조명·캔들", act: "햇볕 쬐기·사람 많은 곳 가기" },
  earth: { h: "土", kr: "토", color: "노랑·베이지·갈색", dir: "집의 가운데", num: "5·10", season: "환절기", taste: "단맛·곡물·고구마", thing: "도자기·러그", act: "규칙적인 생활·정리정돈" },
  metal: { h: "金", kr: "금", color: "흰색·은색·금색", dir: "서쪽", num: "4·9", season: "가을", taste: "매운맛·견과류", thing: "금속 액세서리·시계", act: "운동·결단 내리기" },
  water: { h: "水", kr: "수", color: "검정·남색", dir: "북쪽", num: "1·6", season: "겨울", taste: "짠맛·해산물·물 많이", thing: "어항·물 소품", act: "충분한 수면·독서·명상" },
};
const MOTHER = { wood: "water", fire: "wood", earth: "fire", metal: "earth", water: "metal" };
const KILLER = { wood: "metal", fire: "water", earth: "wood", metal: "fire", water: "earth" };
const LV_DESC = ["기운이 아주 약해 주변 환경의 영향을 크게 받아요. 혼자보다 ‘좋은 사람·좋은 환경’ 속에 있을 때 훨씬 잘 풀려요.",
  "기운이 많이 약한 편이에요. 무리한 확장보다 체력·멘탈을 먼저 채우는 게 운을 키우는 길이에요.",
  "기운이 약한 편이에요. 섬세하고 협조적이지만 혼자 밀어붙이면 쉽게 지쳐요.",
  "균형에 가깝지만 살짝 약한 쪽이에요. 도와주는 사람이 있으면 실력이 확 살아나요.",
  "균형에 가깝지만 살짝 강한 쪽이에요. 주도성과 유연함을 함께 가진 좋은 균형이에요.",
  "기운이 강한 편이에요. 추진력·주체성이 강점, 넘치면 고집이 될 수 있어요.",
  "기운이 많이 강해요. 큰일을 맡을 그릇이지만 에너지를 ‘써서’ 풀어 줘야 막히지 않아요.",
  "기운이 아주 강해요. 한 분야를 끝까지 파는 힘이 있어요. 독주만 조심하면 크게 이뤄요."];
const DIST = [3, 7, 15, 25, 25, 15, 7, 3];

function strengthGauge(S) {
  const W = 320, base = 118, top = 40, step = (W - 20) / 8;
  const pts = DIST.map((d, i) => [10 + (i + 0.5) * step, base - (d / 25) * (base - top)]);
  const all = [[10, base - 2], ...pts, [W - 10, base - 2]];
  let d = `M${all[0][0]},${all[0][1]}`;
  for (let i = 0; i < all.length - 1; i++) {
    const p0 = all[i - 1] || all[i], p1 = all[i], p2 = all[i + 1], p3 = all[i + 2] || p2;
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  const area = d + ` L${W - 10},${base} L10,${base} Z`;
  const mx = 10 + (S.level + S.within) * step;
  // 곡선 높이 근사
  let my = base;
  for (let i = 0; i < all.length - 1; i++) if (mx >= all[i][0] && mx <= all[i + 1][0]) { const t = (mx - all[i][0]) / (all[i + 1][0] - all[i][0]); my = all[i][1] + (all[i + 1][1] - all[i][1]) * t; }
  const pct = Math.round(DIST.slice(0, S.level).reduce((a, b) => a + b, 0) + DIST[S.level] * S.within);
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 -4 ${W} 176`); svg.setAttribute("class", "sg-svg"); svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `신강신약 지수: ${S.levelName}, 약한 쪽부터 ${pct}% 위치`);
  const lbl = S.levels.map((t, i) => { const x = 10 + (i + 0.5) * step, c = `sg-lb${i === S.level ? " on" : ""}`;
    return t.length > 2 ? `<text x="${x}" y="136" text-anchor="middle" class="${c}">${t.slice(0, 2)}</text><text x="${x}" y="150" text-anchor="middle" class="${c}">${t.slice(2)}</text>`
      : `<text x="${x}" y="136" text-anchor="middle" class="${c}">${t}</text>`; }).join("");
  const bx = Math.min(W - 56, Math.max(56, mx));
  svg.innerHTML = `<defs><linearGradient id="sgG" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#bcd4ff"/><stop offset=".5" stop-color="#e3d6ff"/><stop offset="1" stop-color="#ffc9dc"/></linearGradient></defs>
    <rect x="${10 + S.level * step}" y="${top - 12}" width="${step}" height="${base - top + 12}" rx="8" class="sg-band"/>
    <path d="${area}" fill="url(#sgG)" opacity=".85"/><path d="${d}" fill="none" class="sg-line"/>
    <line x1="10" x2="${W - 10}" y1="${base}" y2="${base}" class="sg-axis"/>
    <line x1="${W / 2}" x2="${W / 2}" y1="${top - 8}" y2="${base}" class="sg-mid"/>
    <line x1="${mx}" x2="${mx}" y1="${my}" y2="${base}" class="sg-mk-line"/>
    <circle cx="${mx}" cy="${my}" r="6.5" class="sg-dot"/>
    <rect x="${bx - 52}" y="${Math.max(-2, my - 38)}" width="104" height="26" rx="13" class="sg-bub"/>
    <text x="${bx}" y="${Math.max(-2, my - 38) + 17.5}" text-anchor="middle" class="sg-bub-t">나 · ${S.levelName} ${pct}%</text>
    ${lbl}
    <text x="10" y="170" class="sg-end">← 약함 身弱(신약)</text><text x="${W - 10}" y="170" text-anchor="end" class="sg-end">강함 身强(신강) →</text>`;
  return { svg, pct };
}

function strengthCard(profile, S) {
  const s = S || analyzeStrength(profile);
  const { svg, pct } = strengthGauge(s);
  const dot = (on, name, hanja, desc) => el("div", { class: "sg-chk" + (on ? " on" : "") }, [
    el("span", { class: "sg-c", text: on ? "●" : "○" }),
    el("b", { "data-term": name, text: `${name}(${hanja})` }),
    el("span", { class: "tiny muted", text: (on ? "있음 — " : "없음 — ") + desc }),
  ]);
  const ysCard = (e, role, roleDesc) => el("div", { class: `ys-card elem-${e}` }, [
    el("div", { class: "ys-top" }, [el("span", { class: "ys-h", text: YS[e].h }), el("div", {}, [el("span", { class: "ys-role", text: role }), el("b", { text: `${YS[e].kr}(${YS[e].h}) 기운` })])]),
    el("p", { class: "tiny", text: roleDesc }),
    el("dl", { class: "ys-dl" }, [
      ["행운 색", YS[e].color], ["방향", YS[e].dir], ["숫자", YS[e].num], ["계절", YS[e].season], ["음식", YS[e].taste], ["소품", YS[e].thing], ["습관", YS[e].act],
    ].flatMap(([k, v]) => [el("dt", { text: k }), el("dd", { text: v })])),
  ]);
  const y0 = s.yongsin[0];
  const hee = MOTHER[y0], gi = KILLER[y0];
  return el("div", { class: "panel report-card rt-panel" }, [
    el("div", { class: "rt-panel-head" }, [
      el("span", { class: "rc-index" }, [icon("compass")]),
      el("span", { class: "rc-title" }, [document.createTextNode("신강·신약 지수 · 용신"), el("span", { class: "rc-sub", text: "억부(抑扶)·조후(調候)로 본 나의 균형과 도움 오행" })]),
    ]),
    el("div", { class: "rc-body section-gap" }, [
      el("div", { class: "sg-head" }, [
        el("span", { class: "st-badge " + ({ 신강: "st-strong", 신약: "st-weak", 중화: "st-balance" }[s.strength]), text: s.levelName }),
        el("span", { class: "tiny muted", text: `일간 ${profile.dayMaster} · ${s.dayElemKr} · 100명 중 약 ${pct}명이 나보다 기운이 약해요` }),
      ]),
      el("div", { class: "sg-box" }, [svg]),
      el("p", { class: "summary-lead", style: "font-size:1rem;", text: LV_DESC[s.level] }),
      el("div", { class: "sg-chks" }, [
        dot(s.deukryeong, "득령", "得令", "태어난 달(계절)이 나를 돕는가"),
        dot(s.deukji, "득지", "得地", "내가 앉은 자리(일지)가 나를 돕는가"),
        dot(s.deukse, "득세", "得勢", "여덟 글자 중 내 편이 많은가"),
      ]),
      el("p", { class: "tiny muted", text: `부조(나를 돕는 힘) ${s.support} : 설극(힘을 빼는 기운) ${s.drain}. 득령·득지·득세 중 2개 이상이면 대체로 신강, 1개 이하면 신약 쪽이에요.` }),
      el("h3", { class: "ys-title", text: "나의 용신 · 희신 · 기신" }),
      el("p", { class: "tiny muted", text: s.yongsinDesc }),
      el("div", { class: "ys-grid" }, [
        ysCard(y0, "용신 用神", "나에게 가장 필요한 기운이에요. 이 기운이 들어오는 해·사람·환경에서 운이 풀려요."),
        s.yongsin[1] ? ysCard(s.yongsin[1], "보조 용신", "용신과 함께 힘을 보태 주는 기운이에요.") : ysCard(hee, "희신 喜神", "용신을 낳아 주는(도와주는) 기운이라 함께 있으면 더 좋아요."),
        s.johu.element && !s.yongsin.includes(s.johu.element) ? ysCard(s.johu.element, "조후 調候", s.johu.note) : null,
      ].filter(Boolean)),
      el("div", { class: "block tag-warn ys-gi" }, [
        el("span", { class: "block-label" }, [el("span", { class: "ic" }, [icon("alert")]), el("span", { text: `기신(忌神) — 조심할 기운: ${YS[gi].kr}(${YS[gi].h})` })]),
        el("p", { text: `용신을 누르는 기운이에요. ${YS[gi].color} 계열이 너무 많거나, ${YS[gi].season}철·${YS[gi].dir} 방향에서 일이 꼬이면 잠깐 속도를 늦추고 용신 기운으로 균형을 맞춰 주세요.` }),
      ]),
      el("div", { class: "block tag-action" }, [
        el("span", { class: "block-label" }, [el("span", { class: "ic" }, [icon("lightbulb")]), el("span", { text: "이렇게 활용하세요" })]),
        el("ul", {}, s.apply.map((t) => el("li", { text: t }))),
      ]),
      el("p", { class: "tiny muted", text: `※ 용신 기운을 가진 사람(예: ${s.yongsinAnimals.slice(0, 4).join("·")})이나 그 오행이 강한 시기가 힘이 돼요. 그래프의 분포는 이해를 돕기 위한 대략적인 모양이고, 격국·통관까지 본 정밀 판정이 아닌 억부·조후 간이 판정이에요.` }),
    ]),
  ]);
}

/* ---- 오늘의 운세 ---- */
function todayCard(profile) {
  const f = todayFortune(profile, new Date());
  const line = (label, ic, text) => el("div", { class: "block tag-read", style: "padding:8px 0;" }, [
    el("span", { class: "block-label" }, [el("span", { class: "ic" }, [icon(ic)]), el("span", { text: label })]),
    el("p", { style: "font-size:var(--fs-sm);", text }),
  ]);
  return el("div", { class: "panel panel-gold section-gap" }, [
    el("div", { style: "display:flex; align-items:baseline; justify-content:space-between; gap:8px; flex-wrap:wrap;" }, [
      el("h3", { class: "gold", text: "오늘의 운세" }),
      el("span", { class: "tiny muted", text: `${f.date} · 일진 ${f.iljinH}(${f.iljin})` }),
    ]),
    insight(f.theme),
    el("div", {}, [line("연애", "heart", f.love), line("일·직업", "briefcase", f.work), line("금전", "coins", f.money)]),
    el("div", { class: "block tag-action" }, [
      el("span", { class: "block-label" }, [el("span", { class: "ic" }, [icon("lightbulb")]), el("span", { text: "오늘의 조언" })]),
      el("p", { text: f.advice }),
    ]),
    el("p", { class: "tiny muted", text: `오늘 도움이 되는 기운 — ${f.luckyElem} · 행운의 색 ${f.luckyColor}` }),
    el("p", { class: "tiny muted", text: "※ 오늘 하루의 ‘기운의 방향’을 보는 재미용 참고입니다. 매일 달라져요." }),
  ]);
}

/* ---- 귀인 · 악연 ---- */
function guiinCard(profile) {
  const g = benefactorFoe(profile);
  const chips = (arr) => el("div", { class: "chip-grid", style: "margin-top:6px;" }, arr.map((t) => el("span", { class: "chip", style: "min-height:auto; padding:5px 12px;", text: t })));
  const details = el("details", { class: "panel report-card", open: true });
  details.append(
    el("summary", {}, [
      el("span", { class: "rc-index" }, [icon("users")]),
      el("span", { class: "rc-title" }, [document.createTextNode("귀인 · 악연"), el("span", { class: "rc-sub", text: "나를 돕는 사람과 조심할 사람의 결" })]),
      el("span", { class: "rc-chevron" }, [icon("chevronDown")]),
    ]),
    el("div", { class: "rc-body section-gap" }, [
      el("div", { class: "block tag-good" }, [
        el("span", { class: "block-label" }, [el("span", { class: "ic" }, [icon("check")]), el("span", { text: "귀인 — 나를 돕는 사람" })]),
        el("p", { text: g.benefactor.desc }),
        chips([...g.benefactor.animals, ...(g.benefactor.cheoneul.length ? ["천을귀인: " + g.benefactor.cheoneul.join("·")] : [])]),
      ]),
      el("div", { class: "block tag-summary" }, [
        el("span", { class: "block-label" }, [el("span", { class: "ic" }, [icon("users")]), el("span", { text: "동료 — 잘 통하는 사람" })]),
        el("p", { text: g.peer.desc }),
        chips(g.peer.animals),
      ]),
      el("div", { class: "block tag-warn" }, [
        el("span", { class: "block-label" }, [el("span", { class: "ic" }, [icon("alert")]), el("span", { text: "악연 — 조심할 사람" })]),
        el("p", { text: g.foe.desc }),
        chips([...g.foe.animals, "충: " + g.foe.chung]),
      ]),
      noticeBox("info", "특정 띠·사람을 단정해 편을 가르는 용도가 아닙니다. ‘이런 기운의 사람과는 이렇게 어울리기 쉽다’는 경향으로만 참고하세요. 관계는 결국 서로의 태도로 달라집니다."),
    ])
  );
  return details;
}

/* ---- 매력 신살 · 이상형 · 배우자 초상 ---- */
function spouseCard(profile, input, navigate) {
  const gender = input.gender === "male" ? "male" : "female";
  const charm = charmSpirits(profile);
  const ideal = idealType(profile, gender);
  const portraitId = chartItemId("spouse-portrait", input);
  const pCost = costOf("spouse-portrait");

  const portraitHost = el("div", { style: "margin-top: var(--sp-4);" });
  function paintPortrait() {
    clear(portraitHost);
    if (!isUnlocked(portraitId)) {
      const coins = getCoins();
      const box = el("div", { class: "panel premium-lock" }, [
        el("span", { class: "lock-badge" }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: `코인 ${pCost}개` })]),
        el("h4", { class: "serif", style: "margin-top:10px;", text: "결혼 배우자 초상 그려 보기" }),
        el("p", { class: "muted", style: "font-size:var(--fs-sm);", text: "배우자궁(일지)과 배우자성의 오행으로 미래 배우자의 이미지를 그려 드려요. 사주로 상상한 그림이라 실제 사진은 아니에요." }),
      ]);
      box.append(el("button", { class: "btn btn-primary btn-block", style: "margin-top: var(--sp-4);", onclick: () => {
        if (coins < pCost) { noCoinToast(); navigate("/store"); return; }
        const r = unlock(portraitId, pCost);
        if (r.ok) { toast(r.reason === "already" ? "이미 열어 둔 초상이에요." : `배우자 초상을 그렸어요 · 코인 ${pCost} 차감`); paintPortrait(); }
        else { noCoinToast(); navigate("/store"); }
      } }, [el("span", { text: coins >= pCost ? `코인 ${pCost}개로 배우자 초상 보기 · 보유 ${coins}개` : "코인 받으러 가기" })]));
      portraitHost.append(box);
      return;
    }
    const port = spousePortrait(profile, gender);
    const svgWrap = el("div", { class: "portrait-wrap" });
    svgWrap.innerHTML = portraitSvg(port, 220);
    portraitHost.append(el("div", { class: "panel section-gap" }, [
      el("div", { class: "block-label", style: "color:var(--c-gold-soft);" }, [el("span", { class: "ic" }, [icon("heart")]), el("span", { text: "결혼 배우자 초상" })]),
      svgWrap,
      el("p", { style: "font-weight:600; margin-top:6px;", text: `배우자궁 ${port.seatH} · 배우자성 ${port.elemKr}` }),
      el("ul", {}, port.traits.map((t) => el("li", { text: t }))),
      insight(port.summary),
      noticeBox("info", "사주(배우자궁·배우자성)로 상상해 본 이미지예요. 실제 인물의 사진·확정이 아니라 ‘이런 결의 사람과 인연이 되기 쉽다’는 재미·참고용입니다."),
    ]));
  }
  paintPortrait();

  return el("details", { class: "panel report-card", id: "sec-spouse" }, [
    el("summary", {}, [
      el("span", { class: "rc-index" }, [icon("heart")]),
      el("span", { class: "rc-title" }, [
        document.createTextNode("매력·이상형·배우자 초상"),
        el("span", { class: "rc-sub", text: "도화·홍염·화개 · 내 이상형 · 배우자 이미지" }),
      ]),
      el("span", { class: "rc-chevron" }, [icon("chevronDown")]),
    ]),
    el("div", { class: "rc-body" }, [
      // 매력 신살
      el("h4", { class: "flow-h", text: "매력 신살 — 도화·홍염·화개" }),
      el("div", { class: "charm-list" }, charm.items.map((it) =>
        el("div", { class: "charm-row" + (it.on ? " on" : "") }, [
          el("span", { class: "charm-key", title: SINSAL_MEANING[it.key] || "", text: it.key }),
          el("span", { class: "charm-badge", text: it.on ? "있음" : "약함" }),
          el("p", { class: "charm-desc muted tiny", text: it.desc }),
        ]))),
      el("hr", { class: "divider" }),
      // 이상형
      el("h4", { class: "flow-h", text: "내 이상형" }),
      el("div", { class: "panel section-gap", style: "background:none; border:0; padding:0;" }, [
        el("p", { class: "tiny muted", text: `배우자성 ${ideal.god} · ${ideal.elemKr}` }),
        el("p", { style: "font-weight:600;", text: ideal.look }),
        insight(ideal.line),
      ]),
      el("hr", { class: "divider" }),
      // 배우자 초상 (5코인)
      portraitHost,
    ]),
  ]);
}

/* ---- 재회·새 인연 흐름 (독립) ---- */
function reunionCard(profile, input) {
  const gender = input.gender === "male" ? "male" : "female";
  const from = new Date().getFullYear();
  const r = reunionOutlook(profile, gender, from);
  return el("div", { class: "panel section-gap" }, [
    el("div", { class: "block-label", style: "color:var(--c-gold-soft);" }, [el("span", { class: "ic" }, [icon("heart")]), el("span", { text: "재회 · 새 인연 흐름 (앞으로 3년)" })]),
    el("div", { class: "year-flow" }, r.years.map((y) =>
      el("div", { class: "yf-item" + (y.favorable ? " is-current" : "") }, [
        el("div", { class: "yf-top" }, [
          el("span", { class: "yf-year", text: `${y.year}` }), el("span", { class: "yf-gz", text: y.gz }), el("span", { class: "yf-god", text: y.god }),
          y.favorable ? el("span", { class: "dt-now", text: "인연↑" }) : null,
        ].filter(Boolean)),
        el("p", { class: "yf-line", text: y.note }),
      ]))),
    insight(r.summary),
    el("p", { class: "tiny muted", text: "재회든 새 인연이든 관계가 열리기 쉬운 시기입니다. 사귄 날·헤어진 날을 알면 아래 ‘연애 타이밍 분석’에서 더 자세히 볼 수 있어요." }),
  ]);
}

/* ---- 세운 — 지난 해 · 앞으로의 해 넘겨 보기 ---- */
function yearFlowBlock(profile, curYear) {
  const birthY = profile.solar ? profile.solar.Y : curYear - 30;
  let from = window.__yfFrom != null ? window.__yfFrom : curYear;
  const host = el("div", { class: "yf-block" });
  function paint() {
    clear(host);
    from = Math.max(birthY, Math.min(curYear + 60, from)); window.__yfFrom = from;
    const years = yearFlow(profile, from, 6, curYear);
    const to = from + 5;
    host.append(
      el("div", { class: "yf-head" }, [
        el("h4", { class: "flow-h", style: "margin:0;", text: to < curYear ? `지난 해 — 세운 (${from}~${to})` : from > curYear ? `다가올 해 — 세운 (${from}~${to})` : `세운 (${from}~${to})` }),
        el("div", { class: "yf-nav" }, [
          el("button", { type: "button", class: "yf-btn", disabled: from <= birthY, onclick: () => { from -= 6; paint(); } }, [el("span", { text: "‹ 이전 6년" })]),
          from !== curYear ? el("button", { type: "button", class: "yf-btn now", onclick: () => { from = curYear; paint(); } }, [el("span", { text: "올해로" })]) : null,
          el("button", { type: "button", class: "yf-btn", onclick: () => { from += 6; paint(); } }, [el("span", { text: "다음 6년 ›" })]),
        ].filter(Boolean)),
      ]),
      el("div", { class: "year-flow" }, years.map((y) =>
        el("div", { class: "yf-item" + (y.isCurrent ? " is-current" : "") + (y.year < curYear ? " is-past" : "") }, [
          el("div", { class: "yf-top" }, [
            el("span", { class: "yf-year", text: `${y.year}` }),
            el("span", { class: "yf-gz" + (y.guiin ? " gz-guiin" : ""), "data-nokr": "" }, [document.createTextNode(y.hanja), el("small", { class: "gz-kr", text: hkOnly(y.hanja) })]),
            el("span", { class: "yf-god", text: `${y.tenGod}·${y.branchGod}` }),
            y.isCurrent ? el("span", { class: "dt-now", text: "올해" }) : el("span", { class: "yf-age tiny muted", text: `${y.year - birthY + 1}세` }),
          ].filter(Boolean)),
          el("p", { class: "yf-sub tiny muted" }, [el("span", { text: "십이운성 " }), el("span", { text: y.stage, "data-term": y.stage }), el("span", { text: `${y.sinsal && y.sinsal.length ? " · 신살 " + y.sinsal.join("·") : ""}${y.guiin ? " · 천을귀인 ✓" : ""}` })]),
          el("p", { class: "yf-label", text: y.label }),
          el("p", { class: "yf-line", text: y.year < curYear ? y.line.replace(/할 수 있어요/g, "했을 수 있어요").replace(/커집니다/g, "커졌던 해예요") : y.line }),
        ])
      )),
      from < curYear ? el("p", { class: "tiny muted", style: "margin-top:6px;", text: "지난 해는 ‘그때 이런 기운이 흘렀다’를 돌아보는 용도예요. 실제 있었던 일과 맞춰 보면 내 사주의 결을 더 잘 알 수 있어요." }) : null,
    );
  }
  paint();
  return host;
}

/* ---- 운의 흐름: 대운 타임라인 + 세운 ---- */
function flowSection(profile, input) {
  const today = new Date();
  const curYear = today.getFullYear();
  const age = profile.solar ? ageFromSolar(profile.solar, today) : null;
  const daeun = daeunTimeline(profile, age);
  const cur = daeun.find((d) => d.isCurrent) || null;

  const details = el("details", { class: "panel report-card", open: true, id: "sec-flow" });
  details.append(
    el("summary", {}, [
      el("span", { class: "rc-index" }, [icon("clock")]),
      el("span", { class: "rc-title" }, [
        document.createTextNode("운의 흐름 — 대운과 다가올 해"),
        el("span", { class: "rc-sub", text: "십신으로 본 시기별 테마 · 믿거나 말거나, 참고용" }),
      ]),
      el("span", { class: "rc-chevron" }, [icon("chevronDown")]),
    ]),
    el("div", { class: "rc-body" }, [
      el("h4", { class: "flow-h", text: "대운 — 10년 단위의 큰 흐름" }),
      daeunFlowBlock(profile, input, el("div", { class: "daeun-timeline", role: "list" }, daeun.map((d) =>
        el("div", { class: "dt-item" + (d.isCurrent ? " is-current" : ""), role: "listitem", "data-age": String(d.ageStart) }, [
          el("span", { class: "dt-age", text: `${d.ageStart}–${d.ageEnd}세` }),
          el("span", { class: "dt-gz" + (d.guiin ? " gz-guiin" : ""), "data-nokr": "" }, [document.createTextNode(d.hanja), el("small", { class: "gz-kr", text: hkOnly(d.hanja) })]),
          el("span", { class: "dt-god", text: `${d.tenGod}·${d.branchGod}` }),
          el("span", { class: "dt-sub tiny muted" }, [el("span", { text: d.stage, "data-term": d.stage }), el("span", { text: `${d.sinsal && d.sinsal.length ? " · " + d.sinsal.join("·") : ""}${d.guiin ? " · 귀인" : ""}` })]),
          el("span", { class: "dt-label", text: d.label.replace("의 시기", "") }),
          d.isCurrent ? el("span", { class: "dt-now", text: "현재" }) : null,
        ].filter(Boolean))
      ))),
      cur
        ? el("div", { class: "insight", style: "margin-top:14px;" }, [
            document.createTextNode(`지금은 ‘${cur.label}’. ${cur.line} `),
            el("b", { class: "gold", text: cur.do }),
          ])
        : el("p", { class: "muted tiny", style: "margin-top:10px;", text: age != null && daeun.length && age < daeun[0].ageStart ? `첫 대운은 ${daeun[0].ageStart}세부터 시작됩니다.` : "" }),

      el("hr", { class: "divider" }),
      yearFlowBlock(profile, curYear),
      noticeBox("info", "미래의 흐름은 정해진 사건이 아니라 ‘가능성이 커지는 방향’입니다. 좋게 나온 해라고 방심하지 말고, 부담스러운 해라도 대응할 수 있으니 겁먹지 마세요. 재미로 참고하고, 중요한 결정은 실제 상황과 함께 판단하세요."),
    ])
  );
  return details;
}

// 오행 색상 클래스
const STEM_EL = { "갑": "wood", "을": "wood", "병": "fire", "정": "fire", "무": "earth", "기": "earth", "경": "metal", "신": "metal", "임": "water", "계": "water" };
const BRANCH_EL = { "자": "water", "축": "earth", "인": "wood", "묘": "wood", "진": "earth", "사": "fire", "오": "fire", "미": "earth", "신": "metal", "유": "metal", "술": "earth", "해": "water" };
const H_STEM = { "갑": "甲", "을": "乙", "병": "丙", "정": "丁", "무": "戊", "기": "己", "경": "庚", "신": "辛", "임": "壬", "계": "癸" };
const H_BRANCH = { "자": "子", "축": "丑", "인": "寅", "묘": "卯", "진": "辰", "사": "巳", "오": "午", "미": "未", "신": "申", "유": "酉", "술": "戌", "해": "亥" };
const elemClass = (ch, isBranch) => (isBranch ? BRANCH_EL[ch] : STEM_EL[ch]) || "earth";
const hanjaStem = (p) => H_STEM[p.stem] || p.stem;
const hanjaBranch = (p) => H_BRANCH[p.branch] || p.branch;

function metersView(meters) {
  const max = Math.max(...meters.map((m) => m.value), 1);
  return el("div", { class: "meters", role: "img", "aria-label": "오행 성향 강도" },
    meters.map((m) => el("div", { class: "meter" }, [
      el("span", { class: "m-label", text: m.label }),
      el("span", { class: "m-track" }, [
        el("span", { class: "m-fill", style: `width:${Math.round((m.value / max) * 100)}%` }),
      ]),
      el("span", { class: "m-val", text: m.keyword }),
    ]))
  );
}

function sectionCard(sec, index) {
  const details = el("details", { class: "panel report-card", id: "sec-" + sec.id, open: sec.focused });
  const summary = el("summary", {}, [
    el("span", { class: "rc-index", text: String(index) }),
    el("span", { class: "rc-title" }, [
      document.createTextNode(sec.title),
      el("span", { class: "rc-sub", text: sec.sub + (sec.focused ? " · 집중 분야" : "") }),
    ]),
    el("span", { class: "rc-chevron" }, [icon("chevronDown")]),
  ]);
  const body = el("div", { class: "rc-body" }, sec.blocks.map(renderBlock));
  details.append(summary, body);
  return details;
}

function habitsCard(habits, index) {
  const details = el("details", { class: "panel report-card", id: "sec-habits", open: true });
  details.append(
    el("summary", {}, [
      el("span", { class: "rc-index", text: String(index) }),
      el("span", { class: "rc-title" }, [
        document.createTextNode("개선해야 할 습관 3가지"),
        el("span", { class: "rc-sub", text: "원인 · 사례 · 행동 · 주간 과제" }),
      ]),
      el("span", { class: "rc-chevron" }, [icon("chevronDown")]),
    ]),
    el("div", { class: "rc-body section-gap" }, habits.map((h, i) => habitItem(h, i + 1)))
  );
  return details;
}

function habitItem(h, n) {
  return el("div", { class: "habit" }, [
    el("h4", { text: `${n}. ${h.title}` }),
    el("dl", {}, [
      el("dt", { text: "왜 반복되나" }), el("dd", { text: h.reason }),
      el("dt", { text: "실제 사례" }), el("dd", { text: h.example }),
      el("dt", { text: "고치기 위한 행동" }), el("dd", { text: h.action }),
    ]),
    el("div", { class: "task" }, [el("b", { text: "이번 주 작은 과제 — " }), document.createTextNode(h.task)]),
  ]);
}

function shortTitle(t) {
  return t.replace(/\s*구조$/, "").replace("개선해야 할 습관 3가지", "개선 습관").slice(0, 8);
}

function openAndScroll(id) {
  const node = document.getElementById("sec-" + id);
  if (node) {
    node.open = true;
    node.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function setupScrollSpy(root) {
  const links = Array.from(root.querySelectorAll("[data-jump]"));
  if (!("IntersectionObserver" in window)) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        const id = e.target.id.replace("sec-", "");
        links.forEach((l) => l.classList.toggle("is-active", l.getAttribute("data-jump") === id));
      }
    });
  }, { rootMargin: "-30% 0px -60% 0px" });
  root.querySelectorAll(".report-card").forEach((c) => obs.observe(c));
}

/* ---- 액션바: 저장/공유/복사 ---- */
function buildActionBar({ data, navigate, saved, savedId, report, input, profile }) {
  const saveBtn = el("button", { class: "btn btn-primary", style: "flex:1;" },
    saved ? [icon("check"), el("span", { text: "저장됨" })] : [icon("bookmark"), el("span", { text: "결과 저장" })]);
  if (saved) saveBtn.disabled = true;

  saveBtn.addEventListener("click", () => {
    const id = savedId || makeId("saju");
    const title = (input.name ? input.name + "님 · " : "") + "사주 성향 리포트";
    saveResult({ id, type: "saju", title, createdAt: Date.now(), input, profile, report });
    toast("결과를 이 브라우저에 저장했어요.");
    saveBtn.disabled = true;
    clear(saveBtn); saveBtn.append(icon("check"), el("span", { text: "저장됨" }));
  });

  const shareBtn = el("button", { class: "btn btn-ghost" }, [icon("share"), el("span", { text: "공유" })]);
  shareBtn.addEventListener("click", () => openShareSheet({ report, input, profile }));

  const copyBtn = el("button", { class: "btn btn-ghost", "aria-label": "핵심 요약 복사" }, [icon("copy")]);
  copyBtn.addEventListener("click", async () => {
    const ok = await copyText(sajuSummaryText(report, input));
    toast(ok ? "핵심 요약을 복사했어요." : "복사에 실패했어요.");
  });

  return el("div", { class: "action-bar", "data-nocapture": "" }, [saveBtn, shareBtn, copyBtn]);
}

/* 공유 시트: 이미지 생성 + Web Share / 다운로드 / 텍스트 복사 */
async function openShareSheet({ report, input, profile }) {
  const profileLabel = maskedProfileLabel({
    nickname: input.name,
    birthYear: (profile.solar && profile.solar.Y) || (input.birthDate || "").slice(0, 4),
    timeUnknown: input.timeUnknown,
  });
  const tags = report.dominant.slice(0, 3).map((d) => d.label);
  const summary = report.summaryLead.split(". ")[0] + ".";

  toast("공유 이미지를 만드는 중…", 1200);
  const blob = await renderShareCard({
    kind: "saju", eyebrow: "SAJU REPORT",
    title: (input.name ? input.name + "님의 " : "") + "성향 리포트",
    summary, tags, profileLabel,
  });

  const shared = await shareImage(blob, { title: "사주 성향 리포트", text: sajuSummaryText(report, input) });
  if (!shared) {
    downloadBlob(blob, "saju-report.png");
    toast("이미지를 저장했어요. (공유 미지원 환경)");
  }
}

function sajuSummaryText(report, input) {
  const who = input.name ? `${input.name}님 · ` : "";
  const dom = report.dominant.slice(0, 2).map((d) => `${d.label}(${d.keyword})`).join(", ");
  const first = report.sections[0];
  const firstSummary = first && first.blocks[0] ? textOf(first.blocks[0].body) : "";
  return (
    `[사주 성향 리포트] ${who}주요 기운: ${dom}\n\n` +
    `${report.summaryLead}\n\n` +
    (firstSummary ? `· ${first.title}: ${firstSummary}\n` : "") +
    `\n※ 자기이해를 위한 참고 콘텐츠입니다. 미래를 확정하지 않습니다.`
  );
}

function textOf(body) {
  if (Array.isArray(body)) return body.join(" ");
  if (body && body.ul) return body.ul.join(" ");
  return String(body || "");
}

/* ===== (합침) sajuLoading.js ===== */
let sectionsDef = null;
async function loadSections() {
  if (sectionsDef) return sectionsDef;
  sectionsDef = await fetch(new URL("../../haemyo-data.json", import.meta.url)).then((r) => r.json()).then((d) => d.sections);
  return sectionsDef;
}

const STEPS = [
  "절기와 삭을 계산해 명식을 세우는 중…",
  "오행의 균형과 일간을 읽는 중…",
  "인간관계·연애 패턴을 살피는 중…",
  "현실적인 조언을 다듬는 중…",
];

export async function renderSajuLoading({ navigate, mount }) {
  const input = unstash("saju:input");
  if (!input) { navigate("/saju"); return; }

  const stepText = el("p", { class: "muted", text: STEPS[0], "aria-live": "polite" });
  const view = el("div", { class: "wrap" }, [
    el("div", { class: "loader" }, [
      el("div", { class: "loader-orbit" }, [el("span", { class: "loader-dot" })]),
      el("div", {}, [
        el("h1", { class: "serif", style: "font-size: var(--fs-h2);", text: "리포트를 준비하고 있어요" }),
        stepText,
      ]),
    ]),
  ]);
  mount(view, { noFocus: true });

  const sections = await loadSections();
  const profile = computeSaju(input);
  const report = buildSajuReport(profile, input, sections);
  stash("saju:result", { input, profile, report });

  if (prefersReducedMotion()) {
    navigate("/saju/result");
    return;
  }

  // 짧은 단계 애니메이션 후 이동
  let i = 0;
  const iv = setInterval(() => {
    i++;
    if (i < STEPS.length) stepText.textContent = STEPS[i];
    else { clearInterval(iv); navigate("/saju/result"); }
  }, 460);

  return () => clearInterval(iv);
}
