/**
 * Desktop runtime bridge for Tauri
 * Resolves API/WebSocket URLs and provides non-blocking stream transport
 * when running inside Smoke Monkey Canvas Desktop.
 */

declare global {
  interface Window {
    __SMOKE_MONKEY_TOKEN__?: string | null;
  }
}

/**
 * Per-install bearer token (see server/features/core/auth.server.ts). Cached
 * in memory for the life of the page, resolved once at boot from, in order:
 *   1. the global the server injects into index.html — only for local UI
 *      requests, never for a publicly reachable deployment;
 *   2. a `#token=` URL fragment — how remote/self-hosted deployments hand the
 *      token to a browser once (the fragment is never sent to the server, so
 *      it stays out of proxy access logs; it is stripped and persisted);
 *   3. a legacy `?token=` query param, same handling;
 *   4. localStorage — so a reload doesn't need the URL again;
 *   5. the loopback-gated bootstrap endpoint (needed for the packaged Tauri
 *      build, which loads its bundled assets from the framework's own origin
 *      rather than the server, so never gets the injected global).
 */
const AUTH_TOKEN_STORAGE_KEY = 'smoke-monkey.auth-token';

/**
 * Header used to send the bearer token. Deliberately not `Authorization`, so a
 * reverse proxy (e.g. Caddy basic_auth) can use that header for its own auth.
 */
const AUTH_TOKEN_HEADER = 'X-Smoke-Monkey-Token';

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

let cachedAuthToken: string | null = null;

export function getCachedAuthToken(): string | null {
  return cachedAuthToken;
}

function readStoredAuthToken(): string | null {
  try {
    return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeAuthToken(token: string): void {
  try {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } catch {
    // Storage can be unavailable (private mode); the in-memory cache still works.
  }
}

/**
 * Read one query-style parameter without `URLSearchParams`' form semantics:
 * that API turns a literal `+` into a space, which corrupts base64 tokens.
 * Percent-encoded values (including `%2B`) still decode correctly.
 */
function readTokenParam(raw: string): string | null {
  for (const pair of raw.split('&')) {
    const eq = pair.indexOf('=');
    if (eq === -1) continue;
    let key: string;
    try {
      key = decodeURIComponent(pair.slice(0, eq));
    } catch {
      continue;
    }
    if (key !== 'token') continue;
    try {
      return decodeURIComponent(pair.slice(eq + 1)) || null;
    } catch {
      return null;
    }
  }
  return null;
}

function readAuthTokenFromUrl(): string | null {
  // Prefer the fragment: unlike the query string it is never sent to the
  // server or written to access logs by a proxy.
  const hash = window.location.hash || '';
  if (hash.length > 1) {
    const hashToken = readTokenParam(hash.slice(1));
    if (hashToken) {
      stripUrlToken();
      return hashToken;
    }
  }
  let url: URL;
  try {
    url = new URL(window.location.href);
  } catch {
    return null;
  }
  const token = readTokenParam(url.search.slice(1));
  if (!token) return null;
  url.searchParams.delete('token');
  try {
    window.history.replaceState({}, '', url.toString());
  } catch {
    // Some runtimes don't support history manipulation; the token still works.
  }
  return token;
}

function stripUrlToken(): void {
  try {
    window.history.replaceState({}, '', window.location.pathname + window.location.search);
  } catch {
    // Some runtimes don't support history manipulation; the token still works.
  }
}

/**
 * Credentials may travel over plain HTTP only to the loopback interface.
 * Anything else must use HTTPS — otherwise an on-path observer can read the
 * installation token from a LAN/public HTTP deployment.
 */
function isCredentialSafeUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value, window.location.origin);
  } catch {
    return false;
  }
  if (url.protocol === 'https:' || url.protocol === 'wss:') return true;
  return (
    (url.protocol === 'http:' || url.protocol === 'ws:') &&
    LOOPBACK_HOSTNAMES.has(url.hostname.toLowerCase())
  );
}

export async function ensureAuthToken(): Promise<string | null> {
  if (cachedAuthToken) return cachedAuthToken;
  if (typeof window !== 'undefined' && window.__SMOKE_MONKEY_TOKEN__) {
    cachedAuthToken = window.__SMOKE_MONKEY_TOKEN__;
    return cachedAuthToken;
  }
  const urlToken = readAuthTokenFromUrl();
  if (urlToken) {
    storeAuthToken(urlToken);
    cachedAuthToken = urlToken;
    return cachedAuthToken;
  }
  const stored = readStoredAuthToken();
  if (stored) {
    cachedAuthToken = stored;
    return cachedAuthToken;
  }
  try {
    const base = isTauri() ? `${DESKTOP_API_BASE}/api` : getApiBaseUrl();
    if (!isCredentialSafeUrl(`${base}/auth/token`)) {
      console.warn(
        '[DesktopBridge] Not fetching the auth token over non-HTTPS, non-loopback HTTP. Use HTTPS for remote deployments.',
      );
      return null;
    }
    const res = await fetch(`${base}/auth/token`);
    if (res.ok) {
      const data = (await res.json()) as { token: string | null };
      cachedAuthToken = data.token;
      // Not persisted: this token can rotate (e.g. a reset database), and the
      // injected global / bootstrap route already cover the next page load.
    }
  } catch (err) {
    console.warn('[DesktopBridge] Failed to bootstrap auth token:', err);
  }
  return cachedAuthToken;
}

