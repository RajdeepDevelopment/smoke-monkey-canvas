import { randomUUID } from 'node:crypto';
import { CoreDatabase } from '../core/database.db.js';
import { computeReadiness } from '../mcp/mcp.readiness.js';
import type {
  SpaceNodeRecord,
  SpaceAgentEntity,
  SpaceWorkspacePrompt,
  SpaceZone,
  SpaceZoneInput,
  ZoneDelegationPolicy,
  ZoneShape,
  CanvasViewport,
} from './space.types.js';

interface SpaceZoneRow {
  id: string;
  name: string;
  role_title: string;
  description: string | null;
  responsibilities: string | null;
  workflow_instructions: string | null;
  level: number;
  parent_zone_id: string | null;
  space_id: string | null;
  color: string;
  shape: string;
  width: number;
  height: number;
  x: number;
  y: number;
  repo_url: string | null;
  working_dir: string | null;
  project_brief: string | null;
  delegation_policy: string;
  created_at: string;
  updated_at: string;
}

const ZONE_COLUMNS: Record<string, string> = {
  name: 'name',
  roleTitle: 'role_title',
  description: 'description',
  responsibilities: 'responsibilities',
  workflowInstructions: 'workflow_instructions',
  level: 'level',
  parentZoneId: 'parent_zone_id',
  spaceId: 'space_id',
  color: 'color',
  shape: 'shape',
  width: 'width',
  height: 'height',
  x: 'x',
  y: 'y',
  repoUrl: 'repo_url',
  workingDir: 'working_dir',
  projectBrief: 'project_brief',
  delegationPolicy: 'delegation_policy',
};

const DELEGATION_POLICIES = new Set<ZoneDelegationPolicy>(['auto', 'down', 'up', 'both', 'peers']);

function normalizeShape(value: unknown): ZoneShape {
  return value === 'circle' ? 'circle' : 'rectangle';
}

function normalizePolicy(value: unknown): ZoneDelegationPolicy {
  return DELEGATION_POLICIES.has(value as ZoneDelegationPolicy)
    ? (value as ZoneDelegationPolicy)
    : 'auto';
}

