#!/usr/bin/env bash
# Start the local Smoke Monkey Canvas backend server for the desktop app
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

PORT="${PORT:-3333}"
if curl -sf "http://127.0.0.1:${PORT}/api/space" >/dev/null 2>&1; then
  echo "Smoke Monkey Canvas backend already running on port ${PORT}" >&2
  exit 0
fi

echo "Starting Smoke Monkey Canvas backend on port ${PORT}..."
cd "$ROOT_DIR"
node ./bin/cli.js --no-open --port "${PORT}"
