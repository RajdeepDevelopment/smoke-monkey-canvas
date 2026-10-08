import fs from 'node:fs';
import path from 'node:path';

/**
 * Per-agent workspaces & the shared agent registry.
 *
 * Every agent owns a private control area — `.smoke-agent/` inside its working
 * directory — holding its memory files, MCP config, skills, temp scripts, logs,
 * artifacts and runtime state. Files are seeded once (missing files are created,
 * existing content is preserved every run) so the agent's memory survives across
 * runs and restarts. Because each agent has its own workspace, every path is
 * unique per agent id and is never shared.
 *
 *   <workspace>/.smoke-agent/
 *   ├── README.md            how this folder works (written once)
 *   ├── manifest.json        regenerated index of the whole workspace
 *   ├── memory/              six long-lived memory files (plain markdown)
 *   │   ├── semantic.md      knowledge learned by the agent
 *   │   ├── episodic.md      what happened in previous tasks/runs
 *   │   ├── working.md       temporary scratch for the current task
 *   │   ├── facts.md         verified facts about user/project/environment
 *   │   ├── preferences.md   user + agent working preferences
 *   │   └── procedural.md    proven workflows / "how to do X"
 *   ├── skills/
 *   │   ├── skills.json      attached skills manifest
 *   │   └── enabled/         (agent-installed skill markers)
 *   ├── mcp/
 *   │   ├── mcp.json         attached MCP servers manifest
 *   │   └── connections.md   agent's own notes about its connections
 *   ├── context/
 *   │   ├── project.md       current project working context
 *   │   ├── user.md          what the agent knows about the user
 *   │   └── session.md       rewritten at the start of every run
 *   ├── scripts/             temporary scripts the agent creates and runs
 *   ├── logs/                agent execution / debug logs
 *   ├── artifacts/           temporary generated outputs
 *   └── state/
 *       ├── runtime.json     current-run status (rewritten each run)
 *       └── checkpoints.json agent-written run checkpoints
 *
 * Sharing: a second, common area — `.smoke-common/` — lives next to the agent
 * workspaces. It holds the registry every agent can read and append to, so MCP
 * data and environment variable names are shared between all agents:
 *
 *   <workspace-parent>/.smoke-common/
 *   ├── README.md
 *   ├── mcp.json            every MCP server known/appended anywhere
 *   └── env.json            environment variable NAMES (placeholders only)
 *
 * NOTE: `.smoke-agent` is deliberately NOT `.smoke` — the harness already owns
 * `<workspace>/.smoke/runs/<runId>/...` for its own artifacts.
 */
export const MANIFEST_DIR = '.smoke-agent';
export const SMOKE_AGENTS_ROOT = '.smoke-agents';
export const COMMON_DIR = '.smoke-common';

export interface ManifestMcpEntry {
  /** Stable server key. Canvas-managed entries use this to refresh in place. */
  key: string;
  name: string;
  label?: string | null;
  description?: string | null;
  /** stdio transport. Present unless the server is HTTP. */
  command?: string;
  args?: string[];
  /** HTTP transport. Present instead of `command` for remote servers. */
  url?: string;
  /**
   * User-authored env only, with every value replaced by a `$VAR` placeholder.
   * Real values are never written to disk — the runner injects them at spawn.
   */
  env?: Record<string, string>;
  /** Names of env vars the runner supplies (secrets stay in settings/env). */
  required_env?: string[];
  stock?: boolean;
  enabled: boolean;
  /** `canvas`/`user` entries come from the app (managed) and are refreshed each run. `agent` entries are written by the agent itself and preserved. */
  source: 'canvas' | 'user' | 'agent';
  attachment_id?: string;
}

export interface ManifestSkillEntry {
  name: string;
  description: string;
  /** Inline content when the skill is small enough to embed. */
  content?: string;
  /** Set when the skill body is long; `content_file` points inside the folder. */
  content_file?: string;
  enabled: boolean;
  /** `canvas`/`user` entries come from the app (managed) and are refreshed each run. `agent` entries are written by the agent itself and preserved. */
  source: 'canvas' | 'user' | 'agent';
  attachment_id?: string;
}

export interface ManifestPolicyEntry {
  text: string;
  source: 'canvas' | 'user' | 'agent';
}

const readJson = <T>(file: string): T | null => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    return null;
  }
};

const writeJson = (file: string, value: unknown) => {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const writeIfMissing = (file: string, content: string) => {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, content, 'utf8');
  }
};

/**
 * Merge freshly DB-derived entries with whatever already sits on disk.
 *
 * Managed entries (`source: "canvas"` or `"user"`) are regenerated from the
 * database every run, so their previous on-disk mirrors are dropped and the
 * fresh copy wins. Only entries the agent wrote itself (`source: "agent"`, plus
 * legacy entries with no source) are preserved verbatim, so a run never
 * silently deletes a plugin the agent installed for itself.
 */
const mergeBySource = <T extends { source?: string; attachment_id?: string }>(
  preserved: T[],
  managed: T[],
): T[] => {
  const managedIds = new Set(managed.map((m) => m.attachment_id).filter(Boolean));
  const kept = preserved.filter(
    (p) =>
      p.source !== 'canvas' &&
      p.source !== 'user' &&
      !(p.attachment_id && managedIds.has(p.attachment_id)),
  );
  return [...managed, ...kept];
};

// ── Memory file seeds ──────────────────────────────────────────────────────

