import { spawn } from 'node:child_process';
import { platform } from 'node:os';

// ── OS browser launcher ────────────────────────────────────────────────────
// `mcp-remote` solves "the MCP needs a browser login" by opening the system
// browser itself from the process that owns the OAuth client. The canvas
// server is the process that owns the OAuth client, so it can do the same:
// hand the consent page to the user's default browser and let the callback
// come back to the local server.
//
// This is best-effort by design. A deployment where the server runs on a
// different machine than the browser (or a headless box) must not be blocked
// by a failed spawn, so the caller always keeps the authorization URL and can
// open it in the client instead.

function launchCommand(url: string): { cmd: string; args: string[] } {
  switch (platform()) {
    case 'darwin':
      return { cmd: 'open', args: [url] };
    case 'win32':
      // `start` treats the first quoted argument as the window title, so an
      // empty string is required before the URL.
      return { cmd: 'cmd', args: ['/c', 'start', '', url] };
    default:
      return { cmd: 'xdg-open', args: [url] };
  }
}

/**
 * Open `url` in the operating system's default browser.
 * Returns true when the launcher was spawned (not proof the page rendered).
 */
export function openInSystemBrowser(url: string): boolean {
  if (!url) return false;
  const { cmd, args } = launchCommand(url);
  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
    child.on('error', () => {
      /* The browser is optional; the caller keeps the URL as a fallback. */
    });
    child.unref();
    return true;
  } catch {
    return false;
  }
}
