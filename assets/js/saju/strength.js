/* =========================================================
   신강/신약 · 용신 · 조후 — 억부(抑扶)·조후 간이 판정.
   ⚠️ 실제 명리의 신강신약·용신은 격국·통근·투간·회합까지 종합해야 정밀하다.
   여기서는 오행 분포·월령·억부를 이용한 '간이 판정(참고용)'이다.
   ========================================================= */

const GEN = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };      // 아생(식상)
const CTRL = { wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" };     // 아극(재성)
const RESOURCE = { wood: "water", fire: "wood", earth: "fire", metal: "earth", water: "metal" }; // 생아(인성)
const CTRL_BY = { wood: "metal", fire: "water", earth: "wood", metal: "fire", water: "earth" };  // 극아(관성)

const ELEM_KR = { wood: "목(木)", fire: "화(火)", earth: "토(土)", metal: "금(金)", water: "수(水)" };
const ELEM_TRAIT = { wood: "성장·추진", fire: "표현·열정", earth: "안정·중재", metal: "원칙·결단", water: "사고·유연" };
const ELEM_BRANCHES = { wood: [2, 3], fire: [5, 6], earth: [1, 4, 7, 10], metal: [8, 9], water: [11, 0] };
const ANIMAL = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];
// 지지 index(자=0) → 오행
const BRANCH_ELEM = ["water", "earth", "wood", "wood", "earth", "fire", "fire", "earth", "metal", "metal", "earth", "water"];
const animalsOf = (elem) => ELEM_BRANCHES[elem].map((b) => ANIMAL[b] + "띠");

export function analyzeStrength(profile) {
  const dElem = profile.dayMasterElem;
  const counts = profile.elementCounts || {};
  const monthElem = BRANCH_ELEM[profile.pillars.month.branchIdx];

  // 억부: 나를 돕는(인성+비겁) vs 빼가는(식상+재성+관성)
  const support = (counts[dElem] || 0) + (counts[RESOURCE[dElem]] || 0);
  const drain = (counts[GEN[dElem]] || 0) + (counts[CTRL[dElem]] || 0) + (counts[CTRL_BY[dElem]] || 0);

  // 월령(계절) 가중 — 득령이면 크게 강해짐
  const deukryeong = monthElem === dElem || monthElem === RESOURCE[dElem];
  const netSupport = support + (deukryeong ? 2.5 : -2.5);

  // 득지(일지가 나를 돕는가) · 득세(전체 세력이 나를 돕는가) · 지수
  const dayBranchElem = BRANCH_ELEM[profile.pillars.day.branchIdx];
  const deukji = dayBranchElem === dElem || dayBranchElem === RESOURCE[dElem];
  const deukse = support >= drain;
  const score = netSupport - drain; // 대략 -10 ~ +10
  const LEVELS = ["극약", "태약", "신약", "중화신약", "중화신강", "신강", "태강", "극왕"];
  const CUTS = [-7.5, -5, -1.5, 0, 1.5, 5, 7.5];
  let level = CUTS.findIndex((c) => score < c || (c === -1.5 && score <= c) || (c === -5 && score <= c) || (c === -7.5 && score <= c));
  if (level < 0) level = 7;
  // 단계 안에서의 위치(0~1)
  const lo = level === 0 ? -10 : CUTS[level - 1], hi = level === 7 ? 10 : CUTS[level];
  const within = Math.max(0.1, Math.min(0.9, (score - lo) / (hi - lo || 1)));

  let strength;
  if (netSupport >= drain + 1.5) strength = "신강";
  else if (netSupport <= drain - 1.5) strength = "신약";
  else strength = "중화";

  // 용신(억부)
  let yongsin, yongsinDesc;
  if (strength === "신강") {
    yongsin = [CTRL_BY[dElem], CTRL[dElem]]; // 관성·재성으로 눌러줌
    yongsinDesc = "기운이 강한 편이라, 그 힘을 ‘써서 덜어내는’ 오행이 용신입니다.";
  } else if (strength === "신약") {
    yongsin = [RESOURCE[dElem], dElem]; // 인성·비겁으로 도와줌
    yongsinDesc = "기운이 약한 편이라, 나를 ‘돕고 채워주는’ 오행이 용신입니다.";
  } else {
    yongsin = [RESOURCE[dElem]];
    yongsinDesc = "비교적 균형이 잡혀, 계절 보정(조후)과 흐름에 따라 도움 오행이 달라집니다.";
  }

  // 조후(계절 온도)
  const winter = [11, 0, 1], summer = [5, 6, 7];
  const mb = profile.pillars.month.branchIdx;
  let johu = null;
  if (winter.includes(mb)) johu = { element: "fire", note: "겨울에 태어나 사주가 차가운 편 — 따뜻한 화(火) 기운이 조후로 필요합니다." };
  else if (summer.includes(mb)) johu = { element: "water", note: "여름에 태어나 사주가 뜨거운 편 — 시원한 수(水) 기운이 조후로 필요합니다." };
  else johu = { element: null, note: "봄·가을 태생으로 온도는 비교적 무난합니다." };

  // 최종 도움 오행(용신 + 조후) 정리
  const helpful = Array.from(new Set([...yongsin, ...(johu.element ? [johu.element] : [])]));

  return {
    strength, deukryeong, deukji, deukse, score, level, levelName: LEVELS[level], levels: LEVELS, within, support, drain,
    dayElem: dElem, dayElemKr: ELEM_KR[dElem],
    yongsin, yongsinKr: yongsin.map((e) => ELEM_KR[e]), yongsinDesc,
    yongsinAnimals: yongsin.flatMap(animalsOf),
    johu,
    helpful, helpfulKr: helpful.map((e) => ELEM_KR[e]),
    helpfulAnimals: helpful.flatMap(animalsOf),
    summary: buildSummary(strength, dElem, yongsin, johu),
    apply: buildApply(strength, yongsin, johu),
  };
}

