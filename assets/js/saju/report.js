/* =========================================================
   사주 리포트 생성기
   프로필(오행 분포) + 입력(집중분야)을 받아, 화면이 그릴 수 있는
   구조화된 리포트 데이터를 만든다. (렌더링은 sajuResult.js가 담당)
   각 카드 블록은 요청된 구조를 따른다:
   핵심요약 · 구체적 해석 · 실제 상황 · 주의할 점 · 현실적 행동 제안
   ========================================================= */

/* (합침) ./traits.js 에서 가져오던 것 — 이제 같은 파일 */

const ELEMENT_META = {
  wood: { label: "목(木)", keyword: "성장·확장" },
  fire: { label: "화(火)", keyword: "표현·열정" },
  earth: { label: "토(土)", keyword: "안정·중재" },
  metal: { label: "금(金)", keyword: "원칙·결단" },
  water: { label: "수(水)", keyword: "사고·유연" },
};

// 블록 헬퍼
const B = (tag, label, icon, body) => ({ tag, label, icon, body });

export function buildSajuReport(profile, input, sectionsDef) {
  const sorted = Object.entries(profile.elements).sort((a, b) => b[1] - a[1]);
  const domKey = sorted[0][0];
  const subKey = sorted[1][0];
  const t = ELEMENT_TRAITS[domKey];
  const t2 = ELEMENT_TRAITS[subKey];

  const dominant = sorted.map(([key, value]) => ({
    key, value, label: ELEMENT_META[key].label, keyword: ELEMENT_META[key].keyword,
  }));

  const meters = sorted.map(([key, value]) => ({
    key, value, label: ELEMENT_META[key].label, keyword: ELEMENT_META[key].keyword,
  }));

  const dmElem = profile.dayMasterElem ? ELEMENT_META[profile.dayMasterElem] : null;
  const dmLine = profile.dayMaster && dmElem
    ? `일간(日干)은 ${profile.dayMaster}(${dmElem.label}), 곧 당신을 상징하는 오행은 ${dmElem.label}입니다. `
    : "";
  const summaryLead =
    dmLine +
    `여덟 글자 전체로 보면 ${ELEMENT_META[domKey].label} 기운(${ELEMENT_META[domKey].keyword})이 가장 두드러지고, ` +
    `${ELEMENT_META[subKey].label} 기운(${ELEMENT_META[subKey].keyword})이 이를 보조합니다. ` +
    `‘${ELEMENT_LABEL[domKey]}’ 성향이 강점이자 동시에 조심할 지점이 됩니다. ` +
    `아래는 좋은 말만 늘어놓기보다, 강점이 과해졌을 때의 부작용과 현실적인 갈등 지점까지 함께 짚은 리포트입니다.`;

  // 섹션별 블록 구성
  const builders = {
    personality: () => personalitySection(t),
    relationship: () => relationshipSection(t),
    love: () => loveSection(t),
    marriage: () => marriageSection(domKey, t),
    money: () => moneySection(t),
    career: () => careerSection(t),
    timeline: () => timelineSection(domKey, input),
    habits: () => null, // habits는 별도 처리
    loveflow: () => loveflowSection(domKey, t),
  };

  const focus = new Set(input.focus || []);
  const sections = [];
  for (const def of sectionsDef.sections) {
    if (def.id === "habits") continue;
    const blocks = builders[def.id] ? builders[def.id]() : null;
    if (!blocks) continue;
    sections.push({
      id: def.id, title: def.title, sub: def.sub, icon: def.icon,
      focused: focus.has(def.focus) || def.always === true,
      blocks,
    });
  }
  // 집중 분야 우선 정렬 (선택 분야를 앞으로, always 섹션은 유지)
  sections.sort((a, b) => (b.focused === true) - (a.focused === true));

  const habits = habitsSection(domKey, subKey);

  return {
    dominant, meters, summaryLead, sections, habits,
    domKey, subKey,
  };
}

/* ---------- 각 섹션 빌더 ---------- */

function personalitySection(t) {
  return [
    B("summary", "핵심 요약", "compass", [`${t.persona.surface} 하지만 ${t.persona.inner}`]),
    B("read", "구체적 해석", "info", { ul: [
      `겉으로 보이는 모습 — ${t.persona.surface}`,
      `실제 내면 성향 — ${t.persona.inner}`,
      `이미지와 내면의 차이 — ${t.persona.gap}`,
    ]}),
    B("case", "스트레스를 받을 때", "alert", [t.persona.stress]),
    B("warn", "주의할 점", "alert", ["강점(추진·표현·안정 등)이 과해지면 오히려 관계와 판단을 흐릴 수 있습니다. 자신의 기본값을 ‘항상 옳은 것’으로 여기지 않는 태도가 중요합니다."]),
    B("action", "현실적인 행동 제안", "lightbulb", ["하루를 마칠 때, 오늘 나의 반응 중 ‘성향이 과했던 순간’ 하나만 돌아보세요. 자책이 아니라 관찰이 목적입니다."]),
  ];
}

function relationshipSection(t) {
  return [
    B("summary", "핵심 요약", "users", [t.relationship.problem]),
    B("read", "구체적 해석", "info", { ul: [
      `반복되는 문제 — ${t.relationship.problem}`,
      `같은 문제가 반복되는 원인 — ${t.relationship.cause}`,
      `가까운 사람에게 보이는 태도 — ${t.relationship.closeAttitude}`,
      `갈등이 생겼을 때의 반응 — ${t.relationship.conflictReaction}`,
    ]}),
    B("case", "실제로 나타나는 상황", "clock", ["예: 상대는 그냥 공감을 원했는데 당신은 해결책부터 꺼내, 대화가 서로 어긋난 채 끝난 경험이 있을 수 있습니다."]),
    B("warn", "주의할 점", "alert", ["관계 문제를 상대 탓으로만 돌리면 같은 패턴이 다음 관계에서도 반복됩니다."]),
    B("action", "관계를 편하게 만드는 법", "lightbulb", [t.relationship.fix]),
  ];
}

function loveSection(t) {
  return [
    B("summary", "핵심 요약", "heart", [`${t.love.start} ${t.love.express}`]),
    B("read", "구체적 해석", "info", { ul: [
      `연애를 시작하는 방식 — ${t.love.start}`,
      `호감을 표현하는 방식 — ${t.love.express}`,
      `연애 중 불안을 느끼는 지점 — ${t.love.anxiety}`,
    ]}),
    B("good", "잘 맞는 사람", "heart", [t.love.match]),
    B("warn", "잘 맞지 않는 사람", "alert", [t.love.mismatch]),
    B("warn", "이별로 이어지기 쉬운 패턴", "alert", [t.love.breakup]),
    B("action", "현실적인 행동 제안", "lightbulb", ["불안이 커질 때 혼자 결론 내리기 전에, 상대에게 사실을 확인하는 한 문장을 먼저 건네 보세요."]),
  ];
}

function marriageSection(domKey, t) {
  const values = {
    wood: "함께 성장하고 서로의 목표를 응원하는 관계를 중요하게 여깁니다.",
    fire: "감정 표현이 오가고 서로 반응해 주는 따뜻한 관계를 중요하게 여깁니다.",
    earth: "안정적이고 예측 가능한 일상, 서로에 대한 신뢰를 중요하게 여깁니다.",
    metal: "약속과 책임이 지켜지는, 서로 존중하는 명확한 관계를 중요하게 여깁니다.",
    water: "서로를 이해하려 노력하고 대화가 통하는 관계를 중요하게 여깁니다.",
  }[domKey];
  return [
    B("summary", "핵심 요약", "users", [values]),
    B("read", "생활·돈에서 생길 수 있는 갈등", "info", [t.money.type + " 배우자와 소비·저축의 기준이 다르면 반복적인 마찰이 생길 수 있습니다."]),
    B("case", "가족·집안일·감정 표현", "clock", { ul: [
      "역할 분담을 ‘말하지 않아도 알겠지’로 넘기면 서운함이 쌓입니다.",
      "감정 표현 방식(직접/간접)의 차이가 오해로 이어질 수 있습니다.",
    ]}),
    B("read", "배우자에게 기대하는 역할", "info", [t.love.match]),
    B("action", "결혼 전 반드시 조율할 것", "lightbulb", { ul: [
      "돈 관리 방식(공동/분리)과 큰 지출 결정 기준",
      "집안일·양가 관계에서의 역할과 경계",
      "갈등이 생겼을 때 서로가 원하는 대화 방식",
    ]}),
    B("warn", "주의", "alert", ["결혼 시기·상대는 확정된 예언이 아닙니다. 위 조건들이 얼마나 맞춰지는지가 관계의 안정에 더 큰 영향을 줍니다."]),
  ];
}

function moneySection(t) {
  return [
    B("summary", "핵심 요약", "coins", [t.money.type]),
    B("read", "구체적 해석", "info", { ul: [
      `축적 유형 — ${t.money.type}`,
      `돈을 잃기 쉬운 습관 — ${t.money.losing}`,
      `잘 맞는 수입 구조 — ${t.money.structure}`,
    ]}),
    B("case", "실제로 나타나는 상황", "clock", ["예: ‘이번 한 번쯤’ 하는 지출이 쌓여, 월말에 계획과 실제가 어긋나는 일이 반복될 수 있습니다."]),
    B("warn", "투자·소비에서 조심할 점", "alert", [t.money.caution]),
    B("action", "현실적인 행동 제안", "lightbulb", ["큰 지출은 ‘24시간 규칙’(하루 두고 다시 판단)을 적용하고, 저축은 자동이체로 먼저 떼어 두세요."]),
  ];
}

function careerSection(t) {
  return [
    B("summary", "핵심 요약", "briefcase", [t.career.recognized]),
    B("read", "구체적 해석", "info", { ul: [
      `인정받는 방식 — ${t.career.recognized}`,
      `성과를 내기 쉬운 환경 — ${t.career.goodEnv}`,
      `힘들어지는 조직 문화 — ${t.career.hardEnv}`,
      `상사·동료와 부딪히는 지점 — ${t.career.conflict}`,
    ]}),
    B("good", "잘 맞는 업무 방식", "check", [t.career.style]),
    B("read", "성향 유형", "info", [t.career.type]),
    B("action", "현실적인 행동 제안", "lightbulb", ["지금 환경이 당신의 강점을 쓰게 하는지 점검하고, 아니라면 강점을 살릴 작은 역할부터 요청해 보세요."]),
  ];
}

