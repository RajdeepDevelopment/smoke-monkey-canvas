import React, { useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Play,
  Square,
  Settings,
  Trash2,
  Clock,
  Plus,
  X,
  Terminal,
  Cpu,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Wrench,
  ShieldCheck,
  Folder,
  HardDrive,
  Smartphone,
  Mic,
  Package,
  UserRoundCog,
  TextCursorInput,
  Maximize2,
  Minimize2,
  Palette,
  Building2,
  Handshake,
  Plug,
} from 'lucide-react';
import type { SpaceAgentEntity } from './agent.types.js';
import type { AgentNodeData } from '../space/space.types.js';
import { BrandIcons, getBrandIcon, McpBrandIcon } from '../common/brand-icons.js';
import { VoiceAgentPopover } from '../voice/voice-agent-popover.js';
import { readLibDragPayload, isLibDrag, setActiveDragPayload, type LibDragPayload } from '../library/library.types.js';
import { useIsMobile } from '../common/use-mobile.js';
import { AgentAvatar, AvatarPickerModal } from './agent-avatar.js';
import { useSpaceStore } from '../space/space.store.js';

export interface CrabAgentNodeProps {
  data: AgentNodeData & {
    onRun: (id: string) => void;
    onStop?: (id: string) => void;
    onEdit: (agent: SpaceAgentEntity, section?: 'general' | 'directory' | 'schedule' | 'model') => void;
    onDelete: (id: string) => void;
    onOpenDrawer: (agent: SpaceAgentEntity) => void;
    onAddMcp: (agentId: string, initialMcpName?: string) => void;
    onDeleteMcp: (agentId: string, mcpId: string) => void;
    onAddSkill: (agentId: string) => void;
    onDeleteSkill: (agentId: string, skillId: string) => void;
    onOpenTools?: (agent: SpaceAgentEntity) => void;
    onOpenPolicies?: (agent: SpaceAgentEntity) => void;
    onVoiceSend?: (agent: SpaceAgentEntity, text: string) => void;
    /** Canvas-level voice exclusivity controls */
    onVoiceToggle?: (agentId: string) => void;
    onVoiceClose?: () => void;
    activeVoiceAgentId?: string | null;
    /** Attaches a library item (MCP / skill / toolkit) dropped onto this agent. */
    onLibraryDrop?: (agentId: string, payload: LibDragPayload) => void;
    /** Toggle active graphical threads view in canvas */
    onToggleThreads?: (id: string) => void;
    /** Toggle deliverables assets review thread in canvas */
    onToggleAssets?: (id: string) => void;
  };
}

/**
 * Deep equality comparator for CrabAgentNode memoization.
 * Prevents unnecessary re-renders when canvas pan/zooms or when unrelated state updates.
 */
function areAgentNodePropsEqual(
  prev: CrabAgentNodeProps & { selected?: boolean; dragging?: boolean },
  next: CrabAgentNodeProps & { selected?: boolean; dragging?: boolean },
): boolean {
  if (prev.selected !== next.selected) return false;
  if (prev.dragging !== next.dragging) return false;

  const p = prev.data;
  const n = next.data;
  if (!p || !n) return false;

  if (
    p.id !== n.id ||
    p.name !== n.name ||
    p.model !== n.model ||
    p.provider !== n.provider ||
    p.status !== n.status ||
    p.system_prompt !== n.system_prompt ||
    p.cron_schedule !== n.cron_schedule ||
    p.cron_enabled !== n.cron_enabled ||
    p.next_run_at !== n.next_run_at ||
    p.last_run_at !== n.last_run_at ||
    p.disabled_tools !== n.disabled_tools ||
    p.policies !== n.policies ||
    p.personalities !== n.personalities ||
    p.output_styles !== n.output_styles ||
    p.working_dir !== n.working_dir ||
    p.max_memory_mb !== n.max_memory_mb ||
    p.role !== n.role ||
    p.description !== n.description ||
    p.specialty !== n.specialty ||
    p.inWorkspaceZone !== n.inWorkspaceZone ||
    p.workspaceZoneName !== n.workspaceZoneName ||
    p.workspaceZoneColor !== n.workspaceZoneColor ||
    p.roleZoneId !== n.roleZoneId ||
    p.roleZoneName !== n.roleZoneName ||
    p.roleZoneRole !== n.roleZoneRole ||
    p.roleZoneLevel !== n.roleZoneLevel ||
    p.roleZoneColor !== n.roleZoneColor ||
    p.podMemberCount !== n.podMemberCount ||
    p.podDensity !== n.podDensity ||
    p.podScale !== n.podScale ||
    p.podAvatarSize !== n.podAvatarSize ||
    p.podCardWidth !== n.podCardWidth ||
    p.podCardHeight !== n.podCardHeight
  ) {
    return false;
  }

  // Compare latestRun
  if (
    p.latestRun?.id !== n.latestRun?.id ||
    p.latestRun?.status !== n.latestRun?.status ||
    p.latestRun?.summary !== n.latestRun?.summary ||
    p.latestRun?.error !== n.latestRun?.error
  ) {
    return false;
  }

  // Compare MCPs length & IDs
  if ((p.mcps?.length ?? 0) !== (n.mcps?.length ?? 0)) return false;
  for (let i = 0; i < (p.mcps?.length ?? 0); i++) {
    if (p.mcps[i].id !== n.mcps[i].id || p.mcps[i].mcp_name !== n.mcps[i].mcp_name) {
      return false;
    }
  }

  // Compare Skills length & IDs
  if ((p.skills?.length ?? 0) !== (n.skills?.length ?? 0)) return false;
  for (let i = 0; i < (p.skills?.length ?? 0); i++) {
    if (p.skills[i].id !== n.skills[i].id || p.skills[i].skill_name !== n.skills[i].skill_name) {
      return false;
    }
  }

  // Voice popover exclusivity: re-render when this node's voice open state changes
  if (p.activeVoiceAgentId !== n.activeVoiceAgentId) return false;

  // Active threads count change
  if (p.activeThreadsCount !== n.activeThreadsCount) return false;

  // Unread assets count change
  if (p.unreadAssetsCount !== n.unreadAssetsCount) return false;

  return true;
}

