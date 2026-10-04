import fs from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { createAgent, MemoryStore, type McpServerConfig, type Skill } from 'smoke-monkey-harness';
import { AgentDb } from './agent.db.js';
import type { AgentRecord, RunRecord } from './agent.types.js';
import { CoreWsServer } from '../core/ws.server.js';
import { CoreDatabase } from '../core/database.db.js';
import { STOCK_MCPS } from '../mcp/mcp.stock.js';
import { writeAgentManifest, manifestPrompt } from './agent.manifest.js';
import { personalityPrompt, outputStylePrompt, parseIdList } from './agent.presets.js';

export interface ActiveRunContext {
  runId: string;
  agentId: string;
  triggerType: 'cron' | 'manual';
  sessionId: string;
  harness: any;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  taskPrompt: string;
  accumulatedParts: any[];
  accumulatedText: string;
  toolMap: Map<string, any>;
  assistantMsgId?: string;
  error?: string;
}

export class AgentRunner {
  private static instance: AgentRunner | null = null;
  private db: AgentDb;
  private ws: CoreWsServer;
  private activeRuns = new Map<string, ActiveRunContext>();
  private agentStores = new Map<string, MemoryStore>();

  getOrCreateStore(agentId: string, sessionId?: string, excludeRunId?: string): MemoryStore {
    let store = this.agentStores.get(agentId);
    if (!store) {
      store = new MemoryStore();
      this.agentStores.set(agentId, store);
    }
    const actualSessionId = sessionId || `session_${agentId}_default`;
    store.ensureSession(actualSessionId, { agentId, workspacePath: '' });

    // Hydrate prior conversation turns from SQLite chat_messages table
    try {
      const messages = this.db.getSessionMessages(actualSessionId);
      const existingInStore = store.listMessages(actualSessionId);
      if (existingInStore.length === 0 && messages.length > 0) {
        for (const m of messages) {
          if (excludeRunId && m.run_id === excludeRunId) continue;
          void store.addMessage(actualSessionId, {
            role: m.role as any,
            content: m.content,
          });
        }
      }
    } catch (err) {
      console.warn(`[AgentRunner] Could not rehydrate session ${actualSessionId}:`, err);
    }

    return store;
  }

  clearAgentMemory(agentId: string, sessionId?: string): void {
    if (sessionId) {
      const store = this.agentStores.get(agentId);
      if (store) {
        try {
          // Re-create session
          store.ensureSession(sessionId, { agentId, workspacePath: '' });
        } catch {}
      }
      this.db.deleteSession(sessionId);
    } else {
      this.agentStores.delete(agentId);
    }
  }

  constructor(db?: AgentDb, ws?: CoreWsServer) {
    this.db = db ?? new AgentDb();
    this.ws = ws ?? CoreWsServer.getInstance();
    this.cleanupStaleState();
  }

  private cleanupStaleState(): void {
    try {
      const agents = this.db.getAllAgents();
      for (const agent of agents) {
        if (agent.status === 'running') {
          const nextStatus = agent.cron_enabled === 1 ? 'scheduled' : 'idle';
          this.db.updateAgent(agent.id, { status: nextStatus });
        }
      }
    } catch (err) {
      console.warn('[AgentRunner] Error cleaning up stale agent states:', err);
    }
  }

  static getInstance(): AgentRunner {
    if (!AgentRunner.instance) {
      AgentRunner.instance = new AgentRunner();
    }
    return AgentRunner.instance;
  }

  isAgentRunning(agentId: string): boolean {
    for (const run of this.activeRuns.values()) {
      if (run.agentId === agentId && run.status === 'running') {
        return true;
      }
    }
    return false;
  }

  getActiveRuns(agentId?: string): Array<{
    runId: string;
    agentId: string;
    triggerType: 'cron' | 'manual';
    sessionId: string;
    status: string;
    startedAt: string;
    taskPrompt: string;
    accumulatedText: string;
    partsCount: number;
  }> {
    const result = [];
    for (const run of this.activeRuns.values()) {
      if (!agentId || run.agentId === agentId) {
        result.push({
          runId: run.runId,
          agentId: run.agentId,
          triggerType: run.triggerType,
          sessionId: run.sessionId,
          status: run.status,
          startedAt: run.startedAt,
          taskPrompt: run.taskPrompt,
          accumulatedText: run.accumulatedText,
          partsCount: run.accumulatedParts.length,
        });
      }
    }
    return result;
  }

