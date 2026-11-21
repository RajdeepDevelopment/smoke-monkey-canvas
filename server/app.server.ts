import express from 'express';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { CoreDatabase } from './features/core/database.db.js';
import { CoreWsServer } from './features/core/ws.server.js';
import { createSpaceRouter } from './features/space/space.server.js';
import { createAgentRouter } from './features/agent/agent.server.js';
import { AgentRunner } from './features/agent/agent.runner.js';
import { createPersonalityRouter } from './features/agent/agent.presets.server.js';
import { AgentCronScheduler } from './features/agent/agent.cron.js';
import { createMcpRouter } from './features/mcp/mcp.server.js';

import { createSettingsRouter } from './features/settings/settings.server.js';
import { createSkillRouter } from './features/skill/skill.server.js';
import { createExploreRouter } from './features/space/explore.server.js';
import {
  AUTH_TOKEN_HEADER,
  createAuthMiddleware,
  createAuthBootstrapHandler,
  createWsTokenVerifier,
  isAuthDisabled,
  isLocalUiRequest,
  resolveAuthToken,
} from './features/core/auth.server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

export interface AppServerOptions {
  port?: number;
  dbPath?: string;
  /**
   * Interface to bind.
   *
   * Defaults to loopback (127.0.0.1) — see DEFAULT_HOST below — so a bare
   * `npm start`/`smoke-monkey start` is not reachable from the LAN or (via a
   * malicious web page's cross-origin request) from software already running
   * on the same machine. Reaching the server from another machine is required
   * for container/VPS deployments (Docker, Fly, Render, Northflank), which set
   * the HOST env var to '0.0.0.0' explicitly — see each deploy config under
   * deploy/, Dockerfile, fly.toml, render.yaml, northflank.template.json, and
   * .do/deploy.template.yaml. That is an explicit opt-in, not the default.
   *
   * The mobile build passes '127.0.0.1' explicitly regardless of this default
   * (see mobile/modules/server-bundle/canvas-server.js): on a phone, binding
   * the Wi-Fi interface would expose agent creation/configuration to every
   * other device on the network.
   *
   * Opting into LAN/remote exposure (via this option or HOST=0.0.0.0) does not
   * by itself add a login screen for human visitors — see SECURITY.md. It
   * only changes which interfaces accept connections; the bearer-token check
   * below (see createAuthMiddleware) still applies to every /api and /ws call.
   */
  host?: string;
}

const DEFAULT_HOST = '127.0.0.1';

/**
 * Origins allowed to make cross-origin requests that read the response
 * (i.e. actual browser-enforced CORS), replacing the previous wildcard.
 *
 * This "closes" the drive-by attack vector for the common desktop/CLI case
 * where the request would otherwise just fail 401 anyway (see auth.server.ts)
 * — CORS and the bearer token are independent layers: CORS stops a browser
 * from reading a cross-origin response at all; the token stops the request
 * from being honoured even same-origin or outside a browser (e.g. curl, a
 * device on the LAN) once the server is opened up via HOST=0.0.0.0.
 */
function buildAllowedOrigins(port: number): Set<string> {
  const origins = new Set<string>();
  // The app's own origin, and Vite's dev server (web/vite.config.ts) and the
  // Tauri desktop dev server (desktop/src-tauri/tauri.conf.json devUrl), on
  // both localhost and 127.0.0.1.
  for (const p of [port, 5081, 5180]) {
    origins.add(`http://localhost:${p}`);
    origins.add(`http://127.0.0.1:${p}`);
  }
  // Packaged Tauri desktop builds load the bundled frontend from the
  // framework's own origin and call the backend cross-origin. Tauri 2 uses
  // `http://tauri.localhost` on Windows and `https://tauri.localhost` when
  // `useHttpsScheme` is enabled (it is not, in this repo), so both are allowed.
  origins.add('tauri://localhost');
  origins.add('http://tauri.localhost');
  origins.add('https://tauri.localhost');
  const extra = (process.env.SMOKE_MONKEY_ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const o of extra) origins.add(o);
  return origins;
}

/**
 * Serves index.html with the per-install auth token injected as a global, so
 * the bundled web client can authenticate its first API/WS call without a
 * separate round trip.
 *
 * The caller passes a token only for local UI requests (see isLocalUiRequest).
 * That matters: the catch-all below answers every path, so injecting
 * unconditionally would hand the bearer token to any unauthenticated visitor
 * of a publicly reachable deployment (the container/PaaS targets), defeating
 * the token entirely. Remote clients that legitimately need the token supply
 * it out-of-band (`?token=` / SMOKE_MONKEY_AUTH_TOKEN) — see SECURITY.md.
 */
function sendIndexWithToken(res: express.Response, indexPath: string, token: string | null): void {
  try {
    const html = readFileSync(indexPath, 'utf8');
    const inject = token
      ? `<script>window.__SMOKE_MONKEY_TOKEN__=${JSON.stringify(token)};</script>`
      : '';
    const withToken = html.includes('<head>') ? html.replace('<head>', `<head>${inject}`) : inject + html;
    res.set('Content-Type', 'text/html; charset=utf-8').send(withToken);
  } catch {
    res.sendFile(indexPath);
  }
}

