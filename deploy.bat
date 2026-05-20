@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:MENU
cls
echo ╔════════════════════════════════════════╗
echo ║     Hexo 博客管理工具 v2.0             ║
echo ╚════════════════════════════════════════╝
echo.
echo  请选择操作：
echo.
echo  [1] 本地测试 (清理 + 生成 + 启动)
echo  [2] 仅生成 (不清理，快速生成)
echo  [3] 清理缓存
echo  [4] 部署到 GitHub Pages
echo  [5] 完整流程 (清理 + 生成 + 部署)
echo  [6] 仅启动本地服务器
echo  [0] 退出
echo.
echo ════════════════════════════════════════
set /p choice="请输入选项 [0-6]: "

if "%choice%"=="1" goto LOCAL_TEST
if "%choice%"=="2" goto QUICK_GEN
if "%choice%"=="3" goto CLEAN_ONLY
if "%choice%"=="4" goto DEPLOY_ONLY
if "%choice%"=="5" goto FULL_DEPLOY
if "%choice%"=="6" goto SERVER_ONLY
if "%choice%"=="0" goto END
echo.
echo 无效选项，请重新选择！
timeout /t 2 >nul
goto MENU

:LOCAL_TEST
echo.
echo ════════════════════════════════════════
echo  本地测试模式
echo ════════════════════════════════════════
echo.
echo [1/3] 强制清理 public 目录...
rd /s /q public 2>nul
if exist db.json del /f /q db.json 2>nul
echo ✓ 清理完成！
echo.
echo [2/3] 生成静态文件...
call hexo generate
if errorlevel 1 (
    echo ✗ 生成失败！
    pause
    goto MENU
)
echo ✓ 生成完成！
echo.
echo [3/3] 启动本地服务器...
echo.
echo ┌────────────────────────────────────────┐
echo │  服务器地址: http://localhost:4000     │
echo │  按 Ctrl+C 停止服务器                  │
echo └────────────────────────────────────────┘
echo.
call hexo server
goto MENU

:QUICK_GEN
echo.
echo ════════════════════════════════════════
echo  快速生成模式
echo ════════════════════════════════════════
echo.
echo [1/2] 生成静态文件...
call hexo generate
if errorlevel 1 (
    echo ✗ 生成失败！
    pause
    goto MENU
)
echo ✓ 生成完成！
echo.
echo [2/2] 启动本地服务器...
echo.
echo ┌────────────────────────────────────────┐
echo │  服务器地址: http://localhost:4000     │
echo │  按 Ctrl+C 停止服务器                  │
echo └────────────────────────────────────────┘
echo.
call hexo server
goto MENU

:CLEAN_ONLY
echo.
echo ════════════════════════════════════════
echo  清理缓存模式
echo ════════════════════════════════════════
echo.
echo 正在清理...
rd /s /q public 2>nul
rd /s /q .deploy_git 2>nul
if exist db.json del /f /q db.json 2>nul
echo ✓ 清理完成！
echo.
pause
goto MENU

:DEPLOY_ONLY
echo.
echo ════════════════════════════════════════
echo  部署模式
echo ════════════════════════════════════════
echo.
echo 正在部署到 GitHub Pages...
call hexo deploy
if errorlevel 1 (
    echo ✗ 部署失败！
    pause
    goto MENU
)
echo.
echo ✓ 部署完成！
echo.
pause
goto MENU

:FULL_DEPLOY
echo.
echo ════════════════════════════════════════
echo  完整部署流程
echo ════════════════════════════════════════
echo.
echo [1/3] 强制清理...
rd /s /q public 2>nul
if exist db.json del /f /q db.json 2>nul
echo ✓ 清理完成！
echo.
echo [2/3] 生成静态文件...
call hexo generate
if errorlevel 1 (
    echo ✗ 生成失败！
    pause
    goto MENU
)
echo ✓ 生成完成！
echo.
echo [3/3] 部署到 GitHub Pages...
call hexo deploy
if errorlevel 1 (
    echo ✗ 部署失败！
    pause
    goto MENU
)
echo.
echo ✓ 完整部署流程完成！
echo.
pause
goto MENU

:SERVER_ONLY
echo.
echo ════════════════════════════════════════
echo  启动服务器
echo ════════════════════════════════════════
echo.
if not exist "public\index.html" (
    echo ⚠ 警告: public 目录不存在或为空
    echo 建议先执行选项 [1] 或 [2] 生成文件
    echo.
    set /p continue="是否继续启动? (y/n): "
    if /i not "!continue!"=="y" goto MENU
)
echo.
echo ┌────────────────────────────────────────┐
echo │  服务器地址: http://localhost:4000     │
echo │  按 Ctrl+C 停止服务器                  │
echo └────────────────────────────────────────┘
echo.
call hexo server
goto MENU

:END
echo.
echo 感谢使用 Hexo 博客管理工具！
timeout /t 2 >nul
exit