const MEMORY_SEEDS: Record<string, (agentName: string) => string> = {
  'semantic.md': (agentName) => `# Semantic Memory — ${agentName}

General conceptual knowledge, frameworks, principles, and domain understandings you have learned that stay useful across future tasks. Long-lived and not tied to one single episode.

## Entries

<!-- Add entries as:
### YYYY-MM-DD — <Concept or Principle>
- What was learned:
- When and why to apply it:
- Key relationships & nuances:
-->
`,

  'episodic.md': (agentName) => `# Episodic Memory — ${agentName}

Autobiographical event log of what happened in your previous tasks and runs: outcomes, major milestones, decisions, failures, and approaches that worked.

## Entries

<!-- Add entries as:
### YYYY-MM-DD — <Task / Run Summary>
- Outcome: success / partial / failed
- Key decisions and why:
- Surprises or bottlenecks encountered:
- What to repeat, what to avoid in future runs:
-->
`,

  'procedural.md': (agentName) => `# Procedural Memory — ${agentName}

Proven workflows, step-by-step procedures, runbooks, command patterns, and "how to do X" execution knowledge.

## Procedures

<!-- Add entries as:
### <Procedure Name>
1. Step 1
2. Step 2
- Preconditions / prerequisites:
- Gotchas / common failure modes:
-->
`,

  'working.md': (agentName) => `# Working Memory — ${agentName}

Temporary active scratchpad for the CURRENT task only. This is short-term active memory — keep it focused and refresh or replace it between tasks.

## Current Task Scratchpad

<!-- Active goals, intermediate thoughts, mid-task findings, open questions, immediate next steps. -->
`,

  'prospective.md': (agentName) => `# Prospective Memory — ${agentName}

Remembering to perform planned actions in the future: deferred tasks, follow-up commitments, scheduled intentions, and "remember to do X when Y occurs".

## Pending Intentions & Deferred Actions

<!-- Add items as:
### [ ] Task or Follow-Up Description
- Trigger condition / when to execute:
- Target file / entity / service:
- Urgency / priority:
- Created date:
-->

## Completed Follow-Ups
<!-- Move finished items here with completion date and result -->
`,

  'reflective.md': (agentName) => `# Reflective Memory & Meta-Cognition — ${agentName}

Self-evaluation, critique of problem-solving strategies, error pattern recognition, blind spots, cognitive biases, and lessons learned from mistakes and self-corrections.

## Self-Critique & Error Analysis

<!-- Add reflections as:
### YYYY-MM-DD — <Situation & Self-Correction>
- What went wrong or was inefficient:
- Root cause (e.g. invalid assumption, missed requirement, inappropriate tool):
- Better strategy adopted:
- Golden rule for future tasks:
-->

## Blind Spots & Operating Heuristics
<!-- Personal heuristics and warning signs to check before acting -->
`,

  'associative.md': (agentName) => `# Associative & Relational Memory — ${agentName}

Entity relationships, cross-component dependencies, architectural linkages, and mental models of how systems, codebases, and domain concepts connect.

## Component & Service Dependency Maps

<!-- Map key relationships:
- Component A -> Depends on B -> Calls API C
- Data model X -> Linked to table Y via foreign key Z
-->

## Mental Models & Domain Concepts
<!-- How different business entities and modules relate to each other -->
`,

  'facts.md': (agentName) => `# Facts & Invariants — ${agentName}

Verified, ground-truth facts about the user, project, environment, configuration, and entities. Never promote unverified guesses into facts.

## User
<!-- updated: -->

## Project & Stack
<!-- updated: -->

## Environment & Configuration
<!-- updated: -->
`,

  'preferences.md': (agentName) => `# Preferences & Norms — ${agentName}

Stable user preferences, coding styles, communication rhythms, formatting expectations, and preferred ways of working.

## User Preferences
<!-- Formatting, tone, output brevity, tool choices, priorities -->

## My Working Preferences & Rhythm
<!-- Internalized work patterns and quality standards -->
`,

  'identity.md': (agentName) => `# Identity & Persona Memory — ${agentName}

Internalized persona traits, tone nuances, role boundaries, communication philosophy, and ethical stance that evolve over time.

## Core Identity & Voice
- Role archetype:
- Tone and communication cadence:
- Strengths and core competencies:

## Operating Stance & Boundaries
- What I take proactive ownership of:
- What I verify or confirm before proceeding:
`,
};

export interface MemoryFileInfo {
  file: string;
  name: string;
  category: string;
  purpose: string;
}

export const MEMORY_FILES: MemoryFileInfo[] = [
  { file: 'semantic.md', name: 'semantic', category: 'Semantic', purpose: 'General knowledge, principles, and domain understandings learned across tasks.' },
  { file: 'episodic.md', name: 'episodic', category: 'Episodic', purpose: 'Autobiographical event log of previous tasks/runs: outcomes, decisions, failures, and approaches.' },
  { file: 'procedural.md', name: 'procedural', category: 'Procedural', purpose: 'Proven workflows, procedures, implementation patterns, and "how to do X" recipes.' },
  { file: 'working.md', name: 'working', category: 'Working Memory', purpose: 'TEMPORARY scratch/scratchpad for the current task only. Cleared/replaced between tasks.' },
  { file: 'prospective.md', name: 'prospective', category: 'Prospective', purpose: 'Future intentions, deferred tasks, scheduled reminders, and "remember to do X when Y occurs".' },
  { file: 'reflective.md', name: 'reflective', category: 'Reflective', purpose: 'Meta-cognition, self-evaluation, critique of problem solving, blind spots, and error patterns.' },
  { file: 'associative.md', name: 'associative', category: 'Associative', purpose: 'Entity relationships, cross-component dependencies, and mental models of codebases/systems.' },
  { file: 'facts.md', name: 'facts', category: 'Facts', purpose: 'Verified ground-truth facts about the user, project, environment, and configuration.' },
  { file: 'preferences.md', name: 'preferences', category: 'Preferences', purpose: 'Stable user preferences, coding styles, formatting rules, and preferred ways of working.' },
  { file: 'identity.md', name: 'identity', category: 'Identity', purpose: 'Evolved persona traits, voice nuances, role boundaries, and communication style.' },
];

// ── README template (written once per agent) ───────────────────────────────

const AUTOMATION_README = `# Automation — self-learning & self-building

Scripts you build for tasks you have already solved, so future runs reuse
them instead of re-solving the same problem. This folder is listed in your
system prompt on every run.

## The loop (after every successful run)
1. Notice repetition — "I will be asked this again" (scheduled reports,
   recurring checks, data pulls, cleanups, CI triage, ...).
2. Build a script that does the task end-to-end — parameterized (inputs as
   arguments/config), one-line header comment, no hard-coded secrets.
3. Save it HERE with \`write_file\`.
4. Register it in \`index.json\` with the exact "when to use" instruction.
5. If it should run on a schedule, record a \`cron\` expression in its entry
   and tell the user to enable your cron schedule in the agent settings.
6. On later runs: reuse it, and improve it when it fails or a better
   approach appears — never rewrite a working script from scratch.

## Index entry shape (\`index.json\` → "automations")
\`\`\`json
{
  "file": "weekly-ci-report.sh",
  "purpose": "One line: what it does",
  "whenToUse": "Reach for this when the user asks for ...",
  "cron": "0 8 * * 1",
  "created": "2026-10-08T00:00:00.000Z",
  "updated": "2026-10-08T00:00:00.000Z",
  "notes": ""
}
\`\`\`
\`cron\` is optional (standard 5-field expression). Keep \`whenToUse\`
precise enough that a future run can decide to reach for the script without
reading the conversation history.

## Self-improvement
Before solving a task that matches an entry's \`whenToUse\`: read the script,
run it, and if it fails or you find a better way, fix the script, bump
\`updated\`, append what changed to \`notes\`, and record the lesson in
\`memory/procedural.md\` (how to do it) or \`memory/episodic.md\` (what
happened). An entry whose script was deleted or is known-broken must be
removed or fixed in the same run — never leave a stale entry indexed.
`;

const AUTOMATION_INDEX_SEED = '{\n  "automations": []\n}\n';

