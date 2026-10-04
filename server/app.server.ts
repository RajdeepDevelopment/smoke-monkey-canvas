import express from 'express';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { CoreDatabase } from './features/core/database.db.js';
import { CoreWsServer } from './features/core/ws.server.js';
import { createSpaceRouter } from './features/space/space.server.js';
import { createAgentRouter } from './features/agent/agent.server.js';
import { createPersonalityRouter } from './features/agent/agent.presets.server.js';
import { AgentCronScheduler } from './features/agent/agent.cron.js';
import { createMcpRouter } from './features/mcp/mcp.server.js';

import { createSettingsRouter } from './features/settings/settings.server.js';
import { createSkillRouter } from './features/skill/skill.server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

export interface AppServerOptions {
  port?: number;
  dbPath?: string;
}

export function startAppServer(opts: AppServerOptions = {}) {
  const port = opts.port ?? Number(process.env.PORT || 3333);
  const app = express();
  const server = createServer(app);

  app.use(express.json());

  // CORS for local development
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // 1. Initialize DB and WebSocket singletons
  const db = CoreDatabase.getInstance(opts.dbPath);
  const ws = CoreWsServer.getInstance();
  ws.init(server);

  // 2. Mount feature routers
  app.use('/api/space', createSpaceRouter());
  app.use('/api/agents', createAgentRouter());
  app.use('/api/mcp', createMcpRouter());
  app.use('/api/settings', createSettingsRouter());
  app.use('/api/skills', createSkillRouter());
  app.use('/api/personality', createPersonalityRouter());

  // Compatibility shortcut
  app.get('/api/stock-mcps', (_req, res) => {
    res.redirect('/api/mcp/stock');
  });

  // 3. Serve Frontend static assets
  const staticDir = join(__dirname, '..', 'web', 'dist');
  if (existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.use((_req, res) => {
      res.sendFile(join(staticDir, 'index.html'));
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

  server.listen(port, () => {
    console.log(`\n======================================================`);
    console.log(`  🐒 Smoke Monkey Canvas Server running:`);
    console.log(`  ▶ http://localhost:${port}`);
    console.log(`======================================================\n`);
  });

  return { app, server, db, ws, cron };
}

// Auto-start when executed directly
if (process.argv[1] && process.argv[1].endsWith('app.server.ts')) {
  startAppServer();
}
