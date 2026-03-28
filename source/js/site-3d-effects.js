(function () {
  const isCoarse = window.matchMedia("(pointer: coarse)").matches;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let rafId = null;
  let particleCtx = null;
  let particleCanvas = null;
  let particles = [];
  let introPlayed = false;

  function init() {
    initScrollProgress3D();
    initCategoryCollabEntry();
    initZipperIntro();

    if (isCoarse || prefersReduced) return;

    initTiltCards();
    initCursorGlow();
    initHeaderParallax();
    initParticles();

    // 3D packs
    initGlassPortal();
    initDepthGrid();
    initHeartField();
    initShowcaseShapes();
    initLaserSweep();
    initHoloStrips();
    initRibbonWave();
    initDepthFog();
    initStarField();

    initMagneticElements();
    initImageDepth();
    initReveal3D();
    initHeadingDepth();
    initBackgroundGyro();
    initRightsideGyro();
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
      setTimeout(() => {
        wrap.remove();
      }, 2500);
    });
  }

  function initTiltCards() {
    const targets = document.querySelectorAll(
      "#recent-posts > .recent-post-item, #aside-content .card-widget, #post, #page, #archive"
    );

    targets.forEach((el) => {
      if (el.dataset.tiltBound === "1") return;
      el.dataset.tiltBound = "1";
      el.classList.add("tilt-3d", "neon-breathe");

      el.addEventListener("mousemove", (e) => {
        const rect = el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        const ry = (px - 0.5) * 7;
        const rx = (0.5 - py) * 7;
        el.style.transform =
          "perspective(1000px) rotateX(" + rx + "deg) rotateY(" + ry + "deg) translateZ(0)";
      });

      el.addEventListener("mouseleave", () => {
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

    window.addEventListener("mousemove", (e) => {
      if (rafId) cancelAnimationFrame(rafId);
      const x = e.clientX;
      const y = e.clientY;
      dot.style.transform = "translate(" + (x - 3) + "px," + (y - 3) + "px)";
      rafId = requestAnimationFrame(() => {
        cursor.style.transform = "translate(" + (x - 108) + "px," + (y - 108) + "px)";
      });
    });
  }

  function initHeaderParallax() {
    const pageType = window.GLOBAL_CONFIG_SITE && window.GLOBAL_CONFIG_SITE.pageType;
    if (pageType !== "home") return;

    const header = document.getElementById("page-header");
    if (!header || header.dataset.parallaxBound === "1") return;
    header.dataset.parallaxBound = "1";
    const siteInfo = document.getElementById("site-info") || document.getElementById("page-site-info");

    window.addEventListener("scroll", () => {
      const y = window.scrollY || 0;
      header.style.backgroundPosition = "center " + Math.min(120, y * 0.2) + "px";
      if (siteInfo) {
        const shift = Math.min(24, y * 0.05);
        siteInfo.style.transform = "translate3d(0," + shift + "px,20px)";
      }
    });
  }

  function initParticles() {
    if (document.getElementById("fx-particles")) return;
    particleCanvas = document.createElement("canvas");
    particleCanvas.id = "fx-particles";
    document.body.appendChild(particleCanvas);
    particleCtx = particleCanvas.getContext("2d");

    const count = 36;
    const resize = () => {
      particleCanvas.width = window.innerWidth;
      particleCanvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    particles = Array.from({ length: count }, () => ({
      x: Math.random() * particleCanvas.width,
      y: Math.random() * particleCanvas.height,
      z: 0.25 + Math.random() * 1.1,
      r: 0.9 + Math.random() * 2,
      vx: -0.24 + Math.random() * 0.48,
      vy: -0.2 + Math.random() * 0.4
    }));

    const loop = () => {
      particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx * p.z;
        p.y += p.vy * p.z;

        if (p.x < -20) p.x = particleCanvas.width + 20;
        if (p.x > particleCanvas.width + 20) p.x = -20;
        if (p.y < -20) p.y = particleCanvas.height + 20;
        if (p.y > particleCanvas.height + 20) p.y = -20;

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            const a = (1 - dist / 130) * 0.055;
            particleCtx.beginPath();
            particleCtx.strokeStyle = "rgba(255,126,195," + a + ")";
            particleCtx.lineWidth = 1;
            particleCtx.moveTo(p.x, p.y);
            particleCtx.lineTo(q.x, q.y);
            particleCtx.stroke();
          }
        }

        const alpha = 0.12 + p.z * 0.14;
        particleCtx.beginPath();
        particleCtx.fillStyle = "rgba(255,120,196," + alpha + ")";
        particleCtx.arc(p.x, p.y, p.r * p.z, 0, Math.PI * 2);
        particleCtx.fill();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  function initGlassPortal() {
    if (document.getElementById("fx-glass-portal")) return;
    const portal = document.createElement("div");
    portal.id = "fx-glass-portal";
    portal.innerHTML =
      "<span class=\"glass-frame gf-a\"></span>" +
      "<span class=\"glass-frame gf-b\"></span>" +
      "<span class=\"glass-frame gf-c\"></span>";
    document.body.appendChild(portal);
  }

  function initDepthGrid() {
    if (document.getElementById("fx-depth-grid")) return;
    const grid = document.createElement("div");
    grid.id = "fx-depth-grid";
    grid.innerHTML = "<span></span>";
    document.body.appendChild(grid);
  }

  function initHeartField() {
    if (document.getElementById("fx-heart-field")) return;
    const field = document.createElement("div");
    field.id = "fx-heart-field";
    let html = "";
    for (let i = 1; i <= 8; i++) {
      html +=
        "<div class=\"heart-wrap heart-wrap-" +
        i +
        "\">" +
        "<div class=\"heart-shape\">" +
        "<span class=\"heart-square\"></span>" +
        "<span class=\"heart-circle left\"></span>" +
        "<span class=\"heart-circle right\"></span>" +
        "</div></div>";
    }
    field.innerHTML = html;
    document.body.appendChild(field);
  }

  function initShowcaseShapes() {
    if (document.getElementById("fx-showcase")) return;
    const wrap = document.createElement("div");
    wrap.id = "fx-showcase";
    let html = "";
    for (let i = 1; i <= 12; i++) {
      const type = i % 2 === 0 ? "circle" : "square";
      html += "<span class=\"shape " + type + " shape-" + i + "\"></span>";
    }
    wrap.innerHTML = html;
    document.body.appendChild(wrap);
  }

  function initLaserSweep() {
    if (document.getElementById("fx-laser")) return;
    const laser = document.createElement("div");
    laser.id = "fx-laser";
    laser.innerHTML = "<span class=\"line-a\"></span><span class=\"line-b\"></span>";
    document.body.appendChild(laser);
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

  function initStarField() {
    if (document.getElementById("fx-star-field")) return;
    const layer = document.createElement("div");
    layer.id = "fx-star-field";

    for (let i = 0; i < 30; i++) {
      const star = document.createElement("span");
      star.style.left = Math.random() * 100 + "%";
      star.style.top = Math.random() * 100 + "%";
      star.style.animationDelay = Math.random() * 5 + "s";
      star.style.animationDuration = 4 + Math.random() * 5 + "s";
      layer.appendChild(star);
    }

    document.body.appendChild(layer);
  }

  function initMagneticElements() {
    const targets = document.querySelectorAll(
      "#nav .site-page, .cal-btn, .month-btn, #rightside button, #card-info-btn"
    );
    targets.forEach((el) => {
      if (el.dataset.magneticBound === "1") return;
      el.dataset.magneticBound = "1";
      el.classList.add("magnetic");

      el.addEventListener("mousemove", (e) => {
        const rect = el.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 10;
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * 8;
        el.style.transform = "translate(" + x + "px," + y + "px) translateZ(6px)";
      });

      el.addEventListener("mouseleave", () => {
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

      img.addEventListener("mousemove", (e) => {
        const rect = img.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        const ry = (px - 0.5) * 7;
        const rx = (0.5 - py) * 7;
        img.style.transform =
          "perspective(900px) rotateX(" + rx + "deg) rotateY(" + ry + "deg) scale3d(1.02,1.02,1.02)";
      });
      img.addEventListener("mouseleave", () => {
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
      { threshold: 0.12 }
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
    if (!bg || bg.dataset.gyroBound === "1") return;
    bg.dataset.gyroBound = "1";
    let ticking = false;

    window.addEventListener("mousemove", (e) => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * 14;
        const y = (e.clientY / window.innerHeight - 0.5) * 14;
        bg.style.transform = "translate3d(" + x + "px," + y + "px,0) scale(1.02)";
        ticking = false;
      });
    });
  }

  function initRightsideGyro() {
    const panel = document.getElementById("rightside");
    if (!panel || panel.dataset.gyroBound === "1") return;
    panel.dataset.gyroBound = "1";
    panel.addEventListener("mousemove", (e) => {
      const rect = panel.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      panel.style.transform =
        "perspective(800px) rotateX(" + (-py * 8) + "deg) rotateY(" + (px * 8) + "deg)";
    });
    panel.addEventListener("mouseleave", () => {
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
    window.addEventListener("resize", update);
  }

  document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("pjax:complete", init);
})();
