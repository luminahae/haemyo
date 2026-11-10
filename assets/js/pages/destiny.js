import { el, clear, toast } from "../utils/dom.js";
import { pageHeader, backLink, noticeBox, loadDisclaimer } from "./shared.js";
import { getMyBirth } from "../state.js";
import { personSwitch } from "./people.js";
import { computeSaju } from "../saju/manse.js";
import { tenGod } from "../saju/fortune.js";
import { monthlyFlow } from "../saju/relationship.js";
import { isUnlocked, unlock, getCoins, costOf, noCoinToast } from "../wallet.js";
import { loadTarotData, getCard, cardFrontHTML } from "../tarot/cardArt.js";
/* =========================================================
   인연 D-day — 연애 시작·결혼까지 남은 날 (사주 / 타로) + 어디서 만날까
   전생 이야기 — 일주로 보는 전생 + 어울리는 직업
   작성: HAE · 재미·참고용
   ========================================================= */

const SPOUSE = { male: ["정재", "편재"], female: ["정관", "편관"] };
const CTRL = { wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" };
const CTRL_BY = { wood: "metal", fire: "water", earth: "wood", metal: "fire", water: "earth" };
const ELEM_KR = { wood: "목(木)", fire: "화(火)", earth: "토(土)", metal: "금(金)", water: "수(水)" };
const HAP6 = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
const isHap = (a, b) => HAP6.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
const DAY = 86400000;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysUntil = (d) => Math.max(0, Math.round((startOfDay(d) - startOfDay(new Date())) / DAY));
const fmt = (d) => `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/* 인연을 만나는 곳 — 배우자성의 오행 */
const MEET = {
  wood: { places: ["스터디·자격증·어학 모임", "운동·러닝·등산 동호회", "새로 시작한 수업·학원"], how: "같이 무언가를 배우다 자연스럽게 말을 트는", first: "키가 크거나 단정하고, 성장 욕심이 있는 사람" },
  fire: { places: ["공연·전시·페스티벌", "친구 생일·파티·뒤풀이", "SNS·DM·커뮤니티"], how: "분위기가 무르익은 자리에서 웃다가 번호를 주고받는", first: "표정이 밝고 말이 재밌는, 눈에 띄는 사람" },
  earth: { places: ["지인 소개·소개팅", "동네 단골 카페·식당", "오래 다닌 모임·교회·동창회"], how: "믿을 만한 사람을 통해 천천히 가까워지는", first: "편안하고 듬직한, 오래 봐도 질리지 않는 사람" },
  metal: { places: ["직장·회의·출장", "전문 분야 세미나·네트워킹", "일로 엮인 거래처·프로젝트"], how: "일 때문에 자주 마주치다 신뢰가 쌓이는", first: "깔끔하고 일 잘하는, 선이 분명한 사람" },
  water: { places: ["여행지·공항·기차", "온라인·앱·게임", "늦은 밤 긴 대화가 오가는 술자리"], how: "우연히 대화가 길어지며 마음이 통하는", first: "생각이 깊고 말이 잘 통하는, 신비로운 분위기의 사람" },
};

/* ---- 사주로 본 D-day ---- */
function sajuDday(profile, gender) {
  const g = gender === "male" ? "male" : "female";
  const sp = SPOUSE[g];
  const now = new Date();
  const flow = monthlyFlow(profile, g, now.getFullYear(), now.getMonth() + 1, 48);
  // 연애: 배우자성이 드는 첫 달 (이번 달이면 남은 날 중 15일, 지났으면 다음 기회)
  let love = null;
  for (const f of flow) {
    if (!sp.includes(f.god)) continue;
    let d = new Date(f.y, f.m - 1, f.y === now.getFullYear() && f.m === now.getMonth() + 1 ? Math.max(now.getDate() + 3, 6) : 6);
    if (d.getMonth() !== f.m - 1) continue;
    love = { date: d, gz: f.gz, god: f.god }; break;
  }
  if (!love) love = { date: new Date(now.getFullYear() + 1, 5, 6), gz: "", god: "" };
  // 결혼: 배우자성이 드는 해 + 일지와 합 → 점수 높은 첫 해, 그 해의 배우자성 달
  const dS = profile.pillars.day.stemIdx, dB = profile.pillars.day.branchIdx;
  const years = [];
  for (let y = now.getFullYear(); y <= now.getFullYear() + 15; y++) {
    const t = computeSaju({ calendarType: "solar", birthDate: `${y}-06-15`, birthTime: "12:00", timeUnknown: true, gender: "male", timezone: "Asia/Seoul" });
    const god = tenGod(dS, t.pillars.year.stemIdx);
    let s = 50; if (sp.includes(god)) s += 26; if (isHap(dB, t.pillars.year.branchIdx)) s += 16; if (Math.abs(dB - t.pillars.year.branchIdx) === 6) s += 8;
    years.push({ y, gz: t.pillars.year.gz, god, s });
  }
  const birthY = profile.solar ? profile.solar.Y : now.getFullYear() - 25;
  const pick = years.find((x) => x.s >= 76 && x.y - birthY + 1 >= 24 && x.y > now.getFullYear()) || years.find((x) => x.s >= 76 && x.y > now.getFullYear()) || [...years].sort((a, b) => b.s - a.s)[0];
  let mDate = new Date(pick.y, 9, 6);
  try {
    const mf = monthlyFlow(profile, g, pick.y, 1, 12).find((f) => sp.includes(f.god));
    if (mf) mDate = new Date(mf.y, mf.m - 1, 6);
  } catch { /* ignore */ }
  const spouseElem = g === "male" ? CTRL[profile.dayMasterElem] : CTRL_BY[profile.dayMasterElem];
  return {
    love: { ...love, days: daysUntil(love.date), why: love.god ? `${love.date.getFullYear()}년 ${love.date.getMonth() + 1}월(${love.gz}월)에 배우자·연인을 뜻하는 ${love.god}의 기운이 들어와요. 이때 설레는 인연이 시작되기 쉬워요.` : "앞으로 몇 년은 인연의 기운이 조용해요. 대신 나를 가꾸는 시간이 다음 인연의 크기를 정해요." },
    marry: { date: mDate, days: daysUntil(mDate), y: pick.y, gz: pick.gz, age: pick.y - birthY + 1, why: `${pick.y}년(${pick.gz}년)은 ${sp.includes(pick.god) ? `배우자를 뜻하는 ${pick.god}이 드는 해` : "관계가 정리·확정되기 쉬운 해"}${isHap(dB, years.find((x) => x.y === pick.y) ? computeSaju({ calendarType: "solar", birthDate: `${pick.y}-06-15`, birthTime: "12:00", timeUnknown: true, gender: "male", timezone: "Asia/Seoul" }).pillars.year.branchIdx : -1) ? "이고, 내 배우자 자리(일지)와 합(合)을 이뤄 약속·결혼으로 이어지기 쉬워요." : "라 진지한 약속이 오가기 쉬워요."}` },
    spouseElem,
    others: years.filter((x) => x.s >= 76 && x.y !== pick.y).slice(0, 2).map((x) => x.y),
  };
}

/* ---- 지난 연애 맞혀 보기 — 지나간 해마다 배우자성·합·충으로 ---- */
const BREAK_GOD = { male: ["겁재", "비견"], female: ["상관", "식신"] };
function pastLove(profile, gender) {
  const g = gender === "male" ? "male" : "female";
  const sp = SPOUSE[g];
  const now = new Date();
  const birthY = profile.solar ? profile.solar.Y : now.getFullYear() - 25;
  const dS = profile.pillars.day.stemIdx, dB = profile.pillars.day.branchIdx;
  const from = Math.max(birthY + 15, now.getFullYear() - 10);
  const rows = [];
  for (let y = now.getFullYear() - 1; y >= from; y--) {
    const t = computeSaju({ calendarType: "solar", birthDate: `${y}-06-15`, birthTime: "12:00", timeUnknown: true, gender: "male", timezone: "Asia/Seoul" });
    const god = tenGod(dS, t.pillars.year.stemIdx), b = t.pillars.year.branchIdx;
    const hap = isHap(dB, b), chung = Math.abs(dB - b) === 6;
    let kind = null, line = "";
    if (sp.includes(god) && hap) { kind = "start"; line = `배우자성(${god})이 들고 배우자 자리와 합(合)까지 — 진지한 연애가 시작됐거나 깊어졌을 해`; }
    else if (sp.includes(god)) { kind = "start"; line = `배우자성(${god})이 든 해 — 설레는 인연이 들어왔을 해`; }
    else if (hap) { kind = "start"; line = "배우자 자리와 합(合)이 든 해 — 누군가와 가까워졌을 해"; }
    else if (chung) { kind = "break"; line = "배우자 자리를 치는 충(沖)의 해 — 이별이나 관계의 큰 흔들림이 있었을 해"; }
    else if (BREAK_GOD[g].includes(god)) { kind = "break"; line = `${god}의 해 — 연애보다 나에게 집중했거나, 다툼·정리가 있었을 해`; }
    if (kind) rows.push({ y, age: y - birthY + 1, gz: t.pillars.year.gz, kind, line });
  }
  return rows;
}

/* ---- 타로로 본 D-day — 수트별 시간 단위(전통 타이밍법) ---- */
const UNIT = {
  love: { wands: ["일", 3], cups: ["주", 1], swords: ["주", 2], pentacles: ["개월", 1], major: ["개월", 1] },
  marry: { wands: ["개월", 2], cups: ["개월", 3], swords: ["개월", 4], pentacles: ["개월", 6], major: ["개월", 3] },
};
const SUIT_MEET = {
  wands: { elem: "fire", line: "완드(불)의 기운 — 활기차고 사람 많은 곳, 내가 먼저 움직일 때 만나요." },
  cups: { elem: "water", line: "컵(물)의 기운 — 감정이 통하는 대화, 우연한 여행·밤의 자리에서 만나요." },
  swords: { elem: "metal", line: "소드(바람)의 기운 — 일·공부·토론처럼 머리를 쓰는 자리에서 만나요." },
  pentacles: { elem: "earth", line: "펜타클(땅)의 기운 — 소개·동네·오래 다닌 곳처럼 익숙한 자리에서 만나요." },
  major: { elem: null, line: "메이저 카드 — 운명처럼 예상 못 한 계기로 만나요. 평소와 다른 선택을 한 날을 주목하세요." },
};
function tarotDday(seedKey) {
  const draw = (kind) => {
    const r = hash(seedKey + kind);
    const idx = r % 78;
    const card = getCard(idx);
    const reversed = (r >> 9) % 3 === 0;
    const suit = card.suit || "major";
    const [unit, mul] = UNIT[kind][suit];
    const num = suit === "major" ? (card.number % 12) + 1 : Math.min(card.number, 10);
    let n = num * mul; if (reversed) n = Math.round(n * 1.5);
    const days = unit === "일" ? n : unit === "주" ? n * 7 : Math.round(n * 30.4);
    const date = new Date(Date.now() + days * DAY);
    return { card, idx, reversed, suit, unit, n, days, date };
  };
  return { love: draw("love"), marry: draw("marry") };
}

/* ---- 인연은 어디서? — 방향·지역·외국인 힌트 ---- */
const DIR = {
  wood: { dir: "동쪽", region: "강원·동해안·경북 동쪽 지방 출신이거나, 지금 사는 곳에서 동쪽 동네", sun: "🌅" },
  fire: { dir: "남쪽", region: "부산·경남·전라·제주 같은 남쪽 지방 출신이거나, 지금 사는 곳에서 남쪽 동네", sun: "☀️" },
  earth: { dir: "가운데(가까운 곳)", region: "서울·수도권 한가운데, 또는 나와 같은 동네·같은 고향 사람", sun: "🏠" },
  metal: { dir: "서쪽", region: "인천·충청·서해안 쪽 출신이거나, 지금 사는 곳에서 서쪽 동네", sun: "🌇" },
  water: { dir: "북쪽", region: "경기 북부·서울 강북·북쪽 지방 출신이거나, 지금 사는 곳에서 북쪽 동네", sun: "🌙" },
};
const SUIT_DIR = { wands: "fire", cups: "water", swords: "metal", pentacles: "earth" };
function hasYeokma(profile) {
  const yB = profile.pillars.year.branchIdx;
  const grp = [[8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7]].find((g) => g.includes(yB)) || [8, 0, 4];
  const ym = { "8,0,4": 2, "2,6,10": 8, "5,9,1": 11, "11,3,7": 5 }[grp.join(",")];
  return ["year", "month", "day", "hour"].map((k) => profile.pillars[k]).filter(Boolean).some((p) => p.branchIdx === ym);
}
function sajuMeet(profile, gender) {
  const g = gender === "male" ? "male" : "female";
  const elem = g === "male" ? CTRL[profile.dayMasterElem] : CTRL_BY[profile.dayMasterElem];
  const dS = profile.pillars.day.stemIdx;
  const gods = ["year", "month", "hour"].map((k) => profile.pillars[k]).filter(Boolean).map((p) => tenGod(dS, p.stemIdx));
  const pyeon = gods.filter((x) => x === (g === "male" ? "편재" : "편관")).length, jeong = gods.filter((x) => x === (g === "male" ? "정재" : "정관")).length;
  const far = hasYeokma(profile) || (elem === "water" && profile.elementCounts && profile.elementCounts.water >= 2);
  return {
    elem, d: DIR[elem], m: MEET[elem] || MEET.earth, far,
    age: pyeon > jeong ? "나이 차이가 좀 나거나(연상·연하), 개성이 뚜렷한 사람일 가능성이 커요." : jeong > pyeon ? "또래이거나 비슷한 환경에서 자란, 성실한 사람일 가능성이 커요." : "나이·환경보다 ‘말이 잘 통하는지’가 더 중요한 인연이에요.",
    jobs: JOBS[elem].slice(0, 4),
  };
}

const KINDS = {
  love: { who: "누구의 연애 시작 D-day를 볼까?", title: "연애 시작 D-day", sub: "새 연애가 시작되기까지 며칠 남았을까?", emoji: "💗", cost: "ddaylove", tarot: true },
  marry: { who: "누구의 결혼 D-day를 볼까?", title: "결혼 D-day", sub: "결혼(진지한 약속)까지 며칠 남았을까?", emoji: "💍", cost: "ddaymarry", tarot: true },
  meet: { who: "누구의 인연 방향을 볼까?", title: "인연은 어디서 올까", sub: "어느 쪽(동서남북)·어느 지역·어떤 곳에서 만날까?", emoji: "📍", cost: "ddaymeet", tarot: true },
  past: { who: "누구의 지난 연애를 맞혀 볼까?", title: "지난 연애 맞히기", sub: "사주로 맞혀 보는 나의 과거 연애", emoji: "🔙", cost: "pastlove", tarot: false },
};

/* /dday — 네 가지 인연 보기 메뉴 */
function ddayMenu(navigate) {
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(pageHeader("인연 운세", "연애·결혼·인연, 무엇이 궁금해?", "궁금한 것만 골라서 따로 볼 수 있어요. 사주·타로 중에 골라요."));
  root.append(el("section", { class: "wrap section-gap" }, Object.entries(KINDS).map(([k, v]) =>
    el("button", { class: "panel dd-menu", type: "button", onclick: () => navigate(`/dday/${k}`) }, [
      el("span", { class: "dd-menu-ic", text: v.emoji }),
      el("div", { style: "flex:1; text-align:left;" }, [el("b", { class: "serif", text: v.title }), el("p", { class: "muted tiny", text: v.sub })]),
      el("span", { class: "topic-cost" }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: String(costOf(v.cost)) })]),
    ]))));
  return root;
}

export function renderDday({ navigate, kind: kindArg, method: initMethod }) {
  loadDisclaimer();
  // 예전 주소 호환: /dday/tarot → 연애 D-day 타로, /dday/past → 지난 연애
  let kind = kindArg;
  if (kind === "tarot" || kind === "saju") { initMethod = kind; kind = "love"; }
  if (!kind || !KINDS[kind]) return ddayMenu(navigate);
  const K = KINDS[kind];
  const my = getMyBirth();
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/dday", "인연 운세")]));
  root.append(pageHeader("인연 운세", `${K.emoji} ${K.title}`, K.sub));
  root.append(personSwitch(navigate, { title: K.who }));
  if (!my) {
    root.append(el("section", { class: "wrap section-gap" }, [noticeBox("info", "생년월일이 필요해요."), el("button", { class: "btn btn-primary", onclick: () => navigate("/saju") }, [el("span", { text: "내 정보 입력하고 시작" })])]));
    return root;
  }
  let method = K.tarot && initMethod === "tarot" ? "tarot" : "saju";
  const host = el("section", { class: "wrap section-gap" });
  root.append(host);
  const now = new Date();
  const sig = `${my.birthDate}_${my.timeUnknown ? "x" : my.birthTime || "-"}_${my.gender || ""}`;
  const itemId = () => kind === "past" ? `pastlove:${sig}`
    : method === "saju" ? `dday:${kind}:saju:${sig}:${now.getFullYear()}-${now.getMonth() + 1}` : `dday:${kind}:tarot:${sig}:${now.toISOString().slice(0, 10)}`;
  const DESC = {
    saju: { love: "연인을 뜻하는 기운(남자는 재성, 여자는 관성)이 드는 달로 계산해요. 달마다 새로 계산돼요.", marry: "배우자 기운이 들고 배우자 자리(일지)와 합이 드는 해·달로 계산해요.", meet: "내 사주에서 인연을 뜻하는 오행의 방향·지역으로 풀어요.", past: "지나간 해마다 배우자성·합(合)·충(沖)을 따져, 연애가 시작됐거나 흔들렸을 해를 맞혀 봐요." },
    tarot: { love: "카드 수트마다 시간 단위가 달라요 (완드=날, 컵=주, 소드=2주, 펜타클=달). 매일 새로 뽑혀요.", marry: "카드 수트로 달 단위를 세요 (완드=2달, 컵=3달, 소드=4달, 펜타클=6달). 매일 새로 뽑혀요.", meet: "뽑힌 카드의 원소로 방향을 봐요 (완드=남, 컵=북, 소드=서, 펜타클=가까운 곳, 메이저=먼 곳). 매일 새로 뽑혀요." },
  };

  function paint() {
    clear(host);
    if (K.tarot) host.append(el("div", { class: "method-tabs" }, [["saju", "사주로 보기"], ["tarot", "타로로 보기"]].map(([id, t]) =>
      el("button", { type: "button", class: "method-tab" + (id === method ? " on" : ""), onclick: () => { method = id; paint(); } }, [el("span", { text: t })]))));
    host.append(el("p", { class: "muted tiny", style: "text-align:center;", text: DESC[method][kind] }));
    if (!isUnlocked(itemId())) {
      const coins = getCoins(), cost = costOf(K.cost);
      host.append(el("div", { class: "panel premium-lock" }, [
        el("span", { class: "lock-badge" }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: `코인 ${cost}개` })]),
        el("h3", { class: "serif", style: "margin-top:10px;", text: `${kind === "past" ? "" : method === "saju" ? "사주로 보는 " : "타로로 보는 "}${K.title}` }),
        el("p", { class: "muted", style: "font-size:var(--fs-sm);", text: K.sub + " · 한 번 열면 다시 볼 땐 무료예요." }),
        el("button", { class: "btn btn-primary btn-block", style: "margin-top: var(--sp-4);", onclick: () => {
          const r = unlock(itemId(), cost); if (r.ok) { toast(`${K.title}을(를) 열었어요`); paint(); } else { noCoinToast(cost); }
        } }, [el("span", { text: coins >= cost ? `코인 ${cost}개로 열기 · 보유 ${coins}개` : "코인 받으러 가기" })]),
      ]));
      return;
    }
    if (kind === "past") { host.append(pastPanel(computeSaju(my)), noticeBox("info", "사주 흐름으로 맞혀 보는 재미용이에요. 맞았는지 눌러 주면 해묘 적중률이 쌓여요.")); }
    else if (method === "saju") paintSaju(); else { loadTarotData().then(() => { paintTarot(); host.append(otherLinks()); }); return; }
    host.append(otherLinks());
  }

  const otherLinks = () => el("div", { class: "dd-others" }, [
    el("p", { class: "muted tiny", text: "다른 인연 운세도 따로 볼 수 있어요" }),
    el("div", { class: "chip-grid" }, Object.entries(KINDS).filter(([k]) => k !== kind).map(([k, v]) =>
      el("button", { type: "button", class: "chip rel-chip", onclick: () => navigate(`/dday/${k}${v.tarot && method === "tarot" ? "/tarot" : ""}`), text: `${v.emoji} ${v.title}` }))),
  ]);

  const ddCard = (emoji, label, days, date, sub) => el("div", { class: "dd-card dd-card-1" }, [
    el("p", { class: "dd-label", text: `${emoji} ${label}` }),
    el("p", { class: "dd-num serif", text: days === 0 ? "D-DAY" : `D-${days}` }),
    el("p", { class: "dd-date", text: `${fmt(date)} 무렵` }),
    sub ? el("p", { class: "tiny muted", style: "margin-top:6px;", text: sub }) : null,
  ].filter(Boolean));

  function meetView(elem, why, extra = {}) {
    const d = DIR[elem], m = MEET[elem] || MEET.earth;
    return [
      el("div", { class: "dd-card dd-card-1" }, [
        el("p", { class: "dd-label", text: "📍 인연이 오는 방향" }),
        el("p", { class: "dd-num serif", style: "font-size:2rem;", text: `${d.sun} ${d.dir}` }),
        el("p", { class: "dd-date", text: why }),
      ]),
      el("div", { class: "panel section-gap" }, [
        el("p", { class: "eyebrow", text: "🗺️ 이런 사람일 거예요" }),
        el("p", {}, [el("b", { text: "지역 힌트 — " }), document.createTextNode(d.region)]),
        el("p", {}, [el("b", { text: "먼 사람? 가까운 사람? — " }), document.createTextNode(extra.far ? "✈️ 외국인·해외파·먼 지역 출신이거나, 여행·출장 중에 만날 가능성이 커요." : "🚶 생활권이 가까운 사람 — 같은 지역·같은 학교·같은 회사처럼 동선이 겹치는 사람일 가능성이 커요.")]),
        extra.age ? el("p", {}, [el("b", { text: "나이·분위기 — " }), document.createTextNode(extra.age)]) : null,
        el("p", {}, [el("b", { text: "첫인상 — " }), document.createTextNode(m.first)]),
        extra.jobs ? el("p", {}, [el("b", { text: "직업 힌트 — " }), document.createTextNode(extra.jobs.join(" · "))]) : null,
      ].filter(Boolean)),
      el("div", { class: "panel section-gap" }, [
        el("p", { class: "eyebrow", text: "🏷️ 만나기 쉬운 곳" }),
        el("div", { class: "overall-flow" }, m.places.map((pl, i) => el("div", { class: "overall-step" }, [el("span", { class: "overall-dot", text: String(i + 1) }), el("p", { text: pl })]))),
        el("p", {}, [el("b", { text: "만나는 계기 — " }), document.createTextNode(`${m.how} 흐름이에요.`)]),
      ]),
    ];
  }

  function paintSaju() {
    const profile = computeSaju(my);
    const r = sajuDday(profile, my.gender);
    if (kind === "love") host.append(
      ddCard("💗", "연애 시작까지", r.love.days, r.love.date),
      el("div", { class: "panel section-gap" }, [el("p", { class: "eyebrow", text: "왜 이 날일까" }), el("p", { text: r.love.why })]),
      el("div", { class: "insight", text: "D-day는 ‘그날 반드시’가 아니라 문이 열리는 때예요. 그 무렵 약속을 늘리고 새로운 자리에 나가 보세요." }));
    if (kind === "marry") host.append(
      ddCard("💍", "결혼까지", r.marry.days, r.marry.date, `${r.marry.y}년 · ${r.marry.age}세(세는나이)`),
      el("div", { class: "panel section-gap" }, [el("p", { class: "eyebrow", text: "왜 이 해일까" }), el("p", { text: r.marry.why }),
        r.others.length ? el("p", { class: "muted tiny", text: `결혼운이 함께 강한 다른 해: ${r.others.map((y) => y + "년").join(" · ")}` }) : null].filter(Boolean)),
      el("div", { class: "insight", text: "결혼 D-day는 ‘결혼이 이야기되기 쉬운 때’예요. 그 전 1~2년의 인연이 열쇠예요." }));
    if (kind === "meet") {
      const mt = sajuMeet(profile, my.gender);
      host.append(...meetView(mt.elem, `내 인연의 기운은 ${ELEM_KR[mt.elem]} — ${mt.d.dir}의 기운이에요.`, mt));
    }
    host.append(noticeBox("info", "사주 흐름으로 본 재미·참고용 풀이예요. 미래를 확정하지 않아요."));
  }

  function pastPanel(profile) {
    const rows = pastLove(profile, my.gender);
    const KEY = "hm.pastlove.v1";
    let saved = {}; try { saved = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { saved = {}; }
    const k = (y) => `${sig}:${y}`;
    const score = el("p", { class: "tiny", style: "font-weight:700;" });
    const paintScore = () => {
      const ans = rows.map((r) => saved[k(r.y)]).filter(Boolean);
      const hit = ans.filter((a) => a === "y").length;
      score.textContent = ans.length ? `해묘 적중률 ${Math.round((hit / ans.length) * 100)}% (${hit}/${ans.length})` : "맞았는지 눌러 주면 적중률을 알려 줄게요";
    };
    const list = rows.map((r) => {
      const yes = el("button", { type: "button", class: "chip rel-chip", text: "맞아" });
      const no = el("button", { type: "button", class: "chip rel-chip", text: "아니야" });
      const sync = () => { yes.classList.toggle("is-selected", saved[k(r.y)] === "y"); no.classList.toggle("is-selected", saved[k(r.y)] === "n"); paintScore(); };
      const set = (v) => { saved[k(r.y)] = saved[k(r.y)] === v ? undefined : v; try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { /* ignore */ } sync(); };
      yes.addEventListener("click", () => set("y")); no.addEventListener("click", () => set("n"));
      sync();
      return el("div", { class: "pl-row" }, [
        el("p", {}, [el("b", { text: `${r.kind === "start" ? "💗" : "💔"} ${r.y}년 (${r.age}세 · ${r.gz}년)` })]),
        el("p", { class: "tiny", text: r.line }),
        el("div", { style: "display:flex; gap:6px; margin-top:6px;" }, [yes, no]),
      ]);
    });
    paintScore();
    return el("div", { class: "panel section-gap" }, [
      el("p", { class: "eyebrow", text: "🔙 지난 연애 맞혀 보기" }),
      el("p", { class: "muted tiny", text: "사주로 보면 이런 해에 연애가 시작되거나 흔들렸을 거예요. 실제로 맞았는지 눌러 봐요!" }),
      rows.length ? el("div", { class: "pl-list" }, list) : el("p", { class: "muted", text: "아직 연애 나이가 된 지 얼마 안 돼서, 맞혀 볼 지난 해가 없어요." }),
      score,
    ]);
  }

  function paintTarot() {
    const t = tarotDday(`${sig}|${now.toISOString().slice(0, 10)}`);
    const cardBox = (d, label, note) => el("div", { class: "dd-tcard" }, [
      el("div", { class: "dd-tface" + (d.reversed ? " rev" : ""), html: cardFrontHTML(d.card) }),
      el("p", { class: "tiny", style: "margin-top:6px; font-weight:700;", text: `${label} · ${d.card.name}${d.reversed ? " (역방향)" : ""}` }),
      el("p", { class: "tiny muted", text: note }),
    ]);
    const timeNote = (d) => `${d.suit === "major" ? "메이저" : d.card.name.split(" ")[0]} = ${d.unit} 단위 → ${d.n}${d.unit}${d.reversed ? " (역방향이라 조금 늦게)" : ""}`;
    if (kind === "love" || kind === "marry") {
      const d = kind === "love" ? t.love : t.marry;
      host.append(
        ddCard(kind === "love" ? "💗" : "💍", kind === "love" ? "연애 시작까지" : "결혼까지", d.days, d.date),
        el("div", { class: "panel section-gap" }, [el("p", { class: "eyebrow", text: "오늘 뽑힌 카드" }), el("div", { class: "dd-cards" }, [cardBox(d, kind === "love" ? "연애" : "결혼", timeNote(d))])]),
        el("div", { class: "insight", text: "타로 D-day는 매일 새로 뽑혀요. 여러 날 비슷한 숫자가 나온다면 그 흐름이 강하다는 뜻이에요." }));
    } else {
      const r = hash(`${sig}|${now.toISOString().slice(0, 10)}|meet`);
      const card = getCard(r % 78), suit = card.suit || "major", rev = (r >> 7) % 3 === 0;
      const elem = SUIT_DIR[suit] || "water";
      const why = suit === "major" ? "메이저 카드 — 운명처럼 먼 곳, 예상 못 한 장소의 인연이에요." : SUIT_MEET[suit].line;
      host.append(...meetView(elem, why, { far: suit === "major" || (rev && suit === "cups") }),
        el("div", { class: "panel section-gap" }, [el("p", { class: "eyebrow", text: "오늘 뽑힌 카드" }), el("div", { class: "dd-cards" }, [cardBox({ card, reversed: rev }, "인연의 방향", rev ? "역방향 — 생각보다 가까운 곳, 이미 아는 사람일 수도" : "정방향 — 카드가 가리키는 쪽으로 움직여 보세요")])]));
    }
    host.append(noticeBox("info", "카드로 본 재미·참고용 풀이예요. 미래를 확정하지 않아요."));
  }

  paint();
  return root;
}

/* ================= 전생 이야기 ================= */
const PAST_STEM = [
  { who: "숲을 지키던 약초꾼", job: "약초를 캐고 사람을 치료하며 마을을 돌봤어요" },             // 갑
  { who: "궁중의 정원사이자 화공", job: "꽃과 나무를 가꾸고 그림으로 계절을 남겼어요" },          // 을
  { who: "횃불을 든 장군", job: "앞장서서 사람들을 이끌고 성을 지켰어요" },                     // 병
  { who: "등불 아래 글을 쓰던 시인", job: "밤마다 촛불을 켜고 사람들의 마음을 시로 적었어요" },     // 정
  { who: "산속 사찰의 큰스님", job: "많은 사람의 고민을 들어 주고 길을 일러 줬어요" },            // 무
  { who: "넓은 들판의 농장주", job: "땅을 일구고 곡식을 나누며 마을을 먹여 살렸어요" },           // 기
  { who: "명검을 벼리던 대장장이", job: "불 앞에서 쇠를 두드려 세상에 하나뿐인 검을 만들었어요" }, // 경
  { who: "왕실의 보석 세공사", job: "작은 보석을 다듬어 왕관과 장신구를 만들었어요" },           // 신
  { who: "먼바다를 누비던 선장", job: "배를 몰고 낯선 나라와 교역하며 세상을 넓혔어요" },        // 임
  { who: "깊은 밤의 점성술사", job: "별을 읽고 사람들의 운명을 점쳐 주었어요" },               // 계
];
const PAST_BRANCH = [
  { era: "조선 한양의 겨울", place: "눈 덮인 궁궐 근처" }, { era: "고려의 시골 마을", place: "논밭이 펼쳐진 들녘" },
  { era: "삼국 시대 고구려", place: "호랑이가 사는 깊은 산" }, { era: "통일 신라의 봄", place: "꽃이 만발한 경주" },
  { era: "백제의 항구 도시", place: "안개 낀 강가" }, { era: "실크로드의 여름", place: "사막을 건너는 대상 행렬" },
  { era: "르네상스 시대 이탈리아", place: "햇살 가득한 광장" }, { era: "에도 시대 일본", place: "차향이 나는 찻집" },
  { era: "중세 유럽의 가을", place: "포도밭이 있는 수도원" }, { era: "당나라 장안", place: "비단 시장 한가운데" },
  { era: "고대 이집트", place: "나일강 옆 신전" }, { era: "바이킹의 북쪽 바다", place: "오로라 아래 항구" },
];
const PAST_TWIST = {
  dohwa: "그 시절 당신의 미모와 재주에 반한 사람이 많아, 마을에 당신을 둘러싼 연애 소문이 끊이지 않았어요.",
  yeokma: "한곳에 머물지 못하고 평생 여러 나라를 떠돌았어요. 그래서 이번 생에도 여행과 이동이 운을 바꿔요.",
  hwagae: "말년엔 모든 걸 내려놓고 홀로 공부와 수행에 몰두했어요. 그래서 이번 생에도 혼자만의 시간이 힘이 돼요.",
  none: "평범한 듯하지만 주변 사람들에게 깊이 사랑받으며 조용히 삶을 마쳤어요.",
};
const LESSON = {
  wood: "전생에 남을 돌보느라 나를 못 챙겼어요. 이번 생의 숙제는 ‘나를 먼저 키우기’예요.",
  fire: "전생에 늘 앞에 서느라 외로웠어요. 이번 생의 숙제는 ‘기대고 나누기’예요.",
  earth: "전생에 많은 걸 책임졌어요. 이번 생의 숙제는 ‘가볍게 내려놓기’예요.",
  metal: "전생에 완벽을 좇았어요. 이번 생의 숙제는 ‘부족함도 사랑하기’예요.",
  water: "전생에 비밀을 많이 품었어요. 이번 생의 숙제는 ‘솔직하게 표현하기’예요.",
};
const JOBS = {
  wood: ["교육·상담", "기획·스타트업", "의료·약학", "디자인·건축", "환경·식물 관련"],
  fire: ["콘텐츠·방송·마케팅", "강연·공연", "뷰티·패션", "IT·전자", "외식·서비스"],
  earth: ["부동산·건설", "공무원·공기업", "인사·총무", "농식품·유통", "복지·중재"],
  metal: ["금융·회계", "법·행정", "엔지니어·기계", "보석·공예", "의료(외과·치과)"],
  water: ["연구·데이터", "무역·여행·물류", "작가·번역", "심리·철학", "음료·수산·해양"],
};
const SUIT_PAST = { major: "운명을 짊어진 인물 — 역사에 이름이 남을 만큼 큰 역할을 했어요.", wands: "개척자·전사 — 새 땅을 열고 사람들을 이끌었어요.", cups: "예술가·사제 — 마음을 어루만지고 사랑을 노래했어요.", swords: "학자·관리 — 지식과 판단으로 세상의 질서를 세웠어요.", pentacles: "상인·장인 — 손재주와 셈으로 부를 일궜어요." };

function sinsalTwist(profile) {
  const yB = profile.pillars.year.branchIdx, dB = profile.pillars.day.branchIdx;
  const all = ["year", "month", "day", "hour"].map((k) => profile.pillars[k]).filter(Boolean).map((p) => p.branchIdx);
  const grp = [[8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7]].find((g) => g.includes(yB)) || [8, 0, 4];
  // 삼합 그룹별 도화·역마·화개 지지
  const table = { "8,0,4": [9, 2, 4], "2,6,10": [3, 8, 10], "5,9,1": [6, 11, 1], "11,3,7": [0, 5, 7] }[grp.join(",")];
  if (all.includes(table[0]) || dB === table[0]) return "dohwa";
  if (all.includes(table[1])) return "yeokma";
  if (all.includes(table[2])) return "hwagae";
  return "none";
}

export function renderPastLife({ navigate }) {
  loadDisclaimer();
  const my = getMyBirth();
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(pageHeader("전생 이야기", "나는 전생에 뭐였을까?", "일주(태어난 날의 기둥)로 전생의 모습을, 오행으로 이번 생의 숙제와 잘 맞는 직업을 풀어요. 타로 카드 한 장도 함께!"));
  root.append(personSwitch(navigate, { title: "누구의 전생을 볼까?" }));
  if (!my) {
    root.append(el("section", { class: "wrap section-gap" }, [noticeBox("info", "생년월일이 필요해요."), el("button", { class: "btn btn-primary", onclick: () => navigate("/saju") }, [el("span", { text: "내 정보 입력하고 시작" })])]));
    return root;
  }
  const host = el("section", { class: "wrap section-gap" });
  root.append(host);
  const cost = costOf("pastlife");
  const itemId = `pastlife:${my.birthDate}_${my.timeUnknown ? "x" : my.birthTime || "-"}`;
  function paint() {
    clear(host);
    if (!isUnlocked(itemId)) {
      const coins = getCoins();
      host.append(el("div", { class: "panel premium-lock" }, [
        el("span", { class: "lock-badge" }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: `코인 ${cost}개` })]),
        el("h3", { class: "serif", style: "margin-top:10px;", text: "전생 이야기 열어 보기" }),
        el("p", { class: "muted", style: "font-size:var(--fs-sm);", text: "전생의 나 · 살았던 시대와 장소 · 이번 생의 숙제 · 잘 맞는 직업 · 전생 카드" }),
        el("button", { class: "btn btn-primary btn-block", style: "margin-top: var(--sp-4);", onclick: () => {
          const r = unlock(itemId, cost); if (r.ok) { toast("전생 이야기를 열었어요"); paint(); } else { noCoinToast(cost); }
        } }, [el("span", { text: coins >= cost ? `코인 ${cost}개로 열기 · 보유 ${coins}개` : "코인 받으러 가기" })]),
      ]));
      return;
    }
    const profile = computeSaju(my);
    const d = profile.pillars.day;
    const st = PAST_STEM[d.stemIdx], br = PAST_BRANCH[d.branchIdx];
    const tw = sinsalTwist(profile);
    const dom = (profile.dominant && profile.dominant[0] && profile.dominant[0].key) || profile.dayMasterElem;
    const lessonElem = profile.dayMasterElem;
    const jobs = [...new Set([...JOBS[dom], ...JOBS[profile.dayMasterElem]])].slice(0, 6);
    host.append(
      el("div", { class: "panel panel-gold section-gap", style: "text-align:center;" }, [
        el("p", { class: "eyebrow", style: "justify-content:center;", text: `일주 ${d.hanja}(${d.gz})로 본 전생` }),
        el("p", { class: "serif", style: "font-size:1.6rem; margin-top:6px;", text: st.who }),
        el("p", { class: "muted", text: `${br.era} · ${br.place}` }),
      ]),
      el("div", { class: "panel section-gap" }, [
        el("p", { class: "eyebrow", text: "전생 이야기" }),
        el("p", { text: `당신은 ${br.era}, ${br.place}에서 ${st.who}(으)로 살았어요. ${st.job}` }),
        el("p", { text: PAST_TWIST[tw] }),
        el("p", { style: "font-weight:600;", text: LESSON[lessonElem] }),
      ]),
      el("div", { class: "panel section-gap" }, [
        el("p", { class: "eyebrow", text: "💼 이번 생에 잘 맞는 직업" }),
        el("p", { class: "muted tiny", text: `가장 강한 기운 ${ELEM_KR[dom]} · 타고난 일간 ${ELEM_KR[profile.dayMasterElem]}` }),
        el("div", { class: "chip-grid" }, jobs.map((j) => el("span", { class: "chip", text: j }))),
        el("p", { class: "muted tiny", text: "더 자세한 직업 풀이는 운세 › 취업 · 직장 › ‘나에게 맞는 직업’에서 볼 수 있어요." }),
      ]),
    );
    loadTarotData().then(() => {
      const r = hash(`${my.birthDate}|pastlife`);
      const c = getCard(r % 78);
      host.append(el("div", { class: "panel section-gap" }, [
        el("p", { class: "eyebrow", text: "🔮 전생을 비추는 타로 카드" }),
        el("div", { class: "dd-cards" }, [el("div", { class: "dd-tcard" }, [el("div", { class: "dd-tface", html: cardFrontHTML(c) }), el("p", { class: "tiny", style: "margin-top:6px; font-weight:700;", text: c.name })])]),
        el("p", { text: SUIT_PAST[c.suit || "major"] }),
        el("p", { class: "muted tiny", text: c.symbol || "" }),
      ]), noticeBox("info", "재미로 보는 전생 이야기예요. 실제 전생을 확정하는 게 아니에요 🐈"));
    });
  }
  paint();
  return root;
}
