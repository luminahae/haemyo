import { el, clear } from "../utils/dom.js";
import { pageHeader, loadDisclaimer } from "./shared.js";
import { getMyBirth, stash } from "../state.js";
import { themes as sajuThemes } from "./explore.js";
import { tarotThemes, startTarotTheme } from "./tarotQuestion.js";
import { costOf } from "../wallet.js";
import { LOVE_FUN } from "./special.js";
/* =========================================================
   프리미엄 — 깊이 보는 풀이를 한곳에 (장르별 / 주제별)
   운세 탭 = 오늘·이달·올해처럼 '기간' 운세, 타로 탭 = 직접 묻는 카드, 프리미엄 = 특집 풀이
   작성: HAE
   ========================================================= */
const GENRES = [
  ["saju", "☯️", "사주"], ["tarot", "🃏", "타로"], ["ziwei", "🌌", "자미두수"], ["tojeong", "📖", "토정비결"], ["iching", "🪙", "주역"],
  ["yukim", "🖐️", "소육임"], ["astro", "🎲", "점성술"], ["face", "✋", "손금·관상"], ["dream", "💭", "꿈해몽"], ["sinsal", "🌸", "신살"], ["name", "🖋️", "이름·작명"], ["fun", "🎈", "재미"],
];
// 한 줄에 한 갈래: ① 사랑 ② 일·돈·몸 ③ 나와 사람 ④ 흐름·개운
const TOPIC_GROUPS = [
  { id: "love", label: "사랑", items: ["애정운", "궁합", "재회운", "결혼운"] },
  { id: "life", label: "일·돈·몸", items: ["재물운", "직업운", "학업운", "건강운"] },
  { id: "me", label: "나와 사람", items: ["성향", "신살", "인간관계", "고민"] },
  { id: "flow", label: "흐름·개운", items: ["신년운세", "인생흐름", "개운", "이름·작명"] },
];
const TOPICS = TOPIC_GROUPS.flatMap((g) => g.items);
const TOPIC_MAP = {
  애정운: "애정운", 솔로: "애정운", 썸: "애정운", 커플: "애정운", 연애: "애정운", 속마음: "애정운", 매력: "성향",
  결혼: "결혼운", "커플·결혼": "결혼운", 궁합: "궁합", 재회운: "재회운", 재회: "재회운",
  재물운: "재물운", 재물: "재물운", "일·돈": "재물운", 직업운: "직업운", 취업: "직업운", 직장: "직업운",
  학업운: "학업운", 건강운: "건강운", 대인관계: "인간관계", "친구·가족": "인간관계", SNS: "인간관계", 반려동물: "고민",
  성향: "성향", 개운: "개운", 풍수지리: "개운", 행운: "개운", 신년운세: "신년운세", 월운: "신년운세", 총운: "신년운세",
  고민: "고민", 마음: "고민", 선택: "고민", 오늘: "고민", 정통운세: "개운", 주역: "고민", 사주툰: "성향",
};
const TAG = { sinsal: ["신살", "#ffd0e0"], name: ["이름·작명", "#ffe0b0"], saju: ["사주", "#ffc3d1"], tarot: ["타로", "#d9c4f2"], ziwei: ["자미두수", "#cdd8ff"], tojeong: ["토정", "#ffe0a3"], iching: ["주역", "#ffe0a3"], yukim: ["소육임", "#ffd0b0"], astro: ["점성술", "#cdd8ff"], face: ["손금·관상", "#c4e8dc"], dream: ["꿈해몽", "#d9c4f2"], fun: ["재미", "#bfe1d1"] };
const EMO = { 궁합: "💞", 신살: "🌸", "이름·작명": "🖋️", 인생흐름: "🗺️", 애정운: "💗", 결혼운: "💍", 재회운: "🔁", 재물운: "💰", 직업운: "💼", 학업운: "📚", 건강운: "💊", 인간관계: "🤝", 성향: "✨", 개운: "🍀", 신년운세: "🌅", 고민: "🔮" };

