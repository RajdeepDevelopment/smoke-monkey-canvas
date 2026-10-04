import { Router, type Request, type Response } from 'express';
import type { CanvasDatabase } from './db.js';
import type { AgentRunner } from './runner.js';
import { STOCK_MCPS } from './stock.js';
import { calculateNextRun } from './cron.js';

export function createApiRouter(db: CanvasDatabase, runner: AgentRunner): Router {
  const router = Router();

  // ── Stock MCP Catalog ──────────────────────────────────────────────────────
  router.get('/stock-mcps', (_req: Request, res: Response) => {
    res.json(STOCK_MCPS);
  });

  // ── Agents CRUD ────────────────────────────────────────────────────────────
  router.get('/agents', (_req: Request, res: Response) => {
    const agents = db.getAllAgents();
    const result = agents.map((agent) => {
      const mcps = db.getAgentMcps(agent.id);
      const skills = db.getAgentSkills(agent.id);
      const runs = db.getAgentRuns(agent.id, 1);
      const latestRun = runs.length > 0 ? runs[0] : null;
      return {
        ...agent,
        mcps,
        skills,
        latestRun,
      };
    });
    res.json(result);
  });

  router.post('/agents', (req: Request, res: Response) => {
    const body = req.body || {};
    const id = body.id || `agent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const name = body.name || 'Autonomous Agent';
    const model = body.model || 'meta/llama-3.3-70b-instruct';
    const provider = body.provider || 'nvidia';
    const systemPrompt =
      body.system_prompt ||
      'You are an autonomous AI specialist agent created on Smoke Monkey Canvas. Complete assigned tasks efficiently with the tools and MCPs available.';
    const cronSchedule = body.cron_schedule || null;
    const cronEnabled = body.cron_enabled ? 1 : 0;
    const posX = typeof body.pos_x === 'number' ? body.pos_x : 250;
    const posY = typeof body.pos_y === 'number' ? body.pos_y : 200;

    let nextRunAt: string | null = null;
    if (cronEnabled && cronSchedule) {
      nextRunAt = calculateNextRun(cronSchedule);
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
    });

    res.status(201).json({
      ...agent,
      mcps: [],
      skills: [],
      latestRun: null,
    });
  });

  router.get('/agents/:id', (req: Request, res: Response) => {
    const agent = db.getAgent(req.params.id);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    const mcps = db.getAgentMcps(agent.id);
    const skills = db.getAgentSkills(agent.id);
    const runs = db.getAgentRuns(agent.id, 5);
    res.json({
      ...agent,
      mcps,
      skills,
      runs,
    });
  });

  router.patch('/agents/:id', (req: Request, res: Response) => {
    const id = req.params.id;
    const body = req.body || {};
    const patch: Record<string, unknown> = {};

    if (body.name !== undefined) patch.name = body.name;
    if (body.model !== undefined) patch.model = body.model;
    if (body.provider !== undefined) patch.provider = body.provider;
    if (body.system_prompt !== undefined) patch.system_prompt = body.system_prompt;
    if (body.cron_schedule !== undefined) patch.cron_schedule = body.cron_schedule;
    if (body.cron_enabled !== undefined) {
      patch.cron_enabled = body.cron_enabled ? 1 : 0;
      if (body.cron_enabled && (body.cron_schedule || patch.cron_schedule)) {
        const schedule = (body.cron_schedule || patch.cron_schedule) as string;
        patch.next_run_at = calculateNextRun(schedule);
        patch.status = 'scheduled';
      } else if (!body.cron_enabled) {
        patch.next_run_at = null;
        patch.status = 'idle';
      }
    }
    if (typeof body.pos_x === 'number') patch.pos_x = body.pos_x;
    if (typeof body.pos_y === 'number') patch.pos_y = body.pos_y;
    if (body.status !== undefined) patch.status = body.status;

    const updated = db.updateAgent(id, patch);
    if (!updated) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    res.json(updated);
  });

  router.delete('/agents/:id', (req: Request, res: Response) => {
    db.deleteAgent(req.params.id);
    res.json({ success: true, id: req.params.id });
  });

  // ── Run Trigger ───────────────────────────────────────────────────────────
  router.post('/agents/:id/run', async (req: Request, res: Response) => {
    const id = req.params.id;
    const body = req.body || {};
    try {
      const run = await runner.runAgent(id, 'manual', body.prompt);
      res.status(202).json({ success: true, run });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ error: msg });
    }
  });

  // ── MCP Attachments ───────────────────────────────────────────────────────
  router.post('/agents/:id/mcps', (req: Request, res: Response) => {
    const agentId = req.params.id;
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

    const mcp = db.addAgentMcp({
      id,
      agent_id: agentId,
      mcp_name: mcpName,
      label,
      config_json: configJson,
      enabled,
    });
    res.status(201).json(mcp);
  });

  router.delete('/agents/:id/mcps/:mcpId', (req: Request, res: Response) => {
    db.deleteAgentMcp(req.params.mcpId);
    res.json({ success: true, id: req.params.mcpId });
  });

  // ── Skill Attachments ─────────────────────────────────────────────────────
  router.post('/agents/:id/skills', (req: Request, res: Response) => {
    const agentId = req.params.id;
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

  router.delete('/agents/:id/skills/:skillId', (req: Request, res: Response) => {
    db.deleteAgentSkill(req.params.skillId);
    res.json({ success: true, id: req.params.skillId });
  });

  // ── Runs and Events ───────────────────────────────────────────────────────
  router.get('/agents/:id/runs', (req: Request, res: Response) => {
    const runs = db.getAgentRuns(req.params.id, 50);
    res.json(runs);
  });

  router.get('/runs/:runId', (req: Request, res: Response) => {
    const run = db.getRun(req.params.runId);
    if (!run) {
      res.status(404).json({ error: 'Run not found' });
      return;
    }
    const events = db.getRunEvents(req.params.runId);
    res.json({ ...run, events });
  });

  return router;
}
