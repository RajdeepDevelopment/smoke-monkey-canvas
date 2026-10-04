import { Router, type Request, type Response } from 'express';
import { SpaceDb } from './space.db.js';
import { CoreWsServer } from '../core/ws.server.js';

export function createSpaceRouter(): Router {
  const router = Router();
  const spaceDb = new SpaceDb();
  const wsServer = CoreWsServer.getInstance();

  router.get('/', (_req: Request, res: Response) => {
    try {
      const entities = spaceDb.getAllSpaceEntities();
      res.json(entities);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  router.patch('/nodes/:id/position', (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id || '');
    const { posX, posY } = req.body || {};

    if (typeof posX !== 'number' || typeof posY !== 'number') {
      res.status(400).json({ error: 'posX and posY numbers are required' });
      return;
    }

    try {
      spaceDb.updateNodePosition(id, posX, posY);
      wsServer.broadcast({
        type: 'node_moved',
        agentId: id,
        data: { id, posX, posY },
      });
      res.json({ success: true, id, posX, posY });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  return router;
}
