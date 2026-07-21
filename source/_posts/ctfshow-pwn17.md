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
查看二进制文件安全防护

```python
checksec pwn17
  Arch:     amd64-64-little
  RELRO:    Full RELRO
  Stack:    Canary found
  NX:       NX enabled
  PIE:      PIE enabled
```

64 位程序，保护全开（Canary NX PIE 一个不少）

# 2.反编译分析（main 函数）
对 main 函数反编译后

可以看出 核心结构是一个菜单循环（while1）

+ 选项 1：`system("id")`-执行 id 命令
+ **选项 2：列出目录内容（可自定义目录）**
+ **选项 3：假装要打印 **`**flag**`**（？）**
+ 选项 4：`sleep`+认证失败提示
+ 选项 5：退出



5 个选项里值得一盯的是 Case2 和 Case3

# 3. 选项 3-烟雾弹
```c
case 3:
    sleep(1u);
    // 休眠1s
    puts("$cat /ctfshow_flag");
    // 假装在执行命令
    sleep(1u);
    puts("ctfshow{");
    sleep(2u);
    puts("... ...");
    sleep(3u);
    puts("Your flag is ...");
    sleep(5u);
    puts("ctfshow{flag is not here!}");
    sleep(0x14u);
    // 0x14=20s
    puts("wtf?You haven't left yet?\nOk~ give you flag:\nflag is loading......");
    sleep(0x1BF52u);
    // 0x1BF52u=114514s...≈31h
    system("cat /ctfshow_flag");
    // 真打印flag
    break;
```

等那么久。靶机连接也断了

# 4. 选项 2-漏洞点
```c
case 2:
        puts("Which directory?('/','./' or the directiry you want?)");
        read(0, buf, 0xAuLL);
        // 从键盘读最多10字节到buf
        strcat(dest, buf);
        // 把buf拼接到dest后面
        system(dest);
        // 把拼接后的dest当作命令执行
        puts("Execution succeeded!");
        break;
```

## 4.1 变量定义
```c
char dest[4];        // dest 这个"杯子"只能装 4 个字符
char buf[10];        // buf 这个"杯子"能装 10 个字符
read(0, buf, 10);    // 从键盘读 10 个字符放进 buf
strcat(dest, buf);   // 把 buf 的内容 "倒进" dest ← 杯子溢出了！
```

`dest`只有 4 字节 它里面预存的是"`ls `"(`l``s``空格``\0`刚好 4 字节)



## 4.2 漏洞机制
`dest[4]`只能装 4 个字符 但是`buf[10]`里最多有 10 个字符 把`buf`的内容倒进`dest`会溢出 溢出数据会覆盖`v4`以及栈保护值`canary`

溢出之后 还要看溢出的数据到哪里

```c
strcat(dest, buf);//找到dest的末尾，然后把buf的内容从那里开始往后写
system(dest); //把dest的内容当作系统命令执行
```

 比如`dest`原本存的是`ls`，输入` /flag`，拼接后变成 `ls /flag`，然后 `system()`，会执行了（溢出数据如果被`system()`执行，就是命令注入）

这时`dest`存入 4 个字符 分别是：`l``s``空格符号``固定字符串末尾 \0`

之后`strcat`拼接时从`\0`位置开始写入。

找到`\0`后把`\0`替换成`buf`的第一个字符

| 写的 | 实际存的 |
| --- | --- |
| `"ls "` | l、s、空格 |
| `/flag`（用户输入） | /、f、l、a、g |
| 拼接后`"ls /flag"` |  l、s、空格、/、f、l、a、g |


问题在于程序对用户的输入零过滤。你输入什么，它就往命令后面拼什么。

比如原本`dest`="`ls `"

你输入`/flag`

`strcat`后`dest`="`ls /flag`"

`system("ls /flag")`就会正常列出`/flag`目录

但是如果输入的不是目录名，而是一个命令分割符+任意命令呢......？



