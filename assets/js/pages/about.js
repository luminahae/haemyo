import { el, icon, clear, toast } from "../utils/dom.js";
import { pageHeader, backLink, noticeBox, loadDisclaimer, formatDate, CAT_SVG } from "./shared.js";
import { grantOnce, isAdmin } from "../wallet.js";
import { getReviews, hasWrittenReview, submitReview, deleteReview } from "../state.js";
import { isCloudEnabled, getUser as getCloudUser, adminListUsers, cloudAddReview, cloudListReviews, cloudDeleteReview, sendInquiry, myInquiries, adminInquiries, adminReplyInquiry, deleteInquiry } from "../cloud.js";
export function renderAbout({ navigate }) {
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(pageHeader("ABOUT", "이용 안내 · 도움말", "사용 방법, 자주 묻는 질문, 결과를 읽는 법과 면책 안내예요."));
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [
    el("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: () => import("./home.js").then((m) => m.openOnboarding(navigate, { force: true })) }, [el("span", { text: "👋 처음 안내 다시 보기" })]),
  ]));

  const body = el("div", { class: "wrap section-gap" });
  root.append(body);

  body.append(
    card("이 서비스는 무엇인가요?", [
      "사주와 타로를 통해 당신의 성격·인간관계·연애·결혼·직업·금전 습관을 현실적으로 돌아보는 자기이해형 콘텐츠입니다.",
      "막연한 길흉 판단이 아니라, 반복되는 행동 패턴과 선택 방식을 점검하는 데 초점을 둡니다.",
    ]),
    card("결과를 읽을 때 기억해 주세요", [
      "좋은 말만 반복하지 않습니다. 장점의 부작용과 조심할 지점도 함께 다룹니다.",
      "부정적으로 보이는 해석에는 반드시 현실적인 대응 방법을 함께 제시합니다.",
      "누구에게나 적용되는 일반적인 문장보다, 구체적인 상황과 행동을 이야기하려 합니다.",
    ]),
  );

  // 도움말 — 자주 묻는 질문 (사용성 10원칙: 도움말과 문서화)
  const FAQ = [
    ["코인은 어떻게 쓰이나요?", "풀이를 처음 열 때만 코인이 빠지고, 한 번 연 풀이는 다시 볼 때 무료예요. 오른쪽 위 동그란 숫자가 지금 남은 코인이에요. 코인 5개 이상 쓰는 버튼은 실수 방지를 위해 한 번 더 눌러야 진행돼요."],
    ["코인은 어디서 받나요?", "충전소에서 매일 출석하면 무료 코인을 받고, 후기를 남기거나 쿠폰·코드를 입력해도 받을 수 있어요."],
    ["날짜를 누르면 나오는 하루 운세는?", "만세력 일진 달력에서 날짜를 누르면 그날의 운세가 떠요. 오늘은 무료, 다른 날은 코인 1개예요. 운세 캘린더에서 이미 연 날은 추가 코인 없이 볼 수 있어요."],
    ["다른 사람 기준으로 보고 싶어요", "홈·운세·마이의 ‘누구로 볼까?’ 줄에서 내 사람을 누르면 그 사람 시점으로 모든 운세를 볼 수 있어요. 위쪽 띠의 ‘내 시점으로’를 누르면 돌아와요."],
    ["친구는 어떻게 추가하나요?", "내 사람 › ‘+ 친구 추가’에서 초대 링크(무료) 또는 직접 입력(코인)으로 추가해요. 궁합 등에서 새 사람을 직접 입력하면 코인 10개가 들고, 그 사람은 내 사람에 바로 저장돼요. 이미 저장한 사람을 고르면 무료예요."],
    ["친구를 잘못 지웠어요", "삭제 직후 아래에 뜨는 ‘되돌리기’를 누르면 바로 되살릴 수 있어요. 정보가 틀렸다면 카드의 ‘정보 수정’으로 고치면 돼요."],
    ["태어난 시간을 몰라요", "‘시간 모름’을 체크하면 시주(時柱)를 빼고 봐요. 자시(子時)·축시(丑時)처럼 시진만 알면 시진 버튼을 눌러도 돼요."],
    ["내 정보는 어디에 저장되나요?", "로그인하면 내 정보·내 사람·코인·저장한 풀이가 내 계정(Google Firebase 클라우드)에 저장돼서 다른 기기에서도 이어서 볼 수 있어요. 내 계정 데이터는 나와 (문의·오류 확인이 필요할 때) 관리자만 볼 수 있고, 마이 › 회원 탈퇴로 언제든 모두 지울 수 있어요 (탈퇴 후 7일, 최대 30일간 보관되다 자동 삭제). 로그인 전 정보는 이 브라우저에만 있어요."],
  ];
  body.append(el("div", { class: "panel section-gap" }, [
    el("h3", { text: "자주 묻는 질문" }),
    ...FAQ.map(([q, a]) => el("details", { class: "faq-item" }, [el("summary", { text: q }), el("p", { class: "muted", style: "font-size:var(--fs-sm); margin-top:6px;", text: a })])),
  ]));

  loadDisclaimer().then((d) => {
    body.append(
      el("div", { class: "panel section-gap" }, [
        el("h3", { text: "면책 안내" }),
        el("p", { text: d.full }),
      ]),
      noticeBox("warn", d.demoNotice),
    );
    body.append(
      el("div", { class: "panel section-gap" }, [
        el("h3", { text: "이번 버전에서 제공하지 않는 것" }),
        el("ul", {}, ["코인 충전 결제"].map((t) => el("li", { text: t }))),
        el("p", { class: "tiny muted", text: "타로·무료 운세는 로그인 없이, 사주·궁합처럼 내 정보를 저장하는 풀이는 Google·이메일 로그인 후 이용할 수 있어요." }),
      ]),
      el("div", { class: "btn-row", style: "margin-top: var(--sp-4);" }, [
        el("a", { href: "#/privacy", class: "btn btn-ghost btn-sm", text: "개인정보처리방침" }),
        el("a", { href: "#/terms", class: "btn btn-ghost btn-sm", text: "이용약관" }),
        el("a", { href: "#/", class: "btn btn-quiet btn-sm", text: "홈으로" }),
      ]),
    );
  });

  return root;
}

