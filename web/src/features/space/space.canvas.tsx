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
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import type { SpaceAgentEntity, AgentRecord, AgentConnectionRecord } from '../agent/agent.types.js';
import type { SpaceContextMenuState } from './space.types.js';
import { CrabAgentNode } from '../agent/agent.crab-node.js';
import { SpaceToolbar, type ThemeMode, THEMES } from './space.toolbar.js';
import { SpaceToolbarMobile } from './mobile/space-toolbar.mobile.js';
import { useIsMobile } from '../common/use-mobile.js';
import { SpaceContextMenu } from './space.context-menu.js';
import { onMenuAction, isTauri, openExternalLink } from '../../config/desktop.bridge.js';
import { AgentModal } from '../agent/agent.modal.js';
import { McpModal } from '../mcp/mcp.modal.js';
import { SkillModal } from '../skill/skill.modal.js';
import { SettingsModal } from '../settings/settings.modal.js';
import { AgentDrawer, type LiveLogEvent } from '../agent/agent.drawer.js';
import { ToolsModal } from '../tools/tools.modal.js';
import { PolicyModal } from '../policy/policy.modal.js';
import { ConfirmDialog } from '../common/confirm-dialog.js';
import type { SkillInput } from '../skill/skill.types.js';
import type { AgentTemplate } from '../agent/agent.templates.js';
import type { StockMcp } from '../mcp/mcp.types.js';
import type { McpReadiness } from '../mcp/mcp.types.js';
import { McpService } from '../mcp/mcp.service.js';
import { resolveStockMcp } from '../mcp/mcp.catalog.js';
import { LibrarySidebar } from '../library/library-sidebar.js';
import { CUSTOM_PLUGINS, pluginToSkillItem } from '../library/library.plugins.js';
import { readLibDragPayload, isLibDrag, setActiveDragPayload, type LibDragPayload, type PromptPreset, type RoleZonePreset, type StockSkillItem, type WorkspaceZonePreset, type HierarchicalChainPreset } from '../library/library.types.js';
import { layoutHierarchicalChain } from '../library/library.data.js';
import { useSpaceStore, isAgentInZone, type GroupWorkspaceZone, type RoleZone } from './space.store.js';
import { AppLoader } from '../common/app-loader.js';
import { ThreadProcessNode } from './thread-process-node.js';
import { ThreadConnectionEdge } from './thread-edge.js';
import { AgentAssetsNode } from './agent-assets-node.js';
import { AssetsConnectionEdge } from './assets-edge.js';
import { AgentPeerEdge } from './agent-peer-edge.js';
import { GroupWorkspaceNode } from './group-workspace-node.js';
import { RoleZoneNode } from './role-zone-node.js';
import { HierarchyConnectionEdge } from './hierarchy-edge.js';
import { WorkspacePanelNode } from './workspace-panel-node.js';
import { ZoneBuilderModal, type ZoneDraft } from './zone-builder.modal.js';
import { resolveZoneAt, zoneContainsPoint } from './space.zones.js';
import { type CanvasNode, type CanvasEdge, CONNECTOR_EDGE_Z } from './space.types.js';
import type { ActiveRunRecord } from '../agent/agent.types.js';

