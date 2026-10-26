import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  workspacePrompt,
  scriptLibraryBlock,
  automationLibraryBlock,
  COMMON_DIR,
  MANIFEST_DIR,
  SMOKE_AGENTS_ROOT,
  type AgentWorkspace,
  type CommonRegistryPaths,
} from './agent.manifest.js';
import { personalityPrompt, outputStylePrompt, parseIdList } from './agent.presets.js';
import type { AgentPolicyEntry, AgentRecord } from './agent.types.js';
import { detectGitRepository, ensureRepoMemory, repoMemoryPrompt } from './agent.repo-memory.js';

/**
 * Resolve the designated working directory for an agent. The runner and the
 * manifest preview MUST agree on this path, so it lives in one place.
 */
export const resolveAgentWorkspace = (agent: Pick<AgentRecord, 'working_dir' | 'name' | 'id'>): string => {
  const explicit = agent.working_dir ? agent.working_dir.trim() : '';
  if (explicit) return explicit;
  const safeName =
    agent.name.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'agent';
  return join(homedir(), '.smoke-agents', `${safeName}-${agent.id}`);
};

/** Path map for the shared registry without writing it (preview-safe). */
export const commonRegistryPaths = (): CommonRegistryPaths => {
  const dir = join(homedir(), SMOKE_AGENTS_ROOT, COMMON_DIR);
  return {
    dir,
    mcpFile: join(dir, 'mcp.json'),
    envFile: join(dir, 'env.json'),
    readmeFile: join(dir, 'README.md'),
  };
};

/**
 * Merge the app-managed policies (from the DB) with policies the agent wrote
 * into its own `policies/policies.json` during a run. Deduped by text; the
 * DB entry wins if both name the same boundary.
 */
export const mergeEffectivePolicies = (
  dbPolicies: AgentPolicyEntry[],
  manifestPolicies: AgentPolicyEntry[],
): AgentPolicyEntry[] => {
  const seen = new Set(dbPolicies.map((p) => p.text));
  const agentPolicies = manifestPolicies.filter((p) => p.source === 'agent' && !seen.has(p.text));
  return [...dbPolicies, ...agentPolicies];
};

export const buildPolicyGuidance = (entries: AgentPolicyEntry[]): string => {
  if (entries.length === 0) return '';
  return `## STRICT AGENT POLICIES & BOUNDARY CONSTRAINTS:\nYou MUST follow these operational boundaries at all times:\n${entries
    .map((p, i) => `${i + 1}. ${p.text}`)
    .join('\n')}`;
};

export const buildDisabledToolsBlock = (disabledTools: string[]): string => {
  if (disabledTools.length === 0) return '';
  return `## DISABLED TOOLS:\nYou MUST NOT call the following tools under any circumstances: ${disabledTools.join(', ')}`;
};

export const buildResourceConstraintsBlock = (workspace: string, memoryLimitMb: number): string =>
  [
    `## RESOURCE ENVELOPE & RUNTIME CONSTRAINTS:`,
    `- Designated Working Directory: "${workspace}"`,
    `- Maximum RAM Allocation Limit: ${memoryLimitMb} MB`,
    `- Device Profile: ${memoryLimitMb <= 512 ? 'Mobile / Resource-Constrained Embedded Edge' : 'Standard / High-Performance Workstation'}`,
    `- Always keep memory usage minimal, free unused data buffers, stream large files instead of loading into memory, and keep all output assets inside the designated working directory.`,
    `- SELF-LEARNING, EVERY RUN: when you automate a repetitive task, you MUST end the run by saving the script into "${join(workspace, MANIFEST_DIR, 'automation')}" and adding its entry (file, purpose, whenToUse, cron) to "${join(workspace, MANIFEST_DIR, 'automation', 'index.json')}". A script saved anywhere else, or saved without its index.json entry, is an INCOMPLETE task — the next run cannot find it and will rebuild everything from scratch.`,
  ].join('\n');

export interface PeerAgentWithConfig extends AgentRecord {
  isConfigured?: boolean;
  unconfiguredReasons?: string[];
}

