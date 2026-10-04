import { Router, type Request, type Response } from 'express';
import fs from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
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

  return router;
}
