import fs from 'node:fs';
import path from 'node:path';
import type { AgentDb } from './agent.db.js';
import type {
  AgentRecord,
  AgentTodoItem,
  AgentTodoRecord,
  AgentTodoDaySummary,
  TodoStatus,
  TodoPriority,
} from './agent.types.js';
import type { CoreWsServer } from '../core/ws.server.js';
import { MANIFEST_DIR } from './agent.manifest.js';

// ── Date Helpers & Midnight Crossover Resolution ─────────────────────────────

/** Formats a Date object or ISO string to YYYY-MM-DD */
export function formatDateKey(input: Date | string): string {
  if (typeof input === 'string') {
    const trimmed = input.trim();
    const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) {
      return isoMatch[1];
    }
  }
  const d = typeof input === 'string' ? new Date(input) : input;
  if (d instanceof Date && !isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export interface EffectiveDateResult {
  taskDate: string;
  crossedMidnight: boolean;
  runStartDateStr: string;
  currentDateStr: string;
  runStartedAtIso?: string;
}

/**
 * Resolves the effective date for to-do items.
 *
 * Edge Case Handled:
 * When an agent starts a task or run late at night (e.g. 11:55 PM / 23:55 on Day 1)
 * and the run/execution continues into Day 2 (e.g. 00:05 AM, 00:30 AM):
 * All to-dos executed or updated during that execution belong to Day 1 (the start date).
 */
export function resolveEffectiveTodoDate(options?: {
  runStartedAt?: string | Date | null;
  now?: Date | string;
}): EffectiveDateResult {
  const now = options?.now ? (typeof options.now === 'string' ? options.now : options.now) : new Date();
  const currentDateStr = formatDateKey(now);

  if (!options?.runStartedAt) {
    return {
      taskDate: currentDateStr,
      crossedMidnight: false,
      runStartDateStr: currentDateStr,
      currentDateStr,
    };
  }

  const runStartDateStr = formatDateKey(options.runStartedAt);
  const crossedMidnight = runStartDateStr !== currentDateStr;

  const runStartedDate = typeof options.runStartedAt === 'string'
    ? new Date(options.runStartedAt)
    : options.runStartedAt;

  return {
    taskDate: runStartDateStr, // Attributed strictly to the run's start date
    crossedMidnight,
    runStartDateStr,
    currentDateStr,
    runStartedAtIso: !isNaN(runStartedDate.getTime()) ? runStartedDate.toISOString() : undefined,
  };
}

// ── Domain Sections & Specialization Inference ───────────────────────────────

const SECTION_RULES: Array<{ section: string; pattern: RegExp }> = [
  { section: 'QA & Testing', pattern: /\b(test|spec|assert|unit[-_]?test|vitest|jest|e2e|playwright|mock|validation|coverage|qa)\b/i },
  { section: 'Database & Migrations', pattern: /\b(database|sqlite|postgres|mysql|db\b|schema|migration|table|index\b|sql\b|prisma|drizzle|orm)\b/i },
  { section: 'Backend & APIs', pattern: /\b(api\b|endpoint|route|express|controller|handler|rest\b|graphql|websocket|server|middleware|rpc)\b/i },
  { section: 'Frontend & UI', pattern: /\b(frontend|ui\b|react|component|styling|css\b|html|drawer|button|modal|view\b|canvas|dom\b|theme|tailwind)\b/i },
  { section: 'DevOps & CI/CD', pattern: /\b(docker|container|ci\/cd|pipeline|github[-_ ]action|workflow|deploy|railway|fly\.toml|build|release)\b/i },
  { section: 'Security & Hardening', pattern: /\b(security|auth|sanitiz|vulnerab|cve|encrypt|secret|token|hash|iam|permission|xss|csrf)\b/i },
  { section: 'Performance & Optimization', pattern: /\b(perf|optimiz|cache|benchmark|memory|latency|profil|compaction|speed|throttle)\b/i },
  { section: 'Documentation & Architecture', pattern: /\b(doc|readme|guide|adr\b|architecture|rfc\b|diagram|spec\b|design)\b/i },
  { section: 'Research & Exploration', pattern: /\b(search|crawl|scrape|research|explore|fetch|audit|inspect|verify)\b/i },
  { section: 'Automation & Tooling', pattern: /\b(automat|script|cron|cli\b|runner|tool)\b/i },
];

/**
 * Infers the logical work section/domain for a given todo item text.
 */
export function inferSectionForTodo(content: string): string {
  const text = (content || '').trim();
  for (const rule of SECTION_RULES) {
    if (rule.pattern.test(text)) {
      return rule.section;
    }
  }
  return 'General Engineering';
}

/**
 * Derives demonstrated specializations from a collection of tasks.
 */
export function inferSpecializationsFromTodos(
  todos: (AgentTodoItem | AgentTodoRecord)[],
): { topSections: string[]; specializations: string[] } {
  const sectionCounts = new Map<string, number>();
  for (const t of todos) {
    const sec = t.section || inferSectionForTodo(t.content);
    sectionCounts.set(sec, (sectionCounts.get(sec) ?? 0) + 1);
  }

  // Sort sections by frequency
  const sortedSections = [...sectionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([sec]) => sec);

  const specializations: string[] = [];
  for (const sec of sortedSections) {
    switch (sec) {
      case 'QA & Testing':
        specializations.push('Automated QA & Test Engineering');
        break;
      case 'Database & Migrations':
        specializations.push('Database Architecture & SQLite Migrations');
        break;
      case 'Backend & APIs':
        specializations.push('Backend API & Service Architecture');
        break;
      case 'Frontend & UI':
        specializations.push('Frontend & UI Component Development');
        break;
      case 'DevOps & CI/CD':
        specializations.push('DevOps, Containers & CI/CD Automation');
        break;
      case 'Security & Hardening':
        specializations.push('Application Security & Access Hardening');
        break;
      case 'Performance & Optimization':
        specializations.push('Performance Profiling & Resource Optimization');
        break;
      case 'Documentation & Architecture':
        specializations.push('System Architecture & Technical Documentation');
        break;
      case 'Automation & Tooling':
        specializations.push('Internal Tooling & Workflow Automation');
        break;
      default:
        specializations.push(`${sec} Specialist`);
        break;
    }
  }

  return {
    topSections: sortedSections,
    specializations: [...new Set(specializations)],
  };
}

// ── Disk Workspace Persistence (.smoke-agent/todos/) ─────────────────────────

export const TODOS_DIR_NAME = 'todos';

export function getAgentTodosDir(workspacePath: string): string {
  return path.join(workspacePath, MANIFEST_DIR, TODOS_DIR_NAME);
}

export function ensureAgentTodosDir(workspacePath: string): string {
  const dir = getAgentTodosDir(workspacePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const readmePath = path.join(dir, 'README.md');
  if (!fs.existsSync(readmePath)) {
    const readmeContent = `# Agent Daily Task & Todo Ledger

This directory stores the agent's date-wise task and to-do history.

## Structure
- \`YYYY-MM-DD.md\`: Formatted human & agent readable daily task ledger.
- \`YYYY-MM-DD.json\`: Structured JSON with timestamps, section categorizations, and completion metrics.
- \`index.json\`: Master index of all active dates and cumulative specializations.

## Midnight Crossover Policy
If a long-running execution starts late at night (e.g. 11:55 PM) and crosses into the next day,
all associated tasks are attributed to the start day (the previous day) so daily historical analysis
remains cohesive.

## Redeveloping Specializations
Agents and peer agents inspect these daily files to evaluate what sections were worked on,
reinforce operational heuristics in \`memory/reflective.md\`, and update agent domain specialties.
`;
    try {
      fs.writeFileSync(readmePath, readmeContent, 'utf8');
    } catch {}
  }

  return dir;
}

/**
/**
 * Renders daily to-do summary into standardized Markdown format for ledgers and reports.
 */
export function renderDailyTodoMarkdown(
  agent: { name: string; role?: string | null; specialty?: string | null },
  summary: AgentTodoDaySummary,
): string {
  const mdLines: string[] = [
    `# Daily Task & Todo Ledger — ${summary.date}`,
    '',
    `**Agent:** ${agent.name} (${agent.role || 'Specialist'})  `,
    `**Specialty:** ${agent.specialty || 'General Engineering'}  `,
    `**Attributed Date:** \`${summary.date}\`  `,
  ];

  if (summary.crossedMidnight) {
    mdLines.push(
      `> [!NOTE]  \n> **Midnight Crossover Handled**: This work began before midnight and continued across the day boundary. In accordance with the execution ledger rules, it is attributed to the initial date (\`${summary.date}\`).`,
      '',
    );
  }

  mdLines.push(
    '## 📊 Activity Metrics',
    `- **Total Tasks:** ${summary.total}`,
    `- **Completed:** ${summary.completed}`,
    `- **In Progress:** ${summary.inProgress}`,
    `- **Pending:** ${summary.pending}`,
    `- **Cancelled:** ${summary.cancelled}`,
    `- **Completion Rate:** ${summary.completionRate}%`,
    '',
  );

  if (summary.sections.length > 0) {
    mdLines.push('## 🏷️ Sections & Work Domains');
    for (const sec of summary.sections) {
      const count = summary.todos.filter((t) => (t.section || inferSectionForTodo(t.content)) === sec).length;
      mdLines.push(`- **${sec}**: ${count} task${count === 1 ? '' : 's'}`);
    }
    mdLines.push('');
  }

  mdLines.push('## 📋 Task Checklist & Execution Log');
  if (summary.todos.length === 0) {
    mdLines.push('_No to-do items recorded for this date._');
  } else {
    for (const t of summary.todos) {
      const marker =
        t.status === 'completed'
          ? '[x]'
          : t.status === 'in_progress'
            ? '[>]'
            : t.status === 'cancelled'
              ? '[-]'
              : '[ ]';
      const secBadge = t.section ? `[${t.section}]` : '';
      const prioBadge = `[${t.priority || 'medium'}]`;

      let timeDetails = '';
      if (t.started_at || t.completed_at) {
        const parts: string[] = [];
        if (t.started_at) {
          parts.push(`Started: ${t.started_at.slice(11, 19)}`);
        }
        if (t.completed_at) {
          parts.push(`Done: ${t.completed_at.slice(11, 19)}`);
        }
        timeDetails = ` _(${parts.join(' | ')})_`;
      }

      mdLines.push(`- ${marker} ${prioBadge} ${secBadge} ${t.content}${timeDetails}`);
    }
  }
  mdLines.push('');

  const specs = summary.specializations || (summary as any).demonstratedSpecialties || [];
  if (specs.length > 0) {
    mdLines.push(
      '## 🎯 Specialization Insights',
      `Tasks executed today demonstrated capability in: **${specs.join(', ')}**.`,
      'Use these demonstrated capabilities to refine agent identity and guide peer task delegations.',
      '',
    );
  }

  return mdLines.join('\n');
}

/**
 * Writes or updates the date-wise markdown and JSON files on disk for the agent.
 */
export function syncAgentTodoDiskLedger(
  workspacePath: string,
  agent: { name: string; role?: string | null; specialty?: string | null },
  summary: AgentTodoDaySummary,
): void {
  try {
    const todosDir = ensureAgentTodosDir(workspacePath);
    const mdPath = path.join(todosDir, `${summary.date}.md`);
    const jsonPath = path.join(todosDir, `${summary.date}.json`);
    const indexPath = path.join(todosDir, 'index.json');

    // 1. Render Markdown Ledger
    const markdown = renderDailyTodoMarkdown(agent, summary);
    fs.writeFileSync(mdPath, markdown, 'utf8');

    // 2. Write JSON representation
    fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2), 'utf8');

    // 3. Update Master index.json
    let indexData: {
      dates: string[];
      totalRecords: number;
      lastUpdated: string;
      specializationCounts: Record<string, number>;
    } = {
      dates: [],
      totalRecords: 0,
      lastUpdated: new Date().toISOString(),
      specializationCounts: {},
    };

    if (fs.existsSync(indexPath)) {
      try {
        indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      } catch {}
    }

    const dateSet = new Set(indexData.dates || []);
    dateSet.add(summary.date);
    indexData.dates = [...dateSet].sort().reverse();
    indexData.lastUpdated = new Date().toISOString();

    for (const spec of summary.specializations) {
      indexData.specializationCounts[spec] = (indexData.specializationCounts[spec] || 0) + 1;
    }

    fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2), 'utf8');
  } catch (err) {
    console.warn(`[AgentTodos] Failed to sync disk ledger for date ${summary.date}:`, err);
  }
}