export const buildPeerAgentsBlock = (peers: PeerAgentWithConfig[]): string => {
  if (!peers || peers.length === 0) return '';
  const peerLines = peers
    .map((p) => {
      const roleDesc = p.role ? ` - Role: ${p.role}` : '';
      const specialtyDesc = p.specialty ? ` | Specialty: ${p.specialty}` : '';
      const desc = p.description ? `\n    Description: ${p.description}` : '';
      const statusText = p.isConfigured === false
        ? `\n    ⚠️ STATUS: NOT CONFIGURED (Cannot execute tasks: ${p.unconfiguredReasons?.join('; ') || 'missing credentials'}). ⛔ DO NOT DELEGATE TASKS TO THIS AGENT until credentials are configured.`
        : `\n    ✅ STATUS: READY & CONFIGURED (Eligible for delegation)`;
      return `- **${p.name}** (Agent ID: \`${p.id}\`)${roleDesc}${specialtyDesc}${desc}${statusText}`;
    })
    .join('\n');

  return `## CONNECTED PEER AGENTS & DELEGATION PROTOCOL:
You are connected to peer agents on the canvas. You can delegate tasks to these specialized agents using the \`delegate_task\` tool.

### Available Peers:
${peerLines}

### DELEGATION PROTOCOL:
When you need assistance from peer agents, you MUST follow these guidelines:
1. **Prepare Requirements**: Write clear markdown specification file(s) in your workspace (e.g. \`requirements_<task>.md\`). Include objective, scope, and expected deliverables.
2. **Check Peer Eligibility**: You may ONLY delegate to peers with status "READY & CONFIGURED". Do NOT attempt to delegate to unconfigured peers.
3. **⚡ PROACTIVE PARALLEL EXECUTION (DEFAULT BEHAVIOR)**:
   - **Whenever multiple subtasks exist or multiple peers can contribute simultaneously, ALWAYS execute in PARALLEL via the \`tasks\` array.** Do NOT perform them one-by-one sequentially.
   - Example: If you need assistance with test analysis, code review, or cache checks, write the requirements files and invoke all peers concurrently in a single \`delegate_task\` call:
     \`\`\`json
     {
       "tasks": [
         {
           "target_agent_id": "agent_id_1",
           "task_title": "First Subtask Title",
           "requirements_file_path": "./requirements_1.md"
         },
         {
           "target_agent_id": "agent_id_2",
           "task_title": "Second Subtask Title",
           "requirements_file_path": "./requirements_2.md"
         }
       ]
     }
     \`\`\`
   - All delegated tasks in the batch will execute simultaneously in parallel, saving time and keeping workflows fast.
   - (For a single isolated task, you may also pass \`target_agent_id\`, \`task_title\`, and \`requirements_file_path\` directly).
4. **Wait for Execution**: \`delegate_task\` executes the peer agent(s) and returns structured report(s) along with paths to the response markdown file(s).
5. **Review & Proceed**: Read and review the peer agent response(s) before completing your run.`;
};

export interface EffectivePromptInput {
  /** Raw DB policies (canvas + user) merged with agent-written policies. */
  policyEntries: AgentPolicyEntry[];
  disabledTools: string[];
  resolvedWorkspace: string;
  memoryLimitMb: number;
  personalities: string | null | undefined;
  outputStyles: string | null | undefined;
  manifest: AgentWorkspace;
  common: CommonRegistryPaths;
  agentId: string;
  agentName?: string;
  peerAgents?: PeerAgentWithConfig[];
  /** Live hierarchy, role and delegation workflow generated from canvas zones. */
  teamWorkflow?: string;
}

/**
 * Assemble the ordered sub-prompt chain. This is THE single source of truth:
 * the run pipeline uses it directly, and the agent-box preview renders the
 * exact same output, so the UI can never disagree with what a run will send.
 *
 * Order (first is highest precedence): policies → disabled tools → resource
 * envelope → voice → format → chat display & task-execution protocol →
 * workspace/memory → repository memory → peer agents → team workflow → script
 * library → automation library (always last).
 */
export const buildMcpAuthGuidanceBlock = (): string => {
  return `## MCP AUTHENTICATION & BROWSER LOGIN
Some MCP servers require OAuth/browser login or API keys. When an attached MCP is not authenticated and needs login:
1. **Open the auth URL in the system/browser directly** - If an authorization URL is provided or the MCP requires OAuth, use the system browser (open it in the user's default/browser environment) rather than asking the user to copy/paste links blindly. The system can launch the OS browser via \`openInSystemBrowser\` / desktop bridge when possible.
2. **Guide, don't block** - Tell the user you're opening the login page in their browser; once they complete sign-in, the connection will be established automatically via OAuth callback/polling.
3. **Handle failures gracefully** - If the browser cannot be opened automatically, fall back to showing the full URL clearly for the user to open manually, but prefer automatic launch first.
4. **Check readiness** - Verify MCP status/readiness before using tools; if auth is required, trigger the connect flow or open the auth URL as needed.
5. **Use available auth mechanisms** - Prefer the app's OAuth flow (server-managed) over asking for raw tokens when OAuth is supported.
6. **MCP.ai is a two-step login** - For MCP.ai connectors, platform OAuth only authorizes this app. Use the MCP server's \`connect\` tool to get its \`connect_url\`, then have the user log in to the underlying provider (Telegram, Linear, …). Do not claim the server is ready while \`connect\` still reports pending accounts or readiness is \`needs-provider-auth\`; show the provider login link and re-check \`connect\` afterward.`;
};

