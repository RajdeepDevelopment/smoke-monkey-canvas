import fs from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';
import type { AgentDb } from './agent.db.js';
import type { AgentRecord, RunRecord } from './agent.types.js';
import { calculateNextCronRun } from './agent.cron.js';

/**
 * Resolves the absolute workspace path for an agent.
 */
export function resolveWorkspacePath(agent: AgentRecord): string {
  if (agent.working_dir && agent.working_dir.trim() && fs.existsSync(agent.working_dir.trim())) {
    return path.resolve(agent.working_dir.trim());
  }
  const slug = agent.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const idPrefix = agent.id.slice(0, 8);
  const home = homedir();
  const dir = path.join(home, '.smoke-agents', `${slug}-${idPrefix}`);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * High-density markdown summarizer that compresses oversized markdown memory files
 * (working.md, reflective.md, symmetric.md) into ~60 structured lines retaining all key facts.
 */
function compressMarkdownTo60Lines(rawContent: string, fileName: string): string {
  const lines = rawContent.split('\n');
  if (lines.length <= 60) return rawContent;

  const titleMatch = rawContent.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : path.basename(fileName, '.md').toUpperCase();

  // Extract sections
  const sections: { heading: string; items: string[] }[] = [];
  let currentHeading = 'Core Context & Goals';
  let currentItems: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('#')) {
      if (currentItems.length > 0) {
        sections.push({ heading: currentHeading, items: currentItems });
        currentItems = [];
      }
      currentHeading = trimmed.replace(/^#+\s*/, '');
    } else {
      // Clean leading bullet markers
      const clean = trimmed.replace(/^[-*•]\s*/, '').trim();
      if (clean) currentItems.push(clean);
    }
  }
  if (currentItems.length > 0) {
    sections.push({ heading: currentHeading, items: currentItems });
  }

  // Budget lines across sections to reach ~55-60 lines total
  const outLines: string[] = [
    `# ${title} (Compacted Memory)`,
    `> Last compacted: ${new Date().toISOString()} | Target ~60 lines retaining essential facts, state & decisions.`,
    '',
  ];

  const maxItemsPerSection = Math.max(3, Math.floor(45 / Math.max(1, sections.length)));

  for (const sec of sections) {
    if (outLines.length >= 56) break;
    outLines.push(`## ${sec.heading}`);
    // Deduplicate and prioritize recent or key-value items
    const unique = [...new Set(sec.items)];
    const chosen = unique.slice(-maxItemsPerSection);
    for (const item of chosen) {
      if (outLines.length >= 58) break;
      const truncated = item.length > 140 ? `${item.slice(0, 137)}...` : item;
      outLines.push(`- ${truncated}`);
    }
    outLines.push('');
  }

  return outLines.join('\n').trim() + '\n';
}

export interface CompactionResult {
  compactedFiles: string[];
  skippedFiles: string[];
  checkedFiles: number;
}

/**
 * Checks and compacts oversized markdown files in an agent workspace.
 * Strict conditional execution: Only touches files modified since the last compaction cycle.
 */
