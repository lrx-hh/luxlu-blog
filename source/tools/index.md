---
title: 工具箱
date: 2026-03-28 19:05:00
comments: false
top_img: /img/black-pink-cover.svg
description: CTF Misc 常用工具速查。
---

## 核心工具

1. `CyberChef`：编码、解码、数据清洗
2. `binwalk`：固件与文件提取
3. `exiftool`：元数据检查
4. `Wireshark`：流量分析
5. `zsteg`：图片隐写扫描

## 快速命令

```bash
strings file.bin | head
binwalk -e file.bin
exiftool image.png
```

## 使用原则

1. 先扫基础信息，再深入单点
2. 每步记录输入、输出和结论
3. 赛后把高频流程脚本化