const README_TEMPLATE = (agentId: string, agentName: string, dir: string) => `# Agent workspace — ${agentName}

Agent id: \`${agentId}\`
This folder: \`${dir}\`

This is your private, persistent agent workspace. It is regenerated/seeded before
every run — files you add are preserved, managed entries are refreshed. The
system prompt tells you the exact paths; you read and write these files with your
built-in \`read_file\`, \`write_file\`, and \`edit_file\` tools.

| Area | Holds |
| --- | --- |
| \`memory/*.md\` | Six memory files (semantic, episodic, working, facts, preferences, procedural) |
| \`skills/skills.json\` | Skills attached to this agent |
| \`mcp/mcp.json\` | MCP servers attached to this agent |
| \`mcp/connections.md\` | Your own notes about your connections |
| \`context/*.md\` | Current project / user / session context |
| \`scripts/\` | Temporary scripts you create and run — clean them up after the task |
| \`automation/\` | Self-built automation scripts + \`index.json\` (when to use each, cron link) |
| \`logs/\` | Execution / debug logs |
| \`artifacts/\` | Temporary generated outputs |
| \`state/*.json\` | Runtime & checkpoint state |

## Adding an MCP server or skill

When a user asks you to add a plugin, MCP server, or skill:

1. Read the relevant JSON first — never assume what is installed.
2. Append the new entry using the schema below. **Do not rewrite the file.**
3. Set \`"source": "agent"\` on anything you add. Entries marked
   \`"source": "canvas"\` are owned by the app and will be refreshed on the next
   run, so edits to them will be lost.
4. Confirm to the user which file changed and paste the entry you added.

### MCP entry schema (\`mcp/mcp.json\`)

\`\`\`json
{
  "mcp_servers": {
    "my-new-server": {
      "key": "my-new-server",
      "name": "my-new-server",
      "description": "What it does",
      "command": "npx",
      "args": ["-y", "@scope/package"],
      "env": { "MY_API_KEY": "$MY_API_KEY" },
      "enabled": true,
      "source": "agent"
    }
  }
}
\`\`\`

Use \`"$VAR_NAME"\` placeholders in \`env\` — real values are injected by the runner
at spawn time and are never stored in this folder.

### Skill entry schema (\`skills/skills.json\`)

\`\`\`json
{
  "skills": [
    {
      "name": "my-skill",
      "description": "One line on when to use it",
      "content_file": "skills/my-skill.md",
      "enabled": true,
      "source": "agent"
    }
  ]
}
\`\`\`

Put long skill bodies in \`skills/<name>.md\` next to this file and point
\`content_file\` at it. Short bodies may use \`content\` inline instead.

## Discovering shared servers & env

The shared registry every agent can read (the paths the system prompt calls the
"Shared MCP & environment registry") is maintained by the app and is READ-ONLY
for agents. It lists MCP servers and environment variable NAMES available across
the app. Never write to it. When you add a plugin, MCP server, or skill, you add
it to YOUR OWN files above only — that affects your own operation, not other
agents.

## When changes take effect

- **Skills** are read at the start of a run.
- **MCP servers** are spawned at the start of a run.

Either way, tell the user to re-run the agent (or wait for its next scheduled
run) if they want the change picked up immediately.
`;

const SCRIPTS_README = `# scripts/

Temporary scripts and generated helper programs for the current task. Treat them
as disposable: clean up scripts you no longer need when the task completes. If
something becomes a reusable procedure, promote it into a skill or the project's
source code instead of leaving it here.
`;

const SCRIPTS_GITIGNORE = `*
!.gitignore
!README.md
`;

const IGNORE_ALL = `*
`;

const ASSETS_FOLDER_README = (label: string, rule: string) => `# ${label}

${rule}

Name every file with the task and date, e.g. \`2026-10-07-contract-risk-report.xlsx\`.
Add an entry to \`../index.md\` recording each file you generate.
`;

const ASSETS_INDEX_SEED = `# Asset index

Every generated asset lives in one of the subfolders below and is recorded here.
All generated Excel/data exports, images, and scripts MUST be written under
\`artifacts/\` — never outside it.

| Subfolder | Holds |
| --- | --- |
| \`excel/\` | Spreadsheets & data exports (.xlsx, .csv, .tsv) |
| \`images/\` | Images, charts, diagrams (.png, .jpg, .svg) |
| \`scripts/\` | Exported/deliverable scripts (auto-listed in your system prompt) |

| File | Type | Task | Created |
| --- | --- | --- | --- |
`;

const CONNECTIONS_README = `# Connections

Notes on the MCP servers and tools you have connected to, and how you use them.
This is your own working note — the authoritative configuration lives in
\`mcp/mcp.json\`.
`;

const POLICIES_README = `# Policies

Operational boundaries this agent must follow. The app-managed policies you are
bound by are listed in \`policies.json\` with \`"source": "canvas"\` (or \`"user"\`
when you added them yourself). They are compiled into your system prompt.

You may ADD your own self-imposed operating boundary by writing a new entry into
\`policies.json\` with \`"source": "agent"\` — it is preserved across runs and appears
in your system prompt on every future run. Never modify or remove policies whose
source is \`canvas\` or \`user\`.
`;

const CONTEXT_PROJECT_SEED = `# Project context

Current working context about the project you are operating on. Refresh this when
the project changes.
`;
const CONTEXT_USER_SEED = `# User context

What you know about the user you serve. Keep it factual and updated.
`;
const CONTEXT_SESSION_SEED = `# Session

Rewritten at the start of every run with that run's task.
`;

// ── Shared registry README (written once) ──────────────────────────────────

const COMMON_README_TEMPLATE = `# Shared Smoke Monkey registry

Every agent can READ these files to discover MCP servers and environment
variable NAMES used across the app. They are maintained by the app — agents must
NOT write to them.

- \`mcp.json\` — every MCP server the app knows about.
- \`env.json\` — environment variable NAMES used by MCP servers and providers.
  Values are \`$VAR_NAME\` placeholders only; real secrets live in the app's
  settings and are injected at spawn time.

To add a plugin, MCP server, or environment variable for your OWN operation,
edit your own \`.smoke-agent/mcp/mcp.json\` (or \`skills/skills.json\`) and set
\`"source": "agent"\` there — never touch this shared registry.
`;

// ── Exported helpers ───────────────────────────────────────────────────────

/** Full set of paths inside one agent's `.smoke-agent/` workspace. */
export interface AgentWorkspace {
  dir: string;
  readmeFile: string;
  manifestFile: string;

  memoryDir: string;
  memoryFiles: Record<string, string>;

  skillsDir: string;
  skillsFile: string;
  skillsEnabledDir: string;

  mcpDir: string;
  mcpFile: string;
  connectionsFile: string;

  contextDir: string;
  projectFile: string;
  userFile: string;
  sessionFile: string;

  scriptsDir: string;
  automationDir: string;
  automationIndexFile: string;
  logsDir: string;
  artifactsDir: string;
  assetsExcelDir: string;
  assetsImagesDir: string;
  assetsScriptsDir: string;
  assetsIndexFile: string;
  policiesDir: string;
  policiesFile: string;
  policiesInfoFile: string;

  systemPromptFile: string;

  stateDir: string;
  runtimeFile: string;
  checkpointsFile: string;
}

export interface WriteManifestInput {
  agentId: string;
  agentName: string;
  workspace: string;
  mcpEntries: ManifestMcpEntry[];
  skillEntries: ManifestSkillEntry[];
  policyEntries?: ManifestPolicyEntry[];
  systemPrompt?: string;
}

export interface AgentManifest extends AgentWorkspace {}

/** Build the path map for an agent's `.smoke-agent/` area without touching disk. */
export const buildAgentWorkspace = (workspace: string): AgentWorkspace => {
  const dir = path.join(workspace, MANIFEST_DIR);
  const memoryDir = path.join(dir, 'memory');
  const skillsDir = path.join(dir, 'skills');
  const mcpDir = path.join(dir, 'mcp');
  const contextDir = path.join(dir, 'context');
  const scriptsDir = path.join(dir, 'scripts');
  const automationDir = path.join(dir, 'automation');
  const logsDir = path.join(dir, 'logs');
  const artifactsDir = path.join(dir, 'artifacts');
  const policiesDir = path.join(dir, 'policies');
  const stateDir = path.join(dir, 'state');

  return {
    dir,
    readmeFile: path.join(dir, 'README.md'),
    manifestFile: path.join(dir, 'manifest.json'),
    systemPromptFile: path.join(dir, 'system_prompt.md'),
    memoryDir,
    memoryFiles: Object.fromEntries(MEMORY_FILES.map((m) => [m.file, path.join(memoryDir, m.file)])),
    skillsDir,
    skillsFile: path.join(skillsDir, 'skills.json'),
    skillsEnabledDir: path.join(skillsDir, 'enabled'),
    mcpDir,
    mcpFile: path.join(mcpDir, 'mcp.json'),
    connectionsFile: path.join(mcpDir, 'connections.md'),
    contextDir,
    projectFile: path.join(contextDir, 'project.md'),
    userFile: path.join(contextDir, 'user.md'),
    sessionFile: path.join(contextDir, 'session.md'),
    scriptsDir,
    automationDir,
    automationIndexFile: path.join(automationDir, 'index.json'),
    logsDir,
    artifactsDir,
    assetsExcelDir: path.join(artifactsDir, 'excel'),
    assetsImagesDir: path.join(artifactsDir, 'images'),
    assetsScriptsDir: path.join(artifactsDir, 'scripts'),
    assetsIndexFile: path.join(artifactsDir, 'index.md'),
    policiesDir,
    policiesFile: path.join(policiesDir, 'policies.json'),
    policiesInfoFile: path.join(policiesDir, 'policies.md'),
    stateDir,
    runtimeFile: path.join(stateDir, 'runtime.json'),
    checkpointsFile: path.join(stateDir, 'checkpoints.json'),
  };
};

