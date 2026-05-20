---
title: '[NSSCTF 2025 秋招赛] 哈基米'
date: 2025-11-05 10:00:00
categories: reverse
tags:
  - CTF
  - Reverse
  - PyInstaller
  - Python反编译
  - pycdc
description: NSSCTF 2025 秋招赛第三题哈基米的记录。
---

### 题目三:哈基米
附件是一个 exe，拖进 DIE 一眼就能看出是 PyInstaller 打包。

![](pasted-image-20251104110246.png)

直接用 `pyinstxtractor` 解包，能拿到一堆 `pyc` 文件。

![](pasted-image-20251104110649.png)

在生成的 `pyi` 清单里能看到目标运行时是 Python 3.8。

![](pasted-image-20251104110755.png)

因此反编译时选 `uncompyle6`（或仓库里的 `Exe-decompiling`），优先把 `HJM.pyc` 还原。

![](pasted-image-20251104113113.png)

伪代码里引用了另一个模块里的 `CHARS1`。顺着路径继续反编译，就能得到生成表的逻辑。把那段代码抄进自己的脚本，按原算法恢复字母表，再和密文做一遍同样的处理即可拿到 flag。

![](pasted-image-20251104133841.png)
