import { el, clear, toast, ymdPicker } from "../utils/dom.js";
import { pageHeader, backLink, noticeBox, loadDisclaimer, openModal } from "./shared.js";
import { getMyBirth, getPeople } from "../state.js";
import { analyzeBreakup, analyzeStart, harmonyBetween, reunionTiming, reunionOutlook } from "../saju/relationship.js";
import { personSwitch, savePersonOffer, chargeNewPeople, NEW_PERSON_NOTE } from "./people.js";
import { computeSaju } from "../saju/manse.js";
import { analyzeStrength } from "../saju/strength.js";
import { tenGod, ageFromSolar } from "../saju/fortune.js";
import { analyzeCompat } from "../saju/compat.js";
import { fatePeople, portraitSvg } from "../saju/spouse.js";
import { solarToLunar } from "../saju/astro.js";
import { monthScores } from "../saju/extras.js";
import { isUnlocked, unlock, getCoins, costOf, noCoinToast, notePair } from "../wallet.js";
/* =========================================================
   프리미엄 특집 풀이 — 도화살 · 귀문관살 · 남은 연애 횟수 · 결혼하면 안 되는 상대 · 자녀운
   · 사주팔자 사용설명서 · 내 인생 타임라인 · 나를 완성시켜 줄 사람 · 최애 궁합
   · 소육임 · 점성술 다이스 · 운세 일기장
   작성: HAE · 모두 재미·참고용
   ========================================================= */
const SH = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"], SK = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const BH = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"], BK = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const ANI = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];
const STEM_E = ["wood", "wood", "fire", "fire", "earth", "earth", "metal", "metal", "water", "water"];
const BR_E = ["water", "earth", "wood", "wood", "earth", "fire", "fire", "earth", "metal", "metal", "earth", "water"];
const BR_MAIN = [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8]; // 지지 정기(본기) 천간
const EK = { wood: "목(木)", fire: "화(火)", earth: "토(土)", metal: "금(金)", water: "수(水)" };
const KILLER = { wood: "metal", fire: "water", earth: "wood", metal: "fire", water: "earth" };
const ELEM_BR = { wood: [2, 3], fire: [5, 6], earth: [1, 4, 7, 10], metal: [8, 9], water: [11, 0] };
const DOHWA = { 8: 9, 0: 9, 4: 9, 2: 3, 6: 3, 10: 3, 11: 0, 3: 0, 7: 0, 5: 6, 9: 6, 1: 6 };
const HONGYEOM = [6, 6, 2, 7, 4, 4, 10, 9, 0, 8];
const HAP6 = { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 };
const GWIMUN = [[0, 9], [1, 6], [2, 7], [3, 8], [4, 11], [5, 10]];
const WONJIN = [[0, 7], [1, 6], [2, 9], [3, 8], [4, 11], [5, 10]];
const POS = [["year", "년주", "어린 시절·가족 분위기"], ["month", "월주", "청년기·사회생활"], ["day", "일주", "나 자신·배우자 자리"], ["hour", "시주", "중년 이후·자녀·말년"]];
const gz = (s, b) => `${SH[s]}${BH[b]}(${SK[s]}${BK[b]})`;
const yearGZ = (Y) => ({ s: ((Y - 4) % 10 + 10) % 10, b: ((Y - 4) % 12 + 12) % 12 });
const grp = (g) => (["비견", "겁재"].includes(g) ? "비겁" : ["식신", "상관"].includes(g) ? "식상" : ["편재", "정재"].includes(g) ? "재성" : ["편관", "정관"].includes(g) ? "관성" : "인성");
const inPair = (P, a, b) => P.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

/* ---------- 공용 페이지 틀 ---------- */
export function page({ navigate, title, h, desc, who, costKey, itemId, build, needBirth = true, back = "/special", backLabel = "" }) {
  loadDisclaimer();
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, back, backLabel || (back === "/special" ? "프리미엄" : "홈"))]));
  root.append(pageHeader(title, h, desc));
  if (who) root.append(personSwitch(navigate, { title: who }));
  const host = el("section", { class: "wrap section-gap" });
  root.append(host);
  const my = getMyBirth();
  if (needBirth && !my) {
    host.append(noticeBox("info", "생년월일이 필요해요."), el("button", { class: "btn btn-primary", onclick: () => navigate("/saju") }, [el("span", { text: "내 정보 입력하고 시작" })]));
    return root;
  }
  const profile = my ? computeSaju(my) : null;
  const S = profile ? analyzeStrength(profile) : null;
  let id = costKey ? itemId(my) : null; // 한 번 연 결과는 이 화면에서 계속 보기
  function paint() {
    clear(host);
    const cost = costKey ? costOf(costKey) : 0;
    if (cost && !isUnlocked(id)) {
      const coins = getCoins();
      host.append(el("div", { class: "panel premium-lock" }, [
        el("span", { class: "lock-badge" }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: `코인 ${cost}개` })]),
        el("h3", { class: "serif", style: "margin-top:10px;", text: `${title} 열어 보기` }),
        el("p", { class: "muted", style: "font-size:var(--fs-sm);", text: desc }),
        el("button", { class: "btn btn-primary btn-block", style: "margin-top: var(--sp-4);", onclick: () => {
          const r = unlock(id, cost); if (r.ok) { toast(`${title}을(를) 열었어요 · 코인 ${cost} 차감`); paint(); } else noCoinToast(cost);
        } }, [el("span", { text: coins >= cost ? `코인 ${cost}개로 열기 · 보유 ${coins}개` : "코인 받으러 가기" })]),
      ]));
      return;
    }
    build(host, { profile, my, S, repaint: () => { if (costKey) id = itemId(my); paint(); window.scrollTo({ top: 0, behavior: "smooth" }); } });
  }
  paint();
  return root;
}
const sig = (my) => `${my.birthDate}_${my.timeUnknown ? "x" : my.birthTime || "-"}`;
export const hero = (eyebrow, big, sub) => el("div", { class: "panel panel-gold sp-hero" }, [
  el("p", { class: "eyebrow", text: eyebrow }), el("p", { class: "serif sp-big", text: big }), sub ? el("p", { class: "muted", text: sub }) : null,
].filter(Boolean));
export const card = (eyebrow, kids) => el("div", { class: "panel sp-card" }, [el("p", { class: "eyebrow", text: eyebrow }), ...kids.filter(Boolean)]);
const pillarsOf = (profile) => POS.map(([k, nm, life]) => ({ k, nm, life, p: profile.pillars[k] })).filter((x) => x.p);
const stars = (n) => "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);

/* ======================= 1. 도화살 ======================= */
export function renderDohwa({ navigate }) {
  return page({ navigate, title: "도화살 체크", h: "나에게 도화살이 있을까?", desc: "도화살(桃花殺)·홍염살(紅艶殺)이 사주 어디에 있는지, 매력이 터지는 해는 언제인지 알려 드려요.", who: "누구의 도화살을 볼까?",
    costKey: "dohwa", itemId: (my) => `dohwa:${sig(my)}`, build(host, { profile }) {
      const P = pillarsOf(profile), bases = [profile.pillars.year.branchIdx, profile.pillars.day.branchIdx];
      const dohwaBr = [...new Set(bases.map((b) => DOHWA[b]))];
      const hits = P.filter((x) => dohwaBr.includes(x.p.branchIdx));
      const hong = P.filter((x) => x.p.branchIdx === HONGYEOM[profile.pillars.day.stemIdx]);
      const score = Math.min(100, 30 + hits.length * 25 + hong.length * 20 + P.filter((x) => [0, 3, 6, 9].includes(x.p.branchIdx)).length * 6);
      const Y = new Date().getFullYear();
      const years = []; for (let y = Y; y < Y + 12; y++) if (dohwaBr.includes(yearGZ(y).b)) years.push(y);
      host.append(
        hero("나의 매력 지수", `${score}점`, hits.length || hong.length ? "도화의 별이 반짝이는 사주예요!" : "드러나는 도화는 없지만, 은은하게 스며드는 매력형이에요."),
        card("도화살 (桃花殺) — 사람을 끄는 꽃", [
          hits.length ? el("p", { text: `${hits.map((x) => `${x.nm} ${gz(x.p.stemIdx, x.p.branchIdx)}`).join(", ")}에 도화가 있어요.` }) : el("p", { text: "원국(타고난 여덟 글자)에는 도화가 없어요. 대신 도화가 들어오는 해에 인기가 확 올라가요." }),
          ...hits.map((x) => el("p", { class: "tiny" }, [el("b", { text: `${x.nm} 도화 · ` }), document.createTextNode({ year: "어릴 때부터 주목받는 타입. 집안 분위기도 화사해요.", month: "학교·회사에서 인기 많은 타입. 사회생활 속 매력이 무기예요.", day: "배우자 자리에 꽃이 핀 사주 — 연애 감각이 좋고 배우자도 매력적이에요.", hour: "나이 들수록 매력이 깊어지는 타입. 중년 이후 인기가 더 많아요." }[x.k])])),
        ]),
        card("홍염살 (紅艶殺) — 은은한 색기", [
          el("p", { text: hong.length ? `${hong.map((x) => x.nm).join(", ")}에 홍염살이 있어요. 가만히 있어도 분위기로 시선을 끄는 타입이에요.` : "홍염살은 없어요. 대신 말과 행동에서 매력이 드러나는 ‘알면 알수록’ 타입이에요." }),
        ]),
        card("매력이 터지는 해", [
          el("div", { class: "sp-years" }, years.map((y) => el("span", { class: y === Y ? "now" : "", text: `${y}년 ${BH[yearGZ(y).b]}(${BK[yearGZ(y).b]})` }))),
          el("p", { class: "tiny muted", text: "도화 글자가 들어오는 해예요. 새 인연·인기·SNS 반응이 좋아지고, 연애가 시작되기 쉬워요." }),
        ]),
        el("div", { class: "block tag-warn" }, [el("span", { class: "block-label", text: "도화를 잘 쓰는 법" }),
          el("ul", {}, ["매력은 일(방송·영업·서비스·디자인)로 쓰면 큰 무기가 돼요.", "애매한 관계·구설은 일찍 정리하기 — 도화는 오해도 함께 불러요.", "연애 중이라면 상대에게 ‘확신’을 자주 표현해 주세요."].map((t) => el("li", { text: t })))]),
      );
    } });
}

/* ======================= 2. 귀문관살 ======================= */
export function renderGwimun({ navigate }) {
  return page({ navigate, title: "귀문관살 체크", h: "귀신 드는 사주? 귀문관살 알아보기", desc: "귀문관살(鬼門關殺)과 원진살(怨嗔殺)이 사주에 있는지, 그 예민함을 어떻게 재능으로 쓰는지 알려 드려요.", who: "누구의 사주를 볼까?",
    costKey: "gwimun", itemId: (my) => `gwimun:${sig(my)}`, build(host, { profile }) {
      const P = pillarsOf(profile);
      const pairs = [], wons = [];
      for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
        const a = P[i].p.branchIdx, b = P[j].p.branchIdx;
        if (inPair(GWIMUN, a, b)) pairs.push([P[i], P[j]]);
        if (inPair(WONJIN, a, b)) wons.push([P[i], P[j]]);
      }
      const strong = pairs.some(([a, b]) => [a.k, b.k].includes("day"));
      host.append(
        hero("귀문관살", pairs.length ? (strong ? "있어요 · 강하게" : "있어요 · 은은하게") : "없어요", pairs.length ? "직감·영감·예술 감각이 남다른 사주예요." : "마음의 결이 비교적 단단하고 안정적인 사주예요."),
        card("귀문관살 (鬼門關殺) 위치", [
          pairs.length ? el("div", {}, pairs.map(([a, b]) => el("p", {}, [el("b", { text: `${a.nm} ${BH[a.p.branchIdx]}(${BK[a.p.branchIdx]}) ↔ ${b.nm} ${BH[b.p.branchIdx]}(${BK[b.p.branchIdx]})` })]))) : el("p", { text: "네 기둥 사이에 귀문관살 짝(子酉·丑午·寅未·卯申·辰亥·巳戌)이 없어요." }),
          el("p", { class: "tiny muted", text: "일주가 끼면 더 강하게, 멀리 떨어진 기둥끼리면 은은하게 작용한다고 봐요." }),
        ]),
        pairs.length ? card("이런 사람이에요", [el("ul", {}, [
          "촉이 좋아 사람의 속마음·분위기를 빨리 읽어요.", "예술·상담·연구·종교·기획처럼 ‘보이지 않는 것’을 다루는 일에 재능이 있어요.",
          "생각이 많아지면 잠을 설치거나 예민해지기 쉬워요.", "한 가지에 깊이 몰입하면 남들이 못 보는 걸 찾아내요.",
        ].map((t) => el("li", { text: t })))]) : null,
        card("원진살 (怨嗔殺) — 미운 정 고운 정", [
          el("p", { text: wons.length ? `${wons.map(([a, b]) => `${a.nm}·${b.nm}`).join(", ")} 사이에 원진이 있어요. 가까운 사이일수록 서운함이 쌓이기 쉬우니, 그때그때 풀어 주는 게 좋아요.` : "원진살은 없어요. 사람 사이 미운 정으로 꼬이는 일이 적은 편이에요." }),
        ]),
        el("div", { class: "block tag-good" }, [el("span", { class: "block-label", text: "예민함을 재능으로 쓰는 법" }),
          el("ul", {}, ["잠들기 전 휴대폰 대신 일기·메모로 생각을 비워요.", "산책·운동처럼 몸을 쓰는 루틴이 머리를 맑게 해요.", "직감이 강한 날은 기획·창작에, 예민한 날은 혼자 쉬는 시간에."].map((t) => el("li", { text: t })))]),
        noticeBox("info", "귀문관살은 ‘귀신이 붙는다’는 뜻이 아니라 감수성·직관이 예민하다는 뜻이에요. 마음이 많이 힘들다면 가까운 사람이나 전문가와 꼭 이야기해 주세요."),
      );
    } });
}

/* ======================= 3. 남은 연애 횟수 ======================= */
export function renderLoveCount({ navigate }) {
  return page({ navigate, title: "남은 연애 횟수", h: "앞으로 몇 번의 연애가 남았을까?", desc: "배우자 별·도화·합이 들어오는 해를 30년 동안 세어, 앞으로 남은 ‘큰 연애 기회’를 알려 드려요.", who: "누구의 연애를 볼까?",
    costKey: "lovecount", itemId: (my) => `lovecount:${sig(my)}`, build(host, { profile, my }) {
      const ds = profile.pillars.day.stemIdx, db = profile.pillars.day.branchIdx;
      const female = (my.gender || "female") === "female";
      const spouse = female ? "관성" : "재성";
      const dohwa = [DOHWA[profile.pillars.year.branchIdx], DOHWA[db]];
      const Y = new Date().getFullYear();
      const age0 = Y - profile.solar.Y;
      const list = [];
      for (let y = Y; y < Y + 30; y++) {
        const g = yearGZ(y); let pt = 0; const why = [];
        if (grp(tenGod(ds, g.s)) === spouse) { pt += 2; why.push("배우자 별"); }
        if (grp(tenGod(ds, BR_MAIN[g.b])) === spouse) { pt += 1; why.push("배우자 기운"); }
        if (dohwa.includes(g.b)) { pt += 2; why.push("도화"); }
        if (HAP6[db] === g.b) { pt += 2; why.push("일지 합"); }
        if (pt >= 3) list.push({ y, age: age0 + (y - Y), pt, why });
      }
      // 연속된 해는 한 번의 연애로 묶기
      const runs = [];
      list.forEach((x) => { const last = runs[runs.length - 1]; if (last && x.y - last[last.length - 1].y <= 1) last.push(x); else runs.push([x]); });
      const big = runs.map((r) => r.slice().sort((a, b) => b.pt - a.pt)[0]);
      host.append(
        hero(`${Y}년부터 30년 동안`, `${big.length}번`, "마음이 크게 움직일 ‘큰 연애 기회’가 남아 있어요."),
        card("연애 기회가 오는 해", [el("div", { class: "sp-tl" }, big.map((x, i) => el("div", { class: "sp-tl-row" }, [
          el("span", { class: "sp-tl-no", text: String(i + 1) }),
          el("div", {}, [el("b", { text: `${x.y}년 · ${x.age}세 무렵` }), el("p", { class: "tiny muted", text: `${gz(yearGZ(x.y).s, yearGZ(x.y).b)}년 — ${x.why.join(" · ")}` })]),
          el("span", { class: "sp-tl-pt", text: stars(Math.min(5, x.pt)) }),
        ])))]),
        card("이렇게 읽어요", [el("p", { class: "tiny", text: `★이 많을수록 강한 인연이에요. ${female ? "여성은 관성(정관·편관)" : "남성은 재성(정재·편재)"}이 배우자 별이고, 도화·일지 합이 겹치면 연애가 시작되기 쉬워요. 이미 연애 중이라면 그 해는 관계가 깊어지거나 큰 결정을 하는 해로 읽어요.` })]),
      );
    } });
}