export async function compactAgentWorkspaceFiles(
  agentId: string,
  db: AgentDb,
): Promise<CompactionResult> {
  const agent = db.getAgent(agentId);
  if (!agent) return { compactedFiles: [], skippedFiles: [], checkedFiles: 0 };

  const workspace = resolveWorkspacePath(agent);
  if (!fs.existsSync(workspace)) {
    return { compactedFiles: [], skippedFiles: [], checkedFiles: 0 };
  }

  const entries = fs.readdirSync(workspace, { withFileTypes: true });
  const compactedFiles: string[] = [];
  const skippedFiles: string[] = [];
  let checkedFiles = 0;

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    // Skip EOD reports folder files or generated run files
    if (entry.name.startsWith('run_') || entry.name.startsWith('test_')) continue;

    checkedFiles++;
    const fullPath = path.join(workspace, entry.name);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(fullPath);
    } catch {
      continue;
    }

    const previousCompaction = db.getFileCompaction(agentId, fullPath);

    // Conditional guard: Skip if file has NOT been modified since last compaction
    if (previousCompaction && stat.mtimeMs <= previousCompaction.last_mtime) {
      skippedFiles.push(`${entry.name} (unmodified)`);
      continue;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const lineCount = content.split('\n').length;

    // If within standard size (<= 60 lines), record mtime and skip
    if (lineCount <= 60) {
      db.recordFileCompaction(agentId, fullPath, stat.mtimeMs, lineCount);
      skippedFiles.push(`${entry.name} (<=60 lines)`);
      continue;
    }

    // File exceeds 60 lines and was modified: compress into ~60 lines
    try {
      const compacted = compressMarkdownTo60Lines(content, entry.name);
      fs.writeFileSync(fullPath, compacted, 'utf8');
      const newStat = fs.statSync(fullPath);
      const newLineCount = compacted.split('\n').length;
      db.recordFileCompaction(agentId, fullPath, newStat.mtimeMs, newLineCount);
      compactedFiles.push(`${entry.name} (${lineCount} → ${newLineCount} lines)`);
    } catch (err) {
      console.warn(`[Compactor] Error compacting ${fullPath}:`, err);
    }
  }

  return { compactedFiles, skippedFiles, checkedFiles };
}

/**
 * Gathers today's runs for an agent and writes an End-of-Day (EOD) summary report
 * into the agent's dedicated `eod_reports/` directory.
 * Hierarchical managers can inspect this folder to review subordinate daily accomplishments.
 */
