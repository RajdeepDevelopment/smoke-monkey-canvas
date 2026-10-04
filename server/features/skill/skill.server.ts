import { Router, type Request, type Response } from 'express';
import { CoreDatabase, SKILL_CATEGORIES } from '../core/database.db.js';

export function createSkillRouter(): Router {
  const router = Router();
  const db = CoreDatabase.getInstance();

  // GET /api/skills/categories
  router.get('/categories', (_req: Request, res: Response) => {
    res.json(SKILL_CATEGORIES);
  });

  // GET /api/skills/stock
  router.get('/stock', (_req: Request, res: Response) => {
    try {
      const skills = db.getAllStockSkills();
      res.json(skills);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  // POST /api/skills/upload (single or batch upload)
  router.post('/upload', (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      const items = Array.isArray(body) ? body : [body];
      const created = [];

      for (const item of items) {
        if (!item.name || !item.content) continue;
        const id = item.id || `skill_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const category = item.category || 'Backend & APIs';
        const name = item.name;
        const description = item.description || null;
        const content = item.content;

        const record = db.addStockSkill({
          id,
          category,
          name,
          description,
          content,
          is_bundled: 0,
        });
        created.push(record);
      }

      res.status(201).json({ success: true, count: created.length, skills: created });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  return router;
}
