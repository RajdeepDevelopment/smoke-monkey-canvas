#!/usr/bin/env bash
# ==============================================================================
# 🐒 Smoke Monkey Canvas — macOS Fresh Install Script
# ==============================================================================
# Performs a complete fresh install of Smoke Monkey Canvas on macOS:
# - Validates system prerequisites (Node.js >= 18, npm, Rust/Cargo)
# - Installs all root, web, and desktop workspace dependencies
# - Compiles the web application bundle
# - Builds the native macOS desktop application (.app bundle)
# - Installs to /Applications/Smoke Monkey Canvas.app
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
echo -e "${BOLD}🐒 Smoke Monkey Canvas — macOS Installer${RESET}\n"

# 1. Check Operating System
OS="$(uname -s)"
if [ "$OS" != "Darwin" ]; then
  log_error "This script is designed for macOS. Detected: $OS"
  echo "For Linux, run: ./install-linux.sh"
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
  log_warn "Rust/Cargo is not installed. Native desktop app build will be skipped."
  echo "  (To build the desktop .app, install Rust via: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh)"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 5. Install Dependencies
log_info "Installing root dependencies..."
npm install

log_info "Installing web dependencies..."
npm --prefix web install

log_info "Installing desktop dependencies..."
if [ -d "desktop" ]; then
  npm --prefix desktop install
fi

# 6. Build Web Frontend
log_info "Building web frontend with Vite..."
npm --prefix web run build

# 7. Build and Install Desktop App (if Cargo available)
if [ "$HAS_RUST" = true ] && [ -d "desktop/src-tauri" ]; then
  log_info "Compiling and packaging native macOS desktop application..."
  bash desktop/scripts/bundle-mac.sh

  APP_SOURCE="desktop/src-tauri/target/release/Smoke Monkey Canvas.app"
  APP_DEST="/Applications/Smoke Monkey Canvas.app"

  if [ -d "$APP_SOURCE" ]; then
    log_info "Installing to $APP_DEST..."
    pkill -f "Smoke Monkey Canvas" 2>/dev/null || true
    rm -rf "$APP_DEST"
    cp -R "$APP_SOURCE" /Applications/
    log_success "Desktop app installed to /Applications/Smoke Monkey Canvas.app"
  fi
fi

# 8. Finished
echo ""
log_success "Smoke Monkey Canvas installation complete!"
echo ""
echo -e "${BOLD}To start the Canvas workspace:${RESET}"
echo ""
if [ -d "/Applications/Smoke Monkey Canvas.app" ]; then
  echo -e "  ${CYAN}Desktop Application:${RESET}"
  echo -e "    open \"/Applications/Smoke Monkey Canvas.app\""
  echo ""
fi
echo -e "  ${CYAN}Web / CLI Daemon:${RESET}"
echo -e "    npm start                 # Start the background canvas server"
echo -e "    npm run dev:web           # Run the web frontend in development mode"
echo ""
