/* =========================================================
   클라우드 계정 · 동기화 (Firebase) — HAE
   config.js의 firebase 값이 비어 있으면 모든 함수가 조용히 no-op → 앱은 로컬로 정상 동작.
   - 로그인: Google(팝업) · 이메일/비밀번호(가입·로그인·비밀번호 재설정)
   - 동기화(Firestore):
       users/{uid}                 → state: 내 정보·내 사람·코인·가족 등 (이 계정 몫만)
       users/{uid}/results/{id}    → 저장한 풀이 결과
   Firestore를 아직 안 만들었어도 로그인은 그대로 동작해요(동기화만 건너뜀).
   ========================================================= */

import { getConfig, isCloudEnabled } from "./config.js";

export { isCloudEnabled };

const SDK = "https://www.gstatic.com/firebasejs/10.12.2";
let _fb = null;

async function fb() {
  if (_fb) return _fb;
  if (!isCloudEnabled()) return null;
  const [appM, authM, fsM] = await Promise.all([
    import(/* @vite-ignore */ `${SDK}/firebase-app.js`),
    import(/* @vite-ignore */ `${SDK}/firebase-auth.js`),
    import(/* @vite-ignore */ `${SDK}/firebase-firestore.js`),
  ]);
  const app = appM.initializeApp(getConfig().firebase);
  const auth = authM.getAuth(app);
  try { auth.languageCode = "ko"; } catch { /* ignore */ }
  try { await authM.setPersistence(auth, authM.browserLocalPersistence); } catch { /* ignore */ }
  const db = fsM.getFirestore(app);
  _fb = { app, auth, db, A: authM, F: fsM };
  return _fb;
}

/* 앱 쪽에서 쓰는 사용자 모양으로 맞춰 줌 */
/* 게스트는 닉네임을 정하기 전엔 마이 화면의 닉네임(프로필 이름)으로 */
function guestName() { try { const pid = localStorage.getItem("str.activeProfile.v1"); const ps = JSON.parse(localStorage.getItem("str.profiles.v1") || "[]"); const me = ps.find((x) => x.id === pid); const n = me && me.name; return n && !GENERIC_NAMES.has(n) ? n : "게스트"; } catch { return "게스트"; } }
/* '내 계정'처럼 이름을 안 정했을 때 붙던 기본값 — 관리자 목록에선 생년월일 이름이나 '게스트'로 대신 보여 줌 */
const GENERIC_NAMES = new Set(["내 계정", "게스트", ""]);
function displayName(name, st, anonymous) {
  if (name && !GENERIC_NAMES.has(name)) return name;
  const b = st && st["str.mybirth.v1"]; const bn = b && b.name && String(b.name).trim();
  return bn || (anonymous ? "게스트" : name || "");
}
function shape(u) {
  if (!u) return null;
  return {
    id: u.uid, uid: u.uid, email: u.email || "", anonymous: !!u.isAnonymous,
    provider: (u.providerData[0] && u.providerData[0].providerId) || (u.isAnonymous ? "anonymous" : "password"),
    user_metadata: { name: u.displayName || "", avatar: u.photoURL || "" },
  };
}

/** 앱 시작 시 1회 — 로그인 상태 복원 */
export async function handleRedirect() {
  if (!isCloudEnabled()) return null;
  return getUser();
}

/* 관리자 판정용 — 지금 로그인한 계정의 (인증된) 이메일을 기억 */
function rememberMail(u, { signedOut = false } = {}) {
  try {
    // 로그인 확인이 잠깐 늦거나(인앱 브라우저 · 느린 네트워크) 토큰을 새로 받는 순간 currentUser가 비어 보여도
    // 관리자 표시를 지우지 않음 — 지우는 건 '로그아웃 · 탈퇴 · 다른 계정 로그인'일 때만
    if (!u) { if (signedOut) { localStorage.removeItem("str.cloudmail.v1"); localStorage.removeItem("str.owneruid.v1"); } return; }
    const ok = u.email && (u.emailVerified || (u.providerData || []).some((p) => p.providerId === "google.com"));
    if (ok) {
      localStorage.setItem("str.cloudmail.v1", u.email.toLowerCase());
      if (u.email.toLowerCase() === "lumina.hae@gmail.com") { localStorage.setItem("str.owneruid.v1", "cloud_" + u.uid); sweepTrash(); } else localStorage.removeItem("str.owneruid.v1");
    } else { localStorage.removeItem("str.cloudmail.v1"); localStorage.removeItem("str.owneruid.v1"); }
  } catch { /* ignore */ }
}

export async function getUser() {
  const f = await fb().catch(() => null);
  if (!f) return null;
  try { await f.auth.authStateReady(); } catch { /* ignore */ }
  rememberMail(f.auth.currentUser);
  return shape(f.auth.currentUser);
}

