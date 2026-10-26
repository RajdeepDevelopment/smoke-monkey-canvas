import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Film,
  FolderOpen,
  GitBranch,
  Image as ImageIcon,
  Loader2,
  Network,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import type { SpaceAgentEntity, WorkspaceFileItem } from '../agent/agent.types.js';
import { AgentService } from '../agent/agent.service.js';
import { isUserDeliverableAsset } from './agent-assets-node.js';
import { SpaceService } from './space.service.js';
import type {
  GroupWorkspaceZone,
  RoleZone,
  SpaceWorkflow,
  WorkflowAgentCapability,
  WorkflowDelegationRoute,
  WorkflowTreeZone,
} from './space.types.js';
import { resolveZoneAt } from './space.zones.js';
import { openExternalLink } from '../../config/desktop.bridge.js';

interface SpaceWorkspacePanelProps {
  space: GroupWorkspaceZone | null;
  panelStyle?: React.CSSProperties;
  embedded?: boolean;
  agents: SpaceAgentEntity[];
  zones: RoleZone[];
  onClose: () => void;
  onCreateZone: () => void;
  onEditZone: (zone: RoleZone) => void;
  onRemoveZone: (id: string) => void;
  onFocusZone: (zone: RoleZone) => void;
  onOpenAgent: (agent: SpaceAgentEntity) => void;
  onSaveWorkflowPrompt?: (spaceId: string, prompt: string) => void;
}

type WorkspacePanelTab = 'hierarchy' | 'workflow' | 'agents' | 'assets';

const TAB_META: Array<{ id: WorkspacePanelTab; label: string }> = [
  { id: 'hierarchy', label: 'Hierarchy' },
  { id: 'workflow', label: 'Workflow' },
  { id: 'agents', label: 'Agents' },
  { id: 'assets', label: 'Assets' },
];

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatAssetTime(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function assetIcon(file: WorkspaceFileItem): React.ReactNode {
  const ext = (file.extension || '').toLowerCase().replace(/^\./, '');
  if (file.category === 'image' || ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico', 'avif'].includes(ext)) {
    return <ImageIcon size={12} />;
  }
  if (file.category === 'data' || ['xlsx', 'xls', 'csv', 'tsv', 'parquet', 'json', 'jsonl'].includes(ext)) {
    return <FileSpreadsheet size={12} />;
  }
  if (file.category === 'video' || file.category === 'audio' || ['mp4', 'webm', 'mov', 'mp3', 'wav'].includes(ext)) {
    return <Film size={12} />;
  }
  return <FileText size={12} />;
}

function formatTime(iso?: string): string {
  if (!iso) return 'never';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return iso;
  }
}

function capabilityName(capabilities: Map<string, WorkflowAgentCapability>, id: string): string {
  return capabilities.get(id)?.name || id;
}

function routeAllowedIds(route: WorkflowDelegationRoute): string[] {
  return [...new Set([...route.managerIds, ...route.reportIds, ...route.peerIds])];
}

function policyLabel(policy: WorkflowDelegationRoute['policy']): string {
  if (!policy) return 'No zone';
  if (policy === 'auto') return 'Auto: down + peers + up';
  if (policy === 'down') return 'Downward + peers';
  if (policy === 'up') return 'Upward only';
  if (policy === 'both') return 'Both directions';
  return 'Peers only';
}

