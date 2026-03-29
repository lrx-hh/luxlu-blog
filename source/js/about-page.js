(function () {
  const PUBLIC_KEY = "luxlu_public_guestbook_v1";
  const EMAIL = "1396483486@qq.com";

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
    const res = await fetch("https://formsubmit.co/ajax/" + EMAIL, {
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

    let data = {};
    try {
      data = await res.json();
    } catch (_) {
      data = {};
    }

    const success = data && (data.success === true || data.success === "true");
    const messageText = (data && data.message) ? String(data.message) : "";

    return {
      ok: Boolean(res.ok && success),
      message: messageText,
      status: res.status
    };
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
        const result = await sendMail("luxlu blog 公开留言", nickname, message);
        if (!result.ok && publicStatus) {
          if (/Activation/i.test(result.message)) {
            publicStatus.textContent = "留言已发布；邮箱通知尚未激活（请先激活 FormSubmit）。";
          } else if (result.message) {
            publicStatus.textContent = "留言已发布；邮件通知失败：" + result.message;
          }
        }
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
        const result = await sendMail("luxlu blog 悄悄话", nickname, message);
        if (!result.ok) {
          if (/Activation/i.test(result.message)) {
            throw new Error("activation");
          }
          throw new Error(result.message || "bad");
        }
        whisperForm.reset();
        if (whisperStatus) whisperStatus.textContent = "悄悄话发送成功。";
      } catch (err) {
        if (!whisperStatus) return;
        const text = String((err && err.message) || "");
        if (text === "activation") {
          whisperStatus.textContent = "邮箱通知未激活，请先去 1396483486@qq.com 点开 FormSubmit 的 Activate Form 邮件。";
        } else if (text && text !== "bad") {
          whisperStatus.textContent = "发送失败：" + text;
        } else {
          whisperStatus.textContent = "发送失败，请稍后再试。";
        }
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("pjax:complete", init);
})();