export async function generateAgentEodReport(
  agentId: string,
  db: AgentDb,
): Promise<string | null> {
  const agent = db.getAgent(agentId);
  if (!agent) return null;

  const workspace = resolveWorkspacePath(agent);
  const eodDir = path.join(workspace, 'eod_reports');
  if (!fs.existsSync(eodDir)) {
    fs.mkdirSync(eodDir, { recursive: true });
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const allRuns: RunRecord[] = db.getAgentRuns(agentId, 100);
  const todayRuns: RunRecord[] = allRuns.filter((r: RunRecord) => {
    const d = new Date(r.started_at);
    return d >= startOfToday;
  });

  // If agent has not executed any tasks today, skip EOD generation
  if (todayRuns.length === 0) {
    return null;
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const eodFilePath = path.join(eodDir, `${todayIso}.md`);

  const completedCount = todayRuns.filter((r) => r.status === 'completed').length;
  const failedCount = todayRuns.filter((r) => r.status === 'failed').length;

  const lines: string[] = [
    `# End-of-Day (EOD) Summary Report — ${todayIso}`,
    '',
    `**Agent:** ${agent.name} (${agent.role || 'Specialist'})  `,
    `**Workspace:** \`${workspace}\`  `,
    `**Date / Time:** ${new Date().toLocaleString()}  `,
    `**Daily Executions:** ${todayRuns.length} total (${completedCount} completed, ${failedCount} failed)  `,
    '',
    '## 1. Summary of Completed Tasks & Outcomes',
  ];

  todayRuns.forEach((run, idx) => {
    lines.push(`### Run #${todayRuns.length - idx}: [${run.status.toUpperCase()}] ${run.trigger_type.toUpperCase()}`);
    lines.push(`- **Started:** ${run.started_at} | **Finished:** ${run.completed_at || 'in-progress'}`);
    if (run.task_prompt) {
      const promptSnippet = run.task_prompt.split('\n')[0].slice(0, 120);
      lines.push(`- **Task Objective:** ${promptSnippet}`);
    }
    if (run.summary) {
      lines.push(`- **Outcome:** ${run.summary.trim()}`);
    }
    if (run.error) {
      lines.push(`- **Error / Blocker:** \`${run.error.trim()}\``);
    }
    lines.push('');
  });

  lines.push('## 2. Key Deliverables & Workspace Status');
  lines.push(`- Total active runs tracked today: ${todayRuns.length}`);
  lines.push(`- Output reports generated: Check \`${workspace}/reports/\` for detailed artifacts.`);
  lines.push('');
  lines.push('## 3. Manager Escalations & Blockers');
  const errorRuns = todayRuns.filter((r) => r.error);
  if (errorRuns.length > 0) {
    lines.push(`- ⚠️ ${errorRuns.length} run(s) encountered errors requiring review.`);
  } else {
    lines.push('- ✅ All runs executed successfully today without unresolved blockers.');
  }
  lines.push('');

  fs.writeFileSync(eodFilePath, lines.join('\n'), 'utf8');
  return eodFilePath;
}

/**
 * Staggered Cron Slot Allocation Algorithm:
 *
 * Prevents "thundering herd" concurrent model rate limits when dozens or hundreds of agents
 * run workspace compaction, EOD reporting, or self-refinement concurrently.
 *
 * - Default slot step: 3 minutes between each agent.
 * - Dynamic capacity scaling:
 *   - <= 80 agents: 3-minute slots (across 4 hours: 09:00 - 13:00)
 *   - 81 - 120 agents: 2-minute slots (across 4 hours: 09:00 - 13:00)
 *   - 121 - 240 agents: 1-minute slots (across 4 hours: 09:00 - 13:00)
 *   - > 240 agents: expands to 8-hour window (09:00 - 17:00 = 480m) with dynamic step Math.max(1, Math.floor(480 / totalAgents))
 */
export function calculateStaggeredAgentCronSlots(
  agentId: string,
  db: AgentDb,
): {
  compactorSchedule: string;
  eodSchedule: string;
  refinementSchedule: string;
  slotIndex: number;
  stepMinutes: number;
} {
  const allAgents = db.getAllAgents().slice().sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (aTime !== bTime) return aTime - bTime;
    return a.id.localeCompare(b.id);
  });

  let slotIndex = allAgents.findIndex((a) => a.id === agentId);
  if (slotIndex === -1) {
    slotIndex = allAgents.length;
  }

  const totalAgents = Math.max(allAgents.length, slotIndex + 1, 1);

  // Determine slot step (user requested 3 minutes default, reducing if slots fill up)
  let windowMinutes = 240; // 4-hour primary window (09:00 - 13:00)
  let stepMinutes = 3;

  if (totalAgents * 3 <= 240) {
    stepMinutes = 3;
    windowMinutes = 240;
  } else if (totalAgents * 2 <= 240) {
    stepMinutes = 2;
    windowMinutes = 240;
  } else if (totalAgents <= 240) {
    stepMinutes = 1;
    windowMinutes = 240;
  } else {
    // 240+ agents: expand to full 8-hour window (480 minutes)
    windowMinutes = 480;
    stepMinutes = Math.max(1, Math.floor(480 / totalAgents));
  }

  // 1. Workspace Markdown Compactor (Morning starting at 09:00 + Afternoon starting at 15:00)
  const compactorOffset = (slotIndex * stepMinutes) % windowMinutes;
  const compactorMinute = compactorOffset % 60;
  const compactorHourMorning = 9 + Math.floor(compactorOffset / 60);
  const compactorHourAfternoon = 15 + Math.floor(compactorOffset / 60);
  const compactorSchedule = `${compactorMinute} ${compactorHourMorning},${compactorHourAfternoon} * * *`;

  // 2. Daily EOD Task Summary: starts at 18:00 (6:00 PM), staggered across 18:00 - 22:00
  const eodOffset = (slotIndex * stepMinutes) % 240;
  const eodMinute = eodOffset % 60;
  const eodHour = 18 + Math.floor(eodOffset / 60);
  const eodSchedule = `${eodMinute} ${eodHour} * * *`;

  // 3. Self-Refinement & Specialization: starts at 20:00 (8:00 PM), staggered across 20:00 - 24:00
  const refineOffset = (slotIndex * stepMinutes) % 240;
  const refineMinute = refineOffset % 60;
  const refineHour = 20 + Math.floor(refineOffset / 60);
  const refinementSchedule = `${refineMinute} ${refineHour} * * *`;

  return {
    compactorSchedule,
    eodSchedule,
    refinementSchedule,
    slotIndex,
    stepMinutes,
  };
}