export function startAppServer(opts: AppServerOptions = {}) {
  const port = opts.port ?? Number(process.env.PORT || 3333);
  const host = opts.host ?? process.env.HOST ?? DEFAULT_HOST;
  const app = express();
  const server = createServer(app);

  app.use(express.json());

  // CORS: reflect only an allowlisted origin instead of '*'. A page on any
  // other origin gets no CORS headers at all, so the browser blocks it from
  // reading the response (and, for most state-changing requests, from
  // sending it past preflight in the first place). This is a secondary
  // layer — the bearer-token check below is the one that also covers
  // non-browser callers (curl, another LAN host) once the server is opened
  // beyond loopback.
  const allowedOrigins = buildAllowedOrigins(port);
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.has(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Vary', 'Origin');
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', `Content-Type, Authorization, ${AUTH_TOKEN_HEADER}`);
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // 1. Initialize DB and WebSocket singletons
  const db = CoreDatabase.getInstance(opts.dbPath);
  const ws = CoreWsServer.getInstance();
  ws.init(server, createWsTokenVerifier(db));

  // Unauthenticated, cheap liveness probe for container/platform healthchecks
  // (Render, Fly — see render.yaml / fly.toml). Deliberately not `/api/space`,
  // which does real work and would otherwise also need a bearer token the
  // platform's prober doesn't send.
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Bootstrap route: hands the per-install bearer token to the local machine
  // only (see createAuthBootstrapHandler) — mounted before the auth
  // middleware below so it's reachable without a token.
  app.get('/api/auth/token', createAuthBootstrapHandler(db));

  // All other /api/* routes require the bearer token (see auth.server.ts and
  // SMOKE_MONKEY_DISABLE_AUTH / SMOKE_MONKEY_AUTH_TOKEN for operators who
  // front this with their own auth).
  //
  // The MCP OAuth callback is the one exemption: the provider's redirect back
  // to us carries only `code`/`state` (validated against pending state in the
  // handler), never a bearer token, so the gate would otherwise 401 before the
  // callback could run and OAuth connections could never complete.
  const authMiddleware = createAuthMiddleware(db);
  app.use('/api', (req, res, next) => {
    if (req.path.replace(/\/+$/, '') === '/mcp/oauth/callback') {
      next();
      return;
    }
    authMiddleware(req, res, next);
  });
  if (isAuthDisabled()) {
    console.warn(
      '[AppServer] SMOKE_MONKEY_DISABLE_AUTH is set — /api and /ws are unauthenticated. ' +
        'Only use this behind your own auth layer (see SECURITY.md).',
    );
  }

  // 2. Mount feature routers
  app.use('/api/space', createSpaceRouter());
  app.use('/api/explore', createExploreRouter());
  app.use('/api/agents', createAgentRouter());
  app.use('/api/mcp', createMcpRouter());
  app.use('/api/settings', createSettingsRouter());
  app.use('/api/skills', createSkillRouter());
  app.use('/api/personality', createPersonalityRouter());

  const runner = AgentRunner.getInstance();
  ws.setSnapshotProvider(() => [
    { type: 'delegations_active', data: runner.getActiveDelegations() },
    { type: 'active_runs_active', data: runner.getActiveRuns() },
  ]);

  // Compatibility shortcut
  app.get('/api/stock-mcps', (_req, res) => {
    res.redirect('/api/mcp/stock');
  });

  // 3. Serve Frontend static assets. `index: false` so express.static never
  // auto-serves index.html itself — both the root path and the SPA catch-all
  // below go through sendIndexWithToken() instead, so every local entry point
  // gets the auth token injected consistently. Remote requests get the page
  // without the token (see sendIndexWithToken).
  const staticDir = join(__dirname, '..', 'web', 'dist');
  if (existsSync(staticDir)) {
    const indexPath = join(staticDir, 'index.html');
    app.use(express.static(staticDir, { index: false }));
    app.use((req, res) => {
      const token =
        isAuthDisabled() || !isLocalUiRequest(req) ? null : resolveAuthToken(db);
      sendIndexWithToken(res, indexPath, token);
    });
  } else {
    app.use((_req, res) => {
      res.send(`
        <html>
          <body style="font-family:sans-serif; background:#0b0f19; color:#f8fafc; padding:40px; text-align:center;">
            <h2>Smoke Monkey Canvas Server Active</h2>
            <p>API endpoints mounted at <code>/api/space</code>, <code>/api/agents</code>, and <code>/api/mcp/stock</code>.</p>
            <p>Vite dev server is ready at <a href="http://localhost:5173" style="color:#38bdf8;">http://localhost:5173</a>.</p>
          </body>
        </html>
      `);
    });
  }

  // 4. Start Background Cron Scheduler
  const cron = AgentCronScheduler.getInstance();
  cron.start(10000);

  server.listen(port, host, () => {
    console.log(`\n======================================================`);
    console.log(`  🐒 Smoke Monkey Canvas Server running:`);
    console.log(`  ▶ http://${host}:${port}`);
    if (host !== DEFAULT_HOST && !isAuthDisabled()) {
      console.log(`  ⚠ Bound to ${host}, not just loopback — reachable beyond this machine.`);
      console.log(`    /api and /ws still require the bearer token, and the web UI only`);
      console.log(`    receives it on local requests. Remote clients must supply it`);
      console.log(`    out-of-band (?token= or SMOKE_MONKEY_AUTH_TOKEN). See SECURITY.md.`);
    }
    console.log(`======================================================\n`);
  });

  return { app, server, db, ws, cron };
}

// Auto-start when executed directly
if (process.argv[1] && process.argv[1].endsWith('app.server.ts')) {
  startAppServer();
}