export function isTauri(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    '__TAURI_INTERNALS__' in window ||
    '__TAURI__' in window ||
    window.location.protocol === 'tauri:' ||
    window.location.hostname === 'tauri.localhost' ||
    window.location.origin.includes('tauri')
  );
}

export const DESKTOP_API_BASE = 'http://localhost:3333';

/**
 * True when running inside Tauri but served from the dev server, where no
 * bundled Info.plist exists. macOS terminates a process that touches the
 * speech or microphone services without their usage-description keys, so
 * privacy-sensitive Web APIs must be skipped in this state.
 */
export function isTauriDevShell(): boolean {
  if (typeof window === 'undefined') return false;
  // Packaged builds resolve to `tauri://localhost` / `http://tauri.localhost`.
  return isTauri() && !window.location.origin.includes('tauri');
}

export function getApiBaseUrl(): string {
  if (isTauri()) {
    return `${DESKTOP_API_BASE}/api`;
  }
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
    window.location.port !== '3333'
  ) {
    return `${DESKTOP_API_BASE}/api`;
  }
  return '/api';
}

export function getWsUrl(): string {
  // The token travels in the WebSocket subprotocols (getWsProtocols), not the
  // URL: browsers can't set headers on the upgrade request, and a `?token=`
  // param would be written to proxy access logs.
  if (isTauri()) {
    return 'ws://localhost:3333/ws';
  }
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
    window.location.port !== '3333'
  ) {
    return 'ws://localhost:3333/ws';
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Subprotocol values for `new WebSocket(getWsUrl(), getWsProtocols())`. The
 * server reads `smoke-monkey-token.<base64url(token)>` from
 * Sec-WebSocket-Protocol (see auth.server.ts) and still accepts `?token=` for
 * CLI clients.
 */
export function getWsProtocols(): string[] {
  if (!cachedAuthToken) return [];
  // Same transport rule as HTTP: never put the token on a cleartext socket.
  if (!isCredentialSafeUrl(getWsUrl())) return [];
  return [`smoke-monkey-token.${toBase64Url(cachedAuthToken)}`];
}

/**
 * Check if a URL points to an external web target.
 */
export function isExternalUrl(url: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();

  // In-app internal navigations, hashes, or actions
  if (
    trimmed.startsWith('#') ||
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:')
  ) {
    return false;
  }

  // Explicit protocols that should always open in the system browser
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('//')
  ) {
    try {
      const parsed = new URL(trimmed, window.location.href);
      // In Tauri desktop, internal origins are tauri://localhost or http://tauri.localhost
      if (
        parsed.origin === window.location.origin ||
        parsed.hostname === 'tauri.localhost' ||
        parsed.protocol === 'tauri:'
      ) {
        return false;
      }
      return true;
    } catch {
      return true;
    }
  }

  return false;
}

/**
 * Open external URL in user's default OS browser.
 * Never navigates or replaces current desktop screen.
 */
export async function openExternalLink(url: string): Promise<void> {
  if (!url || !isExternalUrl(url)) return;

  if (isTauri()) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tauri = (window as any).__TAURI__;
      if (tauri?.core?.invoke) {
        await tauri.core.invoke('open_system_link', { url });
        return;
      }
    } catch (err) {
      console.warn('[DesktopBridge] open_system_link invoke failed:', err);
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tauriInternals = (window as any).__TAURI_INTERNALS__;
      if (tauriInternals?.invoke) {
        await tauriInternals.invoke('open_system_link', { url });
        return;
      }
    } catch (err) {
      console.warn('[DesktopBridge] tauri internals invoke failed:', err);
    }
  }

  // Web fallback or if Tauri invoke fails
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Initialize global external link interception.
 * Intercepts normal clicks, Cmd+clicks, Ctrl+clicks, Shift+clicks,
 * and middle-clicks on any link, forwarding them to the default OS browser.
 */
