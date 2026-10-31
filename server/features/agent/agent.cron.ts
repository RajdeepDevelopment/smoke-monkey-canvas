import cronParser from 'cron-parser';
import { AgentDb } from './agent.db.js';
import { AgentRunner } from './agent.runner.js';
import { CoreWsServer } from '../core/ws.server.js';
import {
  compactAgentWorkspaceFiles,
  generateAgentEodReport,
  ensureDefaultAgentCronJobs,
} from './agent.memory-compactor.js';
import { checkAgentConfigStatus } from './agent.config-check.js';
import type { AgentCronJobRecord } from './agent.types.js';

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

  syncFromDatabase(): void {
    this.syncAllAgentSchedules();
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
      // 1. Ensure default system jobs exist for this agent (Compactor & EOD)
      try {
        ensureDefaultAgentCronJobs(agent.id, this.db);
      } catch {}

      // 2. Sync next_run_at for all jobs belonging to this agent
      const jobs = this.db.getAgentCronJobs(agent.id);
      for (const job of jobs) {
        const isOnce = job.cron_schedule.toLowerCase().startsWith('once') || job.cron_schedule === '@once';
        if (job.enabled === 1 && !isOnce && (!job.next_run_at || new Date(job.next_run_at).getTime() < Date.now())) {
          const next = calculateNextCronRun(job.cron_schedule);
          if (next) {
            this.db.updateAgentCronJob(job.id, { next_run_at: next });
          }
        }
      }

      // 3. Backward-compatible legacy agent single-cron sync
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

  /**
   * Triggers an immediate execution of a scheduled cron job on demand.
   */
  async triggerJobNow(jobId: string): Promise<void> {
    const job = this.db.getCronJob(jobId);
    if (!job) throw new Error('Cron job not found');
    await this.executeJob(job);
  }

  private async executeJob(job: AgentCronJobRecord): Promise<void> {
    const agent = this.db.getAgent(job.agent_id);
    if (!agent) return;

    // Validate if the agent has all required MCP credentials and is in a running condition
    const configStatus = checkAgentConfigStatus(agent.id, this.db);
    if (!configStatus.isConfigured) {
      console.log(
        `[AgentCronScheduler] Pausing cron job "${job.name}" for "${agent.name}" (${job.agent_id}) — agent has unconfigured MCPs or missing credentials: ${configStatus.reasons.join('; ')}`,
      );
      const isOnce = job.cron_schedule.toLowerCase().startsWith('once') || job.cron_schedule === '@once';
      const subsequent = isOnce ? null : calculateNextCronRun(job.cron_schedule);
      this.db.updateAgentCronJob(job.id, { next_run_at: subsequent });

      this.ws.broadcast({
        type: 'cron_job_skipped_unconfigured',
        agentId: agent.id,
        data: {
          jobId: job.id,
          jobName: job.name,
          reasons: configStatus.reasons,
        },
      });
      return;
    }

    console.log(`[AgentCronScheduler] Executing cron job "${job.name}" for "${agent.name}" (${job.agent_id})`);

    const isOnce = job.cron_schedule.toLowerCase().startsWith('once') || job.cron_schedule === '@once';
    const subsequent = isOnce ? null : calculateNextCronRun(job.cron_schedule);
    this.db.recordCronJobRun(job.id, subsequent);
    if (isOnce) {
      this.db.updateAgentCronJob(job.id, { enabled: 0, next_run_at: null });
    }

    this.ws.broadcast({
      type: 'cron_job_triggered',
      agentId: agent.id,
      data: {
        jobId: job.id,
        jobName: job.name,
        triggeredAt: new Date().toISOString(),
        nextRunAt: subsequent,
      },
    });

    // Execute the agent autonomously using its full toolset with the job's prompt
    try {
      console.log(`[AgentCronScheduler] Triggering agent run for "${agent.name}" with task "${job.name}"`);
      let executionPrompt = job.prompt;
      if (!executionPrompt.includes('mark_cron_job_success')) {
        executionPrompt +=
          "\n\n[MANDATORY COMPLETION]: You MUST invoke the 'mark_cron_job_success' tool with your completion summary upon finishing. If this tool is not called, the operation will be considered incomplete/failed and retried.";
      }
      await this.runner.runAgent(agent.id, 'cron', executionPrompt, undefined, undefined, {
        jobId: job.id,
        jobName: job.name,
      });
    } catch (err) {
      console.error(`[AgentCronScheduler] Error executing task "${job.name}" for "${agent.name}":`, err);
    }
  }

  private async checkAndExecuteDueAgents(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = Date.now();

      // Check dedicated multi-cron jobs
      const activeJobs = this.db.getAllActiveCronJobs();
      for (const job of activeJobs) {
        if (!job.next_run_at) continue;
        const nextEpoch = new Date(job.next_run_at).getTime();
        if (nextEpoch <= now && nextEpoch > 0) {
          const configStatus = checkAgentConfigStatus(job.agent_id, this.db);
          if (!configStatus.isConfigured) {
            // Agent is not in running condition (unconfigured MCPs/credentials) -> pause/skip until configured
            const isOnce = job.cron_schedule.toLowerCase().startsWith('once') || job.cron_schedule === '@once';
            const subsequent = isOnce ? null : calculateNextCronRun(job.cron_schedule);
            this.db.updateAgentCronJob(job.id, { next_run_at: subsequent });
            continue;
          }
          await this.executeJob(job);
        }
      }

      // Legacy single-cron check for agents with direct cron_schedule
      const agents = this.db.getAllAgents();
      for (const agent of agents) {
        if (agent.cron_enabled === 1 && agent.cron_schedule) {
          const nextRunEpoch = agent.next_run_at ? new Date(agent.next_run_at).getTime() : 0;

          if (nextRunEpoch <= now && nextRunEpoch > 0) {
            const subsequent = calculateNextCronRun(agent.cron_schedule);
            this.db.updateAgent(agent.id, { next_run_at: subsequent });

            const configStatus = checkAgentConfigStatus(agent.id, this.db);
            if (!configStatus.isConfigured) {
              console.log(
                `[AgentCronScheduler] Pausing legacy cron for "${agent.name}" (${agent.id}) — unconfigured: ${configStatus.reasons.join('; ')}`,
              );
              continue;
            }

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