function timelineSection(domKey, input) {
  return [
    B("summary", "핵심 요약", "clock", ["아래는 특정 사건을 확정하는 예언이 아니라, ‘가능성이 커지는 흐름’과 그때 취할 수 있는 현실적 행동입니다."]),
    B("read", "앞으로 1년", "info", ["익숙한 방식을 점검하고 기반을 다지기 좋은 시기입니다. 크게 벌이기보다 정리와 준비에 무게를 두면 이후 흐름이 수월해집니다."]),
    B("read", "2년 차 — 기회가 커질 수 있는 영역", "info", ["그동안 준비한 것이 결과로 이어질 가능성이 커집니다. 다만 기회가 온다고 무리하게 판을 키우지 말고, 감당 가능한 범위에서 확장하세요."]),
    B("warn", "3년 차 — 조심할 변화", "alert", ["관계나 환경의 변화가 겹칠 수 있습니다. 중요한 결정을 한꺼번에 몰아서 하지 말고 시차를 두세요."]),
    B("case", "영역별 흐름", "clock", { ul: [
      "연애 — 조급한 확인보다 관계의 속도를 맞추는 것이 흐름을 좋게 합니다.",
      "직업 — 새 시도는 작게 시작해 검증한 뒤 키우는 편이 안전합니다.",
      "금전 — 큰 결정은 서두르지 말고, 정보가 충분히 모인 뒤 판단하세요.",
    ]}),
    B("action", "결정을 서두르지 말아야 할 때", "lightbulb", ["마음이 급해질수록 하루 이상 두고 다시 보는 습관이, 이 시기의 가장 좋은 안전장치입니다."]),
  ];
}

function loveflowSection(domKey, t) {
  return [
    B("summary", "핵심 요약", "heart", [`${t.love.start} 이 성향은 연애의 시작과 지속 방식 모두에 영향을 줍니다.`]),
    B("read", "인생 전반의 연애 성향", "info", [`${t.love.express} ${t.love.anxiety}`]),
    B("read", "앞으로의 연애 흐름", "info", ["당신이 관계에서 반복하는 패턴을 인식할수록, 다음 관계의 흐름이 달라집니다. 흐름은 정해진 것이 아니라 당신의 선택으로 바뀝니다."]),
    B("good", "만날 가능성이 높은 상대", "heart", [t.love.match + " 이런 사람과는 관계가 시작되고 유지되기 쉽습니다."]),
    B("read", "관계가 시작되기 쉬운 환경", "info", ["자연스럽게 반복해 마주치고, 편하게 대화가 이어지는 환경에서 관계가 열립니다. 조급하게 결과를 재촉하는 자리에서는 오히려 어긋납니다."]),
    B("warn", "연애가 깨지기 쉬운 원인", "alert", [t.love.breakup]),
    B("action", "결혼을 고려하기 좋은 조건", "lightbulb", { ul: [
      "돈·생활 방식의 기준을 서로 솔직히 확인했는가",
      "갈등이 생겼을 때 대화가 되는가",
      "서로의 가족·미래에 대한 생각이 크게 어긋나지 않는가",
    ]}),
    B("warn", "안내", "info", ["결혼 상대와 시기를 단정적으로 예언하지 않습니다. 위 조건이 맞춰질수록 관계가 안정될 가능성이 높아진다는 의미로 읽어 주세요."]),
  ];
}

function habitsSection(domKey, subKey) {
  const bank = {
    wood: {
      title: "검증 전에 먼저 일을 벌이는 습관",
      reason: "성장과 속도를 중시해, 확인보다 시작이 앞서기 때문입니다.",
      example: "‘될 것 같아서’ 자원이나 시간을 먼저 투입했다가, 나중에 조건이 안 맞아 되돌리는 일이 반복됩니다.",
      action: "시작 전 ‘되돌릴 수 없는 것’만 미리 점검하는 체크리스트를 만드세요.",
      task: "이번 주에 새로 시작하려는 일 하나에 대해, 최악의 경우 잃는 것을 종이에 적어 보기.",
    },
    fire: {
      title: "감정이 오를 때 바로 말해 버리는 습관",
      reason: "그 순간의 감정을 표현해야 풀리는 성향 때문입니다.",
      example: "욱해서 던진 한마디가 관계를 식게 만들고, 뒤늦게 후회하는 일이 반복됩니다.",
      action: "감정이 격해지면 ‘10분 뒤에 말하기’ 규칙을 두세요.",
      task: "이번 주, 화가 난 순간 바로 답하지 않고 한 번 심호흡 후 반응하기(하루 1회 기록).",
    },
    earth: {
      title: "불편을 참고 넘기다 한계에서 정리하는 습관",
      reason: "관계의 평화를 위해 자기 필요를 뒤로 미루기 때문입니다.",
      example: "싫은 소리를 못 하다가, 어느 날 갑자기 지쳐 관계를 끊어 상대가 영문을 모릅니다.",
      action: "작은 불편을 그때그때 가볍게 말하는 연습을 하세요.",
      task: "이번 주, 사소한 부탁 하나를 정중히 거절하거나 원하는 것을 한 번 표현하기.",
    },
    metal: {
      title: "옳음을 먼저 증명하려는 습관",
      reason: "명확함과 기준을 중시해, 감정보다 논리가 앞서기 때문입니다.",
      example: "맞는 말을 했는데 상대가 상처받아, 정작 관계가 멀어지는 일이 생깁니다.",
      action: "지적하기 전에 상대의 감정을 먼저 인정하는 한마디를 붙이세요.",
      task: "이번 주, 누군가와 의견이 다를 때 ‘네 입장도 이해돼’를 먼저 말해 보기.",
    },
    water: {
      title: "확인 대신 혼자 추측하는 습관",
      reason: "신호를 예민하게 읽는 만큼, 해석을 사실처럼 믿기 때문입니다.",
      example: "상대의 짧은 답을 나쁜 뜻으로 해석해, 혼자 서운해하고 거리를 둡니다.",
      action: "추측이 들면 ‘사실인지 물어보기’를 기본 절차로 삼으세요.",
      task: "이번 주, 혼자 결론 내리기 전에 상대에게 직접 확인하는 질문 한 번 해 보기.",
    },
  };
  // 지배·보조 오행 + 공통 하나로 3가지 구성
  const third = {
    title: "중요한 결정을 운세·기분에 기대는 습관",
    reason: "불안할 때 빠르게 마음을 정리하고 싶은 마음 때문입니다.",
    example: "충분히 알아보기 전에 감이나 그날의 기분으로 큰 선택을 해, 나중에 근거가 부족했음을 느낍니다.",
    action: "중요한 결정은 사실 정보·주변 의견·필요하면 전문가 조언을 함께 검토하세요.",
    task: "이번 주, 앞둔 결정 하나에 대해 근거 세 가지를 적고, 부족한 정보를 하나 채우기.",
  };
  const list = [bank[domKey]];
  if (subKey !== domKey && bank[subKey]) list.push(bank[subKey]);
  list.push(third);
  return list.slice(0, 3);
}

/* ===================================================================
   (합침) traits.js — 파일 수를 줄이려고 이 파일 안으로 옮김 (HAE)
   =================================================================== */
/* =========================================================
   오행별 성향 콘텐츠 라이브러리
   report.js가 지배 오행에 따라 이 문구들을 조합해 리포트를 만든다.
   톤 원칙: 장점의 부작용과 단점의 원인·개선을 함께, 구체적 사례 중심,
   확정적 예언·공포 유발 금지. 데이터와 화면 코드를 분리하기 위한 모듈.
   ========================================================= */

