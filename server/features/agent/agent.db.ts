import { randomUUID } from 'node:crypto';
import { CoreDatabase } from '../core/database.db.js';
import type {
  AgentRecord,
  AgentConnectionRecord,
  AgentMcpRecord,
  AgentSkillRecord,
  RunRecord,
  RunEventRecord,
  ChatSessionRecord,
  ChatMessageRecord,
  AgentCronJobRecord,
  AgentCronJobInput,
  CronJobSource,
  AgentTodoRecord,
  AgentTodoItem,
  AgentTodoDaySummary,
} from './agent.types.js';

export class AgentDb {
  private coreDb: CoreDatabase;

  constructor(coreDb?: CoreDatabase) {
    this.coreDb = coreDb ?? CoreDatabase.getInstance();
  }

  getAllAgents(): AgentRecord[] {
    const stmt = this.coreDb.db.prepare(`SELECT * FROM agents ORDER BY created_at DESC`);
    return stmt.all() as unknown as AgentRecord[];
  }

  listAgents(): AgentRecord[] {
    return this.getAllAgents();
  }

  getAgent(id: string): AgentRecord | null {
    const stmt = this.coreDb.db.prepare(`SELECT * FROM agents WHERE id = ?`);
    const row = stmt.get(id) as unknown as AgentRecord | undefined;
    return row ?? null;
  }

  createAgent(agent: Omit<AgentRecord, 'created_at'> & { created_at?: string }): AgentRecord {
    const createdAt = agent.created_at ?? new Date().toISOString();
    const stmt = this.coreDb.db.prepare(`
      INSERT INTO agents (
        id, name, model, provider, system_prompt, cron_schedule, cron_enabled,
        pos_x, pos_y, status, last_run_at, next_run_at, disabled_tools, policies,
        personalities, output_styles, working_dir, max_memory_mb, role, description, specialty, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      agent.id,
      agent.name,
      agent.model,
      agent.provider,
      agent.system_prompt,
      agent.cron_schedule ?? null,
      agent.cron_enabled ? 1 : 0,
      agent.pos_x ?? 0,
      agent.pos_y ?? 0,
      agent.status ?? 'idle',
      agent.last_run_at ?? null,
      agent.next_run_at ?? null,
      agent.disabled_tools ?? '[]',
      agent.policies ?? '[]',
      agent.personalities ?? '[]',
      agent.output_styles ?? '[]',
      agent.working_dir ?? null,
      agent.max_memory_mb ?? 1024,
      agent.role ?? null,
      agent.description ?? null,
      agent.specialty ?? null,
      createdAt,
    );
    return {
      ...agent,
      disabled_tools: agent.disabled_tools ?? '[]',
      policies: agent.policies ?? '[]',
      personalities: agent.personalities ?? '[]',
      output_styles: agent.output_styles ?? '[]',
      working_dir: agent.working_dir ?? null,
      max_memory_mb: agent.max_memory_mb ?? 1024,
      role: agent.role ?? null,
      description: agent.description ?? null,
      specialty: agent.specialty ?? null,
      created_at: createdAt,
    };
  }

  updateAgent(id: string, patch: Partial<AgentRecord>): AgentRecord | null {
    const current = this.getAgent(id);
    if (!current) return null;

    const updated: AgentRecord = { ...current, ...patch };
    const stmt = this.coreDb.db.prepare(`
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
        next_run_at = ?,
        disabled_tools = ?,
        policies = ?,
        personalities = ?,
        output_styles = ?,
        working_dir = ?,
        max_memory_mb = ?,
        role = ?,
        description = ?,
        specialty = ?
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
      updated.disabled_tools ?? '[]',
      updated.policies ?? '[]',
      updated.personalities ?? '[]',
      updated.output_styles ?? '[]',
      updated.working_dir ?? null,
      updated.max_memory_mb ?? 1024,
      updated.role ?? null,
      updated.description ?? null,
      updated.specialty ?? null,
      id,
    );
    return updated;
  }

  deleteAgent(id: string): boolean {
    this.coreDb.db.exec('BEGIN');
    try {
      this.coreDb.db.prepare(`DELETE FROM agent_connections WHERE source_agent_id = ? OR target_agent_id = ?`).run(id, id);
      this.coreDb.db.prepare(`DELETE FROM space_agent_memberships WHERE agent_id = ?`).run(id);
      this.coreDb.db.prepare(`DELETE FROM agent_cron_jobs WHERE agent_id = ?`).run(id);
      this.coreDb.db.prepare(`DELETE FROM agent_todo_history WHERE agent_id = ?`).run(id);
      this.coreDb.db.prepare(`DELETE FROM agent_file_compaction WHERE agent_id = ?`).run(id);
      this.coreDb.db.prepare(`DELETE FROM agent_mcps WHERE agent_id = ?`).run(id);
      this.coreDb.db.prepare(`DELETE FROM agent_skills WHERE agent_id = ?`).run(id);
      this.coreDb.db.prepare(`DELETE FROM chat_messages WHERE agent_id = ?`).run(id);
      this.coreDb.db.prepare(`DELETE FROM chat_sessions WHERE agent_id = ?`).run(id);
      this.coreDb.db.prepare(`DELETE FROM run_events WHERE agent_id = ?`).run(id);
      this.coreDb.db.prepare(`DELETE FROM runs WHERE agent_id = ?`).run(id);
      this.coreDb.db.prepare(`DELETE FROM agents WHERE id = ?`).run(id);
      this.coreDb.db.exec('COMMIT');
      return true;
    } catch (err) {
      this.coreDb.db.exec('ROLLBACK');
      throw err;
    }
  }

