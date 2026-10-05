@echo off
REM Windows packaging helper for Smoke Monkey Canvas Desktop
echo Building Smoke Monkey Canvas Desktop for Windows...
cd /d "%~dp0\.."
call npm run build:web
call npx tauri build --bundles nsis,msi
if %ERRORLEVEL% EQU 0 (
    echo Windows build completed successfully! Check src-tauri\target\release\bundle\nsis
) else (
    echo Windows build encountered an error.
    exit /b %ERRORLEVEL%
)
