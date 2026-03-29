---
title: 协作项目
date: 2026-03-28 22:50:00
comments: false
top_img: /img/black-pink-cover.svg
description: 队友协作写作与文件上传工作台
---

<link rel="stylesheet" href="/css/collab-workbench.css?v=20260329c2">

<section class="collab-shell">
<div class="collab-glow glow-a"></div>
<div class="collab-glow glow-b"></div>

<header class="collab-head">
<p class="collab-eyebrow">TEAM PROJECT MODE</p>
<h1>队友协作工作台</h1>
<p class="collab-desc">
三种角色：访客 / 队友 / 管理员。访客无需口令；队友和管理员都要口令。
队友只能新增文件（文章和上传），不能改已有文件；管理员可以修改任意文件。
</p>
</header>

<section class="collab-card">
<h2>1) 仓库连接</h2>
<div class="row-grid">
<label>Owner <input id="repo-owner" value="lrx-hh"></label>
<label>Repo <input id="repo-name" value="luxlu-blog"></label>
<label>Branch <input id="repo-branch" value="main"></label>
</div>
<label>GitHub Token（浏览器会话保存）
<input id="repo-token" type="password" placeholder="github_pat_xxx">
</label>
<p class="small-note">建议 Fine-grained PAT，仓库权限勾选 Contents: Read and write。</p>
<div class="btn-row">
<button id="repo-connect-btn" class="collab-btn primary" type="button">连接仓库</button>
<button id="repo-refresh-btn" class="collab-btn" type="button">刷新列表</button>
</div>
<p id="collab-status" class="status-line">状态：未连接</p>
</section>

<section class="collab-card">
<h2>2) 角色入口（三选一）</h2>
<div class="role-grid">
<button id="role-visitor-btn" class="collab-btn role-btn" type="button">访客</button>
<button id="role-team-btn" class="collab-btn role-btn" type="button">队友</button>
<button id="role-admin-btn" class="collab-btn role-btn" type="button">管理员</button>
</div>
<label>队友 / 管理员口令
<input id="role-passphrase" type="password" placeholder="输入口令">
</label>
<div class="btn-row">
<button id="role-logout-btn" class="collab-btn" type="button">退出角色</button>
</div>
<p class="small-note">当前角色：<span id="role-badge" class="badge guest">visitor</span></p>
</section>

<section class="collab-grid">
<article class="collab-card">
<h2>3) 项目文章列表（访客可看）</h2>
<ul id="project-list" class="project-list"></ul>
</article>

<article class="collab-card editor-only hidden">
<h2>4) 队友新增文章</h2>
<form id="new-post-form" class="stack">
<label>标题 <input id="post-title" maxlength="80" placeholder="例如：MISC 训练周报 #1"></label>
<label>标签（逗号分隔） <input id="post-tags" maxlength="120" placeholder="Misc,Team,Writeup"></label>
<label>正文（Markdown） <textarea id="post-body" rows="10" placeholder="写你的正文..."></textarea></label>
<button class="collab-btn primary" type="submit">新增文章文件</button>
</form>
</article>

<article class="collab-card editor-only hidden">
<h2>5) 队友上传文件</h2>
<form id="upload-form" class="stack">
<label>目标子目录（自动放在 source/uploads/team/ 下）
<input id="upload-subdir" value="shared" maxlength="40">
</label>
<label>选择文件
<input id="upload-file" type="file">
</label>
<button class="collab-btn primary" type="submit">上传文件</button>
</form>
<p id="upload-result" class="small-note"></p>
</article>

<article class="collab-card admin-only hidden">
<h2>6) 管理员编辑任意文件</h2>
<div class="stack">
<label>文件路径
<input id="admin-path" placeholder="例如：source/_posts/team/2026-03-28-demo.md">
</label>
<div class="btn-row">
<button id="admin-load-btn" class="collab-btn" type="button">读取文件</button>
<button id="admin-save-btn" class="collab-btn primary" type="button">保存文件</button>
</div>
<label>文件内容
<textarea id="admin-editor" rows="12" placeholder="加载后可编辑"></textarea>
</label>
</div>
</article>

<article class="collab-card admin-only hidden">
<h2>7) 管理员像素画板（Piskel 风格）</h2>
<div class="stack pixel-editor-shell">
<div class="row-grid pixel-controls">
<label>网格尺寸
<select id="pixel-grid-size">
<option value="16">16 x 16</option>
<option value="24">24 x 24</option>
<option value="32" selected>32 x 32</option>
<option value="48">48 x 48</option>
</select>
</label>
<label>画笔颜色
<input id="pixel-color" type="color" value="#ff4fa3">
</label>
<label>文件名（不含后缀）
<input id="pixel-file-name" value="luxlu-pixel-art" maxlength="60">
</label>
</div>
<div class="btn-row">
<button id="pixel-tool-brush" class="collab-btn role-btn active" type="button">画笔</button>
<button id="pixel-tool-eraser" class="collab-btn role-btn" type="button">橡皮</button>
<button id="pixel-clear-btn" class="collab-btn" type="button">清空画布</button>
<button id="pixel-download-btn" class="collab-btn" type="button">下载 PNG</button>
<button id="pixel-save-btn" class="collab-btn primary" type="button">保存到仓库</button>
</div>
<div class="pixel-canvas-wrap">
<canvas id="pixel-canvas" width="640" height="640" aria-label="pixel editor"></canvas>
</div>
<p id="pixel-result" class="small-note">仅管理员可见。保存路径：source/uploads/team/pixel-art/</p>
</div>
</article>

<article class="collab-card">
<h2>8) 操作日志</h2>
<pre id="collab-log" class="log-box">[ready] wait for action</pre>
</article>
</section>
</section>

<script src="/js/collab-workbench.js?v=20260329c2"></script>
