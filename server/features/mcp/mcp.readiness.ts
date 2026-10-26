import { STOCK_MCPS } from './mcp.stock.js';
import { CoreDatabase } from '../core/database.db.js';
import { authStatus, type StoredAuth } from './mcp.oauth.js';
import { readCachedProviderStatus, type McpAiProviderStatus } from './mcp.ai.js';

// ── MCP readiness ───────────────────────────────────────────────────────────
// Two different questions were previously collapsed into one boolean, which is
// why a server could show "Ready" while it could not actually run:
//
//   1. `configured`  – do we hold the credentials the server needs? (env keys
//                      present, or a live OAuth token for remote servers)
//   2. `state`       – is it *verified* to actually complete a handshake?
//
// `configured` gates whether a run is allowed to attach the server. `state`
// drives the badge, and only a real probe (`/api/mcp/test`) may call a server
// "verified". Absent a probe the honest label is "unverified", never "ready".

export interface ProbeStatus {
  ok: boolean;
  stage: string;
  detail: string;
  toolCount: number;
  latencyMs: number;
  checkedAt: number;
}

export type McpReadinessState =
  | 'ready' // probed successfully
  | 'failed' // probed and it failed
  | 'unverified' // credentials fine (or none required) but never probed
  | 'needs-key' // a required env key is missing
  | 'needs-oauth' // a remote OAuth server with no live token
  | 'needs-provider-auth' // MCP.ai platform is connected, provider login is pending
  | 'custom'; // not a stock entry; cannot be reasoned about server-side

export interface McpReadiness {
  mcpName: string;
  label: string;
  stock: boolean;
  /** Credentials satisfied (or none required) — gates running the agent. */
  configured: boolean;
  missingKeys: string[];
  oauth: StoredAuth;
  /** MCP.ai only: whether the underlying provider account is linked. */
  provider?: McpAiProviderStatus;
  state: McpReadinessState;
  probe?: ProbeStatus;
}

const PROBE_PREFIX = 'MCP_PROBE_STATUS__';

function db(): CoreDatabase {
  return CoreDatabase.getInstance();
}

export function probeKey(name: string): string {
  return `${PROBE_PREFIX}${name}`;
}

function safeAuthStatus(name: string): StoredAuth {
  try {
    return authStatus(name);
  } catch {
    return { connected: false };
  }
}

/** Persist the most recent real-handshake result for a server. */
export function recordProbe(
  name: string,
  probe: Omit<ProbeStatus, 'checkedAt'> & { checkedAt?: number }
): ProbeStatus {
  const full: ProbeStatus = { ...probe, checkedAt: probe.checkedAt ?? Date.now() };
  try {
    db().setSetting(probeKey(name), JSON.stringify(full));
  } catch {
    /* best-effort cache */
  }
  return full;
}

export function clearProbe(name: string): void {
  try {
    db().setSetting(probeKey(name), '');
  } catch {
    /* best-effort */
  }
}

export function getProbe(name: string): ProbeStatus | undefined {
  const key = probeKey(name);
  const raw = db().getSetting(key) || process.env[key];
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as ProbeStatus;
    return typeof parsed?.ok === 'boolean' ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function envSatisfies(key: string, cfgEnv: Record<string, string>): boolean {
  if (cfgEnv[key]) return true;
  if (process.env[key]) return true;
  return !!db().getSetting(key);
}

/**
 * Compute readiness for a single MCP server. `cfgEnv` is the per-agent env
 * stored in the attachment's config (attached keys live there, not globally).
 */
export function computeReadiness(
  mcpName: string,
  cfgEnv: Record<string, string> = {}
): McpReadiness {
  const stock = STOCK_MCPS.find((s) => s.name === mcpName);
  const oauth = safeAuthStatus(mcpName);
  const probe = getProbe(mcpName);

  if (!stock) {
    return {
      mcpName,
      label: mcpName,
      stock: false,
      // A custom server cannot be reasoned about, so it is never blocked — but
      // it is only labelled "ready" once a probe has actually succeeded.
      configured: true,
      missingKeys: [],
      oauth,
      state: probe ? (probe.ok ? 'ready' : 'failed') : 'custom',
      probe,
    };
  }

  const required = stock.envKeys ?? [];
  const missingKeys = required.filter((k) => !envSatisfies(k, cfgEnv));
  const keysSatisfied = missingKeys.length === 0;
  const isRemoteOAuth = stock.authType === 'oauth' && !!stock.url;
  const provider = stock.isMcpAi ? readCachedProviderStatus(mcpName) : undefined;

  // Remote OAuth servers authenticate with a token, not env keys. A manual
  // token fallback (envKeys) is also accepted when present.
  const platformConfigured = isRemoteOAuth
    ? oauth.connected || (required.length > 0 && keysSatisfied)
    : keysSatisfied;

  // MCP.ai's OAuth token only proves the platform account. If its `connect`
  // tool told us the provider login is still pending, the server is not usable
  // yet even though a token exists.
  const providerNeedsLogin = provider?.state === 'needs-login';
  const providerBlocks = providerNeedsLogin || provider?.state === 'needs-platform-auth';
  const configured = platformConfigured && !providerBlocks;

  let state: McpReadinessState;
  if (!configured) {
    if (providerNeedsLogin) state = 'needs-provider-auth';
    else state = isRemoteOAuth ? 'needs-oauth' : 'needs-key';
  } else if (probe && !probe.ok) {
    state = 'failed';
  } else if (probe && probe.ok) {
    state = 'ready';
  } else {
    state = 'unverified';
  }

  return {
    mcpName,
    label: stock.label,
    stock: true,
    configured,
    missingKeys,
    oauth,
    provider,
    state,
    probe,
  };
}

/** Readiness for every stock server (global credentials only, no per-agent env). */
export function getAllReadiness(): McpReadiness[] {
  return STOCK_MCPS.map((s) => computeReadiness(s.name));
}

/** Readiness keyed by server name — convenient for the UI status map. */
export function getReadinessMap(): Record<string, McpReadiness> {
  const out: Record<string, McpReadiness> = {};
  for (const r of getAllReadiness()) out[r.mcpName] = r;
  return out;
}
