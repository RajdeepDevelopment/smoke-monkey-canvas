import React, { useState, useMemo, useEffect } from 'react';
import {
  X, ChevronLeft, Search, Plus, KeyRound, CheckCircle2, ArrowRight,
  Wrench, Check, Copy, Bot, ExternalLink, Star, LogOut, Loader2, Building2, Network, Cpu
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getBrandVisuals, McpBrandIcon } from '../../common/brand-icons.js';
import { openExternalLink } from '../../../config/desktop.bridge.js';
import type { StockMcp, McpReadiness } from '../../mcp/mcp.types.js';
import { buildStockMcpLookup } from '../../mcp/mcp.catalog.js';
import type { AgentTemplate } from '../../agent/agent.templates.js';
import { ENTERPRISE_AGENT_TEMPLATES } from '../../agent/agent.templates.js';
import type {
  LibraryTab,
  StockSkillItem,
  ToolKit,
  PromptPreset,
} from '../library.types.js';
import { PLUGIN_CATEGORY_ORDER } from '../library.types.js';
import { agentCategoryColor } from '../library.icons.js';
import { AgentAvatar } from '../../agent/agent-avatar.js';
import { STOCK_SKILLS, TOOL_KITS, SPACE_PRESETS, ROLE_ZONE_PRESETS, HIERARCHICAL_CHAINS } from '../library.data.js';
import { LIB_TAB_ICONS, LIB_TAB_COLORS, personalityPresetIcon, outputPresetIcon, pluginCategoryColor } from '../library.icons.js';
import { CUSTOM_PLUGINS, pluginToSkillItem, formatStars, VERIFIED_AT } from '../library.plugins.js';
import { LibGlyph, GhAvatar } from '../library-glyph.js';
import { AgentResourceRows } from '../agent-resource-badges.js';
import type { RoleZone } from '../../space/space.types.js';

/** Curated GitHub plugins are static, so their skill directives are built once. */
const PLUGIN_SKILLS: StockSkillItem[] = CUSTOM_PLUGINS.map(pluginToSkillItem);

export interface LibrarySidebarMobileProps {
  activeTab: LibraryTab | null;
  onSelectTab: (tab: LibraryTab | null) => void;
  stockMcps: StockMcp[];
  configuredKeys: Record<string, boolean>;
  serverStockSkills?: StockSkillItem[];
  customMcps: StockMcp[];
  customSkills: StockSkillItem[];
  customAgents: AgentTemplate[];
  customToolkits: ToolKit[];
  personalityPresets: PromptPreset[];
  outputStylePresets: PromptPreset[];
  onConnectKey: (mcp: StockMcp) => void;
  onDisconnectKey?: (mcp: StockMcp) => void;
  mcpReadiness?: Record<string, McpReadiness>;
  onSpawnTemplate?: (template: AgentTemplate) => void;
  connectingMcpName?: string | null;
  roleZones?: RoleZone[];
  onClose: () => void;
}

