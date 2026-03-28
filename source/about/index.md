---
title: 关于
date: 2026-03-28 18:05:00
type: about
top_img: /img/black-pink-cover.svg
comments: false
---

<section class="about-luxlu-card">
  <h2>欢迎来到luxlu的小博客</h2>
  <p>这里会记录 luxlu 的比赛日常、学习笔记和一些碎碎念。</p>
</section>

<section class="about-luxlu-card">
  <h3>留言框（公开）</h3>
  <p>这里是公开留言，大家都能看到。</p>
  <script src="https://utteranc.es/client.js"
          repo="lrx-hh/luxlu-blog"
          issue-term="pathname"
          label="guestbook"
          theme="github-dark"
          crossorigin="anonymous"
          async>
  </script>
</section>

<section class="about-luxlu-card">
  <h3>悄悄话（仅发给luxlu）</h3>
  <p>这条不会公开显示，会单独发给luxlu。</p>

  <form class="luxlu-whisper-form" action="https://formsubmit.co/1396343486@qq.com" method="POST">
    <input type="hidden" name="_subject" value="luxlu blog 悄悄话">
    <input type="hidden" name="_captcha" value="false">
    <input type="hidden" name="_template" value="table">
    <input type="hidden" name="_next" value="https://luxlu.top/about/?sent=1">
    <input type="text" name="_honey" style="display:none">

    <label>你的昵称
      <input type="text" name="nickname" maxlength="30" placeholder="怎么称呼你" required>
    </label>

    <label>悄悄话内容
      <textarea name="message" rows="5" maxlength="800" placeholder="想偷偷说点什么..." required></textarea>
    </label>

    <button type="submit">发送悄悄话</button>
  </form>
</section>
