import { el, clear, toast } from "../utils/dom.js";
import { pageHeader, backLink, loadDisclaimer, noticeBox } from "./shared.js";
import { getMyBirth, stash } from "../state.js";
import { computeSaju } from "../saju/manse.js";
import { readTopic } from "../saju/topics.js";
import { taegilMonth } from "../saju/extras.js";
import { monthlyFlow } from "../saju/relationship.js";
import { tenGod } from "../saju/fortune.js";
import { datePortrait, idealType, charmSpirits } from "../saju/spouse.js";
import { isUnlocked, unlock, getCoins, costOf, noCoinToast } from "../wallet.js";
import { personSwitch } from "./people.js";
/* =========================================================
   테마 운세 — 큰 주제(카테고리) 칩 + 배너 카드 목록
   배너 그림은 이미지 파일 없이 CSS 그라데이션 + 작은 SVG 장식으로 그린다.
   ========================================================= */

const NOW = () => new Date();
const Y = () => NOW().getFullYear();
const M = () => NOW().getMonth() + 1;

const CATS = ["전체", "NEW", "개운", "주역", "풍수지리", "사주툰", "정통운세", "애정운", "솔로", "썸", "커플", "재회운", "결혼", "궁합", "사주", "타로", "신년운세", "월운", "재물운", "직업운", "학업운", "건강운", "대인관계", "성향", "행운", "고민", "별자리", "인생총운"];

