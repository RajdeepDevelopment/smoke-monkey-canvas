# 🐒 Smoke Monkey Canvas Desktop

Cross-platform desktop application for **Smoke Monkey Canvas**, built with **Tauri v2** (Rust shell) + **React/Vite** (Spatial Web UI) + **Node.js** (Harness & Execution Backend).

Supports 3 major desktop operating systems:
- 🍏 **macOS** (`.app`, `.dmg` — Universal, Apple Silicon `aarch64`, Intel `x86_64`)
- 🪟 **Windows** (`.exe`, `.msi` — NSIS installer, portable)
- 🐧 **Linux & More** (`.AppImage`, `.deb`, `tar.gz`)

---

## 🏗️ Architecture & Stream Handling

### Why Tauri 2 + Rust?
1. **Lightweight & Fast**: Uses native OS webviews (WKWebView on macOS, WebView2 on Windows, WebKitGTK on Linux) instead of bundling heavy Chromium runtimes.
2. **Native PTY & Shell Control**: Cross-platform pseudo-terminals managed directly through `portable-pty`.
3. **Robust Non-Blocking Stream Proxy (`proxy_fetch_streaming`)**:
   - **Phase 1 (Headers)**: Runs on a worker thread and returns immediately with HTTP response headers so the webview event loop is **never blocked**.
   - **Phase 2 (Body Chunking)**: Emits `proxy-data` Tauri events from a detached background worker thread.
   - **SSE / LLM Idle Resilience**: Does not drop connections during extended LLM reasoning or tool executions.
   - **Automatic Child Lifecycle**: Spawns and supervises the Node backend on port `3333`, probing readiness and guaranteeing process termination on window exit.

---

## 🚀 Development

Start the backend and desktop shell simultaneously:

```bash
# From workspace root:
npm run desktop:dev

# Or inside desktop directory:
cd desktop
npm run dev
```

---

## 📦 Building Desktop Installers

### 1. macOS (Universal / DMG / .app)
```bash
# Standard Tauri build
npm run desktop:build:mac

# Or standalone .app bundle (no Xcode required, uses Command Line Tools)
cd desktop && npm run bundle:mac
```
Output:
`desktop/src-tauri/target/release/bundle/dmg/` or `Smoke Monkey Canvas.app`

### 2. Windows (NSIS Installer & MSI)
```bash
npm run desktop:build:win
# or from desktop:
npm run bundle:win
```
Output:
`desktop\src-tauri\target\release\bundle\nsis\Smoke Monkey Canvas_1.3.2_x64-setup.exe`

### 3. Linux & More (AppImage & DEB)
```bash
npm run desktop:build:linux
# or from desktop:
npm run bundle:linux
```
Output:
`desktop/src-tauri/target/release/bundle/appimage/` and `bundle/deb/`

---

## 📁 Directory Structure

```
desktop/
├── package.json              # Desktop scripts & Tauri CLI
├── mac/                      # macOS target configs (Info.plist, Entitlements, build-mac.sh)
├── windows/                  # Windows target configs (nsis-installer.nsh, app.manifest, build-win.ps1)
├── linux/                    # Linux target configs (smoke-monkey-canvas.desktop, build-linux.sh)
├── scripts/                  # Cross-platform runner and bundling helpers
├── assets/                   # App icons & graphics
└── src-tauri/                # Tauri 2 Rust engine
    ├── Cargo.toml            # Rust dependencies (tauri, portable-pty, nix, serde)
    ├── tauri.conf.json       # App window, bundle targets, and security permissions
    └── src/
        ├── main.rs           # Entry point
        └── lib.rs            # Non-blocking stream proxy, PTY manager, backend lifecycle
```