/**
 * Rich chat display guide for the Smoke Monkey chat renderer (GFM markdown +
 * visual widgets). Exact tag/JSON grammar; mirrors the chat UI parser.
 */
export const buildChatDisplayGuidanceBlock = (): string => {
  return `## CHAT RESPONSE FORMAT & RICH UI WIDGETS:
Your chat output renders through a rich markdown engine (GFM tables, code highlight + copy, citation chips, live diagrams). Apply this to EVERY user-facing reply:
- Plain markdown by default: headings, short paragraphs, bullet lists, **GFM tables** for any structured/numeric comparison, fenced code blocks with a language tag for code/commands, task lists for plans.
- Render "widgets" when they make the answer clearer. Widget content MUST be a single valid JSON object between opening and closing tags; never nest widgets or put markdown inside the JSON; one widget per paragraph.

### Mermaid diagram (flow, sequence, state, architecture):
\`\`\`mermaid
graph TD; A[User] --> B[Agent]; B --> C[(Database)];
\`\`\`

### Charts (bar, line, pie, scatter):
<bar-chart-st>{"title":"Latency by provider","data":[{"label":"Ollama","value":120},{"label":"NVIDIA","value":64}]}</bar-chart-ed>
<line-chart-st>{"title":"Runs per day","data":[{"label":"Mon","value":4},{"label":"Tue","value":9}]}</line-chart-ed>
<pie-chart-st>{"title":"Cost share","data":[{"name":"LLM","value":70},{"name":"Tools","value":30}]}</pie-chart-ed>
<scatter-chart-st>{"title":"Speed vs accuracy","x":"latency (ms)","y":"score","data":[{"x":120,"y":0.82},{"x":64,"y":0.91}]}</scatter-chart-ed>
Rows use label/name + value; scatter uses x/y numbers.

### Tree (structure / results / folders):
<tree-st>{"name":"release-check","children":[{"name":"tests pass"},{"name":"build","children":[{"name":"npx tsc -b"}]}]}</tree-ed>

### Workflow graph (pipeline / multi-agent plan; types: input, agent, llm, tool, output, database):
<workflow-st>{"title":"Report pipeline","nodes":[{"id":"task","label":"User task","type":"input"},{"id":"research","label":"Research agent","type":"agent"},{"id":"search","label":"Web search","type":"tool"},{"id":"report","label":"Report","type":"output"}],"edges":[{"from":"task","to":"research"},{"from":"research","to":"search"},{"from":"search","to":"research"},{"from":"research","to":"report"}]}</workflow-ed>

### Insight cards (type picks layout; tone: info | success | warning | danger | neutral):
<card-st>{"type":"kpi","title":"Tests passing","value":"128","subtitle":"vitest suite","change":"+12","trend":"up"}</card-ed>
<card-st>{"type":"progress","title":"Migration","value":80,"max":100,"note":"2 of 8 services migrated"}</card-ed>
<card-st>{"type":"checklist","title":"Post-deploy checks","items":[{"label":"Smoke test","done":true},{"label":"Rollback plan","done":false}]}</card-ed>
<card-st>{"type":"steps","title":"Recovery plan","steps":[{"label":"Restart stuck worker","detail":"docker restart worker"},{"label":"Requeue jobs","detail":"node scripts/requeue.ts"}]}</card-ed>
<card-st>{"type":"status","title":"API service","status":"operational"}</card-ed>
<card-st>{"type":"timeline","title":"Incident","items":[{"title":"Alert fired","time":"09:14","status":"failed"},{"title":"Patched","time":"09:31","status":"completed"}]}</card-ed>
<card-st>{"type":"alert","title":"Blocked","tone":"danger","message":"Migration paused: lock contention over threshold."}</card-ed>
<card-st>{"type":"callout","title":"Note","tone":"info","message":"Dashboard caches for 60s; refresh after deploy."}</card-ed>
<card-st>{"type":"comparison","title":"v2 vs v1","current":"4.2s","previous":"6.8s","tone":"success"}</card-ed>
<card-st>{"type":"insight","title":"Observation","tone":"primary","message":"Queue latency tracks DB locks.","author":"runner"}</card-ed>
<card-st>{"type":"tags","title":"Themes","tags":[{"label":"performance","tone":"warning"},{"label":"reliable","tone":"info"}]}</card-ed>
Valid card types: kpi/stat, metric, metrics/grid/group, progress, list/checklist, steps/howto/plan, quote/insight, alert, status/service-status, callout/note/info/thought, comparison, tags/chips, timeline, table.

Rules: opening tag \`<name-st>\` always pairs with \`<name-ed>\` (bar-chart-st ↔ bar-chart-ed, etc.); JSON must parse on the first try (no trailing commas, escape quotes); report only REAL data — never invent chart numbers; when no widget fits, a GFM table or bullet list is the right choice.`;
};

