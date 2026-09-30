import { el, clear, toast, copyText } from "../utils/dom.js";
import { icon } from "../utils/icons.js";
import { validateBirthInput } from "../utils/validation.js";
import { savePerson, makeId, getMyBirth } from "../state.js";
import { grantFriendBundle } from "../wallet.js";
import { pageHeader, backLink, noticeBox, loadDisclaimer } from "./_shared.js";

/* 생일 정보를 링크에 담기 위한 base64url 인코딩 */
function enc(obj) {
  try { return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  catch { return ""; }
}
function dec(str) {
  try {
    const b = str.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(escape(atob(b))));
  } catch { return null; }
}
function baseUrl() { return location.href.split("#")[0]; }

/* ---------------- 친구가 자기 정보를 입력하는 초대 페이지 ---------------- */
export function renderInvite({ navigate }) {
  loadDisclaimer();
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(pageHeader("친구 초대", "해묘가 궁합을 봐줄게",
    "생년월일만 알려주면, 초대한 친구가 너와의 궁합·귀인 여부를 볼 수 있어. (정보는 이 브라우저에서만 처리돼요.)"));

  const host = el("section", { class: "wrap", style: "margin-top: var(--sp-2);" });
  root.append(host);

  const form = buildBirthForm((input) => {
    const link = `${baseUrl()}#/addfriend/${enc(input)}`;
    clear(host);
    host.append(el("div", { class: "panel panel-gold section-gap" }, [
      el("p", { style: "font-weight:700;", text: (input.name ? input.name + "님, " : "") + "정보 입력 완료!" }),
      el("p", { class: "muted", style: "font-size:var(--fs-sm);", text: "아래 버튼으로 나를 초대한 친구에게 이 링크를 보내면, 친구 목록에 자동으로 추가돼요." }),
      el("button", { class: "btn btn-primary btn-block", onclick: () => shareLink(link, input.name) }, [icon("share"), el("span", { text: "친구에게 내 정보 보내기" })]),
      el("button", { class: "btn btn-ghost btn-block", onclick: async () => { const ok = await copyText(link); toast(ok ? "링크를 복사했어요. 카톡에 붙여넣어 보내세요." : "복사 실패"); } }, [icon("copy"), el("span", { text: "링크 복사" })]),
    ]));
    host.append(noticeBox("info", "이 링크에는 생년월일 정보가 담겨 있어요. 초대한 친구에게만 보내세요."));
  });
  host.append(form);
  return root;
}

/* ---------------- 초대자가 받은 링크로 친구를 추가하는 페이지 ---------------- */
export function renderAddFriend({ navigate, data }) {
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/people", "내 사람들")]));
  const input = dec(data || "");
  if (!input || !input.birthDate) {
    root.append(pageHeader("친구 추가", "링크가 올바르지 않아요", "친구에게 다시 받아 주세요."));
    root.append(el("section", { class: "wrap" }, [el("button", { class: "btn btn-primary", onclick: () => navigate("/people") }, [el("span", { text: "내 사람들로" })])]));
    return root;
  }
  const name = input.name || "이름 미상";
  root.append(pageHeader("친구 추가", `${name}님을 추가할까요?`, "카톡으로 받은 친구 정보예요. 추가하면 사주·궁합·귀인 체크에 바로 쓸 수 있어요."));
  root.append(el("section", { class: "wrap" }, [
    el("div", { class: "panel section-gap" }, [
      el("p", { style: "font-weight:700;", text: name }),
      el("p", { class: "muted tiny", text: `${input.birthDate}${input.timeUnknown ? " · 시간 모름" : (input.birthTime ? " · " + input.birthTime : "")}${input.calendarType === "lunar" ? " · 음력" : ""} · ${input.gender === "female" ? "여성" : input.gender === "male" ? "남성" : ""}` }),
      el("button", { class: "btn btn-primary btn-block", onclick: () => {
        grantFriendBundle(getMyBirth(), input); // 카톡 초대 추가는 무료 + 궁합·귀인 무료 열람
        savePerson({ id: makeId("p"), name, input, createdAt: Date.now() });
        toast(`${name}님을 친구로 추가했어요 · 궁합·귀인 무료!`);
        navigate("/people");
      } }, [icon("plus"), el("span", { text: "친구로 추가 · 무료" })]),
      el("button", { class: "btn btn-quiet btn-block", onclick: () => navigate("/people") }, [el("span", { text: "취소" })]),
    ]),
  ]));
  return root;
}

