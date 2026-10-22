/* =========================================================
   신살 체크 더 보기 (HAE) — #/sal/:id
   양인살 · 괴강살 · 백호살 · 현침살 · 공망 · 고신·과숙살 · 천라지망 · 삼재 ·
   문창·학당귀인 · 천덕·월덕귀인 · 급각살 · 암록
   한 가지 틀(어디에 있나 → 보는 법 → 이런 사람 → 짙어지는 해 → 잘 쓰는 법)로 그려요.
   ========================================================= */
import { el } from "../utils/dom.js";
import { noticeBox } from "./shared.js";
import { page, hero, card } from "./special.js";
import { tenGod } from "../saju/fortune.js";

const SH = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"], SK = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const BH = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"], BK = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
/** "寅(인)예요" → "寅(인)이에요" — 괄호 속 한글 받침에 맞춰 조사 고치기 */
const hasB = (ch) => { const c = ch.charCodeAt(0) - 0xac00; return c >= 0 && c <= 11171 && c % 28 !== 0; };
const JO = [["이에요", "예요"], ["과", "와"], ["은", "는"], ["이", "가"], ["을", "를"]];
const fx = (t) => String(t || "").replace(/([가-힣])\)(이에요|예요|와|과|는|은|가|이|를|을)(?=[\s,.)·]|$)/g, (m, ch, j) => { const pr = JO.find((x) => x.includes(j)); return pr ? `${ch})${hasB(ch) ? pr[0] : pr[1]}` : m; });
const ig = (w) => `${w}${hasB(w.slice(-1)) ? "이" : "가"}`, eul = (w) => `${w}${hasB(w.slice(-1)) ? "을" : "를"}`;
const mod = (n, m) => ((n % m) + m) % m;
const yearGZ = (Y) => ({ s: mod(Y - 4, 10), b: mod(Y - 4, 12) });
const bk = (b) => `${BH[b]}(${BK[b]})`, sk = (s) => `${SH[s]}(${SK[s]})`, pk = (s, b) => `${SH[s]}${BH[b]}(${SK[s]}${BK[b]})`;
const POS = [["year", "년주"], ["month", "월주"], ["day", "일주"], ["hour", "시주"]];
const LIFE_KEY = { year: "어린 시절·집안", month: "사회·부모·청년기", day: "나 자신·배우자", hour: "자녀·말년·결과" };
const sig = (my) => `${my.birthDate}_${my.timeUnknown ? "x" : my.birthTime || "-"}`;
const cols = (P) => POS.filter(([k]) => P.pillars[k]).map(([k, nm]) => ({ k, nm, s: P.pillars[k].stemIdx, b: P.pillars[k].branchIdx }));

/* 공용 표 */
const YANGIN = { 0: 3, 2: 6, 4: 6, 6: 9, 8: 0 }, EUMIN = { 1: 4, 3: 7, 5: 7, 7: 10, 9: 1 };
const GOEGANG = ["6-4", "6-10", "8-4", "8-10", "4-10"];
const BAEKHO = ["0-4", "1-7", "2-10", "3-1", "4-4", "8-10", "9-1"];
const MUNCHANG = [5, 6, 8, 9, 8, 9, 11, 0, 2, 3], HAKDANG = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3];
const AMROK = [11, 10, 8, 7, 8, 7, 5, 4, 2, 1];
const GEUMYEO = [4, 5, 7, 8, 7, 8, 10, 11, 1, 2];           // 금여록 (일간 → 지지)
const LOK = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0];                // 건록
const CHEONJU = [5, 6, 5, 6, 8, 9, 11, 0, 2, 3];            // 천주귀인(식록)
const CHEONEUL = [[1, 7], [0, 8], [11, 9], [11, 9], [1, 7], [0, 8], [1, 7], [2, 6], [5, 3], [5, 3]];
const CHEONDEOK = { 2: ["s", 3], 3: ["b", 8], 4: ["s", 8], 5: ["s", 7], 6: ["b", 11], 7: ["s", 0], 8: ["s", 9], 9: ["b", 2], 10: ["s", 2], 11: ["s", 1], 0: ["b", 5], 1: ["s", 6] };
const WOLDEOK = { 2: 2, 6: 2, 10: 2, 8: 8, 0: 8, 4: 8, 11: 0, 3: 0, 7: 0, 5: 6, 9: 6, 1: 6 };
const GEUPGAK = { 2: [11, 0], 3: [11, 0], 4: [11, 0], 5: [3, 7], 6: [3, 7], 7: [3, 7], 8: [2, 10], 9: [2, 10], 10: [2, 10], 11: [1, 4], 0: [1, 4], 1: [1, 4] };
const GOSIN = (yb) => ({ 11: [2, 10], 0: [2, 10], 1: [2, 10], 2: [5, 1], 3: [5, 1], 4: [5, 1], 5: [8, 4], 6: [8, 4], 7: [8, 4], 8: [11, 7], 9: [11, 7], 10: [11, 7] }[yb]);
const SAMJAE = { 8: [2, 3, 4], 0: [2, 3, 4], 4: [2, 3, 4], 2: [8, 9, 10], 6: [8, 9, 10], 10: [8, 9, 10], 5: [11, 0, 1], 9: [11, 0, 1], 1: [11, 0, 1], 11: [5, 6, 7], 3: [5, 6, 7], 7: [5, 6, 7] };
function gongmang(s, b) { let n = 0; for (; n < 60; n++) if (n % 10 === s && n % 12 === b) break; const h = mod(n - mod(n, 10), 12); return [mod(h + 10, 12), mod(h + 11, 12)]; }

/** 앞으로 n년 중 조건에 맞는 해 */
const yearsWhere = (pred, n = 12, take = 6) => { const Y = new Date().getFullYear(), out = []; for (let y = Y; y < Y + n && out.length < take; y++) if (pred(yearGZ(y))) out.push(y); return out; };

