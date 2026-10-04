import { createHash, randomBytes } from 'node:crypto';
import { CoreDatabase } from '../core/database.db.js';

// ── MCP OAuth (authorization-code + PKCE, spec 2025-06-18) ─────────────────
// Implements the flow an MCP client is expected to perform against a remote
// server that answers 401:
//   1. WWW-Authenticate -> resource_metadata URL
//   2. protected-resource metadata -> authorization_servers[]
//   3. authorization-server metadata -> endpoints
//   4. dynamic client registration (RFC 7591) -> client_id
//   5. authorize URL with PKCE S256 + RFC 8707 `resource`
//   6. code -> token exchange, store access/refresh token
// No simulated or fabricated credentials are produced anywhere in this file.

const KEY = {
  access: (n: string) => `MCP_OAUTH_ACCESS__${n}`,
  refresh: (n: string) => `MCP_OAUTH_REFRESH__${n}`,
  expires: (n: string) => `MCP_OAUTH_EXPIRES__${n}`,
  clientId: (n: string) => `MCP_OAUTH_CLIENT_ID__${n}`,
  clientSecret: (n: string) => `MCP_OAUTH_CLIENT_SECRET__${n}`,
  scope: (n: string) => `MCP_OAUTH_SCOPE__${n}`,
  issuer: (n: string) => `MCP_OAUTH_ISSUER__${n}`,
  endpoint: (n: string) => `MCP_OAUTH_ENDPOINT__${n}`,
};

export type OAuthTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
};

function db() {
  return CoreDatabase.getInstance();
}

// ── PKCE ───────────────────────────────────────────────────────────────────

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function createPkce() {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

export function newState(): string {
  return base64url(randomBytes(24));
}

// ── Pending-authorization store (PKCE verifier + state, short lived) ──────

type Pending = {
  mcpName: string;
  verifier: string;
  state: string;
  redirectUri: string;
  clientId: string;
  clientSecret?: string;
  tokenEndpoint: string;
  resource: string;
  scope?: string;
  createdAt: number;
};

const PENDING_TTL_MS = 10 * 60 * 1000;
const pending = new Map<string, Pending>();

export function stashPending(p: Omit<Pending, 'createdAt'>) {
  // Opportunistic sweep so a long-lived server cannot accumulate entries.
  const cutoff = Date.now() - PENDING_TTL_MS;
  for (const [k, v] of pending) if (v.createdAt < cutoff) pending.delete(k);
  pending.set(p.state, { ...p, createdAt: Date.now() });
}

export function takePending(state: string): Pending | undefined {
  const hit = pending.get(state);
  pending.delete(state);
  if (!hit) return undefined;
  if (Date.now() - hit.createdAt > PENDING_TTL_MS) return undefined;
  return hit;
}

// ── Step 1-3: discovery ────────────────────────────────────────────────────

type AsMetadata = {
  issuer?: string;
  authorization_endpoint?: string;
  token_endpoint?: string;
  registration_endpoint?: string;
  code_challenge_methods_supported?: string[];
  response_types_supported?: string[];
  grant_types_supported?: string[];
  scopes_supported?: string[];
};

function absolutize(url: string, base: string): string {
  try { return new URL(url, base).toString(); } catch { return url; }
}

/**
 * All four spellings of a well-known metadata URL for an issuer, most specific
 * first: RFC 8414 (well-known before the path) and OIDC Discovery (appended
 * after the path), for both the OAuth and OpenID Connect document names.
 */
function wellKnownCandidates(issuerUrl: string, names: string[]): string[] {
  const u = new URL(issuerUrl);
  const path = u.pathname.replace(/\/+$/, '');
  const out: string[] = [];
  for (const name of names) {
    out.push(`${u.origin}/.well-known/${name}${path}`);
    if (path) out.push(`${u.origin}${path}/.well-known/${name}`);
    out.push(`${u.origin}/.well-known/${name}`);
  }
  return [...new Set(out)];
}

/** Pull the resource_metadata URL out of a WWW-Authenticate header. */
export function parseChallenge(header: string | null): string | null {
  if (!header) return null;
  const m = /resource_metadata\s*=\s*"([^"]+)"/i.exec(header);
  return m ? m[1] : null;
}

export type Discovery = {
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  registrationEndpoint?: string;
  scope?: string;
  resource: string;
};

