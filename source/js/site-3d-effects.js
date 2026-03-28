(function () {
  const MODE_KEY = "luxlu_fx_mode";
  const MODES = ["lite", "balanced", "full"];
  const isCoarse = window.matchMedia("(pointer: coarse)").matches;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const deviceMemory = Number(navigator.deviceMemory || 8);
  const cpuCores = Number(navigator.hardwareConcurrency || 8);

  let cursorRafId = null;
  let particleRafId = null;
  let particleCtx = null;
  let particleCanvas = null;
  let particles = [];
  let particleFrame = 0;
  let introPlayed = false;

  const fxMode = resolveFxMode();

  function resolveFxMode() {
    const saved = (localStorage.getItem(MODE_KEY) || "").toLowerCase();
    if (MODES.indexOf(saved) >= 0) return saved;

    if (prefersReduced || isCoarse) return "lite";
    if (cpuCores <= 4 || deviceMemory <= 4) return "lite";
    if (cpuCores <= 6 || deviceMemory <= 8) return "balanced";
    return "balanced";
  }

  function setFxMode(mode, persist) {
    const normalized = MODES.indexOf(mode) >= 0 ? mode : "balanced";
    document.documentElement.setAttribute("data-fx-mode", normalized);
    if (persist) localStorage.setItem(MODE_KEY, normalized);
  }

  function exposeFxHelpers() {
    window.luxluGetFxMode = function () {
      return document.documentElement.getAttribute("data-fx-mode") || fxMode;
    };

    window.luxluSetFxMode = function (mode) {
      const next = String(mode || "").toLowerCase();
      if (MODES.indexOf(next) < 0) {
        return "invalid mode, use: lite | balanced | full";
      }
      localStorage.setItem(MODE_KEY, next);
      window.location.reload();
      return "ok";
    };
  }

  function init() {
    setFxMode(fxMode, false);
    exposeFxHelpers();
    cleanupDeprecatedEffects();
    cleanupByMode(fxMode);
    initScrollProgress3D();
    initCategoryCollabEntry();
    initZipperIntro();
    initReveal3D();
    initHeadingDepth();

    if (fxMode === "lite") return;

    initHeaderParallax();
    initTiltCards(fxMode === "full" ? 24 : 10);
    initParticles(
      fxMode === "full"
        ? { count: 30, drawLinks: true, linkDistance: 120, frameStride: 1 }
        : { count: 16, drawLinks: false, linkDistance: 0, frameStride: 2 }
    );

    initDepthGrid();
    initCubeField(fxMode === "full" ? 8 : 4);
    initShowcaseShapes(fxMode === "full" ? 10 : 4);
    initStarField(fxMode === "full" ? 18 : 8);

    if (fxMode === "full") {
      initCursorGlow();
      initHoloStrips();
      initRibbonWave();
      initDepthFog();
      initCrystalShards(12);
      initOrbitLines();
      initNeonComets(8);
      initMagneticElements();
      initImageDepth();
      initBackgroundGyro();
      initRightsideGyro();
    }
  }

  function cleanupDeprecatedEffects() {
    [
      "fx-laser",
      "fx-glass-portal",
      "fx-prism",
      "fx-heart-field",
      "fx-neon-comets",
      "fx-orbit-lines",
      "fx-crystal-shards"
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  function cleanupByMode(mode) {
    if (mode === "full") return;

    removeFxElements(["fx-holo-strips", "fx-ribbon-wave", "fx-depth-fog", "fx-neon-comets", "fx-orbit-lines", "fx-crystal-shards"]);

    if (mode === "lite") {
      removeFxElements(["fx-particles", "fx-depth-grid", "fx-cube-field", "fx-showcase", "fx-star-field"]);
      removeCursorLayers();
      if (particleRafId) cancelAnimationFrame(particleRafId);
      particleRafId = null;
    }
  }

  function removeFxElements(ids) {
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  function removeCursorLayers() {
    document.querySelectorAll(".fx-cursor, .fx-cursor-dot").forEach((el) => el.remove());
  }

  function initCategoryCollabEntry() {
    const path = (window.location.pathname || "").replace(/\/+$/, "");
    if (path !== "/categories") return;
    if (document.getElementById("categories-collab-entry")) return;

    const page = document.getElementById("page");
    if (!page) return;

    const target =
      page.querySelector(".category-lists") ||
      page.querySelector(".category-list") ||
      page.querySelector(".article-sort") ||
      page.firstElementChild;
    if (!target || !target.parentNode) return;

    const link = document.createElement("a");
    link.id = "categories-collab-entry";
    link.className = "category-collab-entry";
    link.href = "/collab/";
    link.innerHTML =
      "<span class=\"entry-tag\">TEAM</span>" +
      "<strong>协作写作入口</strong>" +
      "<small>访客可看 / 队友新增 / 管理员全改</small>";
    target.parentNode.insertBefore(link, target);
  }

  function initZipperIntro() {
    const pageType = window.GLOBAL_CONFIG_SITE && window.GLOBAL_CONFIG_SITE.pageType;
    const path = window.location.pathname || "/";
    const isHome = pageType === "home" || path === "/" || path === "/index.html";
    if (!isHome) return;

    const ONCE_KEY = "luxlu_zip_intro_once_v2";
    if (sessionStorage.getItem(ONCE_KEY) === "1") return;
    sessionStorage.setItem(ONCE_KEY, "1");

    if (introPlayed) return;
    introPlayed = true;
    if (document.getElementById("zipper-intro")) return;

    const wrap = document.createElement("div");
    wrap.id = "zipper-intro";
    wrap.innerHTML =
      "<div class=\"zip-panel zip-left\"></div>" +
      "<div class=\"zip-panel zip-right\"></div>" +
      "<div class=\"zip-cut\"></div>" +
      "<div class=\"zip-teeth\"></div>" +
      "<div class=\"zip-slider\"><span></span></div>";

    document.body.appendChild(wrap);

    requestAnimationFrame(() => {
      wrap.classList.add("play");
      setTimeout(() => wrap.classList.add("open"), 1180);
      setTimeout(() => wrap.remove(), 2500);
    });
  }

  function initTiltCards(limit) {
    const targets = Array.from(
      document.querySelectorAll("#recent-posts > .recent-post-item, #aside-content .card-widget, #post, #page, #archive")
    ).slice(0, Math.max(1, limit || 1));

    targets.forEach((el) => {
      if (el.dataset.tiltBound === "1") return;
      el.dataset.tiltBound = "1";
      el.classList.add("tilt-3d", "neon-breathe");

      let hoverRafId = null;
      el.addEventListener("mousemove", (e) => {
        if (hoverRafId) cancelAnimationFrame(hoverRafId);
        hoverRafId = requestAnimationFrame(() => {
          const rect = el.getBoundingClientRect();
          const px = (e.clientX - rect.left) / rect.width;
          const py = (e.clientY - rect.top) / rect.height;
          const ry = (px - 0.5) * 5;
          const rx = (0.5 - py) * 5;
          el.style.transform = "perspective(1000px) rotateX(" + rx + "deg) rotateY(" + ry + "deg) translateZ(0)";
        });
      });

      el.addEventListener("mouseleave", () => {
        if (hoverRafId) cancelAnimationFrame(hoverRafId);
        el.style.transform = "";
      });
    });
  }

  function initCursorGlow() {
    if (document.querySelector(".fx-cursor")) return;
    const cursor = document.createElement("div");
    const dot = document.createElement("div");
    cursor.className = "fx-cursor";
    dot.className = "fx-cursor-dot";
    document.body.appendChild(cursor);
    document.body.appendChild(dot);

    if (window.__luxluCursorBound) return;
    window.__luxluCursorBound = true;

    window.addEventListener(
      "mousemove",
      (e) => {
        if (cursorRafId) cancelAnimationFrame(cursorRafId);
        const x = e.clientX;
        const y = e.clientY;
        dot.style.transform = "translate(" + (x - 3) + "px," + (y - 3) + "px)";
        cursorRafId = requestAnimationFrame(() => {
          cursor.style.transform = "translate(" + (x - 108) + "px," + (y - 108) + "px)";
        });
      },
      { passive: true }
    );
  }

  function initHeaderParallax() {
    const pageType = window.GLOBAL_CONFIG_SITE && window.GLOBAL_CONFIG_SITE.pageType;
    if (pageType !== "home") return;
    if (window.__luxluHeaderParallaxBound) return;
    window.__luxluHeaderParallaxBound = true;

    const header = document.getElementById("page-header");
    const siteInfo = document.getElementById("site-info") || document.getElementById("page-site-info");
    if (!header) return;

    let ticking = false;
    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const y = window.scrollY || 0;
          header.style.backgroundPosition = "center " + Math.min(110, y * 0.18) + "px";
          if (siteInfo) {
            const shift = Math.min(20, y * 0.04);
            siteInfo.style.transform = "translate3d(0," + shift + "px,20px)";
          }
          ticking = false;
        });
      },
      { passive: true }
    );
  }

  function initParticles(options) {
    if (document.getElementById("fx-particles")) return;
    particleCanvas = document.createElement("canvas");
    particleCanvas.id = "fx-particles";
    document.body.appendChild(particleCanvas);
    particleCtx = particleCanvas.getContext("2d");

    const count = Math.max(8, Number(options.count || 16));
    const drawLinks = Boolean(options.drawLinks);
    const linkDistance = Number(options.linkDistance || 0);
    const frameStride = Math.max(1, Number(options.frameStride || 1));

    const resize = () => {
      particleCanvas.width = window.innerWidth;
      particleCanvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });

    particles = Array.from({ length: count }, () => ({
      x: Math.random() * particleCanvas.width,
      y: Math.random() * particleCanvas.height,
      z: 0.3 + Math.random() * 0.9,
      r: 0.9 + Math.random() * 1.6,
      vx: -0.18 + Math.random() * 0.36,
      vy: -0.16 + Math.random() * 0.32
    }));

    const loop = () => {
      particleFrame += 1;
      if (frameStride > 1 && particleFrame % frameStride !== 0) {
        particleRafId = requestAnimationFrame(loop);
        return;
      }

      particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx * p.z;
        p.y += p.vy * p.z;

        if (p.x < -16) p.x = particleCanvas.width + 16;
        if (p.x > particleCanvas.width + 16) p.x = -16;
        if (p.y < -16) p.y = particleCanvas.height + 16;
        if (p.y > particleCanvas.height + 16) p.y = -16;

        if (drawLinks && linkDistance > 0) {
          for (let j = i + 1; j < particles.length; j++) {
            const q = particles[j];
            const dx = p.x - q.x;
            const dy = p.y - q.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < linkDistance) {
              const alpha = (1 - dist / linkDistance) * 0.045;
              particleCtx.beginPath();
              particleCtx.strokeStyle = "rgba(255,126,195," + alpha + ")";
              particleCtx.lineWidth = 1;
              particleCtx.moveTo(p.x, p.y);
              particleCtx.lineTo(q.x, q.y);
              particleCtx.stroke();
            }
          }
        }

        const alpha = 0.1 + p.z * 0.12;
        particleCtx.beginPath();
        particleCtx.fillStyle = "rgba(255,120,196," + alpha + ")";
        particleCtx.arc(p.x, p.y, p.r * p.z, 0, Math.PI * 2);
        particleCtx.fill();
      }

      particleRafId = requestAnimationFrame(loop);
    };

    const onVisibility = () => {
      if (document.hidden && particleRafId) {
        cancelAnimationFrame(particleRafId);
        particleRafId = null;
        return;
      }
      if (!document.hidden && !particleRafId) {
        particleRafId = requestAnimationFrame(loop);
      }
    };

    if (!window.__luxluParticleVisibilityBound) {
      window.__luxluParticleVisibilityBound = true;
      document.addEventListener("visibilitychange", onVisibility);
    }

    particleRafId = requestAnimationFrame(loop);
  }

  function initDepthGrid() {
    if (document.getElementById("fx-depth-grid")) return;
    const grid = document.createElement("div");
    grid.id = "fx-depth-grid";
    grid.innerHTML = "<span></span>";
    document.body.appendChild(grid);
  }

  function initCubeField(cubeCount) {
    if (document.getElementById("fx-cube-field")) return;
    const field = document.createElement("div");
    field.id = "fx-cube-field";
    let html = "";
    const total = Math.max(1, Math.min(8, Number(cubeCount || 4)));
    for (let i = 1; i <= total; i++) {
      html +=
        "<div class=\"cube-wrap cube-wrap-" +
        i +
        "\">" +
        "<div class=\"cube\">" +
        "<span class=\"face f1\"></span>" +
        "<span class=\"face f2\"></span>" +
        "<span class=\"face f3\"></span>" +
        "<span class=\"face f4\"></span>" +
        "<span class=\"face f5\"></span>" +
        "<span class=\"face f6\"></span>" +
        "</div></div>";
    }
    field.innerHTML = html;
    document.body.appendChild(field);
  }

  function initShowcaseShapes(shapeCount) {
    if (document.getElementById("fx-showcase")) return;
    const wrap = document.createElement("div");
    wrap.id = "fx-showcase";
    let html = "";
    const total = Math.max(1, Math.min(10, Number(shapeCount || 4)));
    for (let i = 1; i <= total; i++) {
      const type = i % 2 === 0 ? "circle" : "square";
      html += "<span class=\"shape " + type + " shape-" + i + "\"></span>";
    }
    wrap.innerHTML = html;
    document.body.appendChild(wrap);
  }

  function initHoloStrips() {
    if (document.getElementById("fx-holo-strips")) return;
    const layer = document.createElement("div");
    layer.id = "fx-holo-strips";
    let html = "";
    for (let i = 1; i <= 6; i++) html += "<span class=\"strip strip-" + i + "\"></span>";
    layer.innerHTML = html;
    document.body.appendChild(layer);
  }

  function initRibbonWave() {
    if (document.getElementById("fx-ribbon-wave")) return;
    const ribbon = document.createElement("div");
    ribbon.id = "fx-ribbon-wave";
    ribbon.innerHTML = "<span class=\"ribbon r1\"></span><span class=\"ribbon r2\"></span><span class=\"ribbon r3\"></span>";
    document.body.appendChild(ribbon);
  }

  function initDepthFog() {
    if (document.getElementById("fx-depth-fog")) return;
    const fog = document.createElement("div");
    fog.id = "fx-depth-fog";
    let html = "";
    for (let i = 1; i <= 5; i++) html += "<span class=\"fog fog-" + i + "\"></span>";
    fog.innerHTML = html;
    document.body.appendChild(fog);
  }

  function initStarField(starCount) {
    if (document.getElementById("fx-star-field")) return;
    const layer = document.createElement("div");
    layer.id = "fx-star-field";
    const total = Math.max(4, Number(starCount || 8));

    for (let i = 0; i < total; i++) {
      const star = document.createElement("span");
      star.style.left = Math.random() * 100 + "%";
      star.style.top = Math.random() * 100 + "%";
      star.style.animationDelay = Math.random() * 5 + "s";
      star.style.animationDuration = 4 + Math.random() * 5 + "s";
      layer.appendChild(star);
    }

    document.body.appendChild(layer);
  }

  function initCrystalShards(shardCount) {
    if (document.getElementById("fx-crystal-shards")) return;
    const layer = document.createElement("div");
    layer.id = "fx-crystal-shards";
    const total = Math.max(6, Number(shardCount || 10));

    for (let i = 0; i < total; i++) {
      const shard = document.createElement("span");
      shard.className = "shard shard-" + ((i % 6) + 1);
      shard.style.left = Math.random() * 100 + "%";
      shard.style.top = Math.random() * 100 + "%";
      shard.style.animationDelay = Math.random() * 6 + "s";
      shard.style.animationDuration = 9 + Math.random() * 7 + "s";
      shard.style.setProperty("--depth-z", (12 + Math.random() * 44).toFixed(2) + "px");
      layer.appendChild(shard);
    }

    document.body.appendChild(layer);
  }

  function initOrbitLines() {
    if (document.getElementById("fx-orbit-lines")) return;
    const layer = document.createElement("div");
    layer.id = "fx-orbit-lines";
    layer.innerHTML = "<span class=\"orbit o1\"></span><span class=\"orbit o2\"></span><span class=\"orbit o3\"></span>";
    document.body.appendChild(layer);
  }

  function initNeonComets(cometCount) {
    if (document.getElementById("fx-neon-comets")) return;
    const layer = document.createElement("div");
    layer.id = "fx-neon-comets";
    const total = Math.max(4, Number(cometCount || 8));

    for (let i = 0; i < total; i++) {
      const comet = document.createElement("span");
      comet.className = "comet";
      comet.style.top = 6 + Math.random() * 88 + "%";
      comet.style.left = -20 - Math.random() * 10 + "%";
      comet.style.animationDelay = Math.random() * 9 + "s";
      comet.style.animationDuration = 8 + Math.random() * 6 + "s";
      layer.appendChild(comet);
    }

    document.body.appendChild(layer);
  }

  function initMagneticElements() {
    const targets = document.querySelectorAll("#nav .site-page, .cal-btn, .month-btn, #rightside button, #card-info-btn");
    targets.forEach((el) => {
      if (el.dataset.magneticBound === "1") return;
      el.dataset.magneticBound = "1";
      el.classList.add("magnetic");

      let moveRafId = null;
      el.addEventListener("mousemove", (e) => {
        if (moveRafId) cancelAnimationFrame(moveRafId);
        moveRafId = requestAnimationFrame(() => {
          const rect = el.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width - 0.5) * 8;
          const y = ((e.clientY - rect.top) / rect.height - 0.5) * 6;
          el.style.transform = "translate(" + x + "px," + y + "px) translateZ(4px)";
        });
      });

      el.addEventListener("mouseleave", () => {
        if (moveRafId) cancelAnimationFrame(moveRafId);
        el.style.transform = "";
      });
    });
  }

  function initImageDepth() {
    const imgs = document.querySelectorAll("#recent-posts img, #post img, #page img");
    imgs.forEach((img) => {
      if (img.dataset.depthBound === "1") return;
      img.dataset.depthBound = "1";
      img.classList.add("img-3d");

      let imgRafId = null;
      img.addEventListener("mousemove", (e) => {
        if (imgRafId) cancelAnimationFrame(imgRafId);
        imgRafId = requestAnimationFrame(() => {
          const rect = img.getBoundingClientRect();
          const px = (e.clientX - rect.left) / rect.width;
          const py = (e.clientY - rect.top) / rect.height;
          const ry = (px - 0.5) * 6;
          const rx = (0.5 - py) * 6;
          img.style.transform = "perspective(900px) rotateX(" + rx + "deg) rotateY(" + ry + "deg) scale3d(1.01,1.01,1.01)";
        });
      });

      img.addEventListener("mouseleave", () => {
        if (imgRafId) cancelAnimationFrame(imgRafId);
        img.style.transform = "";
      });
    });
  }

  function initReveal3D() {
    const targets = document.querySelectorAll(
      "#recent-posts > .recent-post-item, #aside-content .card-widget, .article-sort-item, #post, #page, #archive"
    );
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("in-view");
        });
      },
      { threshold: 0.15 }
    );

    targets.forEach((el) => {
      if (el.dataset.revealBound === "1") return;
      el.dataset.revealBound = "1";
      el.classList.add("reveal-3d");
      observer.observe(el);
    });
  }

  function initHeadingDepth() {
    const heads = document.querySelectorAll("#post h1, #post h2, #page h1, #page h2");
    heads.forEach((h) => {
      if (h.dataset.heading3d === "1") return;
      h.dataset.heading3d = "1";
      h.classList.add("heading-3d");
    });
  }

  function initBackgroundGyro() {
    const bg = document.getElementById("web_bg");
    if (!bg || window.__luxluGyroBgBound) return;
    window.__luxluGyroBgBound = true;
    let ticking = false;

    window.addEventListener(
      "mousemove",
      (e) => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const x = (e.clientX / window.innerWidth - 0.5) * 10;
          const y = (e.clientY / window.innerHeight - 0.5) * 10;
          bg.style.transform = "translate3d(" + x + "px," + y + "px,0) scale(1.01)";
          ticking = false;
        });
      },
      { passive: true }
    );
  }

  function initRightsideGyro() {
    const panel = document.getElementById("rightside");
    if (!panel || panel.dataset.gyroBound === "1") return;
    panel.dataset.gyroBound = "1";

    let panelRafId = null;
    panel.addEventListener("mousemove", (e) => {
      if (panelRafId) cancelAnimationFrame(panelRafId);
      panelRafId = requestAnimationFrame(() => {
        const rect = panel.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        panel.style.transform = "perspective(800px) rotateX(" + -py * 6 + "deg) rotateY(" + px * 6 + "deg)";
      });
    });

    panel.addEventListener("mouseleave", () => {
      if (panelRafId) cancelAnimationFrame(panelRafId);
      panel.style.transform = "";
    });
  }

  function initScrollProgress3D() {
    if (document.getElementById("fx-progress")) return;
    const bar = document.createElement("div");
    bar.id = "fx-progress";
    bar.innerHTML = "<span></span>";
    document.body.appendChild(bar);
    const inner = bar.querySelector("span");

    const update = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const p = h > 0 ? (window.scrollY / h) * 100 : 0;
      inner.style.width = p.toFixed(2) + "%";
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
  }

  document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("pjax:complete", init);
})();

