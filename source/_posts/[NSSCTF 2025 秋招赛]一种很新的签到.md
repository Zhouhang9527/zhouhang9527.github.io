---
title: '[NSSCTF 2025 秋招赛] 一种很新的签到'
date: 2025-11-05 09:00:00
categories: reverse
tags:
  - CTF
  - Reverse
  - 签到题
  - IDA Pro
description: NSSCTF 2025 秋招赛第一题一种很新的签到的详细解题过程。
---

### 题目一:一种很新的签到
先把程序丢进 DIE，确认没有装壳之后直接交给 IDA 处理。

![](pasted-image-20251103232546.png)

IDA 里进入 `main`，按 `F5` 虽然能看到伪代码，但流程有些噪音。直接 `Shift+F12` 查看字符串表，硬编码的 flag 就明晃晃地躺在那里，抄下来提交即可。