export const SpaceWorkspacePanel: React.FC<SpaceWorkspacePanelProps> = ({
  space,
  panelStyle,
  embedded = false,
  agents,
  zones,
  onClose,
  onCreateZone,
  onEditZone,
  onRemoveZone,
  onFocusZone,
  onOpenAgent,
  onSaveWorkflowPrompt,
}) => {
  const [activeTab, setActiveTab] = useState<WorkspacePanelTab>('hierarchy');
  const [workflow, setWorkflow] = useState<SpaceWorkflow | null>(null);
  const [isLoadingWorkflow, setIsLoadingWorkflow] = useState(false);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [workflowRefreshKey, setWorkflowRefreshKey] = useState(0);
  const [workflowPrompt, setWorkflowPrompt] = useState('');
  const [savedWorkflowPrompt, setSavedWorkflowPrompt] = useState('');
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [promptNotice, setPromptNotice] = useState<string | null>(null);
  const [assetGroups, setAssetGroups] = useState<
    Array<{ agent: SpaceAgentEntity; files: WorkspaceFileItem[]; error?: string }>
  >([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [assetsError, setAssetsError] = useState<string | null>(null);
  const [assetsRefreshKey, setAssetsRefreshKey] = useState(0);

  const spaceId = space?.id ?? null;
  const zoneIdsKey = zones.map((zone) => zone.id).join('|');
  const agentIdsKey = agents.map((agent) => agent.id).join('|');

  useEffect(() => {
    if (!spaceId) return;
    let cancelled = false;
    setIsLoadingWorkflow(true);
    setWorkflowError(null);
    SpaceService.fetchWorkflow()
      .then((data) => {
        if (cancelled) return;
        const scopedZoneIds = new Set(zones.map((zone) => zone.id));
        const scopedAgentIds = new Set(agents.map((agent) => agent.id));
        const scopedZones = data.zones.filter((zone) => scopedZoneIds.has(zone.id));
        const scopedUnassigned = data.unassignedAgents.filter((agent) => scopedAgentIds.has(agent.id));
        const scopedRoutes = data.routes.filter((route) => scopedAgentIds.has(route.agentId));
        setWorkflow({
          ...data,
          totalAgents: scopedZones.reduce((sum, zone) => sum + zone.members.length, 0) + scopedUnassigned.length,
          totalZones: scopedZones.length,
          zones: scopedZones,
          unassignedAgents: scopedUnassigned,
          routes: scopedRoutes,
          connections: data.connections.filter(
            (connection) =>
              scopedAgentIds.has(connection.sourceAgentId) &&
              scopedAgentIds.has(connection.targetAgentId),
          ),
        });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setWorkflowError(error instanceof Error ? error.message : 'Failed to load workflow');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingWorkflow(false);
      });
    return () => {
      cancelled = true;
    };
  }, [spaceId, workflowRefreshKey, zoneIdsKey, agentIdsKey]);

  useEffect(() => {
    if (!spaceId) return;
    let cancelled = false;
    setIsLoadingPrompt(true);
    setPromptError(null);
    setPromptNotice(null);
    SpaceService.fetchWorkspacePrompt(spaceId)
      .then((data) => {
        if (cancelled) return;
        const value = data.prompt || space?.workflowPrompt || '';
        setWorkflowPrompt(value);
        setSavedWorkflowPrompt(value);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const fallback = space?.workflowPrompt || '';
        setWorkflowPrompt(fallback);
        setSavedWorkflowPrompt(fallback);
        setPromptError(error instanceof Error ? error.message : 'Failed to load workspace prompt');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPrompt(false);
      });
    return () => {
      cancelled = true;
    };
  }, [spaceId, space?.workflowPrompt]);

  useEffect(() => {
    if (!spaceId || activeTab !== 'assets') return;
    let cancelled = false;
    setIsLoadingAssets(true);
    setAssetsError(null);
    Promise.all(
      agents.map(async (agent) => {
        try {
          const response = await AgentService.fetchWorkspaceFiles(agent.id);
          return {
            agent,
            files: (response.files || []).filter(
              (file) => !file.isDirectory && isUserDeliverableAsset(file),
            ),
          };
        } catch (error: unknown) {
          return {
            agent,
            files: [],
            error: error instanceof Error ? error.message : 'Failed to load assets',
          };
        }
      }),
    )
      .then((groups) => {
        if (!cancelled) setAssetGroups(groups);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setAssetsError(error instanceof Error ? error.message : 'Failed to load workspace assets');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingAssets(false);
      });
    return () => {
      cancelled = true;
    };
  }, [spaceId, activeTab, agentIdsKey, assetsRefreshKey]);

  useEffect(() => {
    if (!spaceId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [spaceId, onClose]);

  useEffect(() => {
    if (!spaceId) return;
    void SpaceService.setWorkspaceAgents(
      spaceId,
      agents.map((agent) => agent.id),
    ).catch(() => {
      // Prompt injection still works for agents assigned to a role zone.
    });
  }, [spaceId, agentIdsKey]);

  const handleSaveWorkflowPrompt = async () => {
    if (!space || isSavingPrompt) return;
    setIsSavingPrompt(true);
    setPromptError(null);
    setPromptNotice(null);
    try {
      const saved = await SpaceService.saveWorkspacePrompt(space.id, space.name, workflowPrompt);
      setWorkflowPrompt(saved.prompt);
      setSavedWorkflowPrompt(saved.prompt);
      onSaveWorkflowPrompt?.(space.id, saved.prompt);
      setPromptNotice('Workspace prompt saved. Every agent run in this workspace will use it.');
    } catch (error: unknown) {
      setPromptError(error instanceof Error ? error.message : 'Failed to save workspace prompt');
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const zonesByParent = useMemo(() => {
    const map = new Map<string | null, RoleZone[]>();
    const ids = new Set(zones.map((zone) => zone.id));
    for (const zone of zones) {
      const parentId = zone.parentZoneId && ids.has(zone.parentZoneId) ? zone.parentZoneId : null;
      const list = map.get(parentId) ?? [];
      list.push(zone);
      map.set(parentId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.name.localeCompare(b.name));
    }
    return map;
  }, [zones]);

  const workflowCaps = useMemo(() => {
    const capabilities = new Map<string, WorkflowAgentCapability>();
    if (!workflow) return capabilities;
    for (const zone of workflow.zones) {
      for (const member of zone.members) capabilities.set(member.id, member);
    }
    for (const member of workflow.unassignedAgents) capabilities.set(member.id, member);
    return capabilities;
  }, [workflow]);

  const agentsByZone = useMemo(() => {
    const map = new Map<string, SpaceAgentEntity[]>();
    for (const agent of agents) {
      const zone = resolveZoneAt(agent.pos_x, agent.pos_y, zones);
      if (!zone) continue;
      const list = map.get(zone.id) ?? [];
      list.push(agent);
      map.set(zone.id, list);
    }
    return map;
  }, [agents, zones]);

  const workflowZoneById = useMemo(() => {
    const map = new Map<string, WorkflowTreeZone>();
    for (const zone of workflow?.zones ?? []) map.set(zone.id, zone);
    return map;
  }, [workflow]);

  const renderZoneBranch = (zone: RoleZone, depth: number): React.ReactNode => {
    const members = agentsByZone.get(zone.id) ?? [];
    const liveZone = workflowZoneById.get(zone.id);
    const children = zonesByParent.get(zone.id) ?? [];
    return (
      <div key={zone.id} className="workspace-zone-branch" style={{ marginLeft: depth * 14 }}>
        <div
          className="workspace-zone-card"
          style={{ '--zone-accent': zone.color } as React.CSSProperties}
        >
          <div className="workspace-zone-card-head">
            <button
              type="button"
              className="workspace-zone-title-btn"
              onClick={() => onFocusZone(zone)}
              title="Focus this zone on the canvas"
            >
              <span className="workspace-zone-level" style={{ color: zone.color, borderColor: `${zone.color}55`, background: `${zone.color}16` }}>
                L{zone.level ?? 0}
              </span>
              <span className="workspace-zone-title-wrap">
                <span className="workspace-zone-title">{zone.name}</span>
                <span className="workspace-zone-role">{zone.roleTitle || 'Team Member'}</span>
              </span>
            </button>
            <div className="workspace-zone-actions">
              <button type="button" onClick={() => onEditZone(zone)} title="Edit role zone">
                <Pencil size={12} />
              </button>
              <button type="button" className="danger" onClick={() => onRemoveZone(zone.id)} title="Delete role zone">
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          <div className="workspace-zone-meta">
            <span>{members.length} agent{members.length === 1 ? '' : 's'}</span>
            {liveZone && <span>{liveZone.members.filter((member) => member.isConfigured).length} ready</span>}
            <span>{policyLabel(zone.delegationPolicy || 'auto')}</span>
          </div>

          {members.length > 0 ? (
            <div className="workspace-zone-agent-list">
              {members.map((agent) => {
                const cap = workflowCaps.get(agent.id);
                const configured = cap ? cap.isConfigured : true;
                return (
                  <button
                    key={agent.id}
                    type="button"
                    className={`workspace-agent-chip ${configured ? '' : 'is-unconfigured'}`}
                    onClick={() => onOpenAgent(agent)}
                    title={`Open ${agent.name}${agent.role ? ` — ${agent.role}` : ''}`}
                  >
                    <span
                      className={`workspace-agent-dot status-${agent.status}`}
                      style={{ background: configured ? zone.color : '#f59e0b' }}
                    />
                    <span className="workspace-agent-name">{agent.name}</span>
                    <span className="workspace-agent-role">{zone.roleTitle}</span>
                    {!configured && <AlertTriangle size={11} />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="workspace-zone-empty">Empty — drop agents into this zone on the canvas.</div>
          )}

          {(zone.repoUrl || zone.workingDir) && (
            <div className="workspace-zone-project-inline">
              {zone.repoUrl && (
                <button
                  type="button"
                  onClick={() => openExternalLink(zone.repoUrl!)}
                  title={zone.repoUrl}
                >
                  <GitBranch size={11} />
                  <span>{zone.repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//, '')}</span>
                  <ArrowUpRight size={10} />
                </button>
              )}
              {zone.workingDir && (
                <span title={zone.workingDir}>
                  <FolderOpen size={11} />
                  <span>{zone.workingDir.split('/').filter(Boolean).slice(-2).join('/')}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {children.map((child) => renderZoneBranch(child, depth + 1))}
      </div>
    );
  };

  if (!space) return null;

  const rootZones = zonesByParent.get(null) ?? [];
  const unassignedAgents = agents.filter((agent) => !resolveZoneAt(agent.pos_x, agent.pos_y, zones));
  const routesWithZones = (workflow?.routes ?? []).filter((route) => route.zoneId);
  const totalAssets = assetGroups.reduce((sum, group) => sum + group.files.length, 0);
  const hasUnsavedPrompt = workflowPrompt.trim() !== savedWorkflowPrompt.trim();

  return (
    <aside
      className={`space-workspace-panel ${embedded ? 'is-embedded' : ''}`}
      aria-label={`${space.name} workspace`}
      style={
        {
          '--workspace-accent': space.color,
          ...(embedded ? {} : panelStyle),
        } as React.CSSProperties
      }
    >
      <div className="workspace-panel-header">
        <div className="workspace-panel-brand">
          <div className="workspace-panel-icon">
            <Network size={16} />
          </div>
          <div>
            <div className="workspace-panel-title">{space.name}</div>
            <div className="workspace-panel-sub">
              Workspace · {zones.length} zone{zones.length === 1 ? '' : 's'} · {agents.length} agent{agents.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>
        <div className="workspace-panel-header-actions nodrag nopan">
          <button type="button" onClick={onCreateZone} title="Create role zone">
            <Plus size={14} />
          </button>
          <button type="button" onClick={onClose} title="Close workspace panel" aria-label="Close workspace panel">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="workspace-panel-tabs" role="tablist">
        {TAB_META.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? 'is-active' : ''}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="workspace-panel-body nodrag nopan nowheel">
        {activeTab === 'hierarchy' && (
          <>
            <div className="workspace-panel-section-head">
              <span>Reporting tree</span>
              <button type="button" onClick={onCreateZone}>
                <Plus size={11} /> New zone
              </button>
            </div>
            {rootZones.length > 0 ? (
              <div className="workspace-zone-tree">{rootZones.map((zone) => renderZoneBranch(zone, 0))}</div>
            ) : (
              <div className="workspace-panel-empty">
                <Network size={26} />
                <div className="workspace-panel-empty-title">No role zones yet</div>
                <p>Create a CTO, manager or tech-lead zone, then deploy it from the Spaces tab. Drop agents inside to build the hierarchy.</p>
                <button type="button" className="btn-primary" onClick={onCreateZone}>
                  <Plus size={12} /> Create first role zone
                </button>
              </div>
            )}

            {unassignedAgents.length > 0 && (
              <div className="workspace-unassigned-block">
                <div className="workspace-panel-section-head">
                  <span>Unassigned agents ({unassignedAgents.length})</span>
                </div>
                <div className="workspace-zone-agent-list">
                  {unassignedAgents.map((agent) => (
                    <button
                      key={agent.id}
                      type="button"
                      className="workspace-agent-chip"
                      onClick={() => onOpenAgent(agent)}
                    >
                      <span className={`workspace-agent-dot status-${agent.status}`} style={{ background: '#64748b' }} />
                      <span className="workspace-agent-name">{agent.name}</span>
                      <span className="workspace-agent-role">{agent.role || 'No role'}</span>
                    </button>
                  ))}
                </div>
                <p className="workspace-panel-hint">Drag them into a zone on the canvas to assign a role automatically.</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'workflow' && (
          <>
            <div className="workspace-prompt-card">
              <div className="workspace-panel-section-head">
                <span>Workspace operating prompt</span>
                <span className={`workspace-prompt-state ${hasUnsavedPrompt ? 'is-dirty' : ''}`}>
                  {hasUnsavedPrompt ? 'Unsaved' : 'Saved'}
                </span>
              </div>
              <p className="workspace-panel-hint">
                This prompt is injected into every agent run in this workspace, above the live hierarchy.
              </p>
              {isLoadingPrompt ? (
                <div className="workspace-prompt-loading">
                  <Loader2 size={13} className="is-spinning" /> Loading prompt…
                </div>
              ) : (
                <textarea
                  className="workspace-prompt-input"
                  value={workflowPrompt}
                  onChange={(event) => {
                    setWorkflowPrompt(event.target.value);
                    setPromptNotice(null);
                  }}
                  placeholder="Example: Always ship a concise implementation plan first. Use TypeScript strict mode. Report blockers to the workspace lead. Keep deliverables inside artifacts/."
                  rows={5}
                  maxLength={12000}
                />
              )}
              <div className="workspace-prompt-actions">
                <span>{workflowPrompt.length.toLocaleString()} / 12,000</span>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSaveWorkflowPrompt}
                  disabled={isLoadingPrompt || isSavingPrompt || !hasUnsavedPrompt}
                >
                  {isSavingPrompt ? <Loader2 size={11} className="is-spinning" /> : <Save size={11} />}
                  {isSavingPrompt ? 'Saving…' : 'Save prompt'}
                </button>
              </div>
              {promptError && (
                <div className="workspace-panel-error">
                  <AlertTriangle size={13} />
                  <span>{promptError}</span>
                </div>
              )}
              {promptNotice && <div className="workspace-prompt-notice">{promptNotice}</div>}
            </div>

            <div className="workspace-panel-section-head">
              <span>Live generated workflow</span>
              <button
                type="button"
                onClick={() => setWorkflowRefreshKey((key) => key + 1)}
                disabled={isLoadingWorkflow}
              >
                <RefreshCw size={11} className={isLoadingWorkflow ? 'is-spinning' : ''} /> Refresh
              </button>
            </div>

            {workflowError && (
              <div className="workspace-panel-error">
                <AlertTriangle size={13} />
                <span>{workflowError}</span>
              </div>
            )}

            {isLoadingWorkflow && !workflow && (
              <div className="workspace-panel-loading">
                <Loader2 size={18} className="is-spinning" />
                <span>Generating live workflow from agent configs…</span>
              </div>
            )}

            {workflow && (
              <>
                <div className="workspace-workflow-stamp">
                  <span>Generated {formatTime(workflow.generatedAt)}</span>
                  <span>{workflow.totalZones} zones · {workflow.totalAgents} agents</span>
                </div>

                <div className="workspace-workflow-zones">
                  {workflow.zones.map((zone) => (
                    <div key={zone.id} className="workspace-workflow-zone" style={{ '--zone-accent': zone.color } as React.CSSProperties}>
                      <div className="workspace-workflow-zone-head">
                        <span className="workspace-zone-level" style={{ color: zone.color, borderColor: `${zone.color}55`, background: `${zone.color}16` }}>
                          L{zone.level}
                        </span>
                        <div>
                          <div className="workspace-workflow-zone-title">{zone.roleTitle}</div>
                          <div className="workspace-workflow-zone-sub">{zone.name} · {zone.members.length} agent{zone.members.length === 1 ? '' : 's'}</div>
                        </div>
                        <span className="workspace-workflow-policy">{policyLabel(zone.delegationPolicy)}</span>
                      </div>
                      {zone.responsibilities && (
                        <p className="workspace-workflow-note">{zone.responsibilities}</p>
                      )}
                      <div className="workspace-workflow-member-list">
                        {zone.members.map((member) => (
                          <div key={member.id} className={`workspace-workflow-member ${member.isConfigured ? '' : 'is-unconfigured'}`}>
                            <span className={`workspace-agent-dot status-${member.status}`} style={{ background: member.isConfigured ? zone.color : '#f59e0b' }} />
                            <span className="workspace-workflow-member-name">{member.name}</span>
                            <span className="workspace-workflow-member-role">{member.role || zone.roleTitle}</span>
                            <span className={`workspace-readiness-pill ${member.isConfigured ? 'ready' : 'blocked'}`}>
                              {member.isConfigured ? 'ready' : 'blocked'}
                            </span>
                          </div>
                        ))}
                        {zone.members.length === 0 && (
                          <div className="workspace-workflow-member is-empty">No agents in this zone</div>
                        )}
                      </div>
                      {(zone.project.repoUrl || zone.project.workingDir) && (
                        <div className="workspace-zone-project-inline">
                          {zone.project.repoUrl && (
                            <button type="button" onClick={() => openExternalLink(zone.project.repoUrl!)}>
                              <GitBranch size={11} />
                              <span>{zone.project.repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//, '')}</span>
                            </button>
                          )}
                          {zone.project.workingDir && (
                            <span title={zone.project.workingDir}>
                              <FolderOpen size={11} />
                              <span>{zone.project.workingDir.split('/').filter(Boolean).slice(-2).join('/')}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="workspace-panel-section-head">
                  <span>Delegation routes ({routesWithZones.length})</span>
                </div>
                <div className="workspace-route-list">
                  {routesWithZones.map((route) => {
                    const cap = workflowCaps.get(route.agentId);
                    const allowed = routeAllowedIds(route);
                    const connected = new Set(route.connectedIds);
                    const pending = allowed.filter((id) => !connected.has(id));
                    return (
                      <div key={route.agentId} className="workspace-route-card">
                        <div className="workspace-route-head">
                          <span className="workspace-route-agent">{cap?.name || route.agentId}</span>
                          <span className="workspace-route-role">{route.zoneRole || 'Member'}</span>
                          <span className="workspace-route-policy">{policyLabel(route.policy)}</span>
                        </div>
                        <div className="workspace-route-row">
                          <span className="workspace-route-label">Up</span>
                          <span>{route.managerIds.length ? route.managerIds.map((id) => capabilityName(workflowCaps, id)).join(', ') : '—'}</span>
                        </div>
                        <div className="workspace-route-row">
                          <span className="workspace-route-label">Down</span>
                          <span>{route.reportIds.length ? route.reportIds.map((id) => capabilityName(workflowCaps, id)).join(', ') : '—'}</span>
                        </div>
                        <div className="workspace-route-row">
                          <span className="workspace-route-label">Peers</span>
                          <span>{route.peerIds.length ? route.peerIds.map((id) => capabilityName(workflowCaps, id)).join(', ') : '—'}</span>
                        </div>
                        {pending.length > 0 && (
                          <div className="workspace-route-pending">
                            <AlertTriangle size={10} />
                            <span>Needs connection: {pending.map((id) => capabilityName(workflowCaps, id)).join(', ')}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {routesWithZones.length === 0 && (
                    <div className="workspace-panel-empty compact">
                      <p>Assign agents to zones to generate delegation routes.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'agents' && (
          <>
            <div className="workspace-panel-section-head">
              <span>Agents in workspace ({agents.length})</span>
            </div>
            <div className="workspace-agent-table">
              {agents.map((agent) => {
                const zone = resolveZoneAt(agent.pos_x, agent.pos_y, zones);
                const cap = workflowCaps.get(agent.id);
                return (
                  <button
                    key={agent.id}
                    type="button"
                    className="workspace-agent-row"
                    onClick={() => onOpenAgent(agent)}
                    style={{ '--zone-accent': zone?.color || '#64748b' } as React.CSSProperties}
                  >
                    <span className={`workspace-agent-dot status-${agent.status}`} style={{ background: zone?.color || '#64748b' }} />
                    <span className="workspace-agent-row-main">
                      <span className="workspace-agent-row-name">{agent.name}</span>
                      <span className="workspace-agent-row-sub">
                        {zone ? `L${zone.level} · ${zone.roleTitle}` : 'Unassigned'} · {agent.model}
                      </span>
                    </span>
                    <span className="workspace-agent-row-stats">
                      <span>{agent.skills?.length ?? 0} skills</span>
                      <span>{agent.mcps?.length ?? 0} MCPs</span>
                      {cap && !cap.isConfigured && <AlertTriangle size={11} className="workspace-warn-icon" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {activeTab === 'assets' && (
          <>
            <div className="workspace-panel-section-head">
              <span>Combined deliverables ({totalAssets})</span>
              <button
                type="button"
                onClick={() => setAssetsRefreshKey((key) => key + 1)}
                disabled={isLoadingAssets}
              >
                <RefreshCw size={11} className={isLoadingAssets ? 'is-spinning' : ''} /> Refresh
              </button>
            </div>

            {assetsError && (
              <div className="workspace-panel-error">
                <AlertTriangle size={13} />
                <span>{assetsError}</span>
              </div>
            )}

            {isLoadingAssets && assetGroups.length === 0 && (
              <div className="workspace-panel-loading">
                <Loader2 size={18} className="is-spinning" />
                <span>Collecting deliverables from every agent in this workspace…</span>
              </div>
            )}

            {!isLoadingAssets && totalAssets === 0 && (
              <div className="workspace-panel-empty compact">
                <FolderOpen size={22} />
                <div className="workspace-panel-empty-title">No deliverables yet</div>
                <p>Agent outputs saved in artifacts, reports or deliverables folders will appear here, grouped by agent.</p>
              </div>
            )}

            <div className="workspace-asset-groups">
              {assetGroups
                .filter((group) => group.files.length > 0)
                .map((group) => {
                  const zone = resolveZoneAt(group.agent.pos_x, group.agent.pos_y, zones);
                  return (
                    <div
                      key={group.agent.id}
                      className="workspace-asset-group"
                      style={{ '--zone-accent': zone?.color || space.color } as React.CSSProperties}
                    >
                      <button
                        type="button"
                        className="workspace-asset-agent"
                        onClick={() => onOpenAgent(group.agent)}
                        title={`Open ${group.agent.name}`}
                      >
                        <span className="workspace-agent-dot" style={{ background: zone?.color || space.color }} />
                        <span className="workspace-asset-agent-name">{group.agent.name}</span>
                        <span className="workspace-asset-count">{group.files.length}</span>
                        <span className="workspace-asset-open-label">Open agent</span>
                      </button>
                      {group.files.map((file) => (
                        <div key={file.path} className="workspace-asset-row">
                          <span className="workspace-asset-icon">{assetIcon(file)}</span>
                          <span className="workspace-asset-main">
                            <span className="workspace-asset-name" title={file.path}>{file.name}</span>
                            <span className="workspace-asset-path">{file.dir || 'workspace'}</span>
                          </span>
                          <span className="workspace-asset-meta">
                            {formatBytes(file.size)}
                            {file.mtime ? ` · ${formatAssetTime(file.mtime)}` : ''}
                          </span>
                          <button
                            type="button"
                            className="workspace-asset-open-btn"
                            onClick={() =>
                              openExternalLink(
                                AgentService.getWorkspaceFileRawUrl(group.agent.id, file.path),
                              )
                            }
                            title={`Open ${file.name}`}
                          >
                            <ExternalLink size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })}
            </div>

            {assetGroups.some((group) => group.error) && (
              <div className="workspace-asset-errors">
                {assetGroups
                  .filter((group) => group.error)
                  .map((group) => (
                    <div key={group.agent.id} className="workspace-panel-error">
                      <AlertTriangle size={12} />
                      <span>{group.agent.name}: {group.error}</span>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="workspace-panel-footer">
        <ShieldCheck size={11} />
        <span>Workspace prompt is injected into every agent run in this space.</span>
      </div>

    </aside>
  );
};
