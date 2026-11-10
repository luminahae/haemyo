import { el, clear } from "../utils/dom.js";
import { backLink, pageHeader } from "./shared.js";
import { getMyBirth, stash } from "../state.js";
import { canSeeLifespan } from "../wallet.js";
/* =========================================================
   전체 메뉴 — 모든 기능을 한곳에 묶어 둔 목록 (홈·전체 메뉴가 같이 씀)
   작성: HAE
   ========================================================= */
export const MENU = [
  { id: "saju", title: "사주 · 명리", em: "🔮", color: "#ffc3d1", items: [
    { id: "special", em: "👑", name: "프리미엄", blurb: "특집 풀이 모아 보기", to: "/special", isNew: true },
    { id: "manual", em: "📘", name: "사주 사용설명서", blurb: "나를 다루는 법", to: "/manual", isNew: true },
    { id: "timeline", em: "🗺️", name: "인생 타임라인", blurb: "10년 운 · 전성기", to: "/timeline", isNew: true },
    { id: "dohwa", em: "🌸", name: "도화살 체크", blurb: "매력이 터지는 해", to: "/dohwa", isNew: true },
    { id: "hwagae", em: "🏮", name: "화개살 체크", blurb: "예술·학문·고독의 별", to: "/hwagae", isNew: true },
    { id: "yeokma", em: "🐎", name: "역마살 체크", blurb: "이동·변화·해외 운", to: "/yeokma", isNew: true },
    { id: "gwimun", em: "👁️", name: "귀문관살", blurb: "예민함·직감", to: "/gwimun", isNew: true },
    { id: "saju", em: "📜", name: "사주 리포트", blurb: "실제 만세력 명식·성향", to: "/saju", my: "saju" },
    { id: "manse", em: "🗓️", name: "만세력", blurb: "생년월일만 넣으면 바로", to: "/manse" },
    { id: "wonguk", em: "🧭", name: "사주 원국 한눈에", blurb: "십성·운성·형충회합·신살·대운", to: "/wonguk", isNew: true },
    { id: "fortune", em: "🌙", name: "운세", blurb: "오늘·이달·올해·연애·돈", to: "/fortune" },
    { id: "explore", em: "🎁", name: "테마 운세", blurb: "결혼 시기·솔로 탈출 등", to: "/explore" },
    { id: "ziwei", em: "🌌", name: "자미두수", blurb: "12궁 14주성 명반", to: "/ziwei", my: "ziwei" },
    { id: "tojeong", em: "📖", name: "토정비결", blurb: "올해의 괘로 보는 흐름", to: "/tojeong" },
    { id: "studyluck", em: "📚", name: "공부운", blurb: "공부 스타일·시험 잘 되는 날", to: "/study-luck", isNew: true },
    { id: "mbti", em: "🧩", name: "사주 MBTI", blurb: "내 사주는 무슨 유형?", to: "/saju-mbti", isNew: true },
    { id: "study", em: "🎓", name: "사주 공부방", blurb: "용어·원리 한글로 쉽게", to: "/study" },
  ] },
  { id: "tarot", title: "타로 · 점", em: "🃏", color: "#ffd0b0", items: [
    { id: "tarot", em: "🃏", name: "타로", blurb: "고양이 카드 78장", to: "/tarot" },
    { id: "tarot-today", em: "☀️", name: "오늘의 한 마디", blurb: "카드 한 장 · 무료", to: "/fortune/tarot/today", free: true },
    { id: "oracle", em: "🐾", name: "쓸데없는 고민", blurb: "예·아니오 오라클", to: "/oracle" },
    { id: "iching", em: "🪙", name: "주역점", blurb: "동전으로 묻는 64괘", to: "/iching", isNew: true },
    { id: "soyukim", em: "🖐️", name: "소육임", blurb: "지금 이 순간의 답", to: "/so-yukim", isNew: true },
    { id: "astrodice", em: "🎲", name: "점성술 다이스", blurb: "주사위 세 개의 답", to: "/astro-dice", isNew: true },
    { id: "luckycard", em: "🍀", name: "행운 카드", blurb: "오늘의 럭키 한 장", to: "/luckycard" },
    { id: "dream", em: "💭", name: "꿈해몽", blurb: "무슨 꿈 꿨어? · 무료", to: "/dream", free: true },
  ] },
  { id: "love", title: "연애 · 인연", em: "💗", color: "#ffb3c8", items: [
    { id: "compat", em: "💞", name: "궁합", blurb: "두 사람의 맞물림", to: "/compat" },
    { id: "compatplus", em: "💞", name: "궁합 특집", blurb: "관계별·재물·여행·선물 추천", to: "/compat-plus", isNew: true },
    { id: "reuniondeep", em: "🔁", name: "재회 궁합", blurb: "헤어진 이유 · 다시 만날 때", to: "/reunion-deep", isNew: true },
    { id: "inyeon", em: "💌", name: "나의 인연", blurb: "이상형·초상화·바람기", to: "/inyeon" },
    { id: "pull", em: "✨", name: "내 매력 사주", blurb: "이성이 빠져드는 포인트", to: "/pull" },
    { id: "ddaylove", em: "💗", name: "연애 D-day", blurb: "새 연애까지 며칠?", to: "/dday/love" },
    { id: "ddaymarry", em: "💍", name: "결혼 D-day", blurb: "결혼까지 며칠?", to: "/dday/marry" },
    { id: "ddaymeet", em: "🧭", name: "인연은 어디서", blurb: "동서남북·지역 힌트", to: "/dday/meet" },
    { id: "pastlove", em: "🔙", name: "지난 연애 맞히기", blurb: "과거 연애한 해", to: "/dday/past" },
    { id: "lovecount", em: "💞", name: "남은 연애 횟수", blurb: "큰 연애 기회 몇 번?", to: "/love-count", isNew: true },
    { id: "nomarry", em: "🙅", name: "결혼하면 안 되는 상대", blurb: "레드 플래그", to: "/no-marry", isNew: true },
    { id: "completeme", em: "🧩", name: "나를 완성시킬 사람", blurb: "내 빈칸을 채울 사람", to: "/complete-me", isNew: true },
    { id: "idol", em: "💘", name: "최애 궁합", blurb: "생일만 넣으면 · 무료", to: "/idol-compat", free: true },
    { id: "children", em: "👶", name: "자녀운", blurb: "자녀와의 인연", to: "/children", isNew: true },
    { id: "charm", em: "🌡️", name: "매력 지수", blurb: "오늘의 매력 온도", to: "/charm" },
  ] },
  { id: "luck", title: "개운 · 행운", em: "🍀", color: "#bfe1d1", items: [
    { id: "gaeun", em: "🏠", name: "풍수 · 개운", blurb: "용신 맞춤 방 배치", to: "/gaeun", isNew: true },
    { id: "bujeok", em: "🧧", name: "개운 부적", blurb: "소원 담은 내 부적", to: "/bujeok", isNew: true },
    { id: "luckynumber", em: "🔢", name: "행운 번호", blurb: "하루 한 번 무료", to: "/luckynumber", free: true },
    { id: "health", em: "💊", name: "사주 건강운", blurb: "이달 컨디션 지수", to: "/health-saju" },
    { id: "classic", em: "📜", name: "이달의 명심보감", blurb: "고전 한 구절 · 무료", to: "/classic", free: true },
    { id: "biorhythm", em: "📈", name: "바이오리듬", blurb: "신체·감성·지성", to: "/biorhythm" },
  ] },
  { id: "naming", title: "이름 · 작명", em: "✍️", color: "#ffe0b0", items: [
    { id: "name", em: "🔤", name: "이름풀이", blurb: "한자 없이 소리로 보기", to: "/name/hangul" },
    { id: "name-hanja", em: "📜", name: "한자 이름 풀이", blurb: "수리 4격·자원오행", to: "/name/hanja" },
    { id: "name-pair", em: "💞", name: "한자 이름 궁합", blurb: "두 사람 이름의 어울림", to: "/name/pair", isNew: true },
    { id: "naming", em: "🖋️", name: "작명 · 개명", blurb: "사주 맞춤 한자 이름 추천", to: "/naming", isNew: true },
    { id: "nick", em: "🏷️", name: "닉네임 추천", blurb: "게임·SNS·블로그·영어 아이디", to: "/name/nick" },
  ] },
  { id: "fun", title: "재미로 보기", em: "🎈", color: "#d9c4f2", items: [
    { id: "sajutoon", em: "🐱", name: "사주툰", blurb: "나의 하루 4컷 만화", to: "/sajutoon", isNew: true },
    { id: "pastlife", em: "⏳", name: "전생 이야기", blurb: "전생의 나·맞는 직업", to: "/pastlife" },
    { id: "palm", em: "✋", name: "손금", blurb: "내 손 보며 따라 보기", to: "/palm", isNew: true },
    { id: "gwansang", em: "🙂", name: "관상", blurb: "사진으로 보는 얼굴", to: "/gwansang" },
    { id: "zodiac", em: "🐯", name: "띠 운세", blurb: "60간지·오늘의 띠운", to: "/zodiac" },
    { id: "star", em: "⭐", name: "별자리", blurb: "생일로 보는 별자리", to: "/star" },
  ] },
  { id: "tools", title: "내 사람 · 도구", em: "👥", color: "#cdd8ff", items: [
    { id: "diary", em: "📔", name: "운세 일기장", blurb: "기분 × 일진 기록 · 무료", to: "/diary", isNew: true },
    { id: "people", em: "👥", name: "내 사람들", blurb: "저장한 친구·귀인 체크", to: "/people" },
    { id: "ranks", em: "🏆", name: "내 사람 랭킹", blurb: "귀인·결혼운·나 포함 순위", to: "/ranks", isNew: true },
    { id: "calendar", em: "📅", name: "운세 캘린더", blurb: "날짜별 점수·택일", to: "/calendar" },
    { id: "saved", em: "🔖", name: "보관함", blurb: "보관한 풀이 · 저장한 결과", to: "/saved" },
    { id: "lifespan", em: "🕯️", name: "수명 운", blurb: "사주·토정·자미두수", to: "/lifespan", lock: true },
    { id: "store", em: "🪙", name: "코인 · 출석", blurb: "매일 출석 무료 코인", to: "/store" },
  ] },
];
export const ALL_ITEMS = MENU.flatMap((g) => g.items.map((it) => ({ ...it, group: g.id })));
export const findItem = (id) => ALL_ITEMS.find((x) => x.id === id);

