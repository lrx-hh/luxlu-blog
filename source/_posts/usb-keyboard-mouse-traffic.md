---
title: USB协议 键盘流量 鼠标流量
date: 2026-03-28 21:00:00
categories:
  - Misc
tags:
  - CTF
  - USB
  - HID
  - Forensics
---
# 捋一下知识点
## 一、USB 协议基础概念
| 概念 | 说明 |
| --- | --- |
| Host | 主机（PC），发起请求的一方 |
| USB Device | 客户端设备（如键盘、鼠标、U盘） |
| Endpoint | 设备上的通信端点，分为 IN（设备→主机）和 OUT（主机→设备） |
| Interface Class | 设备类型，常见有：   `HID`：Human Interface Device（键盘/鼠标）   `Mass Storage`：U盘/移动硬盘   `Printer`：打印机 |


## 二、USB HID报文结构
一个典型的HID键盘报告是8字节的数据包

```plain
Byte 0: Modifier Keys (Ctrl, Shift,Alt...)
Byte 1: Reserved
Bytes 2-7: Key Codes (最多 6 个按键)
```

```plain
00 00 04 00 00 00 00 00
```

Byte 0: `0x00` → 无修饰键

Byte 1: `0x00` → 保留位

Byte 2: `0x04` → 按下 'A' 键（键码）

Bytes 3~7: 全 0 → 表示只按了一个键

**只有当字节不为 0 时才表示有效按键**

## 三、关键字段
### 1. Modifier Keys 映射表（第 0 字节）
| **Hex** | **Meaning** |
| --- | --- |
| 0x01 | Ctrl |
| 0x02 | Shift |
| 0x04 | Alt |
| 0x08 | Win |
| 0x10 | Menu |
| 0x20 | Num Lock |


如果某位被置位，说明该修饰键正在使用（例如 `0x02` 表示 Shift 被按住）

### 2. Key Code 映射表（第 2~7 字节）
这是最核心的部分，用于还原用户输入。

| **Key Code (Hex)** | **Character / Action** |
| --- | --- |
| 0x04 | A |
| 0x05 | B |
| 0x06 | C |
| ... | ... |
| 0x1F | 2 |
| 0x20 | 3 |
| 0x21 | 4 |
| 0x28 | n |
| 0x2a | [DEL] |
| 0x2B | 空格 |
| 0x32 | ~ |
| 0x33 | ; |
| 0x34 | ' |
| 0x36 | , |
| 0x37 | . |


注意：不是所有键都有映射，有些是特殊功能键（如 F1-F12)

## 四、Wireshark流量分析
### 1.定位USB HID
protocol列可以找`USB``USBHID`

过滤器可以用`usbhid.data`

### 2.根据设备地址分离流量
每个usb设备有一个唯一地址 格式是`x.x.x`

例如`2.8.1``2.4.1``2.10.1`

过滤器：`usb.addr=="2.8.1"`

或者`usb.data_len == 8 and usb.src =="1.6.1"`

**有一个很奇怪的点 我在导出的时候必须导出到一个文件夹里 否则还是原始数据 试了好几次都这样**

### 3.导出原始数据 tshark
注意要在官网下载wireshark然后要配一下PATH （之前不知道在哪下的，，没有tshark

`"D:\Wireshark\tshark.exe" -r 流量包地址 -Y "usb.capdata" -T fields -e usb.capdata > 导出文件地址`

如：`"D:\Wireshark\tshark.exe" -r D:\luxluusb\2.4.1.pcapng -Y "usb.capdata" -T fields -e usb.capdata > D:\luxluusb\2.4.1.txt`

`-r`是读取pcap文件

`-Y`是过滤 只取用usb.capdata

`-T fields`是输出字段形式

`-e usb.capdata`是提取原始数据

`>`导出到文件里

****

## 五、py脚本
通用脚本

每行是标准USB HID报告描述符格式 共6字节（16hex字符）