function card(title, paras) {
  return el("div", { class: "panel section-gap" }, [
    el("h3", { text: title }),
    ...paras.map((p) => el("p", { class: "muted", text: p })),
  ]);
}

/* ---- 개인정보 (합침) ---- */

/* ---- 📜 개인정보처리방침 · 이용약관 (HAE) ---- */
const LEGAL_DATE = "2026년 11월 20일";
function legalSec(n, title, items) {
  return el("section", { class: "panel section-gap lg-sec" }, [
    el("h3", { text: `제${n}조 ${title}` }),
    ...items.map((t) => Array.isArray(t)
      ? el("ul", { class: "lg-ul" }, t.map((x) => el("li", { text: x })))
      : el("p", { class: "muted", text: t })),
  ]);
}
function legalTable(rows) {
  return el("div", { class: "lg-tbl", role: "table" }, rows.map((r, i) => el("div", { class: "lg-tr" + (i ? "" : " lg-th"), role: "row" }, r.map((c) => el("span", { role: i ? "cell" : "columnheader", text: c })))));
}
function legalTabs(navigate, now) {
  return el("div", { class: "wrap lg-tabs", role: "tablist" }, [["/privacy", "개인정보처리방침"], ["/terms", "이용약관"]].map(([p, t]) =>
    el("button", { type: "button", role: "tab", "aria-selected": String(p === now), class: "chip" + (p === now ? " on" : ""), onclick: () => navigate(p) }, [el("span", { text: t })])));
}