/* ---------------- 신살 정의 ----------------
   find(P, my) → { hits: [{nm, k, what}], rule, targetsText, years: [y], level? }
*/
export const SAL = {
  yangin: {
    em: "🗡️", name: "양인살", h: "羊刃殺", tone: "강한 추진력의 별", title: "나에게 양인살이 있을까?", sub: "칼처럼 강한 추진력 · 승부욕",
    find(P) {
      const C = cols(P), ds = P.pillars.day.stemIdx, t = YANGIN[ds] ?? EUMIN[ds], yang = YANGIN[ds] != null;
      return { hits: C.filter((c) => c.b === t).map((c) => ({ ...c, what: bk(c.b) })), rule: `일간 ${sk(ds)}의 ${yang ? "양인" : "음인(학파에 따라 봐요)"}은 ${bk(t)}예요. 일간이 가장 센 자리(제왕) 글자가 양인이에요.`, years: yearsWhere((g) => g.b === t) };
    },
    has: ["한번 정하면 끝까지 밀어붙이는 추진력이 있어요.", "승부욕·경쟁심이 강해 위기에서 오히려 힘을 내요.", "칼·의료·법·운동·군경처럼 결단이 필요한 일과 잘 맞아요.", "기운이 넘치면 다툼·과속·부상을 조심하면 좋아요."],
    not: ["무리하게 밀어붙이기보다 조율하며 가는 타입이에요.", "결단이 필요할 땐 믿을 만한 사람의 힘을 빌려 보세요."],
    life: { year: "어릴 때부터 고집과 승부욕이 남달랐어요.", month: "일터에서 강하게 치고 나가는 리더·전문가 타입.", day: "배우자와 기 싸움이 생기기 쉬워요 — 역할을 나누면 편해요.", hour: "나이 들수록 결단력이 커져요. 자녀도 의지가 강해요." },
    tips: ["넘치는 힘을 운동·경쟁·목표로 써 주세요.", "중요한 결정은 하루 묵혀서 한 번 더.", "운전·칼·기계는 서두르지 않기."],
  },
  goegang: {
    em: "⚡", name: "괴강살", h: "魁罡殺", tone: "카리스마·결단의 별", title: "나에게 괴강살이 있을까?", sub: "강한 카리스마 · 리더의 기질",
    find(P) {
      const C = cols(P);
      return { hits: C.filter((c) => GOEGANG.includes(`${c.s}-${c.b}`)).map((c) => ({ ...c, what: pk(c.s, c.b) })), rule: "庚辰·庚戌·壬辰·壬戌·戊戌 다섯 간지가 괴강이에요. 특히 일주가 괴강이면 작용이 가장 커요.", years: yearsWhere((g) => GOEGANG.includes(`${g.s}-${g.b}`), 40, 4) };
    },
    has: ["판단이 빠르고 카리스마가 있어 자연스럽게 앞에 서요.", "어려운 상황일수록 강해지는 승부사 기질이에요.", "고집이 세서 남의 말을 잘 안 듣는다는 소리를 들을 수 있어요.", "극과 극 — 잘 풀리면 크게, 안 풀리면 크게 흔들려요."],
    not: ["부드럽게 조율하는 힘이 더 큰 사주예요.", "리더 역할이 필요할 땐 분명한 기준을 세워 두면 좋아요."],
    life: { year: "집안에 강한 어른이 있었거나, 어릴 때부터 당찼어요.", month: "조직에서 강한 리더십으로 이름이 나요.", day: "일주 괴강 — 나 자신이 가장 강한 괴강. 배우자에게도 주도권을 쥐려 해요.", hour: "말년에 큰 결단으로 자리를 잡아요." },
    tips: ["내 결정의 이유를 말로 설명해 주면 따르는 사람이 늘어요.", "강함을 지키되 ‘한 번 물러서기’를 연습해요.", "큰 결정을 할 땐 숫자·근거를 먼저 챙기기."],
  },
  baekho: {
    em: "🐯", name: "백호살", h: "白虎殺", tone: "강렬한 에너지의 별", title: "나에게 백호살이 있을까?", sub: "백호대살 · 강렬한 에너지",
    find(P) {
      const C = cols(P);
      return { hits: C.filter((c) => BAEKHO.includes(`${c.s}-${c.b}`)).map((c) => ({ ...c, what: pk(c.s, c.b) })), rule: "甲辰·乙未·丙戌·丁丑·戊辰·壬戌·癸丑 일곱 간지가 백호예요. ‘흰 호랑이’처럼 강하고 빠른 기운이에요.", years: yearsWhere((g) => BAEKHO.includes(`${g.s}-${g.b}`), 40, 4) };
    },
    has: ["에너지가 강하고 행동이 빨라요.", "의료·수술·운동·기술처럼 정확하고 강한 손이 필요한 일에 재능이 있어요.", "옛날엔 피·사고를 조심하라 했어요 — 현대에선 ‘안전 습관’으로 읽어요.", "가족 중 강한 사람과 부딪히기 쉬우니 거리 조절이 필요해요."],
    not: ["강하게 부딪히기보다 꾸준히 가는 힘이 있어요."],
    life: { year: "어릴 때 활동량이 많았어요 — 넘어지고 다치는 일도 잦았을 수 있어요.", month: "일에서 강한 추진력, 특히 손을 쓰는 전문직과 인연.", day: "나 자신·배우자 자리 — 서로 강한 성격이라 존중이 핵심.", hour: "자녀가 활발하고 에너지가 넘쳐요." },
    tips: ["운전·운동·공구는 안전 장비부터.", "강한 기운을 운동·수술·기술처럼 ‘제대로 쓰는 일’로 돌리기.", "건강검진을 정기적으로."],
  },
  hyeonchim: {
    em: "📌", name: "현침살", h: "懸針殺", tone: "바늘처럼 예리한 재주", title: "나에게 현침살이 있을까?", sub: "예리한 손재주 · 날카로운 말",
    find(P) {
      const C = cols(P), hits = [];
      C.forEach((c) => { const w = []; if ([0, 7].includes(c.s)) w.push(sk(c.s)); if ([3, 6, 8].includes(c.b)) w.push(bk(c.b)); if (w.length) hits.push({ ...c, what: w.join("·") }); });
      return { hits, rule: "글자 모양이 바늘처럼 뾰족한 천간 甲·辛, 지지 卯·午·申이 현침이에요. 여러 개일수록 짙어요.", years: yearsWhere((g) => [0, 7].includes(g.s) && [3, 6, 8].includes(g.b), 40, 4) };
    },
    has: ["손재주가 좋고 정밀한 일을 잘해요 — 의료·디자인·코딩·미용·공예.", "관찰력이 날카로워 남들이 못 보는 걸 짚어내요.", "말이 날카롭게 들릴 수 있어요 — 정확함이 상처가 되지 않게."],
    not: ["말과 손이 부드러운 편이에요.", "정밀한 작업이 필요하면 도구·체크리스트를 쓰면 좋아요."],
    life: { year: "어릴 때부터 손으로 만드는 걸 좋아했어요.", month: "직업으로 손재주·분석력을 써요.", day: "배우자에게 말이 날카로워지지 않게 조심.", hour: "말년까지 기술·재주로 먹고살아요." },
    tips: ["예리함을 ‘기술’로 — 자격증·포트폴리오로 남기기.", "비판 전에 칭찬 한마디 먼저.", "바늘·칼·주사 같은 도구는 조심히."],
  },
  gongmang: {
    em: "🕳️", name: "공망", h: "空亡", tone: "비어 있는 자리", title: "내 사주의 공망은 어디일까?", sub: "채워도 덜 채워지는 자리 · 내려놓기",
    find(P) {
      const C = cols(P), d = P.pillars.day, gm = gongmang(d.stemIdx, d.branchIdx);
      return { hits: C.filter((c) => c.k !== "day" && gm.includes(c.b)).map((c) => ({ ...c, what: bk(c.b) })), rule: `일주 ${pk(d.stemIdx, d.branchIdx)}는 열 천간과 열두 지지가 짝을 짓고 남는 ${gm.map(bk).join("·")}가 공망이에요.`, years: yearsWhere((g) => gm.includes(g.b)), extra: `내 공망 글자: ${gm.map(bk).join(" · ")}` };
    },
    has: ["공망 자리의 일은 마음먹은 만큼 채워지지 않는 느낌이 들 수 있어요.", "대신 물질보다 정신적인 가치·종교·예술·봉사로 쓰면 오히려 빛나요.", "집착을 내려놓을수록 편해지는 자리예요."],
    not: ["원국 네 기둥엔 공망 글자가 없어요 — 공망 해에만 잠깐 허전함이 와요."],
    life: { year: "조상·고향과의 인연이 옅거나 일찍 떠나요.", month: "부모·형제 덕보다 내 힘으로 서는 타입.", day: "", hour: "자녀에게 기대기보다 각자의 삶을 존중해요." },
    tips: ["공망 해엔 큰 투자·확장보다 정리·공부.", "비어 있는 자리를 봉사·창작·종교로 채우기.", "충·합이 오는 해엔 공망이 풀린다고 봐요."],
  },
  gosin: {
    em: "🌙", name: "고신·과숙살", h: "孤辰寡宿", tone: "혼자만의 시간이 필요한 별", title: "고신살·과숙살이 있을까?", sub: "외로움의 별 · 독립심",
    find(P, my) {
      const C = cols(P), yb = P.pillars.year.branchIdx, [go, gwa] = GOSIN(yb);
      const hits = C.filter((c) => c.k !== "year" && (c.b === go || c.b === gwa)).map((c) => ({ ...c, what: `${bk(c.b)} ${c.b === go ? "고신" : "과숙"}` }));
      return { hits, rule: `년지 ${bk(yb)} 기준 고신(孤辰)은 ${bk(go)}, 과숙(寡宿)은 ${bk(gwa)}예요. 전통적으로 남자는 고신, 여자는 과숙을 더 크게 봐요.`, years: yearsWhere((g) => g.b === (my.gender === "male" ? go : gwa)) };
    },
    has: ["혼자 있는 시간이 꼭 필요하고, 혼자서도 잘 지내요.", "독립심이 강해 남에게 기대는 걸 어려워해요.", "연애·결혼에선 ‘각자의 공간’을 인정해 주는 사람이 잘 맞아요."],
    not: ["사람들 속에서 에너지를 얻는 편이에요."],
    life: { year: "", month: "가족 안에서도 독립적으로 자랐어요.", day: "배우자와 서로의 시간을 존중해야 오래 가요.", hour: "말년에 혼자만의 취미·공부가 큰 힘이 돼요." },
    tips: ["외로움을 ‘몰입 시간’으로 바꾸기.", "먼저 연락하는 습관 하나 만들기.", "함께 사는 사람에게 혼자 있는 시간을 미리 말해 두기."],
  },
  cheonra: {
    em: "🕸️", name: "천라지망", h: "天羅地網", tone: "하늘의 그물 · 땅의 그물", title: "천라지망살이 있을까?", sub: "막히는 듯하지만 버티면 풀리는 별",
    find(P) {
      const C = cols(P), bs = C.map((c) => c.b), ra = bs.includes(10) && bs.includes(11), mang = bs.includes(4) && bs.includes(5);
      const hits = C.filter((c) => (ra && [10, 11].includes(c.b)) || (mang && [4, 5].includes(c.b))).map((c) => ({ ...c, what: `${bk(c.b)} ${[10, 11].includes(c.b) ? "천라" : "지망"}` }));
      const half = bs.find((b) => [10, 11, 4, 5].includes(b));
      const pair = (b) => ({ 10: 11, 11: 10, 4: 5, 5: 4 }[b]);
      return { hits, rule: "戌(술)·亥(해)가 함께 있으면 천라(天羅·하늘의 그물), 辰(진)·巳(사)가 함께 있으면 지망(地網·땅의 그물)이에요. 한 글자만 있으면 짝 글자가 오는 해에 잠깐 생겨요.", years: half != null && !hits.length ? yearsWhere((g) => g.b === pair(half)) : [] };
    },
    has: ["일이 그물에 걸린 듯 더디게 풀리는 때가 있어요.", "대신 끈기가 대단해서, 버티면 결국 풀어 내요.", "의료·법·종교·상담처럼 ‘사람을 구하는 일’에서 강하다고 봐요."],
    not: ["원국에 천라지망 짝이 없어요 — 막힘보다 흐름이 있는 사주예요."],
    life: { year: "", month: "사회생활 초반에 기다림이 길 수 있어요.", day: "", hour: "" },
    tips: ["막힐 땐 서두르지 말고 순서대로.", "서류·계약은 꼼꼼히 두 번.", "사람을 돕는 일이 운을 열어 줘요."],
  },
  samjae: {
    em: "🌀", name: "삼재", h: "三災", tone: "3년 동안 조심하는 시기", title: "나의 삼재는 언제일까?", sub: "들삼재·눌삼재·날삼재 · 언제 오고 언제 끝날까",
    find(P) {
      const yb = P.pillars.year.branchIdx, sj = SAMJAE[yb], Y = new Date().getFullYear();
      const list = []; for (let y = Y - 2; y < Y + 14; y++) { const i = sj.indexOf(yearGZ(y).b); if (i >= 0) list.push({ y, kind: ["들삼재", "눌삼재", "날삼재"][i] }); }
      return { hits: [], samjae: list, rule: `년지 ${bk(yb)}가 속한 삼합의 다음 방향 세 해(${sj.map(bk).join("·")})가 삼재예요. 12년마다 3년씩 돌아와요.`, years: [] };
    },
    has: [], not: [], life: {},
    tips: ["삼재는 ‘조심하라’는 옛 지혜예요 — 무조건 나쁜 게 아니라 무리하지 말자는 신호.", "들삼재엔 새 일을 신중히, 눌삼재엔 건강·관계를 지키기, 날삼재엔 정리하고 다음을 준비.", "용신 운이 함께 오면 삼재여도 오히려 잘 풀린다고 봐요(복삼재)."],
  },
  munchang: {
    em: "📚", name: "문창·학당귀인", h: "文昌·學堂", tone: "공부 머리의 별", title: "공부 귀인, 문창·학당이 있을까?", sub: "시험·자격증·글재주의 별",
    find(P) {
      const C = cols(P), ds = P.pillars.day.stemIdx, mc = MUNCHANG[ds], hd = HAKDANG[ds];
      const hits = C.filter((c) => c.b === mc || c.b === hd).map((c) => ({ ...c, what: `${bk(c.b)} ${c.b === mc ? "문창" : "학당"}` }));
      return { hits, rule: `일간 ${sk(ds)} 기준 문창귀인은 ${bk(mc)}이고, 장생 자리인 학당귀인은 ${bk(hd)}예요.`, years: yearsWhere((g) => g.b === mc || g.b === hd) };
    },
    has: ["이해가 빠르고 배운 걸 말·글로 잘 정리해요.", "시험·자격증·발표에 강해요.", "글쓰기·강의·기획처럼 머리를 쓰는 일과 잘 맞아요."],
    not: ["타고난 공부 별보다 ‘꾸준함’으로 가는 타입이에요 — 문창·학당 해에 시험을 잡으면 좋아요."],
    life: { year: "어릴 때 공부를 잘했거나 책을 좋아했어요.", month: "학업·자격으로 사회에서 인정받아요.", day: "배우자와 함께 배우고 성장하는 관계.", hour: "자녀가 공부 복이 있어요." },
    tips: ["문창·학당이 오는 해에 시험·자격증 일정을 잡기.", "배운 걸 글·영상으로 남기면 복이 커져요.", "아침 공부가 잘 맞아요."],
  },
  cheondeok: {
    em: "🕊️", name: "천덕·월덕귀인", h: "天德·月德", tone: "하늘과 달의 덕", title: "덕(德)이 있는 사주일까?", sub: "위기에 손을 내미는 덕의 별",
    find(P) {
      const C = cols(P), mb = P.pillars.month.branchIdx, cd = CHEONDEOK[mb], wd = WOLDEOK[mb], hits = [];
      C.forEach((c) => { const w = []; const onS = cd[0] === "s"; if (onS ? c.s === cd[1] : c.b === cd[1]) w.push("천덕"); if (c.s === wd) w.push("월덕"); if (w.length) hits.push({ ...c, what: `${onS || c.s === wd ? sk(c.s) : bk(c.b)}(${w.join("·")})` }); });
      return { hits, rule: `월지 ${bk(mb)} 기준 천덕귀인은 ${cd[0] === "s" ? sk(cd[1]) : bk(cd[1])}, 월덕귀인은 ${sk(wd)}예요. 태어난 계절이 주는 덕이에요.`, years: yearsWhere((g) => (cd[0] === "s" ? g.s === cd[1] : g.b === cd[1]) || g.s === wd) };
    },
    has: ["어려울 때 신기하게 도와주는 사람이 나타나요.", "큰 사고·흉을 피해 가는 복이 있다고 봐요.", "남을 돕는 마음이 커서 사람들이 따라요."],
    not: ["타고난 덕보다 ‘쌓는 덕’으로 가는 사주예요 — 베푼 만큼 돌아와요."],
    life: { year: "조상 덕이 있는 집안이에요.", month: "사회에서 윗사람·선배의 도움.", day: "나 자신에게 덕 — 배우자도 온화해요.", hour: "자녀 덕, 말년이 편안해요." },
    tips: ["받은 도움을 다른 사람에게 이어 주기.", "덕의 해에 중요한 부탁·계약을.", "봉사·기부가 운을 더 키워요."],
  },
  geupgak: {
    em: "🦵", name: "급각살", h: "急脚殺", tone: "다리·관절을 챙길 별", title: "급각살이 있을까?", sub: "서두르면 넘어지는 자리 · 관절 건강",
    find(P) {
      const C = cols(P), mb = P.pillars.month.branchIdx, t = GEUPGAK[mb];
      return { hits: C.filter((c) => c.k !== "month" && t.includes(c.b)).map((c) => ({ ...c, what: bk(c.b) })), rule: `태어난 계절(월지 ${bk(mb)}) 기준 급각살은 ${t.map(bk).join("·")}예요.`, years: yearsWhere((g) => t.includes(g.b)) };
    },
    has: ["급하게 움직이면 넘어지거나 삐끗하기 쉽다고 봐요.", "다리·무릎·허리 관리가 운을 지켜 줘요.", "반대로 ‘멈춤’을 잘 쓰면 신중하고 정확한 사람이 돼요."],
    not: ["원국엔 급각살이 없어요 — 급각 해에만 조금 더 조심해요."],
    life: { year: "어릴 때 잘 넘어졌을 수 있어요.", month: "", day: "나 자신의 자리 — 평소 스트레칭 습관이 중요.", hour: "나이 들수록 관절 관리." },
    tips: ["계단·빙판·운동 전 스트레칭.", "편한 신발이 개운템.", "서두를수록 한 박자 쉬기."],
  },
  amrok: {
    em: "🎁", name: "암록", h: "暗祿", tone: "숨은 재물·숨은 도움", title: "숨은 복, 암록이 있을까?", sub: "보이지 않는 곳에서 오는 도움",
    find(P) {
      const C = cols(P), ds = P.pillars.day.stemIdx, t = AMROK[ds];
      return { hits: C.filter((c) => c.b === t).map((c) => ({ ...c, what: bk(c.b) })), rule: `일간 ${sk(ds)} 기준 암록은 ${bk(t)}예요. 건록(내 녹)과 육합하는 글자라 ‘숨은 녹’이라고 불러요.`, years: yearsWhere((g) => g.b === t) };
    },
    has: ["위기 때 뜻밖의 지원이 들어와요.", "드러나지 않는 수입·보너스·선물 운이 있어요.", "남몰래 돕는 사람이 곁에 있어요."],
    not: ["숨은 복보다 드러난 노력으로 가는 사주예요."],
    life: { year: "집안의 숨은 도움.", month: "직장에서 보이지 않는 후원자.", day: "배우자가 조용히 챙겨 줘요.", hour: "말년에 뜻밖의 복." },
    tips: ["받은 도움에 감사 표현하기 — 숨은 복이 더 와요.", "암록 해에 지원금·장학금을 찾아보기.", "작은 저축 습관이 복을 붙잡아요."],
  },
};
SAL.geumyeo = {
  em: "🚗", name: "금여", h: "金輿祿", tone: "황금 수레를 타는 복", title: "나에게 금여(金輿)가 있을까?", sub: "황금 수레 · 배우자 복 · 편안한 재물",
  find(P) {
    const C = cols(P), ds = P.pillars.day.stemIdx, t = GEUMYEO[ds];
    return { hits: C.filter((c) => c.b === t).map((c) => ({ ...c, what: bk(c.b) })), rule: `일간 ${sk(ds)} 기준 금여는 ${bk(t)}예요. 내 녹(건록 ${bk(LOK[ds])})에서 두 칸 앞 글자예요. ‘황금 수레(金輿)’라는 뜻이에요.`, years: yearsWhere((g) => g.b === t) };
  },
  has: ["황금 수레를 탄다는 뜻 — 의식주가 편안하고 품위 있게 산다고 봐요.", "배우자 복·가정 복이 좋아, 결혼 후 생활이 안정되기 쉬워요.", "외모·말씨가 단정하고 귀티가 나서 좋은 사람들이 모여요.", "일지(배우자 자리)·시지에 있으면 더 크게 본다고 해요."],
  not: ["원국엔 금여가 없어요 — 금여 글자가 들어오는 해에 좋은 인연·편안한 일이 와요.", "금여가 없어도 건록·천을귀인 같은 다른 복의 별을 함께 봐 주세요."],
  life: { year: "넉넉한 집안 또는 어른의 도움 속에서 자랐어요.", month: "사회에서 대우받고 좋은 자리를 얻어요.", day: "배우자 자리의 금여 — 배우자 복이 가장 크다고 봐요.", hour: "자녀 복·말년 복 — 나이 들수록 편안해져요." },
  tips: ["금여 해에 결혼·이사·계약처럼 생활을 바꾸는 일을.", "좋은 차·좋은 집보다 ‘편안한 생활 습관’에 투자하기.", "단정한 옷차림·말씨가 금여의 복을 더 키워요."],
};
/* 잘사는 사주 별 종합 (길신 모아 보기) */
const GILSIN = [
  { name: "천을귀인", w: 3, mean: "최고의 길신 — 위기 때 귀인이 나타나요", find: (C, ds) => C.filter((c) => CHEONEUL[ds].includes(c.b)), rule: (ds) => `일간 ${sk(ds)} → ${CHEONEUL[ds].map(bk).join("·")}` },
  { name: "금여", w: 2, mean: "황금 수레 — 편안한 생활·배우자 복", find: (C, ds) => C.filter((c) => c.b === GEUMYEO[ds]), rule: (ds) => `일간 ${sk(ds)} → ${bk(GEUMYEO[ds])}` },
  { name: "건록", w: 2, mean: "스스로 버는 녹 — 자수성가·안정 수입", find: (C, ds) => C.filter((c) => c.b === LOK[ds]), rule: (ds) => `일간 ${sk(ds)} → ${bk(LOK[ds])}` },
  { name: "암록", w: 2, mean: "숨은 녹 — 뜻밖의 지원·보너스", find: (C, ds) => C.filter((c) => c.b === AMROK[ds]), rule: (ds) => `일간 ${sk(ds)} → ${bk(AMROK[ds])}` },
  { name: "천주귀인", w: 2, mean: "먹을 복(식록) — 의식주가 넉넉해요", find: (C, ds) => C.filter((c) => c.b === CHEONJU[ds]), rule: (ds) => `일간 ${sk(ds)} → ${bk(CHEONJU[ds])}` },
  { name: "천덕·월덕귀인", w: 2, mean: "하늘·달의 덕 — 흉을 피하고 도움을 받아요", find: (C, ds, mb) => C.filter((c) => { const cd = CHEONDEOK[mb]; return (cd[0] === "s" ? c.s === cd[1] : c.b === cd[1]) || c.s === WOLDEOK[mb]; }), rule: (ds, mb) => `월지 ${bk(mb)} → 천덕 ${CHEONDEOK[mb][0] === "s" ? sk(CHEONDEOK[mb][1]) : bk(CHEONDEOK[mb][1])} · 월덕 ${sk(WOLDEOK[mb])}` },
  { name: "문창귀인", w: 1, mean: "공부·문서의 별 — 머리로 버는 복", find: (C, ds) => C.filter((c) => c.b === MUNCHANG[ds]), rule: (ds) => `일간 ${sk(ds)} → ${bk(MUNCHANG[ds])}` },
];
SAL.gilsin = {
  em: "💎", name: "잘사는 별", h: "吉神", tone: "복을 부르는 길신 모음", desc: "천을귀인·금여·건록·암록·천주귀인·천덕월덕·문창 — 복을 부르는 별이 내 사주에 몇 개 있는지 한 번에 보고, 복 지수와 복을 키우는 법을 알려 드려요.", title: "잘사는 사주일까? 복의 별 체크", sub: "금여·천을귀인·건록·암록·천주귀인·천덕월덕 한 번에",
  find(P) {
    const C = cols(P), ds = P.pillars.day.stemIdx, mb = P.pillars.month.branchIdx;
    const list = GILSIN.map((g) => { const hits = g.find(C, ds, mb); return { ...g, hits, ruleText: g.rule(ds, mb) }; });
    return { hits: [], gilsin: list, rule: "", years: [] };
  },
  has: [], not: [], life: {},
  tips: ["복의 별이 많아도 ‘쓰는 사람’이 복을 받아요 — 기회가 올 때 움직이기.", "별이 적어도 운(대운·세운)에서 들어오는 해가 있어요 — 그해를 노리기.", "천을귀인·천덕 같은 ‘사람 복’ 별은 먼저 베풀 때 더 커져요."],
};
/* 귀티 나는 사주 — 귀한 기운 모아 보기 */
const TAEGEUK = [[0, 6], [0, 6], [3, 9], [3, 9], [4, 10, 1, 7], [4, 10, 1, 7], [2, 11], [2, 11], [5, 8], [5, 8]];
const HWAGAE_OF = { 8: 4, 0: 4, 4: 4, 2: 10, 6: 10, 10: 10, 11: 7, 3: 7, 7: 7, 5: 1, 9: 1, 1: 1 };
const MAIN = [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8];
const GWITI = [
  { id: "cheoneul", name: "천을귀인", w: 15, type: "dignity", mean: "가장 귀한 별 — 어디서든 대접받는 기품" },
  { id: "geumyeo", name: "금여", w: 12, type: "lux", mean: "황금 수레 — 차림새·생활에서 나오는 귀티" },
  { id: "jeonggwan", name: "정관", w: 10, type: "neat", mean: "반듯한 규칙의 별 — 단정하고 믿음직한 인상" },
  { id: "jeongin", name: "정인", w: 8, type: "smart", mean: "배움·품위의 별 — 말씨와 태도에서 나오는 교양" },
  { id: "gwanin", name: "관인상생", w: 8, type: "neat", mean: "정관과 정인이 함께 — 예부터 ‘귀격’이라 불러요" },
  { id: "deok", name: "천덕·월덕귀인", w: 8, type: "warm", mean: "덕의 별 — 온화하고 너그러운 품격" },
  { id: "taegeuk", name: "태극귀인", w: 6, type: "dignity", mean: "시작과 끝을 잘 맺는 별 — 어른스러운 무게감" },
  { id: "hwagae", name: "화개", w: 6, type: "art", mean: "꽃 덮개 — 고상하고 신비로운 분위기" },
  { id: "munchang", name: "문창귀인", w: 5, type: "smart", mean: "글·학문의 별 — 지적인 인상" },
];
const GWITI_TYPE = {
  dignity: ["타고난 기품형", "가만히 있어도 ‘어디 집 자제냐’는 말을 듣는 타입이에요. 자세와 눈빛에 무게가 있어요.", ["허리를 펴고 천천히 말하기 — 그것만으로 기품이 두 배", "브랜드보다 핏과 소재가 좋은 기본템", "약속 시간·말 한마디를 지키는 신뢰"]],
  lux: ["우아한 생활형", "옷차림·공간·물건에서 귀티가 나는 타입이에요. 좋은 것을 알아보는 눈이 있어요.", ["작은 것 하나라도 질 좋은 소품 쓰기", "깔끔한 공간 유지 — 귀티는 정리에서 나와요", "향(향수·섬유유연제)을 한 가지로 정해 두기"]],
  neat: ["단정한 신뢰형", "반듯하고 믿음직해서 ‘바른 사람’으로 보이는 귀티예요. 정장·제복이 잘 어울려요.", ["셔츠·재킷처럼 각 잡힌 옷", "존댓말·인사 습관이 귀티를 완성해요", "시계·구두 같은 디테일 관리"]],
  smart: ["지적인 교양형", "말씨와 생각에서 품위가 나는 타입이에요. 대화할수록 ‘배운 사람’ 느낌이 나요.", ["책·전시·클래식처럼 교양 취미 하나", "단어를 고르는 말습관", "안경·니트·셔츠의 차분한 톤"]],
  warm: ["온화한 덕스러움형", "편안하고 너그러워서 사람들이 기대고 싶어 하는 귀티예요.", ["부드러운 미소와 경청", "베이지·아이보리 같은 따뜻한 톤", "작은 친절을 꾸준히"]],
  art: ["고상한 예술가형", "신비롭고 분위기 있는 귀티예요. 쉽게 다가가기 어려운 고급스러움이 있어요.", ["한 가지 색·스타일로 시그니처 만들기", "혼자만의 취향(음악·향·그림)을 드러내기", "말수를 조금 아끼면 분위기가 살아요"]],
};
SAL.gwiti = {
  em: "👑", name: "귀티", h: "貴氣", tone: "귀한 기운 모아 보기", desc: "천을귀인·금여·관인상생·천덕월덕·태극·화개·문창 — 사주에 있는 귀한 기운을 모아 귀티 지수와 나의 귀티 유형, 귀티 살리는 법을 알려 드려요.", title: "귀티 나는 사주일까?", sub: "천을귀인·금여·관인상생·화개로 보는 기품",
  find(P) { return { hits: [], rule: "", years: [] }; }, has: [], not: [], life: {}, tips: [],
};
function gwitiCheck(P) {
  const C = cols(P), ds = P.pillars.day.stemIdx, mb = P.pillars.month.branchIdx, yb = P.pillars.year.branchIdx, db = P.pillars.day.branchIdx;
  const god = (c, part) => (part === "s" ? tenGod(ds, c.s) : tenGod(ds, MAIN[c.b]));
  const where = (list) => list.map((x) => `${x.nm} ${x.t}`).join(", ");
  const found = {};
  found.cheoneul = C.filter((c) => CHEONEUL[ds].includes(c.b)).map((c) => ({ nm: c.nm, t: bk(c.b) }));
  found.geumyeo = C.filter((c) => c.b === GEUMYEO[ds]).map((c) => ({ nm: c.nm, t: bk(c.b) }));
  const jg = [], ji = [];
  C.forEach((c) => { if (c.k !== "day" && god(c, "s") === "정관") jg.push({ nm: c.nm, t: sk(c.s) }); if (god(c, "b") === "정관") jg.push({ nm: c.nm, t: bk(c.b) }); if (c.k !== "day" && god(c, "s") === "정인") ji.push({ nm: c.nm, t: sk(c.s) }); if (god(c, "b") === "정인") ji.push({ nm: c.nm, t: bk(c.b) }); });
  found.jeonggwan = jg; found.jeongin = ji;
  found.gwanin = jg.length && ji.length ? [{ nm: "원국", t: "정관+정인" }] : [];
  const cd = CHEONDEOK[mb]; found.deok = C.filter((c) => (cd[0] === "s" ? c.s === cd[1] : c.b === cd[1]) || c.s === WOLDEOK[mb]).map((c) => ({ nm: c.nm, t: (cd[0] === "s" && c.s === cd[1]) || c.s === WOLDEOK[mb] ? sk(c.s) : bk(c.b) }));
  found.taegeuk = C.filter((c) => TAEGEUK[ds].includes(c.b)).map((c) => ({ nm: c.nm, t: bk(c.b) }));
  found.hwagae = C.filter((c) => (c.k !== "year" && c.b === HWAGAE_OF[yb]) || (c.k !== "day" && c.b === HWAGAE_OF[db])).map((c) => ({ nm: c.nm, t: bk(c.b) }));
  found.munchang = C.filter((c) => c.b === MUNCHANG[ds]).map((c) => ({ nm: c.nm, t: bk(c.b) }));
  // 귀티를 흐트러뜨리는 요소: 상관·겁재가 많을 때
  let rough = 0; C.forEach((c) => { ["상관", "겁재"].forEach((g) => { if (c.k !== "day" && god(c, "s") === g) rough++; if (god(c, "b") === g) rough++; }); });
  const list = GWITI.map((g) => ({ ...g, hits: found[g.id] || [], where: where(found[g.id] || []) }));
  const have = list.filter((g) => g.hits.length);
  const score = Math.max(30, Math.min(97, 38 + have.reduce((a, g) => a + g.w, 0) - Math.max(0, rough - 2) * 4));
  const typeCount = {}; have.forEach((g) => { typeCount[g.type] = (typeCount[g.type] || 0) + g.w; });
  const type = Object.keys(typeCount).sort((a, b) => typeCount[b] - typeCount[a])[0] || "warm";
  const rule = { cheoneul: `일간 ${sk(ds)} → ${CHEONEUL[ds].map(bk).join("·")}`, geumyeo: `일간 ${sk(ds)} → ${bk(GEUMYEO[ds])}`, jeonggwan: "일간을 바르게 다스리는 글자", jeongin: "일간을 바르게 돕는 글자", gwanin: "정관과 정인이 함께 있어야 해요", deok: `월지 ${bk(mb)} 기준`, taegeuk: `일간 ${sk(ds)} → ${TAEGEUK[ds].map(bk).join("·")}`, hwagae: `년지·일지 삼합의 고지`, munchang: `일간 ${sk(ds)} → ${bk(MUNCHANG[ds])}` };
  return { list, have, score, type, rough, rule };
}
export const SAL_IDS = Object.keys(SAL);

