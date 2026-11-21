import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import type { ToolDefinition } from 'smoke-monkey-harness';
import { loadAgentSkills } from 'smoke-monkey-harness';
import { AgentRunner } from './agent.runner.js';
import { checkAgentConfigStatus } from './agent.config-check.js';
import { startConnect } from '../mcp/mcp.connect.js';
import { STOCK_MCPS } from '../mcp/mcp.stock.js';
import { authStatus, canonicalRedirectUri } from '../mcp/mcp.oauth.js';
import { ensureAgentWorkspace, syncAgentDiskManifestFromDb, readAgentMemorySummaries, MANIFEST_DIR } from './agent.manifest.js';
import type { AgentRecord } from './agent.types.js';
import { resolveAgentWorkspace, reconcileSystemPromptWithProfile } from './agent.prompt.js';
import { CoreWsServer } from '../core/ws.server.js';
import { CoreDatabase } from '../core/database.db.js';
import { PERSONALITY_PRESETS, OUTPUT_STYLE_PRESETS, resolvePersonalities, resolveOutputStyles, parseIdList } from './agent.presets.js';
import { loadGitHubPluginSkills } from '../skill/skill.plugins.js';
import { AgentCronScheduler, calculateNextCronRun } from './agent.cron.js';
import { ensureDefaultAgentCronJobs } from './agent.memory-compactor.js';
import {
  formatDateKey,
  resolveEffectiveTodoDate,
  redevelopAgentSpecializationsFromHistory,
  inferSpecializationsFromTodos,
  inferSectionForTodo,
  renderDailyTodoMarkdown,
} from './agent.todos.js';
import { CANVAS_TOOL_DEFINITIONS, CanvasMcpServer, runWithScopedSpaceId } from '../mcp-server/canvas-mcp.server.js';

/**
 * Splits the DB-synced header from the agent's own notes in identity.md
 * across regenerations by update_agent_profile. See that handler and #14.
 */
const IDENTITY_AUTO_SECTION_MARKER =
  '<!-- Auto-synced from agent profile above this line. Notes below are preserved across profile updates. -->';

function parseTargetList(inputVal?: string | string[]): string[] {
  if (Array.isArray(inputVal)) {
    return inputVal.map((s) => String(s).trim()).filter(Boolean);
  }
  if (!inputVal || !String(inputVal).trim()) return [];
  return String(inputVal)
    .split(/,|\band\b/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

function slugifyName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
}

export interface FuzzyFields {
  primary?: string;
  secondary?: string;
  tertiary?: string;
}

function levenshteinDist(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function isSubsequenceMatch(needle: string, haystack: string): boolean {
  if (needle.length > haystack.length) return false;
  let nIdx = 0;
  for (let hIdx = 0; hIdx < haystack.length; hIdx++) {
    if (needle[nIdx] === haystack[hIdx]) nIdx++;
    if (nIdx === needle.length) return true;
  }
  return nIdx === needle.length;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function computeFuzzyScore(query: string, fields: FuzzyFields): number {
  const q = query.trim().toLowerCase();
  if (!q) return 1;

  const primary = (fields.primary || '').trim().toLowerCase();
  const secondary = (fields.secondary || '').trim().toLowerCase();
  const tertiary = (fields.tertiary || '').trim().toLowerCase();
  const haystack = `${primary} ${secondary} ${tertiary}`.toLowerCase();

  // 1. Exact match on primary
  if (primary === q) return 1000;

  // 2. Slug match on primary
  const qSlug = slugifyName(q);
  const pSlug = slugifyName(primary);
  if (pSlug === qSlug && qSlug.length > 0) return 900;

  // 3. Primary starts with query
  if (primary.startsWith(q)) return 700;

  // 4. Primary contains full query
  if (primary.includes(q)) return 500;

  // 5. Haystack contains full query
  if (haystack.includes(q)) return 350;

  // Tokenize query
  const qTokens = q.split(/[\s\-_,.]+/).filter(Boolean);
  if (qTokens.length === 0) return 0;

  const primaryWords = primary.split(/[\s\-_,.]+/).filter(Boolean);
  const secondaryWords = secondary.split(/[\s\-_,.]+/).filter(Boolean);
  const tertiaryWords = tertiary.split(/[\s\-_,.]+/).filter(Boolean);

  let totalScore = 0;
  let matchedTokens = 0;

  for (const token of qTokens) {
    let bestTokenScore = 0;

    // Check primary field
    if (primary.includes(token)) {
      bestTokenScore = Math.max(bestTokenScore, 150);
      try {
        if (new RegExp(`\\b${escapeRegex(token)}`, 'i').test(primary)) {
          bestTokenScore = Math.max(bestTokenScore, 200);
        }
      } catch {}
    } else if (isSubsequenceMatch(token, primary)) {
      bestTokenScore = Math.max(bestTokenScore, 90);
    } else {
      // Check typo match in primary words
      for (const w of primaryWords) {
        if (token.length >= 3 && (w.startsWith(token) || token.startsWith(w))) {
          bestTokenScore = Math.max(bestTokenScore, 100);
          break;
        }
        if (token.length >= 4 && Math.abs(w.length - token.length) <= 2) {
          const dist = levenshteinDist(token, w);
          if (dist <= (token.length > 6 ? 2 : 1)) {
            bestTokenScore = Math.max(bestTokenScore, 75);
            break;
          }
        }
      }
    }

    // Check secondary field
    if (secondary.includes(token)) {
      bestTokenScore = Math.max(bestTokenScore, 60);
      try {
        if (new RegExp(`\\b${escapeRegex(token)}`, 'i').test(secondary)) {
          bestTokenScore = Math.max(bestTokenScore, 80);
        }
      } catch {}
    } else {
      for (const w of secondaryWords) {
        if (token.length >= 4 && Math.abs(w.length - token.length) <= 1) {
          if (levenshteinDist(token, w) <= 1) {
            bestTokenScore = Math.max(bestTokenScore, 40);
            break;
          }
        }
      }
    }

    // Check tertiary field
    if (tertiary.includes(token)) {
      bestTokenScore = Math.max(bestTokenScore, 40);
      try {
        if (new RegExp(`\\b${escapeRegex(token)}`, 'i').test(tertiary)) {
          bestTokenScore = Math.max(bestTokenScore, 55);
        }
      } catch {}
    } else {
      for (const w of tertiaryWords) {
        if (token.length >= 4 && Math.abs(w.length - token.length) <= 1) {
          if (levenshteinDist(token, w) <= 1) {
            bestTokenScore = Math.max(bestTokenScore, 30);
            break;
          }
        }
      }
    }

    if (bestTokenScore > 0) {
      matchedTokens++;
      totalScore += bestTokenScore;
    }
  }

  // Threshold: at least half the tokens must match
  if (matchedTokens === 0 || matchedTokens < Math.ceil(qTokens.length / 2)) {
    return 0;
  }

  if (matchedTokens === qTokens.length) {
    totalScore += 150; // Bonus for full token match
  }

  return totalScore;
}

export function resolveTargetAgent(
  db: any,
  rawTarget: string | undefined | null,
  callerAgentId?: string | null,
): AgentRecord | null {
  if (rawTarget && typeof rawTarget === 'string' && rawTarget.trim()) {
    const q = rawTarget.trim();

    // 1. Direct ID match
    try {
      const byId = db.getAgent(q);
      if (byId) return byId;
    } catch {}

    // 2. Search all agents
    const all: AgentRecord[] = typeof db.getAllAgents === 'function'
      ? db.getAllAgents()
      : (typeof db.listAgents === 'function' ? db.listAgents() : []);
    const qLower = q.toLowerCase();
    const qSlug = slugifyName(q);

    // 2. Strict exact name or exact slug match
    const exactName = all.find((a) => a.name && a.name.toLowerCase() === qLower);
    if (exactName) return exactName;

    const slugName = all.find((a) => a.name && slugifyName(a.name) === qSlug);
    if (slugName) return slugName;

    // Reject all invalid, fuzzy, partial, or hallucinated targets
    return null;
  }

  // Fallback to caller
  if (callerAgentId) {
    try {
      return db.getAgent(callerAgentId) || null;
    } catch {}
  }
  return null;
}

interface SingleDelegationTaskInput {
  target_agent_id: string;
  task_title?: string;
  requirements_file_path?: string;
  instructions?: string;
  prompt?: string;
  task?: string;
  message?: string;
  chat_id?: string;
  session_id?: string;
  communication_type?: 'delegate' | 'report_status' | 'request_approval' | 'inform';
}

interface DelegationTaskResult {
  success: boolean;
  status: string;
  target_agent_id: string;
  target_agent_name: string;
  task_title: string;
  chat_id: string;
  session_id: string;
  response_file_path?: string;
  summary?: string | null;
  deliverables?: string[] | null;
  notes?: string | null;
  closed_via_tool?: boolean;
  error?: string | null;
}

async function executeSingleDelegatedTask(
  task: SingleDelegationTaskInput,
  callerInfo: {
    callerAgentId?: string;
    callerName: string;
    callerWorkspace: string;
    callerRunId?: string;
    callerSessionId?: string;
  },
  runner: AgentRunner,
  db: ReturnType<AgentRunner['getDb']>,
): Promise<DelegationTaskResult> {
  const rawTarget = String(
    task.target_agent_id ||
    (task as any).targetAgentId ||
    (task as any).agent_id ||
    (task as any).agentId ||
    (task as any).target ||
    (task as any).target_agent ||
    (task as any).to_agent_id ||
    (task as any).recipient ||
    '',
  ).trim();

  // 1. Resolve target agent by ID or by Name
  let targetAgent = resolveTargetAgent(db, rawTarget, null);

  const targetAgentId = targetAgent ? targetAgent.id : rawTarget;
  const targetAgentName = targetAgent ? targetAgent.name : (rawTarget || 'Unknown');

  // Extract instructions / prompt from any field the agent passed
  const instructions =
    (typeof task.instructions === 'string' && task.instructions.trim()) ||
    (typeof (task as any).prompt === 'string' && (task as any).prompt.trim()) ||
    (typeof (task as any).task === 'string' && (task as any).task.trim()) ||
    (typeof (task as any).message === 'string' && (task as any).message.trim()) ||
    (typeof (task as any).query === 'string' && (task as any).query.trim()) ||
    (typeof (task as any).content === 'string' && (task as any).content.trim()) ||
    (typeof (task as any).description === 'string' && (task as any).description.trim()) ||
    '';

  const requirementsFilePath = String(
    task.requirements_file_path ||
    (task as any).requirementsFilePath ||
    (task as any).file_path ||
    (task as any).file ||
    '',
  ).trim();

  // Extract or derive task title
  let taskTitle = String(
    task.task_title ||
    (task as any).title ||
    (task as any).subject ||
    (task as any).topic ||
    '',
  ).trim();

  if (!taskTitle) {
    if (instructions) {
      taskTitle = instructions.split(/[\r\n]+/)[0].slice(0, 60).trim();
    } else if (requirementsFilePath) {
      taskTitle = `Review ${requirementsFilePath}`;
    } else {
      taskTitle = 'Delegated Task';
    }
  }

  const explicitChatId = typeof task.chat_id === 'string' && task.chat_id.trim()
    ? task.chat_id.trim()
    : typeof task.session_id === 'string' && task.session_id.trim()
      ? task.session_id.trim()
      : undefined;

  const isFollowUp = Boolean(explicitChatId);
  const delegationSessionId =
    explicitChatId ||
    `delegation_${callerInfo.callerAgentId || 'caller'}_${targetAgentId}_${Date.now()}`;

  // Only reject if no target agent was provided OR literally nothing was asked
  if (!rawTarget) {
    return {
      success: false,
      status: 'failed',
      target_agent_id: 'unknown',
      target_agent_name: 'Unknown',
      task_title: taskTitle,
      chat_id: delegationSessionId,
      session_id: delegationSessionId,
      error: 'Missing target_agent_id: Please specify which agent to delegate to.',
    };
  }

  if (!instructions && !requirementsFilePath && taskTitle === 'Delegated Task') {
    return {
      success: false,
      status: 'failed',
      target_agent_id: targetAgentId,
      target_agent_name: targetAgentName,
      task_title: taskTitle,
      chat_id: delegationSessionId,
      session_id: delegationSessionId,
      error: 'Missing task content: Please provide instructions, a prompt, or requirements for the target agent.',
    };
  }

  // 1. Verify target agent exists (Reject invalid delegations)
  if (!targetAgent) {
    const available = db.listAgents().map((a: any) => `"${a.name}" (ID: \`${a.id}\`)`).join(', ') || 'none';
    return {
      success: false,
      status: 'failed',
      target_agent_id: targetAgentId,
      target_agent_name: 'Unknown',
      task_title: taskTitle,
      chat_id: delegationSessionId,
      session_id: delegationSessionId,
      error: `Delegation REJECTED: Target agent "${rawTarget}" is not a valid agent in this space. You must supply a valid exact Agent ID (e.g. \`agent_...\`) from your connected peers list. Available peers: ${available}`,
    };
  }

  // 2. Validate chat_id if provided
  if (explicitChatId) {
    // Prevent deadlocks: An agent cannot call delegate_task on its own active chat session
    if (callerInfo.callerSessionId && explicitChatId === callerInfo.callerSessionId) {
      return {
        success: false,
        status: 'failed',
        target_agent_id: targetAgentId,
        target_agent_name: targetAgent.name,
        task_title: taskTitle,
        chat_id: explicitChatId,
        session_id: explicitChatId,
        error: `Cannot call delegate_task on your current active chat session "${explicitChatId}". ` +
          `To return deliverables, status reports, or complete your assignment back to the caller, invoke 'close_delegation_task'. ` +
          `To delegate a new subtask to a downstream peer, omit chat_id so a separate thread is created.`,
      };
    }

    const existingSession = db.getSession(explicitChatId);
    if (!existingSession) {
      return {
        success: false,
        status: 'failed',
        target_agent_id: targetAgentId,
        target_agent_name: targetAgent.name,
        task_title: taskTitle,
        chat_id: explicitChatId,
        session_id: explicitChatId,
        error: `Invalid chat_id "${explicitChatId}": Chat session does not exist.`,
      };
    }
    if (existingSession.agent_id !== targetAgentId) {
      return {
        success: false,
        status: 'failed',
        target_agent_id: targetAgentId,
        target_agent_name: targetAgent.name,
        task_title: taskTitle,
        chat_id: explicitChatId,
        session_id: explicitChatId,
        error: `Invalid chat_id "${explicitChatId}": Chat session belongs to agent "${existingSession.agent_id}", not target agent "${targetAgentId}".`,
      };
    }
  }

  // 3. Verify / establish peer connection
  if (callerInfo.callerAgentId && callerInfo.callerAgentId !== targetAgentId) {
    const peers = db.getConnectedPeers(callerInfo.callerAgentId);
    const isConnected = peers.some((p) => p.id === targetAgentId);
    if (!isConnected) {
      try {
        db.createAgentConnection(callerInfo.callerAgentId, targetAgentId);
      } catch {}
    }
  }

  // 3b. Suspended-chat guard
  if (!isFollowUp && runner.isSessionBusyWithDelegation(delegationSessionId)) {
    return {
      success: false,
      status: 'failed',
      target_agent_id: targetAgentId,
      target_agent_name: targetAgent ? targetAgent.name : targetAgentId,
      task_title: taskTitle,
      chat_id: delegationSessionId,
      session_id: delegationSessionId,
      error: `Session "${delegationSessionId}" already has an active delegation in progress. Wait for it to complete.`,
    };
  }

  // 4. Verify target agent configuration / eligibility
  const configStatus = checkAgentConfigStatus(targetAgentId, db);
  if (!configStatus.isConfigured) {
    return {
      success: false,
      status: 'unconfigured',
      target_agent_id: targetAgentId,
      target_agent_name: targetAgent.name,
      task_title: taskTitle,
      chat_id: delegationSessionId,
      session_id: delegationSessionId,
      error: `Agent "${targetAgent.name}" (${targetAgentId}) is NOT fully configured and is not eligible to execute tasks. Missing configuration:\n- ${configStatus.reasons.join('\n- ')}`,
    };
  }

  // 4b. Multi-level delegation safety checks (self-delegation & cycle detection)
  if (callerInfo.callerAgentId) {
    const safetyCheck = runner.registerDelegationChain(
      callerInfo.callerAgentId,
      targetAgentId,
      delegationSessionId,
      callerInfo.callerSessionId,
    );
    if (!safetyCheck.allowed) {
      return {
        success: false,
        status: 'failed',
        target_agent_id: targetAgentId,
        target_agent_name: targetAgent ? targetAgent.name : targetAgentId,
        task_title: taskTitle,
        chat_id: delegationSessionId,
        session_id: delegationSessionId,
        error: safetyCheck.reason || 'Delegation blocked by safety check.',
      };
    }
  }

  // 5. Verify requirements content / file
  let requirementsContent = '';
  if (requirementsFilePath) {
    const reqFullPath = isAbsolute(requirementsFilePath)
      ? requirementsFilePath
      : join(callerInfo.callerWorkspace, requirementsFilePath);

    if (existsSync(reqFullPath)) {
      try {
        requirementsContent = readFileSync(reqFullPath, 'utf-8');
      } catch (err: any) {
        requirementsContent = instructions || taskTitle;
      }
    } else {
      requirementsContent = instructions || taskTitle;
    }
  } else {
    requirementsContent = instructions || taskTitle;
  }

  const commType = task.communication_type || 'delegate';
  const commBadge =
    commType === 'report_status'
      ? '📋 [STATUS REPORT]'
      : commType === 'request_approval'
        ? '🛡️ [APPROVAL REQUEST]'
        : commType === 'inform'
          ? '📢 [PEER SYNC]'
          : '🤝 [DELEGATED TASK]';

  // Ensure session exists in database with a clear, readable title
  const sessionTitle = isFollowUp
    ? `${commBadge} ${taskTitle} (Follow-up from ${callerInfo.callerName})`
    : `${commBadge} ${taskTitle} (${callerInfo.callerName})`;
  db.getOrCreateSession(targetAgentId, delegationSessionId, sessionTitle);

  // 6. Build delegated prompt — lean: only immediate sender + task, no chain hierarchy
  const senderTag = `${callerInfo.callerName}${callerInfo.callerAgentId ? ` (${callerInfo.callerAgentId})` : ''}`;
  const header =
    commType === 'report_status'
      ? `## 📋 STATUS REPORT FROM: ${senderTag}`
      : commType === 'request_approval'
        ? `## 🛡️ APPROVAL REQUEST FROM: ${senderTag}`
        : commType === 'inform'
          ? `## 📢 SYNC FROM: ${senderTag}`
          : isFollowUp
            ? `## 🤝 FOLLOW-UP FROM: ${senderTag}`
            : `## 🤝 TASK FROM: ${senderTag}`;

  const guidance =
    commType === 'request_approval'
      ? '1. Review proposal and risk.\n2. Respond APPROVED, CONDITIONALLY APPROVED, or REJECTED with rationale.'
      : commType === 'report_status'
        ? '1. Review deliverables and metrics.\n2. Confirm acceptance or request revisions.'
        : isFollowUp
          ? '1. Refine work per the new requirements.'
          : '1. Complete task per requirements.';

  // Lean prompt: target only knows its direct sender + thread chat_id.
  // Requirements file referenced by path — not dumped inline.
  const reqRef = requirementsFilePath
    ? `\nRequirements file: \`${requirementsFilePath}\``
    : '';
  const taskBody = instructions
    ? `\n\n${instructions}`
    : reqRef
      ? '\nSee requirements file above.'
      : `\n${taskTitle}`;

  const delegationPrompt = [
    `${header} | chat_id: ${delegationSessionId}`,
    isFollowUp ? `*(Follow-up in thread \`${delegationSessionId}\`)*` : '',
    `**Task**: ${taskTitle}${reqRef}${taskBody}`,
    '',
    '---',
    '**Instructions**:',
    guidance,
    '2. Return a summary: actions taken, deliverables with paths, and recommendations.',
    '3. If requirements are unclear, state questions under "### ❓ QUESTIONS" in your summary.',
    `4. **MANDATORY TASK COMPLETION**: When you have completed the work (or are reporting status, or blocked), you MUST invoke \`close_delegation_task\` with:`,
    `   - "chat_id": "${delegationSessionId}"`,
    '   - "status": "completed" | "failed" | "blocked"',
    '   - "summary": "<comprehensive executive summary of work done or status report>"',
    '   - "deliverables": ["<file_path>", ...]',
    `5. **NO CIRCULAR DELEGATION**: Do NOT call \`delegate_task\` back to your caller (${senderTag}) in this thread. Calling \`close_delegation_task\` automatically returns your response and deliverables back to your caller. Only invoke \`delegate_task\` if delegating a NEW subtask to a downstream peer.`,
    '6. Do NOT end your turn without calling `close_delegation_task`.',
  ]
    .filter(Boolean)
    .join('\n');

  // Max retries for transient (technical) failures: 5s → 10s → 20s backoff
  const MAX_DELEGATION_RETRIES = 3;

  // A flat per-attempt timeout doesn't account for nested delegation: if B is
  // itself waiting on C (its own delegate_task call, which won't resolve
  // until B's run finishes), A's wait time is really "B's own work" PLUS
  // "however long B waits on C" — so a shallower (closer to the original
  // caller) hop genuinely needs MORE slack than a deeper one, not the same
  // fixed budget. Scale down as the chain gets deeper: a root delegation
  // (chain length 2: [caller, target]) gets the largest multiplier, each
  // added level of nesting gets progressively less extra slack, floored at
  // 1x the base. Configurable via env since "realistic task duration" varies
  // by deployment. See #16.
  const BASE_DELEGATION_TIMEOUT_MS = Number(process.env.SMOKE_MONKEY_DELEGATION_TIMEOUT_MS) || 300_000; // 5 min
  const MAX_SCALED_DELEGATION_DEPTH = 5;
  const chainDepth = runner.getDelegationChain(delegationSessionId).length || 2;
  const depthMultiplier = Math.max(1, MAX_SCALED_DELEGATION_DEPTH - chainDepth + 2);
  const DELEGATION_TIMEOUT_MS = BASE_DELEGATION_TIMEOUT_MS * depthMultiplier;

  const delegationTrackId = callerInfo.callerAgentId
    ? runner.registerActiveDelegation(callerInfo.callerAgentId, targetAgentId, taskTitle, delegationSessionId)
    : null;

  runner.clearDelegationClosure(delegationSessionId);

  try {
    let delegationAttempt = 0;
    let targetRun: any;
    let lastTechnicalError = '';

    while (true) {
      delegationAttempt++;

      // Wait for any existing run on this session to finish first. This run
      // wasn't started by this delegation attempt — it could be the target
      // agent's own nested delegation to someone else, or a user manually
      // chatting with it — so on timeout, fail the attempt without stopping
      // it. Forcibly stopping a run this call didn't start (the previous
      // behavior) could kill legitimate in-progress work, including a human
      // user's own conversation. See #16.
      let activeSessionRun = runner.getActiveRunForSession(delegationSessionId);
      while (activeSessionRun && activeSessionRun.status === 'running') {
        if (callerInfo.callerRunId && activeSessionRun.runId === callerInfo.callerRunId) break;
        const busyRunId = activeSessionRun.runId;
        let busyTimer: NodeJS.Timeout | null = null;
        const timedOut = await new Promise<boolean>((resolve) => {
          busyTimer = setTimeout(() => resolve(true), DELEGATION_TIMEOUT_MS);
          runner.waitForRun(busyRunId).then(
            () => {
              if (busyTimer) clearTimeout(busyTimer);
              resolve(false);
            },
            () => {
              if (busyTimer) clearTimeout(busyTimer);
              resolve(false);
            },
          );
        });
        if (timedOut) {
          throw new Error(
            `Delegation session "${delegationSessionId}" is still busy with another run after ${DELEGATION_TIMEOUT_MS / 1000}s; ` +
              `not aborting it since this delegation didn't start it. Try again once it's free.`,
          );
        }
        activeSessionRun = runner.getActiveRunForSession(delegationSessionId);
      }

      // On retry, send a short resume message on the SAME chat thread so the
      // target agent sees what happened and continues with shared context.
      const retryPrompt = delegationAttempt === 1
        ? delegationPrompt
        : `[DELEGATION RETRY ATTEMPT ${delegationAttempt} of ${MAX_DELEGATION_RETRIES}]\n` +
          `Your previous execution attempt failed: ${lastTechnicalError}\n` +
          `All conversation history and workspace files are preserved. ` +
          `Please resume and call \`close_delegation_task\` when done.`;

      let timeoutHandle: NodeJS.Timeout | null = null;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`Delegation timed out after ${DELEGATION_TIMEOUT_MS / 1000}s. Target agent "${targetAgent.name}" took too long to complete.`));
          const timedOutRun = runner.getActiveRunForSession(delegationSessionId);
          if (timedOutRun) runner.stopRun(timedOutRun.runId);
        }, DELEGATION_TIMEOUT_MS);
      });

      try {
        targetRun = await Promise.race([
          runner.runAgentAndWait(
            targetAgentId,
            'manual',
            retryPrompt,
            delegationSessionId,
          ),
          timeoutPromise,
        ]);
        lastTechnicalError = '';
      } catch (runErr: any) {
        lastTechnicalError = runErr?.message || String(runErr);
        if (delegationAttempt >= MAX_DELEGATION_RETRIES) {
          throw runErr; // re-throw to outer catch after exhausting retries
        }
      } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle);
      }

      // If run succeeded or produced output, stop retrying
      if (!lastTechnicalError && targetRun && targetRun.status !== 'failed') break;

      // Still failing? Check if retries left
      if (delegationAttempt >= MAX_DELEGATION_RETRIES) break;

      if (!lastTechnicalError && targetRun?.status === 'failed') {
        lastTechnicalError = targetRun.error || targetRun.summary || 'Run failed without error detail';
      }

      // Exponential backoff: 5s → 10s → 20s → 40s, capped at 60s
      const delaySec = Math.min(5 * Math.pow(2, delegationAttempt - 1), 60);

      console.warn(
        `[AgentRunner] Delegation attempt ${delegationAttempt}/${MAX_DELEGATION_RETRIES} failed for agent ` +
        `"${targetAgent.name}". Retrying in ${delaySec}s… (${lastTechnicalError})`,
      );

      // Broadcast retry event (mirrors cron/manual retry UI notification)
      runner.broadcastDelegationRetry(
        targetAgentId,
        delegationSessionId,
        delegationAttempt,
        MAX_DELEGATION_RETRIES,
        delaySec,
        lastTechnicalError,
      );

      await new Promise<void>((resolve) => setTimeout(resolve, delaySec * 1000));
    }

    // Check if the agent formally closed the task via close_delegation_task
    const closure = runner.getDelegationClosure(delegationSessionId);
    const isToolClosed = Boolean(closure);
    const finalStatus = closure?.status || targetRun?.status || (lastTechnicalError ? 'failed' : 'completed');
    let finalSummary = closure?.summary || targetRun?.summary || targetRun?.error || lastTechnicalError || '';
    let deliverables = closure?.deliverables || [];
    const notes = closure?.notes;

    // Fallback: If target completed but did not formally call close_delegation_task
    if (!finalSummary || finalSummary === '(No output recorded)') {
      try {
        const msgs = typeof db.getSessionMessages === 'function' ? db.getSessionMessages(delegationSessionId) : [];
        const lastAsst = msgs.slice().reverse().find((m: any) => m.role === 'assistant');
        if (lastAsst && lastAsst.content) {
          finalSummary = lastAsst.content.slice(0, 3000);
        } else if (targetRun?.error) {
          finalSummary = targetRun.error;
        } else {
          finalSummary = `Task completed by ${targetAgent.name}.`;
        }
      } catch {
        finalSummary = targetRun?.error || lastTechnicalError || `Task completed by ${targetAgent.name}.`;
      }
    }

    const isFailed = finalStatus === 'failed' || (!isToolClosed && !targetRun);

    // Write response markdown file in caller workspace
    const safeTitle = (taskTitle || 'task')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '_')
      .slice(0, 30);
    const reportsDir = join(callerInfo.callerWorkspace, 'reports');
    if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });
    const responseFileName = isToolClosed
      ? `closed_${safeTitle}_${Date.now()}.md`
      : `response_${safeTitle}_${Date.now()}.md`;
    const responseFullPath = join(reportsDir, responseFileName);
    const responseRelativePath = join('reports', responseFileName);

    const deliverablesSection = deliverables.length > 0
      ? `\n## 📦 Deliverables:\n${deliverables.map((d: string) => `- \`${d}\``).join('\n')}\n`
      : '';
    const notesSection = notes
      ? `\n### 💡 Handover Notes:\n${notes}\n`
      : '';

    const responseMarkdown = [
      `# ${isToolClosed ? '🏁 Delegated Task Closed' : (isFailed ? '⚠️ Failed' : '✅ Response')}: ${taskTitle}`,
      `- **Agent**: ${targetAgent.name} (\`${targetAgentId}\`)`,
      `- **Thread**: \`${delegationSessionId}\` (${isFollowUp ? 'Follow-up' : 'Initial'})`,
      `- **Status**: ${finalStatus.toUpperCase()}`,
      `- **Closed Via Tool**: ${isToolClosed ? 'Yes (`close_delegation_task`)' : 'No'}`,
      delegationAttempt > 1 ? `- **Attempts**: ${delegationAttempt} of ${MAX_DELEGATION_RETRIES}` : '',
      requirementsFilePath ? `- **Requirements**: \`${requirementsFilePath}\`` : '',
      deliverablesSection,
      '## Output Summary:',
      finalSummary,
      notesSection,
      '---',
      '### 💬 Follow-Up:',
      `To reply or continue in this thread, call \`delegate_task\` with \`"chat_id": "${delegationSessionId}"\`.`,
    ].filter(Boolean).join('\n');

    writeFileSync(responseFullPath, responseMarkdown, 'utf-8');

    return {
      success: finalStatus === 'completed',
      status: finalStatus,
      target_agent_id: targetAgentId,
      target_agent_name: targetAgent.name,
      task_title: taskTitle,
      chat_id: delegationSessionId,
      session_id: delegationSessionId,
      response_file_path: responseRelativePath,
      summary: finalSummary,
      deliverables,
      notes,
      closed_via_tool: isToolClosed,
      error: isFailed ? finalSummary : undefined,
    };
  } catch (err: any) {
    return {
      success: false,
      status: 'failed',
      target_agent_id: targetAgentId,
      target_agent_name: targetAgent.name,
      task_title: taskTitle,
      chat_id: delegationSessionId,
      session_id: delegationSessionId,
      error: `Execution error on agent "${targetAgent.name}": ${err.message}`,
    };
  } finally {
    if (delegationTrackId) {
      runner.unregisterActiveDelegation(delegationTrackId);
    }
    // Clean up the delegation chain metadata for this session
    runner.cleanupDelegationChain(delegationSessionId);
  }
}

