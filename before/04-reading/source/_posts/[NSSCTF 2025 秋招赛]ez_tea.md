---
title: '[NSSCTF 2025 秋招赛] ez_tea'
date: 2025-11-05 12:30:00
categories: reverse
tags:
  - CTF
  - Reverse
  - 反反调试
  - TEA
  - 动态调试
description: NSSCTF 2025 秋招赛第八题 ez_tea 的详细解题过程，反反调试与 TEA 解密分析。
---

## 题目信息

**题目名称**: [NSSCTF 2025 秋招赛] ez_tea
**类型**: Reverse Engineering
**难度**: 中等

## 解题过程

### 题目八:ez_tea
程序执行前会先弹对话框提示“检测到调试器”，随后直接退出。查 API 引用时能看到 `MessageBox` 和常见的 `IsDebuggerPresent` 等函数，锁定反调试模块后，把入口 patch 成 `ret` 就能让程序安静下来。

绕过之后继续动调，发现读入的 flag 先被简单混淆，再走了一遍改造过常量的 TEA。把加密块和新的 key dump 出来，照旧写脚本倒着执行 —— 每轮扣掉 `delta`、处理高位低位、循环 32 次。最后把混淆操作按原逻辑逆过来（按位异或/加减）就能还原明文。
