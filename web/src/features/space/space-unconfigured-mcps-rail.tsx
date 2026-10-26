import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  KeyRound,
  Loader2,
  ShieldAlert,
  Users,
  X,
  Zap,
} from 'lucide-react';
import type { SpaceAgentEntity } from '../agent/agent.types.js';
import type { StockMcp, McpReadiness } from '../mcp/mcp.types.js';
import { getBrandVisuals, McpBrandIcon } from '../common/brand-icons.js';
import { AgentAvatar } from '../agent/agent-avatar.js';
import { formatMcpDisplayName } from '../library/agent-resource-badges.js';

export interface SpaceUnconfiguredMcpItem {
  mcpName: string;
  stockMcp?: StockMcp;
  label: string;
  authType?: string;
  missingRequirements: string;
  affectedAgents: Array<{
    id: string;
    name: string;
    role?: string | null;
  }>;
}

export const MCP_ALIAS_LOOKUP: Record<string, string[]> = {
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
  excel: ['mcpai-excel', 'microsoft-excel'],
  'microsoft-excel': ['mcpai-excel', 'excel'],
  'mcpai-excel': ['excel', 'microsoft-excel'],
};

export function computeSpaceUnconfiguredMcps(
  memberAgents: SpaceAgentEntity[],
  stockMcps: StockMcp[] = [],
  mcpReadiness: Record<string, McpReadiness> = {},
  configuredKeys: Record<string, boolean> = {},
): SpaceUnconfiguredMcpItem[] {
  const stockMap = new Map<string, StockMcp>();
  for (const m of stockMcps) {
    stockMap.set(m.name, m);
    const norm = m.name.toLowerCase().replace(/-mcp-server$/i, '').replace(/-mcp$/i, '');
    if (!stockMap.has(norm)) stockMap.set(norm, m);
  }

  const unconfiguredMap = new Map<string, SpaceUnconfiguredMcpItem>();

  for (const agent of memberAgents) {
    const mcpNames = new Set<string>();
    if (Array.isArray(agent.mcps) && agent.mcps.length > 0) {
      for (const rec of agent.mcps) {
        if (rec.mcp_name) mcpNames.add(rec.mcp_name);
      }
    }
    const recMcps = (agent as any).recommended_mcps;
    if (Array.isArray(recMcps)) {
      for (const name of recMcps) {
        if (name) mcpNames.add(name);
      }
    }

    for (const mcpName of mcpNames) {
      const aliases = MCP_ALIAS_LOOKUP[mcpName] ?? [];

      // Check readiness for mcpName or its aliases
      const readiness =
        mcpReadiness[mcpName] ||
        (aliases.map((a) => mcpReadiness[a]).find(Boolean));

      // ALWAYS prefer the hosted mcp.ai stock version if available!
      let stockMcp: StockMcp | undefined;
      const mcpaiAlias = aliases.find((a) => a.startsWith('mcpai-')) || (mcpName.startsWith('mcpai-') ? mcpName : `mcpai-${mcpName}`);
      if (mcpaiAlias && stockMap.has(mcpaiAlias)) {
        stockMcp = stockMap.get(mcpaiAlias);
      } else if (stockMap.has(mcpName)) {
        stockMcp = stockMap.get(mcpName);
      } else {
        for (const al of aliases) {
          if (stockMap.has(al)) {
            stockMcp = stockMap.get(al);
            break;
          }
        }
      }

      let isConfigured = false;
      if (readiness?.configured || readiness?.state === 'ready') {
        isConfigured = true;
      } else if (stockMcp) {
        if (stockMcp.isMcpAi || stockMcp.authType === 'oauth' || stockMcp.url?.includes('mcp.ai')) {
          isConfigured = Boolean(readiness?.oauth?.connected);
        } else {
          isConfigured = Boolean(
            stockMcp.isCustom ||
              stockMcp.envKeys.length === 0 ||
              stockMcp.envKeys.every((k) => Boolean(configuredKeys[k])),
          );
        }
      }

      if (!isConfigured) {
        // Group by canonical key so that gcal and mcpai-googlecalendar are recognized as the same service!
        const canonicalKey = stockMcp?.name || (mcpaiAlias && stockMap.has(mcpaiAlias) ? mcpaiAlias : mcpName);
        if (!unconfiguredMap.has(canonicalKey)) {
          const label = stockMcp?.label || formatMcpDisplayName(mcpName);
          const isOAuth =
            readiness?.state === 'needs-oauth' ||
            stockMcp?.authType === 'oauth' ||
            stockMcp?.isMcpAi ||
            stockMcp?.url?.includes('mcp.ai');

          let missingRequirements = 'Credentials not configured';
          if (isOAuth) {
            missingRequirements = 'OAuth Sign-In';
          } else if (stockMcp?.envKeys && stockMcp.envKeys.length > 0) {
            const missing = stockMcp.envKeys.filter((k) => !configuredKeys[k]);
            missingRequirements = missing.length > 0 ? missing.join(', ') : stockMcp.envKeys.join(', ');
          }

          unconfiguredMap.set(canonicalKey, {
            mcpName: canonicalKey,
            stockMcp,
            label,
            authType: isOAuth ? 'oauth' : stockMcp?.authType,
            missingRequirements,
            affectedAgents: [],
          });
        }

        const entry = unconfiguredMap.get(canonicalKey)!;
        if (!entry.affectedAgents.some((a) => a.id === agent.id)) {
          entry.affectedAgents.push({
            id: agent.id,
            name: agent.name,
            role: agent.role,
          });
        }
      }
    }
  }

  return Array.from(unconfiguredMap.values());
}