/**
 * Canvas-owned custom tools.
 */
const BASE_CUSTOM_AGENT_TOOLS: ToolDefinition[] = [
  {
    name: 'canvas_ping',
    description:
      'Dummy canvas custom tool. Returns a greeting, the current server time, and the active workspace path. Use it to confirm that custom tools are wired end-to-end.',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Optional message to echo back to the caller.',
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false },
    presentation: { icon: '🏓', label: 'Canvas Ping', family: 'inspect', tone: 'success' },
    async execute(input, ctx) {
      const message = typeof input.message === 'string' && input.message.length > 0
        ? input.message
        : 'pong';

      const payload = {
        ok: true,
        message,
        time: new Date().toISOString(),
        workspace: ctx.workspacePath,
      };

      return {
        success: true,
        summary: `canvas_ping → ${message}`,
        content: [{ type: 'text', text: JSON.stringify(payload) }],
        data: payload,
      };
    },
  },
  {
    name: 'connect_mcp',
    description:
      'Connects a remote MCP server that needs the user to sign in with their account. It discovers the server\'s OAuth configuration, opens the user\'s browser to the provider\'s consent page, and waits for the sign-in to finish. Call it when an attached MCP reports it needs OAuth or returns 401/unauthorized. Local servers that need an API key instead return the credential names the user must supply.',
    inputSchema: {
      type: 'object',
      properties: {
        mcp_name: {
          type: 'string',
          description: 'The stock MCP name to connect, e.g. "vercel-remote".',
        },
        wait_seconds: {
          type: 'number',
          description:
            'How long to wait for the user to finish signing in before giving up. Default 120, capped at 300.',
        },
      },
      required: ['mcp_name'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    presentation: { icon: '🔐', label: 'Connect MCP', family: 'run', tone: 'primary' },
    async execute(input, _ctx) {
      const mcpName = typeof input.mcp_name === 'string' ? input.mcp_name.trim() : '';
      const stock = STOCK_MCPS.find((s) => s.name === mcpName);
      if (!mcpName || !stock) {
        const payload = {
          ok: false,
          error: mcpName
            ? `"${mcpName}" is not a stock MCP server.`
            : 'mcp_name is required.',
        };
        return {
          success: false,
          summary: `connect_mcp → ${payload.error}`,
          content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
          data: payload,
        };
      }

      // The callback must land on this server, which owns the OAuth client. Use
      // the same pinned URI as the HTTP routes so the registered client and the
      // authorize request never disagree (providers match byte for byte).
      const redirectUri = canonicalRedirectUri();
      const outcome = await startConnect(mcpName, { redirectUri, launch: 'server' });

      const finish = (
        ok: boolean,
        message: string,
        extra: Record<string, unknown> = {},
        isError = !ok
      ) => {
        const payload = { ok, mcpName, label: stock.label, ...extra };
        return {
          success: ok,
          isError,
          summary: `connect_mcp → ${message}`,
          content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
          data: payload,
        };
      };

      if (outcome.status === 'connected') {
        return finish(true, `${stock.label} is already connected.`, { status: 'connected' });
      }

      if (outcome.status === 'needs-token') {
        return finish(
          false,
          `${stock.label} needs ${outcome.required.join(', ') || 'a token'}, not a browser sign-in.`,
          {
            status: 'needs-token',
            required: outcome.required,
            guidance:
              `Ask the user to paste ${outcome.required.join(', ') || 'the token'} ` +
              `into the ${stock.label} card in the Library, then call connect_mcp again.`,
          },
        );
      }

      if (outcome.status === 'needs-client') {
        return finish(false, `${stock.label} needs its own OAuth App.`, {
          status: 'needs-client',
          guidance: outcome.reason,
        });
      }

      if (outcome.status === 'failed') {
        return finish(false, `Could not start OAuth for ${stock.label}.`, {
          status: 'failed',
          error: outcome.reason,
        });
      }

      // awaiting-auth: the browser is open. Poll until the callback exchanges
      // the code, exactly like mcp-remote waits for the local redirect.
      const requested = Number(input.wait_seconds);
      const waitSeconds = Math.min(
        300,
        Math.max(0, Number.isFinite(requested) ? requested : 120)
      );
      const deadline = Date.now() + waitSeconds * 1000;

      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        if (authStatus(mcpName).connected) {
          return finish(true, `Connected ${stock.label}.`, {
            status: 'connected',
            authorizationUrl: outcome.authorizationUrl,
          });
        }
      }

      const timedOut = !authStatus(mcpName).connected;
      if (timedOut) {
        return finish(
          false,
          `Waiting for the user to finish signing in to ${stock.label}.`,
          {
            status: 'awaiting-auth',
            authorizationUrl: outcome.authorizationUrl,
            browserOpened: outcome.browserOpened,
            guidance:
              'The browser should be open on the provider consent page. Ask the user to ' +
              'finish signing in, then call connect_mcp again to confirm.',
          },
          false,
        );
      }

      return finish(true, `Connected ${stock.label}.`, { status: 'connected' });
    },
  },
  {
    name: 'delegate_task',
    description:
      'Delegate tasks, report status, request approvals, or sync with peers. Provide target_agent_id (or agent name) and either instructions, prompt, task_title, or requirements_file_path. Pass chat_id to continue an existing thread. Writes reports to reports/ and returns results.',
    inputSchema: {
      type: 'object',
      properties: {
        target_agent_id: {
          type: 'string',
          description: 'Target peer agent ID or agent name.',
        },
        task_title: {
          type: 'string',
          description: 'Optional concise subtask title (auto-generated from instructions if omitted).',
        },
        instructions: {
          type: 'string',
          description: 'Task instructions, prompt, or details for the target agent.',
        },
        prompt: {
          type: 'string',
          description: 'Alias for instructions.',
        },
        task: {
          type: 'string',
          description: 'Alias for instructions or prompt.',
        },
        message: {
          type: 'string',
          description: 'Message or instructions to send to the target agent.',
        },
        requirements_file_path: {
          type: 'string',
          description: 'Optional path to requirements markdown file.',
        },
        communication_type: {
          type: 'string',
          enum: ['delegate', 'report_status', 'request_approval', 'inform'],
          description: 'Intent: "delegate" (work), "report_status" (deliverables), "request_approval" (risky actions), or "inform" (peer sync).',
        },
        chat_id: {
          type: 'string',
          description: 'Optional chat/session ID to continue thread with target agent.',
        },
        session_id: {
          type: 'string',
          description: 'Alias for chat_id.',
        },
        tasks: {
          type: 'array',
          description: 'Batch of subtasks to execute concurrently in parallel.',
          items: {
            type: 'object',
            properties: {
              target_agent_id: { type: 'string', description: 'Target peer agent ID or name.' },
              task_title: { type: 'string', description: 'Optional subtask title.' },
              instructions: { type: 'string', description: 'Task instructions or prompt.' },
              prompt: { type: 'string', description: 'Alias for instructions.' },
              task: { type: 'string', description: 'Alias for instructions.' },
              message: { type: 'string', description: 'Alias for instructions.' },
              requirements_file_path: {
                type: 'string',
                description: 'Optional path to requirements markdown file.',
              },
              communication_type: {
                type: 'string',
                enum: ['delegate', 'report_status', 'request_approval', 'inform'],
                description: 'Communication intent.',
              },
              chat_id: {
                type: 'string',
                description: 'Optional chat/session ID to continue thread.',
              },
              session_id: {
                type: 'string',
                description: 'Alias for chat_id.',
              },
            },
            required: ['target_agent_id'],
          },
        },
      },
      required: ['target_agent_id'],
      additionalProperties: true,
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    presentation: { icon: '🤝', label: 'Delegate Task', family: 'run', tone: 'primary' },
    async execute(input, ctx) {
      const runner = AgentRunner.getInstance();
      const db = runner.getDb();

      // Find calling agent from context runId or active runs
      const callerAgentId =
        (ctx as any)?.callerAgentId ||
        (ctx as any)?.agentId ||
        (ctx.runId ? runner.getActiveRun(ctx.runId)?.agentId : undefined) ||
        (ctx.sessionId ? runner.getActiveRunForSession(ctx.sessionId)?.agentId : undefined) ||
        (ctx.runId ? (db.getRun(ctx.runId) as any)?.agent_id : undefined);

      const callerRun =
        (ctx.runId ? runner.getActiveRun(ctx.runId) : undefined) ||
        (ctx.sessionId ? runner.getActiveRunForSession(ctx.sessionId) : undefined) ||
        (ctx.runId ? db.getRun(ctx.runId) : null);

      const callerAgent = callerAgentId ? db.getAgent(callerAgentId) : null;
      const callerName = callerAgent ? callerAgent.name : 'Peer Agent';
      const callerWorkspace =
        ctx.workspacePath || (callerAgent?.working_dir?.trim()) || process.cwd();

      const callerInfo = {
        callerAgentId,
        callerName,
        callerWorkspace,
        callerRunId: callerRun ? ('id' in callerRun ? callerRun.id : (callerRun as any).runId) : undefined,
        callerSessionId: ctx.sessionId,
      };

      // ── Parallel Multi-Task Delegation Flow ──
      if (Array.isArray(input.tasks) && input.tasks.length > 0) {
        const tasksList: SingleDelegationTaskInput[] = (input.tasks as any[]).map((t) => ({
          target_agent_id: String(t.target_agent_id || t.targetAgentId || t.agent_id || t.target || '').trim(),
          task_title: typeof t.task_title === 'string' ? t.task_title.trim() : typeof t.title === 'string' ? t.title.trim() : undefined,
          requirements_file_path: typeof t.requirements_file_path === 'string' ? t.requirements_file_path.trim() : undefined,
          instructions: typeof t.instructions === 'string' ? t.instructions.trim() : typeof t.prompt === 'string' ? t.prompt.trim() : typeof t.task === 'string' ? t.task.trim() : typeof t.message === 'string' ? t.message.trim() : undefined,
          communication_type: t.communication_type,
          chat_id: typeof t.chat_id === 'string' && t.chat_id.trim()
            ? t.chat_id.trim()
            : typeof t.session_id === 'string' && t.session_id.trim()
              ? t.session_id.trim()
              : undefined,
        }));

        // Execute all tasks concurrently in parallel with Promise.all
        const results = await Promise.all(
          tasksList.map((t) => executeSingleDelegatedTask(t, callerInfo, runner, db)),
        );

        const allSucceeded = results.every((r) => r.success);
        const successCount = results.filter((r) => r.success).length;

        const payload = {
          success: allSucceeded,
          parallel: true,
          total_tasks: results.length,
          successful_tasks: successCount,
          results,
        };

        const summaryText = `delegate_task → Parallel execution of ${results.length} tasks completed (${successCount}/${results.length} succeeded)`;

        return {
          success: allSucceeded,
          summary: summaryText,
          content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
          data: payload,
          isError: !allSucceeded,
        };
      }

      // ── Single Task Delegation Flow ──
      const rawTarget = String(
        input.target_agent_id ||
        (input as any).targetAgentId ||
        (input as any).agent_id ||
        (input as any).agentId ||
        (input as any).target ||
        (input as any).target_agent ||
        '',
      ).trim();

      const rawInstructions =
        typeof input.instructions === 'string' && input.instructions.trim()
          ? input.instructions.trim()
          : typeof (input as any).prompt === 'string' && (input as any).prompt.trim()
            ? (input as any).prompt.trim()
            : typeof (input as any).task === 'string' && (input as any).task.trim()
              ? (input as any).task.trim()
              : typeof (input as any).message === 'string' && (input as any).message.trim()
                ? (input as any).message.trim()
                : undefined;

      const singleTask: SingleDelegationTaskInput = {
        target_agent_id: rawTarget,
        task_title: typeof input.task_title === 'string' && input.task_title.trim()
          ? input.task_title.trim()
          : typeof (input as any).title === 'string' && (input as any).title.trim()
            ? (input as any).title.trim()
            : undefined,
        requirements_file_path: typeof input.requirements_file_path === 'string' && input.requirements_file_path.trim()
          ? input.requirements_file_path.trim()
          : typeof (input as any).requirementsFilePath === 'string' && (input as any).requirementsFilePath.trim()
            ? (input as any).requirementsFilePath.trim()
            : undefined,
        instructions: rawInstructions,
        communication_type: typeof input.communication_type === 'string' && ['delegate', 'report_status', 'request_approval', 'inform'].includes(input.communication_type) ? (input.communication_type as any) : undefined,
        chat_id: typeof input.chat_id === 'string' && input.chat_id.trim()
          ? input.chat_id.trim()
          : typeof input.session_id === 'string' && input.session_id.trim()
            ? input.session_id.trim()
            : undefined,
      };

      if (!singleTask.target_agent_id) {
        return {
          success: false,
          summary: 'Missing target_agent_id for delegate_task',
          content: [
            {
              type: 'text',
              text: 'Error: target_agent_id is required to delegate a task.',
            },
          ],
          isError: true,
        };
      }

      if (!singleTask.task_title && !singleTask.instructions && !singleTask.requirements_file_path) {
        return {
          success: false,
          summary: 'Missing task details for delegate_task',
          content: [
            {
              type: 'text',
              text: 'Error: Please provide instructions, prompt, task_title, or requirements_file_path for the target agent.',
            },
          ],
          isError: true,
        };
      }

      const result = await executeSingleDelegatedTask(singleTask, callerInfo, runner, db);

      const summaryText = result.success
        ? `delegate_task → ${result.target_agent_name} completed "${result.task_title}" (${result.status}) [chat_id: ${result.chat_id}]`
        : `delegate_task → Failed: ${result.error || result.status} [chat_id: ${result.chat_id}]`;

      return {
        success: result.success,
        summary: summaryText,
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        data: result,
        isError: !result.success,
      };
    },
  },
  {
    name: 'close_delegation_task',
    description:
      'Formally close a delegated task assigned to you by another agent and return your deliverables, summary, and status back to the caller. ' +
      'Whenever executing a task assigned to you via delegate_task, you MUST call this tool when your work is finished, blocked, or failed. ' +
      'Calling this tool seals and returns a structured completion packet with your deliverables and summary directly back to the calling agent.',
    inputSchema: {
      type: 'object',
      properties: {
        chat_id: {
          type: 'string',
          description: 'Optional delegation chat_id / thread ID. Automatically defaults to your current conversation session if omitted.',
        },
        status: {
          type: 'string',
          enum: ['completed', 'failed', 'blocked'],
          description: 'The outcome status of the delegated task.',
        },
        summary: {
          type: 'string',
          description: 'Comprehensive executive summary of the work completed, findings, decisions, or results.',
        },
        deliverables: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of file paths, reports, artifacts, or code files created or modified during this task.',
        },
        notes: {
          type: 'string',
          description: 'Optional handover notes, recommendations, or instructions for the caller agent.',
        },
      },
      required: ['status', 'summary'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    presentation: { icon: '🏁', label: 'Close Delegated Task', family: 'run', tone: 'primary' },
    async execute(input, ctx) {
      const runner = AgentRunner.getInstance();
      const chatId = String(
        input.chat_id ||
        (input as any).sessionId ||
        (input as any).session_id ||
        ctx.sessionId ||
        '',
      ).trim();

      const rawStatus = String((input as any).status || '').trim();
      const status = (['completed', 'failed', 'blocked'].includes(rawStatus)
        ? rawStatus
        : 'completed') as 'completed' | 'failed' | 'blocked';
      const summaryText = String(input.summary || 'Delegated task closed.').trim();
      const deliverables = Array.isArray(input.deliverables)
        ? input.deliverables.map(String).filter(Boolean)
        : [];
      const notes = input.notes ? String(input.notes).trim() : undefined;

      const activeRun =
        (ctx.runId ? runner.getActiveRun(ctx.runId) : undefined) ||
        (chatId ? runner.getActiveRunForSession(chatId) : undefined);

      const resolvedChatId = chatId || activeRun?.sessionId || '';
      if (!resolvedChatId) {
        return {
          success: false,
          summary: 'Cannot close delegated task: no chat_id or active conversation session was provided.',
          content: [{ type: 'text', text: 'Error: no chat_id or active conversation session was provided.' }],
          isError: true,
        };
      }

      const closingAgentId = String((ctx as any).agentId || activeRun?.agentId || '').trim();
      const session = runner.getDb().getSession(resolvedChatId);
      const ownsSession =
        Boolean(closingAgentId) &&
        (activeRun?.agentId === closingAgentId || session?.agent_id === closingAgentId);
      if (!ownsSession) {
        return {
          success: false,
          summary: `Cannot close delegation "${resolvedChatId}": it does not belong to this agent.`,
          content: [{
            type: 'text',
            text: `Error: chat_id "${resolvedChatId}" is not an active delegation session for this agent.`,
          }],
          isError: true,
        };
      }

      const closurePayload = {
        chatId: resolvedChatId,
        status,
        summary: summaryText,
        deliverables,
        notes,
        closedByAgentId: closingAgentId,
        closedAt: new Date().toISOString(),
      };

      runner.recordDelegationClosure(resolvedChatId, closurePayload);
      runner.propagateSubDelegationClose(resolvedChatId, closurePayload.closedByAgentId);
      if (activeRun) {
        activeRun.delegationClosure = closurePayload;
      }

      try {
        if (ctx.runId) {
          const db = runner.getDb();
          const callerRun = activeRun || db.getRun(ctx.runId);
          const agentId = callerRun ? ('agent_id' in callerRun ? callerRun.agent_id : callerRun.agentId) : undefined;
          if (agentId) {
            try {
              db.updateAgentLastSync(agentId);
            } catch {}
            db.addRunEvent({
              run_id: ctx.runId,
              agent_id: agentId,
              event_type: 'delegation.closed',
              payload_json: JSON.stringify(closurePayload),
            });
          }
        }
      } catch (err) {
        console.warn('[close_delegation_task] Error logging run event:', err);
      }

      return {
        success: true,
        summary: `Delegated task closed with status "${status}". Deliverables packaged for caller.`,
        content: [
          {
            type: 'text',
            text: `🏁 **Delegated Task Formally Closed**\n\n` +
              `- **Status**: ${status.toUpperCase()}\n` +
              `- **Thread (chat_id)**: \`${resolvedChatId}\`\n` +
              `- **Summary**: ${summaryText}\n` +
              (deliverables.length > 0 ? `- **Deliverables (${deliverables.length})**:\n${deliverables.map((d: string) => `  - \`${d}\``).join('\n')}\n` : '') +
              (notes ? `- **Notes**: ${notes}\n` : '') +
              `\nYour deliverables and executive summary have been recorded and delivered back to the caller agent.`,
          },
        ],
        data: closurePayload,
      };
    },
  },
  {
    name: 'complete_delegated_task',
    description: 'Alias for close_delegation_task. Formally close a delegated task assigned to you by another agent and return your deliverables, summary, and status back to the caller.',
    inputSchema: {
      type: 'object',
      properties: {
        chat_id: { type: 'string', description: 'The delegation chat_id / thread ID provided in your prompt.' },
        status: { type: 'string', enum: ['completed', 'failed', 'blocked'], description: 'The outcome status of the delegated task.' },
        summary: { type: 'string', description: 'Comprehensive executive summary of the work completed.' },
        deliverables: { type: 'array', items: { type: 'string' }, description: 'List of file paths, reports, or artifacts produced.' },
        notes: { type: 'string', description: 'Optional handover notes or recommendations.' },
      },
      required: ['status', 'summary'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    presentation: { icon: '🏁', label: 'Complete Delegated Task', family: 'run', tone: 'primary' },
    async execute(input, ctx) {
      const closeTool = CUSTOM_AGENT_TOOLS.find((t) => t.name === 'close_delegation_task');
      if (closeTool) {
        return closeTool.execute(input, ctx);
      }
      return { success: false, summary: 'close_delegation_task tool not found' };
    },
  },
  {
    name: 'get_agent_skills',
    description:
      'Inspect and list the skills currently attached to this agent (or a target peer agent). Returns the exact count, names, descriptions, and source of attached skills. Call this whenever the user asks what skills you have attached, how many skills you have, or when verifying your skills configuration.',
    inputSchema: {
      type: 'object',
      properties: {
        target_agent_id: {
          type: 'string',
          description: 'Optional ID, full name, or role of the target agent to inspect. Defaults to the calling agent itself.',
        },
        target_agent_name: {
          type: 'string',
          description: 'Optional name of the target agent (alias for target_agent_id).',
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false },
    presentation: { icon: '✨', label: 'Get Attached Skills', family: 'run', tone: 'primary' },
    async execute(input, ctx) {
      const runner = AgentRunner.getInstance();
      const db = runner.getDb();
      const callerRun = runner.getActiveRun(ctx.runId) || (ctx.runId ? db.getRun(ctx.runId) : null);
      const callerAgentId = callerRun
        ? ('agent_id' in callerRun ? callerRun.agent_id : callerRun.agentId)
        : undefined;
      const rawTarget = input.target_agent_id || (input as any).target_agent_name || (input as any).target_agent;
      const agent = resolveTargetAgent(db, rawTarget, callerAgentId);
      if (!agent) {
        return {
          success: false,
          summary: `Agent "${rawTarget || 'unknown'}" not found`,
          content: [{ type: 'text', text: `Error: Agent "${rawTarget || 'unknown'}" not found.` }],
          isError: true,
        };
      }

      const skills = db.getAgentSkills(agent.id).filter((s) => s.enabled !== 0);
      const payload = {
        agent_id: agent.id,
        agent_name: agent.name,
        total_attached_skills: skills.length,
        skills: skills.map((s, idx) => ({
          index: idx + 1,
          name: s.skill_name,
          description: s.description || s.skill_name,
          source: s.source || 'user',
        })),
      };

      const text = skills.length === 0
        ? `Agent "${agent.name}" has 0 skills attached.`
        : `Agent "${agent.name}" has **${skills.length} skills attached**:\n\n` +
          skills.map((s, idx) => `${idx + 1}. **${s.skill_name}** — ${s.description || 'No description'} (source: ${s.source || 'user'})`).join('\n');

      return {
        success: true,
        summary: `${agent.name} has ${skills.length} attached skill(s)`,
        content: [{ type: 'text', text }],
        data: payload,
      };
    },
  },
  {
    name: 'unattach_skill',
    description:
      'Unattaches and removes one or more skills from this agent (or from a target peer agent). Call this whenever the user asks you to remove, detach, or unattach any skill or set of skills. This immediately removes the skills from the database, deletes local skill files, and reflects live on the canvas and UI.',
    inputSchema: {
      type: 'object',
      properties: {
        skill_name: {
          type: 'string',
          description: 'The name, slug, or ID of a single skill to unattach (or comma/and-separated list).',
        },
        skill_names: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional list of skill names to unattach simultaneously.',
        },
        target_agent_id: {
          type: 'string',
          description: 'Optional ID, full name, or role of the target agent to remove skills from. Defaults to the calling agent itself.',
        },
        target_agent_name: {
          type: 'string',
          description: 'Optional name of the target agent (alias for target_agent_id).',
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    presentation: { icon: '✂️', label: 'Unattach Skill', family: 'run', tone: 'destructive' },
    async execute(input, ctx) {
      const runner = AgentRunner.getInstance();
      const db = runner.getDb();

      const callerRun = runner.getActiveRun(ctx.runId) || (ctx.runId ? db.getRun(ctx.runId) : null);
      const callerAgentId = callerRun
        ? ('agent_id' in callerRun ? callerRun.agent_id : callerRun.agentId)
        : undefined;

      const rawTarget = input.target_agent_id || (input as any).target_agent_name || (input as any).target_agent;
      const agent = resolveTargetAgent(db, rawTarget, callerAgentId);
      if (!agent) {
        return {
          success: false,
          summary: `Agent "${rawTarget || 'unknown'}" not found`,
          content: [{ type: 'text', text: `Error: Agent "${rawTarget || 'unknown'}" not found.` }],
          isError: true,
        };
      }

      // Collect skill targets (support single string, comma-separated string, or array)
      const requestedTargets: string[] = [];
      if (Array.isArray(input.skill_names)) {
        for (const item of input.skill_names) {
          if (typeof item === 'string' && item.trim()) requestedTargets.push(item.trim());
        }
      }
      if (typeof input.skill_name === 'string' && input.skill_name.trim()) {
        const raw = input.skill_name.trim();
        // Check for comma or " and " separation
        const parts = raw.split(/,| and /i).map((p) => p.trim()).filter(Boolean);
        for (const p of parts) {
          if (!requestedTargets.includes(p)) requestedTargets.push(p);
        }
      }

      if (requestedTargets.length === 0) {
        return {
          success: false,
          summary: 'No skill name provided to unattach',
          content: [{ type: 'text', text: 'Error: Must provide "skill_name" or "skill_names".' }],
          isError: true,
        };
      }

      const allSkills = db.getAgentSkills(agent.id);
      const matchedSkills: typeof allSkills = [];
      const notFoundNames: string[] = [];

      const normalizeSlug = (s: string) =>
        s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

      for (const target of requestedTargets) {
        const tLower = target.toLowerCase();
        const tSlug = normalizeSlug(target);

        let match = allSkills.find((s) => {
          if (matchedSkills.some((m) => m.id === s.id)) return false;
          const sLower = s.skill_name.toLowerCase();
          const sSlug = normalizeSlug(s.skill_name);
          const sId = s.id.toLowerCase();
          return (
            sLower === tLower ||
            sSlug === tSlug ||
            sId === tLower ||
            sLower.includes(tLower) ||
            tLower.includes(sLower) ||
            sSlug.includes(tSlug) ||
            tSlug.includes(sSlug)
          );
        });

        if (!match) {
          let best: { skill: (typeof allSkills)[0]; score: number } | null = null;
          for (const s of allSkills) {
            if (matchedSkills.some((m) => m.id === s.id)) continue;
            const score = computeFuzzyScore(target, {
              primary: s.skill_name,
              secondary: s.id,
              tertiary: s.description || '',
            });
            if (score >= 70 && (!best || score > best.score)) {
              best = { skill: s, score };
            }
          }
          if (best) match = best.skill;
        }

        if (match) {
          matchedSkills.push(match);
        } else {
          notFoundNames.push(target);
        }
      }

      if (matchedSkills.length === 0) {
        const available = allSkills.map((s) => s.skill_name).join(', ') || 'none';
        return {
          success: false,
          summary: `No matching skills found on ${agent.name}`,
          content: [
            {
              type: 'text',
              text: `None of the requested skills (${requestedTargets.join(', ')}) were found on ${agent.name}. Currently attached skills: ${available}.`,
            },
          ],
          isError: true,
        };
      }

      // Delete matched skills from SQLite
      for (const m of matchedSkills) {
        db.deleteAgentSkill(m.id);
      }

      // Physically remove skill files / folders in workspace if present and sync disk manifest
      try {
        const workspace = resolveAgentWorkspace(agent);
        const ws = ensureAgentWorkspace(workspace, agent.id, agent.name, agent.system_prompt);

        for (const m of matchedSkills) {
          const slug = normalizeSlug(m.skill_name);
          const candidates = [
            join(ws.skillsDir, `${m.skill_name}.md`),
            join(ws.skillsDir, `${slug}.md`),
            join(ws.skillsDir, m.skill_name),
            join(ws.skillsDir, slug),
            join(ws.skillsEnabledDir, m.skill_name),
            join(ws.skillsEnabledDir, slug),
          ];
          for (const cand of candidates) {
            if (existsSync(cand)) {
              try {
                rmSync(cand, { recursive: true, force: true });
              } catch {}
            }
          }
        }

        syncAgentDiskManifestFromDb({ agentId: agent.id, ws, db });
      } catch (err) {
        console.warn(`[custom-tools] Failed to sync disk after unattach_skill for ${agent.id}:`, err);
      }

      // Broadcast live updates to UI and canvas
      try {
        const wsServer = CoreWsServer.getInstance();
        wsServer.broadcast({
          type: 'agent_skills_updated',
          agentId: agent.id,
          data: { timestamp: new Date().toISOString() },
        });
        wsServer.broadcast({
          type: 'agent_updated',
          agentId: agent.id,
          data: db.getAgent(agent.id),
        });
        wsServer.broadcast({
          type: 'agent_manifest_updated',
          agentId: agent.id,
          data: { agent_id: agent.id, updated_at: new Date().toISOString() },
        });
        wsServer.broadcast({
          type: 'agent_files_updated',
          agentId: agent.id,
          data: { timestamp: new Date().toISOString() },
        });
      } catch {}

      const remainingSkills = db.getAgentSkills(agent.id).map((s) => s.skill_name);
      const unattachedNames = matchedSkills.map((m) => m.skill_name);
      const payload = {
        ok: true,
        unattached_skills: unattachedNames,
        not_found: notFoundNames.length > 0 ? notFoundNames : undefined,
        agent_id: agent.id,
        agent_name: agent.name,
        remaining_skills: remainingSkills,
        total_remaining: remainingSkills.length,
      };

      const summaryText = `Unattached ${unattachedNames.length} skill(s) from ${agent.name}: ${unattachedNames.join(', ')}. Remaining attached skills (${remainingSkills.length}): ${remainingSkills.join(', ') || 'none'}.`;

      return {
        success: true,
        summary: `Unattached ${unattachedNames.join(', ')} from ${agent.name}`,
        content: [{ type: 'text', text: summaryText }],
        data: payload,
      };
    },
  },
  {
    name: 'attach_skill',
    description:
      'Attaches one or more skills to this agent (or a target peer agent). Automatically resolves skills from the available stock and bundled skill catalog (including full instructions and bodies) or accepts custom skill markdown. Immediately updates the database, writes local skill files, and reflects live on the canvas and UI.',
    inputSchema: {
      type: 'object',
      properties: {
        skill_name: {
          type: 'string',
          description: 'The name, slug, or ID of a single skill to attach (or comma/and-separated list of skills).',
        },
        skill_names: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional list of skill names to attach simultaneously.',
        },
        description: {
          type: 'string',
          description: 'Optional custom description of the skill (used if attaching a custom skill).',
        },
        content: {
          type: 'string',
          description: 'Optional skill markdown instructions or body (used if attaching a custom skill).',
        },
        target_agent_id: {
          type: 'string',
          description: 'Optional ID, full name, or role of the target agent to attach the skill to. Defaults to the calling agent itself.',
        },
        target_agent_name: {
          type: 'string',
          description: 'Optional name of the target agent (alias for target_agent_id).',
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    presentation: { icon: '✨', label: 'Attach Skill', family: 'run', tone: 'primary' },
    async execute(input, ctx) {
      const runner = AgentRunner.getInstance();
      const db = runner.getDb();

      const callerRun = runner.getActiveRun(ctx.runId) || (ctx.runId ? db.getRun(ctx.runId) : null);
      const callerAgentId = callerRun
        ? ('agent_id' in callerRun ? callerRun.agent_id : callerRun.agentId)
        : undefined;

      const rawTarget = input.target_agent_id || (input as any).target_agent_name || (input as any).target_agent;
      const agent = resolveTargetAgent(db, rawTarget, callerAgentId);
      if (!agent) {
        return {
          success: false,
          summary: `Agent "${rawTarget || 'unknown'}" not found`,
          content: [{ type: 'text', text: `Error: Agent "${rawTarget || 'unknown'}" not found.` }],
          isError: true,
        };
      }

      const requestedTargets: string[] = [];
      if (Array.isArray(input.skill_names)) {
        for (const item of input.skill_names) {
          requestedTargets.push(...parseTargetList(item));
        }
      }
      if (typeof input.skill_name === 'string') {
        requestedTargets.push(...parseTargetList(input.skill_name));
      }

      if (requestedTargets.length === 0) {
        return {
          success: false,
          summary: 'No skill specified to attach',
          content: [{ type: 'text', text: 'Error: Please provide a skill_name or skill_names to attach.' }],
          isError: true,
        };
      }

      const coreDb = CoreDatabase.getInstance();
      const stockSkills = coreDb.getAllStockSkills();
      let bundledSkills: any[] = [];
      try {
        bundledSkills = loadAgentSkills();
      } catch {}
      const pluginSkills = loadGitHubPluginSkills();

      const workspace = resolveAgentWorkspace(agent);
      const ws = ensureAgentWorkspace(workspace, agent.id, agent.name, agent.system_prompt);

      const attachedSkills: string[] = [];
      for (const target of requestedTargets) {
        const norm = target.trim().toLowerCase();
        const slug = slugifyName(target);

        // Find match in stock skills or bundled
        let stockMatch = stockSkills.find(
          (s) =>
            s.id.toLowerCase() === norm ||
            s.name.toLowerCase() === norm ||
            slugifyName(s.id) === slug ||
            slugifyName(s.name) === slug,
        );

        if (!stockMatch) {
          let bestStock: { skill: (typeof stockSkills)[0]; score: number } | null = null;
          for (const s of stockSkills) {
            const score = computeFuzzyScore(target, {
              primary: s.name,
              secondary: `${s.id} ${s.category}`,
              tertiary: s.description || '',
            });
            if (score >= 70 && (!bestStock || score > bestStock.score)) {
              bestStock = { skill: s, score };
            }
          }
          if (bestStock) stockMatch = bestStock.skill;
        }

        let bundledMatch = !stockMatch
          ? bundledSkills.find(
              (b) =>
                b.id.toLowerCase() === norm ||
                b.name.toLowerCase() === norm ||
                slugifyName(b.id) === slug ||
                slugifyName(b.name) === slug,
            )
          : null;

        if (!stockMatch && !bundledMatch) {
          let bestBundled: { skill: any; score: number } | null = null;
          for (const b of bundledSkills) {
            const score = computeFuzzyScore(target, {
              primary: b.name,
              secondary: b.id,
              tertiary: b.description || '',
            });
            if (score >= 70 && (!bestBundled || score > bestBundled.score)) {
              bestBundled = { skill: b, score };
            }
          }
          if (bestBundled) bundledMatch = bestBundled.skill;
        }

        // Check curated GitHub plugin skills
        let pluginMatch =
          !stockMatch && !bundledMatch
            ? pluginSkills.find(
                (p) =>
                  p.id.toLowerCase() === norm ||
                  p.name.toLowerCase() === norm ||
                  p.repo.toLowerCase() === norm ||
                  p.repo.split('/')[1]?.toLowerCase() === norm ||
                  slugifyName(p.name) === slug ||
                  slugifyName(p.repo) === slug ||
                  slugifyName(p.repo.split('/')[1] || '') === slug,
              )
            : null;

        if (!stockMatch && !bundledMatch && !pluginMatch) {
          let bestPlugin: { skill: (typeof pluginSkills)[0]; score: number } | null = null;
          for (const p of pluginSkills) {
            const repoPart = p.repo.split('/')[1] || '';
            const score = computeFuzzyScore(target, {
              primary: `${p.name} ${p.repo} ${repoPart}`,
              secondary: p.category,
              tertiary: p.description || '',
            });
            if (score >= 70 && (!bestPlugin || score > bestPlugin.score)) {
              bestPlugin = { skill: p, score };
            }
          }
          if (bestPlugin) pluginMatch = bestPlugin.skill;
        }

        // Direct GitHub owner/repo format fallback (e.g. "morluto/rea")
        if (
          !stockMatch &&
          !bundledMatch &&
          !pluginMatch &&
          /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(target)
        ) {
          const parts = target.split('/');
          const owner = parts[0];
          const repoName = parts[1];
          pluginMatch = {
            id: `plugin:${target}`,
            name: target,
            description: (input.description ? String(input.description) : '') || `GitHub plugin repository by @${owner}: ${repoName}`,
            category: 'Skills',
            tags: ['plugin', 'github', owner, repoName],
            content:
              (input.content ? String(input.content) : '') ||
              [
                `# ${target}`,
                '',
                `GitHub repository ${target} by @${owner}.`,
                '',
                '## Provenance',
                `- Repository: https://github.com/${target}`,
                '',
                '## How to use it',
                `Teach your agent to leverage ${target} directives, scripts, and workflows.`,
                '',
                '## Getting it locally',
                '```bash',
                `git clone https://github.com/${target}.git`,
                '```',
              ].join('\n'),
            isPlugin: true,
            repo: target,
          };
        }

        const canonicalName =
          stockMatch?.name || bundledMatch?.name || pluginMatch?.name || target;
        const skillSlug = slugifyName(
          stockMatch?.id || bundledMatch?.id || pluginMatch?.id || canonicalName,
        );
        const description =
          input.description ||
          stockMatch?.description ||
          bundledMatch?.description ||
          pluginMatch?.description ||
          canonicalName;
        const skillContent =
          input.content ||
          stockMatch?.content ||
          bundledMatch?.content ||
          pluginMatch?.content ||
          `# ${canonicalName}\n\n${description}\n`;

        if (pluginMatch) {
          try {
            coreDb.addStockSkill({
              id: pluginMatch.id,
              category: pluginMatch.category || 'Skills',
              name: pluginMatch.name,
              description: pluginMatch.description,
              content: skillContent,
              is_bundled: 0,
            });
          } catch {}
        }

        // Stock skills stay in the bundled catalog and are passed to the harness
        // directly. Only GitHub plugin skills need a physical bundle in the
        // agent workspace, and that install happens on first deployment.
        if (pluginMatch) {
          try {
            const targetSkillDir = join(ws.skillsDir, skillSlug);
            if (!existsSync(targetSkillDir)) {
              mkdirSync(targetSkillDir, { recursive: true });
            }
            const skillMdPath = join(targetSkillDir, 'SKILL.md');
            writeFileSync(skillMdPath, skillContent, 'utf8');
          } catch (fileErr) {
            console.warn(`[custom-tools] Failed to write skill file for ${skillSlug}:`, fileErr);
          }
        }

        // Upsert into DB
        const attachmentId = `${agent.id}::agent::${skillSlug}`;
        db.upsertAgentSkill({
          id: attachmentId,
          agent_id: agent.id,
          skill_name: canonicalName,
          description,
          content: skillContent,
          enabled: 1,
          source: 'agent',
        });

        attachedSkills.push(canonicalName);
      }

      try {
        syncAgentDiskManifestFromDb({ agentId: agent.id, ws, db });
      } catch (err) {
        console.warn(`[custom-tools] Failed to sync disk after attach_skill for ${agent.id}:`, err);
      }

      try {
        const wsServer = CoreWsServer.getInstance();
        wsServer.broadcast({
          type: 'agent_skills_updated',
          agentId: agent.id,
          data: { timestamp: new Date().toISOString() },
        });
        wsServer.broadcast({
          type: 'agent_updated',
          agentId: agent.id,
          data: db.getAgent(agent.id),
        });
        wsServer.broadcast({
          type: 'agent_manifest_updated',
          agentId: agent.id,
          data: { agent_id: agent.id, updated_at: new Date().toISOString() },
        });
        wsServer.broadcast({
          type: 'agent_files_updated',
          agentId: agent.id,
          data: { timestamp: new Date().toISOString() },
        });
      } catch {}

      const currentSkills = db
        .getAgentSkills(agent.id)
        .filter((s) => s.enabled !== 0)
        .map((s) => s.skill_name);

      const payload = {
        ok: true,
        attached_skills: attachedSkills,
        agent_id: agent.id,
        agent_name: agent.name,
        current_skills: currentSkills,
        total_attached: currentSkills.length,
      };

      return {
        success: true,
        summary: `Attached ${attachedSkills.join(', ')} to ${agent.name}`,
        content: [
          {
            type: 'text',
            text: `Attached ${attachedSkills.length} skill(s) to ${agent.name}: ${attachedSkills.join(', ')}. Current total attached skills (${currentSkills.length}): ${currentSkills.join(', ') || 'none'}.`,
          },
        ],
        data: payload,
      };
    },
  },
  {
    name: 'search_available_skills',
    description:
      'Searches all available stock skills, bundled library skills, and catalog skills that can be attached to this agent or peer agents. Use this whenever the user asks to find, list, or discover available skills from the catalog.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Optional keyword, name, or topic to search for (matches skill name, description, ID, and category). If omitted, returns available skills and category summary.',
        },
        category: {
          type: 'string',
          description: 'Optional category filter to narrow skills.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (defaults to 30).',
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false },
    presentation: { icon: '🔍', label: 'Search Skills', family: 'run', tone: 'default' },
    async execute(input) {
      const coreDb = CoreDatabase.getInstance();
      const dbStock = coreDb.getAllStockSkills();

      let bundledSkills: any[] = [];
      try {
        bundledSkills = loadAgentSkills();
      } catch {}

      const allMap = new Map<
        string,
        {
          id: string;
          name: string;
          category: string;
          description: string;
          content?: string;
          isPlugin?: boolean;
          repo?: string;
          stars?: number;
        }
      >();

      for (const s of dbStock) {
        allMap.set(s.id.toLowerCase(), {
          id: s.id,
          name: s.name,
          category: s.category || 'General',
          description: s.description || s.name,
          content: s.content,
        });
      }

      for (const b of bundledSkills) {
        if (!allMap.has(b.id.toLowerCase())) {
          allMap.set(b.id.toLowerCase(), {
            id: b.id,
            name: b.name,
            category: (b as any).domains?.[0] || 'Software Engineering',
            description: b.description || b.name,
            content: b.content,
          });
        }
      }

      const pluginSkills = loadGitHubPluginSkills();
      for (const p of pluginSkills) {
        if (!allMap.has(p.id.toLowerCase()) && !allMap.has(p.name.toLowerCase())) {
          allMap.set(p.id.toLowerCase(), {
            id: p.id,
            name: p.name,
            category: p.category || 'GitHub Plugins',
            description: p.description || p.name,
            content: p.content,
            isPlugin: true,
            repo: p.repo,
            stars: p.stars,
          });
        }
      }

      const all = Array.from(allMap.values());
      const query = String(input.query || '').trim().toLowerCase();
      const categoryFilter = String(input.category || '').trim().toLowerCase();
      const limit = typeof input.limit === 'number' && input.limit > 0 ? input.limit : 30;

      let scored = all.map((s) => {
        const repo = s.repo || '';
        const repoName = repo.split('/')[1] || '';
        const primary = repoName ? `${s.name} ${repo} ${repoName}` : s.name;
        return {
          item: s,
          score: query
            ? computeFuzzyScore(query, {
                primary,
                secondary: `${s.id} ${s.category}`,
                tertiary: s.description,
              })
            : 1,
        };
      });

      if (query) {
        scored = scored.filter((x) => x.score > 0);
      }
      if (categoryFilter) {
        scored = scored.filter((x) => x.item.category.toLowerCase().includes(categoryFilter));
      }

      scored.sort((a, b) => b.score - a.score);

      const totalMatches = scored.length;
      const results = scored.slice(0, limit).map((x) => x.item);
      const categories = Array.from(new Set(all.map((s) => s.category))).sort();

      const payload = {
        total_available: all.length,
        total_matched: totalMatches,
        returned: results.length,
        categories,
        skills: results,
      };

      return {
        success: true,
        summary: `Found ${totalMatches} available skill(s) matching "${query || categoryFilter || 'all'}"`,
        content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
        data: payload,
      };
    },
  },
  {
    name: 'unattach_mcp',
    description:
      'Unattaches and removes one or more MCP servers from this agent (or a target peer agent). Call this when the user asks you to remove, detach, or unattach an MCP server. This immediately updates the agent configuration and reflects live on the canvas and UI.',
    inputSchema: {
      type: 'object',
      properties: {
        mcp_name: {
          type: 'string',
          description: 'The name or label of a single MCP server to unattach (or comma/and-separated list).',
        },
        mcp_names: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional list of MCP server names to unattach simultaneously.',
        },
        target_agent_id: {
          type: 'string',
          description: 'Optional ID, full name, or role of the target agent. Defaults to calling agent.',
        },
        target_agent_name: {
          type: 'string',
          description: 'Optional name of the target agent (alias for target_agent_id).',
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    presentation: { icon: '🔌', label: 'Unattach MCP', family: 'run', tone: 'destructive' },
    async execute(input, ctx) {
      const runner = AgentRunner.getInstance();
      const db = runner.getDb();

      const callerRun = runner.getActiveRun(ctx.runId) || (ctx.runId ? db.getRun(ctx.runId) : null);
      const callerAgentId = callerRun
        ? ('agent_id' in callerRun ? callerRun.agent_id : callerRun.agentId)
        : undefined;

      const rawTarget = input.target_agent_id || (input as any).target_agent_name || (input as any).target_agent;
      const agent = resolveTargetAgent(db, rawTarget, callerAgentId);
      if (!agent) {
        return {
          success: false,
          summary: `Agent "${rawTarget || 'unknown'}" not found`,
          content: [{ type: 'text', text: `Error: Agent "${rawTarget || 'unknown'}" not found.` }],
          isError: true,
        };
      }

      const requestedTargets: string[] = [];
      if (Array.isArray(input.mcp_names)) {
        for (const item of input.mcp_names) {
          requestedTargets.push(...parseTargetList(item));
        }
      }
      if (typeof input.mcp_name === 'string') {
        requestedTargets.push(...parseTargetList(input.mcp_name));
      }

      if (requestedTargets.length === 0) {
        return {
          success: false,
          summary: 'No MCP specified to unattach',
          content: [{ type: 'text', text: 'Error: Please specify mcp_name or mcp_names to unattach.' }],
          isError: true,
        };
      }

      const mcps = db.getAgentMcps(agent.id);
      const unattachedNames: string[] = [];
      const notFoundNames: string[] = [];

      for (const target of requestedTargets) {
        const norm = target.toLowerCase();
        const slug = slugifyName(target);
        let matched = mcps.find(
          (m) =>
            m.mcp_name.toLowerCase() === norm ||
            (m.label && m.label.toLowerCase() === norm) ||
            m.id.toLowerCase() === norm ||
            slugifyName(m.mcp_name) === slug ||
            (m.label && slugifyName(m.label) === slug) ||
            m.mcp_name.toLowerCase().includes(norm) ||
            norm.includes(m.mcp_name.toLowerCase()),
        );

        if (!matched) {
          let best: { mcp: (typeof mcps)[0]; score: number } | null = null;
          for (const m of mcps) {
            const score = computeFuzzyScore(target, {
              primary: `${m.mcp_name} ${m.label || ''}`,
              secondary: m.id,
            });
            if (score >= 70 && (!best || score > best.score)) {
              best = { mcp: m, score };
            }
          }
          if (best) matched = best.mcp;
        }

        if (matched) {
          db.deleteAgentMcp(matched.id);
          unattachedNames.push(matched.label || matched.mcp_name);
        } else {
          notFoundNames.push(target);
        }
      }

      try {
        const workspace = resolveAgentWorkspace(agent);
        const ws = ensureAgentWorkspace(workspace, agent.id, agent.name, agent.system_prompt);
        syncAgentDiskManifestFromDb({ agentId: agent.id, ws, db });
      } catch (err) {
        console.warn(`[custom-tools] Failed to sync disk after unattach_mcp for ${agent.id}:`, err);
      }

      try {
        const wsServer = CoreWsServer.getInstance();
        wsServer.broadcast({
          type: 'agent_mcps_updated',
          agentId: agent.id,
          data: { timestamp: new Date().toISOString() },
        });
        wsServer.broadcast({
          type: 'agent_updated',
          agentId: agent.id,
          data: db.getAgent(agent.id),
        });
        wsServer.broadcast({
          type: 'agent_manifest_updated',
          agentId: agent.id,
          data: { agent_id: agent.id, updated_at: new Date().toISOString() },
        });
        wsServer.broadcast({
          type: 'agent_files_updated',
          agentId: agent.id,
          data: { timestamp: new Date().toISOString() },
        });
      } catch {}

      const remainingMcps = db.getAgentMcps(agent.id).map((m) => m.label || m.mcp_name);
      const payload = {
        ok: true,
        unattached_mcps: unattachedNames,
        not_found: notFoundNames.length > 0 ? notFoundNames : undefined,
        agent_id: agent.id,
        agent_name: agent.name,
        remaining_mcps: remainingMcps,
      };

      return {
        success: true,
        summary: `Unattached ${unattachedNames.join(', ')} from ${agent.name}`,
        content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
        data: payload,
      };
    },
  },
  {
    name: 'attach_mcp',
    description:
      'Attaches one or more MCP servers to this agent (or a target peer agent). Automatically resolves server details from the stock MCP catalog. Immediately updates the database and workspace, and reflects live on the canvas and UI.',
    inputSchema: {
      type: 'object',
      properties: {
        mcp_name: {
          type: 'string',
          description: 'The stock MCP name, label, or identifier to attach (or comma/and-separated list).',
        },
        mcp_names: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional list of MCP server names to attach simultaneously.',
        },
        label: {
          type: 'string',
          description: 'Optional human-readable label.',
        },
        target_agent_id: {
          type: 'string',
          description: 'Optional ID, full name, or role of the target agent. Defaults to calling agent.',
        },
        target_agent_name: {
          type: 'string',
          description: 'Optional name of the target agent (alias for target_agent_id).',
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    presentation: { icon: '⚡', label: 'Attach MCP', family: 'run', tone: 'primary' },
    async execute(input, ctx) {
      const runner = AgentRunner.getInstance();
      const db = runner.getDb();

      const callerRun = runner.getActiveRun(ctx.runId) || (ctx.runId ? db.getRun(ctx.runId) : null);
      const callerAgentId = callerRun
        ? ('agent_id' in callerRun ? callerRun.agent_id : callerRun.agentId)
        : undefined;

      const rawTarget = input.target_agent_id || (input as any).target_agent_name || (input as any).target_agent;
      const agent = resolveTargetAgent(db, rawTarget, callerAgentId);
      if (!agent) {
        return {
          success: false,
          summary: `Agent "${rawTarget || 'unknown'}" not found`,
          content: [{ type: 'text', text: `Error: Agent "${rawTarget || 'unknown'}" not found.` }],
          isError: true,
        };
      }

      const requestedTargets: string[] = [];
      if (Array.isArray(input.mcp_names)) {
        for (const item of input.mcp_names) {
          requestedTargets.push(...parseTargetList(item));
        }
      }
      if (typeof input.mcp_name === 'string') {
        requestedTargets.push(...parseTargetList(input.mcp_name));
      }

      if (requestedTargets.length === 0) {
        return {
          success: false,
          summary: 'No MCP specified to attach',
          content: [{ type: 'text', text: 'Error: Please specify mcp_name or mcp_names to attach.' }],
          isError: true,
        };
      }

      const attachedMcps: string[] = [];
      for (const target of requestedTargets) {
        const norm = target.toLowerCase();
        const slug = slugifyName(target);
        let stock = STOCK_MCPS.find(
          (s) =>
            s.name.toLowerCase() === norm ||
            s.label.toLowerCase() === norm ||
            slugifyName(s.name) === slug ||
            slugifyName(s.label) === slug,
        );

        if (!stock) {
          let best: { mcp: (typeof STOCK_MCPS)[0]; score: number } | null = null;
          for (const s of STOCK_MCPS) {
            const score = computeFuzzyScore(target, {
              primary: `${s.name} ${s.label}`,
              secondary: s.category,
              tertiary: `${s.description} ${s.whenToUse || ''}`,
            });
            if (score >= 70 && (!best || score > best.score)) {
              best = { mcp: s, score };
            }
          }
          if (best) stock = best.mcp;
        }

        const mcpName = stock?.name || target;
        const label = String(input.label || stock?.label || mcpName);
        const configJson = stock
          ? JSON.stringify({ command: stock.command, args: stock.args, url: stock.url })
          : '{}';

        const id = `${agent.id}::agent::${slugifyName(mcpName)}`;
        db.upsertAgentMcp({
          id,
          agent_id: agent.id,
          mcp_name: mcpName,
          label,
          config_json: configJson,
          enabled: 1,
          source: 'agent',
        });
        attachedMcps.push(label);
      }

      try {
        const workspace = resolveAgentWorkspace(agent);
        const ws = ensureAgentWorkspace(workspace, agent.id, agent.name, agent.system_prompt);
        syncAgentDiskManifestFromDb({ agentId: agent.id, ws, db });
      } catch (err) {
        console.warn(`[custom-tools] Failed to sync disk after attach_mcp for ${agent.id}:`, err);
      }

      try {
        const wsServer = CoreWsServer.getInstance();
        wsServer.broadcast({
          type: 'agent_mcps_updated',
          agentId: agent.id,
          data: { timestamp: new Date().toISOString() },
        });
        wsServer.broadcast({
          type: 'agent_updated',
          agentId: agent.id,
          data: db.getAgent(agent.id),
        });
        wsServer.broadcast({
          type: 'agent_manifest_updated',
          agentId: agent.id,
          data: { agent_id: agent.id, updated_at: new Date().toISOString() },
        });
        wsServer.broadcast({
          type: 'agent_files_updated',
          agentId: agent.id,
          data: { timestamp: new Date().toISOString() },
        });
      } catch {}

      const currentMcps = db.getAgentMcps(agent.id).map((m) => m.label || m.mcp_name);
      const payload = {
        ok: true,
        attached_mcps: attachedMcps,
        agent_id: agent.id,
        agent_name: agent.name,
        current_mcps: currentMcps,
      };

      return {
        success: true,
        summary: `Attached MCP(s) ${attachedMcps.join(', ')} to ${agent.name}`,
        content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
        data: payload,
      };
    },
  },
  {
    name: 'search_available_mcps',
    description:
      'Searches all available stock MCP servers and catalog integrations (e.g. GitHub, GitLab, Slack, Postgres, filesystem, etc.) that can be attached to this agent or peer agents.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Optional keyword, service name, or category to search for (matches MCP name, label, description, and category). If omitted, returns available MCPs and categories.',
        },
        category: {
          type: 'string',
          description: 'Optional category filter to narrow MCP servers.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (defaults to 30).',
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false },
    presentation: { icon: '🔎', label: 'Search MCPs', family: 'run', tone: 'default' },
    async execute(input) {
      const all = STOCK_MCPS.map((s) => ({
        name: s.name,
        label: s.label,
        category: s.category || 'General',
        description: s.description,
        toolsCount: s.toolsCount,
        authType: s.authType || 'none',
      }));

      const query = String(input.query || '').trim().toLowerCase();
      const categoryFilter = String(input.category || '').trim().toLowerCase();
      const limit = typeof input.limit === 'number' && input.limit > 0 ? input.limit : 30;

      let scored = all.map((s) => {
        const stockRef = STOCK_MCPS.find((x) => x.name === s.name);
        const whenToUse = stockRef?.whenToUse || '';
        return {
          item: s,
          score: query
            ? computeFuzzyScore(query, {
                primary: `${s.name} ${s.label}`,
                secondary: s.category,
                tertiary: `${s.description} ${whenToUse}`,
              })
            : 1,
        };
      });

      if (query) {
        scored = scored.filter((x) => x.score > 0);
      }
      if (categoryFilter) {
        scored = scored.filter((x) => x.item.category.toLowerCase().includes(categoryFilter));
      }

      scored.sort((a, b) => b.score - a.score);

      const totalMatches = scored.length;
      const results = scored.slice(0, limit).map((x) => x.item);
      const categories = Array.from(new Set(all.map((s) => s.category))).sort();

      const payload = {
        total_available: all.length,
        total_matched: totalMatches,
        returned: results.length,
        categories,
        mcps: results,
      };

      return {
        success: true,
        summary: `Found ${totalMatches} available MCP server(s) matching "${query || categoryFilter || 'all'}"`,
        content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
        data: payload,
      };
    },
  },
  {
    name: 'list_available_presets',
    description:
      'Lists available personality presets and output style presets that can be applied to this agent (or a peer agent) to customize tone, voice, and response formatting.',
    inputSchema: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: ['personality', 'output', 'all'],
          description:
            'Filter by preset kind: "personality" (tone/voice), "output" (response format), or "all". Defaults to "all".',
        },
        query: {
          type: 'string',
          description: 'Optional search query to filter presets by name, category, or description.',
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false },
    presentation: { icon: '🎭', label: 'List Presets', family: 'run', tone: 'default' },
    async execute(input) {
      const kind = input.kind || 'all';
      const query = String(input.query || '').trim().toLowerCase();

      let items: Array<{
        id: string;
        name: string;
        category: string;
        description: string;
        kind: string;
        directive: string;
      }> = [];
      if (kind === 'personality' || kind === 'all') {
        items.push(...PERSONALITY_PRESETS.map((p) => ({ ...p, kind: 'personality' })));
      }
      if (kind === 'output' || kind === 'all') {
        items.push(...OUTPUT_STYLE_PRESETS.map((p) => ({ ...p, kind: 'output' })));
      }

      if (query) {
        items = items
          .map((p) => ({
            preset: p,
            score: computeFuzzyScore(query, {
              primary: `${p.name} ${p.id}`,
              secondary: p.category,
              tertiary: p.description,
            }),
          }))
          .filter((x) => x.score > 0)
          .sort((a, b) => b.score - a.score)
          .map((x) => x.preset);
      }

      const payload = {
        total: items.length,
        presets: items,
      };

      return {
        success: true,
        summary: `Found ${items.length} preset(s)`,
        content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
        data: payload,
      };
    },
  },
  {
    name: 'update_agent_profile',
    description:
      'Updates this agent (or a peer agent) personality traits, output styles, role, description, or specialty. Use this whenever the user asks the agent to change its tone, adopt a personality, customize its output format, change its role, or reconfigure its identity.',
    inputSchema: {
      type: 'object',
      properties: {
        personalities: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Full list of personality preset IDs or names to set (replaces current personalities). Call list_available_presets(kind: "personality") to inspect available IDs.',
        },
        add_personalities: {
          type: 'array',
          items: { type: 'string' },
          description: 'Personality preset IDs or names to append to current personalities.',
        },
        remove_personalities: {
          type: 'array',
          items: { type: 'string' },
          description: 'Personality preset IDs or names to remove from current personalities.',
        },
        output_styles: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Full list of output style preset IDs or names to set (replaces current output styles). Call list_available_presets(kind: "output") to inspect available IDs.',
        },
        add_output_styles: {
          type: 'array',
          items: { type: 'string' },
          description: 'Output style preset IDs or names to append to current output styles.',
        },
        remove_output_styles: {
          type: 'array',
          items: { type: 'string' },
          description: 'Output style preset IDs or names to remove from current output styles.',
        },
        role: {
          type: 'string',
          description: 'Agent role title (e.g. "Senior Security Architect & Code Auditor").',
        },
        description: {
          type: 'string',
          description: 'Agent functional description and mission statement.',
        },
        specialty: {
          type: 'string',
          description: 'Agent specialty or domain focus area.',
        },
        name: {
          type: 'string',
          description: 'Agent display name.',
        },
        system_prompt: {
          type: 'string',
          description: 'Optional complete replacement or updated system prompt instructions.',
        },
        responsibilities: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional list of core domain responsibilities to set in the agent profile and system prompt.',
        },
        duties: {
          type: 'array',
          items: { type: 'string' },
          description: 'Alias for responsibilities.',
        },
        target_agent_id: {
          type: 'string',
          description: 'Optional ID, full name, or role of the target agent to update. Defaults to the calling agent itself.',
        },
        target_agent_name: {
          type: 'string',
          description: 'Optional name of the target agent (alias for target_agent_id).',
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    presentation: { icon: '🎛️', label: 'Update Profile', family: 'run', tone: 'primary' },
    async execute(input, ctx) {
      const runner = AgentRunner.getInstance();
      const db = runner.getDb();

      const callerRun = runner.getActiveRun(ctx.runId) || (ctx.runId ? db.getRun(ctx.runId) : null);
      const callerAgentId = callerRun
        ? ('agent_id' in callerRun ? callerRun.agent_id : callerRun.agentId)
        : undefined;

      const rawTarget = input.target_agent_id || (input as any).target_agent_name || (input as any).target_agent;
      const agent = resolveTargetAgent(db, rawTarget, callerAgentId);
      if (!agent) {
        return {
          success: false,
          summary: `Agent "${rawTarget || 'unknown'}" not found`,
          content: [{ type: 'text', text: `Error: Agent "${rawTarget || 'unknown'}" not found.` }],
          isError: true,
        };
      }

      const matchPresetId = (val: string, presets: typeof PERSONALITY_PRESETS): string => {
        const norm = val.trim().toLowerCase();
        const slug = slugifyName(val);
        const found = presets.find(
          (p) =>
            p.id.toLowerCase() === norm ||
            p.id.toLowerCase() === slug ||
            p.name.toLowerCase() === norm ||
            p.name.toLowerCase().includes(norm) ||
            norm.includes(p.name.toLowerCase()),
        );
        return found ? found.id : slug || norm;
      };

      const patch: Record<string, any> = {};

      // Handle personalities
      let currentPers = parseIdList(agent.personalities);
      if (Array.isArray(input.personalities)) {
        currentPers = input.personalities.map((p) => matchPresetId(p, PERSONALITY_PRESETS));
      }
      if (Array.isArray(input.add_personalities)) {
        for (const p of input.add_personalities) {
          const id = matchPresetId(p, PERSONALITY_PRESETS);
          if (!currentPers.includes(id)) currentPers.push(id);
        }
      }
      if (Array.isArray(input.remove_personalities)) {
        const toRemove = new Set(
          input.remove_personalities.map((p) => matchPresetId(p, PERSONALITY_PRESETS)),
        );
        currentPers = currentPers.filter((id) => !toRemove.has(id));
      }
      patch.personalities = JSON.stringify(currentPers);

      // Handle output styles
      let currentOut = parseIdList(agent.output_styles);
      if (Array.isArray(input.output_styles)) {
        currentOut = input.output_styles.map((o) => matchPresetId(o, OUTPUT_STYLE_PRESETS));
      }
      if (Array.isArray(input.add_output_styles)) {
        for (const o of input.add_output_styles) {
          const id = matchPresetId(o, OUTPUT_STYLE_PRESETS);
          if (!currentOut.includes(id)) currentOut.push(id);
        }
      }
      if (Array.isArray(input.remove_output_styles)) {
        const toRemove = new Set(
          input.remove_output_styles.map((o) => matchPresetId(o, OUTPUT_STYLE_PRESETS)),
        );
        currentOut = currentOut.filter((id) => !toRemove.has(id));
      }
      patch.output_styles = JSON.stringify(currentOut);

      if (typeof input.role === 'string') patch.role = input.role.trim();
      if (typeof input.description === 'string') patch.description = input.description.trim();
      if (typeof input.specialty === 'string') patch.specialty = input.specialty.trim();
      if (typeof input.name === 'string' && input.name.trim()) patch.name = input.name.trim();

      const effectiveRole = patch.role ?? agent.role;
      const effectiveSpecialty = patch.specialty ?? agent.specialty;
      const effectiveDesc = patch.description ?? agent.description;
      const effectiveName = patch.name ?? agent.name;

      if (typeof (input as any).system_prompt === 'string' && (input as any).system_prompt.trim()) {
        patch.system_prompt = (input as any).system_prompt.trim();
      } else if (
        patch.role !== undefined ||
        patch.name !== undefined ||
        patch.description !== undefined ||
        patch.specialty !== undefined ||
        (input as any).responsibilities !== undefined ||
        (input as any).duties !== undefined
      ) {
        patch.system_prompt = reconcileSystemPromptWithProfile(agent.system_prompt, {
          name: effectiveName,
          role: effectiveRole,
          specialty: effectiveSpecialty,
          description: effectiveDesc,
          responsibilities: (input as any).responsibilities ?? (input as any).duties,
        });
      }

      const updatedAgent = db.updateAgent(agent.id, patch);

      // Update disk workspace: both system_prompt.md AND identity.md to keep prompt & Human Memory Matrix in sync
      try {
        const workspace = resolveAgentWorkspace(updatedAgent || agent);
        const ws = ensureAgentWorkspace(workspace, agent.id, updatedAgent?.name || agent.name, updatedAgent?.system_prompt || agent.system_prompt);

        if (patch.system_prompt && ws.systemPromptFile) {
          writeFileSync(ws.systemPromptFile, `${patch.system_prompt}\n`, 'utf8');
        }

        const identityPath = ws.memoryFiles['identity.md'];
        if (identityPath) {
          const persNames = resolvePersonalities(currentPers).map((p) => p.name);
          const outNames = resolveOutputStyles(currentOut).map((o) => o.name);

          const identityHeader = `# Identity & Persona Memory — ${effectiveName}

Internalized persona traits, tone nuances, role boundaries, communication philosophy, and ethical stance that evolve over time.

## Core Identity & Role Specialization
- **Role**: ${effectiveRole || 'Specialist'}
- **Specialty / Domain Focus**: ${effectiveSpecialty || 'General Engineering'}
- **Mission & Scope**: ${effectiveDesc || 'High quality technical execution.'}
- **Personality Voice**: ${persNames.join(', ') || 'Direct, Pragmatic Engineer'}
- **Output Formats**: ${outNames.join(', ') || 'Markdown, Tables, Code Blocks'}

## Operating Boundaries & Domain Ownership
- **Primary Ownership**: ${effectiveSpecialty || effectiveRole}
- **Quality Mandate**: High test coverage, robust error handling, modular architecture, and truthful state updates.
- **Collaboration Mode**: Active peer and hierarchy member in spatial multi-agent workspace with persistent human memory.
`;
          // This header must stay in sync with the DB fields on every
          // profile update, but the file is also where the agent records its
          // own evolving identity notes (via update_agent_memory / the
          // specialization-refinement cron job appending below). An
          // unconditional overwrite here used to destroy all of that. See #14.
          //
          // Preserve anything after IDENTITY_AUTO_SECTION_MARKER across
          // regenerations. A file with no marker yet (pre-fix, or purely
          // hand/agent-authored with no template at all) has its entire
          // existing content kept as the preserved tail rather than guessed
          // at or discarded — the one-time cost is the new header appearing
          // above the old one once; every write after that cleanly splits on
          // the marker and only the true custom tail survives.
          let preservedTail = '';
          try {
            if (existsSync(identityPath)) {
              const existing = readFileSync(identityPath, 'utf8');
              const markerIndex = existing.indexOf(IDENTITY_AUTO_SECTION_MARKER);
              preservedTail =
                markerIndex === -1
                  ? existing.trim()
                  : existing.slice(markerIndex + IDENTITY_AUTO_SECTION_MARKER.length).trim();
            }
          } catch {}
          const identityContent = preservedTail
            ? `${identityHeader}\n${IDENTITY_AUTO_SECTION_MARKER}\n\n${preservedTail}\n`
            : `${identityHeader}\n${IDENTITY_AUTO_SECTION_MARKER}\n`;
          writeFileSync(identityPath, identityContent, 'utf8');
        }
        syncAgentDiskManifestFromDb({ agentId: agent.id, ws, db });
      } catch (err) {
        console.warn(`[custom-tools] Failed to update workspace files for ${agent.id}:`, err);
      }

      try {
        const wsServer = CoreWsServer.getInstance();
        wsServer.broadcast({
          type: 'agent_updated',
          agentId: agent.id,
          data: updatedAgent || db.getAgent(agent.id),
        });
        wsServer.broadcast({
          type: 'agent_manifest_updated',
          agentId: agent.id,
          data: {
            agent_id: agent.id,
            system_prompt: patch.system_prompt || updatedAgent?.system_prompt || agent.system_prompt,
            updated_at: new Date().toISOString(),
          },
        });
        wsServer.broadcast({
          type: 'agent_files_updated',
          agentId: agent.id,
          data: { timestamp: new Date().toISOString() },
        });
      } catch {}

      const resolvedPers = resolvePersonalities(currentPers).map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
      }));
      const resolvedOuts = resolveOutputStyles(currentOut).map((o) => ({
        id: o.id,
        name: o.name,
        category: o.category,
      }));

      const payload = {
        ok: true,
        agent_id: agent.id,
        agent_name: updatedAgent?.name || agent.name,
        role: updatedAgent?.role,
        description: updatedAgent?.description,
        specialty: updatedAgent?.specialty,
        system_prompt: updatedAgent?.system_prompt,
        personalities: resolvedPers,
        output_styles: resolvedOuts,
      };

      return {
        success: true,
        summary: `Updated profile for ${agent.name}`,
        content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
        data: payload,
      };
    },
  },
  {
    name: 'get_agent_profile',
    description:
      'Inspects the complete profile of this agent (or a target peer agent), including active personalities, output styles, role, description, specialty, attached skills, and attached MCP servers.',
    inputSchema: {
      type: 'object',
      properties: {
        target_agent_id: {
          type: 'string',
          description: 'Optional ID, full name, or role of the target agent to inspect. Defaults to calling agent.',
        },
        target_agent_name: {
          type: 'string',
          description: 'Optional name of the target agent (alias for target_agent_id).',
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false },
    presentation: { icon: '🪪', label: 'Agent Profile', family: 'run', tone: 'default' },
    async execute(input, ctx) {
      const runner = AgentRunner.getInstance();
      const db = runner.getDb();

      const callerRun = runner.getActiveRun(ctx.runId) || (ctx.runId ? db.getRun(ctx.runId) : null);
      const callerAgentId = callerRun
        ? ('agent_id' in callerRun ? callerRun.agent_id : callerRun.agentId)
        : undefined;

      const rawTarget = input.target_agent_id || (input as any).target_agent_name || (input as any).target_agent;
      const agent = resolveTargetAgent(db, rawTarget, callerAgentId);
      if (!agent) {
        return {
          success: false,
          summary: `Agent "${rawTarget || 'unknown'}" not found`,
          content: [{ type: 'text', text: `Error: Agent "${rawTarget || 'unknown'}" not found.` }],
          isError: true,
        };
      }

      const persIds = parseIdList(agent.personalities);
      const outIds = parseIdList(agent.output_styles);
      const personalities = resolvePersonalities(persIds).map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        directive: p.directive,
      }));
      const outputStyles = resolveOutputStyles(outIds).map((o) => ({
        id: o.id,
        name: o.name,
        category: o.category,
        directive: o.directive,
      }));
      const skills = db
        .getAgentSkills(agent.id)
        .filter((s) => s.enabled !== 0)
        .map((s) => ({ id: s.id, name: s.skill_name, description: s.description }));
      const mcps = db
        .getAgentMcps(agent.id)
        .filter((m) => m.enabled !== 0)
        .map((m) => ({ id: m.id, name: m.mcp_name, label: m.label }));

      const recentDates = db.getAgentTodoDates(agent.id).slice(0, 5);
      const recentTodos = db.getAllAgentTodoRecords(agent.id, 50);
      const recentCompleted = recentTodos.filter((t) => t.status === 'completed');
      const { topSections, specializations } = inferSpecializationsFromTodos(
        recentCompleted.length > 0 ? recentCompleted : recentTodos,
      );

      const payload = {
        id: agent.id,
        name: agent.name,
        model: agent.model,
        provider: agent.provider,
        role: agent.role,
        description: agent.description,
        specialty: agent.specialty,
        personalities,
        output_styles: outputStyles,
        skills,
        mcps,
        recent_activity: {
          available_dates: recentDates,
          total_tasks_recorded: recentTodos.length,
          completed_tasks: recentCompleted.length,
          top_sections_worked: topSections,
          demonstrated_specialties: specializations,
        },
      };

      return {
        success: true,
        summary: `Profile for ${agent.name} (${agent.specialty || 'General'}) — ${recentCompleted.length} recent tasks completed`,
        content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
        data: payload,
      };
    },
  },
  {
    name: 'update_system_prompt',
    description:
      'Updates or rebuilds the system prompt (base instructions) for this agent (or a target peer agent). Call this whenever the user asks you to rebuild, update, modify, customize, or improve your system instructions, identity, or prompt. Persists immediately to the database and workspace, and broadcasts to the UI in real time.',
    inputSchema: {
      type: 'object',
      properties: {
        system_prompt: {
          type: 'string',
          description: 'The new or updated system prompt content.',
        },
        append: {
          type: 'boolean',
          description: 'If true, append this content to the existing system prompt instead of replacing it entirely. Defaults to false.',
        },
        target_agent_id: {
          type: 'string',
          description: 'Optional ID, full name, or role of the target agent to update. Defaults to the calling agent itself.',
        },
        target_agent_name: {
          type: 'string',
          description: 'Optional name of the target agent (alias for target_agent_id).',
        },
      },
      required: ['system_prompt'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    presentation: { icon: '📝', label: 'Update System Prompt', family: 'run', tone: 'primary' },
    async execute(input, ctx) {
      const runner = AgentRunner.getInstance();
      const db = runner.getDb();
      const callerRun = runner.getActiveRun(ctx.runId) || (ctx.runId ? db.getRun(ctx.runId) : null);
      const callerAgentId = callerRun
        ? ('agent_id' in callerRun ? callerRun.agent_id : callerRun.agentId)
        : undefined;
      const rawTarget = input.target_agent_id || (input as any).target_agent_name || (input as any).target_agent;
      const agent = resolveTargetAgent(db, rawTarget, callerAgentId);
      if (!agent) {
        return {
          success: false,
          summary: `Agent "${rawTarget || 'unknown'}" not found`,
          content: [{ type: 'text', text: `Error: Agent "${rawTarget || 'unknown'}" not found.` }],
          isError: true,
        };
      }

      let newPrompt = String(input.system_prompt || '').trim();
      if (input.append && agent.system_prompt) {
        newPrompt = `${agent.system_prompt.trim()}\n\n${newPrompt}`;
      }

      db.updateAgent(agent.id, { system_prompt: newPrompt });

      // Sync workspace disk
      try {
        const workspace = resolveAgentWorkspace(agent);
        const ws = ensureAgentWorkspace(workspace, agent.id, agent.name, newPrompt);
        writeFileSync(ws.systemPromptFile, `${newPrompt}\n`, 'utf8');
      } catch (err) {
        console.warn(`[custom-tools] Failed to write systemPromptFile for ${agent.id}:`, err);
      }

      // Broadcast live updates
      try {
        const wsServer = CoreWsServer.getInstance();
        wsServer.broadcast({
          type: 'agent_updated',
          agentId: agent.id,
          data: db.getAgent(agent.id),
        });
        wsServer.broadcast({
          type: 'agent_manifest_updated',
          agentId: agent.id,
          data: {
            agent_id: agent.id,
            system_prompt: newPrompt,
            updated_at: new Date().toISOString(),
          },
        });
        wsServer.broadcast({
          type: 'agent_files_updated',
          agentId: agent.id,
          data: { timestamp: new Date().toISOString() },
        });
      } catch {}

      return {
        success: true,
        summary: `Successfully updated system prompt for ${agent.name}`,
        content: [
          {
            type: 'text',
            text: `System prompt updated for ${agent.name} (${agent.id}).\nLength: ${newPrompt.length} characters.\nPreview:\n${newPrompt.slice(0, 300)}...`,
          },
        ],
        data: { agent_id: agent.id, agent_name: agent.name, prompt_length: newPrompt.length },
      };
    },
  },
  {
    name: 'manage_agent_memory',
    description:
      'Manage this agent\'s (or a peer agent\'s) specialized memory files: facts.md (verified facts & invariants), semantic.md (learned conceptual knowledge), episodic.md (event & run history), procedural.md (step-by-step workflows & runbooks), working.md (active task scratchpad), prospective.md (deferred intentions & triggers), reflective.md (meta-cognition & lessons learned), associative.md (system & entity relationships), preferences.md (user & agent working preferences), identity.md (evolving persona & boundaries). Call this to record learned facts, inspect memories, or batch-seed memory files via "entries".',
    inputSchema: {
      type: 'object',
      properties: {
        memory_type: {
          type: 'string',
          enum: [
            'facts',
            'semantic',
            'episodic',
            'procedural',
            'working',
            'prospective',
            'reflective',
            'associative',
            'preferences',
            'identity',
          ],
          description: 'Which memory dimension to operate on (e.g. "facts" for facts.md, "semantic" for semantic.md). Optional if "entries" array is provided.',
        },
        action: {
          type: 'string',
          enum: ['read', 'write', 'append', 'clear'],
          description: 'The memory operation: "read" to inspect, "write" to overwrite, "append" to add an entry, "clear" to reset with default seed template. Optional if "entries" array is provided.',
        },
        content: {
          type: 'string',
          description: 'The content to write or append. Required for single "write" and "append".',
        },
        entries: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              memory_type: {
                type: 'string',
                enum: [
                  'facts',
                  'semantic',
                  'episodic',
                  'procedural',
                  'working',
                  'prospective',
                  'reflective',
                  'associative',
                  'preferences',
                  'identity',
                ],
                description: 'Which memory dimension to update.',
              },
              action: {
                type: 'string',
                enum: ['write', 'append', 'clear'],
                description: 'The memory operation: "write" to overwrite, "append" to add, "clear" to reset. Defaults to "write".',
              },
              content: {
                type: 'string',
                description: 'The content to write or append for this memory dimension.',
              },
            },
            required: ['memory_type', 'content'],
          },
          description: 'Optional batch of memory operations across multiple dimensions (e.g., seeding facts, semantic, procedural, associative, and identity all at once).',
        },
        target_agent_id: {
          type: 'string',
          description: 'Optional ID, full name, or role of the target agent. Defaults to the calling agent itself.',
        },
        target_agent_name: {
          type: 'string',
          description: 'Optional name of the target agent (alias for target_agent_id).',
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    presentation: { icon: '🧠', label: 'Manage Agent Memory', family: 'run', tone: 'primary' },
    async execute(input, ctx) {
      const runner = AgentRunner.getInstance();
      const db = runner.getDb();
      const callerRun = runner.getActiveRun(ctx.runId) || (ctx.runId ? db.getRun(ctx.runId) : null);
      const callerAgentId = callerRun
        ? ('agent_id' in callerRun ? callerRun.agent_id : callerRun.agentId)
        : undefined;
      const rawTarget = input.target_agent_id || (input as any).target_agent_name || (input as any).target_agent;
      const agent = resolveTargetAgent(db, rawTarget, callerAgentId);
      if (!agent) {
        return {
          success: false,
          summary: `Agent "${rawTarget || 'unknown'}" not found`,
          content: [{ type: 'text', text: `Error: Agent "${rawTarget || 'unknown'}" not found.` }],
          isError: true,
        };
      }

      const workspace = resolveAgentWorkspace(agent);
      const ws = ensureAgentWorkspace(workspace, agent.id, agent.name, agent.system_prompt);

      // Handle batch entries if provided
      if (Array.isArray(input.entries) && input.entries.length > 0) {
        const results: Array<{ dimension: string; action: string; bytesWritten: number }> = [];
        for (const item of input.entries) {
          const mType = String(item.memory_type || '').trim().toLowerCase();
          const memFileName = `${mType}.md`;
          const filePath = ws.memoryFiles[memFileName];
          if (!filePath) continue;

          const act = item.action || 'write';
          const contentStr = String(item.content || '');

          if (act === 'write') {
            writeFileSync(filePath, contentStr, 'utf8');
            results.push({ dimension: mType, action: 'write', bytesWritten: contentStr.length });
          } else if (act === 'append') {
            const existing = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
            const next = existing.trim() ? `${existing.trim()}\n\n${contentStr.trim()}\n` : `${contentStr.trim()}\n`;
            writeFileSync(filePath, next, 'utf8');
            results.push({ dimension: mType, action: 'append', bytesWritten: contentStr.length });
          } else if (act === 'clear') {
            writeFileSync(filePath, `# ${mType.charAt(0).toUpperCase() + mType.slice(1)} Memory — ${agent.name}\n\n`, 'utf8');
            results.push({ dimension: mType, action: 'clear', bytesWritten: 0 });
          }
        }

        try {
          syncAgentDiskManifestFromDb({ agentId: agent.id, ws, db });
          const wsServer = CoreWsServer.getInstance();
          wsServer.broadcast({
            type: 'agent_files_updated',
            agentId: agent.id,
            data: { timestamp: new Date().toISOString() },
          });
          wsServer.broadcast({
            type: 'agent_manifest_updated',
            agentId: agent.id,
            data: { agent_id: agent.id, updated_at: new Date().toISOString() },
          });
        } catch {}

        const summaryText = `Configured ${results.length} memory dimension(s) for ${agent.name}: ${results.map((r) => `${r.dimension} (${r.action})`).join(', ')}`;
        return {
          success: true,
          summary: summaryText,
          content: [{ type: 'text', text: `✅ Successfully configured multi-dimensional memory for **${agent.name}**:\n\n${results.map((r) => `- **${r.dimension}.md**: ${r.action} (${r.bytesWritten} bytes)`).join('\n')}` }],
          data: { agent_id: agent.id, agent_name: agent.name, updated: results },
        };
      }

      if (!input.memory_type || !input.action) {
        return {
          success: false,
          summary: 'Missing memory_type or action',
          content: [{ type: 'text', text: 'Error: Please specify "memory_type" and "action", or provide an "entries" array for batch updates.' }],
          isError: true,
        };
      }

      const memFileName = `${String(input.memory_type || '')}.md`;
      const filePath = ws.memoryFiles[memFileName];
      if (!filePath) {
        return {
          success: false,
          summary: `Invalid memory type "${input.memory_type}"`,
          content: [{ type: 'text', text: `Error: Memory type "${input.memory_type}" is not recognized.` }],
          isError: true,
        };
      }

      if (input.action === 'read') {
        const text = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '(Memory file does not exist yet)';
        return {
          success: true,
          summary: `Read ${memFileName} (${text.length} chars)`,
          content: [{ type: 'text', text }],
          data: { file: memFileName, content: text },
        };
      }

      if (input.action === 'write') {
        const content = String(input.content || '');
        writeFileSync(filePath, content, 'utf8');
      } else if (input.action === 'append') {
        const existing = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
        const toAppend = String(input.content || '').trim();
        const next = existing.trim() ? `${existing.trim()}\n\n${toAppend}\n` : `${toAppend}\n`;
        writeFileSync(filePath, next, 'utf8');
      } else if (input.action === 'clear') {
        const memoryType = String(input.memory_type || '');
        writeFileSync(filePath, `# ${memoryType.charAt(0).toUpperCase() + memoryType.slice(1)} Memory — ${agent.name}\n\n`, 'utf8');
      }

      // Sync disk manifest & broadcast live updates
      try {
        syncAgentDiskManifestFromDb({ agentId: agent.id, ws, db });
        const wsServer = CoreWsServer.getInstance();
        wsServer.broadcast({
          type: 'agent_files_updated',
          agentId: agent.id,
          data: { timestamp: new Date().toISOString() },
        });
        wsServer.broadcast({
          type: 'agent_manifest_updated',
          agentId: agent.id,
          data: { agent_id: agent.id, updated_at: new Date().toISOString() },
        });
      } catch {}

      return {
        success: true,
        summary: `Updated ${memFileName} for ${agent.name}`,
        content: [{ type: 'text', text: `Successfully performed "${input.action}" on ${memFileName} for agent ${agent.name}.` }],
        data: { agent_id: agent.id, file: memFileName, action: input.action },
      };
    },
  },
  {
    name: 'list_agent_memories',
    description:
      'List all 10 specialized memory files for this agent (or a target peer agent) with their size, last modified date, and content preview snippet.',
    inputSchema: {
      type: 'object',
      properties: {
        target_agent_id: {
          type: 'string',
          description: 'Optional ID, full name, or role of the target agent to inspect. Defaults to the calling agent itself.',
        },
        target_agent_name: {
          type: 'string',
          description: 'Optional name of the target agent (alias for target_agent_id).',
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false },
    presentation: { icon: '📚', label: 'List Agent Memories', family: 'run', tone: 'primary' },
    async execute(input, ctx) {
      const runner = AgentRunner.getInstance();
      const db = runner.getDb();
      const callerRun = runner.getActiveRun(ctx.runId) || (ctx.runId ? db.getRun(ctx.runId) : null);
      const callerAgentId = callerRun
        ? ('agent_id' in callerRun ? callerRun.agent_id : callerRun.agentId)
        : undefined;
      const rawTarget = input.target_agent_id || (input as any).target_agent_name || (input as any).target_agent;
      const agent = resolveTargetAgent(db, rawTarget, callerAgentId);
      if (!agent) {
        return {
          success: false,
          summary: `Agent "${rawTarget || 'unknown'}" not found`,
          content: [{ type: 'text', text: `Error: Agent "${rawTarget || 'unknown'}" not found.` }],
          isError: true,
        };
      }
      const workspace = resolveAgentWorkspace(agent);
      const ws = ensureAgentWorkspace(workspace, agent.id, agent.name, agent.system_prompt);
      const summaries = readAgentMemorySummaries(ws);
      const rows = summaries
        .map((s) => `| **${s.name}** (\`${s.file}\`) | ${s.category} | ${s.exists ? `${s.sizeBytes} B` : 'Missing'} | ${s.purpose} |`)
        .join('\n');
      const table = `### 🧠 Memory Dimensions for ${agent.name}:\n\n| Memory Dimension | Category | Size | Purpose |\n|---|---|---|---|\n${rows}`;
      return {
        success: true,
        summary: `Summarized 10 memory dimensions for ${agent.name}`,
        content: [{ type: 'text', text: table }],
        data: summaries,
      };
    },
  },
  {
    name: 'schedule_cron_job',
    description:
      'Schedule a recurring cron job or a one-time delayed task for this agent. Supports recurring schedules (e.g., daily summaries, code reviews) or one-time deferred tasks (e.g., "check deployment at 12:00 PM" or "run in 30 minutes"). When the time arrives, this agent will automatically run with the specified prompt.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['create', 'list', 'toggle', 'delete'],
          description: 'Action to perform: "create" to schedule a new task, "list" to view current tasks, "toggle" to enable/disable, "delete" to remove.',
        },
        target_agent_id: {
          type: 'string',
          description: 'Optional ID of the target agent (coworker/subordinate) to schedule this task for. If omitted, defaults to the calling agent itself.',
        },
        agent_id: {
          type: 'string',
          description: 'Alternative alias for target_agent_id.',
        },
        name: {
          type: 'string',
          description: 'Descriptive title for the task (required for "create").',
        },
        prompt: {
          type: 'string',
          description: 'The instructions/prompt that the assigned agent will run when triggered (required for "create").',
        },
        timing_type: {
          type: 'string',
          enum: ['recurring', 'once'],
          description: 'Whether the task runs on a recurring schedule or only once. Defaults to "recurring" unless delay_minutes or scheduled_at is provided.',
        },
        cron_schedule: {
          type: 'string',
          description: 'Standard 5-part cron expression (e.g. "0 9,18 * * *" for 9am and 6pm daily, "0 12 * * *" for 12pm daily, "0 */2 * * *" for every 2 hours). Required for recurring tasks.',
        },
        scheduled_at: {
          type: 'string',
          description: 'Target execution time for a one-time task (e.g. "12:00 PM", "2026-10-26T12:00:00Z").',
        },
        delay_minutes: {
          type: 'number',
          description: 'Delay in minutes from now for a one-time task (e.g. 30 for 30 minutes from now).',
        },
        job_id: {
          type: 'string',
          description: 'The ID of the task (required for "toggle" and "delete").',
        },
        enabled: {
          type: 'boolean',
          description: 'Whether the job is active. Defaults to true on create. Pass true/false on toggle.',
        },
      },
      required: ['action'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    presentation: { icon: '⏰', label: 'Schedule Task / Cron', family: 'run', tone: 'primary' },
    async execute(input, ctx) {
      const runner = AgentRunner.getInstance();
      const db = runner.getDb();
      const callerRun = runner.getActiveRun(ctx.runId) || (ctx.runId ? db.getRun(ctx.runId) : null);
      const callerAgentId = callerRun
        ? ('agent_id' in callerRun ? callerRun.agent_id : callerRun.agentId)
        : undefined;
      const callerId = String(callerAgentId || '').trim();
      const callerAgent = callerId ? db.getAgent(callerId) : null;

      // Allow agent to schedule for itself or delegate to a co-worker
      const requestedTargetId = String(input.target_agent_id || input.agent_id || (input as any).target_agent_name || (input as any).target_agent || '').trim();
      const targetAgent = resolveTargetAgent(db, requestedTargetId, callerId);

      if (!targetAgent) {
        return {
          success: false,
          summary: 'Agent not found',
          content: [{ type: 'text', text: `Error: Target agent "${requestedTargetId || callerId}" not found.` }],
          isError: true,
        };
      }

      ensureDefaultAgentCronJobs(targetAgent.id, db);

      if (input.action === 'list') {
        const jobs = db.getAgentCronJobs(targetAgent.id);
        const rows = jobs.map((j) => `- **${j.name}** (\`${j.id}\`): \`${j.cron_schedule}\` | Status: ${j.enabled ? '🟢 Active' : '⏸️ Paused'} | Next: ${j.next_run_at || 'N/A'}\n  Prompt: "${j.prompt}"`).join('\n');
        return {
          success: true,
          summary: `Found ${jobs.length} scheduled automations for ${targetAgent.name}`,
          content: [{ type: 'text', text: `### ⏰ Scheduled Automations for ${targetAgent.name}:\n\n${rows || 'No scheduled tasks yet.'}` }],
          data: jobs,
        };
      }

      if (input.action === 'create') {
        if (!input.name || !input.prompt) {
          return {
            success: false,
            summary: 'Missing required fields for create',
            content: [{ type: 'text', text: 'Error: "name" and "prompt" are required when creating a scheduled task.' }],
            isError: true,
          };
        }

        let nextRun: string | null = null;
        let schedule = input.cron_schedule ? String(input.cron_schedule).trim() : '';

        if (input.delay_minutes !== undefined && Number(input.delay_minutes) > 0) {
          nextRun = new Date(Date.now() + Number(input.delay_minutes) * 60000).toISOString();
          schedule = 'once';
        } else if (input.scheduled_at) {
          let parsedDate: Date | null = null;
          try {
            const d = new Date(String(input.scheduled_at));
            if (!isNaN(d.getTime())) parsedDate = d;
          } catch {}
          if (!parsedDate) {
            const m = String(input.scheduled_at).match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
            if (m) {
              let hours = parseInt(m[1], 10);
              const mins = m[2] ? parseInt(m[2], 10) : 0;
              const ampm = m[3]?.toLowerCase();
              if (ampm === 'pm' && hours < 12) hours += 12;
              if (ampm === 'am' && hours === 12) hours = 0;
              const now = new Date();
              parsedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, mins, 0);
              if (parsedDate.getTime() <= now.getTime()) {
                parsedDate.setDate(parsedDate.getDate() + 1);
              }
            }
          }
          if (parsedDate) {
            nextRun = parsedDate.toISOString();
            schedule = 'once';
          } else {
            return {
              success: false,
              summary: `Could not parse scheduled_at "${input.scheduled_at}"`,
              content: [{ type: 'text', text: `Error: Unable to parse time "${input.scheduled_at}". Try "12:00 PM" or ISO format.` }],
              isError: true,
            };
          }
        } else if (schedule && schedule !== 'once') {
          nextRun = calculateNextCronRun(schedule);
          if (!nextRun) {
            return {
              success: false,
              summary: `Invalid cron schedule "${schedule}"`,
              content: [{ type: 'text', text: `Error: "${schedule}" is not a valid cron expression.` }],
              isError: true,
            };
          }
        } else {
          return {
            success: false,
            summary: 'Missing schedule or timing specification',
            content: [{ type: 'text', text: 'Error: Provide "cron_schedule" for recurring tasks or "delay_minutes" / "scheduled_at" for one-time tasks.' }],
            isError: true,
          };
        }

        let finalPrompt = String(input.prompt).trim();
        if (!finalPrompt.includes('mark_cron_job_success')) {
          finalPrompt += '\n\nNote: Once all tasks are complete, you MUST invoke the `mark_cron_job_success` tool with a summary to confirm completion.';
        }

        const job = db.createAgentCronJob({
          agent_id: targetAgent.id,
          name: String(input.name).trim(),
          prompt: finalPrompt,
          cron_schedule: schedule,
          enabled: input.enabled !== false ? 1 : 0,
          created_by: 'agent',
          next_run_at: nextRun,
        });

        AgentCronScheduler.getInstance().syncAllAgentSchedules();
        try {
          CoreWsServer.getInstance()?.broadcast({ type: 'agent_cron_jobs_updated', agent_id: targetAgent.id });
        } catch {}

        const delegatedNote = callerAgent && callerAgent.id !== targetAgent.id
          ? ` (delegated by ${callerAgent.name})`
          : '';

        return {
          success: true,
          summary: `Scheduled task "${job.name}" for ${targetAgent.name}${delegatedNote}`,
          content: [{ type: 'text', text: `✅ Successfully scheduled task "${job.name}" (ID: \`${job.id}\`) for agent **${targetAgent.name}**${delegatedNote}. Timing: \`${job.cron_schedule}\`. Next execution: ${job.next_run_at}.` }],
          data: job,
        };
      }

      if (input.action === 'toggle') {
        const jobId = String(input.job_id || '').trim();
        if (!jobId) {
          return {
            success: false,
            summary: 'Missing job_id for toggle',
            content: [{ type: 'text', text: 'Error: "job_id" is required to toggle a cron job.' }],
            isError: true,
          };
        }
        const existing = db.getCronJob(jobId);
        if (!existing || existing.agent_id !== targetAgent.id) {
          return {
            success: false,
            summary: `Job "${jobId}" not found`,
            content: [{ type: 'text', text: `Error: Cron job "${jobId}" does not exist for agent ${targetAgent.name}.` }],
            isError: true,
          };
        }
        const newEnabled = input.enabled !== undefined ? (input.enabled ? 1 : 0) : (existing.enabled ? 0 : 1);
        const nextRun = newEnabled ? calculateNextCronRun(existing.cron_schedule) : null;
        const updated = db.updateAgentCronJob(existing.id, { enabled: newEnabled, next_run_at: nextRun });

        AgentCronScheduler.getInstance().syncAllAgentSchedules();
        try {
          CoreWsServer.getInstance()?.broadcast({ type: 'agent_cron_jobs_updated', agent_id: targetAgent.id });
        } catch {}

        return {
          success: true,
          summary: `Toggled cron job "${existing.name}" to ${newEnabled ? 'enabled' : 'paused'}`,
          content: [{ type: 'text', text: `Cron job "${existing.name}" is now ${newEnabled ? '🟢 Active' : '⏸️ Paused'}.` }],
          data: updated,
        };
      }

      if (input.action === 'delete') {
        const jobId = String(input.job_id || '').trim();
        if (!jobId) {
          return {
            success: false,
            summary: 'Missing job_id for delete',
            content: [{ type: 'text', text: 'Error: "job_id" is required to delete a cron job.' }],
            isError: true,
          };
        }
        const existing = db.getCronJob(jobId);
        if (!existing || existing.agent_id !== targetAgent.id) {
          return {
            success: false,
            summary: `Job "${jobId}" not found`,
            content: [{ type: 'text', text: `Error: Cron job "${jobId}" does not exist for agent ${targetAgent.name}.` }],
            isError: true,
          };
        }
        db.deleteAgentCronJob(existing.id);

        AgentCronScheduler.getInstance().syncAllAgentSchedules();
        try {
          CoreWsServer.getInstance()?.broadcast({ type: 'agent_cron_jobs_updated', agent_id: targetAgent.id });
        } catch {}

        return {
          success: true,
          summary: `Deleted cron job "${existing.name}"`,
          content: [{ type: 'text', text: `🗑️ Deleted cron job "${existing.name}".` }],
          data: { id: existing.id },
        };
      }

      return {
        success: false,
        summary: `Unknown action "${input.action}"`,
        content: [{ type: 'text', text: `Error: Unknown action "${input.action}". Allowed: create, list, toggle, delete.` }],
        isError: true,
      };
    },
  },
  {
    name: 'mark_cron_job_success',
    description:
      'Mark the current scheduled cron job or autonomous operation as successfully completed. ' +
      'Whenever executing a scheduled cron job (such as workspace memory compaction, daily EOD task summaries, ' +
      'self-refinement routines, or custom scheduled tasks), you MUST call this tool when all your tasks, file updates, ' +
      'and verifications are finished. Calling this tool signals that the execution succeeded and prevents automated retries.',
    inputSchema: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: 'A concise summary of all tasks and deliverables completed during this scheduled execution.',
        },
        job_id: {
          type: 'string',
          description: 'Optional ID of the scheduled cron job being completed.',
        },
        deliverables: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional list of files created, modified, or artifacts produced.',
        },
      },
      required: ['summary'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    presentation: { icon: '✅', label: 'Mark Cron Job Success', family: 'run', tone: 'primary' },
    async execute(input, ctx) {
      const runner = AgentRunner.getInstance();
      const activeRun =
        (ctx.runId ? runner.getActiveRun(ctx.runId) : undefined) ||
        (ctx.sessionId ? runner.getActiveRunForSession(ctx.sessionId) : undefined);

      if (activeRun) {
        activeRun.cronSuccessReported = true;
        activeRun.cronSuccessSummary = String(input.summary || '').trim();
      }

      const summaryText = String(input.summary || 'Scheduled task completed successfully.').trim();

      try {
        if (ctx.runId) {
          const db = runner.getDb();
          const callerRun = activeRun || db.getRun(ctx.runId);
          const agentId = callerRun ? ('agent_id' in callerRun ? callerRun.agent_id : callerRun.agentId) : undefined;
          if (agentId) {
            try {
              db.updateAgentLastSync(agentId);
            } catch {}
            db.addRunEvent({
              run_id: ctx.runId,
              agent_id: agentId,
              event_type: 'cron.success_marked',
              payload_json: JSON.stringify({
                summary: summaryText,
                deliverables: input.deliverables ?? [],
                jobId: input.job_id ?? activeRun?.cronJobId,
                markedAt: new Date().toISOString(),
              }),
            });
          }
        }
      } catch (err) {
        console.warn('[mark_cron_job_success] Error logging run event:', err);
      }

      return {
        success: true,
        summary: `Cron job successfully marked as completed: ${summaryText}`,
        content: [
          {
            type: 'text',
            text: `✅ Scheduled cron job marked as successfully completed.\n\n**Summary**: ${summaryText}${
              Array.isArray(input.deliverables) && input.deliverables.length > 0
                ? `\n\n**Deliverables**:\n${input.deliverables.map((d: any) => `- \`${d}\``).join('\n')}`
                : ''
            }`,
          },
        ],
        data: {
          runId: ctx.runId,
          summary: summaryText,
          deliverables: input.deliverables ?? [],
          markedAt: new Date().toISOString(),
        },
      };
    },
  },
  {
    name: 'get_agent_todo_history',
    description:
      'Inspects the date-wise to-do history of this agent (or a target peer agent). Returns the full task checklist, completion metrics, work domains/sections (e.g. QA, Database, Backend, Frontend, DevOps), and demonstrated specializations for any date or across recent activity. Handles midnight crossover edge cases where late-night runs are attributed to the start day.',
    inputSchema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description:
            'Target date in YYYY-MM-DD format, or "today", "yesterday", or "latest". Defaults to today.',
        },
        target_agent_id: {
          type: 'string',
          description: 'Optional ID of the target agent to inspect. Defaults to calling agent.',
        },
        target_agent_name: {
          type: 'string',
          description: 'Optional name of the target agent to inspect.',
        },
        include_markdown: {
          type: 'boolean',
          description: 'Whether to include the full rendered markdown daily task ledger in the response.',
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false },
    presentation: { icon: '📅', label: 'Todo History', family: 'inspect', tone: 'default' },
    async execute(input, ctx) {
      const runner = AgentRunner.getInstance();
      const db = runner.getDb();

      const callerRun = runner.getActiveRun(ctx.runId) || (ctx.runId ? db.getRun(ctx.runId) : null);
      const callerAgentId = callerRun
        ? ('agent_id' in callerRun ? callerRun.agent_id : callerRun.agentId)
        : undefined;

      const rawTarget = input.target_agent_id || (input as any).target_agent_name || (input as any).target_agent;
      const targetAgent = resolveTargetAgent(db, rawTarget, callerAgentId);

      if (!targetAgent) {
        return {
          success: false,
          summary: 'Agent not found',
          content: [{ type: 'text', text: 'Error: Could not identify target agent.' }],
          isError: true,
        };
      }

      const availableDates = db.getAgentTodoDates(targetAgent.id);

      // Resolve query date
      let queryDate = String(input.date || 'today').trim().toLowerCase();
      const now = new Date();
      let targetDateStr = formatDateKey(now);

      if (queryDate === 'today' || !queryDate) {
        targetDateStr = formatDateKey(now);
      } else if (queryDate === 'yesterday') {
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        targetDateStr = formatDateKey(yesterday);
      } else if (queryDate === 'latest') {
        targetDateStr = availableDates.length > 0 ? availableDates[0] : formatDateKey(now);
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(queryDate)) {
        targetDateStr = queryDate;
      }

      const todos = db.getAgentTodosByDate(targetAgent.id, targetDateStr);
      const total = todos.length;
      const completed = todos.filter((t) => t.status === 'completed').length;
      const inProgress = todos.filter((t) => t.status === 'in_progress').length;
      const pending = todos.filter((t) => t.status === 'pending').length;
      const cancelled = todos.filter((t) => t.status === 'cancelled').length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      const { topSections, specializations } = inferSpecializationsFromTodos(todos);

      let markdownContent: string | undefined;
      if (input.include_markdown) {
        const candidatePaths = [
          join(resolveAgentWorkspace(targetAgent), MANIFEST_DIR, 'todos', `${targetDateStr}.md`),
          ctx?.workspacePath ? join(ctx.workspacePath, MANIFEST_DIR, 'todos', `${targetDateStr}.md`) : null,
          ctx?.workspaceDir ? join(ctx.workspaceDir, MANIFEST_DIR, 'todos', `${targetDateStr}.md`) : null,
        ].filter(Boolean) as string[];

        for (const p of candidatePaths) {
          if (existsSync(p)) {
            try {
              markdownContent = readFileSync(p, 'utf8');
              break;
            } catch {}
          }
        }

        if (!markdownContent) {
          markdownContent = renderDailyTodoMarkdown(targetAgent, {
            agentId: targetAgent.id,
            date: targetDateStr,
            total,
            completed,
            inProgress,
            pending,
            cancelled,
            completionRate,
            sections: topSections,
            specializations,
            todos,
          });
        }
      }

      const payload = {
        agent_id: targetAgent.id,
        agent_name: targetAgent.name,
        role: targetAgent.role,
        specialty: targetAgent.specialty,
        date: targetDateStr,
        available_dates: availableDates,
        metrics: {
          total,
          completed,
          in_progress: inProgress,
          pending,
          cancelled,
          completion_rate_percent: completionRate,
        },
        sections_worked: topSections,
        demonstrated_specialties: specializations,
        todos: todos.map((t) => ({
          content: t.content,
          status: t.status,
          priority: t.priority,
          section: t.section || inferSectionForTodo(t.content),
          started_at: t.started_at,
          completed_at: t.completed_at,
        })),
        ...(markdownContent ? { markdown_ledger: markdownContent } : {}),
      };

      const summaryText = `${targetAgent.name} on ${targetDateStr}: ${completed}/${total} tasks completed (${completionRate}%), sections: ${topSections.join(', ') || 'none'}`;

      return {
        success: true,
        summary: summaryText,
        content: [
          {
            type: 'text',
            text:
              `### Daily Todo Ledger — ${targetAgent.name} (${targetDateStr})\n` +
              `- **Completed**: ${completed} / ${total} tasks (${completionRate}%)\n` +
              `- **In Progress**: ${inProgress} | **Pending**: ${pending}\n` +
              `- **Sections**: ${topSections.join(', ') || 'General'}\n` +
              `- **Specializations**: ${specializations.join(', ') || 'General'}\n\n` +
              `**Tasks**:\n` +
              (todos.length > 0
                ? todos
                    .map(
                      (t) =>
                        `- [${t.status === 'completed' ? 'x' : t.status === 'in_progress' ? '>' : ' '}] [${t.priority || 'medium'}] [${t.section || inferSectionForTodo(t.content)}] ${t.content}`,
                    )
                    .join('\n')
                : '_No tasks recorded on this date._') +
              (availableDates.length > 0
                ? `\n\n*Other dates with activity: ${availableDates.slice(0, 5).join(', ')}*`
                : ''),
          },
        ],
        data: payload,
      };
    },
  },
  {
    name: 'redevelop_agent_specializations',
    description:
      'Analyzes this agent\'s (or a peer agent\'s) recent to-do history to judge what work was accomplished and redevelop/sharpen domain specializations. Updates the agent\'s specialty field in the database, appends self-evaluation notes to memory/reflective.md and memory/identity.md, and broadcasts the updated profile to the canvas so other agents can see its latest capabilities and assign appropriate tasks.',
    inputSchema: {
      type: 'object',
      properties: {
        target_agent_id: {
          type: 'string',
          description: 'Optional ID of the target agent. Defaults to calling agent.',
        },
        target_agent_name: {
          type: 'string',
          description: 'Optional name of the target agent.',
        },
        days_back: {
          type: 'number',
          description: 'Number of recent days of todo history to analyze (default: 7).',
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    presentation: { icon: '🎯', label: 'Redevelop Specialty', family: 'edit', tone: 'success' },
    async execute(input, ctx) {
      const runner = AgentRunner.getInstance();
      const db = runner.getDb();

      const callerRun = runner.getActiveRun(ctx.runId) || (ctx.runId ? db.getRun(ctx.runId) : null);
      const callerAgentId = callerRun
        ? ('agent_id' in callerRun ? callerRun.agent_id : callerRun.agentId)
        : undefined;

      const rawTarget = input.target_agent_id || (input as any).target_agent_name || (input as any).target_agent;
      const targetAgent = resolveTargetAgent(db, rawTarget, callerAgentId);

      if (!targetAgent) {
        return {
          success: false,
          summary: 'Agent not found',
          content: [{ type: 'text', text: 'Error: Could not identify target agent.' }],
          isError: true,
        };
      }

      const daysBack = typeof input.days_back === 'number' && input.days_back > 0 ? input.days_back : 7;
      const resolvedWs = resolveAgentWorkspace(targetAgent);

      const result = await redevelopAgentSpecializationsFromHistory(
        targetAgent.id,
        db,
        resolvedWs,
        daysBack,
      );

      if (!result) {
        return {
          success: false,
          summary: `Failed to redevelop specializations for ${targetAgent.name}`,
          content: [{ type: 'text', text: 'Error: Failed to process todo history.' }],
          isError: true,
        };
      }

      // Broadcast profile update over WebSocket
      const wsServer = CoreWsServer.getInstance();
      wsServer.broadcast({
        type: 'agent:specialty_redeveloped',
        agentId: targetAgent.id,
        previousSpecialty: result.previousSpecialty,
        newSpecialty: result.newSpecialty,
        topSections: result.topSections,
        completedTasksCount: result.completedTasksCount,
      });

      return {
        success: true,
        summary: `Redeveloped specialization for ${result.agentName}: "${result.newSpecialty}" based on ${result.completedTasksCount} completed tasks`,
        content: [
          {
            type: 'text',
            text:
              `### 🎯 Specialization Redeveloped for ${result.agentName}\n` +
              `- **Previous Specialty**: ${result.previousSpecialty}\n` +
              `- **Updated Specialty**: **${result.newSpecialty}**\n` +
              `- **Top Work Domains**: ${result.topSections.join(', ') || 'General'}\n` +
              `- **Completed Tasks Analyzed**: ${result.completedTasksCount}\n\n` +
              `**Supporting Evidence from Recent Tasks**:\n` +
              result.evidence.map((e) => `- ${e}`).join('\n') +
              `\n\n*Updated database profile and appended reflection to \`memory/reflective.md\`.*`,
          },
        ],
        data: result,
      };
    },
  },
  {
    name: 'submit_explore_report',
    description:
      'Called ONLY by the Explorer Agent to submit the completed project exploration report. This finalizes Phase 1, saves the structured report to the database, broadcasts explore_complete, and signals the canvas that the report is ready for user review.',
    inputSchema: {
      type: 'object',
      properties: {
        company_name: { type: 'string', description: 'Company or project name' },
        company_type: {
          type: 'string',
          enum: ['software_product', 'agency', 'internal_tooling', 'non_tech'],
          description: 'Type of company or project',
        },
        tech_stack: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of technologies used',
        },
        project_summary: { type: 'string', description: '2-3 sentence project overview' },
        features: {
          type: 'array',
          description: 'List of distinct features that each need a dedicated agent',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Snake_case feature ID, e.g. feat_auth' },
              name: { type: 'string' },
              description: { type: 'string' },
              folders: { type: 'array', items: { type: 'string' }, description: 'Owned folder paths' },
              key_files: { type: 'array', items: { type: 'string' }, description: 'Most important files' },
              complexity: { type: 'string', enum: ['high', 'medium', 'low'] },
              suggested_agent_name: { type: 'string', description: 'Human-readable agent name e.g. Auth Engineer' },
            },
            required: ['id', 'name', 'description', 'folders', 'complexity', 'suggested_agent_name'],
          },
        },
        zones_plan: {
          type: 'array',
          description: 'Zone hierarchy plan for organizing agents on canvas',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              role_title: { type: 'string' },
              description: { type: 'string' },
              color: { type: 'string', description: 'Hex color e.g. #3b82f6' },
              sub_zones: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    role_title: { type: 'string' },
                    features: { type: 'array', items: { type: 'string' }, description: 'Feature IDs in this sub-zone' },
                  },
                  required: ['name', 'features'],
                },
              },
            },
            required: ['name', 'role_title'],
          },
        },
        managers_plan: {
          type: 'array',
          description: 'Manager agents to create, one per zone/domain',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              zone: { type: 'string', description: 'Zone name this manager belongs to' },
              manages_features: { type: 'array', items: { type: 'string' }, description: 'Feature IDs managed' },
              description: { type: 'string' },
            },
            required: ['name', 'zone', 'manages_features'],
          },
        },
        required_mcps: {
          type: 'array',
          items: { type: 'string' },
          description: 'MCP server names needed (e.g. github, filesystem, web-search)',
        },
        agent_count_estimate: { type: 'number', description: 'Estimated total leaf agents needed' },
        explore_summary: { type: 'string', description: 'Executive summary of explore findings' },
        session_id: { type: 'string', description: 'The explore session ID (provided in your task prompt)' },
      },
      required: ['company_name', 'features', 'zones_plan', 'explore_summary'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    presentation: { icon: '🔭', label: 'Submit Explore Report', family: 'run', tone: 'success' },
    async execute(input, ctx) {
      const runner = AgentRunner.getInstance();
      const db = runner.getDb();
      const { SpaceDb } = await import('../space/space.db.js');
      const spaceDb = new SpaceDb();

      // Extract session_id from input or from run context metadata
      const sessionId = (input as any).session_id as string | undefined;
      if (!sessionId) {
        return {
          success: false,
          summary: 'No session_id provided',
          content: [{ type: 'text', text: 'Error: session_id is required. It was provided in your task prompt.' }],
          isError: true,
        };
      }

      const session = spaceDb.getExploreSession(sessionId);
      if (!session) {
        return {
          success: false,
          summary: 'Explore session not found',
          content: [{ type: 'text', text: `Error: Explore session "${sessionId}" not found.` }],
          isError: true,
        };
      }

      const report = {
        company_name: input.company_name,
        company_type: (input as any).company_type || 'software_product',
        tech_stack: (input as any).tech_stack || [],
        project_summary: (input as any).project_summary || '',
        features: (input as any).features || [],
        zones_plan: (input as any).zones_plan || [],
        managers_plan: (input as any).managers_plan || [],
        required_mcps: (input as any).required_mcps || [],
        agent_count_estimate: (input as any).agent_count_estimate || 0,
        explore_summary: input.explore_summary,
      };

      spaceDb.updateExploreSession(sessionId, {
        status: 'complete',
        explore_report_json: JSON.stringify(report),
        completed_at: new Date().toISOString(),
      });

      const wsServer = CoreWsServer.getInstance();
      wsServer.broadcast({
        type: 'explore_complete',
        sessionId,
        spaceId: session.space_id,
        report,
      });

      // Mark explorer as idle/completed (do not delete agent record so runs & events persist for inspection and refresh)
      const callerAgentId = (ctx as any).agentId;
      if (callerAgentId) {
        try {
          db.updateAgent(callerAgentId, { status: 'idle' });
        } catch {}
      }

      return {
        success: true,
        summary: `Explore report submitted for "${input.company_name}" — ${(report.features as any[]).length} features identified`,
        content: [{
          type: 'text',
          text: `✅ Explore report submitted successfully!\n\nCompany: ${input.company_name}\nFeatures: ${(report.features as any[]).length}\nEstimated agents: ${report.agent_count_estimate}\n\nThe canvas will now display the report for user review. Once accepted, the Architect Agent will build the full team.`,
        }],
        data: { sessionId, reportSummary: report.explore_summary },
      };
    },
  },
  {
    name: 'get_project_explore',
    description:
      'Retrieve details from the project exploration report for the current company space. Use this to look up features, folder ownership, tech stack, or the full explore summary WITHOUT re-exploring. Every agent should call this instead of discovering the project structure manually.',
    inputSchema: {
      type: 'object',
      properties: {
        query_type: {
          type: 'string',
          enum: ['summary', 'features', 'feature_detail', 'folder_map', 'tech_stack', 'zone_plan', 'full'],
          description: 'What to retrieve: summary (brief overview), features (list all features), feature_detail (one feature), folder_map (find owner of a path), tech_stack, zone_plan, full (entire report)',
        },
        feature_id: { type: 'string', description: 'For feature_detail — the feat_ ID to look up' },
        feature_name: { type: 'string', description: 'For feature_detail — search by feature name instead of ID' },
        folder_path: { type: 'string', description: 'For folder_map — find which feature/agent owns this path' },
        space_id: { type: 'string', description: "Company space ID. Defaults to the calling agent's space." },
      },
      required: ['query_type'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false },
    presentation: { icon: '🗺️', label: 'Get Project Explore', family: 'inspect', tone: 'primary' },
    async execute(input, ctx) {
      const runner = AgentRunner.getInstance();
      const db = runner.getDb();
      const { SpaceDb } = await import('../space/space.db.js');
      const spaceDb = new SpaceDb();

      // Resolve space_id: from input, or from agent's owned_space_id
      let spaceId = (input as any).space_id as string | undefined;
      const callerId = (ctx as any).agentId;
      if (!spaceId && callerId) {
        const agent = db.getAgent(callerId);
        spaceId = (agent as any)?.owned_space_id ?? undefined;
      }

      if (!spaceId) {
        // Try to find any session
        const sessions = spaceDb.listExploreSessions();
        if (sessions.length > 0) spaceId = sessions[0].space_id;
      }

      if (!spaceId) {
        return {
          success: false,
          summary: 'No space_id resolved',
          content: [{ type: 'text', text: 'Error: Could not determine space_id. Pass space_id explicitly.' }],
          isError: true,
        };
      }

      const session = spaceDb.getExploreSessionBySpace(spaceId);
      if (!session || !session.explore_report_json) {
        return {
          success: false,
          summary: 'No explore report found',
          content: [{ type: 'text', text: `No explore report found for space ${spaceId}. Run an explore session first.` }],
          isError: true,
        };
      }

      let report: any;
      try { report = JSON.parse(session.explore_report_json); } catch {
        return { success: false, summary: 'Invalid report', content: [{ type: 'text', text: 'Explore report JSON is invalid.' }], isError: true };
      }

      const qt = input.query_type;

      if (qt === 'full') {
        return {
          success: true,
          summary: `Full explore report for ${report.company_name}`,
          content: [{ type: 'text', text: JSON.stringify(report, null, 2) }],
          data: report,
        };
      }

      if (qt === 'summary') {
        const summary = {
          company_name: report.company_name,
          company_type: report.company_type,
          tech_stack: report.tech_stack,
          project_summary: report.project_summary,
          explore_summary: report.explore_summary,
          feature_count: report.features?.length ?? 0,
          agent_count_estimate: report.agent_count_estimate,
        };
        return {
          success: true,
          summary: `Summary: ${report.company_name} — ${summary.feature_count} features`,
          content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }],
          data: summary,
        };
      }

      if (qt === 'features') {
        const features = (report.features || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          description: f.description,
          folders: f.folders,
          complexity: f.complexity,
          suggested_agent_name: f.suggested_agent_name,
        }));
        return {
          success: true,
          summary: `${features.length} features in explore report`,
          content: [{ type: 'text', text: JSON.stringify(features, null, 2) }],
          data: features,
        };
      }

      if (qt === 'feature_detail') {
        const featureId = (input as any).feature_id as string | undefined;
        const featureName = (input as any).feature_name as string | undefined;
        const feature = (report.features || []).find((f: any) =>
          (featureId && f.id === featureId) ||
          (featureName && f.name.toLowerCase().includes(featureName.toLowerCase()))
        );
        if (!feature) {
          return {
            success: false,
            summary: 'Feature not found',
            content: [{ type: 'text', text: `Feature "${featureId || featureName}" not found in explore report.` }],
            isError: true,
          };
        }
        return {
          success: true,
          summary: `Feature detail: ${feature.name}`,
          content: [{ type: 'text', text: JSON.stringify(feature, null, 2) }],
          data: feature,
        };
      }

      if (qt === 'folder_map') {
        const folderPath = (input as any).folder_path as string | undefined;
        const matches: any[] = [];
        for (const f of (report.features || [])) {
          const owns = (f.folders || []).some((fp: string) =>
            folderPath && (fp === folderPath || folderPath.startsWith(fp) || fp.startsWith(folderPath))
          );
          if (owns) matches.push({ feature_id: f.id, feature_name: f.name, suggested_agent_name: f.suggested_agent_name, folders: f.folders });
        }
        return {
          success: true,
          summary: `${matches.length} feature(s) own path "${folderPath}"`,
          content: [{ type: 'text', text: JSON.stringify(matches, null, 2) }],
          data: matches,
        };
      }

      if (qt === 'tech_stack') {
        return {
          success: true,
          summary: `Tech stack: ${(report.tech_stack || []).join(', ')}`,
          content: [{ type: 'text', text: JSON.stringify(report.tech_stack || [], null, 2) }],
          data: report.tech_stack,
        };
      }

      if (qt === 'zone_plan') {
        return {
          success: true,
          summary: `Zone plan: ${(report.zones_plan || []).length} top-level zones`,
          content: [{ type: 'text', text: JSON.stringify(report.zones_plan || [], null, 2) }],
          data: report.zones_plan,
        };
      }

      return {
        success: false,
        summary: 'Unknown query_type',
        content: [{ type: 'text', text: `Unknown query_type: ${qt}` }],
        isError: true,
      };
    },
  },
  {
    name: 'project_explore',
    description:
      'Explore deep project knowledge, modules, features, file/folder locations, tech stack, data models, and team topology for the company space. Feeded by the Explore Phase so agents have instantaneous domain knowledge without re-exploring the codebase. Call with parameter/section or query to get specific feature/folder specs.',
    inputSchema: {
      type: 'object',
      properties: {
        parameter: {
          type: 'string',
          enum: [
            'overview',
            'architecture',
            'modules',
            'features',
            'feature_detail',
            'file_structure',
            'folder_map',
            'api_endpoints',
            'data_models',
            'dependencies',
            'required_mcps',
            'zones_and_agents_plan',
            'workflows_and_sop',
            'testing_and_devops',
            'summary',
            'full',
          ],
          description: 'The project parameter or architectural dimension to inspect. Defaults to "summary".',
        },
        section: {
          type: 'string',
          description: 'Alias for parameter (e.g. "features", "modules", "overview", "folder_map").',
        },
        query: {
          type: 'string',
          description: 'Free-text search query across features, modules, documentation, and folders.',
        },
        feature_name: {
          type: 'string',
          description: 'Name or ID of the feature to look up (e.g. "auth", "billing", "canvas").',
        },
        module_name: {
          type: 'string',
          description: 'Name of the module or subsystem to look up.',
        },
        folder_path: {
          type: 'string',
          description: 'Directory or file path to check which dedicated agent and feature owns it.',
        },
        space_id: {
          type: 'string',
          description: 'Optional space ID. Defaults to the calling agent\'s home space.',
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false },
    presentation: { icon: '🔍', label: 'Project Explore', family: 'inspect', tone: 'primary' },
    async execute(input, ctx) {
      const runner = AgentRunner.getInstance();
      const db = runner.getDb();
      const { SpaceDb } = await import('../space/space.db.js');
      const spaceDb = new SpaceDb();

      let spaceId = (input as any).space_id as string | undefined;
      const callerId = (ctx as any).agentId;
      if (!spaceId && callerId) {
        const agent = db.getAgent(callerId);
        spaceId = (agent as any)?.owned_space_id ?? undefined;
      }

      if (!spaceId) {
        const sessions = spaceDb.listExploreSessions();
        if (sessions.length > 0) spaceId = sessions[0].space_id;
      }

      if (!spaceId) {
        return {
          success: false,
          summary: 'No space_id resolved',
          content: [{ type: 'text', text: 'Error: Could not determine company space ID. Pass space_id explicitly.' }],
          isError: true,
        };
      }

      const session = spaceDb.getExploreSessionBySpace(spaceId);
      if (!session || !session.explore_report_json) {
        return {
          success: false,
          summary: 'No explore report found',
          content: [{ type: 'text', text: `No explore report found for space "${spaceId}". Run an explore session first.` }],
          isError: true,
        };
      }

      let report: any;
      try {
        report = JSON.parse(session.explore_report_json);
      } catch {
        return { success: false, summary: 'Invalid report', content: [{ type: 'text', text: 'Explore report JSON is invalid.' }], isError: true };
      }

      const param = ((input as any).parameter || (input as any).section || 'summary').toLowerCase();
      const queryStr = typeof (input as any).query === 'string' ? (input as any).query.trim().toLowerCase() : '';
      const featName = (input as any).feature_name || (input as any).module_name;
      const folderPath = (input as any).folder_path;

      // Handle free-text query if provided
      if (queryStr) {
        const matchingFeatures = (report.features || []).filter((f: any) =>
          f.name?.toLowerCase().includes(queryStr) ||
          f.description?.toLowerCase().includes(queryStr) ||
          f.folders?.some((fo: string) => fo.toLowerCase().includes(queryStr))
        );
        const matchingZones = (report.zones_plan || []).filter((z: any) =>
          z.name?.toLowerCase().includes(queryStr) ||
          z.description?.toLowerCase().includes(queryStr)
        );

        return {
          success: true,
          summary: `Project search results for "${queryStr}": ${matchingFeatures.length} feature(s), ${matchingZones.length} zone(s)`,
          content: [{
            type: 'text',
            text: JSON.stringify({
              query: queryStr,
              company: report.company_name,
              matchingFeatures,
              matchingZones,
            }, null, 2),
          }],
          data: { matchingFeatures, matchingZones },
        };
      }

      // Feature specific lookup
      if (featName || param === 'feature_detail') {
        const target = (featName || '').toLowerCase();
        const feature = (report.features || []).find((f: any) =>
          f.id?.toLowerCase() === target ||
          f.name?.toLowerCase().includes(target)
        );
        if (!feature) {
          return {
            success: false,
            summary: `Feature "${featName}" not found`,
            content: [{ type: 'text', text: `Feature "${featName}" not found in project report. Available features:\n${(report.features || []).map((f: any) => `- ${f.name} (${f.id})`).join('\n')}` }],
            isError: true,
          };
        }
        return {
          success: true,
          summary: `Feature: ${feature.name} (${feature.suggested_agent_name})`,
          content: [{ type: 'text', text: JSON.stringify(feature, null, 2) }],
          data: feature,
        };
      }

      // Folder ownership lookup
      if (folderPath || param === 'folder_map' || param === 'file_structure' || param === 'folders') {
        const fp = folderPath || '';
        const matches: any[] = [];
        for (const f of (report.features || [])) {
          const owns = (f.folders || []).some((fo: string) =>
            !fp || fo === fp || fp.startsWith(fo) || fo.startsWith(fp)
          );
          if (owns) {
            matches.push({
              feature_id: f.id,
              feature_name: f.name,
              suggested_agent_name: f.suggested_agent_name,
              owned_folders: f.folders,
              key_files: f.key_files || [],
            });
          }
        }
        return {
          success: true,
          summary: `Folder mapping for "${fp || 'all'}": ${matches.length} feature owner(s)`,
          content: [{ type: 'text', text: JSON.stringify(matches, null, 2) }],
          data: matches,
        };
      }

      if (param === 'modules' || param === 'architecture') {
        const data = {
          company_name: report.company_name,
          company_type: report.company_type,
          tech_stack: report.tech_stack,
          zones_plan: report.zones_plan,
          features_overview: (report.features || []).map((f: any) => ({
            id: f.id,
            name: f.name,
            agent: f.suggested_agent_name,
            folders: f.folders,
          })),
        };
        return {
          success: true,
          summary: `Architecture & Modules for ${report.company_name}`,
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
          data,
        };
      }

      if (param === 'features') {
        return {
          success: true,
          summary: `${(report.features || []).length} features cataloged`,
          content: [{ type: 'text', text: JSON.stringify(report.features || [], null, 2) }],
          data: report.features,
        };
      }

      if (param === 'required_mcps') {
        return {
          success: true,
          summary: `Required MCPs: ${(report.required_mcps || []).join(', ')}`,
          content: [{ type: 'text', text: JSON.stringify(report.required_mcps || [], null, 2) }],
          data: report.required_mcps,
        };
      }

      if (param === 'zones_and_agents_plan' || param === 'zone_plan') {
        const data = {
          zones: report.zones_plan || [],
          managers: report.managers_plan || [],
          agent_count_estimate: report.agent_count_estimate,
        };
        return {
          success: true,
          summary: `Team & Zone Plan for ${report.company_name}`,
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
          data,
        };
      }

      if (param === 'full') {
        return {
          success: true,
          summary: `Full project explore document for ${report.company_name}`,
          content: [{ type: 'text', text: JSON.stringify(report, null, 2) }],
          data: report,
        };
      }

      // Default: overview / summary
      const overview = {
        company_name: report.company_name,
        company_type: report.company_type,
        tech_stack: report.tech_stack,
        project_summary: report.project_summary,
        explore_summary: report.explore_summary,
        total_features: (report.features || []).length,
        total_zones: (report.zones_plan || []).length,
        required_mcps: report.required_mcps,
      };
      return {
        success: true,
        summary: `Project Overview: ${report.company_name} (${overview.total_features} features, ${overview.total_zones} zones)`,
        content: [{ type: 'text', text: JSON.stringify(overview, null, 2) }],
        data: overview,
      };
    },
  },
  {
    name: 'submit_build_complete',
    description:
      'Called ONLY by the Architect Agent after completing the full team build (all zones, managers, and leaf agents created). This marks the explore session as built, broadcasts build_complete, and self-terminates the Architect Agent.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string', description: 'The explore session ID' },
        summary: { type: 'string', description: 'Brief summary of everything created' },
        zones_created: { type: 'number', description: 'Number of zones created' },
        agents_created: { type: 'number', description: 'Number of agents created' },
        mcps_attached: { type: 'number', description: 'Number of MCP attachments made' },
      },
      required: ['session_id', 'summary'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    presentation: { icon: '🏗️', label: 'Submit Build Complete', family: 'run', tone: 'success' },
    async execute(input, ctx) {
      const runner = AgentRunner.getInstance();
      const db = runner.getDb();
      const { SpaceDb } = await import('../space/space.db.js');
      const spaceDb = new SpaceDb();

      const session = spaceDb.getExploreSession((input as any).session_id);
      if (!session) {
        return {
          success: false,
          summary: 'Session not found',
          content: [{ type: 'text', text: `Error: Session "${(input as any).session_id}" not found.` }],
          isError: true,
        };
      }

      spaceDb.updateExploreSession(session.id, { status: 'built' });

      const wsServer = CoreWsServer.getInstance();
      wsServer.broadcast({
        type: 'build_complete',
        sessionId: session.id,
        spaceId: session.space_id,
        summary: input.summary,
        stats: {
          zonesCreated: (input as any).zones_created ?? 0,
          agentsCreated: (input as any).agents_created ?? 0,
          mcpsAttached: (input as any).mcps_attached ?? 0,
        },
      });

      // Mark architect as idle/completed (do not delete so run history and logs persist)
      const callerAgentId = (ctx as any).agentId;
      if (callerAgentId) {
        try {
          db.updateAgent(callerAgentId, { status: 'idle' });
        } catch {}
      }

      return {
        success: true,
        summary: `Build complete for session ${session.id}. ${input.summary}`,
        content: [{
          type: 'text',
          text: `✅ Build complete!\n\n${input.summary}\n\nThe company team is now live on the canvas.`,
        }],
        data: { sessionId: session.id, spaceId: session.space_id },
      };
    },
  },
];

