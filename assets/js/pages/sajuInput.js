import { el, $$, validateBirthInput, icon, ymdPicker } from "../utils/dom.js";
import { saveDraft, getDraft, stash, saveMyBirth, getMyBirth } from "../state.js";
import { personSwitch } from "./people.js";
/* (합침) ./manseView.js 에서 가져오던 것 — 이제 같은 파일 */
import { pageHeader, backLink, noticeBox, loadDisclaimer } from "./shared.js";
const FOCUS = [
  { id: "personality", label: "기본 성격" },
  { id: "relationship", label: "인간관계" },
  { id: "love", label: "연애" },
  { id: "marriage", label: "결혼" },
  { id: "money", label: "재물" },
  { id: "career", label: "직업" },
  { id: "timeline", label: "가까운 시기의 흐름" },
  { id: "habits", label: "개선해야 할 습관" },
];

const TIMEZONES = [
  { id: "Asia/Seoul", label: "대한민국 (Asia/Seoul, UTC+9)" },
  { id: "Asia/Tokyo", label: "일본 (Asia/Tokyo, UTC+9)" },
  { id: "Asia/Shanghai", label: "중국 (Asia/Shanghai, UTC+8)" },
  { id: "America/Los_Angeles", label: "미국 서부 (UTC-8/-7)" },
  { id: "America/New_York", label: "미국 동부 (UTC-5/-4)" },
  { id: "Europe/London", label: "영국 (UTC+0/+1)" },
  { id: "other", label: "기타 / 잘 모름" },
];

