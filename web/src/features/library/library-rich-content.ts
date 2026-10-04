import type { PromptPreset } from './library.types.js';

/**
 * Returns a comprehensive, structured Markdown guide and simulated live dialogue
 * for every personality voice preset.
 */
export function getPersonalityMarkdown(preset: PromptPreset): string {
  const sample = getPersonalityDialogueSample(preset.id, preset.name);

  return `### Voice & Persona Profile: ${preset.name}
> **Category:** \`${preset.category}\`  
> **Directive Summary:** *${preset.description}*

---

#### 🎙️ Speech & Behavioral Directives
${preset.directive}

- **Consistency:** Maintains this vocal demeanor across all tool calls, status updates, and error investigations.
- **Substance First:** Tone enhances communication without obscuring technical accuracy or facts.
- **Context Awareness:** Adapts formality if critical security incidents arise, then resumes this persona.

---

#### 💬 Live Dialogue Demonstration
*Scenario: An autonomous agent is reporting an unexpected database connection timeout during a traffic spike.*

**Standard AI Assistant (Neutral):**
> *"A database timeout occurred at 14:02:11 UTC. The connection pool exhausted all 20 sockets during the traffic surge. I have initiated a retry cycle."*

**With \`${preset.name}\` Active:**
${sample}

---

#### 🎯 Recommended Agent Pairings
${getRecommendedPairings(preset.category)}
`;
}

function getPersonalityDialogueSample(id: string, name: string): string {
  const samples: Record<string, string> = {
    'cool-laidback': `> *"Hey, heads up — DB pool ran out of sockets during that traffic wave at 14:02. Nothing to sweat though; spinning up a few more connections and giving it another shot right now."*`,
    'warm-friendly': `> *"Good afternoon! Just wanted to gently let you know that our database got a bit overwhelmed by the afternoon rush at 14:02. I'm already taking care of it with an automatic retry so you don't have to worry!"*`,
    'calm-gentle': `> *"Taking a breath here. At 14:02, the database connection pool filled up under the sudden load. Everything is safe; I am calmly stepping through the recovery sequence now."*`,
    'energetic-upbeat': `> *"Boom! We saw a massive surge of traffic at 14:02! The DB pool maxed out all 20 sockets, but we've got this! Kicking off immediate retry and scaling up sockets now — let's go!"*`,
    'serious-focused': `> *"Alert: DB connection timeout at 14:02:11 UTC. Pool saturation 100% (20/20 sockets). Executing retry cycle 1/3. Stand by for metrics."*`,
    'playful-witty': `> *"Well, the good news is people love your app. The slightly spicy news: they loved it so much at 14:02 that all 20 database sockets threw their hands in the air. Reconnecting now!"*`,
    'dry-humorous': `> *"The database has decided that 20 simultaneous connections is quite enough attention for one afternoon. Initiating reconnect before it files a formal complaint."*`,
    'encouraging': `> *"You're doing great! Our traffic just spiked hard at 14:02, which gave the database pool a little challenge. Don't worry at all — I've already triggered the retry sequence and we'll be back to smooth sailing in seconds."*`,
    'formal-corporate': `> *"Please be advised that at 14:02:11 UTC, an infrastructure event transpired wherein the primary database connection pool reached maximum capacity (20/20). Corrective retry procedures are presently underway."*`,
    'executive-brief': `> *"**BLUF:** DB connection timeout at 14:02 UTC due to traffic spike. Zero data loss. Automated retry in progress. ETA to normal latency: <30s."*`,
    'startup-hustle': `> *"Traffic is ripping! Hit 20/20 DB sockets at 14:02 and choked momentarily. Already re-firing with expanded pool limits so we don't drop a single conversion."*`,
    'enterprise-architect': `> *"Architectural observation: At 14:02:11 UTC, ingress load exceeded our configured connection pool threshold (N=20). Initiating backoff-and-retry. We should evaluate PgBouncer or connection multiplexing for Q4 capacity planning."*`,
    'consultant': `> *"Our audit indicates a key bottleneck: at 14:02 UTC, connection pool saturation caused a temporary latency spike. Recommendation: allow automated retry to clear queue, followed by a 2x pool dimensioning review."*`,
    'blunt-direct': `> *"DB connection pool full. Timeout at 14:02. Retrying now."*`,
    'no-nonsense': `> *"Timeout at 14:02: 20/20 database connections exhausted by incoming traffic. Executing retry. No further action needed right now."*`,
    'sardonic': `> *"Fascinating how 20 connections seemed like infinite capacity yesterday. Retrying the database now that reality has intervened."*`,
    'terse': `> *"DB pool saturated (20/20) at 14:02. Retrying."*`,
    'brutally-honest': `> *"The database pool was undersized for this traffic surge and failed at 14:02. Retrying now, but if you don't raise pool limits this will happen again on the next spike."*`,
    'senior-engineer': `> *"Caught a connection timeout at 14:02 UTC — pool capped out at 20 sockets during the spike. Exponential backoff retry is executing. Will verify connection health and log a task to adjust pool sizing."*`,
    'sre': `> *"SEV-3: DB connection starvation at 14:02:11 UTC. Metrics: 20/20 active sockets, p99 latency spike to 4500ms. Automated mitigation: retry circuit engaged, healthcheck green on fallback replica."*`,
    'gen-z': `> *"ngl the db just got cooked by that traffic spike at 14:02 💀 all 20 sockets were full. retrying rn it's fine tho"*`,
    'academic-scholarly': `> *"Observations at 14:02:11 UTC demonstrate connection pool resource starvation consistent with M/M/c queuing theory under non-stationary arrival rates. Automated exponential backoff is actively resolving the transient state."*`,
  };

  return samples[id] || `> *"Observed connection threshold event at 14:02 UTC. Executing automated recovery and state reconciliation in accordance with the '${name}' operational guidelines."*`;
}

