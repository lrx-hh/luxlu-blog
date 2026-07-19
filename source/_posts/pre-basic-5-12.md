---
title: 前置基础5-12
date: 2026-04-19 21:40:00
tags:
cover: /img/jpg/10.jpg
  - Pwn
  - Writeup
  - CTFShow
categories:
  - Pwn
comments: true
top_img: /img/black-pink-cover.svg
description: 前置基础 5-12 寻址方式与地址读取分析
---

<style>
#post {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0)),
    rgba(28, 10, 34, 0.92) !important;
  border: 1px solid rgba(255, 122, 182, 0.28) !important;
  box-shadow: 0 16px 34px rgba(255, 79, 163, 0.14) !important;
  position: relative;
  z-index: 6;
}

#article-container,
#article-container p,
#article-container li,
#article-container strong {
  color: #ffffff !important;
}

#article-container h1,
#article-container h2,
#article-container h3,
#article-container h4 {
  color: #ff7fc4 !important;
}

#article-container code {
  background: rgba(255, 255, 255, 0.08) !important;
  color: #ffffff !important;
  border: 1px solid rgba(255, 143, 199, 0.36);
}

#article-container pre,
#article-container pre code {
  background: rgba(16, 6, 21, 0.78) !important;
  color: #ffffff !important;
  border: 1px solid rgba(255, 143, 199, 0.26) !important;
}

#article-container blockquote {
  background: rgba(255, 79, 163, 0.12) !important;
  border-left: 4px solid #ff76bf !important;
}

#article-container img {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 16px auto;
  border-radius: 12px;
  border: 1px solid rgba(255, 143, 199, 0.45);
}

#article-container font[style*="#DF2A3F"],
#article-container font[style*="#D22D8D"] {
  color: #ff8dcb !important;
  font-weight: 700;
}

#page-header,
#post-info {
  position: relative;
  z-index: 7;
}

[id^="fx-"],
.fx-cursor,
.fx-cursor-dot {
  display: none !important;
}
</style>
地址类十六进制字母尽量按照题目要求大写。

# 1.题干
```plain
5）运行此文件，将得到的字符串以ctfshow{xxxxx}提交。 
如：运行文件后 输出的内容为 Hello_World
提交的flag值为：ctfshow{Hello_World}
注：计组原理题型后续的flag中地址字母大写

6）立即寻址方式结束后eax寄存器的值为？

7）寄存器寻址方式结束后edx寄存器的值为？

8）直接寻址方式结束后ecx寄存器的值为？

9）寄存器间接寻址方式结束后eax寄存器的值为？

10）寄存器相对寻址方式结束后eax寄存器的值为？

11）基址变址寻址方式结束后的eax寄存器的值为？

12）相对基址变址寻址方式结束后eax寄存器的值为？
```

表面上考了很多知识点：

+ 立即寻址
+ 寄存器寻址
+ 直接寻址
+ 寄存器间接寻址
+ 寄存器相对寻址
+ 基址变址寻址
+ 相对基址变址寻址

但本质上反复做的事只有：先算出一个地址，再从这个地址读几个字节。

# 2.流水线
`ELF 文件` ->`操作系统加载到内存` ->`CPU 执行指令` -> `寄存器里暂存数据` -> `按地址去内存读字符串`

实际上反复发生的操作只有**<font style="color:#DF2A3F;">“先算出一个地址，再从这个地址读几个字节”</font>**

# 3.最小概念表
## 2.1 CPU
CPU 就是执行指令的硬件。  
你可以先把它想成“真正动手干活的人”

## 2.2 寄存器
寄存器是 CPU 里面很小、很快的临时小格子，比如：

+ `eax`
+ `ebx`
+ `ecx`
+ `edx`
+ `esi`

它们容量很小，但速度很快，专门放“马上要用”的值。

## 2.3 内存
内存比寄存器大得多，用来放：

+ 程序代码
+ 字符串
+ 变量
+ 栈上的数据

## 2.4 地址
地址就是内存里某个位置的门牌号，比如 `0x080490E8`。

## 2.5 读内存
“读内存”就是：

+ 先拿到一个地址
+ 再去那个地址取内容

## 2.6 ELF
ELF 是 Linux 可执行文件格式。  
可以把它理解成“Linux 下程序文件的标准包装盒”

它会告诉系统：

