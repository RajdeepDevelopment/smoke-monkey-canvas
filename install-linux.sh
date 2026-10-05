#!/usr/bin/env bash
# ==============================================================================
# 🐒 Smoke Monkey Canvas — Linux Fresh Install Script
# ==============================================================================
# Performs a complete fresh install of Smoke Monkey Canvas on Linux:
# - Validates system prerequisites (Node.js >= 18, npm, Rust/Cargo, WebKitGTK)
# - Installs all root, web, and desktop workspace dependencies
# - Compiles the web application bundle
# - Builds the native Linux desktop application (.AppImage / .deb bundle)
# ==============================================================================

set -euo pipefail

# Text formatting
BOLD="\033[1m"
GREEN="\033[0;32m"
CYAN="\033[0;36m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
RESET="\033[0m"

log_info() { echo -e "${CYAN}==>${RESET} ${BOLD}$1${RESET}"; }
log_success() { echo -e "${GREEN}==>${RESET} ${BOLD}$1${RESET}"; }
log_warn() { echo -e "${YELLOW}==> WARNING:${RESET} $1"; }
log_error() { echo -e "${RED}==> ERROR:${RESET} $1" >&2; }

echo -e "${BOLD}"
echo "  __  __             _             ___                      "
echo " / _||  \ _  _ _  _ | |_____ _  _ / __|__ _ _ ___ _____ ___ "
echo " \__ \| |) | ' \ || | / / -_) || | (__/ _\` | ' \ V / _\` (_-< "
echo " |___/|___/|_||_\_,_|_\_\___|\_, |\___\__,_|_||_\_/\__,_/__/ "
echo "                             |__/                           "
echo -e "${RESET}"
echo -e "${BOLD}🐒 Smoke Monkey Canvas — Linux Installer${RESET}\n"

# 1. Check Operating System
OS="$(uname -s)"
if [ "$OS" != "Linux" ]; then
  log_error "This script is designed for Linux. Detected: $OS"
  echo "For macOS, run: ./install-mac.sh"
  echo "For Windows, run: powershell -ExecutionPolicy Bypass -File .\\install-windows.ps1"
  exit 1
fi

# 2. Check Node.js
log_info "Checking Node.js..."
if ! command -v node >/dev/null 2>&1; then
  log_error "Node.js is not installed. Please install Node.js >= 18 (https://nodejs.org)."
  exit 1
fi

NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
  log_error "Node.js v18 or newer is required (found $(node -v))."
  exit 1
fi
echo -e "  Found Node.js $(node -v)"

# 3. Check npm
log_info "Checking npm..."
if ! command -v npm >/dev/null 2>&1; then
  log_error "npm is not installed."
  exit 1
fi
echo -e "  Found npm v$(npm -v)"

# 4. Check Rust / Cargo
HAS_RUST=false
if command -v cargo >/dev/null 2>&1; then
  HAS_RUST=true
  echo -e "  Found Rust cargo $(cargo --version | cut -d' ' -f2)"
else
  log_warn "Rust/Cargo is not installed. Native desktop build will be skipped."
  echo "  (To build the desktop bundle, install Rust: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh)"
fi

# 5. Check Linux System Libraries for Tauri/WebKit
if [ "$HAS_RUST" = true ]; then
  log_info "Checking system GUI dependencies..."
  if command -v apt-get >/dev/null 2>&1; then
    MISSING_PKGS=()
    for pkg in libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev; do
      if ! dpkg -s "$pkg" >/dev/null 2>&1; then
        MISSING_PKGS+=("$pkg")
      fi
    done
    if [ ${#MISSING_PKGS[@]} -gt 0 ]; then
      log_warn "Some recommended build packages might be missing: ${MISSING_PKGS[*]}"
      echo "  Install them via: sudo apt-get update && sudo apt-get install -y ${MISSING_PKGS[*]}"
    fi
  fi
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 6. Install Workspace Dependencies
log_info "Installing root dependencies..."
npm install

log_info "Installing web dependencies..."
npm --prefix web install

log_info "Installing desktop dependencies..."
if [ -d "desktop" ]; then
  npm --prefix desktop install
fi

# 7. Build Web Frontend
log_info "Building web frontend with Vite..."
npm --prefix web run build

# 8. Build Desktop Application (if Cargo is present)
if [ "$HAS_RUST" = true ] && [ -d "desktop/src-tauri" ]; then
  log_info "Building Linux desktop application..."
  cargo build --release --manifest-path desktop/src-tauri/Cargo.toml
  log_success "Linux binary compiled: desktop/src-tauri/target/release/smoke-monkey-canvas-desktop"
fi

# 9. Finished
echo ""
log_success "Smoke Monkey Canvas installation complete!"
echo ""
echo -e "${BOLD}To start the Canvas workspace:${RESET}"
echo ""
if [ -f "desktop/src-tauri/target/release/smoke-monkey-canvas-desktop" ]; then
  echo -e "  ${CYAN}Desktop Application:${RESET}"
  echo -e "    ./desktop/src-tauri/target/release/smoke-monkey-canvas-desktop"
  echo ""
fi
echo -e "  ${CYAN}Web / CLI Daemon:${RESET}"
echo -e "    npm start                 # Start background canvas server"
echo -e "    npm run dev:web           # Run the web frontend in development mode"
echo ""