export const WORKSPACE_COMPACTOR_PROMPT =
  'You are executing the scheduled Workspace Markdown Compactor routine.\n' +
  'Inspect and distill your persistent markdown memory files located in your workspace memory directory:\n' +
  '1. `symmetric.md`: Core system facts, team architecture, operational boundaries, and persistent project invariants.\n' +
  '2. `working.md`: Current sprint tasks, active milestones, scratchpad state, and in-progress deliverables.\n' +
  '3. `reflective.md`: Learned domain heuristics, past issue resolutions, tool edge-cases, and specialization insights.\n' +
  '4. `procedural.md`: Standard operating procedures, multi-step workflows, and execution protocols.\n\n' +
  'Instructions:\n' +
  '- Inspect each file. If any file has grown beyond 60 lines or contains redundant, conversational logs, compress and distill it into ~60 lines.\n' +
  '- Preserve all critical technical facts, file paths, repository keys, decision records, and active task items.\n' +
  '- Maintain clean markdown headings and bullet points. Never truncate or discard essential instructions or active invariants.\n' +
  '- If a file is already concise (≤ 60 lines) and contains only relevant facts, leave it unchanged.\n' +
  '- Write updated content back using write_file. Do not delete files.';

export const DAILY_EOD_PROMPT =
  'You are executing the scheduled Daily End-of-Day (EOD) Task Summary routine.\n' +
  'Review all tasks, tool invocations, and workspace file changes executed today to produce an executive-ready progress report.\n\n' +
  'Instructions:\n' +
  '1. Review today\'s chat sessions, execution runs, and completed operations.\n' +
  '2. If tasks were executed today, compile a structured report with these sections:\n' +
  '   - ## 🎯 Accomplishments: High-level deliverables, solved problems, and completed milestones.\n' +
  '   - ## 🛠️ Tools & MCP Integrations: External services or CLI tools leveraged and their outcomes.\n' +
  '   - ## 📁 Workspace Deliverables: Exact paths of files created or modified.\n' +
  '   - ## 🚧 Blockers & Pending Items: Incomplete work, unresolved dependencies, or human approval required.\n' +
  '   - ## 📈 Metrics & Next Steps: Quantifiable impact and priorities for the next session.\n' +
  '3. Write this summary to `eod_reports/YYYY-MM-DD.md` (substituting today\'s date) with YAML frontmatter:\n' +
  '---\n' +
  'date: YYYY-MM-DD\n' +
  'agent: [Your Agent Name]\n' +
  'status: [completed | in-progress | blocked]\n' +
  'tasks_count: [Number of tasks completed]\n' +
  '---\n' +
  '4. If no tasks or operations were performed today, record a brief 2-line entry in `eod_reports/YYYY-MM-DD.md` noting the idle status so operational logs remain complete.';

export const SELF_REFINEMENT_PROMPT =
  'You are executing the scheduled Self-Refinement, Specialization & Automation routine.\n' +
  'Your objective is to sharpen your domain expertise, eliminate recurring friction, and create reusable automation scripts for repetitive tasks you perform.\n\n' +
  'Instructions:\n' +
  '1. REVIEW RECENT ACTIVITY:\n' +
  '   - Examine your recent conversations, tool calls, and user requests. Identify any mistakes, slow multi-step workflows, or repeated manual tasks.\n\n' +
  '2. BUILD REUSABLE AUTOMATION SCRIPTS:\n' +
  '   - Notice repeated tasks: If the user or workflows frequently ask you to perform similar operations (e.g. log filtering, test analysis, data formatting, code linting, diff auditing, dependency checks, report generation, API syncing):\n' +
  '   - Generate a parameterized automation script (in Python, Bash, or Node.js) saved in `automation/` or `scripts/` (e.g. `scripts/task_runner.py`).\n' +
  '   - Every automation script must include:\n' +
  '     * Clear header comment explaining the script\'s purpose.\n' +
  '     * Documented input arguments and CLI flags (e.g. `--input`, `--format`, `--target`).\n' +
  '     * Robust error handling and exit codes.\n' +
  '     * No hardcoded credentials (use environment variables `$VAR_NAME`).\n' +
  '   - Register the automation in `automation/index.json` (under `"automations"`) with:\n' +
  '     * `file`: Relative path to the script (e.g. "scripts/analyze_logs.py")\n' +
  '     * `purpose`: Exact explanation of what the script does\n' +
  '     * `inputs`: Description of all arguments and input formats it accepts\n' +
  '     * `whenToUse`: Specific trigger condition explaining when you should run this script instead of manual tool calls\n' +
  '     * `created`: Timestamp\n' +
  '   - Document this automation in `memory/reflective.md` and `memory/procedural.md` so future runs immediately reach for this script to execute tasks 10x faster and without manual mistakes.\n\n' +
  '3. REFINE DOMAIN KNOWLEDGE:\n' +
  '   - Update `memory/reflective.md` with:\n' +
  '     * Specialized domain heuristics and best practices you\'ve acquired.\n' +
  '     * Edge cases to avoid and self-corrections from past errors.\n' +
  '     * New skills, tools, or MCP patterns that worked effectively.';