// ── Bridged Canvas MCP Tools ──────────────────────────────────────────────
// Makes all 39 Canvas MCP tools directly available as first-class Custom Agent Tools
// so the harness ToolGate exposes them across ALL phases without requiring MCP prefixes.
const CANVAS_BRIDGED_CUSTOM_TOOLS: ToolDefinition[] = CANVAS_TOOL_DEFINITIONS.map((def) => ({
  name: def.name,
  description: def.description,
  inputSchema: (def.inputSchema as Record<string, unknown>) || { type: 'object', properties: {} },
  execute: async (args: any, ctx: any) => {
    const server = CanvasMcpServer.getInstance();
    const callerId = (ctx as any)?.agentId;
    let agentSpace: string | null = null;
    if (callerId) {
      try {
        const { SpaceDb } = await import('../space/space.db.js');
        const sdb = new SpaceDb();
        agentSpace = sdb.getAgentSpaceId(callerId);
      } catch {}
    }
    const targetSpace: string | null =
      agentSpace || (args as any)?.space_id || (args as any)?.spaceId || (ctx as any)?.spaceId || (ctx as any)?.owned_space_id || null;
    // Scoped via AsyncLocalStorage (runWithScopedSpaceId), not a shared
    // module-wide variable: the old setConfiguredSpaceId(targetSpace) was
    // never reset, so a call that resolved no target space (no membership,
    // no space_id argument) silently inherited whatever space a PREVIOUS,
    // unrelated agent's call had last set — and since executeTool() awaits
    // network/DB calls partway through, two agents in different spaces
    // running tools concurrently could overwrite each other's scope mid-call.
    // Always passing targetSpace here (even when null) means a call with no
    // resolvable space gets exactly that for ITS OWN execution, isolated
    // from whatever any other concurrent or prior call set. See #13.
    try {
      const res = await runWithScopedSpaceId(targetSpace, () => server.executeTool(def.name, (args as Record<string, any>) || {}));
      const textContent = res.content?.map((c: any) => c.text || '').join('\n') || '';
      return {
        success: !res.isError,
        summary: textContent.slice(0, 300),
        content: res.content || [{ type: 'text', text: textContent }],
        isError: res.isError,
      };
    } catch (err: any) {
      return {
        success: false,
        summary: err?.message || 'Tool execution failed',
        content: [{ type: 'text', text: `Tool error in ${def.name}: ${err?.message || String(err)}` }],
        isError: true,
      };
    }
  },
}));

export const CUSTOM_AGENT_TOOLS: ToolDefinition[] = [
  ...BASE_CUSTOM_AGENT_TOOLS,
  ...CANVAS_BRIDGED_CUSTOM_TOOLS,
];

/** Names of the canvas-owned tools, for prompt gating / UI lists. */
export const CUSTOM_AGENT_TOOL_NAMES = CUSTOM_AGENT_TOOLS.map((t) => t.name);
