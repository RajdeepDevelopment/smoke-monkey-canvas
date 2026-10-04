import { createAgent, type McpServerConfig, type Skill } from './harness-bridge.js';
import type { CanvasDatabase, AgentRecord, RunRecord } from './db.js';
import { STOCK_MCPS } from './stock.js';

export interface WebSocketBroadcaster {
  broadcast(message: {
    type: string;
    agentId: string;
    runId?: string;
    data?: unknown;
  }): void;
}

export class AgentRunner {
  private db: CanvasDatabase;
  private ws: WebSocketBroadcaster;
  private runningAgents = new Set<string>();

  constructor(db: CanvasDatabase, ws: WebSocketBroadcaster) {
    this.db = db;
    this.ws = ws;
  }

  isAgentRunning(agentId: string): boolean {
    return this.runningAgents.has(agentId);
  }

  async runAgent(agentId: string, triggerType: 'cron' | 'manual' = 'manual', customPrompt?: string): Promise<RunRecord> {
    const agent = this.db.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found in database.`);
    }

    if (this.runningAgents.has(agentId)) {
      throw new Error(`Agent ${agent.name} (${agentId}) is already running.`);
    }

    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.runningAgents.add(agentId);

    // Update agent state in DB
    this.db.updateAgent(agentId, { status: 'running' });
    this.ws.broadcast({
      type: 'agent_status',
      agentId,
      data: { status: 'running', runId },
    });

    const run = this.db.createRun({
      id: runId,
      agent_id: agentId,
      trigger_type: triggerType,
      status: 'running',
      task_prompt: customPrompt ?? agent.system_prompt,
      summary: null,
      error: null,
      completed_at: null,
    });

    this.ws.broadcast({
      type: 'run_started',
      agentId,
      runId,
      data: { run },
    });

    // Background asynchronous execution
    this.executeRun(agent, run, customPrompt).catch((err) => {
      console.error(`[AgentRunner] Execution error for agent ${agentId}:`, err);
    });

    return run;
  }

  private async executeRun(agent: AgentRecord, run: RunRecord, customPrompt?: string): Promise<void> {
    const agentId = agent.id;
    const runId = run.id;

    try {
      // 1. Gather MCPs
      const mcpRecords = this.db.getAgentMcps(agentId).filter((m) => m.enabled === 1);
      const mcpConfigs: McpServerConfig[] = [];

      for (const m of mcpRecords) {
        let config: Record<string, unknown> = {};
        try {
          config = JSON.parse(m.config_json);
        } catch {
          config = {};
        }

        const stock = STOCK_MCPS.find((s) => s.name === m.mcp_name);
        const env = { ...process.env, ...((config.env as Record<string, string>) || {}) };

        if (stock) {
          mcpConfigs.push({
            name: m.mcp_name,
            command: (config.command as string) ?? stock.command ?? 'npx',
            args: (config.args as string[]) ?? stock.args ?? ['-y', stock.name],
            env,
          });
        } else if (config.command) {
          mcpConfigs.push({
            name: m.mcp_name,
            command: config.command as string,
            args: (config.args as string[]) ?? [],
            env,
          });
        } else if (config.url) {
          mcpConfigs.push({
            name: m.mcp_name,
            url: config.url as string,
          });
        }
      }

      // 2. Gather Skills
      const skillRecords = this.db.getAgentSkills(agentId).filter((s) => s.enabled === 1);
      const skills: Skill[] = skillRecords.map((s) => ({
        id: s.skill_name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: s.skill_name,
        description: s.description ?? s.skill_name,
        content: s.content,
        path: '',
        dir: process.cwd(),
      }));

      // 3. Resolve API key
      const provider = agent.provider || 'nvidia';
      let apiKey = process.env.NVIDIA_API_KEY;
      if (provider === 'openai') apiKey = process.env.OPENAI_API_KEY;
      else if (provider === 'anthropic') apiKey = process.env.ANTHROPIC_API_KEY;
      else if (provider === 'gemini') apiKey = process.env.GEMINI_API_KEY;
      else if (provider === 'openrouter') apiKey = process.env.OPENROUTER_API_KEY;
      else if (provider === 'groq') apiKey = process.env.GROQ_API_KEY;

      // 4. Instantiate harness agent
      const harnessAgent = createAgent({
        provider,
        model: agent.model || 'meta/llama-3.3-70b-instruct',
        apiKey,
        workspacePath: process.cwd(),
        systemPrompt: agent.system_prompt,
        autoApprove: true,
        permission: 'allow-all',
        mcp: mcpConfigs.length > 0 ? mcpConfigs : undefined,
        skills: skills.length > 0 ? skills : undefined,
      });

      // 5. Wire real-time event listeners
      const logEvent = (eventType: string, payload: unknown) => {
        const payloadJson = JSON.stringify(payload);
        this.db.addRunEvent({
          run_id: runId,
          agent_id: agentId,
          event_type: eventType,
          payload_json: payloadJson,
        });

        this.ws.broadcast({
          type: 'run_event',
          agentId,
          runId,
          data: {
            eventType,
            payload,
            timestamp: new Date().toISOString(),
          },
        });
      };

      harnessAgent.on('text.delta', (e) => {
        logEvent('text.delta', { delta: e.data.delta });
      });

      harnessAgent.on('text.thought', (e) => {
        logEvent('text.thought', { delta: e.data.delta });
      });

      harnessAgent.on('step.started', (e) => {
        logEvent('step.started', { step: e.data.step });
      });

      harnessAgent.on('tool.started', (e) => {
        logEvent('tool.started', {
          toolName: e.data.toolName,
          toolCallId: e.data.toolCallId,
          args: e.data.args,
        });
      });

      harnessAgent.on('tool.completed', (e) => {
        logEvent('tool.completed', {
          toolName: e.data.toolName,
          toolCallId: e.data.toolCallId,
          result: e.data.result,
        });
      });

      harnessAgent.on('tool.failed', (e) => {
        logEvent('tool.failed', {
          toolName: e.data.toolName,
          toolCallId: e.data.toolCallId,
          error: e.data.error,
        });
      });

      harnessAgent.on('ask_user.required', (e) => {
        logEvent('ask_user.required', { question: e.data.question });
        // Default auto-answer for headless/cron operation
        harnessAgent.respond?.(e.data.toolCallId as string, 'Please proceed with the optimal action.');
      });

      harnessAgent.on('permission.required', (e) => {
        logEvent('permission.required', { toolName: e.data.toolName });
        harnessAgent.resolvePermission?.(e.data.toolCallId as string, 'allow');
      });

      // 6. Run the task
      const promptToRun = customPrompt ?? agent.system_prompt ?? 'Perform scheduled monitoring and tasks.';
      const result = await harnessAgent.run(promptToRun);

      const finalSummary =
        typeof result.summary === 'string'
          ? result.summary
          : result.status === 'completed'
            ? 'Task completed successfully.'
            : `Run finished with status: ${result.status}`;

      const completedAt = new Date().toISOString();
      this.db.updateRun(runId, {
        status: result.status === 'completed' ? 'completed' : 'failed',
        summary: finalSummary,
        completed_at: completedAt,
      });

      const nextStatus = agent.cron_enabled === 1 ? 'scheduled' : 'idle';
      this.db.updateAgent(agentId, {
        status: nextStatus,
        last_run_at: completedAt,
      });

      this.ws.broadcast({
        type: 'run_completed',
        agentId,
        runId,
        data: {
          status: result.status,
          summary: finalSummary,
          completedAt,
        },
      });

      this.ws.broadcast({
        type: 'agent_status',
        agentId,
        data: { status: nextStatus, lastRunAt: completedAt },
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[AgentRunner] Run ${runId} failed:`, errorMessage);

      const completedAt = new Date().toISOString();
      this.db.updateRun(runId, {
        status: 'failed',
        error: errorMessage,
        completed_at: completedAt,
      });

      const nextStatus = agent.cron_enabled === 1 ? 'scheduled' : 'error';
      this.db.updateAgent(agentId, {
        status: nextStatus,
        last_run_at: completedAt,
      });

      this.ws.broadcast({
        type: 'run_failed',
        agentId,
        runId,
        data: {
          error: errorMessage,
          completedAt,
        },
      });

      this.ws.broadcast({
        type: 'agent_status',
        agentId,
        data: { status: nextStatus, lastRunAt: completedAt },
      });
    } finally {
      this.runningAgents.delete(agentId);
    }
  }
}