export function renderPrivacy({ navigate }) {
  const root = el("div", { class: "lg" });
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(pageHeader("PRIVACY", "개인정보처리방침", `해묘(解猫)가 어떤 정보를, 왜, 얼마 동안 다루는지 알려 드려요. 시행일 ${LEGAL_DATE}`));
  root.append(legalTabs(navigate, "/privacy"));
  const body = el("div", { class: "wrap section-gap" });
  root.append(body);
  body.append(
    el("div", { class: "panel panel-gold section-gap" }, [
      el("h3", { text: "한눈에 보기" }),
      el("ul", { class: "lg-ul" }, [
        "생년월일은 풀이 계산에만 써요. 광고·판매·제3자 제공은 하지 않아요.",
        "로그인 전 정보는 이 브라우저에만 저장돼요.",
        "건강 · 수술 풀이에 넣은 내용과 반려동물 정보는 서버에 보내지 않아요 (이 기기에만).",
        "탈퇴하면 7일, 최대 30일 뒤 자동으로 모두 지워져요.",
      ].map((t) => el("li", { text: t }))),
    ]),
    legalSec(1, "수집하는 개인정보와 이용 목적", [
      "해묘는 서비스를 제공하는 데 꼭 필요한 정보만 받아요.",
    ]),
  );
  body.lastChild.append(legalTable([
    ["구분", "항목", "이용 목적"],
    ["회원 가입 · 로그인", "이메일, 닉네임, Google 계정 식별값(이름·프로필 사진 포함 가능)", "본인 확인, 계정 관리, 다른 기기 이어보기"],
    ["풀이 계산", "생년월일, 양력/음력, 태어난 시간(선택), 성별, 이름(선택)", "사주 · 운세 · 궁합 계산과 결과 표시"],
    ["내 사람", "내가 입력한 가족 · 친구의 이름(별명)과 생년월일", "궁합 · 가족 사주 등 관계 풀이"],
    ["알림(선택)", "기기 알림 토큰, 받을 시간, 알림 종류, 생일(월·일)", "오늘의 운세 · 생일 · 명절 알림 보내기"],
    ["후기 · 1:1 문의", "작성 내용, 닉네임(익명 선택 가능), 작성 시각", "후기 게시, 문의 답변"],
    ["상담소(선택)", "상담 제목 · 내용, 함께 보낸 생년월일(나 · 고른 사람), 주고받은 답변", "상담사 답변, 답변 도착 알림"],
    ["AI 상담(선택)", "질문 내용, 사주 요약(태어난 해 · 사주 여덟 글자 · 오행), 뽑은 타로 카드", "AI 답변 만들기 — 대화 기록은 서버에 남기지 않고 이 기기에만 저장"],
    ["이용 기록", "코인 내역, 열어 본 풀이, 접속 시각, 출석 기록", "코인 지급 · 오류 확인, 부정 이용 방지"],
  ]));
  body.append(
    legalSec(2, "기기에만 저장하는 정보", [[
      "건강 · 수술 시기 풀이에 입력한 내용 — 서버로 보내지 않고 화면에서만 계산해요.",
      "반려동물 이름 · 생일 — 이 브라우저(localStorage)에만 저장돼요.",
      "로그인 전 내 정보 · 보관함 — 이 브라우저에만 저장되며, 브라우저 데이터를 지우면 함께 사라져요.",
    ]]),
    legalSec(3, "보유 및 이용 기간", [[
      "회원 정보 · 풀이 기록: 회원 탈퇴 시까지",
      "탈퇴 후: 실수로 인한 복구 요청에 대비해 7일, 최대 30일 보관 뒤 자동 삭제",
      "열어 본 풀이 기록: 7일 (보관함에 저장한 풀이는 직접 지울 때까지)",
      "알림 정보: 알림을 끄거나 탈퇴하면 바로 삭제",
      "게스트 계정: 게스트를 끝내거나 관리자가 정리할 때 삭제",
    ], "단, 관계 법령에 따라 보관해야 하는 정보가 생기면 그 기간 동안만 따로 보관해요."]),
    legalSec(4, "제3자 제공", ["해묘는 이용자의 개인정보를 제3자에게 제공하지 않아요. 법령에 따라 수사기관 등이 적법한 절차로 요청하는 경우만 예외예요."]),
    legalSec(5, "처리 위탁 및 국외 이전", ["안정적인 서비스를 위해 아래 업체의 서버를 이용해요. 이 서버들은 해외에 있을 수 있어요."]),
  );
  body.lastChild.append(legalTable([
    ["받는 곳", "맡기는 일", "이전 항목 · 방법"],
    ["Google LLC (Firebase — Authentication, Cloud Firestore, Cloud Messaging)", "로그인, 데이터 저장, 알림 보내기", "제1조의 회원 정보 · 풀이 정보 · 알림 토큰 / 서비스 이용 시 네트워크로 전송"],
    ["Google LLC (Gemini · Firebase AI Logic)", "AI 상담 답변 만들기", "AI 상담을 쓸 때만 질문 · 사주 요약 / 네트워크로 전송 (Google 정책에 따라 처리)"],
    ["GitHub, Inc. (GitHub Pages · Actions)", "웹사이트 제공, 정해진 시각 알림 발송 실행", "접속 기록(IP 등, GitHub 정책에 따름), 알림 발송 시 알림 정보 / 네트워크 전송"],
  ]));
  body.lastChild.append(el("p", { class: "tiny muted", style: "margin-top:8px;", text: "보유 기간은 제3조와 같아요. 국외 이전을 원하지 않으면 로그인하지 않고(이 기기 저장만) 이용하거나 탈퇴할 수 있어요. 단, 이 경우 다른 기기 이어보기 · 알림은 쓸 수 없어요." }));
  body.append(
    legalSec(6, "파기 절차와 방법", ["보유 기간이 끝나거나 탈퇴 유예 기간이 지나면 데이터베이스에서 복구할 수 없게 지워요. 출력물은 만들지 않아요."]),
    legalSec(7, "이용자의 권리와 행사 방법", [[
      "마이 › 내 정보에서 언제든 보기 · 고치기",
      "마이 › 보관함에서 풀이 지우기, 마이 › 알림에서 알림 끄기",
      "마이 › 계정 관리 › 회원 탈퇴로 처리 정지 · 전체 삭제",
      "그 밖의 열람 · 정정 · 삭제 · 처리 정지 요청은 1:1 문의로 — 지체 없이 처리해요.",
    ]]),
    legalSec(8, "만 14세 미만 아동", ["해묘는 만 14세 이상을 위한 서비스예요. 만 14세 미만은 가입하지 말아 주세요. 미만임이 확인되면 법정대리인 동의가 없는 정보는 지체 없이 삭제해요."]),
    legalSec(9, "안전성 확보 조치", [[
      "모든 통신은 HTTPS로 암호화돼요.",
      "데이터베이스 보안 규칙으로 본인 데이터는 본인(과 문의 확인을 위한 관리자)만 읽고 쓸 수 있어요.",
      "비밀번호는 Google Firebase가 관리하며 해묘는 비밀번호를 볼 수 없어요.",
      "알림 발송용 서버 키는 공개 저장소가 아닌 비공개 보관소(Secrets)에만 둬요.",
    ]]),
    legalSec(10, "자동 수집 장치(쿠키 등)", ["해묘는 광고 · 분석용 쿠키를 쓰지 않아요. 로그인 유지와 설정 저장을 위해 브라우저 저장소(localStorage · IndexedDB)를 써요. 브라우저 설정에서 지울 수 있지만, 지우면 로그인 전 정보가 사라져요."]),
    legalSec(11, "개인정보 보호책임자", ["해묘 운영자 (HAE) — 개인정보 관련 문의 · 불만 · 피해 구제는 앱의 1:1 문의로 보내 주세요. 빠르게 답변드려요."]),
  );
  body.lastChild.append(el("a", { href: "#/inquiry", class: "btn btn-ghost btn-sm", style: "margin-top:8px;", text: "1:1 문의하기" }));
  body.append(
    legalSec(12, "권익 침해 구제 방법", ["개인정보 침해로 도움이 필요하면 아래 기관에 문의할 수 있어요.", [
      "개인정보분쟁조정위원회 1833-6972 (kopico.go.kr)",
      "개인정보침해신고센터 118 (privacy.kisa.or.kr)",
      "대검찰청 1301 (spo.go.kr)",
      "경찰청 182 (ecrm.police.go.kr)",
    ]]),
    legalSec(13, "공유 이미지", ["공유 · 저장 이미지에는 생년월일 전체를 기본으로 넣지 않아요 (예: ‘1994년생 · 닉네임’). 공유한 이미지는 받은 사람에게 남으니 신중히 공유해 주세요."]),
    legalSec(14, "방침의 변경", [`이 방침은 ${LEGAL_DATE}부터 시행해요. 내용이 바뀌면 시행 7일 전(중요한 변경은 30일 전)에 공지로 알려 드려요.`]),
  );
  return root;
}