/* 배너 장식 SVG */
export const ART = {
  moon: `<svg viewBox="0 0 120 120" aria-hidden="true"><defs><radialGradient id="aMo" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#f2cf97"/></radialGradient></defs><path d="M74 22a36 36 0 1 0 22 58a30 30 0 1 1-22-58z" fill="url(#aMo)"/><circle cx="48" cy="60" r="4" fill="rgba(214,160,100,.35)"/><circle cx="58" cy="80" r="2.6" fill="rgba(214,160,100,.3)"/><circle cx="42" cy="44" r="2" fill="rgba(214,160,100,.3)"/><g fill="rgba(255,255,255,.95)"><path d="M92 24Q92 30 98 30Q92 30 92 36Q92 30 86 30Q92 30 92 24Z"/><path d="M24 20.5Q24 24 27.5 24Q24 24 24 27.5Q24 24 20.5 24Q24 24 24 20.5Z"/><path d="M98 88.8Q98 92 101.2 92Q98 92 98 95.2Q98 92 94.8 92Q98 92 98 88.8Z"/><path d="M30 93.4Q30 96 32.6 96Q30 96 30 98.6Q30 96 27.4 96Q30 96 30 93.4Z"/></g></svg>`,
  ring: `<svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="hmRingG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff8ec"/><stop offset=".55" stop-color="#f4d7a4"/><stop offset="1" stop-color="#dcae74"/></linearGradient><linearGradient id="hmGemG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#ffd6e4"/></linearGradient></defs><ellipse cx="60" cy="98" rx="26" ry="4" fill="rgba(80,20,60,.18)"/><ellipse cx="60" cy="74" rx="29" ry="24" fill="none" stroke="url(#hmRingG)" stroke-width="7"/><path d="M36 64a29 24 0 0 1 14-15" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="2" stroke-linecap="round"/><path d="M53 49h14l-3 6h-8z" fill="#e8c38b"/><path d="M45 37l7-9h16l7 9z" fill="url(#hmGemG)"/><path d="M45 37h30l-15 15z" fill="#ffe3ec"/><path d="M52 28l4 9 4-9 4 9 4-9M45 37h30M56 37l4 15 4-15" fill="none" stroke="rgba(206,120,160,.55)" stroke-width="1" stroke-linejoin="round"/><path d="M54 31l3 4" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><g fill="rgba(255,255,255,.95)"><path d="M90 23Q90 30 97 30Q90 30 90 37Q90 30 83 30Q90 30 90 23Z"/><path d="M26 39.5Q26 44 30.5 44Q26 44 26 48.5Q26 44 21.5 44Q26 44 26 39.5Z"/><path d="M98 86.5Q98 90 101.5 90Q98 90 98 93.5Q98 90 94.5 90Q98 90 98 86.5Z"/></g></svg>`,
  hearts: `<svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="aHe" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe8ef"/><stop offset=".55" stop-color="#ff9fbf"/><stop offset="1" stop-color="#f06f9c"/></linearGradient><linearGradient id="aHe2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#ffd0df"/></linearGradient></defs><ellipse cx="60" cy="104" rx="24" ry="4" fill="rgba(60,15,50,.18)"/><path d="M60 98C22 74 22 44 40 38c10-3 17 3 20 10c3-7 10-13 20-10c18 6 18 36-20 60z" fill="url(#aHe)"/><path d="M38 50c2-5 7-7 11-5" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="3.5" stroke-linecap="round"/><path d="M24 38C13 31 14 21 21 20c4 0 6 3 7 5c1-2 3-5 7-5c7 1 8 11-4 18z" fill="url(#aHe2)" transform="rotate(-12 26 30)"/><path d="M96 30c-7-4-6-11-2-12c2 0 4 2 4 3c1-1 2-3 4-3c4 1 5 8-3 12z" fill="url(#aHe2)" transform="rotate(10 98 24)"/><g fill="rgba(255,255,255,.95)"><path d="M100 56Q100 60 104 60Q100 60 100 64Q100 60 96 60Q100 60 100 56Z"/><path d="M18 67Q18 70 21 70Q18 70 18 73Q18 70 15 70Q18 70 18 67Z"/></g></svg>`,
  cards: `<svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="aCa" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffaf4"/><stop offset="1" stop-color="#f6dcc8"/></linearGradient><linearGradient id="aCb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b3a78"/><stop offset="1" stop-color="#3c2756"/></linearGradient></defs><ellipse cx="60" cy="104" rx="30" ry="4" fill="rgba(60,15,50,.18)"/><g transform="rotate(-14 46 62)"><rect x="24" y="28" width="40" height="64" rx="7" fill="url(#aCb)"/><rect x="28" y="32" width="32" height="56" rx="4" fill="none" stroke="rgba(244,215,164,.7)" stroke-width="1.5"/><path d="M44 50l3 8 8 0-6 5 2 8-7-5-7 5 2-8-6-5 8 0z" fill="#f4d7a4"/></g><g transform="rotate(10 72 60)"><rect x="52" y="26" width="42" height="66" rx="7" fill="url(#aCa)"/><rect x="56" y="30" width="34" height="58" rx="4" fill="none" stroke="rgba(214,150,110,.55)" stroke-width="1.5"/><circle cx="73" cy="54" r="9" fill="#f4c27a"/><g stroke="#f4c27a" stroke-width="2" stroke-linecap="round"><path d="M73 39v4M73 65v4M58 54h4M84 54h4"/></g><path d="M64 78h18" stroke="rgba(160,100,80,.4)" stroke-width="2" stroke-linecap="round"/></g><g fill="rgba(255,255,255,.95)"><path d="M102 25Q102 30 107 30Q102 30 102 35Q102 30 97 30Q102 30 102 25Z"/><path d="M18 27Q18 30 21 30Q18 30 18 33Q18 30 15 30Q18 30 18 27Z"/></g></svg>`,
  sun: `<svg viewBox="0 0 120 120" aria-hidden="true"><defs><radialGradient id="aSu" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fff8de"/><stop offset="1" stop-color="#ffc56b"/></radialGradient></defs><circle cx="60" cy="60" r="40" fill="rgba(255,220,150,.18)"/><g stroke="#ffe2a0" stroke-width="5" stroke-linecap="round"><path d="M60 14v10M60 96v10M14 60h10M96 60h10M27 27l7 7M86 86l7 7M93 27l-7 7M34 86l-7 7"/></g><circle cx="60" cy="60" r="26" fill="url(#aSu)"/><path d="M46 52a16 16 0 0 1 12-10" fill="none" stroke="rgba(255,255,255,.9)" stroke-width="3.5" stroke-linecap="round"/></svg>`,
  coin: `<svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="aCo" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff6dc"/><stop offset=".55" stop-color="#f6cf7e"/><stop offset="1" stop-color="#d99c45"/></linearGradient><linearGradient id="aCo2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2cc"/><stop offset="1" stop-color="#e9b45e"/></linearGradient></defs><ellipse cx="60" cy="100" rx="34" ry="4" fill="rgba(60,15,50,.18)"/><ellipse cx="60" cy="84" rx="32" ry="11" fill="#d9a04f"/><rect x="28" y="72" width="64" height="12" fill="#d9a04f"/><ellipse cx="60" cy="72" rx="32" ry="11" fill="url(#aCo)"/><ellipse cx="60" cy="60" rx="32" ry="11" fill="#e2ab58"/><rect x="28" y="48" width="64" height="12" fill="#e2ab58"/><ellipse cx="60" cy="48" rx="32" ry="11" fill="url(#aCo2)"/><ellipse cx="60" cy="48" rx="24" ry="7.5" fill="none" stroke="rgba(170,105,40,.45)" stroke-width="1.6"/><path d="M60 41.5l2.2 4.4 4.8.6-3.5 3.3.9 4.7-4.4-2.4-4.4 2.4.9-4.7-3.5-3.3 4.8-.6z" fill="rgba(170,105,40,.7)"/><path d="M38 44a24 7 0 0 1 14-4" fill="none" stroke="rgba(255,255,255,.9)" stroke-width="2.4" stroke-linecap="round"/><g fill="rgba(255,255,255,.95)"><path d="M98 24Q98 30 104 30Q98 30 98 36Q98 30 92 30Q98 30 98 24Z"/><path d="M22 26.5Q22 30 25.5 30Q22 30 22 33.5Q22 30 18.5 30Q22 30 22 26.5Z"/></g></svg>`,
  star: `<svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="aSt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffbef"/><stop offset=".55" stop-color="#ffe08f"/><stop offset="1" stop-color="#f5b85a"/></linearGradient></defs><ellipse cx="60" cy="104" rx="26" ry="4" fill="rgba(60,15,50,.18)"/><path d="M60 16l12.6 26.4 28.9 3.8-21.2 20 5.4 28.6L60 81l-25.7 13.8 5.4-28.6-21.2-20 28.9-3.8z" fill="url(#aSt)" stroke="#fff3cf" stroke-width="2" stroke-linejoin="round"/><path d="M60 26l7 15" stroke="rgba(255,255,255,.9)" stroke-width="3" stroke-linecap="round"/><circle cx="51" cy="58" r="2.6" fill="rgba(120,70,40,.55)"/><circle cx="69" cy="58" r="2.6" fill="rgba(120,70,40,.55)"/><path d="M55 66q5 4 10 0" fill="none" stroke="rgba(120,70,40,.55)" stroke-width="2" stroke-linecap="round"/><circle cx="46" cy="64" r="3" fill="rgba(255,140,150,.35)"/><circle cx="74" cy="64" r="3" fill="rgba(255,140,150,.35)"/><g fill="rgba(255,255,255,.95)"><path d="M100 19Q100 24 105 24Q100 24 100 29Q100 24 95 24Q100 24 100 19Z"/><path d="M18 18.5Q18 22 21.5 22Q18 22 18 25.5Q18 22 14.5 22Q18 22 18 18.5Z"/><path d="M104 93Q104 96 107 96Q104 96 104 99Q104 96 101 96Q104 96 104 93Z"/></g></svg>`,
  paw: `<svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="aPa" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffaf6"/><stop offset="1" stop-color="#ffd9e2"/></linearGradient></defs><ellipse cx="60" cy="102" rx="24" ry="4" fill="rgba(60,15,50,.18)"/><g fill="url(#aPa)"><path d="M60 58c14 0 26 14 26 26c0 10-9 14-17 12c-4-1-6-3-9-3s-5 2-9 3c-8 2-17-2-17-12c0-12 12-26 26-26z"/><ellipse cx="32" cy="54" rx="9" ry="11" transform="rotate(-18 32 54)"/><ellipse cx="49" cy="36" rx="9" ry="12" transform="rotate(-6 49 36)"/><ellipse cx="71" cy="36" rx="9" ry="12" transform="rotate(6 71 36)"/><ellipse cx="88" cy="54" rx="9" ry="11" transform="rotate(18 88 54)"/></g><g fill="rgba(255,150,180,.45)"><ellipse cx="60" cy="80" rx="12" ry="8"/></g><path d="M45 30a6 8 0 0 1 4-3" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><g fill="rgba(255,255,255,.95)"><path d="M100 21.5Q100 26 104.5 26Q100 26 100 30.5Q100 26 95.5 26Q100 26 100 21.5Z"/><path d="M18 21Q18 24 21 24Q18 24 18 27Q18 24 15 24Q18 24 18 21Z"/></g></svg>`,
  rainbow: `<svg viewBox="0 0 120 120" aria-hidden="true"><defs></defs><g fill="none" stroke-width="8" stroke-linecap="round"><path d="M18 82a42 42 0 0 1 84 0" stroke="#ffb3c6"/><path d="M28 82a32 32 0 0 1 64 0" stroke="#ffd9a0"/><path d="M38 82a22 22 0 0 1 44 0" stroke="#bfe8cf"/><path d="M48 82a12 12 0 0 1 24 0" stroke="#bcd3ff"/></g><path d="M22 70a38 38 0 0 1 20-24" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="2.4" stroke-linecap="round"/><g fill="#fffaf6"><circle cx="20" cy="86" r="9"/><circle cx="31" cy="84" r="11"/><circle cx="42" cy="88" r="7"/><rect x="12" y="86" width="36" height="10" rx="5"/><circle cx="80" cy="88" r="7"/><circle cx="90" cy="84" r="11"/><circle cx="101" cy="87" r="8"/><rect x="74" y="86" width="36" height="10" rx="5"/></g><g fill="rgba(255,255,255,.95)"><path d="M60 17Q60 22 65 22Q60 22 60 27Q60 22 55 22Q60 22 60 17Z"/><path d="M100 36.5Q100 40 103.5 40Q100 40 100 43.5Q100 40 96.5 40Q100 40 100 36.5Z"/></g></svg>`,
  hexa: `<svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="aHx" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffaf2"/><stop offset="1" stop-color="#f3dcc2"/></linearGradient></defs><ellipse cx="60" cy="104" rx="30" ry="4" fill="rgba(60,15,50,.18)"/><rect x="26" y="16" width="68" height="84" rx="10" fill="rgba(255,248,240,.18)" stroke="rgba(255,248,240,.5)" stroke-width="1.5"/><g fill="url(#aHx)"><rect x="34" y="26" width="52" height="8" rx="4"/><rect x="34" y="39" width="22" height="8" rx="4"/><rect x="64" y="39" width="22" height="8" rx="4"/><rect x="34" y="52" width="52" height="8" rx="4"/><rect x="34" y="65" width="22" height="8" rx="4"/><rect x="64" y="65" width="22" height="8" rx="4"/><rect x="34" y="78" width="52" height="8" rx="4"/></g><circle cx="96" cy="22" r="8" fill="#fff6e6"/><path d="M96 14a8 8 0 0 1 0 16a4 4 0 0 1 0-8a4 4 0 0 0 0-8z" fill="#8a5a9e"/><circle cx="96" cy="18" r="1.4" fill="#fff6e6"/><circle cx="96" cy="26" r="1.4" fill="#8a5a9e"/><g fill="rgba(255,255,255,.95)"><path d="M18 88.5Q18 92 21.5 92Q18 92 18 95.5Q18 92 14.5 92Q18 92 18 88.5Z"/><path d="M104 61Q104 64 107 64Q104 64 104 67Q104 64 101 64Q104 64 104 61Z"/></g></svg>`,
  house: `<svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="aHo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffaf4"/><stop offset="1" stop-color="#f6dfcf"/></linearGradient><linearGradient id="aHr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9fb4"/><stop offset="1" stop-color="#e9718f"/></linearGradient></defs><ellipse cx="60" cy="102" rx="34" ry="4" fill="rgba(60,15,50,.18)"/><path d="M30 56h60v40a4 4 0 0 1-4 4H34a4 4 0 0 1-4-4z" fill="url(#aHo)"/><path d="M20 60L60 26l40 34" fill="none" stroke="url(#aHr)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><rect x="76" y="30" width="9" height="16" rx="2" fill="#e9718f"/><rect x="52" y="72" width="16" height="28" rx="8" fill="#c98aa0"/><circle cx="64" cy="87" r="1.6" fill="#fff"/><rect x="36" y="66" width="11" height="11" rx="2.5" fill="#bfe0ff"/><rect x="73" y="66" width="11" height="11" rx="2.5" fill="#bfe0ff"/><path d="M36 70h11M41.5 66v11M73 70h11M78.5 66v11" stroke="rgba(255,255,255,.8)" stroke-width="1.2"/><circle cx="98" cy="22" r="7" fill="#ffe08f"/><g fill="rgba(255,255,255,.95)"><path d="M18 24.5Q18 28 21.5 28Q18 28 18 31.5Q18 28 14.5 28Q18 28 18 24.5Z"/></g></svg>`,
  talisman: `<svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="aTa" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6d8"/><stop offset="1" stop-color="#f3d78f"/></linearGradient></defs><ellipse cx="60" cy="108" rx="22" ry="4" fill="rgba(60,15,50,.18)"/><path d="M38 14h44v84l-22-8-22 8z" fill="url(#aTa)"/><rect x="43" y="20" width="34" height="62" rx="2" fill="none" stroke="rgba(196,64,52,.75)" stroke-width="1.8"/><g fill="none" stroke="rgba(196,64,52,.9)" stroke-width="2.4" stroke-linecap="round"><path d="M60 28v26"/><path d="M50 34q10 6 20 0"/><path d="M50 44q10 6 20 0"/><path d="M52 54q8-4 16 0"/></g><circle cx="60" cy="68" r="7" fill="none" stroke="rgba(196,64,52,.8)" stroke-width="1.8"/><path d="M56 68h8M60 64v8" stroke="rgba(196,64,52,.8)" stroke-width="1.6"/><path d="M42 18v74" stroke="rgba(255,255,255,.7)" stroke-width="2" stroke-linecap="round"/><g fill="rgba(255,255,255,.95)"><path d="M96 23Q96 28 101 28Q96 28 96 33Q96 28 91 28Q96 28 96 23Z"/><path d="M22 36.5Q22 40 25.5 40Q22 40 22 43.5Q22 40 18.5 40Q22 40 22 36.5Z"/><path d="M98 87Q98 90 101 90Q98 90 98 93Q98 90 95 90Q98 90 98 87Z"/></g></svg>`,
  cat: `<img class="tb-cat" src="assets/img/haemyo.webp" alt="" aria-hidden="true">`,
  phone: `<svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="aPh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffaf6"/><stop offset="1" stop-color="#f3dde4"/></linearGradient><linearGradient id="aPs" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd1e0"/><stop offset="1" stop-color="#c9b6ff"/></linearGradient></defs><ellipse cx="56" cy="106" rx="22" ry="4" fill="rgba(60,15,50,.18)"/><rect x="34" y="16" width="44" height="86" rx="11" fill="url(#aPh)"/><rect x="39" y="26" width="34" height="60" rx="5" fill="url(#aPs)"/><rect x="44" y="34" width="20" height="8" rx="4" fill="rgba(255,255,255,.85)"/><rect x="50" y="47" width="18" height="8" rx="4" fill="rgba(255,255,255,.65)"/><path d="M54 64c-5-3-5-8-1-9c2 0 3 1 3 2c0-1 1-2 3-2c4 1 4 6-1 9z" fill="#ff7fa8"/><rect x="50" y="91" width="12" height="3" rx="1.5" fill="rgba(160,120,140,.5)"/><path d="M37 22v74" stroke="rgba(255,255,255,.85)" stroke-width="2" stroke-linecap="round"/><g fill="none" stroke="rgba(255,255,255,.9)" stroke-width="3.2" stroke-linecap="round"><path d="M86 42q7 8 0 16"/><path d="M93 35q13 15 0 30"/></g><g fill="rgba(255,255,255,.95)"><path d="M100 88.5Q100 92 103.5 92Q100 92 100 95.5Q100 92 96.5 92Q100 92 100 88.5Z"/><path d="M20 27Q20 30 23 30Q20 30 20 33Q20 30 17 30Q20 30 20 27Z"/></g></svg>`,
  wheel: `<svg viewBox="0 0 120 120" aria-hidden="true"><defs><radialGradient id="aWh" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#f2d6a8"/></radialGradient></defs><circle cx="60" cy="60" r="42" fill="rgba(255,244,230,.14)"/><circle cx="60" cy="60" r="38" fill="none" stroke="#f6dfb8" stroke-width="3"/><circle cx="60" cy="60" r="28" fill="none" stroke="rgba(246,223,184,.7)" stroke-width="1.6" stroke-dasharray="2 4"/><g stroke="rgba(246,223,184,.85)" stroke-width="1.6"><path d="M60 22v76M22 60h76M33 33l54 54M87 33L33 87"/></g><circle cx="60" cy="60" r="13" fill="url(#aWh)"/><path d="M60 52l2.5 5.5 6 .5-4.5 4 1.4 6-5.4-3-5.4 3 1.4-6-4.5-4 6-.5z" fill="#d99a4e"/><g fill="#fff6e6"><circle cx="60" cy="22" r="5"/><circle cx="98" cy="60" r="5"/><circle cx="60" cy="98" r="5"/><circle cx="22" cy="60" r="5"/></g><g fill="rgba(255,255,255,.95)"><path d="M100 17.5Q100 22 104.5 22Q100 22 100 26.5Q100 22 95.5 22Q100 22 100 17.5Z"/><path d="M20 97Q20 100 23 100Q20 100 20 103Q20 100 17 100Q20 100 20 97Z"/></g></svg>`,
};