# 5.攻击思路-分号截断命令注入
**在 Linux shell 中，**`**;**`**是命令分隔符号。**

**执行**`**cmd1;cmd2**`**时候，系统会先执行**`**cmd1**`**，然后无论成功与否，接着执行**`**cmd2**`



那我们就可以构造 payload

```c
;cat /ctf*
```

9 个字符 满足 10 字符以内

`dest`初始内容是`ls ` 拼接后就是`ls ;cat/ctf*`

那么`system`执行 就会 ①ls 列出当前目录 ②`cat /ctf*`(读取开头为 ctf 的文件)

（`ctf*`的话 ①`buf`就不会超过 10 个字符 ②`*`是 Linux 通配符，可以匹配任意长度的任意字符。只要根目录`/`下`ctf`开头的文件只有唯一一个 flag 文件。就可以精准匹配到。）



具体操作：连接题目

连上后会看到目录

输入选项 2

程序回显



# 6. 更多可用的 payload
| Payload | 长度 | 效果 |
| --- | --- | --- |
| `;cat /ctf*` | 9 字节 | 直接输出 flag |
| `;/bin/sh` | 8 字节 | 弹一个交互式 shell，拿到后想干啥干啥 |
| `;cat /f*` | 8 字节 | 如果 flag 在根目录，用 f* 匹配更短 |
| `;ls /` | 5 字节 | 先看看根目录有啥文件，再决定怎么读 |




# 7.shell 特殊字符
| 符号 | 作用 | 示例 |
| --- | --- | --- |
| `;` | 顺序执行多条命令（无论前一条成败） | `ls ; cat flag` |
| `&` | 前一条命令后台运行，紧接着执行后一条 | `sleep 10 & ls` |
| `&&` | 前一条成功才执行后一条 | `make && ./run` |
| `||` | 前一条失败才执行后一条 | ` cat file || echo "no file"` |
| `*` | 匹配任意长度字符的通配符 | `cat /ctf*` |
| `?` | 匹配单个字符的通配符 | `cat /???` |
| `|` | 管道，前一条输出作为后一条输入 | `cat flag | grep ctf` |
| ``` | 命令替换（反引号） | `echo `ls` ` |
| `$()` | 命令替换（现代写法） | `echo $(cat flag)` |




# 8. 此类漏洞思路
## 搜索危险函数
在 IDA 的 Import/String 窗口中找这些函数名

| 函数 | 为什么危险 |
| :---: | --- |
| `gets()` | 读取输入不限制长度，必溢出 |
| `strcpy()` | 复制字符串不检查长度 |
| `strcat()` | 拼接字符串不检查长度 |
| `read()` | 第三个参数大于缓冲区大小就溢出 |
| `scanf("%s", ...)` | 不限制输入长度 |
| `sprintf()` | 格式化到缓冲区不检查长度 |
| `system() / execve()` | 执行命令，如果参数可控 = 命令注入 |


## 比较缓冲区大小 vs 实际能写入的大小
找到缓冲区定义。再看`read`第三个参数或`strcpy/strcat`的目标大小

如果写入量＞缓冲区大小→存在溢出

## 看溢出/注入后数据被用来做什么→确定漏洞类型
| 场景 | 漏洞类型 |
| --- | --- |
| system () 参数可控 | 命令注入（最简单，本题） |
| 溢出覆盖栈上变量 | 栈溢出 → ROP |
| 溢出覆盖函数指针 | 控制流劫持 |
| 溢出覆盖 Canary 且程序有输出 | 信息泄露 + 二次利用 |


## 构造 payload
  - 命令注入：用 ;、|、&& 等截断原命令

  - 栈溢出：计算偏移 → 覆盖返回地址 → ROP 链

  - 注意 长度限制（本题的 10 字节）、坏字符过滤（如 /bin/sh 被 ban 用 /bin/bash 替代）等约束