/* ======================= 4. 절대 결혼하면 안 되는 상대 ======================= */
const ELEM_PERSON = {
  wood: ["고집 센 이상주의자", "자기 계획만 밀어붙이고 남의 속도를 기다려 주지 않는 사람"],
  fire: ["감정 기복 큰 열정가", "기분 따라 말이 바뀌고, 화가 나면 선을 넘는 사람"],
  earth: ["변화 싫어하는 고집쟁이", "‘원래 그래’로 대화를 끝내고 새로운 걸 다 거부하는 사람"],
  metal: ["날 선 완벽주의자", "작은 실수도 지적하고 잘잘못을 끝까지 따지는 사람"],
  water: ["속을 알 수 없는 회피형", "중요한 순간마다 연락이 끊기고 말을 돌리는 사람"],
};
export function renderNoMarry({ navigate }) {
  return page({ navigate, title: "절대 결혼하면 안 되는 상대", h: "내 사주가 피하라는 사람", desc: "일지 충·원진 띠, 기신(忌神) 기운이 강한 사람의 유형과 레드 플래그를 알려 드려요. 반대로 잘 맞는 사람도요.", who: "누구의 기준으로 볼까?",
    costKey: "nomarry", itemId: (my) => `nomarry:${sig(my)}`, build(host, { profile, S }) {
      const db = profile.pillars.day.branchIdx;
      const chung = (db + 6) % 12, won = WONJIN.find(([a, b]) => a === db || b === db), wonB = won ? (won[0] === db ? won[1] : won[0]) : null;
      const gi = KILLER[S.yongsin[0]];
      const good = S.yongsin.flatMap((e) => ELEM_BR[e]).filter((b) => b !== chung);
      host.append(
        hero("피해야 할 상대", ELEM_PERSON[gi][0], `기신 ${EK[gi]} 기운이 지나치게 강한 사람`),
        card("🚩 레드 플래그", [el("ul", {}, [
          ELEM_PERSON[gi][1],
          `일지 충(沖) — ${ANI[chung]}띠 ${BH[chung]}(${BK[chung]}): 생활 리듬과 가치관이 정면으로 부딪히기 쉬워요.`,
          wonB != null ? `원진(怨嗔) — ${ANI[wonB]}띠 ${BH[wonB]}(${BK[wonB]}): 처음엔 끌리지만 시간이 갈수록 미운 정이 쌓여요.` : null,
          "내 꿈·일을 ‘쓸데없는 것’으로 만드는 사람 — 사주와 상관없이 무조건 아웃!",
        ].filter(Boolean).map((t) => el("li", { text: t })))]),
        card("💚 의외로 잘 맞는 사람", [
          el("p", { text: `용신 ${S.yongsin.map((e) => EK[e]).join("·")} 기운의 사람 — ${[...new Set(good)].slice(0, 4).map((b) => ANI[b] + "띠").join("·")}가 대표적이에요.` }),
          el("p", { text: `일지 합(合) — ${ANI[HAP6[db]]}띠: 말하지 않아도 마음이 통하는 짝이에요.` }),
        ]),
        noticeBox("info", "띠·오행만으로 사람을 판단할 수는 없어요. 경향을 보는 재미용이고, 결국 중요한 건 서로를 존중하는 태도예요."),
      );
    } });
}

/* ======================= 5. 자녀운 ======================= */
const CHILD_STYLE = { wood: "호기심 많고 쑥쑥 자라는 탐험가형", fire: "밝고 표현력 넘치는 분위기 메이커형", earth: "듬직하고 정 많은 효자·효녀형", metal: "똑 부러지고 자기 주관이 뚜렷한 리더형", water: "생각 깊고 감수성 풍부한 예술가형" };
export function renderChildren({ navigate }) {
  return page({ navigate, title: "자녀운", h: "나와 자녀의 인연", desc: "자녀 별(여성은 식상, 남성은 관성)과 자녀 자리(시주)로 자녀와의 인연·자녀 성향·인연이 깊어지는 시기를 봐요.", who: "누구의 자녀운을 볼까?",
    costKey: "children", itemId: (my) => `children:${sig(my)}`, build(host, { profile, my }) {
      const ds = profile.pillars.day.stemIdx;
      const female = (my.gender || "female") === "female";
      const childG = female ? "식상" : "관성";
      const P = pillarsOf(profile);
      let cnt = 0; P.forEach((x) => { if (x.k !== "day" && grp(tenGod(ds, x.p.stemIdx)) === childG) cnt++; if (grp(tenGod(ds, BR_MAIN[x.p.branchIdx])) === childG) cnt++; });
      const hour = profile.pillars.hour;
      const hourG = hour ? tenGod(ds, hour.stemIdx) : null;
      const childElem = female ? { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" }[profile.dayMasterElem] : KILLER[profile.dayMasterElem];
      const lv = Math.max(1, Math.min(5, 2 + cnt));
      const Y = new Date().getFullYear(); const yrs = [];
      for (let y = Y; y < Y + 15 && yrs.length < 5; y++) if (grp(tenGod(ds, yearGZ(y).s)) === childG) yrs.push(y);
      host.append(
        hero("자녀와의 인연", stars(lv), lv >= 4 ? "자녀 복이 두터운 사주예요." : lv >= 3 ? "자녀와 정을 꾸준히 쌓아 가는 사주예요." : "자녀와 친구 같은 거리감이 편한 사주예요."),
        card("자녀 별", [el("p", { text: `${female ? "식신·상관" : "정관·편관"}(자녀 별)이 사주에 ${cnt}개 있어요. ${cnt >= 2 ? "자녀와 마음이 잘 통하고, 자녀가 삶의 큰 힘이 돼요." : cnt === 1 ? "적당한 거리에서 서로를 존중하는 관계예요." : "자녀 별이 드러나지 않아, 함께 보내는 시간을 의식적으로 만들수록 정이 깊어져요."}` })]),
        card("자녀 자리 (시주)", [el("p", { text: hour ? `시주 ${gz(hour.stemIdx, hour.branchIdx)} · ${hourG} — ${{ 비겁: "친구처럼 지내는 자녀", 식상: "재주 많고 표현력 좋은 자녀", 재성: "현실 감각 좋고 야무진 자녀", 관성: "책임감 강하고 반듯한 자녀", 인성: "공부 잘하고 생각 깊은 자녀" }[grp(hourG)]}와 인연이 있어요.` : "출생 시간을 모르면 자녀 자리(시주)를 볼 수 없어요. 자녀 별로만 봤어요." })]),
        card("이런 자녀와 잘 맞아요", [el("p", { text: `${EK[childElem]} 기운 — ${CHILD_STYLE[childElem]}` })]),
        card("자녀와의 인연이 깊어지는 해", [el("div", { class: "sp-years" }, yrs.map((y) => el("span", { text: `${y}년` }))),
          el("p", { class: "tiny muted", text: "자녀 별이 들어오는 해예요. 임신·출산 계획, 자녀와의 큰 이벤트, 아이와 관련된 일이 생기기 쉬워요." })]),
        noticeBox("info", "자녀운은 자녀와의 인연·관계를 보는 참고용이에요. 임신·건강에 관한 판단은 꼭 전문의와 상담하세요."),
      );
    } });
}

/* ======================= 6. 사주팔자 사용설명서 ======================= */
const MANUAL = [
  ["큰 나무 🌳", "곧게 뻗어 자라는 리더형", "한번 정한 방향은 끝까지. 사람들을 이끌고 새 일을 시작하는 데 강해요.", "꺾이는 걸 못 견뎌요. ‘틀렸다’는 말을 직접적으로 들으면 고장 나요.", "말수가 줄고 혼자 다 하려 할 때"],
  ["풀꽃 🌿", "어디서든 피어나는 적응형", "부드럽게 스며들어 사람을 연결해요. 협상·관계·감각이 뛰어나요.", "남 눈치를 너무 보면 내 색을 잃어요.", "괜찮다고 하는데 얼굴이 안 괜찮을 때"],
  ["태양 ☀️", "모두를 비추는 에너자이저", "분위기를 띄우고 사람을 모아요. 표현·발표·홍보의 천재.", "관심이 끊기면 급속 방전돼요.", "갑자기 연락이 뜸해지고 잠수 탈 때"],
  ["촛불 🕯️", "한 사람을 오래 비추는 섬세형", "집중력과 따뜻한 배려가 장점. 디테일에 강해요.", "바람(무례함)에 쉽게 흔들려요.", "작은 말 한마디를 며칠씩 곱씹을 때"],
  ["큰 산 ⛰️", "흔들림 없는 버팀목", "믿음직하고 포용력이 커요. 사람들이 기대는 기둥.", "움직이기까지 시간이 오래 걸려요.", "‘알아서 할게’만 반복할 때"],
  ["기름진 땅 🌾", "무엇이든 길러 내는 살림꾼", "사람과 일을 키워 내는 능력. 현실 감각·관리력 최고.", "남 챙기다 정작 나를 못 챙겨요.", "밤에 이유 없이 허무할 때"],
  ["바위·칼 🗡️", "결단력 있는 해결사", "옳고 그름이 분명하고 추진력이 강해요. 위기에 빛나요.", "말이 칼처럼 날카로워질 때가 있어요.", "말투가 짧아지고 날이 설 때"],
  ["보석 💎", "다듬을수록 빛나는 완벽주의자", "센스·안목·정확성이 뛰어나요. 퀄리티의 상징.", "자존심을 다치면 오래 아파요.", "혼자 꾸미기·정리에 몰두할 때"],
  ["바다 🌊", "모든 걸 품는 전략가", "큰 그림과 지혜, 넓은 인맥. 흐름을 읽는 능력.", "생각이 너무 많아 행동이 늦어져요.", "밤새 생각만 하고 아침에 지칠 때"],
  ["이슬·비 💧", "조용히 스며드는 공감형", "섬세한 감성·직관·배려. 사람 마음을 잘 알아요.", "감정을 너무 흡수해서 쉽게 지쳐요.", "남의 기분에 내 하루가 휘둘릴 때"],
];
const CHARGE = { wood: "산책·식물·새로운 배움", fire: "햇볕·사람 만나기·좋아하는 노래", earth: "규칙적인 식사·정리정돈·집밥", metal: "운동·정리·결단 하나 내리기", water: "충분한 잠·독서·혼자만의 시간" };
export function renderManual({ navigate }) {
  return page({ navigate, title: "사주팔자 사용설명서", h: "세상에 단 하나뿐인 나 사용법", desc: "일간·신강신약·용신으로 쓴 ‘나’라는 제품의 사양, 주요 기능, 취급 주의, 충전법, 고장 신호까지.", who: "누구의 사용설명서를 볼까?",
    costKey: "manual", itemId: (my) => `manual:${sig(my)}`, build(host, { profile, my, S }) {
      const ds = profile.pillars.day.stemIdx, M = MANUAL[ds];
      const rows = [
        ["📦 제품명", `${my.name || "나"} — ${SH[ds]}(${SK[ds]}) ${M[0]}`],
        ["⚙️ 사양", `${M[1]} · ${S.levelName} 모델`],
        ["✨ 주요 기능", M[2]],
        ["⚠️ 취급 주의", M[3]],
        ["🔋 충전 방법", `${CHARGE[S.yongsin[0]]} (용신 ${EK[S.yongsin[0]]})`],
        ["🚨 고장 신호", M[4]],
        ["🛠️ 수리법", S.strength === "신강" ? "혼자 쥐고 있던 일을 나누고, 몸을 움직여 에너지를 써 주세요." : S.strength === "신약" ? "믿을 만한 사람에게 기대고, 푹 쉬어 체력부터 채워 주세요." : "평소 리듬을 지키면 금방 돌아와요. 하루만 온전히 쉬어 주세요."],
        ["🤝 호환 기기", `용신 ${S.yongsin.map((e) => EK[e]).join("·")} 기운의 사람 · ${S.yongsinAnimals.slice(0, 3).join("·")}`],
        ["🏠 최적 환경", `${{ wood: "동쪽·초록이 많은 곳", fire: "남쪽·밝은 곳", earth: "집의 가운데·안정된 곳", metal: "서쪽·정돈된 곳", water: "북쪽·물가·조용한 곳" }[S.yongsin[0]]}`],
      ];
      host.append(
        el("div", { class: "panel sp-manual" }, [
          el("p", { class: "sp-manual-h", text: "USER MANUAL" }),
          el("p", { class: "serif sp-big", text: `${my.name || "나"} 사용설명서` }),
          el("div", { class: "sp-manual-rows" }, rows.map(([k, v]) => el("div", { class: "sp-mrow" }, [el("b", { text: k }), el("span", { text: v })]))),
          el("p", { class: "tiny muted", text: "※ 이 제품은 교환·환불이 불가하며, 사랑으로 다룰수록 성능이 좋아집니다." }),
        ]),
      );
    } });
}

/* ======================= 7. 내 인생 타임라인 ======================= */
/* ---- 대운 상세 (타임라인에서 한 줄 누르면) ---- */
const GOD_AREA = {
  비겁: { work: "내 이름을 걸고 독립하거나, 동료와 경쟁하며 실력을 키우는 10년이에요. 프리랜서·창업·팀 리더 같은 '내 판'을 만들기 좋아요.", money: "돈이 들어와도 나가는 곳이 많아요(형제·친구·경쟁 비용). 공동 투자·보증은 피하고 내 통장을 따로 지키세요.", love: "자존심과 주도권 다툼이 생기기 쉬워요. 연인과도 ‘같은 편’이라는 확인이 자주 필요해요.", body: "체력이 좋아 무리하기 쉬운 시기 — 과로·운동 부상만 조심하면 활력이 넘쳐요.", tip: "혼자 다 하려 하지 말고, 믿을 사람 한두 명과 역할을 나누면 경쟁이 기회로 바뀌어요." },
  식상: { work: "재능·표현력이 밖으로 터지는 10년. 기획·창작·콘텐츠·강의·영업처럼 ‘내가 만든 것’을 보여 주는 일이 잘 풀려요.", money: "아이디어가 돈이 되는 시기. 부업·작품·기술로 버는 길이 열려요. 다만 기분 따라 쓰는 소비는 조심.", love: "매력이 잘 드러나 인연이 많아져요. 말실수·솔직함이 지나치면 상처가 될 수 있어 한 박자 쉬어 가요.", body: "에너지를 많이 써서 소화기·수면 리듬이 흐트러지기 쉬워요. 쉬는 날을 일정에 먼저 넣으세요.", tip: "떠오른 생각을 기록하고 작게라도 세상에 내놓으세요. 이 10년의 결과물이 다음 10년의 명함이 돼요." },
  재성: { work: "결과와 성과가 숫자로 보이는 10년. 실무·사업·관리 능력이 인정받고, 현실적인 기회가 많이 와요.", money: "돈의 흐름이 가장 활발한 시기예요. 크게 벌 수 있지만 크게 벌이기도 쉬우니, 자산을 ‘쌓는 구조’를 먼저 만드세요.", love: "현실적인 인연이 오는 시기 — 남성은 이성 인연, 여성은 생활력 있는 관계가 잘 맺어져요. 결혼·동거 같은 현실 결정도 많아요.", body: "바쁘게 뛰어다녀 몸이 지치기 쉬워요. 끼니·수면을 거르지 않는 게 가장 큰 재테크예요.", tip: "벌 때 지키는 법을 배우는 10년이에요. 수입의 일정 비율을 자동으로 떼어 두세요." },
  관성: { work: "책임과 자리가 커지는 10년. 승진·합격·공적인 역할이 들어오고, 조직 안에서 이름이 알려져요.", money: "월급·직책처럼 안정된 수입이 늘어요. 대신 체면·경조사 지출이 커지니 기준을 정해 두세요.", love: "진지한 관계가 들어오는 시기 — 여성은 배우자 인연이 강해지고, 남성은 가정·책임감이 커져요.", body: "스트레스·긴장이 쌓이기 쉬워요. 어깨·두통·위장 신호를 무시하지 마세요.", tip: "모든 책임을 혼자 지지 말고, 거절해도 되는 일은 거절하는 연습이 이 10년을 오래 버티게 해 줘요." },
  인성: { work: "배우고 자격을 쌓는 10년. 공부·자격증·연구·상담·교육 분야가 잘 맞고, 좋은 윗사람·스승의 도움을 받아요.", money: "큰돈보다 문서·자격·집처럼 ‘오래 남는 것’이 생기는 시기. 부동산·계약 문서운이 좋아요.", love: "편안하고 기댈 수 있는 사람을 찾게 돼요. 생각이 많아 표현이 늦어질 수 있으니 마음을 말로 꺼내 주세요.", body: "몸보다 마음이 먼저 지쳐요. 생각을 비우는 산책·명상·충분한 잠이 가장 좋은 약이에요.", tip: "준비만 하다 기회를 놓치지 않게, 배운 것을 써먹는 날짜를 미리 정해 두세요." },
};
const BR_REL = (a, b) => (Math.abs(a - b) === 6 ? "충" : HAP6[a] === b ? "합" : inPair(WONJIN, a, b) ? "원진" : null);
function showDaeunDetail(profile, S, r, { help, gi, cur, peak }) {
  help = help instanceof Set ? help : new Set(help || []);
  const ds = profile.pillars.day.stemIdx, Y0 = profile.solar.Y + r.age - 1;
  const sE = STEM_E[r.stemIdx], bE = BR_E[r.branchIdx];
  const bGod = tenGod(ds, BR_MAIN[r.branchIdx]);
  const A = GOD_AREA[grp(r.g)], B = GOD_AREA[grp(bGod)];
  const tag = (e) => (help.has(e) ? "도움(용신)" : e === gi ? "부담(기신)" : "보통");
  const relLines = [["day", "배우자 자리(일지)", { 충: "연애·가정에 변화가 커요. 이사·이직·관계의 큰 결정이 생기기 쉬워요.", 합: "연애·결혼 인연이 들어오기 좋아요. 마음 맞는 짝·동업자를 만나기 쉬워요.", 원진: "가까운 사람과 서운함이 쌓이기 쉬워요. 말로 확인하는 습관이 필요해요." }],
    ["month", "사회 자리(월지)", { 충: "직장·환경이 크게 바뀌는 흐름 — 이직·전공 변경·독립이 생기기 쉬워요.", 합: "일터에서 좋은 인연·협력이 들어와요. 팀·조직 운이 좋아요.", 원진: "직장 내 미묘한 갈등에 휘말리지 않게 거리 조절이 필요해요." }],
    ["year", "집안 자리(년지)", { 충: "가족·고향과 떨어지거나 집안 일로 바빠질 수 있어요.", 합: "집안·윗사람의 도움이 들어와요.", 원진: "가족과 생각 차이가 생기기 쉬워요." }]]
    .map(([k, nm, T]) => { const p = profile.pillars[k]; if (!p) return null; const rel = BR_REL(r.branchIdx, p.branchIdx); return rel ? `${nm}와 ${rel} — ${T[rel]}` : null; }).filter(Boolean);
  const years = [];
  for (let y = Y0; y < Y0 + 10; y++) {
    const { s, b } = yearGZ(y); let sc = 0;
    if (help.has(STEM_E[s])) sc += 2; if (help.has(BR_E[b])) sc += 1; if (STEM_E[s] === gi) sc -= 2; if (BR_E[b] === gi) sc -= 1;
    if (Math.abs(b - r.branchIdx) === 6) sc -= 1;
    years.push({ y, s, b, sc, age: y - profile.solar.Y + 1 });
  }
  const goods = years.filter((x) => x.sc >= 2), bads = years.filter((x) => x.sc <= -2);
  const yChip = (x, cls) => el("span", { class: "dd-y " + cls }, [el("b", { text: `${x.y}` }), el("small", { text: `${gz(x.s, x.b)} · ${x.age}세` })]);
  const now = r === cur, isPeak = r === peak;
  openModal([
    el("div", { class: "dd-head" }, [
      el("div", {}, [el("p", { class: "serif dd-gz", text: gz(r.stemIdx, r.branchIdx) }), el("p", { class: "tiny muted", text: `${r.age}~${r.age + 9}세 · ${Y0}~${Y0 + 9}년${now ? " · 지금 여기" : ""}${isPeak ? " · 전성기 ★" : ""}` })]),
      el("div", { class: "dd-score" }, [el("b", { text: String(r.sc) }), el("small", { text: "순풍 지수" })]),
    ]),
    el("div", { class: "dd-two" }, [
      el("div", {}, [el("small", { text: "천간 · 겉으로 드러나는 일" }), el("b", { text: `${SH[r.stemIdx]}(${SK[r.stemIdx]}) ${r.g}` }), el("span", { class: "tiny", text: `${EK[sE]} · ${tag(sE)}` })]),
      el("div", {}, [el("small", { text: "지지 · 속에서 흐르는 환경" }), el("b", { text: `${BH[r.branchIdx]}(${BK[r.branchIdx]}) ${bGod}` }), el("span", { class: "tiny", text: `${EK[bE]} · ${tag(bE)}` })]),
    ]),
    el("p", { class: "dd-sum", text: `${r.theme} — ${help.has(sE) || help.has(bE) ? `내게 필요한 기운이 들어와 노력한 만큼 잘 풀리는 10년이에요.` : sE === gi || bE === gi ? `부담되는 기운이 섞여 있어, 무리한 확장보다 내실을 다지면 다음 10년이 크게 열려요.` : `큰 파도 없이 내 선택이 결과를 만드는 10년이에요.`}` }),
    el("div", { class: "dd-areas" }, [["💼 일·커리어", A.work], ["💰 돈", A.money], ["💗 연애·관계", A.love], ["🌿 건강·마음", A.body]].map(([k, v]) => el("div", { class: "dd-area" }, [el("b", { text: k }), el("p", { text: v })]))),
    grp(bGod) !== grp(r.g) ? el("p", { class: "tiny dd-inner", text: `속마음(지지 ${bGod}): ${B.work.split(".")[0]}.` }) : null,
    relLines.length ? el("div", { class: "dd-rel" }, [el("p", { class: "eyebrow", text: "내 사주(원국)와의 만남" }), el("ul", {}, relLines.map((t) => el("li", { text: t })))]) : el("p", { class: "tiny muted", text: "원국과 큰 충·합 없이 비교적 잔잔하게 흘러가는 10년이에요." }),
    el("div", {}, [el("p", { class: "eyebrow", text: "이 10년 중 좋은 해" }), el("div", { class: "dd-ys" }, goods.length ? goods.map((x) => yChip(x, "good")) : [el("span", { class: "tiny muted", text: "두드러진 해 없이 고르게 흘러가요." })])]),
    bads.length ? el("div", {}, [el("p", { class: "eyebrow", text: "조심할 해" }), el("div", { class: "dd-ys" }, bads.map((x) => yChip(x, "bad")))]) : null,
    el("div", { class: "block tag-action" }, [el("span", { class: "block-label", text: "이 10년의 조언" }), el("p", { text: A.tip })]),
    el("p", { class: "tiny muted", text: "대운은 10년의 큰 흐름이고, 해마다의 세운이 그 위에 더해져요. 참고용으로 봐 주세요." }),
  ].filter(Boolean), { title: `${r.age}세 대운 자세히` });
}

/* 대운 줄 데이터 — 타임라인·사주 리포트 공용 */
export function daeunRows(profile, S) {
  S = S || analyzeStrength(profile);
  const ds = profile.pillars.day.stemIdx;
  const help = new Set([...S.yongsin, ...(S.johu && S.johu.element ? [S.johu.element] : [])]), gi = KILLER[S.yongsin[0]];
  const age = new Date().getFullYear() - profile.solar.Y + 1;
  const L = (profile.daeun && profile.daeun.list) || [];
  const rows = L.slice(0, 9).map((d) => {
    let sc = 60; [STEM_E[d.stemIdx], BR_E[d.branchIdx]].forEach((e, i) => { if (help.has(e)) sc += i ? 12 : 14; if (e === gi) sc -= i ? 10 : 12; });
    const g = tenGod(ds, d.stemIdx);
    return { ...d, sc: Math.max(30, Math.min(98, sc)), g, theme: { 비겁: "독립·경쟁의 시기", 식상: "재능을 펼치는 시기", 재성: "돈·결실의 시기", 관성: "책임·명예의 시기", 인성: "배움·도움의 시기" }[grp(g)] };
  });
  const future = rows.filter((r) => r.age + 9 >= age);
  const peak = (future.length ? future : rows).slice().sort((a, b) => b.sc - a.sc)[0];
  const cur = rows.find((r) => age >= r.age && age < r.age + 10);
  return { S, rows, cur, peak, help, gi };
}
/* 대운 한 줄 누르기 — 열렸으면 상세, 아니면 1코인/전체 5코인 고르기 */
export function openDaeun(profile, my, r, ctx, onOpened) {
  const one = `daeundetail:${sig(my)}:${r.age}`, all = `daeunall:${sig(my)}`;
  const show = () => showDaeunDetail(profile, ctx.S, r, ctx);
  if (isUnlocked(one) || isUnlocked(all)) return show();
  const c1 = costOf("daeundetail"), cA = costOf("daeunall");
  const m = openModal([
    el("p", { class: "muted", text: `${gz(r.stemIdx, r.branchIdx)} 대운(${r.age}~${r.age + 9}세)의 일·돈·연애·건강 풀이, 원국과의 합·충, 10년 중 좋은 해·조심할 해, 조언까지 볼 수 있어요.` }),
    el("div", { class: "dd-buy" }, [
      el("button", { type: "button", class: "btn btn-primary btn-block", onclick: () => { const x = unlock(all, cA); if (x.ok) { m.close(); toast(`대운 전체를 열었어요 · 코인 ${cA}`); if (onOpened) onOpened(); show(); } else noCoinToast(cA); } }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: `대운 ${ctx.rows.length}개 전부 열기 · 코인 ${cA}개` })]),
      el("button", { type: "button", class: "btn btn-ghost btn-block", onclick: () => { const x = unlock(one, c1); if (x.ok) { m.close(); toast(`${r.age}세 대운을 열었어요 · 코인 ${c1}`); if (onOpened) onOpened(); show(); } else noCoinToast(c1); } }, [el("span", { text: `이 10년만 열기 · 코인 ${c1}개` })]),
    ]),
    el("p", { class: "tiny muted", style: "text-align:center;", text: `전부 열면 타임라인 막대·전성기·대운별 자세한 풀이가 계속 무료예요 · 보유 코인 ${getCoins()}개` }),
  ], { title: `${r.age}세 대운 자세히 보기` });
}
/* 타임라인 패널 (막대 줄) */
export function daeunTimelinePanel(profile, my, ctx, onOpened) {
  const { rows, cur, peak } = ctx;
  const allOpen = isUnlocked(`daeunall:${sig(my)}`);
  return el("div", { class: "panel" }, [
    el("p", { class: "eyebrow", text: `대운 타임라인 · ${profile.daeun.forward ? "순행" : "역행"} · ${profile.daeun.startAge}세 시작` }),
    el("div", { class: "sp-life" }, rows.map((r) => {
      const opened = allOpen || isUnlocked(`daeundetail:${sig(my)}:${r.age}`);
      return el("button", { type: "button", class: "sp-life-row" + (r === cur ? " now" : "") + (r === peak ? " peak" : ""), "aria-label": `${r.age}세 대운 자세히 보기`, onclick: () => openDaeun(profile, my, r, ctx, onOpened) }, [
        el("span", { class: "sp-life-age", text: `${r.age}세` }),
        el("div", { class: "sp-life-bar" }, [el("span", { style: `width:${r.sc}%;` })]),
        el("div", { class: "sp-life-txt" }, [el("b", { text: `${gz(r.stemIdx, r.branchIdx)} · ${r.g}` }), el("span", { class: "tiny muted", text: `${r.theme}${r === cur ? " · 지금 여기!" : ""}${r === peak ? " · 전성기 ★" : ""}` })]),
        el("span", { class: "sp-life-more" + (opened ? " open" : "") }, opened ? [el("span", { text: "자세히 ›" })] : [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: `${costOf("daeundetail")} · 자세히` })]),
      ]);
    })),
    el("p", { class: "tiny muted", text: "막대가 길수록 용신 기운이 들어와 순풍이 부는 10년이에요. 짧은 시기는 내실을 다지는 시기로 읽어요. 각 10년을 누르면 일·돈·연애·건강, 좋은 해까지 자세히 볼 수 있어요." }),
  ]);
}
/* 사주 리포트용 — 간략 카드(무료) → 코인 내면 타임라인 + 상세로 바뀜 */
export function daeunFlowBlock(profile, my, briefCards) {
  const host = el("div", { class: "dfb" });
  let ctx; try { ctx = daeunRows(profile); } catch { return briefCards; }
  function paint() {
    clear(host);
    if (isUnlocked(`daeunall:${sig(my)}`)) { host.append(daeunTimelinePanel(profile, my, ctx, paint)); return; }
    // 간략 카드: 누르면 그 대운 상세(잠금이면 코인 선택)
    briefCards.querySelectorAll(".dt-item").forEach((card, i) => {
      const a = Number(card.dataset.age); const r = ctx.rows.find((x) => x.age === a) || ctx.rows[i]; if (!r) return;
      card.setAttribute("role", "button"); card.tabIndex = 0; card.classList.add("dt-click");
      const go = () => openDaeun(profile, my, r, ctx, paint);
      card.onclick = go; card.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } };
    });
    host.append(briefCards, el("button", { type: "button", class: "deep-cta", style: "margin-top: var(--sp-3);", onclick: () => openDaeun(profile, my, ctx.cur || ctx.rows[0], ctx, paint) }, [
      el("span", { class: "deep-cta-ic", text: "🗺️" }),
      el("span", { class: "deep-cta-txt" }, [el("b", { text: "대운 자세히 보기" }), el("span", { class: "tiny muted", text: "타임라인 막대 · 전성기 · 10년마다 일·돈·연애·건강·좋은 해" })]),
      el("span", { class: "deep-cta-go" }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: String(costOf("daeunall")) })]),
    ]));
  }
  paint();
  return host;
}

