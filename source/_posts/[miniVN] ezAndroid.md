---
title: '[miniVN] ezAndroid'
date: 2025-12-23 10:00:00
categories: reverse
tags:
  - CTF
  - Reverse
  - Android
  - AES
  - XTEA
description: miniVN ezAndroid 题解，jadx + so 分析，AES/XTEA 解密还原 flag。
---

## 题目信息

**题目名称**: ezAndroid
**类型**: Reverse Engineering / Android

## 解题过程

直接 jadx 打开，定位到 `MainActivity`。

![](image-20251207134252867.png)

逻辑就是先检查 flag 的长度是否为 31、是否是 `VNCTF{}` 格式，然后把花括号内部的内容分别传进 `check1` 和 `check2`。

![](image-20251207134445601.png)

再去 `value/strings.xml` 找到 AES 用的 key。

![](image-20251207134541436.png)

用 CyberChef 解出第一部分。

![](image-20251207134700960.png)

从这里可以看到 `check2` 的逻辑在 so 层，解压 apk 用 IDA 打开 so 文件。

![](image-20251207134710357.png)

发现是一个 XTEA 加密，key 已经给出了：`Th1sIsAn3asyChal`。

![](image-20251207134901393.png)

![](image-20251207135007174.png)

再通过交叉引用找到 delta 的值。

![](image-20251207135036412.png)

写出解密脚本解出第二部分。

```python
import struct

def u32(x):
    return x & 0xFFFFFFFF

keyy = [0x73316854, 0x6E417349, 0x79736133, 0x6C616843]

enc_v1, enc_v2 = 0xAD05217D, 0xF7C0C3E2

delta = 1743291877

sum_ = u32(delta * 32)

v1, v2 = enc_v1, enc_v2

for _ in range(32):
    v2 = u32(v2 - ((keyy[(sum_ >> 8) & 3] + sum_) ^ (v1 + ((v1 >> 5) ^ (4 * v1)))))
    v1 = u32(v1 - ((keyy[sum_ & 3] + sum_) ^ (v2 + ((v2 >> 6) ^ (8 * v2)))))
    sum_ = u32(sum_ - delta)

flag_bytes = struct.pack('<II', v1, v2)

print('bytes:', flag_bytes)
print('hex  :', flag_bytes.hex())
try:
    print('utf-8:', flag_bytes.decode('utf-8'))
except UnicodeDecodeError:
    print('latin1:', flag_bytes.decode('latin-1'))
# nd_xt3a!
```

最终得到完整 flag：`VNCTF{u_Know_@ndro1d_And_xt3a!}`