export const ELEMENT_TRAITS = {
  wood: {
    persona: {
      surface: "밝고 추진력 있어 보이며, 새로운 일을 먼저 제안하는 사람으로 비칩니다.",
      inner: "속으로는 인정과 성장을 중요하게 여겨, 멈춰 있는 상태를 견디기 힘들어합니다.",
      gap: "겉으로는 여유로워 보여도, 실제로는 ‘지금 나아지고 있나’를 자주 점검하며 초조해합니다.",
      stress: "스트레스를 받으면 일을 더 벌이거나, 반대로 급하게 방향을 틀어 주변을 당황하게 만듭니다."
    },
    relationship: {
      problem: "관계 초반에 빠르게 가까워졌다가, 상대의 속도가 다르면 혼자 실망하고 거리를 둡니다.",
      cause: "‘함께 성장해야 한다’는 기준이 높아, 상대의 현재 모습보다 가능성에 기대를 걸기 때문입니다.",
      closeAttitude: "가까운 사람에게는 조언과 계획을 자주 건네는데, 상대는 이를 간섭으로 느낄 수 있습니다.",
      conflictReaction: "갈등이 생기면 문제를 바로 ‘해결’하려 들어, 감정을 먼저 들어주길 원하는 상대와 어긋납니다.",
      fix: "상대의 속도를 바꾸려 하기 전에, 지금 그대로도 괜찮다는 신호를 먼저 주는 연습이 필요합니다."
    },
    love: {
      start: "호감을 느끼면 먼저 다가가 관계를 빠르게 진전시키려 합니다.",
      express: "행동과 계획(같이 갈 곳, 할 일)으로 애정을 표현하는 편입니다.",
      anxiety: "관계가 정체되거나 상대가 무심해 보이면, 이 관계가 발전하지 않는다는 불안이 커집니다.",
      match: "당신의 추진을 응원하면서도 자기 페이스가 분명한 사람과 편안합니다.",
      mismatch: "결정을 계속 미루거나 변화를 싫어하는 사람과는 답답함이 쌓이기 쉽습니다.",
      breakup: "혼자 앞서 결론 내리고 상대에게 확인하지 않은 채 정을 접는 패턴을 조심해야 합니다."
    },
    money: {
      type: "기회와 성장에 투자해 수입을 키우는 확장형이지만, 지출도 함께 커지는 기복형에 가깝습니다.",
      losing: "‘될 것 같다’는 확신으로 검증 전에 자원을 먼저 넣는 습관이 손실로 이어질 수 있습니다.",
      structure: "고정 수입 위에 성장형 시도를 얹는 구조가 안정적입니다. 시도는 감당 가능한 규모로 나누세요.",
      caution: "새 기회에 끌릴 때, 최악의 경우 잃어도 되는 금액인지 먼저 정해 두세요."
    },
    career: {
      recognized: "새로운 시도와 빠른 실행으로 초반 성과를 내며 인정받습니다.",
      goodEnv: "자율성이 있고 성장이 눈에 보이는 환경에서 힘을 냅니다.",
      hardEnv: "변화가 없고 절차만 반복되는 조직에서는 빠르게 지칩니다.",
      conflict: "속도가 느린 동료나, 이유 없이 ‘원래 이렇게 한다’는 상사와 부딪힙니다.",
      style: "방향을 잡고 초기 동력을 만드는 일에 강합니다. 마무리는 함께할 사람을 두면 좋습니다.",
      type: "리더형·창업형 성향이 있으나, 확장만큼 관리가 약할 수 있어 실무 파트너가 필요합니다."
    }
  },

  fire: {
    persona: {
      surface: "표현이 풍부하고 분위기를 밝히는, 감정이 잘 드러나는 사람으로 보입니다.",
      inner: "속으로는 인정과 반응에 민감해, 무관심을 거절로 받아들이기 쉽습니다.",
      gap: "겉으로는 당당해 보여도, 상대의 표정과 반응에 따라 마음이 크게 오르내립니다.",
      stress: "스트레스를 받으면 감정을 즉각 표출하거나, 반대로 갑자기 연락을 끊고 잠수하기도 합니다."
    },
    relationship: {
      problem: "감정이 앞서 말이 세게 나간 뒤, 관계가 식으면 뒤늦게 후회하는 일이 반복됩니다.",
      cause: "그 순간의 감정을 표현해야 직성이 풀려서, 상대가 받을 충격을 나중에야 계산하기 때문입니다.",
      closeAttitude: "가까운 사람에게 솔직하고 다정하지만, 기분에 따라 온도 차가 커 상대가 눈치를 봅니다.",
      conflictReaction: "갈등이 생기면 즉시 풀고 싶어 몰아붙이는데, 시간을 원하는 상대에겐 압박이 됩니다.",
      fix: "감정이 올라올 때 바로 말하기보다, 한 박자 쉬고 표현하는 장치를 만들면 관계가 안정됩니다."
    },
    love: {
      start: "끌리면 감정 표현이 빨라, 상대가 마음을 확실히 느끼게 합니다.",
      express: "말·연락·다정한 표현으로 애정을 적극적으로 드러냅니다.",
      anxiety: "상대의 연락이 뜸하거나 반응이 밋밋하면, 식은 건 아닌지 금세 불안해집니다.",
      match: "감정을 함께 표현하고 자주 반응해 주는 사람과 잘 맞습니다.",
      mismatch: "감정 표현이 인색하거나 확인을 부담스러워하는 사람과는 서로 지칩니다.",
      breakup: "서운함을 그때그때 크게 표출했다가 관계를 소진시키는 패턴을 조심해야 합니다."
    },
    money: {
      type: "기분과 관계에 따라 지출이 오르내리는 감정형 소비 성향이 있습니다.",
      losing: "기분 전환이나 사람과의 자리에서 즉흥적으로 쓰는 지출이 새는 돈이 됩니다.",
      structure: "자동 저축으로 먼저 떼어 두고, 남은 돈 안에서 자유롭게 쓰는 구조가 맞습니다.",
      caution: "감정이 격해진 날에는 큰 지출·결제 결정을 하루 미루는 규칙을 두세요."
    },
    career: {
      recognized: "발표·설득·분위기 조성처럼 사람을 움직이는 일에서 빛납니다.",
      goodEnv: "반응이 빠르고 성과가 즉시 보이는 환경에서 동기를 얻습니다.",
      hardEnv: "피드백 없이 혼자 오래 파고드는 일에서는 열정이 식습니다.",
      conflict: "감정 표현을 불편해하는 조직이나, 반응이 없는 상사와 부딪힙니다.",
      style: "사람과 함께 에너지를 내는 협업·대면 업무에 강합니다.",
      type: "실무형·프리랜서형 중 사람을 상대하는 역할에서 성과가 큽니다."
    }
  },

  earth: {
    persona: {
      surface: "안정감 있고 편안해, 사람들이 기대고 상담하고 싶어 하는 인상입니다.",
      inner: "속으로는 갈등과 변화를 피하고 싶어, 불편을 참고 넘기는 경우가 많습니다.",
      gap: "겉으로는 무던해 보여도, 안에서는 참은 서운함이 조용히 쌓이고 있습니다.",
      stress: "스트레스를 받으면 말수가 줄고 혼자 삭이다가, 한계에 다다르면 갑자기 관계를 정리합니다."
    },
    relationship: {
      problem: "싫은 소리를 못 해 맞춰 주다가, 어느 순간 지쳐 일방적으로 멀어집니다.",
      cause: "관계의 평화를 위해 자기 필요를 뒤로 미루는 것이 배려라고 믿기 때문입니다.",
      closeAttitude: "가까운 사람을 묵묵히 챙기지만, 정작 자신이 원하는 건 표현하지 않습니다.",
      conflictReaction: "갈등을 피하려 ‘괜찮다’고 넘기지만, 마음속 거리감은 오히려 커집니다.",
      fix: "참기 전에 작은 불편을 그때그때 가볍게 말하는 연습이 관계를 오래가게 합니다."
    },
    love: {
      start: "천천히 신뢰를 쌓으며 다가가, 관계가 깊어지는 데 시간이 걸립니다.",
      express: "말보다 행동과 챙김으로, 꾸준함으로 애정을 표현합니다.",
      anxiety: "관계가 흔들릴 조짐이 보이면, 표현 대신 혼자 참으며 불안을 키웁니다.",
      match: "안정적이고 표현을 먼저 해 주는, 당신의 속마음을 물어봐 주는 사람과 잘 맞습니다.",
      mismatch: "변덕이 심하거나 확신을 주지 않는 사람과는 마음고생이 큽니다.",
      breakup: "할 말을 삼키다 감정이 바닥나 ‘조용히 정리’해 버리는 패턴을 조심해야 합니다."
    },
    money: {
      type: "꾸준히 모으는 안정형 축적 성향으로, 큰 손실은 적지만 기회도 놓치기 쉽습니다.",
      losing: "관계 때문에 거절 못 하고 빌려주거나 보증·부탁을 떠안는 데서 손실이 납니다.",
      structure: "안정적 저축을 기본으로, 소액의 계획적 투자로 성장 기회를 조금씩 열어 두세요.",
      caution: "‘정 때문에’ 하는 금전 결정은 반드시 하루 이상 두고 판단하세요."
    },
    career: {
      recognized: "성실함과 신뢰로 오래 함께하고 싶은 사람이라는 평가를 받습니다.",
      goodEnv: "역할이 안정적이고 사람 사이 신뢰가 쌓이는 환경에서 힘을 냅니다.",
      hardEnv: "잦은 변화와 경쟁을 앞세우는 조직에서는 소진되기 쉽습니다.",
      conflict: "공을 가로채거나 갈등을 몰고 오는 사람 앞에서 참다가 손해를 봅니다.",
      style: "꾸준함과 조율이 필요한 실무·중재 업무에 강합니다.",
      type: "실무형·중재형에 강하며, 자기 몫을 표현하는 훈련이 성장의 열쇠입니다."
    }
  },

  metal: {
    persona: {
      surface: "단정하고 원칙이 분명해, 믿을 수 있고 프로페셔널하게 보입니다.",
      inner: "속으로는 옳고 그름의 기준이 뚜렷해, 어긋나는 상황을 오래 곱씹습니다.",
      gap: "겉으로는 냉정해 보여도, 안에서는 실망과 자기비판이 함께 돌아가고 있습니다.",
      stress: "스트레스를 받으면 말이 날카로워지거나, 감정을 닫고 거리를 두어 차갑게 비칩니다."
    },
    relationship: {
      problem: "기준에 맞지 않는 사람을 속으로 평가하다, 어느새 관계에 벽을 세웁니다.",
      cause: "명확함을 중시해, 애매한 태도나 말 바꾸는 행동을 신뢰의 문제로 받아들이기 때문입니다.",
      closeAttitude: "가까운 사람에게 솔직하지만, 그 솔직함이 상대에겐 지적으로 느껴질 수 있습니다.",
      conflictReaction: "갈등 시 논리로 옳고 그름을 가리려 해, 감정이 상한 상대와 더 멀어집니다.",
      fix: "옳음을 증명하기 전에, 상대의 감정을 먼저 인정하는 한마디가 관계를 지킵니다."
    },
    love: {
      start: "신중하게 상대를 관찰한 뒤, 확신이 서야 마음을 엽니다.",
      express: "책임감 있는 태도와 약속을 지키는 것으로 애정을 보여 줍니다.",
      anxiety: "상대의 말과 행동이 다르면, 신뢰가 흔들리며 마음을 닫기 시작합니다.",
      match: "말과 행동이 일치하고 약속을 지키는, 명확한 소통을 하는 사람과 잘 맞습니다.",
      mismatch: "감정 기복이 크거나 말을 자주 바꾸는 사람과는 신뢰가 쌓이지 않습니다.",
      breakup: "실망을 표현하지 않고 마음속에서 먼저 관계를 정리해 버리는 패턴을 조심해야 합니다."
    },
    money: {
      type: "원칙에 따라 관리하는 계획형으로, 낭비는 적지만 지나친 통제로 기회를 놓치기도 합니다.",
      losing: "‘내 판단이 맞다’는 확신으로 손절 타이밍을 놓치는 데서 손실이 납니다.",
      structure: "명확한 규칙(예산·비중)을 정해 두고 기계적으로 지키는 구조가 잘 맞습니다.",
      caution: "확신이 강할수록, 반대 근거를 일부러 한 번 더 검토하세요."
    },
    career: {
      recognized: "정확함과 원칙, 높은 완성도로 신뢰를 얻습니다.",
      goodEnv: "기준이 분명하고 전문성이 존중받는 환경에서 실력을 냅니다.",
      hardEnv: "원칙이 자주 흔들리고 정치적 판단이 앞서는 조직에서 스트레스가 큽니다.",
      conflict: "대충 넘어가려는 동료나 일관성 없는 지시를 하는 상사와 부딪힙니다.",
      style: "정밀함과 판단이 필요한 전문·관리 업무에 강합니다.",
      type: "전문가형·관리형에 강하며, 유연함을 더하면 리더로도 성장합니다."
    }
  },

  water: {
    persona: {
      surface: "생각이 깊고 유연해, 상황을 잘 읽는 지적인 사람으로 보입니다.",
      inner: "속으로는 여러 경우의 수를 계산하느라, 결정을 앞두고 오래 머뭇거립니다.",
      gap: "겉으로는 태연해 보여도, 머릿속에서는 끊임없이 시뮬레이션이 돌아가고 있습니다.",
      stress: "스트레스를 받으면 생각이 과해져 잠을 설치거나, 회피하듯 결정을 미룹니다."
    },
    relationship: {
      problem: "상대의 마음을 지레짐작하다, 확인하지 않은 추측으로 혼자 상처받습니다.",
      cause: "관계의 신호를 예민하게 읽는 만큼, 사실이 아닌 해석까지 진짜로 믿기 때문입니다.",
      closeAttitude: "가까운 사람의 감정을 잘 헤아리지만, 정작 자기 속은 잘 열지 않습니다.",
      conflictReaction: "갈등을 직면하기보다 돌려 말하거나 피해, 문제가 흐지부지 반복됩니다.",
      fix: "추측을 사실처럼 믿기 전에, 상대에게 직접 물어 확인하는 습관이 필요합니다."
    },
    love: {
      start: "천천히 상대를 알아가며, 감정보다 이해가 먼저 쌓이는 편입니다.",
      express: "세심한 배려와 상대의 필요를 읽는 방식으로 애정을 표현합니다.",
      anxiety: "상대의 작은 변화를 크게 해석해, 혼자 시나리오를 그리며 불안해집니다.",
      match: "감정을 솔직히 말해 주어 추측할 필요를 줄여 주는 사람과 편안합니다.",
      mismatch: "속을 알기 어렵거나 밀당을 즐기는 사람과는 불안이 증폭됩니다.",
      breakup: "확인 대신 혼자 결론짓고, 마음의 문을 조용히 닫는 패턴을 조심해야 합니다."
    },
    money: {
      type: "정보를 모아 신중히 판단하는 분석형으로, 타이밍에 따라 수입 기복이 있습니다.",
      losing: "지나친 고민으로 결정을 미루다, 좋은 타이밍을 놓치는 데서 손실이 납니다.",
      structure: "자동화된 규칙으로 결정을 단순화하고, 정보 수집 시간을 제한하는 게 좋습니다.",
      caution: "완벽한 정보를 기다리기보다, 기한을 정해 ‘충분히 좋은’ 결정을 내리세요."
    },
    career: {
      recognized: "분석력과 통찰, 상황 판단으로 신뢰받습니다.",
      goodEnv: "깊이 사고할 시간이 주어지고 유연성이 있는 환경에서 강합니다.",
      hardEnv: "즉흥적 결정과 잦은 재촉이 반복되는 조직에서 지칩니다.",
      conflict: "몰아붙이며 즉답을 요구하는 사람과 부딪힙니다.",
      style: "기획·분석·전략처럼 깊이 있는 사고가 필요한 업무에 강합니다.",
      type: "기획형·전문가형에 강하며, 실행을 앞당기는 파트너와 함께하면 좋습니다."
    }
  }
};

