# Hexo 快速清理脚本
# 仅执行清理和生成,不启动服务器

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Hexo 快速清理和生成脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "package.json")) {
    Write-Host "错误: 未找到 package.json 文件!" -ForegroundColor Red
    Read-Host "按回车键退出"
    exit 1
}

Write-Host "[1/2] 清理缓存和旧文件..." -ForegroundColor Yellow
hexo clean
Write-Host "完成!" -ForegroundColor Green

Write-Host ""
Write-Host "[2/2] 生成静态文件..." -ForegroundColor Yellow
hexo generate
Write-Host "完成!" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
if (Test-Path "public") {
    $fileCount = (Get-ChildItem -Path "public" -Recurse -File).Count
    Write-Host "构建成功! 共生成 $fileCount 个文件" -ForegroundColor Green
    Write-Host ""
    Write-Host "提示: 运行 deploy.ps1 启动本地服务器" -ForegroundColor Cyan
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "按回车键退出"