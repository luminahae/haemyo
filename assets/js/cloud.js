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
    if (user.isAnonymous) return; // 게스트는 비밀번호가 없음 — 본인 확인 없이 바로
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
    try { await f.F.deleteDoc(f.F.doc(f.db, "push", user.uid)); } catch { /* 알림 설정도 같이 지움 */ }
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
/* 도배 방지 — 후기 하루 한 번 · 문의 3분에 한 번 (Firestore 규칙 limits/{uid}와 짝) */
const GAP = { review: 24 * 3600e3, inquiry: 3 * 60e3 };
const gapLeft = (kind) => { try { const t = +(JSON.parse(localStorage.getItem("str.lastpost.v1") || "{}")[kind] || 0); return Math.max(0, t + GAP[kind] - Date.now()); } catch { return 0; } };
const markPost = (kind) => { try { const m = JSON.parse(localStorage.getItem("str.lastpost.v1") || "{}"); m[kind] = Date.now(); localStorage.setItem("str.lastpost.v1", JSON.stringify(m)); } catch { /* ignore */ } };
const waitMsg = (ms) => ms > 3600e3 ? `후기는 하루에 한 번 올릴 수 있어요 · ${Math.ceil(ms / 3600e3)}시간 뒤에 다시 할 수 있어요.` : `조금만 쉬었다가 보내 주세요 · ${Math.ceil(ms / 60e3)}분 뒤에 다시 할 수 있어요.`;
/** 글 + 'limits/{uid}' 시각을 한 번에 저장 (규칙이 간격을 확인) */
async function postWithLimit(f, u, ref, data, kind) {
  const b = f.F.writeBatch(f.db);
  b.set(ref, data);
  b.set(f.F.doc(f.db, "limits", u.uid), { [kind === "review" ? "lastReview" : "lastInquiry"]: f.F.serverTimestamp() }, { merge: true });
  await b.commit();
  markPost(kind);
}
const permMsg = (e, what) => (e && e.code === "permission-denied" ? `${what} 권한이 없어요. Firestore 규칙에 reviews · inquiries 줄이 들어가 있는지 확인해 주세요.` : `${what}에 실패했어요. 잠시 뒤 다시 해 주세요.`);
export async function cloudAddReview(r) {
  const f = await fb().catch(() => null);
  const u = f && f.auth.currentUser; if (!u) return { error: "login" };
  const left = gapLeft("review"); if (left) return { error: waitMsg(left) };
  try {
    // 이메일은 공개 후기에 넣지 않음(관리자는 uid로 회원 목록에서 찾음)
    const data = { id: r.id, uid: u.uid, guest: !!u.isAnonymous, nickname: String(r.nickname || "").slice(0, 20), rating: Math.max(1, Math.min(5, Math.round(+r.rating || 5))), content: String(r.content || "").slice(0, 500), createdAt: r.createdAt };
    await postWithLimit(f, u, f.F.doc(f.db, "reviews", r.id), data, "review");
    return { ok: true };
  } catch (e) { return { error: e && e.code === "permission-denied" ? "후기를 올리지 못했어요. 후기는 하루에 한 번 올릴 수 있어요." : permMsg(e, "후기 올리기") }; }
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
  const left = gapLeft("inquiry"); if (left) return { error: waitMsg(left) };
  try {
    await postWithLimit(f, u, f.F.doc(f.db, "inquiries", id), {
      id, uid: u.uid, email: u.email || "", name: String(name || "").slice(0, 20), anonymous: !!u.isAnonymous,
      cat: String(cat || "기타").slice(0, 12), title: String(title || "").slice(0, 60), body: String(body || "").slice(0, 2000),
      createdAt: Date.now(), status: "wait", reply: "", repliedAt: 0,
    }, "inquiry");
    return { ok: true, id };
  } catch (e) { return { error: e && e.code === "permission-denied" ? "문의를 보내지 못했어요. 방금 보냈다면 3분 뒤에 다시 해 주세요." : permMsg(e, "문의 보내기") }; }
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
export async function adminSetNotice({ text = "", tone = "info", on = true, from = "", until = "" } = {}) {
  const f = await fb().catch(() => null); if (!f || !f.auth.currentUser) return { error: "먼저 로그인해 주세요." };
  try {
    const d8 = (x) => (/^\d{4}-\d{2}-\d{2}$/.test(String(x || "")) ? String(x) : "");
    const n = { text: String(text).trim().slice(0, 140), tone, on: !!on && !!String(text).trim(), from: d8(from), until: d8(until), updatedAt: Date.now() };
    await f.F.setDoc(f.F.doc(f.db, "notice", "main"), n);
    return { ok: true, notice: n };
  } catch (e) { return { error: e && e.code === "permission-denied" ? "공지 권한이 없어요. Firestore 규칙에 notice 줄을 넣고 게시해 주세요." : "공지를 저장하지 못했어요." }; }
}


/* ---- 🎁 기념일 선물 (HAE) — notice/events 한 개 · 누구나 읽기 · 관리자만 쓰기 (공지 규칙 그대로) ---- */
export async function getEvents() {
  const f = await fb().catch(() => null); if (!f) return null;
  try { const s = await f.F.getDoc(f.F.doc(f.db, "notice", "events")); return s.exists() ? (s.data().list || []) : []; } catch { return null; }
}
export async function adminSetEvents(list) {
  const f = await fb().catch(() => null); if (!f || !f.auth.currentUser) return { error: "먼저 로그인해 주세요." };
  try {
    const clean = (list || []).slice(-80).map((e) => ({
      id: String(e.id), date: String(e.date), until: String(e.until || ""), mode: ["day", "range", "after"].includes(e.mode) ? e.mode : "day",
      title: String(e.title || "").slice(0, 24), msg: String(e.msg || "").slice(0, 80), emoji: String(e.emoji || "🎁").slice(0, 4),
      coins: Math.max(1, Math.min(100, Math.round(+e.coins || 0))),
    }));
    await f.F.setDoc(f.F.doc(f.db, "notice", "events"), { list: clean, updatedAt: Date.now() });
    return { ok: true, list: clean };
  } catch (e) { return { error: e && e.code === "permission-denied" ? "저장 권한이 없어요. 관리자 계정으로 로그인했는지 확인해 주세요." : "기념일을 저장하지 못했어요." }; }
}


/* ===================================================================
   🔔 운세 알림 (웹 푸시 · Firebase Cloud Messaging) (HAE)
   · 이 기기 알림 주소(token) + 받을 시각 + 생년월일을 push/{uid}에 저장
   · 실제 발송은 GitHub Actions(push/send.mjs)가 1시간마다 확인해서 보냄
   =================================================================== */
export function pushSupport() {
  const ua = (typeof navigator !== "undefined" && navigator.userAgent) || "";
  const ios = /iPhone|iPad|iPod/i.test(ua) || (typeof navigator !== "undefined" && navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = (() => { try { return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true; } catch { return false; } })();
  if (/KAKAOTALK|Instagram|FBAN|FBAV|NAVER|Line\//i.test(ua)) return { ok: false, why: "inapp" };
  if (ios && !standalone) return { ok: false, why: "ios-install" };
  if (!("serviceWorker" in navigator) || !("Notification" in window) || !("PushManager" in window)) return { ok: false, why: "browser" };
  if (!getConfig().pushVapidKey) return { ok: false, why: "nokey" };
  return { ok: true, ios, standalone };
}
async function pushReg() {
  const reg = await navigator.serviceWorker.register("./firebase-messaging-sw.js", { scope: "./" });
  await navigator.serviceWorker.ready;
  return reg;
}
export async function getPushSetting() {
  const f = await fb().catch(() => null); if (!f) return null;
  try { await f.auth.authStateReady(); } catch { /* ignore */ }
  const u = f.auth.currentUser; if (!u) return null;
  try { const s = await f.F.getDoc(f.F.doc(f.db, "push", u.uid)); return s.exists() ? s.data() : null; } catch { return null; }
}
const birthOnly = (b) => (b ? { name: String(b.name || "").slice(0, 20), birthDate: b.birthDate || "", birthTime: b.birthTime || "", timeUnknown: !!b.timeUnknown, calendarType: b.calendarType || "solar", leapMonth: !!b.leapMonth, gender: b.gender || "female", timezone: b.timezone || "Asia/Seoul" } : null);
/** 알림 켜기 · 시간 바꾸기 — 권한 요청 → 이 기기 알림 주소 받기 → 저장 */
export async function enablePush({ hour = 8, mode = "daily", birth = null } = {}) {
  const sup = pushSupport(); if (!sup.ok) return { error: "이 기기에서는 알림을 켤 수 없어요." };
  const f = await fb().catch(() => null); if (!f) return { error: "클라우드 설정이 필요해요." };
  try { await f.auth.authStateReady(); } catch { /* ignore */ }
  const u = f.auth.currentUser; if (!u) return { error: "먼저 로그인해 주세요." };
  if (!birth || !birth.birthDate) return { error: "먼저 내 생년월일을 넣어 주세요." };
  let perm = Notification.permission;
  if (perm === "default") perm = await Notification.requestPermission();
  if (perm !== "granted") return { error: "알림 권한이 꺼져 있어요. 폰 설정 › 알림에서 해묘(또는 브라우저)를 허용해 주세요.", denied: true };
  try {
    const reg = await pushReg();
    const M = await import(/* @vite-ignore */ `${SDK}/firebase-messaging.js`);
    if (M.isSupported && !(await M.isSupported())) return { error: "이 브라우저는 알림을 지원하지 않아요." };
    const token = await M.getToken(M.getMessaging(f.app), { vapidKey: getConfig().pushVapidKey, serviceWorkerRegistration: reg });
    if (!token) return { error: "알림 주소를 받지 못했어요. 잠시 뒤 다시 해 주세요." };
    const h = Math.max(0, Math.min(23, Math.round(+hour)));
    const prev = await getPushSetting();
    const doc = { token, on: true, hour: h, mode: mode === "good" ? "good" : "daily", birth: birthOnly(birth), updatedAt: Date.now(), lastSent: (prev && prev.lastSent) || "" };
    await f.F.setDoc(f.F.doc(f.db, "push", u.uid), doc);
    try { await reg.showNotification("🔔 운세 알림이 켜졌어요", { body: `매일 ${h < 12 ? "오전" : "오후"} ${h % 12 || 12}시쯤 ${doc.mode === "good" ? "날이 좋은 날에만" : "오늘의 운세를"} 보내 드릴게요 🐾`, icon: "assets/img/icon-192.png", badge: "assets/img/icon-192.png", tag: "hae-push-on" }); } catch { /* ignore */ }
    return { ok: true, setting: doc };
  } catch (e) {
    return { error: e && e.code === "permission-denied" ? "저장 권한이 없어요. Firestore 규칙에 알림(push) 칸을 추가했는지 확인해 주세요." : "알림을 켜지 못했어요. 잠시 뒤 다시 해 주세요." };
  }
}
export async function disablePush() {
  const f = await fb().catch(() => null); if (!f) return { error: "클라우드 설정이 필요해요." };
  const u = f.auth.currentUser; if (!u) return { error: "먼저 로그인해 주세요." };
  try { await f.F.updateDoc(f.F.doc(f.db, "push", u.uid), { on: false, updatedAt: Date.now() }); return { ok: true }; }
  catch { try { await f.F.deleteDoc(f.F.doc(f.db, "push", u.uid)); } catch { /* ignore */ } return { ok: true }; }
}
/** 생년월일이 바뀌었으면 알림용 정보도 맞춰 둠 (조용히) */
export async function syncPushBirth(birth) {
  const s = await getPushSetting(); if (!s || !s.on || !birth) return;
  const b = birthOnly(birth); if (JSON.stringify(b) === JSON.stringify(s.birth)) return;
  const f = await fb().catch(() => null); const u = f && f.auth.currentUser; if (!u) return;
  try { await f.F.updateDoc(f.F.doc(f.db, "push", u.uid), { birth: b, updatedAt: Date.now() }); } catch { /* ignore */ }
}


/* ===================================================================
   📊 방문 통계 · 🚨 오류 자동 신고 (HAE)
   · stats/{YYYY-MM-DD}  → v(방문 기기) · n(처음 온 기기) · pv(화면 열람) · p{화면별} · dev{폰·PC·앱} · err(오류 수)
     개인 정보 없이 숫자만 더해요. 기기마다 하루 한 번만 '방문'으로 세요.
   · errors/{id}         → 오류 메시지 · 화면 · 기기 종류 · 버전 (같은 오류는 기기마다 하루 한 번만)
   · 진짜 사이트 주소에서만 세요 (내 PC 테스트 · 미리보기는 빼고) — 개인 도메인을 붙이면 STAT_HOSTS에 추가
   · 관리자 모드를 켠 기기는 세지 않아요
   =================================================================== */
const STAT_HOSTS = ["luminahae.github.io"];
const kstDay = (t = Date.now()) => new Date(t + 9 * 3600 * 1000).toISOString().slice(0, 10);
function statOn() {
  try {
    if (!STAT_HOSTS.includes(location.hostname)) return false;
    if (localStorage.getItem("str.admin.v1") === "1") return false; // 관리자 기기는 빼고
    return isCloudEnabled();
  } catch { return false; }
}
const KEEP2 = new Set(["saju", "tarot", "compat", "fortune", "pull", "free", "theme"]);
/** 화면 주소 → 통계 이름 (/saju/result → saju-result, /result/abc → result) */
export function statKey(path) {
  const segs = String(path || "").split("?")[0].split("/").filter(Boolean);
  if (!segs.length) return "home";
  const a = segs[0].replace(/[^a-z0-9-]/gi, "").slice(0, 24) || "etc";
  const b = segs[1] && KEEP2.has(a) && /^[a-z][a-z0-9-]{0,23}$/i.test(segs[1]) ? "-" + segs[1] : "";
  return (a + b).toLowerCase();
}
let _sb = null, _sbT = null;
function sbAdd(fn) {
  if (!statOn()) return;
  _sb = _sb || { pv: 0, p: {}, v: 0, n: 0, dev: {}, err: 0 };
  fn(_sb);
  clearTimeout(_sbT); _sbT = setTimeout(flushStats, 15000);
}
export async function flushStats() {
  clearTimeout(_sbT); _sbT = null;
  const b = _sb; _sb = null;
  if (!b) return;
  const f = await fb().catch(() => null); if (!f) return;
  const inc = f.F.increment, d = {};
  if (b.pv) d.pv = inc(b.pv);
  if (b.v) d.v = inc(b.v);
  if (b.n) d.n = inc(b.n);
  if (b.err) d.err = inc(b.err);
  const p = Object.entries(b.p); if (p.length) d.p = Object.fromEntries(p.map(([k, c]) => [k, inc(c)]));
  const dv = Object.entries(b.dev); if (dv.length) d.dev = Object.fromEntries(dv.map(([k, c]) => [k, inc(c)]));
  try { await f.F.setDoc(f.F.doc(f.db, "stats", kstDay()), d, { merge: true }); } catch { /* 규칙을 아직 안 넣었으면 조용히 건너뜀 */ }
}
if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushStats(); });

/** 앱을 열 때 — 이 기기의 오늘 첫 방문이면 1 */
export function statVisit() {
  try {
    const day = kstDay();
    if (localStorage.getItem("str.stat.day") === day) return;
    sbAdd((b) => {
      localStorage.setItem("str.stat.day", day);
      b.v += 1;
      if (!localStorage.getItem("str.stat.first")) { localStorage.setItem("str.stat.first", day); b.n += 1; }
      const ua = navigator.userAgent || "";
      const app = (() => { try { return matchMedia("(display-mode: standalone)").matches || navigator.standalone === true; } catch { return false; } })();
      const k = app ? "app" : /KAKAOTALK|Instagram|FBAN|FBAV|NAVER|Line\//i.test(ua) ? "inapp" : /Android|iPhone|iPad|iPod|Mobile/i.test(ua) ? "mob" : "pc";
      b.dev[k] = (b.dev[k] || 0) + 1;
    });
  } catch { /* ignore */ }
}
/** 화면을 열 때마다 */
export function statRoute(path) {
  sbAdd((b) => { const k = statKey(path); b.pv += 1; b.p[k] = (b.p[k] || 0) + 1; });
}

/* ---- 🚨 오류 자동 신고 ---- */
const ERR_SKIP = /ResizeObserver loop|Script error\.?$|chrome-extension|moz-extension|safari-extension|webkit-masked-url|__gCrWeb|AbortError|The user aborted|Load failed|Failed to fetch|NetworkError|Network request failed|NotAllowedError|permission-denied|unavailable|QuotaExceeded/i;
let _errN = 0;
export function devName(ua) {
  ua = ua || "";
  const os = /iPhone|iPad|iPod/i.test(ua) ? "iOS" : /Android/i.test(ua) ? "Android" : /Windows/i.test(ua) ? "Windows" : /Mac OS/i.test(ua) ? "Mac" : "기타";
  const br = /KAKAOTALK/i.test(ua) ? "카톡" : /NAVER/i.test(ua) ? "네이버" : /SamsungBrowser/i.test(ua) ? "삼성인터넷" : /Edg\//.test(ua) ? "Edge" : /CriOS|Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox|FxiOS/.test(ua) ? "Firefox" : "브라우저";
  return `${os} · ${br}`;
}
export async function reportError(err, where = "") {
  try {
    if (!statOn() || _errN >= 5) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return; // 인터넷 끊김은 오류가 아니라서
    const msg = String((err && (err.message || err.reason || err)) || "알 수 없는 오류").slice(0, 300);
    if (ERR_SKIP.test(msg)) return;
    const day = kstDay(), seenK = "str.errseen.v1";
    let seen = {}; try { seen = JSON.parse(localStorage.getItem(seenK) || "{}"); } catch { /* ignore */ }
    if (seen.d !== day || !Array.isArray(seen.m)) seen = { d: day, m: [] };
    const sig = msg.slice(0, 80);
    if (seen.m.includes(sig)) return;
    seen.m.push(sig); seen.m = seen.m.slice(-20);
    try { localStorage.setItem(seenK, JSON.stringify(seen)); } catch { /* ignore */ }
    _errN += 1;
    const stack = String((err && err.stack) || "").split("\n").slice(0, 4).join("\n").replace(/https?:\/\/[^/\s]+/g, "").slice(0, 600);
    const f = await fb().catch(() => null); if (!f) return;
    sbAdd((b) => { b.err += 1; });
    await f.F.addDoc(f.F.collection(f.db, "errors"), {
      msg, stack, where: String(where).slice(0, 60),
      path: String((location.hash || "#/").split("?")[0]).slice(0, 80),
      dev: devName(navigator.userAgent), build: String(document.documentElement.dataset.build || "").slice(0, 20),
      at: Date.now(),
    });
  } catch { /* 신고 실패는 조용히 */ }
}
/** 앱 시작할 때 한 번 — 처리 안 된 오류를 자동으로 잡아요 */
export function watchErrors() {
  if (typeof window === "undefined" || window.__haeErrWatch) return;
  window.__haeErrWatch = true;
  window.addEventListener("error", (e) => {
    if (e && e.target && e.target !== window && (e.target.src || e.target.href)) return; // 이미지·파일 못 받음은 빼고
    reportError(e.error || e.message, e.filename ? `${String(e.filename).split("/").pop()}:${e.lineno}` : "window");
  }, true);
  window.addEventListener("unhandledrejection", (e) => reportError(e.reason, "promise"));
}

/* ---- 관리자: 통계 · 오류 읽기 ---- */
export async function adminStats(days = 30) {
  const f = await fb().catch(() => null); if (!f || !f.auth.currentUser) return { error: "먼저 로그인해 주세요." };
  try {
    const from = kstDay(Date.now() - (days - 1) * 86400000);
    const q = f.F.query(f.F.collection(f.db, "stats"), f.F.where(f.F.documentId(), ">=", from));
    const s = await f.F.getDocs(q);
    const map = {}; s.forEach((d) => { map[d.id] = d.data(); });
    const out = [];
    for (let i = days - 1; i >= 0; i--) { const k = kstDay(Date.now() - i * 86400000); out.push({ day: k, ...(map[k] || {}) }); }
    let pushOn = null;
    try { const c = await f.F.getCountFromServer(f.F.query(f.F.collection(f.db, "push"), f.F.where("on", "==", true))); pushOn = c.data().count; } catch { /* 규칙에 관리자 읽기 줄이 없으면 */ }
    return { days: out, pushOn };
  } catch (e) { return { error: e && e.code === "permission-denied" ? "통계를 볼 권한이 없어요. Firestore 규칙에 stats 줄을 넣고 게시해 주세요." : "통계를 불러오지 못했어요." }; }
}
export async function adminErrors() {
  const f = await fb().catch(() => null); if (!f || !f.auth.currentUser) return { error: "먼저 로그인해 주세요." };
  try {
    const s = await f.F.getDocs(f.F.query(f.F.collection(f.db, "errors"), f.F.orderBy("at", "desc"), f.F.limit(200)));
    const list = []; s.forEach((d) => list.push({ id: d.id, ...d.data() }));
    return { list };
  } catch (e) { return { error: e && e.code === "permission-denied" ? "오류 기록을 볼 권한이 없어요. Firestore 규칙에 errors 줄을 넣고 게시해 주세요." : "오류 기록을 불러오지 못했어요." }; }
}
export async function adminDeleteErrors(ids) {
  const f = await fb().catch(() => null); if (!f || !f.auth.currentUser) return { error: "먼저 로그인해 주세요." };
  try { await Promise.all((ids || []).map((id) => f.F.deleteDoc(f.F.doc(f.db, "errors", id)))); return { ok: true }; }
  catch { return { error: "지우지 못했어요." }; }
}


/* ===================================================================
   🔮 해묘 상담소 — 전문가(관리자가 답하는) 상담 (HAE)
   · notice/experts  → 상담사 목록 { list: [{ id, name, em, field, intro, cost, on }] } — 누구나 읽기 · 관리자만 쓰기
   · consults/{id}   → 상담 한 건 { uid, name, expertId, expertName, field, title, birth, msgs:[{by:"u"|"e", t, at}],
                         status: "wait"|"answered"|"done", unreadUser, unreadAdmin, replyPushed, createdAt, updatedAt }
   =================================================================== */
export const DEFAULT_EXPERTS = [
  { id: "tarot", name: "루나", em: "🔮", field: "타로", intro: "카드 세 장으로 지금 마음과 흐름을 읽어 드려요. 연애 · 선택 고민에 강해요.", cost: 3, on: true },
  { id: "saju", name: "해원", em: "📜", field: "사주", intro: "사주(四柱) 원국과 대운으로 큰 흐름을 짚어 드려요. 진로 · 시기 고민에 강해요.", cost: 3, on: true },
  { id: "love", name: "묘묘", em: "💗", field: "연애", intro: "두 사람의 사주 궁합과 지금 마음을 함께 봐요. 재회 · 썸 · 이별 고민 환영해요.", cost: 3, on: true },
];
export async function getExperts() {
  const f = await fb().catch(() => null); if (!f) return DEFAULT_EXPERTS;
  try { const s = await f.F.getDoc(f.F.doc(f.db, "notice", "experts")); const l = s.exists() ? (s.data().list || []) : []; return l.length ? l : DEFAULT_EXPERTS; } catch { return DEFAULT_EXPERTS; }
}
export async function adminSetExperts(list) {
  const f = await fb().catch(() => null); if (!f || !f.auth.currentUser) return { error: "먼저 로그인해 주세요." };
  try {
    const clean = (list || []).slice(0, 12).map((e, i) => ({
      id: String(e.id || "x" + i).replace(/[^a-z0-9_-]/gi, "").slice(0, 20) || "x" + i, name: String(e.name || "상담사").slice(0, 12), em: String(e.em || "🔮").slice(0, 4),
      field: String(e.field || "사주").slice(0, 8), intro: String(e.intro || "").slice(0, 120), cost: Math.max(0, Math.min(50, Math.round(+e.cost || 0))), on: e.on !== false,
    }));
    await f.F.setDoc(f.F.doc(f.db, "notice", "experts"), { list: clean, updatedAt: Date.now() });
    return { ok: true, list: clean };
  } catch (e) { return { error: permMsg(e, "상담사 저장") }; }
}
/** 새 상담 보내기 — 첫 메시지 포함 */
export async function createConsult({ expert, title, body, birth, name }) {
  const f = await fb().catch(() => null); const u = f && f.auth.currentUser;
  if (!u) return { error: "로그인한 뒤에 상담을 보낼 수 있어요." };
  const id = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), now = Date.now();
  const doc = {
    id, uid: u.uid, name: String(name || "익명").slice(0, 20), expertId: String(expert.id).slice(0, 20), expertName: String(expert.name).slice(0, 12), field: String(expert.field).slice(0, 8),
    title: String(title || "").slice(0, 60), birth: String(birth || "").slice(0, 300),
    msgs: [{ by: "u", t: String(body || "").slice(0, 1500), at: now }],
    status: "wait", unreadUser: false, unreadAdmin: true, replyPushed: true, createdAt: now, updatedAt: now,
  };
  try { await f.F.setDoc(f.F.doc(f.db, "consults", id), doc); return { ok: true, id }; }
  catch (e) { return { error: permMsg(e, "상담 보내기") }; }
}
export async function myConsults() {
  const f = await fb().catch(() => null); const u = f && f.auth.currentUser; if (!u) return null;
  try { const qs = await f.F.getDocs(f.F.query(f.F.collection(f.db, "consults"), f.F.where("uid", "==", u.uid))); return qs.docs.map((d) => d.data()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)); }
  catch { return null; }
}
export async function getConsult(id) {
  const f = await fb().catch(() => null); if (!f || !f.auth.currentUser) return null;
  try { const s = await f.F.getDoc(f.F.doc(f.db, "consults", String(id))); return s.exists() ? s.data() : null; } catch { return null; }
}
/** 이용자: 덧붙여 묻기 · 읽음 표시 */
export async function addConsultMsg(c, text) {
  const f = await fb().catch(() => null); if (!f || !f.auth.currentUser) return { error: "먼저 로그인해 주세요." };
  if ((c.msgs || []).length >= 30) return { error: "한 상담에는 30개까지 주고받을 수 있어요. 새 상담을 열어 주세요." };
  const msgs = (c.msgs || []).concat([{ by: "u", t: String(text || "").slice(0, 1500), at: Date.now() }]);
  try { await f.F.updateDoc(f.F.doc(f.db, "consults", c.id), { msgs, status: "wait", unreadAdmin: true, unreadUser: false, updatedAt: Date.now() }); return { ok: true, msgs }; }
  catch (e) { return { error: permMsg(e, "보내기") }; }
}
export async function markConsultRead(id) {
  const f = await fb().catch(() => null); if (!f || !f.auth.currentUser) return;
  try { await f.F.updateDoc(f.F.doc(f.db, "consults", String(id)), { unreadUser: false }); } catch { /* ignore */ }
}
/** 관리자 */
export async function adminConsults() {
  const f = await fb().catch(() => null); if (!f || !f.auth.currentUser) return { error: "먼저 로그인해 주세요." };
  try { const qs = await f.F.getDocs(f.F.collection(f.db, "consults")); return { list: qs.docs.map((d) => d.data()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)) }; }
  catch (e) { return { error: permMsg(e, "상담 불러오기") }; }
}
export async function adminReplyConsult(c, text, { close = false } = {}) {
  const f = await fb().catch(() => null); if (!f || !f.auth.currentUser) return { error: "먼저 로그인해 주세요." };
  const msgs = text ? (c.msgs || []).concat([{ by: "e", t: String(text).slice(0, 3000), at: Date.now() }]) : (c.msgs || []);
  try {
    await f.F.updateDoc(f.F.doc(f.db, "consults", c.id), { msgs, status: close ? "done" : "answered", unreadUser: !!text, unreadAdmin: false, replyPushed: !text, updatedAt: Date.now() });
    return { ok: true, msgs };
  } catch (e) { return { error: permMsg(e, "답변 보내기") }; }
}
export async function adminDeleteConsult(id) {
  const f = await fb().catch(() => null); if (!f) return { error: "먼저 로그인해 주세요." };
  try { await f.F.deleteDoc(f.F.doc(f.db, "consults", String(id))); return { ok: true }; } catch (e) { return { error: permMsg(e, "지우기") }; }
}

