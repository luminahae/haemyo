/* 열어 본 풀이 — 이름표 (관리자 화면 · 마이 화면 같이 씀) */
export const OPEN_LABEL = {
  today: "오늘의 운세", tomorrow: "내일의 운세", tomorrowlove: "내일 애정운", weekday: "평일 운세", weekend: "주말 운세", todaylove: "오늘 애정운", luckycard: "행운 카드", charmtoday: "오늘의 매력", taegil: "택일", dayfortune: "날짜별 하루 운세", bujeok: "부적", sajumbti: "사주 MBTI", palm: "손금", studyluck: "공부운",
  dohwa: "도화살", gwimun: "귀문관살", lovecount: "연애 횟수", nomarry: "결혼 안 할 사주", children: "자녀운", completeme: "나를 완성하는 사람", fate3: "운명의 세 사람", rich: "부자가 될까", bizjob: "창업 vs 취업", moneytime: "돈 버는 시기",
  luck12: "십이운성 신년운세", luck12y: "십이운성 신년운세(연도)", love10: "연애운 10년", blueprint: "인생 설계도", spouseluck: "배우자복", story: "사주 이야기", manual: "사주 사용설명서", timeline: "인생 타임라인", gaeun: "개운법", sajutoon: "사주툰", healthsaju: "건강운", hwagae: "화개살", yeokma: "역마살",
  reunioncompat: "재회 궁합", reuniondeep: "헤어진 이유·재회", naming: "작명", namefix: "개명", daeundetail: "대운 상세", daeunall: "대운 전체", tojeongplus: "토정비결 월별·일별", tojeong: "토정비결", tojeonglife: "토정비결 인생", tojeongcompat: "토정비결 궁합", tjcompat: "토정비결 궁합",
  tjt_love: "토정 연애운", tjt_money: "토정 재물운", tjt_success: "토정 성공운", tjt_spouse: "토정 배우자복", tjt_fate: "토정 운명의 사람",
  cpclassic: "궁합 · 정통", cpelem: "궁합 · 오행", cpanimal: "궁합 · 일주동물", cpmoney: "궁합 · 재물", cpnight: "궁합 · 낮져밤이", cptravel: "궁합 · 여행", cpeco: "궁합 · 경제관념", cpif: "궁합 · 만약 연인이라면", cpgift: "궁합 · 선물 추천",
  rankself: "순위", rankall: "순위 전체", job: "취업운", interview: "면접운", jobchange: "이직운", promotion: "승진운", coworker: "직장 동료운", startup: "창업운", windfall: "횡재운", saving: "저축운", invest: "투자운", spending: "소비운", sidejob: "부업운",
  jobmonth: "취업 시기", moneymonth: "돈 들어오는 달", worktype: "맞는 직업", moneytype: "재물 그릇", pastlife: "전생", pastlove: "전생 인연", dday: "D-day", ddaylove: "연애 D-day", ddaymarry: "결혼 D-day", ddaymeet: "만남 D-day", daypreview: "지정일 미리보기",
  wealth: "재물운", guiin: "귀인", gwansang: "관상", month: "이달의 운세", nextmonth: "다음 달 운세", monthlove: "이달 애정운", daylove: "하루 애정운", business: "사업운", lucky: "행운", zodiac: "띠 운세", star: "별자리", charmmonth: "이달의 매력", sajudeep: "사주 심화",
  calendar: "운세 캘린더", love: "연애운", pull: "인연 뽑기", pullpair: "둘이 뽑기", yearlove: "올해 연애운", reunion: "재회운", breakup: "이별운", "ziwei-deep": "자미두수 심화", tarot: "타로", year: "올해 운세", inyeon: "나의 인연", compat: "궁합", rank: "순위",
  "spouse-portrait": "배우자 얼굴", "portrait-date": "만나는 날", "portrait-avoid": "피할 사람", lotto: "행운 번호", iching: "주역점",
};
const SAL_KO = { yangin: "양인살", goegang: "괴강살", baekho: "백호살", hyeonchim: "현침살", gongmang: "공망", gosin: "고신·과숙", cheonra: "천라지망", samjae: "삼재", munchang: "문창귀인", cheondeok: "천덕귀인", geupgak: "급각살", amrok: "암록", geumyeo: "금여록", gilsin: "길신", gwiti: "귀티" };
export function openLabel(id) {
  const parts = String(id).split(":");
  let key = parts[0];
  if (!OPEN_LABEL[key] && parts[1] && OPEN_LABEL[parts[1]]) key = parts[1]; // cp:cpelem:… 처럼 앞에 묶음 이름이 붙은 것
  if (key.startsWith("sal_")) return `신살 · ${SAL_KO[key.slice(4)] || key.slice(4)}`;
  const yr = String(id).match(/:(20\d\d)(?::|$)/);
  return (OPEN_LABEL[key] || key) + (yr ? ` (${yr[1]})` : "");
}

