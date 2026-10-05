#!/usr/bin/env bash
# ==============================================================================
# 🐒 Smoke Monkey Canvas — Universal Fresh Install Script
# ==============================================================================
# Automatically detects your operating system and routes to:
# - macOS:   ./install-mac.sh
# - Linux:   ./install-linux.sh
# - Windows: .\install-windows.ps1
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

OS="$(uname -s 2>/dev/null || echo "Unknown")"

case "$OS" in
  Darwin*)
    echo "Detected macOS. Launching macOS installer..."
    bash "$SCRIPT_DIR/install-mac.sh" "$@"
    ;;
  Linux*)
    echo "Detected Linux. Launching Linux installer..."
    bash "$SCRIPT_DIR/install-linux.sh" "$@"
    ;;
  CYGWIN*|MINGW*|MSYS*)
    echo "Detected Windows environment (Bash). Launching PowerShell installer..."
    powershell.exe -ExecutionPolicy Bypass -File "$SCRIPT_DIR/install-windows.ps1"
    ;;
  *)
    echo "Unknown operating system ($OS)."
    echo "Please run the platform-specific installer directly:"
    echo "  - macOS:   bash install-mac.sh"
    echo "  - Linux:   bash install-linux.sh"
    echo "  - Windows: powershell -ExecutionPolicy Bypass -File .\\install-windows.ps1"
    exit 1
    ;;
esac
