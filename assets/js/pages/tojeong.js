import { el, clear, toast } from "../utils/dom.js";
import { backLink, pageHeader, noticeBox, loadDisclaimer } from "./shared.js";
import { getMyBirth, getOwnBirth, getPeople } from "../state.js";
import { personSwitch } from "./people.js";
import { computeSaju } from "../saju/manse.js";
import { tojeongYear, tojeongLife, lifespanReading, tojeongMonths, tojeongDays, tojeongTopics, tojeongTheme, TRI_INFO, upOf, TRI_DEEP, TRI_PAIRMATE } from "../saju/tojeong.js";
import { isUnlocked, unlock, getCoins, costOf, isUnlimited, isAdmin, canSeeLifespan, noCoinToast } from "../wallet.js";

export function renderTojeong({ navigate }) {
  loadDisclaimer();
  const my = getMyBirth();
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(pageHeader("토정비결", "한 해 운세 · 인생 흐름", "음력 생월·생일과 그해 태세로 괘를 세워 한 해 흐름을 봅니다. 연도를 바꿔 지난해·내년도 볼 수 있고, 초년·중년·장년·노년과 10년 단위 흐름도 볼 수 있어요."));
  root.append(personSwitch(navigate, { title: "누구의 토정비결을 볼까?" }));

  if (!my) {
    root.append(el("section", { class: "wrap section-gap" }, [
      noticeBox("info", "토정비결을 보려면 먼저 생년월일이 필요해요. 한 번 입력하면 저장됩니다."),
      el("button", { class: "btn btn-primary", onclick: () => navigate("/saju") }, [el("span", { text: "내 정보 입력하고 시작" })]),
    ]));
    return root;
  }

  const profile = computeSaju(my);
  const nowY = new Date().getFullYear();
  const birthY = profile.solar ? profile.solar.Y : nowY - 30;
  let year = nowY;
  const cost = costOf("tojeong");
  const lifeCost = costOf("tojeonglife");

  // 연도 고르기
  const yInput = el("input", { class: "input tj-yinput", type: "number", min: String(birthY), max: String(birthY + 100), value: String(year), inputmode: "numeric", "aria-label": "볼 연도" });
  const ageTag = el("span", { class: "tj-age tiny muted" });
  const setYear = (y) => {
    y = Math.max(birthY, Math.min(birthY + 100, Number(y) || nowY));
    year = y; yInput.value = String(y);
    ageTag.textContent = `${y - birthY + 1}세(세는나이)`;
    chips.forEach((c) => c.classList.toggle("on", Number(c.dataset.y) === y));
    paintYear();
  };
  yInput.addEventListener("change", () => setYear(yInput.value));
  yInput.addEventListener("keydown", (e) => { if (e.key === "Enter") setYear(yInput.value); });
  const chips = [[nowY - 1, "작년"], [nowY, "올해"], [nowY + 1, "내년"], [nowY + 2, "내후년"]].map(([y, t]) =>
    el("button", { type: "button", class: "tj-chip", "data-y": String(y), onclick: () => setYear(y) }, [el("span", { text: `${t} ${y}` })]));
  root.append(el("section", { class: "wrap" }, [
    el("div", { class: "panel tj-picker" }, [
      el("p", { style: "font-weight:700;", text: "몇 년도 운세를 볼까?" }),
      el("div", { class: "tj-yrow" }, [
        el("button", { type: "button", class: "tj-step", "aria-label": "이전 해", onclick: () => setYear(year - 1) }, [el("span", { text: "‹" })]),
        yInput, el("span", { class: "tj-yu", text: "년" }),
        el("button", { type: "button", class: "tj-step", "aria-label": "다음 해", onclick: () => setYear(year + 1) }, [el("span", { text: "›" })]),
        ageTag,
      ]),
      el("div", { class: "tj-chips" }, chips),
    ]),
  ]));

  const host = el("section", { class: "wrap", style: "margin-top: var(--sp-2);" });
  const lifeHost = el("section", { class: "wrap", style: "margin-top: var(--sp-6);" });
  root.append(host, lifeHost);

  function paintYear() {
    clear(host);
    const itemId = `tojeong:${my.birthDate}:${year}`;
    if (!isUnlocked(itemId)) {
      host.append(lockCard({ title: `${year}년 토정비결 열어 보기`, desc: "그해의 괘와 전체 흐름, 흐름 좋은 달, 조언을 풀어 드려요. 한 번 연 해는 다시 볼 때 무료예요.", cost, onOpen: () => unlock(itemId, cost), after: paintYear }));
      return;
    }
    const r = tojeongYear(profile, year);
    try { r.goodMonths = tojeongMonths(profile, year).months.slice().sort((a, b) => b.sc - a.sc).slice(0, 3).map((x) => x.m).sort((a, b) => a - b); } catch { /* ignore */ }
    host.append(view(r), topicsView(profile, year, my.gender), el("button", { type: "button", class: "deep-cta", onclick: () => navigate("/tojeong-plus") }, [
      el("span", { class: "deep-cta-ic", text: "📅" }),
      el("span", { class: "deep-cta-txt" }, [el("b", { text: `${year}년 토정비결 월별 · 일별` }), el("span", { class: "tiny muted", text: "12달 흐름 + 날짜마다 그날 운세 (프리미엄)" })]),
      el("span", { class: "deep-cta-go" }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: String(costOf("tojeongplus")) })]),
    ]));
  }

  function paintLife() {
    clear(lifeHost);
    const lifeId = `tojeonglife:${my.birthDate}`;
    lifeHost.append(el("h2", { class: "serif", style: "font-size:1.3rem;", text: "인생 흐름 · 초년 중년 장년 노년" }),
      el("p", { class: "muted tiny", style: "margin:4px 0 12px;", text: "나이마다 세운 토정 괘와 10년마다 바뀌는 대운(나에게 맞는 기운인지)을 함께 모아 본 흐름이에요." }));
    if (!isUnlocked(lifeId)) {
      lifeHost.append(lockCard({ title: "내 인생 흐름 열어 보기", desc: "초년·중년·장년·노년 4단계와 10년 단위 흐름(좋은 해·조심할 해·대운)까지 한 번에 보여 드려요.", cost: lifeCost, onOpen: () => unlock(lifeId, lifeCost), after: paintLife }));
      return;
    }
    lifeHost.append(lifeView(tojeongLife(profile), (y) => { setYear(y); window.scrollTo({ top: 0, behavior: "smooth" }); }));
  }

  function lockCard({ title, desc, cost: c, onOpen, after }) {
    const coins = getCoins();
    const box = el("div", { class: "panel premium-lock", style: "margin-top: var(--sp-4);" }, [
      el("span", { class: "lock-badge" }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: `코인 ${c}개` })]),
      el("h3", { class: "serif", style: "margin-top:10px;", text: title }),
      el("p", { class: "muted", style: "font-size:var(--fs-sm);", text: desc }),
    ]);
    if (coins >= c || isUnlimited()) {
      box.append(el("button", { class: "btn btn-primary btn-block", style: "margin-top: var(--sp-4);", onclick: () => {
        const res = onOpen();
        if (res.ok) { toast("열었어요"); after(); } else { noCoinToast(); navigate("/store"); }
      } }, [el("span", { text: isUnlimited() ? "무제한으로 열기" : `코인 ${c}개로 열기 · 보유 ${coins}개` })]));
    } else {
      box.append(el("p", { class: "muted tiny", style: "margin-top:8px;", text: `보유 코인 ${coins}개 · ${c}개 필요해요.` }));
      box.append(el("button", { class: "btn btn-primary btn-block", style: "margin-top: var(--sp-3);", onclick: () => navigate("/store") }, [el("span", { text: "코인 받으러 가기" })]));
    }
    return box;
  }
  setYear(nowY);
  root.insertBefore(el("section", { class: "wrap", style: "margin-top: var(--sp-3);" }, [el("p", { class: "tjc-l", style: "margin-bottom:8px;", text: "토정비결 테마로 보기" }), el("div", { class: "tjt-grid" }, Object.entries(TJT).map(([k, t]) => el("button", { type: "button", class: "tjt-b", onclick: () => navigate(`/tojeong-theme/${k}`) }, [el("span", { class: "tjt-em", text: t.em }), el("b", { text: t.title.replace("토정비결로 보는 ", "") }), el("small", { text: `코인 ${costOf(t.key)}` })])))]), lifeHost);
  root.insertBefore(el("section", { class: "wrap", style: "margin-top: var(--sp-3);" }, [el("button", { type: "button", class: "deep-cta", onclick: () => navigate("/tojeong-compat") }, [
    el("span", { class: "deep-cta-ic", text: "💞" }),
    el("span", { class: "deep-cta-txt" }, [el("b", { text: "토정비결 궁합" }), el("span", { class: "tiny muted", text: "한 해 궁합 · 결혼 궁합 — 두 사람의 토정 괘를 겹쳐 보기" })]),
    el("span", { class: "deep-cta-go" }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: String(costOf("tojeongcompat")) })]),
  ])]), lifeHost);
  paintLife();
  root.append(el("section", { class: "wrap", style: "margin-top: var(--sp-5);" }, [lifespanCard(profile, my)]));
  root.append(el("section", { class: "wrap", style: "margin-top: var(--sp-4);" }, [noticeBox("info", "참고용 콘텐츠예요. 미래를 확정하지 않으며, 중요한 결정은 실제 정보와 함께 검토하세요.")]));
  return root;
}

