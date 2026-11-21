import fs from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  workspacePrompt,
  scriptLibraryBlock,
  automationLibraryBlock,
  COMMON_DIR,
  MANIFEST_DIR,
  SMOKE_AGENTS_ROOT,
  SMARTNESS_MD_TEMPLATE,
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

  return `## CONNECTED PEERS & DELEGATION:
Use \`delegate_task\` to coordinate with configured peers:

### Available Peers:
${peerLines}

### DELEGATION & TWO-WAY PROTOCOL:
1. **Delegating Work**: Call \`delegate_task\` with \`target_agent_id\` set to the peer's exact Agent ID (e.g. \`agent_...\` as listed under Available Peers above). Do NOT guess or invent names; any delegation with an invalid or unverified target agent ID will be strictly REJECTED. Only delegate to "READY & CONFIGURED" peers.
2. **Parallel Subtasks**: When delegating to multiple peers or cascading to a squad, execute concurrently via \`tasks: [{ target_agent_id: "...", instructions: "..." }, ...]\`. This runs them in parallel.
3. **Two-Way Threading (ALWAYS Use chat_id)**: Every delegated task provides or returns a \`chat_id\`. If you have a \`chat_id\`, you MUST supply \`"chat_id": "<chat_id>"\` when replying, following up, or reporting status so the other agent receives your response in that exact conversational thread. Never drop the chat_id!
4. **Clarifying Doubts**: If requirements are unclear, do not guess. Put questions under \`### ❓ QUESTIONS / DOUBTS FOR CALLER\` in your report. The caller answers via \`delegate_task(target_agent_id: ..., chat_id: ...)\`.
5. **Intents**: Set \`communication_type\`: \`'delegate'\` (assign work), \`'report_status'\` (deliverables upward), \`'request_approval'\` (sign-off for risky actions), or \`'inform'\` (peer sync).
6. **Action-First (No Empty Narratives)**: When assigned a task or cascading instructions to subordinates/peers, you MUST invoke \`delegate_task\` or execution tools in your CURRENT turn. NEVER output text like "I will delegate this to..." without actually calling the tool in that same turn.
7. **Review**: Check peer reports in \`reports/\` before completing your run.
8. **Checking Peer Specializations & Recent Work**: Use \`get_agent_profile\` or \`get_agent_todo_history\` with \`target_agent_id\` to inspect peer agents' recent completed tasks and proven specialties before delegating.
9. **Closing Delegated Tasks (\`close_delegation_task\`)**: When executing a task that was delegated to you by another agent, you MUST invoke \`close_delegation_task\` with \`"chat_id": "<chat_id>"\`, \`"status": "completed"\` (or \`"failed"\` / \`"blocked"\`), \`"summary"\`, and \`"deliverables"\` upon finishing. Merely stopping your turn is not sufficient; calling \`close_delegation_task\` formally seals and delivers your deliverables, notes, and sign-off back to the caller agent.`;
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
  /** Whether this agent has an enabled Smoke Monkey Canvas MCP attachment. */
  hasCanvasMcp?: boolean;
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
- Every to-do you create or update is automatically saved into your persistent date-wise task history (\`.smoke-agent/todos/YYYY-MM-DD.md\`). If your execution begins late at night (e.g. 11:55 PM) and crosses midnight, tasks remain attributed to the initial start date.
- You can inspect your historical to-do records with \`get_agent_todo_history\` and re-evaluate/update your specialty domains with \`redevelop_agent_specializations\`.
- Skip \`todo_write\` only for trivial single-action replies.`;
};

/**
 * Guidance instructing the agent that they are equipped with the Smoke Monkey Canvas MCP,
 * explaining their live governance authority over the canvas where they are stationed,
 * and mandating direct invocation of canvas_* tools when asked to create or expand teams.
 */
