import { STOCK_MCPS } from './mcp.stock.js';
import { CoreDatabase } from '../core/database.db.js';
import { getAccessToken } from './mcp.oauth.js';

// ── MCP.ai second-layer account login ──────────────────────────────────────
// MCP.ai hosts many connectors behind one OAuth endpoint. Connecting through
// OAuth only proves the user owns an MCP.ai account; the underlying provider
// (Telegram, Linear, Stripe, …) still has to be linked.
//
// MCP.ai answers that question through its `connect` tool:
//   { authenticated: true, pending: [] }
// or
//   { authenticated: false, pending: [...], connect_url: "https://..." }
//
// We call it after the platform OAuth flow and cache the answer so the UI and
// readiness checks stop treating a platform token as a finished connection.

export type McpAiProviderState =
  | 'connected'
  | 'needs-login'
  | 'needs-platform-auth'
  | 'unknown'
  | 'error';

export interface McpAiProviderStatus {
  state: McpAiProviderState;
  authenticated: boolean;
  connectUrl?: string;
  pending: unknown[];
  detail?: string;
  checkedAt?: number;
}

const STATUS_PREFIX = 'MCP_AI_PROVIDER_STATUS__';
const TOOL_TIMEOUT_MS = 25_000;

// /status walks every stock server (2,400+). Reading one SQLite row per MCP.ai
// entry made that endpoint noticeably slower, so the provider cache is loaded
// once per process and updated in memory alongside the DB.
let providerCache: Map<string, McpAiProviderStatus> | null = null;

function db() {
  return CoreDatabase.getInstance();
}

function loadProviderCache(): Map<string, McpAiProviderStatus> {
  if (providerCache) return providerCache;
  providerCache = new Map();
  try {
    const settings = db().getAllSettings();
    for (const [key, raw] of Object.entries(settings)) {
      if (!key.startsWith(STATUS_PREFIX) || !raw) continue;
      try {
        const parsed = JSON.parse(raw) as McpAiProviderStatus;
        if (parsed && typeof parsed.state === 'string') {
          providerCache.set(key.slice(STATUS_PREFIX.length), parsed);
        }
      } catch {
        /* ignore a corrupt cache row */
      }
    }
  } catch {
    /* leave the map empty; the next check will populate it */
  }
  return providerCache;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function parseSseJson(text: string): unknown {
  const payloads = text
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .filter(Boolean);
  for (let i = payloads.length - 1; i >= 0; i--) {
    try {
      return JSON.parse(payloads[i]);
    } catch {
      /* try the next event */
    }
  }
  try {
    return JSON.parse(text.trim());
  } catch {
    return undefined;
  }
}

function findKey(value: unknown, keyMatcher: (key: string) => boolean): unknown {
  if (!isRecord(value)) return undefined;
  for (const [key, val] of Object.entries(value)) {
    if (keyMatcher(key) && val !== undefined && val !== null) return val;
  }
  for (const val of Object.values(value)) {
    const found = findKey(val, keyMatcher);
    if (found !== undefined) return found;
  }
  return undefined;
}

function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const item of value) collectStrings(item, out);
  else if (isRecord(value)) for (const item of Object.values(value)) collectStrings(item, out);
  return out;
}

function textPayload(result: unknown): unknown {
  if (!isRecord(result)) return undefined;
  if (isRecord(result.structuredContent)) return result.structuredContent;

  const fragments: string[] = [];
  const content = result.content;
  if (Array.isArray(content)) {
    for (const entry of content) {
      if (isRecord(entry) && typeof entry.text === 'string') fragments.push(entry.text);
    }
  }
  const joined = fragments.join('\n').trim();
  if (!joined) return undefined;
  try {
    return JSON.parse(joined);
  } catch {
    const start = joined.indexOf('{');
    const end = joined.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(joined.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
  }
  return { text: joined };
}

class PlatformAuthRequired extends Error {}

async function callMcpAiTool(url: string, token: string, name: string): Promise<unknown> {
  const baseHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    Authorization: `Bearer ${token}`,
  };
  const signal = AbortSignal.timeout(TOOL_TIMEOUT_MS);

  const initialize = await fetch(url, {
    method: 'POST',
    headers: baseHeaders,
    signal,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'smoke-monkey-canvas', version: '1.0.0' },
      },
    }),
  });

  if (initialize.status === 401 || initialize.status === 403) {
    throw new PlatformAuthRequired('MCP.ai platform authorization is missing or expired.');
  }
  if (!initialize.ok) {
    throw new Error(`MCP.ai initialize failed with HTTP ${initialize.status}.`);
  }
  await initialize.text();

  // MCP.ai is stateless for this catalog endpoint: sending the session header
  // back to tools/call produces "Session not found". The initialize response is
  // enough to establish the protocol version.
  const call = await fetch(url, {
    method: 'POST',
    headers: baseHeaders,
    signal,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name, arguments: {} },
    }),
  });

  if (call.status === 401 || call.status === 403) {
    throw new PlatformAuthRequired('MCP.ai platform authorization is missing or expired.');
  }
  if (!call.ok) {
    throw new Error(`MCP.ai ${name} call failed with HTTP ${call.status}.`);
  }

  const parsed = parseSseJson(await call.text());
  if (!isRecord(parsed)) throw new Error('MCP.ai returned an unreadable response.');
  if (isRecord(parsed.error)) {
    const message = typeof parsed.error.message === 'string'
      ? parsed.error.message
      : JSON.stringify(parsed.error);
    if (/authentication|unauthorized|login/i.test(message)) {
      throw new PlatformAuthRequired(message);
    }
    throw new Error(message);
  }

  const result = parsed.result;
  if (isRecord(result) && result.isError === true) {
    const strings = collectStrings(result);
    const message = strings.find((s) => /authentication|login|connect/i.test(s)) ?? strings[0];
    throw new Error(message || `MCP.ai ${name} reported an error.`);
  }
  return result;
}