/* 수명 운 단독 화면 (#/lifespan) */
export function renderLifespan({ navigate }) {
  const my = getMyBirth();
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(pageHeader("수명 운", "사주·토정비결·자미두수로 보는 수명의 고비", "세 가지 옛 방식으로 본 참고 풀이라 실제와 맞지 않을 수도 있어요. 특별 코드를 입력하면 열려요."));
  if (!my) {
    root.append(el("section", { class: "wrap section-gap" }, [
      noticeBox("info", "먼저 생년월일이 필요해요."),
      el("button", { class: "btn btn-primary", onclick: () => navigate("/saju") }, [el("span", { text: "내 정보 입력하기" })]),
    ]));
    return root;
  }
  if (canSeeLifespan()) root.append(personSwitch(navigate, { title: "누구의 수명 운을 볼까?" }));
  const card = lifespanCard(computeSaju(my), my);
  if (card.tagName === "DETAILS") card.open = true;
  root.append(el("section", { class: "wrap" }, [card]));
  return root;
}

/* 수명 운 — 관리자만 열람 (사주 리포트에서도 같이 씀) */
export function lifespanCard(profile, input) {
  if (!canSeeLifespan()) {
    return el("div", { class: "panel ls-lock" }, [
      el("p", { class: "serif", style: "font-size:1.05rem; font-weight:700;", text: "🔒 수명 운" }),
      el("p", { class: "muted tiny", style: "margin-top:4px;", text: "특별 코드를 입력한 사람만 열어 볼 수 있어요. (충전소 › 쿠폰 · 코드)" }),
    ]);
  }
  let R;
  try { R = lifespanReading(profile, input); } catch { return el("div"); }
  const line = (k, v) => el("div", { class: "ls-row" }, [el("span", { class: "ls-k", text: k }), el("span", { class: "ls-v", text: v })]);
  return el("details", { class: "panel ls-card" }, [
    el("summary", {}, [el("span", { class: "serif", style: "font-size:1.1rem; font-weight:800;", text: "🕯️ 수명 운" }), el("span", { class: "tiny muted", text: "눌러서 열기" })]),
    el("div", { class: "section-gap", style: "margin-top:10px;" }, [
      el("div", { class: "ls-warn", text: "⚠️ 사주·토정비결·자미두수라는 옛 방식으로 본 풀이일 뿐이라, 실제와 전혀 맞지 않을 수도 있어요. 세 방식끼리도 서로 다르게 나오는 게 자연스러워요." }),
      el("p", { class: "ls-head", text: `사주상으로는 ${R.end.from}~${R.end.to}세 무렵(${R.end.years}년)이 명(命)이 다하기 쉬운 고비로 보여요.` }),
      line("그 시기 대운", `${R.end.hanja}(${R.end.kr}) 대운${R.end.why.length ? " · " + R.end.why.join(" · ") : ""}`),
      line("토정비결상", R.tojeong ? `${R.tojeong.age}세 무렵(${R.tojeong.year}년)이 노년에 가장 약한 해예요.` : "-"),
      line("원인으로 볼 만한 것", `사주에서 가장 약한 ${R.cause.kr} 기운 — ${R.cause.part} 쪽${R.cause.accident ? ", 그리고 충·흉살이 겹쳐 사고·수술성 일도 함께 조심" : ""}`),
      R.ziwei ? line("자미두수상", `${R.ziwei.worst.from}~${R.ziwei.worst.to}세(${R.birthY + R.ziwei.worst.from - 1}~${R.birthY + R.ziwei.worst.to - 1}년) 대한(${R.ziwei.worst.palace} ${R.ziwei.worst.branch})이 노년에 가장 약한 10년${R.ziwei.worst.tags.length ? " · " + R.ziwei.worst.tags.join(" · ") : ""}`) : null,
      R.ziwei ? line("자미두수 질액궁", `${R.ziwei.jilStars.length ? R.ziwei.jilStars.join("·") + " → " : ""}${R.ziwei.jilPart} 쪽을 살피라는 자리`) : null,
      R.crisis ? line("그 전의 큰 고비", `${R.crisis.from}~${R.crisis.to}세(${R.crisis.years}년) ${R.crisis.hanja}(${R.crisis.kr}) 대운 — 넘기면 오히려 단단해지는 시기`) : null,
      line("타고난 수명 기운", `사주: ${R.longevity}` + (R.ziwei ? ` · 자미두수: ${R.ziwei.longevity} (명궁 ${R.ziwei.mingStars.join("·") || "공궁"})` : "")),
      R.ziwei && R.ziwei.timeUnknown ? el("p", { class: "tiny muted", text: "태어난 시간을 몰라 자미두수는 오시(午時, 낮 12시)로 가정했어요. 시간이 다르면 결과가 크게 달라져요." }) : null,
      el("div", { class: "insight", text: `${R.cause.tip} 사주상으로는 그렇다는 것일 뿐, 수명은 생활 습관·건강 관리·운의 흐름에 따라 얼마든지 달라질 수 있어요.` }),
      el("p", { class: "tiny muted", text: "전통 명리(대운·12운성·충), 토정비결, 자미두수(대한·질액궁·사화) 방식을 따른 참고용 풀이로, 맞지 않을 수도 있어요. 의학적 판단이 아니며, 실제 건강은 꼭 검진과 전문가 상담으로 확인하세요." }),
    ].filter(Boolean)),
  ]);
}

const BAND_CLS = { 순풍: "b-top", 상승: "b-up", 굴곡: "b-mid", 인내: "b-low" };
function lifeView(L, pickYear) {
  const stageCards = el("div", { class: "tj-stages" }, L.stages.map((st) =>
    el("div", { class: `tj-stage ${BAND_CLS[st.band]}` + (st.isNow ? " is-now" : "") }, [
      el("div", { class: "tj-st-top" }, [
        el("b", { class: "serif", text: st.name }),
        st.isNow ? el("span", { class: "dt-now", text: "지금" }) : null,
        el("span", { class: "tj-band", text: st.band }),
      ].filter(Boolean)),
      el("p", { class: "tiny muted", text: `${st.from}~${st.to}세 · ${st.years}` }),
      el("div", { class: "tj-bar" }, [el("i", { style: `width:${st.score}%` })]),
      el("p", { class: "tiny", style: "font-weight:700;", text: `${st.score}점 · ${st.theme}` }),
      el("p", { class: "tiny", text: st.line + " " + st.tip }),
      el("p", { class: "tiny muted", text: `주된 괘 ${st.pal.name} ${st.pal.sym} — ${st.pal.summary}` }),
    ])));
  const maxS = Math.max(...L.decades.map((d) => d.score)), minS = Math.min(...L.decades.map((d) => d.score));
  const chart = el("div", { class: "tj-chart", "aria-hidden": "true" }, L.decades.map((d) =>
    el("div", { class: "tj-col" + (d.isNow ? " is-now" : "") }, [
      el("span", { class: "tj-cv tiny", text: String(d.score) }),
      el("div", { class: `tj-cb ${BAND_CLS[d.band]}`, style: `height:${20 + Math.round(((d.score - minS) / Math.max(1, maxS - minS)) * 80)}%` }),
      el("span", { class: "tj-cl tiny muted", text: `${d.from}` }),
    ])));
  const rows = el("div", { class: "tj-decades" }, L.decades.map((d) =>
    el("div", { class: `tj-dec ${BAND_CLS[d.band]}` + (d.isNow ? " is-now" : "") }, [
      el("div", { class: "tj-dec-h" }, [
        el("b", { text: `${d.from}–${d.to}세` }),
        el("span", { class: "tiny muted", text: d.years }),
        d.isNow ? el("span", { class: "dt-now", text: "지금" }) : null,
        el("span", { class: "tj-band", text: `${d.band} ${d.score}` }),
        d.trend ? el("span", { class: "tiny " + (d.trend > 0 ? "tj-upc" : "tj-dnc"), text: d.trend > 0 ? `▲${d.trend}` : `▼${-d.trend}` }) : null,
      ].filter(Boolean)),
      el("p", { class: "tiny", text: d.line + " " + d.luckNote }),
      el("p", { class: "tiny muted", text: `대운 ${d.daeun.length ? d.daeun.join("→") : "시작 전"} · 주된 괘 ${d.pal.name} ${d.pal.sym}` }),
      el("div", { class: "tj-yrs" }, [
        el("button", { type: "button", class: "tj-ybtn good", onclick: () => pickYear(d.best.year) }, [el("span", { text: `좋은 해 ${d.best.year}` })]),
        el("button", { type: "button", class: "tj-ybtn warn", onclick: () => pickYear(d.worst.year) }, [el("span", { text: `조심할 해 ${d.worst.year}` })]),
      ]),
    ])));
  return el("div", { class: "section-gap" }, [
    stageCards,
    el("h3", { class: "serif", style: "margin-top: var(--sp-5); font-size:1.1rem;", text: "10년 단위 흐름" }),
    el("p", { class: "muted tiny", text: "막대가 높을수록 순탄한 10년이에요. ‘좋은 해/조심할 해’를 누르면 그해 토정비결로 이동해요." }),
    chart, rows,
  ]);
}

