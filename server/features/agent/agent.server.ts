import { Router, type Request, type Response } from 'express';
import fs from 'node:fs';
import path, { join } from 'node:path';
import { homedir } from 'node:os';
import { execFile } from 'node:child_process';
import {
  scanAgentWorkspaceFiles,
  safeResolveWorkspacePath,
  getFileCategory,
  getFileMimeType,
  watchAgentWorkspace,
  unwatchAgentWorkspace,
  setupAgentWorkspaceWatcher,
  initAllAgentWatchers,
} from './agent.files.js';
import { AgentDb } from './agent.db.js';
import { AgentRunner } from './agent.runner.js';
import { calculateNextCronRun, AgentCronScheduler } from './agent.cron.js';
import { ensureDefaultAgentCronJobs } from './agent.memory-compactor.js';
import { CoreDatabase } from '../core/database.db.js';
import { STOCK_MCPS } from '../mcp/mcp.stock.js';
import { computeReadiness } from '../mcp/mcp.readiness.js';
import { PRESETS_BY_KIND, parseIdList } from './agent.presets.js';
import {
  ensureAgentWorkspace,
  readAgentMcpManifest,
  readAgentSkillManifest,
  readAgentPolicyManifest,
  reconcileManifestRemovals,
  reconcileAgentWorkspaceRuntime,
  syncAgentDiskManifestFromDb,
  readAgentAutomations,
  readAgentMemorySummaries,
} from './agent.manifest.js';
import {
  buildEffectiveSystemPrompt,
  mergeEffectivePolicies,
  resolveAgentWorkspace,
  commonRegistryPaths,
} from './agent.prompt.js';
import { parsePolicies, type AgentMcpRecord, type AgentSkillRecord } from './agent.types.js';
import { SpaceDb } from '../space/space.db.js';
import { buildAgentTeamWorkflowBlock } from '../space/space.workflow.js';
import {
  detectGitRepository,
  ensureRepoMemory,
  getRepoMemorySummary,
  buildRepoMemoryPaths,
} from './agent.repo-memory.js';
import { CoreWsServer } from '../core/ws.server.js';
import {
  formatDateKey,
  resolveEffectiveTodoDate,
  inferSpecializationsFromTodos,
  inferSectionForTodo,
  redevelopAgentSpecializationsFromHistory,
} from './agent.todos.js';

const PROVIDER_KEY_MAP: Record<string, string> = {
  nvidia: 'NVIDIA_API_KEY',
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY',
  google: 'GEMINI_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  groq: 'GROQ_API_KEY',
  xai: 'XAI_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  qwen: 'DASHSCOPE_API_KEY',
  together: 'TOGETHER_API_KEY',
  cerebras: 'CEREBRAS_API_KEY',
  cohere: 'COHERE_API_KEY',
  fireworks: 'FIREWORKS_API_KEY',
};

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param ? String(param) : '';
}

function validateProviderKey(provider: string, explicitKey?: string): { valid: boolean; keyName?: string } {
  if (provider === 'omniroute' || provider === 'local' || provider === 'ollama') {
    return { valid: true };
  }
  const keyName = PROVIDER_KEY_MAP[provider] || `${provider.toUpperCase()}_API_KEY`;
  const coreDb = CoreDatabase.getInstance();
  const existingKey = coreDb.getSetting(keyName) || (provider === 'qwen' ? coreDb.getSetting('QWEN_API_KEY') : null) || process.env[keyName];
  if (explicitKey && explicitKey.trim()) {
    coreDb.setSetting(keyName, explicitKey.trim());
    return { valid: true, keyName };
  }
  if (!existingKey || !existingKey.trim()) {
    return { valid: false, keyName };
  }
  return { valid: true, keyName };
}

