import type { StockMcp } from './mcp.types.js';

export class McpService {
  static async fetchStockMcps(): Promise<StockMcp[]> {
    const res = await fetch('/api/mcp/stock');
    if (!res.ok) throw new Error('Failed to load stock MCPs');
    return res.json();
  }
}
