(function () {
  const SITE_NAME = "luxlu";
  const ROUTE_TITLES = {
    "/": "首页",
    "/calendar/": "日历",
    "/diary/": "日记",
    "/archives/": "归档",
    "/tools/": "工具箱",
    "/music/": "音乐",
    "/roadmap/": "还没想好欸",
    "/categories/": "分类",
    "/tags/": "标签",
    "/about/": "关于",
    "/intro/": "介绍页",
    "/collab/": "协作项目"
  };

  function normPath(pathname) {
    const p = (pathname || "/").replace(/index\.html$/i, "");
    if (p === "") return "/";
    return p.endsWith("/") ? p : p + "/";
  }

  function guessFromPage() {
    const postTitle = document.querySelector("#post-info .post-title");
    if (postTitle && postTitle.textContent.trim()) return postTitle.textContent.trim();

    const pageTitle = document.querySelector("#page-site-info #site-title");
    if (pageTitle && pageTitle.textContent.trim()) return pageTitle.textContent.trim();

    const first = String(document.title || "").split("|")[0].trim();
    return first || "页面";
  }

  function applyTabTitle() {
    const route = normPath(window.location.pathname);
    const base = ROUTE_TITLES[route] || guessFromPage();
    document.title = base + " | " + SITE_NAME;
  }

  document.addEventListener("DOMContentLoaded", applyTabTitle);
  document.addEventListener("pjax:complete", applyTabTitle);
})();
