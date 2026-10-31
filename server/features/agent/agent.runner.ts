import fs from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { createAgent, MemoryStore, type McpServerConfig, type Skill } from 'smoke-monkey-harness';
import { AgentDb } from './agent.db.js';
import type { AgentRecord, RunRecord } from './agent.types.js';
import { CoreWsServer } from '../core/ws.server.js';
import { CoreDatabase } from '../core/database.db.js';
import { STOCK_MCPS } from '../mcp/mcp.stock.js';
import { getAccessToken } from '../mcp/mcp.oauth.js';
import {
  writeAgentManifest,
  writeCommonAgentRegistry,
  writeAgentRunState,
  readAgentPolicyManifest,
  reconcileManifestRemovals,
  reconcileAgentWorkspaceRuntime,
  buildAgentWorkspace,
  COMMON_DIR,
  SMOKE_AGENTS_ROOT,
  type SharedMcpInfo,
  type SharedEnvVar,
  type CommonRegistryPaths,
} from './agent.manifest.js';
import { buildSubPrompts, mergeEffectivePolicies, resolveAgentWorkspace } from './agent.prompt.js';
import { parsePolicies } from './agent.types.js';
import { detectGitRepository, ensureRepoMemory } from './agent.repo-memory.js';
import { CUSTOM_AGENT_TOOLS } from './agent.custom-tools.js';
import { checkAgentConfigStatus } from './agent.config-check.js';
import { SpaceDb } from '../space/space.db.js';
import { buildAgentTeamWorkflowBlock } from '../space/space.workflow.js';
import { recordAgentTodoUpdate } from './agent.todos.js';

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
  cronJobId?: string;
  cronJobName?: string;
  cronSuccessReported?: boolean;
  cronSuccessSummary?: string;
  retryCount?: number;
}

export interface ActiveDelegationRecord {
  id: string;
  sourceAgentId: string;
  targetAgentId: string;
  taskTitle?: string;
  sessionId?: string;
  startedAt: string;
}

export class AgentRunner {
  private static instance: AgentRunner | null = null;
  private db: AgentDb;
  private ws: CoreWsServer;
  private activeRuns = new Map<string, ActiveRunContext>();
  private activeDelegations = new Map<string, ActiveDelegationRecord>();
  private agentStores = new Map<string, MemoryStore>();
  private runWaiters = new Map<string, Array<(run: RunRecord) => void>>();
  private lastActiveRunsBroadcast = 0;

