import { el, clear, toast } from "../utils/dom.js";
import { pageHeader, backLink, noticeBox, loadDisclaimer } from "./shared.js";
import { getMyBirth, getOwnBirth, getPeople, stash } from "../state.js";
import { isMember } from "../app.js";
import { computeSaju } from "../saju/manse.js";
import { analyzeStrength } from "../saju/strength.js";
import { starSign, SIGN_RANGE } from "../saju/extras.js";
import { godTally } from "../saju/spouse.js";
import { tenGod } from "../saju/fortune.js";
import { newMoonJD, sunLongitude, moonLongitude } from "../saju/astro.js";
import { personSwitch } from "./people.js";
import { computeZiwei, STAR_MEANING } from "../saju/ziwei.js";
/* =========================================================
   장르별 무료 운세 — 사주 · 타로 · 별자리 · 궁합 · 손금 · 스토리
   전부 무료. 내 생일로 계산하는 것(사주·별자리)과, 내 손을 보며 고르는 것(손금),
   읽을거리(스토리)로 구성. 그림은 전부 코드(SVG)로 그려서 파일을 늘리지 않음.
   작성: HAE
   ========================================================= */

/* ---------- 행성 위치 (NASA JPL 근사 궤도요소, 1800~2050년 오차 1° 안팎) ---------- */
const ORB = {
  earth: [1.00000261, 0.00000562, 0.01671123, -0.00004392, -0.00001531, -0.01294668, 100.46457166, 35999.37244981, 102.93768193, 0.32327364, 0, 0],
  venus: [0.72333566, 0.00000390, 0.00677672, -0.00004107, 3.39467605, -0.00078890, 181.97909950, 58517.81538729, 131.60246718, 0.00268329, 76.67984255, -0.27769418],
  mars: [1.52371034, 0.00001847, 0.09339410, 0.00007882, 1.84969142, -0.00813131, -4.55343205, 19140.30268499, -23.94362959, 0.44441088, 49.55953891, -0.29257343],
};
const RAD = Math.PI / 180;
function helio(p, T) {
  const o = ORB[p];
  const a = o[0] + o[1] * T, e = o[2] + o[3] * T, I = (o[4] + o[5] * T) * RAD, L = o[6] + o[7] * T, vp = o[8] + o[9] * T, Om = (o[10] + o[11] * T) * RAD;
  let M = ((((L - vp) % 360) + 540) % 360 - 180) * RAD;
  const w = vp * RAD - Om;
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(Om), sO = Math.sin(Om), cI = Math.cos(I);
  return [(cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp, (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp];
}
/** 지구에서 본 황경(도) — 세차 보정 포함 */
export function planetLon(p, jd) {
  const T = (jd - 2451545) / 36525;
  const a = helio(p, T), b = helio("earth", T);
  const l = Math.atan2(a[1] - b[1], a[0] - b[0]) / RAD + 1.3972 * T;
  return ((l % 360) + 360) % 360;
}
const jdOf = (y, m, d, h = 12) => { const a = Math.floor((14 - m) / 12), Y = y + 4800 - a, M = m + 12 * a - 3; return d + Math.floor((153 * M + 2) / 5) + 365 * Y + Math.floor(Y / 4) - Math.floor(Y / 100) + Math.floor(Y / 400) - 32045 + (h - 12) / 24; };
const dateOfJd = (jd) => { const d = new Date((jd - 2440587.5) * 864e5); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }; };
const SIGN12 = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"];
const SIGN_EL = ["fire", "earth", "air", "water"]; // 양(불)·황소(흙)·쌍둥이(공기)·게(물) 순환
const EL_KR = { fire: "불", earth: "흙", air: "공기", water: "물" };
const signOf = (lon) => Math.floor(lon / 30) % 12;
/** 앞뒤로 찾아 금성 역행 구간 (오늘 기준 가장 가까운 것) */
function venusRetro(today) {
  const start = jdOf(today.getFullYear(), today.getMonth() + 1, today.getDate()) - 60;
  let prev = planetLon("venus", start), on = null;
  for (let i = 1; i < 800; i++) {
    const j = start + i, l = planetLon("venus", j), dl = ((l - prev + 540) % 360) - 180;
    if (dl < 0 && !on) on = { s: j, sl: l };
    if (dl >= 0 && on) return { from: dateOfJd(on.s), to: dateOfJd(j), fromSign: SIGN12[signOf(on.sl)], toSign: SIGN12[signOf(prev)], fromIdx: signOf(on.sl), toIdx: signOf(prev), nowIn: j > start + 60 && on.s <= start + 60 };
    prev = l;
  }
  return null;
}

/* ---------- 별자리 생일 기간 · 내 사람들의 별자리 ---------- */
const rangeOf = (i) => `${SIGN_RANGE[SIGN12[i]]}생`;
/** 지금 보는 사람을 뺀 내 사람(나 포함)들 → [{name, sign}] */
function peopleSigns(cur) {
  const out = [];
  const own = getOwnBirth();
  const list = [...(own ? [{ name: "나", input: own }] : []), ...getPeople().map((x) => ({ name: x.name || "이름없음", input: x.input }))];
  for (const x of list) {
    if (!x.input || !x.input.birthDate) continue;
    if (cur && x.input.birthDate === cur.birthDate && (x.input.gender || "") === (cur.gender || "")) continue;
    try { const i = SIGN12.indexOf(starSign(computeSaju(x.input)).name); if (i >= 0) out.push({ name: x.name, sign: i }); } catch { /* ignore */ }
  }
  return out;
}

/* ---------- 내 정보 ---------- */
function myInfo() {
  const my = getMyBirth(); if (!my) return null;
  const P = computeSaju(my); const S = analyzeStrength(P);
  const s = P.solar; const bj = jdOf(s.Y, s.M, s.D);
  const sunIdx = SIGN12.indexOf(starSign(P).name);
  return { my, P, S, sun: sunIdx >= 0 ? sunIdx : 0, venus: signOf(planetLon("venus", bj)), mars: signOf(planetLon("mars", bj)) };
}

/* ---------- 그림 (SVG) ---------- */
const PALM = "M62 232 C57 216 51 200 45 186 C37 170 27 152 19 133 C14 121 17 108 27 107 C35 107 41 115 46 123 C50 129 53 133 55 132 C55 116 54 96 54 70 L54 56 C54 41 78 41 78 56 L79 92 C79 95 81 95 81 92 L80 38 C80 22 104 22 104 38 L104 92 C104 95 106 95 106 92 L106 46 C106 32 128 32 128 46 L129 96 C129 99 131 99 131 96 L130 72 C130 59 150 59 150 72 L150 110 C151 150 142 196 126 232 Z"; // 엄지까지 한 줄로 이어진 손 (엄지 + 손가락 4개)
function handSvg(lines = [], { dots = [], size = 150, side = "right" } = {}) {
  const ls = lines.map((l) => `<path d="${l.d}" fill="none" stroke="${l.c || "#e05a6a"}" stroke-width="${(l.w || 4) * 1.35}" stroke-linecap="round" ${l.dash ? 'stroke-dasharray="5 5"' : ""} opacity="${l.o || 1}"/>`).join("");
  const ds = dots.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="6" fill="#e05a6a" stroke="#fff" stroke-width="2"/>`).join("");
  const sk = `<defs><linearGradient id="hmSkin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fde9db"/><stop offset="1" stop-color="#f6d2bd"/></linearGradient></defs>`;
  const joints = `<g fill="none" stroke="#efc3aa" stroke-width="1.6" stroke-linecap="round"><path d="M59 72h14M59 62h14M85 58h14M85 48h14M111 62h12M111 52h12M134 84h11"/></g>`;
  // 손바닥을 내 쪽으로 펼친 모양 — 오른손은 엄지가 오른쪽, 왼손은 엄지가 왼쪽
  const flip = side === "left" ? "" : ' transform="translate(170 0) scale(-1 1)"';
  return `<svg viewBox="0 0 170 240" width="${size}" height="${Math.round(size * 240 / 170)}" role="img" aria-hidden="true">${sk}<g${flip}>`
    + `<path d="${PALM}" fill="url(#hmSkin)" stroke="#e0aa8f" stroke-width="2.2" stroke-linejoin="round"/>`
    + `<path d="M26 128 C31 126 36 128 40 132" fill="none" stroke="#efc3aa" stroke-width="1.6" stroke-linecap="round"/>${joints}`
    + `<path d="M58 140 C70 170 82 196 92 222" fill="none" stroke="#ebbca3" stroke-width="2"/><path d="M58 128 C90 124 112 132 132 146" fill="none" stroke="#ebbca3" stroke-width="2"/><path d="M144 108 C116 102 92 104 64 112" fill="none" stroke="#ebbca3" stroke-width="2"/>`
    + ls + ds + `</g></svg>`;
}
// 손금 선 (기본 위치)
const L_HEART = "M142 106 C120 98 96 100 70 110";
const L_HEAD = "M60 126 C86 124 110 132 134 148";
const L_LIFE = "M60 132 C68 164 80 196 92 224";
const L_FATE = "M98 226 C98 190 98 150 96 112";
const thumbBox = (bg, glyph) => `<div class="fg-thumb" style="background:${bg}"><span>${glyph}</span></div>`;

/* ---------- 손금 콘텐츠 — 내 손을 보며 고르기 ---------- */
const PALMS = [
  { id: "palm-bad-love", chips: ["애정운"], title: "연애운이 나쁜 손금은?", tags: ["감정선", "애정운"],
    q: "새끼손가락 아래에서 시작하는 감정선을 보세요. 어느 쪽에 가까워요?",
    opts: [
      { lab: "① 중간이 끊어져 있어요", lines: [{ d: "M142 106 C130 101 118 100 108 101" }, { d: "M100 102 C88 104 78 106 70 110" }], res: "감정선이 끊긴 손은 ‘한 번 크게 데이면 마음을 닫는’ 타입이에요. 연애운이 나쁘다기보다 상처가 오래 남는 거예요. 새 연애는 천천히, 믿음이 쌓인 뒤에 마음을 여는 게 맞아요." },
      { lab: "② 사슬처럼 자잘하게 엉켜 있어요", lines: [{ d: L_HEART, dash: true, w: 5 }], res: "사슬 감정선은 감정 기복이 크고 정이 많은 손이에요. 금사빠·금사식이 반복되기 쉬워요. 감정이 확 올라올 때 하루만 미뤄서 답장해 보세요 — 연애가 훨씬 안정돼요." },
      { lab: "③ 짧고 곧게 끝나요", lines: [{ d: "M142 106 C128 104 116 104 104 106" }], res: "짧고 곧은 감정선은 표현이 서툰 ‘무뚝뚝 순정파’예요. 마음은 깊은데 상대가 몰라줘서 엇갈리기 쉬워요. 좋아하는 마음을 말로 한 번 더 — 그게 연애운을 확 바꿔요." },
    ] },
  { id: "palm-rise", chips: ["재물운", "성향"], title: "인생 떡상할 사람 손금", tags: ["운명선", "성공"],
    q: "손바닥 가운데 세로로 올라가는 운명선을 찾아보세요.",
    opts: [
      { lab: "① 손목부터 중지까지 곧게 쭉", lines: [{ d: L_FATE, w: 5 }], res: "일찍 길을 정하고 꾸준히 올라가는 ‘계단식 떡상’ 손이에요. 한 우물을 깊게 파면 30대 중후반에 크게 인정받아요." },
      { lab: "② 손바닥 중간부터 시작해요", lines: [{ d: "M98 170 C98 150 98 130 96 112", w: 5 }], res: "늦게 피는 ‘대기만성’ 손이에요. 20대엔 방황해도 괜찮아요. 서른 무렵 내 길을 찾으면 그때부터 속도가 확 붙어요." },
      { lab: "③ 흐리거나 거의 안 보여요", lines: [{ d: L_FATE, o: 0.25, dash: true }], res: "운명선이 흐린 손은 정해진 틀보다 ‘내가 만드는 길’이 맞는 사람이에요. 프리랜서·창업·여러 일을 동시에 할 때 오히려 떡상해요." },
    ] },
  { id: "palm-stock", chips: ["재물운"], title: "주식 잘하는 사람은 이 손가락이 길다?!", tags: ["손가락", "재물운"],
    q: "손을 펴고 검지(둘째)와 약지(넷째) 길이를 비교해 보세요.",
    opts: [
      { lab: "① 약지가 더 길어요", lines: [{ d: "M117 124 L117 40", c: "#3a8ad8", w: 5 }], res: "약지가 긴 손은 감각과 배짱이 좋아 ‘기회를 잡는’ 타입이에요. 다만 확신이 들면 몰빵하기 쉬우니, 한 번에 다 넣지 말고 나눠 사는 규칙을 꼭 지키세요." },
      { lab: "② 검지가 더 길어요", lines: [{ d: "M66 124 L66 48", c: "#3a8ad8", w: 5 }], res: "검지가 긴 손은 계획·원칙형이에요. 단타보다 공부해서 오래 들고 가는 투자에서 강해요. 남의 말보다 내 기준표를 만들면 수익이 안정돼요." },
      { lab: "③ 거의 같아요", lines: [{ d: "M66 124 L66 48", c: "#3a8ad8", w: 4 }, { d: "M117 124 L117 40", c: "#3a8ad8", w: 4 }], res: "균형형이에요. 공격과 방어를 고루 할 줄 알아서 ‘잃지 않는 투자’에 강해요. 비상금·저축을 먼저 깔고 남는 돈으로만 굴리면 꾸준히 불어나요." },
    ] },
  { id: "palm-cold", chips: ["건강운"], title: "여름에도 감기 걸릴 사람은?", tags: ["생명선", "컨디션"],
    q: "엄지 아래를 감싸는 생명선을 보세요.",
    opts: [
      { lab: "① 굵고 진하게 쭉", lines: [{ d: L_LIFE, w: 6 }], res: "기초 체력이 좋은 손이에요. 다만 체력을 믿고 무리하다 한 번에 몰아 아픈 타입! 바쁜 주에도 잠은 꼭 챙기세요." },
      { lab: "② 가늘고 중간중간 끊겨요", lines: [{ d: "M60 132 C64 148 68 160 72 170" }, { d: "M76 180 C82 196 86 208 92 224" }], res: "컨디션이 들쭉날쭉한 손이에요. 에어컨·찬 음료에 약해서 여름 감기에 걸리기 쉬워요. 얇은 겉옷 하나와 따뜻한 물이 최고의 부적이에요." },
      { lab: "③ 작은 고리(섬)가 있어요", lines: [{ d: L_LIFE }, { d: "M70 168 C62 176 66 188 76 186 C84 182 80 170 70 168", w: 3 }], res: "섬 무늬는 ‘그 시기에 쉬어 가라’는 신호로 봐요. 피곤이 쌓이면 바로 티가 나는 몸이라, 몸이 보내는 신호를 무시하지 마세요. (재미로 보는 손금이에요 — 아프면 꼭 병원에!)" },
    ] },
  { id: "palm-lazy-genius", chips: ["성향"], title: "머리는 좋은데 공부 안 하는 사람 손금!", tags: ["두뇌선", "공부"],
    q: "손바닥을 가로지르는 두뇌선(가운데 줄)을 보세요.",
    opts: [
      { lab: "① 길고 아래로 휘어요", lines: [{ d: "M60 126 C84 128 100 150 112 184", c: "#3a6ad8", w: 5 }], res: "상상력이 넘치는 예술가형 머리예요. 관심 있는 건 밤새 하는데, 재미없는 공부는 손이 안 가요. 공부를 ‘이야기·그림’으로 바꾸면 성적이 확 올라요." },
      { lab: "② 짧고 곧아요", lines: [{ d: "M60 126 C76 126 90 128 102 132", c: "#3a6ad8", w: 5 }], res: "빠르고 실전적인 머리예요. 벼락치기 천재 — 대신 긴 공부는 지루해해요. 25분 공부 + 5분 휴식처럼 짧게 끊어 가세요." },
      { lab: "③ 끝이 두 갈래로 갈라져요", lines: [{ d: L_HEAD, c: "#3a6ad8", w: 5 }, { d: "M118 138 C124 150 128 160 132 172", c: "#3a6ad8", w: 4 }], res: "‘작가선’이라 불리는 손이에요. 머리가 좋고 말·글 재주가 있지만 관심사가 많아 한 가지에 오래 못 앉아 있어요. 목표를 하나만 정하면 무서운 집중력이 나와요." },
    ] },
  { id: "palm-masagi", chips: ["성향", "재물운"], title: "대박 or 쪽박, 막쥔손금의 진실은?", tags: ["막쥔손금", "승부사"],
    q: "감정선과 두뇌선이 하나로 합쳐져 손바닥을 일자로 가로지르나요?",
    opts: [
      { lab: "① 네, 일자로 한 줄이에요", lines: [{ d: "M58 118 C88 114 116 112 146 112", w: 6 }], res: "막쥔손금이에요! 한 번 꽂히면 끝까지 가는 승부사라 크게 성공하거나 크게 배우는 ‘모 아니면 도’ 기질이 있어요. 내 고집을 일에 쓰면 대박, 사람에게 쓰면 쪽박 — 방향만 잘 잡으세요." },
      { lab: "② 한 손만 그래요", lines: [{ d: "M58 118 C88 114 116 112 146 112", w: 5, dash: true }], res: "반막쥔 손이에요. 평소엔 유연한데 결정적인 순간엔 고집이 나와요. 중요한 결정은 하루 자고 한 번 더 보면 실수가 확 줄어요." },
      { lab: "③ 아니요, 두 줄이 따로 있어요", lines: [{ d: L_HEART }, { d: L_HEAD, c: "#3a6ad8" }], res: "감정과 이성이 나뉜 균형형이에요. 막쥔손금처럼 한 방은 없지만, 크게 잃지도 않는 안정적인 길이 맞아요." },
    ] },
  { id: "palm-hogu", chips: ["애정운"], title: "연애 호구… 나야 나! 손금", tags: ["감정선 끝", "애정운"],
    q: "감정선이 끝나는 곳(검지·중지 쪽)을 보세요.",
    opts: [
      { lab: "① 검지 쪽으로 크게 올라가요", lines: [{ d: "M142 106 C116 100 84 98 66 92" }], res: "다 퍼 주는 헌신형 — 연애 호구가 되기 쉬운 손이에요. 좋아하면 상대 일정에 다 맞추죠. 내 시간·내 돈의 ‘선’을 한 줄만 정해 두면 오히려 더 사랑받아요." },
      { lab: "② 중지 아래에서 끝나요", lines: [{ d: "M142 106 C124 100 106 98 90 98" }], res: "주고받는 게 분명한 현실 연애형이에요. 호구는 절대 아니지만, 계산적으로 보일 수 있으니 가끔은 이유 없는 선물로 마음을 표현해 보세요." },
      { lab: "③ 끝이 두세 갈래로 갈라져요", lines: [{ d: L_HEART }, { d: "M76 108 C72 102 68 96 64 92" }, { d: "M76 108 C75 104 75 100 75 95" }], res: "다정하면서도 자기 마음을 지킬 줄 아는 이상적인 감정선이에요. 호구 기질은 있지만 선을 넘으면 알아서 멈춰요." },
    ] },
  { id: "palm-strong", chips: ["성향"], title: "센언니·센형들이 가지고 있다는 이 손금!", tags: ["화성선", "카리스마"],
    q: "생명선 안쪽(엄지 쪽)에 생명선을 따라가는 짧은 선이 있나요?",
    opts: [
      { lab: "① 있어요 (안쪽에 한 줄 더)", lines: [{ d: L_LIFE }, { d: "M56 150 C60 168 66 184 72 198", c: "#c43a4a", w: 4 }], res: "화성선이에요! 위기에 강하고 기 싸움에서 절대 밀리지 않는 ‘센언니·센형’ 손이에요. 그 에너지를 운동·도전에 쓰면 무적이에요." },
      { lab: "② 두뇌선이 생명선과 떨어져 시작해요", lines: [{ d: L_LIFE }, { d: "M66 118 C90 120 112 130 134 146", c: "#3a6ad8" }], res: "독립심이 강하고 결단이 빠른 손이에요. 남 눈치보다 내 판단 — 그래서 멋있어 보이지만 가끔 ‘무섭다’는 오해도 받아요." },
      { lab: "③ 둘 다 없어요", lines: [{ d: L_LIFE }, { d: L_HEAD, c: "#3a6ad8" }], res: "부드러운 카리스마형이에요. 센 척보다 차분하게 설득할 때 사람들이 더 따라와요." },
    ] },
  { id: "palm-iq", chips: ["성향"], title: "손금, 당신의 지능은?", tags: ["두뇌선", "지능"],
    q: "두뇌선의 길이를 보세요. 어디쯤에서 끝나요?",
    opts: [
      { lab: "① 약지 아래를 지나 끝까지", lines: [{ d: "M60 126 C92 124 120 132 150 150", c: "#3a6ad8", w: 5 }], res: "생각이 깊고 넓은 분석가형 두뇌예요. 대신 생각이 너무 많아 결정이 느려질 수 있어요. ‘70% 확신이면 실행’ 규칙을 써 보세요." },
      { lab: "② 중지 아래쯤에서 끝나요", lines: [{ d: "M60 126 C76 126 90 128 104 134", c: "#3a6ad8", w: 5 }], res: "판단이 빠른 실전형 두뇌예요. 위기 상황·현장에서 진가가 나와요. 큰 그림을 볼 땐 한 번 더 메모해 두면 완벽해요." },
      { lab: "③ 물결치듯 구불구불", lines: [{ d: "M60 126 C70 120 80 132 90 126 C100 120 110 136 122 132 C128 130 132 140 136 146", c: "#3a6ad8", w: 4 }], res: "아이디어가 톡톡 튀는 창의형 두뇌예요. 정해진 틀보다 기획·콘텐츠·디자인처럼 자유로운 일에서 천재성이 드러나요." },
    ] },
  { id: "palm-love-style", chips: ["애정운"], title: "손금, 당신의 연애 스타일은?", tags: ["감정선", "연애 스타일"],
    q: "감정선의 모양을 보세요.",
    opts: [
      { lab: "① 크게 곡선을 그려요", lines: [{ d: "M142 106 C120 94 92 92 66 98" }], res: "열정적인 로맨티스트예요. 표현이 크고 이벤트를 좋아해요. 상대의 속도에 맞춰 주면 오래 가는 연애가 돼요." },
      { lab: "② 거의 일자로 곧아요", lines: [{ d: "M142 106 C120 106 96 106 70 108" }], res: "차분하고 현실적인 연애를 해요. 말보다 행동으로 사랑을 보여 주는 타입 — 상대가 서운해하지 않게 가끔은 말로도!" },
      { lab: "③ 감정선 위에 짧은 선이 여러 개", lines: [{ d: L_HEART }, { d: "M126 102 L125 95" }, { d: "M112 101 L111 94" }, { d: "M98 102 L97 95" }], res: "인기가 많고 연애 기회가 자주 오는 손이에요. 고르는 눈만 키우면 좋은 사람을 만나요." },
    ] },
  { id: "palm-dohwa", chips: ["애정운", "성향"], title: "도화살 손금 — 금성대가 있나요?", tags: ["금성대", "매력"],
    q: "감정선 위, 검지와 약지 사이에 반달 모양 선이 있나요?",
    opts: [
      { lab: "① 반달 선이 또렷해요", lines: [{ d: L_HEART }, { d: "M72 101 C88 90 112 90 128 101", c: "#d0409a", w: 4 }], res: "금성대예요 — 손금의 도화살! 감수성이 풍부하고 사람을 끄는 매력이 커요. 인기가 많은 만큼 연애에서 마음을 아끼는 것도 필요해요." },
      { lab: "② 끊긴 반달 선이에요", lines: [{ d: L_HEART }, { d: "M72 101 C78 96 86 93 94 92", c: "#d0409a", w: 4 }, { d: "M106 92 C114 93 122 96 128 101", c: "#d0409a", w: 4 }], res: "은은한 도화예요. 처음엔 눈에 안 띄다가 알수록 빠지는 매력 — 오래 볼수록 인기가 올라가는 타입이에요." },
      { lab: "③ 없어요", lines: [{ d: L_HEART }], res: "도화는 약하지만 그만큼 진지한 인연이 들어와요. 겉매력보다 대화·취향이 통하는 사람과 잘 맞아요." },
    ] },
  { id: "palm-dots", chips: ["성향"], title: "손바닥 점 위치로 보는 당신의 성격은?", tags: ["손바닥 점", "성격"],
    q: "손바닥에 점이 있다면 어디에 가장 가까워요?", dots: true,
    opts: [
      { lab: "① 검지 아래", dots: [[68, 102]], res: "리더의 점이에요. 사람들 앞에 서는 일이 잘 맞고, 책임을 맡을수록 운이 커져요." },
      { lab: "② 엄지 아래 볼록한 곳", dots: [[50, 168]], res: "정 많은 점이에요. 가족·친구 복이 있고, 사람을 챙길수록 돌아오는 게 많아요." },
      { lab: "③ 손바닥 한가운데", dots: [[96, 150]], res: "재물이 모이는 점으로 봐요. 쓰는 것보다 모으는 데 재능이 있으니 자동 저축을 걸어 두세요." },
      { lab: "④ 새끼손가락 아래", dots: [[140, 120]], res: "말재주·장사의 점이에요. 말로 하는 일(영업·강의·콘텐츠)에서 빛나요." },
    ] },
  { id: "palm-marriage", chips: ["애정운"], title: "결혼선으로 보는 나의 결혼", tags: ["결혼선", "결혼운"],
    q: "새끼손가락 아래 옆면의 짧은 가로선(결혼선)을 보세요.",
    opts: [
      { lab: "① 또렷한 한 줄", lines: [{ d: "M149 99 L137 99", c: "#d0409a", w: 5 }], res: "한 사람과 깊게 가는 손이에요. 연애가 길어져 결혼으로 이어지기 쉬워요." },
      { lab: "② 두 줄 이상", lines: [{ d: "M149 96 L137 96", c: "#d0409a", w: 4 }, { d: "M149 101 L139 101", c: "#d0409a", w: 4 }], res: "인연이 여러 번 찾아오는 손이에요. 빨리 정하기보다 충분히 만나 보고 고를수록 행복한 결혼을 해요." },
      { lab: "③ 끝이 위로 휘어요", lines: [{ d: "M149 100 C144 100 139 98 135 93", c: "#d0409a", w: 5 }], res: "늦게 하더라도 만족도가 높은 결혼을 해요. 조건보다 마음이 편한 사람을 고르세요." },
    ] },
];

/* ---------- 별자리 콘텐츠 (내 생일로 계산) ---------- */
const VENUS_CHARM = ["시원시원한 직진 매력 — 망설임 없이 다가오는 모습에 끌려요", "느긋하고 포근한 분위기 — 같이 있으면 편해지는 매력", "재치 있는 말솜씨 — 대화가 끊기지 않는 매력", "다정하게 챙겨 주는 따뜻함 — 엄마·형 같은 매력", "화려한 존재감 — 웃는 얼굴이 사람을 끌어요", "섬세한 배려 — 작은 것까지 기억해 주는 매력", "우아한 분위기와 센스 — 옷·말투가 세련돼 보여요", "깊은 눈빛과 신비로움 — 알면 알수록 빠지는 매력", "자유롭고 유쾌한 에너지 — 같이 있으면 모험이 시작돼요", "믿음직한 어른스러움 — 기댈 수 있는 매력", "독특한 개성 — 남들과 다른 생각이 매력 포인트", "말랑한 감수성 — 공감해 주는 눈빛이 매력"];
const MARS_POWER = ["누구보다 빠른 실행력 — 시작하는 힘", "끝까지 버티는 지구력 — 포기하지 않는 힘", "말과 정보로 이기는 힘 — 순발력 있는 두뇌", "지켜야 할 사람을 위해 강해지는 힘", "무대 위에서 커지는 존재감 — 앞장서는 힘", "디테일로 이기는 힘 — 실수 없는 완성도", "갈등을 푸는 협상력 — 사람을 움직이는 힘", "한 번 꽂히면 끝을 보는 집중력", "멀리 보고 뛰는 도전력 — 새로운 걸 여는 힘", "목표를 계단처럼 오르는 전략력", "판을 바꾸는 아이디어 — 남다른 발상", "보이지 않게 돕는 직감력 — 분위기를 읽는 힘"];
const LETGO = ["조급함 — 결과를 재촉하는 마음", "쌓아 둔 물건 — 안 쓰는 것부터 한 상자", "의미 없는 단톡·알림", "지난 서운함 — 마음속 원망 한 가지", "남과 비교하는 습관", "완벽하려는 강박 — ‘대충 80%’도 괜찮아요", "눈치 보며 하는 약속", "끝난 관계에 대한 미련", "벌여 놓고 안 하는 계획", "‘해야만 해’라는 압박", "남들 다 하니까 하는 소비", "남의 감정까지 떠안는 습관"];
const HOUSE_AREA = ["나 자신·이미지", "돈·소비", "말·연락·공부", "집·가족", "연애·즐거움", "일상·건강", "연인·파트너 관계", "깊은 관계·빚·공유 재산", "여행·배움", "일·평판", "친구·모임", "마음·휴식"];

/* ---------- 사주 콘텐츠 ---------- */
const EK = { wood: "목(木)", fire: "화(火)", earth: "토(土)", metal: "금(金)", water: "수(水)" };
const SAJU_TALENT = { wood: "기획하고 키우는 재능 — 새 프로젝트를 시작하고 사람을 성장시켜요", fire: "표현하고 알리는 재능 — 말·글·영상으로 사람을 끌어요", earth: "모으고 지키는 재능 — 사람과 돈을 안정되게 관리해요", metal: "판단하고 다듬는 재능 — 기준을 세우고 완성도를 높여요", water: "읽고 연결하는 재능 — 정보·사람·흐름을 꿰뚫어요" };
const SAJU_STRESS = { wood: "숲길 산책·식물 돌보기·스트레칭", fire: "햇볕 쬐기·노래방·땀나는 운동", earth: "맛있는 밥·정리 정돈·낮잠", metal: "샤워·악기·혼자만의 드라이브", water: "반신욕·음악·밤 산책" };
const SAJU_LUCK = { wood: ["초록·민트", "3·8", "동쪽"], fire: ["빨강·코랄", "2·7", "남쪽"], earth: ["노랑·베이지", "5·10", "가운데"], metal: ["흰색·은색", "4·9", "서쪽"], water: ["검정·네이비", "1·6", "북쪽"] };
const ILJU_IMPR = ["곧고 반듯한 첫인상 — ‘믿을 만하다’", "부드럽고 다정한 첫인상 — ‘착해 보인다’", "밝고 환한 첫인상 — ‘에너지 넘친다’", "따뜻하고 섬세한 첫인상 — ‘분위기 있다’", "듬직하고 무게 있는 첫인상 — ‘어른스럽다’", "포근하고 편안한 첫인상 — ‘말 걸기 쉽다’", "또렷하고 강단 있는 첫인상 — ‘카리스마 있다’", "깔끔하고 세련된 첫인상 — ‘도도해 보인다’", "시원하고 큰 첫인상 — ‘속이 깊어 보인다’", "맑고 촉촉한 첫인상 — ‘감성적이다’"];
const STEM_H = ["甲(갑)", "乙(을)", "丙(병)", "丁(정)", "戊(무)", "己(기)", "庚(경)", "辛(신)", "壬(임)", "癸(계)"];

/* ---------- 성격 특집 — 십신 무리(비겁·식상·재성·관성·인성)별 성격 ---------- */
const GT = {
  비겁: { name: "비겁(比劫) — 나를 지키는 힘", trait: "독립심과 자존심이 강하고, 내 방식대로 해야 직성이 풀려요", out: "당당하고 씩씩해 보여요", in: "사실은 지기 싫고, 인정받고 싶은 마음이 커요", good: "추진력·의리·끝까지 버티는 근성", bad: "고집·경쟁심 — 남의 말을 잘 안 들어요", angry: "말이 짧아지고 혼자 해결하려 들어요. 일단 거리를 두고 식혀야 풀려요", people: "소수 정예, 의리파 — 내 사람은 끝까지 챙기지만 선을 넘으면 단칼", work: "혼자 맡겨 두면 가장 잘해요. 간섭받으면 능률이 뚝", desire: "누구에게도 휘둘리지 않는 ‘내 영역’", word: "#직진", mis: "‘고집 세고 차갑다’는 오해 — 사실은 책임감이 강한 거예요" },
  식상: { name: "식상(食傷) — 표현하고 만드는 힘", trait: "재능과 아이디어가 많고, 하고 싶은 말은 해야 하는 성격이에요", out: "밝고 재치 있고 말을 잘해 보여요", in: "사실은 인정과 반응에 예민하고, 쉽게 지루해해요", good: "센스·창의력·분위기를 살리는 능력", bad: "말실수·변덕 — 시작은 잘하는데 마무리가 약해요", angry: "참지 않고 바로 말해요. 쏟아내고 나면 금방 풀리는 편", people: "인싸형 — 처음 본 사람과도 금방 친해지지만 깊은 관계는 골라요", work: "기획·아이디어·사람 앞에 서는 일에 강해요. 반복 업무는 힘들어요", desire: "내 재능을 알아봐 주는 무대와 박수", word: "#센스", mis: "‘가볍다·생각 없이 말한다’는 오해 — 사실은 분위기를 살피는 거예요" },
  재성: { name: "재성(財星) — 현실을 다루는 힘", trait: "현실 감각이 뛰어나고 실속을 챙기며, 결과로 말하는 성격이에요", out: "싹싹하고 일 잘하는 사람으로 보여요", in: "사실은 손해 보는 게 제일 싫고, 미래를 계산하느라 늘 바빠요", good: "계획력·관리력·돈 감각", bad: "계산적이라는 인상, 결과 중심이라 과정을 즐기지 못해요", angry: "겉으론 조용한데 속으로 손익을 따지며 정리해요. 회복은 빠른 편", people: "넓고 실용적인 인맥 — 서로 도움이 되는 관계를 잘 만들어요", work: "숫자·성과·관리가 보이는 일. 목표가 분명하면 무섭게 해내요", desire: "흔들리지 않는 경제적 자유", word: "#실속", mis: "‘계산적이다’는 오해 — 사실은 모두가 손해 안 보게 정리하는 거예요" },
  관성: { name: "관성(官星) — 책임지고 지키는 힘", trait: "책임감과 규칙을 중시하고, 남들 앞에서 흐트러지지 않는 성격이에요", out: "반듯하고 믿음직한 모범생처럼 보여요", in: "사실은 평가가 두렵고, 스스로에게 가장 엄격해요", good: "책임감·성실함·신뢰", bad: "융통성 부족·눈치·스스로 너무 몰아붙여요", angry: "꾹 참다가 한 번에 터지거나, 아예 아무 말 안 하고 혼자 삭여요", people: "예의 바르고 선을 지키는 관계 — 위아래가 분명해요", work: "조직·규칙이 있는 곳에서 빛나요. 맡은 일은 끝까지", desire: "인정받는 자리와 떳떳한 이름", word: "#책임", mis: "‘딱딱하고 재미없다’는 오해 — 사실은 실수하기 싫어 긴장한 거예요" },
  인성: { name: "인성(印星) — 생각하고 배우는 힘", trait: "생각이 깊고 배우는 걸 좋아하며, 혼자만의 세계가 있는 성격이에요", out: "차분하고 지적인 사람으로 보여요", in: "사실은 생각이 너무 많아 결정이 느리고, 상처를 오래 품어요", good: "이해력·통찰·배려", bad: "걱정 많음·행동이 늦음·의존하고 싶어 해요", angry: "말없이 거리를 둬요. 혼자 생각할 시간이 있어야 풀려요", people: "깊고 좁게 — 마음을 열기까지 오래 걸리지만 한번 열면 평생", work: "연구·교육·전문 분야. 충분히 이해하고 나면 누구보다 정확해요", desire: "마음 편히 기댈 수 있는 안정과 이해받는 것", word: "#사색", mis: "‘무관심하다·느리다’는 오해 — 사실은 깊이 생각하는 중이에요" },
};
const ELEM_TEMPER = {
  wood: ["나무의 기질 — 곧게 자라려는 사람", "성장과 시작을 좋아하고, 정의감·향상심이 강해요. 막히면 답답해하고 뻗어 나갈 곳을 찾아요."],
  fire: ["불의 기질 — 밝게 타오르는 사람", "열정적이고 표현이 풍부해요. 감정이 빨리 달아오르고 빨리 식어요."],
  earth: ["흙의 기질 — 묵묵히 품는 사람", "듬직하고 신용을 중시해요. 변화보다 안정을, 말보다 행동을 믿어요."],
  metal: ["쇠의 기질 — 단단하게 결단하는 사람", "원칙과 기준이 분명하고 결단이 빨라요. 아닌 건 아니라고 말해요."],
  water: ["물의 기질 — 유연하게 흐르는 사람", "총명하고 적응력이 좋아요. 속을 잘 드러내지 않고 생각이 깊어요."],
};
const FILL = { wood: "새로운 걸 배우거나 식물을 키우기, 아침 산책", fire: "햇볕 쬐기, 사람 만나기, 땀나는 운동", earth: "규칙적인 식사와 잠, 정리 정돈", metal: "할 일 목록 정리, 맺고 끊기 연습, 악기·운동으로 집중", water: "충분한 휴식과 물, 일기 쓰기, 혼자만의 시간" };
const GOD_ORDER = ["비겁", "식상", "재성", "관성", "인성"];
function splitGods(P) { // 겉(천간) / 속(지지 정기)
  const d = P.pillars.day.stemIdx; const JJ = [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8];
  const G = { 비견: "비겁", 겁재: "비겁", 식신: "식상", 상관: "식상", 정재: "재성", 편재: "재성", 정관: "관성", 편관: "관성", 정인: "인성", 편인: "인성" };
  const out = { 비겁: 1, 식상: 0, 재성: 0, 관성: 0, 인성: 0 }, inn = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  ["year", "month", "hour"].forEach((k) => { const x = P.pillars[k]; if (x) out[G[tenGod(d, x.stemIdx)]]++; });
  ["year", "month", "day", "hour"].forEach((k) => { const x = P.pillars[k]; if (x) inn[G[tenGod(d, JJ[x.branchIdx])]] += k === "day" || k === "month" ? 1.5 : 1; });
  const top = (o) => GOD_ORDER.slice().sort((a, b) => o[b] - o[a])[0];
  return { out: top(out), inn: top(inn) };
}

/* ---------- 궁합 (띠·별자리 즉석) ---------- */
const ANIMALS = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];
const YUKHAP = [1, 0, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
const WONJIN = [7, 6, 9, 8, 11, 10, 1, 0, 3, 2, 5, 4];
function ttiCompat(a, b) {
  if (YUKHAP[a] === b) return [95, "육합(六合) — 서로 끌어당기는 최고의 짝", "말하지 않아도 통하고, 같이 있으면 일이 풀려요."];
  if ((a - b + 12) % 4 === 0 && a !== b) return [88, "삼합(三合) — 같은 방향을 보는 동지", "목표가 같으면 둘이 뭉쳐 큰일을 해내요."];
  if ((a - b + 12) % 12 === 6) return [52, "충(沖) — 부딪히지만 자극이 되는 사이", "성격·리듬이 정반대라 자주 부딪혀요. 서로의 다름을 ‘보완’으로 보면 최고의 팀이 돼요."];
  if (WONJIN[a] === b) return [58, "원진(怨嗔) — 괜히 서운해지는 사이", "사소한 말에 서운함이 쌓이기 쉬워요. 서운한 건 그날 바로 가볍게 말하기!"];
  if (a === b) return [76, "같은 띠 — 거울 같은 사이", "잘 통하지만 고집도 닮아서, 한 명이 먼저 양보하는 연습이 필요해요."];
  return [72, "무난한 사이", "큰 충돌 없이 편하게 지내요. 공통 취미가 생기면 확 가까워져요."];
}
function signCompat(a, b) {
  const ea = a % 4, eb = b % 4;
  if (a === b) return [80, "같은 별자리 — 말하지 않아도 아는 사이"];
  if (ea === eb) return [92, `같은 ${EL_KR[SIGN_EL[ea]]}의 별자리 — 가치관이 꼭 맞아요`];
  const pair = [ea, eb].sort().join("");
  if (pair === "02" || pair === "13") return [86, "불·공기 / 흙·물 — 서로를 살려 주는 짝"];
  if ((a - b + 12) % 12 === 6) return [70, "정반대 별자리 — 끌림은 강하지만 조율이 필요해요"];
  return [64, "다른 원소 — 다름을 배우는 사이"];
}

/* ---------- 스토리 (읽을거리) ---------- */
const STORIES = [
  { id: "st-12tti", chips: ["사주"], title: "12띠의 순서는 왜 쥐부터일까?", tags: ["띠", "설화"], body: [
    "옛이야기에 하늘의 임금이 ‘새해 첫날 먼저 도착한 열두 동물에게 한 해씩 맡기겠다’고 했대요.",
    "부지런한 소가 가장 먼저 출발했는데, 꾀 많은 쥐가 소 등에 올라타 있다가 결승선 앞에서 폴짝 뛰어내려 1등이 됐어요. 그래서 쥐(子(자)) 다음이 소(丑(축))예요.",
    "그 뒤로 호랑이(寅(인))·토끼(卯(묘))·용(辰(진))·뱀(巳(사))·말(午(오))·양(未(미))·원숭이(申(신))·닭(酉(유))·개(戌(술))·돼지(亥(해)) 순서로 도착했대요.",
    "사주에서 띠는 태어난 해의 지지(地支)예요. 다만 사주의 한 해는 1월 1일이 아니라 입춘(2월 4일 무렵)부터 시작해서, 1월생은 띠가 앞 해일 수 있어요!",
  ] },
  { id: "st-ohaeng", chips: ["사주"], title: "오행(五行)이 뭐예요? 3분 정리", tags: ["오행", "기초"], body: [
    "오행은 세상을 이루는 다섯 기운이에요: 목(木) 나무·화(火) 불·토(土) 흙·금(金) 쇠·수(水) 물.",
    "서로 살려 주는 상생(相生): 나무는 불을 키우고 → 불은 재가 되어 흙을 만들고 → 흙 속에서 쇠가 나고 → 쇠에 물방울이 맺히고 → 물은 나무를 키워요.",
    "서로 누르는 상극(相剋): 나무는 흙을 뚫고, 흙은 물을 막고, 물은 불을 끄고, 불은 쇠를 녹이고, 쇠는 나무를 베어요.",
    "내 사주에 많은 오행은 나의 성향, 부족한 오행은 채우면 좋은 기운(용신의 힌트)이 돼요. 해묘의 사주 풀이에서 ‘오행 분포’를 같이 보세요.",
  ] },
  { id: "st-ganji", chips: ["사주"], title: "천간·지지, 사주 여덟 글자 쉽게 읽기", tags: ["천간", "지지"], body: [
    "사주(四柱)는 태어난 해·달·날·시의 네 기둥, 팔자(八字)는 그 기둥마다 위아래 두 글자씩 여덟 글자예요.",
    "위 글자는 천간(天干) 10개: 甲(갑)·乙(을)·丙(병)·丁(정)·戊(무)·己(기)·庚(경)·辛(신)·壬(임)·癸(계).",
    "아래 글자는 지지(地支) 12개: 子(자)·丑(축)·寅(인)·卯(묘)·辰(진)·巳(사)·午(오)·未(미)·申(신)·酉(유)·戌(술)·亥(해) — 바로 12띠예요.",
    "그중 태어난 ‘날’의 천간을 일간(日干)이라 하는데, 이게 바로 ‘나 자신’을 뜻해요. 사주 풀이는 일간을 중심으로 나머지 일곱 글자와의 관계를 읽는 거예요.",
  ] },
  { id: "st-tarot", chips: ["타로"], title: "타로 78장은 어떻게 이루어져 있을까?", tags: ["타로", "기초"], body: [
    "메이저 아르카나 22장: 0번 바보부터 21번 세계까지, 인생의 큰 사건과 성장 이야기를 담아요.",
    "마이너 아르카나 56장: 완드(불·열정)·컵(물·감정)·소드(공기·생각)·펜타클(흙·현실) 네 무리가 각각 14장씩.",
    "각 무리는 에이스~10번 숫자 카드와, 시종·기사·여왕·왕의 궁정 카드로 나뉘어요. 궁정 카드는 ‘사람’을 뜻할 때가 많아요.",
    "역방향(거꾸로)은 ‘나쁜 뜻’이라기보다, 그 기운이 막히거나 안으로 숨어 있다는 뜻으로 읽어요.",
  ] },
  { id: "st-palm", chips: ["손금"], title: "손금 보는 법 — 4대 손금 찾기", tags: ["손금보는법", "기초"], body: [
    "생명선: 엄지 아래를 둥글게 감싸는 선. 길이보다 ‘진하고 또렷한지’로 활력을 봐요.",
    "두뇌선: 손바닥 가운데를 가로지르는 선. 생각하는 방식(현실형·창의형)을 봐요.",
    "감정선: 새끼손가락 쪽에서 검지 쪽으로 가는 맨 위 가로선. 연애·감정 표현을 봐요.",
    "운명선: 손목에서 중지 쪽으로 올라가는 세로선. 일과 인생의 방향을 봐요.",
    "보통 주로 쓰는 손은 ‘지금과 앞으로’, 반대 손은 ‘타고난 것’을 보여 준다고 해요. 손금은 바뀌기도 하니 재미로, 가볍게 보세요!",
  ] },
  { id: "st-zodiac", chips: ["별자리"], title: "별자리 12궁과 4원소 이야기", tags: ["별자리", "원소"], body: [
    "서양 점성술은 태양이 지나는 길(황도)을 12칸으로 나눠 12별자리로 불러요. 내가 태어날 때 태양이 있던 칸이 ‘내 별자리’예요.",
    "불의 별자리(양·사자·사수): 열정과 행동. 흙의 별자리(황소·처녀·염소): 현실과 꾸준함.",
    "공기의 별자리(쌍둥이·천칭·물병): 생각과 소통. 물의 별자리(게·전갈·물고기): 감정과 공감.",
    "태양 별자리 말고도 금성(사랑)·화성(행동력)이 어느 별자리에 있었는지도 성격을 보여 줘요 — 해묘 ‘별자리’ 탭에서 내 금성·화성을 계산해 볼 수 있어요.",
  ] },
];

/* ---------- 목록 정의 ---------- */
// 점술 갈래별로만 나눔 — 사주 · 타로 · 자미두수 · 별자리 · 손금 (궁합·읽을거리는 각 갈래 안의 칩으로)
const GENRES = [["saju", "사주"], ["tarot", "타로"], ["ziwei", "자미두수"], ["star", "별자리"], ["palm", "손금"]];
const CHIPS = {
  saju: ["전체", "성향", "애정운", "재물운", "행운", "궁합", "읽을거리"],
  tarot: ["전체", "애정운", "대인관계", "행운", "고민", "읽을거리"],
  ziwei: ["전체", "성향", "애정운", "재물운", "직업운"],
  star: ["전체", "애정운", "성격", "월운", "행운", "궁합", "읽을거리"],
  palm: ["전체", "성향", "애정운", "재물운", "건강운", "손금보는법"],
};
const STORY_G = { 사주: "saju", 타로: "tarot", 별자리: "star" };
function items() {
  const now = new Date(), M = now.getMonth() + 1;
  return [
    // 사주
    { g: "saju", id: "sj-impr", chips: ["성향"], title: "일주로 보는 나의 첫인상", tags: ["일주", "첫인상"], thumb: ["linear-gradient(135deg,#ffd6e0,#ffc3d1)", "🌸"] },
    { g: "saju", id: "sj-talent", chips: ["성향"], title: "내 사주 속 숨은 재능은?", tags: ["오행", "재능"], thumb: ["linear-gradient(135deg,#ffe7b0,#ffd27a)", "💎"] },
    { g: "saju", id: "sj-love", chips: ["애정운"], title: "사주로 보는 나의 연애 스타일", tags: ["일지", "연애"], thumb: ["linear-gradient(135deg,#ffc7d9,#ff9fc0)", "💗"] },
    { g: "saju", id: "sj-stress", chips: ["성향"], title: "내 사주에 맞는 스트레스 푸는 법", tags: ["용신", "힐링"], thumb: ["linear-gradient(135deg,#c9f0dc,#9fd3b7)", "🍃"] },
    { g: "saju", id: "sj-luck", chips: ["행운", "재물운"], title: "나를 위한 행운 색·숫자·방향", tags: ["용신", "개운"], thumb: ["linear-gradient(135deg,#fff1b8,#ffe08a)", "🍀"] },
    ...[
      ["sj-temper", "나의 기질과 타고난 성향", ["오행", "기질"], "🌿"], ["sj-trait", "내 성격에서 가장 두드러지는 특징", ["십신", "성격"], "✨"],
      ["sj-outin", "겉으로 보이는 나 vs 내면의 나, 어떻게 다를까?", ["겉과 속", "천간·지지"], "🎭"], ["sj-ideal", "나의 이상과 현실, 얼마나 차이 날까?", ["이상", "현실"], "🌈"],
      ["sj-goodbad", "나의 장점과 단점", ["장점", "단점"], "⚖️"], ["sj-angry", "화나거나 스트레스 받을 때의 나", ["감정", "스트레스"], "🌋"],
      ["sj-people", "나의 대인관계 스타일", ["인간관계"], "🤝"], ["sj-work", "일할 때의 나는 어떤 사람?", ["일", "스타일"], "💼"],
      ["sj-desire", "내가 진짜 원하는 것 (숨은 욕망)", ["욕망", "속마음"], "🗝️"], ["sj-mis", "사람들이 나를 오해하는 부분", ["오해", "이미지"], "💬"],
      ["sj-word", "나를 한 단어로 표현하면?", ["키워드"], "🏷️"], ["sj-lack", "나에게 부족한 기운과 채우는 법", ["오행", "개운"], "🧩"],
    ].map(([id, t, tags, e]) => ({ g: "saju", id, chips: ["성향"], title: t, tags, thumb: ["linear-gradient(135deg,#f0e0ff,#d6c2f5)", e] })),
    { g: "saju", id: "sj-year", chips: ["행운"], title: `${now.getFullYear()}년 나의 한 단어 키워드`, tags: ["세운", "올해"], thumb: ["linear-gradient(135deg,#d9d2ff,#b9a9ff)", "🗝️"] },
    // 타로 (무료 오라클로 바로)
    ...[
      ["tr-think", "오늘 그 사람은 내 생각을 할까?", ["애정운"], "💭"], ["tr-luck", "이번 주 나에게 오는 행운은?", ["행운"], "🍀"],
      ["tr-care", "오늘 조심해야 할 한 가지는?", ["고민"], "⚠️"], ["tr-word", "지금 나에게 필요한 한마디는?", ["고민"], "✉️"],
      ["tr-friend", "요즘 친구 관계, 이대로 괜찮을까?", ["대인관계"], "🤝"], ["tr-date", "이번 주말 연애운은 어떨까?", ["애정운"], "💘"],
    ].map(([id, t, c, e]) => ({ g: "tarot", id, chips: c, title: t, tags: ["원카드", "무료"], thumb: ["linear-gradient(135deg,#e2d4ff,#c9b3f2)", e], tarotQ: t })),
    // 별자리
    { g: "star", id: "sr-charm", chips: ["애정운", "성격"], title: "첫눈에 끌리는 이유! 상대가 가장 먼저 느끼는 나의 매력은?", tags: ["금성", "매력", "첫인상"], thumb: ["linear-gradient(135deg,#ffd0e6,#ffb0d0)", "💕"] },
    { g: "star", id: "sr-venus-rx", chips: ["애정운", "월운"], title: "금성 역행 기간, 당신의 운세는?", tags: ["금성", "역행"], thumb: ["linear-gradient(135deg,#d8c4ff,#9f8bf0)", "♀"] },
    { g: "star", id: "sr-month", chips: ["월운"], title: `별들의 움직임으로 내다본 ${M}월 점성술 운세 예보`, tags: [`${M}월`, "월운"], thumb: ["linear-gradient(135deg,#eef0ff,#d6daff)", "🔭"] },
    { g: "star", id: "sr-letgo", chips: ["행운"], title: "새로운 행운을 담기 위한 이달의 비움 가이드", tags: ["달", "비움", "개운"], thumb: ["linear-gradient(135deg,#fff3c4,#cdeccd)", "🌙"] },
    { g: "star", id: "sr-mars", chips: ["성격"], title: "실시간 특급 버프 ON! 화성이 깨운 나의 특별한 능력", tags: ["화성", "능력"], thumb: ["linear-gradient(135deg,#ffb4a0,#e0525a)", "♂"] },
    { g: "star", id: "sr-match", chips: ["애정운"], title: "내 별자리와 찰떡인 별자리 TOP 3", tags: ["별자리 궁합"], thumb: ["linear-gradient(135deg,#cfe8ff,#a8ccf0)", "✨"] },
    // 궁합
    { g: "saju", cv: true, id: "cp-tti", chips: ["궁합", "애정운"], title: "띠 궁합 — 그 사람 띠만 알면 바로!", tags: ["띠", "육합·삼합"], thumb: ["linear-gradient(135deg,#ffe0b0,#ffc07a)", "🐯"] },
    { g: "star", cv: true, id: "cp-sign", chips: ["궁합", "애정운"], title: "별자리 궁합 — 우리 원소는 잘 맞을까?", tags: ["별자리", "원소"], thumb: ["linear-gradient(135deg,#d6e4ff,#aec4ff)", "♊"] },
    { g: "saju", cv: true, id: "cp-today", chips: ["궁합", "애정운"], title: "오늘의 궁합 (궁합 특집)", tags: ["오늘", "무료"], thumb: ["linear-gradient(135deg,#ffd6e0,#ffb3c6)", "💞"], to: "/compat-plus" },
    { g: "saju", cv: true, id: "cp-name", chips: ["궁합"], title: "한자 이름 궁합", tags: ["이름", "무료"], thumb: ["linear-gradient(135deg,#fff0c8,#ffe08a)", "🖋️"], to: "/name/pair" },
    { g: "saju", cv: true, id: "cp-idol", chips: ["궁합"], title: "최애와 나의 궁합", tags: ["최애", "무료"], thumb: ["linear-gradient(135deg,#ffd0f0,#e9a8ff)", "💘"], to: "/idol-compat" },
    // 자미두수
    { g: "ziwei", zw: "ming", id: "zw-ming", chips: ["성향"], title: "명궁 주성으로 보는 나의 본모습", tags: ["명궁", "주성"], thumb: ["linear-gradient(135deg,#e6dcff,#c4b2f2)", "🌌"] },
    { g: "ziwei", zw: "love", id: "zw-love", chips: ["애정운"], title: "부처궁으로 보는 나의 연애·배우자", tags: ["부처궁", "연애"], thumb: ["linear-gradient(135deg,#ffd6e6,#f7a8c8)", "💞"] },
    { g: "ziwei", zw: "money", id: "zw-money", chips: ["재물운"], title: "재백궁으로 보는 나의 돈 버는 방식", tags: ["재백궁", "재물"], thumb: ["linear-gradient(135deg,#fff1b8,#ffd97a)", "💰"] },
    { g: "ziwei", zw: "job", id: "zw-job", chips: ["직업운"], title: "관록궁으로 보는 나에게 맞는 일", tags: ["관록궁", "직업"], thumb: ["linear-gradient(135deg,#d6ecff,#a9cdf5)", "💼"] },
    { g: "ziwei", zw: "sihua", id: "zw-sihua", chips: ["성향", "재물운"], title: "타고난 사화(四化) — 내 인생의 복과 숙제", tags: ["화록", "화기"], thumb: ["linear-gradient(135deg,#ffe1cc,#f5b896)", "🔮"] },
    // 손금
    ...PALMS.map((p) => ({ g: "palm", id: p.id, chips: p.chips, title: p.title, tags: p.tags, palm: p })),
    { g: "palm", id: "st-palm", chips: ["손금보는법"], title: "손금 보는 법 — 4대 손금 찾기", tags: ["기초"], palmGuide: true, story: STORIES.find((s) => s.id === "st-palm") },
    // 스토리
    ...STORIES.filter((s) => STORY_G[s.chips[0]]).map((s) => ({ g: STORY_G[s.chips[0]], id: s.id, chips: ["읽을거리"], title: s.title, tags: s.tags, story: s, thumb: ["linear-gradient(135deg,#f3e6d6,#e4cfb4)", "📜"] })),
  ];
}

/* ---------- 찜 (이 기기에만) ---------- */
const LIKE_KEY = "hae.freeLikes.v1";
const likes = () => { try { return new Set(JSON.parse(localStorage.getItem(LIKE_KEY) || "[]")); } catch { return new Set(); } };
function toggleLike(id) { const s = likes(); s.has(id) ? s.delete(id) : s.add(id); try { localStorage.setItem(LIKE_KEY, JSON.stringify([...s])); } catch { /* ignore */ } return s.has(id); }
function likeBtn(id) {
  const b = el("button", { type: "button", class: "fg-like" + (likes().has(id) ? " on" : ""), "aria-label": "찜하기", onclick: (e) => { e.stopPropagation(); const on = toggleLike(id); b.classList.toggle("on", on); b.querySelector("span").textContent = on ? "♥ 찜" : "♡ 찜"; toast(on ? "찜했어요" : "찜을 풀었어요"); } }, [el("span", { text: likes().has(id) ? "♥ 찜" : "♡ 찜" })]);
  return b;
}

/* =========================================================
   목록 화면 #/free
   ========================================================= */
/* 운세·타로 탭의 '어떤 점술로 볼까?'에 합쳐 보여 주는 무료 운세 목록 (예전 #/free 화면은 없앰) */
export function freeCount(g) { return items().filter((x) => x.g === g).length; }
export function freeList(g, navigate, { exclude = [] } = {}) {
  const list = items().filter((x) => x.g === g && !exclude.includes(x.id)).map((x) => ({ ...x, topics: [...new Set(x.chips.map((c) => FG_TOPIC[c] || c))] }));
  const open = (x) => {
    if (x.tarotQ) { stash("oracle:question", x.tarotQ); return navigate("/oracle"); }
    if (x.to) return navigate(x.to);
    navigate(`/free/${x.id}`);
  };
  const frow = (x) => {
    const [tg, tc] = FG_TAG[x.g] || FG_TAG.saju;
    const em = x.thumb ? x.thumb[1] : x.g === "palm" ? "✋" : "✨";
    return el("button", { type: "button", class: "pm-row", "data-noterm": "", onclick: () => open(x) }, [
      el("span", { class: "pm-thumb", style: `--c:${tc};`, text: em }),
      el("span", { class: "pm-txt" }, [
        el("span", { class: "pm-tag", style: `--c:${tc};`, text: [tg, x.topics[0] || ""].filter(Boolean).join(" · ") }),
        el("b", { class: "pm-title", text: x.title }),
        el("span", { class: "pm-sub", text: x.tags.map((t) => "#" + t).join(" ") }),
      ]),
      el("span", { class: "pm-cost free" }, [el("span", { text: "무료" })]),
    ]);
  };
  return el("div", { class: "pm-list" }, list.map(frow));
}
const FG_GENRES = [["saju", "☯️", "사주"], ["tarot", "🃏", "타로"], ["ziwei", "🌌", "자미두수"], ["star", "⭐", "별자리"], ["palm", "✋", "손금"]];
const FG_SUB = { saju: "내 생일로 바로 보는", tarot: "한 장 뽑아 보는", ziwei: "별자리 명반으로 보는", star: "태양·금성·화성으로 보는", palm: "내 손을 보며 고르는" };
const FG_TAG = { saju: ["사주", "#ffc3d1"], tarot: ["타로", "#d9c4f2"], ziwei: ["자미두수", "#cdd8ff"], star: ["별자리", "#cfe8ff"], palm: ["손금", "#c4e8dc"] };
const FG_TOPIC = { 성격: "성향", 손금보는법: "읽을거리", 재미: "궁합" };
const FG_TOPIC_GROUPS = [
  { id: "love", label: "사랑", items: ["애정운", "궁합", "대인관계"] },
  { id: "life", label: "일·돈·몸", items: ["재물운", "직업운", "건강운"] },
  { id: "me", label: "나", items: ["성향", "고민"] },
  { id: "flow", label: "흐름·행운", items: ["행운", "월운", "읽을거리"] },
];
const FG_EMO = { 애정운: "💗", 궁합: "💞", 대인관계: "🤝", 재물운: "💰", 직업운: "💼", 건강운: "💊", 성향: "✨", 고민: "🔮", 행운: "🍀", 월운: "🌙", 읽을거리: "📜" };

/* =========================================================
   상세 화면 #/free/:id
   ========================================================= */
export function renderFreeItem({ navigate, id }) {
  loadDisclaimer();
  const x = items().find((i) => i.id === id);
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/fortune", "운세·타로")]));
  if (!x) { root.append(el("section", { class: "wrap" }, [noticeBox("info", "찾는 운세가 없어요.")])); return root; }
  root.append(pageHeader(GENRES.find((gg) => gg[0] === x.g)[1] + " · 무료", x.title, x.tags.map((t) => "#" + t).join(" ")));
  const host = el("section", { class: "wrap section-gap" });
  root.append(host);
  if (x.story) { host.append(storyView(x.story)); return root; }
  if (x.palm) { host.append(palmView(x.palm)); return root; }
  // 사주·자미두수·별자리·궁합 즉석 — 내 생일 필요 (게스트는 로그인 먼저)
  if (!isMember()) {
    try { sessionStorage.setItem("str.afterlogin", `/free/${id}`); } catch { /* ignore */ }
    host.append(noticeBox("info", "이 풀이는 내 생년월일이 필요해서 로그인 후 볼 수 있어요. 타로·손금·이야기 운세는 로그인 없이 볼 수 있어요."), el("button", { class: "btn btn-primary btn-block", onclick: () => navigate("/profile") }, [el("span", { text: "로그인하고 보기" })]));
    return root;
  }
  if (!getMyBirth()) {
    host.append(noticeBox("info", "내 생년월일이 필요해요."), el("button", { class: "btn btn-primary", onclick: () => navigate("/saju") }, [el("span", { text: "내 정보 입력하고 시작" })]));
    return root;
  }
  root.insertBefore(personSwitch(navigate, { title: "누구로 볼까?" }), host);
  const I = myInfo();
  const view = x.cv ? compatView(x.id, I) : x.zw ? ziweiView(x.zw, I) : x.g === "saju" ? sajuView(x.id, I) : starView(x.id, I);
  host.append(view);
  return root;
}

const card = (h, kids) => el("div", { class: "panel fg-res" }, [el("p", { class: "eyebrow", text: h }), ...kids.filter(Boolean)]);
const big = (t) => el("p", { class: "serif fg-big", text: t });
const p = (t) => el("p", { class: "fg-p", text: t });

function storyView(s) {
  return el("div", { class: "panel fg-story" }, s.body.map((t, i) => el("p", { class: i ? "" : "fg-lead", text: t })));
}

function palmView(P) {
  const wrap = el("div", { class: "section-gap" });
  const res = el("div", {});
  let side = "right", picked = -1;
  const SIDE = {
    left: { name: "왼손", sub: "타고난 운 · 선천", lead: "왼손(타고난 나)으로 보면" },
    right: { name: "오른손", sub: "노력으로 만든 운 · 후천", lead: "오른손(지금의 나)으로 보면" },
  };
  const seg = el("div", { class: "fg-hands", role: "radiogroup", "aria-label": "어느 손을 볼까요" });
  const note = el("p", { class: "fg-hands-note" });
  const paintSeg = () => {
    clear(seg);
    ["left", "right"].forEach((k) => seg.append(el("button", { type: "button", role: "radio", "aria-checked": String(side === k), class: "fg-hand" + (side === k ? " on" : ""), onclick: () => { if (side !== k) { side = k; paintSeg(); paintOpts(); } } }, [
      el("b", { text: SIDE[k].name }), el("small", { text: SIDE[k].sub }),
    ])));
    note.textContent = side === "right" ? "지금 내 모습·노력으로 바뀐 흐름을 봐요 · 남녀 상관없어요" : "타고난 성향·기질을 봐요 · 남녀 상관없어요";
  };
  const showRes = (o) => {
    clear(res);
    res.append(card(`${SIDE[side].lead} · ${o.lab.slice(0, 1)}`, [el("div", { class: "fg-res-palm" }, [
      el("div", { class: "fg-res-hand", "data-keep": "", html: handSvg(o.lines || [], { dots: o.dots || [], size: 120, side }) }),
      el("div", {}, [big(o.lab.replace(/^[①②③④]\s*/, "")), p(o.res)]),
    ])]));
  };
  const optsBox = el("div", { class: "fg-opts" + (P.opts.length === 4 ? " four" : "") });
  const paintOpts = () => {
    clear(optsBox);
    P.opts.forEach((o, i) => {
      optsBox.append(el("button", { type: "button", class: "fg-opt" + (picked === i ? " on" : ""), onclick: () => {
        picked = i; optsBox.querySelectorAll(".fg-opt").forEach((x, j) => x.classList.toggle("on", j === i));
        showRes(o); res.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } }, [el("div", { class: "fg-opt-img", html: handSvg(o.lines || [], { dots: o.dots || [], size: 110, side }) }), el("span", { text: o.lab })]));
    });
    if (picked >= 0) showRes(P.opts[picked]);
  };
  paintSeg(); paintOpts();
  wrap.append(seg, note, el("p", { class: "fg-q", text: P.q }), optsBox, res,
    noticeBox("info", "손금은 재미로 보는 참고예요. 손금은 살면서 바뀌기도 하니, 가볍게 즐겨 주세요."));
  return wrap;
}

function sajuView(id, I) {
  const { P, S, my } = I;
  const dm = P.dayMasterElem, cnt = P.elementCounts || {};
  const top = Object.keys(cnt).sort((a, b) => (cnt[b] || 0) - (cnt[a] || 0))[0];
  const y = S.yongsin[0];
  const day = P.pillars.day;
  if (id === "sj-impr") return card(`일주 ${day.gz || ""} · 일간 ${STEM_H[day.stemIdx]}`, [big(ILJU_IMPR[day.stemIdx].split(" — ")[1] || ""), p(ILJU_IMPR[day.stemIdx]), p(`일지(배우자·속마음 자리)는 ${ANIMALS[day.branchIdx]}띠 기운 — 겉으로는 ${ILJU_IMPR[day.stemIdx].split(" — ")[0]}이지만, 친해지면 ${["눈치 빠르고 실속 있는", "우직하고 끈기 있는", "용감하고 자존심 센", "온화하고 감각적인", "꿈이 크고 스케일 있는", "영리하고 신중한", "자유롭고 활동적인", "순하고 배려 깊은", "재치 있고 다재다능한", "깔끔하고 완벽주의인", "의리 있고 정직한", "넉넉하고 낙천적인"][day.branchIdx]} 모습이 나와요.`)]);
  if (id === "sj-talent") return card(`가장 강한 기운 · ${EK[top]}`, [big(SAJU_TALENT[top].split(" — ")[0]), p(SAJU_TALENT[top]), p(`그리고 나를 살리는 용신 ${EK[y]}의 재능(${SAJU_TALENT[y].split(" — ")[0]})을 키우면 운이 더 커져요.`)]);
  if (id === "sj-love") {
    const strong = /강|왕/.test(S.strength || "");
    return card(`일간 ${STEM_H[day.stemIdx]} · ${S.strength || ""}`, [big(strong ? "리드하는 연애" : "맞춰 주는 연애"), p(strong ? "연애에서도 주도권을 잡는 편이에요. 내가 정한 데이트, 내가 먼저 하는 고백 — 대신 상대 의견을 한 번 더 물어보면 완벽해요." : "상대에게 맞춰 주고 배려하는 편이에요. 다정함이 매력이지만, 서운한 건 쌓아 두지 말고 그때그때 말하는 연습이 필요해요."), p(`잘 맞는 상대: 내 사주에 필요한 ${EK[y]} 기운을 가진 사람 — 같이 있으면 편하고 일이 풀려요.`)]);
  }
  if (id === "sj-stress") return card(`나를 채우는 기운 · ${EK[y]}`, [big(SAJU_STRESS[y].split("·")[0]), p(`스트레스 받을 땐 이게 내 사주에 딱 맞는 회복법이에요 — ${SAJU_STRESS[y]}.`), p(`반대로 이미 많은 ${EK[top]} 기운을 더 키우는 건(${SAJU_STRESS[top]}) 잠깐은 좋아도 금방 지칠 수 있어요.`)]);
  if (id === "sj-luck") { const L = SAJU_LUCK[y]; return card(`용신 ${EK[y]}`, [big(`${L[0]} · ${L[1]} · ${L[2]}`), p(`행운의 색은 ${L[0]}, 숫자는 ${L[1]}, 방향은 ${L[2]}이에요.`), p("중요한 날엔 이 색을 작게라도 지니고, 책상·침대 머리를 이 방향으로 두면 기운이 모여요.")]); }
  if (/^sj-(temper|trait|outin|ideal|goodbad|angry|people|work|desire|mis|word|lack)$/.test(id)) {
    const T = godTally(P).group; const grpTop = GOD_ORDER.slice().sort((a, b) => T[b] - T[a])[0], G = GT[grpTop];
    const lack = Object.keys(cnt).length ? ["wood", "fire", "earth", "metal", "water"].sort((a, b) => (cnt[a] || 0) - (cnt[b] || 0))[0] : y;
    const basis = `가장 강한 십신: ${G.name} (${GOD_ORDER.map((g) => `${g} ${T[g]}`).join(" · ")})`;
    if (id === "sj-temper") { const E = ELEM_TEMPER[dm]; return card(`일간 ${STEM_H[day.stemIdx]} · ${EK[dm]} · ${S.strength || ""}`, [big(E[0]), p(E[1]), p(/강|왕/.test(S.strength || "") ? "사주 힘이 센 편 — 주관이 뚜렷하고 스스로 길을 만드는 기질이에요." : "사주 힘이 여린 편 — 주변과 조화를 이루며 섬세하게 맞추는 기질이에요."), p(`여기에 사주에 가장 많은 ${EK[top]} 기운이 더해져요 — ${ELEM_TEMPER[top][1]}`)]); }
    if (id === "sj-trait") return card("가장 두드러지는 특징", [big(G.name.split(" — ")[1]), p(G.trait + "."), p(basis)]);
    if (id === "sj-outin") { const O = splitGods(P); const A = GT[O.out], B = GT[O.inn]; return card("겉(천간) vs 속(지지)", [el("div", { class: "fg-vs" }, [el("div", {}, [el("b", { text: "😊 겉으로 보이는 나" }), p(A.out + "."), el("small", { class: "muted", text: A.name })]), el("div", {}, [el("b", { text: "🌙 내면의 나" }), p(B.in + "."), el("small", { class: "muted", text: B.name })])]), p(O.out === O.inn ? "겉과 속이 같은 기운 — 보이는 그대로의 솔직한 사람이에요. 대신 속마음을 숨기는 게 서툴러요." : `겉과 속이 다른 기운 — 처음 본 사람은 겉모습만 보고 판단하지만, 가까운 사람만 내면의 모습을 알아요. 믿을 만한 사람에게는 속마음을 조금씩 보여 줘도 괜찮아요.`)]); }
    if (id === "sj-ideal") { const idea = T.식상 + T.인성, real = T.재성 + T.관성, tot = Math.max(1, idea + real); const gap = Math.round(Math.abs(idea - real) / tot * 100); const head = idea > real ? "이상이 더 큰 사람" : idea < real ? "현실이 더 무거운 사람" : "이상과 현실이 균형 잡힌 사람";
      return card(`이상과 현실의 차이 ${gap}%`, [big(head), el("div", { class: "rc-vs" }, [el("span", { text: `이상 ${idea}` }), el("div", { class: "rc-vs-bar" }, [el("i", { style: `width:${Math.round(idea / tot * 100)}%` })]), el("span", { text: `현실 ${real}` })]),
        p(idea > real ? "꿈·생각(식상·인성)이 현실 감각(재성·관성)보다 커요. 아이디어는 넘치는데 ‘그래서 언제 하지?’에서 멈추기 쉬워요. 목표를 작게 쪼개 마감일을 붙이면 차이가 확 줄어요." : idea < real ? "해야 할 일·책임(재성·관성)이 꿈보다 커요. 현실은 잘 굴러가는데 ‘내가 진짜 원하는 게 뭐지?’ 하는 공허함이 올 수 있어요. 일주일에 한 번은 하고 싶은 일만 하는 시간을 꼭 만드세요." : "꿈과 현실을 같이 굴리는 드문 균형형이에요. 생각한 걸 실제로 만들어 내는 힘이 있어요."), p(gap >= 50 ? "차이가 큰 편 — 그만큼 성장할 여지가 커요." : gap >= 25 ? "적당한 차이 — 이상이 현실을 끌어올리는 좋은 긴장이에요." : idea === real ? "차이가 거의 없어요 — 생각한 대로 사는 편이에요." : "차이는 작은 편 — 조금만 실행하면 이상이 금방 현실이 돼요.")]); }
    if (id === "sj-goodbad") return card(G.name, [el("div", { class: "fg-vs" }, [el("div", {}, [el("b", { text: "👍 장점" }), p(G.good)]), el("div", {}, [el("b", { text: "👀 단점" }), p(G.bad)])]), p(`단점을 다루는 법: 내 ${grpTop} 기운은 ${ELEM_TEMPER[y] ? `용신 ${EK[y]}의 습관(${FILL[y]})으로 부드럽게 다듬을 수 있어요.` : "균형을 잡으면 장점이 돼요."}`)]);
    if (id === "sj-angry") return card("화날 때 · 스트레스 받을 때", [big(G.angry.split(".")[0]), p(G.angry + "."), p(`빨리 회복하는 법: ${SAJU_STRESS[y]}`)]);
    if (id === "sj-people") return card("대인관계 스타일", [big(G.people.split(" — ")[0]), p(G.people), p(basis)]);
    if (id === "sj-work") return card("일할 때의 나", [big(G.work.split(".")[0]), p(G.work), p(`용신 ${EK[y]} 기운이 있는 환경(${SAJU_LUCK[y][2]} 방향 자리, ${SAJU_LUCK[y][0]} 소품)에서 집중이 잘 돼요.`)]);
    if (id === "sj-desire") { const low = GOD_ORDER.slice().sort((a, b) => T[a] - T[b])[0]; return card("숨은 욕망", [big(G.desire), p(`가장 강한 ${grpTop} 기운의 마음이 진짜 원하는 것 — ${G.desire}.`), p(`그리고 가장 적은 ${low}(${GT[low].name.split(" — ")[1]}) 기운이 늘 아쉬워서, ${GT[low].desire}에도 은근히 끌려요.`)]); }
    if (id === "sj-mis") return card("사람들의 오해", [big(G.mis.split(" — ")[0]), p(G.mis + "."), p("오해를 줄이는 한마디: 내 의도를 먼저 한 문장으로 말해 주기 — ‘나는 이래서 이렇게 하는 거야’.")]);
    if (id === "sj-word") return card("나를 한 단어로", [big(`${G.word} ${["", "#성장", "#열정", "#신뢰", "#결단", "#지혜"][["", "wood", "fire", "earth", "metal", "water"].indexOf(dm)]}`), p(`${G.trait}.`), p(`${ELEM_TEMPER[dm][0]}.`)]);
    if (id === "sj-lack") return card(`가장 부족한 기운 · ${EK[lack]}`, [big(`${EK[lack]} 채우기`), p(`내 사주에 ${EK[lack]} 기운이 가장 적어요(${(cnt[lack] || 0)}개). 이 기운이 부족하면 ${({ wood: "새로 시작하는 힘과 유연함", fire: "표현력과 열정", earth: "안정감과 꾸준함", metal: "결단력과 마무리", water: "휴식과 깊은 생각" })[lack]}부분이 아쉬울 수 있어요.`), p(`채우는 법: ${FILL[lack]}.`), p(`다만 가장 도움이 되는 기운(용신)은 ${EK[y]} 기운이에요 — 부족한 것과 꼭 필요한 것이 같지는 않아요.`)]);
  }
  if (id === "sj-year") {
    const Y = new Date().getFullYear(), ys = ((Y - 4) % 10 + 10) % 10;
    const E5 = ["wood", "wood", "fire", "fire", "earth", "earth", "metal", "metal", "water", "water"];
    const ye = E5[ys];
    const KW = { same: ["독립", "내 힘으로 서는 해 — 동료·경쟁이 함께 와요"], out: ["표현", "말·글·재능을 꺼내는 해 — 보여 줄수록 기회가 와요"], wealth: ["결실", "돈과 성과를 거두는 해 — 계획한 걸 마무리하세요"], officer: ["책임", "자리와 역할이 생기는 해 — 인정받는 만큼 바빠요"], res: ["배움", "공부·자격·도움을 받는 해 — 실력을 쌓기 좋아요"] };
    const GEN = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" }, CT = { wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" };
    const k = ye === dm ? "same" : GEN[dm] === ye ? "out" : CT[dm] === ye ? "wealth" : CT[ye] === dm ? "officer" : "res";
    return card(`${Y}년 · ${STEM_H[ys]}년의 기운 ${EK[ye]}`, [big(`#${KW[k][0]}`), p(KW[k][1]), p(`올해 기운이 ${ye === y ? "내 용신과 같아서 흐름을 타기 좋은 해예요." : "내 용신과는 달라서, 용신 색·습관으로 균형을 맞추면 좋아요."}`)]);
  }
  return p("");
}