/**
 * Create (if missing) every folder and seed file inside an agent's workspace.
 * Existing files are never overwritten, so hand-written guidance and memory
 * survive runs. Never throws — a read-only or missing workspace must not stop
 * the run.
 */
export const ensureAgentWorkspace = (
  workspace: string,
  agentId: string,
  agentName: string,
  systemPrompt?: string,
): AgentWorkspace => {
  const ws = buildAgentWorkspace(workspace);
  try {
    fs.mkdirSync(ws.dir, { recursive: true });
    fs.mkdirSync(ws.memoryDir, { recursive: true });
    fs.mkdirSync(ws.skillsDir, { recursive: true });
    fs.mkdirSync(ws.skillsEnabledDir, { recursive: true });
    fs.mkdirSync(ws.mcpDir, { recursive: true });
    fs.mkdirSync(ws.contextDir, { recursive: true });
    fs.mkdirSync(ws.scriptsDir, { recursive: true });
    fs.mkdirSync(ws.automationDir, { recursive: true });
    fs.mkdirSync(ws.logsDir, { recursive: true });
    fs.mkdirSync(ws.artifactsDir, { recursive: true });
    fs.mkdirSync(ws.assetsExcelDir, { recursive: true });
    fs.mkdirSync(ws.assetsImagesDir, { recursive: true });
    fs.mkdirSync(ws.assetsScriptsDir, { recursive: true });
    fs.mkdirSync(ws.policiesDir, { recursive: true });
    fs.mkdirSync(ws.stateDir, { recursive: true });

    for (const m of MEMORY_FILES) {
      writeIfMissing(ws.memoryFiles[m.file], MEMORY_SEEDS[m.file](agentName));
    }

    if (systemPrompt && systemPrompt.trim()) {
      writeIfMissing(ws.systemPromptFile, systemPrompt.trim() + '\n');
    } else {
      writeIfMissing(ws.systemPromptFile, `# System Prompt — ${agentName}\n\nExecute assigned tasks.\n`);
    }

    writeIfMissing(ws.connectionsFile, CONNECTIONS_README);
    writeIfMissing(
      ws.mcpFile,
      JSON.stringify({ agent_id: agentId, agent_name: agentName, mcp_servers: {} }, null, 2) + '\n',
    );
    writeIfMissing(
      ws.skillsFile,
      JSON.stringify({ agent_id: agentId, agent_name: agentName, skills: [] }, null, 2) + '\n',
    );
    writeIfMissing(ws.projectFile, CONTEXT_PROJECT_SEED);
    writeIfMissing(ws.userFile, CONTEXT_USER_SEED);
    writeIfMissing(ws.sessionFile, CONTEXT_SESSION_SEED);
    writeIfMissing(path.join(ws.scriptsDir, 'README.md'), SCRIPTS_README);
    writeIfMissing(path.join(ws.scriptsDir, '.gitignore'), SCRIPTS_GITIGNORE);
    writeIfMissing(path.join(ws.automationDir, 'README.md'), AUTOMATION_README);
    writeIfMissing(ws.automationIndexFile, AUTOMATION_INDEX_SEED);
    writeIfMissing(path.join(ws.logsDir, '.gitignore'), IGNORE_ALL);
    writeIfMissing(path.join(ws.artifactsDir, '.gitignore'), IGNORE_ALL);
    writeIfMissing(path.join(ws.assetsExcelDir, 'README.md'), ASSETS_FOLDER_README('Excel / data exports', 'ALL generated spreadsheets and data exports (.xlsx, .csv, .tsv) MUST be saved here — and only here.'));
    writeIfMissing(path.join(ws.assetsImagesDir, 'README.md'), ASSETS_FOLDER_README('Images / charts / diagrams', 'ALL generated images, charts, and diagrams (.png, .jpg, .svg, .html) MUST be saved here — and only here.'));
    writeIfMissing(path.join(ws.assetsScriptsDir, 'README.md'), ASSETS_FOLDER_README('Exported scripts', 'EXPORT deliverable scripts here — scripts you hand to the user. For your own reusable self-built automation (repetitive tasks, cron), save scripts in .smoke-agent/automation/ and register them in its index.json instead. Exported scripts are listed in your system prompt so the user can find and reuse them.'));
    writeIfMissing(ws.assetsIndexFile, ASSETS_INDEX_SEED);
    writeIfMissing(ws.policiesFile, '{\n  "policies": []\n}\n');
    writeIfMissing(ws.policiesInfoFile, POLICIES_README);
    writeIfMissing(ws.runtimeFile, '{\n  "started_at": null,\n  "current_run": null\n}\n');
    writeIfMissing(ws.checkpointsFile, '{\n  "checkpoints": []\n}\n');
    writeIfMissing(ws.readmeFile, README_TEMPLATE(agentId, agentName, ws.dir));
  } catch (e) {
    console.warn(`[agent.manifest] Failed to seed workspace for ${agentId}:`, e);
  }
  return ws;
};

/**
 * Write (and merge) the agent's MCP/skill manifests. MCP now lives at
 * `mcp/mcp.json` and skills at `skills/skills.json`; older root-level copies
 * are read as fallback so agent-added entries survive the move.
 */
