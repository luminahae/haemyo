/* =========================================================
   리포트 2 (HAE) — 십이운성 신년운세 · 연애운 10년 연대기 · 5년 인생 설계 ·
   나의 배우자복 · 사주 스토리 리딩(음성 해설)
   계산은 saju/wonguk.js 엔진 결과를 쓰고, 여기선 풀이 문장과 화면만 만들어요.
   ========================================================= */
import { el, clear, toast } from "../utils/dom.js";
import { noticeBox } from "./shared.js";
import { gated } from "./rich.js";
import { buildWonguk, STAGE_INFO, stageOf, sinsal12, BRANCH_H, BRANCH_KR, STEM_H, STEM_KR, ELEM_KR } from "../saju/wonguk.js";
import { tenGod } from "../saju/fortune.js";
import { costOf, isUnlocked, unlock, getCoins, noCoinToast } from "../wallet.js";

const mod = (n, m) => ((n % m) + m) % m;
const GROUP = { 비견: "비겁", 겁재: "비겁", 식신: "식상", 상관: "식상", 편재: "재성", 정재: "재성", 편관: "관성", 정관: "관성", 편인: "인성", 정인: "인성" };
const POWER = { 장생: 4, 목욕: 3, 관대: 4, 건록: 5, 제왕: 5, 쇠: 3, 병: 2, 사: 2, 묘: 2, 절: 1, 태: 2, 양: 3 };
const yearGZ = (Y) => ({ s: mod(Y - 4, 10), b: mod(Y - 4, 12) });
const gzKr = (s, b) => `${STEM_KR[s]}${BRANCH_KR[b]}(${STEM_H[s]}${BRANCH_H[b]})`;
const card = (eyebrow, title, kids, cls = "") => el("section", { class: `panel r2-card ${cls}`, "data-nokr": "" }, [el("p", { class: "eyebrow", text: eyebrow }), title ? el("h3", { class: "serif r2-h", text: title }) : null, ...kids].filter(Boolean));
/** 받침 따라 '이에요/예요' */
const ida = (w) => { const c = String(w).replace(/\([^)]*\)$/, "").slice(-1).charCodeAt(0) - 0xac00; return `${w}${c >= 0 && c <= 11171 && c % 28 !== 0 ? "이에요" : "예요"}`; };
const p = (t, cls = "") => el("p", { class: `r2-p ${cls}`, text: t });
const disclaimer = () => noticeBox("info", "전통 명리의 풀이를 참고용으로 정리했어요. 정해진 미래가 아니라, 흐름을 미리 알고 준비하는 데 써 주세요.");

/* 십이운성별 한 해 · 한 달 풀이 */
const STAGE_YEAR = {
  장생: ["새싹의 해", "새로 시작하는 일이 잘 자라요. 배우고, 등록하고, 첫발을 떼기 좋은 해예요."],
  목욕: ["꾸미고 드러내는 해", "관심과 매력이 커지지만 마음도 쉽게 흔들려요. 새 취향을 즐기되 큰 약속은 신중히."],
  관대: ["도전하는 해", "의욕과 자신감이 올라와요. 시험·면접·발표처럼 나를 증명하는 일에 좋아요."],
  건록: ["자립하는 해", "실력으로 자리를 잡는 해예요. 일과 수입이 안정되고 스스로 해내는 힘이 커요."],
  제왕: ["정점의 해", "기운이 가장 센 해예요. 리더 역할이 오지만 너무 밀어붙이면 반발이 생겨요."],
  쇠: ["노련함의 해", "속도보다 경험이 빛나요. 새 판을 벌이기보다 가진 것을 다듬는 해예요."],
  병: ["돌봄의 해", "몸과 마음을 챙겨야 하는 해예요. 공감·상담·창작 쪽 감각은 오히려 좋아져요."],
  사: ["깊어지는 해", "겉으로는 조용하지만 생각이 깊어지는 해예요. 공부·연구·한 우물 파기에 좋아요."],
  묘: ["모으는 해", "곳간에 쌓는 해예요. 저축·정리·자료 모으기에 좋고, 벌이는 일은 줄이는 게 좋아요."],
  절: ["전환의 해", "하나가 끝나고 새것이 들어오는 해예요. 정리할 건 정리하고 새 방향을 고르세요."],
  태: ["씨앗의 해", "아이디어와 계획이 많아지는 해예요. 아직 형태가 없으니 작게 시험해 보세요."],
  양: ["준비의 해", "도움을 받으며 힘을 기르는 해예요. 서두르지 말고 실력과 관계를 다지세요."],
};
const STAGE_MONTH = {
  장생: "새로 시작하기 좋은 달", 목욕: "기분 전환·꾸미기 좋은 달 (충동 조심)", 관대: "도전·발표·면접에 강한 달", 건록: "일이 착착 풀리는 달",
  제왕: "주도권을 잡는 달 (과욕 조심)", 쇠: "무리하지 말고 다듬는 달", 병: "컨디션을 챙길 달", 사: "조용히 깊게 파고들 달",
  묘: "모으고 정리할 달", 절: "끊고 바꾸기 좋은 달", 태: "계획을 세우기 좋은 달", 양: "도움을 받으며 준비할 달",
};