export function renderTimeline({ navigate }) {
  return page({ navigate, title: "내 인생 타임라인", h: "10년마다 바뀌는 내 인생의 계절", desc: "대운(10년 운)을 한눈에 이어 그려, 지금 어디쯤인지·전성기는 언제인지 보여 드려요.", who: "누구의 인생을 볼까?",
    costKey: "timeline", itemId: (my) => `timeline:${sig(my)}`, build(host, { profile, S, my, repaint }) {
      const ctx = daeunRows(profile, S), { peak } = ctx;
      host.append(
        hero("앞으로 올 인생 전성기", peak ? `${peak.age}~${peak.age + 9}세` : "-", peak ? `${gz(peak.stemIdx, peak.branchIdx)} 대운 · ${peak.theme}` : ""),
        daeunTimelinePanel(profile, my, ctx, repaint),
      );
    } });
}

/* ======================= 8. 나를 완성시켜 줄 사람 ======================= */
const COMPLETE = {
  wood: ["새로운 걸 함께 시작하자고 손 내미는 성장형", "스터디·운동 모임·새 학기·봄", "나를 앞으로 나아가게 해 줘요."],
  fire: ["밝게 웃으며 분위기를 띄우는 표현형", "공연·전시·여름 여행·SNS", "내 안의 열정에 불을 붙여 줘요."],
  earth: ["말없이 곁을 지켜 주는 든든한 사람", "지인 소개·동네 단골집·환절기", "흔들리는 나를 붙잡아 줘요."],
  metal: ["기준이 분명하고 결단력 있는 사람", "회사·전문 모임·가을", "망설이는 나 대신 길을 정리해 줘요."],
  water: ["생각 깊고 대화가 끝없이 이어지는 사람", "여행·온라인·늦은 밤 대화·겨울", "지친 마음을 깊이 이해해 줘요."],
};
export function renderCompleteMe({ navigate }) {
  return page({ navigate, title: "나를 완성시켜 줄 사람", h: "내 사주의 빈칸을 채워 줄 그 사람", desc: "내 사주에 부족한 기운(용신)을 가진 사람이 어떤 모습인지, 어디서 만나는지 알려 드려요.", who: "누구의 기준으로 볼까?",
    costKey: "completeme", itemId: (my) => `completeme:${sig(my)}`, build(host, { S }) {
      const y = S.yongsin[0], C = COMPLETE[y];
      const stems = SH.map((h, i) => [h, SK[i], STEM_E[i]]).filter((x) => x[2] === y);
      host.append(
        hero("나를 완성시켜 줄 사람", C[0], `용신 ${EK[y]}의 사람`),
        card("그 사람의 사주", [el("p", { text: `일간이 ${stems.map((x) => `${x[0]}(${x[1]})`).join("·")}이거나, ${S.yongsinAnimals.slice(0, 4).join("·")}인 사람이에요.` })]),
        card("만나기 쉬운 곳·때", [el("p", { text: C[1] })]),
        card("그 사람이 주는 것", [el("p", { text: C[2] })]),
        card("알아보는 신호", [el("ul", {}, ["같이 있으면 이상하게 마음이 편해요.", "그 사람 앞에선 내 단점이 덜 드러나요.", "만난 뒤로 일이 조금씩 풀리기 시작해요."].map((t) => el("li", { text: t })))]),
      );
    } });
}

