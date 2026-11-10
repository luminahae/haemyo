import { getActiveId, getActiveProfile } from "./auth.js";
import { pushResult as cloudPush, deleteCloud } from "./cloud.js";
/* 로컬 저장소 관리.
   원칙: 서버 없이 브라우저 안에서만 데이터를 다룬다.
   - 생년월일·출생시간은 민감정보. 결과 저장은 사용자가 명시적으로 눌렀을 때만.
   - 입력 폼은 세션 임시 보관(sessionStorage), 결과는 localStorage. */


const memory = new Map();
const RESULTS_KEY = "str.results.v1";
const DRAFT_KEY = "str.draft.v1";
const MAX_RESULTS = 60;

function safeParse(raw, fallback) {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

/* 저장된 모든 결과(프로필 무관) */
function getAllResults() {
  return safeParse(localStorage.getItem(RESULTS_KEY), []);
}

/* ---- 저장된 결과 목록 — 현재 활성 프로필 기준 ---- */
export function getResults() {
  const active = getActiveId();
  return getAllResults().filter((r) => (r.profileId || null) === active);
}

export function getResult(id) {
  const adm = memory.get("admin:result:" + id); if (adm) return adm; // 관리자가 회원의 저장한 풀이를 여는 중
  return getAllResults().find((r) => r.id === id) || null;
}

export function saveResult(result) {
  if (adminLock()) return result; // 열람 중 결과는 관리자 기록에 쌓지 않음
  const active = getActiveId();
  result.profileId = active; // 현재 프로필로 태깅
  const all = getAllResults();
  const idx = all.findIndex((r) => r.id === result.id);
  if (idx >= 0) all[idx] = result;
  else all.unshift(result);
  // 프로필별 개수 제한 (다른 프로필 결과는 보존)
  let count = 0;
  const kept = all.filter((r) => {
    if ((r.profileId || null) !== active) return true;
    count += 1;
    return count <= MAX_RESULTS;
  });
  localStorage.setItem(RESULTS_KEY, JSON.stringify(kept));
  try { cloudPush(result); } catch { /* cloud 미설정/오프라인 시 무시 */ }
  return result;
}

export function deleteResult(id) {
  localStorage.setItem(RESULTS_KEY, JSON.stringify(getAllResults().filter((r) => r.id !== id)));
  try { deleteCloud(id); } catch { /* ignore */ }
}

/* 현재 프로필의 결과만 삭제 (다른 프로필 보존) */
export function clearAllResults() {
  const active = getActiveId();
  localStorage.setItem(RESULTS_KEY, JSON.stringify(getAllResults().filter((r) => (r.profileId || null) !== active)));
}

/* ---- 백업: 내보내기 / 가져오기 (기기 간 이동) ---- */
export function exportBackup() {
  return {
    app: "saju-tarot-report", version: 1, exportedAt: Date.now(),
    profiles: safeParse(localStorage.getItem("str.profiles.v1"), []),
    results: getAllResults(),
  };
}

/** 가져오기. mode: "merge"(기본, id 기준 합침) | "replace" */
export function importBackup(data, mode = "merge") {
  if (!data || data.app !== "saju-tarot-report" || !Array.isArray(data.results)) {
    return { ok: false, message: "올바른 백업 파일이 아닙니다." };
  }
  if (mode === "replace") {
    localStorage.setItem(RESULTS_KEY, JSON.stringify(data.results));
    if (Array.isArray(data.profiles)) localStorage.setItem("str.profiles.v1", JSON.stringify(data.profiles));
    return { ok: true, added: data.results.length };
  }
  // merge
  const cur = getAllResults();
  const seen = new Set(cur.map((r) => r.id));
  let added = 0;
  for (const r of data.results) if (!seen.has(r.id)) { cur.push(r); added++; }
  localStorage.setItem(RESULTS_KEY, JSON.stringify(cur));
  if (Array.isArray(data.profiles)) {
    const prof = safeParse(localStorage.getItem("str.profiles.v1"), []);
    const pseen = new Set(prof.map((p) => p.id));
    for (const p of data.profiles) if (!pseen.has(p.id)) prof.push(p);
    localStorage.setItem("str.profiles.v1", JSON.stringify(prof));
  }
  return { ok: true, added };
}

/* 가장 최근 결과 (홈 화면 "최근 본 결과") */
export function getRecent(limit = 3) {
  return getResults()
    .slice()
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, limit);
}

/* ---- 바뀐 시각 기록 → 기기끼리 맞출 때 '더 최근에 고친 쪽'을 살림 + 바로 클라우드에 올리도록 알림 ---- */
const STAMP_KEY = "str.stamp.v1";
export function touchState(key) {
  try {
    const id = getActiveId() || "guest";
    const m = JSON.parse(localStorage.getItem(STAMP_KEY) || "{}");
    m[id] = { ...(m[id] || {}), [key]: Date.now() };
    localStorage.setItem(STAMP_KEY, JSON.stringify(m));
    window.dispatchEvent(new CustomEvent("hae-statechange", { detail: key }));
  } catch { /* ignore */ }
}

