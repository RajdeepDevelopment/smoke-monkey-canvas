# Smoke Monkey Canvas — Custom Tool Creation Guide

> Team note. Written for other agents that need to add / modify / debug custom tools
> in the `smoke-monkey-canvas` repo. Covers the full backend → frontend flow, the
> reference dummy implementation, the tests that prove it works, and the gotchas.

## 1. What Smoke Monkey Canvas is

`smoke-monkey-canvas` is a visual multi-agent workspace ("canvas") that runs agents
built on the `smoke-monkey-harness` library. A single Express server (`server/`)
drives the agents, and a React/Vite frontend (`web/`) renders the canvas, agent
drawers, tool controls, MCP attachments and skills. The server also ships a WebSocket
layer that streams live agent events (`tool.started`, `text.delta`, …) to the UI.

Key packages:
- `smoke-monkey-harness@1.3.1` — the agent loop, tool registry, MCP client, skills.
  Source of truth is `node_modules/smoke-monkey-harness/dist/*`.
- `@smoke-monkey/ui` — UI primitives.
- `tsx` — the server is TS executed directly (`npm run dev`). No compile step.
  ⚠️ This means **code changes are only picked up when the server process restarts**.

## 2. Repository layout (relevant parts)

```
server/
  app.server.ts                 Express bootstrap, mounts routers, static web/dist
  features/agent/
    agent.runner.ts             AgentRunner — builds + runs harness agents (runAgent)
    agent.custom-tools.ts       ⭐ NEW — canvas-owned custom ToolDefinitions (dummy: canvas_ping)
    agent.server.ts             REST API for agents (create/update/delete/list/run)
    agent.manifest.ts           Writes per-agent system-prompt manifests (MCP/skills/policies)
    agent.prompt.ts             buildSubPrompts -> merged into harness subSystemPrompt
    agent.db.ts                 SQLite CRUD (agents, runs, chat_messages)
    agent.types.ts              AgentRecord, RunRecord, parsePolicies
  features/core/
    ws.server.ts                CoreWsServer (WebSocket broadcast)
  features/mcp/                 Stock MCP catalog + server management
  features/skill/               Skill storage + API
web/src/
  features/agent/
    agent.drawer.tsx            Right-hand agent drawer (chat stream, live events, terminal)
    agent.service.ts            Frontend API/WS client
    agent.types.ts              SpaceAgentEntity etc.
  features/common/
    tools-and-policies.ts       ⭐ BUILTIN_TOOLS list (drives Tools modal) + STOCK_POLICIES
  features/tools/
    tools.modal.tsx             "Agent Tool Access Controls" modal (enable/disable per agent)
  features/space/…              Canvas/nodes/edges
```

## 3. The custom tool flow (end to end)

A custom tool needs a change in **three layers**:

| Layer | File(s) | What you change |
| --- | --- | --- |
| 1. Tool definition (backend) | `server/features/agent/agent.custom-tools.ts` (new/modify) | A `ToolDefinition`: `name`, `description`, `inputSchema`, `annotations?`, `presentation?`, `execute()` |
| 2. Registration into agents (backend) | `server/features/agent/agent.runner.ts` | Call `harnessAgent.registerTool(tool)` after `createAgent(...)` for every canvas tool |
| 3. Tool list + UI (frontend) | `web/src/features/common/tools-and-policies.ts` (+ `tools.modal.tsx` if needed) | Add an entry to `BUILTIN_TOOLS` so the name appears in the Tools modal |

Optional/recommended (4th layer): forward `presentation` in the WS events so the UI
can render a custom tool's icon/label. See the runner's `tool.started` /
`tool.completed` broadcast.

### 3.1 ToolDefinition contract (from harness)

Shape (see `node_modules/smoke-monkey-harness/dist/tools/tool-registry.d.ts`):

```ts
interface ToolDefinition {
  name: string;                    // unique, snake_case — model sees this
  description: string;             // model sees this; be explicit about when to use
  inputSchema: Record<string, unknown>;  // JSON Schema (type: 'object', properties, required)
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean };
  presentation?: {                 // PURELY for the UI; the model never sees it
    icon?: string;                 // emoji glyph (wins over family)
    label?: string;                // human label
    family?: 'inspect'|'edit'|'run'|'verify'|'git'|'plan'|'ask';
    tone?: 'default'|'primary'|'success'|'warning'|'destructive';
  };
  execute(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult | { content: ToolContent[]; isError?: boolean }>;
}

interface ToolResult {
  success?: boolean;
  output?: string;       // full payload for the LLM (kept compact)
  summary?: string;      // one-line human/LLM summary
  data?: unknown;        // structured payload for UI, NOT sent to the model verbatim
  content?: ToolContent[];  // [{ type: 'text', text }]
  artifact?: { path: string };
  metadata?: Record<string, unknown>;
  isError?: boolean;
}

interface ToolContext {
  sessionId; runId; workspaceDir; workspacePath; userId; abortSignal; toolCallId?; ...
}
```

