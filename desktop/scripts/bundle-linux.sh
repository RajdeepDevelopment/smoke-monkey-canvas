#!/usr/bin/env bash
# Linux packaging helper for Smoke Monkey Canvas Desktop
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Building Smoke Monkey Canvas Desktop for Linux..."
cd "$DESKTOP_DIR"
npm run build:web
npx tauri build --bundles appimage,deb

echo "Linux packages generated in src-tauri/target/release/bundle/"
