@echo off
REM Start the local Smoke Monkey Canvas backend server on Windows
setlocal
cd /d "%~dp0\..\.."
if "%PORT%"=="" set PORT=3333

echo Checking if Smoke Monkey Canvas backend is running on port %PORT%...
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:%PORT%/api/space' -UseBasicParsing -TimeoutSec 1; if ($r.StatusCode -eq 200) { exit 0 } } catch { exit 1 }"
if %ERRORLEVEL% EQU 0 (
    echo Canvas backend already running on port %PORT%
    exit /b 0
)

echo Starting Smoke Monkey Canvas backend on port %PORT%...
node .\bin\cli.js --no-open --port %PORT%
