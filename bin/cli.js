#!/usr/bin/env node

/**
 * 🐒 Smoke Monkey Canvas CLI Runner
 *
 * Provides instant NPX execution:
 *   npx smoke-monkey-canvas
 *   npx smoke-monkey-canvas --port 3333 --daemon
 *   npx smoke-monkey-canvas --status
 *   npx smoke-monkey-canvas --stop
 */

import { spawn, exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, openSync } from 'node:fs';
import { homedir } from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

const pkgPath = join(rootDir, 'package.json');
const pkg = existsSync(pkgPath) ? JSON.parse(readFileSync(pkgPath, 'utf8')) : { version: '1.3.1' };

const STATE_DIR = join(homedir(), '.smoke-monkey');
const PID_FILE = join(STATE_DIR, 'canvas.pid');
const LOG_FILE = join(STATE_DIR, 'canvas.log');
const DEFAULT_DB = join(STATE_DIR, 'canvas.db');

if (!existsSync(STATE_DIR)) {
  mkdirSync(STATE_DIR, { recursive: true });
}

// ── Parse Arguments ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let port = Number(process.env.PORT || 3333);
let dbPath = process.env.SMOKE_CANVAS_DB || DEFAULT_DB;
let openBrowser = true;
let isDaemon = false;
let isStop = false;
let isStatus = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--help' || arg === '-h' || arg === 'help') {
    printHelp();
    process.exit(0);
  } else if (arg === '--version' || arg === '-v' || arg === 'version') {
    console.log(`@smoke-monkey/canvas v${pkg.version}`);
    process.exit(0);
  } else if (arg === '--port' || arg === '-p') {
    const p = Number(args[++i]);
    if (!isNaN(p)) port = p;
  } else if (arg === '--db') {
    dbPath = resolve(args[++i]);
  } else if (arg === '--no-open' || arg === '-n') {
    openBrowser = false;
  } else if (arg === 'connect' || arg === 'start' || arg === '--daemon' || arg === '-d' || arg === '--background') {
    isDaemon = true;
  } else if (arg === 'disconnect' || arg === 'stop' || arg === '--stop') {
    isStop = true;
  } else if (arg === 'status' || arg === '--status') {
    isStatus = true;
  }
}

// ── Helper: Check Process Alive ──────────────────────────────────────────────

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function getRunningPid() {
  if (!existsSync(PID_FILE)) return null;
  try {
    const pid = parseInt(readFileSync(PID_FILE, 'utf8').trim(), 10);
    if (!isNaN(pid) && isProcessAlive(pid)) {
      return pid;
    }
    // Stale PID file
    unlinkSync(PID_FILE);
    return null;
  } catch {
    return null;
  }
}

// ── Helper: Open Browser ─────────────────────────────────────────────────────

function launchBrowser(url) {
  if (process.env.CI || process.env.NODE_ENV === 'test') return;
  const platform = process.platform;
  let cmd = '';

  if (platform === 'darwin') {
    cmd = `open "${url}"`;
  } else if (platform === 'win32') {
    cmd = `start "" "${url}"`;
  } else {
    // Linux / BSD
    cmd = `xdg-open "${url}" > /dev/null 2>&1 || sensible-browser "${url}" > /dev/null 2>&1`;
  }

  exec(cmd, () => {
    // Intentionally ignore exit code (e.g. headless servers without display)
  });
}

// ── Stop Command ─────────────────────────────────────────────────────────────

if (isStop) {
  const pid = getRunningPid();
  if (!pid) {
    console.log('⚪ No running Smoke Monkey Canvas instance found.');
    process.exit(0);
  }
  try {
    process.kill(pid, 'SIGTERM');
    if (existsSync(PID_FILE)) unlinkSync(PID_FILE);
    console.log(`🛑 Stopped Smoke Monkey Canvas daemon (PID ${pid}).`);
  } catch (err) {
    console.error(`Failed to stop process ${pid}:`, err.message);
  }
  process.exit(0);
}

// ── Status Command ───────────────────────────────────────────────────────────

if (isStatus) {
  const pid = getRunningPid();
  if (pid) {
    console.log(`🟢 Smoke Monkey Canvas is RUNNING in background.`);
    console.log(`   PID:  ${pid}`);
    console.log(`   URL:  http://localhost:${port}`);
    console.log(`   Logs: ${LOG_FILE}`);
  } else {
    console.log('⚪ Smoke Monkey Canvas is NOT running.');
  }
  process.exit(0);
}

// ── Daemon Mode (Parent Fork) ────────────────────────────────────────────────

