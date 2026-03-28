---
title: 网易云音乐
date: 2026-03-28 21:40:00
comments: false
top_img: /img/black-pink-cover.svg
description: 把网易云歌单放到博客里长期播放。
---

<link rel="stylesheet" href="/css/music-page.css">

<div id="music-page-shell" class="music-shell">
  <h2>网易云歌单</h2>
  <p class="music-tip">把你的网易云歌单 ID 填进去（“我喜欢的音乐”也可以）。</p>
  <div class="music-controls">
    <label for="netease-playlist-id">歌单 ID</label>
    <input id="netease-playlist-id" type="text" placeholder="例如：3778678">
    <div class="music-btn-row">
      <button id="music-load-btn" type="button">加载歌单</button>
      <button id="music-save-btn" type="button">保存为默认</button>
    </div>
    <p id="music-status" class="music-status"></p>
  </div>

  <div class="music-help">
    <strong>怎么找“我喜欢的音乐”ID：</strong>
    <ol>
      <li>在网易云打开“我喜欢的音乐”歌单页面</li>
      <li>看浏览器地址栏，找到 <code>?id=数字</code></li>
      <li>把这个数字填到上面的输入框</li>
    </ol>
  </div>

  <div id="netease-player" class="music-player"></div>
</div>

<script src="/js/music-page.js"></script>

