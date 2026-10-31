import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type NodeTypes,
  type ReactFlowInstance,
  BackgroundVariant,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { SpaceService } from './space.service.js';
import { AgentService } from '../agent/agent.service.js';
import { CanvasPositionSync } from './canvas.sync.js';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import type { SpaceAgentEntity, AgentRecord, AgentConnectionRecord } from '../agent/agent.types.js';
import type { SpaceContextMenuState } from './space.types.js';
import { CrabAgentNode } from '../agent/agent.crab-node.js';
import { SpaceToolbar, type ThemeMode, THEMES } from './space.toolbar.js';
import { SpaceToolbarMobile } from './mobile/space-toolbar.mobile.js';
import { useIsMobile } from '../common/use-mobile.js';
import { SpaceContextMenu } from './space.context-menu.js';
import { onMenuAction, isTauri, openExternalLink } from '../../config/desktop.bridge.js';
import type { LiveLogEvent } from '../agent/agent.drawer.js';
import type { SkillInput } from '../skill/skill.types.js';
import { ENTERPRISE_AGENT_TEMPLATES, type AgentTemplate } from '../agent/agent.templates.js';
import type { StockMcp } from '../mcp/mcp.types.js';
import type { McpReadiness } from '../mcp/mcp.types.js';
import { McpService } from '../mcp/mcp.service.js';
import { resolveStockMcp } from '../mcp/mcp.catalog.js';
import { LibrarySidebar } from '../library/library-sidebar.js';
import { CUSTOM_PLUGINS, pluginToSkillItem } from '../library/library.plugins.js';
import { readLibDragPayload, isLibDrag, setActiveDragPayload, type LibDragPayload, type PromptPreset, type RoleZonePreset, type StockSkillItem, type WorkspaceZonePreset, type HierarchicalChainPreset, type CompanyPreset, type CompanyScale } from '../library/library.types.js';
import { layoutHierarchicalChain, layoutCompany, getZoneSizeForAgents, type PlacedCompanyAgent, type PlacedCompanyZone } from '../library/library.data.js';
import { buildCompanyAgentPrompt } from '../library/data/company-workflows.engine.js';
import { useSpaceStore, isAgentInZone, roleZoneBelongsToSpace, getCanvasViewportPersistedAt, markCanvasViewportPersisted, type GroupWorkspaceZone, type RoleZone } from './space.store.js';
import { AppLoader } from '../common/app-loader.js';
import { LazyMount } from '../common/lazy-mount.js';
import { ThreadProcessNode } from './thread-process-node.js';
import { ThreadConnectionEdge } from './thread-edge.js';
import { AgentAssetsNode } from './agent-assets-node.js';
import { AssetsConnectionEdge } from './assets-edge.js';
import { AgentPeerEdge } from './agent-peer-edge.js';
import { GroupWorkspaceNode } from './group-workspace-node.js';
import { RoleZoneNode } from './role-zone-node.js';
import { HierarchyConnectionEdge } from './hierarchy-edge.js';
import { WorkspacePanelNode } from './workspace-panel-node.js';
import { AgentSkeletonNode } from '../agent/agent.skeleton-node.js';
import type { ZoneDraft } from './zone-builder.modal.js';
import type { SpaceDeleteMode } from './space-delete.modal.js';
import { resolveZoneAt, zoneContainsPoint } from './space.zones.js';
import { type CanvasNode, type CanvasEdge, WORKSPACE_ZONE_Z, ROLE_ZONE_Z, CONNECTOR_EDGE_Z, PEER_EDGE_Z, HIERARCHY_EDGE_Z, AGENT_NODE_Z, AGENT_ACTIVE_Z, THREAD_NODE_Z } from './space.types.js';
import type { ActiveRunRecord, ActiveDelegationRecord } from '../agent/agent.types.js';

const NODE_TYPES: NodeTypes = {
  crabAgent: CrabAgentNode,
  agentSkeleton: AgentSkeletonNode,
  threadProcess: ThreadProcessNode,
  agentAssets: AgentAssetsNode,
  groupWorkspace: GroupWorkspaceNode,
  roleZone: RoleZoneNode,
  workspacePanel: WorkspacePanelNode,
};

const EDGE_TYPES = {
  threadEdge: ThreadConnectionEdge,
  assetsEdge: AssetsConnectionEdge,
  peerEdge: AgentPeerEdge,
  hierarchyEdge: HierarchyConnectionEdge,
};

const AgentModal = React.lazy(() => import('../agent/agent.modal.js').then((m) => ({ default: m.AgentModal })));
const McpModal = React.lazy(() => import('../mcp/mcp.modal.js').then((m) => ({ default: m.McpModal })));
const SkillModal = React.lazy(() => import('../skill/skill.modal.js').then((m) => ({ default: m.SkillModal })));
const SettingsModal = React.lazy(() => import('../settings/settings.modal.js').then((m) => ({ default: m.SettingsModal })));
const AgentDrawer = React.lazy(() => import('../agent/agent.drawer.js').then((m) => ({ default: m.AgentDrawer })));
const ToolsModal = React.lazy(() => import('../tools/tools.modal.js').then((m) => ({ default: m.ToolsModal })));
const PolicyModal = React.lazy(() => import('../policy/policy.modal.js').then((m) => ({ default: m.PolicyModal })));
const ConfirmDialog = React.lazy(() => import('../common/confirm-dialog.js').then((m) => ({ default: m.ConfirmDialog })));
const ZoneBuilderModal = React.lazy(() => import('./zone-builder.modal.js').then((m) => ({ default: m.ZoneBuilderModal })));
const SpaceDeleteModal = React.lazy(() => import('./space-delete.modal.js').then((m) => ({ default: m.SpaceDeleteModal })));

function activeRunsMapsEqual(
  prev: Record<string, ActiveRunRecord[]>,
  next: Record<string, ActiveRunRecord[]>,
) {
  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);
  if (prevKeys.length !== nextKeys.length) return false;
  for (const key of nextKeys) {
    const prevRuns = prev[key];
    const nextRuns = next[key];
    if (!prevRuns || prevRuns.length !== nextRuns.length) return false;
    for (let i = 0; i < nextRuns.length; i += 1) {
      const a = prevRuns[i];
      const b = nextRuns[i];
      if (
        a.runId !== b.runId ||
        a.agentId !== b.agentId ||
        a.triggerType !== b.triggerType ||
        a.sessionId !== b.sessionId ||
        a.status !== b.status ||
        a.startedAt !== b.startedAt ||
        a.taskPrompt !== b.taskPrompt ||
        a.accumulatedText !== b.accumulatedText ||
        a.partsCount !== b.partsCount
      ) {
        return false;
      }
    }
  }
  return true;
}