+ 这是个什么文件
+ 代码放在哪
+ 数据放在哪
+ 每一段加载到内存后应该放到什么地址

## 2.7 section
ELF 会分很多 section  
这题你最关心两个：

+ `.text`：放机器指令
+ `.data`：放已经初始化好的数据

## 2.8 偏移
偏移不是绝对地址，而是“从某个起点往后走了多远”

比如：

+ 文件偏移：从文件开头往后数多少字节
+ `msg + 4`：从 `msg` 往后走 4 个字节

## 2.9 小端序
x86 是小端序。  
最容易看到的现象是：

+ 内存里四个字节是 `57 65 6C 63`
+ 读进 32 位寄存器后常写成 `0x636C6557`

也就是：字节在内存里的排布顺序，和把它整体看成 32 位数时的显示顺序，不是同一个视角

# 4.为什么总要读内存
因为寄存器太小了

比如字符串 `Welcome_to_CTFshow_PWN` 很长，不可能整串都塞进 `eax` 这种小寄存器里。  
所以字符串会放在内存里，而寄存器里通常只放：

+ 一个数字
+ 或一个地址

所以

+ `mov ecx, msg` ≠把整串字符串`msg`塞进 `ecx`
+ `mov ecx, msg` =把 `msg` 的地址放进 `ecx`

而`mov eax, [esi]`

才是

+ 去 `esi` 里存的那个地址
+ 从那个地址开始读内容
+ 把读出来的值放进 `eax`

## `[]` 是这题最关键的符号
+ 没有 `[]`：通常拿的是数字 / 地址本身
+ 有 `[]`：通常拿的是“那个地址里的内容”

# 5. `msg` 是什么
在 `Welcome_to_CTFshow.asm` 里：

```plain
section .data
    msg db "Welcome_to_CTFshow_PWN", 0
```

它的意思是：

+ 用 `db` 一字节一字节地放数据
+ 放进去的数据是字符串 `"Welcome_to_CTFshow_PWN"`
+ 最后再补一个结尾的 `0`
+ `**<font style="color:#DF2A3F;">msg</font>**`**<font style="color:#DF2A3F;"> 只是这串字节起始位置的标签</font>**

你可以把 `msg` 想成“这排柜子的第一个格子叫 `msg`”



# 6. 把字符串拆成字节  看上去就好点了^^
字符串是：

```plsql
Welcome_to_CTFshow_PWN
```

前面的字节表如下：

| 偏移 | 字符 | 十六进制 |
| :--- | :--- | :--- |
| `msg+0` | `W` | `57` |
| `msg+1` | `e` | `65` |
| `msg+2` | `l` | `6C` |
| `msg+3` | `c` | `63` |
| `msg+4` | `o` | `6F` |
| `msg+5` | `m` | `6D` |
| `msg+6` | `e` | `65` |
| `msg+7` | `_` | `5F` |
| `msg+8` | `t` | `74` |
| `msg+9` | `o` | `6F` |
| `msg+10` | `_` | `5F` |
| `msg+11` | `C` | `43` |
| `msg+12` | `T` | `54` |
| `msg+13` | `F` | `46` |
| `msg+14` | `s` | `73` |
| `msg+15` | `h` | `68` |
| `msg+16` | `o` | `6F` |
| `msg+17` | `w` | `77` |
| `msg+18` | `_` | `5F` |
| `msg+19` | `P` | `50` |
| `msg+20` | `W` | `57` |
| `msg+21` | `N` | `4E` |
| `msg+22` | `\0` | `00` |


这张表很重要，因为第 8-12 题本质上都是在这张表上找起点，再连续取 4 个字节。



# 7. 这题里的 ELF 结构怎么帮你找到 `msg`
这题不只是能从源码看出字符串，还能从 ELF 文件里机械地推出地址。

## 7.1 先取 ELF 头里的 4 个字段
在这个 ELF32 文件里，固定偏移位置有这几个值：

+ 文件偏移 `0x20`：`e_shoff`
+ 文件偏移 `0x2E`：`e_shentsize`
+ 文件偏移 `0x30`：`e_shnum`
+ 文件偏移 `0x32`：`e_shstrndx`

<img src="/uploads/posts/pre-basic-5-12/memory-layout.png" width="565" title="" crop="0,0,1,1" id="EGeke" class="ne-image">

本题实际字节是：

