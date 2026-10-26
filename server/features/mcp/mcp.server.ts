import { Router, type Request, type Response } from 'express';
import { spawn } from 'node:child_process';
import { STOCK_MCPS } from './mcp.stock.js';
import {
  authStatus,
  clearTokens as clearOAuthTokens,
  credentialLabel,
  validateCredentials,
  exchangeCode as exchangeAuthorizationCode,
  getAccessToken,
  saveTokens as saveOAuthTokens,
  takePending as takePendingAuth,
  canonicalRedirectUri,
  MCP_ALIASES,
} from './mcp.oauth.js';
import { CoreDatabase } from '../core/database.db.js';
import { startConnect, beginAuthorization } from './mcp.connect.js';
import { computeReadiness, getReadinessMap, recordProbe } from './mcp.readiness.js';
import {
  clearCachedProviderStatus,
  fetchMcpAiProviderStatus,
  isMcpAiServer,
  readCachedProviderStatus,
  type McpAiProviderStatus,
} from './mcp.ai.js';

type ProbeResult = {
  ok: boolean;
  stage: 'spawn' | 'initialize' | 'tools' | 'timeout' | 'exit' | 'http' | 'oauth';
  tools: string[];
  detail: string;
};

const PROBE_TIMEOUT_MS = 45_000;

const CREDENTIAL_HINT =
  /API_KEY|APIKEY|_TOKEN|environment variable|is required|not set|not configured|Please provide|access token|personal access/i;
const CODE_BUG =
  /list_tools|list_resources|AttributeError|ModuleNotFoundError|determine executable|ERR_MODULE_NOT_FOUND|no versions available|does not provide any executables/i;

function tidy(s: string, n = 260): string {
  return s.replace(/\s+/g, ' ').trim().slice(-n);
}

/** Spawn a stdio MCP server and perform a real initialize + tools/list handshake. */
function probeStdio(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv
): Promise<ProbeResult> {
  return new Promise((resolve) => {
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], env });
    } catch (err) {
      resolve({
        ok: false, stage: 'spawn', tools: [],
        detail: err instanceof Error ? err.message : String(err),
      });
      return;
    }

    const stdin = child.stdin;
    const stdoutStream = child.stdout;
    const stderrStream = child.stderr;
    if (!stdin || !stdoutStream || !stderrStream) {
      resolve({ ok: false, stage: 'spawn', tools: [], detail: 'Failed to open stdio pipes.' });
      return;
    }

    let stdout = '', stderr = '', settled = false;
    const finish = (r: ProbeResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { child.kill('SIGKILL'); } catch { /* already gone */ }
      resolve(r);
    };

    const timer = setTimeout(() => {
      const blob = stderr + stdout;
      const needsCred = CREDENTIAL_HINT.test(blob) && !CODE_BUG.test(blob);
      finish({
        ok: false, stage: needsCred ? 'exit' : 'timeout', tools: [],
        detail: needsCred
          ? `Started but requires credentials: ${tidy(blob)}`
          : `No MCP handshake within ${PROBE_TIMEOUT_MS / 1000}s. ${tidy(blob)}`,
      });
    }, PROBE_TIMEOUT_MS);

    const send = (msg: unknown) => {
      try { stdin.write(JSON.stringify(msg) + '\n'); } catch { /* closed */ }
    };

    stdoutStream.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
      for (const line of stdout.split('\n')) {
        const t = line.trim();
        if (!t.startsWith('{')) continue;
        let msg: Record<string, unknown>;
        try { msg = JSON.parse(t) as Record<string, unknown>; } catch { continue; }

        if (msg.id === 1) {
          if (msg.error) {
            finish({ ok: false, stage: 'initialize', tools: [], detail: tidy(JSON.stringify(msg.error)) });
          } else {
            send({ jsonrpc: '2.0', method: 'notifications/initialized' });
            send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
          }
        } else if (msg.id === 2) {
          if (msg.error) {
            finish({ ok: false, stage: 'tools', tools: [], detail: tidy(JSON.stringify(msg.error)) });
          } else {
            const result = msg.result as { tools?: Array<{ name?: string }> } | undefined;
            const tools = (result?.tools ?? [])
              .map((t) => t?.name)
              .filter((n): n is string => typeof n === 'string');
            finish({ ok: true, stage: 'tools', tools, detail: '' });
          }
        }
      }
    });

    child.on('error', (err: Error) => {
      finish({ ok: false, stage: 'spawn', tools: [], detail: err.message });
    });

    child.on('exit', (code: number | null) => {
      const blob = stderr + stdout;
      if (CODE_BUG.test(blob)) {
        finish({ ok: false, stage: 'exit', tools: [], detail: `Crashed on startup: ${tidy(blob)}` });
      } else if (CREDENTIAL_HINT.test(blob)) {
        finish({
          ok: false, stage: 'exit', tools: [],
          detail: `Started but requires credentials: ${tidy(blob)}`,
        });
      } else {
        finish({
          ok: false, stage: 'exit', tools: [],
          detail: `Exited with code ${code} without responding. ${tidy(blob)}`,
        });
      }
    });

    stderrStream.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    send({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'smoke-monkey-canvas', version: '1.0.0' },
      },
    });
  });
}

/** Probe a remote (streamable HTTP) MCP server with a real initialize request. */
/** Pull the first JSON-RPC payload out of an SSE stream or a plain JSON body. */
function sseJson(text: string): unknown {
  const line = text.split('\n').find((l) => l.startsWith('data:'))?.slice(5).trim();
  const candidate = line ?? text.trim();
  try {
    return JSON.parse(candidate);
  } catch {
    return undefined;
  }
}