export function goItem(it, navigate) {
  const my = getMyBirth();
  if (my && it.my === "saju") { stash("saju:input", my); return navigate("/saju/loading"); }
  if (my && it.my === "ziwei") { stash("ziwei:input", my); return navigate("/ziwei/result"); }
  navigate(it.to);
}
const shown = (it) => (it.lock && !canSeeLifespan() ? { ...it, name: it.name + " 🔒", blurb: "특별 코드로 열려요" } : it);

/* 아이콘 버튼 (동그란 파스텔 아이콘 + 이름) */
export function iconBtn(it, navigate, color) {
  it = shown(it);
  return el("button", { type: "button", class: "mi-btn", onclick: () => goItem(it, navigate), "aria-label": `${it.name} — ${it.blurb}` }, [
    el("span", { class: "mi-ic", style: `--c:${color || "#ffc3d1"};`, text: it.em }),
    el("span", { class: "mi-name", text: it.name }),
    it.isNew ? el("span", { class: "mi-new", text: "N" }) : it.free ? el("span", { class: "mi-free", text: "무료" }) : null,
  ].filter(Boolean));
}
/* 가로 선반용 작은 카드 */
export function shelfCard(it, navigate, color) {
  it = shown(it);
  return el("button", { type: "button", class: "sh-card", "data-noterm": "", style: `--c:${color};`, onclick: () => goItem(it, navigate) }, [
    el("span", { class: "sh-em", text: it.em }),
    el("b", { text: it.name }),
    el("span", { class: "sh-blurb", text: it.blurb }),
    it.isNew ? el("span", { class: "sh-tag", text: "NEW" }) : it.free ? el("span", { class: "sh-tag free", text: "무료" }) : null,
  ].filter(Boolean));
}