function view(r) {
  const ring = el("div", { class: "score-ring", style: `--deg:${Math.round(r.score * 3.6)}deg;` }, [
    el("div", { class: "score-ring-in" }, [el("span", { class: "score-n", text: String(r.score) }), el("span", { class: "score-u", text: "점" })]),
  ]);
  return el("div", { class: "section-gap", style: "margin-top: var(--sp-4);" }, [
    el("div", { class: "panel", style: "text-align:center;" }, [
      el("p", { class: "eyebrow", style: "justify-content:center;", text: `${r.year}년 · ${r.code}괘` }),
      el("p", { class: "serif", style: "font-size:1.5rem; margin-top:8px;", text: `${r.palName} · ${r.palSym}` }),
      el("p", { class: "muted", style: "font-style:italic; margin-top:6px;", text: `“${r.verse}”` }),
      el("div", { style: "margin-top: var(--sp-4); display:flex; justify-content:center;" }, [ring]),
    ]),
    el("div", { class: "panel" }, [el("p", { style: "font-weight:600;", text: r.summary })]),
    gwaeCalc(r),
    block("이 해 잘 풀리는 것", r.pros, "good"),
    block("이 해 조심할 것", r.cons, "warn"),
    el("div", { class: "panel", style: "text-align:center;" }, [
      el("p", { class: "muted tiny", text: "흐름이 좋은 달 (음력)" }),
      el("p", { class: "serif", style: "font-size:1.2rem; margin-top:4px;", text: r.goodMonths.map((m) => m + "월").join(" · ") }),
    ]),
    el("div", { class: "insight", text: r.advice }),
    el("div", { class: "lucky-row" }, [
      el("span", { class: "lucky-chip" }, [el("b", { text: "행운색 " }), el("span", { text: r.luckyColor })]),
      el("span", { class: "lucky-chip" }, [el("b", { text: "행운 기운 " }), el("span", { text: r.luckyElem })]),
    ]),
  ]);
}
/* 분야별 토정비결 — 사주처럼 재물·애정·직업·학업·건강·가정·대인 */
function topicsView(profile, year, gender) {
  let list = [];
  try { list = tojeongTopics(profile, year, gender); } catch { return null; }
  const best = list.slice().sort((a, b) => b.sc - a.sc)[0], low = list.slice().sort((a, b) => a.sc - b.sc)[0];
  let Yr = null; try { Yr = tojeongYear(profile, year); } catch { /* ignore */ }
  if (Yr) { const lv = Yr.score >= 70 ? "good" : Yr.score >= 55 ? "mid" : "low"; list = [{ id: "all", name: "총운", em: "🌟", sc: Yr.score, level: lv, label: lv === "good" ? "좋음" : lv === "mid" ? "보통" : "조심", text: Yr.summary, best: (Yr.goodMonths || []).slice(0, 2) }, ...list]; }
  return el("section", { class: "panel tj-topics", style: "margin-top: var(--sp-4);" }, [
    el("p", { class: "eyebrow", text: `${year}년 분야별 토정비결` }),
    el("h3", { class: "serif tj-topics-h", text: `가장 빛나는 분야: ${best.em} ${best.name}` }),
    el("p", { class: "muted tiny", text: `그해 괘의 성질과 열두 달(음력) 월건의 기운을 분야별로 나눠 봤어요. 조심할 분야는 ${low.name}이에요.` }),
    el("div", { class: "tj-tgrid" }, list.map((t) => el("article", { class: `tj-t lv-${t.level}` }, [
      el("div", { class: "tj-t-h" }, [el("span", { class: "tj-t-em", text: t.em }), el("b", { text: t.name })]),
      el("span", { class: "tj-t-lb", text: `${t.label} · ${t.sc}점` }),
      el("span", { class: "tj-t-bar" }, [el("i", { style: `width:${t.sc}%` })]),
      el("p", { class: "tj-t-txt", text: t.text }),
      el("p", { class: "tj-t-m", text: `힘이 실리는 달: ${t.best.map((m) => `${m}월`).join(" · ")} (음력)` }),
    ]))),
  ]);
}
function block(label, items, tag) {
  return el("div", { class: `block tag-${tag}` }, [el("span", { class: "block-label" }, [el("span", { text: label })]), ...items.map((t) => el("p", { text: t }))]);
}

/* 작괘 과정 — 어떻게 이 괘가 나왔는지 그대로 보여 주기 */
function gwaeCalc(r) {
  if (!r.calc) return el("div");
  const c = r.calc, sol = c.iljin.solar;
  return el("details", { class: "panel tj-calc" }, [
    el("summary", {}, [el("b", { text: `작괘 과정 보기 · ${r.code}괘` }), el("span", { class: "tiny muted", text: " 전통 작괘법 그대로" })]),
    el("ul", {}, [
      el("li", { text: `태세: ${r.year}년 ${c.taese.gz} → 태세수 ${c.taese.n}` }),
      el("li", { text: `월건: 그해 음력 생월 ${c.wolgeon.gz} → 월건수 ${c.wolgeon.n} · 그달은 ${c.wolgeon.days === 30 ? "큰달(30일)" : "작은달(29일)"}` }),
      el("li", { text: `일진: 그해 음력 생일${c.iljin.day !== undefined ? ` ${c.iljin.day}일` : ""}${sol ? ` (양력 ${sol.Y}.${sol.M}.${sol.D})` : ""} ${c.iljin.gz} → 일진수 ${c.iljin.n}` }),
      ...c.lines.map((t) => el("li", { text: t })),
    ]),
    r.leapNote ? el("p", { class: "tiny muted", text: r.leapNote }) : null,
    el("p", { class: "tiny muted", text: "나이는 세는나이, 나머지가 0이면 상괘 8·중괘 6·하괘 3으로 봐요. 태세수·월건수·일진수는 천간수(甲己9·乙庚8·丙辛7·丁壬6·戊癸5)에 쓰임별 지지수를 더한 조견표 값이에요." }),
  ].filter(Boolean));
}

/* ======================= 토정비결 월별 · 일별 (프리미엄) ======================= */
export function renderTojeongPlus({ navigate }) {
  loadDisclaimer();
  const my = getMyBirth();
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/tojeong", "토정비결")]));
  root.append(pageHeader("토정비결 월별 · 일별", "한 해 괘로 보는 12달과 매일", "전통 작괘법으로 세운 그해의 괘를 바탕으로, 음력 열두 달의 흐름과 날짜마다의 운을 풀어 드려요."));
  root.append(personSwitch(navigate, { title: "누구의 토정비결을 볼까?" }));
  const host = el("section", { class: "wrap section-gap" });
  root.append(host);
  if (!my) { host.append(noticeBox("info", "생년월일이 필요해요."), el("button", { class: "btn btn-primary", onclick: () => navigate("/saju") }, [el("span", { text: "내 정보 입력하고 시작" })])); return root; }
  const profile = computeSaju(my);
  const nowY = new Date().getFullYear();
  let year = window.__tjpYear || nowY;
  const todayL = (() => { const d = new Date(); try { return computeSaju({ calendarType: "solar", birthDate: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, birthTime: "12:00", timeUnknown: true, gender: "male", timezone: "Asia/Seoul" }).lunar; } catch { return null; } })();
  let month = window.__tjpMonth || (todayL && todayL.year === year ? todayL.month : 1);
  const cost = costOf("tojeongplus");
  function lockCard({ title, desc, cost: c, onOpen, after }) {
    const coins = getCoins();
    return el("div", { class: "panel premium-lock" }, [
      el("span", { class: "lock-badge" }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: `코인 ${c}개` })]),
      el("h3", { class: "serif", style: "margin-top:10px;", text: title }),
      el("p", { class: "muted", style: "font-size:var(--fs-sm);", text: desc }),
      coins >= c || isUnlimited()
        ? el("button", { class: "btn btn-primary btn-block", style: "margin-top: var(--sp-4);", onclick: () => { const res = onOpen(); if (res.ok) { toast("열었어요"); after(); } else { noCoinToast(c); navigate("/store"); } } }, [el("span", { text: isUnlimited() ? "무제한으로 열기" : `코인 ${c}개로 열기 · 보유 ${coins}개` })])
        : el("button", { class: "btn btn-primary btn-block", style: "margin-top: var(--sp-4);", onclick: () => navigate("/store") }, [el("span", { text: `코인 받으러 가기 (보유 ${coins}개 · ${c}개 필요)` })]),
    ]);
  }
  function paint() {
    clear(host);
    host.append(el("div", { class: "rd-seg", style: "grid-template-columns: repeat(3, 1fr); margin-bottom: var(--sp-3);" }, [nowY - 1, nowY, nowY + 1].map((y) =>
      el("button", { type: "button", class: "rd-seg-btn" + (y === year ? " on" : ""), onclick: () => { year = y; window.__tjpYear = y; month = todayL && todayL.year === y ? todayL.month : 1; paint(); } }, [el("span", { text: `${y}년` })]))));
    const id = `tojeongplus:${my.birthDate}:${year}`;
    if (!isUnlocked(id)) {
      host.append(lockCard({ title: `${year}년 토정비결 월별 · 일별 열기`, desc: "그해 괘(작괘 과정 공개) · 음력 12달 흐름과 점수 · 달마다 날짜별 운세 달력. 한 번 연 해는 계속 무료예요.", cost, onOpen: () => unlock(id, cost), after: paint }));
      return;
    }
    const M = tojeongMonths(profile, year), Y = M.year;
    host.append(
      el("div", { class: "panel panel-gold", style: "text-align:center;" }, [
        el("p", { class: "eyebrow", style: "justify-content:center;", text: `${year}년 · ${Y.code}괘 · ${Y.palName}` }),
        el("p", { class: "muted", style: "font-style:italic; margin-top:4px;", text: `“${Y.verse}”` }),
        el("p", { class: "tiny muted", style: "margin-top:6px;", text: Y.summary }),
      ]),
      gwaeCalc(Y),
      el("p", { class: "fg-group", text: "음력 열두 달 흐름" }),
      el("div", { class: "tjm-grid" }, M.months.map((x) => el("button", { type: "button", class: "tjm" + (x.m === month ? " on" : "") + " b-" + x.badge, onclick: () => { month = x.m; window.__tjpMonth = x.m; paint(); host.querySelector(".tjd-head") && host.querySelector(".tjd-head").scrollIntoView({ behavior: "smooth", block: "start" }); } }, [
        el("span", { class: "tjm-m", text: `${x.m}월` }), el("b", { class: "tjm-sc", text: String(x.sc) }), el("span", { class: "tjm-badge", text: x.badge }),
      ]))),
    );
    const mo = M.months[month - 1];
    const D = tojeongDays(profile, year, month);
    const s1 = mo.solarStart;
    host.append(el("div", { class: "panel tjd-head" }, [
      el("div", { class: "tjd-top" }, [el("div", {}, [el("p", { class: "serif", style: "font-size:1.3rem;", text: `음력 ${month}월 · ${mo.gz}` }), el("p", { class: "tiny muted", text: `${s1 ? `양력 ${s1.M}/${s1.D}부터 ` : ""}${mo.len}일 · ${mo.area} · ${mo.tone}` })]), el("span", { class: "tjm-big b-" + mo.badge, text: `${mo.sc}` })]),
      el("p", { style: "margin-top:8px;", text: mo.text }),
    ]));
    const first = D.days[0] ? new Date(D.days[0].sol.Y, D.days[0].sol.M - 1, D.days[0].sol.D).getDay() : 0;
    const detail = el("div", { class: "panel tjd-detail" });
    const tdy = new Date();
    const isToday = (x) => x.sol.Y === tdy.getFullYear() && x.sol.M === tdy.getMonth() + 1 && x.sol.D === tdy.getDate();
    const showDay = (x) => { clear(detail); detail.append(
      el("div", { class: "tjd-top" }, [el("div", {}, [el("b", { text: `음력 ${month}월 ${x.d}일 · 양력 ${x.sol.M}월 ${x.sol.D}일` }), el("p", { class: "tiny muted", text: `일진 ${x.gz} · ${x.god}` })]), el("span", { class: "tjm-big " + (x.sc >= 70 ? "b-길" : x.sc >= 55 ? "b-평" : "b-주의"), text: String(x.sc) })]),
      el("p", { style: "margin-top:6px;", text: x.text }),
    ); };
    host.append(el("div", { class: "tjd-cal" }, [
      ...["일", "월", "화", "수", "목", "금", "토"].map((w, i) => el("span", { class: "tjd-wd" + (i === 0 ? " sun" : i === 6 ? " sat" : ""), text: w })),
      ...Array.from({ length: first }, () => el("span", {})),
      ...D.days.map((x) => el("button", { type: "button", class: "tjd-day" + (isToday(x) ? " today" : "") + (x.sc >= 70 ? " good" : x.sc < 55 ? " low" : ""), onclick: (e) => { host.querySelectorAll(".tjd-day.on").forEach((b) => b.classList.remove("on")); e.currentTarget.classList.add("on"); showDay(x); } }, [
        el("span", { class: "tjd-l", text: String(x.d) }), el("span", { class: "tjd-s", text: `${x.sol.M}/${x.sol.D}` }), el("b", { class: "tjd-sc", text: String(x.sc) }),
      ])),
    ]), detail, noticeBox("info", "괘는 전통 작괘법(태세수·월건수·일진수)으로 정확히 세웠어요. 달·날의 풀이는 토정비결 원문이 아니라, 그 괘와 그 달 월건·그날 일진, 내 사주(일간·용신)를 함께 본 해묘의 해석이에요."));
    const pick = D.days.find(isToday) || D.days[0]; if (pick) showDay(pick);
  }
  paint();
  return root;
}