/* 결혼/시기/습관/연애흐름은 지배 오행 라벨을 참조하되 공통 뼈대를 사용 */
export const ELEMENT_LABEL = {
  wood: "성장 지향", fire: "감정 표현형", earth: "안정 중시",
  metal: "원칙 중시", water: "사고 중심"
};

/* ===================================================================
   (합침) spouse.js — 파일 수를 줄이려고 이 파일 안으로 옮김 (HAE)
   =================================================================== */
/* =========================================================
   인연·이상형·배우자 초상 — 사주 기반 '재미·참고용' 해석.
   배우자성(남=재성, 여=관성)의 오행·십신과 배우자궁(일지),
   그리고 매력 신살(도화·홍염·화개)로 이상형과 배우자 이미지를 그린다.
   원칙: 확정 예언 금지. 사주로 상상한 이미지일 뿐, 실제 인물 사진이 아님을 명시.
   ========================================================= */

import { tenGod } from "./fortune.js";
import { analyzeStrength } from "./strength.js";

const STEM_ELEM = ["wood", "wood", "fire", "fire", "earth", "earth", "metal", "metal", "water", "water"];
const BRANCH_ELEM = ["water", "earth", "wood", "wood", "earth", "fire", "fire", "earth", "metal", "metal", "earth", "water"];
const JIJANG_MAIN = [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8]; // 지지 정기 stem
const GOD_GROUP = { 비견: "비겁", 겁재: "비겁", 식신: "식상", 상관: "식상", 정재: "재성", 편재: "재성", 정관: "관성", 편관: "관성", 정인: "인성", 편인: "인성" };

/** 사주 전체의 십신 개수(그룹별 + 개별) */
export function godTally(profile) {
  const d = profile.pillars.day.stemIdx;
  const group = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  const each = {};
  const add = (g) => { group[GOD_GROUP[g]]++; each[g] = (each[g] || 0) + 1; };
  for (const k of ["year", "month", "day", "hour"]) {
    const p = profile.pillars[k]; if (!p) continue;
    if (k !== "day") add(tenGod(d, p.stemIdx));
    add(tenGod(d, JIJANG_MAIN[p.branchIdx]));
  }
  return { group, each };
}
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const ELEM_KR = { wood: "목(木)", fire: "화(火)", earth: "토(土)", metal: "금(金)", water: "수(水)" };
const BRANCH_H = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

// 홍염살(紅艶殺): 일간 → 지지
const HONGYEOM = [6, 6, 2, 7, 4, 4, 10, 9, 0, 8];
// 도화살(년살)·화개살은 12신살로 판정 (삼합 왕지 기준)
const WANGJI = { 8: 0, 0: 0, 4: 0, 2: 6, 6: 6, 10: 6, 11: 3, 3: 3, 7: 3, 5: 9, 9: 9, 1: 9 };
const mod = (n, m) => ((n % m) + m) % m;
const sinsalName = (base, target) => ["겁살", "재살", "천살", "지살", "도화살", "월살", "망신살", "장성살", "반안살", "역마살", "육해살", "화개살"][mod(target - mod(WANGJI[base] + 5, 12), 12)];

// 배우자성 = 남자는 재성(내가 극하는 오행), 여자는 관성(나를 극하는 오행)
const CTRL = { wood: "earth", fire: "metal", earth: "water", metal: "wood", water: "fire" }; // 내가 극하는
const CTRL_BY = { wood: "metal", fire: "water", earth: "wood", metal: "fire", water: "earth" }; // 나를 극하는
const RESOURCE = { wood: "water", fire: "wood", earth: "fire", metal: "earth", water: "metal" }; // 나를 생하는(인성)
const OUTPUT = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" }; // 내가 생하는(식상)

const ELEM_LOOK = {
  wood: { build: "키가 크고 늘씬한 편, 손발이 곧고 자세가 반듯", vibe: "선하고 성장 지향적인", face: "이마가 시원하고 눈매가 부드러운", color: "#6fae7d" },
  fire: { build: "이목구비가 또렷하고 화사한 인상", vibe: "밝고 표현이 풍부한", face: "눈빛이 반짝이고 웃을 때 매력적인", color: "#e08a7a" },
  earth: { build: "체격이 든든하고 안정감 있는", vibe: "믿음직하고 포용력 있는", face: "둥글고 편안해 정이 가는", color: "#d8b878" },
  metal: { build: "선이 분명하고 단정한", vibe: "깔끔하고 자기관리가 확실한", face: "콧대가 서고 인상이 또렷한", color: "#c8ccd2" },
  water: { build: "부드럽고 유연한 실루엣", vibe: "총명하고 분위기 있는", face: "눈매가 그윽하고 피부가 맑은", color: "#7aa0c8" },
};

const IDEAL_BY_GOD = {
  재성: "현실감각이 있고 나를 편안하게 챙겨 주는 사람. 함께 무언가를 만들어 갈 때 안정을 느껴요.",
  관성: "듬직하고 책임감 있는, 나를 이끌어 주면서도 존중해 주는 사람에게 끌려요.",
};

function has(profile, predicateBranch) {
  const P = profile.pillars;
  return ["year", "month", "day", "hour"].some((k) => P[k] && predicateBranch(P[k].branchIdx));
}

/** 매력 신살 — 도화·홍염·화개 유무 */
export function charmSpirits(profile) {
  const P = profile.pillars;
  const dayStem = P.day.stemIdx;
  const yearB = P.year ? P.year.branchIdx : null;
  const dayB = P.day ? P.day.branchIdx : null;
  const branches = ["year", "month", "day", "hour"].filter((k) => P[k]).map((k) => P[k].branchIdx);

  const dohwa = branches.some((b) => (yearB != null && sinsalName(yearB, b) === "도화살") || (dayB != null && sinsalName(dayB, b) === "도화살"));
  const hwagae = branches.some((b) => (yearB != null && sinsalName(yearB, b) === "화개살") || (dayB != null && sinsalName(dayB, b) === "화개살"));
  const hongyeom = branches.includes(HONGYEOM[dayStem]);

  return {
    dohwa, hongyeom, hwagae,
    items: [
      { key: "도화살", on: dohwa, desc: dohwa ? "매력과 인기가 타고났어요. 이성에게 호감을 사고 사람을 끄는 힘이 있어요. (과하면 구설·복잡한 인연을 조심)" : "도화살은 뚜렷하지 않아요. 은근하고 진중하게 매력을 쌓는 타입이에요." },
      { key: "홍염살", on: hongyeom, desc: hongyeom ? "은은한 색기·분위기 미남미녀 기운. 가만히 있어도 눈길을 끄는 매력이 있어요." : "홍염살은 없어요. 화려함보다 편안함으로 다가가는 매력이에요." },
      { key: "화개살", on: hwagae, desc: hwagae ? "예술·감성·영성이 깊어요. 남다른 취향과 재능이 있지만, 고독과 사색을 즐겨 인연에선 마음의 문을 여는 게 관건이에요." : "화개살은 뚜렷하지 않아요. 관계에서 비교적 담백하고 현실적인 편이에요." },
    ],
  };
}

