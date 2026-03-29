(function () {
  const TEAM_POST_DIR = "source/_posts/team";
  const TEAM_UPLOAD_DIR = "source/uploads/team";
  const PIXEL_UPLOAD_DIR = TEAM_UPLOAD_DIR + "/pixel-art";

  const ACCESS_HASH_POOL = {
    admin: ["faa9aa94ef30e64ca0ac64e0d378279ee39007bd6f9bdb4db923c50dde3aac64"],
    team: [
      "b59207a6e43deb03fe7693695c6f6807c71866f214e4b41e056ce94a3529e198"
    ]
  };

  const STORAGE_KEYS = {
    owner: "luxlu_collab_owner_v1",
    repo: "luxlu_collab_repo_v1",
    branch: "luxlu_collab_branch_v1",
    token: "luxlu_collab_token_v1"
  };

  const AUTH_POLICY = {
    maxFails: 5,
    lockMs: 10 * 60 * 1000
  };

  const AUTH_STATE_KEY = "luxlu_collab_auth_guard_v1";

  const state = {
    owner: "lrx-hh",
    repo: "luxlu-blog",
    branch: "main",
    token: "",
    role: "visitor",
    connected: false
  };

  const authState = loadAuthState();

  const pixelEditor = {
    size: 32,
    tool: "brush",
    color: "#ff4fa3",
    drawing: false,
    cells: []
  };

  const refs = {
    ownerInput: document.getElementById("repo-owner"),
    repoInput: document.getElementById("repo-name"),
    branchInput: document.getElementById("repo-branch"),
    tokenInput: document.getElementById("repo-token"),
    connectBtn: document.getElementById("repo-connect-btn"),
    refreshBtn: document.getElementById("repo-refresh-btn"),
    status: document.getElementById("collab-status"),

    visitorBtn: document.getElementById("role-visitor-btn"),
    teamBtn: document.getElementById("role-team-btn"),
    adminBtn: document.getElementById("role-admin-btn"),
    passInput: document.getElementById("role-passphrase"),
    logoutBtn: document.getElementById("role-logout-btn"),
    roleBadge: document.getElementById("role-badge"),

    projectList: document.getElementById("project-list"),

    newPostForm: document.getElementById("new-post-form"),
    postTitle: document.getElementById("post-title"),
    postTags: document.getElementById("post-tags"),
    postBody: document.getElementById("post-body"),

    uploadForm: document.getElementById("upload-form"),
    uploadSubdir: document.getElementById("upload-subdir"),
    uploadFile: document.getElementById("upload-file"),
    uploadResult: document.getElementById("upload-result"),

    adminPath: document.getElementById("admin-path"),
    adminEditor: document.getElementById("admin-editor"),
    adminLoadBtn: document.getElementById("admin-load-btn"),
    adminSaveBtn: document.getElementById("admin-save-btn"),

    pixelGridSize: document.getElementById("pixel-grid-size"),
    pixelColor: document.getElementById("pixel-color"),
    pixelFileName: document.getElementById("pixel-file-name"),
    pixelBrushBtn: document.getElementById("pixel-tool-brush"),
    pixelEraserBtn: document.getElementById("pixel-tool-eraser"),
    pixelClearBtn: document.getElementById("pixel-clear-btn"),
    pixelDownloadBtn: document.getElementById("pixel-download-btn"),
    pixelSaveBtn: document.getElementById("pixel-save-btn"),
    pixelCanvas: document.getElementById("pixel-canvas"),
    pixelResult: document.getElementById("pixel-result"),
    pixelGalleryRefreshBtn: document.getElementById("pixel-gallery-refresh"),
    pixelGalleryList: document.getElementById("pixel-gallery-list"),

    logBox: document.getElementById("collab-log"),
    editorOnly: document.querySelectorAll(".editor-only"),
    adminOnly: document.querySelectorAll(".admin-only")
  };

  if (!refs.status) return;

  init();

  function init() {
    readLocalState();
    renderState();
    bindEvents();
    initPixelEditor();
    refreshProjects();
    refreshPixelGallery();
    log("ready");
  }

  function bindEvents() {
    refs.connectBtn.addEventListener("click", connectRepo);
    refs.refreshBtn.addEventListener("click", refreshProjects);

    refs.visitorBtn.addEventListener("click", () => setRole("visitor"));
    refs.teamBtn.addEventListener("click", () => tryLoginRole("team"));
    refs.adminBtn.addEventListener("click", () => tryLoginRole("admin"));
    refs.logoutBtn.addEventListener("click", () => setRole("visitor"));

    refs.newPostForm.addEventListener("submit", createTeamPost);
    refs.uploadForm.addEventListener("submit", uploadTeamFile);
    refs.adminLoadBtn.addEventListener("click", loadAdminFile);
    refs.adminSaveBtn.addEventListener("click", saveAdminFile);

    if (refs.pixelGridSize) refs.pixelGridSize.addEventListener("change", onPixelGridSizeChange);
    if (refs.pixelColor) refs.pixelColor.addEventListener("change", onPixelColorChange);
    if (refs.pixelBrushBtn) refs.pixelBrushBtn.addEventListener("click", () => setPixelTool("brush"));
    if (refs.pixelEraserBtn) refs.pixelEraserBtn.addEventListener("click", () => setPixelTool("eraser"));
    if (refs.pixelClearBtn) refs.pixelClearBtn.addEventListener("click", clearPixelCanvas);
    if (refs.pixelDownloadBtn) refs.pixelDownloadBtn.addEventListener("click", downloadPixelCanvas);
    if (refs.pixelSaveBtn) refs.pixelSaveBtn.addEventListener("click", savePixelCanvasToRepo);
    if (refs.pixelGalleryRefreshBtn) refs.pixelGalleryRefreshBtn.addEventListener("click", refreshPixelGallery);
    if (refs.pixelGalleryList) refs.pixelGalleryList.addEventListener("click", onPixelGalleryAction);

    if (refs.pixelCanvas) {
      refs.pixelCanvas.addEventListener("pointerdown", onPixelPointerDown);
      refs.pixelCanvas.addEventListener("pointermove", onPixelPointerMove);
      refs.pixelCanvas.addEventListener("pointerup", stopPixelDrawing);
      refs.pixelCanvas.addEventListener("pointerleave", stopPixelDrawing);
      refs.pixelCanvas.addEventListener("pointercancel", stopPixelDrawing);
    }
  }

  function readLocalState() {
    state.owner = localStorage.getItem(STORAGE_KEYS.owner) || state.owner;
    state.repo = localStorage.getItem(STORAGE_KEYS.repo) || state.repo;
    state.branch = localStorage.getItem(STORAGE_KEYS.branch) || state.branch;
    state.role = "visitor";
    state.token = sessionStorage.getItem(STORAGE_KEYS.token) || "";
  }

  function renderState() {
    refs.ownerInput.value = state.owner;
    refs.repoInput.value = state.repo;
    refs.branchInput.value = state.branch;
    refs.tokenInput.value = state.token;

    const canEdit = state.role === "team" || state.role === "admin";
    refs.editorOnly.forEach((el) => el.classList.toggle("hidden", !canEdit));
    refs.adminOnly.forEach((el) => el.classList.toggle("hidden", state.role !== "admin"));

    refs.roleBadge.textContent = state.role;
    refs.roleBadge.className = "badge " + state.role;
    refs.visitorBtn.classList.toggle("active", state.role === "visitor");
    refs.teamBtn.classList.toggle("active", state.role === "team");
    refs.adminBtn.classList.toggle("active", state.role === "admin");
  }

  function setRole(nextRole) {
    state.role = nextRole;
    renderState();
    refreshPixelGallery();
    log("role => " + nextRole);
  }

  async function tryLoginRole(targetRole) {
    const lockRemain = getLockRemainMs(targetRole);
    if (lockRemain > 0) {
      window.alert("尝试过多，请 " + formatRemain(lockRemain) + " 后再试");
      return;
    }

    const pass = (refs.passInput.value || "").trim();
    if (!pass) {
      window.alert("请输入口令");
      return;
    }

    const hash = await sha256(pass);
    if (targetRole === "team" && ACCESS_HASH_POOL.team.includes(hash)) {
      resetAuthRole("team");
      setRole("team");
      refs.passInput.value = "";
      return;
    }
    if (targetRole === "admin" && ACCESS_HASH_POOL.admin.includes(hash)) {
      resetAuthRole("admin");
      setRole("admin");
      refs.passInput.value = "";
      return;
    }

    refs.passInput.value = "";
    const remainInfo = registerAuthFail(targetRole);
    if (remainInfo.locked) {
      window.alert("口令错误次数过多，已锁定 " + formatRemain(remainInfo.lockRemain) + "。");
      return;
    }

    window.alert("口令错误，还可尝试 " + remainInfo.left + " 次。");
  }

  async function connectRepo() {
    state.owner = refs.ownerInput.value.trim();
    state.repo = refs.repoInput.value.trim();
    state.branch = refs.branchInput.value.trim();
    state.token = normalizeTokenInput(refs.tokenInput.value);

    if (!state.owner || !state.repo || !state.branch) {
      window.alert("Owner / Repo / Branch 不能为空");
      return;
    }

    localStorage.setItem(STORAGE_KEYS.owner, state.owner);
    localStorage.setItem(STORAGE_KEYS.repo, state.repo);
    localStorage.setItem(STORAGE_KEYS.branch, state.branch);
    if (state.token) sessionStorage.setItem(STORAGE_KEYS.token, state.token);
    else sessionStorage.removeItem(STORAGE_KEYS.token);

    try {
      refs.status.textContent = "状态：连接中...";

      const repoUrl =
        "https://api.github.com/repos/" +
        encodeURIComponent(state.owner) +
        "/" +
        encodeURIComponent(state.repo);

      let res = await fetch(repoUrl, { headers: apiHeaders(false) });
      let fallbackToReadonly = false;

      if (!res.ok && state.token && (res.status === 401 || res.status === 403)) {
        const retry = await fetch(repoUrl, {
          headers: { Accept: "application/vnd.github+json" }
        });
        if (retry.ok) {
          fallbackToReadonly = true;
          res = retry;
          state.token = "";
          refs.tokenInput.value = "";
          sessionStorage.removeItem(STORAGE_KEYS.token);
          log("token invalid or blocked, fallback to readonly");
        }
      }

      if (!res.ok) throw new Error(await readError(res));

      const branchRes = await fetch(repoUrl + "/branches/" + encodeURIComponent(state.branch), {
        headers: apiHeaders(false)
      });
      if (!branchRes.ok) throw new Error("Branch not found: " + state.branch);

      state.connected = true;
      refs.status.textContent =
        "状态：已连接 " +
        state.owner +
        "/" +
        state.repo +
        "@" +
        state.branch +
        (fallbackToReadonly ? "（只读）" : "");
      log("repo connected");
      await refreshProjects();
      await refreshPixelGallery();

      if (fallbackToReadonly) {
        window.alert("Token 无效或被拦截，已切换只读连接。要上传和保存请填正确 PAT。");
      }
    } catch (err) {
      state.connected = false;
      refs.status.textContent = "状态：连接失败（" + err.message + "）";
      log("connect failed: " + err.message);
      window.alert("连接失败: " + err.message);
    }
  }

  async function refreshProjects() {
    refs.projectList.innerHTML = "<li>loading...</li>";
    try {
      const items = await listDirectory(TEAM_POST_DIR);
      const files = items.filter((item) => item.type === "file" && item.name.endsWith(".md"));

      if (!files.length) {
        refs.projectList.innerHTML = "<li>暂无协作文章</li>";
        return;
      }

      files.sort((a, b) => b.name.localeCompare(a.name));
      refs.projectList.innerHTML = files
        .map((item) => {
          const slug = item.name.replace(/\.md$/, "");
          const postUrl = "/posts/" + encodeURIComponent(slug) + "/";
          const githubUrl = toGithubBlobUrl(item.path);
          return (
            "<li>" +
            "<strong>" +
            escapeHtml(item.name) +
            "</strong>" +
            '<div class="project-links">' +
            '<a href="' +
            postUrl +
            '" target="_blank" rel="noopener">博客预览</a>' +
            '<a href="' +
            githubUrl +
            '" target="_blank" rel="noopener">仓库文件</a>' +
            "</div>" +
            "</li>"
          );
        })
        .join("");

      log("project list refreshed");
    } catch (err) {
      refs.projectList.innerHTML = "<li>读取失败: " + escapeHtml(err.message) + "</li>";
      log("list failed: " + err.message);
    }
  }

  async function refreshPixelGallery() {
    if (!refs.pixelGalleryList) return;

    refs.pixelGalleryList.innerHTML = '<div class="pixel-gallery-empty">loading...</div>';
    try {
      const items = await listDirectory(PIXEL_UPLOAD_DIR);
      const files = items.filter((item) => item.type === "file" && isPixelImageName(item.name));

      if (!files.length) {
        refs.pixelGalleryList.innerHTML = '<div class="pixel-gallery-empty">还没有像素画，等管理员上传第一张。</div>';
        return;
      }

      files.sort((a, b) => b.name.localeCompare(a.name));
      refs.pixelGalleryList.innerHTML = files
        .map((item) => {
          const rawUrl = item.download_url || toGitHubRawUrl(item.path);
          const blobUrl = toGithubBlobUrl(item.path);
          const name = item.name || "";
          const timeText = formatPixelTimestamp(name);
          const canDelete = state.role === "admin";
          const deleteHtml = canDelete
            ? '<div class="pixel-gallery-actions"><button class="collab-btn danger pixel-del-btn" type="button" data-pixel-del="' +
              escapeHtml(item.path || "") +
              '" data-pixel-sha="' +
              escapeHtml(item.sha || "") +
              '" data-pixel-name="' +
              escapeHtml(name) +
              '">删除</button></div>'
            : "";

          return (
            '<article class="pixel-gallery-item">' +
            '<a href="' +
            blobUrl +
            '" target="_blank" rel="noopener">' +
            '<img src="' +
            rawUrl +
            '" alt="' +
            escapeHtml(name) +
            '" loading="lazy">' +
            "</a>" +
            '<div class="pixel-gallery-meta">' +
            '<span class="name">' +
            escapeHtml(name) +
            "</span>" +
            '<span class="time">' +
            escapeHtml(timeText || "未标注时间") +
            "</span>" +
            "</div>" +
            deleteHtml +
            "</article>"
          );
        })
        .join("");

      log("pixel gallery refreshed");
    } catch (err) {
      refs.pixelGalleryList.innerHTML = '<div class="pixel-gallery-empty">读取失败: ' + escapeHtml(err.message) + "</div>";
      log("pixel gallery failed: " + err.message);
    }
  }

  async function onPixelGalleryAction(event) {
    const btn = event.target.closest("button[data-pixel-del]");
    if (!btn) return;

    if (state.role !== "admin") {
      window.alert("仅管理员可删除像素画");
      return;
    }
    if (!ensureToken()) return;

    const path = (btn.getAttribute("data-pixel-del") || "").trim();
    if (!path) return;

    const name = (btn.getAttribute("data-pixel-name") || path.split("/").pop() || "").trim();
    const ok = window.confirm("确认删除这张像素画？\n" + name);
    if (!ok) return;

    btn.disabled = true;
    try {
      let sha = (btn.getAttribute("data-pixel-sha") || "").trim();
      if (!sha) {
        const file = await getFile(path);
        sha = file.sha || "";
      }
      if (!sha) throw new Error("缺少文件 SHA，无法删除");

      await deleteFile(path, sha, "admin delete pixel art: " + name);
      log("pixel art deleted: " + path);
      setPixelResult("Deleted: " + name);
      await refreshPixelGallery();
    } catch (err) {
      log("pixel delete failed: " + err.message);
      window.alert("删除失败: " + err.message);
      btn.disabled = false;
    }
  }

  async function createTeamPost(e) {
    e.preventDefault();
    if (!ensureEditorRole()) return;
    if (!ensureToken()) return;

    const title = (refs.postTitle.value || "").trim();
    const tagsRaw = (refs.postTags.value || "").trim();
    const body = (refs.postBody.value || "").trim();

    if (!title) {
      window.alert("标题不能为空");
      return;
    }

    const slug = toSlug(title);
    const datePrefix = new Date().toISOString().slice(0, 10);
    const path = TEAM_POST_DIR + "/" + datePrefix + "-" + slug + ".md";
    const tags = tagsRaw
      ? tagsRaw
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

    const content = renderPost(title, body, tags);
    const allowUpdate = state.role === "admin";

    try {
      await writeFile(path, utf8ToBase64(content), "team post: " + title, allowUpdate);
      refs.postTitle.value = "";
      refs.postBody.value = "";
      await refreshProjects();
      log("post saved: " + path);
      window.alert("文章已提交: " + path);
    } catch (err) {
      log("post failed: " + err.message);
      window.alert("提交失败: " + err.message);
    }
  }

  async function uploadTeamFile(e) {
    e.preventDefault();
    if (!ensureEditorRole()) return;
    if (!ensureToken()) return;

    const file = refs.uploadFile.files && refs.uploadFile.files[0];
    if (!file) {
      window.alert("请先选择文件");
      return;
    }

    const subdir = sanitizePath(refs.uploadSubdir.value || "shared");
    const safeName = sanitizeFileName(file.name);
    const path = TEAM_UPLOAD_DIR + "/" + subdir + "/" + Date.now() + "-" + safeName;
    const allowUpdate = state.role === "admin";

    try {
      const b64 = await fileToBase64(file);
      await writeFile(path, b64, "team upload: " + safeName, allowUpdate);
      const publicPath = "/" + path.replace(/^source\//, "");
      refs.uploadResult.textContent = "上传成功: " + publicPath;
      log("upload saved: " + path);
      window.alert("上传完成: " + publicPath);
    } catch (err) {
      refs.uploadResult.textContent = "";
      log("upload failed: " + err.message);
      window.alert("上传失败: " + err.message);
    }
  }

  async function loadAdminFile() {
    if (state.role !== "admin") {
      window.alert("仅管理员可读取任意文件");
      return;
    }
    if (!ensureToken()) return;

    const path = (refs.adminPath.value || "").trim().replace(/^\/+/, "");
    if (!path) {
      window.alert("请输入文件路径");
      return;
    }

    try {
      const file = await getFile(path);
      refs.adminEditor.value = base64ToUtf8(file.content || "");
      log("admin loaded: " + path);
    } catch (err) {
      log("admin load failed: " + err.message);
      window.alert("读取失败: " + err.message);
    }
  }

  async function saveAdminFile() {
    if (state.role !== "admin") {
      window.alert("仅管理员可保存任意文件");
      return;
    }
    if (!ensureToken()) return;

    const path = (refs.adminPath.value || "").trim().replace(/^\/+/, "");
    if (!path) {
      window.alert("请输入文件路径");
      return;
    }

    try {
      const content = refs.adminEditor.value || "";
      await writeFile(path, utf8ToBase64(content), "admin edit: " + path, true);
      log("admin saved: " + path);
      window.alert("保存成功: " + path);
    } catch (err) {
      log("admin save failed: " + err.message);
      window.alert("保存失败: " + err.message);
    }
  }

  function initPixelEditor() {
    if (!refs.pixelCanvas) return;
    const size = clampPixelSize(parseInt((refs.pixelGridSize && refs.pixelGridSize.value) || "32", 10));
    const color = (refs.pixelColor && refs.pixelColor.value) || "#ff4fa3";

    pixelEditor.size = size;
    pixelEditor.color = color;
    pixelEditor.cells = new Array(size * size).fill("");

    if (refs.pixelGridSize) refs.pixelGridSize.value = String(size);
    if (refs.pixelColor) refs.pixelColor.value = color;

    setPixelTool("brush");
    renderPixelCanvas();
    setPixelResult("Pixel editor ready.");
  }

  function onPixelGridSizeChange() {
    const size = clampPixelSize(parseInt(refs.pixelGridSize.value || "32", 10));
    pixelEditor.size = size;
    pixelEditor.cells = new Array(size * size).fill("");
    renderPixelCanvas();
    setPixelResult("Grid changed to " + size + " x " + size + ".");
  }

  function onPixelColorChange() {
    pixelEditor.color = refs.pixelColor.value || "#ff4fa3";
    setPixelTool("brush");
  }

  function setPixelTool(tool) {
    pixelEditor.tool = tool === "eraser" ? "eraser" : "brush";
    if (refs.pixelBrushBtn) refs.pixelBrushBtn.classList.toggle("active", pixelEditor.tool === "brush");
    if (refs.pixelEraserBtn) refs.pixelEraserBtn.classList.toggle("active", pixelEditor.tool === "eraser");
  }

  function onPixelPointerDown(event) {
    if (!refs.pixelCanvas) return;
    event.preventDefault();
    pixelEditor.drawing = true;
    if (refs.pixelCanvas.setPointerCapture) refs.pixelCanvas.setPointerCapture(event.pointerId);
    paintPixelFromEvent(event);
  }

  function onPixelPointerMove(event) {
    if (!pixelEditor.drawing) return;
    event.preventDefault();
    paintPixelFromEvent(event);
  }

  function stopPixelDrawing(event) {
    pixelEditor.drawing = false;
    if (refs.pixelCanvas && event && refs.pixelCanvas.releasePointerCapture) {
      try {
        refs.pixelCanvas.releasePointerCapture(event.pointerId);
      } catch (err) {
        // ignore
      }
    }
  }

  function paintPixelFromEvent(event) {
    if (!refs.pixelCanvas) return;
    const pos = resolvePixelPosition(event);
    if (!pos) return;

    const index = pos.y * pixelEditor.size + pos.x;
    const nextColor = pixelEditor.tool === "eraser" ? "" : pixelEditor.color;
    if (pixelEditor.cells[index] === nextColor) return;

    pixelEditor.cells[index] = nextColor;
    renderPixelCanvas();
  }

  function resolvePixelPosition(event) {
    const rect = refs.pixelCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    const xRatio = (event.clientX - rect.left) / rect.width;
    const yRatio = (event.clientY - rect.top) / rect.height;
    const x = Math.floor(xRatio * pixelEditor.size);
    const y = Math.floor(yRatio * pixelEditor.size);

    if (x < 0 || y < 0 || x >= pixelEditor.size || y >= pixelEditor.size) return null;
    return { x: x, y: y };
  }

  function renderPixelCanvas() {
    if (!refs.pixelCanvas) return;
    const ctx = refs.pixelCanvas.getContext("2d");
    if (!ctx) return;

    const width = refs.pixelCanvas.width;
    const height = refs.pixelCanvas.height;
    const cellW = width / pixelEditor.size;
    const cellH = height / pixelEditor.size;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "rgba(25, 17, 35, 0.95)";
    ctx.fillRect(0, 0, width, height);

    for (let y = 0; y < pixelEditor.size; y += 1) {
      for (let x = 0; x < pixelEditor.size; x += 1) {
        const color = pixelEditor.cells[y * pixelEditor.size + x];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(x * cellW), Math.floor(y * cellH), Math.ceil(cellW), Math.ceil(cellH));
      }
    }

    ctx.strokeStyle = "rgba(255, 168, 220, 0.18)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= pixelEditor.size; i += 1) {
      const px = Math.round(i * cellW) + 0.5;
      const py = Math.round(i * cellH) + 0.5;

      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(width, py);
      ctx.stroke();
    }
  }

  function clearPixelCanvas() {
    pixelEditor.cells = new Array(pixelEditor.size * pixelEditor.size).fill("");
    renderPixelCanvas();
    setPixelResult("Canvas cleared.");
  }

  function downloadPixelCanvas() {
    if (!refs.pixelCanvas) return;
    const exportCanvas = buildPixelExportCanvas();
    const fileBase = getPixelFileBaseName();

    const link = document.createElement("a");
    link.href = exportCanvas.toDataURL("image/png");
    link.download = fileBase + ".png";
    document.body.appendChild(link);
    link.click();
    link.remove();

    setPixelResult("PNG downloaded: " + fileBase + ".png");
  }

  async function savePixelCanvasToRepo() {
    if (state.role !== "admin") {
      window.alert("需要管理员身份");
      return;
    }
    if (!ensureToken()) return;

    const exportCanvas = buildPixelExportCanvas();
    const fileBase = getPixelFileBaseName();
    const path = PIXEL_UPLOAD_DIR + "/" + Date.now() + "-" + fileBase + ".png";
    const base64Content = exportCanvas.toDataURL("image/png").split(",")[1] || "";

    try {
      await writeFile(path, base64Content, "admin pixel art: " + fileBase, true);
      const publicPath = "/" + path.replace(/^source\//, "");
      setPixelResult("Saved: " + publicPath);
      log("pixel art saved: " + path);
      await refreshPixelGallery();
      window.alert("像素画已保存: " + publicPath);
    } catch (err) {
      setPixelResult("Save failed: " + err.message);
      log("pixel save failed: " + err.message);
      window.alert("保存失败: " + err.message);
    }
  }

  function buildPixelExportCanvas() {
    const scale = Math.max(8, Math.floor(768 / pixelEditor.size));
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = pixelEditor.size * scale;
    exportCanvas.height = pixelEditor.size * scale;

    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return exportCanvas;
    ctx.imageSmoothingEnabled = false;

    for (let y = 0; y < pixelEditor.size; y += 1) {
      for (let x = 0; x < pixelEditor.size; x += 1) {
        const color = pixelEditor.cells[y * pixelEditor.size + x];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
    return exportCanvas;
  }

  function getPixelFileBaseName() {
    const raw = (refs.pixelFileName && refs.pixelFileName.value) || "";
    const cleaned = raw
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-+|-+$/g, "");
    return cleaned || "pixel-art";
  }

  function setPixelResult(text) {
    if (!refs.pixelResult) return;
    refs.pixelResult.textContent = text;
  }

  function clampPixelSize(value) {
    if (!Number.isFinite(value)) return 32;
    if (value <= 16) return 16;
    if (value <= 24) return 24;
    if (value <= 32) return 32;
    return 48;
  }

  function ensureEditorRole() {
    if (state.role === "team" || state.role === "admin") return true;
    window.alert("请先用队友或管理员身份登录");
    return false;
  }

  function ensureToken() {
    if (state.token) return true;
    window.alert("请先填入有效 GitHub PAT（Contents: Read and write）并点击连接仓库");
    return false;
  }

  async function listDirectory(path) {
    const url = contentUrl(path) + "?ref=" + encodeURIComponent(state.branch);
    const res = await fetch(url, { headers: apiHeaders(false) });
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(await readError(res));
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }

  async function getFile(path) {
    const url = contentUrl(path) + "?ref=" + encodeURIComponent(state.branch);
    const res = await fetch(url, { headers: apiHeaders(false) });
    if (res.status === 404) throw new Error("文件不存在");
    if (!res.ok) throw new Error(await readError(res));
    const data = await res.json();
    if (!data || data.type !== "file") throw new Error("目标不是文件");
    return data;
  }

  async function writeFile(path, base64Content, message, allowUpdate) {
    path = path.replace(/^\/+/, "");

    if (state.role === "team") {
      const allowedPrefixA = TEAM_POST_DIR + "/";
      const allowedPrefixB = TEAM_UPLOAD_DIR + "/";
      if (!path.startsWith(allowedPrefixA) && !path.startsWith(allowedPrefixB)) {
        throw new Error("队友只能在 team 目录新增文件");
      }
    }

    let existing = null;
    try {
      existing = await getFile(path);
    } catch (err) {
      if (err.message !== "文件不存在") throw err;
    }

    if (existing && !allowUpdate) {
      throw new Error("该文件已存在。队友只能新增，不能修改已有文件");
    }

    const payload = {
      message: message,
      content: base64Content,
      branch: state.branch
    };
    if (existing && existing.sha) payload.sha = existing.sha;

    const res = await fetch(contentUrl(path), {
      method: "PUT",
      headers: apiHeaders(true),
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(await readError(res));
    return res.json();
  }

  async function deleteFile(path, sha, message) {
    const safePath = String(path || "").replace(/^\/+/, "");
    const safeSha = String(sha || "").trim();
    if (!safePath) throw new Error("文件路径为空");
    if (!safeSha) throw new Error("缺少文件 SHA");

    const payload = {
      message: message || ("delete file: " + safePath),
      sha: safeSha,
      branch: state.branch
    };

    const res = await fetch(contentUrl(safePath), {
      method: "DELETE",
      headers: apiHeaders(true),
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(await readError(res));
    return res.json();
  }

  function contentUrl(path) {
    const encodedPath = path
      .split("/")
      .filter(Boolean)
      .map((seg) => encodeURIComponent(seg))
      .join("/");

    return (
      "https://api.github.com/repos/" +
      encodeURIComponent(state.owner) +
      "/" +
      encodeURIComponent(state.repo) +
      "/contents/" +
      encodedPath
    );
  }

  function toGithubBlobUrl(path) {
    return (
      "https://github.com/" +
      encodeURIComponent(state.owner) +
      "/" +
      encodeURIComponent(state.repo) +
      "/blob/" +
      encodeURIComponent(state.branch) +
      "/" +
      path
        .split("/")
        .map((seg) => encodeURIComponent(seg))
        .join("/")
    );
  }

  function toGitHubRawUrl(path) {
    return (
      "https://raw.githubusercontent.com/" +
      encodeURIComponent(state.owner) +
      "/" +
      encodeURIComponent(state.repo) +
      "/" +
      encodeURIComponent(state.branch) +
      "/" +
      path
        .split("/")
        .map((seg) => encodeURIComponent(seg))
        .join("/")
    );
  }

  function isPixelImageName(name) {
    return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(String(name || ""));
  }

  function formatPixelTimestamp(name) {
    const m = String(name || "").match(/^(\d{13})-/);
    if (!m) return "";
    const ts = Number(m[1]);
    if (!Number.isFinite(ts)) return "";
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "";
    return formatDate(d);
  }

  function apiHeaders(withJson) {
    const headers = { Accept: "application/vnd.github+json" };
    if (withJson) headers["Content-Type"] = "application/json";
    if (state.token) headers.Authorization = "Bearer " + state.token;
    return headers;
  }

  async function readError(res) {
    try {
      const data = await res.json();
      if (data && data.message) {
        if (res.status === 403 && data.message.toLowerCase().includes("rate limit")) {
          return "GitHub API rate limit reached, add PAT to continue";
        }
        return data.message;
      }
      return "HTTP " + res.status;
    } catch (err) {
      return "HTTP " + res.status;
    }
  }

  function normalizeTokenInput(raw) {
    const token = String(raw || "").trim();
    if (!token) return "";

    const lower = token.toLowerCase();
    if (
      lower === "github_pat_xxx" ||
      lower === "github_pat_xxxxx" ||
      lower === "ghp_xxx" ||
      lower === "your_token_here" ||
      lower === "token"
    ) {
      return "";
    }
    return token;
  }

  function renderPost(title, body, tags) {
    const lines = [];
    lines.push("---");
    lines.push("title: " + title);
    lines.push("date: " + formatDate(new Date()));
    lines.push("categories:");
    lines.push("  - TeamProject");
    lines.push("tags:");
    lines.push("  - Team");
    tags.forEach((tag) => lines.push("  - " + tag));
    lines.push("---");
    lines.push("");
    lines.push(body || "待补充内容");
    lines.push("");
    return lines.join("\n");
  }

  function formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    const s = String(d.getSeconds()).padStart(2, "0");
    return y + "-" + m + "-" + day + " " + h + ":" + mi + ":" + s;
  }

  function toSlug(text) {
    let slug = String(text)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");

    if (!slug) slug = "team-note-" + Date.now();
    return slug;
  }

  function sanitizePath(raw) {
    const cleaned = String(raw || "")
      .toLowerCase()
      .replace(/[^a-z0-9/_-]+/g, "-")
      .replace(/\/{2,}/g, "/")
      .replace(/^\/+|\/+$/g, "");
    return cleaned || "shared";
  }

  function sanitizeFileName(name) {
    const idx = name.lastIndexOf(".");
    const ext = idx >= 0 ? name.slice(idx + 1).toLowerCase().replace(/[^a-z0-9]+/g, "") : "";
    const base = (idx >= 0 ? name.slice(0, idx) : name)
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-+|-+$/g, "");

    return base + (ext ? "." + ext : "");
  }

  function utf8ToBase64(text) {
    return btoa(unescape(encodeURIComponent(text)));
  }

  function base64ToUtf8(b64) {
    return decodeURIComponent(escape(atob((b64 || "").replace(/\n/g, ""))));
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || "");
        const commaIndex = dataUrl.indexOf(",");
        if (commaIndex < 0) {
          reject(new Error("文件读取失败"));
          return;
        }
        resolve(dataUrl.slice(commaIndex + 1));
      };
      reader.onerror = () => reject(new Error("文件读取失败"));
      reader.readAsDataURL(file);
    });
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (ch) => {
      const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };
      return map[ch];
    });
  }

  function log(msg) {
    if (!refs.logBox) return;
    const now = new Date().toLocaleTimeString();
    const line = "[" + now + "] " + msg;
    const old = refs.logBox.textContent ? refs.logBox.textContent.split("\n") : [];
    old.push(line);
    refs.logBox.textContent = old.slice(-120).join("\n");
  }

  async function sha256(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function loadAuthState() {
    try {
      const raw = localStorage.getItem(AUTH_STATE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return {
        team: sanitizeGuard(parsed.team),
        admin: sanitizeGuard(parsed.admin)
      };
    } catch (_) {
      return {
        team: { fails: 0, lockUntil: 0 },
        admin: { fails: 0, lockUntil: 0 }
      };
    }
  }

  function sanitizeGuard(input) {
    const fails = Number(input && input.fails) || 0;
    const lockUntil = Number(input && input.lockUntil) || 0;
    return {
      fails: Math.max(0, Math.min(999, fails)),
      lockUntil: Math.max(0, lockUntil)
    };
  }

  function saveAuthState() {
    localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(authState));
  }

  function getLockRemainMs(role) {
    const item = authState[role] || { fails: 0, lockUntil: 0 };
    const now = Date.now();
    if (item.lockUntil > now) return item.lockUntil - now;
    if (item.lockUntil > 0 || item.fails > 0) {
      authState[role] = { fails: 0, lockUntil: 0 };
      saveAuthState();
    }
    return 0;
  }

  function registerAuthFail(role) {
    const item = authState[role] || { fails: 0, lockUntil: 0 };
    item.fails = (Number(item.fails) || 0) + 1;
    let lockRemain = 0;
    let locked = false;

    if (item.fails >= AUTH_POLICY.maxFails) {
      item.fails = 0;
      item.lockUntil = Date.now() + AUTH_POLICY.lockMs;
      lockRemain = AUTH_POLICY.lockMs;
      locked = true;
    }

    authState[role] = item;
    saveAuthState();

    return {
      locked: locked,
      lockRemain: lockRemain,
      left: Math.max(0, AUTH_POLICY.maxFails - item.fails)
    };
  }

  function resetAuthRole(role) {
    authState[role] = { fails: 0, lockUntil: 0 };
    saveAuthState();
  }

  function formatRemain(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m + "分" + String(s).padStart(2, "0") + "秒";
  }
})();