export const writeAgentManifest = (input: WriteManifestInput): AgentManifest => {
  const ws = ensureAgentWorkspace(input.workspace, input.agentId, input.agentName, input.systemPrompt);
  const legacyDir = ws.dir;

  try {
    const readManifest = (newPath: string, legacyPath: string) =>
      readJson<Record<string, unknown>>(newPath) ?? readJson<Record<string, unknown>>(legacyPath);

    const prevMcp = readManifest(
      ws.mcpFile,
      path.join(legacyDir, 'mcp.json'),
    ) as { mcp_servers?: ManifestMcpEntry[] | Record<string, ManifestMcpEntry> } | null;
    const prevSkills = readManifest(
      ws.skillsFile,
      path.join(legacyDir, 'skills.json'),
    ) as { skills?: ManifestSkillEntry[] } | null;

    // Older/hand-edited files may hold either an array or a keyed object.
    const prevMcpList = Array.isArray(prevMcp?.mcp_servers)
      ? prevMcp.mcp_servers
      : prevMcp?.mcp_servers
        ? Object.values(prevMcp.mcp_servers)
        : [];

    const mergedMcp = mergeBySource(prevMcpList, input.mcpEntries);
    const mergedSkills = mergeBySource(prevSkills?.skills ?? [], input.skillEntries);

    // Policies: app-managed (`canvas`/`user`, regenerated from the DB) replace
    // their previous mirrors, but policies the agent wrote itself
    // (`source: "agent"`) are preserved across runs.
    const prevPolicies = readJson<{ policies?: ManifestPolicyEntry[] }>(ws.policiesFile);
    const managedPolicies = input.policyEntries ?? [];
    const managedTexts = new Set(managedPolicies.map((p) => p.text));
    const keptAgentPolicies = (prevPolicies?.policies ?? []).filter(
      (p) => p.source === 'agent' && !managedTexts.has(p.text),
    );
    const mergedPolicies = [...managedPolicies, ...keptAgentPolicies];

    writeJson(ws.mcpFile, {
      agent_id: input.agentId,
      agent_name: input.agentName,
      updated_at: new Date().toISOString(),
      note:
        'MCP servers for this agent. Entries with "source": "canvas" are managed by Smoke Monkey Canvas and refreshed each run. "user" entries were attached from the agent box. Add your own with "source": "agent" — see README.md.',
      mcp_servers: Object.fromEntries(mergedMcp.map((e) => [e.key, e])),
    });

    writeJson(ws.skillsFile, {
      agent_id: input.agentId,
      agent_name: input.agentName,
      updated_at: new Date().toISOString(),
      note:
        'Skills for this agent. Entries with "source": "canvas" are managed by Smoke Monkey Canvas and refreshed each run. "user" entries were attached from the agent box. Add your own with "source": "agent" — see README.md.',
      skills: mergedSkills,
    });

    writeJson(ws.policiesFile, {
      agent_id: input.agentId,
      agent_name: input.agentName,
      updated_at: new Date().toISOString(),
      note:
        'Policies for this agent. "canvas" entries come from the platform, "user" entries from the agent box, and "agent" entries were written by the agent during a run and are preserved.',
      policies: mergedPolicies,
    });

    writeJson(ws.manifestFile, {
      agent_id: input.agentId,
      agent_name: input.agentName,
      updated_at: new Date().toISOString(),
      workspace: input.workspace,
      memory: MEMORY_FILES.map((m) => ({ file: m.file, name: m.name, purpose: m.purpose })),
      files: {
        readme: ws.readmeFile,
        mcp: ws.mcpFile,
        skills: ws.skillsFile,
        project: ws.projectFile,
        user: ws.userFile,
        session: ws.sessionFile,
        runtime: ws.runtimeFile,
        checkpoints: ws.checkpointsFile,
        assets_index: ws.assetsIndexFile,
        automation: ws.automationDir,
        automation_index: ws.automationIndexFile,
        assets: {
          excel: ws.assetsExcelDir,
          images: ws.assetsImagesDir,
          scripts: ws.assetsScriptsDir,
        },
        policies: ws.policiesFile,
      },
      note: 'Regenerated metadata describing this agent\'s persistent workspace.',
    });
  } catch (e) {
    console.warn(`[agent.manifest] Failed to write manifest for ${input.agentId}:`, e);
  }

  return ws;
};

/** Read the agent's MCP manifest from disk (any source), legacy root copy as fallback. */
export const readAgentMcpManifest = (ws: AgentWorkspace): ManifestMcpEntry[] => {
  try {
    const data =
      readJson<{ mcp_servers?: ManifestMcpEntry[] | Record<string, ManifestMcpEntry> }>(ws.mcpFile) ??
      readJson<{ mcp_servers?: ManifestMcpEntry[] | Record<string, ManifestMcpEntry> }>(
        path.join(ws.dir, 'mcp.json'),
      );
    const servers = data?.mcp_servers;
    if (!servers) return [];
    return Array.isArray(servers) ? servers : Object.values(servers);
  } catch {
    return [];
  }
};

/** Read the agent's skill manifest from disk (any source), legacy root copy as fallback. */
export const readAgentSkillManifest = (ws: AgentWorkspace): ManifestSkillEntry[] => {
  try {
    const data = readJson<{ skills?: ManifestSkillEntry[] }>(ws.skillsFile) ??
      readJson<{ skills?: ManifestSkillEntry[] }>(path.join(ws.dir, 'skills.json'));
    return data?.skills ?? [];
  } catch {
    return [];
  }
};

/** Read the agent's policy manifest from disk (any source). */
export const readAgentPolicyManifest = (ws: AgentWorkspace): ManifestPolicyEntry[] => {
  try {
    const data = readJson<{ policies?: ManifestPolicyEntry[] }>(ws.policiesFile);
    return data?.policies ?? [];
  } catch {
    return [];
  }
};

/**
 * Honor app-managed attachments the agent removed from its own manifest files
 * (`skills/skills.json`, `mcp/mcp.json`). A row missing from a non-empty,
 * older manifest is treated as deleted by the agent: it is dropped from the
 * returned lists and removed from the DB via the callbacks, so the UI stops
 * listing it and the next manifest regeneration cannot resurrect it.
 *
 * Fail-open rules (never prune when unsure):
 *   - empty manifest → freshly seeded, not written yet
 *   - no manifest file / unreadable → nothing to compare against
 *   - row newer than (or same age as) the file → freshly attached, the file
 *     simply has not been rewritten since
 *   - disabled rows → the runner only writes enabled entries, so their
 *     absence from the file is expected
 *
 * Policies are intentionally not reconciled: entries in `agents.policies`
 * carry no timestamps, so a fresh attach and an agent-side removal cannot be
 * told apart safely.
 */
export const reconcileManifestRemovals = <
  S extends { id: string; skill_name: string; created_at: string; enabled: number },
  M extends { id: string; mcp_name: string; created_at: string; enabled: number },
>(input: {
  ws: AgentWorkspace;
  skills: S[];
  mcps: M[];
  removeSkill: (id: string) => void;
  removeMcp: (id: string) => void;
}): { skills: S[]; mcps: M[] } => {
  const statMs = (file: string): number | null => {
    try {
      return fs.statSync(file).mtimeMs;
    } catch {
      return null;
    }
  };

  const skillManifest = readAgentSkillManifest(input.ws);
  const skillMtime = statMs(input.ws.skillsFile);
  const skillKeep =
    skillManifest.length > 0 && skillMtime !== null
      ? new Set(skillManifest.map((e) => e.name))
      : null;

  const mcpManifest = readAgentMcpManifest(input.ws);
  const mcpMtime = statMs(input.ws.mcpFile);
  const mcpKeep =
    mcpManifest.length > 0 && mcpMtime !== null
      ? new Set(mcpManifest.map((e) => e.name))
      : null;

  const skills: S[] = [];
  for (const s of input.skills) {
    const removed =
      skillKeep !== null &&
      !skillKeep.has(s.skill_name) &&
      s.enabled !== 0 &&
      Date.parse(s.created_at) < skillMtime!;
    if (removed) {
      console.warn(
        `[agent.manifest] ${input.ws.dir}: pruning skill "${s.skill_name}" — removed from the agent's skills.json`,
      );
      input.removeSkill(s.id);
      continue;
    }
    skills.push(s);
  }

  const mcps: M[] = [];
  for (const m of input.mcps) {
    const removed =
      mcpKeep !== null &&
      !mcpKeep.has(m.mcp_name) &&
      m.enabled !== 0 &&
      Date.parse(m.created_at) < mcpMtime!;
    if (removed) {
      console.warn(
        `[agent.manifest] ${input.ws.dir}: pruning MCP "${m.mcp_name}" — removed from the agent's mcp.json`,
      );
      input.removeMcp(m.id);
      continue;
    }
    mcps.push(m);
  }

  return { skills, mcps };
};