function starView(id, I) {
  const today = new Date();
  const sun = I.sun, ven = I.venus, mar = I.mars;
  if (id === "sr-charm") return card(`내 금성 · ${SIGN12[ven]}`, [big(VENUS_CHARM[ven].split(" — ")[0]), p(`태어날 때 사랑의 별 금성이 ${SIGN12[ven]}에 있었어요. 상대가 가장 먼저 느끼는 내 매력은 ‘${VENUS_CHARM[ven]}’이에요.`), p(`태양 별자리(${SIGN12[sun]})가 ‘나’라면, 금성은 ‘사랑받는 방식’이에요.`)]);
  if (id === "sr-mars") return card(`내 화성 · ${SIGN12[mar]}`, [big(MARS_POWER[mar].split(" — ")[0]), p(`행동의 별 화성이 ${SIGN12[mar]}에 있어요. 당신의 숨은 능력은 ‘${MARS_POWER[mar]}’!`), p("힘이 빠질 땐 이 능력을 쓰는 일을 하나 해 보세요 — 버프가 다시 켜져요.")]);
  if (id === "sr-venus-rx") {
    const R = venusRetro(today);
    if (!R) return p("금성 역행 정보를 계산하지 못했어요.");
    const h = (R.fromIdx - sun + 12) % 12;
    const when = `${R.from.y}년 ${R.from.m}월 ${R.from.d}일 ~ ${R.to.y}년 ${R.to.m}월 ${R.to.d}일`;
    return card(`금성 역행 · ${R.fromSign} → ${R.toSign}`, [big(when), p(`금성이 ${R.fromSign}에서 ${R.toSign} 쪽으로 거꾸로 걷는 기간이에요. 사랑과 돈의 별이 뒤돌아보는 때라, 새로 시작하기보다 ‘다시 보기’에 좋아요.`), p(`${SIGN12[sun]}인 당신에게는 ‘${HOUSE_AREA[h]}’ 영역에서 일어나요 — 이 분야의 지난 일(옛 연락·미뤄 둔 정리)이 다시 떠오를 수 있어요.`), p("이 기간엔 충동적인 고백·큰 쇼핑·성형 같은 큰 결정은 미루고, 이미 가진 관계를 다듬는 게 좋아요.")]);
  }
  if (id === "sr-month") {
    const M = today.getMonth() + 1, j = jdOf(today.getFullYear(), M, 15);
    const sunNow = signOf(((sunLongitude(j) % 360) + 360) % 360), vNow = signOf(planetLon("venus", j)), mNow = signOf(planetLon("mars", j));
    const hS = (sunNow - sun + 12) % 12, hV = (vNow - sun + 12) % 12, hM = (mNow - sun + 12) % 12;
    return card(`${M}월 · ${SIGN12[sun]}의 하늘`, [big(`이달의 무대: ${HOUSE_AREA[hS]}`), p(`태양이 ${SIGN12[sunNow]}에 있어 ${SIGN12[sun]}인 당신에게는 ‘${HOUSE_AREA[hS]}’에 스포트라이트가 비춰요.`), p(`사랑의 금성은 ${SIGN12[vNow]} — ‘${HOUSE_AREA[hV]}’에서 좋은 인연·기회가 와요.`), p(`행동의 화성은 ${SIGN12[mNow]} — ‘${HOUSE_AREA[hM]}’에서 힘을 쓰면 성과가 나지만, 다툼은 조심!`)]);
  }
  if (id === "sr-letgo") {
    const now = jdOf(today.getFullYear(), today.getMonth() + 1, today.getDate());
    let nm = null; try { nm = newMoonJD(now); if (nm < now - 3) nm = newMoonJD(nm + 29.5); } catch { /* ignore */ }
    let full = null; // 보름 — 달과 해가 180° 벌어지는 순간을 실제 위치로 찾음
    if (nm) { const el = (j) => ((moonLongitude(j) - sunLongitude(j)) % 360 + 360) % 360; let lo = nm + 12, hi = nm + 17.5; for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (el(mid) < 180) lo = mid; else hi = mid; } full = (lo + hi) / 2; }
    const fmt = (x) => { const d = dateOfJd(x + 0.375); return `${d.m}월 ${d.d}일`; };
    return card(`${SIGN12[sun]}의 비움 가이드`, [big(LETGO[sun].split(" — ")[0] + " 비우기"), p(`이달 ${SIGN12[sun]}가 내려놓으면 좋은 것: ${LETGO[sun]}.`), nm ? p(`🌑 새달(그믐·삭) ${fmt(nm)} — 비운 자리에 새 소원을 적어 두기 좋은 날이에요.`) : null, full ? p(`🌕 보름달 ${fmt(full)} — 다 쓴 물건·끝난 관계를 정리하기 좋은 날이에요.`) : null]);
  }
  if (id === "sr-match") {
    const r = SIGN12.map((_, i) => [i, signCompat(sun, i)[0]]).filter(([i]) => i !== sun).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const ps = peopleSigns(I.my);
    return card(`${SIGN12[sun]}의 찰떡 별자리`, [p(`나는 ${SIGN12[sun]} (${rangeOf(sun)}) — 아래 날짜에 태어난 사람이 나와 잘 맞아요.`), el("div", { class: "fg-rank" }, r.map(([i, s], k) => {
      const mine = ps.filter((x) => x.sign === i).map((x) => x.name);
      return el("div", { class: "fg-rank-i" }, [
        el("div", { class: "fg-rank-h" }, [el("b", { text: `${k + 1}위 ${SIGN12[i]}` }), el("span", { class: "fg-rank-d", text: rangeOf(i) })]),
        el("span", { text: `${s}점 · ${signCompat(sun, i)[1]}` }),
        mine.length ? el("span", { class: "fg-rank-me", text: `👥 내 사람 중 ${SIGN12[i]}: ${mine.join(", ")}` }) : null,
      ].filter(Boolean));
    }))]);
  }
  return p("");
}

