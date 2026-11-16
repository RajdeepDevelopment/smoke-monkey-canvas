import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Cpu,
  FolderOpen,
  GitBranch,
  Layers,
  Loader2,
  Network,
  Package,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { SpaceService } from './space.service.js';

interface ExploreReportPreviewProps {
  sessionId: string;
  report: any;
  onAccepted: (architectAgentId: string) => void;
  onClose: () => void;
}

export function ExploreReportPreview({
  sessionId,
  report,
  onAccepted,
  onClose,
}: ExploreReportPreviewProps) {
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setIsAccepting(true);
    setError(null);
    try {
      const result = await SpaceService.acceptExploreReport(sessionId);
      onAccepted(result.architectAgentId);
    } catch (err) {
      setError(String(err));
      setIsAccepting(false);
    }
  };

  const complexityBadge = (complexity?: string) => {
    const c = (complexity || 'medium').toLowerCase();
    const bg =
      c === 'high'
        ? 'rgba(239, 68, 68, 0.15)'
        : c === 'low'
        ? 'rgba(34, 197, 94, 0.15)'
        : 'rgba(245, 158, 11, 0.15)';
    const color = c === 'high' ? '#f87171' : c === 'low' ? '#4ade80' : '#fbbf24';
    return (
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          background: bg,
          color,
          padding: '2px 8px',
          borderRadius: 6,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {c}
      </span>
    );
  };

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--bg-primary, #0f1117)',
          border: '1px solid var(--border-primary, #2a2d3e)',
          borderRadius: 16,
          width: '94vw',
          maxWidth: 960,
          maxHeight: '92vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 28px 90px rgba(0,0,0,0.75)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-primary, #2a2d3e)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: 'rgba(15, 17, 23, 0.85)',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(34,197,94,0.35)',
            }}
          >
            <CheckCircle2 size={20} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary, #e2e8f0)' }}>
              Explore Findings & Proposed Team Matrix — {report.company_name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', marginTop: 2 }}>
              {report.features?.length || 0} Dedicated Features · {report.zones_plan?.length || 0} Department Zones · {report.managers_plan?.length || 0} Managers · {report.agent_count_estimate || 0} Total Agents
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted, #94a3b8)',
              padding: 6,
              borderRadius: 6,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
          }}
        >
          {/* Executive Overview */}
          <div
            style={{
              background: 'var(--bg-secondary, #161b2e)',
              border: '1px solid var(--border-primary, #2a2d3e)',
              borderRadius: 12,
              padding: 18,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#818cf8',
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 6,
              }}
            >
              Executive Summary & Scope
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary, #cbd5e1)', lineHeight: 1.6, margin: 0 }}>
              {report.explore_summary || report.project_summary}
            </p>

            <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--text-muted, #94a3b8)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Package size={13} color="#818cf8" />
                {report.company_type?.replace(/_/g, ' ') || 'Software Product'}
              </span>
              <div style={{ width: 1, height: 14, background: 'var(--border-primary, #2a2d3e)' }} />
              {(report.tech_stack || []).map((tech: string) => (
                <span
                  key={tech}
                  style={{
                    fontSize: 11,
                    background: 'rgba(99, 102, 241, 0.12)',
                    color: '#c7d2fe',
                    borderRadius: 6,
                    padding: '3px 8px',
                    fontWeight: 500,
                  }}
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Department Zones Plan */}
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-primary, #e2e8f0)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 10,
              }}
            >
              <Network size={15} color="#818cf8" /> Department Zones & Hierarchy
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(report.zones_plan || []).map((zone: any, zIdx: number) => (
                <div
                  key={zIdx}
                  style={{
                    background: 'var(--bg-secondary, #161b2e)',
                    border: '1px solid var(--border-primary, #2a2d3e)',
                    borderRadius: 10,
                    padding: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 3,
                          background: zone.color || '#3b82f6',
                        }}
                      />
                      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary, #e2e8f0)' }}>
                        {zone.name}
                      </span>
                      {zone.role_title && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)' }}>
                          · {zone.role_title}
                        </span>
                      )}
                    </div>
                    {zone.sub_zones?.length > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted, #64748b)' }}>
                        {zone.sub_zones.length} sub-zone(s)
                      </span>
                    )}
                  </div>
                  {zone.description && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', marginTop: 4 }}>
                      {zone.description}
                    </div>
                  )}
                  {zone.sub_zones && zone.sub_zones.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      {zone.sub_zones.map((sz: any, sIdx: number) => (
                        <div
                          key={sIdx}
                          style={{
                            fontSize: 11,
                            background: 'rgba(99, 102, 241, 0.08)',
                            border: '1px solid rgba(99, 102, 241, 0.18)',
                            color: '#c7d2fe',
                            borderRadius: 6,
                            padding: '4px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <Layers size={11} color="#818cf8" />
                          <span>{sz.name}</span>
                          <span style={{ color: '#818cf8', fontWeight: 600 }}>
                            ({sz.features?.length || 0} features)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Dedicated Feature Agents & Folders */}
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-primary, #e2e8f0)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 10,
              }}
            >
              <Cpu size={15} color="#818cf8" /> Dedicated Feature Agents & Folder Ownership ({report.features?.length || 0})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(report.features || []).map((feature: any) => {
                const isExpanded = expandedFeature === feature.id;
                return (
                  <div
                    key={feature.id}
                    style={{
                      background: 'var(--bg-secondary, #161b2e)',
                      border: '1px solid var(--border-primary, #2a2d3e)',
                      borderRadius: 10,
                      overflow: 'hidden',
                      transition: 'border-color 0.15s ease',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedFeature(isExpanded ? null : feature.id)}
                      style={{
                        width: '100%',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        textAlign: 'left',
                      }}
                    >
                      {isExpanded ? (
                        <ChevronDown size={15} color="#818cf8" />
                      ) : (
                        <ChevronRight size={15} color="#64748b" />
                      )}
                      <span
                        style={{
                          flex: 1,
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--text-primary, #e2e8f0)',
                        }}
                      >
                        {feature.name}
                      </span>
                      {complexityBadge(feature.complexity)}
                      <div
                        style={{
                          fontSize: 12,
                          color: '#818cf8',
                          background: 'rgba(99, 102, 241, 0.12)',
                          padding: '3px 10px',
                          borderRadius: 6,
                          fontWeight: 500,
                        }}
                      >
                        👤 {feature.suggested_agent_name}
                      </div>
                    </button>

                    {isExpanded && (
                      <div
                        style={{
                          padding: '0 16px 14px 40px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                          borderTop: '1px solid rgba(255,255,255,0.04)',
                          marginTop: 2,
                          paddingTop: 10,
                        }}
                      >
                        <div style={{ fontSize: 12, color: 'var(--text-secondary, #cbd5e1)', lineHeight: 1.5 }}>
                          {feature.description}
                        </div>

                        {feature.folders && feature.folders.length > 0 && (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>
                              Dedicated Owned Folders:
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {feature.folders.map((f: string) => (
                                <span
                                  key={f}
                                  style={{
                                    fontSize: 11,
                                    fontFamily: 'monospace',
                                    background: 'rgba(99, 102, 241, 0.08)',
                                    color: '#818cf8',
                                    borderRadius: 4,
                                    padding: '2px 8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}
                                >
                                  <FolderOpen size={11} /> {f}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {feature.key_files && feature.key_files.length > 0 && (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>
                              Key Files & Entry Points:
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {feature.key_files.map((file: string) => (
                                <span
                                  key={file}
                                  style={{
                                    fontSize: 11,
                                    fontFamily: 'monospace',
                                    color: 'var(--text-secondary, #cbd5e1)',
                                  }}
                                >
                                  📄 {file}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Managers Plan */}
          {report.managers_plan && report.managers_plan.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-primary, #e2e8f0)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 10,
                }}
              >
                <Users size={15} color="#818cf8" /> Domain Managers (Oversight & Task Delegation, No Direct Code)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                {report.managers_plan.map((m: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-secondary, #161b2e)',
                      border: '1px solid var(--border-primary, #2a2d3e)',
                      borderRadius: 10,
                      padding: '12px 14px',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #e2e8f0)' }}>
                      {m.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#818cf8', marginTop: 2 }}>
                      Zone: {m.zone}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)', marginTop: 4 }}>
                      Manages {m.manages_features?.length || 0} features
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Required MCP Servers & Phase 3 Sync */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* MCPs */}
            <div
              style={{
                background: 'var(--bg-secondary, #161b2e)',
                border: '1px solid var(--border-primary, #2a2d3e)',
                borderRadius: 10,
                padding: 14,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-primary, #e2e8f0)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 8,
                }}
              >
                <GitBranch size={13} color="#818cf8" /> Required MCPs for Team
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(report.required_mcps || ['smoke-monkey-canvas', 'github', 'filesystem']).map((mcp: string) => (
                  <span
                    key={mcp}
                    style={{
                      fontSize: 11,
                      background: 'rgba(245, 158, 11, 0.12)',
                      color: '#fbbf24',
                      borderRadius: 6,
                      padding: '3px 8px',
                      fontWeight: 500,
                    }}
                  >
                    {mcp}
                  </span>
                ))}
              </div>
            </div>

            {/* Sync */}
            <div
              style={{
                background: 'var(--bg-secondary, #161b2e)',
                border: '1px solid var(--border-primary, #2a2d3e)',
                borderRadius: 10,
                padding: 14,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-primary, #e2e8f0)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 6,
                }}
              >
                <Clock size={13} color="#818cf8" /> Phase 3: 3-Hour Sync Cron
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)', lineHeight: 1.5 }}>
                Each leaf agent will have a 3-hour cron job registered. It scans owned folders for changes and syncs memories autonomously.
              </div>
            </div>
          </div>

          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #ef4444',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 13,
                color: '#f87171',
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-primary, #2a2d3e)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 17, 23, 0.85)',
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)' }}>
            Phase 2 will spawn the Architect Agent to generate all zones, CTO, managers, and leaf agents on canvas.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 18px',
                fontSize: 13,
                borderRadius: 8,
                cursor: 'pointer',
                background: 'none',
                border: '1px solid var(--border-primary, #2a2d3e)',
                color: 'var(--text-secondary, #94a3b8)',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={isAccepting}
              style={{
                padding: '8px 24px',
                fontSize: 13,
                borderRadius: 8,
                cursor: isAccepting ? 'not-allowed' : 'pointer',
                background: isAccepting ? '#374151' : 'linear-gradient(135deg, #22c55e, #16a34a)',
                border: 'none',
                color: '#fff',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                opacity: isAccepting ? 0.7 : 1,
                boxShadow: isAccepting ? 'none' : '0 4px 14px rgba(34,197,94,0.35)',
              }}
            >
              {isAccepting ? (
                <>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Spawning Architect...
                </>
              ) : (
                <>
                  <Sparkles size={14} /> Accept & Build Team on Canvas
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