  getActiveRun(runId: string): ActiveRunContext | undefined {
    return this.activeRuns.get(runId);
  }

  getActiveRunForSession(sessionId: string): ActiveRunContext | undefined {
    for (const run of this.activeRuns.values()) {
      if (run.sessionId === sessionId && run.status === 'running') {
        return run;
      }
    }
    return undefined;
  }

  stopRun(runId: string): boolean {
    const active = this.activeRuns.get(runId);
    if (!active) return false;

    try {
      if (active.harness && typeof active.harness.abort === 'function') {
        active.harness.abort();
      }
    } catch (err) {
      console.warn(`[AgentRunner] Error aborting run ${runId}:`, err);
    }

    const now = new Date().toISOString();
    this.db.updateRun(runId, {
      status: 'failed',
      error: 'Execution cancelled by user',
      summary: active.accumulatedText || 'Run manually stopped by user.',
      completed_at: now,
    });

    if (active.assistantMsgId) {
      const cancelContent = active.accumulatedText
        ? `${active.accumulatedText}\n\n*[Execution stopped by user]*`
        : 'Execution stopped by user.';
      this.db.updateChatMessage(active.assistantMsgId, {
        content: cancelContent,
        parts_json: JSON.stringify(active.accumulatedParts),
      });
    }

    const cancelEvent = {
      type: 'error',
      messageId: active.assistantMsgId || runId,
      conversationId: active.sessionId,
      error: {
        code: 'cancelled',
        layer: 'run',
        severity: 'error',
        message: 'Execution cancelled by user',
        retryable: false,
      },
    };
    this.ws.broadcast({
      type: 'chat_stream_event',
      agentId: active.agentId,
      runId,
      sessionId: active.sessionId,
      triggerType: active.triggerType,
      event: cancelEvent,
      streamEvent: cancelEvent,
    });

    this.ws.broadcast({
      type: 'run_failed',
      agentId: active.agentId,
      runId,
      sessionId: active.sessionId,
      triggerType: active.triggerType,
      data: { error: 'Execution cancelled by user', completedAt: now },
    });

    this.activeRuns.delete(runId);

    const stillRunning = this.isAgentRunning(active.agentId);
    const agent = this.db.getAgent(active.agentId);
    const nextStatus = stillRunning ? 'running' : (agent && agent.cron_enabled === 1 ? 'scheduled' : 'idle');
    this.db.updateAgent(active.agentId, { status: nextStatus });

    this.ws.broadcast({
      type: 'agent_status',
      agentId: active.agentId,
      data: { status: nextStatus, message: 'Run stopped by user' },
    });

    return true;
  }

  stopAgent(agentId: string): boolean {
    let stoppedAny = false;
    for (const [runId, active] of this.activeRuns.entries()) {
      if (active.agentId === agentId) {
        this.stopRun(runId);
        stoppedAny = true;
      }
    }

    const agent = this.db.getAgent(agentId);
    const nextStatus = agent && agent.cron_enabled === 1 ? 'scheduled' : 'idle';
    this.db.updateAgent(agentId, { status: nextStatus });

    this.ws.broadcast({
      type: 'agent_status',
      agentId,
      data: { status: nextStatus, message: 'Agent stopped by user' },
    });

    return stoppedAny;
  }

