import { el, clear, toast, copyText, seedFromString } from "../utils/dom.js";
import { icon } from "../utils/icons.js";
import { unstash, saveResult, makeId, getResult } from "../state.js";
import { backLink, noticeBox, insight, renderBlock, loadDisclaimer } from "./_shared.js";
import { renderShareCard, maskedProfileLabel, downloadBlob, shareImage, exportNodeAsImage, exportNodeAsPdf } from "../share/shareImage.js";
import { daeunTimeline, yearFlow, ageFromSolar, todayFortune, benefactorFoe } from "../saju/fortune.js";
import { analyzeStart, analyzeBreakup, reunionOutlook, harmonyBetween, monthlyFlow } from "../saju/relationship.js";
import { computeSaju } from "../saju/manse.js";
import { analyzeStrength, STRENGTH_ELEM_KR } from "../saju/strength.js";
import { buildManse, MANSE_GLOSSARY, SINSAL_MEANING } from "../saju/manseryeok.js";
import { charmSpirits, idealType, spousePortrait, portraitSvg } from "../saju/spouse.js";
import { isAIConfigured, getAIConfig, setAIConfig, clearAIConfig, streamChat } from "../saju/ai.js";
import { isUnlocked, unlock, getCoins, costOf, chartItemId } from "../wallet.js";

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
    backLink(navigate, saved ? "/saved" : "/", saved ? "저장함" : "홈"),
  ]));

  // 헤더 + 프로필 메타
  const head = el("section", { class: "wrap" }, [
    el("div", { class: "panel report-head" }, [
      el("span", { class: "eyebrow", text: "사주 행동 패턴 리포트" }),
      el("h1", { class: "serif", style: "margin-top:6px;", text: (input.name ? input.name + "님의 " : "") + "성향 리포트" }),
      profileMeta(input, profile),
    ]),
  ]);
  root.append(head);

  // 사주 명식(팔자) + 대운
  root.append(el("section", { class: "wrap", style: "margin-top: var(--sp-4);" }, [myeongsikCard(profile, input)]));

  // 신강/신약 · 용신 · 조후
  root.append(el("section", { class: "wrap", style: "margin-top: var(--sp-4);" }, [strengthCard(profile)]));

  // 오늘의 운세
  root.append(el("section", { class: "wrap", style: "margin-top: var(--sp-4);" }, [todayCard(profile)]));

  // 안내: 시간 미상
  if (input.timeUnknown) {
    root.append(el("section", { class: "wrap", style: "margin-top: var(--sp-4);" }, [
      noticeBox("warn", "출생 시간 ‘모름’으로 진행했습니다. 시주(時柱)를 제외한 여섯 글자로 분석하므로, 시간대에 따라 달라지는 부분의 정밀도가 낮아질 수 있습니다.", "clock"),
    ]));
  }

  // 귀인 · 악연
  root.append(el("section", { class: "wrap", style: "margin-top: var(--sp-4);" }, [guiinCard(profile)]));

  // 대운 흐름 타임라인 + 세운 미래 흐름
  root.append(el("section", { class: "wrap", style: "margin-top: var(--sp-4);" }, [flowSection(profile)]));

  // 재회·새 인연 흐름 (독립)
  root.append(el("section", { class: "wrap", style: "margin-top: var(--sp-4);" }, [reunionCard(profile, input)]));

  // 연애·관계 타이밍 분석 (사귄 날 / 헤어진 날) — 5코인
  root.append(el("section", { class: "wrap", style: "margin-top: var(--sp-4);" }, [relationshipTool(profile, input, navigate)]));

  // (매력·이상형·배우자 초상은 ‘나의 인연 알아보기’ 페이지로 이동)
  root.append(el("section", { class: "wrap", style: "margin-top: var(--sp-4);" }, [
    el("button", { class: "btn btn-ghost btn-block", onclick: () => navigate("/inyeon") }, [icon("heart"), el("span", { text: "나의 인연 알아보기 — 이상형·초상화·바람기 지수" })]),
  ]));

  // AI 대화형 상담
  root.append(el("section", { class: "wrap", style: "margin-top: var(--sp-4);" }, [aiChatCard(profile, input)]));

  // 오행 강도 미터 + 요약
  root.append(el("section", { class: "wrap", style: "margin-top: var(--sp-5);" }, [
    el("div", { class: "panel summary-card section-gap" }, [
      el("h2", { text: "핵심 요약" }),
      el("p", { class: "summary-lead", text: report.summaryLead }),
      metersView(report.meters),
      el("p", { class: "tiny muted", text: "※ 수치는 운의 좋고 나쁨이 아니라 ‘성향의 강도’를 나타내는 보조 정보입니다." }),
    ]),
  ]));

  // 심층 성격 분석 (분야별) — 30코인 게이트
  const deepHost = el("div", {});
  root.append(deepHost);
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
          else { toast("코인이 부족해요."); navigate("/store"); }
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
    const jump = el("nav", { class: "jump-nav wrap", "aria-label": "분야별 이동" },
      allSections.map((s) =>
        el("a", { href: "#/saju/result", "data-jump": s.id, text: shortTitle(s.title),
          onclick: (e) => { e.preventDefault(); openAndScroll(s.id); } })
      )
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

  // 진입 시 스크롤스파이
  setupScrollSpy(root);
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
  items.push(["출생 시간", input.timeUnknown ? "모름" : (input.birthTime || "-")]);
  return el("div", { class: "report-meta" },
    items.map(([k, v]) => el("span", {}, [document.createTextNode(k + " "), el("b", { text: v })]))
  );
}
const pad = (n) => String(n).padStart(2, "0");

