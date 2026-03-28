(function () {
  const STORAGE_KEY = "luxlu_netease_playlist_id_v1";
  const DEFAULT_PLAYLIST_ID = "3778678";

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

  function ensurePlayerAssets() {
    return ensureCss("https://cdn.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.css")
      .then(() => ensureScript("https://cdn.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.js"))
      .then(() => ensureScript("https://cdn.jsdelivr.net/npm/meting@2.0.1/dist/Meting.min.js"));
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

  function initMusicPage() {
    const shell = document.getElementById("music-page-shell");
    if (!shell) return;
    if (shell.dataset.musicInit === "1") return;
    shell.dataset.musicInit = "1";

    const input = document.getElementById("netease-playlist-id");
    const loadBtn = document.getElementById("music-load-btn");
    const saveBtn = document.getElementById("music-save-btn");
    if (!input || !loadBtn || !saveBtn) return;

    const savedId = localStorage.getItem(STORAGE_KEY) || DEFAULT_PLAYLIST_ID;
    input.value = savedId;
    updateStatus("正在加载播放器...");

    ensurePlayerAssets()
      .then(() => {
        renderPlaylist(savedId);
        updateStatus("已加载歌单 ID: " + savedId);
      })
      .catch((err) => {
        updateStatus(err.message, true);
      });

    loadBtn.addEventListener("click", () => {
      const id = (input.value || "").trim();
      if (!/^\d+$/.test(id)) {
        updateStatus("歌单 ID 必须是纯数字", true);
        return;
      }
      renderPlaylist(id);
      updateStatus("已加载歌单 ID: " + id);
    });

    saveBtn.addEventListener("click", () => {
      const id = (input.value || "").trim();
      if (!/^\d+$/.test(id)) {
        updateStatus("歌单 ID 必须是纯数字", true);
        return;
      }
      localStorage.setItem(STORAGE_KEY, id);
      renderPlaylist(id);
      updateStatus("已保存并加载: " + id);
    });
  }

  document.addEventListener("DOMContentLoaded", initMusicPage);
  document.addEventListener("pjax:complete", initMusicPage);
})();