function buildSummary(strength, dElem, yongsin, johu) {
  const s = {
    신강: `일간(${ELEM_KR[dElem]})의 기운이 강한 편이에요. 주체성·추진력이 강점이지만, 넘칠 땐 고집·독주로 흐르기 쉬워요.`,
    신약: `일간(${ELEM_KR[dElem]})의 기운이 약한 편이에요. 섬세하고 협조적이지만, 혼자 밀어붙이면 쉽게 지쳐요. 도움과 환경이 중요합니다.`,
    중화: `일간(${ELEM_KR[dElem]})의 기운이 비교적 균형 잡혀 있어요. 상황 적응력이 좋은 편입니다.`,
  }[strength];
  return `${s} 당신에게 힘이 되는 용신은 ${yongsin.map((e) => ELEM_KR[e]).join("·")}${johu.element ? `, 조후로는 ${ELEM_KR[johu.element]}` : ""} 기운이에요.`;
}

function buildApply(strength, yongsin, johu) {
  const yk = yongsin.map((e) => ELEM_TRAIT[e]).join("·");
  const lines = [];
  lines.push(`용신 오행(${yongsin.map((e) => ELEM_KR[e]).join("·")}, ‘${yk}’의 기운)이 강한 시기·사람·환경에서 일이 잘 풀리는 편이에요.`);
  if (strength === "신강") lines.push("에너지가 넘치니, 혼자 다 하기보다 성과로 ‘써서’ 풀고 사람과 나누면 균형이 잡혀요.");
  if (strength === "신약") lines.push("무리하게 혼자 감당하기보다, 도와줄 사람·안정된 환경을 곁에 두는 게 핵심이에요.");
  if (johu.element) lines.push(johu.note);
  return lines;
}

export { ELEM_KR as STRENGTH_ELEM_KR };

/* ===================================================================
   (합침) methods.js — 파일 수를 줄이려고 이 파일 안으로 옮김 (HAE)
   =================================================================== */
import { majorBgStyle } from "../tarot/cardArt.js";
import { topicMeta } from "./topics.js";
import { computeZiwei, STAR_MEANING } from "./ziwei.js";
import { tojeongYear } from "./tojeong.js";
/* =========================================================
   한 운세 토픽을 4가지 방법으로 — 사주·타로·자미두수·토정비결.
   'saju'는 topics.readTopic이 담당하고, 여기선 나머지 3방법을 생성한다.
   각 방법의 고유 엔진(카드/명반/괘)으로 같은 주제를 다르게 풀어 준다.
   ========================================================= */


/* ---- 공용 ---- */
function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff; return h; }
function timeSeed(id, input) {
  const d = input && input.targetDate ? new Date(input.targetDate) : new Date();
  if (id === "tomorrow" || id === "tomorrowlove") d.setDate(d.getDate() + 1);
  const meta = topicMeta(id);
  let t;
  if (meta && (meta.kind === "daily" || id === "todaylove" || id === "tomorrowlove" || id === "daylove")) t = `${d.getFullYear()}${d.getMonth()}${d.getDate()}`;
  else if (id === "month" || id === "monthlove" || id === "nextmonth") t = `${d.getFullYear()}${d.getMonth()}`;
  else t = `${d.getFullYear()}`;
  return hashStr(`${input.birthDate || ""}_${id}_${t}`);
}
const topicWord = (id) => (topicMeta(id) ? topicMeta(id).name : "운세");