/** 이상형 — 배우자성의 오행·십신으로 */
export function idealType(profile, gender) {
  const dayElem = STEM_ELEM[profile.pillars.day.stemIdx];
  const spouseGod = gender === "male" ? "재성" : "관성";
  const spouseElem = gender === "male" ? CTRL[dayElem] : CTRL_BY[dayElem];
  const look = ELEM_LOOK[spouseElem];
  return {
    god: spouseGod,
    elem: spouseElem, elemKr: ELEM_KR[spouseElem],
    line: IDEAL_BY_GOD[spouseGod],
    look: `${look.vibe} 분위기에, ${look.build} 사람에게 끌리는 편이에요.`,
  };
}

/** 배우자 초상 — 배우자궁(일지)·배우자성 오행으로 이미지를 그린다 */
export function spousePortrait(profile, gender) {
  const dayBranch = profile.pillars.day.branchIdx; // 배우자궁
  const dayElem = STEM_ELEM[profile.pillars.day.stemIdx];
  const spouseElem = gender === "male" ? CTRL[dayElem] : CTRL_BY[dayElem];
  const seatElem = BRANCH_ELEM[dayBranch]; // 배우자궁 오행
  const look = ELEM_LOOK[spouseElem];
  const seat = ELEM_LOOK[seatElem];

  const traits = [
    `${look.face} 얼굴에 ${seat.build} 인상`,
    `${look.vibe} 성향에, ${seat.vibe} 면이 함께 있어요`,
  ];
  const summary = `배우자궁(일지 ${BRANCH_H[dayBranch]}(${"자축인묘진사오미신유술해"[dayBranch]}))과 배우자성 ${ELEM_KR[spouseElem]}${/^[목금]/.test(ELEM_KR[spouseElem]) ? "으로" : "로"} 그려 본 이미지예요. ` +
    `${look.face} 얼굴, ${look.build} 몸매의 ${look.vibe} 사람일 가능성이 커요. 첫인상보다 함께 지낼수록 편해지는 인연이에요.`;

  return {
    summary, traits,
    palette: { face: look.color, accent: seat.color },
    elem: spouseElem, hairElem: seatElem === spouseElem ? rotElem(spouseElem, 2) : seatElem, mood: "spouse", seed: seedOf(profile, "spouse"), sex: gender === "male" ? "female" : "male",
    elemKr: ELEM_KR[spouseElem], seatKr: ELEM_KR[seatElem], seatH: BRANCH_H[dayBranch],
  };
}

/** 낮져밤이 — 겉(식상·비겁)과 속(관성·인성)의 균형으로 본 반전 스타일 */
export function dayNightStyle(profile) {
  const { group } = godTally(profile);
  const expr = group.식상 + group.비겁; // 드러남·표현·활동
  const hold = group.관성 + group.인성; // 절제·내면
  let key, title, line;
  if (expr >= hold + 2) { key = "겉바속바"; title = "낮에도 밤에도 직진형"; line = "감정을 숨기지 못해요. 좋으면 티가 나고 표현이 빨라, 밀당보다 솔직한 돌직구가 매력이에요."; }
  else if (hold >= expr + 2) { key = "낮져밤이"; title = "낮엔 얌전, 밤엔 대담"; line = "겉으론 차분하고 예의 바른데, 가까워지면 확 달라지는 반전형이에요. 아는 사람만 아는 매력."; }
  else if (expr >= 3 && hold >= 3) { key = "낮이밤이"; title = "늘 주도하는 타입"; line = "낮이든 밤이든 관계를 리드해요. 에너지가 세서 상대가 끌려오는 편이에요."; }
  else { key = "낮져밤져"; title = "은근·슬로우 스며듦"; line = "천천히 스며드는 타입. 편해지기까지 시간이 걸리지만, 한번 열면 깊고 오래가요."; }
  return { key, title, line, expr, hold };
}

/** 바람기 지수 — 재미용(도덕 판단 아님). 도화·홍염·편재/편관·상관·비겁 과다로 본 '끼'와 '자유분방함' */
export function cheatIndex(profile, gender) {
  const { group, each } = godTally(profile);
  const charm = charmSpirits(profile);
  let s = 24;
  if (charm.dohwa) s += 18;
  if (charm.hongyeom) s += 14;
  s += (each.편재 || 0) * 6 + (each.편관 || 0) * 6; // 다양한 이성 인연 기운
  s += (each.상관 || 0) * 5;                        // 자유분방·구속 싫어함
  s += clamp(group.비겁 - 2, 0, 3) * 4;             // 비겁 과다 = 분산·경쟁
  s -= (each.정관 || 0) * 5 + (each.정재 || 0) * 5;  // 정도·안정 지향
  s = clamp(Math.round(s), 3, 96);
  const tier = s >= 68 ? "높음" : s >= 42 ? "보통" : "낮음";
  const line = s >= 68
    ? "타고난 매력과 자유로운 기질이 커요. 인기가 많은 만큼 유혹도 많아, 관계에선 선을 지키려는 의지가 중요해요."
    : s >= 42
      ? "상황에 따라 흔들릴 여지는 있지만, 대체로 균형을 지키는 편이에요. 마음이 식었을 때가 진짜 고비예요."
      : "한 사람에게 정착하는 안정형이에요. 한눈팔기보다 깊게 오래 가는 걸 편안해해요.";
  return { score: s, tier, line };
}

/** 연애할 사람(끌리는 상대) 초상 — 배우자성 오행 + 도화 기운 */
export function datePortrait(profile, gender) {
  const dayElem = STEM_ELEM[profile.pillars.day.stemIdx];
  const attractElem = gender === "male" ? CTRL[dayElem] : CTRL_BY[dayElem];
  const look = ELEM_LOOK[attractElem];
  return {
    title: "연애할 사람 (끌리는 상대)",
    summary: `${look.face} 얼굴에 ${look.vibe} 분위기의 사람에게 자꾸 눈이 가요. 연애 상대로는 ${look.build} 사람과 자주 엮이는 편이에요.`,
    traits: [`${look.vibe} 매력에 약함`, `${look.build} 스타일에 끌림`],
    palette: { face: look.color, accent: ELEM_LOOK[OUTPUT[dayElem]].color },
    elem: attractElem, hairElem: rotElem(attractElem, 1), mood: "date", seed: seedOf(profile, "date"), sex: gender === "male" ? "female" : "male",
    elemKr: ELEM_KR[attractElem],
  };
}

/** 만나면 안 될 사람(나를 소모시키는 상대) 초상 — 기신 오행 */
export function avoidPortrait(profile, gender) {
  const s = analyzeStrength(profile);
  const dayElem = s.dayElem;
  // 신강이면 나를 더 부추기는 인성, 신약이면 나를 짓누르는 관성이 소모의 축
  const avoidElem = s.strength === "신강" ? RESOURCE[dayElem] : CTRL_BY[dayElem];
  const look = ELEM_LOOK[avoidElem];
  const why = s.strength === "신강"
    ? "이미 강한 나를 더 부추겨, 함께 있으면 고집·과열로 치닫기 쉬운 결이에요."
    : "안 그래도 여린 나를 은근히 짓눌러, 함께 있으면 기가 빨리고 눈치 보게 되는 결이에요.";
  return {
    title: "만나면 안 될 사람 (조심)",
    summary: `${look.face} 얼굴, ${look.vibe} 매력에 처음엔 끌리기 쉬워요. 하지만 ${ELEM_KR[avoidElem]} 기운이 강한 사람은 ${why}`,
    traits: [`${look.vibe} 매력에 홀리기 쉬움`, "처음엔 좋지만 갈수록 소모됨"],
    palette: { face: look.color, accent: "#9a8590" },
    elem: avoidElem, hairElem: rotElem(avoidElem, 3), mood: "avoid", seed: seedOf(profile, "avoid"), sex: gender === "male" ? "female" : "male",
    elemKr: ELEM_KR[avoidElem], warn: true,
  };
}

/* ---------- 초상화 SVG ----------
   오행별 얼굴형·눈매·눈썹·입·헤어스타일을 달리 그려, 결과마다 다른 인상이 보이게 한다.
   (사주로 상상한 일러스트일 뿐 실제 인물이 아님) */