/* ① 십이운성 신년운세 ------------------------------------------------ */
export function renderLuck12({ navigate }) {
  const now = new Date(), Y0 = now.getFullYear();
  const Y = now.getMonth() >= 9 ? Y0 + 1 : Y0; // 처음 열 때 기본으로 함께 열리는 해
  return gated({ navigate, title: "십이운성 신년운세", h: "십이운성으로 읽는 한 해", desc: `해마다의 화두부터 열두 달 흐름까지 — 내 일간이 해마다·달마다 어떤 단계에 서는지로 읽어요. 처음 열면 ${Y}년이 함께 열리고, 다른 해는 코인 ${costOf("luck12")}개로 한 해씩 더 볼 수 있어요.`, costKey: "luck12",
    build(host, { P, my, sig }) {
      const ds = P.pillars.day.stemIdx, birthY = Number(String(my.birthDate).slice(0, 4));
      const cost = costOf("luck12");
      const idOf = (y) => `luck12y:${y}:${sig}`;
      const opened = (y) => y === Y || isUnlocked(idOf(y));
      const years = []; for (let y = Math.max(birthY, Y0 - 5); y <= Y0 + 10; y++) years.push(y);
      let cur = Y;
      const body = el("div", {});
      const chips = el("div", { class: "r2-years", role: "tablist", "aria-label": "해 고르기", "data-noterm": "" });
      const paintChips = () => {
        clear(chips);
        years.forEach((y) => chips.append(el("button", { type: "button", role: "tab", class: "r2-year" + (y === cur ? " on" : "") + (opened(y) ? "" : " locked"), "aria-selected": String(y === cur), onclick: () => { cur = y; paintChips(); paint(); } }, [
          el("b", { text: `${y}` }), el("small", { text: opened(y) ? `${STEM_KR[mod(y - 4, 10)]}${BRANCH_KR[mod(y - 4, 12)]}년` : `🔒 ${cost}코인` }),
        ])));
        setTimeout(() => { const on = chips.querySelector(".on"); if (on && chips.scrollWidth > chips.clientWidth) chips.scrollLeft = on.offsetLeft - chips.clientWidth / 2 + on.clientWidth / 2; }, 30);
      };
      const paint = () => {
        clear(body);
        if (!opened(cur)) {
          const coins = getCoins();
          body.append(el("section", { class: "panel r2-card premium-lock" }, [
            el("span", { class: "lock-badge" }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: `코인 ${cost}개` })]),
            el("h3", { class: "serif r2-h", text: `${cur}년 십이운성 신년운세 열기` }),
            p(`${cur}년(${STEM_KR[mod(cur - 4, 10)]}${BRANCH_KR[mod(cur - 4, 12)]}년)의 화두와 열두 달 흐름을 열어요. 한 번 열면 이 사람의 ${cur}년은 계속 볼 수 있어요.`),
            el("button", { type: "button", class: "btn btn-primary btn-block", onclick: () => {
              const r = unlock(idOf(cur), cost);
              if (r.ok) { toast(`${cur}년 십이운성 신년운세를 열었어요 · 코인 ${cost} 차감`); paintChips(); paint(); } else { noCoinToast(cost); if (navigate) navigate("/store"); }
            } }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: coins >= cost ? `코인 ${cost}개로 ${cur}년 열기 · 보유 ${coins}개` : "코인 받으러 가기" })]),
          ]));
          return;
        }
        yearView(body, ds, cur, Y0);
      };
      paintChips(); paint();
      host.append(el("section", { class: "panel r2-card" }, [el("p", { class: "eyebrow", text: "해 고르기" }), chips, p(`${Y}년은 기본으로 열려 있어요. 지난 해를 돌아보거나 앞으로의 해를 미리 볼 수 있어요.`, "tiny muted")]), body, disclaimer());
    } });
}
function yearView(host, ds, Y, Y0) {
  const g = yearGZ(Y), st = stageOf(ds, g.b), [title, line] = STAGE_YEAR[st];
  const yGod = tenGod(ds, g.s), info = STAGE_INFO[st];
  const when = Y === Y0 ? "올해" : Y < Y0 ? "그해" : "그해";
  host.append(card(`${Y}년 · ${gzKr(g.s, g.b)}`, `${when}의 화두: ${title}`, [
    el("div", { class: "r2-hero" }, [el("b", { text: st }), el("span", { text: `${info.h} · ${info.key}` })]),
    p(line),
    p(`한 해의 천간은 나에게 ${yGod} — ${{ 비겁: "나와 같은 기운이 들어와 경쟁과 독립의 해", 식상: "재능과 표현이 터져 나오는 해", 재성: "돈과 현실 감각이 중요한 해", 관성: "책임과 자리가 주어지는 해", 인성: "배움과 도움이 들어오는 해" }[GROUP[yGod]]}예요.`),
    Y < Y0 ? p("지나간 해예요 — 그때 있었던 일과 맞춰 보면 내 사주의 흐름을 더 잘 알 수 있어요.", "tiny muted") : null,
  ].filter(Boolean)));
  const months = [];
  for (let M = 1; M <= 12; M++) {
    const order = mod(M - 2, 12), ys = mod((M === 1 ? Y - 1 : Y) - 4, 10);
    const s = mod(ys * 2 + 2 + order, 10), b = mod(order + 2, 12), mst = stageOf(ds, b);
    months.push({ M, s, b, st: mst, god: tenGod(ds, s), pw: POWER[mst] });
  }
  const best = [...months].sort((a, b) => b.pw - a.pw).slice(0, 3).map((m) => m.M);
  const low = [...months].sort((a, b) => a.pw - b.pw).slice(0, 2).map((m) => m.M);
  host.append(card(`${Y}년 열두 달의 흐름`, "달마다 서는 자리", [
    el("div", { class: "r2-months", "data-nokr": "" }, months.map((m) => el("div", { class: "r2-m" + (best.includes(m.M) ? " best" : "") + (low.includes(m.M) ? " low" : "") }, [
      el("b", { text: `${m.M}월` }), el("span", { class: "r2-m-gz", text: `${STEM_KR[m.s]}${BRANCH_KR[m.b]}` }),
      el("span", { class: "r2-m-st", "data-term": m.st, text: m.st }), el("span", { class: "r2-m-bar" }, [el("i", { style: `width:${m.pw * 20}%` })]),
      el("small", { text: STAGE_MONTH[m.st] }),
    ]))),
    p(`힘이 실리는 달: ${best.sort((a, b) => a - b).map((m) => `${m}월`).join(" · ")} — 중요한 시작·시험·계약은 이때로. 쉬어 갈 달: ${low.sort((a, b) => a - b).map((m) => `${m}월`).join(" · ")} — 무리한 일정은 피하고 몸을 챙기세요.`, "r2-strong"),
    p("달은 1일이 아니라 절기(입춘·경칩…)로 바뀌어요. 각 달의 초순은 앞달 기운이 조금 남아 있어요.", "tiny muted"),
  ]));
}

/* ② 연애운 10년 연대기 ----------------------------------------------- */
export function renderLove10({ navigate }) {
  return gated({ navigate, title: "연애운 10년 연대기", h: "앞으로 10년, 나의 연애는 어떻게 흐를까?", desc: "해마다 들어오는 이성의 별·도화·배우자 자리의 합충으로 10년 연애 지도를 그려요.", costKey: "love10",
    build(host, { P, my }) {
      const ds = P.pillars.day.stemIdx, db = P.pillars.day.branchIdx, yb = P.pillars.year.branchIdx;
      const male = my.gender === "male", Y0 = new Date().getFullYear();
      const lover = male ? "재성" : "관성";
      const DOHWA = { 8: 9, 0: 9, 4: 9, 2: 3, 6: 3, 10: 3, 11: 0, 3: 0, 7: 0, 5: 6, 9: 6, 1: 6 };
      const YUK = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
      const rows = [];
      for (let k = 0; k < 10; k++) {
        const Y = Y0 + k, g = yearGZ(Y), sg = tenGod(ds, g.s), bg = tenGod(ds, [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8][g.b] ?? g.s);
        let sc = 45; const why = [];
        if (GROUP[sg] === lover) { sc += 18; why.push(`이성의 별(${sg})이 들어와요`); }
        if (GROUP[bg] === lover) { sc += 10; why.push(`땅에도 이성의 기운(${bg})`); }
        if (DOHWA[yb] === g.b || DOHWA[db] === g.b) { sc += 14; why.push("도화(매력)가 켜지는 해"); }
        if (YUK.some(([a, b]) => (a === db && b === g.b) || (b === db && a === g.b))) { sc += 12; why.push("배우자 자리(일지)와 합 — 인연이 묶여요"); }
        if (Math.abs(g.b - db) === 6) { sc -= 8; why.push("배우자 자리와 충 — 관계에 변화"); }
        if (GROUP[sg] === "비겁") { sc -= 6; why.push("경쟁자 기운 — 삼각관계 조심"); }
        sc = Math.max(15, Math.min(98, sc + (POWER[stageOf(ds, g.b)] - 3) * 2));
        const label = sc >= 80 ? "연애 꽃피는 해" : sc >= 66 ? "설레는 인연의 해" : sc >= 50 ? "잔잔하게 이어지는 해" : sc >= 38 ? "나를 돌보는 해" : "관계를 다시 보는 해";
        rows.push({ Y, age: Y - Number(String(my.birthDate).slice(0, 4)) + 1, g, sc, label, why: why.length ? why : ["큰 변수 없이 지금 관계·생활이 이어져요"] });
      }
      const peak = [...rows].sort((a, b) => b.sc - a.sc).slice(0, 3).sort((a, b) => a.Y - b.Y);
      host.append(card("10년 연애 지도", `가장 빛나는 해: ${peak.map((r) => `${r.Y}`).join(" · ")}`, [
        el("div", { class: "r2-chart" }, rows.map((r) => el("div", { class: "r2-col" + (peak.includes(r) ? " peak" : "") }, [
          el("span", { class: "r2-col-sc", text: String(r.sc) }), el("span", { class: "r2-col-bar" }, [el("i", { style: `height:${r.sc}%` })]), el("b", { text: `${String(r.Y).slice(2)}년` }),
        ]))),
        p(`${male ? "남성에겐 재성(財星)" : "여성에겐 관성(官星)"}이 이성의 별이에요. 이 별이 들어오는 해, 도화가 켜지는 해, 배우자 자리(일지)와 합하는 해에 연애운이 올라가요.`, "tiny muted"),
      ]));
      host.append(card("해마다 한 줄", "연대기", [el("div", { class: "r2-list" }, rows.map((r) => el("article", { class: "r2-row" + (peak.includes(r) ? " peak" : "") }, [
        el("div", { class: "r2-row-h" }, [el("b", { text: `${r.Y}년 · ${r.age}세` }), el("span", { text: `${STEM_KR[r.g.s]}${BRANCH_KR[r.g.b]}년` }), el("em", { text: r.label })]),
        el("p", { text: r.why.join(" · ") }),
      ])))]));
      host.append(disclaimer());
    } });
}

