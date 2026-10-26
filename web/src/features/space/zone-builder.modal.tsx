import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Briefcase, Code2, Database, Network, Palette, Plus, Server, ShieldCheck, TestTube2, Users, X } from 'lucide-react';
import type { GroupWorkspaceZone, ZoneDelegationPolicy } from './space.types.js';

export interface ZoneDraft {
  id?: string;
  name: string;
  roleTitle: string;
  level: number;
  parentZoneId: string | null;
  description: string;
  responsibilities: string;
  workflowInstructions: string;
  delegationPolicy: ZoneDelegationPolicy;
  repoUrl: string;
  workingDir: string;
  projectBrief: string;
  width: number;
  height: number;
  color: string;
  shape: 'rectangle' | 'circle';
}

interface RolePreset {
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  roleTitle: string;
  level: number;
  color: string;
  name: string;
  width: number;
  height: number;
  responsibilities: string;
  workflowInstructions: string;
}

export const ROLE_PRESETS: RolePreset[] = [
  {
    key: 'cto',
    label: 'CTO / VP Engineering',
    icon: Network,
    roleTitle: 'CTO',
    level: 0,
    color: '#a855f7',
    name: 'Executive Command',
    width: 760,
    height: 420,
    responsibilities: 'Own engineering strategy, architecture, delivery quality and final technical decisions. Set priorities for every manager below you.',
    workflowInstructions: 'Break company goals into manager-level missions. Delegate strategy execution downward, review rollups, and escalate only product/business tradeoffs to the user.',
  },
  {
    key: 'manager',
    label: 'Engineering Manager',
    icon: Briefcase,
    roleTitle: 'Engineering Manager',
    level: 1,
    color: '#3b82f6',
    name: 'Engineering Management',
    width: 820,
    height: 540,
    responsibilities: 'Translate executive goals into delivery plans. Own one engineering domain, staffing, sequencing and cross-team coordination.',
    workflowInstructions: 'Receive missions from the CTO. Decompose into team-level work, assign Tech Leads, unblock teams, and roll up evidence-based status upward.',
  },
  {
    key: 'product',
    label: 'Product Manager',
    icon: Users,
    roleTitle: 'Product Manager',
    level: 1,
    color: '#f59e0b',
    name: 'Product Direction',
    width: 760,
    height: 500,
    responsibilities: 'Own user outcomes, requirements, acceptance criteria and prioritization for the product area.',
    workflowInstructions: 'Work with engineering managers on scope. Write crisp requirements, answer product questions, and validate delivered work against acceptance criteria.',
  },
  {
    key: 'lead',
    label: 'Tech Lead',
    icon: Code2,
    roleTitle: 'Tech Lead',
    level: 2,
    color: '#06b6d4',
    name: 'Technical Delivery Lead',
    width: 760,
    height: 500,
    responsibilities: 'Own technical design and execution for a squad. Break work down, pair with engineers, and keep quality high.',
    workflowInstructions: 'Receive team missions from the manager. Write the technical plan, delegate implementation and testing to engineers, review their output, and report back.',
  },
  {
    key: 'engineer',
    label: 'Software Engineer',
    icon: Code2,
    roleTitle: 'Software Engineer',
    level: 3,
    color: '#10b981',
    name: 'Implementation Squad',
    width: 720,
    height: 480,
    responsibilities: 'Implement assigned features and fixes with production-quality code, tests and evidence.',
    workflowInstructions: 'Take scoped tasks from the Tech Lead. Implement, self-test, document changes, and return a concise result with file and command evidence.',
  },
  {
    key: 'qa',
    label: 'QA / Test Engineer',
    icon: TestTube2,
    roleTitle: 'QA Engineer',
    level: 3,
    color: '#ec4899',
    name: 'Quality Guild',
    width: 700,
    height: 440,
    responsibilities: 'Own test strategy, regression coverage, acceptance verification and release quality evidence.',
    workflowInstructions: 'Review changes delivered by engineers. Run automated and exploratory tests, file precise defects, and approve or block release with evidence.',
  },
  {
    key: 'devops',
    label: 'DevOps / SRE',
    icon: Server,
    roleTitle: 'DevOps Engineer',
    level: 3,
    color: '#f97316',
    name: 'Platform & Reliability',
    width: 700,
    height: 440,
    responsibilities: 'Own CI/CD, infrastructure, observability, deployment safety and runtime reliability.',
    workflowInstructions: 'Support engineering delivery with pipelines and environments. Validate deployability, monitor releases, and report incidents with runbooks.',
  },
  {
    key: 'security',
    label: 'Security Engineer',
    icon: ShieldCheck,
    roleTitle: 'Security Engineer',
    level: 3,
    color: '#ef4444',
    name: 'Security Review',
    width: 700,
    height: 440,
    responsibilities: 'Own threat modeling, security review, dependency and secret hygiene, and release sign-off for security-sensitive changes.',
    workflowInstructions: 'Review work from engineering and DevOps. Report findings by severity with remediation steps, and block releases with unresolved critical findings.',
  },
  {
    key: 'design',
    label: 'Product Designer',
    icon: Palette,
    roleTitle: 'Product Designer',
    level: 3,
    color: '#8b5cf6',
    name: 'Design Studio',
    width: 700,
    height: 440,
    responsibilities: 'Own interaction design, visual quality, accessibility and design acceptance for the product area.',
    workflowInstructions: 'Translate product requirements into designs and acceptance criteria. Review implemented UI against the design and accessibility bar.',
  },
  {
    key: 'data',
    label: 'Data / ML Engineer',
    icon: Database,
    roleTitle: 'Data Engineer',
    level: 3,
    color: '#14b8a6',
    name: 'Data & Intelligence',
    width: 700,
    height: 440,
    responsibilities: 'Own data pipelines, analytics models and evaluation datasets that support product and engineering decisions.',
    workflowInstructions: 'Provide data and model capabilities to the wider team. Validate data quality and explain findings with reproducible queries or notebooks.',
  },
  {
    key: 'custom',
    label: 'Custom Role',
    icon: Plus,
    roleTitle: 'Team Member',
    level: 3,
    color: '#64748b',
    name: 'New Team Zone',
    width: 720,
    height: 480,
    responsibilities: '',
    workflowInstructions: '',
  },
];