if (isDaemon && !process.env.SMOKE_CANVAS_DAEMON_CHILD) {
  const existingPid = getRunningPid();
  if (existingPid) {
    console.log(`🟢 Smoke Monkey Canvas is already running on PID ${existingPid}.`);
    console.log(`   URL: http://localhost:${port}`);
    if (openBrowser) launchBrowser(`http://localhost:${port}`);
    process.exit(0);
  }

  const logFd = openSync(LOG_FILE, 'a');
  const forwardedArgs = args.filter((a) => !['--daemon', '-d', '--background', 'connect', 'start'].includes(a));

  const child = spawn(process.execPath, [__filename, ...forwardedArgs], {
    detached: true,
    stdio: ['ignore', logFd, logFd],
    env: {
      ...process.env,
      SMOKE_CANVAS_DAEMON_CHILD: '1',
      PORT: String(port),
      SMOKE_CANVAS_DB: dbPath,
    },
    cwd: rootDir,
  });

  child.unref();

  writeFileSync(PID_FILE, String(child.pid), 'utf8');

  console.log(`\n======================================================`);
  console.log(`  🐒 Smoke Monkey Canvas started in BACKGROUND (Daemon)`);
  console.log(`======================================================`);
  console.log(`  ▶ Web UI:      http://localhost:${port}`);
  console.log(`  ▶ Process ID:  ${child.pid}`);
  console.log(`  ▶ Logs:        ${LOG_FILE}`);
  console.log(`  ▶ Database:    ${dbPath}`);
  console.log(`  ▶ Stop Server: npx smoke-monkey-canvas --stop`);
  console.log(`======================================================\n`);

  if (openBrowser) {
    // Delay browser open slightly so server has time to bind
    setTimeout(() => {
      launchBrowser(`http://localhost:${port}`);
    }, 1200);
  }

  process.exit(0);
}

// ── Foreground / Child Server Runner ─────────────────────────────────────────

process.env.PORT = String(port);
process.env.SMOKE_CANVAS_DB = dbPath;

// Write current PID if running as daemon child
if (process.env.SMOKE_CANVAS_DAEMON_CHILD) {
  writeFileSync(PID_FILE, String(process.pid), 'utf8');
}

// Find tsx executable to run TypeScript server
let tsxBin = join(rootDir, 'node_modules', 'tsx', 'dist', 'cli.mjs');
if (!existsSync(tsxBin)) {
  tsxBin = join(rootDir, 'node_modules', '.bin', 'tsx');
}

const serverEntry = join(rootDir, 'server', 'app.server.ts');

const serverProc = spawn(process.execPath, [tsxBin, serverEntry], {
  stdio: 'inherit',
  cwd: rootDir,
  env: {
    ...process.env,
    PORT: String(port),
    SMOKE_CANVAS_DB: dbPath,
  },
});

if (openBrowser && !process.env.SMOKE_CANVAS_DAEMON_CHILD) {
  setTimeout(() => {
    launchBrowser(`http://localhost:${port}`);
  }, 1000);
}

// Handle clean shutdown
const cleanup = () => {
  if (existsSync(PID_FILE)) {
    try {
      unlinkSync(PID_FILE);
    } catch {}
  }
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM');
  }
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

serverProc.on('exit', (code) => {
  if (existsSync(PID_FILE)) {
    try {
      unlinkSync(PID_FILE);
    } catch {}
  }
  process.exit(code ?? 0);
});

// ── Help Documentation ───────────────────────────────────────────────────────

function printHelp() {
  console.log(`
🐒 Smoke Monkey Canvas v${pkg.version}
Visual Multi-Agent Spatial Workspace for Smoke Monkey Harness

Usage:
  npx @smoke-monkey/canvas [command] [options]
  smoke-monkey [command] [options]
  smoke-monkey-canvas [command] [options]

Commands:
  connect, start            Launch Smoke Monkey in background (daemon mode)
  disconnect, stop          Stop running background instance
  status                    Check status of running background instance

Options:
  -p, --port <number>       Port to run the Canvas server on (default: 3333)
  --db <path>               SQLite database file path (default: ~/.smoke-monkey/canvas.db)
  -d, --daemon              Run server continuously in background (daemon mode)
  -n, --no-open             Do not automatically open the browser on start
  -v, --version             Show version number
  -h, --help                Show this help message

Examples:
  npx @smoke-monkey/canvas                   # Start foreground and open canvas
  npx @smoke-monkey/canvas connect           # Start background daemon (like warp-cli connect)
  npx @smoke-monkey/canvas status            # Check if running and print URL / PID
  npx @smoke-monkey/canvas stop              # Stop background daemon
  smoke-monkey connect                       # When installed globally
`);
}
