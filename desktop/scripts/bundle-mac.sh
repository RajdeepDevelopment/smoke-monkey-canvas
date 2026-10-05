#!/usr/bin/env bash
# Assemble a macOS .app bundle from the release binary + icons.
# Works with Xcode Command Line Tools without requiring full Xcode.
# Usage: bash scripts/bundle-mac.sh (run from desktop directory)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BIN="$DESKTOP_DIR/src-tauri/target/release/smoke-monkey-canvas-desktop"
ICNS="$DESKTOP_DIR/src-tauri/icons/icon.icns"
APP_NAME="Smoke Monkey Canvas.app"
DEST="$DESKTOP_DIR/src-tauri/target/release/$APP_NAME"

echo "Compiling release binary with cargo..."
cargo build --release --manifest-path "$DESKTOP_DIR/src-tauri/Cargo.toml"

if [ ! -f "$ICNS" ]; then
  echo "icon.icns missing at $ICNS" >&2
  exit 1
fi

rm -rf "$DEST"
mkdir -p "$DEST/Contents/MacOS" "$DEST/Contents/Resources"

cp "$BIN" "$DEST/Contents/MacOS/smoke-monkey-canvas-desktop"
cp "$ICNS" "$DEST/Contents/Resources/icon.icns"

cat > "$DEST/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>en</string>
  <key>CFBundleExecutable</key>
  <string>smoke-monkey-canvas-desktop</string>
  <key>CFBundleIconFile</key>
  <string>icon</string>
  <key>CFBundleIdentifier</key>
  <string>com.smokemonkey.canvas</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>Smoke Monkey Canvas</string>
  <key>CFBundleDisplayName</key>
  <string>Smoke Monkey Canvas</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.3.2</string>
  <key>CFBundleVersion</key>
  <string>1.3.2</string>
  <key>LSApplicationCategoryType</key>
  <string>public.app-category.developer-tools</string>
  <key>LSMinimumSystemVersion</key>
  <string>10.15</string>
  <key>NSHighResolutionCapable</key>
  <true/>
  <key>NSPrincipalClass</key>
  <string>NSApplication</string>
  <key>NSMicrophoneUsageDescription</key>
  <string>Smoke Monkey Canvas requires microphone access to enable voice commands, speech-to-text, and conversational interaction with autonomous agents.</string>
  <key>NSCameraUsageDescription</key>
  <string>Smoke Monkey Canvas requires camera access for multi-modal visual inspection.</string>
  <key>NSDocumentsFolderUsageDescription</key>
  <string>Smoke Monkey Canvas requires access to documents to save and load agent workspaces.</string>
  <key>NSDownloadsFolderUsageDescription</key>
  <string>Smoke Monkey Canvas requires access to downloads to export workspace files.</string>
  <key>NSDesktopFolderUsageDescription</key>
  <string>Smoke Monkey Canvas requires access to desktop folders for agent project interactions.</string>
</dict>
</plist>
PLIST

ENTITLEMENTS="$DESKTOP_DIR/mac/Entitlements.plist"
if [ -f "$ENTITLEMENTS" ]; then
  codesign --force --deep --sign - --entitlements "$ENTITLEMENTS" "$DEST" 2>/dev/null || codesign --force --deep --sign - "$DEST" 2>/dev/null || true
else
  codesign --force --deep --sign - "$DEST" 2>/dev/null || true
fi

echo "Successfully assembled: $DEST"