/* ---- 로그인 수단 ---- */
const KO_ERR = {
  "auth/invalid-email": "이메일 주소 형식이 맞지 않아요.",
  "auth/missing-password": "비밀번호를 입력해 주세요.",
  "auth/weak-password": "비밀번호는 6자 이상으로 해 주세요.",
  "auth/email-already-in-use": "이미 가입된 이메일이에요. 로그인해 주세요.",
  "auth/invalid-credential": "이메일 또는 비밀번호가 맞지 않아요.",
  "auth/wrong-password": "비밀번호가 맞지 않아요.",
  "auth/user-not-found": "가입되지 않은 이메일이에요.",
  "auth/too-many-requests": "시도가 너무 많아요. 잠시 뒤 다시 해 주세요.",
  "auth/popup-closed-by-user": "로그인 창이 닫혔어요.",
  "auth/cancelled-popup-request": "로그인 창이 닫혔어요.",
  "auth/popup-blocked": "팝업이 막혔어요. 브라우저에서 팝업을 허용해 주세요.",
  "auth/unauthorized-domain": "이 주소는 Firebase에 허용되지 않았어요. Firebase 콘솔 › Authentication › 설정 › 승인된 도메인에 이 사이트 주소를 추가해 주세요.",
  "auth/network-request-failed": "인터넷 연결을 확인해 주세요.",
  "auth/operation-not-allowed": "Firebase 콘솔에서 이 로그인 방식을 켜 주세요.",
  "auth/user-mismatch": "지금 로그인한 계정과 다른 Google 계정을 골랐어요. 같은 계정으로 다시 해 주세요.",
  "auth/requires-recent-login": "보안을 위해 다시 로그인한 뒤 해 주세요.",
  "auth/expired-action-code": "링크가 만료됐어요. 비밀번호 찾기를 다시 눌러 새 메일을 받아 주세요.",
  "auth/invalid-action-code": "이미 쓴 링크이거나 잘못된 링크예요. 비밀번호 찾기를 다시 눌러 주세요.",
  "auth/user-disabled": "사용이 중지된 계정이에요.",
};
const err = (e) => ({ error: KO_ERR[e && e.code] || `잠시 문제가 생겼어요${e && e.code ? ` (${e.code})` : ""}. 다시 해 주세요.` });

export async function loginGoogle() {
  const f = await fb().catch(() => null);
  if (!f) return { error: "클라우드 설정이 필요해요." };
  try {
    const p = new f.A.GoogleAuthProvider();
    p.setCustomParameters({ prompt: "select_account" });
    const r = await f.A.signInWithPopup(f.auth, p);
    rememberMail(r.user);
    return { user: shape(r.user) };
  } catch (e) { return err(e); }
}

/** 게스트(익명) 로그인 — 가입 없이 바로 시작. 나중에 Google을 연결하면 그대로 정식 계정이 돼요 (HAE) */
export async function loginGuest() {
  const f = await fb().catch(() => null);
  if (!f) return { error: "클라우드 설정이 필요해요." };
  try { const r = await f.A.signInAnonymously(f.auth); return { user: shape(r.user) }; }
  catch (e) {
    if (e && (e.code === "auth/operation-not-allowed" || e.code === "auth/admin-restricted-operation")) return { error: "게스트 로그인이 꺼져 있어요. Firebase 콘솔 › Authentication › 로그인 방법에서 ‘익명’을 사용 설정해 주세요." };
    return err(e);
  }
}
export async function loginEmail(email, password) {
  const f = await fb().catch(() => null);
  if (!f) return { error: "클라우드 설정이 필요해요." };
  try { const r = await f.A.signInWithEmailAndPassword(f.auth, String(email).trim(), password); rememberMail(r.user); return { user: shape(r.user) }; }
  catch (e) { return err(e); }
}

export async function signupEmail(email, password, name) {
  const f = await fb().catch(() => null);
  if (!f) return { error: "클라우드 설정이 필요해요." };
  try {
    const r = await f.A.createUserWithEmailAndPassword(f.auth, String(email).trim(), password);
    if (name) { try { await f.A.updateProfile(r.user, { displayName: String(name).slice(0, 20) }); } catch { /* ignore */ } }
    return { user: { ...shape(r.user), user_metadata: { name: name || "" } } };
  } catch (e) { return err(e); }
}

export async function resetPassword(email) {
  const f = await fb().catch(() => null);
  if (!f) return { error: "클라우드 설정이 필요해요." };
  try {
    const back = location.origin + location.pathname;
    try { await f.A.sendPasswordResetEmail(f.auth, String(email).trim(), { url: back }); }
    catch (e1) { if (e1 && /continue|domain|url/i.test(String(e1.code || ""))) await f.A.sendPasswordResetEmail(f.auth, String(email).trim()); else throw e1; }
    return { ok: true };
  }
  catch (e) { return err(e); }
}

/* 예전 화면 호환 — 카카오·네이버는 Firebase 기본 제공이 아님 */
export async function loginKakao() { return { error: "카카오 로그인은 준비 중이에요. Google이나 이메일로 로그인해 주세요." }; }
export async function loginNaver() { return { error: "네이버 로그인은 준비 중이에요. Google이나 이메일로 로그인해 주세요." }; }

export async function logout() {
  const f = await fb().catch(() => null);
  if (f) { try { await f.A.signOut(f.auth); } catch { /* ignore */ } }
  rememberMail(null, { signedOut: true });
}

