#!/usr/bin/env bash
# macOS Build Script for Smoke Monkey Canvas Desktop
# Compiles web frontend, builds release binary with Tauri, and outputs .app / .dmg
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT_DIR="$(cd "$DESKTOP_DIR/.." && pwd)"

echo "==> Building web frontend..."
npm --prefix "$ROOT_DIR/web" run build

echo "==> Building macOS release with Tauri..."
cd "$DESKTOP_DIR"
npx tauri build --bundles app,dmg || {
  echo "Standard bundling completed or falling back to custom bundle-mac.sh..."
  bash "$DESKTOP_DIR/scripts/bundle-mac.sh"
}

echo "==> macOS build complete!"
