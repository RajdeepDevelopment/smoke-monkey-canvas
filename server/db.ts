import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

export interface AgentRecord {
  id: string;
  name: string;
  model: string;
  provider: string;
  system_prompt: string;
  cron_schedule: string | null;
  cron_enabled: number;
  pos_x: number;
  pos_y: number;
  status: string; // 'idle' | 'running' | 'scheduled' | 'error'
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
}

export interface AgentMcpRecord {
  id: string;
  agent_id: string;
  mcp_name: string;
  label: string;
  config_json: string;
  enabled: number;
  created_at: string;
}

export interface AgentSkillRecord {
  id: string;
  agent_id: string;
  skill_name: string;
  description: string | null;
  content: string;
  enabled: number;
  created_at: string;
}

export interface RunRecord {
  id: string;
  agent_id: string;
  trigger_type: string; // 'cron' | 'manual'
  status: string; // 'running' | 'completed' | 'failed'
  task_prompt: string | null;
  summary: string | null;
  error: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface RunEventRecord {
  id?: number;
  run_id: string;
  agent_id: string;
  event_type: string;
  payload_json: string;
  created_at: string;
}

export class CanvasDatabase {
  private db: DatabaseSync;

  constructor(dbPath?: string) {
    const resolvedPath = dbPath ?? CanvasDatabase.getDefaultPath();
    const dir = dirname(resolvedPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    this.db = new DatabaseSync(resolvedPath);
    this.initTables();
  }

  static getDefaultPath(): string {
    const home = homedir();
    return join(home, '.smoke-monkey', 'canvas.db');
  }

  private initTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        model TEXT NOT NULL DEFAULT 'meta/llama-3.3-70b-instruct',
        provider TEXT NOT NULL DEFAULT 'nvidia',
        system_prompt TEXT NOT NULL,
        cron_schedule TEXT,
        cron_enabled INTEGER NOT NULL DEFAULT 0,
        pos_x REAL NOT NULL DEFAULT 200,
        pos_y REAL NOT NULL DEFAULT 200,
        status TEXT NOT NULL DEFAULT 'idle',
        last_run_at TEXT,
        next_run_at TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS agent_mcps (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        mcp_name TEXT NOT NULL,
        label TEXT NOT NULL,
        config_json TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        FOREIGN KEY(agent_id) REFERENCES agents(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS agent_skills (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        skill_name TEXT NOT NULL,
        description TEXT,
        content TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        FOREIGN KEY(agent_id) REFERENCES agents(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        trigger_type TEXT NOT NULL DEFAULT 'manual',
        status TEXT NOT NULL DEFAULT 'running',
        task_prompt TEXT,
        summary TEXT,
        error TEXT,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        FOREIGN KEY(agent_id) REFERENCES agents(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS run_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(run_id) REFERENCES runs(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_agent_mcps ON agent_mcps(agent_id);
      CREATE INDEX IF NOT EXISTS idx_agent_skills ON agent_skills(agent_id);
      CREATE INDEX IF NOT EXISTS idx_runs_agent ON runs(agent_id);
      CREATE INDEX IF NOT EXISTS idx_run_events ON run_events(run_id);
    `);
  }

  // ── Agent Methods ──────────────────────────────────────────────────────────

  getAllAgents(): AgentRecord[] {
    const stmt = this.db.prepare(`SELECT * FROM agents ORDER BY created_at DESC`);
    return stmt.all() as unknown as AgentRecord[];
  }

  getAgent(id: string): AgentRecord | null {
    const stmt = this.db.prepare(`SELECT * FROM agents WHERE id = ?`);
    const row = stmt.get(id) as unknown as AgentRecord | undefined;
    return row ?? null;
  }

  createAgent(agent: Omit<AgentRecord, 'created_at'> & { created_at?: string }): AgentRecord {
    const createdAt = agent.created_at ?? new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO agents (
        id, name, model, provider, system_prompt, cron_schedule, cron_enabled,
        pos_x, pos_y, status, last_run_at, next_run_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      agent.id,
      agent.name,
      agent.model,
      agent.provider,
      agent.system_prompt,
      agent.cron_schedule ?? null,
      agent.cron_enabled,
      agent.pos_x,
      agent.pos_y,
      agent.status,
      agent.last_run_at ?? null,
      agent.next_run_at ?? null,
      createdAt,
    );
    return { ...agent, created_at: createdAt };
  }

  updateAgent(id: string, patch: Partial<AgentRecord>): AgentRecord | null {
    const current = this.getAgent(id);
    if (!current) return null;

    const updated: AgentRecord = { ...current, ...patch };
    const stmt = this.db.prepare(`
      UPDATE agents SET
        name = ?,
        model = ?,
        provider = ?,
        system_prompt = ?,
        cron_schedule = ?,
        cron_enabled = ?,
        pos_x = ?,
        pos_y = ?,
        status = ?,
        last_run_at = ?,
        next_run_at = ?
      WHERE id = ?
    `);
    stmt.run(
      updated.name,
      updated.model,
      updated.provider,
      updated.system_prompt,
      updated.cron_schedule,
      updated.cron_enabled,
      updated.pos_x,
      updated.pos_y,
      updated.status,
      updated.last_run_at,
      updated.next_run_at,
      id,
    );
    return updated;
  }

  deleteAgent(id: string): boolean {
    const stmt = this.db.prepare(`DELETE FROM agents WHERE id = ?`);
    stmt.run(id);
    return true;
  }

  // ── MCP Methods ────────────────────────────────────────────────────────────

  getAgentMcps(agentId: string): AgentMcpRecord[] {
    const stmt = this.db.prepare(`SELECT * FROM agent_mcps WHERE agent_id = ? ORDER BY created_at ASC`);
    return stmt.all(agentId) as unknown as AgentMcpRecord[];
  }

  addAgentMcp(mcp: Omit<AgentMcpRecord, 'created_at'> & { created_at?: string }): AgentMcpRecord {
    const createdAt = mcp.created_at ?? new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO agent_mcps (id, agent_id, mcp_name, label, config_json, enabled, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(mcp.id, mcp.agent_id, mcp.mcp_name, mcp.label, mcp.config_json, mcp.enabled, createdAt);
    return { ...mcp, created_at: createdAt };
  }

  deleteAgentMcp(id: string): boolean {
    const stmt = this.db.prepare(`DELETE FROM agent_mcps WHERE id = ?`);
    stmt.run(id);
    return true;
  }

  // ── Skill Methods ──────────────────────────────────────────────────────────

  getAgentSkills(agentId: string): AgentSkillRecord[] {
    const stmt = this.db.prepare(`SELECT * FROM agent_skills WHERE agent_id = ? ORDER BY created_at ASC`);
    return stmt.all(agentId) as unknown as AgentSkillRecord[];
  }

  addAgentSkill(skill: Omit<AgentSkillRecord, 'created_at'> & { created_at?: string }): AgentSkillRecord {
    const createdAt = skill.created_at ?? new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO agent_skills (id, agent_id, skill_name, description, content, enabled, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      skill.id,
      skill.agent_id,
      skill.skill_name,
      skill.description ?? null,
      skill.content,
      skill.enabled,
      createdAt,
    );
    return { ...skill, created_at: createdAt };
  }

  deleteAgentSkill(id: string): boolean {
    const stmt = this.db.prepare(`DELETE FROM agent_skills WHERE id = ?`);
    stmt.run(id);
    return true;
  }

  // ── Run & Event Methods ───────────────────────────────────────────────────

  createRun(run: Partial<RunRecord> & Pick<RunRecord, 'id' | 'agent_id' | 'trigger_type' | 'status'>): RunRecord {
    const startedAt = run.started_at ?? new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO runs (id, agent_id, trigger_type, status, task_prompt, summary, error, started_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      run.id,
      run.agent_id,
      run.trigger_type,
      run.status,
      run.task_prompt ?? null,
      run.summary ?? null,
      run.error ?? null,
      startedAt,
      run.completed_at ?? null,
    );
    return {
      id: run.id,
      agent_id: run.agent_id,
      trigger_type: run.trigger_type,
      status: run.status,
      task_prompt: run.task_prompt ?? null,
      summary: run.summary ?? null,
      error: run.error ?? null,
      started_at: startedAt,
      completed_at: run.completed_at ?? null,
      session_id: run.session_id ?? null,
    };
  }

  updateRun(id: string, patch: Partial<RunRecord>): RunRecord | null {
    const stmtGet = this.db.prepare(`SELECT * FROM runs WHERE id = ?`);
    const current = stmtGet.get(id) as unknown as RunRecord | undefined;
    if (!current) return null;

    const updated = { ...current, ...patch };
    const stmt = this.db.prepare(`
      UPDATE runs SET
        status = ?,
        summary = ?,
        error = ?,
        completed_at = ?
      WHERE id = ?
    `);
    stmt.run(updated.status, updated.summary, updated.error, updated.completed_at, id);
    return updated;
  }

  getAgentRuns(agentId: string, limit = 20): RunRecord[] {
    const stmt = this.db.prepare(`SELECT * FROM runs WHERE agent_id = ? ORDER BY started_at DESC LIMIT ?`);
    return stmt.all(agentId, limit) as unknown as RunRecord[];
  }

  getRun(runId: string): RunRecord | null {
    const stmt = this.db.prepare(`SELECT * FROM runs WHERE id = ?`);
    const row = stmt.get(runId) as unknown as RunRecord | undefined;
    return row ?? null;
  }

  addRunEvent(event: Omit<RunEventRecord, 'id' | 'created_at'> & { created_at?: string }): RunEventRecord {
    const createdAt = event.created_at ?? new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO run_events (run_id, agent_id, event_type, payload_json, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(event.run_id, event.agent_id, event.event_type, event.payload_json, createdAt);
    return {
      id: Number(result.lastInsertRowid),
      ...event,
      created_at: createdAt,
    };
  }

  getRunEvents(runId: string): RunEventRecord[] {
    const stmt = this.db.prepare(`SELECT * FROM run_events WHERE run_id = ? ORDER BY id ASC`);
    return stmt.all(runId) as unknown as RunEventRecord[];
  }
}
