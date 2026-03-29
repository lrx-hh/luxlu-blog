(function () {
  const STORAGE_KEY = "luxlu_calendar_events_v2";
  const CLOUD_NAMESPACE = "calendar";
  const OWNER_HASH_POOL = [
    "bec5a521c92f5edc7b6cf176d70ca44611d9889775b0b2850f3fb4ebd820d9f4"
  ];
  const DEFAULT_COLOR = "#ff4fa3";
  const AUTH_POLICY = {
    maxFails: 5,
    lockMs: 10 * 60 * 1000,
    sessionMs: 30 * 60 * 1000
  };
  const AUTH_GUARD_KEY = "luxlu_calendar_auth_guard_v1";
  const CLOUD_ERROR_ALERT_GAP_MS = 6000;

  const refs = {
    monthTitle: document.getElementById("month-title"),
    grid: document.getElementById("calendar-grid"),
    prevBtn: document.getElementById("prev-month"),
    nextBtn: document.getElementById("next-month"),
    todayBtn: document.getElementById("today-btn"),
    ownerBtn: document.getElementById("owner-toggle"),
    agendaTitle: document.getElementById("agenda-title"),
    agendaList: document.getElementById("agenda-list"),
    addItemBtn: document.getElementById("add-item-btn"),
    quickAddBtn: document.getElementById("quick-add-btn"),
    shell: document.querySelector(".calendar-shell"),

    dialog: document.getElementById("edit-dialog"),
    form: document.getElementById("edit-form"),
    dialogTitle: document.getElementById("dialog-title"),
    titleInput: document.getElementById("item-title"),
    colorInput: document.getElementById("item-color"),
    startDateInput: document.getElementById("item-start-date"),
    startTimeInput: document.getElementById("item-start-time"),
    endDateInput: document.getElementById("item-end-date"),
    endTimeInput: document.getElementById("item-end-time"),
    descInput: document.getElementById("item-desc"),
    doneInput: document.getElementById("item-done"),
    deleteBtn: document.getElementById("delete-item-btn"),
    cancelBtn: document.getElementById("cancel-btn")
  };

  if (!refs.grid || !refs.dialog || !refs.form) return;

  document.body.classList.add("calendar-page");

  const today = new Date();
  let current = new Date(today.getFullYear(), today.getMonth(), 1);
  let selectedDateKey = formatDateKey(today);
  let ownerMode = false;
  let ownerLastAuthAt = 0;
  let editEventId = null;
  let events = loadEvents();
  let authGuard = loadAuthGuard();
  let lastCloudErrorAt = 0;

  bindEvents();
  render();
  hydrateFromCloud(false);

  function bindEvents() {
    refs.prevBtn.addEventListener("click", () => {
      current = new Date(current.getFullYear(), current.getMonth() - 1, 1);
      render();
    });

    refs.nextBtn.addEventListener("click", () => {
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      render();
    });

    refs.todayBtn.addEventListener("click", () => {
      current = new Date(today.getFullYear(), today.getMonth(), 1);
      selectedDateKey = formatDateKey(today);
      render();
    });

    refs.ownerBtn.addEventListener("click", toggleOwnerMode);

    refs.addItemBtn.addEventListener("click", () => {
      if (!ensureOwnerSessionActive()) return;
      openCreateDialog(selectedDateKey);
    });

    if (refs.quickAddBtn) {
      refs.quickAddBtn.addEventListener("click", async () => {
        if (!ownerMode) {
          await toggleOwnerMode();
          if (!ownerMode) return;
        }
        openCreateDialog(selectedDateKey);
      });
    }

    refs.agendaList.addEventListener("click", async (event) => {
      const row = event.target.closest(".agenda-item");
      if (!row) return;

      const id = row.dataset.id;
      if (!id) return;

      const ev = events.find((item) => item.id === id);
      if (!ev) return;

      if (!ownerMode) {
        window.alert("当前是只读模式。点击“进入luxlu的生活”并输入口令后才能编辑。");
        return;
      }
      if (!ensureOwnerSessionActive()) return;

      if (event.target.classList.contains("agenda-check")) {
        ev.done = !!event.target.checked;
        touchOwnerSession();
        await persistEvents("calendar: toggle done");
        render();
        return;
      }

      editEventId = id;
      openDialog("编辑日程", ev, true);
    });

    if (refs.cancelBtn) {
      refs.cancelBtn.addEventListener("click", () => closeDialog());
    }

    refs.deleteBtn.addEventListener("click", async () => {
      if (!ownerMode || !editEventId) return;
      if (!ensureOwnerSessionActive()) return;
      events = events.filter((item) => item.id !== editEventId);
      touchOwnerSession();
      await persistEvents("calendar: delete event");
      closeDialog();
      render();
    });

    refs.form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!ownerMode) return;
      if (!ensureOwnerSessionActive()) return;

      const payload = collectFormData();
      if (!payload) return;

      if (!editEventId) {
        payload.id = generateEventId();
        events.push(payload);
      } else {
        const idx = events.findIndex((item) => item.id === editEventId);
        if (idx >= 0) {
          payload.id = editEventId;
          events[idx] = payload;
        }
      }

      events.sort(compareEvents);
      touchOwnerSession();
      await persistEvents("calendar: upsert event");
      closeDialog();

      selectedDateKey = payload.startDate;
      current = new Date(parseInt(payload.startDate.slice(0, 4), 10), parseInt(payload.startDate.slice(5, 7), 10) - 1, 1);
      render();
    });

    if (refs.shell) {
      refs.shell.addEventListener("mousemove", (event) => {
        if (window.innerWidth < 1080) return;
        const rect = refs.shell.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        refs.shell.style.transform = "rotateX(" + -y * 1.8 + "deg) rotateY(" + x * 1.8 + "deg)";
      });

      refs.shell.addEventListener("mouseleave", () => {
        refs.shell.style.transform = "rotateX(0deg) rotateY(0deg)";
      });
    }
  }

  async function toggleOwnerMode() {
    if (ownerMode) {
      ownerMode = false;
      ownerLastAuthAt = 0;
      renderOwnerState();
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
    if (!OWNER_HASH_POOL.includes(hash)) {
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
    renderOwnerState();
    window.alert("主人模式已开启");
  }

  function render() {
    const year = current.getFullYear();
    const month = current.getMonth();
    refs.monthTitle.textContent = year + " 年 " + (month + 1) + " 月";

    renderGrid(year, month);
    renderAgenda();
    renderOwnerState();
  }

  function renderOwnerState() {
    if (ownerMode && !isOwnerSessionValid()) {
      ownerMode = false;
      ownerLastAuthAt = 0;
    }

    refs.ownerBtn.textContent = ownerMode ? "退出luxlu的生活" : "进入luxlu的生活";
    refs.addItemBtn.classList.toggle("hidden", !ownerMode);
    if (refs.quickAddBtn) refs.quickAddBtn.classList.remove("hidden");
  }

  function renderGrid(year, month) {
    refs.grid.innerHTML = "";

    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7;

    for (let i = 0; i < 42; i += 1) {
      const date = new Date(year, month, i - startOffset + 1);
      const key = formatDateKey(date);
      const inMonth = date.getMonth() === month;
      const dayEvents = getEventsOnDate(key);

      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "day-cell";
      if (!inMonth) cell.classList.add("other");
      if (key === selectedDateKey) cell.classList.add("active");
      if (key === formatDateKey(today)) cell.classList.add("today");

      const markers = dayEvents.slice(0, 3).map((ev) => renderDayMarker(ev)).join("");
      const extra = dayEvents.length > 3 ? '<div class="marker">+' + (dayEvents.length - 3) + " 项</div>" : "";

      cell.innerHTML =
        '<div class="day-num">' +
        date.getDate() +
        "</div>" +
        '<div class="day-markers">' +
        markers +
        extra +
        "</div>";

      cell.addEventListener("click", () => {
        selectedDateKey = key;
        render();
      });

      refs.grid.appendChild(cell);
    }
  }

  function renderDayMarker(ev) {
    const text = (ev.done ? "✓ " : "") + ev.title;
    const style =
      "background:" + alphaColor(ev.color, 0.22) + ";border-color:" + alphaColor(ev.color, 0.62) + ";";
    const doneClass = ev.done ? " done" : "";

    return '<div class="marker' + doneClass + '" style="' + style + '">' + escapeHtml(text) + "</div>";
  }

  function renderAgenda() {
    refs.agendaTitle.textContent = selectedDateKey + " 的安排";

    const list = getEventsOnDate(selectedDateKey);
    if (!list.length) {
      refs.agendaList.innerHTML = '<li class="agenda-item agenda-empty">暂无安排</li>';
      return;
    }

    refs.agendaList.innerHTML = list
      .map((ev) => {
        const doneClass = ev.done ? " done" : "";
        const checked = ev.done ? " checked" : "";
        const desc = ev.desc ? '<div class="agenda-desc">' + escapeHtml(ev.desc) + "</div>" : "";
        const colorDot =
          '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' +
          escapeHtml(ev.color) +
          ';margin-right:6px;"></span>';

        return (
          '<li class="agenda-item' +
          doneClass +
          '" data-id="' +
          escapeHtml(ev.id) +
          '">' +
          '<div class="agenda-top">' +
          '<input class="agenda-check" type="checkbox"' +
          checked +
          ">" +
          '<span class="agenda-time">' +
          escapeHtml(formatEventTimeRange(ev)) +
          "</span>" +
          "</div>" +
          '<div class="agenda-title">' +
          colorDot +
          escapeHtml(ev.title) +
          "</div>" +
          desc +
          "</li>"
        );
      })
      .join("");
  }

  function openDialog(title, eventData, canDelete) {
    refs.dialogTitle.textContent = title;
    refs.titleInput.value = eventData.title || "";
    refs.colorInput.value = normalizeColor(eventData.color || DEFAULT_COLOR);
    refs.startDateInput.value = eventData.startDate || selectedDateKey;
    refs.startTimeInput.value = eventData.startTime || "";
    refs.endDateInput.value = eventData.endDate || eventData.startDate || selectedDateKey;
    refs.endTimeInput.value = eventData.endTime || "";
    refs.descInput.value = eventData.desc || "";
    refs.doneInput.checked = !!eventData.done;
    refs.deleteBtn.classList.toggle("hidden", !canDelete);
    openDialogModal();
  }

  function openCreateDialog(dateKey) {
    editEventId = null;
    openDialog("新增日程", {
      id: "",
      title: "",
      color: DEFAULT_COLOR,
      startDate: dateKey || selectedDateKey,
      startTime: "",
      endDate: dateKey || selectedDateKey,
      endTime: "",
      desc: "",
      done: false
    });
  }

  function openDialogModal() {
    if (typeof refs.dialog.showModal === "function") {
      refs.dialog.showModal();
      return;
    }
    refs.dialog.setAttribute("open", "open");
  }

  function closeDialog() {
    if (typeof refs.dialog.close === "function") {
      refs.dialog.close();
      return;
    }
    refs.dialog.removeAttribute("open");
  }

  function collectFormData() {
    const title = (refs.titleInput.value || "").trim();
    const color = normalizeColor(refs.colorInput.value || DEFAULT_COLOR);
    const startDate = (refs.startDateInput.value || "").trim();
    const startTime = (refs.startTimeInput.value || "").trim();
    const endDateRaw = (refs.endDateInput.value || "").trim();
    const endDate = endDateRaw || startDate;
    const endTime = (refs.endTimeInput.value || "").trim();
    const desc = (refs.descInput.value || "").trim();
    const done = !!refs.doneInput.checked;

    if (!title) {
      window.alert("标题不能为空");
      return null;
    }
    if (!isDateKey(startDate)) {
      window.alert("开始日期无效");
      return null;
    }
    if (!isDateKey(endDate)) {
      window.alert("结束日期无效");
      return null;
    }
    if (startTime && !isTimeFormat(startTime)) {
      window.alert("开始时间格式应为 HH:mm");
      return null;
    }
    if (endTime && !isTimeFormat(endTime)) {
      window.alert("结束时间格式应为 HH:mm");
      return null;
    }

    const startDT = toComparableDateTime(startDate, startTime || "00:00");
    const endDT = toComparableDateTime(endDate, endTime || "23:59");
    if (endDT < startDT) {
      window.alert("结束时间不能早于开始时间");
      return null;
    }

    return {
      id: editEventId || "",
      title: title,
      color: color,
      startDate: startDate,
      startTime: startTime,
      endDate: endDate,
      endTime: endTime,
      desc: desc,
      done: done
    };
  }

  function getEventsOnDate(dateKey) {
    return events
      .filter((ev) => isEventOnDate(ev, dateKey))
      .sort(compareEvents);
  }

  function isEventOnDate(ev, dateKey) {
    return dateKey >= ev.startDate && dateKey <= ev.endDate;
  }

  function compareEvents(a, b) {
    const aStart = toComparableDateTime(a.startDate, a.startTime || "00:00");
    const bStart = toComparableDateTime(b.startDate, b.startTime || "00:00");
    if (aStart !== bStart) return aStart.localeCompare(bStart);

    const aEnd = toComparableDateTime(a.endDate, a.endTime || "23:59");
    const bEnd = toComparableDateTime(b.endDate, b.endTime || "23:59");
    if (aEnd !== bEnd) return aEnd.localeCompare(bEnd);

    return a.title.localeCompare(b.title);
  }

  function formatEventTimeRange(ev) {
    const sameDay = ev.startDate === ev.endDate;

    if (sameDay) {
      if (ev.startTime && ev.endTime) return ev.startTime + " - " + ev.endTime;
      if (ev.startTime) return ev.startTime;
      if (ev.endTime) return ev.endTime;
      return ev.startDate + " 全天";
    }

    const startText = ev.startDate + (ev.startTime ? " " + ev.startTime : "");
    const endText = ev.endDate + (ev.endTime ? " " + ev.endTime : "");
    return startText + " -> " + endText;
  }

  function loadEvents() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return seedEvents();

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeEvent).filter(Boolean).sort(compareEvents);
      }

      if (parsed && typeof parsed === "object") {
        const migrated = [];
        Object.keys(parsed).forEach((dateKey) => {
          const items = Array.isArray(parsed[dateKey]) ? parsed[dateKey] : [];
          items.forEach((item) => {
            migrated.push(
              normalizeEvent({
                id: generateEventId(),
                title: item.title || "",
                desc: item.desc || "",
                color: item.color || DEFAULT_COLOR,
                startDate: dateKey,
                startTime: item.startTime || item.time || "",
                endDate: item.endDate || dateKey,
                endTime: item.endTime || "",
                done: !!item.done
              })
            );
          });
        });
        return migrated.filter(Boolean).sort(compareEvents);
      }

      return seedEvents();
    } catch (_) {
      return seedEvents();
    }
  }

  function saveEventsLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }

  async function persistEvents(message) {
    saveEventsLocal();
    await saveEventsToCloud(message);
  }

  async function hydrateFromCloud(forceOverride) {
    const store = getCloudStore();
    if (!store) return;

    try {
      const remote = await store.fetchJson(CLOUD_NAMESPACE);
      if (!Array.isArray(remote)) return;

      const normalized = remote.map(normalizeEvent).filter(Boolean).sort(compareEvents);
      if (!forceOverride && normalized.length === 0 && events.length > 0) {
        await tryBootstrapCloud();
        return;
      }

      events = normalized;
      saveEventsLocal();
      render();
    } catch (err) {
      console.warn("[calendar] cloud read failed", err);
    }
  }

  async function saveEventsToCloud(message) {
    const store = getCloudStore();
    if (!store) return;

    try {
      await store.saveJson(CLOUD_NAMESPACE, events, message || "calendar update");
    } catch (err) {
      console.warn("[calendar] cloud write failed", err);
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
      window.alert("需要先输入 GitHub Token，才能在所有设备同步日历。\n你可以在协作页先连接仓库，再回来编辑。");
      return false;
    }

    return true;
  }

  async function tryBootstrapCloud() {
    const store = getCloudStore();
    if (!store || !events.length) return;
    if (typeof store.hasToken !== "function" || !store.hasToken()) return;

    try {
      await store.saveJson(CLOUD_NAMESPACE, events, "bootstrap calendar data");
    } catch (err) {
      console.warn("[calendar] cloud bootstrap failed", err);
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

  function seedEvents() {
    return [];
  }

  function normalizeEvent(item) {
    if (!item) return null;

    const title = String(item.title || "").trim();
    const startDate = String(item.startDate || "").trim();
    const endDateRaw = String(item.endDate || "").trim();
    const startTime = String(item.startTime || "").trim();
    const endTime = String(item.endTime || "").trim();

    if (!title || !isDateKey(startDate)) return null;

    const endDate = isDateKey(endDateRaw) ? endDateRaw : startDate;

    return {
      id: String(item.id || generateEventId()),
      title: title,
      color: normalizeColor(item.color || DEFAULT_COLOR),
      startDate: startDate,
      startTime: isTimeFormat(startTime) ? startTime : "",
      endDate: endDate,
      endTime: isTimeFormat(endTime) ? endTime : "",
      desc: String(item.desc || "").trim(),
      done: !!item.done
    };
  }

  function generateEventId() {
    return "ev_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function toComparableDateTime(dateKey, time) {
    return dateKey + "T" + (time || "00:00");
  }

  function formatDateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function isDateKey(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  function isTimeFormat(value) {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
  }

  function normalizeColor(value) {
    const color = String(value || "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(color)) return color.toLowerCase();
    return DEFAULT_COLOR;
  }

  function alphaColor(hex, alpha) {
    const safe = normalizeColor(hex);
    const r = parseInt(safe.slice(1, 3), 16);
    const g = parseInt(safe.slice(3, 5), 16);
    const b = parseInt(safe.slice(5, 7), 16);
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (ch) => {
      const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
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