export function renderSajuInput({ navigate, mode = "saju" }) {
  loadDisclaimer();
  // 저장된 '내 정보'가 있으면 폼을 자동으로 채운다 (다시 안 묻기)
  const draft = getMyBirth() || getDraft() || {};
  const isZiwei = mode === "ziwei";

  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(isZiwei
    ? pageHeader("자미두수", "출생 정보 입력", "자미두수 명반은 출생 ‘시(時)’가 특히 중요합니다. 모든 계산은 이 브라우저 안에서만 이뤄집니다.")
    : pageHeader("STEP 1", "사주 정보 입력", "정확한 생년월일을 입력할수록 성향 분석이 또렷해집니다. 모든 계산은 이 브라우저 안에서만 이뤄집니다."));
  root.append(personSwitch(navigate, { title: `누구의 ${mode === "ziwei" ? "자미두수" : "사주"}를 볼까? (고르면 아래 정보가 바로 채워져요)` }));

  const form = el("form", { class: "wrap section-gap", novalidate: true });

  // 이름/닉네임
  form.append(field({
    id: "name", label: "이름 또는 닉네임 (선택)",
    hint: "결과와 공유 이미지에 표시됩니다. 실명이 아니어도 됩니다.",
    control: el("input", { class: "input", id: "name", type: "text", value: draft.name || "",
      maxlength: "20", autocomplete: "off", placeholder: "예: 초승달" }),
  }));

  // 생년월일
  form.append(field({
    id: "birthDate", label: "생년월일", required: true,
    control: ymdPicker(draft.birthDate || "", { id: "birthDate", mode: () => ({
      lunar: (form.querySelector('input[name="calendarType"]:checked') || {}).value === "lunar",
      leap: !!(form.querySelector("#leapMonth") || {}).checked }) }),
    errorId: "err-birthDate",
  }));

  // 양력/음력 + 윤달
  const calSeg = seg("calendarType", [
    { v: "solar", label: "양력" },
    { v: "lunar", label: "음력" },
  ], draft.calendarType || "solar");
  const leapChk = el("input", { type: "checkbox", id: "leapMonth", checked: !!draft.leapMonth });
  const leapWrap = el("label", { class: "chip", id: "leap-wrap",
    style: "width:fit-content; margin-top:10px;" + (((draft.calendarType || "solar") === "lunar") ? "" : "display:none;") }, [
    leapChk, el("span", { class: "check" }, [icon("check")]), el("span", { text: "윤달(閏月)로 입력" }),
  ]);
  calSeg.addEventListener("change", () => {
    const lunar = calSeg.querySelector('input[value="lunar"]').checked;
    leapWrap.style.display = lunar ? "" : "none";
    const bdp = form.querySelector("#birthDate"); if (bdp && bdp.refresh) bdp.refresh();
  });
  leapChk.addEventListener("change", () => { const bdp = form.querySelector("#birthDate"); if (bdp && bdp.refresh) bdp.refresh(); });
  form.append(fieldset({
    legend: "달력 기준",
    control: el("div", {}, [calSeg, leapWrap]),
    hint: "음력 생일은 자동으로 양력으로 변환해 계산합니다. 윤달에 태어났다면 ‘윤달’을 함께 선택하세요.",
  }));

  // 출생 시간 + 모름
  const timeInput = el("input", { class: "input", id: "birthTime", type: "time", value: draft.birthTime || "" });
  const unknownChk = el("input", { type: "checkbox", id: "timeUnknown", checked: !!draft.timeUnknown });
  unknownChk.addEventListener("change", () => {
    timeInput.disabled = unknownChk.checked;
    timeInput.style.opacity = unknownChk.checked ? "0.5" : "1";
  });
  timeInput.disabled = unknownChk.checked;
  timeInput.style.opacity = unknownChk.checked ? "0.5" : "1";
  const sijin = sijinPicker(timeInput, () => ({
    birthDate: form.querySelector("#birthDate")?.value || "", birthTime: timeInput.value, timeUnknown: unknownChk.checked,
    calendarType: form.querySelector('input[name="calendarType"]:checked')?.value || "solar",
    leapMonth: form.querySelector("#leapMonth")?.checked || false, timezone: form.querySelector("#timezone")?.value || "Asia/Seoul",
  }));
  unknownChk.addEventListener("change", () => sijin.refresh());
  form.addEventListener("change", () => sijin.refresh());

  form.append(field({
    id: "birthTime", label: "출생 시간",
    control: el("div", { class: "section-gap" }, [
      timeInput,
      el("label", { class: "chip", style: "width:fit-content;" }, [
        unknownChk, el("span", { class: "check" }, [icon("check")]), el("span", { text: "출생 시간을 모름" }),
      ]),
      sijin,
    ]),
    hint: "시간을 모르면 시주(時柱)를 제외하고 분석합니다. 1948~1960년·1987~1988년 여름 출생은 서머타임을 자동으로 빼고 계산해요.",
    errorId: "err-birthTime",
  }));
  // 고급: 자시(子時) 기준
  const jasiSeg = seg("jasi", [{ v: "tong", label: "통자시 (23시부터 다음 날)" }, { v: "yaja", label: "야자시 (23~24시는 그날)" }], draft.jasi || "tong");
  form.append(el("details", { class: "adv-opt" }, [
    el("summary", { text: "고급 설정 · 밤 11시~새벽 1시(자시) 출생이라면" }),
    el("div", { class: "section-gap", style: "margin-top:10px;" }, [
      jasiSeg,
      el("p", { class: "tiny muted", text: "자시에 태어난 경우 학파에 따라 날짜(일주)를 다르게 봐요. 잘 모르면 기본값(통자시)을 그대로 두세요. 진태양시(서울 경도·균시차)로 보정한 시각 기준이에요." }),
    ]),
  ]));

  // 성별 (사주 대운은 성별로 방향이 갈려 남/여 중 하나가 필요)
  form.append(fieldset({
    legend: "성별", required: true,
    control: seg("gender", [
      { v: "female", label: "여성" },
      { v: "male", label: "남성" },
    ], draft.gender || ""),
    hint: "대운(운의 흐름)은 성별에 따라 순행·역행이 달라지므로 남/여 중 하나가 필요합니다.",
    errorId: "err-gender",
  }));

  // 지역/시간대
  form.append(field({
    id: "timezone", label: "출생 지역 / 표준 시간대",
    control: el("select", { class: "select", id: "timezone" },
      TIMEZONES.map((t) => el("option", { value: t.id, text: t.label, selected: (draft.timezone || "Asia/Seoul") === t.id }))
    ),
    hint: "시간대와 대표 경도로 진태양시를 보정해 시주(時柱)를 계산합니다.",
  }));

  // 집중 분야 (복수 선택)
  const focusSelected = new Set(draft.focus || ["personality"]);
  const focusGrid = el("div", { class: "chip-grid", role: "group", "aria-label": "집중 분야 (복수 선택 가능)" },
    FOCUS.map((f) => focusChip(f, focusSelected))
  );
  form.append(fieldset({
    legend: "집중해서 보고 싶은 분야 (복수 선택)", required: true,
    control: focusGrid,
    hint: "선택한 분야를 결과 상단에 우선 배치합니다.",
    errorId: "err-focus",
  }));

  // 개인정보 안내
  form.append(noticeBox("privacy",
    "생년월일과 출생 시간은 민감정보입니다. 입력값은 서버로 전송되지 않고 브라우저 안에서만 계산에 쓰이며, ‘결과 저장’을 누르기 전에는 기기에 남지 않습니다."));

  // 계산 방식 안내
  form.append(noticeBox("info",
    "절기(태양 황경)와 삭(음력 월경계)을 천문 계산으로 구해 실제 사주팔자(년·월·일·시주)와 오행 분포를 산출합니다. 해석은 이 명식을 바탕으로 한 성향 참고 자료입니다."));

  // 제출
  form.append(el("div", { style: "margin-top: var(--sp-4);" }, [
    el("button", { type: "submit", class: "btn btn-primary btn-block" },
      [el("span", { text: isZiwei ? "명반 보기" : "분석 시작하기" }), icon("arrowRight")]),
  ]));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = collect(form, focusSelected);
    const { ok, errors } = validateBirthInput(input);
    showErrors(form, errors);
    if (!ok) {
      const first = form.querySelector('[aria-invalid="true"], .field-error:not(:empty)');
      (first || form).scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    saveDraft(input);
    saveMyBirth(input); // 내 정보 기억 — 다음부턴 자동으로 채워짐
    if (isZiwei) {
      stash("ziwei:input", input);
      navigate("/ziwei/result");
    } else {
      stash("saju:input", input);
      navigate("/saju/loading");
    }
  });

  root.append(form);
  return root;
}