function compatView(id, I) {
  const wrap = el("div", { class: "section-gap" });
  const out = el("div", {});
  if (id === "cp-tti") {
    const me = I.P.pillars.year.branchIdx;
    wrap.append(p(`나는 ${ANIMALS[me]}띠(사주의 띠는 입춘 기준) — 그 사람의 띠를 골라 보세요.`), el("div", { class: "fg-pick" }, ANIMALS.map((a, i) => el("button", { type: "button", class: "chip", onclick: (e) => {
      wrap.querySelectorAll(".fg-pick .chip").forEach((c) => c.classList.toggle("is-selected", c === e.currentTarget));
      const [sc, t, d] = ttiCompat(me, i); clear(out); out.append(card(`${ANIMALS[me]}띠 × ${a}띠`, [big(`${sc}점`), p(t), p(d)]));
    } }, [el("span", { text: `${a}띠` })]))), out);
  } else if (id === "cp-sign") {
    const me = I.sun;
    const show = (i, who) => {
      wrap.querySelectorAll(".fg-pick .chip").forEach((c) => c.classList.toggle("is-selected", c.dataset.i === String(i) && !c.dataset.who || (who && c.dataset.who === who)));
      const a = SIGN12[i]; const [sc, t] = signCompat(me, i); clear(out);
      out.append(card(`${SIGN12[me]} × ${who ? `${who}(${a})` : a}`, [big(`${sc}점`), p(t), p(`${EL_KR[SIGN_EL[me % 4]]}의 별자리와 ${EL_KR[SIGN_EL[i % 4]]}의 별자리가 만났어요.`)]));
    };
    const ps = peopleSigns(I.my);
    wrap.append(p(`나는 ${SIGN12[me]} (${rangeOf(me)}) — 그 사람의 생일이 들어가는 별자리를 골라 보세요.`));
    if (ps.length) wrap.append(el("p", { class: "fg-sub", text: "내 사람으로 바로 보기" }), el("div", { class: "fg-pick" }, ps.map((x) => el("button", { type: "button", class: "chip", "data-who": x.name, "data-i": String(x.sign), onclick: () => show(x.sign, x.name) }, [el("span", { text: `${x.name} · ${SIGN12[x.sign]}` })]))), el("p", { class: "fg-sub", text: "생일로 고르기" }));
    wrap.append(el("div", { class: "fg-pick fg-pick-sign" }, SIGN12.map((a, i) => el("button", { type: "button", class: "chip fg-sign-chip", "data-i": String(i), onclick: () => show(i) }, [el("b", { text: a }), el("small", { text: SIGN_RANGE[a].replace(/월 /g, ".").replace(/일/g, "").replace(/ ~ /, "~") })]))), out);
  }
  return wrap;
}


