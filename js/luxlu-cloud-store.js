(function () {
  const DEFAULT_REPO = {
    owner: "lrx-hh",
    repo: "luxlu-blog",
    branch: "main"
  };

  const STORAGE_KEYS = {
    owner: "luxlu_collab_owner_v1",
    repo: "luxlu_collab_repo_v1",
    branch: "luxlu_collab_branch_v1",
    tokenA: "luxlu_cloud_token_v1",
    tokenB: "luxlu_collab_token_v1"
  };

  const FILE_MAP = {
    calendar: "source/_data/luxlu-calendar.json",
    diary: "source/_data/luxlu-diary.json"
  };

  function getRepo() {
    return {
      owner: localStorage.getItem(STORAGE_KEYS.owner) || DEFAULT_REPO.owner,
      repo: localStorage.getItem(STORAGE_KEYS.repo) || DEFAULT_REPO.repo,
      branch: localStorage.getItem(STORAGE_KEYS.branch) || DEFAULT_REPO.branch
    };
  }

  function getToken() {
    return (
      sessionStorage.getItem(STORAGE_KEYS.tokenA) ||
      sessionStorage.getItem(STORAGE_KEYS.tokenB) ||
      ""
    ).trim();
  }

  function setToken(token) {
    const safe = String(token || "").trim();
    if (!safe) return;
    sessionStorage.setItem(STORAGE_KEYS.tokenA, safe);
    sessionStorage.setItem(STORAGE_KEYS.tokenB, safe);
  }

  function clearToken() {
    sessionStorage.removeItem(STORAGE_KEYS.tokenA);
    sessionStorage.removeItem(STORAGE_KEYS.tokenB);
  }

  function hasToken() {
    return !!getToken();
  }

  async function ensureToken() {
    if (hasToken()) return true;
    const input = window.prompt("请输入 GitHub PAT（仅保存在当前浏览器会话，用于日历/日记跨设备同步）");
    if (!input) return false;
    const token = String(input).trim();
    if (!token) return false;
    setToken(token);
    return true;
  }

  function rawUrl(path) {
    const repo = getRepo();
    return (
      "https://raw.githubusercontent.com/" +
      encodeURIComponent(repo.owner) +
      "/" +
      encodeURIComponent(repo.repo) +
      "/" +
      encodeURIComponent(repo.branch) +
      "/" +
      path
    );
  }

  function jsdelivrUrl(path) {
    const repo = getRepo();
    return (
      "https://cdn.jsdelivr.net/gh/" +
      encodeURIComponent(repo.owner) +
      "/" +
      encodeURIComponent(repo.repo) +
      "@" +
      encodeURIComponent(repo.branch) +
      "/" +
      path
    );
  }

  function contentUrl(path) {
    const repo = getRepo();
    const encodedPath = path
      .split("/")
      .filter(Boolean)
      .map((seg) => encodeURIComponent(seg))
      .join("/");

    return (
      "https://api.github.com/repos/" +
      encodeURIComponent(repo.owner) +
      "/" +
      encodeURIComponent(repo.repo) +
      "/contents/" +
      encodedPath
    );
  }

  async function fetchJson(namespace) {
    const path = FILE_MAP[namespace];
    if (!path) throw new Error("unknown namespace");
    const repo = getRepo();
    const token = getToken();
    const errors = [];

    try {
      const apiRes = await fetch(contentUrl(path) + "?ref=" + encodeURIComponent(repo.branch), {
        headers: apiHeaders(false, token),
        cache: "no-store"
      });

      if (apiRes.status === 404) return null;
      if (apiRes.ok) {
        const file = await apiRes.json();
        const content = String(file && file.content ? file.content : "").replace(/\n/g, "");
        if (!content.trim()) return null;
        return JSON.parse(base64ToUtf8(content));
      }
      errors.push("api:" + (await readError(apiRes)));
    } catch (err) {
      errors.push("api:" + getErrMessage(err));
    }

    const candidates = [rawUrl(path), jsdelivrUrl(path)];
    for (let i = 0; i < candidates.length; i += 1) {
      const url = candidates[i] + "?t=" + Date.now();
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (res.status === 404) return null;
        if (!res.ok) {
          errors.push("fallback" + i + ":HTTP " + res.status);
          continue;
        }

        const text = await res.text();
        if (!text || !text.trim()) return null;
        return JSON.parse(text);
      } catch (err) {
        errors.push("fallback" + i + ":" + getErrMessage(err));
      }
    }

    throw new Error("cloud read failed: " + errors.join(" | "));
  }

  async function saveJson(namespace, payload, message) {
    const path = FILE_MAP[namespace];
    if (!path) throw new Error("unknown namespace");

    const token = getToken();
    if (!token) throw new Error("missing github token");

    const repo = getRepo();
    const content = utf8ToBase64(JSON.stringify(payload, null, 2) + "\n");
    let lastError = "cloud write failed";

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const sha = await fetchFileSha(path, repo.branch, token);

      const body = {
        message: message || ("sync " + namespace + " data"),
        content: content,
        branch: repo.branch
      };
      if (sha) body.sha = sha;

      const putRes = await fetch(contentUrl(path), {
        method: "PUT",
        headers: apiHeaders(true, token),
        body: JSON.stringify(body)
      });

      if (putRes.ok) return putRes.json();

      const errMsg = await readError(putRes);
      lastError = errMsg;
      if (isShaConflict(putRes.status, errMsg) && attempt < 2) {
        await sleep(250 + attempt * 300);
        continue;
      }
      throw new Error(errMsg);
    }

    throw new Error(lastError);
  }

  async function fetchFileSha(path, branch, token) {
    const getRes = await fetch(contentUrl(path) + "?ref=" + encodeURIComponent(branch), {
      headers: apiHeaders(false, token),
      cache: "no-store"
    });
    if (getRes.status === 404) return "";
    if (!getRes.ok) throw new Error(await readError(getRes));
    const file = await getRes.json();
    return String(file && file.sha ? file.sha : "");
  }

  function isShaConflict(status, message) {
    if (status === 409) return true;
    if (status === 422) return /sha|does not match|update is not a fast forward/i.test(String(message || ""));
    return /sha|does not match/i.test(String(message || ""));
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function apiHeaders(withJson, token) {
    const headers = { Accept: "application/vnd.github+json" };
    const safeToken = String(token || "").trim();
    if (safeToken) headers.Authorization = "Bearer " + safeToken;
    if (withJson) headers["Content-Type"] = "application/json";
    return headers;
  }

  function base64ToUtf8(text) {
    const binary = atob(String(text || "").replace(/\s+/g, ""));
    let escaped = "";
    for (let i = 0; i < binary.length; i += 1) {
      const code = binary.charCodeAt(i).toString(16).padStart(2, "0");
      escaped += "%" + code;
    }
    return decodeURIComponent(escaped);
  }

  async function readError(res) {
    try {
      const data = await res.json();
      if (data && data.message) return data.message;
      return "HTTP " + res.status;
    } catch (_) {
      return "HTTP " + res.status;
    }
  }

  function utf8ToBase64(text) {
    try {
      return btoa(unescape(encodeURIComponent(text)));
    } catch (_) {
      const bytes = new TextEncoder().encode(text);
      let binary = "";
      for (let i = 0; i < bytes.length; i += 1) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }
  }

  function getErrMessage(err) {
    if (!err) return "unknown error";
    if (typeof err === "string") return err;
    return err.message || "unknown error";
  }

  window.luxluCloudStore = {
    getRepo: getRepo,
    getToken: getToken,
    setToken: setToken,
    clearToken: clearToken,
    hasToken: hasToken,
    ensureToken: ensureToken,
    fetchJson: fetchJson,
    saveJson: saveJson
  };
})();