/**
 * Task-execution protocol: read attached skills before working and keep the
 * live todo list truthful during long tasks. The harness registers the
 * list_skills/use_skill and todo_write tools this block mandates.
 */
export const buildTaskExecutionGuidanceBlock = (): string => {
  return `## TASK EXECUTION: ATTACHED SKILLS & LIVE TODO LIST:
### Read the attached skills while executing a task
- At the start of every non-trivial task, call \`list_skills\` once. If ANY skill's description matches the current task or a step within it, load it with \`use_skill\` BEFORE doing that part of the work and follow its instructions.
- A matching skill is a requirement, not a suggestion: use its documented workflow, checklist and scripts instead of reinventing the routine. Supporting files (scripts, templates, references) ship inside the skill folder path returned by \`use_skill\`.
- Do not re-load a skill already loaded this run; keep following it for as long as the subject still matches. Report which skills guided the work in your final answer when relevant.

### Plugin installation and honesty
- An attached plugin (\`owner/repo\`) points at a GitHub repository. Attaching it does not mean its commands, packages, or services are installed on this machine.
- Before relying on a plugin, verify its repository and install instructions. If the plugin is attached but missing, clone or install it from the repository using its documented setup inside your workspace.
- Never claim a plugin, dependency, CLI, or tool is installed, available, or working unless you verified it in this run. If installation is blocked, state exactly what is missing and continue with the tools that do work.

### Keep the live todo list truthful during long work
- BEFORE starting any task with more than two concrete steps, call \`todo_write\` once with one item per concrete step (not phases), and set the first item to in_progress in the same call.
- Keep AT MOST ONE item in_progress; mark a step completed the moment it is done, and never finish silently. If new required work is discovered mid-run, add it as a new todo item. The user watches the live todo rail while you run — keep it accurate.
- Skip \`todo_write\` only for trivial single-action replies.`;
};

/**
 * THE core runtime system prompt shared by every agent on this backend —
 * appended (via buildSubPrompts) after each agent's own base prompt on every
 * run regardless of how the agent was created or whether its prompt was later
 * customized. Common for: rich chat display (markdown + widgets) and the
 * task-execution protocol (read attached skills/plugins before work, keep the
 * live todo list truthfully updated on long tasks).
 */
export const buildCoreRuntimePromptBlocks = (): string[] => [
  buildChatDisplayGuidanceBlock(),
  buildTaskExecutionGuidanceBlock(),
];

export const buildSubPrompts = (input: EffectivePromptInput): string[] => {
  const blocks: string[] = [];
  const policyGuidance = buildPolicyGuidance(input.policyEntries);
  if (policyGuidance) blocks.push(policyGuidance);
  const disabledBlock = buildDisabledToolsBlock(input.disabledTools);
  if (disabledBlock) blocks.push(disabledBlock);
  blocks.push(buildResourceConstraintsBlock(input.resolvedWorkspace, input.memoryLimitMb));
  const voice = personalityPrompt(parseIdList(input.personalities));
  if (voice) blocks.push(voice);
  const format = outputStylePrompt(parseIdList(input.outputStyles));
  if (format) blocks.push(format);
  blocks.push(...buildCoreRuntimePromptBlocks());
  blocks.push(workspacePrompt(input.manifest, input.common, input.agentId));
  blocks.push(buildMcpAuthGuidanceBlock());

  // Shared repository memory if working in a git repository
  const repoInfo = detectGitRepository(input.resolvedWorkspace);
  if (repoInfo) {
    const repoPaths = ensureRepoMemory(input.common.dir, repoInfo, input.agentId, input.agentName || 'Agent');
    blocks.push(repoMemoryPrompt(repoInfo, repoPaths));
  }

  // Peer agents & delegation protocol
  if (input.peerAgents && input.peerAgents.length > 0) {
    blocks.push(buildPeerAgentsBlock(input.peerAgents));
  }

  // Live role hierarchy and delegation route from the canvas zones
  if (input.teamWorkflow) {
    blocks.push(input.teamWorkflow);
  }

  blocks.push(scriptLibraryBlock(input.manifest));
  blocks.push(automationLibraryBlock(input.manifest));
  return blocks;
};

/** Full system prompt as assembled for a run: base prompt + every sub-prompt. */
export const buildEffectiveSystemPrompt = (
  baseSystemPrompt: string,
  input: EffectivePromptInput,
): string => [baseSystemPrompt, ...buildSubPrompts(input)].filter(Boolean).join('\n\n');
