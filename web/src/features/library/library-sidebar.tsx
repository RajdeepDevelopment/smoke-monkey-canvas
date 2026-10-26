import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  X, Cpu, ChevronRight, Search, Lock,
  CheckCircle2, Package, Globe, Database, Cloud, MessageSquare,
  FileText, DollarSign, Brain, Share2, Code2, KeyRound, Star,
  Clock, ShieldCheck, Copy, Check, Plus, WandSparkles,
  GripHorizontal, SlidersHorizontal, Eye, Edit3, Zap,
  Trash2, Sparkles, ArrowUpCircle, ExternalLink, RefreshCw,
  Building2, Network, Download, Loader2, AlertTriangle, LogOut,
  Terminal, Scale, Car, Shield, BarChart3, Megaphone, CheckSquare,
  Briefcase, Palette, Headphones, ShoppingBag, Users, Compass, Heart,
  GraduationCap, Landmark, Wrench, Play,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getBrandVisuals, BrandIcons, McpBrandIcon } from '../common/brand-icons.js';
import type { StockMcp, McpReadiness } from '../mcp/mcp.types.js';
import { buildStockMcpLookup, canonicalStockMcps } from '../mcp/mcp.catalog.js';
import type { AgentTemplate } from '../agent/agent.templates.js';
import { ENTERPRISE_AGENT_TEMPLATES } from '../agent/agent.templates.js';
import type { LibraryTab, LibDragPayload, PromptPreset, RoleZonePreset, StockSkillItem, ToolKit } from './library.types.js';
import { writeLibDragPayload, setActiveDragPayload, PLUGIN_CATEGORY_ORDER } from './library.types.js';
import { STOCK_SKILLS, TOOL_KITS, SPACE_PRESETS, ROLE_ZONE_PRESETS, HIERARCHICAL_CHAINS } from './library.data.js';
import { CUSTOM_PLUGINS, pluginToSkillItem, formatStars, VERIFIED_AT, type PluginCategory } from './library.plugins.js';
import {
  LIB_TAB_ICONS, LIB_TAB_COLORS, skillCategoryIcon, skillCategoryColor,
  agentCategoryIcon, agentCategoryColor, toolkitIcon, pluginCategoryIcon, pluginCategoryColor,
  personalityPresetIcon, outputPresetIcon,
} from './library.icons.js';
import { LibGlyph, GhAvatar } from './library-glyph.js';
import { AgentResourceRows } from './agent-resource-badges.js';
import { AgentAvatar } from '../agent/agent-avatar.js';
import { PROVIDER_CATALOG } from '../common/provider-catalog.js';
import { getPersonalityMarkdown, getOutputStyleMarkdown } from './library-rich-content.js';
import { AgentClockScheduler, describeCron } from './agent-clock-scheduler.js';
import { openExternalLink, isTauri } from '../../config/desktop.bridge.js';
import { useIsMobile } from '../common/use-mobile.js';
import { LibrarySidebarMobile } from './mobile/library-sidebar.mobile.js';
import { ZoneBuilderModal, type ZoneDraft } from '../space/zone-builder.modal.js';
import type { RoleZone } from '../space/space.types.js';

function formatAgentModelBadge(modelId: string): string {
  if (!modelId) return 'Default Model';
  for (const prov of PROVIDER_CATALOG) {
    const found = prov.models.find((m) => m.id === modelId);
    if (found) {
      return found.label.replace(' ★', '').trim();
    }
  }
  const name = modelId.split('/').pop() || modelId;
  return name.replace(/-20\d{6}/, '').replace(/-instruct$/, '');
}

const MCP_CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Custom MCPs': <Sparkles size={12} />,
  'Development & infra': <Terminal size={12} />,
  'Artificial intelligence': <Brain size={12} />,
  'Databases & Storage': <Database size={12} />,
  'DevOps & Cloud': <Cloud size={12} />,
  'Web Scraping & Search': <Globe size={12} />,
  'Code & Git': <Code2 size={12} />,
  'Tax & compliance': <ShieldCheck size={12} />,
  'Legal': <Scale size={12} />,
  'Vehicles & traffic': <Car size={12} />,
  'Public data lookups': <Search size={12} />,
  'Security & identity': <Shield size={12} />,
  'Analytics & BI': <BarChart3 size={12} />,
  'Marketing': <Megaphone size={12} />,
  'Productivity': <CheckSquare size={12} />,
  'Sales & CRM': <Briefcase size={12} />,
  'Finance & payments': <DollarSign size={12} />,
  'Documents & files': <FileText size={12} />,
  'Communication': <MessageSquare size={12} />,
  'Content & design': <Palette size={12} />,
  'Customer support': <Headphones size={12} />,
  'E-commerce & retail': <ShoppingBag size={12} />,
  'HR & people': <Users size={12} />,
  'Lifestyle': <Compass size={12} />,
  'Health & wellness': <Heart size={12} />,
  'Education': <GraduationCap size={12} />,
  'Government & tenders': <Landmark size={12} />,
  // aliases
  'Web & Scraping': <Globe size={12} />,
  'Communication & Support': <MessageSquare size={12} />,
  'Productivity & Office': <FileText size={12} />,
  'CRM, Sales & Finance': <DollarSign size={12} />,
  'AI & Reasoning': <Brain size={12} />,
  'Social & Promotion': <Share2 size={12} />,
};

const MCP_CATEGORY_COLORS: Record<string, string> = {
  'Custom MCPs': '#10b981',
  'Development & infra': '#3b82f6',
  'Artificial intelligence': '#8b5cf6',
  'Databases & Storage': '#8b5cf6',
  'DevOps & Cloud': '#38bdf8',
  'Web Scraping & Search': '#06b6d4',
  'Code & Git': '#f97316',
  'Tax & compliance': '#10b981',
  'Legal': '#eab308',
  'Vehicles & traffic': '#f97316',
  'Public data lookups': '#06b6d4',
  'Security & identity': '#ef4444',
  'Analytics & BI': '#6366f1',
  'Marketing': '#ec4899',
  'Productivity': '#facc15',
  'Sales & CRM': '#f59e0b',
  'Finance & payments': '#14b8a6',
  'Documents & files': '#84cc16',
  'Communication': '#0ea5e9',
  'Content & design': '#d946ef',
  'Customer support': '#22c55e',
  'E-commerce & retail': '#fb923c',
  'HR & people': '#a855f7',
  'Lifestyle': '#38bdf8',
  'Health & wellness': '#f43f5e',
  'Education': '#c084fc',
  'Government & tenders': '#94a3b8',
  // aliases
  'Web & Scraping': '#06b6d4',
  'Communication & Support': '#10b981',
  'Productivity & Office': '#f59e0b',
  'CRM, Sales & Finance': '#ec4899',
  'AI & Reasoning': '#a78bfa',
  'Social & Promotion': '#fb923c',
};

const MCP_CATEGORIES = [
  'All',
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
  'E-commerce & retail',
  'HR & people',
  'Lifestyle',
  'Health & wellness',
  'Education',
  'Government & tenders',
];

const AGENT_CATEGORIES = [
  'All', 'Software Development', 'Data & Analytics',
  'Security & SecOps', 'Product & Project Management', 'IT & Operations',
  'Sales & Marketing', 'Customer Experience', 'Finance & Accounting',
  'People & Talent', 'Legal & Compliance',
];

const PERSONALITY_CATEGORIES = [
  'All', 'Tone & Mood', 'Warm & Emotional', 'Age & Generation',
  'Professional Personas', 'Direct & Blunt', 'Academic & Scholarly',
  'Creative & Narrative', 'Technical & Domain',
];

const OUTPUT_STYLE_CATEGORIES = [
  'All', 'Visual & Structured', 'Code & Technical', 'Structure & Length',
  'Data & Config', 'Reasoning & Interaction',
];

const TOOL_CATEGORIES = [
  'All', 'Code & Navigation', 'Editing & Patches', 'Files & System', 'Terminal & Exec',
];

export const ALL_BUILTIN_TOOL_NAMES = [
  'read_file', 'write_file', 'edit_file', 'line_edit', 'replace_lines',
  'apply_patch', 'delete_file', 'list_dir', 'inspect_dir', 'run_command',
  'run_test', 'glob_find', 'grep_search', 'git_status', 'git_diff',
  'git_log', 'ask_user', 'context_manage', 'finish_task', 'todo_write',
  'mcp_inspect', 'mcp_approve', 'skill_list', 'skill_use',
];

export const TOOLKIT_PALETTE = [
  '#06b6d4', '#f97316', '#8b5cf6', '#3b82f6',
  '#10b981', '#ef4444', '#a78bfa', '#f59e0b',
  '#ec4899', '#64748b',
];

const STORAGE_KEYS = {
  mcps: 'smoke_canvas_custom_mcps',
  skills: 'smoke_canvas_custom_skills',
  plugins: 'smoke_canvas_custom_plugins',
  agents: 'smoke_canvas_custom_agents',
  toolkits: 'smoke_canvas_custom_toolkits',
  personas: 'smoke_canvas_custom_personas',
  outputs: 'smoke_canvas_custom_outputs',
  zones: 'smoke_canvas_custom_zone_presets',
} as const;

function loadCustomStorage<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomStorage<T>(key: string, items: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to write to localStorage for key:', key, err);
  }
}

export const createBlankCustomMcp = (): StockMcp => ({
  name: `custom-mcp-${Date.now()}`,
  label: 'New Custom MCP',
  category: 'DevOps & Cloud',
  description: 'Custom Model Context Protocol server integrated with workspace tools and endpoints.',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-postgres', 'postgresql://localhost:5432/mydb'],
  url: '',
  envKeys: [],
  isCustom: true,
});

export const createBlankCustomSkill = (): StockSkillItem => ({
  id: `custom-skill-${Date.now()}`,
  name: 'New Custom Skill',
  category: 'Engineering & DevOps',
  description: 'Custom specialist skill workflow and directive procedure.',
  tags: ['Custom', 'Workflow'],
  content: `# Custom Skill Directive\n\n1. Analyze request and formulate clear milestones.\n2. Execute structured steps using workspace primitives.\n3. Validate output accuracy against project specifications.`,
  isCustom: true,
});

export const createBlankCustomAgent = (): AgentTemplate => ({
  id: `custom-agent-${Date.now()}`,
  name: 'Custom Autonomous Specialist',
  category: 'Software Development',
  role: 'Specialized Autonomous Worker',
  description: 'Custom autonomous agent configured with your chosen model, directive prompt, schedule, and tool permissions.',
  system_prompt: 'You are an autonomous AI specialist for Smoke Monkey Canvas. Formulate structured execution plans, invoke available tools methodically, verify results before concluding tasks, and maintain high standards of quality.',
  default_model: 'nvidia/nemotron-3-super-120b-a12b',
  provider: 'nvidia',
  tags: ['Custom', 'Autonomous', 'Specialist'],
  suggested_cron: null,
  policies: ['Require user confirmation before executing irreversible operations', 'Log telemetry on tool errors'],
  recommended_mcps: ['git-mcp'],
  recommended_skills: [],
  isCustom: true,
});

export const createBlankCustomToolkit = (): ToolKit => ({
  id: `custom-toolkit-${Date.now()}`,
  name: 'New Custom Toolkit',
  description: 'Custom suite of workspace execution tools unlocked for agent operation.',
  color: '#3b82f6',
  tools: ['read_file', 'write_file', 'run_command', 'grep_search'],
  isCustom: true,
});

export const createBlankCustomPersona = (): PromptPreset => ({
  id: `custom-persona-${Date.now()}`,
  name: 'New Custom Persona',
  category: 'Tone & Mood',
  description: 'Custom behavioral persona and conversational tone.',
  directive: 'Adopt a concise, rigorous, and highly analytical communication style. Prioritize verified facts, precise reasoning, and structured bullet points.',
  isCustom: true,
});

export const createBlankCustomOutput = (): PromptPreset => ({
  id: `custom-output-${Date.now()}`,
  name: 'New Custom Output Style',
  category: 'Visual & Structured',
  description: 'Custom structured layout and formatting specifications.',
  directive: 'Format all responses using clear markdown sections: 1. Executive Summary, 2. Analysis & Evidence, 3. Step-by-Step Action Plan, 4. Risk & Validation Matrix.',
  isCustom: true,
});

export interface ParsedMcpItem {
  id: string;
  name: string;
  label: string;
  category: string;
  transport: 'stdio' | 'sse';
  command?: string;
  args?: string[];
  url?: string;
  envKeys: string[];
  description?: string;
}

export function parseMcpJsonString(raw: string): { servers: ParsedMcpItem[]; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { servers: [] };

  let data: any;
  try {
    data = JSON.parse(trimmed);
  } catch (err: any) {
    return { servers: [], error: err?.message || 'Invalid JSON syntax' };
  }

  const results: ParsedMcpItem[] = [];

  const extractItem = (key: string, obj: any): ParsedMcpItem | null => {
    if (!obj || typeof obj !== 'object') return null;

    const name = obj.name || key || `custom-mcp-${Date.now().toString().slice(-4)}`;
    const label = obj.label || obj.title || key || name;
    const category = obj.category || 'DevOps & Cloud';
    const description = obj.description || `Custom MCP server (${name}).`;

    // SSE / HTTP check
    if (obj.url || obj.transport === 'sse' || obj.type === 'sse') {
      const envKeys = obj.env ? Object.keys(obj.env) : (Array.isArray(obj.envKeys) ? obj.envKeys : []);
      return {
        id: `custom-mcp-${name}-${Date.now().toString().slice(-4)}`,
        name,
        label,
        category,
        transport: 'sse',
        url: obj.url || '',
        envKeys,
        description,
      };
    }

    // stdio check
    const command = obj.command || 'npx';
    let args: string[] = [];
    if (Array.isArray(obj.args)) {
      args = obj.args.map(String);
    } else if (typeof obj.args === 'string') {
      args = obj.args.trim().split(/\s+/);
    }
    const envKeys = obj.env ? Object.keys(obj.env) : (Array.isArray(obj.envKeys) ? obj.envKeys : []);

    return {
      id: `custom-mcp-${name}-${Date.now().toString().slice(-4)}`,
      name,
      label,
      category,
      transport: 'stdio',
      command,
      args,
      envKeys,
      description,
    };
  };

  // Check { mcpServers: { ... } }
  if (data.mcpServers && typeof data.mcpServers === 'object') {
    for (const [k, v] of Object.entries(data.mcpServers)) {
      const item = extractItem(k, v);
      if (item) results.push(item);
    }
  } else if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      const item = extractItem(`server-${i + 1}`, data[i]);
      if (item) results.push(item);
    }
  } else if (typeof data === 'object') {
    if (data.command || data.url) {
      const item = extractItem(data.name || 'custom-server', data);
      if (item) results.push(item);
    } else {
      const entries = Object.entries(data);
      for (const [k, v] of entries) {
        if (v && typeof v === 'object' && ((v as any).command || (v as any).url || (v as any).args)) {
          const item = extractItem(k, v);
          if (item) results.push(item);
        }
      }
      if (results.length === 0 && entries.length > 0) {
        const item = extractItem('custom-server', data);
        if (item) results.push(item);
      }
    }
  }

  if (results.length === 0) {
    return { servers: [], error: 'No MCP server definitions found in JSON. Expected "command", "args", or "url".' };
  }

  return { servers: results };
}

export const MCP_JSON_SAMPLES = {
  postgres: JSON.stringify(
    {
      mcpServers: {
        postgres: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-postgres', 'postgresql://localhost:5432/mydb'],
          env: {
            PGPASSWORD: 'secret_password',
          },
        },
      },
    },
    null,
    2,
  ),
  github: JSON.stringify(
    {
      mcpServers: {
        github: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-github'],
          env: {
            GITHUB_PERSONAL_ACCESS_TOKEN: 'ghp_exampleToken123',
          },
        },
      },
    },
    null,
    2,
  ),
  filesystem: JSON.stringify(
    {
      mcpServers: {
        filesystem: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem', '/Users/username/Desktop'],
        },
      },
    },
    null,
    2,
  ),
  sse: JSON.stringify(
    {
      mcpServers: {
        'remote-api': {
          url: 'https://mcp.example.com/sse',
          env: {
            API_KEY: 'Bearer eyJhbGciOi...',
          },
        },
      },
    },
    null,
    2,
  ),
};

/** Which part of the Skills tab is showing: Git stock skills or GitHub Plugins. */
type SkillSource = 'stock' | 'plugins';

/** Stock skills relevant to git workflows. Kept narrow on purpose. */
const GIT_STOCK_IDS = new Set(['git-workflow-and-versioning', 'git-workflow-governance', 'git-commit-writer']);

const isGitStockSkill = (skill: StockSkillItem): boolean => {
  if (GIT_STOCK_IDS.has(skill.id)) return true;
  if ((skill.tags || []).some((tag) => /^git$/i.test(tag) || /^git-/i.test(tag))) return true;
  return /\bgit\b/i.test(`${skill.name} ${skill.description}`);
};

/** Detail inspector item types */
export type DetailItem =
  | { kind: 'agent'; item: AgentTemplate; isCustom?: boolean }
  | { kind: 'mcp'; item: StockMcp; isCustom?: boolean }
  | { kind: 'skill'; item: StockSkillItem; isCustom?: boolean }
  | { kind: 'toolkit'; item: ToolKit; isCustom?: boolean }
  | { kind: 'personality'; item: PromptPreset; isCustom?: boolean }
  | { kind: 'outputStyle'; item: PromptPreset; isCustom?: boolean };

/** Curated GitHub plugins are static, so their skill directives are built once. */
const PLUGIN_SKILLS: StockSkillItem[] = CUSTOM_PLUGINS.map(pluginToSkillItem);

const TABS: { id: LibraryTab; label: string; shortLabel: string; color: string }[] = [
  { id: 'mcp', label: 'MCP Servers', shortLabel: 'MCP', color: LIB_TAB_COLORS.mcp },
  { id: 'spaces', label: 'Office Spaces', shortLabel: 'Spaces', color: LIB_TAB_COLORS.spaces },
  { id: 'zones', label: 'Zones', shortLabel: 'Zones', color: LIB_TAB_COLORS.zones },
  { id: 'skills', label: 'Skills', shortLabel: 'Skills', color: LIB_TAB_COLORS.skills },
  { id: 'agents', label: 'Agents', shortLabel: 'Agents', color: LIB_TAB_COLORS.agents },
  { id: 'tools', label: 'Toolkits', shortLabel: 'Tools', color: LIB_TAB_COLORS.tools },
  { id: 'personality', label: 'Personality', shortLabel: 'Persona', color: LIB_TAB_COLORS.personality },
  { id: 'output', label: 'Output Style', shortLabel: 'Output', color: LIB_TAB_COLORS.output },
];

const TAB_DESCRIPTIONS: Record<LibraryTab, string> = {
  mcp: 'MCP Servers',
  spaces: 'Office Spaces & Pods',
  zones: 'Hierarchical Role Zones',
  skills: 'Agent Skills',
  agents: 'Agent Templates',
  tools: 'Custom Toolkits',
  personality: 'Persona Directives',
  output: 'Output Styles',
};

interface LibrarySidebarProps {
  stockMcps: StockMcp[];
  /** key name -> whether a credential is currently stored (from /api/settings/keys) */
  configuredKeys: Record<string, boolean>;
  /** Personality voice presets from `/api/personality/presets`. */
  personalityPresets: PromptPreset[];
  /** Output/format presets from `/api/personality/presets`. */
  outputStylePresets: PromptPreset[];
  /**
   * Bundled + uploaded skills from `/api/skills/stock`.
   */
  serverStockSkills?: StockSkillItem[];
  /** Open the connect/credential flow for a stock MCP that is missing keys. */
  onConnectKey: (mcp: StockMcp) => void;
  /** Revoke stored OAuth tokens / credentials for a connected MCP. */
  onDisconnectKey?: (mcp: StockMcp) => void;
  /**
   * Server-computed readiness (from `/api/mcp/status`). Authoritative: unlike
   * env-key presence it also knows about OAuth tokens, so an OAuth-connected
   * server is not wrongly shown as locked.
   */
  mcpReadiness?: Record<string, McpReadiness>;
  /** Fired when an agent template item is activated (double-click / Enter / Spawn button). */
  onSpawnTemplate?: (template: AgentTemplate) => void;
  /** Name of the MCP currently executing dynamic client registration / OAuth connect */
  connectingMcpName?: string | null;
  /** Persisted hierarchical role zones currently on the canvas. */
  roleZones?: RoleZone[];
}

const RAIL_WIDTH = 58;
const PANEL_WIDTH = 380; // Widened for spacious card layout & category pills
const DETAIL_WIDTH = 460; // Widened for rich markdown, forms & live previews

import { fuzzyMatch } from '../common/fuzzy-search.js';

/** Fuzzy match across any of the supplied fields with typo tolerance and token scoring. */
const matchQuery = (fields: string[], query: string) => {
  return fuzzyMatch(fields, query);
};