/* ---- ⭐ 상담사 평점 — expertRatings/{상담 id} (누구나 읽기 · 답변 받은 본인만 남기기 · 상담 하나에 하나) ---- */
const maskName = (n) => { n = String(n || "익명").trim(); return n.length <= 1 ? n + "*" : n.slice(0, 1) + "*".repeat(Math.min(3, n.length - 1)); };
export async function rateConsult(c, s, comment, name) {
  const f = await fb().catch(() => null); const u = f && f.auth.currentUser;
  if (!u) return { error: "로그인한 뒤에 남길 수 있어요." };
  const doc = { uid: u.uid, expertId: String(c.expertId).slice(0, 20), s: Math.max(1, Math.min(5, Math.round(+s || 0))), c: String(comment || "").trim().slice(0, 100), name: maskName(name).slice(0, 12), at: Date.now() };
  try { await f.F.setDoc(f.F.doc(f.db, "expertRatings", c.id), doc); return { ok: true, rating: doc }; }
  catch (e) { return { error: permMsg(e, "평점 남기기") }; }
}
export async function getMyRating(cid) {
  const f = await fb().catch(() => null); if (!f) return null;
  try { const s = await f.F.getDoc(f.F.doc(f.db, "expertRatings", String(cid))); return s.exists() ? s.data() : null; } catch { return null; }
}
/** 상담사별 { avg, n, list(최신순) } */
export async function getExpertRatings() {
  const f = await fb().catch(() => null); if (!f) return {};
  try {
    const qs = await f.F.getDocs(f.F.query(f.F.collection(f.db, "expertRatings"), f.F.limit(500)));
    const by = {};
    qs.docs.forEach((d) => { const r = { id: d.id, ...d.data() }; (by[r.expertId] = by[r.expertId] || []).push(r); });
    const out = {};
    Object.entries(by).forEach(([k, l]) => { l.sort((a, b) => (b.at || 0) - (a.at || 0)); const sum = l.reduce((a, r) => a + (r.s || 0), 0); out[k] = { avg: l.length ? sum / l.length : 0, n: l.length, list: l }; });
    return out;
  } catch { return {}; }
}
export async function adminDeleteRating(cid) {
  const f = await fb().catch(() => null); if (!f) return { error: "먼저 로그인해 주세요." };
  try { await f.F.deleteDoc(f.F.doc(f.db, "expertRatings", String(cid))); return { ok: true }; } catch (e) { return { error: permMsg(e, "지우기") }; }
}
