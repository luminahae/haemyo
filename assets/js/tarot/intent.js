/* =========================================================
   질문 의도(intent) — "천직은?"에 "그 사람 마음은…" 같은 동문서답을 막는다.
   ① detectIntent: 질문에서 무엇을 묻는지 먼저 알아낸다 (천직·좋은 일·귀인·인연·평판…)
   ② intentAnswer: 뽑은 카드(1장~여러 장)의 내용으로 그 질문에 맞는 구체적인 답을 만든다
   작성: HAE
   ========================================================= */

/* ---------- 메이저 아르카나 22장 — 질문별 내용 ----------
   talent 타고난 재능 · field 맞는 분야 · good 생길 좋은 일 · who 찾아오는 사람 · where 만나는 곳
   help 받는 도움 · say 사람들이 하는 좋은 말 · mis 오해받는 부분 */
const MAJOR = [
  { talent: "겁 없이 새 판에 뛰어드는 개척 감각", field: "여행·콘텐츠 크리에이터·스타트업처럼 매번 새로운 일", good: "뜻밖의 제안이나 새로운 시작(여행·이동·첫 경험)", who: "자유롭고 엉뚱한, 나이보다 어려 보이는 사람", where: "여행지·처음 가 본 모임·우연한 자리", help: "망설이던 일을 ‘일단 해 봐’ 하고 등 떠밀어 줘요", say: "같이 있으면 재밌고 에너지가 생기는 사람", mis: "생각 없이 즉흥적으로 산다는 오해" },
  { talent: "말과 손재주로 없던 걸 만들어 내는 실행력", field: "기획·마케팅·영업·개발·메이커처럼 아이디어를 결과물로 만드는 일", good: "준비하던 일이 실제 결과로 이어지는 순간(합격·계약·첫 수입)", who: "말솜씨 좋고 일 처리 빠른 실무형 인재", where: "일·프로젝트·스터디 자리", help: "필요한 도구·방법·사람을 연결해 일을 진짜로 굴러가게 해 줘요", say: "일 잘하고 센스 있다", mis: "말만 앞선다는 오해" },
  { talent: "남이 못 보는 걸 알아채는 직관과 깊은 공부", field: "연구·상담·심리·데이터 분석·글쓰기처럼 깊이 파고드는 일", good: "오래 궁금했던 답을 알게 되거나, 조용히 실력이 인정받는 일", who: "말수는 적지만 속이 깊은 전문가 타입", where: "도서관·강의·조용한 모임·온라인 커뮤니티", help: "남들이 모르는 정보·조언을 슬쩍 건네줘요", say: "차분하고 믿음직하다, 생각이 깊다", mis: "차갑고 다가가기 어렵다는 오해" },
  { talent: "사람과 공간을 풍요롭게 가꾸는 감각", field: "디자인·뷰티·요리·교육·돌봄·공간 기획처럼 아름답게 키우는 일", good: "생활이 넉넉해지는 일(선물·보너스·좋은 집·맛있는 자리)", who: "다정하고 챙겨 주는 맏언니·엄마 같은 사람", where: "카페·맛집·꽃·전시처럼 예쁜 곳", help: "따뜻하게 챙겨 주며 마음과 생활을 채워 줘요", say: "따뜻하고 센스 있다, 옆에 있으면 편하다", mis: "너무 다 받아 준다, 우유부단하다는 오해" },
  { talent: "판을 짜고 사람을 이끄는 리더십", field: "관리·경영·공무원·법·건축·프로젝트 매니저처럼 구조를 세우는 일", good: "자리·직급·권한이 생기는 일(승진·리더 역할·안정된 계약)", who: "책임감 강한 연상, 상사·선배·윗사람", where: "회사·기관·공식적인 자리", help: "확실한 기회와 자리를 만들어 주고 뒤를 봐줘요", say: "믿을 수 있다, 일을 확실하게 한다", mis: "고집 세고 딱딱하다는 오해" },
  { talent: "배우고 가르치며 원칙을 지키는 힘", field: "교육·강사·자격증 전문직·종교·전통 분야", good: "시험 합격·자격 취득·좋은 스승을 만나는 일", who: "경험 많은 선생님·멘토·선배", where: "학교·학원·교육·세미나", help: "검증된 방법과 길을 알려 줘요", say: "성실하고 예의 바르다, 배울 점이 많다", mis: "융통성 없다는 오해" },
  { talent: "사람 마음을 잇고 좋은 관계를 만드는 매력", field: "서비스·상담·홍보·브랜딩·커플·웨딩처럼 사람을 잇는 일", good: "설레는 만남이나 마음이 통하는 사람이 생기는 일", who: "취향이 잘 맞고 끌림이 있는 사람", where: "소개·모임·취미 자리", help: "중요한 선택에서 내 편이 되어 함께 결정해 줘요", say: "매력 있다, 같이 있고 싶다", mis: "누구에게나 친절해서 속을 모르겠다는 오해" },
  { talent: "목표를 향해 밀고 나가는 추진력", field: "운동·영업·물류·운전·스포츠·경쟁이 있는 일", good: "밀어붙이던 일이 이기는 일(경쟁 승리·목표 달성·이동)", who: "추진력 있고 승부욕 강한 사람", where: "운동·경쟁·이동 중(출장·여행)", help: "막힌 일을 앞장서서 뚫어 줘요", say: "열정적이고 해낸다", mis: "성격이 급하고 세다는 오해" },
  { talent: "부드럽게 사람을 다루는 인내와 용기", field: "간호·수의·코칭·상담·동물·돌봄처럼 마음을 다루는 일", good: "참아 온 일이 보상받는 일, 관계가 부드럽게 풀리는 일", who: "온화하지만 속이 단단한 사람", where: "봉사·반려동물·운동 모임", help: "흔들릴 때 옆에서 묵묵히 힘이 되어 줘요", say: "착하고 강하다, 믿고 맡길 수 있다", mis: "만만해 보인다는 오해" },
  { talent: "혼자 깊이 파서 길을 찾는 통찰", field: "연구·개발·철학·기술 장인·1인 전문가", good: "혼자 준비한 것에서 깨달음·실력 향상이 오는 일", who: "조용한 고수, 혼자 실력을 쌓은 전문가", where: "조용한 공간·온라인·전문 커뮤니티", help: "핵심을 찌르는 한마디 조언을 줘요", say: "깊이 있고 실력 있다", mis: "혼자 있는 걸 좋아해서 정 없다는 오해" },
  { talent: "흐름과 기회를 읽는 운", field: "투자·트렌드·이벤트·여행·변화가 빠른 일", good: "뜻밖의 행운·좋은 타이밍(당첨·기회·우연한 연결)", who: "우연히 다시 만나는 인연, 타이밍 좋게 나타나는 사람", where: "우연한 자리·이동 중·다시 찾은 곳", help: "딱 필요한 때 기회를 물어다 줘요", say: "운이 좋다, 같이 있으면 일이 풀린다", mis: "변덕스럽다는 오해" },
  { talent: "공정하게 판단하고 정리하는 힘", field: "법·회계·인사·감사·행정·중재", good: "미뤄 둔 일이 공정하게 정리되는 일(계약·서류·돈 문제 해결)", who: "공정하고 원칙 있는 사람, 전문가(법·회계)", where: "공적인 일·계약·서류 자리", help: "억울한 일을 바로잡고 정당한 몫을 찾게 도와줘요", say: "공정하고 이성적이다", mis: "냉정하고 계산적이라는 오해" },
  { talent: "남과 다른 시선으로 보는 관점", field: "예술·사진·명상·연구처럼 관점이 무기인 일", good: "멈춰 있던 일이 다른 각도에서 새 답을 찾는 일", who: "남다른 생각을 가진 사람, 의외의 조력자", where: "쉬어 가는 자리·예상 밖의 장소", help: "시선을 바꿔 막힌 걸 풀어 줘요", say: "독특하고 생각이 깊다", mis: "느리고 답답하다는 오해" },
  { talent: "끝낼 건 끝내고 새로 만드는 결단", field: "리모델링·구조조정·의료·정리·변화 관리", good: "오래된 고민이 끝나고 새 출발을 하는 일", who: "인생의 전환점에서 만나는 사람", where: "이사·이직·새 환경", help: "정리할 것과 남길 것을 분명히 해 줘요", say: "결단력 있다, 쿨하다", mis: "정 없이 잘라 낸다는 오해" },
  { talent: "조화롭게 섞고 맞추는 균형 감각", field: "조율·의료·약학·요리·HR·코디네이터", good: "관계·몸·마음이 회복되고 균형을 찾는 일", who: "차분하게 중재해 주는 사람", where: "치유·운동·건강 관련 자리", help: "흥분한 상황을 진정시키고 속도를 맞춰 줘요", say: "편안하고 균형 잡혀 있다", mis: "미지근하다는 오해" },
  { talent: "사람을 끌어당기는 강한 매력과 욕망의 힘", field: "엔터·마케팅·세일즈·금융처럼 욕구를 다루는 일", good: "매력이 통해서 관심과 제안이 몰리는 일", who: "강렬한 매력의 사람(단, 경계선은 분명히)", where: "밤 모임·화려한 자리", help: "현실적인 이익을 챙기는 법을 알려 줘요", say: "치명적인 매력이 있다", mis: "욕심이 많다는 오해" },
  { talent: "판을 뒤집고 새로 세우는 돌파력", field: "위기관리·혁신·기자·구조 설계", good: "답답하던 구조가 무너지고 새 길이 열리는 일", who: "갑자기 나타나 판을 바꾸는 사람", where: "예상 못 한 사건·급한 상황", help: "숨겨진 문제를 드러내 바로잡게 해 줘요", say: "솔직하고 할 말은 한다", mis: "과격하다는 오해" },
  { talent: "희망을 주고 영감을 나누는 재능", field: "예술·디자인·크리에이터·치유·브랜드처럼 영감을 주는 일", good: "희망적인 소식, 노력이 빛을 보기 시작하는 일", who: "맑고 영감을 주는 사람, 롤모델", where: "온라인·SNS·창작 모임", help: "다시 꿈꾸게 하고 방향을 비춰 줘요", say: "순수하고 빛나는 사람", mis: "현실감이 없다는 오해" },
  { talent: "보이지 않는 걸 상상하는 감수성", field: "작가·음악·영상·심리·꿈을 다루는 일", good: "숨어 있던 사실이 드러나 오해가 풀리는 일", who: "감수성이 풍부하고 신비로운 사람", where: "밤·감성적인 공간·온라인", help: "직감을 믿도록 마음을 읽어 줘요", say: "감성이 풍부하고 분위기 있다", mis: "속을 알 수 없다는 오해" },
  { talent: "사람을 밝게 만드는 에너지와 표현력", field: "방송·교육·아동·이벤트·영업처럼 밝은 에너지가 필요한 일", good: "칭찬·성공·축하받을 일(합격·발표·기념일)", who: "밝고 긍정적인 사람, 아이 같은 순수함", where: "야외·축제·햇살 좋은 곳", help: "자신감을 채워 주고 앞에 세워 줘요", say: "밝고 사랑스럽다, 있으면 분위기가 산다", mis: "고민이 없어 보인다는 오해" },
  { talent: "흐름을 깨닫고 다시 일어서는 각성", field: "평가·심사·코칭·재기·소명 있는 일", good: "오래 기다린 연락·재평가·두 번째 기회", who: "예전에 알던 사람, 다시 연결되는 인연", where: "동창·예전 직장·SNS로 다시 연락", help: "지난 노력을 알아봐 주고 다음 단계로 불러 줘요", say: "성장했다, 다시 보인다", mis: "예전 모습으로만 기억되는 오해" },
  { talent: "모든 걸 엮어 완성하는 마무리 능력", field: "해외·무역·총괄·이벤트 완성·글로벌한 일", good: "목표 완성·졸업·해외/큰 무대와 연결되는 일", who: "넓은 세상을 경험한 사람, 해외 인연", where: "해외·큰 행사·마무리 자리", help: "더 큰 무대로 데려가 줘요", say: "완성도 높다, 어디서든 잘한다", mis: "완벽주의라 피곤하다는 오해" },
];
/* 마이너 — 수트(분야·성격) */
const SUIT = {
  wands: { el: "불", talent: "열정과 추진력", field: "영업·스포츠·창업·홍보처럼 움직이고 부딪히는 일", good: "새 프로젝트·도전 기회, 의욕이 확 살아나는 일", trait: "열정적이고 행동이 빠른", where: "운동·활동 모임·일하는 현장", help: "같이 뛰어 주며 일에 불을 붙여 줘요", say: "에너지 넘치고 추진력 있다", mis: "성급하다는 오해" },
  cups: { el: "물", talent: "공감과 감수성", field: "상담·예술·서비스·간호처럼 마음을 다루는 일", good: "마음이 따뜻해지는 소식(축하·고백·화해·초대)", trait: "다정하고 감정이 풍부한", where: "카페·모임·축하 자리", help: "마음을 알아주고 위로해 줘요", say: "다정하고 배려 깊다", mis: "감정 기복이 있다는 오해" },
  swords: { el: "바람", talent: "논리와 판단력", field: "법·IT·기획·글쓰기·분석처럼 머리를 쓰는 일", good: "막혔던 문제가 풀리는 소식, 똑똑한 해결책", trait: "똑 부러지고 말이 정확한", where: "공부·업무·온라인 토론", help: "냉정하게 판단해 주고 해결책을 짚어 줘요", say: "똑똑하고 정확하다", mis: "말이 차갑다는 오해" },
  pentacles: { el: "흙", talent: "꾸준함과 현실 감각", field: "금융·부동산·사업·제조·관리처럼 결과가 쌓이는 일", good: "돈·물건·실속 있는 소식(보너스·계약·선물)", trait: "성실하고 현실적인", where: "회사·거래·실속 있는 자리", help: "돈·일·생활에 실질적인 도움을 줘요", say: "성실하고 믿음직하다", mis: "재미없고 계산적이라는 오해" },
};
const MEMORY = { major: "당신이 이름을 불러 주던 순간을 제일 좋아했대요.", wands: "같이 뛰어놀고 산책하던 신나는 시간을 기억해요.", cups: "품에 안겨 있던 따뜻한 시간을 기억해요.", swords: "당신 목소리를 들으며 곁에 있던 조용한 시간을 기억해요.", pentacles: "맛있는 밥과 포근한 잠자리, 매일의 돌봄을 기억해요." };
const KID_MOOD = { major: ["요즘 마음이 많이 자라는 중이에요. 새로운 걸 느끼고 배우느라 바빠요.", "속으로 고민이 있어요. 말로 다 못 하고 있을 수 있어요."], wands: ["에너지가 넘치고 하고 싶은 게 많아요.", "하고 싶은 걸 못 해서 답답하고 짜증이 늘었어요."], cups: ["정이 많고 다정한 기분이에요. 같이 있는 시간이 좋아요.", "서운한 마음이 조금 쌓여 있어요."], swords: ["생각이 많아지고 스스로 판단하고 싶어 해요.", "걱정·불안이 있어요. 혼날까 봐 말을 아끼고 있을 수 있어요."], pentacles: ["안정감을 느끼고 편안해요.", "피곤하거나 몸이 조금 지쳐 있어요."] };
const KID_WANT = { major: ["“나를 믿어 주고 지켜봐 줘.”", "“내 얘기를 끝까지 들어 줘.”"], wands: ["“같이 놀아 줘, 같이 해 보자!”", "“하고 싶은 걸 조금만 더 하게 해 줘.”"], cups: ["“안아 주고, 사랑한다고 말해 줘.”", "“서운했던 거 알아줘.”"], swords: ["“내 생각도 물어봐 줘.”", "“혼내지 말고 먼저 이유를 들어 줘.”"], pentacles: ["“지금처럼 곁에 있어 줘.”", "“푹 쉬게 해 줘, 맛있는 거 먹고 싶어.”"] };
/* 외모·스타일 인상 — [이성이 보는 나, 동성이 보는 나, 매력 포인트] */
const LOOK_MAJOR = [
  ["어려 보이고 자유로운 분위기 — ‘같이 있으면 재밌겠다’는 끌림", "편하게 말 걸기 쉬운 친구 같은 인상", "꾸민 듯 안 꾸민 캐주얼, 밝은 표정"],
  ["눈빛이 또렷하고 센스 있어 보여요 — ‘말 걸어 보고 싶은’ 사람", "일 잘하고 자기 관리 하는 사람", "포인트 액세서리·손끝·말투"],
  ["신비롭고 단정한 분위기 — 쉽게 다가가기 어려워서 더 궁금한 사람", "차분하고 지적인 사람", "깨끗한 피부·차분한 톤의 옷"],
  ["부드럽고 따뜻한 분위기 — 편안함과 여성스러움/다정함이 매력", "옷 잘 입고 분위기 있는 사람", "부드러운 소재·자연스러운 웨이브·미소"],
  ["단단하고 믿음직한 인상 — 기대고 싶은 사람", "카리스마 있고 깔끔한 사람", "핏이 좋은 옷·바른 자세"],
  ["단정하고 바른 인상 — 진지하게 만나고 싶은 사람", "예의 바르고 성실해 보이는 사람", "단정한 헤어·클래식한 스타일"],
  ["끌림이 강한 얼굴 — 눈이 자꾸 가는 사람", "친해지고 싶은 호감형", "웃는 얼굴·눈 맞춤"],
  ["에너지 넘치고 시원시원한 인상 — 함께 있으면 든든한 사람", "멋있고 추진력 있어 보이는 사람", "활동적인 스타일·건강한 혈색"],
  ["순해 보이지만 속이 단단한 인상 — 볼수록 매력 있는 사람", "착하고 편한 사람", "부드러운 미소·자연스러운 메이크업/스킨케어"],
  ["조용하고 깊은 눈빛 — 알수록 빠지는 사람", "혼자서도 멋있는 사람", "무채색 톤·담백한 스타일"],
  ["볼 때마다 분위기가 달라 보여요 — 의외의 매력", "트렌드에 밝은 사람", "그날그날 바꾸는 포인트 스타일"],
  ["균형 잡히고 깔끔한 인상 — 믿을 수 있는 사람", "똑 부러지고 단정한 사람", "정돈된 헤어·깔끔한 핏"],
  ["독특하고 개성 있는 분위기 — 한 번 보면 기억에 남는 사람", "남들과 다른 감각이 있는 사람", "개성 있는 아이템 하나"],
  ["시크하고 도도해 보여요 — 다가가기 전 살짝 긴장되는 사람", "쿨하고 정리된 사람", "블랙·심플한 실루엣"],
  ["편안하고 조화로운 인상 — 오래 보고 싶은 사람", "무난하게 다 잘 어울리는 사람", "톤온톤 코디·맑은 피부"],
  ["치명적인 분위기 — 섹시하고 강렬한 끌림", "화려하고 존재감 있는 사람", "진한 포인트(립·향수·눈빛)"],
  ["강렬하고 대담한 인상 — 잊히지 않는 사람", "센 언니/형 같은 사람", "과감한 스타일·확실한 컬러"],
  ["맑고 깨끗한 인상 — 보고 있으면 기분 좋아지는 사람", "순수하고 사랑스러운 사람", "투명한 피부·밝은 눈빛"],
  ["몽환적이고 감성적인 분위기 — 사진발이 좋은 사람", "분위기 있고 감성적인 사람", "은은한 컬러·무드 있는 스타일"],
  ["밝고 환한 인상 — 웃는 얼굴이 제일 예쁜 사람", "인기 많은 호감형", "환한 미소·밝은 컬러 옷"],
  ["예전보다 확 달라진 인상 — 다시 보게 되는 사람", "요즘 물오른 사람", "새로 바꾼 헤어·스타일 변화"],
  ["완성형 인상 — 어디서든 눈에 띄는 사람", "스타일이 완성돼 있는 사람", "전체적인 조화·자신감 있는 태도"],
];
const LOOK_SUIT = {
  wands: ["시원시원하고 건강한 매력 — 활기가 넘쳐 보여요", "에너지 넘치는 분위기 메이커", "활동적인 스타일·건강한 피부톤"],
  cups: ["다정하고 부드러운 인상 — 연애하고 싶은 분위기", "착하고 감성적인 사람", "눈웃음·부드러운 컬러"],
  swords: ["깔끔하고 지적인 인상 — 똑똑해 보여서 끌려요", "세련되고 시크한 사람", "깔끔한 라인·셔츠·안경 같은 지적인 포인트"],
  pentacles: ["단정하고 믿음직한 인상 — 결혼 상대 느낌", "옷을 깔끔하게 잘 챙겨 입는 사람", "좋은 소재·정돈된 헤어"],
};
function look(it) { const a = (!it.suit || it.suit === "major") ? LOOK_MAJOR[it.cardNumber] || LOOK_MAJOR[0] : LOOK_SUIT[it.suit] || LOOK_SUIT.cups; return a; }
const SUIT_KR = { wands: "완드", cups: "컵", swords: "소드", pentacles: "펜타클" };
/* 궁정 카드 — 사람의 나이·위치 */
const RANK_WHO = { 11: "나이가 어리거나 후배뻘인", 12: "또래의 활동적인", 13: "연상의 다정하고 노련한", 14: "윗사람·선배·전문가 같은 연상의" };
const RANK_ROLE = { 11: "새로 배우는 후배·학생", 12: "같이 움직이는 또래 동료", 13: "챙겨 주는 선배·언니·누나 같은 사람", 14: "결정권 있는 상사·전문가" };

