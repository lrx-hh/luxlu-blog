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

# <font style="color:rgb(33, 37, 41);">1.提交格式</font>
<font style="color:rgb(33, 37, 41);">提交</font><font style="color:rgb(33, 37, 41);">ctfshow{【.got表与.got.plt是否可写(可写为1，不可写为0)】,【.got的地址】,【.got.plt的地址】}</font>

**<font style="color:rgb(33, 37, 41);">4 个问题 2 个"能不能写" 2 个"地址是多少"</font>**

# **<font style="color:rgb(33, 37, 41);">2. IDA</font>**
<font style="color:rgb(33, 37, 41);">F5 反编译 main 函数，核心逻辑非常短：</font>

```c
int main(int argc, const char **argv) {
    // 第一步：打印一大段花里胡哨的横幅（省略）
    puts("...* CTFshow --- PWN --- ...");
    puts("...* Hint: What is RELRO protection ? ...");

    // 第二步：把你传的十六进制参数转成地址
    long addr = strtol(argv[1], NULL, 16);

    // 第三步：往这个地址写入 "RELR" 四个字符
    *(long *)addr = 0x52454c52;

    // 第四步：把刚写入的内容读出来打印
    printf("RELRO: %x", *(int *)addr);

    return 0;
}
```

总结：

```plain
你给它一个地址 → 它往里写 "RELR" → 读出来显示给你
```

| <font style="color:rgb(33, 37, 41);">地址可写</font> | <font style="color:rgb(33, 37, 41);">地址不可写</font> |
| --- | --- |
| <font style="color:rgb(33, 37, 41);">打印 </font><font style="color:rgb(33, 37, 41);">RELRO: 52454c52</font> | <font style="color:rgb(33, 37, 41);">程序直接段错误崩溃</font> |


<font style="color:rgb(33, 37, 41);">程序本质上就是一个 </font>GOT 表可写性测试器<font style="color:rgb(33, 37, 41);">。</font>

**<font style="color:rgb(33, 37, 41);"></font>**

# <font style="color:rgb(33, 37, 41);">3.前置基础：程序怎么找到函数</font>
<font style="color:rgb(33, 37, 41);">先理解程序怎么调用函数</font>

<font style="color:rgb(33, 37, 41);">代码里有一行</font><font style="color:rgb(33, 37, 41);">printf("hello")</font>

<font style="color:rgb(33, 37, 41);">但是</font><font style="color:rgb(33, 37, 41);">printf</font><font style="color:rgb(33, 37, 41);">的真实代码在哪？它不在程序里，在一个叫</font><font style="color:rgb(33, 37, 41);">libc</font><font style="color:rgb(33, 37, 41);">的公共库里</font>

<font style="color:rgb(33, 37, 41);">问题是：编译的时候，编译器根本不知道运行的时候</font><font style="color:rgb(33, 37, 41);">libc</font><font style="color:rgb(33, 37, 41);">会被加载到内存的哪个位置</font>

<font style="color:rgb(33, 37, 41);"></font>

## <font style="color:rgb(33, 37, 41);">3.1 两张表</font>
<font style="color:rgb(33, 37, 41);">程序内部准备了两张表 一张是</font><font style="color:rgb(33, 37, 41);">PLT</font><font style="color:rgb(33, 37, 41);">表 一张是</font><font style="color:rgb(33, 37, 41);">GOT</font><font style="color:rgb(33, 37, 41);">表</font>

+ <font style="color:rgb(33, 37, 41);">PLT</font><font style="color:rgb(33, 37, 41);">表是中转站，负责任务分发</font>
+ <font style="color:rgb(33, 37, 41);">GOT</font><font style="color:rgb(33, 37, 41);">表是电话簿，记录每个函数真正的内存地址</font>

## <font style="color:rgb(33, 37, 41);">3.2 </font><font style="color:rgb(33, 37, 41);">GOT</font><font style="color:rgb(33, 37, 41);">表两部分：</font><font style="color:rgb(33, 37, 41);">.got</font><font style="color:rgb(33, 37, 41);">和</font><font style="color:rgb(33, 37, 41);">.got.plt</font>
| | `.got` | `.got.plt` |
| --- | --- | --- |
| 存放内容 | 杂项（<font style="color:rgb(33, 37, 41);">全局变量的地址、动态链接器的内部数据</font>等） | **函数指针**<font style="color:rgb(33, 37, 41);">（每个外部函数对应一个 GOT 条目）</font> |
| 条目数量 | 很少（2-4 条） | 较多（每个导入函数一条） |
| 是攻击目标吗 | 不太是 | **是的** |


## <font style="color:rgb(33, 37, 41);">3.3 为什么</font><font style="color:rgb(33, 37, 41);">GOT</font><font style="color:rgb(33, 37, 41);">表需要能写</font>
<font style="color:rgb(33, 37, 41);">Linux</font><font style="color:rgb(33, 37, 41);">为了启动快。默认不会在程序启动时把所有函数地址都查好，而是用到谁再查谁（也就是</font>**<font style="color:rgb(33, 37, 41);">延迟绑定 Lazy Blinding</font>**<font style="color:rgb(33, 37, 41);">）</font>