/* 경로 없이 남은 예전 기록 → 화면 주소 짐작 */
const ROUTE_OF = {
  rich: "/rich", manual: "/manual", love10: "/love10", blueprint: "/blueprint", spouseluck: "/spouseluck", story: "/story", timeline: "/timeline", gaeun: "/gaeun",
  sajutoon: "/sajutoon", healthsaju: "/health-saju", hwagae: "/hwagae", yeokma: "/yeokma", dohwa: "/dohwa", gwimun: "/gwimun", lovecount: "/love-count", nomarry: "/no-marry",
  children: "/children", completeme: "/complete-me", fate3: "/fate3", bizjob: "/bizjob", moneytime: "/moneytime", luck12: "/luck12", luck12y: "/luck12", naming: "/naming",
  reuniondeep: "/reunion-deep", tojeong: "/tojeong", tojeonglife: "/tojeong", tojeongplus: "/tojeong-plus", tojeongcompat: "/tojeong-compat", tjcompat: "/tojeong-compat",
  tjt_love: "/tojeong-theme/love", tjt_money: "/tojeong-theme/money", tjt_success: "/tojeong-theme/success", tjt_spouse: "/tojeong-theme/spouse", tjt_fate: "/tojeong-theme/fate",
  pastlife: "/pastlife", gwansang: "/gwansang", calendar: "/calendar", pull: "/pull", pullpair: "/pull/pair", inyeon: "/inyeon", iching: "/iching", palm: "/palm",
  sajumbti: "/saju-mbti", studyluck: "/study-luck", luckycard: "/luckycard", bujeok: "/bujeok", zodiac: "/zodiac", star: "/star", lotto: "/luckynumber",
};
function routeGuess(id) {
  const parts = String(id).split(":");
  let key = parts[0];
  if (!OPEN_LABEL[key] && parts[1] && OPEN_LABEL[parts[1]]) key = parts[1]; // cp:cpelem:… 처럼 앞에 묶음 이름이 붙은 것
  if (key.startsWith("sal_")) return "/sal/" + key.slice(4);
  if (/^cp/.test(key)) return "/compat-plus";
  return ROUTE_OF[key] || "";
}
const VIA = { admin: "관리자 무제한", family: "가족 코드", daypass: "하루 무제한 코드", view: "무료" };

/** 열람 기록을 화면 하나당 한 줄로 묶어 최근 순으로 */
const PATH_LABEL = Object.fromEntries(Object.entries(ROUTE_OF).map(([k, v]) => [v, OPEN_LABEL[k] || k]));
Object.assign(PATH_LABEL, { "/saju/result": "사주 리포트", "/tarot/result": "타로 리딩", "/compat/result": "궁합", "/compat-plus": "관계별 궁합", "/wonguk": "사주 원국", "/manse": "만세력", "/reunion-deep": "헤어진 이유 · 재회 궁합", "/pull/pair": "끌림 궁합", "/tojeong-compat": "토정비결 궁합" });
const LOADING_TXT = /준비하고 있어요|불러오는 중|계산하는 중/;
export const KEEP_DAYS = 7;
const dayStart = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

/** 열람 기록을 화면 하나(+같이 본 사람)당 한 줄로 묶어 최근 순으로
 *  opts.all: 관리자 — 예전 기록·7일 지난 것까지 모두 */
export function openedRows(w, { all = false } = {}) {
  const un = (w && w.unlocked) || [];
  const log = ((w && w.openLog) || []).slice().sort((a, b) => b.t - a.t);
  const seen = new Set(log.map((x) => x.id));
  const old = all ? un.filter((id) => !seen.has(id)).map((id) => ({ id, t: 0, c: null, via: "coin" })) : [];
  const since = Date.now() - KEEP_DAYS * 864e5;
  const groups = new Map();
  for (const r of [...log, ...old]) {
    if (!all && (!r.t || r.t < since)) continue; // 일반 회원은 7일 안에 직접 연 것만
    const isView = r.via === "view";
    const path = (isView ? String(r.id).replace(/^view:/, "") : (r.p || routeGuess(r.id))).split("?")[0];
    if (/\/loading$/.test(path) || (isView && r.title && LOADING_TXT.test(r.title))) continue;
    const key = (path || r.id) + (r.with ? "|" + r.with : "");
    let g = groups.get(key);
    if (!g) { g = { key, path, t: r.t || 0, title: "", label: "", coin: 0, via: "", n: 0, who: r.who || "", with: r.with || "" }; groups.set(key, g); }
    g.n++;
    if (isView && !g.title && r.title && !LOADING_TXT.test(r.title)) g.title = r.title;
    if (!isView && !g.label) g.label = openLabel(r.id);
    if (!g.who && r.who) g.who = r.who;
    if (r.keepTag && !g.keepTag) g.keepTag = r.keepTag; // 보관 해제로 돌아온 줄 — 원래 표시(🪙 등) 유지
    if (r.c > 0) g.coin += r.c; else if (r.c == null && r.via === "coin") g.coin = g.coin || -1;
    if (!isView && r.via && VIA[r.via] && !g.via) g.via = VIA[r.via];
    if ((r.t || 0) > g.t) g.t = r.t;
  }
  const now = Date.now();
  return [...groups.values()].sort((a, b) => b.t - a.t).map((g) => ({
    ...g,
    name: g.label || (g.title.split(" · ").map((x) => x.trim()).filter((x) => x && x !== "무료")[0]) || PATH_LABEL[g.path] || g.path || g.key,
    tag: g.coin > 0 ? `🪙 ${g.coin}` : g.coin < 0 ? "코인" : g.keepTag || g.via || "무료",
    left: g.t ? Math.max(0, Math.round((dayStart(g.t + KEEP_DAYS * 864e5) - dayStart(now)) / 864e5)) : 0, // 달력 날짜 기준 D-7 … D-DAY
    gone: g.t ? g.t + KEEP_DAYS * 864e5 : 0,
  }));
}
export function fmtOpenTime(t, year = false) {
  return t ? new Date(t).toLocaleString("ko-KR", { ...(year ? { year: "numeric" } : {}), month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "예전 기록";
}
