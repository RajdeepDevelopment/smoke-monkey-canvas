import { STOCK_MCPS, type StockMcp } from './mcp.stock.js';
import {
  authStatus,
  buildAuthorizeUrl,
  canonicalRedirectUri,
  createPkce,
  discover,
  ensureClient,
  newState,
  stashPending,
  storedClientCreds,
  MCP_ALIASES,
} from './mcp.oauth.js';
import { openInSystemBrowser } from './mcp.browser.js';

// ── One-click browser authorization for remote MCP servers ─────────────────
// The canvas server is the OAuth client: it performs discovery, dynamic client
// registration and PKCE, and can hand the provider's consent page to the
// operating system's browser. That is the same trick `mcp-remote` uses, and it
// is what lets a single Connect click work in the desktop app, where the
// embedded webview refuses to open windows.
//
// Nothing here fabricates credentials: every token comes from the provider's
// own token endpoint.

export type ConnectOutcome =
  | { status: 'connected'; message: string }
  | { status: 'awaiting-auth'; authorizationUrl: string; browserOpened: boolean; message: string }
  | { status: 'needs-client'; reason: string; message: string }
  | { status: 'needs-token'; required: string[]; message: string }
  | { status: 'failed'; reason: string; message: string };

/** Why a provider that speaks OAuth still cannot be authorized automatically. */
export function noDcrReason(stock: { label: string; url?: string }): string {
  return (
    `${stock.label} supports OAuth, but its authorization server does not offer dynamic ` +
    'client registration. That means this app cannot create its own OAuth client ' +
    'automatically -- a host application has to bring its own.\n\n' +
    'Register an OAuth App with ' + stock.label + ', set its callback URL to\n' +
    '    ' + callbackHint(stock) +
    '\nthen paste the Client ID and Client Secret. After that, Connect runs the ' +
    'real OAuth sign-in and no access token is ever typed by hand.'
  );
}

export function callbackHint(stock: { url?: string }): string {
  // The provider matches this string exactly, so it has to be the same URI the
  // server will send in the authorize request.
  const callback = canonicalRedirectUri();
  const host = stock.url ? new URL(stock.url).host : 'localhost:3333';
  return `${callback}  (on ${host})`;
}

/**
 * Run the authorization-code + PKCE flow up to the point where the provider's
 * consent page is reachable.
 */
export async function beginAuthorization(
  mcpName: string,
  stock: StockMcp,
  redirectUri: string
): Promise<
  | { ok: true; authorizationUrl: string }
  | { ok: false; reason: string; needsClient: boolean }
> {
  try {
    const d = await discover(stock.url!);

    // Providers that publish metadata but no registration_endpoint (GitHub, for
    // one) still speak OAuth -- they just require the host app to bring its own
    // OAuth App. Offer that path instead of degrading straight to a pasted token.
    if (!d.registrationEndpoint && !storedClientCreds(mcpName)) {
      return { ok: false, reason: noDcrReason(stock), needsClient: true };
    }

    const { clientId, clientSecret, redirectUri: effectiveRedirect } = await ensureClient(
      mcpName,
      d,
      redirectUri
    );
    const { verifier, challenge } = createPkce();
    const state = newState();

    // The URI the client is registered with is the one the provider will
    // accept -- not necessarily the one this request computed.
    stashPending({
      state, mcpName, verifier, redirectUri: effectiveRedirect, clientId, clientSecret,
      tokenEndpoint: d.tokenEndpoint, resource: d.resource,
    });

    return {
      ok: true,
      authorizationUrl: buildAuthorizeUrl(d, clientId, effectiveRedirect, challenge, state),
    };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
      needsClient: false,
    };
  }
}

/**
 * Drive the whole connect flow for a stock server.
 *
 * `redirectUri` must point back at this server's callback route, because the
 * provider sends the authorization code there.
 */
export async function startConnect(
  mcpName: string,
  opts: { redirectUri: string; launch?: 'server' | 'client' }
): Promise<ConnectOutcome> {
  // Resolve exact stock names and explicit legacy aliases only. Do not infer
  // names by prefixing or normalizing them; that can silently pick a different
  // server that merely looks similar.
  const exactStock = STOCK_MCPS.find((s) => s.name === mcpName);
  const aliasNames = MCP_ALIASES[mcpName] ?? [];
  const candidates = [
    exactStock,
    ...aliasNames.map((name) => STOCK_MCPS.find((s) => s.name === name)),
  ].filter((s): s is (typeof STOCK_MCPS)[number] => !!s);

  let stock =
    candidates.find((s) => s.isMcpAi && s.url && !s.url.includes('googleapis.com')) ||
    candidates.find((s) => s.url && !s.url.includes('googleapis.com')) ||
    exactStock;
  let effectiveName = stock?.name ?? mcpName;

  if (!stock) {
    return {
      status: 'failed',
      reason: 'MCP not found',
      message: `"${mcpName}" is not a known MCP server.`,
    };
  }

  if (authStatus(mcpName).connected || (effectiveName !== mcpName && authStatus(effectiveName).connected)) {
    return {
      status: 'connected',
      message: `${stock.label} is already connected.`,
    };
  }

  if (!stock.url) {
    // A local stdio server has no browser consent to drive -- it reads a
    // token or API key from the environment instead.
    return {
      status: 'needs-token',
      required: stock.envKeys ?? [],
      message: `${stock.label} runs locally and needs ${
        (stock.envKeys ?? []).length > 1 ? 'credentials' : 'a token'
      } rather than a browser sign-in.`,
    };
  }

  const started = await beginAuthorization(effectiveName, stock, opts.redirectUri);
  if (!started.ok) {
    if (started.needsClient) {
      return {
        status: 'needs-client',
        reason: started.reason,
        message: `${stock.label} needs its own OAuth App before it can be connected.`,
      };
    }
    return {
      status: 'failed',
      reason: started.reason,
      message: `Could not start the OAuth flow for ${stock.label}.`,
    };
  }

  const browserOpened =
    opts.launch === 'server' ? openInSystemBrowser(started.authorizationUrl) : false;

  return {
    status: 'awaiting-auth',
    authorizationUrl: started.authorizationUrl,
    browserOpened,
    message: `Finish signing in to ${stock.label} in the browser.`,
  };
}
