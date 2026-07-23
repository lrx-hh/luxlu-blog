---
title: "[ pwn 学习 ] CTFshow-pwn21 Partial RELRO"
date: 2026-07-23 22:46:00
categories:
  - CTF
  - Pwn
tags:
  - CTF
  - Pwn
  - CTFShow
---

# 1. 基础信息

![](/img/yuque/1784814023872-51414c90-8806-4f3f-b54a-b49c7983f5a2.png)

和 pwn20 唯一区别：`RELRO` 从 `No RELRO` 变成 `Partial RELRO`。

# 2. 回顾：RELRO 三等级

| 等级 | `.got` 能写？ | `.got.plt` 能写？ |
| --- | --- | --- |
| No RELRO | ✅ | ✅ |
| **Partial RELRO** | **❌** | **✅** |
| Full RELRO | ❌ | ❌ |

Partial RELRO 的取舍：
- `.got` 里的数据初始化后不会再变 → 锁掉
- `.got.plt` 因为延迟绑定还要填函数地址 → 留着能写

# 3. 找两张表地址

段表 `-S` 说的都能写，**别信**。程序头 `-l` 里 `GNU_RELRO` 圈起来那块，运行时会被锁成只读。

## 3.1 `readelf -S` 先看段表

段表里两张表都标 `WA`（可写），但段表是静态声明，运行时由程序头决定。

![](/img/yuque/1784816242477-59802bf1-8e04-4949-991f-a4f4e3562b45.png)

| 段名 | 地址 | 说明 |
| --- | --- | --- |
| `.got` | **0x600ff0** | 杂项数据 |
| `.got.plt` | **0x601000** | 外部函数地址表 |

## 3.2 `readelf -l` 再看程序头（真正权限）

`readelf -l pwn21`：

![](/img/yuque/1784816191990-c1ff77e0-2857-468c-bda2-590bc4e0145d.png)

| 字段 | 值 | 含义 |
| --- | --- | --- |
| VirtAddr | 0x600e10 | 保护区起始 |
| MemSiz | 0x1f0 | 保护区大小 = 496 字节 |
| Flags | R | 只读 |

<font style="color:#DF2A3F;">保护区范围 = [0x600e10, 0x601000)</font>

对照段地址：

```plain
保护区范围：[0x600e10 —————————— 0x601000)
              ↑                      ↑
         .init_array               边界线
         .fini_array                 │
         .dynamic                    │
         .got (0x600ff0) ────────────┘  ← 在保护区内 → 只读 ❌

.got.plt (0x601000) ───────────────  ← 刚好在边界外 → 可写 ✅
```

`Section to Segment` 映射也验证了 `.got.plt` 不在 `GNU_RELRO` 内：

![](/img/yuque/1784816641569-d0f550d9-80a1-4e0c-a7b0-1644a03237b9.png)

# 4. 解题

- `Partial RELRO` → `.got` 不可写（0）、`.got.plt` 可写（1）
- `.got` 地址 → `0x600ff0`
- `.got.plt` 地址 → `0x601000`

```plain
ctfshow{0_1_0x600ff0_0x601000}
```