export const CrabAgentNode: React.FC<CrabAgentNodeProps> = React.memo(({ data }) => {
  const isMobile = useIsMobile();
  // ── Library drop target ───────────────────────────────────────────────────
  // dragenter/dragleave also fire for descendants, so a depth counter is used to
  // avoid flickering the highlight when the pointer crosses child elements.
  const [dragDepth, setDragDepth] = useState(0);
  const isDragOver = dragDepth > 0;

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    if (!isLibDrag(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    setDragDepth((d) => d + 1);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!isLibDrag(e.dataTransfer)) return;
    // Required for the element to become a valid drop target.
    e.preventDefault();
    e.stopPropagation();
    try {
      e.dataTransfer.dropEffect = 'copy';
    } catch {}
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!isLibDrag(e.dataTransfer)) return;
    e.stopPropagation();
    setDragDepth((d) => Math.max(0, d - 1));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      setDragDepth(0);
      const payload = readLibDragPayload(e.dataTransfer);
      setActiveDragPayload(null);
      if (!payload) return;
      // Agent templates are spawned on the pane, never attached to a node.
      if (payload.kind === 'agent') return;
      e.preventDefault();
      e.stopPropagation();
      data.onLibraryDrop?.(data.id, payload);
    },
    [data],
  );

  // Voice open state is controlled by the canvas (activeVoiceAgentId) so only one
  // popover can be open at a time. Toggling another mic auto-closes the previous one.
  const isVoiceOpen = data.activeVoiceAgentId === data.id;
  const isRunning = data.status === 'running';
  const agentMood = useSpaceStore((s) => s.agentMoods[data.id]?.mood || (isRunning ? 'working' : 'idle'));
  const agentMoodDetail = useSpaceStore((s) => s.agentMoods[data.id]?.detail);
  const ProviderIcon = BrandIcons[data.provider];

  // Parse disabled tools count
  let disabledCount = 0;
  try {
    if (data.disabled_tools) {
      const parsed = JSON.parse(data.disabled_tools);
      if (Array.isArray(parsed)) disabledCount = parsed.length;
    }
  } catch {}
  const activeToolsCount = Math.max(0, 24 - disabledCount);

  // Parse attached policies
  let policyList: string[] = [];
  try {
    if (data.policies) {
      const parsed = JSON.parse(data.policies);
      if (Array.isArray(parsed)) policyList = parsed;
    }
  } catch {}

  // Personality voice + output-format presets, resolved from ids by the canvas.
  const personalityItems = data.personalityItems ?? [];
  const outputStyleItems = data.outputStyleItems ?? [];

  // Clean short ID (e.g. #fnfm)
  const shortId = data.id.includes('_') ? `#${data.id.split('_').pop()}` : `#${data.id}`;

  // Formatted Provider Label
  const providerLabel =
    data.provider === 'nvidia' ? 'NVIDIA NIM'
    : data.provider === 'openai' ? 'OpenAI'
    : data.provider === 'anthropic' ? 'Anthropic'
    : data.provider === 'gemini' ? 'Google Gemini'
    : data.provider === 'groq' ? 'Groq'
    : data.provider === 'openrouter' ? 'OpenRouter'
    : data.provider;

  // Formatted Model Name
  const rawSlug = data.model.includes('/') ? data.model.split('/').pop()! : data.model;
  const formattedModel = rawSlug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // Readiness is driven solely by the server-computed `isConfigured`, which is
  // re-derived from stored credentials on every read. The persisted `enabled`
  // column is written once at attach time and never updated, so OR-ing it in
  // here would latch the run button off permanently after a key is later saved.
  // Non-stock MCPs have no `isConfigured` flag and are treated as ready.
  const isMcpConfigured = (m: SpaceAgentEntity['mcps'][number]) => {
    const raw = m as { isConfigured?: boolean; missingKeys?: string[] };
    if (raw.isConfigured === false) return false;
    if (raw.missingKeys && raw.missingKeys.length > 0) return false;
    return true;
  };

  const unconfiguredMcps = data.mcps.filter((m) => !isMcpConfigured(m));
  const hasUnconfiguredMcps = unconfiguredMcps.length > 0;

  // ── Pod Avatar Mode State & Interactions ──
  const isPodCardExpanded = Boolean(useSpaceStore((s) => s.podCardExpandedAgents[data.id]));
  const setPodCardExpanded = useSpaceStore((s) => s.setPodCardExpanded);
  const isAvatarMode = !isPodCardExpanded;
  const [showAvatarPicker, setShowAvatarPicker] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // ── Pod Dynamic Sizing & Density Metrics ──
  const density = data.podDensity || 'standard';
  const _scale = data.podScale || 1.0;
  void _scale;
  const avatarSize = data.podAvatarSize || (density === 'micro' ? 36 : density === 'mini' ? 46 : density === 'compact' ? 56 : 72);
  const cardWidth = data.podCardWidth || (density === 'micro' ? 100 : density === 'mini' ? 130 : density === 'compact' ? 168 : 220);

  // ── If dropped inside a Workspace Pod/Group Room: Render Character Avatar Representation ──
  if (data.inWorkspaceZone && isAvatarMode) {
    return (
      <div
        className={`crab-pod-avatar-node density-${density} ${isDragOver ? 'crab-drop-active' : ''} ${isRunning ? 'is-running' : ''}`}
        style={{
          '--pod-accent': data.workspaceZoneColor || '#38bdf8',
          width: `${cardWidth}px`,
          maxHeight: data.podCardHeight ? `${data.podCardHeight}px` : undefined,
        } as React.CSSProperties}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
        }}
      >
        {/* ── Always-Visible Provider & Model Badge (Top of Node, No Hover Needed) ── */}
        <div
          className="pod-top-provider-badge nodrag nopan"
          onClick={(e) => {
            e.stopPropagation();
            data.onEdit(data, 'model');
          }}
          title={`AI Provider: ${providerLabel} · Model: ${data.model} (Click to configure model in settings)`}
        >
          <span className="provider-icon-wrap">
            {ProviderIcon ? <ProviderIcon size={11} /> : <Cpu size={11} />}
          </span>
          <span className="provider-name">{providerLabel}</span>
          <span className="provider-dot">·</span>
          <span className="model-name-short">
            {formattedModel.length > 14 ? formattedModel.slice(0, 13) + '…' : formattedModel}
          </span>
          <span className="provider-chevron">▾</span>
        </div>

        {/* ── Central Avatar Stage (Face + Backlighting Aura + Handles + Orbital Ring) ── */}
        <div className="pod-avatar-stage">
          {/* Handles for Peer, Thread, and Assets connections positioned right on the avatar stage */}
          <Handle
            type="target"
            position={Position.Left}
            id="peer-target-left"
            className="peer-connector-handle"
            style={{ left: -4, top: '50%', transform: 'translateY(-50%)' }}
            title="Connect peer agent here (Left)"
          />
          <Handle
            type="source"
            position={Position.Right}
            id="peer-source-right"
            className="peer-connector-handle"
            style={{ right: -4, top: '50%', transform: 'translateY(-50%)' }}
            title="Drag connection to peer agent (Right)"
          />
          <Handle
            type="source"
            position={Position.Right}
            id="thread-source"
            className="thread-connector-handle"
            style={{ right: -2, top: 22, opacity: 0 }}
            title="Active execution thread"
          />
          <Handle
            type="source"
            position={Position.Right}
            id="assets-source"
            className="assets-connector-handle"
            style={{ right: -2, top: 58, opacity: 0 }}
            title="Deliverables asset thread"
          />
          {/* Fallback hidden handles for peer connections */}
          <Handle
            type="target"
            position={Position.Bottom}
            id="peer-target"
            style={{ opacity: 0, pointerEvents: 'none', bottom: 0 }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="peer-source"
            style={{ opacity: 0, pointerEvents: 'none', bottom: 0 }}
          />

          {/* Luminous Backlighting Aura (soft ambient glow reacting to live mood & run state) */}
          <div className={`pod-avatar-backlight ${isRunning ? 'is-running' : ''} mood-${agentMood} ${hasUnconfiguredMcps ? 'needs-config' : ''}`} />

          {/* Avatar Disc: Clicking opens Sidebar Chat Drawer directly, dragging moves agent node */}
          <div
            className={`pod-avatar-disc mood-${agentMood}`}
            onClick={(e) => {
              e.stopPropagation();
              data.onOpenDrawer(data);
            }}
            title={`${data.name}${agentMood !== 'idle' ? ` [${agentMood.toUpperCase()}: ${agentMoodDetail || ''}]` : ''} — Click to open Chat Drawer, drag to move`}
          >
            <AgentAvatar
              agentId={data.id}
              size={avatarSize}
              className="pod-avatar-img"
            />
            {isRunning && <span className="pod-avatar-pulse-ring" />}
          </div>

          {/* ── Connected MCPs Brand Icons Collage (Attached at bottom rim of Avatar Disc, In Front / High Z-Index) ── */}
          {data.mcps && data.mcps.length > 0 && (
            <div className="pod-mcp-collage-row">
              {data.mcps.slice(0, 5).map((mcp) => {
                const isConfigured = isMcpConfigured(mcp);
                const mcpTitle = mcp.label || mcp.mcp_name || 'MCP Server';
                return (
                  <div
                    key={mcp.id}
                    className={`pod-mcp-collage-badge ${!isConfigured ? 'unconfigured' : ''}`}
                    title={`${mcpTitle}${!isConfigured ? ' — Needs Credentials/Config (Click to configure)' : ' — Connected MCP'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      data.onAddMcp?.(data.id, mcp.mcp_name || mcp.label);
                    }}
                  >
                    <McpBrandIcon
                      mcp={{
                        name: mcp.mcp_name || mcp.label,
                        label: mcp.label,
                        iconUrl: (mcp as any).iconUrl,
                      }}
                      size={14}
                      className="pod-mcp-icon-img"
                    />
                    {!isConfigured && <span className="pod-mcp-alert-pip" title="Needs config" />}
                  </div>
                );
              })}
              {data.mcps.length > 5 && (
                <div
                  className="pod-mcp-collage-badge more"
                  title={`${data.mcps.length - 5} more MCPs connected`}
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onEdit(data, 'general');
                  }}
                >
                  <span>+{data.mcps.length - 5}</span>
                </div>
              )}
            </div>
          )}

          {/* ── Surrounding Orbital Actions Ring (Spaciously arranged around wings) ── */}
          <div className={`pod-avatar-orbit ${isHovered ? 'is-visible' : ''}`}>

            {/* Upper-Left 10:30: Voice Assistant */}
            <div className="pod-orbit-action orbit-top-left">
              <button
                type="button"
                className={`pod-orbit-btn voice-btn nodrag nopan ${isVoiceOpen ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  data.onVoiceToggle?.(data.id);
                }}
                title={isVoiceOpen ? 'Close Voice Session' : 'Start Voice Assistant'}
              >
                <Mic size={13} />
              </button>
            </div>

            {/* Mid-Left 9:00: Run / Stop / Configure */}
            <div className="pod-orbit-action orbit-mid-left">
              {isRunning ? (
                <button
                  type="button"
                  className="pod-orbit-btn stop-btn nodrag nopan"
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onStop?.(data.id);
                  }}
                  title="Stop Agent Execution"
                >
                  <Square size={13} fill="currentColor" />
                </button>
              ) : hasUnconfiguredMcps ? (
                <button
                  type="button"
                  className="pod-orbit-btn config-btn nodrag nopan"
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onAddMcp(data.id, unconfiguredMcps[0]?.mcp_name || unconfiguredMcps[0]?.label);
                  }}
                  title="Configure Credentials to Run"
                >
                  <AlertTriangle size={13} color="#f59e0b" />
                </button>
              ) : (
                <button
                  type="button"
                  className="pod-orbit-btn run-btn nodrag nopan"
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onRun(data.id);
                  }}
                  title="Run Agent Loop"
                >
                  <Play size={13} fill="currentColor" />
                </button>
              )}
            </div>

            {/* Far Upper-Left 9:45: Avatar Face Customizer */}
            <div className="pod-orbit-action orbit-far-top-left">
              <button
                type="button"
                className="pod-orbit-btn face-btn nodrag nopan"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAvatarPicker(true);
                }}
                title="Customize Avatar Face & Style"
              >
                <Palette size={12} />
              </button>
            </div>

            {/* Lower-Left Wing 8:00: Built-in Tools & Skills */}
            <div className="pod-orbit-action orbit-lower-left">
              <button
                type="button"
                className="pod-orbit-btn tools-btn nodrag nopan"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onOpenTools?.(data);
                }}
                title={`Configure Tools (${activeToolsCount}/24 active)`}
              >
                <Wrench size={12} />
              </button>
            </div>

            {/* Upper-Right 1:30: Settings */}
            <div className="pod-orbit-action orbit-top-right">
              <button
                type="button"
                className="pod-orbit-btn settings-btn nodrag nopan"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onEdit(data, 'general');
                }}
                title="Agent Settings & System Prompt"
              >
                <Settings size={13} />
              </button>
            </div>

            {/* Mid-Right 3:00: Chat & Logs Drawer */}
            <div className="pod-orbit-action orbit-mid-right">
              <button
                type="button"
                className="pod-orbit-btn chat-btn nodrag nopan"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onOpenDrawer(data);
                }}
                title="Open Sidebar Chat Drawer"
              >
                <Terminal size={13} />
              </button>
            </div>

            {/* Lower-Right Wing 4:00: Guard Policies */}
            <div className="pod-orbit-action orbit-lower-right">
              <button
                type="button"
                className="pod-orbit-btn policies-btn nodrag nopan"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onOpenPolicies?.(data);
                }}
                title="Security Guard Policies"
              >
                <ShieldCheck size={12} />
              </button>
            </div>

            {/* Far Upper-Right 2:15: Expand to Full Card Mode */}
            <div className="pod-orbit-action orbit-far-top-right">
              <button
                type="button"
                className="pod-orbit-btn expand-btn nodrag nopan"
                onClick={(e) => {
                  e.stopPropagation();
                  setPodCardExpanded(data.id, true);
                }}
                title="Expand to Full Card Mode"
              >
                <Maximize2 size={12} />
              </button>
            </div>

            {/* Delete Agent: Far-Lower-Right 4:45 */}
            <div className="pod-orbit-action orbit-delete">
              <button
                type="button"
                className="pod-orbit-btn delete-btn nodrag nopan"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onDelete(data.id);
                }}
                title="Delete Agent"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Metadata & Full Card Options Dock (Proper spacing below avatar stage, never covered) ── */}
        <div className="pod-avatar-meta">
          {/* Header Name & Full Card Toggle */}
          <div className="pod-name-row">
            <span className="pod-avatar-name" title={data.name}>
              {data.name}
            </span>
          </div>

          {/* Role & Specialty */}
          {(data.role || data.specialty) && (
            <span className="pod-avatar-role" title={data.description || data.role || ''}>
              {data.role || data.specialty}
            </span>
          )}

          {/* Status Badge (Needs Config / Running / Failed / Ready) */}
          <div className="pod-status-row">
            {hasUnconfiguredMcps ? (
              <button
                type="button"
                className="pod-status-badge needs-config nodrag nopan"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onAddMcp(data.id, unconfiguredMcps[0]?.mcp_name || unconfiguredMcps[0]?.label);
                }}
                title="Credentials required. Click to configure."
              >
                <AlertTriangle size={10} color="#f59e0b" />
                <span>Needs Config</span>
              </button>
            ) : isRunning ? (
              <span className="pod-status-badge running">
                <span className="pulse-dot" />
                <span>Running</span>
              </span>
            ) : data.latestRun?.status === 'failed' ? (
              <button
                type="button"
                className="pod-status-badge failed nodrag nopan"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onOpenDrawer(data);
                }}
                title={data.latestRun.error || 'Last run failed. Click to open logs.'}
                style={{ cursor: 'pointer' }}
              >
                <AlertCircle size={10} color="#ef4444" />
                <span>Failed</span>
              </button>
            ) : (
              <span className="pod-status-badge ready">
                <span className="status-dot-subtle" />
                <span>Ready</span>
              </span>
            )}
          </div>

          {/* ── Attached MCPs Chips Row (Visible with remove X icon) ── */}
          {data.mcps && data.mcps.length > 0 && (
            <div className="pod-skills-chips-row pod-mcps-chips-row nodrag nopan">
              {data.mcps.map((mcp) => (
                <div
                  key={mcp.id || mcp.mcp_name}
                  className="pod-skill-chip-tag pod-mcp-chip-tag"
                  title={`MCP: ${mcp.label || mcp.mcp_name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onAddMcp?.(data.id, mcp.mcp_name);
                  }}
                >
                  <Plug size={9} className="skill-chip-icon" />
                  <span className="skill-chip-text">{mcp.label || mcp.mcp_name}</span>
                  {data.onDeleteMcp && (
                    <button
                      type="button"
                      className="skill-chip-remove-btn"
                      title={`Remove MCP "${mcp.label || mcp.mcp_name}"`}
                      onClick={(e) => {
                        e.stopPropagation();
                        data.onDeleteMcp(data.id, mcp.id || mcp.mcp_name);
                      }}
                    >
                      <X size={8} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Skills Chips Row (Always Visible side-by-side, No Hover Needed) ── */}
          {data.skills && data.skills.length > 0 && (
            <div className="pod-skills-chips-row nodrag nopan">
              {data.skills.map((skill) => (
                <div
                  key={skill.id}
                  className="pod-skill-chip-tag"
                  title={`Skill: ${skill.skill_name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onEdit(data, 'general');
                  }}
                >
                  <Sparkles size={9} className="skill-chip-icon" />
                  <span className="skill-chip-text">{skill.skill_name}</span>
                  {data.onDeleteSkill && (
                    <button
                      type="button"
                      className="skill-chip-remove-btn"
                      title={`Remove skill "${skill.skill_name}"`}
                      onClick={(e) => {
                        e.stopPropagation();
                        data.onDeleteSkill(data.id, skill.id);
                      }}
                    >
                      <X size={8} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Voice Popover */}
        {isVoiceOpen && data.onVoiceSend && (
          <VoiceAgentPopover
            agent={data}
            onSend={(text) => data.onVoiceSend?.(data, text)}
            onClose={() => data.onVoiceClose?.()}
          />
        )}

        {/* Avatar Picker Modal */}
        <AvatarPickerModal
          isOpen={showAvatarPicker}
          agentId={data.id}
          agentName={data.name}
          onClose={() => setShowAvatarPicker(false)}
        />
      </div>
    );
  }

  return (
    <div
      className={`crab-agent-node ${isDragOver ? 'crab-drop-active' : ''} ${data.inWorkspaceZone ? 'is-in-pod' : ''}`}
      style={data.inWorkspaceZone ? ({ '--pod-accent': data.workspaceZoneColor || '#38bdf8' } as React.CSSProperties) : undefined}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="crab-drop-overlay">
          <Package size={16} />
          <span>Drop to attach</span>
        </div>
      )}

      {/* ── Left Claw Hands (MCP Attachments & Tools) ── */}
      {!isMobile && (
        <div className="crab-hands-left">
        {data.mcps.map((mcp) => {
          const McpIcon = getBrandIcon((mcp.mcp_name || '') + ' ' + (mcp.label || ''), 13);
          const isConfigured = isMcpConfigured(mcp);
          const probe = (mcp as { probe?: { ok: boolean } }).probe;
          // A server whose last real handshake failed is surfaced, but it does
          // not gate the run button — the failure may be transient or external.
          const failing = !!probe && probe.ok === false;
          const title = !isConfigured
            ? `${mcp.label || mcp.mcp_name} is unconfigured. Click to configure credentials or remove.`
            : failing
              ? `${mcp.label || mcp.mcp_name} failed its last connection test. Re-test it in the MCP panel.`
              : mcp.mcp_name;
          return (
            <div
              key={mcp.id}
              className={`claw-hand-item mcp ${!isConfigured ? 'unconfigured' : ''}`}
              title={title}
              onClick={
                !isConfigured
                  ? (e) => {
                      e.stopPropagation();
                      data.onAddMcp(data.id, mcp.mcp_name || mcp.label);
                    }
                  : undefined
              }
              style={
                !isConfigured
                  ? {
                      borderColor: 'rgba(245, 158, 11, 0.45)',
                      color: '#f59e0b',
                      background: 'rgba(245, 158, 11, 0.1)',
                      borderStyle: 'dashed',
                      cursor: 'pointer',
                    }
                  : failing
                    ? {
                        borderColor: 'rgba(239, 68, 68, 0.5)',
                        color: '#f87171',
                        background: 'rgba(239, 68, 68, 0.1)',
                      }
                    : undefined
              }
            >
              {!isConfigured ? (
                <AlertTriangle size={12} color="#f59e0b" />
              ) : (
                McpIcon || <Cpu size={12} />
              )}
              <span>{mcp.label || mcp.mcp_name}</span>
              {failing && isConfigured && (
                <span
                  style={{
                    fontSize: 8.5,
                    fontWeight: 700,
                    background: 'rgba(239, 68, 68, 0.25)',
                    color: '#f87171',
                    padding: '1px 5px',
                    borderRadius: 3,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  ✗ Failing
                </span>
              )}
              {!isConfigured && (
                <span
                  style={{
                    fontSize: 8.5,
                    fontWeight: 700,
                    background: 'rgba(245, 158, 11, 0.25)',
                    color: '#f59e0b',
                    padding: '1px 5px',
                    borderRadius: 3,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  Key Req.
                </span>
              )}
              <button
                className="claw-delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onDeleteMcp(data.id, mcp.id);
                }}
                title="Remove MCP"
              >
                <X size={11} />
              </button>
            </div>
          );
        })}
        <button
          className="claw-add-btn"
          onClick={(e) => {
            e.stopPropagation();
            data.onAddMcp(data.id);
          }}
          title="Attach MCP Server"
        >
          <Plus size={12} />
          <span>MCP</span>
        </button>

        {/* Built-in Tools Claw */}
        <button
          className="claw-add-btn tools-claw"
          onClick={(e) => {
            e.stopPropagation();
            data.onOpenTools?.(data);
          }}
          title={`Configure 24 Built-in Tools (${activeToolsCount} active)`}
        >
          <Wrench size={12} />
          <span>Tools ({activeToolsCount}/24)</span>
        </button>
      </div>
      )}

      {/* ── Central Crab Body (Clicking opens Agent Chat Drawer if configured) ── */}
      <div
        className={`crab-body status-${data.status}`}
        onClick={(e) => {
          if (hasUnconfiguredMcps) {
            e.stopPropagation();
            data.onAddMcp(data.id, unconfiguredMcps[0]?.mcp_name || unconfiguredMcps[0]?.label);
            return;
          }
          data.onOpenDrawer(data);
        }}
        title={
          hasUnconfiguredMcps
            ? `Agent is not fully configured (${unconfiguredMcps.map((m) => m.label || m.mcp_name).join(', ')} require credentials). Click to configure.`
            : 'Click to open Agent Chat & Terminal'
        }
      >
        <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
        <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
        <Handle
          type="source"
          position={Position.Right}
          id="thread-source"
          style={{ right: -6, top: 32, opacity: 0 }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="assets-source"
          style={{ right: -6, top: 120, opacity: 0 }}
        />
        <Handle
          type="target"
          position={Position.Top}
          id="peer-target-top"
          className="peer-connector-handle top-target"
          style={{ left: '50%', transform: 'translateX(-50%)', top: -7 }}
          title="Connect peer agent here (Top)"
        />
        <Handle
          type="target"
          position={Position.Left}
          id="peer-target-left"
          className="peer-connector-handle edge-target left-target"
          style={{ left: -7, top: '50%', transform: 'translateY(-50%)' }}
          title="Connect peer agent here (Left)"
        />
        <Handle
          type="target"
          position={Position.Right}
          id="peer-target-right"
          className="peer-connector-handle edge-target right-target"
          style={{ right: -7, left: 'auto', top: '50%', transform: 'translateY(-50%)' }}
          title="Connect peer agent here (Right)"
        />

        {/* Row 1: Avatar + Title & Short ID + Status Pill */}
        <div className="crab-header">
          <div className="crab-title-group">
            <div
              className="crab-avatar-wrap nodrag nopan"
              onClick={(e) => {
                e.stopPropagation();
                data.onOpenDrawer(data);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setShowAvatarPicker(true);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              title={`${data.name} — Click to open Chat Drawer · Double-click to customize avatar`}
              style={{ cursor: 'pointer' }}
              role="button"
              tabIndex={0}
              aria-label={`Open ${data.name} chat drawer`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  data.onOpenDrawer(data);
                }
              }}
            >
              <AgentAvatar
                agentId={data.id}
                size={30}
                className="crab-avatar"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onOpenDrawer(data);
                }}
              />
            </div>
            <div className="crab-title-col">
              <div className="crab-title-row">
                <span className="crab-name" title={data.name}>
                  {data.name}
                </span>
                <span className="crab-id-chip" title={`Agent ID: ${data.id}`}>
                  {shortId}
                </span>
                {data.roleZoneRole && (
                  <span
                    className="crab-zone-pill"
                    style={{
                      background: `${data.roleZoneColor || '#8b5cf6'}20`,
                      borderColor: `${data.roleZoneColor || '#8b5cf6'}66`,
                      color: data.roleZoneColor || '#8b5cf6',
                    }}
                    title={`Designation: L${data.roleZoneLevel ?? 0} ${data.roleZoneRole}${data.roleZoneName ? ` · ${data.roleZoneName}` : ''}`}
                  >
                    L{data.roleZoneLevel ?? 0} {data.roleZoneRole}
                  </span>
                )}
                {data.inWorkspaceZone && (
                  <>
                    <span
                      className="crab-pod-pill"
                      style={{
                        background: `${data.workspaceZoneColor || '#38bdf8'}20`,
                        borderColor: `${data.workspaceZoneColor || '#38bdf8'}55`,
                        color: data.workspaceZoneColor || '#38bdf8',
                      }}
                      title={`Member of ${data.workspaceZoneName || 'Office Space'} pod`}
                    >
                      <Building2 size={9} aria-hidden="true" />
                      <span>{data.workspaceZoneName || 'Pod'}</span>
                    </span>
                    <button
                      type="button"
                      className="crab-btn-collapse-avatar nodrag nopan"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPodCardExpanded(data.id, false);
                      }}
                      title="Collapse to Avatar Representation in pod"
                    >
                      <Minimize2 size={10} />
                      <span>Avatar</span>
                    </button>
                  </>
                )}
              </div>
              {(data.roleZoneRole || data.role || data.specialty) && (
                <div
                  className="crab-role-badge"
                  title={data.roleZoneRole ? `Inherited from ${data.roleZoneName || 'zone'}` : (data.description || data.role || '')}
                >
                  {data.roleZoneRole ? (
                    <span className="role-tag">{data.roleZoneRole}</span>
                  ) : (
                    data.role && <span className="role-tag">{data.role}</span>
                  )}
                  {data.specialty && <span className="specialty-tag">• {data.specialty}</span>}
                </div>
              )}
            </div>
          </div>
          <div className="crab-header-pills">
            {((data.activeThreadsCount ?? 0) > 0 || isRunning) && (
              <div
                className="crab-thread-pill"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onToggleThreads?.(data.id);
                }}
                title="Active graphical execution thread in space. Click to inspect."
              >
                <span className="crab-thread-pulse-dot" />
                <span>Thread</span>
              </div>
            )}
            {(data.unreadAssetsCount ?? 0) > 0 && (
              <div
                className="crab-thread-pill crab-assets-pill"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onToggleAssets?.(data.id);
                }}
                title={`${data.unreadAssetsCount} unread deliverables await review. Click to inspect.`}
              >
                <span className="crab-thread-pulse-dot assets-pulse-dot" />
                <span>Assets ({data.unreadAssetsCount})</span>
              </div>
            )}
            {hasUnconfiguredMcps && !isRunning ? (
              <div
                className="status-pill"
                style={{
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: '#f59e0b',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
                title="Agent has attached MCPs that require credentials"
              >
                <AlertTriangle size={10} />
                <span>Needs Config</span>
              </div>
            ) : (
              <div className={`status-pill ${data.status}`}>
                {data.status === 'running' ? (
                  <span className="status-dot-pulse" aria-hidden="true" />
                ) : (
                  <span className="status-dot" aria-hidden="true" />
                )}
                {data.status}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Attached Badges Tray */}
        {isMobile && (data.mcps.length > 0 || data.skills.length > 0 || personalityItems.length > 0) && (
          <div className="crab-mobile-attachments">
            {data.mcps.map((m) => (
              <span
                key={m.id}
                className={`attachment-chip mcp ${!isMcpConfigured(m) ? 'unconfigured' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  data.onAddMcp(data.id, m.mcp_name || m.label);
                }}
              >
                {getBrandIcon((m.mcp_name || '') + ' ' + (m.label || ''), 11) ?? <Cpu size={10} />}
                <span>{m.label || m.mcp_name}</span>
                {data.onDeleteMcp && (
                  <button
                    type="button"
                    className="skill-chip-remove-btn"
                    title={`Remove MCP "${m.label || m.mcp_name}"`}
                    onClick={(e) => {
                      e.stopPropagation();
                      data.onDeleteMcp(data.id, m.id);
                    }}
                  >
                    <X size={8} />
                  </button>
                )}
              </span>
            ))}
            {data.skills.map((s) => (
              <span key={s.id} className="attachment-chip skill" title={s.skill_name}>
                <Sparkles size={10} />
                <span>{s.skill_name}</span>
                {data.onDeleteSkill && (
                  <button
                    type="button"
                    className="skill-chip-remove-btn"
                    title={`Remove skill "${s.skill_name}"`}
                    onClick={(e) => {
                      e.stopPropagation();
                      data.onDeleteSkill(data.id, s.id);
                    }}
                  >
                    <X size={8} />
                  </button>
                )}
              </span>
            ))}
            {personalityItems.map((p) => (
              <span key={p.id} className="attachment-chip persona">
                <UserRoundCog size={10} />
                <span>{p.name}</span>
              </span>
            ))}
          </div>
        )}

        {/* Row 2: Premium Model & Provider Bar */}
        <div
          className={`crab-model-bar ${isMobile ? 'is-mobile' : ''} nodrag nopan`}
          title={`${data.model} (${providerLabel}) — Click to configure model in settings`}
          onClick={(e) => {
            e.stopPropagation();
            data.onEdit(data, 'model');
          }}
          style={{ cursor: 'pointer' }}
        >
          <div className="model-bar-left">
            <div className="crab-model-provider">
              {ProviderIcon ? <ProviderIcon size={12} /> : <Cpu size={12} />}
              <span className="provider-label">{providerLabel}</span>
            </div>
            {!isMobile && <span className="model-divider">/</span>}
            <span className="model-name">{formattedModel}</span>
          </div>
          {!isMobile && <span className="model-badge-tag">LLM</span>}
        </div>

        {/* System Prompt Preview */}
        <div className="crab-prompt-preview" title={data.system_prompt}>
          {data.system_prompt}
        </div>

        {/* Dual-column metadata grid on desktop, sleek single-row stats on mobile */}
        {isMobile ? (
          <div className="crab-mobile-stats-row">
            <div
              className="mobile-stat-pill"
              onClick={(e) => {
                e.stopPropagation();
                data.onEdit(data, 'schedule');
              }}
            >
              <Clock size={11} color={data.cron_enabled ? '#d97706' : '#94a3b8'} />
              <span>{data.cron_enabled && data.cron_schedule ? data.cron_schedule : 'Manual'}</span>
            </div>
            <div
              className="mobile-stat-pill"
              onClick={(e) => {
                e.stopPropagation();
                data.onEdit(data, 'directory');
              }}
            >
              <HardDrive size={11} color="#60a5fa" />
              <span>{data.max_memory_mb || 1024} MB</span>
            </div>
            {activeToolsCount > 0 && (
              <div
                className="mobile-stat-pill"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onOpenTools?.(data);
                }}
              >
                <Wrench size={11} color="#a78bfa" />
                <span>{activeToolsCount}/24 tools</span>
              </div>
            )}
          </div>
        ) : (
          <div className="crab-meta-grid">
            <div
              className="crab-resource-bar"
              onClick={(e) => {
                e.stopPropagation();
                data.onEdit(data, 'directory');
              }}
            >
              <div className="crab-resource-dir">
                <Folder size={11} color="#60a5fa" style={{ flexShrink: 0 }} />
                <span className="crab-resource-dir-text">
                  {data.working_dir ? data.working_dir.replace(/^.*[\\/]([^\\/]+[\\/][^\\/]+)$/, '$1') : `~/.smoke-agents/...`}
                </span>
              </div>
              <div className="crab-resource-ram" style={{ color: (data.max_memory_mb || 1024) <= 512 ? '#10b981' : 'hsl(var(--foreground))' }}>
                {(data.max_memory_mb || 1024) <= 512 ? <Smartphone size={10} color="#10b981" /> : <HardDrive size={10} />}
                <span>{data.max_memory_mb || 1024} MB</span>
              </div>
            </div>

            <div
              className="crab-cron-bar"
              onClick={(e) => {
                e.stopPropagation();
                data.onEdit(data, 'schedule');
              }}
            >
              <div className="crab-cron-info">
                <Clock size={11} color={data.cron_enabled ? '#d97706' : '#94a3b8'} style={{ flexShrink: 0 }} />
                <span className="crab-cron-text">
                  {data.cron_enabled && data.cron_schedule
                    ? `Cron: ${data.cron_schedule}`
                    : 'Manual trigger'}
                </span>
              </div>
              {data.cron_enabled && data.next_run_at && (
                <span className="crab-cron-next">
                  Next: {new Date(data.next_run_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Actions Toolbar */}
        <div className={`crab-actions ${isMobile ? 'is-mobile' : ''}`}>
          {isRunning ? (
            <button
              className="crab-btn-stop"
              onClick={(e) => {
                e.stopPropagation();
                data.onStop?.(data.id);
              }}
              title="Stop Agent Execution"
            >
              <Square size={13} fill="currentColor" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              className={`crab-btn-run ${hasUnconfiguredMcps ? 'disabled' : ''}`}
              disabled={hasUnconfiguredMcps}
              onClick={(e) => {
                e.stopPropagation();
                if (hasUnconfiguredMcps) {
                  data.onAddMcp(data.id, unconfiguredMcps[0]?.mcp_name || unconfiguredMcps[0]?.label);
                  return;
                }
                data.onRun(data.id);
              }}
              style={
                hasUnconfiguredMcps
                  ? {
                      background: 'rgba(245, 158, 11, 0.1)',
                      color: '#f59e0b',
                      border: '1px dashed rgba(245, 158, 11, 0.5)',
                      opacity: 0.9,
                      cursor: 'pointer',
                    }
                  : undefined
              }
              title={
                hasUnconfiguredMcps
                  ? `Cannot run: ${unconfiguredMcps.map((m) => m.label || m.mcp_name).join(', ')} require credentials. Click to configure.`
                  : 'Execute agent loop now'
              }
            >
              {hasUnconfiguredMcps ? (
                <>
                  <AlertTriangle size={13} color="#f59e0b" />
                  <span>Configure to Run</span>
                </>
              ) : (
                <>
                  <Play size={13} fill="currentColor" />
                  <span>Run</span>
                </>
              )}
            </button>
          )}

          <button
            className="crab-btn-icon crab-btn-terminal"
            onClick={(e) => {
              e.stopPropagation();
              if (hasUnconfiguredMcps) {
                data.onAddMcp(data.id, unconfiguredMcps[0]?.mcp_name || unconfiguredMcps[0]?.label);
                return;
              }
              data.onOpenDrawer(data);
            }}
            title="Chat & Logs"
          >
            <Terminal size={15} />
          </button>

          <button
            type="button"
            className={`crab-btn-icon crab-btn-voice voice-mic-action-btn ${isVoiceOpen ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              data.onVoiceToggle?.(data.id);
            }}
            title={isVoiceOpen ? 'Close Voice' : 'Voice Input'}
          >
            <Mic size={15} />
          </button>

          <button
            className="crab-btn-icon crab-btn-settings"
            onClick={(e) => {
              e.stopPropagation();
              data.onEdit(data);
            }}
            title="Agent Settings"
          >
            <Settings size={15} />
          </button>

          {!isMobile && (
            <>
              <button
                className="crab-btn-icon crab-btn-tools"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onOpenTools?.(data);
                }}
                title="Agent Tools"
              >
                <Wrench size={14} />
              </button>

              <button
                className="crab-btn-icon crab-btn-policies"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onOpenPolicies?.(data);
                }}
                title="Guard Policies"
              >
                <ShieldCheck size={14} />
              </button>

              <button
                className="crab-btn-icon crab-btn-delete delete"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onDelete(data.id);
                }}
                title="Delete Agent"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>

        {/* Integrated Bottom Output Dock (Cleanly docked inside the card, hidden on mobile if empty) */}
        {(!isMobile || data.latestRun) && (
          <div className="crab-card-dock">
            <div className="dock-info">
              <div className="dock-label">
                {data.latestRun?.status === 'completed' && (
                  <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={11} /> Last Output
                  </span>
                )}
                {data.latestRun?.status === 'failed' && (
                  <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertCircle size={11} /> Failed
                  </span>
                )}
                {!data.latestRun && 'No Runs Yet'}
              </div>
              <div className="dock-summary">
                {data.latestRun?.summary || data.latestRun?.error || 'Awaiting initial trigger'}
              </div>
            </div>
            <button
              className="dock-inspect-btn"
              onClick={(e) => {
                e.stopPropagation();
                data.onOpenDrawer(data);
              }}
            >
              <Terminal size={11} />
              <span>Logs</span>
            </button>
          </div>
        )}

        {/* Miro-Style Peer Delegation Connector Dock */}
        <div
          className="crab-peer-socket"
          title="Drag the glowing connector to another agent to establish a peer delegation link"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Full-dock drop target overlay */}
          <Handle
            type="target"
            position={Position.Bottom}
            id="peer-target"
            className="peer-dock-target-overlay"
            title="Drop peer connection here"
            isConnectable={true}
          />
          <div className="peer-socket-pill">
            <span className="peer-socket-icon" aria-hidden="true"><Handshake size={12} /></span>
            <span className="peer-socket-label">Peer Delegation</span>
            <span className="peer-socket-hint">Pull dot to link</span>
          </div>
          <div className="miro-connector-btn" title="Drag to connect to another peer agent">
            <div className="miro-handle-ring" />
            <Handle
              type="source"
              position={Position.Bottom}
              id="peer-source"
              className="miro-source-handle"
              isConnectable={true}
            />
          </div>
        </div>
      </div>

      {/* ── Right Claw Hands (Skills & Policies Attachments) — Desktop Only ── */}
      {!isMobile && (
        <div className="crab-hands-right">
        {data.skills.map((skill) => (
          <div key={skill.id} className="claw-hand-item skill" title={skill.skill_name}>
            <Sparkles size={12} />
            <span>{skill.skill_name}</span>
            <button
              className="claw-delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                data.onDeleteSkill(data.id, skill.id);
              }}
              title="Remove Skill"
            >
              <X size={11} />
            </button>
          </div>
        ))}
        <button
          className="claw-add-btn"
          onClick={(e) => {
            e.stopPropagation();
            data.onAddSkill(data.id);
          }}
          title="Attach Skill"
        >
          <Plus size={12} />
          <span>Skill</span>
        </button>

        {/* Attached Policies */}
        {policyList.map((pol, idx) => (
          <div key={idx} className="claw-hand-item policy" title={pol}>
            <ShieldCheck size={12} />
            <span>{pol.length > 18 ? pol.slice(0, 16) + '…' : pol}</span>
          </div>
        ))}
        <button
          className="claw-add-btn policy-claw"
          onClick={(e) => {
            e.stopPropagation();
            data.onOpenPolicies?.(data);
          }}
          title="Attach Policies & Guardrails"
        >
          <ShieldCheck size={12} />
          <span>Policy{policyList.length > 0 ? ` (${policyList.length})` : ''}</span>
        </button>

        {/* Attached Personality (voice) presets */}
        {personalityItems.map((preset) => (
          <div key={`p-${preset.id}`} className="claw-hand-item persona" title={preset.directive}>
            <UserRoundCog size={12} />
            <span>{preset.name}</span>
          </div>
        ))}

        {/* Attached Output Style presets */}
        {outputStyleItems.map((preset) => (
          <div key={`o-${preset.id}`} className="claw-hand-item output-style" title={preset.directive}>
            <TextCursorInput size={12} />
            <span>{preset.name}</span>
          </div>
        ))}
      </div>
      )}

      {/* ── Floating Voice Command Popover (canvas-exclusive: only one at a time) ── */}
      {isVoiceOpen && (
        <VoiceAgentPopover
          agent={data}
          onClose={() => {
            data.onVoiceClose ? data.onVoiceClose() : undefined;
          }}
          onSend={(text) => {
            data.onVoiceSend?.(data, text);
            data.onVoiceClose?.();
          }}
        />
      )}

      {/* ── Avatar Face Customizer Modal ── */}
      <AvatarPickerModal
        isOpen={showAvatarPicker}
        agentId={data.id}
        agentName={data.name}
        onClose={() => setShowAvatarPicker(false)}
      />
    </div>
  );
}, areAgentNodePropsEqual);
