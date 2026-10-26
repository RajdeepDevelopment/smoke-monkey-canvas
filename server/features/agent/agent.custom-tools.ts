import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import type { ToolDefinition } from 'smoke-monkey-harness';
import { loadAgentSkills } from 'smoke-monkey-harness';
import { AgentRunner } from './agent.runner.js';
import { checkAgentConfigStatus } from './agent.config-check.js';
import { startConnect } from '../mcp/mcp.connect.js';
import { STOCK_MCPS } from '../mcp/mcp.stock.js';
import { authStatus, canonicalRedirectUri } from '../mcp/mcp.oauth.js';
import { ensureAgentWorkspace, syncAgentDiskManifestFromDb, readAgentMemorySummaries } from './agent.manifest.js';
import { resolveAgentWorkspace } from './agent.prompt.js';
import { CoreWsServer } from '../core/ws.server.js';
import { CoreDatabase } from '../core/database.db.js';
import { PERSONALITY_PRESETS, OUTPUT_STYLE_PRESETS, resolvePersonalities, resolveOutputStyles, parseIdList } from './agent.presets.js';
import { loadGitHubPluginSkills } from '../skill/skill.plugins.js';
import { AgentCronScheduler, calculateNextCronRun } from './agent.cron.js';
import { ensureDefaultAgentCronJobs } from './agent.memory-compactor.js';

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

interface SingleDelegationTaskInput {
  target_agent_id: string;
  task_title: string;
  requirements_file_path: string;
  instructions?: string;
}

interface DelegationTaskResult {
  success: boolean;
  status: string;
  target_agent_id: string;
  target_agent_name: string;
  task_title: string;
  response_file_path?: string;
  summary?: string | null;
  error?: string | null;
}