| <font style="color:rgb(33, 37, 41);">时机</font> | <font style="color:rgb(33, 37, 41);">GOT 表里 </font><font style="color:rgb(33, 37, 41);">printf</font><font style="color:rgb(33, 37, 41);"> 那一栏写的是</font> |
| --- | --- |
| <font style="color:rgb(33, 37, 41);">程序刚启动，还没调用过 </font><font style="color:rgb(33, 37, 41);">printf</font> | <font style="color:rgb(33, 37, 41);">"我还没查呢，去找 ld.so 帮忙查"</font> |
| <font style="color:rgb(33, 37, 41);">第一次调用 </font><font style="color:rgb(33, 37, 41);">printf</font> | <font style="color:rgb(33, 37, 41);">ld.so 查到地址，填进 GOT 表</font> |
| <font style="color:rgb(33, 37, 41);">之后再调用 </font><font style="color:rgb(33, 37, 41);">printf</font> | <font style="color:rgb(33, 37, 41);">地址已经在表里了，直接跳转</font> |


<font style="color:rgb(33, 37, 41);">也就是说</font><font style="color:rgb(33, 37, 41);">GOT</font><font style="color:rgb(33, 37, 41);">表在程序运行过程中是需要被写入的（至少第一次调用时）</font>

<font style="color:rgb(33, 37, 41);"></font>

# <font style="color:rgb(33, 37, 41);">4.漏洞点：</font><font style="color:rgb(33, 37, 41);">GOT</font><font style="color:rgb(33, 37, 41);">劫持</font>
<font style="color:rgb(33, 37, 41);">漏洞在于如果</font><font style="color:rgb(33, 37, 41);">GOT</font><font style="color:rgb(33, 37, 41);">表是可随意更改的 黑客就可以</font>

```basic
原来 GOT 表里：  printf → 0x7f1234567890 (libc 里 printf 的地址)
                                  ↓ 黑客偷偷改成
改后 GOT 表里：  printf → 0x7f9988776655 (system 函数的地址)
```

之后程序只要调用`printf("/bin/sh")`，实际执行的就是`system("/bin/sh")`—— 拿到 shell。

也就是**GOT劫持（GOT Hijacking）**

# 5.RELRO：给`GOT`上锁
为了防`GOT`劫持，系统出了一个保护叫`RELRO`（`RELocation Read-Only`,把重定位相关的表设为可读）

## 5.1 三种等级
| **等级** | **保护程度** | **.got 能写？** | **.got.plt 能写？** | **备注** |
| --- | --- | --- | --- | --- |
| No RELRO | 🔓 完全没上锁 | ✅ 能写 | ✅ 能写 | 想怎么改就怎么改 |
| Partial RELRO | 🔐 上了一半锁 | ❌ 不能写 | ✅ 能写 | 杂项页`.got`锁了，但是函数地址页`.got.plt`还能写（因为要支持延迟绑定） |
| Full RELRO | 🔒 锁死了 | ❌ 不能写 | ❌ 不能写 | 启动时一次性把所有地址函数查好填完，然后整本电话簿焊死。没法修改了。 |




## 5.2 怎么判断等级
| **方法** | **No RELRO** | **Partial RELRO** | **Full RELRO** |
| --- | --- | --- | --- |
| `checksec` | `No RELRO` | `Partial RELRO` | `Full RELRO` |
| 程序头里是否有 `GNU_RELRO`段？ | ❌  | ✅ | ✅ |
| 动态段里是否有 `BIND_NOW`？ | ❌  | ❌ | ✅ |


# 6.解题
### 6.1 可写性
第一步用`checksec`看一眼

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61758892/1784727082855-5541e3aa-c324-450b-a689-7db14ee91aad.png)

<font style="color:rgb(33, 37, 41);">RELRO:NO RELRO</font><font style="color:rgb(33, 37, 41);">没有保护</font>

<font style="color:rgb(33, 37, 41);">NO RELRO</font><font style="color:rgb(33, 37, 41);">就是两张表都能写 所以前两个空填 1 和 1</font>

<font style="color:rgb(33, 37, 41);"></font>

### <font style="color:rgb(33, 37, 41);">6.2 找两张表地址</font>
<font style="color:rgb(33, 37, 41);">第二步用</font><font style="color:rgb(33, 37, 41);">readelf</font><font style="color:rgb(33, 37, 41);">找地址</font>

<font style="color:rgb(33, 37, 41);">readelf -S pwn20 | grep -A "\.got"</font>

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61758892/1784729947150-b068ab5b-91af-4e28-8d74-3ab3e67f3842.png)

就知道了`.got`和`.got.plt`的地址 并且标志是`WA`(可写)



## 6.3 可选验证：运行程序试一下
程序本身就可以验证。给它地址，它能写进去就说明可写

### 写`.got`表
<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61758892/1784730094380-7c6b3e02-4dcd-4290-97b0-ab62381666f2.png)

`52454c52`=`"RELR"`写入成功



### 写`.got.plt`表
<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61758892/1784730275999-c7906b73-01ee-4f3f-8921-391c0aead5a9.png)

## 6.4 flag
<font style="color:rgb(33, 37, 41);">ctfshow{1_1_0x600f18_0x600f28}</font>