/* ---- 타로 22 메이저 키워드 ---- */
const TAROT = [
  ["바보", "새 시작·모험·순수한 도약", "무모함·준비 부족·즉흥"],
  ["마법사", "실행력·자원 활용·주도", "속임수·산만·재능 낭비"],
  ["여사제", "직관·기다림·숨은 진실", "비밀·혼란·직관 무시"],
  ["여황제", "풍요·애정·돌봄", "과보호·의존·정체"],
  ["황제", "안정·주도권·현실 구조", "고집·통제·경직"],
  ["교황", "배움·조언·전통·계약", "관습에 갇힘·형식주의"],
  ["연인", "인연·선택·조화", "갈등·유혹·엇갈림"],
  ["전차", "추진·의지·전진", "폭주·통제 불능·정체"],
  ["힘", "인내·부드러운 용기", "자신감 부족·조급"],
  ["은둔자", "성찰·홀로서기·탐구", "고립·회피·지연"],
  ["운명의 수레바퀴", "전환점·기회·흐름", "악순환·타이밍 어긋남"],
  ["정의", "균형·공정·결과·책임", "불공정·미룬 결정"],
  ["매달린 사람", "관점 전환·잠시 멈춤", "희생만·정체·집착"],
  ["죽음", "끝과 새로운 시작·변화", "변화 거부·질질 끎"],
  ["절제", "조율·중용·인내", "과함·불균형·조급"],
  ["악마", "집착·유혹·굴레", "해방·끊어냄·직면"],
  ["탑", "급변·충격·해체", "위기 모면·서서히 붕괴"],
  ["별", "희망·회복·영감", "실망·자신감 하락"],
  ["달", "불안·직관·모호함", "혼란 해소·진실 드러남"],
  ["태양", "성취·활력·명확함", "잠깐의 흐림·과신"],
  ["심판", "각성·부름·재도약", "미련·자기비판·지연"],
  ["세계", "완성·성취·통합", "미완·마무리 지연"],
];

function tarotMethod(profile, id, input) {
  const seed = timeSeed(id, input) + hashStr("tarot");
  const idx = seed % 22;
  const reversed = (seed >> 5) % 2 === 1;
  const [name, up, rev] = TAROT[idx];
  const key = reversed ? rev : up;
  const w = topicWord(id);
  return {
    method: "tarot", methodName: "타로",
    mediaStyle: majorBgStyle(idx),
    title: `${name}${reversed ? " (역방향)" : ""}`,
    lead: `${w}에 대해 뽑힌 카드는 ‘${name}’. ${reversed ? "지금은 이 카드의 기운이 막히거나 뒤집혀 있어요." : "이 카드의 기운이 지금 흐르고 있어요."}`,
    points: [
      { label: "카드의 메시지", text: key },
      { label: `${w}으로 읽으면`, text: tarotFrame(id, key, reversed) },
    ],
    advice: reversed ? "서두르기보다 한 박자 멈추고, 놓친 부분을 살펴보세요." : "카드가 가리키는 방향으로 한 걸음 내디뎌 보세요.",
  };
}
function tarotFrame(id, key, rev) {
  const w = topicWord(id);
  return `${w}의 흐름은 ‘${key}’로 요약돼요. ${rev ? "무리하게 밀어붙이기보다 정비가 필요한 시기" : "지금의 선택과 태도가 좋은 결과로 이어질 수 있는 시기"}예요. 결국 답은 알려주지만, 선택은 당신 몫이에요.`;
}

