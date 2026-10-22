import { el, clear, icon } from "../utils/dom.js";
import { loadTarotData, getTopics, getSpreads, getSpreadGroups } from "../tarot/cardArt.js";
import { stash, unstash } from "../state.js";
import { pageHeader, backLink, noticeBox } from "./shared.js";
import { banner } from "./explore.js";
import { costOf } from "../wallet.js";
/* =========================================================
   타로 첫 화면 — 테마 타로 배너(바로 뽑기) + 직접 질문·분야 고르기
   테마를 누르면 분야·질문·배열이 자동으로 정해져 카드 뽑기로 바로 간다.
   ========================================================= */
const CATS = ["전체", "NEW", "연애", "속마음", "썸", "재회", "솔로", "커플·결혼", "대인관계", "취업", "재물", "직장", "친구·가족", "SNS", "매력", "반려동물", "총운", "일·돈", "선택", "마음", "오늘"];

export function tarotThemes() {
  const m = new Date().getMonth() + 1, ny = new Date().getFullYear() + 1;
  return [
    { id: "crush-3m", cats: ["NEW", "연애", "썸", "속마음"], eyebrow: "3개월 후 하나의 진실", title: "짝사랑 미래 예보", sub: "지금 그 사람 마음 · 3개월 뒤 관계 · 내가 할 일", bg: "rose", art: "hearts", topic: "their_mind", spread: "time-expand-5", q: "내 짝사랑, 3개월 뒤에는 어떻게 되어 있을까?" },
    { id: "secret-crush", cats: ["NEW", "연애", "솔로", "속마음"], eyebrow: "짝사랑 탐지기", title: "지금 나를 몰래\n좋아하는 사람은?", sub: "그 사람의 정체 힌트 · 마음의 크기 · 다가오는 때", bg: "lilac", art: "hearts", topic: "new_love", spread: "three", q: "지금 나를 몰래 좋아하는 사람이 있을까?" },
    { id: "ex-50", cats: ["NEW", "재회", "속마음"], eyebrow: "전 애인 속마음", title: "헤어진 그 사람,\n지금 내 생각 할까?", sub: "그 사람의 지금 마음 · 후회 · 다시 연락할까", bg: "night", art: "moon", topic: "reunion", spread: "their-heart-5", q: "헤어진 그 사람은 지금 나를 어떻게 생각할까?" },
    { id: "soulmates-3", cats: ["NEW", "연애", "솔로", "커플·결혼"], eyebrow: "운명의 반려자 3명", title: "내 인생에 올\n운명의 사람 세 명", sub: "첫 번째 · 두 번째 · 세 번째 인연의 모습", bg: "peach", art: "ring", topic: "new_love", spread: "three", q: "내 인생에 찾아올 운명의 사람 세 명은 어떤 모습일까?" },
    { id: "approach-wait", cats: ["NEW", "연애", "썸", "선택"], eyebrow: "썸 고민", title: "먼저 다가갈까?\n기다릴까?", sub: "다가갈 때 · 기다릴 때의 흐름 비교", bg: "rose", art: "cards", topic: "choice", spread: "decision-3", q: "그 사람에게 먼저 다가가는 게 좋을까, 기다리는 게 좋을까?" },
    { id: "dream-tarot", cats: ["NEW", "마음", "오늘"], eyebrow: "어젯밤 꿈의 의미", title: "꿈해몽 타로", sub: "꿈이 보내는 메시지 · 숨은 마음 · 오늘의 조언", bg: "night", art: "moon", topic: "now", spread: "three", q: "어젯밤 꿈이 나에게 전하려는 메시지는 뭘까?" },
    { id: "quit-job", cats: ["NEW", "직장", "선택"], eyebrow: "퇴사 고민", title: "나 지금\n퇴사해도 될까?", sub: "남을 때 · 나갈 때 · 나에게 맞는 타이밍", bg: "mint", art: "wheel", topic: "work", spread: "decision-five", q: "지금 퇴사해도 괜찮을까?" },
    { id: "true-calling", cats: ["NEW", "직장", "취업"], eyebrow: "나의 천직", title: "내가 정말\n잘할 수 있는 일은?", sub: "타고난 재능 · 끌리는 분야 · 첫걸음", bg: "gold", art: "star", topic: "work", spread: "three", q: "나에게 딱 맞는 천직은 무엇일까?" },
    { id: "breakup-today", cats: ["재회", "오늘"], eyebrow: "오늘의 이별/재회운", title: "오늘, 그 사람과\n다시 닿을 수 있을까?", sub: "오늘의 기운 · 연락 타이밍 · 조심할 말", bg: "dusk", art: "phone", topic: "reunion", spread: "three", q: "오늘 헤어진 그 사람과 다시 연락이 닿을까?" },
    { id: "couple-today", cats: ["커플·결혼", "오늘"], eyebrow: "오늘의 커플 운세", title: "오늘 우리 둘,\n어떤 하루일까?", sub: "두 사람의 기운 · 데이트 팁 · 조심할 점", bg: "rose", art: "ring", topic: "love", spread: "couple-love", q: "오늘 우리 커플은 어떤 하루를 보낼까?" },
    { id: "good-this-month", cats: ["NEW", "오늘", "총운"], eyebrow: `${new Date().getMonth() + 1}월의 선물`, title: `${new Date().getMonth() + 1}월에 생길\n좋은 일`, sub: "이달의 기쁜 소식 · 찾아오는 사람 · 행운의 열쇠", bg: "gold", art: "star", topic: "now", spread: "three", q: "이번 달 나에게 생길 좋은 일은?" },
    { id: "my-style", cats: ["대인관계", "매력"], eyebrow: "이성 & 동성이 보는 나", title: "남들 눈에 비친\n내 스타일", sub: "이성이 보는 나 · 동성이 보는 나 · 매력 포인트", bg: "lilac", art: "star", topic: "now", spread: "three", q: "이성과 동성은 내 외모와 스타일을 어떻게 볼까?" },
    { id: "gossip", cats: ["NEW", "대인관계", "속마음"], eyebrow: "#인간관계 #뒷얘기", title: "내가 없을 때\n오가는 나의 얘기는?", sub: "그 자리 분위기 · 나에 대한 진짜 평판 · 대처법", bg: "dusk", art: "phone", topic: "their_mind", spread: "three", q: "내가 없는 자리에서 사람들은 나에 대해 어떤 이야기를 할까?" },
    { id: "work-result", cats: ["NEW", "일·돈", "직장"], eyebrow: "#성취 #결말", title: "지금 하는 일의\n결과는?", sub: "현재 흐름 · 숨은 변수 · 최종 결과", bg: "gold", art: "sun", topic: "work", spread: "situation-obstacle-advice", q: "지금 하고 있는 일은 어떤 결과로 끝날까?" },
    { id: "out-in", cats: ["NEW", "마음", "총운"], eyebrow: "#겉과속 #반전", title: "겉으로 보이는 나 vs\n내면의 나", sub: "겉으로 보이는 나 · 내면의 나 · 겉과 속을 잇는 법", bg: "dusk", art: "moon", topic: "now", spread: "three", q: "겉으로 보이는 나와 내면의 나는 어떻게 다를까?" },
    { id: "ideal-real", cats: ["NEW", "마음", "선택"], eyebrow: "#이상 #현실", title: "나의 이상과 현실,\n얼마나 차이 날까?", sub: "나의 이상 · 지금의 현실 · 차이를 줄이는 법", bg: "lilac", art: "star", topic: "now", spread: "three", q: "나의 이상과 현실은 얼마나 차이가 날까?" },
    { id: "my-temper", cats: ["NEW", "마음", "매력"], eyebrow: "#기질 #성향", title: "카드로 보는\n나의 기질과 성격", sub: "장점 · 조심할 단점 · 장점을 살리는 법", bg: "gold", art: "star", topic: "now", spread: "three", q: "내 성격에서 가장 두드러지는 특징은 뭘까?" },
    { id: "guiin-soon", cats: ["NEW", "대인관계", "총운"], eyebrow: "#귀인 #조력자", title: "곧 만나게 될\n귀인", sub: "어떤 사람 · 어디서 · 어떤 도움을 줄까", bg: "lilac", art: "hearts", topic: "now", spread: "three", q: "곧 나를 도와줄 귀인은 어떤 사람일까?" },
    { id: "prime-time", cats: ["NEW", "총운", "마음"], eyebrow: "#성공운 #전성기", title: "내 인생 전성기가\n오는 순간", sub: "지금 위치 · 준비할 것 · 활짝 피는 때", bg: "rose", art: "star", topic: "now", spread: "time-expand-5", q: "내 인생의 전성기는 언제, 어떻게 찾아올까?" },
    { id: "good-change", cats: ["NEW", "총운", "오늘"], eyebrow: `${new Date().getFullYear()} 올해 안에`, title: "나에게 일어날\n기분 좋은 변화", sub: "다가오는 변화 · 그 계기 · 놓치지 않는 법", bg: "mint", art: "wheel", topic: "now", spread: "three", q: "올해 안에 나에게 어떤 기분 좋은 변화가 생길까?" },
    { id: "h1-total", cats: ["NEW", "총운"], eyebrow: "지금 가장 먼저 알아야 할 미래", title: `${ny}년 상반기\n타로 총운`, sub: "사랑 · 일 · 돈 · 조심할 달 · 행운의 열쇠", bg: "night", art: "moon", topic: "now", spread: "celtic-cross", q: `${ny}년 상반기 나의 전체 흐름은 어떨까?` },
    { id: "two-loves", cats: ["NEW", "연애", "솔로", "총운"], eyebrow: "룬처럼 신비로운 연애사", title: `${ny} 연애사:\n그대를 찾아올 두 명의 인연`, sub: "첫 번째 인연 · 두 번째 인연 · 내가 고를 사람", bg: "lilac", art: "hearts", topic: "new_love", spread: "decision-3", q: `${ny}년에 나를 찾아올 두 명의 인연은 어떤 사람일까?` },
    { id: "pet-mind", cats: ["NEW", "반려동물", "속마음"], eyebrow: "#반려동물 #속마음", title: "내 반려동물은\n무슨 생각을 할까?", sub: "요즘 기분 · 나에게 바라는 것 · 하고 싶은 말", bg: "peach", art: "paw", topic: "their_mind", spread: "three", q: "우리 아이는 요즘 무슨 생각을 하고, 나에게 뭘 바랄까?" },
    { id: "rainbow-bridge", cats: ["NEW", "반려동물", "마음"], eyebrow: "#반려동물 #무지개다리", title: "무지개다리를 건넌\n반려동물이 전하는 말", sub: "그곳에서의 모습 · 고마웠던 기억 · 전하고 싶은 말", bg: "mint", art: "rainbow", topic: "their_mind", spread: "three", q: "무지개다리를 건넌 우리 아이가 나에게 전하고 싶은 말은?" },
    { id: "no-contact", cats: ["NEW", "연애", "속마음"], eyebrow: "해묘 타로의 속삭임", title: "그 사람이 연락을\n못 하는 진짜 이유", sub: "그 사람 속사정 + 지금 내가 할 일", bg: "night", art: "phone", topic: "their_mind", spread: "their-heart-3", q: "그 사람은 왜 연락을 안 할까?" },
    { id: "new-crush", cats: ["NEW", "썸", "속마음"], eyebrow: "해묘 타로", title: "알게 된 지 얼마 안 된\n그 사람, 나한테\n흔들리고 있을까?", sub: "그 사람 마음 + 다가가는 법", bg: "rose", art: "cat", topic: "their_mind", spread: "their-heart-5", q: "알게 된 지 얼마 안 된 그 사람, 나한테 마음이 있을까?" },
    { id: "some-mind", cats: ["썸", "속마음", "연애"], eyebrow: "썸 타로", title: "썸, 그 사람도\n나랑 같은 마음일까", sub: "마음의 온도 · 관계가 나아갈 방향", bg: "peach", art: "hearts", topic: "their_mind", spread: "their-heart-3", q: "그 사람도 나랑 같은 마음일까?" },
    { id: "want-me", cats: ["NEW", "속마음", "연애"], eyebrow: "속마음 타로", title: "이 사람, 나랑\n뭘 어쩌고 싶은 걸까", sub: "그 사람이 원하는 관계 · 진심의 크기", bg: "dusk", art: "cards", topic: "their_mind", spread: "their-heart-5", q: "이 사람은 나랑 뭘 어쩌고 싶을까?" },
    { id: "reunion", cats: ["재회", "연애"], eyebrow: "재회 타로", title: "그 사람,\n다시 돌아올까", sub: "헤어진 이유 · 그 사람 지금 마음 · 재회 가능성", bg: "night", art: "moon", topic: "reunion", spread: "reunion-7", q: "그 사람과 다시 이어질 수 있을까?" },
    { id: "solo", cats: ["솔로", "연애"], eyebrow: `${ny} 인연 타로`, title: "나에게 올 인연,\n언제 어떤 사람일까", sub: "인연이 오는 때 · 그 사람의 모습 · 만나는 곳", bg: "peach", art: "hearts", topic: "new_love", spread: "solo-love", q: "새로운 인연은 언제, 어떤 사람으로 올까?" },
    { id: "month-love", cats: ["NEW", "연애", "솔로"], eyebrow: `${m}월의 시크릿`, title: `${m}월,\n나의 연애 타로`, sub: "이달 연애 흐름 · 설레는 순간 · 조심할 점", bg: "lilac", art: "moon", topic: "love", spread: "ppfa", q: `${m}월 나의 연애운은 어떨까?` },
    { id: "couple", cats: ["커플·결혼", "연애"], eyebrow: "커플 타로", title: "우리 관계,\n앞으로 어떻게 될까", sub: "서로의 마음 · 부딪히는 지점 · 관계의 미래", bg: "rose", art: "ring", topic: "love", spread: "couple-love", q: "우리 관계는 앞으로 어떻게 될까?" },
    { id: "marry", cats: ["커플·결혼"], eyebrow: "결혼 타로", title: "이 사람과\n결혼해도 될까?", sub: "결혼 후 모습 · 가족 · 준비할 것", bg: "gold", art: "ring", topic: "love", spread: "marriage", q: "이 사람과 결혼해도 괜찮을까?" },
    { id: "work", cats: ["일·돈", "선택"], eyebrow: "일 타로", title: "지금 이 일,\n계속해도 될까?", sub: "지금 상황 · 걸림돌 · 조언", bg: "mint", art: "sun", topic: "work", spread: "situation-obstacle-advice", q: "지금 일을 계속해야 할까, 옮겨야 할까?" },
    { id: "money", cats: ["일·돈"], eyebrow: "금전 타로", title: "돈 흐름,\n언제 좋아질까", sub: "돈이 새는 곳 · 들어오는 길 · 타이밍", bg: "gold", art: "coin", topic: "money", spread: "problem-solve-4", q: "돈 흐름은 언제 좋아질까?" },
    { id: "choice", cats: ["선택", "마음"], eyebrow: "선택 타로", title: "A냐 B냐,\n뭘 골라야 할까", sub: "두 길의 결과를 나란히 비교", bg: "lilac", art: "star", topic: "choice", spread: "decision-five", q: "두 가지 중 무엇을 선택해야 할까?" },
    { id: "anxious", cats: ["마음"], eyebrow: "마음 타로", title: "요즘 마음이\n불안한 이유", sub: "불안의 뿌리 · 놓아줄 것 · 나를 달래는 법", bg: "night", art: "cat", topic: "now", spread: "anxious-mind", q: "요즘 왜 이렇게 마음이 불안할까?" },
    { id: "stuck", cats: ["마음", "일·돈"], eyebrow: "막힐 때 타로", title: "일이 안 풀릴 때,\n뭐가 막고 있을까", sub: "막힌 원인 · 풀리는 열쇠", bg: "dusk", art: "wheel", topic: "now", spread: "stuck", q: "요즘 일이 잘 안 풀리는 이유가 뭘까?" },
    { id: "celtic", cats: ["마음", "선택"], eyebrow: "깊이 보기 · 10장", title: "켈틱 크로스로\n내 상황 깊게 보기", sub: "과거·현재·미래·속마음·결과까지 10장", bg: "night", art: "wheel", topic: "now", spread: "celtic-cross", q: "" },
    { id: "today", cats: ["오늘"], eyebrow: "오늘의 카드", title: "오늘 나에게\n필요한 한 마디", sub: "카드 한 장 · 오늘의 조언", bg: "rose", art: "cards", topic: "today", spread: "daily-card", q: "오늘 나에게 필요한 메시지는?" },
    { id: "dday-love-tarot", cats: ["NEW", "연애", "솔로"], eyebrow: "타로 D-day", title: "새 연애까지\n며칠 남았을까?", sub: "카드 수트로 세는 연애 D-day", bg: "rose", art: "hearts", to: "/dday/love/tarot", cost: 2 },
    { id: "dday-marry-tarot", cats: ["NEW", "커플·결혼"], eyebrow: "타로 D-day", title: "결혼까지\n며칠 남았을까?", sub: "카드 수트로 세는 결혼 D-day", bg: "gold", art: "ring", to: "/dday/marry/tarot", cost: 2 },
    { id: "dday-meet-tarot", cats: ["NEW", "연애", "솔로"], eyebrow: "인연의 방향 타로", title: "내 인연,\n어느 쪽에서 올까?", sub: "카드가 가리키는 방향 · 지역 · 만나는 곳", bg: "night", art: "moon", to: "/dday/meet/tarot", cost: 2 },
    // ── 취업 · 재물 ──
    { id: "job-when", cats: ["NEW", "취업", "일·돈"], eyebrow: "취업 타로", title: "나, 언제쯤\n취업할 수 있을까?", sub: "지금 위치 · 무기 · 걸림돌 · 열리는 문 · 결과", bg: "mint", art: "sun", topic: "work", spread: "job-5", q: "나는 언제쯤 취업할 수 있을까?" },
    { id: "job-pass", cats: ["NEW", "취업"], eyebrow: "합격 타로", title: "이번 지원,\n붙을 수 있을까?", sub: "합격 가능성 · 부족한 점 · 마지막 한 수", bg: "gold", art: "star", topic: "work", spread: "situation-obstacle-advice", q: "이번에 지원한 곳, 합격할 수 있을까?" },
    { id: "job-interview", cats: ["취업"], eyebrow: "면접 타로", title: "면접에서\n나를 어떻게 볼까?", sub: "면접관이 보는 나 · 어필 포인트 · 조심할 말", bg: "dusk", art: "cards", topic: "work", spread: "three", q: "면접관은 나를 어떻게 볼까?" },
    { id: "job-fit", cats: ["취업", "선택"], eyebrow: "직무 타로", title: "나한테 맞는 일은\n뭘까?", sub: "타고난 강점 · 맞는 환경 · 피할 환경", bg: "lilac", art: "wheel", topic: "work", spread: "three", q: "나에게 맞는 일은 무엇일까?" },
    { id: "job-choice", cats: ["취업", "선택"], eyebrow: "선택 타로", title: "A 회사 vs B 회사,\n어디로 갈까?", sub: "두 선택지의 흐름 · 결정의 기준", bg: "night", art: "cards", topic: "choice", spread: "decision-3", q: "두 회사 중 어디로 가야 할까?" },
    { id: "job-change", cats: ["취업", "직장", "선택"], eyebrow: "이직 타로", title: "지금 이직해도\n괜찮을까?", sub: "남을 때 · 떠날 때의 흐름 · 타이밍", bg: "mint", art: "wheel", topic: "work", spread: "decision-five", q: "지금 이직해도 괜찮을까?" },
    { id: "job-exam", cats: ["취업"], eyebrow: "시험 타로", title: "공시·자격증,\n이번엔 될까?", sub: "준비 상태 · 약한 과목 · 마지막 스퍼트", bg: "gold", art: "star", topic: "work", spread: "problem-solve-4", q: "이번 시험, 합격할 수 있을까?" },
    { id: "job-boss", cats: ["직장", "취업"], eyebrow: "승진 타로", title: "올해 나,\n인정받을 수 있을까?", sub: "평가 흐름 · 보여 줄 것 · 경쟁 구도", bg: "rose", art: "sun", topic: "work", spread: "three", q: "올해 회사에서 인정받고 승진할 수 있을까?" },
    { id: "money-flow", cats: ["NEW", "재물", "일·돈"], eyebrow: "재물 타로", title: "내 돈, 어디로 새고\n어디서 들어올까?", sub: "흐름 · 새는 곳 · 들어오는 길 · 지킬 것 · 결과", bg: "gold", art: "coin", topic: "money", spread: "money-5", q: "내 돈은 어디로 새고, 어디서 들어올까?" },
    { id: "money-windfall", cats: ["NEW", "재물"], eyebrow: "횡재 타로", title: "뜻밖의 돈,\n들어올까?", sub: "횡재 기운 · 들어오는 경로 · 조심할 점", bg: "peach", art: "coin", topic: "money", spread: "three", q: "가까운 시일 안에 뜻밖의 돈이 들어올까?" },
    { id: "money-invest", cats: ["재물", "선택"], eyebrow: "투자 타로", title: "지금 이 투자,\n해도 될까?", sub: "기회 · 위험 · 판단 기준", bg: "night", art: "wheel", topic: "money", spread: "decision-3", q: "지금 생각 중인 투자를 해도 될까?" },
    { id: "money-save", cats: ["재물"], eyebrow: "저축 타로", title: "올해 목표한 돈,\n모을 수 있을까?", sub: "지금 습관 · 걸림돌 · 모으는 열쇠", bg: "mint", art: "coin", topic: "money", spread: "problem-solve-4", q: "올해 목표한 만큼 돈을 모을 수 있을까?" },
    { id: "money-side", cats: ["재물", "일·돈"], eyebrow: "부업 타로", title: "부업·N잡,\n시작해도 될까?", sub: "나의 재능 · 수익 가능성 · 본업과의 균형", bg: "lilac", art: "star", topic: "money", spread: "situation-obstacle-advice", q: "부업을 시작해도 될까? 돈이 될까?" },
    { id: "money-debt", cats: ["재물", "대인관계"], eyebrow: "돈거래 타로", title: "빌려준 돈,\n돌려받을 수 있을까?", sub: "상대의 상황 · 받을 가능성 · 말 꺼내는 법", bg: "dusk", art: "coin", topic: "money", spread: "their-heart-3", q: "빌려준 돈을 돌려받을 수 있을까?" },
    { id: "money-when", cats: ["재물"], eyebrow: "재물 시기 타로", title: "돈 걱정,\n언제쯤 끝날까?", sub: "과거 · 현재 · 미래의 재물 흐름", bg: "rose", art: "moon", topic: "money", spread: "time-expand-5", q: "돈 걱정은 언제쯤 끝날까?" },
    { id: "money-biz", cats: ["재물", "선택"], eyebrow: "창업 타로", title: "내 가게·내 사업,\n잘 될까?", sub: "시장 반응 · 자금 · 성공의 열쇠", bg: "gold", art: "sun", topic: "money", spread: "horseshoe", q: "내 사업(창업)을 시작하면 잘 될까?" },
    // ── 대인관계 · 직장 · 친구 · SNS ──
    { id: "sns-stalk", cats: ["NEW", "SNS", "썸", "속마음"], eyebrow: "SNS 타로", title: "그 사람,\n내 SNS 염탐할까?", sub: "몰래 보는지 · 어떤 마음으로 보는지", bg: "dusk", art: "phone", topic: "their_mind", spread: "their-heart-3", q: "그 사람은 내 SNS를 몰래 볼까?" },
    { id: "sns-who", cats: ["SNS", "대인관계"], eyebrow: "SNS 타로", title: "내 SNS 염탐하는\n사람은 누굴까?", sub: "나를 지켜보는 사람의 정체와 마음", bg: "night", art: "phone", topic: "their_mind", spread: "three", q: "요즘 내 SNS를 몰래 보는 사람은 누구일까?" },
    { id: "my-image", cats: ["NEW", "대인관계", "매력"], eyebrow: "이미지 타로", title: "남들이 보는\n내 이미지!", sub: "첫인상 · 진짜 매력 · 오해받는 부분", bg: "lilac", art: "star", topic: "now", spread: "three", q: "남들은 나를 어떤 사람으로 볼까?" },
    { id: "work-image", cats: ["직장", "대인관계"], eyebrow: "직장 타로", title: "직장에서 나는\n어떤 이미지일까?", sub: "동료·상사가 보는 나 · 좋은 평판 만드는 법", bg: "mint", art: "sun", topic: "work", spread: "three", q: "직장 사람들은 나를 어떻게 볼까?" },
    { id: "friend-image", cats: ["친구·가족", "대인관계"], eyebrow: "친구 타로", title: "친구들에게 요즘\n나는 어떤 이미지일까?", sub: "친구들 눈에 비친 요즘의 나", bg: "peach", art: "cat", topic: "now", spread: "three", q: "요즘 친구들은 나를 어떻게 생각할까?" },
    { id: "school-memory", cats: ["친구·가족", "대인관계"], eyebrow: "추억 타로", title: "학창 시절 친구들이\n기억하는 내 모습!", sub: "그때의 나 · 남아 있는 인상", bg: "rose", art: "star", topic: "now", spread: "three", q: "학창 시절 친구들은 나를 어떻게 기억할까?" },
    { id: "work-careful", cats: ["직장", "일·돈"], eyebrow: "직장 타로", title: "직장에서\n무엇을 조심해야 할까?", sub: "피해야 할 사람·상황 · 지켜야 할 것", bg: "night", art: "wheel", topic: "work", spread: "situation-obstacle-advice", q: "요즘 직장에서 무엇을 조심해야 할까?" },
    { id: "work-new", cats: ["NEW", "직장"], eyebrow: "적응 타로", title: "새로운 직장에서\n잘 적응하는 팁은?", sub: "분위기 · 나의 강점 · 적응 열쇠", bg: "mint", art: "sun", topic: "work", spread: "situation-obstacle-advice", q: "새 직장에 잘 적응하려면 어떻게 해야 할까?" },
    { id: "work-now", cats: ["직장"], eyebrow: "직장 타로", title: "지금 나의 직장에서\n잘 지낼 수 있는 팁!", sub: "관계 · 일 · 마음가짐", bg: "gold", art: "sun", topic: "work", spread: "problem-solve-4", q: "지금 직장에서 잘 지내려면 어떻게 해야 할까?" },
    { id: "work-charm", cats: ["직장", "매력"], eyebrow: "매력 타로", title: "직장에서 내 매력을\n200% 발산할 방법은?", sub: "드러낼 강점 · 숨겨진 매력", bg: "rose", art: "star", topic: "work", spread: "three", q: "직장에서 내 매력을 어떻게 보여주면 좋을까?" },
    { id: "party-charm", cats: ["매력", "대인관계"], eyebrow: "매력 타로", title: "파티에서 내 매력을\n200% 살릴 방법은?", sub: "분위기 메이커 되는 법 · 눈에 띄는 포인트", bg: "gold", art: "star", topic: "now", spread: "three", q: "파티·모임에서 내 매력을 살리려면?" },
    { id: "club-charm", cats: ["매력", "대인관계"], eyebrow: "동호회 타로", title: "동호회에서 내 매력을\n200% 발산할 방법은?", sub: "어울리는 법 · 인기 포인트", bg: "lilac", art: "hearts", topic: "now", spread: "three", q: "동호회에서 내 매력을 어떻게 보여줄까?" },
    { id: "meeting", cats: ["대인관계", "오늘"], eyebrow: "모임 타로", title: "오늘 모임에 가면\n어떨까요?", sub: "분위기 · 만날 사람 · 조심할 것", bg: "peach", art: "cards", topic: "today", spread: "three", q: "오늘 모임에 가면 어떨까?" },
    { id: "adapt-new", cats: ["대인관계", "마음"], eyebrow: "적응 타로", title: "새로운 환경에\n잘 적응하는 팁은?", sub: "새 학교·동호회·동네 어디든", bg: "mint", art: "moon", topic: "now", spread: "situation-obstacle-advice", q: "새로운 환경에 잘 적응하려면 어떻게 해야 할까?" },
    { id: "friend-fight", cats: ["친구·가족", "대인관계"], eyebrow: "화해 타로", title: "친구와 다퉜을 때,\n어떻게 화해할까요?", sub: "친구의 속마음 · 화해의 타이밍과 말", bg: "rose", art: "hearts", topic: "their_mind", spread: "relation-wisdom", q: "다툰 친구와 어떻게 화해하면 좋을까?" },
    { id: "family-fight", cats: ["친구·가족"], eyebrow: "가족 타로", title: "가족과 다퉜을 때,\n어떻게 화해할까요?", sub: "서운함의 뿌리 · 먼저 건넬 말", bg: "dusk", art: "moon", topic: "their_mind", spread: "relation-wisdom", q: "가족과 다퉜는데 어떻게 풀면 좋을까?" },
    { id: "sorry-first", cats: ["친구·가족", "선택", "연애"], eyebrow: "고민 타로", title: "내가 먼저\n사과해도 될까요?", sub: "사과의 결과 · 상대 마음 · 좋은 타이밍", bg: "night", art: "cards", topic: "choice", spread: "decision-3", q: "내가 먼저 사과하는 게 좋을까?" },
    { id: "friend-work", cats: ["친구·가족", "일·돈", "선택"], eyebrow: "동업 타로", title: "친구와 함께\n일해도 될까요?", sub: "궁합 · 돈 문제 · 지켜야 할 선", bg: "gold", art: "coin", topic: "choice", spread: "decision-3", q: "친구와 같이 일해도 괜찮을까?" },
    { id: "friend-trip", cats: ["친구·가족", "선택"], eyebrow: "여행 타로", title: "친구와 함께\n여행 가도 좋을까?", sub: "여행 분위기 · 부딪힐 점 · 즐기는 팁", bg: "mint", art: "sun", topic: "choice", spread: "three", q: "친구랑 같이 여행 가도 괜찮을까?" },
    { id: "oracle", cats: ["오늘", "마음"], eyebrow: "쓸데없는 고민", title: "라면 먹을까?\n예·아니오로 물어봐", sub: "고양이 카드 한 장 · 예/아니오/글쎄", bg: "peach", art: "cat", to: "/oracle", cost: 1 },
  ];
}

