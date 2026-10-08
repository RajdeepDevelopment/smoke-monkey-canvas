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
        source TEXT NOT NULL DEFAULT 'canvas',
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
        source TEXT NOT NULL DEFAULT 'canvas',
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
    try {
      this.db.exec("ALTER TABLE agent_mcps ADD COLUMN source TEXT NOT NULL DEFAULT 'canvas'");
    } catch {
      // already exists
    }
    try {
      this.db.exec("ALTER TABLE agent_skills ADD COLUMN source TEXT NOT NULL DEFAULT 'canvas'");
    } catch {
      // already exists
    }
  }

  // ── Settings ───────────────────────────────────────────────────────────────

  private seedDefaultSettings(): void {
    // Seed from process.env if provided at boot
    if (process.env.NVIDIA_API_KEY && !this.getSetting('NVIDIA_API_KEY')) {
      this.setSetting('NVIDIA_API_KEY', process.env.NVIDIA_API_KEY);
    }
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

    // ── Expanded Enterprise Skill Catalog (domain coverage for 300 preset agents) ──
    const expandedEnterpriseSkills = [
      {
        id: 'git-workflow-governance',
        category: 'DevOps & CI/CD',
        name: 'Git Workflow & Branch Protection Governance',
        description: 'Branch protection rules, conventional commits, semantic release versioning, and safe rebase/merge policy enforcement.',
        content: `# Git Workflow & Branch Protection Governance\n\n1. Enforce branch protection: require PR review, status checks, and linear history before merges to main.\n2. Conventional Commits: \`feat(scope):\`, \`fix(scope):\`, \`chore:\`, \`docs:\` with full subject under 72 characters.\n3. Semantic Versioning: derive bump from commit types (feat→minor, fix→patch, breaking→major).\n4. Never force-push to shared branches; use \`--force-with-lease\` only on feature branches.`,
      },
      {
        id: 'monorepo-tooling-and-builds',
        category: 'DevOps & CI/CD',
        name: 'Monorepo Tooling & Build Orchestration',
        description: 'Monorepo package graph, deterministic builds, caching, and incremental CI pipeline design.',
        content: `# Monorepo Tooling & Build Orchestration\n\n1. Build Graph Awareness: only build, test, and lint packages affected by a change.\n2. Deterministic Outputs: pin toolchain versions, lockfiles for all package managers.\n3. Remote Caching: share build/test caches across CI runners to cut wall-clock time.\n4. Task Dependencies: model package dependents so release order is computable and safe.`,
      },
      {
        id: 'infrastructure-as-code-review',
        category: 'DevOps & CI/CD',
        name: 'Infrastructure-as-Code Review & Drift Control',
        description: 'Terraform plan review, module reuse, state safety, and configuration drift detection.',
        content: `# Infrastructure-as-Code Review & Drift Control\n\n1. Review plans, not apply: every change must be validated via \`terraform plan\` before apply.\n2. Module Reuse: compose resources from curated internal modules; no inline resource sprawl.\n3. State Safety: never hand-edit state; use lock and backup, and resource import for existing infra.\n4. Drift Detection: scheduled refresh + plan to surface manual out-of-band changes.`,
      },
      {
        id: 'database-schema-migration',
        category: 'Backend & APIs',
        name: 'Database Schema Migration & Zero-Downtime Apply',
        description: 'Expand/contract migrations, additive-only DDL, backfilling, and rollback strategy for production databases.',
        content: `# Database Schema Migration & Zero-Downtime Apply\n\n1. Additive DDL only: new columns nullable, new tables optional; no destructive changes in the same release.\n2. Backfill: large table backfills batched with index maintenance and progress tracking.\n3. Expand/Contract: expand (add column + dual write) → backfill → switch reads → contract (drop old).\n4. Rollback: every migration ships with an explicit revert script tested in CI.`,
      },
      {
        id: 'observability-dashboards-and-alerts',
        category: 'Observability & Debugging',
        name: 'Observability Dashboards & Alert Design',
        description: 'SLO-linked dashboards, alert thresholds, on-call burn-rate policies, and actionable runbooks.',
        content: `# Observability Dashboards & Alert Design\n\n1. SLO-first: alerts map to user-facing objectives, not raw metrics noise.\n2. Burn-Rate Alerts: multi-window burn rate (5m/1h/6h/3d) to catch fast and slow burn.\n3. Actionable Pages: every alert must describe symptom, likely cause, and first runbook step.\n4. Dashboard Hygiene: golden signals (latency, traffic, errors, saturation) + only what an on-call needs.`,
      },
      {
        id: 'api-security-owasp',
        category: 'Security & Hardening',
        name: 'API Security & OWASP API Top 10 Hardening',
        description: 'API authorization, rate limiting, schema validation, and injection defense for REST and GraphQL APIs.',
        content: `# API Security & OWASP API Top 10 Hardening\n\n1. Object-Level Authorization: verify entitlement on every object access; never trust client-supplied IDs.\n2. Rate Limiting: per-API-key sliding-window limits with 429 responses and retry headers.\n3. Schema Validation: strict input validation (types, lengths, enums) before processing.\n4. Injection Defense: parameterized queries, no raw string interpolation, safest defaults on parsers.`,
      },
      {
        id: 'zero-trust-iam-design',
        category: 'Security & Hardening',
        name: 'Zero-Trust IAM & Identity Lifecycle Design',
        description: 'SSO/SAML/OIDC federation, least-privilege roles, just-in-time access, and identity lifecycle reviews.',
        content: `# Zero-Trust IAM & Identity Lifecycle Design\n\n1. Federate Identity: single IdP (SSO) for all apps; no local password silos.\n2. Least Privilege: role-based access with approve workflow; default-deny for sensitive actions.\n3. Just-in-Time: temporary elevated access with expiry and audit trail.\n4. Lifecycle: automated deprovisioning on offboarding, entitlement reviews quarterly.`,
      },
      {
        id: 'cloud-cost-optimization-finops',
        category: 'Finance & Accounting',
        name: 'Cloud Cost Optimization & FinOps',
        description: 'Cost allocation tagging, right-sizing, savings plans, and cost anomaly detection for cloud spend.',
        content: `# Cloud Cost Optimization & FinOps\n\n1. Tag Everything: map cloud spend to teams, products, and cost centers from day one.\n2. Right-Sizing: match instance types to utilization; kill idle resources (unused clusters, orphaned volumes).\n3. Commitment Discounts: savings plans/reserved instances for steady-state predictable workloads.\n4. Anomaly Detection: daily spend change % alerting by tree/team with owner follow-up.`,
      },
      {
        id: 'kpi-dashboard-design',
        category: 'Data & Business Intelligence',
        name: 'KPI Dashboard & Executive Metric Design',
        description: 'North-star metric hierarchies, dashboard layout, data viz best practices, and annotation standards.',
        content: `# KPI Dashboard & Executive Metric Design\n\n1. Metric Hierarchy: one north-star metric with supporting drivers and guardrail metrics.\n2. Definitions: every metric has an explicit formula, source table, and owners.\n3. Visualization Choice: line for trends, bar for comparison, scatter for correlation; no pie clutter.\n4. Annotations: mark launches, incidents, and holidays on trend lines to prevent false attribution.`,
      },
      {
        id: 'data-warehouse-modeling',
        category: 'Data & Business Intelligence',
        name: 'Data Warehouse Dimensional Modeling',
        description: 'Star schema design, conformed dimensions, slowly changing dimensions, and fact grain decisions.',
        content: `# Data Warehouse Dimensional Modeling\n\n1. Grain First: declare fact table grain precisely before column design.\n2. Conformed Dimensions: shared dimensions used across marts with a single source of truth.\n3. SCD Handling: SCD1 (overwrite) for corrections, SCD2 (history) for tracked changes.\n4. Naming Conventions: consistent prefixes (fct_, dim_, m_) and explicit typing.`,
      },
      {
        id: 'a-b-testing-experimentation',
        category: 'Data & Business Intelligence',
        name: 'A/B Testing & Experimentation Rigor',
        description: 'Hypothesis framing, sample size estimation, guardrail metrics, and trustworthy experiment analysis.',
        content: `# A/B Testing & Experimentation Rigor\n\n1. Pre-Register: hypothesis, primary metric, variance, and minimum detectable effect before launch.\n2. Sample Size: compute required sample (power 80%, alpha 5%) before the experiment starts.\n3. Guardrails: track counter-metrics (latency, errors, engagement) beyond the primary target.\n4. Report Honestly: confidence intervals, not just p-values; call out peeking and novelty effects.`,
      },
      {
        id: 'customer-api-support-playbook',
        category: 'Customer Support & Success',
        name: 'Customer-Facing API Support Playbook',
        description: 'API troubleshooting triage, SDK bug reproduction, authentication issues, and escalation criteria.',
        content: `# Customer-Facing API Support Playbook\n\n1. Reproduce First: get exact request/response pairs before hypothesizing.\n2. Scope: validate auth (key/scope), rate limits, payload schema, and environment in isolation.\n3. SDK vs API: isolate whether SDK or raw API misbehaves.\n4. Escalate: clear criteria (platform outage, data loss, security) with repro package ready.`,
      },
      {
        id: 'customer-announcement-communication',
        category: 'Customer Support & Success',
        name: 'Customer-Facing Announcement Communication',
        description: 'Status pages, incident updates, feature announcements, and proactive notification drafting.',
        content: `# Customer-Facing Announcement Communication\n\n1. Incident Updates: lead with impact and ETA; plain language; no jargon burying.\n2. Feature Announcements: benefits-first framing with migration note if behavior changes.\n3. Channels: match severity to channel (status page → email → in-app toast).\n4. Tone: honest, calm, and specific; avoid corporate boilerplate.`,
      },
      {
        id: 'demand-generation-playbook',
        category: 'Sales & Marketing',
        name: 'Demand Generation & Campaign Playbook',
        description: 'Multi-channel campaign orchestration, funnel metrics, UTM governance, and budget allocation.',
        content: `# Demand Generation & Campaign Playbook\n\n1. Funnel Definition: TOFU/MOFU/BOFU with conversion baselines per stage.\n2. Channel Mix: align channel to funnel stage; measure blended CAC not single-channel vanity.\n3. UTM Governance: standardized UTM schema so analytics attribution stays clean.\n4. Budget Allocation: shift budget to highest ROI channels monthly with a documented logic.`,
      },
      {
        id: 'b2b-outbound-sequencing',
        category: 'Sales & Marketing',
        name: 'B2B Outbound Sales Sequencing',
        description: 'Multi-touch outbound cadences, personalization hooks, reply handling, and pipeline qualification.',
        content: `# B2B Outbound Sales Sequencing\n\n1. Multi-Touch Cadence: diverse channels (email, LinkedIn, call) staggered over days.\n2. Personalization Hooks: reference company-specific signal (funding, hiring, tech stack) per touch.\n3. Short & Specific: one clear ask per message; no walls of value props.\n4. Qualification: BANT/CHAMP framework to pass only qualified leads to AE stage.`,
      },
      {
        id: 'competitor-intelligence-playbook',
        category: 'Sales & Marketing',
        name: 'Competitor Intelligence & Win-Loss Analysis',
        description: 'Competitive landscape mapping, feature comparison matrices, battlecards, and win-loss interviews.',
        content: `# Competitor Intelligence & Win-Loss Analysis\n\n1. Landscape Map: categorize competitors (direct, partial, adjacent) with positioning lines.\n2. Battlecards: objection → evidence-backed response for the top 5 competitive scenarios.\n3. Win-Loss Interviews: bias-free surveys of recent closed deals; quantify why lost weigh vs won.\n4. GTM Signals: map competitor launches to response plans for sales enablement.`,
      },
      {
        id: 'contract-review-checklist',
        category: 'Legal & Compliance',
        name: 'Commercial Contract Review Checklist',
        description: 'MSA/SOW/DPA red-flag review, liability caps, indemnification, termination, and data processing terms.',
        content: `# Commercial Contract Review Checklist\n\n1. Define Scope: services, deliverables, acceptance criteria, and change control.\n2. Liability Caps: cap alignment with risk; carve-outs for confidentiality, IP, indemnity.\n3. Termination: for-cause, for-convenience notice periods, and post-termination obligations.\n4. Data: DPA alignment, processing purposes, sub-processor regime, and security obligations.`,
      },
      {
        id: 'privacy-impact-assessment',
        category: 'Legal & Compliance',
        name: 'Privacy Impact Assessment (PIA) Framework',
        description: 'DPIA/PIA workflows, data inventory, lawful basis mapping, and records of processing activities.',
        content: `# Privacy Impact Assessment (PIA) Framework\n\n1. Data Inventory: map categories of personal data, sources, flows, and retention.\n2. Lawful Basis: document basis per processing activity (consent, contract, legitimate interest).\n3. DPIA Triggers: high-risk processing (profiling, sensitive data, large scale) auto-triggers DPIA.\n4. Transfer: assess cross-border transfers and adequacy/appropriate safeguards.`,
      },
      {
        id: 'recruiting-sourcing-metrics',
        category: 'HR & People Operations',
        name: 'Recruiting Sourcing & Pipeline Metrics',
        description: 'Sourcing channel ROI, pipeline funnel metrics, offer acceptance optimization, and hiring SLA tracking.',
        content: `# Recruiting Sourcing & Pipeline Metrics\n\n1. Channel ROI: track cost-per-hire and quality-of-hire per source, not just volume.\n2. Funnel Health: application → screen → interview → offer → accept conversion with drop reasons.\n3. Offer Yield: monitor acceptance rate and time-to-accept; address gaps with the hiring manager.\n4. Hiring SLA: track time-to-fill by role and flag requisitions breaching targets.`,
      },
      {
        id: 'onboarding-offboarding-playbook',
        category: 'HR & People Operations',
        name: 'Employee Onboarding & Offboarding Playbook',
        description: 'First-day readiness, 30-60-90 plan, access provisioning checklist, and exit knowledge transfer.',
        content: `# Employee Onboarding & Offboarding Playbook\n\n1. Pre-Day-One: accounts, hardware, and workspace ready before the new hire arrives.\n2. 30-60-90 Plan: mapped expectations, stakeholders, and success criteria for each milestone.\n3. Technical Onboarding: environment, access, and first-commit guidance with a buddy.\n4. Offboarding: access revocation, knowledge transfer, exit survey, and return of assets on day one.`,
      },
      {
        id: 'performance-review-calibration',
        category: 'HR & People Operations',
        name: 'Performance Review & Calibration Framework',
        description: 'Review cycle design, rating calibration sessions, feedback quality, and development plan mapping.',
        content: `# Performance Review & Calibration Framework\n\n1. Continuous Input: gather feedback quarterly, not just once a year.\n2. Calibration Sessions: normalize ratings across managers to avoid inflation and bias.\n3. Feedback Quality: specific, observable, behavior-based; balanced and actionable.\n4. Development Plans: tie ratings to growth plans with concrete milestones and check-ins.`,
      },
      {
        id: 'compensation-benchmarking',
        category: 'HR & People Operations',
        name: 'Compensation Benchmarking & Equity Design',
        description: 'Market pay benchmarking, band design, equity philosophy, and promotion pay alignment.',
        content: `# Compensation Benchmarking & Equity Design\n\n1. Benchmark: use current market data by level/geo; refresh annually.\n2. Pay Bands: define min/mid/max per level with transparent promotion increments.\n3. Equity Philosophy: target grant value by level with refresh process and cliff/vesting schedule.\n4. Equity Audit: periodic pay-equity review across gender/ethnicity with corrective action.`,
      },
      {
        id: 'payroll-and-benefits-compliance',
        category: 'Finance & Accounting',
        name: 'Payroll & Benefits Compliance',
        description: 'Payroll run verification, statutory deductions, benefits enrollment windows, and compliance filings.',
        content: `# Payroll & Benefits Compliance\n\n1. Run Verification: reconcile hours, additions, deductions, and net pay before submission.\n2. Statutory Compliance: maintain correct tax tables, social security, and filing schedules.\n3. Benefits Enrollment: aligned windows, eligibility rules, and open-enrollment communications.\n4. Audit Trail: store payroll registers and approvals per jurisdiction requirements.`,
      },
      {
        id: 'budget-forecasting-fpna',
        category: 'Finance & Accounting',
        name: 'Budgeting & FP&A Forecasting',
        description: 'Bottom-up budgets, rolling forecasts, variance analysis, and scenario modeling.',
        content: `# Budgeting & FP&A Forecasting\n\n1. Bottom-Up Budget: department build with driver-based assumptions, not last-year + 10%.\n2. Rolling Forecast: 12-month forward view refreshed monthly with variance explanation.\n3. Variance Analysis: explain budget vs actual by driver (volume, price, mix) with ownership.\n4. Scenarios: base / upside / downside scenarios with explicit assumption deltas.`,
      },
      {
        id: 'stripe-billing-and-reconciliation',
        category: 'Finance & Accounting',
        name: 'Stripe Billing & Revenue Reconciliation',
        description: 'Subscription billing lifecycle, dunning, refunds, and revenue reconciliation with the general ledger.',
        content: `# Stripe Billing & Revenue Reconciliation\n\n1. Billing Lifecycle: trial → subscribe → invoice → payment → retry → churn with clear states.\n2. Dunning: smart retry schedules and recovery webhooks, not raw charge retries.\n3. Reconciliation: match Stripe payout summary to GL entries; flag discrepancies monthly.\n4. Refunds & Credits: auditable approval flow with reason codes and tax handling.`,
      },
      {
        id: 'enterprise-saas-contract-review',
        category: 'Legal & Compliance',
        name: 'Enterprise SaaS Contract Negotiation Review',
        description: 'SaaS subscription terms review, SLAs, data residency, renewal terms, and enterprise-specific addenda.',
        content: `# Enterprise SaaS Contract Negotiation Review\n\n1. Subscription Terms: license scope, user definition, and overage handling.\n2. Service Levels: uptime SLA tied to credits matrix; support tiers defined.\n3. Data & Security: data residency, encryption, access, audit rights, and breach notification.\n4. Renewal & Expansion: notice periods, price protection, and enterprise commitments.`,
      },
      {
        id: 'product-analytics-funnels',
        category: 'Data & Business Intelligence',
        name: 'Product Analytics & Funnel Optimization',
        description: 'Event taxonomy, funnel analysis, activation loops, retention cohorts, and product instrumentation.',
        content: `# Product Analytics & Funnel Optimization\n\n1. Event Taxonomy: consistent naming (verb_noun) with properties schema governed centrally.\n2. Funnel Steps: define each step unambiguously with entry/exit criteria.\n3. Activation: identify the first-value moment and its time-to-activation.\n4. Retention Cohorts: weekly/batch cohorts to spot where activation quality decays.`,
      },
      {
        id: 'experimentation-analysis',
        category: 'Data & Business Intelligence',
        name: 'Experiment Analysis & Causal Inference',
        description: 'Proper experiment analysis, regression control, heterogeneity, and long-term effect estimation.',
        content: `# Experiment Analysis & Causal Inference\n\n1. Guardrail First: check invariant and guardrail metrics before primary lift.\n2. CUPED/Regression: control for pre-experiment covariates to reduce variance.\n3. Heterogeneity: analyze treatment effect by segment only when pre-specified.\n4. Long-Term Effects: plan delayed-outcome follow-up; don't ship on short-term only.`,
      },
      {
        id: 'access-reviews-recertification',
        category: 'Security & Hardening',
        name: 'Access Reviews & Recertification',
        description: 'Structured access certification campaigns, orphan account cleanup, and privileged access reviews.',
        content: `# Access Reviews & Recertification\n\n1. Campaign Design: scope (systems, groups), owners, and review cadence per data sensitivity.\n2. Reviewer Support: role-context dashboards so reviewers act on evidence, not memory.\n3. Cleanup Enforcement: remove unreviewed/orphaned entitlements automatically after deadline.\n4. Privileged Access: dedicated review with mandatory approval and session recording.`,
      },
      {
        id: 'incident-response-playbook',
        category: 'Security & Hardening',
        name: 'Security Incident Response Playbook',
        description: 'Incident classification, containment, eradication, evidence preservation, and post-incident review.',
        content: `# Security Incident Response Playbook\n\n1. Triage: classify severity (P1-P4) and gather initial scope, blast radius, and impact.\n2. Contain: isolate affected systems with minimal user disruption; preserve evidence (logs, snapshots).\n3. Eradicate & Recover: remove root cause, rotate credentials, restore from clean state.\n4. Post-Incident: timeline, root cause, action items, and retro with measurable owners.`,
      },
      {
        id: 'red-team-pentest-scoping',
        category: 'Security & Hardening',
        name: 'Red Team & Penetration Test Scoping',
        description: 'Test scope definition, rules of engagement, asset inventory, findings taxonomy, and report quality.',
        content: `# Red Team & Penetration Test Scoping\n\n1. Scope: define in-scope assets, out-of-scope systems, and allowed techniques explicitly.\n2. Rules of Engagement: hours, notification channels, and stop conditions.\n3. Findings: severity-rated (CVSS), reproducible steps, and business impact per finding.\n4. Report: executive summary + technical detail + prioritized remediation roadmap.`,
      },
      {
        id: 'threat-modeling-stride',
        category: 'Security & Hardening',
        name: 'Threat Modeling & STRIDE Analysis',
        description: 'Data flow modeling, STRIDE per element, attack tree construction, and countermeasure mapping.',
        content: `# Threat Modeling & STRIDE Analysis\n\n1. Data Flows: draw system context and trust boundaries; enumerate assets per flow.\n2. STRIDE: apply Spoofing/Tampering/Repudiation/Info Disclosure/DoS/Elevation per element.\n3. Attack Trees: enumerate attacker paths to each key asset.\n4. Countermeasures: map mitigations to threats; prioritize by likelihood × impact.`,
      },
      {
        id: 'ci-cd-security-gates',
        category: 'DevOps & CI/CD',
        name: 'CI/CD Security & Supply-Chain Gates',
        description: 'Pipeline hardening, secret scanning, dependency auditing, SBOM, and artifact signing.',
        content: `# CI/CD Security & Supply-Chain Gates\n\n1. Secret Scanning: block secrets in code at push/PR time; rotate on exposure.\n2. Dependency Audit: fail builds on critical CVEs; pin transitive deps with lockfiles.\n3. SBOM & Signing: generate SBOMs and sign artifacts; verify on deploy.\n4. Pipeline Privilege: least-privilege CI runners; never embed long-lived credentials.`,
      },
      {
        id: 'vulnerability-management-triage',
        category: 'Security & Hardening',
        name: 'Vulnerability Management & Triage',
        description: 'CVE triage, exposure scoring, patch prioritization, and remediation SLAs.',
        content: `# Vulnerability Management & Triage\n\n1. Exposure Score: prioritize by reachability/exploitability, not CVSS alone.\n2. Triage Queue: SLA by severity (critical 24h, high 7d, medium 30d).\n3. Patch Management: track patch availability vs deployed versions.\n4. Verification: confirm remediation with rescan and evidence snapshot.`,
      },
      {
        id: 'customer-onboarding-experience',
        category: 'Customer Support & Success',
        name: 'Customer Onboarding Experience Design',
        description: 'Onboarding journey mapping, activation KPIs, milestone-based success plans, and time-to-value.',
        content: `# Customer Onboarding Experience Design\n\n1. Journey Map: step-by-step onboarding with friction points and support touchpoints.\n2. Activation KPI: define the first-value moment and measure time-to-value.\n3. Success Plan: milestone-based plan (setup → integrate → configure → launch).\n4. Proactive Check-ins: scheduled touchpoints at critical milestones, not ad hoc.`,
      },
      {
        id: 'csat-nps-improvement',
        category: 'Customer Support & Success',
        name: 'CSAT & NPS Improvement Program',
        description: 'Survey design, response bias control, driver analysis, and closed-loop customer feedback.',
        content: `# CSAT & NPS Improvement Program\n\n1. Survey Cadence: transactional (post-ticket) + relational (quarterly) surveys.\n2. Bias Control: consistent sampling, avoid only-ask-on-positive-outcome bias.\n3. Driver Analysis: correlate scores with touchpoint, journey stage, and product usage.\n4. Closed-Loop: respond to detractors with a concrete action plan and re-measure.`,
      },
      {
        id: 'knowledge-base-authoring',
        category: 'Customer Support & Success',
        name: 'Knowledge Base & Help Center Authoring',
        description: 'Help article structure, search optimization, self-service coverage, and content maintenance.',
        content: `# Knowledge Base & Help Center Authoring\n\n1. Article Structure: symptom → cause → fix; single answer per article, example-led.\n2. Self-Service ROI: track deflection rate and update high-traffic articles first.\n3. Search Optimization: mirror customer vocabulary in titles; add synonyms and FAQs.\n4. Maintenance: regular content audits; deprecated steps marked and purged.`,
      },
      {
        id: 'social-media-engagement',
        category: 'Sales & Marketing',
        name: 'Social Media & Community Engagement',
        description: 'Platform-native content, community management, sentiment monitoring, and engagement analytics.',
        content: `# Social Media & Community Engagement\n\n1. Platform-Native: tailor format/cadence per platform; no cross-post spam.\n2. Community Management: response SLAs, brand voice, and escalation for crisis posts.\n3. Sentiment Monitoring: track brand mentions and sentiment trends weekly.\n4. Content Calibration: double down on what resonates; pause what flops.`,
      },
      {
        id: 'email-deliverability-optimization',
        category: 'Sales & Marketing',
        name: 'Email Deliverability & Inbox Placement',
        description: 'SPF/DKIM/DMARC, warmup, list hygiene, engagement metrics, and sender reputation monitoring.',
        content: `# Email Deliverability & Inbox Placement\n\n1. Authentication: align SPF, DKIM, and DMARC (p=quarantine+); monitor DNS.\n2. List Hygiene: remove inactive/unengaged subscribers; honor suppression files.\n3. Engagement Signals: high opens/clicks with low spam complaints and unsubscribes.\n4. Reputation: monitor sender score and blocklist status; dip-response plan ready.`,
      },
      {
        id: 'technical-writing-architecture',
        category: 'Backend & APIs',
        name: 'Technical Writing & API Documentation',
        description: 'API reference structure, getting-started guides, code samples, and docs-as-code workflows.',
        content: `# Technical Writing & API Documentation\n\n1. Reference Structure: endpoints, auth, errors, rate limits; consistent parameter tables.\n2. Getting Started: 5-minute value path with cut-paste working example first.\n3. Docs-as-Code: version docs with code; lint and build in CI.\n4. Accuracy: samples are tested in CI; deprecations marked and migrated.`,
      },
      {
        id: 'website-optimization-seo',
        category: 'Sales & Marketing',
        name: 'Website Copy & SEO On-Page Optimization',
        description: 'On-page SEO, meta/data structure, content intent mapping, and search-leading copywriting.',
        content: `# Website Copy & SEO On-Page Optimization\n\n1. Intent Mapping: match page type to search intent (informational/navigational/transactional).\n2. On-Page: title/meta/H1 alignment, internal linking, schema structured data.\n3. Copy: benefit-led headings, scannable structure, clear CTAs.\n4. Performance: Core Web Vitals gate; technical issues surfaced before content investment.`,
      },
      {
        id: 'people-analytics-reporting',
        category: 'HR & People Operations',
        name: 'People Analytics & Workforce Reporting',
        description: 'Headcount planning, attrition analysis, time-to-hire, and org health metric reporting.',
        content: `# People Analytics & Workforce Reporting\n\n1. Headcount: plan vs actual by team, level, and location; attrition factored.\n2. Attrition: voluntary vs involuntary with exit themes; retention risk heatmap.\n3. Pipeline: time-to-hire, offer acceptance, and source quality by role.\n4. Org Health: span of control, tenure distribution, and engagement correlation.`,
      },
      {
        id: 'learning-development-programs',
        category: 'HR & People Operations',
        name: 'Learning & Development Program Design',
        description: 'Skills taxonomy, learning paths, program ROI, and career progression mapping.',
        content: `# Learning & Development Program Design\n\n1. Skills Taxonomy: map required skills per role with proficiency levels.\n2. Learning Paths: practical, project-based paths tied to career progression.\n3. Program ROI: participation, completion, and behavior change metrics.\n4. Career Mapping: transparent criteria connecting L&D to promotion readiness.`,
      },
      {
        id: 'employee-engagement-surveys',
        category: 'HR & People Operations',
        name: 'Employee Engagement & Pulse Survey Program',
        description: 'Survey design, response analysis, action planning, and follow-through measurement.',
        content: `# Employee Engagement & Pulse Survey Program\n\n1. Survey Design: valid scales, benchmarked dimensions, and minimal fatigue.\n2. Response Analysis: segment by team/tenure; look at themes, not just scores.\n3. Action Plans: every workgroup owns one actionable theme with an owner.\n4. Follow-Through: re-measure and report what changed after each cycle.`,
      },
      {
        id: 'generative-ai-governance',
        category: 'Legal & Compliance',
        name: 'Generative AI & Usage Governance',
        description: 'AI usage policies, data handling in LLM tools, model documentation, and acceptable-use controls.',
        content: `# Generative AI & Usage Governance\n\n1. Acceptable Use: clear policy for internal vs external-facing AI use and data classes.\n2. Data Handling: prohibit sensitive data in third-party AI tools; maintain allowlist.\n3. Documentation: published model purpose/limitations/applicability per use case.\n4. Controls: human review requirements, logging, and periodic compliance audits.`,
      },
      {
        id: 'vendor-security-assessment',
        category: 'Security & Hardening',
        name: 'Vendor Security Assessment & Due Diligence',
        description: 'Vendor risk questionnaire, evidence review, SLA security terms, and ongoing monitoring.',
        content: `# Vendor Security Assessment & Due Diligence\n\n1. Questionnaires: tiered by data processed; standard + light versions.\n2. Evidence Review: SOC2, pentest reports, certifications, and exception acceptance.\n3. Contract Terms: security addenda aligned to data sensitivity (encryption, breach notification, audit rights).\n4. Ongoing Monitoring: reassess on material changes and periodically for critical vendors.`,
      },
      {
        id: 'it-asset-lifecycle-management',
        category: 'Operations & IT Admin',
        name: 'IT Asset Lifecycle Management',
        description: 'Hardware provisioning, asset tracking, refresh cycles, and disposal compliance.',
        content: `# IT Asset Lifecycle Management\n\n1. Provision: standard hardware bundles per role with preconfigured MDM enrollment.\n2. Track: real-time asset inventory (serial, owner, location, status) with audits.\n3. Refresh: predictable replacement cycles; critical hardware flagged for early swap.\n4. Disposal: secure data wipe, certified recycling, and compliance records.`,
      },
      {
        id: 'helpdesk-sla-optimization',
        category: 'Operations & IT Admin',
        name: 'Helpdesk SLA & Ticket Optimization',
        description: 'Tier routing, first-response SLA, resolution paths, and IT satisfaction measurement.',
        content: `# Helpdesk SLA & Ticket Optimization\n\n1. Tier Routing: L1 triage, L2 deep troubleshooting, L3/infra escalation rules.\n2. SLA Adherence: first-response and resolution SLAs with hourly breach alerts.\n3. Resolution Paths: standard runbooks for top ticket categories.\n4. Satisfaction: post-resolution CSAT with driver feedback loop.`,
      },
      {
        id: 'system-admin-hardening',
        category: 'Operations & IT Admin',
        name: 'Mac/Windows System Administration & Hardening',
        description: 'OS provisioning, patch management, backup verification, and end-user troubleshooting.',
        content: `# Mac/Windows System Administration & Hardening\n\n1. Provisioning: image/deploy with standard security baseline (FileVault/BitLocker, firewall, updates).\n2. Patch Management: automated update deployment with staged rollout and rollback.\n3. Backups: verified backups for critical user data with restore test cadence.\n4. Troubleshooting: systematic triage (hardware → OS → app → network) before reinstalling.`,
      },
      {
        id: 'proofreader-quality-gate',
        category: 'Review & Code Quality',
        name: 'Proofreading & Quality Gate Review',
        description: 'Grammar, tone, accuracy, and consistency review across docs, copy, and communications.',
        content: `# Proofreading & Quality Gate Review\n\n1. Accuracy: verify facts, numbers, and names against the source of truth.\n2. Style: consistent tone/tense; remove jargon, passive clutter, and redundancy.\n3. Consistency: terminology, acronyms, and formatting follow the style guide.\n4. Structure: logical flow, clear headings, and scannable formatting.`,
      },
    ];

    for (const skill of expandedEnterpriseSkills) {
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
