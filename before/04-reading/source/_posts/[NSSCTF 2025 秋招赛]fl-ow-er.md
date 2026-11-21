---
title: '[NSSCTF 2025 秋招赛] fl-ow-er'
date: 2025-11-05 09:30:00
categories: reverse
tags:
  - CTF
  - Reverse
  - 花指令
  - IDA Pro
  - 异或解密
description: NSSCTF 2025 秋招赛第二题 fl-ow-er 的记录。
permalink: /2025/11/05/[NSSCTF 2025 秋招赛]fl-ow-er/
---

### 题目二:fl~ow~er~
拖进 IDA 之后直接 `F5` 会提示存在跳转陷阱，一眼望去全是经典的花指令 —— 成对的 `jz/jnz` 以及对同一地址的重复跳转。

![](pasted-image-20251103233312.png)

处理思路也很固定：先按 `U` 取消反编译，再 `Ctrl+N` 把被花指令“包裹”的字节改成 `NOP`，最后 `C` 重新识别，流程就顺回来了。

![](pasted-image-20251103233447.png)

遇到必跳的 `jz`/`jnz` 组合时，把其中一条改成 `jmp`，另一条直接填 `NOP`。接下来还有一处“`xor eax, eax` + `jz`”的隐藏花指令，同理改成 `jmp` 并清理冗余字节即可。

![](pasted-image-20251103233645.png)

![](pasted-image-20251103233707.png)

花指令清完再 `F5`，`main` 的伪代码就能顺利出来。继续跟进 `loc_401000`，核心逻辑只是简单的异或循环。把数据段里的密文和密钥抠出来，写个脚本逐字节 `cipher[i] ^ key[i]`，就能把 flag 弄出来。
