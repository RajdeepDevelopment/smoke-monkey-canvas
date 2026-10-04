import cronParser from 'cron-parser';
import type { CanvasDatabase } from './db.js';
import type { AgentRunner, WebSocketBroadcaster } from './runner.js';

export function calculateNextRun(cronSchedule: string): string | null {
  try {
    const parse = (cronParser as any).parseExpression || (cronParser as any).default?.parseExpression || (cronParser as any);
    const expr = parse(cronSchedule);
    return expr.next().toISOString();
  } catch (err) {
    console.warn(`[CronScheduler] Invalid cron schedule "${cronSchedule}":`, err);
    return null;
  }
}

export class CronScheduler {
  private db: CanvasDatabase;
  private runner: AgentRunner;
  private ws: WebSocketBroadcaster;
  private timer: NodeJS.Timeout | null = null;
  private isChecking = false;

  constructor(db: CanvasDatabase, runner: AgentRunner, ws: WebSocketBroadcaster) {
    this.db = db;
    this.runner = runner;
    this.ws = ws;
  }

  start(intervalMs = 10000): void {
    if (this.timer) return;
    console.log('[CronScheduler] Starting background cron engine (checking every 10s)...');
    
    // Initial sync
    this.syncAllSchedules();

    this.timer = setInterval(() => {
      this.tick();
    }, intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  syncAllSchedules(): void {
    const agents = this.db.getAllAgents();
    for (const agent of agents) {
      if (agent.cron_enabled === 1 && agent.cron_schedule) {
        if (!agent.next_run_at || new Date(agent.next_run_at).getTime() < Date.now()) {
          const next = calculateNextRun(agent.cron_schedule);
          if (next) {
            this.db.updateAgent(agent.id, {
              next_run_at: next,
              status: agent.status === 'running' ? 'running' : 'scheduled',
            });
          }
        }
      }
    }
  }

  private async tick(): Promise<void> {
    if (this.isChecking) return;
    this.isChecking = true;

    try {
      const now = Date.now();
      const agents = this.db.getAllAgents();

      for (const agent of agents) {
        if (agent.cron_enabled === 1 && agent.cron_schedule) {
          // If no next_run_at or past due
          const nextRunTime = agent.next_run_at ? new Date(agent.next_run_at).getTime() : 0;
          
          if (nextRunTime <= now && nextRunTime > 0) {
            console.log(`[CronScheduler] Cron triggered for agent "${agent.name}" (${agent.id})`);
            
            // Calculate next subsequent run
            const subsequent = calculateNextRun(agent.cron_schedule);
            this.db.updateAgent(agent.id, { next_run_at: subsequent });

            this.ws.broadcast({
              type: 'cron_tick',
              agentId: agent.id,
              data: {
                triggeredAt: new Date().toISOString(),
                nextRunAt: subsequent,
              },
            });

            // If not currently running, execute!
            if (!this.runner.isAgentRunning(agent.id)) {
              this.runner.runAgent(agent.id, 'cron').catch((err) => {
                console.error(`[CronScheduler] Failed running agent ${agent.id}:`, err);
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('[CronScheduler] Error in tick cycle:', err);
    } finally {
      this.isChecking = false;
    }
  }
}
