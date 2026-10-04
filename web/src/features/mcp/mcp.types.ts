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
  isCustom?: boolean;
}