export function renderTerms({ navigate }) {
  const root = el("div", { class: "lg" });
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(pageHeader("TERMS", "이용약관", `해묘(解猫)를 쓰기 전에 알아 두면 좋은 약속이에요. 시행일 ${LEGAL_DATE}`));
  root.append(legalTabs(navigate, "/terms"));
  const body = el("div", { class: "wrap section-gap" });
  root.append(body);
  body.append(
    legalSec(1, "목적", ["이 약관은 해묘(이하 ‘서비스’)를 이용할 때 운영자(HAE)와 이용자 사이의 권리 · 의무와 책임을 정해요."]),
    legalSec(2, "서비스 내용", ["사주(四柱) · 타로 · 운세 · 궁합 · 꿈풀이 등 자기이해와 재미를 위한 풀이 콘텐츠, 보관함, 알림 등을 무료로 제공해요."]),
    legalSec(3, "풀이 결과의 성격", [[
      "모든 풀이는 전통 명리 · 타로 해석을 바탕으로 만든 참고용 · 오락용 콘텐츠예요.",
      "의료 · 법률 · 투자 · 진학 등 중요한 결정을 대신하지 않아요. 건강 · 수술 관련 풀이는 진단이 아니며, 반드시 의료진의 판단을 따라 주세요.",
      "풀이를 근거로 한 결정과 그 결과의 책임은 이용자에게 있어요.",
    ]]),
    legalSec(4, "회원 가입과 계정", [[
      "만 14세 이상이면 Google · 이메일 · 게스트로 가입할 수 있어요.",
      "계정 정보는 본인이 관리해야 하며, 남에게 빌려주거나 넘길 수 없어요.",
      "언제든 마이 › 회원 탈퇴로 그만둘 수 있어요.",
    ]]),
    legalSec(5, "코인", [[
      "코인은 출석 · 후기 · 이벤트 · 쿠폰으로 무료로 받는 서비스 안 포인트예요. 현재 돈으로 사고팔 수 없어요.",
      "코인은 현금으로 바꾸거나 환불할 수 없고, 다른 계정에 넘길 수 없어요.",
      "오류 · 중복 지급 · 부정한 방법(여러 계정, 자동화 등)으로 받은 코인은 회수할 수 있어요.",
      "탈퇴하면 남은 코인은 사라져요. 서비스를 종료할 때는 미리 공지해요.",
    ]]),
    legalSec(6, "이용자의 의무", ["이용자는 다음 행동을 하면 안 돼요.", [
      "다른 사람의 정보를 동의 없이 입력하거나 공유하는 일",
      "욕설 · 비방 · 광고 · 개인정보가 담긴 후기 · 문의",
      "서비스를 해킹 · 자동화 · 과도한 요청으로 방해하는 일",
      "풀이 콘텐츠를 허락 없이 대량으로 복제 · 판매하는 일",
    ], "위반하면 게시물 삭제, 코인 회수, 이용 제한을 할 수 있어요."]),
    legalSec(7, "게시물(후기)", ["후기는 모든 이용자에게 공개돼요. 작성자는 언제든 지울 수 있고, 제6조를 어긴 후기는 운영자가 알림 없이 숨기거나 지울 수 있어요. 해묘는 후기를 서비스 안에서 보여 주는 데만 써요."]),
    legalSec(8, "서비스의 변경 · 중단", ["더 나은 서비스를 위해 메뉴 · 풀이 · 코인 가격을 바꾸거나, 점검 · 장애 · 외부 서비스(Google Firebase · GitHub) 사정으로 잠시 멈출 수 있어요. 중요한 변경은 공지로 미리 알려 드려요."]),
    legalSec(9, "책임의 한계", ["해묘는 무료 서비스로, 천재지변 · 외부 서비스 장애 · 이용자 기기 문제로 생긴 손해나 풀이 내용을 믿고 한 행동의 결과에 대해 법이 허용하는 범위에서 책임지지 않아요. 단, 운영자의 고의 · 중대한 과실로 생긴 손해는 예외예요."]),
    legalSec(10, "약관의 변경", [`이 약관은 ${LEGAL_DATE}부터 시행해요. 바뀌면 시행 7일 전(이용자에게 불리하면 30일 전)부터 공지해요. 바뀐 약관에 동의하지 않으면 탈퇴할 수 있어요.`]),
    legalSec(11, "준거법 · 분쟁 해결", ["이 약관은 대한민국 법을 따르며, 분쟁이 생기면 먼저 1:1 문의로 원만히 해결하도록 노력해요. 해결되지 않으면 민사소송법에 따른 관할 법원에서 다퉈요."]),
  );
  body.append(el("div", { class: "btn-row", style: "margin-top: var(--sp-4);" }, [
    el("a", { href: "#/privacy", class: "btn btn-ghost btn-sm", text: "개인정보처리방침 보기" }),
    el("a", { href: "#/inquiry", class: "btn btn-quiet btn-sm", text: "1:1 문의" }),
  ]));
  return root;
}

function kv(k, v) {
  return el("div", {}, [
    el("p", { style: "font-weight:600;", text: k }),
    el("p", { class: "muted", style: "font-size:var(--fs-sm);", text: v }),
  ]);
}

/* ---- 404 (합침) ---- */

export function renderNotFound({ navigate }) {
  return el("div", { class: "wrap center", style: "padding-top: var(--sp-7);" }, [
    (() => { const c = el("div", { class: "cat-load cat-lost", style: "margin: 0 auto var(--sp-4);", "aria-hidden": "true" }); c.innerHTML = CAT_SVG; return c; })(),
    el("h1", { class: "serif", style: "font-size: var(--fs-hero);", text: "404" }),
    el("p", { class: "muted", style: "margin-top: var(--sp-2);", text: "요청하신 화면을 찾을 수 없어요. 주소가 바뀌었거나 사라진 페이지일 수 있습니다." }),
    el("div", { class: "btn-row", style: "justify-content:center; margin-top: var(--sp-5);" }, [
      el("button", { class: "btn btn-primary", onclick: () => navigate("/") }, [icon("home"), el("span", { text: "홈으로" })]),
    ]),
  ]);
}

/* ===== (합침) reviews.js ===== */
const REWARD = 10;

export function renderReviews({ navigate }) {
  CLOUD_REVIEWS = null; MY_UID = undefined; // 계정이 바뀌었을 수 있으니 매번 새로
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(pageHeader("해묘 후기", "후기 남기고 코인 받기", "서비스를 이용한 느낌을 들려주세요. 첫 후기 작성 시 코인 10개를 드려요."));

  root.append(el("section", { class: "wrap", style: "margin-bottom: var(--sp-5);" }, [reviewShowcase(navigate, { title: "다른 분들의 후기" })]));
  const composeHost = el("section", { class: "wrap" });
  const listHost = el("section", { class: "wrap section-gap", style: "margin-top: var(--sp-5);" });
  root.append(composeHost, listHost);

  function paint() {
    clear(composeHost); clear(listHost);
    composeHost.append(reviewForm(paint));
    listHost.append(reviewList(paint));
  }
  paint();
  return root;
}

