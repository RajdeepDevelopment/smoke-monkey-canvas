/**
 * Desktop runtime bridge for Tauri
 * Resolves API/WebSocket URLs and provides non-blocking stream transport
 * when running inside Smoke Monkey Canvas Desktop.
 */

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

export function getApiBaseUrl(): string {
  if (isTauri()) {
    return `${DESKTOP_API_BASE}/api`;
  }
  return '/api';
}

export function getWsUrl(): string {
  if (isTauri()) {
    return `ws://localhost:3333/ws`;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
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
 * Initialize Desktop Bridge
 * Intercepts relative /api requests inside Tauri webview so all
 * standard fetch() calls seamlessly route to the local Canvas server.
 */
export function initDesktopBridge(): void {
  if (typeof window === 'undefined' || !isTauri()) return;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    if (typeof url === 'string') {
      if (url.startsWith('/api') || url.startsWith('/ws')) {
        url = `${DESKTOP_API_BASE}${url}`;
      } else if (url.includes('/api/')) {
        url = url.replace(/^.*\/api\//, `${DESKTOP_API_BASE}/api/`);
      }
    }

    return originalFetch(url, init);
  };

  initExternalLinkHandling();
  console.log('[DesktopBridge] Initialized for Tauri desktop runtime');
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
        unlistenTauri = unlistenFn;
      })
      .catch((err: unknown) => {
        console.warn('[DesktopBridge] Failed to bind menu-action listener:', err);
      });
  }

  return () => {
    window.removeEventListener('canvas-menu-action', windowHandler);
    if (unlistenTauri) unlistenTauri();
  };
}
