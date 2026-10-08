import { Router, type Request, type Response } from 'express';
import fs from 'node:fs';
import path, { join } from 'node:path';
import { homedir } from 'node:os';
import {
  scanAgentWorkspaceFiles,
  safeResolveWorkspacePath,
  getFileCategory,
  getFileMimeType,
  watchAgentWorkspace,
} from './agent.files.js';
import { AgentDb } from './agent.db.js';
import { AgentRunner } from './agent.runner.js';
import { calculateNextCronRun } from './agent.cron.js';
import { CoreDatabase } from '../core/database.db.js';
import { STOCK_MCPS } from '../mcp/mcp.stock.js';
import { PRESETS_BY_KIND, parseIdList } from './agent.presets.js';
import {
  ensureAgentWorkspace,
  readAgentMcpManifest,
  readAgentSkillManifest,
  readAgentPolicyManifest,
  reconcileManifestRemovals,
  reconcileAgentWorkspaceRuntime,
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
import {
  detectGitRepository,
  ensureRepoMemory,
  getRepoMemorySummary,
  buildRepoMemoryPaths,
} from './agent.repo-memory.js';
import { CoreWsServer } from '../core/ws.server.js';

const PROVIDER_KEY_MAP: Record<string, string> = {
  nvidia: 'NVIDIA_API_KEY',
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY',
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

  router.get('/', (_req: Request, res: Response) => {
    try {
      const agents = db.getAllAgents();
      const runner = AgentRunner.getInstance();
      const coreDb = CoreDatabase.getInstance();
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
          const stock = STOCK_MCPS.find((s) => s.name === m.mcp_name);
          let isConfigured = true;
          let missingKeys: string[] = [];
          if (stock && stock.envKeys.length > 0) {
            let cfg: Record<string, unknown> = {};
            try { cfg = JSON.parse(m.config_json); } catch {}
            const env = (cfg.env as Record<string, string>) || {};
            missingKeys = stock.envKeys.filter((k) => !env[k] && !coreDb.getSetting(k) && !process.env[k]);
            isConfigured = missingKeys.length === 0;
          }
          if (!isConfigured) unconfiguredCount++;
          return {
            ...m,
            isConfigured,
            missingKeys,
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
      const model = body.model || 'meta/llama-3.3-70b-instruct';
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
      effective_system_prompt: effectiveSystemPrompt,
    });
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

    const updated = db.updateAgent(id, patch);
    if (!updated) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    res.json(updated);
  });

  router.delete('/:id', (req: Request, res: Response) => {
    const id = getParam(req.params.id);
    db.deleteAgent(id);
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
    const mcpName = body.mcp_name;
    const label = body.label || mcpName;
    const configJson = typeof body.config === 'object' ? JSON.stringify(body.config) : body.config_json || '{}';
    const enabled = body.enabled === false ? 0 : 1;

    if (!mcpName) {
      res.status(400).json({ error: 'mcp_name is required' });
      return;
    }

    // Validate credentials for stock MCPs
    const stock = STOCK_MCPS.find((s) => s.name === mcpName);
    let hasMissingCredentials = false;
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
        hasMissingCredentials = true;
        if (body.strictAuth || !body.allowUnconfigured) {
          res.status(400).json({
            error: `MCP server "${stock.label}" requires API credential(s): ${missingKeys.join(', ')}. Please enter the key or connect via OAuth before attaching.`,
          });
          return;
        }
      }
    }

    // Prevent duplicate MCP attachment to the same agent
    const existingMcps = db.getAgentMcps(agentId);
    const alreadyExists = existingMcps.find((m) => m.mcp_name === mcpName);
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
      enabled: hasMissingCredentials ? 0 : enabled,
    });
    res.status(201).json(mcp);
  });

  router.delete('/:id/mcps/:mcpId', (req: Request, res: Response) => {
    const mcpId = getParam(req.params.mcpId);
    db.deleteAgentMcp(mcpId);
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

    const skill = db.addAgentSkill({
      id,
      agent_id: agentId,
      skill_name: skillName,
      description,
      content,
      enabled,
    });
    res.status(201).json(skill);
  });

  router.delete('/:id/skills/:skillId', (req: Request, res: Response) => {
    const skillId = getParam(req.params.skillId);
    db.deleteAgentSkill(skillId);
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