function seedOf(profile, kind) {
  const P = profile.pillars; const key = [P.year, P.month, P.day, P.hour].filter(Boolean).map((x) => x.gz).join("") + kind;
  let h = 2166136261 >>> 0; for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0;
}
const ELEM_ORDER = ["wood", "fire", "earth", "metal", "water"];
function rotElem(e, n) { return ELEM_ORDER[(ELEM_ORDER.indexOf(e) + n) % 5]; }
const HAIR_COLORS = ["#1b1716", "#2f2220", "#4a3326", "#6a4a36", "#3a2a2a", "#5c2f25", "#231d24"];
const SKINS = [["#f8e3d4", "#e6bfa5"], ["#f3d6c2", "#dfb192"], ["#ecc9ad", "#d29f7d"], ["#e0b594", "#c38b67"], ["#f6dccb", "#e4b69b"]];
const HAIR_COLOR = { wood: "#3b2a1e", fire: "#6a2c1c", earth: "#4a3526", metal: "#1c1c22", water: "#22283a" };
const ELEM_HANJA = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
const FACE = {
  earth: `<ellipse cx="100" cy="95" rx="38" ry="40"/>`,
  wood: `<ellipse cx="100" cy="95" rx="32" ry="44"/>`,
  water: `<ellipse cx="100" cy="95" rx="35" ry="42"/>`,
  fire: `<path d="M65 84 Q65 53 100 53 Q135 53 135 84 Q135 114 100 137 Q65 114 65 84Z"/>`,
  metal: `<path d="M66 80 Q66 53 100 53 Q134 53 134 80 L132 104 Q126 127 100 137 Q74 127 68 104Z"/>`,
};
const HAIR = {
  female: {
    wood: { back: "M57 82 Q57 42 100 42 Q143 42 143 82 L147 196 L53 196Z", front: "M60 86 Q61 45 100 45 Q139 45 140 86 Q127 63 98 61 Q78 63 60 86Z" },
    fire: { back: "M50 86 Q46 38 100 38 Q154 38 150 86 Q162 110 151 132 Q162 154 146 176 L54 176 Q38 154 49 132 Q38 110 50 86Z", front: "M61 88 Q58 46 100 46 Q142 46 139 88 Q131 66 113 61 Q96 75 76 69 Q66 76 61 88Z" },
    earth: { back: "M57 92 Q55 45 100 45 Q145 45 143 92 L145 126 Q131 132 120 124 L80 124 Q69 132 55 126Z", front: "M61 86 Q59 47 100 47 Q141 47 139 86 Q121 73 100 75 Q79 73 61 86Z" },
    metal: { back: "M59 90 Q57 45 100 45 Q143 45 141 90 L141 120 L127 120 L127 102 L73 102 L73 120 L59 120Z", front: "M61 88 Q61 47 104 47 Q141 49 139 88 Q129 61 95 63 Q75 69 61 88Z" },
    water: { back: "M56 84 Q56 42 100 42 Q144 42 144 84 Q150 120 142 150 Q152 176 140 200 L60 200 Q48 176 58 150 Q50 120 56 84Z", front: "M60 90 Q60 45 100 45 Q140 45 140 90 Q134 66 116 60 Q104 70 86 64 Q66 70 60 90Z" },
    pony: { back: "M128 66 Q162 86 152 150 Q146 176 132 160 Q146 116 124 82Z", front: "M62 92 Q60 46 100 44 Q140 46 138 92 Q134 60 100 56 Q66 60 62 92Z" },
    pixie: { back: "", front: "M61 94 Q57 45 100 41 Q145 45 139 94 Q137 66 118 60 Q100 74 80 64 Q66 72 61 94Z" },
    layer: { back: "M56 88 Q54 42 100 42 Q146 42 144 88 L152 152 Q132 140 120 152 L80 152 Q68 140 48 152Z", front: "M60 90 Q60 45 100 45 Q140 45 140 90 Q128 60 104 60 Q108 72 96 76 Q88 64 60 90Z" },
  },
  male: {
    wood: { back: "", front: "M63 86 Q61 45 100 43 Q141 45 137 84 Q133 63 118 59 Q96 66 72 63 Q65 72 63 86Z" },
    fire: { back: "", front: "M63 86 Q59 52 84 44 Q98 34 118 40 Q142 46 137 86 Q132 64 116 58 Q104 66 88 60 Q70 64 63 86Z" },
    earth: { back: "", front: "M63 84 Q61 47 100 47 Q139 47 137 84 Q127 63 100 63 Q73 63 63 84Z" },
    metal: { back: "", front: "M65 82 L65 60 Q71 43 104 43 Q137 45 135 66 L135 82 Q129 59 100 59 Q77 59 65 82Z" },
    water: { back: "M59 94 Q57 45 100 45 Q143 45 141 94 L137 106 L63 106Z", front: "M61 90 Q59 47 100 47 Q141 47 139 90 Q131 70 111 70 Q97 79 85 70 Q70 74 61 90Z" },
    twoblock: { back: "", front: "M62 88 Q60 46 100 44 Q140 46 138 88 Q134 72 128 70 Q110 78 86 70 Q70 72 62 88Z" },
    buzz: { back: "", front: "M64 80 Q62 50 100 48 Q138 50 136 80 Q120 62 100 62 Q80 62 64 80Z" },
    longwave: { back: "M58 96 Q54 44 100 44 Q146 44 142 96 Q148 122 138 136 L62 136 Q52 122 58 96Z", front: "M60 92 Q58 48 100 46 Q142 48 140 92 Q132 64 110 62 Q98 74 86 66 Q66 70 60 92Z" },
  },
};
/* ---------- 반실사 초상 ----------
   실제 얼굴 비율(눈 위치·코·입술·음영)로 그린 일러스트. 오행별로 얼굴형·눈매·코·입술이 다르다. */
const FACE_P = { // w: 광대 폭, jaw: 턱선 폭, chin: 턱 끝 y, cw: 턱 끝 폭
  wood: { w: 31, jaw: 25, chin: 158, cw: 9 },
  fire: { w: 34, jaw: 20, chin: 152, cw: 5 },
  earth: { w: 37, jaw: 33, chin: 150, cw: 14 },
  metal: { w: 35, jaw: 33, chin: 153, cw: 12 },
  water: { w: 33, jaw: 25, chin: 154, cw: 9 },
};
const EYE_P = { // w 반폭, h 높이, t 눈꼬리(음수=올라감), crease 쌍꺼풀
  wood: { w: 8.5, h: 5.2, t: 0, crease: true },
  fire: { w: 9, h: 6.6, t: -1, crease: true },
  earth: { w: 8.2, h: 5.4, t: 1.2, crease: true },
  metal: { w: 9.2, h: 4, t: -2.6, crease: false },
  water: { w: 8.6, h: 4.6, t: 1.6, crease: false },
};
const LIP_P = { wood: { w: 11, u: 3.2, l: 4.5 }, fire: { w: 12, u: 4, l: 6 }, earth: { w: 13, u: 3.2, l: 5 }, metal: { w: 11.5, u: 2.4, l: 3.6 }, water: { w: 10, u: 3.6, l: 5.4 } };
const NOSE_W = { wood: 7, fire: 7.5, earth: 9, metal: 7, water: 7.5 };

function facePath(f, male) {
  const w = f.w + (male ? 2 : 0), jaw = f.jaw + (male ? 4 : 0), cw = f.cw + (male ? 2 : 0), top = 44, cy = 102, ch = f.chin + (male ? 2 : 0);
  return `M100 ${top} C${100 + w * 0.95} ${top} ${100 + w} ${top + 24} ${100 + w} ${cy} C${100 + w} ${cy + 22} ${100 + jaw} ${ch - 16} ${100 + cw} ${ch - 3} Q100 ${ch + 2} ${100 - cw} ${ch - 3} C${100 - jaw} ${ch - 16} ${100 - w} ${cy + 22} ${100 - w} ${cy} C${100 - w} ${top + 24} ${100 - w * 0.95} ${top} 100 ${top}Z`;
}
function eyeSvg(x, e, side, uid, male, iris) {
  const y = 104, w = e.w, h = e.h, t = e.t * side; // side: -1 왼쪽, 1 오른쪽 (눈꼬리는 바깥쪽)
  const inX = x - w * side, outX = x + w * side;
  const outY = y + t;
  const shape = `M${inX} ${y} Q${x} ${y - h * 1.25} ${outX} ${outY} Q${x} ${y + h * 0.8} ${inX} ${y}Z`;
  const id = `${uid}e${side}`;
  const r = Math.min(h * 0.95, 4.6);
  return `<clipPath id="${id}"><path d="${shape}"/></clipPath>
    <path d="${shape}" fill="#f7f1ec"/>
    <g clip-path="url(#${id})"><circle cx="${x + side * 0.4}" cy="${y - 0.3}" r="${r}" fill="${iris}"/><circle cx="${x + side * 0.4}" cy="${y - 0.3}" r="${r * 0.48}" fill="#140e0c"/><circle cx="${x + side * 0.4 + 1.3}" cy="${y - 1.6}" r="1.1" fill="#fff" opacity=".9"/>
      <path d="M${inX} ${y - h} L${outX} ${outY - h} L${outX} ${outY - h * 0.2} Q${x} ${y - h * 0.9} ${inX} ${y - h * 0.1}Z" fill="#6b4a3c" opacity=".18"/></g>
    <path d="M${inX} ${y} Q${x} ${y - h * 1.25} ${outX} ${outY}" stroke="#2a1d19" stroke-width="${male ? 1.5 : 1.9}" fill="none" stroke-linecap="round"/>
    ${male ? "" : `<path d="M${outX - side * 1} ${outY - 0.6} l${side * 2.6} -1.8" stroke="#2a1d19" stroke-width="1.2" stroke-linecap="round"/>`}
    <path d="M${inX + side * 2} ${y + 1.2} Q${x} ${y + h * 0.95} ${outX - side * 1} ${outY + 0.8}" stroke="#a9745f" stroke-width=".8" fill="none" opacity=".7"/>
    ${e.crease ? `<path d="M${inX + side * 2} ${y - h * 0.9} Q${x} ${y - h * 1.95} ${outX} ${outY - h * 0.55}" stroke="#b07f6a" stroke-width=".9" fill="none" opacity=".8"/>` : ""}`;
}
function browSvg(x, elem, side, hair, male, mood, th0, lift = 0) {
  const y = 90 - (elem === "fire" ? 1.5 : 0) - lift * 0.5;
  const inX = x - 10 * side, outX = x + 10 * side;
  let peakY = -lift + { wood: y - 3.5, fire: y - 5, earth: y - 1.5, metal: y - 4, water: y - 2 }[elem];
  let outY = { wood: y + 0.5, fire: y + 1, earth: y + 1.5, metal: y + 0.5, water: y + 2 }[elem];
  if (mood === "avoid" && side === 1) { peakY -= 3; outY -= 2; }
  const th = th0 || (male ? 3.2 : 2.3);
  return `<path d="M${inX} ${y + 1} Q${x + side * 1} ${peakY - th / 2} ${outX} ${outY} Q${x + side * 1} ${peakY + th / 2} ${inX} ${y + 1 + th}Z" fill="${hair}" opacity=".92"/>`;
}
function noseSvg(n, shade) {
  const nw = n.w, dy = n.y - 124;
  return `<g transform="translate(0 ${dy})"><path d="M96 ${100 - dy} Q94.5 114 93 121" stroke="${shade}" stroke-width="1.4" fill="none" opacity=".55" stroke-linecap="round"/>
    <path d="M${100 - nw} 124 Q${100 - nw - 1.5} 129 ${100 - nw * 0.45} 129.5 Q100 131 ${100 + nw * 0.45} 129.5 Q${100 + nw + 1.5} 129 ${100 + nw} 124" stroke="${shade}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <ellipse cx="${100 - nw * 0.45}" cy="128.3" rx="1.6" ry="0.9" fill="#8a5a4a" opacity=".55"/><ellipse cx="${100 + nw * 0.45}" cy="128.3" rx="1.6" ry="0.9" fill="#8a5a4a" opacity=".55"/>
    <ellipse cx="100" cy="124" rx="2.6" ry="2" fill="#fff" opacity=".22"/></g>`;
}
function lipsSvg(L, male, mood) {
  const y = 140, w = L.w - (male ? 1 : 0);
  const up = male ? "#b77a6c" : "#c9646b", lo = male ? "#c98c7e" : "#d8787c";
  let lc = 0, rc = 0; // 입꼬리
  if (mood === "date") { lc = -2; rc = -2; }
  if (mood === "avoid") { lc = 0.5; rc = -2.6; }
  return `<path d="M${100 - w} ${y + lc} Q${100 - w * 0.45} ${y - L.u - 0.5} ${100 - 1.5} ${y - L.u + 1} Q100 ${y - L.u + 1.8} ${100 + 1.5} ${y - L.u + 1} Q${100 + w * 0.45} ${y - L.u - 0.5} ${100 + w} ${y + rc} Q100 ${y + 1} ${100 - w} ${y + lc}Z" fill="${up}"/>
    <path d="M${100 - w} ${y + lc} Q100 ${y + 1} ${100 + w} ${y + rc} Q${100 + w * 0.5} ${y + L.l} 100 ${y + L.l + 0.6} Q${100 - w * 0.5} ${y + L.l} ${100 - w} ${y + lc}Z" fill="${lo}"/>
    <path d="M${100 - w} ${y + lc} Q100 ${y + 1.4} ${100 + w} ${y + rc}" stroke="#7a3b38" stroke-width="1" fill="none" opacity=".75"/>
    <ellipse cx="100" cy="${y + L.l * 0.55}" rx="${w * 0.35}" ry="1" fill="#fff" opacity=".25"/>`;
}
const IRIS = { wood: "#4a3325", fire: "#5a3620", earth: "#4d3a2a", metal: "#2e2724", water: "#3a2f2c" };