```python
# -*- coding: utf-8 -*-
"""
健全的 USB HID 键盘流量解析器（CTF 专用）
支持：
  - 大小写自动识别（基于 Shift/Caps）
  - Backspace 删除
  - Shift+数字/符号映射（!@#$%...）
  - 保留 ← → 方向键（用于某些 CTF 题目）
  - 多种输入格式（00:00:04... 或 000004...）
  - 跳过无效/空包
"""

import sys

# ===== 标准美式键盘映射（无 Shift）=====
KEYMAP_NORMAL = {
    0x04: 'a', 0x05: 'b', 0x06: 'c', 0x07: 'd', 0x08: 'e', 0x09: 'f',
    0x0A: 'g', 0x0B: 'h', 0x0C: 'i', 0x0D: 'j', 0x0E: 'k', 0x0F: 'l',
    0x10: 'm', 0x11: 'n', 0x12: 'o', 0x13: 'p', 0x14: 'q', 0x15: 'r',
    0x16: 's', 0x17: 't', 0x18: 'u', 0x19: 'v', 0x1A: 'w', 0x1B: 'x',
    0x1C: 'y', 0x1D: 'z',

    0x1E: '1', 0x1F: '2', 0x20: '3', 0x21: '4', 0x22: '5',
    0x23: '6', 0x24: '7', 0x25: '8', 0x26: '9', 0x27: '0',

    0x28: '\n',      # Enter
    0x29: '<ESC>',
    0x2A: '[BACKSPACE]',
    0x2B: '\t',      # Tab
    0x2C: ' ',       # Space
    0x2D: '-', 0x2E: '=', 0x2F: '[', 0x30: ']', 0x31: '\\',
    0x32: '`',       # Non-US #
    0x33: ';', 0x34: "'",
    0x35: '~',       # Often used as backtick alternative
    0x36: ',', 0x37: '.', 0x38: '/',
}

# ===== Shift 激活时的符号映射 =====
KEYMAP_SHIFT = {
    0x1E: '!', 0x1F: '@', 0x20: '#', 0x21: '$', 0x22: '%',
    0x23: '^', 0x24: '&', 0x25: '*', 0x26: '(', 0x27: ')',
    0x2D: '_', 0x2E: '+', 0x2F: '{', 0x30: '}', 0x31: '|',
    0x32: '~',
    0x33: ':', 0x34: '"',
    0x35: '`',
    0x36: '<', 0x37: '>', 0x38: '?',
}

# ===== 功能键定义 =====
FUNCTION_KEYS = {
    0x39: '<CAPS>', 0x3A: '<F1>', 0x3B: '<F2>', 0x3C: '<F3>', 0x3D: '<F4>',
    0x3E: '<F5>', 0x3F: '<F6>', 0x40: '<F7>', 0x41: '<F8>', 0x42: '<F9>',
    0x43: '<F10>', 0x44: '<F11>', 0x45: '<F12>',
    0x46: '<PRTSCR>', 0x47: '<SCROLLLOCK>', 0x48: '<PAUSE>',
    0x49: '<INSERT>', 0x4A: '<HOME>', 0x4B: '<PGUP>',
    0x4C: '<DELETE>',  # Delete 键
    0x4D: '<END>', 0x4E: '<PGDN>',
    0x4F: '<RIGHT>',   # ← 保留！
    0x50: '<LEFT>',    # ← 保留！
    0x51: '<DOWN>', 0x52: '<UP>',
}

def clean_hex_line(line):
    """清理一行，只保留十六进制字符"""
    return ''.join(c for c in line.strip() if c.lower() in '0123456789abcdef')

def parse_hid_packet(hex_str):
    if len(hex_str) < 8:
        return None, None
    try:
        mod = int(hex_str[0:2], 16)
        key = int(hex_str[4:6], 16)
        return mod, key
    except ValueError:
        return None, None

def is_shift_pressed(modifier):
    return bool(modifier & 0x22)

def get_char(keycode, shift_on):
    if keycode == 0:
        return None

    if keycode in FUNCTION_KEYS:
        return FUNCTION_KEYS[keycode]

    if keycode == 0x2A:
        return '[BACKSPACE]'

    if 0x04 <= keycode <= 0x1D:
        base_char = KEYMAP_NORMAL.get(keycode, f'[unknown:0x{keycode:02X}]')
        return base_char.upper() if shift_on else base_char

    if shift_on and keycode in KEYMAP_SHIFT:
        return KEYMAP_SHIFT[keycode]
    elif keycode in KEYMAP_NORMAL:
        return KEYMAP_NORMAL[keycode]
    else:
        return f'[unknown:0x{keycode:02X}]'