/* 프리미엄 전용 특집 + 개별 메뉴 */
function extraItems() {
  const ny = new Date().getFullYear() + 1;
  return [
    { id: "manual", genre: "saju", topics: ["성향"], em: "📘", title: "사주팔자 사용설명서", sub: "세상에 단 하나뿐인 나를 다루는 법", cost: costOf("manual"), to: "/manual", isNew: true, hot: 1 },
    { id: "timeline", genre: "saju", topics: ["인생흐름", "신년운세"], em: "🗺️", title: "내 인생 타임라인", sub: "10년마다 바뀌는 인생의 계절 · 전성기", cost: costOf("timeline"), to: "/timeline", isNew: true, hot: 3 },
    { id: "dohwa", genre: "sinsal", topics: ["신살", "애정운", "성향"], em: "🌸", title: "나에게 도화살이 있을까?", sub: "도화살·홍염살 · 매력이 터지는 해", cost: costOf("dohwa"), to: "/dohwa", isNew: true, hot: 2 },
    { id: "reuniondeep", genre: "saju", topics: ["재회운", "궁합", "애정운"], em: "🔁", title: "헤어진 이유 · 재회 궁합", sub: "상대 사주로 보는 엇갈린 이유 · 재회 점수 · 다시 열리는 달", cost: costOf("reunioncompat"), to: "/reunion-deep", isNew: true, hot: 1.5 },
    { id: "naming", genre: "name", topics: ["이름·작명", "개운"], em: "🖋️", title: "사주 맞춤 작명 · 개명", sub: "용신·수리 4격 맞춘 한자 이름 추천 · 지금 이름 진단", cost: costOf("naming"), to: "/naming", isNew: true },
    { id: "compatplus", genre: "saju", topics: ["궁합", "애정운", "인간관계"], em: "💞", title: "궁합 특집 — 관계별로 깊이", sub: "연인·친구·동료 정통 궁합 · 재물·여행 궁합 · 선물·초콜릿·색 추천", cost: 2, to: "/compat-plus", isNew: true, hot: 1.2 },
    { id: "hwagae", genre: "sinsal", topics: ["신살", "성향", "학업운"], em: "🏮", title: "나에게 화개살이 있을까?", sub: "예술·학문·고독의 별 · 몰입하기 좋은 해", cost: costOf("hwagae"), to: "/hwagae", isNew: true },
    { id: "yeokma", genre: "sinsal", topics: ["신살", "성향", "직업운"], em: "🐎", title: "나에게 역마살이 있을까?", sub: "이동·해외·변화 운 · 움직이는 해", cost: costOf("yeokma"), to: "/yeokma", isNew: true },
    { id: "gwimun", genre: "sinsal", topics: ["신살", "성향", "고민"], em: "👁️", title: "귀신 드는 사주? 귀문관살", sub: "예민함·직감 · 원진살까지", cost: costOf("gwimun"), to: "/gwimun", isNew: true },
    { id: "sal-gilsin", genre: "sinsal", topics: ["신살", "재물운", "결혼운"], em: "💎", title: "잘사는 사주일까? 복의 별 체크", sub: "금여·천을귀인·건록·암록·천주·천덕월덕 한 번에", cost: costOf("sal_gilsin"), to: "/sal/gilsin", isNew: true, hot: 2.5 },
    { id: "sal-gwiti", genre: "sinsal", topics: ["신살", "성향", "인간관계"], em: "👑", title: "귀티 나는 사주일까?", sub: "천을귀인·금여·관인상생·화개로 보는 기품", cost: costOf("sal_gwiti"), to: "/sal/gwiti", isNew: true, hot: 2.8 },
    { id: "sal-geumyeo", genre: "sinsal", topics: ["신살", "결혼운", "재물운"], em: "🚗", title: "나에게 금여(金輿)가 있을까?", sub: "황금 수레 · 배우자 복 · 편안한 재물", cost: costOf("sal_geumyeo"), to: "/sal/geumyeo", isNew: true },
    { id: "sal-samjae", genre: "sinsal", topics: ["신살", "신년운세", "인생흐름"], em: "🌀", title: "나의 삼재는 언제일까?", sub: "들삼재·눌삼재·날삼재 달력", cost: costOf("sal_samjae"), to: "/sal/samjae", isNew: true },
    { id: "sal-yangin", genre: "sinsal", topics: ["신살", "성향", "직업운"], em: "🗡️", title: "나에게 양인살이 있을까?", sub: "칼처럼 강한 추진력 · 승부욕", cost: costOf("sal_yangin"), to: "/sal/yangin", isNew: true },
    { id: "sal-goegang", genre: "sinsal", topics: ["신살", "성향", "직업운"], em: "⚡", title: "나에게 괴강살이 있을까?", sub: "강한 카리스마 · 리더의 기질", cost: costOf("sal_goegang"), to: "/sal/goegang", isNew: true },
    { id: "sal-baekho", genre: "sinsal", topics: ["신살", "성향", "건강운"], em: "🐯", title: "나에게 백호살이 있을까?", sub: "백호대살 · 강렬한 에너지", cost: costOf("sal_baekho"), to: "/sal/baekho", isNew: true },
    { id: "sal-hyeonchim", genre: "sinsal", topics: ["신살", "성향", "직업운"], em: "📌", title: "나에게 현침살이 있을까?", sub: "예리한 손재주 · 날카로운 말", cost: costOf("sal_hyeonchim"), to: "/sal/hyeonchim", isNew: true },
    { id: "sal-gongmang", genre: "sinsal", topics: ["신살", "성향", "고민"], em: "🕳️", title: "내 사주의 공망은 어디일까?", sub: "비어 있는 자리 · 내려놓기", cost: costOf("sal_gongmang"), to: "/sal/gongmang", isNew: true },
    { id: "sal-gosin", genre: "sinsal", topics: ["신살", "애정운", "결혼운"], em: "🌙", title: "고신살·과숙살이 있을까?", sub: "외로움의 별 · 독립심", cost: costOf("sal_gosin"), to: "/sal/gosin", isNew: true },
    { id: "sal-cheonra", genre: "sinsal", topics: ["신살", "고민"], em: "🕸️", title: "천라지망살이 있을까?", sub: "막히는 듯 버티면 풀리는 별", cost: costOf("sal_cheonra"), to: "/sal/cheonra", isNew: true },
    { id: "sal-munchang", genre: "sinsal", topics: ["신살", "학업운"], em: "📚", title: "공부 귀인, 문창·학당이 있을까?", sub: "시험·자격증·글재주의 별", cost: costOf("sal_munchang"), to: "/sal/munchang", isNew: true },
    { id: "sal-cheondeok", genre: "sinsal", topics: ["신살", "인간관계", "개운"], em: "🕊️", title: "덕(德)이 있는 사주일까?", sub: "천덕·월덕귀인 · 위기에 오는 손길", cost: costOf("sal_cheondeok"), to: "/sal/cheondeok", isNew: true },
    { id: "sal-amrok", genre: "sinsal", topics: ["신살", "재물운"], em: "🎁", title: "숨은 복, 암록이 있을까?", sub: "보이지 않는 곳에서 오는 도움", cost: costOf("sal_amrok"), to: "/sal/amrok", isNew: true },
    { id: "sal-geupgak", genre: "sinsal", topics: ["신살", "건강운"], em: "🦵", title: "급각살이 있을까?", sub: "다리·관절 건강 · 서두르지 않기", cost: costOf("sal_geupgak"), to: "/sal/geupgak", isNew: true },
    { id: "lovecount", genre: "saju", topics: ["애정운"], em: "💞", title: "남은 연애 횟수", sub: "앞으로 30년, 큰 연애 기회는 몇 번?", cost: costOf("lovecount"), to: "/love-count", isNew: true, hot: 4 },
    { id: "nomarry", genre: "saju", topics: ["결혼운"], em: "🙅", title: "절대 결혼하면 안 되는 상대", sub: "레드 플래그 · 의외로 잘 맞는 사람", cost: costOf("nomarry"), to: "/no-marry", isNew: true, hot: 5 },
    { id: "children", genre: "saju", topics: ["결혼운"], em: "👶", title: "자녀운", sub: "자녀와의 인연 · 자녀 성향 · 시기", cost: costOf("children"), to: "/children", isNew: true },
    { id: "rich", genre: "saju", topics: ["재물운", "성향"], em: "💰", title: "나는 부자가 될까?", sub: "사주 · 관상 · 타로 종합 부자 지수 · 부자 유형", cost: costOf("rich"), to: "/rich", isNew: true, hot: 0.5 },
    { id: "bizjob", genre: "saju", topics: ["직업운", "재물운"], em: "🧭", title: "창업 vs 취업, 나에게 맞는 길", sub: "사주 · 자미두수 · 타로로 종합 판정", cost: costOf("bizjob"), to: "/bizjob", isNew: true, hot: 2.5 },
    { id: "moneytime", genre: "saju", topics: ["재물운", "인생흐름"], em: "📅", title: "돈 버는 시기 · 모으는 시기", sub: "앞으로 10년 · 올해 12달 · 대운", cost: costOf("moneytime"), to: "/moneytime", isNew: true, hot: 3.5 },
    { id: "story", genre: "saju", topics: ["성향", "인생흐름"], em: "🎧", title: "사주 스토리 리딩", sub: "내 사주를 이야기로 · 음성 해설", cost: costOf("story"), to: "/story", isNew: true, hot: 4 },
    { id: "luck12", genre: "saju", topics: ["신년운세", "인생흐름"], em: "🌗", title: "십이운성 신년운세", sub: "올해의 화두 · 열두 달 흐름", cost: costOf("luck12"), to: "/luck12", isNew: true, hot: 4 },
    { id: "love10", genre: "saju", topics: ["애정운", "인생흐름"], em: "💌", title: "연애운 10년 연대기", sub: "앞으로 10년, 연애가 피는 해", cost: costOf("love10"), to: "/love10", isNew: true, hot: 4.5 },
    { id: "spouseluck", genre: "saju", topics: ["결혼운", "애정운"], em: "💍", title: "나의 배우자복", sub: "배우자 자리 · 배우자 별로 보는 복", cost: costOf("spouseluck"), to: "/spouseluck", isNew: true, hot: 4.5 },
    { id: "blueprint", genre: "saju", topics: ["인생흐름", "직업운"], em: "🗺️", title: "5년 인생 설계 · Blueprint", sub: "해마다 집중할 것 · 실천 계획", cost: costOf("blueprint"), to: "/blueprint", isNew: true, hot: 4 },
    { id: "fate3", genre: "saju", topics: ["궁합", "애정운", "결혼운"], em: "👥", title: "운명의 세 사람", sub: "귀인 · 인생의 반쪽 · 나를 단련시키는 사람", cost: costOf("fate3"), to: "/fate3", isNew: true, hot: 5 },
    { id: "completeme", genre: "saju", topics: ["궁합", "애정운", "결혼운"], em: "🧩", title: "당신을 완성시켜 줄 그 사람", sub: "내 사주의 빈칸을 채울 사람", cost: costOf("completeme"), to: "/complete-me", isNew: true },
    { id: "idol", genre: "saju", topics: ["궁합", "애정운"], em: "💘", title: "최애와 나의 궁합", sub: "생일만 넣으면 바로 · 무료", cost: 0, to: "/idol-compat", isNew: true },
    { id: "studyluck", genre: "saju", topics: ["학업운"], em: "🎓", title: "공부운 · 시험 잘 되는 날", sub: "공부 스타일 · 12달 공부운", cost: costOf("studyluck"), to: "/study-luck" },
    { id: "healthsaju", genre: "saju", topics: ["건강운"], em: "💊", title: `${new Date().getMonth() + 1}월 사주 건강운`, sub: "약한 오행 · 이달 컨디션 지수", cost: costOf("healthsaju"), to: "/health-saju" },
    { id: "pastlife", genre: "saju", topics: ["성향", "인생흐름"], em: "⏳", title: "전생 이야기", sub: "전생의 나 · 이번 생의 숙제", cost: costOf("pastlife"), to: "/pastlife" },
    { id: "pastlove", genre: "saju", topics: ["애정운", "재회운"], em: "🔙", title: "사주로 맞히는 지난 연애", sub: "연애가 시작됐던 해 · 적중률", cost: 2, to: "/dday/past" },
    { id: "ddaylove", genre: "saju", topics: ["애정운"], em: "💗", title: "새 연애까지 며칠 남았을까?", sub: "연애 시작 D-day", cost: 2, to: "/dday/love" },
    { id: "ddaymarry", genre: "saju", topics: ["결혼운"], em: "💍", title: "결혼까지 며칠 남았을까?", sub: "결혼 D-day", cost: 2, to: "/dday/marry" },
    { id: "ddaymeet", genre: "saju", topics: ["애정운"], em: "🧭", title: "내 인연, 어느 쪽에서 올까?", sub: "동서남북·지역·외국인 힌트", cost: 2, to: "/dday/meet" },
    { id: "mbti", genre: "fun", topics: ["성향"], em: "🧩", title: "사주 MBTI", sub: "내 사주는 무슨 유형?", cost: costOf("sajumbti"), to: "/saju-mbti" },
    { id: "sajutoon", genre: "fun", topics: ["성향"], em: "🐱", title: "사주툰 — 나의 하루 4컷", sub: "해묘가 그린 만화", cost: costOf("sajutoon"), to: "/sajutoon" },
    { id: "name", genre: "name", topics: ["이름·작명", "성향"], em: "✍️", title: "이름풀이 · 한자 성명학", sub: "한글·한자·닉네임 추천 · 무료", cost: 0, to: "/name" },
    { id: "namepair", genre: "name", topics: ["이름·작명", "궁합"], em: "💞", title: "한자 이름 궁합", sub: "두 사람 이름의 자원오행·획수 어울림 · 무료", cost: 0, to: "/name/pair", isNew: true },
    { id: "nick", genre: "name", topics: ["이름·작명"], em: "🏷️", title: "용신 맞춤 닉네임", sub: "게임·SNS·블로그 · 한글/영문 · 무료", cost: 0, to: "/name/nick" },
    { id: "gaeun", genre: "saju", topics: ["개운"], em: "🏠", title: "용신 맞춤 풍수 · 개운", sub: "방 배치 · 7일 개운 습관", cost: costOf("gaeun"), to: "/gaeun" },
    { id: "bujeok", genre: "saju", topics: ["개운"], em: "🧧", title: "나만의 개운 부적", sub: "소원 담은 용신 색 부적", cost: costOf("bujeok"), to: "/bujeok" },
    { id: "ziwei", genre: "ziwei", topics: ["성향", "신년운세"], em: "🌌", title: "자미두수 12궁 명반", sub: "14주성 · 8단계 심화", cost: 3, to: "/ziwei" },
    { id: "tojeong", genre: "tojeong", topics: ["신년운세"], em: "📖", title: `${ny} 토정비결`, sub: "전통 작괘법 · 올해의 괘로 보는 한 해 흐름", cost: 3, to: "/tojeong" },
    { id: "tojeongplus", genre: "tojeong", topics: ["신년운세", "인생흐름"], em: "📅", title: "토정비결 월별 · 일별", sub: "음력 12달 흐름 + 날짜마다 운세 달력", cost: costOf("tojeongplus"), to: "/tojeong-plus", isNew: true },
    { id: "tojeongcompat", genre: "tojeong", topics: ["궁합", "신년운세", "애정운"], em: "💞", title: "토정비결 궁합", sub: "한 해 궁합 · 결혼 궁합 · 함께 좋은 달", cost: costOf("tojeongcompat"), to: "/tojeong-compat", isNew: true },
    { id: "tjt-love", genre: "tojeong", topics: ["애정운", "신년운세"], em: "💗", title: "토정비결로 보는 연애운", sub: "10년 연애 흐름 · 뜨거운 해와 달", cost: costOf("tjt_love"), to: "/tojeong-theme/love", isNew: true },
    { id: "tjt-fate", genre: "tojeong", topics: ["애정운", "결혼운"], em: "🔮", title: "토정비결로 보는 운명의 사람", sub: "지나간 인연 · 다가올 인연 · 그 사람의 나이·띠", cost: costOf("tjt_fate"), to: "/tojeong-theme/fate", isNew: true },
    { id: "tjt-spouse", genre: "tojeong", topics: ["결혼운", "애정운"], em: "💍", title: "토정비결로 보는 배우자복", sub: "결혼하기 좋은 해 · 짝이 되는 배우자", cost: costOf("tjt_spouse"), to: "/tojeong-theme/spouse", isNew: true },
    { id: "tjt-money", genre: "tojeong", topics: ["재물운", "인생흐름"], em: "💰", title: "토정비결로 보는 재물운", sub: "돈이 모이는 해 · 새는 해 · 평생 흐름", cost: costOf("tjt_money"), to: "/tojeong-theme/money", isNew: true },
    { id: "tjt-success", genre: "tojeong", topics: ["직업운", "인생흐름"], em: "🏆", title: "토정비결로 보는 성공운", sub: "승진·합격의 해 · 인생 전성기", cost: costOf("tjt_success"), to: "/tojeong-theme/success", isNew: true },
    { id: "iching", genre: "iching", topics: ["고민"], em: "🪙", title: "동전 세 개로 묻는 주역", sub: "64괘 · 본괘와 지괘", cost: costOf("iching"), to: "/iching" },
    { id: "yukim", genre: "yukim", topics: ["고민"], em: "🖐️", title: "소육임 — 지금 이 순간의 답", sub: "대안·유련·속희·적구·소길·공망", cost: costOf("soyukim"), to: "/so-yukim", isNew: true },
    { id: "astrodice", genre: "astro", topics: ["고민"], em: "🎲", title: "점성술 다이스", sub: "행성·별자리·하우스 주사위", cost: costOf("astrodice"), to: "/astro-dice", isNew: true },
    { id: "palm", genre: "face", topics: ["성향"], em: "✋", title: "손금 풀이", sub: "내 손 보며 따라 보기", cost: costOf("palm"), to: "/palm" },
    { id: "gwansang", genre: "face", topics: ["성향"], em: "🙂", title: "사진으로 보는 관상", sub: "얼굴로 보는 성향", cost: 2, to: "/gwansang" },
    { id: "dream", genre: "dream", topics: ["고민"], em: "💭", title: "꿈해몽 사전", sub: "어젯밤 그 꿈, 무슨 뜻? · 무료", cost: 0, to: "/dream" },
    { id: "diary", genre: "fun", topics: ["고민"], em: "📔", title: "운세 일기장", sub: "기분 × 일진을 함께 기록 · 무료", cost: 0, to: "/diary", isNew: true },
    // 가볍게 보는 사주 (무료) — 연애 카운트다운 · 눈높이 · 금사빠 … · 이번 달 취업운
    ...LOVE_FUN.map((x) => ({ id: "lf-" + x.id, genre: "saju", light: true, topics: x.group === "work" ? ["직업운"] : ["애정운"], em: x.em, title: x.name, sub: x.blurb, cost: 0, to: `/love-fun/${x.id}`, isNew: true })),
  ];
}
function catalog() {
  const items = extraItems();
  const seen = new Set(items.map((x) => x.to));
  sajuThemes().forEach((t) => {
    if (t.id === "tarot") return;
    const to = t.theme ? `/theme/${t.id}` : t.to;
    if (!to || seen.has(to)) return; seen.add(to);
    const tp = [...new Set(t.cats.map((c) => TOPIC_MAP[c]).filter(Boolean))];
    items.push({ id: "s-" + t.id, genre: "saju", topics: tp.length ? tp : ["고민"], em: EMO[tp[0]] || "☯️", title: t.title.replace(/\n/g, " "), sub: t.sub, cost: t.cost, to, isNew: t.cats.includes("NEW") });
  });
  tarotThemes().forEach((t) => {
    if (t.to && seen.has(t.to)) return;
    const tp = [...new Set(t.cats.map((c) => TOPIC_MAP[c]).filter(Boolean))];
    items.push({ id: "t-" + t.id, genre: "tarot", topics: tp.length ? tp : ["고민"], em: EMO[tp[0]] || "🃏", title: t.title.replace(/\n/g, " "), sub: t.sub, cost: t.cost != null ? t.cost : costOf("tarot"), tarot: t, isNew: t.cats.includes("NEW") });
  });
  return items;
}