function drawPortraitSvg(p, H = 240) {
  const elem = p.elem || "earth";
  const male = p.sex === "male";
  const sex = male ? "male" : "female";
  const mood = p.mood || "date";
  const uid = "pt" + Math.random().toString(36).slice(2, 8);
  // 시드 — 같은 사람·같은 초상은 늘 같은 얼굴, 다른 초상은 다른 얼굴
  let sd = (p.seed != null ? p.seed : Math.floor(Math.random() * 1e9)) >>> 0;
  const rnd = () => { sd = (Math.imul(sd ^ (sd >>> 15), 2246822519) + 0x9e3779b9) >>> 0; return (sd % 10000) / 10000; };
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const vary = (v, d) => v + (rnd() * 2 - 1) * d;

  const styles = Object.keys(HAIR[sex]);
  const baseIdx = styles.indexOf(p.hairElem || elem);
  const hs = HAIR[sex][styles[(baseIdx + Math.floor(rnd() * 3) * 2) % styles.length]];
  const hair = pick(HAIR_COLORS);
  const [skinL, skinD] = pick(SKINS);
  const cloth = mood === "avoid" ? "#3f3746" : p.palette.face, bg = p.palette.accent;
  const F0 = FACE_P[elem];
  const f = { w: vary(F0.w, 3), jaw: vary(F0.jaw, 4), chin: vary(F0.chin, 5), cw: Math.max(3, vary(F0.cw, 3)) };
  const E0 = EYE_P[elem], es = vary(1, 0.16);
  const e = { w: E0.w * es, h: E0.h * vary(es, 0.12), t: vary(E0.t, 1.2), crease: rnd() < (E0.crease ? 0.8 : 0.3) };
  const eyeGap = vary(18, 2.2);
  const browTh = (male ? 3.2 : 2.2) * vary(1, 0.3);
  const browLift = vary(0, 2.2);
  const nose = { w: NOSE_W[elem] * vary(1, 0.18), y: vary(124, 3) };
  const lip = { ...LIP_P[elem], w: LIP_P[elem].w * vary(1, 0.14), u: LIP_P[elem].u * vary(1, 0.25), l: LIP_P[elem].l * vary(1, 0.25) };
  const iris = pick(["#4a3325", "#5a3620", "#3a2f2c", "#2e2724", "#6a4a2c"]);
  const stubble = male && rnd() < 0.35;
  const shade = "#c08a70";
  const face = facePath(f, male);
  const hairT = `translate(100 100) scale(1.1 1.17) translate(-100 -95)`;
  const earX = f.w + (male ? 2 : 0);
  const shoulders = male ? `M30 ${H} Q34 192 76 181 L100 188 L124 181 Q166 192 170 ${H}Z` : `M38 ${H} Q42 194 80 183 Q100 196 120 183 Q158 194 162 ${H}Z`;
  return `<svg viewBox="0 0 200 ${H}" width="100%" height="${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="사주로 그려 본 ${p.elemKr || ""} 기운의 ${male ? "남성" : "여성"} 초상 일러스트">
    <defs>
      <linearGradient id="${uid}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg}" stop-opacity=".5"/><stop offset="1" stop-color="#1c1620" stop-opacity=".6"/></linearGradient>
      <radialGradient id="${uid}s" cx=".45" cy=".42" r=".65"><stop offset="0" stop-color="${skinL}"/><stop offset=".7" stop-color="#efcbb3"/><stop offset="1" stop-color="${skinD}"/></radialGradient>
      <linearGradient id="${uid}h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hair}"/><stop offset=".45" stop-color="${hair}" stop-opacity=".82"/><stop offset="1" stop-color="#0d0a0a"/></linearGradient>
      <linearGradient id="${uid}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${cloth}"/><stop offset="1" stop-color="#1a151c" stop-opacity=".85"/></linearGradient>
      <clipPath id="${uid}r"><rect width="200" height="${H}" rx="18"/></clipPath>
    </defs>
    <g clip-path="url(#${uid}r)">
      <rect width="200" height="${H}" fill="url(#${uid}b)"/>
      ${hs.back ? `<path d="${hs.back}" fill="url(#${uid}h)" transform="${hairT}"/>` : ""}
      <path d="${shoulders}" fill="url(#${uid}c)"/>
      <path d="M86 140 L86 178 Q100 192 114 178 L114 140Z" fill="${skinD}"/>
      <path d="M86 150 Q100 166 114 150 L114 160 Q100 172 86 160Z" fill="#b98468" opacity=".45"/>
      ${male ? `<path d="M80 181 L100 204 L93 186Z M120 181 L100 204 L107 186Z" fill="#f2efe9"/>` : `<path d="M82 182 Q100 200 118 182" stroke="${cloth}" stroke-width="3" fill="none"/>`}
      <ellipse cx="${100 - earX}" cy="110" rx="5.5" ry="10" fill="${skinD}"/><ellipse cx="${100 + earX}" cy="110" rx="5.5" ry="10" fill="${skinD}"/>
      <path d="${face}" fill="url(#${uid}s)"/>
      <path d="${face}" fill="none" stroke="#c48c70" stroke-width=".8" opacity=".5"/>
      <ellipse cx="${100 - f.w * 0.62}" cy="124" rx="9" ry="6" fill="${male ? "#d9967e" : "#ef9a93"}" opacity="${male ? ".12" : ".28"}"/>
      <ellipse cx="${100 + f.w * 0.62}" cy="124" rx="9" ry="6" fill="${male ? "#d9967e" : "#ef9a93"}" opacity="${male ? ".12" : ".28"}"/>
      <path d="M${100 - f.w + 3} 112 Q${100 - f.jaw + 4} 140 ${100 - f.cw} ${f.chin - 4}" stroke="#c28a6e" stroke-width="5" fill="none" opacity=".18"/>
      <path d="M${100 + f.w - 3} 112 Q${100 + f.jaw - 4} 140 ${100 + f.cw} ${f.chin - 4}" stroke="#c28a6e" stroke-width="5" fill="none" opacity=".18"/>
      ${browSvg(100 - eyeGap, elem, -1, hair, male, mood, browTh, browLift)}${browSvg(100 + eyeGap, elem, 1, hair, male, mood, browTh, browLift)}
      ${eyeSvg(100 - eyeGap, e, -1, uid, male, iris)}${eyeSvg(100 + eyeGap, e, 1, uid, male, iris)}
      ${noseSvg(nose, shade)}
      ${lipsSvg(lip, male, mood)}${stubble ? `<path d="M${100 - f.jaw + 2} 128 Q${100 - f.jaw + 4} ${f.chin - 6} 100 ${f.chin + 1} Q${100 + f.jaw - 4} ${f.chin - 6} ${100 + f.jaw - 2} 128 Q100 150 ${100 - f.jaw + 2} 128Z" fill="#5a4a44" opacity=".13"/>` : ""}
      <path d="${hs.front}" fill="url(#${uid}h)" transform="${hairT}"/>
      <circle cx="26" cy="26" r="15" fill="rgba(0,0,0,.32)"/>
      <text x="26" y="31.5" text-anchor="middle" font-size="16" font-weight="700" fill="#fff" font-family="serif">${ELEM_HANJA[elem]}</text>
    </g>
  </svg>`;
}

/* 실사 얼굴 이미지 — 성별마다 이미지 시트 한 장 (파일 수 줄이기)
   assets/img/face-female.webp · male.webp : 5열(목·화·토·금·수) × 3행(1=연애할 사람, 2=결혼할 배우자, 3=만나면 안 될 사람)
   FACE_HAVE 에 있는 칸만 사진으로 쓰고, 없으면 일러스트로 대신한다. (사진 추가 시 이 목록도 같이 갱신) */
const FACE_COLS = ["wood", "fire", "earth", "metal", "water"];
const FACE_HAVE = {
  female: ["wood-1", "wood-2", "wood-3", "fire-1", "fire-2", "fire-3", "earth-1", "earth-2", "earth-3", "metal-1", "metal-2", "metal-3", "water-1", "water-2", "water-3"],
  male: ["wood-1", "wood-2", "wood-3", "fire-1", "fire-2", "fire-3", "earth-1", "earth-2", "earth-3", "metal-1", "metal-2", "metal-3", "water-1", "water-2", "water-3"],
};
const MOOD_IDX = { date: 1, spouse: 2, avoid: 3 };
export function portraitSvg(p, H = 240) {
  const sex = p.sex === "male" ? "male" : "female";
  const elem = p.elem || "earth";
  let row = MOOD_IDX[p.mood] || 1;
  const have = FACE_HAVE[sex] || [];
  if (!have.includes(`${elem}-${row}`)) row = have.includes(`${elem}-1`) ? 1 : 0;
  if (!row) return drawPortraitSvg(p, H);
  const col = FACE_COLS.indexOf(elem);
  const bg = `background-image:url('assets/img/face-${sex}.webp');background-repeat:no-repeat;background-size:500% 300%;background-position:${col * 25}% ${(row - 1) * 50}%;`;
  return `<div class="pt-wrap" role="img" aria-label="사주로 그려 본 ${p.elemKr || ""} 기운의 인상 이미지 (AI로 만든 가상 인물)" style="width:100%; max-width:${Math.round(H * 300 / 350)}px; margin:0 auto; aspect-ratio:300/350; border-radius:18px; ${bg}"></div>`;
}

