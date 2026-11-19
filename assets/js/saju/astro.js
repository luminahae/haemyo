
/* =========================================================
   천문 계산 — 절기(태양 황경)와 삭(신월) 계산의 기초.
   Meeus, "Astronomical Algorithms" 저정밀 공식 사용.
   - 절기: 태양 겉보기 황경이 15°의 배수를 지나는 순간.
   - 일주: 율리우스적일(JDN) 기반 육십갑자.
   - 삭(신월): 달-태양 이각(elongation)이 0이 되는 순간(음력 월경계).
   ΔT(TT-UT)는 1900~2100 범위에서 수십 초 수준이라 날짜 판정에 영향이
   거의 없어 근사(무시)한다. 시각 표기는 분 단위 오차가 있을 수 있다.
   ========================================================= */

const D2R = Math.PI / 180;
const rev = (x) => ((x % 360) + 360) % 360;

/** 그레고리력 날짜(정오 기준) → 율리우스적일 정수 (일주 계산용) */
export function jdnFromDate(Y, M, D) {
  const a = Math.floor((14 - M) / 12);
  const y = Y + 4800 - a;
  const m = M + 12 * a - 3;
  return D + Math.floor((153 * m + 2) / 5) + 365 * y +
    Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

/** 그레고리력 날짜/시각(UT) → 율리우스일(JD, 소수) */
export function jdFromUT(Y, M, D, hours = 0) {
  let y = Y, m = M;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) +
    D + B - 1524.5 + hours / 24;
}

/** 지역 시각(로컬) → UT JD (tzOffset 시간 단위, 예: KST=+9) */
export function jdFromLocal(Y, M, D, hh, mm, tzOffset) {
  return jdFromUT(Y, M, D, hh + mm / 60 - tzOffset);
}

/** 태양 겉보기 황경(도, 0~360). jd는 TT로 간주(ΔT 근사 무시). */
export function sunLongitude(jd) {
  const T = (jd - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const Mr = M * D2R;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mr) +
    0.000289 * Math.sin(3 * Mr);
  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * D2R);
  return rev(lambda);
}

/** 달 겉보기 황경(도). Meeus Ch.47 주요항 truncated (정밀도 ~수 분각). */
export function moonLongitude(jd) {
  const T = (jd - 2451545.0) / 36525;
  const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T * T * T / 538841;
  const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + T * T * T / 545868;
  const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T;
  const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + T * T * T / 69699;
  const F = 93.272095 + 483202.0175233 * T - 0.0036539 * T * T;
  const d = D * D2R, m = M * D2R, mp = Mp * D2R, f = F * D2R;
  // 주요 주기항(1e-6 도 단위 계수) — Meeus 표47.A 상위항
  let s = 0;
  s += 6288774 * Math.sin(mp);
  s += 1274027 * Math.sin(2 * d - mp);
  s += 658314 * Math.sin(2 * d);
  s += 213618 * Math.sin(2 * mp);
  s += -185116 * Math.sin(m);
  s += -114332 * Math.sin(2 * f);
  s += 58793 * Math.sin(2 * d - 2 * mp);
  s += 57066 * Math.sin(2 * d - m - mp);
  s += 53322 * Math.sin(2 * d + mp);
  s += 45758 * Math.sin(2 * d - m);
  s += -40923 * Math.sin(m - mp);
  s += -34720 * Math.sin(d);
  s += -30383 * Math.sin(m + mp);
  s += 15327 * Math.sin(2 * d - 2 * f);
  s += -12528 * Math.sin(mp + 2 * f);
  s += 10980 * Math.sin(mp - 2 * f);
  s += 10675 * Math.sin(4 * d - mp);
  s += 10034 * Math.sin(3 * mp);
  s += 8548 * Math.sin(4 * d - 2 * mp);
  s += -7888 * Math.sin(2 * d + m - mp);
  s += -6766 * Math.sin(2 * d + m);
  s += -5163 * Math.sin(d - mp);
  s += 4987 * Math.sin(d + m);
  s += 4036 * Math.sin(2 * d - m + mp);
  s += 3994 * Math.sin(2 * d + 2 * mp);
  s += 3861 * Math.sin(4 * d);
  s += 3665 * Math.sin(2 * d - 3 * mp);
  return rev(Lp + s / 1000000);
}

