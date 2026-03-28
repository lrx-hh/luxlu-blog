---
title: 日记
date: 2026-03-29 01:15:00
comments: false
aside: false
top_img: /img/black-pink-cover.svg
description: 访客只读，luxlu可在线编辑的日记留言板
---

<link rel="stylesheet" href="/css/diary-owner.css?v=20260329a">

<section class="diary-shell">
  <header class="diary-head">
    <div>
      <p class="diary-eyebrow">LUXLU DIARY MODE</p>
      <h1>日记留言板</h1>
      <p class="diary-note">访客可阅读，只有luxlu输入口令后可新增、编辑、删除。</p>
    </div>
    <button id="diary-owner-toggle" class="diary-btn" type="button">进入编辑模式</button>
  </header>

  <section class="diary-editor hidden" id="diary-editor">
    <h3 id="diary-editor-title">新增留言</h3>
    <textarea id="diary-input" maxlength="3000" placeholder="写下今天的内容..."></textarea>
    <div class="diary-editor-actions">
      <button id="diary-cancel" type="button" class="diary-btn ghost hidden">取消编辑</button>
      <button id="diary-save" type="button" class="diary-btn hot">保存留言</button>
    </div>
  </section>

  <ul class="diary-list" id="diary-list"></ul>
</section>

<script src="/js/diary-owner.js?v=20260329a"></script>
