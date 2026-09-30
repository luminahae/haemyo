/* 입력 검증 — 생년월일/시간 등. 브라우저 기본 Date API만 사용. */

/** YYYY-MM-DD 문자열을 검증하고 파싱. 잘못된 조합/미래 날짜 판별 */
export function validateBirthDate(dateStr) {
  if (!dateStr) return { ok: false, message: "생년월일을 입력해 주세요." };
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return { ok: false, message: "날짜 형식이 올바르지 않습니다." };
  const y = +m[1], mo = +m[2], d = +m[3];

  if (y < 1900) return { ok: false, message: "1900년 이후 날짜를 입력해 주세요." };
  if (mo < 1 || mo > 12) return { ok: false, message: "월은 1~12 사이여야 합니다." };

  // 잘못된 날짜 조합 검증 (예: 2월 30일)
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
    return { ok: false, message: "존재하지 않는 날짜입니다. 다시 확인해 주세요." };
  }

  // 미래 날짜 검증
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (dt.getTime() > today.getTime()) {
    return { ok: false, message: "미래 날짜는 입력할 수 없습니다." };
  }

  return { ok: true, date: dt };
}

/** HH:MM 검증 */
export function validateBirthTime(timeStr, unknown) {
  if (unknown) return { ok: true };
  if (!timeStr) return { ok: false, message: "출생 시간을 입력하거나 ‘모름’을 선택해 주세요." };
  const m = /^(\d{2}):(\d{2})$/.exec(timeStr);
  if (!m) return { ok: false, message: "시간 형식이 올바르지 않습니다." };
  const h = +m[1], mi = +m[2];
  if (h > 23 || mi > 59) return { ok: false, message: "시간이 올바르지 않습니다." };
  return { ok: true };
}

/** 전체 폼 검증. 반환: { ok, errors: {fieldName: message} } */
export function validateBirthInput(input) {
  const errors = {};
  const bd = validateBirthDate(input.birthDate);
  if (!bd.ok) errors.birthDate = bd.message;

  const bt = validateBirthTime(input.birthTime, input.timeUnknown);
  if (!bt.ok) errors.birthTime = bt.message;

  if (!input.gender) errors.gender = "성별을 선택해 주세요.";
  if (!input.focus || input.focus.length === 0) {
    errors.focus = "집중해서 보고 싶은 분야를 하나 이상 선택해 주세요.";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}