function reviewForm(repaint) {
  const alreadyWritten = hasWrittenReview();
  const box = el("div", { class: "panel panel-gold" });
  if (isCloudEnabled() && MY_UID === null) {
    box.append(el("p", { style: "font-weight:800;", text: "로그인하면 후기를 남길 수 있어요" }),
      el("p", { class: "muted tiny", style: "margin-top:6px;", text: "게스트로 시작해도 돼요. 게스트 후기는 ‘게스트’ 표시가 붙어요." }),
      el("button", { class: "btn btn-primary btn-block", style: "margin-top:12px;", onclick: () => { location.hash = "#/profile"; } }, [el("span", { text: "로그인 · 게스트로 시작하기" })]));
    return box;
  }
  const ratingLabel = el("p", { class: "muted tiny", style: "margin-top:6px;", text: "별점을 선택해 주세요." });
  let rating = 0;
  const stars = Array.from({ length: 5 }, (_, i) => el("button", {
    class: "review-star", type: "button", "aria-label": `${i + 1}점`, "aria-pressed": "false",
    onclick: () => {
      rating = i + 1;
      stars.forEach((star, n) => { star.classList.toggle("on", n < rating); star.setAttribute("aria-pressed", n < rating ? "true" : "false"); });
      ratingLabel.textContent = `${rating}점 · 고마워요!`;
    },
  }, [el("span", { text: "★" })]));
  const nickname = el("input", { class: "input", type: "text", maxlength: "16", placeholder: "닉네임 (안 적으면 '익명'으로 올라가요)", autocomplete: "off" });
  const anonBox = el("input", { type: "checkbox", id: "review-anon" });
  anonBox.addEventListener("change", () => { nickname.disabled = anonBox.checked; if (anonBox.checked) nickname.value = ""; });
  const anonRow = el("label", { class: "rv-anon", for: "review-anon" }, [anonBox, el("span", { text: "익명으로 올리기" }), el("small", { text: "닉네임·계정 이름이 보이지 않아요" })]);
  const content = el("textarea", { class: "input", maxlength: "500", rows: "5", placeholder: "해묘를 이용해 본 느낌을 20자 이상 남겨 주세요.", "aria-label": "후기 내용" });
  const counter = el("p", { class: "muted tiny", style: "text-align:right; margin-top:5px;", text: "0 / 500" });
  const error = el("p", { class: "field-error", "aria-live": "polite", style: "margin-top:8px;" });
  content.addEventListener("input", () => { counter.textContent = `${content.value.length} / 500`; });
  const submit = el("button", { class: "btn btn-primary btn-block", type: "button", style: "margin-top: var(--sp-3);" }, [
    el("span", { text: alreadyWritten ? "후기 등록하기" : `후기 등록하고 코인 +${REWARD} 받기` }),
  ]);
  submit.addEventListener("click", () => {
    const result = submitReview({ rating, nickname: nickname.value, content: content.value, anon: anonBox.checked });
    if (!result.ok) { error.textContent = result.message; return; }
    cloudAddReview(result.review).then((cr) => { if (cr && cr.error && cr.error !== "login") toast(cr.error); CLOUD_REVIEWS = null; repaint(); }).catch(() => {});
    const reward = grantOnce("review:write", REWARD, { kind: "review" });
    toast(reward.ok ? `후기 등록 완료 · 코인 +${REWARD}` : "후기가 등록됐어요. 후기 보상은 이미 받으셨어요.");
    repaint();
  });

  box.append(
    el("div", { style: "display:flex; justify-content:space-between; gap:12px; align-items:flex-start;" }, [
      el("div", {}, [
        el("p", { style: "font-weight:700;", text: "이용 후기를 들려주세요" }),
        el("p", { class: "muted tiny", style: "margin-top:4px;", text: alreadyWritten ? "후기는 더 남길 수 있어요. 보상은 이 프로필(로그인 전에는 이 브라우저) 기준 1회예요." : "첫 후기 등록을 완료하면 코인 10개가 즉시 지급돼요." }),
      ]),
      el("span", { class: "review-reward", text: `+${REWARD} 코인` }),
    ]),
    el("div", { class: "review-stars", role: "group", "aria-label": "별점", style: "margin-top: var(--sp-4);" }, stars),
    ratingLabel,
    el("label", { class: "sr-only", for: "review-nickname", text: "닉네임" }), nickname, anonRow,
    content, counter, error, submit,
  );
  nickname.id = "review-nickname";
  return box;
}

let CLOUD_REVIEWS = null, MY_UID = undefined;
function reviewList(repaint) {
  const cloud = isCloudEnabled();
  // 클라우드를 쓰면 서버의 후기만 — 이 기기에 남은 예전(다른 계정) 후기가 섞여 '내 후기'처럼 보이지 않게
  const reviews = (cloud ? (CLOUD_REVIEWS || []) : getReviews()).slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (CLOUD_REVIEWS === null && cloud) { CLOUD_REVIEWS = []; cloudListReviews().then((l) => { CLOUD_REVIEWS = l || []; repaint(); }); }
  if (MY_UID === undefined && cloud) { MY_UID = null; getCloudUser().then((u) => { MY_UID = (u && u.uid) || null; repaint(); }).catch(() => {}); }
  const host = el("div", {});
  host.append(
    el("div", { style: "display:flex; justify-content:space-between; align-items:baseline; margin-bottom: var(--sp-3);" }, [
      el("h2", { style: "font-size:1.1rem;", text: "후기 보기" }),
      el("span", { class: "muted tiny", text: `${reviews.length}개` }),
    ]),
    ...(isCloudEnabled() ? [] : [noticeBox("info", "지금은 이 기기에 작성된 후기만 보여요.")]),
  );
  if (!reviews.length) {
    host.append(el("div", { class: "panel", style: "margin-top: var(--sp-3); text-align:center;" }, [
      el("p", { style: "font-weight:700;", text: "아직 작성된 후기가 없어요" }),
      el("p", { class: "muted tiny", style: "margin-top:6px;", text: "첫 번째 후기를 남겨 해묘에게 힘을 주세요." }),
    ]));
    return host;
  }
  host.append(el("div", { class: "review-list", style: "margin-top: var(--sp-3);" }, reviews.map((r) => reviewCard(r, repaint))));
  return host;
}

