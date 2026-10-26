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
    const stmt = this.coreDb.db.prepare(`DELETE FROM agents WHERE id = ?`);
    stmt.run(id);
    return true;
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
      const stmt = this.coreDb.db.prepare(`DELETE FROM agent_mcps WHERE id = ? OR (agent_id = ? AND mcp_name = ?)`);
      stmt.run(id, agentId, id);
    } else {
      const stmt = this.coreDb.db.prepare(`DELETE FROM agent_mcps WHERE id = ? OR mcp_name = ?`);
      stmt.run(id, id);
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

  deleteAgentSkill(id: string): boolean {
    const stmt = this.coreDb.db.prepare(`DELETE FROM agent_skills WHERE id = ?`);
    stmt.run(id);
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

  // ── Chat Sessions & Multi-Turn Messages ───────────────────────────────────
  getOrCreateSession(agentId: string, sessionId?: string, title?: string): ChatSessionRecord {
    const id = sessionId || `session_${agentId}_default`;
    const stmtGet = this.coreDb.db.prepare(`SELECT * FROM chat_sessions WHERE id = ?`);
    const existing = stmtGet.get(id) as unknown as ChatSessionRecord | undefined;
    if (existing) return existing;

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

  deleteSession(sessionId: string): boolean {
    const stmt = this.coreDb.db.prepare(`DELETE FROM chat_sessions WHERE id = ?`);
    const res = stmt.run(sessionId);
    return res.changes > 0;
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
    // Auto-reconstruct parts_json for assistant messages that lack it if run events exist
    return rows.map((msg) => {
      if (msg.role === 'assistant' && (!msg.parts_json || msg.parts_json === '[]') && msg.run_id) {
        const reconstructed = this.reconstructMessagePartsFromRun(msg.run_id);
        if (reconstructed.length > 0) {
          const partsJson = JSON.stringify(reconstructed);
          // Persist the repaired parts_json
          this.updateChatMessage(msg.id, { parts_json: partsJson });
          return { ...msg, parts_json: partsJson };
        }
      }
      return msg;
    });
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

  recordCronJobRun(id: string, nextRunAt: string | null): void {
    const now = new Date().toISOString();
    const stmt = this.coreDb.db.prepare(
      `UPDATE agent_cron_jobs SET last_run_at = ?, next_run_at = ?, updated_at = ? WHERE id = ?`,
    );
    stmt.run(now, nextRunAt, now, id);
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
}
