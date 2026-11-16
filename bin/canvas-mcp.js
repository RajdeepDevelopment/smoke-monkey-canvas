#!/usr/bin/env node

/**
 * 🐒 Smoke Monkey Canvas MCP Server Launcher
 *
 * Runs the Canvas Model Context Protocol (MCP) server over standard input/output.
 * Compatible with Claude Code, Cursor, or any standard MCP client:
 *
 *   npx @smoke-monkey/canvas mcp
 *   node bin/canvas-mcp.js [--space-id <id>]
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

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

const serverEntry = join(rootDir, 'server', 'features', 'mcp-server', 'canvas-mcp.server.ts');

const child = spawn(process.execPath, [tsxBin, serverEntry, ...process.argv.slice(2)], {
  stdio: ['inherit', 'inherit', 'inherit'],
  cwd: rootDir,
  env: {
    ...process.env,
  },
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

process.on('SIGINT', () => {
  if (!child.killed) child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  if (!child.killed) child.kill('SIGTERM');
});