export function initExternalLinkHandling(): void {
  if (typeof window === 'undefined') return;

  const handleLinkClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const anchor = target.closest('a');
    if (!anchor) return;

    const rawHref = anchor.getAttribute('href');
    if (!rawHref) return;

    const isTargetBlank = anchor.getAttribute('target') === '_blank';
    const isExternal = isExternalUrl(rawHref) || isExternalUrl(anchor.href) || isTargetBlank;

    if (isExternal) {
      // Cancel standard browser navigation so the canvas screen is NEVER replaced
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();

      const targetUrl = anchor.href || rawHref;
      void openExternalLink(targetUrl);
    }
  };

  // Register in capture phase so it runs before any React or DOM bubbling handler
  document.addEventListener('click', handleLinkClick, true);
  document.addEventListener('auxclick', handleLinkClick, true);

  // Override window.open inside desktop environment so programmatic opens go to OS browser
  if (isTauri()) {
    const originalWindowOpen = window.open;
    window.open = function (url?: string | URL, target?: string, features?: string): Window | null {
      if (url) {
        const urlStr = typeof url === 'string' ? url : url.href;
        if (isExternalUrl(urlStr)) {
          void openExternalLink(urlStr);
          return null;
        }
      }
      return originalWindowOpen.call(window, url, target, features);
    };
  }

  console.log('[DesktopBridge] Global external link interception active');
}

/**
 * Initialize the API bridge.
 *
 * Always patches window.fetch (not just inside Tauri) for two reasons:
 *   1. Inside Tauri, it rewrites relative /api and /ws requests to the
 *      bundled backend's own origin (http://localhost:3333), same as before.
 *   2. In every runtime, it attaches the per-install bearer token to requests
 *      targeting our own API — see server/features/core/auth.server.ts.
 *      Without this, every one of the ~30 call sites across agent.service.ts,
 *      space.service.ts, etc. would need its own change to send the token.
 */
export function initDesktopBridge(): void {
  if (typeof window === 'undefined') return;

  const originalFetch = window.fetch.bind(window);
  const tauri = isTauri();
  // Only our own API may receive the token. `getApiBaseUrl()` is absolute for
  // the Tauri build and the Vite dev server (both talk to :3333 cross-origin)
  // and relative otherwise, in which case the page origin is the API origin.
  const apiBaseUrl = tauri ? `${DESKTOP_API_BASE}/api` : getApiBaseUrl();
  let apiOrigin = window.location.origin;
  try {
    apiOrigin = new URL(apiBaseUrl, window.location.origin).origin;
  } catch {
    // keep the page origin
  }

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    let isApiRequest = false;

    if (typeof url === 'string') {
      if (url.startsWith('/api') || url.startsWith('/ws')) {
        isApiRequest = true;
        if (tauri) url = `${DESKTOP_API_BASE}${url}`;
      } else if (url.includes('/api/')) {
        isApiRequest = true;
        if (tauri) url = url.replace(/^.*\/api\//, `${DESKTOP_API_BASE}/api/`);
      }
    }

    if (isApiRequest && cachedAuthToken && typeof url === 'string' && !url.endsWith('/auth/token')) {
      // The `/api/` substring also appears in unrelated URLs (e.g. a repo
      // called `api` on github.com), so check the origin before attaching a
      // credential. Plain HTTP is allowed only for loopback; anything else
      // must be HTTPS or the token would cross the network in cleartext.
      // The bootstrap endpoint stays unauthenticated by design.
      let targetsOwnApi = false;
      try {
        const target = new URL(url, window.location.origin);
        targetsOwnApi = target.origin === apiOrigin && isCredentialSafeUrl(target.href);
      } catch {
        targetsOwnApi = false;
      }
      if (targetsOwnApi) {
        const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
        if (!headers.has(AUTH_TOKEN_HEADER)) {
          headers.set(AUTH_TOKEN_HEADER, cachedAuthToken);
        }
        init = { ...init, headers };
      }
    }

    return originalFetch(url, init);
  };

  if (tauri) {
    initExternalLinkHandling();
    console.log('[DesktopBridge] Initialized for Tauri desktop runtime');
  }
}

/**
 * Native non-blocking streaming fetch via Tauri Rust invoke.
 * Used for direct SSE or streaming data transfers.
 */
