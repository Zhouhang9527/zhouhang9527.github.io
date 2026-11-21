---
title: '[HUBUCTF 2022 新生赛] simple_RE 题解'
date: 2025-10-10 18:00:00
categories: reverse
tags:
  - CTF
  - Reverse
  - Base64
  - IDA Pro
description: HUBUCTF 2022 新生赛 reverse 题目 simple_RE 的详细解题过程，自定义 Base64 编码逆向分析。
---

## 题目信息

**题目名称**: [HUBUCTF 2022 新生赛] simple_RE
**类型**: Reverse Engineering
**难度**: 简单

## 解题过程

### 第一步：文件分析

拖入 die 进行查壳分析，发现程序是 64 位、小端序、无壳的可执行文件。

### 第二步：逆向分析

用 IDA 打开，F5 查看伪代码。主函数如下：

```c
int __fastcall main(int argc, const char **argv, const char **envp)
{
  int p_Size; // [rsp+24h] [rbp-44h] BYREF
  void *Buf1; // [rsp+28h] [rbp-40h] BYREF
  char v6[56]; // [rsp+30h] [rbp-38h] BYREF

  sub_401770(argc: argc, argv: argv, envp: envp);
  printf(Format: "please input the flag:");
  scanf(Format: "%s", v6);
  Buf1 = 0;
  sub_401570(a1: v6, p_Buf1: &Buf1, p_Size: &p_Size);
  if ( !memcmp(
          Buf1: Buf1,
          Buf2: a5mc58bphliax7j,                      // "5Mc58bPHLiAx7J8ocJIlaVUxaJvMcoYMaoPMaOfg15c475tscHfM/8=="
          Size: p_Size) )
    printf(Format: "\nsuccess!");
  else
    printf(Format: "\nfailed!");
  if ( Buf1 )
    free(Buf1: Buf1);
  return 0;
}
```

程序逻辑很简单：输入 flag，调用处理函数，然后比较结果。

### 第三步：深入分析编码函数

双击进入 `sub_401570` 函数内部（已有部分注释）：

```c
__int64 __fastcall sub_401570(const char *a1, void **p_Buf1, int *p_Size)
{
  int lenth; // r15d
  int n2; // r12d
  int _______; // r13d
  __int64 ________1; // r14
  _BYTE *v10; // rax
  _BYTE *v11; // r9
  __int64 three_i; // r8
  char v13; // cl
  char v14; // r11
  char v15; // r10

  lenth = strlen(Str: a1);
  n2 = lenth % 3;
  if ( lenth % 3 )
  {
    _______ = 4 * (lenth / 3) + 4;
    ________1 = _______;
    v10 = malloc(Size: _______ + 1LL);
    v10[_______] = 0;
    if ( lenth <= 0 )
      goto LABEL_5;
  }
  else
  {
    _______ = 4 * (lenth / 3);
    ________1 = _______;
    v10 = malloc(Size: _______ + 1LL);
    v10[_______] = 0;
    if ( lenth <= 0 )
      goto LABEL_8;
  }
  v11 = v10;
  three_i = 0;
  do
  {
    v11 += 4;
    v13 = a1[three_i];
    *(v11 - 4) = aQvejafhmuyjbac[v13 >> 2];     // 00AAAAAA
    v14 = a1[three_i + 1];
    *(v11 - 3) = aQvejafhmuyjbac[(v14 >> 4) | (16 * v13) & 48]; // 0000BBBB + 00AA0000 = 00AABBBB
    v15 = a1[three_i + 2];
    three_i += 3;
    *(v11 - 2) = aQvejafhmuyjbac[(v15 >> 6) | (4 * v14) & 60];  // 000000CC + 00BBBB00 = 00BBBBCC
    *(v11 - 1) = aQvejafhmuyjbac[v15 & 0x3F];   // 00CCCCCC
  }
  while ( lenth > (int)three_i );

LABEL_5:
  if ( n2 == 1 )
  {
    v10[________1 - 2] = 61;
    v10[________1 - 1] = 61;
  }
  else if ( n2 == 2 )
  {
    v10[________1 - 1] = 61;
  }

LABEL_8:
  *p_Buf1 = v10;
  *p_Size = _______;
  return 0;
}
```

### 第四步：识别编码模式

通过分析可以看出，这是一个使用自定义字符集的 Base64 编码实现。虽然可以使用在线解码工具快速得到结果，但为了更好地理解编码过程，我们来手动编写解码脚本。

首先，在 main 函数中找到硬编码的密文：`5Mc58bPHLiAx7J8ocJIlaVUxaJvMcoYMaoPMaOfg15c475tscHfM/8==`

然后在 `sub_401570` 函数中找到 Base64 字符映射表：`qvEJAfHmUYjBac+u8Ph5n9Od17FrICL/X0gVtM4Qk6T2z3wNSsyoebilxWKGZpRD`

理解编码逻辑后，手动实现对应的解码脚本：

```python
enc=('5Mc58bPHLiAx7J8ocJIlaVUxaJvMcoYMaoPMaOfg15c475tscHfM/8==')
enc_=[]
for a in enc:
    enc_.append(ord(a))
key = [0x71, 0x76, 0x45, 0x4a, 0x41, 0x66, 0x48, 0x6d, 0x55, 0x59, 0x6a, 0x42, 0x61, 0x63, 0x2b, 0x75, 0x38, 0x50, 0x68, 0x35, 0x6e, 0x39, 0x4f, 0x64, 0x31, 0x37, 0x46, 0x72, 0x49, 0x43, 0x4c, 0x2f, 0x58, 0x30, 0x67, 0x56, 0x74, 0x4d, 0x34, 0x51, 0x6b, 0x36, 0x54, 0x32, 0x7a, 0x33, 0x77, 0x4e, 0x53, 0x73, 0x79, 0x6f, 0x65, 0x62, 0x69, 0x6c, 0x78, 0x57, 0x4b, 0x47, 0x5a, 0x70, 0x52, 0x44, 0x0]
i=0
while i<len(enc_):
    i+=4
    v1=key.index(enc_[i-4])
    v2=key.index(enc_[i-3])
    v13=(v2&0b00110000)>>4|(v1&0b00111111)<<2
    if enc_[i-2]==ord('='):
        print(chr(v13),end='')
        break
    v3=key.index(enc_[i-2])
    v14=(v3&0b00111100)>>2|(v2&0b00001111)<<4
    if enc_[i-1]==('='):
        print(chr(v14),end='')
        break
    v4=key.index(enc_[i-1])
    v15=v4|(v3&0b000011)<<6
    [print(chr(i),end='') for i in (v13,v14,v15)]
```
### 第五步：解码验证
运行脚本，成功得到 flag：NSSCTF{a8d4347722800e72e34e1aba3fe914ae}

解题总结
这是一道经典的逆向工程题目，主要考察以下能力点：

静态分析能力：熟练使用 IDA Pro 进行反汇编和伪代码分析
自定义编码识别：准确识别出 Base64 的变体实现
编码逆向工程：深入理解编码逻辑并实现解码算法
通过仔细分析程序的编码表和处理逻辑，手动构建了对应的解码器，最终成功破解了 flag。

本文记录了个人解题思路和学习过程，旨在交流技术心得。如有错误欢迎指正！