export function renderTarotQuestion({ navigate }) {
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(pageHeader("해묘 타로", "오늘은 뭐가 궁금해?", "직접 물어보거나, 테마를 눌러 질문·배열이 정해진 채로 바로 카드를 뽑아요."));

  let cat = window.__tarotCat || "전체";
  const chipsHost = el("section", { class: "wrap" });
  const listHost = el("section", { class: "wrap theme-list", style: "margin-top: var(--sp-3);" });
  root.append(chipsHost, listHost);

  const cost = costOf("tarot");
  function go(t) {
    if (t.to) return navigate(t.to);
    const topic = getTopics().find((x) => x.id === t.topic);
    const spread = getSpreads().find((x) => x.id === t.spread);
    if (!topic || !spread) return navigate("/tarot");
    stash("tarot:topic", topic); stash("tarot:spread", spread); stash("tarot:question", t.q || "");
    if (!unstash("tarot:deck")) stash("tarot:deck", "full");
    navigate("/tarot/select");
  }
  // 직접 질문 (칩 상자 안 위쪽에)
  const qArea = el("textarea", { class: "input tq-input", rows: "1", maxlength: "120", placeholder: "직접 물어보기 (예: 연락 올까?)", "aria-label": "구체적인 질문" });
  qArea.value = unstash("tarot:question") || "";
  const topicRow = el("div", { class: "tq-topics" });
  const qBox = el("div", { class: "tq-box" }, [
    el("div", { class: "tq-top" }, [
      el("img", { class: "tq-cat", src: "assets/img/haemyo.webp", alt: "", "aria-hidden": "true" }),
      el("div", { style: "flex:1; min-width:0;" }, [qArea]),
    ]),
    el("p", { class: "tq-hint tiny", text: "질문을 적고 분야를 누르면 배열(23가지)과 덱을 직접 골라요. 테마로 바로 뽑으려면 아래 배너를 눌러요." }),
    topicRow,
  ]);
  qArea.addEventListener("input", () => { stash("tarot:question", qArea.value); qArea.style.height = "auto"; qArea.style.height = qArea.scrollHeight + "px"; });

  function paint() {
    clear(chipsHost); clear(listHost);
    chipsHost.append(el("div", { class: "theme-chips tq-panel" }, [
      qBox,
      el("div", { class: "tq-sep" }, [el("span", { text: "테마로 바로 뽑기" })]),
      ...CATS.map((c) =>
        el("button", { class: "theme-chip" + (c === cat ? " on" : ""), type: "button", onclick: () => { cat = c; window.__tarotCat = c; paint(); } }, [el("span", { text: c })])),
    ]));
    tarotThemes().filter((t) => cat === "전체" || t.cats.includes(cat)).forEach((t) => {
      const sp = getSpreads().find((x) => x.id === t.spread);
      const b = banner({ ...t, cost: t.cost != null ? t.cost : cost, sub: t.sub + (sp ? ` · ${sp.count}장` : "") }, () => go(t));
      listHost.append(b);
    });
  }

  root.append(el("section", { class: "wrap", style: "margin-top: var(--sp-5);" }, [
    noticeBox("info", "타로는 미래를 확정하는 도구가 아니라, 지금의 마음과 상황을 다른 각도에서 돌아보게 하는 참고 콘텐츠입니다."),
  ]));

  loadTarotData().then(() => {
    const selected = unstash("tarot:topic");
    topicRow.replaceChildren(...getTopics().map((t) => topicCard(t, navigate, selected && selected.id === t.id)));
    paint();
  });
  return root;
}