function info(it) {
  const n = it.cardNumber, r = !!it.reversed;
  if (!it.suit || it.suit === "major") {
    const m = MAJOR[n] || MAJOR[0];
    return { ...m, r, name: it.cardName, who: m.who };
  }
  const s = SUIT[it.suit] || SUIT.cups;
  const who = n >= 11 ? `${RANK_WHO[n]} ${s.trait} 사람 (${RANK_ROLE[n]})` : n === 1 ? `새로 알게 되는 ${s.trait} 사람` : `${s.trait} 또래나 동료`;
  return { talent: s.talent, field: s.field, good: s.good, who, where: s.where, help: s.help, say: s.say, mis: s.mis, r, name: it.cardName };
}
const nm = (it) => `${it.cardName}${it.reversed ? "(역)" : ""}`;
const posOf = (items, re, fallback) => items.find((it) => re.test((it.position && it.position.label) || "")) || items[fallback < 0 ? items.length + fallback : fallback] || items[0];

/* ---------- 질문 의도 ---------- */
const OTHER = /(남자|여자|걔|쟤|그 ?사람|그분|그 ?애|오빠|언니|누나|형|선배|후배|남친|여친|썸남|썸녀|전남친|전여친|상대|이 ?사람|친구|가족|엄마|아빠|동료|상사|면접관)/;
export function detectIntent(q) {
  const s = (q || "").replace(/\s+/g, " ").trim();
  if (!s) return null;
  if (/(운명의 ?(사람|인연)|인연|사람).{0,8}(세 ?명|3 ?명|셋)/.test(s)) return "three";
  if (/(두 ?명|두 ?사람|2 ?명|둘).{0,6}(인연|사람|남자|여자)|인연.{0,4}(두 ?명|둘)/.test(s)) return "two";
  if (/(운|운세|흐름|기운)[은는이가]? ?(어떨까|어때|어떻게 (될까|흘러)|좋을까)|전체 ?흐름|총운/.test(s)) return "fortune";
  if (/천직|적성|진로|맞는 일|잘할 수 있는 일|어울리는 일|무슨 일을 해야|어떤 일이 맞|(어울리는|맞는|잘 맞는) ?(직업|일자리|전공|분야)|직업은 ?(뭐|무엇)/.test(s)) return "calling";
  if (/귀인|도와줄 사람|도와줄|조력자|은인/.test(s)) return "benefactor";
  if (/무지개 ?다리|하늘나라|떠난 (우리|아이|강아지|고양이)/.test(s)) return "pet";
  if (/우리 (아이|애기|딸|아들|강아지|고양이|냥이|댕댕이)/.test(s)) return "kid";
  if (/(몰래|나를).{0,6}(좋아하는 ?사람|보는 ?사람)|누가 나를|누구일까|정체/.test(s)) return "secret";
  if (/(새로운|새) ?인연|어떤 사람(으로|이) ?(올|와|나타)|운명의 (사람|상대)|미래의 (배우자|연인)|이상형|(잘 맞는|어울리는|맞는) ?(사람|상대|남자|여자|연인)/.test(s)) return "person";
  if (/좋은 ?일|기쁜 ?(일|소식)|행운|좋은 ?소식|(좋은|기분 좋은) ?변화|생길 ?일|어떤 일이 생길|무슨 일이 생길/.test(s)) return "good";
  if (/전성기|리즈|황금기/.test(s)) return "peak";
  if (/외모|스타일|얼굴|인상|비주얼|분위기를? 어떻게|패션/.test(s) && /(볼까|봐|보일까|생각|어떨까|어때)/.test(s)) return "looks";
  if (/(나를|나에 ?대해|내 ?(외모|스타일|이미지|평판)|날).{0,14}(어떻게|어떤|뭐라|무슨).{0,10}(볼|봐|생각|기억|이야기|얘기|말|평가)|평판|뒷담|뒷얘기|첫인상|어떤 사람으로 (볼|보일)/.test(s) && !/(걔|쟤|그 ?사람|그분|그 ?애|오빠|언니|누나|형|선배|후배|헤어진|전남친|전여친|썸|짝사랑|남친|여친|이 ?사람|상대)/.test(s)) return "reputation";
  if (/조심해야|조심할|피해야|주의해야|조심하면/.test(s)) return "caution";
  if (/겉(으로|모습|과)?.{0,12}(속|내면)|내면의 ?나|속과 겉/.test(s)) return "outin";
  if (/(이상|꿈)(과|이랑|하고|와) ?현실/.test(s)) return "ideal";
  if (/((내|나의) ?(장점|단점|강점|약점|매력|기질|성향|성격)|나는 어떤 사람|두드러지는)/.test(s) && !/(남들|사람들|이성|동성)/.test(s)) return "self";
  if (/(돈|재물).{0,10}(새고|새는|들어올|들어오는)|어디로 새|어디서 들어/.test(s)) return "moneyflow";
  if (/메시지|전하고 싶은 말|하고 싶은 말|꿈이/.test(s)) return "message";
  if (/어떤 하루|오늘 (우리|나)는 어떤|오늘 하루 어떨|가면 어떨/.test(s)) return "day";
  if (/(할까|좋을까|갈까),? .{1,20}(할까|좋을까|갈까)|두 ?(가지|곳|회사|사람|선택) ?중|어디로 가야|무엇을 선택|뭘 선택|어느 쪽/.test(s)) return "choice";
  if (/어떻게 (될까|돼|되어 ?있을까|흘러|끝날까)|어떤 결과|결말|앞으로 어떻게/.test(s)) return "future";
  if (/어떻게 해야|하려면|어떻게 (풀|보여|살리|적응|화해)|방법/.test(s)) return null; // 기존 how로
  return null;
}