/* =========================================================
   토정비결 궁합 (HAE) — 두 사람의 그해 토정 괘를 겹쳐 보기
   상괘(팔괘) 오행 관계 + 두 사람의 그해 점수 + 분야별 + 함께 좋은 달
   ========================================================= */
const TRI_NAME = { 1: "건(乾)·하늘", 2: "태(兌)·연못", 3: "리(離)·불", 4: "진(震)·우레", 5: "손(巽)·바람", 6: "감(坎)·물", 7: "간(艮)·산", 8: "곤(坤)·땅" };
const TRI_EL = { 1: "metal", 2: "metal", 3: "fire", 4: "wood", 5: "wood", 6: "water", 7: "earth", 8: "earth" };
const EL_KO = { wood: "나무", fire: "불", earth: "흙", metal: "쇠", water: "물" };
const GEN_T = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
const CTRL_T = { wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" };
const PAIR_T = [[1, 8], [6, 3], [4, 5], [7, 2]]; // 건곤 · 감리 · 진손 · 간태 — 음양이 짝을 이루는 괘
function triRel(a, b) {
  if (PAIR_T.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) return { k: "천생 짝", sc: 18, line: "두 괘가 음양의 짝(하늘과 땅, 물과 불처럼)을 이뤄요. 서로에게 없는 것을 채워 주는 한 해예요." };
  const ea = TRI_EL[a], eb = TRI_EL[b];
  if (a === b) return { k: "같은 괘", sc: 8, line: "같은 괘를 받은 해예요. 생각과 속도가 비슷해 편하지만, 같은 곳에서 함께 막힐 수도 있어요." };
  if (ea === eb) return { k: "같은 기운", sc: 10, line: `둘 다 ${EL_KO[ea]}의 기운 — 친구처럼 편안하고 손발이 잘 맞는 해예요.` };
  if (GEN_T[ea] === eb || GEN_T[eb] === ea) return { k: "상생", sc: 14, line: `${EL_KO[GEN_T[ea] === eb ? ea : eb]}이(가) ${EL_KO[GEN_T[ea] === eb ? eb : ea]}을(를) 살려 주는 상생 — 한 사람이 밀어 주고 한 사람이 꽃피는 해예요.` };
  return { k: "상극", sc: -6, line: `${EL_KO[CTRL_T[ea] === eb ? ea : eb]}이(가) ${EL_KO[CTRL_T[ea] === eb ? eb : ea]}을(를) 누르는 상극 — 의견이 부딪히기 쉬우니 역할을 나누면 오히려 단단해져요.` };
}
const jfix = (t) => t.replace(/(나무|불|흙|쇠|물)이\(가\)/g, (m, w) => w + ({ 나무: "가", 불: "이", 흙: "이", 쇠: "가", 물: "이" }[w])).replace(/(나무|불|흙|쇠|물)을\(를\)/g, (m, w) => w + ({ 나무: "를", 불: "을", 흙: "을", 쇠: "를", 물: "을" }[w]));

export function renderTojeongCompat({ navigate }) {
  loadDisclaimer();
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/tojeong", "토정비결")]));
  root.append(pageHeader("토정비결 궁합", "두 사람의 한 해 · 결혼, 토정비결로 맞춰 보기", "각자의 토정 괘를 겹쳐서 원하는 해의 궁합과 함께 좋은 달을 보고, 결혼 궁합에선 둘이 결혼하기 좋은 해와 결혼 뒤 가정운까지 봐요."));
  root.append(personSwitch(navigate, { title: "나는 누구로 볼까?" }));
  const me = getMyBirth();
  const host = el("section", { class: "wrap section-gap" });
  root.append(host);
  if (!me) { host.append(noticeBox("info", "생년월일이 필요해요."), el("button", { class: "btn btn-primary", onclick: () => navigate("/saju") }, [el("span", { text: "내 정보 입력하고 시작" })])); return root; }
  const own = getOwnBirth();
  const sameP = (a, b) => a && b && a.birthDate === b.birthDate && (a.gender || "") === (b.gender || "");
  const cands = [...(own && !sameP(own, me) ? [{ id: "self", name: own.name ? `나 (${own.name})` : "나", input: own }] : []), ...getPeople().filter((p) => p.input && p.input.birthDate && !sameP(p.input, me)).map((p) => ({ id: p.id, name: p.name || "이름없음", input: p.input }))];
  if (!cands.length) {
    host.append(noticeBox("info", "궁합을 볼 상대가 아직 없어요. 위 ‘사람 추가’로 그 사람의 생일을 저장하면 바로 볼 수 있어요."));
    return root;
  }
  const nowY = new Date().getFullYear();
  let pick = cands[0], year = nowY, mode = "year";
  const partnerRow = el("div", { class: "tjc-pick", role: "group", "aria-label": "상대 고르기" });
  const modeRow = el("div", { class: "tjc-mode", role: "tablist" });
  const yInput = el("input", { class: "input tj-yinput", type: "number", min: "1900", max: "2200", inputmode: "numeric", "aria-label": "볼 연도" });
  const yearBox = el("div", { class: "tjc-ybox" });
  const yearRow = el("div", { class: "tjc-pick tjc-years", role: "group", "aria-label": "해 고르기" });
  const body = el("div", { class: "tjc-body" });
  const setYear = (y) => { year = Math.max(1900, Math.min(2200, Number(y) || nowY)); paintPick(); paint(); };
  yInput.addEventListener("change", () => setYear(yInput.value));
  yInput.addEventListener("keydown", (e) => { if (e.key === "Enter") setYear(yInput.value); });
  yearBox.append(
    el("button", { type: "button", class: "tj-step", "aria-label": "이전 해", onclick: () => setYear(year - 1) }, [el("span", { text: "‹" })]),
    yInput, el("span", { class: "tj-yu", text: "년" }),
    el("button", { type: "button", class: "tj-step", "aria-label": "다음 해", onclick: () => setYear(year + 1) }, [el("span", { text: "›" })]),
  );
  const paintPick = () => {
    clear(partnerRow); clear(yearRow); clear(modeRow);
    cands.forEach((c) => partnerRow.append(el("button", { type: "button", class: "tj-chip" + (c === pick ? " on" : ""), onclick: () => { pick = c; paintPick(); paint(); } }, [el("span", { text: c.name })])));
    [["year", "💞 한 해 궁합"], ["marry", "💍 결혼 궁합"]].forEach(([k, t]) => modeRow.append(el("button", { type: "button", role: "tab", class: "wg-tab" + (mode === k ? " on" : ""), onclick: () => { mode = k; paintPick(); paint(); } }, [el("span", { text: t })])));
    yInput.value = String(year);
    [[nowY - 1, "작년"], [nowY, "올해"], [nowY + 1, "내년"], [nowY + 2, "내후년"]].forEach(([y, t]) => yearRow.append(el("button", { type: "button", class: "tj-chip tjc-y" + (y === year ? " on" : ""), onclick: () => setYear(y) }, [el("small", { text: t }), el("b", { text: String(y) })])));
    yearWrap.style.display = mode === "year" ? "" : "none";
  };
  const yearWrap = el("div", { class: "tjc-ywrap" }, [el("p", { class: "tjc-l", text: "몇 년도? (직접 입력도 돼요)" }), yearBox, yearRow]);
  const paint = () => {
    clear(body);
    const sigOf = (x) => `${x.birthDate}_${x.gender || ""}`;
    const id = `tjcompat:${[sigOf(me), sigOf(pick.input)].sort().join("|")}`;
    const cost = costOf("tojeongcompat");
    if (!isUnlocked(id)) {
      const coins = getCoins();
      body.append(el("div", { class: "panel premium-lock" }, [
        el("span", { class: "lock-badge" }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: `코인 ${cost}개` })]),
        el("h3", { class: "serif", style: "margin-top:10px;", text: `${me.name || "나"} × ${pick.name} 토정비결 궁합` }),
        el("p", { class: "muted", style: "font-size:var(--fs-sm);", text: "한 번 열면 이 두 사람은 어느 해든 계속 볼 수 있어요." }),
        el("button", { class: "btn btn-primary btn-block", style: "margin-top: var(--sp-4);", onclick: () => { const r = unlock(id, cost); if (r.ok) { toast(`토정비결 궁합을 열었어요 · 코인 ${cost} 차감`); paint(); } else { noCoinToast(cost); navigate("/store"); } } },
          [el("span", { text: coins >= cost || isUnlimited() ? `코인 ${cost}개로 열기 · 보유 ${coins}개` : "코인 받으러 가기" })]),
      ]));
      return;
    }
    const PA = computeSaju(me), PB = computeSaju(pick.input);
    if (mode === "marry") { body.append(...marryView(PA, PB, me, pick, navigate)); return; }
    const A = tojeongYear(PA, year), B = tojeongYear(PB, year), rel = triRel(A.up, B.up);
    const score = Math.max(30, Math.min(97, Math.round((A.score + B.score) / 2 * 0.6 + 30 + rel.sc)));
    const grade = score >= 82 ? "찰떡 같은 한 해" : score >= 70 ? "서로 힘이 되는 한 해" : score >= 58 ? "맞춰 가는 한 해" : "배려가 필요한 한 해";
    const TA = tojeongTopics(PA, year, me.gender), TB = tojeongTopics(PB, year, pick.input.gender);
    const keys = ["love", "money", "home", "people"];
    const topics = keys.map((k) => { const a = TA.find((t) => t.id === k), b = TB.find((t) => t.id === k); return { name: a.name, em: a.em, a: a.sc, b: b.sc, avg: Math.round((a.sc + b.sc) / 2) }; });
    const MA = tojeongMonths(PA, year).months, MB = tojeongMonths(PB, year).months;
    const both = MA.map((m, i) => ({ m: m.m, a: m.sc, b: MB[i].sc, s: m.sc + MB[i].sc }));
    const good = both.filter((x) => x.a >= 60 && x.b >= 60).sort((x, y) => y.s - x.s).slice(0, 4).map((x) => x.m).sort((x, y) => x - y);
    const care = both.filter((x) => x.a < 55 && x.b < 55).map((x) => x.m);
    const careShow = care.length ? care : both.slice().sort((x, y) => x.s - y.s).slice(0, 2).map((x) => x.m).sort((x, y) => x - y);
    const nameA = me.name || "나", nameB = pick.name.replace(/^나 \((.*)\)$/, "$1");
    body.append(
      el("div", { class: "panel panel-gold", style: "text-align:center;" }, [
        el("p", { class: "eyebrow", style: "justify-content:center;", text: `${year}년 토정비결 궁합` }),
        el("p", { class: "serif", style: "font-size:1.5rem; margin-top:6px;", text: `${grade} · ${score}점` }),
        el("p", { class: "muted", style: "margin-top:6px;", text: jfix(rel.line) }),
      ]),
      el("div", { class: "tjc-two" }, [[nameA, A], [nameB, B]].map(([n, R]) => el("div", { class: "panel tjc-p" }, [
        el("p", { class: "tjc-n", text: n }), el("p", { class: "serif tjc-g", text: `${R.palName} · ${R.palSym}` }),
        el("p", { class: "tiny muted", text: `${R.code}괘 · 그해 ${R.score}점 · ${EL_KO[TRI_EL[R.up]]}의 기운` }),
        el("p", { class: "tjc-v", text: `“${R.verse}”` }),
      ]))),
      el("div", { class: "panel" }, [el("p", { class: "eyebrow", text: "두 괘의 관계" }), el("p", { style: "font-weight:700;", text: `${TRI_NAME[A.up]} × ${TRI_NAME[B.up]} — ${rel.k}` }), el("p", { class: "tiny muted", style: "margin-top:4px;", text: "상괘(윗괘)의 오행으로 봐요. 건곤·감리·진손·간태처럼 음양이 짝을 이루면 ‘천생 짝’, 서로 살려 주면 ‘상생’, 같은 오행이면 ‘같은 기운’, 누르면 ‘상극’이에요." })]),
      el("div", { class: "panel" }, [el("p", { class: "eyebrow", text: "분야별 궁합" }), el("div", { class: "tjc-topics" }, topics.map((t) => el("div", { class: "tjc-t" }, [
        el("b", { text: `${t.em} ${t.name}` }), el("span", { class: "tj-t-bar" }, [el("i", { style: `width:${t.avg}%` })]),
        el("small", { text: `${nameA} ${t.a} · ${nameB} ${t.b} → 함께 ${t.avg}점` }),
      ])))]),
      el("div", { class: "panel tjc-months" }, [
        el("div", {}, [el("p", { class: "eyebrow", text: "함께 좋은 달 (음력)" }), el("p", { class: "serif tjc-big", text: good.length ? good.map((m) => `${m}월`).join(" · ") : "—" }), el("p", { class: "tiny muted", text: good.length ? "여행·기념일·중요한 약속을 이때로 잡아 보세요." : "둘 다 동시에 좋은 달은 적어요 — 한 사람이 좋은 달에 리드를 맡겨요." })]),
        el("div", {}, [el("p", { class: "eyebrow", text: "서로 조심할 달" }), el("p", { class: "serif tjc-big", text: careShow.map((m) => `${m}월`).join(" · ") }), el("p", { class: "tiny muted", text: "예민해지기 쉬운 달이에요. 큰 결정은 미루고 말을 아껴요." })]),
      ]),
      noticeBox("info", "토정비결 궁합은 두 사람의 ‘그해 흐름’을 겹쳐 본 참고용 풀이예요. 평생 궁합은 사주 궁합에서 함께 봐 주세요."),
      el("button", { type: "button", class: "btn btn-ghost btn-block", onclick: () => navigate("/compat") }, [el("span", { text: "사주 궁합도 보기" })]),
    );
  };
  host.append(el("div", { class: "panel tjc-ctl" }, [el("p", { class: "tjc-l", text: "누구와 볼까?" }), partnerRow, modeRow, yearWrap]), body);
  paintPick(); paint();
  return root;
}