/* 배너 색 (노을 톤온톤 계열) */
export const BG = {
  dusk: "linear-gradient(135deg, #5b4478 0%, #8b5a8c 55%, #d08c98 100%)",
  rose: "linear-gradient(135deg, #f7c6d2 0%, #eaa3be 50%, #c982a8 100%)",
  peach: "linear-gradient(135deg, #ffe0cf 0%, #ffbfb3 50%, #e79aa9 100%)",
  lilac: "linear-gradient(135deg, #e7d2f3 0%, #c9a9e6 50%, #9d7bc4 100%)",
  night: "linear-gradient(135deg, #3f3560 0%, #6b4a7a 60%, #a86c8a 100%)",
  gold: "linear-gradient(135deg, #ffe9c7 0%, #f6c99e 50%, #e1a07e 100%)",
  mint: "linear-gradient(135deg, #e2f3ea 0%, #bfe1d1 50%, #8fbfae 100%)",
};

/* 테마 목록 — to: 기존 화면으로 이동 / theme: 이 파일의 테마 리딩 / q: 물어보기 질문 미리 채우기 */
export function themes() {
  const y = Y(), m = M(), ny = y + 1;
  return [
    { id: "iching", cats: ["NEW", "주역", "고민", "정통운세"], eyebrow: "주역점 · 64괘", title: "동전 세 개로 묻는\n주역 한 괘", sub: "질문 하나 · 동전 여섯 번 · 지금 괘와 바뀔 괘", bg: "night", art: "hexa", cost: 0, to: "/iching" },
    { id: "gaeun", cats: ["NEW", "풍수지리", "개운", "행운"], eyebrow: "용신 맞춤 풍수", title: "내 방, 어디에\n뭘 두면 운이 풀릴까", sub: "침대 방향 · 책상 · 행운 색 · 7일 개운 습관", bg: "mint", art: "house", cost: 2, to: "/gaeun" },
    { id: "bujeok", cats: ["NEW", "개운", "행운"], eyebrow: "나만의 개운 부적", title: "소원 담은\n내 용신 색 부적", sub: "연애 · 재물 · 합격 · 건강 · 액막이 · 이미지 저장", bg: "gold", art: "talisman", cost: 1, to: "/bujeok" },
    { id: "luckynumber", cats: ["NEW", "행운"], eyebrow: "오늘의 행운 번호", title: "내 사주가 고른\n오늘의 숫자 여섯 개", sub: "용신 숫자 + 오늘 일진 · 하루 한 번 무료", bg: "peach", art: "coin", cost: 0, to: "/luckynumber" },
    { id: "sajutoon", cats: ["NEW", "사주툰", "성향"], eyebrow: "사주툰", title: "해묘가 그린\n나의 하루 4컷", sub: "아침 · 일할 때 · 연애할 때 · 밤", bg: "rose", art: "cat", cost: 2, to: "/sajutoon" },
    { id: "classic", cats: ["NEW", "정통운세", "월운"], eyebrow: `新 ${y}년 ${m}월`, title: `${m}월의\n명심보감`, sub: "이달의 고전 한 구절 · 내 일간 맞춤 풀이 · 무료", bg: "dusk", art: "moon", cost: 0, to: "/classic" },
    { id: "health-saju", cats: ["NEW", "건강운", "월운", "사주"], eyebrow: "사주운세", title: `${m}월\n사주 건강운`, sub: "타고난 약한 오행 · 이달 신경 쓸 곳 · 컨디션 지수", bg: "lilac", art: "sun", cost: 2, to: "/health-saju" },
    { id: "year-12", cats: ["NEW", "신년운세", "사주", "월운"], eyebrow: `작년 · 올해 · 내년 열두 달`, title: `${y}년, 12가지\n결정적 순간`, sub: "작년·올해·내년 골라 보기 — 사랑·일·돈", bg: "gold", art: "wheel", cost: 5, theme: true },
    { id: "ddaylove", cats: ["NEW", "애정운", "솔로", "사주"], eyebrow: "연애 시작 D-day", title: "새 연애까지\n며칠 남았을까?", sub: "연인 기운이 드는 날 · D-day와 이유", bg: "rose", art: "hearts", cost: 2, to: "/dday/love" },
    { id: "ddaymarry", cats: ["NEW", "결혼", "애정운", "사주"], eyebrow: "결혼 D-day", title: "결혼까지\n며칠 남았을까?", sub: "결혼운이 강한 해 · D-day와 이유", bg: "gold", art: "ring", cost: 2, to: "/dday/marry" },
    { id: "ddaymeet", cats: ["NEW", "애정운", "솔로", "사주"], eyebrow: "인연은 어디서", title: "내 인연,\n어느 쪽에서 올까?", sub: "동서남북 · 지역 · 외국인? · 만나는 곳", bg: "night", art: "moon", cost: 2, to: "/dday/meet" },
    { id: "pastlove", cats: ["NEW", "애정운", "사주"], eyebrow: "지난 연애 맞히기", title: "사주로 맞혀 보는\n나의 지난 연애", sub: "연애가 시작됐던 해 · 흔들렸던 해 · 해묘 적중률", bg: "lilac", art: "moon", cost: 2, to: "/dday/past" },
    { id: "pastlife", cats: ["NEW", "사주", "성향"], eyebrow: "전생 이야기", title: "나는 전생에\n뭐였을까?", sub: "전생의 나 · 이번 생의 숙제 · 잘 맞는 직업", bg: "night", art: "moon", cost: 3, to: "/pastlife" },
    { id: "marry-when", cats: ["NEW", "결혼", "애정운", "사주"], eyebrow: "사주로 보는 결혼 시기", title: "나는 언제쯤\n결혼하게 될까?", sub: "결혼운이 열리는 해 · 배우자상 · 결혼 전 준비", bg: "night", art: "ring", cost: 5, theme: true },
    { id: "solo-month", cats: ["NEW", "솔로", "애정운", "월운"], eyebrow: `${m}월의 시크릿`, title: `${m}월,\n솔로의 애정운`, sub: "이달 연애 기운 · 설레는 날 · 만남 팁", bg: "dusk", art: "moon", cost: 3, theme: true },
    { id: "solo-escape", cats: ["NEW", "솔로", "애정운", "신년운세"], eyebrow: "#언제 #누구와 #어떻게", title: `${ny} 솔로 탈출,\n이런 사람과 해요`, sub: "인연이 오는 달 · 만날 사람 · 만나는 곳", bg: "peach", art: "hearts", cost: 5, theme: true },
    { id: "some-date", cats: ["썸", "커플", "애정운"], eyebrow: "택일", title: "데이트·고백하기\n좋은 날", sub: "이번 달 설렘이 커지는 날짜", bg: "lilac", art: "hearts", cost: 1, to: "/calendar" },
    { id: "charm", cats: ["애정운", "성향", "솔로"], eyebrow: "내 매력 사주", title: "이성이 빠져드는\n나의 매력 포인트", sub: "끌림 타입 · 빠져드는 지수 · 그 사람과 끌림 궁합", bg: "rose", art: "star", cost: 3, to: "/pull" },
    { id: "couple", cats: ["커플", "궁합"], eyebrow: "두 사람 궁합", title: "우리, 오래\n함께할 수 있을까", sub: "성향 조화 · 합과 충 · 부딪히는 지점", bg: "peach", art: "hearts", cost: 5, to: "/compat" },
    { id: "reunion", cats: ["재회운", "애정운"], eyebrow: "재회운", title: "그 사람,\n다시 돌아올까", sub: "다시 이어질 가능성과 조건", bg: "night", art: "moon", cost: 3, to: "/fortune/saju/reunion" },
    { id: "inyeon", cats: ["애정운", "결혼", "사주"], eyebrow: "나의 인연", title: "연애할 사람,\n결혼할 사람 얼굴은?", sub: "이상형 · 초상화 · 만나면 안 될 사람", bg: "lilac", art: "ring", cost: 5, to: "/inyeon" },
    { id: "month", cats: ["월운", "사주"], eyebrow: `${y}년 ${m}월`, title: `${m}월 한 달\n운세 가이드`, sub: "연애 · 일 · 돈의 흐름", bg: "gold", art: "moon", cost: 2, to: "/fortune/saju/month" },
    { id: "newyear", cats: ["신년운세"], eyebrow: `${ny}년 미리 보기`, title: `${ny} 토정비결`, sub: "올해의 괘로 보는 한 해 흐름", bg: "dusk", art: "sun", cost: 3, to: "/tojeong" },
    { id: "wealth", cats: ["재물운", "사주"], eyebrow: "재물운", title: "돈은 언제,\n어떻게 들어올까", sub: "돈의 흐름 · 기회 · 새는 곳", bg: "gold", art: "coin", cost: 2, to: "/fortune/saju/wealth" },
    { id: "career", cats: ["직업운", "사주"], eyebrow: "직업·사업운", title: "나한테 맞는 일,\n커리어의 길", sub: "확장 · 거래 · 자금의 기운", bg: "mint", art: "sun", cost: 2, to: "/fortune/saju/business" },
    { id: "study", cats: ["학업운"], eyebrow: "학업·합격운", title: "시험, 붙을 수\n있을까?", sub: "집중 · 시험 · 자격의 기운", bg: "mint", art: "star", cost: 2, to: "/fortune/saju/study" },
    { id: "health", cats: ["건강운"], eyebrow: "바이오리듬", title: "몸과 마음\n컨디션 체크", sub: "신체 · 감성 · 지성 주기", bg: "peach", art: "sun", cost: 1, to: "/biorhythm" },
    { id: "people", cats: ["대인관계", "궁합"], eyebrow: "내 사람 랭킹", title: "평생 잡아야 할\n귀인은 누구?", sub: "귀인·결혼운·도화살·우정의 작대기 + 나 포함 올해운·재물운 순위", bg: "lilac", art: "cat", cost: 5, to: "/ranks" },
    { id: "saju", cats: ["성향", "사주"], eyebrow: "사주 리포트", title: "나는 어떤\n사람일까?", sub: "실제 만세력 명식 · 성향 · 반복 패턴", bg: "dusk", art: "cat", cost: 0, to: "/saju" },
    { id: "gwansang", cats: ["성향"], eyebrow: "관상", title: "사진으로 보는\n내 얼굴 관상", sub: "카메라 · 앨범 사진으로", bg: "rose", art: "cat", cost: 2, to: "/gwansang" },
    { id: "lucky", cats: ["행운"], eyebrow: "오늘의 행운", title: "오늘 나를 지켜줄\n행운 카드", sub: "행운 카드 · 행운색", bg: "gold", art: "cards", cost: 1, to: "/luckycard" },
    { id: "dream", cats: ["고민"], eyebrow: "꿈해몽", title: "어젯밤 그 꿈,\n무슨 뜻일까?", sub: "무료 꿈풀이", bg: "lilac", art: "moon", cost: 0, to: "/dream" },
    { id: "star", cats: ["별자리"], eyebrow: "별자리 · 띠", title: "별자리로 보는\n나의 성향", sub: "서양 점성 · 60간지 띠운", bg: "night", art: "star", cost: 0, to: "/star" },
    { id: "life", cats: ["인생총운", "사주"], eyebrow: "자미두수", title: "12궁으로 보는\n인생 총운", sub: "명반 · 8단계 심화 풀이", bg: "dusk", art: "star", cost: 3, to: "/ziwei" },
    { id: "tarot", cats: ["NEW", "타로", "애정운", "썸", "재회운", "고민"], eyebrow: "타로 테마는 여기로 이사했어요", title: "그 사람 속마음·재회·썸\n타로 모아 보기", sub: "연락 없는 이유 · 흔들리는 마음 · 선택 고민", bg: "rose", art: "cards", cost: 0, to: "/tarot" },
  ];
}