/* ---------- 답 만들기: items = reading.items 형태(카드 1장 이상) ---------- */
export function intentAnswer(intent, items, verdict, q) {
  if (!intent || !items || !items.length) return null;
  const key = items[items.length - 1];
  const first = items[0], mid = items[Math.min(1, items.length - 1)];
  const K = info(key), F = info(first), M = info(mid);
  const soft = (x, t) => (x.r ? `${t} — 다만 카드가 거꾸로라 조금 늦게, 작게 시작될 수 있어요.` : t);
  const P = (h, t, card) => ({ h, t, card: card ? nm(card) : "" });
  const pick3 = (a, b, c) => items.length >= 3 ? [a, b, c] : [a, c];

  switch (intent) {
    case "calling": return {
      label: "당신의 천직 힌트", emoji: "🧭",
      tone: `${K.field}에서 가장 빛나요.`,
      parts: [
        P("타고난 재능", `${F.talent}${F.r ? " (아직 다 꺼내 쓰지 못했어요)" : ""}`, first),
        P("이런 일도 잘 맞아요", `${M.field}`, mid),
        P("첫걸음", key.blocks && key.blocks.action ? key.blocks.action : "작게 시작해서 반응을 확인해 보세요.", key),
      ],
    };
    case "good": {
      const people = info(mid);
      return {
        label: "이런 좋은 일이 와요", emoji: "🎁",
        tone: soft(K, `${K.good}`),
        parts: [
          P("기쁜 소식", soft(K, K.good), key),
          P("찾아오는 사람", `${people.who} — ${people.help}`, mid),
          P("행운의 열쇠", first.blocks && first.blocks.action ? first.blocks.action : "평소보다 한 번 더 먼저 연락하고 움직여 보세요.", first),
        ],
      };
    }
    case "benefactor": return {
      label: "곧 만날 귀인", emoji: "🤝",
      tone: `귀인은 바로 — ${K.who}.${K.r ? " 처음엔 무뚝뚝하거나 서툴러 보여서 알아보기 어려울 수 있어요." : ""}`,
      parts: [
        P("어떤 사람", `${K.who}`, key),
        P("어디서 만나요", `${M.where}`, mid),
        P("어떤 도움을 줄까", `${F.help}`, first),
      ],
    };
    case "person": case "secret": return {
      label: intent === "secret" ? (verdict === "yes" ? "있어요! 👀" : verdict === "no" ? "아직은 조용해요" : "있는 것 같아요") : "다가올 인연의 모습", emoji: intent === "secret" ? "🕵️" : "💫",
      tone: intent === "secret"
        ? (verdict === "no" ? `대놓고 마음을 키우는 사람은 아직 없지만, ${K.who} 쪽에서 당신을 좋게 보고 있어요.` : `${K.who}일 가능성이 커요.${K.r ? " 겉으로는 티를 잘 안 내는 편이에요." : ""}`)
        : `다가올 인연은 — ${K.who}.${K.r ? " 처음엔 티를 잘 안 내는 편이에요." : ""}`,
      parts: [
        P("그 사람의 모습", `${K.who} · 사람들이 보는 인상: ${K.say}`, key),
        P("만나는·스치는 곳", `${M.where}`, mid),
        P(intent === "secret" ? "마음의 크기" : "다가오는 때", intent === "secret" ? (verdict === "yes" ? "관심이 꽤 커요. 당신의 반응을 살피고 있어요." : verdict === "no" ? "아직은 가벼운 호기심 정도예요." : "호감은 있지만 들킬까 조심하는 중이에요.") : (verdict === "yes" ? "가까워요 — 1~2달 안에 만남의 계기가 생기기 쉬워요." : verdict === "no" ? "조금 걸려요 — 내 생활을 먼저 채우면 자연스럽게 와요." : "몇 달 안에 — 만남의 폭을 넓힐수록 빨라져요."), first),
      ],
    };
    case "two": {
      const A = items.length >= 3 ? items[1] : items[0], B = items.length >= 3 ? items[2] : items[items.length - 1];
      const IA = info(A), IB = info(B);
      const sc = (it) => (it.reversed ? -1 : 1) * (it.suit && it.suit !== "major" ? 1 : 1.5);
      const pickA = sc(A) >= sc(B);
      const yr = (q.match(/(20\d\d)/) || [])[1];
      return {
        label: `${yr ? yr + "년, " : ""}찾아올 두 사람`, emoji: "💞",
        tone: `${pickA ? "첫 번째" : "두 번째"} 인연이 더 오래 갈 사람이에요.`,
        parts: [
          P("첫 번째 인연", `${IA.who} — ${IA.where}에서 만나요. 첫인상: “${IA.say}”.${A.reversed ? " (처음엔 엇갈리거나 타이밍이 늦을 수 있어요)" : ""}`, A),
          P("두 번째 인연", `${IB.who} — ${IB.where}에서 만나요. 첫인상: “${IB.say}”.${B.reversed ? " (처음엔 엇갈리거나 타이밍이 늦을 수 있어요)" : ""}`, B),
          P("내가 고를 사람", `${pickA ? "첫 번째" : "두 번째"} 사람 — 카드 흐름이 더 순해서 편하고 오래 가는 쪽이에요. ${pickA ? "두 번째" : "첫 번째"} 사람은 설레지만 ${(pickA ? B : A).reversed ? "타이밍이 자꾸 어긋나기 쉬워요." : "속도가 달라 맞춰 가는 노력이 필요해요."}`, items[0]),
        ],
      };
    }
    case "fortune": {
      const when = (q.match(/(20\d\d년 ?(상반기|하반기)?|\d{1,2}월|올해|이번 ?달|다음 ?달|이번 ?주|오늘|내일)/) || [""])[0];
      return {
        label: `${when ? when + " " : ""}${verdict === "yes" ? "좋은 흐름이에요" : verdict === "no" ? "조심하며 가요" : "좋고 나쁨이 섞여요"}`, emoji: verdict === "yes" ? "🌈" : verdict === "no" ? "🌧️" : "🌤️",
        tone: (key.blocks && key.blocks.connect ? key.blocks.connect.replace(/^‘[^’]+’\s*자리에서,\s*/, "") : ""),
        parts: [
          P("좋은 점", (key.blocks && key.blocks.positive) || "", key),
          P("조심할 점", (mid.blocks && mid.blocks.obstacle) || "", mid),
          P("이렇게 보내요", (first.blocks && first.blocks.action) || "", first),
        ].filter((p) => p.t),
      };
    }
    case "three": return {
      label: "내 인생의 운명적인 세 사람", emoji: "👥",
      tone: "카드 한 장이 한 사람이에요. 순서대로 만나게 될 인연의 모습이에요.",
      parts: items.slice(0, 3).map((it, i) => { const x = info(it); return P(`${["첫 번째", "두 번째", "세 번째"][i]} 인연`, `${x.who} — ${x.where}에서 만나요. 첫인상: “${x.say}”.${it.reversed ? " (처음엔 엇갈리거나 늦게 알아보기 쉬워요)" : ""}`, it); }),
    };
    case "reputation": return {
      label: "사람들이 보는 나", emoji: "👀",
      tone: `“${K.say}” — 이런 이야기가 가장 많이 오가요.${K.r ? " 다만 지금은 조금 오해가 섞여 있어요." : ""}`,
      parts: pick3(
        P("그 자리 분위기·첫인상", `${F.say}${F.r ? " (근데 요즘은 조금 거리감 있게 보여요)" : ""}`, first),
        P("오해받는 부분", `${M.mis}`, mid),
        P("평판을 좋게 만드는 법", key.blocks && key.blocks.action ? key.blocks.action : "내 장점을 한 번 더 말로 표현해 보세요.", key),
      ),
    };
    case "looks": {
      const LK = look(key), LF = look(first), LM = look(mid);
      return {
        label: "사람들 눈에 비친 나", emoji: "🪞",
        tone: LK[0] + (key.reversed ? " (요즘은 피곤해 보이거나 거리감이 느껴질 수 있어요)" : ""),
        parts: [
          P("이성이 보는 나", LK[0], key),
          P("동성이 보는 나", LF[1] + (first.reversed ? " — 다만 첫인상이 조금 차갑게 보일 수 있어요" : ""), first),
          P("매력 포인트", LM[2], mid),
        ],
      };
    }
    case "moneyflow": return {
      label: "돈의 길", emoji: "💰",
      tone: `들어오는 길은 ‘${K.field.split("처럼")[0]}’ 쪽이에요. ${verdict === "no" ? "다만 지금은 버는 것보다 지키는 게 먼저예요." : verdict === "yes" ? "흐름이 좋아 들어오는 돈이 늘 수 있어요." : "들어오는 만큼 새기 쉬우니 관리가 관건이에요."}`,
      parts: [
        P("새는 곳", (mid.blocks && mid.blocks.obstacle) || "", mid),
        P("들어오는 길", (key.blocks && key.blocks.positive) || "", key),
        P("지킬 것", (first.blocks && first.blocks.action) || "", first),
      ].filter((p) => p.t),
    };
    case "outin": return {
      label: "겉의 나 · 속의 나", emoji: "🎭",
      tone: `겉으로는 “${F.say}”는 인상이지만, 속은 조금 달라요.`,
      parts: [
        P("겉으로 보이는 나", `${F.say} — ${(first.blocks && first.blocks.positive) || ""}`, first),
        P("내면의 나", (mid.blocks && mid.blocks.blindspot) || M.mis, mid),
        P("겉과 속을 잇는 법", (key.blocks && key.blocks.action) || "", key),
      ].filter((p) => p.t),
    };
    case "ideal": return {
      label: verdict === "yes" ? "이상이 현실이 되는 중" : verdict === "no" ? "이상과 현실의 거리가 커요" : "조금씩 가까워지는 중", emoji: "🌈",
      tone: verdict === "yes" ? "꿈과 현실의 차이가 크지 않아요 — 지금 방향 그대로 가면 돼요." : verdict === "no" ? "지금은 이상이 현실보다 한참 앞서 있어요. 한 걸음씩 좁혀 가요." : "차이가 있지만 메울 수 있는 거리예요.",
      parts: [
        P("나의 이상", (key.blocks && key.blocks.positive) || "", key),
        P("지금의 현실", (mid.blocks && mid.blocks.obstacle) || "", mid),
        P("차이를 줄이는 법", (first.blocks && first.blocks.action) || "", first),
      ].filter((p) => p.t),
    };
    case "self": return {
      label: "카드로 본 나", emoji: "🪞",
      tone: `당신의 무기는 ‘${F.talent}’이에요.`,
      parts: [
        P("장점", (key.blocks && key.blocks.positive) || F.talent, key),
        P("조심할 단점", (mid.blocks && mid.blocks.obstacle) || M.mis, mid),
        P("장점을 살리는 법", (first.blocks && first.blocks.action) || "", first),
      ].filter((p) => p.t),
    };
    case "caution": return {
      label: "조심할 것", emoji: "⚠️",
      tone: key.blocks ? key.blocks.obstacle : "무리한 약속을 조심하세요.",
      parts: [
        P("피해야 할 상황", (mid.blocks && mid.blocks.obstacle) || "", mid),
        P("하지 말 것", (key.blocks && key.blocks.avoid) || "", key),
        P("지켜야 할 것", (first.blocks && first.blocks.action) || "", first),
      ].filter((p) => p.t),
    };
    case "message": case "pet": return {
      label: intent === "pet" ? "아이가 전하는 말" : "카드가 전하는 메시지", emoji: intent === "pet" ? "🐾" : "✉️",
      tone: intent === "pet"
        ? (verdict === "no" ? "“걱정 말고, 너무 슬퍼하지만 말아 줘. 나는 괜찮아.”" : "“고마웠어. 같이 있던 시간이 정말 행복했어.”")
        : (key.blocks && key.blocks.connect ? key.blocks.connect.replace(/^‘[^’]+’\s*자리에서,\s*/, "") : ""),
      parts: [
        P(intent === "pet" ? "요즘 아이의 모습" : "숨은 마음", intent === "pet" ? (first.reversed ? "조금 걱정하며 당신을 지켜보고 있어요." : "편안하고 따뜻한 곳에서 잘 지내요.") : ((mid.blocks && mid.blocks.blindspot) || ""), mid),
        P(intent === "pet" ? "고마웠던 기억" : "오늘의 조언", intent === "pet" ? MEMORY[key.suit && key.suit !== "major" ? key.suit : "major"] : ((key.blocks && key.blocks.action) || ""), key),
      ].filter((p) => p.t),
    };
    case "kid": return {
      label: "아이의 요즘 마음", emoji: "🧸",
      tone: KID_WANT[key.suit && key.suit !== "major" ? key.suit : "major"][key.reversed ? 1 : 0],
      parts: [
        P("요즘 기분", KID_MOOD[first.suit && first.suit !== "major" ? first.suit : "major"][first.reversed ? 1 : 0], first),
        P("나에게 바라는 것", KID_WANT[mid.suit && mid.suit !== "major" ? mid.suit : "major"][mid.reversed ? 1 : 0], mid),
        P("해 주면 좋은 것", (key.blocks && key.blocks.action) || "오늘 10분만 아이만 바라보는 시간을 가져 보세요.", key),
      ],
    };
    case "day": return {
      label: "오늘의 흐름", emoji: "☀️",
      tone: soft(K, K.good),
      parts: [P("좋은 점", (key.blocks && key.blocks.positive) || "", key), P("팁", (mid.blocks && mid.blocks.action) || "", mid), P("조심할 점", (first.blocks && first.blocks.avoid) || "", first)].filter((p) => p.t),
    };
    case "choice": {
      const A = items[0], B = items[1] || items[0];
      const sc = (it) => (it.reversed ? -1 : 1) * (it.suit && it.suit !== "major" ? 1 : 1.5);
      const opts = (() => { const m = q.replace(/\?/g, "").split(/,|아니면| 또는 /).map((t) => t.trim().replace(/(는|은)? ?게 (더 )?(좋을까|나을까|맞을까)$|(해야|할까|갈까|할지)$|(을|를)? ?(계속)?$/g, "").trim()).filter((t) => t && t.length <= 14); return m.length >= 2 ? m.slice(0, 2) : null; })();
      const nice = (t) => { t = t.replace(/^(그 ?사람(에게|한테)|지금|내가)\s*/, "").replace(/^일을/, "지금 일").replace(/(을|를)$/, "");
        if (/해야$/.test(t)) return t.replace(/해야$/, "하기"); if (/겨야$/.test(t)) return t.replace(/겨야$/, "기기"); if (/야$/.test(t)) return t.replace(/야$/, "기");
        return /[가-힣]$/.test(t) && !/기$/.test(t) ? t + "기" : t; };
      const nameA = opts ? `‘${nice(opts[0])}’` : "첫 번째", nameB = opts ? `‘${nice(opts[1])}’` : "두 번째";
      const better = sc(A) >= sc(B) ? nameA : nameB;
      return {
        label: `${better} 쪽이 더 순해요`, emoji: "⚖️",
        tone: `${better} 쪽의 카드가 더 순한 흐름이에요. 결정의 기준은 ‘${(key.keywords || [""])[0]}’이에요.`,
        parts: [P(opts ? `${nameA}를 고르면` : "첫 번째 길", `${(A.blocks && A.blocks.positive) || ""}${A.reversed ? " 다만 걸림돌도 함께 있어요." : ""}`, A), P(opts ? `${nameB}를 고르면` : "두 번째 길", `${(B.blocks && B.blocks.positive) || ""}${B.reversed ? " 다만 걸림돌도 함께 있어요." : ""}`, B), P("결정의 기준", (key.blocks && key.blocks.action) || "", key)].filter((p) => p.t),
      };
    }
    case "future": return {
      label: verdict === "yes" ? "좋게 흘러가요" : verdict === "no" ? "고비가 있어요" : "변수가 있어요", emoji: verdict === "yes" ? "🌈" : verdict === "no" ? "🌧️" : "🌤️",
      tone: (key.blocks && key.blocks.connect ? key.blocks.connect.replace(/^‘[^’]+’\s*자리에서,\s*/, "") : ""),
      parts: [P("지금 흐름", (first.blocks && first.blocks.positive) || "", first), P("숨은 변수", (mid.blocks && mid.blocks.obstacle) || "", mid), P("결과", (key.blocks && key.blocks.positive) || "", key)].filter((p) => p.t),
    };
    case "peak": return {
      label: "전성기의 모습", emoji: "🌟",
      tone: `${K.field}에서 크게 피어나요. ${verdict === "yes" ? "생각보다 가까워요 — 1~2년 안의 흐름이에요." : verdict === "no" ? "지금은 뿌리 내리는 시기 — 준비가 쌓인 뒤 3~5년 안에 활짝 펴요." : "2~3년 안, 준비한 만큼 빨라져요."}`,
      parts: [P("지금 위치", (first.blocks && first.blocks.positive) || "", first), P("준비할 것", (mid.blocks && mid.blocks.action) || "", mid), P("활짝 피는 모습", K.good, key)].filter((p) => p.t),
    };
  }
  return null;
}
export const INTENT_CONCLUSION = { calling: "천직", good: "좋은 일", benefactor: "귀인", person: "인연", secret: "정체", three: "세 사람", two: "두 사람의 인연", fortune: "흐름", reputation: "평판", looks: "외모", moneyflow: "돈의 길", caution: "주의", self: "나", outin: "겉과 속", ideal: "이상과 현실", message: "메시지", pet: "메시지", kid: "아이 마음", day: "오늘", choice: "선택", future: "앞으로", peak: "전성기" };

