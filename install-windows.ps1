# ==============================================================================
# 🐒 Smoke Monkey Canvas — Windows Fresh Install Script (PowerShell)
# ==============================================================================
# Performs a complete fresh install of Smoke Monkey Canvas on Windows:
# - Validates system prerequisites (Node.js >= 18, npm, Rust/Cargo)
# - Installs all root, web, and desktop workspace dependencies
# - Compiles the web application bundle
# - Builds the native Windows desktop application (.exe installer)
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  🐒 Smoke Monkey Canvas — Windows Installer               " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Node.js
Write-Host "==> Checking Node.js..." -ForegroundColor Cyan
try {
    $nodeVersion = node -v
    Write-Host "  Found Node.js $nodeVersion" -ForegroundColor Green
    $nodeMajor = [int]($nodeVersion -replace 'v','' -split '\.')[0]
    if ($nodeMajor -lt 18) {
        Write-Error "Node.js v18 or newer is required (found $nodeVersion). Download from https://nodejs.org"
    }
} catch {
    Write-Error "Node.js is not installed or not in PATH. Download from https://nodejs.org"
}

# 2. Check npm
Write-Host "==> Checking npm..." -ForegroundColor Cyan
try {
    $npmVersion = npm -v
    Write-Host "  Found npm v$npmVersion" -ForegroundColor Green
} catch {
    Write-Error "npm is not installed or not in PATH."
}

# 3. Check Rust / Cargo
$hasRust = $false
try {
    $cargoVersion = cargo --version
    Write-Host "  Found Rust $cargoVersion" -ForegroundColor Green
    $hasRust = $true
} catch {
    Write-Host "==> WARNING: Rust/Cargo not found. Native desktop build will be skipped." -ForegroundColor Yellow
    Write-Host "  (To build the desktop .exe, install Rust from https://rustup.rs/)"
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# 4. Install Dependencies
Write-Host "==> Installing root dependencies..." -ForegroundColor Cyan
npm install

Write-Host "==> Installing web dependencies..." -ForegroundColor Cyan
npm --prefix web install

if (Test-Path "desktop") {
    Write-Host "==> Installing desktop dependencies..." -ForegroundColor Cyan
    npm --prefix desktop install
}

# 5. Build Web Frontend
Write-Host "==> Building web frontend with Vite..." -ForegroundColor Cyan
npm --prefix web run build

# 6. Build Desktop Application (if Cargo is present)
if ($hasRust -and (Test-Path "desktop\src-tauri")) {
    Write-Host "==> Building Windows desktop application with Cargo..." -ForegroundColor Cyan
    cargo build --release --manifest-path desktop\src-tauri\Cargo.toml
    Write-Host "  Desktop application binary built at desktop\src-tauri\target\release\smoke-monkey-canvas-desktop.exe" -ForegroundColor Green
}

# 7. Finished
Write-Host ""
Write-Host "==> Smoke Monkey Canvas installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To start the Canvas workspace:" -ForegroundColor Cyan
if (Test-Path "desktop\src-tauri\target\release\smoke-monkey-canvas-desktop.exe") {
    Write-Host "  Desktop Application:" -ForegroundColor White
    Write-Host "    .\desktop\src-tauri\target\release\smoke-monkey-canvas-desktop.exe" -ForegroundColor Gray
    Write-Host ""
}
Write-Host "  Web / CLI Daemon:" -ForegroundColor White
Write-Host "    npm start                 # Start background canvas server" -ForegroundColor Gray
Write-Host "    npm run dev:web           # Run the web frontend in development mode" -ForegroundColor Gray
Write-Host ""