  async runAgent(
    agentId: string,
    triggerType: 'cron' | 'manual' = 'manual',
    customPrompt?: string,
    sessionId?: string,
    msgIds?: { userMsgId?: string; assistantMsgId?: string },
  ): Promise<RunRecord> {
    const agent = this.db.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found in database.`);
    }

    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const isCron = triggerType === 'cron';
    const actualSessionId = isCron
      ? `cron_${runId}`
      : (sessionId || `session_${agentId}_default`);

    // Concurrency check:
    // Cron runs and normal chats can run concurrently!
    if (isCron) {
      const activeCron = Array.from(this.activeRuns.values()).find(
        (r) => r.agentId === agentId && r.triggerType === 'cron' && r.status === 'running'
      );
      if (activeCron) {
        console.warn(`[AgentRunner] Cron run already executing for ${agent.name} (${activeCron.runId}). Skipping duplicate tick.`);
        const existingRun = this.db.getRun(activeCron.runId);
        if (existingRun) return existingRun;
      }
    } else {
      // Normal chat: check if THIS specific session is currently processing a run
      const activeSessionRun = Array.from(this.activeRuns.values()).find(
        (r) => r.sessionId === actualSessionId && r.status === 'running'
      );
      if (activeSessionRun) {
        throw new Error(`Agent is currently processing a message in this conversation. Please wait for completion.`);
      }
    }

    this.db.updateAgent(agentId, { status: 'running' });
    this.ws.broadcast({
      type: 'agent_status',
      agentId,
      data: { status: 'running', runId, sessionId: actualSessionId, triggerType },
    });

    let assistantMsgId: string | null = null;

    // For manual user chats, ensure session exists and persist user message + assistant placeholder immediately
    if (!isCron) {
      const promptTitle = customPrompt
        ? (customPrompt.slice(0, 40) + (customPrompt.length > 40 ? '...' : ''))
        : 'General Discussion';
      this.db.getOrCreateSession(agentId, actualSessionId, promptTitle);

      const resolvedUserMsgId = msgIds?.userMsgId || `msg_user_${runId}`;
      if (customPrompt) {
        this.db.addChatMessage({
          id: resolvedUserMsgId,
          session_id: actualSessionId,
          agent_id: agentId,
          role: 'user',
          content: customPrompt,
          parts_json: JSON.stringify([{ type: 'text', content: customPrompt }]),
          run_id: runId,
        });
      }

      // Pre-create the assistant message in SQLite so reconnecting immediately sees it
      assistantMsgId = msgIds?.assistantMsgId || `msg_asst_${runId}`;
      this.db.addChatMessage({
        id: assistantMsgId,
        session_id: actualSessionId,
        agent_id: agentId,
        role: 'assistant',
        content: '',
        parts_json: '[]',
        run_id: runId,
      });
    }

    const run = this.db.createRun({
      id: runId,
      agent_id: agentId,
      trigger_type: triggerType,
      status: 'running',
      task_prompt: customPrompt ?? agent.system_prompt,
      summary: null,
      error: null,
      completed_at: null,
      session_id: actualSessionId,
    });

    const runContext: ActiveRunContext = {
      runId,
      agentId,
      triggerType,
      sessionId: actualSessionId,
      harness: null,
      status: 'running',
      startedAt: new Date().toISOString(),
      taskPrompt: customPrompt ?? agent.system_prompt ?? '',
      accumulatedParts: [],
      accumulatedText: '',
      toolMap: new Map(),
      assistantMsgId: assistantMsgId ?? undefined,
    };
    this.activeRuns.set(runId, runContext);

    this.ws.broadcast({
      type: 'run_started',
      agentId,
      runId,
      sessionId: actualSessionId,
      triggerType,
      data: { run },
    });

    // Broadcast message:start so the chat panel initializes live stream mode immediately
    const startEvent = {
      type: 'message:start',
      messageId: assistantMsgId || runId,
      conversationId: actualSessionId,
      model: agent.model,
    };
    this.ws.broadcast({
      type: 'chat_stream_event',
      agentId,
      runId,
      sessionId: actualSessionId,
      triggerType,
      event: startEvent,
      streamEvent: startEvent,
    });

    this.execute(agent, run, runContext, customPrompt, actualSessionId).catch((err) => {
      console.error(`[AgentRunner] Execution error for agent ${agentId}:`, err);
    });

    return run;
  }

  private async execute(
    agent: AgentRecord,
    run: RunRecord,
    runContext: ActiveRunContext,
    customPrompt?: string,
    targetSessionId?: string,
  ): Promise<void> {
    const agentId = agent.id;
    const runId = run.id;
    const isCron = run.trigger_type === 'cron';
    const sessionId = targetSessionId || (isCron ? `cron_${runId}` : `session_${agentId}_default`);
    const store = this.getOrCreateStore(agentId, sessionId, runId);

    try {
      // 1. Gather configured MCP servers
      const mcpRecords = this.db.getAgentMcps(agentId).filter((m) => m.enabled === 1);
      const mcpConfigs: McpServerConfig[] = [];
      // Parallel to mcpConfigs. A record with no stock match and neither
      // `command` nor `url` contributes no config, so index pairing against
      // mcpRecords would drift and attach the wrong attachment id.
      const mcpConfigRecords: typeof mcpRecords = [];

      for (const m of mcpRecords) {
        let config: Record<string, unknown> = {};
        try {
          config = JSON.parse(m.config_json);
        } catch {
          config = {};
        }

        const stock = STOCK_MCPS.find((s) => s.name === m.mcp_name);
        const env: Record<string, string> = {};
        for (const [k, v] of Object.entries(process.env)) {
          if (v !== undefined) env[k] = v;
        }
        if (config.env && typeof config.env === 'object') {
          for (const [k, v] of Object.entries(config.env as Record<string, unknown>)) {
            if (v !== undefined && v !== null) env[k] = String(v);
          }
        }

        // Inject stock API keys if available in settings
        const coreDb = CoreDatabase.getInstance();
        if (m.mcp_name === 'firecrawl-mcp' && !env.FIRECRAWL_API_KEY) {
          const k = coreDb.getSetting('FIRECRAWL_API_KEY');
          if (k) env.FIRECRAWL_API_KEY = k;
        }
        if (m.mcp_name === 'tavily-mcp' && !env.TAVILY_API_KEY) {
          const k = coreDb.getSetting('TAVILY_API_KEY');
          if (k) env.TAVILY_API_KEY = k;
        }
        if (m.mcp_name === 'github-mcp-server' && !env.GITHUB_TOKEN) {
          const k = coreDb.getSetting('GITHUB_TOKEN');
          if (k) env.GITHUB_TOKEN = k;
        }

        const serverId = m.mcp_name.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
        const serverDesc = stock?.description ?? m.label ?? m.mcp_name;

        if (stock) {
          mcpConfigs.push({
            id: serverId,
            name: m.mcp_name,
            description: serverDesc,
            command: (config.command as string) ?? stock.command ?? 'npx',
            args: (config.args as string[]) ?? stock.args ?? ['-y', stock.name],
            env,
          });
          mcpConfigRecords.push(m);
        } else if (config.command) {
          mcpConfigs.push({
            id: serverId,
            name: m.mcp_name,
            description: serverDesc,
            command: config.command as string,
            args: (config.args as string[]) ?? [],
            env,
          });
          mcpConfigRecords.push(m);
        } else if (config.url) {
          mcpConfigs.push({
            id: serverId,
            name: m.mcp_name,
            description: serverDesc,
            url: config.url as string,
          });
          mcpConfigRecords.push(m);
        }
      }

      // 2. Gather attached skills
      const skillRecords = this.db.getAgentSkills(agentId).filter((s) => s.enabled === 1);
      const skills: Skill[] = skillRecords.map((s) => ({
        id: s.skill_name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: s.skill_name,
        description: s.description ?? s.skill_name,
        content: s.content,
        path: '',
        dir: process.cwd(),
      }));

      // 3. Provider and API key resolution
      const coreDb = CoreDatabase.getInstance();
      const provider = agent.provider || 'nvidia';
      const keyMap: Record<string, string> = {
        nvidia: 'NVIDIA_API_KEY',
        openai: 'OPENAI_API_KEY',
        anthropic: 'ANTHROPIC_API_KEY',
        gemini: 'GEMINI_API_KEY',
        openrouter: 'OPENROUTER_API_KEY',
        groq: 'GROQ_API_KEY',
        xai: 'XAI_API_KEY',
        deepseek: 'DEEPSEEK_API_KEY',
        qwen: 'DASHSCOPE_API_KEY',
        mistral: 'MISTRAL_API_KEY',
        together: 'TOGETHER_API_KEY',
        cerebras: 'CEREBRAS_API_KEY',
        cohere: 'COHERE_API_KEY',
        fireworks: 'FIREWORKS_API_KEY',
        omniroute: 'OMNIROUTE_API_KEY',
      };
      const keyName = keyMap[provider] || `${provider.toUpperCase()}_API_KEY`;
      let apiKey = coreDb.getSetting(keyName) || process.env[keyName];
      if (!apiKey && provider === 'qwen') {
        apiKey = coreDb.getSetting('QWEN_API_KEY') || process.env.QWEN_API_KEY;
      }
      if (!apiKey && provider === 'omniroute') {
        apiKey = 'omniroute';
      }
      if (!apiKey && provider === 'nvidia') {
        apiKey = coreDb.getSetting('NVIDIA_API_KEY') || process.env.NVIDIA_API_KEY;
      }

      // Safe model fallback if user had the retired llama-3.3-70b-instruct
      let resolvedModel = agent.model;
      if (!resolvedModel || resolvedModel === 'meta/llama-3.3-70b-instruct') {
        resolvedModel = 'nvidia/nemotron-3-super-120b-a12b';
      }

      // 4. Gather policies and disabled tools
      let policyList: string[] = [];
      try {
        if (agent.policies) {
          policyList = JSON.parse(agent.policies);
        }
      } catch {
        if (agent.policies) policyList = [agent.policies];
      }

      let policyGuidance = '';
      if (policyList.length > 0) {
        policyGuidance = `## STRICT AGENT POLICIES & BOUNDARY CONSTRAINTS:\nYou MUST follow these operational boundaries at all times:\n${policyList.map((p, i) => `${i + 1}. ${p}`).join('\n')}`;
      }

