#!/usr/bin/env node

/**
 * 🐒 Smoke Monkey Canvas CLI Runner
 *
 * Provides instant global & NPX execution:
 *   npx @smoke-monkey/canvas
 *   smoke-monkey start (or connect)       # Run in background daemon mode
 *   smoke-monkey status                   # Check status of daemon
 *   smoke-monkey stop (or disconnect)     # Stop background daemon
 *   smoke-monkey restart                  # Restart daemon
 *   smoke-monkey logs [-f]                # View daemon log output
 *   smoke-monkey open                     # Open canvas in browser
 */

import { spawn, exec, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, openSync } from 'node:fs';
import { homedir } from 'node:os';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

const pkgPath = join(rootDir, 'package.json');
const pkg = existsSync(pkgPath) ? JSON.parse(readFileSync(pkgPath, 'utf8')) : { version: '1.3.2' };

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
let isRestart = false;
let isLogs = false;
let isLogsFollow = false;
let isOpen = false;

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
  } else if (arg === 'restart') {
    isRestart = true;
  } else if (arg === 'logs') {
    isLogs = true;
    if (args[i + 1] === '-f' || args[i + 1] === '--follow') {
      isLogsFollow = true;
      i++;
    }
  } else if (arg === 'open') {
    isOpen = true;
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

function getPidOnPort(p) {
  if (process.platform === 'win32') return null;
  try {
    const out = execSync(`lsof -ti tcp:${p} -sTCP:LISTEN`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (out) {
      const pids = out.split('\n').map(Number).filter(Boolean);
      return pids[0] || null;
    }
  } catch {}
  return null;
}

function getRunningPid() {
  // Check if something is listening on the configured port first
  const portPid = getPidOnPort(port);
  if (portPid && isProcessAlive(portPid)) {
    try {
      writeFileSync(PID_FILE, String(portPid), 'utf8');
    } catch {}
    return portPid;
  }
  if (existsSync(PID_FILE)) {
    try {
      const pid = parseInt(readFileSync(PID_FILE, 'utf8').trim(), 10);
      if (!isNaN(pid) && isProcessAlive(pid)) {
        return pid;
      }
      unlinkSync(PID_FILE);
    } catch {}
  }
  return null;
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
    cmd = `xdg-open "${url}" > /dev/null 2>&1 || sensible-browser "${url}" > /dev/null 2>&1`;
  }

  exec(cmd, () => {});
}

// ── Logs Command ─────────────────────────────────────────────────────────────

if (isLogs) {
  if (!existsSync(LOG_FILE)) {
    console.log('⚪ No log file found yet. Start the daemon first: smoke-monkey start');
    process.exit(0);
  }
  if (isLogsFollow) {
    const tail = spawn('tail', ['-f', LOG_FILE], { stdio: 'inherit' });
    process.on('SIGINT', () => {
      tail.kill();
      process.exit(0);
    });
  } else {
    try {
      const lines = readFileSync(LOG_FILE, 'utf8').split('\n');
      console.log(lines.slice(-40).join('\n'));
    } catch (err) {
      console.error('Error reading log file:', err.message);
    }
    process.exit(0);
  }
}

// ── Open Command ─────────────────────────────────────────────────────────────

if (isOpen) {
  const url = `http://localhost:${port}`;
  const pid = getRunningPid();
  if (pid) {
    console.log(`🌐 Opening Smoke Monkey Canvas (${url})...`);
    launchBrowser(url);
  } else {
    console.log(`🟡 Smoke Monkey Canvas is not running. Starting background daemon...`);
    isDaemon = true;
  }
  if (!isDaemon) process.exit(0);
}

// ── Stop Command ─────────────────────────────────────────────────────────────

function stopRunningDaemon() {
  const pid = getRunningPid();
  if (!pid) {
    return null;
  }
  try {
    process.kill(pid, 'SIGTERM');
    // If still alive after 1.5s, force kill
    setTimeout(() => {
      if (isProcessAlive(pid)) {
        try { process.kill(pid, 'SIGKILL'); } catch {}
      }
    }, 1500);
    if (existsSync(PID_FILE)) unlinkSync(PID_FILE);
    return pid;
  } catch (err) {
    return null;
  }
}

if (isStop) {
  const stoppedPid = stopRunningDaemon();
  if (stoppedPid) {
    console.log(`🛑 Stopped Smoke Monkey Canvas daemon (PID ${stoppedPid}).`);
  } else {
    console.log('⚪ No running Smoke Monkey Canvas instance found.');
  }
  process.exit(0);
}

// ── Restart Command ──────────────────────────────────────────────────────────

if (isRestart) {
  const stoppedPid = stopRunningDaemon();
  if (stoppedPid) {
    console.log(`🔄 Stopping running daemon (PID ${stoppedPid})...`);
  }
  isDaemon = true;
}

// ── Status Command ───────────────────────────────────────────────────────────

if (isStatus) {
  const pid = getRunningPid();
  if (pid) {
    console.log(`🟢 Smoke Monkey Canvas is RUNNING in background.`);
    console.log(`   PID:  ${pid}`);
    console.log(`   URL:  http://localhost:${port}`);
    console.log(`   Logs: ${LOG_FILE}`);
    console.log(`   DB:   ${dbPath}`);
  } else {
    console.log('⚪ Smoke Monkey Canvas is NOT running.');
    console.log(`   To launch in background: smoke-monkey start`);
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
  const forwardedArgs = args.filter((a) => !['--daemon', '-d', '--background', 'connect', 'start', 'restart', 'open'].includes(a));

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
  console.log(`  ▶ Status:      smoke-monkey status`);
  console.log(`  ▶ Stop Server: smoke-monkey stop`);
  console.log(`======================================================\n`);

  if (openBrowser) {
    setTimeout(() => {
      launchBrowser(`http://localhost:${port}`);
    }, 1200);
  }

  process.exit(0);
}

// ── Foreground / Child Server Runner ─────────────────────────────────────────

process.env.PORT = String(port);
process.env.SMOKE_CANVAS_DB = dbPath;

if (process.env.SMOKE_CANVAS_DAEMON_CHILD) {
  writeFileSync(PID_FILE, String(process.pid), 'utf8');
}

// Find tsx executable to run TypeScript server
let tsxBin;
try {
  tsxBin = require.resolve('tsx/cli');
} catch {
  tsxBin = join(rootDir, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  if (!existsSync(tsxBin)) {
    tsxBin = join(rootDir, 'node_modules', '.bin', 'tsx');
  }
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

const cleanup = () => {
  if (existsSync(PID_FILE)) {
    try { unlinkSync(PID_FILE); } catch {}
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
    try { unlinkSync(PID_FILE); } catch {}
  }
  process.exit(code ?? 0);
});

// ── Help Documentation ───────────────────────────────────────────────────────

function printHelp() {
  console.log(`
🐒 Smoke Monkey Canvas v${pkg.version}
Visual Multi-Agent Spatial Workspace for Smoke Monkey Harness

Usage:
  smoke-monkey [command] [options]
  smoke-monkey-canvas [command] [options]
  npx @smoke-monkey/canvas [command] [options]

Commands:
  start, connect            Launch Canvas in background daemon mode
  stop, disconnect          Stop running background daemon
  restart                   Restart the background daemon
  status                    Check status, port, PID, and logs
  logs [-f]                 View or follow background daemon logs
  open                      Open the Web UI in your default browser

Options:
  -p, --port <number>       Port to run the Canvas server on (default: 3333)
  --db <path>               SQLite database file path (default: ~/.smoke-monkey/canvas.db)
  -d, --daemon              Run server continuously in background (daemon mode)
  -n, --no-open             Do not automatically open the browser on start
  -v, --version             Show version number
  -h, --help                Show this help message

Examples:
  smoke-monkey start                         # Start in background & open canvas
  smoke-monkey status                        # Check status & active port/PID
  smoke-monkey logs -f                       # Follow live daemon logs
  smoke-monkey stop                          # Cleanly shut down background daemon
  npx @smoke-monkey/canvas                   # Instant launch via npx
`);
}