function resolveToken(mcpName: string, url: string): Promise<string | null> {
  return getAccessToken(mcpName, url).catch(() => null);
}

function storedToken(mcpName: string): string | null {
  const record = db();
  for (const key of [`MCP_AI_TOKEN__${mcpName}`, 'MCPAI_API_KEY', 'MCP_AI_API_KEY']) {
    const value = record.getSetting(key);
    if (value) return value;
  }
  return null;
}

export function readCachedProviderStatus(mcpName: string): McpAiProviderStatus | undefined {
  return loadProviderCache().get(mcpName);
}

function cacheProviderStatus(mcpName: string, status: McpAiProviderStatus): McpAiProviderStatus {
  const full = { ...status, checkedAt: status.checkedAt ?? Date.now() };
  loadProviderCache().set(mcpName, full);
  try {
    db().setSetting(`${STATUS_PREFIX}${mcpName}`, JSON.stringify(full));
  } catch {
    /* best-effort cache */
  }
  return full;
}

export function clearCachedProviderStatus(mcpName: string): void {
  loadProviderCache().delete(mcpName);
  try {
    db().setSetting(`${STATUS_PREFIX}${mcpName}`, '');
  } catch {
    /* best-effort */
  }
}

export function isMcpAiServer(mcpName: string): boolean {
  return !!STOCK_MCPS.find((s) => s.name === mcpName && s.isMcpAi && s.url);
}

/**
 * Ask MCP.ai whether the underlying provider account is linked.
 * Never throws: returns an `error` status instead so the UI can show it.
 */
export async function fetchMcpAiProviderStatus(mcpName: string): Promise<McpAiProviderStatus> {
  const stock = STOCK_MCPS.find((s) => s.name === mcpName);
  if (!stock?.isMcpAi || !stock.url) {
    return { state: 'unknown', authenticated: false, pending: [], detail: 'Not an MCP.ai server.' };
  }

  const token = (await resolveToken(mcpName, stock.url)) || storedToken(mcpName);
  if (!token) {
    return cacheProviderStatus(mcpName, {
      state: 'needs-platform-auth',
      authenticated: false,
      pending: [],
      detail: `Connect your MCP.ai account before linking ${stock.label}.`,
    });
  }

  try {
    const result = await callMcpAiTool(stock.url, token, 'connect');
    const payload = textPayload(result);
    const authenticatedValue = findKey(payload, (key) => key.toLowerCase() === 'authenticated');
    const connectedValue = findKey(payload, (key) => key.toLowerCase() === 'connected');
    const authenticated =
      authenticatedValue === true || connectedValue === true;

    const connectValue = findKey(
      payload,
      (key) => /^connect_?url$/i.test(key) || /^auth(?:orization)?_?url$/i.test(key)
    );
    const connectUrl = typeof connectValue === 'string' && /^https?:\/\//i.test(connectValue)
      ? connectValue
      : undefined;

    const pendingValue = findKey(payload, (key) => /^pending$/i.test(key));
    const pending = Array.isArray(pendingValue)
      ? pendingValue
      : pendingValue
      ? [pendingValue]
      : [];

    if (authenticated && pending.length === 0) {
      return cacheProviderStatus(mcpName, {
        state: 'connected',
        authenticated: true,
        pending: [],
      });
    }

    const detail = connectUrl
      ? `${stock.label} is connected to MCP.ai, but your ${stock.label} account still needs to log in.`
      : `${stock.label} is connected to MCP.ai, but the provider account is not linked yet.`;

    return cacheProviderStatus(mcpName, {
      state: 'needs-login',
      authenticated: false,
      connectUrl,
      pending,
      detail,
    });
  } catch (err) {
    if (err instanceof PlatformAuthRequired) {
      return cacheProviderStatus(mcpName, {
        state: 'needs-platform-auth',
        authenticated: false,
        pending: [],
        detail: err.message,
      });
    }
    return cacheProviderStatus(mcpName, {
      state: 'error',
      authenticated: false,
      pending: [],
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}
