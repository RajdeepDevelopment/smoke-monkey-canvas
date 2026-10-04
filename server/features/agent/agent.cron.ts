import cronParser from 'cron-parser';
import { AgentDb } from './agent.db.js';
import { AgentRunner } from './agent.runner.js';
import { CoreWsServer } from '../core/ws.server.js';

export function calculateNextCronRun(cronSchedule: string): string | null {
  try {
    const parse = (cronParser as any).parseExpression || (cronParser as any).default?.parseExpression || (cronParser as any);
    if (cronSchedule.includes(';') || cronSchedule.includes('\n')) {
      const parts = cronSchedule.split(/[;\n]/).map((s) => s.trim()).filter(Boolean);
      let earliest: Date | null = null;
      for (const p of parts) {
        try {
          const expr = parse(p);
          const nextDate = expr.next().toDate();
          if (!earliest || nextDate.getTime() < earliest.getTime()) {
            earliest = nextDate;
          }
        } catch {}
      }
      return earliest ? earliest.toISOString() : null;
    }
    const expr = parse(cronSchedule);
    return expr.next().toISOString();
  } catch (err) {
    console.warn(`[AgentCronScheduler] Invalid cron expression "${cronSchedule}":`, err);
    return null;
  }
}

export class AgentCronScheduler {
  private static instance: AgentCronScheduler | null = null;
  private db: AgentDb;
  private runner: AgentRunner;
  private ws: CoreWsServer;
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(db?: AgentDb, runner?: AgentRunner, ws?: CoreWsServer) {
    this.db = db ?? new AgentDb();
    this.runner = runner ?? AgentRunner.getInstance();
    this.ws = ws ?? CoreWsServer.getInstance();
  }

  static getInstance(): AgentCronScheduler {
    if (!AgentCronScheduler.instance) {
      AgentCronScheduler.instance = new AgentCronScheduler();
    }
    return AgentCronScheduler.instance;
  }

  start(intervalMs = 10000): void {
    if (this.timer) return;
    console.log('[AgentCronScheduler] Initializing cron engine (checking every 10s)...');
    this.syncAllAgentSchedules();

    this.timer = setInterval(() => {
      this.checkAndExecuteDueAgents();
    }, intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  syncAllAgentSchedules(): void {
    const agents = this.db.getAllAgents();
    for (const agent of agents) {
      if (agent.cron_enabled === 1 && agent.cron_schedule) {
        if (!agent.next_run_at || new Date(agent.next_run_at).getTime() < Date.now()) {
          const next = calculateNextCronRun(agent.cron_schedule);
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

  private async checkAndExecuteDueAgents(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = Date.now();
      const agents = this.db.getAllAgents();

      for (const agent of agents) {
        if (agent.cron_enabled === 1 && agent.cron_schedule) {
          const nextRunEpoch = agent.next_run_at ? new Date(agent.next_run_at).getTime() : 0;

          if (nextRunEpoch <= now && nextRunEpoch > 0) {
            console.log(`[AgentCronScheduler] Triggering scheduled run for "${agent.name}" (${agent.id})`);

            const subsequent = calculateNextCronRun(agent.cron_schedule);
            this.db.updateAgent(agent.id, { next_run_at: subsequent });

            this.ws.broadcast({
              type: 'cron_tick',
              agentId: agent.id,
              data: {
                triggeredAt: new Date().toISOString(),
                nextRunAt: subsequent,
              },
            });

            const activeRuns = this.runner.getActiveRuns(agent.id);
            const hasActiveCron = activeRuns.some((r) => r.triggerType === 'cron');
            if (!hasActiveCron) {
              this.runner.runAgent(agent.id, 'cron').catch((err) => {
                console.error(`[AgentCronScheduler] Error executing scheduled agent ${agent.id}:`, err);
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('[AgentCronScheduler] Cycle tick error:', err);
    } finally {
      this.isProcessing = false;
    }
  }
}
