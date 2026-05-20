@echo off
chcp 65001 >nul
title Hexo 博客服务器
color 0A

echo.
echo ════════════════════════════════════════
echo   🚀 Hexo 博客服务器启动器
echo ════════════════════════════════════════
echo.

cd /d d:\GINKA-Blog

echo 📦 正在启动服务器...
echo.
echo ════════════════════════════════════════
echo   访问地址: http://localhost:4000
echo   按 Ctrl+C 停止服务器
echo ════════════════════════════════════════
echo.

hexo server

if %errorlevel% neq 0 (
    echo.
    echo ❌ 启动失败！
    echo.
    pause
)