/* 결혼한 해 직접 입력 (HAE) */
function yearAsk(label, hint, onShow) {
  const nowY = new Date().getFullYear();
  const inp = el("input", { class: "input tj-yinput", type: "number", min: "1940", max: String(nowY + 20), inputmode: "numeric", placeholder: "예: 2024", "aria-label": label });
  const out = el("div", { class: "tja-out" });
  const go = () => { const y = Number(inp.value); clear(out); if (!y || y < 1940 || y > nowY + 20) { out.append(el("p", { class: "tiny muted", text: `1940~${nowY + 20} 사이의 연도를 넣어 주세요.` })); return; } onShow(y, out); };
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
  return el("div", { class: "panel tja" }, [
    el("p", { class: "eyebrow", text: label }),
    el("p", { class: "tiny muted", text: hint }),
    el("div", { class: "tja-row" }, [inp, el("span", { class: "tj-yu", text: "년" }), el("button", { type: "button", class: "btn btn-primary", onclick: go }, [el("span", { text: "풀어 보기" })])]),
    out,
  ]);
}
const homeChips = (list, nowY) => el("div", { class: "tjm-after" }, list.map((a) => el("span", { class: (a.v >= 70 ? "good" : a.v < 55 ? "low" : "") + (a.y === nowY ? " now" : "") }, [el("small", { text: a.y === nowY ? `${a.y} · 올해` : `${a.y}` }), el("b", { text: `${a.v}점` })])));