/** 의도 없는 일반 질문 — 카드 내용으로 구체적인 부분 답을 붙인다 */
export function typeParts(type, items, q) {
  if (!items || !items.length) return null;
  const key = items[items.length - 1], first = items[0], mid = items[Math.min(1, items.length - 1)];
  const B = (it, k) => (it.blocks && it.blocks[k]) || "";
  const P = (h, t, card) => (t ? { h, t, card: card ? nm(card) : "" } : null);
  const L = {
    why: [P("막힌 원인", B(mid, "obstacle"), mid), P("놓치고 있는 것", B(first, "blindspot"), first), P("풀리는 열쇠", B(key, "action"), key)],
    how: [P("지금 내 강점", B(first, "positive"), first), P("조심할 점", B(mid, "avoid"), mid), P("이렇게 해 봐", B(key, "action"), key)],
    when: [P("지금 위치", B(first, "positive"), first), P("준비할 것", B(mid, "action"), mid), P("열리는 계기", B(key, "positive"), key)],
    outcome: [P("가능성의 근거", B(key, "positive"), key), P("부족한 점", B(mid, "obstacle"), mid), P("마지막 한 수", B(key, "action"), key)],
    yesno: [P("좋은 점", B(key, "positive"), key), P("걸리는 점", B(mid, "obstacle"), mid), P("판단 기준", B(first, "action"), first)],
    mind: [P("그 사람의 지금 마음", (B(key, "connect") || "").replace(/^‘[^’]+’\s*자리에서,\s*/, ""), key), P("말 못 한 속마음", B(mid, "blindspot"), mid), P("다가가는 법", B(first, "action"), first)],
  }[type];
  return L ? L.filter(Boolean) : null;
}
