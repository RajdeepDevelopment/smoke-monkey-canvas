/**
 * Per-install bearer-token authentication for /api and /ws.
 *
 * Context: the server historically had no authentication at all, plus a
 * wildcard CORS policy and a default bind to every network interface. Any web
 * page the user visited could reach the unauthenticated file write / OS-launch
 * routes, and any device on the LAN could reach the API directly (see #2).
 *
 * This module adds a minimal, dependency-free auth layer appropriate for a
 * single-user local tool:
 *   - A random token is generated on first boot and persisted (see
 *     CoreDatabase.getOrCreateAuthToken), or supplied explicitly via
 *     SMOKE_MONKEY_AUTH_TOKEN for reverse-proxied/remote deployments.
 *   - All /api/* routes (except the bootstrap endpoint below and the MCP OAuth
 *     callback) and the /ws upgrade require the token. The bundled web client
 *     sends it in `X-Smoke-Monkey-Token`, deliberately not `Authorization`, so
 *     a reverse proxy in front of the server can use `Authorization` for its
 *     own scheme (e.g. Caddy basic_auth) without the two fighting over the
 *     same header. `Authorization: Bearer <token>` and `?token=` are still
 *     accepted for CLI/API clients; the browser sends the WebSocket token in
 *     the `Sec-WebSocket-Protocol` subprotocol instead, because an upgrade
 *     request cannot carry custom headers and a query param would be written
 *     to proxy access logs.
 *   - The bootstrap endpoint that hands out the token only answers requests
 *     that arrive from the local machine's own UI, regardless of what host the
 *     server is bound to. This lets the local web UI/CLI/desktop fetch the
 *     token once without any prior credential, while a LAN or internet peer
 *     (even if the operator explicitly opened the server to 0.0.0.0) cannot
 *     use it to self-issue a token. Requests that carry proxy forwarding
 *     headers are refused even when the socket peer is loopback (a same-host
 *     proxy connects from 127.0.0.1 on behalf of every visitor); operators can
 *     opt back in with SMOKE_MONKEY_ASSUME_LOCAL=1.
 *
 * Deliberately out of scope: this is not a multi-user login system. An
 * operator who exposes the server on the public internet (the VPS/Render/
 * Fly targets under deploy/) must put a real auth layer in front of it or
 * distribute the token out-of-band. The token is never embedded in pages
 * served to remote browsers (see sendIndexWithToken in app.server.ts), but it
 * still is not a substitute for a real login. See SECURITY.md.
 */
import type { Request, Response, NextFunction } from 'express';
import type { IncomingMessage } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import type { CoreDatabase } from './database.db.js';

const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

/**
 * Headers that indicate the request passed through a reverse proxy. Their
 * presence disqualifies the request from local-only token delivery unless the
 * operator opted in (see isLocalUiRequest).
 */
const PROXY_HEADERS = [
  'forwarded',
  'via',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-real-ip',
] as const;

/**
 * Header the bundled web client uses to send the bearer token. Kept separate
 * from `Authorization` so proxy-level auth (Caddy basic_auth, etc.) can use
 * that header without breaking API calls.
 */
export const AUTH_TOKEN_HEADER = 'x-smoke-monkey-token';

/**
 * WebSocket subprotocol carrying the token (browsers cannot set headers on the
 * upgrade request). Value: `smoke-monkey-token.<base64url(token)>` — a query
 * param would end up in proxy access logs. See getWsProtocols() in
 * web/src/config/desktop.bridge.ts.
 */
export const WS_TOKEN_PROTOCOL_PREFIX = 'smoke-monkey-token.';

export function isAuthDisabled(): boolean {
  const v = process.env.SMOKE_MONKEY_DISABLE_AUTH;
  return v === '1' || v === 'true';
}

