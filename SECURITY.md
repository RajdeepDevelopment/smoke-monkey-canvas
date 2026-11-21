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
- Every `/api/*` route (other than the `/api/health` liveness probe and the MCP OAuth callback) and the `/ws` WebSocket require a bearer token. The bundled web UI sends it in `X-Smoke-Monkey-Token`; API/CLI clients can use `Authorization: Bearer <token>`; the WebSocket upgrade carries it in the `Sec-WebSocket-Protocol` subprotocol (a `?token=` param is still accepted for CLI clients). A random per-install token is generated on first boot and persisted in the local SQLite database; the bundled web UI gets it automatically on `GET /api/auth/token`, which only answers requests that arrive from the local machine — a LAN or internet peer cannot use it to self-issue a token even if you've set `HOST=0.0.0.0`.
- Set `SMOKE_MONKEY_AUTH_TOKEN=<your-own-secret>` to pin the token explicitly (useful if you manage your own secret distribution), or `SMOKE_MONKEY_DISABLE_AUTH=1` to disable this layer entirely **only if** something else in front of the server already authenticates requests.

If you expose the server on a network or the public internet (`HOST=0.0.0.0`), be aware the per-install token is **not a login system**:

- The server does **not** embed the token in the page for remote browsers — only local UI requests receive it. A remote visitor gets `index.html` without a token.
- A bare loopback peer is **not** treated as local on its own, even with no proxy headers present: a same-host reverse proxy with zero extra configuration (e.g. plain nginx with only `proxy_pass http://127.0.0.1:3333;`) also connects over loopback and adds no identifying headers, so it would otherwise be indistinguishable from a real local browser. Local-only treatment requires `SMOKE_MONKEY_ASSUME_LOCAL=1`, which you should never need to set by hand — it's set automatically by every officially-supported local launcher (the CLI, the desktop app, the mobile build) because *that* process starting is itself unambiguous proof of being local. Requests carrying proxy headers (`X-Forwarded-*`, `Forwarded`, `X-Real-IP`, `Via`) are refused regardless.
- Remote users must supply the token out-of-band. Set `SMOKE_MONKEY_AUTH_TOKEN` and open the app once as `https://<your-host>/#token=<token>` (percent-encode it, e.g. `encodeURIComponent(token)`, if it contains `+`, `/`, or `=`); the fragment never reaches the server or its access logs, and the browser stores the token locally and strips it from the URL. Anyone with that link has full access, so treat it like a password.
- The browser only sends the token over HTTPS (or `wss:`), or over plain HTTP/`ws:` to loopback. A LAN address like `http://192.168.1.10:3333` will load the UI but not authenticate — terminate TLS (the VPS Caddy config does this automatically) before using the token from another machine.
- For the self-hosted VPS target (`deploy/docker-compose.vps.yml` + Caddy), the recommended setup is Caddy's [`basic_auth`](https://caddyserver.com/docs/caddyfile/directives/basic_auth) as the human login (it does not conflict with the `X-Smoke-Monkey-Token` header), with either `SMOKE_MONKEY_DISABLE_AUTH=1` or the `#token=` flow described above. The bundled Caddyfile also filters `token` out of its access logs as a backstop for legacy links.
- `SMOKE_MONKEY_ASSUME_LOCAL=1` is the one env var in this list you normally should **not** set yourself — it's set automatically by `bin/cli.js`, the mobile build, and `docker-compose.yml` (the last one for an unrelated reason: Docker's userland proxy makes the browser's peer the bridge gateway, not `127.0.0.1`, when the published port is itself bound to loopback). Setting it yourself on a server reachable by anyone other than you defeats the point of the token bootstrap check.

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
