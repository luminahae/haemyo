/* 타로 덱 로딩 + 셔플/뽑기 로직 */
import { mulberry32 } from "../utils/dom.js";

let _cards = null;
let _questions = null;

export async function loadTarotData() {
  if (_cards && _questions) return { cards: _cards, questions: _questions };
  const [c, q] = await Promise.all([
    fetch(new URL("../../data/tarot-cards.json", import.meta.url)).then((r) => r.json()),
    fetch(new URL("../../data/tarot-questions.json", import.meta.url)).then((r) => r.json()),
  ]);
  _cards = c.cards;
  _questions = q;
  return { cards: _cards, questions: _questions };
}

export function getTopics() { return _questions ? _questions.topics : []; }
export function getSpreads() { return _questions ? _questions.spreads : []; }
export function getSpreadGroups() { return (_questions && _questions.spreadGroups) || ["기본"]; }
export function getTopic(id) { return getTopics().find((t) => t.id === id) || null; }
export function getSpread(id) { return getSpreads().find((s) => s.id === id) || null; }

/**
 * 화면에 펼칠 카드 뭉치를 만든다.
 * 사용자가 '어느 위치'를 고를지 모르게 하기 위해, 각 슬롯에 미리
 * (셔플된) 카드와 정/역방향을 숨겨 배정한다. 선택 전에는 앞면이 보이지 않는다.
 * seed가 없으면 진짜 무작위(암호학적)로 섞는다.
 */
export function buildDeckSlots(cardCount, spreadCount, seed, mode = "major") {
  const rand = seed != null ? mulberry32(seed) : cryptoRand();
  // mode: "major" = 메이저 22장(고양이 카드) / "full" = 78장 전체
  const pool = [..._cards.keys()].filter((i) => mode === "full" || !_cards[i].suit || _cards[i].suit === "major");
  const indices = shuffle(pool, rand).slice(0, cardCount);
  return indices.map((idx) => ({
    cardIndex: idx,
    reversed: rand() < 0.42, // 역방향 확률(약 42%)
  }));
}

function cryptoRand() {
  return function () {
    const buf = new Uint32Array(1);
    (self.crypto || window.crypto).getRandomValues(buf);
    return buf[0] / 4294967296;
  };
}

function shuffle(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getCard(index) { return _cards[index]; }
