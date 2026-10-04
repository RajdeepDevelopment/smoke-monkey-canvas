export interface StockMcp {
  name: string;
  label: string;
  category: string;
  description: string;
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
}
