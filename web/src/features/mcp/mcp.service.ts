import type {
  StockMcp,
  McpReadiness,
  McpDisconnectResult,
  McpConnectResult,
  McpAiProviderStatus,
} from './mcp.types.js';

export class McpService {
  static async fetchStockMcps(): Promise<StockMcp[]> {
    const res = await fetch('/api/mcp/stock');
    if (!res.ok) throw new Error('Failed to load stock MCPs');
    return res.json();
  }

  static async fetchStatus(): Promise<Record<string, McpReadiness>> {
    const res = await fetch('/api/mcp/status');
    if (!res.ok) throw new Error('Failed to load MCP status');
    return res.json();
  }

  /**
   * MCP.ai layer two: ask whether the provider account (Telegram, Linear, …)
   * is linked. `refresh` calls MCP.ai's `connect` tool instead of using cache.
   */
  static async fetchProviderStatus(
    mcpName: string,
    refresh = false
  ): Promise<McpAiProviderStatus> {
    const res = await fetch(
      `/api/mcp/oauth/${encodeURIComponent(mcpName)}/provider${refresh ? '?refresh=1' : ''}`
    );
    const data = (await res.json().catch(() => ({}))) as McpAiProviderStatus & { error?: string };
    if (!res.ok) throw new Error(data.error || 'Failed to check the provider account');
    return data;
  }

  /**
   * Start the browser OAuth flow for a server.
   *
   * The server performs discovery, dynamic client registration and PKCE, then
   * hands back the provider's consent URL. `launch: 'server'` asks it to open
   * the OS browser itself; otherwise the caller opens `authorizationUrl`.
   */
  static async connect(
    mcpName: string,
    opts?: { launch?: 'server' | 'client' }
  ): Promise<McpConnectResult> {
    const res = await fetch(`/api/mcp/oauth/${encodeURIComponent(mcpName)}/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts ?? {}),
    });
    const data = (await res.json().catch(() => ({}))) as McpConnectResult;
    if (!res.ok && !data.status) {
      throw new Error(data.error || 'Failed to start the connect flow');
    }
    return data;
  }

  /** Revoke a server's OAuth tokens and clear any stored credential values. */
  static async disconnect(mcpName: string): Promise<McpDisconnectResult> {
    const res = await fetch(`/api/mcp/oauth/${encodeURIComponent(mcpName)}/disconnect`, {
      method: 'POST',
    });
    const data = (await res.json().catch(() => ({}))) as McpDisconnectResult;
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to disconnect');
    return data;
  }
}
