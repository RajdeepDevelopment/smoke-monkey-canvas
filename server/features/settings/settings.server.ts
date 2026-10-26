import { Router, type Request, type Response } from 'express';
import fs from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { spawn, execFile } from 'node:child_process';
import { CoreDatabase } from '../core/database.db.js';
import { STOCK_MCPS } from '../mcp/mcp.stock.js';

export function createSettingsRouter(): Router {
  const router = Router();
  const db = CoreDatabase.getInstance();

  function maskKey(val: string | null): string {
    if (!val) return '';
    if (val.length <= 8) return '••••••••';
    return `${val.slice(0, 6)}••••••••${val.slice(-4)}`;
  }

  // GET /api/settings/keys
  router.get('/keys', (_req: Request, res: Response) => {
    const allDbSettings = db.getAllSettings();
    const result: Record<string, { masked: string; isSet: boolean }> = {};

    // 1. Standard LLM keys
    const knownKeys = new Set<string>([
      'NVIDIA_API_KEY',
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'GEMINI_API_KEY',
      'OPENROUTER_API_KEY',
      'GROQ_API_KEY',
    ]);

    // 2. All environment keys required by any Stock MCP (Figma, GitHub, Slack, Notion, etc.)
    for (const mcp of STOCK_MCPS) {
      if (Array.isArray(mcp.envKeys)) {
        for (const k of mcp.envKeys) {
          knownKeys.add(k);
        }
      }
    }

    // 3. Any key previously persisted in the database settings
    for (const k of Object.keys(allDbSettings)) {
      knownKeys.add(k);
    }

    // 4. Return masked values and isSet boolean for all known keys
    for (const k of knownKeys) {
      const val = allDbSettings[k] || process.env[k] || '';
      result[k] = {
        masked: maskKey(val),
        isSet: val.length > 0,
      };
    }

    res.json(result);
  });

  // POST /api/settings/keys
  router.post('/keys', (req: Request, res: Response) => {
    const body = req.body || {};
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string' && value.trim().length > 0) {
        db.setSetting(key, value.trim());
      }
    }
    res.json({ success: true, message: 'Settings saved successfully' });
  });

  // GET /api/settings/local-dirs
  router.get('/local-dirs', (_req: Request, res: Response) => {
    const home = homedir();
    const cwd = process.cwd();
    const candidates = [
      { id: 'workspace', label: 'Current Project Root (./)', path: cwd },
      { id: 'smoke-agents', label: 'Smoke Agents Sandbox (~/.smoke-agents)', path: join(home, '.smoke-agents') },
      { id: 'home', label: 'Home Directory (~)', path: home },
      { id: 'desktop', label: 'Desktop (~/Desktop)', path: join(home, 'Desktop') },
      { id: 'documents', label: 'Documents (~/Documents)', path: join(home, 'Documents') },
      { id: 'downloads', label: 'Downloads (~/Downloads)', path: join(home, 'Downloads') },
    ];
    const available = candidates.filter((c) => {
      try {
        return fs.existsSync(c.path);
      } catch {
        return false;
      }
    });
    res.json({ cwd, home, directories: available });
  });

  // POST /api/settings/resolve-path
  router.post('/resolve-path', (req: Request, res: Response) => {
    const rawPath = typeof req.body?.path === 'string' ? req.body.path.trim() : '';
    if (!rawPath) {
      res.json({ resolved: '', exists: false, isDirectory: false });
      return;
    }
    let target = rawPath;
    if (target.startsWith('~/') || target === '~') {
      target = target.replace(/^~(?=$|\/|\\)/, homedir());
    } else {
      target = resolve(process.cwd(), target);
    }
    let exists = false;
    let isDirectory = false;
    try {
      const stat = fs.statSync(target);
      exists = true;
      isDirectory = stat.isDirectory();
    } catch {}
    res.json({
      raw: rawPath,
      resolved: target,
      exists,
      isDirectory,
    });
  });

  // GET /api/settings/version
  router.get('/version', async (_req: Request, res: Response) => {
    try {
      const versionInfo = await checkVersion();
      res.json({ ...versionInfo, canUpgrade: await isNpmAvailable() });
    } catch {
      res.json({
        currentVersion: '1.3.2',
        latestVersion: '1.3.2',
        harnessVersion: '1.3.1',
        latestHarnessVersion: '1.3.1',
        hasUpdate: false,
        upgradeCommand: 'npm install -g @smoke-monkey/canvas@latest',
        releaseNotesUrl: 'https://github.com/RajdeepDevelopment/smoke-monkey-canvas/releases',
        checkedAt: new Date().toISOString(),
        canUpgrade: false,
      });
    }
  });

  // ── In-app upgrade job ─────────────────────────────────────────────────────

  // GET /api/settings/upgrade/status
  router.get('/upgrade/status', (_req: Request, res: Response) => {
    res.json(upgradeJob);
  });

  // POST /api/settings/upgrade
  router.post('/upgrade', async (_req: Request, res: Response) => {
    if (upgradeJob.state === 'installing') {
      res.status(409).json({ error: 'An update is already being installed.' });
      return;
    }

    if (!(await isNpmAvailable())) {
      res.status(400).json({
        error: 'npm was not found on this machine. Install Node.js (which includes npm) or run the update manually.',
      });
      return;
    }

    let versionInfo: VersionInfo;
    try {
      cachedVersionInfo = null;
      versionInfo = await checkVersion();
    } catch {
      res.status(500).json({ error: 'Could not check for updates right now.' });
      return;
    }

    if (!versionInfo.hasUpdate) {
      res.status(400).json({ error: 'You are already on the latest release.' });
      return;
    }

    upgradeJob = {
      state: 'installing',
      log: '',
      error: null,
      startedAt: new Date().toISOString(),
      finishedAt: null,
    };

    res.status(202).json({ ...upgradeJob, targetVersion: versionInfo.latestVersion });

    runUpgradeJob();
  });

  return router;
}

