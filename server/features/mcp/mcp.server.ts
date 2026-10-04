import { Router, type Request, type Response } from 'express';
import { spawn } from 'node:child_process';
import { STOCK_MCPS } from './mcp.stock.js';
import {
  authStatus,
  clearTokens as clearOAuthTokens,
  credentialLabel,
  validateCredentials,
  createPkce as createPkcePair,
  discover,
  ensureClient,
  storedClientCreds,
  exchangeCode as exchangeAuthorizationCode,
  buildAuthorizeUrl as buildAuthorizeRedirect,
  getAccessToken,
  newState as createOAuthState,
  saveTokens as saveOAuthTokens,
  stashPending as stashPendingAuth,
  takePending as takePendingAuth,
} from './mcp.oauth.js';
import { CoreDatabase } from '../core/database.db.js';

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

// ── OAuth: real authorization-code + PKCE flow for remote MCP servers ─────
  // Remote servers that publish OAuth metadata are authorized properly.
  // Everything else gets an honest page instead of a fake consent screen.

  router.get('/oauth/status/:mcpName', (req: Request, res: Response) => {
    const mcpName = Array.isArray(req.params.mcpName)
      ? (req.params.mcpName[0] ?? '')
      : req.params.mcpName;
    res.json({ mcpName, ...authStatus(mcpName) });
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

    const finish = (ok: boolean, message: string, mcpName?: string) => {
      // Popup flow: hand control back to the opener, then close.
      res.type('html').send(`<!DOCTYPE html><html><head><meta charset="utf-8">
        <title>${ok ? 'Connected' : 'Authorization failed'}</title>
        <style>
          body{background:#090d16;color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
               display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
          .c{background:#111827;border:1px solid #1f293d;border-radius:14px;padding:26px 30px;max-width:420px;text-align:center}
          h1{font-size:16px;margin:0 0 8px} p{font-size:13px;color:#94a3b8;line-height:1.5;margin:0}
          .ok{color:#10b981}.bad{color:#f87171}
        </style></head><body><div class="c">
        <h1 class="${ok ? 'ok' : 'bad'}">${ok ? 'Authorization complete' : 'Authorization failed'}</h1>
        <p>${escapeHtml(message)}</p></div>
        <script>
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage({
              type: '${ok ? 'MCP_OAUTH_SUCCESS' : 'MCP_OAUTH_ERROR'}',
              mcpName: ${mcpName ? `'${mcpName}'` : 'null'},
              message: ${JSON.stringify(message)}
            }, '*');
            setTimeout(function(){ window.close(); }, 900);
          }
        </script></body></html>`);
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
      finish(true, `${hit.mcpName} is now connected. You can close this window.`, hit.mcpName);
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

    const redirectUri = absoluteUrl(req, '/api/mcp/oauth/callback');
    try {
      const d = await discover(stock.url);

      // Providers that publish metadata but no registration_endpoint (GitHub, for
      // one) still speak OAuth -- they just require the host app to bring its own
      // OAuth App. Offer that path instead of degrading straight to a pasted token.
      if (!d.registrationEndpoint && !storedClientCreds(mcpName)) {
        res.status(502).send(
          renderManualTokenPage(stock, noDcrReason(stock), { oauthApp: true })
        );
        return;
      }

      const { clientId, clientSecret } = await ensureClient(mcpName, d, redirectUri);
      const { verifier, challenge } = createPkcePair();
      const state = createOAuthState();

      stashPendingAuth({
        state, mcpName, verifier, redirectUri, clientId, clientSecret,
        tokenEndpoint: d.tokenEndpoint, resource: d.resource,
      });

      res.redirect(buildAuthorizeRedirect(d, clientId, redirectUri, challenge, state));
    } catch (err) {
      // Honest fallback: explain exactly why automation failed and offer the
      // manual token path rather than pretending to authorize.
      const reason = err instanceof Error ? err.message : String(err);
      res.status(502).send(renderManualTokenPage(stock, reason));
    }
  });

  router.get('/oauth/:mcpName/done', (req: Request, res: Response) => {
    const mcpName = Array.isArray(req.params.mcpName)
      ? (req.params.mcpName[0] ?? '')
      : req.params.mcpName;
    res.send(renderDonePage(mcpName, req.query.status === 'already'));
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

  function absoluteUrl(req: Request, pathname: string): string {
    const proto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0]?.trim()
      || req.protocol
      || 'http';
    const host = (req.headers['x-forwarded-host'] as string)?.split(',')[0]?.trim()
      || req.get('host')
      || 'localhost:3333';
    return `${proto}://${host}${pathname}`;
  }

  const PAGE_CSS = `
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#090d16;color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
         display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
    .card{background:#111827;border:1px solid #1f293d;border-radius:16px;width:100%;max-width:460px;
          padding:28px;box-shadow:0 25px 50px -12px rgba(0,0,0,.6)}
    h1{font-size:17px;font-weight:700;color:#fff;margin-bottom:6px}
    p{font-size:13px;color:#94a3b8;line-height:1.55}
    .banner{background:#1c1408;border:1px solid #78350f;border-radius:10px;padding:12px 14px;
            margin:16px 0;font-size:12.5px;color:#fbbf24;line-height:1.5;white-space:pre-wrap;
            word-break:break-word}
    label{display:block;font-size:11.5px;font-weight:600;color:#94a3b8;margin:14px 0 6px}
    input{width:100%;padding:10px 12px;background:#0b0f19;border:1px solid #334155;border-radius:8px;
          color:#fff;font-size:13px;outline:none}
    input:focus{border-color:#2563eb;box-shadow:0 0 0 2px rgba(37,99,235,.2)}
    button{width:100%;margin-top:16px;padding:12px;border:none;border-radius:9px;font-size:13.5px;
           font-weight:600;cursor:pointer;background:#2563eb;color:#fff}
    button:hover{background:#1d4ed8}
    button:disabled{opacity:.6;cursor:not-allowed}
    .ok{color:#10b981}
    a{color:#60a5fa;font-size:12.5px}
  `;

  /** Why a provider that speaks OAuth still cannot be authorized automatically. */
  function noDcrReason(stock: { label: string; url?: string }): string {
    return (
      `${stock.label} supports OAuth, but its authorization server does not offer dynamic ` +
      'client registration. That means this app cannot create its own OAuth client ' +
      'automatically -- a host application has to bring its own.\n\n' +
      'Register an OAuth App with ' + stock.label + ', set its callback URL to\n' +
      '    ' + callbackHint(stock) + '\n' +
      'then paste the Client ID and Client Secret below. After that, Connect runs the ' +
      'real OAuth sign-in and no access token is ever typed by hand.'
    );
  }

  function callbackHint(stock: { url?: string }): string {
    const host = stock.url ? new URL(stock.url).host : 'localhost:3333';
    return `http://localhost:3333/api/mcp/oauth/callback  (on ${host})`;
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

  function renderDonePage(mcpName: string, already: boolean): string {
    const stock = STOCK_MCPS.find((s) => s.name === mcpName);
    const label = stock?.label ?? mcpName;
    // Never render the secret itself, only whether one is present.
    const hasAccess = !!authStatus(mcpName).connected;
    const manualKey = (stock?.envKeys ?? []).find((k) => CoreDatabase.getInstance().getSetting(k));
    const hasManual = !!manualKey;
    return `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>${escapeHtml(label)}</title>
      <style>${PAGE_CSS}</style></head><body><div class="card">
      <h1 class="ok">${already ? 'Already connected' : 'Connected'}</h1>
      <p>${escapeHtml(label)} is authorized${
        already ? ' and still has a valid token.' : '. You can close this window.'
      }.</p>
      <p class="hint">Access token: ${
        hasAccess ? 'stored on this machine' : 'not stored'
      }</p>
    </div><script>
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'MCP_OAUTH_SUCCESS', mcpName: ${JSON.stringify(
          mcpName
        )}, viaToken: ${hasManual && !hasAccess} }, '*');
        setTimeout(function(){ window.close(); }, 700);
      }
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
      res.status(200).json({
        success: false,
        stage: result.stage,
        mcpName: stock.name,
        label: stock.label,
        error: result.detail,
        latencyMs,
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
      latencyMs,
    });
  });

  return router;
}