def main(input_file='usb.txt'):
    output_chars = []

    try:
        with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
            for line_num, line in enumerate(f, 1):
                cleaned = clean_hex_line(line)
                if not cleaned:
                    continue
                
                mod, key = parse_hid_packet(cleaned)
                if mod is None or key is None:
                    continue
                
                char = get_char(key, is_shift_pressed(mod))
                if char is None:
                    continue
                
                # 处理 Backspace
                if char == '[BACKSPACE]':
                    if output_chars:
                        output_chars.pop()
                # 保留 LEFT 和 RIGHT，跳过其他功能键
                elif char in ('<LEFT>', '<RIGHT>'):
                    output_chars.append(char)
                # 跳过其余功能键（<F1>, <CAPS>, <ENTER> 等）
                elif char.startswith('<') and char.endswith('>'):
                    continue
                else:
                    output_chars.append(char)
                    
    except FileNotFoundError:
        print(f"错误：找不到文件 {input_file}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"解析出错: {e}", file=sys.stderr)
        sys.exit(1)
    
    result = ''.join(output_chars)
    print("Recovered keystrokes:")
    print("=" * 50)
    print(result)
    print("=" * 50)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        main(sys.argv[1])
    else:
        main('usb.txt')
```

# [CISCN 2022 初赛]ez_usb
下载附件获得`ez_usb.pcapng`

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61758892/1768809688892-101f06c1-c582-4c53-a28e-93c43a52ad84.png)<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61758892/1768809820489-da4b4a70-3d0a-4808-8673-e409a0875cec.png)

`Protocol`列看到大量的`USB`和`USBHID`协议

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61758892/1768810616723-8e837b53-933e-40a0-9730-853ae44b815d.png)

随便看一条 看到`HID Data:0400000000000000`八字节



使用过滤器：`usbhid.data`

发现存在三种设备地址：`2.8.1``2.4.1``2.10.1`

每个地址对应不同的USB地址，分别分析它们的数据



分别用过滤器：`usb.addr=="2.8.1"` `usb.addr=="2.4.1"``usb.addr=="2.10.1"`分别导出对应分组 获得三个流量包

在D盘开一个叫`luxluusb`的文件夹 把三个流量包放进去

在cmd逐行粘贴并回车执行

```plain
"D:\Wireshark\tshark.exe" -r D:\luxluusb\2.4.1.pcapng -Y "usb.capdata" -T fields -e usb.capdata > D:\luxluusb\2.4.1.txt
```

```plain
"D:\Wireshark\tshark.exe" -r D:\luxluusb\2.8.1.pcapng -Y "usb.capdata" -T fields -e usb.capdata > D:\luxluusb\2.8.1.txt
```

```plain
"D:\Wireshark\tshark.exe" -r D:\luxluusb\2.10.1.pcapng -Y "usb.capdata" -T fields -e usb.capdata > D:\luxluusb\2.10.1.txt
```



<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61758892/1768827476986-68a0dc84-7d04-4a83-a64d-1c70011ad9e3.png)

`2.4.1.txt`中的数据只有7个字节 不是键盘的数据包 放弃

剩下`2.8.1.txt``2.10.1.txt`观察后发现 这两个文件包含有效的HID数据包 我们需要每行的第三个字节 



第三个字节是实际按键码 例如`0x04`对应`'A'`

用脚本提取这些键码 并映射为字符

```python
# -*- coding: utf-8 -*-
"""
USB Keyboard HID 报文解析脚本
支持格式：
  - 无分隔符：如 "0000120000000000"
  - 冒号分隔：如 "00:00:12:00:00:00:00"
  - 空格或其他分隔符（自动清理）
只提取主按键码（第3字节，偏移4-6），并严格忽略无效行。
未知键用 [unknown:0xXX] 标记，便于调试。
"""

# USB HID Usage ID 到字符的映射（主键盘区，标准美式布局）
mappings = {
    # 字母 A-Z
    0x04: "A", 0x05: "B", 0x06: "C", 0x07: "D", 0x08: "E", 0x09: "F", 0x0A: "G", 0x0B: "H",
    0x0C: "I", 0x0D: "J", 0x0E: "K", 0x0F: "L", 0x10: "M", 0x11: "N", 0x12: "O", 0x13: "P",
    0x14: "Q", 0x15: "R", 0x16: "S", 0x17: "T", 0x18: "U", 0x19: "V", 0x1A: "W", 0x1B: "X",
    0x1C: "Y", 0x1D: "Z",

    # 数字 1-0
    0x1E: "1", 0x1F: "2", 0x20: "3", 0x21: "4", 0x22: "5",
    0x23: "6", 0x24: "7", 0x25: "8", 0x26: "9", 0x27: "0",

    # 符号与功能键
    0x28: "\n",           # Enter
    0x29: "<ESC>",
    0x2A: "[DEL]",        # Backspace
    0x2B: "\t",           # Tab
    0x2C: " ",            # Space
    0x2D: "-", 0x2E: "=", 0x2F: "[", 0x30: "]", 0x31: "\\", 
    0x32: "~",            # Non-US # (常作 `)
    0x33: ";", 0x34: "'", 
    0x35: "`",            # 部分系统中为 Non-US backslash，此处按常见用法设为 `
    0x36: ",", 0x37: ".", 0x38: "/",

    # 功能键（可选扩展）
    0x39: "<CAPS>", 0x3A: "<F1>", 0x3B: "<F2>", 0x3C: "<F3>", 0x3D: "<F4>",
    0x3E: "<F5>", 0x3F: "<F6>", 0x40: "<F7>", 0x41: "<F8>", 0x42: "<F9>",
    0x43: "<F10>", 0x44: "<F11>", 0x45: "<F12>",
    0x46: "<PRTSCR>", 0x47: "<SCROLLLOCK>", 0x48: "<PAUSE>",
    0x49: "<INSERT>", 0x4A: "<HOME>", 0x4B: "<PGUP>",
    0x4C: "<DEL>",        # Delete
    0x4D: "<END>", 0x4E: "<PGDN>",
    0x4F: "<RIGHT>", 0x50: "<LEFT>", 0x51: "<DOWN>", 0x52: "<UP>",
}

def clean_and_extract_keycode(line):
    """
    清理输入行，提取第3字节（USB HID 报文的主按键码）
    支持格式：
      - "0000120000000000"
      - "00:00:12:00:00:00:00"
      - "00 00 12 00 00 00 00"
    返回 keycode (int) 或 None（无效行）
    """
    line = line.strip()
    if not line:
        return None

    # 移除所有非十六进制字符（保留0-9, a-f, A-F）
    cleaned = ''.join(ch for ch in line if ch.lower() in '0123456789abcdef')
    
    # 至少需要8个字符（4字节）才能取到第3字节（索引4-6）
    if len(cleaned) < 8:
        return None

    try:
        # 第3字节：从索引4开始取2个字符
        key_hex = cleaned[4:6]
        keycode = int(key_hex, 16)
        return keycode
    except ValueError:
        return None

def main(input_file='usbdata.txt'):
    output = ""
    with open(input_file, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            keycode = clean_and_extract_keycode(line)
            if keycode is None or keycode == 0:
                continue  # 跳过无效行或无按键

            if keycode in mappings:
                output += mappings[keycode]
            else:
                # 保留 unknown 并显示原始值，便于调试
                output += f"[unknown:0x{keycode:02X}]"

    print("Recovered keystrokes:")
    print("-" * 40)
    print(output)
    print("-" * 40)

if __name__ == "__main__":
    # 默认读取 'usbdata.txt'，你也可以改成 '2.8.1.txt' 或其他
    main('222.txt')
```

```plain
output : 35C535765E50074A
```

```plain
output:526172211A0700[unknown]C[unknown]F907300000D00000000000000C4527424943500300000002[unknown]A000000[unknown]02B9F9B0530778B5541D33080020000000666C61672[unknown]E[unknown]747874[unknown]B9B[unknown]A013242F3A[unknown]FC[unknown]000B092C229D6E994167C05[unknown]A7[unknown]8708B271F[unknown]FC[unknown]042AE3D251E65536[unknown]F9A[unknown]DA87C77406B67D0[unknown]E6316684766[unknown]A86E844D[unknown]C81AA2[unknown]C72C71348D10C4[unknown]C[DEL]3D7B[unknown]00400700
```

删除`[unknown]`和`C[DEL]`

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61758892/1768829480066-dd5868d0-4d49-47b7-b2df-ab67f6d1fc7e.png)

是一个`rar`文件 用winrar打开 密码就是另一个output 但是改成小写 因为实际上没有按`cap lock`键 仍然是小写 嗯嗯！

`NSSCTF{20de17cc-d2c1-4b61-bebd-41159ed7172d}`



# [NISACTF 2022]破损的flag
**flag真的是flag吗？****  
****Tips：flag格式为NSSCTF{}****  
****ps:记得补全单词哦，单词和单词之间记得加_哦**

确认文件类型是流量包 在后缀加`.pcapng`

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61758892/1768879043284-5f0576fe-d309-474e-a0c2-7c221a6d3f0b.png)

tshark抓取原始数据

```plain
"D:\Wireshark\tshark.exe" -r "D:\usb\usbdata.pcapng" -T fields -e usb.capdata > "D:\usb\usbdata.txt"
```

运行脚本还原字符串

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61758892/1768882224749-b197d3dc-49ec-45d3-81fc-ac78ef8057ca.png)

```python
UJKONJK,TFVBHYHJIPOKRDCVGRDCVGPOKQWSZTFVBHUJKOWAZXDQASEWSDRPOKXDFVIKLPNJKWSDRRFGYRDCVGUHNMKBHJMYHJI
```

以3-5个字母为单位，键盘上被围起来的字符有

i m g u l f f l a g i s w e l c o m e t f j n u

im gulf flag is welcome t fjnu

`NSSCTF{welcome_to_fjnu}`



# [MoeCTF 2022]usb
使用过滤器`usbhid.data`

```python
"D:\Wireshark\tshark.exe" -r "D:\usb\usbhid.pcapng" -T fields -e usb.capdata > "D:\usb\usb.txt"
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61758892/1768898081712-4f7cc44e-dda6-47bc-82d7-3edddbe0721c.png)

`MOECTF{Learned-a6ou7-USB-tr2ffic}`

但是不是flag 我回头才发现那个脚本忽略了modifier

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61758892/1768898856287-8108d5db-a6d6-4b7d-9eea-e84f6f055ee9.png)