type ResourceMetadata = {
  authorization_servers?: string[];
  scopes_supported?: string[];
};

/**
 * Fetch protected-resource metadata, falling back to the default well-known
 * locations when the 401 challenge omits `resource_metadata` (which several
 * real servers do, even though the spec points there).
 */
async function fetchResourceMetadata(
  mcpUrl: string,
  challengeUrl: string | null
): Promise<{ url: string; meta: ResourceMetadata }> {
  const candidates: string[] = [];
  if (challengeUrl) candidates.push(absolutize(challengeUrl, mcpUrl));

  const u = new URL(mcpUrl);
  candidates.push(new URL('/.well-known/oauth-protected-resource', u).toString());

  // Strip path segments one at a time, so /a/b/mcp also tries /a/b and /a.
  const segments = u.pathname.split('/').filter(Boolean);
  for (let i = segments.length; i >= 0; i--) {
    const partial = segments.slice(0, i).join('/');
    const root = partial ? `${u.origin}/${partial}` : u.origin;
    candidates.push(`${root}/.well-known/oauth-protected-resource`);
    candidates.push(`${root}/.well-known/oauth-protected-resource/mcp`);
  }

  const tried: string[] = [];
  for (const candidate of candidates) {
    if (tried.includes(candidate)) continue;
    tried.push(candidate);
    try {
      const r = await fetch(candidate, { signal: AbortSignal.timeout(15_000) });
      if (!r.ok) continue;
      const meta = (await r.json()) as ResourceMetadata;
      if (Array.isArray(meta.authorization_servers) && meta.authorization_servers.length) {
        return { url: candidate, meta };
      }
    } catch { /* try the next candidate */ }
  }

  throw new Error(
    `No OAuth protected-resource metadata found. Tried:\n  ${tried.join('\n  ')}\n` +
    `${mcpUrl} cannot be authorized automatically. Use a provider token instead.`
  );
}

export async function discover(mcpUrl: string): Promise<Discovery> {
  // Probe for the challenge if the caller has not already captured it.
  let challengeUrl = null as string | null;
  try {
    const probe = await fetch(mcpUrl, {
      method: 'GET',
      headers: { Accept: 'application/json, text/event-stream' },
      signal: AbortSignal.timeout(15_000),
    });
    challengeUrl = parseChallenge(probe.headers.get('www-authenticate'));
    await probe.body?.cancel().catch(() => {});
  } catch {
    // Network failure is handled by the metadata fetch below with a clearer error.
  }

  const { url: rmUrl, meta: rm } = await fetchResourceMetadata(mcpUrl, challengeUrl);
  const issuer = rm.authorization_servers![0];
  const issuerUrl = absolutize(issuer, rmUrl);
  // An issuer may or may not have a path component, and the two specs disagree on
  // where .well-known goes: RFC 8414 inserts it before the path, OIDC Discovery
  // appends it after. GitHub uses the OIDC form with a path
  // (/login/oauth/.well-known/openid-configuration), so try every combination
  // instead of only the root form, which silently failed for GitHub.
  const asUrl = wellKnownCandidates(issuerUrl, [
    'oauth-authorization-server',
    'openid-configuration',
  ]);

  let as: AsMetadata | null = null;
  let asFetchedFrom = '';
  for (const candidate of asUrl) {
    try {
      const r = await fetch(candidate, { signal: AbortSignal.timeout(15_000) });
      if (!r.ok) continue;
      const j = (await r.json()) as AsMetadata;
      if (j.authorization_endpoint && j.token_endpoint) {
        as = j;
        asFetchedFrom = issuerUrl;
        break;
      }
    } catch { /* try next well-known location */ }
  }
  if (!as) {
    throw new Error(`Could not read authorization-server metadata from ${issuerUrl}.`);
  }

  // Only reject when the server advertises the list and omits S256. GitHub
  // supports PKCE S256 but leaves code_challenge_methods_supported unpublished,
  // and an absent field is not a refusal.
  if (
    Array.isArray(as.code_challenge_methods_supported) &&
    as.code_challenge_methods_supported.length > 0 &&
    !as.code_challenge_methods_supported.includes('S256')
  ) {
    throw new Error('Authorization server does not support PKCE S256, which MCP requires.');
  }

  return {
    issuer: as.issuer ?? asFetchedFrom,
    authorizationEndpoint: as.authorization_endpoint!,
    tokenEndpoint: as.token_endpoint!,
    registrationEndpoint: as.registration_endpoint,
    scope: rm.scopes_supported?.join(' '),
    resource: mcpUrl,
  };
}

