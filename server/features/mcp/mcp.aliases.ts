/**
 * Legacy/manual MCP names and their MCP.ai equivalents. Kept dependency-free so
 * the stock catalog, attach routes, and UI can all resolve the same canonical
 * server without importing the OAuth/database layer.
 */
export const MCP_ALIASES: Record<string, string[]> = {
  gcal: ['mcpai-googlecalendar', 'google-calendar'],
  'google-calendar': ['mcpai-googlecalendar', 'gcal'],
  'mcpai-googlecalendar': ['gcal', 'google-calendar'],
  gmail: ['mcpai-gmail'],
  'mcpai-gmail': ['gmail'],
  'google-drive-mcp': ['mcpai-googledrive', 'google-drive'],
  'google-drive': ['mcpai-googledrive', 'google-drive-mcp'],
  'mcpai-googledrive': ['google-drive-mcp', 'google-drive'],
  'slack-mcp': ['mcpai-slack', 'slack'],
  slack: ['mcpai-slack', 'slack-mcp'],
  'mcpai-slack': ['slack-mcp', 'slack'],
  'notion-mcp-server': ['mcpai-notion', 'notion'],
  notion: ['mcpai-notion', 'notion-mcp-server'],
  'mcpai-notion': ['notion-mcp-server', 'notion'],
  'github-mcp-server': ['mcpai-github', 'github'],
  github: ['mcpai-github', 'github-mcp-server'],
  'mcpai-github': ['github-mcp-server', 'github'],
  yahoo_finance: ['mcpai-yahoo_finance', 'yahoo-finance'],
  'yahoo-finance': ['mcpai-yahoo_finance', 'yahoo_finance'],
  'mcpai-yahoo_finance': ['yahoo_finance', 'yahoo-finance'],
  quickbooks: ['mcpai-quickbooks', 'quickbooks-mcp'],
  'quickbooks-mcp': ['mcpai-quickbooks', 'quickbooks'],
  'mcpai-quickbooks': ['quickbooks', 'quickbooks-mcp'],
};

/**
 * Pick the catalog entry agents should use for a name. Prefer hosted MCP.ai
 * entries when they exist, otherwise keep the legacy/manual name.
 */
export function selectCanonicalMcpName(
  name: string,
  isAvailable: (candidate: string) => boolean,
): string {
  const candidates = [name, ...(MCP_ALIASES[name] ?? [])].filter(isAvailable);
  return candidates.find((candidate) => candidate.startsWith('mcpai-')) ?? name;
}
