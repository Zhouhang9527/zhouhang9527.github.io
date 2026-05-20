# 更新语音配置文件，添加日文原文
# 作者：GitHub Copilot
# 日期：2025-12-22

param(
    [string]$MultiLangFile = "e:\30500\下载\亚托莉台词多语言.txt",
    [string]$VoiceConfigPath = "d:\GINKA-Blog\source\voice-config.json",
    [string]$OutputPath = "d:\GINKA-Blog\source\voice-config-updated.json"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ATRI 语音配置多语言更新工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 读取多语言文件
Write-Host "[1/4] 读取多语言台词文件..." -ForegroundColor Yellow
if (-not (Test-Path $MultiLangFile)) {
    Write-Host "❌ 错误: 找不到文件 $MultiLangFile" -ForegroundColor Red
    exit 1
}

$multiLangContent = Get-Content $MultiLangFile -Encoding UTF8 -Raw
Write-Host "✓ 多语言文件读取成功" -ForegroundColor Green

# 解析多语言文件，构建映射表 (文件名 -> 日文原文)
Write-Host "[2/4] 解析语音对应关系..." -ForegroundColor Yellow
$jaTextMap = @{}
$lines = $multiLangContent -split "`r?`n"

foreach ($line in $lines) {
    if ($line.Trim() -eq "") { continue }
    
    # 格式：ATR_b101_001.wav[TAB]繁体中文[TAB]日文原文
    $parts = $line -split "`t"
    
    if ($parts.Length -ge 3) {
        $fileName = $parts[0].Trim()
        # 将 .wav 转换为 .opus
        $fileName = $fileName -replace '\.wav$', '.opus'
        
        $zhText = $parts[1].Trim()
        $jaText = $parts[2].Trim()
        
        # 只保存文件名（去除路径）
        if ($fileName -match '(ATR_[a-z]\d{3}_\d{3}\.opus)') {
            $cleanFileName = $matches[1]
            $jaTextMap[$cleanFileName] = $jaText
        }
    }
}

Write-Host "✓ 解析完成，找到 $($jaTextMap.Count) 条日文对应" -ForegroundColor Green

# 读取现有的 voice-config.json
Write-Host "[3/4] 读取现有语音配置..." -ForegroundColor Yellow
if (-not (Test-Path $VoiceConfigPath)) {
    Write-Host "❌ 错误: 找不到文件 $VoiceConfigPath" -ForegroundColor Red
    exit 1
}

$voiceConfig = Get-Content $VoiceConfigPath -Encoding UTF8 -Raw | ConvertFrom-Json
Write-Host "✓ 语音配置读取成功" -ForegroundColor Green

# 更新每个语音条目，添加日文原文
Write-Host "[4/4] 更新语音条目..." -ForegroundColor Yellow
$updatedCount = 0
$totalCount = 0

foreach ($category in $voiceConfig.categories.PSObject.Properties) {
    $categoryName = $category.Name
    $voices = $category.Value
    
    foreach ($voice in $voices) {
        $totalCount++
        $fileName = $voice.file
        
        if ($jaTextMap.ContainsKey($fileName)) {
            # 添加日文原文
            $voice | Add-Member -MemberType NoteProperty -Name "ja" -Value $jaTextMap[$fileName] -Force
            $updatedCount++
        }
    }
}

Write-Host "✓ 更新完成: $updatedCount / $totalCount 条语音添加了日文原文" -ForegroundColor Green

# 保存更新后的配置
Write-Host ""
Write-Host "保存到: $OutputPath" -ForegroundColor Yellow
$voiceConfig | ConvertTo-Json -Depth 10 | Set-Content $OutputPath -Encoding UTF8
Write-Host "✓ 保存成功！" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📊 统计信息:" -ForegroundColor Cyan
Write-Host "  总语音条目: $totalCount" -ForegroundColor White
Write-Host "  已添加日文: $updatedCount" -ForegroundColor Green
Write-Host "  未匹配条目: $($totalCount - $updatedCount)" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "下一步:" -ForegroundColor Yellow
Write-Host "1. 检查生成的文件: $OutputPath"
Write-Host "2. 如果正确，替换原文件: "
Write-Host "   Copy-Item '$OutputPath' '$VoiceConfigPath' -Force"
Write-Host "3. 重新生成博客并推送到GitHub"
Write-Host ""