/* ---- 자미두수 (토픽 → 관련 궁) ---- */
const TOPIC_PALACE = {
  love: "부처궁", yearlove: "부처궁", reunion: "부처궁", breakup: "부처궁", todaylove: "부처궁", monthlove: "부처궁",
  wealth: "재백궁", business: "재백궁", study: "관록궁", document: "전택궁",
  today: "명궁", weekday: "명궁", weekend: "명궁", month: "명궁", nextmonth: "명궁", year: "명궁",
};
function ziweiMethod(profile, id, input) {
  const z = computeZiwei(input);
  const palName = TOPIC_PALACE[id] || "명궁";
  const pal = z.palaces.find((p) => p.name === palName) || z.palaces.find((p) => p.isMing);
  let starName = (pal.stars[0] && pal.stars[0].name) || (z.mingStars[0]) || "";
  let m = STAR_MEANING[starName];
  const w = topicWord(id);
  const empty = !pal.stars.length;
  return {
    method: "ziwei", methodName: "자미두수",
    title: `${palName} · ${starName || "공궁(空宮)"}`,
    lead: `${w}은(는) 자미두수의 ‘${palName}’로 봐요. ${empty ? "이 궁은 주성이 없는 공궁이라, 대궁의 기운과 주변 흐름을 함께 봐요." : `이 궁에 든 주성은 ‘${starName}’이에요.`}`,
    points: m ? [
      { label: "이 별의 기질", text: m.persona },
      { label: `${w}에서는`, text: `${m.strength} 다만 ${m.shadow}` },
    ] : [{ label: `${palName}`, text: "주성이 비어 대궁·삼방의 기운으로 흐름을 읽어요. 스스로 중심을 잡을수록 좋아요." }],
    advice: m ? m.advice : "명궁·삼방사정을 함께 보면 더 또렷해져요. 심화 해석에서 확인해 보세요.",
  };
}

/* ---- 토정비결 (올해 괘 → 토픽 각도) ---- */
function tojeongMethod(profile, id, input) {
  const t = tojeongYear(profile, new Date().getFullYear());
  const w = topicWord(id);
  return {
    method: "tojeong", methodName: "토정비결",
    title: `${t.palName} · ${t.palSym}`,
    lead: `올해의 괘 ‘${t.palName}(${t.palSym})’로 ${w}을(를) 봐요. “${t.verse}”`,
    points: [
      { label: "올해 전체 기운", text: t.summary },
      { label: `${w}로 좁혀 보면`, text: `${t.pros[0]} 반대로 ${t.cons[0]}` },
    ],
    advice: t.advice,
    goodMonths: t.goodMonths,
  };
}

/** 방법별 해석 (saju 제외) */
export function methodReading(profile, id, method, input) {
  if (method === "tarot") return tarotMethod(profile, id, input);
  if (method === "ziwei") return ziweiMethod(profile, id, input);
  if (method === "tojeong") return tojeongMethod(profile, id, input);
  return null;
}

/* 운세 방법 탭 — 사주·타로만. 자미두수는 어차피 명반·8단계 심화로 넘어가야 해서
   홈의 독립 메뉴(/ziwei)로 따로 보고, 토정비결도 '올해 전체 괘'라 /tojeong으로 따로 본다. */
export const METHODS = [
  { id: "saju", name: "사주" },
  { id: "tarot", name: "타로" },
];

/* ===================================================================
   (합침) ai.js — 파일 수를 줄이려고 이 파일 안으로 옮김 (HAE)
   =================================================================== */
/* =========================================================
   AI 대화형 상담 — 사용자의 실제 명식을 근거로 자유 질문에 답한다.
   정적 앱이므로 백엔드 없이, 사용자가 입력한 API 키로 브라우저에서
   직접 LLM(Anthropic / OpenAI)을 호출한다.
   ⚠️ API 키는 이 브라우저(localStorage)에만 저장된다. 공용 기기 금지.
   사용료는 사용자 본인 키로 청구된다.
   ========================================================= */

/* (합침) ./strength.js 에서 가져오던 것 — 이제 같은 파일 */
import { daeunTimeline, ageFromSolar } from "./fortune.js";

const AI_KEY = "str.ai.v1";

function safeParse(raw, fb) { try { return raw ? JSON.parse(raw) : fb; } catch { return fb; } }
export function getAIConfig() { return safeParse(localStorage.getItem(AI_KEY), null); }
export function setAIConfig(cfg) { localStorage.setItem(AI_KEY, JSON.stringify(cfg)); }
export function clearAIConfig() { localStorage.removeItem(AI_KEY); }
export function isAIConfigured() { const c = getAIConfig(); return !!(c && c.apiKey); }

const SYSTEM_PROMPT =
`당신은 30년 경력의 따뜻하고 현실적인 한국의 사주·명리 상담가입니다.
아래에 주어진 사용자의 '실제 사주 명식'을 근거로만 해석하세요. 명식에 없는 사실을 지어내지 마세요.
답변 원칙:
- 좋은 말만 늘어놓지 말고, 강점과 함께 조심할 점·현실적 갈등도 구체적으로 짚으세요.
- 막연한 표현 대신 실제 상황·행동 사례로 설명하세요.
- 미래의 사건을 확정적으로 예언하거나 공포·불안을 조장하지 마세요. '가능성이 커지는 흐름'과 그때의 현실적 대응으로 말하세요.
- 의료·법률·투자·결혼 등 중대한 결정은 실제 정보와 전문가 조언을 함께 검토하라고 안내하세요.
- 한국어로, 친근하지만 신뢰감 있게. 너무 길지 않게 핵심 위주로.`;

