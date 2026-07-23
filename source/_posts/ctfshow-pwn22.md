---
title: "[ pwn 学习 ] CTFshow-pwn22 Full RELRO"
date: 2026-07-23 23:00:00
categories:
  - CTF
  - Pwn
tags:
  - CTF
  - Pwn
  - CTFShow
---

# 1. 基础信息

![](/img/yuque/1784818928732-1c9957af-417f-4211-8531-2a994de457f4.png)

`Full RELRO`，`.got` 和 `.got.plt` 都不可写。

思路是**直接放弃延迟绑定，启动时一次性查完所有函数地址填好，然后把整本电话簿焊死**。

# 2. Full RELRO 的两个标志

## 2.1 `BIND_NOW` — 立刻绑定

```plain
readelf -d pwn22 | grep -i "bind\|flags"
```

![](/img/yuque/1784819103768-926a9208-a061-48de-8cf9-2ed1be811df6.png)

`BIND_NOW` 告诉动态链接器：**程序启动时就把所有函数地址全部查完，不要等第一次调用再查。** 这是 `Full RELRO` 的硬性标志。pwn20 和 pwn21 没有这一项。

## 2.2 `.got.plt` 消失了

```plain
readelf -S pwn22 | grep -A 1 "\.got"
```

![](/img/yuque/1784819269320-d66e32a9-2bf9-4475-9a01-ce0747e8cd03.png)

只有一张 `.got` 表，没有 `.got.plt`。

既然不搞延迟绑定了，那张留给链接器填地址的 `.got.plt` 表也就没存在的必要了——所有函数指针直接合进 `.got` 里，一次性填完就锁。

# 3. GNU_RELRO — 把 `.got` 也锁死

```plain
readelf -l pwn22
```

![](/img/yuque/1784819381114-6270c290-14a3-4577-a8d8-eea159350b33.png)

保护区范围：`[0x600dc0, 0x600dc0 + 0x240)` = `[0x600dc0, 0x601000)`

对照段地址：

```plain
保护区：[0x600dc0 ───────────── 0x601000)
           ↑                        ↑
    .init_array (0x600dc0)        边界线
    .fini_array (0x600dc8)           │
    .dynamic    (0x600dd0)           │
    .got        (0x600fc0) ──────────┘  ← 圈里 → 只读

.data (0x601000) ──────────────────  ← 圈外 → 可写（普通数据）
```

Section to Segment 映射确认：

![](/img/yuque/1784819459371-b852be9c-076f-4892-ac81-b2e0be9daa25.png)

`GNU_RELRO` 把 `.got` 也罩住了。启动后 `mprotect` 一把锁死，谁来写谁段错误。

对比 pwn21（Partial RELRO）：pwn21 的保护区到 `0x601000`，`.got.plt` 刚好在边界外逃过一劫。pwn22 没有 `.got.plt`，`.got` 被牢牢圈住。

# 4. 解题

- `Full RELRO` + 无 `.got.plt` → `.got` 不可写（0）、`.got.plt` 不存在/不可写（0）
- `.got` 地址 → `0x600fc0`

```plain
ctfshow{0_0_0x600fc0}
```

# 5. 三题对比速查

| | pwn20 No RELRO | pwn21 Partial | pwn22 Full |
| --- | --- | --- | --- |
| GNU_RELRO | ❌ | ✅ | ✅ |
| BIND_NOW | ❌ | ❌ | ✅ |
| .got.plt 存在？ | ✅ | ✅ | ❌ 消失了 |
| .got 可写 | ✅ 1 | ❌ 0 | ❌ 0 |
| .got.plt 可写 | ✅ 1 | ✅ 1 | ❌ 0 |
| GOT 劫持 | 随便搞 | 只能搞 .got.plt | 💀 彻底没门 |
| Flag | `{1_1_0x..._0x...}` | `{0_1_0x..._0x...}` | `{0_0_0x...}` |