export function banner(t, onClick) {
  return el("button", { class: `theme-banner bg-${t.bg}`, type: "button", style: `--bg:${BG[t.bg] || BG.dusk};`, onclick: onClick, "aria-label": t.title.replace(/\n/g, " ") }, [
    el("div", { class: "tb-art", html: ART[t.art] || "" }),
    el("div", { class: "tb-text" }, [
      el("span", { class: "tb-eyebrow", text: t.eyebrow }),
      el("span", { class: "tb-title", text: t.title }),
    ]),
    el("div", { class: "tb-foot" }, [
      el("span", { class: "tb-sub", text: t.sub }),
      el("span", { class: "tb-cost" + (t.cost ? "" : " free") }, t.cost ? [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: String(t.cost) })] : [el("span", { text: "무료" })]),
    ]),
    t.cats.includes("NEW") ? el("span", { class: "tb-new", text: "NEW" }) : null,
  ].filter(Boolean));
}

export function renderExplore({ navigate }) {
  loadDisclaimer();
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(pageHeader("사주 테마 운세", "내 사주로 보는 테마 운세", "결혼 시기·솔로 탈출·재물·직업까지 — 실제 만세력으로 풀어요. 그 사람 속마음·재회 같은 타로 테마는 타로에 있어요."));

  let cat = window.__themeCat || "전체";
  const chipsHost = el("section", { class: "wrap" });
  const listHost = el("section", { class: "wrap theme-list", style: "margin-top: var(--sp-3);" });
  root.append(chipsHost, listHost);

  function paint() {
    clear(chipsHost); clear(listHost);
    chipsHost.append(el("div", { class: "theme-chips" }, CATS.map((c) =>
      el("button", { class: "theme-chip" + (c === cat ? " on" : ""), type: "button", onclick: () => { cat = c; window.__themeCat = c; paint(); } }, [el("span", { text: c })]))));
    const list = themes().filter((t) => cat === "전체" || t.cats.includes(cat));
    if (!list.length) { listHost.append(el("p", { class: "muted", text: "곧 새로운 테마가 올라와요." })); return; }
    list.forEach((t) => listHost.append(banner(t, () => {
      if (t.theme) return navigate(`/theme/${t.id}`);
      if (t.q) stash("oracle:question", t.q);
      navigate(t.to);
    })));
  }
  paint();
  return root;
}

