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
    if (MODES.indexOf(saved) >= 0) {
      // Anti-flicker safety: old "full" profile can feel strobing on some screens.
      if (saved === "full") return "balanced";
      return saved;
    }

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
    cleanupLegacyHeroOnMobile();
    stabilizeContentFrames();
    cleanupByMode(fxMode);
    initScrollProgress3D();
    initCategoryCollabEntry();
    initZipperIntro();
    initReveal3D();
    initHeadingDepth();
    initBlenderDock(fxMode);

    if (fxMode === "lite") return;

    initHeaderParallax();
    initTiltCards(fxMode === "full" ? 24 : 10);
    initCodeBlockTilt(fxMode === "full" ? 32 : 20);
    initParticles(
      fxMode === "full"
        ? { count: 24, drawLinks: true, linkDistance: 110, frameStride: 1 }
        : { count: 10, drawLinks: false, linkDistance: 0, frameStride: 3 }
    );

    if (fxMode === "full") {
      initDepthGrid();
      initCubeField(6);
      initShowcaseShapes(8);
      initStarField(14);
    } else {
      initCubeField(3);
    }

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

  function cleanupLegacyHeroOnMobile() {
    const hero = document.getElementById("luxlu-signature-hero");
    if (!hero) return;
    if (window.matchMedia("(max-width: 900px), (pointer: coarse)").matches) {
      hero.remove();
    }
  }

  function cleanupByMode(mode) {
    if (mode === "full") return;

    removeFxElements(["fx-holo-strips", "fx-ribbon-wave", "fx-depth-fog", "fx-neon-comets", "fx-orbit-lines", "fx-crystal-shards"]);

    if (mode === "lite") {
      removeFxElements(["fx-particles", "fx-depth-grid", "fx-cube-field", "fx-showcase", "fx-star-field"]);
      removeCursorLayers();
      destroyBlenderDock();
      if (particleRafId) cancelAnimationFrame(particleRafId);
      particleRafId = null;
    }
  }

  function stabilizeContentFrames() {
    ["post", "page", "archive"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove("tilt-3d", "tilt-3d-frame", "neon-breathe", "reveal-3d", "in-view");
      el.style.transform = "";
      el.style.transition = "";
      delete el.dataset.tiltBound;
      delete el.dataset.revealBound;
    });
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

  function isHomePage() {
    const pageType = window.GLOBAL_CONFIG_SITE && window.GLOBAL_CONFIG_SITE.pageType;
    const path = (window.location.pathname || "/").replace(/\/+$/, "") || "/";
    return pageType === "home" || path === "/" || path === "/index.html";
  }

  function ensureBlenderDockHost() {
    let dock = document.getElementById("fx-blender-dock");
    if (dock) return dock;

    dock = document.createElement("section");
    dock.id = "fx-blender-dock";
    dock.setAttribute("aria-label", "Blender 3D showcase");
    dock.innerHTML =
      "<header class=\"blender-head\">" +
      "<strong>BLENDER 3D</strong>" +
      "<small>luxlu showcase</small>" +
      "</header>" +
      "<div class=\"blender-stage-wrap\">" +
      "<canvas id=\"fx-blender-canvas\"></canvas>" +
      "<span class=\"blender-glow\"></span>" +
      "</div>" +
      "<p class=\"blender-status\">3D 场景初始化中...</p>";

    document.body.appendChild(dock);
    return dock;
  }

  function initBlenderDock(mode) {
    const shouldRun = isHomePage() && mode !== "lite" && !prefersReduced && !isCoarse;
    if (!shouldRun) {
      destroyBlenderDock();
      return;
    }

    const current = window.__luxluBlenderFx;
    if (current && (current.ready || current.booting)) return;

    bootstrapBlenderDock(mode).catch((err) => {
      console.warn("[blender-fx] init failed", err);
      showBlenderDockFallback("3D 引擎加载失败，已切换轻量模式");
    });
  }

  function destroyBlenderDock() {
    const current = window.__luxluBlenderFx;
    if (current && typeof current.destroy === "function") {
      current.destroy();
      window.__luxluBlenderFx = null;
      return;
    }

    const dock = document.getElementById("fx-blender-dock");
    if (dock) dock.remove();
    window.__luxluBlenderFx = null;
  }

  async function bootstrapBlenderDock(mode) {
    const state = {
      booting: true,
      ready: false,
      disposed: false,
      rafId: null,
      cleanupFns: [],
      renderer: null,
      scene: null,
      camera: null,
      group: null,
      coreObject: null,
      ring: null,
      dock: null
    };
    window.__luxluBlenderFx = state;

    const dock = ensureBlenderDockHost();
    state.dock = dock;
    dock.classList.remove("ready", "fallback");
    dock.classList.add("loading");

    const statusNode = dock.querySelector(".blender-status");
    const canvas = dock.querySelector("#fx-blender-canvas");
    if (!canvas) throw new Error("canvas missing");

    const THREE = await importModuleWithFallback([
      "/lib/three/three.module.js",
      "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
      "https://unpkg.com/three@0.160.0/build/three.module.js"
    ]);
    const loaderMod = await importModuleWithFallback([
      "/lib/three/GLTFLoader.js",
      "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js?module",
      "https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js?module"
    ]);
    const GLTFLoader = loaderMod.GLTFLoader;
    if (window.__luxluBlenderFx !== state || state.disposed) return;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: mode === "full",
      alpha: true,
      powerPreference: "high-performance"
    });
    state.renderer = renderer;
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    state.scene = scene;

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0.26, 4.2);
    state.camera = camera;

    const group = new THREE.Group();
    state.group = group;
    scene.add(group);

    const hemi = new THREE.HemisphereLight(0xffc6e7, 0x120915, 1.2);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xfff2ff, 1.5);
    key.position.set(2.6, 3.2, 3.8);
    scene.add(key);

    const fill = new THREE.PointLight(0xff63bb, 1.35, 18);
    fill.position.set(-2.7, 1.4, 2.6);
    scene.add(fill);

    const rim = new THREE.PointLight(0xa7baff, 0.92, 16);
    rim.position.set(2.2, -0.8, -2.2);
    scene.add(rim);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.56, 0.035, 18, 120),
      new THREE.MeshBasicMaterial({
        color: 0xff7bc6,
        transparent: true,
        opacity: 0.54
      })
    );
    ring.rotation.x = Math.PI * 0.5;
    ring.position.y = -1.15;
    scene.add(ring);
    state.ring = ring;

    const fallback = createFallbackBlenderObject(THREE);
    group.add(fallback);
    state.coreObject = fallback;

    if (statusNode) statusNode.textContent = "尝试加载 Blender 模型...";
    try {
      const loader = new GLTFLoader();
      const gltf = await loadGLB(loader, "/model/luxlu-scene.glb");
      if (window.__luxluBlenderFx !== state || state.disposed) return;

      const model = gltf.scene || gltf.scenes && gltf.scenes[0];
      if (!model) throw new Error("empty glb scene");

      normalizeModelToStage(THREE, model);
      if (state.coreObject) {
        disposeObject3D(state.coreObject);
        group.remove(state.coreObject);
      }
      group.add(model);
      state.coreObject = model;
      dock.classList.remove("fallback");
      if (statusNode) statusNode.textContent = "Blender 模型已加载";
    } catch (err) {
      dock.classList.add("fallback");
      if (statusNode) statusNode.textContent = "麻衣剪影 · 花瓣雨 · 节拍联动场景";
      console.warn("[blender-fx] fallback model", err);
    }

    let targetX = 0;
    let targetY = 0;
    let smoothX = 0;
    let smoothY = 0;

    const onPointerMove = (ev) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const nx = (ev.clientX - rect.left) / rect.width - 0.5;
      const ny = (ev.clientY - rect.top) / rect.height - 0.5;
      targetX = nx * 0.85;
      targetY = ny * 0.52;
    };

    const onPointerLeave = () => {
      targetX = 0;
      targetY = 0;
    };

    dock.addEventListener("pointermove", onPointerMove);
    dock.addEventListener("pointerleave", onPointerLeave);
    state.cleanupFns.push(() => dock.removeEventListener("pointermove", onPointerMove));
    state.cleanupFns.push(() => dock.removeEventListener("pointerleave", onPointerLeave));

    const onResize = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(220, Math.floor(rect.width || 0));
      const height = Math.max(220, Math.floor(rect.height || 0));
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mode === "full" ? 1.7 : 1.25));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    onResize();
    window.addEventListener("resize", onResize, { passive: true });
    state.cleanupFns.push(() => window.removeEventListener("resize", onResize));

    const clock = new THREE.Clock();
    const tick = () => {
      if (state.disposed || window.__luxluBlenderFx !== state) return;
      const t = clock.getElapsedTime();
      smoothX += (targetX - smoothX) * 0.09;
      smoothY += (targetY - smoothY) * 0.09;

      group.rotation.y = t * 0.32 + smoothX;
      group.rotation.x = -smoothY * 0.45 + Math.sin(t * 0.45) * 0.03;
      if (state.coreObject) state.coreObject.position.y = Math.sin(t * 1.35) * 0.08;
      if (state.coreObject && state.coreObject.userData && typeof state.coreObject.userData.tick === "function") {
        state.coreObject.userData.tick(t, smoothX, smoothY);
      }
      if (state.ring) state.ring.rotation.z = t * 0.52;

      renderer.render(scene, camera);
      state.rafId = requestAnimationFrame(tick);
    };
    state.rafId = requestAnimationFrame(tick);

    state.destroy = function () {
      state.disposed = true;
      if (state.rafId) cancelAnimationFrame(state.rafId);
      state.cleanupFns.forEach((fn) => {
        try {
          fn();
        } catch (_) {}
      });
      state.cleanupFns.length = 0;

      if (state.group && state.coreObject) {
        try {
          state.group.remove(state.coreObject);
        } catch (_) {}
      }
      if (
        state.coreObject &&
        state.coreObject.userData &&
        typeof state.coreObject.userData.dispose === "function"
      ) {
        try {
          state.coreObject.userData.dispose();
        } catch (_) {}
      }
      disposeObject3D(state.coreObject);
      state.coreObject = null;

      if (state.ring) {
        disposeObject3D(state.ring);
        if (state.scene) state.scene.remove(state.ring);
      }
      state.ring = null;

      if (state.renderer) {
        try {
          state.renderer.dispose();
          if (typeof state.renderer.forceContextLoss === "function") {
            state.renderer.forceContextLoss();
          }
        } catch (_) {}
      }
      state.renderer = null;

      if (state.dock) state.dock.remove();
    };

    dock.classList.remove("loading");
    dock.classList.add("ready");
    state.booting = false;
    state.ready = true;
  }

  function showBlenderDockFallback(message) {
    const dock = ensureBlenderDockHost();
    const statusNode = dock.querySelector(".blender-status");
    const stageWrap = dock.querySelector(".blender-stage-wrap");
    const canvas = dock.querySelector("#fx-blender-canvas");

    dock.classList.remove("loading");
    dock.classList.add("ready", "fallback");

    if (canvas) canvas.style.display = "none";

    if (stageWrap && !stageWrap.querySelector(".blender-fallback-core")) {
      const fallback = document.createElement("div");
      fallback.className = "blender-fallback-core";
      fallback.innerHTML =
        "<span class=\"bf-orbit o1\"></span>" +
        "<span class=\"bf-orbit o2\"></span>" +
        "<span class=\"bf-orbit o3\"></span>" +
        "<span class=\"bf-gem\"></span>";
      stageWrap.appendChild(fallback);
    }

    if (statusNode) {
      statusNode.textContent = message || "3D 轻量模式";
    }

    window.__luxluBlenderFx = {
      booting: false,
      ready: true,
      destroy: function () {
        const d = document.getElementById("fx-blender-dock");
        if (d) d.remove();
      }
    };
  }

  function createFallbackBlenderObject(THREE) {
    const wrap = new THREE.Group();
    wrap.position.y = -0.06;

    const beatDriver = createBeatDriver();
    const silhouetteTexture = createMaiSilhouetteTexture(THREE);
    const petalTexture = createPetalTexture(THREE);

    const stageGlow = new THREE.Mesh(
      new THREE.CircleGeometry(1.95, 96),
      new THREE.MeshBasicMaterial({
        color: 0xff77c7,
        transparent: true,
        opacity: 0.16
      })
    );
    stageGlow.rotation.x = -Math.PI * 0.5;
    stageGlow.position.y = -1.18;
    wrap.add(stageGlow);

    const pulseRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.24, 0.03, 20, 160),
      new THREE.MeshBasicMaterial({
        color: 0xffa0d8,
        transparent: true,
        opacity: 0.46
      })
    );
    pulseRing.rotation.x = Math.PI * 0.5;
    pulseRing.position.y = -1.03;
    wrap.add(pulseRing);

    const pulseRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(0.92, 0.022, 18, 140),
      new THREE.MeshBasicMaterial({
        color: 0xaab9ff,
        transparent: true,
        opacity: 0.35
      })
    );
    pulseRing2.rotation.x = Math.PI * 0.5;
    pulseRing2.rotation.z = 0.42;
    pulseRing2.position.y = -1.01;
    wrap.add(pulseRing2);

    const silhouetteGroup = new THREE.Group();
    wrap.add(silhouetteGroup);

    const silhouetteCore = new THREE.Mesh(
      new THREE.PlaneGeometry(2.02, 3.42),
      new THREE.MeshBasicMaterial({
        map: silhouetteTexture,
        color: 0x100817,
        transparent: true,
        opacity: 0.98,
        side: THREE.DoubleSide,
        alphaTest: 0.06
      })
    );
    silhouetteCore.position.set(0, 0.26, 0);
    silhouetteGroup.add(silhouetteCore);

    const silhouetteRim = new THREE.Mesh(
      new THREE.PlaneGeometry(2.08, 3.52),
      new THREE.MeshBasicMaterial({
        map: silhouetteTexture,
        color: 0xff9cd8,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        alphaTest: 0.02
      })
    );
    silhouetteRim.position.set(0, 0.26, -0.04);
    silhouetteGroup.add(silhouetteRim);

    const backAura = new THREE.Mesh(
      new THREE.SphereGeometry(1.25, 26, 26),
      new THREE.MeshBasicMaterial({
        color: 0xff86cc,
        transparent: true,
        opacity: 0.09
      })
    );
    backAura.position.set(0, 0.28, -0.38);
    silhouetteGroup.add(backAura);

    const crystalGroup = new THREE.Group();
    wrap.add(crystalGroup);
    const crystals = [];
    const crystalGeo = new THREE.OctahedronGeometry(0.1, 0);
    for (let i = 0; i < 24; i += 1) {
      const crystalMat = new THREE.MeshStandardMaterial({
        color: i % 2 ? 0xff9edb : 0xa5b5ff,
        emissive: i % 2 ? 0x300a1d : 0x10183a,
        roughness: 0.18,
        metalness: 0.54,
        transparent: true,
        opacity: 0.74
      });

      const crystal = new THREE.Mesh(crystalGeo, crystalMat);
      const radius = 1.26 + Math.random() * 0.74;
      const angle = (i / 24) * Math.PI * 2 + Math.random() * 0.18;
      const y = -0.78 + Math.random() * 2.0;
      crystal.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      crystal.scale.setScalar(0.76 + Math.random() * 1.05);
      crystal.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      crystal.userData.seed = Math.random() * Math.PI * 2;
      crystal.userData.radius = radius;
      crystal.userData.height = y;
      crystals.push(crystal);
      crystalGroup.add(crystal);
    }

    const petalGroup = new THREE.Group();
    wrap.add(petalGroup);
    const petals = [];
    const petalGeo = new THREE.PlaneGeometry(0.16, 0.24);
    for (let i = 0; i < 92; i += 1) {
      const petalMat = new THREE.MeshBasicMaterial({
        map: petalTexture,
        color: i % 3 === 0 ? 0xfff0f8 : 0xff8ed0,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const petal = new THREE.Mesh(petalGeo, petalMat);
      resetPetal(petal, true);
      petals.push(petal);
      petalGroup.add(petal);
    }

    const starsGeo = new THREE.BufferGeometry();
    const starCount = 260;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i += 1) {
      const r = 1.12 + Math.random() * 1.7;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = (r * Math.cos(phi)) * 0.88;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(
      starsGeo,
      new THREE.PointsMaterial({
        color: 0xffd9ef,
        size: 0.028,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.68
      })
    );
    wrap.add(stars);

    let beatSmooth = 0.22;
    wrap.userData.tick = function (t, smoothX, smoothY) {
      const beat = beatDriver.sample(t);
      beatSmooth += (beat - beatSmooth) * 0.2;

      const pulse = 1 + beatSmooth * 0.2;
      silhouetteGroup.position.y = Math.sin(t * 1.15) * 0.06 + beatSmooth * 0.06;
      silhouetteGroup.rotation.y = smoothX * 0.6;
      silhouetteGroup.rotation.x = -smoothY * 0.18;

      silhouetteRim.material.opacity = 0.2 + beatSmooth * 0.5;
      silhouetteRim.scale.setScalar(1 + beatSmooth * 0.09);
      silhouetteCore.scale.setScalar(0.99 + Math.sin(t * 2.1) * 0.01 + beatSmooth * 0.03);

      backAura.material.opacity = 0.06 + beatSmooth * 0.12;
      backAura.scale.setScalar(1 + beatSmooth * 0.18);

      pulseRing.scale.setScalar(pulse);
      pulseRing.material.opacity = 0.2 + beatSmooth * 0.58;
      pulseRing.rotation.z += 0.008 + beatSmooth * 0.02;

      pulseRing2.scale.setScalar(1 + beatSmooth * 0.15);
      pulseRing2.material.opacity = 0.18 + beatSmooth * 0.44;
      pulseRing2.rotation.z -= 0.006 + beatSmooth * 0.016;

      stageGlow.material.opacity = 0.1 + beatSmooth * 0.14;
      stageGlow.scale.setScalar(1 + beatSmooth * 0.15);

      stars.rotation.y = -t * (0.12 + beatSmooth * 0.06);
      stars.rotation.x = Math.sin(t * 0.24) * 0.1;

      for (let i = 0; i < crystals.length; i += 1) {
        const c = crystals[i];
        const seed = c.userData.seed || 0;
        const radius = c.userData.radius || 1.5;
        const height = c.userData.height || 0;
        const ang = seed + t * (0.24 + beatSmooth * 0.18) + i * 0.018;
        c.position.x = Math.cos(ang) * (radius + beatSmooth * 0.1);
        c.position.z = Math.sin(ang) * (radius + beatSmooth * 0.1);
        c.position.y = height + Math.sin(t * 1.6 + seed) * (0.09 + beatSmooth * 0.07);
        c.rotation.x += 0.01 + beatSmooth * 0.01;
        c.rotation.y += 0.012 + beatSmooth * 0.012;
      }

      for (let i = 0; i < petals.length; i += 1) {
        const p = petals[i];
        const u = p.userData;
        p.position.y -= u.fall + beatSmooth * 0.009;
        p.position.x += Math.sin(t * u.swing + u.phase) * 0.0034 * u.drift;
        p.position.z += Math.cos(t * u.swing * 0.72 + u.phase) * 0.0023 * u.drift;
        p.rotation.x += u.spin * 0.72;
        p.rotation.y += u.spin;
        p.rotation.z += u.spin * 0.52;

        if (p.position.y < -1.58 || Math.abs(p.position.x) > 2.7 || Math.abs(p.position.z) > 2.2) {
          resetPetal(p, false);
        }
      }
    };

    wrap.userData.dispose = function () {
      beatDriver.dispose();
      if (silhouetteTexture && typeof silhouetteTexture.dispose === "function") {
        silhouetteTexture.dispose();
      }
      if (petalTexture && typeof petalTexture.dispose === "function") {
        petalTexture.dispose();
      }
    };

    return wrap;

    function resetPetal(petal, initial) {
      const u = petal.userData;
      u.phase = Math.random() * Math.PI * 2;
      u.fall = 0.004 + Math.random() * 0.005;
      u.spin = (Math.random() * 2 - 1) * 0.045;
      u.swing = 0.8 + Math.random() * 1.6;
      u.drift = 0.6 + Math.random() * 1.2;

      const s = 0.62 + Math.random() * 1.15;
      petal.scale.setScalar(s);
      petal.position.x = (Math.random() * 2 - 1) * 2.15;
      petal.position.z = -1.1 + Math.random() * 2.2;
      petal.position.y = initial ? -1.25 + Math.random() * 3.55 : 1.95 + Math.random() * 0.85;
      petal.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    }
  }

  function createMaiSilhouetteTexture(THREE) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";

    // bunny ears
    ctx.beginPath();
    ctx.moveTo(188, 212);
    ctx.quadraticCurveTo(168, 90, 206, 48);
    ctx.quadraticCurveTo(238, 94, 230, 214);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(328, 212);
    ctx.quadraticCurveTo(344, 84, 306, 44);
    ctx.quadraticCurveTo(272, 96, 286, 214);
    ctx.closePath();
    ctx.fill();

    // head + hair
    ctx.beginPath();
    ctx.arc(256, 286, 88, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(156, 280);
    ctx.quadraticCurveTo(100, 360, 112, 498);
    ctx.quadraticCurveTo(122, 606, 168, 700);
    ctx.quadraticCurveTo(198, 756, 230, 802);
    ctx.lineTo(286, 802);
    ctx.quadraticCurveTo(320, 758, 350, 700);
    ctx.quadraticCurveTo(392, 612, 402, 502);
    ctx.quadraticCurveTo(414, 358, 354, 282);
    ctx.quadraticCurveTo(314, 246, 256, 252);
    ctx.quadraticCurveTo(198, 246, 156, 280);
    ctx.closePath();
    ctx.fill();

    // torso + skirt
    ctx.beginPath();
    ctx.moveTo(218, 410);
    ctx.quadraticCurveTo(196, 456, 176, 544);
    ctx.quadraticCurveTo(162, 606, 168, 658);
    ctx.quadraticCurveTo(194, 726, 252, 742);
    ctx.quadraticCurveTo(318, 742, 346, 678);
    ctx.quadraticCurveTo(354, 618, 336, 548);
    ctx.quadraticCurveTo(318, 458, 294, 410);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(170, 632);
    ctx.quadraticCurveTo(124, 680, 140, 746);
    ctx.quadraticCurveTo(188, 800, 256, 804);
    ctx.quadraticCurveTo(324, 800, 372, 744);
    ctx.quadraticCurveTo(388, 674, 342, 632);
    ctx.quadraticCurveTo(296, 610, 256, 610);
    ctx.quadraticCurveTo(214, 610, 170, 632);
    ctx.closePath();
    ctx.fill();

    // arms
    ctx.beginPath();
    ctx.moveTo(176, 470);
    ctx.quadraticCurveTo(124, 526, 118, 598);
    ctx.quadraticCurveTo(132, 614, 154, 602);
    ctx.quadraticCurveTo(174, 546, 206, 486);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(336, 470);
    ctx.quadraticCurveTo(386, 526, 394, 600);
    ctx.quadraticCurveTo(378, 616, 356, 602);
    ctx.quadraticCurveTo(338, 550, 306, 488);
    ctx.closePath();
    ctx.fill();

    // legs + shoes
    ctx.beginPath();
    ctx.moveTo(228, 794);
    ctx.lineTo(250, 794);
    ctx.lineTo(254, 958);
    ctx.lineTo(228, 958);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(274, 794);
    ctx.lineTo(300, 794);
    ctx.lineTo(302, 958);
    ctx.lineTo(276, 958);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(242, 968, 40, 18, 0, 0, Math.PI * 2);
    ctx.ellipse(290, 968, 40, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    if ("colorSpace" in texture && THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  function createPetalTexture(THREE) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const grad = ctx.createLinearGradient(64, 8, 64, 120);
    grad.addColorStop(0, "rgba(255,250,255,0.98)");
    grad.addColorStop(0.45, "rgba(255,189,226,0.95)");
    grad.addColorStop(1, "rgba(255,120,193,0.78)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(64, 6);
    ctx.bezierCurveTo(102, 24, 112, 62, 66, 122);
    ctx.bezierCurveTo(16, 64, 24, 24, 64, 6);
    ctx.closePath();
    ctx.fill();

    const hi = ctx.createRadialGradient(50, 26, 2, 52, 30, 48);
    hi.addColorStop(0, "rgba(255,255,255,0.95)");
    hi.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = hi;
    ctx.beginPath();
    ctx.ellipse(52, 30, 38, 22, -0.5, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    if ("colorSpace" in texture && THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  function createBeatDriver() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    let audioCtx = null;
    let analyser = null;
    let dataArr = null;
    let resumeBound = false;
    let attachTick = 0;
    let smooth = 0.25;

    function bindResume() {
      if (resumeBound) return;
      resumeBound = true;
      const resume = () => {
        if (!audioCtx || audioCtx.state !== "suspended") return;
        audioCtx.resume().catch(() => {});
      };
      window.addEventListener("pointerdown", resume, { passive: true });
      window.addEventListener("keydown", resume, { passive: true });
    }

    function tryAttachAudio() {
      if (!AudioCtx) return;
      const audioEl = document.querySelector("audio");
      if (!audioEl) return;

      try {
        if (!audioCtx) {
          audioCtx = window.__luxluBeatAudioCtx || new AudioCtx();
          window.__luxluBeatAudioCtx = audioCtx;
        }
        bindResume();

        if (audioEl.__luxluBeatAnalyser) {
          analyser = audioEl.__luxluBeatAnalyser;
          dataArr = audioEl.__luxluBeatData;
          return;
        }

        const sourceNode = audioEl.__luxluBeatSource || audioCtx.createMediaElementSource(audioEl);
        audioEl.__luxluBeatSource = sourceNode;

        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.78;
        dataArr = new Uint8Array(analyser.frequencyBinCount);

        sourceNode.connect(analyser);
        analyser.connect(audioCtx.destination);

        audioEl.__luxluBeatAnalyser = analyser;
        audioEl.__luxluBeatData = dataArr;
      } catch (_) {
        analyser = null;
        dataArr = null;
      }
    }

    return {
      sample: function (t) {
        attachTick += 1;
        if (attachTick % 80 === 1) tryAttachAudio();

        let beat = 0;
        if (analyser && dataArr) {
          try {
            analyser.getByteFrequencyData(dataArr);
            let low = 0;
            let high = 0;
            const lowBins = Math.min(18, dataArr.length);
            const highStart = Math.min(18, dataArr.length);
            const highEnd = Math.min(48, dataArr.length);
            for (let i = 0; i < lowBins; i += 1) low += dataArr[i];
            for (let i = highStart; i < highEnd; i += 1) high += dataArr[i];

            const lowAvg = lowBins ? low / lowBins : 0;
            const highAvg = highEnd > highStart ? high / (highEnd - highStart) : 0;
            beat = Math.min(1, Math.max(0, lowAvg / 168 + highAvg / 540));
          } catch (_) {
            beat = 0;
          }
        }

        if (beat <= 0.02) {
          const kick = Math.pow(Math.max(0, Math.sin(t * 3.5)), 4);
          const pad = (Math.sin(t * 1.7 + 0.6) + 1) * 0.5;
          beat = Math.min(1, 0.16 + kick * 0.7 + pad * 0.22);
        }

        smooth += (beat - smooth) * 0.22;
        return smooth;
      },
      dispose: function () {}
    };
  }

  function normalizeModelToStage(THREE, model) {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxAxis = Math.max(size.x, size.y, size.z) || 1;
    const scale = 2.0 / maxAxis;
    model.scale.setScalar(scale);

    model.position.x += -center.x * scale;
    model.position.y += -center.y * scale;
    model.position.z += -center.z * scale;
    model.position.y -= 0.2;
  }

  function loadGLB(loader, url) {
    return new Promise((resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
    });
  }

  async function importModuleWithFallback(urls) {
    let lastErr = null;
    for (let i = 0; i < urls.length; i += 1) {
      try {
        return await import(urls[i]);
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error("module import failed");
  }

  function disposeObject3D(root) {
    if (!root || typeof root.traverse !== "function") return;

    const disposeMaterial = (mat) => {
      if (!mat) return;
      ["map", "alphaMap", "emissiveMap", "normalMap", "roughnessMap", "metalnessMap", "aoMap"].forEach((key) => {
        if (mat[key] && typeof mat[key].dispose === "function") {
          mat[key].dispose();
        }
      });
      if (typeof mat.dispose === "function") mat.dispose();
    };

    root.traverse((node) => {
      if (node.geometry && typeof node.geometry.dispose === "function") {
        node.geometry.dispose();
      }
      if (!node.material) return;
      if (Array.isArray(node.material)) {
        node.material.forEach((mat) => disposeMaterial(mat));
      } else {
        disposeMaterial(node.material);
      }
    });
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
      document.querySelectorAll("#recent-posts > .recent-post-item, #aside-content .card-widget")
    ).slice(0, Math.max(1, limit || 1));

    targets.forEach((el) => {
      if (el.dataset.tiltBound === "1") return;
      el.dataset.tiltBound = "1";
      el.classList.add("tilt-3d", "neon-breathe");

      let hoverRafId = null;
      const maxTilt = 3.2;
      const perspective = 1200;

      el.addEventListener("mousemove", (e) => {
        if (hoverRafId) cancelAnimationFrame(hoverRafId);
        hoverRafId = requestAnimationFrame(() => {
          const rect = el.getBoundingClientRect();
          const px = (e.clientX - rect.left) / rect.width;
          const py = (e.clientY - rect.top) / rect.height;
          const ry = (px - 0.5) * maxTilt;
          const rx = (0.5 - py) * maxTilt;
          el.style.transform =
            "perspective(" +
            perspective +
            "px) rotateX(" +
            rx.toFixed(3) +
            "deg) rotateY(" +
            ry.toFixed(3) +
            "deg)";
        });
      });

      el.addEventListener("mouseleave", () => {
        if (hoverRafId) cancelAnimationFrame(hoverRafId);
        hoverRafId = null;
        el.style.transform = "";
      });
    });
  }

  function initCodeBlockTilt(limit) {
    const all = Array.from(
      document.querySelectorAll("#post .highlight, #page .highlight, #archive .highlight, #post pre, #page pre, #archive pre")
    );

    const targets = all
      .filter((el) => !(el.tagName === "PRE" && el.closest(".highlight")))
      .slice(0, Math.max(1, Number(limit || 20)));

    targets.forEach((el) => {
      if (el.dataset.codeTiltBound === "1") return;
      el.dataset.codeTiltBound = "1";
      el.classList.add("code-tilt");

      let rafId = null;

      el.addEventListener("mousemove", (e) => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          const rect = el.getBoundingClientRect();
          const px = (e.clientX - rect.left) / rect.width;
          const py = (e.clientY - rect.top) / rect.height;
          const ry = (px - 0.5) * 1.1;
          const rx = (0.5 - py) * 1.1;
          el.style.transform =
            "perspective(1000px) rotateX(" +
            rx.toFixed(3) +
            "deg) rotateY(" +
            ry.toFixed(3) +
            "deg)";
        });
      });

      el.addEventListener("mouseleave", () => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
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
      "#recent-posts > .recent-post-item, #aside-content .card-widget, .article-sort-item"
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
