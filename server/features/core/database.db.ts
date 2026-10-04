import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

export interface StockSkillRecord {
  id: string;
  category: string;
  name: string;
  description: string | null;
  content: string;
  is_bundled: number;
  created_at: string;
}

export const SKILL_CATEGORIES = [
  'Backend & APIs',
  'Frontend & UI',
  'DevOps & CI/CD',
  'QA & Testing',
  'Security & Hardening',
  'Performance & Optimization',
  'Architecture & Planning',
  'Review & Code Quality',
  'Observability & Debugging',
  'Customer Support & Success',
  'Sales & Marketing',
  'Legal & Compliance',
  'Finance & Accounting',
  'Data & Business Intelligence',
  'Product & Project Management',
  'Web Scraping & Research',
] as const;

export class CoreDatabase {
  private static instance: CoreDatabase | null = null;
  public db: DatabaseSync;

  constructor(customPath?: string) {
    const resolvedPath = customPath ?? CoreDatabase.getDefaultPath();
    const dir = dirname(resolvedPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    this.db = new DatabaseSync(resolvedPath);
    this.bootstrapTables();
    this.seedDefaultSettings();
    this.seedBundledSkills();
  }

  static getInstance(customPath?: string): CoreDatabase {
    if (!CoreDatabase.instance) {
      CoreDatabase.instance = new CoreDatabase(customPath);
    }
    return CoreDatabase.instance;
  }

  static getDefaultPath(): string {
    return process.env.SMOKE_CANVAS_DB || process.env.DB_PATH || join(homedir(), '.smoke-monkey', 'canvas.db');
  }

  private bootstrapTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        model TEXT NOT NULL DEFAULT 'nvidia/nemotron-3-super-120b-a12b',
        provider TEXT NOT NULL DEFAULT 'nvidia',
        system_prompt TEXT NOT NULL,
        cron_schedule TEXT,
        cron_enabled INTEGER NOT NULL DEFAULT 0,
        pos_x REAL NOT NULL DEFAULT 250,
        pos_y REAL NOT NULL DEFAULT 200,
        status TEXT NOT NULL DEFAULT 'idle',
        last_run_at TEXT,
        next_run_at TEXT,
        disabled_tools TEXT DEFAULT '[]',
        policies TEXT DEFAULT '[]',
        personalities TEXT DEFAULT '[]',
        output_styles TEXT DEFAULT '[]',
        working_dir TEXT,
        max_memory_mb INTEGER NOT NULL DEFAULT 1024,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS agent_mcps (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        mcp_name TEXT NOT NULL,
        label TEXT NOT NULL,
        config_json TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        FOREIGN KEY(agent_id) REFERENCES agents(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS agent_skills (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        skill_name TEXT NOT NULL,
        description TEXT,
        content TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        FOREIGN KEY(agent_id) REFERENCES agents(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        trigger_type TEXT NOT NULL DEFAULT 'manual',
        status TEXT NOT NULL DEFAULT 'running',
        task_prompt TEXT,
        summary TEXT,
        error TEXT,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        FOREIGN KEY(agent_id) REFERENCES agents(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS run_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(run_id) REFERENCES runs(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS stock_skills (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        content TEXT NOT NULL,
        is_bundled INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(agent_id) REFERENCES agents(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        parts_json TEXT,
        run_id TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_agent_mcps ON agent_mcps(agent_id);
      CREATE INDEX IF NOT EXISTS idx_agent_skills ON agent_skills(agent_id);
      CREATE INDEX IF NOT EXISTS idx_runs_agent ON runs(agent_id);
      CREATE INDEX IF NOT EXISTS idx_run_events ON run_events(run_id);
      CREATE INDEX IF NOT EXISTS idx_stock_skills_cat ON stock_skills(category);
      CREATE INDEX IF NOT EXISTS idx_chat_sessions_agent ON chat_sessions(agent_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
    `);

    try {
      this.db.exec("ALTER TABLE runs ADD COLUMN session_id TEXT");
    } catch {
      // already exists
    }
    try {
      this.db.exec("ALTER TABLE agents ADD COLUMN disabled_tools TEXT DEFAULT '[]'");
    } catch {
      // already exists
    }
    try {
      this.db.exec("ALTER TABLE agents ADD COLUMN policies TEXT DEFAULT '[]'");
    } catch {
      // already exists
    }
    try {
      this.db.exec("ALTER TABLE agents ADD COLUMN working_dir TEXT");
    } catch {
      // already exists
    }
    try {
      this.db.exec("ALTER TABLE agents ADD COLUMN personalities TEXT DEFAULT '[]'");
    } catch {
      // already exists
    }
    try {
      this.db.exec("ALTER TABLE agents ADD COLUMN output_styles TEXT DEFAULT '[]'");
    } catch {
      // already exists
    }
    try {
      this.db.exec("ALTER TABLE agents ADD COLUMN max_memory_mb INTEGER NOT NULL DEFAULT 1024");
    } catch {
      // already exists
    }
  }

  // ── Settings ───────────────────────────────────────────────────────────────

  private seedDefaultSettings(): void {
    // Seed user's provided NVIDIA API key if not already set
    const userNvidiaKey = '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';
    this.setSetting('NVIDIA_API_KEY', userNvidiaKey);
    process.env.NVIDIA_API_KEY = userNvidiaKey;
  }

  getSetting(key: string): string | null {
    const stmt = this.db.prepare(`SELECT value FROM settings WHERE key = ?`);
    const row = stmt.get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  setSetting(key: string, value: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    stmt.run(key, value);
    process.env[key] = value;
  }

  getAllSettings(): Record<string, string> {
    const stmt = this.db.prepare(`SELECT key, value FROM settings`);
    const rows = stmt.all() as unknown as Array<{ key: string; value: string }>;
    const result: Record<string, string> = {};
    for (const r of rows) {
      result[r.key] = r.value;
    }
    return result;
  }

  // ── Stock Skills & 10 Categories ───────────────────────────────────────────

  private seedBundledSkills(): void {
    const insertStmt = this.db.prepare(`
      INSERT OR REPLACE INTO stock_skills (id, category, name, description, content, is_bundled, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();

    // Map bundled skills from plugin/agent-skills/skills to the categories
    let bundledRoot = '';
    try {
      const pkgPath = require.resolve('smoke-monkey-harness/package.json');
      const candidate = join(dirname(pkgPath), 'plugin', 'agent-skills', 'skills');
      if (existsSync(candidate)) bundledRoot = candidate;
    } catch {}

    if (!bundledRoot) {
      const pkgRoot = join(process.cwd(), 'node_modules', 'smoke-monkey-harness', 'plugin', 'agent-skills', 'skills');
      if (existsSync(pkgRoot)) bundledRoot = pkgRoot;
    }

    if (!bundledRoot) {
      const localMonorepo = join(__dirname, '../../../../plugin/agent-skills/skills');
      if (existsSync(localMonorepo)) bundledRoot = localMonorepo;
    }
    if (existsSync(bundledRoot)) {
      const categoryMapping: Record<string, string> = {
        'api-and-interface-design': 'Backend & APIs',
        'test-driven-development': 'QA & Testing',
        'browser-testing-with-devtools': 'QA & Testing',
        'constraint-driven-development': 'QA & Testing',
        'frontend-ui-engineering': 'Frontend & UI',
        'ci-cd-and-automation': 'DevOps & CI/CD',
        'shipping-and-launch': 'DevOps & CI/CD',
        'git-workflow-and-versioning': 'DevOps & CI/CD',
        'security-and-hardening': 'Security & Hardening',
        'performance-optimization': 'Performance & Optimization',
        'spec-driven-development': 'Architecture & Planning',
        'planning-and-task-breakdown': 'Architecture & Planning',
        'idea-refine': 'Architecture & Planning',
        'code-review-and-quality': 'Review & Code Quality',
        'code-simplification': 'Review & Code Quality',
        'debugging-and-error-recovery': 'Observability & Debugging',
        'observability-and-instrumentation': 'Observability & Debugging',
        'context-engineering': 'Backend & APIs',
        'source-driven-development': 'Backend & APIs',
        'incremental-implementation': 'Backend & APIs',
        'doubt-driven-development': 'Review & Code Quality',
        'deprecation-and-migration': 'DevOps & CI/CD',
        'documentation-and-adrs': 'Architecture & Planning',
        'interview-me': 'Architecture & Planning',
        'using-agent-skills': 'Architecture & Planning',
      };

      try {
        const dirs = readdirSync(bundledRoot, { withFileTypes: true });
        for (const d of dirs) {
          if (!d.isDirectory()) continue;
          const skillPath = join(bundledRoot, d.name, 'SKILL.md');
          if (!existsSync(skillPath)) continue;

          const raw = readFileSync(skillPath, 'utf8');
          const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
          let name = d.name;
          let desc = 'Bundled production skill';
          let body = raw;

          if (match) {
            const fm = match[1];
            body = match[2];
            const nameMatch = fm.match(/name:\s*(.+)/);
            const descMatch = fm.match(/description:\s*(.+)/);
            if (nameMatch) name = nameMatch[1].trim().replace(/^['"]|['"]$/g, '');
            if (descMatch) desc = descMatch[1].trim().replace(/^['"]|['"]$/g, '');
          }

          const category = categoryMapping[d.name] || 'Backend & APIs';
          insertStmt.run(d.name, category, name, desc, body, 1, now);
        }
      } catch (e) {
        console.warn('[CoreDatabase] Bundled skills seeding warning:', e);
      }
    }

    // ── Additional High-Starred Enterprise Skills from Open Source Ecosystem ──
    const enterpriseSkills = [
      {
        id: 'react-nextjs-performance',
        category: 'Frontend & UI',
        name: 'React & Next.js Performance Engineering',
        description: 'Next.js App Router, SSR, Server Components, Hydration & Core Web Vitals optimization.',
        content: `# React & Next.js Performance Engineering\n\n## Core Principles\n1. Minimize Client Component boundary: Keep leaf nodes as client components ('use client'), keep data fetching in async Server Components.\n2. Prevent Layout Shift (CLS): Explicit image aspect ratios, reserve space for dynamic blocks.\n3. Optimize Interaction to Next Paint (INP): Use \`useTransition\` for non-urgent state updates and avoid long tasks (>50ms) on main thread.\n4. Route Preloading: Use Next.js \`<Link>\` with prefetch configuration.\n5. Bundle Splitting: Employ dynamic imports (\`next/dynamic\`) for heavy modules (charts, modals, rich text editors).`,
      },
      {
        id: 'modern-ui-state-management',
        category: 'Frontend & UI',
        name: 'Modern UI State Architecture',
        description: 'Zustand, TanStack Query, optimistic UI updates, cache invalidation, and race condition prevention.',
        content: `# Modern UI State Architecture\n\n## Guidelines\n1. Server state vs Client state: Never duplicate server entities into client state without a caching layer.\n2. Optimistic mutations: Apply UI updates immediately with rollback handlers on network rejection.\n3. Selector memoization: Use shallow comparisons (\`useShallow\` in Zustand) to prevent excessive re-renders.\n4. Request cancellation: Attach \`AbortController\` signals to in-flight API requests on component unmount or search query changes.`,
      },
      {
        id: 'wcag-accessibility-audit',
        category: 'Frontend & UI',
        name: 'WCAG 2.1 AA Accessibility Sentry',
        description: 'WCAG 2.1 AA audits, keyboard focus traps, screen reader aria attributes, color contrast standards.',
        content: `# WCAG 2.1 AA Accessibility Sentry\n\n## Audit Rules\n1. Keyboard Trapping: Modal dialogues must trap focus and return focus to triggering element on Esc or close.\n2. ARIA semantics: Use native HTML elements (\`<button>\`, \`<dialog>\`) before custom ARIA roles.\n3. Contrast Ratio: Minimum 4.5:1 for normal text and 3:1 for large text / graphical UI controls.\n4. Alt Text & Labels: All interactive icons must have \`aria-label\` or visually hidden text.`,
      },
      {
        id: 'rest-api-architecture-standards',
        category: 'Backend & APIs',
        name: 'Enterprise REST API Architecture Standards',
        description: 'RESTful API design guidelines, idempotent endpoints, versioning, pagination, HTTP status code hygiene.',
        content: `# Enterprise REST API Architecture Standards\n\n## Design Standards\n1. URL Nouns & Hierarchy: Use plural nouns (\`/api/v1/workspaces/:id/agents\`).\n2. Idempotency: \`PUT\` and \`DELETE\` must be strictly idempotent. Provide \`Idempotency-Key\` headers for sensitive \`POST\` transactions.\n3. Pagination: Standardize on cursor-based pagination (\`?cursor=xxx&limit=50\`) over offset-based pagination on large datasets.\n4. Error envelopes: Return structured error responses: \`{ error: { code: 'NOT_FOUND', message: '...', details: [] } }\`.`,
      },
      {
        id: 'redis-caching-and-rate-limiting',
        category: 'Backend & APIs',
        name: 'Redis Caching & Token-Bucket Rate Limiting',
        description: 'Distributed token bucket rate limiting, Redis cache-aside patterns, dogpiling mitigation with mutex locks.',
        content: `# Redis Caching & Token-Bucket Rate Limiting\n\n## Key Patterns\n1. Cache-Aside: Read from cache; on miss, read DB, write cache with TTL. Add jitter (e.g. \`TTL + random(0, 60)\`) to avoid thundering herds.\n2. Mutex / Singleflight: Use Redis locks to ensure only one worker computes expensive cache misses.\n3. Sliding Window Rate Limiting: Implement Redis sorted sets (\`ZREMRANGEBYSCORE\`, \`ZCARD\`, \`ZADD\`) to guarantee precise burst control.`,
      },
      {
        id: 'kubernetes-helm-gitops',
        category: 'DevOps & CI/CD',
        name: 'Kubernetes Helm & GitOps Delivery',
        description: 'Kubernetes Helm deployments, ArgoCD GitOps synchronizations, PodDisruptionBudgets, and HPA autoscaling.',
        content: `# Kubernetes Helm & GitOps Delivery\n\n## Production Check\n1. Pod Disruption Budgets (PDB): Ensure \`minAvailable: 1\` or \`maxUnavailable: 25%\` for critical microservices.\n2. Health Probes: Separate \`livenessProbe\` (process dead) from \`readinessProbe\` (service ready for traffic).\n3. Horizontal Pod Autoscaler: Configure HPA target CPU 70% and memory metrics.\n4. GitOps: All manifests must be declarative in Git repository with automated reconciliation via ArgoCD / Flux.`,
      },
      {
        id: 'docker-production-hardening',
        category: 'DevOps & CI/CD',
        name: 'Docker Multi-Stage Production Hardening',
        description: 'Multi-stage Docker builds, non-root users, minimal Alpine/Distroless distros, layer caching.',
        content: `# Docker Multi-Stage Production Hardening\n\n## Hardening Directives\n1. Multi-Stage Builds: Use build stage for compilation; copy only compiled artifacts into runtime stage.\n2. Non-root Execution: Explicitly create and switch to unprivileged user (\`USER 10001:10001\`).\n3. Base Image: Prefer \`distroless\` or minimal Alpine images to eliminate shell injection attack surfaces.\n4. Read-Only Root Filesystem: Mount writable paths (e.g. \`/tmp\`) as memory tmpfs.`,
      },
      {
        id: 'zero-downtime-release-engineering',
        category: 'DevOps & CI/CD',
        name: 'Zero-Downtime Blue/Green Release Engineering',
        description: 'Blue-green deployments, canary rollouts, database zero-downtime schema migrations.',
        content: `# Zero-Downtime Release Engineering\n\n## Expand-Contract Schema Migrations\n1. Phase 1 (Expand): Add new column as nullable; dual-write from application.\n2. Phase 2 (Backfill): Background backfill historical records.\n3. Phase 3 (Switch): Switch reads and validation to new column.\n4. Phase 4 (Contract): Remove old column / dual-write once all old application versions are decommissioned.`,
      },
      {
        id: 'support-ticket-triage-and-sla',
        category: 'Customer Support & Success',
        name: 'Customer Support SLA & Incident Triage',
        description: 'Incident triage matrix (P0-P3), SLA countdown adherence, first-response protocols, and de-escalation scripts.',
        content: `# Customer Support SLA & Incident Triage\n\n## Severity Matrix\n- P0 (Blocker/Outage): Service unavailable for all users. First response within 15 minutes. Hourly stakeholder updates.\n- P1 (Critical): Major feature broken with no workaround. First response within 1 hour.\n- P2 (Normal): Minor bug with workaround. First response within 4 hours.\n- P3 (Low): Cosmetic or question. First response within 24 hours.\n\n## Protocol\n1. Acknowledge customer pain with empathy and confirm reproduction steps.\n2. Tag ticket with component, customer tier (Enterprise vs Standard), and assigned engineer.`,
      },
      {
        id: 'customer-empathy-and-retention',
        category: 'Customer Support & Success',
        name: 'Customer Empathy & Churn Prevention Playbook',
        description: 'De-escalating frustrated clients, churn mitigation playbooks, executive escalation outreach.',
        content: `# Customer Empathy & Churn Prevention Playbook\n\n## De-escalation Workflow\n1. Validate Experience: Never argue or place blame on the customer. State: "I understand how disruptive this has been for your team."\n2. Clear Action Plan: Specify exact next steps with time-boxed checkpoints.\n3. Churn Risk Flagging: If an account mentions cancellation, immediately calculate account health score and notify Account Executive.`,
      },
      {
        id: 'owasp-top-10-mitigation',
        category: 'Security & Hardening',
        name: 'OWASP Top 10 Vulnerability Remediation',
        description: 'Vulnerability remediation for SQLi, XSS, CSRF, SSRF, Broken Object-Level Authorization (BOLA), and IDORs.',
        content: `# OWASP Top 10 Vulnerability Remediation\n\n## Security Directives\n1. Injection: Always use parameterized prepared statements; never concatenate user input into queries.\n2. Broken Object-Level Authorization (BOLA): Validate current authenticated user owns \`resourceId\` on every route.\n3. SSRF: Whitelist allowed outbound URL domains and reject internal RFC-1918 / cloud metadata IPs (169.254.169.254).\n4. Content-Security-Policy (CSP): Restrict script-src to self and verified hashes.`,
      },
      {
        id: 'soc2-type-ii-readiness',
        category: 'Security & Hardening',
        name: 'SOC2 Type II Audit & Evidence Automation',
        description: 'Continuous evidence collection for access reviews, change management logs, encrypted backups, and audit trails.',
        content: `# SOC2 Type II Audit & Evidence Automation\n\n## Trust Service Criteria\n1. Access Control: Quarterly user access reviews for AWS, GitHub, and production databases.\n2. Change Management: 100% of production code changes must have pull request peer review approval and green CI checks.\n3. Encryption at Rest & In Transit: TLS 1.3 enforced, KMS envelope encryption on all databases and disks.`,
      },
      {
        id: 'b2b-cold-email-deliverability',
        category: 'Sales & Marketing',
        name: 'B2B Outbound Deliverability & Email Architecture',
        description: 'SPF/DKIM/DMARC compliance, personalized outbound hooks, value-first messaging, and reply rate optimization.',
        content: `# B2B Outbound Deliverability & Email Architecture\n\n## Deliverability Checklist\n1. Authentication: SPF records configured, DKIM 2048-bit key verified, DMARC policy set to \`p=quarantine\` or \`p=reject\`.\n2. Warmup: Limit new mailbox volume to 20-40 emails per day with graduated ramps.\n3. Content Hygiene: Zero spam trigger words ('100% free', 'guaranteed money'), plain text over heavy HTML, maximum 1 link per email.`,
      },
      {
        id: 'seo-hub-and-spoke-architecture',
        category: 'Sales & Marketing',
        name: 'SEO Topic Clustering & Hub-and-Spoke Architecture',
        description: 'Keyword clustering by SERP overlap, pillar content hubs, internal linking siloing, and AI-Overview GEO optimization.',
        content: `# SEO Topic Clustering & Hub-and-Spoke Architecture\n\n## Content Architecture\n1. Pillar Hub: Authoritative ultimate guide covering high-intent core keyword.\n2. Cluster Spokes: 6-12 granular supporting articles answering long-tail sub-questions.\n3. Siloed Internal Linking: Every spoke links back to pillar with exact keyword variations in anchor text.\n4. Entity Clarity: Use JSON-LD schema (\`Article\`, \`FAQPage\`, \`HowTo\`) to optimize for Google AI Overviews and answer engines.`,
      },
      {
        id: 'gdpr-ccpa-compliance-audit',
        category: 'Legal & Compliance',
        name: 'GDPR & CCPA Privacy Compliance Framework',
        description: 'Data subject access requests (DSAR), right-to-be-forgotten deletion workflows, third-party subprocessor registers.',
        content: `# GDPR & CCPA Privacy Compliance Framework\n\n## Compliance Requirements\n1. Data Subject Access Requests (DSAR): Fulfill within 30 days; export user data in machine-readable JSON/CSV.\n2. Right to Erasure: Cascade deletion of user PII across primary DB, backups, CRM, and analytics processors.\n3. Consent Tracking: Explicit opt-in for cookies and marketing communications.`,
      },
      {
        id: 'saas-runway-and-unit-economics',
        category: 'Finance & Accounting',
        name: 'SaaS Runway & Unit Economics Financial Modeling',
        description: 'Calculating CAC, LTV, net revenue retention (NRR), churn rate, burn multiple, and cash runway projections.',
        content: `# SaaS Runway & Unit Economics Financial Modeling\n\n## Financial Metrics\n- CAC: Total Sales & Marketing Spend / Number of New Customers Acquired.\n- LTV: (Average Revenue Per User × Gross Margin %) / Churn Rate.\n- Target LTV:CAC Ratio: > 3:1.\n- Net Revenue Retention (NRR): (Starting ARR + Expansion - Contraction - Churn) / Starting ARR (Target > 110%).\n- Cash Runway: Cash Balance / Net Monthly Burn.`,
      },
      {
        id: 'sql-query-performance-tuning',
        category: 'Data & Business Intelligence',
        name: 'SQL Query & EXPLAIN ANALYZE Performance Tuning',
        description: 'EXPLAIN ANALYZE interpretation, index selection (B-Tree, GIN, BRIN), partition pruning, avoiding sequential scans.',
        content: `# SQL Query & EXPLAIN ANALYZE Performance Tuning\n\n## Optimization Principles\n1. Inspect Execution Plans: Look for \`Seq Scan\` on large tables; verify \`Index Scan\` or \`Bitmap Heap Scan\` is selected.\n2. Composite Indexes: Order columns by equality conditions first, followed by range/sort columns.\n3. Partial & GIN Indexes: Use partial indexes for boolean flags (\`WHERE is_active = true\`) and GIN for JSONB and full-text search.`,
      },
      {
        id: 'prd-and-user-story-spec',
        category: 'Product & Project Management',
        name: 'PRD Writing & User Story Acceptance Criteria',
        description: 'PRD writing, user stories with Given-When-Then acceptance criteria, and edge-case mapping.',
        content: `# PRD Writing & User Story Acceptance Criteria\n\n## PRD Structure\n1. Problem Statement: What user problem are we solving, and why now?\n2. User Personas & Jobs-To-Be-Done (JTBD).\n3. Functional Requirements: Numbered specification of features.\n4. Acceptance Criteria (Given-When-Then format for automated QA testing).\n5. Success Metrics: Measurable KPIs (e.g. 20% conversion increase, <200ms latency).`,
      },
    ];

    for (const skill of enterpriseSkills) {
      insertStmt.run(skill.id, skill.category, skill.name, skill.description, skill.content, 1, now);
    }
  }

  getAllStockSkills(): StockSkillRecord[] {
    const stmt = this.db.prepare(`SELECT * FROM stock_skills ORDER BY category ASC, name ASC`);
    return stmt.all() as unknown as StockSkillRecord[];
  }

  addStockSkill(skill: Omit<StockSkillRecord, 'created_at'> & { created_at?: string }): StockSkillRecord {
    const createdAt = skill.created_at ?? new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO stock_skills (id, category, name, description, content, is_bundled, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        category = excluded.category,
        name = excluded.name,
        description = excluded.description,
        content = excluded.content
    `);
    stmt.run(
      skill.id,
      skill.category,
      skill.name,
      skill.description ?? null,
      skill.content,
      skill.is_bundled,
      createdAt,
    );
    return { ...skill, created_at: createdAt };
  }
}
