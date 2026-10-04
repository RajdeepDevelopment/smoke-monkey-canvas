# Changelog

All notable changes to Smoke Monkey Canvas are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

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
