# Windows PowerShell build script for Smoke Monkey Canvas Desktop
$ErrorActionPreference = "Stop"

Write-Host "==> Building web frontend..."
npm --prefix ../web run build

Write-Host "==> Building Windows desktop installer with Tauri..."
npx tauri build --bundles nsis,msi

Write-Host "==> Windows build complete! Check src-tauri/target/release/bundle/nsis"
