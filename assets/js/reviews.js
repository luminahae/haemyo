/* 후기 — 현재 정적 버전에서는 이 브라우저에 저장됩니다.
   공개 후기/중복 보상 방지는 서버리스 백엔드를 연결할 때 전환합니다. */
import { getActiveId, getActiveProfile } from "./auth.js";

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

export function submitReview({ rating, nickname, content }) {
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
    nickname: cleanName || profile?.name || "익명의 해묘 친구",
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
