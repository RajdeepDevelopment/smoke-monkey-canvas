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

// If invoking MCP server subcommand, immediately forward to canvas-mcp runner
if (args[0] === 'mcp') {
  const mcpRunner = join(__dirname, 'canvas-mcp.js');
  const forwarded = args.slice(1);
  const child = spawn(process.execPath, [mcpRunner, ...forwarded], {
    stdio: 'inherit',
    cwd: rootDir,
    env: process.env,
  });
  child.on('exit', (code) => process.exit(code ?? 0));
  // Keep alive until child exits
  process.on('SIGINT', () => { if (!child.killed) child.kill('SIGINT'); });
  process.on('SIGTERM', () => { if (!child.killed) child.kill('SIGTERM'); });
} else {

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

// Only remove the PID file when it still belongs to this process. Without this,
// a dying daemon can delete the file a freshly restarted daemon just wrote.
function releasePidFile(ownerPid) {
  try {
    if (!existsSync(PID_FILE)) return;
    if (readFileSync(PID_FILE, 'utf8').trim() === String(ownerPid)) {
      unlinkSync(PID_FILE);
    }
  } catch {}
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

// ── Helper: Wait for Server Readiness ─────────────────────────────────────────

/**
 * Polls GET /api/health (added alongside the auth work — see
 * server/app.server.ts — specifically so this never needs a token) until the
 * server answers or maxWaitMs elapses.
 *
 * Opening the browser on a blind setTimeout (the previous behavior: 1000ms
 * for a fresh foreground start, 1200ms for a fresh daemon start) assumes tsx
 * transpiles and boots the Express app, runs DB migrations, and starts
 * listening within that fixed window. On a slow machine, a loaded CI-like
 * host, or the very first `npx @smoke-monkey/canvas` run (still settling
 * after its own install), that assumption doesn't hold: the browser opens to
 * a "can't connect" page before the server is actually listening, which
 * looks indistinguishable from the auto-open feature not existing at all.
 */
async function waitForServerReady(url, maxWaitMs = 20000) {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(1000) });
      if (res.ok) return true;
    } catch {
      // Not up yet (ECONNREFUSED while the server is still booting) — retry.
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

/**
 * Waits for the server to be ready, then opens the browser. Prints the URL
 * either way so headless/SSH sessions (where no browser command can
 * actually open anything) and a readiness timeout both still leave the user
 * with something to click or copy, instead of silence.
 */
async function openWhenReady(url) {
  const ready = await waitForServerReady(url);
  if (!ready) {
    console.warn(`⚠️  Server did not report ready within 20s — opening ${url} anyway.`);
  }
  console.log(`🌐 Opening ${url} ...`);
  launchBrowser(url);
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
    if (existsSync(PID_FILE)) releasePidFile(pid);
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
    // Bug: this used to be a bare setTimeout(..., 1200) immediately followed
    // by process.exit(0) below with no await in between. process.exit()
    // terminates the process immediately, including any pending timers —
    // the scheduled launchBrowser() call never actually ran. `smoke-monkey
    // start`/`connect`, the headline documented command for this CLI, never
    // opened the browser at all, regardless of how long the server took to
    // boot. Awaiting the open (which itself waits for /api/health, not a
    // blind delay) before exiting fixes both: the open now actually
    // happens, and it waits for the server to be ready instead of guessing.
    await openWhenReady(`http://localhost:${port}`);
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
    // This CLI is the officially-supported local launcher: it's about to
    // fork the server process itself, so there's no reverse-proxy ambiguity
    // for the local-UI bootstrap check (isLocalUiRequest in
    // server/features/core/auth.server.ts) to worry about. A user who runs
    // the raw server some other way (not through this CLI, the desktop app,
    // or the mobile build) must opt in explicitly.
    SMOKE_MONKEY_ASSUME_LOCAL: '1',
  },
});

if (openBrowser && !process.env.SMOKE_CANVAS_DAEMON_CHILD) {
  // Waits for /api/health instead of a blind 1s delay — see openWhenReady().
  // On a slow machine or a cold first `npx` run, tsx transpiling and booting
  // the server can take longer than that, and the browser would otherwise
  // open to a "can't connect" page before the server is actually listening.
  void openWhenReady(`http://localhost:${port}`);
}

const cleanup = () => {
  releasePidFile(process.pid);
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM');
  }
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

serverProc.on('exit', (code) => {
  releasePidFile(process.pid);
  process.exit(code ?? 0);
});
} // end of non-mcp runner block

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
  mcp                       Run the Model Context Protocol (MCP) server over stdio

Options:
  -p, --port <number>       Port to run the Canvas server on (default: 3333)
  --db <path>               SQLite database file path (default: ~/.smoke-monkey/canvas.db)
  --space-id <id>           Default space/company ID for scoped operations in MCP mode
  -d, --daemon              Run server continuously in background (daemon mode)
  -n, --no-open             Do not automatically open the browser on start
  -v, --version             Show version number
  -h, --help                Show this help message

Examples:
  smoke-monkey start                         # Start in background & open canvas
  smoke-monkey status                        # Check status & active port/PID
  smoke-monkey logs -f                       # Follow live daemon logs
  smoke-monkey stop                          # Cleanly shut down background daemon
  smoke-monkey mcp                           # Run Canvas MCP server in global mode
  smoke-monkey mcp --space-id <spaceId>      # Run Canvas MCP server scoped to a company
  npx @smoke-monkey/canvas mcp               # Run Canvas MCP server directly via NPX
`);
}