  // ── Peer Agent Connections ────────────────────────────────────────────────
  getAgentConnections(agentId?: string): AgentConnectionRecord[] {
    if (agentId) {
      const stmt = this.coreDb.db.prepare(`
        SELECT * FROM agent_connections 
        WHERE source_agent_id = ? OR target_agent_id = ? 
        ORDER BY created_at ASC
      `);
      return stmt.all(agentId, agentId) as unknown as AgentConnectionRecord[];
    }
    const stmt = this.coreDb.db.prepare(`SELECT * FROM agent_connections ORDER BY created_at ASC`);
    return stmt.all() as unknown as AgentConnectionRecord[];
  }

  getConnectedPeers(agentId: string): AgentRecord[] {
    const stmt = this.coreDb.db.prepare(`
      SELECT DISTINCT a.* FROM agents a
      INNER JOIN agent_connections c 
        ON (c.source_agent_id = ? AND c.target_agent_id = a.id)
        OR (c.target_agent_id = ? AND c.source_agent_id = a.id)
      WHERE a.id != ?
      ORDER BY a.name ASC
    `);
    return stmt.all(agentId, agentId, agentId) as unknown as AgentRecord[];
  }

  createAgentConnection(sourceId: string, targetId: string): AgentConnectionRecord {
    if (sourceId === targetId) {
      throw new Error('An agent cannot connect to itself');
    }
    const existing = this.coreDb.db.prepare(`
      SELECT * FROM agent_connections 
      WHERE (source_agent_id = ? AND target_agent_id = ?) 
         OR (source_agent_id = ? AND target_agent_id = ?)
    `).get(sourceId, targetId, targetId, sourceId) as unknown as AgentConnectionRecord | undefined;
    if (existing) {
      return existing;
    }

    const id = `conn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const createdAt = new Date().toISOString();
    const stmt = this.coreDb.db.prepare(`
      INSERT INTO agent_connections (id, source_agent_id, target_agent_id, created_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(id, sourceId, targetId, createdAt);
    return { id, source_agent_id: sourceId, target_agent_id: targetId, created_at: createdAt };
  }

  deleteAgentConnection(connectionId: string): boolean {
    const stmt = this.coreDb.db.prepare(`DELETE FROM agent_connections WHERE id = ?`);
    stmt.run(connectionId);
    return true;
  }

  deleteAgentConnectionBetween(agentIdA: string, agentIdB: string): boolean {
    const stmt = this.coreDb.db.prepare(`
      DELETE FROM agent_connections 
      WHERE (source_agent_id = ? AND target_agent_id = ?) 
         OR (source_agent_id = ? AND target_agent_id = ?)
    `);
    stmt.run(agentIdA, agentIdB, agentIdB, agentIdA);
    return true;
  }

  // ── MCP Attachments ────────────────────────────────────────────────────────
  getAgentMcps(agentId: string): AgentMcpRecord[] {
    const stmt = this.coreDb.db.prepare(`SELECT * FROM agent_mcps WHERE agent_id = ? ORDER BY created_at ASC`);
    return stmt.all(agentId) as unknown as AgentMcpRecord[];
  }

  addAgentMcp(mcp: Omit<AgentMcpRecord, 'created_at'> & { created_at?: string }): AgentMcpRecord {
    const createdAt = mcp.created_at ?? new Date().toISOString();
    const source = mcp.source ?? 'user';
    const stmt = this.coreDb.db.prepare(`
      INSERT INTO agent_mcps (id, agent_id, mcp_name, label, config_json, enabled, created_at, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(mcp.id, mcp.agent_id, mcp.mcp_name, mcp.label, mcp.config_json, mcp.enabled, createdAt, source);
    return { ...mcp, created_at: createdAt, source };
  }

  /**
   * Insert or update an MCP attachment keyed by `(agent_id, mcp_name)`. Used by
   * runtime reconciliation to persist MCP servers the agent added to its own
   * `mcp/mcp.json` without duplicating rows on every reconcile.
   */
  upsertAgentMcp(mcp: Omit<AgentMcpRecord, 'created_at'> & { created_at?: string }): AgentMcpRecord {
    const existing = this.coreDb.db
      .prepare(`SELECT id FROM agent_mcps WHERE agent_id = ? AND mcp_name = ? LIMIT 1`)
      .get(mcp.agent_id, mcp.mcp_name) as { id: string } | undefined;
    const source = mcp.source ?? 'agent';
    if (existing) {
      this.coreDb.db
        .prepare(`UPDATE agent_mcps SET label = ?, config_json = ?, enabled = ?, source = ? WHERE id = ?`)
        .run(mcp.label, mcp.config_json, mcp.enabled, source, existing.id);
      const row = this.coreDb.db
        .prepare(`SELECT * FROM agent_mcps WHERE id = ?`)
        .get(existing.id) as unknown as AgentMcpRecord;
      return row;
    }
    return this.addAgentMcp({ ...mcp, source });
  }

  deleteAgentMcp(id: string, agentId?: string): boolean {
    if (agentId) {
      const stmt = this.coreDb.db.prepare(`DELETE FROM agent_mcps WHERE agent_id = ? AND (id = ? OR mcp_name = ?)`);
      stmt.run(agentId, id, id);
    } else {
      const stmt = this.coreDb.db.prepare(`DELETE FROM agent_mcps WHERE id = ?`);
      stmt.run(id);
    }
    return true;
  }

  // ── Skill Attachments ──────────────────────────────────────────────────────
  getAgentSkills(agentId: string): AgentSkillRecord[] {
    const stmt = this.coreDb.db.prepare(`SELECT * FROM agent_skills WHERE agent_id = ? ORDER BY created_at ASC`);
    return stmt.all(agentId) as unknown as AgentSkillRecord[];
  }

  addAgentSkill(skill: Omit<AgentSkillRecord, 'created_at'> & { created_at?: string }): AgentSkillRecord {
    const createdAt = skill.created_at ?? new Date().toISOString();
    const source = skill.source ?? 'user';
    const stmt = this.coreDb.db.prepare(`
      INSERT INTO agent_skills (id, agent_id, skill_name, description, content, enabled, created_at, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      skill.id,
      skill.agent_id,
      skill.skill_name,
      skill.description ?? null,
      skill.content,
      skill.enabled,
      createdAt,
      source,
    );
    return { ...skill, created_at: createdAt, source };
  }

  /**
   * Insert or update a skill attachment keyed by `(agent_id, skill_name)`. Used
   * by runtime reconciliation to persist skills the agent added to its own
   * `skills/skills.json` without duplicating rows on every reconcile.
   */
  upsertAgentSkill(skill: Omit<AgentSkillRecord, 'created_at'> & { created_at?: string }): AgentSkillRecord {
    const existing = this.coreDb.db
      .prepare(`SELECT id FROM agent_skills WHERE agent_id = ? AND skill_name = ? LIMIT 1`)
      .get(skill.agent_id, skill.skill_name) as { id: string } | undefined;
    const source = skill.source ?? 'agent';
    if (existing) {
      this.coreDb.db
        .prepare(`UPDATE agent_skills SET description = ?, content = ?, enabled = ?, source = ? WHERE id = ?`)
        .run(skill.description ?? null, skill.content, skill.enabled, source, existing.id);
      const row = this.coreDb.db
        .prepare(`SELECT * FROM agent_skills WHERE id = ?`)
        .get(existing.id) as unknown as AgentSkillRecord;
      return row;
    }
    return this.addAgentSkill({ ...skill, source });
  }

  deleteAgentSkill(id: string, agentId?: string): boolean {
    const stmt = agentId
      ? this.coreDb.db.prepare(`DELETE FROM agent_skills WHERE id = ? AND agent_id = ?`)
      : this.coreDb.db.prepare(`DELETE FROM agent_skills WHERE id = ?`);
    if (agentId) stmt.run(id, agentId);
    else stmt.run(id);
    return true;
  }

  // ── Runs and Events ────────────────────────────────────────────────────────
  createRun(run: Partial<RunRecord> & Pick<RunRecord, 'id' | 'agent_id' | 'trigger_type' | 'status'>): RunRecord {
    const startedAt = run.started_at ?? new Date().toISOString();
    const stmt = this.coreDb.db.prepare(`
      INSERT INTO runs (id, agent_id, trigger_type, status, task_prompt, summary, error, started_at, completed_at, session_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      run.session_id ?? null,
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
    const stmtGet = this.coreDb.db.prepare(`SELECT * FROM runs WHERE id = ?`);
    const current = stmtGet.get(id) as unknown as RunRecord | undefined;
    if (!current) return null;

    const updated = { ...current, ...patch };
    const stmt = this.coreDb.db.prepare(`
      UPDATE runs SET
        status = ?,
        summary = ?,
        error = ?,
        completed_at = ?,
        session_id = ?
      WHERE id = ?
    `);
    stmt.run(updated.status, updated.summary, updated.error, updated.completed_at, updated.session_id ?? null, id);
    return updated;
  }

  getAgentRuns(agentId: string, limit = 50, triggerType?: string): RunRecord[] {
    if (triggerType) {
      const stmt = this.coreDb.db.prepare(`
        SELECT * FROM runs WHERE agent_id = ? AND trigger_type = ? ORDER BY started_at DESC LIMIT ?
      `);
      return stmt.all(agentId, triggerType, limit) as unknown as RunRecord[];
    }
    const stmt = this.coreDb.db.prepare(`SELECT * FROM runs WHERE agent_id = ? ORDER BY started_at DESC LIMIT ?`);
    return stmt.all(agentId, limit) as unknown as RunRecord[];
  }

  getLatestRun(agentId: string): RunRecord | null {
    const runs = this.getAgentRuns(agentId, 1);
    return runs.length > 0 ? runs[0] : null;
  }

  getRun(runId: string): RunRecord | null {
    const stmt = this.coreDb.db.prepare(`SELECT * FROM runs WHERE id = ?`);
    const row = stmt.get(runId) as unknown as RunRecord | undefined;
    return row ?? null;
  }

  getOrphanedRunningRuns(): RunRecord[] {
    const stmt = this.coreDb.db.prepare(`SELECT * FROM runs WHERE status = 'running'`);
    return stmt.all() as unknown as RunRecord[];
  }

  // ── Chat Sessions & Multi-Turn Messages ───────────────────────────────────
  /**
   * Returns the session only if it exists AND belongs to the given agent.
   * Session ids are not secrets (they're echoed back to clients, passed in
   * POST /run bodies, etc.), so without this check, agent B could pass
   * agent A's session id and read, append to, or delete A's conversation.
   * Used everywhere a caller supplies a session id for an operation scoped
   * to one agent. See #8.
   */
  getOwnedSession(agentId: string, sessionId: string): ChatSessionRecord | null {
    const session = this.getSession(sessionId);
    if (!session || session.agent_id !== agentId) return null;
    return session;
  }

  getOrCreateSession(agentId: string, sessionId?: string, title?: string): ChatSessionRecord {
    const id = sessionId || `session_${agentId}_default`;
    const stmtGet = this.coreDb.db.prepare(`SELECT * FROM chat_sessions WHERE id = ?`);
    const existing = stmtGet.get(id) as unknown as ChatSessionRecord | undefined;
    if (existing) {
      if (existing.agent_id !== agentId) {
        // The id exists but belongs to a different agent. Silently handing
        // back someone else's session was the bug; silently creating a
        // second session under a colliding id isn't possible either (id is
        // the primary key) and would be confusing if it were. Callers (every
        // route below, and AgentRunner.runAgent) must handle this rejection
        // — HTTP routes turn it into 404/400, never into "use agent A's data
        // anyway". See #8.
        throw new Error(`Session ${id} does not belong to agent ${agentId}`);
      }
      return existing;
    }

    const now = new Date().toISOString();
    const sessionTitle = title || 'General Discussion';
    const stmtInsert = this.coreDb.db.prepare(`
      INSERT INTO chat_sessions (id, agent_id, title, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmtInsert.run(id, agentId, sessionTitle, now, now);
    return {
      id,
      agent_id: agentId,
      title: sessionTitle,
      created_at: now,
      updated_at: now,
      message_count: 0,
      last_message: null,
    };
  }

  getAgentSessions(agentId: string): ChatSessionRecord[] {
    const stmt = this.coreDb.db.prepare(`
      SELECT 
        s.*,
        (SELECT COUNT(*) FROM chat_messages m WHERE m.session_id = s.id) as message_count,
        (SELECT content FROM chat_messages m WHERE m.session_id = s.id ORDER BY m.created_at DESC LIMIT 1) as last_message
      FROM chat_sessions s
      WHERE s.agent_id = ?
      ORDER BY s.updated_at DESC
    `);
    return stmt.all(agentId) as unknown as ChatSessionRecord[];
  }

  getSession(sessionId: string): ChatSessionRecord | null {
    const stmt = this.coreDb.db.prepare(`
      SELECT 
        s.*,
        (SELECT COUNT(*) FROM chat_messages m WHERE m.session_id = s.id) as message_count,
        (SELECT content FROM chat_messages m WHERE m.session_id = s.id ORDER BY m.created_at DESC LIMIT 1) as last_message
      FROM chat_sessions s
      WHERE s.id = ?
    `);
    const row = stmt.get(sessionId) as unknown as ChatSessionRecord | undefined;
    return row ?? null;
  }

  updateSessionTitle(sessionId: string, title: string): void {
    const stmt = this.coreDb.db.prepare(`UPDATE chat_sessions SET title = ?, updated_at = ? WHERE id = ?`);
    stmt.run(title, new Date().toISOString(), sessionId);
  }

  touchSession(sessionId: string): void {
    const stmt = this.coreDb.db.prepare(`UPDATE chat_sessions SET updated_at = ? WHERE id = ?`);
    stmt.run(new Date().toISOString(), sessionId);
  }

  /**
   * Deletes a session and every chat_messages row that belongs to it.
   *
   * The schema declares chat_messages.session_id with ON DELETE CASCADE, but
   * no connection enables `PRAGMA foreign_keys = ON` (flipping that on
   * globally risks surfacing unrelated, currently-silent FK violations
   * elsewhere in an existing user's database), so SQLite never enforced that
   * cascade — messages survived a session delete. The UI falls back to a
   * deterministic default session id, which getOrCreateSession() happily
   * recreates, so the "deleted" conversation (and its old messages as model
   * context on the next run) would reappear. See #6.
   */
  deleteSession(sessionId: string): boolean {
    this.coreDb.db.exec('BEGIN');
    try {
      this.coreDb.db.prepare(`DELETE FROM chat_messages WHERE session_id = ?`).run(sessionId);
      const res = this.coreDb.db.prepare(`DELETE FROM chat_sessions WHERE id = ?`).run(sessionId);
      this.coreDb.db.exec('COMMIT');
      return res.changes > 0;
    } catch (err) {
      this.coreDb.db.exec('ROLLBACK');
      throw err;
    }
  }

  addChatMessage(msg: {
    id: string;
    session_id: string;
    agent_id: string;
    role: string;
    content: string;
    parts_json?: string | null;
    run_id?: string | null;
  }): ChatMessageRecord {
    const createdAt = new Date().toISOString();
    const stmt = this.coreDb.db.prepare(`
      INSERT INTO chat_messages (id, session_id, agent_id, role, content, parts_json, run_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      msg.id,
      msg.session_id,
      msg.agent_id,
      msg.role,
      msg.content,
      msg.parts_json ?? null,
      msg.run_id ?? null,
      createdAt,
    );
    this.touchSession(msg.session_id);
    return {
      id: msg.id,
      session_id: msg.session_id,
      agent_id: msg.agent_id,
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
      parts_json: msg.parts_json ?? null,
      run_id: msg.run_id ?? null,
      created_at: createdAt,
    };
  }

  updateChatMessage(id: string, patch: { content?: string; parts_json?: string | null }): boolean {
    const fields: string[] = [];
    const values: any[] = [];
    if (patch.content !== undefined) {
      fields.push('content = ?');
      values.push(patch.content);
    }
    if (patch.parts_json !== undefined) {
      fields.push('parts_json = ?');
      values.push(patch.parts_json);
    }
    if (fields.length === 0) return false;
    values.push(id);
    const stmt = this.coreDb.db.prepare(`UPDATE chat_messages SET ${fields.join(', ')} WHERE id = ?`);
    const res = stmt.run(...values);
    return res.changes > 0;
  }

  getChatMessage(id: string): ChatMessageRecord | null {
    const stmt = this.coreDb.db.prepare(`SELECT * FROM chat_messages WHERE id = ?`);
    const row = stmt.get(id) as unknown as ChatMessageRecord | undefined;
    return row ?? null;
  }

  getSessionMessages(sessionId: string): ChatMessageRecord[] {
    const stmt = this.coreDb.db.prepare(`
      SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC
    `);
    const rows = stmt.all(sessionId) as unknown as ChatMessageRecord[];
    // Auto-reconstruct parts_json for assistant messages that lack it if run events exist,
    // and sanitize any orphaned 'running' tool calls if the run is no longer running
    return rows.map((msg) => {
      let parts: any[] | null = null;

      if (msg.role === 'assistant' && (!msg.parts_json || msg.parts_json === '[]') && msg.run_id) {
        const reconstructed = this.reconstructMessagePartsFromRun(msg.run_id);
        if (reconstructed.length > 0) {
          parts = reconstructed;
        }
      } else if (msg.parts_json) {
        try {
          parts = JSON.parse(msg.parts_json);
        } catch {
          parts = null;
        }
      }

      // Check if parts contains any toolCall with status === 'running' or 'pending'
      if (Array.isArray(parts)) {
        let changed = false;
        const run = msg.run_id ? this.getRun(msg.run_id) : null;
        const isRunActive = run && run.status === 'running';

        if (!isRunActive) {
          for (const part of parts) {
            if (part && part.type === 'tool' && part.toolCall) {
              const tc = part.toolCall;
              if (tc.status === 'running' || tc.status === 'pending' || !tc.status) {
                tc.status = run?.status === 'failed' ? 'error' : (run?.status === 'completed' ? 'success' : 'error');
                if (tc.status === 'error') {
                  tc.error = tc.error || {
                    code: 'execution_interrupted',
                    layer: 'tool',
                    severity: 'error',
                    message: run?.error || 'Execution was interrupted or stopped.',
                    retryable: false,
                  };
                }
                changed = true;
              }
            }
          }
        }

        if (changed || (!msg.parts_json && parts.length > 0)) {
          const partsJson = JSON.stringify(parts);
          this.updateChatMessage(msg.id, { parts_json: partsJson });
          return { ...msg, parts_json: partsJson };
        }
      }

      return msg;
    });
  }

  cleanupStaleChatMessageTools(): number {
    try {
      const stmt = this.coreDb.db.prepare(`
        SELECT id, run_id, parts_json FROM chat_messages 
        WHERE parts_json LIKE '%"type":"tool"%'
      `);
      const rows = stmt.all() as Array<{ id: string; run_id: string | null; parts_json: string }>;
      let cleaned = 0;

      for (const row of rows) {
        if (!row.parts_json) continue;
        const run = row.run_id ? this.getRun(row.run_id) : null;
        if (run && run.status === 'running') continue; // Run is still active

        try {
          const parts = JSON.parse(row.parts_json);
          let changed = false;
          if (Array.isArray(parts)) {
            for (const part of parts) {
              if (part && part.type === 'tool' && part.toolCall) {
                const tc = part.toolCall;
                if (tc.status === 'running' || tc.status === 'pending' || !tc.status) {
                  tc.status = run?.status === 'failed' ? 'error' : (run?.status === 'completed' ? 'success' : 'error');
                  if (tc.status === 'error') {
                    tc.error = tc.error || {
                      code: 'execution_interrupted',
                      layer: 'tool',
                      severity: 'error',
                      message: run?.error || 'Execution was interrupted or stopped.',
                      retryable: false,
                    };
                  }
                  changed = true;
                }
              }
            }
          }

          if (changed) {
            this.updateChatMessage(row.id, { parts_json: JSON.stringify(parts) });
            cleaned++;
          }
        } catch {}
      }
      return cleaned;
    } catch {
      return 0;
    }
  }

  reconstructMessagePartsFromRun(runId: string): any[] {
    const events = this.getRunEvents(runId);
    if (!events || events.length === 0) return [];

    const parts: any[] = [];
    const toolMap = new Map<string, any>();

    for (const evt of events) {
      let p: Record<string, unknown> = {};
      try {
        p = JSON.parse(evt.payload_json);
      } catch {
        p = {};
      }

      if (evt.event_type === 'text.thought') {
        const delta = String(p.delta ?? '');
        if (delta) {
          const last = parts[parts.length - 1];
          if (last && last.type === 'thinking') {
            last.content += delta;
          } else {
            parts.push({ type: 'thinking', content: delta });
          }
        }
      } else if (evt.event_type === 'tool.started') {
        const toolId = String(p.toolCallId || `tc_${parts.length}`);
        const toolCall = {
          id: toolId,
          name: String(p.toolName || 'tool'),
          status: 'running',
          input: p.args,
          startedAt: evt.created_at,
        };
        toolMap.set(toolId, toolCall);
        parts.push({ type: 'tool', toolCall });
      } else if (evt.event_type === 'tool.completed') {
        const toolId = String(p.toolCallId || '');
        let toolCall = toolMap.get(toolId);
        if (!toolCall) {
          toolCall = {
            id: toolId || `tc_${parts.length}`,
            name: String(p.toolName || 'tool'),
            status: 'success',
            input: p.args,
            output: p.result,
            completedAt: evt.created_at,
          };
          toolMap.set(toolCall.id, toolCall);
          parts.push({ type: 'tool', toolCall });
        } else {
          toolCall.status = 'success';
          toolCall.output = p.result;
          toolCall.completedAt = evt.created_at;
        }
      } else if (evt.event_type === 'tool.failed') {
        const toolId = String(p.toolCallId || '');
        let toolCall = toolMap.get(toolId);
        if (!toolCall) {
          toolCall = {
            id: toolId || `tc_${parts.length}`,
            name: String(p.toolName || 'tool'),
            status: 'error',
            input: p.args,
            error: {
              code: 'tool_failed',
              layer: 'tool',
              severity: 'error',
              message: String(p.error || 'Execution failed'),
              retryable: false,
            },
            completedAt: evt.created_at,
          };
          toolMap.set(toolCall.id, toolCall);
          parts.push({ type: 'tool', toolCall });
        } else {
          toolCall.status = 'error';
          toolCall.error = {
            code: 'tool_failed',
            layer: 'tool',
            severity: 'error',
            message: String(p.error || 'Execution failed'),
            retryable: false,
          };
          toolCall.completedAt = evt.created_at;
        }
      } else if (evt.event_type === 'text.delta') {
        const delta = String(p.delta ?? '');
        if (delta) {
          const last = parts[parts.length - 1];
          if (last && last.type === 'markdown') {
            last.content += delta;
          } else {
            parts.push({ type: 'markdown', content: delta });
          }
        }
      }
    }

    return parts;
  }


  addRunEvent(event: Omit<RunEventRecord, 'id' | 'created_at'> & { created_at?: string }): RunEventRecord {
    const createdAt = event.created_at ?? new Date().toISOString();
    const stmt = this.coreDb.db.prepare(`
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
    const stmt = this.coreDb.db.prepare(`SELECT * FROM run_events WHERE run_id = ? ORDER BY id ASC`);
    return stmt.all(runId) as unknown as RunEventRecord[];
  }

  // ── Agent Cron Jobs Registry ───────────────────────────────────────────────

  getAgentCronJobs(agentId: string): AgentCronJobRecord[] {
    const stmt = this.coreDb.db.prepare(
      `SELECT * FROM agent_cron_jobs WHERE agent_id = ? ORDER BY created_at ASC`,
    );
    return stmt.all(agentId) as unknown as AgentCronJobRecord[];
  }

  getAllActiveCronJobs(): AgentCronJobRecord[] {
    const stmt = this.coreDb.db.prepare(
      `SELECT * FROM agent_cron_jobs WHERE enabled = 1 ORDER BY next_run_at ASC`,
    );
    return stmt.all() as unknown as AgentCronJobRecord[];
  }

  getCronJob(id: string): AgentCronJobRecord | null {
    const stmt = this.coreDb.db.prepare(`SELECT * FROM agent_cron_jobs WHERE id = ?`);
    const row = stmt.get(id) as unknown as AgentCronJobRecord | undefined;
    return row ?? null;
  }

  createAgentCronJob(
    job: AgentCronJobInput & { agent_id: string; created_by?: CronJobSource; next_run_at?: string | null },
  ): AgentCronJobRecord {
    const id = `cron-${randomUUID()}`;
    const now = new Date().toISOString();
    const enabled = job.enabled === undefined || job.enabled === true || job.enabled === 1 ? 1 : 0;
    const stmt = this.coreDb.db.prepare(`
      INSERT INTO agent_cron_jobs (
        id, agent_id, name, prompt, cron_schedule, enabled,
        last_run_at, next_run_at, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      job.agent_id,
      job.name.trim(),
      job.prompt.trim(),
      job.cron_schedule.trim(),
      enabled,
      null,
      job.next_run_at ?? null,
      job.created_by ?? 'user',
      now,
      now,
    );
    return this.getCronJob(id)!;
  }

  updateAgentCronJob(
    id: string,
    updates: Partial<AgentCronJobRecord>,
  ): AgentCronJobRecord | null {
    const existing = this.getCronJob(id);
    if (!existing) return null;

    const sets: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      sets.push('name = ?');
      values.push(updates.name.trim());
    }
    if (updates.prompt !== undefined) {
      sets.push('prompt = ?');
      values.push(updates.prompt.trim());
    }
    if (updates.cron_schedule !== undefined) {
      sets.push('cron_schedule = ?');
      values.push(updates.cron_schedule.trim());
    }
    if (updates.enabled !== undefined) {
      sets.push('enabled = ?');
      values.push(updates.enabled ? 1 : 0);
    }
    if (updates.last_run_at !== undefined) {
      sets.push('last_run_at = ?');
      values.push(updates.last_run_at);
    }
    if (updates.next_run_at !== undefined) {
      sets.push('next_run_at = ?');
      values.push(updates.next_run_at);
    }
    if (updates.last_status !== undefined) {
      sets.push('last_status = ?');
      values.push(updates.last_status);
    }
    if (updates.last_error !== undefined) {
      sets.push('last_error = ?');
      values.push(updates.last_error);
    }

    if (sets.length === 0) return existing;

    sets.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    this.coreDb.db.prepare(`UPDATE agent_cron_jobs SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return this.getCronJob(id);
  }

  deleteAgentCronJob(id: string): boolean {
    const stmt = this.coreDb.db.prepare(`DELETE FROM agent_cron_jobs WHERE id = ?`);
    const result = stmt.run(id);
    return Number(result.changes) > 0;
  }

  recordCronJobRun(id: string, nextRunAt: string | null, status?: string | null, error?: string | null): void {
    const now = new Date().toISOString();
    const sets = ['last_run_at = ?', 'next_run_at = ?', 'updated_at = ?'];
    const values: any[] = [now, nextRunAt, now];
    if (status !== undefined) {
      sets.push('last_status = ?');
      values.push(status);
    }
    if (error !== undefined) {
      sets.push('last_error = ?');
      values.push(error);
    }
    values.push(id);
    const stmt = this.coreDb.db.prepare(
      `UPDATE agent_cron_jobs SET ${sets.join(', ')} WHERE id = ?`,
    );
    stmt.run(...values);
  }

  // ── File Compaction Tracking ───────────────────────────────────────────────

  getFileCompaction(
    agentId: string,
    filePath: string,
  ): { last_mtime: number; line_count: number } | null {
    const row = this.coreDb.db
      .prepare(
        `SELECT last_mtime, line_count FROM agent_file_compaction WHERE agent_id = ? AND file_path = ?`,
      )
      .get(agentId, filePath) as { last_mtime: number; line_count: number } | undefined;
    return row ?? null;
  }

  recordFileCompaction(
    agentId: string,
    filePath: string,
    mtime: number,
    lineCount: number,
  ): void {
    const now = new Date().toISOString();
    this.coreDb.db
      .prepare(`
        INSERT OR REPLACE INTO agent_file_compaction (
          agent_id, file_path, last_compacted_at, last_mtime, line_count
        ) VALUES (?, ?, ?, ?, ?)
      `)
      .run(agentId, filePath, now, mtime, lineCount);
  }

  // ── Agent Todo History ─────────────────────────────────────────────────────

  getAgentTodosByDate(agentId: string, taskDate: string): AgentTodoRecord[] {
    const stmt = this.coreDb.db.prepare(`
      SELECT * FROM agent_todo_history
      WHERE agent_id = ? AND task_date = ?
      ORDER BY created_at ASC
    `);
    return stmt.all(agentId, taskDate) as unknown as AgentTodoRecord[];
  }

  getAgentTodoDates(agentId: string): string[] {
    const stmt = this.coreDb.db.prepare(`
      SELECT DISTINCT task_date FROM agent_todo_history
      WHERE agent_id = ?
      ORDER BY task_date DESC
    `);
    const rows = stmt.all(agentId) as unknown as { task_date: string }[];
    return rows.map((r) => r.task_date);
  }

  findExistingTodo(agentId: string, taskDate: string, content: string): AgentTodoRecord | null {
    const stmt = this.coreDb.db.prepare(`
      SELECT * FROM agent_todo_history
      WHERE agent_id = ? AND task_date = ? AND content = ?
      LIMIT 1
    `);
    const row = stmt.get(agentId, taskDate, content) as unknown as AgentTodoRecord | undefined;
    return row ?? null;
  }

  /**
   * Deletes todo rows for this agent/date/run whose content is not present
   * in the current full list. The harness's todo_write tool is documented
   * as a full-list replacement ("Send the ENTIRE list every call - it
   * REPLACES the previous list"), but the upsert loop that calls this only
   * ever added/updated rows matching the current payload — nothing deleted
   * or marked a row stale when a task was removed or renamed, so removed
   * tasks became permanent phantom rows and renames produced duplicates.
   * Scoped to run_id (not just agent_id + task_date) so an earlier run's
   * todos from the same day are never touched by a later run's first
   * todo_write call. See #9.
   */
  reconcileAgentTodosForRun(agentId: string, taskDate: string, runId: string, currentContents: string[]): void {
    if (currentContents.length === 0) {
      // An empty list is still a valid full replacement: this run has no
      // to-dos left for this date.
      this.coreDb.db
        .prepare(`DELETE FROM agent_todo_history WHERE agent_id = ? AND task_date = ? AND run_id = ?`)
        .run(agentId, taskDate, runId);
      return;
    }
    const placeholders = currentContents.map(() => '?').join(',');
    this.coreDb.db
      .prepare(
        `DELETE FROM agent_todo_history WHERE agent_id = ? AND task_date = ? AND run_id = ? AND content NOT IN (${placeholders})`,
      )
      .run(agentId, taskDate, runId, ...currentContents);
  }

  upsertAgentTodoItem(record: AgentTodoRecord): AgentTodoRecord {
    const existing = this.findExistingTodo(record.agent_id, record.task_date, record.content);
    const now = new Date().toISOString();

    if (existing) {
      // Preserve or transition timestamps
      const startedAt = record.started_at ?? existing.started_at ?? (record.status === 'in_progress' ? now : null);
      const completedAt = record.completed_at ?? (record.status === 'completed' ? (existing.completed_at ?? now) : null);
      const priority = record.priority ?? existing.priority ?? 'medium';
      const section = record.section ?? existing.section ?? null;
      const metadataJson = record.metadata_json ?? existing.metadata_json ?? null;

      const stmt = this.coreDb.db.prepare(`
        UPDATE agent_todo_history SET
          status = ?,
          priority = ?,
          section = ?,
          started_at = ?,
          completed_at = ?,
          updated_at = ?,
          run_id = COALESCE(?, run_id),
          session_id = COALESCE(?, session_id),
          metadata_json = ?
        WHERE id = ?
      `);
      stmt.run(
        record.status,
        priority,
        section,
        startedAt,
        completedAt,
        now,
        record.run_id ?? null,
        record.session_id ?? null,
        metadataJson,
        existing.id,
      );
      return {
        ...existing,
        status: record.status,
        priority,
        section,
        started_at: startedAt,
        completed_at: completedAt,
        updated_at: now,
        run_id: record.run_id ?? existing.run_id,
        session_id: record.session_id ?? existing.session_id,
        metadata_json: metadataJson,
      };
    }

    const id = record.id || randomUUID();
    const createdAt = record.created_at || now;
    const updatedAt = record.updated_at || now;
    const startedAt = record.started_at ?? (record.status === 'in_progress' ? now : null);
    const completedAt = record.completed_at ?? (record.status === 'completed' ? now : null);

    const stmt = this.coreDb.db.prepare(`
      INSERT INTO agent_todo_history (
        id, agent_id, task_date, run_id, session_id,
        content, status, priority, section,
        started_at, completed_at, created_at, updated_at, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      record.agent_id,
      record.task_date,
      record.run_id ?? null,
      record.session_id ?? null,
      record.content,
      record.status,
      record.priority || 'medium',
      record.section ?? null,
      startedAt,
      completedAt,
      createdAt,
      updatedAt,
      record.metadata_json ?? null,
    );

    return {
      id,
      agent_id: record.agent_id,
      task_date: record.task_date,
      run_id: record.run_id ?? null,
      session_id: record.session_id ?? null,
      content: record.content,
      status: record.status,
      priority: record.priority || 'medium',
      section: record.section ?? null,
      started_at: startedAt,
      completed_at: completedAt,
      created_at: createdAt,
      updated_at: updatedAt,
      metadata_json: record.metadata_json ?? null,
    };
  }

  getAllAgentTodoRecords(agentId: string, limit: number = 300): AgentTodoRecord[] {
    const stmt = this.coreDb.db.prepare(`
      SELECT * FROM agent_todo_history
      WHERE agent_id = ?
      ORDER BY task_date DESC, created_at ASC
      LIMIT ?
    `);
    return stmt.all(agentId, limit) as unknown as AgentTodoRecord[];
  }

  deleteAgentTodoHistory(agentId: string, taskDate?: string): void {
    if (taskDate) {
      const stmt = this.coreDb.db.prepare(`
        DELETE FROM agent_todo_history WHERE agent_id = ? AND task_date = ?
      `);
      stmt.run(agentId, taskDate);
    } else {
      const stmt = this.coreDb.db.prepare(`
        DELETE FROM agent_todo_history WHERE agent_id = ?
      `);
      stmt.run(agentId);
    }
  }

  // ── Explore / Feature Ownership ───────────────────────────────────────────

  getAgentsBySpace(spaceId: string): AgentRecord[] {
    const stmt = this.coreDb.db.prepare(`
      SELECT a.* FROM agents a
      INNER JOIN space_agent_memberships m ON m.agent_id = a.id
      WHERE m.space_id = ?
      ORDER BY a.created_at ASC
    `);
    return stmt.all(spaceId) as unknown as AgentRecord[];
  }

  updateAgentFeatureOwnership(agentId: string, featureOwnership: import('./agent.types.js').FeatureOwnership[]): void {
    const stmt = this.coreDb.db.prepare(`UPDATE agents SET feature_ownership_json = ? WHERE id = ?`);
    stmt.run(JSON.stringify(featureOwnership), agentId);
  }

  updateAgentTier(agentId: string, tier: 'architect' | 'manager' | 'leaf'): void {
    const stmt = this.coreDb.db.prepare(`UPDATE agents SET agent_tier = ? WHERE id = ?`);
    stmt.run(tier, agentId);
  }

  updateAgentLastSync(agentId: string): void {
    const stmt = this.coreDb.db.prepare(`UPDATE agents SET last_sync_at = ? WHERE id = ?`);
    stmt.run(new Date().toISOString(), agentId);
  }

  getAgentFeatureOwnership(agentId: string): import('./agent.types.js').FeatureOwnership[] {
    const agent = this.getAgent(agentId);
    if (!agent?.feature_ownership_json) return [];
    try {
      return JSON.parse(agent.feature_ownership_json) as import('./agent.types.js').FeatureOwnership[];
    } catch { return []; }
  }
}
