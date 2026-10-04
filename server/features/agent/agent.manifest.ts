import fs from 'node:fs';
import path from 'node:path';

/**
 * Per-agent configuration manifests.
 *
 * Every agent owns a hidden folder inside its workspace holding a declarative
 * record of the MCP servers and skills it runs with:
 *
 *   <workspace>/.smoke-agent/mcp.json
 *   <workspace>/.smoke-agent/skills.json
 *   <workspace>/.smoke-agent/README.md
 *
 * The runner regenerates these before every run and injects the absolute paths
 * into the agent's system prompt, so an agent can add a plugin or skill on
 * request by editing its own JSON. Because each agent has its own workspace, the
 * paths differ per agent id and are never shared.
 *
 * NOTE: `.smoke-agent` is deliberately NOT `.smoke` — the harness already owns
 * `<workspace>/.smoke/runs/<runId>/...` for its own artifacts.
 */
export const MANIFEST_DIR = '.smoke-agent';

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
  /** `canvas` entries are rewritten each run. `agent` entries are preserved. */
  source: 'canvas' | 'agent';
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
  source: 'canvas' | 'agent';
  attachment_id?: string;
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

/**
 * Merge freshly DB-derived entries with whatever already sits on disk.
 *
 * Canvas-managed entries are authoritative and refreshed. Anything the agent (or
 * the user) added by hand carries `"source": "agent"` and is preserved verbatim,
 * so a run never silently deletes a plugin the agent installed for itself.
 */
const mergeBySource = <T extends { source?: string; attachment_id?: string }>(
  preserved: T[],
  managed: T[],
): T[] => {
  const managedIds = new Set(managed.map((m) => m.attachment_id).filter(Boolean));
  const kept = preserved.filter(
    (p) => p.source !== 'canvas' && !(p.attachment_id && managedIds.has(p.attachment_id)),
  );
  return [...managed, ...kept];
};

const README_TEMPLATE = (agentId: string, agentName: string, dir: string) => `# Agent configuration — ${agentName}

Agent id: \`${agentId}\`
This folder: \`${dir}\`

These files are the agent's own toolbox. They are regenerated before every run
from the attachments configured in Smoke Monkey Canvas, then anything you add
here by hand is merged back in.

| File | Holds |
| --- | --- |
| \`mcp.json\` | MCP servers this agent can talk to |
| \`skills.json\` | Skills this agent has loaded |

## Adding an MCP server or skill

When a user asks you to add a plugin, MCP server, or skill:

1. Read the relevant JSON first — never assume what is installed.
2. Append the new entry using the schema below. **Do not rewrite the file.**
3. Set \`"source": "agent"\` on anything you add. Entries marked
   \`"source": "canvas"\` are owned by the app and will be refreshed on the next
   run, so edits to them will be lost.
4. Confirm to the user which file changed and paste the entry you added.

### MCP entry schema

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

### Skill entry schema

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

## When changes take effect

- **Skills** are read at the start of a run.
- **MCP servers** are spawned at the start of a run.

Either way, tell the user to re-run the agent (or wait for its next scheduled
run) if they want the change picked up immediately.
`;

export interface WriteManifestInput {
  agentId: string;
  agentName: string;
  workspace: string;
  mcpEntries: ManifestMcpEntry[];
  skillEntries: ManifestSkillEntry[];
}

export interface AgentManifest {
  dir: string;
  mcpFile: string;
  skillsFile: string;
  readmeFile: string;
}

/**
 * Write (and merge) the agent's manifest files. Never throws — a read-only or
 * missing workspace must not stop the run.
 */
export const writeAgentManifest = (input: WriteManifestInput): AgentManifest => {
  const dir = path.join(input.workspace, MANIFEST_DIR);
  const mcpFile = path.join(dir, 'mcp.json');
  const skillsFile = path.join(dir, 'skills.json');
  const readmeFile = path.join(dir, 'README.md');

  try {
    fs.mkdirSync(dir, { recursive: true });

    const prevMcp = readJson<{ mcp_servers?: ManifestMcpEntry[] | Record<string, ManifestMcpEntry> }>(mcpFile);
    const prevSkills = readJson<{ skills?: ManifestSkillEntry[] }>(skillsFile);

    // Older/hand-edited files may hold either an array or a keyed object.
    const prevMcpList = Array.isArray(prevMcp?.mcp_servers)
      ? prevMcp.mcp_servers
      : prevMcp?.mcp_servers
        ? Object.values(prevMcp.mcp_servers)
        : [];

    const mergedMcp = mergeBySource(prevMcpList, input.mcpEntries);
    const mergedSkills = mergeBySource(prevSkills?.skills ?? [], input.skillEntries);

    writeJson(mcpFile, {
      agent_id: input.agentId,
      agent_name: input.agentName,
      updated_at: new Date().toISOString(),
      note:
        'MCP servers for this agent. Entries with "source": "canvas" are managed by Smoke Monkey Canvas and refreshed each run. Add your own with "source": "agent" — see README.md.',
      mcp_servers: Object.fromEntries(mergedMcp.map((e) => [e.key, e])),
    });

    writeJson(skillsFile, {
      agent_id: input.agentId,
      agent_name: input.agentName,
      updated_at: new Date().toISOString(),
      note:
        'Skills for this agent. Entries with "source": "canvas" are managed by Smoke Monkey Canvas and refreshed each run. Add your own with "source": "agent" — see README.md.',
      skills: mergedSkills,
    });

    // Only write the README if the user has not customised it, so hand-written
    // guidance survives.
    if (!fs.existsSync(readmeFile)) {
      fs.writeFileSync(readmeFile, README_TEMPLATE(input.agentId, input.agentName, dir), 'utf8');
    }
  } catch (e) {
    console.warn(`[agent.manifest] Failed to write manifest for ${input.agentId}:`, e);
  }

  return { dir, mcpFile, skillsFile, readmeFile };
};

/**
 * Prompt block naming this agent's own config paths. Absolute and agent-specific,
 * so the instruction is always correct for the agent being run.
 */
export const manifestPrompt = (m: AgentManifest, agentId: string) => `## YOUR AGENT CONFIGURATION FOLDER (add plugins & skills here):
You keep your MCP servers and skills as JSON files in a private folder that belongs only to you. These paths are unique to your agent id (\`${agentId}\`) and are safe to read and write.

- Your agent folder: "${m.dir.replace(/\/?$/, '')}"
- MCP servers: "${m.mcpFile}"
- Skills: "${m.skillsFile}"
- How to add entries: "${m.readmeFile}"

When a user asks you to add, install, or configure a new plugin, MCP server, or skill:
1. Read the relevant JSON file FIRST to see what is already installed. Never guess.
2. Append a new entry to that file using the exact schema documented in "${m.readmeFile}". Do not rewrite or reorder existing entries.
3. Set "source": "agent" on anything you add yourself. Entries marked "source": "canvas" are owned by the app and get refreshed on every run, so edits to them will be overwritten.
4. Never write real secrets into these files. Reference environment variables as "$VAR_NAME" — the runner injects the real values when it starts a server.
5. After writing, tell the user exactly which file you changed and paste the entry you added.
6. Skills and MCP servers are loaded when a run starts, so mention that the change takes effect on the next run.`;