/* ---------------- 테마 리딩 (새 조합 콘텐츠) ---------------- */
const SPOUSE = { male: ["정재", "편재"], female: ["정관", "편관"] };
const HAP6 = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
const isHap = (a, b) => HAP6.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
const MEET = {
  wood: "스터디·운동 모임·새로 시작하는 배움의 자리", fire: "공연·전시·파티·SNS처럼 밝고 사람 많은 곳",
  earth: "지인 소개·동네 단골집·오래 다닌 모임", metal: "직장·전문 분야 모임·일로 엮인 자리",
  water: "여행·온라인·늦은 밤 긴 대화가 오가는 자리",
};
/* 십신별 '그 달에 일어나기 쉬운 결정적 순간' */
const MOMENT = {
  비견: ["🤝 사람", "뜻이 맞는 동료·친구가 나타나요. 함께 시작하는 일이 힘을 받아요."],
  겁재: ["⚔️ 경쟁", "경쟁자나 라이벌이 등장해요. 내 몫을 분명히 챙겨야 하는 순간이 와요."],
  식신: ["🎨 표현", "재능과 아이디어가 빛을 봐요. 작은 결과물이 칭찬으로 돌아와요."],
  상관: ["🔥 변화", "틀을 깨고 싶어져요. 이직·도전·과감한 말 한마디가 판을 바꿔요."],
  편재: ["💸 기회", "뜻밖의 돈·기회가 들어와요. 새로운 사람과의 인연도 활발해요."],
  정재: ["💰 안정", "꾸준히 쌓은 게 보상으로 와요. 현실적인 계획이 결실을 맺어요."],
  편관: ["⚡ 도전", "갑작스러운 일·책임이 몰려와요. 버티면 한 단계 성장하는 달이에요."],
  정관: ["🏅 인정", "승진·합격·인정받을 일이 생겨요. 진지한 관계로 발전하기도 좋아요."],
  편인: ["🔮 직감", "새로운 공부·취미에 빠져요. 혼자만의 시간에 중요한 깨달음이 와요."],
  정인: ["📜 도움", "귀인·윗사람의 도움이 들어와요. 문서·계약·자격 일이 잘 풀려요."],
};