### 3.2 CRITICAL gotcha — return `content`, not `output`, in a ToolDefinition

The harness converts a `ToolDefinition` into an internal `AgentTool` via
`definitionToAgentTool()` (`tool-registry.js`). **It only reads `content` for the
LLM-facing text and drops the `output` field of a custom definition.** So a custom
`execute()` must return:

```ts
return {
  success: true,
  summary: "one-line summary",
  content: [{ type: 'text', text: JSON.stringify(payload) }],  // this is what the model sees
  data: payload,   // optional structured data for the UI
};
```

Returning `output: '...'` without `content` produces `"(no output)"` to the model —
this bit the first implementation attempt.

### 3.3 Registration — declarative vs dynamic

`createAgent({ tools })` accepts `(ToolGroupName | 'all')[] | ToolDefinition[]`, but
the **public TS type forbids a mixed array** (union of arrays), even though the runtime
supports it. The documented dynamic path is used instead:

```ts
const agent = createAgent({ provider, model, apiKey, workspacePath, ... }); // all built-ins loaded
for (const tool of CUSTOM_AGENT_TOOLS) agent.registerTool(tool);            // + canvas tools
```

`registerTool()` registers into the **same registry instance** the loop resolves
tools from, so calling it before `agent.run()` works. Do NOT register during a run
(a tool added after the loop has started is only visible on later turns).

### 3.4 How custom tools reach the model

- `harness.js` builds the run context via `createRunContext()`, which seeds an
  `exposedTools` set with the built-in groups for the current task **plus every
  registered tool not covered by the built-ins** (`withCustomTools(...)` →
  `customToolNames(registry)`). Verified: custom tools are exposed from the first step.
- Each turn `resolveToolDefinitions(registry, exposedTools, phase, mcpRuntime, …)`
  produces the LLM tool list (`tool-library.js`), so the model is told `canvas_ping`
  exists and may call it.
- If the model calls a tool that is NOT in `exposedTools`, the harness rejects the
  call as "unexposed" (`agent-loop.js` line ~624).

⚠️ Task gating: for a read-only "check" task the harness exposes a **read-only subset**
of built-ins (filesystem/read, terminal, search, agent). This is expected. Custom
tools are always added on top via `withCustomTools`, so they appear regardless.

### 3.5 Presentation reaches the UI

The loop reads `toolRegistry.getPresentation(toolName)` and attaches it to the
`tool.started` / `tool.completed` events (`agent-event.emitter.js`). The canvas
runner forwards `e.data.presentation` into the WS `run_event` payload AND the
`chat_stream_event`. The frontend then renders the emoji/label from the event —
no second registry needed. `getToolPresentations()` can also be sent proactively
on connect for replay.

## 4. Reference dummy implementation (done + working)

`server/features/agent/agent.custom-tools.ts`:

```ts
import type { ToolDefinition } from 'smoke-monkey-harness';

export const CUSTOM_AGENT_TOOLS: ToolDefinition[] = [
  {
    name: 'canvas_ping',
    description: 'Dummy canvas custom tool. Returns a greeting, the current server time, and the active workspace path. Use it to confirm that custom tools are wired end-to-end.',
    inputSchema: {
      type: 'object',
      properties: { message: { type: 'string', description: 'Optional message to echo back to the caller.' } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false },
    presentation: { icon: '🏓', label: 'Canvas Ping', family: 'inspect', tone: 'success' },
    async execute(input, ctx) {
      const message = typeof input.message === 'string' && input.message.length > 0 ? input.message : 'pong';
      const payload = { ok: true, message, time: new Date().toISOString(), workspace: ctx.workspacePath };
      return {
        success: true,
        summary: `canvas_ping → ${message}`,
        content: [{ type: 'text', text: JSON.stringify(payload) }],
        data: payload,
      };
    },
  },
];

export const CUSTOM_AGENT_TOOL_NAMES = CUSTOM_AGENT_TOOLS.map((t) => t.name);
```

Wiring in `server/features/agent/agent.runner.ts` (inside `runAgent`, right after `createAgent`):

```ts
import { CUSTOM_AGENT_TOOLS } from './agent.custom-tools.js';
...
const harnessAgent = createAgent({ ... });   // line ~719 — unchanged otherwise
// canvas-owned custom tools on top of the built-in groups
for (const tool of CUSTOM_AGENT_TOOLS) harnessAgent.registerTool(tool);
runContext.harness = harnessAgent;
```

Presentation passthrough in the same file (broadcast + chatEvent for `tool.started`/`tool.completed`):

```ts
presentation: e.data.presentation,
```

Frontend entry in `web/src/features/common/tools-and-policies.ts`:

