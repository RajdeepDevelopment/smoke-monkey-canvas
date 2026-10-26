import { Router, type Request, type Response } from 'express';
import { SpaceDb } from './space.db.js';
import { CoreWsServer } from '../core/ws.server.js';
import { AgentDb } from '../agent/agent.db.js';
import { resolveAgentWorkspace } from '../agent/agent.prompt.js';
import { ensureAgentWorkspace, reconcileAgentWorkspaceRuntime } from '../agent/agent.manifest.js';
import { buildSpaceWorkflow } from './space.workflow.js';
import type { SpaceZone, SpaceZoneInput, ZoneDelegationPolicy, ZoneShape } from './space.types.js';

function requestParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function asOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return value;
}

function normalizeZoneInput(body: Record<string, unknown>): Partial<SpaceZoneInput> {
  const out: Partial<SpaceZoneInput> = {};
  if (typeof body.id === 'string' && body.id.trim()) out.id = body.id.trim();
  if (typeof body.name === 'string') out.name = body.name.trim();
  if (typeof body.roleTitle === 'string') out.roleTitle = body.roleTitle.trim();
  const description = asOptionalString(body.description);
  if (description !== undefined) out.description = description;
  const responsibilities = asOptionalString(body.responsibilities);
  if (responsibilities !== undefined) out.responsibilities = responsibilities;
  const workflowInstructions = asOptionalString(body.workflowInstructions);
  if (workflowInstructions !== undefined) out.workflowInstructions = workflowInstructions;
  const level = asFiniteNumber(body.level);
  if (level !== undefined) out.level = Math.max(0, Math.floor(level));
  if (body.parentZoneId === null || typeof body.parentZoneId === 'string') {
    out.parentZoneId = asOptionalString(body.parentZoneId) ?? null;
  }
  if (body.spaceId === null || typeof body.spaceId === 'string') {
    out.spaceId = asOptionalString(body.spaceId) ?? null;
  }
  if (typeof body.color === 'string' && body.color.trim()) out.color = body.color.trim();
  if (body.shape === 'rectangle' || body.shape === 'circle') out.shape = body.shape as ZoneShape;
  const width = asFiniteNumber(body.width);
  if (width !== undefined) out.width = Math.max(160, width);
  const height = asFiniteNumber(body.height);
  if (height !== undefined) out.height = Math.max(120, height);
  const x = asFiniteNumber(body.x);
  if (x !== undefined) out.x = x;
  const y = asFiniteNumber(body.y);
  if (y !== undefined) out.y = y;
  const repoUrl = asOptionalString(body.repoUrl);
  if (repoUrl !== undefined) out.repoUrl = repoUrl;
  const workingDir = asOptionalString(body.workingDir);
  if (workingDir !== undefined) out.workingDir = workingDir;
  const projectBrief = asOptionalString(body.projectBrief);
  if (projectBrief !== undefined) out.projectBrief = projectBrief;
  if (
    body.delegationPolicy === 'auto' ||
    body.delegationPolicy === 'down' ||
    body.delegationPolicy === 'up' ||
    body.delegationPolicy === 'both' ||
    body.delegationPolicy === 'peers'
  ) {
    out.delegationPolicy = body.delegationPolicy as ZoneDelegationPolicy;
  }
  return out;
}

function wouldCreateCycle(
  zones: SpaceZone[],
  zoneId: string | undefined,
  parentZoneId: string | null | undefined,
): boolean {
  if (!zoneId || !parentZoneId) return false;
  if (zoneId === parentZoneId) return true;
  const byId = new Map(zones.map((z) => [z.id, z]));
  const visited = new Set<string>();
  let current: string | null = parentZoneId;
  while (current) {
    if (current === zoneId) return true;
    if (visited.has(current)) return false;
    visited.add(current);
    current = byId.get(current)?.parentZoneId ?? null;
  }
  return false;
}

