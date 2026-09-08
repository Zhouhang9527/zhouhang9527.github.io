# ATRI 语音集成自动化脚本
# 功能：筛选适合看板娘的台词，转换格式，生成配置文件

$sourceVoice = "e:\30500\下载\Atri Voice"
$sourceTxt = "e:\30500\下载\亚托莉台词完整.txt"
$targetVoice = "d:\GINKA-Blog\source\voice\atri"
$outputConfig = "d:\GINKA-Blog\source\_data\atri-voice-config.json"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ATRI 语音集成工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 创建目标目录
if (!(Test-Path $targetVoice)) {
    New-Item -ItemType Directory -Path $targetVoice -Force | Out-Null
    Write-Host "[✓] 创建目录: $targetVoice" -ForegroundColor Green
}

# 读取台词文件
Write-Host "[1/5] 读取台词文件..." -ForegroundColor Yellow
$content = Get-Content $sourceTxt -Encoding UTF8 -Raw
$lines = $content -split "`r?`n"

# 解析台词
$voiceData = @{}
$currentFile = ""
$currentText = ""

foreach ($line in $lines) {
    if ($line -match '^(ATR_\w+\.(?:wav|opus))\s+(.+)$') {
        if ($currentFile) {
            $voiceData[$currentFile] = $currentText.Trim()
        }
        $currentFile = $matches[1] -replace '\.wav$', '.opus'
        $currentText = $matches[2]
    } elseif ($currentFile -and $line.Trim()) {
        $currentText += " " + $line.Trim()
    }
}
if ($currentFile) {
    $voiceData[$currentFile] = $currentText.Trim()
}

Write-Host "[✓] 解析了 $($voiceData.Count) 条台词" -ForegroundColor Green

# 筛选适合看板娘的台词（排除剧情对话，保留通用语句）
Write-Host "[2/5] 筛选适合看板娘的台词..." -ForegroundColor Yellow

$categories = @{
    welcome = @()    # 欢迎语
    click = @()      # 点击反应
    hover = @()      # 悬停
    talk = @()       # 对话
    special = @()    # 特殊
}

# 关键词筛选规则
$welcomeKeywords = @('欢迎', '回来', '早上好', '晚上好', '好久不见', '你好')
$clickKeywords = @('不要', '讨厌', '干什么', '别', '停', '笨蛋', '真是的')
$hoverKeywords = @('嗯', '？', '怎么了', '什么事')
$talkKeywords = @('嘿嘿', '开心', '高兴', '谢谢', '好的', '是的', '喜欢', '夏生先生')
$excludeKeywords = @('诗菜主人', '水菜萌', '凯瑟琳', '龙司', '乃音子', '地球', '伊甸', '小镇', '死', '永别', '忘记', '悲伤', '主人')

foreach ($file in $voiceData.Keys) {
    $text = $voiceData[$file]
    
    # 跳过包含排除关键词的台词
    $shouldExclude = $false
    foreach ($keyword in $excludeKeywords) {
        if ($text -match $keyword) {
            $shouldExclude = $true
            break
        }
    }
    if ($shouldExclude) { continue }
    
    # 跳过太长的台词（超过30字的可能是剧情对话）
    if ($text.Length -gt 30) { continue }
    
    # 跳过包含句号过多的（多句话的剧情）
    if (($text -split '。').Count -gt 2) { continue }
    
    # 分类
    $matched = $false
    foreach ($keyword in $welcomeKeywords) {
        if ($text -match $keyword) {
            $categories.welcome += @{file=$file; text=$text}
            $matched = $true
            break
        }
    }
    if ($matched) { continue }
    
    foreach ($keyword in $clickKeywords) {
        if ($text -match $keyword) {
            $categories.click += @{file=$file; text=$text}
            $matched = $true
            break
        }
    }
    if ($matched) { continue }
    
    foreach ($keyword in $hoverKeywords) {
        if ($text -match $keyword -and $text.Length -lt 10) {
            $categories.hover += @{file=$file; text=$text}
            $matched = $true
            break
        }
    }
    if ($matched) { continue }
    
    foreach ($keyword in $talkKeywords) {
        if ($text -match $keyword) {
            $categories.talk += @{file=$file; text=$text}
            $matched = $true
            break
        }
    }
    if (!$matched -and $text.Length -le 15) {
        $categories.special += @{file=$file; text=$text}
    }
}

Write-Host "[✓] 筛选结果:" -ForegroundColor Green
Write-Host "    欢迎语: $($categories.welcome.Count) 条" -ForegroundColor Cyan
Write-Host "    点击: $($categories.click.Count) 条" -ForegroundColor Cyan
Write-Host "    悬停: $($categories.hover.Count) 条" -ForegroundColor Cyan
Write-Host "    对话: $($categories.talk.Count) 条" -ForegroundColor Cyan
Write-Host "    特殊: $($categories.special.Count) 条" -ForegroundColor Cyan

# 生成配置文件
Write-Host "[3/5] 生成配置文件..." -ForegroundColor Yellow

$config = @{
    enabled = $true
    basePath = "/voice/atri/"
    volume = 0.7
    categories = @{}
}

foreach ($cat in $categories.Keys) {
    $config.categories[$cat] = @($categories[$cat] | ForEach-Object {
        @{
            file = $_.file
            text = $_.text
        }
    })
}

$config | ConvertTo-Json -Depth 10 | Out-File $outputConfig -Encoding UTF8
Write-Host "[✓] 配置文件已生成: $outputConfig" -ForegroundColor Green

# 列出需要的语音文件
Write-Host "[4/5] 准备复制语音文件..." -ForegroundColor Yellow
$neededFiles = @()
foreach ($cat in $categories.Keys) {
    foreach ($item in $categories[$cat]) {
        $neededFiles += $item.file
    }
}

Write-Host "[提示] 找到 $($neededFiles.Count) 个语音文件需要复制" -ForegroundColor Yellow
Write-Host ""
Write-Host "是否立即复制语音文件？(Y/N)" -ForegroundColor Yellow
$choice = Read-Host

if ($choice -eq 'Y' -or $choice -eq 'y') {
    $copied = 0
    $notFound = 0
    
    foreach ($file in $neededFiles) {
        $sourcePath = Join-Path $sourceVoice $file
        $targetPath = Join-Path $targetVoice $file
        
        if (Test-Path $sourcePath) {
            Copy-Item $sourcePath $targetPath -Force
            $copied++
            if ($copied % 10 -eq 0) {
                Write-Host "  已复制 $copied/$($neededFiles.Count)..." -ForegroundColor Gray
            }
        } else {
            $notFound++
        }
    }
    
    Write-Host "[✓] 复制完成: $copied 个文件" -ForegroundColor Green
    if ($notFound -gt 0) {
        Write-Host "[!] 未找到: $notFound 个文件" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "[5/5] 完成！" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "下一步:" -ForegroundColor Yellow
Write-Host "1. 配置文件已生成在: $outputConfig" -ForegroundColor White
Write-Host "2. 语音文件在: $targetVoice" -ForegroundColor White
Write-Host "3. 运行 'hexo generate' 重新生成博客" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