/* ③ 5년 인생 설계 ---------------------------------------------------- */
const PLAN = {
  비겁: { area: "나 · 독립", goal: "내 이름으로 서는 해", acts: ["혼자 해낼 수 있는 프로젝트 하나 끝내기", "운동·루틴으로 체력 기르기", "동료와 경쟁보다 협업 구조 만들기"], care: "고집·지출 과다" },
  식상: { area: "재능 · 표현", goal: "보여 주고 만드는 해", acts: ["포트폴리오·SNS로 결과물 공개하기", "새 기술 하나를 실전으로 익히기", "아이디어를 작게라도 출시해 보기"], care: "말실수·과로" },
  재성: { area: "돈 · 현실", goal: "수입 구조를 세우는 해", acts: ["고정 저축 비율 정하기", "부수입 통로 하나 열기", "가계부·자산표 만들기"], care: "무리한 투자" },
  관성: { area: "자리 · 책임", goal: "인정받고 자리를 잡는 해", acts: ["자격증·승진·취업처럼 공식 성과 노리기", "약속과 규칙을 지키는 신뢰 쌓기", "윗사람·멘토 만들기"], care: "스트레스·과한 책임" },
  인성: { area: "배움 · 문서", goal: "배우고 채우는 해", acts: ["공부·학위·자격 과정 시작하기", "계약·문서·집 문제 정리하기", "나를 도와줄 사람에게 먼저 묻기"], care: "생각만 하고 미루기" },
};
export function renderBlueprint({ navigate }) {
  return gated({ navigate, title: "5년 인생 설계", h: "The Blueprint — 앞으로 5년 설계도", desc: "해마다 들어오는 기운(십성)과 대운을 바탕으로, 해마다 집중할 분야·목표·실천 3가지를 짜 드려요.", costKey: "blueprint",
    build(host, { P }) {
      const W = buildWonguk(P), ds = P.pillars.day.stemIdx, Y0 = new Date().getFullYear();
      const D = W.daeun[W.daeunNow];
      host.append(card("지금 내가 서 있는 곳", D ? `${D.stemKr}${D.branchKr} 대운 (${D.startYear}~${D.startYear + 9})` : "대운", [
        p(D ? `지금 10년의 큰 흐름은 천간 ${D.stemGod}, 지지 ${ida(D.branchGod)}. ${PLAN[GROUP[D.stemGod]].area} 쪽 무대가 넓게 깔린 10년이에요.` : ""),
        p(`내 사주의 중심(격국)은 ${W.gyeok ? W.gyeok.list[0].name : "-"}, 힘의 균형은 ${W.score.lean}, 용신은 ${W.yonghui[0].kr}이에요. 용신 기운이 들어오는 해에 큰 걸음을 떼면 좋아요.`),
      ]));
      const years = [0, 1, 2, 3, 4].map((k) => { const Y = Y0 + k, g = yearGZ(Y), god = tenGod(ds, g.s), st = stageOf(ds, g.b); return { Y, g, god, grp: GROUP[god], st, P: PLAN[GROUP[god]] }; });
      host.append(card("5년 로드맵", "해마다 하나의 주제", [el("div", { class: "r2-road" }, years.map((y, i) => el("article", { class: "r2-step" }, [
        el("div", { class: "r2-step-n", text: String(i + 1) }),
        el("div", { class: "r2-step-b" }, [
          el("div", { class: "r2-row-h" }, [el("b", { text: `${y.Y}년 · ${y.P.area}` }), el("span", { text: `${STEM_KR[y.g.s]}${BRANCH_KR[y.g.b]} · ${y.god} · ${y.st}` })]),
          el("p", { class: "r2-goal", text: `목표: ${y.P.goal}` }),
          el("ul", { class: "r2-acts" }, y.P.acts.map((a) => el("li", { text: a }))),
          el("p", { class: "tiny muted", text: `조심: ${y.P.care} · 이 해의 단계 ${y.st} — ${STAGE_YEAR[y.st][0]}` }),
        ]),
      ])))]));
      host.append(card("코칭 한마디", "5년을 관통하는 원칙", [
        p(`① 힘 쓰기: ${W.score.pct >= 50 ? "에너지가 넉넉한 편이라 벌이고 나누는 쪽(재성·관성·식상)으로 힘을 쓸수록 커요." : "에너지를 아껴 쓰는 편이라 도와줄 사람·배움(인성·비겁)을 먼저 곁에 두면 멀리 가요."}`),
        p(`② 무기: ${W.gyeok ? W.gyeok.list[0].key : ""} — ${W.gyeok ? W.gyeok.list[0].good : ""}`),
        p(`③ 피할 것: ${W.gyeok ? W.gyeok.list[0].bad : ""}`),
      ]));
      host.append(disclaimer());
    } });
}