export function renderMenu({ navigate }) {
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(pageHeader("전체 메뉴", "무엇이 궁금해?", "해묘의 모든 메뉴를 주제별로 모았어요. 이름으로 찾아도 돼요."));
  const q = el("input", { class: "input mn-search", type: "search", placeholder: "🔍 메뉴 찾기 (예: 궁합, 꿈, 부적)", "aria-label": "메뉴 검색" });
  const jump = el("div", { class: "mn-jump" }, MENU.map((g) => el("button", { type: "button", class: "theme-chip", onclick: () => {
    const t = root.querySelector(`#mn-${g.id}`); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
  } }, [el("span", { text: `${g.em} ${g.title}` })])));
  const host = el("div", {});
  root.append(el("section", { class: "wrap mn-top" }, [q, jump]), el("section", { class: "wrap" }, [host]));
  function paint() {
    clear(host);
    const k = q.value.trim().replace(/\s/g, "");
    let any = false;
    MENU.forEach((g) => {
      const items = g.items.filter((it) => !k || (it.name + it.blurb + g.title).replace(/\s/g, "").includes(k));
      if (!items.length) return;
      any = true;
      host.append(el("div", { class: "mn-group", id: `mn-${g.id}` }, [
        el("h2", { class: "mn-title" }, [el("span", { class: "mn-em", style: `--c:${g.color};`, text: g.em }), el("span", { text: g.title })]),
        el("div", { class: "mi-grid" }, items.map((it) => iconBtn(it, navigate, g.color))),
      ]));
    });
    if (!any) host.append(el("p", { class: "muted", style: "text-align:center; padding: var(--sp-6) 0;", text: `‘${q.value}’에 맞는 메뉴가 없어요. 다른 말로 찾아볼까요?` }));
  }
  q.addEventListener("input", paint);
  paint();
  const g0 = window.__menuGroup; window.__menuGroup = null;
  if (g0) setTimeout(() => { const t = root.querySelector(`#mn-${g0}`); if (t) t.scrollIntoView({ block: "start" }); }, 60);
  return root;
}