export const LibrarySidebar: React.FC<LibrarySidebarProps> = ({
  stockMcps,
  configuredKeys,
  personalityPresets,
  outputStylePresets,
  serverStockSkills,
  onConnectKey,
  onDisconnectKey,
  mcpReadiness,
  onSpawnTemplate,
  connectingMcpName,
  roleZones = [],
}) => {
  const [activeTab, setActiveTab] = useState<LibraryTab | null>(null);
  const AGENT_PAGE_SIZE = 60;
  const [agentVisibleCount, setAgentVisibleCount] = useState(AGENT_PAGE_SIZE);
  const agentSentinelRef = useRef<HTMLDivElement | null>(null);
  const isMobile = useIsMobile();
  const [selectedDetail, setSelectedDetail] = useState<DetailItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [skillSource, setSkillSource] = useState<SkillSource>('plugins');
  const [zoneSubTab, setZoneSubTab] = useState<'chains' | 'single'>('chains');
  const [searchQuery, setSearchQuery] = useState('');
  const [manualCats, setManualCats] = useState<Set<string>>(new Set(['Custom MCPs', 'Code & Git', 'Web & Scraping']));
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [pos, setPos] = useState({ x: 12, y: 88 });
  const [isDraggingDock, setIsDraggingDock] = useState(false);
  const posRef = useRef(pos);
  posRef.current = pos;
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const selectedDetailRef = useRef(selectedDetail);
  selectedDetailRef.current = selectedDetail;
  const dragRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);
  const isDraggingRef = useRef(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // ── Version & Upgrade State ──
  const [versionInfo, setVersionInfo] = useState<{
    currentVersion: string;
    latestVersion: string;
    harnessVersion: string;
    latestHarnessVersion: string;
    hasUpdate: boolean;
    upgradeCommand: string;
    releaseNotesUrl: string;
    canUpgrade?: boolean;
  } | null>(null);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [upgradeCopied, setUpgradeCopied] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [upgradeJob, setUpgradeJob] = useState<{
    state: 'idle' | 'installing' | 'success' | 'failed';
    log: string;
    error: string | null;
  } | null>(null);
  const [upgradeStartError, setUpgradeStartError] = useState<string | null>(null);
  const [isStartingUpgrade, setIsStartingUpgrade] = useState(false);
  const [showManualUpgrade, setShowManualUpgrade] = useState(false);

  const upgradePhase: 'idle' | 'installing' | 'success' | 'failed' =
    upgradeJob?.state && upgradeJob.state !== 'idle' ? upgradeJob.state : 'idle';
  const upgradeLogTail = (upgradeJob?.log || '')
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .slice(-4)
    .join('\n');
  const showManualCommand =
    showManualUpgrade || upgradePhase === 'failed' || versionInfo?.canUpgrade === false;

  const checkAppVersion = useCallback(async () => {
    setIsCheckingUpdate(true);
    try {
      const res = await fetch('/api/settings/version');
      if (res.ok) {
        const data = await res.json();
        setVersionInfo(data);
      }
    } catch (e) {
      console.warn('[LibrarySidebar] Failed checking version:', e);
    } finally {
      setIsCheckingUpdate(false);
    }
  }, []);

  const startUpgrade = useCallback(async () => {
    setUpgradeStartError(null);
    setIsStartingUpgrade(true);
    try {
      const res = await fetch('/api/settings/upgrade', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUpgradeStartError(data.error || 'Could not start the update.');
        return;
      }
      setUpgradeJob(data);
    } catch {
      setUpgradeStartError('Could not reach the update service.');
    } finally {
      setIsStartingUpgrade(false);
    }
  }, []);

  useEffect(() => {
    checkAppVersion();
  }, [checkAppVersion]);

  // Poll the upgrade job while it installs
  useEffect(() => {
    if (upgradeJob?.state !== 'installing') return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch('/api/settings/upgrade/status');
        if (!res.ok) return;
        const data = await res.json();
        // A successful install restarts the daemon, which wipes the in-memory
        // job — treat a reset back to idle as a completed install.
        if (data.state === 'idle') {
          setUpgradeJob({ ...data, state: 'success' });
          return;
        }
        setUpgradeJob(data);
      } catch {}
    }, 1500);
    return () => clearInterval(timer);
  }, [upgradeJob?.state]);

  // After a successful install, wait for the restarted server to report the new
  // version (tolerating brief downtime), then reload the window.
  useEffect(() => {
    if (upgradeJob?.state !== 'success') return;
    const target = versionInfo?.latestVersion;
    if (!target) return;
    let attempts = 0;
    const timer = setInterval(async () => {
      attempts += 1;
      try {
        const res = await fetch('/api/settings/version');
        if (res.ok) {
          const data = await res.json();
          if (data.currentVersion === target) {
            clearInterval(timer);
            window.location.reload();
            return;
          }
        }
      } catch {}
      if (attempts >= 20) {
        clearInterval(timer);
        window.location.reload();
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [upgradeJob?.state, versionInfo?.latestVersion]);

  // ── Native Desktop Menu & Global Key Action Listeners ──
  useEffect(() => {
    const handleSetTab = (e: Event) => {
      const tab = (e as CustomEvent<LibraryTab>).detail;
      setActiveTab(tab);
      setSelectedDetail(null);
    };
    const handleToggleDock = () => {
      setActiveTab((prev) => (prev ? null : 'mcp'));
      setSelectedDetail(null);
    };
    const handleCheckUpdate = () => {
      checkAppVersion();
      setShowVersionModal(true);
    };
    window.addEventListener('canvas-set-library-tab', handleSetTab);
    window.addEventListener('canvas-toggle-library', handleToggleDock);
    window.addEventListener('canvas-check-updates', handleCheckUpdate);
    return () => {
      window.removeEventListener('canvas-set-library-tab', handleSetTab);
      window.removeEventListener('canvas-toggle-library', handleToggleDock);
      window.removeEventListener('canvas-check-updates', handleCheckUpdate);
    };
  }, [checkAppVersion]);

  // ── Custom Persistent Collections (Stored in localStorage) ──
  const [customMcps, setCustomMcps] = useState<StockMcp[]>(() => loadCustomStorage<StockMcp>(STORAGE_KEYS.mcps));
  const [customSkills, setCustomSkills] = useState<StockSkillItem[]>(() => loadCustomStorage<StockSkillItem>(STORAGE_KEYS.skills));
  const [customPlugins, setCustomPlugins] = useState<StockSkillItem[]>(() => loadCustomStorage<StockSkillItem>(STORAGE_KEYS.plugins));
  const [customAgents, setCustomAgents] = useState<AgentTemplate[]>(() => loadCustomStorage<AgentTemplate>(STORAGE_KEYS.agents));
  const [customToolkits, setCustomToolkits] = useState<ToolKit[]>(() => loadCustomStorage<ToolKit>(STORAGE_KEYS.toolkits));
  const [customPersonas, setCustomPersonas] = useState<PromptPreset[]>(() => loadCustomStorage<PromptPreset>(STORAGE_KEYS.personas));
  const [customOutputs, setCustomOutputs] = useState<PromptPreset[]>(() => loadCustomStorage<PromptPreset>(STORAGE_KEYS.outputs));
  const [customZones, setCustomZones] = useState<RoleZonePreset[]>(() => loadCustomStorage<RoleZonePreset>(STORAGE_KEYS.zones));

  // Sync custom plugins from browser storage to server database so agent search can find them
  useEffect(() => {
    if (customPlugins && customPlugins.length > 0) {
      const payload = customPlugins.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        description: p.description,
        content: p.content,
      }));
      fetch('/api/skills/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }
  }, [customPlugins]);
  const [isZoneBuilderOpen, setIsZoneBuilderOpen] = useState(false);
  const [editingZonePreset, setEditingZonePreset] = useState<RoleZonePreset | null>(null);

  // ── GitHub Plugin Import Modal State ──
  const [showGhImportModal, setShowGhImportModal] = useState(false);
  const [ghImportInput, setGhImportInput] = useState('');
  const [ghImportLoading, setGhImportLoading] = useState(false);
  const [ghImportError, setGhImportError] = useState<string | null>(null);
  const [ghImportPreview, setGhImportPreview] = useState<{
    repo: string;
    owner: string;
    name: string;
    description: string;
    stars: number;
    license: string;
    category: PluginCategory;
    avatarUrl?: string;
    topics?: string[];
    content?: string;
  } | null>(null);

  // ── Form States for Live Editing & Previewing ──
  // Agent Form State
  const [customAgentName, setCustomAgentName] = useState('');
  const [customAgentModel, setCustomAgentModel] = useState('');
  const [customAgentProvider, setCustomAgentProvider] = useState('');
  const [customAgentRole, setCustomAgentRole] = useState('');
  const [customAgentCategory, setCustomAgentCategory] = useState('Software Development');
  const [customAgentDescription, setCustomAgentDescription] = useState('');
  const [customAgentCron, setCustomAgentCron] = useState('');
  const [customAgentPrompt, setCustomAgentPrompt] = useState('');
  const [directiveMode, setDirectiveMode] = useState<'preview' | 'edit'>('preview');

  // MCP Form State
  const [mcpFormName, setMcpFormName] = useState('');
  const [mcpFormLabel, setMcpFormLabel] = useState('');
  const [mcpFormCategory, setMcpFormCategory] = useState('DevOps & Cloud');
  const [mcpFormDescription, setMcpFormDescription] = useState('');
  const [mcpFormTransport, setMcpFormTransport] = useState<'stdio' | 'sse'>('stdio');
  const [mcpFormCommand, setMcpFormCommand] = useState('npx');
  const [mcpFormArgs, setMcpFormArgs] = useState('');
  const [mcpFormUrl, setMcpFormUrl] = useState('');
  const [mcpFormEnvKeys, setMcpFormEnvKeys] = useState('');
  const [mcpEditMode, setMcpEditMode] = useState<'form' | 'json'>('form');
  const [mcpJsonInput, setMcpJsonInput] = useState('');

  // Skill Form State
  const [skillFormName, setSkillFormName] = useState('');
  const [skillFormCategory, setSkillFormCategory] = useState('Engineering & DevOps');
  const [skillFormDescription, setSkillFormDescription] = useState('');
  const [skillFormTags, setSkillFormTags] = useState('');
  const [skillFormContent, setSkillFormContent] = useState('');
  const [skillMode, setSkillMode] = useState<'preview' | 'edit'>('preview');

  // Toolkit Form State
  const [toolkitFormName, setToolkitFormName] = useState('');
  const [toolkitFormDescription, setToolkitFormDescription] = useState('');
  const [toolkitFormColor, setToolkitFormColor] = useState('#3b82f6');
  const [toolkitFormTools, setToolkitFormTools] = useState<string[]>([]);
  const [newToolInput, setNewToolInput] = useState('');

  // Personality Form State
  const [personaFormName, setPersonaFormName] = useState('');
  const [personaFormCategory, setPersonaFormCategory] = useState('Tone & Mood');
  const [personaFormDescription, setPersonaFormDescription] = useState('');
  const [personaFormDirective, setPersonaFormDirective] = useState('');
  const [personaMode, setPersonaMode] = useState<'preview' | 'edit'>('preview');

  // Output Style Form State
  const [outputFormName, setOutputFormName] = useState('');
  const [outputFormCategory, setOutputFormCategory] = useState('Visual & Structured');
  const [outputFormDescription, setOutputFormDescription] = useState('');
  const [outputFormDirective, setOutputFormDirective] = useState('');
  const [outputMode, setOutputMode] = useState<'preview' | 'edit'>('preview');

  // Sync state whenever selectedDetail changes
  useEffect(() => {
    if (!selectedDetail) return;
    if (selectedDetail.kind === 'agent') {
      const a = selectedDetail.item;
      setCustomAgentName(a.name);
      setCustomAgentModel(a.default_model);
      setCustomAgentProvider(a.provider || 'nvidia');
      setCustomAgentRole(a.role);
      setCustomAgentCategory(a.category || 'Software Development');
      setCustomAgentDescription(a.description || '');
      setCustomAgentCron(a.suggested_cron || '');
      setCustomAgentPrompt(a.system_prompt || '');
      setDirectiveMode(selectedDetail.isCustom || a.isCustom ? 'edit' : 'preview');
    } else if (selectedDetail.kind === 'mcp') {
      const m = selectedDetail.item;
      setMcpFormName(m.name);
      setMcpFormLabel(m.label);
      setMcpFormCategory(m.category || 'DevOps & Cloud');
      setMcpFormDescription(m.description || '');
      setMcpFormTransport(m.url ? 'sse' : 'stdio');
      setMcpFormCommand(m.command || 'npx');
      setMcpFormArgs(m.args ? m.args.join(' ') : '');
      setMcpFormUrl(m.url || '');
      setMcpFormEnvKeys(m.envKeys ? m.envKeys.join(', ') : '');
    } else if (selectedDetail.kind === 'skill') {
      const s = selectedDetail.item;
      setSkillFormName(s.name);
      setSkillFormCategory(s.category || 'Engineering & DevOps');
      setSkillFormDescription(s.description || '');
      setSkillFormTags(s.tags ? s.tags.join(', ') : '');
      setSkillFormContent(s.content || '');
      setSkillMode(selectedDetail.isCustom || s.isCustom ? 'edit' : 'preview');
    } else if (selectedDetail.kind === 'toolkit') {
      const k = selectedDetail.item;
      setToolkitFormName(k.name);
      setToolkitFormDescription(k.description || '');
      setToolkitFormColor(k.color || '#3b82f6');
      setToolkitFormTools([...(k.tools || [])]);
      setNewToolInput('');
    } else if (selectedDetail.kind === 'personality') {
      const p = selectedDetail.item;
      setPersonaFormName(p.name);
      setPersonaFormCategory(p.category || 'Tone & Mood');
      setPersonaFormDescription(p.description || '');
      setPersonaFormDirective(p.directive || '');
      setPersonaMode(selectedDetail.isCustom || p.isCustom ? 'edit' : 'preview');
    } else if (selectedDetail.kind === 'outputStyle') {
      const o = selectedDetail.item;
      setOutputFormName(o.name);
      setOutputFormCategory(o.category || 'Visual & Structured');
      setOutputFormDescription(o.description || '');
      setOutputFormDirective(o.directive || '');
      setOutputMode(selectedDetail.isCustom || o.isCustom ? 'edit' : 'preview');
    }
  }, [selectedDetail]);

  const triggerSaveToast = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  const serializeCurrentMcpToJson = useCallback(() => {
    const isSse = mcpFormTransport === 'sse';
    const envObj: Record<string, string> = {};
    if (mcpFormEnvKeys.trim()) {
      for (const k of mcpFormEnvKeys.split(',').map((s) => s.trim()).filter(Boolean)) {
        envObj[k] = '';
      }
    }
    const config = {
      mcpServers: {
        [mcpFormName || 'custom-mcp']: isSse
          ? {
              url: mcpFormUrl || 'http://localhost:8000/sse',
              ...(Object.keys(envObj).length > 0 ? { env: envObj } : {}),
            }
          : {
              command: mcpFormCommand || 'npx',
              args: mcpFormArgs ? mcpFormArgs.split(/\s+/).filter(Boolean) : [],
              ...(Object.keys(envObj).length > 0 ? { env: envObj } : {}),
            },
      },
    };
    return JSON.stringify(config, null, 2);
  }, [mcpFormTransport, mcpFormName, mcpFormUrl, mcpFormEnvKeys, mcpFormCommand, mcpFormArgs]);

  const parsedMcpJson = useMemo(() => {
    if (!mcpJsonInput.trim()) return null;
    return parseMcpJsonString(mcpJsonInput);
  }, [mcpJsonInput]);

  const handleApplyJsonToForm = (srv: ParsedMcpItem) => {
    setMcpFormName(srv.name);
    setMcpFormLabel(srv.label);
    setMcpFormCategory(srv.category);
    setMcpFormTransport(srv.transport);
    setMcpFormCommand(srv.command || 'npx');
    setMcpFormArgs(srv.args ? srv.args.join(' ') : '');
    setMcpFormUrl(srv.url || '');
    setMcpFormEnvKeys(srv.envKeys.join(', '));
    setMcpFormDescription(srv.description || '');
    setMcpEditMode('form');
    triggerSaveToast(`Applied "${srv.label}" config to form!`);
  };

  const handleSaveJsonServerDirectly = (srv: ParsedMcpItem) => {
    const mcp: StockMcp = {
      name: srv.name,
      label: srv.label,
      category: srv.category,
      description: srv.description || `Custom MCP server (${srv.name}).`,
      command: srv.transport === 'stdio' ? srv.command : undefined,
      args: srv.transport === 'stdio' ? srv.args : undefined,
      url: srv.transport === 'sse' ? srv.url : undefined,
      envKeys: srv.envKeys,
      isCustom: true,
    };
    setCustomMcps((prev) => {
      const idx = prev.findIndex((m) => m.name === mcp.name);
      const next = idx >= 0 ? [...prev.slice(0, idx), mcp, ...prev.slice(idx + 1)] : [mcp, ...prev];
      saveCustomStorage(STORAGE_KEYS.mcps, next);
      return next;
    });
    setSelectedDetail({ kind: 'mcp', item: mcp, isCustom: true });
    setMcpEditMode('form');
    triggerSaveToast(`Saved MCP "${mcp.label}" to library!`);
  };

  const handleImportAllServersFromJson = (servers: ParsedMcpItem[]) => {
    const newItems: StockMcp[] = servers.map((srv) => ({
      name: srv.name,
      label: srv.label,
      category: srv.category,
      description: srv.description || `Custom MCP server (${srv.name}).`,
      command: srv.transport === 'stdio' ? srv.command : undefined,
      args: srv.transport === 'stdio' ? srv.args : undefined,
      url: srv.transport === 'sse' ? srv.url : undefined,
      envKeys: srv.envKeys,
      isCustom: true,
    }));

    setCustomMcps((prev) => {
      const map = new Map<string, StockMcp>();
      for (const m of prev) map.set(m.name, m);
      for (const m of newItems) map.set(m.name, m);
      const next = Array.from(map.values());
      saveCustomStorage(STORAGE_KEYS.mcps, next);
      return next;
    });

    if (newItems.length > 0) {
      setSelectedDetail({ kind: 'mcp', item: newItems[0], isCustom: true });
    }
    setMcpEditMode('form');
    triggerSaveToast(`Imported ${newItems.length} MCP server${newItems.length > 1 ? 's' : ''} to library!`);
  };

  // ── Live customized builders for dragging / execution ──
  const getCustomizedAgent = useCallback((): AgentTemplate => {
    const base = selectedDetail?.kind === 'agent' ? selectedDetail.item : createBlankCustomAgent();
    return {
      ...base,
      name: customAgentName.trim() || base.name,
      category: customAgentCategory.trim() || base.category,
      role: customAgentRole.trim() || base.role,
      description: customAgentDescription.trim() || base.description,
      default_model: customAgentModel.trim() || base.default_model,
      provider: customAgentProvider.trim() || base.provider,
      suggested_cron: customAgentCron.trim() || null,
      system_prompt: customAgentPrompt.trim() || base.system_prompt,
      isCustom: true,
    };
  }, [selectedDetail, customAgentName, customAgentCategory, customAgentRole, customAgentDescription, customAgentModel, customAgentProvider, customAgentCron, customAgentPrompt]);

  const getLiveCustomMcp = useCallback((): StockMcp => {
    const args = mcpFormArgs.trim() ? mcpFormArgs.trim().split(/\s+/) : [];
    const envKeys = mcpFormEnvKeys.trim() ? mcpFormEnvKeys.split(',').map((s) => s.trim()).filter(Boolean) : [];
    return {
      name: mcpFormName.trim() || `custom-mcp-${Date.now()}`,
      label: mcpFormLabel.trim() || 'Custom MCP Server',
      category: mcpFormCategory.trim() || 'DevOps & Cloud',
      description: mcpFormDescription.trim() || 'Custom MCP server.',
      command: mcpFormTransport === 'stdio' ? (mcpFormCommand.trim() || 'npx') : undefined,
      args: mcpFormTransport === 'stdio' ? args : undefined,
      url: mcpFormTransport === 'sse' ? mcpFormUrl.trim() : undefined,
      envKeys,
      isCustom: true,
    };
  }, [mcpFormName, mcpFormLabel, mcpFormCategory, mcpFormDescription, mcpFormTransport, mcpFormCommand, mcpFormArgs, mcpFormUrl, mcpFormEnvKeys]);

  const getLiveCustomSkill = useCallback((): StockSkillItem => {
    const tags = skillFormTags.trim() ? skillFormTags.split(',').map((t) => t.trim()).filter(Boolean) : ['Custom'];
    return {
      id: (selectedDetail?.kind === 'skill' && selectedDetail.item.id) || `custom-skill-${Date.now()}`,
      name: skillFormName.trim() || 'Custom Skill',
      category: skillFormCategory.trim() || 'Engineering & DevOps',
      description: skillFormDescription.trim() || 'Custom specialist workflow directive.',
      tags,
      content: skillFormContent.trim() || '# Custom Directive',
      isCustom: true,
    };
  }, [selectedDetail, skillFormName, skillFormCategory, skillFormDescription, skillFormTags, skillFormContent]);

  const getLiveCustomToolkit = useCallback((): ToolKit => ({
    id: (selectedDetail?.kind === 'toolkit' && selectedDetail.item.id) || `custom-toolkit-${Date.now()}`,
    name: toolkitFormName.trim() || 'Custom Toolkit',
    description: toolkitFormDescription.trim() || 'Custom suite of workspace tools.',
    color: toolkitFormColor.trim() || '#3b82f6',
    tools: toolkitFormTools.length > 0 ? toolkitFormTools : ['read_file', 'write_file', 'run_command'],
    isCustom: true,
  }), [selectedDetail, toolkitFormName, toolkitFormDescription, toolkitFormColor, toolkitFormTools]);

  const getLiveCustomPersona = useCallback((): PromptPreset => ({
    id: (selectedDetail?.kind === 'personality' && selectedDetail.item.id) || `custom-persona-${Date.now()}`,
    name: personaFormName.trim() || 'Custom Persona',
    category: personaFormCategory.trim() || 'Tone & Mood',
    description: personaFormDescription.trim() || 'Custom persona voice.',
    directive: personaFormDirective.trim() || 'Concise and analytical communication.',
    isCustom: true,
  }), [selectedDetail, personaFormName, personaFormCategory, personaFormDescription, personaFormDirective]);

  const getLiveCustomOutput = useCallback((): PromptPreset => ({
    id: (selectedDetail?.kind === 'outputStyle' && selectedDetail.item.id) || `custom-output-${Date.now()}`,
    name: outputFormName.trim() || 'Custom Output Style',
    category: outputFormCategory.trim() || 'Visual & Structured',
    description: outputFormDescription.trim() || 'Custom response formatting.',
    directive: outputFormDirective.trim() || 'Format with clear markdown headings and tables.',
    isCustom: true,
  }), [selectedDetail, outputFormName, outputFormCategory, outputFormDescription, outputFormDirective]);

  // ── Save & Delete handlers for custom items ──
  const handleSaveCustomMcp = () => {
    if (mcpEditMode === 'json' && parsedMcpJson?.servers && parsedMcpJson.servers.length > 0) {
      if (parsedMcpJson.servers.length === 1) {
        handleSaveJsonServerDirectly(parsedMcpJson.servers[0]);
        return;
      } else {
        handleImportAllServersFromJson(parsedMcpJson.servers);
        return;
      }
    }
    const mcp = getLiveCustomMcp();
    setCustomMcps((prev) => {
      const idx = prev.findIndex((m) => m.name === mcp.name);
      const next = idx >= 0 ? [...prev.slice(0, idx), mcp, ...prev.slice(idx + 1)] : [mcp, ...prev];
      saveCustomStorage(STORAGE_KEYS.mcps, next);
      return next;
    });
    setSelectedDetail({ kind: 'mcp', item: mcp, isCustom: true });
    triggerSaveToast(`Saved MCP "${mcp.label}" to library!`);
  };

  const handleDeleteCustomMcp = (name: string) => {
    setCustomMcps((prev) => {
      const next = prev.filter((m) => m.name !== name);
      saveCustomStorage(STORAGE_KEYS.mcps, next);
      return next;
    });
    if (selectedDetail?.kind === 'mcp' && selectedDetail.item.name === name) {
      setSelectedDetail(null);
    }
  };

  const handleSaveCustomSkill = () => {
    const skill = getLiveCustomSkill();
    setCustomSkills((prev) => {
      const idx = prev.findIndex((s) => s.id === skill.id);
      const next = idx >= 0 ? [...prev.slice(0, idx), skill, ...prev.slice(idx + 1)] : [skill, ...prev];
      saveCustomStorage(STORAGE_KEYS.skills, next);
      return next;
    });
    setSelectedDetail({ kind: 'skill', item: skill, isCustom: true });
    triggerSaveToast(`Saved Skill "${skill.name}" to library!`);
  };

  const handleDeleteCustomSkill = (id: string) => {
    setCustomSkills((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveCustomStorage(STORAGE_KEYS.skills, next);
      return next;
    });
    if (selectedDetail?.kind === 'skill' && selectedDetail.item.id === id) {
      setSelectedDetail(null);
    }
  };

  const handleFetchGithubRepo = async (inputStr: string) => {
    const cleaned = inputStr.trim().replace(/^https?:\/\/(www\.)?github\.com\//i, '').replace(/\.git$/i, '').replace(/^\/+|\/+$/g, '');
    const parts = cleaned.split('/');
    if (parts.length < 2 || !parts[0] || !parts[1]) {
      setGhImportError('Please enter a valid format like "owner/repo" or a full GitHub repository URL');
      return;
    }
    const [owner, repo] = parts;
    setGhImportLoading(true);
    setGhImportError(null);
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
      if (res.ok) {
        const data = await res.json();

        // Auto-detect best category from topics, description, and name
        const topics: string[] = Array.isArray(data.topics) ? data.topics : [];
        const fullText = `${data.name} ${data.description || ''} ${topics.join(' ')}`.toLowerCase();
        let detectedCategory: PluginCategory = 'Skills';
        if (fullText.includes('mcp') && (fullText.includes('server') || fullText.includes('tool'))) {
          detectedCategory = 'MCP Servers';
        } else if (fullText.includes('registry') || fullText.includes('catalog')) {
          detectedCategory = 'MCP Registries';
        } else if (fullText.includes('marketplace') || fullText.includes('store')) {
          detectedCategory = 'Plugin Marketplace';
        } else if (fullText.includes('coding') || fullText.includes('code') || fullText.includes('dev') || fullText.includes('engineer')) {
          detectedCategory = 'Coding Agents';
        } else if (fullText.includes('runtime') || fullText.includes('engine') || fullText.includes('orchestrat')) {
          detectedCategory = 'Agent Runtimes';
        } else if (fullText.includes('memory') || fullText.includes('vector') || fullText.includes('store') || fullText.includes('cache')) {
          detectedCategory = 'Agent Memory';
        } else if (fullText.includes('observability') || fullText.includes('monitor') || fullText.includes('eval') || fullText.includes('trace') || fullText.includes('log')) {
          detectedCategory = 'Observability';
        } else if (fullText.includes('rag') || fullText.includes('knowledge') || fullText.includes('document') || fullText.includes('search')) {
          detectedCategory = 'Knowledge & RAG';
        }

        const avatarUrl = data.owner?.avatar_url || `https://github.com/${owner}.png?size=128`;
        const branch = data.default_branch || 'main';

        // Try to fetch SKILL.md or README.md from GitHub raw content
        let fetchedSkillDoc = '';
        try {
          const rawSkillRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/SKILL.md`);
          if (rawSkillRes.ok) {
            fetchedSkillDoc = await rawSkillRes.text();
          } else {
            const rawReadmeRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`);
            if (rawReadmeRes.ok) {
              const readmeText = await rawReadmeRes.text();
              fetchedSkillDoc = readmeText.slice(0, 5000);
            }
          }
        } catch {
          // ignore network failure for raw docs
        }

        setGhImportPreview({
          repo: `${owner}/${repo}`,
          owner: data.owner?.login || owner,
          name: data.name || repo,
          description: data.description || 'Imported GitHub agent skill package.',
          stars: typeof data.stargazers_count === 'number' ? data.stargazers_count : 0,
          license: data.license?.spdx_id || data.license?.name || 'MIT',
          category: detectedCategory,
          avatarUrl,
          topics,
          content: fetchedSkillDoc,
        });
      } else {
        const avatarUrl = `https://github.com/${owner}.png?size=128`;
        setGhImportPreview({
          repo: `${owner}/${repo}`,
          owner,
          name: repo,
          description: `GitHub repository by ${owner}`,
          stars: 0,
          license: 'MIT',
          category: 'Skills',
          avatarUrl,
        });
        if (res.status === 404) {
          setGhImportError('Repository not found on GitHub public API. You can still save it with the fallback preview.');
        } else if (res.status === 403) {
          setGhImportError('GitHub API rate limit reached. Fallback preview created.');
        }
      }
    } catch {
      const avatarUrl = `https://github.com/${owner}.png?size=128`;
      setGhImportPreview({
        repo: `${owner}/${repo}`,
        owner,
        name: repo,
        description: `GitHub repository by ${owner}`,
        stars: 0,
        license: 'MIT',
        category: 'Skills',
        avatarUrl,
      });
    } finally {
      setGhImportLoading(false);
    }
  };

  const handleSaveImportedGithubSkill = () => {
    if (!ghImportPreview) return;
    const newPlugin: StockSkillItem = {
      id: `custom-plugin-${ghImportPreview.owner}-${ghImportPreview.name}-${Date.now()}`,
      name: ghImportPreview.repo,
      category: ghImportPreview.category,
      description: ghImportPreview.description,
      tags: ['github', 'custom', ghImportPreview.category.toLowerCase(), ...(ghImportPreview.topics || [])],
      isCustom: true,
      plugin: {
        repo: ghImportPreview.repo,
        stars: ghImportPreview.stars,
        license: ghImportPreview.license,
        description: ghImportPreview.description,
        category: ghImportPreview.category,
        usage: `Teach your agent to leverage ${ghImportPreview.name} directives and workflows.`,
        avatarUrl: ghImportPreview.avatarUrl,
      },
      content: ghImportPreview.content || [
        `# ${ghImportPreview.repo}`,
        '',
        ghImportPreview.description,
        '',
        '## Provenance',
        `- Repository: https://github.com/${ghImportPreview.repo}`,
        `- Stars: ~${ghImportPreview.stars.toLocaleString()}`,
        `- License: ${ghImportPreview.license}`,
        `- Category: ${ghImportPreview.category}`,
        '',
        '## How to use it',
        `Attach to an agent and reference ${ghImportPreview.repo} capabilities in prompts.`,
        '',
        '## Getting it locally',
        '```bash',
        `git clone https://github.com/${ghImportPreview.repo}.git`,
        '```',
      ].join('\n'),
    };

    setCustomPlugins((prev) => {
      const next = [newPlugin, ...prev.filter((p) => p.name !== newPlugin.name)];
      saveCustomStorage(STORAGE_KEYS.plugins, next);
      return next;
    });

    // Also persist to server SQLite database so agents and backend tools have it!
    fetch('/api/skills/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newPlugin.id,
        name: newPlugin.name,
        category: newPlugin.category,
        description: newPlugin.description,
        content: newPlugin.content,
      }),
    }).catch((err) => console.warn('[LibrarySidebar] Failed to upload custom plugin to server:', err));

    triggerSaveToast(`Imported "${ghImportPreview.repo}" into Skills!`);
    setSelectedDetail({ kind: 'skill', item: newPlugin, isCustom: true });
    setShowGhImportModal(false);
    setGhImportInput('');
    setGhImportPreview(null);
  };

  const handleDeleteCustomPlugin = (id: string) => {
    setCustomPlugins((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveCustomStorage(STORAGE_KEYS.plugins, next);
      return next;
    });
    if (selectedDetail?.kind === 'skill' && selectedDetail.item.id === id) {
      setSelectedDetail(null);
    }
    triggerSaveToast('Skill removed from library.');
  };

  const handleSaveCustomAgent = () => {
    const agent = getCustomizedAgent();
    setCustomAgents((prev) => {
      const idx = prev.findIndex((a) => a.id === agent.id);
      const next = idx >= 0 ? [...prev.slice(0, idx), agent, ...prev.slice(idx + 1)] : [agent, ...prev];
      saveCustomStorage(STORAGE_KEYS.agents, next);
      return next;
    });
    setSelectedDetail({ kind: 'agent', item: agent, isCustom: true });
    triggerSaveToast(`Saved Agent "${agent.name}" to library!`);
  };

  const handleDeleteCustomAgent = (id: string) => {
    setCustomAgents((prev) => {
      const next = prev.filter((a) => a.id !== id);
      saveCustomStorage(STORAGE_KEYS.agents, next);
      return next;
    });
    if (selectedDetail?.kind === 'agent' && selectedDetail.item.id === id) {
      setSelectedDetail(null);
    }
  };

  const handleSaveCustomToolkit = () => {
    const toolkit = getLiveCustomToolkit();
    setCustomToolkits((prev) => {
      const idx = prev.findIndex((t) => t.id === toolkit.id);
      const next = idx >= 0 ? [...prev.slice(0, idx), toolkit, ...prev.slice(idx + 1)] : [toolkit, ...prev];
      saveCustomStorage(STORAGE_KEYS.toolkits, next);
      return next;
    });
    setSelectedDetail({ kind: 'toolkit', item: toolkit, isCustom: true });
    triggerSaveToast(`Saved Toolkit "${toolkit.name}" to library!`);
  };

  const handleDeleteCustomToolkit = (id: string) => {
    setCustomToolkits((prev) => {
      const next = prev.filter((t) => t.id !== id);
      saveCustomStorage(STORAGE_KEYS.toolkits, next);
      return next;
    });
    if (selectedDetail?.kind === 'toolkit' && selectedDetail.item.id === id) {
      setSelectedDetail(null);
    }
  };

  const handleSaveCustomPersona = () => {
    const persona = getLiveCustomPersona();
    setCustomPersonas((prev) => {
      const idx = prev.findIndex((p) => p.id === persona.id);
      const next = idx >= 0 ? [...prev.slice(0, idx), persona, ...prev.slice(idx + 1)] : [persona, ...prev];
      saveCustomStorage(STORAGE_KEYS.personas, next);
      return next;
    });
    setSelectedDetail({ kind: 'personality', item: persona, isCustom: true });
    triggerSaveToast(`Saved Persona "${persona.name}" to library!`);
  };

  const handleDeleteCustomPersona = (id: string) => {
    setCustomPersonas((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveCustomStorage(STORAGE_KEYS.personas, next);
      return next;
    });
    if (selectedDetail?.kind === 'personality' && selectedDetail.item.id === id) {
      setSelectedDetail(null);
    }
  };

  const handleSaveCustomOutput = () => {
    const output = getLiveCustomOutput();
    setCustomOutputs((prev) => {
      const idx = prev.findIndex((o) => o.id === output.id);
      const next = idx >= 0 ? [...prev.slice(0, idx), output, ...prev.slice(idx + 1)] : [output, ...prev];
      saveCustomStorage(STORAGE_KEYS.outputs, next);
      return next;
    });
    setSelectedDetail({ kind: 'outputStyle', item: output, isCustom: true });
    triggerSaveToast(`Saved Output Style "${output.name}" to library!`);
  };

  const handleDeleteCustomOutput = (id: string) => {
    setCustomOutputs((prev) => {
      const next = prev.filter((o) => o.id !== id);
      saveCustomStorage(STORAGE_KEYS.outputs, next);
      return next;
    });
    if (selectedDetail?.kind === 'outputStyle' && selectedDetail.item.id === id) {
      setSelectedDetail(null);
    }
  };

  // ── Duplicate Helpers for Stock Items ──
  const handleDuplicateAgent = (stock: AgentTemplate) => {
    const copy: AgentTemplate = {
      ...stock,
      id: `custom-agent-${Date.now().toString().slice(-4)}`,
      name: `${stock.name} (Custom)`,
      isCustom: true,
    };
    setSelectedDetail({ kind: 'agent', item: copy, isCustom: true });
  };

  const handleDuplicateMcp = (stock: StockMcp) => {
    const copy: StockMcp = {
      ...stock,
      name: `custom-${stock.name}-${Date.now().toString().slice(-4)}`,
      label: `${stock.label} (Custom)`,
      isCustom: true,
    };
    setSelectedDetail({ kind: 'mcp', item: copy, isCustom: true });
  };

  const handleDuplicateSkill = (skill: StockSkillItem) => {
    const copy: StockSkillItem = {
      ...skill,
      id: `custom-${skill.id}-${Date.now().toString().slice(-4)}`,
      name: `${skill.name} (Custom)`,
      isCustom: true,
    };
    setSelectedDetail({ kind: 'skill', item: copy, isCustom: true });
  };

  const handleDuplicateToolkit = (kit: ToolKit) => {
    const copy: ToolKit = {
      ...kit,
      id: `custom-${kit.id}-${Date.now().toString().slice(-4)}`,
      name: `${kit.name} (Custom)`,
      isCustom: true,
    };
    setSelectedDetail({ kind: 'toolkit', item: copy, isCustom: true });
  };

  const handleDuplicatePersona = (preset: PromptPreset) => {
    const copy: PromptPreset = {
      ...preset,
      id: `custom-${preset.id}-${Date.now().toString().slice(-4)}`,
      name: `${preset.name} (Custom)`,
      isCustom: true,
    };
    setSelectedDetail({ kind: 'personality', item: copy, isCustom: true });
  };

  const handleDuplicateOutput = (preset: PromptPreset) => {
    const copy: PromptPreset = {
      ...preset,
      id: `custom-${preset.id}-${Date.now().toString().slice(-4)}`,
      name: `${preset.name} (Custom)`,
      isCustom: true,
    };
    setSelectedDetail({ kind: 'outputStyle', item: copy, isCustom: true });
  };

  const stockSkills = (serverStockSkills && serverStockSkills.length > 0 ? serverStockSkills : STOCK_SKILLS).filter(isGitStockSkill);

  const searching = searchQuery.trim().length > 0;
  // Categories the user explicitly collapsed *while searching*. Reset on each
  // new query so matches open by default — searching should reveal results,
  // not hide them behind collapsed category headers.
  const [searchCollapsed, setSearchCollapsed] = useState<Set<string>>(new Set());
  useEffect(() => {
    setSearchCollapsed(new Set());
  }, [searchQuery, activeTab]);

  // The imported catalogue holds thousands of remote servers, so a category
  // renders a first page of cards and offers an explicit expand. Rendering the
  // whole catalogue at once is what makes the panel janky, not the data itself.
  const MCP_PAGE_SIZE = 30;
  const [mcpShowAll, setMcpShowAll] = useState<Set<string>>(new Set());

  // ── Universal Multi-Header Dock Drag Handler ──
  // Works from Column 1 (.lib-icon-rail), Column 2 (.lib-panel-header), and Column 3 (.lib-detail-header)
  const handleDockDragStart = useCallback(
    (e: React.MouseEvent) => {
      // Don't drag if clicking buttons, inputs, links, textareas, selects, search, pills, segmented, cards, or body
      const target = e.target as HTMLElement;
      if (
        target.closest(
          'button, input, select, textarea, a, .lib-search-wrap, .lib-cat-pills, .lib-segmented, .lib-panel-body, .lib-detail-body, .lib-item, .lib-card-item, .lib-blank-agent-card, .lib-scheduler-widget, .no-dock-drag',
        )
      ) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();

      dragRef.current = {
        sx: e.clientX,
        sy: e.clientY,
        px: posRef.current.x,
        py: posRef.current.y,
      };
      isDraggingRef.current = false;

      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        if (!isDraggingRef.current) {
          isDraggingRef.current = true;
          setIsDraggingDock(true);
        }
        const currentActive = activeTabRef.current;
        const currentDetail = selectedDetailRef.current;
        const totalW = RAIL_WIDTH + (currentActive ? PANEL_WIDTH + (currentDetail ? DETAIL_WIDTH : 0) : 0);
        const maxX = Math.max(0, window.innerWidth - totalW);
        const maxY = Math.max(0, window.innerHeight - 60);

        setPos({
          x: Math.max(0, Math.min(dragRef.current.px + ev.clientX - dragRef.current.sx, maxX)),
          y: Math.max(0, Math.min(dragRef.current.py + ev.clientY - dragRef.current.sy, maxY)),
        });
      };

      const onUp = () => {
        dragRef.current = null;
        setIsDraggingDock(false);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 100);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [],
  );

  // Collapse the expanded panel when clicking outside (but never mid-reposition or inside any modal).
  useEffect(() => {
    if (!activeTab) return;
    const handler = (e: MouseEvent) => {
      if (isDraggingRef.current) return;
      if (isZoneBuilderOpen) return;
      const target = e.target as Element | null;
      if (target?.closest('.modal-overlay, .modal-content, .zone-builder-modal, .agent-modal, .settings-modal')) {
        return;
      }
      const el = document.querySelector('.lib-sidebar-root');
      if (el && !el.contains(e.target as Node)) {
        setActiveTab(null);
        setSelectedDetail(null);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [activeTab, isZoneBuilderOpen]);

  // Infinite scroll for the agent list: 60 cards at a time, growing on reach-bottom.
  useEffect(() => {
    if (activeTab !== 'agents') return;
    const el = agentSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setAgentVisibleCount((count) => count + AGENT_PAGE_SIZE);
      },
      { rootMargin: '400px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [activeTab, agentVisibleCount, AGENT_PAGE_SIZE]);

  // Reset the agent window whenever filters change so results start from the top.
  useEffect(() => {
    setAgentVisibleCount(AGENT_PAGE_SIZE);
  }, [selectedCategory, searchQuery, AGENT_PAGE_SIZE]);

  const toggleCat = (cat: string) => {
    if (searching) {
      setSearchCollapsed((prev) => {
        const next = new Set(prev);
        if (next.has(cat)) next.delete(cat);
        else next.add(cat);
        return next;
      });
      return;
    }
    setManualCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleSelectDetail = useCallback((detail: DetailItem) => {
    setSelectedDetail((curr) => {
      const isSame =
        curr?.kind === detail.kind &&
        (curr.item as { id?: string; name?: string }).id === (detail.item as { id?: string; name?: string }).id &&
        (curr.item as { id?: string; name?: string }).name === (detail.item as { id?: string; name?: string }).name;
      if (isSame) return null;

      const neededWidth = RAIL_WIDTH + PANEL_WIDTH + DETAIL_WIDTH;
      if (pos.x + neededWidth > window.innerWidth - 12) {
        setPos((prev) => ({
          ...prev,
          x: Math.max(8, window.innerWidth - neededWidth - 12),
        }));
      }
      return detail;
    });
  }, [pos.x]);

  const handleTabClick = (tabId: LibraryTab) => {
    setActiveTab((prev) => {
      const next = prev === tabId ? null : tabId;
      setSelectedDetail(null);
      setSelectedCategory('All');
      setSearchQuery('');
      if (next) {
        const neededWidth = RAIL_WIDTH + PANEL_WIDTH;
        if (pos.x + neededWidth > window.innerWidth - 12) {
          setPos((p) => ({
            ...p,
            x: Math.max(8, window.innerWidth - neededWidth - 12),
          }));
        }
      }
      return next;
    });
  };

  // ── Filtered data with custom items & category pills support ──
  // Show every canonical stock server (MCP.ai + manual-only), but hide legacy
  // aliases such as `gmail` when `mcpai-gmail` is the same server.
  const catalogStockMcps = useMemo(() => canonicalStockMcps(stockMcps), [stockMcps]);
  const allMcps = useMemo(() => [...customMcps, ...catalogStockMcps], [customMcps, catalogStockMcps]);
  const catalogMcpMap = useMemo(() => {
    const map = buildStockMcpLookup(stockMcps);
    for (const m of customMcps) {
      if (!map.has(m.name)) map.set(m.name, m);
    }
    return map;
  }, [customMcps, stockMcps]);
  const allStockSkills = useMemo(() => [...customSkills, ...stockSkills], [customSkills, stockSkills]);
  const allEnterpriseAgents = useMemo(() => [...customAgents, ...ENTERPRISE_AGENT_TEMPLATES], [customAgents]);
  const allKits = useMemo(() => [...customToolkits, ...TOOL_KITS], [customToolkits]);

  const allPersonas = useMemo(() => {
    const customIds = new Set(customPersonas.map((p) => p.id));
    return [...customPersonas, ...personalityPresets.filter((p) => !customIds.has(p.id))];
  }, [customPersonas, personalityPresets]);

  const allOutputs = useMemo(() => {
    const customIds = new Set(customOutputs.map((o) => o.id));
    return [...customOutputs, ...outputStylePresets.filter((o) => !customIds.has(o.id))];
  }, [customOutputs, outputStylePresets]);

  const groupedMcps = useMemo(() => {
    const filtered = allMcps.filter((m) => {
      if (selectedCategory !== 'All') {
        if (selectedCategory === 'Custom') return Boolean(m.isCustom);
        if (m.category !== selectedCategory) return false;
      }
      return matchQuery([m.label, m.name, m.category, m.description || '', (m as any).whenToUse || ''], searchQuery);
    });
    const groups: Record<string, StockMcp[]> = {};
    for (const m of filtered) {
      const cat = m.isCustom && selectedCategory === 'All' ? 'Custom MCPs' : m.category;
      (groups[cat] = groups[cat] || []).push(m);
    }
    return groups;
  }, [allMcps, searchQuery, selectedCategory]);

  // While searching, every category that has matches opens automatically (and
  // can still be collapsed individually). Otherwise the user's manual
  // expand/collapse set applies.
  const expandedCats = useMemo(() => {
    if (!searching) return manualCats;
    return new Set(Object.keys(groupedMcps).filter((c) => !searchCollapsed.has(c)));
  }, [searching, manualCats, groupedMcps, searchCollapsed]);

  const filteredSkills = useMemo(
    () =>
      allStockSkills.filter((s) => {
        if (selectedCategory !== 'All') {
          if (selectedCategory === 'Custom') return Boolean(s.isCustom);
          if (s.category !== selectedCategory) return false;
        }
        return matchQuery([s.name, s.description, s.category, ...(s.tags || [])], searchQuery);
      }),
    [allStockSkills, searchQuery, selectedCategory],
  );

  const allPlugins = useMemo(
    () => [...customPlugins, ...PLUGIN_SKILLS],
    [customPlugins],
  );

  const filteredPlugins = useMemo(
    () =>
      allPlugins.filter((s) => {
        if (selectedCategory !== 'All') {
          if (selectedCategory === 'Custom') return Boolean(s.isCustom);
          if (s.category !== selectedCategory) return false;
        }
        return matchQuery(
          [
            s.name,
            s.description,
            s.category,
            s.plugin?.license || '',
            ...(s.plugin ? [s.plugin.usage] : []),
          ],
          searchQuery,
        );
      }),
    [allPlugins, searchQuery, selectedCategory],
  );

  const filteredAgents = useMemo(
    () =>
      allEnterpriseAgents.filter((a) => {
        if (selectedCategory !== 'All') {
          if (selectedCategory === 'Custom') return Boolean(a.isCustom);
          if (a.category !== selectedCategory) return false;
        }
        return matchQuery([a.name, a.role, a.category, a.description, ...(a.tags || [])], searchQuery);
      }),
    [allEnterpriseAgents, searchQuery, selectedCategory],
  );

  const filteredKits = useMemo(
    () =>
      allKits.filter((k) => {
        if (selectedCategory !== 'All') {
          if (selectedCategory === 'Custom') return Boolean(k.isCustom);
          if (selectedCategory === 'Code & Navigation' && !k.name.includes('Code') && !k.name.includes('Search') && !k.name.includes('Ast')) return false;
          if (selectedCategory === 'Editing & Patches' && !k.name.includes('Editor') && !k.name.includes('Patch')) return false;
          if (selectedCategory === 'Files & System' && !k.name.includes('File') && !k.name.includes('Terminal')) return false;
          if (selectedCategory === 'Terminal & Exec' && !k.name.includes('Terminal') && !k.name.includes('Command')) return false;
        }
        return matchQuery([k.name, k.description, ...k.tools], searchQuery);
      }),
    [allKits, searchQuery, selectedCategory],
  );

  const groupPresets = useMemo(
    () => (list: PromptPreset[]) => {
      const groups: Record<string, PromptPreset[]> = {};
      for (const p of list) {
        if (selectedCategory !== 'All') {
          if (selectedCategory === 'Custom') {
            if (!p.isCustom) continue;
          } else if (p.category !== selectedCategory) {
            continue;
          }
        }
        if (!matchQuery([p.name, p.description, p.category], searchQuery)) continue;
        (groups[p.category] = groups[p.category] || []).push(p);
      }
      return Object.entries(groups);
    },
    [searchQuery, selectedCategory],
  );

  const personalityGroups = useMemo(
    () => groupPresets(allPersonas),
    [groupPresets, allPersonas],
  );

  const outputGroups = useMemo(
    () => groupPresets(allOutputs),
    [groupPresets, allOutputs],
  );

  const isMcpReady = (mcp: StockMcp) => {
    const readiness = mcpReadiness?.[mcp.name];
    if (readiness?.stock) return readiness.configured;
    return (
      mcp.isCustom ||
      mcp.envKeys.length === 0 ||
      mcp.envKeys.every((k) => Boolean(configuredKeys[k]))
    );
  };

  const startDrag = (key: string, e: React.DragEvent, payload: LibDragPayload) => {
    writeLibDragPayload(e.dataTransfer, payload);
    setDraggingKey(key);
  };

  const endDrag = () => {
    setDraggingKey(null);
    setActiveDragPayload(null);
  };

  const itemClass = (key: string, base = 'lib-item lib-item-ready') =>
    `${base} ${draggingKey === key ? 'lib-dragging' : ''}`;

  const activeTabMeta = TABS.find((t) => t.id === activeTab);
  const activeSkillCount = skillSource === 'plugins' ? filteredPlugins.length : filteredSkills.length;
  const detailRecommendedMcps =
    selectedDetail?.kind === 'agent'
      ? (selectedDetail.item.recommended_mcps || []).filter((name) => catalogMcpMap.has(name))
      : [];

  const filteredSpaces = useMemo(() => {
    return SPACE_PRESETS.filter((preset) => {
      const matchesCat = selectedCategory === 'All' || preset.category === selectedCategory;
      return matchesCat && matchQuery([preset.name, preset.description || '', preset.category || ''], searchQuery);
    });
  }, [selectedCategory, searchQuery]);

  const allZones = useMemo<RoleZonePreset[]>(
    () => [...customZones, ...ROLE_ZONE_PRESETS],
    [customZones],
  );

  const filteredZones = useMemo(() => {
    return allZones.filter((p) => {
      const matchesCat =
        selectedCategory === 'All' ||
        (selectedCategory === 'Custom' ? Boolean(p.id) : p.category === selectedCategory);
      const matchesSearch = matchQuery(
        [p.name, p.description || '', p.category || '', p.roleTitle || ''],
        searchQuery,
      );
      return matchesCat && matchesSearch;
    });
  }, [allZones, selectedCategory, searchQuery]);

  const filteredChains = useMemo(() => {
    return HIERARCHICAL_CHAINS.filter((c) => {
      const matchesCat =
        selectedCategory === 'All' || c.category === selectedCategory || c.industryCategory === selectedCategory;
      const matchesSearch = matchQuery(
        [
          c.name,
          c.companyName || '',
          c.description || '',
          c.category || '',
          c.industryCategory || '',
          ...c.nodes.map((n) => `${n.roleTitle} ${n.name}`),
        ],
        searchQuery,
      );
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const saveZonePreset = (draft: ZoneDraft) => {
    const id = draft.id || `zone-preset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const preset: RoleZonePreset = {
      ...draft,
      id,
      category: editingZonePreset?.category || 'Custom',
      icon: 'Network',
    };
    setCustomZones((prev) => {
      const exists = prev.some((zone) => zone.id === id);
      const next = exists ? prev.map((zone) => (zone.id === id ? preset : zone)) : [preset, ...prev];
      saveCustomStorage(STORAGE_KEYS.zones, next);
      return next;
    });
    setIsZoneBuilderOpen(false);
    setEditingZonePreset(null);
  };

  const deleteZonePreset = (id?: string) => {
    if (!id) return;
    setCustomZones((prev) => {
      const next = prev.filter((zone) => zone.id !== id);
      saveCustomStorage(STORAGE_KEYS.zones, next);
      return next;
    });
  };

  // Compute category pills list dynamically for current tab
  const currentCategoryList = useMemo(() => {
    if (activeTab === 'mcp') {
      // Curated categories first, then any category the catalogue adds (e.g.
      // the imported MCP.ai list) so it can be filtered like the rest.
      const extra = Array.from(new Set(allMcps.map((m) => m.category))).filter(
        (c) => c && !MCP_CATEGORIES.includes(c) && c !== 'Custom MCPs'
      );
      const base = customMcps.length > 0 ? ['All', 'Custom', ...MCP_CATEGORIES.slice(1)] : MCP_CATEGORIES;
      return [...base, ...extra];
    }
    if (activeTab === 'spaces') {
      return ['All', ...Array.from(new Set(SPACE_PRESETS.map((preset) => preset.category || 'Space')))];
    }
    if (activeTab === 'zones') {
      if (zoneSubTab === 'chains') {
        const chainCats = Array.from(new Set(HIERARCHICAL_CHAINS.map((c) => c.category || c.industryCategory || 'General'))).sort();
        return ['All', ...chainCats];
      }
      const set = new Set(
        allZones
          .map((z) => z.category)
          .filter((c): c is string => typeof c === 'string' && c.length > 0),
      );
      const sorted: string[] = Array.from(set).sort();
      return customZones.length > 0 ? ['All', ...sorted, 'Custom'] : ['All', ...sorted];
    }
    if (activeTab === 'agents') {
      // Keep curated order first, then surface any extra domain the catalogue
      // contributes (generated AI / strategy agents etc.) so it stays filterable.
      const extra = Array.from(new Set(allEnterpriseAgents.map((a) => a.category)))
        .filter((c) => c && !AGENT_CATEGORIES.includes(c))
        .sort((a, b) => a.localeCompare(b));
      const base = customAgents.length > 0 ? ['All', 'Custom', ...AGENT_CATEGORIES.slice(1)] : AGENT_CATEGORIES;
      return [...base, ...extra];
    }
    if (activeTab === 'tools') {
      return customToolkits.length > 0 ? ['All', 'Custom', ...TOOL_CATEGORIES.slice(1)] : TOOL_CATEGORIES;
    }
    if (activeTab === 'personality') {
      return customPersonas.length > 0 ? ['All', 'Custom', ...PERSONALITY_CATEGORIES.slice(1)] : PERSONALITY_CATEGORIES;
    }
    if (activeTab === 'output') {
      return customOutputs.length > 0 ? ['All', 'Custom', ...OUTPUT_STYLE_CATEGORIES.slice(1)] : OUTPUT_STYLE_CATEGORIES;
    }
    if (activeTab === 'skills') {
      if (skillSource === 'plugins') {
        return customPlugins.length > 0 ? ['All', 'Custom', ...PLUGIN_CATEGORY_ORDER] : ['All', ...PLUGIN_CATEGORY_ORDER];
      }
      const set = new Set(allStockSkills.map((s) => s.category));
      const base = Array.from(set).sort();
      return customSkills.length > 0 ? ['All', 'Custom', ...base.filter((c) => c !== 'Custom')] : ['All', ...base];
    }
    return ['All'];
  }, [activeTab, zoneSubTab, allZones, skillSource, allStockSkills, allMcps, customPlugins.length, customMcps.length, customSkills.length, customAgents.length, customToolkits.length, customPersonas.length, customOutputs.length]);

  return (
    <div
      className={`lib-sidebar-root nodrag nopan ${selectedDetail ? 'has-detail' : ''} ${isDraggingDock ? 'is-dragging-dock' : ''} ${isMobile ? 'is-mobile-root' : ''}`}
      style={!isMobile ? { left: pos.x, top: pos.y } : undefined}
      onClick={(e) => e.stopPropagation()}
    >
      {saveSuccessMsg && (
        <div className="lib-save-toast">
          <Check size={13} /> {saveSuccessMsg}
        </div>
      )}

      {/* ── Level 1: Bottom Dock for Mobile / Icon Rail for Desktop ── */}
      <div
        className={`lib-icon-rail ${isMobile ? 'lib-mobile-bottom-dock' : ''}`}
        onMouseDown={!isMobile ? handleDockDragStart : undefined}
        title={!isMobile ? 'Drag to reposition workspace dock' : undefined}
      >
        {!isMobile && (
          <div className="lib-grip" title="Drag to reposition workspace dock">
            <span className="lib-grip-pill" />
          </div>
        )}

        {TABS.map((tab, idx) => {
          const Icon = LIB_TAB_ICONS[tab.id];
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`lib-tab-btn ${isActive ? 'active' : ''}`}
              style={{ '--tab-color': tab.color } as React.CSSProperties}
              onClick={(e) => {
                e.stopPropagation();
                if (isDraggingRef.current) return;
                handleTabClick(tab.id);
              }}
              data-tooltip={TAB_DESCRIPTIONS[tab.id] || tab.label}
              data-tooltip-side="right"
              data-tooltip-shortcut={`⌘${idx + 1}`}
            >
              <span className="lib-tab-icon">
                <LibGlyph icon={Icon} color={tab.color} size={16} />
              </span>
              <span className="lib-tab-label">{tab.shortLabel}</span>
            </button>
          );
        })}

        {activeTab && (
          <button
            className="lib-tab-btn lib-close-rail-btn"
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab(null);
              setSelectedDetail(null);
            }}
            data-tooltip="Close Sidebar"
            data-tooltip-shortcut="Esc"
            data-tooltip-side="right"
          >
            <X size={15} />
            <span className="lib-tab-label">Close</span>
          </button>
        )}

        {/* ── Version & Upgrade Indicator (Desktop App Only) ── */}
        {isTauri() && (
          <div className="lib-rail-version-section" style={{ marginTop: 'auto', paddingTop: '10px' }}>
            <button
              className={`lib-tab-btn lib-version-btn ${versionInfo?.hasUpdate ? 'has-update' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setShowVersionModal(true);
              }}
              data-tooltip={versionInfo?.hasUpdate ? 'Update Available' : 'Up to Date'}
              data-tooltip-side="right"
              style={{
                borderColor: versionInfo?.hasUpdate ? 'rgba(245, 158, 11, 0.4)' : undefined,
                background: versionInfo?.hasUpdate ? 'rgba(245, 158, 11, 0.1)' : undefined,
              }}
            >
              <span className="lib-tab-icon">
                {versionInfo?.hasUpdate ? (
                  <ArrowUpCircle size={16} className="text-amber-400 animate-pulse" />
                ) : (
                  <CheckCircle2 size={16} className="text-emerald-400" />
                )}
              </span>
              <span className="lib-tab-label" style={{ fontSize: '9px', fontWeight: 600 }}>
                {versionInfo?.hasUpdate ? 'Update' : `v${versionInfo?.currentVersion || '1.3.2'}`}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* ── Level 2: Expanded Library Panel ── */}
      {activeTab && activeTabMeta && !isMobile && (
        <div className="lib-panel" style={{ width: PANEL_WIDTH }}>
          {/* Header is draggable from its upper section */}
          <div
            className="lib-panel-header"
            onMouseDown={handleDockDragStart}
            title="Drag to reposition workspace dock"
          >
            <div className="lib-panel-title" style={{ '--tab-color': activeTabMeta.color } as React.CSSProperties}>
              <div className="lib-header-identity">
                <LibGlyph icon={LIB_TAB_ICONS[activeTabMeta.id]} color={activeTabMeta.color} size={15} />
                <span>{activeTabMeta.label}</span>
              </div>
              <span className="lib-drag-grip-indicator" title="Drag to move entire dock">
                <GripHorizontal size={13} />
              </span>
              <span className="lib-panel-count">
                {activeTab === 'mcp'
                  ? allMcps.length
                  : activeTab === 'spaces'
                    ? filteredSpaces.length
                    : activeTab === 'zones'
                      ? (zoneSubTab === 'single' ? filteredZones.length : filteredChains.length)
                      : activeTab === 'skills'
                      ? activeSkillCount
                      : activeTab === 'agents'
                        ? filteredAgents.length
                        : activeTab === 'personality'
                          ? personalityGroups.reduce((n, [, items]) => n + items.length, 0)
                          : activeTab === 'output'
                            ? outputGroups.reduce((n, [, items]) => n + items.length, 0)
                            : filteredKits.length}
              </span>
            </div>

            {/* Search Input */}
            <div className="lib-search-wrap">
              <Search size={12} className="lib-search-icon" />
              <input
                className="lib-search-input"
                placeholder={`Search ${activeTabMeta.label.toLowerCase()}…`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              {searchQuery && (
                <button className="lib-search-clear" onClick={() => setSearchQuery('')}>
                  <X size={10} />
                </button>
              )}
            </div>

            {/* Skills Sub-tab Switcher (Git stock skills vs Curated GitHub Plugins) */}
            {activeTab === 'skills' && (
              <div className="lib-segmented" onClick={(e) => e.stopPropagation()}>
                <button
                  className={skillSource === 'plugins' ? 'active' : ''}
                  onClick={() => {
                    setSkillSource('plugins');
                    setSelectedCategory('All');
                  }}
                  title={`Popular GitHub plugins (2k+ stars, verified ${VERIFIED_AT})`}
                >
                  GitHub Plugins <span>{filteredPlugins.length}</span>
                </button>
                <button
                  className={skillSource === 'stock' ? 'active' : ''}
                  onClick={() => {
                    setSkillSource('stock');
                    setSelectedCategory('All');
                  }}
                  title="Git stock skills bundled with Smoke Monkey Canvas"
                >
                  Git Skills <span>{filteredSkills.length}</span>
                </button>
              </div>
            )}

            {/* Zones Sub-tab Switcher (Single Designation Zones vs Hierarchical Company Chains) */}
            {activeTab === 'zones' && (
              <div className="lib-segmented" onClick={(e) => e.stopPropagation()}>
                <button
                  className={zoneSubTab === 'single' ? 'active' : ''}
                  onClick={() => {
                    setZoneSubTab('single');
                    setSelectedCategory('All');
                  }}
                  title="250+ single designation zones across all industries"
                >
                  Single Zones <span>{filteredZones.length}</span>
                </button>
                <button
                  className={zoneSubTab === 'chains' ? 'active' : ''}
                  onClick={() => {
                    setZoneSubTab('chains');
                    setSelectedCategory('All');
                  }}
                  title="Pre-structured multi-tier company organizational charts based on Mermaid flowcharts"
                >
                  Hierarchical Chains <span>{filteredChains.length}</span>
                </button>
              </div>
            )}

            {/* Category Filter Pills Bar */}
            <div className="lib-cat-pills" onClick={(e) => e.stopPropagation()}>
              {currentCategoryList.map((cat) => {
                const isSel = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    className={`lib-cat-pill ${isSel ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lib-scroll-body" id="lib-agents-scroll">
            {/* ── MCP Servers ── */}
            {activeTab === 'mcp' && (
              <>
                <p className="lib-drag-hint">
                  Click an MCP to inspect details · Drag onto an agent card to attach.
                </p>

                {/* + Create Custom MCP Server Card */}
                <div
                  className="lib-create-action-card"
                  style={{ '--cac': '#10b981' } as React.CSSProperties}
                  onClick={() => {
                    setMcpEditMode('form');
                    setMcpJsonInput('');
                    handleSelectDetail({ kind: 'mcp', item: createBlankCustomMcp(), isCustom: true });
                  }}
                  draggable
                  onDragStart={(e) => startDrag('mcp:new-custom', e, { kind: 'mcp', mcp: createBlankCustomMcp() })}
                  onDragEnd={endDrag}
                  title="Create custom MCP server"
                >
                  <div className="lib-create-card-left">
                    <div className="lib-create-card-icon-wrap">
                      <Plus size={15} />
                    </div>
                    <div>
                      <div className="lib-create-card-title">+ Create Custom MCP Server</div>
                      <div className="lib-create-card-sub">Configure custom stdio or SSE server</div>
                    </div>
                  </div>
                  <ChevronRight size={13} className="lib-create-card-arrow" />
                </div>

                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <button
                    type="button"
                    className="lib-import-json-action"
                    style={{ flex: 1, padding: '5.5px 10px', justifyContent: 'center' }}
                    onClick={() => {
                      const blank = createBlankCustomMcp();
                      setMcpEditMode('json');
                      setMcpJsonInput('');
                      setSelectedDetail({ kind: 'mcp', item: blank, isCustom: true });
                    }}
                    title="Paste Claude Desktop, Cursor, or standard JSON config"
                  >
                    <Code2 size={12} color="#10b981" />
                    <span>Paste JSON Config</span>
                  </button>
                </div>

                {Object.entries(groupedMcps).map(([cat, mcps]) => (
                  <div key={cat} className="lib-cat-group">
                    <button
                      className="lib-cat-header"
                      style={{ '--cc': MCP_CATEGORY_COLORS[cat] || '#64748b' } as React.CSSProperties}
                      onClick={() => toggleCat(cat)}
                    >
                      <span className="lib-cat-icon-wrap">
                        {MCP_CATEGORY_ICONS[cat] || <Package size={11} />}
                      </span>
                      <span className="lib-cat-label">{cat}</span>
                      <span className="lib-cat-badge">{mcps.length}</span>
                      <ChevronRight size={11} className={`lib-chevron ${expandedCats.has(cat) ? 'open' : ''}`} />
                    </button>

                    {expandedCats.has(cat) && (
                      <div className="lib-items-list lib-mcp-items-list">
                        {(mcpShowAll.has(cat) ? mcps : mcps.slice(0, MCP_PAGE_SIZE)).map((mcp) => {
                          const ready = isMcpReady(mcp);
                          const brand = getBrandVisuals(`${mcp.label} ${mcp.name}`, 30);
                          const isSelected = selectedDetail?.kind === 'mcp' && selectedDetail.item.name === mcp.name;
                          return (
                            <div
                              key={mcp.name}
                              className={`${itemClass(`mcp:${mcp.name}`, 'lib-item lib-card-item lib-mcp-card')} ${ready ? 'lib-item-ready' : 'lib-item-locked'} ${isSelected ? 'lib-item-selected' : ''}`}
                              draggable
                              onDragStart={(e) => startDrag(`mcp:${mcp.name}`, e, { kind: 'mcp', mcp })}
                              onDragEnd={endDrag}
                              onClick={() => {
                                setMcpEditMode('form');
                                handleSelectDetail({ kind: 'mcp', item: mcp, isCustom: mcp.isCustom });
                              }}
                              style={{
                                '--brand-accent': brand.color,
                                '--brand-glow': brand.glowColor,
                              } as React.CSSProperties}
                              title={`${mcp.label}\n\nClick to inspect details\nDrag onto agent card to attach`}
                            >
                              <div className="lib-mcp-card-hero">
                                {/* Large Prominent Brand Icon Tile */}
                                <div
                                  className="lib-mcp-brand-tile"
                                  style={{
                                    background: brand.bgColor,
                                    border: `1px solid ${brand.borderColor}`,
                                    boxShadow: `0 4px 14px -3px ${brand.glowColor}`,
                                  }}
                                  title={`${mcp.label} Brand Integration`}
                                >
                                  <McpBrandIcon mcp={mcp} size={30} fallback={brand.icon} />
                                </div>

                                <div className="lib-mcp-card-main">
                                  <div className="lib-mcp-card-header-line">
                                    <span className="lib-mcp-title" title={mcp.label}>{mcp.label}</span>

                                    <div className="lib-mcp-actions-wrap">
                                      {connectingMcpName === mcp.name ? (
                                        <button
                                          className="lib-connect-btn lib-connect-btn-prominent lib-connecting"
                                          disabled
                                          title={`Connecting ${mcp.label}...`}
                                          style={{ opacity: 0.85, cursor: 'wait' }}
                                        >
                                          <Loader2 size={11} className="lib-spin" />
                                          <span>Connecting...</span>
                                        </button>
                                      ) : ready ? (
                                        <span className="lib-badge-status-ready" title="Configured and ready">
                                          <CheckCircle2 size={13} color="#10b981" />
                                          <span className="lib-ready-text">Ready</span>
                                        </span>
                                      ) : (
                                        <button
                                          className="lib-connect-btn lib-connect-btn-prominent"
                                          title={`Connect ${mcp.label} and store credentials`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onConnectKey(mcp);
                                          }}
                                        >
                                          <Lock size={10} />
                                          <span>Connect</span>
                                        </button>
                                      )}
                                      {mcp.isCustom && (
                                        <button
                                          className="lib-item-delete-btn"
                                          title="Delete this custom MCP server"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteCustomMcp(mcp.name);
                                          }}
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      )}
                                      <ChevronRight size={14} className="lib-item-arrow" />
                                    </div>
                                  </div>

                                  <div className="lib-mcp-badges-line">
                                    {mcp.isCustom ? (
                                      <span className="lib-custom-badge">Custom</span>
                                    ) : (
                                      <span
                                        className="lib-mcp-category-pill"
                                        style={{
                                          color: MCP_CATEGORY_COLORS[mcp.category] || '#60a5fa',
                                          borderColor: `${MCP_CATEGORY_COLORS[mcp.category] || '#60a5fa'}40`,
                                          background: `${MCP_CATEGORY_COLORS[mcp.category] || '#60a5fa'}15`,
                                        }}
                                      >
                                        {mcp.category}
                                      </span>
                                    )}
                                    {mcp.toolsCount ? (
                                      <span className="lib-mcp-tools-pill">
                                        <Wrench size={9.5} />
                                        {mcp.toolsCount} {mcp.toolsCount === 1 ? 'tool' : 'tools'}
                                      </span>
                                    ) : null}
                                  </div>

                                  <p className="lib-mcp-desc">{mcp.description}</p>
                                  {mcp.whenToUse && (
                                    <div className="lib-mcp-whentouse" title={mcp.whenToUse}>
                                      <span className="lib-wtu-label">When to use:</span> {mcp.whenToUse}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {mcp.envKeys.length > 0 && (
                                <div className="lib-mcp-footer-chips">
                                  {mcp.envKeys.map((k) => {
                                    const perKey = mcp.keyLinks?.[k];
                                    const getUrl = perKey?.url || mcp.keyGetUrl;
                                    return (
                                      <span key={k} className="lib-mcp-key-chip" style={{ color: '#f59e0b' }}>
                                        <KeyRound size={9} />
                                        <code>{k}</code>
                                        {!configuredKeys[k] && getUrl && (
                                          <a
                                            href={getUrl}
                                            target="_blank"
                                            rel="noreferrer noopener"
                                            className="lib-mcp-key-getlink"
                                            title={`Get ${k} — ${getUrl}`}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <span>Get key</span>
                                            <ExternalLink size={8} />
                                          </a>
                                        )}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {mcps.length > MCP_PAGE_SIZE && (
                          <button
                            className="lib-cat-header"
                            style={{ justifyContent: 'center', marginTop: 4 }}
                            onClick={() =>
                              setMcpShowAll((prev) => {
                                const next = new Set(prev);
                                if (next.has(cat)) next.delete(cat);
                                else next.add(cat);
                                return next;
                              })
                            }
                          >
                            <span className="lib-cat-label">
                              {mcpShowAll.has(cat)
                                ? 'Show less'
                                : `Show all ${mcps.length} servers`}
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {Object.keys(groupedMcps).length === 0 && (
                  <div className="lib-empty">
                    <Package size={24} />
                    <p>No MCP servers match &quot;{selectedCategory !== 'All' ? selectedCategory : searchQuery}&quot;</p>
                  </div>
                )}
              </>
            )}

            {/* ── Office Spaces (visual team rooms) ── */}
            {activeTab === 'spaces' && (
              <>
                <p className="lib-drag-hint">
                  Drag a visual space onto the canvas · Drop agents inside to collapse them into a working pod.
                </p>

                <div className="lib-spaces-list">
                  {filteredSpaces.map((preset) => {
                    const presetKey = `space:${preset.name}`;
                    return (
                      <div
                        key={presetKey}
                        className={itemClass(presetKey, 'lib-item lib-item-ready lib-card-item lib-space-card-item')}
                        draggable
                        onDragStart={(e) =>
                          startDrag(presetKey, e, { kind: 'workspace_zone', zonePreset: preset })
                        }
                        onDragEnd={endDrag}
                      >
                        <div className="lib-card-header">
                          <div className="lib-card-identity">
                            <LibGlyph icon={Building2} color={preset.color} size={15} />
                            <div className="lib-card-heading">
                              <span className="lib-card-title">{preset.name}</span>
                              <span
                                className="lib-category-badge"
                                style={{ color: preset.color, borderColor: `${preset.color}40`, background: `${preset.color}15` }}
                              >
                                {preset.category || 'Space'}
                              </span>
                            </div>
                          </div>
                          <span className="lib-space-dim-tag">{preset.width} × {preset.height}</span>
                        </div>

                        {preset.description && <p className="lib-card-desc">{preset.description}</p>}
                        {preset.workflowPrompt && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#10b981', marginTop: 4, fontWeight: 500 }}>
                            <Zap size={11} style={{ flexShrink: 0 }} />
                            <span>Runtime Workflow & Ethics Active</span>
                          </div>
                        )}

                        <div className="lib-space-card-footer">
                          <div className="lib-space-drag-badge">
                            <GripHorizontal size={12} />
                            <span>Drag onto Canvas</span>
                          </div>
                          <button
                            type="button"
                            className="lib-space-deploy-btn"
                            style={{ '--space-accent': preset.color } as React.CSSProperties}
                            onClick={(e) => {
                              e.stopPropagation();
                              window.dispatchEvent(new CustomEvent('canvas:spawn-zone', { detail: preset }));
                            }}
                          >
                            <Plus size={12} />
                            <span>Deploy Space</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {filteredSpaces.length === 0 && (
                    <div className="lib-empty">
                      <Building2 size={24} />
                      <p>No spaces match &quot;{selectedCategory !== 'All' ? selectedCategory : searchQuery}&quot;</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── Zones (hierarchical designations inside a space) ── */}
            {activeTab === 'zones' && (
              <>
                <p className="lib-drag-hint">
                  {zoneSubTab === 'single'
                    ? 'Drag a zone inside a Space · Drop an agent in the zone to assign its designation and reporting line.'
                    : 'Drag a company org tree inside a Space · Deploys complete hierarchy with reporting lines connected.'}
                </p>

                {zoneSubTab === 'single' ? (
                  <>
                    <div
                      className="lib-create-action-card lib-zone-create-card"
                      style={{ '--cac': '#8b5cf6' } as React.CSSProperties}
                      onClick={() => {
                        setEditingZonePreset(null);
                        setIsZoneBuilderOpen(true);
                      }}
                      title="Create a hierarchical role zone with responsibilities and project context"
                    >
                      <div className="lib-create-card-left">
                        <div className="lib-create-card-icon-wrap">
                          <Plus size={15} />
                        </div>
                        <div>
                          <div className="lib-create-card-title">Create Zone</div>
                          <div className="lib-create-card-sub">Designation · level · reporting line · project</div>
                        </div>
                      </div>
                      <ChevronRight size={13} className="lib-create-card-arrow" />
                    </div>

                    <div className="lib-spaces-list">
                      {filteredZones.map((preset) => {
                        const parentZone = preset.parentZoneId
                          ? roleZones.find((zone) => zone.id === preset.parentZoneId)
                          : null;
                        const isCustom = Boolean(preset.id);
                        const presetKey = `role-zone:${preset.id || preset.name}`;
                        return (
                          <div
                            key={presetKey}
                            className={itemClass(presetKey, 'lib-item lib-item-ready lib-card-item lib-space-card-item lib-role-zone-card-item')}
                            style={{ '--zone-accent': preset.color } as React.CSSProperties}
                            draggable
                            onDragStart={(e) =>
                              startDrag(presetKey, e, { kind: 'role_zone', roleZonePreset: preset })
                            }
                            onDragEnd={endDrag}
                          >
                            <div className="lib-card-header">
                              <div className="lib-card-identity">
                                <LibGlyph icon={Network} color={preset.color} size={15} />
                                <div className="lib-card-heading">
                                  <span className="lib-card-title">{preset.name}</span>
                                  <span className="lib-category-badge" style={{ color: preset.color, borderColor: `${preset.color}40`, background: `${preset.color}15` }}>
                                    {preset.roleTitle || preset.category || 'Zone'}
                                  </span>
                                </div>
                              </div>
                              <div className="lib-space-card-meta">
                                <span className="lib-space-level-tag">L{preset.level}</span>
                                <span className="lib-space-dim-tag">{preset.width} × {preset.height}</span>
                              </div>
                            </div>

                            {preset.description && <p className="lib-card-desc">{preset.description}</p>}

                            {parentZone && (
                              <div className="lib-space-parent-line">
                                Reports into <strong>{parentZone.roleTitle || parentZone.name}</strong>
                              </div>
                            )}

                            <div className="lib-space-card-footer">
                              <div className="lib-space-drag-badge">
                                <GripHorizontal size={12} />
                                <span>{isCustom ? 'Custom zone' : 'Drag into a Space'}</span>
                              </div>
                              <div className="lib-space-card-actions">
                                <button
                                  type="button"
                                  className="lib-space-icon-btn"
                                  title={isCustom ? 'Edit zone' : 'Customize this zone'}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingZonePreset(preset);
                                    setIsZoneBuilderOpen(true);
                                  }}
                                >
                                  <Edit3 size={12} />
                                </button>
                                {isCustom && (
                                  <button
                                    type="button"
                                    className="lib-space-icon-btn danger"
                                    title="Delete custom zone"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteZonePreset(preset.id);
                                    }}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="lib-space-deploy-btn"
                                  style={{ '--space-accent': preset.color } as React.CSSProperties}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.dispatchEvent(new CustomEvent('canvas:spawn-role-zone', { detail: preset }));
                                  }}
                                >
                                  <Plus size={12} />
                                  <span>Deploy Zone</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {filteredZones.length === 0 && (
                        <div className="lib-empty">
                          <Network size={24} />
                          <p>No zones match &quot;{selectedCategory !== 'All' ? selectedCategory : searchQuery}&quot;</p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="lib-spaces-list">
                    {filteredChains.map((chain) => {
                      const presetKey = `chain:${chain.id}`;
                      const tierCount = chain.nodes.reduce((m, n) => Math.max(m, n.level + 1), 0);
                      const rootNode = chain.nodes.find((n) => n.level === 0) || chain.nodes[0];
                      const accentColor = chain.color || chain.industryColor || '#8b5cf6';
                      return (
                        <div
                          key={presetKey}
                          className={itemClass(presetKey, 'lib-item lib-item-ready lib-card-item lib-space-card-item lib-chain-card-item')}
                          style={{ '--zone-accent': accentColor } as React.CSSProperties}
                          draggable
                          onDragStart={(e) =>
                            startDrag(presetKey, e, {
                              kind: 'hierarchical_chain',
                              hierarchicalChainPreset: chain,
                            })
                          }
                          onDragEnd={endDrag}
                        >
                          <div className="lib-card-header">
                            <div className="lib-card-identity">
                              <LibGlyph icon={Network} color={accentColor} size={15} />
                              <div className="lib-card-heading">
                                <span className="lib-card-title">{chain.name || chain.companyName}</span>
                                <span
                                  className="lib-category-badge"
                                  style={{
                                    color: accentColor,
                                    borderColor: `${accentColor}40`,
                                    background: `${accentColor}15`,
                                  }}
                                >
                                  {chain.category || chain.industryCategory}
                                </span>
                              </div>
                            </div>
                            <div className="lib-space-card-meta">
                              <span className="lib-space-level-tag">{chain.nodes.length} Zones</span>
                              <span className="lib-space-dim-tag">{tierCount} Tiers</span>
                            </div>
                          </div>

                          {chain.description && <p className="lib-card-desc">{chain.description}</p>}

                          <div className="lib-chain-preview-tree">
                            <div className="lib-chain-root-preview">
                              <span className="lib-chain-crown-tag">Executive:</span>
                              <strong>{rootNode.roleTitle}</strong> ({rootNode.name})
                            </div>
                            <div className="lib-chain-tags-cloud">
                              {chain.nodes.slice(1, 8).map((n) => (
                                <span key={n.id} className="lib-chain-node-tag" style={{ borderColor: `${n.color}35` }}>
                                  L{n.level} {n.roleTitle}
                                </span>
                              ))}
                              {chain.nodes.length > 8 && (
                                <span className="lib-chain-node-tag more">
                                  +{chain.nodes.length - 8} more
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="lib-space-card-footer">
                            <div className="lib-space-drag-badge">
                              <GripHorizontal size={12} />
                              <span>Drag into a Space</span>
                            </div>
                            <div className="lib-space-card-actions">
                              <button
                                type="button"
                                className="lib-space-deploy-btn"
                                style={{ '--space-accent': accentColor } as React.CSSProperties}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.dispatchEvent(
                                    new CustomEvent('canvas:spawn-hierarchical-chain', {
                                      detail: { chain },
                                    }),
                                  );
                                }}
                              >
                                <Plus size={12} />
                                <span>Deploy Hierarchy</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {filteredChains.length === 0 && (
                      <div className="lib-empty">
                        <Network size={24} />
                        <p>No chains match &quot;{selectedCategory !== 'All' ? selectedCategory : searchQuery}&quot;</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Role Hierarchy & Live Workflow ── */}
                <div className="lib-hierarchical-preview-card">
                  <div className="lib-hierarchical-header">
                    <div className="lib-hierarchical-tag">
                      <Sparkles size={11} />
                      <span>Live Hierarchy</span>
                    </div>
                    <span className="lib-hierarchical-badge">{roleZones.length} Active</span>
                  </div>

                  <div className="lib-hierarchical-title-row">
                    <div className="lib-hierarchical-icon">
                      <Network size={16} />
                    </div>
                    <div>
                      <div className="lib-hierarchical-title">Zones &amp; Reporting Lines</div>
                      <div className="lib-hierarchical-sub">Designation · delegation · project context</div>
                    </div>
                  </div>

                  <p className="lib-hierarchical-desc">
                    Zones live inside visual Spaces. Place a CTO, manager, lead or specialist zone over a Space,
                    then drop agents into it. Each agent inherits the zone designation and receives a live
                    delegation workflow generated from current skills, MCP servers and provider readiness.
                  </p>

                  <div className="lib-hierarchical-flow-mini">
                    <div className="flow-mini-node flow-lead">CTO</div>
                    <div className="flow-mini-arrow">↓</div>
                    <div className="flow-mini-row">
                      <div className="flow-mini-node flow-manager">Eng Manager</div>
                      <div className="flow-mini-node flow-manager">Product Lead</div>
                    </div>
                    <div className="flow-mini-arrow">↓</div>
                    <div className="flow-mini-row">
                      <div className="flow-mini-node flow-lead">Tech Lead</div>
                      <div className="flow-mini-node flow-manager">QA Guild</div>
                    </div>
                  </div>

                  <div className="lib-hierarchical-actions">
                    <button
                      type="button"
                      className="lib-hierarchical-action primary"
                      onClick={() => {
                        setEditingZonePreset(null);
                        setIsZoneBuilderOpen(true);
                      }}
                    >
                      <Plus size={12} />
                      <span>Create Zone</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── Skills Tab (All / Stock / Plugins) ── */}
            {activeTab === 'skills' && (() => {
              const renderStockCard = (skill: StockSkillItem) => {
                const color = skillCategoryColor(skill.category);
                const Icon = skillCategoryIcon(skill.category);
                const isSelected = selectedDetail?.kind === 'skill' && selectedDetail.item.id === skill.id;
                return (
                  <div
                    key={skill.id}
                    className={`${itemClass(`skill:${skill.id}`, 'lib-item lib-item-ready lib-card-item lib-skill-item')} ${isSelected ? 'lib-item-selected' : ''}`}
                    draggable
                    onDragStart={(e) => startDrag(`skill:${skill.id}`, e, { kind: 'skill', skill })}
                    onDragEnd={endDrag}
                    onClick={() => handleSelectDetail({ kind: 'skill', item: skill, isCustom: skill.isCustom })}
                  >
                    <div className="lib-skill-card-top">
                      <div className="lib-skill-avatar-wrap">
                        <LibGlyph icon={Icon} color={color} size={20} />
                      </div>
                      <div className="lib-skill-info">
                        <div className="lib-skill-title-row">
                          <span className="lib-skill-title">{skill.name}</span>
                          <div className="lib-card-header-right">
                            {skill.isCustom && (
                              <button
                                className="lib-item-delete-btn"
                                title="Delete this custom skill"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCustomSkill(skill.id);
                                }}
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                            <ChevronRight size={14} className="lib-item-arrow" />
                          </div>
                        </div>
                        <div className="lib-skill-sub-row">
                          {skill.isCustom ? (
                            <span className="lib-custom-badge">Custom</span>
                          ) : (
                            <span className="lib-card-badge" style={{ color, background: `${color}18`, borderColor: `${color}35` }}>
                              {skill.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="lib-card-desc">{skill.description}</p>
                    {skill.tags && skill.tags.length > 0 && (
                      <div className="lib-card-chips">
                        {skill.tags.slice(0, 4).map((t) => (
                          <span key={t} className="lib-tool-chip">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              };

              const renderPluginCard = (skill: StockSkillItem) => {
                const color = pluginCategoryColor(skill.category);
                const Icon = pluginCategoryIcon(skill.category);
                const isSelected = selectedDetail?.kind === 'skill' && selectedDetail.item.id === skill.id;
                const rawRepo = skill.plugin?.repo || skill.name;
                const parts = rawRepo.split('/');
                const owner = parts.length > 1 ? parts[0] : '';
                const repoName = parts.length > 1 ? parts[1] : rawRepo;
                const stars = skill.plugin?.stars ?? 0;
                const license = skill.plugin?.license;

                return (
                  <div
                    key={skill.id}
                    className={`${itemClass(`skill:${skill.id}`, 'lib-item lib-item-ready lib-card-item lib-plugin-item')} ${isSelected ? 'lib-item-selected' : ''}`}
                    draggable
                    onDragStart={(e) => startDrag(`skill:${skill.id}`, e, { kind: 'skill', skill })}
                    onDragEnd={endDrag}
                    onClick={() => handleSelectDetail({ kind: 'skill', item: skill, isCustom: skill.isCustom })}
                  >
                    <div className="lib-plugin-card-top">
                      <div className="lib-plugin-avatar-wrap">
                        <GhAvatar repo={rawRepo} avatarUrl={skill.plugin?.avatarUrl} fallbackIcon={Icon} color={color} size={38} />
                      </div>
                      <div className="lib-plugin-info">
                        <div className="lib-plugin-title-row">
                          <span className="lib-plugin-title" title={skill.name}>{repoName}</span>
                          <div className="lib-plugin-top-actions">
                            {skill.isCustom && (
                              <button
                                className="lib-item-delete-btn"
                                title="Remove this imported skill"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCustomPlugin(skill.id);
                                }}
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                            <a
                              href={`https://github.com/${rawRepo}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="lib-plugin-gh-icon-btn"
                              title={`Open https://github.com/${rawRepo} in new tab`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isTauri()) {
                                  e.preventDefault();
                                  openExternalLink(`https://github.com/${rawRepo}`);
                                }
                              }}
                            >
                              <BrandIcons.github size={12} />
                            </a>
                            <ChevronRight size={14} className="lib-item-arrow" />
                          </div>
                        </div>

                        <div className="lib-plugin-sub-row">
                          {owner && (
                            <span className="lib-plugin-author-tag">
                              by <strong>@{owner}</strong>
                            </span>
                          )}
                          {stars > 0 && (
                            <span
                              className="lib-plugin-star-badge"
                              title={`${stars.toLocaleString()} GitHub stars (snapshot ${skill.plugin?.verified ?? VERIFIED_AT})`}
                            >
                              <Star size={9.5} fill="currentColor" />
                              <span>{formatStars(stars)}</span>
                            </span>
                          )}
                          {license && (
                            <span className="lib-plugin-lic-badge" title={`License: ${license}`}>
                              {license}
                            </span>
                          )}
                          {skill.isCustom ? (
                            <span className="lib-custom-badge">Custom</span>
                          ) : (
                            <span className="lib-card-badge" style={{ color, background: `${color}18`, borderColor: `${color}35` }}>
                              {skill.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="lib-card-desc">{skill.description}</p>
                  </div>
                );
              };

              const createCustomSkillCard = (
                <div
                  className="lib-create-action-card"
                  style={{ '--cac': '#8b5cf6' } as React.CSSProperties}
                  onClick={() => handleSelectDetail({ kind: 'skill', item: createBlankCustomSkill(), isCustom: true })}
                  draggable
                  onDragStart={(e) => startDrag('skill:new-custom', e, { kind: 'skill', skill: createBlankCustomSkill() })}
                  onDragEnd={endDrag}
                  title="Create custom skill directive"
                >
                  <div className="lib-create-card-left">
                    <div className="lib-create-card-icon-wrap">
                      <Plus size={15} />
                    </div>
                    <div>
                      <div className="lib-create-card-title">+ Create Custom Skill</div>
                      <div className="lib-create-card-sub">Define custom workflow &amp; directives</div>
                    </div>
                  </div>
                  <ChevronRight size={13} className="lib-create-card-arrow" />
                </div>
              );

              const importGhBtn = (
                <button
                  className="lib-import-gh-btn"
                  onClick={() => setShowGhImportModal(true)}
                  title="Import any repository from GitHub into your skills catalog"
                >
                  <div className="lib-import-gh-left">
                    <div className="lib-import-gh-icon">
                      <BrandIcons.github size={18} />
                    </div>
                    <div className="lib-import-gh-text">
                      <span className="lib-import-gh-title">+ Import Skill from GitHub</span>
                      <span className="lib-import-gh-subtitle">Paste repo URL or owner/repo to add</span>
                    </div>
                  </div>
                  <Plus size={16} className="lib-import-gh-plus" />
                </button>
              );

              if (skillSource === 'stock') {
                return (
                  <>
                    <p className="lib-drag-hint">
                      Click a skill to inspect workflow · Drag onto agent to teach it.
                    </p>
                    {createCustomSkillCard}
                    {filteredSkills.map(renderStockCard)}
                    {filteredSkills.length === 0 && (
                      <div className="lib-empty">
                        <LibGlyph icon={skillCategoryIcon('')} color="#64748b" size={22} />
                        <p>No skills match your search or filter</p>
                      </div>
                    )}
                  </>
                );
              }

              return (
                <>
                  <p className="lib-drag-hint">
                    Popular GitHub plugins. Click for usage details · Drag onto agent to attach.
                  </p>
                  {importGhBtn}
                  {filteredPlugins.map(renderPluginCard)}
                  {filteredPlugins.length === 0 && (
                    <div className="lib-empty">
                      <LibGlyph icon={pluginCategoryIcon('')} color="#64748b" size={22} />
                      <p>No plugins match your search or filter</p>
                    </div>
                  )}
                </>
              );
            })()}

            {/* ── Agent Templates ── */}
            {activeTab === 'agents' && (
              <>
                <p className="lib-drag-hint">
                  Configure models &amp; directives · Drag onto canvas or click Spawn.
                </p>

                {/* Prominent "+ Create Custom Agent" Card */}
                <div
                  className="lib-create-action-card"
                  style={{ '--cac': '#3b82f6' } as React.CSSProperties}
                  onClick={() => handleSelectDetail({ kind: 'agent', item: createBlankCustomAgent(), isCustom: true })}
                  draggable
                  onDragStart={(e) => {
                    const blank = createBlankCustomAgent();
                    startDrag('agent:custom-blank', e, { kind: 'agent', agent: blank });
                  }}
                  onDragEnd={endDrag}
                  title="Create custom agent template"
                >
                  <div className="lib-create-card-left">
                    <div className="lib-create-card-icon-wrap">
                      <Plus size={15} />
                    </div>
                    <div>
                      <div className="lib-create-card-title">+ Create Custom Agent</div>
                      <div className="lib-create-card-sub">Customize role, model, cron &amp; directives from scratch</div>
                    </div>
                  </div>
                  <ChevronRight size={13} className="lib-create-card-arrow" />
                </div>

                {filteredAgents.slice(0, agentVisibleCount).map((agent) => {
                  const color = agentCategoryColor(agent.category);
                  const isSelected = selectedDetail?.kind === 'agent' && selectedDetail.item.id === agent.id;
                  const agentToDrag = isSelected ? getCustomizedAgent() : agent;

                  return (
                    <div
                      key={agent.id}
                      className={`${itemClass(`agent:${agent.id}`, 'lib-item lib-item-ready lib-card-item lib-agent-card')} ${isSelected ? 'lib-item-selected' : ''}`}
                      style={{ '--ac': color } as React.CSSProperties}
                      draggable
                      onDragStart={(e) => startDrag(`agent:${agent.id}`, e, { kind: 'agent', agent: agentToDrag })}
                      onDragEnd={endDrag}
                      onClick={() => handleSelectDetail({ kind: 'agent', item: agent, isCustom: Boolean(agent.isCustom) })}
                      onDoubleClick={() => onSpawnTemplate?.(agentToDrag)}
                      title={`${agent.name} — ${agent.role}\n\nClick to inspect & customize model\nDrag or double-click to spawn`}
                    >
                      <div className="lib-card-header">
                        <div className="lib-card-identity">
                          <div className="lib-agent-avatar-wrap">
                            <AgentAvatar
                              agentId={agent.id}
                              size={38}
                              className="lib-agent-avatar"
                            />
                          </div>
                          <div className="lib-card-heading">
                            <span className="lib-card-title" title={agent.name}>{agent.name}</span>
                            {agent.isCustom ? (
                              <span className="lib-custom-badge">Custom</span>
                            ) : (
                              <span className="lib-card-badge" style={{ color, background: `${color}18`, borderColor: `${color}35` }}>
                                {agent.category.split(' ')[0]}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="lib-agent-card-actions">
                          {onSpawnTemplate && (
                            <button
                              type="button"
                              className="lib-agent-spawn-btn"
                              title="Spawn agent into space"
                              aria-label={`Spawn ${agent.name} into space`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSpawnTemplate(agentToDrag);
                              }}
                            >
                              <Play size={10} fill="currentColor" />
                            </button>
                          )}
                          {agent.isCustom && (
                            <button
                              type="button"
                              className="lib-item-delete-btn"
                              title="Delete this custom agent"
                              aria-label={`Delete ${agent.name}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCustomAgent(agent.id);
                              }}
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                          <ChevronRight size={13} className="lib-item-arrow" />
                        </div>
                      </div>
                      <p className="lib-card-desc">{agent.role}</p>
                      <div className="lib-agent-meta-row">
                        {agent.category && agent.category !== 'Uncategorized' && (
                          <span className="lib-agent-meta-chip" title={`Specialization: ${agent.category}`}>
                            <span>{agent.category}</span>
                          </span>
                        )}
                      </div>
                      <div className="lib-agent-chips-row">
                        <span className="lib-tool-chip lib-chip-model" title={`Model: ${agent.default_model}`}>
                          <Cpu size={9} />
                          <span className="lib-chip-truncate">{formatAgentModelBadge(agent.default_model)}</span>
                        </span>
                        {agent.suggested_cron && (
                          <span className="lib-tool-chip lib-chip-cron" title={describeCron(agent.suggested_cron)}>
                            <Clock size={9} />
                            <span>{agent.suggested_cron}</span>
                          </span>
                        )}
                      </div>
                      <AgentResourceRows
                        agent={agent}
                        catalogMcps={catalogMcpMap}
                        onSelectMcp={(mcp) => {
                          setMcpEditMode('form');
                          handleSelectDetail({ kind: 'mcp', item: mcp, isCustom: mcp.isCustom });
                        }}
                      />
                    </div>
                  );
                })}

                {filteredAgents.length === 0 && (
                  <div className="lib-empty">
                    <LibGlyph icon={agentCategoryIcon('')} color="#64748b" size={22} />
                    <p>No agent templates match your query</p>
                  </div>
                )}

                {filteredAgents.length > 0 && (
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
                    <div ref={agentSentinelRef} className="lib-agent-sentinel" aria-hidden="true" />
                  </div>
                )}
              </>
            )}

            {/* ── Toolkits ── */}
            {activeTab === 'tools' && (
              <>
                <p className="lib-drag-hint">
                  Click a toolkit to inspect included tools · Drag onto agent to unlock.
                </p>

                {/* + Create Custom Toolkit Card */}
                <div
                  className="lib-create-action-card"
                  style={{ '--cac': LIB_TAB_COLORS.tools } as React.CSSProperties}
                  onClick={() => handleSelectDetail({ kind: 'toolkit', item: createBlankCustomToolkit(), isCustom: true })}
                  draggable
                  onDragStart={(e) => startDrag('toolkit:new-custom', e, { kind: 'toolkit', toolkit: createBlankCustomToolkit() })}
                  onDragEnd={endDrag}
                  title="Create custom toolkit"
                >
                  <div className="lib-create-card-left">
                    <div className="lib-create-card-icon-wrap">
                      <Plus size={15} />
                    </div>
                    <div>
                      <div className="lib-create-card-title">+ Create Custom Toolkit</div>
                      <div className="lib-create-card-sub">Bundle workspace tools &amp; primitives for your agents</div>
                    </div>
                  </div>
                  <ChevronRight size={13} className="lib-create-card-arrow" />
                </div>

                {filteredKits.map((kit) => {
                  const isSelected = selectedDetail?.kind === 'toolkit' && selectedDetail.item.id === kit.id;
                  return (
                    <div
                      key={kit.id}
                      className={`${itemClass(`toolkit:${kit.id}`, 'lib-item lib-item-ready lib-card-item lib-toolkit-item')} ${isSelected ? 'lib-item-selected' : ''}`}
                      style={{ '--kc': kit.color } as React.CSSProperties}
                      draggable
                      onDragStart={(e) => startDrag(`toolkit:${kit.id}`, e, { kind: 'toolkit', toolkit: kit })}
                      onDragEnd={endDrag}
                      onClick={() => handleSelectDetail({ kind: 'toolkit', item: kit, isCustom: Boolean(kit.isCustom) })}
                    >
                      <div className="lib-card-header">
                        <div className="lib-card-identity">
                          <LibGlyph icon={toolkitIcon(kit.id)} color={kit.color} size={15} />
                          <div className="lib-card-heading">
                            <span className="lib-card-title">{kit.name}</span>
                            {kit.isCustom ? (
                              <span className="lib-custom-badge">Custom</span>
                            ) : (
                              <span className="lib-card-badge" style={{ color: kit.color, background: `${kit.color}18`, borderColor: `${kit.color}35` }}>
                                {kit.tools.length} Tools
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          {kit.isCustom && (
                            <button
                              className="lib-item-delete-btn"
                              title="Delete this custom toolkit"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCustomToolkit(kit.id);
                              }}
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                          <ChevronRight size={13} className="lib-item-arrow" />
                        </div>
                      </div>
                      <p className="lib-card-desc">{kit.description}</p>
                      <div className="lib-card-chips">
                        {kit.tools.slice(0, 5).map((t) => (
                          <span key={t} className="lib-tool-chip">
                            {t}
                          </span>
                        ))}
                        {kit.tools.length > 5 && (
                          <span className="lib-tool-chip lib-tool-chip-more">
                            +{kit.tools.length - 5}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredKits.length === 0 && (
                  <div className="lib-empty">
                    <LibGlyph icon={toolkitIcon('')} color="#64748b" size={22} />
                    <p>No toolkits match your filter</p>
                  </div>
                )}
              </>
            )}

            {/* ── Personality ── */}
            {activeTab === 'personality' && (
              <>
                <p className="lib-drag-hint">
                  Drag a voice onto an agent to shape how it speaks. You can stack several.
                </p>

                {/* + Create Custom Personality Card */}
                <div
                  className="lib-create-action-card"
                  style={{ '--cac': LIB_TAB_COLORS.personality } as React.CSSProperties}
                  onClick={() => handleSelectDetail({ kind: 'personality', item: createBlankCustomPersona(), isCustom: true })}
                  draggable
                  onDragStart={(e) => startDrag('personality:new-custom', e, { kind: 'personality', preset: createBlankCustomPersona() })}
                  onDragEnd={endDrag}
                  title="Create custom persona voice"
                >
                  <div className="lib-create-card-left">
                    <div className="lib-create-card-icon-wrap">
                      <Plus size={15} />
                    </div>
                    <div>
                      <div className="lib-create-card-title">+ Create Custom Voice / Persona</div>
                      <div className="lib-create-card-sub">Define tone, attitude, and behavioral guidelines</div>
                    </div>
                  </div>
                  <ChevronRight size={13} className="lib-create-card-arrow" />
                </div>

                {personalityGroups.map(([cat, items]) => (
                  <div key={cat} className="lib-preset-group">
                    <div className="lib-preset-cat">
                      <span className="lib-preset-cat-name">{cat}</span>
                      <span className="lib-preset-cat-count">{items.length}</span>
                    </div>
                    {items.map((preset) => {
                      const isSelected = selectedDetail?.kind === 'personality' && selectedDetail.item.id === preset.id;
                      return (
                        <div
                          key={preset.id}
                          className={`${itemClass(`personality:${preset.id}`, 'lib-item lib-item-ready lib-card-item lib-preset-item')} ${isSelected ? 'lib-item-selected' : ''}`}
                          style={{ '--pc': LIB_TAB_COLORS.personality } as React.CSSProperties}
                          draggable
                          onDragStart={(e) =>
                            startDrag(`personality:${preset.id}`, e, { kind: 'personality', preset })
                          }
                          onDragEnd={endDrag}
                          onClick={() => handleSelectDetail({ kind: 'personality', item: preset, isCustom: Boolean(preset.isCustom) })}
                        >
                          <div className="lib-card-header">
                            <div className="lib-card-identity">
                              <LibGlyph icon={personalityPresetIcon(preset.id, preset.category)} color={LIB_TAB_COLORS.personality} size={14} />
                              <div className="lib-card-heading">
                                <span className="lib-card-title">{preset.name}</span>
                                {preset.isCustom ? (
                                  <span className="lib-custom-badge">Custom</span>
                                ) : (
                                  <span className="lib-card-badge">{preset.category}</span>
                                )}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              {preset.isCustom && (
                                <button
                                  className="lib-item-delete-btn"
                                  title="Delete this custom voice"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteCustomPersona(preset.id);
                                  }}
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                              <ChevronRight size={13} className="lib-item-arrow" />
                            </div>
                          </div>
                          <p className="lib-card-desc">{preset.description}</p>
                        </div>
                      );
                    })}
                  </div>
                ))}
                {personalityGroups.length === 0 && (
                  <div className="lib-empty">
                    <LibGlyph icon={LIB_TAB_ICONS.personality} color="#64748b" size={22} />
                    <p>No personalities match your filter</p>
                  </div>
                )}
              </>
            )}

            {/* ── Output Style ── */}
            {activeTab === 'output' && (
              <>
                <p className="lib-drag-hint">
                  Drag a format onto an agent to shape its replies — tables, diagrams, code, length.
                </p>

                {/* + Create Custom Output Style Card */}
                <div
                  className="lib-create-action-card"
                  style={{ '--cac': LIB_TAB_COLORS.output } as React.CSSProperties}
                  onClick={() => handleSelectDetail({ kind: 'outputStyle', item: createBlankCustomOutput(), isCustom: true })}
                  draggable
                  onDragStart={(e) => startDrag('outputStyle:new-custom', e, { kind: 'outputStyle', preset: createBlankCustomOutput() })}
                  onDragEnd={endDrag}
                  title="Create custom output style"
                >
                  <div className="lib-create-card-left">
                    <div className="lib-create-card-icon-wrap">
                      <Plus size={15} />
                    </div>
                    <div>
                      <div className="lib-create-card-title">+ Create Custom Output Format</div>
                      <div className="lib-create-card-sub">Define structured schemas, formats &amp; styles</div>
                    </div>
                  </div>
                  <ChevronRight size={13} className="lib-create-card-arrow" />
                </div>

                {outputGroups.map(([cat, items]) => (
                  <div key={cat} className="lib-preset-group">
                    <div className="lib-preset-cat">
                      <span className="lib-preset-cat-name">{cat}</span>
                      <span className="lib-preset-cat-count">{items.length}</span>
                    </div>
                    {items.map((preset) => {
                      const isSelected = selectedDetail?.kind === 'outputStyle' && selectedDetail.item.id === preset.id;
                      return (
                        <div
                          key={preset.id}
                          className={`${itemClass(`outputStyle:${preset.id}`, 'lib-item lib-item-ready lib-card-item lib-preset-item')} ${isSelected ? 'lib-item-selected' : ''}`}
                          style={{ '--pc': LIB_TAB_COLORS.output } as React.CSSProperties}
                          draggable
                          onDragStart={(e) =>
                            startDrag(`outputStyle:${preset.id}`, e, { kind: 'outputStyle', preset })
                          }
                          onDragEnd={endDrag}
                          onClick={() => handleSelectDetail({ kind: 'outputStyle', item: preset, isCustom: Boolean(preset.isCustom) })}
                        >
                          <div className="lib-card-header">
                            <div className="lib-card-identity">
                              <LibGlyph icon={outputPresetIcon(preset.id, preset.category)} color={LIB_TAB_COLORS.output} size={14} />
                              <div className="lib-card-heading">
                                <span className="lib-card-title">{preset.name}</span>
                                {preset.isCustom ? (
                                  <span className="lib-custom-badge">Custom</span>
                                ) : (
                                  <span className="lib-card-badge">{preset.category}</span>
                                )}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              {preset.isCustom && (
                                <button
                                  className="lib-item-delete-btn"
                                  title="Delete this custom format"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteCustomOutput(preset.id);
                                  }}
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                              <ChevronRight size={13} className="lib-item-arrow" />
                            </div>
                          </div>
                          <p className="lib-card-desc">{preset.description}</p>
                        </div>
                      );
                    })}
                  </div>
                ))}
                {outputGroups.length === 0 && (
                  <div className="lib-empty">
                    <LibGlyph icon={LIB_TAB_ICONS.output} color="#64748b" size={22} />
                    <p>No output styles match your filter</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Level 3: Inner Section Detail Panel (Inspector) ── */}
      {selectedDetail && !isMobile && (
        <div className="lib-detail-panel" style={{ width: DETAIL_WIDTH }}>
          {/* Agent Template Details with Live Model Configuration & Dragging */}
          {selectedDetail.kind === 'agent' && (
            <div className="lib-detail-content">
              {/* Header is draggable from its upper section */}
              <div
                className="lib-detail-header"
                onMouseDown={handleDockDragStart}
                title="Drag to reposition workspace dock"
              >
                <div className="lib-detail-badge-row">
                  <div className="lib-detail-badge-wrap">
                    <span
                      className="lib-detail-badge"
                      style={{
                        background: `${agentCategoryColor(customAgentCategory)}22`,
                        color: agentCategoryColor(customAgentCategory),
                        border: `1px solid ${agentCategoryColor(customAgentCategory)}44`,
                      }}
                    >
                      {customAgentCategory}
                    </span>
                    {(selectedDetail.isCustom || selectedDetail.item.isCustom) && (
                      <span className="lib-custom-badge">Custom</span>
                    )}
                    <span className="lib-drag-grip-indicator" title="Drag to move entire dock">
                      <GripHorizontal size={13} />
                    </span>
                  </div>
                  <button
                    className="lib-detail-close"
                    onClick={() => setSelectedDetail(null)}
                    title="Close details"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="lib-agent-edit-header">
                  <div className="lib-form-field">
                    <label className="lib-field-label">Agent Name</label>
                    <input
                      className="lib-field-input"
                      value={customAgentName}
                      onChange={(e) => setCustomAgentName(e.target.value)}
                      placeholder="e.g. Production SRE Sentinel"
                    />
                  </div>
                  <div className="lib-form-field">
                    <label className="lib-field-label">Role &amp; Specialization</label>
                    <input
                      className="lib-field-input"
                      value={customAgentRole}
                      onChange={(e) => setCustomAgentRole(e.target.value)}
                      placeholder="e.g. Infrastructure Sentry"
                    />
                  </div>
                  <div className="lib-form-field">
                    <label className="lib-field-label">Category</label>
                    <select
                      className="lib-field-select"
                      value={customAgentCategory}
                      onChange={(e) => setCustomAgentCategory(e.target.value)}
                    >
                      {AGENT_CATEGORIES.slice(1).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="Custom Agents">Custom Agents</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="lib-detail-body">
                {/* Configuration: Model & Schedule Selector */}
                <div className="lib-detail-section">
                  <span className="lib-detail-section-title">
                    <SlidersHorizontal size={11} /> Model &amp; Runtime Configuration
                  </span>
                  <div className="lib-config-form">
                    <div className="lib-form-field">
                      <label className="lib-field-label">
                        <Cpu size={10} /> LLM Model (Provider &amp; Weights)
                      </label>
                      <select
                        className="lib-field-select"
                        value={customAgentModel}
                        onChange={(e) => {
                          const newModel = e.target.value;
                          setCustomAgentModel(newModel);
                          for (const p of PROVIDER_CATALOG) {
                            if (p.models.some((m) => m.id === newModel)) {
                              setCustomAgentProvider(p.id);
                              break;
                            }
                          }
                        }}
                      >
                        {PROVIDER_CATALOG.map((prov) => (
                          <optgroup key={prov.id} label={prov.name}>
                            {prov.models.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.label} ({m.id})
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    <div className="lib-form-field">
                      <label className="lib-field-label">
                        <Clock size={10} /> Execution Schedule (Automated Cron)
                      </label>
                      <AgentClockScheduler
                        cron={customAgentCron}
                        onChange={(newCron) => setCustomAgentCron(newCron)}
                      />
                    </div>
                  </div>
                </div>

                {/* Description in Markdown / Input */}
                <div className="lib-detail-section">
                  <span className="lib-detail-section-title">Overview &amp; Purpose</span>
                  {(selectedDetail.isCustom || selectedDetail.item.isCustom) ? (
                    <textarea
                      className="lib-prompt-textarea"
                      rows={3}
                      value={customAgentDescription}
                      onChange={(e) => setCustomAgentDescription(e.target.value)}
                      placeholder="Describe what this agent specializes in..."
                    />
                  ) : (
                    <div className="lib-markdown">
                      <ReactMarkdown>{selectedDetail.item.description}</ReactMarkdown>
                    </div>
                  )}
                </div>

                {/* Recommended MCPs */}
                {detailRecommendedMcps.length > 0 && (
                  <div className="lib-detail-section">
                    <span className="lib-detail-section-title">
                      Recommended MCP Servers ({detailRecommendedMcps.length})
                    </span>
                    <div className="lib-detail-chips">
                      {detailRecommendedMcps.map((m) => (
                        <span key={m} className="lib-detail-chip mcp">
                          <Package size={10} />
                          <span>{m.replace('-mcp-server', '').replace('-mcp', '')}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended Skills */}
                {selectedDetail.item.recommended_skills && selectedDetail.item.recommended_skills.length > 0 && (
                  <div className="lib-detail-section">
                    <span className="lib-detail-section-title">
                      Recommended Skills ({selectedDetail.item.recommended_skills.length})
                    </span>
                    <div className="lib-detail-chips">
                      {selectedDetail.item.recommended_skills.map((s) => (
                        <span key={s} className="lib-detail-chip skill">
                          <WandSparkles size={10} />
                          <span>{s.replace(/-/g, ' ')}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Security Policies */}
                {selectedDetail.item.policies && selectedDetail.item.policies.length > 0 && (
                  <div className="lib-detail-section">
                    <span className="lib-detail-section-title">Security Policies &amp; Guardrails</span>
                    <ul className="lib-detail-policy-list">
                      {selectedDetail.item.policies.map((pol, i) => (
                        <li key={i}>
                          <ShieldCheck size={11} color="#10b981" />
                          <span>{pol}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* System Directive with Markdown Preview / Edit Mode */}
                <div className="lib-detail-section">
                  <div className="lib-detail-section-header">
                    <span className="lib-detail-section-title">System Directive</span>
                    <div className="lib-prompt-mode-tabs">
                      <button
                        className={`lib-mode-btn ${directiveMode === 'preview' ? 'active' : ''}`}
                        onClick={() => setDirectiveMode('preview')}
                        title="Render directive in Markdown"
                      >
                        <Eye size={10} /> Preview
                      </button>
                      <button
                        className={`lib-mode-btn ${directiveMode === 'edit' ? 'active' : ''}`}
                        onClick={() => setDirectiveMode('edit')}
                        title="Edit system prompt directive"
                      >
                        <Edit3 size={10} /> Edit
                      </button>
                      <button
                        className="lib-copy-btn"
                        onClick={() => {
                          navigator.clipboard.writeText(customAgentPrompt);
                          setCopiedPrompt(true);
                          setTimeout(() => setCopiedPrompt(false), 2000);
                        }}
                        title="Copy directive prompt"
                      >
                        {copiedPrompt ? <Check size={10} color="#10b981" /> : <Copy size={10} />}
                        <span>{copiedPrompt ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {directiveMode === 'preview' ? (
                    <div className="lib-markdown-box">
                      <div className="lib-markdown">
                        <ReactMarkdown>{customAgentPrompt || '*No system directive specified.*'}</ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <textarea
                      className="lib-prompt-textarea"
                      rows={7}
                      value={customAgentPrompt}
                      onChange={(e) => setCustomAgentPrompt(e.target.value)}
                      placeholder="Enter system prompt directive..."
                    />
                  )}
                </div>
              </div>

              {/* Footer with Draggable Handle & Primary Spawn Button & Save Row */}
              <div className="lib-detail-footer">
                <div
                  className="lib-detail-drag-badge"
                  draggable
                  onDragStart={(e) => {
                    const customized = getCustomizedAgent();
                    startDrag(`agent:${customized.id}`, e, { kind: 'agent', agent: customized });
                  }}
                  onDragEnd={endDrag}
                  title="Drag this configured agent directly onto the canvas!"
                >
                  <GripHorizontal size={13} />
                  <span>Drag Card to Canvas (Model: {customAgentModel.split('/').pop()})</span>
                </div>

                <button
                  className="lib-spawn-btn"
                  onClick={() => onSpawnTemplate?.(getCustomizedAgent())}
                  title="Spawn this customized agent on canvas"
                >
                  <Plus size={14} />
                  <span>Spawn Agent on Canvas</span>
                </button>

                <div className="lib-btn-row">
                  <button
                    className="lib-action-btn success"
                    onClick={handleSaveCustomAgent}
                    title="Save this agent to your persistent library"
                  >
                    <Check size={13} /> Save to Library
                  </button>
                  {(selectedDetail.isCustom || selectedDetail.item.isCustom) ? (
                    <button
                      className="lib-action-btn danger"
                      onClick={() => handleDeleteCustomAgent(selectedDetail.item.id)}
                      title="Delete this custom agent from library"
                    >
                      <Trash2 size={13} />
                    </button>
                  ) : (
                    <button
                      className="lib-action-btn primary"
                      onClick={() => handleDuplicateAgent(selectedDetail.item)}
                      title="Duplicate as a custom agent you can modify"
                    >
                      <Copy size={13} /> Duplicate &amp; Customize
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MCP Server Details with Markdown & Custom Form Editor */}
          {selectedDetail.kind === 'mcp' && (() => {
            const isCustom = Boolean(selectedDetail.isCustom || selectedDetail.item.isCustom);
            return (
              <div className="lib-detail-content">
                <div
                  className="lib-detail-header"
                  onMouseDown={handleDockDragStart}
                  title="Drag to reposition workspace dock"
                >
                  <div className="lib-detail-badge-row">
                    <div className="lib-detail-badge-wrap">
                      <span
                        className="lib-detail-badge"
                        style={{
                          background: `${MCP_CATEGORY_COLORS[isCustom ? mcpFormCategory : selectedDetail.item.category] || '#64748b'}22`,
                          color: MCP_CATEGORY_COLORS[isCustom ? mcpFormCategory : selectedDetail.item.category] || '#64748b',
                          border: `1px solid ${MCP_CATEGORY_COLORS[isCustom ? mcpFormCategory : selectedDetail.item.category] || '#64748b'}44`,
                        }}
                      >
                        {isCustom ? mcpFormCategory : selectedDetail.item.category}
                      </span>
                      {isCustom && <span className="lib-custom-badge">Custom</span>}
                      <span className="lib-drag-grip-indicator" title="Drag to move entire dock">
                        <GripHorizontal size={13} />
                      </span>
                    </div>
                    <button className="lib-detail-close" onClick={() => setSelectedDetail(null)}>
                      <X size={14} />
                    </button>
                  </div>

                  {isCustom ? (
                    mcpEditMode === 'json' ? (
                      <div className="lib-agent-edit-header" style={{ padding: '8px 0 4px' }}>
                        <h3 className="lib-detail-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px' }}>
                          <Code2 size={15} color="#10b981" /> Paste MCP JSON Config
                        </h3>
                        <p className="lib-detail-role" style={{ color: 'hsl(var(--muted-foreground))', fontSize: '11px', margin: '2px 0 0' }}>
                          Paste Claude Desktop or Cursor MCP configuration
                        </p>
                      </div>
                    ) : (
                      <div className="lib-agent-edit-header">
                        <div className="lib-form-field">
                          <label className="lib-field-label">Display Label</label>
                          <input
                            className="lib-field-input"
                            value={mcpFormLabel}
                            onChange={(e) => setMcpFormLabel(e.target.value)}
                            placeholder="e.g. Postgres DB"
                          />
                        </div>
                        <div className="lib-form-field">
                          <label className="lib-field-label">Identifier (Package / CLI Name)</label>
                          <input
                            className="lib-field-input"
                            value={mcpFormName}
                            onChange={(e) => setMcpFormName(e.target.value)}
                            placeholder="e.g. postgresql-server"
                          />
                        </div>
                      </div>
                    )
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                      {(() => {
                        const brand = getBrandVisuals(`${selectedDetail.item.label} ${selectedDetail.item.name}`, 30);
                        return (
                          <div
                            className="lib-mcp-brand-tile"
                            style={{
                              width: 50,
                              height: 50,
                              minWidth: 50,
                              minHeight: 50,
                              borderRadius: 13,
                              background: brand.bgColor,
                              border: `1px solid ${brand.borderColor}`,
                              boxShadow: `0 4px 16px -3px ${brand.glowColor}`,
                            }}
                          >
                            <McpBrandIcon mcp={selectedDetail.item} size={30} fallback={brand.icon} />
                          </div>
                        );
                      })()}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h3 className="lib-detail-title" style={{ margin: 0, fontSize: 15 }}>{selectedDetail.item.label}</h3>
                        <p className="lib-detail-role" style={{ margin: '3px 0 0' }}><code>{selectedDetail.item.name}</code></p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="lib-detail-body">
                  {isCustom && (
                    <div className="lib-mcp-mode-tabs">
                      <button
                        type="button"
                        className={`lib-mode-btn ${mcpEditMode === 'form' ? 'active' : ''}`}
                        onClick={() => setMcpEditMode('form')}
                      >
                        <SlidersHorizontal size={12} />
                        <span>Form Fields</span>
                      </button>
                      <button
                        type="button"
                        className={`lib-mode-btn ${mcpEditMode === 'json' ? 'active' : ''}`}
                        onClick={() => {
                          setMcpEditMode('json');
                          if (!mcpJsonInput.trim()) {
                            setMcpJsonInput(serializeCurrentMcpToJson());
                          }
                        }}
                      >
                        <Code2 size={12} />
                        <span>Paste JSON Config</span>
                      </button>
                    </div>
                  )}

                  {isCustom && mcpEditMode === 'json' ? (
                    <div className="lib-json-paste-box">
                      <div className="lib-json-hint">
                        Paste Claude Desktop (<code>claude_desktop_config.json</code>), Cursor, or MCP server JSON.
                        Supports single server definitions or <code>mcpServers</code> maps.
                      </div>

                      <div className="lib-json-sample-row">
                        <span className="lib-sample-label">Samples:</span>
                        <button
                          type="button"
                          className="lib-sample-chip"
                          onClick={() => setMcpJsonInput(MCP_JSON_SAMPLES.postgres)}
                        >
                          Postgres
                        </button>
                        <button
                          type="button"
                          className="lib-sample-chip"
                          onClick={() => setMcpJsonInput(MCP_JSON_SAMPLES.github)}
                        >
                          GitHub
                        </button>
                        <button
                          type="button"
                          className="lib-sample-chip"
                          onClick={() => setMcpJsonInput(MCP_JSON_SAMPLES.filesystem)}
                        >
                          Filesystem
                        </button>
                        <button
                          type="button"
                          className="lib-sample-chip"
                          onClick={() => setMcpJsonInput(MCP_JSON_SAMPLES.sse)}
                        >
                          Remote SSE
                        </button>
                      </div>

                      <textarea
                        className="lib-json-textarea"
                        placeholder={`{\n  "mcpServers": {\n    "my-server": {\n      "command": "npx",\n      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://..."],\n      "env": {\n        "PASSWORD": "..."\n      }\n    }\n  }\n}`}
                        value={mcpJsonInput}
                        onChange={(e) => setMcpJsonInput(e.target.value)}
                        rows={9}
                        spellCheck={false}
                      />

                      {parsedMcpJson ? (
                        <>
                          {parsedMcpJson.error ? (
                            <div className="lib-json-status error">
                              <span>⚠️ {parsedMcpJson.error}</span>
                            </div>
                          ) : (
                            <div className="lib-json-status success">
                              <CheckCircle2 size={12} />
                              <span>
                                Valid config · Found {parsedMcpJson.servers.length} server
                                {parsedMcpJson.servers.length > 1 ? 's' : ''}:{' '}
                                {parsedMcpJson.servers.map((s) => s.label).join(', ')}
                              </span>
                            </div>
                          )}

                          {parsedMcpJson.servers.length > 0 && (
                            <div className="lib-json-preview-list">
                              {parsedMcpJson.servers.map((srv) => (
                                <div key={srv.name} className="lib-json-preview-item">
                                  <div className="lib-jpi-top">
                                    <span className="lib-jpi-name">{srv.label}</span>
                                    <span className="lib-jpi-transport">{srv.transport.toUpperCase()}</span>
                                  </div>
                                  <div className="lib-jpi-details">
                                    {srv.transport === 'stdio' ? (
                                      <span><code>{srv.command} {srv.args?.join(' ')}</code></span>
                                    ) : (
                                      <span><code>{srv.url}</code></span>
                                    )}
                                  </div>
                                  {srv.envKeys.length > 0 && (
                                    <div style={{ fontSize: '9px', color: 'hsl(var(--muted-foreground))' }}>
                                      Env keys: {srv.envKeys.join(', ')}
                                    </div>
                                  )}
                                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                    <button
                                      type="button"
                                      className="lib-import-json-action"
                                      onClick={() => handleApplyJsonToForm(srv)}
                                      title="Load into form editor to customize"
                                    >
                                      <SlidersHorizontal size={10} />
                                      <span>Apply to Form</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="lib-import-json-action"
                                      style={{ background: 'hsl(var(--primary) / 0.15)', borderColor: 'hsl(var(--primary))', color: 'hsl(var(--primary))' }}
                                      onClick={() => handleSaveJsonServerDirectly(srv)}
                                      title="Save directly into Custom MCPs library"
                                    >
                                      <Check size={10} />
                                      <span>Save to Library</span>
                                    </button>
                                  </div>
                                </div>
                              ))}

                              {parsedMcpJson.servers.length > 1 && (
                                <button
                                  type="button"
                                  className="lib-save-btn"
                                  style={{ marginTop: 4, width: '100%', justifyContent: 'center' }}
                                  onClick={() => handleImportAllServersFromJson(parsedMcpJson.servers)}
                                >
                                  <Plus size={13} />
                                  <span>Import All {parsedMcpJson.servers.length} Servers to Library</span>
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="lib-json-hint" style={{ opacity: 0.85 }}>
                          Paste a JSON configuration above or click a sample to parse.
                        </div>
                      )}
                    </div>
                  ) : isCustom ? (
                    <>
                      <div className="lib-detail-section">
                        <span className="lib-detail-section-title">Category &amp; Transport</span>
                        <div className="lib-form-field">
                          <label className="lib-field-label">Category</label>
                          <select
                            className="lib-field-select"
                            value={mcpFormCategory}
                            onChange={(e) => setMcpFormCategory(e.target.value)}
                          >
                            {MCP_CATEGORIES.slice(1).map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                            <option value="Custom MCPs">Custom MCPs</option>
                          </select>
                        </div>

                        <div className="lib-form-field" style={{ marginTop: 8 }}>
                          <label className="lib-field-label">Transport Mechanism</label>
                          <div className="lib-transport-toggle">
                            <button
                              type="button"
                              className={mcpFormTransport === 'stdio' ? 'active' : ''}
                              onClick={() => setMcpFormTransport('stdio')}
                            >
                              stdio (Command Line)
                            </button>
                            <button
                              type="button"
                              className={mcpFormTransport === 'sse' ? 'active' : ''}
                              onClick={() => setMcpFormTransport('sse')}
                            >
                              SSE / HTTP (Remote URL)
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="lib-detail-section">
                        <span className="lib-detail-section-title">Connection Parameters</span>
                        {mcpFormTransport === 'stdio' ? (
                          <>
                            <div className="lib-form-field">
                              <label className="lib-field-label">Command Executable</label>
                              <input
                                className="lib-field-input"
                                value={mcpFormCommand}
                                onChange={(e) => setMcpFormCommand(e.target.value)}
                                placeholder="e.g. npx, uvx, node, docker"
                              />
                            </div>
                            <div className="lib-form-field">
                              <label className="lib-field-label">Arguments (space separated)</label>
                              <input
                                className="lib-field-input"
                                value={mcpFormArgs}
                                onChange={(e) => setMcpFormArgs(e.target.value)}
                                placeholder="e.g. -y @modelcontextprotocol/server-postgres postgresql://..."
                              />
                            </div>
                          </>
                        ) : (
                          <div className="lib-form-field">
                            <label className="lib-field-label">SSE Endpoint URL</label>
                            <input
                              className="lib-field-input"
                              value={mcpFormUrl}
                              onChange={(e) => setMcpFormUrl(e.target.value)}
                              placeholder="e.g. http://localhost:8000/sse"
                            />
                          </div>
                        )}

                        <div className="lib-form-field">
                          <label className="lib-field-label">Required Env Keys (comma separated)</label>
                          <input
                            className="lib-field-input"
                            value={mcpFormEnvKeys}
                            onChange={(e) => setMcpFormEnvKeys(e.target.value)}
                            placeholder="e.g. DB_PASS, OPENAI_API_KEY"
                          />
                        </div>
                      </div>

                      <div className="lib-detail-section">
                        <span className="lib-detail-section-title">Description</span>
                        <textarea
                          className="lib-prompt-textarea"
                          rows={3}
                          value={mcpFormDescription}
                          onChange={(e) => setMcpFormDescription(e.target.value)}
                          placeholder="Describe capabilities and tools this MCP provides..."
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="lib-detail-section">
                        <span className="lib-detail-section-title">Overview</span>
                        <div className="lib-markdown">
                          <ReactMarkdown>{selectedDetail.item.description}</ReactMarkdown>
                        </div>
                      </div>

                      {selectedDetail.item.whenToUse && (
                        <div className="lib-detail-section">
                          <span className="lib-detail-section-title">When to Use (Agent Directive)</span>
                          <div className="lib-when-to-use-card">
                            <Compass size={14} className="lib-when-to-use-icon" />
                            <div className="lib-when-to-use-body">
                              <span className="lib-when-to-use-title">Recommended Activation</span>
                              <p className="lib-when-to-use-text">{selectedDetail.item.whenToUse}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {(selectedDetail.item.category || selectedDetail.item.toolsCount !== undefined) && (
                        <div className="lib-detail-section">
                          <span className="lib-detail-section-title">Capabilities & Taxonomy</span>
                          <div className="lib-tools-badge-row">
                            {selectedDetail.item.category && (
                              <span
                                className="lib-cat-pill"
                                style={{
                                  background: `${MCP_CATEGORY_COLORS[selectedDetail.item.category] || '#6366f1'}20`,
                                  color: MCP_CATEGORY_COLORS[selectedDetail.item.category] || '#a5b4fc',
                                  borderColor: `${MCP_CATEGORY_COLORS[selectedDetail.item.category] || '#6366f1'}40`,
                                }}
                              >
                                {selectedDetail.item.category}
                              </span>
                            )}
                            {selectedDetail.item.toolsCount !== undefined && (
                              <span className="lib-tools-count-badge">
                                <Wrench size={11} />
                                {selectedDetail.item.toolsCount} {selectedDetail.item.toolsCount === 1 ? 'tool' : 'tools'} included
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="lib-detail-section">
                        <span className="lib-detail-section-title">Operational Status</span>
                        <div className="lib-status-pill-wrap">
                          {isMcpReady(selectedDetail.item) ? (
                            <span className="lib-status-ready">
                              <CheckCircle2 size={12} color="#10b981" /> Configured and ready to attach
                            </span>
                          ) : (
                            <span className="lib-status-locked">
                              <Lock size={12} color="#f59e0b" /> Requires credentials / API keys
                            </span>
                          )}
                        </div>
                      </div>

                      {selectedDetail.item.envKeys.length > 0 && (
                        <div className="lib-detail-section">
                          <span className="lib-detail-section-title">Required Credentials</span>
                          <div className="lib-detail-chips">
                            {selectedDetail.item.envKeys.map((k) => {
                              const perKey = selectedDetail.item.keyLinks?.[k];
                              const getUrl = perKey?.url || selectedDetail.item.keyGetUrl;
                              return (
                                <span key={k} className="lib-detail-chip key">
                                  <KeyRound size={10} />
                                  <code>{k}</code>
                                  {configuredKeys[k] ? (
                                    <Check size={10} color="#10b981" />
                                  ) : getUrl ? (
                                    <a
                                      href={getUrl}
                                      target="_blank"
                                      rel="noreferrer noopener"
                                      className="lib-detail-chip-getlink"
                                      title={`Get ${k} — ${getUrl}`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <span>Get key</span>
                                      <ExternalLink size={9} />
                                    </a>
                                  ) : null}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {selectedDetail.item.command && (
                        <div className="lib-detail-section">
                          <span className="lib-detail-section-title">Execution Command</span>
                          <div className="lib-markdown-box">
                            <pre><code>{selectedDetail.item.command} {selectedDetail.item.args?.join(' ')}</code></pre>
                          </div>
                        </div>
                      )}

                      <div className="lib-detail-section">
                        <div className="lib-detail-section-header">
                          <span className="lib-detail-section-title">MCP JSON Configuration</span>
                          <button
                            type="button"
                            className="lib-copy-btn"
                            onClick={() => {
                              const stockJson = JSON.stringify({
                                mcpServers: {
                                  [selectedDetail.item.name]: selectedDetail.item.url
                                    ? { url: selectedDetail.item.url }
                                    : {
                                        command: selectedDetail.item.command || 'npx',
                                        args: selectedDetail.item.args || [],
                                        ...(selectedDetail.item.envKeys?.length
                                          ? { env: Object.fromEntries(selectedDetail.item.envKeys.map((k) => [k, '...'])) }
                                          : {}),
                                      },
                                },
                              }, null, 2);
                              navigator.clipboard.writeText(stockJson);
                              triggerSaveToast(`Copied ${selectedDetail.item.label} JSON!`);
                            }}
                          >
                            <Copy size={10} />
                            <span>Copy JSON</span>
                          </button>
                        </div>
                        <div className="lib-markdown-box">
                          <pre><code>{JSON.stringify({
                            mcpServers: {
                              [selectedDetail.item.name]: selectedDetail.item.url
                                ? { url: selectedDetail.item.url }
                                : {
                                    command: selectedDetail.item.command || 'npx',
                                    args: selectedDetail.item.args || [],
                                    ...(selectedDetail.item.envKeys?.length
                                      ? { env: Object.fromEntries(selectedDetail.item.envKeys.map((k) => [k, 'YOUR_KEY'])) }
                                      : {}),
                                  },
                            },
                          }, null, 2)}</code></pre>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="lib-detail-footer">
                  <div
                    className="lib-detail-drag-badge"
                    draggable
                    onDragStart={(e) => {
                      const mcpPayload = isCustom ? getLiveCustomMcp() : selectedDetail.item;
                      startDrag(`mcp:${mcpPayload.name}`, e, { kind: 'mcp', mcp: mcpPayload });
                    }}
                    onDragEnd={endDrag}
                    title="Drag onto an agent card on the canvas"
                  >
                    <GripHorizontal size={13} />
                    <span>Drag onto Agent Card to Attach</span>
                  </div>

                  {!isCustom && !isMcpReady(selectedDetail.item) && (
                    <button
                      className="lib-spawn-btn connect"
                      disabled={connectingMcpName === selectedDetail.item.name}
                      onClick={() => onConnectKey(selectedDetail.item)}
                      style={connectingMcpName === selectedDetail.item.name ? { opacity: 0.85, cursor: 'wait' } : undefined}
                    >
                      {connectingMcpName === selectedDetail.item.name ? (
                        <>
                          <Loader2 size={13} className="lib-spin" />
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <KeyRound size={13} />
                          <span>Connect {selectedDetail.item.label}</span>
                        </>
                      )}
                    </button>
                  )}

                  {!isCustom &&
                    isMcpReady(selectedDetail.item) &&
                    selectedDetail.item.authType === 'oauth' &&
                    onDisconnectKey && (
                      <button
                        className="lib-spawn-btn disconnect"
                        onClick={() => onDisconnectKey(selectedDetail.item)}
                        title={`Revoke stored credentials for ${selectedDetail.item.label}`}
                      >
                        <LogOut size={13} />
                        <span>Disconnect {selectedDetail.item.label}</span>
                      </button>
                    )}

                  <div className="lib-btn-row">
                    {isCustom ? (
                      <>
                        <button
                          className="lib-action-btn success"
                          onClick={handleSaveCustomMcp}
                          title="Save this custom MCP to your library"
                        >
                          <Check size={13} /> Save to Library
                        </button>
                        <button
                          className="lib-action-btn danger"
                          onClick={() => handleDeleteCustomMcp(selectedDetail.item.name)}
                          title="Delete this custom MCP"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    ) : (
                      <button
                        className="lib-action-btn primary"
                        onClick={() => handleDuplicateMcp(selectedDetail.item)}
                        title="Duplicate and customize this MCP server"
                      >
                        <Copy size={13} /> Duplicate &amp; Customize
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Skill Details with Markdown & Custom Form Editor */}
          {selectedDetail.kind === 'skill' && (() => {
            const isCustom = Boolean(selectedDetail.isCustom || selectedDetail.item.isCustom);
            return (
              <div className="lib-detail-content">
                <div
                  className="lib-detail-header"
                  onMouseDown={handleDockDragStart}
                  title="Drag to reposition workspace dock"
                >
                  <div className="lib-detail-badge-row">
                    <div className="lib-detail-badge-wrap">
                      <span className="lib-detail-badge skill">
                        {isCustom ? skillFormCategory : selectedDetail.item.category}
                      </span>
                      {isCustom && <span className="lib-custom-badge">Custom</span>}
                      <span className="lib-drag-grip-indicator" title="Drag to move entire dock">
                        <GripHorizontal size={13} />
                      </span>
                    </div>
                    <button className="lib-detail-close" onClick={() => setSelectedDetail(null)}>
                      <X size={14} />
                    </button>
                  </div>

                  {isCustom ? (
                    <div className="lib-agent-edit-header">
                      <div className="lib-form-field">
                        <label className="lib-field-label">Skill Name</label>
                        <input
                          className="lib-field-input"
                          value={skillFormName}
                          onChange={(e) => setSkillFormName(e.target.value)}
                          placeholder="e.g. Kubernetes Incident Triage"
                        />
                      </div>
                      <div className="lib-form-field">
                        <label className="lib-field-label">Category</label>
                        <input
                          className="lib-field-input"
                          value={skillFormCategory}
                          onChange={(e) => setSkillFormCategory(e.target.value)}
                          placeholder="e.g. Engineering & DevOps"
                        />
                      </div>
                      <div className="lib-form-field">
                        <label className="lib-field-label">Tags (comma separated)</label>
                        <input
                          className="lib-field-input"
                          value={skillFormTags}
                          onChange={(e) => setSkillFormTags(e.target.value)}
                          placeholder="e.g. k8s, triage, devops"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="lib-detail-hero">
                      <div className="lib-detail-hero-avatar">
                        {selectedDetail.item.plugin ? (
                          <GhAvatar
                            repo={selectedDetail.item.plugin.repo || selectedDetail.item.name}
                            avatarUrl={selectedDetail.item.plugin.avatarUrl}
                            fallbackIcon={pluginCategoryIcon(selectedDetail.item.category)}
                            color={pluginCategoryColor(selectedDetail.item.category)}
                            size={48}
                          />
                        ) : (
                          <LibGlyph
                            icon={skillCategoryIcon(selectedDetail.item.category)}
                            color={skillCategoryColor(selectedDetail.item.category)}
                            size={24}
                          />
                        )}
                      </div>
                      <div className="lib-detail-hero-content">
                        <div className="lib-detail-hero-top">
                          <h3 className="lib-detail-title" title={selectedDetail.item.name}>
                            {(() => {
                              const raw = selectedDetail.item.name;
                              const parts = raw.split('/');
                              return parts.length > 1 ? parts[1] : raw;
                            })()}
                          </h3>
                        </div>

                        {/* Author info with link */}
                        {(() => {
                          const rawRepo = selectedDetail.item.plugin?.repo || selectedDetail.item.name;
                          const parts = rawRepo.split('/');
                          const owner = parts.length > 1 ? parts[0] : '';
                          if (!owner) return null;
                          return (
                            <div className="lib-detail-author-row">
                              <span className="lib-detail-author-label">Author</span>
                              <a
                                href={`https://github.com/${owner}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="lib-detail-author-link"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isTauri()) {
                                    e.preventDefault();
                                    openExternalLink(`https://github.com/${owner}`);
                                  }
                                }}
                              >
                                @{owner}
                              </a>
                            </div>
                          );
                        })()}

                        {/* Stats / pills row */}
                        <div className="lib-detail-stat-row">
                          {selectedDetail.item.plugin && (
                            <>
                              <span
                                className="lib-detail-stat-pill stars"
                                title={`${selectedDetail.item.plugin.stars.toLocaleString()} GitHub stars (snapshot ${selectedDetail.item.plugin.verified ?? VERIFIED_AT})`}
                              >
                                <Star size={11} fill="currentColor" />
                                <span>{formatStars(selectedDetail.item.plugin.stars)} stars</span>
                              </span>
                              <span
                                className="lib-detail-stat-pill verified"
                                title="GitHub API star-count snapshot date"
                              >
                                <Clock size={11} />
                                <span>Snapshot {selectedDetail.item.plugin.verified ?? VERIFIED_AT}</span>
                              </span>
                              {selectedDetail.item.plugin.license && (
                                <span className="lib-detail-stat-pill license">
                                  {selectedDetail.item.plugin.license}
                                </span>
                              )}
                              <a
                                href={`https://github.com/${selectedDetail.item.plugin.repo}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="lib-detail-stat-pill github-link"
                                title="Open repository on GitHub"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isTauri()) {
                                    e.preventDefault();
                                    openExternalLink(`https://github.com/${selectedDetail.item.plugin?.repo}`);
                                  }
                                }}
                              >
                                <BrandIcons.github size={12} />
                                <span>GitHub</span>
                                <ExternalLink size={10} />
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="lib-detail-body">
                  <div className="lib-detail-section">
                    <span className="lib-detail-section-title">Overview</span>
                    {isCustom ? (
                      <textarea
                        className="lib-prompt-textarea"
                        rows={2}
                        value={skillFormDescription}
                        onChange={(e) => setSkillFormDescription(e.target.value)}
                        placeholder="Brief overview of what this skill teaches..."
                      />
                    ) : (
                      <div className="lib-markdown">
                        <ReactMarkdown>{selectedDetail.item.description}</ReactMarkdown>
                      </div>
                    )}
                  </div>

                  <div className="lib-detail-section">
                    <div className="lib-detail-section-header">
                      <span className="lib-detail-section-title">Skill Directive Workflow</span>
                      <div className="lib-prompt-mode-tabs">
                        <button
                          className={`lib-mode-btn ${skillMode === 'preview' ? 'active' : ''}`}
                          onClick={() => setSkillMode('preview')}
                          title="Render directive in Markdown"
                        >
                          <Eye size={10} /> Preview
                        </button>
                        <button
                          className={`lib-mode-btn ${skillMode === 'edit' ? 'active' : ''}`}
                          onClick={() => setSkillMode('edit')}
                          title="Edit skill directive"
                        >
                          <Edit3 size={10} /> Edit
                        </button>
                        <button
                          className="lib-copy-btn"
                          onClick={() => {
                            navigator.clipboard.writeText(isCustom ? skillFormContent : selectedDetail.item.content);
                            setCopiedPrompt(true);
                            setTimeout(() => setCopiedPrompt(false), 2000);
                          }}
                          title="Copy skill directive"
                        >
                          {copiedPrompt ? <Check size={10} color="#10b981" /> : <Copy size={10} />}
                          <span>{copiedPrompt ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>

                    {skillMode === 'preview' ? (
                      <div className="lib-markdown-box">
                        <div className="lib-markdown">
                          <ReactMarkdown>{isCustom ? skillFormContent : selectedDetail.item.content}</ReactMarkdown>
                        </div>
                      </div>
                    ) : (
                      <textarea
                        className="lib-prompt-textarea"
                        rows={8}
                        value={isCustom ? skillFormContent : selectedDetail.item.content}
                        onChange={(e) => setSkillFormContent(e.target.value)}
                        placeholder="Enter step-by-step instructions and markdown workflow directives..."
                      />
                    )}
                  </div>
                </div>

                <div className="lib-detail-footer">
                  <div
                    className="lib-detail-drag-badge"
                    draggable
                    onDragStart={(e) => {
                      const payload = isCustom ? getLiveCustomSkill() : selectedDetail.item;
                      startDrag(`skill:${payload.id}`, e, { kind: 'skill', skill: payload });
                    }}
                    onDragEnd={endDrag}
                    title="Drag onto an agent card on the canvas"
                  >
                    <GripHorizontal size={13} />
                    <span>Drag onto Agent Card to Teach Skill</span>
                  </div>

                  <div className="lib-btn-row">
                    {isCustom ? (
                      <>
                        <button
                          className="lib-action-btn success"
                          onClick={handleSaveCustomSkill}
                          title="Save this skill to library"
                        >
                          <Check size={13} /> Save to Library
                        </button>
                        <button
                          className="lib-action-btn danger"
                          onClick={() => handleDeleteCustomSkill(selectedDetail.item.id)}
                          title="Delete this custom skill"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    ) : (
                      <button
                        className="lib-action-btn primary"
                        onClick={() => handleDuplicateSkill(selectedDetail.item)}
                        title="Duplicate and customize this skill"
                      >
                        <Copy size={13} /> Duplicate &amp; Customize
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Toolkit Details with Custom Tool Selection Grid & Color Picker */}
          {selectedDetail.kind === 'toolkit' && (() => {
            const isCustom = Boolean(selectedDetail.isCustom || selectedDetail.item.isCustom);
            const standardTools = ['read_file', 'write_file', 'edit_file', 'run_command', 'search_web', 'browser', 'grep_search', 'list_dir', 'fetch_url', 'manage_task'];
            const presetColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

            return (
              <div className="lib-detail-content">
                <div
                  className="lib-detail-header"
                  onMouseDown={handleDockDragStart}
                  title="Drag to reposition workspace dock"
                >
                  <div className="lib-detail-badge-row">
                    <div className="lib-detail-badge-wrap">
                      <span
                        className="lib-detail-badge"
                        style={{
                          background: `${isCustom ? toolkitFormColor : selectedDetail.item.color}22`,
                          color: isCustom ? toolkitFormColor : selectedDetail.item.color,
                          border: `1px solid ${isCustom ? toolkitFormColor : selectedDetail.item.color}44`,
                        }}
                      >
                        {(isCustom ? toolkitFormTools.length : selectedDetail.item.tools.length)} Tools Included
                      </span>
                      {isCustom && <span className="lib-custom-badge">Custom</span>}
                      <span className="lib-drag-grip-indicator" title="Drag to move entire dock">
                        <GripHorizontal size={13} />
                      </span>
                    </div>
                    <button className="lib-detail-close" onClick={() => setSelectedDetail(null)}>
                      <X size={14} />
                    </button>
                  </div>

                  {isCustom ? (
                    <div className="lib-agent-edit-header">
                      <div className="lib-form-field">
                        <label className="lib-field-label">Toolkit Name</label>
                        <input
                          className="lib-field-input"
                          value={toolkitFormName}
                          onChange={(e) => setToolkitFormName(e.target.value)}
                          placeholder="e.g. SRE Diagnostics Kit"
                        />
                      </div>
                      <div className="lib-form-field">
                        <label className="lib-field-label">Description</label>
                        <input
                          className="lib-field-input"
                          value={toolkitFormDescription}
                          onChange={(e) => setToolkitFormDescription(e.target.value)}
                          placeholder="e.g. Essential tools for site reliability"
                        />
                      </div>
                      <div className="lib-form-field">
                        <label className="lib-field-label">Accent Color</label>
                        <div className="lib-toolkit-colors">
                          {presetColors.map((c) => (
                            <button
                              key={c}
                              type="button"
                              className={`lib-color-swatch ${toolkitFormColor === c ? 'active' : ''}`}
                              style={{ background: c }}
                              onClick={() => setToolkitFormColor(c)}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="lib-detail-title">{selectedDetail.item.name}</h3>
                      <p className="lib-detail-role">{selectedDetail.item.description}</p>
                    </>
                  )}
                </div>

                <div className="lib-detail-body">
                  <div className="lib-detail-section">
                    <span className="lib-detail-section-title">
                      {isCustom ? 'Select Included Tools' : 'Unlocked Workspace Tools'}
                    </span>
                    {isCustom ? (
                      <>
                        <div className="lib-tool-selection-grid">
                          {standardTools.map((t) => {
                            const isIncluded = toolkitFormTools.includes(t);
                            return (
                              <button
                                key={t}
                                type="button"
                                className={`lib-tool-toggle-chip ${isIncluded ? 'active' : ''}`}
                                onClick={() => {
                                  setToolkitFormTools((prev) =>
                                    isIncluded ? prev.filter((x) => x !== t) : [...prev, t]
                                  );
                                }}
                              >
                                {isIncluded ? <Check size={9} /> : <Plus size={9} />}
                                <span>{t}</span>
                              </button>
                            );
                          })}
                          {toolkitFormTools.filter((t) => !standardTools.includes(t)).map((t) => (
                            <button
                              key={t}
                              type="button"
                              className="lib-tool-toggle-chip active"
                              onClick={() => {
                                setToolkitFormTools((prev) => prev.filter((x) => x !== t));
                              }}
                              title="Click to remove custom tool"
                            >
                              <Check size={9} />
                              <span>{t}</span>
                            </button>
                          ))}
                        </div>

                        <div className="lib-form-field" style={{ marginTop: 8 }}>
                          <label className="lib-field-label">+ Add Additional Tool Name</label>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <input
                              className="lib-field-input"
                              value={newToolInput}
                              onChange={(e) => setNewToolInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && newToolInput.trim()) {
                                  e.preventDefault();
                                  const trimmed = newToolInput.trim();
                                  if (!toolkitFormTools.includes(trimmed)) {
                                    setToolkitFormTools((prev) => [...prev, trimmed]);
                                  }
                                  setNewToolInput('');
                                }
                              }}
                              placeholder="e.g. query_database"
                            />
                            <button
                              type="button"
                              className="lib-action-btn primary"
                              style={{ flex: '0 0 auto', padding: '0 10px' }}
                              onClick={() => {
                                const trimmed = newToolInput.trim();
                                if (trimmed && !toolkitFormTools.includes(trimmed)) {
                                  setToolkitFormTools((prev) => [...prev, trimmed]);
                                }
                                setNewToolInput('');
                              }}
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="lib-detail-chips">
                        {selectedDetail.item.tools.map((t) => (
                          <span key={t} className="lib-detail-chip tool">
                            <code>{t}</code>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {!isCustom && (
                    <div className="lib-detail-section">
                      <span className="lib-detail-section-title">Toolkit Documentation</span>
                      <div className="lib-markdown-box">
                        <div className="lib-markdown">
                          <ReactMarkdown>
                            {`### ${selectedDetail.item.name} Specification
Dropping this toolkit onto an agent automatically unlocks the following primitives:
${selectedDetail.item.tools.map((t) => `- \`${t}\`: Built-in safe workspace primitive`).join('\n')}

#### Usage Policy
- All tool invocations are logged into session telemetry.
- Destructive actions trigger safety prompts unless explicitly permitted by security policies.`}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="lib-detail-footer">
                  <div
                    className="lib-detail-drag-badge"
                    draggable
                    onDragStart={(e) => {
                      const payload = isCustom ? getLiveCustomToolkit() : selectedDetail.item;
                      startDrag(`toolkit:${payload.id}`, e, { kind: 'toolkit', toolkit: payload });
                    }}
                    onDragEnd={endDrag}
                    title="Drag onto an agent card to unlock these tools"
                  >
                    <GripHorizontal size={13} />
                    <span>Drag onto Agent Card to Unlock Tools</span>
                  </div>

                  <div className="lib-btn-row">
                    {isCustom ? (
                      <>
                        <button
                          className="lib-action-btn success"
                          onClick={handleSaveCustomToolkit}
                          title="Save this toolkit to library"
                        >
                          <Check size={13} /> Save to Library
                        </button>
                        <button
                          className="lib-action-btn danger"
                          onClick={() => handleDeleteCustomToolkit(selectedDetail.item.id)}
                          title="Delete this custom toolkit"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    ) : (
                      <button
                        className="lib-action-btn primary"
                        onClick={() => handleDuplicateToolkit(selectedDetail.item)}
                        title="Duplicate and customize this toolkit"
                      >
                        <Copy size={13} /> Duplicate &amp; Customize
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Personality Details with Rich Markdown & Custom Form Editor */}
          {selectedDetail.kind === 'personality' && (() => {
            const isCustom = Boolean(selectedDetail.isCustom || selectedDetail.item.isCustom);
            return (
              <div className="lib-detail-content">
                <div
                  className="lib-detail-header"
                  onMouseDown={handleDockDragStart}
                  title="Drag to reposition workspace dock"
                >
                  <div className="lib-detail-badge-row">
                    <div className="lib-detail-badge-wrap">
                      <span className="lib-detail-badge" style={{ color: LIB_TAB_COLORS.personality, background: `${LIB_TAB_COLORS.personality}18`, borderColor: `${LIB_TAB_COLORS.personality}35` }}>
                        {isCustom ? personaFormCategory : selectedDetail.item.category}
                      </span>
                      {isCustom && <span className="lib-custom-badge">Custom</span>}
                      <span className="lib-drag-grip-indicator" title="Drag to move entire dock">
                        <GripHorizontal size={13} />
                      </span>
                    </div>
                    <button className="lib-detail-close" onClick={() => setSelectedDetail(null)}>
                      <X size={14} />
                    </button>
                  </div>

                  {isCustom ? (
                    <div className="lib-agent-edit-header">
                      <div className="lib-form-field">
                        <label className="lib-field-label">Persona Name</label>
                        <input
                          className="lib-field-input"
                          value={personaFormName}
                          onChange={(e) => setPersonaFormName(e.target.value)}
                          placeholder="e.g. Sarcastic Hacker"
                        />
                      </div>
                      <div className="lib-form-field">
                        <label className="lib-field-label">Category</label>
                        <select
                          className="lib-field-select"
                          value={personaFormCategory}
                          onChange={(e) => setPersonaFormCategory(e.target.value)}
                        >
                          {PERSONALITY_CATEGORIES.slice(1).map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div className="lib-form-field">
                        <label className="lib-field-label">Description</label>
                        <input
                          className="lib-field-input"
                          value={personaFormDescription}
                          onChange={(e) => setPersonaFormDescription(e.target.value)}
                          placeholder="e.g. Witty, cynical, but brilliantly insightful"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="lib-detail-title">{selectedDetail.item.name}</h3>
                      <p className="lib-detail-role">{selectedDetail.item.description}</p>
                    </>
                  )}
                </div>

                <div className="lib-detail-body">
                  {isCustom ? (
                    <div className="lib-detail-section">
                      <div className="lib-detail-section-header">
                        <span className="lib-detail-section-title">Personality Directive</span>
                        <div className="lib-prompt-mode-tabs">
                          <button
                            className={`lib-mode-btn ${personaMode === 'preview' ? 'active' : ''}`}
                            onClick={() => setPersonaMode('preview')}
                            title="Render directive in Markdown"
                          >
                            <Eye size={10} /> Preview
                          </button>
                          <button
                            className={`lib-mode-btn ${personaMode === 'edit' ? 'active' : ''}`}
                            onClick={() => setPersonaMode('edit')}
                            title="Edit directive"
                          >
                            <Edit3 size={10} /> Edit
                          </button>
                          <button
                            className="lib-copy-btn"
                            onClick={() => {
                              navigator.clipboard.writeText(personaFormDirective);
                              setCopiedPrompt(true);
                              setTimeout(() => setCopiedPrompt(false), 2000);
                            }}
                            title="Copy directive"
                          >
                            {copiedPrompt ? <Check size={10} color="#10b981" /> : <Copy size={10} />}
                            <span>{copiedPrompt ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>

                      {personaMode === 'preview' ? (
                        <div className="lib-markdown-box">
                          <div className="lib-markdown">
                            <ReactMarkdown>{personaFormDirective || '*No persona directive.*'}</ReactMarkdown>
                          </div>
                        </div>
                      ) : (
                        <textarea
                          className="lib-prompt-textarea"
                          rows={7}
                          value={personaFormDirective}
                          onChange={(e) => setPersonaFormDirective(e.target.value)}
                          placeholder="Define the voice, attitude, phrases to use or avoid..."
                        />
                      )}
                    </div>
                  ) : (
                    <div className="lib-markdown-box">
                      <div className="lib-markdown">
                        <ReactMarkdown>
                          {getPersonalityMarkdown(selectedDetail.item)}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>

                <div className="lib-detail-footer">
                  <div
                    className="lib-detail-drag-badge"
                    draggable
                    onDragStart={(e) => {
                      const payload = isCustom ? getLiveCustomPersona() : selectedDetail.item;
                      startDrag(`personality:${payload.id}`, e, { kind: 'personality', preset: payload });
                    }}
                    onDragEnd={endDrag}
                    title="Drag onto an agent card to apply this voice"
                  >
                    <GripHorizontal size={13} />
                    <span>Drag onto Agent Card to Apply Voice</span>
                  </div>

                  <div className="lib-btn-row">
                    {isCustom ? (
                      <>
                        <button
                          className="lib-action-btn success"
                          onClick={handleSaveCustomPersona}
                          title="Save this voice to library"
                        >
                          <Check size={13} /> Save to Library
                        </button>
                        <button
                          className="lib-action-btn danger"
                          onClick={() => handleDeleteCustomPersona(selectedDetail.item.id)}
                          title="Delete this custom voice"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    ) : (
                      <button
                        className="lib-action-btn primary"
                        onClick={() => handleDuplicatePersona(selectedDetail.item)}
                        title="Duplicate and customize this voice"
                      >
                        <Copy size={13} /> Duplicate &amp; Customize
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Output Style Details with Rich Markdown & Custom Form Editor */}
          {selectedDetail.kind === 'outputStyle' && (() => {
            const isCustom = Boolean(selectedDetail.isCustom || selectedDetail.item.isCustom);
            return (
              <div className="lib-detail-content">
                <div
                  className="lib-detail-header"
                  onMouseDown={handleDockDragStart}
                  title="Drag to reposition workspace dock"
                >
                  <div className="lib-detail-badge-row">
                    <div className="lib-detail-badge-wrap">
                      <span className="lib-detail-badge" style={{ color: LIB_TAB_COLORS.output, background: `${LIB_TAB_COLORS.output}18`, borderColor: `${LIB_TAB_COLORS.output}35` }}>
                        {isCustom ? outputFormCategory : selectedDetail.item.category}
                      </span>
                      {isCustom && <span className="lib-custom-badge">Custom</span>}
                      <span className="lib-drag-grip-indicator" title="Drag to move entire dock">
                        <GripHorizontal size={13} />
                      </span>
                    </div>
                    <button className="lib-detail-close" onClick={() => setSelectedDetail(null)}>
                      <X size={14} />
                    </button>
                  </div>

                  {isCustom ? (
                    <div className="lib-agent-edit-header">
                      <div className="lib-form-field">
                        <label className="lib-field-label">Output Style Name</label>
                        <input
                          className="lib-field-input"
                          value={outputFormName}
                          onChange={(e) => setOutputFormName(e.target.value)}
                          placeholder="e.g. Executive Summary"
                        />
                      </div>
                      <div className="lib-form-field">
                        <label className="lib-field-label">Category</label>
                        <select
                          className="lib-field-select"
                          value={outputFormCategory}
                          onChange={(e) => setOutputFormCategory(e.target.value)}
                        >
                          {OUTPUT_STYLE_CATEGORIES.slice(1).map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div className="lib-form-field">
                        <label className="lib-field-label">Description</label>
                        <input
                          className="lib-field-input"
                          value={outputFormDescription}
                          onChange={(e) => setOutputFormDescription(e.target.value)}
                          placeholder="e.g. High-level bullet points followed by actionable risks"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="lib-detail-title">{selectedDetail.item.name}</h3>
                      <p className="lib-detail-role">{selectedDetail.item.description}</p>
                    </>
                  )}
                </div>

                <div className="lib-detail-body">
                  {isCustom ? (
                    <div className="lib-detail-section">
                      <div className="lib-detail-section-header">
                        <span className="lib-detail-section-title">Formatting Directive</span>
                        <div className="lib-prompt-mode-tabs">
                          <button
                            className={`lib-mode-btn ${outputMode === 'preview' ? 'active' : ''}`}
                            onClick={() => setOutputMode('preview')}
                            title="Render directive in Markdown"
                          >
                            <Eye size={10} /> Preview
                          </button>
                          <button
                            className={`lib-mode-btn ${outputMode === 'edit' ? 'active' : ''}`}
                            onClick={() => setOutputMode('edit')}
                            title="Edit directive"
                          >
                            <Edit3 size={10} /> Edit
                          </button>
                          <button
                            className="lib-copy-btn"
                            onClick={() => {
                              navigator.clipboard.writeText(outputFormDirective);
                              setCopiedPrompt(true);
                              setTimeout(() => setCopiedPrompt(false), 2000);
                            }}
                            title="Copy directive"
                          >
                            {copiedPrompt ? <Check size={10} color="#10b981" /> : <Copy size={10} />}
                            <span>{copiedPrompt ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>

                      {outputMode === 'preview' ? (
                        <div className="lib-markdown-box">
                          <div className="lib-markdown">
                            <ReactMarkdown>{outputFormDirective || '*No output formatting directive.*'}</ReactMarkdown>
                          </div>
                        </div>
                      ) : (
                        <textarea
                          className="lib-prompt-textarea"
                          rows={7}
                          value={outputFormDirective}
                          onChange={(e) => setOutputFormDirective(e.target.value)}
                          placeholder="Define the schema, bullet style, table layout, or code block constraints..."
                        />
                      )}
                    </div>
                  ) : (
                    <div className="lib-markdown-box">
                      <div className="lib-markdown">
                        <ReactMarkdown>
                          {getOutputStyleMarkdown(selectedDetail.item)}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>

                <div className="lib-detail-footer">
                  <div
                    className="lib-detail-drag-badge"
                    draggable
                    onDragStart={(e) => {
                      const payload = isCustom ? getLiveCustomOutput() : selectedDetail.item;
                      startDrag(`outputStyle:${payload.id}`, e, { kind: 'outputStyle', preset: payload });
                    }}
                    onDragEnd={endDrag}
                    title="Drag onto an agent card to apply this format"
                  >
                    <GripHorizontal size={13} />
                    <span>Drag onto Agent Card to Apply Format</span>
                  </div>

                  <div className="lib-btn-row">
                    {isCustom ? (
                      <>
                        <button
                          className="lib-action-btn success"
                          onClick={handleSaveCustomOutput}
                          title="Save this output style to library"
                        >
                          <Check size={13} /> Save to Library
                        </button>
                        <button
                          className="lib-action-btn danger"
                          onClick={() => handleDeleteCustomOutput(selectedDetail.item.id)}
                          title="Delete this custom format"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    ) : (
                      <button
                        className="lib-action-btn primary"
                        onClick={() => handleDuplicateOutput(selectedDetail.item)}
                        title="Duplicate and customize this format"
                      >
                        <Copy size={13} /> Duplicate &amp; Customize
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Version & Upgrade Modal (Desktop App Only) ── */}
      {isTauri() && showVersionModal && (
        <div
          className="sm-ver-overlay"
          onClick={() => {
            if (upgradePhase !== 'installing') setShowVersionModal(false);
          }}
        >
          <div className="sm-ver-panel" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="sm-ver-header">
              <div className="sm-ver-brand">
                <div className="sm-ver-logo">
                  <img src="/smoke-monkey-mascot.png" alt="Smoke Monkey" />
                </div>
                <div>
                  <div className="sm-ver-title-row">
                    <h3 className="sm-ver-title">Smoke Monkey Canvas</h3>
                    <span className="sm-ver-badge">v{versionInfo?.currentVersion || '1.3.2'}</span>
                  </div>
                  <p className="sm-ver-subtitle">Spatial Multi-Agent Runtime &amp; Library</p>
                </div>
              </div>
              <button
                className="sm-ver-close"
                onClick={() => {
                  if (upgradePhase !== 'installing') setShowVersionModal(false);
                }}
                aria-label="Close"
                disabled={upgradePhase === 'installing'}
              >
                <X size={18} />
              </button>
            </div>

            {/* Status Card */}
            <div className="sm-ver-status">
              {versionInfo?.hasUpdate ? (
                <div
                  className={
                    'sm-ver-card sm-ver-card-update' +
                    (upgradePhase === 'failed' ? ' sm-ver-card-failed' : '') +
                    (upgradePhase === 'success' ? ' sm-ver-card-done' : '')
                  }
                >
                  {upgradePhase === 'idle' && (
                    <>
                      <div className="sm-ver-card-head">
                        <ArrowUpCircle size={18} className="sm-ver-amber-pulse" />
                        <span>A newer version is ready</span>
                      </div>
                      <p className="sm-ver-card-text">
                        v{versionInfo.currentVersion} → v{versionInfo.latestVersion}
                        {versionInfo.latestHarnessVersion !== versionInfo.harnessVersion && (
                          <> · Harness Core v{versionInfo.harnessVersion} → v{versionInfo.latestHarnessVersion}</>
                        )}
                      </p>
                      {upgradeStartError && <p className="sm-ver-error-text">{upgradeStartError}</p>}
                      {versionInfo.canUpgrade !== false && (
                        <button
                          type="button"
                          className="sm-ver-btn-primary"
                          onClick={startUpgrade}
                          disabled={isStartingUpgrade}
                        >
                          {isStartingUpgrade ? (
                            <Loader2 size={13} className="sm-ver-spin" />
                          ) : (
                            <Download size={13} />
                          )}
                          <span>{isStartingUpgrade ? 'Starting…' : 'Update & Restart'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className="sm-ver-disclosure-toggle"
                        onClick={() => setShowManualUpgrade((v) => !v)}
                      >
                        <ChevronRight size={12} className={showManualCommand ? 'sm-ver-chevron-open' : ''} />
                        <span>Install manually</span>
                      </button>
                      {showManualCommand && (
                        <div className="sm-ver-command">
                          <code>{versionInfo.upgradeCommand}</code>
                          <button
                            type="button"
                            className="sm-ver-copy"
                            onClick={() => {
                              navigator.clipboard.writeText(versionInfo.upgradeCommand);
                              setUpgradeCopied(true);
                              setTimeout(() => setUpgradeCopied(false), 2000);
                            }}
                          >
                            {upgradeCopied ? <Check size={12} /> : <Copy size={12} />}
                            <span>{upgradeCopied ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {upgradePhase === 'installing' && (
                    <>
                      <div className="sm-ver-card-head">
                        <Loader2 size={18} className="sm-ver-spin" />
                        <span>Installing v{versionInfo.latestVersion}…</span>
                      </div>
                      <div className="sm-ver-progress">
                        <span>Downloading and installing the update. Keep this window open.</span>
                      </div>
                      {upgradeLogTail && <pre className="sm-ver-log">{upgradeLogTail}</pre>}
                    </>
                  )}

                  {upgradePhase === 'success' && (
                    <>
                      <div className="sm-ver-card-head sm-ver-head-green">
                        <CheckCircle2 size={18} />
                        <span>Update installed — restarting…</span>
                      </div>
                      <p className="sm-ver-card-text">
                        Smoke Monkey Canvas is restarting with v{versionInfo.latestVersion}. This window will refresh
                        automatically.
                      </p>
                      <div className="sm-ver-progress">
                        <Loader2 size={13} className="sm-ver-spin" />
                        <span>Waiting for the new version to come online…</span>
                      </div>
                    </>
                  )}

                  {upgradePhase === 'failed' && (
                    <>
                      <div className="sm-ver-card-head sm-ver-head-rose">
                        <AlertTriangle size={18} />
                        <span>Update failed</span>
                      </div>
                      <p className="sm-ver-card-text">
                        {upgradeJob?.error || 'Something went wrong while installing the update.'}
                      </p>
                      {upgradeLogTail && <pre className="sm-ver-log">{upgradeLogTail}</pre>}
                      <button type="button" className="sm-ver-btn-primary" onClick={startUpgrade} disabled={isStartingUpgrade}>
                        <RefreshCw size={13} className={isStartingUpgrade ? 'sm-ver-spin' : ''} />
                        <span>Try again</span>
                      </button>
                      <div className="sm-ver-command">
                        <code>{versionInfo.upgradeCommand}</code>
                        <button
                          type="button"
                          className="sm-ver-copy"
                          onClick={() => {
                            navigator.clipboard.writeText(versionInfo.upgradeCommand);
                            setUpgradeCopied(true);
                            setTimeout(() => setUpgradeCopied(false), 2000);
                          }}
                        >
                          {upgradeCopied ? <Check size={12} /> : <Copy size={12} />}
                          <span>{upgradeCopied ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="sm-ver-card sm-ver-card-latest">
                  <div className="sm-ver-latest-icon">
                    <CheckCircle2 size={17} />
                  </div>
                  <div>
                    <span className="sm-ver-latest-title">You are on the latest release</span>
                    <p className="sm-ver-card-text">All spatial runtime engines and harness libraries are up to date.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Spec Sheet List */}
            <div className="sm-ver-specs">
              <div className="sm-ver-spec-row">
                <span className="sm-ver-spec-label">Canvas Workspace</span>
                <span className="sm-ver-spec-value mono">v{versionInfo?.currentVersion || '1.3.2'}</span>
              </div>
              <div className="sm-ver-spec-row">
                <span className="sm-ver-spec-label">Harness Core</span>
                <span className="sm-ver-spec-value mono sky">v{versionInfo?.harnessVersion || '1.3.1'}</span>
              </div>
              <div className="sm-ver-spec-row">
                <span className="sm-ver-spec-label">Platform</span>
                <span className="sm-ver-spec-value">macOS (Apple Silicon • arm64)</span>
              </div>
              <div className="sm-ver-spec-row">
                <span className="sm-ver-spec-label">Release Channel</span>
                <span className="sm-ver-spec-value sm-ver-channel">
                  <span className="sm-ver-dot" />
                  Stable Channel
                </span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="sm-ver-footer">
              <button className="sm-ver-btn" onClick={checkAppVersion} disabled={isCheckingUpdate}>
                <RefreshCw size={12} className={isCheckingUpdate ? 'sm-ver-spin' : ''} />
                <span>{isCheckingUpdate ? 'Checking…' : 'Check for Updates'}</span>
              </button>

              <a
                href={versionInfo?.releaseNotesUrl || 'https://github.com/RajdeepDevelopment/smoke-monkey-canvas/releases'}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  void openExternalLink(versionInfo?.releaseNotesUrl || 'https://github.com/RajdeepDevelopment/smoke-monkey-canvas/releases');
                }}
                className="sm-ver-link"
              >
                <span>Release Notes</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── GitHub Skill Import Dialog ── */}
      {showGhImportModal && (
        <div className="lib-gh-modal-backdrop" onClick={() => setShowGhImportModal(false)}>
          <div className="lib-gh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lib-gh-modal-header">
              <div className="lib-gh-modal-title">
                <BrandIcons.github size={18} />
                <span>Import Skill from GitHub</span>
              </div>
              <button
                className="lib-gh-modal-close"
                onClick={() => {
                  setShowGhImportModal(false);
                  setGhImportError(null);
                  setGhImportPreview(null);
                }}
              >
                <X size={15} />
              </button>
            </div>

            <div className="lib-gh-modal-body">
              <div className="lib-form-field">
                <label className="lib-field-label">GitHub Repository URL or "owner/repo"</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="lib-field-input"
                    style={{ flex: 1 }}
                    value={ghImportInput}
                    onChange={(e) => {
                      setGhImportInput(e.target.value);
                      setGhImportError(null);
                    }}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData('text');
                      if (pasted && (pasted.includes('github.com') || pasted.includes('/'))) {
                        setTimeout(() => {
                          handleFetchGithubRepo(pasted);
                        }, 50);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleFetchGithubRepo(ghImportInput);
                      }
                    }}
                    placeholder="e.g. kepano/obsidian-skills or https://github.com/..."
                    autoFocus
                  />
                  <button
                    className="lib-save-btn"
                    style={{ padding: '0 14px', height: '34px', minWidth: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    onClick={() => handleFetchGithubRepo(ghImportInput)}
                    disabled={ghImportLoading || !ghImportInput.trim()}
                  >
                    {ghImportLoading ? <Loader2 size={13} className="lib-spin" /> : <Search size={13} />}
                    <span>{ghImportLoading ? 'Fetching...' : 'Fetch'}</span>
                  </button>
                </div>
                {ghImportError && (
                  <span style={{ fontSize: '11px', color: '#f87171', marginTop: '3px', display: 'block' }}>
                    {ghImportError}
                  </span>
                )}
              </div>

              {ghImportPreview && (
                <div className="lib-gh-preview-card">
                  <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--muted-foreground))' }}>
                    Repository Preview
                  </span>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <GhAvatar
                      repo={ghImportPreview.repo}
                      avatarUrl={ghImportPreview.avatarUrl}
                      fallbackIcon={pluginCategoryIcon(ghImportPreview.category)}
                      color={pluginCategoryColor(ghImportPreview.category)}
                      size={40}
                    />
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'hsl(var(--foreground))' }}>
                          {ghImportPreview.name}
                        </span>
                        <span className="lib-plugin-author-tag">
                          by <strong>@{ghImportPreview.owner}</strong>
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '11px', color: 'hsl(var(--muted-foreground))', lineHeight: 1.4 }}>
                        {ghImportPreview.description}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <span className="lib-plugin-star-badge">
                          <Star size={9.5} fill="currentColor" />
                          <span>{formatStars(ghImportPreview.stars)} stars</span>
                        </span>
                        <span className="lib-plugin-lic-badge">{ghImportPreview.license}</span>
                      </div>
                    </div>
                  </div>

                  <div className="lib-form-field" style={{ marginTop: '8px' }}>
                    <label className="lib-field-label">Category</label>
                    <select
                      className="lib-field-input"
                      value={ghImportPreview.category}
                      onChange={(e) => setGhImportPreview({ ...ghImportPreview, category: e.target.value as PluginCategory })}
                    >
                      {PLUGIN_CATEGORY_ORDER.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="lib-gh-modal-footer">
              <button
                className="lib-modal-cancel-btn"
                style={{ background: 'transparent', border: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground))', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}
                onClick={() => {
                  setShowGhImportModal(false);
                  setGhImportError(null);
                  setGhImportPreview(null);
                }}
              >
                Cancel
              </button>
              <button
                className="lib-save-btn"
                disabled={!ghImportPreview}
                onClick={handleSaveImportedGithubSkill}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={14} />
                <span>Add to Skills Catalog</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ZoneBuilderModal
        isOpen={isZoneBuilderOpen}
        initial={editingZonePreset}
        zones={roleZones}
        title={editingZonePreset?.id ? 'Edit Zone' : 'Create Zone'}
        saveLabel={editingZonePreset?.id ? 'Save Zone' : 'Add Zone Preset'}
        onSave={saveZonePreset}
        onClose={() => {
          setIsZoneBuilderOpen(false);
          setEditingZonePreset(null);
        }}
      />

      {/* ── Mobile Library Sheet with full Level 2 & Inner Detail Navigation ── */}
      {isMobile && activeTab && (
        <LibrarySidebarMobile
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          stockMcps={stockMcps}
          configuredKeys={configuredKeys}
          serverStockSkills={serverStockSkills}
          customMcps={customMcps}
          customSkills={customSkills}
          customAgents={customAgents}
          customToolkits={customToolkits}
          personalityPresets={personalityPresets}
          outputStylePresets={outputStylePresets}
          onConnectKey={onConnectKey}
          onDisconnectKey={onDisconnectKey}
          mcpReadiness={mcpReadiness}
          onSpawnTemplate={onSpawnTemplate}
          connectingMcpName={connectingMcpName}
          roleZones={roleZones}
          onClose={() => {
            setActiveTab(null);
            setSelectedDetail(null);
          }}
        />
      )}
    </div>
  );
};