export const buildCanvasMcpGovernanceBlock = (): string => {
  return `## 🎨 SMOKE MONKEY CANVAS GOVERNANCE & LIVE MULTI-AGENT CONTROL:
You are an active autonomous agent stationed directly on the **Smoke Monkey Canvas** spatial workspace — you are not an isolated chat assistant, but a living member of this interactive visual multi-agent organization.
- **Direct Workspace Control**: You are equipped with the **\`smoke-monkey-canvas\` MCP server**, which gives you live, programmatic governance over the very canvas workspace you inhabit!
- **Full Canvas Authority**: Using your \`canvas_*\` MCP tools, you have the power to configure, hire, spawn, modify, reposition, connect, and govern the agents and department zones on this canvas where you are stationed.
- **WHEN ASKED TO CREATE OR EXPAND TEAMS (ACTION MANDATE)**:
  - When the user or your leadership instructs you to:
    • "Add more agents", "Hire engineers/specialists", "Build an engineering team/squad"
    • "Create a new department or zone", "Expand our company", "Reorganize the hierarchy"
    • "Attach tools or skills to agents", "Connect reporting lines", "Audit or fix the layout"
  - **DO NOT** simply reply with descriptive conversational text, high-level advice, or passive promises to do it later.
  - **YOU MUST DIRECTLY INVOKE THE CANVAS MCP TOOLS IN YOUR ACTIVE TURN!**
  - Execute the full team creation lifecycle immediately:
    1. Create the Department Zone with its operational contract via \`canvas_create_zone\`.
    2. Spawn specialized agents stationed inside the zone via \`canvas_create_agent\`.
    3. Equip each agent with tools and skills via \`canvas_attach_mcp\` and \`canvas_attach_skill\`.
    4. Wire reporting and peer relationships via \`canvas_connect_agents\`.
    5. Run layout verification via \`canvas_audit_ui(space_id: "<your_space_id>", auto_fix: true)\` to guarantee zero card collisions and zero zone overlaps.
- **Your Essential Canvas MCP Tools**:
  • \`canvas_create_zone\`: Set up department zones with operational responsibilities and \`workflowInstructions\`.
  • \`canvas_create_agent\`: Hire and station specialized agents inside designated department zones.
  • \`canvas_attach_mcp\`: Attach MCP servers (e.g. GitHub, Firecrawl, Canvas MCP) to any agent.
  • \`canvas_attach_skill\`: Equip agents with specialized skills from the stock catalog.
  • \`canvas_connect_agents\`: Connect manager-subordinate reporting (\`reports_to\`) and peer collaboration (\`peer\`) lines.
  • \`canvas_update_agent\` & \`canvas_update_zone\`: Reconfigure titles, models, prompts, dimensions, or duties.
  • \`canvas_reposition_agents\`: Cleanly position agents inside zones (\`pos_x = zone.x + 50 + slot * 240, pos_y = zone.y + 75\`).
  • \`canvas_audit_ui\`: Run UI layout quality audits with \`{ auto_fix: true }\` to eliminate overlaps and maintain 100/100 presentation quality.
- **Space Scope Enforcement**: Always pass your assigned \`space_id\` so all created zones and agents belong to your home office space.`;
};

/**
 * THE core runtime system prompt shared by every agent on this backend —
 * appended (via buildSubPrompts) after each agent's own base prompt on every
 * run regardless of how the agent was created or whether its prompt was later
 * customized. Common for: rich chat display (markdown + widgets) and the
 * task-execution protocol (read attached skills/plugins before work, keep the
 * live todo list truthfully updated on long tasks).
 */
export const buildCoreRuntimePromptBlocks = (hasCanvasMcp = false): string[] => [
  buildChatDisplayGuidanceBlock(),
  buildTaskExecutionGuidanceBlock(),
  ...(hasCanvasMcp ? [buildCanvasMcpGovernanceBlock()] : []),
];

export const buildSmartnessBlock = (ws: AgentWorkspace): string => {
  try {
    if (ws.smartnessFile && fs.existsSync(ws.smartnessFile)) {
      const content = fs.readFileSync(ws.smartnessFile, 'utf8').trim();
      if (content) return `## OPERATIONAL SMARTNESS & SCENARIO PLAYBOOK (smartness.md):\n${content}`;
    }
  } catch {}
  return `## OPERATIONAL SMARTNESS & SCENARIO PLAYBOOK (smartness.md):\n${SMARTNESS_MD_TEMPLATE}`;
};

