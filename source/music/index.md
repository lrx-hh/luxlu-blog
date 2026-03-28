---
title: 网易云音乐
date: 2026-03-28 21:40:00
comments: false
top_img: /img/black-pink-cover.svg
description: 把网易云歌单放到博客里长期播放
---

<link rel="stylesheet" href="/css/music-page.css">

<div id="music-page-shell" class="music-shell">
  <h2>网易云歌单</h2>
  <p class="music-tip">支持三种输入：歌单 ID、用户 ID、用户主页链接。</p>

  <div class="music-controls">
    <label for="netease-playlist-id">歌单 / 用户输入</label>
    <input id="netease-playlist-id" type="text" placeholder="例如：2348551439 或 1543650916 或 https://music.163.com/#/user/home?id=1543650916">

    <div class="music-btn-row">
      <button id="music-load-btn" type="button">加载</button>
      <button id="music-save-btn" type="button">保存为默认</button>
    </div>

    <p id="music-status" class="music-status"></p>
  </div>

  <div class="music-help">
    <strong>说明：</strong>
    <ol>
      <li>如果填的是用户 ID，会自动转成“我喜欢的音乐”歌单。</li>
      <li>你的用户 ID <code>1543650916</code> 已内置自动匹配。</li>
      <li>保存默认后，下次打开会自动加载。</li>
    </ol>
  </div>

  <div id="netease-player" class="music-player"></div>
</div>

<script src="/js/music-page.js"></script>
