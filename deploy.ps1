# Hexo 一键清理和本地部署脚本
# 确保 PowerShell 使用 UTF-8 编码以正确显示中文

# 设置控制台输出编码为 UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Hexo 一键清理和本地部署脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "package.json")) {
    Write-Host "错误: 未找到 package.json 文件!" -ForegroundColor Red
    Write-Host "请确保在 Hexo 博客根目录下运行此脚本。" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "[1/4] 清理缓存和旧文件..." -ForegroundColor Yellow
try {
    hexo clean
    if ($LASTEXITCODE -eq 0) {
        Write-Host "完成!" -ForegroundColor Green
    }
} catch {
    Write-Host "清理失败: $_" -ForegroundColor Red
    pause
    exit 1
}

Write-Host ""
Write-Host "[2/4] 生成静态文件..." -ForegroundColor Yellow
try {
    hexo generate
    if ($LASTEXITCODE -eq 0) {
        Write-Host "完成!" -ForegroundColor Green
    }
} catch {
    Write-Host "生成失败: $_" -ForegroundColor Red
    pause
    exit 1
}

Write-Host ""
Write-Host "[3/4] 检查生成的文件..." -ForegroundColor Yellow
if (Test-Path "public") {
    $fileCount = (Get-ChildItem -Path "public" -Recurse -File).Count
    Write-Host "共生成 $fileCount 个文件" -ForegroundColor Green
}

Write-Host ""
Write-Host "[4/4] 启动本地服务器..." -ForegroundColor Yellow
Write-Host "服务器将在 http://localhost:4000 启动" -ForegroundColor Cyan
Write-Host "按 Ctrl+C 停止服务器" -ForegroundColor Cyan
Write-Host ""

hexo server