// ── Step 4: dynamic client registration ───────────────────────────────────

export async function registerClient(
  d: Discovery,
  redirectUri: string,
  clientName: string
): Promise<string> {
  if (!d.registrationEndpoint) {
    throw new Error(
      'Authorization server does not support dynamic client registration, so this app ' +
      'cannot obtain a client_id automatically.'
    );
  }

  const body = {
    client_name: clientName,
    redirect_uris: [redirectUri],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'client_secret_post',
    // MCP wants API scopes; openid is an OIDC concept and some providers reject it.
    scope: (d.scope ?? '').split(/\s+/).filter((x) => x && !x.startsWith('openid')).join(' ') || undefined,
    application_type: 'native',
  };

  const res = await fetch(d.registrationEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Dynamic client registration failed: HTTP ${res.status} ${txt.slice(0, 200)}`);
  }
  const json = (await res.json()) as { client_id?: string; client_secret?: string };
  if (!json.client_id) throw new Error('Client registration returned no client_id.');
  return json.client_id;
}


export type ClientCreds = { clientId: string; clientSecret?: string };

/** A user-supplied OAuth App, if they registered one for this provider. */
export function storedClientCreds(mcpName: string): ClientCreds | null {
  const clientId = db().getSetting(KEY.clientId(mcpName));
  if (!clientId) return null;
  const clientSecret = db().getSetting(KEY.clientSecret(mcpName)) || undefined;
  return { clientId, clientSecret };
}

/**
 * Resolve the client_id to authorize with.
 *
 * Preference order:
 *  1. an OAuth App the user registered and pasted in (GitHub and other
 *     providers that publish no registration_endpoint require this),
 *  2. a client_id we registered dynamically earlier for this same issuer,
 *  3. dynamic client registration.
 */
export async function ensureClient(
  mcpName: string,
  d: Discovery,
  redirectUri: string
): Promise<ClientCreds> {
  const stored = storedClientCreds(mcpName);
  if (stored) {
    const sameIssuer = db().getSetting(KEY.endpoint(mcpName)) === d.issuer;
    // A user-supplied secret always wins; a DCR id is only reused for its own issuer.
    if (stored.clientSecret || sameIssuer) {
      db().setSetting(KEY.endpoint(mcpName), d.issuer);
      return stored;
    }
  }

  const clientId = await registerClient(d, redirectUri, 'Smoke Monkey Canvas');
  db().setSetting(KEY.clientId(mcpName), clientId);
  db().setSetting(KEY.endpoint(mcpName), d.issuer);
  return { clientId };
}


// ── Step 5: authorize URL ─────────────────────────────────────────────────

export function buildAuthorizeUrl(
  d: Discovery,
  clientId: string,
  redirectUri: string,
  challenge: string,
  state: string
): string {
  const u = new URL(d.authorizationEndpoint);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('client_id', clientId);
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('code_challenge', challenge);
  u.searchParams.set('code_challenge_method', 'S256');
  u.searchParams.set('state', state);
  if (d.scope) u.searchParams.set('scope', d.scope);
  // RFC 8707: bind the token to this MCP resource.
  u.searchParams.set('resource', d.resource);
  return u.toString();
}

// ── Step 6: token exchange + refresh ──────────────────────────────────────

/**
 * POST to a token endpoint as a confidential client, then retry once as a public
 * PKCE client. Some providers register a client as public even when a secret is
 * supplied, and answer `401 invalid_client`; the correct response is to retry
 * without the secret rather than to report a failure.
 */
async function postTokenConfidential(
  tokenEndpoint: string,
  params: Record<string, string>,
  clientSecret?: string
): Promise<Response> {
  const send = async (useSecret: boolean) => {
    const body = new URLSearchParams(params);
    if (useSecret && clientSecret) body.set('client_secret', clientSecret);
    return fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: body.toString(),
      signal: AbortSignal.timeout(25_000),
    });
  };

  const first = await send(true);
  if (first.status !== 401 || !clientSecret) return first;

  const body = (await first.json().catch(() => ({}))) as {
    error?: string;
    error_description?: string;
  };
  if (!/invalid_client/i.test(`${body.error ?? ''} ${body.error_description ?? ''}`)) return first;
  return send(false);
}

async function postToken(
  tokenEndpoint: string,
  params: Record<string, string>,
  clientSecret?: string
): Promise<OAuthTokens> {
  const res = await postTokenConfidential(tokenEndpoint, params, clientSecret);
  const txt = await res.text();
  if (!res.ok) throw new Error(`Token request failed: HTTP ${res.status} ${txt.slice(0, 200)}`);

  const json = JSON.parse(txt) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
    error_description?: string;
  };
  if (!json.access_token) {
    throw new Error(
      `Token response contained no access_token${json.error ? ` (${json.error})` : ''}.`
    );
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: json.expires_in ? Date.now() + json.expires_in * 1000 : undefined,
    scope: json.scope,
  };
}

export async function exchangeCode(
  tokenEndpoint: string,
  code: string,
  verifier: string,
  clientId: string,
  redirectUri: string,
  resource: string,
  clientSecret?: string
): Promise<OAuthTokens> {
  return postToken(tokenEndpoint, {
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    // GitHub OAuth Apps are confidential clients and reject token requests that
    // omit the secret, even though the authorize leg used PKCE.
    ...(clientSecret ? { client_secret: clientSecret } : {}),
    code_verifier: verifier,
    resource,
  }, clientSecret);
}

// ── Credential validation ─────────────────────────────────────────────────

/** Human label for a credential env key, derived from its shape. */
export function credentialLabel(key: string): string {
  const known: Record<string, string> = {
    GITHUB_TOKEN: 'GitHub Personal Access Token',
    GITHUB_PERSONAL_ACCESS_TOKEN: 'GitHub Fine-grained Token',
    GITLAB_PERSONAL_ACCESS_TOKEN: 'GitLab Personal Access Token',
    SLACK_BOT_TOKEN: 'Slack Bot Token (xoxb-…)',
    DISCORD_BOT_TOKEN: 'Discord Bot Token',
    NOTION_API_KEY: 'Notion Integration Secret',
    FIGMA_ACCESS_TOKEN: 'Figma Personal Access Token',
    LINEAR_API_KEY: 'Linear API Key',
    SENTRY_AUTH_TOKEN: 'Sentry Auth Token',
    CLOUDFLARE_API_TOKEN: 'Cloudflare API Token',
    DATADOG_API_KEY: 'Datadog API Key',
    DD_API_KEY: 'Datadog API Key',
    DD_APP_KEY: 'Datadog App Key',
    PRODUCTHUNT_API_TOKEN: 'Product Hunt API Token',
    YOUTUBE_API_KEY: 'YouTube Data API Key',
    DEVTO_API_KEY: 'DEV.to API Key',
    HUBSPOT_ACCESS_TOKEN: 'HubSpot Private App Token',
    SALESFORCE_ACCESS_TOKEN: 'Salesforce Access Token',
    SALESFORCE_INSTANCE_URL: 'Salesforce Instance URL',
    REDDIT_CLIENT_ID: 'Reddit App Client ID',
    REDDIT_CLIENT_SECRET: 'Reddit App Client Secret',
    BLUESKY_HANDLE: 'Bluesky Handle (e.g. @you.bsky.social)',
    BLUESKY_APP_PASSWORD: 'Bluesky App Password',
    TWITTER_BEARER_TOKEN: 'X / Twitter Bearer Token',
    GOOGLE_CLIENT_ID: 'Google OAuth Client ID',
    GOOGLE_CLIENT_SECRET: 'Google OAuth Client Secret',
    JIRA_HOST: 'Jira Host (e.g. https://you.atlassian.net)',
    JIRA_API_TOKEN: 'Jira API Token',
    ZENDESK_SUBDOMAIN: 'Zendesk Subdomain',
    ZENDESK_API_TOKEN: 'Zendesk API Token',
    INTERCOM_ACCESS_TOKEN: 'Intercom Access Token',
    CHARGEBEE_API_KEY: 'Chargebee API Key',
    ATLASSIAN_ACCESS_TOKEN: 'Atlassian Access Token',
  };
  if (known[key]) return known[key];
  return key
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * Validate one credential value based on what its key implies.
 * Returns an error string, or null when the value is acceptable.
 */
export function validateCredential(key: string, raw: unknown): string | null {
  if (typeof raw !== 'string') return 'This field is required.';
  const value = raw.trim();
  if (!value) return 'This field is required.';

  const upper = key.toUpperCase();

  // Subdomain / workspace slug.
  if (upper.includes('SUBDOMAIN')) {
    if (!/^[a-z0-9][a-z0-9-]{1,62}$/i.test(value)) {
      return 'Use a subdomain such as "support" — letters, numbers and dashes only.';
    }
    return null;
  }

  // Anything that must be an absolute URL.
  if (
    upper.includes('_URL') || upper.endsWith('_HOST') ||
    upper.includes('ENDPOINT') || upper.includes('INSTANCE')
  ) {
    if (/^https?:\/\/[^\s]+$/.test(value)) return null;
    return 'Enter a full URL starting with https://';
  }

  // Atproto-style handle.
  if (upper.includes('HANDLE')) {
    if (/^@?[a-z0-9][a-z0-9.-]*$/i.test(value)) return null;
    return 'Enter an account handle, for example @you.bsky.social';
  }

  // Secrets / tokens / keys: opaque, but reject obvious mistakes early.
  if (upper.includes('SECRET') || upper.includes('TOKEN') || upper.includes('KEY') || upper.includes('PASSWORD')) {
    if (/\s/.test(value)) return 'Tokens cannot contain spaces.';
    if (value.length < 8) return `Too short — this looks incomplete (${value.length} characters).`;
    return null;
  }

  if (value.length < 3) return 'Too short to be valid.';
  return null;
}

export type CredentialCheck = {
  ok: boolean;
  values: Record<string, string>;
  errors: Record<string, string>;
};

/** Validate every key a stock MCP declares as required. */
export function validateCredentials(
  requiredKeys: string[],
  input: Record<string, unknown>
): CredentialCheck {
  const values: Record<string, string> = {};
  const errors: Record<string, string> = {};
  for (const key of requiredKeys) {
    const err = validateCredential(key, input?.[key]);
    if (err) errors[key] = err;
    else values[key] = String(input[key]).trim();
  }
  return { ok: Object.keys(errors).length === 0, values, errors };
}

// ── Storage ───────────────────────────────────────────────────────────────

export function saveTokens(mcpName: string, t: OAuthTokens) {
  db().setSetting(KEY.access(mcpName), t.accessToken);
  if (t.refreshToken) db().setSetting(KEY.refresh(mcpName), t.refreshToken);
  if (t.expiresAt) db().setSetting(KEY.expires(mcpName), String(t.expiresAt));
  if (t.scope) db().setSetting(KEY.scope(mcpName), t.scope);
}

export function clearTokens(mcpName: string) {
  for (const k of [KEY.access, KEY.refresh, KEY.expires, KEY.scope]) {
    db().setSetting(k(mcpName), '');
  }
}

export type StoredAuth = {
  connected: boolean;
  expired?: boolean;
  scope?: string;
};

/** True only when a real token is present and not past its expiry. */
export function authStatus(mcpName: string): StoredAuth {
  const access = db().getSetting(KEY.access(mcpName));
  if (!access) return { connected: false };
  const exp = Number(db().getSetting(KEY.expires(mcpName)) || 0);
  return {
    connected: true,
    expired: exp ? Date.now() > exp : false,
    scope: db().getSetting(KEY.scope(mcpName)) ?? undefined,
  };
}

/**
 * Returns a usable access token, transparently refreshing it when expired.
 * This is the only source of bearer tokens for remote MCP servers.
 */
export async function getAccessToken(
  mcpName: string,
  mcpUrl: string
): Promise<string | null> {
  const status = authStatus(mcpName);
  if (!status.connected) return null;
  if (!status.expired) return db().getSetting(KEY.access(mcpName));

  const refreshToken = db().getSetting(KEY.refresh(mcpName));
  const clientId = db().getSetting(KEY.clientId(mcpName));
  const issuer = db().getSetting(KEY.endpoint(mcpName));
  if (!refreshToken || !clientId || !issuer) return null;

  // Re-discover to find the (possibly rotated) token endpoint.
  const d = await discover(mcpUrl);
  const tokens = await postToken(
    d.tokenEndpoint,
    {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      resource: d.resource,
    },
    db().getSetting(KEY.clientSecret(mcpName)) || undefined
  );
  saveTokens(mcpName, tokens);
  return tokens.accessToken;
}