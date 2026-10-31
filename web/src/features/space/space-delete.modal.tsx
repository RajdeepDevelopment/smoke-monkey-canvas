import React, { useState, useEffect } from 'react';
import {
  Trash2,
  Layers,
  Building2,
  X,
  Users,
  Loader2,
} from 'lucide-react';
import type { SpaceAgentEntity } from '../agent/agent.types.js';
import type { GroupWorkspaceZone, RoleZone } from './space.types.js';
import { AgentAvatar } from '../agent/agent-avatar.js';

export type SpaceDeleteMode = 'all' | 'space_and_zones' | 'space_only';

export interface SpaceDeleteModalProps {
  isOpen: boolean;
  space: GroupWorkspaceZone | null;
  memberAgents: SpaceAgentEntity[];
  memberZones: RoleZone[];
  busy?: boolean;
  onConfirm: (mode: SpaceDeleteMode, deleteFiles: boolean) => Promise<void> | void;
  onCancel: () => void;
}

export const SpaceDeleteModal: React.FC<SpaceDeleteModalProps> = ({
  isOpen,
  space,
  memberAgents,
  memberZones,
  busy = false,
  onConfirm,
  onCancel,
}) => {
  const [selectedMode, setSelectedMode] = useState<SpaceDeleteMode>('all');
  const [deleteFiles, setDeleteFiles] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, busy, onCancel]);

  if (!isOpen || !space) return null;

  const hasContents = memberAgents.length > 0 || memberZones.length > 0;
  const color = space.color || '#3b82f6';

  const handleExecute = () => {
    if (busy) return;
    void onConfirm(selectedMode, deleteFiles);
  };

  return (
    <div className="modal-overlay" onClick={busy ? undefined : onCancel}>
      <div
        className="modal-content space-delete-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 620,
          width: '100%',
          maxHeight: 'min(88vh, 760px)',
          background: '#0d1117',
          border: '1px solid #30363d',
          borderRadius: 16,
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={`Delete ${space.name}`}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid #21262d',
            background: 'rgba(255,255,255,0.02)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
              }}
            >
              <Trash2 size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#f0f6fc' }}>
                Delete Office Space
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: '#8b949e' }}>
                Choose how to handle <strong style={{ color: '#c9d1d9' }}>"{space.name}"</strong> and its contents.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8b949e',
              cursor: busy ? 'not-allowed' : 'pointer',
              padding: 6,
              borderRadius: 6,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content details - scrollable body */}
        <div
          style={{
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
          }}
        >
          {/* Space Inventory Summary */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 10,
              background: 'rgba(22, 27, 34, 0.8)',
              border: '1px solid #30363d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: color,
                  boxShadow: `0 0 8px ${color}`,
                }}
              />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#f0f6fc' }}>{space.name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, color: '#8b949e' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Users size={14} style={{ color: '#58a6ff' }} />
                <strong style={{ color: '#c9d1d9' }}>{memberAgents.length}</strong> Agent{memberAgents.length === 1 ? '' : 's'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Layers size={14} style={{ color: '#a371f7' }} />
                <strong style={{ color: '#c9d1d9' }}>{memberZones.length}</strong> Role Zone{memberZones.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          {/* Member Agents Pill Strip (if any) */}
          {memberAgents.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 10,
                background: 'rgba(22, 27, 34, 0.5)',
                border: '1px solid #21262d',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  Assigned Agents ({memberAgents.length})
                </span>
                <span style={{ fontSize: 11, color: '#6e7681' }}>
                  {memberAgents.length > 6 ? 'Scroll to view all' : ''}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  maxHeight: 88,
                  overflowY: 'auto',
                  paddingRight: 4,
                }}
              >
                {memberAgents.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '3px 8px',
                      borderRadius: 12,
                      background: '#161b22',
                      border: '1px solid #30363d',
                      fontSize: 12,
                      color: '#c9d1d9',
                    }}
                  >
                    <AgentAvatar agentId={a.id} size={16} />
                    <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasContents ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Choose Deletion Scope
              </span>

              {/* Option 1: Delete All */}
              <div
                onClick={() => !busy && setSelectedMode('all')}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  padding: '14px 16px',
                  borderRadius: 12,
                  border: selectedMode === 'all' ? '1.5px solid #ef4444' : '1px solid #30363d',
                  background: selectedMode === 'all' ? 'rgba(239, 68, 68, 0.08)' : '#161b22',
                  cursor: busy ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    marginTop: 2,
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: selectedMode === 'all' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.04)',
                    color: selectedMode === 'all' ? '#ef4444' : '#8b949e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Trash2 size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: selectedMode === 'all' ? '#f87171' : '#f0f6fc' }}>
                      Delete Everything (Space, Zones & Agents)
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 99,
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#f87171',
                        fontWeight: 600,
                      }}
                    >
                      Complete Cleanup
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#8b949e', lineHeight: 1.4 }}>
                    Permanently deletes this office space, all {memberZones.length} role zones, and deletes all {memberAgents.length} agents from database.
                  </p>
                  {selectedMode === 'all' && (
                    <label
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        marginTop: 10,
                        fontSize: 12,
                        color: '#c9d1d9',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={deleteFiles}
                        onChange={(e) => setDeleteFiles(e.target.checked)}
                        style={{ accentColor: '#ef4444' }}
                      />
                      <span>Also delete agent workspace folders & memory files on disk</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Option 2: Delete Space & Zones */}
              <div
                onClick={() => !busy && setSelectedMode('space_and_zones')}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  padding: '14px 16px',
                  borderRadius: 12,
                  border: selectedMode === 'space_and_zones' ? '1.5px solid #f59e0b' : '1px solid #30363d',
                  background: selectedMode === 'space_and_zones' ? 'rgba(245, 158, 11, 0.08)' : '#161b22',
                  cursor: busy ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    marginTop: 2,
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: selectedMode === 'space_and_zones' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.04)',
                    color: selectedMode === 'space_and_zones' ? '#f59e0b' : '#8b949e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Layers size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: selectedMode === 'space_and_zones' ? '#fbbf24' : '#f0f6fc' }}>
                      Delete Space & Role Zones (Preserve Agents)
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 99,
                        background: 'rgba(245, 158, 11, 0.2)',
                        color: '#fbbf24',
                        fontWeight: 600,
                      }}
                    >
                      Keep Agents
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#8b949e', lineHeight: 1.4 }}>
                    Removes the office space container and its {memberZones.length} role zones. All {memberAgents.length} agents remain on the canvas as unassigned specialists.
                  </p>
                </div>
              </div>

              {/* Option 3: Delete Only Space */}
              <div
                onClick={() => !busy && setSelectedMode('space_only')}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  padding: '14px 16px',
                  borderRadius: 12,
                  border: selectedMode === 'space_only' ? '1.5px solid #38bdf8' : '1px solid #30363d',
                  background: selectedMode === 'space_only' ? 'rgba(56, 189, 248, 0.08)' : '#161b22',
                  cursor: busy ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    marginTop: 2,
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: selectedMode === 'space_only' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.04)',
                    color: selectedMode === 'space_only' ? '#38bdf8' : '#8b949e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Building2 size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: selectedMode === 'space_only' ? '#7dd3fc' : '#f0f6fc' }}>
                      Delete Only This Space Container
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 99,
                        background: 'rgba(56, 189, 248, 0.2)',
                        color: '#7dd3fc',
                        fontWeight: 600,
                      }}
                    >
                      Keep Inside
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#8b949e', lineHeight: 1.4 }}>
                    Removes only the outer space boundary. All {memberZones.length} role zones and {memberAgents.length} agents remain exactly as placed on the canvas.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13.5, color: '#8b949e', margin: 0 }}>
              This space has no agents or role zones inside. Are you sure you want to remove it?
            </p>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 12,
            padding: '16px 24px',
            borderTop: '1px solid #21262d',
            background: '#0d1117',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #30363d',
              background: '#21262d',
              color: '#c9d1d9',
              fontSize: 13,
              fontWeight: 500,
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecute}
            disabled={busy}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              background: selectedMode === 'all' ? '#dc2626' : selectedMode === 'space_and_zones' ? '#d97706' : '#0284c7',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? (
              <>
                <Loader2 size={14} className="spin-animate" />
                <span>Deleting...</span>
              </>
            ) : selectedMode === 'all' ? (
              <>
                <Trash2 size={14} />
                <span>Delete Everything</span>
              </>
            ) : selectedMode === 'space_and_zones' ? (
              <>
                <Layers size={14} />
                <span>Delete Space & Zones</span>
              </>
            ) : (
              <>
                <Building2 size={14} />
                <span>Delete Space Container</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
