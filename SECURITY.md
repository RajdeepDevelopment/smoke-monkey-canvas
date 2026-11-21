# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.3.x   | ✅ Active support |
| < 1.3   | ❌ No longer supported |

---

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities via public GitHub Issues.**

Instead, report vulnerabilities using one of the following private channels:

### Option 1: GitHub Private Security Advisory (Preferred)

1. Go to the repository on GitHub
2. Click **Security** → **Advisories** → **Report a vulnerability**
3. Fill in the form with as much detail as possible

### Option 2: Email

Send a detailed report to: **rajdeep@smokemonkey.dev**

Use the subject line: `[SECURITY] Smoke Monkey Canvas — <brief description>`

---

## What to Include

A good vulnerability report includes:

- **Description** — What is the vulnerability? What component is affected?
- **Impact** — What can an attacker do? What data or systems are at risk?
- **Steps to Reproduce** — Minimal steps or proof-of-concept code
- **Environment** — OS, Node.js version, Canvas version
- **Suggested Fix** — (Optional) If you have a proposed remediation

---

## Response Timeline

| Stage | Timeline |
|-------|----------|
| Acknowledgement | Within **48 hours** |
| Initial assessment | Within **7 days** |
| Fix timeline communicated | Within **14 days** |
| Patch released | Varies by severity |

We follow responsible disclosure: once a fix is shipped, we will publish a security advisory crediting the reporter (unless you prefer to remain anonymous).

---

## Security Considerations for Self-Hosted Deployments

Smoke Monkey Canvas is designed to run **locally** (on `localhost`). As of 1.3.3:

- The server binds to `127.0.0.1` by default (not every interface). Reaching it from another device requires explicitly setting `HOST=0.0.0.0` (the container/VPS deploy configs under `deploy/`, `Dockerfile`, `fly.toml`, `render.yaml`, `northflank.template.json`, and `.do/deploy.template.yaml` do this for you, since the platform's proxy needs it).
- CORS is restricted to an allowlist of known local origins (the app's own origin, the Vite/Tauri dev servers, and the packaged Tauri desktop app) instead of `*`. Add more with the comma-separated `SMOKE_MONKEY_ALLOWED_ORIGINS` env var.
- Every `/api/*` route (other than the `/api/health` liveness probe and the MCP OAuth callback) and the `/ws` WebSocket require a bearer token. The bundled web UI sends it in `X-Smoke-Monkey-Token`; API/CLI clients can use `Authorization: Bearer <token>`; the WebSocket uses `?token=`. A random per-install token is generated on first boot and persisted in the local SQLite database; the bundled web UI gets it automatically on `GET /api/auth/token`, which only answers requests that arrive from the local machine — a LAN or internet peer cannot use it to self-issue a token even if you've set `HOST=0.0.0.0`.
- Set `SMOKE_MONKEY_AUTH_TOKEN=<your-own-secret>` to pin the token explicitly (useful if you manage your own secret distribution), or `SMOKE_MONKEY_DISABLE_AUTH=1` to disable this layer entirely **only if** something else in front of the server already authenticates requests.

If you expose the server on a network or the public internet (`HOST=0.0.0.0`), be aware the per-install token is **not a login system**:

- The server does **not** embed the token in the page for remote browsers — only local UI requests receive it. A remote visitor gets `index.html` without a token.
- Remote users must supply the token out-of-band. Set `SMOKE_MONKEY_AUTH_TOKEN` and open the app once as `https://<your-host>/?token=<token>`; the browser stores it locally and strips it from the URL. Anyone with that link has full access, so treat it like a password.
- For the self-hosted VPS target (`deploy/docker-compose.vps.yml` + Caddy), the recommended setup is Caddy's [`basic_auth`](https://caddyserver.com/docs/caddyfile/directives/basic_auth) as the human login (it does not conflict with the `X-Smoke-Monkey-Token` header), with either `SMOKE_MONKEY_DISABLE_AUTH=1` or the `?token=` flow described above.
- `SMOKE_MONKEY_ASSUME_LOCAL=1` makes the server treat any peer as local. It exists for container setups that publish the port on the host's loopback only (see `docker-compose.yml`) — never set it on a publicly reachable server.

1. **Agents have filesystem access** — Each agent has a working directory and can read/write files. Scope working directories carefully.
2. **MCP servers run as subprocesses** — MCP servers are spawned as child processes with the same OS permissions as the Node.js server process. Only attach MCP servers you trust.
3. **API keys stored in SQLite** — Keys are stored at `~/.smoke-monkey/canvas.db`. Protect this file with appropriate filesystem permissions.

---

## Out of Scope

The following are **not** considered security vulnerabilities for this project:

- Vulnerabilities requiring physical access to the machine
- Social engineering attacks
- Denial-of-service attacks against a single-user local deployment
- Issues in third-party dependencies (report those upstream)

---

Thank you for helping keep Smoke Monkey Canvas secure! 🔒
