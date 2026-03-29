---
title: 关于
date: 2026-03-28 18:05:00
type: about
top_img: /img/black-pink-cover.svg
comments: false
---

<section class="about-luxlu-card">
<h2>欢迎来到luxlu的小博客</h2>
<p>什么都塞进去一点</p>
</section>

<section class="about-luxlu-card">
<h3>留言框（公开）</h3>
<p>不需要登录就可以直接发欸</p>
<form id="luxlu-public-form" class="luxlu-whisper-form">
<label>你的昵称
<input type="text" name="nickname" maxlength="30" placeholder="怎么称呼你" required>
</label>
<label>留言内容
<textarea name="message" rows="4" maxlength="400" placeholder="给luxlu留一句话吧~" required></textarea>
</label>
<button type="submit">发布留言</button>
</form>
<p id="luxlu-public-status" class="about-status"></p>
<ul id="luxlu-public-list" class="luxlu-public-list"></ul>
</section>

<section class="about-luxlu-card">
<h3>悄悄话（仅发给luxlu）</h3>
<p>这条不会公开显示，会单独发给luxlu。</p>
<form id="luxlu-whisper-form" class="luxlu-whisper-form">
<label>你的昵称
<input type="text" name="nickname" maxlength="30" placeholder="怎么称呼你" required>
</label>
<label>悄悄话内容
<textarea name="message" rows="5" maxlength="800" placeholder="想偷偷说点什么..." required></textarea>
</label>
<button type="submit">发送悄悄话</button>
</form>
<p id="luxlu-whisper-status" class="about-status"></p>
</section>

<script src="/js/about-page.js?v=20260329c"></script>