/* ======================= 운명의 세 사람 (사주) ======================= */
export function renderFate3({ navigate }) {
  return page({ navigate, title: "운명의 세 사람", h: "사주로 보는 내 인생의 운명의 세 사람", desc: "나를 끌어올려 줄 귀인, 인생의 반쪽, 나를 단련시키는 사람 — 셋의 모습·띠·만나는 곳, 그리고 이미 만났을 해와 앞으로 만날 해를 내 사주로 짚어 드려요.", who: "누구의 운명을 볼까?",
    costKey: "fate3", itemId: (my) => `fate3:${sig(my)}`, build(host, { profile, my }) {
      const Y = new Date().getFullYear();
      const birthY = Number((profile.solar && profile.solar.year) || String(my.birthDate).slice(0, 4));
      const P = fatePeople(profile, my.gender === "male" ? "male" : "female", Y, birthY);
      const EM = ["🤝", "💞", "🔥"];
      host.append(hero("운명의 세 사람", "인생을 바꾸는 3명", "이미 내 곁에 있을 수도, 아직 오는 중일 수도 있어요 — 언제, 어디서, 어떤 모습인지 한 사람씩 봐요."));
      host.append(el("div", { class: "fate-grid" }, P.map((x, i) => el("article", { class: "panel fate-card" }, [
        el("div", { class: "fate-side" }, [
          el("p", { class: "fate-no", text: `${EM[i]} ${["첫 번째", "두 번째", "세 번째"][i]} 사람` }),
          el("h3", { class: "serif fate-title", text: x.title }),
          el("div", { class: "fate-pt", html: portraitSvg(x.portrait, 200) }),
          el("div", { class: "fate-tags" }, [el("span", { class: "fate-tag", text: x.animals }), el("span", { class: "fate-tag", text: `${x.elemKr} 기운` }), el("span", { class: "fate-tag", text: x.sex === "male" ? "남성일 가능성↑" : "여성일 가능성↑" })]),
        ]),
        el("div", { class: "fate-main" }, [
          fateRow("이런 모습", `${x.look}. ${x.vibe}이에요.`),
          fateRow("만나는 곳", x.where),
          fateRow("나에게 주는 것", x.gift),
          x.past.length ? el("div", { class: "fate-row" }, [el("b", { text: "이미 만났을지도 몰라요" }), el("div", { class: "fate-years" }, x.past.map((y) => el("span", { class: "fate-year is-past", text: `${y}년 · ${y - birthY + 1}세` }))),
            el("p", { class: "fate-past-t", text: `이 무렵 만난 ${x.animals} 사람이 있다면, 그 사람이 바로 ‘${x.title.split(" (")[0]}’일 수 있어요. 지금 곁에 있는 사람 중에 떠오르는 얼굴이 있는지 보세요.` })]) : null,
          el("div", { class: "fate-row" }, [el("b", { text: x.past.length ? "아직이라면 — 만나기 쉬운 해" : "만나기 쉬운 해" }), el("div", { class: "fate-years" }, x.years.map((y) => el("span", { class: "fate-year", text: `${y}년 · ${y - birthY + 1}세` })))]),
          el("div", { class: "fate-row" }, [el("b", { text: "알아보는 신호" }), el("ul", { class: "fate-signs" }, x.signs.map((t) => el("li", { text: t })))]),
          fateRow("사주 근거", `${x.why} 상대 생일 사주의 일간이 ${x.stems}이면 더 확실해요.`),
        ]),
      ]))));
      host.append(noticeBox("info", "띠·기운·해는 사주의 천을귀인·배우자궁·관성으로 짚은 ‘가능성’이에요. 운명의 사람은 이미 지나간 해에 만났을 수도, 앞으로 올 수도 있어요. 꼭 그 띠만 인연이라는 뜻은 아니니, 지금 곁의 사람을 다시 보고 다가올 해엔 새 만남에 마음을 조금 더 열어 보세요. (얼굴 이미지는 AI로 만든 가상 인물이에요)"));
    } });
}
function fateRow(h, t) { return el("div", { class: "fate-row" }, [el("b", { text: h }), el("p", { text: t })]); }

/* ======================= 9. 최애와 나의 궁합 ======================= */
export function renderIdolCompat({ navigate }) {
  return page({ navigate, title: "최애 궁합", h: "최애와 나의 사주 궁합", desc: "최애의 이름과 생일만 넣으면 사주 궁합을 바로 봐요. 아이돌·배우·캐릭터 생일도 OK!", who: "누구와 맞춰 볼까?",
    build(host, { profile }) {
      const nameI = el("input", { class: "input", maxlength: "20", placeholder: "최애 이름 (예: 우리 오빠)" });
      const dateI = ymdPicker("");
      const out = el("div", { class: "section-gap" });
      host.append(el("div", { class: "panel section-gap" }, [
        el("label", { class: "tiny muted", text: "최애 이름" }), nameI, el("label", { class: "tiny muted", text: "최애 생일 (양력)" }), dateI,
        el("button", { class: "btn btn-primary btn-block", onclick: () => {
          clear(out);
          if (!dateI.value) { out.append(noticeBox("warn", "최애 생일을 골라 주세요.")); return; }
          const nm = nameI.value.trim() || "최애";
          const b = computeSaju({ calendarType: "solar", birthDate: dateI.value, timeUnknown: true, gender: "male", timezone: "Asia/Seoul" });
          const R = analyzeCompat(profile, b, { a: "나", b: nm });
          const fan = Math.min(99, R.score + 5);
          out.append(
            hero(`나 × ${nm}`, `${fan}점`, R.title),
            card("두 사람의 케미", [el("p", { text: R.summary })]),
            card("💖 잘 맞는 점", [el("ul", {}, R.good.map((t) => el("li", { text: t })))]),
            card("😅 티격태격 포인트", [el("ul", {}, R.friction.map((t) => el("li", { text: t })))]),
            card("덕질 팁", [el("p", { text: R.complement })]),
            noticeBox("info", "생일만으로 본 재미용 궁합이에요. 진심 어린 응원은 언제나 최고의 궁합!"),
          );
        } }, [el("span", { text: "궁합 보기 💘" })]),
      ]), out);
    } });
}

/* ======================= 10. 소육임 ======================= */
const YUKIM = [
  ["大安", "대안", "평안", "모든 일이 편안하게 풀려요. 서두르지 않아도 좋은 쪽으로 흘러가요.", { 연애: "안정적으로 이어져요. 지금 관계를 믿어도 좋아요.", 재물: "큰 이득은 아니어도 손해 없이 들어와요.", 일: "계획대로 진행돼요. 그대로 밀고 가세요.", 잃어버린것: "멀리 가지 않았어요. 집 안·가까운 곳을 찾아보세요.", 기다리는사람: "곧 소식이 와요. 마음 편히 기다려요." }],
  ["留連", "유련", "지연", "일이 늘어지고 미뤄져요. 답답해도 조급하면 꼬여요.", { 연애: "애매한 관계가 길어져요. 확답은 조금 더 기다려야 해요.", 재물: "들어올 돈이 늦어져요. 약속은 문서로 남기세요.", 일: "결정이 미뤄져요. 서류·절차를 다시 확인하세요.", 잃어버린것: "찾기 어렵고 시간이 걸려요. 구석진 곳을 보세요.", 기다리는사람: "늦어지지만 결국 와요." }],
  ["速喜", "속희", "빠른 기쁨", "기쁜 소식이 빨리 와요! 망설이던 일은 지금 하세요.", { 연애: "고백·연락에 좋은 답이 빨리 와요.", 재물: "뜻밖의 수입·좋은 거래가 생겨요.", 일: "합격·승인 소식이 빨리 와요.", 잃어버린것: "금방 찾아요. 남쪽이나 밝은 곳을 보세요.", 기다리는사람: "생각보다 빨리 나타나요." }],
  ["赤口", "적구", "구설", "말다툼·오해를 조심해야 해요. 말 한마디가 화근이 돼요.", { 연애: "사소한 말로 다투기 쉬워요. 오늘은 한발 물러서기.", 재물: "돈 문제로 시비가 생길 수 있어요. 빌려주지 마세요.", 일: "회의·협상에서 감정적인 말은 금물이에요.", 잃어버린것: "누군가 가져갔거나 다툼 끝에 잃었을 수 있어요.", 기다리는사람: "소식이 와도 기분 상하는 내용일 수 있어요." }],
  ["小吉", "소길", "작은 행운", "작지만 확실한 좋은 일이 있어요. 귀인의 도움이 들어와요.", { 연애: "작은 호감이 쌓여 가요. 먼저 다가가면 좋아요.", 재물: "작은 이득·선물이 생겨요.", 일: "도와주는 사람이 나타나 일이 풀려요.", 잃어버린것: "다른 사람이 찾아 줄 수 있어요. 물어보세요.", 기다리는사람: "좋은 소식을 들고 와요." }],
  ["空亡", "공망", "헛됨", "기대한 만큼 결과가 나오지 않을 수 있어요. 큰 결정은 미루세요.", { 연애: "마음이 엇갈리기 쉬워요. 기대를 내려놓으면 편해요.", 재물: "새는 돈을 조심하세요. 투자는 보류.", 일: "헛수고가 되기 쉬워요. 준비를 더 하세요.", 잃어버린것: "찾기 어려워요. 마음을 비우는 게 나아요.", 기다리는사람: "오지 않을 수 있어요. 먼저 연락해 보세요." }],
];
export function renderSoYukim({ navigate }) {
  return page({ navigate, title: "소육임", h: "지금 이 순간을 묻는 점", desc: "음력 달·날·시를 손가락으로 세어 보는 전통 점, 소육임(小六壬). 질문을 떠올리고 ‘지금 점치기’를 누르세요.", needBirth: false,
    costKey: "soyukim", itemId: () => { const n = new Date(); return `soyukim:${n.getFullYear()}-${n.getMonth()}-${n.getDate()}-${Math.floor(((n.getHours() + 1) % 24) / 2)}`; }, build(host, { repaint }) {
      const now = new Date();
      const lu = solarToLunar(now.getFullYear(), now.getMonth() + 1, now.getDate());
      const hb = Math.floor(((now.getHours() + 1) % 24) / 2);
      const idx = ((lu.month - 1) + (lu.day - 1) + hb) % 6;
      const R = YUKIM[idx];
      host.append(
        el("div", { class: "panel sp-yk" }, YUKIM.map((x, i) => el("div", { class: "sp-yk-cell" + (i === idx ? " on" : "") }, [el("b", { class: "serif", text: x[0] }), el("span", { text: x[1] })]))),
        hero(`음력 ${lu.month}월 ${lu.day}일 · ${BH[hb]}(${BK[hb]})시`, `${R[0]}(${R[1]}) — ${R[2]}`, R[3]),
        el("div", { class: "panel" }, Object.entries(R[4]).map(([k, v]) => el("div", { class: "sp-mrow" }, [el("b", { text: k.replace("잃어버린것", "잃어버린 것").replace("기다리는사람", "기다리는 사람") }), el("span", { text: v })]))),
        el("p", { class: "tiny muted", text: `계산: 대안에서 음력 ${lu.month}월만큼 → ${lu.day}일만큼 → ${BK[hb]}시만큼 세어 나온 자리예요. 같은 시간(2시간) 안에서는 같은 답이 나와요.` }),
        el("p", { class: "tiny muted", text: "소육임은 같은 시진(2시간) 안에서는 같은 답이 나와요. 다른 질문은 다음 시진에 다시 물어보세요." }),
      );
    } });
}

/* ======================= 11. 점성술 다이스 ======================= */
const PLANET = [["☉ 태양", "나 자신·자존감"], ["☽ 달", "감정·속마음"], ["☿ 수성", "말·연락·생각"], ["♀ 금성", "사랑·매력·돈"], ["♂ 화성", "행동·열정·다툼"], ["♃ 목성", "행운·확장"], ["♄ 토성", "시련·책임·시간"], ["♅ 천왕성", "변화·반전"], ["♆ 해왕성", "꿈·환상·직감"], ["♇ 명왕성", "변신·집착·재탄생"], ["☊ 북교점", "가야 할 길"], ["☋ 남교점", "놓아줄 것"]];
const SIGN = [["♈ 양자리", "빠르고 과감하게"], ["♉ 황소자리", "느리지만 확실하게"], ["♊ 쌍둥이자리", "가볍고 재치 있게"], ["♋ 게자리", "따뜻하게 보살피며"], ["♌ 사자자리", "당당하고 화려하게"], ["♍ 처녀자리", "꼼꼼하고 신중하게"], ["♎ 천칭자리", "균형을 맞추며"], ["♏ 전갈자리", "깊고 강렬하게"], ["♐ 사수자리", "자유롭고 낙관적으로"], ["♑ 염소자리", "현실적이고 끈기 있게"], ["♒ 물병자리", "독특하고 새롭게"], ["♓ 물고기자리", "감성적이고 부드럽게"]];
const HOUSE = [["1하우스", "나의 모습·첫인상"], ["2하우스", "돈·소유"], ["3하우스", "공부·연락·가까운 사람"], ["4하우스", "집·가족"], ["5하우스", "연애·즐거움"], ["6하우스", "일상·건강 습관·일"], ["7하우스", "파트너·결혼·상대방"], ["8하우스", "깊은 관계·공동의 돈"], ["9하우스", "여행·배움·먼 곳"], ["10하우스", "커리어·명예"], ["11하우스", "친구·모임·꿈"], ["12하우스", "숨은 마음·휴식"]];
export function renderAstroDice({ navigate }) {
  return page({ navigate, title: "점성술 다이스", h: "주사위 세 개가 들려주는 답", desc: "행성·별자리·하우스 주사위 3개를 굴려, 질문에 대한 답을 ‘무엇이 · 어떻게 · 어디서’로 풀어요.", needBirth: false,
    costKey: "astrodice", itemId: () => `astrodice:${Date.now()}`, build(host, { repaint }) {
      const r = () => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % 12; };
      const p = PLANET[r()], s = SIGN[r()], h = HOUSE[r()];
      const q = el("input", { class: "input", maxlength: "60", placeholder: "마음속 질문 (예: 이번 달 연애운은?)" });
      host.append(
        el("div", { class: "panel" }, [q]),
        el("div", { class: "sp-dice" }, [[p, "무엇이"], [s, "어떻게"], [h, "어디서"]].map(([x, lb], i) => el("div", { class: "sp-die", style: `animation-delay:${i * 0.15}s;` }, [
          el("span", { class: "tiny muted", text: lb }), el("b", { text: x[0] }), el("span", { class: "tiny", text: x[1] }),
        ]))),
        hero("주사위의 답", `${p[1].split("·")[0]}이(가) ${s[1]}`, `${h[1]} 영역에서 움직여요.`),
        card("풀이", [el("p", { text: `지금 당신의 질문에는 ${p[0].slice(2)}의 힘(${p[1]})이 핵심이에요. 이 힘은 ${s[0].slice(2)}처럼 ${s[1]} 드러나고, 특히 ${h[0]}(${h[1]})에서 변화가 보여요. ${[3, 5, 0].includes(PLANET.indexOf(p)) ? "긍정적인 흐름이니 먼저 움직여 보세요." : [6, 4, 9].includes(PLANET.indexOf(p)) ? "쉽진 않지만, 버티면 단단해지는 흐름이에요." : "새로운 관점으로 보면 답이 보여요."}` })]),
        el("button", { class: "btn btn-ghost btn-block", onclick: () => repaint() }, [el("span", { text: "🎲 다시 굴리기 (코인 1개)" })]),
      );
    } });
}

/* ======================= 12. 운세 일기장 ======================= */
const MOODS = [["😆", "최고"], ["🙂", "좋음"], ["😐", "보통"], ["😢", "슬픔"], ["😡", "화남"], ["😴", "피곤"]];
export function renderDiary({ navigate }) {
  return page({ navigate, title: "운세 일기장", h: "오늘의 기분과 운세를 한 줄로", desc: "매일 기분과 한 줄 일기를 남기면, 그날의 일진·운세 점수와 함께 쌓여요. 내 기분과 운의 흐름을 비교해 봐요. 무료!", back: "/", needBirth: false,
    build(host, { profile, my }) {
      const KEY = "hm.diary.v1"; let db = {}; try { db = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch {}
      const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} };
      const now = new Date(); let Y = now.getFullYear(), M = now.getMonth() + 1, sel = now.getDate();
      const wrap = el("div", { class: "section-gap" });
      host.append(wrap);
      function paint() {
        clear(wrap);
        const scores = {}; try { monthScores(profile, Y, M).forEach((x) => { scores[x.day] = x.score; }); } catch {}
        const dim = new Date(Y, M, 0).getDate(), first = new Date(Y, M - 1, 1).getDay();
        const key = (d) => `${Y}-${M}-${d}`;
        const cnt = {}; for (let d = 1; d <= dim; d++) { const e = db[key(d)]; if (e && e.m != null) cnt[e.m] = (cnt[e.m] || 0) + 1; }
        wrap.append(el("div", { class: "panel" }, [
          el("div", { class: "cal-nav" }, [
            el("button", { class: "cal-arrow", "aria-label": "이전 달", onclick: () => { M--; if (M < 1) { M = 12; Y--; } sel = 1; paint(); } }, [el("span", { text: "‹" })]),
            el("span", { class: "serif", style: "font-size:1.15rem;", text: `${Y}년 ${M}월` }),
            el("button", { class: "cal-arrow", "aria-label": "다음 달", onclick: () => { M++; if (M > 12) { M = 1; Y++; } sel = 1; paint(); } }, [el("span", { text: "›" })]),
          ]),
          el("div", { class: "dy-grid" }, [
            ..."일월화수목금토".split("").map((w) => el("span", { class: "dy-w", text: w })),
            ...Array.from({ length: first }, () => el("span")),
            ...Array.from({ length: dim }, (_, i) => { const d = i + 1, e = db[key(d)];
              return el("button", { type: "button", class: "dy-d" + (d === sel ? " on" : "") + (Y === now.getFullYear() && M === now.getMonth() + 1 && d === now.getDate() ? " today" : ""), onclick: () => { sel = d; paint(); } }, [
                el("span", { class: "dy-n", text: String(d) }), el("span", { class: "dy-m", text: e && e.m != null ? MOODS[e.m][0] : scores[d] ? String(scores[d]) : "" }),
              ]); }),
          ]),
          el("p", { class: "tiny muted", text: `이달 기분: ${MOODS.map((m, i) => (cnt[i] ? `${m[0]}${cnt[i]}` : null)).filter(Boolean).join(" ") || "아직 기록이 없어요"} · 숫자는 그날 운세 점수` }),
        ]));
        const e = db[key(sel)] || {};
        const txt = el("textarea", { class: "input", rows: "3", maxlength: "200", placeholder: "오늘 하루를 한 줄로 남겨요" }); txt.value = e.t || "";
        wrap.append(el("div", { class: "panel section-gap" }, [
          el("p", { class: "eyebrow", text: `${M}월 ${sel}일 · 운세 ${scores[sel] || "-"}점` }),
          el("div", { class: "dy-moods" }, MOODS.map(([em, lb], i) => el("button", { type: "button", class: "dy-mood" + (e.m === i ? " on" : ""), onclick: () => { db[key(sel)] = { ...(db[key(sel)] || {}), m: i }; save(); paint(); } }, [el("span", { text: em }), el("small", { text: lb })]))),
          txt,
          el("button", { class: "btn btn-primary btn-block", onclick: () => { db[key(sel)] = { ...(db[key(sel)] || {}), t: txt.value.trim() }; save(); toast("일기를 저장했어요 📔"); paint(); } }, [el("span", { text: "저장" })]),
          el("p", { class: "tiny muted", text: "일기는 이 기기 브라우저에만 저장돼요." }),
        ]));
      }
      paint();
    } });
}

