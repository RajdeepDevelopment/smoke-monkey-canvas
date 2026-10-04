import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Cpu,
  Key,
  ExternalLink,
  Search,
  CheckCircle2,
  ShieldCheck,
  Code2,
  AlertTriangle,
  Check,
  Terminal,
  Activity,
  RefreshCw,
} from 'lucide-react';
import { McpService } from './mcp.service.js';
import type { StockMcp } from './mcp.types.js';
import { getBrandIcon } from '../common/brand-icons.js';

interface McpModalProps {
  isOpen: boolean;
  agentId: string | null;
  initialMcpName?: string | null;
  attachedMcpNames?: string[];
  onAttach: (
    agentId: string,
    mcpData: { mcp_name: string; label?: string; config?: Record<string, unknown> }
  ) => Promise<void>;
  onClose: () => void;
}

type TabType = 'stock' | 'custom' | 'json';

interface ParsedMcpServer {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  selected: boolean;
}

const SAMPLE_JSON = `{
  "mcpServers": {
    "weather": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-weather"],
      "env": {
        "OPENWEATHER_API_KEY": ""
      }
    }
  }
}`;

export const McpModal: React.FC<McpModalProps> = ({
  isOpen,
  agentId,
  initialMcpName,
  attachedMcpNames = [],
  onAttach,
  onClose,
}) => {
  if (!isOpen || !agentId) return null;

  const [activeTab, setActiveTab] = useState<TabType>('stock');
  const [stockMcps, setStockMcps] = useState<StockMcp[]>([]);
  const [selectedStock, setSelectedStock] = useState<StockMcp | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [envValues, setEnvValues] = useState<Record<string, string>>({});
  const [customName, setCustomName] = useState('');
  const [customCommand, setCustomCommand] = useState('npx');
  const [customArgs, setCustomArgs] = useState('');
  const [rawJson, setRawJson] = useState('');
  const [parsedServers, setParsedServers] = useState<ParsedMcpServer[]>([]);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [serverKeys, setServerKeys] = useState<Record<string, { isSet: boolean }>>({});
  const [oauthSuccess, setOauthSuccess] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const loadServerKeys = () => {
    fetch('/api/settings/keys')
      .then((r) => r.json())
      .then(setServerKeys)
      .catch(() => {});
  };

  const findMatchingMcp = (name: string, list: StockMcp[]) => {
    const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return list.find((s) => {
      const normName = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normLabel = s.label.toLowerCase().replace(/[^a-z0-9]/g, '');
      return (
        normName.includes(normalized) ||
        normalized.includes(normName) ||
        normLabel.includes(normalized) ||
        normalized.includes(normLabel)
      );
    });
  };

  useEffect(() => {
    McpService.fetchStockMcps()
      .then((data) => {
        setStockMcps(data);
        if (initialMcpName) {
          const found = findMatchingMcp(initialMcpName, data);
          if (found) {
            setSelectedStock(found);
            return;
          }
        }
        if (data.length > 0) setSelectedStock(data[0]);
      })
      .catch((err) => console.error('Failed to load stock MCPs:', err));

    loadServerKeys();

    const handleWindowMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'MCP_OAUTH_SUCCESS') {
        const { key, token, secondaryKeys, mcpName } = e.data;
        if (key && token) {
          setEnvValues((prev) => ({
            ...prev,
            [key]: token,
            ...(secondaryKeys || {}),
          }));
          setServerKeys((prev) => {
            const updated: Record<string, { isSet: boolean; masked: string }> = {
              ...prev,
              [key]: { isSet: true, masked: '••••••••' },
            };
            if (secondaryKeys) {
              for (const [sk] of Object.entries(secondaryKeys)) {
                updated[sk] = { isSet: true, masked: '••••••••' };
              }
            }
            return updated;
          });
        }
        loadServerKeys();
        setOauthSuccess(mcpName || 'Connected');
        setTimeout(() => setOauthSuccess(null), 4000);
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, []);

  // Update selection if initialMcpName arrives or changes while open
  useEffect(() => {
    if (!initialMcpName || stockMcps.length === 0) return;
    const found = findMatchingMcp(initialMcpName, stockMcps);
    if (found) {
      setSelectedStock(found);
      setActiveTab('stock');
    }
  }, [initialMcpName, stockMcps]);

  // Parse raw JSON dynamically
  useEffect(() => {
    if (!rawJson.trim()) {
      setParsedServers([]);
      setJsonError(null);
      return;
    }

    try {
      const data = JSON.parse(rawJson);
      const list: ParsedMcpServer[] = [];

      // Case 1: Standard Claude / Cursor format { "mcpServers": { ... } }
      if (data && typeof data === 'object' && data.mcpServers && typeof data.mcpServers === 'object') {
        for (const [key, val] of Object.entries(data.mcpServers)) {
          if (val && typeof val === 'object') {
            const v = val as any;
            list.push({
              name: key,
              command: v.command || 'npx',
              args: Array.isArray(v.args) ? v.args.map(String) : typeof v.args === 'string' ? v.args.split(' ').filter(Boolean) : [],
              env: v.env && typeof v.env === 'object' ? Object.fromEntries(Object.entries(v.env).map(([k, x]) => [k, String(x)])) : {},
              selected: true,
            });
          }
        }
      }
      // Case 2: Array of servers [ { name: "...", command: "...", args: ... } ]
      else if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          const item = data[i];
          if (item && typeof item === 'object') {
            list.push({
              name: item.name || `server-${i + 1}`,
              command: item.command || 'npx',
              args: Array.isArray(item.args) ? item.args.map(String) : typeof item.args === 'string' ? item.args.split(' ').filter(Boolean) : [],
              env: item.env && typeof item.env === 'object' ? Object.fromEntries(Object.entries(item.env).map(([k, x]) => [k, String(x)])) : {},
              selected: true,
            });
          }
        }
      }
      // Case 3: Single server object { name: "...", command: "...", args: ... }
      else if (data && typeof data === 'object' && (data.command || data.name)) {
        list.push({
          name: data.name || 'custom-mcp-server',
          command: data.command || 'npx',
          args: Array.isArray(data.args) ? data.args.map(String) : typeof data.args === 'string' ? data.args.split(' ').filter(Boolean) : [],
          env: data.env && typeof data.env === 'object' ? Object.fromEntries(Object.entries(data.env).map(([k, x]) => [k, String(x)])) : {},
          selected: true,
        });
      }
      // Case 4: Map of servers { "serverName": { command: "...", args: [...] } }
      else if (data && typeof data === 'object') {
        for (const [key, val] of Object.entries(data)) {
          if (val && typeof val === 'object' && ('command' in (val as object) || 'args' in (val as object))) {
            const v = val as any;
            list.push({
              name: key,
              command: v.command || 'npx',
              args: Array.isArray(v.args) ? v.args.map(String) : typeof v.args === 'string' ? v.args.split(' ').filter(Boolean) : [],
              env: v.env && typeof v.env === 'object' ? Object.fromEntries(Object.entries(v.env).map(([k, x]) => [k, String(x)])) : {},
              selected: true,
            });
          }
        }
      }

      if (list.length === 0) {
        setParsedServers([]);
        setJsonError('No valid MCP server definition detected. Paste standard {"mcpServers": { ... }} JSON or a single server object.');
      } else {
        setParsedServers(list);
        setJsonError(null);
      }
    } catch (err) {
      setParsedServers([]);
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON syntax');
    }
  }, [rawJson]);

  const handleToggleParsedServer = (index: number) => {
    setParsedServers((prev) =>
      prev.map((s, i) => (i === index ? { ...s, selected: !s.selected } : s))
    );
  };

  const handleEnvChange = (key: string, val: string) => {
    setEnvValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleOAuthConnect = (mcp: StockMcp) => {
    const popupWidth = 500;
    const popupHeight = 650;
    const left = window.screenX + (window.outerWidth - popupWidth) / 2;
    const top = window.screenY + (window.outerHeight - popupHeight) / 2;
    const authUrl = `/api/mcp/oauth/${mcp.name}/authorize`;
    window.open(authUrl, `Connect_${mcp.name}`, `width=${popupWidth},height=${popupHeight},left=${left},top=${top}`);
  };

  const isMcpConfigured = (mcp: StockMcp) => {
    if (mcp.envKeys.length === 0 || mcp.authType === 'none') return true;
    return mcp.envKeys.every((k) => serverKeys[k]?.isSet || !!envValues[k]?.trim());
  };

  const handleTestConnection = async (mcp: StockMcp) => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/mcp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mcpName: mcp.name,
          command: mcp.command,
          args: mcp.args,
          env: envValues,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Connection test failed');
      setTestResult({ success: true, message: `${data.message} (${data.latencyMs}ms latency)` });
      setTimeout(() => setTestResult(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection test failed';
      setTestResult({ success: false, message: msg });
      setTimeout(() => setTestResult(null), 6000);
    } finally {
      setIsTesting(false);
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    stockMcps.forEach((m) => set.add(m.category));
    return ['All', ...Array.from(set)];
  }, [stockMcps]);

  const filteredStockMcps = useMemo(() => {
    return stockMcps.filter((m) => {
      const matchCat = selectedCategory === 'All' || m.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        m.label.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [stockMcps, selectedCategory, searchQuery]);

  const isCurrentStockConfigured = selectedStock ? isMcpConfigured(selectedStock) : false;
  const isCurrentStockAlreadyAttached = selectedStock ? attachedMcpNames.includes(selectedStock.name) : false;

  const handleAttach = async () => {
    setLoading(true);
    try {
      if (activeTab === 'json') {
        const toAttach = parsedServers.filter((s) => s.selected);
        if (toAttach.length === 0) {
          alert('Please enter valid MCP JSON and ensure at least one server is selected.');
          return;
        }
        for (const s of toAttach) {
          await onAttach(agentId, {
            mcp_name: s.name.trim(),
            label: s.name.trim(),
            config: {
              command: s.command,
              args: s.args,
              env: s.env,
            },
          });
        }
      } else if (activeTab === 'custom') {
        if (!customName.trim()) {
          alert('Please enter a name for the custom MCP server');
          return;
        }
        await onAttach(agentId, {
          mcp_name: customName.trim(),
          label: customName.trim(),
          config: {
            command: customCommand,
            args: customArgs.split(' ').filter(Boolean),
            env: envValues,
          },
        });
      } else if (selectedStock) {
        if (isCurrentStockAlreadyAttached) {
          alert(`MCP server "${selectedStock.label}" is already attached to this agent.`);
          return;
        }
        if (!isCurrentStockConfigured) {
          alert(
            `MCP server "${selectedStock.label}" requires authentication credentials (${selectedStock.envKeys.join(', ')}). Please provide them before attaching.`
          );
          return;
        }
        if (Object.keys(envValues).length > 0) {
          fetch('/api/settings/keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(envValues),
          }).catch(() => {});
        }
        await onAttach(agentId, {
          mcp_name: selectedStock.name,
          label: selectedStock.label,
          config: {
            command: selectedStock.command,
            args: selectedStock.args,
            env: envValues,
          },
        });
      }
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error attaching MCP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Cpu size={18} color="#2563eb" />
            </div>
            <div>
              <span className="modal-title" style={{ fontSize: 15, fontWeight: 700 }}>Attach MCP Tool Server</span>
              <p style={{ fontSize: 11.5, color: 'hsl(var(--muted-foreground))' }}>Equip this agent with direct APIs, database connections, and browser automation</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {oauthSuccess && (
            <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', padding: '8px 12px', borderRadius: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={15} />
              <span>Successfully linked {oauthSuccess} account via OAuth!</span>
            </div>
          )}

          {/* 3 Tab Navigation */}
          <div style={{ display: 'flex', gap: 8, background: 'hsl(var(--secondary) / 0.3)', padding: 4, borderRadius: 8 }}>
            <button
              type="button"
              className={`btn-secondary ${activeTab === 'stock' ? 'selected' : ''}`}
              style={{
                flex: 1,
                borderColor: activeTab === 'stock' ? '#2563eb' : 'transparent',
                background: activeTab === 'stock' ? 'hsl(var(--background))' : 'transparent',
                fontWeight: 600,
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
              onClick={() => setActiveTab('stock')}
            >
              <Cpu size={14} color={activeTab === 'stock' ? '#2563eb' : 'currentColor'} />
              <span>Curated MCPs ({stockMcps.length})</span>
            </button>
            <button
              type="button"
              className={`btn-secondary ${activeTab === 'custom' ? 'selected' : ''}`}
              style={{
                flex: 1,
                borderColor: activeTab === 'custom' ? '#2563eb' : 'transparent',
                background: activeTab === 'custom' ? 'hsl(var(--background))' : 'transparent',
                fontWeight: 600,
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
              onClick={() => setActiveTab('custom')}
            >
              <Terminal size={14} color={activeTab === 'custom' ? '#2563eb' : 'currentColor'} />
              <span>Custom Command</span>
            </button>
            <button
              type="button"
              className={`btn-secondary ${activeTab === 'json' ? 'selected' : ''}`}
              style={{
                flex: 1,
                borderColor: activeTab === 'json' ? '#2563eb' : 'transparent',
                background: activeTab === 'json' ? 'hsl(var(--background))' : 'transparent',
                fontWeight: 600,
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
              onClick={() => setActiveTab('json')}
            >
              <Code2 size={14} color={activeTab === 'json' ? '#2563eb' : 'currentColor'} />
              <span>Raw JSON / Claude Config</span>
            </button>
          </div>

          {/* Tab 1: Stock Curated MCP Catalog */}
          {activeTab === 'stock' && (
            <>
              {/* Search and Category Filter Header (Pinned/No-Shrink) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                <div style={{ width: '100%', position: 'relative' }}>
                  <Search
                    size={15}
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'hsl(var(--muted-foreground))',
                      pointerEvents: 'none',
                    }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search 50+ enterprise MCPs (GitHub, Slack, Postgres, Playwright...)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      paddingLeft: 36,
                      paddingRight: 12,
                      paddingTop: 8,
                      paddingBottom: 8,
                      fontSize: 12.5,
                    }}
                  />
                </div>

                {/* Categories Pills (Never squished) */}
                <div
                  style={{
                    display: 'flex',
                    gap: 7,
                    overflowX: 'auto',
                    paddingBottom: 4,
                    paddingTop: 2,
                    scrollbarWidth: 'none',
                    flexShrink: 0,
                    minHeight: 34,
                    alignItems: 'center',
                  }}
                >
                  {categories.map((cat) => {
                    const isActive = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 20,
                          fontSize: 11.5,
                          fontWeight: isActive ? 600 : 500,
                          background: isActive ? '#2563eb' : 'rgba(255, 255, 255, 0.08)',
                          color: isActive ? '#ffffff' : '#cbd5e1',
                          border: isActive ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.14)',
                          boxShadow: isActive ? '0 2px 8px rgba(37, 99, 235, 0.35)' : 'none',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stock MCP Grid */}
              <div
                className="mcp-stock-grid"
                style={{
                  maxHeight: selectedStock ? 175 : 340,
                  overflowY: 'auto',
                  flexShrink: 0,
                  transition: 'max-height 0.2s ease',
                }}
              >
                {filteredStockMcps.map((s) => {
                  const BrandIcon = getBrandIcon(s.name + ' ' + s.label, 16);
                  const isSelected = selectedStock?.name === s.name;
                  const isConfigured = isMcpConfigured(s);
                  const isAttached = attachedMcpNames.includes(s.name);
                  const isOAuth = s.authType === 'oauth';
                  const isFree = s.authType === 'none' || s.envKeys.length === 0;

                  return (
                    <div
                      key={s.name}
                      className={`mcp-stock-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedStock(s)}
                      style={{ cursor: 'pointer', position: 'relative' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {BrandIcon || <Cpu size={14} color="#2563eb" />}
                          <span className="mcp-stock-name" style={{ fontSize: 12.5, fontWeight: 600 }}>{s.label}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {isAttached ? (
                            <span style={{ fontSize: 9.5, fontWeight: 700, background: 'rgba(168,85,247,0.18)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.35)', padding: '1px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                              ✓ Attached
                            </span>
                          ) : isConfigured ? (
                            <span style={{ fontSize: 9.5, fontWeight: 700, background: 'rgba(16,185,129,0.18)', color: '#10b981', border: '1px solid rgba(16,185,129,0.35)', padding: '1px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                              ✓ Ready
                            </span>
                          ) : isOAuth ? (
                            <span style={{ fontSize: 9.5, fontWeight: 700, background: 'rgba(37,99,235,0.22)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.4)', padding: '1px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                              ⚡ OAuth
                            </span>
                          ) : isFree ? (
                            <span style={{ fontSize: 9.5, fontWeight: 700, background: 'rgba(16,185,129,0.12)', color: '#10b981', padding: '1px 6px', borderRadius: 4 }}>
                              Free
                            </span>
                          ) : (
                            <span style={{ fontSize: 9.5, fontWeight: 700, background: 'rgba(245,158,11,0.14)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', padding: '1px 6px', borderRadius: 4 }}>
                              Key Req.
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mcp-stock-desc" style={{ fontSize: 11, marginTop: 4 }}>{s.description}</div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Stock Details & Connection Action */}
              {selectedStock && (
                <div
                  style={{
                    background: 'hsl(var(--secondary) / 0.4)',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid hsl(var(--border))',
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      {getBrandIcon(selectedStock.name + ' ' + selectedStock.label, 22) || <Cpu size={20} color="#2563eb" />}
                      <div>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'hsl(var(--foreground))' }}>{selectedStock.label} Configuration</span>
                        <p style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>Command: <code>{selectedStock.command} {selectedStock.args?.join(' ')}</code></p>
                      </div>
                    </div>

                    {/* Auth Status & Quick Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {isCurrentStockConfigured && (
                        <>
                          <div
                            style={{
                              background: 'rgba(16,185,129,0.15)',
                              border: '1px solid rgba(16,185,129,0.3)',
                              color: '#10b981',
                              padding: '5px 10px',
                              borderRadius: 6,
                              fontSize: 11.5,
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                          >
                            <CheckCircle2 size={13} />
                            <span>{selectedStock.authType === 'oauth' ? 'OAuth Connected' : 'Credentials Configured'}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleTestConnection(selectedStock)}
                            disabled={isTesting}
                            style={{
                              background: 'hsl(var(--background))',
                              border: '1px solid hsl(var(--border))',
                              color: 'hsl(var(--foreground))',
                              padding: '5px 10px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 500,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                            title="Verify MCP server responsiveness and credentials"
                          >
                            {isTesting ? <RefreshCw size={12} className="spin" /> : <Activity size={12} color="#10b981" />}
                            <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Test Result Toast */}
                  {testResult && (
                    <div
                      style={{
                        background: testResult.success ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                        border: testResult.success ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)',
                        color: testResult.success ? '#10b981' : '#ef4444',
                        padding: '6px 10px',
                        borderRadius: 6,
                        fontSize: 11.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 10,
                      }}
                    >
                      {testResult.success ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                      <span>{testResult.message}</span>
                    </div>
                  )}

                  {/* PROMINENT OAUTH 1-CLICK CONNECT HERO BOX */}
                  {selectedStock.authType === 'oauth' && (
                    <div
                      style={{
                        background: isCurrentStockConfigured
                          ? 'rgba(16,185,129,0.08)'
                          : 'linear-gradient(135deg, rgba(37,99,235,0.18) 0%, rgba(14,165,233,0.12) 100%)',
                        border: isCurrentStockConfigured
                          ? '1px solid rgba(16,185,129,0.28)'
                          : '1px solid rgba(59,130,246,0.38)',
                        borderRadius: 8,
                        padding: '8px 12px',
                        marginBottom: 8,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: isCurrentStockConfigured ? '#10b981' : '#60a5fa',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            marginBottom: 3,
                          }}
                        >
                          <ShieldCheck size={16} />
                          <span>
                            {isCurrentStockConfigured
                              ? `${selectedStock.label} 1-Click OAuth Connected`
                              : `1-Click OAuth Available for ${selectedStock.label}`}
                          </span>
                        </div>
                        <div style={{ fontSize: 11.5, color: '#94a3b8' }}>
                          {isCurrentStockConfigured
                            ? 'Your credentials are authenticated and saved. You can reconnect anytime.'
                            : `Authorize with ${selectedStock.label} to automatically link your account and retrieve credentials.`}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOAuthConnect(selectedStock)}
                        style={{
                          background: isCurrentStockConfigured ? 'rgba(255,255,255,0.08)' : '#2563eb',
                          color: '#ffffff',
                          border: isCurrentStockConfigured ? '1px solid rgba(255,255,255,0.2)' : 'none',
                          padding: '8px 16px',
                          borderRadius: 7,
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          boxShadow: isCurrentStockConfigured ? 'none' : '0 3px 12px rgba(37,99,235,0.4)',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        <ShieldCheck size={14} />
                        <span>{isCurrentStockConfigured ? 'Reconnect Account' : 'Connect with OAuth'}</span>
                      </button>
                    </div>
                  )}

                  {/* Unconfigured Alert Banner for Non-OAuth MCPs */}
                  {selectedStock.authType !== 'oauth' && !isCurrentStockConfigured && (
                    <div
                      style={{
                        background: 'rgba(245,158,11,0.08)',
                        border: '1px solid rgba(245,158,11,0.25)',
                        color: '#f59e0b',
                        padding: '8px 10px',
                        borderRadius: 6,
                        fontSize: 11.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 10,
                      }}
                    >
                      <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                      <span>
                        Configuration required: Please enter {selectedStock.envKeys.join(' & ')} before attaching to agent.
                      </span>
                    </div>
                  )}

                  {/* Already Attached Notice */}
                  {isCurrentStockAlreadyAttached && (
                    <div
                      style={{
                        background: 'rgba(168,85,247,0.12)',
                        border: '1px solid rgba(168,85,247,0.3)',
                        color: '#c084fc',
                        padding: '9px 12px',
                        borderRadius: 7,
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        marginBottom: 10,
                      }}
                    >
                      <CheckCircle2 size={15} color="#c084fc" />
                      <span>This MCP server is already attached to this agent.</span>
                    </div>
                  )}

                  {selectedStock.envKeys.length > 0 && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid hsl(var(--border) / 0.5)' }}>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Key size={12} color="#2563eb" />
                        <span>
                          {selectedStock.authType === 'oauth'
                            ? 'Credentials & Authentication (Or Enter Token Manually)'
                            : 'Credentials & Authentication Keys'}
                        </span>
                      </div>
                      {selectedStock.envKeys.map((envKey) => {
                        const isSet = serverKeys[envKey]?.isSet;
                        return (
                          <div key={envKey} className="form-group" style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                              <label className="form-label" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span>{envKey}</span>
                                {isSet && <span style={{ color: '#10b981', fontSize: 10, fontWeight: 600 }}>✓ Saved in Settings</span>}
                              </label>
                              {selectedStock.keyGetUrl && (
                                <a
                                  href={selectedStock.keyGetUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ fontSize: 10.5, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}
                                >
                                  <span>{selectedStock.keyGetLabel || 'Get Key'}</span>
                                  <ExternalLink size={10} />
                                </a>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <input
                                type="password"
                                className="form-input"
                                placeholder={isSet ? '•••••••••••••••• (Configured in Settings)' : `Enter ${envKey} or leave empty to use environment`}
                                value={envValues[envKey] || ''}
                                onChange={(e) => handleEnvChange(envKey, e.target.value)}
                                style={{ fontSize: 11.5, flex: 1 }}
                              />
                              {!envValues[envKey] && !isSet && (
                                <button
                                  type="button"
                                  onClick={() => handleEnvChange(envKey, `demo_${envKey.toLowerCase()}_${Math.random().toString(36).slice(2, 8)}`)}
                                  title="Auto-fill a test token for quick sandbox experimentation"
                                  style={{
                                    padding: '6px 9px',
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    color: '#94a3b8',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    borderRadius: 6,
                                    fontSize: 10.5,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  Test Key
                                </button>
                              )}
                              {envValues[envKey] && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await fetch('/api/settings/keys', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ [envKey]: envValues[envKey] }),
                                      });
                                      loadServerKeys();
                                    } catch {}
                                  }}
                                  style={{
                                    padding: '6px 10px',
                                    background: 'hsl(var(--primary))',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 6,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  Save Key
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Tab 2: Custom Stdio Server */}
          {activeTab === 'custom' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Server Identifier</label>
                <input
                  className="form-input"
                  placeholder="e.g. custom-db-inspector"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Command</label>
                <input
                  className="form-input"
                  placeholder="npx or node"
                  value={customCommand}
                  onChange={(e) => setCustomCommand(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Arguments (space separated)</label>
                <input
                  className="form-input"
                  placeholder="-y my-mcp-server@latest"
                  value={customArgs}
                  onChange={(e) => setCustomArgs(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Tab 3: Raw JSON / Claude Desktop Config */}
          {activeTab === 'json' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                  Paste standard Claude Desktop, Cursor, or Cline MCP JSON configuration:
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setRawJson(SAMPLE_JSON)}
                    style={{
                      background: 'hsl(var(--secondary) / 0.5)',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 4,
                      padding: '2px 8px',
                      fontSize: 11,
                      color: 'hsl(var(--foreground))',
                      cursor: 'pointer',
                    }}
                  >
                    Load Example
                  </button>
                  {rawJson && (
                    <button
                      type="button"
                      onClick={() => setRawJson('')}
                      style={{
                        background: 'transparent',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 4,
                        padding: '2px 8px',
                        fontSize: 11,
                        color: 'hsl(var(--muted-foreground))',
                        cursor: 'pointer',
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* JSON Textarea */}
              <div style={{ position: 'relative', width: '100%' }}>
                <textarea
                  className="form-input"
                  value={rawJson}
                  onChange={(e) => setRawJson(e.target.value)}
                  placeholder={`{\n  "mcpServers": {\n    "filesystem": {\n      "command": "npx",\n      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/project"]\n    }\n  }\n}`}
                  rows={9}
                  style={{
                    width: '100%',
                    display: 'block',
                    boxSizing: 'border-box',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: 12,
                    lineHeight: '1.45',
                    tabSize: 2,
                    whiteSpace: 'pre',
                    resize: 'vertical',
                    minHeight: 180,
                    background: 'rgba(0,0,0,0.3)',
                    borderColor: jsonError ? '#ef4444' : parsedServers.length > 0 ? '#10b981' : undefined,
                  }}
                  spellCheck={false}
                />
              </div>

              {/* Validation Status */}
              {jsonError && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '8px 12px', borderRadius: 8, fontSize: 11.5, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{jsonError}</span>
                </div>
              )}

              {/* Detected Servers Preview */}
              {parsedServers.length > 0 && !jsonError && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#10b981', fontWeight: 600 }}>
                    <CheckCircle2 size={14} />
                    <span>Detected {parsedServers.length} MCP server{parsedServers.length > 1 ? 's' : ''}:</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                    {parsedServers.map((srv, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleToggleParsedServer(idx)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 12px',
                          borderRadius: 6,
                          background: srv.selected ? 'rgba(37,99,235,0.1)' : 'hsl(var(--secondary) / 0.3)',
                          border: srv.selected ? '1px solid rgba(37,99,235,0.4)' : '1px solid hsl(var(--border))',
                          cursor: 'pointer',
                        }}
                      >
                        <div
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: 4,
                            border: srv.selected ? '1px solid #2563eb' : '1px solid hsl(var(--border))',
                            background: srv.selected ? '#2563eb' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            flexShrink: 0,
                          }}
                        >
                          {srv.selected && <Check size={12} />}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'hsl(var(--foreground))' }}>{srv.name}</span>
                            <span style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>
                              ({srv.command} {srv.args.join(' ')})
                            </span>
                          </div>
                          {Object.keys(srv.env).length > 0 && (
                            <div style={{ fontSize: 10.5, color: '#38bdf8', marginTop: 2 }}>
                              Env: {Object.keys(srv.env).join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: 12, marginTop: 4 }}>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleAttach}
            disabled={
              loading ||
              (activeTab === 'json' && parsedServers.filter((s) => s.selected).length === 0) ||
              (activeTab === 'stock' && (!selectedStock || !isCurrentStockConfigured || isCurrentStockAlreadyAttached)) ||
              (activeTab === 'custom' && !customName.trim())
            }
            title={
              activeTab === 'stock' && selectedStock && isCurrentStockAlreadyAttached
                ? 'This MCP server is already attached to this agent'
                : activeTab === 'stock' && selectedStock && !isCurrentStockConfigured
                  ? 'Credentials required before attaching'
                  : undefined
            }
          >
            {loading
              ? 'Attaching...'
              : activeTab === 'json'
                ? `Attach ${parsedServers.filter((s) => s.selected).length > 1 ? `${parsedServers.filter((s) => s.selected).length} Servers` : 'Server'}`
                : activeTab === 'stock' && selectedStock && isCurrentStockAlreadyAttached
                  ? 'Already Attached'
                  : activeTab === 'stock' && selectedStock && !isCurrentStockConfigured
                    ? 'Credentials Required'
                    : 'Attach to Agent'}
          </button>
        </div>
      </div>
    </div>
  );
};
