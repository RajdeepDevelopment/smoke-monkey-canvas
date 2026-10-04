import { Router, type Request, type Response } from 'express';
import {
  PERSONALITY_PRESETS,
  OUTPUT_STYLE_PRESETS,
  PERSONALITY_CATEGORIES,
  OUTPUT_STYLE_CATEGORIES,
} from './agent.presets.js';

/**
 * Serves the drag-and-drop preset catalogue to the Library sidebar.
 *
 * Mounted at its own path rather than under `/api/agents/:id/...` so the
 * catalogue can never be shadowed by an `:id` route.
 */
export function createPersonalityRouter(): Router {
  const router = Router();

  router.get('/presets', (_req: Request, res: Response) => {
    res.json({
      personality: {
        categories: PERSONALITY_CATEGORIES,
        presets: PERSONALITY_PRESETS,
      },
      output: {
        categories: OUTPUT_STYLE_CATEGORIES,
        presets: OUTPUT_STYLE_PRESETS,
      },
    });
  });

  return router;
}