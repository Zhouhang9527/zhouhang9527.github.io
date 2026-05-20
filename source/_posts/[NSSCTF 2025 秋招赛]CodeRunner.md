---
title: '[NSSCTF 2025 秋招赛] CodeRunner'
date: 2025-11-05 11:30:00
categories: reverse
tags:
  - CTF
  - Reverse
  - Unity
  - IL2CPP
  - 动态调试
description: NSSCTF 2025 秋招赛第六题 CodeRunner 的详细解题过程，Unity IL2CPP 逆向分析。
---

## 题目信息

**题目名称**: [NSSCTF 2025 秋招赛] CodeRunner
**类型**: Reverse Engineering
**难度**: 困难

## 解题过程

### 第一步：文件分析


![Detect IL2CPP 后端](pasted-image-20251105125646.png)

Unity3D 程序，解压后发现是 IL2CPP 后端（不是 Mono）。

### 第二步：脱壳处理

发现 GameAssembly.dll 被 UPX 加壳且文件头被修改。用 010 Editor 修复文件头后脱壳。

![010 Editor 修头](pasted-image-20251105130503.png)

![010 Editor 更多细节](pasted-image-20251105131649.png)


### 第三步：IL2CPP 反编译

使用 IL2cppDumper 从二进制文件中提取类型和方法信息。

![IL2cppDumper 导出](pasted-image-20251105125812.png)

![IL2cppDumper 导出结果](pasted-image-20251105130714.png)

### 第四步：代码反编译

使用 dnSpy 反编译 .NET 代码。

![dnSpy 关键位置](pasted-image-20251105130959.png)


### 第五步：关键函数定位

借助 IDA 与 IL2cppDumper 脚本，定位 `QRCodeBuilder` 类找到二维码生成逻辑。

![IDA 载入脚本（1）](pasted-image-20251105132137.png)
![IDA 载入脚本（2）](pasted-image-20251105132204.png)
![IDA 载入脚本（3）](pasted-image-20251105132156.png)

![IDA + 脚本就位](pasted-image-20251105132214.png)

![搜索 QRCodeBuilder 类](pasted-image-20251105134410.png)

![QRCode 构建相关函数视图](pasted-image-20251105140316.png)

### 第六步：动态调试

分析代码发现程序会根据 qrMatrix 动态生成二维码。需要动态调试获取矩阵数据。

![Awake/Construct 调用关系](pasted-image-20251105141018.png)

![qrMatrix 生成推断](pasted-image-20251105141113.png)

### 第七步：绕过反调试

程序有反调试保护，调用了 WinAPI_DetectDebugger。patch 该函数为直接返回，绕过检测。

![附加进程与入口断点](pasted-image-20251105142303.png)

### 第八步：获取矩阵数据

在 Unity 程序中下断点，获取 this 指针，通过偏移量找到 qrMatrix 的地址，提取矩阵数据。

![寄存器与偏移定位](pasted-image-20251105143407.png)




### 第九步：生成二维码

使用提取的矩阵数据，编写脚本生成二维码图片：

![转二维码脚本](pasted-image-20251105152619.png)

```python
# 二维码生成脚本
import qrcode
import numpy as np

# 从调试中提取的矩阵数据 (21x21 二进制矩阵)
matrix = [
    [1,1,1,1,1,1,1,0,0,1,1,0,0,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,1,1,0,0,1,1,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,1,0,1,0,1,1,1,0,0,1],
    [1,0,1,1,1,0,1,0,0,1,0,1,1,1,0,1,1,1,0,0,1],
    [1,0,1,1,1,0,1,0,1,0,0,0,1,1,0,1,1,1,0,0,1],
    [1,0,0,0,0,0,1,0,1,0,1,0,0,1,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0],
    [1,1,1,0,1,0,1,1,0,0,1,0,1,0,0,1,0,1,1,0,1],
    [0,1,0,1,1,1,0,0,1,1,0,0,0,1,1,0,1,0,0,0,0],
    [1,0,1,1,0,0,1,0,0,0,0,1,0,0,1,0,1,1,1,1,1],
    [0,0,0,0,1,0,0,1,1,1,1,0,1,1,0,0,0,0,0,0,0],
    [1,1,1,1,1,1,1,0,1,0,0,1,0,1,0,1,1,1,0,0,1],
    [0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0],
    [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,1,0,1,0,0,1,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,0,1,0,1,1,1,0,1,1,1,0,0,1],
    [1,0,1,1,1,0,1,0,1,0,0,0,1,1,0,1,1,1,0,0,1],
    [1,0,1,1,1,0,1,0,0,1,0,1,1,1,0,1,1,1,0,0,1],
    [1,0,0,0,0,0,1,0,1,1,0,0,1,1,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,0,1,1,0,0,1,1,1,1,1,1,1,1]
]

# 将矩阵转换为字符串
matrix_str = ""
for row in matrix:
    for bit in row:
        matrix_str += str(bit)

# 生成二维码
qr = qrcode.QRCode(version=1, box_size=10, border=5)
qr.add_data(matrix_str)
qr.make(fit=True)
img = qr.make_image(fill='black', back_color='white')
img.save('flag_qr.png')

print("二维码已生成，扫描获取flag")
```

## 总结

### 题目六:CodeRunner（简要回顾）
- 确认为 IL2CPP 后端 → IL2cppDumper 导出元数据。
- 修头 + UPX 脱壳后，配合 IDA 脚本定位 `QRCodeBuilder`。
- 绕过反调试，获取 `this`，按 offset 0x48 取出 `qrMatrix`。
- 脚本生成二维码，得到 flag。

为避免重复展示，回顾部分不再嵌入截图；全部详细截图见上文“解题过程”。
