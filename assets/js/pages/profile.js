import { el, clear, toast, icon } from "../utils/dom.js";
import { getProfiles, getActiveId, getActiveProfile, setActive, ensureProfile, createProfile, deleteProfile, hasPin, verifyPin, avatarEl, getAvatar, setAvatar, setProfilePhoto } from "../auth.js";
import { getResults, exportBackup, importBackup, getRecent, deleteResult } from "../state.js";
import { grantOnce, grantDailyLogin, getCoins, isUnlimited, getWallet, isAdmin, getKept, keepItem, unkeepItem } from "../wallet.js";
import { openedRows, fmtOpenTime, KEEP_DAYS } from "../openLog.js";
import { isCloudEnabled, getUser as getCloudUser, loginGoogle, loginGuest, loginEmail, signupEmail, resetPassword, logout as cloudLogout, pullResults, pushAll, pullState, pushState, clearGuestSlot, deleteAccount, setNickname, changePassword, linkGoogle, linkedProviders } from "../cloud.js";
import { openModal } from "./shared.js";
import { unreadReplies } from "./about.js";
import { personSwitch } from "./people.js";
import { pageHeader, backLink, noticeBox, recentCard } from "./shared.js";
function refreshHeader() { window.dispatchEvent(new Event("profilechange")); }

