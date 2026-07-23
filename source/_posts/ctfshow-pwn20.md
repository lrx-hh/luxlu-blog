---
title: "[ pwn 学习 ] CTFshow-pwn20 RELRO与GOT表"
date: 2026-07-22 22:33:00
categories:
  - CTF
  - Pwn
tags:
  - CTF
  - Pwn
  - CTFShow
---

# 1. 提交格式

提交 `ctfshow{【.got表与.got.plt是否可写(可写为1，不可写为0)】,【.got的地址】,【.got.plt的地址】}`

4 个问题：2 个"能不能写"，2 个"地址是多少"。

# 2. IDA

```c
int main(int argc, const char **argv) {
    puts("...* Hint: What is RELRO protection ? ...");
    long addr = strtol(argv[1], NULL, 16);
    *(long *)addr = 0x52454c52;           // 往地址写入 "RELR"
    printf("RELRO: %x", *(int *)addr);    // 读出来显示
    return 0;
}
```

**你给它一个地址 → 它往里写 "RELR" → 读出来显示给你。**

| 地址可写 | 地址不可写 |
| --- | --- |
| 打印 `RELRO: 52454c52` | 程序段错误崩溃 |

程序本质上就是一个 **GOT 表可写性测试器**。

# 3. 前置基础：程序怎么找到函数

代码里写 `printf("hello")`，但 `printf` 的真实代码在 `libc` 里。编译时不知道运行时 `libc` 会加载到哪个位置，所以程序准备了两张表：

+ **PLT 表** — 中转折，负责任务分发
+ **GOT 表** — 电话簿，记录每个函数真正的内存地址

## 3.1 GOT 表两部分

| | `.got` | `.got.plt` |
| --- | --- | --- |
| 存放内容 | 杂项（全局变量地址等） | **函数指针**（每个外部函数一个条目） |
| 条目数量 | 很少（2-4 条） | 较多（每个导入函数一条） |
| 是攻击目标吗 | 不太是 | **是的** |

## 3.2 为什么 GOT 表需要能写

Linux 默认**延迟绑定（Lazy Binding）**：用到哪个函数才查哪个，查到后把地址填入 GOT 表。

| 时机 | GOT 表里 `printf` 那一栏 |
| --- | --- |
| 还没调用过 `printf` | "去找 ld.so 帮忙查" |
| 第一次调用 `printf` | ld.so 查到地址，填入 |
| 之后再调用 `printf` | 地址已在表里，直接跳转 |

GOT 表在运行过程中需要被写入，这就留下了攻击面。

# 4. 漏洞点：GOT 劫持

```basic
原来 GOT 表：  printf → 0x7f1234567890 (libc 里 printf 的地址)
                                  ↓ 黑客改成
改后 GOT 表：  printf → 0x7f9988776655 (system 函数的地址)
```

之后程序调用 `printf("/bin/sh")`，实际执行的是 `system("/bin/sh")` — 拿到 shell。这就是 **GOT 劫持（GOT Hijacking）**。

# 5. RELRO：给 GOT 上锁

RELRO（RELocation Read-Only）把重定位相关表设为只读。

## 5.1 三种等级

| 等级 | 保护程度 | .got 能写？ | .got.plt 能写？ | 备注 |
| --- | --- | --- | --- | --- |
| No RELRO | 🔓 完全没上锁 | ✅ | ✅ | 想怎么改都行 |
| Partial RELRO | 🔐 上了一半锁 | ❌ | ✅ | .got 锁了，.got.plt 还需支持延迟绑定 |
| Full RELRO | 🔒 锁死了 | ❌ | ❌ | 启动时一次性全部填好，然后焊死 |

## 5.2 怎么判断

| 方法 | No RELRO | Partial RELRO | Full RELRO |
| --- | --- | --- | --- |
| `checksec` | `No RELRO` | `Partial RELRO` | `Full RELRO` |
| 有 `GNU_RELRO` 段？ | ❌ | ✅ | ✅ |
| 有 `BIND_NOW`？ | ❌ | ❌ | ✅ |

# 6. 解题

## 6.1 可写性

`checksec`：

![](/img/yuque/1784727082855-5541e3aa-c324-450b-a689-7db14ee91aad.png)

`RELRO: NO RELRO` — 两张表都能写，前两个空填 **1** 和 **1**。

## 6.2 找两张表地址

`readelf -S pwn20 | grep -A "\.got"`：

![](/img/yuque/1784729947150-b068ab5b-91af-4e28-8d74-3ab3e67f3842.png)

直接得到 `.got` 和 `.got.plt` 地址，标志 `WA`（可写）。

## 6.3 可选验证

程序本身就可以验证：给它地址，能写入就说明可写。

写 `.got` 表：

![](/img/yuque/1784730094380-7c6b3e02-4dcd-4290-97b0-ab62381666f2.png)

`52454c52` = `"RELR"` 写入成功。

写 `.got.plt` 表：

![](/img/yuque/1784730275999-c7906b73-01ee-4f3f-8921-391c0aead5a9.png)

## 6.4 flag

`ctfshow{1_1_0x600f18_0x600f28}`