/* ---- 내 출생 정보 기억 (프로필별, 영구) — 폼을 다시 안 묻기 위해 ---- */
const MYBIRTH_KEY = "str.mybirth.v1";
const birthKey = () => getActiveId() || "guest";

/* 관리자가 회원 시점으로 보는 중엔 관리자 본인의 내 정보 · 내 사람 · 저장 목록을 절대 고치지 않음 */
const adminLock = () => { try { return !!sessionStorage.getItem("str.adminview.v1"); } catch { return false; } };
export function saveMyBirth(input) {
  if (adminLock()) return;
  // 다른 사람 시점으로 보는 중이면 내 정보 대신 그 사람 정보를 고친다
  const va = getViewAs();
  if (va) { savePerson({ ...va, name: input.name || va.name, input: { ...input, name: input.name || va.name } }); return; }
  const map = safeParse(localStorage.getItem(MYBIRTH_KEY), {});
  map[birthKey()] = input;
  localStorage.setItem(MYBIRTH_KEY, JSON.stringify(map)); touchState(MYBIRTH_KEY);
}
/** 모든 운세 화면이 쓰는 '기준 사람' — 시점 전환 중이면 그 사람, 아니면 나 */
/* 관리자 '회원 시점으로 풀이 보기' — 이 탭(sessionStorage)에서만, 관리자 화면에서 켤 때만 */
const ADMINVIEW_KEY = "str.adminview.v1";
export function getAdminView() { try { return JSON.parse(sessionStorage.getItem(ADMINVIEW_KEY) || "null"); } catch { return null; } }
export function setAdminView(v) { try { if (v) sessionStorage.setItem(ADMINVIEW_KEY, JSON.stringify(v)); else sessionStorage.removeItem(ADMINVIEW_KEY); window.dispatchEvent(new Event("hae-adminview")); } catch { /* ignore */ } }
export function getMyBirth() {
  const av = getAdminView();
  if (av && av.input && av.input.birthDate) return { ...av.input, name: av.input.name || av.name };
  const va = getViewAs();
  if (va && va.input && va.input.birthDate) return { ...va.input, name: va.input.name || va.name };
  return getOwnBirth();
}
/** 항상 내 정보 (시점 전환과 무관) */
export function getOwnBirth() {
  // 관리자가 회원 시점으로 보는 중 — '나'는 그 회원 (닉네임으로)
  const av = getAdminView();
  if (av && (av.own || !av.pid) && (av.own || av.input)) { const o = av.own || av.input; return { ...o, name: av.ownName || o.name || av.name }; }
  const map = safeParse(localStorage.getItem(MYBIRTH_KEY), {});
  return map[birthKey()] || null;
}

/* ---- 시점 전환 — 저장한 사람의 시점으로 앱 전체를 보기 ---- */
const VIEWAS_KEY = "str.viewas.v1";
export function getViewAs() {
  const av = getAdminView();
  if (av) return av.pid ? ((av.people || []).find((p) => p.id === av.pid) || null) : null;
  const map = safeParse(localStorage.getItem(VIEWAS_KEY), {});
  const id = map[birthKey()];
  if (!id) return null;
  return getPeople().find((p) => p.id === id) || null;
}
export function setViewAs(id) {
  const av = getAdminView();
  if (av) {
    // 관리자 열람 중엔 내(관리자) 시점은 그대로 두고, 그 회원의 '나 · 내 사람' 사이에서만 바꿔 봄
    const p = id ? (av.people || []).find((x) => x.id === id) : null;
    const own = av.own || (!av.pid ? av.input : null);
    const nick = av.ownName || (own && own.name) || "회원";
    if (!p && !own) return;
    setAdminView({ ...av, own, ownName: nick, pid: p ? p.id : null, input: p ? p.input : own, name: p ? `${nick} › ${p.name}` : nick });
    try { window.dispatchEvent(new CustomEvent("viewaschange")); } catch { /* ignore */ }
    return;
  }
  const map = safeParse(localStorage.getItem(VIEWAS_KEY), {});
  if (id) map[birthKey()] = id; else delete map[birthKey()];
  try { localStorage.setItem(VIEWAS_KEY, JSON.stringify(map)); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent("viewaschange")); } catch { /* ignore */ }
}
export function clearMyBirth() {
  if (adminLock()) return;
  const map = safeParse(localStorage.getItem(MYBIRTH_KEY), {});
  delete map[birthKey()];
  localStorage.setItem(MYBIRTH_KEY, JSON.stringify(map)); touchState(MYBIRTH_KEY);
}