export function renderSal({ navigate, id }) {
  const S = SAL[id] || SAL.yangin, key = SAL[id] ? id : "yangin";
  return page({ navigate, title: `${S.name} 체크`, h: S.title, desc: S.desc || `${S.name}(${S.h}) — ${S.tone}. 사주 어디에 있는지, 어떻게 쓰면 좋은지, 그 기운이 짙어지는 해까지 알려 드려요.`, who: `누구의 ${eul(S.name)} 볼까?`,
    costKey: `sal_${key}`, itemId: (my) => `sal_${key}:${sig(my)}`, build(host, { profile, my }) {
      const R0 = S.find(profile, my);
      const R = { ...R0, rule: fx(R0.rule), extra: R0.extra ? fx(R0.extra) : "", hits: R0.hits.map((x) => ({ ...x, what: fx(x.what) })) };
      const Y = new Date().getFullYear();
      if (key === "gwiti") {
        const G = gwitiCheck(profile), [tName, tDesc, tTips] = GWITI_TYPE[G.type];
        const grade = G.score >= 85 ? "귀티가 넘치는 사주" : G.score >= 70 ? "귀티가 나는 사주" : G.score >= 55 ? "은은한 귀티" : "만들어 가는 귀티";
        host.append(
          hero("귀티 체크", `${grade} · ${G.score}점`, `${tName} — ${tDesc}`),
          card("귀한 기운 하나씩", G.list.map((g) => el("div", { class: "gs-row" + (g.hits.length ? " on" : "") }, [
            el("span", { class: "gs-mark", text: g.hits.length ? "✓" : "–" }),
            el("div", { class: "gs-body" }, [el("b", { text: g.name }), el("span", { class: "gs-mean", text: g.mean }),
              el("small", { text: g.hits.length ? fx(`${g.where}에 있어요`) : `없어요 · ${fx(G.rule[g.id])}` })]),
          ]))),
          card(`나의 귀티 유형 · ${tName}`, [el("p", { text: tDesc }), G.rough >= 3 ? el("p", { class: "tiny muted", text: `상관·겁재 기운이 ${G.rough}개로 많은 편이라, 자유분방함이 귀티를 가릴 때가 있어요. 말끝과 자세만 정돈해도 확 달라져요.` }) : null]),
          el("div", { class: "block tag-warn" }, [el("span", { class: "block-label", text: "귀티 살리는 법" }), el("ul", {}, tTips.map((t) => el("li", { text: t })))]),
          el("div", { class: "gs-links" }, [["gilsin", "💎 잘사는 별 체크"], ["geumyeo", "🚗 금여 자세히"], ["cheondeok", "🕊️ 천덕·월덕"], ["munchang", "📚 문창·학당"]].map(([id2, t]) => el("button", { type: "button", class: "chip", onclick: () => navigate(`/sal/${id2}`) }, [el("span", { text: t })]))),
          noticeBox("info", "귀티는 사주에 있는 ‘결’일 뿐, 태도와 습관으로 얼마든지 키울 수 있어요. 참고용으로 즐겨 주세요."),
        );
        return;
      }
      if (key === "gilsin") {
        const P_MB = profile.pillars.month.branchIdx, L = R.gilsin, have = L.filter((g) => g.hits.length), score = Math.min(98, 35 + have.reduce((a, g) => a + g.w * 5 * Math.min(2, g.hits.length), 0));
        const grade = score >= 88 ? "복이 넘치는 사주" : score >= 72 ? "복이 많은 사주" : score >= 55 ? "복이 알맞은 사주" : "스스로 복을 짓는 사주";
        host.append(
          hero("잘사는 별 체크", `${grade} · ${have.length}/${L.length}`, have.length ? `${ig(have.map((g) => g.name).join(" · "))} 내 사주에 있어요.` : "원국엔 큰 길신이 드러나지 않았어요 — 운에서 들어오는 해를 노려요."),
          card("복의 별 하나씩", L.map((g) => el("div", { class: "gs-row" + (g.hits.length ? " on" : "") }, [
            el("span", { class: "gs-mark", text: g.hits.length ? "✓" : "–" }),
            el("div", { class: "gs-body" }, [
              el("b", { text: g.name }), el("span", { class: "gs-mean", text: g.mean }),
              el("small", { text: g.hits.length ? fx(`${g.hits.map((c) => `${c.nm} ${g.name.includes("덕") ? (c.s === WOLDEOK[P_MB] || (CHEONDEOK[P_MB][0] === "s" && c.s === CHEONDEOK[P_MB][1]) ? sk(c.s) : bk(c.b)) : bk(c.b)}`).join(", ")}에 있어요`) : `없어요 · 내 글자는 ${fx(g.ruleText)}` }),
            ]),
          ]))),
          card("복 지수", [el("p", { class: "serif sp-big", text: `${score}점` }), el("p", { class: "tiny muted", text: "기본 35점에 천을귀인 15점, 금여·건록·암록·천주·천덕월덕 각 10점, 문창 5점을 더했어요(같은 별이 두 번이면 두 배까지). 사주 전체의 힘·용신과 함께 보는 참고 지표예요." })]),
          el("div", { class: "block tag-warn" }, [el("span", { class: "block-label", text: "복을 키우는 법" }), el("ul", {}, S.tips.map((t) => el("li", { text: t })))]),
          el("div", { class: "gs-links" }, [["geumyeo", "🚗 금여 자세히"], ["amrok", "🎁 암록 자세히"], ["cheondeok", "🕊️ 천덕·월덕 자세히"], ["munchang", "📚 문창·학당 자세히"]].map(([id2, t]) => el("button", { type: "button", class: "chip", onclick: () => navigate(`/sal/${id2}`) }, [el("span", { text: t })]))),
          noticeBox("info", "길신이 있다고 저절로 부자가 되는 건 아니에요. 복이 들어오는 ‘통로’가 있다는 뜻으로 읽어 주세요."),
        );
        return;
      }
      if (key === "samjae") {
        const now = R.samjae.find((x) => x.y === Y), next = R.samjae.find((x) => x.y > Y && x.kind === "들삼재");
        host.append(
          hero("삼재", now ? `지금 ${now.kind}` : "지금은 삼재가 아니에요", now ? `${Y}년은 ${now.kind}예요. 무리하지 말고 지키는 해로 보내요.` : next ? `다음 삼재는 ${next.y}년부터 3년이에요.` : ""),
          card("삼재 달력", [el("div", { class: "sp-years" }, R.samjae.map((x) => el("span", { class: x.y === Y ? "now" : "", text: `${x.y}년 ${x.kind}` }))), el("p", { class: "tiny muted", text: R.rule })]),
          card("삼재를 잘 보내는 법", [el("ul", {}, S.tips.map((t) => el("li", { text: t })))]),
          noticeBox("info", "삼재는 옛 풍습에서 온 참고 지표예요. 정해진 불운이 아니라, 3년 동안 조금 더 조심하자는 뜻으로 봐 주세요."),
        );
        return;
      }
      const has = R.hits.length > 0;
      const level = R.hits.length >= 2 ? "짙게" : "은은하게";
      host.append(...[
        hero(S.name, has ? `있어요 · ${level}` : "원국엔 없어요", has ? `${S.tone} — ${S.has[0]}` : (S.not[0] || "")),
        card(`${S.name} (${S.h}) 위치`, [
          has ? el("p", { text: fx(`${R.hits.map((x) => `${x.nm} ${x.what}`).join(", ")}에 ${ig(S.name)} 있어요.`) }) : el("p", { text: `내 사주 네 기둥엔 ${ig(S.name)} 없어요.` }),
          R.extra ? el("p", { class: "tiny", text: R.extra }) : null,
          ...R.hits.filter((x) => S.life[x.k]).map((x) => el("p", { class: "tiny" }, [el("b", { text: `${x.nm} (${LIFE_KEY[x.k]}) · ` }), document.createTextNode(S.life[x.k])])),
          el("p", { class: "tiny muted", text: `보는 법: ${R.rule}` }),
        ]),
        card("이런 사람이에요", [el("ul", {}, (has ? S.has : S.not).map((t) => el("li", { text: t })))]),
        R.years && R.years.length ? card(`${S.name} 기운이 짙어지는 해`, [
          el("div", { class: "sp-years" }, R.years.map((y) => el("span", { class: y === Y ? "now" : "", text: `${y}년 ${SH[yearGZ(y).s]}${BH[yearGZ(y).b]}(${SK[yearGZ(y).s]}${BK[yearGZ(y).b]})` }))),
          el("p", { class: "tiny muted", text: "그해 들어오는 글자가 이 신살을 깨워요. 좋은 쪽으로 쓰면 기회, 무리하면 조심할 해예요." }),
        ]) : null,
        el("div", { class: "block tag-warn" }, [el("span", { class: "block-label", text: `${S.name} 잘 쓰는 법` }), el("ul", {}, S.tips.map((t) => el("li", { text: t })))]),
        noticeBox("info", "신살은 성향을 읽는 참고 지표예요. 좋고 나쁨이 아니라 ‘어떻게 쓰느냐’가 핵심이에요."),
      ].filter(Boolean));
    } });
}
