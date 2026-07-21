(function () {
  /* ── 简洁模式：只保留进度条 + 入场渐显，去掉所有重型 3D ── */

  var MODE_KEY = "luxlu_fx_mode";

  function resolveFxMode() {
    var saved = (localStorage.getItem(MODE_KEY) || "").toLowerCase();
    if (saved === "lite" || saved === "balanced" || saved === "full") return saved;
    return "lite";   // 默认最轻量
  }

  function setFxMode(mode) {
    var m = mode;
    if (m !== "lite" && m !== "balanced" && m !== "full") m = "lite";
    document.documentElement.setAttribute("data-fx-mode", m);
  }

  /* 暴露给控制台调试 */
  window.luxluGetFxMode = function () {
    return document.documentElement.getAttribute("data-fx-mode") || "lite";
  };
  window.luxluSetFxMode = function (mode) {
    var m = String(mode || "").toLowerCase();
    if (m !== "lite" && m !== "balanced" && m !== "full") return "invalid mode, use: lite | balanced | full";
    localStorage.setItem(MODE_KEY, m);
    window.location.reload();
    return "ok";
  };

  /* 进度条 */
  function initScrollProgress() {
    if (document.getElementById("fx-progress")) return;
    var bar = document.createElement("div");
    bar.id = "fx-progress";
    bar.innerHTML = "<span></span>";
    document.body.appendChild(bar);
    var inner = bar.querySelector("span");

    function update() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? (window.scrollY / h) * 100 : 0;
      inner.style.width = p.toFixed(2) + "%";
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
  }

  /* 清理旧特效残留 */
  function cleanupAll() {
    var ids = [
      "fx-particles", "fx-depth-grid", "fx-cube-field", "fx-showcase",
      "fx-star-field", "fx-holo-strips", "fx-ribbon-wave", "fx-depth-fog",
      "fx-crystal-shards", "fx-orbit-lines", "fx-neon-comets",
      "fx-blender-dock", "zipper-intro", "fx-laser", "fx-glass-portal",
      "fx-prism", "fx-heart-field"
    ];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.remove();
    });

    /* 光标层 */
    var cursors = document.querySelectorAll(".fx-cursor, .fx-cursor-dot");
    for (var i = 0; i < cursors.length; i++) cursors[i].remove();

    /* 清除 tilt / reveal 残留 class */
    var tilted = document.querySelectorAll(".tilt-3d, .tilt-3d-frame, .img-3d, .magnetic");
    for (var t = 0; t < tilted.length; t++) {
      tilted[t].classList.remove("tilt-3d", "tilt-3d-frame", "img-3d", "magnetic");
      tilted[t].style.transform = "";
    }
  }

  /* 入场渐显（轻量） */
  function initReveal() {
    var targets = document.querySelectorAll(
      "#recent-posts > .recent-post-item, #aside-content .card-widget, .article-sort-item"
    );
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) entry.target.classList.add("in-view");
        });
      },
      { threshold: 0.12 }
    );
    targets.forEach(function (el) {
      if (el.dataset.revealBound === "1") return;
      el.dataset.revealBound = "1";
      el.classList.add("reveal-3d");
      observer.observe(el);
    });
  }

  function init() {
    var mode = resolveFxMode();
    setFxMode(mode);
    cleanupAll();
    initScrollProgress();
    initReveal();
  }

  document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("pjax:complete", init);
})();