/* ======================= 13. 화개살 ======================= */
/* 삼합의 마지막 글자(묘고) — 寅午戌→戌 · 申子辰→辰 · 巳酉丑→丑 · 亥卯未→未 */
const SAMHAP_G = { 2: 0, 6: 0, 10: 0, 8: 1, 0: 1, 4: 1, 5: 2, 9: 2, 1: 2, 11: 3, 3: 3, 7: 3 };
const HWAGAE_OF = [10, 4, 1, 7];
const YEOKMA_OF = [8, 2, 11, 5];
function salHits(profile, table) {
  const P = pillarsOf(profile);
  const targets = [...new Set([profile.pillars.year.branchIdx, profile.pillars.day.branchIdx].map((b) => table[SAMHAP_G[b]]))];
  return { P, targets, hits: P.filter((x) => targets.includes(x.p.branchIdx)) };
}
function salYears(targets) {
  const Y = new Date().getFullYear(); const out = [];
  for (let y = Y; y < Y + 12; y++) if (targets.includes(yearGZ(y).b)) out.push(y);
  return { Y, out };
}
export function renderHwagae({ navigate }) {
  return page({ navigate, title: "화개살 체크", h: "나에게 화개살이 있을까?", desc: "화개살(華蓋殺)은 ‘꽃 덮개’ — 예술·학문·종교·고독의 별이에요. 사주 어디에 있는지, 그 기운이 짙어지는 해는 언제인지 알려 드려요.", who: "누구의 화개살을 볼까?",
    costKey: "hwagae", itemId: (my) => `hwagae:${sig(my)}`, build(host, { profile }) {
      const { targets, hits } = salHits(profile, HWAGAE_OF);
      const { Y, out: years } = salYears(targets);
      const kuCount = pillarsOf(profile).filter((x) => [1, 4, 7, 10].includes(x.p.branchIdx)).length; // 진술축미(고지)
      const level = hits.length >= 2 ? "짙게" : hits.length ? "은은하게" : "없어요";
      const LIFE = { year: "조상·집안에서 이어진 학문·종교의 결이 있어요. 어릴 때부터 생각이 깊은 아이였을 수 있어요.", month: "사회에서 전문성·예술성으로 인정받는 타입. 한 분야를 깊게 파면 이름이 나요.", day: "혼자만의 시간이 꼭 필요한 사람. 배우자와도 ‘각자의 방’이 있어야 오래 가요.", hour: "나이 들수록 정신적인 세계가 깊어져요. 말년에 공부·수행·창작으로 빛나는 타입." };
      host.append(...[
        hero("화개살", hits.length ? `있어요 · ${level}` : "원국엔 없어요", hits.length ? "혼자 깊어질수록 빛나는, 예술·학문의 별을 가진 사주예요." : "화개 글자가 들어오는 해에 그 기운을 빌려 쓸 수 있어요."),
        card("화개살 (華蓋殺) 위치", [
          hits.length ? el("p", { text: `${hits.map((x) => `${x.nm} ${gz(x.p.stemIdx, x.p.branchIdx)}`).join(", ")}에 화개가 있어요.` }) : el("p", { text: `내 화개 글자는 ${targets.map((b) => `${BH[b]}(${BK[b]})`).join("·")}인데, 원국 네 기둥엔 없어요.` }),
          ...hits.map((x) => el("p", { class: "tiny" }, [el("b", { text: `${x.nm} 화개 · ` }), document.createTextNode(LIFE[x.k])])),
          el("p", { class: "tiny muted", text: "보는 법: 년지·일지가 속한 삼합의 마지막 글자(寅午戌→戌(술) · 申子辰→辰(진) · 巳酉丑→丑(축) · 亥卯未→未(미))가 화개예요." }),
        ]),
        card("이런 사람이에요", [el("ul", {}, (hits.length ? [
          "겉은 화려해도 속은 조용하고 생각이 깊어요.", "예술·디자인·글·연구·종교·상담처럼 ‘깊이’가 필요한 일에 재능이 있어요.",
          "사람이 많으면 금방 지치고, 혼자 충전하는 시간이 꼭 필요해요.", "한번 빠지면 끝까지 파고드는 덕후 기질이 있어요.",
        ] : [
          "사람들 속에서 에너지를 얻는 편이라 고독감이 오래가진 않아요.", "깊이가 필요할 땐 일부러 혼자 몰입하는 시간을 만들어 주세요.",
        ]).map((t) => el("li", { text: t })))]),
        kuCount >= 2 ? card("고지(庫支)가 많은 사주", [el("p", { text: `진·술·축·미(辰戌丑未) 글자가 ${kuCount}개 — ‘창고’가 많은 사주라 경험과 지식을 차곡차곡 쌓아 두는 힘이 커요. 화개의 깊이와 잘 어울려요.` })]) : null,
        card("화개 기운이 짙어지는 해", [
          el("div", { class: "sp-years" }, years.map((y) => el("span", { class: y === Y ? "now" : "", text: `${y}년 ${BH[yearGZ(y).b]}(${BK[yearGZ(y).b]})` }))),
          el("p", { class: "tiny muted", text: "공부·자격증·창작·수련에 몰입하기 좋은 해예요. 대신 외로움을 타기 쉬우니 가까운 사람과의 연락은 일부러 챙기세요." }),
        ]),
        el("div", { class: "block tag-warn" }, [el("span", { class: "block-label", text: "화개를 잘 쓰는 법" }),
          el("ul", {}, ["외로움을 ‘몰입 시간’으로 바꾸기 — 공부·창작 루틴이 운을 열어요.", "혼자 있는 시간을 미안해하지 말고 주변에 미리 말해 두기.", "종교·명상·글쓰기처럼 마음을 정리하는 습관이 잘 맞아요."].map((t) => el("li", { text: t })))]),
        noticeBox("info", "신살은 성향을 읽는 참고 지표예요. 좋고 나쁨이 아니라 ‘어떻게 쓰느냐’가 핵심이에요."),
      ].filter(Boolean));
    } });
}

/* ======================= 14. 역마살 ======================= */
export function renderYeokma({ navigate }) {
  return page({ navigate, title: "역마살 체크", h: "나에게 역마살이 있을까?", desc: "역마살(驛馬殺)은 이동·변화·해외의 별이에요. 사주 어디에 있는지, 움직임이 커지는 해는 언제인지 알려 드려요.", who: "누구의 역마살을 볼까?",
    costKey: "yeokma", itemId: (my) => `yeokma:${sig(my)}`, build(host, { profile }) {
      const { targets, hits } = salHits(profile, YEOKMA_OF);
      const { Y, out: years } = salYears(targets);
      const chung = hits.some((x) => pillarsOf(profile).some((o) => o !== x && Math.abs(o.p.branchIdx - x.p.branchIdx) === 6));
      const LIFE = { year: "어릴 때 이사·전학이 잦았거나, 집안 자체가 이동이 많은 편이에요.", month: "일 때문에 많이 움직여요. 출장·외근·해외 업무·무역이 잘 맞아요.", day: "한곳에 오래 머물면 답답해하는 타입. 배우자와 여행·이동이 많은 삶이에요.", hour: "나이 들수록 활동 반경이 넓어져요. 말년에 해외·지방살이 인연이 있어요." };
      host.append(
        hero("역마살", hits.length ? (hits.length >= 2 || chung ? "있어요 · 강하게" : "있어요") : "원국엔 없어요", hits.length ? "움직일수록 운이 트이는, 길 위의 사주예요." : "역마 글자가 들어오는 해에 이사·이직·여행 운이 커져요."),
        card("역마살 (驛馬殺) 위치", [
          hits.length ? el("p", { text: `${hits.map((x) => `${x.nm} ${gz(x.p.stemIdx, x.p.branchIdx)}`).join(", ")}에 역마가 있어요.` }) : el("p", { text: `내 역마 글자는 ${targets.map((b) => `${BH[b]}(${BK[b]})`).join("·")}인데, 원국 네 기둥엔 없어요.` }),
          ...hits.map((x) => el("p", { class: "tiny" }, [el("b", { text: `${x.nm} 역마 · ` }), document.createTextNode(LIFE[x.k])])),
          chung ? el("p", { class: "tiny", text: "역마가 충(沖)을 맞아 ‘달리는 말’이 됐어요 — 변화가 빠르고 크게 와요." }) : null,
          el("p", { class: "tiny muted", text: "보는 법: 년지·일지가 속한 삼합의 첫 글자를 충하는 글자(寅午戌→申(신) · 申子辰→寅(인) · 巳酉丑→亥(해) · 亥卯未→巳(사))가 역마예요." }),
        ]),
        card("잘 맞는 일 · 생활", [el("ul", {}, (hits.length ? [
          "영업·무역·여행·항공·물류·외근직·유튜버처럼 움직이는 일", "해외 유학·워홀·주재원 인연이 있어요.", "가만히 있으면 운이 막히는 느낌 — 산책·운동·여행으로 기운을 돌려요.",
        ] : [
          "한곳에 뿌리내리고 쌓아 가는 힘이 있어요.", "변화가 필요할 땐 역마의 해를 노려 이사·이직을 계획해 보세요.",
        ]).map((t) => el("li", { text: t })))]),
        card("움직임이 커지는 해", [
          el("div", { class: "sp-years" }, years.map((y) => el("span", { class: y === Y ? "now" : "", text: `${y}년 ${BH[yearGZ(y).b]}(${BK[yearGZ(y).b]})` }))),
          el("p", { class: "tiny muted", text: "이사·이직·유학·여행이 생기기 쉬운 해예요. 계약·교통·짐은 한 번 더 확인하세요." }),
        ]),
        noticeBox("info", "신살은 성향을 읽는 참고 지표예요. 좋고 나쁨이 아니라 ‘어떻게 쓰느냐’가 핵심이에요."),
      );
    } });
}

