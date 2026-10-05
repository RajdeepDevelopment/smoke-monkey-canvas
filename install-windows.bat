@echo off
setlocal
echo ============================================================
echo   Smoke Monkey Canvas - Windows Installer Launcher
echo ============================================================
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-windows.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Installation encountered an error.
    pause
    exit /b %ERRORLEVEL%
)
pause