function getRecommendedPairings(category: string): string {
  switch (category) {
    case 'Professional Personas':
      return `- **Enterprise Architect:** Systems Engineers, DevOps Orchestrators, Tech Leads\n- **Executive Brief:** C-Suite Reporting Agents, Financial Analysts, Board Advisors\n- **Consultant:** Strategy Advisors, Market Analysts, Compliance Auditors`;
    case 'Direct & Blunt':
      return `- **No-Nonsense / Blunt:** CI/CD Gatekeepers, Security Threat Analyzers, Production Monitors\n- **Terse Minimalist:** Terminal Assistants, Real-time Alert Notifiers, Webhook Handlers`;
    case 'Technical & Domain':
      return `- **Senior Engineer:** Full-Stack Code Authors, Refactoring Bots, Code Reviewers\n- **SRE / DevOps:** Infrastructure Monitors, Incident Triage Bots, Runbook Automators\n- **Data Scientist:** Statistical Modeling Agents, SQL Query Generators, BI Analysts`;
    case 'Tone & Mood':
      return `- **Warm / Friendly:** Customer Success Agents, User Onboarding Assistants, HR Specialists\n- **Serious / Focused:** Legal Document Reviewers, Financial Accountants, Security Auditors`;
    default:
      return `- **Versatile:** Can be applied across any autonomous agent to align tone with team culture.`;
  }
}

/**
 * Returns a comprehensive, structured Markdown guide and rich live sample
 * demonstration for every output style preset.
 */
export function getOutputStyleMarkdown(preset: PromptPreset): string {
  const sample = getOutputStyleDemoSample(preset.id, preset.name);

  return `### Output Formatting Spec: ${preset.name}
> **Category:** \`${preset.category}\`  
> **Directive Summary:** *${preset.description}*

---

#### 📐 Structural Format Directive
${preset.directive}

- **Deterministic Shape:** Strict adherence to this structure ensures downstream agents and human reviewers can parse results instantly.
- **Information Density:** High signal-to-noise ratio designed for high-velocity decision making.
- **Tooling Compatibility:** Rendered formats are fully compliant with standard markdown parsers, terminals, and GitHub views.

---

#### 📑 Live Demonstration Output
*Sample response shaped according to the \`${preset.name}\` formatting standard:*

${sample}

---

#### 🚀 Primary Use Cases
${getOutputUseCases(preset.category)}
`;
}

