/* =========================================================
   음력(태음태양력) ↔ 양력 변환.
   달력 데이터 테이블을 통째로 옮겨 적는 대신, 천문 계산(삭·중기)으로
   직접 월을 구성한다. (无中氣置閏: 중기가 없는 달을 윤달로)
   한국 민간 음력은 한국표준시(KST, +9) 기준으로 날짜 경계를 정한다.
   ========================================================= */

import {
  solarTermJD, newMoonJD, jdFromUT, jdnFromDate, localDateFromJD, sunLongitude,
} from "./astro.js";

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
export function lunarToSolar(lunarYear, month, isLeap, day, tz = KST) {
  const year = buildLunarYear(lunarYear, tz);
  const m = year.find((x) => x.number === month && x.leap === !!isLeap)
        || year.find((x) => x.number === month && !x.leap);
  if (!m) return null;
  const jdn = m.startJDN + (day - 1);
  return jdnToDate(jdn);
}

/** 양력 → 음력 { year, month, isLeap, day } */
export function solarToLunar(Y, M, D, tz = KST) {
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