/** 달-태양 이각(도, -180~180). 0이면 삭(신월). */
function elongation(jd) {
  let e = moonLongitude(jd) - sunLongitude(jd);
  e = rev(e);
  return e > 180 ? e - 360 : e;
}

/**
 * 목표 태양황경(targetDeg, 0~360)을 지나는 순간의 JD를 구한다.
 * guessJD 근처에서 이분법으로 탐색. (절기 계산)
 */
import { TERM_EPOCH_JD, TERM_FIRST_LON, TERM_DATA } from "./jeolgi-data.js";
let _terms = null;
function terms() { if (!_terms) _terms = TERM_DATA.split(",").map((x) => TERM_EPOCH_JD + parseInt(x, 36) / 1440); return _terms; }
const TERM_STEP = 365.2422 / 24;
/** 표에서 jd 직전(같거나 이전)에 지난 절기의 인덱스 (-1: 범위 밖) */
function termIndexBefore(jd) {
  const T = terms();
  if (jd < T[0] || jd >= T[T.length - 1]) return -1;
  let lo = 0, hi = T.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (T[mid] <= jd) lo = mid; else hi = mid - 1; }
  return lo;
}
/** jd 시점에 마지막으로 지난 절기의 황경(15의 배수). 표 범위 밖이면 null */
export function termLonAt(jd) {
  const i = termIndexBefore(jd);
  return i < 0 ? null : (TERM_FIRST_LON + 15 * i) % 360;
}
export function solarTermJD(targetDeg, guessJD) {
  const T = terms();
  const r = ((targetDeg - TERM_FIRST_LON) % 360 + 360) % 360;
  if (r % 15 === 0 && guessJD > T[0] + 20 && guessJD < T[T.length - 1] - 20) {
    const k = r / 15;
    const i0 = Math.round((guessJD - T[0]) / TERM_STEP);
    let best = -1, bd = Infinity;
    for (let i = i0 - 30; i <= i0 + 30; i++) {
      if (i < 0 || i >= T.length || ((i % 24) + 24) % 24 !== k) continue;
      const dd = Math.abs(T[i] - guessJD);
      if (dd < bd) { bd = dd; best = i; }
    }
    if (best >= 0) return T[best];
  }
  return solarTermJDCalc(targetDeg, guessJD);
}
function solarTermJDCalc(targetDeg, guessJD) {
  // 목표 부근으로 이동: 태양은 하루 ~0.9856°. 초기 보정.
  let jd = guessJD;
  for (let i = 0; i < 4; i++) {
    let diff = ((targetDeg - sunLongitude(jd) + 540) % 360) - 180;
    jd += diff / 0.9856;
  }
  // 이분법 정밀화
  let lo = jd - 2, hi = jd + 2;
  const f = (x) => ((sunLongitude(x) - targetDeg + 540) % 360) - 180;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (f(lo) * f(mid) <= 0) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

/**
 * guessJD 이전(또는 근처)의 신월(삭) JD를 구한다.
 * 평균 삭망월 29.53일 기준으로 탐색.
 */
export function newMoonJD(guessJD) {
  let jd = guessJD;
  // 이각을 0으로: 달-태양 상대속도 ~12.19°/일
  for (let i = 0; i < 5; i++) {
    jd -= elongation(jd) / 12.19;
  }
  // 이분법 정밀화
  let lo = jd - 1, hi = jd + 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (elongation(lo) * elongation(mid) <= 0) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

/** JD(UT) → 지역 날짜 {Y,M,D} (tzOffset 적용). 자정 경계 판정용. */
export function localDateFromJD(jd, tzOffset) {
  const z = Math.floor(jd + 0.5 + tzOffset / 24);
  let a = z;
  if (z >= 2299161) {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    a = z + 1 + alpha - Math.floor(alpha / 4);
  }
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);
  const day = b - d - Math.floor(30.6001 * e);
  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;
  return { Y: year, M: month, D: day };
}

/* ===== (합침) lunar.js ===== */
/* =========================================================
   음력(태음태양력) ↔ 양력 변환.
   달력 데이터 테이블을 통째로 옮겨 적는 대신, 천문 계산(삭·중기)으로
   직접 월을 구성한다. (无中氣置閏: 중기가 없는 달을 윤달로)
   한국 민간 음력은 한국표준시(KST, +9) 기준으로 날짜 경계를 정한다.
   ========================================================= */


const KST = 9;
const localJDN = (jd, tz) => {
  const d = localDateFromJD(jd, tz);
  return jdnFromDate(d.Y, d.M, d.D);
};

/** 월 구간에 중기(태양황경 30°의 배수)가 포함되는가.
   중기의 '민간 날짜(KST 자정 기준)'가 그 달의 초하루~다음 초하루 이전에
   들면 포함으로 본다. (중기가 삭과 같은 날이면 그날이 초하루인 새 달에 속함) */
function hasMajorTerm(aJD, bJD, tz) {
  const startJDN = localJDN(aJD, tz);
  const endJDN = localJDN(bJD, tz);
  const lonA = solarLonAt(aJD);
  // 시작 시점 부근의 두 후보 중기(직전·다음 30° 배수)를 날짜로 검사
  for (const base of [Math.floor(lonA / 30) * 30, Math.floor(lonA / 30) * 30 + 30]) {
    const deg = ((base % 360) + 360) % 360;
    const t = solarTermJD(deg, aJD);
    const tJDN = localJDN(t, tz);
    if (tJDN >= startJDN && tJDN < endJDN) return true;
  }
  return false;
}
const solarLonAt = (jd) => sunLongitude(jd);

/**
 * 음력 해(lunarYear)의 12(또는 13)개월을 구성.
 * 반환: [{ startJDN, number(1~12), leap(bool) }, ...]  (정월=1 … 12월)
 */
export function buildLunarYear(lunarYear, tz = KST) {
  // 동지(태양황경 270°)를 포함하는 달이 11월
  const dzPrev = solarTermJD(270, jdFromUT(lunarYear - 1, 12, 22, 0));
  const dzThis = solarTermJD(270, jdFromUT(lunarYear, 12, 22, 0));

  const m11a = monthStartOf(dzPrev, tz); // (lunarYear-1)의 11월 삭
  const m11b = monthStartOf(dzThis, tz); // (lunarYear)의 11월 삭

  // m11a 부터 삭들을 순서대로 수집 (m11b+1개월까지)
  const starts = [m11a];
  let cur = m11a;
  for (let i = 0; i < 15; i++) {
    cur = newMoonJD(cur + 29.53);
    starts.push(cur);
    if (localJDN(cur, tz) > localJDN(m11b, tz)) break; // m11b를 지나면 하나 더 담고 종료
  }

  // m11a~m11b 사이 달 수 (13이면 윤달 있음)
  const idx11b = starts.findIndex((s) => localJDN(s, tz) === localJDN(m11b, tz));
  const isLeapYear = idx11b === 13;

  // 윤달 위치: 중기 없는 첫 달 (m11a 다음부터 m11b 이전까지)
  let leapIndex = -1;
  if (isLeapYear) {
    for (let i = 1; i < idx11b; i++) {
      if (!hasMajorTerm(starts[i], starts[i + 1], tz)) { leapIndex = i; break; }
    }
  }

  // 번호 매기기: idx0 = 11월
  const months = [];
  let num = 11;
  for (let i = 0; i < starts.length; i++) {
    let leap = false;
    if (i === leapIndex) {
      leap = true; // 윤달: 앞 달과 같은 번호
    } else {
      if (i > 0) num = (num % 12) + 1;
    }
    months.push({ startJDN: localJDN(starts[i], tz), number: num, leap });
  }
  // 정월(첫 번호 1)부터 그 해 12월까지 = index 2 ~ (12 또는 13개)
  const start = months.findIndex((m) => m.number === 1 && !m.leap);
  return months.slice(start, start + (isLeapYear ? 13 : 12));
}

function monthStartOf(termJD, tz) {
  // 해당 절기 시점을 포함하는 달의 삭(그 이전 가장 가까운 신월).
  // 이전 달로 넘어갈 때는 한 삭망월(~29.5일)만큼 물러나야 한다.
  let nm = newMoonJD(termJD + 1);
  while (localJDN(nm, tz) > localJDN(termJD, tz)) nm = newMoonJD(nm - 29.53);
  return nm;
}

/** 음력(윤달 포함) → 양력 {Y,M,D} */
function astroLunarToSolar(lunarYear, month, isLeap, day, tz = KST) {
  const year = buildLunarYear(lunarYear, tz);
  const m = year.find((x) => x.number === month && x.leap === !!isLeap)
        || year.find((x) => x.number === month && !x.leap);
  if (!m) return null;
  const jdn = m.startJDN + (day - 1);
  return jdnToDate(jdn);
}

/** 양력 → 음력 { year, month, isLeap, day } */
function astroSolarToLunar(Y, M, D, tz = KST) {
  const targetJDN = jdnFromDate(Y, M, D);
  for (const ly of [Y, Y - 1, Y + 1]) {
    const year = buildLunarYear(ly, tz);
    for (let i = 0; i < year.length; i++) {
      const start = year[i].startJDN;
      const end = i + 1 < year.length ? year[i + 1].startJDN : start + 30;
      if (targetJDN >= start && targetJDN < end) {
        return { year: ly, month: year[i].number, isLeap: year[i].leap, day: targetJDN - start + 1 };
      }
    }
  }
  return null;
}

/** JDN(정수) → 그레고리력 날짜 */
function jdnToDate(jdn) {
  let a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return { Y: year, M: month, D: day };
}

export { jdnToDate };

/* =========================================================
   한국천문연구원(KASI) 기준 음력표 1900~2049 (음력 연도별: 설날 JDN·윤달·달 길이)
   천문 계산만으로는 삭(朔)이 자정 근처일 때 하루씩 어긋날 수 있어(예: 2017년 2월, 2033년 윤달 문제)
   이 범위 안에서는 공식 음력표를 우선 사용한다. 범위 밖은 천문 계산.
   ========================================================= */
const KASI_START = 1900;
const KASI = "241505180100101101101,24154350010010101110,24157890101001010111,241614450101001001101,24165270110100100110,24168810110110010101,241723640110101010101,24176200010101101010,24179740100110101101,241832920100101011101,24187130010010101110,241906761010010011011,24194510101001001101,24198050110100100101,242015951101100101001,24205430101101010101,24208980010101101010,242125221001011011010,24216360100101011101,242199170100101011011,24223750010010011011,24227290101001001011,242308351011001001011,24234670011010101001,24238210101011010100,242417541011010110101,24245600001010110110,24249140100101011011,242526920100100110111,24256530010010010111,242600760110010010110,24263900111001001010,24267440111010100101,242709950110110101001,24274830010110110101,24278380001010110110,242819231001010101110,24285760100100101110,242893071100100101101,24293140110010010101,24296680110101001010,243002261101101001010,24304060101101101001,24307610010101101101,243111640010101011011,24315000001001011101,24318540100100101101,243220821100100101011,24325920101010010101,243294671101010010101,24333300101101001010,24336840101101010101,243403950101011010101,24344230010011011011,24347780001001011011,243513231001001010111,24355160010100101011,243587081010100101011,24362540011010010101,24366080011010101010,243696261010110101010,24373460101010110101,24377010010010110110,243805541010010101110,24384390101001010111,24387940010100100111,243914830110100100110,24395310110110010101,243988670110101010101,24402700010101101010,24406240100110101101,244097950100101011101,24413630010010101110,24417170101001001110,244207141101001001101,24424550110100100101,244280981101010101001,24431930101101010100,24435470110101101010,244390261001011011010,24442860100101011011,24446410010010011011,244499541010010011011,24453790101001001011,2445733a1011001001011,24461170011010100101,24464710011011010100,244682561011010110101,24472100001010110110,24475640100101011011,244791950100100110111,24483030010010010111,24486570011001001011,244901130110101001010,24493940111010100101,244974980110110101001,24501330010110101101,24504880001010110110,245084251001001101110,24512260100100101110,24515800110010010110,245193441110010010101,24523180110101001010,24526720110110100101,245302720101101010101,24534110010101101100,245376571010101011011,24541500001001011101,24545040100100101101,245485851100100101011,24552420101010010101,24555960101101001010,245595031011101001010,24563340101101010101,245668990101010110101,24570730010010111010,24574270101001011011,245778250101001010111,24581660010100101011,24585200101010010101,245887441011010010101,24592580011010101010,24596120101011010101,245996720101010110101,24603510010010110110,246070561010010101110,24610890101001010111,24614440010100100111,246179850110100100110,24621810110110010011,24625360010110101010,246289031010101101010,24632740100101101101,2463629b0100101011101,24640130010010101110,24643670101001001101,246472161101001001101,24651050110100100101,24654590110101010010,246581351101101010100,24661970101101101010,24665520100101101101,246690720100101011011,24672910010010011011,246764571010010010111,24680290101001001011,24683830101100100101,246873751011010100101,24691210011011010100,24694750101011011010".split(",").map((r) => {
  const jdn = Number(r.slice(0, 7)), leap = parseInt(r[7], 16), bits = r.slice(8);
  const months = [];
  for (let m = 1, i = 0; m <= 12; m++) {
    months.push({ number: m, leap: false, len: bits[i++] === "1" ? 30 : 29 });
    if (m === leap) months.push({ number: m, leap: true, len: bits[i++] === "1" ? 30 : 29 });
  }
  return { jdn, leap, months };
});
function kasiYear(ly) { return KASI[ly - KASI_START] || null; }
export function lunarToSolar(lunarYear, month, isLeap, day, tz = KST) {
  const Yr = kasiYear(lunarYear);
  if (!Yr) return astroLunarToSolar(lunarYear, month, isLeap, day, tz);
  let jdn = Yr.jdn;
  for (const m of Yr.months) {
    if (m.number === month && m.leap === !!isLeap) {
      if (day < 1 || day > m.len) return null;
      return jdnToDate(jdn + day - 1);
    }
    jdn += m.len;
  }
  return null; // 그해에 없는 윤달
}
export function solarToLunar(Y, M, D, tz = KST) {
  const t = jdnFromDate(Y, M, D);
  for (const ly of [Y, Y - 1]) {
    const Yr = kasiYear(ly);
    if (!Yr) continue;
    let jdn = Yr.jdn;
    if (t < jdn) continue;
    for (const m of Yr.months) {
      if (t < jdn + m.len) return { year: ly, month: m.number, isLeap: m.leap, day: t - jdn + 1 };
      jdn += m.len;
    }
  }
  return astroSolarToLunar(Y, M, D, tz);
}
/** 해당 음력 달의 날 수 (윤달 포함) — 입력 검증용 */
export function lunarMonthDays(lunarYear, month, isLeap) {
  const Yr = kasiYear(lunarYear);
  if (!Yr) return 30;
  const m = Yr.months.find((x) => x.number === month && x.leap === !!isLeap);
  return m ? m.len : 0;
}
export function lunarLeapMonth(lunarYear) { const Yr = kasiYear(lunarYear); return Yr ? Yr.leap : 0; }