      let disabledTools: string[] = [];
      try {
        if (agent.disabled_tools) {
          disabledTools = JSON.parse(agent.disabled_tools);
        }
      } catch {
        disabledTools = [];
      }

      // 5. Resolve designated working directory & resource envelope
      let resolvedWorkspace = agent.working_dir ? agent.working_dir.trim() : '';
      if (!resolvedWorkspace) {
        const safeName = agent.name.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'agent';
        resolvedWorkspace = join(homedir(), '.smoke-agents', `${safeName}-${agent.id}`);
      }
      try {
        fs.mkdirSync(resolvedWorkspace, { recursive: true });
      } catch (e) {
        console.warn(`[agent.runner] Failed to ensure workspace directory ${resolvedWorkspace}:`, e);
      }

      const memoryLimitMb = agent.max_memory_mb || 1024;

      // Refresh this agent's MCP/skill manifests so the paths injected into the
      // system prompt below always describe the current attachments.
      const manifest = writeAgentManifest({
        agentId,
        agentName: agent.name,
        workspace: resolvedWorkspace,
        mcpEntries: mcpConfigs.map((c, i) => {
          const record = mcpConfigRecords[i];
          // Only surface env the user actually authored. The runner merges the
          // whole process env at spawn time; writing that to disk would leak
          // every secret in the environment into a plaintext file.
          let authoredEnv: Record<string, string> | undefined;
          try {
            const parsed = JSON.parse(record?.config_json ?? '{}') as { env?: Record<string, unknown> };
            if (parsed.env && typeof parsed.env === 'object') {
              authoredEnv = Object.fromEntries(
                Object.keys(parsed.env).map((k) => [k, `\$${k}`]),
              );
            }
          } catch {
            authoredEnv = undefined;
          }
          return {
            key: c.id,
            name: c.name,
            description: c.description ?? null,
            command: c.command,
            args: c.args,
            env: authoredEnv,
            stock: STOCK_MCPS.some((s) => s.name === c.name),
            enabled: true,
            source: 'canvas' as const,
            attachment_id: record?.id,
          };
        }),
        skillEntries: skillRecords.map((s) => ({
          name: s.skill_name,
          description: s.description ?? s.skill_name,
          content: s.content,
          enabled: true,
          source: 'canvas' as const,
          attachment_id: s.id,
        })),
      });