/* ======================= 15. 헤어진 이유 · 재회 궁합 ======================= */
export function renderReunionDeep({ navigate }) {
  return page({ navigate, title: "헤어진 이유 · 재회 궁합", h: "우리는 왜 헤어졌고, 다시 만날 수 있을까?", desc: "상대 사주를 넣으면 두 사람이 엇갈린 이유, 재회 궁합 점수, 재회의 문이 열리는 달까지 풀어 드려요.", who: "누구의 입장에서 볼까?",
    costKey: "reunioncompat", itemId: (my) => `reunioncompat:${sig(my)}`, build(host, { profile, my }) {
      const myG = my.gender === "male" ? "male" : "female";
      let pick = null, pG = myG === "male" ? "female" : "male";
      const people = getPeople().filter((p) => p.input && p.input.birthDate);
      const nameI = el("input", { class: "input", maxlength: "20", placeholder: "상대 이름 (예: 그 사람)" });
      const lunarC = el("input", { type: "checkbox" });
      const dateI = ymdPicker("", { mode: () => ({ lunar: lunarC.checked }) });
      const timeI = el("input", { class: "input", type: "time", "aria-label": "상대 태어난 시간" });
      const gWrap = el("div", { class: "rd-seg" });
      const paintG = () => { clear(gWrap); [["female", "여성"], ["male", "남성"]].forEach(([v, lb]) => gWrap.append(el("button", { type: "button", class: "rd-seg-btn" + (pG === v ? " on" : ""), onclick: () => { pG = v; paintG(); } }, [el("span", { text: lb })]))); };
      paintG();
      const startI = ymdPicker("", { label: "사귄 날" }), endI = ymdPicker("", { label: "헤어진 날" });
      const chipsHost = el("div", { class: "rd-people" });
      const paintChips = () => { clear(chipsHost); people.forEach((p) => chipsHost.append(el("button", { type: "button", class: "chip" + (pick === p ? " is-selected" : ""), onclick: () => { pick = pick === p ? null : p; paintChips(); manual.hidden = !!pick; } }, [el("span", { text: `${p.name}${p.relation ? " · " + p.relation : ""}` })]))); };
      const manual = el("div", { class: "rd-manual" }, [
        el("label", { class: "tiny muted", text: "상대 이름" }), nameI,
        el("label", { class: "tiny muted", text: "상대 생년월일" }), dateI,
        el("label", { class: "rd-check tiny" }, [lunarC, el("span", { text: "음력으로 입력" })]),
        el("label", { class: "tiny muted", text: "태어난 시간 (모르면 비워 두기)" }), timeI,
        el("label", { class: "tiny muted", text: "상대 성별" }), gWrap,
      ]);
      const out = el("div", { class: "section-gap" });
      host.append(el("div", { class: "panel section-gap rd-form" }, [
        el("p", { style: "font-weight:700;", text: "그 사람의 사주" }),
        el("p", { class: "tiny muted", text: (people.length ? "저장한 사람에서 고르거나, 아래에 직접 입력하세요. " : "") + NEW_PERSON_NOTE }),
        people.length ? chipsHost : null,
        manual,
        el("details", { class: "rd-more" }, [
          el("summary", { text: "사귄 날 · 헤어진 날 넣기 (선택 · 더 정확해져요)" }),
          el("label", { class: "tiny muted", text: "사귀기 시작한 날" }), startI,
          el("label", { class: "tiny muted", text: "헤어진 날" }), endI,
        ]),
        el("button", { class: "btn btn-primary btn-block", onclick: run }, [el("span", { text: "헤어진 이유 · 재회 궁합 보기 🔁" })]),
      ].filter(Boolean)), out);
      paintChips();

      function run() {
        clear(out);
        let input, nm;
        if (pick) { input = { ...pick.input }; nm = pick.name || "그 사람"; }
        else {
          if (!dateI.value) { out.append(noticeBox("warn", "상대 생년월일을 골라 주세요. 모르면 저장한 사람에서 골라도 돼요.")); return; }
          nm = nameI.value.trim() || "그 사람";
          input = { calendarType: lunarC.checked ? "lunar" : "solar", birthDate: dateI.value, birthTime: timeI.value || "", timeUnknown: !timeI.value, gender: pG, timezone: "Asia/Seoul" };
          const paid = chargeNewPeople([{ input, name: nm, relation: "전 연인" }], { navigate });
          if (!paid.ok) { out.append(noticeBox("warn", "새로 입력하는 사람은 코인 10개가 필요해요. 저장한 사람에서 고르면 무료예요.")); return; }
        }
        let b; try { b = computeSaju(input); } catch { out.append(noticeBox("warn", "상대 생년월일을 다시 확인해 주세요.")); return; }
        notePair(`나 × ${nm} · 재회 궁합`, { log: true });
        const theirG = input.gender === "male" ? "male" : "female";
        const L = { a: "나", b: nm };
        const C = analyzeCompat(profile, b, L), H = harmonyBetween(profile, b, L);
        const now = new Date(), Y = now.getFullYear();
        const T = reunionTiming(profile, myG, Y, now.getMonth() + 1, 18);
        const O1 = reunionOutlook(profile, myG, Y), O2 = reunionOutlook(b, theirG, Y);
        const both = O1.years.filter((y, i) => y.favorable && O2.years[i].favorable).map((y) => y.year);
        let sc = C.score;
        if (H.ganhap) sc += 8;
        if (["육합", "삼합"].includes(H.dayRel)) sc += 6;
        if (H.dayRel === "충") sc += 2; // 끌림·재결합 반복형
        if (["형", "해", "자형"].includes(H.dayRel)) sc -= 7;
        sc += both.length * 4 + (T.best.length ? 3 : -4);
        sc = Math.max(18, Math.min(96, Math.round(sc)));
        const verdict = sc >= 80 ? "다시 이어질 끈이 꽤 단단해요" : sc >= 65 ? "문은 열려 있어요 · 바뀐 모습이 열쇠" : sc >= 50 ? "가능은 하지만 같은 이유를 먼저 풀어야 해요" : "재회보다 정리가 더 편한 결이에요";
        const B1 = endI.value ? analyzeBreakup(profile, endI.value, myG) : null;
        const B2 = endI.value ? analyzeBreakup(b, endI.value, theirG) : null;
        const S1 = startI.value ? analyzeStart(profile, startI.value, myG) : null;
        const list = (arr) => el("ul", {}, (Array.isArray(arr) ? arr : [arr]).filter(Boolean).map((t) => el("li", { text: t })));
        const elemWhy = { a_ctrl_b: `내 오행이 ${nm}의 오행을 누르는(극) 관계라, 나는 이끌려 했고 ${nm}은(는) 답답함을 느끼기 쉬웠어요.`, b_ctrl_a: `${nm}의 오행이 내 오행을 누르는(극) 관계라, 나는 맞춰 주다 지치고 ${nm}은(는) 서운함을 몰랐을 수 있어요.`, same: "오행이 같은 비화(比和) 관계라 닮은 만큼 고집도 같아, 누구도 먼저 물러서지 않았을 수 있어요.", a_gen_b: `내가 ${nm}을(를) 생(生)해 주는 관계라, 주는 쪽인 내가 먼저 지치기 쉬웠어요.`, b_gen_a: `${nm}이(가) 나를 생(生)해 주는 관계라, ${nm} 쪽이 먼저 지치기 쉬웠어요.` }[C.type];
        out.append(...[
          hero(`나 × ${nm} · 재회 궁합`, `${sc}점`, verdict),
          card("💔 우리가 엇갈린 이유 — 두 사주의 결", [
            el("p", { text: elemWhy }),
            el("p", { class: "tiny", text: `배우자 자리(일지) ‘${H.dayRel}’ · 띠 ‘${H.yearRel}’${H.ganhap ? " · 일간 천간합" : ""}` }),
            list(H.reasons.slice(H.ganhap ? 0 : 0)),
            C.friction && C.friction.length ? el("p", { class: "eyebrow", style: "margin-top:8px;", text: "자주 부딪혔을 지점" }) : null,
            C.friction && C.friction.length ? list(C.friction.slice(0, 3)) : null,
          ]),
          B1 ? card(`그때(${B1.when}) 나의 기운 · ${B1.yearGZ} ${B1.yearGod}`, [list(B1.reasons)]) : null,
          B2 ? card(`그때 ${nm}의 기운 · ${B2.yearGod}${B2.daeunGod ? " / 대운 " + B2.daeunGod : ""}`, [list(B2.reasons)]) : null,
          S1 ? card(`처음 끌렸던 이유 (${S1.when || ""})`, [list(S1.reasons)]) : null,
          !B1 ? el("p", { class: "tiny muted", text: "‘헤어진 날’을 넣으면 그 시기 두 사람의 기운까지 풀어 드려요." }) : null,
          card("🔁 재회 궁합", [
            el("p", { text: H.reunionHint }),
            el("p", { class: "eyebrow", style: "margin-top:8px;", text: "그래도 잘 맞는 점" }), list((C.good || []).slice(0, 3)),
            C.complement ? el("p", { class: "tiny", text: C.complement }) : null,
          ]),
          card("📅 재회의 문이 열리는 달 (앞으로 18개월)", [
            T.best.length ? el("div", { class: "sp-years" }, T.best.map((w) => el("span", { text: w.label }))) : null,
            ...T.best.map((w) => el("p", { class: "tiny" }, [el("b", { text: `${w.label} · ` }), document.createTextNode(w.note)])),
            el("p", { class: "tiny muted", text: T.summary }),
          ]),
          card("두 사람이 함께 열리는 해", [
            el("div", { class: "rd-years" }, O1.years.map((y, i) => el("div", { class: "rd-year" + (y.favorable && O2.years[i].favorable ? " on" : "") }, [
              el("b", { text: `${y.year}년` }), el("span", { class: "tiny", text: `나 ${y.favorable ? "○" : "·"}  ${nm} ${O2.years[i].favorable ? "○" : "·"}` }),
            ]))),
            el("p", { class: "tiny muted", text: both.length ? `${both.join("년, ")}년은 두 사람 모두 관계가 열리는 흐름이에요. 연락·재회를 시도한다면 이때가 가장 자연스러워요.` : "두 사람의 관계 운이 같은 해에 겹치진 않아요. 한쪽이 열리는 해에 가볍게 안부부터 시작해 보세요." }),
          ]),
          el("div", { class: "block tag-warn" }, [el("span", { class: "block-label", text: "다시 만난다면 바꿀 것" }), list(C.advice)]),
          noticeBox("info", "사주는 ‘그 시기의 기운’을 읽는 참고일 뿐, 누구의 잘못도 재회도 확정하지 않아요. 상대의 마음과 선택을 가장 존중해 주세요."),
        ].filter(Boolean));
        if (!pick) { const offer = savePersonOffer(input, { name: nm, relation: "전 연인", navigate }); if (offer) out.append(offer); }
        out.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } });
}


/* =========================================================
   재미로 보는 연애 사주 (무료) — 다음 연애 카운트다운 · 내 눈높이 · 금사빠 지수 · 질투 지수
   · 연락 스타일 · 플러팅 레벨 · 이별 회복 속도 · 연애 세포 생존율
   작성: HAE · 모두 재미·참고용
   ========================================================= */
export const LOVE_FUN = [
  { id: "countdown", em: "⏳", name: "다음 연애 카운트다운", blurb: "다음 인연까지 남은 시간" },
  { id: "eyes", em: "👀", name: "내 눈은 얼마나 높을까", blurb: "이상형 눈높이 해발 몇 m?" },
  { id: "fast", em: "💘", name: "금사빠 지수", blurb: "금방 사랑에 빠지는 사람?" },
  { id: "jealous", em: "🔥", name: "질투 지수", blurb: "티 내는 질투 · 속앓이 질투" },
  { id: "reply", em: "💬", name: "나의 연락 스타일", blurb: "칼답? 장문? 읽고 생각형?" },
  { id: "flirt", em: "😉", name: "플러팅 레벨", blurb: "나의 꼬시기 실력은 Lv 몇?" },
  { id: "recover", em: "🩹", name: "이별 회복 속도", blurb: "헤어지면 며칠이면 괜찮아질까" },
  { id: "cells", em: "🧬", name: "연애 세포 생존율", blurb: "내 연애 세포 아직 살아 있니?" },
  { id: "jobnow", em: "💼", name: "이번 달 취업 가능할까?", blurb: "이번 달 합격 가능성 · 서류·면접 좋은 날", group: "work" },
];
const ELK = { wood: "목(木)", fire: "화(火)", earth: "토(土)", metal: "금(金)", water: "수(水)" };
function godCounts(profile) {
  const ds = profile.pillars.day.stemIdx, raw = [];
  ["year", "month", "day", "hour"].forEach((k) => {
    const p = profile.pillars[k]; if (!p) return;
    if (k !== "day") raw.push(tenGod(ds, p.stemIdx));
    raw.push(tenGod(ds, BR_MAIN[p.branchIdx]));
  });
  const g = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  raw.forEach((x) => { g[grp(x)]++; });
  const n = (name) => raw.filter((x) => x === name).length;
  return { g, n, raw };
}
const clampN = (v, a, b) => Math.max(a, Math.min(b, Math.round(v)));
const meter = (pct, label) => el("div", { class: "lf-meter" }, [el("div", { class: "lf-bar" }, [el("i", { style: `width:${pct}%` })]), label ? el("span", { class: "tiny muted", text: label }) : null].filter(Boolean));
const list = (arr) => el("ul", {}, arr.filter(Boolean).map((t) => el("li", { text: t })));
const hasDohwa = (profile) => { const d = [DOHWA[profile.pillars.year.branchIdx], DOHWA[profile.pillars.day.branchIdx]]; return ["year", "month", "day", "hour"].some((k) => profile.pillars[k] && d.includes(profile.pillars[k].branchIdx)); };

/* 달마다 연애 신호 — 배우자 별 · 도화 · 일지 합 */
function loveMonths(profile, my, months = 36) {
  const ds = profile.pillars.day.stemIdx, db = profile.pillars.day.branchIdx;
  const spouse = (my.gender || "female") === "female" ? "관성" : "재성";
  const dohwa = [DOHWA[profile.pillars.year.branchIdx], DOHWA[db]];
  const now = new Date(), out = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 15);
    const Y = d.getFullYear(), M = d.getMonth() + 1;
    let t; try { t = computeSaju({ calendarType: "solar", birthDate: `${Y}-${String(M).padStart(2, "0")}-15`, birthTime: "12:00", timeUnknown: true, gender: "male", timezone: "Asia/Seoul" }); } catch { continue; }
    const mp = t.pillars.month, yp = t.pillars.year;
    let pt = 0; const why = [];
    if (grp(tenGod(ds, mp.stemIdx)) === spouse) { pt += 2; why.push("배우자 별이 뜨는 달"); }
    if (grp(tenGod(ds, BR_MAIN[mp.branchIdx])) === spouse) { pt += 1; why.push("인연 기운"); }
    if (dohwa.includes(mp.branchIdx)) { pt += 2; why.push("도화 달"); }
    if (HAP6[db] === mp.branchIdx) { pt += 2; why.push("내 배우자 자리와 합"); }
    if (grp(tenGod(ds, yp.stemIdx)) === spouse || dohwa.includes(yp.branchIdx)) { pt += 1; why.push("연애운 좋은 해"); }
    out.push({ Y, M, pt, why, start: new Date(Y, M - 1, 1) });
  }
  return out;
}

/* 인연을 '끌어오는' 날 — 연인의 별을 낳아 주는 기운
   남자: 식신생재(食神生財 · 식신이 재성을 낳음) — 매력·여유가 살아나 연인의 별(재성)을 불러오는 날
   여자: 재생관(財生官 · 재성이 관성을 낳음) — 내 쪽에서 챙기고 베푸는 마음이 연인의 별(관성)을 키우는 날 */
function charmOf(ds, stemIdx, spouse) {
  const g = tenGod(ds, stemIdx);
  if (spouse === "재성" && g === "식신") return { god: g, short: "식신생재(食神生財) — 매력이 살아나 인연을 끌어오는 날", name: "식신생재(食神生財)" };
  if (spouse === "관성" && grp(g) === "재성") return { god: g, short: "재생관(財生官) — 베푸는 마음이 인연을 키우는 날", name: "재생관(財生官)" };
  return null;
}
function charmDays(profile, my, count = 4, days = 75) {
  const ds = profile.pillars.day.stemIdx, db = profile.pillars.day.branchIdx;
  const spouse = (my.gender || "female") === "female" ? "관성" : "재성";
  const dohwa = [DOHWA[profile.pillars.year.branchIdx], DOHWA[db]];
  const now = new Date(), out = [];
  for (let i = 1; i <= days && out.length < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    let t; try { t = computeSaju({ calendarType: "solar", birthDate: ymd, birthTime: "12:00", timeUnknown: false, gender: "male", timezone: "Asia/Seoul" }); } catch { continue; }
    const dp = t.pillars.day, ch = charmOf(ds, dp.stemIdx, spouse);
    if (!ch) continue;
    const plus = [];
    if (dohwa.includes(dp.branchIdx)) plus.push("도화까지 겹침");
    if (HAP6[db] === dp.branchIdx) plus.push("내 일지와 합");
    out.push({ date: d, dayGz: gz(dp.stemIdx, dp.branchIdx), god: ch.god, name: ch.name, plus });
  }
  return out;
}

/* 날마다 — 그 달(절기 기준 월주)과 그 날(일진)에 인연 신호가 함께 겹치는 첫날을 찾음 */
function loveDayTarget(profile, my, days = 150) {
  const ds = profile.pillars.day.stemIdx, db = profile.pillars.day.branchIdx;
  const spouse = (my.gender || "female") === "female" ? "관성" : "재성";
  const dohwa = [DOHWA[profile.pillars.year.branchIdx], DOHWA[db]];
  const now = new Date(); let best = null, firstGood = null;
  for (let i = 1; i <= days; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    let t; try { t = computeSaju({ calendarType: "solar", birthDate: ymd, birthTime: "12:00", timeUnknown: false, gender: "male", timezone: "Asia/Seoul" }); } catch { continue; }
    const mp = t.pillars.month, dp = t.pillars.day, yp = t.pillars.year;
    let mPt = 0, dPt = 0; const why = [];
    if (grp(tenGod(ds, mp.stemIdx)) === spouse) { mPt += 2; why.push("배우자 별이 뜨는 달"); }
    if (grp(tenGod(ds, BR_MAIN[mp.branchIdx])) === spouse) mPt += 1;
    if (dohwa.includes(mp.branchIdx)) { mPt += 2; why.push("도화 달"); }
    if (HAP6[db] === mp.branchIdx) { mPt += 2; why.push("배우자 자리와 합하는 달"); }
    if (grp(tenGod(ds, yp.stemIdx)) === spouse || dohwa.includes(yp.branchIdx)) mPt += 1;
    { const dg = tenGod(ds, dp.stemIdx), proper = spouse === "관성" ? "정관" : "정재"; // 정관(여)·정재(남) = 정식 배우자 별 → 더 강하게
      if (dg === proper) { dPt += 3; why.push(`${proper} 일진 — 정식 인연의 별`); } else if (grp(dg) === spouse) { dPt += 2; why.push("배우자 별 일진"); } }
    if (dohwa.includes(dp.branchIdx)) { dPt += 2; why.push("도화 일진"); }
    if (HAP6[db] === dp.branchIdx) { dPt += 2; why.push("내 일지와 합"); }
    { const ch = charmOf(ds, dp.stemIdx, spouse); if (ch) { dPt += 1; why.push(ch.short); } }
    const x = { date: d, mPt, dPt, pt: mPt + dPt, why, dayGz: gz(dp.stemIdx, dp.branchIdx) };
    if (!firstGood && mPt >= 4 && dPt >= 3) firstGood = x;
    if (!best || x.pt > best.pt) best = x;
    if (firstGood) break;
  }
  return firstGood || best;
}

