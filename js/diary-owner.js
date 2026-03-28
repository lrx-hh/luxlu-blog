(function () {
  const STORAGE_KEY = "luxlu_diary_entries_v1";
  const OWNER_HASH = "11079afd9b280f41fc114e34f27a50161f7a12e003463802c9a78aea6a57e642"; // luxlu667

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
  let editingId = "";
  let entries = loadEntries();

  bindEvents();
  render();

  function bindEvents() {
    refs.ownerBtn.addEventListener("click", toggleOwnerMode);

    refs.saveBtn.addEventListener("click", () => {
      if (!ownerMode) return;
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

      saveEntries();
      resetEditor();
      render();
    });

    refs.cancelBtn.addEventListener("click", () => {
      if (!ownerMode) return;
      resetEditor();
      renderOwnerState();
    });

    refs.list.addEventListener("click", (e) => {
      const editBtn = e.target.closest("button[data-edit]");
      if (editBtn) {
        if (!ownerMode) return;
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
        const id = delBtn.getAttribute("data-del");
        const ok = window.confirm("确认删除这条留言吗？");
        if (!ok) return;
        entries = entries.filter((x) => x.id !== id);
        saveEntries();
        if (editingId === id) resetEditor();
        render();
      }
    });
  }

  async function toggleOwnerMode() {
    if (ownerMode) {
      ownerMode = false;
      resetEditor();
      render();
      return;
    }

    const input = window.prompt("输入luxlu口令进入编辑模式：");
    if (!input) return;

    const hash = await sha256(input.trim());
    if (hash !== OWNER_HASH) {
      window.alert("口令错误");
      return;
    }

    ownerMode = true;
    render();
    window.alert("编辑模式已开启");
  }

  function render() {
    renderOwnerState();
    renderList();
  }

  function renderOwnerState() {
    refs.ownerBtn.textContent = ownerMode ? "退出编辑模式" : "进入编辑模式";
    refs.editor.classList.toggle("hidden", !ownerMode);
    if (!ownerMode) {
      refs.editorTitle.textContent = "新增留言";
      refs.cancelBtn.classList.add("hidden");
    }
  }

  function renderList() {
    if (!entries.length) {
      refs.list.innerHTML = '<li class="diary-empty">还没有留言。</li>';
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
        .map((x) => ({
          id: String(x.id || ""),
          content: String(x.content || "").trim(),
          createdAt: String(x.createdAt || nowText()),
          updatedAt: String(x.updatedAt || "")
        }))
        .filter((x) => x.id && x.content);
    } catch (_) {
      return [];
    }
  }

  function saveEntries() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
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
})();
