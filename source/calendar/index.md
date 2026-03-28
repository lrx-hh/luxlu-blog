---
title: 私人日历
date: 2026-03-28 19:00:00
comments: false
top_img: /img/black-pink-cover.svg
description: 仅主人可编辑的训练日历页。
---

<link rel="stylesheet" href="/css/calendar-3d.css">

<section class="calendar-shell">
  <div class="calendar-glow glow-a"></div>
  <div class="calendar-glow glow-b"></div>

  <header class="calendar-top">
    <div>
      <p class="calendar-eyebrow">LUXLU PRIVATE MODE</p>
      <h1>训练日历</h1>
      <p class="calendar-note">访客只读。输入主人口令后可增删改日程。</p>
    </div>
    <div class="calendar-actions">
      <button id="owner-toggle" class="cal-btn cal-btn-owner" type="button">进入主人模式</button>
      <button id="today-btn" class="cal-btn" type="button">回到今天</button>
    </div>
  </header>

  <div class="calendar-panel">
    <div class="month-bar">
      <button id="prev-month" class="month-btn" type="button">‹</button>
      <h2 id="month-title"></h2>
      <button id="next-month" class="month-btn" type="button">›</button>
    </div>
    <div class="week-head">
      <span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span>
    </div>
    <div id="calendar-grid" class="calendar-grid"></div>
  </div>

  <aside class="agenda-panel" id="agenda-panel">
    <h3 id="agenda-title">今日安排</h3>
    <ul id="agenda-list"></ul>
    <button id="add-item-btn" class="cal-btn cal-btn-owner hidden" type="button">新增日程</button>
  </aside>
</section>

<dialog id="edit-dialog">
  <form method="dialog" id="edit-form">
    <h3 id="dialog-title">编辑日程</h3>
    <label>时间（如 20:30）<input id="item-time" maxlength="5" placeholder="20:30"></label>
    <label>标题<input id="item-title" maxlength="40" placeholder="做 2 道隐写题"></label>
    <label>详情<input id="item-desc" maxlength="80" placeholder="zsteg + stegsolve 复盘"></label>
    <menu>
      <button value="cancel" type="button" id="delete-item-btn" class="danger hidden">删除</button>
      <button value="cancel" type="button" id="cancel-btn">取消</button>
      <button value="confirm" type="submit">保存</button>
    </menu>
  </form>
</dialog>

<script src="/js/calendar-3d.js"></script>