/* ④ 나의 배우자복 ---------------------------------------------------- */
export function renderSpouseLuck({ navigate }) {
  return gated({ navigate, title: "나의 배우자복", h: "혹시… 나, 배우자복 없는 사주일까?", desc: "배우자 자리(일지)·배우자 별·합충·귀인으로 배우자복을 짚어 봐요.", costKey: "spouseluck",
    build(host, { P, my }) {
      const W = buildWonguk(P), day = W.pillars[1], male = my.gender === "male";
      const star = male ? ["정재", "편재"] : ["정관", "편관"];
      const pts = []; let sc = 55;
      const add = (d, t) => { sc += d; pts.push([d, t]); };
      const dGod = day.branchGod;
      if (star.includes(dGod)) add(14, `배우자 자리에 배우자 별(${dGod})이 앉아 있어요 — 인연이 분명해요.`);
      else if (["정인", "편인"].includes(dGod)) add(8, `배우자 자리에 인성(${dGod}) — 나를 챙기고 보살펴 주는 배우자.`);
      else if (["식신", "상관"].includes(dGod)) add(4, `배우자 자리에 식상(${dGod}) — 함께 즐겁고 대화가 많은 관계.`);
      else add(-2, `배우자 자리에 비겁(${dGod}) — 친구 같은 배우자, 서로의 독립이 중요해요.`);
      const pw = POWER[day.stageIlgan] || 3; add((pw - 3) * 4, `배우자 자리의 십이운성 ${day.stageIlgan} — ${STAGE_INFO[day.stageIlgan].key}.`);
      const cnt = W.pillars.filter((x) => !x.empty).reduce((a, x) => a + (star.includes(x.stemGod) ? 1 : 0) + (star.includes(x.branchGod) ? 1 : 0), 0);
      if (cnt === 0) add(-6, "원국에 배우자 별이 드러나 있지 않아요 — 운에서 들어올 때 인연이 와요.");
      else if (cnt <= 2) add(8, `배우자 별이 ${cnt}개, 알맞게 있어요.`);
      else add(-4, `배우자 별이 ${cnt}개로 많아요 — 인연이 많은 만큼 고르는 눈이 중요해요.`);
      day.rels.filter((r) => r.kind === "b").forEach((r) => { if (r.tone === "good") add(6, `일지가 ${r.with.join("·")}주와 ${r.type} — 배우자와 묶이는 힘.`); else if (["충", "형"].includes(r.type)) add(-6, `일지가 ${r.with.join("·")}주와 ${r.type} — 함께 바꿔 가야 할 부분.`); });
      if (W.spirits.some((x) => x.name === "금여")) add(8, "금여(金輿) — 배우자 복·재물 복의 길신이 있어요.");
      if (day.gongmang) add(-6, "배우자 자리가 공망 — 기대를 내려놓을수록 편안해요.");
      sc = Math.max(20, Math.min(96, sc));
      const lv = sc >= 80 ? "배우자복이 큰 사주" : sc >= 65 ? "배우자복이 좋은 편" : sc >= 50 ? "함께 만들어 가는 복" : "스스로 채워 가는 복";
      host.append(card("배우자복 지수", lv, [
        el("div", { class: "r2-hero" }, [el("b", { text: `${sc}점` }), el("span", { text: `배우자 자리 ${day.branchKr}(${day.branchH}) · ${dGod}` })]),
        el("ul", { class: "r2-pts" }, pts.map(([d, t]) => el("li", { class: d >= 0 ? "up" : "down" }, [el("b", { text: d >= 0 ? `+${d}` : String(d) }), el("span", { text: t })]))),
      ]));
      const mate = { 정재: "성실하고 알뜰한, 생활을 함께 꾸리는 사람", 편재: "활동적이고 사교적인, 세상을 넓혀 주는 사람", 정관: "반듯하고 책임감 있는, 기댈 수 있는 사람", 편관: "카리스마 있고 추진력 있는, 나를 단련시키는 사람" };
      host.append(card("어떤 배우자와 인연일까", "배우자 별로 본 모습", [
        ...star.map((s) => p(`${s}: ${mate[s]}`)),
        p(`배우자 자리의 기운은 ${ELEM_KR[day.branchElem]} — 이 기운의 분위기를 가진 사람과 편안해요.`),
      ]));
      host.append(disclaimer());
    } });
}