/**
 * Stamp the current run into the agent's runtime state and session context.
 * Last-writer-wins is fine: these are per-run status files, not long-term memory.
 */
export const writeAgentRunState = (
  ws: AgentWorkspace,
  state: { agentId: string; runId: string; taskPrompt: string | null; triggerType: string; agentName: string },
) => {
  try {
    writeJson(ws.runtimeFile, {
      agent_id: state.agentId,
      started_at: new Date().toISOString(),
      current_run: {
        run_id: state.runId,
        trigger_type: state.triggerType,
        task: state.taskPrompt ?? '',
      },
    });
    fs.writeFileSync(
      ws.sessionFile,
      `# Session — ${state.agentName}${state.agentId ? ` (${state.agentId})` : ''}

Run id: \`${state.runId}\`
Trigger: ${state.triggerType}
Started: ${new Date().toISOString()}

## Current task

${state.taskPrompt ?? ''}

## Progress / findings

<!-- Update this as the run progresses. Cleared on the next run. -->
`,
      'utf8',
    );
  } catch (e) {
    console.warn(`[agent.manifest] Failed to write run state for ${state.agentId}:`, e);
  }
};

// ── Shared registry ────────────────────────────────────────────────────────

export interface SharedMcpInfo {
  name: string;
  description: string;
  command?: string;
  args?: string[];
  url?: string;
  envKeys: string[];
  stock: boolean;
}

export interface SharedEnvVar {
  name: string;
  description: string;
  usedBy: string[];
}

export interface CommonRegistryPaths {
  dir: string;
  mcpFile: string;
  envFile: string;
  readmeFile: string;
}

/**
 * Regenerate the shared `.smoke-common/` registry (MCP + env) that every agent
 * can READ for discovery. The registry is app-managed and regenerated from the
 * catalog on every run; agents never write here — they configure only their own
 * `.smoke-agent` files. Env values are `$VAR_NAME` placeholders — never secrets.
 */
export const writeCommonAgentRegistry = (
  commonRoot: string,
  mcps: SharedMcpInfo[],
  env: SharedEnvVar[],
): CommonRegistryPaths => {
  const mcpFile = path.join(commonRoot, 'mcp.json');
  const envFile = path.join(commonRoot, 'env.json');
  const readmeFile = path.join(commonRoot, 'README.md');

  try {
    fs.mkdirSync(commonRoot, { recursive: true });

    const catalog = mcps.map((m) => ({
      key: m.name.toLowerCase().replace(/[^a-z0-9_-]+/g, '-'),
      name: m.name,
      description: m.description,
      command: m.command,
      args: m.args,
      url: m.url,
      required_env: m.envKeys.length > 0 ? m.envKeys : undefined,
      stock: m.stock,
      enabled: true,
      source: 'canvas' as const,
    }));

    writeJson(mcpFile, {
      note:
        'SHARED MCP registry (read-only). Listing of MCP servers available across the app, maintained by Smoke Monkey Canvas each run. Agents configure their own servers in their private .smoke-agent/mcp/mcp.json, not here.',
      updated_at: new Date().toISOString(),
      mcp_servers: Object.fromEntries(catalog.map((e) => [e.key, e])),
    });

    const envMap: Record<string, { use: string; description: string; used_by: string[] }> = {};
    for (const v of env) {
      envMap[v.name] = { use: `\$${v.name}`, description: v.description, used_by: v.usedBy };
    }

    writeJson(envFile, {
      note:
        'SHARED environment variables registry (read-only). `use` is a placeholder — real values live in the app settings and are injected at spawn. NEVER store real secrets here.',
      updated_at: new Date().toISOString(),
      variables: envMap,
    });

    writeIfMissing(readmeFile, COMMON_README_TEMPLATE);
  } catch (e) {
    console.warn(`[agent.manifest] Failed to write shared registry ${commonRoot}:`, e);
  }

  return { dir: commonRoot, mcpFile, envFile, readmeFile };
};

// ── Prompt block ───────────────────────────────────────────────────────────

const memoryListBlock = (ws: AgentWorkspace) =>
  MEMORY_FILES.map((m) => `* \`${ws.memoryFiles[m.file]}\` — ${m.purpose}`).join('\n');

/**
 * Prompt block naming this agent's own workspace, memory files, and the shared
 * registry. Absolute and agent-specific, so the instruction is always correct
 * for the agent being run.
 */
