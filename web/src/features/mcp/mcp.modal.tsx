import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  LogOut,
  Loader2,
  Compass,
  Wrench,
  Sparkles,
  Brain,
  Scale,
  Car,
  Shield,
  BarChart3,
  Megaphone,
  CheckSquare,
  Briefcase,
  DollarSign,
  FileText,
  MessageSquare,
  Palette,
  Headphones,
  Users,
  ShoppingBag,
  Heart,
  GraduationCap,
  Landmark,
  Globe,
  Database,
  Cloud,
} from 'lucide-react';
import { McpService } from './mcp.service.js';
import type { StockMcp, McpReadiness, McpAiProviderStatus } from './mcp.types.js';
import { resolveStockMcp } from './mcp.catalog.js';
import { getBrandIcon, getBrandVisuals, McpBrandIcon } from '../common/brand-icons.js';
import { isTauri, openExternalLink } from '../../config/desktop.bridge.js';
import { fuzzyFilter } from '../common/fuzzy-search.js';



const MCP_CATEGORY_COLORS: Record<string, string> = {
  'All': '#6366f1',
  'Development & infra': '#3b82f6',
  'Artificial intelligence': '#ec4899',
  'Databases & Storage': '#8b5cf6',
  'DevOps & Cloud': '#38bdf8',
  'Web Scraping & Search': '#06b6d4',
  'Code & Git': '#f97316',
  'Tax & compliance': '#10b981',
  'Legal': '#d97706',
  'Vehicles & traffic': '#06b6d4',
  'Public data lookups': '#6366f1',
  'Security & identity': '#ef4444',
  'Analytics & BI': '#8b5cf6',
  'Marketing': '#f97316',
  'Productivity': '#14b8a6',
  'Sales & CRM': '#eab308',
  'Finance & payments': '#22c55e',
  'Documents & files': '#84cc16',
  'Communication': '#a855f7',
  'Content & design': '#f43f5e',
  'Customer support': '#0ea5e9',
  'HR & people': '#fb7185',
  'E-commerce & retail': '#f59e0b',
  'Lifestyle': '#a3e635',
  'Health & wellness': '#4ade80',
  'Education': '#818cf8',
  'Government & tenders': '#64748b',
  'Other': '#94a3b8',
};

const MCP_CATEGORIES = [
  'Development & infra',
  'Artificial intelligence',
  'Databases & Storage',
  'DevOps & Cloud',
  'Web Scraping & Search',
  'Code & Git',
  'Tax & compliance',
  'Legal',
  'Vehicles & traffic',
  'Public data lookups',
  'Security & identity',
  'Analytics & BI',
  'Marketing',
  'Productivity',
  'Sales & CRM',
  'Finance & payments',
  'Documents & files',
  'Communication',
  'Content & design',
  'Customer support',
  'HR & people',
  'E-commerce & retail',
  'Lifestyle',
  'Health & wellness',
  'Education',
  'Government & tenders',
  'Other',
];