export function resolveAuthToken(db: CoreDatabase): string {
  const envToken = process.env.SMOKE_MONKEY_AUTH_TOKEN;
  if (envToken && envToken.trim()) return envToken.trim();
  return db.getOrCreateAuthToken();
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function headerValue(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | null {
  const value = headers[name];
  const first = Array.isArray(value) ? value[0] : value;
  return first && first.trim() ? first.trim() : null;
}

function decodeBase64Url(value: string): string | null {
  if (!value) return null;
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  try {
    const decoded = Buffer.from(padded, 'base64').toString('utf8');
    return decoded || null;
  } catch {
    return null;
  }
}

function extractToken(req: Request | IncomingMessage): string | null {
  const headers = (req.headers || {}) as Record<string, string | string[] | undefined>;
  const custom = headerValue(headers, AUTH_TOKEN_HEADER);
  if (custom) return custom;

  const protocols = headerValue(headers, 'sec-websocket-protocol');
  if (protocols) {
    for (const raw of protocols.split(',')) {
      const value = raw.trim();
      if (!value.startsWith(WS_TOKEN_PROTOCOL_PREFIX)) continue;
      const decoded = decodeBase64Url(value.slice(WS_TOKEN_PROTOCOL_PREFIX.length));
      if (decoded) return decoded;
    }
  }

  const authHeader = headerValue(headers, 'authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }
  try {
    const url = new URL(req.url || '', 'http://internal');
    const queryToken = url.searchParams.get('token');
    if (queryToken) return queryToken;
  } catch {
    // malformed URL — fall through to null
  }
  return null;
}

/**
 * Hostname from a Host header, handling `[::1]:3333` as well as `host:port`.
 */
function hostnameFromHostHeader(hostHeader: string): string | null {
  const value = hostHeader.trim().toLowerCase();
  if (!value) return null;
  if (value.startsWith('[')) {
    const end = value.indexOf(']');
    return end === -1 ? null : value.slice(1, end);
  }
  const colon = value.lastIndexOf(':');
  return colon === -1 ? value : value.slice(0, colon);
}

/**
 * Whether the request's Host header names a host we're willing to hand the
 * token to. Loopback names always qualify; extra hostnames come from
 * `SMOKE_MONKEY_ALLOWED_ORIGINS` (the same list CORS trusts).
 *
 * Without this check, a DNS-rebinding page could resolve its own hostname to
 * 127.0.0.1, request the page same-origin, and read the injected token even
 * though the TCP peer is loopback.
 */
function hasTrustedHost(req: Request | IncomingMessage): boolean {
  const hostHeader = (req.headers?.host as string | undefined) || '';
  const hostname = hostnameFromHostHeader(hostHeader);
  if (!hostname) return false;
  if (LOOPBACK_HOSTNAMES.has(hostname)) return true;
  for (const raw of (process.env.SMOKE_MONKEY_ALLOWED_ORIGINS || '').split(',')) {
    const value = raw.trim();
    if (!value) continue;
    try {
      if (new URL(value).hostname.toLowerCase() === hostname) return true;
    } catch {
      // ignore malformed entries
    }
  }
  return false;
}

/**
 * Whether this request came from the machine's own local UI.
 *
 * Normally that means a loopback peer with a trusted Host header. Two escape
 * hatches widen this, both documented in SECURITY.md:
 *
 *   - `SMOKE_MONKEY_ASSUME_LOCAL=1` treats any peer as local. It exists for
 *     container deployments that publish the port on the host's loopback only
 *     (Docker's userland proxy makes the browser's peer the bridge gateway,
 *     not 127.0.0.1). Only enable it when the published port is itself bound
 *     to loopback — see docker-compose.yml. Never enable it on a publicly
 *     reachable server.
 *   - Requests carrying proxy headers are refused even when the peer is
 *     loopback: a same-host reverse proxy (`proxy_pass http://127.0.0.1:3333`)
 *     connects over loopback for every visitor it forwards, so the peer
 *     address alone cannot distinguish them. Operators who front the app with
 *     a proxy and still want the convenience bootstrap must set
 *     SMOKE_MONKEY_ASSUME_LOCAL=1 explicitly.
 */
export function isLocalUiRequest(req: Request | IncomingMessage): boolean {
  if (!hasTrustedHost(req)) return false;
  const v = process.env.SMOKE_MONKEY_ASSUME_LOCAL;
  if (v === '1' || v === 'true') return true;
  const headers = (req.headers || {}) as Record<string, string | string[] | undefined>;
  if (PROXY_HEADERS.some((name) => headerValue(headers, name))) return false;
  const addr = req.socket?.remoteAddress || '';
  return LOOPBACK_ADDRESSES.has(addr);
}

/**
 * Express middleware enforcing the bearer token on every route it's mounted
 * on. Mount this on `/api` after excluding the bootstrap token route and the
 * MCP OAuth callback.
 */
export function createAuthMiddleware(db: CoreDatabase) {
  if (isAuthDisabled()) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }
  const token = resolveAuthToken(db);
  return (req: Request, res: Response, next: NextFunction) => {
    const provided = extractToken(req);
    if (provided && constantTimeEquals(provided, token)) {
      next();
      return;
    }
    res.status(401).json({ error: 'Unauthorized. Missing or invalid bearer token.' });
  };
}

/**
 * Loopback-gated bootstrap route: GET /api/auth/token.
 * Mounted before createAuthMiddleware so it's reachable without a token, but
 * only from the machine the server itself runs on.
 */
export function createAuthBootstrapHandler(db: CoreDatabase) {
  return (req: Request, res: Response) => {
    if (isAuthDisabled()) {
      res.json({ token: null, disabled: true });
      return;
    }
    if (!isLocalUiRequest(req)) {
      res.status(403).json({ error: 'Token bootstrap is only available from the local machine.' });
      return;
    }
    res.json({ token: resolveAuthToken(db) });
  };
}

/**
 * Validator used by the WebSocket upgrade (verifyClient) to apply the same
 * rule set as the HTTP middleware.
 */
export function createWsTokenVerifier(db: CoreDatabase): (req: IncomingMessage) => boolean {
  if (isAuthDisabled()) return () => true;
  const token = resolveAuthToken(db);
  return (req: IncomingMessage) => {
    const provided = extractToken(req);
    return !!provided && constantTimeEquals(provided, token);
  };
}