function loveFunBuild(id) {
  return (host, { profile, my, S }) => {
    const E = profile.elementCounts || {}, C = godCounts(profile), nm = my.name || "나";
    const dom = (profile.dominant && profile.dominant[0] && profile.dominant[0].key) || profile.dayMasterElem;
    const dh = hasDohwa(profile);
    if (id === "countdown") {
      const ms = loveMonths(profile, my);
      const T = loveDayTarget(profile, my);
      const target = new Date(T.date.getFullYear(), T.date.getMonth(), T.date.getDate());
      const first = { Y: target.getFullYear(), M: target.getMonth() + 1, why: T.why };
      const top = ms.filter((x) => x.pt >= 4).slice(0, 4);
      const clock = el("div", { class: "lf-clock" });
      const tickOnce = () => {
        const diff = Math.max(0, target - new Date());
        const d = Math.floor(diff / 864e5), h = Math.floor(diff / 36e5) % 24, m = Math.floor(diff / 6e4) % 60, sec = Math.floor(diff / 1e3) % 60;
        clear(clock);
        [[d, "일"], [h, "시간"], [m, "분"], [sec, "초"]].forEach(([v, u]) => clock.append(el("div", { class: "lf-cd" }, [el("b", { text: String(v).padStart(u === "일" ? 1 : 2, "0") }), el("small", { text: u })])));
      };
      tickOnce();
      const iv = setInterval(() => { if (!clock.isConnected) { clearInterval(iv); return; } tickOnce(); }, 1000);
      host.append(
        el("div", { class: "panel panel-gold sp-hero" }, [
          el("p", { class: "eyebrow", text: `${nm}님의 다음 인연의 날까지` }), clock,
          el("p", { class: "muted", text: `${first.Y}년 ${first.M}월 ${target.getDate()}일 · ${T.dayGz}일 — ${[...new Set(first.why)].join(" · ") || "조용히 인연이 스며드는 날"}` }),
          el("p", { class: "tiny muted", text: "그 달(절기 기준)과 그 날(일진)에 인연 신호가 함께 겹치는 첫날까지 세어요." }),
        ].filter(Boolean)),
        card("인연이 오는 달 (앞으로 3년)", [top.length ? el("div", { class: "sp-tl" }, top.map((x, i) => el("div", { class: "sp-tl-row" }, [
          el("span", { class: "sp-tl-no", text: String(i + 1) }),
          el("div", {}, [el("b", { text: `${x.Y}년 ${x.M}월` }), el("p", { class: "tiny muted", text: x.why.join(" · ") })]),
          el("span", { class: "sp-tl-pt", text: stars(Math.min(5, x.pt)) }),
        ]))) : el("p", { class: "tiny", text: "3년 안에 아주 센 신호는 없지만, 그만큼 천천히 오래 가는 인연이 와요." })]),
        (() => {
          const cd = charmDays(profile, my), male = (my.gender || "female") !== "female";
          if (!cd.length) return null;
          const wk = ["일", "월", "화", "수", "목", "금", "토"];
          return card(male ? "매력이 살아나는 날 · 식신생재(食神生財)" : "인연을 키우는 날 · 재생관(財生官)", [
            el("p", { class: "tiny muted", text: male
              ? "식신(食神)은 말솜씨 · 표정 · 여유처럼 내가 밖으로 드러내는 기운이에요. 식신이 연인의 별인 재성(財星)을 낳아서, 이런 날엔 매력이 자연스럽게 묻어나 인연을 끌어오기 쉬워요."
              : "재성(財星)은 챙기고 베푸는 기운이에요. 재성이 연인의 별인 관성(官星)을 키워 줘서, 이런 날엔 내가 먼저 건넨 마음이 인연으로 이어지기 쉬워요." }),
            el("div", { class: "sp-tl" }, cd.map((x, i) => el("div", { class: "sp-tl-row" }, [
              el("span", { class: "sp-tl-no", text: String(i + 1) }),
              el("div", {}, [
                el("b", { text: `${x.date.getMonth() + 1}월 ${x.date.getDate()}일 (${wk[x.date.getDay()]})` }),
                el("p", { class: "tiny muted", text: [`${x.dayGz}일 · ${x.god}`, ...x.plus].join(" · ") }),
              ]),
              el("span", { class: "sp-tl-pt", text: x.plus.length ? "★★" : "★" }),
            ]))),
            el("p", { class: "tiny muted", text: "카운트다운 날짜는 연인의 별이 직접 뜨는 날이 기준이고, 이 날들은 그 인연을 당겨 오는 날이에요." }),
          ]);
        })(),
        card("카운트다운을 당기는 법", [list([
          `${S.yongsinKr[0]} 기운(용신)과 친해지면 인연 운이 빨라져요.`,
          first.why.includes("도화 달") ? "도화 달엔 새로운 모임 · 소개팅 · 첫 데이트가 잘 풀려요. 약속을 많이 잡아 두세요." : "이 달엔 평소 안 가던 곳 · 새 취미 모임에 한 번 나가 보세요.",
          "이미 연애 중이라면, 그 달은 관계가 한 단계 깊어지는 시기로 읽어요.",
        ])]),
      );
      return;
    }
    if (id === "eyes") {
      let sc = 48 + C.n("정관") * 8 + C.n("정인") * 6 + C.n("편인") * 5 + (E.metal || 0) * 5 + (S.strength === "신강" ? 6 : -2) - C.g.식상 * 4 - (E.fire || 0) * 2;
      sc = clampN(sc, 18, 99);
      const MT = [[30, "동네 뒷산", 300], [45, "남산", 270 + 0], [58, "북한산", 836], [70, "한라산", 1947], [80, "백두산", 2744], [90, "몽블랑", 4808], [101, "에베레스트", 8848]];
      const mt = MT.find(([lim]) => sc < lim);
      const LOOK = { wood: ["성장 가능성 · 꿈", "같이 성장할 수 있는 사람인지, 목표가 있는지를 제일 먼저 봐요."], fire: ["외모 · 분위기 · 첫인상", "처음 3초의 설렘이 중요해요. 웃는 얼굴과 센스 있는 옷차림에 약해요."], earth: ["안정감 · 생활력", "믿음직한지, 약속을 잘 지키는지, 생활 습관이 반듯한지를 봐요."], metal: ["능력 · 매너 · 깔끔함", "일 잘하고 선 지키는 사람. 사소한 매너 하나에 마음이 열리고 닫혀요."], water: ["대화 · 지성 · 센스", "말이 통해야 끌려요. 대화가 재밌는 사람이면 다른 건 눈감아 줘요."] };
      const lk = LOOK[dom];
      const Y0 = new Date().getFullYear(), dohwaB = [DOHWA[profile.pillars.year.branchIdx], DOHWA[profile.pillars.day.branchIdx]];
      const lowYears = []; for (let y = Y0; y < Y0 + 8; y++) if (dohwaB.includes(yearGZ(y).b)) lowYears.push(y);
      host.append(
        hero(`${nm}님의 이상형 눈높이`, `해발 ${mt[2].toLocaleString()}m · ${mt[1]}급`, `눈높이 지수 ${sc}점`),
        el("div", { class: "panel sp-card" }, [meter(sc, sc >= 80 ? "구름 위에 있어요 ☁️" : sc >= 58 ? "꽤 높은 편이에요" : "생각보다 소박해요")]),
        card("제일 먼저 보는 것", [el("p", { style: "font-weight:700;", text: `👀 ${lk[0]}` }), el("p", { class: "tiny", text: lk[1] })]),
        card(`마음속 이상형 체크리스트 · ${Math.round(sc / 10)}개`, [el("p", { class: "tiny", text: sc >= 70 ? "정관·정인 기운이 단단해서 기준이 분명해요. 아무나 만나지 않는 대신, 한 번 정하면 오래 가요." : sc >= 45 ? "기준은 있지만 대화 몇 번에 금방 풀리는 타입이에요." : "조건보다 느낌! 마음이 가면 기준표는 바로 접어 둬요." })]),
        card("눈이 확 낮아지는(콩깍지) 해", [el("p", { class: "tiny", text: lowYears.length ? `${lowYears.join("년 · ")}년 — 도화가 들어와서 평소라면 안 볼 사람에게도 마음이 가요.` : "8년 안엔 크게 콩깍지 씌는 해가 없어요. 기준대로 고르는 편!" })]),
      );
      return;
    }
    if (id === "fast") {
      const sc = clampN(32 + (E.fire || 0) * 8 + (E.wood || 0) * 4 + C.g.식상 * 6 + (dh ? 12 : 0) - (E.metal || 0) * 4 - C.g.인성 * 3, 5, 99);
      const T = sc >= 75 ? ["불꽃 금사빠", "눈 마주치면 이미 시작! 빠르게 빠지고 온 힘을 다해요."] : sc >= 55 ? ["설렘 감지형", "좋은 사람이다 싶으면 2~3번 만남이면 마음이 기울어요."] : sc >= 35 ? ["천천히 데워지는 타입", "친구처럼 지내다 어느 날 문득 좋아졌다는 걸 알아요."] : ["철벽 장인", "마음 열기까지 오래 걸리지만, 열면 누구보다 깊어요."];
      host.append(hero("나의 금사빠 지수", `${sc}%`, T[0]), el("div", { class: "panel sp-card" }, [meter(sc)]), card("이런 연애를 해요", [el("p", { text: T[1] })]),
        card("사주 근거", [list([`화(火) ${E.fire || 0}개 · 목(木) ${E.wood || 0}개 — 감정이 빨리 달아오르는 기운`, `식상 ${C.g.식상}개 — 표현력·끌림`, dh ? "도화살이 있어 금방 빠지고 금방 빠져들게 해요" : "도화는 없어서 겉으론 차분해 보여요", (E.metal || 0) ? `금(金) ${E.metal}개 — 이성이 브레이크를 걸어 줘요` : null])]),
        card("금사빠 사용법", [list(sc >= 55 ? ["첫 한 달은 마음을 70%만 보여 주기", "설렘과 사람을 따로 보는 연습 — 세 번은 만나 보고 판단해요"] : ["마음이 0.5만 움직여도 표현해 보기 — 상대는 모를 수 있어요", "철벽은 장점이지만, 기회도 막아요"])]));
      return;
    }
    if (id === "jealous") {
      const sc = clampN(28 + C.g.비겁 * 8 + C.n("편관") * 7 + C.n("겁재") * 4 + (E.water || 0) * 3 + (E.fire || 0) * 3, 5, 99);
      const TY = { wood: ["경쟁심 폭발형", "‘내가 걔보다 못해?’ 비교가 먼저 떠올라요."], fire: ["바로 말하는 직진형", "서운하면 그 자리에서 말해요. 대신 뒤끝은 없어요."], earth: ["서운함 쌓아 두기형", "참고 참다 어느 날 한 번에 터져요."], metal: ["쿨한 척 체크형", "아무렇지 않은 척, 하지만 SNS 팔로우는 이미 확인 완료."], water: ["티 안 나는 속앓이형", "혼자 상상하고 혼자 결론 내리다 밤새 뒤척여요."] };
      const ty = TY[dom];
      host.append(hero("나의 질투 지수", `${sc}%`, ty[0]), el("div", { class: "panel sp-card" }, [meter(sc, sc >= 70 ? "질투 레이더 상시 가동 📡" : sc >= 45 ? "적당히 귀여운 질투" : "질투? 그게 뭐죠")]),
        card("이렇게 질투해요", [el("p", { text: ty[1] })]),
        card("질투가 커지는 순간", [list([C.g.비겁 >= 2 ? "연인이 나보다 친구·동료를 더 챙긴다고 느낄 때" : null, C.n("편관") ? "연락이 갑자기 뜸해질 때 — 불안이 상상을 키워요" : null, "옛 연인 이야기가 나올 때", "내가 모르는 약속이 생겼을 때"])]),
        card("건강한 질투 쓰는 법", [list(["‘질투 났어’를 귀엽게 말하는 게 숨기는 것보다 훨씬 좋아요", "확인보다 질문 — ‘누구야?’ 대신 ‘오늘 재밌었어?’"])]));
      return;
    }
    if (id === "reply") {
      const top = Object.entries(C.g).sort((a, b) => b[1] - a[1])[0][0];
      const RT = { 식상: ["수다쟁이 장문형", "한 번 답장하면 스크롤이 필요해요. 이모티콘·사진 폭격도 기본."], 재성: ["용건만 칼답형", "답은 빠른데 짧아요. ‘ㅇㅇ’ ‘ㄱㄱ’에 진심이 다 담겨 있어요."], 관성: ["정시 보고형", "출근·점심·퇴근·잘 자 — 하루 네 번 정확하게 연락해요."], 인성: ["읽고 생각하다 늦답형", "읽었지만 좋은 답을 고르느라 늦어요. 대신 답장은 정성 가득."], 비겁: ["기분파 몰아답형", "바쁠 땐 잠수, 한가하면 몰아서 열 개. 리듬이 내 마음대로."] };
      const BASE = { 식상: 6, 재성: 3, 관성: 25, 인성: 80, 비겁: 40 }; // 유형별 기본 답장 속도(분)
      const sp = clampN(BASE[top] * (1 + ((E.water || 0) - (E.fire || 0)) * 0.12), 1, 240);
      const t = RT[top];
      host.append(hero("나의 연락 스타일", t[0], `평균 답장 속도 약 ${sp >= 60 ? `${Math.round(sp / 60 * 10) / 10}시간` : `${sp}분`}${top === "비겁" ? " (기분 따라 들쭉날쭉)" : ""}`),
        card("이런 연락을 해요", [el("p", { text: t[1] })]),
        card("잘 맞는 연락 궁합", [el("p", { class: "tiny", text: { 식상: "말 많은 나를 잘 들어 주는 인성형(늦답형)과 의외로 찰떡이에요.", 재성: "답이 짧아도 서운해하지 않는 관성형(정시 보고형)이 편해요.", 관성: "규칙적인 리듬을 존중하는 재성형(칼답형)과 잘 맞아요.", 인성: "기다려 주는 비겁형이나, 대화 주도하는 식상형이 좋아요.", 비겁: "자유를 주는 상대가 최고 — 연락 횟수로 사랑을 재지 않는 사람." }[top] })]),
        card("연락 꿀팁", [list(["상대에게 내 연락 리듬을 먼저 말해 두면 오해가 줄어요", sp >= 60 ? "늦게 답할 땐 ‘이따 길게 답할게!’ 한 줄이면 충분해요" : "빠른 답이 장점이지만, 상대의 늦답에 서운해하지 않기"])]));
      return;
    }
    if (id === "flirt") {
      const lv = clampN(2 + C.g.식상 * 1.5 + (dh ? 2.5 : 0) + (E.fire || 0) * 0.8 + C.n("상관") * 0.7, 1, 10);
      const SK2 = { wood: ["다정한 챙김", "‘밥은 먹었어?’ 한마디로 마음을 녹여요."], fire: ["눈웃음 · 리액션", "크게 웃어 주는 것만으로 상대가 착각해요."], earth: ["꾸준함 · 든든함", "늘 그 자리에 있는 사람. 서서히 스며들어요."], metal: ["의외의 반전 매력", "차가워 보이다 가끔 보이는 다정함이 치명적이에요."], water: ["대화 · 공감", "밤새 이어지는 대화로 상대를 빠져들게 해요."] };
      const sk = SK2[dom];
      host.append(hero("나의 플러팅 레벨", `Lv. ${lv}`, lv >= 8 ? "전설의 플러터 — 본인은 모르는데 다들 설레요" : lv >= 5 ? "자연스럽게 설레게 하는 중수" : "아직 숨은 고수 — 마음먹으면 금방 늘어요"),
        el("div", { class: "panel sp-card" }, [meter(lv * 10, `Lv.${lv} / 10`)]),
        card("나의 필살기", [el("p", { style: "font-weight:700;", text: `✨ ${sk[0]}` }), el("p", { class: "tiny", text: sk[1] })]),
        card("레벨 올리는 퀘스트", [list(["대화 마지막에 질문 하나 남기기 (다음 연락을 부르는 기술)", "상대가 한 말 기억했다가 다음에 꺼내기", dh ? "도화가 있어 존재만으로 반은 먹고 들어가요 — 눈 맞춤 3초!" : "칭찬은 외모보다 ‘선택’을 — ‘그 노래 고른 거 센스 있다’"])]));
      return;
    }
    if (id === "recover") {
      const days = clampN(28 + C.g.인성 * 14 + (E.water || 0) * 10 + (E.earth || 0) * 6 - (E.fire || 0) * 7 - C.g.식상 * 5 - C.g.비겁 * 3, 7, 180);
      const steps = [[0.15, "😭 멍~ 현실 부정기", "연락 올 것 같아서 폰만 봐요"], [0.4, "🍜 폭식·정주행기", "드라마·야식으로 버텨요"], [0.7, "🚶 산책·정리기", "사진 정리하고 운동 시작"], [1, "🌱 다시 피어나는 날", "‘나 괜찮네?’ 싶은 날이 와요"]];
      host.append(hero("이별 회복까지", `약 ${days}일`, days <= 21 ? "툭툭 털고 일어나는 회복 요정" : days <= 60 ? "아프지만 한 계절이면 괜찮아져요" : "깊이 사랑한 만큼 오래 아파하는 타입"),
        card("회복 단계", [el("div", { class: "sp-tl" }, steps.map(([r, h, d], i) => el("div", { class: "sp-tl-row" }, [el("span", { class: "sp-tl-no", text: String(i + 1) }), el("div", {}, [el("b", { text: h }), el("p", { class: "tiny muted", text: d })]), el("span", { class: "sp-tl-pt", text: `D+${Math.round(days * r)}` })])))]),
        card("사주가 말하는 회복 처방", [list([`용신 ${S.yongsinKr[0]} 기운을 가까이 — ${{ wood: "숲길 산책·식물 키우기", fire: "햇볕·운동·밝은 옷", earth: "요리·정리·규칙적인 생활", metal: "운동·대청소·새 루틴", water: "목욕·음악·일기 쓰기" }[S.yongsin[0]]}`, C.g.인성 >= 2 ? "생각이 많아지는 사주 — 혼자 곱씹기보다 친구에게 말로 꺼내기" : "몸을 움직일수록 빨리 괜찮아져요"])]));
      return;
    }
    if (id === "jobnow") {
      const ds = profile.pillars.day.stemIdx, db = profile.pillars.day.branchIdx;
      const PT = { 정관: 3, 편관: 2, 정인: 2, 편인: 1, 식신: 1, 정재: 1, 편재: 1, 비견: 0, 겁재: -1, 상관: -1 };
      const now = new Date(), months = [];
      for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 15), Y = d.getFullYear(), M = d.getMonth() + 1;
        let t; try { t = computeSaju({ calendarType: "solar", birthDate: `${Y}-${String(M).padStart(2, "0")}-15`, birthTime: "12:00", timeUnknown: true, gender: "male", timezone: "Asia/Seoul" }); } catch { continue; }
        const mp = t.pillars.month, gs = tenGod(ds, mp.stemIdx), gb = tenGod(ds, BR_MAIN[mp.branchIdx]);
        let pt = (PT[gs] || 0) + (PT[gb] || 0) * 0.6; const why = [];
        if (["정관", "편관"].includes(gs) || ["정관", "편관"].includes(gb)) why.push("관성 — 자리·직장이 들어오는 달");
        if (["정인", "편인"].includes(gs) || ["정인", "편인"].includes(gb)) why.push("인성 — 문서·합격 소식");
        if (["정재", "편재"].includes(gs)) why.push("재성 — 월급·계약");
        if (["상관", "겁재"].includes(gs)) why.push(gs === "상관" ? "상관 — 말실수 주의" : "겁재 — 경쟁자가 많아요");
        if (HAP6[db] === mp.branchIdx) { pt += 1; why.push("내 자리와 합 — 인연 닿는 회사"); }
        if ((db + 6) % 12 === mp.branchIdx) { pt -= 1.5; why.push("충 — 변동이 크고 일정이 꼬이기 쉬워요"); }
        months.push({ Y, M, pct: clampN(38 + pt * 11, 12, 94), why, gs });
      }
      const cur = months[0], best = months.slice().sort((a, b) => b.pct - a.pct)[0];
      const verdict = cur.pct >= 75 ? "합격 소식이 들어오기 좋은 달!" : cur.pct >= 58 ? "충분히 가능해요 — 지원을 몰아서 내 보세요" : cur.pct >= 42 ? "준비를 다지는 달 — 서류는 꾸준히" : "이번 달은 숨 고르기 · 다음 기회를 노려요";
      let days = [];
      try {
        const GOOD = ["정관", "정인", "편관", "식신", "정재", "편인"];
        days = monthScores(profile, cur.Y, cur.M).filter((x) => x.day >= now.getDate() && GOOD.includes(x.god)).sort((a, b) => b.score - a.score).slice(0, 5).sort((a, b) => a.day - b.day);
      } catch { days = []; }
      const dayUse = (g) => (["정관", "편관"].includes(g) ? "면접" : ["정인", "편인"].includes(g) ? "서류 · 시험" : g === "식신" ? "자기소개 · PT" : "연봉 · 계약");
      host.append(
        hero(`${nm}님의 ${cur.M}월 취업 가능성`, `${cur.pct}%`, verdict),
        el("div", { class: "panel sp-card" }, [meter(cur.pct)]),
        card(`${cur.M}월에 들어오는 기운`, [list(cur.why.length ? cur.why : ["특별히 튀는 기운 없이 평범한 달 — 실력대로 가요"])]),
        card(`${cur.M}월 남은 날 중 좋은 날`, [days.length ? el("div", { class: "sp-tl" }, days.map((x) => el("div", { class: "sp-tl-row" }, [
          el("span", { class: "sp-tl-no", text: String(x.day) }),
          el("div", {}, [el("b", { text: `${cur.M}월 ${x.day}일 · ${dayUse(x.god)}에 좋아요` }), el("p", { class: "tiny muted", text: `${x.iljin} 일진 · ${x.god}` })]),
          el("span", { class: "sp-tl-pt", text: `${x.score}점` }),
        ]))) : el("p", { class: "tiny", text: "이번 달 남은 날 중엔 크게 좋은 날이 없어요. 다음 달 초를 노려 보세요." })]),
        card("앞으로 6개월 취업 흐름", [el("div", { class: "lf-months" }, months.map((x) => el("div", { class: "lf-mo" + (x === best ? " best" : "") }, [
          el("span", { class: "lf-mo-bar" }, [el("i", { style: `height:${x.pct}%` })]), el("b", { text: `${x.pct}` }), el("small", { text: `${x.M}월` }),
        ]))), el("p", { class: "tiny", text: `가장 좋은 달은 ${best.Y}년 ${best.M}월 (${best.pct}%) — ${best.why[0] || "흐름이 안정적인 달"}` })]),
        card("이번 달 취업 처방", [list([
          ["상관", "겁재"].includes(cur.gs) ? "면접에선 말을 아끼고 질문에 짧고 분명하게 답하기" : "자신감 있게 — 이번 달은 기운이 나를 밀어줘요",
          `용신 ${S.yongsinKr[0]} — ${{ wood: "초록 · 파란 계열 넥타이·소품", fire: "붉은 · 분홍 포인트", earth: "베이지 · 브라운 정장", metal: "흰색 · 회색 셔츠", water: "검정 · 네이비 정장" }[S.yongsin[0]]}이 행운을 줘요`,
          "지원은 좋은 날 오전에, 결과 확인은 마음 편한 날에",
        ])]),
      );
      return;
    }
    if (id === "cells") {
      const ms = loveMonths(profile, my, 12);
      const soon = ms.filter((x) => x.pt >= 4).length;
      const pct = clampN(35 + soon * 7 + (dh ? 12 : 0) + C.g.식상 * 4 + (E.fire || 0) * 3, 8, 99);
      const st = pct >= 80 ? ["🔥 활발히 분열 중", "연애 세포가 넘쳐요! 지금 만나는 사람에게 금방 마음이 가요."] : pct >= 60 ? ["🌤 기상 직전", "조금만 자극이 오면 바로 깨어나요. 새로운 만남을 늘려 보세요."] : pct >= 40 ? ["😴 동면 중", "쉬고 있지만 살아 있어요. 연애 신호가 오는 달에 깨어나요."] : ["🧊 냉동 보관", "지금은 나에게 집중하는 시기. 해동은 천천히 해도 괜찮아요."];
      host.append(hero("나의 연애 세포 생존율", `${pct}%`, st[0]), el("div", { class: "panel sp-card" }, [meter(pct)]), card("상태 진단", [el("p", { text: st[1] })]),
        card("1년 안에 세포가 깨어나는 달", [el("p", { class: "tiny", text: soon ? ms.filter((x) => x.pt >= 4).map((x) => `${x.M}월`).join(" · ") : "올해는 조용해요. 대신 자기 계발운이 좋아요." })]),
        card("세포 살리기 처방", [list(["새로운 사람 1명 만나기 (모임·스터디·동호회)", "설렌 영화·노래 다시 보기 — 감정 근육 스트레칭", dh ? "도화가 있으니 외출만 늘려도 기회가 와요" : "소개 부탁하기 — 내 사주는 ‘연결’로 인연이 와요"])]));
    }
  };
}