+ `0x20`：`18 01 00 00` -> 小端 -> `0x118`
+ `0x2E`：`28 00` -> `0x28`
+ `0x30`：`04 00` -> `4`
+ `0x32`：`03 00` -> `3`

意思是：

+ section header 表从文件偏移 `0x118` 开始
+ 每项大小 `0x28`
+ 一共 `4` 项
+ 第 `3` 项是 section 名字字符串表

## 7.2 算出 section header 每项的起点
```plsql
第 n 项起始偏移 = e_shoff + n * e_shentsize
```

已经算出：

+ `e_shoff` = `0x118`
+ `e_shentsize` = `0x28`

直接代入

**∴第 0 项**

`0x118 + 0 * 0x28 = 0x118`

**第 1 项**

`0x118 + 1 * 0x28 = 0x118 + 0x28 = 0x140`

**第 2 项**

`0x118 + 2 * 0x28 = 0x118 + 0x50 = 0x168`

因为：

`2 * 0x28 = 0x50`

**第 3 项**

`0x118 + 3 * 0x28 = 0x118 + 0x78 = 0x190`

因为：

`3 * 0x28 = 0x78`

**为什么可以这么算**  
因为：

+ `e_shoff` 是整个 section header 表的开头
+ `e_shentsize` 是“每一项占多少字节”
+ 所以第 n 项，就是从表开头往后跳 n 个“项宽度”

## 7.3 找 `.text` 和 `.data`
ELF32 的 section header 里：

+ `sh_name` 在该项起始 `+0x00`
+ `sh_addr` 在该项起始 `+0x0C`
+ `sh_offset` 在该项起始 `+0x10`

第 1 项：

+ `sh_name = 0x0B`
+ `sh_addr = 0x08048080`
+ `sh_offset = 0x80`

第 2 项：

+ `sh_name = 0x11`
+ `sh_addr = 0x080490E8`
+ `sh_offset = 0xE8`

第 3 项是字符串表，它的 `sh_offset = 0xFF`。  
跳到文件偏移 `0xFF`，可以看到：

```plain
00 .shstrtab 00 .text 00 .data 00
```

于是：

+ 偏移 `0x0B` 对应 `.text`
+ 偏移 `0x11` 对应 `.data`

所以：

+ `.text` 加载地址是 `0x08048080`
+ `.data` 加载地址是 `0x080490E8`

## 7.4 为什么 `msg = 0x080490E8`
因为 `msg` 就定义在 `.data` 开头，而 `.data` 的加载地址正好是 `0x080490E8`。  
所以：

```plain
msg = 0x080490E8
```



## 7.5 为什么文件偏移 `0xE8` 对应内存地址 `0x080490E8`
对于同一个 section 里的字节，有一个很好用的换算关系：

text

目标文件偏移 = sh_offset + (目标内存地址 - sh_addr)

在本题里：

+ `.data` 的 `sh_offset = 0xE8`
+ `.data` 的 `sh_addr = 0x080490E8`

如果目标地址正好就是 `.data` 开头：

```z80
目标文件偏移 = 0xE8 + (0x080490E8 - 0x080490E8) = 0xE8
```

所以内存里的 `msg` 开头，正好对应文件偏移 `0xE8`。



## 什么是偏移
偏移就是“从某个起点往后数几格”。

例如：

+ msg + 4：从 msg 的起始地址往后走 4 个字节
+ 也就是从第 5 个字符开始

因为字节编号通常从 0 开始：

+ 第 0 个字节：W
+ 第 1 个字节：e
+ 第 2 个字节：l
+ 第 3 个字节：c
+ 第 4 个字节：o

所以 msg + 4 会指到 o

## 什么是 ELF
ELF 就是程序文件的组织方式。会告诉系统：

+ 这文件是不是可执行程序
+ 代码在哪一段
+ 数据在哪一段
+ 各段加载到内存后应该放到什么地址

所以去找 .data、找 sh_addr、找 sh_offset，本质上是在做这件事：

“先在文件里找到这段数据，再弄清它加载到内存后会出现在什么地址。”

## 最容易混淆的 3 组东西
地址 和 地址里的值 不是一回事。

msg 是地址，[msg] 才是那个地址里的内容。



文件偏移 和 内存地址 不是一回事。

一个是在硬盘文件里数位置，一个是在内存里数位置。



