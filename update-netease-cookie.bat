@echo off
setlocal
if /I "%~1"=="--check" (
  echo BAT launcher OK.
  exit /b 0
)
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\update-netease-cookie.ps1"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
  echo Update failed. Check the error message above.
) else (
  echo Update completed.
)
pause
exit /b %EXIT_CODE%
