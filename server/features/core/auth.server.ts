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
 *   - All /api/* routes (except the bootstrap endpoint below) and the /ws
 *     upgrade require `Authorization: Bearer <token>` (or a `?token=` query
 *     param, since the browser WebSocket API cannot set headers).
 *   - The bootstrap endpoint that hands out the token only answers requests
 *     whose TCP peer is the loopback interface, regardless of what host the
 *     server is bound to. This lets the local web UI/CLI/desktop fetch the
 *     token once without any prior credential, while a LAN or internet peer
 *     (even if the operator explicitly opened the server to 0.0.0.0) cannot
 *     use it to self-issue a token.
 *
 * Deliberately out of scope: this is not a multi-user login system. An
 * operator who exposes the server on the public internet (the VPS/Render/
 * Fly targets under deploy/) must put a real auth layer in front of it (e.g.
 * Caddy `basic_auth`) — a token embedded in the page HTML (see
 * sendIndexWithToken in app.server.ts) is handed to every visitor and is not
 * a substitute for that. See SECURITY.md.
 */
import type { Request, Response, NextFunction } from 'express';
import type { IncomingMessage } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import type { CoreDatabase } from './database.db.js';

const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

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

function extractToken(req: Request | IncomingMessage): string | null {
  const authHeader = (req.headers as Record<string, string | string[] | undefined>)?.authorization;
  const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (headerValue && headerValue.startsWith('Bearer ')) {
    return headerValue.slice('Bearer '.length).trim();
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

function isLoopbackRequest(req: Request): boolean {
  const addr = req.socket?.remoteAddress || '';
  return LOOPBACK_ADDRESSES.has(addr);
}

/**
 * Express middleware enforcing the bearer token on every route it's mounted
 * on. Mount this on `/api` after excluding the bootstrap token route.
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
    if (!isLoopbackRequest(req)) {
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