interface VersionInfo {
  currentVersion: string;
  latestVersion: string;
  harnessVersion: string;
  latestHarnessVersion: string;
  hasUpdate: boolean;
  upgradeCommand: string;
  releaseNotesUrl: string;
  checkedAt: string;
}

let cachedVersionInfo: { timestamp: number; data: VersionInfo } | null = null;

function compareSemver(v1: string, v2: string): number {
  const p1 = v1.replace(/^v/, '').split('.').map(Number);
  const p2 = v2.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const a = p1[i] || 0;
    const b = p2[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

async function checkVersion(): Promise<VersionInfo> {
  const now = Date.now();
  if (cachedVersionInfo && now - cachedVersionInfo.timestamp < 10 * 60 * 1000) {
    return cachedVersionInfo.data;
  }

  let currentVersion = '1.3.2';
  let harnessVersion = '1.3.1';
  try {
    const pkgPath = resolve(process.cwd(), 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.version) currentVersion = pkg.version;
      if (pkg.dependencies && pkg.dependencies['smoke-monkey-harness']) {
        harnessVersion = pkg.dependencies['smoke-monkey-harness'].replace(/^[\^~]/, '');
      }
    }
  } catch {}

  let latestVersion = currentVersion;
  let latestHarnessVersion = harnessVersion;
  let hasUpdate = false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const [canvasRes, harnessRes] = await Promise.allSettled([
      fetch('https://registry.npmjs.org/@smoke-monkey/canvas/latest', { signal: controller.signal }),
      fetch('https://registry.npmjs.org/smoke-monkey-harness/latest', { signal: controller.signal }),
    ]);
    clearTimeout(timeout);

    if (canvasRes.status === 'fulfilled' && canvasRes.value.ok) {
      const data = (await canvasRes.value.json()) as { version?: string };
      if (data.version) {
        latestVersion = data.version;
        if (compareSemver(latestVersion, currentVersion) > 0) {
          hasUpdate = true;
        }
      }
    }

    if (harnessRes.status === 'fulfilled' && harnessRes.value.ok) {
      const data = (await harnessRes.value.json()) as { version?: string };
      if (data.version) {
        latestHarnessVersion = data.version;
        if (compareSemver(latestHarnessVersion, harnessVersion) > 0) {
          hasUpdate = true;
        }
      }
    }
  } catch {}

  const data: VersionInfo = {
    currentVersion,
    latestVersion,
    harnessVersion,
    latestHarnessVersion,
    hasUpdate,
    upgradeCommand: 'npm install -g @smoke-monkey/canvas@latest',
    releaseNotesUrl: 'https://github.com/RajdeepDevelopment/smoke-monkey-canvas/releases',
    checkedAt: new Date().toISOString(),
  };

  cachedVersionInfo = { timestamp: now, data };
  return data;
}

