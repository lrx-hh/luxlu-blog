(function () {
  const PUBLIC_KEY = "luxlu_public_guestbook_v1";
  const EMAIL = "1396343486@qq.com";

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (ch) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
  }

  function getList() {
    try {
      const raw = localStorage.getItem(PUBLIC_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (_) {
      return [];
    }
  }

  function saveList(list) {
    localStorage.setItem(PUBLIC_KEY, JSON.stringify(list.slice(0, 80)));
  }

  function renderList() {
    const host = document.getElementById("luxlu-public-list");
    if (!host) return;
    const list = getList();
    if (!list.length) {
      host.innerHTML = "<li class=\"luxlu-public-empty\">\u4f60\u60f3\u505a\u7b2c\u4e00\u4e2a\u4eba\u5417^^<\/li>";
      return;
    }

    host.innerHTML = list
      .slice()
      .reverse()
      .map((item) => {
        return (
          '<li class="luxlu-public-item">' +
          '<div class="meta">' +
          '<span class="name">' + escapeHtml(item.nickname) + '</span>' +
          '<time>' + escapeHtml(item.time) + '</time>' +
          '</div>' +
          '<p>' + escapeHtml(item.message) + '</p>' +
          '</li>'
        );
      })
      .join("");
  }

  async function sendMail(subject, nickname, message) {
    return fetch("https://formsubmit.co/ajax/" + EMAIL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        _subject: subject,
        nickname: nickname,
        message: message,
        _captcha: "false"
      })
    });
  }

  function nowText() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return y + "-" + m + "-" + dd + " " + hh + ":" + mm;
  }

  function init() {
    const publicForm = document.getElementById("luxlu-public-form");
    const publicStatus = document.getElementById("luxlu-public-status");
    const whisperForm = document.getElementById("luxlu-whisper-form");
    const whisperStatus = document.getElementById("luxlu-whisper-status");
    if (!publicForm || !whisperForm) return;

    renderList();

    publicForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(publicForm);
      const nickname = String(fd.get("nickname") || "").trim();
      const message = String(fd.get("message") || "").trim();
      if (!nickname || !message) return;

      const list = getList();
      list.push({ nickname: nickname, message: message, time: nowText() });
      saveList(list);
      renderList();
      publicForm.reset();

      if (publicStatus) publicStatus.textContent = "留言已发布。";

      try {
        await sendMail("luxlu blog 公开留言", nickname, message);
      } catch (_) {
        // ignore network errors for non-blocking UX
      }
    });

    whisperForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(whisperForm);
      const nickname = String(fd.get("nickname") || "").trim();
      const message = String(fd.get("message") || "").trim();
      if (!nickname || !message) return;

      if (whisperStatus) whisperStatus.textContent = "发送中...";
      try {
        const res = await sendMail("luxlu blog 悄悄话", nickname, message);
        if (!res.ok) throw new Error("bad");
        whisperForm.reset();
        if (whisperStatus) whisperStatus.textContent = "悄悄话发送成功。";
      } catch (_) {
        if (whisperStatus) whisperStatus.textContent = "发送失败，请稍后再试。";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("pjax:complete", init);
})();
