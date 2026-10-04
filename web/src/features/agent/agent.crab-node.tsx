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
} from 'lucide-react';
import type { SpaceAgentEntity } from './agent.types.js';
import type { AgentNodeData } from '../space/space.types.js';
import { BrandIcons, getBrandIcon } from '../common/brand-icons.js';
import { VoiceAgentPopover } from '../voice/voice-agent-popover.js';
import { readLibDragPayload, LIB_DRAG_KEY, type LibDragPayload } from '../library/library.types.js';

export interface CrabAgentNodeProps {
  data: AgentNodeData & {
    onRun: (id: string) => void;
    onStop?: (id: string) => void;
    onEdit: (agent: SpaceAgentEntity, section?: 'general' | 'directory' | 'schedule') => void;
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
    p.max_memory_mb !== n.max_memory_mb
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

  return true;
}

export const CrabAgentNode: React.FC<CrabAgentNodeProps> = React.memo(({ data }) => {
  // ── Library drop target ───────────────────────────────────────────────────
  // dragenter/dragleave also fire for descendants, so a depth counter is used to
  // avoid flickering the highlight when the pointer crosses child elements.
  const [dragDepth, setDragDepth] = useState(0);
  const isDragOver = dragDepth > 0;

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes(LIB_DRAG_KEY)) return;
    e.preventDefault();
    e.stopPropagation();
    setDragDepth((d) => d + 1);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes(LIB_DRAG_KEY)) return;
    // Required for the element to become a valid drop target.
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes(LIB_DRAG_KEY)) return;
    e.stopPropagation();
    setDragDepth((d) => Math.max(0, d - 1));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      setDragDepth(0);
      const payload = readLibDragPayload(e.dataTransfer);
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
  const isMcpConfigured = (m: SpaceAgentEntity['mcps'][number]) =>
    (m as { isConfigured?: boolean }).isConfigured !== false;

  const unconfiguredMcps = data.mcps.filter((m) => !isMcpConfigured(m));
  const hasUnconfiguredMcps = unconfiguredMcps.length > 0;

  return (
    <div
      className={`crab-agent-node ${isDragOver ? 'crab-drop-active' : ''}`}
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
      <div className="crab-hands-left">
        {data.mcps.map((mcp) => {
          const McpIcon = getBrandIcon((mcp.mcp_name || '') + ' ' + (mcp.label || ''), 13);
          const isConfigured = isMcpConfigured(mcp);
          return (
            <div
              key={mcp.id}
              className={`claw-hand-item mcp ${!isConfigured ? 'unconfigured' : ''}`}
              title={
                !isConfigured
                  ? `${mcp.label || mcp.mcp_name} is unconfigured. Click to configure credentials or remove.`
                  : mcp.mcp_name
              }
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
                      background: 'rgba(245, 158, 11, 0.08)',
                      borderStyle: 'dashed',
                      cursor: 'pointer',
                    }
                  : undefined
              }
            >
              {McpIcon || <Cpu size={12} />}
              <span>{mcp.label || mcp.mcp_name}</span>
              {!isConfigured && (
                <span
                  style={{
                    fontSize: 8.5,
                    fontWeight: 700,
                    background: 'rgba(245, 158, 11, 0.2)',
                    color: '#f59e0b',
                    padding: '1px 4px',
                    borderRadius: 3,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <AlertTriangle size={9} color="#f59e0b" />
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

        {/* Row 1: Avatar + Title & Short ID + Status Pill */}
        <div className="crab-header">
          <div className="crab-title-group">
            <div className="crab-avatar-wrap">
              <img src="/smoke-monkey-mascot.png" alt="Agent" className="crab-avatar" />
            </div>
            <div className="crab-title-col">
              <div className="crab-title-row">
                <span className="crab-name" title={data.name}>
                  {data.name}
                </span>
                <span className="crab-id-chip" title={`Agent ID: ${data.id}`}>
                  {shortId}
                </span>
              </div>
            </div>
          </div>
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
              {data.status === 'running' && <span className="status-dot-pulse" />}
              {data.status}
            </div>
          )}
        </div>

        {/* Row 2: Premium Model & Provider Bar */}
        <div className="crab-model-bar" title={`${data.model} (${providerLabel})`}>
          <div className="model-bar-left">
            <div className="crab-model-provider">
              {ProviderIcon ? <ProviderIcon size={13} /> : <Cpu size={13} />}
              <span className="provider-label">{providerLabel}</span>
            </div>
            <span className="model-divider">/</span>
            <span className="model-name">{formattedModel}</span>
          </div>
          <span className="model-badge-tag">LLM</span>
        </div>

        {/* System Prompt Preview */}
        <div className="crab-prompt-preview" title={data.system_prompt}>
          {data.system_prompt}
        </div>

        {/* Dual-column metadata grid: Directory & RAM on left, Cron Schedule on right */}
        <div className="crab-meta-grid">
          <div
            className="crab-resource-bar"
            onClick={(e) => {
              e.stopPropagation();
              data.onEdit(data, 'directory');
            }}
            title={`Click to edit Directory or RAM limits\nRoot Directory: ${data.working_dir || `~/.smoke-agents/${data.name.toLowerCase().replace(/[^a-z0-9_-]+/g, '-') || 'agent'}`}\nMax RAM Limit: ${data.max_memory_mb || 1024} MB`}
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
            title="Click to edit Clock schedule & execution frequency"
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

        {/* Actions Toolbar */}
        <div className="crab-actions">
          {isRunning ? (
            <button
              className="crab-btn-stop"
              onClick={(e) => {
                e.stopPropagation();
                data.onStop?.(data.id);
              }}
              title="Stop Agent Execution"
            >
              <Square size={12} fill="currentColor" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              className={`crab-btn-run ${hasUnconfiguredMcps ? 'disabled' : ''}`}
              disabled={hasUnconfiguredMcps}
              onClick={(e) => {
                e.stopPropagation();
                if (hasUnconfiguredMcps) return;
                data.onRun(data.id);
              }}
              style={
                hasUnconfiguredMcps
                  ? {
                      background: 'rgba(245, 158, 11, 0.08)',
                      color: '#f59e0b',
                      border: '1px dashed rgba(245, 158, 11, 0.4)',
                      opacity: 0.7,
                      cursor: 'not-allowed',
                    }
                  : undefined
              }
              title={
                hasUnconfiguredMcps
                  ? `Cannot run: ${unconfiguredMcps.map((m) => m.label || m.mcp_name).join(', ')} require credentials. Click the MCP pill on the left to configure.`
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
                  <span>Run Now</span>
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
            title={
              hasUnconfiguredMcps
                ? 'Configure credentials before opening chat'
                : 'Inspect Agent Chat & Terminal Logs'
            }
          >
            <Terminal size={14} />
          </button>

          <button
            type="button"
            className={`crab-btn-icon crab-btn-voice voice-mic-action-btn ${isVoiceOpen ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              data.onVoiceToggle
                ? data.onVoiceToggle(data.id)
                : undefined;
            }}
            title={isVoiceOpen ? 'Close Voice Input' : 'Voice Command: Speak to Agent'}
          >
            <Mic size={14} />
          </button>

          <button
            className="crab-btn-icon crab-btn-tools"
            onClick={(e) => {
              e.stopPropagation();
              data.onOpenTools?.(data);
            }}
            title="Manage Allowed Tools (24 Built-in Tools)"
          >
            <Wrench size={14} />
          </button>

          <button
            className="crab-btn-icon crab-btn-policies"
            onClick={(e) => {
              e.stopPropagation();
              data.onOpenPolicies?.(data);
            }}
            title="Manage Guardrail Policies"
          >
            <ShieldCheck size={14} />
          </button>

          <button
            className="crab-btn-icon crab-btn-settings"
            onClick={(e) => {
              e.stopPropagation();
              data.onEdit(data);
            }}
            title="Configure Agent"
          >
            <Settings size={14} />
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
        </div>

        {/* Integrated Bottom Output Dock (Cleanly docked inside the card) */}
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
      </div>

      {/* ── Right Claw Hands (Skills & Policies Attachments) ── */}
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
    </div>
  );
}, areAgentNodePropsEqual);