function getOutputStyleDemoSample(id: string, name: string): string {
  switch (id) {
    case 'table-first':
      return `| Component | Status | Latency (p95) | Memory | Actions |
|:---|:---:|:---:|:---:|:---|
| \`auth-service\` | 🟢 Healthy | 18ms | 142 MB | Normal operation |
| \`payment-gateway\` | 🟡 Warning | 340ms | 480 MB | Socket pool 85% full |
| \`worker-cron\` | 🟢 Healthy | 4ms | 88 MB | 12 jobs dispatched |
| \`cache-redis\` | 🟢 Healthy | 0.8ms | 1.2 GB | Hit ratio: 98.4% |`;

    case 'mermaid-diagram':
      return `\`\`\`mermaid
flowchart LR
    A[Client Request] --> B[API Gateway]
    B --> C{Authenticated?}
    C -->|Yes| D[Microservice Cluster]
    C -->|No| E[401 Unauthorized]
    D --> F[(PostgreSQL)]
    D --> G[(Redis Cache)]
\`\`\`
*Generated dynamic flow diagram depicting gateway request routing and cache fallback.*`;

    case 'diff-patch':
      return `\`\`\`diff
--- a/src/server/database.ts
+++ b/src/server/database.ts
@@ -14,6 +14,8 @@ export class ConnectionPool {
   async acquire(): Promise<Socket> {
+    // Prevent connection starvation under burst traffic
+    if (this.available.length === 0 && this.total >= this.max) {
+      await this.waitForSocket(5000);
+    }
     return this.sockets.pop();
   }
\`\`\``;

    case 'shell-commands':
      return `\`\`\`bash
# 1. Check current connection pool metrics
curl -s http://localhost:8080/metrics | grep "db_pool_active"

# 2. Scale connection pool dynamically (Safe: non-destructive)
npm run migrate:pool -- --max-connections=50 --timeout=5000

# 3. Verify health status
curl -i http://localhost:8080/health
\`\`\``;

    case 'sql-queries':
      return `\`\`\`sql
-- Analyze query execution time and index utilization
SELECT 
    schemaname,
    relname AS table_name,
    seq_scan,
    idx_scan,
    n_live_tup AS total_rows
FROM pg_stat_user_tables
WHERE seq_scan > 500
ORDER BY seq_scan DESC
LIMIT 10;
\`\`\``;

    case 'api-curl':
      return `\`\`\`bash
curl -X POST https://api.smokemonkey.ai/v1/agents/spawn \\
  -H "Authorization: Bearer sm_live_9941a8fe" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Production SRE Sentinel",
    "model": "nvidia/nemotron-3-super-120b-a12b",
    "cron_schedule": "*/15 * * * *",
    "recommended_mcps": ["github-mcp", "postgres-mcp"]
  }'
\`\`\``;

    case 'unit-tests':
      return `\`\`\`typescript
import { describe, it, expect } from 'vitest';
import { ConnectionPool } from './database.js';

describe('ConnectionPool Sizing', () => {
  it('should recycle sockets within timeout window', async () => {
    const pool = new ConnectionPool({ max: 10 });
    const sock = await pool.acquire();
    expect(sock.connected).toBe(true);
    await pool.release(sock);
    expect(pool.availableCount).toBe(10);
  });

  it('should throw timeout on pool exhaustion', async () => {
    const pool = new ConnectionPool({ max: 0, timeoutMs: 50 });
    await expect(pool.acquire()).rejects.toThrow('Connection pool timeout');
  });
});
\`\`\``;

    case 'tldr-first':
      return `**TL;DR:** Database pool exhausted 20/20 sockets at 14:02 UTC due to a 3.4x spike in checkout traffic; automated backoff resolved all pending transactions with zero lost orders.

### Detailed Findings
1. **Root Cause:** Default socket pool cap set to 20 connections in staging config.
2. **Mitigation:** Raised connection ceiling to 50 and activated idle reaping.
3. **Verification:** Error rate returned to 0.00% across all API nodes within 22 seconds.`;

    case 'numbered-steps':
      return `1. **Isolate Degraded Node:** Remove \`node-04\` from ingress load balancing pool.
2. **Flush Zombie Sockets:** Issue \`KILL CONNECTION\` on idle threads older than 300 seconds.
3. **Scale Capacity:** Increment \`MAX_POOL_SIZE\` from \`20\` to \`60\` in \`.env.production\`.
4. **Deploy Hotfix:** Execute seamless rolling restart via container cluster manager.
5. **Verify Telemetry:** Monitor p99 response time on Grafana dashboard for 5 minutes.`;

    case 'bullets-only':
      return `• Ingress load spiked +240% following marketing campaign launch at 14:00 UTC.
• Database socket ceiling reached 100% capacity at 14:02:11 UTC.
• Zero dropped transactions recorded; client retries queued and completed in 1.4s avg.
• Connection pool configuration upgraded from 20 to 50 active handles.
• Service health restored to nominal green state at 14:02:33 UTC.`;

    case 'json-output':
      return `\`\`\`json
{
  "status": "success",
  "incident_id": "INC-88914",
  "service": "database-cluster",
  "severity": "SEV-3",
  "metrics": {
    "peak_sockets": 20,
    "max_allowed": 20,
    "p99_latency_ms": 412.5,
    "duration_seconds": 22
  },
  "resolution": "pool_reconfigured_and_restarted",
  "healthy": true
}
\`\`\``;

    case 'yaml-config':
      return `\`\`\`yaml
version: "3.9"
services:
  agent-runner:
    image: smokemonkey/agent-runner:latest
    environment:
      - DB_POOL_MIN=5
      - DB_POOL_MAX=50
      - DB_TIMEOUT_MS=5000
      - CRON_SCHEDULE="*/15 * * * *"
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 2048M
\`\`\``;

    case 'csv-delimited':
      return `\`\`\`csv
timestamp_utc,service,status_code,latency_ms,connections_active
2026-10-04T14:02:00Z,api-gateway,200,14.2,18
2026-10-04T14:02:11Z,api-gateway,504,5002.1,20
2026-10-04T14:02:22Z,api-gateway,200,28.4,14
2026-10-04T14:02:30Z,api-gateway,200,12.1,9
\`\`\``;

    case 'executive-summary':
      return `### Executive Briefing: Infrastructure Resilience Audit
**Recommendation:** Approve permanent connection multiplexer deployment ahead of Black Friday traffic.

| Key Metric | Pre-Incident | Peak Event | Post-Mitigation |
|:---|:---:|:---:|:---:|
| System Throughput | 1,200 req/s | 4,100 req/s | 4,100 req/s |
| Socket Utilization | 35% | 100% | 42% |
| Order Success Rate | 100% | 99.8% | 100% |

**Risks & Next Actions:**
- **Risk:** Without connection multiplexing, downstream replica latency may degrade under 10k req/s.
- **Next Action:** Engineering team scheduled deployment of PgBouncer cluster for Tuesday 02:00 UTC.`;

    case 'checklist':
      return `- [x] Verify database socket pool ceiling (\`MAX_CONNECTIONS=50\`)
- [x] Test automated exponential backoff under simulated burst
- [ ] Run load test with 5,000 concurrent simulated agents
- [ ] Confirm alerting rules trigger in PagerDuty under 90% pool capacity
- [ ] Document updated runbook in team engineering wiki`;

    case 'decision-tree':
      return `\`\`\`
Traffic Ingress Event Detected
  ├── Is CPU > 85%?
  │     ├── YES ──> Trigger horizontal pod auto-scaler (+2 nodes)
  │     └── NO  ──> Check Database Pool Status
  │                   ├── Pool > 90% ──> Scale Pool Ceiling & Flush Idles
  │                   └── Pool < 90% ──> Log Normal Telemetry & Exit
\`\`\``;

    default:
      return `\`\`\`text
[Standard Output Specification for ${name}]
Adheres strictly to the requested structure, ensuring readable, deterministic data formats.
\`\`\``;
  }
}

function getOutputUseCases(category: string): string {
  switch (category) {
    case 'Visual & Structured':
      return `- **Comparison Tables & Matrices:** Vendor evaluations, benchmarking, status dashboards\n- **Diagrams & Flowcharts:** Architecture reviews, data-flow visualization, workflow maps`;
    case 'Code & Technical':
      return `- **Code Blocks & Diffs:** Pull request generation, code refactoring, bug patching\n- **CLI & SQL Scripts:** Runbook automation, database investigations, deployment scripts`;
    case 'Structure & Length':
      return `- **TL;DR First:** Executive briefings, chat notifications, quick status reports\n- **Step-by-Step:** Incident response, standard operating procedures, tutorials`;
    case 'Data & Config':
      return `- **JSON / YAML / CSV:** Direct machine-to-machine integrations, API payloads, config files`;
    case 'Reasoning & Interaction':
      return `- **Checklists & Decision Trees:** Pre-deployment verifications, triage logic, sign-off reviews`;
    default:
      return `- **General Purpose:** Standardized structured communication across multi-agent workflows.`;
  }
}