/* ---- helpers ---- */
function field({ id, label, hint, control, required, errorId }) {
  return el("div", { class: "field" }, [
    el("label", { for: id, html: label + (required ? ' <span class="gold" aria-hidden="true">*</span>' : "") }),
    control,
    hint ? el("p", { class: "hint", text: hint }) : null,
    errorId ? el("p", { class: "field-error", id: errorId, "aria-live": "polite" }) : null,
  ].filter(Boolean));
}

function fieldset({ legend, hint, control, required, errorId }) {
  return el("fieldset", { class: "field" }, [
    el("legend", { class: "fieldset-label", html: legend + (required ? ' <span class="gold" aria-hidden="true">*</span>' : "") }),
    control,
    hint ? el("p", { class: "hint", text: hint }) : null,
    errorId ? el("p", { class: "field-error", id: errorId, "aria-live": "polite" }) : null,
  ].filter(Boolean));
}

function seg(name, options, current) {
  return el("div", { class: "seg", role: "radiogroup" },
    options.map((o) => el("label", { class: "seg-opt" }, [
      el("input", { type: "radio", name, value: o.v, checked: current === o.v }),
      el("span", { text: o.label }),
    ]))
  );
}

function focusChip(f, selectedSet) {
  const input = el("input", { type: "checkbox", value: f.id, checked: selectedSet.has(f.id),
    "aria-label": f.label });
  const chip = el("label", { class: "chip" + (selectedSet.has(f.id) ? " is-selected" : "") }, [
    input, el("span", { class: "check" }, [icon("check")]), el("span", { text: f.label }),
  ]);
  input.addEventListener("change", () => {
    if (input.checked) selectedSet.add(f.id); else selectedSet.delete(f.id);
    chip.classList.toggle("is-selected", input.checked);
  });
  return chip;
}