export async function nativeFetchStreaming(
  path: string,
  method: string = 'GET',
  headers: Record<string, string> = {},
  body: string | null = null,
  signal?: AbortSignal,
): Promise<Response> {
  if (!isTauri()) {
    return fetch(path, { method, headers, body: body || undefined, signal });
  }

  const streamId = `stream_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tauri = (window as any).__TAURI__;
  if (!tauri || !tauri.core || !tauri.event) {
    return fetch(path.startsWith('/api') ? `${DESKTOP_API_BASE}${path}` : path, {
      method,
      headers,
      body: body || undefined,
      signal,
    });
  }

  const { invoke } = tauri.core;
  const { listen } = tauri.event;

  let headerData: string | null = null;
  const dataChunks: string[] = [];
  let resolveHeaders: (() => void) | null = null;
  let resolveData: (() => void) | null = null;
  let resolveDone: (() => void) | null = null;
  let rejectAll: ((err: Error) => void) | null = null;

  const unlistenHeaders = await listen('proxy-headers', (e: { payload: { stream_id: string; data: string } }) => {
    if (e.payload.stream_id !== streamId) return;
    headerData = e.payload.data;
    resolveHeaders?.();
  });

  const unlistenData = await listen('proxy-data', (e: { payload: { stream_id: string; data: string } }) => {
    if (e.payload.stream_id !== streamId) return;
    dataChunks.push(e.payload.data);
    resolveData?.();
  });

  const unlistenDone = await listen('proxy-done', (e: { payload: { stream_id: string } }) => {
    if (e.payload.stream_id !== streamId) return;
    resolveDone?.();
  });

  const unlistenError = await listen('proxy-error', (e: { payload: { stream_id: string; message: string } }) => {
    if (e.payload.stream_id !== streamId) return;
    rejectAll?.(new Error(e.payload.message));
  });

  const cleanup = () => {
    unlistenHeaders();
    unlistenData();
    unlistenDone();
    unlistenError();
  };

  if (signal) {
    signal.addEventListener('abort', () => {
      rejectAll?.(new Error('Aborted'));
    });
  }

  const resultPromise = invoke('proxy_fetch_streaming', {
    req: { url: path, method, headers, body: body || null },
    streamId,
  }) as Promise<{ status: number; headers: Record<string, string> }>;

  await new Promise<void>((resolve, reject) => {
    resolveHeaders = resolve;
    rejectAll = reject;
    resultPromise.catch((err) => reject(err instanceof Error ? err : new Error(String(err))));
    setTimeout(() => reject(new Error('Stream header timeout')), 45000);
  });

  const result = await resultPromise;

  const stream = new ReadableStream({
    start(controller) {
      if (headerData) {
        controller.enqueue(new TextEncoder().encode(headerData));
      }

      const drain = () => {
        while (dataChunks.length > 0) {
          const chunk = dataChunks.shift()!;
          controller.enqueue(new TextEncoder().encode(chunk));
        }
      };

      const interval = setInterval(() => {
        drain();
      }, 10);

      resolveDone = () => {
        drain();
        clearInterval(interval);
        try { controller.close(); } catch {}
        cleanup();
      };

      rejectAll = (err: Error) => {
        clearInterval(interval);
        try { controller.error(err); } catch {}
        cleanup();
      };

      resolveData = () => {
        drain();
      };
    },
  });

  return new Response(stream, {
    status: result.status || 200,
    headers: new Headers(result.headers),
  });
}

/**
 * Pick a directory using Tauri native OS folder dialog.
 * Returns the absolute directory path string or null if cancelled / not running in Tauri.
 */
export async function pickNativeDirectory(title: string = 'Select Working Directory'): Promise<string | null> {
  if (!isTauri()) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tauri = (window as any).__TAURI__;
    if (tauri?.dialog?.open) {
      const res = await tauri.dialog.open({ directory: true, multiple: false, title });
      if (typeof res === 'string' && res) return res;
    }
  } catch (err) {
    console.warn('[DesktopBridge] tauri.dialog.open failed:', err);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tauri = (window as any).__TAURI__;
    if (tauri?.core?.invoke) {
      const res = await tauri.core.invoke('plugin:dialog|open', {
        directory: true,
        multiple: false,
        title,
      });
      if (typeof res === 'string' && res) return res;
    }
  } catch (err) {
    console.warn('[DesktopBridge] plugin:dialog|open invoke failed:', err);
  }

  return null;
}

/**
 * Register a listener for Tauri desktop native menu actions.
 * Returns an unlisten cleanup function.
 */
export function onMenuAction(callback: (actionId: string) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const windowHandler = (e: Event) => {
    const customEvent = e as CustomEvent<string>;
    if (customEvent.detail) callback(customEvent.detail);
  };
  window.addEventListener('canvas-menu-action', windowHandler);

  let disposed = false;
  let unlistenTauri: (() => void) | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tauri = (window as any).__TAURI__;
  if (tauri?.event?.listen) {
    tauri.event
      .listen('menu-action', (event: { payload: string }) => {
        if (typeof event.payload === 'string') {
          callback(event.payload);
        }
      })
      .then((unlistenFn: () => void) => {
        // The effect that owns this listener may have unmounted before the
        // async listen() resolved. Never leak the native listener in that case.
        if (disposed) {
          unlistenFn();
          return;
        }
        unlistenTauri = unlistenFn;
      })
      .catch((err: unknown) => {
        console.warn('[DesktopBridge] Failed to bind menu-action listener:', err);
      });
  }

  return () => {
    disposed = true;
    window.removeEventListener('canvas-menu-action', windowHandler);
    if (unlistenTauri) unlistenTauri();
  };
}