      const resourceConstraints = [
        `## RESOURCE ENVELOPE & RUNTIME CONSTRAINTS:`,
        `- Designated Working Directory: "${resolvedWorkspace}"`,
        `- Maximum RAM Allocation Limit: ${memoryLimitMb} MB`,
        `- Device Profile: ${memoryLimitMb <= 512 ? 'Mobile / Resource-Constrained Embedded Edge' : 'Standard / High-Performance Workstation'}`,
        `- Always keep memory usage minimal, free unused data buffers, stream large files instead of loading into memory, and keep all output assets inside the designated working directory.`,
      ].join('\n');

      const combinedSubPrompts: string[] = [];
      if (policyGuidance) combinedSubPrompts.push(policyGuidance);
      if (disabledTools.length > 0) {
        combinedSubPrompts.push(`## DISABLED TOOLS:\nYou MUST NOT call the following tools under any circumstances: ${disabledTools.join(', ')}`);
      }
      combinedSubPrompts.push(resourceConstraints);
      // Voice and formatting are explicit choices the user made on the agent, so
      // they go in ahead of the toolbox instructions but behind hard policies.
      const voice = personalityPrompt(parseIdList(agent.personalities));
      if (voice) combinedSubPrompts.push(voice);
      const format = outputStylePrompt(parseIdList(agent.output_styles));
      if (format) combinedSubPrompts.push(format);
      // Always last so the add-a-plugin instructions sit closest to the task.
      combinedSubPrompts.push(manifestPrompt(manifest, agentId));

