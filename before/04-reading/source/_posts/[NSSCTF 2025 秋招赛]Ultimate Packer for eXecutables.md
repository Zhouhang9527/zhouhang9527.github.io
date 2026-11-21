---
title: '[NSSCTF 2025 秋招赛] Ultimate Packer for eXecutables'
date: 2025-11-05 10:30:00
categories: reverse
tags:
  - CTF
  - Reverse
  - UPX
  - 脱壳
  - IDA Pro
description: NSSCTF 2025 秋招赛第四题 Ultimate Packer for eXecutables 的详细解题过程，UPX 脱壳与逆向分析。
---

### 题目四:Ultimate Packer for eXecutables
DIE 显示样本被 UPX 压缩，还提示入口信息异常。

![](pasted-image-20251104182310.png)

直接 `upx -d` 会报错，因为作者把头部签名改掉了。

![](pasted-image-20251104182334.png)

用 010 Editor 打开，手工把 `UPX!` 对应的几个字节覆写回来。

![](pasted-image-20251104182708.png)

保存后重新 `upx -d` 就能顺利脱壳。后续流程：把修复后的二进制丢进 IDA，跟代码逻辑写解密脚本即可。注意程序中有 `input * 122` 这种会溢出的运算，所以脚本里采用遍历可打印字符、逐字节模 256 验证，避免直接倒推导致结果不对。