/**
 * Probe a remote MCP endpoint over streamable HTTP.
 *
 * Performs a real initialize handshake, then continues into a session so
 * tools/list can be verified too -- reporting a connection as successful on the
 * strength of initialize alone would just mean the port was open.
 */
async function probeHttp(url: string, headers: Record<string, string>): Promise<ProbeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  const baseHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    ...headers,
  };

  const post = async (body: unknown, extra: Record<string, string> = {}) => {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { ...baseHeaders, ...extra },
      body: JSON.stringify(body),
    });
    return { res, text: res.ok ? await res.text() : '' };
  };

  try {
    const { res, text } = await post({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'smoke-monkey-canvas', version: '1.0.0' },
      },
    });

    if (res.status === 401 || res.status === 403) {
      const challenge = res.headers.get('www-authenticate') ?? '';
      return {
        ok: false, stage: 'oauth', tools: [],
        detail: `Endpoint requires authorization (HTTP ${res.status}).${
          challenge ? ` Challenge: ${challenge.slice(0, 120)}` : ''
        } Use Connect to authorize this server, then test again.`,
      };
    }
    if (!res.ok) {
      return {
        ok: false, stage: 'http', tools: [],
        detail: `Endpoint returned HTTP ${res.status} ${res.statusText}.`,
      };
    }

    const parsed = sseJson(text) as
      | { result?: { serverInfo?: { name?: string } }; error?: { message?: string } }
      | undefined;

    if (parsed?.error) {
      return {
        ok: false, stage: 'initialize', tools: [],
        detail: `MCP initialize rejected: ${parsed.error.message ?? 'unknown error'}`,
      };
    }
    if (!parsed?.result) {
      return {
        ok: false, stage: 'initialize', tools: [],
        detail: `Endpoint reachable but did not return a valid MCP handshake: ${tidy(text)}`,
      };
    }

    const serverName = parsed.result.serverInfo?.name ?? url;
    const sessionId = res.headers.get('mcp-session-id');
    const sessionHeaders: Record<string, string> = {};
    if (sessionId) sessionHeaders['Mcp-Session-Id'] = sessionId;

    // Complete the session, then ask for the tool list over the same channel.
    try {
      await post(
        { jsonrpc: '2.0', method: 'notifications/initialized' },
        sessionHeaders
      );
    } catch {
      // Servers that do not require the notification are fine; keep going.
    }

    let tools: string[] = [];
    try {
      const list = await post(
        { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
        sessionHeaders
      );
      const listed = sseJson(list.text) as
        | { result?: { tools?: { name?: string }[] } }
        | undefined;
      tools = (listed?.result?.tools ?? [])
        .map((t) => t.name)
        .filter((n): n is string => typeof n === 'string' && n.length > 0);
    } catch {
      // A server that answers initialize but not tools/list is still connected.
    }

    return {
      ok: true,
      stage: tools.length ? 'tools' : 'initialize',
      tools,
      detail: tools.length
        ? `${tools.length} tool(s) available on ${serverName}`
        : `Handshake accepted by ${serverName}, but it returned no tool list`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      stage: msg.includes('abort') ? 'timeout' : 'http',
      tools: [],
      detail: msg.includes('abort') ? 'No response within 20s.' : msg,
    };
  } finally {
    clearTimeout(timer);
  }
}