function rowToZone(row: SpaceZoneRow): SpaceZone {
  return {
    id: row.id,
    name: row.name,
    roleTitle: row.role_title,
    description: row.description,
    responsibilities: row.responsibilities,
    workflowInstructions: row.workflow_instructions,
    level: row.level,
    parentZoneId: row.parent_zone_id,
    spaceId: row.space_id,
    color: row.color,
    shape: normalizeShape(row.shape),
    width: row.width,
    height: row.height,
    x: row.x,
    y: row.y,
    repoUrl: row.repo_url,
    workingDir: row.working_dir,
    projectBrief: row.project_brief,
    delegationPolicy: normalizePolicy(row.delegation_policy),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface WorkspaceSpaceRow {
  id: string;
  name: string;
  description: string | null;
  role_title: string | null;
  responsibilities: string | null;
  workflow_instructions: string | null;
  level: number;
  parent_zone_id: string | null;
  color: string;
  shape: string;
  width: number;
  height: number;
  x: number;
  y: number;
  repo_url: string | null;
  working_dir: string | null;
  project_brief: string | null;
  workflow_prompt: string | null;
  delegation_policy: string;
  created_at: string;
  updated_at: string;
}

export function rowToWorkspaceSpace(row: WorkspaceSpaceRow): any {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    roleTitle: row.role_title || undefined,
    level: row.level,
    parentZoneId: row.parent_zone_id || null,
    responsibilities: row.responsibilities || undefined,
    workflowInstructions: row.workflow_instructions || undefined,
    delegationPolicy: normalizePolicy(row.delegation_policy),
    repoUrl: row.repo_url || undefined,
    workingDir: row.working_dir || undefined,
    projectBrief: row.project_brief || undefined,
    workflowPrompt: row.workflow_prompt || undefined,
    color: row.color,
    shape: normalizeShape(row.shape),
    width: row.width,
    height: row.height,
    x: row.x,
    y: row.y,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SpaceDb {
  private coreDb: CoreDatabase;

  constructor(coreDb?: CoreDatabase) {
    this.coreDb = coreDb ?? CoreDatabase.getInstance();
  }

  getAllSpaceEntities(): SpaceAgentEntity[] {
    const stmtAgents = this.coreDb.db.prepare(`SELECT * FROM agents ORDER BY created_at DESC`);
    const agents = stmtAgents.all() as unknown as SpaceNodeRecord[];

    const stmtMcps = this.coreDb.db.prepare(`SELECT * FROM agent_mcps WHERE agent_id = ? ORDER BY created_at ASC`);
    const stmtSkills = this.coreDb.db.prepare(`SELECT * FROM agent_skills WHERE agent_id = ? ORDER BY created_at ASC`);
    const stmtLatestRun = this.coreDb.db.prepare(`SELECT * FROM runs WHERE agent_id = ? ORDER BY started_at DESC LIMIT 1`);

    return agents.map((agent) => {
      const rawMcps = stmtMcps.all(agent.id) as unknown as SpaceAgentEntity['mcps'];
      let unconfiguredCount = 0;
      const mcps = rawMcps.map((m) => {
        let cfg: Record<string, unknown> = {};
        try {
          cfg = JSON.parse(m.config_json);
        } catch {}
        const env = (cfg.env as Record<string, string>) || {};
        const readiness = computeReadiness(m.mcp_name, env);
        if (!readiness.configured) unconfiguredCount++;
        return {
          ...m,
          isConfigured: readiness.configured,
          missingKeys: readiness.missingKeys,
          readinessState: readiness.state,
          probe: readiness.probe,
        };
      });

      const skills = stmtSkills.all(agent.id) as unknown as SpaceAgentEntity['skills'];
      const latestRuns = stmtLatestRun.all(agent.id) as unknown as NonNullable<SpaceAgentEntity['latestRun']>[];

      return {
        ...agent,
        mcps,
        unconfiguredMcpsCount: unconfiguredCount,
        skills,
        latestRun: latestRuns.length > 0 ? latestRuns[0] : null,
      };
    });
  }

  updateNodePosition(id: string, posX: number, posY: number, spaceId?: string | null): boolean {
    const stmt = this.coreDb.db.prepare(`UPDATE agents SET pos_x = ?, pos_y = ? WHERE id = ?`);
    stmt.run(posX, posY, id);
    if (spaceId !== undefined) {
      this.setAgentSpace(id, spaceId);
    }
    return true;
  }

  updateNodePositions(positions: Array<{ id: string; posX: number; posY: number; spaceId?: string | null }>): void {
    if (!Array.isArray(positions) || positions.length === 0) return;
    this.coreDb.db.exec('BEGIN');
    try {
      const updateAgentStmt = this.coreDb.db.prepare(`UPDATE agents SET pos_x = ?, pos_y = ? WHERE id = ?`);
      const deleteMembershipStmt = this.coreDb.db.prepare(`DELETE FROM space_agent_memberships WHERE agent_id = ?`);
      const insertMembershipStmt = this.coreDb.db.prepare(
        `INSERT INTO space_agent_memberships (space_id, agent_id, updated_at) VALUES (?, ?, ?)`
      );
      const now = new Date().toISOString();

      for (const pos of positions) {
        if (!pos.id || typeof pos.posX !== 'number' || typeof pos.posY !== 'number') continue;
        updateAgentStmt.run(pos.posX, pos.posY, pos.id);
        if (pos.spaceId !== undefined) {
          deleteMembershipStmt.run(pos.id);
          if (pos.spaceId) {
            insertMembershipStmt.run(pos.spaceId, pos.id, now);
          }
        }
      }
      this.coreDb.db.exec('COMMIT');
    } catch (err) {
      this.coreDb.db.exec('ROLLBACK');
      throw err;
    }
  }

  getAgentSpaceId(agentId: string): string | null {
    const row = this.coreDb.db
      .prepare(`SELECT space_id FROM space_agent_memberships WHERE agent_id = ? LIMIT 1`)
      .get(agentId) as { space_id: string } | undefined;
    return row?.space_id ?? null;
  }

  setAgentSpace(agentId: string, spaceId: string | null): void {
    const now = new Date().toISOString();
    this.coreDb.db.exec('BEGIN');
    try {
      this.coreDb.db.prepare(`DELETE FROM space_agent_memberships WHERE agent_id = ?`).run(agentId);
      if (spaceId) {
        this.coreDb.db
          .prepare(
            `INSERT INTO space_agent_memberships (space_id, agent_id, updated_at) VALUES (?, ?, ?)`,
          )
          .run(spaceId, agentId, now);
      }
      this.coreDb.db.exec('COMMIT');
    } catch (err) {
      this.coreDb.db.exec('ROLLBACK');
      throw err;
    }
  }

  setSpaceAgents(spaceId: string, agentIds: string[]): void {
    const now = new Date().toISOString();
    const uniqueIds = [...new Set(agentIds.filter((id) => typeof id === 'string' && id.trim()))];
    this.coreDb.db.exec('BEGIN');
    try {
      this.coreDb.db.prepare(`DELETE FROM space_agent_memberships WHERE space_id = ?`).run(spaceId);
      const insert = this.coreDb.db.prepare(
        `INSERT INTO space_agent_memberships (space_id, agent_id, updated_at) VALUES (?, ?, ?)`,
      );
      const deleteAgent = this.coreDb.db.prepare(
        `DELETE FROM space_agent_memberships WHERE agent_id = ?`,
      );
      for (const agentId of uniqueIds) {
        deleteAgent.run(agentId);
        insert.run(spaceId, agentId, now);
      }
      this.coreDb.db.exec('COMMIT');
    } catch (err) {
      this.coreDb.db.exec('ROLLBACK');
      throw err;
    }
  }

  getZones(): SpaceZone[] {
    this.repairOrphanParentZones();
    const rows = this.coreDb.db
      .prepare(`SELECT * FROM space_zones ORDER BY level ASC, created_at ASC`)
      .all() as unknown as SpaceZoneRow[];
    return rows.map(rowToZone);
  }

  /**
   * Auto-heals orphan parent_zone_id values in the database.
   * If a zone points to a parent_zone_id that does not exist as an id in space_zones,
   * this resolves the intended parent zone in the same space and updates parent_zone_id.
   */
  repairOrphanParentZones(): void {
    try {
      const orphans = this.coreDb.db
        .prepare(`
          SELECT z.id, z.name, z.role_title, z.level, z.parent_zone_id, z.space_id, z.created_at
          FROM space_zones z
          WHERE z.parent_zone_id IS NOT NULL
            AND z.parent_zone_id NOT IN (SELECT id FROM space_zones)
        `)
        .all() as unknown as SpaceZoneRow[];

      if (orphans.length === 0) return;

      const allRows = this.coreDb.db
        .prepare(`SELECT id, name, role_title, level, space_id, created_at FROM space_zones`)
        .all() as unknown as SpaceZoneRow[];

      const updateStmt = this.coreDb.db.prepare(
        `UPDATE space_zones SET parent_zone_id = ? WHERE id = ?`,
      );

      for (const orphan of orphans) {
        if (!orphan.parent_zone_id) continue;
        const orphanRef = orphan.parent_zone_id.toLowerCase();
        
        // Find matching candidates in the same space with lower level (senior)
        const candidates = allRows.filter((c) =>
          c.id !== orphan.id &&
          c.space_id === orphan.space_id &&
          c.level < orphan.level
        );

        let match: SpaceZoneRow | null = null;
        for (const candidate of candidates) {
          const roleTokens = candidate.role_title.toLowerCase().split(/\s+/);
          const nameTokens = candidate.name.toLowerCase().split(/\s+/);
          const hasToken = [...roleTokens, ...nameTokens].some(
            (t) => t.length >= 4 && orphanRef.includes(t)
          );
          if (hasToken) {
            match = candidate;
            break;
          }
        }

        if (match) {
          updateStmt.run(match.id, orphan.id);
        }
      }
    } catch {
      // Best-effort self-healing
    }
  }

  getZone(id: string): SpaceZone | null {
    const row = this.coreDb.db
      .prepare(`SELECT * FROM space_zones WHERE id = ?`)
      .get(id) as unknown as SpaceZoneRow | undefined;
    return row ? rowToZone(row) : null;
  }

  createZone(input: SpaceZoneInput): SpaceZone {
    const id = input.id?.trim() || randomUUID();
    const now = new Date().toISOString();
    const stmt = this.coreDb.db.prepare(`
      INSERT OR REPLACE INTO space_zones (
        id, name, role_title, description, responsibilities, workflow_instructions,
        level, parent_zone_id, space_id, color, shape, width, height, x, y,
        repo_url, working_dir, project_brief, delegation_policy, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      input.name,
      input.roleTitle ?? input.name,
      input.description ?? null,
      input.responsibilities ?? null,
      input.workflowInstructions ?? null,
      Number.isFinite(input.level) ? Number(input.level) : 0,
      input.parentZoneId ?? null,
      input.spaceId ?? null,
      input.color ?? '#3b82f6',
      normalizeShape(input.shape),
      Number.isFinite(input.width) ? Number(input.width) : 420,
      Number.isFinite(input.height) ? Number(input.height) : 320,
      Number.isFinite(input.x) ? Number(input.x) : 0,
      Number.isFinite(input.y) ? Number(input.y) : 0,
      input.repoUrl ?? null,
      input.workingDir ?? null,
      input.projectBrief ?? null,
      normalizePolicy(input.delegationPolicy),
      now,
      now,
    );
    return this.getZone(id)!;
  }

  createZonesBatch(inputs: SpaceZoneInput[]): SpaceZone[] {
    const now = new Date().toISOString();
    const results: SpaceZone[] = [];
    this.coreDb.db.exec('BEGIN');
    try {
      const stmt = this.coreDb.db.prepare(`
        INSERT OR REPLACE INTO space_zones (
          id, name, role_title, description, responsibilities, workflow_instructions,
          level, parent_zone_id, space_id, color, shape, width, height, x, y,
          repo_url, working_dir, project_brief, delegation_policy, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const input of inputs) {
        const id = input.id?.trim() || randomUUID();
        stmt.run(
          id,
          input.name,
          input.roleTitle ?? input.name,
          input.description ?? null,
          input.responsibilities ?? null,
          input.workflowInstructions ?? null,
          Number.isFinite(input.level) ? Number(input.level) : 0,
          input.parentZoneId ?? null,
          input.spaceId ?? null,
          input.color ?? '#3b82f6',
          normalizeShape(input.shape),
          Number.isFinite(input.width) ? Number(input.width) : 420,
          Number.isFinite(input.height) ? Number(input.height) : 320,
          Number.isFinite(input.x) ? Number(input.x) : 0,
          Number.isFinite(input.y) ? Number(input.y) : 0,
          input.repoUrl ?? null,
          input.workingDir ?? null,
          input.projectBrief ?? null,
          normalizePolicy(input.delegationPolicy),
          now,
          now,
        );
      }
      this.coreDb.db.exec('COMMIT');
      for (const input of inputs) {
        if (input.id?.trim()) {
          const z = this.getZone(input.id.trim());
          if (z) results.push(z);
        }
      }
      return results;
    } catch (err) {
      this.coreDb.db.exec('ROLLBACK');
      throw err;
    }
  }

  updateZone(id: string, patch: Partial<SpaceZoneInput>): SpaceZone | null {
    if (!this.getZone(id)) return null;

    const sets: string[] = [];
    const values: Array<string | number | null> = [];
    for (const [key, column] of Object.entries(ZONE_COLUMNS)) {
      if (!(key in patch)) continue;
      const raw = (patch as Record<string, unknown>)[key];
      let value: string | number | null;
      if (key === 'shape') value = normalizeShape(raw);
      else if (key === 'delegationPolicy') value = normalizePolicy(raw);
      else if (key === 'level' || key === 'width' || key === 'height' || key === 'x' || key === 'y') {
        value = Number.isFinite(Number(raw)) ? Number(raw) : 0;
      } else if (key === 'roleTitle') {
        value = typeof raw === 'string' && raw.trim() ? raw.trim() : (patch.name ?? 'Team Member');
      } else if (raw === undefined) {
        continue;
      } else {
        value = (raw as string | null) ?? null;
      }
      sets.push(`${column} = ?`);
      values.push(value);
    }

    if (sets.length === 0) return this.getZone(id);
    sets.push(`updated_at = ?`);
    values.push(new Date().toISOString());
    values.push(id);

    this.coreDb.db.prepare(`UPDATE space_zones SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return this.getZone(id);
  }

  deleteZone(id: string): boolean {
    const children = this.coreDb.db
      .prepare(`SELECT id FROM space_zones WHERE parent_zone_id = ?`)
      .all(id) as unknown as Array<{ id: string }>;
    const deleteStmt = this.coreDb.db.prepare(`DELETE FROM space_zones WHERE id = ?`);
    const clearParentStmt = this.coreDb.db.prepare(`UPDATE space_zones SET parent_zone_id = NULL WHERE id = ?`);
    for (const child of children) {
      clearParentStmt.run(child.id);
    }
    const result = deleteStmt.run(id);
    return Number(result.changes) > 0;
  }

  getWorkspacePrompt(spaceId: string): SpaceWorkspacePrompt {
    const row = this.coreDb.db
      .prepare(`SELECT space_id, name, prompt, updated_at FROM space_workspace_prompts WHERE space_id = ?`)
      .get(spaceId) as
      | { space_id: string; name: string | null; prompt: string; updated_at: string }
      | undefined;
    return {
      spaceId,
      name: row?.name ?? null,
      prompt: row?.prompt ?? '',
      updatedAt: row?.updated_at ?? null,
    };
  }

  saveWorkspacePrompt(spaceId: string, name: string | null, prompt: string): SpaceWorkspacePrompt {
    const now = new Date().toISOString();
    const cleanPrompt = prompt.slice(0, 12000);
    this.coreDb.db
      .prepare(
        `INSERT INTO space_workspace_prompts (space_id, name, prompt, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(space_id) DO UPDATE SET
           name = excluded.name,
           prompt = excluded.prompt,
           updated_at = excluded.updated_at`,
      )
      .run(spaceId, name, cleanPrompt, now);
    return this.getWorkspacePrompt(spaceId);
  }

  getWorkspaceSpaces(): any[] {
    const rows = this.coreDb.db
      .prepare(`SELECT * FROM workspace_spaces ORDER BY created_at ASC`)
      .all() as unknown as WorkspaceSpaceRow[];
    return rows.map(rowToWorkspaceSpace);
  }

  getWorkspaceSpace(id: string): any | null {
    const row = this.coreDb.db
      .prepare(`SELECT * FROM workspace_spaces WHERE id = ?`)
      .get(id) as unknown as WorkspaceSpaceRow | undefined;
    return row ? rowToWorkspaceSpace(row) : null;
  }

  createWorkspaceSpace(input: any): any {
    const id = input.id?.trim() || randomUUID();
    const now = new Date().toISOString();
    const stmt = this.coreDb.db.prepare(`
      INSERT OR REPLACE INTO workspace_spaces (
        id, name, description, role_title, responsibilities, workflow_instructions,
        level, parent_zone_id, color, shape, width, height, x, y,
        repo_url, working_dir, project_brief, workflow_prompt, delegation_policy, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      input.name || 'Team Workspace',
      input.description ?? null,
      input.roleTitle ?? null,
      input.responsibilities ?? null,
      input.workflowInstructions ?? null,
      Number.isFinite(input.level) ? Number(input.level) : 0,
      input.parentZoneId ?? null,
      input.color ?? '#3b82f6',
      normalizeShape(input.shape),
      Number.isFinite(input.width) ? Number(input.width) : 720,
      Number.isFinite(input.height) ? Number(input.height) : 520,
      Number.isFinite(input.x) ? Number(input.x) : 0,
      Number.isFinite(input.y) ? Number(input.y) : 0,
      input.repoUrl ?? null,
      input.workingDir ?? null,
      input.projectBrief ?? null,
      input.workflowPrompt ?? null,
      normalizePolicy(input.delegationPolicy),
      input.createdAt || now,
      now,
    );
    return this.getWorkspaceSpace(id)!;
  }

  createWorkspaceSpacesBatch(inputs: any[]): any[] {
    const now = new Date().toISOString();
    const results: any[] = [];
    this.coreDb.db.exec('BEGIN');
    try {
      const stmt = this.coreDb.db.prepare(`
        INSERT OR REPLACE INTO workspace_spaces (
          id, name, description, role_title, responsibilities, workflow_instructions,
          level, parent_zone_id, color, shape, width, height, x, y,
          repo_url, working_dir, project_brief, workflow_prompt, delegation_policy, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const input of inputs) {
        const id = input.id?.trim() || randomUUID();
        stmt.run(
          id,
          input.name || 'Team Workspace',
          input.description ?? null,
          input.roleTitle ?? null,
          input.responsibilities ?? null,
          input.workflowInstructions ?? null,
          Number.isFinite(input.level) ? Number(input.level) : 0,
          input.parentZoneId ?? null,
          input.color ?? '#3b82f6',
          normalizeShape(input.shape),
          Number.isFinite(input.width) ? Number(input.width) : 720,
          Number.isFinite(input.height) ? Number(input.height) : 520,
          Number.isFinite(input.x) ? Number(input.x) : 0,
          Number.isFinite(input.y) ? Number(input.y) : 0,
          input.repoUrl ?? null,
          input.workingDir ?? null,
          input.projectBrief ?? null,
          input.workflowPrompt ?? null,
          normalizePolicy(input.delegationPolicy),
          input.createdAt || now,
          now,
        );
        results.push(this.getWorkspaceSpace(id)!);
      }
      this.coreDb.db.exec('COMMIT');
    } catch (err) {
      this.coreDb.db.exec('ROLLBACK');
      throw err;
    }
    return results;
  }

  updateWorkspaceSpace(id: string, updates: Record<string, unknown>): any | null {
    const existing = this.getWorkspaceSpace(id);
    if (!existing) return null;
    const now = new Date().toISOString();
    const sets: string[] = ['updated_at = ?'];
    const values: any[] = [now];

    const fields: Record<string, string> = {
      name: 'name',
      description: 'description',
      roleTitle: 'role_title',
      responsibilities: 'responsibilities',
      workflowInstructions: 'workflow_instructions',
      level: 'level',
      parentZoneId: 'parent_zone_id',
      color: 'color',
      shape: 'shape',
      width: 'width',
      height: 'height',
      x: 'x',
      y: 'y',
      repoUrl: 'repo_url',
      workingDir: 'working_dir',
      projectBrief: 'project_brief',
      workflowPrompt: 'workflow_prompt',
      delegationPolicy: 'delegation_policy',
    };

    for (const [key, col] of Object.entries(fields)) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        sets.push(`${col} = ?`);
        let val = updates[key];
        if (key === 'shape') val = normalizeShape(val);
        else if (key === 'delegationPolicy') val = normalizePolicy(val);
        values.push(val ?? null);
      }
    }

    values.push(id);
    this.coreDb.db.prepare(`UPDATE workspace_spaces SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return this.getWorkspaceSpace(id);
  }

  deleteWorkspaceSpace(id: string): boolean {
    const result = this.coreDb.db.prepare(`DELETE FROM workspace_spaces WHERE id = ?`).run(id);
    return Number(result.changes) > 0;
  }

  getCanvasViewport(): CanvasViewport | null {
    const raw = this.coreDb.getSetting('canvas_viewport');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<CanvasViewport> | null;
      if (
        !parsed ||
        typeof parsed.x !== 'number' ||
        typeof parsed.y !== 'number' ||
        typeof parsed.zoom !== 'number'
      ) {
        return null;
      }
      return {
        x: parsed.x,
        y: parsed.y,
        zoom: parsed.zoom,
        ...(typeof parsed.updatedAt === 'number' ? { updatedAt: parsed.updatedAt } : {}),
      };
    } catch {
      return null;
    }
  }

  setCanvasViewport(viewport: CanvasViewport): void {
    this.coreDb.setSetting('canvas_viewport', JSON.stringify(viewport));
  }
}
