# Deploy and Host Smoke Monkey Canvas with Railway

Smoke Monkey Canvas is a visual, spatial workspace for running autonomous AI agents on an infinite drag-and-drop canvas. Deploy it on Railway to get a persistent, always-on agent workspace in minutes — no local machine, no `npm install`, and no cloud lock-in. Each agent gets its own system prompt, model provider, cron schedule, MCP server integrations, skills library, and persistent chat history.

## About Hosting Smoke Monkey Canvas

Smoke Monkey Canvas is a single Node.js service that serves the React web UI, a REST API under `/api`, and a WebSocket endpoint at `/ws` for live agent streaming. This template runs the official multi-architecture Docker image from Docker Hub and attaches a persistent Railway volume at `/app/data`, where a SQLite database stores your agents, chat sessions, canvas positions, and encrypted API keys.

Nothing else needs provisioning. There is no separate frontend build, no external cache, and no message queue — the cron scheduler and the WebSocket broadcast server both run inside the same process.

After deployment, open your generated Railway domain and add an API key for at least one model provider (NVIDIA, OpenAI, Anthropic, Gemini, Groq, DeepSeek, or OpenRouter). Keys entered in the UI are encrypted at rest in the SQLite database.

## Common Use Cases

- **A personal agent workspace that survives reboots** — keep every agent definition and conversation between sessions on infrastructure you control.
- **Scheduled autonomous agents** — attach cron expressions to agents so they run unattended, with execution history kept separate from interactive chats.
- **A shared canvas for a small team** — point a custom domain at the service and collaborate on the same spatial board.
- **MCP-connected research agents** — attach stdio or SSE Model Context Protocol servers (Firecrawl, GitHub, Tavily, …) per agent, optionally backed by PostgreSQL.

## Dependencies for Smoke Monkey Canvas Hosting

- **Node.js 22 runtime** — required by the container image for the built-in `node:sqlite` module.
- **Persistent volume** — 5 GB Railway volume mounted at `/app/data`.
- **Model provider API key** — at least one of `NVIDIA_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `DEEPSEEK_API_KEY`. Optional: keys can also be entered in the UI, where they are stored encrypted.

### Deployment Dependencies

- [Smoke Monkey Canvas on GitHub](https://github.com/RajdeepDevelopment/smoke-monkey-canvas) — source code, Dockerfile, and docker-compose stack
- [Smoke Monkey Canvas on Docker Hub](https://hub.docker.com/r/rajdeepsadhu/smoke-monkey-canvas) — the `rajdeepsadhu/smoke-monkey-canvas` image deployed by this template
- [Smoke Monkey Harness](https://github.com/RajdeepDevelopment/smoke-monkey-harness) — the AI agent runtime Canvas is built on
- [Railway volumes guide](https://docs.railway.com/volumes) — mount paths, sizing, and permissions

### Implementation Details

The service is declared in `.railway/railway.ts` using Railway's Infrastructure as Code API:

- **Source** — `rajdeepsadhu/smoke-monkey-canvas:latest`, a multi-architecture image (`linux/amd64`, `linux/arm64`) built and published by the project's CI pipeline. Railway redeploys unversioned tags on every deploy, so `latest` upgrades are a redeploy away.
- **Port** — the image listens on `process.env.PORT`, and Railway injects `PORT` automatically. No port variable is required.
- **Health check** — `GET /api/space` is used as the readiness endpoint.
- **Persistence** — the volume is mounted at `/app/data` and `SMOKE_CANVAS_DB` points at `/app/data/canvas.db`.
- **Permissions** — Railway mounts volumes as `root`, so `RAILWAY_RUN_UID=0` is set because the image runs as the non-root `node` user.
- **WebSockets** — Railway exempts WebSocket connections from its idle and duration limits, so the `/ws` agent stream stays open indefinitely, even while idle.

Smoke Monkey Canvas is released under the [Sustainable Use License](https://github.com/RajdeepDevelopment/smoke-monkey-canvas/blob/main/LICENSE.md). It is free for personal projects, research, and internal business tooling; it may not be offered as a commercial hosted service without a commercial license.

### Why Deploy Smoke Monkey Canvas on Railway?

Railway is a singular platform to deploy your infrastructure stack. Railway will host your infrastructure so you don't have to deal with configuration, while allowing you to vertically and horizontally scale it.

By deploying Smoke Monkey Canvas on Railway, you are one step closer to supporting a complete full-stack application with minimal burden. Host your servers, databases, AI agents, and more on Railway.