/* ⑤ 사주 스토리 리딩 (음성 해설) --------------------------------------- */
const DAY_NATURE = [
  "큰 나무 갑목(甲木)은 곧게 위로 자라는 리더예요. 정직하고 추진력이 있어 한번 정한 길을 밀고 나가요.",
  "풀과 꽃 을목(乙木)은 부드럽게 휘어도 꺾이지 않는 사람이에요. 적응력과 생활력이 뛰어나요.",
  "태양 병화(丙火)는 모두를 비추는 밝은 사람이에요. 솔직하고 열정적이며 사람을 모으는 힘이 있어요.",
  "촛불 정화(丁火)는 가까이서 따뜻하게 비추는 사람이에요. 섬세하고 집중력이 좋아요.",
  "큰 산 무토(戊土)는 든든하게 버티는 사람이에요. 믿음직하고 포용력이 커요.",
  "기름진 밭 기토(己土)는 무엇이든 길러 내는 사람이에요. 실속 있고 사람을 잘 챙겨요.",
  "단단한 쇠 경금(庚金)은 결단력 있는 개척자예요. 의리 있고 승부욕이 강해요.",
  "보석 신금(辛金)은 섬세하게 빛나는 사람이에요. 감각이 예민하고 완성도를 중요하게 여겨요.",
  "큰 바다 임수(壬水)는 넓고 깊은 사람이에요. 생각의 스케일이 크고 자유로워요.",
  "이슬과 비 계수(癸水)는 조용히 스며드는 사람이에요. 지혜롭고 직관이 좋아요.",
];
const SEASON = { 2: "이른 봄", 3: "봄", 4: "늦봄", 5: "초여름", 6: "한여름", 7: "늦여름", 8: "초가을", 9: "가을", 10: "늦가을", 11: "초겨울", 0: "한겨울", 1: "늦겨울" };
export function renderStory({ navigate }) {
  return gated({ navigate, title: "사주 스토리 리딩", h: "내 사주를 한 편의 이야기로", desc: "여덟 글자를 이야기로 풀고, 소리 내어 읽어 드려요. 처음 사주를 보는 사람도 쉽게 들을 수 있어요.", costKey: "story",
    build(host, { P, my }) {
      const W = buildWonguk(P), ds = P.pillars.day.stemIdx, mb = P.pillars.month.branchIdx, name = my.name || "당신";
      const D = W.daeun[W.daeunNow], se = W.seun.find((x) => x.isNow), G = W.gyeok && W.gyeok.list[0];
      const goodRel = W.relations.find((r) => r.tone === "good"), warnRel = W.relations.find((r) => r.tone === "warn");
      const chapters = [
        ["1장 · 나라는 사람", `${name} 님의 사주에서 ‘나’를 뜻하는 글자는 ${STEM_KR[ds]}(${STEM_H[ds]})이에요. ${DAY_NATURE[ds]}`],
        ["2장 · 태어난 계절", `${name} 님은 ${SEASON[mb]}, ${BRANCH_KR[mb]}월에 태어났어요. 이 계절의 기운이 나를 ${W.strength.deukryeong ? "든든하게 받쳐 줘요" : "조금 시험해요. 그래서 도움을 잘 받아들이는 지혜가 필요해요"}. 사주 전체의 힘은 ${W.score.total}점, ${ida(W.score.lean)}.`],
        ["3장 · 삶의 중심", G ? `사주의 중심, 격국은 ${ida(G.name)}. 한마디로 ‘${G.key}’. ${G.good}.` : "사주의 중심을 정하는 월주가 비어 있어요."],
        ["4장 · 나를 살리는 기운", `가장 필요한 기운, 용신은 ${W.yonghui[0].kr}이에요. ${W.yonghui[0].desc}. 반대로 ${W.yonghui[2].kr} 기운이 지나치면 힘이 빠지니 조심해요.`],
        ["5장 · 글자들의 인연", `${goodRel ? `${goodRel.name}의 인연이 있어 ${goodRel.keyword}의 힘을 써요. ` : ""}${warnRel ? `${warnRel.name}도 함께 있어서 ${warnRel.keyword} — 이건 나쁜 게 아니라 다듬어 가는 과정이에요.` : "크게 부딪히는 글자가 없어 차분한 구조예요."}`],
        ["6장 · 지금의 계절", `${D ? `지금은 ${D.stemKr}${D.branchKr} 대운, 천간 ${D.stemGod}·지지 ${D.branchGod}의 10년을 지나고 있어요. ` : ""}${se ? `올해 ${se.year}년은 ${se.stemKr}${se.branchKr}년, ${se.stemGod}의 해예요. 십이운성으로는 ${se.stage} — ${STAGE_INFO[se.stage].key}의 단계예요.` : ""} 흐름을 알고 준비하면, 같은 운도 훨씬 잘 쓸 수 있어요.`],
      ];
      const list = el("div", { class: "r2-story" }, chapters.map(([h, t], i) => el("article", { class: "r2-ch", "data-i": String(i) }, [el("h4", { class: "serif", text: h }), el("p", { text: t })])));
      const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;
      let playing = false;
      const btn = el("button", { type: "button", class: "btn btn-primary btn-block", onclick: () => {
        if (!canSpeak) { toast("이 기기에선 음성 읽기를 지원하지 않아요."); return; }
        if (playing) { speechSynthesis.cancel(); playing = false; btn.lastChild.textContent = "▶ 음성 해설 듣기"; list.querySelectorAll(".r2-ch").forEach((c) => c.classList.remove("on")); return; }
        speechSynthesis.cancel(); playing = true; btn.lastChild.textContent = "■ 멈추기";
        const voices = speechSynthesis.getVoices(), ko = voices.find((v) => /ko/i.test(v.lang));
        chapters.forEach(([h, t], i) => {
          const u = new SpeechSynthesisUtterance(`${h.replace("·", ",")}. ${t.replace(/\([^)]*\)/g, "")}`);
          u.lang = "ko-KR"; u.rate = 0.98; if (ko) u.voice = ko;
          u.onstart = () => list.querySelectorAll(".r2-ch").forEach((c) => { c.classList.toggle("on", c.dataset.i === String(i)); if (c.dataset.i === String(i)) c.scrollIntoView({ behavior: "smooth", block: "center" }); });
          if (i === chapters.length - 1) u.onend = () => { playing = false; btn.lastChild.textContent = "▶ 음성 해설 듣기"; };
          speechSynthesis.speak(u);
        });
      } }, [el("span", { text: "🎧" }), el("span", { text: "▶ 음성 해설 듣기" })]);
      host.append(card("사주 스토리 리딩", `${name} 님의 이야기`, [btn, list, p("음성은 이 기기의 읽기 기능으로 재생돼요. 소리가 안 나면 무음 모드를 확인해 주세요.", "tiny muted")]));
      host.append(disclaimer());
      window.addEventListener("hashchange", () => { try { speechSynthesis.cancel(); } catch { /* ignore */ } }, { once: true });
    } });
}

/* ===================================================================
   (합침) ziweiResult.js — 파일 수를 줄이려고 이 파일 안으로 옮김 (HAE)
   =================================================================== */
import { copyText, icon } from "../utils/dom.js";
import { unstash, stash, saveResult, makeId } from "../state.js";
import { personPicker } from "./people.js";
import { computeZiwei, STAR_MEANING, PALACE_MEANING, BUREAU_DESC } from "../saju/ziwei.js";
import { analyzeZiweiDeep, STAR_DEEP, AUX_DEEP } from "../saju/ziweiAnalysis.js";
import { backLink, loadDisclaimer } from "./shared.js";
import { renderShareCard, downloadBlob, shareImage, maskedProfileLabel } from "../utils/shareImage.js";
import { chartItemId } from "../wallet.js";
const MAIN_STARS = new Set(["자미", "천기", "태양", "무곡", "천동", "염정", "천부", "태음", "탐랑", "거문", "천상", "천량", "칠살", "파군"]);
const SIHUA_TIP = {
  록: "화록 — 재물·인연·복이 붙는 자리",
  권: "화권 — 권력·추진력·성취가 강해지는 자리",
  과: "화과 — 명예·시험·평판이 오르는 자리",
  기: "화기 — 집착·과제·장애가 생겨 균형이 필요한 자리",
};
// 별 이름 → 마우스오버 한 줄 뜻 (주성은 태그+성향, 보조성은 AUX_DEEP)
function starTip(name) {
  const m = STAR_MEANING[name];
  if (m) return `${m.tag} — ${m.persona}`;
  return AUX_DEEP[name] || name;
}
// 지지 index → 명반 그리드 [row, col]
const BRANCH_POS = { 5: [1, 1], 6: [1, 2], 7: [1, 3], 8: [1, 4], 9: [2, 4], 10: [3, 4], 11: [4, 4], 0: [4, 3], 1: [4, 2], 2: [4, 1], 3: [3, 1], 4: [2, 1] };
const BRANCH_IDX = { 자: 0, 축: 1, 인: 2, 묘: 3, 진: 4, 사: 5, 오: 6, 미: 7, 신: 8, 유: 9, 술: 10, 해: 11 };

export function renderZiweiResult({ navigate }) {
  const input = unstash("ziwei:input") || unstash("saju:input");
  if (!input) { navigate("/ziwei"); return el("div"); }
  const z = computeZiwei(input);
  return buildZiweiNode({ z, input }, { navigate, saved: false });
}