export function createAgentRouter(): Router {
  const router = Router();
  const db = new AgentDb();
  const runner = AgentRunner.getInstance();

  // Proactively start file watchers on all existing agents
  initAllAgentWatchers(db, CoreWsServer.getInstance());

  router.get('/', (_req: Request, res: Response) => {
    try {
      const agents = db.getAllAgents();
      const runner = AgentRunner.getInstance();
      const result = agents.map((agent) => {
        const mcps = db.getAgentMcps(agent.id);
        const skills = db.getAgentSkills(agent.id);
        const runs = db.getAgentRuns(agent.id, 1);
        const isRunning = runner.isAgentRunning(agent.id);
        let status = agent.status;
        if (!isRunning && status === 'running') {
          status = agent.cron_enabled === 1 ? 'scheduled' : 'idle';
          db.updateAgent(agent.id, { status });
        }

        let unconfiguredCount = 0;
        const mcpsWithStatus = mcps.map((m) => {
          let cfg: Record<string, unknown> = {};
          try { cfg = JSON.parse(m.config_json); } catch {}
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

        return {
          ...agent,
          status,
          mcps: mcpsWithStatus,
          unconfiguredMcpsCount: unconfiguredCount,
          skills,
          latestRun: runs.length > 0 ? runs[0] : null,
        };
      });
      res.json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  router.post('/', (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      const id = body.id || `agent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const name = body.name || 'Specialist Agent';
      const model = body.model || 'nvidia/nemotron-3-super-120b-a12b';
      const provider = body.provider || 'nvidia';
      const systemPrompt =
        body.system_prompt ||
        'You are an autonomous AI specialist agent created on Smoke Monkey Canvas. Accomplish your task with high precision and report actionable results.';
      const cronSchedule = body.cron_schedule || null;
      const cronEnabled = body.cron_enabled ? 1 : 0;
      const posX = typeof body.pos_x === 'number' ? body.pos_x : 300;
      const posY = typeof body.pos_y === 'number' ? body.pos_y : 220;

      let nextRunAt: string | null = null;
      if (cronEnabled && cronSchedule) {
        nextRunAt = calculateNextCronRun(cronSchedule);
      }

      const keyCheck = validateProviderKey(provider, body.apiKey);
      if (!keyCheck.valid) {
        res.status(400).json({
          error: `Provider "${provider}" requires an API key (${keyCheck.keyName}). Please configure the API key first.`,
        });
        return;
      }

      const disabledTools = typeof body.disabled_tools === 'string' ? body.disabled_tools : JSON.stringify(body.disabled_tools || []);
      const policies = typeof body.policies === 'string' ? body.policies : JSON.stringify(body.policies || []);
      const personalities =
        typeof body.personalities === 'string' ? body.personalities : JSON.stringify(body.personalities || []);
      const outputStyles =
        typeof body.output_styles === 'string' ? body.output_styles : JSON.stringify(body.output_styles || []);

      // Working Directory: if provided, use it; otherwise create ~/.smoke-agents/<safeName>-<id>
      const rawWorkingDir = typeof body.working_dir === 'string' ? body.working_dir.trim() : '';
      let workingDir = rawWorkingDir;
      if (!workingDir) {
        const safeName = name.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'agent';
        workingDir = join(homedir(), '.smoke-agents', `${safeName}-${id}`);
      }
      try {
        fs.mkdirSync(workingDir, { recursive: true });
      } catch (e) {
        console.warn(`[agent.server] Could not create working directory ${workingDir}:`, e);
      }

      // Memory limit (MB): default 1024 MB
      const maxMemoryMb = typeof body.max_memory_mb === 'number' && body.max_memory_mb > 0
        ? Math.round(body.max_memory_mb)
        : 1024;

      let role = typeof body.role === 'string' && body.role.trim() ? body.role.trim() : null;
      let specialty = typeof body.specialty === 'string' && body.specialty.trim() ? body.specialty.trim() : null;
      let description = typeof body.description === 'string' && body.description.trim() ? body.description.trim() : null;

      if (!role || !specialty || !description) {
        try {
          const jsonPath = join(__dirname, 'agent.stock-templates.json');
          if (fs.existsSync(jsonPath)) {
            const stock = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
            const match = stock.find(
              (s: any) =>
                s.id === body.templateId ||
                s.name.toLowerCase() === name.toLowerCase() ||
                s.id === id,
            );
            if (match) {
              if (!role) role = match.role;
              if (!specialty) specialty = match.specialty;
              if (!description) description = match.description;
            }
          }
        } catch {}
      }

      const agent = db.createAgent({
        id,
        name,
        model,
        provider,
        system_prompt: systemPrompt,
        cron_schedule: cronSchedule,
        cron_enabled: cronEnabled,
        pos_x: posX,
        pos_y: posY,
        status: cronEnabled ? 'scheduled' : 'idle',
        last_run_at: null,
        next_run_at: nextRunAt,
        disabled_tools: disabledTools,
        policies,
        personalities,
        output_styles: outputStyles,
        working_dir: workingDir,
        max_memory_mb: maxMemoryMb,
        role,
        description,
        specialty,
      });

      try {
        const ws = ensureAgentWorkspace(resolveAgentWorkspace(agent), agent.id, agent.name, agent.system_prompt);
        syncAgentDiskManifestFromDb({ agentId: agent.id, ws, db });
        setupAgentWorkspaceWatcher(agent.id, db, CoreWsServer.getInstance());
      } catch (err) {
        console.warn(`[agent.server] Setup workspace watcher failed for ${agent.id}:`, err);
      }

      try {
        ensureDefaultAgentCronJobs(agent.id, db);
        AgentCronScheduler.getInstance().syncAllAgentSchedules();
      } catch (err) {
        console.warn(`[agent.server] Setup default cron jobs failed for ${agent.id}:`, err);
      }

      CoreWsServer.getInstance().broadcast({
        type: 'agent_created',
        agentId: agent.id,
        data: agent,
      });

      res.status(201).json({
        ...agent,
        mcps: [],
        skills: [],
        latestRun: null,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  // ── Peer Agent Connections (must be before /:id to avoid route collision) ─
  router.get('/connections', (req: Request, res: Response) => {
    try {
      const agentId = req.query.agentId as string | undefined;
      const connections = db.getAgentConnections(agentId);
      res.json({ connections });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  router.post('/connections', (req: Request, res: Response) => {
    try {
      const sourceAgentId = req.body?.sourceAgentId || req.body?.source_agent_id;
      const targetAgentId = req.body?.targetAgentId || req.body?.target_agent_id;
      if (!sourceAgentId || !targetAgentId) {
        res.status(400).json({ error: 'sourceAgentId and targetAgentId are required' });
        return;
      }
      const conn = db.createAgentConnection(sourceAgentId, targetAgentId);
      CoreWsServer.getInstance().broadcast({
        type: 'agent_connection_created',
        data: conn,
      });
      res.status(201).json({ connection: conn, ...conn });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ error: msg });
    }
  });

  router.delete('/connections/:connId', (req: Request, res: Response) => {
    try {
      const connId = getParam(req.params.connId);
      db.deleteAgentConnection(connId);
      CoreWsServer.getInstance().broadcast({
        type: 'agent_connection_deleted',
        data: { id: connId },
      });
      res.json({ success: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  router.delete('/connections', (req: Request, res: Response) => {
    try {
      const sourceAgentId = req.body?.sourceAgentId || req.body?.source_agent_id;
      const targetAgentId = req.body?.targetAgentId || req.body?.target_agent_id;
      if (sourceAgentId && targetAgentId) {
        db.deleteAgentConnectionBetween(sourceAgentId, targetAgentId);
        CoreWsServer.getInstance().broadcast({
          type: 'agent_connection_deleted',
          data: { sourceAgentId, targetAgentId },
        });
        res.json({ success: true });
        return;
      }
      res.status(400).json({ error: 'sourceAgentId and targetAgentId are required' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  // ── Runs & Events (must be before /:id to avoid route collision) ──────────
  router.get('/runs/:runId', (req: Request, res: Response) => {
    const runId = getParam(req.params.runId);
    const run = db.getRun(runId);
    if (!run) {
      res.status(404).json({ error: 'Run not found' });
      return;
    }
    const events = db.getRunEvents(runId);
    res.json({ ...run, events });
  });

  /**
   * Merged, source-aware view of everything attached to this agent: DB rows
   * (`canvas`/`user`) + what the agent itself wrote into its `.smoke-agent/`
   * folder during runs (`agent`), plus the exact effective system prompt the
   * next run will send — assembled by the same builder the runner uses.
   */
  router.get('/:id/manifest', (req: Request, res: Response) => {
    const id = getParam(req.params.id);
    const agent = db.getAgent(id);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    const workspace = resolveAgentWorkspace(agent);
    const ws = ensureAgentWorkspace(workspace, agent.id, agent.name, agent.system_prompt);

    // Live runtime sync: reconcile any self-made agent changes (system_prompt.md,
    // unlinked MCPs, skills, automations) before returning data
    reconcileAgentWorkspaceRuntime({
      agentId: agent.id,
      ws,
      db,
      wsServer: CoreWsServer.getInstance(),
    });
    const freshAgent = db.getAgent(id) || agent;
    const dbPolicies = parsePolicies(freshAgent.policies);

    // The agent can detach app-managed attachments by editing its own
    // manifest files — honor those removals before assembling the response so
    // the UI stops listing what the agent deleted.
    const reconciled = reconcileManifestRemovals({
      ws,
      skills: db.getAgentSkills(freshAgent.id),
      mcps: db.getAgentMcps(freshAgent.id),
      removeSkill: (rowId) => db.deleteAgentSkill(rowId),
      removeMcp: (rowId) => db.deleteAgentMcp(rowId),
    });
    const dbMcps = reconciled.mcps;
    const dbSkills = reconciled.skills;

    let manifestUpdatedAt = new Date().toISOString();
    try {
      manifestUpdatedAt = fs.statSync(ws.mcpFile).mtime.toISOString();
    } catch {
      // workspace just created
    }

    const manifestMcps = readAgentMcpManifest(ws);
    const manifestSkills = readAgentSkillManifest(ws);
    const manifestPolicies = readAgentPolicyManifest(ws);

    const dbMcpNames = new Set(dbMcps.map((m) => m.mcp_name));
    const dbSkillNames = new Set(dbSkills.map((s) => s.skill_name));

    // Entries the agent wrote itself (legacy entries with no source predate the
    // `source` field and are also agent-authored).
    const agentMcpEntries = manifestMcps.filter(
      (e) => (e.source === 'agent' || !e.source) && !dbMcpNames.has(e.name),
    );
    const agentSkillEntries = manifestSkills.filter(
      (e) => (e.source === 'agent' || !e.source) && !dbSkillNames.has(e.name),
    );

    const mcps: AgentMcpRecord[] = [
      ...dbMcps,
      ...agentMcpEntries.map((e) => ({
        id: `agent_${e.key}`,
        agent_id: freshAgent.id,
        mcp_name: e.name,
        label: e.label || e.name,
        config_json: JSON.stringify({
          command: e.command,
          args: e.args,
          url: e.url,
          env: e.env,
        }),
        enabled: e.enabled === false ? 0 : 1,
        created_at: manifestUpdatedAt,
        source: 'agent' as const,
      })),
    ];

    const skills: AgentSkillRecord[] = [
      ...dbSkills,
      ...agentSkillEntries.map((e) => ({
        id: `agent_${e.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        agent_id: freshAgent.id,
        skill_name: e.name,
        description: e.description ?? e.name,
        content: e.content ?? '',
        enabled: e.enabled === false ? 0 : 1,
        created_at: manifestUpdatedAt,
        source: 'agent' as const,
      })),
    ];

    const policies = mergeEffectivePolicies(dbPolicies, manifestPolicies);

    let disabledTools: string[] = [];
    try {
      if (freshAgent.disabled_tools) disabledTools = JSON.parse(freshAgent.disabled_tools);
    } catch {
      disabledTools = [];
    }

    const peerAgents = db.getConnectedPeers(freshAgent.id);
    const teamWorkflow = buildAgentTeamWorkflowBlock(freshAgent.id, db, new SpaceDb());
    const effectiveSystemPrompt = buildEffectiveSystemPrompt(freshAgent.system_prompt, {
      policyEntries: policies,
      disabledTools,
      resolvedWorkspace: workspace,
      memoryLimitMb: freshAgent.max_memory_mb || 1024,
      personalities: freshAgent.personalities,
      outputStyles: freshAgent.output_styles,
      manifest: ws,
      common: commonRegistryPaths(),
      agentId: freshAgent.id,
      agentName: freshAgent.name,
      peerAgents,
      teamWorkflow,
    });

    const automations = readAgentAutomations(ws);
    const memoryFiles = readAgentMemorySummaries(ws);

    // Shared cross-agent repository memory
    const repoInfo = detectGitRepository(workspace);
    let repoMemory = null;
    if (repoInfo) {
      ensureRepoMemory(commonRegistryPaths().dir, repoInfo, freshAgent.id, freshAgent.name);
      repoMemory = getRepoMemorySummary(commonRegistryPaths().dir, repoInfo.repoKey);
    }

    res.json({
      agent_id: freshAgent.id,
      agent_name: freshAgent.name,
      workspace,
      updated_at: manifestUpdatedAt,
      system_prompt: freshAgent.system_prompt,
      mcps,
      skills,
      policies,
      automations,
      memory_files: memoryFiles,
      repository_memory: repoMemory,
      team_workflow: teamWorkflow,
      effective_system_prompt: effectiveSystemPrompt,
    });
  });

  /** List all active inter-agent delegations currently in flight */
  router.get('/active-delegations', (_req: Request, res: Response) => {
    res.json(runner.getActiveDelegations());
  });

  /** List all shared repositories known across Smoke Monkey Canvas */
  router.get('/common/repositories', (_req: Request, res: Response) => {
    try {
      const catalogFile = join(commonRegistryPaths().dir, 'repositories.json');
      if (fs.existsSync(catalogFile)) {
        const catalog = JSON.parse(fs.readFileSync(catalogFile, 'utf8'));
        res.json(catalog);
        return;
      }
    } catch {}
    res.json({ repositories: {} });
  });

  /** Get shared repository memory for an agent's workspace */
  router.get('/:id/repo-memory', (req: Request, res: Response) => {
    const id = getParam(req.params.id);
    const agent = db.getAgent(id);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    const workspace = resolveAgentWorkspace(agent);
    const repoInfo = detectGitRepository(workspace);
    if (!repoInfo) {
      res.json({ detected: false, repository: null });
      return;
    }
    const commonRoot = commonRegistryPaths().dir;
    ensureRepoMemory(commonRoot, repoInfo, agent.id, agent.name);
    const summary = getRepoMemorySummary(commonRoot, repoInfo.repoKey);
    res.json({ detected: true, info: repoInfo, memory: summary });
  });

  /** Update a file in the shared repository memory */
  router.patch('/:id/repo-memory/:file', (req: Request, res: Response) => {
    const id = getParam(req.params.id);
    const file = getParam(req.params.file);
    const content = req.body?.content;
    if (typeof content !== 'string') {
      res.status(400).json({ error: 'Missing content string in body' });
      return;
    }
    const agent = db.getAgent(id);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    const workspace = resolveAgentWorkspace(agent);
    const repoInfo = detectGitRepository(workspace);
    if (!repoInfo) {
      res.status(400).json({ error: 'No Git repository associated with this agent workspace' });
      return;
    }
    const commonRoot = commonRegistryPaths().dir;
    const paths = buildRepoMemoryPaths(commonRoot, repoInfo.repoKey);
    const allowedMap: Record<string, string> = {
      insights: paths.insightsFile,
      features: paths.featuresFile,
      explore: paths.exploreFile,
      history: paths.historyFile,
      readme: paths.readmeFile,
    };
    const targetPath = allowedMap[file.replace(/\.md$/, '')];
    if (!targetPath) {
      res.status(400).json({ error: `Invalid repo memory file: ${file}` });
      return;
    }
    try {
      fs.writeFileSync(targetPath, content, 'utf8');
      const wsServer = CoreWsServer.getInstance();
      wsServer.broadcast({
        type: 'agent_manifest_updated',
        agentId: agent.id,
      });
      res.json({ success: true, file, path: targetPath });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed writing file' });
    }
  });

  /** Read an agent's specific human memory file */
  router.get('/:id/memory/:file', (req: Request, res: Response) => {
    const id = getParam(req.params.id);
    const file = getParam(req.params.file);
    const agent = db.getAgent(id);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    const workspace = resolveAgentWorkspace(agent);
    const ws = ensureAgentWorkspace(workspace, agent.id, agent.name, agent.system_prompt);
    const fileName = file.endsWith('.md') ? file : `${file}.md`;
    const targetFile = ws.memoryFiles[fileName];
    if (!targetFile || !fs.existsSync(targetFile)) {
      res.status(404).json({ error: `Memory file not found: ${file}` });
      return;
    }
    try {
      const content = fs.readFileSync(targetFile, 'utf8');
      res.json({ file: fileName, content, path: targetFile });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /** Update an agent's specific human memory file */
  router.patch('/:id/memory/:file', (req: Request, res: Response) => {
    const id = getParam(req.params.id);
    const file = getParam(req.params.file);
    const content = req.body?.content;
    if (typeof content !== 'string') {
      res.status(400).json({ error: 'Missing content string in body' });
      return;
    }
    const agent = db.getAgent(id);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    const workspace = resolveAgentWorkspace(agent);
    const ws = ensureAgentWorkspace(workspace, agent.id, agent.name, agent.system_prompt);
    const fileName = file.endsWith('.md') ? file : `${file}.md`;
    const targetFile = ws.memoryFiles[fileName];
    if (!targetFile) {
      res.status(400).json({ error: `Unknown memory file: ${file}` });
      return;
    }
    try {
      fs.writeFileSync(targetFile, content, 'utf8');
      const wsServer = CoreWsServer.getInstance();
      wsServer.broadcast({
        type: 'agent_manifest_updated',
        agentId: agent.id,
      });
      res.json({ success: true, file: fileName, path: targetFile });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /** List all files in the agent workspace */
  router.get('/:id/files', (req: Request, res: Response) => {
    const id = getParam(req.params.id);
    const agent = db.getAgent(id);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    const workspaceRoot = resolveAgentWorkspace(agent);

    // Watch workspace for live file creations/updates
    watchAgentWorkspace(agent.id, workspaceRoot, () => {
      CoreWsServer.getInstance().broadcast({
        type: 'agent_files_updated',
        agentId: agent.id,
        data: { timestamp: new Date().toISOString() },
      });
    });

    const result = scanAgentWorkspaceFiles(workspaceRoot);
    res.json(result);
  });

  /** Get text content of a workspace file */
  router.get('/:id/files/content', (req: Request, res: Response) => {
    const id = getParam(req.params.id);
    const relativePath = getParam(req.query.path as string);
    if (!relativePath) {
      res.status(400).json({ error: 'Query parameter "path" is required' });
      return;
    }
    const agent = db.getAgent(id);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    const workspaceRoot = resolveAgentWorkspace(agent);
    const targetPath = safeResolveWorkspacePath(workspaceRoot, relativePath);
    if (!targetPath || !fs.existsSync(targetPath)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }
    try {
      const stat = fs.statSync(targetPath);
      if (stat.isDirectory()) {
        res.status(400).json({ error: 'Path is a directory' });
        return;
      }
      const ext = path.extname(targetPath).toLowerCase().replace(/^\./, '');
      const content = fs.readFileSync(targetPath, 'utf8');
      res.json({
        path: relativePath,
        name: path.basename(targetPath),
        extension: ext,
        category: getFileCategory(ext),
        mimeType: getFileMimeType(ext),
        size: stat.size,
        mtime: stat.mtime.toISOString(),
        content,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /** Stream raw media / PDF / binary / document for in-place rendering & playback */
  router.get('/:id/files/raw', (req: Request, res: Response) => {
    const id = getParam(req.params.id);
    const relativePath = getParam(req.query.path as string);
    if (!relativePath) {
      res.status(400).json({ error: 'Query parameter "path" is required' });
      return;
    }
    const agent = db.getAgent(id);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    const workspaceRoot = resolveAgentWorkspace(agent);
    const targetPath = safeResolveWorkspacePath(workspaceRoot, relativePath);
    if (!targetPath || !fs.existsSync(targetPath)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }
    try {
      const stat = fs.statSync(targetPath);
      if (stat.isDirectory()) {
        res.status(400).json({ error: 'Path is a directory' });
        return;
      }
      const ext = path.extname(targetPath).toLowerCase().replace(/^\./, '');
      const mime = getFileMimeType(ext);

      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(path.basename(targetPath))}"`);
      res.setHeader('Cache-Control', 'no-cache');

      const stream = fs.createReadStream(targetPath);
      stream.pipe(res);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /** Save / update text content of a workspace file */
  router.patch('/:id/files/content', (req: Request, res: Response) => {
    const id = getParam(req.params.id);
    const relativePath = req.body?.path;
    const content = req.body?.content;
    if (!relativePath || typeof content !== 'string') {
      res.status(400).json({ error: 'Missing path or content in body' });
      return;
    }
    const agent = db.getAgent(id);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    const workspaceRoot = resolveAgentWorkspace(agent);
    const targetPath = safeResolveWorkspacePath(workspaceRoot, relativePath);
    if (!targetPath) {
      res.status(400).json({ error: 'Invalid path' });
      return;
    }
    try {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, content, 'utf8');

      CoreWsServer.getInstance().broadcast({
        type: 'agent_files_updated',
        agentId: agent.id,
        data: { path: relativePath },
      });

      res.json({ success: true, path: relativePath });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /** Open a workspace file with the system-associated default application (macOS open, Windows start, Linux xdg-open) */
  router.post('/:id/files/open-system', (req: Request, res: Response) => {
    const id = getParam(req.params.id);
    const relativePath = req.body?.path;
    if (!relativePath) {
      res.status(400).json({ error: 'Missing path in body' });
      return;
    }
    const agent = db.getAgent(id);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    const workspaceRoot = resolveAgentWorkspace(agent);
    const targetPath = safeResolveWorkspacePath(workspaceRoot, relativePath);
    if (!targetPath || !fs.existsSync(targetPath)) {
      res.status(404).json({ error: 'File not found on filesystem' });
      return;
    }

    try {
      const isWindows = process.platform === 'win32';
      const isMac = process.platform === 'darwin';

      if (isMac) {
        execFile('open', [targetPath], (err) => {
          if (err) console.error('[open-system] Failed to open file:', err);
        });
      } else if (isWindows) {
        execFile('cmd', ['/c', 'start', '', targetPath], (err) => {
          if (err) console.error('[open-system] Failed to open file:', err);
        });
      } else {
        execFile('xdg-open', [targetPath], (err) => {
          if (err) console.error('[open-system] Failed to open file:', err);
        });
      }

      res.json({ success: true, path: targetPath });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/:id', (req: Request, res: Response) => {
    const id = getParam(req.params.id);
    const agent = db.getAgent(id);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    const mcps = db.getAgentMcps(agent.id);
    const skills = db.getAgentSkills(agent.id);
    const runs = db.getAgentRuns(agent.id, 10);
    const runner = AgentRunner.getInstance();
    const isRunning = runner.isAgentRunning(agent.id);
    let status = agent.status;
    if (!isRunning && status === 'running') {
      status = agent.cron_enabled === 1 ? 'scheduled' : 'idle';
      db.updateAgent(agent.id, { status });
    }
    res.json({
      ...agent,
      status,
      mcps,
      skills,
      runs,
    });
  });

  router.patch('/:id', (req: Request, res: Response) => {
    const id = getParam(req.params.id);
    const body = req.body || {};
    const patch: Record<string, unknown> = {};

    if (body.provider !== undefined) {
      const keyCheck = validateProviderKey(body.provider, body.apiKey);
      if (!keyCheck.valid) {
        res.status(400).json({
          error: `Provider "${body.provider}" requires an API key (${keyCheck.keyName}). Please configure the API key first.`,
        });
        return;
      }
      patch.provider = body.provider;
    }

    if (body.name !== undefined) patch.name = body.name;
    if (body.model !== undefined) patch.model = body.model;
    if (body.system_prompt !== undefined) patch.system_prompt = body.system_prompt;
    if (body.cron_schedule !== undefined) patch.cron_schedule = body.cron_schedule;
    if (body.cron_enabled !== undefined) {
      patch.cron_enabled = body.cron_enabled ? 1 : 0;
      if (body.cron_enabled && (body.cron_schedule || patch.cron_schedule)) {
        const schedule = (body.cron_schedule || patch.cron_schedule) as string;
        patch.next_run_at = calculateNextCronRun(schedule);
        patch.status = 'scheduled';
      } else if (!body.cron_enabled) {
        patch.next_run_at = null;
        patch.status = 'idle';
      }
    }
    if (typeof body.pos_x === 'number') patch.pos_x = body.pos_x;
    if (typeof body.pos_y === 'number') patch.pos_y = body.pos_y;
    if (body.status !== undefined) patch.status = body.status;
    if (body.disabled_tools !== undefined) {
      patch.disabled_tools = typeof body.disabled_tools === 'string' ? body.disabled_tools : JSON.stringify(body.disabled_tools);
    }
    if (body.policies !== undefined) {
      patch.policies = typeof body.policies === 'string' ? body.policies : JSON.stringify(body.policies);
    }
    if (body.personalities !== undefined) {
      patch.personalities =
        typeof body.personalities === 'string' ? body.personalities : JSON.stringify(body.personalities);
    }
    if (body.output_styles !== undefined) {
      patch.output_styles =
        typeof body.output_styles === 'string' ? body.output_styles : JSON.stringify(body.output_styles);
    }
    if (body.working_dir !== undefined) {
      let wd = typeof body.working_dir === 'string' ? body.working_dir.trim() : '';
      if (!wd) {
        const agent = db.getAgent(id);
        const safeName = (agent?.name || 'agent').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'agent';
        wd = join(homedir(), '.smoke-agents', `${safeName}-${id}`);
      }
      try {
        fs.mkdirSync(wd, { recursive: true });
      } catch (e) {
        console.warn(`[agent.server] Could not create working directory ${wd}:`, e);
      }
      patch.working_dir = wd;
    }
    if (body.max_memory_mb !== undefined) {
      patch.max_memory_mb = typeof body.max_memory_mb === 'number' && body.max_memory_mb > 0
        ? Math.round(body.max_memory_mb)
        : 1024;
    }
    if (body.role !== undefined) patch.role = typeof body.role === 'string' ? body.role : null;
    if (body.description !== undefined) patch.description = typeof body.description === 'string' ? body.description : null;
    if (body.specialty !== undefined) patch.specialty = typeof body.specialty === 'string' ? body.specialty : null;

    const updated = db.updateAgent(id, patch);
    if (!updated) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    CoreWsServer.getInstance().broadcast({
      type: 'agent_updated',
      agentId: id,
      data: updated,
    });
    res.json(updated);
  });

  router.delete('/:id', (req: Request, res: Response) => {
    const id = getParam(req.params.id);
    const deleteFiles = req.query.deleteFiles === 'true' || req.query.delete_files === 'true';
    const agent = db.getAgent(id);
    if (agent && deleteFiles) {
      try {
        const ws = resolveAgentWorkspace(agent);
        if (ws && fs.existsSync(ws)) {
          fs.rmSync(ws, { recursive: true, force: true });
        }
      } catch (err) {
        console.warn(`[AgentServer] Failed to delete workspace folder for agent ${id}:`, err);
      }
    }
    unwatchAgentWorkspace(id);
    db.deleteAgent(id);
    CoreWsServer.getInstance().broadcast({
      type: 'agent_deleted',
      agentId: id,
      data: { id },
    });
    res.json({ success: true, id });
  });

  // ── Manual Execution ──────────────────────────────────────────────────────
  router.post('/:id/run', async (req: Request, res: Response) => {
    const id = getParam(req.params.id);
    const body = req.body || {};
    try {
      // Validate that attached MCPs have required credentials
      const mcps = db.getAgentMcps(id);
      const coreDb = CoreDatabase.getInstance();
      const unconfigured: string[] = [];
      for (const m of mcps) {
        const stock = STOCK_MCPS.find((s) => s.name === m.mcp_name);
        if (stock && stock.envKeys.length > 0) {
          let cfg: Record<string, unknown> = {};
          try { cfg = JSON.parse(m.config_json); } catch {}
          const env = (cfg.env as Record<string, string>) || {};
          const missing = stock.envKeys.filter((k) => !env[k] && !coreDb.getSetting(k) && !process.env[k]);
          if (missing.length > 0) {
            unconfigured.push(`${stock.label} (missing ${missing.join(', ')})`);
          }
        }
      }

      if (unconfigured.length > 0 && !body.force) {
        res.status(400).json({
          error: `Agent has unconfigured MCP server(s):\n• ${unconfigured.join('\n• ')}\n\nPlease configure credentials or remove unconfigured MCPs before running.`,
        });
        return;
      }

      const run = await runner.runAgent(id, 'manual', body.prompt, body.sessionId, {
        userMsgId: body.userMsgId,
        assistantMsgId: body.assistantMsgId,
      });
      res.status(202).json({ success: true, run });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ error: msg });
    }
  });

  router.post('/:id/clear-memory', (req: Request, res: Response) => {
    const id = getParam(req.params.id);
    try {
      runner.clearAgentMemory(id);
      res.json({ success: true, message: `Memory cleared for agent ${id}` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  router.post('/:id/stop', (req: Request, res: Response) => {
    const id = getParam(req.params.id);
    const body = req.body || {};
    const runId = body.runId ? String(body.runId) : undefined;
    try {
      if (runId) {
        runner.stopRun(runId);
        res.json({ success: true, message: `Run ${runId} stopped` });
      } else {
        runner.stopAgent(id);
        res.json({ success: true, message: `Agent ${id} stopped` });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  // ── MCP Attachments ───────────────────────────────────────────────────────
  router.post('/:id/mcps', (req: Request, res: Response) => {
    const agentId = getParam(req.params.id);
    const body = req.body || {};
    const id = body.id || `mcp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const requestedName = body.mcp_name;

    if (!requestedName) {
      res.status(400).json({ error: 'mcp_name is required' });
      return;
    }

    // Resolve legacy aliases (gmail -> mcpai-gmail, slack-mcp -> mcpai-slack,
    // …) before validating/inserting so the same server cannot be attached
    // twice under two IDs.
    const requestedStock = STOCK_MCPS.find((s) => s.name === requestedName);
    const mcpName = requestedStock?.canonicalName || requestedName;
    const stock = STOCK_MCPS.find((s) => s.name === mcpName) || requestedStock;
    const label = body.label || stock?.label || mcpName;
    const configJson = typeof body.config === 'object' ? JSON.stringify(body.config) : body.config_json || '{}';
    const enabled = body.enabled === false ? 0 : 1;

    // Validate credentials for stock MCPs
    if (stock && stock.envKeys.length > 0) {
      const coreDb = CoreDatabase.getInstance();
      const envObj = (typeof body.config === 'object' && body.config?.env) ? body.config.env : {};
      const missingKeys: string[] = [];
      for (const k of stock.envKeys) {
        const val = envObj[k] || coreDb.getSetting(k) || process.env[k];
        if (!val || !String(val).trim()) {
          missingKeys.push(k);
        } else if (envObj[k]) {
          coreDb.setSetting(k, String(envObj[k]).trim());
        }
      }
      if (missingKeys.length > 0) {
        if (body.strictAuth || !body.allowUnconfigured) {
          res.status(400).json({
            error: `MCP server "${stock.label}" requires API credential(s): ${missingKeys.join(', ')}. Please enter the key or connect via OAuth before attaching.`,
          });
          return;
        }
      }
    }

    // Prevent duplicate MCP attachment to the same agent, including an older
    // legacy row that points at the same server (gmail vs mcpai-gmail).
    const existingMcps = db.getAgentMcps(agentId);
    const alreadyExists = existingMcps.find((m) => {
      const existingStock = STOCK_MCPS.find((s) => s.name === m.mcp_name);
      return (existingStock?.canonicalName || m.mcp_name) === mcpName;
    });
    if (alreadyExists) {
      res.status(409).json({
        error: `MCP server "${label || mcpName}" is already attached to this agent.`,
        mcp: alreadyExists,
        alreadyAttached: true,
      });
      return;
    }

    const mcp = db.addAgentMcp({
      id,
      agent_id: agentId,
      mcp_name: mcpName,
      label,
      config_json: configJson,
      enabled,
    });
    try {
      const agent = db.getAgent(agentId);
      if (agent) {
        const ws = ensureAgentWorkspace(resolveAgentWorkspace(agent), agent.id, agent.name, agent.system_prompt);
        syncAgentDiskManifestFromDb({ agentId, ws, db });
        CoreWsServer.getInstance().broadcast({ type: 'agent_mcps_updated', agentId, data: { timestamp: new Date().toISOString() } });
        CoreWsServer.getInstance().broadcast({ type: 'agent_updated', agentId, data: agent });
      }
    } catch {}
    res.status(201).json(mcp);
  });

  router.delete('/:id/mcps/:mcpId', (req: Request, res: Response) => {
    const agentId = getParam(req.params.id);
    const mcpId = getParam(req.params.mcpId);
    db.deleteAgentMcp(mcpId, agentId);
    try {
      const agent = db.getAgent(agentId);
      if (agent) {
        const ws = ensureAgentWorkspace(resolveAgentWorkspace(agent), agent.id, agent.name, agent.system_prompt);
        syncAgentDiskManifestFromDb({ agentId, ws, db });
        CoreWsServer.getInstance().broadcast({ type: 'agent_mcps_updated', agentId, data: { timestamp: new Date().toISOString() } });
        CoreWsServer.getInstance().broadcast({ type: 'agent_updated', agentId, data: agent });
      }
    } catch {}
    res.json({ success: true, id: mcpId });
  });

  // ── Skill Attachments ─────────────────────────────────────────────────────
  router.post('/:id/skills', (req: Request, res: Response) => {
    const agentId = getParam(req.params.id);
    const body = req.body || {};
    const id = body.id || `skill_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const skillName = body.skill_name;
    const description = body.description || null;
    const content = body.content || '';
    const enabled = body.enabled === false ? 0 : 1;

    if (!skillName) {
      res.status(400).json({ error: 'skill_name is required' });
      return;
    }

    const skill = db.upsertAgentSkill({
      id,
      agent_id: agentId,
      skill_name: skillName,
      description,
      content,
      enabled,
      source: body.source === 'agent' ? 'agent' : 'user',
    });
    try {
      const agent = db.getAgent(agentId);
      if (agent) {
        const ws = ensureAgentWorkspace(resolveAgentWorkspace(agent), agent.id, agent.name, agent.system_prompt);
        syncAgentDiskManifestFromDb({ agentId, ws, db });
        CoreWsServer.getInstance().broadcast({ type: 'agent_skills_updated', agentId, data: { timestamp: new Date().toISOString() } });
        CoreWsServer.getInstance().broadcast({ type: 'agent_updated', agentId, data: agent });
      }
    } catch {}
    res.status(201).json(skill);
  });

  router.delete('/:id/skills/:skillId', (req: Request, res: Response) => {
    const agentId = getParam(req.params.id);
    const skillId = getParam(req.params.skillId);
    db.deleteAgentSkill(skillId);
    try {
      const agent = db.getAgent(agentId);
      if (agent) {
        const ws = ensureAgentWorkspace(resolveAgentWorkspace(agent), agent.id, agent.name, agent.system_prompt);
        syncAgentDiskManifestFromDb({ agentId, ws, db });
        CoreWsServer.getInstance().broadcast({ type: 'agent_skills_updated', agentId, data: { timestamp: new Date().toISOString() } });
        CoreWsServer.getInstance().broadcast({ type: 'agent_updated', agentId, data: agent });
      }
    } catch {}
    res.json({ success: true, id: skillId });
  });

  // ── Personality & Output Style Presets ────────────────────────────────────
  // Stored as JSON arrays of preset ids on the agent, mirroring `policies`.
  // Only ids present in the server catalogue are accepted, so the prompt can
  // always resolve them.
  const presetAttach =
    (column: 'personalities' | 'output_styles', kind: 'personality' | 'output') =>
    (req: Request, res: Response): void => {
      const agentId = getParam(req.params.id);
      const agent = db.getAgent(agentId);
      if (!agent) {
        res.status(404).json({ error: 'Agent not found' });
        return;
      }
      const presetId = (req.body || {}).id;
      if (
        typeof presetId !== 'string' ||
        (!PRESETS_BY_KIND[kind].some((p) => p.id === presetId) && !presetId.startsWith('custom-'))
      ) {
        res.status(400).json({ error: `Unknown ${kind} preset id` });
        return;
      }
      const current = parseIdList(agent[column]);
      if (!current.includes(presetId)) current.push(presetId);
      const updated = db.updateAgent(agentId, { [column]: JSON.stringify(current) });
      res.status(201).json({ success: true, [column]: current, agent: updated });
    };

  const presetDetach =
    (column: 'personalities' | 'output_styles') =>
    (req: Request, res: Response): void => {
      const agentId = getParam(req.params.id);
      const agent = db.getAgent(agentId);
      if (!agent) {
        res.status(404).json({ error: 'Agent not found' });
        return;
      }
      const presetId = getParam(req.params.presetId);
      const remaining = parseIdList(agent[column]).filter((id) => id !== presetId);
      const updated = db.updateAgent(agentId, { [column]: JSON.stringify(remaining) });
      res.json({ success: true, [column]: remaining, agent: updated });
    };

  router.post('/:id/personalities', presetAttach('personalities', 'personality'));
  router.delete('/:id/personalities/:presetId', presetDetach('personalities'));
  router.post('/:id/output-styles', presetAttach('output_styles', 'output'));
  router.delete('/:id/output-styles/:presetId', presetDetach('output_styles'));

  // ── Agent Runs list ───────────────────────────────────────────────────────
  router.get('/:id/runs', (req: Request, res: Response) => {
    const id = getParam(req.params.id);
    const triggerType = req.query.trigger_type ? String(req.query.trigger_type) : undefined;
    const runs = db.getAgentRuns(id, 50, triggerType);
    res.json(runs);
  });

  // ── Agent Date-wise Todo History ──────────────────────────────────────────
  router.get('/:id/todos/dates', (req: Request, res: Response) => {
    const id = getParam(req.params.id);
    const dates = db.getAgentTodoDates(id);
    res.json({ dates });
  });

  router.get('/:id/todos', (req: Request, res: Response) => {
    const id = getParam(req.params.id);
    const agent = db.getAgent(id);
    if (!agent) {
      return res.status(404).json({ error: `Agent ${id} not found` });
    }

    const availableDates = db.getAgentTodoDates(id);
    let dateParam = req.query.date ? String(req.query.date).trim().toLowerCase() : 'today';
    const now = new Date();
    let targetDate = formatDateKey(now);

    if (dateParam === 'today' || !dateParam) {
      targetDate = formatDateKey(now);
    } else if (dateParam === 'yesterday') {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      targetDate = formatDateKey(yesterday);
    } else if (dateParam === 'latest') {
      targetDate = availableDates.length > 0 ? availableDates[0] : formatDateKey(now);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      targetDate = dateParam;
    }

    const todos = db.getAgentTodosByDate(id, targetDate);
    const total = todos.length;
    const completed = todos.filter((t) => t.status === 'completed').length;
    const inProgress = todos.filter((t) => t.status === 'in_progress').length;
    const pending = todos.filter((t) => t.status === 'pending').length;
    const cancelled = todos.filter((t) => t.status === 'cancelled').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const { topSections, specializations } = inferSpecializationsFromTodos(todos);

    res.json({
      agent_id: id,
      agent_name: agent.name,
      role: agent.role,
      specialty: agent.specialty,
      date: targetDate,
      available_dates: availableDates,
      metrics: {
        total,
        completed,
        in_progress: inProgress,
        pending,
        cancelled,
        completion_rate_percent: completionRate,
      },
      sections: topSections,
      specializations,
      todos,
    });
  });

  router.post('/:id/todos/redevelop-specializations', async (req: Request, res: Response) => {
    const id = getParam(req.params.id);
    const agent = db.getAgent(id);
    if (!agent) {
      return res.status(404).json({ error: `Agent ${id} not found` });
    }

    const daysBack = req.body?.days_back ? Number(req.body.days_back) : 7;
    const resolvedWs = resolveAgentWorkspace(agent);
    const result = await redevelopAgentSpecializationsFromHistory(id, db, resolvedWs, daysBack);

    if (!result) {
      return res.status(500).json({ error: 'Failed to redevelop agent specializations' });
    }

    res.json(result);
  });

  // ── Agent Scheduled Cron Jobs ──────────────────────────────────────────────
  router.get('/:id/cron-jobs', (req: Request, res: Response) => {
    const id = getParam(req.params.id);
    ensureDefaultAgentCronJobs(id, db);
    const jobs = db.getAgentCronJobs(id);
    res.json(jobs);
  });

  router.post('/:id/cron-jobs', (req: Request, res: Response) => {
    const id = getParam(req.params.id);
    const body = req.body || {};
    const { name, prompt, cron_schedule, enabled, source, delay_minutes, scheduled_at } = body;
    if (!name || !prompt) {
      return res.status(400).json({ error: 'Missing name or prompt' });
    }
    let nextRun: string | null = null;
    let schedule = cron_schedule ? String(cron_schedule).trim() : '';

    if (delay_minutes !== undefined && Number(delay_minutes) > 0) {
      nextRun = new Date(Date.now() + Number(delay_minutes) * 60000).toISOString();
      schedule = 'once';
    } else if (scheduled_at) {
      let parsedDate: Date | null = null;
      try {
        const d = new Date(scheduled_at);
        if (!isNaN(d.getTime())) parsedDate = d;
      } catch {}
      if (!parsedDate) {
        const m = String(scheduled_at).match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
        if (m) {
          let hours = parseInt(m[1], 10);
          const mins = m[2] ? parseInt(m[2], 10) : 0;
          const ampm = m[3]?.toLowerCase();
          if (ampm === 'pm' && hours < 12) hours += 12;
          if (ampm === 'am' && hours === 12) hours = 0;
          const now = new Date();
          parsedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, mins, 0);
          if (parsedDate.getTime() <= now.getTime()) {
            parsedDate.setDate(parsedDate.getDate() + 1);
          }
        }
      }
      if (parsedDate) {
        nextRun = parsedDate.toISOString();
        schedule = 'once';
      } else {
        return res.status(400).json({ error: `Could not parse scheduled_at: ${scheduled_at}` });
      }
    } else if (schedule && schedule !== 'once') {
      nextRun = calculateNextCronRun(schedule);
      if (!nextRun) {
        return res.status(400).json({ error: `Invalid cron schedule: ${schedule}` });
      }
    } else {
      return res.status(400).json({ error: 'Missing cron_schedule, delay_minutes, or scheduled_at' });
    }

    let finalPrompt = String(prompt).trim();
    if (!finalPrompt.includes('mark_cron_job_success')) {
      finalPrompt +=
        "\n\n[MANDATORY COMPLETION]: You MUST invoke the 'mark_cron_job_success' tool with your completion summary upon finishing. If this tool is not called, the operation will be considered incomplete/failed and retried.";
    }

    const isEnabled = enabled !== false && enabled !== 0 ? 1 : 0;
    const job = db.createAgentCronJob({
      agent_id: id,
      name: String(name).trim(),
      prompt: finalPrompt,
      cron_schedule: schedule,
      enabled: isEnabled,
      created_by: source || 'USER',
      next_run_at: isEnabled ? nextRun : null,
    });
    try {
      AgentCronScheduler.getInstance().syncAllAgentSchedules();
    } catch {}
    try {
      CoreWsServer.getInstance().broadcast({ type: 'agent_cron_jobs_updated', agent_id: id });
    } catch {}
    res.status(201).json(job);
  });

  router.patch('/:id/cron-jobs/:jobId', (req: Request, res: Response) => {
    const id = getParam(req.params.id);
    const jobId = getParam(req.params.jobId);
    const existing = db.getCronJob(jobId);
    if (!existing || existing.agent_id !== id) {
      return res.status(404).json({ error: 'Cron job not found' });
    }
    const body = req.body || {};
    const updates: any = {};
    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.prompt !== undefined) {
      let updatedPrompt = String(body.prompt).trim();
      if (!updatedPrompt.includes('mark_cron_job_success')) {
        updatedPrompt +=
          "\n\n[MANDATORY COMPLETION]: You MUST invoke the 'mark_cron_job_success' tool with your completion summary upon finishing. If this tool is not called, the operation will be considered incomplete/failed and retried.";
      }
      updates.prompt = updatedPrompt;
    }

    if (body.cron_schedule !== undefined || body.scheduled_at !== undefined) {
      const schedule = body.cron_schedule ? String(body.cron_schedule).trim() : existing.cron_schedule;
      if (schedule === 'once' || body.scheduled_at) {
        updates.cron_schedule = 'once';
        let parsedDate: Date | null = null;
        if (body.scheduled_at) {
          try {
            const d = new Date(body.scheduled_at);
            if (!isNaN(d.getTime())) parsedDate = d;
          } catch {}
        }
        if (parsedDate) {
          updates.next_run_at = parsedDate.toISOString();
        } else if (!existing.next_run_at || new Date(existing.next_run_at).getTime() <= Date.now()) {
          updates.next_run_at = new Date(Date.now() + 60000).toISOString();
        }
      } else {
        const nextRun = calculateNextCronRun(schedule);
        if (!nextRun) {
          return res.status(400).json({ error: `Invalid cron schedule: ${schedule}` });
        }
        updates.cron_schedule = schedule;
        if (existing.enabled || body.enabled) updates.next_run_at = nextRun;
      }
    }

    if (body.enabled !== undefined) {
      const isEnabled = body.enabled ? 1 : 0;
      updates.enabled = isEnabled;
      if (isEnabled) {
        const currentSched = updates.cron_schedule || existing.cron_schedule;
        if (currentSched === 'once') {
          updates.next_run_at = existing.next_run_at && new Date(existing.next_run_at).getTime() > Date.now()
            ? existing.next_run_at
            : new Date(Date.now() + 60000).toISOString();
        } else {
          updates.next_run_at = calculateNextCronRun(currentSched);
        }
      } else {
        updates.next_run_at = null;
      }
    }

    const updated = db.updateAgentCronJob(jobId, updates);
    try {
      AgentCronScheduler.getInstance().syncAllAgentSchedules();
    } catch {}
    try {
      CoreWsServer.getInstance().broadcast({ type: 'agent_cron_jobs_updated', agent_id: id });
    } catch {}
    res.json(updated);
  });

  router.delete('/:id/cron-jobs/:jobId', (req: Request, res: Response) => {
    const id = getParam(req.params.id);
    const jobId = getParam(req.params.jobId);
    const existing = db.getCronJob(jobId);
    if (!existing || existing.agent_id !== id) {
      return res.status(404).json({ error: 'Cron job not found' });
    }
    db.deleteAgentCronJob(jobId);
    try {
      AgentCronScheduler.getInstance().syncAllAgentSchedules();
    } catch {}
    try {
      CoreWsServer.getInstance().broadcast({ type: 'agent_cron_jobs_updated', agent_id: id });
    } catch {}
    res.json({ success: true, id: jobId });
  });

  router.post('/:id/cron-jobs/:jobId/run', async (req: Request, res: Response) => {
    const id = getParam(req.params.id);
    const jobId = getParam(req.params.jobId);
    const existing = db.getCronJob(jobId);
    if (!existing || existing.agent_id !== id) {
      return res.status(404).json({ error: 'Cron job not found' });
    }
    try {
      const result = await AgentCronScheduler.getInstance().triggerJobNow(jobId);
      res.json({ success: true, jobId, result });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to trigger cron job' });
    }
  });

  // ── Agent Chat Sessions & Messages ─────────────────────────────────────────
  router.get('/:id/sessions', (req: Request, res: Response) => {
    const id = getParam(req.params.id);
    const sessions = db.getAgentSessions(id);
    res.json(sessions);
  });

  router.post('/:id/sessions', (req: Request, res: Response) => {
    const id = getParam(req.params.id);
    const body = req.body || {};
    const sessionId = body.id || `session_${id}_${Date.now()}`;
    const title = body.title || 'New Chat';
    const session = db.getOrCreateSession(id, sessionId, title);
    res.status(201).json(session);
  });

  router.get('/:id/active-runs', (req: Request, res: Response) => {
    const id = getParam(req.params.id);
    const active = runner.getActiveRuns(id);
    res.json(active);
  });

  router.get('/:id/sessions/:sessionId/messages', (req: Request, res: Response) => {
    const sessionId = getParam(req.params.sessionId);
    const messages = db.getSessionMessages(sessionId);
    const activeRun = runner.getActiveRunForSession(sessionId);
    if (activeRun && messages.length > 0) {
      const asstMsg = messages.slice().reverse().find((m) => m.role === 'assistant' && (!m.run_id || m.run_id === activeRun.runId));
      if (asstMsg) {
        asstMsg.content = activeRun.accumulatedText || asstMsg.content;
        asstMsg.parts_json = JSON.stringify(activeRun.accumulatedParts);
      }
    }
    res.json(messages);
  });

  router.delete('/:id/sessions/:sessionId', (req: Request, res: Response) => {
    const id = getParam(req.params.id);
    const sessionId = getParam(req.params.sessionId);
    runner.clearAgentMemory(id, sessionId);
    db.deleteSession(sessionId);
    res.json({ success: true, id: sessionId });
  });

  return router;
}
