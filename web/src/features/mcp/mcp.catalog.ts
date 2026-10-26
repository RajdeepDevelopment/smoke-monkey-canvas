import type { StockMcp } from './mcp.types.js';

/** The catalog ID agents should attach for this entry. */
export function canonicalMcpName(mcp: Pick<StockMcp, 'name' | 'canonicalName'>): string {
  return mcp.canonicalName || mcp.name;
}

/**
 * Resolve either a legacy/manual name or a canonical ID to the stock entry that
 * should be shown/attached. Unknown custom names fall through unchanged.
 */
export function resolveStockMcp(stockMcps: StockMcp[], name: string): StockMcp | undefined {
  const exact = stockMcps.find((mcp) => mcp.name === name);
  if (!exact) return undefined;
  const canonical = canonicalMcpName(exact);
  return stockMcps.find((mcp) => mcp.name === canonical) || exact;
}

/**
 * Catalog entries to show in the library. Legacy aliases stay in the data for
 * already-attached agents, but only their canonical entry appears in the list.
 */
export function canonicalStockMcps(stockMcps: StockMcp[]): StockMcp[] {
  const names = new Set(stockMcps.map((mcp) => mcp.name));
  return stockMcps.filter((mcp) => {
    const canonical = canonicalMcpName(mcp);
    return canonical === mcp.name || !names.has(canonical);
  });
}

/**
 * Look up every stock name (canonical and legacy) to the canonical entry so
 * agent cards can render icons/details without exposing duplicate entries.
 */
export function buildStockMcpLookup(stockMcps: StockMcp[]): Map<string, StockMcp> {
  const byName = new Map(stockMcps.map((mcp) => [mcp.name, mcp]));
  const lookup = new Map<string, StockMcp>();
  for (const mcp of stockMcps) {
    const canonical = byName.get(canonicalMcpName(mcp)) || mcp;
    lookup.set(mcp.name, canonical);
  }
  return lookup;
}