/** 사주 명식(팔자) + 대운 카드 */
function myeongsikCard(profile, input) {
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
        el("span", { class: "ms-god", text: p.stemGod }),
        el("span", { class: `ms-ch elem-${p.stemElem}`, text: p.stemH }),
        el("span", { class: `ms-ch elem-${p.branchElem}` + (p.isGuiin ? " ms-guiin" : ""), text: p.branchH }),
        el("span", { class: "ms-god", text: p.branchGod }),
        el("span", { class: "ms-kr", text: p.stemKr + p.branchKr + (p.key === "year" ? ` · ${p.zodiac}띠` : "") }),
        p.relations && p.relations.length
          ? el("div", { class: "ms-rels" }, p.relations.map((r) => el("span", { class: "ms-rel rel-" + r.cls, text: r.kind })))
          : null,
        el("div", { class: "ms-extra" }, [
          msRow("지장간", p.jijang.map((j) => j.hanja).join(" ")),
          msRow("십이운성", p.stage),
          msRow("납음", p.napeum),
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
            el("span", { class: "daeun-gz", text: d.hanja }),
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
      relsBlock(M.pairRels),
      spiritSummary(M.summary),
      el("p", { class: "ms-section-label tiny", text: "오행 분포" }),
      elemBar,
      guide,
      daeun,
      el("p", { class: "tiny muted", style: "margin-top:12px;", text: "절기(태양 황경)와 삭을 천문 계산해 세운 실제 명식입니다. 진태양시·시간대는 대표 경도로 보정했습니다." }),
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

function msRow(label, val) {
  return el("div", { class: "ms-row" }, [el("span", { class: "ms-row-l", text: label }), el("span", { class: "ms-row-v", text: val })]);
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
      if (!u.ok) { err.textContent = `관계 흐름 분석은 코인 ${relCost}개가 필요해요. (보유 ${getCoins()}개)`; toast("코인이 부족해요."); if (navigate) navigate("/store"); return; }
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

/* ---- 신강/신약 · 용신 · 조후 ---- */
function strengthCard(profile) {
  const s = analyzeStrength(profile);
  const badgeClass = { 신강: "st-strong", 신약: "st-weak", 중화: "st-balance" }[s.strength];
  const details = el("details", { class: "panel report-card", open: true });
  details.append(
    el("summary", {}, [
      el("span", { class: "rc-index" }, [icon("compass")]),
      el("span", { class: "rc-title" }, [document.createTextNode("신강·신약 · 용신 · 조후"), el("span", { class: "rc-sub", text: "억부·조후로 본 나의 균형과 도움 오행" })]),
      el("span", { class: "rc-chevron" }, [icon("chevronDown")]),
    ]),
    el("div", { class: "rc-body section-gap" }, [
      el("div", { style: "display:flex; align-items:center; gap:12px; flex-wrap:wrap;" }, [
        el("span", { class: "st-badge " + badgeClass, text: s.strength }),
        el("span", { class: "tiny muted", text: `일간 ${profile.dayMaster}(${s.dayElemKr}) · 부조 ${s.support} vs 설극 ${s.drain}${s.deukryeong ? " · 득령" : ""}` }),
      ]),
      el("p", { class: "summary-lead", style: "font-size:1rem;", text: s.summary }),
      el("div", { class: "block tag-good" }, [
        el("span", { class: "block-label" }, [el("span", { class: "ic" }, [icon("check")]), el("span", { text: "용신 — 나에게 힘이 되는 기운" })]),
        el("p", { text: s.yongsinDesc }),
        el("div", { class: "chip-grid", style: "margin-top:6px;" }, [
          ...s.yongsinKr.map((k) => el("span", { class: "chip", style: "min-height:auto; padding:5px 12px;", text: k })),
          ...(s.johu.element ? [el("span", { class: "chip", style: "min-height:auto; padding:5px 12px;", text: "조후: " + STRENGTH_ELEM_KR[s.johu.element] })] : []),
        ]),
      ]),
      el("div", { class: "block tag-action" }, [
        el("span", { class: "block-label" }, [el("span", { class: "ic" }, [icon("lightbulb")]), el("span", { text: "이렇게 활용하세요" })]),
        el("ul", {}, s.apply.map((t) => el("li", { text: t }))),
      ]),
      el("p", { class: "tiny muted", text: `※ 용신 기운을 가진 사람(예: ${s.yongsinAnimals.slice(0, 4).join("·")})이나 그 오행이 강한 시기가 당신에게 힘이 됩니다. (격국·통관까지 보는 정밀 판정이 아닌 억부·조후 간이 판정 참고입니다.)` }),
    ])
  );
  return details;
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
        if (coins < pCost) { toast("코인이 부족해요."); navigate("/store"); return; }
        const r = unlock(portraitId, pCost);
        if (r.ok) { toast(r.reason === "already" ? "이미 열어 둔 초상이에요." : `배우자 초상을 그렸어요 · 코인 ${pCost} 차감`); paintPortrait(); }
        else { toast("코인이 부족해요."); navigate("/store"); }
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

/* ---- 운의 흐름: 대운 타임라인 + 세운 ---- */
function flowSection(profile) {
  const today = new Date();
  const curYear = today.getFullYear();
  const age = profile.solar ? ageFromSolar(profile.solar, today) : null;
  const daeun = daeunTimeline(profile, age);
  const years = yearFlow(profile, curYear, 6, curYear);
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
      el("div", { class: "daeun-timeline", role: "list" }, daeun.map((d) =>
        el("div", { class: "dt-item" + (d.isCurrent ? " is-current" : ""), role: "listitem" }, [
          el("span", { class: "dt-age", text: `${d.ageStart}–${d.ageEnd}세` }),
          el("span", { class: "dt-gz" + (d.guiin ? " gz-guiin" : ""), text: d.hanja }),
          el("span", { class: "dt-god", text: `${d.tenGod}·${d.branchGod}` }),
          el("span", { class: "dt-sub tiny muted", text: `${d.stage}${d.sinsal && d.sinsal.length ? " · " + d.sinsal.join("·") : ""}${d.guiin ? " · 귀인" : ""}` }),
          el("span", { class: "dt-label", text: d.label.replace("의 시기", "") }),
          d.isCurrent ? el("span", { class: "dt-now", text: "현재" }) : null,
        ].filter(Boolean))
      )),
      cur
        ? el("div", { class: "insight", style: "margin-top:14px;" }, [
            document.createTextNode(`지금은 ‘${cur.label}’. ${cur.line} `),
            el("b", { class: "gold", text: cur.do }),
          ])
        : el("p", { class: "muted tiny", style: "margin-top:10px;", text: age != null && daeun.length && age < daeun[0].ageStart ? `첫 대운은 ${daeun[0].ageStart}세부터 시작됩니다.` : "" }),

      el("hr", { class: "divider" }),
      el("h4", { class: "flow-h", text: `앞으로의 해 — 세운 (${curYear}년부터)` }),
      el("div", { class: "year-flow" }, years.map((y) =>
        el("div", { class: "yf-item" + (y.isCurrent ? " is-current" : "") }, [
          el("div", { class: "yf-top" }, [
            el("span", { class: "yf-year", text: `${y.year}` }),
            el("span", { class: "yf-gz" + (y.guiin ? " gz-guiin" : ""), text: y.hanja }),
            el("span", { class: "yf-god", text: `${y.tenGod}·${y.branchGod}` }),
            y.isCurrent ? el("span", { class: "dt-now", text: "올해" }) : null,
          ].filter(Boolean)),
          el("p", { class: "yf-sub tiny muted", text: `십이운성 ${y.stage}${y.sinsal && y.sinsal.length ? " · 신살 " + y.sinsal.join("·") : ""}${y.guiin ? " · 천을귀인 ✓" : ""}` }),
          el("p", { class: "yf-label", text: y.label }),
          el("p", { class: "yf-line", text: y.line }),
        ])
      )),
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

