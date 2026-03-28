(function () {
  const TEAM_POST_DIR = "source/_posts/team";
  const TEAM_UPLOAD_DIR = "source/uploads/team";

  const ADMIN_HASH = "fbfb793beaf001e74c576c16ba5b224d4f64126739f01c9476fac696573be8f0";
  const TEAM_HASH = "c74de3f9fe2af9c42e6849be4a98f0eec35ea070e25c4e80c57b13638cd644e9";
  // Default passphrases:
  // admin: luxlu667-admin
  // team:  luxlu667-team
  // Replace hashes above if you want new passphrases.

  const STORAGE_KEYS = {
    owner: "luxlu_collab_owner_v1",
    repo: "luxlu_collab_repo_v1",
    branch: "luxlu_collab_branch_v1",
    token: "luxlu_collab_token_v1"
  };

  const state = {
    owner: "lrx-hh",
    repo: "luxlu-blog",
    branch: "main",
    token: "",
    role: "visitor",
    connected: false,
    loadedAdminPath: "",
    loadedAdminSha: ""
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
    refreshProjects();
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
  }

  function readLocalState() {
    state.owner = localStorage.getItem(STORAGE_KEYS.owner) || state.owner;
    state.repo = localStorage.getItem(STORAGE_KEYS.repo) || state.repo;
    state.branch = localStorage.getItem(STORAGE_KEYS.branch) || state.branch;
    state.role = "visitor";
    localStorage.removeItem("luxlu_collab_role_v1");
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
    log("role => " + nextRole);
  }

  async function tryLoginRole(targetRole) {
    const pass = (refs.passInput.value || "").trim();
    if (!pass) {
      window.alert("请输入口令");
      return;
    }
    const hash = await sha256(pass);
    if (targetRole === "team" && hash === TEAM_HASH) {
      setRole("team");
      refs.passInput.value = "";
      return;
    }
    if (targetRole === "admin" && hash === ADMIN_HASH) {
      setRole("admin");
      refs.passInput.value = "";
      return;
    }
    window.alert("口令错误");
  }

  async function connectRepo() {
    state.owner = refs.ownerInput.value.trim();
    state.repo = refs.repoInput.value.trim();
    state.branch = refs.branchInput.value.trim();
    state.token = refs.tokenInput.value.trim();

    if (!state.owner || !state.repo || !state.branch) {
      window.alert("Owner/Repo/Branch 不能为空");
      return;
    }

    localStorage.setItem(STORAGE_KEYS.owner, state.owner);
    localStorage.setItem(STORAGE_KEYS.repo, state.repo);
    localStorage.setItem(STORAGE_KEYS.branch, state.branch);
    if (state.token) sessionStorage.setItem(STORAGE_KEYS.token, state.token);
    else sessionStorage.removeItem(STORAGE_KEYS.token);

    try {
      refs.status.textContent = "状态：连接中...";
      const res = await fetch(
        "https://api.github.com/repos/" +
          encodeURIComponent(state.owner) +
          "/" +
          encodeURIComponent(state.repo),
        { headers: apiHeaders(false) }
      );
      if (!res.ok) throw new Error(await readError(res));
      state.connected = true;
      refs.status.textContent = "状态：已连接 " + state.owner + "/" + state.repo + "@" + state.branch;
      log("repo connected");
      await refreshProjects();
    } catch (err) {
      state.connected = false;
      refs.status.textContent = "状态：连接失败";
      log("connect failed: " + err.message);
      window.alert("连接失败: " + err.message);
    }
  }

  async function refreshProjects() {
    refs.projectList.innerHTML = "<li>loading...</li>";
    try {
      const items = await listDirectory(TEAM_POST_DIR);
      if (!items.length) {
        refs.projectList.innerHTML = "<li>暂无协作文章</li>";
        return;
      }

      items.sort((a, b) => b.name.localeCompare(a.name));
      refs.projectList.innerHTML = items
        .filter((item) => item.type === "file" && item.name.endsWith(".md"))
        .map((item) => {
          const slug = item.name.replace(/\.md$/, "");
          const postUrl = "/posts/" + encodeURIComponent(slug) + "/";
          const githubUrl = toGithubBlobUrl(item.path);
          return (
            "<li>" +
            "<strong>" +
            escapeHtml(item.name) +
            "</strong>" +
            "<div class=\"project-links\">" +
            "<a href=\"" +
            postUrl +
            "\" target=\"_blank\" rel=\"noopener\">博客预览</a>" +
            "<a href=\"" +
            githubUrl +
            "\" target=\"_blank\" rel=\"noopener\">仓库文件</a>" +
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
      log("post saved: " + path);
      refs.postTitle.value = "";
      refs.postBody.value = "";
      await refreshProjects();
      window.alert("已提交文章: " + path);
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
      window.alert("先选择文件");
      return;
    }

    const subdir = sanitizePath(refs.uploadSubdir.value || "shared");
    const safeName = sanitizeFileName(file.name);
    const stamp = Date.now();
    const path = TEAM_UPLOAD_DIR + "/" + subdir + "/" + stamp + "-" + safeName;
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
      window.alert("只有管理员可以读取任意文件");
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
      state.loadedAdminPath = path;
      state.loadedAdminSha = file.sha || "";
      log("admin loaded: " + path);
    } catch (err) {
      log("admin load failed: " + err.message);
      window.alert("读取失败: " + err.message);
    }
  }

  async function saveAdminFile() {
    if (state.role !== "admin") {
      window.alert("只有管理员可以保存任意文件");
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

  function ensureEditorRole() {
    if (state.role === "team" || state.role === "admin") return true;
    window.alert("请先用队友或管理员身份登录");
    return false;
  }

  function ensureToken() {
    if (state.token) return true;
    window.alert("请先填写 GitHub Token 并连接仓库");
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
    const isTeamRole = state.role === "team";

    if (isTeamRole) {
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

  function apiHeaders(withJson) {
    const headers = {
      Accept: "application/vnd.github+json"
    };
    if (withJson) headers["Content-Type"] = "application/json";
    if (state.token) headers.Authorization = "Bearer " + state.token;
    return headers;
  }

  async function readError(res) {
    try {
      const data = await res.json();
      if (data && data.message) return data.message;
      return "HTTP " + res.status;
    } catch (err) {
      return "HTTP " + res.status;
    }
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
    return String(text).replace(/[&<>"']/g, function (ch) {
      const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
      };
      return map[ch];
    });
  }

  function log(msg) {
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
})();
