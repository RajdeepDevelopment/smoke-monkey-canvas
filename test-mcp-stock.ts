import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { STOCK_MCPS } from './server/features/mcp/mcp.stock.js';
import { CoreDatabase } from './server/features/core/database.db.js';
import { computeReadiness, recordProbe, clearProbe } from './server/features/mcp/mcp.readiness.js';

// Packages that look like MCP servers but are libraries / squatted placeholders
// with no executable. These previously made stock entries advertise "Ready"
// while `npx` failed with "could not determine executable to run".
const PLACEHOLDER_PACKAGES = [
  'mcp-server-git', // 0.0.1-security placeholder
  'cloudflare-mcp', // 0.0.0, no bin
  'aws-mcp-server', // 1.0.0, no bin
  'curl-mcp', // 1.0.0, no bin
  'zendesk-mcp-server', // no bin
  'hubspot-mcp-server', // no bin
  'youtube-mcp-server', // 1.0.0, no bin
  'convexity-mcp', // no bin
  '@modelcontextprotocol/server-git', // 404
];

function packageOf(m: (typeof STOCK_MCPS)[number]): string | null {
  if (m.url || m.command !== 'npx') return null;
  const args: string[] = m.args || [];
  for (const a of args) {
    if (a === '-y' || a === '--yes' || a.startsWith('-')) continue;
    return a.replace(/@(latest|next|[\d.]+.*)$/, '');
  }
  return null;
}

