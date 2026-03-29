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

    const url = rawUrl(path) + "?t=" + Date.now();
    const res = await fetch(url, { cache: "no-store" });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("cloud read failed: HTTP " + res.status);

    const text = await res.text();
    if (!text || !text.trim()) return null;
    return JSON.parse(text);
  }

  async function saveJson(namespace, payload, message) {
    const path = FILE_MAP[namespace];
    if (!path) throw new Error("unknown namespace");

    const token = getToken();
    if (!token) throw new Error("missing github token");

    const repo = getRepo();
    let sha = "";

    const getRes = await fetch(contentUrl(path) + "?ref=" + encodeURIComponent(repo.branch), {
      headers: apiHeaders(false, token)
    });

    if (getRes.ok) {
      const file = await getRes.json();
      sha = file.sha || "";
    } else if (getRes.status !== 404) {
      throw new Error(await readError(getRes));
    }

    const body = {
      message: message || ("sync " + namespace + " data"),
      content: utf8ToBase64(JSON.stringify(payload, null, 2) + "\n"),
      branch: repo.branch
    };
    if (sha) body.sha = sha;

    const putRes = await fetch(contentUrl(path), {
      method: "PUT",
      headers: apiHeaders(true, token),
      body: JSON.stringify(body)
    });

    if (!putRes.ok) throw new Error(await readError(putRes));
    return putRes.json();
  }

  function apiHeaders(withJson, token) {
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + token
    };
    if (withJson) headers["Content-Type"] = "application/json";
    return headers;
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