export const buildSubPrompts = (input: EffectivePromptInput): string[] => {
  const blocks: string[] = [];
  const policyGuidance = buildPolicyGuidance(input.policyEntries);
  if (policyGuidance) blocks.push(policyGuidance);
  const disabledBlock = buildDisabledToolsBlock(input.disabledTools);
  if (disabledBlock) blocks.push(disabledBlock);
  blocks.push(buildResourceConstraintsBlock(input.resolvedWorkspace, input.memoryLimitMb));

  // 🧠 PRIORITY: Inject the 10-Dimension Cognitive Runtime Memory Matrix with live inner contents
  // and explicit instructions to collect domain knowledge and build specialization.
  blocks.push(workspacePrompt(input.manifest, input.common, input.agentId));

  const voice = personalityPrompt(parseIdList(input.personalities));
  if (voice) blocks.push(voice);
  const format = outputStylePrompt(parseIdList(input.outputStyles));
  if (format) blocks.push(format);
  blocks.push(...buildCoreRuntimePromptBlocks(Boolean(input.hasCanvasMcp)));
  blocks.push(buildSmartnessBlock(input.manifest));
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

export interface ProfileSyncData {
  name: string;
  role?: string | null;
  specialty?: string | null;
  description?: string | null;
  responsibilities?: string[] | string | null;
  duties?: string[] | string | null;
}

/**
 * Checks whether an agent's base system prompt is stale compared to its current
 * name/role profile (e.g. prompt still says "People Ops Concierge" while the
 * agent was renamed to "Smoke Monkey Canvas Outreach Agent").
 */
export const isSystemPromptStale = (
  systemPrompt: string | undefined | null,
  agent: { name: string; role?: string | null },
): boolean => {
  if (!systemPrompt || !systemPrompt.trim()) return true;
  const nameMatch = systemPrompt.match(/agent name:\s*"([^"]+)"/i);
  if (nameMatch && nameMatch[1].trim().toLowerCase() !== agent.name.trim().toLowerCase()) {
    return true;
  }
  const identityMatch = systemPrompt.match(/# AGENT IDENTITY\s*\nYou are \*\*([^*]+)\*\*/i);
  if (identityMatch && identityMatch[1].trim().toLowerCase() !== agent.name.trim().toLowerCase()) {
    return true;
  }
  return false;
};

/**
 * Reconciles and synchronizes an agent's base system prompt with its latest profile
 * (name, role, description, specialty, and responsibilities).
 * Preserves attached tool sections (MCP servers, skills, custom principles)
 * while ensuring identity, mission, and responsibilities match the updated profile.
 */
export const reconcileSystemPromptWithProfile = (
  currentPrompt: string | undefined | null,
  profile: ProfileSyncData,
): string => {
  const name = (profile.name || '').trim() || 'Agent';
  const role = (profile.role || '').trim() || 'Autonomous Specialist';
  const specialty = (profile.specialty || '').trim() || 'General Operations';
  const desc = (profile.description || '').trim() || 'Accomplish assigned domain tasks efficiently.';

  let responsibilitiesText = '';
  const explicitResp = profile.responsibilities ?? profile.duties;
  if (explicitResp) {
    responsibilitiesText = Array.isArray(explicitResp)
      ? explicitResp.map((r, i) => `${i + 1}. ${r}`).join('\n')
      : String(explicitResp).trim();
  } else if (specialty && (specialty.includes(',') || specialty.includes(';'))) {
    const items = specialty
      .split(/[,;]\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    responsibilitiesText = items.map((r, i) => `${i + 1}. ${r}`).join('\n');
  } else {
    responsibilitiesText = `1. Execute assigned ${role} tasks with high precision and verifiable deliverables.\n2. Deepen domain specialization in ${specialty}.\n3. Coordinate actively with users and peer agents.`;
  }

  const identityHeader =
    `You are ${role} (agent name: "${name}").\n\n` +
    `## MISSION\n${desc}\n\n` +
    `## SPECIALTY FOCUS\nYour primary expertise is in **${specialty}**. Coordinate with other specialists when tasks fall outside your domain.\n\n` +
    `## CORE RESPONSIBILITIES\n${responsibilitiesText}`;

  if (!currentPrompt || !currentPrompt.trim()) {
    return (
      `${identityHeader}\n\n` +
      `## OPERATING PRINCIPLES\n` +
      `- You are an autonomous AI specialist. Complete the requested work end-to-end with the tools available to you.\n` +
      `- Prefer real data over guessing: when a task touches a system you have a tool for, CALL the tool.\n` +
      `- Keep all artifacts inside your designated workspace; never modify unrelated source files.\n` +
      `- When a step blocks on missing credentials or permissions, report it clearly and continue what you can.\n` +
      `- Finish with a concise, structured executive summary of what you did, what you found, and recommended next steps.`
    );
  }

  const sections = currentPrompt.trim().split(/\n(?=## )/);

  // A prompt with no `## ` heading at all splits into exactly one element —
  // the whole prompt. The loop below starts at index 1 specifically to skip
  // sections[0] (assumed to be the old generated header line, discarded
  // because a fresh one is built above), but with no heading anywhere,
  // sections[0] IS the entire hand-written prompt, so the loop never ran
  // and nothing was ever preserved: the whole prompt was silently replaced
  // with boilerplate on every profile change (rename, role/description/
  // specialty edit). There's no reliable way to tell "generated header" from
  // "user's own unstructured prose" here, so leave it untouched instead of
  // guessing. See #15.
  if (sections.length <= 1) {
    return currentPrompt.trim();
  }

  const preservedSections: string[] = [];

  for (let i = 1; i < sections.length; i++) {
    const sec = sections[i].trim();
    const heading = sec.split('\n')[0].toUpperCase();
    if (
      heading.startsWith('## MISSION') ||
      heading.startsWith('## STANDING RESPONSIBILITIES') ||
      heading.startsWith('## CORE RESPONSIBILITIES') ||
      heading.startsWith('## SPECIALTY FOCUS') ||
      heading.startsWith('## IDENTITY') ||
      heading.startsWith('## AGENT IDENTITY')
    ) {
      continue;
    }
    preservedSections.push(sec);
  }

  if (preservedSections.length > 0) {
    return `${identityHeader}\n\n${preservedSections.join('\n\n')}`;
  }

  return (
    `${identityHeader}\n\n` +
    `## OPERATING PRINCIPLES\n` +
    `- You are an autonomous AI specialist. Complete the requested work end-to-end with the tools available to you.\n` +
    `- Prefer real data over guessing: when a task touches a system you have a tool for, CALL the tool.\n` +
    `- Keep all artifacts inside your designated workspace; never modify unrelated source files.\n` +
    `- When a step blocks on missing credentials or permissions, report it clearly and continue what you can.\n` +
    `- Finish with a concise, structured executive summary of what you did, what you found, and recommended next steps.`
  );
};