function topicCard(t, navigate, isSel) {
  return el("button", {
    class: "tq-topic" + (isSel ? " on" : ""), type: "button",
    onclick: () => { stash("tarot:topic", t); navigate("/tarot/spread"); },
    "aria-label": t.label + " 선택",
  }, [
    el("span", { class: "tb-ic" }, [icon(t.icon)]),
    el("span", { text: t.label }),
  ]);
}

/* ===== (합침) tarotSpread.js ===== */
/* 덱 종류 — 메이저 22장(고양이 카드) / 78장 전체(마이너 56장 포함) */
const DECKS = [
  { id: "major", label: "메이저 22장", desc: "해묘 고양이 카드로 굵직한 흐름을" },
  { id: "full", label: "78장 전체", desc: "마이너 56장까지 넣어 일상의 디테일까지" },
];

export function renderTarotSpread({ navigate }) {
  const topic = unstash("tarot:topic");
  if (!topic) { navigate("/tarot"); return el("div"); }

  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/tarot", "질문 선택")]));
  root.append(pageHeader("STEP 2", "카드 배열 선택", `‘${topic.label}’ 질문을 어떤 방식으로 볼까요?`));

  // 덱 선택
  let deck = unstash("tarot:deck") || "major";
  const deckHost = el("section", { class: "wrap" });
  function paintDeck() {
    deckHost.replaceChildren(
      el("p", { class: "muted tiny", style: "margin-bottom:8px;", text: "어떤 카드로 볼까요?" }),
      el("div", { class: "deck-toggle", role: "radiogroup", "aria-label": "카드 덱 선택" }, DECKS.map((d) =>
        el("button", {
          class: "deck-opt" + (d.id === deck ? " on" : ""), role: "radio", "aria-checked": String(d.id === deck),
          onclick: () => { deck = d.id; stash("tarot:deck", deck); paintDeck(); },
        }, [el("b", { text: d.label }), el("span", { text: d.desc })]))),
    );
  }
  stash("tarot:deck", deck);
  paintDeck();
  root.append(deckHost);

  const list = el("div", { class: "wrap" }, [el("p", { class: "muted", text: "불러오는 중…" })]);
  root.append(list);

  loadTarotData().then(() => {
    const spreads = getSpreads();
    const nodes = [];
    for (const g of getSpreadGroups()) {
      const inGroup = spreads.filter((s) => (s.group || "기본") === g);
      if (!inGroup.length) continue;
      nodes.push(el("h2", { class: "spread-group-title", text: g }));
      nodes.push(el("div", { class: "section-gap" }, inGroup.map((s) => spreadCard(s, navigate))));
    }
    list.replaceChildren(...nodes);
  });

  return root;
}