/* ---------- 자미두수 무료 풀이 (HAE) ---------- */
const ZW_PALACE = { ming: "명궁", love: "부처궁", money: "재백궁", job: "관록궁" };
const ZW_INTRO = {
  ming: "명궁(命宮)은 나 자신 — 타고난 성격과 삶의 태도를 보여 주는 자리예요.",
  love: "부처궁(夫妻宮)은 연인·배우자 자리 — 끌리는 사람과 연애할 때의 내 모습을 보여 줘요.",
  money: "재백궁(財帛宮)은 돈 자리 — 돈을 버는 방식과 쓰는 습관을 보여 줘요.",
  job: "관록궁(官祿宮)은 일 자리 — 잘 맞는 일과 일할 때의 내 모습을 보여 줘요.",
};
const ZW_FOCUS = { ming: ["persona", "strength", "shadow", "advice"], love: ["persona", "strength", "advice"], money: ["strength", "shadow", "advice"], job: ["persona", "strength", "advice"] };
const ZW_LABEL = { persona: "이런 사람", strength: "강점", shadow: "조심할 점", advice: "이렇게 써 보세요" };
const ZW_FOR = {
  love: { 자미: "존중해 주는 사람에게 끌려요 — 연애에서도 주도권을 쥐고 싶어 해요.", 천기: "말이 통하는 똑똑한 사람이 좋아요 — 생각이 많아 밀고 당기기에 약해요.", 태양: "밝고 당당한 사람과 잘 맞아요 — 아낌없이 주는 연애.", 무곡: "능력 있는 사람에게 끌려요 — 표현은 서툴지만 책임감은 최고.", 천동: "편안하고 다정한 연애 — 싸움이 적지만 게을러지지 않게.", 염정: "강렬하게 빠지는 타입 — 질투·집착을 조심.", 천부: "안정적인 사람과 오래 가요 — 생활력 있는 짝.", 태음: "섬세하고 다정한 연애 — 분위기와 감성이 중요해요.", 탐랑: "매력이 넘쳐 인기가 많아요 — 한 사람에게 정착하는 게 숙제.", 거문: "대화가 많은 연애 — 말 한마디에 상처받지 않게.", 천상: "배려하고 맞춰 주는 연애 — 내 마음도 말하기.", 천량: "어른스럽고 듬직한 사람과 잘 맞아요 — 나이 차가 있을 수도.", 칠살: "불꽃 같은 연애 — 빨리 시작하고 빨리 결정해요.", 파군: "변화가 많은 연애 — 지루하면 못 견뎌요." },
  money: { 자미: "큰 판을 보고 사람을 움직여 버는 돈.", 천기: "아이디어·기획·정보로 버는 돈.", 태양: "이름을 알리고 베풀수록 들어오는 돈.", 무곡: "재성(財星) — 실무·금융·전문 기술로 착실하게 모으는 돈.", 천동: "편하게 들어오지만 쉽게 나가는 돈 — 자동 저축 필수.", 염정: "경쟁 속에서 버는 돈 — 승부욕이 무기.", 천부: "곳간의 별 — 모으고 지키는 데 강해요.", 태음: "부동산·꾸준한 저축으로 쌓이는 돈.", 탐랑: "사람·취미·다양한 수입원으로 버는 돈.", 거문: "말·상담·강의로 버는 돈.", 천상: "좋은 조직·파트너와 함께 버는 돈.", 천량: "자격증·전문직으로 오래 버는 돈.", 칠살: "한 번에 크게 — 기복이 있으니 비상금 필수.", 파군: "새 길을 여는 돈 — 쓰는 것도 크니 관리가 중요." },
  job: { 자미: "리더 · 관리자 · 경영", 천기: "기획 · 연구 · IT · 분석", 태양: "교육 · 공공 · 방송 · 사람을 비추는 일", 무곡: "금융 · 기술 · 실무 전문직", 천동: "서비스 · 복지 · 편안함을 주는 일", 염정: "법 · 경쟁 · 영업 · 예술", 천부: "관리 · 회계 · 안정된 조직", 태음: "디자인 · 기획 · 부동산 · 섬세한 일", 탐랑: "엔터 · 마케팅 · 영업 · 다재다능", 거문: "말 · 상담 · 법 · 강의", 천상: "비서 · 행정 · 조율 · 서포트", 천량: "의료 · 교육 · 보험 · 사람을 돌보는 일", 칠살: "개척 · 스타트업 · 현장 · 군경", 파군: "창업 · 혁신 · 변화가 많은 일" },
};
function ziweiView(kind, I) {
  let z; try { z = computeZiwei(I.my); } catch { return noticeBox("info", "자미두수 명반을 만들지 못했어요. 생년월일을 확인해 주세요."); }
  const wrap = el("div", { class: "section-gap" });
  if (z.timeUnknown) wrap.append(noticeBox("info", "태어난 시간을 모르면 명궁 자리가 달라질 수 있어요. 시간을 넣으면 더 정확해져요."));
  if (kind === "sihua") {
    const SH = { "화록(祿)": ["복이 들어오는 별", "이 별이 가는 곳에 재물·기회가 따라와요."], "화권(權)": ["힘을 쥐는 별", "이 별이 가는 곳에서 주도권과 실력을 발휘해요."], "화과(科)": ["이름을 알리는 별", "이 별이 가는 곳에서 명예·평판·합격운이 좋아요."], "화기(忌)": ["숙제의 별", "이 별이 가는 곳은 집착·걱정이 생기기 쉬워 조심하면 오히려 성장해요."] };
    const palOf = (star) => (z.palaces.find((pp) => pp.stars.some((x) => x.name === star)) || {}).name || "-";
    wrap.append(card(`${z.yearGZH || z.yearGZ}년생의 사화(四化)`, [p("태어난 해의 천간이 네 별에 붙인 꼬리표예요. 어느 궁(자리)에 들어갔는지가 내 인생의 복과 숙제를 알려 줘요.")]));
    (z.sihua || []).forEach((h) => { const m = SH[h.label] || ["", ""]; wrap.append(card(`${h.label} · ${m[0]}`, [big(`${h.star} → ${palOf(h.star)}`), p(m[1])])); });
    return wrap;
  }
  const pal = z.palaces.find((pp) => pp.name === ZW_PALACE[kind]);
  const MAIN = Object.keys(STAR_MEANING);
  let main = (pal ? pal.stars : []).map((x) => x.name).filter((n) => MAIN.includes(n));
  let borrowed = false;
  if (!main.length && pal) { // 주성이 없으면 맞은편 궁의 별을 빌려 봐요(차성)
    const opp = z.palaces.find((pp) => pp.index === (pal.index + 6) % 12);
    main = (opp ? opp.stars : []).map((x) => x.name).filter((n) => MAIN.includes(n)); borrowed = true;
  }
  const others = (pal ? pal.stars : []).map((x) => x.name).filter((n) => !MAIN.includes(n));
  wrap.append(card(`${ZW_PALACE[kind]} · ${pal ? `${pal.branchH}(${pal.branch})` : ""}`, [
    big(main.length ? main.join(" · ") : "빈 궁"),
    p(ZW_INTRO[kind]),
    borrowed ? p("이 궁에는 주성(主星)이 없어서, 맞은편 궁의 별을 빌려 읽어요(차성 借星).") : null,
    others.length ? el("p", { class: "tiny muted", text: `함께 있는 별: ${others.join(" · ")}` }) : null,
  ]));
  main.slice(0, 2).forEach((n) => {
    const M = STAR_MEANING[n] || {};
    const extra = ZW_FOR[kind] && ZW_FOR[kind][n];
    wrap.append(card(`${n}${M.tag ? ` — ${M.tag}` : ""}`, [
      extra ? el("p", { class: "fg-p", style: "font-weight:700;", text: kind === "job" ? `잘 맞는 일: ${extra}` : extra }) : null,
      ...ZW_FOCUS[kind].filter((k) => M[k]).map((k) => el("p", { class: "fg-p" }, [el("b", { text: `${ZW_LABEL[k]} · ` }), document.createTextNode(M[k])])),
    ]));
  });
  wrap.append(el("button", { type: "button", class: "btn btn-ghost btn-block", onclick: () => { stash("ziwei:input", I.my); location.hash = "#/ziwei/result"; } }, [el("span", { text: "내 자미두수 명반 전체 보기 ›" })]));
  return wrap;
}