async function npmBin(pkg: string): Promise<{ exists: boolean; bin: boolean; latest: string }> {
  const r = await fetch(`https://registry.npmjs.org/${pkg}`, {
    headers: { Accept: 'application/vnd.npm.install-v1+json' },
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) return { exists: false, bin: false, latest: '' };
  const j = (await r.json()) as { 'dist-tags'?: Record<string, string>; versions?: Record<string, { bin?: unknown }> };
  const latest = j['dist-tags']?.latest || Object.keys(j.versions || {}).pop() || '';
  const v = latest ? j.versions?.[latest] : undefined;
  const bin = !!(v && v.bin && (typeof v.bin === 'string' || Object.keys(v.bin as object).length));
  return { exists: true, bin, latest };
}

async function main() {
  const checks: Record<string, boolean> = {};

  // ── 1. Structural integrity ────────────────────────────────────────────────
  const names = STOCK_MCPS.map((m) => m.name);
  checks['stock names are unique'] = new Set(names).size === names.length;
  checks['every entry has label/category/description'] = STOCK_MCPS.every(
    (m) => m.label && m.category && m.description,
  );
  checks['remote URLs use http(s)'] = STOCK_MCPS.every((m) => !m.url || /^https?:\/\//.test(m.url));
  checks['oauthProvider only on oauth entries'] = STOCK_MCPS.every(
    (m) => !m.oauthProvider || m.authType === 'oauth',
  );
  // Only remote (url-backed) servers can run the browser OAuth flow; every entry
  // labelled oauth must therefore point at a remote endpoint. Stdio token
  // servers are labelled api_key instead.
  checks['oauth entries are all remote (url-backed)'] = STOCK_MCPS.every(
    (m) => !(m.authType === 'oauth') || !!m.url,
  );
  checks['no placeholder packages remain'] = STOCK_MCPS.every(
    (m) => !PLACEHOLDER_PACKAGES.includes(packageOf(m) || ''),
  );

  const byName = new Map(STOCK_MCPS.map((m) => [m.name, m]));
  checks['cloudflare points at a runnable stdio package'] =
    (byName.get('cloudflare-mcp')?.args || []).join(' ') === '-y cloudflare-blade-mcp';
  checks['convex uses the convex CLI'] =
    (byName.get('convex')?.args || []).join(' ') === '-y convex@latest mcp start';
  checks['arxiv declares no credentials'] =
    (byName.get('arxiv')?.envKeys.length ?? -1) === 0 && byName.get('arxiv')?.authType === 'none';
  checks['scholar declares no credentials'] =
    (byName.get('scholar')?.envKeys.length ?? -1) === 0 && byName.get('scholar')?.authType === 'none';
  checks['curl-mcp (unrunnable) was removed'] = !byName.has('curl-mcp');
  checks['zendesk declares email + token + subdomain'] =
    JSON.stringify(byName.get('zendesk-mcp-server')?.envKeys) ===
    JSON.stringify(['ZENDESK_SUBDOMAIN', 'ZENDESK_EMAIL', 'ZENDESK_API_TOKEN']);

  // ── 2. Readiness behaviour (the false-"Ready" regression) ──────────────────
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-stock-'));
  CoreDatabase.getInstance(path.join(root, 'canvas.db')); // readiness reads this singleton

  const clean = (keys: string[]) => keys.forEach((k) => CoreDatabase.getInstance().setSetting(k, ''));
  clean(['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'POSTGRES_URL']);

  // A remote OAuth server with no env keys must NOT be "ready" without a token.
  const cfApi = computeReadiness('cloudflare-api');
  checks['remote OAuth w/o token is not configured'] = cfApi.configured === false;
  checks['remote OAuth w/o token is needs-oauth'] = cfApi.state === 'needs-oauth';

  // A stdio server that needs a key is not ready until the key is present.
  const pg = computeReadiness('postgres-mcp-server');
  checks['key-required server w/o key is needs-key'] = pg.configured === false && pg.state === 'needs-key';
  CoreDatabase.getInstance().setSetting('POSTGRES_URL', 'postgres://localhost/db');
  const pg2 = computeReadiness('postgres-mcp-server');
  checks['key-required server w/ key is configured'] = pg2.configured === true;
  checks['configured-but-unprobed is unverified'] = pg2.state === 'unverified';

  // A no-auth server is runnable but honest: "unverified" until probed.
  const fs0 = computeReadiness('filesystem-mcp');
  checks['no-auth server is configured (runnable)'] = fs0.configured === true;
  checks['no-auth server is unverified before probe'] = fs0.state === 'unverified';
  recordProbe('filesystem-mcp', { ok: true, stage: 'tools', detail: '', toolCount: 3, latencyMs: 12 });
  checks['probe success promotes to ready'] = computeReadiness('filesystem-mcp').state === 'ready';

  // A failed probe on an otherwise-configured server is "failed", still runnable.
  CoreDatabase.getInstance().setSetting('CLOUDFLARE_API_TOKEN', 'token');
  CoreDatabase.getInstance().setSetting('CLOUDFLARE_ACCOUNT_ID', 'account');
  recordProbe('cloudflare-mcp', { ok: false, stage: 'exit', detail: 'boom', toolCount: 0, latencyMs: 5 });
  const cfMcp = computeReadiness('cloudflare-mcp');
  checks['configured server with failed probe is failed'] = cfMcp.state === 'failed';
  checks['failed probe does not block running'] = cfMcp.configured === true;

  // Custom (non-stock) servers are never blocked, but are only "ready" once probed.
  const custom = computeReadiness('my-custom-server');
  checks['custom server is runnable'] = custom.configured === true;
  checks['custom server is not falsely ready'] = custom.state === 'custom';

  clearProbe('filesystem-mcp');
  clearProbe('cloudflare-mcp');

  // ── 3. Optional live npm validation (opt-in: MCP_STOCK_NET=1) ───────────────
  if (process.env.MCP_STOCK_NET === '1') {
    const targets = [...new Set(STOCK_MCPS.map(packageOf).filter((p): p is string => !!p))];
    let broken = 0;
    const CONC = 12;
    for (let i = 0; i < targets.length; i += CONC) {
      await Promise.all(
        targets.slice(i, i + CONC).map(async (pkg) => {
          const r = await npmBin(pkg);
          if (!r.exists || !r.bin) {
            broken++;
            console.log(`  BROKEN  ${pkg} (exists=${r.exists}, bin=${r.bin})`);
          }
        }),
      );
    }
    checks['all npx stock packages are runnable'] = broken === 0;
  } else {
    console.log('(skipping live npm validation; run with MCP_STOCK_NET=1 to enable)');
  }

  let failed = 0;
  for (const [label, ok] of Object.entries(checks)) {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
    if (!ok) failed++;
  }

  fs.rmSync(root, { recursive: true, force: true });

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log(`\nAll ${Object.keys(checks).length} MCP stock/readiness checks passed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