export function buildZiweiNode(data, { navigate, saved = false, savedId = null } = {}) {
  loadDisclaimer();
  const { z, input } = data;
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [
    backLink(navigate, saved ? "/saved" : "/", saved ? "보관함" : "홈"),
  ]));
  if (navigate) root.append(personPicker({ title: "누구의 자미두수를 볼까?", current: input, navigate,
    onPick: (inp) => { stash("ziwei:input", inp); navigate("/ziwei/result"); } }));

  // 헤더
  root.append(el("section", { class: "wrap" }, [
    el("div", { class: "panel report-head" }, [
      el("span", { class: "eyebrow", text: "자미두수 명반" }),
      el("h1", { class: "serif", style: "margin-top:6px;", text: (input.name ? input.name + "님의 " : "") + "명반(命盤)" }),
      el("div", { class: "report-meta" }, [
        meta("년간지", z.yearGZH),
        meta("명궁", z.mingBranch + "궁"),
        meta("신궁", z.shenBranch + "궁"),
        meta("오행국", z.bureauName),
      ]),
    ]),
  ]));

  if (z.timeUnknown) {
    root.append(el("section", { class: "wrap", style: "margin-top: var(--sp-4);" }, [
      noticeBox("warn", "출생 시간을 몰라 午시(정오)로 가정했습니다. 자미두수는 시(時)로 명궁·신궁·문창·문곡이 정해지므로, 시간을 모르면 명반이 크게 달라질 수 있습니다. 참고로만 봐 주세요.", "clock"),
    ]));
  }

  // 명반 차트
  root.append(el("section", { class: "wrap", style: "margin-top: var(--sp-4);" }, [chart(z)]));

  // 명궁 해석 (요약)
  root.append(el("section", { class: "wrap", style: "margin-top: var(--sp-5);" }, [mingReading(z)]));

  // 전문 심화 해석 (8단계) — 코인 언락
  const deepHost = el("section", { class: "wrap", style: "margin-top: var(--sp-4);" });
  const deepId = chartItemId("ziwei-deep", input);
  const paintDeep = () => { clear(deepHost); deepHost.append(deepSection(z, { itemId: deepId, navigate, repaint: paintDeep })); };
  paintDeep();
  root.append(deepHost);

  // 12궁 요약
  root.append(el("section", { class: "wrap", style: "margin-top: var(--sp-4);" }, [palaceList(z)]));

  root.append(el("section", { class: "wrap", style: "margin-top: var(--sp-5);" }, [
    noticeBox("info", "자미두수 명반은 표준 안성법으로 계산했습니다. 해석은 명궁 주성 중심의 성향 참고 자료이며, 미래를 확정하지 않습니다. 중요한 결정은 실제 정보와 함께 검토하세요."),
  ]));

  root.classList.add("has-action-bar");
  root.append(buildBar({ z, input, navigate, saved, savedId }));
  return root;
}

/* ---- 명반 차트 ---- */
function chart(z) {
  const grid = el("div", { class: "ziwei-chart", role: "table", "aria-label": "자미두수 명반" });
  z.palaces.forEach((p) => {
    const [r, c] = BRANCH_POS[BRANCH_IDX[p.branch]];
    const cell = el("div", {
      class: "zw-cell" + (p.isMing ? " zw-ming" : ""),
      style: `grid-row:${r}; grid-column:${c};`, role: "cell",
      "aria-label": `${p.name} ${p.branch}궁 ${p.stars.map((s) => s.name).join(" ") || "공궁"}`,
    }, [
      el("div", { class: "zw-stars" }, p.stars.length
        ? p.stars.map((s) => el("span", {
            class: "zw-star zw-tip" + (MAIN_STARS.has(s.name) ? " zw-main" : " zw-aux") + (s.sihua ? " zw-hua" : ""),
            title: starTip(s.name) + (s.sihua ? ` · ${s.sihua} — ${SIHUA_TIP[s.sihua[1]] || ""}` : ""), tabindex: "0",
          }, [el("span", { text: s.name }), s.sihua ? el("sup", { class: "zw-hua-badge", text: s.sihua[1] }) : null].filter(Boolean)))
        : [el("span", { class: "zw-empty", text: "공궁" })]),
      el("div", { class: "zw-foot" }, [
        el("span", { class: "zw-name zw-tip", title: PALACE_MEANING[p.name] || p.name, tabindex: "0", text: p.name }),
        el("span", { class: "zw-branch", text: p.branchH }),
      ]),
      (p.isMing || p.isShen) ? el("span", { class: "zw-mark", text: p.isMing ? "命" : "身" }) : null,
    ].filter(Boolean));
    grid.append(cell);
  });
  // 중앙 정보
  grid.append(el("div", { class: "zw-center", style: "grid-row:2/4; grid-column:2/4;" }, [
    el("span", { class: "eyebrow", text: "命盤" }),
    el("p", { class: "zwc-line", html: `<b>${z.yearGZH}</b>년생` }),
    el("p", { class: "zwc-line", text: `${z.bureauName}` }),
    el("p", { class: "zwc-line muted tiny", text: `명궁 ${z.mingBranch} · 신궁 ${z.shenBranch}` }),
    el("p", { class: "zwc-line muted tiny", text: `음력 ${z.lunar.year}.${z.lunar.month}.${z.lunar.day}${z.lunar.isLeap ? "(윤)" : ""}` }),
  ]));
  return el("div", { class: "panel", style: "padding: var(--sp-3);" }, [grid]);
}

/* ---- 명궁 해석 ---- */
function mingReading(z) {
  const stars = z.mingStars.filter((s) => MAIN_STARS.has(s));
  const empty = stars.length === 0;
  const useStars = empty ? z.oppStars.filter((s) => MAIN_STARS.has(s)) : stars;

  const cards = useStars.map((name) => {
    const m = STAR_MEANING[name];
    if (!m) return null;
    return el("div", { class: "panel section-gap star-card" }, [
      el("div", { style: "display:flex; align-items:baseline; gap:8px; flex-wrap:wrap;" }, [
        el("h3", { text: name }), el("span", { class: "tiny gold", text: m.tag }),
      ]),
      block("summary", "성향", "compass", m.persona),
      block("good", "강점", "check", m.strength),
      block("warn", "과할 때·그림자", "alert", m.shadow),
      block("action", "현실적인 조언", "lightbulb", m.advice),
    ]);
  }).filter(Boolean);

  return el("div", {}, [
    el("h2", { class: "serif", style: "margin-bottom: var(--sp-3);", text: `명궁 해석 — ${z.mingBranch}궁` }),
    empty ? noticeBox("info", "명궁에 주성이 없는 ‘공궁(空宮)’입니다. 이 경우 맞은편 천이궁의 별(대궁 차성)을 빌려 성향을 봅니다. 공궁은 그만큼 환경·관계의 영향을 크게 받는다는 뜻이기도 합니다.") : null,
    el("p", { class: "muted", style: "margin-bottom: var(--sp-3);", text: BUREAU_DESC[z.bureau] }),
    ...cards,
  ].filter(Boolean));
}

function starList(p) {
  if (!p) return "공궁";
  const m = p.stars.filter((s) => MAIN_STARS.has(s.name)).map((s) => s.name);
  return m.length ? m.join("·") : "공궁";
}