字节顺序 和 整数显示 不是一回事。

内存里是 `57 65 6C 63`，显示成 32 位整数会变成 `0x636C6557`



# 做题
附件是一个`Welcome_to_CTFshow``(ELF)`和`Welcome_to_CTFshow.asm`

`asm` 是汇编源代码文件，纯文本格式

它不是可执行文件，而是给汇编器（如 `nasm`）编译成机器码用的

这段代码主要是演示不同寻址方式，最后输出字符串

```z80
section .data
    msg db "Welcome_to_CTFshow_PWN", 0

section .text
    global _start

_start:

; 立即寻址方式
    mov eax, 11         ; 将11赋值给eax
    add eax, 114504     ; eax加上114504
    sub eax, 1          ; eax减去1

; 寄存器寻址方式
    mov ebx, 0x36d      ; 将0x36d赋值给ebx
    mov edx, ebx        ; 将ebx的值赋值给edx

; 直接寻址方式
    mov ecx, msg      ; 将msg的地址赋值给ecx

; 寄存器间接寻址方式
    mov esi, msg        ; 将msg的地址赋值给esi
    mov eax, [esi]      ; 将esi所指向的地址的值赋值给eax

; 寄存器相对寻址方式
    mov ecx, msg        ; 将msg的地址赋值给ecx
    add ecx, 4          ; 将ecx加上4
    mov eax, [ecx]      ; 将ecx所指向的地址的值赋值给eax

; 基址变址寻址方式
    mov ecx, msg        ; 将msg的地址赋值给ecx
    mov edx, 2          ; 将2赋值给edx
    mov eax, [ecx + edx*2]  ; 将ecx+edx*2所指向的地址的值赋值给eax

; 相对基址变址寻址方式
    mov ecx, msg        ; 将msg的地址赋值给ecx
    mov edx, 1          ; 将1赋值给edx
    add ecx, 8          ; 将ecx加上8
    mov eax, [ecx + edx*2 - 6]  ; 将ecx+edx*2-6所指向的地址的值赋值给eax

; 输出字符串
    mov eax, 4          ; 系统调用号4代表输出字符串
    mov ebx, 1          ; 文件描述符1代表标准输出
    mov ecx, msg        ; 要输出的字符串的地址
    mov edx, 22         ; 要输出的字符串的长度
    int 0x80            ; 调用系统调用

; 退出程序
    mov eax, 1          ; 系统调用号1代表退出程序
    xor ebx, ebx        ; 返回值为0
    int 0x80            ; 调用系统调用

```

<img src="/uploads/posts/pre-basic-5-12/memory-layout.png" width="611.5" title="" crop="0,0,1,1" id="lfiLh" class="ne-image">



先记住4 个字段（ELF32 固定位置）

`e_shoff`在文件偏移`0x20`，4 字节

`e_shentsize`在 `0x2E`，2 字节

`e_shnum`在`0x30`，2 字节

`e_shstrndx`在 `0x32`，2 字节

# pwn5
**<font style="color:#D22D8D;">看程序最后执行了什么系统调用</font>**

```z80
mov eax, 4
mov ebx, 1
mov ecx, msg
mov edx, 22
int 0x80
```

+ `eax = 4`：Linux 32 位下，系统调用号 `4` 是 `write`
+ `ebx = 1`：文件描述符 `1` 代表标准输出，也就是屏幕
+ `ecx = msg`：从 `msg` 开始输出
+ `edx = 22`：输出 22 个字节

为什么正好是这串字符串

`"Welcome_to_CTFshow_PWN"` 长度正好是 22



## 操作方法
复制两个文件到ubuntu

### 1.安装工具
```z80
sudo apt install -y nasm binutils
```

### 2.进入桌面目录并列出当前目录文件
```z80
cd ~/Desktop
ls
```

### 3.汇编：把`.asm`变成`.o`
```z80
nasm -f elf32 Welcome_to_CTFshow.asm -o Welcome_to_CTFshow.o
```

+ `nasm`：汇编器
+ `-f elf32`：是生成32位ELF目标文件
+ `Welcome_to_CTFshow.asm`：是 输入内容
+ `-o Welcome_to_CTFshow.o`：输出的半成品机器码

结果就会生成文件`Welcome_to_CTFshow.o`

### 4.链接：把`.o`变成可执行文件 并运行
```z80
ld -m elf_i386 -s -o Welcome_to_CTFshow Welcome_to_CTFshow.o
```