function reviewCard(review, repaint) {
  // 지우기: 관리자는 전부, 작성자는 '그 계정으로 로그인해 있을 때'만 (게스트가 로그아웃하면 관리자만 지울 수 있음)
  // 확인 창(confirm)은 일부 환경에서 막혀 있어서, 버튼을 두 번 누르는 방식
  let bar = null;
  const mine = !!(MY_UID && review.uid && review.uid === MY_UID);
  if (isAdmin() || mine) {
    const base = isAdmin() && !mine ? "관리자 · 삭제" : "내 후기 삭제";
    const label = el("span", { text: base });
    const btn = el("button", { class: "btn btn-quiet btn-sm", type: "button" }, [label]);
    let armed = false, timer = null;
    btn.addEventListener("click", async () => {
      if (!armed) { armed = true; label.textContent = "한 번 더 누르면 삭제"; btn.style.color = "var(--c-danger)"; timer = setTimeout(() => { armed = false; label.textContent = base; btn.style.color = ""; }, 4000); return; }
      clearTimeout(timer);
      await cloudDeleteReview(review.id); deleteReview(review.id); CLOUD_REVIEWS = (CLOUD_REVIEWS || []).filter((r) => r.id !== review.id); toast("후기를 삭제했어요."); repaint();
    });
    bar = el("div", { style: "display:flex; justify-content:flex-end; margin-top:10px;" }, [btn]);
  }
  return el("article", { class: "panel review-card" }, [
    el("div", { style: "display:flex; justify-content:space-between; gap:12px; align-items:baseline;" }, [
      el("p", { class: "rv-name" }, [el("span", { text: review.nickname || "익명의 해묘 친구" }), review.guest ? el("i", { class: "rv-guest", text: "게스트" }) : null, mine ? el("i", { class: "rv-mine", text: "내 후기" }) : null].filter(Boolean)),
      el("span", { class: "muted tiny", text: formatDate(review.createdAt) }),
    ]),
    el("p", { class: "review-rating", "aria-label": `별점 ${review.rating}점`, text: "★".repeat(review.rating) + "☆".repeat(5 - review.rating) }),
    el("p", { style: "white-space:pre-wrap; margin-top:8px; line-height:1.65;", text: review.content }),
    bar,
  ].filter(Boolean));
}