/** 명식을 텍스트 컨텍스트로 */
export function buildChartContext(profile, input) {
  const p = profile.pillars;
  const s = analyzeStrength(profile);
  const today = new Date();
  const age = profile.solar ? ageFromSolar(profile.solar, today) : null;
  const daeun = daeunTimeline(profile, age).find((d) => d.isCurrent);
  const el = profile.elements;
  const lines = [
    `- 성별: ${input.gender === "male" ? "남성" : "여성"}`,
    `- 생년월일: 양력 ${profile.solar ? `${profile.solar.Y}-${profile.solar.M}-${profile.solar.D}` : input.birthDate}${profile.lunar ? ` (음력 ${profile.lunar.year}.${profile.lunar.month}.${profile.lunar.day}${profile.lunar.isLeap ? "윤" : ""})` : ""}${input.timeUnknown ? " · 출생시간 모름(시주 제외)" : ` · ${input.birthTime}`}`,
    `- 사주 명식(팔자): 년주 ${p.year.hanja}, 월주 ${p.month.hanja}, 일주 ${p.day.hanja}${p.hour ? `, 시주 ${p.hour.hanja}` : " (시주 없음)"}`,
    `- 일간(나): ${p.day.stem}(${p.day.hanja[0]}), 오행 ${profile.dayMasterElem}`,
    `- 오행 분포(%): 목 ${el.wood}, 화 ${el.fire}, 토 ${el.earth}, 금 ${el.metal}, 수 ${el.water}`,
    `- 신강/신약(간이): ${s.strength}, 용신 ${s.yongsinKr.join("·")}${s.johu.element ? `, 조후 ${s.johu.element}` : ""}`,
    daeun ? `- 현재 대운: ${daeun.hanja} (${daeun.tenGod}, ${daeun.ageStart}~${daeun.ageEnd}세)` : null,
    age != null ? `- 현재 만나이: ${age}세` : null,
    `- 계산 방식: 절기·삭을 천문 계산한 실제 만세력. 신강신약은 억부·조후 간이 판정.`,
  ].filter(Boolean);
  return lines.join("\n");
}

/** SSE 스트림 파서(fetch 응답) → onToken(text) */
async function readSSE(res, onEvent) {
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const chunks = buf.split("\n\n");
    buf = chunks.pop();
    for (const chunk of chunks) {
      const line = chunk.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return;
      try { onEvent(JSON.parse(data)); } catch { /* ignore */ }
    }
  }
}

/**
 * 스트리밍 채팅. messages: [{role:'user'|'assistant', content}]
 * onToken(text) 호출. 반환: 전체 텍스트.
 */
export async function streamChat({ messages, profile, input, onToken, signal }) {
  const cfg = getAIConfig();
  if (!cfg || !cfg.apiKey) throw new Error("AI가 설정되지 않았습니다.");
  const system = SYSTEM_PROMPT + "\n\n[사용자 명식]\n" + buildChartContext(profile, input);
  let full = "";

  if (cfg.provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", signal,
      headers: { "content-type": "application/json", authorization: "Bearer " + cfg.apiKey },
      body: JSON.stringify({
        model: cfg.model || "gpt-4o-mini", stream: true,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI 오류 ${res.status}: ${(await res.text()).slice(0, 200)}`);
    await readSSE(res, (ev) => {
      const t = ev.choices && ev.choices[0] && ev.choices[0].delta && ev.choices[0].delta.content;
      if (t) { full += t; onToken(t); }
    });
  } else {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal,
      headers: {
        "content-type": "application/json", "x-api-key": cfg.apiKey,
        "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: cfg.model || "claude-3-5-haiku-latest", max_tokens: 1200, stream: true,
        system, messages,
      }),
    });
    if (!res.ok) throw new Error(`Anthropic 오류 ${res.status}: ${(await res.text()).slice(0, 200)}`);
    await readSSE(res, (ev) => {
      if (ev.type === "content_block_delta" && ev.delta && ev.delta.text) {
        full += ev.delta.text; onToken(ev.delta.text);
      }
    });
  }
  return full;
}