/* ---- 전문 심화 해석 (8단계 + 최종 요약) ---- */
function deepSection(z, ctx = {}) {
  const a = analyzeZiweiDeep(z);
  const stepH = (n, title) => el("h4", { class: "flow-h step-h" }, [el("span", { class: "step-n", text: n }), el("span", { text: title })]);
  const jobChips = (list) => el("div", { class: "job-chips" }, list.map((j) => el("span", { class: "job-chip", text: j })));
  const abcd = (icon2, label, text) => el("div", { class: "abcd" }, [el("span", { class: "abcd-l", text: label }), el("span", { class: "abcd-t", text })]);

  const body = el("div", { class: "rc-body section-gap" });

  // STEP 1 — 각 궁 주성 (명궁 중심, ①②③④)
  body.append(stepH("1", `주성 해석 — 명궁(${z.mingBranch}궁)${a.empty ? " · 공궁 → 대궁 차성" : ""}`));
  a.useMing.forEach((s) => {
    const d = STAR_DEEP[s.name];
    if (!d) return;
    body.append(el("div", { class: "panel deep-star" }, [
      el("div", { style: "display:flex; align-items:baseline; gap:8px; flex-wrap:wrap;" }, [
        el("h3", { text: s.name }), s.sihua ? el("span", { class: "tiny gold", text: s.sihua }) : null,
      ].filter(Boolean)),
      abcd("", "① 전통", d.trad),
      abcd("", "② 현대", d.modern),
      abcd("", "③ 사례", d.example),
      abcd("", "④ 주의", d.caution),
      jobChips(d.jobs),
    ]));
  });
  // 삼방 궁 주성 요약
  body.append(el("p", { class: "muted", style: "font-size:var(--fs-sm);" }, [
    el("b", { text: "삼방 요약 — " }),
    document.createTextNode(`재백궁 ${starList(a.wealth)} · 관록궁 ${starList(a.career)} · 부처궁 ${starList(a.spouse)}`),
  ]));

  // STEP 2 — 보조성
  const auxAll = [];
  [a.ming, a.wealth, a.career, a.travel].forEach((p) => (p ? p.stars : []).forEach((s) => {
    if (AUX_DEEP[s.name] && !auxAll.find((x) => x.name === s.name)) auxAll.push(s);
  }));
  body.append(stepH("2", "보조성의 영향"));
  body.append(auxAll.length
    ? el("ul", {}, auxAll.map((s) => el("li", {}, [el("b", { text: s.name + " — " }), document.createTextNode(AUX_DEEP[s.name])])))
    : el("p", { class: "muted", text: "명궁·삼방에 두드러진 보조성이 없습니다. 주성의 기운이 비교적 순수하게 드러납니다." }));

  // STEP 3 — 생년사화
  body.append(stepH("3", "생년사화(祿·權·科·忌)의 영향"));
  body.append(el("div", { class: "section-gap" }, a.sihuaHits.map((h) =>
    el("div", { class: "block tag-" + (h.label.includes("忌") ? "warn" : "good") }, [
      el("span", { class: "block-label" }, [el("span", { text: `${h.label} · ${h.star} (${h.palace})` })]),
      el("p", { text: h.effect }),
    ]))));

  // STEP 4 — 삼방사정
  body.append(stepH("4", "삼방사정(三方四正) 종합"));
  body.append(el("p", {}, [
    document.createTextNode(`명궁이 재백·관록·천이궁과 함께 이루는 핵심 축입니다. 이 네 궁의 주성 — `),
    el("b", { text: a.trineStars.join(", ") || "공궁 중심" }),
    document.createTextNode(` — 이 인생의 큰 흐름을 만듭니다. 명궁만이 아니라 이 세 궁을 함께 봐야 성패의 방향이 보입니다.`),
  ]));

  // STEP 5 — 대궁 충돌
  body.append(stepH("5", "대궁(천이궁) 충돌 여부"));
  body.append(el("p", {}, [
    document.createTextNode(`명궁의 대궁은 천이궁(${a.travel ? a.travel.branch : "-"}궁, ${a.daegung.stars.join("·") || "공궁"})입니다. `),
    document.createTextNode(
      a.daegung.hasKi ? "화기가 대궁에 있어 밖에서의 견제·환경 변화가 잦습니다. 안에서 중심을 잡는 게 중요합니다."
      : a.daegung.hasSha ? "살성이 대궁에 있어 경쟁·자극이 밖에서 들어옵니다. 부딪힘을 전문성으로 승화하면 좋습니다."
      : a.daegung.lucky.length ? `길성(${a.daegung.lucky.join("·")})이 대궁에 있어 밖에서 귀인·기회가 따릅니다.`
      : "큰 충 없이 무난합니다. 바깥 환경보다 스스로의 방향 설정이 관건입니다."),
  ]));

  // STEP 6 — 격국
  body.append(stepH("6", "격국(格局) 판단"));
  body.append(el("div", { class: "panel panel-gold section-gap" }, [
    el("h3", { class: "gold", text: a.gekguk.name }),
    abcd("", "① 전통", a.gekguk.trad),
    abcd("", "② 현대", a.gekguk.modern),
    abcd("", "④ 주의", a.gekguk.caution),
    jobChips(a.gekguk.jobs),
  ]));

  // STEP 7 — 좋은/나쁜 조합
  body.append(stepH("7", "좋은 조합 · 나쁜 조합"));
  body.append(el("div", { class: "grid-2" }, [
    el("div", { class: "block tag-good" }, [el("span", { class: "block-label" }, [el("span", { class: "ic" }, [icon("check")]), el("span", { text: "좋은 조합" })]), el("ul", {}, a.good.map((t) => el("li", { text: t })))]),
    el("div", { class: "block tag-warn" }, [el("span", { class: "block-label" }, [el("span", { class: "ic" }, [icon("alert")]), el("span", { text: "주의할 조합" })]), el("ul", {}, a.bad.map((t) => el("li", { text: t })))]),
  ]));

  // STEP 8 — 현대적 해석
  body.append(stepH("8", "현대적 해석 — 잘 맞는 길"));
  body.append(el("p", { class: "muted", text: "위 주성·격국을 현대 직업으로 연결하면, 특히 다음 영역에서 강점이 발휘되기 쉽습니다." }));
  body.append(jobChips(a.jobs));

  // 최종 요약
  body.append(el("hr", { class: "divider" }));
  body.append(el("h3", { class: "serif", text: "총평 요약" }));
  const S = a.summary;
  const dl = el("dl", { class: "summary-dl" });
  [["성격", S.성격], ["연애", S.연애], ["결혼", S.결혼], ["직업", S.직업], ["재물", S.재물], ["성공 가능성", S.성공], ["인생 조언", S.조언]]
    .forEach(([k, v]) => { dl.append(el("dt", { text: k }), el("dd", { text: v })); });
  body.append(dl);

  // 코인 게이팅 — 무료는 STEP 1 첫 주성까지 맛보기, 나머지는 코인으로 언락
  const unlocked = ctx.itemId ? isUnlocked(ctx.itemId) : true;
  if (!unlocked) {
    const kids = [...body.children];
    kids.slice(2).forEach((n) => n.remove());   // 헤더 + 첫 주성만 남김
    const last = body.querySelector(".deep-star");
    if (last) last.classList.add("locked-fade");
    body.append(coinLock(ctx));
  }

  const details = el("details", { class: "panel report-card", open: true, id: "sec-ziwei-deep" });
  details.append(
    el("summary", {}, [
      el("span", { class: "rc-index" }, [icon("compass")]),
      el("span", { class: "rc-title" }, [
        document.createTextNode("전문 심화 해석"),
        el("span", { class: "rc-sub", text: unlocked ? "8단계 · 삼방사정·격국·현대 직업·총평 요약" : `8단계 심화 · 코인 ${costOf("ziwei-deep")}개` }),
      ]),
      el("span", { class: "rc-chevron" }, [icon("chevronDown")]),
    ]),
    body
  );
  return details;
}