function activeDelegationsEqual(prev: ActiveDelegationRecord[], next: ActiveDelegationRecord[]) {
  if (prev.length !== next.length) return false;
  for (let i = 0; i < next.length; i += 1) {
    const a = prev[i];
    const b = next[i];
    if (
      a.id !== b.id ||
      a.sourceAgentId !== b.sourceAgentId ||
      a.targetAgentId !== b.targetAgentId ||
      a.taskTitle !== b.taskTitle ||
      a.sessionId !== b.sessionId ||
      a.startedAt !== b.startedAt
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Safely returns the true screen client pixel coordinates of the canvas center.
 * Crucially queries the outer canvas container `.react-flow` (or window) rather
 * than `.react-flow__viewport`, which is subject to CSS transform scale and translation.
 */
export function getCanvasCenterScreenPoint(): { x: number; y: number } {
  const canvasEl = document.querySelector('.react-flow');
  if (canvasEl) {
    const rect = canvasEl.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }
  return {
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 400,
  };
}

/**
 * Compares two viewports with rounding tolerance. Used to detect echo events:
 * a `canvas_viewport_updated` broadcast caused by this tab's own PATCH (or a
 * programmatic `setViewport`) must not be re-persisted and re-broadcast.
 */
function viewportsEqual(
  a: { x: number; y: number; zoom: number },
  b: { x: number; y: number; zoom: number },
): boolean {
  return (
    Math.abs(a.x - b.x) < 0.5 &&
    Math.abs(a.y - b.y) < 0.5 &&
    Math.abs(a.zoom - b.zoom) < 0.005
  );
}

/**
 * Calculates dynamic grid metrics and sizing for agents placed inside a workspace room.
 * As more agents are placed in the room (from 1 to 16+), individual agent size scales down
 * smoothly across standard, compact, mini, and micro density tiers so that all agents
 * fit cleanly within the group room without overflowing or exceeding height.
 */
export function getZoneGridMetrics(
  zoneWidth: number,
  zoneHeight: number,
  memberCount: number,
) {
  const availW = Math.max(280, zoneWidth - 48);
  const availH = Math.max(160, zoneHeight - 128);

  let cols = 1;
  if (memberCount <= 1) {
    cols = 1;
  } else if (memberCount === 2) {
    cols = availW >= 420 ? 2 : 1;
  } else if (memberCount <= 4) {
    cols = 2;
  } else if (memberCount <= 6) {
    cols = 3;
  } else if (memberCount <= 8) {
    cols = 4;
  } else if (memberCount <= 12) {
    cols = 4;
  } else {
    cols = Math.min(6, Math.max(4, Math.ceil(Math.sqrt(memberCount * (availW / availH)))));
  }
  const rows = Math.max(1, Math.ceil(memberCount / cols));

  const slotW = availW / cols;
  const slotH = availH / rows;

  let density: 'standard' | 'compact' | 'mini' | 'micro' = 'standard';
  let avatarSize = 72;
  let cardWidth = 220;
  let cardHeight = 180;
  let scale = 1.0;

  if (memberCount <= 2 && slotW >= 210 && slotH >= 180) {
    density = 'standard';
    avatarSize = 72;
    cardWidth = 220;
    cardHeight = 180;
    scale = 1.0;
  } else if (memberCount <= 4 && slotW >= 150 && slotH >= 130) {
    density = 'compact';
    avatarSize = 56;
    cardWidth = Math.min(180, Math.round(slotW - 16));
    cardHeight = Math.min(150, Math.round(slotH - 12));
    scale = 0.82;
  } else if (memberCount <= 8 && slotW >= 110 && slotH >= 95) {
    density = 'mini';
    avatarSize = 46;
    cardWidth = Math.min(140, Math.round(slotW - 14));
    cardHeight = Math.min(115, Math.round(slotH - 10));
    scale = 0.68;
  } else {
    density = 'micro';
    scale = Math.max(0.40, Math.min(0.60, Math.min((slotW - 10) / 130, (slotH - 10) / 100)));
    avatarSize = Math.max(30, Math.min(40, Math.round(54 * scale)));
    cardWidth = Math.max(84, Math.min(115, Math.round(slotW - 12)));
    cardHeight = Math.max(70, Math.min(95, Math.round(slotH - 10)));
  }

  return {
    cols,
    rows,
    slotW,
    slotH,
    density,
    avatarSize,
    cardWidth,
    cardHeight,
    scale,
  };
}

type RecommendedSkillAttachment = {
  skill_name: string;
  description?: string;
  content: string;
};

type RecommendedSkillSource = {
  id: string;
  name: string;
  description?: string | null;
  content: string;
};

const resolveRecommendedSkillAttachment = (
  skillKey: string,
  stockSkills: RecommendedSkillSource[],
  agentName: string,
  role?: string | null,
): RecommendedSkillAttachment => {
  const stockSkill = stockSkills.find(
    (s) => s.id === skillKey || s.name.toLowerCase() === skillKey.toLowerCase(),
  );
  if (stockSkill) {
    return {
      skill_name: stockSkill.name,
      description: stockSkill.description || undefined,
      content: stockSkill.content,
    };
  }

  const normalized = skillKey.replace(/^plugin:/i, '').toLowerCase();
  const plugin = CUSTOM_PLUGINS.find((p) => p.repo.toLowerCase() === normalized);
  if (plugin) {
    const pluginSkill = pluginToSkillItem(plugin);
    return {
      skill_name: pluginSkill.name,
      description: pluginSkill.description,
      content: pluginSkill.content,
    };
  }

  const readableName = skillKey.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return {
    skill_name: readableName,
    description: `Specialist skill for ${agentName}`,
    content: `# ${readableName} Directive\n\nExecute specialized workflows for ${role || 'this agent'} adhering to workspace directives.`,
  };
};

export const SpaceCanvas: React.FC = () => {
  const currentTheme = useSpaceStore((s) => s.currentTheme);
  const setTheme = useSpaceStore((s) => s.setTheme);
  const agents = useSpaceStore((s) => s.agents);
  const nodes = useSpaceStore((s) => s.nodes);
  const edges = useSpaceStore((s) => s.edges);
  const setAgents = useSpaceStore((s) => s.setAgents);
  const setNodes = useSpaceStore((s) => s.setNodes);
  const setEdges = useSpaceStore((s) => s.setEdges);
  const onNodesChange = useSpaceStore((s) => s.onNodesChange);
  const onEdgesChange = useSpaceStore((s) => s.onEdgesChange);
  const expandedThreads = useSpaceStore((s) => s.expandedThreads);
  const toggleThreadExpanded = useSpaceStore((s) => s.toggleThreadExpanded);
  const visibleAgentThreads = useSpaceStore((s) => s.visibleAgentThreads);
  const toggleAgentThreadsVisible = useSpaceStore((s) => s.toggleAgentThreadsVisible);
  const updateAgentStatus = useSpaceStore((s) => s.updateAgentStatus);
  const updateAgentCron = useSpaceStore((s) => s.updateAgentCron);
  const updateNodePositionLocally = useSpaceStore((s) => s.updateNodePositionLocally);
  const activeDrawerAgentId = useSpaceStore((s) => s.activeDrawerAgentId);
  const setActiveDrawerAgentId = useSpaceStore((s) => s.setActiveDrawerAgentId);
  const threadPositions = useSpaceStore((s) => s.threadPositions);
  const expandedAssetsThreads = useSpaceStore((s) => s.expandedAssetsThreads);
  const toggleAssetsThreadExpanded = useSpaceStore((s) => s.toggleAssetsThreadExpanded);
  const visibleAssetsThreads = useSpaceStore((s) => s.visibleAssetsThreads);
  const toggleAssetsThreadVisible = useSpaceStore((s) => s.toggleAssetsThreadVisible);
  const assetsPositions = useSpaceStore((s) => s.assetsPositions);
  const panelPositions = useSpaceStore((s) => s.panelPositions);
  const agentUnreadAssetsCounts = useSpaceStore((s) => s.agentUnreadAssetsCounts);
  const workspaceZones = useSpaceStore((s) => s.workspaceZones);
  const podCardExpandedAgents = useSpaceStore((s) => s.podCardExpandedAgents);
  const addWorkspaceZone = useSpaceStore((s) => s.addWorkspaceZone);
  const updateWorkspaceZone = useSpaceStore((s) => s.updateWorkspaceZone);
  const removeWorkspaceZone = useSpaceStore((s) => s.removeWorkspaceZone);
  const roleZones = useSpaceStore((s) => s.roleZones);
  const setRoleZones = useSpaceStore((s) => s.setRoleZones);
  const addRoleZone = useSpaceStore((s) => s.addRoleZone);
  const addRoleZonesBatch = useSpaceStore((s) => s.addRoleZonesBatch);
  const updateRoleZone = useSpaceStore((s) => s.updateRoleZone);
  const removeRoleZone = useSpaceStore((s) => s.removeRoleZone);

  const [rfInstance, setRfInstance] = useState<ReactFlowInstance<CanvasNode, CanvasEdge> | null>(null);
  // Keep a stable ref so callbacks declared before setRfInstance can still access the instance
  const rfInstanceRef = useRef<ReactFlowInstance<CanvasNode, CanvasEdge> | null>(null);
  useEffect(() => { rfInstanceRef.current = rfInstance; }, [rfInstance]);
  const isMobile = useIsMobile();
  const [activeWorkspaceSpaceId, setActiveWorkspaceSpaceId] = useState<string | null>(null);

  const activeWorkspaceSpace = useMemo(
    () => workspaceZones.find((space) => space.id === activeWorkspaceSpaceId) ?? null,
    [workspaceZones, activeWorkspaceSpaceId],
  );

  const [companyDeployment, setCompanyDeployment] = useState<{
    companyName: string;
    total: number;
    current: number;
    currentAgentName: string;
    currentRoleTitle: string;
    phase: 'spawning' | 'completed';
  } | null>(null);

  /**
   * Hard re-entrancy lock for company deployments. A single deploy can take
   * tens of seconds while it creates every agent sequentially; without this a
   * double-click (or a second click while the progress banner is running)
   * spawns a second full company and silently duplicates dozens of agents.
   */
  const companyDeployLockRef = useRef(false);
  const [isCompanyDeploying, setIsCompanyDeploying] = useState(false);

  const [deployingAgents, setDeployingAgents] = useState<Array<{
    tempId: string;
    name: string;
    role?: string | null;
    provider?: string;
    model?: string;
    x: number;
    y: number;
    zoneId?: string | null;
    isAvatar?: boolean;
    zoneColor?: string;
    phase: 'provisioning' | 'attaching_mcps' | 'attaching_skills' | 'ready';
  }>>([]);

  const workspacePanelAgents = useMemo(() => {
    if (!activeWorkspaceSpace) return [];
    return agents.filter((agent) =>
      isAgentInZone(
        agent.pos_x,
        agent.pos_y,
        activeWorkspaceSpace.x,
        activeWorkspaceSpace.y,
        activeWorkspaceSpace.width,
        activeWorkspaceSpace.height,
      ),
    );
  }, [agents, activeWorkspaceSpace]);

  const workspacePanelZones = useMemo(() => {
    if (!activeWorkspaceSpace) return [];
    return roleZones.filter(
      (zone) =>
        zone.spaceId === activeWorkspaceSpace.id ||
        (!zone.spaceId &&
          zoneContainsPoint(
            activeWorkspaceSpace,
            zone.x + zone.width / 2,
            zone.y + zone.height / 2,
          )),
    );
  }, [roleZones, activeWorkspaceSpace]);

  useEffect(() => {
    if (activeWorkspaceSpaceId && !workspaceZones.some((space) => space.id === activeWorkspaceSpaceId)) {
      setActiveWorkspaceSpaceId(null);
    }
  }, [workspaceZones, activeWorkspaceSpaceId]);

  const handleSelectTheme = (t: ThemeMode) => {
    setTheme(t);
  };

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<SpaceContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    flowX: 0,
    flowY: 0,
  });

  // Modals & Drawer State
  const [editingRoleZone, setEditingRoleZone] = useState<RoleZone | null>(null);
  const [isRoleZoneBuilderOpen, setIsRoleZoneBuilderOpen] = useState(false);
  const [pendingDeleteRoleZoneId, setPendingDeleteRoleZoneId] = useState<string | null>(null);
  const [pendingDeleteSpaceTarget, setPendingDeleteSpaceTarget] = useState<{
    space: GroupWorkspaceZone;
    memberAgents: SpaceAgentEntity[];
    memberZones: RoleZone[];
  } | null>(null);
  const [isDeletingSpace, setIsDeletingSpace] = useState(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<SpaceAgentEntity | null>(null);
  const [agentModalSection, setAgentModalSection] = useState<'general' | 'directory' | 'schedule' | 'model'>('general');
  const [templateInitialData, setTemplateInitialData] = useState<
    (Partial<AgentRecord> & { recommended_mcps?: string[]; recommended_skills?: string[] }) | null
  >(null);
  const [newAgentCoords, setNewAgentCoords] = useState<{ x: number; y: number } | null>(null);

  const [stockMcps, setStockMcps] = useState<StockMcp[]>([]);
  const [stockSkills, setStockSkills] = useState<
    Array<{ id: string; name: string; description: string | null; content: string; category: string | null }>
  >([]);
  /**
   * Credential key name -> is a value currently stored. Drives the lock/ready
   * state shown on library MCP items so it matches the server's own readiness
   * check (which also honours per-agent `config.env` overrides).
   */
  const [configuredKeys, setConfiguredKeys] = useState<Record<string, boolean>>({});
  const [mcpReadiness, setMcpReadiness] = useState<Record<string, McpReadiness>>({});
  const [connectingMcpName, setConnectingMcpName] = useState<string | null>(null);

  /**
   * Personality / output-style presets. Served by the server because the
   * model-facing directive text has to live next to the runner that injects it.
   */
  const [personalityPresets, setPersonalityPresets] = useState<PromptPreset[]>([]);
  const [outputStylePresets, setOutputStylePresets] = useState<PromptPreset[]>([]);

  const allPersonalities = useMemo(() => {
    try {
      const raw = localStorage.getItem('smoke_canvas_custom_personas');
      const custom: PromptPreset[] = raw ? JSON.parse(raw) : [];
      return [...personalityPresets, ...custom];
    } catch {
      return personalityPresets;
    }
  }, [personalityPresets]);

  const allOutputStyles = useMemo(() => {
    try {
      const raw = localStorage.getItem('smoke_canvas_custom_outputs');
      const custom: PromptPreset[] = raw ? JSON.parse(raw) : [];
      return [...outputStylePresets, ...custom];
    } catch {
      return outputStylePresets;
    }
  }, [outputStylePresets]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/personality/presets');
        if (!res.ok) return;
        const data = (await res.json()) as {
          personality: { presets: PromptPreset[] };
          output: { presets: PromptPreset[] };
        };
        if (cancelled) return;
        setPersonalityPresets(data.personality?.presets ?? []);
        setOutputStylePresets(data.output?.presets ?? []);
      } catch {
        // Non-fatal: the two preset tabs simply stay empty.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const LLM_PROVIDER_KEYS = [
    'NVIDIA_API_KEY',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'GEMINI_API_KEY',
    'OPENROUTER_API_KEY',
    'GROQ_API_KEY',
  ];

  const hasCheckedInitialLlmRef = useRef(false);
  const mcpOAuthPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshConfiguredKeys = useCallback(async (isInitialBoot = false) => {
    try {
      const res = await fetch('/api/settings/keys');
      if (!res.ok) return;
      const data = (await res.json()) as Record<string, { masked: string; isSet: boolean }>;
      const next: Record<string, boolean> = {};
      for (const [key, val] of Object.entries(data)) next[key] = Boolean(val?.isSet);
      setConfiguredKeys(next);

      // Auto-open API Keys modal ONLY on desktop initial boot if user hasn't configured any LLM provider key yet
      if (!isMobile && isInitialBoot && !hasCheckedInitialLlmRef.current) {
        hasCheckedInitialLlmRef.current = true;
        const hasConfiguredLlm = LLM_PROVIDER_KEYS.some((k) => Boolean(data[k]?.isSet));
        if (!hasConfiguredLlm) {
          setIsSettingsModalOpen(true);
        }
      }
    } catch {
      /* non-fatal: library simply shows everything as locked */
    }

    // Server-computed readiness knows about OAuth tokens, which never appear as
    // env keys. Without this the Library would keep offering "Connect" to an
    // already-authorized remote server.
    try {
      setMcpReadiness(await McpService.fetchStatus());
    } catch {
      /* non-fatal: fall back to env-key presence */
    }
  }, []);

  useEffect(() => {
    fetch('/api/mcp/stock')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setStockMcps(data);
      })
      .catch(() => {});

    fetch('/api/skills/stock')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setStockSkills(data);
      })
      .catch(() => {});

    refreshConfiguredKeys(true);
  }, [refreshConfiguredKeys]);

  /**
   * Adapt the server's bundled/uploaded skills to the library's item shape so
   * the Skills tab shows real stock content instead of local placeholders.
   */
  const libraryStockSkills = useMemo<StockSkillItem[]>(
    () =>
      stockSkills.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description || '',
        content: s.content,
        category: s.category || 'Product & Project Management',
        tags: [],
      })),
    [stockSkills],
  );

  const [mcpModalAgentId, setMcpModalAgentId] = useState<string | null>(null);
  const [mcpModalInitialName, setMcpModalInitialName] = useState<string | null>(null);
  const [skillModalAgentId, setSkillModalAgentId] = useState<string | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [toolsModalAgent, setToolsModalAgent] = useState<SpaceAgentEntity | null>(null);
  const [policyModalAgent, setPolicyModalAgent] = useState<SpaceAgentEntity | null>(null);

  // ── Voice Popover: Only ONE agent can have its mic open at a time ──
  const [activeVoiceAgentId, setActiveVoiceAgentId] = useState<string | null>(null);
  const handleVoiceToggle = useCallback((agentId: string) => {
    setActiveVoiceAgentId((prev) => (prev === agentId ? null : agentId));
  }, []);
  const handleVoiceClose = useCallback(() => {
    setActiveVoiceAgentId(null);
  }, []);

  const activeDrawerAgentIdRef = useRef(activeDrawerAgentId);
  activeDrawerAgentIdRef.current = activeDrawerAgentId;

  const activeDrawerAgent = useMemo(() => {
    if (!activeDrawerAgentId) return null;
    return agents.find((a) => a.id === activeDrawerAgentId) ?? null;
  }, [agents, activeDrawerAgentId]);

  const [isAppReady, setIsAppReady] = useState(false);
  const [connections, setConnections] = useState<AgentConnectionRecord[]>([]);

  // 1. Live refresh — agents + inter-agent connections only.
  // Workspace rooms and designation zones are maintained incrementally through
  // their own WS events; re-fetching and replacing them here would snap rooms
  // back to their persisted position while another browser (or this user) is
  // still dragging.
  const refreshSpace = useCallback(async () => {
    try {
      const [data, connList] = await Promise.all([
        SpaceService.fetchSpaceAgents(),
        AgentService.fetchConnections().catch(() => []),
      ]);
      setAgents(data);
      setConnections(connList);
    } catch (err) {
      console.error('[SpaceCanvas] Failed refreshing space:', err);
    }
  }, [setAgents]);

  // 1b. One-time full hydration of the canvas (agents, connections, rooms, zones).
  const didHydrateCanvasRef = useRef(false);
  useEffect(() => {
    if (didHydrateCanvasRef.current) return;
    didHydrateCanvasRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const [data, connList, backendSpaces, zones] = await Promise.all([
          SpaceService.fetchSpaceAgents(),
          AgentService.fetchConnections().catch(() => []),
          SpaceService.fetchWorkspaceSpaces().catch(() => []),
          SpaceService.fetchZones().catch(() => []),
        ]);
        if (cancelled) return;
        setAgents(data);
        setConnections(connList);
        if (Array.isArray(backendSpaces) && backendSpaces.length > 0) {
          useSpaceStore.getState().setWorkspaceZones(backendSpaces);
        } else if (data.length === 0) {
          // Backend is empty: drop stale locally-cached company spaces so a fresh
          // canvas does not resurrect deleted deployments.
          useSpaceStore.getState().setWorkspaceZones([]);
        } else {
          const localSpaces = useSpaceStore.getState().workspaceZones;
          if (localSpaces.length > 0) {
            SpaceService.createWorkspaceSpacesBatch(localSpaces).catch(() => {});
          }
        }
        if (Array.isArray(zones)) {
          const currentSpaces = Array.isArray(backendSpaces) && backendSpaces.length > 0
            ? backendSpaces
            : useSpaceStore.getState().workspaceZones;
          setRoleZones(
            zones.map((zone) => {
              const persistedSpace = zone.spaceId
                ? currentSpaces.find((space) => space.id === zone.spaceId)
                : undefined;
              const inferredSpace =
                persistedSpace ??
                currentSpaces.find((space) =>
                  zoneContainsPoint(space, zone.x + zone.width / 2, zone.y + zone.height / 2),
                );
              return { ...zone, spaceId: inferredSpace?.id ?? null };
            }),
          );
        }
      } catch (err) {
        console.error('[SpaceCanvas] Failed hydrating space:', err);
      } finally {
        if (!cancelled) setIsAppReady(true);
      }
    })();
    return () => {
      cancelled = true;
      // StrictMode mounts, cleans up, then mounts again in development. If we
      // kept the guard set, the second (real) mount would skip hydration and
      // `isAppReady` would never flip — leaving the boot loader on screen.
      didHydrateCanvasRef.current = false;
    };
  }, [setAgents, setRoleZones]);

  // 1c. Canvas viewport hydration. The backend copy is shared by every browser,
  // and the local copy wins only when it was persisted more recently (e.g. the
  // tab was closed inside the debounce window).
  const didHydrateViewportRef = useRef(false);
  const viewportReadyRef = useRef(false);
  const viewportInteractingRef = useRef(false);

  const applyViewportFromRemote = useCallback(
    (vp: { x: number; y: number; zoom: number }, animate = false) => {
      const store = useSpaceStore.getState();
      const next = { x: vp.x, y: vp.y, zoom: vp.zoom };
      const current = store.canvasViewport;
      if (current && viewportsEqual(current, next)) return;
      // Store first: the onMoveEnd fired by setViewport then sees an identical
      // viewport and skips persisting/broadcasting it back (echo loop guard).
      store.setCanvasViewport(next);
      const instance = rfInstanceRef.current;
      if (instance) {
        instance.setViewport(next, { duration: animate ? 300 : 0 });
      }
    },
    [],
  );

  useEffect(() => {
    if (!rfInstance || didHydrateViewportRef.current) return;
    didHydrateViewportRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const serverVp = await SpaceService.fetchCanvasViewport().catch(() => null);
        if (cancelled) return;
        const store = useSpaceStore.getState();
        const localVp = store.canvasViewport;
        const localAt = getCanvasViewportPersistedAt();
        const serverAt = typeof serverVp?.updatedAt === 'number' ? serverVp.updatedAt : 0;

        if (serverVp && !(localVp && localAt > serverAt)) {
          applyViewportFromRemote(serverVp, false);
          return;
        }

        // No backend viewport yet, or this tab's copy is newer than the server's.
        const current = localVp ?? rfInstanceRef.current?.getViewport() ?? null;
        if (current) {
          CanvasPositionSync.queueViewportUpdate(current, true);
          markCanvasViewportPersisted();
        }
      } finally {
        if (!cancelled) viewportReadyRef.current = true;
      }
    })();
    return () => {
      cancelled = true;
      // Allow StrictMode's remount (and genuine remounts) to redo hydration.
      didHydrateViewportRef.current = false;
    };
  }, [rfInstance, applyViewportFromRemote]);

  // Active Running Instances & Threads per Agent
  const [activeRunsMap, setActiveRunsMap] = useState<Record<string, ActiveRunRecord[]>>({});
  const [activeDelegations, setActiveDelegations] = useState<ActiveDelegationRecord[]>([]);

  const applyActiveRunsSnapshot = useCallback((runs: ActiveRunRecord[]) => {
    const next: Record<string, ActiveRunRecord[]> = {};
    for (const run of runs) {
      if (!next[run.agentId]) next[run.agentId] = [];
      next[run.agentId].push(run);
    }
    setActiveRunsMap((prev) => (activeRunsMapsEqual(prev, next) ? prev : next));
  }, []);

  const applyActiveDelegationsSnapshot = useCallback((delegations: ActiveDelegationRecord[]) => {
    setActiveDelegations((prev) =>
      activeDelegationsEqual(prev, delegations) ? prev : delegations,
    );
  }, []);

  useEffect(() => {
    const prefetch = () => {
      void import('../agent/agent.drawer.js');
      void import('../agent/agent.file-explorer.js');
    };
    const requestIdle = (
      window as Window & {
        requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      }
    ).requestIdleCallback;
    if (requestIdle) {
      const id = requestIdle.call(window, prefetch, { timeout: 4000 });
      return () => {
        (
          window as Window & { cancelIdleCallback?: (handle: number) => void }
        ).cancelIdleCallback?.call(window, id);
      };
    }
    const timer = window.setTimeout(prefetch, 4000);
    return () => window.clearTimeout(timer);
  }, []);

  const handleToggleAgentThreads = useCallback(
    (agentId: string) => {
      toggleAgentThreadsVisible(agentId);
    },
    [toggleAgentThreadsVisible],
  );

  // 2. Action Handlers for Agent Crab Nodes (Stabilized references to avoid re-rendering nodes)
  // NOTE: handleRunAgent / handleStopAgent are declared after showToast (line ~830) so they can call it.

  const handleEditAgent = useCallback((agent: SpaceAgentEntity, section: 'general' | 'directory' | 'schedule' | 'model' = 'general') => {
    setEditingAgent(agent);
    setAgentModalSection(section);
    setIsAgentModalOpen(true);
  }, []);

  const handleOpenDrawer = useCallback((agent: SpaceAgentEntity) => {
    setActiveDrawerAgentId(agent.id);
    useSpaceStore.getState().clearLiveEvents();
  }, [setActiveDrawerAgentId]);

  const handleCloseDrawer = useCallback(() => {
    setActiveDrawerAgentId(null);
    useSpaceStore.getState().clearDrawerCallers();
  }, [setActiveDrawerAgentId]);

  // Handle cross-agent delegation jump events (e.g. from ToolCallCard "View Agent Session")
  useEffect(() => {
    const handleOpenAgentEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ agentId: string; agentName?: string; taskTitle?: string }>).detail;
      if (!detail?.agentId) return;
      const currentId = useSpaceStore.getState().activeDrawerAgentId;
      if (currentId && currentId !== detail.agentId) {
        const currentAgent = agents.find((a) => a.id === currentId);
        useSpaceStore.getState().pushDrawerCaller({
          id: currentId,
          name: currentAgent?.name || 'Main Agent',
          role: currentAgent?.role,
          taskTitle: detail.taskTitle,
        });
      }
      useSpaceStore.getState().setActiveDrawerAgentId(detail.agentId);
    };

    window.addEventListener('canvas:open-agent', handleOpenAgentEvent);
    return () => {
      window.removeEventListener('canvas:open-agent', handleOpenAgentEvent);
    };
  }, [agents]);

  const handleVoiceSend = useCallback((agent: SpaceAgentEntity, text: string) => {
    setActiveDrawerAgentId(agent.id);
    useSpaceStore.getState().setPendingVoicePrompt({
      agentId: agent.id,
      text,
      autoSend: true,
      forceNewChat: true,
    });
  }, [setActiveDrawerAgentId]);

  const handleAddMcp = useCallback((agentId: string, initialMcpName?: string) => {
    setMcpModalAgentId(agentId);
    setMcpModalInitialName(initialMcpName || null);
  }, []);

  const handleDeleteMcp = useCallback(
    async (agentId: string, mcpId: string) => {
      await AgentService.deleteMcp(agentId, mcpId);
      refreshSpace();
    },
    [refreshSpace],
  );

  const handleAddSkill = useCallback((agentId: string) => {
    setSkillModalAgentId(agentId);
  }, []);

  const handleDeleteSkill = useCallback(
    async (agentId: string, skillId: string) => {
      await AgentService.deleteSkill(agentId, skillId);
      refreshSpace();
    },
    [refreshSpace],
  );

  const handleOpenTools = useCallback((agent: SpaceAgentEntity) => {
    setToolsModalAgent(agent);
  }, []);

  const handleOpenPolicies = useCallback((agent: SpaceAgentEntity) => {
    setPolicyModalAgent(agent);
  }, []);

  const handleSaveDisabledTools = useCallback(async (agentId: string, disabledTools: string[]) => {
    const existingAgent = agents.find((a) => a.id === agentId);
    if (!existingAgent) {
      throw new Error(`Agent not found on canvas`);
    }
    await AgentService.updateAgentDisabledTools(agentId, disabledTools);
    await refreshSpace();
  }, [agents, refreshSpace]);

  const handleSavePolicies = useCallback(async (agentId: string, policies: string[]) => {
    const existingAgent = agents.find((a) => a.id === agentId);
    if (!existingAgent) {
      throw new Error(`Agent not found on canvas`);
    }
    await AgentService.updateAgentPolicies(agentId, policies);
    await refreshSpace();
  }, [agents, refreshSpace]);

  // ── Library: transient feedback toast ─────────────────────────────────────
  const [toast, setToast] = useState<{ text: string; tone: 'ok' | 'warn' } | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const showToast = useCallback((text: string, tone: 'ok' | 'warn' = 'ok') => {
    setToast({ text, tone });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3600);
  }, []);
  useEffect(() => () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  }, []);

  // 2b. Run/stop handlers — declared after showToast so they can call it directly
  const handleRunAgent = useCallback(async (id: string, customPrompt?: string) => {
    try {
      await AgentService.triggerRun(id, customPrompt);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to trigger run', 'warn');
    }
  }, [showToast]);

  const handleStopAgent = useCallback(async (id: string) => {
    try {
      await AgentService.stopAgent(id);
      setAgents((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: a.cron_enabled ? 'scheduled' : 'idle' } : a)),
      );
      refreshSpace();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to stop agent', 'warn');
    }
  }, [refreshSpace, showToast]);

  // ── Agent deletion: in-app confirmation instead of window.confirm ─────────
  // The native dialog could not be themed and was being dismissed unpredictably,
  // which left the agent on the canvas looking like nothing had happened. State
  // holds the agent awaiting confirmation so the node callback stays synchronous.
  // Declared after `showToast` because the dependency array below reads it.
  const [pendingDeleteAgentId, setPendingDeleteAgentId] = useState<string | null>(null);

  const handleDeleteAgent = useCallback((id: string) => {
    setPendingDeleteAgentId(id);
  }, []);

  const cancelDeleteAgent = useCallback(() => setPendingDeleteAgentId(null), []);

  const confirmDeleteAgent = useCallback(async () => {
    const id = pendingDeleteAgentId;
    if (!id) return;
    const agent = agents.find((a) => a.id === id);
    try {
      await AgentService.deleteAgent(id);
      setAgents((prev) => prev.filter((a) => a.id !== id));
      setActiveDrawerAgentId((current) => (current === id ? null : current));
      setPendingDeleteAgentId(null);
      showToast(`${agent?.name ?? 'Agent'} removed from space.`, 'ok');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete agent', 'warn');
    }
  }, [agents, pendingDeleteAgentId, showToast]);

  // ── Hierarchical Zone management ────────────────────────────────────────
  const openRoleZoneBuilder = useCallback((zone?: RoleZone) => {
    setEditingRoleZone(zone ?? null);
    setIsRoleZoneBuilderOpen(true);
  }, []);

  const handleSaveRoleZone = useCallback(
    (draft: ZoneDraft) => {
      if (editingRoleZone) {
        updateRoleZone(editingRoleZone.id, {
          ...draft,
          description: draft.description || undefined,
          responsibilities: draft.responsibilities || undefined,
          workflowInstructions: draft.workflowInstructions || undefined,
          repoUrl: draft.repoUrl || undefined,
          workingDir: draft.workingDir || undefined,
          projectBrief: draft.projectBrief || undefined,
        });
        showToast(`Zone "${draft.roleTitle}" updated.`, 'ok');
        setIsRoleZoneBuilderOpen(false);
        setEditingRoleZone(null);
        return;
      }

      const store = useSpaceStore.getState();
      const center = getCanvasCenterScreenPoint();
      const flow = rfInstance?.screenToFlowPosition(center);
      const flowX = flow?.x ?? 300;
      const flowY = flow?.y ?? 220;
      const activeSpace = activeWorkspaceSpaceId
        ? store.workspaceZones.find((candidate) => candidate.id === activeWorkspaceSpaceId)
        : undefined;
      const space =
        activeSpace ??
        store.workspaceZones.find((candidate) => zoneContainsPoint(candidate, flowX, flowY)) ??
        store.workspaceZones[0];
      if (!space) {
        showToast('Create an Office Space first, then add a zone inside it.', 'warn');
        return;
      }
      const width = Math.min(draft.width, Math.max(240, space.width - 32));
      const height = Math.min(draft.height, Math.max(140, space.height - 32));
      addRoleZone({
        ...draft,
        description: draft.description || undefined,
        responsibilities: draft.responsibilities || undefined,
        workflowInstructions: draft.workflowInstructions || undefined,
        repoUrl: draft.repoUrl || undefined,
        workingDir: draft.workingDir || undefined,
        projectBrief: draft.projectBrief || undefined,
        spaceId: space.id,
        x: Math.round(space.x + (space.width - width) / 2),
        y: Math.round(space.y + (space.height - height) / 2),
        width: Math.round(width),
        height: Math.round(height),
      });
      showToast(`Created L${draft.level} ${draft.roleTitle} zone in "${space.name}".`, 'ok');
      setIsRoleZoneBuilderOpen(false);
      setEditingRoleZone(null);
    },
    [activeWorkspaceSpaceId, addRoleZone, editingRoleZone, rfInstance, showToast, updateRoleZone],
  );

  const handleRemoveRoleZone = useCallback((id: string) => {
    setPendingDeleteRoleZoneId(id);
  }, []);

  const handleFocusRoleZone = useCallback(
    (zone: RoleZone) => {
      if (!rfInstance) return;
      rfInstance.setCenter(zone.x + zone.width / 2, zone.y + zone.height / 2, {
        zoom: 1.05,
        duration: 500,
      });
    },
    [rfInstance],
  );

  const handleOpenWorkspace = useCallback(
    (spaceId: string) => {
      setActiveWorkspaceSpaceId((current) => (current === spaceId ? null : spaceId));
    },
    [],
  );

  const handleCloseWorkspace = useCallback(() => {
    setActiveWorkspaceSpaceId(null);
  }, []);

  const handleRemoveWorkspace = useCallback(
    (spaceId: string) => {
      const targetSpace = workspaceZones.find((z) => z.id === spaceId);
      if (!targetSpace) {
        removeWorkspaceZone(spaceId);
        return;
      }

      // Find all role zones belonging to or contained within this space
      const memberZones = roleZones.filter(
        (z) =>
          z.spaceId === spaceId ||
          (z.x >= targetSpace.x &&
            z.y >= targetSpace.y &&
            z.x + z.width <= targetSpace.x + targetSpace.width + 80 &&
            z.y + z.height <= targetSpace.y + targetSpace.height + 80),
      );

      // Find all agents located inside this space or its member zones
      const memberAgents = agents.filter((a) => {
        const inSpace = isAgentInZone(a.pos_x, a.pos_y, targetSpace.x, targetSpace.y, targetSpace.width, targetSpace.height);
        if (inSpace) return true;
        return memberZones.some((z) => isAgentInZone(a.pos_x, a.pos_y, z.x, z.y, z.width, z.height));
      });

      setPendingDeleteSpaceTarget({
        space: targetSpace,
        memberAgents,
        memberZones,
      });
    },
    [workspaceZones, roleZones, agents, removeWorkspaceZone],
  );

  const handleConfirmSpaceDelete = useCallback(
    async (mode: SpaceDeleteMode, deleteFiles: boolean) => {
      if (!pendingDeleteSpaceTarget) return;
      const { space, memberAgents, memberZones } = pendingDeleteSpaceTarget;
      setIsDeletingSpace(true);

      try {
        if (mode === 'all') {
          // 1. Delete all agents from backend (and files on disk if checked)
          const agentIds = new Set(memberAgents.map((a) => a.id));
          for (const a of memberAgents) {
            await AgentService.deleteAgent(a.id, { deleteFiles }).catch((err) => {
              console.warn(`[SpaceCanvas] Failed to delete agent ${a.id}:`, err);
            });
          }

          // 2. Remove agents from local state
          setAgents((prev) => prev.filter((a) => !agentIds.has(a.id)));
          if (activeDrawerAgentId && agentIds.has(activeDrawerAgentId)) {
            setActiveDrawerAgentId(null);
          }

          // 3. Remove all member role zones
          for (const z of memberZones) {
            removeRoleZone(z.id);
          }

          // 4. Remove workspace space
          void SpaceService.setWorkspaceAgents(space.id, []).catch(() => {});
          removeWorkspaceZone(space.id);
          if (activeWorkspaceSpaceId === space.id) {
            setActiveWorkspaceSpaceId(null);
          }

          showToast(
            `Deleted "${space.name}", ${memberZones.length} role zone${memberZones.length === 1 ? '' : 's'}, and ${memberAgents.length} agent${memberAgents.length === 1 ? '' : 's'}.`,
            'ok',
          );
        } else if (mode === 'space_and_zones') {
          // 1. Remove all member role zones
          for (const z of memberZones) {
            removeRoleZone(z.id);
          }

          // 2. Remove workspace space
          void SpaceService.setWorkspaceAgents(space.id, []).catch(() => {});
          removeWorkspaceZone(space.id);
          if (activeWorkspaceSpaceId === space.id) {
            setActiveWorkspaceSpaceId(null);
          }

          showToast(
            `Deleted "${space.name}" and ${memberZones.length} role zone${memberZones.length === 1 ? '' : 's'}. Kept ${memberAgents.length} agent${memberAgents.length === 1 ? '' : 's'} on canvas.`,
            'ok',
          );
        } else {
          // space_only
          void SpaceService.setWorkspaceAgents(space.id, []).catch(() => {});
          removeWorkspaceZone(space.id);
          if (activeWorkspaceSpaceId === space.id) {
            setActiveWorkspaceSpaceId(null);
          }

          showToast(`Removed space container "${space.name}".`, 'ok');
        }

        setPendingDeleteSpaceTarget(null);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to delete space', 'warn');
      } finally {
        setIsDeletingSpace(false);
      }
    },
    [pendingDeleteSpaceTarget, activeDrawerAgentId, activeWorkspaceSpaceId, removeRoleZone, removeWorkspaceZone, showToast],
  );

  // ── Library: connect a credential for a locked stock MCP ─────────────────
  // Asks the server to run discovery + dynamic client registration + PKCE, then
  // hands the provider's consent page to a browser. The server owns the OAuth
  // client, so it can also open the browser itself -- which is what makes this
  // work in the desktop webview, where window.open is refused.
  const handleConnectKey = useCallback(
    async (mcp: StockMcp) => {
      refreshConfiguredKeys();

      setConnectingMcpName(mcp.name);
      let authorizationUrl = '';
      let browserOpened = false;
      try {
        // The desktop app runs the server on the same machine as the user, so
        // the server can open the browser itself. In the browser deployment the
        // server may live elsewhere, so the client opens the URL instead.
        const result = await McpService.connect(mcp.name, {
          launch: isTauri() ? 'server' : 'client',
        });
        browserOpened = !!result.browserOpened;
        authorizationUrl = result.authorizationUrl ?? '';

        if (result.status === 'connected') {
          showToast(`${mcp.label} is already connected.`);
          refreshConfiguredKeys();
          refreshSpace();
          return;
        }
        if (result.status === 'needs-token') {
          showToast(result.message || `${mcp.label} needs a token, not a browser sign-in.`, 'warn');
          return;
        }
        if (result.status === 'needs-client') {
          showToast(
            result.message || `${mcp.label} needs its own OAuth App before it can be connected.`,
            'warn',
          );
          return;
        }
        if (result.status === 'failed') {
          showToast(result.error || `Could not start the connect flow for ${mcp.label}.`, 'warn');
          return;
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : `Failed to connect ${mcp.label}.`, 'warn');
        return;
      } finally {
        setConnectingMcpName(null);
      }

      if (!browserOpened && authorizationUrl) {
        if (isTauri()) {
          // The desktop webview refuses window.open for local URLs (no
          // new-window handler), so the consent page would never appear and
          // the user would be left stuck. Hand the flow to the OS browser,
          // which talks to the local server directly and completes the
          // callback there.
          void openExternalLink(authorizationUrl);
          showToast(`Opened your browser to connect ${mcp.label}.`, 'warn');
        } else {
          const popupWidth = 480;
          const popupHeight = 640;
          const left = Math.max(0, window.screenX + (window.outerWidth - popupWidth) / 2);
          const top = Math.max(0, window.screenY + (window.outerHeight - popupHeight) / 2);
          const win = window.open(
            authorizationUrl,
            `Connect_${mcp.name}`,
            `width=${popupWidth},height=${popupHeight},left=${left},top=${top}`,
          );
          // Popup blocked: fall back to a same-window navigation.
          if (!win) window.location.href = authorizationUrl;
          showToast(`Connect ${mcp.label} in the popup to unlock it.`, 'warn');
        }
      } else if (browserOpened) {
        showToast(`Opened your browser to connect ${mcp.label}.`, 'warn');
      }

      // The consent page runs in a browser we do not control, so window.opener
      // does not reach us. Poll the server until the credential lands, then
      // refresh the library state.
      if (mcpOAuthPollRef.current) clearInterval(mcpOAuthPollRef.current);
      const startedAt = Date.now();
      mcpOAuthPollRef.current = setInterval(async () => {
        if (Date.now() - startedAt > 120000) {
          if (mcpOAuthPollRef.current) clearInterval(mcpOAuthPollRef.current);
          mcpOAuthPollRef.current = null;
          return;
        }
        try {
          const r = await fetch(`/api/mcp/oauth/status/${encodeURIComponent(mcp.name)}`);
          const s = await r.json();
          if (s?.connected) {
            if (mcpOAuthPollRef.current) clearInterval(mcpOAuthPollRef.current);
            mcpOAuthPollRef.current = null;
            refreshConfiguredKeys();
            refreshSpace();
            showToast(`Connected ${mcp.label}.`);
          }
        } catch {
          /* transient; keep polling */
        }
      }, 1500);
    },
    [refreshConfiguredKeys, refreshSpace, showToast],
  );

  // ── Library: disconnect (revoke) a connected MCP ──────────────────────────
  const handleDisconnectKey = useCallback(
    async (mcp: StockMcp) => {
      try {
        const result = await McpService.disconnect(mcp.name);
        refreshConfiguredKeys();
        refreshSpace();
        showToast(result.message || `Disconnected ${mcp.label}.`, 'warn');
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : `Failed to disconnect ${mcp.label}.`,
          'warn',
        );
      }
    },
    [refreshConfiguredKeys, refreshSpace, showToast],
  );

  // Stop any in-flight OAuth status poll when the canvas unmounts.
  useEffect(() => {
    return () => {
      if (mcpOAuthPollRef.current) clearInterval(mcpOAuthPollRef.current);
      mcpOAuthPollRef.current = null;
    };
  }, []);

  // The OAuth page posts back on success; re-read stored keys when it does.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'MCP_OAUTH_SUCCESS') {
        refreshConfiguredKeys();
        refreshSpace();
        showToast(`Connected ${e.data.mcpName ?? 'MCP'}.`);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [refreshConfiguredKeys, refreshSpace, showToast]);

  const handleConnectMcpFromSpace = useCallback(
    (mcp: StockMcp, agentId?: string) => {
      if (mcp.authType === 'oauth' || mcp.url?.includes('oauth') || mcp.isMcpAi || mcp.url?.includes('mcp.ai')) {
        handleConnectKey(mcp);
      } else {
        setMcpModalAgentId(agentId || (agents[0]?.id ?? null));
        setMcpModalInitialName(mcp.name);
      }
    },
    [agents, handleConnectKey],
  );

  const handleRemoveMcpFromSpace = useCallback(
    async (mcpName: string, affectedAgentIds: string[]) => {
      try {
        await Promise.all(
          affectedAgentIds.map(async (agentId) => {
            const agent = agents.find((a) => a.id === agentId);
            const mcp = agent?.mcps?.find(
              (m) => m.mcp_name === mcpName || m.label === mcpName || m.mcp_name === `mcpai-${mcpName}`,
            );
            const mcpId = mcp?.id || mcpName;
            await AgentService.deleteMcp(agentId, mcpId).catch(() => {});
          }),
        );
        showToast(`Removed ${mcpName} from space.`);
        refreshSpace();
      } catch (err) {
        showToast(`Failed to remove ${mcpName}.`, 'warn');
      }
    },
    [agents, refreshSpace, showToast],
  );

  // ── Library: attach a dropped item to an agent node ──────────────────────
  const handleLibraryDrop = useCallback(
    async (agentId: string, payload: LibDragPayload) => {
      const agent = agents.find((a) => a.id === agentId);
      if (!agent) {
        showToast('Target agent not found on canvas.', 'warn');
        return;
      }
      const agentLabel = agent?.name ?? 'agent';

      try {
        if (payload.kind === 'mcp' && payload.mcp) {
          const { mcp } = payload;
          const resolved = resolveStockMcp(stockMcps, mcp.name) || mcp;
          const canonicalName = resolved.name;
          const already = agent?.mcps?.some((x) => {
            const attached = resolveStockMcp(stockMcps, x.mcp_name);
            return (attached?.name || x.mcp_name) === canonicalName;
          });
          if (already) {
            showToast(`${resolved.label} is already attached to ${agentLabel}.`, 'warn');
            return;
          }
          // allowUnconfigured so an unkeyed MCP still attaches in a locked state;
          // the run button stays disabled until its credentials are stored.
          await AgentService.addMcp(agentId, {
            mcp_name: canonicalName,
            label: resolved.label,
            config: { command: resolved.command, args: resolved.args, url: resolved.url, env: {} },
            allowUnconfigured: true,
          });
          const readiness = mcpReadiness[canonicalName] || mcpReadiness[mcp.name];
          const ready = readiness?.stock
            ? readiness.configured
            : resolved.envKeys.length === 0 || resolved.envKeys.every((k) => configuredKeys[k]);
          const needsOAuth =
            !ready && (readiness?.state === 'needs-oauth' || (resolved.authType === 'oauth' && !!resolved.url));
          showToast(
            ready
              ? `${resolved.label} attached to ${agentLabel} — ready to run.`
              : `${resolved.label} attached but needs ${needsOAuth ? 'OAuth authorization' : resolved.envKeys.join(', ')}.`,
            ready ? 'ok' : 'warn',
          );
        } else if (payload.kind === 'skill' && payload.skill) {
          const { skill } = payload;
          const already = agent?.skills?.some((x) => x.skill_name === skill.name);
          if (already) {
            showToast(`${skill.name} is already attached to ${agentLabel}.`, 'warn');
            return;
          }
          await AgentService.addSkill(agentId, {
            skill_name: skill.name,
            description: skill.description,
            content: skill.content,
          });
          showToast(`Skill ${skill.name} attached to ${agentLabel}.`);
        } else if (payload.kind === 'toolkit' && payload.toolkit) {
          const { toolkit } = payload;
          // `disabled_tools` is the deny-list, so unlocking a toolkit means
          // pruning its tools from that list (additive across multiple drops).
          let disabled: string[] = [];
          try {
            const parsed = JSON.parse(agent?.disabled_tools || '[]');
            if (Array.isArray(parsed)) disabled = parsed;
          } catch {
            disabled = [];
          }
          const next = disabled.filter((t) => !toolkit.tools.includes(t));
          const unlocked = disabled.length - next.length;
          await AgentService.updateAgentDisabledTools(agentId, next);
          showToast(
            unlocked > 0
              ? `Toolkit ${toolkit.name} unlocked ${unlocked} tool${unlocked === 1 ? '' : 's'} on ${agentLabel}.`
              : `${toolkit.name} — all its tools were already enabled on ${agentLabel}.`,
            unlocked > 0 ? 'ok' : 'warn',
          );
        } else if (payload.kind === 'personality' && payload.preset) {
          const { preset } = payload;
          let currentIds: string[] = [];
          try {
            const parsed = JSON.parse(agent?.personalities || '[]');
            if (Array.isArray(parsed)) currentIds = parsed;
          } catch {
            currentIds = [];
          }
          if (!currentIds.includes(preset.id)) currentIds.push(preset.id);

          if (preset.id.startsWith('custom-')) {
            const currentPrompt = agent?.system_prompt || '';
            const banner = `\n\n[Persona: ${preset.name}]\n${preset.directive}`;
            await AgentService.updateAgent(agentId, {
              system_prompt: currentPrompt.includes(preset.directive) ? currentPrompt : (currentPrompt + banner).trim(),
              personalities: JSON.stringify(currentIds),
            });
            showToast(`${preset.name} custom voice attached to ${agentLabel}.`, 'ok');
          } else {
            await AgentService.attachPersonality(agentId, preset.id);
            showToast(`${preset.name} voice set on ${agentLabel}.`, 'ok');
          }
        } else if (payload.kind === 'outputStyle' && payload.preset) {
          const { preset } = payload;
          let currentIds: string[] = [];
          try {
            const parsed = JSON.parse(agent?.output_styles || '[]');
            if (Array.isArray(parsed)) currentIds = parsed;
          } catch {
            currentIds = [];
          }
          if (!currentIds.includes(preset.id)) currentIds.push(preset.id);

          if (preset.id.startsWith('custom-')) {
            const currentPrompt = agent?.system_prompt || '';
            const banner = `\n\n[Output Format: ${preset.name}]\n${preset.directive}`;
            await AgentService.updateAgent(agentId, {
              system_prompt: currentPrompt.includes(preset.directive) ? currentPrompt : (currentPrompt + banner).trim(),
              output_styles: JSON.stringify(currentIds),
            });
            showToast(`${preset.name} custom output format attached to ${agentLabel}.`, 'ok');
          } else {
            await AgentService.attachOutputStyle(agentId, preset.id);
            showToast(`${preset.name} output format set on ${agentLabel}.`, 'ok');
          }
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to attach library item', 'warn');
      }
      await refreshSpace();
    },
    [agents, configuredKeys, mcpReadiness, refreshSpace, showToast, stockMcps],
  );

  const handleConnect = useCallback(
    async (connection: Connection) => {
      const { source, target, sourceHandle } = connection;
      if (!source || !target || source === target) return;

      // ── Zone-to-Zone hierarchy link ──────────────────────────────────────
      // When the user draws a line from the bottom handle (role-zone-child) of
      // one role zone to the top handle (role-zone-parent) of another, we
      // establish a parent→child delegation relationship between the two zones.
      const store = useSpaceStore.getState();
      const sourceZone = store.roleZones.find((z) => z.id === source);
      const targetZone = store.roleZones.find((z) => z.id === target);
      if (sourceZone && targetZone) {
        // Determine Senior (Manager / Superior) vs Junior (Direct Report / Subordinate):
        // 1. Vertical position on canvas: top is senior, below is junior.
        // 2. If vertically close (within 30px), lower level (L0 < L1) is senior.
        // 3. Handle guidance: role-zone-child on superior connects to role-zone-parent on subordinate.
        let senior = sourceZone;
        let junior = targetZone;

        const yDiff = sourceZone.y - targetZone.y;
        if (yDiff > 30) {
          // targetZone is distinctly higher (above) sourceZone
          senior = targetZone;
          junior = sourceZone;
        } else if (yDiff < -30) {
          // sourceZone is distinctly higher (above) targetZone
          senior = sourceZone;
          junior = targetZone;
        } else if (sourceZone.level !== targetZone.level) {
          // Lower level tier (e.g. L0 < L1) is senior
          if (sourceZone.level < targetZone.level) {
            senior = sourceZone;
            junior = targetZone;
          } else {
            senior = targetZone;
            junior = sourceZone;
          }
        } else if (sourceHandle === 'role-zone-parent' || connection.targetHandle === 'role-zone-child') {
          senior = targetZone;
          junior = sourceZone;
        }

        const parentId = senior.id;
        const childId = junior.id;

        // Prevent circular hierarchy loops
        let current: string | null = parentId;
        const visited = new Set<string>([childId]);
        let createsCycle = false;
        while (current) {
          if (visited.has(current)) {
            createsCycle = true;
            break;
          }
          visited.add(current);
          const pZone = store.roleZones.find((z) => z.id === current);
          current = pZone?.parentZoneId ?? null;
        }

        if (createsCycle) {
          showToast(`Cannot connect: "${senior.roleTitle}" is already a subordinate of "${junior.roleTitle}" (prevents cycle).`, 'warn');
          return;
        }

        if (junior.parentZoneId === parentId) {
          showToast(`"${junior.roleTitle}" already reports to "${senior.roleTitle}".`, 'warn');
          return;
        }

        const newLevel = Math.max(junior.level, senior.level + 1);
        store.updateRoleZone(childId, { parentZoneId: parentId, level: newLevel });
        showToast(
          `Connected: "${senior.roleTitle}" (Senior / Manager) ➔ "${junior.roleTitle}" (Junior / Direct Report).`,
          'ok',
        );
        return;
      }

      // ── Agent-to-Agent peer delegation link ─────────────────────────────
      const sourceAgent = agents.find((a) => a.id === source);
      const targetAgent = agents.find((a) => a.id === target);
      if (!sourceAgent || !targetAgent) return;

      const exists = connections.some(
        (c) =>
          (c.source_agent_id === source && c.target_agent_id === target) ||
          (c.source_agent_id === target && c.target_agent_id === source),
      );
      if (exists) {
        showToast(`Agents "${sourceAgent.name}" and "${targetAgent.name}" are already connected.`, 'warn');
        return;
      }

      try {
        const newConn = await AgentService.createConnection(source, target);
        setConnections((prev) => [...prev, newConn]);
        showToast(`Connected ${sourceAgent.name} ➔ ${targetAgent.name} for peer delegation.`, 'ok');
      } catch (err: any) {
        showToast(err.message || 'Failed to connect agents', 'warn');
      }
    },
    [agents, connections, showToast],
  );

  const handleInterconnectPeers = useCallback(
    async (agentIds: string[], roomName: string) => {
      if (agentIds.length < 2) return;
      try {
        const promises: Promise<any>[] = [];
        for (let i = 0; i < agentIds.length; i++) {
          for (let j = i + 1; j < agentIds.length; j++) {
            promises.push(AgentService.createConnection(agentIds[i], agentIds[j]));
          }
        }
        await Promise.all(promises);
        await refreshSpace();
        showToast(`⚡ All ${agentIds.length} agents in "${roomName}" are now interconnected peers!`, 'ok');
      } catch (err: any) {
        showToast(err.message || 'Failed to interconnect peers', 'warn');
      }
    },
    [refreshSpace, showToast],
  );

  /**
   * Intelligently aligns and auto-fits all member agents neatly inside a group workspace room.
   * Dynamic sizing ensures that all agents fit within the room's bounds without overflowing.
   * Any agent that is deployed/assigned inside a zone (such as a hierarchical RoleZone) is strictly skipped and its position preserved.
   */
  const _handleAlignZoneMembers = useCallback((zoneId: string, silent?: boolean) => {
    const currentZones = useSpaceStore.getState().workspaceZones;
    const currentAgents = useSpaceStore.getState().agents;
    const currentNodes = useSpaceStore.getState().nodes;
    const currentRoleZones = useSpaceStore.getState().roleZones;

    const targetZone = currentZones.find((z) => z.id === zoneId);
    if (!targetZone) return;

    // Discover member agents inside this zone using current visual or state positions
    const prevMap = new Map(currentNodes.map((n) => [n.id, n]));
    const members = currentAgents.filter((a) => {
      const aPos = prevMap.get(a.id)?.position || { x: a.pos_x, y: a.pos_y };
      return isAgentInZone(aPos.x, aPos.y, targetZone.x, targetZone.y, targetZone.width, targetZone.height);
    });

    if (members.length === 0) {
      if (!silent) showToast(`No agents currently inside "${targetZone.name}".`, 'warn');
      return;
    }

    const isAgentInRoleZone = (aPos: { x: number; y: number }): boolean => {
      if (resolveZoneAt(aPos.x, aPos.y, currentRoleZones) !== null) return true;
      return currentRoleZones.some((rz) =>
        isAgentInZone(aPos.x, aPos.y, rz.x, rz.y, rz.width, rz.height),
      );
    };

    // Any agent that is inside a zone MUST NOT be arranged — skip it!
    const arrangeableMembers = members.filter((a) => {
      const aPos = prevMap.get(a.id)?.position || { x: a.pos_x, y: a.pos_y };
      return !isAgentInRoleZone(aPos);
    });

    if (arrangeableMembers.length === 0) {
      if (!silent) {
        showToast(
          `All agents inside "${targetZone.name}" are deployed in zones and were preserved.`,
          'ok',
        );
      }
      return;
    }

    const { cols, slotW, slotH, cardWidth, cardHeight } = getZoneGridMetrics(
      targetZone.width,
      targetZone.height,
      arrangeableMembers.length,
    );

    // Sort arrangeable members geographically (top-to-bottom, left-to-right) based on current positions
    arrangeableMembers.sort((a, b) => {
      const posA = prevMap.get(a.id)?.position || { x: a.pos_x, y: a.pos_y };
      const posB = prevMap.get(b.id)?.position || { x: b.pos_x, y: b.pos_y };
      const rowA = Math.round((posA.y - targetZone.y) / Math.max(1, slotH));
      const rowB = Math.round((posB.y - targetZone.y) / Math.max(1, slotH));
      if (rowA !== rowB) return rowA - rowB;
      return posA.x - posB.x;
    });

    // Determine safe top offset avoiding any role zones located inside this workspace room
    const roleZonesInRoom = currentRoleZones.filter(
      (rz) =>
        rz.spaceId === targetZone.id ||
        isAgentInZone(rz.x + rz.width / 2, rz.y + rz.height / 2, targetZone.x, targetZone.y, targetZone.width, targetZone.height),
    );
    let startY = targetZone.y + 68;
    for (const rz of roleZonesInRoom) {
      if (rz.y + rz.height + 24 < targetZone.y + targetZone.height) {
        startY = Math.max(startY, rz.y + rz.height + 24);
      }
    }
    const LEFT_PAD = 24;

    arrangeableMembers.forEach((agent, idx) => {
      const c = idx % cols;
      const r = Math.floor(idx / cols);
      const targetX = Math.round(targetZone.x + LEFT_PAD + c * slotW + (slotW - cardWidth) / 2);
      const targetY = Math.round(startY + r * slotH + (slotH - cardHeight) / 2);

      updateNodePositionLocally(agent.id, targetX, targetY);
      SpaceService.updateNodePosition(agent.id, targetX, targetY);
    });

    if (!silent) {
      showToast(
        `⚡ Fitted & aligned ${arrangeableMembers.length} unassigned agent${arrangeableMembers.length === 1 ? '' : 's'} inside "${targetZone.name}".`,
        'ok',
      );
    }
  }, [showToast, updateNodePositionLocally]);

  /** Fit agents neatly inside a designation zone without moving them out, auto-resizing zone if needed. */
  const alignRoleZoneMembers = useCallback((zoneId: string, silent = false) => {
    const store = useSpaceStore.getState();
    const zone = store.roleZones.find((z) => z.id === zoneId);
    if (!zone) return;
    const nodeMap = new Map(store.nodes.map((node) => [node.id, node]));
    const members = store.agents.filter((agent) => {
      const pos = nodeMap.get(agent.id)?.position || { x: agent.pos_x, y: agent.pos_y };
      return isAgentInZone(pos.x, pos.y, zone.x, zone.y, zone.width, zone.height);
    });
    if (members.length === 0) {
      if (!silent) showToast(`No agents inside "${zone.roleTitle}".`, 'warn');
      return;
    }

    // Dynamic auto-expansion: Ensure zone width and height accommodate all members
    const requiredDim = getZoneSizeForAgents(members.length);
    let zoneW = Math.max(zone.width, requiredDim.width);
    let zoneH = Math.max(zone.height, requiredDim.height);

    if (zoneW > zone.width || zoneH > zone.height) {
      store.updateRoleZone(zone.id, { width: zoneW, height: zoneH });

      // If zone belongs to an outer office space, expand the space as well
      const parentSpace = store.workspaceZones.find(
        (sp) => sp.id === zone.spaceId || isAgentInZone(zone.x, zone.y, sp.x, sp.y, sp.width, sp.height),
      );
      if (parentSpace) {
        const spaceMinW = Math.max(parentSpace.width, zone.x + zoneW - parentSpace.x + 80);
        const spaceMinH = Math.max(parentSpace.height, zone.y + zoneH - parentSpace.y + 80);
        if (spaceMinW > parentSpace.width || spaceMinH > parentSpace.height) {
          store.updateWorkspaceZone(parentSpace.id, { width: spaceMinW, height: spaceMinH });
        }
      }
    }

    const { cols, slotW, slotH, cardWidth, cardHeight } = getZoneGridMetrics(
      zoneW,
      zoneH,
      members.length,
    );
    const leftPad = 12;
    const topOffset = 44;
    members.forEach((agent, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = Math.round(zone.x + leftPad + col * slotW + (slotW - cardWidth) / 2);
      const y = Math.round(zone.y + topOffset + row * slotH + (slotH - cardHeight) / 2);
      updateNodePositionLocally(agent.id, x, y);
      void SpaceService.updateNodePosition(agent.id, x, y);
    });
    if (!silent) {
      showToast(`Aligned ${members.length} agent${members.length === 1 ? '' : 's'} in ${zone.roleTitle}.`, 'ok');
    }
  }, [showToast, updateNodePositionLocally]);

  // ── Auto-Connect Pod Members ────────────────────────────────────────────────
  // Whenever 2 or more agents are in the same office space, automatically link
  // them as peers without requiring any manual button click by the user.
  useEffect(() => {
    if (!agents.length || !workspaceZones.length) return;

    const missingPairs: Array<[string, string]> = [];
    const connectedSet = new Set<string>();
    for (const c of connections) {
      connectedSet.add(`${c.source_agent_id}->${c.target_agent_id}`);
      connectedSet.add(`${c.target_agent_id}->${c.source_agent_id}`);
    }

    for (const z of workspaceZones) {
      // In hierarchical company spaces with role zones, do NOT create an all-to-all
      // mesh across all agents, as that creates an unreadable spiderweb over the org hierarchy.
      const hasRoleZones = roleZones.some(
        (rz) => rz.spaceId === z.id || isAgentInZone(rz.x + rz.width / 2, rz.y + rz.height / 2, z.x, z.y, z.width, z.height),
      );
      if (hasRoleZones) continue;

      const memberAgents = agents.filter((a) =>
        isAgentInZone(a.pos_x, a.pos_y, z.x, z.y, z.width, z.height),
      );
      if (memberAgents.length >= 2) {
        for (let i = 0; i < memberAgents.length; i++) {
          for (let j = i + 1; j < memberAgents.length; j++) {
            const pairKey = `${memberAgents[i].id}->${memberAgents[j].id}`;
            if (!connectedSet.has(pairKey)) {
              missingPairs.push([memberAgents[i].id, memberAgents[j].id]);
              connectedSet.add(pairKey);
              connectedSet.add(`${memberAgents[j].id}->${memberAgents[i].id}`);
            }
          }
        }
      }
    }

    // Hierarchical designation zones: peers inside a zone and every parent/child
    // reporting line are wired so `delegate_task` can actually reach the manager.
    const membersByRoleZone = new Map<string, string[]>();
    for (const agent of agents) {
      const zone = resolveZoneAt(agent.pos_x, agent.pos_y, roleZones);
      if (!zone) continue;
      const list = membersByRoleZone.get(zone.id) ?? [];
      list.push(agent.id);
      membersByRoleZone.set(zone.id, list);
    }
    const connectGroup = (group: string[]) => {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const pairKey = `${group[i]}->${group[j]}`;
          if (!connectedSet.has(pairKey)) {
            missingPairs.push([group[i], group[j]]);
            connectedSet.add(pairKey);
            connectedSet.add(`${group[j]}->${group[i]}`);
          }
        }
      }
    };
    for (const memberIds of membersByRoleZone.values()) connectGroup(memberIds);
    for (const zone of roleZones) {
      const childMembers = membersByRoleZone.get(zone.id) ?? [];
      if (childMembers.length === 0) continue;
      if (zone.parentZoneId) {
        connectGroup([...(membersByRoleZone.get(zone.parentZoneId) ?? []), ...childMembers]);
      }
      const siblingIds = roleZones
        .filter((candidate) => candidate.id !== zone.id && candidate.parentZoneId === zone.parentZoneId)
        .flatMap((candidate) => membersByRoleZone.get(candidate.id) ?? []);
      if (siblingIds.length > 0) connectGroup([...siblingIds, ...childMembers]);
    }

    if (missingPairs.length > 0) {
      let isMounted = true;
      (async () => {
        try {
          await Promise.all(
            missingPairs.map(([src, tgt]) =>
              AgentService.createConnection(src, tgt).catch(() => null),
            ),
          );
          if (isMounted) {
            const updated = await AgentService.fetchConnections();
            setConnections(updated);
          }
        } catch {}
      })();
      return () => {
        isMounted = false;
      };
    }
  }, [agents, workspaceZones, roleZones, connections]);

  /**
   * Turn a stored JSON-array column of preset ids into the preset objects the
   * node renders. Ids the catalogue no longer knows are skipped rather than
   * rendered as a bare id.
   */
  const resolvePresets = React.useCallback(
    (raw: string | null | undefined, catalogue: PromptPreset[]): PromptPreset[] => {
      if (!raw) return [];
      try {
        const ids = JSON.parse(raw);
        if (!Array.isArray(ids)) return [];
        const byId = new Map(catalogue.map((p) => [p.id, p]));
        return ids.map((id) => byId.get(id)).filter((p): p is PromptPreset => Boolean(p));
      } catch {
        return [];
      }
    },
    [],
  );

  // 3. Map Agents & Running Threads into ReactFlow Nodes & Edges
  useEffect(() => {
    const nextEdges: CanvasEdge[] = [];
    const threadNodes: CanvasNode[] = [];
    const assetsNodes: CanvasNode[] = [];
    const agentAssignedZoneMap = new Map<string, string>();
    const prevNodeMap = new Map(useSpaceStore.getState().nodes.map((node) => [node.id, node]));
    const agentById = new Map(agents.map((agent) => [agent.id, agent]));
    const workspaceZoneById = new Map(workspaceZones.map((zone) => [zone.id, zone]));
    const roleZoneById = new Map(roleZones.map((zone) => [zone.id, zone]));
    const roleZoneCountBySpace = new Map<string, number>();
    for (const zone of roleZones) {
      if (!zone.spaceId) continue;
      roleZoneCountBySpace.set(zone.spaceId, (roleZoneCountBySpace.get(zone.spaceId) ?? 0) + 1);
    }
    const connectionByPair = new Map<string, AgentConnectionRecord>();
    for (const connection of connections) {
      const forward = `${connection.source_agent_id}|${connection.target_agent_id}`;
      const reverse = `${connection.target_agent_id}|${connection.source_agent_id}`;
      if (!connectionByPair.has(forward)) connectionByPair.set(forward, connection);
      if (!connectionByPair.has(reverse)) connectionByPair.set(reverse, connection);
    }

    // Pre-calculate zone memberships for responsive pod density & dynamic scaling
    const zoneAgentListMap = new Map<string, SpaceAgentEntity[]>();
    for (const z of workspaceZones) {
      zoneAgentListMap.set(z.id, []);
    }
    const agentToZoneMap = new Map<string, GroupWorkspaceZone>();
    const roleZoneAgentListMap = new Map<string, SpaceAgentEntity[]>();
    for (const z of roleZones) roleZoneAgentListMap.set(z.id, []);
    const agentToRoleZoneMap = new Map<string, RoleZone>();
    for (const a of agents) {
      const existingNode = prevNodeMap.get(a.id);
      const pos = existingNode?.position || { x: a.pos_x, y: a.pos_y };
      const matchedZone = workspaceZones.find((z) =>
        isAgentInZone(pos.x, pos.y, z.x, z.y, z.width, z.height),
      );
      if (matchedZone) {
        agentToZoneMap.set(a.id, matchedZone);
        zoneAgentListMap.get(matchedZone.id)?.push(a);
        agentAssignedZoneMap.set(a.id, matchedZone.id);
      }
      const matchedRoleZone = resolveZoneAt(pos.x, pos.y, roleZones);
      if (matchedRoleZone) {
        agentToRoleZoneMap.set(a.id, matchedRoleZone);
        roleZoneAgentListMap.get(matchedRoleZone.id)?.push(a);
      }
    }

    // Map Agents
    const agentNodes: CanvasNode[] = agents.map((agent) => {
      const existingNode = prevNodeMap.get(agent.id);
      const position = existingNode?.position ? { ...existingNode.position } : { x: agent.pos_x, y: agent.pos_y };
      const activeRuns = activeRunsMap[agent.id] || [];

      // Determine pod zone membership and dynamic fitting metrics for this agent
      const assignedZone = agentToZoneMap.get(agent.id);
      const isPodMember = Boolean(assignedZone);
      const zoneMembers = assignedZone ? (zoneAgentListMap.get(assignedZone.id) || []) : [];
      const memberCount = zoneMembers.length;
      const _metrics = assignedZone
        ? getZoneGridMetrics(assignedZone.width, assignedZone.height, memberCount)
        : null;

      // Determine running threads for this agent
      const isRunning = agent.status === 'running';
      const showThreads = visibleAgentThreads[agent.id] !== false;
      const showAssets = visibleAssetsThreads[agent.id] !== false;
      const unreadAssetsCount = agentUnreadAssetsCounts[agent.id] ?? 0;

      const threadList: Array<{
        id: string;
        triggerType: 'cron' | 'manual' | 'chat';
        status: 'running' | 'completed' | 'failed';
        startedAt: string;
        completedAt?: string | null;
        taskPrompt?: string;
        summary?: string | null;
        error?: string | null;
      }> = [];

      if (activeRuns.length > 0) {
        for (const ar of activeRuns) {
          threadList.push({
            id: ar.runId,
            triggerType: ar.triggerType,
            status: (ar.status as any) || 'running',
            startedAt: ar.startedAt,
            taskPrompt: ar.taskPrompt,
            summary: ar.accumulatedText,
          });
        }
      } else if (isRunning) {
        // Fallback for instant UI responsiveness when agent just started running
        const runId = agent.latestRun?.id || `active_${agent.id}`;
        threadList.push({
          id: runId,
          triggerType: agent.cron_enabled ? 'cron' : 'manual',
          status: 'running',
          startedAt: agent.latestRun?.started_at || new Date().toISOString(),
          taskPrompt: agent.latestRun?.task_prompt || agent.system_prompt,
          summary: agent.latestRun?.summary,
        });
      } else if (showThreads && agent.latestRun) {
        // Show recent completed thread for all agents (including pod members)
        threadList.push({
          id: agent.latestRun.id,
          triggerType: (agent.latestRun.trigger_type as any) || (agent.cron_enabled ? 'cron' : 'manual'),
          status: (agent.latestRun.status as any) || 'completed',
          startedAt: agent.latestRun.started_at,
          completedAt: agent.latestRun.completed_at,
          taskPrompt: agent.latestRun.task_prompt || undefined,
          summary: agent.latestRun.summary,
          error: agent.latestRun.error,
        });
      }

      const isPodCardExpanded = Boolean(podCardExpandedAgents[agent.id]);
      const isCompactAvatar = isPodMember && !isPodCardExpanded;
      const hasSkills = Boolean(agent.skills && agent.skills.length > 0);
      const cardRightBoundary = position.x + (hasSkills ? 680 : 490);

      // Generate Thread Nodes & Edges
      threadList.forEach((th, thIdx) => {
        // Adaptive positioning: compact avatar mode uses close-in satellite; full card mode positions cleanly past the card + skills
        const defaultThreadX = isCompactAvatar ? position.x + 250 : cardRightBoundary + 40;
        const defaultThreadY = isCompactAvatar ? position.y - 70 - (thIdx * 120) : position.y - 40 - (thIdx * 160);
        const savedPos = threadPositions[th.id];
        const initialThreadPos = savedPos ? { x: savedPos.x, y: savedPos.y } : { x: defaultThreadX, y: defaultThreadY };

        // Collision prevention: Never allow thread beacon to overlap card or skill chips in card mode
        if (!isCompactAvatar && initialThreadPos.x < cardRightBoundary + 20) {
          initialThreadPos.x = cardRightBoundary + 40;
        }

        threadNodes.push({
          id: `thread-${th.id}`,
          type: 'threadProcess',
          dragHandle: '.thread-drag-handle, .thread-minimal-topbar, .thread-process-beacon-dot',
          position: initialThreadPos,
          data: {
            runId: th.id,
            agentId: agent.id,
            agentName: agent.name,
            triggerType: th.triggerType,
            status: th.status,
            startedAt: th.startedAt,
            completedAt: th.completedAt,
            taskPrompt: th.taskPrompt,
            summary: th.summary,
            error: th.error,
            isExpanded: Boolean(expandedThreads[th.id]),
            onToggleExpand: (rId: string) => toggleThreadExpanded(rId),
            onClose: () => toggleAgentThreadsVisible(agent.id),
            onOpenDrawer: (aId: string) => {
              const target = agents.find((ag) => ag.id === aId);
              if (target) handleOpenDrawer(target);
            },
            onStopRun: (aId: string) => handleStopAgent(aId),
          },
        });

        nextEdges.push({
          id: `edge-${agent.id}-${th.id}`,
          source: agent.id,
          sourceHandle: 'thread-source',
          target: `thread-${th.id}`,
          targetHandle: 'thread-target',
          type: 'threadEdge',
          zIndex: CONNECTOR_EDGE_Z,
          animated: th.status === 'running',
          data: {
            status: th.status,
            triggerType: th.triggerType,
            isExpanded: Boolean(expandedThreads[th.id]),
            onEdgeClick: () => toggleThreadExpanded(th.id),
          },
        });
      });

      // Generate Deliverables / Assets Review Thread Node & Edge
      const shouldShowAssets = showAssets;
      if (shouldShowAssets) {
        const defaultAssetsX = isCompactAvatar ? position.x + 250 : cardRightBoundary + 40;
        const defaultAssetsY = isCompactAvatar ? position.y + 70 : position.y + 90;
        const savedAssetsPos = assetsPositions[agent.id];
        const initialAssetsPos = savedAssetsPos ? { x: savedAssetsPos.x, y: savedAssetsPos.y } : { x: defaultAssetsX, y: defaultAssetsY };

        // Collision prevention: Never allow Assets Queue to overlap the card or its skill chips!
        if (!isCompactAvatar && initialAssetsPos.x < cardRightBoundary + 20) {
          initialAssetsPos.x = cardRightBoundary + 40;
        }

        assetsNodes.push({
          id: `assets-${agent.id}`,
          type: 'agentAssets',
          dragHandle: '.thread-drag-handle, .thread-minimal-topbar, .thread-process-beacon-dot',
          position: initialAssetsPos,
          data: {
            agentId: agent.id,
            agentName: agent.name,
            isExpanded: Boolean(expandedAssetsThreads[agent.id]),
            onToggleExpand: (aId: string) => toggleAssetsThreadExpanded(aId),
            onClose: (aId: string) => toggleAssetsThreadVisible(aId),
            onOpenDrawer: (aId: string) => {
              const target = agents.find((ag) => ag.id === aId);
              if (target) handleOpenDrawer(target);
            },
          },
        });

        nextEdges.push({
          id: `edge-${agent.id}-assets`,
          source: agent.id,
          sourceHandle: 'assets-source',
          target: `assets-${agent.id}`,
          targetHandle: 'assets-target',
          type: 'assetsEdge',
          zIndex: CONNECTOR_EDGE_Z,
          data: {
            unreadCount: unreadAssetsCount,
            totalCount: unreadAssetsCount,
            isExpanded: Boolean(expandedAssetsThreads[agent.id]),
            onEdgeClick: () => toggleAssetsThreadExpanded(agent.id),
          },
        });
      }

      return {
        id: agent.id,
        type: 'crabAgent' as const,
        position,
        zIndex: AGENT_NODE_Z,
        data: {
          ...agent,
          inWorkspaceZone: isPodMember,
          workspaceZoneId: assignedZone?.id,
          workspaceZoneColor: assignedZone?.color,
          workspaceZoneName: assignedZone?.name,
          workspaceZoneWidth: assignedZone?.width,
          workspaceZoneHeight: assignedZone?.height,
          roleZoneId: agentToRoleZoneMap.get(agent.id)?.id,
          roleZoneName: agentToRoleZoneMap.get(agent.id)?.name,
          roleZoneRole: agentToRoleZoneMap.get(agent.id)?.roleTitle,
          roleZoneLevel: agentToRoleZoneMap.get(agent.id)?.level,
          roleZoneColor: agentToRoleZoneMap.get(agent.id)?.color,
          roleZoneSpaceId: agentToRoleZoneMap.get(agent.id)?.spaceId ?? null,
          podMemberCount: memberCount,
          podDensity: (_metrics as any)?.density || 'standard',
          podScale: (_metrics as any)?.scale || 1.0,
          podAvatarSize: (_metrics as any)?.avatarSize || 72,
          podCardWidth: (_metrics as any)?.cardWidth || 220,
          podCardHeight: (_metrics as any)?.cardHeight || 180,
          activeThreadsCount: threadList.length,
          onToggleThreads: handleToggleAgentThreads,
          unreadAssetsCount,
          onToggleAssets: (aId: string) => toggleAssetsThreadVisible(aId),
          personalityItems: resolvePresets(agent.personalities, allPersonalities),
          outputStyleItems: resolvePresets(agent.output_styles, allOutputStyles),
          onRun: handleRunAgent,
          onStop: handleStopAgent,
          onEdit: handleEditAgent,
          onDelete: handleDeleteAgent,
          onOpenDrawer: handleOpenDrawer,
          onAddMcp: handleAddMcp,
          onDeleteMcp: handleDeleteMcp,
          onAddSkill: handleAddSkill,
          onDeleteSkill: handleDeleteSkill,
          onOpenTools: handleOpenTools,
          onOpenPolicies: handleOpenPolicies,
          onVoiceSend: handleVoiceSend,
          onVoiceToggle: handleVoiceToggle,
          onVoiceClose: handleVoiceClose,
          activeVoiceAgentId,
          onLibraryDrop: handleLibraryDrop,
        },
      };
    });

    // ONLY render peer edges when there is an active delegation / communication between the agents!
    // No idle lines between agents when they are not running or sharing active delegated sessions.
    for (const del of activeDelegations) {
      const sourceAgent = agentById.get(del.sourceAgentId);
      const targetAgent = agentById.get(del.targetAgentId);
      if (sourceAgent && targetAgent) {
        let targetHandle = 'peer-target';
        const dy = targetAgent.pos_y - sourceAgent.pos_y;
        const dx = targetAgent.pos_x - sourceAgent.pos_x;
        if (dy > 80) {
          targetHandle = 'peer-target-top';
        } else if (Math.abs(dy) <= 140) {
          if (dx > 160) {
            targetHandle = 'peer-target-left';
          } else if (dx < -160) {
            targetHandle = 'peer-target-right';
          }
        }

        const srcZoneId = agentAssignedZoneMap.get(del.sourceAgentId);
        const tgtZoneId = agentAssignedZoneMap.get(del.targetAgentId);
        const isInSamePod = Boolean(srcZoneId && srcZoneId === tgtZoneId);
        const commonZone = isInSamePod && srcZoneId ? workspaceZoneById.get(srcZoneId) : undefined;

        const conn = connectionByPair.get(`${del.sourceAgentId}|${del.targetAgentId}`);

        nextEdges.push({
          id: `active-del-${del.id}`,
          source: del.sourceAgentId,
          sourceHandle: 'peer-source',
          target: del.targetAgentId,
          targetHandle,
          type: 'peerEdge',
          zIndex: PEER_EDGE_Z + 25,
          animated: true,
          className: 'is-calling active-delegation-edge',
          data: {
            connectionId: conn?.id,
            sourceAgentId: del.sourceAgentId,
            targetAgentId: del.targetAgentId,
            sourceAgentName: sourceAgent.name,
            targetAgentName: targetAgent.name,
            targetRole: targetAgent.role || undefined,
            targetSpecialty: targetAgent.specialty || undefined,
            isInPod: false,
            isActivelyCalling: true,
            activeTaskTitle: del.taskTitle,
            podName: commonZone?.name,
            podColor: commonZone?.color,
          },
        });
      }
    }

    // Hierarchical designation edges between role zones
    for (const zone of roleZones) {
      if (!zone.parentZoneId) continue;
      const parent = roleZoneById.get(zone.parentZoneId);
      if (!parent) continue;
      nextEdges.push({
        id: `role-hierarchy-${zone.id}`,
        source: parent.id,
        sourceHandle: 'role-zone-child',
        target: zone.id,
        targetHandle: 'role-zone-parent',
        type: 'hierarchyEdge',
        zIndex: HIERARCHY_EDGE_Z,
        selectable: true,
        data: {
          label: `${zone.roleTitle} reports to ${parent.roleTitle}`,
          color: zone.color,
          level: zone.level,
        },
      });
    }

    setNodes((prevNodes) => {
      const prevMap = new Map<string, CanvasNode>();
      for (const pn of prevNodes) {
        prevMap.set(pn.id, pn);
      }

      // Reconcile agent nodes to preserve current canvas position and React Flow internals
      const reconciledAgentNodes = agentNodes.map((an) => {
        const prev = prevMap.get(an.id);
        const isSelected = Boolean((prev as any)?.selected);
        return {
          ...prev,
          ...an,
          position: prev?.position ? { ...prev.position } : an.position,
          zIndex: isSelected ? AGENT_ACTIVE_Z : (an.zIndex ?? AGENT_NODE_Z),
        };
      });

      // Reconcile thread nodes to preserve current canvas position if dragged or moved
      const reconciledThreadNodes = threadNodes.map((tn) => {
        const prev = prevMap.get(tn.id);
        const saved = threadPositions[(tn.data as any).runId as string];
        const finalPosition = saved || prev?.position || tn.position;
        return {
          ...prev,
          ...tn,
          position: finalPosition,
          zIndex: THREAD_NODE_Z,
        };
      });

      // Reconcile assets nodes to preserve current canvas position if dragged or moved
      const reconciledAssetsNodes = assetsNodes.map((an) => {
        const prev = prevMap.get(an.id);
        const saved = assetsPositions[(an.data as any).agentId as string];
        const finalPosition = saved || prev?.position || an.position;
        return {
          ...prev,
          ...an,
          position: finalPosition,
          zIndex: THREAD_NODE_Z,
        };
      });

      // Generate and reconcile workspace zone room nodes (rendered with zIndex: -1 behind agents)
      const zoneNodes: CanvasNode[] = workspaceZones.map((z) => {
        const prev = prevMap.get(z.id);
        // Follow the authoritative room geometry unless this node is the one the
        // user is currently dragging locally. Without this, a room moved in
        // another browser keeps rendering at its stale node position.
        const isDraggingThisNode = prev?.dragging === true;
        const finalPosition = isDraggingThisNode && prev ? { ...prev.position } : { x: z.x, y: z.y };
        const curX = finalPosition.x;
        const curY = finalPosition.y;

        // An agent belongs to this room if its card is inside or substantially overlapping
        const memberAgents = agents.filter((a) => {
          const aPos = prevMap.get(a.id)?.position || { x: a.pos_x, y: a.pos_y };
          return isAgentInZone(aPos.x, aPos.y, curX, curY, z.width, z.height);
        });

        return {
          id: z.id,
          type: 'groupWorkspace',
          dragHandle: '.group-workspace-drag-handle',
          position: finalPosition,
          style: {
            width: z.width,
            height: z.height,
          },
          zIndex: WORKSPACE_ZONE_Z,
          draggable: true,
          selectable: true,
          data: {
            id: z.id,
            name: z.name,
            description: z.description,
            width: z.width,
            height: z.height,
            color: z.color,
            shape: z.shape,
            memberAgents,
            workspaceZoneCount: roleZoneCountBySpace.get(z.id) ?? 0,
            isWorkspaceOpen: activeWorkspaceSpaceId === z.id,
            stockMcps,
            mcpReadiness,
            configuredKeys,
            connectingMcpName,
            onConnectMcp: handleConnectMcpFromSpace,
            onRemoveMcp: handleRemoveMcpFromSpace,
            onOpenWorkspace: handleOpenWorkspace,
            onUpdateZone: updateWorkspaceZone,
            onRemoveZone: handleRemoveWorkspace,
            onAlignZoneMembers: _handleAlignZoneMembers,
            onInterconnectPeers: handleInterconnectPeers,
            onOpenDrawer: handleOpenDrawer,
            onRunAgent: handleRunAgent,
            onEditAgent: handleEditAgent,
          },
        };
      });

      const roleZoneNodes: CanvasNode[] = roleZones.map((zone) => {
        const prev = prevMap.get(zone.id);
        const members = roleZoneAgentListMap.get(zone.id) ?? [];
        const isDraggingThisNode = prev?.dragging === true;
        return {
          id: zone.id,
          type: 'roleZone',
          dragHandle: '.role-zone-drag-surface',
          position:
            isDraggingThisNode && prev
              ? { ...prev.position }
              : { x: zone.x, y: zone.y },
          style: { width: zone.width, height: zone.height },
          zIndex: ROLE_ZONE_Z,
          draggable: true,
          selectable: true,
          data: {
            id: zone.id,
            name: zone.name,
            description: zone.description,
            roleTitle: zone.roleTitle,
            level: zone.level,
            parentZoneId: zone.parentZoneId ?? null,
            spaceId: zone.spaceId ?? null,
            color: zone.color,
            shape: zone.shape,
            width: zone.width,
            height: zone.height,
            memberCount: members.length,
            memberNames: members.map((member) => member.name),
            onEditZone: (id: string) => {
              const target = useSpaceStore.getState().roleZones.find((candidate) => candidate.id === id);
              if (target) openRoleZoneBuilder(target);
            },
            onRemoveZone: handleRemoveRoleZone,
            onResizeZone: (id: string, width: number, height: number, x: number, y: number) => {
              const target = useSpaceStore.getState().roleZones.find((candidate) => candidate.id === id);
              const space = target?.spaceId
                ? useSpaceStore.getState().workspaceZones.find((candidate) => candidate.id === target.spaceId)
                : undefined;
              let nextX = x;
              let nextY = y;
              if (space) {
                nextX = Math.min(Math.max(x, space.x + 8), space.x + space.width - width - 8);
                nextY = Math.min(Math.max(y, space.y + 8), space.y + space.height - height - 8);
              }
              updateRoleZone(id, {
                width,
                height,
                x: Math.round(nextX),
                y: Math.round(nextY),
              });
            },
          },
        };
      });

      const workspacePanelNodes: CanvasNode[] = [];
      const activeSpace = activeWorkspaceSpaceId
        ? workspaceZones.find((space) => space.id === activeWorkspaceSpaceId)
        : undefined;
      if (activeSpace) {
        const panelId = `workspace-panel-${activeSpace.id}`;
        const prevPanel = prevMap.get(panelId);
        const panelWidth = Math.max(340, Math.min(440, activeSpace.width - 32));
        const panelHeight = Math.max(260, Math.min(680, activeSpace.height - 32));

        // Position on the outer right side of the space with 24px gap so it doesn't cover agents
        const defaultOuterX = activeSpace.x + activeSpace.width + 24;
        const defaultOuterY = activeSpace.y;
        const prevPos = prevPanel?.position ?? panelPositions[activeSpace.id];
        const panelPosition = prevPos || { x: defaultOuterX, y: defaultOuterY };

        workspacePanelNodes.push({
          id: panelId,
          type: 'workspacePanel',
          position: panelPosition,
          style: { width: panelWidth, height: panelHeight },
          dragHandle: '.workspace-panel-header',
          zIndex: 35,
          draggable: true,
          selectable: true,
          deletable: false,
          connectable: false,
          data: {
            space: activeSpace,
            agents: workspacePanelAgents,
            zones: workspacePanelZones,
            onClose: handleCloseWorkspace,
            onCreateZone: () => openRoleZoneBuilder(),
            onEditZone: (zone) => openRoleZoneBuilder(zone),
            onRemoveZone: handleRemoveRoleZone,
            onFocusZone: handleFocusRoleZone,
            onOpenAgent: handleOpenDrawer,
            onSaveWorkflowPrompt: (spaceId, prompt) =>
              updateWorkspaceZone(spaceId, { workflowPrompt: prompt }),
          },
        });
      }

      // Animated shimmer skeleton cards for agents currently being deployed/provisioned
      const skeletonNodes: CanvasNode[] = deployingAgents.map((da) => ({
        id: da.tempId,
        type: 'agentSkeleton' as const,
        position: { x: da.x, y: da.y },
        draggable: false,
        selectable: false,
        deletable: false,
        connectable: false,
        zIndex: AGENT_NODE_Z,
        data: {
          name: da.name,
          role: da.role,
          provider: da.provider,
          model: da.model,
          isAvatar: da.isAvatar,
          zoneColor: da.zoneColor,
          phase: da.phase,
        },
      }));

      return [
        ...zoneNodes,
        ...workspacePanelNodes,
        ...roleZoneNodes,
        ...skeletonNodes,
        ...reconciledAgentNodes,
        ...reconciledThreadNodes,
        ...reconciledAssetsNodes,
      ];
    });
    setEdges(nextEdges);
  }, [
    agents,
    connections,
    activeRunsMap,
    activeDelegations,
    expandedThreads,
    visibleAgentThreads,
    expandedAssetsThreads,
    visibleAssetsThreads,
    assetsPositions,
    agentUnreadAssetsCounts,
    workspaceZones,
    roleZones,
    workspacePanelAgents,
    workspacePanelZones,
    activeWorkspaceSpaceId,
    handleOpenWorkspace,
    handleCloseWorkspace,
    handleFocusRoleZone,
    handleRemoveWorkspace,
    updateWorkspaceZone,
    removeWorkspaceZone,
    updateRoleZone,
    openRoleZoneBuilder,
    handleRemoveRoleZone,
    _handleAlignZoneMembers,
    handleInterconnectPeers,
    handleRunAgent,
    handleStopAgent,
    handleEditAgent,
    handleDeleteAgent,
    handleOpenDrawer,
    handleVoiceSend,
    handleVoiceToggle,
    handleVoiceClose,
    handleToggleAgentThreads,
    activeVoiceAgentId,
    allPersonalities,
    allOutputStyles,
    resolvePresets,
    handleAddMcp,
    handleDeleteMcp,
    handleAddSkill,
    handleDeleteSkill,
    handleOpenTools,
    handleOpenPolicies,
    handleLibraryDrop,
    toggleThreadExpanded,
    toggleAgentThreadsVisible,
    toggleAssetsThreadExpanded,
    toggleAssetsThreadVisible,
    threadPositions,
    showToast,
    stockMcps,
    mcpReadiness,
    configuredKeys,
    handleConnectMcpFromSpace,
    handleRemoveMcpFromSpace,
    deployingAgents,
    setNodes,
    setEdges,
  ]);

  // 4. WebSocket Synchronization (Connects once, completely reactive via Zustand)
  useEffect(() => {
    const cleanupWs = SpaceService.connectWebSocket((msg) => {
      useSpaceStore.getState().broadcastWsMessage(msg);
      if (msg.type === 'agent_status' && msg.agentId) {
        const { status, lastRunAt } = (msg.data as { status: string; lastRunAt?: string }) || {};
        updateAgentStatus(msg.agentId, status as AgentRecord['status'], lastRunAt);
        if (status === 'idle') {
          const currentMood = useSpaceStore.getState().agentMoods[msg.agentId]?.mood;
          if (currentMood !== 'completed') {
            useSpaceStore.getState().setAgentMood(msg.agentId, 'idle');
          }
        }
      } else if (msg.type === 'node_moved' && msg.agentId) {
        const { posX, posY } = (msg.data as { posX: number; posY: number }) || {};
        if (typeof posX === 'number' && typeof posY === 'number') {
          updateNodePositionLocally(msg.agentId, posX, posY);
        }
      } else if (msg.type === 'cron_tick' && msg.agentId) {
        const { nextRunAt } = (msg.data as { nextRunAt?: string }) || {};
        updateAgentCron(msg.agentId, nextRunAt);
      } else if (msg.type === 'run_event' && msg.agentId) {
        const evt = msg.data as LiveLogEvent;
        if (activeDrawerAgentIdRef.current === msg.agentId) {
          useSpaceStore.getState().appendLiveEvent(evt);
        }
        // Dynamic Facial Expression dispatch based on live agent phase
        if (evt?.eventType === 'text.thought') {
          useSpaceStore.getState().setAgentMood(msg.agentId, 'thinking', 'Thinking & reasoning...');
        } else if (evt?.eventType === 'tool.started' || evt?.eventType === 'tool:start') {
          const toolName = (evt.payload?.toolName as string) || 'tool';
          useSpaceStore.getState().setAgentMood(msg.agentId, 'working', `Running ${toolName}...`);
        } else if (evt?.eventType === 'text.delta') {
          const curMood = useSpaceStore.getState().agentMoods[msg.agentId]?.mood;
          if (curMood === 'thinking') {
            useSpaceStore.getState().setAgentMood(msg.agentId, 'working', 'Generating answer...');
          }
        }
      } else if (msg.type === 'run_started' && msg.agentId) {
        useSpaceStore.getState().setAgentMood(msg.agentId, 'working', 'Task in progress');
        refreshSpace();
      } else if (msg.type === 'run_completed' && msg.agentId) {
        // Keep celebratory smile face for 7.5s, then gracefully return to idle
        useSpaceStore.getState().setAgentMood(msg.agentId, 'completed', (msg.data as any)?.summary || 'Task completed!', 7500);
        refreshSpace();
      } else if (msg.type === 'run_failed' && msg.agentId) {
        useSpaceStore.getState().setAgentMood(msg.agentId, 'error', (msg.data as any)?.error || 'Task failed', 6000);
        refreshSpace();
      } else if (msg.type === 'run_completed' || msg.type === 'run_failed') {
        refreshSpace();
      } else if (msg.type === 'delegations_active' && Array.isArray(msg.data)) {
        applyActiveDelegationsSnapshot(msg.data as ActiveDelegationRecord[]);
      } else if (msg.type === 'active_runs_active' && Array.isArray(msg.data)) {
        applyActiveRunsSnapshot(msg.data as ActiveRunRecord[]);
      } else if (
        msg.type === 'agent_updated' ||
        msg.type === 'agent_manifest_updated' ||
        msg.type === 'agent_files_updated' ||
        msg.type === 'agent_skills_updated' ||
        msg.type === 'agent_mcps_updated' ||
        msg.type === 'agent_cron_jobs_updated'
      ) {
        refreshSpace();
      } else if (msg.type === 'agent_created' || msg.type === 'agent_deleted') {
        // Another browser created or deleted an agent — resync the full list
        refreshSpace();
      } else if (msg.type === 'nodes_moved' && Array.isArray((msg.data as any)?.positions)) {
        // Batch node move broadcast from another browser window
        const positions = (msg.data as any).positions as Array<{ id: string; posX: number; posY: number }>;
        for (const p of positions) {
          if (typeof p.posX === 'number' && typeof p.posY === 'number') {
            updateNodePositionLocally(p.id, p.posX, p.posY);
          }
        }
      } else if (msg.type === 'workspace_space_created') {
        // Local-only upsert: calling addWorkspaceZone here would POST again and
        // create an infinite create/broadcast loop between every open browser.
        const zone = msg.data as GroupWorkspaceZone;
        if (zone?.id) {
          const store = useSpaceStore.getState();
          store.setWorkspaceZones([
            ...store.workspaceZones.filter((z) => z.id !== zone.id),
            zone,
          ]);
        }
      } else if (msg.type === 'workspace_spaces_batch' && Array.isArray(msg.data)) {
        useSpaceStore.getState().setWorkspaceZones(msg.data as GroupWorkspaceZone[]);
      } else if (msg.type === 'workspace_space_updated') {
        // Local-only merge: updateWorkspaceZone would PATCH the server again and
        // bounce the update back forever.
        const updated = msg.data as GroupWorkspaceZone;
        if (updated?.id) {
          const store = useSpaceStore.getState();
          store.setWorkspaceZones(
            store.workspaceZones.map((z) =>
              z.id === updated.id ? { ...z, ...updated } : z,
            ),
          );
        }
      } else if (msg.type === 'workspace_space_deleted') {
        // Local-only removal for the same reason.
        const id = (msg.data as any)?.id;
        if (id) {
          const store = useSpaceStore.getState();
          store.setWorkspaceZones(store.workspaceZones.filter((z) => z.id !== id));
        }
      } else if (msg.type === 'zone_created') {
        const zone = msg.data as RoleZone;
        if (zone?.id) {
          const cur = useSpaceStore.getState().roleZones;
          setRoleZones([...cur.filter((z) => z.id !== zone.id), zone]);
        }
      } else if (msg.type === 'zone_updated') {
        const { id, ...updates } = (msg.data as any) || {};
        if (id) {
          const cur = useSpaceStore.getState().roleZones;
          setRoleZones(cur.map((z) => z.id === id ? { ...z, ...updates } as RoleZone : z));
        }
      } else if (msg.type === 'zone_deleted') {
        const id = (msg.data as any)?.id;
        if (id) {
          const cur = useSpaceStore.getState().roleZones;
          setRoleZones(cur.filter((z) => z.id !== id));
        }
      } else if (msg.type === 'agent_connection_created') {
        const conn = msg.data as AgentConnectionRecord;
        if (conn?.id) setConnections((prev) => [...prev.filter((c) => c.id !== conn.id), conn]);
      } else if (msg.type === 'agent_connection_deleted') {
        const data = (msg.data as {
          id?: string;
          sourceAgentId?: string;
          targetAgentId?: string;
        }) || {};
        if (data.id) {
          setConnections((prev) => prev.filter((c) => c.id !== data.id));
        } else if (data.sourceAgentId && data.targetAgentId) {
          const { sourceAgentId, targetAgentId } = data;
          setConnections((prev) =>
            prev.filter(
              (c) =>
                !(
                  (c.source_agent_id === sourceAgentId && c.target_agent_id === targetAgentId) ||
                  (c.source_agent_id === targetAgentId && c.target_agent_id === sourceAgentId)
                ),
            ),
          );
        }
      } else if (msg.type === 'canvas_viewport_updated') {
        // Another browser moved the viewport. Ignore it while this user is
        // actively panning/zooming, and ignore our own broadcast echo.
        const vp = msg.data as { x: number; y: number; zoom: number } | null;
        if (!vp || viewportInteractingRef.current) return;
        const current = useSpaceStore.getState().canvasViewport;
        if (current && viewportsEqual(current, vp)) return;
        applyViewportFromRemote(vp, true);
      }
    });

    return cleanupWs;
  }, [refreshSpace, applyActiveRunsSnapshot, applyActiveDelegationsSnapshot, updateAgentStatus, updateNodePositionLocally, updateAgentCron, setRoleZones, applyViewportFromRemote]);

  // 5. Deployment guard — warn before tab close/refresh when a company is deploying
  useEffect(() => {
    if (!isCompanyDeploying) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome requires returnValue to be set (legacy)
      e.returnValue = 'A company deployment is in progress. Leaving now will abort it and may cause incomplete data. Are you sure?';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isCompanyDeploying]);

  const handlePaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      if (isMobile || !rfInstance) return;

      const flowCoords = rfInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        flowX: flowCoords.x,
        flowY: flowCoords.y,
      });
    },
    [rfInstance, isMobile],
  );

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, []);

  // 7. Save Agent (Create or Update)
  const handleSaveAgent = async (data: Partial<AgentRecord>) => {
    if (editingAgent) {
      await AgentService.updateAgent(editingAgent.id, data);
    } else {
      const created = await AgentService.createAgent(data);
      if (templateInitialData) {
        if (templateInitialData.recommended_mcps && templateInitialData.recommended_mcps.length > 0) {
          for (const mcpName of templateInitialData.recommended_mcps) {
            const stockMcp = resolveStockMcp(stockMcps, mcpName);
            if (!stockMcp) continue;
            await AgentService.addMcp(created.id, {
              mcp_name: stockMcp.name,
              label: stockMcp.label,
              config: { command: stockMcp.command, args: stockMcp.args },
              allowUnconfigured: true,
            }).catch(() => {});
          }
        }
        if (templateInitialData.recommended_skills && templateInitialData.recommended_skills.length > 0) {
          for (const skillKey of templateInitialData.recommended_skills) {
            const attachment = resolveRecommendedSkillAttachment(
              skillKey,
              stockSkills,
              data.name || 'Agent',
              data.role,
            );
            await AgentService.addSkill(created.id, attachment).catch(() => {});
          }
        }
      }
    }
    refreshSpace();
  };

  const handleAttachMcp = async (
    agentId: string,
    mcpData: { mcp_name: string; label?: string; config?: Record<string, unknown> },
  ) => {
    await AgentService.addMcp(agentId, mcpData);
    refreshSpace();
  };

  const handleAttachSkill = async (agentId: string, skillData: SkillInput) => {
    await AgentService.addSkill(agentId, skillData);
    refreshSpace();
  };

  const gridLineColor = currentTheme.includes('dark')
    ? currentTheme === 'theme-dark-matrix'
      ? '#0d2214'
      : currentTheme === 'theme-dark-nebula'
        ? '#26184a'
        : currentTheme === 'theme-dark-carbon'
          ? '#18181b'
          : '#152136'
    : currentTheme === 'theme-light-paper'
      ? '#e7dfd3'
      : currentTheme === 'theme-light-pastel'
        ? '#e0dcf5'
        : '#e2e8f0';

  const handleOpenSettingsModal = useCallback(() => setIsSettingsModalOpen(true), []);
  const handleAddAgentClick = useCallback(() => {
    setEditingAgent(null);
    setTemplateInitialData(null);
    setNewAgentCoords({ x: 300, y: 220 });
    setIsAgentModalOpen(true);
  }, []);
  /**
   * Intelligently arranges all workspace zones (pods) and agents on the canvas
   * with guaranteed ZERO overlaps.
   * - Pods are laid out in a clean, non-overlapping grid with generous 140px margins.
   * - Member agents are neatly framed inside their respective pods with clean internal padding.
   * - Standalone agents (outside pods) are organized in their own neat grid below/beside.
   * - Attached satellite nodes (threads & assets) are anchored relative to their agents.
   * - Positions are persisted cleanly to backend SQLite and localStorage.
   */
  const handleAutoArrange = useCallback(async () => {
    if (!rfInstance || companyDeployLockRef.current) return;

    const currentZones = useSpaceStore.getState().workspaceZones;
    const currentAgents = useSpaceStore.getState().agents;
    const currentRoleZones = useSpaceStore.getState().roleZones;

    if (currentZones.length === 0 && currentAgents.length === 0 && currentRoleZones.length === 0) {
      rfInstance.fitView({ padding: 0.18, duration: 500 });
      return;
    }

    const currentNodes = useSpaceStore.getState().nodes;
    const nodeMap = new Map(currentNodes.map((n) => [n.id, n]));

    // Helper: determine if an agent is deployed in any Role Zone
    const isAgentInRoleZone = (agent: SpaceAgentEntity): boolean => {
      const pos = nodeMap.get(agent.id)?.position || { x: agent.pos_x, y: agent.pos_y };
      if (resolveZoneAt(pos.x, pos.y, currentRoleZones) !== null) return true;
      return currentRoleZones.some((rz) =>
        isAgentInZone(pos.x, pos.y, rz.x, rz.y, rz.width, rz.height),
      );
    };

    // Helper: determine if an agent is deployed in any Workspace Zone
    const isAgentInWorkspaceZone = (agent: SpaceAgentEntity): boolean => {
      const pos = nodeMap.get(agent.id)?.position || { x: agent.pos_x, y: agent.pos_y };
      return currentZones.some((wz) =>
        isAgentInZone(pos.x, pos.y, wz.x, wz.y, wz.width, wz.height),
      );
    };

    // 1. Separate agents: Deployed in a zone vs Standalone
    const deployedAgents: SpaceAgentEntity[] = [];
    const standaloneAgents: SpaceAgentEntity[] = [];

    for (const agent of currentAgents) {
      const pos = nodeMap.get(agent.id)?.position || { x: agent.pos_x, y: agent.pos_y };
      if (isAgentInRoleZone(agent) || isAgentInWorkspaceZone(agent)) {
        // Agent is deployed on a zone — PRESERVE placement without moving
        deployedAgents.push({ ...agent, pos_x: pos.x, pos_y: pos.y });
      } else {
        standaloneAgents.push(agent);
      }
    }

    // 2. Role Zones and Workspace Zones that contain agents or are placed by user
    // Hierarchical role zones are part of the org structure and must preserve their coordinates.
    const updatedAgents: SpaceAgentEntity[] = [...deployedAgents];

    // Compute bounding box of all existing zones and deployed agents so standalone agents don't overlap
    let maxCanvasY = 120;
    let minCanvasX = 120;
    for (const rz of currentRoleZones) {
      maxCanvasY = Math.max(maxCanvasY, rz.y + rz.height);
      minCanvasX = Math.min(minCanvasX, rz.x);
    }
    for (const wz of currentZones) {
      maxCanvasY = Math.max(maxCanvasY, wz.y + wz.height);
      minCanvasX = Math.min(minCanvasX, wz.x);
    }
    for (const da of deployedAgents) {
      maxCanvasY = Math.max(maxCanvasY, da.pos_y + 240);
      minCanvasX = Math.min(minCanvasX, da.pos_x);
    }

    // 3. Only lay out standalone agents (agents not deployed on any zone)
    if (standaloneAgents.length > 0) {
      const STANDALONE_CARD_W = 380;
      const STANDALONE_CARD_H = 190;
      const STANDALONE_GAP_X = 50;
      const STANDALONE_GAP_Y = 50;
      const standaloneStartY = maxCanvasY + 120;
      const standCols = Math.min(4, Math.max(1, standaloneAgents.length));

      standaloneAgents.forEach((agent, sIdx) => {
        const sc = sIdx % standCols;
        const sr = Math.floor(sIdx / standCols);
        const ax = Math.round(minCanvasX + sc * (STANDALONE_CARD_W + STANDALONE_GAP_X));
        const ay = Math.round(standaloneStartY + sr * (STANDALONE_CARD_H + STANDALONE_GAP_Y));
        updatedAgents.push({ ...agent, pos_x: ax, pos_y: ay });
        SpaceService.updateNodePosition(agent.id, ax, ay);
        updateNodePositionLocally(agent.id, ax, ay);
      });
    }

    // 4. Update agents in store
    setAgents(updatedAgents);

    // 5. Force immediate position reconciliation for React Flow nodes
    // Map agent deltas (dx, dy) to maintain relative positions of satellite nodes
    const agentDeltas = new Map<string, { dx: number; dy: number; x: number; y: number }>();
    const oldAgentMap = new Map(currentAgents.map((a) => [a.id, a]));
    for (const a of updatedAgents) {
      const old = oldAgentMap.get(a.id);
      const dx = old ? a.pos_x - old.pos_x : 0;
      const dy = old ? a.pos_y - old.pos_y : 0;
      agentDeltas.set(a.id, { dx, dy, x: a.pos_x, y: a.pos_y });
    }

    setNodes((prevNodes) =>
      prevNodes.map((n) => {
        if (agentDeltas.has(n.id)) {
          const delta = agentDeltas.get(n.id)!;
          return { ...n, position: { x: delta.x, y: delta.y } };
        }
        if (n.id.startsWith('thread-')) {
          const aId = (n.data as any)?.agentId;
          const delta = agentDeltas.get(aId);
          if (delta && (delta.dx !== 0 || delta.dy !== 0)) {
            return {
              ...n,
              position: { x: n.position.x + delta.dx, y: n.position.y + delta.dy },
            };
          }
        }
        if (n.id.startsWith('assets-')) {
          const aId = (n.data as any)?.agentId;
          const delta = agentDeltas.get(aId);
          if (delta && (delta.dx !== 0 || delta.dy !== 0)) {
            return {
              ...n,
              position: { x: n.position.x + delta.dx, y: n.position.y + delta.dy },
            };
          }
        }
        return n;
      })
    );

    // 6. Smoothly animate camera to fit newly organized layout
    setTimeout(() => {
      rfInstance.fitView({ padding: 0.18, duration: 600 });
    }, 80);

    showToast('Canvas organized — deployed agents preserved.', 'ok');
  }, [rfInstance, setAgents, setNodes, updateNodePositionLocally, showToast]);

  const handleFitViewClick = useCallback(() => {
    // When the user clicks the arrange/expand icon (< -->), arrange and fit view!
    handleAutoArrange();
  }, [handleAutoArrange]);

  const handleSpawnTemplate = useCallback(
    async (template: AgentTemplate, flowX: number, flowY: number) => {
      const currentSpaces = useSpaceStore.getState().workspaceZones;
      const containingSpace = currentSpaces.find((space) =>
        zoneContainsPoint(space, flowX, flowY),
      );
      const isAvatar = Boolean(containingSpace);
      const zoneColor = containingSpace?.color;

      const tempId = `deploying-single-${template.id}-${Date.now()}`;
      setDeployingAgents((prev) => [
        ...prev,
        {
          tempId,
          name: template.name,
          role: template.role || null,
          provider: template.provider,
          model: template.default_model,
          x: Math.round(flowX),
          y: Math.round(flowY),
          isAvatar,
          zoneColor,
          phase: 'provisioning',
        },
      ]);

      try {
        const createdAgent = await AgentService.createAgent({
          name: template.name,
          model: template.default_model,
          provider: template.provider,
          system_prompt: template.system_prompt,
          cron_schedule: template.suggested_cron,
          cron_enabled: template.suggested_cron ? 1 : 0,
          pos_x: Math.round(flowX),
          pos_y: Math.round(flowY),
          policies: template.policies ? JSON.stringify(template.policies) : '[]',
          role: template.role || null,
          specialty: template.specialty || null,
          description: template.description || null,
        });

        // Check if agent was spawned inside an existing Office Space
        const currentSpaces = useSpaceStore.getState().workspaceZones;
        const containingSpace = currentSpaces.find((space) =>
          zoneContainsPoint(space, flowX, flowY),
        );
        if (containingSpace) {
          void SpaceService.updateNodePosition(
            createdAgent.id,
            Math.round(flowX),
            Math.round(flowY),
            containingSpace.id,
          ).catch(() => {});
        }

        setDeployingAgents((prev) =>
          prev.map((d) => (d.tempId === tempId ? { ...d, phase: 'attaching_mcps' } : d)),
        );

        // Auto-attach recommended MCPs
        if (template.recommended_mcps && template.recommended_mcps.length > 0) {
          for (const mcpName of template.recommended_mcps) {
            const stockMcp = resolveStockMcp(stockMcps, mcpName);
            if (!stockMcp) continue;
            await AgentService.addMcp(createdAgent.id, {
              mcp_name: stockMcp.name,
              label: stockMcp.label,
              config: { command: stockMcp.command, args: stockMcp.args },
              allowUnconfigured: true,
            }).catch(() => {});
          }
        }

        setDeployingAgents((prev) =>
          prev.map((d) => (d.tempId === tempId ? { ...d, phase: 'attaching_skills' } : d)),
        );

        // Auto-attach recommended Skills
        if (template.recommended_skills && template.recommended_skills.length > 0) {
          for (const skillKey of template.recommended_skills) {
            const attachment = resolveRecommendedSkillAttachment(
              skillKey,
              stockSkills,
              template.name,
              template.role,
            );
            await AgentService.addSkill(createdAgent.id, attachment).catch(() => {});
          }
        }

        refreshSpace();
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to spawn enterprise agent', 'warn');
      } finally {
        setDeployingAgents((prev) => prev.filter((d) => d.tempId !== tempId));
      }
    },
    [refreshSpace, stockMcps, stockSkills],
  );

  /** Create a hierarchical zone only when it lands inside a visual space. */
  const spawnRoleZoneInSpace = useCallback(
    (preset: RoleZonePreset, flowX: number, flowY: number): boolean => {
      const spaces = useSpaceStore.getState().workspaceZones;
      const space = spaces.find((candidate) => zoneContainsPoint(candidate, flowX, flowY));
      if (!space) {
        showToast('Drop zones inside an Office Space. Create or deploy a space first.', 'warn');
        return false;
      }

      const width = Math.min(preset.width, Math.max(240, space.width - 32));
      const height = Math.min(preset.height, Math.max(140, space.height - 32));
      const margin = 8;
      const x = Math.min(
        Math.max(flowX - width / 2, space.x + margin),
        space.x + space.width - width - margin,
      );
      const y = Math.min(
        Math.max(flowY - height / 2, space.y + margin),
        space.y + space.height - height - margin,
      );

      const parent = useSpaceStore
        .getState()
        .roleZones.filter(
          (zone) =>
            zone.spaceId === space.id &&
            zone.level < preset.level &&
            zoneContainsPoint(zone, flowX, flowY),
        )
        .sort((a, b) => b.level - a.level || a.width * a.height - b.width * b.height)[0];

      addRoleZone({
        ...preset,
        id: undefined,
        description: preset.description,
        parentZoneId: preset.parentZoneId ?? parent?.id ?? null,
        delegationPolicy: preset.delegationPolicy ?? 'auto',
        spaceId: space.id,
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
      });
      showToast(`Created L${preset.level} ${preset.roleTitle} zone inside "${space.name}".`, 'ok');
      return true;
    },
    [addRoleZone, showToast],
  );

  /** Create an entire hierarchical org chain inside a space, auto-sizing the space to fit. */
  const spawnHierarchicalChainInSpace = useCallback(
    (chain: HierarchicalChainPreset, flowX?: number, flowY?: number): boolean => {
      const store = useSpaceStore.getState();
      const spaces = store.workspaceZones;

      let targetSpace: GroupWorkspaceZone | undefined;
      if (typeof flowX === 'number' && typeof flowY === 'number') {
        targetSpace = spaces.find((candidate) => zoneContainsPoint(candidate, flowX, flowY));
      }
      if (!targetSpace) {
        targetSpace = spaces[0];
      }

      const layout = layoutHierarchicalChain(chain);

      if (!targetSpace) {
        const padX = 80;
        const padY = 80;
        const spaceW = Math.max(layout.requiredWidth + padX * 2, 1400);
        const spaceH = Math.max(layout.requiredHeight + padY * 2, 900);
        const startX = typeof flowX === 'number' ? flowX - spaceW / 2 : 120;
        const startY = typeof flowY === 'number' ? flowY - spaceH / 2 : 100;

        const companyName = chain.name || chain.companyName || 'Organization';
        const companyColor = chain.color || chain.industryColor || '#3b82f6';

        targetSpace = store.addWorkspaceZone({
          name: `${companyName} HQ`,
          description: chain.description,
          x: Math.round(startX),
          y: Math.round(startY),
          width: Math.round(spaceW),
          height: Math.round(spaceH),
          color: companyColor,
          shape: 'rectangle',
        });
      }

      if (!targetSpace) {
        showToast('Create an Office Space first, or drag the hierarchy directly onto canvas.', 'warn');
        return false;
      }

      const padX = 64;
      const padY = 72;
      const minW = layout.requiredWidth + padX * 2;
      const minH = layout.requiredHeight + padY * 2;

      let spaceX = targetSpace.x;
      let spaceY = targetSpace.y;
      let spaceW = targetSpace.width;
      let spaceH = targetSpace.height;

      if (spaceW < minW || spaceH < minH) {
        spaceW = Math.max(spaceW, minW);
        spaceH = Math.max(spaceH, minH);
        store.updateWorkspaceZone(targetSpace.id, {
          width: Math.round(spaceW),
          height: Math.round(spaceH),
        });
      }

      const originX = spaceX + Math.round((spaceW - layout.requiredWidth) / 2);
      const originY = spaceY + padY;

      const zonesToCreate = layout.zones.map((zone) => ({
        ...zone,
        id: zone.id,
        spaceId: targetSpace!.id,
        x: Math.round(originX + zone.x),
        y: Math.round(originY + zone.y),
        width: Math.round(zone.width),
        height: Math.round(zone.height),
      }));

      addRoleZonesBatch(zonesToCreate);
      const companyName = chain.name || chain.companyName || 'Organization';
      showToast(
        `Deployed "${companyName}" (${chain.nodes.length} designation zones across ${chain.nodes.reduce((m, n) => Math.max(m, n.level + 1), 0)} tiers) inside "${targetSpace.name}".`,
        'ok',
      );
      return true;
    },
    [addRoleZonesBatch, showToast],
  );

  /** Create an entire Company (Space + Hierarchical Zones + Placed Real Agents) */
  const spawnCompanyInSpace = useCallback(
    (company: CompanyPreset, scaleKey: CompanyScale = 'mid', flowX?: number, flowY?: number): boolean => {
      if (companyDeployLockRef.current) {
        showToast(
          'A company deployment is already running. Wait for it to finish before deploying another.',
          'warn',
        );
        return false;
      }
      const store = useSpaceStore.getState();
      const scaleConfig = company.scales[scaleKey] || company.scales.mid;

      // Pre-compute company layout with origin {0,0} to determine exact dynamic space dimensions
      const initialLayout = layoutCompany(company, scaleKey, { x: 0, y: 0 });
      const spaceWidth = Math.round(initialLayout.requiredWidth);
      const spaceHeight = Math.round(initialLayout.requiredHeight);

      let targetOriginX: number;
      let targetOriginY: number;

      if (typeof flowX === 'number' && typeof flowY === 'number') {
        targetOriginX = Math.round(flowX - spaceWidth / 2);
        targetOriginY = Math.round(flowY - spaceHeight / 2);
      } else {
        const center = getCanvasCenterScreenPoint();
        const flow = rfInstance?.screenToFlowPosition(center);
        targetOriginX = Math.round((flow?.x ?? 200) - spaceWidth / 2);
        targetOriginY = Math.round((flow?.y ?? 150) - spaceHeight / 2);
      }

      // 1. Create the unified Office Space on canvas with dynamic width and height
      const createdSpace = store.addWorkspaceZone({
        name: scaleConfig.space.name,
        description: scaleConfig.space.description,
        workflowPrompt: scaleConfig.space.workflowPrompt,
        workflowInstructions: scaleConfig.space.workflowInstructions,
        responsibilities: scaleConfig.space.responsibilities,
        delegationPolicy: scaleConfig.space.delegationPolicy,
        x: targetOriginX,
        y: targetOriginY,
        width: spaceWidth,
        height: spaceHeight,
        color: scaleConfig.space.color,
        shape: 'rectangle',
      });

      const completeCompanyWorkflow = [
        scaleConfig.space.workflowPrompt || '',
        scaleConfig.space.workflowInstructions ? `\n### STEP-BY-STEP OPERATIONAL PIPELINE:\n${scaleConfig.space.workflowInstructions}` : '',
        scaleConfig.space.responsibilities ? `\n### ORGANIZATIONAL RESPONSIBILITIES:\n${scaleConfig.space.responsibilities}` : '',
      ].filter(Boolean).join('\n');

      if (completeCompanyWorkflow) {
        void SpaceService.saveWorkspacePrompt(
          createdSpace.id,
          createdSpace.name,
          completeCompanyWorkflow,
        ).catch(() => {});
      }

      // 2. Compute placed zones and placed agent positions
      const layout = layoutCompany(company, scaleKey, { x: createdSpace.x, y: createdSpace.y });

      // 3. Batch add all role zones belonging to this space
      const zonesToCreate = layout.zones.map((zone) => ({
        ...zone,
        spaceId: createdSpace.id,
        delegationPolicy: zone.delegationPolicy || 'auto',
        x: Math.round(zone.x),
        y: Math.round(zone.y),
        width: Math.round(zone.width),
        height: Math.round(zone.height),
      }));
      addRoleZonesBatch(zonesToCreate);

      // 4. Create template mapping and immediately populate shimmer skeleton cards for all agents
      const templateMap = new Map<string, AgentTemplate>();
      for (const t of ENTERPRISE_AGENT_TEMPLATES) {
        templateMap.set(t.id, t);
      }

      const companySkeletonList = layout.agents.map((pa, idx) => {
        const tmpl =
          templateMap.get(pa.agentTemplateId) ||
          ENTERPRISE_AGENT_TEMPLATES.find(
            (t) => (pa.agentName && t.name.toLowerCase() === pa.agentName.toLowerCase()) || t.role === pa.roleTitle,
          ) ||
          ENTERPRISE_AGENT_TEMPLATES[0];

        const targetZone = layout.zones.find((z) => z.id === pa.zoneId);

        return {
          tempId: `deploying-comp-${createdSpace.id}-${idx}`,
          name: pa.agentName || pa.roleTitle || 'Specialist',
          role: pa.roleTitle || 'Team Member',
          provider: tmpl?.provider || 'openai',
          model: tmpl?.default_model || 'gpt-4o',
          x: Math.round(pa.x),
          y: Math.round(pa.y),
          zoneId: pa.zoneId,
          isAvatar: true,
          zoneColor: targetZone?.color || scaleConfig.space.color || '#38bdf8',
          phase: 'provisioning' as const,
        };
      });

      setDeployingAgents((prev) => [...prev, ...companySkeletonList]);

      // Hold the lock for the whole async deployment. Set before the first
      // await so a double-click cannot slip a second company past the guard.
      companyDeployLockRef.current = true;
      setIsCompanyDeploying(true);

      // Smoothly frame the company in the viewport so the user watches it assemble
      if (rfInstance) {
        rfInstance.fitBounds(
          {
            x: createdSpace.x - 40,
            y: createdSpace.y - 40,
            width: spaceWidth + 80,
            height: spaceHeight + 80,
          },
          { duration: 450 },
        );
      }

      void (async () => {
        // Device capability adaptive throttle: adjust paced interval based on hardware cores
        const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
        const pacingDelayMs = cores >= 8 ? 200 : cores >= 4 ? 350 : 550;

        const totalAgents = layout.agents.length;
        setCompanyDeployment({
          companyName: company.name,
          total: totalAgents,
          current: 0,
          currentAgentName: 'Initializing deployment...',
          currentRoleTitle: 'Configuring space & zones',
          phase: 'spawning',
        });

        const spawnedAgentsList: Array<{
          createdAgent: { id: string; name: string };
          placedAgent: PlacedCompanyAgent;
          targetZone?: PlacedCompanyZone;
        }> = [];

        try {
          let agentIndex = 0;
          for (const placedAgent of layout.agents) {
            const currentTempId = `deploying-comp-${createdSpace.id}-${agentIndex}`;
            agentIndex++;
            const agentName = placedAgent.agentName || placedAgent.roleTitle || 'Specialist';
            const roleTitle = placedAgent.roleTitle || 'Team Member';

            setCompanyDeployment({
              companyName: company.name,
              total: totalAgents,
              current: agentIndex,
              currentAgentName: agentName,
              currentRoleTitle: roleTitle,
              phase: 'spawning',
            });

            setDeployingAgents((prev) =>
              prev.map((d) => (d.tempId === currentTempId ? { ...d, phase: 'provisioning' } : d)),
            );

            const template =
              templateMap.get(placedAgent.agentTemplateId) ||
              ENTERPRISE_AGENT_TEMPLATES.find(
                (t) => (placedAgent.agentName && t.name.toLowerCase() === placedAgent.agentName.toLowerCase()) || t.role === placedAgent.roleTitle,
              ) ||
              ENTERPRISE_AGENT_TEMPLATES[0];

            const targetZone = layout.zones.find((z) => z.id === placedAgent.zoneId);
            const parentZone = targetZone?.parentZoneId ? layout.zones.find((z) => z.id === targetZone.parentZoneId) : null;
            const level = targetZone ? targetZone.level : 2;

            const tailoredSystemPrompt = buildCompanyAgentPrompt({
              company,
              scale: scaleKey,
              agentName,
              roleTitle,
              level,
              zoneName: targetZone ? targetZone.name : 'Unassigned Zone',
              zoneResponsibilities: targetZone?.responsibilities,
              zoneInstructions: targetZone?.workflowInstructions,
              parentZoneName: parentZone?.name,
              parentZoneRoleTitle: parentZone?.roleTitle,
              baseSystemPrompt: template.system_prompt,
            });

            const createdAgent = await AgentService.createAgent({
              name: agentName,
              model: template.default_model,
              provider: template.provider,
              system_prompt: tailoredSystemPrompt,
              cron_schedule: template.suggested_cron,
              cron_enabled: template.suggested_cron ? 1 : 0,
              pos_x: Math.round(placedAgent.x),
              pos_y: Math.round(placedAgent.y),
              policies: template.policies ? JSON.stringify(template.policies) : '[]',
              role: placedAgent.roleTitle || template.role || null,
              specialty: template.specialty || null,
              description: template.description || null,
            });

            spawnedAgentsList.push({ createdAgent, placedAgent, targetZone });

            // Associate with created space
            void SpaceService.updateNodePosition(
              createdAgent.id,
              Math.round(placedAgent.x),
              Math.round(placedAgent.y),
              createdSpace.id,
            ).catch(() => {});

            setDeployingAgents((prev) =>
              prev.map((d) => (d.tempId === currentTempId ? { ...d, phase: 'attaching_mcps' } : d)),
            );

            // Auto-attach recommended MCPs
            if (template.recommended_mcps && template.recommended_mcps.length > 0) {
              for (const mcpName of template.recommended_mcps) {
                const stockMcp = resolveStockMcp(stockMcps, mcpName);
                if (!stockMcp) continue;
                await AgentService.addMcp(createdAgent.id, {
                  mcp_name: stockMcp.name,
                  label: stockMcp.label,
                  config: { command: stockMcp.command, args: stockMcp.args },
                  allowUnconfigured: true,
                }).catch(() => {});
              }
            }

            setDeployingAgents((prev) =>
              prev.map((d) => (d.tempId === currentTempId ? { ...d, phase: 'attaching_skills' } : d)),
            );

            // Auto-attach recommended Skills
            if (template.recommended_skills && template.recommended_skills.length > 0) {
              for (const skillKey of template.recommended_skills) {
                const attachment = resolveRecommendedSkillAttachment(
                  skillKey,
                  stockSkills,
                  template.name,
                  template.role,
                );
                await AgentService.addSkill(createdAgent.id, attachment).catch(() => {});
              }
            }

            // Real agent now exists in database, remove skeleton card
            setDeployingAgents((prev) => prev.filter((d) => d.tempId !== currentTempId));

            // Staggered pacing pause to protect lower-spec devices and keep UI responsive
            await new Promise((resolve) => setTimeout(resolve, pacingDelayMs));
            refreshSpace();
          }

          // Wire automatic hierarchical connections
          setCompanyDeployment({
            companyName: company.name,
            total: totalAgents,
            current: totalAgents,
            currentAgentName: 'Wiring organizational hierarchy & connections...',
            currentRoleTitle: 'Connecting reporting lines',
            phase: 'spawning',
          });

          const connectedPairs = new Set<string>();
          const addConn = async (idA: string, idB: string) => {
            if (!idA || !idB || idA === idB) return;
            const key = idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
            if (connectedPairs.has(key)) return;
            connectedPairs.add(key);
            await AgentService.createConnection(idA, idB).catch(() => {});
          };

          for (const item of spawnedAgentsList) {
            // 1. Connect child zone agents to parent zone manager agents
            if (item.targetZone?.parentZoneId) {
              const managers = spawnedAgentsList.filter(
                (s) => s.targetZone?.id === item.targetZone?.parentZoneId,
              );
              for (const mgr of managers) {
                await addConn(mgr.createdAgent.id, item.createdAgent.id);
              }
            }

            // 2. Connect peers in the same zone (if small squad)
            const zonePeers = spawnedAgentsList.filter(
              (s) => s.targetZone?.id === item.targetZone?.id && s.createdAgent.id !== item.createdAgent.id,
            );
            if (zonePeers.length <= 4) {
              for (const peer of zonePeers) {
                await addConn(item.createdAgent.id, peer.createdAgent.id);
              }
            }

            // 3. Connect Executive (Level 0) agents to each other
            if (item.targetZone?.level === 0) {
              const execPeers = spawnedAgentsList.filter(
                (s) => s.targetZone?.level === 0 && s.createdAgent.id !== item.createdAgent.id,
              );
              for (const exec of execPeers) {
                await addConn(item.createdAgent.id, exec.createdAgent.id);
              }
            }
          }

          const freshConns = await AgentService.fetchConnections().catch(() => []);
          setConnections(freshConns);

          setCompanyDeployment({
            companyName: company.name,
            total: totalAgents,
            current: totalAgents,
            currentAgentName: 'All agents ready',
            currentRoleTitle: 'Deployment completed',
            phase: 'completed',
          });

          setTimeout(() => {
            setCompanyDeployment(null);
          }, 3200);

          refreshSpace();
        } catch (err) {
          console.error('[Company] Error spawning agents:', err);
          setCompanyDeployment(null);
        } finally {
          companyDeployLockRef.current = false;
          setIsCompanyDeploying(false);
          setDeployingAgents((prev) =>
            prev.filter((d) => !d.tempId.startsWith(`deploying-comp-${createdSpace.id}`)),
          );
        }
      })();

      showToast(
        `Deploying "${company.name}" (${scaleKey.toUpperCase()} Scale: ${layout.zones.length} Zones, ${layout.agents.length} Real Agents)...`,
        'ok',
      );
      return true;
    },
    [rfInstance, addRoleZonesBatch, showToast, refreshSpace, stockMcps, stockSkills],
  );

  // ── Library: drop an agent template onto empty canvas ────────────────────
  // Declared after handleSpawnTemplate so the dependency array resolves it.
  const handlePaneDrop = useCallback(
    (event: React.DragEvent | DragEvent) => {
      const payload = readLibDragPayload((event as React.DragEvent).dataTransfer);
      setActiveDragPayload(null);
      if (!payload) return;

      if (payload.kind === 'agent' && payload.agent) {
        event.preventDefault();
        event.stopPropagation();
        const clientX = 'clientX' in event ? event.clientX : 0;
        const clientY = 'clientY' in event ? event.clientY : 0;
        const flow = rfInstance?.screenToFlowPosition({ x: clientX, y: clientY });
        const dropX = flow?.x ?? 300;
        const dropY = flow?.y ?? 220;

        // Check if dropped inside a hierarchical designation zone
        const hitRoleZone = resolveZoneAt(dropX, dropY, roleZones);
        if (hitRoleZone) {
          const existingMembers = agents.filter((a) =>
            isAgentInZone(a.pos_x, a.pos_y, hitRoleZone.x, hitRoleZone.y, hitRoleZone.width, hitRoleZone.height),
          ).length;
          const offset = (existingMembers % 3) * 22;
          handleSpawnTemplate(
            payload.agent,
            Math.round(hitRoleZone.x + 24 + offset),
            Math.round(hitRoleZone.y + 52 + offset),
          );
          setTimeout(() => alignRoleZoneMembers(hitRoleZone.id, true), 350);
          showToast(
            `Deployed ${payload.agent.name} as ${hitRoleZone.roleTitle} in "${hitRoleZone.name}".`,
            'ok',
          );
          return;
        }

        // Check if dropped inside an Office Space zone
        const hitZone = workspaceZones.find(
          (z) => dropX >= z.x && dropX <= z.x + z.width && dropY >= z.y && dropY <= z.y + z.height,
        );

        if (hitZone) {
          const currentMembers = agents.filter((a) =>
            isAgentInZone(a.pos_x, a.pos_y, hitZone.x, hitZone.y, hitZone.width, hitZone.height)
          );
          const nextCount = currentMembers.length + 1;
          const { cols, slotW, slotH, cardWidth, cardHeight } = getZoneGridMetrics(
            hitZone.width,
            hitZone.height,
            nextCount
          );
          const nextIdx = currentMembers.length;
          const c = nextIdx % cols;
          const r = Math.floor(nextIdx / cols);
          const targetX = Math.round(hitZone.x + 24 + c * slotW + (slotW - cardWidth) / 2);
          const targetY = Math.round(hitZone.y + 68 + r * slotH + (slotH - cardHeight) / 2);
          handleSpawnTemplate(payload.agent, targetX, targetY);
          setTimeout(() => {
            _handleAlignZoneMembers(hitZone.id, true);
          }, 350);
          showToast(`Deployed ${payload.agent.name} inside "${hitZone.name}" room!`, 'ok');
          return;
        }

        handleSpawnTemplate(payload.agent, dropX, dropY);
        return;
      }

      if (payload.kind === 'workspace_zone' && payload.zonePreset) {
        event.preventDefault();
        event.stopPropagation();
        const clientX = 'clientX' in event ? event.clientX : 0;
        const clientY = 'clientY' in event ? event.clientY : 0;
        const flow = rfInstance?.screenToFlowPosition({ x: clientX, y: clientY });
        const createdZone = addWorkspaceZone({
          name: payload.zonePreset.name,
          description: payload.zonePreset.description,
          workflowPrompt: payload.zonePreset.workflowPrompt,
          workflowInstructions: payload.zonePreset.workflowInstructions,
          responsibilities: payload.zonePreset.responsibilities,
          delegationPolicy: payload.zonePreset.delegationPolicy,
          repoUrl: payload.zonePreset.repoUrl,
          workingDir: payload.zonePreset.workingDir,
          projectBrief: payload.zonePreset.projectBrief,
          x: (flow?.x ?? 200) - payload.zonePreset.width / 2,
          y: (flow?.y ?? 150) - payload.zonePreset.height / 2,
          width: payload.zonePreset.width,
          height: payload.zonePreset.height,
          color: payload.zonePreset.color,
          shape: payload.zonePreset.shape,
        });
        if (payload.zonePreset.workflowPrompt) {
          void SpaceService.saveWorkspacePrompt(
            createdZone.id,
            createdZone.name,
            payload.zonePreset.workflowPrompt,
          ).catch(() => {});
        }
        // Sync any agents already resting inside this new space
        const memberAgents = useSpaceStore
          .getState()
          .agents.filter((a) =>
            isAgentInZone(a.pos_x, a.pos_y, createdZone.x, createdZone.y, createdZone.width, createdZone.height),
          );
        if (memberAgents.length > 0) {
          void SpaceService.setWorkspaceAgents(
            createdZone.id,
            memberAgents.map((a) => a.id),
          ).catch(() => {});
        }
        showToast(`Created "${payload.zonePreset.name}" space on canvas.`, 'ok');
        return;
      }

      if (payload.kind === 'role_zone' && payload.roleZonePreset) {
        event.preventDefault();
        event.stopPropagation();
        const clientX = 'clientX' in event ? event.clientX : 0;
        const clientY = 'clientY' in event ? event.clientY : 0;
        const flow = rfInstance?.screenToFlowPosition({ x: clientX, y: clientY });
        spawnRoleZoneInSpace(payload.roleZonePreset, flow?.x ?? 300, flow?.y ?? 220);
        return;
      }

      if (payload.kind === 'hierarchical_chain' && payload.hierarchicalChainPreset) {
        event.preventDefault();
        event.stopPropagation();
        const clientX = 'clientX' in event ? event.clientX : 0;
        const clientY = 'clientY' in event ? event.clientY : 0;
        const flow = rfInstance?.screenToFlowPosition({ x: clientX, y: clientY });
        spawnHierarchicalChainInSpace(payload.hierarchicalChainPreset, flow?.x, flow?.y);
        return;
      }

      if (payload.kind === 'company' && payload.companyPreset) {
        event.preventDefault();
        event.stopPropagation();
        const clientX = 'clientX' in event ? event.clientX : 0;
        const clientY = 'clientY' in event ? event.clientY : 0;
        const flow = rfInstance?.screenToFlowPosition({ x: clientX, y: clientY });
        spawnCompanyInSpace(payload.companyPreset, payload.companyScale || 'mid', flow?.x, flow?.y);
        return;
      }
    },
    [
      rfInstance,
      handleSpawnTemplate,
      addWorkspaceZone,
      showToast,
      _handleAlignZoneMembers,
      roleZones,
      alignRoleZoneMembers,
      spawnRoleZoneInSpace,
      spawnHierarchicalChainInSpace,
      spawnCompanyInSpace,
    ],
  );

  /** Deploy workspace room from Library "+ Deploy Room" button */
  useEffect(() => {
    const handleSpawnZoneEvent = (e: Event) => {
      const preset = (e as CustomEvent<WorkspaceZonePreset>).detail;
      if (!preset) return;
      const center = getCanvasCenterScreenPoint();
      const flow = rfInstance?.screenToFlowPosition(center);
      const createdZone = addWorkspaceZone({
        name: preset.name,
        description: preset.description,
        workflowPrompt: preset.workflowPrompt,
        workflowInstructions: preset.workflowInstructions,
        responsibilities: preset.responsibilities,
        delegationPolicy: preset.delegationPolicy,
        repoUrl: preset.repoUrl,
        workingDir: preset.workingDir,
        projectBrief: preset.projectBrief,
        x: (flow?.x ?? 300) - preset.width / 2,
        y: (flow?.y ?? 220) - preset.height / 2,
        width: preset.width,
        height: preset.height,
        color: preset.color,
        shape: preset.shape,
      });
      if (preset.workflowPrompt) {
        void SpaceService.saveWorkspacePrompt(
          createdZone.id,
          createdZone.name,
          preset.workflowPrompt,
        ).catch(() => {});
      }
      // Sync any agents already resting inside this new space
      const memberAgents = useSpaceStore
        .getState()
        .agents.filter((a) =>
          isAgentInZone(a.pos_x, a.pos_y, createdZone.x, createdZone.y, createdZone.width, createdZone.height),
        );
      if (memberAgents.length > 0) {
        void SpaceService.setWorkspaceAgents(
          createdZone.id,
          memberAgents.map((a) => a.id),
        ).catch(() => {});
      }
      showToast(`Created "${preset.name}" room on canvas.`, 'ok');
    };
    window.addEventListener('canvas:spawn-zone', handleSpawnZoneEvent);
    return () => window.removeEventListener('canvas:spawn-zone', handleSpawnZoneEvent);
  }, [rfInstance, addWorkspaceZone, showToast]);

  /** Deploy a hierarchical zone from the library "Deploy Zone" button. */
  useEffect(() => {
    const handleSpawnRoleZoneEvent = (e: Event) => {
      const preset = (e as CustomEvent<RoleZonePreset>).detail;
      if (!preset) return;
      const center = getCanvasCenterScreenPoint();
      const flow = rfInstance?.screenToFlowPosition(center);
      const store = useSpaceStore.getState();
      const centerX = flow?.x ?? 300;
      const centerY = flow?.y ?? 220;
      const centerSpace = store.workspaceZones.find((space) =>
        zoneContainsPoint(space, centerX, centerY),
      );
      if (centerSpace) {
        spawnRoleZoneInSpace(preset, centerX, centerY);
      } else if (store.workspaceZones[0]) {
        const space = store.workspaceZones[0];
        spawnRoleZoneInSpace(
          preset,
          space.x + space.width / 2,
          space.y + space.height / 2,
        );
      } else {
        showToast('Create an Office Space first, then place a zone inside it.', 'warn');
      }
    };
    const handleSpawnHierarchicalChainEvent = (e: Event) => {
      const preset = (e as CustomEvent<{ chain?: HierarchicalChainPreset }>).detail?.chain;
      if (!preset) return;
      const center = getCanvasCenterScreenPoint();
      const flow = rfInstance?.screenToFlowPosition(center);
      spawnHierarchicalChainInSpace(preset, flow?.x, flow?.y);
    };
    const handleSpawnCompanyEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ company: CompanyPreset; scale?: CompanyScale }>).detail;
      if (!detail?.company) return;
      spawnCompanyInSpace(detail.company, detail.scale || 'mid');
    };
    const handleOpenWorkspacePanel = () => {
      const firstSpace = useSpaceStore.getState().workspaceZones[0];
      if (firstSpace) {
        handleOpenWorkspace(firstSpace.id);
      } else {
        showToast('Create an Office Space first, then open its workspace.', 'warn');
      }
    };
    const handleOpenSpaceWorkspaceEvent = (event: Event) => {
      const spaceId = (event as CustomEvent<{ spaceId?: string }>).detail?.spaceId;
      if (spaceId) handleOpenWorkspace(spaceId);
    };
    window.addEventListener('canvas:spawn-role-zone', handleSpawnRoleZoneEvent);
    window.addEventListener('canvas:spawn-hierarchical-chain', handleSpawnHierarchicalChainEvent);
    window.addEventListener('canvas:spawn-company', handleSpawnCompanyEvent);
    window.addEventListener('canvas:open-workspace-panel', handleOpenWorkspacePanel);
    window.addEventListener('canvas:open-space-workspace', handleOpenSpaceWorkspaceEvent);
    return () => {
      window.removeEventListener('canvas:spawn-role-zone', handleSpawnRoleZoneEvent);
      window.removeEventListener('canvas:spawn-hierarchical-chain', handleSpawnHierarchicalChainEvent);
      window.removeEventListener('canvas:spawn-company', handleSpawnCompanyEvent);
      window.removeEventListener('canvas:open-workspace-panel', handleOpenWorkspacePanel);
      window.removeEventListener('canvas:open-space-workspace', handleOpenSpaceWorkspaceEvent);
    };
  }, [handleOpenWorkspace, rfInstance, spawnRoleZoneInSpace, spawnHierarchicalChainInSpace, spawnCompanyInSpace, showToast]);

  /** Double-click spawn from the library panel: land near the viewport centre. */
  const handleSpawnTemplateFromLibrary = useCallback(
    (template: AgentTemplate) => {
      const center = getCanvasCenterScreenPoint();
      const flow = rfInstance?.screenToFlowPosition(center);
      handleSpawnTemplate(template, flow?.x ?? 300, flow?.y ?? 220);
    },
    [rfInstance, handleSpawnTemplate],
  );

  const handleCustomizeTemplate = useCallback(
    (template: AgentTemplate, flowX: number, flowY: number) => {
      setEditingAgent(null);
      setTemplateInitialData({
        name: template.name,
        model: template.default_model,
        provider: template.provider,
        system_prompt: template.system_prompt,
        cron_schedule: template.suggested_cron,
        cron_enabled: template.suggested_cron ? 1 : 0,
        policies: template.policies ? JSON.stringify(template.policies) : '[]',
        recommended_mcps: template.recommended_mcps,
        recommended_skills: template.recommended_skills,
      });
      setNewAgentCoords({ x: flowX, y: flowY });
      setIsAgentModalOpen(true);
    },
    [],
  );

  // ── Native Desktop Menu & System Shortcuts Listener ──
  useEffect(() => {
    const unlisten = onMenuAction((actionId) => {
      switch (actionId) {
        case 'new_agent':
        case 'new_agent_menu':
          handleAddAgentClick();
          break;
        case 'quick_blank_agent':
          AgentService.createAgent({
            name: `Agent ${agents.length + 1}`,
            model: 'anthropic/claude-sonnet-5.5',
            provider: 'anthropic',
            system_prompt: 'You are an autonomous AI specialist working in Smoke Monkey Canvas.',
            pos_x: 320,
            pos_y: 240,
          })
            .then(() => refreshSpace())
            .catch((err) => console.warn('Failed to quick add blank agent:', err));
          break;
        case 'api_keys':
        case 'api_keys_agents':
          setIsSettingsModalOpen(true);
          break;
        case 'fit_view':
        case 'fit_view_agents':
          handleFitViewClick();
          break;
        case 'auto_arrange':
        case 'auto_arrange_agents':
          handleAutoArrange();
          break;
        case 'reset_zoom':
          if (rfInstance) rfInstance.zoomTo(1.0, { duration: 300 });
          break;
        case 'zoom_in':
          if (rfInstance) rfInstance.zoomIn({ duration: 300 });
          break;
        case 'zoom_out':
          if (rfInstance) rfInstance.zoomOut({ duration: 300 });
          break;
        case 'toggle_sidebar':
          window.dispatchEvent(new CustomEvent('canvas-toggle-library'));
          break;
        case 'tab_mcp':
          window.dispatchEvent(new CustomEvent('canvas-set-library-tab', { detail: 'mcp' }));
          break;
        case 'tab_skills':
          window.dispatchEvent(new CustomEvent('canvas-set-library-tab', { detail: 'skills' }));
          break;
        case 'tab_agents':
          window.dispatchEvent(new CustomEvent('canvas-set-library-tab', { detail: 'agents' }));
          break;
        case 'tab_tools':
          window.dispatchEvent(new CustomEvent('canvas-set-library-tab', { detail: 'tools' }));
          break;
        case 'tab_persona':
          window.dispatchEvent(new CustomEvent('canvas-set-library-tab', { detail: 'personality' }));
          break;
        case 'tab_output':
          window.dispatchEvent(new CustomEvent('canvas-set-library-tab', { detail: 'output' }));
          break;
        case 'toggle_theme': {
          const currentIdx = THEMES.findIndex((t) => t.id === currentTheme);
          const nextIdx = (currentIdx + 1) % THEMES.length;
          setTheme(THEMES[nextIdx].id);
          break;
        }
        case 'open_drawer':
          if (activeDrawerAgentId) {
            setActiveDrawerAgentId(null);
          } else if (agents.length > 0) {
            setActiveDrawerAgentId(agents[0].id);
          }
          break;
        case 'check_updates':
          window.dispatchEvent(new CustomEvent('canvas-check-updates'));
          break;
      }
    });

    return unlisten;
  }, [
    handleAddAgentClick,
    handleFitViewClick,
    handleAutoArrange,
    rfInstance,
    agents,
    activeDrawerAgentId,
    setActiveDrawerAgentId,
    currentTheme,
    setTheme,
    refreshSpace,
  ]);

  // Global Canvas Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.closest('.modal-backdrop') ||
          target.closest('.agent-drawer-container'))
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      if (cmdKey && !e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleAddAgentClick();
      } else if (cmdKey && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('canvas-menu-action', { detail: 'quick_blank_agent' }));
      } else if (cmdKey && e.key === ',') {
        e.preventDefault();
        setIsSettingsModalOpen(true);
      } else if (cmdKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('canvas-toggle-library'));
      } else if (cmdKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('canvas-menu-action', { detail: 'toggle_theme' }));
      } else if (cmdKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleAutoArrange();
      } else if (cmdKey && e.key === '0') {
        e.preventDefault();
        if (rfInstance) rfInstance.zoomTo(1.0, { duration: 300 });
      } else if (cmdKey && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        if (rfInstance) rfInstance.zoomIn({ duration: 300 });
      } else if (cmdKey && e.key === '-') {
        e.preventDefault();
        if (rfInstance) rfInstance.zoomOut({ duration: 300 });
      } else if (cmdKey && ['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        e.preventDefault();
        const tabMap: Record<string, string> = {
          '1': 'mcp',
          '2': 'skills',
          '3': 'agents',
          '4': 'tools',
          '5': 'personality',
          '6': 'output',
        };
        window.dispatchEvent(new CustomEvent('canvas-set-library-tab', { detail: tabMap[e.key] }));
      } else if (e.code === 'Space' && !cmdKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        handleFitViewClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAddAgentClick, handleFitViewClick, handleAutoArrange, rfInstance]);

  const handleNodeDragStop = useCallback(
    (_event: unknown, node: CanvasNode) => {
      const { id, position } = node;

      if (id.startsWith('workspace-panel-')) {
        const spaceId =
          (node.data as { space?: { id?: string } }).space?.id ?? id.replace('workspace-panel-', '');
        if (spaceId) {
          useSpaceStore.getState().setPanelPosition(spaceId, position);
        }
        return;
      }

      if (id.startsWith('thread-')) {
        const threadKey = id.replace('thread-', '');
        useSpaceStore.getState().setThreadPosition(threadKey, position);
        return;
      }

      const store = useSpaceStore.getState();
      const zones = store.workspaceZones;
      const targetZone = zones.find((z) => z.id === id);

      // ── Dragging a hierarchical Zone inside its Space ────────────────────
      const roleZone = store.roleZones.find((z) => z.id === id);
      if (roleZone) {
        const containingSpace = roleZone.spaceId
          ? zones.find((z) => z.id === roleZone.spaceId)
          : zones.find((z) =>
              zoneContainsPoint(z, position.x + roleZone.width / 2, position.y + roleZone.height / 2),
            );
        let nextX = position.x;
        let nextY = position.y;
        if (containingSpace) {
          const margin = 8;
          nextX = Math.min(
            Math.max(nextX, containingSpace.x + margin),
            containingSpace.x + containingSpace.width - roleZone.width - margin,
          );
          nextY = Math.min(
            Math.max(nextY, containingSpace.y + margin),
            containingSpace.y + containingSpace.height - roleZone.height - margin,
          );
        }
        const dx = nextX - roleZone.x;
        const dy = nextY - roleZone.y;
        store.updateRoleZone(id, {
          x: Math.round(nextX),
          y: Math.round(nextY),
          spaceId: containingSpace?.id ?? roleZone.spaceId ?? null,
        });
        if (nextX !== position.x || nextY !== position.y) {
          store.setNodes((prev) =>
            prev.map((node) =>
              node.id === id ? { ...node, position: { x: nextX, y: nextY } } : node,
            ),
          );
        }

        // ── Move agents inside this role zone together with it ───────────────
        if (dx !== 0 || dy !== 0) {
          const memberAgents = store.agents.filter((a) =>
            isAgentInZone(a.pos_x, a.pos_y, roleZone.x, roleZone.y, roleZone.width, roleZone.height),
          );
          if (memberAgents.length > 0) {
            const deltas = memberAgents.map((m) => ({
              id: m.id,
              posX: Math.round(m.pos_x + dx),
              posY: Math.round(m.pos_y + dy),
              spaceId: containingSpace?.id ?? null,
            }));
            for (const d of deltas) store.updateNodePositionLocally(d.id, d.posX, d.posY);
            CanvasPositionSync.queueNodePositionsBatch(deltas, true);
          }
        }

        // ── Branch translation: move all subordinate zones together ──────────
        // Collect the entire subtree of children below the dragged zone and
        // shift them by the same (dx, dy) so the hierarchy tree stays intact.
        if (dx !== 0 || dy !== 0) {
          const allZones = store.roleZones;
          const subtreeIds = new Set<string>();
          const queue = [id];
          while (queue.length > 0) {
            const parentId = queue.shift()!;
            for (const z of allZones) {
              if (z.parentZoneId === parentId && !subtreeIds.has(z.id)) {
                subtreeIds.add(z.id);
                queue.push(z.id);
              }
            }
          }
          for (const childId of subtreeIds) {
            const childZone = allZones.find((z) => z.id === childId);
            if (!childZone) continue;
            store.updateRoleZone(childId, {
              x: Math.round(childZone.x + dx),
              y: Math.round(childZone.y + dy),
            });
          }
          if (subtreeIds.size > 0) {
            // Sync the RF node positions so the canvas visually moves the children
            store.setNodes((prev) =>
              prev.map((n) => {
                if (!subtreeIds.has(n.id)) return n;
                return {
                  ...n,
                  position: {
                    x: (n.position?.x ?? 0) + dx,
                    y: (n.position?.y ?? 0) + dy,
                  },
                };
              }),
            );
          }
        }
        return;
      }

      // ── Dragging an entire Workspace Room ────────────────────────────────
      // Members and role zones are translated incrementally by the drag loop in
      // the store. This handler is the fallback flusher: persist their *current*
      // coordinates instead of applying the room delta a second time.
      if (targetZone) {
        const finalX = Math.round(position.x);
        const finalY = Math.round(position.y);
        if (Math.round(targetZone.x) !== finalX || Math.round(targetZone.y) !== finalY) {
          store.updateWorkspaceZone(id, { x: finalX, y: finalY });
        }

        const memberAgents = store.agents.filter((a) =>
          isAgentInZone(a.pos_x, a.pos_y, finalX, finalY, targetZone.width, targetZone.height),
        );
        if (memberAgents.length > 0) {
          CanvasPositionSync.queueNodePositionsBatch(
            memberAgents.map((m) => ({
              id: m.id,
              posX: Math.round(m.pos_x),
              posY: Math.round(m.pos_y),
              spaceId: targetZone.id,
            })),
            true,
          );
        }

        const finalSpace = {
          id: targetZone.id,
          x: finalX,
          y: finalY,
          width: targetZone.width,
          height: targetZone.height,
        };
        for (const rz of store.roleZones) {
          if (roleZoneBelongsToSpace(rz, finalSpace)) {
            store.updateRoleZone(rz.id, { x: Math.round(rz.x), y: Math.round(rz.y) });
          }
        }
        return;
      }

      // ── Dragging an Agent ────────────────────────────────────────────────
      // Update position immediately and preserve the user's manual placement
      const containingSpace = zones.find((space) =>
        zoneContainsPoint(space, position.x, position.y),
      );
      const posX = Math.round(position.x);
      const posY = Math.round(position.y);
      store.updateNodePositionLocally(id, posX, posY);
      CanvasPositionSync.queueNodePosition(id, posX, posY, containingSpace?.id ?? null, true);
    },
    []
  );

  return (
    <div className={`space-container ${currentTheme}`} onClick={handleCloseContextMenu}>
      {/* Space Toolbar */}
      {isMobile ? (
        <SpaceToolbarMobile
          agents={agents}
          currentTheme={currentTheme}
          onSelectTheme={handleSelectTheme}
          onOpenSettings={handleOpenSettingsModal}
          onAddAgent={handleAddAgentClick}
          onFitView={handleFitViewClick}
          onAutoArrange={handleAutoArrange}
        />
      ) : (
        <SpaceToolbar
          agents={agents}
          currentTheme={currentTheme}
          onSelectTheme={handleSelectTheme}
          onOpenSettings={handleOpenSettingsModal}
          onAddAgent={handleAddAgentClick}
          onFitView={handleFitViewClick}
          onAutoArrange={handleAutoArrange}
        />
      )}

      {/* Infinite Canvas */}
      <ReactFlow<CanvasNode, CanvasEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeDragStop={handleNodeDragStop}
        onInit={(instance) => {
          setRfInstance(instance);
          // Restore the last viewport when we have one; otherwise fit like before
          const saved = useSpaceStore.getState().canvasViewport;
          if (saved) {
            instance.setViewport(saved, { duration: 0 });
          } else {
            instance.fitView({ padding: 0.18, duration: 0 });
          }
        }}
        onMoveStart={() => {
          viewportInteractingRef.current = true;
        }}
        onMoveEnd={(_event, viewport) => {
          viewportInteractingRef.current = false;
          const next = { x: viewport.x, y: viewport.y, zoom: viewport.zoom };
          const previous = useSpaceStore.getState().canvasViewport;
          // Programmatic viewport changes (remote sync, restore, fit) end with a
          // value identical to what is already in the store. Persisting those
          // would rebroadcast them and make browsers fight each other forever.
          if (previous && viewportsEqual(previous, next)) return;
          useSpaceStore.getState().setCanvasViewport(next);
          if (!viewportReadyRef.current) return;
          CanvasPositionSync.queueViewportUpdate(next);
          markCanvasViewportPersisted();
        }}
        onPaneContextMenu={handlePaneContextMenu}
        onDragOver={(e) => {
          if (isLibDrag(e.dataTransfer)) {
            e.preventDefault();
            try {
              e.dataTransfer.dropEffect = 'copy';
            } catch {}
          }
        }}
        onDrop={handlePaneDrop}
        minZoom={0.2}
        maxZoom={2.5}
        nodesDraggable={!isCompanyDeploying}
        nodesConnectable={!isCompanyDeploying}
        elementsSelectable={!isCompanyDeploying}
        zoomOnScroll={!isCompanyDeploying}
        zoomOnPinch={!isCompanyDeploying}
        panOnDrag={!isCompanyDeploying}
        panOnScroll={!isCompanyDeploying}
        preventScrolling={true}
        onlyRenderVisibleElements={false}
      >
        <Background variant={BackgroundVariant.Lines} gap={36} size={1} color={gridLineColor} />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>

      {/* Draggable Library Sidebar (MCP / Skills / Agents / Toolkits) */}
      <LibrarySidebar
        stockMcps={stockMcps}
        configuredKeys={configuredKeys}
        personalityPresets={allPersonalities}
        outputStylePresets={allOutputStyles}
        serverStockSkills={libraryStockSkills}
        onConnectKey={handleConnectKey}
        onDisconnectKey={handleDisconnectKey}
        mcpReadiness={mcpReadiness}
        onSpawnTemplate={handleSpawnTemplateFromLibrary}
        connectingMcpName={connectingMcpName}
        roleZones={roleZones}
        isDeployingCompany={isCompanyDeploying}
      />

      {/* Live Enterprise Company Deployment Progress Banner */}
      {companyDeployment && (
        <div className="company-deployment-banner" role="status">
          <div className="company-deployment-content">
            <div className="company-deployment-header">
              <div className="company-deployment-title-wrap">
                {companyDeployment.phase === 'completed' ? (
                  <CheckCircle2 size={16} className="company-deployment-icon completed" />
                ) : (
                  <Loader2 size={16} className="company-deployment-icon spinning" />
                )}
                <span className="company-deployment-name">{companyDeployment.companyName}</span>
              </div>
              <span className="company-deployment-count">
                {companyDeployment.current} / {companyDeployment.total} Agents
              </span>
            </div>

            <div className="company-deployment-progress-track">
              <div
                className={`company-deployment-progress-fill ${companyDeployment.phase === 'completed' ? 'completed' : ''}`}
                style={{
                  width: `${Math.round((companyDeployment.current / Math.max(1, companyDeployment.total)) * 100)}%`,
                }}
              />
            </div>

            <div className="company-deployment-detail">
              <span className="company-deployment-agent-name">{companyDeployment.currentAgentName}</span>
              <span className="company-deployment-role-title">({companyDeployment.currentRoleTitle})</span>
            </div>

            {/* ⚠️ Data-loss warning — only shown while actively spawning */}
            {companyDeployment.phase !== 'completed' && (
              <div className="company-deployment-data-loss-warning" role="alert">
                <AlertTriangle size={11} style={{ flexShrink: 0 }} />
                <span>Draft in progress — do not close or refresh this tab to avoid data loss.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attach feedback */}
      {toast && (
        <div className={`lib-toast ${toast.tone}`} role="status">
          <span className="lib-toast-icon-wrap">
            {toast.tone === 'ok' ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
          </span>
          <span className="lib-toast-text">{toast.text}</span>
        </div>
      )}

      {/* Destructive confirmation (replaces window.confirm) */}
      <LazyMount open={pendingDeleteAgentId !== null}>
        <ConfirmDialog
          isOpen={pendingDeleteAgentId !== null}
          tone="danger"
          title="Remove agent from space"
          confirmLabel="Remove agent"
          message={
            <>
              <strong>{agents.find((a) => a.id === pendingDeleteAgentId)?.name ?? 'This agent'}</strong> will be
              permanently deleted, along with its run history, chat sessions and attached MCPs and skills.
              This cannot be undone.
            </>
          }
          onConfirm={confirmDeleteAgent}
          onCancel={cancelDeleteAgent}
        />
      </LazyMount>

      <LazyMount open={pendingDeleteRoleZoneId !== null}>
        <ConfirmDialog
          isOpen={pendingDeleteRoleZoneId !== null}
          tone="danger"
          title="Delete designation zone"
          confirmLabel="Delete zone"
          message={
            <>
              <strong>{roleZones.find((z) => z.id === pendingDeleteRoleZoneId)?.roleTitle ?? 'This zone'}</strong>{' '}
              will be removed from its Space. Agents stay where they are and lose this designation and reporting
              line. This cannot be undone.
            </>
          }
          onConfirm={() => {
            if (pendingDeleteRoleZoneId) removeRoleZone(pendingDeleteRoleZoneId);
            setPendingDeleteRoleZoneId(null);
          }}
          onCancel={() => setPendingDeleteRoleZoneId(null)}
        />
      </LazyMount>

      <LazyMount open={isRoleZoneBuilderOpen}>
        <ZoneBuilderModal
          isOpen={isRoleZoneBuilderOpen}
          initial={editingRoleZone}
          zones={roleZones}
          title={editingRoleZone ? 'Edit Zone' : 'Create Zone'}
          saveLabel={editingRoleZone ? 'Save Zone' : 'Create Zone'}
          onSave={handleSaveRoleZone}
          onClose={() => {
            setIsRoleZoneBuilderOpen(false);
            setEditingRoleZone(null);
          }}
        />
      </LazyMount>

      <LazyMount open={pendingDeleteSpaceTarget !== null}>
        <SpaceDeleteModal
          isOpen={pendingDeleteSpaceTarget !== null}
          space={pendingDeleteSpaceTarget?.space ?? null}
          memberAgents={pendingDeleteSpaceTarget?.memberAgents ?? []}
          memberZones={pendingDeleteSpaceTarget?.memberZones ?? []}
          busy={isDeletingSpace}
          onConfirm={handleConfirmSpaceDelete}
          onCancel={() => {
            if (!isDeletingSpace) setPendingDeleteSpaceTarget(null);
          }}
        />
      </LazyMount>

      {/* Right Click Context Menu (Desktop only) */}
      {!isMobile && (
        <SpaceContextMenu
          state={contextMenu}
          onAddAgent={(flowX, flowY) => {
            setEditingAgent(null);
            setTemplateInitialData(null);
            setNewAgentCoords({ x: flowX, y: flowY });
            setIsAgentModalOpen(true);
          }}
          onSpawnTemplate={handleSpawnTemplate}
          onCustomizeTemplate={handleCustomizeTemplate}
          onClose={handleCloseContextMenu}
        />
      )}

      {/* Agent Modal */}
      <LazyMount open={isAgentModalOpen}>
        <AgentModal
          isOpen={isAgentModalOpen}
          agent={editingAgent}
          initialData={templateInitialData}
          initialCoords={newAgentCoords}
          initialSection={agentModalSection}
          onSave={handleSaveAgent}
          onOpenKeys={() => setIsSettingsModalOpen(true)}
          onClose={() => {
            setIsAgentModalOpen(false);
            setEditingAgent(null);
            setTemplateInitialData(null);
            setAgentModalSection('general');
          }}
        />
      </LazyMount>

      {/* MCP Modal */}
      <LazyMount open={!!mcpModalAgentId}>
        <McpModal
          isOpen={!!mcpModalAgentId}
          agentId={mcpModalAgentId}
          initialMcpName={mcpModalInitialName}
          attachedMcpNames={
            agents.find((a) => a.id === mcpModalAgentId)?.mcps.map((m) => m.mcp_name) || []
          }
          onAttach={handleAttachMcp}
          onClose={() => {
            setMcpModalAgentId(null);
            setMcpModalInitialName(null);
          }}
        />
      </LazyMount>

      {/* Skill Modal */}
      <LazyMount open={!!skillModalAgentId}>
        <SkillModal
          isOpen={!!skillModalAgentId}
          agentId={skillModalAgentId}
          onAttach={handleAttachSkill}
          onClose={() => setSkillModalAgentId(null)}
        />
      </LazyMount>

      {/* Tools Modal (Allowed Tools Configuration) */}
      <LazyMount open={!!toolsModalAgent}>
        <ToolsModal
          isOpen={!!toolsModalAgent}
          agent={toolsModalAgent}
          onSaveDisabledTools={handleSaveDisabledTools}
          onClose={() => setToolsModalAgent(null)}
        />
      </LazyMount>

      {/* Policy Modal (Guardrails & Boundaries) */}
      <LazyMount open={!!policyModalAgent}>
        <PolicyModal
          isOpen={!!policyModalAgent}
          agent={policyModalAgent}
          onSavePolicies={handleSavePolicies}
          onClose={() => setPolicyModalAgent(null)}
        />
      </LazyMount>

      {/* Secure API Keys & Settings Modal */}
      <LazyMount open={isSettingsModalOpen}>
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
        />
      </LazyMount>

      {/* Slide-Over Drawer */}
      <LazyMount open={activeDrawerAgent !== null}>
        <AgentDrawer
          agent={activeDrawerAgent}
          canvasTheme={currentTheme}
          onRunNow={handleRunAgent}
          onStopNow={handleStopAgent}
          onConfigureMcp={handleAddMcp}
          onClose={handleCloseDrawer}
        />
      </LazyMount>

      {/* Premium Spatial Workspace Boot Loader */}
      <AppLoader isReady={isAppReady} />
    </div>
  );
};