export function createSpaceRouter(): Router {
  const router = Router();
  const spaceDb = new SpaceDb();
  const agentDb = new AgentDb();
  const wsServer = CoreWsServer.getInstance();

  router.get('/', (_req: Request, res: Response) => {
    try {
      // Reconcile every agent's workspace before reading. Agents may rewrite
      // their own (or a connected peer's) `.smoke-agent/` files — system prompt,
      // skills, MCP servers — outside a run; this imports those changes into the
      // DB and broadcasts, so the canvas agent box renders fresh attachments
      // instead of the stale DB-only rows this endpoint would otherwise return.
      for (const agent of agentDb.getAllAgents()) {
        try {
          const ws = ensureAgentWorkspace(
            resolveAgentWorkspace(agent),
            agent.id,
            agent.name,
            agent.system_prompt,
          );
          reconcileAgentWorkspaceRuntime({ agentId: agent.id, ws, db: agentDb, wsServer });
        } catch (err) {
          console.warn(`[space] Reconcile failed for agent ${agent.id}:`, err);
        }
      }

      const entities = spaceDb.getAllSpaceEntities();
      res.json(entities);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  router.get('/zones', (_req: Request, res: Response) => {
    try {
      res.json(spaceDb.getZones());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  router.post('/zones', (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const input = normalizeZoneInput(body);
      if (!input.name) {
        res.status(400).json({ error: 'Zone name is required' });
        return;
      }
      const zones = spaceDb.getZones();
      if (input.parentZoneId && !zones.some((z) => z.id === input.parentZoneId)) {
        res.status(400).json({ error: 'Parent zone not found' });
        return;
      }
      if (input.parentZoneId && input.level === undefined) {
        const parent = zones.find((z) => z.id === input.parentZoneId);
        if (parent) input.level = parent.level + 1;
      }
      const zone = spaceDb.createZone(input as SpaceZoneInput);
      wsServer.broadcast({ type: 'zone_created', data: zone });
      res.status(201).json(zone);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  router.post('/zones/batch', (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { zones?: Record<string, unknown>[] };
      const rawZones = Array.isArray(body.zones) ? body.zones : [];
      if (rawZones.length === 0) {
        res.status(400).json({ error: 'Zones array is required and must not be empty' });
        return;
      }
      const inputs: SpaceZoneInput[] = [];
      for (const item of rawZones) {
        const input = normalizeZoneInput(item);
        if (input.name) inputs.push(input as SpaceZoneInput);
      }
      const created = spaceDb.createZonesBatch(inputs);
      for (const zone of created) {
        wsServer.broadcast({ type: 'zone_created', data: zone });
      }
      res.status(201).json(created);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  router.patch('/zones/:id', (req: Request, res: Response) => {
    try {
      const id = requestParam(req.params.id);
      const zones = spaceDb.getZones();
      const existing = zones.find((z) => z.id === id);
      if (!existing) {
        res.status(404).json({ error: 'Zone not found' });
        return;
      }
      const patch = normalizeZoneInput((req.body ?? {}) as Record<string, unknown>);
      if (patch.name !== undefined && !patch.name) {
        res.status(400).json({ error: 'Zone name cannot be empty' });
        return;
      }
      if (patch.parentZoneId && !zones.some((z) => z.id === patch.parentZoneId)) {
        res.status(400).json({ error: 'Parent zone not found' });
        return;
      }
      if (wouldCreateCycle(zones, id, patch.parentZoneId)) {
        res.status(400).json({ error: 'A zone cannot be its own ancestor' });
        return;
      }
      if (patch.parentZoneId !== undefined && patch.level === undefined) {
        const parent = patch.parentZoneId ? zones.find((z) => z.id === patch.parentZoneId) : null;
        patch.level = parent ? parent.level + 1 : 0;
      }
      const updated = spaceDb.updateZone(id, patch);
      if (!updated) {
        res.status(404).json({ error: 'Zone not found' });
        return;
      }
      wsServer.broadcast({ type: 'zone_updated', data: updated });
      res.json(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  router.delete('/zones/:id', (req: Request, res: Response) => {
    try {
      const id = requestParam(req.params.id);
      const deleted = spaceDb.deleteZone(id);
      if (!deleted) {
        res.status(404).json({ error: 'Zone not found' });
        return;
      }
      wsServer.broadcast({ type: 'zone_deleted', data: { id } });
      res.json({ success: true, id });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  router.get('/workspaces/:spaceId/prompt', (req: Request, res: Response) => {
    try {
      const spaceId = requestParam(req.params.spaceId);
      if (!spaceId) {
        res.status(400).json({ error: 'Workspace id is required' });
        return;
      }
      res.json(spaceDb.getWorkspacePrompt(spaceId));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  router.put('/workspaces/:spaceId/prompt', (req: Request, res: Response) => {
    try {
      const spaceId = requestParam(req.params.spaceId);
      if (!spaceId) {
        res.status(400).json({ error: 'Workspace id is required' });
        return;
      }
      const body = (req.body ?? {}) as Record<string, unknown>;
      if (typeof body.prompt !== 'string') {
        res.status(400).json({ error: 'prompt must be a string' });
        return;
      }
      const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : null;
      const saved = spaceDb.saveWorkspacePrompt(spaceId, name, body.prompt.trim());
      wsServer.broadcast({ type: 'workspace_prompt_updated', data: saved });
      res.json(saved);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  router.put('/workspaces/:spaceId/agents', (req: Request, res: Response) => {
    try {
      const spaceId = requestParam(req.params.spaceId);
      if (!spaceId) {
        res.status(400).json({ error: 'Workspace id is required' });
        return;
      }
      const body = (req.body ?? {}) as Record<string, unknown>;
      if (!Array.isArray(body.agentIds)) {
        res.status(400).json({ error: 'agentIds must be an array' });
        return;
      }
      const agentIds = body.agentIds.filter((id): id is string => typeof id === 'string');
      spaceDb.setSpaceAgents(spaceId, agentIds);
      wsServer.broadcast({
        type: 'workspace_agents_updated',
        data: { spaceId, agentIds },
      });
      res.json({ success: true, spaceId, agentIds });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  router.get('/workflow', (_req: Request, res: Response) => {
    try {
      res.json(buildSpaceWorkflow(agentDb, spaceDb));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  router.patch('/nodes/:id/position', (req: Request, res: Response) => {
    const id = requestParam(req.params.id);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const posX = body.posX;
    const posY = body.posY;

    if (typeof posX !== 'number' || typeof posY !== 'number') {
      res.status(400).json({ error: 'posX and posY numbers are required' });
      return;
    }

    const hasSpaceId = Object.prototype.hasOwnProperty.call(body, 'spaceId');
    const spaceId =
      hasSpaceId && typeof body.spaceId === 'string' && body.spaceId.trim()
        ? body.spaceId.trim()
        : null;

    try {
      spaceDb.updateNodePosition(id, posX, posY, hasSpaceId ? spaceId : undefined);
      wsServer.broadcast({
        type: 'node_moved',
        agentId: id,
        data: { id, posX, posY, ...(hasSpaceId ? { spaceId } : {}) },
      });
      res.json({ success: true, id, posX, posY, ...(hasSpaceId ? { spaceId } : {}) });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  return router;
}
