---
title: "[NSSCTF 2025 秋招赛] 花指令"
date: 2025-10-19 20:00:00
categories: reverse
tags:
  - CTF
  - Reverse
  - 花指令
  - IDA Pro
  - 异或解密
description: "NSSCTF 2025 秋招赛入门题目《花指令》的详细解题步骤，覆盖花指令清理、逻辑还原与脚本复现。"
---

## 题目信息

**题目名称**：NSSCTF 2025 秋招赛 · 花指令

**题目类型**：Reverse Engineering

**难度评估**：入门

## 解题过程

### 第一步：基础分析

先用 DIE 看一下，样本是 32 位 PE，可确认未加壳，直接用 IDA 静态分析足够。

### 第二步：主流程梳理

在 IDA 中按 `F5` 查看伪代码，可以看到 `main` 读取输入后把它平均切成三段，再分别传入 `flower_1`、`flower_2`、`flower_3` 做校验：

```c
int __cdecl main(void) {
	char input[100];
	scanf("%99s", input);
	size_t len = strlen(input);
	size_t len1 = len / 3;
	size_t len2 = len / 3;
	size_t len3 = len - len1 - len2;
	strncpy(part1, input, len1);
	strncpy(part2, input + len1, len2);
	strncpy(part3, input + len1 + len2, len3);
	if (flower_1(part1) && flower_2(part2) && flower_3(part3))
		puts("Congratulations!");
	else
		puts("GG");
	return 0;
}
```

### 第三步：清除花指令

进入 `flower_x` 系列函数可以发现大量成对出现的 `jz` / `jnz`、`xor eax, eax` + `jz` 等典型花指令。方法很固定：

- 在反汇编窗口按 `U` 取消伪代码还原；
- 把干扰跳转改成 `NOP` 或直接改为 `jmp`；
- 重新按 `C` 识别指令，流程就顺回来了。

处理完花指令之后，三个函数的核心逻辑变得很清晰：都在使用同一个密钥对输入做异或校验。

```c
int __cdecl flower_2(char *a) {
	const char key[] = "Ciallo";
	const unsigned char answer2[] = {0x26,0x44,0x07,0x5e,0x5c,0x5f,0x6e,0x5d,0x02,0x5d,0x55,0x42,0x22,0x50};
	for (size_t i = 0; i < strlen(a); ++i)
		if ((key[i % 6] ^ a[i]) != answer2[i])
			return 0;
	return 1;
}
```

`flower_1` 与 `flower_3` 的写法完全相同，只是常量数组不同。

### 第四步：脚本复现

把三个数组和密钥抄出来，写个脚本按位异或即可还原 flag：

```python
answer1 = [0x0d, 0x3a, 0x32, 0x2f, 0x38, 0x29, 0x38, 0x5d, 0x56, 0x58, 0x5e, 0x09, 0x21, 0x0d]
answer2 = [0x26, 0x44, 0x07, 0x5e, 0x5c, 0x5f, 0x6e, 0x5d, 0x02, 0x5d, 0x55, 0x42, 0x22, 0x50]
answer3 = [0x27, 0x5c, 0x4c, 0x54, 0x08, 0x56, 0x72, 0x5f, 0x50, 0x5f, 0x5c, 0x0b, 0x76, 0x08, 0x53, 0x11]
key = [0x43, 0x69, 0x61, 0x6c, 0x6c, 0x6f]

flag_bytes = []
for idx, val in enumerate(answer1 + answer2 + answer3):
	flag_bytes.append(val ^ key[idx % len(key)])

print(''.join(chr(b) for b in flag_bytes))
```

### 第五步：验证结果

脚本输出的结果为 `NSSCTF{4742fbde-f200-4c19-a9d5-8d916130d5a2}`，与题目给出的 flag 完全一致。

## 总结

- 识别并清理 `jz` / `jnz`、`xor reg, reg` + `jz` 这类花指令是关键；
- 去除干扰后三个函数实质上是相同的异或校验；
- 通过脚本复现校验过程可以快速确认 flag，后续遇到类似题型也可以参照此流程。