export const workspacePrompt = (
  ws: AgentWorkspace,
  common: CommonRegistryPaths,
  agentId: string,
) => `## YOUR AGENT WORKSPACE (private persistent memory, data & configuration)
You have a private persistent workspace that belongs only to you. These paths are unique to your agent id (\`${agentId}\`) and are safe to read and write with your file tools (\`read_file\`, \`write_file\`, \`edit_file\`, \`list_directory\`, ...).

Your agent workspace root: "${ws.dir.replace(/\/?$/, '')}"

### Agent memory (ten human-like memory dimensions)
Persistent agent memory is stored in "${ws.memoryDir.replace(/\/?$/, '')}" as ten specialized markdown files:
${memoryListBlock(ws)}

Use the appropriate memory file instead of putting unrelated information into one file.

### Memory rules
1. Read relevant memory BEFORE starting a task when it can improve the result.
2. Update memory when you learn information that is likely to remain useful across future runs.
3. Do not store temporary reasoning, unnecessary conversation content, or duplicate information.
4. Prefer concise, structured entries over large transcripts.
5. Treat \`facts.md\` as verified information. Do not promote guesses or assumptions into facts.
6. Keep \`working.md\` focused on the current task and clean or replace stale content when appropriate.
7. Use \`prospective.md\` for scheduled follow-ups, deferred tasks, and future trigger conditions ("when X happens, do Y").
8. Use \`reflective.md\` for meta-cognition, self-critique, and capturing lessons from mistakes or near-misses.
9. Use \`associative.md\` for dependency linkages and mental models of systems and entities.
10. Use \`identity.md\` for your evolving persona, voice nuances, and role boundaries.
11. When information becomes obsolete, update or remove it rather than continuously appending to the file.
12. Do not expose internal memory files to the user unless the user asks for their contents.

### Base system prompt & instructions
Your active base system prompt is mirrored at "${ws.systemPromptFile}". You can inspect and update your instructions with \`read_file\`, \`write_file\`, or \`edit_file\`; changes are synced to your system configuration automatically.

### Skills
Agent skills are managed through "${ws.skillsFile}". Use the Smoke Monkey skill/manifest system to discover and use skills. Do not manually invent or modify skill configuration unless the task requires it. Long skill bodies live next to it under "${ws.skillsDir}".

### MCP
MCP configuration for this agent is at "${ws.mcpFile}". Use the configured MCP servers and tools when they are available and appropriate for the task. Do not store MCP credentials, API keys, access tokens, passwords, or other secrets in memory files.

### Policies
Your enforced operating boundaries are compiled from the app policy list into "${ws.policiesFile}". Entries with source "canvas" or "user" belong to the app/user — never modify or remove them. You may add your own boundary by appending an entry with source "agent"; it is preserved across runs and injected into your system prompt on every future run.

### Shared MCP & environment registry (read-only, shared by ALL agents)
Every agent shares one common registry for DISCOVERY only. Read these to see MCP servers and environment variables available across the app:
- Shared MCP registry: "${common.mcpFile}"
- Shared environment variables: "${common.envFile}"

This registry is maintained by the app and is READ-ONLY for you — never write to it. Real environment values are \`$VAR_NAME\` placeholders; the runner injects actual values when a server spawns. To add a plugin, MCP server, or skill, add it to YOUR OWN files described above (\`${ws.mcpFile}\`, \`${ws.skillsFile}\`) with "source": "agent". That affects only your own operation; it does not change what other agents use.

### Temporary scripts
Use "${ws.scriptsDir}" for temporary scripts, generated helper programs, experiments, and one-off execution files. Treat them as temporary unless they are intentionally promoted into the project source or a reusable skill. Clean up unnecessary temporary scripts after completing the task. Reusable automation NEVER belongs here or in the workspace root — it goes to "${ws.automationDir}" with its index.json entry (see the self-learning section below).

### Runtime state
Agent runtime/checkpoint information is stored under "${ws.stateDir}" (\`runtime.json\`, \`checkpoints.json\`). Runtime state is implementation data, not long-term semantic memory.

### Generated assets (Excel, images, scripts — your output storage)
Everything you GENERATE as a deliverable — Excel spreadsheets, data exports, images, charts, and diagrams — MUST be written under "${ws.artifactsDir}" and only there:
- Spreadsheets & data exports (.xlsx, .csv, .tsv) → "${ws.assetsExcelDir}"
- Images, charts, diagrams (.png, .jpg, .svg) → "${ws.assetsImagesDir}"
- Reusable automation scripts you deliver/export → "${ws.assetsScriptsDir}"

Record every generated asset in the index "${ws.assetsIndexFile}". Never write generated output anywhere outside these folders. Temporary scratch programs/scripts still belong in "${ws.scriptsDir}".

### Self-learning & self-building — your automation folder
"${ws.automationDir}" is where you keep scripts you build for tasks you have already solved, so future runs reuse them instead of re-solving the same problem. This is how you self-learn and build yourself up over time.

The loop — run it after every SUCCESSFUL run:
1. Notice repetition — "I will be asked this again" (scheduled reports, recurring checks, data pulls, cleanups, CI triage, ...).
2. Build the script end-to-end — parameterized (inputs as arguments/config), a one-line header comment, no hard-coded secrets (\`$VAR\` placeholders only).
3. Save it in "${ws.automationDir}" with \`write_file\` and a descriptive filename.
4. Register it in "${ws.automationIndexFile}" (under \`"automations"\`) with \`file\`, \`purpose\`, and \`whenToUse\` — the exact instruction a future run needs to decide when to reach for it — plus \`created\`/\`updated\` timestamps.
5. Link it to cron-based work — if this automation should run on a schedule, record a standard 5-field \`cron\` expression in its index entry and tell the user to enable your cron schedule in the agent settings. Scheduled (cron) runs see your automation library first in their system prompt.
6. Improve yourself, don't rebuild — before solving a task that matches an entry's \`whenToUse\`, read the script and run it. If it fails or you find a better way, fix the script, bump \`updated\`, append what changed to \`notes\`, and write the lesson into your memory files (\`memory/procedural.md\` for how to do it, \`memory/episodic.md\` for what happened). Never rewrite a working script from scratch, and never leave an entry indexed whose script is deleted or known-broken — fix or remove it in the same run.

Completeness rule: a run that automated a repetitive task is NOT finished until BOTH are true — the script lives in "${ws.automationDir}" (not the workspace root, not scripts/, not artifacts/) AND its entry exists in "${ws.automationIndexFile}" with \`whenToUse\`. Saving the script alone does not count: registration is part of saving, because an unregistered script is invisible to the library listing and the next run will rebuild it from scratch.

Your automation library (with every entry's \`whenToUse\` and \`cron\` link) is injected into your system prompt on every run.

### Workspace boundary
This directory is your private persistent agent workspace: memory, configuration, skills, MCP metadata, temporary scripts, runtime state, and temporary artifacts. Do not confuse it with the user's project source code — the user's project files remain outside this folder and are modified only when the task requires it. When you need persistent knowledge about the user, project, environment, preferences, or previous work, use the appropriate memory file instead of relying only on the current conversation.

### Sensitive data
Never intentionally store secrets or sensitive credentials in memory files. Do not store passwords, API keys, access tokens, private keys, session cookies, authentication credentials, database passwords, OAuth secrets, or other credentials in "${ws.memoryDir}", "${ws.contextDir}", "${ws.logsDir}", or any other persistent file. If you encounter sensitive information, use it only when necessary for the current operation and prefer the app's secure credential mechanism (settings/env injection) over copying secrets into files. Reference secret values as \`$VAR_NAME\` placeholders only.`;

/** Live inventory of the agent's reusable automation scripts, injected into its
 * system prompt every run so saved scripts are reused instead of rewritten. */
export const scriptLibraryBlock = (ws: AgentWorkspace): string => {
  let files: string[] = [];
  try {
    if (fs.existsSync(ws.assetsScriptsDir)) {
      files = fs
        .readdirSync(ws.assetsScriptsDir, { withFileTypes: true })
        .filter((e) => e.isFile() && e.name !== 'README.md' && !e.name.startsWith('.'))
        .map((e) => path.join(ws.assetsScriptsDir, e.name))
        .sort();
    }
  } catch (e) {
    console.warn('[agent.manifest] Failed to list agent script library:', e);
  }
  const list =
    files.length > 0
      ? files.map((f) => `- ${f}`).join('\n')
      : '- (none yet — save your first reusable automation script after a successful scripted run)';
  return `## YOUR SAVED & EXPORTED SCRIPTS (reuse, do not rewrite)
Scripts you exported for the user to "${ws.assetsScriptsDir}" are listed here every run so you reuse them instead of re-solving tasks you have already automated. For a task you have automated before, inspect the relevant script FIRST (\`read_file\`), then run it.
${list}

After a successful run where you produced a script as a DELIVERABLE for the user, save it here with \`write_file\` and record it in "${ws.assetsIndexFile}". For your own reusable automation of repetitive tasks — including scheduled/cron work — save the script to the automation folder and register it there (see YOUR AUTOMATION LIBRARY below) instead.`;
};

/** One registered self-built automation (as stored in automation/index.json). */
export interface AutomationEntry {
  file?: string;
  purpose?: string;
  /** The instruction telling future runs WHEN to reach for this script. */
  whenToUse?: string;
  /** Optional standard 5-field cron expression linking the script to scheduled work. */
  cron?: string;
  created?: string;
  updated?: string;
  notes?: string;
}

/** Live inventory of the agent's self-built automation library, injected into
 * its system prompt every run with each entry's "when to use" and cron link. */