export function renderProfile({ navigate }) {
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(pageHeader("PROFILE", "로그인 · 프로필",
    isCloudEnabled() ? "Google·이메일로 로그인하면 폰·PC 어디서든 같은 정보로 이어서 볼 수 있어요." : "이 브라우저 안에서만 쓰는 로컬 프로필입니다. 프로필마다 저장한 결과가 따로 보관됩니다."));

  root.append(personSwitch(navigate, { title: "나 / 내 사람 — 누구 기준으로 볼까?" }));
  const body = el("div", { class: "wrap section-gap" });
  root.append(body);
  render();

  function render() {
    clear(body);

    // 클라우드(카카오/네이버) 로그인·동기화 패널
    const cloudBox = el("div", {});
    body.append(cloudBox);
    updateCloud(cloudBox);
    // 내가 열어 본 풀이 — 프로필(계정) 카드 바로 아래
    body.append(el("div", { class: "op-in-body" }, [openedPanel(navigate)]));

    const active = getActiveProfile();
    const activeId = getActiveId();

    // 클라우드 로그인을 쓰는 동안엔 예전 '로컬 프로필' 묶음은 숨김 (로그인은 위 카드 하나로)
    if (isCloudEnabled()) {
      body.append(el("button", { class: "btn btn-ghost btn-block", onclick: () => navigate("/people") }, [icon("users"), el("span", { text: "사람(친구) 추가하기" })]));
      body.append(el("button", { class: "btn btn-ghost btn-block", onclick: () => navigate("/about") }, [icon("info"), el("span", { text: "이용 안내 · 자주 묻는 질문" })]));
    body.append(helpRow(navigate));
      body.append(backupPanel());
      body.append(noticeBox("privacy", "로그인 전(게스트)에는 타로·무료 운세처럼 내 정보가 필요 없는 풀이만 볼 수 있어요. 로그인하면 내 정보는 내 계정에만 저장돼요. 다른 회원은 볼 수 없어요."));
      return;
    }

    // 현재 상태
    body.append(el("div", { class: "panel panel-gold section-gap" }, [
      el("div", { style: "display:flex; align-items:center; gap:12px;" }, [
        el("span", { style: "color:var(--c-gold); display:inline-flex;" }, [icon("users")]),
        el("div", { style: "flex:1;" }, [
          el("p", { class: "tiny muted", text: "현재 로그인" }),
          el("p", { style: "font-weight:700; font-size:1.1rem;", text: active ? active.name : "게스트 (로그인 안 함)" }),
        ]),
        el("span", { class: "tiny muted", text: `저장 ${getResults().length}건` }),
      ]),
      active ? el("button", { class: "btn btn-ghost btn-sm", onclick: () => { setActive(null); refreshHeader(); toast("게스트로 전환했어요."); render(); } },
        [icon("back"), el("span", { text: "게스트로 전환 (로그아웃)" })]) : null,
    ].filter(Boolean)));

    // 프로필 목록
    const profiles = getProfiles();
    if (profiles.length) {
      body.append(el("div", { class: "section-gap" }, [
        el("h3", { text: "프로필 선택" }),
        ...profiles.map((p) => profileRow(p, activeId === p.id, render)),
      ]));
    }

    // 회원 가입 (게스트일 때만)
    if (!active) body.append(signupBox(render));

    // 사람 추가하기
    body.append(el("button", { class: "btn btn-ghost btn-block", onclick: () => navigate("/people") },
      [icon("users"), el("span", { text: "사람(친구) 추가하기" })]));

    // 도움말
    body.append(el("button", { class: "btn btn-ghost btn-block", onclick: () => navigate("/about") },
      [icon("info"), el("span", { text: "이용 안내 · 자주 묻는 질문" })]));
    body.append(helpRow(navigate));

    // 백업 (기기 이동용)
    body.append(backupPanel());

    body.append(noticeBox("privacy",
      "서버 없는 로컬 프로필이에요. 다른 기기로 옮기려면 위의 Google·이메일 로그인이나 ‘백업 내보내기’를 쓰세요."));
  }

  function profileRow(p, isActive, rerender) {
    const pinArea = el("div", {});
    const row = el("div", { class: "panel", style: "display:flex; align-items:center; gap:12px; flex-wrap:wrap;" }, [
      el("span", { style: "color:var(--c-gold); display:inline-flex;" }, [icon(hasPin(p.id) ? "shield" : "users")]),
      el("div", { style: "flex:1; min-width:0;" }, [
        el("p", { style: "font-weight:600;", text: p.name + (isActive ? " · 사용 중" : "") }),
        el("p", { class: "tiny muted", text: hasPin(p.id) ? "PIN 잠금" : "잠금 없음" }),
      ]),
      isActive
        ? el("span", { class: "tiny gold", text: "현재 프로필" })
        : el("button", { class: "btn btn-primary btn-sm", onclick: () => login(p, pinArea, rerender) }, [el("span", { text: "로그인" })]),
      el("button", { class: "btn btn-ghost btn-sm", "aria-label": "삭제", onclick: () => del(p, rerender) }, [icon("trash")]),
    ]);
    return el("div", { class: "section-gap" }, [row, pinArea]);
  }

  function login(p, pinArea, rerender) {
    if (!hasPin(p.id)) { setActive(p.id); refreshHeader(); toast(`${p.name}(으)로 로그인했어요.`); rerender(); return; }
    clear(pinArea);
    const pin = el("input", { class: "input", type: "password", inputmode: "numeric", maxlength: "8", placeholder: "PIN 입력", "aria-label": "PIN" });
    const msg = el("p", { class: "field-error" });
    const go = () => {
      if (verifyPin(p.id, pin.value)) { setActive(p.id); refreshHeader(); toast(`${p.name}(으)로 로그인했어요.`); rerender(); }
      else { msg.textContent = "PIN이 올바르지 않습니다."; }
    };
    pin.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    pinArea.append(el("div", { class: "panel section-gap" }, [
      el("p", { class: "tiny muted", text: `${p.name} — PIN을 입력하세요` }),
      pin, msg,
      el("button", { class: "btn btn-primary btn-sm", onclick: go }, [el("span", { text: "확인" })]),
    ]));
    pin.focus();
  }

  function del(p, rerender) {
    if (p._c) { deleteProfile(p.id); refreshHeader(); toast("프로필을 삭제했어요. (저장 결과는 남아 있어요)"); rerender(); }
    else { p._c = true; toast("한 번 더 누르면 삭제됩니다."); setTimeout(() => { p._c = false; }, 2600); }
  }

  function signupBox(rerender) {
    const nameI = el("input", { class: "input", type: "text", maxlength: "20", placeholder: "이름 또는 닉네임" });
    const go = () => {
      if (!nameI.value.trim()) { toast("이름을 입력해 주세요."); return; }
      const prof = createProfile(nameI.value.trim(), null);
      setActive(prof.id);
      const b = grantOnce("signup:" + prof.id, 5);
      refreshHeader(); toast(b.ok ? `${prof.name} 가입 완료! 축하 코인 +5 🎁` : `${prof.name}(으)로 로그인했어요.`); rerender();
    };
    nameI.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    return el("div", { class: "panel section-gap" }, [
      el("h3", { text: "회원 가입하기" }),
      el("p", { class: "tiny muted", text: "이름만 정하면 끝! 가입하면 축하 코인 5개를 드려요." }),
      el("div", { class: "field" }, [nameI]),
      el("button", { class: "btn btn-primary btn-block", onclick: go }, [el("span", { text: "가입하고 시작 · 코인 +5" })]),
    ]);
  }

  function backupPanel() {
    const fileI = el("input", { type: "file", accept: "application/json,.json", style: "display:none;" });
    fileI.addEventListener("change", () => {
      const f = fileI.files[0]; if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          const res = importBackup(data, "merge");
          if (res.ok) { toast(`가져오기 완료 — ${res.added}건 추가.`); render(); }
          else toast(res.message);
        } catch { toast("파일을 읽을 수 없습니다."); }
      };
      reader.readAsText(f);
    });
    return el("div", { class: "panel section-gap" }, [
      el("h3", { text: "백업 · 기기 이동" }),
      el("p", { class: "muted", style: "font-size:var(--fs-sm);", text: "모든 프로필과 저장 결과를 파일로 내보내고, 다른 기기·브라우저에서 가져올 수 있습니다." }),
      el("div", { class: "btn-row bk-row" }, [
        el("button", { class: "btn btn-ghost btn-sm", onclick: doExport }, [icon("download"), el("span", { text: "백업 내보내기" })]),
        el("button", { class: "btn btn-ghost btn-sm", onclick: () => fileI.click() }, [icon("copy"), el("span", { text: "백업 가져오기" })]),
      ]),
      fileI,
    ]);
  }

  async function updateCloud(box) {
    clear(box);
    if (!isCloudEnabled()) {
      return; // 로그인 기능이 꺼진 배포(로컬 모드)에선 안내 없이 로컬 프로필만
    }
    box.append(el("div", { class: "panel section-gap au-wait" }, [el("p", { class: "muted", text: "로그인 상태 확인 중…" })]));
    let user = null;
    try { user = await getCloudUser(); } catch { /* ignore */ }
    clear(box);
    if (user) {
      const pid = "cloud_" + user.uid;
      const name = user.user_metadata.name || (user.email || "").split("@")[0] || "내 계정";
      ensureProfile(pid, name);
      if (getActiveId() !== pid) { setActive(pid); refreshHeader(); }
      const sb = user.anonymous ? { ok: false } : grantOnce("social:" + pid, 5); // 게스트는 Google 연결하면 그때 축하 코인
      if (sb.ok) toast("가입·연동 완료! 축하 코인 +5 🎁");
      const via = user.provider === "google.com" ? "Google" : user.anonymous ? "게스트" : "이메일";
      box.append(el("div", { class: "panel panel-gold section-gap au-in" }, [
        el("div", { class: "au-me" }, [
          (() => { setProfilePhoto(pid, user.user_metadata.avatar || ""); const b = el("button", { type: "button", class: "av-edit", "aria-label": "프로필 사진 바꾸기", onclick: () => avatarPick(pid, name, user.user_metadata.avatar || "") }, [avatarEl(pid, name, { size: 56, google: user.user_metadata.avatar || "" }), el("span", { class: "av-cam", "aria-hidden": "true", text: "📷" })]); return b; })(),
          el("div", { style: "flex:1; min-width:0;" }, [
            el("p", { class: "tiny muted", text: `${via}로 로그인 · 동기화 켜짐` }),
            el("div", { class: "au-nrow" }, [el("p", { class: "au-name", text: name }), el("button", { type: "button", class: "au-nedit", "aria-label": "닉네임 바꾸기", onclick: () => nickEdit(name, pid) }, [el("span", { text: "닉네임 변경" })])]),
            user.email ? el("p", { class: "tiny muted au-mail", text: user.email }) : null,
          ].filter(Boolean)),
        ]),
        (() => { let done = false; try { done = !!localStorage.getItem("str.nick." + user.uid); } catch { /* ignore */ } return done || user.provider !== "google.com" ? null : el("button", { type: "button", class: "au-nick-hint", onclick: () => nickEdit(name, pid) }, [el("b", { text: "앱에서 불릴 닉네임을 정해 보세요" }), el("span", { text: `지금은 Google 이름 ‘${name}’로 보여요` })]); })(),
        el("button", { type: "button", class: "btn btn-ghost btn-block au-pedit", onclick: () => profileEdit(pid, name, user.user_metadata.avatar || "") }, [el("b", { text: "프로필 수정" }), el("small", { text: "사진 · 닉네임 · 내 생년월일" })]),
        el("p", { class: "tiny muted", text: "내 정보·내 사람·코인·열어 본 풀이가 이 계정에 저장돼요. 다른 폰·PC에서 같은 계정으로 로그인하면 그대로 이어서 볼 수 있어요." }),
        el("div", { class: "au-acts au-acts2" }, [
          el("button", { class: "btn btn-ghost btn-sm", onclick: async () => {
            await pullState(pid);
            const pulled = await pullResults(); pulled.forEach((r) => { r.profileId = pid; });
            const res = importBackup({ app: "saju-tarot-report", version: 1, results: pulled }, "merge");
            refreshHeader(); toast(`클라우드에서 받아왔어요 · 저장한 풀이 ${res.added || 0}건 추가`); render();
          } }, [el("span", { text: "받아오기" })]),
          el("button", { class: "btn btn-ghost btn-sm", onclick: async () => { const ok = await pushState(pid); await pushAll(getResults()); toast(ok ? "클라우드에 저장했어요." : "저장하지 못했어요. Firestore 설정을 확인해 주세요."); } }, [el("span", { text: "지금 저장" })]),
        ]),
      ]));
      // 계정 관리 — 로그아웃 · 회원 탈퇴
      box.append(el("div", { class: "panel section-gap au-acc" }, [
        el("p", { class: "eyebrow", text: "계정 관리" }),
        (() => { let armed = false; const lab = el("span", { text: "로그아웃" }); const b = el("button", { class: "btn btn-ghost btn-block au-out", onclick: async () => {
          if (user.anonymous && !armed) { armed = true; lab.textContent = "게스트는 로그아웃하면 다시 못 들어와요 · 한 번 더 누르면 로그아웃"; setTimeout(() => { armed = false; lab.textContent = "로그아웃"; }, 4000); return; }
          await pushState(pid); await cloudLogout(); setActive(null); clearGuestSlot(); refreshHeader(); toast("로그아웃했어요. 다음에 같은 계정으로 로그인하면 그대로 이어져요."); render(); } }, [icon("back"), lab]); return b; })(),
        user.anonymous ? el("div", { class: "au-guest-box" }, [
          el("p", { class: "tiny", text: "게스트 계정은 이 기기에서만 이어져요. 로그아웃하거나 브라우저 기록을 지우면 다시 들어올 수 없어요. Google을 연결하면 지금 정보 그대로 정식 계정이 돼요." }),
          el("button", { class: "btn btn-primary btn-block", onclick: async () => { const r = await linkGoogle(); if (r.error) { toast(r.error); return; } grantOnce("social:" + pid, 5); toast("Google을 연결했어요 · 이제 어느 기기에서든 이어서 볼 수 있어요 🎁 +5"); await pushState(pid); render(); } }, [el("span", { text: "Google 연결해서 계정 지키기" })]),
        ]) : null,
        !user.anonymous && user.provider !== "google.com" ? el("div", { class: "au-pw2" }, [
          el("button", { class: "btn btn-ghost btn-block", onclick: () => pwChange() }, [el("span", { text: "🔑 비밀번호 바꾸기" })]),
          (() => { const b = el("button", { class: "btn btn-ghost btn-block au-link-g" }, [el("span", { text: "Google 계정 연결" })]); linkedProviders().then((ps) => { if (ps.includes("google.com")) { b.disabled = true; clear(b); b.append(el("span", { text: "✓ Google 연결됨" })); } }); b.addEventListener("click", async () => { const r = await linkGoogle(); if (r.error) { toast(r.error); return; } toast("Google 계정을 연결했어요. 이제 비밀번호 없이 'Google로 계속하기'로도 들어올 수 있어요."); render(); }); return b; })(),
        ]) : null,
        !user.anonymous && user.provider !== "google.com" ? el("p", { class: "tiny muted", text: "Google 계정을 연결해 두면 비밀번호를 잊어도 'Google로 계속하기'로 바로 들어올 수 있어요." }) : null,
        el("button", { class: "au-quit", type: "button", onclick: () => quitFlow(user, pid) }, [el("span", { text: "회원 탈퇴" })]),
      ]));
      return;
    }
    box.append(loginCard());
  }





  /* 프로필 수정 — 한 곳에서 사진·닉네임·내 생년월일 */
  function profileEdit(pid, name, google) {
    const own = (() => { try { return JSON.parse(localStorage.getItem("str.mybirth.v1") || "{}")[pid] || null; } catch { return null; } })();
    const row = (em, t, d, fn) => el("button", { type: "button", class: "pe-row", onclick: () => { m.close(); setTimeout(fn, 60); } }, [
      el("span", { class: "pe-em", "aria-hidden": "true", text: em }), el("div", {}, [el("b", { text: t }), el("small", { text: d })]), el("span", { class: "pe-go", "aria-hidden": "true", text: "›" }),
    ]);
    const m = openModal([
      el("div", { class: "pe-head" }, [avatarEl(pid, name, { size: 64, google }), el("div", {}, [el("b", { text: name }), el("small", { class: "muted", text: own && own.birthDate ? `${own.birthDate}${own.calendarType === "lunar" ? " (음력)" : ""} · ${own.timeUnknown ? "시간 모름" : own.birthTime || ""}` : "생년월일 미입력" })])]),
      el("div", { class: "pe-list" }, [
        row("🖼", "프로필 사진", "캐릭터 · 사진 올리기 · Google 사진", () => avatarPick(pid, name, google)),
        row("🏷", "닉네임", `지금: ${name}`, () => nickEdit(name, pid)),
        row("🎂", "내 생년월일 · 태어난 시간", own && own.birthDate ? "사주에 쓰는 내 정보 고치기" : "아직 없어요 — 입력하기", () => navigate("/saju")),
      ]),
    ], { title: "프로필 수정" });
  }

  /* 프로필 사진 고르기 — 해묘 캐릭터 · 사진 올리기 · Google 사진 · 기본 */
  function avatarPick(pid, name, google) {
    const EMO = ["🐈", "🐱", "🌙", "⭐", "🔮", "🌸", "🦊", "🐰", "🐻", "🦋", "🍀", "☀️"];
    const BG = ["#f6c9d6", "#e3d0f5", "#cfe3f7", "#d4f0de", "#fbe3c4", "#f3d2c1"];
    const cur = getAvatar(pid) || {};
    let pick = cur.k === "emoji" ? { ...cur } : { k: "emoji", e: "🐈", bg: BG[0] };
    const prev = el("div", { class: "avp-prev" });
    const paintPrev = () => { clear(prev); const tmp = getAvatar(pid); setAvatar(pid, pick); prev.append(avatarEl(pid, name, { size: 88, google })); setAvatar(pid, tmp); };
    const emoRow = el("div", { class: "avp-grid" }), bgRow = el("div", { class: "avp-bg" });
    const paintRows = () => {
      clear(emoRow); clear(bgRow);
      EMO.forEach((e) => emoRow.append(el("button", { type: "button", class: "avp-e" + (pick.k === "emoji" && pick.e === e ? " on" : ""), onclick: () => { pick = { k: "emoji", e, bg: pick.bg || BG[0] }; paintRows(); paintPrev(); } }, [el("span", { text: e })])));
      BG.forEach((c) => bgRow.append(el("button", { type: "button", class: "avp-c" + (pick.k === "emoji" && pick.bg === c ? " on" : ""), style: `background:${c}`, "aria-label": "배경색", onclick: () => { pick = { k: "emoji", e: pick.e || EMO[0], bg: c }; paintRows(); paintPrev(); } })));
    };
    const file = el("input", { type: "file", accept: "image/*", style: "display:none" });
    file.addEventListener("change", () => {
      const f = file.files && file.files[0]; if (!f) return;
      if (!/^image\//.test(f.type)) { toast("사진 파일만 올릴 수 있어요."); return; }
      const rd = new FileReader();
      rd.onload = () => {
        const im = new Image();
        im.onload = () => {
          // 가운데를 정사각형으로 잘라 160px로 줄임 (계정에 가볍게 저장)
          const s = Math.min(im.width, im.height), cv = document.createElement("canvas"); cv.width = cv.height = 160;
          cv.getContext("2d").drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, 160, 160);
          pick = { k: "img", src: cv.toDataURL("image/jpeg", 0.82) }; paintRows(); paintPrev();
        };
        im.onerror = () => toast("사진을 읽지 못했어요.");
        im.src = rd.result;
      };
      rd.readAsDataURL(f);
    });
    const m = openModal([
      prev,
      el("p", { class: "tjc-l", text: "해묘 캐릭터" }), emoRow,
      el("p", { class: "tjc-l", text: "배경 색" }), bgRow,
      el("div", { class: "avp-acts" }, [
        el("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: () => file.click() }, [el("span", { text: "📷 사진 올리기" })]),
        google ? el("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: () => { pick = { k: "google" }; paintRows(); paintPrev(); } }, [el("span", { text: "Google 사진" })]) : el("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: () => { pick = null; paintRows(); paintPrev(); } }, [el("span", { text: "이름 첫 글자" })]),
      ]),
      file,
      el("button", { type: "button", class: "btn btn-primary btn-block", onclick: async () => {
        setAvatar(pid, pick); m.close();
        await pushState(pid); refreshHeader(); toast("프로필 사진을 바꿨어요."); render();
      } }, [el("span", { text: "이걸로 할게요" })]),
    ], { title: "프로필 사진" });
    paintRows(); paintPrev();
  }


  /* 앱 안에서 비밀번호 바꾸기 */
  function pwChange() {
    const cur = el("input", { class: "input", type: "password", placeholder: "지금 비밀번호", autocomplete: "current-password" });
    const n1 = el("input", { class: "input", type: "password", placeholder: "새 비밀번호 (6자 이상)", autocomplete: "new-password" });
    const n2 = el("input", { class: "input", type: "password", placeholder: "새 비밀번호 한 번 더", autocomplete: "new-password" });
    const msg = el("p", { class: "field-error au-quit-msg", "aria-live": "assertive" });
    const go = el("button", { type: "button", class: "btn btn-primary btn-block" }, [el("span", { text: "비밀번호 바꾸기" })]);
    const m = openModal([el("p", { class: "muted tiny", style: "margin-bottom:10px;", text: "지금 비밀번호를 알면 여기서 바로 바꿀 수 있어요. 잊어버렸다면 로그아웃한 뒤 로그인 화면의 '비밀번호를 잊었어요'를 눌러 주세요." }), cur, n1, n2, go, msg], { title: "비밀번호 바꾸기" });
    go.addEventListener("click", async () => {
      msg.textContent = "";
      if (n1.value !== n2.value) { msg.textContent = "새 비밀번호 두 개가 달라요."; return; }
      go.disabled = true; const r = await changePassword(cur.value, n1.value); go.disabled = false;
      if (r.error) { msg.textContent = r.error; return; }
      m.close(); toast("비밀번호를 바꿨어요.");
    });
  }

  /* 닉네임 바꾸기 — Google·이메일 계정 모두 */
  function nickEdit(cur, pid) {
    const inp = el("input", { class: "input", type: "text", maxlength: "20", value: cur, placeholder: "닉네임 (최대 20자)", autocomplete: "nickname" });
    const save = el("button", { type: "button", class: "btn btn-primary btn-block" }, [el("span", { text: "이 닉네임으로 할게요" })]);
    const m = openModal([
      el("p", { class: "muted tiny", style: "margin-bottom:10px;", text: "해묘 안에서 나를 부르는 이름이에요. 위쪽 칩과 풀이 화면에 이 이름이 보여요. 언제든 바꿀 수 있어요." }),
      inp, save,
    ], { title: "닉네임 정하기" });
    setTimeout(() => { inp.focus(); inp.select(); }, 50);
    const go = async () => {
      save.disabled = true; save.classList.add("is-busy");
      const r = await setNickname(inp.value);
      save.disabled = false; save.classList.remove("is-busy");
      if (r.error) { toast(r.error); return; }
      try { const u = await getCloudUser(); if (u) localStorage.setItem("str.nick." + u.uid, "1"); } catch { /* ignore */ }
      ensureProfile(pid, r.name); m.close(); refreshHeader(); toast(`닉네임을 ‘${r.name}’(으)로 바꿨어요.`); render();
    };
    save.addEventListener("click", go);
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
  }

  /* 회원 탈퇴 — 확인 창 → (이메일 계정은 비밀번호) → 클라우드 데이터·계정 삭제 → 이 기기 데이터도 정리 */
  function quitFlow(user, pid) {
    const isGoogle = user.provider === "google.com";
    const pw = isGoogle ? null : el("input", { class: "input", type: "password", placeholder: "비밀번호 (본인 확인)", autocomplete: "current-password" });
    const chk = el("input", { type: "checkbox", id: "quit-ok" });
    const go = el("button", { type: "button", class: "btn btn-block au-quit-go", disabled: true }, [el("span", { text: "탈퇴하기" })]);
    chk.addEventListener("change", () => { go.disabled = !chk.checked; });
    let coins = 0; try { coins = isUnlimited() ? 0 : getCoins(); } catch { /* ignore */ }
    const m = openModal([
      el("div", { class: "au-quit-coin", role: "alert" }, [
        el("b", { text: coins > 0 ? `🪙 남은 코인 ${coins}개가 사라져요` : "🪙 탈퇴하면 코인과 풀이가 사라져요" }),
        el("span", { text: "실수로 탈퇴했다면 7일 안에 다시 가입한 뒤 1:1 문의로 요청하면 복구할 수 있어요. 7일이 지나면 복구·환불되지 않아요." }),
      ]),
      el("p", { style: "font-weight:700;", text: "정말 떠나실 건가요? 🐈" }),
      el("ul", { class: "au-quit-list" }, [
        "계정과 클라우드에 저장된 내 정보·내 사람·저장한 풀이가 모두 지워져요.",
                "개인정보는 탈퇴 후 7일, 최대 30일간 보관되다 자동으로 삭제돼요.",
      ].map((t) => el("li", { text: t }))),
      pw,
      isGoogle ? el("p", { class: "tiny muted", text: "본인 확인을 위해 Google 로그인 창이 한 번 더 뜰 수 있어요." }) : null,
      el("label", { class: "au-quit-chk", for: "quit-ok" }, [chk, el("span", { text: "위 내용을 확인했고, 탈퇴할게요." })]),
      go,
    ], { title: "회원 탈퇴" });
    const qmsg = el("p", { class: "field-error au-quit-msg", "aria-live": "assertive" });
    go.after(qmsg);
    go.addEventListener("click", async () => {
      qmsg.textContent = "";
      go.disabled = true; go.classList.add("is-busy"); window.__haeQuitting = true;
      const r = await deleteAccount(pw ? pw.value : undefined);
      go.classList.remove("is-busy"); go.disabled = false; window.__haeQuitting = false;
      if (r.error) { qmsg.textContent = r.error; if (pw) pw.focus(); return; }
      // 이 기기에 남은 이 계정 몫 정리
      ["str.mybirth.v1", "str.people.v1", "str.family.v1", "str.wallet.v1"].forEach((k) => {
        try { const mm = JSON.parse(localStorage.getItem(k) || "{}"); if (mm && typeof mm === "object" && pid in mm) { delete mm[pid]; localStorage.setItem(k, JSON.stringify(mm)); } } catch { /* ignore */ }
      });
      try { const rs = JSON.parse(localStorage.getItem("str.results.v1") || "[]"); localStorage.setItem("str.results.v1", JSON.stringify(rs.filter((x) => x.profileId !== pid))); } catch { /* ignore */ }
      deleteProfile(pid); setActive(null);
      m.close(); refreshHeader(); toast("탈퇴가 완료됐어요. 그동안 고마웠어요."); render();
    });
  }

  /* 로그인 카드 — Google · 이메일(로그인/회원가입) */
  function loginCard() {
    let mode = "login";
    const card = el("div", { class: "panel section-gap au" });
    const after = async (r, isNew) => {
      if (r.error) { toast(r.error); return; }
      const u = r.user, pid = "cloud_" + u.uid;
      ensureProfile(pid, u.user_metadata.name || (u.email || "").split("@")[0] || (u.anonymous ? "게스트" : "내 계정"));
      setActive(pid);
      const st = await pullState(pid);
      try { const pulled = await pullResults(); pulled.forEach((x) => { x.profileId = pid; }); if (pulled.length) importBackup({ app: "saju-tarot-report", version: 1, results: pulled }, "merge"); } catch { /* ignore */ }
      refreshHeader();
      toast(u.anonymous ? "게스트로 시작했어요 · 마음에 들면 마이에서 Google을 연결해 계정을 지켜 주세요." : isNew || (st && st.first) ? "환영해요! 이 기기에서 보던 내 정보를 계정에 옮겨 담았어요." : "로그인했어요 · 저장된 정보를 받아왔어요.");
      let back = null; try { back = sessionStorage.getItem("str.afterlogin"); sessionStorage.removeItem("str.afterlogin"); } catch { /* ignore */ }
      if (back && back !== "/profile") { navigate(back); return; }
      render();
    };
    const paint = () => {
      clear(card);
      const nameI = el("input", { class: "input", type: "text", placeholder: "닉네임 (앱에서 불릴 이름)", autocomplete: "nickname", maxlength: "20" });
      const mailI = el("input", { class: "input", type: "email", placeholder: "이메일", autocomplete: "email", inputmode: "email" });
      const pwI = el("input", { class: "input", type: "password", placeholder: mode === "signup" ? "비밀번호 (6자 이상)" : "비밀번호", autocomplete: mode === "signup" ? "new-password" : "current-password" });
      const busy = (btn, on) => { btn.disabled = on; btn.classList.toggle("is-busy", on); };
      const submit = el("button", { type: "submit", class: "btn btn-primary btn-block" }, [el("span", { text: mode === "signup" ? "가입하고 시작하기" : "이메일로 로그인" })]);
      const form = el("form", { class: "au-form", onsubmit: async (e) => {
        e.preventDefault(); busy(submit, true);
        const r = mode === "signup" ? await signupEmail(mailI.value, pwI.value, nameI.value.trim()) : await loginEmail(mailI.value, pwI.value);
        busy(submit, false); after(r, mode === "signup");
      } }, [mode === "signup" ? nameI : null, mailI, pwI, submit].filter(Boolean));
      const gBtn = el("button", { type: "button", class: "btn au-google btn-block", onclick: async () => { busy(gBtn, true); const r = await loginGoogle(); busy(gBtn, false); after(r, false); } }, [
        el("span", { class: "au-g", "aria-hidden": "true", html: '<svg viewBox="0 0 48 48" width="18" height="18"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.2 0-11.5-4.1-13.4-9.8l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>' }),
        el("span", { text: "Google로 계속하기" }),
      ]);
      card.append(
        el("div", { class: "au-head" }, [el("span", { class: "au-moon", "aria-hidden": "true", text: "☾" }), el("div", {}, [el("h3", { class: "serif", text: mode === "signup" ? "해묘 가입하기" : "해묘에 로그인" }), el("p", { class: "muted tiny", text: "로그인하면 내 정보·내 사람·코인·열어 본 풀이가 계정에 저장돼서, 폰·PC 어디서든 이어서 볼 수 있어요." })])]),
        gBtn,
        (() => { const b = el("button", { type: "button", class: "btn btn-ghost btn-block au-guest" }, [el("span", { text: "👤 게스트로 시작하기" }), el("small", { text: "가입 없이 바로" })]); b.addEventListener("click", async () => { busy(b, true); const r = await loginGuest(); busy(b, false); after(r, false); }); return b; })(),
        el("div", { class: "au-or" }, [el("span", { text: "또는 이메일로" })]),
        el("div", { class: "au-tabs", role: "tablist" }, [["login", "로그인"], ["signup", "회원가입"]].map(([k, t]) => el("button", { type: "button", role: "tab", class: "au-tab" + (mode === k ? " on" : ""), onclick: () => { mode = k; paint(); } }, [el("span", { text: t })]))),
        form,
        mode === "login" ? el("button", { type: "button", class: "btn btn-quiet btn-sm au-forgot", onclick: async () => {
          if (!mailI.value.trim()) { toast("위 칸에 가입한 이메일을 먼저 적어 주세요."); mailI.focus(); return; }
          const r = await resetPassword(mailI.value); toast(r.error || "비밀번호 재설정 메일을 보냈어요. 메일함(스팸함도)을 확인해 주세요.");
        } }, [el("span", { text: "비밀번호를 잊었어요" })]) : el("p", { class: "tiny muted", style: "text-align:center;", text: "처음 가입하면 축하 코인 +5를 드려요 🎁" }),
      );
    };
    paint();
    return card;
  }

  function doExport() {
    const data = exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: "saju-tarot-backup.json" });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("백업 파일을 저장했어요.");
  }

  return root;
}