  getDb(): AgentDb {
    return this.db;
  }

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
      } else if (messages.length > existingInStore.length) {
        const toAdd = messages.slice(existingInStore.length);
        for (const m of toAdd) {
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

  registerActiveDelegation(
    sourceAgentId: string,
    targetAgentId: string,
    taskTitle?: string,
    sessionId?: string,
  ): string {
    const id = `del_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.activeDelegations.set(id, {
      id,
      sourceAgentId,
      targetAgentId,
      taskTitle,
      sessionId,
      startedAt: new Date().toISOString(),
    });
    this.broadcastActiveDelegations();
    return id;
  }

  unregisterActiveDelegation(id: string): void {
    if (this.activeDelegations.delete(id)) {
      this.broadcastActiveDelegations();
    }
  }

  getActiveDelegations(): ActiveDelegationRecord[] {
    const now = Date.now();
    for (const [id, del] of this.activeDelegations.entries()) {
      const ageMs = now - new Date(del.startedAt).getTime();
      if (ageMs > 15000) {
        const hasTargetActive = this.getActiveRuns(del.targetAgentId).length > 0;
        const hasSourceActive = this.getActiveRuns(del.sourceAgentId).length > 0;
        if (!hasTargetActive && !hasSourceActive) {
          this.activeDelegations.delete(id);
        }
      }
    }
    return Array.from(this.activeDelegations.values());
  }

  private broadcastActiveDelegations(): void {
    try {
      this.ws.broadcast({
        type: 'delegations_active',
        data: this.getActiveDelegations(),
      });
    } catch {}
  }

  private broadcastActiveRuns(force = true): void {
    const now = Date.now();
    if (!force && now - this.lastActiveRunsBroadcast < 1000) return;
    this.lastActiveRunsBroadcast = now;
    try {
      this.ws.broadcast({
        type: 'active_runs_active',
        data: this.getActiveRuns(),
      });
    } catch {}
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
    this.broadcastActiveRuns();

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

  hasCronSuccess(runContext: ActiveRunContext): boolean {
    if (runContext.cronSuccessReported) return true;
    for (const [, tc] of runContext.toolMap.entries()) {
      if (tc.name === 'mark_cron_job_success' && tc.status === 'success') {
        return true;
      }
    }
    return false;
  }

  async runAgent(
    agentId: string,
    triggerType: 'cron' | 'manual' = 'manual',
    customPrompt?: string,
    sessionId?: string,
    msgIds?: { userMsgId?: string; assistantMsgId?: string },
    cronJobInfo?: { jobId?: string; jobName?: string },
  ): Promise<RunRecord> {
    const agent = this.db.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found in database.`);
    }

    // Honor attachments the agent removed from its own manifest files before
    // the DB reads below — the manifest rewrite later in this run must not
    // resurrect entries the agent deliberately deleted.
    reconcileManifestRemovals({
      ws: buildAgentWorkspace(resolveAgentWorkspace(agent)),
      skills: this.db.getAgentSkills(agentId),
      mcps: this.db.getAgentMcps(agentId),
      removeSkill: (rowId) => this.db.deleteAgentSkill(rowId),
      removeMcp: (rowId) => this.db.deleteAgentMcp(rowId),
    });

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
      // Normal chat: check if THIS specific agent is currently processing a run in this session
      const activeSessionRun = Array.from(this.activeRuns.values()).find(
        (r) => r.agentId === agentId && r.sessionId === actualSessionId && r.status === 'running'
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
      cronJobId: cronJobInfo?.jobId,
      cronJobName: cronJobInfo?.jobName,
      cronSuccessReported: false,
      retryCount: 0,
    };
    this.activeRuns.set(runId, runContext);
    this.broadcastActiveRuns();

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

  waitForRun(runId: string): Promise<RunRecord> {
    const existing = this.db.getRun(runId);
    if (existing && existing.status !== 'running') {
      return Promise.resolve(existing);
    }
    return new Promise<RunRecord>((resolve) => {
      const list = this.runWaiters.get(runId) || [];
      list.push(resolve);
      this.runWaiters.set(runId, list);
    });
  }

  async runAgentAndWait(
    agentId: string,
    triggerType: 'cron' | 'manual' = 'manual',
    customPrompt?: string,
    sessionId?: string,
    msgIds?: { userMsgId?: string; assistantMsgId?: string },
    cronJobInfo?: { jobId?: string; jobName?: string },
  ): Promise<RunRecord> {
    const run = await this.runAgent(agentId, triggerType, customPrompt, sessionId, msgIds, cronJobInfo);
    return this.waitForRun(run.id);
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

        // A stock entry may be remote (streamable-HTTP) rather than a local
        // stdio package. Those must be attached over `url`, never spawned via
        // `npx -y <name>` — there is no such npm package for a hosted server.
        const remoteUrl = (config.url as string) ?? stock?.url;
        const isRemote = !!remoteUrl;

        if (isRemote) {
          // Remote servers authenticate with a bearer token. Use the OAuth
          // access token when the user completed "Connect" (it refreshes
          // itself when expired); otherwise fall back to a provider token the
          // user pasted. Without a header the request is anonymous and the
          // server answers 401 even though the account is connected.
          const headers: Record<string, string> = {};
          const configuredHeaders = config.headers as Record<string, unknown> | undefined;
          if (configuredHeaders && typeof configuredHeaders === 'object') {
            for (const [k, v] of Object.entries(configuredHeaders)) {
              if (typeof v === 'string' && v) headers[k] = v;
            }
          }
          if (!headers.Authorization && !headers.authorization) {
            const token = await getAccessToken(m.mcp_name, remoteUrl!).catch(() => null);
            if (token) {
              headers.Authorization = `Bearer ${token}`;
            } else {
              const pasted = (stock?.envKeys ?? [])
                .map((k) => env[k] || coreDb.getSetting(k))
                .find(Boolean);
              if (pasted) headers.Authorization = `Bearer ${pasted}`;
            }
          }
          mcpConfigs.push({
            id: serverId,
            name: m.mcp_name,
            description: serverDesc,
            url: remoteUrl,
            headers,
          });
          mcpConfigRecords.push(m);
        } else if (stock) {
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
  google: 'GEMINI_API_KEY',
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
      if (!resolvedModel || resolvedModel === 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning' || resolvedModel === 'meta/llama-3.3-70b-instruct') {
        resolvedModel = 'nvidia/nemotron-3-super-120b-a12b';
      }

      // 4. Gather policies and disabled tools. DB policies (`canvas`/`user`) are
      // merged with any policies the agent wrote itself during earlier runs
      // (after the manifest is refreshed below) so the compiled block reflects
      // everything, including agent-added boundaries.
      const dbPolicies = parsePolicies(agent.policies);

      let disabledTools: string[] = [];
      try {
        if (agent.disabled_tools) {
          disabledTools = JSON.parse(agent.disabled_tools);
        }
      } catch {
        disabledTools = [];
      }

      // 5. Resolve designated working directory & resource envelope
      const resolvedWorkspace = resolveAgentWorkspace(agent);
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
            source: record?.source === 'user' ? 'user' : ('canvas' as const),
            attachment_id: record?.id,
          };
        }),
        skillEntries: skillRecords.map((s) => ({
          name: s.skill_name,
          description: s.description ?? s.skill_name,
          content: s.content,
          enabled: true,
          source: s.source === 'user' ? 'user' : ('canvas' as const),
          attachment_id: s.id,
        })),
        policyEntries: dbPolicies,
        systemPrompt: agent.system_prompt,
      });

      // GitHub plugin skills are installed into the agent workspace on the first
      // deployment that uses them. Stock skills stay in the bundled catalog and
      // are passed to the harness directly, so they are never copied here.
      const isGitHubPluginSkill = (s: (typeof skillRecords)[number]) =>
        s.skill_name.includes('/') ||
        (s.content.includes('## Provenance') && s.content.includes('https://github.com/'));
      for (const s of skillRecords) {
        if (!isGitHubPluginSkill(s)) continue;
        const slug = s.skill_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'plugin-skill';
        const targetDir = join(manifest.skillsDir, slug);
        const targetFile = join(targetDir, 'SKILL.md');
        if (fs.existsSync(targetFile)) continue;
        try {
          fs.mkdirSync(targetDir, { recursive: true });
          fs.writeFileSync(targetFile, s.content, 'utf8');
        } catch (err) {
          console.warn(`[agent.runner] Failed to install plugin skill ${s.skill_name}:`, err);
        }
      }

      // Shared registry every agent can read/append to (MCP servers + env names).
      const commonRoot = join(homedir(), SMOKE_AGENTS_ROOT, COMMON_DIR);
      const sharedMcps: SharedMcpInfo[] = STOCK_MCPS.map((s) => ({
        name: s.name,
        description: s.description,
        command: s.command,
        args: s.args,
        url: s.url,
        envKeys: s.envKeys,
        stock: true,
      }));

      const envByName = new Map<string, Set<string>>();
      const noteVar = (name: string, usedBy: string) => {
        if (!envByName.has(name)) envByName.set(name, new Set());
        envByName.get(name)!.add(usedBy);
      };
      for (const s of STOCK_MCPS) for (const k of s.envKeys) noteVar(k, s.name);

      for (const rec of mcpRecords) {
        let cfg: Record<string, unknown> = {};
        try {
          cfg = JSON.parse(rec.config_json);
        } catch {
          cfg = {};
        }
        const isStock = STOCK_MCPS.some((s) => s.name === rec.mcp_name);
        if (!isStock && (typeof cfg.command === 'string' || typeof cfg.url === 'string')) {
          sharedMcps.push({
            name: rec.mcp_name,
            description: rec.label ?? rec.mcp_name,
            command: typeof cfg.command === 'string' ? cfg.command : undefined,
            args: Array.isArray(cfg.args) ? (cfg.args as string[]) : undefined,
            url: typeof cfg.url === 'string' ? cfg.url : undefined,
            envKeys: Object.keys((cfg.env ?? {}) as Record<string, unknown>),
            stock: false,
          });
        }
        for (const k of Object.keys((cfg.env ?? {}) as Record<string, unknown>)) noteVar(k, rec.mcp_name);
      }
      for (const [provider, keyName] of Object.entries(keyMap)) noteVar(keyName, `${provider} provider key`);

      const sharedEnv: SharedEnvVar[] = [...envByName.entries()]
        .map(([name, usedBy]) => ({
          name,
          description: usedBy.size ? `Used by: ${[...usedBy].join(', ')}` : 'Environment variable',
          usedBy: [...usedBy],
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const common: CommonRegistryPaths = writeCommonAgentRegistry(commonRoot, sharedMcps, sharedEnv);

      // Stamp this run into the agent's runtime state + session context files.
      writeAgentRunState(manifest, {
        agentId,
        runId,
        taskPrompt: run.task_prompt,
        triggerType: run.trigger_type,
        agentName: agent.name,
      });

      // Compile the exact sub-prompt chain used for this run via the shared
      // builder — the agent-box preview renders this same output, so the two
      // can never disagree. Policies = DB (`canvas`/`user`) + agent-written
      // entries found in the freshly refreshed policies manifest.
      const effectivePolicies = mergeEffectivePolicies(
        dbPolicies,
        readAgentPolicyManifest(manifest),
      );
      const rawPeers = this.db.getConnectedPeers(agentId);
      const peerAgents = rawPeers.map((p) => {
        const configStatus = checkAgentConfigStatus(p.id, this.db);
        return {
          ...p,
          isConfigured: configStatus.isConfigured,
          unconfiguredReasons: configStatus.reasons,
        };
      });
      const teamWorkflow = buildAgentTeamWorkflowBlock(agentId, this.db, new SpaceDb());
      const combinedSubPrompts = buildSubPrompts({
        policyEntries: effectivePolicies,
        disabledTools,
        resolvedWorkspace,
        memoryLimitMb,
        personalities: agent.personalities,
        outputStyles: agent.output_styles,
        manifest,
        common,
        agentId,
        agentName: agent.name,
        peerAgents,
        teamWorkflow,
      });

      if (isCron) {
        combinedSubPrompts.push(
          `## CRON JOB EXECUTION DIRECTIVE & COMPLETION VERIFICATION:\n` +
          `You are operating in autonomous scheduled cron job mode.\n` +
          `1. You must execute all assigned scheduled tasks and verify deliverables.\n` +
          `2. CRITICAL MANDATORY REQUIREMENT: When all operations, file updates, or summaries are finished, you MUST invoke the 'mark_cron_job_success' tool with your completion summary.\n` +
          `3. Terminating without calling 'mark_cron_job_success' will cause the system to treat the task as incomplete/failed and trigger automatic retries.\n` +
          `4. If you hit an insurmountable blocker, clearly explain the reason so it can be recorded.`
        );
      }

      // 6. Instantiate harness agent with stable session and store
      // Crucial: Pass skillsDir scoped strictly to the agent's private workspace
      // so harness does NOT fallback to scanning the entire host system / home directory (which would leak 120+ global skills)
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
        skillsDir: manifest.skillsDir ? [manifest.skillsDir] : [],
        sessionId,
        store,
      });

      // Add canvas-owned custom tools on top of the built-in groups. The
      // constructor keeps all default tools; registerTool is the documented
      // dynamic path for tools the host owns (see harness.d.ts).
      for (const tool of CUSTOM_AGENT_TOOLS) {
        harnessAgent.registerTool({
          ...tool,
          execute: async (args: any, rawCtx: any) => {
            const ctx = {
              ...(rawCtx || {}),
              agentId,
              callerAgentId: agentId,
              runId,
              sessionId: (rawCtx && rawCtx.sessionId) || sessionId,
              workspacePath: (rawCtx && rawCtx.workspacePath) || resolvedWorkspace,
            };
            return tool.execute(args, ctx);
          },
        });
      }

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
            this.broadcastActiveRuns(false);
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
            presentation: e.data.presentation,
          },
          {
            type: 'tool:start',
            toolCallId: e.data.toolCallId,
            toolName: e.data.toolName,
            input: e.data.args,
            args: e.data.args,
            presentation: e.data.presentation,
          },
        ),
      );
      harnessAgent.on('tool.completed', (e) => {
        broadcastAndLog(
          'tool.completed',
          {
            toolName: e.data.toolName,
            toolCallId: e.data.toolCallId,
            result: e.data.result,
            presentation: e.data.presentation,
          },
          {
            type: 'tool:result',
            toolCallId: e.data.toolCallId,
            result: e.data.result,
            presentation: e.data.presentation,
          },
        );

        // Immediate real-time sync: detect changes made by the agent
        // (MCP unlinking, skills, automations, system_prompt.md) and sync to UI & DB
        try {
          reconcileAgentWorkspaceRuntime({
            agentId,
            ws: manifest,
            db: this.db,
            wsServer: this.ws,
          });
        } catch (err) {
          console.warn(`[AgentRunner] Live reconcile error for agent ${agentId}:`, err);
        }
      });
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
        const prompt = {
          kind: 'ask',
          toolCallId: String(e.data.toolCallId ?? ''),
          question: String(e.data.question ?? ''),
          ...(Array.isArray(e.data.options) ? { options: e.data.options } : {}),
          ...(typeof e.data.multiple === 'boolean' ? { multiple: e.data.multiple } : {}),
        };
        broadcastAndLog(
          'ask_user.required',
          { question: e.data.question },
          { type: 'prompt:ask', prompt },
        );
        harnessAgent.respond?.(e.data.toolCallId as string, 'Proceed with the optimal resolution.');
      });
      harnessAgent.on('permission.required', (e) => {
        broadcastAndLog('permission.required', { toolName: e.data.toolName });
        harnessAgent.resolvePermission?.(e.data.toolCallId as string, 'allow');
      });
      harnessAgent.on('todo.updated', (e) => {
        const rawTodos = Array.isArray(e.data.todos) ? e.data.todos : [];
        broadcastAndLog('todo.updated', { todos: rawTodos }, { type: 'todos:updated', todos: rawTodos });
        try {
          recordAgentTodoUpdate({
            agentId,
            todos: rawTodos,
            runId,
            sessionId,
            runStartedAt: run.started_at,
            workspacePath: resolvedWorkspace,
            db: this.db,
            wsServer: this.ws,
          }).catch((err) =>
            console.warn(`[agent.runner] Failed to record date-wise todo update for agent ${agentId}:`, err),
          );
        } catch (err) {
          console.warn(`[agent.runner] Error scheduling date-wise todo update for agent ${agentId}:`, err);
        }
      });
      harnessAgent.on('context.updated', (e) =>
        broadcastAndLog(
          'context.updated',
          { active: e.data.active, count: e.data.count, maxActive: e.data.maxActive },
          { type: 'context:updated', active: e.data.active, count: e.data.count, maxActive: e.data.maxActive },
        ),
      );

      // 8. Announce execution environment & run task
      broadcastAndLog('agent.envelope', {
        workingDir: resolvedWorkspace,
        maxMemoryMb: memoryLimitMb,
      });

      const promptToRun = customPrompt ?? agent.system_prompt ?? 'Execute assigned background operations.';
      let effectiveInitialPrompt = promptToRun;
      if (isCron) {
        effectiveInitialPrompt =
          `${promptToRun}\n\n` +
          `[CRITICAL INSTRUCTION - MARK COMPLETION]:\n` +
          `You are executing an autonomous scheduled cron job. When you have completed and verified all required operations and file updates, you MUST invoke the 'mark_cron_job_success' tool with a clear summary of what you accomplished. Terminating without calling 'mark_cron_job_success' is treated as incomplete/failed and will trigger automatic retries.`;
      }

      const MAX_CRON_RETRIES = 2;
      let cronAttempt = 0;
      let lastAttemptError: Error | null = null;
      let currentPrompt = effectiveInitialPrompt;
      let latestResult: any = null;

      while (true) {
        cronAttempt++;
        try {
          if (isCron && cronAttempt > 1) {
            const retryNum = cronAttempt - 1; // 1 or 2
            const retryReason = retryNum === 1
              ? `Cron job did not call 'mark_cron_job_success'. Starting retry 1 of ${MAX_CRON_RETRIES}...`
              : `Cron job still not marked as success. Starting final retry 2 of ${MAX_CRON_RETRIES}...`;

            console.log(`[AgentRunner] Agent "${agent.name}" (${agentId}) - ${retryReason}`);

            this.ws.broadcast({
              type: 'cron_run_retry',
              agentId,
              runId,
              sessionId,
              data: {
                attempt: retryNum,
                maxRetries: MAX_CRON_RETRIES,
                reason: retryReason,
              },
            });

            broadcastAndLog(
              'cron.retry',
              {
                attempt: retryNum,
                maxRetries: MAX_CRON_RETRIES,
                reason: retryReason,
              },
              {
                type: 'agent:step',
                stepId: `retry_${retryNum}`,
                title: `🔄 Cron Retry ${retryNum}/${MAX_CRON_RETRIES}`,
                status: 'running',
              },
            );
          }

          latestResult = await harnessAgent.run(currentPrompt, {
            sessionId,
            runId,
          });

          lastAttemptError = null;
        } catch (err: unknown) {
          lastAttemptError = err instanceof Error ? err : new Error(String(err));
          console.warn(`[AgentRunner] Attempt ${cronAttempt} error for agent "${agent.name}" (${agentId}):`, lastAttemptError.message);
          if (!isCron) {
            throw lastAttemptError;
          }
        }

        if (!isCron) {
          break;
        }

        // Check if mark_cron_job_success was called
        if (this.hasCronSuccess(runContext)) {
          console.log(`[AgentRunner] Cron job marked successful by agent "${agent.name}" via mark_cron_job_success tool.`);
          break;
        }

        // If retries not exhausted, prepare next retry prompt
        if (cronAttempt <= MAX_CRON_RETRIES) {
          const nextRetryNum = cronAttempt; // 1 or 2
          runContext.retryCount = nextRetryNum;
          if (nextRetryNum === 1) {
            currentPrompt =
              `[CRON RETRY ATTEMPT 1 of ${MAX_CRON_RETRIES}]:\n` +
              `Your previous execution stopped without calling the required 'mark_cron_job_success' tool. ` +
              `Because this tool was not called, the scheduled operation cannot be verified as successful. ` +
              `All previous conversation turns and workspace state are available in this session. ` +
              `Please check what tasks remain incomplete, finish all required updates, ` +
              `and then call 'mark_cron_job_success' with your summary.`;
          } else {
            currentPrompt =
              `[CRON FINAL RETRY ATTEMPT 2 of ${MAX_CRON_RETRIES}]:\n` +
              `This is your final retry attempt. The scheduled operation is still not verified because 'mark_cron_job_success' has not been called. ` +
              `Please complete any remaining operations now and invoke 'mark_cron_job_success'. ` +
              `If you are unable to complete the task due to any error, limitation, or blocker, you MUST explicitly state the failure reason and what failed in your response so it can be recorded.`;
          }
        } else {
          // Both 2 retries exhausted without calling mark_cron_job_success
          console.warn(`[AgentRunner] Cron job failed for agent "${agent.name}" (${agentId}) after ${MAX_CRON_RETRIES} retries without calling mark_cron_job_success.`);
          break;
        }
      }

      const isCronSuccess = isCron && this.hasCronSuccess(runContext);
      const isManualSuccess = !isCron && !lastAttemptError && latestResult?.status === 'completed';
      const isSuccess = isCron ? isCronSuccess : isManualSuccess;

      const resObj = (latestResult || {}) as unknown as { summary?: string; status?: string };
      const finalSummary =
        runContext.cronSuccessSummary ||
        (typeof resObj.summary === 'string'
          ? resObj.summary
          : latestResult?.status === 'completed'
            ? 'Task completed successfully.'
            : `Execution ended with status: ${latestResult?.status || 'unknown'}`);

      // Extract the actual assistant reply text from the harness messages
      const assistantMessages = (latestResult?.messages || []).filter((m: any) => m.role === 'assistant');
      const lastAssistantText = assistantMessages.length > 0
        ? assistantMessages[assistantMessages.length - 1].content
        : finalSummary;

      const finalText = runContext.cronSuccessSummary || runContext.accumulatedText.trim() || lastAssistantText || finalSummary;

      // Ensure markdown part exists in accumulatedParts if text wasn't in deltas
      if (finalText && !runContext.accumulatedParts.some((p) => p.type === 'markdown')) {
        runContext.accumulatedParts.push({ type: 'markdown', content: finalText });
      }

      const completedAt = new Date().toISOString();

      if (!isSuccess) {
        // Extract failure reason / remark
        let failureRemark = '';
        const allMsgs = store.listMessages(sessionId);
        const allAssistantMsgs = allMsgs.filter((m: any) => m.role === 'assistant');
        const lastAsst = allAssistantMsgs.length > 0 ? allAssistantMsgs[allAssistantMsgs.length - 1].content : '';

        if (lastAsst && lastAsst.trim()) {
          failureRemark = lastAsst.trim();
        } else if (runContext.accumulatedText && runContext.accumulatedText.trim()) {
          failureRemark = runContext.accumulatedText.trim();
        } else if (lastAttemptError?.message) {
          failureRemark = lastAttemptError.message;
        } else {
          failureRemark = isCron
            ? `Cron job execution stopped without calling 'mark_cron_job_success' after ${MAX_CRON_RETRIES} retries.`
            : 'Execution failed.';
        }

        this.db.updateRun(runId, {
          status: 'failed',
          summary: failureRemark,
          error: failureRemark,
          completed_at: completedAt,
        });

        if (runContext.cronJobId) {
          this.db.updateAgentCronJob(runContext.cronJobId, {
            last_status: 'failed',
            last_error: failureRemark,
          });
        }

        if (runContext.assistantMsgId) {
          runContext.accumulatedParts.push({
            type: 'markdown',
            content: `\n\n**Cron Execution Failed**: ${failureRemark}`,
          });
          this.db.updateChatMessage(runContext.assistantMsgId, {
            content: failureRemark,
            parts_json: JSON.stringify(runContext.accumulatedParts),
          });
        }

        const errEvent = {
          type: 'error',
          messageId: runContext.assistantMsgId || runId,
          conversationId: sessionId,
          error: {
            code: 'cron_failed',
            layer: 'agent',
            severity: 'error',
            message: failureRemark,
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
          data: {
            error: failureRemark,
            completedAt,
            retriesExhausted: isCron,
            retryCount: isCron ? MAX_CRON_RETRIES : 0,
          },
        });

        return;
      }

      this.db.updateRun(runId, {
        status: 'completed',
        summary: finalText,
        completed_at: completedAt,
      });

      if (runContext.cronJobId) {
        this.db.updateAgentCronJob(runContext.cronJobId, {
          last_status: 'completed',
          last_error: null,
        });
      }

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

      // Final reconciliation of the agent's workspace & shared repository memory
      try {
        reconcileAgentWorkspaceRuntime({
          agentId,
          ws: manifest,
          db: this.db,
          wsServer: this.ws,
        });

        const repoInfo = detectGitRepository(resolvedWorkspace);
        if (repoInfo) {
          ensureRepoMemory(commonRoot, repoInfo, agentId, agent.name, finalText);
        }
      } catch (err) {
        console.warn('[AgentRunner] Final workspace reconciliation error:', err);
      }

      this.ws.broadcast({
        type: 'run_completed',
        agentId,
        runId,
        sessionId,
        triggerType: run.trigger_type,
        data: {
          status: 'completed',
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

      if (runContext.cronJobId) {
        this.db.updateAgentCronJob(runContext.cronJobId, {
          last_status: 'failed',
          last_error: errorMessage,
        });
      }

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
      this.broadcastActiveRuns();
      const waiters = this.runWaiters.get(runId);
      if (waiters) {
        const finalRun = this.db.getRun(runId) || run;
        for (const resolve of waiters) {
          resolve(finalRun);
        }
        this.runWaiters.delete(runId);
      }
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

