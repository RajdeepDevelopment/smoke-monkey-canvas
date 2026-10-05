#!/usr/bin/env bash
# Linux Build Script for Smoke Monkey Canvas Desktop
# Compiles web frontend, builds release binary with Tauri, and outputs AppImage / DEB
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT_DIR="$(cd "$DESKTOP_DIR/.." && pwd)"

echo "==> Building web frontend..."
npm --prefix "$ROOT_DIR/web" run build

echo "==> Building Linux packages with Tauri..."
cd "$DESKTOP_DIR"
npx tauri build --bundles appimage,deb

echo "==> Linux build complete! Packages are in src-tauri/target/release/bundle/"