/* 마이 — 내가 열어 본 풀이
   일반 회원: 7일 동안 · 직접 연 것만 · 시간은 안 보임 / 📌 보관하면 로그인 계정에 영구 보관(열람 시각·누구와 표시)
   관리자: 기간 제한 없이 예전 기록까지 · 시간 표시 */
function loggedInNow() {
  try { if (!isCloudEnabled() || localStorage.getItem("str.devnogate.v1")) return true; } catch { /* ignore */ }
  const id = getActiveId(); return !!(id && id.startsWith("cloud_"));
}
const subOf = (r) => r.with || (r.who ? `${r.who}님 풀이` : "");
function keptRow(k, navigate, onChange, compact = false) {
  const main = el("button", { type: "button", class: "op-main", onclick: () => k.path && navigate(k.path), "aria-label": `${k.name} 다시 열기` }, [
    el("span", { class: "op-dot kept" }),
    el("span", { class: "op-txt" }, [el("b", { text: k.name }), el("small", { text: [subOf(k), `${fmtOpenTime(k.t, true)} 열람`].filter(Boolean).join(" · ") })]),
    el("span", { class: "op-tag" + (/🪙|코인/.test(k.tag) ? "" : " free"), text: k.tag }),
  ]);
  const un = el("button", { type: "button", class: "op-keep on", "aria-label": `${k.name} 보관 해제` }, [el("span", { text: compact ? "해제" : "보관 해제" })]);
  let armed = false, tm = null;
  un.addEventListener("click", () => {
    if (!armed) {
      armed = true; un.firstChild.textContent = "한 번 더 누르면 해제"; un.classList.add("armed");
      toast(`보관을 해제하면 이 풀이는 ${KEEP_DAYS}일 뒤 목록에서 사라져서 다시 볼 수 없어요. 계속하려면 한 번 더 눌러 주세요.`, 4000);
      tm = setTimeout(() => { armed = false; un.firstChild.textContent = compact ? "해제" : "보관 해제"; un.classList.remove("armed"); }, 4000);
      return;
    }
    clearTimeout(tm);
    unkeepItem(k.key);
    const d = new Date(Date.now() + KEEP_DAYS * 864e5);
    toast(`보관을 해제했어요 · ${d.getMonth() + 1}월 ${d.getDate()}일에 사라져요 (그 뒤엔 다시 볼 수 없어요)`, 4500);
    onChange && onChange();
  });
  return el("div", { class: "op-row" }, [main, un]);
}
/* 눌러야 펼쳐지는 상자 — 열림 상태는 이 탭 동안 기억 */
const FOLD_KEY = "str.opfold.v1";
const foldOpen = (id) => { try { return (JSON.parse(sessionStorage.getItem(FOLD_KEY) || "{}"))[id] === true; } catch { return false; } };
const setFold = (id, v) => { try { const m = JSON.parse(sessionStorage.getItem(FOLD_KEY) || "{}"); m[id] = v; sessionStorage.setItem(FOLD_KEY, JSON.stringify(m)); } catch { /* ignore */ } };
export function openFold(id) { setFold(id, true); }
function fold(id, title, count, sub, body) {
  const d = el("details", { class: "op-fold" }, [
    el("summary", { class: "op-sum" }, [
      el("span", { class: "op-sum-tx" }, [el("b", {}, [el("span", { text: title }), el("i", { class: "op-cnt", text: String(count) })]), el("small", { text: sub })]),
      el("span", { class: "op-chev", "aria-hidden": "true" }),
    ]),
    body,
  ]);
  if (foldOpen(id)) d.open = true;
  d.addEventListener("toggle", () => setFold(id, d.open));
  return el("section", { class: "wrap op-wrap" }, [d]);
}
/** 보관함 — 보관한 풀이 + 저장한 결과를 한곳에 (눌러야 펼쳐짐) */
export function keptPanel(navigate, onChange) {
  const kept = getKept();
  let saved = []; try { saved = (getResults() || []).slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); } catch { saved = []; }
  const n = kept.length + saved.length;
  const list = el("div", { class: "panel op-list" });
  if (!n) list.append(el("div", { class: "op-empty-in" }, [el("p", { text: "아직 보관한 풀이가 없어요" }), el("small", { text: "아래 '내가 열어 본 풀이'에서 ‘보관’을 누르면 여기에 계속 남아요" })]));
  kept.forEach((k) => list.append(keptRow(k, navigate, onChange)));
  saved.forEach((r) => {
    const main = el("button", { type: "button", class: "op-main", onclick: () => navigate("/result/" + r.id), "aria-label": `${r.title} 열기` }, [
      el("span", { class: "op-dot" }),
      el("span", { class: "op-txt" }, [el("b", { text: r.title || "저장한 결과" }), el("small", {}, [el("span", { text: `저장한 결과 · ${new Date(r.createdAt || Date.now()).toLocaleDateString("ko-KR")}` })])]),
    ]);
    const dl = el("span", { text: "삭제" });
    const del = el("button", { type: "button", class: "op-keep on" }, [dl]);
    let armed = false;
    del.addEventListener("click", () => { if (!armed) { armed = true; dl.textContent = "한 번 더"; setTimeout(() => { armed = false; dl.textContent = "삭제"; }, 3000); return; } deleteResult(r.id); toast("삭제했어요."); onChange && onChange(); });
    list.append(el("div", { class: "op-row" }, [main, del]));
  });
  return fold("kept", "📌 보관함", n, "계정에 계속 남아요 · 누르면 다시 열려요", list);
}
function openedPanel(navigate) {
  const host = el("div", {});
  const draw = () => { clear(host); host.append(...[keptPanel(navigate, draw), recentBox()].filter(Boolean)); };
  function recentBox() {
    const admin = false; // 관리자도 여기선 일반 회원과 똑같이 (예전 기록은 회원 정보 관리에서만)
    const keptKeys = new Set(getKept().map((k) => k.key));
    let rows = [];
    try { rows = openedRows(getWallet()).filter((r) => !keptKeys.has(r.key)); } catch { rows = []; } // 보관한 건 위 보관함에만
    let nSaved = 0; try { nSaved = (getResults() || []).length; } catch { /* ignore */ }
    const SUB = "D-숫자가 끝나면 사라져요 · 오래 볼 건 ‘보관’";
    if (!rows.length) {
      return fold("recent", "🕘 내가 열어 본 풀이", 0, SUB, el("div", { class: "panel op-list" }, [el("div", { class: "op-empty-in" }, [el("p", { text: `최근 ${KEEP_DAYS}일 동안 새로 열어 본 풀이가 없어요` }), el("small", { text: "사주·운세·궁합을 보면 여기에 차곡차곡 쌓여요" })])]));
    }
    const list = el("div", { class: "panel op-list" });
    const STEP = 8; let shown = 0;
    const more = el("button", { type: "button", class: "op-more" });
    const DAY = 864e5, today = new Date(); today.setHours(0, 0, 0, 0);
    const when = (t) => {
      if (!t) return "예전 기록";
      if (t >= today.getTime()) return "오늘 " + new Date(t).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
      if (t >= today.getTime() - DAY) return "어제 " + new Date(t).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
      return fmtOpenTime(t);
    };
    const row = (r) => {
      const free = !/🪙|코인/.test(r.tag);
      const line = admin
        ? [subOf(r), when(r.t), r.n > 1 ? `${r.n}번` : ""].filter(Boolean).join(" · ")
        : subOf(r) || "열어 본 풀이";
      const main = el(r.path ? "button" : "div", { type: r.path ? "button" : undefined, class: "op-main", onclick: r.path ? () => navigate(r.path) : undefined, "aria-label": `${r.name} 다시 열기` }, [
        el("span", { class: "op-dot" + (free ? " free" : "") }),
        el("span", { class: "op-txt" }, [el("b", { text: r.name }), el("small", {}, [
          !admin && !keptKeys.has(r.key) ? el("i", { class: "op-dday" + (r.left <= 1 ? " soon" : ""), title: `${new Date(r.gone).getMonth() + 1}월 ${new Date(r.gone).getDate()}일에 사라져요`, text: r.left <= 0 ? "D-DAY" : `D-${r.left}` }) : null,
          el("span", { text: line }),
        ].filter(Boolean))]),
        el("span", { class: "op-tag" + (free ? " free" : ""), text: r.tag }),
      ]);
      const isKept = keptKeys.has(r.key);
      const kb = el("button", { type: "button", class: "op-keep" + (isKept ? " on" : ""), "aria-label": `${r.name} 보관하기` }, [el("span", { text: isKept ? "보관됨" : "보관" })]);
      kb.addEventListener("click", () => {
        if (isKept) { openFold("kept"); draw(); return; }
        if (!loggedInNow()) { toast("로그인하면 계정에 영구 보관할 수 있어요"); return; }
        keepItem({ key: r.key, path: r.path, name: r.name, tag: r.tag, t: r.t, who: r.who, with: r.with });
        toast("📌 보관함에 넣었어요 · 이제 사라지지 않아요"); openFold("kept"); draw();
      });
      return el("div", { class: "op-row" }, [main, kb]);
    };
    const fill = () => {
      rows.slice(shown, shown + STEP).forEach((r) => list.insertBefore(row(r), more));
      shown = Math.min(rows.length, shown + STEP);
      if (shown >= rows.length) more.remove(); else more.textContent = `더 보기 (${rows.length - shown})`;
    };
    more.addEventListener("click", fill);
    list.append(more); fill();
    return fold("recent", "🕘 내가 열어 본 풀이", rows.length, SUB, list);
  }
  draw();
  return host;
}

/* 고객센터 줄 — 1:1 문의(답변 도착 배지) · 후기 */
function helpRow(navigate) {
  const badge = el("span", { class: "hp-badge", hidden: "" });
  unreadReplies().then((n) => { if (n > 0) { badge.textContent = `답변 ${n}`; badge.hidden = false; } }).catch(() => {});
  return el("div", { class: "hp-row" }, [
    el("button", { type: "button", class: "hp-btn", onclick: () => navigate("/inquiry") }, [el("span", { class: "hp-ic", "aria-hidden": "true", text: "💬" }), el("span", { class: "hp-tx" }, [el("b", { text: isAdmin() ? "문의 · 후기 관리" : "1:1 문의" }), el("small", { text: isAdmin() ? "받은 문의에 답하기" : "궁금한 점 물어보기" })]), badge]),
    el("button", { type: "button", class: "hp-btn", onclick: () => navigate("/reviews") }, [el("span", { class: "hp-ic", "aria-hidden": "true", text: "⭐" }), el("span", { class: "hp-tx" }, [el("b", { text: "후기 남기기" }), el("small", { text: "첫 후기 코인 10개" })])]),
  ]);
}
