import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type NodeTypes,
  type ReactFlowInstance,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { SpaceService } from './space.service.js';
import { AgentService } from '../agent/agent.service.js';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import type { SpaceAgentEntity, AgentRecord } from '../agent/agent.types.js';
import type { SpaceContextMenuState, AgentNode } from './space.types.js';
import { CrabAgentNode } from '../agent/agent.crab-node.js';
import { SpaceToolbar, type ThemeMode } from './space.toolbar.js';
import { SpaceContextMenu } from './space.context-menu.js';
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
import { LibrarySidebar } from '../library/library-sidebar.js';
import { readLibDragPayload, LIB_DRAG_KEY, type LibDragPayload, type PromptPreset, type StockSkillItem } from '../library/library.types.js';
import { useSpaceStore } from './space.store.js';

const NODE_TYPES: NodeTypes = {
  crabAgent: CrabAgentNode,
};

export const SpaceCanvas: React.FC = () => {
  const currentTheme = useSpaceStore((s) => s.currentTheme);
  const setTheme = useSpaceStore((s) => s.setTheme);
  const agents = useSpaceStore((s) => s.agents);
  const nodes = useSpaceStore((s) => s.nodes);
  const setAgents = useSpaceStore((s) => s.setAgents);
  const setNodes = useSpaceStore((s) => s.setNodes);
  const onNodesChange = useSpaceStore((s) => s.onNodesChange);
  const updateAgentStatus = useSpaceStore((s) => s.updateAgentStatus);
  const updateAgentCron = useSpaceStore((s) => s.updateAgentCron);
  const updateNodePositionLocally = useSpaceStore((s) => s.updateNodePositionLocally);
  const activeDrawerAgentId = useSpaceStore((s) => s.activeDrawerAgentId);
  const setActiveDrawerAgentId = useSpaceStore((s) => s.setActiveDrawerAgentId);

  const [rfInstance, setRfInstance] = useState<ReactFlowInstance<AgentNode> | null>(null);

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
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<SpaceAgentEntity | null>(null);
  const [agentModalSection, setAgentModalSection] = useState<'general' | 'directory' | 'schedule'>('general');
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

  const refreshConfiguredKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/keys');
      if (!res.ok) return;
      const data = (await res.json()) as Record<string, { masked: string; isSet: boolean }>;
      const next: Record<string, boolean> = {};
      for (const [key, val] of Object.entries(data)) next[key] = Boolean(val?.isSet);
      setConfiguredKeys(next);
    } catch {
      /* non-fatal: library simply shows everything as locked */
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

    refreshConfiguredKeys();
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

  // 1. Initial Load of Space Entities
  const refreshSpace = useCallback(async () => {
    try {
      const data = await SpaceService.fetchSpaceAgents();
      setAgents(data);
    } catch (err) {
      console.error('[SpaceCanvas] Failed refreshing space:', err);
    }
  }, []);

  useEffect(() => {
    refreshSpace();
  }, [refreshSpace]);

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

  const handleEditAgent = useCallback((agent: SpaceAgentEntity, section: 'general' | 'directory' | 'schedule' = 'general') => {
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
  }, [setActiveDrawerAgentId]);

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
    await AgentService.updateAgentDisabledTools(agentId, disabledTools);
    await refreshSpace();
  }, [refreshSpace]);

  const handleSavePolicies = useCallback(async (agentId: string, policies: string[]) => {
    await AgentService.updateAgentPolicies(agentId, policies);
    await refreshSpace();
  }, [refreshSpace]);

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

  // ── Library: connect a credential for a locked stock MCP ─────────────────
  // Reuses the server's OAuth consent route, then refreshes readiness so the
  // library item flips to "ready" and the agent's run button re-enables.
  const handleConnectKey = useCallback(
    (mcp: StockMcp) => {
      refreshConfiguredKeys();
      const popupWidth = 480;
      const popupHeight = 640;
      const left = Math.max(0, window.screenX + (window.outerWidth - popupWidth) / 2);
      const top = Math.max(0, window.screenY + (window.outerHeight - popupHeight) / 2);
      window.open(
        `/api/mcp/oauth/${mcp.name}/authorize`,
        `Connect_${mcp.name}`,
        `width=${popupWidth},height=${popupHeight},left=${left},top=${top}`,
      );
      showToast(`Connect ${mcp.label} in the popup to unlock it.`, 'warn');
    },
    [refreshConfiguredKeys, showToast],
  );

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

  // ── Library: attach a dropped item to an agent node ──────────────────────
  const handleLibraryDrop = useCallback(
    async (agentId: string, payload: LibDragPayload) => {
      const agent = agents.find((a) => a.id === agentId);
      const agentLabel = agent?.name ?? 'agent';

      try {
        if (payload.kind === 'mcp' && payload.mcp) {
          const { mcp } = payload;
          const already = agent?.mcps?.some((x) => x.mcp_name === mcp.name);
          if (already) {
            showToast(`${mcp.label} is already attached to ${agentLabel}.`, 'warn');
            return;
          }
          // allowUnconfigured so an unkeyed MCP still attaches in a locked state;
          // the run button stays disabled until its credentials are stored.
          await AgentService.addMcp(agentId, {
            mcp_name: mcp.name,
            label: mcp.label,
            config: { command: mcp.command, args: mcp.args, url: mcp.url, env: {} },
            allowUnconfigured: true,
          });
          const ready = mcp.envKeys.length === 0 || mcp.envKeys.every((k) => configuredKeys[k]);
          showToast(
            ready
              ? `${mcp.label} attached to ${agentLabel} — ready to run.`
              : `${mcp.label} attached but needs ${mcp.envKeys.join(', ')}.`,
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
            const res = await fetch(`/api/agents/${agentId}/personalities`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: preset.id }),
            });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to set personality');
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
            const res = await fetch(`/api/agents/${agentId}/output-styles`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: preset.id }),
            });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to set output style');
            showToast(`${preset.name} output format set on ${agentLabel}.`, 'ok');
          }
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to attach library item', 'warn');
      }
      await refreshSpace();
    },
    [agents, configuredKeys, refreshSpace, showToast],
  );

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

  // 3. Map Agents into ReactFlow Nodes (Reuses exact node objects if data didn't change)
  useEffect(() => {
    setNodes((prevNodes) => {
      const prevMap = new Map(prevNodes.map((n) => [n.id, n]));
      let hasChanges = false;

      const nextNodes = agents.map((agent) => {
        const existing = prevMap.get(agent.id);
        const position = existing ? existing.position : { x: agent.pos_x, y: agent.pos_y };

        // Deep comparison for MCPs & Skills & LatestRun to keep stable object references
        const mcpsEqual =
          existing?.data.mcps?.length === agent.mcps?.length &&
          existing?.data.mcps?.every((m, idx) => m.id === agent.mcps[idx]?.id);
        const skillsEqual =
          existing?.data.skills?.length === agent.skills?.length &&
          existing?.data.skills?.every((s, idx) => s.id === agent.skills[idx]?.id);
        const latestRunEqual =
          existing?.data.latestRun?.id === agent.latestRun?.id &&
          existing?.data.latestRun?.status === agent.latestRun?.status &&
          existing?.data.latestRun?.summary === agent.latestRun?.summary;

        // If data hasn't changed, reuse the exact existing object reference to prevent node re-render!
        if (
          existing &&
          existing.data.name === agent.name &&
          existing.data.model === agent.model &&
          existing.data.provider === agent.provider &&
          existing.data.status === agent.status &&
          existing.data.system_prompt === agent.system_prompt &&
          existing.data.cron_schedule === agent.cron_schedule &&
          existing.data.cron_enabled === agent.cron_enabled &&
          existing.data.next_run_at === agent.next_run_at &&
          existing.data.last_run_at === agent.last_run_at &&
          existing.data.disabled_tools === agent.disabled_tools &&
          existing.data.policies === agent.policies &&
          // Same trap as activeVoiceAgentId below: without these the node object
          // is reused and the new voice/format badges never appear.
          existing.data.personalities === agent.personalities &&
          existing.data.output_styles === agent.output_styles &&
          // Voice popover state lives on the node, not the agent. Without this the
          // reuse shortcut hands back the stale node object, `activeVoiceAgentId`
          // never reaches the node, and the mic popover can never open.
          existing.data.activeVoiceAgentId === activeVoiceAgentId &&
          mcpsEqual &&
          skillsEqual &&
          latestRunEqual
        ) {
          return existing;
        }

        hasChanges = true;
        return {
          id: agent.id,
          type: 'crabAgent' as const,
          position,
          data: {
            ...agent,
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

      if (!hasChanges && prevNodes.length === agents.length) {
        return prevNodes;
      }
      return nextNodes;
    });
  }, [
    agents,
    handleRunAgent,
    handleStopAgent,
    handleEditAgent,
    handleDeleteAgent,
    handleOpenDrawer,
    handleVoiceSend,
    handleVoiceToggle,
    handleVoiceClose,
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
  ]);

  // 4. WebSocket Synchronization (Connects once, completely reactive via Zustand)
  useEffect(() => {
    const cleanupWs = SpaceService.connectWebSocket((msg) => {
      useSpaceStore.getState().broadcastWsMessage(msg);
      if (msg.type === 'agent_status' && msg.agentId) {
        const { status, lastRunAt } = (msg.data as { status: string; lastRunAt?: string }) || {};
        updateAgentStatus(msg.agentId, status as AgentRecord['status'], lastRunAt);
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
      } else if (msg.type === 'run_started' && msg.agentId) {
        refreshSpace();
      } else if (msg.type === 'run_completed' || msg.type === 'run_failed') {
        refreshSpace();
      }
    });

    return cleanupWs;
  }, [refreshSpace, updateAgentStatus, updateNodePositionLocally, updateAgentCron]);

  // 6. Right Click in Space
  const handlePaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      if (!rfInstance) return;

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
    [rfInstance],
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
            const stockMcp = stockMcps.find((m) => m.name === mcpName);
            await AgentService.addMcp(created.id, {
              mcp_name: mcpName,
              label: stockMcp?.label || mcpName.replace('-mcp-server', '').replace('-mcp', '').toUpperCase(),
              config: stockMcp ? { command: stockMcp.command, args: stockMcp.args } : undefined,
              allowUnconfigured: true,
            }).catch(() => {});
          }
        }
        if (templateInitialData.recommended_skills && templateInitialData.recommended_skills.length > 0) {
          for (const skillKey of templateInitialData.recommended_skills) {
            const stockSkill = stockSkills.find(
              (s) => s.id === skillKey || s.name.toLowerCase() === skillKey.toLowerCase()
            );
            if (stockSkill) {
              await AgentService.addSkill(created.id, {
                skill_name: stockSkill.name,
                description: stockSkill.description || undefined,
                content: stockSkill.content,
              }).catch(() => {});
            } else {
              const readableName = skillKey.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
              await AgentService.addSkill(created.id, {
                skill_name: readableName,
                description: `Specialist skill for ${data.name || 'Agent'}`,
                content: `# ${readableName} Directive\n\nExecute specialized workflows adhering to workspace directives.`,
              }).catch(() => {});
            }
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
    ? currentTheme === 'theme-dark-nebula'
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
  const handleFitViewClick = useCallback(() => {
    rfInstance?.fitView({ padding: 0.25, duration: 600 });
  }, [rfInstance]);

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
        });

        // Auto-attach recommended MCPs
        if (template.recommended_mcps && template.recommended_mcps.length > 0) {
          for (const mcpName of template.recommended_mcps) {
            const stockMcp = stockMcps.find((m) => m.name === mcpName);
            await AgentService.addMcp(createdAgent.id, {
              mcp_name: mcpName,
              label: stockMcp?.label || mcpName.replace('-mcp-server', '').replace('-mcp', '').toUpperCase(),
              config: stockMcp ? { command: stockMcp.command, args: stockMcp.args } : undefined,
              allowUnconfigured: true,
            }).catch(() => {});
          }
        }

        // Auto-attach recommended Skills
        if (template.recommended_skills && template.recommended_skills.length > 0) {
          for (const skillKey of template.recommended_skills) {
            const stockSkill = stockSkills.find(
              (s) => s.id === skillKey || s.name.toLowerCase() === skillKey.toLowerCase()
            );
            if (stockSkill) {
              await AgentService.addSkill(createdAgent.id, {
                skill_name: stockSkill.name,
                description: stockSkill.description || undefined,
                content: stockSkill.content,
              }).catch(() => {});
            } else {
              const readableName = skillKey.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
              await AgentService.addSkill(createdAgent.id, {
                skill_name: readableName,
                description: `Autonomous specialist skill for ${template.name}`,
                content: `# ${readableName} Directive\n\nExecute autonomous specialized workflows for ${template.role} adhering to project rules.`,
              }).catch(() => {});
            }
          }
        }

        refreshSpace();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to spawn enterprise agent');
      }
    },
    [refreshSpace, stockMcps, stockSkills],
  );

  // ── Library: drop an agent template onto empty canvas ────────────────────
  // Declared after handleSpawnTemplate so the dependency array resolves it.
  const handlePaneDrop = useCallback(
    (event: React.DragEvent | DragEvent) => {
      const payload = readLibDragPayload((event as React.DragEvent).dataTransfer);
      if (!payload || payload.kind !== 'agent' || !payload.agent) return;
      event.preventDefault();
      event.stopPropagation();
      const clientX = 'clientX' in event ? event.clientX : 0;
      const clientY = 'clientY' in event ? event.clientY : 0;
      const flow = rfInstance?.screenToFlowPosition({ x: clientX, y: clientY });
      handleSpawnTemplate(payload.agent, flow?.x ?? 300, flow?.y ?? 220);
    },
    [rfInstance, handleSpawnTemplate],
  );

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

  return (
    <div className={`space-container ${currentTheme}`} onClick={handleCloseContextMenu}>
      {/* Space Toolbar */}
      <SpaceToolbar
        agents={agents}
        currentTheme={currentTheme}
        onSelectTheme={handleSelectTheme}
        onOpenSettings={handleOpenSettingsModal}
        onAddAgent={handleAddAgentClick}
        onFitView={handleFitViewClick}
      />

      {/* Infinite Canvas */}
      <ReactFlow<AgentNode>
        nodes={nodes}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onInit={setRfInstance}
        onPaneContextMenu={handlePaneContextMenu}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes(LIB_DRAG_KEY)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }
        }}
        onDrop={handlePaneDrop}
        fitView
        minZoom={0.2}
        maxZoom={2.5}
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
        onSpawnTemplate={handleSpawnTemplateFromLibrary}
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

      {/* Right Click Context Menu */}
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
        onClose={handleCloseDrawer}
      />
    </div>
  );
};