const DELEGATION_OPTIONS: Array<{ value: ZoneDelegationPolicy; label: string; hint: string }> = [
  { value: 'auto', label: 'Auto (recommended)', hint: 'Delegate to reports and peers, escalate to the manager.' },
  { value: 'down', label: 'Downward + peers', hint: 'Only delegate to reports and same-level peers.' },
  { value: 'up', label: 'Upward only', hint: 'Only escalate to the manager; do the work yourself otherwise.' },
  { value: 'both', label: 'Both directions', hint: 'Reports, peers and manager are all valid targets.' },
  { value: 'peers', label: 'Peers only', hint: 'Coordinate sideways only; no downward delegation.' },
];

const ZONE_COLORS = ['#3b82f6', '#a855f7', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#ef4444', '#64748b'];

export type ZoneBuilderInitial = Omit<
  Partial<ZoneDraft>,
  'description' | 'responsibilities' | 'workflowInstructions' | 'repoUrl' | 'workingDir' | 'projectBrief'
> & {
  description?: string | null;
  responsibilities?: string | null;
  workflowInstructions?: string | null;
  repoUrl?: string | null;
  workingDir?: string | null;
  projectBrief?: string | null;
};

function toDraft(initial?: ZoneBuilderInitial | null): ZoneDraft {
  return {
    id: initial?.id,
    name: initial?.name || 'Engineering Team',
    roleTitle: initial?.roleTitle || 'Tech Lead',
    level: typeof initial?.level === 'number' ? initial.level : 2,
    parentZoneId: initial?.parentZoneId ?? null,
    description: initial?.description || '',
    responsibilities: initial?.responsibilities || '',
    workflowInstructions: initial?.workflowInstructions || '',
    delegationPolicy: initial?.delegationPolicy || 'auto',
    repoUrl: initial?.repoUrl || '',
    workingDir: initial?.workingDir || '',
    projectBrief: initial?.projectBrief || '',
    width: typeof initial?.width === 'number' ? initial.width : 760,
    height: typeof initial?.height === 'number' ? initial.height : 500,
    color: initial?.color || '#3b82f6',
    shape: initial?.shape === 'circle' ? 'circle' : 'rectangle',
  };
}

interface ZoneBuilderModalProps {
  isOpen: boolean;
  initial?: ZoneBuilderInitial | null;
  zones?: GroupWorkspaceZone[];
  title?: string;
  saveLabel?: string;
  onSave: (draft: ZoneDraft) => void;
  onClose: () => void;
}

export const ZoneBuilderModal: React.FC<ZoneBuilderModalProps> = ({
  isOpen,
  initial,
  zones = [],
  title,
  saveLabel,
  onSave,
  onClose,
}) => {
  const [draft, setDraft] = useState<ZoneDraft>(() => toDraft(initial));

  useEffect(() => {
    if (isOpen) setDraft(toDraft(initial));
  }, [isOpen, initial]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const parentOptions = useMemo(() => {
    if (!draft.id) return zones;
    const descendants = new Set<string>();
    let changed = true;
    while (changed) {
      changed = false;
      for (const zone of zones) {
        if (zone.parentZoneId && (zone.parentZoneId === draft.id || descendants.has(zone.parentZoneId))) {
          if (!descendants.has(zone.id)) {
            descendants.add(zone.id);
            changed = true;
          }
        }
      }
    }
    return zones.filter((zone) => zone.id !== draft.id && !descendants.has(zone.id));
  }, [draft.id, zones]);

  if (!isOpen) return null;

  const update = <K extends keyof ZoneDraft>(key: K, value: ZoneDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const applyRolePreset = (preset: RolePreset) => {
    setDraft((current) => ({
      ...current,
      name: preset.name,
      roleTitle: preset.roleTitle,
      level: current.parentZoneId
        ? Math.max(preset.level, (zones.find((z) => z.id === current.parentZoneId)?.level ?? -1) + 1)
        : preset.level,
      color: preset.color,
      width: preset.width,
      height: preset.height,
      responsibilities: preset.responsibilities,
      workflowInstructions: preset.workflowInstructions,
    }));
  };

  const handleParentChange = (value: string) => {
    const parentZoneId = value || null;
    const parent = zones.find((zone) => zone.id === parentZoneId);
    setDraft((current) => ({
      ...current,
      parentZoneId,
      level: parent ? Math.max(current.level, (parent.level ?? 0) + 1) : current.level,
    }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.roleTitle.trim()) return;
    onSave({
      ...draft,
      name: draft.name.trim(),
      roleTitle: draft.roleTitle.trim(),
      description: draft.description.trim(),
      responsibilities: draft.responsibilities.trim(),
      workflowInstructions: draft.workflowInstructions.trim(),
      repoUrl: draft.repoUrl.trim(),
      workingDir: draft.workingDir.trim(),
      projectBrief: draft.projectBrief.trim(),
      width: Math.max(260, Math.round(draft.width)),
      height: Math.max(200, Math.round(draft.height)),
      level: Math.max(0, Math.round(draft.level)),
    });
  };

  const selectedParent = zones.find((zone) => zone.id === draft.parentZoneId) || null;

  return createPortal(
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-content zone-builder-modal"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        style={{ maxWidth: 760, maxHeight: '92vh', width: 'min(760px, 94vw)' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/smoke-monkey-mascot.png" alt="Mascot" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'contain' }} />
            <div>
              <div className="modal-title">{title || (draft.id ? 'Edit Role Zone' : 'Create Role Zone')}</div>
              <div className="zone-builder-subtitle">Role, reporting line, project context and delegation rules.</div>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="modal-body" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <div className="zone-builder-role-grid">
              {ROLE_PRESETS.map((preset) => {
                const Icon = preset.icon;
                const active = draft.roleTitle === preset.roleTitle && draft.name === preset.name;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    className={`zone-builder-role-chip ${active ? 'is-active' : ''}`}
                    style={{ '--role-accent': preset.color } as React.CSSProperties}
                    onClick={() => applyRolePreset(preset)}
                  >
                    <Icon size={14} color={preset.color} />
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="zone-builder-grid">
              <div className="form-group">
                <label className="form-label">Zone / Team Name</label>
                <input
                  className="form-input"
                  value={draft.name}
                  onChange={(event) => update('name', event.target.value)}
                  placeholder="e.g. Payments Platform Team"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Role Title</label>
                <input
                  className="form-input"
                  value={draft.roleTitle}
                  onChange={(event) => update('roleTitle', event.target.value)}
                  placeholder="e.g. Tech Lead"
                  required
                />
              </div>
            </div>

            <div className="zone-builder-grid">
              <div className="form-group">
                <label className="form-label">Hierarchy Level</label>
                <input
                  className="form-input"
                  type="number"
                  min={0}
                  max={12}
                  value={draft.level}
                  onChange={(event) => update('level', Number(event.target.value))}
                />
                <span className="zone-builder-hint">0 is the top executive layer. Direct reports sit at a higher number.</span>
              </div>
              <div className="form-group">
                <label className="form-label">Reports Into (parent zone)</label>
                <select
                  className="form-input"
                  value={draft.parentZoneId || ''}
                  onChange={(event) => handleParentChange(event.target.value)}
                >
                  <option value="">No parent — top-level zone</option>
                  {parentOptions.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      L{zone.level} · {zone.roleTitle} — {zone.name}
                    </option>
                  ))}
                </select>
                <span className="zone-builder-hint">
                  {selectedParent
                    ? `Agents in this zone escalate to ${selectedParent.roleTitle} in "${selectedParent.name}".`
                    : 'A root zone owns top-level goals and reports only to the user.'}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Zone Description</label>
              <input
                className="form-input"
                value={draft.description}
                onChange={(event) => update('description', event.target.value)}
                placeholder="Short description shown on the canvas."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Responsibilities &amp; Goals</label>
              <textarea
                className="form-input zone-builder-textarea"
                rows={3}
                value={draft.responsibilities}
                onChange={(event) => update('responsibilities', event.target.value)}
                placeholder="What this role owns, and the outcomes it is accountable for."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Workflow &amp; Delegation Instructions</label>
              <textarea
                className="form-input zone-builder-textarea"
                rows={3}
                value={draft.workflowInstructions}
                onChange={(event) => update('workflowInstructions', event.target.value)}
                placeholder="How this role should receive work, break it down, delegate, review and report."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Delegation Policy</label>
              <select
                className="form-input"
                value={draft.delegationPolicy}
                onChange={(event) => update('delegationPolicy', event.target.value as ZoneDelegationPolicy)}
              >
                {DELEGATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="zone-builder-hint">
                {DELEGATION_OPTIONS.find((option) => option.value === draft.delegationPolicy)?.hint}
              </span>
            </div>

            <div className="zone-builder-section-label">Project Context</div>
            <div className="zone-builder-grid">
              <div className="form-group">
                <label className="form-label">GitHub / Repository URL</label>
                <input
                  className="form-input"
                  value={draft.repoUrl}
                  onChange={(event) => update('repoUrl', event.target.value)}
                  placeholder="https://github.com/org/repo"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Project Folder</label>
                <input
                  className="form-input"
                  value={draft.workingDir}
                  onChange={(event) => update('workingDir', event.target.value)}
                  placeholder="/Users/you/projects/app"
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Project Brief</label>
              <textarea
                className="form-input zone-builder-textarea"
                rows={3}
                value={draft.projectBrief}
                onChange={(event) => update('projectBrief', event.target.value)}
                placeholder="Stack, constraints, current milestone and anything every agent in this zone must know."
              />
            </div>

            <div className="zone-builder-section-label">Canvas Appearance</div>
            <div className="zone-builder-grid">
              <div className="form-group">
                <label className="form-label">Accent Color</label>
                <div className="zone-builder-color-row">
                  {ZONE_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`zone-builder-color ${draft.color === color ? 'is-active' : ''}`}
                      style={{ background: color }}
                      onClick={() => update('color', color)}
                      aria-label={`Use ${color}`}
                    />
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Zone Size</label>
                <div className="zone-builder-size-row">
                  <input
                    className="form-input"
                    type="number"
                    min={260}
                    value={draft.width}
                    onChange={(event) => update('width', Number(event.target.value))}
                    aria-label="Zone width"
                  />
                  <span>×</span>
                  <input
                    className="form-input"
                    type="number"
                    min={200}
                    value={draft.height}
                    onChange={(event) => update('height', Number(event.target.value))}
                    aria-label="Zone height"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ flexShrink: 0 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" style={{ '--builder-accent': draft.color } as React.CSSProperties}>
              {saveLabel || (draft.id ? 'Save Role Zone' : 'Create Role Zone')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};