const NODE_TYPES: NodeTypes = {
  crabAgent: CrabAgentNode,
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
  const isMobile = useIsMobile();
  const [activeWorkspaceSpaceId, setActiveWorkspaceSpaceId] = useState<string | null>(null);

  const activeWorkspaceSpace = useMemo(
    () => workspaceZones.find((space) => space.id === activeWorkspaceSpaceId) ?? null,
    [workspaceZones, activeWorkspaceSpaceId],
  );

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

  // 1. Initial Load of Space Entities
  const refreshSpace = useCallback(async () => {
    try {
      const [data, connList] = await Promise.all([
        SpaceService.fetchSpaceAgents(),
        AgentService.fetchConnections().catch(() => []),
      ]);
      setAgents(data);
      setConnections(connList);
      setIsAppReady(true);
    } catch (err) {
      console.error('[SpaceCanvas] Failed refreshing space:', err);
      setIsAppReady(true);
    }
  }, []);

  useEffect(() => {
    refreshSpace();
  }, [refreshSpace]);

  // Hydrate hierarchical zones from the server once. Visual spaces remain the
  // local canvas rooms; zones are designation overlays placed inside them.
  const didHydrateRoleZonesRef = useRef(false);
  useEffect(() => {
    if (didHydrateRoleZonesRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const zones = await SpaceService.fetchZones();
        if (cancelled) return;
        const spaces = useSpaceStore.getState().workspaceZones;
        setRoleZones(
          zones.map((zone) => {
            const persistedSpace = zone.spaceId
              ? spaces.find((space) => space.id === zone.spaceId)
              : undefined;
            const inferredSpace =
              persistedSpace ??
              spaces.find((space) =>
                zoneContainsPoint(space, zone.x + zone.width / 2, zone.y + zone.height / 2),
              );
            return { ...zone, spaceId: inferredSpace?.id ?? null };
          }),
        );
        didHydrateRoleZonesRef.current = true;
      } catch (err) {
        console.warn('[SpaceCanvas] Failed to hydrate role zones:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setRoleZones]);

  // Active Running Instances & Threads per Agent
  const [activeRunsMap, setActiveRunsMap] = useState<Record<string, ActiveRunRecord[]>>({});

  const refreshActiveRuns = useCallback(async () => {
    try {
      const activeMap: Record<string, ActiveRunRecord[]> = {};
      await Promise.all(
        agents.map(async (ag) => {
          try {
            const runs = await AgentService.fetchActiveRuns(ag.id);
            if (Array.isArray(runs) && runs.length > 0) {
              activeMap[ag.id] = runs;
            }
          } catch {}
        }),
      );
      setActiveRunsMap(activeMap);
    } catch {}
  }, [agents]);

  useEffect(() => {
    refreshActiveRuns();
    const interval = setInterval(refreshActiveRuns, 3000);
    return () => clearInterval(interval);
  }, [refreshActiveRuns]);

  const handleToggleAgentThreads = useCallback(
    (agentId: string) => {
      toggleAgentThreadsVisible(agentId);
    },
    [toggleAgentThreadsVisible],
  );

  // 2. Action Handlers for Agent Crab Nodes (Stabilized references to avoid re-rendering nodes)
  const handleRunAgent = useCallback(async (id: string, customPrompt?: string) => {
    try {
      await AgentService.triggerRun(id, customPrompt);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to trigger run');
    }
  }, []);

  const handleStopAgent = useCallback(async (id: string) => {
    try {
      await AgentService.stopAgent(id);
      setAgents((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: a.cron_enabled ? 'scheduled' : 'idle' } : a)),
      );
      refreshSpace();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to stop agent');
    }
  }, [refreshSpace]);

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
      const el = document.querySelector('.react-flow__viewport');
      const rect = el?.getBoundingClientRect();
      const centerX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const centerY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
      const flow = rfInstance?.screenToFlowPosition({ x: centerX, y: centerY });
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
      void SpaceService.setWorkspaceAgents(spaceId, []).catch(() => {
        // Removing the local space is still safe if the server is unavailable.
      });
      setActiveWorkspaceSpaceId((current) => (current === spaceId ? null : current));
      removeWorkspaceZone(spaceId);
    },
    [removeWorkspaceZone],
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

  /** Fit agents neatly inside a designation zone without moving them out. */
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
    const { cols, slotW, slotH, cardWidth, cardHeight } = getZoneGridMetrics(
      zone.width,
      zone.height,
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
      const existingNode = useSpaceStore.getState().nodes.find((n) => n.id === a.id);
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
      const existingNode = useSpaceStore.getState().nodes.find((n) => n.id === agent.id);
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

    // Build peer delegation edges
    for (const conn of connections) {
      const sourceAgent = agents.find((a) => a.id === conn.source_agent_id);
      const targetAgent = agents.find((a) => a.id === conn.target_agent_id);
      if (sourceAgent && targetAgent) {
        // Dynamic Miro-style smart routing based on relative placement
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

        // Check if both agents are inside the same workspace zone (pod)
        const srcZoneId = agentAssignedZoneMap.get(conn.source_agent_id);
        const tgtZoneId = agentAssignedZoneMap.get(conn.target_agent_id);
        const isInSamePod = Boolean(srcZoneId && srcZoneId === tgtZoneId);
        const commonZone = isInSamePod ? workspaceZones.find((z) => z.id === srcZoneId) : undefined;

        // Active calling status: true when either connected peer is currently executing/calling
        const isSourceRunning = sourceAgent.status === 'running' || (activeRunsMap[sourceAgent.id]?.length ?? 0) > 0;
        const isTargetRunning = targetAgent.status === 'running' || (activeRunsMap[targetAgent.id]?.length ?? 0) > 0;
        const isActivelyCalling = isSourceRunning || isTargetRunning;

        nextEdges.push({
          id: `peer-${conn.id}`,
          source: conn.source_agent_id,
          sourceHandle: 'peer-source',
          target: conn.target_agent_id,
          targetHandle,
          type: 'peerEdge',
          zIndex: CONNECTOR_EDGE_Z,
          animated: isActivelyCalling,
          className: isInSamePod ? `pod-peer-edge ${isActivelyCalling ? 'is-calling' : ''}` : (isActivelyCalling ? 'is-calling' : ''),
          data: {
            connectionId: conn.id,
            sourceAgentId: conn.source_agent_id,
            targetAgentId: conn.target_agent_id,
            sourceAgentName: sourceAgent.name,
            targetAgentName: targetAgent.name,
            targetRole: targetAgent.role || undefined,
            targetSpecialty: targetAgent.specialty || undefined,
            isInPod: isInSamePod,
            isActivelyCalling,
            podName: commonZone?.name,
            podColor: commonZone?.color,
            onDisconnect: async (connectionId?: string) => {
              if (connectionId) {
                try {
                  await AgentService.deleteConnection(connectionId);
                  setConnections((prev) => prev.filter((c) => c.id !== connectionId));
                  showToast(`Disconnected ${sourceAgent.name} and ${targetAgent.name}.`, 'ok');
                } catch (err: any) {
                  showToast(err.message || 'Failed to disconnect agents', 'warn');
                }
              }
            },
          },
        });
      }
    }

    // Hierarchical designation edges between role zones
    for (const zone of roleZones) {
      if (!zone.parentZoneId) continue;
      const parent = roleZones.find((candidate) => candidate.id === zone.parentZoneId);
      if (!parent) continue;
      nextEdges.push({
        id: `role-hierarchy-${zone.id}`,
        source: parent.id,
        sourceHandle: 'role-zone-child',
        target: zone.id,
        targetHandle: 'role-zone-parent',
        type: 'hierarchyEdge',
        zIndex: CONNECTOR_EDGE_Z,
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
        return {
          ...prev,
          ...an,
          position: prev?.position ? { ...prev.position } : an.position,
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
        };
      });

      // Generate and reconcile workspace zone room nodes (rendered with zIndex: -1 behind agents)
      const zoneNodes: CanvasNode[] = workspaceZones.map((z) => {
        const prev = prevMap.get(z.id);
        const finalPosition = prev?.position ? { ...prev.position } : { x: z.x, y: z.y };
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
          zIndex: -5,
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
            workspaceZoneCount: roleZones.filter((zone) => zone.spaceId === z.id).length,
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
        return {
          id: zone.id,
          type: 'roleZone',
          dragHandle: '.role-zone-drag-surface',
          position: prev?.position ? { ...prev.position } : { x: zone.x, y: zone.y },
          style: { width: zone.width, height: zone.height },
          zIndex: -2,
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
        const panelWidth = Math.max(300, Math.min(392, activeSpace.width - 32));
        const panelHeight = Math.max(200, Math.min(620, activeSpace.height - 112));
        const maxX = Math.max(8, activeSpace.width - panelWidth - 8);
        const maxY = Math.max(8, activeSpace.height - panelHeight - 8);
        const clamp = (value: number, min: number, max: number) =>
          Math.min(Math.max(value, min), max);
        const prevPos = prevPanel?.position ?? panelPositions[activeSpace.id];
        const panelPosition = prevPos
          ? {
              x: clamp(prevPos.x, 8, maxX),
              y: clamp(prevPos.y, 8, maxY),
            }
          : { x: maxX, y: Math.min(56, maxY) };

        workspacePanelNodes.push({
          id: panelId,
          type: 'workspacePanel',
          parentId: activeSpace.id,
          extent: 'parent',
          position: panelPosition,
          style: { width: panelWidth, height: panelHeight },
          dragHandle: '.workspace-panel-header',
          zIndex: 20,
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

      return [
        ...zoneNodes,
        ...workspacePanelNodes,
        ...roleZoneNodes,
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
        refreshActiveRuns();
      } else if (msg.type === 'node_moved' && msg.agentId) {
        const { posX, posY } = (msg.data as { posX: number; posY: number }) || {};
        if (typeof posX === 'number' && typeof posY === 'number') {
          updateNodePositionLocally(msg.agentId, posX, posY);
        }
      } else if (msg.type === 'cron_tick' && msg.agentId) {
        const { nextRunAt } = (msg.data as { nextRunAt?: string }) || {};
        updateAgentCron(msg.agentId, nextRunAt);
        refreshActiveRuns();
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
        refreshActiveRuns();
      } else if (msg.type === 'run_completed' && msg.agentId) {
        // Keep celebratory smile face for 7.5s, then gracefully return to idle
        useSpaceStore.getState().setAgentMood(msg.agentId, 'completed', (msg.data as any)?.summary || 'Task completed!', 7500);
        refreshSpace();
        refreshActiveRuns();
      } else if (msg.type === 'run_failed' && msg.agentId) {
        useSpaceStore.getState().setAgentMood(msg.agentId, 'error', (msg.data as any)?.error || 'Task failed', 6000);
        refreshSpace();
        refreshActiveRuns();
      } else if (msg.type === 'run_completed' || msg.type === 'run_failed') {
        refreshSpace();
        refreshActiveRuns();
      } else if (
        msg.type === 'agent_updated' ||
        msg.type === 'agent_manifest_updated' ||
        msg.type === 'agent_files_updated' ||
        msg.type === 'agent_skills_updated' ||
        msg.type === 'agent_mcps_updated' ||
        msg.type === 'agent_cron_jobs_updated'
      ) {
        refreshSpace();
      }
    });

    return cleanupWs;
  }, [refreshSpace, refreshActiveRuns, updateAgentStatus, updateNodePositionLocally, updateAgentCron]);

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
    if (!rfInstance) return;

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
        alert(err instanceof Error ? err.message : 'Failed to spawn enterprise agent');
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
    ],
  );

  /** Deploy workspace room from Library "+ Deploy Room" button */
  useEffect(() => {
    const handleSpawnZoneEvent = (e: Event) => {
      const preset = (e as CustomEvent<WorkspaceZonePreset>).detail;
      if (!preset) return;
      const el = document.querySelector('.react-flow__viewport');
      const rect = el?.getBoundingClientRect();
      const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
      const flow = rfInstance?.screenToFlowPosition({ x: cx, y: cy });
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
      const el = document.querySelector('.react-flow__viewport');
      const rect = el?.getBoundingClientRect();
      const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
      const flow = rfInstance?.screenToFlowPosition({ x: cx, y: cy });
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
      const el = document.querySelector('.react-flow__viewport');
      const rect = el?.getBoundingClientRect();
      const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
      const flow = rfInstance?.screenToFlowPosition({ x: cx, y: cy });
      spawnHierarchicalChainInSpace(preset, flow?.x, flow?.y);
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
    window.addEventListener('canvas:open-workspace-panel', handleOpenWorkspacePanel);
    window.addEventListener('canvas:open-space-workspace', handleOpenSpaceWorkspaceEvent);
    return () => {
      window.removeEventListener('canvas:spawn-role-zone', handleSpawnRoleZoneEvent);
      window.removeEventListener('canvas:spawn-hierarchical-chain', handleSpawnHierarchicalChainEvent);
      window.removeEventListener('canvas:open-workspace-panel', handleOpenWorkspacePanel);
      window.removeEventListener('canvas:open-space-workspace', handleOpenSpaceWorkspaceEvent);
    };
  }, [handleOpenWorkspace, rfInstance, spawnRoleZoneInSpace, spawnHierarchicalChainInSpace, showToast]);

  /** Double-click spawn from the library panel: land near the viewport centre. */
  const handleSpawnTemplateFromLibrary = useCallback(
    (template: AgentTemplate) => {
      const el = document.querySelector('.react-flow__viewport');
      const rect = el?.getBoundingClientRect();
      const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
      const flow = rfInstance?.screenToFlowPosition({ x: cx, y: cy });
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
          for (const m of memberAgents) {
            const nextAX = Math.round(m.pos_x + dx);
            const nextAY = Math.round(m.pos_y + dy);
            store.updateNodePositionLocally(m.id, nextAX, nextAY);
            SpaceService.updateNodePosition(m.id, nextAX, nextAY, containingSpace?.id ?? null);
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
      // Move all member agents along with the room so they stay securely inside
      if (targetZone) {
        const dx = position.x - targetZone.x;
        const dy = position.y - targetZone.y;
        store.updateWorkspaceZone(id, { x: Math.round(position.x), y: Math.round(position.y) });

        if (dx !== 0 || dy !== 0) {
          const memberAgents = store.agents.filter((a) =>
            isAgentInZone(a.pos_x, a.pos_y, targetZone.x, targetZone.y, targetZone.width, targetZone.height)
          );
          for (const m of memberAgents) {
            const nextX = Math.round(m.pos_x + dx);
            const nextY = Math.round(m.pos_y + dy);
            store.updateNodePositionLocally(m.id, nextX, nextY);
            SpaceService.updateNodePosition(m.id, nextX, nextY, targetZone.id);
          }

          // Translate all hierarchical role zones belonging to this space
          const containedRoleZones = store.roleZones.filter((rz) => rz.spaceId === targetZone.id);
          for (const rz of containedRoleZones) {
            const nextX = Math.round(rz.x + dx);
            const nextY = Math.round(rz.y + dy);
            store.updateRoleZone(rz.id, { x: nextX, y: nextY });
          }
        }
        return;
      }

      // ── Dragging an Agent ────────────────────────────────────────────────
      // Update position immediately and preserve the user's manual placement
      const containingSpace = zones.find((space) =>
        zoneContainsPoint(space, position.x, position.y),
      );
      store.updateNodePositionLocally(id, Math.round(position.x), Math.round(position.y));
      SpaceService.updateNodePosition(
        id,
        Math.round(position.x),
        Math.round(position.y),
        containingSpace?.id ?? null,
      );
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
        onMoveEnd={(_event, viewport) =>
          useSpaceStore.getState().setCanvasViewport(viewport)
        }
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
        panOnDrag={true}
        zoomOnPinch={true}
        preventScrolling={true}
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
      />

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

      {/* MCP Modal */}
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

      {/* Skill Modal */}
      <SkillModal
        isOpen={!!skillModalAgentId}
        agentId={skillModalAgentId}
        onAttach={handleAttachSkill}
        onClose={() => setSkillModalAgentId(null)}
      />

      {/* Tools Modal (Allowed Tools Configuration) */}
      <ToolsModal
        isOpen={!!toolsModalAgent}
        agent={toolsModalAgent}
        onSaveDisabledTools={handleSaveDisabledTools}
        onClose={() => setToolsModalAgent(null)}
      />

      {/* Policy Modal (Guardrails & Boundaries) */}
      <PolicyModal
        isOpen={!!policyModalAgent}
        agent={policyModalAgent}
        onSavePolicies={handleSavePolicies}
        onClose={() => setPolicyModalAgent(null)}
      />

      {/* Secure API Keys & Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      {/* Slide-Over Drawer */}
      <AgentDrawer
        agent={activeDrawerAgent}
        canvasTheme={currentTheme}
        onRunNow={handleRunAgent}
        onStopNow={handleStopAgent}
        onConfigureMcp={handleAddMcp}
        onClose={handleCloseDrawer}
      />

      {/* Premium Spatial Workspace Boot Loader */}
      <AppLoader isReady={isAppReady} />
    </div>
  );
};