function row(it, navigate, rank) {
  const [tg, tc] = TAG[it.genre] || TAG.saju;
  return el("button", { type: "button", class: "pm-row", "data-noterm": "", onclick: () => go(it, navigate) }, [
    rank ? el("span", { class: "pm-rank", text: String(rank) }) : null,
    el("span", { class: "pm-thumb", style: `--c:${tc};`, text: it.em }),
    el("span", { class: "pm-txt" }, [
      el("span", { class: "pm-tag", style: `--c:${tc};`, text: tg + (it.isNew ? " · NEW" : "") }),
      el("b", { class: "pm-title", text: it.title }),
      el("span", { class: "pm-sub", text: it.sub }),
    ]),
    el("span", { class: "pm-cost" + (it.cost ? "" : " free") }, it.cost ? [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: String(it.cost) })] : [el("span", { text: "무료" })]),
  ].filter(Boolean));
}
function go(it, navigate) {
  if (it.tarot) return startTarotTheme(it.tarot, navigate);
  const my = getMyBirth();
  if (it.to === "/ziwei" && my) { stash("ziwei:input", my); return navigate("/ziwei/result"); }
  navigate(it.to);
}
function section(eyebrow, title, items, navigate, { ranked = false, more = null, limit = 0 } = {}) {
  const list = limit ? items.slice(0, limit) : items;
  return el("section", { class: "wrap pm-sec" }, [
    el("div", { class: "pm-head" }, [
      el("div", {}, [el("p", { class: "pm-eyebrow", text: eyebrow }), el("h2", { class: "pm-h2", text: title })]),
      more ? el("button", { type: "button", class: "pm-more", onclick: more }, [el("span", { text: "모두 보기" })]) : null,
    ].filter(Boolean)),
    el("div", { class: "pm-list" }, list.map((it, i) => row(it, navigate, ranked ? i + 1 : 0))),
  ]);
}

