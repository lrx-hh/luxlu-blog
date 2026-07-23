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

```python
checksec pwn18
  Arch:     amd64-64-little
  RELRO:    Full RELRO
  Stack:    Canary found
  NX:       NX enabled
  PIE:      PIE enabled
```

和 pwn17 一样保护拉满。

# 2. 反编译分析

```c
int __cdecl main(int argc, const char **argv, const char **envp)
{
    int v4;
    puts("Which is the real flag?");
    __isoc99_scanf("%d", &v4);
    if (v4 == 9)
        fake();     // 输入 9 → fake
    else
        real();     // 输入其他 → real
    return system("cat /ctfshow_flag");
}
```

+ 输入 9 → `fake()`
+ 输入其他 → `real()`
+ 最后统一 `cat /ctfshow_flag`

# 3. `fake()` vs `real()`

```c
void fake() { system("echo 'flag is here' >> /ctfshow_flag"); }  // >>
void real() { system("echo 'flag is here' > /ctfshow_flag");  }  // >
```

两个函数只差一个字符：`>>` vs `>`。

# 4. 核心漏洞：`>` vs `>>` 的区别

| 符号 | 术语 | 行为 | 对 flag 的影响 |
| :---: | :---: | :---: | :---: |
| `>` | 覆盖重定向 | 先清空文件，再写入 | 毁灭性：真 flag 被覆盖 |
| `>>` | 追加重定向 | 保留原内容，末尾追加 | 保护性：真 flag 完好 |

- 选 `real()`（非 9）：`>` 清空 `/ctfshow_flag` 再写入废话，真 flag 被删
- 选 `fake()`（9）：`>>` 在 flag 后面追加，原文不受影响

```c
// real() 执行后
/ctfshow_flag → "flag is here"              // 真 flag 没了！

// fake() 执行后
/ctfshow_flag → "ctfshow{xxxxxxxx}"         // 真 flag 还在
                "flag is here"              // 废话追加在末尾
```

**实际操作：输入 9** 即可获得 flag。

# 5. shell 重定向速查

| 符号 | 作用 | 示例 |
| :--- | :--- | :--- |
| `>` | 覆盖写入 | `echo a > flag` |
| `>>` | 追加写入 | `echo a >> flag` |
| `<` | 从文件读取 | `./pwn < input.txt` |
| `2>` | 重定向 stderr | `./pwn 2> err.log` |
| `&>` | 重定向 stdout+stderr | `./pwn &> all.log` |
| `/dev/null` | 数据黑洞 | `./pwn > /dev/null` |
