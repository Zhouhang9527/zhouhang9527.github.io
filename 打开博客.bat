@echo off
chcp 65001 >nul
echo.
echo ========================================
echo  🌐 正在打开博客...
echo ========================================
echo.
echo 📍 地址: http://localhost:4000
echo.

timeout /t 2 /nobreak >nul

echo 🔍 检查服务器状态...
curl -s http://localhost:4000 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ 服务器正在运行
    echo.
    echo 🚀 正在打开浏览器...
    start http://localhost:4000
    echo.
    echo ========================================
    echo 📋 测试清单:
    echo ========================================
    echo.
    echo [ ] 1. ATRI 角色出现在右下角
    echo [ ] 2. 控制按钮是浅蓝色
    echo [ ] 3. 点击对话按钮播放语音
    echo [ ] 4. 显示双语字幕:
    echo       上方: 繁体中文 (蓝色)
    echo       下方: 日文原文 (灰色)
    echo.
    echo ========================================
    echo 💡 按 F12 打开开发者工具查看详情
    echo ========================================
) else (
    echo ❌ 服务器未运行！
    echo.
    echo 请先运行以下命令启动服务器:
    echo   cd d:\GINKA-Blog
    echo   hexo server
    echo.
    echo 或者双击运行: 启动服务器.bat
)
echo.
pause
