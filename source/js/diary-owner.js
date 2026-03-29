(function () {
  const STORAGE_KEY = "luxlu_diary_entries_v1";
  const CLOUD_NAMESPACE = "diary";
  const OWNER_HASH = "11079afd9b280f41fc114e34f27a50161f7a12e003463802c9a78aea6a57e642"; // luxlu667
  const AUTH_POLICY = {
    maxFails: 5,
    lockMs: 10 * 60 * 1000,
    sessionMs: 30 * 60 * 1000
  };
  const AUTH_GUARD_KEY = "luxlu_diary_auth_guard_v1";
  const CLOUD_ERROR_ALERT_GAP_MS = 6000;

  const refs = {
    ownerBtn: document.getElementById("diary-owner-toggle"),
    editor: document.getElementById("diary-editor"),
    editorTitle: document.getElementById("diary-editor-title"),
    input: document.getElementById("diary-input"),
    saveBtn: document.getElementById("diary-save"),
    cancelBtn: document.getElementById("diary-cancel"),
    list: document.getElementById("diary-list")
  };

  if (!refs.ownerBtn || !refs.list) return;

  let ownerMode = false;
  let ownerLastAuthAt = 0;
  let editingId = "";
  let entries = loadEntries();
  let authGuard = loadAuthGuard();
  let lastCloudErrorAt = 0;

  bindEvents();
  render();
  hydrateFromCloud(false);

  function bindEvents() {
    refs.ownerBtn.addEventListener("click", toggleOwnerMode);

    refs.saveBtn.addEventListener("click", async () => {
      if (!ownerMode) return;
      if (!ensureOwnerSessionActive()) return;
      const text = (refs.input.value || "").trim();
      if (!text) {
        window.alert("内容不能为空");
        return;
      }

      if (!editingId) {
        entries.unshift({
          id: makeId(),
          content: text,
          createdAt: nowText(),
          updatedAt: ""
        });
      } else {
        const idx = entries.findIndex((x) => x.id === editingId);
        if (idx >= 0) {
          entries[idx].content = text;
          entries[idx].updatedAt = nowText();
        }
      }

      touchOwnerSession();
      await persistEntries("diary: upsert entry");
      resetEditor();
      render();
    });

    refs.cancelBtn.addEventListener("click", () => {
      if (!ownerMode) return;
      resetEditor();
      renderOwnerState();
    });

    refs.list.addEventListener("click", async (e) => {
      const editBtn = e.target.closest("button[data-edit]");
      if (editBtn) {
        if (!ownerMode) return;
        if (!ensureOwnerSessionActive()) return;
        const id = editBtn.getAttribute("data-edit");
        const item = entries.find((x) => x.id === id);
        if (!item) return;
        editingId = id;
        refs.editorTitle.textContent = "编辑留言";
        refs.input.value = item.content;
        refs.cancelBtn.classList.remove("hidden");
        refs.input.focus();
        refs.input.setSelectionRange(refs.input.value.length, refs.input.value.length);
        return;
      }

      const delBtn = e.target.closest("button[data-del]");
      if (delBtn) {
        if (!ownerMode) return;
        if (!ensureOwnerSessionActive()) return;
        const id = delBtn.getAttribute("data-del");
        const ok = window.confirm("确认删除这条留言吗？");
        if (!ok) return;
        entries = entries.filter((x) => x.id !== id);
        await persistEntries("diary: delete entry");
        if (editingId === id) resetEditor();
        render();
      }
    });
  }

  async function toggleOwnerMode() {
    if (ownerMode) {
      ownerMode = false;
      ownerLastAuthAt = 0;
      resetEditor();
      render();
      return;
    }

    const lockRemain = getAuthLockRemainMs();
    if (lockRemain > 0) {
      window.alert("尝试过多，请 " + formatRemain(lockRemain) + " 后再试");
      return;
    }

    const input = window.prompt("luxlu绝密口令");
    if (!input) return;

    const hash = await sha256(input.trim());
    if (hash !== OWNER_HASH) {
      const failInfo = registerAuthFail();
      if (failInfo.locked) {
        window.alert("口令错误次数过多，已锁定 " + formatRemain(failInfo.lockRemain) + "。");
      } else {
        window.alert("口令错误，还可尝试 " + failInfo.left + " 次。");
      }
      return;
    }

    const cloudOk = await ensureCloudWriteReady();
    if (!cloudOk) {
      return;
    }

    resetAuthGuard();
    ownerMode = true;
    ownerLastAuthAt = Date.now();
    await hydrateFromCloud(true);
    render();
    window.alert("编辑模式已开启");
  }

  function render() {
    renderOwnerState();
    renderList();
  }

  function renderOwnerState() {
    if (ownerMode && !isOwnerSessionValid()) {
      ownerMode = false;
      ownerLastAuthAt = 0;
      resetEditor();
    }

    refs.ownerBtn.textContent = ownerMode ? "退出编辑模式" : "进入编辑模式";
    refs.editor.classList.toggle("hidden", !ownerMode);
    if (!ownerMode) {
      refs.editorTitle.textContent = "新增留言";
      refs.cancelBtn.classList.add("hidden");
    }
  }

  function renderList() {
    if (!entries.length) {
      refs.list.innerHTML = '<li class="diary-empty">你想做第一个人吗^^</li>';
      return;
    }

    refs.list.innerHTML = entries
      .map((item) => {
        const timeText = item.updatedAt ? ("创建 " + item.createdAt + " · 更新 " + item.updatedAt) : ("创建 " + item.createdAt);
        const ops = ownerMode
          ? ('<div class="ops">' +
              '<button type="button" data-edit="' + esc(item.id) + '">编辑</button>' +
              '<button type="button" class="danger" data-del="' + esc(item.id) + '">删除</button>' +
             '</div>')
          : "";

        return (
          '<li class="diary-item">' +
            '<div class="meta"><span>luxlu diary</span><time>' + esc(timeText) + '</time></div>' +
            '<p class="content">' + esc(item.content) + '</p>' +
            ops +
          '</li>'
        );
      })
      .join("");
  }

  function resetEditor() {
    editingId = "";
    refs.editorTitle.textContent = "新增留言";
    refs.input.value = "";
    refs.cancelBtn.classList.add("hidden");
  }

  function loadEntries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) return [];
      return arr
        .map((x) => normalizeEntry(x))
        .filter(Boolean);
    } catch (_) {
      return [];
    }
  }

  function normalizeEntry(x) {
    if (!x) return null;
    const entry = {
      id: String(x.id || "").trim(),
      content: String(x.content || "").trim(),
      createdAt: String(x.createdAt || nowText()).trim(),
      updatedAt: String(x.updatedAt || "").trim()
    };
    if (!entry.id || !entry.content) return null;
    return entry;
  }

  function saveEntriesLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  async function persistEntries(message) {
    saveEntriesLocal();
    await saveEntriesToCloud(message);
  }

  async function hydrateFromCloud(forceOverride) {
    const store = getCloudStore();
    if (!store) return;

    try {
      const remote = await store.fetchJson(CLOUD_NAMESPACE);
      if (!Array.isArray(remote)) return;

      const normalized = remote.map((x) => normalizeEntry(x)).filter(Boolean);
      if (!forceOverride && normalized.length === 0 && entries.length > 0) {
        await tryBootstrapCloud();
        return;
      }

      entries = normalized;
      saveEntriesLocal();
      render();
    } catch (err) {
      console.warn("[diary] cloud read failed", err);
    }
  }

  async function saveEntriesToCloud(message) {
    const store = getCloudStore();
    if (!store) return;

    try {
      await store.saveJson(CLOUD_NAMESPACE, entries, message || "diary update");
    } catch (err) {
      console.warn("[diary] cloud write failed", err);
      const now = Date.now();
      if (now - lastCloudErrorAt > CLOUD_ERROR_ALERT_GAP_MS) {
        lastCloudErrorAt = now;
        window.alert("已保存到当前设备，但云端同步失败：" + getErrMessage(err));
      }
    }
  }

  async function ensureCloudWriteReady() {
    const store = getCloudStore();
    if (!store || typeof store.ensureToken !== "function") return true;

    const ok = await store.ensureToken();
    if (!ok) {
      window.alert("需要先输入 GitHub Token，才能在所有设备同步日记。\n你可以在协作页先连接仓库，再回来编辑。");
      return false;
    }

    return true;
  }

  async function tryBootstrapCloud() {
    const store = getCloudStore();
    if (!store || !entries.length) return;
    if (typeof store.hasToken !== "function" || !store.hasToken()) return;

    try {
      await store.saveJson(CLOUD_NAMESPACE, entries, "bootstrap diary data");
    } catch (err) {
      console.warn("[diary] cloud bootstrap failed", err);
    }
  }

  function getCloudStore() {
    const store = window.luxluCloudStore;
    if (!store) return null;
    if (typeof store.fetchJson !== "function") return null;
    if (typeof store.saveJson !== "function") return null;
    return store;
  }

  function getErrMessage(err) {
    if (!err) return "unknown error";
    if (typeof err === "string") return err;
    return err.message || "unknown error";
  }

  function nowText() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return y + "-" + m + "-" + day + " " + h + ":" + min;
  }

  function makeId() {
    return "d_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (ch) => {
      const map = {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"};
      return map[ch];
    });
  }

  async function sha256(text) {
    const enc = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", enc);
    return [...new Uint8Array(hashBuffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function ensureOwnerSessionActive() {
    if (!ownerMode) return false;
    if (isOwnerSessionValid()) {
      touchOwnerSession();
      return true;
    }
    ownerMode = false;
    ownerLastAuthAt = 0;
    resetEditor();
    renderOwnerState();
    window.alert("编辑会话已过期，请重新输入口令。");
    return false;
  }

  function isOwnerSessionValid() {
    if (!ownerLastAuthAt) return false;
    return Date.now() - ownerLastAuthAt <= AUTH_POLICY.sessionMs;
  }

  function touchOwnerSession() {
    ownerLastAuthAt = Date.now();
  }

  function loadAuthGuard() {
    try {
      const raw = localStorage.getItem(AUTH_GUARD_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return {
        fails: Math.max(0, Number(parsed.fails) || 0),
        lockUntil: Math.max(0, Number(parsed.lockUntil) || 0)
      };
    } catch (_) {
      return { fails: 0, lockUntil: 0 };
    }
  }

  function saveAuthGuard() {
    localStorage.setItem(AUTH_GUARD_KEY, JSON.stringify(authGuard));
  }

  function getAuthLockRemainMs() {
    const now = Date.now();
    if (authGuard.lockUntil > now) return authGuard.lockUntil - now;
    if (authGuard.lockUntil > 0 || authGuard.fails > 0) {
      authGuard = { fails: 0, lockUntil: 0 };
      saveAuthGuard();
    }
    return 0;
  }

  function registerAuthFail() {
    authGuard.fails = (Number(authGuard.fails) || 0) + 1;

    let locked = false;
    let lockRemain = 0;
    if (authGuard.fails >= AUTH_POLICY.maxFails) {
      authGuard.fails = 0;
      authGuard.lockUntil = Date.now() + AUTH_POLICY.lockMs;
      locked = true;
      lockRemain = AUTH_POLICY.lockMs;
    }

    saveAuthGuard();
    return {
      locked: locked,
      lockRemain: lockRemain,
      left: Math.max(0, AUTH_POLICY.maxFails - authGuard.fails)
    };
  }

  function resetAuthGuard() {
    authGuard = { fails: 0, lockUntil: 0 };
    saveAuthGuard();
  }

  function formatRemain(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m + "分" + String(s).padStart(2, "0") + "秒";
  }
})();
