(function () {
  const STORAGE_INPUT_KEY = "luxlu_netease_input_v2";
  const STORAGE_PLAYLIST_KEY = "luxlu_netease_playlist_id_v2";
  const DEFAULT_INPUT = "1543650916";
  const DEFAULT_PLAYLIST_ID = "2348551439";

  // Known mapping for your account: uid -> liked playlist id
  const KNOWN_USER_LIKED_MAP = {
    "1543650916": "2348551439"
  };

  function ensureCss(href) {
    const exists = Array.from(document.querySelectorAll("link[rel='stylesheet']")).some((el) => el.href === href);
    if (exists) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.onload = () => resolve();
      link.onerror = () => reject(new Error("CSS 加载失败: " + href));
      document.head.appendChild(link);
    });
  }

  function ensureScript(src) {
    const exists = Array.from(document.querySelectorAll("script")).some((el) => el.src === src);
    if (exists) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("脚本加载失败: " + src));
      document.body.appendChild(script);
    });
  }

  let assetsPromise = null;
  function ensurePlayerAssets() {
    if (!assetsPromise) {
      assetsPromise = ensureCss("https://cdn.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.css")
        .then(() => ensureScript("https://cdn.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.js"))
        .then(() => ensureScript("https://cdn.jsdelivr.net/npm/meting@2.0.1/dist/Meting.min.js"));
    }
    return assetsPromise;
  }

  function renderPlaylist(playlistId) {
    const host = document.getElementById("netease-player");
    if (!host) return;
    host.innerHTML = "";

    const meting = document.createElement("meting-js");
    meting.setAttribute("server", "netease");
    meting.setAttribute("type", "playlist");
    meting.setAttribute("id", playlistId);
    meting.setAttribute("fixed", "false");
    meting.setAttribute("mini", "false");
    meting.setAttribute("autoplay", "false");
    meting.setAttribute("theme", "#ff4fa3");
    meting.setAttribute("loop", "all");
    meting.setAttribute("order", "random");
    meting.setAttribute("preload", "auto");
    meting.setAttribute("list-folded", "false");
    meting.setAttribute("list-max-height", "420px");
    host.appendChild(meting);
  }

  function updateStatus(text, isError) {
    const status = document.getElementById("music-status");
    if (!status) return;
    status.textContent = text || "";
    status.style.color = isError ? "#ffb4d8" : "#ffcde5";
  }

  function setBusyState(isBusy) {
    const loadBtn = document.getElementById("music-load-btn");
    const saveBtn = document.getElementById("music-save-btn");
    if (loadBtn) loadBtn.disabled = isBusy;
    if (saveBtn) saveBtn.disabled = isBusy;
  }

  function parseMusicInput(rawInput) {
    const value = String(rawInput || "").trim();
    if (!value) return null;

    if (/^\d+$/.test(value)) {
      return { kind: "auto", id: value, raw: value };
    }

    // 网易云常见分享链接：
    // https://music.163.com/#/user/home?id=1543650916
    // https://music.163.com/#/playlist?id=2348551439
    // https://music.163.com/user/home?id=1543650916
    // https://music.163.com/playlist?id=2348551439
    try {
      const url = new URL(value);
      const hash = (url.hash || "").replace(/^#/, "");
      const hashPath = hash.startsWith("/") ? hash : "/" + hash;
      const hashQueryIdx = hashPath.indexOf("?");
      const pathFromHash = hashQueryIdx >= 0 ? hashPath.slice(0, hashQueryIdx) : hashPath;
      const hashQuery = hashQueryIdx >= 0 ? hashPath.slice(hashQueryIdx + 1) : "";

      const normalPath = (url.pathname || "").toLowerCase();
      const normalQuery = url.searchParams;
      const hashParams = new URLSearchParams(hashQuery);

      const idFromQuery = normalQuery.get("id") || hashParams.get("id");
      if (!idFromQuery || !/^\d+$/.test(idFromQuery)) return null;

      if (normalPath.includes("/playlist") || pathFromHash.includes("/playlist")) {
        return { kind: "playlist", id: idFromQuery, raw: value };
      }
      if (normalPath.includes("/user/home") || pathFromHash.includes("/user/home")) {
        return { kind: "user", id: idFromQuery, raw: value };
      }

      return { kind: "auto", id: idFromQuery, raw: value };
    } catch (err) {
      return null;
    }
  }

  async function checkPlaylistExists(playlistId) {
    const url =
      "https://api.injahow.cn/meting/?server=netease&type=playlist&id=" +
      encodeURIComponent(playlistId) +
      "&_t=" +
      Date.now();

    const res = await fetch(url);
    if (!res.ok) return false;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0;
  }

  async function resolveUserToPlaylist(userId) {
    if (KNOWN_USER_LIKED_MAP[userId]) {
      return {
        playlistId: KNOWN_USER_LIKED_MAP[userId],
        mode: "user-known",
        userId: userId
      };
    }

    // 尝试直接调用网易云接口（部分网络环境会被 CORS 或风控拦截）
    try {
      const url =
        "https://music.163.com/api/user/playlist/?offset=0&limit=100&uid=" +
        encodeURIComponent(userId) +
        "&timestamp=" +
        Date.now();
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const payload = await res.json();
      const list = Array.isArray(payload.playlist) ? payload.playlist : [];
      if (!list.length) throw new Error("该用户没有可见歌单");

      let liked = list.find((item) => Number(item.specialType) === 5);
      if (!liked) liked = list.find((item) => String(item.userId || "") === String(userId));
      if (!liked) liked = list[0];

      const pid = String(liked.id || "");
      if (!/^\d+$/.test(pid)) throw new Error("无法解析歌单ID");

      return {
        playlistId: pid,
        mode: "user-api",
        userId: userId,
        playlistName: liked.name || ""
      };
    } catch (err) {
      throw new Error(
        "用户ID解析失败。请改填歌单ID，或先用这个用户主页打开“我喜欢的音乐”后复制歌单链接里的 id。"
      );
    }
  }

  async function resolvePlaylistByInput(rawInput) {
    const parsed = parseMusicInput(rawInput);
    if (!parsed) {
      throw new Error("输入格式不对，请输入：歌单ID / 用户ID / 网易云主页链接");
    }

    if (parsed.kind === "playlist") {
      return { playlistId: parsed.id, mode: "playlist" };
    }

    if (parsed.kind === "user") {
      return resolveUserToPlaylist(parsed.id);
    }

    // auto: 先尝试当歌单，再尝试当用户
    const maybePlaylist = await checkPlaylistExists(parsed.id).catch(() => false);
    if (maybePlaylist) {
      return { playlistId: parsed.id, mode: "playlist" };
    }
    return resolveUserToPlaylist(parsed.id);
  }

  async function loadAndRender(rawInput, persist) {
    const value = String(rawInput || "").trim();
    if (!value) {
      throw new Error("请输入内容");
    }

    const resolved = await resolvePlaylistByInput(value);
    await ensurePlayerAssets();
    renderPlaylist(resolved.playlistId);

    if (persist) {
      localStorage.setItem(STORAGE_INPUT_KEY, value);
      localStorage.setItem(STORAGE_PLAYLIST_KEY, resolved.playlistId);
    }

    if (resolved.mode === "playlist") {
      updateStatus("已加载歌单 ID: " + resolved.playlistId);
    } else {
      updateStatus("用户 " + resolved.userId + " 已自动转换歌单 ID: " + resolved.playlistId);
    }
  }

  function initMusicPage() {
    const shell = document.getElementById("music-page-shell");
    if (!shell) return;
    if (shell.dataset.musicInit === "1") return;
    shell.dataset.musicInit = "1";

    const input = document.getElementById("netease-playlist-id");
    const loadBtn = document.getElementById("music-load-btn");
    const saveBtn = document.getElementById("music-save-btn");
    if (!input || !loadBtn || !saveBtn) return;

    const savedInput = localStorage.getItem(STORAGE_INPUT_KEY) || DEFAULT_INPUT;
    const savedPlaylist = localStorage.getItem(STORAGE_PLAYLIST_KEY) || DEFAULT_PLAYLIST_ID;
    input.value = savedInput;

    updateStatus("正在加载...");
    ensurePlayerAssets()
      .then(() => {
        renderPlaylist(savedPlaylist);
        updateStatus("已加载歌单 ID: " + savedPlaylist);
      })
      .catch((err) => {
        updateStatus(err.message, true);
      });

    loadBtn.addEventListener("click", async () => {
      setBusyState(true);
      updateStatus("解析输入中...");
      try {
        await loadAndRender(input.value, false);
      } catch (err) {
        updateStatus(err.message, true);
      } finally {
        setBusyState(false);
      }
    });

    saveBtn.addEventListener("click", async () => {
      setBusyState(true);
      updateStatus("保存并加载中...");
      try {
        await loadAndRender(input.value, true);
      } catch (err) {
        updateStatus(err.message, true);
      } finally {
        setBusyState(false);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", initMusicPage);
  document.addEventListener("pjax:complete", initMusicPage);
})();
