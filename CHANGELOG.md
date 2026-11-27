# Changelog

All notable changes to Smoke Monkey Canvas are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

---

## [1.4.1] — 2026-11-27

### Fixed

- **NPX / npm package startup crash (`ERR_MODULE_NOT_FOUND`)**: Removed `web/src/` from `.npmignore` and `src/` from `web/.npmignore` so `web/src/features/library/data/companies.data.ts`, `library.types.ts`, and `agent.templates.ts` (imported at runtime by `server/features/mcp-server/canvas-mcp.server.ts`) are shipped in the published npm tarball as declared in `package.json`. Previously, fresh `npx @smoke-monkey/canvas start` installs crashed immediately on boot before listening on port `3333`.

---

## [1.4.0] — 2026-11-21

A production-readiness pass covering security hardening and a batch of correctness/data-loss fixes. The server now requires authentication and no longer binds to every network interface by default — see **Breaking / behavior changes** below before upgrading an existing deployment.

### Security

- **Authentication required for `/api` and `/ws`.** Every route (other than a new `GET /api/health` liveness probe) now requires a per-install bearer token, generated on first boot and auto-bootstrapped for the local web UI/CLI/desktop. Set `SMOKE_MONKEY_AUTH_TOKEN` to pin an explicit token, or `SMOKE_MONKEY_DISABLE_AUTH=1` only if something else in front of the server already authenticates requests. See `SECURITY.md`.
- **Default bind changed to `127.0.0.1`**, not every interface. Container/VPS deploy targets set `HOST=0.0.0.0` explicitly, since their platform's proxy needs it.
- **CORS** now reflects only an allowlisted origin instead of `*`.
- Fixed a workspace path-containment bypass (`safeResolveWorkspacePath`) that let a sibling directory whose name merely started with the workspace root's name escape the sandbox; added symlink resolution.
- Fixed `POST /api/settings/keys` and the `canvas_set_api_key` agent tool accepting arbitrary key names and writing them into `process.env` (could set `PATH`, `NODE_OPTIONS`, etc.). `CoreDatabase.setSetting()` now also refuses a fixed list of dangerous OS-level variable names regardless of caller.
- Fixed Mermaid diagrams rendering with `securityLevel: 'loose'` (skipped its own sanitization) plus unsanitized SVG injection; now `strict` with an added independent DOMPurify pass.
- Fixed a path-traversal bug in `prepareGitWorkspace`: a `git_url` ending in `/..` could resolve outside `.smoke-repos`.
- Fixed a shared-global race in the canvas MCP tool bridge where concurrent agents in different spaces could read/write into the wrong space; replaced with per-call `AsyncLocalStorage` scoping.
- Fixed chat sessions not being scoped to their owning agent (one agent could read/append to/delete another agent's conversation via a known session id).

### Fixed

- Deleting a space with "delete workspace folders" checked could recursively delete a custom `working_dir` outside the app's own workspace root; now only ever deletes app-managed workspaces under `~/.smoke-agents/`. The checkbox also now defaults to unchecked.
- Deleted chat sessions could resurface with their old messages replayed to the model, due to a stale in-memory cache that was never cleared.
- `update_agent_profile` overwrote `identity.md` with a blank template on every call, discarding anything the agent had recorded there.
- Renaming an agent (or any role/description/specialty edit) could replace a hand-written system prompt with boilerplate if it had no `## ` section headings.
- Default cron jobs silently reverted a user's edits on every server restart or cron sync.
- Todo history never removed items a later `todo_write` call omitted, leaving phantom rows after a task was renamed or removed; `index.json`'s counters also inflated on every sync instead of being rebuilt.
- Nested agent delegation used a flat 4-minute timeout regardless of chain depth, and could kill a run the delegation didn't start; the timeout now scales with depth and no longer stops unrelated runs.
- Manual runs retried up to 10 times even for permanent errors (invalid API key, unknown model); these now fail immediately, while transient errors (network, 429, 5xx) still retry.
- Accepting an explore/company-build report twice could start two Architect agents building the same company.
- `smoke-monkey start` never actually opened the browser — a scheduled browser-open was silently cancelled by an immediately-following `process.exit()`. Browser opening across all CLI paths now waits for `/api/health` instead of guessing with a fixed delay.
- A hooks-order crash in 4 modal components (`agent.modal.tsx`, `policy.modal.tsx`, `settings.modal.tsx`, `tools.modal.tsx`) when closed after being lazily mounted. CI now runs the project's lint config so this class of regression fails the build.
- The space canvas's change-detection (`agentsEqual`) missed MCP/skill swaps, `latestRun` updates, and profile field changes, silently failing to re-render them.

### Breaking / behavior changes

- Existing deployments that relied on unauthenticated API access, or on reaching the server from another machine without setting `HOST=0.0.0.0`, will need to update their configuration. See `SECURITY.md` for the full list of new environment variables.

---

## [1.3.1] — 2026-10-04

### Added
- **Multi-turn Chat Sessions** — persistent `chat_sessions` and `chat_messages` tables in SQLite; conversations survive server restarts and page refreshes
- **Session-aware Memory Rehydration** — `AgentRunner.getOrCreateStore()` rehydrates prior turns from SQLite into the harness `MemoryStore` before each run
- **Cron Isolation** — cron-triggered runs execute in isolated `cron_<runId>` sessions and never pollute interactive user chat threads
- **History Tab Filters** — 3-way toggle in the History tab: `All` | `💬 Chats` | `⏰ Cron Jobs` with distinct visual badges
- **Real Assistant Reply Persistence** — extracts the actual last assistant message from `result.messages` instead of a hardcoded fallback string
- **`getParam()` Helper** — normalizes Express v5 `req.params` from `string | string[]` to `string` across all route handlers
- **Root `tsconfig.json`** — scoped to active server files for clean `npx tsc --noEmit` with 0 errors
- **New REST Endpoints** — `GET/POST /api/agents/:id/sessions`, `GET /:id/sessions/:sessionId/messages`, `DELETE /:id/sessions/:sessionId`
- **Agent Runs Filter** — `GET /api/agents/:id/runs?trigger_type=cron|manual`
- **`+ New Chat` Button** — creates a fresh isolated session per agent from the drawer header

### Fixed
- `Argument of type 'string | string[]' is not assignable to type 'string'` — 21 TypeScript errors in `agent.server.ts` (Express v5 `@types/express` regression)
- `Type 'string | string[]' is not assignable to type 'string | undefined'` — in `space.server.ts`
- `McpServerConfig` missing required `id` and `description` fields in agent runner
- `env` property typed as `Record<string, string | undefined>` — now strictly `Record<string, string>`
- `disabledTools` was passed as unknown `AgentOptions` key — now handled via `permission` callback and system prompt injection

### Changed
- `agent.db.ts` — `getAgentRuns()` now accepts optional `triggerType` filter parameter
- `agent.db.ts` — `createRun()` and `updateRun()` now persist `session_id`
- `agent.runner.ts` — `runAgent()` now accepts `sessionId` parameter for session routing

---

## [1.3.0] — 2026-09-28

### Added
- Feature-based server architecture (`server/features/`) replacing the flat `server/api.ts` layout
- `AgentRunner` singleton with `MemoryStore` per agent for in-process session continuity
- MCP server attachment UI with credential validation and `allowUnconfigured` flag
- Skills library with full-text skill content stored in SQLite
- Agent working directory configuration with auto-creation at `~/.smoke-agents/<name>-<id>`
- Memory limit (MB) configurable per agent with default 1024 MB
- WebSocket event streaming for `run_started`, `run_completed`, `run_event`, `agent_status`
- Cron scheduler with `calculateNextCronRun()` using `cron-parser`
- Space router for canvas node position persistence
- Settings router for API key management

### Changed
- Database path moved to `~/.smoke-monkey/canvas.db` (from project-local `smoke_canvas.db`)
- Frontend rebuilt with Vite + React (replaces legacy static HTML)

---

## [1.2.0] — 2026-09-15

### Added
- Initial multi-agent canvas with drag-and-drop node positioning
- Basic agent CRUD (create, read, update, delete)
- Manual trigger via chat input
- Provider switcher (NVIDIA, OpenAI, Anthropic, Gemini)
- Raw terminal tab for live log streaming

---

[Unreleased]: https://github.com/RajdeepDevelopment/smoke-monkey-canvas/compare/v1.3.1...HEAD
[1.3.1]: https://github.com/RajdeepDevelopment/smoke-monkey-canvas/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/RajdeepDevelopment/smoke-monkey-canvas/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/RajdeepDevelopment/smoke-monkey-canvas/releases/tag/v1.2.0