function coinLock(ctx) {
  const coins = getCoins();
  const cost = costOf("ziwei-deep");
  const box = el("div", { class: "panel premium-lock" }, [
    el("span", { class: "lock-badge" }, [icon("sparkle"), el("span", { text: `🪙 코인 ${cost}개` })]),
    el("h3", { style: "margin-top:8px;", text: "8단계 완전 심화 열기" }),
    el("p", { class: "muted", style: "font-size:var(--fs-sm);", text: "각 궁 주성의 전통·현대·사례·주의, 격국 판정, 삼방사정, 사화 효과, 총평 요약까지 전부 펼쳐 봐요. 한 번 열면 다시 볼 땐 무료예요." }),
  ]);
  if (coins >= cost) {
    const btn = el("button", { class: "btn btn-primary", style: "margin-top: var(--sp-4);" },
      [icon("sparkle"), el("span", { text: `코인 ${cost}개로 열기 (보유 ${coins}개)` })]);
    btn.addEventListener("click", () => {
      const r = unlock(ctx.itemId, cost);
      if (r.ok) { toast(r.reason === "spent" ? `코인 ${cost}개로 심화를 열었어요! 🪙` : "이미 열어 둔 해석이에요."); ctx.repaint && ctx.repaint(); }
      else { toast("코인이 부족해요. 충전소로 이동할게요."); ctx.navigate && ctx.navigate("/store"); }
    });
    box.append(btn);
  } else {
    box.append(el("p", { class: "muted tiny", style: "margin-top:6px;", text: "보유 코인이 없어요. 출석 체크로 무료 코인을 받거나 충전할 수 있어요." }));
    box.append(el("a", { href: "#/store", class: "btn btn-primary", style: "margin-top: var(--sp-3);" },
      [el("span", { class: "coin-emoji", text: "🪙" }), el("span", { text: "코인 받으러 가기" })]));
  }
  return box;
}

function palaceList(z) {
  return el("details", { class: "panel report-card" }, [
    el("summary", {}, [
      el("span", { class: "rc-index" }, [icon("saju")]),
      el("span", { class: "rc-title" }, [document.createTextNode("12궁 한눈에 보기"), el("span", { class: "rc-sub", text: "각 궁의 주성과 의미" })]),
      el("span", { class: "rc-chevron" }, [icon("chevronDown")]),
    ]),
    el("div", { class: "rc-body" }, z.palaces.slice().sort((a, b) => nameOrder(a.name) - nameOrder(b.name)).map((p) =>
      el("div", { class: "block", style: "border-top:1px solid var(--c-line); padding:10px 0;" }, [
        el("p", {}, [
          el("b", { text: p.name }),
          el("span", { class: "tiny muted", text: ` · ${p.branch}궁` }),
          p.isMing ? el("span", { class: "tiny gold", text: " ★명궁" }) : null,
          p.isShen ? el("span", { class: "tiny gold", text: " ☆신궁" }) : null,
        ].filter(Boolean)),
        el("p", { class: "tiny muted", text: PALACE_MEANING[p.name] || "" }),
        el("p", { style: "font-size:var(--fs-sm);", text: p.stars.map((s) => s.name + (s.sihua ? `(${s.sihua[1]})` : "")).join(" · ") || "공궁" }),
      ])
    )),
  ]);
}
const NAME_ORDER = ["명궁", "형제궁", "부처궁", "자녀궁", "재백궁", "질액궁", "천이궁", "노복궁", "관록궁", "전택궁", "복덕궁", "부모궁"];
const nameOrder = (n) => NAME_ORDER.indexOf(n);

function block(tag, label, ic, text) {
  return el("div", { class: `block tag-${tag}` }, [
    el("span", { class: "block-label" }, [el("span", { class: "ic" }, [icon(ic)]), el("span", { text: label })]),
    el("p", { text }),
  ]);
}
function meta(k, v) { return el("span", {}, [document.createTextNode(k + " "), el("b", { text: v })]); }

/* ---- 액션바 ---- */
function buildBar({ z, input, navigate, saved, savedId }) {
  const saveBtn = el("button", { class: "btn btn-primary", style: "flex:1;" },
    saved ? [icon("check"), el("span", { text: "저장됨" })] : [icon("bookmark"), el("span", { text: "결과 저장" })]);
  if (saved) saveBtn.disabled = true;
  saveBtn.addEventListener("click", () => {
    const id = savedId || makeId("ziwei");
    saveResult({ id, type: "ziwei", title: (input.name ? input.name + "님 · " : "") + "자미두수 명반", createdAt: Date.now(), z, input });
    toast("결과를 이 브라우저에 저장했어요.");
    saveBtn.disabled = true; clear(saveBtn); saveBtn.append(icon("check"), el("span", { text: "저장됨" }));
  });
  const shareBtn = el("button", { class: "btn btn-ghost" }, [icon("share"), el("span", { text: "공유" })]);
  shareBtn.addEventListener("click", () => shareZiwei(z, input));
  const copyBtn = el("button", { class: "btn btn-ghost", "aria-label": "결과 복사" }, [icon("copy")]);
  copyBtn.addEventListener("click", async () => {
    const ok = await copyText(ziweiText(z, input));
    toast(ok ? "결과를 복사했어요." : "복사에 실패했어요.");
  });
  return el("div", { class: "action-bar" }, [saveBtn, shareBtn, copyBtn]);
}

async function shareZiwei(z, input) {
  toast("공유 이미지를 만드는 중…", 1200);
  const stars = (z.mingStars.length ? z.mingStars : z.oppStars).filter((s) => MAIN_STARS.has(s));
  const blob = await renderShareCard({
    kind: "ziwei", eyebrow: "ZIWEI DOUSHU",
    title: (input.name ? input.name + "님의 " : "") + "자미두수 명반",
    summary: `명궁 ${z.mingBranch}궁 · ${z.bureauName}. 명궁 주성 ${stars.join(", ") || "공궁"}.`,
    tags: [z.bureauName.split("(")[0], ...stars.slice(0, 2)],
    profileLabel: maskedProfileLabel({ nickname: input.name, birthYear: (input.birthDate || "").slice(0, 4), timeUnknown: input.timeUnknown }),
  });
  const shared = await shareImage(blob, { title: "자미두수 명반", text: ziweiText(z, input) });
  if (!shared) { downloadBlob(blob, "ziwei.png"); toast("이미지를 저장했어요."); }
}

function ziweiText(z, input) {
  const stars = (z.mingStars.length ? z.mingStars : z.oppStars).filter((s) => MAIN_STARS.has(s));
  return `[자미두수 명반] ${input.name ? input.name + "님 · " : ""}${z.yearGZ}년생\n명궁 ${z.mingBranch}궁 · ${z.bureauName} · 명궁 주성 ${stars.join(", ") || "공궁"}\n사화: ${z.sihua.map((s) => s.label + " " + s.star).join(" / ")}\n\n※ 표준 안성법으로 계산한 참고 자료입니다. 미래를 확정하지 않습니다.`;
}