/* ---- 사람(나·친구) 목록 (프로필별, 영구) ---- */
const PEOPLE_KEY = "str.people.v1";
export function getPeople() {
  const av = getAdminView(); if (av && Array.isArray(av.people)) return av.people; // 관리자가 회원 시점으로 보는 중 — 그 회원의 내 사람
  const map = safeParse(localStorage.getItem(PEOPLE_KEY), {});
  return map[birthKey()] || [];
}
export function savePerson(person) {
  if (adminLock()) return person;
  const map = safeParse(localStorage.getItem(PEOPLE_KEY), {});
  const list = map[birthKey()] || [];
  const i = list.findIndex((p) => p.id === person.id);
  if (i >= 0) list[i] = person; else list.unshift(person);
  map[birthKey()] = list;
  localStorage.setItem(PEOPLE_KEY, JSON.stringify(map)); touchState(PEOPLE_KEY);
  return person;
}
/** 친구 순서 바꾸기 — ids 순서대로 다시 저장 (HAE) */
export function reorderPeople(ids) {
  if (adminLock()) return;
  const map = safeParse(localStorage.getItem(PEOPLE_KEY), {});
  const list = map[birthKey()] || [];
  const byId = new Map(list.map((p) => [p.id, p]));
  const next = ids.map((id) => byId.get(id)).filter(Boolean);
  list.forEach((p) => { if (!ids.includes(p.id)) next.push(p); });
  map[birthKey()] = next;
  localStorage.setItem(PEOPLE_KEY, JSON.stringify(map)); touchState(PEOPLE_KEY);
}
export function deletePerson(id) {
  if (adminLock()) return;
  const map = safeParse(localStorage.getItem(PEOPLE_KEY), {});
  map[birthKey()] = (map[birthKey()] || []).filter((p) => p.id !== id);
  localStorage.setItem(PEOPLE_KEY, JSON.stringify(map)); touchState(PEOPLE_KEY);
}

/* ---- 입력 폼 임시 저장(세션) — 새로고침 시 편의. 민감정보라 sessionStorage 사용 ---- */
export function saveDraft(input) {
  try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(input)); } catch { /* ignore */ }
}
export function getDraft() {
  return safeParse(sessionStorage.getItem(DRAFT_KEY), null);
}
export function clearDraft() {
  try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}

/* ---- 임시 결과 전달(페이지 간 이동) — 저장 전 결과를 잠깐 들고 있는 메모리 캐시 ---- */
export function stash(key, value) { memory.set(key, value); }
export function unstash(key) { return memory.get(key); }

/* id 생성 — Date.now + 랜덤 (충돌 방지용, 표시 목적 아님) */
export function makeId(prefix = "r") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/* ===== (합침) reviews.js ===== */
/* 후기 — 현재 정적 버전에서는 이 브라우저에 저장됩니다.
   공개 후기/중복 보상 방지는 서버리스 백엔드를 연결할 때 전환합니다. */

const KEY = "str.reviews.v1";
const MAX_REVIEWS = 100;

function readAll() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

function writeAll(reviews) {
  localStorage.setItem(KEY, JSON.stringify(reviews.slice(0, MAX_REVIEWS)));
  try { window.dispatchEvent(new CustomEvent("reviewschange")); } catch { /* ignore */ }
}

export function getReviews() {
  return readAll().sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
}

export function hasWrittenReview() {
  const ownerId = getActiveId() || "guest";
  return readAll().some((r) => r.ownerId === ownerId);
}

export function submitReview({ rating, nickname, content, anon = false }) {
  const cleanContent = String(content || "").trim().replace(/\s+/g, " ");
  const cleanName = String(nickname || "").trim().replace(/\s+/g, " ");
  const score = Number(rating);
  if (!Number.isInteger(score) || score < 1 || score > 5) return { ok: false, message: "별점을 선택해 주세요." };
  if (cleanContent.length < 20) return { ok: false, message: "후기는 20자 이상 적어 주세요." };
  if (cleanContent.length > 500) return { ok: false, message: "후기는 500자 이내로 적어 주세요." };
  if (cleanName.length > 16) return { ok: false, message: "닉네임은 16자 이내로 적어 주세요." };

  const profile = getActiveProfile();
  const ownerId = getActiveId() || "guest";
  const review = {
    id: `review_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ownerId,
    rating: score,
    nickname: (!anon && cleanName) || "익명의 해묘 친구", // 닉네임을 안 적거나 익명이면 계정 이름은 절대 안 보임
    content: cleanContent,
    createdAt: Date.now(),
  };
  writeAll([review, ...readAll()]);
  return { ok: true, review };
}

/** 후기 삭제 — 관리자 모드에서만 호출 */
export function deleteReview(id) {
  writeAll(readAll().filter((r) => r.id !== id));
}