const MCP_CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'All': <Sparkles size={11} />,
  'Development & infra': <Terminal size={11} />,
  'Artificial intelligence': <Brain size={11} />,
  'Databases & Storage': <Database size={11} />,
  'DevOps & Cloud': <Cloud size={11} />,
  'Web Scraping & Search': <Globe size={11} />,
  'Code & Git': <Code2 size={11} />,
  'Tax & compliance': <ShieldCheck size={11} />,
  'Legal': <Scale size={11} />,
  'Vehicles & traffic': <Car size={11} />,
  'Public data lookups': <Search size={11} />,
  'Security & identity': <Shield size={11} />,
  'Analytics & BI': <BarChart3 size={11} />,
  'Marketing': <Megaphone size={11} />,
  'Productivity': <CheckSquare size={11} />,
  'Sales & CRM': <Briefcase size={11} />,
  'Finance & payments': <DollarSign size={11} />,
  'Documents & files': <FileText size={11} />,
  'Communication': <MessageSquare size={11} />,
  'Content & design': <Palette size={11} />,
  'Customer support': <Headphones size={11} />,
  'HR & people': <Users size={11} />,
  'E-commerce & retail': <ShoppingBag size={11} />,
  'Lifestyle': <Compass size={11} />,
  'Health & wellness': <Heart size={11} />,
  'Education': <GraduationCap size={11} />,
  'Government & tenders': <Landmark size={11} />,
};

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
  const [oauthViaToken, setOauthViaToken] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [statusMap, setStatusMap] = useState<Record<string, McpReadiness>>({});
  const [providerStatus, setProviderStatus] = useState<McpAiProviderStatus | null>(null);
  const [isCheckingProvider, setIsCheckingProvider] = useState(false);
  const [oauthConnectingServer, setOauthConnectingServer] = useState<string | null>(null);
  const oauthPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadServerKeys = () => {
    fetch('/api/settings/keys')
      .then((r) => r.json())
      .then(setServerKeys)
      .catch(() => {});
  };

  const loadStatus = () => {
    McpService.fetchStatus()
      .then(setStatusMap)
      .catch(() => {});
  };

  useEffect(() => {
    McpService.fetchStockMcps()
      .then((data) => {
        setStockMcps(data);
        if (initialMcpName) {
          const found = resolveStockMcp(data, initialMcpName);
          if (found) {
            setSelectedStock(found);
            return;
          }
        }
        if (data.length > 0) setSelectedStock(data[0]);
      })
      .catch((err) => console.error('Failed to load stock MCPs:', err));

    loadServerKeys();
    loadStatus();

    const handleWindowMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'MCP_OAUTH_ERROR') {
        setTestResult({
          success: false,
          message: `Authorization failed: ${e.data.message || 'the provider rejected the request'}`,
        });
        setTimeout(() => setTestResult(null), 12000);
        return;
      }
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
        loadStatus();
        if (mcpName) {
          // MCP.ai has a second provider login; refresh that card too. For
          // non-MCP.ai servers this 404s and is ignored.
          McpService.fetchProviderStatus(mcpName)
            .then(setProviderStatus)
            .catch(() => {});
        }
        setOauthSuccess(mcpName || 'Connected');
        setOauthViaToken(!!e.data.viaToken);
        setTimeout(() => setOauthSuccess(null), 4000);
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, []);

  useEffect(() => () => {
    if (oauthPollRef.current) clearInterval(oauthPollRef.current);
  }, []);

  // Update selection if initialMcpName arrives or changes while open
  useEffect(() => {
    if (!initialMcpName || stockMcps.length === 0) return;
    const found = resolveStockMcp(stockMcps, initialMcpName);
    if (found) {
      setSelectedStock(found);
      setActiveTab('stock');
    }
  }, [initialMcpName, stockMcps]);

  // MCP.ai has two auth layers: the platform token and the provider account.
  // Check the cached provider answer on selection; "Check again" refreshes it.
  useEffect(() => {
    if (!selectedStock?.isMcpAi) {
      setProviderStatus(null);
      return;
    }
    let cancelled = false;
    setProviderStatus(null);
    McpService.fetchProviderStatus(selectedStock.name)
      .then((status) => {
        if (!cancelled) setProviderStatus(status);
      })
      .catch(() => {
        if (!cancelled) {
          setProviderStatus({
            state: 'error',
            authenticated: false,
            pending: [],
            detail: 'Could not check the provider account.',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedStock?.name, selectedStock?.isMcpAi]);

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

  // After a redirect the OAuth page may live in another tab / the OS browser, so
  // window.opener postMessage is not guaranteed. Poll the server's status route
  // instead; it flips to connected as soon as the callback exchanges the code.
  const startOAuthPolling = (mcpName: string) => {
    if (oauthPollRef.current) clearInterval(oauthPollRef.current);
    const startedAt = Date.now();
    let providerPending = false;
    oauthPollRef.current = setInterval(async () => {
      const maxWait = providerPending ? 300000 : 120000;
      if (Date.now() - startedAt > maxWait) {
        if (oauthPollRef.current) clearInterval(oauthPollRef.current);
        oauthPollRef.current = null;
        return;
      }
      try {
        const r = await fetch(`/api/mcp/oauth/status/${encodeURIComponent(mcpName)}`);
        const s = await r.json();
        if (!s?.connected) return;

        const stock = stockMcps.find((m) => m.name === mcpName);
        if (stock?.isMcpAi) {
          // Platform OAuth is done, but MCP.ai may still need the user to log in
          // to the underlying provider. Do not declare success until both.
          const provider = await McpService.fetchProviderStatus(mcpName, true);
          setProviderStatus(provider);
          if (provider.state === 'needs-login') {
            providerPending = true;
            loadStatus();
            return;
          }
          if (provider.state !== 'connected') {
            if (oauthPollRef.current) clearInterval(oauthPollRef.current);
            oauthPollRef.current = null;
            loadStatus();
            setTestResult({
              success: false,
              message:
                provider.detail ||
                `MCP.ai is authorized, but ${stock.label} still needs its provider account.`,
            });
            setTimeout(() => setTestResult(null), 12000);
            return;
          }
        }

        if (oauthPollRef.current) clearInterval(oauthPollRef.current);
        oauthPollRef.current = null;
        loadServerKeys();
        loadStatus();
        setOauthSuccess(mcpName);
        setOauthViaToken(false);
        setTimeout(() => setOauthSuccess(null), 4000);
      } catch {
        /* transient; keep polling */
      }
    }, 5000);
  };

  const handleOAuthConnect = async (mcp: StockMcp) => {
    if (!mcp?.name) {
      console.error('handleOAuthConnect called without a server name');
      return;
    }

    setOauthConnectingServer(mcp.name);
    // The server owns the OAuth client: it runs discovery, dynamic client
    // registration and PKCE, and hands back the provider's consent URL. That
    // way the desktop webview (which refuses window.open) can let the server
    // open the browser itself.
    let authorizationUrl = '';
    let browserOpened = false;
    try {
      const result = await McpService.connect(mcp.name, {
        launch: isTauri() ? 'server' : 'client',
      });
      browserOpened = !!result.browserOpened;
      authorizationUrl = result.authorizationUrl ?? '';

      if (result.status === 'connected') {
        if (mcp.isMcpAi) {
          const provider = await McpService.fetchProviderStatus(mcp.name, true).catch(() => null);
          if (provider) setProviderStatus(provider);
          if (!provider || provider.state !== 'connected') {
            loadStatus();
            // Keep watching while the user finishes the provider login.
            if (provider?.state === 'needs-login') startOAuthPolling(mcp.name);
            setTestResult({
              success: false,
              message:
                provider?.detail ||
                `MCP.ai is authorized. Could not verify the ${mcp.label} provider account yet.`,
            });
            setTimeout(() => setTestResult(null), 12000);
            return;
          }
        }
        loadServerKeys();
        loadStatus();
        setOauthSuccess(mcp.name);
        setTimeout(() => setOauthSuccess(null), 4000);
        return;
      }
      if (result.status === 'needs-client') {
        setTestResult({
          success: false,
          message:
            result.error ||
            `${mcp.label} needs its own OAuth App before it can be connected.`,
        });
        setTimeout(() => setTestResult(null), 10000);
        return;
      }
      if (result.status === 'failed') {
        setTestResult({
          success: false,
          message: result.error || `Could not start the connect flow for ${mcp.label}.`,
        });
        setTimeout(() => setTestResult(null), 10000);
        return;
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : `Failed to connect ${mcp.label}.`,
      });
      setTimeout(() => setTestResult(null), 10000);
      return;
    } finally {
      setOauthConnectingServer(null);
    }

    if (!browserOpened && authorizationUrl) {
      if (isTauri()) {
        // Desktop webview blocks window.open for local URLs — hand off to the OS
        // browser (Chrome), which finishes the callback against the local server.
        void openExternalLink(authorizationUrl);
      } else {
        // A real navigation/tab is not a scripted "popup", so popup blockers allow
        // it. If it is still refused, fall back to a same-window redirect.
        const win = window.open(authorizationUrl, '_blank');
        if (!win) window.location.href = authorizationUrl;
      }
    }
    startOAuthPolling(mcp.name);
  };

  const handleCheckProvider = async (mcp: StockMcp) => {
    if (!mcp?.isMcpAi || isCheckingProvider) return;
    setIsCheckingProvider(true);
    try {
      const provider = await McpService.fetchProviderStatus(mcp.name, true);
      setProviderStatus(provider);
      loadStatus();
      if (provider.state === 'connected') {
        setTestResult({
          success: true,
          message: `${mcp.label} provider account is linked.`,
        });
        setTimeout(() => setTestResult(null), 6000);
      } else if (provider.state === 'needs-login') {
        setTestResult({
          success: false,
          message: provider.detail || `Finish linking your ${mcp.label} account.`,
        });
        setTimeout(() => setTestResult(null), 10000);
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Could not check the provider account.',
      });
      setTimeout(() => setTestResult(null), 8000);
    } finally {
      setIsCheckingProvider(false);
    }
  };

  // Revoke the stored OAuth tokens (and any pasted credential values) so the
  // server returns to a genuine disconnected state rather than silently reusing
  // a token the user believes they removed.
  const handleDisconnect = async (mcp: StockMcp) => {
    if (!mcp?.name || isDisconnecting) return;
    setIsDisconnecting(true);
    try {
      const result = await McpService.disconnect(mcp.name);
      if (oauthPollRef.current) {
        clearInterval(oauthPollRef.current);
        oauthPollRef.current = null;
      }
      setEnvValues((prev) => {
        const next = { ...prev };
        for (const key of mcp.envKeys) delete next[key];
        return next;
      });
      setOauthSuccess(null);
      loadServerKeys();
      loadStatus();
      setTestResult({
        success: true,
        message: result.message || `Disconnected ${mcp.label}.`,
      });
      setTimeout(() => setTestResult(null), 6000);
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to disconnect',
      });
      setTimeout(() => setTestResult(null), 8000);
    } finally {
      setIsDisconnecting(false);
    }
  };

  // If MCP.ai rejects a locally stored token, startConnect() sees a token and
  // reports "connected" without reopening consent. Clear it first so the user
  // can genuinely re-authorize the platform.
  const handleReconnectPlatform = async (mcp: StockMcp) => {
    try {
      await McpService.disconnect(mcp.name);
    } catch {
      /* fresh OAuth is still worth trying */
    }
    loadStatus();
    await handleOAuthConnect(mcp);
  };

  const isMcpConfigured = (mcp: StockMcp) => {
    // Server-computed readiness is authoritative: it knows about OAuth tokens
    // and is not fooled by an entry that needs no env keys but still cannot run.
    const readiness = statusMap[mcp.name];
    if (readiness) return readiness.configured;
    if (mcp.envKeys.length === 0 || mcp.authType === 'none') return true;
    return mcp.envKeys.every((k) => serverKeys[k]?.isSet || !!envValues[k]?.trim());
  };

  // Only servers with a remote endpoint can run the browser OAuth flow. Stdio
  // servers labelled `oauth` authenticate with a pasted env token instead, so
  // they must not advertise "Connect with OAuth".
  const supportsOAuth = (mcp: StockMcp) => mcp.authType === 'oauth' && !!mcp.url;

  // Badge reflects *verified* state, not merely "we hold a credential". Anything
  // that has not passed a real handshake is honestly labelled, never "Ready".
  const stockBadge = (mcp: StockMcp, configured: boolean, attached: boolean) => {
    if (attached)
      return { label: '✓ Attached', bg: 'rgba(168,85,247,0.18)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.35)' };
    const readiness = statusMap[mcp.name];
    const probe = readiness?.probe;
    if (probe?.ok)
      return { label: '✓ Verified', bg: 'rgba(16,185,129,0.18)', color: '#10b981', border: '1px solid rgba(16,185,129,0.35)' };
    if (probe && !probe.ok)
      return { label: '✗ Failing', bg: 'rgba(239,68,68,0.16)', color: '#f87171', border: '1px solid rgba(239,68,68,0.35)' };
    if (!configured) {
      if (readiness?.state === 'needs-oauth' || supportsOAuth(mcp))
        return { label: '⚡ Connect', bg: 'rgba(37,99,235,0.22)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.4)' };
      return { label: 'Key Req.', bg: 'rgba(245,158,11,0.14)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' };
    }
    return { label: 'Untested', bg: 'rgba(148,163,184,0.14)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.3)' };
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
      if (data.readiness) {
        setStatusMap((prev) => ({ ...prev, [data.readiness.mcpName]: data.readiness }));
      }
      // The endpoint reports real handshake failures with HTTP 200 + success:false,
      // so success must be read from the payload rather than the status code.
      if (!data.success) {
        setTestResult({ success: false, message: data.error || 'Connection test failed' });
        setTimeout(() => setTestResult(null), 12000);
        return;
      }
      const toolNote = data.tools?.length
        ? ` Tools: ${data.tools.slice(0, 6).join(', ')}${data.tools.length > 6 ? ', …' : ''}`
        : '';
      setTestResult({
        success: true,
        message: `${data.message} (${data.latencyMs}ms)${toolNote}`,
      });
      setTimeout(() => setTestResult(null), 12000);
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
    stockMcps.forEach((m) => {
      if (m.category && m.category !== 'MCP.ai Catalog') set.add(m.category);
    });
    const list = Array.from(set);
    list.sort((a, b) => {
      const idxA = MCP_CATEGORIES.indexOf(a);
      const idxB = MCP_CATEGORIES.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
    return ['All', ...list];
  }, [stockMcps]);

  const filteredStockMcps = useMemo(() => {
    const list =
      selectedCategory === 'All'
        ? stockMcps
        : stockMcps.filter((m) => m.category === selectedCategory);
    return fuzzyFilter(list, searchQuery, (m) => ({
      primary: `${m.label} ${m.name}`,
      secondary: m.category,
      tertiary: `${m.description || ''} ${(m as any).whenToUse || ''}`,
    }));
  }, [stockMcps, selectedCategory, searchQuery]);


  const isCurrentStockConfigured = selectedStock ? isMcpConfigured(selectedStock) : false;
  const selectedReadiness = selectedStock ? statusMap[selectedStock.name] : undefined;
  const providerNeedsLogin = providerStatus?.state === 'needs-login';
  const providerConnected = providerStatus?.state === 'connected';
  const isOAuthPlatformConnected =
    !!selectedReadiness?.oauth.connected && providerStatus?.state !== 'needs-platform-auth';
  const showOAuthConnected = isCurrentStockConfigured || isOAuthPlatformConnected;
  const selectedBrand = selectedStock
    ? getBrandVisuals(selectedStock.name + ' ' + selectedStock.label, 22)
    : null;
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
              <span>
                Successfully linked {oauthSuccess} account{' '}
                {oauthViaToken ? 'with the credentials you saved.' : 'via OAuth.'}
              </span>
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
                    const catColor = MCP_CATEGORY_COLORS[cat] || '#6366f1';
                    const icon = MCP_CATEGORY_ICONS[cat];
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '5px 12px',
                          borderRadius: 20,
                          fontSize: 11.5,
                          fontWeight: isActive ? 600 : 500,
                          background: isActive ? catColor : 'hsl(var(--secondary))',
                          color: isActive ? '#ffffff' : 'hsl(var(--foreground))',
                          border: isActive ? `1px solid ${catColor}` : '1px solid hsl(var(--border))',
                          boxShadow: isActive ? `0 2px 8px ${catColor}40` : 'none',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {icon && <span style={{ opacity: isActive ? 1 : 0.75 }}>{icon}</span>}
                        <span>{cat}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 0',
                  flexShrink: 0,
                }}
              >
                <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>Showing <strong style={{ color: 'hsl(var(--foreground))' }}>{filteredStockMcps.length}</strong> {filteredStockMcps.length === 1 ? 'toolkit' : 'toolkits'}</span>
                  <span style={{ opacity: 0.4 }}>•</span>
                  <span>{selectedCategory === 'All' ? `${categories.length - 1} categorized domains` : selectedCategory}</span>
                </div>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      fontSize: 11,
                      color: '#60a5fa',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px 4px',
                    }}
                  >
                    Clear search
                  </button>
                )}
              </div>

              {/* Stock MCP Grid */}
              <div
                className="mcp-stock-grid"
                style={{
                  maxHeight: selectedStock ? 175 : 340,
                  overflowY: 'auto',
                  flexShrink: 0,
                  transition: 'max-height 0.2s ease',
                  willChange: 'scroll-position',
                }}
              >
                {filteredStockMcps.slice(0, 200).map((s) => {
                  const brand = getBrandVisuals(s.name + ' ' + s.label, 24);
                  const isSelected = selectedStock?.name === s.name;
                  const isConfigured = isMcpConfigured(s);
                  const isAttached = attachedMcpNames.includes(s.name);
                  const isOAuth = supportsOAuth(s);
                  const badge = stockBadge(s, isConfigured, isAttached);

                  return (
                    <div
                      key={s.name}
                      className={`mcp-stock-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedStock(s)}
                      style={{
                        cursor: 'pointer',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        padding: '12px 14px',
                        borderRadius: 12,
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
                            boxShadow: `0 3px 10px -2px ${brand.glowColor}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <McpBrandIcon mcp={s} size={22} fallback={brand.icon} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                            <span className="mcp-stock-name" style={{ fontSize: 13, fontWeight: 700, color: 'hsl(var(--foreground))' }}>{s.label}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span
                                title={
                                  badge.label === 'Untested'
                                    ? 'Credentials look fine, but this server has not passed a connection test yet. Click it, then Test Connection.'
                                    : badge.label === '✗ Failing'
                                      ? 'The last connection test failed. Open the server and Test Connection for details.'
                                      : undefined
                                }
                                style={{ fontSize: 9.5, fontWeight: 700, background: badge.bg, color: badge.color, border: badge.border, padding: '1px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 3 }}
                              >
                                {badge.label}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                            <span
                              className="lib-cat-pill"
                              style={{
                                background: `${MCP_CATEGORY_COLORS[s.category] || '#6366f1'}20`,
                                color: MCP_CATEGORY_COLORS[s.category] || '#a5b4fc',
                                borderColor: `${MCP_CATEGORY_COLORS[s.category] || '#6366f1'}40`,
                                fontSize: 9.5,
                                padding: '1px 6px',
                              }}
                            >
                              {s.category}
                            </span>
                            {s.toolsCount !== undefined && (
                              <span className="lib-mcp-tools-pill">
                                <Wrench size={9.5} />
                                {s.toolsCount} {s.toolsCount === 1 ? 'tool' : 'tools'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mcp-stock-desc" style={{ fontSize: 11, lineHeight: 1.4, color: 'hsl(var(--muted-foreground))', margin: 0 }}>{s.description}</div>
                      {s.whenToUse && (
                        <div className="lib-mcp-whentouse" title={s.whenToUse}>
                          <Compass size={11} className="lib-mcp-whentouse-icon" />
                          <span>{s.whenToUse}</span>
                        </div>
                      )}
                      {isOAuth && !isAttached && (
                        oauthConnectingServer === s.name ? (
                          <button
                            type="button"
                            className="mcp-stock-connect"
                            disabled
                            style={{ opacity: 0.85, cursor: 'wait', display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <Loader2 size={11} className="lib-spin" />
                            Connecting...
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="mcp-stock-connect"
                            title={`Connect ${s.label}`}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setSelectedStock(s);
                              handleOAuthConnect(s);
                            }}
                          >
                            Connect
                          </button>
                        )
                      )}
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
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, minWidth: 0 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          minWidth: 34,
                          borderRadius: 9,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: selectedBrand?.bgColor,
                          border: `1px solid ${selectedBrand?.borderColor}`,
                        }}
                      >
                        <McpBrandIcon
                          mcp={selectedStock}
                          size={22}
                          fallback={getBrandIcon(selectedStock.name + ' ' + selectedStock.label, 20) || <Cpu size={18} color="#2563eb" />}
                        />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'hsl(var(--foreground))' }}>{selectedStock.label}</span>
                          <span
                            className="lib-cat-pill"
                            style={{
                              background: `${MCP_CATEGORY_COLORS[selectedStock.category] || '#6366f1'}20`,
                              color: MCP_CATEGORY_COLORS[selectedStock.category] || '#a5b4fc',
                              borderColor: `${MCP_CATEGORY_COLORS[selectedStock.category] || '#6366f1'}40`,
                              fontSize: 10,
                              padding: '2px 8px',
                            }}
                          >
                            {selectedStock.category}
                          </span>
                          {selectedStock.toolsCount !== undefined && (
                            <span className="lib-tools-count-badge">
                              <Wrench size={11} />
                              {selectedStock.toolsCount} {selectedStock.toolsCount === 1 ? 'tool' : 'tools'} included
                            </span>
                          )}
                          <span style={{ fontSize: 9.5, fontWeight: 600, color: '#60a5fa', background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 4, padding: '1px 5px' }}>
                            {selectedStock.url ? 'Remote · HTTP' : 'Local · stdio'}
                          </span>
                        </div>
                        {selectedStock.description && (
                          <p style={{ fontSize: 11, lineHeight: 1.4, color: 'hsl(var(--muted-foreground))', margin: '3px 0 0', maxWidth: 640 }}>
                            {selectedStock.description}
                          </p>
                        )}
                        {selectedStock.whenToUse && (
                          <div className="lib-when-to-use-card" style={{ margin: '8px 0 4px 0' }}>
                            <Compass size={14} className="lib-when-to-use-icon" />
                            <div className="lib-when-to-use-body">
                              <span className="lib-when-to-use-title">When to Use (Agent Directive)</span>
                              <p className="lib-when-to-use-text">{selectedStock.whenToUse}</p>
                            </div>
                          </div>
                        )}
                        <p style={{ fontSize: 10.5, color: 'hsl(var(--muted-foreground))', margin: '3px 0 0', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          {selectedStock.url ? (
                            <>Endpoint: {selectedStock.url}</>
                          ) : (
                            <>Command: {selectedStock.command || 'npx'}{selectedStock.args?.length ? ' ' + selectedStock.args.join(' ') : ''}</>
                          )}
                        </p>
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
                            <span>{supportsOAuth(selectedStock) ? 'OAuth Connected' : 'Credentials Configured'}</span>
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

                  {/* Live readiness: is it actually loaded, and what did it return? */}
                  {(() => {
                    const readiness = statusMap[selectedStock.name];
                    const probe = readiness?.probe;
                    if (!readiness && !probe) return null;
                    const ok = probe?.ok === true;
                    const stateLabel = (readiness?.state || (ok ? 'ready' : 'unverified')).replace(/-/g, ' ');
                    return (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          flexWrap: 'wrap',
                          fontSize: 11,
                          color: 'hsl(var(--muted-foreground))',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 8,
                          padding: '7px 10px',
                          marginBottom: 8,
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontWeight: 700,
                            color: ok ? '#10b981' : readiness?.state === 'ready' ? '#60a5fa' : '#f59e0b',
                            textTransform: 'capitalize',
                          }}
                        >
                          {ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                          {ok ? 'Connected' : stateLabel}
                        </span>
                        {typeof probe?.toolCount === 'number' && (
                          <span><strong style={{ color: 'hsl(var(--foreground))' }}>{probe.toolCount}</strong> tools</span>
                        )}
                        {typeof probe?.latencyMs === 'number' && (
                          <span><strong style={{ color: 'hsl(var(--foreground))' }}>{probe.latencyMs}</strong> ms</span>
                        )}
                        {!!probe?.checkedAt && (
                          <span>checked {new Date(probe.checkedAt).toLocaleTimeString()}</span>
                        )}
                        {!!readiness?.missingKeys?.length && (
                          <span style={{ color: '#f59e0b' }}>missing {readiness.missingKeys.join(', ')}</span>
                        )}
                        {!!probe?.detail && (
                          <span
                            title={probe.detail}
                            style={{ opacity: 0.7, maxWidth: 560, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {probe.detail}
                          </span>
                        )}
                      </div>
                    );
                  })()}

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
                  {supportsOAuth(selectedStock) && (
                    <div
                      style={{
                        background: showOAuthConnected
                          ? 'rgba(16,185,129,0.08)'
                          : 'linear-gradient(135deg, rgba(37,99,235,0.18) 0%, rgba(14,165,233,0.12) 100%)',
                        border: showOAuthConnected
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
                            color: showOAuthConnected ? '#10b981' : '#60a5fa',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            marginBottom: 3,
                          }}
                        >
                          <ShieldCheck size={16} />
                          <span>
                            {showOAuthConnected
                              ? providerNeedsLogin
                                ? `${selectedStock.label} MCP.ai Connected — Finish Account Login`
                                : `${selectedStock.label} 1-Click OAuth Connected`
                              : `1-Click OAuth Available for ${selectedStock.label}`}
                          </span>
                        </div>
                        <div style={{ fontSize: 11.5, color: '#94a3b8' }}>
                          {showOAuthConnected
                            ? providerNeedsLogin
                              ? 'MCP.ai authorized this app. Use the provider card below to finish the account login.'
                              : 'Your credentials are authenticated and saved. You can reconnect anytime.'
                            : `Authorize with ${selectedStock.label} to automatically link your account and retrieve credentials.`}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <button
                          type="button"
                          disabled={oauthConnectingServer === selectedStock.name}
                          onClick={() => handleOAuthConnect(selectedStock)}
                          style={{
                            background: showOAuthConnected ? 'rgba(255,255,255,0.08)' : '#2563eb',
                            color: '#ffffff',
                            border: showOAuthConnected ? '1px solid rgba(255,255,255,0.2)' : 'none',
                            padding: '8px 16px',
                            borderRadius: 7,
                            fontSize: 12.5,
                            fontWeight: 600,
                            cursor: oauthConnectingServer === selectedStock.name ? 'wait' : 'pointer',
                            opacity: oauthConnectingServer === selectedStock.name ? 0.85 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            boxShadow: showOAuthConnected ? 'none' : '0 3px 12px rgba(37,99,235,0.4)',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          {oauthConnectingServer === selectedStock.name ? (
                            <>
                              <Loader2 size={14} className="lib-spin" />
                              <span>Connecting...</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck size={14} />
                              <span>{showOAuthConnected ? 'Reconnect Account' : 'Connect with OAuth'}</span>
                            </>
                          )}
                        </button>
                        {showOAuthConnected && (
                          <button
                            type="button"
                            onClick={() => handleDisconnect(selectedStock)}
                            disabled={isDisconnecting}
                            title={`Revoke stored credentials for ${selectedStock.label}`}
                            style={{
                              background: 'transparent',
                              color: '#f87171',
                              border: '1px solid rgba(248,113,113,0.35)',
                              padding: '8px 12px',
                              borderRadius: 7,
                              fontSize: 12.5,
                              fontWeight: 600,
                              cursor: isDisconnecting ? 'not-allowed' : 'pointer',
                              opacity: isDisconnecting ? 0.6 : 1,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}
                          >
                            <LogOut size={14} />
                            <span>{isDisconnecting ? 'Disconnecting…' : 'Disconnect'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* MCP.ai second layer: the platform token is not enough */}
                  {selectedStock.isMcpAi && (
                    <div
                      style={{
                        background: providerConnected
                          ? 'rgba(16,185,129,0.08)'
                          : providerNeedsLogin
                          ? 'rgba(245,158,11,0.09)'
                          : 'rgba(59,130,246,0.08)',
                        border: providerConnected
                          ? '1px solid rgba(16,185,129,0.28)'
                          : providerNeedsLogin
                          ? '1px solid rgba(245,158,11,0.32)'
                          : '1px solid rgba(59,130,246,0.26)',
                        borderRadius: 8,
                        padding: '10px 12px',
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 7,
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: providerConnected
                            ? '#10b981'
                            : providerNeedsLogin
                            ? '#f59e0b'
                            : '#60a5fa',
                          marginBottom: 4,
                        }}
                      >
                        {providerConnected ? (
                          <CheckCircle2 size={14} />
                        ) : providerStatus ? (
                          <AlertTriangle size={14} />
                        ) : (
                          <Loader2 size={14} className="lib-spin" />
                        )}
                        <span>
                          {providerConnected
                            ? `${selectedStock.label} account linked`
                            : providerNeedsLogin
                            ? `${selectedStock.label} account login required`
                            : providerStatus?.state === 'needs-platform-auth'
                            ? 'MCP.ai sign-in required'
                            : providerStatus
                            ? 'Provider account could not be verified'
                            : 'Checking provider account…'}
                        </span>
                      </div>
                      <div style={{ fontSize: 11.5, color: '#94a3b8', lineHeight: 1.55 }}>
                        {providerStatus?.detail ||
                          (providerConnected
                            ? 'MCP.ai and the underlying provider are both authorized.'
                            : 'MCP.ai needs to confirm that your provider account is linked before this server can run.')}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 9 }}>
                        {providerStatus?.connectUrl && providerNeedsLogin && (
                          <button
                            type="button"
                            onClick={() => void openExternalLink(providerStatus.connectUrl!)}
                            style={{
                              background: '#d97706',
                              color: '#fff',
                              border: 'none',
                              padding: '7px 12px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 650,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <ExternalLink size={13} />
                            <span>Open {selectedStock.label} login</span>
                          </button>
                        )}
                        {providerStatus?.state === 'needs-platform-auth' ? (
                          <button
                            type="button"
                            onClick={() => handleReconnectPlatform(selectedStock)}
                            disabled={oauthConnectingServer === selectedStock.name}
                            style={{
                              background: '#2563eb',
                              color: '#fff',
                              border: 'none',
                              padding: '7px 12px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 650,
                              cursor: 'pointer',
                            }}
                          >
                            Reconnect MCP.ai
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleCheckProvider(selectedStock)}
                            disabled={isCheckingProvider}
                            style={{
                              background: 'rgba(255,255,255,0.06)',
                              color: '#cbd5e1',
                              border: '1px solid rgba(148,163,184,0.24)',
                              padding: '7px 12px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: isCheckingProvider ? 'wait' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <RefreshCw size={12} className={isCheckingProvider ? 'lib-spin' : ''} />
                            <span>{isCheckingProvider ? 'Checking…' : 'Check again'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Unconfigured Alert Banner for Non-OAuth MCPs */}
                  {!supportsOAuth(selectedStock) && !isCurrentStockConfigured && (
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
                          {supportsOAuth(selectedStock)
                            ? 'Credentials & Authentication (Or Enter Token Manually)'
                            : 'Credentials & Authentication Keys'}
                        </span>
                      </div>
                      {selectedStock.envKeys.map((envKey) => {
                        const isSet = serverKeys[envKey]?.isSet;
                        // Prefer this exact key's own vendor console; fall back to
                        // the entry-level link. Self-hosted config (DB_HOST,
                        // *_PATH, *_MAX_RESULTS ...) has no key to fetch, so say so
                        // instead of showing a dead link.
                        const perKey = selectedStock.keyLinks?.[envKey];
                        const getUrl = perKey?.url || selectedStock.keyGetUrl;
                        const getLabel = perKey?.label || selectedStock.keyGetLabel || 'Get Key';
                        return (
                          <div key={envKey} className="form-group" style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                              <label className="form-label" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span>{envKey}</span>
                                {isSet && <span style={{ color: '#10b981', fontSize: 10, fontWeight: 600 }}>✓ Saved in Settings</span>}
                              </label>
                              {getUrl ? (
                                <a
                                  href={getUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ fontSize: 10.5, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}
                                >
                                  <span>{getLabel}</span>
                                  <ExternalLink size={10} />
                                </a>
                              ) : (
                                <span
                                  title="This is your own deployment value, not a vendor API key"
                                  style={{ fontSize: 10.5, color: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
                                >
                                  Your own value
                                </span>
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
                {filteredStockMcps.length > 200 && (
                  <div style={{ textAlign: 'center', padding: '12px', color: '#94a3b8', fontSize: 11 }}>
                    Showing first 200 results. Use search to narrow down.
                  </div>
                )}
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