function yearInfo(profile, gender, year) {
  const t = computeSaju({ calendarType: "solar", birthDate: `${year}-06-15`, birthTime: "12:00", timeUnknown: true, gender: "male", timezone: "Asia/Seoul" });
  const god = tenGod(profile.pillars.day.stemIdx, t.pillars.year.stemIdx);
  let s = 50;
  const spouse = (SPOUSE[gender] || SPOUSE.female).includes(god);
  if (spouse) s += 26;
  if (isHap(profile.pillars.day.branchIdx, t.pillars.year.branchIdx)) s += 16;
  if (Math.abs(profile.pillars.day.branchIdx - t.pillars.year.branchIdx) === 6) s += 8; // 충 — 변화의 해
  if (god === "정인" || god === "식신") s += 6;
  return { year, gz: t.pillars.year.gz, god, spouse, score: s };
}

const THEME_VIEW = {
  "year-12": {
    years: true,
    titleFor(yr) { return yr < Y() ? `${yr}년에 있었던 12가지 결정적 순간` : `${yr}년에 일어날 12가지 결정적 순간`; },
    title: `${Y()}년에 일어날 12가지 결정적 순간`,
    build(profile, gender, yr) {
      const ny = yr || Y();
      const past = ny < Y(), cur = ny === Y(), nowM = M();
      let flow = [];
      try { flow = monthlyFlow(profile, gender, ny, 1, 12); } catch { flow = []; }
      const rows = flow.map((f) => { const mo = MOMENT[f.god] || MOMENT.비견; return { m: f.m, gz: f.gz, tag: mo[0], text: mo[1], love: f.favorable }; });
      const loveMonths = rows.filter((r) => r.love).map((r) => `${r.m}월`);
      const big = rows.filter((r) => /변화|도전|기회|인정/.test(r.tag)).map((r) => `${r.m}월`);
      return [
        headline(`${ny}년의 큰 전환점${past ? "이었던 달은" : "은"} ${big.slice(0, 3).join(" · ") || "상반기"}이에요.`,
          loveMonths.length ? `연애·인연 기운이 ${past ? "살아났던" : "살아나는"} 달은 ${loveMonths.slice(0, 4).join(" · ")}이에요.` : "인연은 한 해 동안 조용히 이어지는 흐름이에요."),
        list(past ? "달마다 한 가지, 돌아보는 결정적 순간" : "달마다 한 가지, 결정적 순간", rows.map((r) => `${r.m}월 (${r.gz}) ${r.tag} — ${r.text}${r.love ? " 💗 인연 기운" : ""}${cur && r.m === nowM ? "  ← 지금" : ""}${cur && r.m < nowM ? " (지나감)" : ""}`)),
        list(past ? "지난 한 해를 돌아보는 법" : "한 해를 잘 쓰는 법", past
          ? ["전환점이었던 달에 실제로 무슨 일이 있었는지 떠올려 보세요. 내 사주의 흐름이 보이기 시작해요.", "그때 잘 풀린 방식은 올해에도 다시 써먹을 수 있어요.", "아쉬웠던 달의 기운은 올해·내년 같은 십신(十神)이 들어오는 달에 다시 만날 수 있어요."]
          : ["전환점 달에는 큰 결정을 미루지 말고, 한 달 전부터 준비해 두세요.", "인연 기운이 있는 달엔 약속을 늘리고 새로운 모임에 나가 보세요.", "각 달 운세는 ‘이달의 운세’에서 더 자세히 볼 수 있어요."]),
      ];
    },
  },
  "marry-when": {
    title: "나는 언제쯤 결혼하게 될까?",
    build(profile, gender) {
      const y0 = Y();
      const years = Array.from({ length: 10 }, (_, i) => yearInfo(profile, gender, y0 + i));
      const top = [...years].sort((a, b) => b.score - a.score).slice(0, 3).sort((a, b) => a.year - b.year);
      const first = top[0];
      const ideal = idealType(profile, gender);
      return [
        headline(`결혼운이 가장 강하게 열리는 해는 ${top.map((t) => t.year + "년").join(" · ")}이에요.`,
          `그중 가장 가까운 ${first.year}년(${first.gz})은 ${first.spouse ? `배우자를 뜻하는 기운(${first.god})이 들어오는 해라, 진지한 인연이나 결혼 이야기가 오가기 쉬워요.` : "관계가 한 단계 정리·확정되기 쉬운 흐름이에요."}`),
        list("앞으로 10년 결혼운 흐름", years.map((t) => `${t.year}년 ${t.gz} — ${t.score >= 80 ? "💍 결혼운 강함" : t.score >= 64 ? "💗 좋은 인연·진전" : "· 내실을 다지는 해"}`)),
        list("이런 사람과 결혼할 가능성이 커요", [ideal.line, ideal.look]),
        list("결혼운을 살리는 법", [
          `${first.year - 1}년 하반기부터 만남의 폭을 넓혀 두세요. 인연은 결혼운이 오기 한두 해 전에 시작되는 경우가 많아요.`,
          "결혼 조건(사는 곳·일·돈·아이)을 미리 한 번 적어 보세요. 좋은 해에 결정을 빨리 내릴 수 있어요.",
          "더 자세한 배우자 얼굴·이상형은 ‘나의 인연’에서 볼 수 있어요.",
        ]),
      ];
    },
  },
  "solo-month": {
    title: `${M()}월, 솔로의 애정운`,
    build(profile) {
      const r = readTopic(profile, "monthlove", NOW());
      const tg = taegilMonth(profile, Y(), M(), "date");
      const good = tg.best.map((d) => `${M()}월 ${d.day}일`);
      return [
        headline(r.headline, r.tip),
        list("이달 설렘이 커지는 날", [good.join(" · "), "이 날들엔 약속을 잡거나 새 모임에 나가 보세요."]),
        list("이달 조심할 날", [tg.caution.map((d) => `${M()}월 ${d.day}일`).join(" · ") + " — 오해나 엇갈림이 생기기 쉬워요. 중요한 고백은 피하세요."]),
        list("솔로 탈출 한 수", ["평소 안 가던 곳 한 군데 가 보기", "연락이 뜸했던 지인에게 먼저 안부 보내기 — 소개로 이어지기 쉬운 달이에요", `이달 행운색 ${r.luckyColor}을 옷이나 소품에 한 가지`]),
      ];
    },
  },
  "solo-escape": {
    title: `${Y() + 1} 솔로 탈출, 이런 사람과 해요`,
    build(profile, gender) {
      const ny = Y() + 1;
      let flow = [];
      try { flow = monthlyFlow(profile, gender, ny, 1, 12); } catch { flow = []; }
      const good = flow.filter((m) => m.favorable).map((m) => `${m.m}월`);
      const who = datePortrait(profile, gender);
      const charm = charmSpirits(profile);
      return [
        headline(good.length ? `${ny}년, 인연이 들어오는 달은 ${good.slice(0, 4).join(" · ")}이에요.` : `${ny}년은 조용히 스며드는 인연의 해예요.`,
          good.length ? `특히 ${good[0]}은 연애 기운이 살아나는 첫 달이에요. 이때 새 만남을 적극적으로 만들어 보세요.` : "눈에 띄는 한 달보다, 꾸준히 만나는 사람과 천천히 깊어지는 흐름이에요."),
        list("이런 사람과 이어질 가능성이 커요", [who.summary, ...who.traits]),
        list("어디서 만날까?", [MEET[who.elem] || MEET.earth, charm.dohwa ? "도화 기운이 있어 사람 많은 곳에서 먼저 눈에 띄어요. 모임·행사에 자주 얼굴을 비추세요." : "첫눈에 반하는 인연보다, 자주 보며 편해진 사람과 이어지기 쉬워요."]),
        list("솔로 탈출 전략", ["인연 달 한두 달 전부터 머리·옷 스타일을 한 번 바꿔 보세요.", "마음에 드는 사람에겐 구체적인 약속(날짜·장소)으로 먼저 제안하기.", "더 자세한 초상화는 ‘나의 인연’에서 볼 수 있어요."]),
      ];
    },
  },
};