export const automationLibraryBlock = (ws: AgentWorkspace): string => {
  let entries: AutomationEntry[] = [];
  try {
    if (fs.existsSync(ws.automationIndexFile)) {
      const data = JSON.parse(fs.readFileSync(ws.automationIndexFile, 'utf8')) as {
        automations?: unknown;
      };
      if (Array.isArray(data.automations)) entries = data.automations as AutomationEntry[];
    }
  } catch (e) {
    console.warn('[agent.manifest] Failed to read automation index:', e);
  }
  // Scripts sitting in the workspace root instead of the automation folder —
  // unregistered strays the agent must move + register instead of rebuilding.
  let strays: string[] = [];
  try {
    strays = fs
      .readdirSync(ws.dir, { withFileTypes: true })
      .filter((e) => e.isFile() && /\.(sh|py|ps1|js|mjs|rb|pl)$/.test(e.name))
      .map((e) => path.join(ws.dir, e.name))
      .sort();
  } catch {
    // Workspace unreadable — skip the stray scan.
  }
  const strayBlock =
    strays.length > 0
      ? `\n\nUnregistered scripts found in your workspace root — move each into "${ws.automationDir}" and add its index.json entry (file, purpose, whenToUse, cron) NOW. Do not rebuild what is already written:\n${strays.map((s) => `- ${s}`).join('\n')}`
      : '';
  const list =
    entries.length > 0
      ? entries
          .map((e) => {
            const file = e.file ? path.join(ws.automationDir, e.file) : '(entry missing "file")';
            const parts = [`- ${file}`];
            if (e.purpose) parts.push(`  purpose: ${e.purpose}`);
            if (e.whenToUse) parts.push(`  when to use: ${e.whenToUse}`);
            if (e.cron) parts.push(`  cron: ${e.cron} (scheduled work)`);
            if (e.updated) parts.push(`  updated: ${e.updated}`);
            if (e.notes) parts.push(`  notes: ${e.notes}`);
            return parts.join('\n');
          })
          .join('\n')
      : '- (none yet — after your next successful repetitive task, save a script to the automation folder and register it in index.json)';
  return `## YOUR AUTOMATION LIBRARY (self-built — reuse, improve, do not rewrite)
Scripts you built for tasks you already solved, each with the instruction for when to use it. For any task matching an entry's "when to use": inspect the script FIRST (\`read_file\`), run it (\`run_command\`), and only solve it manually if the script fails. Scheduled (cron) runs must start from this library.
${list}${strayBlock}

After a successful run of a repetitive task: save the script to "${ws.automationDir}" and register \`file\` + \`whenToUse\` (and \`cron\` if it is scheduled work) in "${ws.automationIndexFile}". After improving an existing script: update its entry (\`updated\`, \`notes\`) and record the lesson in your memory files. Registration is part of saving — a run that saved a reusable script WITHOUT its index.json entry is incomplete, because the next run cannot find it here and will rebuild it.`;
};

/**
 * Live listing of the agent's self-built automations (index.json + any stray scripts).
 */
export const readAgentAutomations = (ws: AgentWorkspace): AutomationEntry[] => {
  const result: AutomationEntry[] = [];
  const indexedFiles = new Set<string>();

  try {
    if (fs.existsSync(ws.automationIndexFile)) {
      const data = JSON.parse(fs.readFileSync(ws.automationIndexFile, 'utf8')) as {
        automations?: unknown;
      };
      if (Array.isArray(data.automations)) {
        for (const item of data.automations as AutomationEntry[]) {
          if (item && typeof item === 'object') {
            result.push(item);
            if (item.file) indexedFiles.add(item.file);
          }
        }
      }
    }
  } catch {}

  // Scan automation directory for any unindexed script files
  try {
    if (fs.existsSync(ws.automationDir)) {
      const entries = fs.readdirSync(ws.automationDir, { withFileTypes: true });
      for (const ent of entries) {
        if (ent.isFile() && ent.name !== 'README.md' && ent.name !== 'index.json' && !ent.name.startsWith('.')) {
          if (!indexedFiles.has(ent.name)) {
            let birthtime = new Date().toISOString();
            let mtime = new Date().toISOString();
            try {
              const st = fs.statSync(path.join(ws.automationDir, ent.name));
              birthtime = st.birthtime.toISOString();
              mtime = st.mtime.toISOString();
            } catch {}
            result.push({
              file: ent.name,
              purpose: 'Self-built automation script in workspace',
              whenToUse: `Run \`${ent.name}\` when this workflow is requested`,
              created: birthtime,
              updated: mtime,
            });
          }
        }
      }
    }
  } catch {}

  return result;
};

export interface AgentMemorySummary {
  file: string;
  name: string;
  category: string;
  purpose: string;
  path: string;
  exists: boolean;
  sizeBytes: number;
  updatedAt: string | null;
  snippet: string;
}

/**
 * Summarize all ten human-like memory files for UI display and status.
 */
export const readAgentMemorySummaries = (ws: AgentWorkspace): AgentMemorySummary[] => {
  return MEMORY_FILES.map((m) => {
    const filePath = ws.memoryFiles[m.file];
    let exists = false;
    let sizeBytes = 0;
    let updatedAt: string | null = null;
    let snippet = '';

    try {
      if (fs.existsSync(filePath)) {
        exists = true;
        const stat = fs.statSync(filePath);
        sizeBytes = stat.size;
        updatedAt = stat.mtime.toISOString();
        const content = fs.readFileSync(filePath, 'utf8');
        snippet = content.slice(0, 300);
      }
    } catch {}

    return {
      file: m.file,
      name: m.name,
      category: m.category,
      purpose: m.purpose,
      path: filePath,
      exists,
      sizeBytes,
      updatedAt,
      snippet,
    };
  });
};

export interface ReconcileRuntimeInput {
  agentId: string;
  ws: AgentWorkspace;
  db: {
    getAgent: (id: string) => any;
    updateAgent: (id: string, patch: any) => any;
    getAgentSkills: (id: string) => any[];
    deleteAgentSkill: (id: string) => void;
    getAgentMcps: (id: string) => any[];
    deleteAgentMcp: (id: string) => void;
  };
  wsServer?: {
    broadcast: (msg: any) => void;
  };
}

/**
 * Reconcile runtime changes made by the agent to its private workspace
 * (system prompt updates, MCP unlinking/linking, skill edits, automation scripts)
 * and broadcast real-time events to the UI so everything stays in sync without page refresh.
 */
export const reconcileAgentWorkspaceRuntime = (input: ReconcileRuntimeInput) => {
  const { agentId, ws, db, wsServer } = input;
  const agent = db.getAgent(agentId);
  if (!agent) return null;

  let hasChanges = false;
  let updatedSystemPrompt = agent.system_prompt;

  // 1. Check system_prompt.md: if modified by the agent at runtime, sync to DB
  try {
    if (fs.existsSync(ws.systemPromptFile)) {
      const filePrompt = fs.readFileSync(ws.systemPromptFile, 'utf8').trim();
      if (filePrompt && filePrompt !== agent.system_prompt) {
        db.updateAgent(agentId, { system_prompt: filePrompt });
        updatedSystemPrompt = filePrompt;
        hasChanges = true;
      }
    }
  } catch (err) {
    console.warn(`[agent.manifest] Could not sync system_prompt.md for ${agentId}:`, err);
  }

  // 2. Check MCP and skill removals from manifest files
  const beforeMcps = db.getAgentMcps(agentId);
  const beforeSkills = db.getAgentSkills(agentId);
  const reconciled = reconcileManifestRemovals({
    ws,
    skills: beforeSkills,
    mcps: beforeMcps,
    removeSkill: (rowId) => db.deleteAgentSkill(rowId),
    removeMcp: (rowId) => db.deleteAgentMcp(rowId),
  });

  if (reconciled.mcps.length !== beforeMcps.length || reconciled.skills.length !== beforeSkills.length) {
    hasChanges = true;
  }

  // 3. Broadcast real-time events to the UI
  if (hasChanges && wsServer) {
    const updatedAgent = db.getAgent(agentId);
    wsServer.broadcast({
      type: 'agent_updated',
      agentId,
      data: updatedAgent,
    });
    wsServer.broadcast({
      type: 'agent_manifest_updated',
      agentId,
      data: {
        agent_id: agentId,
        system_prompt: updatedSystemPrompt,
        updated_at: new Date().toISOString(),
      },
    });
    wsServer.broadcast({
      type: 'agent_files_updated',
      agentId,
      data: { timestamp: new Date().toISOString() },
    });
  }

  return { hasChanges, updatedSystemPrompt };
};