脚本我又改了改 会自动完成del 增加了modifier key 还有shift按住等操作 

`<font style="background-color:rgb(249, 242, 244);">NSSCTF{Learned_a6ou7_USB_tr@ffic}</font>`



在一个wp看到了一把梭软件 `CTF-NetA-V0.3.0`

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61758892/1768898704988-86dce36c-09c4-4e7d-9610-90fdc0e695f3.png)



# [GFCTF 2021]双击开始冒险
据说是生日 还是四位数字 爆破

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61758892/1768900351634-95ec3365-29d7-4dff-b80d-6b7551e80a54.png)

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61758892/1768900656545-1e5923cb-fa5f-445e-93ec-5ea24c2feb3a.png)

应该是出题人的QQ号捏 搜了一下 啥也没有 看了一眼wp 出题人之前有一个个性签名`WW91IGxvdmUgbWUsIEkgbG92ZSB5b3U=`现在换掉了嗯嗯

`From Base64`之后获得`You love me, I love you`是第二层的密码

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61758892/1768901039900-42c8b872-6622-49d9-b835-d583b828b576.png)打开流量包 可以看到只有地址为`1.2.1`的`Info`是`URB_INTERUPT in`其他都比较杂乱 不符合标准

过滤器：`usb.data_len == 8 and usb.src =="1.2.1"`

导出特定分组

```python
"D:\Wireshark\tshark.exe" -r "D:\usb\usbnew.pcapng" -T fields -e usb.capdata > "D:\usb\usbnew.txt"
```

```python
# mouse_parser_for_your_data.py
with open("usbnew.txt", "r") as f_in:
    posx = 0
    posy = 0
    click_points = []

    for line in f_in:
        line = line.strip()
        # 清理非十六进制字符（如冒号、空格）
        clean = ''.join(c for c in line if c.lower() in '0123456789abcdef')
        if len(clean) < 10:  # 至少需要 5 字节 (0-4)
            continue

        try:
            # 提取关键字节（每个字节2字符）
            btn = int(clean[0:2], 16)   # Byte 0: 按钮
            x   = int(clean[4:6], 16)   # Byte 2: X 增量 ← 注意是 [4:6]
            y   = int(clean[8:10], 16)  # Byte 4: Y 增量 ← 注意是 [8:10]

            # 转为有符号 byte (-128 ~ 127)
            if x > 127:
                x -= 256
            if y > 127:
                y -= 256

            posx += x
            posy += y

            # 记录左键点击（btn == 1）或左右键（btn == 3）
            if btn in (1, 3):
                click_points.append((posx, -posy))  # Y 取反：图像坐标系

        except Exception as e:
            continue  # 跳过异常行

# 自动写入 out.txt
with open("out.txt", "w") as f_out:
    for x, y in click_points:
        f_out.write(f"{x} {y}\n")

print(f"✅ 成功提取 {len(click_points)} 个点击点，已保存到 out.txt")
```

提取后得到鼠标位移状态 进行绘图

```python
import matplotlib.pyplot as plt

# 读取 out.txt 文件中的数据
try:
    with open('out.txt', 'r') as file:
        lines = file.readlines()
except FileNotFoundError:
    print("❌ 错误：找不到 out.txt 文件！请先运行鼠标解析脚本。")
    exit()

if not lines:
    print("❌ out.txt 为空，没有点击点数据。")
    exit()

x_values = []
y_values = []

for line in lines:
    line = line.strip()
    if not line:
        continue
    try:
        x, y = line.split()
        x_values.append(float(x))
        y_values.append(float(y))
    except ValueError:
        continue  # 跳过格式错误的行

if not x_values:
    print("❌ 没有有效坐标数据。")
    exit()

# 创建散点图
plt.figure(figsize=(10, 8))  # 设置画布大小
plt.scatter(x_values, y_values, s=1)  # s=1 让点更小，适合密集轨迹
plt.xlabel('X')
plt.ylabel('Y')
plt.title('Mouse Click Trace')
plt.grid(True)

# 保持纵横比一致（防止图像变形）
plt.axis('equal')

# 保存图像
plt.savefig('out.png', dpi=300, bbox_inches='tight')
print("✅ 图像已保存为 out.png")

# （可选）显示图像（在本地运行时可用）
# plt.show()
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61758892/1768903099843-897e1140-984a-4d1a-8f7c-157698bf6062.png)

`7724774CTF`是`F1111AG.jpg*`的密码<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/jpeg/61758892/1768902981070-11209e1b-52d9-4d5c-9c0d-03fa82715d33.jpeg)

010末尾获得flag

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61758892/1768903411405-13643852-d3d6-4191-9ba5-1417b2caf986.png)

`NSSCTF{this_is_rea1_fllllll11ag}`



# [SWPU 2020]来猜谜了
图片经过LSB 压缩包形式 `save bin`

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61758892/1768910744415-388d7e6a-060c-4366-98f6-d1525fcab4d9.png)

过滤器`usb.data_len == 8 and usb.src =="1.1.1"`

导出

```python
"D:\Wireshark\tshark.exe" -r "D:\usb\usben.pcap" -T fields -e usb.capdata > "D:\usb\usben.txt"
```

跑脚本

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61758892/1768911602695-d9a1c141-1ec0-4938-830b-c5552042f358.png)

搜了一下

## adfgx密码
二战时期德国使用的密码体系 是棋盘密码和换位加密的组合

先把明文变成坐标 再把坐标打乱顺序 最终得到看似无规律的密文

```python
    A D F G X
  -------------
A | p h q g m
D | e a y n o
F | f d x k r
G | c v s z w
X | b u t i/j l
```

比如说我们要加密`luxlu`

看表对照我们就可以得到`XX XD FF XX XD`(先读行再读列)

也就是`X X X D F F X X X D`

假设密钥是`misc`

长度是4 四列 密钥长度是4 总字符数是10 于是行数是10/4=3行 最后一行不完整

创建了一个3行 四列的表格

| X | X | X | D |
| --- | --- | --- | --- |
| F | F | X | X |
| X | D |  |  |


确定列的读取顺序 根据密钥字母顺序 密钥是`misc`

按照字母表顺序`misc 1234`的顺序是`c i m s 4213`

读取`DXXFDXFXXX`是最后密文

---

这个题不要那么复杂 只需要读表就行了 `go go go`

题名`来猜迷了`还有`jpg隐写`联想到`outguess`

kali运行outguess

`outguess -k gogogo -r /home/kali/Desktop/mi.jpg /home/kali/Desktop/mi.txt`

`NSSCTF{Out9uEsS_1s_V4rY_e4sy}`

# [MoeCTF 2021]诺亚的日记
很常规的操作

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61758892/1768918691753-ae790569-579f-4bef-a371-e75e58a1e773.png)

`moectf{D@m3daNe_D4me_yoooooo}`

# [LitCTF 2025]消失的文字
鼠标流量 同样方法绘制出轨迹

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61758892/1768919507642-6a52858e-34fb-4fb4-a61f-bab6b3e52571.png)

水平翻折获得`868F-83BD-FF`是文本的密码

搜一下名字hidden-word

[https://hidden-word.top/](https://hidden-word.top/)

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61758892/1768920066613-fbd6f4fa-0adf-468c-88a9-cce46a32a407.png)

`LitCTF{39553317-df30-4951-8aad-fcaf3028ca9d}`

# [NewStarCTF2025w2]Misc 城邦：NewKeyboard
过滤器：`usb.addr=="1.1.2"`

分别导出字母表和flag的特定分组

```plain
"D:\Wireshark\tshark.exe" -r D:\usb\1.pcapng -Y "usb.capdata" -T fields -e usb.capdata > D:\usb\1.txt
```

名为`abcdefghijklmnopqrstuvwxyz1234567890-_!{}.pcapng`的文件的输出结果如下 研究了一段时间 我才发现 这是一个已知输入内容的USB键盘流量包 也就是字符对照表

有一个傻瓜方法就是把上面这个做成映射表然后运行python脚本 不去考虑编码逻辑



**观察字母表的txt文件 解释一下字符映射规律**

**比如说“**`**_**`**”**

```plain
[Modifier][保留][Key1][Key2][Key3]...（共 21 字节，42 个 hex 字符）
```

**Modifier四字节 **`**0100**`**是没有按**`**shift**`** **`**0102**`**是按住了**`**shift**`

**从第五字节开始 如果全是**`**00**`**表示没有按键按下**

```plain
01020000000000200000000000000000000000000000   → shift+"-"对应"_"
```

```plain
01020000000000000000000000000000000000000000   → shift仍然按着
```

```plain
01000000000000000000000000000000000000000000   → shift也松开了
```

```plain
01001000000000000000000000000000000000000000
01000000000000000000000000000000000000000000

01002000000000000000000000000000000000000000
01000000000000000000000000000000000000000000

01004000000000000000000000000000000000000000
01000000000000000000000000000000000000000000

01008000000000000000000000000000000000000000
01000000000000000000000000000000000000000000

01000001000000000000000000000000000000000000
01000000000000000000000000000000000000000000

01000002000000000000000000000000000000000000
01000000000000000000000000000000000000000000

01000004000000000000000000000000000000000000
01000000000000000000000000000000000000000000

01000008000000000000000000000000000000000000
01000000000000000000000000000000000000000000

01000010000000000000000000000000000000000000
01000000000000000000000000000000000000000000

01000020000000000000000000000000000000000000
01000000000000000000000000000000000000000000

01000040000000000000000000000000000000000000
01000000000000000000000000000000000000000000

01000080000000000000000000000000000000000000
01000000000000000000000000000000000000000000

01000000010000000000000000000000000000000000
01000000000000000000000000000000000000000000

01000000020000000000000000000000000000000000
01000000000000000000000000000000000000000000

01000000040000000000000000000000000000000000
01000000000000000000000000000000000000000000

01000000080000000000000000000000000000000000
01000000000000000000000000000000000000000000

01000000100000000000000000000000000000000000
01000000000000000000000000000000000000000000

01000000200000000000000000000000000000000000
01000000000000000000000000000000000000000000

01000000400000000000000000000000000000000000
01000000000000000000000000000000000000000000

01000000800000000000000000000000000000000000
01000000000000000000000000000000000000000000

01000000000100000000000000000000000000000000
01000000000000000000000000000000000000000000

01000000000200000000000000000000000000000000
01000000000000000000000000000000000000000000

01000000000400000000000000000000000000000000
01000000000000000000000000000000000000000000

01000000000800000000000000000000000000000000
01000000000000000000000000000000000000000000

01000000001000000000000000000000000000000000
01000000000000000000000000000000000000000000

01000000002000000000000000000000000000000000
01000000000000000000000000000000000000000000

01000000004000000000000000000000000000000000
01000000000000000000000000000000000000000000

01000000008000000000000000000000000000000000
01000000000000000000000000000000000000000000

01000000000001000000000000000000000000000000
01000000000000000000000000000000000000000000

01000000000002000000000000000000000000000000
01000000000000000000000000000000000000000000

01000000000004000000000000000000000000000000
01000000000000000000000000000000000000000000

01000000000008000000000000000000000000000000
01000000000000000000000000000000000000000000

01000000000010000000000000000000000000000000
01000000000000000000000000000000000000000000

01000000000020000000000000000000000000000000
01000000000000000000000000000000000000000000

01000000000040000000000000000000000000000000
01000000000000000000000000000000000000000000

01000000000080000000000000000000000000000000
01000000000000000000000000000000000000000000

01000000000000200000000000000000000000000000   → "-"
01000000000000000000000000000000000000000000   → 没按shift

01020000000000000000000000000000000000000000   → shift按上去
01020000000000200000000000000000000000000000   → shift+"-"="_"
01020000000000000000000000000000000000000000   → shift还按着
01000000000000000000000000000000000000000000   → shift松开

01020000000000000000000000000000000000000000   → shift按上去
01020000004000000000000000000000000000000000   → shift+"1"="!"
01020000000000000000000000000000000000000000   → shift还按着
01000000000000000000000000000000000000000000   → shift松开

01020000000000000000000000000000000000000000   → shift按上去
01020000000000800000000000000000000000000000   → shift+"["="{"
01020000000000000000000000000000000000000000   → shift还按着
01000000000000000000000000000000000000000000   → shift松开

01020000000000000000000000000000000000000000   → shift按上去
01020000000000000100000000000000000000000000   → shift+"]"="}"
01020000000000000000000000000000000000000000   → shift还按着
01000000000000000000000000000000000000000000   → shift松开
```

```python
normalKeys = {
    '01001000000000000000000000000000000000000000': 'a',
    '01002000000000000000000000000000000000000000': 'b',
    '01004000000000000000000000000000000000000000': 'c',
    '01008000000000000000000000000000000000000000': 'd',
    '01000001000000000000000000000000000000000000': 'e',
    '01000002000000000000000000000000000000000000': 'f',
    '01000004000000000000000000000000000000000000': 'g',
    '01000008000000000000000000000000000000000000': 'h',
    '01000010000000000000000000000000000000000000': 'i',
    '01000020000000000000000000000000000000000000': 'j',
    '01000040000000000000000000000000000000000000': 'k',
    '01000080000000000000000000000000000000000000': 'l',
    '01000000010000000000000000000000000000000000': 'm',
    '01000000020000000000000000000000000000000000': 'n',
    '01000000040000000000000000000000000000000000': 'o',
    '01000000080000000000000000000000000000000000': 'p',
    '01000000100000000000000000000000000000000000': 'q',
    '01000000200000000000000000000000000000000000': 'r',
    '01000000400000000000000000000000000000000000': 's',
    '01000000800000000000000000000000000000000000': 't',
    '01000000000100000000000000000000000000000000': 'u',
    '01000000000200000000000000000000000000000000': 'v',
    '01000000000400000000000000000000000000000000': 'w',
    '01000000000800000000000000000000000000000000': 'x',
    '01000000001000000000000000000000000000000000': 'y',
    '01000000002000000000000000000000000000000000': 'z',
    '01000000004000000000000000000000000000000000': '1',
    '01000000008000000000000000000000000000000000': '2',
    '01000000000001000000000000000000000000000000': '3',
    '01000000000002000000000000000000000000000000': '4',
    '01000000000004000000000000000000000000000000': '5',
    '01000000000008000000000000000000000000000000': '6',
    '01000000000010000000000000000000000000000000': '7',
    '01000000000020000000000000000000000000000000': '8',
    '01000000000040000000000000000000000000000000': '9',
    '01000000000080000000000000000000000000000000': '0',
    '01000000000000200000000000000000000000000000': '-',
    '01020000000000200000000000000000000000000000': '_',
    '01020000004000000000000000000000000000000000': '!',
    '01020000000000800000000000000000000000000000': '{',
    '01020000000000000100000000000000000000000000': '}'
}

nums = []
keys = open('2.txt', 'rt')  # 打开文件
for line in keys:
    line = line.strip()  # 去掉换行符
    # print(line)
    nums.append(line)
keys.close()

output = ""
for n in nums:
    if n in normalKeys:
        output += normalKeys[n]
        # 只有当某一行n出现在normalkeys的键中 才输出对应字符
        # 如果不在，就跳过
    # else:
    #     output += '[unknown]'

print('output :' + output)
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61758892/1769417159053-ff65d047-a103-4360-81e4-eceaa2575863.png)

事实证明 如果不把`alphabet.txt`看懂是无法写出脚本的

`flag{th1s_is_newkeyboard_y0u_get_it!}`











<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61758892/1771898184768-8bc631bb-5156-466b-a88e-d6474c483954.png)



<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61758892/1771898324602-045f3c03-1a14-4747-b00a-d08fb7e13245.png)

另存为jpg图片

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/jpeg/61758892/1771898638488-f38c903a-2772-46a2-9445-5a54cb170f33.jpeg)