export function renderLoveFunItem({ navigate, id }) {
  const it = LOVE_FUN.find((x) => x.id === id) || LOVE_FUN[0];
  const root = page({ navigate, title: "프리미엄 · 무료", h: `${it.em} ${it.name}`, desc: `${it.blurb} — 사주로 재미 삼아 봐요.`, who: it.group === "work" ? "누구의 취업운을 볼까?" : "누구의 연애를 볼까?", costKey: null, itemId: () => null, back: "/special", backLabel: "프리미엄", build: loveFunBuild(it.id) });
  // 아래에 다른 재미 풀이로 바로 가기
  root.append(el("section", { class: "wrap", style: "margin-top: var(--sp-5);" }, [el("p", { class: "eyebrow", text: "이것도 볼래?" }), el("div", { class: "lf-more" }, LOVE_FUN.filter((x) => x.id !== it.id).map((x) => el("button", { type: "button", class: "chip", onclick: () => navigate(`/love-fun/${x.id}`) }, [el("span", { text: `${x.em} ${x.name}` })])))]));
  root.append(el("section", { class: "wrap", style: "margin-top: var(--sp-4);" }, [noticeBox("info", it.group === "work" ? "사주로 재미 삼아 보는 흐름이에요. 합격은 결국 준비한 만큼 와요 — 응원할게요!" : "사주로 재미 삼아 보는 풀이예요. 연애는 두 사람의 마음과 선택이 만들어요.")]));
  return root;
}

/* =========================================================
   홈용 — 오늘의 한 줄 · 인연 D-3 · 이달의 흐름 리포트 (HAE)
   ========================================================= */
const E_KR = { wood: "목(木)", fire: "화(火)", earth: "토(土)", metal: "금(金)", water: "수(水)" };
const LUCKY = {
  wood: { name: "민트 · 초록", hex: "#7fd6a8", item: "초록 소품 · 식물" },
  fire: { name: "코랄 · 다홍", hex: "#ff8a7a", item: "빨간 립 · 따뜻한 조명" },
  earth: { name: "베이지 · 머스터드", hex: "#e8c37a", item: "니트 · 나무 소품" },
  metal: { name: "화이트 · 실버", hex: "#e9edf3", item: "은 액세서리 · 흰 셔츠" },
  water: { name: "네이비 · 블랙", hex: "#5b6fb0", item: "검정 아이템 · 물 한 잔 더" },
};
const NEXT_E = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
const LINE = {
  비견: "내 편이 되어 줄 사람이 가까이 있는 날 — 혼자 끙끙대지 말고 같이 해요.",
  겁재: "욱하는 마음이 올라오기 쉬운 날 — 돈 · 말 모두 한 박자 쉬고 내보내요.",
  식신: "여유와 말솜씨가 살아나는 날 — 맛있는 거 먹고, 하고 싶은 말은 가볍게 꺼내 봐요.",
  상관: "번뜩이는 아이디어가 나오는 날 — 다만 말끝은 부드럽게 다듬어요.",
  편재: "뜻밖의 기회 · 용돈 운이 도는 날 — 새로운 사람에게 먼저 인사해 봐요.",
  정재: "차곡차곡 쌓이는 날 — 미뤄 둔 정리 · 저축 · 약속을 하나씩 해치워요.",
  편관: "할 일이 몰려와 바쁜 날 — 급한 것부터 하나씩, 무리한 약속은 잡지 않기.",
  정관: "인정받기 좋은 날 — 단정하게 입고, 맡은 일은 끝까지 깔끔하게.",
  편인: "생각이 깊어지는 날 — 혼자만의 시간 · 공부 · 기록이 잘 맞아요.",
  정인: "도움 · 칭찬이 들어오는 날 — 고마운 사람에게 연락 한 번 해 봐요.",
};
const ymdOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** 오늘 일진 한 줄 + 행운 색 — my가 없으면 일진만 */
export function todayLine(my) {
  const d = new Date();
  const t = computeSaju({ calendarType: "solar", birthDate: ymdOf(d), birthTime: "12:00", timeUnknown: false, gender: "male", timezone: "Asia/Seoul" });
  const dp = t.pillars.day, day = gz(dp.stemIdx, dp.branchIdx), dayE = STEM_E[dp.stemIdx];
  if (!my || !my.birthDate) {
    const lk = LUCKY[NEXT_E[dayE]];
    return { day, god: "", line: `${E_KR[dayE]}의 기운이 도는 하루 — 내 생년월일을 넣으면 나에게 맞춘 한 줄을 볼 수 있어요.`, lucky: lk, luckyE: NEXT_E[dayE] };
  }
  let profile; try { profile = computeSaju(my); } catch { return null; }
  const god = tenGod(profile.pillars.day.stemIdx, dp.stemIdx);
  // 행운 색: 오늘 기운이 자연스럽게 흘러가는(생해 주는) 다음 오행 — 막힌 기운을 풀어 줌
  const luckyE = NEXT_E[dayE];
  return { day, god, line: LINE[god] || LINE.비견, lucky: LUCKY[luckyE], luckyE };
}

/** 앞으로 3일 안 인연의 날 — 운명의 날(카운트다운) 또는 인연 끌어오는 날 (하루 한 번 계산해 기억) */
export function loveSoon(my) {
  if (!my || !my.birthDate) return null;
  const today = ymdOf(new Date()), sig = `${my.birthDate}|${my.birthTime || ""}|${my.calendarType || ""}|${my.gender || ""}|${today}`;
  try { const c = JSON.parse(localStorage.getItem("str.lovesoon.v1") || "null"); if (c && c.sig === sig) return c.v; } catch { /* ignore */ }
  let v = null;
  try {
    const profile = computeSaju(my);
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    const dd = (d) => Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - t0) / 864e5);
    const T = loveDayTarget(profile, my, 150);
    const cand = [];
    if (T && dd(T.date) <= 3) cand.push({ days: dd(T.date), kind: "fate", label: "다음 인연의 날", ymd: ymdOf(T.date), dayGz: T.dayGz });
    const c = charmDays(profile, my, 1, 3)[0];
    if (c) cand.push({ days: dd(c.date), kind: "charm", label: c.name.startsWith("식신") ? "매력이 살아나는 날" : "인연을 키우는 날", ymd: ymdOf(c.date), dayGz: c.dayGz });
    cand.sort((a, b) => a.days - b.days || (a.kind === "fate" ? -1 : 1));
    v = cand[0] || null;
  } catch { v = null; }
  try { localStorage.setItem("str.lovesoon.v1", JSON.stringify({ sig, v })); } catch { /* ignore */ }
  return v;
}

/* ---- 이달의 흐름 리포트 (매달 무료) ---- */
const MONTH_AREA = {
  비겁: { love: [2, "고집이 세지는 달 — 밀당보다 솔직하게 마음을 말하는 게 통해요."], money: [2, "같이 쓰는 돈 · 경쟁 지출이 늘기 쉬워요. 빌려주는 돈은 조심."], work: [4, "동료와 힘을 합치면 성과가 커지는 달이에요."] },
  식상: { love: [4, "표현력이 살아나 매력이 묻어나는 달 — 먼저 연락해도 좋아요."], money: [3, "아이디어 · 재능이 돈이 되는 씨앗을 뿌리는 달이에요."], work: [4, "기획 · 발표 · 창작처럼 나를 보여 주는 일에 강해요."] },
  재성: { love: [3, "현실적인 만남이 이어지는 달 — 함께 맛집 · 데이트 계획을 잡아 봐요."], money: [5, "들어오는 돈 · 기회가 보이는 달! 다만 큰 지출도 함께 와요."], work: [3, "성과를 숫자로 보여 주면 좋은 평가를 받아요."] },
  관성: { love: [3, "진지한 관계 · 약속 이야기가 오가기 쉬운 달이에요."], money: [3, "고정 지출 · 세금 · 보험 점검하기 좋은 달이에요."], work: [5, "평가 · 승진 · 책임이 따라오는 달 — 맡은 일을 끝까지!"] },
  인성: { love: [3, "챙김 받는 달 — 기다리기보다 고마움을 먼저 표현해요."], money: [2, "공부 · 자기계발에 쓰는 돈이 늘어요. 아깝지 않은 지출이에요."], work: [4, "자격증 · 공부 · 문서 일에 좋은 달이에요."] },
};
const stars5 = (n) => "★".repeat(n) + "☆".repeat(5 - n);
export function renderMonthlyReport({ navigate }) {
  const d = new Date(), Y = d.getFullYear(), M = d.getMonth() + 1;
  return page({ navigate, title: "이달의 흐름 · 매달 무료", h: `🗓 ${M}월 흐름 리포트`, desc: "이번 달 연애 · 돈 · 일의 흐름과 좋은 날 · 조심할 날을 한 장에 — 매달 1일에 새로 나와요.", who: "누구의 이번 달을 볼까?", costKey: null, itemId: () => null, back: "/", backLabel: "홈", build: (host, { profile, my }) => {
    const male = (my.gender || "female") !== "female";
    const t = computeSaju({ calendarType: "solar", birthDate: `${Y}-${String(M).padStart(2, "0")}-15`, birthTime: "12:00", timeUnknown: true, gender: "male", timezone: "Asia/Seoul" });
    const mp = t.pillars.month, ds = profile.pillars.day.stemIdx;
    const god = tenGod(ds, mp.stemIdx), g = grp(god), sub = grp(tenGod(ds, BR_MAIN[mp.branchIdx]));
    const A = JSON.parse(JSON.stringify(MONTH_AREA[g]));
    // 연인의 별: 남자는 재성, 여자는 관성 — 그 달이면 연애 ★ 더
    if ((male && g === "재성") || (!male && g === "관성")) A.love = [5, "연인의 별이 뜨는 달 💗 — 새 인연도, 지금 인연도 한 걸음 가까워져요."];
    if (sub === (male ? "재성" : "관성") && A.love[0] < 5) A.love[0]++;
    const sc = monthScores(profile, Y, M);
    const best = [...sc].sort((a, b) => b.score - a.score).slice(0, 3).sort((a, b) => a.day - b.day);
    const low = [...sc].sort((a, b) => a.score - b.score).slice(0, 2).sort((a, b) => a.day - b.day);
    const wk = ["일", "월", "화", "수", "목", "금", "토"];
    const dl = (x) => `${M}월 ${x.day}일 (${wk[new Date(Y, M - 1, x.day).getDay()]})`;
    const hj = (k) => { const si = SK.indexOf((k || "")[0]), bi = BK.indexOf((k || "")[1]); return si >= 0 && bi >= 0 ? gz(si, bi) : k; }; // 甲寅(갑인)처럼 한자+한글
    const area = (em, name, [n, tx]) => el("div", { class: "mr-a" }, [el("span", { class: "mr-em", text: em }), el("b", { text: name }), el("span", { class: "mr-st", text: stars5(n) }), el("p", { text: tx })]);
    host.append(
      el("div", { class: "panel panel-gold sp-hero" }, [
        el("p", { class: "eyebrow", text: `${Y}년 ${M}월 · ${gz(mp.stemIdx, mp.branchIdx)}월` }),
        el("p", { class: "mr-big", text: `이번 달 키워드 · ${god}` }),
        el("p", { class: "muted", text: `${my.name || "나"}님에게 ${M}월은 ${god}(${g})의 기운이 들어오는 달이에요. ${A.money[0] >= 4 ? "돈" : A.work[0] >= 5 ? "일" : A.love[0] >= 4 ? "연애" : "일상"} 쪽에 힘이 실려요.` }),
      ]),
      el("div", { class: "mr-grid" }, [area("💗", "연애", A.love), area("💰", "돈", A.money), area("💼", "일 · 공부", A.work)]),
      card("이번 달 좋은 날", [el("div", { class: "sp-tl" }, best.map((x, i) => el("div", { class: "sp-tl-row" }, [el("span", { class: "sp-tl-no", text: String(i + 1) }), el("div", {}, [el("b", { text: dl(x) }), el("p", { class: "tiny muted", text: `${hj(x.iljin)}일 · ${x.god} — 약속 · 중요한 일 잡기 좋아요` })]), el("span", { class: "sp-tl-pt", text: `${x.score}점` })])))]),
      card("조심할 날", [list(low.map((x) => `${dl(x)} · ${hj(x.iljin)}일 — 큰 결정 · 다툼은 하루 미뤄요 (${x.score}점)`))]),
    );
  } });
}