// ── Real-time Todo Recording Orchestration ────────────────────────────────────

export interface RecordTodoUpdateInput {
  agentId: string;
  todos: (AgentTodoItem | Record<string, unknown>)[];
  runId?: string;
  sessionId?: string;
  runStartedAt?: string | Date;
  workspacePath?: string;
  db: AgentDb;
  wsServer?: CoreWsServer;
}

/**
 * Ingests a todo list update (from todo_write or runner event),
 * computes date attribution (with midnight crossover logic),
 * persists each item into SQLite, builds summary metrics,
 * writes markdown/json files to disk, and broadcasts via WS.
 */
export async function recordAgentTodoUpdate(
  input: RecordTodoUpdateInput,
): Promise<AgentTodoDaySummary> {
  const { agentId, todos, runId, sessionId, runStartedAt, workspacePath, db, wsServer } = input;

  const agent = db.getAgent(agentId);
  const agentName = agent?.name || 'Agent';

  // 1. Resolve date attribution
  const dateResult = resolveEffectiveTodoDate({ runStartedAt });
  const taskDate = dateResult.taskDate;

  // 2. Upsert each to-do item into database
  for (const raw of todos) {
    const content = String(raw.content ?? '').trim();
    if (!content) continue;

    const status = (['pending', 'in_progress', 'completed', 'cancelled'].includes(String(raw.status))
      ? String(raw.status)
      : 'pending') as TodoStatus;

    const priority = (['high', 'medium', 'low'].includes(String(raw.priority))
      ? String(raw.priority)
      : 'medium') as TodoPriority;

    const section = (raw.section as string) || inferSectionForTodo(content);

    const record: AgentTodoRecord = {
      id: '',
      agent_id: agentId,
      task_date: taskDate,
      run_id: runId ?? null,
      session_id: sessionId ?? null,
      content,
      status,
      priority,
      section,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata_json: dateResult.crossedMidnight
        ? JSON.stringify({
            crossedMidnight: true,
            runStartDate: dateResult.runStartDateStr,
            currentDate: dateResult.currentDateStr,
            runStartedAt: dateResult.runStartedAtIso,
          })
        : null,
    };

    db.upsertAgentTodoItem(record);
  }

  // 3. Query all to-dos for this agent on this effective date to produce the day summary
  const dayTodos = db.getAgentTodosByDate(agentId, taskDate);
  const total = dayTodos.length;
  const completed = dayTodos.filter((t) => t.status === 'completed').length;
  const inProgress = dayTodos.filter((t) => t.status === 'in_progress').length;
  const pending = dayTodos.filter((t) => t.status === 'pending').length;
  const cancelled = dayTodos.filter((t) => t.status === 'cancelled').length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const { topSections, specializations } = inferSpecializationsFromTodos(dayTodos);

  const summary: AgentTodoDaySummary = {
    date: taskDate,
    agentId,
    total,
    completed,
    inProgress,
    pending,
    cancelled,
    completionRate,
    sections: topSections,
    specializations,
    crossedMidnight: dateResult.crossedMidnight,
    todos: dayTodos,
  };

  // 4. Sync Disk Files if workspacePath is provided
  if (workspacePath) {
    syncAgentTodoDiskLedger(
      workspacePath,
      {
        name: agentName,
        role: agent?.role,
        specialty: agent?.specialty,
      },
      summary,
    );
  }

  // 5. Broadcast real-time history update over WebSocket
  if (wsServer) {
    wsServer.broadcast({
      type: 'agent:todo_history_updated',
      agentId,
      date: taskDate,
      summary: {
        total,
        completed,
        inProgress,
        pending,
        cancelled,
        completionRate,
        sections: topSections,
        specializations,
        crossedMidnight: dateResult.crossedMidnight,
      },
      todos: dayTodos,
    });
  }

  return summary;
}

