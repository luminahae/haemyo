/* =========================================================
   클라우드(선택) 설정 — Firebase
   여기를 채우면 Google·이메일 로그인 + 클라우드 저장(기기 동기화)이 켜집니다.
   비워 두면 앱은 지금처럼 '로컬 프로필'로만 동작합니다(서버 없이).

   값 찾는 곳: Firebase 콘솔 › 프로젝트 설정(톱니바퀴) › 일반 › 내 앱 › 웹 앱(</>)
               › "SDK 설정 및 구성" › 구성(Config) — firebaseConfig 안의 값을 그대로 복사.
   ⚠️ firebaseConfig의 apiKey는 '공개용' 값이라 사이트에 들어가도 괜찮아요.
      보안은 Firestore 보안 규칙(SETUP.md)과 Authentication › 승인된 도메인으로 지킵니다.
      서비스 계정 키(비공개 키 JSON)는 절대 여기에 넣지 마세요.
   ========================================================= */

export const CONFIG = {
  firebase: {
    apiKey: "AIzaSyC9VxWfHuMsfU7jmYq-khHM3Z3YQlsQyAs",
    authDomain: "haemyo.firebaseapp.com",
    projectId: "haemyo",
    storageBucket: "haemyo.firebasestorage.app",
    messagingSenderId: "192730184400",
    appId: "1:192730184400:web:d623d57bd28833c2d63cd5",
    measurementId: "G-2V6LMV98D5",
  },

  /* ---- 코인 충전(소액결제) 설정 — 점신/포스텔러식 ----
     해석 1회 = 1코인(기본 500원). 충전은 외부 결제사의 안전한(PCI) 페이지에서 처리하고,
     결제 후 받은 '라이선스 키'를 입력하면 해당 패키지만큼 코인이 충전됩니다.
     이 앱은 카드정보를 절대 받지 않습니다. 설정 방법은 SETUP.md 참고.
     비워 두면 '충전 준비 중'으로 표시됩니다(출석 무료코인·둘러보기는 그대로 동작). */
  payment: {
    enabled: false,               // true로 켜면 충전 UI 노출
    provider: "lemonsqueezy",     // "lemonsqueezy" | "gumroad"
    manageUrl: "",                // 영수증/환불/문의 링크(선택)
    // 충전 패키지 — 각 상품의 호스티드 체크아웃 URL + 지급 코인 수
    // variantId/productId: 결제 후 라이선스 검증 응답과 매칭해 올바른 코인 지급
    packages: [
      // { coins: 3,  priceLabel: "₩1,500", checkoutUrl: "", variantId: "", productId: "", badge: "" },
      // { coins: 11, priceLabel: "₩5,000", checkoutUrl: "", variantId: "", productId: "", badge: "인기" },
      // { coins: 24, priceLabel: "₩10,000", checkoutUrl: "", variantId: "", productId: "", badge: "이득" },
    ],
  },
};

export function getConfig() {
  // window.__SAJU_CONFIG 로 배포 시 덮어쓸 수도 있음(선택)
  return Object.assign({}, CONFIG, (typeof window !== "undefined" && window.__SAJU_CONFIG) || {});
}

export function isCloudEnabled() {
  const f = getConfig().firebase || {};
  return !!(f.apiKey && f.authDomain && f.projectId && f.appId);
}

export function getPaymentConfig() {
  const p = getConfig().payment || { enabled: false };
  return { packages: [], ...p };
}
/** 충전이 실제로 켜져 있는지(설정 완료 + 패키지 1개 이상 + 체크아웃 URL) */
export function isPaymentReady() {
  const p = getPaymentConfig();
  return !!(p.enabled && p.packages.some((pk) => pk && pk.checkoutUrl));
}
