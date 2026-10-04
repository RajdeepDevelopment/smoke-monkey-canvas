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

Smoke Monkey Canvas is designed to run **locally** (on `localhost`). If you expose it on a network or public internet, be aware:

1. **No built-in authentication** — The API has no auth by default. Do not expose port 3333 to the public internet without adding an authentication layer (reverse proxy + auth middleware).
2. **Agents have filesystem access** — Each agent has a working directory and can read/write files. Scope working directories carefully.
3. **MCP servers run as subprocesses** — MCP servers are spawned as child processes with the same OS permissions as the Node.js server process. Only attach MCP servers you trust.
4. **API keys stored in SQLite** — Keys are stored at `~/.smoke-monkey/canvas.db`. Protect this file with appropriate filesystem permissions.
5. **WebSocket** — The WebSocket endpoint (`/ws`) has no auth. Secure it if deploying on a network.

---

## Out of Scope

The following are **not** considered security vulnerabilities for this project:

- Vulnerabilities requiring physical access to the machine
- Social engineering attacks
- Denial-of-service attacks against a single-user local deployment
- Issues in third-party dependencies (report those upstream)

---

Thank you for helping keep Smoke Monkey Canvas secure! 🔒
