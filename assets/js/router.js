/* 해시 기반 라우터.
   GitHub Pages 정적 배포에서 새로고침 404가 나지 않도록 해시 라우팅을 사용한다.
   경로 예: #/, #/saju, #/saju/result, #/tarot, #/result/:id */

const routes = [];
let notFoundHandler = null;
let currentCleanup = null;

export function route(pattern, handler) {
  // pattern: "/saju/result" 또는 "/result/:id"
  const keys = [];
  const rx = new RegExp(
    "^" +
      pattern
        .replace(/\/+$/, "")
        .replace(/:[^/]+/g, (m) => {
          keys.push(m.slice(1));
          return "([^/]+)";
        })
        .replace(/\//g, "\\/") +
      "\\/?$"
  );
  routes.push({ rx, keys, handler });
}

export function setNotFound(handler) {
  notFoundHandler = handler;
}

export function navigate(path) {
  if (("#" + path) === location.hash) {
    // 동일 경로면 강제 재렌더
    handleRoute();
  } else {
    location.hash = path;
  }
}

function parseHash() {
  let h = location.hash.replace(/^#/, "");
  if (!h) h = "/";
  const [pathPart, queryPart] = h.split("?");
  const path = pathPart.replace(/\/+$/, "") || "/";
  const query = {};
  if (queryPart) {
    new URLSearchParams(queryPart).forEach((v, k) => (query[k] = v));
  }
  return { path, query };
}

async function handleRoute() {
  const { path, query } = parseHash();

  // 이전 페이지 정리 훅
  if (typeof currentCleanup === "function") {
    try { currentCleanup(); } catch { /* ignore */ }
    currentCleanup = null;
  }

  for (const r of routes) {
    const m = r.rx.exec(path);
    if (m) {
      const params = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      window.scrollTo(0, 0);
      const cleanup = await r.handler({ params, query, path });
      if (typeof cleanup === "function") currentCleanup = cleanup;
      return;
    }
  }

  if (notFoundHandler) {
    window.scrollTo(0, 0);
    notFoundHandler({ path });
  }
}

export function startRouter() {
  window.addEventListener("hashchange", handleRoute);
  handleRoute();
}

export function currentPath() {
  return parseHash().path;
}
