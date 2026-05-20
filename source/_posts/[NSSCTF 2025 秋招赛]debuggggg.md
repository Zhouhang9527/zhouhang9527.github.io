---
title: "[NSSCTF 2025 秋招赛] debuggggg"
date: 2025-11-05 10:45:00
categories: reverse
tags:
  - CTF
  - Reverse
  - 动态调试
  - Linux
  - 反反调试
description: "NSSCTF 2025 秋招赛第五题 debuggggg 的详细解题过程，主要记录 WSL 远程调试和 patch 技巧。"
---

### 题目五: debuggggg
样本是个 Linux 可执行文件，`main` 里读取输入后调用若干校验函数。

![](pasted-image-20251104221613.png)

静态分析很快被 `rand()` 绕住，找不到 seed 就无法还原 `buf`。题目名字已经明示要“调试”，于是直接改用 WSL 远程调试。

![](pasted-image-20251104221751.png)

![](pasted-image-20251104222157.png)

进入调试后发现程序在关键逻辑之前还有一段输入长度检测，不达到要求就直接退出，断点根本跑不到。把这里的条件跳转 patch 掉，强制通过长度校验。

![](pasted-image-20251104223356.png)

![](pasted-image-20251104223512.png)

记得改完要重新加载 patched 版本（`copy new`），不然还是老代码。

![](pasted-image-20251104224152.png)

![](pasted-image-20251104224419.png)

拿到 `rand()` 生成的数组之后，脚本只需要按模运算逆推即可。加密是 `C = (P + K) mod 256`，解密自然就是 `P = (C - K) mod 256`（为了保险可以先加 256 再取模）。遍历密文，逐个还原字符，flag 就出来了。

```python
flag += chr(p)
print("Flag:", flag)
```

## 总结

这是一道动态调试题目，主要考察以下能力点：

- Linux 程序的动态调试
- IDA 远程调试配置
- 程序 patch 技术
- 随机数相关加密的逆向

通过动态调试获取关键数据，最终成功破解了 flag。

本文记录了个人解题思路和学习过程，旨在交流技术心得。如有错误欢迎指正！