      // 6. Instantiate harness agent with stable session and store
      const harnessAgent = createAgent({
        provider,
        model: resolvedModel,
        apiKey,
        workspacePath: resolvedWorkspace,
        systemPrompt: agent.system_prompt,
        subSystemPrompt: combinedSubPrompts.length > 0 ? combinedSubPrompts : undefined,
        autoApprove: true,
        permission: disabledTools.length > 0
          ? (req) => (disabledTools.includes(req.toolName) ? 'deny' : 'allow')
          : 'allow-all',
        mcp: mcpConfigs.length > 0 ? mcpConfigs : undefined,
        skills: skills.length > 0 ? skills : undefined,
        sessionId,
        store,
      });

      runContext.harness = harnessAgent;

      // 7. Wire live harness events
      const broadcastAndLog = (eventType: string, payload: unknown, chatEvent?: Record<string, unknown>) => {
        const payloadJson = JSON.stringify(payload);
        this.db.addRunEvent({
          run_id: runId,
          agent_id: agentId,
          event_type: eventType,
          payload_json: payloadJson,
        });

        const ts = new Date().toISOString();

        // Update in-memory accumulating parts and text
        if (eventType === 'text.thought') {
          const delta = String((payload as any)?.delta ?? '');
          if (delta) {
            const last = runContext.accumulatedParts[runContext.accumulatedParts.length - 1];
            if (last && last.type === 'thinking') {
              last.content += delta;
            } else {
              runContext.accumulatedParts.push({ type: 'thinking', content: delta });
            }
          }
        } else if (eventType === 'tool.started') {
          const p = payload as any;
          const toolId = String(p.toolCallId || `tc_${runContext.accumulatedParts.length}`);
          const toolCall = {
            id: toolId,
            name: String(p.toolName || 'tool'),
            status: 'running',
            input: p.args,
            startedAt: ts,
          };
          runContext.toolMap.set(toolId, toolCall);
          runContext.accumulatedParts.push({ type: 'tool', toolCall });
        } else if (eventType === 'tool.completed') {
          const p = payload as any;
          const toolId = String(p.toolCallId || '');
          let toolCall = runContext.toolMap.get(toolId);
          if (!toolCall) {
            toolCall = {
              id: toolId,
              name: String(p.toolName || 'tool'),
              status: 'success',
              input: p.args,
              output: p.result,
              completedAt: ts,
            };
            runContext.toolMap.set(toolId, toolCall);
            runContext.accumulatedParts.push({ type: 'tool', toolCall });
          } else {
            toolCall.status = 'success';
            toolCall.output = p.result;
            toolCall.completedAt = ts;
          }
        } else if (eventType === 'tool.failed') {
          const p = payload as any;
          const toolId = String(p.toolCallId || '');
          let toolCall = runContext.toolMap.get(toolId);
          if (!toolCall) {
            toolCall = {
              id: toolId,
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
              completedAt: ts,
            };
            runContext.toolMap.set(toolId, toolCall);
            runContext.accumulatedParts.push({ type: 'tool', toolCall });
          } else {
            toolCall.status = 'error';
            toolCall.error = {
              code: 'tool_failed',
              layer: 'tool',
              severity: 'error',
              message: String(p.error || 'Execution failed'),
              retryable: false,
            };
            toolCall.completedAt = ts;
          }
        } else if (eventType === 'text.delta') {
          const delta = String((payload as any)?.delta ?? '');
          if (delta) {
            runContext.accumulatedText += delta;
            const last = runContext.accumulatedParts[runContext.accumulatedParts.length - 1];
            if (last && last.type === 'markdown') {
              last.content += delta;
            } else {
              runContext.accumulatedParts.push({ type: 'markdown', content: delta });
            }
          }
        }

        // Live persist to SQLite chat_messages so refreshes never lose progress
        if (
          runContext.assistantMsgId &&
          (eventType.startsWith('tool.') ||
            eventType === 'step.started' ||
            (eventType === 'text.delta' && runContext.accumulatedText.length % 60 < 10))
        ) {
          this.db.updateChatMessage(runContext.assistantMsgId, {
            content: runContext.accumulatedText,
            parts_json: JSON.stringify(runContext.accumulatedParts),
          });
        }

        this.ws.broadcast({
          type: 'run_event',
          agentId,
          runId,
          sessionId,
          triggerType: run.trigger_type,
          data: {
            eventType,
            payload,
            timestamp: ts,
          },
        });

        if (chatEvent) {
          const fullEvent = {
            ...chatEvent,
            messageId: runContext.assistantMsgId || runId,
            conversationId: sessionId,
          };
          this.ws.broadcast({
            type: 'chat_stream_event',
            agentId,
            runId,
            sessionId,
            triggerType: run.trigger_type,
            event: fullEvent,
            streamEvent: fullEvent,
          });
        }
      };