async function executeSingleDelegatedTask(
  task: SingleDelegationTaskInput,
  callerInfo: {
    callerAgentId?: string;
    callerName: string;
    callerWorkspace: string;
  },
  runner: AgentRunner,
  db: ReturnType<AgentRunner['getDb']>,
): Promise<DelegationTaskResult> {
  const targetAgentId = String(task.target_agent_id || '').trim();
  const taskTitle = String(task.task_title || '').trim();
  const requirementsFilePath = String(task.requirements_file_path || '').trim();
  const instructions = typeof task.instructions === 'string' ? task.instructions.trim() : '';

  if (!targetAgentId || !taskTitle || !requirementsFilePath) {
    return {
      success: false,
      status: 'failed',
      target_agent_id: targetAgentId || 'unknown',
      target_agent_name: 'Unknown',
      task_title: taskTitle || 'Untitled',
      error: 'Missing required parameters: target_agent_id, task_title, and requirements_file_path are required.',
    };
  }

  // 1. Verify target agent exists
  const targetAgent = db.getAgent(targetAgentId);
  if (!targetAgent) {
    return {
      success: false,
      status: 'failed',
      target_agent_id: targetAgentId,
      target_agent_name: 'Unknown',
      task_title: taskTitle,
      error: `Target agent with ID "${targetAgentId}" does not exist in database.`,
    };
  }

  // 2. Verify peer connection
  if (callerInfo.callerAgentId) {
    const peers = db.getConnectedPeers(callerInfo.callerAgentId);
    const isConnected = peers.some((p) => p.id === targetAgentId);
    if (!isConnected) {
      const connectedList = peers.map((p) => `"${p.name}" (${p.id})`).join(', ') || 'none';
      return {
        success: false,
        status: 'failed',
        target_agent_id: targetAgentId,
        target_agent_name: targetAgent.name,
        task_title: taskTitle,
        error: `Agent "${targetAgent.name}" (${targetAgentId}) is not connected as a peer. Connected peers: ${connectedList}. Please connect on canvas first.`,
      };
    }
  }

  // 3. Verify target agent configuration / eligibility
  const configStatus = checkAgentConfigStatus(targetAgentId, db);
  if (!configStatus.isConfigured) {
    return {
      success: false,
      status: 'unconfigured',
      target_agent_id: targetAgentId,
      target_agent_name: targetAgent.name,
      task_title: taskTitle,
      error: `Agent "${targetAgent.name}" (${targetAgentId}) is NOT fully configured and is not eligible to execute tasks. Missing configuration:\n- ${configStatus.reasons.join('\n- ')}`,
    };
  }

  // 4. Verify requirements file
  const reqFullPath = isAbsolute(requirementsFilePath)
    ? requirementsFilePath
    : join(callerInfo.callerWorkspace, requirementsFilePath);

  if (!existsSync(reqFullPath)) {
    return {
      success: false,
      status: 'failed',
      target_agent_id: targetAgentId,
      target_agent_name: targetAgent.name,
      task_title: taskTitle,
      error: `Requirements file not found at "${reqFullPath}". You must create the requirements markdown file before delegating.`,
    };
  }

  let requirementsContent = '';
  try {
    requirementsContent = readFileSync(reqFullPath, 'utf-8');
  } catch (err: any) {
    return {
      success: false,
      status: 'failed',
      target_agent_id: targetAgentId,
      target_agent_name: targetAgent.name,
      task_title: taskTitle,
      error: `Failed to read requirements file: ${err.message}`,
    };
  }

  // 5. Build delegated prompt
  const delegationPrompt = [
    `## 🤝 DELEGATED TASK FROM PEER AGENT: ${callerInfo.callerName} (${callerInfo.callerAgentId || 'unknown'})`,
    `Task Title: ${taskTitle}`,
    instructions ? `Handoff Instructions: ${instructions}\n` : '',
    `### REQUIREMENTS SPECIFICATION (from ${requirementsFilePath}):`,
    requirementsContent,
    '',
    '---',
    '### DELEGATION EXECUTION REQUIREMENTS:',
    '1. Review and fulfill the requested task completely according to the requirements above.',
    '2. Generate all required deliverables and verify their correctness.',
    '3. Provide a structured completion report detailing:',
    '   - Executive Summary of actions completed',
    '   - Deliverables produced with file paths',
    '   - Any important findings, caveats, or recommendations for the delegating agent.',
  ]
    .filter(Boolean)
    .join('\n');

  const delegationSessionId = `delegation_${callerInfo.callerAgentId || 'caller'}_${targetAgentId}_${Date.now()}`;

  try {
    const targetRun = await runner.runAgentAndWait(
      targetAgentId,
      'manual',
      delegationPrompt,
      delegationSessionId,
    );

    // Write response markdown file in caller workspace
    const safeTitle = (taskTitle || 'task')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '_')
      .slice(0, 30);
    const responseFileName = `response_${safeTitle}_${Date.now()}.md`;
    const reportsDir = join(callerInfo.callerWorkspace, 'reports');
    if (!existsSync(reportsDir)) {
      mkdirSync(reportsDir, { recursive: true });
    }
    const responseFullPath = join(reportsDir, responseFileName);
    const responseRelativePath = join('reports', responseFileName);

    const responseMarkdown = [
      `# Delegated Task Response: ${taskTitle}`,
      `- **Target Agent**: ${targetAgent.name} (\`${targetAgentId}\`)`,
      `- **Target Agent Role**: ${targetAgent.role || 'General Assistant'}`,
      `- **Status**: ${targetRun.status}`,
      `- **Completed At**: ${targetRun.completed_at || new Date().toISOString()}`,
      `- **Original Requirements**: \`${requirementsFilePath}\``,
      '',
      `## Target Agent Output & Summary:`,
      targetRun.summary || targetRun.error || '(No output recorded)',
    ].join('\n');

    writeFileSync(responseFullPath, responseMarkdown, 'utf-8');

    return {
      success: targetRun.status === 'completed',
      status: targetRun.status,
      target_agent_id: targetAgentId,
      target_agent_name: targetAgent.name,
      task_title: taskTitle,
      response_file_path: responseRelativePath,
      summary: targetRun.summary,
      error: targetRun.error,
    };
  } catch (err: any) {
    return {
      success: false,
      status: 'failed',
      target_agent_id: targetAgentId,
      target_agent_name: targetAgent.name,
      task_title: taskTitle,
      error: `Execution error on agent "${targetAgent.name}": ${err.message}`,
    };
  }
}

/**
 * Canvas-owned custom tools.
 */