function headline(head, sub) {
  return el("div", { class: "panel conclusion" }, [
    el("span", { class: "conclusion-tag", text: "결론" }),
    el("p", { class: "conclusion-head", text: head }),
    sub ? el("p", { class: "conclusion-sub", text: sub }) : null,
  ].filter(Boolean));
}
function list(label, items) {
  return el("div", { class: "block tag-good" }, [
    el("span", { class: "block-label" }, [el("span", { text: label })]),
    ...items.filter(Boolean).map((t) => el("p", { text: t })),
  ]);
}

export function renderThemeReading({ navigate, id }) {
  loadDisclaimer();
  const meta = themes().find((t) => t.id === id);
  const view = THEME_VIEW[id];
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/explore", "테마 운세")]));
  if (!meta || !view) { root.append(el("section", { class: "wrap" }, [noticeBox("warn", "알 수 없는 테마예요.")])); return root; }
  root.append(el("section", { class: "wrap" }, [banner(meta, () => {})]));
  root.append(personSwitch(navigate));
  const my = getMyBirth();
  const host = el("section", { class: "wrap section-gap", style: "margin-top: var(--sp-3);" });
  root.append(host);
  if (!my) {
    host.append(noticeBox("info", "생년월일이 필요해요. 한 번 입력하면 저장됩니다."),
      el("button", { class: "btn btn-primary", onclick: () => navigate("/saju") }, [el("span", { text: "내 정보 입력하고 시작" })]));
    return root;
  }
  let selYear = Y();
  const itemIdOf = () => `theme:${id}:${my.birthDate}:${id === "solo-month" ? `${Y()}-${M()}` : selYear}`;
  const cost = meta.cost || costOf(id);
  function paint() {
    clear(host);
    const itemId = itemIdOf();
    if (view.years) {
      host.append(el("div", { class: "method-tabs" }, [Y() - 1, Y(), Y() + 1].map((yr) =>
        el("button", { type: "button", class: "method-tab" + (yr === selYear ? " on" : ""), onclick: () => { selYear = yr; paint(); } },
          [el("span", { text: `${yr === Y() - 1 ? "작년" : yr === Y() ? "올해" : "내년"} ${yr}` })]))));
    }
    const vTitle = view.titleFor ? view.titleFor(selYear) : view.title;
    if (!isUnlocked(itemId)) {
      const coins = getCoins();
      host.append(el("div", { class: "panel premium-lock" }, [
        el("span", { class: "lock-badge" }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: `코인 ${cost}개` })]),
        el("h3", { class: "serif", style: "margin-top:10px;", text: vTitle }),
        el("p", { class: "muted", style: "font-size:var(--fs-sm);", text: meta.sub + " — 한 번 열면 다시 볼 땐 무료예요." }),
        el("button", { class: "btn btn-primary btn-block", style: "margin-top: var(--sp-4);", onclick: () => {
          const r = unlock(itemId, cost);
          if (r.ok) { toast(`${vTitle}을(를) 열었어요`); paint(); } else { noCoinToast(); navigate("/store"); }
        } }, [el("span", { text: coins >= cost ? `코인 ${cost}개로 열기 · 보유 ${coins}개` : "코인 받으러 가기" })]),
      ]));
      return;
    }
    const profile = computeSaju(my);
    const gender = my.gender === "male" ? "male" : "female";
    view.build(profile, gender, selYear).forEach((n) => host.append(n));
    host.append(noticeBox("info", "사주 흐름으로 본 재미·참고용 풀이예요. 미래를 확정하지 않아요."));
  }
  paint();
  return root;
}
