(function () {
  const isCoarse = window.matchMedia("(pointer: coarse)").matches;
  let rafId = null;
  let particleCtx = null;
  let particleCanvas = null;
  let particles = [];

  function init() {
    if (!isCoarse) {
      initTiltCards();
      initCursorGlow();
      initHeaderParallax();
      initParticles();
    }
  }

  function initTiltCards() {
    const targets = document.querySelectorAll(
      "#recent-posts > .recent-post-item, #aside-content .card-widget, #post, #page, #archive"
    );

    targets.forEach((el) => {
      if (el.dataset.tiltBound === "1") return;
      el.dataset.tiltBound = "1";
      el.classList.add("tilt-3d");

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
      header.style.backgroundPosition = "center " + Math.min(120, y * 0.2) + "px";
      if (siteInfo) {
        const shift = Math.min(24, y * 0.06);
        siteInfo.style.transform = "translate3d(0," + shift + "px,0)";
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
      z: 0.25 + Math.random() * 1.2,
      r: 1 + Math.random() * 2.2,
      vx: -0.3 + Math.random() * 0.6,
      vy: -0.25 + Math.random() * 0.5
    }));

    const loop = () => {
      particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
      particles.forEach((p) => {
        p.x += p.vx * p.z;
        p.y += p.vy * p.z;

        if (p.x < -20) p.x = particleCanvas.width + 20;
        if (p.x > particleCanvas.width + 20) p.x = -20;
        if (p.y < -20) p.y = particleCanvas.height + 20;
        if (p.y > particleCanvas.height + 20) p.y = -20;

        const alpha = 0.18 + p.z * 0.2;
        particleCtx.beginPath();
        particleCtx.fillStyle = "rgba(255,120,196," + alpha + ")";
        particleCtx.arc(p.x, p.y, p.r * p.z, 0, Math.PI * 2);
        particleCtx.fill();
      });
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("pjax:complete", init);
})();