export const CUSTOM_AGENT_TOOLS: ToolDefinition[] = [
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
      'Delegates a specialized task to a connected peer agent on the canvas. Supports both a single task or PARALLEL multi-agent tasks via the `tasks` array. Per protocol, you MUST write requirements markdown file(s) first. This tool executes peer agent(s), awaits completion, writes response report(s) into your reports/ folder, and returns the response.',
    inputSchema: {
      type: 'object',
      properties: {
        target_agent_id: {
          type: 'string',
          description: 'The unique ID of the target peer agent to delegate the task to (single task mode).',
        },
        task_title: {
          type: 'string',
          description: 'A concise descriptive title for the delegated task (single task mode).',
        },
        requirements_file_path: {
          type: 'string',
          description:
            'Relative or absolute path to the requirements markdown file created by the calling agent (single task mode).',
        },
        instructions: {
          type: 'string',
          description: 'Optional additional instructions or handoff notes for the target peer agent.',
        },
        tasks: {
          type: 'array',
          description:
            'Optional array of tasks to execute concurrently in PARALLEL across multiple peer agents. When provided, all delegated agents execute simultaneously and are awaited together.',
          items: {
            type: 'object',
            properties: {
              target_agent_id: { type: 'string', description: 'Target peer agent ID.' },
              task_title: { type: 'string', description: 'Concise descriptive title of subtask.' },
              requirements_file_path: {
                type: 'string',
                description: 'Path to the requirements markdown file for this subtask.',
              },
              instructions: { type: 'string', description: 'Optional handoff instructions.' },
            },
            required: ['target_agent_id', 'task_title', 'requirements_file_path'],
          },
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    presentation: { icon: '🤝', label: 'Delegate Task', family: 'run', tone: 'primary' },
    async execute(input, ctx) {
      const runner = AgentRunner.getInstance();
      const db = runner.getDb();

      // Find calling agent from context runId or active runs
      const callerRun = runner.getActiveRun(ctx.runId) || (ctx.runId ? db.getRun(ctx.runId) : null);
      const callerAgentId = callerRun
        ? ('agent_id' in callerRun ? callerRun.agent_id : callerRun.agentId)
        : undefined;
      const callerAgent = callerAgentId ? db.getAgent(callerAgentId) : null;
      const callerName = callerAgent ? callerAgent.name : 'Peer Agent';
      const callerWorkspace =
        ctx.workspacePath || (callerAgent?.working_dir?.trim()) || process.cwd();

      const callerInfo = { callerAgentId, callerName, callerWorkspace };

      // ── Parallel Multi-Task Delegation Flow ──
      if (Array.isArray(input.tasks) && input.tasks.length > 0) {
        const tasksList = input.tasks as SingleDelegationTaskInput[];

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
      const singleTask: SingleDelegationTaskInput = {
        target_agent_id: String(input.target_agent_id || '').trim(),
        task_title: String(input.task_title || '').trim(),
        requirements_file_path: String(input.requirements_file_path || '').trim(),
        instructions: typeof input.instructions === 'string' ? input.instructions.trim() : undefined,
      };

      if (!singleTask.target_agent_id || !singleTask.task_title || !singleTask.requirements_file_path) {
        return {
          success: false,
          summary: 'Missing required parameters for delegate_task',
          content: [
            {
              type: 'text',
              text: 'Error: target_agent_id, task_title, and requirements_file_path (or tasks array) are required.',
            },
          ],
          isError: true,
        };
      }

      const result = await executeSingleDelegatedTask(singleTask, callerInfo, runner, db);

      const summaryText = result.success
        ? `delegate_task → ${result.target_agent_name} completed "${result.task_title}" (${result.status})`
        : `delegate_task → Failed: ${result.error || result.status}`;

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
    name: 'get_agent_skills',
    description:
      'Inspect and list the skills currently attached to this agent (or a target peer agent). Returns the exact count, names, descriptions, and source of attached skills. Call this whenever the user asks what skills you have attached, how many skills you have, or when verifying your skills configuration.',
    inputSchema: {
      type: 'object',
      properties: {
        target_agent_id: {
          type: 'string',
          description: 'Optional ID of the target agent to inspect. Defaults to the calling agent itself.',
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
      const agentId = String(input.target_agent_id || callerAgentId || '').trim();
      const agent = agentId ? db.getAgent(agentId) : null;
      if (!agent) {
        return {
          success: false,
          summary: `Agent "${agentId}" not found`,
          content: [{ type: 'text', text: `Error: Agent "${agentId}" not found.` }],
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
          description: 'Optional ID of the target agent to remove skills from. Defaults to the calling agent itself.',
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

      const agentId = String(input.target_agent_id || callerAgentId || '').trim();
      const agent = agentId ? db.getAgent(agentId) : null;
      if (!agent) {
        return {
          success: false,
          summary: `Agent "${agentId}" not found`,
          content: [{ type: 'text', text: `Error: Agent "${agentId}" not found.` }],
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
          description: 'Optional ID of the target agent to attach the skill to. Defaults to the calling agent itself.',
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

      const agentId = String(input.target_agent_id || callerAgentId || '').trim();
      const agent = agentId ? db.getAgent(agentId) : null;
      if (!agent) {
        return {
          success: false,
          summary: `Agent "${agentId}" not found`,
          content: [{ type: 'text', text: `Error: Agent "${agentId}" not found.` }],
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
          description: 'Optional ID of the target agent. Defaults to calling agent.',
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

      const agentId = String(input.target_agent_id || callerAgentId || '').trim();
      const agent = agentId ? db.getAgent(agentId) : null;
      if (!agent) {
        return {
          success: false,
          summary: `Agent "${agentId}" not found`,
          content: [{ type: 'text', text: `Error: Agent "${agentId}" not found.` }],
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
          description: 'Optional ID of the target agent. Defaults to calling agent.',
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

      const agentId = String(input.target_agent_id || callerAgentId || '').trim();
      const agent = agentId ? db.getAgent(agentId) : null;
      if (!agent) {
        return {
          success: false,
          summary: `Agent "${agentId}" not found`,
          content: [{ type: 'text', text: `Error: Agent "${agentId}" not found.` }],
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
        target_agent_id: {
          type: 'string',
          description: 'Optional ID of the target agent to update. Defaults to the calling agent itself.',
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

      const agentId = String(input.target_agent_id || callerAgentId || '').trim();
      const agent = agentId ? db.getAgent(agentId) : null;
      if (!agent) {
        return {
          success: false,
          summary: `Agent "${agentId}" not found`,
          content: [{ type: 'text', text: `Error: Agent "${agentId}" not found.` }],
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

      const updatedAgent = db.updateAgent(agent.id, patch);

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
          data: { agent_id: agent.id, updated_at: new Date().toISOString() },
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
          description: 'Optional ID of the target agent to inspect. Defaults to calling agent.',
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

      const agentId = String(input.target_agent_id || callerAgentId || '').trim();
      const agent = agentId ? db.getAgent(agentId) : null;
      if (!agent) {
        return {
          success: false,
          summary: `Agent "${agentId}" not found`,
          content: [{ type: 'text', text: `Error: Agent "${agentId}" not found.` }],
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
      };

      return {
        success: true,
        summary: `Profile for ${agent.name}`,
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
          description: 'Optional ID of the target agent to update. Defaults to the calling agent itself.',
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
      const agentId = String(input.target_agent_id || callerAgentId || '').trim();
      const agent = agentId ? db.getAgent(agentId) : null;
      if (!agent) {
        return {
          success: false,
          summary: `Agent "${agentId}" not found`,
          content: [{ type: 'text', text: `Error: Agent "${agentId}" not found.` }],
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
      'Manage this agent\'s (or a peer agent\'s) specialized memory files: facts.md (verified facts & invariants), semantic.md (learned conceptual knowledge), episodic.md (event & run history), procedural.md (step-by-step workflows & runbooks), working.md (active task scratchpad), prospective.md (deferred intentions & triggers), reflective.md (meta-cognition & lessons learned), associative.md (system & entity relationships), preferences.md (user & agent working preferences), identity.md (evolving persona & boundaries). Call this to record learned facts, inspect memories, or rebuild memory files.',
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
          description: 'Which memory dimension to operate on (e.g. "facts" for facts.md, "semantic" for semantic.md).',
        },
        action: {
          type: 'string',
          enum: ['read', 'write', 'append', 'clear'],
          description: 'The memory operation: "read" to inspect, "write" to overwrite, "append" to add an entry, "clear" to reset with default seed template.',
        },
        content: {
          type: 'string',
          description: 'The content to write or append. Required for "write" and "append".',
        },
        target_agent_id: {
          type: 'string',
          description: 'Optional ID of the target agent. Defaults to the calling agent itself.',
        },
      },
      required: ['memory_type', 'action'],
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
      const agentId = String(input.target_agent_id || callerAgentId || '').trim();
      const agent = agentId ? db.getAgent(agentId) : null;
      if (!agent) {
        return {
          success: false,
          summary: `Agent "${agentId}" not found`,
          content: [{ type: 'text', text: `Error: Agent "${agentId}" not found.` }],
          isError: true,
        };
      }

      const workspace = resolveAgentWorkspace(agent);
      const ws = ensureAgentWorkspace(workspace, agent.id, agent.name, agent.system_prompt);

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

      // Broadcast live updates
      try {
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
          description: 'Optional ID of the target agent to inspect. Defaults to the calling agent itself.',
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
      const agentId = String(input.target_agent_id || callerAgentId || '').trim();
      const agent = agentId ? db.getAgent(agentId) : null;
      if (!agent) {
        return {
          success: false,
          summary: `Agent "${agentId}" not found`,
          content: [{ type: 'text', text: `Error: Agent "${agentId}" not found.` }],
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
      const requestedTargetId = String(input.target_agent_id || input.agent_id || '').trim();
      const targetAgent = requestedTargetId ? (db.getAgent(requestedTargetId) || callerAgent) : callerAgent;

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

        const job = db.createAgentCronJob({
          agent_id: targetAgent.id,
          name: String(input.name).trim(),
          prompt: String(input.prompt).trim(),
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
];

/** Names of the canvas-owned tools, for prompt gating / UI lists. */
export const CUSTOM_AGENT_TOOL_NAMES = CUSTOM_AGENT_TOOLS.map((t) => t.name);