export const LibrarySidebarMobile: React.FC<LibrarySidebarMobileProps> = ({
  activeTab,
  stockMcps,
  configuredKeys,
  serverStockSkills = [],
  customMcps,
  customSkills,
  customAgents,
  customToolkits,
  personalityPresets,
  outputStylePresets,
  onConnectKey,
  onDisconnectKey,
  mcpReadiness,
  onSpawnTemplate,
  connectingMcpName,
  roleZones = [],
  onClose,
}) => {
  const [selectedItem, setSelectedItem] = useState<{ kind: LibraryTab; item: any } | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [skillSource, setSkillSource] = useState<'all' | 'stock' | 'plugins'>('all');
  const AGENT_PAGE_SIZE = 60;
  const [agentVisibleCount, setAgentVisibleCount] = useState(AGENT_PAGE_SIZE);
  // The imported catalogue has thousands of entries; render a first page.
  const [showAllMcps, setShowAllMcps] = useState(false);
  useEffect(() => {
    setShowAllMcps(false);
  }, [searchQuery, selectedCategory]);

  // Combined lists with full fallback catalogs
  const allMcps = useMemo(() => [...customMcps, ...stockMcps], [customMcps, stockMcps]);
  const catalogMcpMap = useMemo(() => buildStockMcpLookup(allMcps), [allMcps]);
  
  const allSkills = useMemo(() => {
    const combined = [...customSkills, ...serverStockSkills];
    const existingIds = new Set(combined.map((s) => s.id));
    for (const sk of STOCK_SKILLS) {
      if (!existingIds.has(sk.id)) {
        combined.push(sk);
      }
    }
    return combined;
  }, [customSkills, serverStockSkills]);

  const allAgents = useMemo(() => {
    const combined = [...customAgents];
    const existingIds = new Set(combined.map((a) => a.id));
    for (const tmpl of ENTERPRISE_AGENT_TEMPLATES) {
      if (!existingIds.has(tmpl.id)) {
        combined.push(tmpl);
      }
    }
    return combined;
  }, [customAgents]);

  const allToolkits = useMemo(() => {
    const combined = [...customToolkits];
    const existingIds = new Set(combined.map((t) => t.id));
    for (const tk of TOOL_KITS) {
      if (!existingIds.has(tk.id)) {
        combined.push(tk);
      }
    }
    return combined;
  }, [customToolkits]);

  const allPersonas = useMemo(() => personalityPresets, [personalityPresets]);
  const allOutputs = useMemo(() => outputStylePresets, [outputStylePresets]);

  // Categories based on active tab
  const categories = useMemo(() => {
    if (activeTab === 'mcp') {
      const set = new Set(allMcps.map((m) => m.category || 'Other'));
      return ['All', ...Array.from(set).sort()];
    }
    if (activeTab === 'skills') {
      if (skillSource === 'plugins') return ['All', ...PLUGIN_CATEGORY_ORDER];
      const set = new Set(allSkills.map((s) => s.category || 'Other'));
      return ['All', ...Array.from(set).sort()];
    }
    if (activeTab === 'agents') {
      const set = new Set(allAgents.map((a) => a.category || 'General'));
      return ['All', ...Array.from(set).sort()];
    }
    if (activeTab === 'personality') {
      const set = new Set(allPersonas.map((p) => p.category || 'Persona'));
      return ['All', ...Array.from(set).sort()];
    }
    if (activeTab === 'output') {
      const set = new Set(allOutputs.map((o) => o.category || 'Style'));
      return ['All', ...Array.from(set).sort()];
    }
    return ['All'];
  }, [activeTab, skillSource, allMcps, allSkills, allAgents, allPersonas, allOutputs]);

  // Filtered items
  const filteredMcps = useMemo(() => {
    return allMcps.filter((m) => {
      const matchCat = selectedCategory === 'All' || m.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchQ = !q || m.name.toLowerCase().includes(q) || (m.label || '').toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [allMcps, selectedCategory, searchQuery]);

  const filteredSkills = useMemo(() => {
    return allSkills.filter((s) => {
      const matchCat = selectedCategory === 'All' || s.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchQ = !q || s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [allSkills, selectedCategory, searchQuery]);

  const filteredPlugins = useMemo(() => {
    return PLUGIN_SKILLS.filter((s) => {
      const matchCat = selectedCategory === 'All' || s.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchQ = !q || s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [selectedCategory, searchQuery]);

  const filteredAllSkills = useMemo(() => {
    return [...filteredSkills, ...filteredPlugins];
  }, [filteredSkills, filteredPlugins]);

  const filteredAgents = useMemo(() => {
    return allAgents.filter((a) => {
      const matchCat = selectedCategory === 'All' || a.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchQ = !q || a.name.toLowerCase().includes(q) || (a.description || '').toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [allAgents, selectedCategory, searchQuery]);

  useEffect(() => {
    setAgentVisibleCount(AGENT_PAGE_SIZE);
  }, [selectedCategory, searchQuery]);

  const filteredToolkits = useMemo(() => {
    return allToolkits.filter((t) => {
      const q = searchQuery.toLowerCase();
      return !q || t.name.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
    });
  }, [allToolkits, searchQuery]);

  const filteredPersonas = useMemo(() => {
    return allPersonas.filter((p) => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      return matchCat && (!q || p.name.toLowerCase().includes(q) || (p.description || p.directive || '').toLowerCase().includes(q));
    });
  }, [allPersonas, selectedCategory, searchQuery]);

  const filteredOutputs = useMemo(() => {
    return allOutputs.filter((o) => {
      const matchCat = selectedCategory === 'All' || o.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      return matchCat && (!q || o.name.toLowerCase().includes(q) || (o.description || o.directive || '').toLowerCase().includes(q));
    });
  }, [allOutputs, selectedCategory, searchQuery]);

  if (!activeTab) return null;

  const tabColor = LIB_TAB_COLORS[activeTab] || '#06b6d4';
  const TabIcon = LIB_TAB_ICONS[activeTab];

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="lib-mobile-overlay" onClick={onClose}>
      <div 
        className="lib-mobile-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Subtle drag handle affordance */}
        <div className="lib-mobile-sheet-handle" />

        {/* HEADER BAR */}
        <header className="lib-mobile-header">
          {selectedItem ? (
            <button
              type="button"
              className="lib-mobile-back-btn"
              onClick={() => setSelectedItem(null)}
              aria-label="Back to catalog"
            >
              <ChevronLeft size={18} />
              <span>Catalog</span>
            </button>
          ) : (
            <div className="lib-mobile-title-wrap">
              <span className="lib-mobile-tab-icon" style={{ color: tabColor }}>
                <LibGlyph icon={TabIcon} color={tabColor} size={16} />
              </span>
              <span className="lib-mobile-title">
                {activeTab === 'mcp' && 'MCP Servers'}
                {activeTab === 'spaces' && 'Office Spaces'}
                {activeTab === 'zones' && 'Role Zones'}
                {activeTab === 'skills' && 'Skills Catalogue'}
                {activeTab === 'agents' && 'Agent Templates'}
                {activeTab === 'tools' && 'Built-in Toolkits'}
                {activeTab === 'personality' && 'Personas'}
                {activeTab === 'output' && 'Output Styles'}
              </span>
            </div>
          )}

          <button
            type="button"
            className="lib-mobile-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        {/* VIEW 1: LEVEL-2 DETAIL PAGE (INNER PAGE) */}
        {selectedItem ? (
          <div className="lib-mobile-detail-container">
            {/* MCP DETAILS */}
            {selectedItem.kind === 'mcp' && (() => {
              const mcp = selectedItem.item as StockMcp;
              const readiness = mcpReadiness?.[mcp.name];
              const oauthConnected = Boolean(readiness?.stock && readiness.oauth?.connected);
              const connected = readiness?.stock
                ? readiness.configured
                : mcp.envKeys.length === 0 || mcp.envKeys.every((k) => configuredKeys[k]);
              return (
                <div className="lib-mobile-detail-scroll">
                  <div className="detail-hero-box">
                    <div className="detail-badge-pill" style={{ color: tabColor, borderColor: `${tabColor}40` }}>
                      {mcp.category || 'MCP Server'}
                    </div>
                    <h3 className="detail-hero-title">{mcp.label || mcp.name}</h3>
                    <p className="detail-hero-desc">{mcp.description}</p>
                  </div>

                  {mcp.envKeys && mcp.envKeys.length > 0 && (
                    <div className="detail-section">
                      <div className="detail-section-title">Required Credentials</div>
                      <div className="detail-keys-list">
                        {mcp.envKeys.map((k) => {
                          const isKeySet = Boolean(configuredKeys[k]) || oauthConnected;
                          const perKey = mcp.keyLinks?.[k];
                          const getUrl = perKey?.url || mcp.keyGetUrl;
                          const getLabel = perKey?.label || mcp.keyGetLabel || 'Get Key';
                          return (
                            <div key={k} className="detail-key-row">
                              <div className="detail-key-info">
                                <KeyRound size={13} color={isKeySet ? '#10b981' : '#f59e0b'} />
                                <code>{k}</code>
                              </div>
                              {isKeySet ? (
                                <span className="key-status-ready">
                                  <CheckCircle2 size={12} /> Configured
                                </span>
                              ) : (
                                <div className="detail-key-actions">
                                  {getUrl && (
                                    <a
                                      href={getUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="key-getlink"
                                      title={`Get ${k} — ${getUrl}`}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        void openExternalLink(getUrl);
                                      }}
                                    >
                                      <span>{getLabel}</span>
                                      <ExternalLink size={11} />
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    className="key-connect-btn"
                                    disabled={connectingMcpName === mcp.name}
                                    onClick={() => onConnectKey(mcp)}
                                    style={connectingMcpName === mcp.name ? { opacity: 0.85, cursor: 'wait' } : undefined}
                                  >
                                    {connectingMcpName === mcp.name ? (
                                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Loader2 size={11} className="lib-spin" />
                                        Connecting...
                                      </span>
                                    ) : (
                                      'Connect'
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {connected && mcp.authType === 'oauth' && onDisconnectKey && (
                    <div className="detail-section">
                      <div className="detail-section-title">Authorization</div>
                      <button
                        type="button"
                        className="lib-spawn-btn disconnect"
                        onClick={() => onDisconnectKey(mcp)}
                        title={`Revoke stored credentials for ${mcp.label || mcp.name}`}
                      >
                        <LogOut size={13} />
                        <span>Disconnect {mcp.label || mcp.name}</span>
                      </button>
                    </div>
                  )}

                  <div className="detail-section">
                    <div className="detail-section-title">Execution Target</div>
                    <pre className="detail-code-block">
                      {mcp.url ? `SSE: ${mcp.url}` : `${mcp.command || 'npx'} ${(mcp.args || []).join(' ')}`}
                    </pre>
                  </div>
                </div>
              );
            })()}

            {/* SKILLS DETAILS */}
            {selectedItem.kind === 'skills' && (() => {
              const skill = selectedItem.item as StockSkillItem;
              return (
                <div className="lib-mobile-detail-scroll">
                  <div className="detail-hero-box">
                    <div className="detail-badge-pill" style={{ color: tabColor, borderColor: `${tabColor}40` }}>
                      {skill.category || 'Skill'}
                    </div>
                    <h3 className="detail-hero-title">{skill.name}</h3>
                    <p className="detail-hero-desc">{skill.description}</p>
                  </div>

                  {skill.tags && skill.tags.length > 0 && (
                    <div className="detail-section">
                      <div className="detail-tags-wrap">
                        {skill.tags.map((t) => (
                          <span key={t} className="detail-tag-pill">#{t}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {skill.content && (
                    <div className="detail-section">
                      <div className="detail-section-header">
                        <span className="detail-section-title">System Directive</span>
                        <button
                          type="button"
                          className="copy-directive-btn"
                          onClick={() => handleCopyText(skill.content)}
                        >
                          {copiedText ? <Check size={12} /> : <Copy size={12} />}
                          <span>{copiedText ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="detail-markdown-box">
                        <ReactMarkdown>{skill.content}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* AGENT TEMPLATE DETAILS */}
            {selectedItem.kind === 'agents' && (() => {
              const agent = selectedItem.item as AgentTemplate;
              return (
                <div className="lib-mobile-detail-scroll">
                  <div className="detail-hero-box">
                    <div className="detail-badge-pill" style={{ color: tabColor, borderColor: `${tabColor}40` }}>
                      {agent.category || 'Autonomous Agent'}
                    </div>
                    <h3 className="detail-hero-title">{agent.name}</h3>
                    <p className="detail-hero-desc">{agent.description}</p>
                  </div>

                  <div className="detail-section">
                    <div className="detail-section-title">Default Model</div>
                    <div className="detail-model-pill">
                      <Bot size={13} color="#38bdf8" />
                      <span>{agent.default_model || 'Recommended Model'}</span>
                    </div>
                  </div>

                  {agent.system_prompt && (
                    <div className="detail-section">
                      <div className="detail-section-title">Agent Directives & Mission</div>
                      <div className="detail-prompt-preview">{agent.system_prompt}</div>
                    </div>
                  )}

                  <div className="detail-action-bar">
                    <button
                      type="button"
                      className="detail-primary-btn"
                      onClick={() => {
                        onSpawnTemplate?.(agent);
                        onClose();
                      }}
                    >
                      <Plus size={16} />
                      <span>Deploy to Canvas</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* TOOLKIT DETAILS */}
            {selectedItem.kind === 'tools' && (() => {
              const tk = selectedItem.item as ToolKit;
              return (
                <div className="lib-mobile-detail-scroll">
                  <div className="detail-hero-box">
                    <div className="detail-badge-pill" style={{ color: tk.color || tabColor, borderColor: `${tk.color || tabColor}40` }}>
                      Toolkit
                    </div>
                    <h3 className="detail-hero-title">{tk.name}</h3>
                    <p className="detail-hero-desc">{tk.description}</p>
                  </div>

                  {tk.tools && tk.tools.length > 0 && (
                    <div className="detail-section">
                      <div className="detail-section-title">Included Built-in Tools ({tk.tools.length})</div>
                      <div className="detail-keys-list">
                        {tk.tools.map((toolName) => (
                          <div key={toolName} className="detail-key-row">
                            <div className="detail-key-info">
                              <Wrench size={12} color="#a78bfa" />
                              <code>{toolName}</code>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* PERSONA & OUTPUT DETAILS */}
            {['personality', 'output'].includes(selectedItem.kind) && (() => {
              const p = selectedItem.item as PromptPreset;
              return (
                <div className="lib-mobile-detail-scroll">
                  <div className="detail-hero-box">
                    <div className="detail-badge-pill" style={{ color: tabColor, borderColor: `${tabColor}40` }}>
                      {p.category || (selectedItem.kind === 'personality' ? 'Persona' : 'Output Style')}
                    </div>
                    <h3 className="detail-hero-title">{p.name}</h3>
                    <p className="detail-hero-desc">{p.description}</p>
                  </div>

                  {p.directive && (
                    <div className="detail-section">
                      <div className="detail-section-header">
                        <span className="detail-section-title">Directive Content</span>
                        <button
                          type="button"
                          className="copy-directive-btn"
                          onClick={() => handleCopyText(p.directive)}
                        >
                          {copiedText ? <Check size={12} /> : <Copy size={12} />}
                          <span>{copiedText ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="detail-markdown-box">
                        <ReactMarkdown>{p.directive}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        ) : (
          /* VIEW 2: LEVEL-1 LIST PAGE */
          <div className="lib-mobile-list-container">
            {/* Search Bar */}
            <div className="lib-mobile-search-row">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                className="lib-mobile-search-input"
                placeholder={`Search ${activeTab === 'mcp' ? 'servers' : activeTab === 'agents' ? 'templates' : activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Skills Sub-tab Switcher (All vs Stock vs Curated GitHub Plugins) */}
            {activeTab === 'skills' && (
              <div className="lib-segmented">
                <button
                  type="button"
                  className={skillSource === 'all' ? 'active' : ''}
                  onClick={() => {
                    setSkillSource('all');
                    setSelectedCategory('All');
                  }}
                  title="Search and browse all skills and plugins together"
                >
                  All Skills <span>{filteredAllSkills.length}</span>
                </button>
                <button
                  type="button"
                  className={skillSource === 'stock' ? 'active' : ''}
                  onClick={() => {
                    setSkillSource('stock');
                    setSelectedCategory('All');
                  }}
                >
                  Stock Skills <span>{filteredSkills.length}</span>
                </button>
                <button
                  type="button"
                  className={skillSource === 'plugins' ? 'active' : ''}
                  onClick={() => {
                    setSkillSource('plugins');
                    setSelectedCategory('All');
                  }}
                  title={`Popular GitHub plugins (2k+ stars, verified ${VERIFIED_AT})`}
                >
                  GitHub Plugins <span>{filteredPlugins.length}</span>
                </button>
              </div>
            )}

            {/* Category Filter Pills */}
            {categories.length > 1 && (
              <div className="lib-mobile-cat-scroll">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`cat-pill ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Items List */}
            <div className="lib-mobile-items-scroll">
              {/* TAB: MCP */}
              {activeTab === 'mcp' && (
                filteredMcps.length === 0 ? (
                  <div className="empty-list-notice">No MCP servers match search.</div>
                ) : (
                  <>
                  {(showAllMcps ? filteredMcps : filteredMcps.slice(0, 40)).map((mcp) => {
                    const readiness = mcpReadiness?.[mcp.name];
                    const isConfigured = readiness?.stock
                      ? readiness.configured
                      : !mcp.envKeys || mcp.envKeys.length === 0 || mcp.envKeys.every((k) => configuredKeys[k]);
                    const needsOAuth = !isConfigured && (readiness?.state === 'needs-oauth' || (mcp.authType === 'oauth' && !!mcp.url));
                    const brand = getBrandVisuals(`${mcp.label} ${mcp.name}`, 24);
                    return (
                      <div
                        key={mcp.name}
                        className="lib-mobile-card"
                        onClick={() => setSelectedItem({ kind: 'mcp', item: mcp })}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                          padding: '12px 14px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              minWidth: 38,
                              borderRadius: 10,
                              background: brand.bgColor,
                              border: `1px solid ${brand.borderColor}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <McpBrandIcon mcp={mcp} size={22} fallback={brand.icon} />
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div className="card-top-row" style={{ margin: 0, marginBottom: 2 }}>
                              <span className="card-title" style={{ fontSize: 13, fontWeight: 700 }}>{mcp.label || mcp.name}</span>
                              {isConfigured ? (
                                <span className="badge-ready">
                                  <CheckCircle2 size={11} /> Ready
                                </span>
                              ) : needsOAuth ? (
                                <span className="badge-needs-config">Needs OAuth</span>
                              ) : (
                                <span className="badge-needs-config">Needs Key</span>
                              )}
                            </div>
                            <span className="card-category-tag">{mcp.category}</span>
                          </div>
                        </div>

                        <p className="card-desc" style={{ margin: 0, fontSize: 11, lineHeight: 1.4 }}>{mcp.description}</p>
                        <div className="card-bottom-row" style={{ marginTop: 2 }}>
                          {mcp.envKeys && mcp.envKeys.length > 0 ? (
                            <span style={{ fontSize: 10, color: '#f59e0b', fontFamily: 'monospace' }}>
                              🔑 {mcp.envKeys.join(', ')}
                            </span>
                          ) : <span />}
                          <span className="card-view-link">
                            <span>Details</span>
                            <ArrowRight size={12} />
                          </span>
                        </div>
                      </div>
                    );
                  })
                  }
                  {filteredMcps.length > 40 && (
                    <button className="lib-mobile-category-pill" onClick={() => setShowAllMcps((v) => !v)}>
                      {showAllMcps ? 'Show fewer servers' : `Show all ${filteredMcps.length} servers`}
                    </button>
                  )}
                  </>
                )
              )}

              {/* TAB: SKILLS */}
              {activeTab === 'skills' && (() => {
                const renderPlugin = (sk: any) => {
                  const color = pluginCategoryColor(sk.category);
                  return (
                    <div
                      key={sk.id}
                      className="lib-mobile-card"
                      onClick={() => setSelectedItem({ kind: 'skills', item: sk })}
                    >
                      <div className="card-top-row">
                        <span className="card-title-row">
                          <GhAvatar repo={sk.plugin?.repo || sk.name} fallbackIcon={Wrench} color={color} size={24} />
                          <span className="card-title">{sk.name}</span>
                        </span>
                        <span className="card-category-tag" style={{ color, background: `${color}18` }}>
                          {sk.category}
                        </span>
                      </div>
                      <p className="card-desc">{sk.description}</p>
                      <div className="card-bottom-row">
                        <span className="plugin-meta-row">
                          {sk.plugin && (
                            <span className="plugin-star-pill">
                              <Star size={10} fill="currentColor" />
                              {formatStars(sk.plugin.stars)}
                            </span>
                          )}
                          {sk.plugin?.license && <span className="plugin-lic-pill">{sk.plugin.license}</span>}
                        </span>
                        <span className="card-view-link">
                          <span>Inspect Plugin</span>
                          <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  );
                };

                const renderStock = (sk: any) => (
                  <div
                    key={sk.id}
                    className="lib-mobile-card"
                    onClick={() => setSelectedItem({ kind: 'skills', item: sk })}
                  >
                    <div className="card-top-row">
                      <span className="card-title">{sk.name}</span>
                      <span className="card-category-tag">{sk.category}</span>
                    </div>
                    <p className="card-desc">{sk.description}</p>
                    <div className="card-bottom-row">
                      <span className="card-view-link">
                        <span>Inspect Skill</span>
                        <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                );

                if (skillSource === 'all') {
                  if (filteredAllSkills.length === 0) {
                    return <div className="empty-list-notice">No skills or plugins match search.</div>;
                  }
                  return filteredAllSkills.map((sk) => (sk.plugin ? renderPlugin(sk) : renderStock(sk)));
                }

                if (skillSource === 'plugins') {
                  if (filteredPlugins.length === 0) {
                    return <div className="empty-list-notice">No plugins match search.</div>;
                  }
                  return filteredPlugins.map(renderPlugin);
                }

                if (filteredSkills.length === 0) {
                  return <div className="empty-list-notice">No skills match search.</div>;
                }
                return filteredSkills.map(renderStock);
              })()}

              {/* TAB: AGENT TEMPLATES */}
              {activeTab === 'agents' && (
                filteredAgents.length === 0 ? (
                  <div className="empty-list-notice">No agent templates match search.</div>
                ) : (
                  <>
                    {filteredAgents.slice(0, agentVisibleCount).map((ag) => {
                      const accent = agentCategoryColor(ag.category);
                      return (
                        <div
                          key={ag.id}
                          className="lib-mobile-card lib-mobile-agent-card"
                          style={{ '--ac': accent } as React.CSSProperties}
                          onClick={() => setSelectedItem({ kind: 'agents', item: ag })}
                        >
                          <div className="card-top-row lib-mobile-agent-identity">
                            <span className="lib-mobile-agent-avatar">
                              <AgentAvatar agentId={ag.id} size={30} />
                            </span>
                            <div className="lib-mobile-agent-names">
                              <span className="card-title">{ag.name}</span>
                              <span className="card-category-tag">{ag.category}</span>
                            </div>
                          </div>
                          <p className="card-desc">{ag.description}</p>
                          <AgentResourceRows agent={ag} catalogMcps={catalogMcpMap} />
                          <div className="card-bottom-row">
                            <span className="lib-mobile-model-chip" title={`Model: ${ag.default_model}`}>
                              <Cpu size={10} />
                              <span>{ag.default_model?.split('/').pop() || 'Recommended'}</span>
                            </span>
                            <span className="card-view-link">
                              <span>Deploy</span>
                              <ArrowRight size={12} />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div className="lib-agent-loadmore">
                      <span className="lib-agent-loadmore-count">
                        Showing {Math.min(agentVisibleCount, filteredAgents.length)} of {filteredAgents.length} agents
                      </span>
                      {agentVisibleCount < filteredAgents.length ? (
                        <button
                          type="button"
                          className="lib-agent-loadmore-btn"
                          onClick={() => setAgentVisibleCount((count) => count + AGENT_PAGE_SIZE)}
                        >
                          Load more
                        </button>
                      ) : (
                        <span className="lib-agent-loadmore-end">All agents loaded</span>
                      )}
                    </div>
                  </>
                )
              )}

              {/* TAB: TOOLKITS */}
              {activeTab === 'tools' && (
                filteredToolkits.length === 0 ? (
                  <div className="empty-list-notice">No toolkits match search.</div>
                ) : (
                  filteredToolkits.map((tk) => (
                    <div
                      key={tk.id}
                      className="lib-mobile-card"
                      onClick={() => setSelectedItem({ kind: 'tools', item: tk })}
                    >
                      <div className="card-top-row">
                        <span className="card-title">{tk.name}</span>
                        <span className="card-category-tag" style={{ color: tk.color }}>
                          {tk.tools?.length || 0} tools
                        </span>
                      </div>
                      <p className="card-desc">{tk.description}</p>
                      <div className="card-bottom-row">
                        <span className="card-view-link">
                          <span>Inspect Tools</span>
                          <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  ))
                )
              )}

              {/* TAB: PERSONAS */}
              {activeTab === 'personality' && (
                filteredPersonas.length === 0 ? (
                  <div className="empty-list-notice">No personas match search.</div>
                ) : (
                  filteredPersonas.map((p) => (
                    <div
                      key={p.id}
                      className="lib-mobile-card"
                      onClick={() => setSelectedItem({ kind: 'personality', item: p })}
                    >
                      <div className="card-top-row">
                        <span className="card-title-row">
                          <LibGlyph icon={personalityPresetIcon(p.id, p.category)} color={LIB_TAB_COLORS.personality} size={13} />
                          <span className="card-title">{p.name}</span>
                        </span>
                        {p.category && <span className="card-category-tag">{p.category}</span>}
                      </div>
                      <p className="card-desc">{p.description || p.directive}</p>
                      <div className="card-bottom-row">
                        <span className="card-view-link">
                          <span>View Persona</span>
                          <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  ))
                )
              )}

              {/* TAB: OFFICE SPACES */}
              {activeTab === 'spaces' && (
                SPACE_PRESETS.filter((preset) =>
                  !searchQuery || preset.name.toLowerCase().includes(searchQuery.toLowerCase()),
                ).map((preset) => (
                  <div key={preset.name} className="lib-mobile-card">
                    <div className="card-top-row">
                      <span className="card-title-row">
                        <Building2 size={14} color={preset.color} />
                        <span className="card-title">{preset.name}</span>
                      </span>
                      <span className="card-category-tag" style={{ color: preset.color }}>
                        {preset.width}×{preset.height}
                      </span>
                    </div>
                    <p className="card-desc">{preset.description || 'Visual team room for agents.'}</p>
                    <div className="card-bottom-row">
                      <span className="card-view-link">
                        <button
                          type="button"
                          className="lib-space-deploy-btn"
                          style={{ '--space-accent': preset.color } as React.CSSProperties}
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent('canvas:spawn-zone', { detail: preset }));
                            onClose();
                          }}
                        >
                          <Plus size={12} />
                          <span>Deploy Space</span>
                        </button>
                      </span>
                    </div>
                  </div>
                ))
              )}

              {/* TAB: ROLE ZONES */}
              {activeTab === 'zones' && (
                <>
                  {roleZones.length > 0 && (
                    <div className="empty-list-notice" style={{ textAlign: 'left' }}>
                      Active zones on canvas: {roleZones.length}
                    </div>
                  )}
                  {roleZones
                    .filter((zone) => !searchQuery || zone.name.toLowerCase().includes(searchQuery.toLowerCase()) || zone.roleTitle.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((zone) => (
                      <div key={zone.id} className="lib-mobile-card">
                        <div className="card-top-row">
                          <span className="card-title-row">
                            <Network size={14} color={zone.color} />
                            <span className="card-title">{zone.name}</span>
                          </span>
                          <span className="card-category-tag" style={{ color: zone.color }}>
                            L{zone.level} · {zone.roleTitle}
                          </span>
                        </div>
                        <p className="card-desc">{zone.description || `Assign agents ${zone.roleTitle} designation.`}</p>
                        <div className="card-bottom-row">
                          <button
                            type="button"
                            className="lib-space-deploy-btn"
                            onClick={() => {
                              if (zone.spaceId) {
                                window.dispatchEvent(
                                  new CustomEvent('canvas:open-space-workspace', {
                                    detail: { spaceId: zone.spaceId },
                                  }),
                                );
                              } else {
                                window.dispatchEvent(new CustomEvent('canvas:open-workspace-panel'));
                              }
                              onClose();
                            }}
                          >
                            Open Space Workspace
                          </button>
                          <span className="card-view-link">
                            <button
                              type="button"
                              className="lib-space-deploy-btn"
                              style={{ '--space-accent': zone.color } as React.CSSProperties}
                              onClick={() => {
                                window.dispatchEvent(new CustomEvent('canvas:spawn-role-zone', { detail: { ...zone, id: undefined } }));
                                onClose();
                              }}
                            >
                              <Plus size={12} />
                              <span>Deploy</span>
                            </button>
                          </span>
                        </div>
                      </div>
                    ))}
                  {ROLE_ZONE_PRESETS.filter((preset) =>
                    !searchQuery || preset.name.toLowerCase().includes(searchQuery.toLowerCase()) || preset.roleTitle.toLowerCase().includes(searchQuery.toLowerCase()),
                  ).map((preset) => (
                    <div key={preset.name} className="lib-mobile-card">
                      <div className="card-top-row">
                        <span className="card-title-row">
                          <Network size={14} color={preset.color} />
                          <span className="card-title">{preset.name}</span>
                        </span>
                        <span className="card-category-tag" style={{ color: preset.color }}>
                          L{preset.level} · {preset.roleTitle}
                        </span>
                      </div>
                      <p className="card-desc">{preset.description || `Hierarchical ${preset.roleTitle} designation.`}</p>
                      <div className="card-bottom-row">
                        <span className="card-view-link">
                          <button
                            type="button"
                            className="lib-space-deploy-btn"
                            style={{ '--space-accent': preset.color } as React.CSSProperties}
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent('canvas:spawn-role-zone', { detail: preset }));
                              onClose();
                            }}
                          >
                            <Plus size={12} />
                            <span>Deploy Zone</span>
                          </button>
                        </span>
                      </div>
                    </div>
                  ))}
                  {HIERARCHICAL_CHAINS.filter((chain) => {
                    const name = chain.name || chain.companyName || '';
                    const cat = chain.category || chain.industryCategory || '';
                    return !searchQuery || name.toLowerCase().includes(searchQuery.toLowerCase()) || cat.toLowerCase().includes(searchQuery.toLowerCase());
                  }).map((chain) => {
                    const name = chain.name || chain.companyName || '';
                    const cat = chain.category || chain.industryCategory || '';
                    const color = chain.color || chain.industryColor || '#3b82f6';
                    return (
                    <div key={chain.id} className="lib-mobile-card">
                      <div className="card-top-row">
                        <span className="card-title-row">
                          <Network size={14} color={color} />
                          <span className="card-title">{name}</span>
                        </span>
                        <span className="card-category-tag" style={{ color }}>
                          {chain.nodes.length} Zones · {cat}
                        </span>
                      </div>
                      <p className="card-desc">{chain.description || 'Hierarchical organization chain.'}</p>
                      <div className="card-bottom-row">
                        <span className="card-view-link">
                          <button
                            type="button"
                            className="lib-space-deploy-btn"
                            style={{ '--space-accent': color } as React.CSSProperties}
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent('canvas:spawn-hierarchical-chain', { detail: { chain } }));
                              onClose();
                            }}
                          >
                            <Plus size={12} />
                            <span>Deploy Hierarchy</span>
                          </button>
                        </span>
                      </div>
                    </div>
                  );})}
                  {roleZones.length === 0 && ROLE_ZONE_PRESETS.length === 0 && HIERARCHICAL_CHAINS.length === 0 && (
                    <div className="empty-list-notice">No role zones yet.</div>
                  )}
                </>
              )}

              {/* TAB: OUTPUT STYLES */}
              {activeTab === 'output' && (
                filteredOutputs.length === 0 ? (
                  <div className="empty-list-notice">No output styles match search.</div>
                ) : (
                  filteredOutputs.map((o) => (
                    <div
                      key={o.id}
                      className="lib-mobile-card"
                      onClick={() => setSelectedItem({ kind: 'output', item: o })}
                    >
                      <div className="card-top-row">
                        <span className="card-title-row">
                          <LibGlyph icon={outputPresetIcon(o.id, o.category)} color={LIB_TAB_COLORS.output} size={13} />
                          <span className="card-title">{o.name}</span>
                        </span>
                        {o.category && <span className="card-category-tag">{o.category}</span>}
                      </div>
                      <p className="card-desc">{o.description || o.directive}</p>
                      <div className="card-bottom-row">
                        <span className="card-view-link">
                          <span>View Style</span>
                          <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