/* 결혼 궁합 — 두 사람의 결혼 적령기(세는나이 26~40)를 해마다 겹쳐 보기 */
function marryView(PA, PB, me, pick, navigate) {
  const nowY = new Date().getFullYear(), bA = PA.solar.Y, bB = PB.solar.Y;
  const from = Math.max(nowY, Math.max(bA, bB) + 25), to = Math.min(bA, bB) + 39 >= from ? Math.min(bA, bB) + 39 : from + 9;
  const rowOf = (y) => {
    const A = tojeongYear(PA, y), B = tojeongYear(PB, y), rel = triRel(A.up, B.up);
    const TA = tojeongTopics(PA, y, me.gender), TB = tojeongTopics(PB, y, pick.input.gender);
    const g = (T, k) => T.find((t) => t.id === k).sc;
    const v = Math.max(30, Math.min(97, Math.round((g(TA, "home") + g(TB, "home") + g(TA, "love") + g(TB, "love")) / 4 * 0.7 + 22 + rel.sc * 0.8)));
    return { y, aAge: y - bA + 1, bAge: y - bB + 1, v, rel, A, B, home: Math.round((g(TA, "home") + g(TB, "home")) / 2) };
  };
  const rows = [];
  for (let y = from; y <= Math.max(to, from + 4); y++) rows.push(rowOf(y));
  const top = rows.slice().sort((a, b) => b.v - a.v).slice(0, 3).sort((a, b) => a.y - b.y);
  const pairs = rows.filter((r) => r.rel.k === "천생 짝").length, clash = rows.filter((r) => r.rel.k === "상극").length;
  const score = Math.max(35, Math.min(96, Math.round(rows.reduce((a, r) => a + r.v, 0) / rows.length + pairs * 2 - clash)));
  const grade = score >= 80 ? "천생연분에 가까운 결혼 궁합" : score >= 70 ? "함께하면 더 좋아지는 결혼 궁합" : score >= 58 ? "서로 맞춰 가는 결혼 궁합" : "노력이 필요한 결혼 궁합";
  const best = top.slice().sort((a, b) => b.v - a.v)[0];
  const nameA = me.name || "나", nameB = pick.name.replace(/^나 \((.*)\)$/, "$1");
  const after = []; for (let y = best.y; y < best.y + 5; y++) { const a = tojeongTopics(PA, y, me.gender).find((t) => t.id === "home").sc, b = tojeongTopics(PB, y, pick.input.gender).find((t) => t.id === "home").sc; after.push({ y, v: Math.round((a + b) / 2) }); }
  return [
    el("div", { class: "panel panel-gold", style: "text-align:center;" }, [
      el("p", { class: "eyebrow", style: "justify-content:center;", text: "토정비결 결혼 궁합" }),
      el("p", { class: "tjm-score serif" }, [el("b", { text: String(score) }), el("small", { text: "점" })]), el("p", { class: "serif", style: "font-size:1.2rem; word-break:keep-all;", text: grade }),
      el("p", { class: "muted", style: "margin-top:6px;", text: `결혼하기 가장 좋은 해는 ${best.y}년(${nameA} ${best.aAge}세 · ${nameB} ${best.bAge}세) — 두 괘가 ‘${best.rel.k}’${best.rel.k === "같은 괘" ? "로" : "으로"} 만나는 해예요.` }),
    ]),
    el("div", { class: "panel" }, [el("p", { class: "eyebrow", text: "결혼하기 좋은 해 TOP 3" }), el("div", { class: "tjm-top" }, top.map((r) => el("article", { class: "tjm-c" + (r === best ? " best" : "") }, [
      el("b", { class: "serif", text: `${r.y}년` }), el("small", { text: `${nameA} ${r.aAge}세 · ${nameB} ${r.bAge}세` }),
      el("span", { class: "tjm-sc", text: `${r.v}점 · ${r.rel.k}` }),
      el("small", { class: "muted", text: `${r.A.palName}×${r.B.palName}` }),
    ])))]),
    el("div", { class: "panel" }, [el("p", { class: "eyebrow", text: "해마다 결혼 궁합" }), el("div", { class: "tjm-bars" }, rows.map((r) => el("div", { class: "tjm-bar" + (top.includes(r) ? " on" : "") }, [
      el("span", { class: "tjm-bv", text: String(r.v) }), el("span", { class: "tjm-bt" }, [el("i", { style: `height:${r.v}%` })]), el("b", { text: `'${String(r.y).slice(2)}` }),
    ]))), el("p", { class: "tiny muted", text: `${rows[0].y}~${rows[rows.length - 1].y}년, 두 사람의 결혼 적령기를 해마다 겹쳐 봤어요. 천생 짝으로 만나는 해 ${pairs}번 · 상극으로 만나는 해 ${clash}번.` })]),
    el("div", { class: "panel" }, [el("p", { class: "eyebrow", text: `${best.y}년에 결혼하면 — 첫 5년 가정운` }), el("div", { class: "tjm-after" }, after.map((a) => el("span", { class: a.v >= 70 ? "good" : a.v < 55 ? "low" : "" }, [el("small", { text: `${a.y}` }), el("b", { text: `${a.v}점` })]))),
      el("p", { class: "tiny muted", style: "margin-top:8px;", text: "두 사람의 그해 가정운 평균이에요. 점수가 낮은 해엔 이사·큰 지출을 미루고 대화를 늘려 보세요." })]),
    yearAsk("이미 결혼했거나, 결혼할 날을 정했다면", "결혼한(할) 해를 넣으면 그해 두 사람의 괘가 어땠는지, 결혼 뒤 5년 가정운과 올해 흐름까지 풀어 드려요.", (y, out) => {
      const r = rowOf(y), avg = Math.round(rows.reduce((a, x) => a + x.v, 0) / rows.length);
      const verdict = r.v >= 80 ? "결혼하기 아주 좋은 해에 맺어진 인연" : r.v >= 70 ? "함께 시작하기 좋은 해" : r.v >= 58 ? "무난하게 시작한 해" : "조금 거친 바람 속에서 시작한 해";
      const after = []; for (let k = 0; k < 5; k++) after.push({ y: y + k, v: rowOf(y + k).home });
      const nowRow = y < nowY ? rowOf(nowY) : null;
      out.append(
        el("div", { class: "tja-head" }, [el("b", { class: "serif", text: `${y}년 · ${r.v}점` }), el("span", { text: verdict })]),
        el("p", { text: `${nameA} ${r.aAge}세 ${r.A.palName} · ${nameB} ${r.bAge}세 ${r.B.palName} — 두 괘는 ‘${r.rel.k}’. ${jfix(r.rel.line)}` }),
        el("p", { class: "tiny muted", text: `두 사람 결혼 적령기 평균(${avg}점)보다 ${r.v >= avg ? `${r.v - avg}점 높은` : `${avg - r.v}점 낮은`} 해예요.${r.v < 58 ? " 시작이 거칠었던 부부는 함께 고비를 넘기며 오히려 단단해지는 경우가 많아요." : ""}` }),
        el("p", { class: "tjc-l", style: "margin-top:10px;", text: "결혼 뒤 첫 5년 가정운" }), homeChips(after, nowY),
        nowRow ? el("p", { class: "tja-now", text: `결혼 ${nowY - y + 1}년 차인 올해(${nowY}) — 두 괘는 ‘${nowRow.rel.k}’, 가정운 ${nowRow.home}점. ${nowRow.home >= 70 ? "함께 계획한 일을 밀고 나가기 좋은 해예요." : nowRow.home < 55 ? "큰 지출·이사는 미루고 둘만의 시간을 늘리면 좋아요." : "서로의 속도에 맞춰 차분히 가면 좋은 해예요."}` }) : null,
      );
    }),
    noticeBox("info", "결혼 궁합은 두 사람의 토정 괘를 결혼 적령기 동안 겹쳐 본 참고용 풀이예요. 결혼은 두 사람의 마음과 상황이 가장 중요해요."),
    el("button", { type: "button", class: "btn btn-ghost btn-block", onclick: () => navigate("/compat") }, [el("span", { text: "사주 궁합도 보기" })]),
  ];
}


/* 운명의 사람·배우자 상세 프로필 (HAE) */
const ANIMALS = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];
const animalOfY = (y) => ANIMALS[((y - 4) % 12 + 12) % 12];
function ageGapText(diffs) {
  if (!diffs.length) return "";
  const older = [...new Set(diffs.filter((d) => d < 0).map((d) => -d))].sort((a, b) => a - b);
  const younger = [...new Set(diffs.filter((d) => d > 0))].sort((a, b) => a - b);
  const rng = (a) => (a[0] === a[a.length - 1] ? `${a[0]}살` : `${a[0]}~${a[a.length - 1]}살`);
  const out = [];
  if (older.length) out.push(`${rng(older)} 위`);
  if (diffs.includes(0)) out.push("동갑");
  if (younger.length) out.push(`${rng(younger)} 아래`);
  const cnt = {}; diffs.forEach((d) => { cnt[d] = (cnt[d] || 0) + 1; });
  const top = Number(Object.entries(cnt).sort((a, b) => b[1] - a[1] || Math.abs(a[0]) - Math.abs(b[0]))[0][0]);
  return `${out.join(" 또는 ")} — 그중 가장 자주 나오는 건 ${top === 0 ? "동갑" : top < 0 ? `${-top}살 위` : `${top}살 아래`}예요.`;
}
function matesOf(year, birthY, wantUp) {
  const out = [];
  for (let by = birthY - 7; by <= birthY + 7; by++) if (year - by + 1 >= 18 && upOf(year, by) === wantUp) out.push(by - birthY);
  return out;
}
function mateProfile(up, ageText, title) {
  const I = TRI_INFO[up], D = TRI_DEEP[up];
  const row = (em, label, body) => el("div", { class: "tjp-row" }, [el("span", { class: "tjp-em", "aria-hidden": "true", text: em }), el("div", {}, [el("b", { text: label }), typeof body === "string" ? el("p", { text: body }) : body])]);
  return el("div", { class: "panel tjp" }, [
    el("p", { class: "eyebrow", text: title || "운명의 사람 프로필" }),
    el("p", { class: "serif tjp-h", text: `${I.name}·${I.sym}의 사람` }),
    el("p", { class: "tjp-sub", text: I.person }),
    el("div", { class: "tjp-grid" }, [
      ageText ? row("🎂", "나이 차", ageText) : null,
      row("👀", "외모·분위기", D.look),
      row("✨", "첫인상", D.first),
      row("🧭", "성격", D.char),
      row("💼", "어울리는 직업", D.job),
      row("📍", "어디서 만날 확률이 높을까", el("div", { class: "tjp-chips" }, D.place.map((x) => el("span", { text: x })))),
      row("🌱", "어떻게 시작될까", D.how),
      row("💗", "연애할 때", D.love),
      row("🏡", "결혼 생활", D.marry),
      row("⚡", "부딪히는 점", D.clash),
      row("🔑", "오래가는 비결", D.keep),
    ].filter(Boolean)),
  ]);
}
function yearLines(years, field, mateField) {
  return el("details", { class: "panel tjy" }, [
    el("summary", {}, [el("span", { text: "해마다 한 줄 풀이 펼치기" })]),
    el("div", { class: "tjy-list" }, years.map((r) => el("div", { class: "tjy-r" }, [
      el("b", { text: `${r.y}년` }), el("small", { text: `${r.age}세 · ${TRI_INFO[r.up].name}·${TRI_INFO[r.up].sym} · ${r.v}점` }),
      el("p", { text: TRI_DEEP[r.up][field] + (mateField ? ` 이 해 끌리는 사람은 ${TRI_INFO[TRI_PAIRMATE[r.up]].person}.` : "") }),
    ]))),
  ]);
}