/* ---- 계정 데이터 동기화 (내 정보·내 사람·코인 등) ---- */
const STATE_KEYS = ["str.mybirth.v1", "str.people.v1", "str.family.v1", "str.wallet.v1", "str.avatar.v1"];
const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || "{}") || {}; } catch { return {}; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

/** 이 기기에서 pid(계정 프로필) 몫만 모으기 (+ 항목별 마지막으로 고친 시각) */
export function collectState(pid) {
  const out = {};
  STATE_KEYS.forEach((k) => { const m = read(k); if (m[pid] != null) out[k] = m[pid]; });
  const st = read("str.stamp.v1")[pid]; if (st) out.__stamp = st;
  return out;
}

export async function pushState(pid) {
  const u = await getUser(); if (!u) return false;
  const f = await fb();
  try {
    // 올리기 전에 클라우드를 한 번 보고, 다른 기기에서 더 최근에 고친 항목은 덮어쓰지 않고 이 기기로 받아 옴
    let state = collectState(pid), isNew = false;
    try {
      const snap = await f.F.getDoc(f.F.doc(f.db, "users", u.uid));
      isNew = !snap.exists();
      const cloud = snap.exists() && snap.data().state ? JSON.parse(snap.data().state) : null;
      if (cloud && cloud.__stamp) {
        const cst = cloud.__stamp, stm = read("str.stamp.v1"), lst = { ...(stm[pid] || {}) };
        let pulled = false;
        STATE_KEYS.forEach((k) => {
          if (k === "str.wallet.v1" || cloud[k] == null) return;
          if ((cst[k] || 0) > (lst[k] || 0)) { const m = read(k); m[pid] = cloud[k]; write(k, m); lst[k] = cst[k]; pulled = true; }
        });
        if (pulled) { stm[pid] = lst; write("str.stamp.v1", stm); state = collectState(pid); try { window.dispatchEvent(new Event("hae-statepulled")); } catch { /* ignore */ } }
      }
    } catch { /* ignore */ }
    await f.F.setDoc(f.F.doc(f.db, "users", u.uid), { state: JSON.stringify(state), name: u.user_metadata.name || (u.anonymous ? guestName() : ""), email: u.email || "", anonymous: !!u.anonymous, updatedAt: Date.now(), ...(isNew ? { createdAt: Date.now() } : {}) }, { merge: true });
    return true;
  } catch { return false; }
}

/** 클라우드 → 이 기기. 처음 로그인(클라우드 비어 있음)이면 게스트로 쓰던 정보(코인 제외)를 계정으로 옮겨 옴 */
export async function pullState(pid) {
  const u = await getUser(); if (!u) return { ok: false };
  const f = await fb();
  if (await isBlocked(u.uid)) { await kickBlocked(); return { ok: false, blocked: true }; }
  clearGuestSlot(true);
  let cloud = null;
  try { const s = await f.F.getDoc(f.F.doc(f.db, "users", u.uid)); if (s.exists() && s.data().state) cloud = JSON.parse(s.data().state); }
  catch { return { ok: false, offline: true }; }
  if (!cloud) {
    let moved = 0;
    // 처음 로그인한 계정 하나로만 '옮김'(복사 X) — 다음에 로그인하는 다른 계정·게스트에 내 정보가 남지 않게
    STATE_KEYS.forEach((k) => { const m = read(k); if (m[pid] == null && m.guest != null && k !== "str.wallet.v1") { m[pid] = m.guest; delete m.guest; write(k, m); moved++; } });
    await pushState(pid);
    return { ok: true, first: true, moved };
  }
  const cst = cloud.__stamp || {}, stm = read("str.stamp.v1"), lst = stm[pid] || {};
  let localNewer = false;
  STATE_KEYS.forEach((k) => {
    if (cloud[k] == null) return;
    const m = read(k), local = m[pid];
    // 이 기기에서 더 최근에 고친 항목(친구 추가·생년월일 등)은 클라우드의 옛 값으로 덮지 않음
    if (k !== "str.wallet.v1" && local != null && (lst[k] || 0) > (cst[k] || 0)) { localNewer = true; return; }
    if (cst[k]) lst[k] = cst[k];
    if (k === "str.wallet.v1" && local && typeof local === "object") {
      // 코인: 더 많은 쪽 · 열어 본 풀이: 합치기 — 어느 기기에서 열었든 유지
      const cw = cloud[k];
      const un = [...new Set([...(cw.unlocked || []), ...(local.unlocked || [])])];
      m[pid] = { ...local, ...cw, coins: Math.max(cw.coins || 0, local.coins || 0), unlocked: un };
    } else m[pid] = cloud[k];
    write(k, m);
  });
  stm[pid] = lst; write("str.stamp.v1", stm);
  if (localNewer) pushState(pid).catch(() => {});
  return { ok: true };
}

/* ---- 저장한 풀이 결과 동기화 ---- */
export async function pullResults() {
  const u = await getUser(); if (!u) return [];
  const f = await fb();
  try {
    const qs = await f.F.getDocs(f.F.collection(f.db, "users", u.uid, "results"));
    return qs.docs.map((d) => { try { return JSON.parse(d.data().payload); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

export async function pushResult(result) {
  const u = await getUser(); if (!u || !result || !result.id) return;
  const f = await fb();
  try { await f.F.setDoc(f.F.doc(f.db, "users", u.uid, "results", String(result.id)), { payload: JSON.stringify(result), updatedAt: Date.now() }); } catch { /* ignore */ }
}

export async function pushAll(results) {
  const u = await getUser(); if (!u || !results || !results.length) return;
  const f = await fb();
  try {
    const b = f.F.writeBatch(f.db);
    results.slice(0, 450).forEach((r) => b.set(f.F.doc(f.db, "users", u.uid, "results", String(r.id)), { payload: JSON.stringify(r), updatedAt: Date.now() }));
    await b.commit();
  } catch { /* ignore */ }
}

export async function deleteCloud(id) {
  const u = await getUser(); if (!u) return;
  const f = await fb();
  try { await f.F.deleteDoc(f.F.doc(f.db, "users", u.uid, "results", String(id))); } catch { /* ignore */ }
}

/* ---- 관리자: 전체 회원 보기 (Firestore 규칙에서 관리자 이메일만 읽기 허용) ---- */
export async function adminListUsers() {
  const u = await getUser(); if (!u) return { error: "먼저 로그인해 주세요." };
  const f = await fb();
  try {
    const qs = await f.F.getDocs(f.F.collection(f.db, "users"));
    return { users: qs.docs.map((d) => { const v = d.data() || {}; let st = {}; try { st = JSON.parse(v.state || "{}"); } catch { /* ignore */ } return { uid: d.id, name: displayName(v.name || "", st, !!v.anonymous || !v.email), email: v.email || "", anonymous: !!v.anonymous, updatedAt: v.updatedAt || 0, createdAt: v.createdAt || 0, state: st }; }) };
  } catch (e) {
    return { error: e && e.code === "permission-denied" ? "권한이 없어요. Firestore 규칙에 관리자 이메일이 들어가 있는지, 그 이메일로 로그인했는지 확인해 주세요." : "불러오지 못했어요." };
  }
}
export async function adminUserResults(uid) {
  const f = await fb(); if (!f) return [];
  try {
    const qs = await f.F.getDocs(f.F.collection(f.db, "users", uid, "results"));
    return qs.docs.map((d) => { try { return JSON.parse(d.data().payload); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

/* ---- 회원 탈퇴 (HAE) ----
   1) 클라우드에 저장된 내 데이터(저장한 풀이 · 내 정보 문서) 삭제
   2) Firebase 계정 삭제 — 로그인한 지 오래됐으면 본인 확인(Google 다시 로그인 / 비밀번호) 후 진행 */
export async function deleteAccount(password) {
  const f = await fb().catch(() => null);
  if (!f) return { error: "클라우드 설정이 필요해요." };
  try { await f.auth.authStateReady(); } catch { /* ignore */ }
  const user = f.auth.currentUser;
  if (!user) return { error: "먼저 로그인해 주세요." };
  const isGoogle = (user.providerData || []).some((p) => p.providerId === "google.com");
  const reauth = async () => {
    if (isGoogle) await f.A.reauthenticateWithPopup(user, new f.A.GoogleAuthProvider());
    else {
      if (!password) throw { code: "need-password" };
      await f.A.reauthenticateWithCredential(user, f.A.EmailAuthProvider.credential(user.email, password));
    }
  };
  try {
    // 언제나 먼저 본인 확인 — 그래야 '데이터만 지워지고 계정은 남는' 일이 없음
    await reauth();
    // 데이터부터 지우기 (계정을 먼저 지우면 권한이 없어져서 못 지움)
    // 지우기 전에 휴지통에 30일 보관 — 실수로 탈퇴했을 때 7일 안에 문의하면 복구 (보관함은 관리자만 읽음)
    try {
      let me = null;
      try { const s = await f.F.getDoc(f.F.doc(f.db, "users", user.uid)); if (s.exists()) me = s.data(); } catch { /* ignore */ }
      const rs = (await f.F.getDocs(f.F.collection(f.db, "users", user.uid, "results"))).docs;
      await f.F.setDoc(f.F.doc(f.db, "trash", user.uid), { uid: user.uid, email: user.email || "", name: (me && me.name) || user.displayName || "", anonymous: !!user.isAnonymous, self: true, deletedAt: Date.now(), user: me || null, nResults: rs.length });
      for (let i = 0; i < rs.length; i += 400) { const b = f.F.writeBatch(f.db); rs.slice(i, i + 400).forEach((d) => b.set(f.F.doc(f.db, "trash", user.uid, "results", d.id), d.data())); await b.commit(); }
    } catch { /* 규칙을 아직 안 바꿨으면 보관 없이 진행 */ }
    try {
      const qs = await f.F.getDocs(f.F.collection(f.db, "users", user.uid, "results"));
      for (let i = 0; i < qs.docs.length; i += 400) {
        const b = f.F.writeBatch(f.db);
        qs.docs.slice(i, i + 400).forEach((d) => b.delete(d.ref));
        await b.commit();
      }
      await f.F.deleteDoc(f.F.doc(f.db, "users", user.uid));
    } catch { /* Firestore가 없거나 오프라인이어도 계정 삭제는 진행 */ }
    try { await f.A.deleteUser(user); }
    catch (e) {
      if (e && e.code === "auth/requires-recent-login") { await reauth(); await f.A.deleteUser(user); }
      else throw e;
    }
    rememberMail(null, { signedOut: true });
    return { ok: true, uid: user.uid };
  } catch (e) {
    if (e && e.code === "need-password") return { error: "본인 확인을 위해 비밀번호를 입력해 주세요.", needPassword: true };
    return err(e);
  }
}
export async function currentProvider() {
  const u = await getUser(); return u ? u.provider : null;
}

/* ---- 닉네임 바꾸기 (Google 로그인도 가능) ---- */
export async function setNickname(name) {
  const f = await fb().catch(() => null);
  if (!f) return { error: "클라우드 설정이 필요해요." };
  const u = f.auth.currentUser; if (!u) return { error: "먼저 로그인해 주세요." };
  const nick = String(name || "").trim().slice(0, 20);
  if (!nick) return { error: "닉네임을 입력해 주세요." };
  try { await f.A.updateProfile(u, { displayName: nick }); } catch (e) { return err(e); }
  try { await f.F.setDoc(f.F.doc(f.db, "users", u.uid), { name: nick, updatedAt: Date.now() }, { merge: true }); } catch { /* ignore */ }
  return { ok: true, name: nick };
}

/* ---- 관리자 코인 선물 (HAE) ----
   관리자가 users/{uid}/gifts/{id} 에 선물을 넣고, 받는 사람이 로그인하면 자동으로 받아서 코인에 더한 뒤 지움.
   (규칙: gifts 생성은 관리자만, 읽기·삭제는 본인만 — SETUP.md) */
export async function adminGiftCoins(uid, coins, memo) {
  const f = await fb().catch(() => null);
  if (!f || !f.auth.currentUser) return { error: "먼저 로그인해 주세요." };
  const n = Math.floor(Number(coins));
  if (!n || n < 1 || n > 1000) return { error: "코인은 1~1000개 사이로 넣어 주세요." };
  try {
    const id = "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await f.F.setDoc(f.F.doc(f.db, "users", uid, "gifts", id), { coins: n, memo: String(memo || "").slice(0, 60), from: "해묘", createdAt: Date.now() });
    return { ok: true, id };
  } catch (e) {
    return { error: e && e.code === "permission-denied" ? "선물 권한이 없어요. Firestore 규칙에 gifts 줄이 들어가 있는지 확인해 주세요." : "선물하지 못했어요." };
  }
}
/** 관리자: 보낸 선물이 아직 안 받아졌는지 (true = 받기 전 · false = 이미 받음/없음 · null = 확인 실패) */
export async function adminGiftPending(uid, id) {
  const f = await fb().catch(() => null); if (!f || !f.auth.currentUser || !id) return null;
  try { const s = await f.F.getDoc(f.F.doc(f.db, "users", uid, "gifts", String(id))); return s.exists(); } catch { return null; }
}
/** 관리자: 받기 전 선물 취소 (이미 받았으면 취소 못 함) */
export async function adminCancelGift(uid, id) {
  const f = await fb().catch(() => null); if (!f || !f.auth.currentUser) return { error: "먼저 로그인해 주세요." };
  try {
    const ref = f.F.doc(f.db, "users", uid, "gifts", String(id));
    const s = await f.F.getDoc(ref);
    if (!s.exists()) return { error: "이미 받은 선물이라 취소할 수 없어요." };
    await f.F.deleteDoc(ref);
    return { ok: true };
  } catch (e) { return { error: e && e.code === "permission-denied" ? "취소 권한이 없어요. Firestore 규칙을 확인해 주세요." : "취소하지 못했어요." }; }
}
/** 나에게 온 선물 받기 — [{id, coins, memo}] 를 돌려주고 클라우드에선 지움 */
export async function takeGifts() {
  const f = await fb().catch(() => null);
  const u = f && f.auth.currentUser; if (!u) return [];
  try {
    const qs = await f.F.getDocs(f.F.collection(f.db, "users", u.uid, "gifts"));
    const out = qs.docs.map((d) => ({ id: d.id, coins: Number((d.data() || {}).coins) || 0, memo: (d.data() || {}).memo || "" })).filter((g) => g.coins > 0);
    for (const d of qs.docs) { try { await f.F.deleteDoc(d.ref); } catch { /* ignore */ } }
    return out;
  } catch { return []; }
}


/* ---- 관리자: 회원 삭제 (HAE) ----
   브라우저에선 남의 '로그인 계정' 자체는 못 지워서(서버 권한 필요),
   ① 그 회원의 클라우드 데이터(내 정보·저장한 풀이·선물) 전부 삭제
   ② blocked/{uid} 표시 → 그 계정으로 로그인해도 바로 로그아웃 + 안내
   로그인 기록까지 완전히 없애려면 Firebase 콘솔 › Authentication › 사용자에서 그 이메일 삭제. */
const TRASH_DAYS = 30;   // 실제 보관 30일 (이용자 안내 복구 기간은 7일)
const ASK_DAYS = 7;
export async function adminDeleteUser(uid, email) {
  const f = await fb().catch(() => null);
  if (!f || !f.auth.currentUser) return { error: "먼저 로그인해 주세요." };
  try {
    // 1) 휴지통에 통째로 보관 (30일 보관 · 이용자 안내는 7일)
    let user = null;
    try { const s = await f.F.getDoc(f.F.doc(f.db, "users", uid)); if (s.exists()) user = s.data(); } catch { /* ignore */ }
    let res = [];
    try { res = (await f.F.getDocs(f.F.collection(f.db, "users", uid, "results"))).docs; } catch { res = []; }
    await f.F.setDoc(f.F.doc(f.db, "trash", uid), { uid, email: email || (user && user.email) || "", name: (user && user.name) || "", anonymous: !!(user && user.anonymous), deletedAt: Date.now(), user: user || null, nResults: res.length });
    for (let i = 0; i < res.length; i += 400) { const b = f.F.writeBatch(f.db); res.slice(i, i + 400).forEach((d) => b.set(f.F.doc(f.db, "trash", uid, "results", d.id), d.data())); await b.commit(); }
    // 2) 로그인 막기 + 원래 자리 비우기
    await f.F.setDoc(f.F.doc(f.db, "blocked", uid), { at: Date.now(), email: email || "" });
    for (const sub of ["results", "gifts"]) {
      try {
        const qs = await f.F.getDocs(f.F.collection(f.db, "users", uid, sub));
        for (let i = 0; i < qs.docs.length; i += 400) { const b = f.F.writeBatch(f.db); qs.docs.slice(i, i + 400).forEach((d) => b.delete(d.ref)); await b.commit(); }
      } catch { /* ignore */ }
    }
    await f.F.deleteDoc(f.F.doc(f.db, "users", uid));
    return { ok: true };
  } catch (e) {
    return { error: e && e.code === "permission-denied" ? "삭제 권한이 없어요. Firestore 규칙(blocked · trash 줄 포함)을 새로 게시했는지 확인해 주세요." : `삭제하지 못했어요${e && e.code ? ` (${e.code})` : ""}.` };
  }
}
/* 관리자가 앱을 열면 하루 한 번, 30일 지난 휴지통을 자동으로 완전 삭제 */
function sweepTrash() {
  try {
    const last = +localStorage.getItem("str.trashsweep.v1") || 0;
    if (Date.now() - last < 864e5) return;
    localStorage.setItem("str.trashsweep.v1", String(Date.now()));
    setTimeout(() => { adminListTrash().catch(() => {}); }, 4000);
  } catch { /* ignore */ }
}
async function purgeTrash(f, uid) {
  try {
    const qs = await f.F.getDocs(f.F.collection(f.db, "trash", uid, "results"));
    for (let i = 0; i < qs.docs.length; i += 400) { const b = f.F.writeBatch(f.db); qs.docs.slice(i, i + 400).forEach((d) => b.delete(d.ref)); await b.commit(); }
  } catch { /* ignore */ }
  await f.F.deleteDoc(f.F.doc(f.db, "trash", uid));
}
/** 관리자: 휴지통에서 바로 완전 삭제 (복구 불가) */
export async function adminPurgeUser(uid) {
  const f = await fb().catch(() => null);
  if (!f || !f.auth.currentUser) return { error: "먼저 로그인해 주세요." };
  try { await purgeTrash(f, uid); return { ok: true }; }
  catch (e) { return { error: e && e.code === "permission-denied" ? "삭제 권한이 없어요. Firestore 규칙을 확인해 주세요." : "삭제하지 못했어요." }; }
}
/** 관리자: 삭제한 회원 목록 (30일 지난 건 이때 완전히 지움) */
export async function adminListTrash() {
  const f = await fb().catch(() => null);
  if (!f || !f.auth.currentUser) return { error: "먼저 로그인해 주세요." };
  try {
    const qs = await f.F.getDocs(f.F.collection(f.db, "trash"));
    const now = Date.now(), out = [];
    for (const d of qs.docs) {
      const v = d.data() || {};
      if (now - (v.deletedAt || 0) > TRASH_DAYS * 864e5) { try { await purgeTrash(f, d.id); } catch { /* ignore */ } continue; }
      let tst = {}; try { tst = JSON.parse((v.user && v.user.state) || "{}"); } catch { /* ignore */ }
      out.push({ uid: d.id, name: displayName(v.name || "", tst, !!v.anonymous || !v.email), email: v.email || "", anonymous: !!v.anonymous, self: !!v.self, deletedAt: v.deletedAt || 0, nResults: v.nResults || 0, late: now - (v.deletedAt || 0) > ASK_DAYS * 864e5, left: Math.max(0, Math.ceil((TRASH_DAYS * 864e5 - (now - (v.deletedAt || 0))) / 864e5)) });
    }
    return { list: out.sort((a, b) => b.deletedAt - a.deletedAt) };
  } catch (e) { return { error: e && e.code === "permission-denied" ? "휴지통 권한이 없어요. Firestore 규칙에 trash 줄을 넣고 게시해 주세요." : "불러오지 못했어요." }; }
}
/** 관리자: 삭제한 회원 되살리기 — 정보·저장한 풀이를 원래 자리로, 로그인 막힘 풀기 */
export async function adminRestoreUser(uid, toUid) {
  const f = await fb().catch(() => null);
  if (!f || !f.auth.currentUser) return { error: "먼저 로그인해 주세요." };
  try {
    const s = await f.F.getDoc(f.F.doc(f.db, "trash", uid));
    if (!s.exists()) return { error: "휴지통에 없어요 (30일이 지나 완전히 지워졌을 수 있어요)." };
    const v = s.data() || {};
    const dest = toUid || uid;
    if (v.user) {
      if (dest === uid) await f.F.setDoc(f.F.doc(f.db, "users", uid), v.user);
      else {
        // 스스로 탈퇴한 회원 → 다시 가입한 새 계정으로 옮김. 옛 정보가 새 기기 값에 밀리지 않게 고친 시각을 지금으로
        let st = {}; try { st = JSON.parse(v.user.state || "{}"); } catch { st = {}; }
        const now = Date.now(), stamp = {};
        Object.keys(st).forEach((k) => { if (k !== "__stamp") stamp[k] = now; });
        st.__stamp = stamp;
        await f.F.setDoc(f.F.doc(f.db, "users", dest), { state: JSON.stringify(st), restoredFrom: uid, updatedAt: now }, { merge: true });
      }
    }
    const qs = await f.F.getDocs(f.F.collection(f.db, "trash", uid, "results"));
    for (let i = 0; i < qs.docs.length; i += 400) { const b = f.F.writeBatch(f.db); qs.docs.slice(i, i + 400).forEach((d) => b.set(f.F.doc(f.db, "users", dest, "results", d.id), d.data())); await b.commit(); }
    if (dest === uid) await f.F.deleteDoc(f.F.doc(f.db, "blocked", uid));
    await purgeTrash(f, uid);
    return { ok: true };
  } catch (e) { return { error: e && e.code === "permission-denied" ? "복구 권한이 없어요. Firestore 규칙을 새로 게시했는지 확인해 주세요." : `복구하지 못했어요${e && e.code ? ` (${e.code})` : ""}.` }; }
}
async function isBlocked(uid) {
  const f = await fb().catch(() => null); if (!f) return false;
  try { const s = await f.F.getDoc(f.F.doc(f.db, "blocked", uid)); return s.exists(); } catch { return false; }
}
async function kickBlocked() {
  const f = await fb().catch(() => null);
  if (f) { try { await f.A.signOut(f.auth); } catch { /* ignore */ } }
  rememberMail(null, { signedOut: true });
  try { window.dispatchEvent(new CustomEvent("hae-blocked")); } catch { /* ignore */ }
}

/* ---- 메일 링크 처리 (비밀번호 재설정 · 이메일 인증) — 앱 안에서 직접 ----
   Firebase 콘솔 › Authentication › 템플릿 › '작업 URL 맞춤설정'에 이 사이트 주소를 넣으면
   메일 링크가 ?mode=resetPassword&oobCode=… 로 이 앱에 돌아와요. */
export async function checkResetCode(code) {
  const f = await fb().catch(() => null); if (!f) return { error: "클라우드 설정이 필요해요." };
  try { const email = await f.A.verifyPasswordResetCode(f.auth, code); return { ok: true, email }; } catch (e) { return err(e); }
}
export async function doResetPassword(code, pw) {
  const f = await fb().catch(() => null); if (!f) return { error: "클라우드 설정이 필요해요." };
  try { await f.A.confirmPasswordReset(f.auth, code, pw); return { ok: true }; } catch (e) { return err(e); }
}
export async function doApplyCode(code) {
  const f = await fb().catch(() => null); if (!f) return { error: "클라우드 설정이 필요해요." };
  try { await f.A.applyActionCode(f.auth, code); return { ok: true }; } catch (e) { return err(e); }
}

/* ---- 앱 안에서 비밀번호 바꾸기 · Google 계정 연결 (HAE) ---- */
export async function changePassword(curPw, newPw) {
  const f = await fb().catch(() => null);
  const u = f && f.auth.currentUser; if (!u) return { error: "먼저 로그인해 주세요." };
  if (!newPw || newPw.length < 6) return { error: "새 비밀번호는 6자 이상으로 해 주세요." };
  try {
    await f.A.reauthenticateWithCredential(u, f.A.EmailAuthProvider.credential(u.email, curPw || ""));
    await f.A.updatePassword(u, newPw);
    return { ok: true };
  } catch (e) { return err(e); }
}
/** 이메일 계정에 Google 로그인도 붙이기 — 비밀번호를 잊어도 Google로 들어올 수 있게 */
export async function linkGoogle() {
  const f = await fb().catch(() => null);
  const u = f && f.auth.currentUser; if (!u) return { error: "먼저 로그인해 주세요." };
  try { await f.A.linkWithPopup(u, new f.A.GoogleAuthProvider()); rememberMail(f.auth.currentUser); return { ok: true }; }
  catch (e) {
    if (e && e.code === "auth/credential-already-in-use") return { error: "그 Google 계정은 이미 다른 해묘 계정에 쓰이고 있어요." };
    if (e && e.code === "auth/provider-already-linked") return { error: "이미 Google이 연결돼 있어요." };
    return err(e);
  }
}
export async function linkedProviders() {
  const f = await fb().catch(() => null);
  const u = f && f.auth.currentUser; return u ? (u.providerData || []).map((p) => p.providerId) : [];
}

/* ---- 후기 · 1:1 문의 (HAE) ----
   reviews/{id}   : 누구나 읽기, 로그인한 본인만 쓰기, 관리자·본인 삭제
   inquiries/{id} : 본인·관리자만 읽기, 본인이 보내고 관리자만 답변 (규칙은 SETUP.md) */
const newId = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const permMsg = (e, what) => (e && e.code === "permission-denied" ? `${what} 권한이 없어요. Firestore 규칙에 reviews · inquiries 줄이 들어가 있는지 확인해 주세요.` : `${what}에 실패했어요. 잠시 뒤 다시 해 주세요.`);
export async function cloudAddReview(r) {
  const f = await fb().catch(() => null);
  const u = f && f.auth.currentUser; if (!u) return { error: "login" };
  try {
    await f.F.setDoc(f.F.doc(f.db, "reviews", r.id), { id: r.id, uid: u.uid, guest: !!u.isAnonymous, nickname: r.nickname, rating: r.rating, content: r.content, createdAt: r.createdAt }); // 이메일은 공개 후기에 넣지 않음(관리자는 uid로 회원 목록에서 찾음)
    return { ok: true };
  } catch (e) { return { error: permMsg(e, "후기 올리기") }; }
}
export async function cloudListReviews() {
  const f = await fb().catch(() => null); if (!f) return null;
  try {
    const qs = await f.F.getDocs(f.F.collection(f.db, "reviews"));
    return qs.docs.map((d) => d.data()).filter((x) => x && x.content).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch { return null; }
}
export async function cloudDeleteReview(id) {
  const f = await fb().catch(() => null); if (!f) return;
  try { await f.F.deleteDoc(f.F.doc(f.db, "reviews", String(id))); } catch { /* ignore */ }
}
export async function sendInquiry({ cat, title, body, name }) {
  const f = await fb().catch(() => null);
  const u = f && f.auth.currentUser; if (!u) return { error: "login" };
  const id = newId("q");
  try {
    await f.F.setDoc(f.F.doc(f.db, "inquiries", id), {
      id, uid: u.uid, email: u.email || "", name: String(name || "").slice(0, 20), anonymous: !!u.isAnonymous,
      cat: String(cat || "기타").slice(0, 12), title: String(title || "").slice(0, 60), body: String(body || "").slice(0, 2000),
      createdAt: Date.now(), status: "wait", reply: "", repliedAt: 0,
    });
    return { ok: true, id };
  } catch (e) { return { error: permMsg(e, "문의 보내기") }; }
}
export async function myInquiries() {
  const f = await fb().catch(() => null);
  const u = f && f.auth.currentUser; if (!u) return null;
  try {
    const qs = await f.F.getDocs(f.F.query(f.F.collection(f.db, "inquiries"), f.F.where("uid", "==", u.uid)));
    return qs.docs.map((d) => d.data()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch { return null; }
}
export async function adminInquiries() {
  const f = await fb().catch(() => null); if (!f || !f.auth.currentUser) return { error: "먼저 로그인해 주세요." };
  try {
    const qs = await f.F.getDocs(f.F.collection(f.db, "inquiries"));
    return { list: qs.docs.map((d) => d.data()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)) };
  } catch (e) { return { error: permMsg(e, "문의 불러오기") }; }
}
export async function adminReplyInquiry(id, reply) {
  const f = await fb().catch(() => null); if (!f || !f.auth.currentUser) return { error: "먼저 로그인해 주세요." };
  try {
    await f.F.updateDoc(f.F.doc(f.db, "inquiries", String(id)), { reply: String(reply || "").slice(0, 2000), repliedAt: Date.now(), status: "done" });
    return { ok: true };
  } catch (e) { return { error: permMsg(e, "답변 보내기") }; }
}
export async function deleteInquiry(id) {
  const f = await fb().catch(() => null); if (!f) return;
  try { await f.F.deleteDoc(f.F.doc(f.db, "inquiries", String(id))); } catch { /* ignore */ }
}


/** 로그인 전(게스트 칸)에 남은 내 정보 지우기 — 로그아웃·다른 계정 로그인 때 예전 계정 정보가 비치지 않게.
 *  onlyCopies=true 면 어느 계정 칸과 똑같은 '복사본'일 때만 지움 */
export function clearGuestSlot(onlyCopies = false) {
  ["str.mybirth.v1", "str.people.v1", "str.family.v1", "str.avatar.v1", "str.viewas.v1"].forEach((k) => {
    const m = read(k); if (m.guest == null) return;
    if (onlyCopies) {
      const g = JSON.stringify(m.guest);
      if (!Object.keys(m).some((id) => id !== "guest" && JSON.stringify(m[id]) === g)) return;
    }
    delete m.guest; write(k, m);
  });
}


/* ---- 공지 (HAE) — notice/main 한 개 · 누구나 읽기 · 관리자만 쓰기 ---- */
export async function getNotice() {
  const f = await fb().catch(() => null); if (!f) return null;
  try { const s = await f.F.getDoc(f.F.doc(f.db, "notice", "main")); return s.exists() ? s.data() : { on: false }; } catch { return null; }
}
export async function adminSetNotice({ text = "", tone = "info", on = true } = {}) {
  const f = await fb().catch(() => null); if (!f || !f.auth.currentUser) return { error: "먼저 로그인해 주세요." };
  try {
    const n = { text: String(text).trim().slice(0, 140), tone, on: !!on && !!String(text).trim(), updatedAt: Date.now() };
    await f.F.setDoc(f.F.doc(f.db, "notice", "main"), n);
    return { ok: true, notice: n };
  } catch (e) { return { error: e && e.code === "permission-denied" ? "공지 권한이 없어요. Firestore 규칙에 notice 줄을 넣고 게시해 주세요." : "공지를 저장하지 못했어요." }; }
}
