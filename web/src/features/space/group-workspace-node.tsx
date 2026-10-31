import React, { useState } from 'react';
import { NodeResizeControl } from '@xyflow/react';
import {
  Building2,
  Users,
  Zap,
  Trash2,
  Edit2,
  Check,
  Maximize2,
  Palette,
  Sparkles,
  Terminal,
  LayoutGrid,
  Network,
} from 'lucide-react';
import type { GroupWorkspaceNodeData } from './space.types.js';
import { AgentAvatar } from '../agent/agent-avatar.js';
import { SpaceUnconfiguredMcpsRail } from './space-unconfigured-mcps-rail.js';

const COLOR_PALETTE = [
  { name: 'Sky Blue', hex: '#38bdf8' },
  { name: 'Royal Blue', hex: '#3b82f6' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Purple', hex: '#8b5cf6' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Teal', hex: '#14b8a6' },
  { name: 'Indigo', hex: '#6366f1' },
];

const SIZE_PRESETS = [
  { label: 'Compact', width: 720, height: 520 },
  { label: 'Standard', width: 920, height: 640 },
  { label: 'Expansive', width: 1240, height: 820 },
];

export const GroupWorkspaceNode: React.FC<{ data: GroupWorkspaceNodeData; selected?: boolean }> = React.memo(
  ({ data, selected }) => {
    const [isEditingName, setIsEditingName] = useState(false);
    const [nameDraft, setNameDraft] = useState(data.name);
    const [showPalette, setShowPalette] = useState(false);

    const handleSaveName = () => {
      setIsEditingName(false);
      const clean = nameDraft.trim() || 'Group Workspace';
      setNameDraft(clean);
      data.onUpdateZone?.(data.id, { name: clean });
    };

    const handleColorSelect = (hex: string) => {
      setShowPalette(false);
      if (hex && data.id) {
        data.onUpdateZone?.(data.id, { color: hex });
      }
    };

    const handlePresetSize = (w: number, h: number) => {
      data.onUpdateZone?.(data.id, { width: w, height: h });
    };

    const members = data.memberAgents || [];
    const color = data.color || '#38bdf8';
    const isCircle = data.shape === 'circle';

    // Responsive width thresholds
    const currentWidth = data.width || 720;
    const isCompact = currentWidth < 680;
    const isNarrow = currentWidth < 550;
    const isMini = currentWidth < 440;

    return (
      <div
        className={`group-workspace-node ${selected ? 'selected' : ''}`}
        style={{
          width: '100%',
          height: '100%',
          minWidth: 360,
          minHeight: 280,
          borderRadius: isCircle ? '9999px' : '20px',
          borderColor: selected ? color : `${color}66`,
          ['--zone-color' as any]: color,
        }}
      >
        {/* ── Top Office Room Header ────────────────────────────────────────── */}
        <div
          className="group-workspace-header group-workspace-drag-handle"
        >
          <div className="zone-title-area">
            <div
              className="zone-icon-box"
              style={{
                background: `${color}25`,
                color,
                border: `1px solid ${color}44`,
              }}
            >
              <Building2 size={15} />
            </div>

            {isEditingName ? (
              <div
                className="zone-name-edit nodrag nopan"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  value={nameDraft}
                  autoFocus
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') setIsEditingName(false);
                  }}
                  onBlur={handleSaveName}
                  className="zone-name-input"
                />
                <button type="button" onClick={handleSaveName} className="zone-save-btn">
                  <Check size={12} />
                </button>
              </div>
            ) : (
            <div
              className="zone-name-display nodrag nopan"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingName(true);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              title={`Click to rename office space: ${data.name}`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsEditingName(true);
                }
              }}
            >
                <span className="zone-name-text">{data.name}</span>
                <Edit2 size={11} className="zone-edit-icon" />
              </div>
            )}

            {/* Member count pill */}
            <div
              className="zone-members-badge nodrag nopan"
              style={{
                cursor: members.length > 0 ? 'pointer' : 'default',
              }}
              onClick={(e) => {
                if (members.length > 0) {
                  e.stopPropagation();
                  data.onAlignZoneMembers?.(data.id);
                }
              }}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && members.length > 0) {
                  e.preventDefault();
                  e.stopPropagation();
                  data.onAlignZoneMembers?.(data.id);
                }
              }}
              role={members.length > 0 ? 'button' : 'status'}
              tabIndex={members.length > 0 ? 0 : -1}
              aria-label={members.length > 0 ? `Align ${members.length} agents in room` : `${members.length} agents in room`}
              title={
                members.length > 0
                  ? `${members.length} agents in room · Click to auto-fit & align`
                  : '0 agents in room'
              }
            >
              <Users size={11} />
              <span>
                {isMini
                  ? members.length
                  : isNarrow
                    ? `${members.length} Ag.`
                    : `${members.length} ${members.length === 1 ? 'Agent' : 'Agents'}`}
              </span>
            </div>
          </div>

          {/* ── Actions & Controls ── */}
          <div
            className="zone-actions-area nodrag nopan"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Per-space workspace control */}
            <button
              type="button"
              className={`zone-workspace-btn nodrag nopan ${data.isWorkspaceOpen ? 'is-active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                data.onOpenWorkspace?.(data.id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              title={`Open workspace for ${data.name}`}
              aria-pressed={data.isWorkspaceOpen}
            >
              <Network size={13} style={{ color }} />
              {!isNarrow && <span>Workspace</span>}
              {(data.workspaceZoneCount ?? 0) > 0 && (
                <span className="zone-workspace-count">{data.workspaceZoneCount}</span>
              )}
            </button>

            {/* Auto-Align & Fit Members inside Room */}
            {members.length > 0 && (
              <button
                type="button"
                className="zone-tool-btn nodrag nopan"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  data.onAlignZoneMembers?.(data.id);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                title={`Auto-fit & align all ${members.length} agents neatly inside this room`}
              >
                <LayoutGrid size={13} style={{ color }} />
              </button>
            )}

            {/* Autonomous Peer Pod Status Badge (Responsive text / icon) */}
            <div
              className={`zone-pod-status-badge ${isNarrow ? 'is-narrow' : ''}`}
              title={
                members.length >= 2
                  ? `Autonomous Peer Pod: All ${members.length} member agents are automatically interconnected peers and delegate tasks to each other freely.`
                  : 'Place 2 or more agents inside this room to automatically interconnect them as peer collaborators.'
              }
              role="status"
              aria-live="polite"
            >
              <Zap
                size={12}
                fill={members.length >= 2 ? color : 'none'}
                style={{ color: members.length >= 2 ? color : 'currentColor' }}
              />
              {!isMini && (
                <span>
                  {isCompact
                    ? members.length >= 2
                      ? `Pod (${members.length})`
                      : 'Pod'
                    : members.length >= 2
                      ? `⚡ Autonomous Pod (${members.length} Peers Connected)`
                      : '⚡ Peer Pod (Drop 2+ Agents)'}
                </span>
              )}
            </div>

            {/* Size Preset Selector (Hidden in narrow mode to prevent crowding) */}
            {!isNarrow && (
              <div className="zone-size-presets nodrag nopan">
                {SIZE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePresetSize(preset.width, preset.height);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`zone-preset-btn ${
                      data.width === preset.width && data.height === preset.height ? 'active' : ''
                    }`}
                    title={`${preset.label} (${preset.width}x${preset.height}px)`}
                  >
                    {preset.label[0]}
                  </button>
                ))}
              </div>
            )}

            {/* Color Swatch Button with Crash-proof popover and backdrop */}
            <div className="zone-color-wrapper nodrag nopan">
              <button
                type="button"
                className="zone-tool-btn nodrag nopan"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowPalette((v) => !v);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                title="Change space theme color"
              >
                <Palette size={13} style={{ color }} />
              </button>

              {showPalette && (
                <>
                  <div
                    className="zone-color-backdrop nodrag nopan"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setShowPalette(false);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                  <div
                    className="zone-color-menu nodrag nopan"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    {COLOR_PALETTE.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        className={`zone-color-chip ${color === c.hex ? 'active' : ''}`}
                        style={{ background: c.hex }}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleColorSelect(c.hex);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        title={c.name}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Delete Zone */}
            <button
              type="button"
              className="zone-tool-btn danger nodrag nopan"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                data.onRemoveZone?.(data.id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              title="Delete workspace zone"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* ── Floor / Bounding Zone Interior ──────────────────────────────── */}
        <div className="group-workspace-interior group-workspace-drag-handle">
          {members.length === 0 ? (
            <div className="zone-empty-hint">
              <Sparkles size={16} style={{ color, opacity: 0.7 }} />
              <span>Drag & drop agents into this room to group them</span>
            </div>
          ) : null}
        </div>

        {/* ── Bottom Member Agent Bar ─────────────────────────────────────── */}
        {members.length > 0 && (
          <div
            className="group-workspace-footer"
          >
            <div className="zone-members-scroll">
              <span className="zone-members-label">
                Pod Members ({members.length}):
              </span>
              {members.map((m) => (
                <div
                  key={m.id}
                  className="zone-member-pill has-avatar nodrag nopan"
                  title={`${m.name}${m.role ? ` — ${m.role}` : ''}${m.model ? ` [${m.model}]` : ''} · Click to open chat/logs`}
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onOpenDrawer?.(m as any);
                  }}
                >
                  <AgentAvatar
                    agentId={m.id}
                    size={22}
                    className="zone-member-avatar"
                    onClick={(e) => {
                      e.stopPropagation();
                      data.onOpenDrawer?.(m as any);
                    }}
                  />
                  <div className="zone-member-info">
                    <span className="zone-member-name">{m.name}</span>
                    {m.role && <span className="zone-member-role">{m.role}</span>}
                  </div>
                  <Terminal size={11} className="zone-member-term-icon" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Corner Resize Handle via NodeResizeControl ─────────────────── */}
        {!isCircle && (
          <NodeResizeControl
            position="bottom-right"
            minWidth={360}
            minHeight={280}
            maxWidth={30000}
            maxHeight={30000}
            onResizeEnd={(_e, params) => {
              data.onUpdateZone?.(data.id, {
                width: Math.round(params.width),
                height: Math.round(params.height),
                x: Math.round(params.x),
                y: Math.round(params.y),
              });
            }}
          >
            <div
              className="group-workspace-resize-handle nodrag nopan"
              title="Drag corner to expand or shrink workspace room"
              style={{ color }}
            >
              <Maximize2 size={12} />
            </div>
          </NodeResizeControl>
        )}

        {/* ── Attached Right-Side Unconfigured MCPs Rail (Synchronized Zoom & Height) ── */}
        <SpaceUnconfiguredMcpsRail
          memberAgents={members}
          stockMcps={data.stockMcps}
          mcpReadiness={data.mcpReadiness}
          configuredKeys={data.configuredKeys}
          spaceColor={color}
          connectingMcpName={data.connectingMcpName}
          onConnectMcp={data.onConnectMcp}
          onRemoveMcp={data.onRemoveMcp}
          onOpenAgent={data.onOpenDrawer}
        />
      </div>
    );
  },
);