/* =========================================================
   사주로 보는 내 인생의 운명적인 세 사람 — 작성: HAE
   ① 귀인: 천을귀인(天乙貴人) 띠 + 용신(用神) 기운
   ② 인생의 반쪽: 배우자궁(일지) + 배우자성(남: 재성 / 여: 관성) + 일지와 육합(六合)하는 띠
   ③ 나를 단련시키는 사람(스승·라이벌): 관성(官星, 나를 극하는 기운)
   만나는 해: 앞으로 12년의 세운(歲運) 중 그 사람의 기운·띠가 들어오는 해
   ========================================================= */
const ANIMAL12 = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];
const STEM_H10 = ["甲(갑)", "乙(을)", "丙(병)", "丁(정)", "戊(무)", "己(기)", "庚(경)", "辛(신)", "壬(임)", "癸(계)"];
const BRANCH_K = ["子(자)", "丑(축)", "寅(인)", "卯(묘)", "辰(진)", "巳(사)", "午(오)", "未(미)", "申(신)", "酉(유)", "戌(술)", "亥(해)"];
const CHEONEUL_B = { 0: [1, 7], 4: [1, 7], 6: [1, 7], 1: [0, 8], 5: [0, 8], 2: [11, 9], 3: [11, 9], 7: [2, 6], 8: [5, 3], 9: [5, 3] };
const YUKHAP = [1, 0, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2]; // 子丑 寅亥 卯戌 辰酉 巳申 午未
const SAMHAP = [[8, 0, 4], [11, 3, 7], [2, 6, 10], [5, 9, 1]];
const FATE_WHERE = {
  wood: "학교·스터디·서점·공원처럼 배우고 자라는 곳",
  fire: "행사·공연·SNS·발표 자리처럼 밝고 사람 많은 곳",
  earth: "동네·지인 소개·맛집·가족 모임처럼 편안한 곳",
  metal: "직장·운동·병원·관공서처럼 규칙이 있는 곳",
  water: "여행지·카페·밤 모임·온라인처럼 흐르는 곳",
};
const FATE_GIFT = {
  benefactor: { wood: "새로 배울 길을 열어 주고 성장시켜 줘요", fire: "나를 앞에 세워 주고 이름을 알려 줘요", earth: "흔들릴 때 기댈 자리와 안정을 줘요", metal: "결정적인 순간에 확실한 판단과 연결을 줘요", water: "필요한 정보와 지혜, 사람을 이어 줘요" },
  soul: { wood: "함께 자라며 서로의 꿈을 응원해요", fire: "삶을 밝고 따뜻하게 데워 줘요", earth: "든든한 울타리가 되어 줘요", metal: "흐트러진 생활을 단정하게 잡아 줘요", water: "말하지 않아도 마음을 알아줘요" },
  teacher: { wood: "느슨해진 나를 다시 뛰게 만들어요", fire: "열정에 불을 붙이지만 속도를 시험해요", earth: "현실을 똑바로 보게 만들어요", metal: "엄격한 기준으로 나를 깎고 다듬어요", water: "생각을 깊게 하게 만들고 허점을 짚어요" },
};
const FATE_SIGN = {
  benefactor: ["처음 봤는데 이상하게 믿음이 가요.", "부탁하지 않았는데 먼저 도와주겠다고 해요.", "만난 뒤로 막혔던 일이 하나씩 풀려요."],
  soul: ["같이 있으면 말이 끊겨도 어색하지 않아요.", "싸워도 금방 다시 보고 싶어져요.", "이 사람 앞에선 꾸미지 않은 내가 나와요."],
  teacher: ["처음엔 불편하거나 부딪혀요.", "이 사람 말이 며칠씩 머리에 남아요.", "지나고 보면 그때 가장 많이 컸다는 걸 알게 돼요."],
};
function yearGZ(Y) { return { s: mod(Y - 4, 10), b: mod(Y - 4, 12) }; }
function fateYears(test, from, n = 12, take = 3) {
  const out = []; for (let Y = from; Y < from + n && out.length < take; Y++) { const g = yearGZ(Y); if (test(g)) out.push(Y); } return out;
}
/** 이미 지나간 해 중 인연이 닿았을 해 (13세 이후 · 최근 것부터 최대 take개, 오름차순) */
function fatePast(test, birthY, Y, take = 2) {
  const out = []; if (!birthY) return out;
  for (let y = Y - 1; y >= Math.max(birthY + 12, Y - 15) && out.length < take; y--) if (test(yearGZ(y))) out.unshift(y);
  return out;
}
export function fatePeople(profile, gender, thisYear, birthYear) {
  const S = analyzeStrength(profile);
  const dStem = profile.pillars.day.stemIdx, dBranch = profile.pillars.day.branchIdx;
  const dElem = STEM_ELEM[dStem];
  const seed = seedOf(profile, "fate3");
  const anySex = (k) => ((seed >> k) & 1 ? "male" : "female");
  const animals = (bs) => bs.map((b) => `${ANIMAL12[b]}띠`).join("·");
  const stemsOf = (e) => STEM_H10.filter((_, i) => STEM_ELEM[i] === e).join("·");
  const Y = thisYear || new Date().getFullYear();
  const bY = birthYear || (profile.solar && profile.solar.year) || 0;
  const person = (key, title, elem, sex, mood, bs, years, extra, test) => {
    const L = ELEM_LOOK[elem];
    return {
      key, title, elem, elemKr: ELEM_KR[elem], sex,
      animals: animals(bs), stems: stemsOf(elem),
      look: `${L.face} 얼굴 · ${L.build}`, vibe: `${L.vibe} 사람`,
      where: FATE_WHERE[elem], gift: FATE_GIFT[key][elem], signs: FATE_SIGN[key],
      years, past: test ? fatePast(test, bY, Y) : [], ...extra,
      portrait: { elem, hairElem: rotElem(elem, key === "soul" ? 1 : 2), mood, seed: seed + key.length * 7, sex, elemKr: ELEM_KR[elem], palette: { face: L.color, accent: ELEM_LOOK[rotElem(elem, 1)].color } },
    };
  };
  // ① 귀인
  const gElem = S.yongsin[0];
  const gBranches = CHEONEUL_B[dStem] || [];
  const gYears = fateYears((g) => gBranches.includes(g.b) || STEM_ELEM[g.s] === gElem && gBranches.length === 0, Y);
  const benefactor = person("benefactor", "나를 끌어올려 줄 귀인", gElem, anySex(1), "date", gBranches, gYears.length ? gYears : fateYears((g) => STEM_ELEM[g.s] === gElem, Y),
    { why: `일간 ${STEM_H10[dStem]}의 천을귀인(天乙貴人)은 ${gBranches.map((b) => BRANCH_K[b]).join("·")} — 이 띠의 사람이, 내 사주에 꼭 필요한 용신 ${ELEM_KR[gElem]} 기운을 가지고 나타나요.` },
    (g) => gBranches.includes(g.b) || (gBranches.length === 0 && STEM_ELEM[g.s] === gElem));
  // ② 인생의 반쪽
  const spElem = gender === "male" ? CTRL[dElem] : CTRL_BY[dElem];
  const hap = YUKHAP[dBranch];
  const sam = (SAMHAP.find((g) => g.includes(dBranch)) || []).filter((b) => b !== dBranch);
  const soulB = [hap, ...sam];
  const soulYears = fateYears((g) => g.b === hap || (STEM_ELEM[g.s] === spElem && sam.includes(g.b)) || (STEM_ELEM[g.s] === spElem && g.b === hap), Y);
  const soul = person("soul", "인생의 반쪽", spElem, gender === "male" ? "female" : "male", "spouse", soulB, soulYears.length ? soulYears : fateYears((g) => STEM_ELEM[g.s] === spElem, Y),
    { why: `배우자궁(일지 ${BRANCH_K[dBranch]})과 육합(六合)하는 ${ANIMAL12[hap]}띠, 삼합(三合)하는 ${sam.map((b) => ANIMAL12[b] + "띠").join("·")} — 그리고 ${gender === "male" ? "재성(財星)" : "관성(官星)"}인 ${ELEM_KR[spElem]} 기운의 사람이 반쪽 자리에 앉아요.` },
    (g) => g.b === hap || (STEM_ELEM[g.s] === spElem && sam.includes(g.b)) || (STEM_ELEM[g.s] === spElem && soulYears.length === 0));
  // ③ 나를 단련시키는 사람 — 관성(엄한 스승)이 기본, 반쪽·귀인과 같은 기운이면 비겁(라이벌)·식상(자극을 주는 동료)으로
  const chung = mod(dBranch + 6, 12);
  const cand = [[CTRL_BY[dElem], "관성(官星) — 나를 극(剋)해 단련시키는 엄한 스승"], [dElem, "비겁(比劫) — 나와 같은 기운의 라이벌"], [OUTPUT[dElem], "식상(食傷) — 내 재능을 끌어내는 자극적인 동료"]];
  const [tElem, tWhy] = cand.find(([e]) => e !== spElem && e !== gElem) || cand[1];
  const tBranches = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].filter((b) => BRANCH_ELEM[b] === tElem).slice(0, 2).concat([chung]);
  const teacher = person("teacher", "나를 단련시키는 사람 (스승·라이벌)", tElem, anySex(3), "avoid", [...new Set(tBranches)], fateYears((g) => STEM_ELEM[g.s] === tElem || g.b === chung, Y),
    { why: `${tWhy}인 ${ELEM_KR[tElem]} 기운, 그리고 일지와 충(沖)하는 ${ANIMAL12[chung]}띠 — 처음엔 부딪히지만 나를 가장 크게 키워 주는 사람이에요.` },
    (g) => STEM_ELEM[g.s] === tElem || g.b === chung);
  return [benefactor, soul, teacher];
}