/**
 * Ensures standard default cron jobs exist for every agent with staggered time slots:
 * 1. Twice-Daily Workspace Compactor (9 AM & 3 PM + staggered slot offset)
 * 2. Daily End-of-Day Summary (6:00 PM + staggered slot offset)
 * 3. Daily Self-Refinement & Specialization (8:00 PM + staggered slot offset)
 */
export function ensureDefaultAgentCronJobs(agentId: string, db: AgentDb): void {
  const { compactorSchedule, eodSchedule, refinementSchedule } = calculateStaggeredAgentCronSlots(agentId, db);
  const existingJobs = db.getAgentCronJobs(agentId);

  // 1. Workspace Markdown Compactor
  const compactor = existingJobs.find((j) => j.name === 'Workspace Markdown Compactor');
  if (!compactor) {
    const nextRun = calculateNextCronRun(compactorSchedule);
    db.createAgentCronJob({
      agent_id: agentId,
      name: 'Workspace Markdown Compactor',
      prompt: WORKSPACE_COMPACTOR_PROMPT,
      cron_schedule: compactorSchedule,
      enabled: 1,
      created_by: 'system',
      next_run_at: nextRun,
    });
  } else if (compactor.created_by === 'system') {
    const nextRun = compactor.enabled ? calculateNextCronRun(compactorSchedule) : null;
    db.updateAgentCronJob(compactor.id, {
      prompt: WORKSPACE_COMPACTOR_PROMPT,
      cron_schedule: compactorSchedule,
      next_run_at: nextRun,
    });
  }

  // 2. Daily EOD Task Summary
  const eod = existingJobs.find((j) => j.name === 'Daily EOD Task Summary');
  if (!eod) {
    const nextRun = calculateNextCronRun(eodSchedule);
    db.createAgentCronJob({
      agent_id: agentId,
      name: 'Daily EOD Task Summary',
      prompt: DAILY_EOD_PROMPT,
      cron_schedule: eodSchedule,
      enabled: 1,
      created_by: 'system',
      next_run_at: nextRun,
    });
  } else if (eod.created_by === 'system') {
    const nextRun = eod.enabled ? calculateNextCronRun(eodSchedule) : null;
    db.updateAgentCronJob(eod.id, {
      prompt: DAILY_EOD_PROMPT,
      cron_schedule: eodSchedule,
      next_run_at: nextRun,
    });
  }

  // 3. Self-Refinement & Specialization
  const refine = existingJobs.find((j) => j.name === 'Self-Refinement & Specialization');
  if (!refine) {
    const nextRun = calculateNextCronRun(refinementSchedule);
    db.createAgentCronJob({
      agent_id: agentId,
      name: 'Self-Refinement & Specialization',
      prompt: SELF_REFINEMENT_PROMPT,
      cron_schedule: refinementSchedule,
      enabled: 1,
      created_by: 'system',
      next_run_at: nextRun,
    });
  } else if (refine.created_by === 'system') {
    const nextRun = refine.enabled ? calculateNextCronRun(refinementSchedule) : null;
    db.updateAgentCronJob(refine.id, {
      prompt: SELF_REFINEMENT_PROMPT,
      cron_schedule: refinementSchedule,
      next_run_at: nextRun,
    });
  }
}