export function renderPremium({ navigate }) {
  loadDisclaimer();
  const root = el("div", { class: "pm-page" });
  root.append(pageHeader("프리미엄", "더 깊이, 더 정확하게", "사주·타로·자미두수·주역까지 — 궁금한 주제를 골라 깊이 풀어 보는 특집 풀이예요."));
  const all = catalog();
  let mode = window.__pmMode || "genre", pick = window.__pmPick || null;
  const ctl = el("section", { class: "wrap" });
  const body = el("div", {});
  root.append(ctl, body);
  const q = el("input", { class: "input pm-search", type: "search", placeholder: "🔍 찾고 싶은 풀이 (예: 재회, 도화살, 퇴사)", "aria-label": "프리미엄 검색" });
  q.addEventListener("input", () => paintBody());
  function paintCtl() {
    clear(ctl);
    ctl.append(
      el("div", { class: "pm-seg", role: "tablist" }, [["genre", "장르별 운세"], ["topic", "주제별 운세"]].map(([id, lb]) => el("button", { type: "button", role: "tab", "aria-selected": String(mode === id), class: "pm-seg-btn" + (mode === id ? " on" : ""), onclick: () => { mode = id; pick = null; window.__pmMode = id; window.__pmPick = null; paintCtl(); paintBody(); } }, [el("span", { text: lb })]))),
      mode === "genre"
        ? el("div", { class: "pm-genres" }, GENRES.map(([id, em, lb]) => el("button", { type: "button", class: "pm-g" + (pick === id ? " on" : ""), onclick: () => { pick = pick === id ? null : id; window.__pmPick = pick; paintCtl(); paintBody(); } }, [el("span", { class: "pm-g-ic", text: em }), el("span", { text: lb })])))
        : el("div", { class: "pm-tgroups" }, TOPIC_GROUPS.map((g) => el("div", { class: `pm-tg g-${g.id}` }, [
          el("span", { class: "pm-tg-lab", text: g.label }),
          el("div", { class: "pm-topics" }, g.items.map((t) => el("button", { type: "button", class: "pm-t" + (pick === t ? " on" : ""), onclick: () => { pick = pick === t ? null : t; window.__pmPick = pick; paintCtl(); paintBody(); } }, [el("span", { text: `${EMO[t]} ${t}` })]))),
        ]))),
      q,
    );
  }
  function paintBody() {
    clear(body);
    const k = q.value.trim().replace(/\s/g, "");
    if (k || pick) {
      const list = all.filter((it) => (!pick || (mode === "genre" ? it.genre === pick : it.topics.includes(pick))) && (!k || (it.title + it.sub).replace(/\s/g, "").includes(k)));
      const label = k ? `‘${q.value.trim()}’ 검색` : mode === "genre" ? (GENRES.find((g) => g[0] === pick) || [])[2] : pick;
      body.append(list.length ? section(`${list.length}개의 풀이`, label, list, navigate) : el("p", { class: "wrap muted", style: "text-align:center; padding:40px 0;", text: "찾는 풀이가 없어요. 다른 말로 찾아볼까요?" }));
      return;
    }
    const hot = all.filter((x) => x.hot).sort((a, b) => a.hot - b.hot);
    body.append(
      section("바로 확인하세요!", "신규 프리미엄 운세 ✨", all.filter((x) => x.isNew && x.genre !== "tarot" && !x.light), navigate, { limit: 7 }),
      section("무료로 가볍게", "재미로 보는 사주 💘", all.filter((x) => x.light), navigate),
      section("지금 가장 많이 보는", "실시간 HOT 🔥", hot, navigate, { ranked: true }),
      section("내 만세력으로 깊이 보는", "사주 특집 ☯️", all.filter((x) => x.genre === "saju" && !x.isNew && !x.light), navigate, { limit: 6, more: () => { mode = "genre"; pick = "saju"; paintCtl(); paintBody(); window.scrollTo({ top: 0, behavior: "smooth" }); } }),
      section("이름에 기운을 담는", "이름 · 작명 🖋️", all.filter((x) => x.genre === "name"), navigate, { more: () => { mode = "genre"; pick = "name"; paintCtl(); paintBody(); window.scrollTo({ top: 0, behavior: "smooth" }); } }),
      section("사주에 숨은 별", "신살 특집 🌸", all.filter((x) => x.genre === "sinsal"), navigate),
      section("카드가 들려주는", "타로 특집 🃏", all.filter((x) => x.genre === "tarot"), navigate, { limit: 6, more: () => { mode = "genre"; pick = "tarot"; paintCtl(); paintBody(); window.scrollTo({ top: 0, behavior: "smooth" }); } }),
      section("동양·서양 점술", "정통 점술 🔮", all.filter((x) => ["ziwei", "tojeong", "iching", "yukim", "astro", "face", "dream"].includes(x.genre)), navigate),
    );
  }
  paintCtl(); paintBody();
  return root;
}

/* 홈 등에서 쓰는 리스트 섹션 */
export function premiumSection(navigate, { eyebrow, title, pick = "new", limit = 5, more = true } = {}) {
  const all = catalog();
  let list;
  if (pick === "new") list = all.filter((x) => x.isNew && x.genre !== "tarot");
  else if (pick === "today") {
    const d = new Date(); const seed = d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate();
    const pool = all.filter((x) => !x.isNew);
    list = pool.map((x, i) => ({ x, k: (i * 7919 + seed * 104729) % 1009 })).sort((a, b) => a.k - b.k).map((o) => o.x);
  } else list = all;
  return section(eyebrow, title, list, navigate, { limit, more: more ? () => navigate("/special") : null });
}

/* 기본 운세 아래 '더 깊이 알고 싶다면' — id로 골라 보여 주기 */
export function premiumRelated(navigate, ids, { eyebrow = "더 깊이 알고 싶다면", title = "연관 프리미엄 👑" } = {}) {
  const all = catalog();
  const list = ids.map((id) => all.find((x) => x.id === id)).filter(Boolean);
  if (!list.length) return null;
  const sec = section(eyebrow, title, list, navigate, { more: () => navigate("/special") });
  sec.classList.add("pm-related");
  return sec;
}
