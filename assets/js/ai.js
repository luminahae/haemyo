/* =========================================================
   🐱 해묘 AI 상담 — Firebase AI Logic(Gemini) 연결 (HAE)
   · 비밀 키 없이 Firebase 프로젝트로 바로 연결 (App Check 로 우리 사이트에서 온 요청만 허용)
   · 앱의 다른 Firebase(로그인 · 저장)와 섞이지 않게 'hae-ai' 라는 별도 앱으로 띄워요
   · 설정: config.js › ai (SETUP.md › AI 상담)
   ========================================================= */
import { getConfig } from "./config.js";

const AI_SDK = "https://www.gstatic.com/firebasejs/12.7.0";
let _ai = null;

export function aiReady() {
  const c = getConfig();
  return !!(c.ai && c.ai.siteKey && c.firebase && c.firebase.apiKey);
}

async function load() {
  if (_ai) return _ai;
  const c = getConfig();
  const [appM, acM, aiM] = await Promise.all([
    import(`${AI_SDK}/firebase-app.js`), import(`${AI_SDK}/firebase-app-check.js`), import(`${AI_SDK}/firebase-ai.js`),
  ]);
  const app = appM.getApps().find((a) => a.name === "hae-ai") || appM.initializeApp(c.firebase, "hae-ai");
  const Provider = c.ai.recaptcha === "v3" ? acM.ReCaptchaV3Provider : acM.ReCaptchaEnterpriseProvider;
  try { acM.initializeAppCheck(app, { provider: new Provider(c.ai.siteKey), isTokenAutoRefreshEnabled: true }); } catch { /* 이미 켜져 있으면 무시 */ }
  const ai = aiM.getAI(app, { backend: new aiM.GoogleAIBackend() });
  _ai = { aiM, ai, model: c.ai.model || "gemini-3.5-flash-lite" };
  return _ai;
}

/** 해묘 상담사의 기본 원칙 */
const RULES = `너는 사주·타로 웹앱 '해묘(解猫)'의 상담 고양이 '해묘'야. 한국어 존댓말(~해요)로 따뜻하지만 현실적으로 말해.
원칙:
- 좋은 말만 하지 말고, 조심할 점과 현실적인 조언을 함께 줘. 단정하거나 겁주는 말(죽는다, 망한다, 무조건 헤어진다 등)은 쓰지 마.
- 한자를 쓰면 반드시 한글을 괄호로 붙여 (예: 丙午(병오), 화(火)). 어려운 명리 용어는 쉬운 말로 풀어 줘.
- 답은 5~9문장, 400자 안팎. 마크다운 기호(#, *, -, 표)는 쓰지 말고 문단으로 써. 마지막 줄은 '💡 오늘 해 볼 것:'으로 시작하는 실천 한 가지.
- 아래에 주어진 사용자의 사주 정보만 근거로 써. 모르는 건 지어내지 말고 '사주로는 이렇게 보여요' 정도로 말해.
- 사주·타로는 참고용이야. 건강·법률·투자·임신 같은 중요한 결정은 전문가와 상의하라고 꼭 덧붙여.
- 자해·자살·폭력 위험이 보이면 점술 이야기를 멈추고, 마음을 살피는 말과 함께 자살예방상담전화 109, 정신건강위기상담 1577-0199, 긴급하면 112·119를 안내해.
- 다른 사람의 사주를 몰래 캐거나 해치려는 요청, 차별·혐오 요청은 정중히 거절해.
- 너 자신을 AI라고 숨기지 마. 물으면 '해묘의 AI 상담 고양이'라고 답해.`;

/** 대화 시작 — context: 사주 · 타로 요약 글, history: [{ role: "user"|"model", text }] */
export async function openChat(context, history = []) {
  const { aiM, ai, model } = await load();
  const m = aiM.getGenerativeModel(ai, {
    model,
    systemInstruction: `${RULES}\n\n[사용자 정보]\n${context}`,
    generationConfig: { temperature: 0.9, maxOutputTokens: 900 },
  });
  return m.startChat({ history: history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })) });
}

/** 한 번 묻기 — onChunk(지금까지 받은 글) 로 글자가 흘러나오게 */
export async function ask(chat, text, onChunk) {
  const r = await chat.sendMessageStream(text);
  let out = "";
  for await (const ch of r.stream) {
    let t = ""; try { t = ch.text(); } catch { t = ""; }
    out += t; if (onChunk) onChunk(out);
  }
  return out.trim();
}

/** 오류를 사람 말로 */
export function aiErrorText(e) {
  const m = String((e && (e.message || e.code)) || e || "");
  if (/app-check|appCheck|attestation|recaptcha/i.test(m)) return "앱 확인(App Check) 설정이 아직이에요. 관리자에게 알려 주세요.";
  if (/quota|429|RESOURCE_EXHAUSTED|rate/i.test(m)) return "오늘 AI 상담이 너무 많이 몰렸어요. 잠시 뒤에 다시 물어봐 주세요.";
  if (/api-not-enabled|not been used|disabled|PERMISSION_DENIED|403/i.test(m)) return "AI 기능이 아직 켜지지 않았어요. 관리자에게 알려 주세요.";
  if (/SAFETY|blocked/i.test(m)) return "이 질문엔 답하기 어려워요. 조금 다르게 물어봐 주세요.";
  if (/network|Failed to fetch|offline/i.test(m)) return "인터넷 연결을 확인해 주세요.";
  return "답을 받지 못했어요. 잠시 뒤 다시 해 주세요.";
}
