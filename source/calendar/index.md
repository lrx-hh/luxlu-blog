---
title: 私人日历
date: 2026-03-28 19:00:00
comments: false
top_img: /img/black-pink-cover.svg
description: 访客只读，主人模式可编辑日程与代办
---

<link rel="stylesheet" href="/css/calendar-3d.css">

<section class="calendar-shell">
  <div class="calendar-glow glow-a"></div>
  <div class="calendar-glow glow-b"></div>

  <header class="calendar-top">
    <div>
      <p class="calendar-eyebrow">LUXLU PRIVATE MODE</p>
      <h1>训练日历</h1>
      <p class="calendar-note">支持颜色标签、开始/结束日期时间、代办勾选完成。</p>
    </div>
    <div class="calendar-actions">
      <button id="owner-toggle" class="cal-btn cal-btn-owner" type="button">进入主人模式</button>
      <button id="today-btn" class="cal-btn" type="button">今天</button>
    </div>
  </header>

  <div class="calendar-panel">
    <div class="month-bar">
      <button id="prev-month" class="month-btn" type="button">&#8249;</button>
      <h2 id="month-title"></h2>
      <button id="next-month" class="month-btn" type="button">&#8250;</button>
    </div>
    <div class="week-head">
      <span>周一</span><span>周二</span><span>周三</span><span>周四</span><span>周五</span><span>周六</span><span>周日</span>
    </div>
    <div id="calendar-grid" class="calendar-grid"></div>
  </div>

  <aside class="agenda-panel" id="agenda-panel">
    <h3 id="agenda-title">今日安排</h3>
    <ul id="agenda-list"></ul>
    <button id="add-item-btn" class="cal-btn cal-btn-owner hidden" type="button">新增日程</button>
  </aside>

  <button id="quick-add-btn" class="calendar-fab" type="button">+ 新增日程</button>
</section>

<dialog id="edit-dialog">
  <form method="dialog" id="edit-form">
    <h3 id="dialog-title">编辑日程</h3>

    <label>标题
      <input id="item-title" maxlength="60" placeholder="例如：CISCN 半决赛">
    </label>

    <label>标签颜色
      <div class="color-row">
        <input id="item-color" type="color" value="#ff4fa3">
      </div>
    </label>

    <div class="date-time-grid">
      <label>开始日期
        <input id="item-start-date" type="date">
      </label>
      <label>开始时间
        <input id="item-start-time" type="time">
      </label>
      <label>结束日期
        <input id="item-end-date" type="date">
      </label>
      <label>结束时间
        <input id="item-end-time" type="time">
      </label>
    </div>

    <label>说明
      <input id="item-desc" maxlength="120" placeholder="可选，记录任务细节">
    </label>

    <label class="todo-toggle">
      <input id="item-done" type="checkbox">
      <span>标记为已完成</span>
    </label>

    <menu>
      <button value="cancel" type="button" id="delete-item-btn" class="danger hidden">删除</button>
      <button value="cancel" type="button" id="cancel-btn">取消</button>
      <button value="confirm" type="submit">保存</button>
    </menu>
  </form>
</dialog>

<script src="/js/calendar-3d.js"></script>
