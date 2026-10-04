import { CoreDatabase } from '../core/database.db.js';
import type { SpaceNodeRecord, SpaceAgentEntity } from './space.types.js';

export class SpaceDb {
  private coreDb: CoreDatabase;

  constructor(coreDb?: CoreDatabase) {
    this.coreDb = coreDb ?? CoreDatabase.getInstance();
  }

  getAllSpaceEntities(): SpaceAgentEntity[] {
    const stmtAgents = this.coreDb.db.prepare(`SELECT * FROM agents ORDER BY created_at DESC`);
    const agents = stmtAgents.all() as unknown as SpaceNodeRecord[];

    const stmtMcps = this.coreDb.db.prepare(`SELECT * FROM agent_mcps WHERE agent_id = ? ORDER BY created_at ASC`);
    const stmtSkills = this.coreDb.db.prepare(`SELECT * FROM agent_skills WHERE agent_id = ? ORDER BY created_at ASC`);
    const stmtLatestRun = this.coreDb.db.prepare(`SELECT * FROM runs WHERE agent_id = ? ORDER BY started_at DESC LIMIT 1`);

    return agents.map((agent) => {
      const mcps = stmtMcps.all(agent.id) as unknown as SpaceAgentEntity['mcps'];
      const skills = stmtSkills.all(agent.id) as unknown as SpaceAgentEntity['skills'];
      const latestRuns = stmtLatestRun.all(agent.id) as unknown as NonNullable<SpaceAgentEntity['latestRun']>[];

      return {
        ...agent,
        mcps,
        skills,
        latestRun: latestRuns.length > 0 ? latestRuns[0] : null,
      };
    });
  }

  updateNodePosition(id: string, posX: number, posY: number): boolean {
    const stmt = this.coreDb.db.prepare(`UPDATE agents SET pos_x = ?, pos_y = ? WHERE id = ?`);
    stmt.run(posX, posY, id);
    return true;
  }
}
