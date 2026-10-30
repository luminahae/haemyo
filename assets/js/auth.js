/* =========================================================
   로컬 프로필("로그인") — 서버 없이 이 브라우저 안에서만 동작.
   ⚠️ 이것은 편의용 로컬 프로필이며 강력한 보안이 아닙니다. PIN은
   기기를 공유할 때 결과를 가볍게 가리는 용도입니다. 진짜 기기 간
   동기화는 백업 내보내기/가져오기(state.js)를 사용하세요.
   ========================================================= */

const PROFILES_KEY = "str.profiles.v1";
const ACTIVE_KEY = "str.activeProfile.v1";

function safeParse(raw, fb) { try { return raw ? JSON.parse(raw) : fb; } catch { return fb; } }

export function getProfiles() {
  return safeParse(localStorage.getItem(PROFILES_KEY), []);
}
function setProfiles(list) { localStorage.setItem(PROFILES_KEY, JSON.stringify(list)); }

export function getActiveId() {
  const id = localStorage.getItem(ACTIVE_KEY);
  return id || null; // null = 게스트
}
export function getActiveProfile() {
  const id = getActiveId();
  return id ? getProfiles().find((p) => p.id === id) || null : null;
}
export function setActive(id) {
  if (id) localStorage.setItem(ACTIVE_KEY, id);
  else localStorage.removeItem(ACTIVE_KEY);
}

export function makeId() {
  return "p_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
}

/** 간단 해시(FNV-1a) — 보안용 아님, PIN 가림용 */
function hashPin(pin, salt) {
  let h = 2166136261;
  const s = String(pin) + "|" + salt;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

export function createProfile(name, pin) {
  const id = makeId();
  const profile = { id, name: (name || "내 프로필").slice(0, 20), createdAt: Date.now() };
  if (pin) profile.pinHash = hashPin(pin, id);
  const list = getProfiles();
  list.push(profile);
  setProfiles(list);
  return profile;
}

export function updateProfile(id, patch) {
  const list = getProfiles();
  const i = list.findIndex((p) => p.id === id);
  if (i < 0) return null;
  if (patch.name != null) list[i].name = patch.name.slice(0, 20);
  if (patch.pin === "") delete list[i].pinHash; // PIN 해제
  else if (patch.pin) list[i].pinHash = hashPin(patch.pin, id);
  setProfiles(list);
  return list[i];
}

/** 고정 id 프로필 보장(클라우드 계정 연결용) */
export function ensureProfile(id, name) {
  const list = getProfiles();
  let p = list.find((x) => x.id === id);
  if (!p) { p = { id, name: (name || "클라우드").slice(0, 20), createdAt: Date.now(), cloud: true }; list.push(p); }
  else if (name) { p.name = name.slice(0, 20); }
  setProfiles(list);
  return p;
}

export function deleteProfile(id) {
  setProfiles(getProfiles().filter((p) => p.id !== id));
  if (getActiveId() === id) setActive(null);
}

export function hasPin(id) {
  const p = getProfiles().find((x) => x.id === id);
  return !!(p && p.pinHash);
}

export function verifyPin(id, pin) {
  const p = getProfiles().find((x) => x.id === id);
  if (!p) return false;
  if (!p.pinHash) return true;
  return p.pinHash === hashPin(pin, id);
}

/* =========================================================
   프로필 사진 (HAE) — 계정(프로필)마다 하나. 클라우드 계정이면 자동 동기화(str.avatar.v1)
   값: { k: "emoji", e: "🐈", bg: "#f6c9d6" } | { k: "img", src: "data:image/jpeg;base64,…" } | { k: "google" }
   ========================================================= */
const AVATAR_KEY = "str.avatar.v1";
export function getAvatar(pid) {
  try { const m = JSON.parse(localStorage.getItem(AVATAR_KEY) || "{}"); return (pid && m[pid]) || null; } catch { return null; }
}
export function setAvatar(pid, v) {
  try {
    const m = JSON.parse(localStorage.getItem(AVATAR_KEY) || "{}");
    if (v) m[pid] = v; else delete m[pid];
    localStorage.setItem(AVATAR_KEY, JSON.stringify(m));
  } catch { /* 저장 공간이 꽉 차면 무시 */ }
}
/** 아바타 그리기 — 설정한 것 > Google 사진 > 이름 첫 글자 */
export function avatarEl(pid, name, { size = 48, google = "", cls = "" } = {}) {
  const a = getAvatar(pid);
  const box = document.createElement("span");
  box.className = "av " + cls; box.style.width = box.style.height = size + "px"; box.style.fontSize = Math.round(size * 0.48) + "px";
  box.setAttribute("aria-hidden", "true");
  const img = (src) => { const i = document.createElement("img"); i.src = src; i.alt = ""; i.referrerPolicy = "no-referrer"; box.appendChild(i); };
  if (a && a.k === "img" && a.src) img(a.src);
  else if (a && a.k === "emoji") { box.textContent = a.e; box.style.background = a.bg || ""; box.classList.add("av-emoji"); }
  else if ((!a || a.k === "google") && google) img(google);
  else { box.textContent = String(name || "?").slice(0, 1); box.classList.add("av-letter"); }
  return box;
}
/** Google 등 로그인 서비스의 프로필 사진 주소 기억 (헤더 칩에서도 쓰려고) */
export function setProfilePhoto(id, url) {
  const list = getProfiles(); const p = list.find((x) => x.id === id);
  if (p && (p.photo || "") !== (url || "")) { p.photo = url || ""; setProfiles(list); }
}