export function createMcpRouter(): Router {
  const router = Router();

  router.get('/stock', (_req: Request, res: Response) => {
    res.json(STOCK_MCPS);
  });

  // Readiness snapshot for every stock server: credential state + last verified
  // probe. A server is only "ready" once a real handshake has succeeded, so the
  // UI never shows "connected" for something that has not actually connected.
  router.get('/status', (_req: Request, res: Response) => {
    res.json(getReadinessMap());
  });

// ── OAuth: real authorization-code + PKCE flow for remote MCP servers ─────
  // Remote servers that publish OAuth metadata are authorized properly.
  // Everything else gets an honest page instead of a fake consent screen.

  router.get('/oauth/status/:mcpName', (req: Request, res: Response) => {
    const mcpName = Array.isArray(req.params.mcpName)
      ? (req.params.mcpName[0] ?? '')
      : req.params.mcpName;
    res.json({ mcpName, ...authStatus(mcpName) });
  });

  /**
   * MCP.ai layer two: is the underlying provider (Telegram, Linear, …) linked?
   * `?refresh=1` performs a live call to MCP.ai's `connect` tool; otherwise the
   * cached answer is returned.
   */
  router.get('/oauth/:mcpName/provider', async (req: Request, res: Response) => {
    const mcpName = Array.isArray(req.params.mcpName)
      ? (req.params.mcpName[0] ?? '')
      : req.params.mcpName;
    if (!isMcpAiServer(mcpName)) {
      res.status(404).json({ error: 'Not an MCP.ai server' });
      return;
    }
    const refresh = String(req.query.refresh ?? '') === '1';
    const cached = readCachedProviderStatus(mcpName);
    const status = refresh || !cached
      ? await fetchMcpAiProviderStatus(mcpName)
      : cached;
    res.json(status);
  });

  router.post('/oauth/:mcpName/disconnect', (req: Request, res: Response) => {
    const mcpName = Array.isArray(req.params.mcpName)
      ? (req.params.mcpName[0] ?? '')
      : req.params.mcpName;
    const stock = STOCK_MCPS.find((s) => s.name === mcpName);
    if (!stock) {
      res.status(404).json({ success: false, error: 'MCP not found' });
      return;
    }
    clearOAuthTokens(mcpName);
    clearCachedProviderStatus(mcpName);

    // Manually-pasted credentials live in the same settings rows the process reads,
    // so "disconnect" has to clear them too or the token survives the disconnect.
    const coreDb = CoreDatabase.getInstance();
    const cleared: string[] = [];
    for (const key of stock.envKeys ?? []) {
      if (coreDb.getSetting(key)) {
        coreDb.setSetting(key, '');
        cleared.push(key);
      }
    }

    res.json({
      success: true,
      message: `Disconnected ${stock.label}.`,
      clearedOAuth: true,
      clearedCredentials: cleared,
    });
  });

  router.get('/oauth/callback', async (req: Request, res: Response) => {
    const { code, state, error, error_description: errorDescription } = req.query as
      Record<string, string | undefined>;

    const finish = (
      ok: boolean,
      message: string,
      mcpName?: string,
      provider?: McpAiProviderStatus
    ) => {
      res.type('html').send(renderOAuthResultPage({ ok, message, mcpName, provider }));
    };

    if (error) {
      finish(false, errorDescription || error);
      return;
    }
    if (!code || !state) {
      finish(false, 'Callback was missing the authorization code or state.');
      return;
    }

    const hit = takePendingAuth(state);
    if (!hit) {
      finish(false, 'This authorization request expired or was not initiated by this app. Start again.');
      return;
    }

    try {
      const tokens = await exchangeAuthorizationCode(
        hit.tokenEndpoint, code, hit.verifier, hit.clientId, hit.redirectUri, hit.resource,
        hit.clientSecret
      );
      saveOAuthTokens(hit.mcpName, tokens);

      // MCP.ai OAuth only authorizes the platform. Ask its `connect` tool
      // whether the provider account (Telegram, Linear, …) is linked, so the
      // result page can show the second login step instead of a false success.
      const provider = isMcpAiServer(hit.mcpName)
        ? await fetchMcpAiProviderStatus(hit.mcpName)
        : undefined;

      if (provider?.state === 'needs-login') {
        finish(
          true,
          `MCP.ai is connected. Finish linking your account to authorize ${hit.mcpName}.`,
          hit.mcpName,
          provider
        );
        return;
      }

      finish(true, `${hit.mcpName} is now connected. You can close this window.`, hit.mcpName, provider);
    } catch (err) {
      finish(false, err instanceof Error ? err.message : String(err));
    }
  });


  // Save manually-supplied credentials for an MCP that cannot be auto-authorized.
  // Validation happens server-side too; the client copy is only a convenience.
  router.post('/oauth/:mcpName/credentials', (req: Request, res: Response) => {
    const mcpName = Array.isArray(req.params.mcpName)
      ? (req.params.mcpName[0] ?? '')
      : req.params.mcpName;
    const stock = STOCK_MCPS.find((s) => s.name === mcpName);
    if (!stock) {
      res.status(404).json({ success: false, error: 'MCP not found' });
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;

    // OAuth App credentials are stored apart from MCP credentials: they identify
    // this app to the provider, they are not the user's access token.
    if (body.OAUTH_CLIENT_ID || body.OAUTH_CLIENT_SECRET) {
      const clientId = typeof body.OAUTH_CLIENT_ID === 'string' ? body.OAUTH_CLIENT_ID.trim() : '';
      const clientSecret =
        typeof body.OAUTH_CLIENT_SECRET === 'string' ? body.OAUTH_CLIENT_SECRET.trim() : '';
      const errs: Record<string, string> = {};
      if (!clientId) errs.OAUTH_CLIENT_ID = 'This field is required.';
      if (!clientSecret) errs.OAUTH_CLIENT_SECRET = 'This field is required.';
      if (Object.keys(errs).length) {
        res.status(400).json({
          success: false, error: 'Some credentials are missing or invalid.',
          errors: errs, required: ['OAUTH_CLIENT_ID', 'OAUTH_CLIENT_SECRET'],
        });
        return;
      }
      const coreDb = CoreDatabase.getInstance();
      coreDb.setSetting(`MCP_OAUTH_CLIENT_ID__${mcpName}`, clientId);
      coreDb.setSetting(`MCP_OAUTH_CLIENT_SECRET__${mcpName}`, clientSecret);
      // Remember that this client belongs to the user and which callback URL it
      // was registered with, so later connects never re-register it and always
      // send the same redirect_uri the provider has on file.
      coreDb.setSetting(`MCP_OAUTH_CLIENT_IS_USER_APP__${mcpName}`, '1');
      coreDb.setSetting(`MCP_OAUTH_CLIENT_REDIRECT__${mcpName}`, callbackUrl(req));
      res.json({
        success: true, mcpName,
        saved: ['OAUTH_CLIENT_ID', 'OAUTH_CLIENT_SECRET'],
        message: `OAuth App saved for ${stock.label}.`,
      });
      return;
    }

    const required = stock.envKeys ?? [];
    if (required.length === 0) {
      res.status(400).json({ success: false, error: `${stock.label} needs no credentials.` });
      return;
    }
    const check = validateCredentials(required, body);

    if (!check.ok) {
      res.status(400).json({
        success: false,
        error: 'Some credentials are missing or invalid.',
        errors: check.errors,
        required,
      });
      return;
    }

    const coreDb = CoreDatabase.getInstance();
    for (const [k, v] of Object.entries(check.values)) coreDb.setSetting(k, v);

    res.json({
      success: true,
      mcpName,
      saved: Object.keys(check.values),
      message: `Saved ${Object.keys(check.values).length} credential(s) for ${stock.label}.`,
    });
  });

  router.get('/oauth/:mcpName/start', async (req: Request, res: Response) => {
    const mcpName = Array.isArray(req.params.mcpName)
      ? (req.params.mcpName[0] ?? '')
      : req.params.mcpName;
    const stock = STOCK_MCPS.find((s) => s.name === mcpName);
    if (!stock) {
      res.status(404).send('MCP not found');
      return;
    }

    // Already authorized? Nothing to do.
    if (authStatus(mcpName).connected) {
      res.redirect(`/api/mcp/oauth/${mcpName}/done?status=already`);
      return;
    }

    if (!stock.url) {
      res.send(renderManualTokenPage(stock));
      return;
    }

    const redirectUri = callbackUrl(req);
    const started = await beginAuthorization(mcpName, stock, redirectUri);
    if (!started.ok) {
      // Honest fallback: explain exactly why automation failed and offer the
      // manual token path rather than pretending to authorize.
      res.status(502).send(
        started.needsClient
          ? renderManualTokenPage(stock, started.reason, { oauthApp: true })
          : renderManualTokenPage(stock, started.reason)
      );
      return;
    }

    res.redirect(started.authorizationUrl);
  });

  /**
   * Programmatic connect: the same flow as `/start`, but answered with JSON
   * instead of a redirect, so a client (or the agent itself) can drive it.
   *
   * The response always carries the authorization URL, and `browserOpened`
   * reports whether the server managed to hand it to the OS browser itself.
   * A client that can open a window should use the URL; one that cannot rely
   * on the server-side launch.
   */
  router.post('/oauth/:mcpName/connect', async (req: Request, res: Response) => {
    const mcpName = Array.isArray(req.params.mcpName)
      ? (req.params.mcpName[0] ?? '')
      : req.params.mcpName;
    const aliasNames = MCP_ALIASES[mcpName] ?? [];
    const stock =
      STOCK_MCPS.find((s) => s.name === mcpName) ||
      STOCK_MCPS.find((s) => aliasNames.includes(s.name));
    if (!stock) {
      res.status(404).json({ success: false, error: 'MCP not found' });
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const outcome = await startConnect(mcpName, {
      redirectUri: callbackUrl(req),
      launch: body.launch === 'server' ? 'server' : 'client',
    });

    switch (outcome.status) {
      case 'connected':
        res.json({ success: true, mcpName, status: 'connected', message: outcome.message });
        return;
      case 'awaiting-auth':
        res.json({
          success: true,
          mcpName,
          status: 'awaiting-auth',
          authorizationUrl: outcome.authorizationUrl,
          browserOpened: outcome.browserOpened,
          message: outcome.message,
        });
        return;
      case 'needs-token':
        res.json({
          success: false,
          mcpName,
          status: 'needs-token',
          message: outcome.message,
          required: outcome.required,
        });
        return;
      case 'needs-client':
        res.status(502).json({
          success: false,
          mcpName,
          status: 'needs-client',
          error: outcome.reason,
          message: outcome.message,
        });
        return;
      default:
        res.status(502).json({
          success: false,
          mcpName,
          status: 'failed',
          error: outcome.reason,
          message: outcome.message,
        });
    }
  });

  router.get('/oauth/:mcpName/done', async (req: Request, res: Response) => {
    const mcpName = Array.isArray(req.params.mcpName)
      ? (req.params.mcpName[0] ?? '')
      : req.params.mcpName;
    const already = req.query.status === 'already';
    const provider = isMcpAiServer(mcpName)
      ? readCachedProviderStatus(mcpName) ?? (await fetchMcpAiProviderStatus(mcpName))
      : undefined;
    const label = STOCK_MCPS.find((s) => s.name === mcpName)?.label ?? mcpName;
    res.type('html').send(
      renderOAuthResultPage({
        ok: true,
        message: provider?.state === 'needs-login'
          ? `MCP.ai is connected. Finish linking your ${label} account to authorize this server.`
          : already
          ? 'This server already has a valid token. You can close this window.'
          : 'The authorization flow completed. You can close this window.',
        mcpName,
        provider,
      })
    );
  });

  // Legacy path used by older UI: delegate to the real flow.
  router.get('/oauth/:mcpName/authorize', (req: Request, res: Response) => {
    const mcpName = Array.isArray(req.params.mcpName)
      ? (req.params.mcpName[0] ?? '')
      : req.params.mcpName;
    res.redirect(`/api/mcp/oauth/${mcpName}/start`);
  });

// ── OAuth page rendering (no simulated tokens anywhere) ───────────────────

  function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string)
    );
  }

  /**
   * The OAuth callback URI for this server.
   *
   * Deliberately NOT derived from the request's Host header: the browser, the
   * dev proxy and the desktop app all spell the local host differently, and a
   * provider compares redirect URIs byte for byte. One pinned URI keeps the
   * registered client and the authorize request in agreement.
   */
  function callbackUrl(req: Request): string {
    const proto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0]?.trim()
      || req.protocol
      || 'http';
    const host = (req.headers['x-forwarded-host'] as string)?.split(',')[0]?.trim()
      || req.get('host')
      || '';
    return canonicalRedirectUri(proto, host);
  }

  const PAGE_CSS = `
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#070b14;background-image:
           radial-gradient(900px 500px at 50% -10%,rgba(37,99,235,.22),transparent 62%),
           radial-gradient(700px 420px at 100% 110%,rgba(14,165,233,.12),transparent 60%);
         color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;
         display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
    .card{position:relative;background:linear-gradient(180deg,rgba(17,24,39,.98),rgba(9,14,24,.99));
          border:1px solid rgba(148,163,184,.16);border-radius:20px;width:100%;max-width:480px;
          padding:32px;box-shadow:0 40px 90px -30px rgba(0,0,0,.92),
          0 0 0 1px rgba(255,255,255,.03) inset,0 1px 0 rgba(255,255,255,.07) inset;
          overflow:hidden}
    .card:before{content:'';position:absolute;inset:0 0 auto;height:1px;
          background:linear-gradient(90deg,transparent,rgba(96,165,250,.55),transparent)}
    .orb{width:56px;height:56px;border-radius:16px;display:flex;align-items:center;justify-content:center;
         margin-bottom:20px;font-size:24px;font-weight:700;
         background:linear-gradient(145deg,rgba(16,185,129,.22),rgba(16,185,129,.06));
         border:1px solid rgba(16,185,129,.35);color:#6ee7b7;
         box-shadow:0 12px 32px -12px rgba(16,185,129,.55),0 0 0 6px rgba(16,185,129,.04)}
    .orb.bad{background:linear-gradient(145deg,rgba(248,113,113,.2),rgba(248,113,113,.05));
         border-color:rgba(248,113,113,.35);color:#fca5a5;
         box-shadow:0 12px 32px -12px rgba(248,113,113,.4),0 0 0 6px rgba(248,113,113,.04)}
    .eyebrow{font-size:10.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;
         color:#64748b;margin-bottom:8px}
    h1{font-size:21px;line-height:1.25;font-weight:750;color:#fff;margin-bottom:8px;letter-spacing:-.01em}
    p{font-size:13px;color:#94a3b8;line-height:1.6}
    .banner{background:rgba(120,53,15,.22);border:1px solid rgba(245,158,11,.32);border-radius:12px;
            padding:13px 15px;margin:18px 0;font-size:12.5px;color:#fbbf24;line-height:1.55;
            white-space:pre-wrap;word-break:break-word}
    .provider{margin-top:20px;padding:18px;border-radius:14px;
         background:linear-gradient(145deg,rgba(30,41,59,.55),rgba(15,23,42,.5));
         border:1px solid rgba(96,165,250,.2);box-shadow:0 14px 34px -20px rgba(37,99,235,.55)}
    .provider.done{border-color:rgba(16,185,129,.28);background:linear-gradient(145deg,rgba(6,78,59,.28),rgba(15,23,42,.5))}
    .provider-title{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:#e2e8f0;margin-bottom:5px}
    .provider p{font-size:12.5px;color:#9fb0c7}
    .status-dot{width:7px;height:7px;border-radius:50%;background:#60a5fa;box-shadow:0 0 0 4px rgba(96,165,250,.12)}
    .status-dot.green{background:#34d399;box-shadow:0 0 0 4px rgba(52,211,153,.12)}
    label{display:block;font-size:11.5px;font-weight:600;color:#94a3b8;margin:14px 0 6px}
    input{width:100%;padding:11px 13px;background:#080d17;border:1px solid #263449;border-radius:9px;
          color:#fff;font-size:13px;outline:none;transition:border-color .15s,box-shadow .15s}
    input:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.16)}
    button{width:100%;margin-top:16px;padding:12px;border:none;border-radius:10px;font-size:13.5px;
           font-weight:650;cursor:pointer;background:linear-gradient(180deg,#3b82f6,#2563eb);color:#fff;
           box-shadow:0 10px 26px -12px rgba(37,99,235,.8),0 1px 0 rgba(255,255,255,.15) inset;
           transition:transform .15s,filter .15s}
    button:hover{filter:brightness(1.08)}
    button:active{transform:translateY(1px)}
    button.secondary{background:rgba(255,255,255,.06);border:1px solid rgba(148,163,184,.22);
           box-shadow:none;color:#dbe6f5;margin-top:9px}
    button:disabled{opacity:.6;cursor:not-allowed}
    .ok{color:#34d399}
    a{color:#60a5fa;font-size:12.5px}
    .link-btn{display:block;text-align:center;text-decoration:none;margin-top:14px;padding:12px;
         border-radius:10px;font-size:13.5px;font-weight:650;color:#fff;
         background:linear-gradient(180deg,#3b82f6,#2563eb);
         box-shadow:0 10px 26px -12px rgba(37,99,235,.8),0 1px 0 rgba(255,255,255,.15) inset}
    .link-btn:hover{filter:brightness(1.08)}
    .meta{margin-top:18px;padding-top:16px;border-top:1px solid rgba(148,163,184,.1);
          font-size:11.5px;color:#64748b;line-height:1.55}
  `;

  // `noDcrReason` / `callbackHint` live in mcp.connect.ts so the agent tool and
  // these pages explain the same rule identically.

  function renderOAuthResultPage(opts: {
    ok: boolean;
    message: string;
    mcpName?: string;
    provider?: McpAiProviderStatus;
  }): string {
    const { ok, message, mcpName, provider } = opts;
    const stock = mcpName ? STOCK_MCPS.find((s) => s.name === mcpName) : undefined;
    const label = stock?.label ?? mcpName ?? 'MCP server';
    const needsLogin = provider?.state === 'needs-login';
    const providerDone = provider?.state === 'connected';
    const title = !ok
      ? 'Authorization failed'
      : needsLogin
      ? `One more step for ${label}`
      : providerDone || !provider
      ? `${label} connected`
      : `${label} platform connected`;

    const providerPanel = provider
      ? `<div class="provider ${providerDone ? 'done' : ''}" id="provider-card">
          <div class="provider-title">
            <span class="status-dot ${providerDone ? 'green' : ''}"></span>
            <span id="provider-title">${
              providerDone
                ? `${escapeHtml(label)} account linked`
                : needsLogin
                ? `${escapeHtml(label)} account login required`
                : provider.state === 'needs-platform-auth'
                ? 'MCP.ai sign-in required'
                : 'Could not verify the account'
            }</span>
          </div>
          <p id="provider-detail">${escapeHtml(
            provider.detail ??
              (providerDone
                ? `MCP.ai and ${label} are both authorized.`
                : needsLogin
                ? `MCP.ai is connected, but ${label} still needs your account login.`
                : 'MCP.ai did not report a provider connection.')
          )}</p>
          ${
            provider.connectUrl
              ? `<a class="link-btn" href="${escapeHtml(provider.connectUrl)}" target="_blank" rel="noopener noreferrer">Connect ${escapeHtml(label)} account</a>`
              : ''
          }
          <button type="button" class="secondary" id="provider-check">I finished — check again</button>
        </div>`
      : '';

    return `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>${escapeHtml(title)}</title>
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <style>${PAGE_CSS}</style></head><body><div class="card">
      <div class="orb ${ok ? '' : 'bad'}">${ok ? '&#10003;' : '!'}</div>
      <div class="eyebrow">${provider ? 'Two-step connection' : 'MCP connection'}</div>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(message)}</p>
      ${providerPanel}
      <div class="meta">Credentials are stored on this machine. MCP.ai only tells this app whether the provider account is linked.</div>
      </div>
      <script>
        const mcpName = ${JSON.stringify(mcpName ?? null)};
        const providerState = ${JSON.stringify(provider?.state ?? null)};
        const label = ${JSON.stringify(label)};
        const openerMessage = {
          type: ${JSON.stringify(ok ? 'MCP_OAUTH_SUCCESS' : 'MCP_OAUTH_ERROR')},
          mcpName,
          message: ${JSON.stringify(message)},
          providerState,
        };
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(openerMessage, '*');
        }
        const check = document.getElementById('provider-check');
        const titleEl = document.getElementById('provider-title');
        const detailEl = document.getElementById('provider-detail');
        const card = document.getElementById('provider-card');
        let poll = null;

        async function refreshProvider() {
          if (!mcpName || !check) return;
          check.disabled = true;
          check.textContent = 'Checking…';
          try {
            const res = await fetch('/api/mcp/oauth/' + encodeURIComponent(mcpName) + '/provider?refresh=1');
            const status = await res.json();
            if (status.state === 'connected') {
              if (card) card.classList.add('done');
              if (titleEl) titleEl.textContent = label + ' account linked';
              if (detailEl) detailEl.textContent = 'MCP.ai and ' + label + ' are both authorized.';
              check.textContent = 'Connected';
              check.disabled = true;
              if (poll) clearInterval(poll);
              setTimeout(function(){ window.close(); }, 1400);
              return;
            }
            if (titleEl) {
              titleEl.textContent = status.state === 'needs-platform-auth'
                ? 'MCP.ai sign-in required'
                : label + ' account login required';
            }
            if (detailEl) detailEl.textContent = status.detail || 'Finish the ' + label + ' login, then check again.';
            check.textContent = 'I finished — check again';
            check.disabled = false;
          } catch {
            check.textContent = 'Check again';
            check.disabled = false;
          }
        }

        if (check) {
          check.addEventListener('click', refreshProvider);
          if (providerState === 'needs-login') {
            poll = setInterval(refreshProvider, 10000);
          }
        }

        if (${ok && !needsLogin ? 'true' : 'false'}) {
          setTimeout(function(){ window.close(); }, 1600);
        }
      </script></body></html>`;
  }

  function renderManualTokenPage(
    stock: { name: string; label: string; envKeys?: string[]; url?: string },
    reason?: string,
    opts?: { oauthApp?: boolean }
  ): string {
    const oauthApp = !!opts?.oauthApp;
    const tokenKeys = stock.envKeys ?? [];
    // A provider that publishes OAuth but no registration_endpoint is reachable two
    // ways, so offer both: register an OAuth App and sign in properly, or paste a
    // token the provider already issued. Neither option alone is always usable.
    const keys = oauthApp
      ? ['OAUTH_CLIENT_ID', 'OAUTH_CLIENT_SECRET', ...tokenKeys]
      : tokenKeys;
    const notice = oauthApp
      ? `${stock.label} supports OAuth, but will not register this app automatically. Register an ` +
        `OAuth App and continue to the real sign-in page, or paste a token ${stock.label} already issued.`
      : stock.url
      ? `This server could not be authorized automatically, so paste ${keys.length > 1 ? 'the credentials' : 'the token'} issued by ${stock.label}.`
      : `${stock.label} runs locally and reads ${keys.length > 1 ? 'the credentials' : 'a token'} you supply. ${
          keys.length > 1 ? `All ${keys.length} fields are required.` : 'Create one in your account settings and paste it below.'
        }`;

    // Per-field metadata: label, placeholder and the client-side rule.
    const fields = keys.map((k) => {
      const upper = k.toUpperCase();
      let placeholder = 'Paste value';
      let type = 'password';
      if (upper.includes('_URL') || upper.endsWith('_HOST') || upper.includes('INSTANCE')) {
        placeholder = 'https://…'; type = 'text';
      } else if (upper.includes('SUBDOMAIN')) {
        placeholder = 'support'; type = 'text';
      } else if (upper.includes('HANDLE')) {
        placeholder = '@you.bsky.social'; type = 'text';
      } else if (upper.includes('CLIENT_ID') || upper.endsWith('_ID')) {
        placeholder = 'Client ID'; type = 'text';
      }
      const group = oauthApp
        ? (k === 'OAUTH_CLIENT_ID' || k === 'OAUTH_CLIENT_SECRET' ? 'oauthApp' : 'token')
        : 'token';
      return { key: k, label: credentialLabel(k), placeholder, type, group };
    });

    return `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Connect ${escapeHtml(stock.label)}</title>
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <style>${PAGE_CSS}
        .field{margin-top:16px}
        .err{display:none;margin-top:6px;font-size:11.5px;color:#f87171;line-height:1.4}
        .field.invalid input{border-color:#ef4444}
        .field.invalid .err{display:block}
        .summary{display:none;background:#1f1408;border:1px solid #78350f;color:#fbbf24;
                 border-radius:9px;padding:11px 13px;font-size:12.5px;margin-top:16px}
        .summary.show{display:block}
        .hint{font-size:11px;color:#64748b;margin-top:5px}
        .ok-banner{display:none;background:#0d1f18;border:1px solid #065f46;color:#6ee7b7;
                   border-radius:9px;padding:12px;font-size:12.5px;margin-top:16px}
        .ok-banner.show{display:block}
      </style></head><body><div class="card">
      <h1>Connect ${escapeHtml(stock.label)}</h1>
      <p>${escapeHtml(notice)}</p>
      ${reason ? `<div class="banner">${escapeHtml(reason)}</div>` : ''}
      <form id="form" novalidate>
        ${oauthApp && tokenKeys.length ? '<div class="hint" style="margin-top:18px;font-size:12px;color:#94a3b8;font-weight:600">Option 1 &mdash; OAuth App (recommended)</div>' : ''}
        ${fields.map((f) => `
        <div class="field" data-key="${escapeHtml(f.key)}">
          <label for="f_${escapeHtml(f.key)}">${escapeHtml(f.label)} <span style="color:#64748b;font-weight:400">(${escapeHtml(f.key)})</span></label>
          <input id="f_${escapeHtml(f.key)}" name="${escapeHtml(f.key)}" type="${f.type}"
                 placeholder="${escapeHtml(f.placeholder)}" autocomplete="off" spellcheck="false" />
          <div class="err" id="e_${escapeHtml(f.key)}"></div>
        </div>`).join('')}
        ${oauthApp && tokenKeys.length
          ? '<div class="hint" style="margin-top:22px;font-size:12px;color:#94a3b8;font-weight:600">Option 2 &mdash; paste a token instead</div>'
          : ''}
        <div class="summary" id="summary"></div>
        <button type="submit" id="save">${oauthApp ? 'Save and continue to sign-in' : 'Save and connect'}</button>
      </form>
      <div class="ok-banner" id="ok"></div>
      <p style="margin-top:14px;font-size:11.5px">
        Stored locally and sent only to ${escapeHtml(stock.label)}. Use
        <a href="#" id="cancel">cancel</a> to go back.
      </p>
    </div><script>
      const mcpName = ${JSON.stringify(stock.name)};
      const oauthApp = ${JSON.stringify(oauthApp)};
      const fields = ${JSON.stringify(fields)};
      const form = document.getElementById('form');
      const summary = document.getElementById('summary');

      // Mirrors validateCredential() on the server so the user sees problems
      // before submitting; the server re-validates regardless.
      function validate(key, raw) {
        const v = (raw || '').trim();
        if (!v) return 'This field is required.';
        const u = key.toUpperCase();
        if (u.includes('SUBDOMAIN')) {
          return /^[a-z0-9][a-z0-9-]{1,62}$/i.test(v)
            ? null : 'Use a subdomain such as "support" — letters, numbers and dashes only.';
        }
        if (u.includes('_URL') || u.endsWith('_HOST') || u.includes('ENDPOINT') || u.includes('INSTANCE')) {
          return /^https?:\\/\\/[^\\s]+$/.test(v) ? null : 'Enter a full URL starting with https://';
        }
        if (u.includes('HANDLE')) {
          return /^@?[a-z0-9][a-z0-9.-]*$/i.test(v) ? null : 'Enter a handle, for example @you.bsky.social';
        }
        if (u.includes('SECRET') || u.includes('TOKEN') || u.includes('KEY') || u.includes('PASSWORD')) {
          if (/\\s/.test(v)) return 'Tokens cannot contain spaces.';
          if (v.length < 8) return 'Too short — this looks incomplete (' + v.length + ' characters).';
          return null;
        }
        return v.length < 3 ? 'Too short to be valid.' : null;
      }

      function paint(errors) {
        let count = 0;
        for (const f of fields) {
          const wrap = document.querySelector('.field[data-key="' + f.key + '"]');
          const input = document.getElementById('f_' + f.key);
          const err = errors[f.key];
          wrap.classList.toggle('invalid', !!err);
          document.getElementById('e_' + f.key).textContent = err || '';
          input.setAttribute('aria-invalid', err ? 'true' : 'false');
          if (err) count++;
        }
        if (count) {
          summary.textContent = count + ' field' + (count === 1 ? '' : 's') + ' need' + (count === 1 ? 's' : '') + ' attention.';
          summary.classList.add('show');
        } else {
          summary.classList.remove('show');
        }
        return count;
      }

      form.addEventListener('input', (e) => {
        const key = e.target.name;
        if (!key) return;
        const live = {};
        for (const f of fields) {
          const el = document.getElementById('f_' + f.key);
          const err = validate(f.key, el.value);
          if (err && el.value.trim() === '' && document.activeElement !== el) continue;
          if (err) live[f.key] = err;
        }
        paint(live);
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const values = {};
        const errors = {};
        for (const f of fields) {
          values[f.key] = document.getElementById('f_' + f.key).value;
        }
        // Validate per group: completing the OAuth App pair must not also demand a
        // pasted token, and vice versa. At least one group has to be filled in.
        const groups = {};
        for (const f of fields) (groups[f.group] = groups[f.group] || []).push(f);
        let anyFilled = false;
        for (const g of Object.keys(groups)) {
          const list = groups[g];
          if (!list.some((f) => (values[f.key] || '').trim() !== '')) continue;
          anyFilled = true;
          for (const f of list) {
            const err = validate(f.key, values[f.key]);
            if (err) errors[f.key] = err;
          }
        }
        if (!anyFilled) {
          summary.textContent = 'Fill in either the OAuth App details or a token.';
          summary.classList.add('show');
          return;
        }
        if (paint(errors)) {
          const firstBad = document.querySelector('.field.invalid input');
          if (firstBad) firstBad.focus();
          return;
        }

        const btn = document.getElementById('save');
        btn.disabled = true; btn.textContent = 'Saving...';
        try {
          const res = await fetch('/api/mcp/oauth/' + encodeURIComponent(mcpName) + '/credentials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            paint(data.errors || {});
            summary.textContent = data.error || 'Could not save credentials.';
            summary.classList.add('show');
            btn.disabled = false; btn.textContent = 'Save and connect';
            return;
          }
          form.style.display = 'none';
          const ok = document.getElementById('ok');
          if (data.saved && data.saved.indexOf('OAUTH_CLIENT_ID') !== -1) {
            // Credentials are in place; send the user to the provider's real
            // consent page rather than pretending they are already connected.
            ok.textContent = 'OAuth App saved. Continuing to ' + mcpName + ' sign-in…';
            ok.classList.add('show');
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage({ type: 'MCP_OAUTH_CLIENT_SAVED', mcpName }, '*');
            }
            window.location.href = '/api/mcp/oauth/' + encodeURIComponent(mcpName) + '/start';
            return;
          }
          ok.textContent = 'Saved ' + data.saved.length + ' credential(s): ' + data.saved.join(', ');
          ok.classList.add('show');
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage({
              type: 'MCP_OAUTH_SUCCESS', mcpName, viaToken: true, keys: data.saved,
            }, '*');
          }
          setTimeout(function(){ window.close(); }, 1400);
        } catch (err) {
          summary.textContent = err.message || 'Failed to save credentials.';
          summary.classList.add('show');
          btn.disabled = false; btn.textContent = 'Save and connect';
        }
      });

      document.getElementById('cancel').onclick = (ev) => { ev.preventDefault(); window.close(); };
    </script></body></html>`;
  }

  // ── Test MCP Connection (real handshake) ───────────────────────────────────
  router.post('/test', async (req: Request, res: Response) => {
    const started = Date.now();
    const { mcpName, env } = req.body || {};

    // Resolve the definition server-side. Client-supplied command/args are
    // deliberately ignored so this endpoint cannot be used to spawn
    // arbitrary processes.
    const stock = STOCK_MCPS.find((s) => s.name === mcpName);
    if (!stock) {
      res.status(400).json({
        success: false,
        error: `Unknown MCP "${mcpName}". Only built-in library servers can be tested here.`,
      });
      return;
    }

    const coreDb = CoreDatabase.getInstance();
    const supplied = (env && typeof env === 'object' ? env : {}) as Record<string, string>;

    // Build the child environment: inherit, then overlay saved + supplied creds.
    const childEnv: NodeJS.ProcessEnv = { ...process.env };
    const missing: string[] = [];
    for (const key of stock.envKeys ?? []) {
      const value = supplied[key]?.trim() || coreDb.getSetting(key) || process.env[key];
      if (value) childEnv[key] = value;
      else missing.push(key);
    }

    let result: ProbeResult;
    if (stock.url) {
      // Prefer a real OAuth token; fall back to a stored provider token.
      const headers: Record<string, string> = {};
      let token = await getAccessToken(stock.name, stock.url).catch(() => null);
      if (!token) {
        token = stock.envKeys?.map((k) => coreDb.getSetting(k)).find(Boolean) ?? null;
      }
      if (token) headers.Authorization = `Bearer ${token}`;
      result = await probeHttp(stock.url, headers);
    } else {
      if (missing.length) {
        res.status(400).json({
          success: false,
          error: `Missing credential(s): ${missing.join(', ')}. Add them, then test again.`,
          missing,
        });
        return;
      }
      result = await probeStdio(
        stock.command ?? 'npx',
        stock.args ?? ['-y', stock.name],
        childEnv
      );
    }

    const latencyMs = Date.now() - started;

    if (!result.ok) {
      recordProbe(stock.name, {
        ok: false,
        stage: result.stage,
        detail: result.detail,
        toolCount: 0,
        latencyMs,
      });
      res.status(200).json({
        success: false,
        stage: result.stage,
        mcpName: stock.name,
        label: stock.label,
        error: result.detail,
        latencyMs,
        readiness: computeReadiness(stock.name),
      });
      return;
    }

    recordProbe(stock.name, {
      ok: true,
      stage: result.stage,
      detail: '',
      toolCount: result.tools.length,
      latencyMs,
    });

    // A successful MCP handshake is not enough for MCP.ai: the hosted connector
    // still needs the user's provider account. Check it so "Test connection"
    // never paints a half-connected server green.
    const provider = stock.isMcpAi
      ? readCachedProviderStatus(stock.name) ?? (await fetchMcpAiProviderStatus(stock.name))
      : undefined;
    const providerNeedsLogin =
      provider?.state === 'needs-login' || provider?.state === 'needs-platform-auth';
    const readiness = computeReadiness(stock.name);

    if (providerNeedsLogin) {
      res.json({
        success: false,
        stage: 'provider',
        mcpName: stock.name,
        label: stock.label,
        toolCount: result.tools.length,
        tools: result.tools.slice(0, 25),
        error: provider?.detail ?? `Finish linking your ${stock.label} account.`,
        message: provider?.detail ?? `Finish linking your ${stock.label} account, then test again.`,
        provider,
        latencyMs,
        readiness,
      });
      return;
    }

    res.json({
      success: true,
      mcpName: stock.name,
      label: stock.label,
      toolCount: result.tools.length,
      tools: result.tools.slice(0, 25),
      message: result.tools.length
        ? `Connected. ${stock.label} exposes ${result.tools.length} tool${result.tools.length === 1 ? '' : 's'}.`
        : `Connected. ${stock.label} completed the MCP handshake.`,
      provider,
      latencyMs,
      readiness,
    });
  });

  return router;
}