      harnessAgent.on('text.delta', (e) =>
        broadcastAndLog('text.delta', { delta: e.data.delta }, { type: 'text:delta', delta: e.data.delta }),
      );
      harnessAgent.on('text.thought', (e) =>
        broadcastAndLog('text.thought', { delta: e.data.delta }, { type: 'reasoning:delta', delta: e.data.delta }),
      );
      harnessAgent.on('step.started', (e) =>
        broadcastAndLog('step.started', { step: e.data.step }, { type: 'agent:step', stepId: String(e.data.step), title: `Step ${e.data.step}`, status: 'running' }),
      );
      harnessAgent.on('tool.started', (e) =>
        broadcastAndLog(
          'tool.started',
          {
            toolName: e.data.toolName,
            toolCallId: e.data.toolCallId,
            args: e.data.args,
          },
          {
            type: 'tool:start',
            toolCallId: e.data.toolCallId,
            toolName: e.data.toolName,
            input: e.data.args,
            args: e.data.args,
          },
        ),
      );
      harnessAgent.on('tool.completed', (e) =>
        broadcastAndLog(
          'tool.completed',
          {
            toolName: e.data.toolName,
            toolCallId: e.data.toolCallId,
            result: e.data.result,
          },
          {
            type: 'tool:result',
            toolCallId: e.data.toolCallId,
            result: e.data.result,
          },
        ),
      );
      harnessAgent.on('tool.failed', (e) =>
        broadcastAndLog(
          'tool.failed',
          {
            toolName: e.data.toolName,
            toolCallId: e.data.toolCallId,
            error: e.data.error,
          },
          {
            type: 'tool:error',
            toolCallId: e.data.toolCallId,
            error: { message: String(e.data.error || 'Tool failed') },
          },
        ),
      );
      harnessAgent.on('ask_user.required', (e) => {
        broadcastAndLog('ask_user.required', { question: e.data.question }, { type: 'prompt:ask', question: e.data.question });
        harnessAgent.respond?.(e.data.toolCallId as string, 'Proceed with the optimal resolution.');
      });
      harnessAgent.on('permission.required', (e) => {
        broadcastAndLog('permission.required', { toolName: e.data.toolName });
        harnessAgent.resolvePermission?.(e.data.toolCallId as string, 'allow');
      });

      // 8. Announce execution environment & run task
      broadcastAndLog('agent.envelope', {
        workingDir: resolvedWorkspace,
        maxMemoryMb: memoryLimitMb,
      });

      const promptToRun = customPrompt ?? agent.system_prompt ?? 'Execute assigned background operations.';
      const result = await harnessAgent.run(promptToRun, {
        sessionId,
        runId,
      });

      const resObj = result as unknown as { summary?: string; status?: string };
      const finalSummary =
        typeof resObj.summary === 'string'
          ? resObj.summary
          : result.status === 'completed'
            ? 'Task completed successfully.'
            : `Execution ended with status: ${result.status}`;