/* 초대 링크를 카톡/문자 등으로 공유 (Web Share → 카톡 포함, 미지원 시 복사) */
export async function shareLink(link, name) {
  const text = `해묘에서 궁합 보려고 해! 아래 링크 눌러서 생일만 입력해줘 🐈\n`;
  if (navigator.share) {
    try { await navigator.share({ title: "해묘 친구 초대", text, url: link }); return; }
    catch (e) { if (e && e.name === "AbortError") return; }
  }
  const ok = await copyText(link);
  toast(ok ? "링크를 복사했어요. 카톡에 붙여넣어 보내세요." : "공유에 실패했어요.");
}

/* ---- 간단 생일 입력 폼 ---- */
function buildBirthForm(onSubmit) {
  const form = el("form", { class: "panel section-gap", novalidate: true });
  const nameI = el("input", { class: "input", type: "text", maxlength: "20", placeholder: "이름 / 닉네임" });
  const dateI = el("input", { class: "input", type: "date", max: todayStr(), required: true });
  const timeI = el("input", { class: "input", type: "time" });
  const unknownC = el("input", { type: "checkbox" });
  unknownC.addEventListener("change", () => { timeI.disabled = unknownC.checked; timeI.style.opacity = unknownC.checked ? "0.5" : "1"; });
  const calSeg = seg("i-cal", [{ v: "solar", label: "양력" }, { v: "lunar", label: "음력" }], "solar");
  const genSeg = seg("i-gen", [{ v: "female", label: "여성" }, { v: "male", label: "남성" }], "");
  const err = el("p", { class: "field-error", "aria-live": "polite" });

  form.append(
    fld("이름", nameI),
    fld("생년월일", dateI, true),
    fld("달력", calSeg),
    fld("출생 시간", el("div", { class: "section-gap" }, [timeI, el("label", { class: "chip", style: "width:fit-content;" }, [unknownC, el("span", { class: "check" }, [icon("check")]), el("span", { text: "시간 모름" })])])),
    fld("성별", genSeg, true),
    err,
    el("button", { type: "submit", class: "btn btn-primary btn-block", style: "margin-top: var(--sp-3);" }, [el("span", { text: "입력 완료" })]),
  );
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = {
      name: nameI.value.trim(), birthDate: dateI.value, birthTime: timeI.value, timeUnknown: unknownC.checked,
      calendarType: calSeg.querySelector("input:checked")?.value || "solar", leapMonth: false,
      gender: genSeg.querySelector("input:checked")?.value || "", timezone: "Asia/Seoul", focus: ["personality"],
    };
    const { ok, errors } = validateBirthInput(input);
    if (!ok) { err.textContent = errors.birthDate || errors.gender || "입력을 확인해 주세요."; return; }
    onSubmit(input);
  });
  return form;
}
function fld(label, control, req) {
  return el("div", { class: "field" }, [el("label", { html: label + (req ? ' <span class="gold">*</span>' : "") }), control]);
}
function seg(name, options, cur) {
  return el("div", { class: "seg", role: "radiogroup" }, options.map((o) => el("label", { class: "seg-opt" }, [el("input", { type: "radio", name, value: o.v, checked: cur === o.v }), el("span", { text: o.label })])));
}
function todayStr() { const d = new Date(); const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }
