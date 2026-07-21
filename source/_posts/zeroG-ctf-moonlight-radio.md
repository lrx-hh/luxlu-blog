---
title: ZeroG CTF 2026 - Moonlight Radio (Misc) Writeup
date: 2026-07-21 14:00:00
categories:
  - CTF
  - Misc
tags:
  - CTF
  - Misc
  - DTMF
  - SHA256
  - Crypto
  - Writeup
cover: /img/jpg/9.jpg
---

题目来源：[https://www.ctfplus.cn/problem-detail/2059190642604511232/description](https://www.ctfplus.cn/problem-detail/2059190642604511232/description)

## DTMF

听一下 `radio.wav` 听出来是拨号音。

旧时代电话系统的声音：**DTMF 电话拨号音**。

DTMF 是传统电话系统使用的拨号信号，每个按键由两个固定频率的正弦波叠加组成。也就是按一个键 = 一个低频 + 一个高频同时响。

![](https://cdn.nlark.com/yuque/0/2026/png/61758892/1784604214333-67509e0b-aa66-4063-9279-5f15c5935dd1.png)

比如按 `5` = `770Hz` + `1336Hz` 两个正弦波叠在一起。

解码 DTMF 有两种方式：

| 方法 | 原理 | 优劣 |
| :--- | --- | :--- |
| Goertzel 算法 | 对 8 个目标频率逐个算能量 | 只算需要的频率，O(N)，快 |
| FFT | 全频谱扫描 | 算一堆不需要的频率，O(N log N) |

因为 DTMF 只有固定的 8 个频率，**Goertzel 更合适**。窗口大小一般取 40ms（DTMF 标准规定每个音至少持续 40ms），步长 20ms（50% 重叠防止错过边界）。

当然，不想手写 Goertzel 的话直接用在线工具也行：[https://dtmf.netlify.app/](https://dtmf.netlify.app/)

![](https://cdn.nlark.com/yuque/0/2026/png/61758892/1784604961365-621494b2-8d00-4931-9242-c98423522a76.png)

解码结果：

```plain
108117110097114045049055048049
```

> **一个容易被忽略的坑**：音频里连续两个按键（比如说两个 1），中间的间隙只有 60ms，探测器可能把它们合并成一个 420ms 的长音。需要额外逻辑：超过 250ms 的连续监测强制拆分 —— 不然会得到 25 个数字而非 30 个。

30 位刚好被 3 整除，全部落在 ASCII 可打印范围（32-126）：

```python
digits = "108117110097114045049055048049"
password = ""
for i in range(0, len(digits), 3):
    decimal = int(digits[i:i+3])
    password += chr(decimal)
print(password)
```

输出：

```python
lunar-1701
```

## SHA-256 密钥派生（KDF）

A 留下的公式，密钥派生函数：

```python
key = sha256("ZeroG::" + radio_password + "::www.pwnstars.online")
```

拆开看：`前缀::密码::域名`，用 `::` 当分隔符。

SHA-256 输出固定 32 字节（256 位），正好当对称密钥用。

相当于简易版的 HKDF —— 正版 HKDF 有 extract + expand 两步带 salt，这里只做了一步哈希。但思路一样。

出题人只给了这一个公式，全文没出现过 "AES" 三个字。因此加密层大概率也只用 SHA-256 构建，不是标准分组密码。

关于 KDF 的更多细节：[RFC 5869 (HKDF)](https://datatracker.ietf.org/doc/html/rfc5869)

## telemetry.dat 文件结构

```python
telemetry.dat 结构 (411 bytes):
┌──────────────┬──────────────┬─────────────────────────┐
│ Magic (8B)   │ Nonce (8B)   │ Ciphertext (395B)       │
│ ZGTELv2\n    │ ZGRMOON2     │ [SHA256-CTR encrypted]  │
└──────────────┴──────────────┴─────────────────────────┘
```

![](https://cdn.nlark.com/yuque/0/2026/png/61758892/1784605768454-1a425715-d5d9-4bba-ad71-8e326e683507.png)

前 16 字节是可读 ASCII，后面都是乱码——这是典型结构：**明文头（16 字节）+ 加密体**。

`0A` 是 `\n`，往往表示第一段结束，拆成 8+8 的形式。

## 加密算法：xorstream-sha256-ctr

README 里 A 的公式：

```python
key = sha256("ZeroG::lunar-1701::www.pwnstars.online")
```

此处应该为 `SHA256`（密钥 + 某个变化的值）= 32 字节随机数 → XOR 数据 = 加密。**也就是用哈希函数当随机数生成器**。

接下来尝试各种组合：

```python
keystream = SHA256(key + nonce + counter_0)
          + SHA256(key + nonce + counter_1)
          + SHA256(key + nonce + counter_2)
          + ...

plaintext = ciphertext XOR keystream
```

```python
# 猜 nonce 在哪？试试：
SHA256(key + 文件头最后8字节 + counter)    # nonce 取 ZGRMOON2
SHA256(key + 文件头全部16字节 + counter)   # nonce 取全部
SHA256(key + counter)                     # 不用 nonce

# 猜 nonce 和 counter 谁在前？
SHA256(key + nonce + counter)
SHA256(key + counter + nonce)

# 猜 counter 是几字节？字节序？
counter.to_bytes(4, 'big')    # 4字节大端
counter.to_bytes(4, 'little') # 4字节小端
counter.to_bytes(8, 'big')    # 8字节大端
```

排列组合跑一遍，哪一个出可读英文就是哪一个。最终命中：

```
SHA256(key + ZGRMOON2 + counter_4字节大端)
```

解密后的结果：

```python
ZeroG Moonlight Telemetry Frame

Lab      : Pwnstars
Crew     : N1 / A / Hugo / Gnaw / Fen
Home     : www.pwnstars.online
Channel  : Moonlight Radio
Cipher   : xorstream-sha256-ctr
KDF      : sha256("ZeroG::" + radio_password + "::www.pwnstars.online")

Message:
    DTMF is not encryption.
    It is only a way to send symbols through sound.

FINAL=c3ludHtNcmViVF96YmJheXZ0dWdfZW5xdmJfcWd6c30=
```

```python
FINAL=c3ludHtNcmViVF96YmJheXZ0dWdfZW5xdmJfcWd6c30=
```

先 Base64 再 ROT13 即可：

- **Base64 解码** → `synt{MrebT_zbbayvtug_enqvb_qgzs}`
- **ROT13** → `flag{ZeroG_moonlight_radio_dtmf}`

## 完整 Exp

```python
import hashlib, re, base64, struct

# ===== Step 1: DTMF → password =====
digits = "108117110097114045049055048049"
radio_password = ''.join(chr(int(digits[i:i+3])) for i in range(0, len(digits), 3))
print(f"[1] radio_password = {radio_password}")

# ===== Step 2: Read file =====
with open("telemetry.dat", "rb") as f:
    data = f.read()

magic      = data[:8]      # b"ZGTELv2\n"
nonce      = data[8:16]    # b"ZGRMOON2"
ciphertext = data[16:]

# ===== Step 3: Key Derivation =====
key_material = f"ZeroG::{radio_password}::www.pwnstars.online"
key = hashlib.sha256(key_material.encode()).digest()

# ===== Step 4: SHA256-CTR Decrypt =====
stream = b""
counter = 0
while len(stream) < len(ciphertext):
    counter_bytes = counter.to_bytes(4, "big")
    stream += hashlib.sha256(key + nonce + counter_bytes).digest()
    counter += 1

plaintext = bytes(c ^ s for c, s in zip(ciphertext, stream))
text = plaintext.decode()
print(f"[4] Decrypted:\n{text}")

# ===== Step 5: Extract Flag =====
match = re.search(r"FINAL=([A-Za-z0-9+/=]+)", text)
b64   = base64.b64decode(match.group(1)).decode()
flag  = __import__('codecs').decode(b64, 'rot13')
print(f"[5] Flag: {flag}")
```
