(function () {
  const STORAGE_KEY = "luxlu_calendar_events_v1";
  const OWNER_MODE_KEY = "luxlu_calendar_owner_mode";
  const OWNER_HASH = "11079afd9b280f41fc114e34f27a50161f7a12e003463802c9a78aea6a57e642";
  // Default passphrase hash is for: luxlu667
  // Change OWNER_HASH to your own SHA-256 hash for real use.

  const monthTitle = document.getElementById("month-title");
  const grid = document.getElementById("calendar-grid");
  const prevBtn = document.getElementById("prev-month");
  const nextBtn = document.getElementById("next-month");
  const todayBtn = document.getElementById("today-btn");
  const ownerBtn = document.getElementById("owner-toggle");
  const agendaTitle = document.getElementById("agenda-title");
  const agendaList = document.getElementById("agenda-list");
  const addItemBtn = document.getElementById("add-item-btn");
  const shell = document.querySelector(".calendar-shell");

  const dialog = document.getElementById("edit-dialog");
  const form = document.getElementById("edit-form");
  const dialogTitle = document.getElementById("dialog-title");
  const timeInput = document.getElementById("item-time");
  const titleInput = document.getElementById("item-title");
  const descInput = document.getElementById("item-desc");
  const deleteBtn = document.getElementById("delete-item-btn");
  const cancelBtn = document.getElementById("cancel-btn");

  if (!grid) return;

  const today = new Date();
  let current = new Date(today.getFullYear(), today.getMonth(), 1);
  let selectedDateKey = formatDateKey(today);
  let editTarget = null;
  let ownerMode = localStorage.getItem(OWNER_MODE_KEY) === "1";
  let events = loadEvents();

  render();
  bindEvents();

  function bindEvents() {
    prevBtn.addEventListener("click", () => {
      current = new Date(current.getFullYear(), current.getMonth() - 1, 1);
      render();
    });

    nextBtn.addEventListener("click", () => {
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      render();
    });

    todayBtn.addEventListener("click", () => {
      current = new Date(today.getFullYear(), today.getMonth(), 1);
      selectedDateKey = formatDateKey(today);
      render();
    });

    ownerBtn.addEventListener("click", async () => {
      if (ownerMode) {
        ownerMode = false;
        localStorage.removeItem(OWNER_MODE_KEY);
        renderOwnerState();
        return;
      }
      const input = window.prompt("输入主人口令后开启编辑模式：");
      if (!input) return;
      const hash = await sha256(input.trim());
      if (hash === OWNER_HASH) {
        ownerMode = true;
        localStorage.setItem(OWNER_MODE_KEY, "1");
        renderOwnerState();
        window.alert("主人模式已开启。");
      } else {
        window.alert("口令错误。");
      }
    });

    addItemBtn.addEventListener("click", () => {
      editTarget = null;
      openDialog("新增日程", { time: "", title: "", desc: "" });
    });

    agendaList.addEventListener("click", (e) => {
      const row = e.target.closest(".agenda-item");
      if (!row || !ownerMode) return;
      const idx = Number(row.dataset.idx);
      const items = events[selectedDateKey] || [];
      const item = items[idx];
      if (!item) return;
      editTarget = idx;
      openDialog("编辑日程", item, true);
    });

    cancelBtn.addEventListener("click", () => dialog.close());

    deleteBtn.addEventListener("click", () => {
      if (editTarget === null) return;
      const list = events[selectedDateKey] || [];
      list.splice(editTarget, 1);
      events[selectedDateKey] = list;
      saveEvents();
      dialog.close();
      renderAgenda();
      render();
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!ownerMode) return;
      const payload = {
        time: (timeInput.value || "").trim(),
        title: (titleInput.value || "").trim(),
        desc: (descInput.value || "").trim()
      };
      if (!payload.title) {
        window.alert("标题不能为空。");
        return;
      }
      const list = events[selectedDateKey] || [];
      if (editTarget === null) list.push(payload);
      else list[editTarget] = payload;
      list.sort((a, b) => a.time.localeCompare(b.time));
      events[selectedDateKey] = list;
      saveEvents();
      dialog.close();
      renderAgenda();
      render();
    });

    shell.addEventListener("mousemove", (e) => {
      const rect = shell.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      shell.style.transform = "rotateX(" + (-y * 3) + "deg) rotateY(" + (x * 3) + "deg)";
    });

    shell.addEventListener("mouseleave", () => {
      shell.style.transform = "rotateX(0deg) rotateY(0deg)";
    });
  }

  function render() {
    const year = current.getFullYear();
    const month = current.getMonth();
    monthTitle.textContent = year + " 年 " + (month + 1) + " 月";
    renderGrid(year, month);
    renderAgenda();
    renderOwnerState();
  }

  function renderOwnerState() {
    ownerBtn.textContent = ownerMode ? "退出主人模式" : "进入主人模式";
    addItemBtn.classList.toggle("hidden", !ownerMode);
  }

  function renderGrid(year, month) {
    grid.innerHTML = "";
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startDay = (first.getDay() + 6) % 7;

    const total = 42;
    for (let i = 0; i < total; i++) {
      const day = new Date(year, month, i - startDay + 1);
      const key = formatDateKey(day);
      const inMonth = day.getMonth() === month;
      const itemCount = (events[key] || []).length;

      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "day-cell";
      if (!inMonth) cell.classList.add("other");
      if (key === selectedDateKey) cell.classList.add("active");
      if (key === formatDateKey(today)) cell.classList.add("today");

      const markers = (events[key] || []).slice(0, 2).map((it) => {
        return "<div class=\"marker\">" + escapeHtml((it.time ? it.time + " " : "") + it.title) + "</div>";
      }).join("");

      cell.innerHTML = "" +
        "<div class=\"day-num\">" + day.getDate() + "</div>" +
        "<div class=\"day-markers\">" + markers + (itemCount > 2 ? "<div class=\"marker\">+" + (itemCount - 2) + " 项</div>" : "") + "</div>";

      cell.addEventListener("click", () => {
        selectedDateKey = key;
        render();
      });

      grid.appendChild(cell);
    }
  }

  function renderAgenda() {
    const list = events[selectedDateKey] || [];
    agendaTitle.textContent = selectedDateKey + " 安排";
    if (!list.length) {
      agendaList.innerHTML = "<li class=\"agenda-item\">暂无安排</li>";
      return;
    }
    agendaList.innerHTML = list.map((it, idx) => {
      const time = it.time ? "<span class=\"agenda-time\">" + escapeHtml(it.time) + "</span>" : "";
      const desc = it.desc ? "<div>" + escapeHtml(it.desc) + "</div>" : "";
      return "<li class=\"agenda-item\" data-idx=\"" + idx + "\">" + time + "<strong>" + escapeHtml(it.title) + "</strong>" + desc + "</li>";
    }).join("");
  }

  function openDialog(title, data, canDelete) {
    dialogTitle.textContent = title;
    timeInput.value = data.time || "";
    titleInput.value = data.title || "";
    descInput.value = data.desc || "";
    deleteBtn.classList.toggle("hidden", !canDelete);
    dialog.showModal();
  }

  function formatDateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function loadEvents() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : seedEvents();
    } catch (err) {
      return seedEvents();
    }
  }

  function saveEvents() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }

  function seedEvents() {
    const base = {};
    const d1 = formatDateKey(today);
    const d2 = formatDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));
    base[d1] = [
      { time: "20:00", title: "复盘 1 道 Misc 题", desc: "按模板写到博客" },
      { time: "21:30", title: "工具链整理", desc: "更新 CyberChef 快捷流程" }
    ];
    base[d2] = [
      { time: "19:30", title: "Forensics 训练", desc: "做 1 份流量包分析" }
    ];
    return base;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (ch) => {
      const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" };
      return map[ch];
    });
  }

  async function sha256(text) {
    const enc = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", enc);
    return [...new Uint8Array(hashBuffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
})();