export interface SpaceUnconfiguredMcpsRailProps {
  memberAgents: SpaceAgentEntity[];
  stockMcps?: StockMcp[];
  mcpReadiness?: Record<string, McpReadiness>;
  configuredKeys?: Record<string, boolean>;
  spaceColor?: string;
  connectingMcpName?: string | null;
  onConnectMcp?: (mcp: StockMcp, agentId?: string) => Promise<void> | void;
  onRemoveMcp?: (mcpName: string, affectedAgentIds: string[]) => Promise<void> | void;
  onOpenAgent?: (agent: SpaceAgentEntity) => void;
}

export const SpaceUnconfiguredMcpsRail: React.FC<SpaceUnconfiguredMcpsRailProps> = ({
  memberAgents,
  stockMcps = [],
  mcpReadiness = {},
  configuredKeys = {},
  spaceColor = '#38bdf8',
  connectingMcpName,
  onConnectMcp,
  onRemoveMcp,
  onOpenAgent,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [connectingLocalName, setConnectingLocalName] = useState<string | null>(null);

  const unconfiguredList = useMemo(
    () => computeSpaceUnconfiguredMcps(memberAgents, stockMcps, mcpReadiness, configuredKeys),
    [memberAgents, stockMcps, mcpReadiness, configuredKeys],
  );

  // If there are no member agents placed in this space yet, don't show the rail
  if (!memberAgents || memberAgents.length === 0) {
    return null;
  }

  // If all agents are fully configured, show a compact all-ready indicator
  if (unconfiguredList.length === 0) {
    return (
      <div
        className="space-unconfigured-rail space-rail-all-ready nodrag nopan nowheel"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        title="All MCP integrations for agents in this space are configured and ready."
      >
        <div className="space-rail-ready-pill">
          <CheckCircle2 size={13} color="#10b981" />
          <span>All MCPs Ready</span>
        </div>
      </div>
    );
  }

  // Collapsed state: slim floating vertical pill pinned to the right edge
  if (collapsed) {
    return (
      <div
        className="space-unconfigured-rail space-rail-collapsed nodrag nopan nowheel"
        onClick={(e) => {
          e.stopPropagation();
          setCollapsed(false);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        title={`${unconfiguredList.length} unconfigured MCPs in this space. Click to expand setup panel.`}
      >
        <button
          type="button"
          className="space-rail-collapsed-btn"
          aria-label="Expand unconfigured MCPs panel"
        >
          <AlertTriangle size={13} className="space-rail-alert-icon" />
          <span className="space-rail-badge-count">{unconfiguredList.length}</span>
          <span className="space-rail-collapsed-label">MCPs Pending</span>
          <ChevronRight size={13} className="space-rail-expand-chevron" />
        </button>
      </div>
    );
  }

  // Expanded panel: full vertical height matching the space node
  return (
    <div
      className="space-unconfigured-rail space-rail-expanded nodrag nopan nowheel"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      style={{ '--space-accent': spaceColor } as React.CSSProperties}
    >
      {/* ── Rail Header ── */}
      <div className="space-rail-header">
        <div className="space-rail-header-title">
          <div className="space-rail-icon-glow">
            <ShieldAlert size={14} color="#f59e0b" />
          </div>
          <span className="space-rail-title-text">Required Integrations</span>
          <span className="space-rail-count-pill">{unconfiguredList.length}</span>
        </div>

        <button
          type="button"
          className="space-rail-collapse-btn"
          onClick={(e) => {
            e.stopPropagation();
            setCollapsed(true);
          }}
          title="Minimize panel"
          aria-label="Minimize panel"
        >
          <ChevronRight size={13} />
        </button>
      </div>

      <div className="space-rail-desc">
        Connect missing credentials to enable autonomous agent execution &amp; cron jobs in this space.
      </div>

      {/* ── Scrollable Unconfigured MCPs List with isolated wheel scrolling ── */}
      <div
        className="space-rail-cards nowheel nodrag nopan"
        onWheel={(e) => {
          e.stopPropagation();
        }}
      >
        {unconfiguredList.map((item) => {
          const brand = getBrandVisuals(`${item.label} ${item.mcpName}`, 26);
          const isOAuth =
            item.authType === 'oauth' ||
            item.stockMcp?.authType === 'oauth' ||
            item.stockMcp?.isMcpAi ||
            item.stockMcp?.url?.includes('mcp.ai');

          const stockMcpCandidate: StockMcp = item.stockMcp || {
            name: item.mcpName,
            label: item.label,
            category: 'Integrations',
            description: `Connect credentials for ${item.label}`,
            envKeys: [],
            authType: isOAuth ? 'oauth' : 'api_key',
            url: isOAuth ? 'https://api.mcp.ai/explore' : undefined,
            isMcpAi: isOAuth,
          };

          const isConnecting =
            connectingLocalName === item.mcpName ||
            connectingMcpName === item.mcpName ||
            Boolean(item.stockMcp && connectingMcpName === item.stockMcp.name);

          return (
            <div key={item.mcpName} className="space-unconfigured-card">
              {/* Top: Prominent Brand Tile + Name & Requirement Badge */}
              <div className="space-mcp-top">
                <div
                  className="space-mcp-brand-tile"
                  style={{
                    background: brand.bgColor,
                    borderColor: brand.borderColor,
                    boxShadow: `0 4px 12px -2px ${brand.glowColor}`,
                  }}
                >
                  <McpBrandIcon
                    mcp={stockMcpCandidate}
                    size={26}
                    fallback={brand.icon || <Zap size={16} color="#f59e0b" />}
                  />
                </div>

                <div className="space-mcp-meta">
                  <div className="space-mcp-name-row">
                    <span className="space-mcp-name" title={item.label}>
                      {item.label}
                    </span>
                    <span
                      className={`space-mcp-req-tag ${isOAuth ? 'is-oauth' : 'is-key'}`}
                      title={item.missingRequirements}
                    >
                      {isOAuth ? 'OAuth Login' : 'API Key'}
                    </span>
                  </div>

                  {!isOAuth && item.missingRequirements !== 'Credentials not configured' && (
                    <div className="space-mcp-missing-keys" title={item.missingRequirements}>
                      <KeyRound size={10} />
                      <span className="space-mcp-key-text">{item.missingRequirements}</span>
                    </div>
                  )}

                  {isOAuth && (
                    <div className="space-mcp-oauth-hint">
                      <span>Browser Sign-In Required</span>
                    </div>
                  )}
                </div>

                {onRemoveMcp && (
                  <button
                    type="button"
                    className="space-mcp-remove-card-btn"
                    title={`Remove ${item.label} from this space (${item.affectedAgents.length} ${
                      item.affectedAgents.length === 1 ? 'agent' : 'agents'
                    })`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveMcp(
                        item.mcpName,
                        item.affectedAgents.map((a) => a.id),
                      );
                    }}
                    aria-label={`Remove ${item.label}`}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Middle: Affected Member Agents */}
              <div className="space-mcp-affected-section">
                <div className="space-mcp-affected-header">
                  <Users size={10} />
                  <span>
                    Required by {item.affectedAgents.length}{' '}
                    {item.affectedAgents.length === 1 ? 'agent' : 'agents'}:
                  </span>
                </div>
                <div className="space-mcp-affected-agents">
                  {item.affectedAgents.map((ag) => {
                    const fullAgent = memberAgents.find((a) => a.id === ag.id);
                    return (
                      <div
                        key={ag.id}
                        className="space-mcp-agent-pill"
                        title={`${ag.name}${ag.role ? ` — ${ag.role}` : ''} (Click to open agent)`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (fullAgent && onOpenAgent) {
                            onOpenAgent(fullAgent);
                          }
                        }}
                      >
                        <AgentAvatar agentId={ag.id} size={15} className="space-mcp-agent-avatar" />
                        <span className="space-mcp-agent-name">{ag.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom: Action Connect Button with Loader & Ultra-Premium Finish */}
              <div className="space-mcp-card-actions">
                <button
                  type="button"
                  className={`space-mcp-connect-btn ${isOAuth ? 'btn-oauth' : 'btn-key'} ${
                    isConnecting ? 'is-connecting' : ''
                  }`}
                  disabled={isConnecting}
                  onClick={async (e) => {
                    e.stopPropagation();
                    setConnectingLocalName(item.mcpName);
                    try {
                      await onConnectMcp?.(stockMcpCandidate, item.affectedAgents[0]?.id);
                    } finally {
                      setTimeout(() => {
                        setConnectingLocalName((prev) => (prev === item.mcpName ? null : prev));
                      }, 2000);
                    }
                  }}
                  title={`Connect ${item.label} (activates for all ${item.affectedAgents.length} agents in space)`}
                >
                  {isConnecting ? (
                    <>
                      <Loader2 size={13} className="space-rail-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : isOAuth ? (
                    <>
                      <ExternalLink size={12} />
                      <span>Connect {item.label}</span>
                    </>
                  ) : (
                    <>
                      <KeyRound size={12} />
                      <span>Configure {item.label}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer ── */}
      <div className="space-rail-footer-note">
        Configuring any MCP here activates it for all agents sharing that service.
      </div>
    </div>
  );
};