function collect(form, focusSelected) {
  const val = (id) => (form.querySelector("#" + id) || {}).value || "";
  const radio = (name) => { const c = form.querySelector(`input[name="${name}"]:checked`); return c ? c.value : ""; };
  return {
    name: val("name").trim(),
    birthDate: val("birthDate"),
    birthTime: form.querySelector("#birthTime").value,
    timeUnknown: form.querySelector("#timeUnknown").checked,
    calendarType: radio("calendarType") || "solar",
    leapMonth: form.querySelector("#leapMonth").checked,
    gender: radio("gender"),
    timezone: val("timezone") || "Asia/Seoul",
    jasi: radio("jasi") || "tong",
    focus: [...focusSelected],
  };
}

function showErrors(form, errors) {
  const map = { birthDate: "err-birthDate", birthTime: "err-birthTime", gender: "err-gender", focus: "err-focus" };
  for (const [k, elId] of Object.entries(map)) {
    const node = form.querySelector("#" + elId);
    if (node) node.textContent = errors[k] || "";
  }
  const bd = form.querySelector("#birthDate");
  if (bd) bd.setAttribute("aria-invalid", errors.birthDate ? "true" : "false");
}

function todayStr() {
  const d = new Date(); const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* ===================================================================
   (합침) manseView.js — 파일 수를 줄이려고 이 파일 안으로 옮김 (HAE)
   =================================================================== */
import { personPicker } from "./people.js";
import { clear, toast } from "../utils/dom.js";

import { computeSaju } from "../saju/manse.js";

import { myeongsikCard } from "./sajuResult.js";
/* =========================================================
   만세력 바로 보기 (내 정보 저장 없이) + 출생 시진(자·축·인·묘…) 도우미
   - sijinPicker: 시간 입력 아래 12시진 칩 + "오후 2:30 · 미시(未時)" 표시
   - sijinLabel : 저장된 입력 → "오후 2:30 · 미시(未時)" 문자열
   ========================================================= */

/* 12시진 — 한국 표준시(동경 135°) 기준 흔히 쓰는 30분 보정 구간 */
export const SIJIN = [
  { kr: "자", h: "子", ani: "쥐", from: "23:30", to: "01:29", mid: "00:30" },
  { kr: "축", h: "丑", ani: "소", from: "01:30", to: "03:29", mid: "02:30" },
  { kr: "인", h: "寅", ani: "호랑이", from: "03:30", to: "05:29", mid: "04:30" },
  { kr: "묘", h: "卯", ani: "토끼", from: "05:30", to: "07:29", mid: "06:30" },
  { kr: "진", h: "辰", ani: "용", from: "07:30", to: "09:29", mid: "08:30" },
  { kr: "사", h: "巳", ani: "뱀", from: "09:30", to: "11:29", mid: "10:30" },
  { kr: "오", h: "午", ani: "말", from: "11:30", to: "13:29", mid: "12:30" },
  { kr: "미", h: "未", ani: "양", from: "13:30", to: "15:29", mid: "14:30" },
  { kr: "신", h: "申", ani: "원숭이", from: "15:30", to: "17:29", mid: "16:30" },
  { kr: "유", h: "酉", ani: "닭", from: "17:30", to: "19:29", mid: "18:30" },
  { kr: "술", h: "戌", ani: "개", from: "19:30", to: "21:29", mid: "20:30" },
  { kr: "해", h: "亥", ani: "돼지", from: "21:30", to: "23:29", mid: "22:30" },
];

/** "14:30" → "오후 2:30" (12시법) */
export function to12h(t) {
  const m = /^(\d{1,2}):(\d{2})/.exec(t || "");
  if (!m) return t || "";
  const h = +m[1];
  const ap = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ap} ${h12}:${m[2]}`;
}

/** 표 기준(30분 보정) 시진 번호 */
function tableIdx(t) {
  const m = /^(\d{1,2}):(\d{2})/.exec(t || "");
  if (!m) return -1;
  const min = (+m[1]) * 60 + (+m[2]);
  return Math.floor((((min + 30) % 1440) + 1440) % 1440 / 120);
}

/** 입력 → 시진 번호. 날짜가 있으면 실제 시주(진태양시)와 똑같이 계산 */
export function sijinIdx(input) {
  if (!input || input.timeUnknown || !input.birthTime) return -1;
  if (input.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(input.birthDate)) {
    try {
      const p = computeSaju({ calendarType: "solar", gender: "female", timezone: "Asia/Seoul", ...input, timeUnknown: false });
      if (p && p.pillars && p.pillars.hour) return p.pillars.hour.branchIdx;
    } catch { /* 표 기준으로 */ }
  }
  return tableIdx(input.birthTime);
}

/** "오후 2:30 · 미시(未時)" / "모름" */
export function sijinLabel(input) {
  if (!input || input.timeUnknown) return "모름";
  if (!input.birthTime) return "-";
  const i = sijinIdx(input);
  return i < 0 ? to12h(input.birthTime) : `${to12h(input.birthTime)} · ${SIJIN[i].kr}시(${SIJIN[i].h}時)`;
}

/**
 * 시간 입력 아래에 붙이는 시진 도우미.
 * getInput(): 현재 폼 값({birthDate, birthTime, timeUnknown, calendarType, leapMonth, timezone})
 */
export function sijinPicker(timeInput, getInput) {
  const now = el("p", { class: "sijin-now" });
  const chips = SIJIN.map((s, i) => {
    const b = el("button", { type: "button", class: "sijin-chip", title: `${to12h(s.from)} ~ ${to12h(s.to)}` }, [
      el("b", { text: `${s.kr}시` }), el("span", { class: "sijin-h", text: s.h }),
      el("span", { class: "sijin-range", text: `${to12h(s.from)}~` }),
    ]);
    b.addEventListener("click", () => {
      if (timeInput.disabled) return;
      timeInput.value = s.mid;
      timeInput.dispatchEvent(new Event("input", { bubbles: true }));
      timeInput.dispatchEvent(new Event("change", { bubbles: true }));
      update();
    });
    return b;
  });
  const grid = el("div", { class: "sijin-grid", role: "group", "aria-label": "12시진으로 고르기" }, chips);
  const wrap = el("div", { class: "sijin-wrap" }, [now, grid,
    el("p", { class: "hint", text: "시(時)만 알면 칩을 눌러도 돼요. 칩을 누르면 그 시진의 가운데 시각이 들어가요." })]);

  function update() {
    const inp = getInput();
    const i = sijinIdx(inp);
    chips.forEach((c, k) => c.classList.toggle("is-on", k === i));
    grid.style.opacity = inp.timeUnknown ? "0.45" : "1";
    if (inp.timeUnknown) { now.textContent = "출생 시간 모름 · 시주 없이 봐요"; return; }
    if (i < 0) { now.textContent = "시간을 넣거나 아래 시진을 골라 주세요"; return; }
    const s = SIJIN[i];
    let txt = `${to12h(inp.birthTime)} → ${s.kr}시(${s.h}時) · ${s.ani}의 시간`;
    const t = tableIdx(inp.birthTime);
    if (t !== i) txt += " (경계 시각이라 진태양시 보정으로 계산)";
    now.textContent = txt;
  }
  ["input", "change"].forEach((ev) => timeInput.addEventListener(ev, update));
  wrap.refresh = update;
  setTimeout(update, 0);
  return wrap;
}

/* ================= 만세력 바로 보기 페이지 ================= */
const TZS = [
  ["Asia/Seoul", "대한민국 (UTC+9)"], ["Asia/Tokyo", "일본 (UTC+9)"], ["Asia/Shanghai", "중국 (UTC+8)"],
  ["America/Los_Angeles", "미국 서부"], ["America/New_York", "미국 동부"], ["Europe/London", "영국"], ["other", "기타 / 잘 모름"],
];

export function renderManse({ navigate }) {
  const d = getMyBirth() || {};
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(pageHeader("만세력", "만세력 바로 보기", "내 정보 저장 없이 생년월일만 넣으면 사주 명식(년·월·일·시주)을 바로 보여줘요."));

  const dateI = ymdPicker(d.birthDate || "", { mode: () => ({ lunar: calSel.value !== "solar", leap: calSel.value === "leap" }) });
  const calSel = el("select", { class: "select" }, [["solar", "양력"], ["lunar", "음력"], ["leap", "음력 (윤달)"]].map(([v, t]) =>
    el("option", { value: v, text: t, selected: (d.calendarType === "lunar" ? (d.leapMonth ? "leap" : "lunar") : "solar") === v })));
  calSel.addEventListener("change", () => dateI.refresh());
  const timeI = el("input", { class: "input", type: "time", value: d.birthTime || "" });
  const unkC = el("input", { type: "checkbox", checked: !!d.timeUnknown });
  const genSel = el("select", { class: "select" }, [["female", "여성"], ["male", "남성"]].map(([v, t]) =>
    el("option", { value: v, text: t, selected: (d.gender || "female") === v })));
  const tzSel = el("select", { class: "select" }, TZS.map(([v, t]) => el("option", { value: v, text: t, selected: (d.timezone || "Asia/Seoul") === v })));

  const getInput = () => ({
    name: d.name || "",
    birthDate: dateI.value, birthTime: timeI.value, timeUnknown: unkC.checked,
    calendarType: calSel.value === "solar" ? "solar" : "lunar", leapMonth: calSel.value === "leap",
    gender: genSel.value, timezone: tzSel.value, focus: d.focus || ["personality"],
  });
  const picker = sijinPicker(timeI, getInput);
  const syncUnk = () => { timeI.disabled = unkC.checked; timeI.style.opacity = unkC.checked ? "0.5" : "1"; picker.refresh(); };
  unkC.addEventListener("change", syncUnk); syncUnk();
  [dateI, calSel, tzSel].forEach((x) => x.addEventListener("change", () => picker.refresh()));

  const err = el("p", { class: "field-error", "aria-live": "polite" });
  const out = el("div", {});
  const lbl = (t) => el("label", { class: "fieldset-label", text: t });

  const form = el("div", { class: "wrap section-gap" }, [
    el("div", { class: "panel section-gap" }, [
      el("div", { class: "field" }, [lbl("생년월일"), dateI]),
      el("div", { class: "field" }, [lbl("달력"), calSel]),
      el("div", { class: "field" }, [lbl("출생 시간"), timeI,
        el("label", { class: "chip", style: "width:fit-content; margin-top:8px;" }, [unkC, el("span", { class: "check" }), el("span", { text: "출생 시간 모름" })]),
        picker]),
      el("div", { class: "field" }, [lbl("성별 (대운 방향)"), genSel]),
      el("div", { class: "field" }, [lbl("출생 지역"), tzSel]),
      err,
      el("button", { class: "btn btn-primary btn-block", onclick: show }, [el("span", { text: "만세력 보기" })]),
    ]),
  ]);
  // 나 / 내 사람 불러오기 — 누르면 아래 칸이 채워지고 바로 만세력을 보여 줘요
  let pickHost = el("div", {});
  const paintPick = () => {
    const cur = getInput();
    const node = personPicker({ title: "누구의 만세력을 볼까? (누르면 바로 보여 줘요)", current: cur.birthDate ? cur : null, navigate, onPick: (inp) => {
      d.name = inp.name || "";
      dateI.value = inp.birthDate || ""; timeI.value = inp.birthTime || ""; unkC.checked = !!inp.timeUnknown;
      calSel.value = inp.calendarType === "lunar" ? (inp.leapMonth ? "leap" : "lunar") : "solar";
      genSel.value = inp.gender || "female"; tzSel.value = inp.timezone || "Asia/Seoul";
      syncUnk(); show(); paintPick();
    } });
    pickHost.replaceWith(node); pickHost = node;
  };
  root.append(pickHost);
  paintPick();
  root.append(form, el("section", { class: "wrap", style: "margin-top: var(--sp-4);" }, [out]));

  function show() {
    const input = getInput();
    const { ok, errors } = validateBirthInput(input);
    if (!ok) { err.textContent = errors.birthDate || errors.birthTime || errors.gender || "입력을 확인해 주세요."; return; }
    err.textContent = "";
    let profile;
    try { profile = computeSaju(input); } catch { err.textContent = "계산할 수 없는 날짜예요. 다시 확인해 주세요."; return; }
    clear(out);
    const s = profile.solar, l = profile.lunar, p2 = (n) => String(n).padStart(2, "0");
    out.append(
      el("div", { class: "report-meta", style: "margin-bottom:10px;" }, [
        ["양력", s ? `${s.Y}.${p2(s.M)}.${p2(s.D)}` : input.birthDate],
        ["음력", l ? `${l.year}.${p2(l.month)}.${p2(l.day)}${l.isLeap ? " (윤달)" : ""}` : "-"],
        ["출생 시간", sijinLabel(input)],
      ].map(([k, v]) => el("span", {}, [document.createTextNode(k + " "), el("b", { text: v })]))),
      myeongsikCard(profile, input),
      el("div", { class: "btn-row", style: "margin-top: var(--sp-4); flex-wrap:wrap;" }, [
        el("button", { class: "btn btn-primary", onclick: () => { saveDraft(input); saveMyBirth(input); navigate("/saju"); } }, [el("span", { text: "이 정보로 사주 리포트 보기" })]),
        el("button", { class: "btn btn-ghost", onclick: () => { saveMyBirth(input); toast("내 정보로 저장했어요. 다음부턴 자동으로 채워져요."); } }, [el("span", { text: "내 정보로 저장" })]),
      ]),
      noticeBox("info", "만세력은 저장하지 않아도 볼 수 있어요. ‘내 정보로 저장’을 누르면 다른 운세에서도 다시 입력하지 않아도 돼요."),
    );
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  return root;
}

/* ================= 한자 ↔ 한글 병기 =================
   천간·지지 한자가 한글 없이 혼자 쓰인 곳에 (한글)을 붙인다. 예: 庚 辛 → 庚(경) 辛(신), 酉戌 → 酉戌(유술) */
const HK = { 甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계",
  子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사", 午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해" };
const HK_RX = /(?<![一-鿿])([甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]+)(?![一-鿿(（])/g;
/** "庚" → "庚(경)" */
export function hk(s) { return String(s || "").replace(HK_RX, (m) => `${m}(${[...m].map((c) => HK[c]).join("")})`); }
const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "SELECT", "OPTION", "svg", "SVG", "CODE"]);
function skipEl(n) {
  for (let e = n; e && e.nodeType === 1; e = e.parentNode) {
    if (SKIP.has(e.nodeName) || e.namespaceURI === "http://www.w3.org/2000/svg") return true;
    if (e.dataset && e.dataset.nokr != null) return true;
    if (e.classList && (e.classList.contains("ms-tile-ch") || e.classList.contains("ms-ch"))) return true;
  }
  return false;
}
export function annotateHanja(root) {
  if (!root) return;
  if (root.nodeType === 3) { fixText(root); return; }
  if (root.nodeType !== 1 || skipEl(root)) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const list = []; let t;
  while ((t = w.nextNode())) list.push(t);
  list.forEach(fixText);
}
function fixText(t) {
  const v = t.nodeValue;
  if (!v || !/[甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]/.test(v)) return;
  if (t.parentNode && skipEl(t.parentNode)) return;
  const nv = hk(v);
  if (nv !== v) t.nodeValue = nv;
}
/** 화면에 새로 붙는 내용까지 자동 병기 */
export function startHanjaObserver(root) {
  annotateHanja(root);
  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === "characterData") fixText(m.target);
      else m.addedNodes.forEach(annotateHanja);
    }
  });
  mo.observe(root, { childList: true, subtree: true, characterData: true });
  return mo;
}