+ `ld`：链接器
+ `-m elf_i386`：生成 32 位可执行文件
+ `-s`：去掉符号表（让文件更小）
+ `-o Welcome_to_CTFshow`：输出可执行文件名
+ `Welcome_to_CTFshow.o`：输入目标文件

结果就会生成可执行的`Welcome_to_CTFshow`

```z80
./Welcome_to_CTFshow
```

`./`表示当前目录下

运行后输出`Welcome_to_CTFshow_PWN`

因为这串字符串已经写死在数据段中  
`ctfshow{Welcome_to_CTFshow_PWN}`

# pwn6：立即寻址
**<font style="color:#D22D8D;">立即寻址就是 指令里直接写死一个数 CPU直接拿来用</font>**

逐步计算即可

```z80
mov eax, 11
add eax, 114504
sub eax, 1
```

1. `eax=11`
2. `eax=11+114504=114515`
3. `eax=114515-1=114514`

`ctfshow{114514}`

# pwn7:寄存器寻址
**<font style="color:#D22D8D;">寄存器寻址就是从寄存器里取值，而不是从内存中取</font>**

```z80
mov ebx, 0x36d
mov edx, ebx
```

`ebx=0x36d`

而`edx`直接从`ebx`复制值

所以`edx=0x36d`

`ctfshow{0x36D}`

# pwn8:直接寻址
**<font style="color:#D22D8D;">直接寻址就是 地址直接写在指令里。</font>**

```c
mov ecx, dword ptr [0x080490E8]
```

这题地址就直接写成了`0x080490E8`

实际上就会

1. 去内存地址`0x080490E8`
2. 从这里连续读4个字节
3. 放入`ecx`



前面从ELF的`.data`段可以推出

`msg=0x080490E8`



也就是说这段内存地址就是字符串的起点

从`msg`读取四个字节就是`W``e``l``c`

也就是`57 65 6C 63`

小端读入寄存器：`0x636C6557`

`ctfshow{0x636C6557}`



# pwn9:寄存器间接寻址
**<font style="color:#D22D8D;">寄存器间接寻址就是 地址先放在寄存器里，再通过这个寄存器去访问内存</font>**

```c
mov esi, msg
mov eax, [esi]
```

先把`msg`地址放进`esi`

再通过`esi`间接访问内存取4字节到`eax`

还是读取`57 65 6C 63`>`0x636C6557`

`ctfshow{0x636C6557}`

和第八题的区别就是

+ 第8题是地址直接写在指令里
+ 第9题是地址先放进`esi`，再通过`esi`去读

读到的仍然是同一个地方

# pwn10:寄存器相对寻址
**<font style="color:#D22D8D;">寄存器相对寻址就是 现有一个基准地址，再在这个地址基础上加一个偏移</font>**

```c
mov ecx, msg
add ecx, 4
mov eax, [ecx]
```

`ecx`从`msg`起始地址偏移到`msg+4`

读取`msg+4`起始4字节`6F 6D 65 5F`(`o``m``e``_`)

小端结果`0x5F656D6F`

`ctfshow{0x5F656D6F}`

# pwn11：基址变址寻址
```z80
mov ecx, msg
mov edx, 2
mov eax, [ecx + edx*2]
```

基址变址寻址 此处

+ `ecx`是基址
+ `edx`是变址寄存器
+ `edx*2`是缩放后的偏移
+ 所以最后访问的地址是`[ecx + edx*2]`

逐步计算

1. `ecx=msg`
2. `edx=2`
3. 有效地址`ecx+edx*2`
4. 代入得到`msg+2*2=msg+4`

读取`msg+4`起始4字节`6F 6D 65 5F`

`ctfshow{0x5F656D6F}`

# pwn12：相对基址变址寻址
```z80
mov ecx, msg
mov edx, 1
add ecx, 8
mov eax, [ecx + edx*2 - 6]
```

**<font style="color:#D22D8D;">相对基址变址寻址 就是在“基址变址”的基础上再额外加减一个常量偏移</font>**

逐步计算

1. `ecx=msg`
2. `edx=1`
3. `ecx=msg+8`

最终有效地址`msg+8+1*2-6=msg+4`

仍然是从`msg`读4个字节

`ctfshow{0x5F656D6F}`

