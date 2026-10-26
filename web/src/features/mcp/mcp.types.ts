export interface StockMcp {
  name: string;
  label: string;
  category: string;
  description: string;
  whenToUse?: string;
  toolsCount?: number;
  command?: string;
  args?: string[];
  url?: string;
  envKeys: string[];
  authType?: 'none' | 'api_key' | 'oauth';
  oauthProvider?: string;
  keyGetUrl?: string;
  keyGetLabel?: string;
  /** Per-env-var "get this key" link; an entry can need keys from several vendors. */
  keyLinks?: Record<string, { url: string; label: string }>;
  isCustom?: boolean;
  iconUrl?: string;
  /** True if this MCP comes from the mcp.ai catalog (hosted OAuth service). */
  isMcpAi?: boolean;
  /** Preferred catalog ID for a legacy alias (for example `gmail` -> `mcpai-gmail`). */
  canonicalName?: string;
}

export type McpReadinessState =
  | 'ready'
  | 'failed'
  | 'unverified'
  | 'needs-key'
  | 'needs-oauth'
  | 'needs-provider-auth'
  | 'custom';

export type McpAiProviderState =
  | 'connected'
  | 'needs-login'
  | 'needs-platform-auth'
  | 'unknown'
  | 'error';

export interface McpAiProviderStatus {
  state: McpAiProviderState;
  authenticated: boolean;
  connectUrl?: string;
  pending: unknown[];
  detail?: string;
  checkedAt?: number;
}

export interface McpProbeStatus {
  ok: boolean;
  stage: string;
  detail: string;
  toolCount: number;
  latencyMs: number;
  checkedAt: number;
}

export interface McpDisconnectResult {
  success: boolean;
  message?: string;
  error?: string;
  clearedOAuth?: boolean;
  clearedCredentials?: string[];
}

export interface McpReadiness {
  mcpName: string;
  label: string;
  stock: boolean;
  configured: boolean;
  missingKeys: string[];
  oauth: { connected: boolean; expired?: boolean; scope?: string };
  /** MCP.ai only: whether the underlying provider account is linked. */
  provider?: McpAiProviderStatus;
  state: McpReadinessState;
  probe?: McpProbeStatus;
}

export type McpConnectStatus =
  | 'connected'
  | 'awaiting-auth'
  | 'needs-client'
  | 'needs-token'
  | 'failed';

export interface McpConnectResult {
  success: boolean;
  mcpName?: string;
  status?: McpConnectStatus;
  /** The provider's consent URL — open this to finish the sign-in. */
  authorizationUrl?: string;
  /** True when the server opened the OS browser itself. */
  browserOpened?: boolean;
  message?: string;
  error?: string;
  required?: string[];
}