      // Extract the actual assistant reply text from the harness messages
      const assistantMessages = result.messages.filter((m) => m.role === 'assistant');
      const lastAssistantText = assistantMessages.length > 0
        ? assistantMessages[assistantMessages.length - 1].content
        : finalSummary;

      const finalText = runContext.accumulatedText.trim() || lastAssistantText || finalSummary;

      // Ensure markdown part exists in accumulatedParts if text wasn't in deltas
      if (finalText && !runContext.accumulatedParts.some((p) => p.type === 'markdown')) {
        runContext.accumulatedParts.push({ type: 'markdown', content: finalText });
      }

      const completedAt = new Date().toISOString();
      this.db.updateRun(runId, {
        status: result.status === 'completed' ? 'completed' : 'failed',
        summary: finalText,
        completed_at: completedAt,
      });

      // Update SQLite chat_messages with complete final parts and text
      if (runContext.assistantMsgId) {
        this.db.updateChatMessage(runContext.assistantMsgId, {
          content: finalText,
          parts_json: JSON.stringify(runContext.accumulatedParts),
        });
      }

      // If finalText exists and was not already streamed in accumulatedText, emit text:delta so client sees it
      if (finalText && !runContext.accumulatedText) {
        const textEvt = {
          type: 'text:delta',
          delta: finalText,
          messageId: runContext.assistantMsgId || runId,
          conversationId: sessionId,
        };
        this.ws.broadcast({
          type: 'chat_stream_event',
          agentId,
          runId,
          sessionId,
          triggerType: run.trigger_type,
          event: textEvt,
          streamEvent: textEvt,
        });
      }

      const completeEvt = {
        type: 'message:complete',
        messageId: runContext.assistantMsgId || runId,
        conversationId: sessionId,
      };
      this.ws.broadcast({
        type: 'chat_stream_event',
        agentId,
        runId,
        sessionId,
        triggerType: run.trigger_type,
        event: completeEvt,
        streamEvent: completeEvt,
      });

      this.ws.broadcast({
        type: 'run_completed',
        agentId,
        runId,
        sessionId,
        triggerType: run.trigger_type,
        data: {
          status: result.status,
          summary: finalText,
          completedAt,
        },
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[AgentRunner] Execution failed for run ${runId}:`, errorMessage);

      const completedAt = new Date().toISOString();
      this.db.updateRun(runId, {
        status: 'failed',
        error: errorMessage,
        completed_at: completedAt,
      });

      const failText = runContext.accumulatedText
        ? `${runContext.accumulatedText}\n\n**Execution Error**: ${errorMessage}`
        : `Execution failed: ${errorMessage}`;

      if (runContext.assistantMsgId) {
        runContext.accumulatedParts.push({
          type: 'markdown',
          content: `\n\n**Execution Error**: ${errorMessage}`,
        });
        this.db.updateChatMessage(runContext.assistantMsgId, {
          content: failText,
          parts_json: JSON.stringify(runContext.accumulatedParts),
        });
      }

      const errEvent = {
        type: 'error',
        messageId: runContext.assistantMsgId || runId,
        conversationId: sessionId,
        error: {
          code: 'execution_failed',
          layer: 'agent',
          severity: 'error',
          message: errorMessage,
          retryable: false,
        },
      };
      this.ws.broadcast({
        type: 'chat_stream_event',
        agentId,
        runId,
        sessionId,
        triggerType: run.trigger_type,
        event: errEvent,
        streamEvent: errEvent,
      });

      this.ws.broadcast({
        type: 'run_failed',
        agentId,
        runId,
        sessionId,
        triggerType: run.trigger_type,
        data: { error: errorMessage, completedAt },
      });
    } finally {
      this.activeRuns.delete(runId);
      const stillRunning = this.isAgentRunning(agentId);
      const nextStatus = stillRunning ? 'running' : (agent.cron_enabled === 1 ? 'scheduled' : 'idle');
      const completedAt = new Date().toISOString();
      this.db.updateAgent(agentId, {
        status: nextStatus,
        last_run_at: completedAt,
      });

      this.ws.broadcast({
        type: 'agent_status',
        agentId,
        data: { status: nextStatus, lastRunAt: completedAt },
      });
    }
  }
}