/* ===== 1:1 문의 (HAE) — 회원: 보내기 · 내 문의와 답변 / 관리자: 받은 문의 · 답변 · 후기 모아 보기 ===== */
const INQ_CATS = ["코인·결제", "오류 신고", "풀이 질문", "제안", "기타"];
const SEEN_KEY = "str.inqseen.v1";
const seenIds = () => { try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]")); } catch { return new Set(); } };
const markSeen = (ids) => { try { const s = seenIds(); ids.forEach((i) => s.add(i)); localStorage.setItem(SEEN_KEY, JSON.stringify([...s].slice(-200))); } catch { /* ignore */ } };
/** 새로 도착한 답변 수 (마이 화면 배지용) */
export async function unreadReplies() {
  if (!isCloudEnabled()) return 0;
  const l = await myInquiries().catch(() => null); if (!l) return 0;
  const s = seenIds(); return l.filter((q) => q.status === "done" && !s.has(q.id + ":" + q.repliedAt)).length;
}
const fmtT = (t) => { const d = new Date(t); return `${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

export function renderInquiry({ navigate }) {
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/profile", "마이")]));
  const admin = isAdmin();
  root.append(pageHeader(admin ? "관리자" : "고객센터", admin ? "문의 · 후기 관리" : "1:1 문의", admin ? "받은 문의에 답하고, 남겨진 후기를 한눈에 봐요." : "궁금한 점·불편한 점을 남겨 주세요. 답변이 오면 여기와 마이 화면에 알려 드려요."));
  const host = el("section", { class: "wrap section-gap" });
  root.append(host);
  if (!isCloudEnabled()) { host.append(noticeBox("info", "지금 버전은 클라우드 연결 전이라 문의를 보낼 수 없어요.")); return root; }
  host.append(el("p", { class: "muted center", text: "불러오는 중…" }));
  getCloudUser().then((u) => {
    clear(host);
    if (!u) {
      host.append(el("div", { class: "panel iq-login" }, [
        el("p", { style: "font-weight:800;", text: "로그인하면 문의를 남길 수 있어요" }),
        el("p", { class: "muted tiny", style: "margin-top:6px;", text: "답변을 내 계정으로 받아야 해서 로그인(게스트도 가능)이 필요해요." }),
        el("button", { class: "btn btn-primary btn-block", style: "margin-top:12px;", onclick: () => navigate("/profile") }, [el("span", { text: "로그인하러 가기" })]),
      ]));
      return;
    }
    if (admin) adminInbox(host); else userInquiry(host, u);
  });
  return root;
}

function userInquiry(host, u) {
  let cat = INQ_CATS[0];
  const chips = el("div", { class: "iq-cats", role: "radiogroup", "aria-label": "문의 종류" });
  const paintCats = () => { clear(chips); INQ_CATS.forEach((c) => chips.append(el("button", { type: "button", role: "radio", "aria-checked": String(c === cat), class: "iq-cat" + (c === cat ? " on" : ""), onclick: () => { cat = c; paintCats(); } }, [el("span", { text: c })]))); };
  paintCats();
  const title = el("input", { class: "input", type: "text", maxlength: "60", placeholder: "제목 (예: 코인이 안 들어왔어요)" });
  const body = el("textarea", { class: "input", rows: "6", maxlength: "2000", placeholder: "자세히 적어 주실수록 빨리 도와드릴 수 있어요. (언제 · 어떤 화면에서 · 무엇이)" });
  const err = el("p", { class: "field-error", "aria-live": "polite" });
  const send = el("button", { class: "btn btn-primary btn-block", type: "button" }, [el("span", { text: "문의 보내기" })]);
  const listHost = el("div", { class: "iq-list" });
  send.addEventListener("click", async () => {
    const t = title.value.trim(), b = body.value.trim();
    if (t.length < 2) { err.textContent = "제목을 2자 이상 적어 주세요."; return; }
    if (b.length < 10) { err.textContent = "내용을 10자 이상 적어 주세요."; return; }
    err.textContent = ""; send.disabled = true;
    let name = ""; try { const pid = localStorage.getItem("str.activeProfile.v1"); const ps = JSON.parse(localStorage.getItem("str.profiles.v1") || "[]"); name = (ps.find((x) => x.id === pid) || {}).name || ""; } catch { /* ignore */ }
    const r = await sendInquiry({ cat, title: t, body: b, name });
    send.disabled = false;
    if (r.error) { err.textContent = r.error === "login" ? "먼저 로그인해 주세요." : r.error; return; }
    title.value = ""; body.value = ""; toast("문의를 보냈어요. 답변이 오면 알려 드릴게요."); loadList();
  });
  host.append(el("div", { class: "panel iq-form" }, [
    el("p", { class: "iq-h", text: "무엇을 도와드릴까요?" }), chips, title, body, err, send,
    el("p", { class: "muted tiny", style: "text-align:center;", text: "보낸 문의는 나와 관리자만 볼 수 있어요." }),
  ]), el("p", { class: "iq-h2", text: "내 문의" }), listHost);
  async function loadList() {
    clear(listHost); listHost.append(el("p", { class: "muted tiny center", text: "불러오는 중…" }));
    const l = await myInquiries();
    clear(listHost);
    if (!l) { listHost.append(noticeBox("info", "문의 목록을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.")); return; }
    if (!l.length) { listHost.append(el("div", { class: "iq-empty" }, [el("p", { text: "아직 보낸 문의가 없어요" })])); return; }
    const before = seenIds();
    l.forEach((q) => listHost.append(inqCard(q, { fresh: q.status === "done" && !before.has(q.id + ":" + q.repliedAt) })));
    markSeen(l.filter((q) => q.status === "done").map((q) => q.id + ":" + q.repliedAt));
  }
  loadList();
}

function inqCard(q, { fresh = false, admin = false, onReply, onDelete } = {}) {
  const done = q.status === "done";
  const kids = [
    el("div", { class: "iq-top" }, [
      el("span", { class: "iq-badge" + (done ? " done" : ""), text: done ? "답변 완료" : "답변 대기" }),
      el("span", { class: "iq-cat-tag", text: q.cat || "기타" }),
      fresh ? el("span", { class: "iq-new", text: "NEW" }) : null,
      el("span", { class: "iq-time", text: fmtT(q.createdAt) }),
    ].filter(Boolean)),
    el("p", { class: "iq-title", text: q.title }),
    admin ? el("p", { class: "iq-who", text: `${q.name || "이름 없음"}${q.anonymous ? " · 게스트" : ""}${q.email ? " · " + q.email : ""}` }) : null,
    el("p", { class: "iq-body", text: q.body }),
  ];
  if (done) kids.push(el("div", { class: "iq-reply" }, [el("p", { class: "iq-reply-h", text: `☾ 해묘의 답변 · ${fmtT(q.repliedAt)}` }), el("p", { text: q.reply })]));
  if (admin) {
    const ta = el("textarea", { class: "input", rows: "3", maxlength: "2000", placeholder: done ? "답변 고치기" : "답변을 적어 주세요" });
    if (done) ta.value = q.reply || "";
    const sendB = el("button", { class: "btn btn-primary btn-sm", type: "button" }, [el("span", { text: done ? "답변 고치기" : "답변 보내기" })]);
    sendB.addEventListener("click", async () => { if (ta.value.trim().length < 2) { toast("답변을 적어 주세요."); return; } sendB.disabled = true; await onReply(q, ta.value.trim()); sendB.disabled = false; });
    const delL = el("span", { text: "삭제" }); const delB = el("button", { class: "btn btn-quiet btn-sm", type: "button" }, [delL]);
    let armed = false; delB.addEventListener("click", () => { if (!armed) { armed = true; delL.textContent = "한 번 더 누르면 삭제"; setTimeout(() => { armed = false; delL.textContent = "삭제"; }, 4000); return; } onDelete(q); });
    kids.push(el("div", { class: "iq-admin" }, [ta, el("div", { class: "btn-row", style: "justify-content:flex-end;" }, [delB, sendB])]));
  }
  return el("article", { class: "panel iq-card" + (done ? " done" : "") + (fresh ? " fresh" : "") }, kids.filter(Boolean));
}

function adminInbox(host) {
  let tab = "wait", data = [], reviews = [];
  const users = {};
  const tabs = el("div", { class: "iq-tabs", role: "tablist" });
  const body = el("div", { class: "iq-list" });
  host.append(tabs, body);
  const paint = () => {
    clear(tabs); clear(body);
    const wait = data.filter((q) => q.status !== "done"), done = data.filter((q) => q.status === "done");
    [["wait", `답변 대기 ${wait.length}`], ["done", `답변 완료 ${done.length}`], ["rev", `후기 ${reviews.length}`]].forEach(([k, t]) =>
      tabs.append(el("button", { type: "button", role: "tab", "aria-selected": String(tab === k), class: "iq-tab" + (tab === k ? " on" : ""), onclick: () => { tab = k; paint(); } }, [el("span", { text: t })])));
    if (tab === "rev") {
      if (!reviews.length) { body.append(el("div", { class: "iq-empty" }, [el("p", { text: "아직 후기가 없어요" })])); return; }
      const avg = (reviews.reduce((a, r) => a + (r.rating || 0), 0) / reviews.length).toFixed(1);
      body.append(el("p", { class: "iq-avg", text: `평균 ★ ${avg} · ${reviews.length}개` }));
      reviews.forEach((r) => {
        const who = users[r.uid];
        const delL = el("span", { text: "후기 삭제" }); const delB = el("button", { class: "btn btn-quiet btn-sm", type: "button" }, [delL]);
        let armed = false;
        delB.addEventListener("click", async () => {
          if (!armed) { armed = true; delL.textContent = "한 번 더 누르면 삭제"; delB.style.color = "var(--c-danger)"; setTimeout(() => { armed = false; delL.textContent = "후기 삭제"; delB.style.color = ""; }, 4000); return; }
          await cloudDeleteReview(r.id); deleteReview(r.id); reviews = reviews.filter((x) => x.id !== r.id); CLOUD_REVIEWS = null; toast("후기를 삭제했어요."); paint();
        });
        body.append(el("article", { class: "panel iq-card" }, [
          el("div", { class: "iq-top" }, [el("span", { class: "iq-stars", text: "★".repeat(r.rating || 0) + "☆".repeat(5 - (r.rating || 0)) }), r.guest ? el("span", { class: "iq-cat-tag", text: "게스트 후기" }) : null, el("span", { class: "iq-time", text: fmtT(r.createdAt) })].filter(Boolean)),
          el("p", { class: "iq-title", text: r.nickname || "익명의 해묘 친구" }),
          el("p", { class: "iq-who", text: who ? `작성자 · ${who.name || "이름 없음"}${who.anonymous ? " (게스트)" : ""}${who.email ? " · " + who.email : ""} — 관리자만 보여요` : (r.uid ? "작성자 · 회원 목록에 없음" : "작성자 · 로그인 전 작성") }),
          el("p", { class: "iq-body", text: r.content }),
          el("div", { class: "btn-row", style: "justify-content:flex-end;" }, [delB]),
        ]));
      });
      return;
    }
    const list = tab === "wait" ? wait : done;
    if (!list.length) { body.append(el("div", { class: "iq-empty" }, [el("p", { text: tab === "wait" ? "답변할 문의가 없어요 ✓" : "아직 답변한 문의가 없어요" })])); return; }
    list.forEach((q) => body.append(inqCard(q, { admin: true,
      onReply: async (qq, txt) => { const r = await adminReplyInquiry(qq.id, txt); if (r.error) { toast(r.error); return; } qq.reply = txt; qq.status = "done"; qq.repliedAt = Date.now(); toast("답변을 보냈어요."); paint(); },
      onDelete: async (qq) => { await deleteInquiry(qq.id); data = data.filter((x) => x.id !== qq.id); toast("문의를 삭제했어요."); paint(); },
    })));
  };
  body.append(el("p", { class: "muted tiny center", text: "불러오는 중…" }));
  Promise.all([adminInquiries(), cloudListReviews(), adminListUsers().catch(() => ({}))]).then(([r, rv, us]) => {
    if (r.error) { clear(body); body.append(noticeBox("warn", r.error)); return; }
    data = r.list || []; reviews = (rv || []).slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    (us && us.users || []).forEach((u) => { users[u.uid] = u; });
    paint();
  });
}


/* 홈 · 후기 화면 위 — 다른 이용자들의 후기를 바로 보이게 (평균 별점 + 옆으로 넘기는 카드) */
export function reviewShowcase(navigate, { title = "이용자 후기" } = {}) {
  const box = el("div", { class: "rvs" });
  const paint = (list) => {
    clear(box);
    const n = list.length, avg = n ? list.reduce((a, r) => a + (r.rating || 0), 0) / n : 0;
    box.append(el("div", { class: "rvs-head" }, [
      el("div", {}, [el("h2", { text: title }), n ? el("p", { class: "rvs-score" }, [el("b", { text: `★ ${avg.toFixed(1)}` }), el("span", { text: ` · 후기 ${n}개` })]) : el("p", { class: "rvs-score", text: "첫 후기를 기다리고 있어요" })]),
      el("button", { type: "button", class: "sh-more", onclick: () => navigate("/reviews") }, [el("span", { text: n ? "전체 ›" : "후기 쓰기 ›" })]),
    ]));
    if (!n) { box.append(el("button", { type: "button", class: "rvs-empty", onclick: () => navigate("/reviews") }, [el("span", { text: "💬 첫 후기를 남기고 코인 10개 받기" })])); return; }
    const pick = [...list].sort((a, b) => (b.rating - a.rating) || (b.createdAt - a.createdAt)).slice(0, 10);
    box.append(el("div", { class: "rvs-row" }, pick.map((r) => el("article", { class: "rvs-card" }, [
      el("p", { class: "rvs-stars", "aria-label": `별점 ${r.rating}점`, text: "★".repeat(r.rating || 0) + "☆".repeat(5 - (r.rating || 0)) }),
      el("p", { class: "rvs-txt", text: r.content }),
      el("p", { class: "rvs-by" }, [el("span", {}, [el("span", { text: r.nickname || "익명의 해묘 친구" }), r.guest ? el("i", { class: "rv-guest", text: "게스트" }) : null].filter(Boolean)), el("small", { text: formatDate(r.createdAt) })]),
    ]))));
  };
  if (isCloudEnabled()) { paint([]); cloudListReviews().then((l) => { if (l) paint(l); }); }
  else paint(getReviews());
  return box;
}
