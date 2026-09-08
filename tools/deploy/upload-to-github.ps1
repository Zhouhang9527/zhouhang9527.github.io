# ATRI 语音文件上传到 GitHub 脚本
# 使用前请确保已安装 Git 并配置好 GitHub 认证

param(
    [string]$RepoName = "atri-voice-data",
    [string]$Username = "",  # 填入你的 GitHub 用户名
    [switch]$Init
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ATRI 语音文件 GitHub 上传工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$sourceVoice = "d:\GINKA-Blog\source\voice\atri"
$sourceConfig = "d:\GINKA-Blog\source\voice-config.json"
$tempRepo = "d:\temp-atri-repo"

if ($Username -eq "") {
    $Username = Read-Host "请输入你的 GitHub 用户名"
}

# 创建临时仓库目录
if (Test-Path $tempRepo) {
    Write-Host "[清理] 删除旧的临时目录..." -ForegroundColor Yellow
    Remove-Item $tempRepo -Recurse -Force
}

New-Item -ItemType Directory -Path $tempRepo -Force | Out-Null
Write-Host "[✓] 创建临时目录: $tempRepo" -ForegroundColor Green

# 初始化 Git 仓库
Set-Location $tempRepo
git init
Write-Host "[✓] Git 仓库初始化完成" -ForegroundColor Green

# 创建 README.md
$readmeContent = @"
# ATRI Voice Data / ATRI 语音数据

<div align="center">
  <img src="https://img.shields.io/badge/Files-1555-blue" alt="Files">
  <img src="https://img.shields.io/badge/Format-Opus-green" alt="Format">
  <img src="https://img.shields.io/badge/License-Fair_Use-yellow" alt="License">
</div>

## 📖 介绍 / Introduction

本仓库包含从游戏《ATRI -My Dear Moments-》中提取的 ATRI 角色语音文件，用于 Hexo 博客看板娘功能。

This repository contains ATRI character voice files extracted from the game "ATRI -My Dear Moments-" for use in Hexo blog mascot features.

## 📁 文件结构 / File Structure

\`\`\`
atri-voice-data/
├── voice/              # 语音文件目录 (1555 个 .opus 文件)
├── voice-config.json   # 语音配置文件 (含台词分类)
└── README.md           # 说明文档
\`\`\`

## 🎵 语音分类 / Voice Categories

- **welcome**: 欢迎语 (22 条)
- **click**: 点击反应 (56 条)
- **hover**: 悬停提示 (184 条)
- **talk**: 对话语音 (447 条)
- **special**: 特殊语音 (889 条)

## 📥 使用方法 / Usage

### 方法1：直接下载 / Direct Download

\`\`\`bash
git clone https://github.com/$Username/$RepoName.git
\`\`\`

### 方法2：使用 CDN / Use CDN

通过 jsDelivr 加速访问：

\`\`\`
https://cdn.jsdelivr.net/gh/$Username/$RepoName@main/voice/ATR_b101_001.opus
\`\`\`

### 方法3：整合到 Hexo 博客 / Integrate with Hexo

1. 下载 \`voice-config.json\`
2. 修改配置中的 \`basePath\` 为 CDN 地址：
   \`\`\`json
   {
     "basePath": "https://cdn.jsdelivr.net/gh/$Username/$RepoName@main/voice/"
   }
   \`\`\`
3. 将配置文件放到 \`source/\` 目录
4. 使用提供的 JavaScript 代码加载语音

## ⚖️ 版权声明 / Copyright

所有语音文件版权归原游戏开发商 ANIPLEX.EXE 和 枕 (Makura) 所有。

本仓库仅供个人学习和非商业用途使用。请支持正版游戏。

All voice files are copyrighted by ANIPLEX.EXE and Makura.
This repository is for personal learning and non-commercial use only. Please support the official game.

## 🎮 游戏信息 / Game Info

- **游戏名称**: ATRI -My Dear Moments-
- **开发商**: 枕 (Makura) / ANIPLEX.EXE
- **Steam**: https://store.steampowered.com/app/1230140/ATRI_My_Dear_Moments/

## 📝 更新日志 / Changelog

### 2025-12-22
- 初始发布，包含 1555 个筛选后的语音文件
- 添加配置文件和分类信息
"@

$readmeContent | Out-File -FilePath "README.md" -Encoding UTF8
Write-Host "[✓] README.md 创建完成" -ForegroundColor Green

# 创建 .gitignore
$gitignoreContent = @"
# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Temp
*.tmp
*.log
"@

$gitignoreContent | Out-File -FilePath ".gitignore" -Encoding UTF8

# 创建 voice 目录并复制文件
Write-Host "[复制] 正在复制语音文件..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "voice" -Force | Out-Null

$files = Get-ChildItem -Path $sourceVoice -Filter "*.opus"
$total = $files.Count
$copied = 0

foreach ($file in $files) {
    Copy-Item $file.FullName -Destination "voice\" -Force
    $copied++
    if ($copied % 100 -eq 0) {
        Write-Host "  已复制 $copied/$total..." -ForegroundColor Gray
    }
}

Write-Host "[✓] 复制了 $copied 个语音文件" -ForegroundColor Green

# 复制配置文件
Copy-Item $sourceConfig -Destination "voice-config.json" -Force
Write-Host "[✓] 配置文件复制完成" -ForegroundColor Green

# Git 提交
Write-Host "[Git] 添加文件到暂存区..." -ForegroundColor Yellow
git add .
git commit -m "Initial commit: Add ATRI voice files and configuration"
Write-Host "[✓] Git 提交完成" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📋 下一步操作：" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. 在 GitHub 创建新仓库:" -ForegroundColor White
Write-Host "   仓库名: $RepoName" -ForegroundColor Cyan
Write-Host "   描述: ATRI voice data for Hexo blog mascot" -ForegroundColor Cyan
Write-Host "   设置为公开 (Public)" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. 运行以下命令推送到 GitHub:" -ForegroundColor White
Write-Host "   cd $tempRepo" -ForegroundColor Cyan
Write-Host "   git branch -M main" -ForegroundColor Cyan
Write-Host "   git remote add origin https://github.com/$Username/$RepoName.git" -ForegroundColor Cyan
Write-Host "   git push -u origin main" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. 或者使用 SSH:" -ForegroundColor White
Write-Host "   git remote add origin git@github.com:$Username/$RepoName.git" -ForegroundColor Cyan
Write-Host "   git push -u origin main" -ForegroundColor Cyan
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "临时仓库位置: $tempRepo" -ForegroundColor Green
Write-Host ""