function spreadCard(s, navigate) {
  const dots = el("div", { style: "display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;" },
    Array.from({ length: s.count }).map(() =>
      el("span", { style: "width:20px; height:32px; border-radius:4px; border:1px solid var(--c-gold-line); background:var(--c-gold-glow);" })
    )
  );
  return el("button", {
    class: "panel", style: "display:block; width:100%; text-align:left; cursor:pointer;",
    onclick: () => { stash("tarot:spread", s); navigate("/tarot/select"); },
    "aria-label": `${s.label} 선택`,
  }, [
    el("div", { style: "display:flex; align-items:center; justify-content:space-between; gap:12px;" }, [
      el("div", {}, [
        el("h3", { text: `${s.label} · ${s.count}장` }),
        el("p", { class: "muted", style: "font-size:var(--fs-sm); margin-top:4px;", text: s.desc }),
        dots,
      ]),
      el("span", { style: "color:var(--c-gold); display:inline-flex;" }, [icon("arrowRight")]),
    ]),
  ]);
}

/* 다른 화면(프리미엄)에서 타로 테마를 바로 시작 */
export async function startTarotTheme(t, navigate) {
  if (t.to) return navigate(t.to);
  await loadTarotData();
  const topic = getTopics().find((x) => x.id === t.topic);
  const spread = getSpreads().find((x) => x.id === t.spread);
  if (!topic || !spread) return navigate("/tarot");
  stash("tarot:topic", topic); stash("tarot:spread", spread); stash("tarot:question", t.q || "");
  if (!unstash("tarot:deck")) stash("tarot:deck", "full");
  navigate("/tarot/select");
}