```ts
// Canvas custom tools
{ name: 'canvas_ping', label: 'Canvas Ping (Custom)', category: 'Agent',
  description: 'Dummy canvas-owned custom tool — verifies custom tool wiring end-to-end' },
```

(`tools.modal.tsx` shows this in the "Agent Tool Access Controls" modal; disabling it
writes to `agent.disabled_tools`, which the runner turns into a permission denial.)

## 5. Files touched by the reference implementation

```
M server/features/agent/agent.runner.ts            import + registerTool loop + presentation forwarding
A server/features/agent/agent.custom-tools.ts      the dummy tool (new)
A tests/test-custom-tool.ts                        registry-level operation test (new)
A tests/test-custom-tool-agent.ts                  agent-API end-to-end test vs mock LLM (new)
M web/src/features/common/tools-and-policies.ts    BUILTIN_TOOLS + canvas_ping entry
M web/src/features/tools/tools.modal.tsx           tooltip text "Enable all tools" (cosmetic)
```

## 6. How to verify a custom tool (the tests + commands)

Prereqs: repo deps installed. No provider key needed (tests use a mock LLM).

### 6.1 Registry/operation test — `tests/test-custom-tool.ts`

Mirrors the runner: `buildToolRegistry()` (default built-ins) + `register()` each
canvas tool, then asserts registration, built-ins preserved, presentation present,
and `execute()` output. Run:

```bash
npx tsx tests/test-custom-tool.ts
```

Expected (all PASS): custom tool registered / built-ins preserved / presentation
exposed to UI / execute succeeded / echoed message / workspace path returned.
Logs `total tools registered: 21` (20 built-ins + canvas_ping).

### 6.2 Agent-API end-to-end test — `tests/test-custom-tool-agent.ts` (strongest proof)

Starts a mock OpenAI/Ollama-compatible HTTP server, creates a REAL harness agent
via `createAgent({ provider: 'ollama', model: 'mock-model', ... })`, registers the
custom tool, sets `process.env.LLM_BASE_URL` to the mock, and runs
`agent.run('<prompt>')`. The mock only ever calls `canvas_ping`; if the tool were not
exposed the run would fail the exposure gate. Then the mock calls `finish_task` to
end the run cleanly. Assertions:

- the `tools` array handed to the model on turn 1 includes `canvas_ping`
- the agent actually invoked `canvas_ping`
- `tool.started` carried `presentation.icon`
- the tool completed `success: true` with our payload
- `result.status === 'completed'`

```bash
npx tsx tests/test-custom-tool-agent.ts
```

Expected: `LLM was told about canvas_ping / agent actually called canvas_ping /
tool.started carried the presentation / tool completed successfully / run finished completed`
→ all PASS.

### 6.3 Typecheck + build (gate before shipping)

```bash
npx tsc --noEmit -p tsconfig.json            # server TS
npm --prefix web run build                    # web TS (tsc -b) + vite build
npm --prefix web run lint                     # oxlint (pre-existing warnings in library-sidebar.tsx are unrelated)
```

### 6.4 Boot smoke test

```bash
PORT=3999 SMOKE_CANVAS_DB=/tmp/smoke-test.db npx tsx server/app.server.ts
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3999/    # 200
```

## 7. Gotchas / notes for other agents

1. **Restart the server.** `tsx` does not hot-reload. An agent run started before the
   change does NOT see new custom tools — the transcript symptom was the model running
   shell `ping` instead of `canvas_ping` because `canvas_ping` did not exist in the
   running process's registry.
2. **Return `content`, not `output`, from a custom `execute()`** (see 3.2).
3. **Task gating hides non-read-only built-ins** for read-only tasks — that is
   expected; custom tools are exempt (always exposed).
4. **`disabled_tools` filtering**: the runner gates via
   `permission: (req) => (disabledTools.includes(req.toolName) ? 'deny' : 'allow')`.
   A custom tool's name must be identical in backend + `BUILTIN_TOOLS` or the modal
   toggle won't map to the actual tool.
5. **Mixed `tools` array is unsupported by the TS type** — use `registerTool()`.
6. **Presentation is emoji/label data by design** (serializable); you cannot ship a
   React component across the WS boundary. Keep `icon` an emoji string.
7. `run_command` exists; prefer a real custom tool over shelling out for things the
   harness should own. The dummy `canvas_ping` is intentionally self-contained.
8. Env/keys: the runner resolves API keys from the DB settings (`coreDb.getSetting`)
   or `process.env.<PROVIDER>_API_KEY`. No key is needed for the mock tests.

## 8. Suggested future work

- Add a REST/WS capability that broadcasts `getToolPresentations()` on client connect
  so replayed history keeps custom icons.
- Consider a `tools` registry API (`/api/tools/custom`) so tools can be managed from the
  UI instead of code.
- Move `BUILTIN_TOOLS` to a single source shared between server and web (e.g. a
  `tools.catalog.ts` imported by both) to avoid drift.