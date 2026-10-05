#!/usr/bin/env bash
# Development launcher for Smoke Monkey Canvas Desktop
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT_DIR="$(cd "$DESKTOP_DIR/.." && pwd)"

PORT="${PORT:-3333}"

# Start backend if not running
if ! curl -sf "http://127.0.0.1:${PORT}/api/space" >/dev/null 2>&1; then
  echo "[desktop] Starting Canvas backend on :${PORT}..."
  (cd "$ROOT_DIR" && node ./bin/cli.js --no-open --port "${PORT}") &
  BACKEND_PID=$!
  trap 'kill $BACKEND_PID 2>/dev/null || true' EXIT INT TERM
  sleep 1.5
fi

# Launch Tauri in development
cd "$DESKTOP_DIR"
npx tauri dev