// ── In-app upgrade executor ──────────────────────────────────────────────────

interface UpgradeJob {
  state: 'idle' | 'installing' | 'success' | 'failed';
  log: string;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

let upgradeJob: UpgradeJob = {
  state: 'idle',
  log: '',
  error: null,
  startedAt: null,
  finishedAt: null,
};

const UPGRADE_LOG_CAP = 4096;

function appendUpgradeLog(chunk: string) {
  upgradeJob.log = (upgradeJob.log + chunk).slice(-UPGRADE_LOG_CAP);
}

let npmAvailableCache: boolean | null = null;

function isNpmAvailable(): Promise<boolean> {
  if (npmAvailableCache !== null) return Promise.resolve(npmAvailableCache);
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  return new Promise((resolveP) => {
    execFile(npmCmd, ['--version'], { timeout: 5000 }, (err) => {
      npmAvailableCache = !err;
      resolveP(!err);
    });
  });
}

function describeUpgradeFailure(log: string): string {
  const lower = log.toLowerCase();
  if (lower.includes('eacces') || lower.includes('eperm') || lower.includes('permission denied')) {
    return 'Installation needs elevated permissions. Run the update manually in Terminal.';
  }
  if (lower.includes('enotfound') || lower.includes('econnrefused') || lower.includes('etimedout') || lower.includes('network')) {
    return "Couldn't reach the npm registry. Check your internet connection and try again.";
  }
  const lastLine = log.trim().split('\n').filter(Boolean).pop();
  return lastLine ? `Update failed: ${lastLine.slice(0, 200)}` : 'Update failed for an unknown reason.';
}

function runUpgradeJob() {
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const child = spawn(npmCmd, ['install', '-g', '@smoke-monkey/canvas@latest'], {
    env: { ...process.env, npm_config_update_notifier: 'false' },
    cwd: process.cwd(),
  });

  child.stdout?.on('data', (d: Buffer) => appendUpgradeLog(d.toString()));
  child.stderr?.on('data', (d: Buffer) => appendUpgradeLog(d.toString()));

  child.on('error', (err) => {
    upgradeJob.state = 'failed';
    upgradeJob.error = describeUpgradeFailure(err.message);
    upgradeJob.finishedAt = new Date().toISOString();
  });

  child.on('close', (code) => {
    upgradeJob.finishedAt = new Date().toISOString();
    if (code === 0) {
      upgradeJob.state = 'success';
      upgradeJob.error = null;
      cachedVersionInfo = null;
      // Give the HTTP response a beat to flush, then restart the daemon so the
      // freshly installed package is picked up.
      setTimeout(() => {
        const rootDir = process.cwd();
        const cliPath = resolve(rootDir, 'bin', 'cli.js');
        if (!fs.existsSync(cliPath)) return;
        try {
          // Drop the daemon-child marker we inherited so `restart` daemonizes
          // properly (detached, own PID file) instead of running in-process.
          const restartEnv = { ...process.env };
          delete restartEnv.SMOKE_CANVAS_DAEMON_CHILD;
          const restart = spawn(process.execPath, [cliPath, 'restart'], {
            detached: true,
            stdio: 'ignore',
            cwd: rootDir,
            env: restartEnv,
          });
          restart.unref();
        } catch {}
      }, 500);
    } else {
      upgradeJob.state = 'failed';
      upgradeJob.error = describeUpgradeFailure(upgradeJob.log);
    }
  });
}
