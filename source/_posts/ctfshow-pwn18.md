---
title: "[ pwn 学习 ] CTFshow-pwn18"
date: 2026-07-21 17:00:00
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

64 位程序，保护全开（Canary NX PIE 一个不少）和 pwn17 一样防护拉满

# 2.反编译分析（main 函数）
拖进 IDA F5 反编译 核心逻辑很短

```c
int __cdecl main(int argc, const char **argv, const char **envp)
{
    int v4; // [rsp+Ch] [rbp-4h]

    puts("Which is the real flag?");
    __isoc99_scanf("%d", &v4);
    if (v4 == 9)
        fake();     // 输入 9 → 走 fake
    else
        real();     // 输入其他 → 走 real
    return system("cat /ctfshow_flag");
}
```

程序先问你`"Which is the real flag"`然后你输入一个数字

+ 输入 9 调用`fake()`函数
+ 输入其他 调用`real()`函数

最后统一执行`cat /ctfshow_flag`



# 3.`fake()`vs`real()`
```c
// 假函数（但能拿到真 flag）
void fake()
{
    system("echo 'flag is here' >> /ctfshow_flag");
}

// 真函数（但拿到的是假 flag）
void real()
{
    system("echo 'flag is here' > /ctfshow_flag");
}
```

两个函数只差一个字符：`>>`vs`>`



# 4.核心漏洞：`>`vs`>>`的文件重定向差异
这题漏洞不在代码逻辑，而在代码对文件系统产生的副作用

## 4.1 两个符号本质区别
| <font style="color:rgb(79, 79, 79);">符号</font> | <font style="color:rgb(79, 79, 79);">术语</font> | <font style="color:rgb(79, 79, 79);">行为描述</font> | <font style="color:rgb(79, 79, 79);">对 flag 的影响</font> |
| :---: | :---: | :---: | :---: |
| <font style="color:rgb(79, 79, 79);">></font> | <font style="color:rgb(79, 79, 79);">覆盖重定向</font> | <font style="color:rgb(79, 79, 79);">覆盖写</font><br/><font style="color:rgb(79, 79, 79);">先清空文件</font><br/><font style="color:rgb(79, 79, 79);">再写入新内容</font> | <font style="color:rgb(79, 79, 79);">毁灭性</font><br/><font style="color:rgb(79, 79, 79);">原来的真 flag 直接被删了</font> |
| <font style="color:rgb(79, 79, 79);">>></font> | <font style="color:rgb(79, 79, 79);">追加重定向</font> | <font style="color:rgb(79, 79, 79);">追加写</font><br/><font style="color:rgb(79, 79, 79);">保留原内容</font><br/><font style="color:rgb(79, 79, 79);">只在末尾追加</font> | <font style="color:rgb(79, 79, 79);">保护性</font><br/><font style="color:rgb(79, 79, 79);">真 flag 还在，只是后面多了一行废话</font> |


## 4.2 推演执行流程
靶机环境里`/ctfshow_flag`文件里预先存着真正的 flag

+ 如果选`real()`（输入非 9）

```c
① system("echo 'flag is here' > /ctfshow_flag")
   ┌─────────────────────────────────────────┐
   │ /ctfshow_flag（执行前）:                 │
   │  ctfshow{xxxxxxxx}                      │
   │                                         │
   │ /ctfshow_flag（执行后）:                 │
   │  flag is here                           │  ← 真 flag 被覆盖，没了！
   └─────────────────────────────────────────┘

② system("cat /ctfshow_flag")
   输出：flag is here    ← 读到的是一句废话
```

真 flag 在你读之前就被`>`删掉了



+ 如果选`fake()`(输入 9)

```c
① system("echo 'flag is here' >> /ctfshow_flag")
   ┌─────────────────────────────────────────┐
   │ /ctfshow_flag（执行前）:                 │
   │  ctfshow{xxxxxxxx}                      │
   │                                         │
   │ /ctfshow_flag（执行后）:                 │
   │  ctfshow{xxxxxxxx}                      │  ← 真 flag 还在！
   │  flag is here                           │  ← 废话追加在末尾
   └─────────────────────────────────────────┘

② system("cat /ctfshow_flag")
   输出：
     ctfshow{xxxxxxxx}          ← 第一行：真 flag
     flag is here               ← 第二行：废话（可忽略）
```



实际操作：**输入 9** 即可获得 flag



# 5.shell 重定向符号
| 符号 | 作用 | 示例 | 什么时候用 |
| :--- | :--- | :--- | :--- |
| `>` | 覆盖写入文件 | `echo a > flag` | 要创建/覆盖一个新文件 |
| `>>` | 追加写入文件 | `echo a >> flag` | 要在文件末尾加内容，不动原来的 |
| `<` | 从文件读取输入 | `./pwn < input.txt` | 把文件内容喂给程序 |
| `2>` | 重定向 stderr | `./pwn 2> err.log` | 只看错误日志 |
| `&>` | 同时重定向 stdout + stderr | `./pwn &> all.log` | 把所有输出都存起来 |
| `/dev/null` | 黑洞（数据丢进去就消失） | `./pwn > /dev/null` | 不想要输出，只想安静执行 |


