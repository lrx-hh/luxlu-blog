(function () {
  const isCoarse = window.matchMedia("(pointer: coarse)").matches;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let rafId = null;
  let particleCtx = null;
  let particleCanvas = null;
  let particles = [];

  function init() {
    initScrollProgress3D();
    if (isCoarse || prefersReduced) return;

    initTiltCards();
    initCursorGlow();
    initHeaderParallax();
    initParticles();
    initPrismRings();
    initShowcaseShapes();
    initLaserSweep();
    initMagneticElements();
    initImageDepth();
    initReveal3D();
    initBackgroundGyro();
    initRightsideGyro();
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
        cursor.style.transform = "translate(" + (x - 110) + "px," + (y - 110) + "px)";
      });
    });
  }

  function initHeaderParallax() {
    const header = document.getElementById("page-header");
    if (!header || header.dataset.parallaxBound === "1") return;
    header.dataset.parallaxBound = "1";
    const siteInfo = document.getElementById("site-info") || document.getElementById("page-site-info");

    window.addEventListener("scroll", () => {
      const y = window.scrollY || 0;
      header.style.backgroundPosition = "center " + Math.min(120, y * 0.22) + "px";
      if (siteInfo) {
        const shift = Math.min(24, y * 0.06);
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

    const count = 44;
    const resize = () => {
      particleCanvas.width = window.innerWidth;
      particleCanvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    particles = Array.from({ length: count }, () => ({
      x: Math.random() * particleCanvas.width,
      y: Math.random() * particleCanvas.height,
      z: 0.25 + Math.random() * 1.2,
      r: 1 + Math.random() * 2.2,
      vx: -0.3 + Math.random() * 0.6,
      vy: -0.25 + Math.random() * 0.5
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
          if (dist < 120) {
            const a = (1 - dist / 120) * 0.08;
            particleCtx.beginPath();
            particleCtx.strokeStyle = "rgba(255,126,195," + a + ")";
            particleCtx.lineWidth = 1;
            particleCtx.moveTo(p.x, p.y);
            particleCtx.lineTo(q.x, q.y);
            particleCtx.stroke();
          }
        }

        const alpha = 0.18 + p.z * 0.2;
        particleCtx.beginPath();
        particleCtx.fillStyle = "rgba(255,120,196," + alpha + ")";
        particleCtx.arc(p.x, p.y, p.r * p.z, 0, Math.PI * 2);
        particleCtx.fill();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  function initPrismRings() {
    if (document.getElementById("fx-prism")) return;
    const prism = document.createElement("div");
    prism.id = "fx-prism";
    prism.innerHTML =
      "<span class=\"prism-ring ring-a\"></span>" +
      "<span class=\"prism-ring ring-b\"></span>" +
      "<span class=\"prism-ring ring-c\"></span>";
    document.body.appendChild(prism);
  }

  function initShowcaseShapes() {
    if (document.getElementById("fx-showcase")) return;
    const wrap = document.createElement("div");
    wrap.id = "fx-showcase";
    let html = "";
    for (let i = 1; i <= 10; i++) {
      html += "<span class=\"shape shape-" + i + "\"></span>";
    }
    wrap.innerHTML = html;
    document.body.appendChild(wrap);
  }

  function initLaserSweep() {
    if (document.getElementById("fx-laser")) return;
    const laser = document.createElement("div");
    laser.id = "fx-laser";
    laser.innerHTML = "<span></span>";
    document.body.appendChild(laser);
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
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12;
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * 10;
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
        const ry = (px - 0.5) * 8;
        const rx = (0.5 - py) * 8;
        img.style.transform =
          "perspective(900px) rotateX(" + rx + "deg) rotateY(" + ry + "deg) scale3d(1.03,1.03,1.03)";
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
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
          }
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

  function initBackgroundGyro() {
    const bg = document.getElementById("web_bg");
    if (!bg || bg.dataset.gyroBound === "1") return;
    bg.dataset.gyroBound = "1";
    let ticking = false;

    window.addEventListener("mousemove", (e) => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * 18;
        const y = (e.clientY / window.innerHeight - 0.5) * 18;
        bg.style.transform = "translate3d(" + x + "px," + y + "px,0) scale(1.03)";
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
        "perspective(800px) rotateX(" + (-py * 10) + "deg) rotateY(" + (px * 10) + "deg)";
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
