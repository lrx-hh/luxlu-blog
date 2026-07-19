---
title: pwn0-4 Test_your_nc
date: 2026-04-02 16:45:00
categories:
  - Pwn
  - CTFShow
tags:
  - Pwn
  - CTF
  - Writeup
cover: /img/jpg/11.jpg
---

# pwn0
<!-- 这是一张图片，ocr 内容为： -->
![](/uploads/posts/pwn0-4-test-your-nc/1775115400642-a455495c-f861-45e5-b55e-fdb8bc04d81d.png)

```bash
ssh ctfshow@pwn.challenge.ctf.show -p28110
```

等待程序跑完

```bash
cat /ctfshow_flag
# 把ctfshow_flag这个文件里的内容输出到终端
```

获得flag



# pwn1
010打开附件 是ELF文件



在虚拟机运行`checksec pwn1`

```bash
ctfshow@ubuntu:~/Desktop/pwn1wjj$ checksec pwn1
[*] '/home/ctfshow/Desktop/pwn1wjj/pwn1'
    Arch:     amd64-64-little
    RELRO:    Full RELRO
    Stack:    No canary found
    NX:       NX enabled
    PIE:      PIE enabled
ctfshow@ubuntu:~/Desktop/pwn1wjj$ 
```

`checksec`查看二进制启用了哪些安全机制。判断该走什么利用方式。

可以看到是64位仅关闭Canary保护

+ NX: 不能直接执行栈上的 shellcode，通常走 ROP/ret2libc。
+ Canary: 有金丝雀，溢出必须先泄露或绕过。
+ PIE: 程序地址随机化，需要先泄露地址。
+ RELRO: 影响 GOT 能否被写，用于判断能不能改 GOT

打开附件后反编译可直接看到关键命令：

+ `cat /ctfshow_flag`
+ 以及提示语：`You only need to connect to the remote address with NC to get the flag!`

表明连接后不用操作，程序会直接执行`cat`读取flag

<!-- 这是一张图片，ocr 内容为： -->
![](/uploads/posts/pwn0-4-test-your-nc/1775116462589-5be8510a-f921-4167-8734-a1fcfe1cf3e0.png)

`checksec`仅用于了解保护情况，但本题不需要利用链，发现 `system("cat /ctfshow_flag")` 后直接连接即可

直接在虚拟机nc连接即可获得flag

<!-- 这是一张图片，ocr 内容为： -->
![](/uploads/posts/pwn0-4-test-your-nc/1775115915886-6cee9557-340b-42cf-9cfb-72f4ab8a108c.png)



# pwn2
反编译附件后看到

<!-- 这是一张图片，ocr 内容为： -->
![](/uploads/posts/pwn0-4-test-your-nc/1775119513264-abee236a-7268-4e66-a028-5bcf325760b0.png)

`system("/bin/sh")`直接启动一个后门。连上远程以后直接进入shell环境。然后自己执行`cat /ctfshow_flag`就可以读flag

<!-- 这是一张图片，ocr 内容为： -->
![](/uploads/posts/pwn0-4-test-your-nc/1775119362142-3d3c28af-4d55-4dbf-b570-3a9654247f08.png)



# pwn3
```bash
You can call the following function:
1._start
2.main
3.hello_ctfshow
4.ctfshow('echo /ctfshow_flag')
5.print('/ctfshow_flag')
6.system('cat /ctfshow_flag')
7.puts('/ctfshow_flag')
8.exit
```

4 5 7都是打印路径字符串

只有6是读取文件内容

<!-- 这是一张图片，ocr 内容为： -->
![](/uploads/posts/pwn0-4-test-your-nc/1775121528753-d24039ad-dddd-4afe-bcb1-80c3d95a54a2.png)





# pwn4
打开附件 反编译

## **字符串比较口令校验**
```c
int __fastcall main(int argc, const char **argv, const char **envp)
{
  char s1[11];
  char s2[12];
  unsigned __int64 v6;

  v6 = __readfsqword(0x28u);
  setvbuf(_bss_start, 0LL, 2, 0LL);
  setvbuf(stdin, 0LL, 2, 0LL);
  strcpy(s1, "CTFshowPWN");
  logo();
  puts("find the secret !");
  __isoc99_scanf("%s", s2);
  if ( !strcmp(s1, s2) )
    execve_func();
  return 0;
}
```

C语言的反编译版本。IDA把机器代码“猜回”C，所以名字看上去奇怪。本质上还是C语言



```bash
int __fastcall main(int argc, const char **argv, const char **envp)
```

`main`是程序固定入口

`int`：`main`最后会返回一个整数（0表示正常结束）

`argc/argv/envp`是命令行参数（这里可以不用管

`_fastcall`是编译器用的调用方式，对题目逻辑没影响



```c
char s1[11];
char s2[12];
unsigned __int64 v6;
```

+ `char s1[11]`;  
开一块能放11个字符的空间
+ `char s2[12]`;  
开一块能放12个字符的空间
+ `unsigned __int64 v6`;  
一个 64 位无符号整数。  
这个是栈保护值，暂时理解为安全锁



```c
v6 = __readfsqword(0x28u);
```

读取栈保护值。是编译器加的，防止栈溢出攻击。和题目逻辑无关



```c
setvbuf(_bss_start, 0LL, 2, 0LL);
setvbuf(stdin, 0LL, 2, 0LL);
```

让输入输出立刻显示，不等缓冲，这样交互更流畅



```c
strcpy(s1, "CTFshowPWN");
```

`strcpy`是把右边字符串复制到左边的数组里

所以`s1`现在是`CTFshowPWN`



```c
logo();
puts("find the secret !");
```

`logo()`是打印题目banner

`puts()`是打印一句话



```c
__isoc99_scanf("%s", s2);
```

`"%s"`是“读入一个字符串”

你的输入会被存进`s2`



```c
if ( !strcmp(s1, s2) )
    execve_func();
```

+ `strcmp(s1, s2)`比较两个字符串。
    - 如果相同，返回0
    - 如果不同，返回非0
+ `!strcmp(...)` 的意思是“如果它们相同”
+ 如果相同，执行 `execve_func()`



```c
return 0;
```

程序结束正常退出



因此这里要输入`s1`数值，你输入的内容就存入`s2`，与真实的`s1`比较，相同则执行`execve_func()`

反编译`execve_func()`，发现就是进入一个shell

```c
CTFshowPWN
cat /ctfshow_flag
```

<!-- 这是一张图片，ocr 内容为： -->
![](/uploads/posts/pwn0-4-test-your-nc/1775140076304-b9c40ed4-40e0-4855-ad87-996f4bbf9cb7.png)