// ── Specialization Redevelopment Engine ───────────────────────────────────────

export interface RedevelopSpecializationResult {
  agentId: string;
  agentName: string;
  previousSpecialty: string;
  newSpecialty: string;
  topSections: string[];
  completedTasksCount: number;
  evidence: string[];
}

/**
 * Analyzes the agent's recent to-do history to judge what work was performed
 * and redevelop its domain specializations. Updates the agent profile and memory files.
 */
export async function redevelopAgentSpecializationsFromHistory(
  agentId: string,
  db: AgentDb,
  workspacePath?: string,
  daysLimit: number = 7,
): Promise<RedevelopSpecializationResult | null> {
  const agent = db.getAgent(agentId);
  if (!agent) return null;

  const dates = db.getAgentTodoDates(agentId).slice(0, daysLimit);
  const allRecentTodos: AgentTodoRecord[] = [];

  for (const date of dates) {
    const todos = db.getAgentTodosByDate(agentId, date);
    allRecentTodos.push(...todos);
  }

  const completedTasks = allRecentTodos.filter((t) => t.status === 'completed');
  if (allRecentTodos.length === 0) {
    return {
      agentId,
      agentName: agent.name,
      previousSpecialty: agent.specialty || 'General Engineering',
      newSpecialty: agent.specialty || 'General Engineering',
      topSections: [],
      completedTasksCount: 0,
      evidence: ['No historical todo tasks found for this agent.'],
    };
  }

  const { topSections, specializations } = inferSpecializationsFromTodos(
    completedTasks.length > 0 ? completedTasks : allRecentTodos,
  );

  const previousSpecialty = agent.specialty || 'General Engineering';
  const newSpecialty =
    specializations.length > 0 ? specializations.slice(0, 2).join(' & ') : previousSpecialty;

  // Update DB if new specialization derived
  if (newSpecialty && newSpecialty !== previousSpecialty) {
    db.updateAgent(agentId, { specialty: newSpecialty });
  }

  const evidence = (completedTasks.length > 0 ? completedTasks : allRecentTodos)
    .slice(0, 10)
    .map((t) => `[${t.section || 'General'}] ${t.content}`);

  // If workspacePath provided, append a note into memory/reflective.md
  if (workspacePath) {
    try {
      const reflectivePath = path.join(workspacePath, MANIFEST_DIR, 'memory', 'reflective.md');
      if (fs.existsSync(reflectivePath)) {
        const todayStr = formatDateKey(new Date());
        const reflectionNote =
          `\n\n### ${todayStr} — Specialization Redevelopment & Self-Evaluation\n` +
          `- **Previous Specialty:** ${previousSpecialty}\n` +
          `- **Updated Specialty:** ${newSpecialty}\n` +
          `- **Dominant Work Sections:** ${topSections.join(', ')}\n` +
          `- **Completed Tasks Analyzed:** ${completedTasks.length}\n` +
          `- **Evidence:**\n` +
          evidence.map((e) => `  * ${e}`).join('\n') +
          '\n';
        fs.appendFileSync(reflectivePath, reflectionNote, 'utf8');
      }
    } catch (e) {
      console.warn(`[AgentTodos] Failed to update memory/reflective.md for agent ${agentId}:`, e);
    }
  }

  return {
    agentId,
    agentName: agent.name,
    previousSpecialty,
    newSpecialty,
    topSections,
    completedTasksCount: completedTasks.length,
    evidence,
  };
}