/* =========================================================
   토정비결 테마 리포트 (HAE) — #/tojeong-theme/:id
   ========================================================= */
const TJT = {
  love: { em: "💗", title: "토정비결로 보는 연애운", sub: "앞으로 10년, 연애가 뜨거운 해와 달", key: "tjt_love" },
  money: { em: "💰", title: "토정비결로 보는 재물운", sub: "돈이 모이는 해 · 새는 해 · 평생 흐름", key: "tjt_money" },
  success: { em: "🏆", title: "토정비결로 보는 성공운", sub: "승진·합격·이름을 알리는 해 · 인생 전성기", key: "tjt_success" },
  spouse: { em: "💍", title: "토정비결로 보는 배우자복", sub: "결혼하기 좋은 해 · 나와 짝이 되는 배우자", key: "tjt_spouse" },
  fate: { em: "🔮", title: "토정비결로 보는 운명의 사람", sub: "이미 만났을 수도 있는 해 · 앞으로 오는 해 · 그 사람의 나이·띠", key: "tjt_fate" },
};
export const TJT_IDS = Object.keys(TJT);
export function renderTojeongTheme({ navigate, id }) {
  loadDisclaimer();
  const T = TJT[id] || TJT.love, key = TJT[id] ? id : "love";
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/tojeong", "토정비결")]));
  root.append(pageHeader("토정비결 테마", `${T.em} ${T.title}`, `${T.sub} — 해마다 세운 토정 괘를 모아서 봐요.`));
  root.append(personSwitch(navigate, { title: "누구로 볼까?" }));
  const my = getMyBirth();
  const host = el("section", { class: "wrap section-gap" });
  root.append(host);
  if (!my) { host.append(noticeBox("info", "생년월일이 필요해요."), el("button", { class: "btn btn-primary", onclick: () => navigate("/saju") }, [el("span", { text: "내 정보 입력하고 시작" })])); return root; }
  const id2 = `${T.key}:${my.birthDate}_${my.gender || ""}`, cost = costOf(T.key);
  const paint = () => {
    clear(host);
    if (!isUnlocked(id2)) {
      const coins = getCoins();
      host.append(el("div", { class: "panel premium-lock" }, [
        el("span", { class: "lock-badge" }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: `코인 ${cost}개` })]),
        el("h3", { class: "serif", style: "margin-top:10px;", text: `${T.title} 열어 보기` }),
        el("p", { class: "muted", style: "font-size:var(--fs-sm);", text: T.sub }),
        el("button", { class: "btn btn-primary btn-block", style: "margin-top: var(--sp-4);", onclick: () => { const r = unlock(id2, cost); if (r.ok) { toast(`${T.title}을(를) 열었어요 · 코인 ${cost} 차감`); paint(); } else { noCoinToast(cost); navigate("/store"); } } }, [el("span", { text: coins >= cost || isUnlimited() ? `코인 ${cost}개로 열기 · 보유 ${coins}개` : "코인 받으러 가기" })]),
      ]));
      return;
    }
    const P = computeSaju(my), R = tojeongTheme(P, my.gender, key);
    const chart = el("div", { class: "tjm-bars" }, R.years.map((r) => el("div", { class: "tjm-bar" + (R.top.some((t) => t.y === r.y) ? " on" : "") }, [
      el("span", { class: "tjm-bv", text: String(r.v) }), el("span", { class: "tjm-bt" }, [el("i", { style: `height:${r.v}%` })]), el("b", { text: `'${String(r.y).slice(2)}` }),
    ])));
    const parts = [
      el("div", { class: "panel panel-gold", style: "text-align:center;" }, [el("p", { class: "eyebrow", style: "justify-content:center;", text: T.title }), el("p", { class: "serif", style: "font-size:1.3rem; margin-top:6px; word-break:keep-all;", text: R.lead })]),
      el("div", { class: "panel" }, [el("p", { class: "eyebrow", text: `해마다 ${R.unit}` }), chart, el("p", { class: "tiny muted", text: "금색 막대는 아래에 풀어 드린 해예요. 80점 넘는 해는 모두 골랐고(최대 6개), 그보다 적으면 가장 높은 3개를 골랐어요." })]),
    ];
    if (key === "fate") {
      let when = R.past.length ? "past" : "future";
      const fateHost = el("div", {});
      const fCard = (m, isPast) => el("article", { class: "tjf-c" + (isPast ? " past" : "") }, [
        el("div", { class: "tjf-h" }, [el("b", { class: "serif", text: m.y === new Date().getFullYear() ? `${m.y}년 · 올해` : `${m.y}년` }), el("span", { text: `${m.age}세 · 인연운 ${m.v}점` })]),
        el("p", { text: `이 해 나는 ${TRI_INFO[m.myUp].name}·${TRI_INFO[m.myUp].sym}의 괘 — ${TRI_INFO[m.wantUp].name}·${TRI_INFO[m.wantUp].sym}의 괘를 받은 사람과 ${m.kind}을 ${isPast ? "이뤘어요" : "이뤄요"}.` }),
        el("p", { class: "tjf-who", text: `그 사람: ${TRI_INFO[m.wantUp].person}` }),
        el("p", { class: "tjf-mini", text: `👀 ${TRI_DEEP[m.wantUp].look.split(".")[0]}.` }),
        el("p", { class: "tjf-mini", text: `📍 ${isPast ? "만났을" : "만날"} 확률이 높은 곳: ${TRI_DEEP[m.wantUp].place.slice(0, 2).join(" · ")}` }),
        m.births.length ? el("div", { class: "tjf-births" }, m.births.map((b) => el("span", { text: `${b.by}년생 ${b.animal}띠 (${b.diff === 0 ? "동갑" : b.diff > 0 ? `${b.diff}살 아래` : `${-b.diff}살 위`})` }))) : null,
        m.months.length ? el("p", { class: "tiny muted", text: `만남이 ${isPast ? "잘 닿았던" : "잘 닿는"} 달: ${m.months.map((x) => `${x}월`).join(" · ")} (음력)` }) : null,
        isPast ? el("p", { class: "tjf-ask", text: `${m.y}년${m.months.length ? " " + m.months.map((x) => `${x}월`).join("·") + " 무렵" : ""}에 만난 ${m.births.length ? m.births.map((b) => `${b.animal}띠`).join("·") + " " : ""}사람이 떠오른다면 — 그 사람이 운명의 인연이었을 수도 있어요.` }) : null,
      ].filter(Boolean));
      const paintFate = () => {
        clear(fateHost);
        const isPast = when === "past", list = isPast ? R.past : R.top, ys = isPast ? R.pastYears : R.years;
        fateHost.append(
          R.past.length ? el("div", { class: "tjc-mode", role: "tablist" }, [["past", "🕰 이미 만났을 수도"], ["future", "✨ 앞으로 만날"]].map(([k, t]) => el("button", { type: "button", role: "tab", class: "wg-tab" + (when === k ? " on" : ""), onclick: () => { when = k; paintFate(); } }, [el("span", { text: t })]))) : null,
          el("div", { class: "panel" }, [el("p", { class: "eyebrow", text: isPast ? `지나간 해마다 인연운 (${ys[0].y}~${ys[ys.length - 1].y})` : "앞으로 해마다 인연운" }), el("div", { class: "tjm-bars" }, ys.map((r) => el("div", { class: "tjm-bar" + (list.some((t) => t.y === r.y) ? " on" : "") }, [el("span", { class: "tjm-bv", text: String(r.v) }), el("span", { class: "tjm-bt" }, [el("i", { style: `height:${r.v}%` })]), el("b", { text: `'${String(r.y).slice(2)}` })]))), el("p", { class: "tiny muted", text: "금색 막대가 아래에 풀어 드린 해예요. 80점 넘는 해는 모두 골랐어요(최대 6개)." })]),
          el("div", { class: "panel" }, [el("p", { class: "eyebrow", text: isPast ? "인연이 스쳐 갔을 수도 있는 해 · 그때의 그 사람" : "인연이 오는 해 · 그때 만나는 사람" }), el("div", { class: "tjf-list" }, list.map((m) => fCard(m, isPast)))]),
        );
      };
      parts.splice(1, 1); // 공통 10년 그래프 대신 과거/미래 그래프
      paintFate();
      // 운명의 사람 유형 — 지나간/다가올 인연에 나온 괘를 많이 나온 순서로
      const all = [...R.past, ...R.top], freq = {};
      all.forEach((m) => { freq[m.wantUp] = (freq[m.wantUp] || 0) + 1; });
      const types = Object.keys(freq).map(Number).sort((a, b) => freq[b] - freq[a]).slice(0, 4);
      let tsel = types[0];
      const profHost = el("div", {});
      const paintProf = () => {
        clear(profHost);
        const diffs = all.filter((m) => m.wantUp === tsel).flatMap((m) => m.births.map((b) => b.diff));
        profHost.append(
          el("p", { class: "tjc-l", style: "margin:4px 0 8px;", text: types.length > 1 ? "나의 운명의 사람 유형 — 눌러서 바꿔 보기" : "나의 운명의 사람 유형" }),
          types.length > 1 ? el("div", { class: "tjp-tabs" }, types.map((u) => el("button", { type: "button", class: "wg-tab" + (u === tsel ? " on" : ""), onclick: () => { tsel = u; paintProf(); } }, [el("span", { text: `${TRI_INFO[u].name}·${TRI_INFO[u].sym}` }), el("small", { text: ` ${freq[u]}번` })]))) : null,
          mateProfile(tsel, ageGapText(diffs), "운명의 사람 프로필"),
        );
      };
      paintProf();
      parts.push(fateHost, profHost);
      parts.push(noticeBox("info", "그해 같은 괘를 받는 나이는 정해져 있어서, 나와 천생 짝(건곤·감리·진손·간태)을 이루는 나이를 거꾸로 찾아봤어요. 이미 지나간 해에 만난 사람도 인연일 수 있고, 그 나이만 인연이라는 뜻은 아니에요."));
    } else if (key === "spouse") {
      parts.push(el("div", { class: "panel" }, [el("p", { class: "eyebrow", text: `결혼하기 좋은 해 · ${R.top.length}번` }), el("div", { class: "tjf-list" }, R.top.map((r) => el("article", { class: "tjf-c" }, [
        el("div", { class: "tjf-h" }, [el("b", { class: "serif", text: r.y === new Date().getFullYear() ? `${r.y}년 · 올해` : `${r.y}년` }), el("span", { text: `${r.age}세 · 결혼운 ${r.v}점` })]),
        el("p", { class: "tiny muted", text: `그해 괘 ${TRI_INFO[r.up].name}·${TRI_INFO[r.up].sym} · 짝이 되는 사람 ${TRI_INFO[TRI_PAIRMATE[r.up]].name}·${TRI_INFO[TRI_PAIRMATE[r.up]].sym}` }),
        el("p", { text: `${TRI_DEEP[r.up].loveYear} 이 해에 맺어지면 ${TRI_DEEP[TRI_PAIRMATE[r.up]].marry.split(".")[0]}.` }),
        r.months.length ? el("p", { class: "tiny muted", text: `특히 좋은 달: ${r.months.map((x) => `${x}월`).join(" · ")} (음력)` }) : null,
      ].filter(Boolean))))]));
      const by0 = Number(my.birthDate.slice(0, 4));
      const sdiffs = R.top.flatMap((r) => matesOf(r.y, by0, R.mateUp));
      parts.push(el("div", { class: "panel" }, [el("p", { class: "eyebrow", text: `배우자복 지수 · ${R.index}점` }),
        el("p", { style: "font-weight:700;", text: `결혼 적령기에 내가 가장 많이 받는 괘는 ${TRI_INFO[R.myUp].name}·${TRI_INFO[R.myUp].sym} — 짝이 되는 배우자는 ${TRI_INFO[R.mateUp].name}·${TRI_INFO[R.mateUp].sym}의 사람이에요.` }),
        el("p", { class: "tiny muted", text: "배우자복 지수는 결혼 적령기 동안 가정운·애정운의 평균이에요. 70점 이상이면 배우자 덕을 보는 편이에요." })]));
      parts.push(mateProfile(R.mateUp, ageGapText(sdiffs), "나와 맞는 배우자 프로필"));
      parts.push(yearAsk("이미 결혼했다면 — 결혼한 해로 보기", "결혼한 해를 넣으면 그해 내 괘, 그해 짝이 되는 배우자 모습, 결혼 뒤 5년 가정운과 올해 흐름을 풀어 드려요.", (y, out) => {
        const nowY = new Date().getFullYear(), Rm = tojeongYear(P, y), T = tojeongTopics(P, y, my.gender);
        const gv = (TT, k) => TT.find((t) => t.id === k).sc;
        const v = Math.round((gv(T, "home") + gv(T, "love")) / 2), mu = TRI_PAIRMATE[Rm.up], D = TRI_DEEP[mu];
        const verdict = v >= 78 ? "결혼하기 아주 좋은 해에 결혼했어요" : v >= 68 ? "결혼하기 좋은 해에 결혼했어요" : v >= 58 ? "무난한 해에 결혼했어요" : "조금 거친 해에 시작했어요";
        const after = []; for (let k = 0; k < 5; k++) after.push({ y: y + k, v: gv(tojeongTopics(P, y + k, my.gender), "home") });
        out.append(
          el("div", { class: "tja-head" }, [el("b", { class: "serif", text: `${y}년 · ${y - by0 + 1}세 · ${v}점` }), el("span", { text: verdict })]),
          el("p", { text: `그해 내 괘는 ${TRI_INFO[Rm.up].name}·${TRI_INFO[Rm.up].sym} — 이 해에 맺어진 배우자는 ${TRI_INFO[mu].name}·${TRI_INFO[mu].sym}의 기운을 띤 ‘${TRI_INFO[mu].person}’일 가능성이 커요.` }),
          el("p", { class: "tjf-mini", text: `👀 ${D.look}` }),
          el("p", { class: "tjf-mini", text: `🏡 ${D.marry}` }),
          el("p", { class: "tjf-mini", text: `🔑 ${D.keep}` }),
          el("p", { class: "tiny muted", text: `결혼 적령기 배우자복 지수(${R.index}점)와 비교하면 ${v >= R.index ? `${v - R.index}점 높은` : `${R.index - v}점 낮은`} 해예요.` }),
          el("p", { class: "tjc-l", style: "margin-top:10px;", text: "결혼 뒤 첫 5년 가정운" }), homeChips(after, nowY),
          y < nowY ? el("p", { class: "tja-now", text: (() => { const hv = gv(tojeongTopics(P, nowY, my.gender), "home"); return `결혼 ${nowY - y + 1}년 차인 올해 가정운은 ${hv}점 — ${hv >= 70 ? "함께 계획한 일(집·여행·가족 계획)을 밀고 나가기 좋은 해예요." : hv < 55 ? "큰 지출·이사는 미루고 둘만의 시간을 늘리면 좋아요." : "서로의 속도에 맞춰 차분히 가면 좋은 해예요."}`; })() }) : null,
        );
      }));
      parts.push(yearLines(R.years, "loveYear", true));
    } else {
      const fld = key === "money" ? "moneyYear" : key === "success" ? "workYear" : "loveYear";
      parts.push(el("div", { class: "panel" }, [el("p", { class: "eyebrow", text: `${R.unit}이 좋은 해 · ${R.top.length}번` }), el("div", { class: "tjf-list" }, R.top.map((r) => el("article", { class: "tjf-c" }, [
        el("div", { class: "tjf-h" }, [el("b", { class: "serif", text: `${r.y}년` }), el("span", { text: `${r.age}세 · ${R.unit} ${r.v}점` })]),
        el("p", { class: "tiny muted", text: `그해 괘 ${TRI_INFO[r.up].name}·${TRI_INFO[r.up].sym}` }),
        el("p", { text: TRI_DEEP[r.up][fld] }),
        key === "love" ? el("p", { class: "tjf-who", text: `이 해 끌리는 사람: ${TRI_INFO[TRI_PAIRMATE[r.up]].person}` }) : null,
        key === "love" ? el("p", { class: "tjf-mini", text: `👀 ${TRI_DEEP[TRI_PAIRMATE[r.up]].look.split(".")[0]}.` }) : null,
        key === "love" ? el("p", { class: "tjf-mini", text: `💗 ${TRI_DEEP[TRI_PAIRMATE[r.up]].love}` }) : null,
        r.months.length ? el("p", { class: "tiny muted", text: `특히 좋은 달: ${r.months.map((x) => `${x}월`).join(" · ")} (음력)` }) : null,
      ].filter(Boolean))))]));
      if (R.low && R.low.length) parts.push(el("div", { class: "panel" }, [el("p", { class: "eyebrow", text: "조심할 해" }), el("p", { style: "font-weight:700;", text: R.low.map((r) => `${r.y}년 (${r.v}점)`).join(" · ") }), el("p", { class: "tiny muted", text: key === "money" ? "보증·큰 투자·충동구매를 미루고 고정 지출부터 정리하면 좋아요." : key === "success" ? "무리한 이직·도전보다 실력을 다지는 해로 쓰면 다음 상승이 커져요." : "오해가 생기기 쉬운 해예요. 마음은 말보다 행동으로." })]));
      if (key === "love" && R.nowText) parts.push(el("div", { class: "insight", text: R.nowText }));
      parts.push(yearLines(R.years, fld, key === "love"));
      if (R.life) parts.push(el("div", { class: "panel" }, [el("p", { class: "eyebrow", text: key === "money" ? "평생 재물 흐름" : "인생 전성기" }), el("div", { class: "tjm-life" }, R.life.stages.map((st) => el("div", { class: "tjm-st" + (st.score === Math.max(...R.life.stages.map((x) => x.score)) ? " peak" : "") + (st.isNow ? " now" : "") }, [el("b", { text: st.name }), el("small", { text: `${st.from}~${st.to}세` }), el("span", { text: `${st.score}점 · ${st.band}` })])))]));
    }
    parts.push(el("div", { class: "tjt-more" }, Object.entries(TJT).filter(([k]) => k !== key).map(([k, t]) => el("button", { type: "button", class: "chip", onclick: () => navigate(`/tojeong-theme/${k}`) }, [el("span", { text: `${t.em} ${t.title.replace("토정비결로 보는 ", "")}` })]))));
    parts.push(noticeBox("info", "토정비결은 해마다 바뀌는 흐름을 보는 풀이예요. 참고용으로 보고, 중요한 결정은 실제 상황과 함께 판단해 주세요."));
    host.append(...parts);
  };
  paint();
  return root;
}
