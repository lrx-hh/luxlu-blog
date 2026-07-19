---
title: 今天吃什么
date: 2026-04-02 00:45:00
comments: false
top_img: /img/black-pink-cover.svg
description: 早餐午餐晚餐分开转盘，点一下就决定吃什么
---

<link rel="stylesheet" href="/css/food-wheel.css?v=20260402a3">

<section class="food-wheel-shell">
<div class="food-wheel-glow food-wheel-glow-a"></div>
<div class="food-wheel-glow food-wheel-glow-b"></div>

<header class="food-wheel-head">
<p class="food-wheel-eyebrow">LUXLU FOOD DECIDER</p>
<h1>今天吃什么</h1>
<p>早餐 / 午餐 / 晚餐分开转盘，直接点按钮随机抽，纠结终结者。</p>
</header>

<section class="meal-grid">
<article class="meal-wheel-card" data-meal="breakfast">
<h2>早餐转盘</h2>
<p class="meal-subtitle">今天早上吃点什么</p>
<div class="wheel-wrap">
<canvas class="meal-wheel-canvas" width="520" height="520" aria-label="早餐转盘"></canvas>
</div>
<div class="wheel-btn-row">
<button class="food-btn spin-btn" type="button">转一下</button>
<button class="food-btn ghost refill-btn" type="button">换一组</button>
</div>
<p class="meal-result">点击“转一下”开始</p>
<div class="meal-options"></div>
</article>

<article class="meal-wheel-card" data-meal="lunch">
<h2>午餐转盘</h2>
<p class="meal-subtitle">中午吃啥不再犹豫</p>
<div class="wheel-wrap">
<canvas class="meal-wheel-canvas" width="520" height="520" aria-label="午餐转盘"></canvas>
</div>
<div class="wheel-btn-row">
<button class="food-btn spin-btn" type="button">转一下</button>
<button class="food-btn ghost refill-btn" type="button">换一组</button>
</div>
<p class="meal-result">点击“转一下”开始</p>
<div class="meal-options"></div>
</article>

<article class="meal-wheel-card" data-meal="dinner">
<h2>晚餐转盘</h2>
<p class="meal-subtitle">晚上来点快乐晚饭</p>
<div class="wheel-wrap">
<canvas class="meal-wheel-canvas" width="520" height="520" aria-label="晚餐转盘"></canvas>
</div>
<div class="wheel-btn-row">
<button class="food-btn spin-btn" type="button">转一下</button>
<button class="food-btn ghost refill-btn" type="button">换一组</button>
</div>
<p class="meal-result">点击“转一下”开始</p>
<div class="meal-options"></div>
</article>
</section>
</section>

<script src="/js/food-wheel.js?v=20260402a4"></script>
<script>
(function () {
  const FIX_KEY = "luxlu_eat_pre_fix_once_v1";

  function hasWrongCodeBlock() {
    const code = document.querySelector("#article-container pre code");
    if (!code) return false;
    const text = code.textContent || "";
    return /meal-wheel-card|meal-result|wheel-wrap|meal-wheel-canvas/.test(text);
  }

  function runFix() {
    if (!hasWrongCodeBlock()) return;
    if (sessionStorage.getItem(FIX_KEY) === "1") return;

    sessionStorage.setItem(FIX_KEY, "1");
    const next = new URL(window.location.href);
    next.searchParams.set("refresh", Date.now().toString());
    window.location.replace(next.toString());
  }

  document.addEventListener("DOMContentLoaded", runFix);
  document.addEventListener("pjax:complete", runFix);
})();
</script>
