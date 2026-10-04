# Contributing to Smoke Monkey Canvas

Thank you for your interest in contributing! Smoke Monkey Canvas is an open project and we welcome contributions of all kinds — bug fixes, new features, documentation improvements, and more.

Please take a few minutes to read this guide before opening a PR.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Commit Message Convention](#commit-message-convention)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)
- [License](#license)

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold it. Please report unacceptable behavior to **rajdeep@smokemonkey.dev**.

---

## Ways to Contribute

| Contribution Type | Where to Start |
|-------------------|---------------|
| 🐛 Bug fix | [Open an issue](.github/ISSUE_TEMPLATE/bug_report.md) → fork → PR |
| ✨ New feature | [Request first](.github/ISSUE_TEMPLATE/feature_request.md) to discuss scope |
| 📝 Documentation | Edit `.md` files directly, open a PR |
| 🔌 New MCP server | Add to `server/features/mcp/mcp.stock.ts` |
| 🧪 Tests | Add E2E or unit tests (see `test-e2e.ts`) |
| 🎨 UI improvements | Work in `web/src/` |

---

## Development Setup

### Prerequisites

- **Node.js ≥ 22.0.0** (required for `node:sqlite`)
- **npm** or **pnpm**
- An LLM API key (see README for supported providers)

### Steps

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_FORK/smoke-monkey-canvas.git
cd smoke-monkey-canvas

# 2. Install server dependencies
npm install

# 3. Install and build web client
npm --prefix web install
npm run build:web

# 4. Start the backend
npm start

# 5. (Optional) Start the frontend dev server for hot-reload
npm run dev:web
```

The backend runs at `http://localhost:3333` and the dev frontend at `http://localhost:5173`.

### TypeScript Type Checking

```bash
# Check server TypeScript (0 errors expected)
npx tsc --noEmit

# Check web TypeScript
cd web && npx tsc --noEmit
```

---

## Project Structure

```
smoke-monkey-canvas/
├── server/
│   ├── app.server.ts           # Main entry point
│   └── features/
│       ├── agent/              # Core agent system
│       │   ├── agent.server.ts     # REST routes
│       │   ├── agent.runner.ts     # Execution engine
│       │   ├── agent.db.ts         # Database queries
│       │   ├── agent.cron.ts       # Cron scheduler
│       │   └── agent.types.ts      # Type definitions
│       ├── core/
│       │   ├── database.db.ts      # SQLite bootstrap & migrations
│       │   └── ws.server.ts        # WebSocket server
│       ├── mcp/                # MCP server management
│       ├── settings/           # API key store
│       ├── skill/              # Skills library
│       └── space/              # Canvas layout
└── web/
    └── src/
        ├── features/
        │   ├── agent/          # Agent UI (drawer, chat, history)
        │   └── space/          # Canvas renderer
        └── store/              # Zustand state management
```

---

## Submitting a Pull Request

1. **Open an issue first** for non-trivial changes so we can discuss approach.
2. **Fork** the repository and create a branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   # or
   git checkout -b fix/my-bug
   ```
3. **Write code** and make sure TypeScript has 0 errors:
   ```bash
   npx tsc --noEmit
   ```
4. **Test your changes** manually by running the app.
5. **Commit** using [conventional commits](#commit-message-convention).
6. **Push** to your fork and open a PR against `main`.
7. Fill in the PR template completely.

### PR Checklist

- [ ] TypeScript: `npx tsc --noEmit` passes with 0 errors
- [ ] `npm run build:web` succeeds
- [ ] No `console.log` debug statements left in production code
- [ ] New REST routes use `getParam()` helper for `req.params`
- [ ] Database migrations are additive (no breaking column changes)
- [ ] PR description explains *what* and *why*

---

## Commit Message Convention

We use **Conventional Commits**:

```
<type>(<scope>): <short description>

[optional body]

[optional footer: Fixes #123]
```

**Types:**

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `chore` | Build process, tooling, dependencies |

**Examples:**

```
feat(agent): add multi-turn session persistence across restarts
fix(server): sanitize req.params to handle Express v5 string[] type
docs(readme): update quick start instructions for Node 22+
```

---

## Reporting Bugs

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md). Include:

- Node.js version (`node --version`)
- OS and version
- Steps to reproduce
- Expected vs actual behavior
- Relevant logs from the terminal

**Security vulnerabilities** should be reported privately via [SECURITY.md](SECURITY.md).

---

## Requesting Features

Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md). The best feature requests:

- Explain the problem being solved (not just the solution)
- Describe who would benefit
- Note any relevant prior art or alternatives considered

---

## License

By contributing, you agree that your contributions will be licensed under the same [Sustainable Use License (SUL)](LICENSE.md) as the project. If your contribution includes third-party code, ensure it is compatible.

---

*Thank you for helping make Smoke Monkey Canvas better!* 🐒
