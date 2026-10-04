import type { StockSkillItem, ToolKit } from './library.types.js';

export const STOCK_SKILLS: StockSkillItem[] = [
  { id: 'code-reviewer', name: 'Code Reviewer', description: 'Expert code review: security, performance, style feedback.', category: 'Engineering', tags: ['code', 'review'], content: '# Code Review Directive\n\nYou are an expert code reviewer. For every code change:\n1. Check for security vulnerabilities (SQLi, XSS, SSRF)\n2. Identify performance anti-patterns\n3. Verify naming conventions\n4. Suggest improvements with code examples\n5. Rate severity: Critical / Major / Minor / Suggestion' },
  { id: 'git-commit-writer', name: 'Git Commit Author', description: 'Write conventional commits with scope and breaking changes.', category: 'Engineering', tags: ['git', 'commits'], content: '# Commit Message Directive\n\nFollow Conventional Commits spec:\n- Format: <type>(<scope>): <summary>\n- Types: feat, fix, docs, style, refactor, test, chore\n- Breaking changes: BREAKING CHANGE footer\n- Keep summary under 72 chars' },
  { id: 'test-engineer', name: 'Test Engineer', description: 'Generate unit, integration, and E2E test suites.', category: 'Engineering', tags: ['testing', 'jest'], content: '# Testing Directive\n\nWrite production-quality tests:\n1. Unit tests with mocks/stubs\n2. Integration: real service boundaries\n3. E2E: user journey scenarios\n4. Edge cases: empty, null, overflow\n5. Target >90% branch coverage' },
  { id: 'security-auditor', name: 'Security Auditor', description: 'OWASP Top 10 audits, CVE triage, and hardening.', category: 'Security', tags: ['security', 'owasp'], content: '# Security Audit Directive\n\n1. OWASP Top 10 assessment\n2. Dependency CVE scanning\n3. Auth and session management review\n4. Secrets/credentials exposure check\n5. Network attack surface mapping' },
  { id: 'api-designer', name: 'API Designer', description: 'REST and GraphQL API design with OpenAPI docs.', category: 'Engineering', tags: ['api', 'rest', 'openapi'], content: '# API Design Directive\n\n1. RESTful resource naming\n2. Proper HTTP status codes\n3. Versioning strategy\n4. Cursor-based pagination\n5. Generate OpenAPI 3.1 spec' },
  { id: 'devops-engineer', name: 'DevOps Engineer', description: 'CI/CD pipelines, Terraform IaC, and deployment automation.', category: 'DevOps', tags: ['cicd', 'terraform'], content: '# DevOps Directive\n\n1. GitHub Actions / GitLab CI YAML\n2. Terraform HCL for cloud resources\n3. Helm charts for Kubernetes\n4. Multi-stage Dockerfiles\n5. Blue-green and canary deployments' },
  { id: 'data-analyst', name: 'Data Analyst', description: 'SQL analysis, KPI calculation, and BI queries.', category: 'Data', tags: ['sql', 'analytics'], content: '# Data Analysis Directive\n\n1. Optimized SQL with CTEs, window functions\n2. Business KPIs (CAC, LTV, churn)\n3. Statistical outlier detection\n4. A/B test design\n5. Results formatted as markdown tables' },
  { id: 'copywriter', name: 'Marketing Copywriter', description: 'High-converting copy for emails, pages, and social.', category: 'Marketing', tags: ['copy', 'marketing'], content: '# Copywriting Directive\n\n1. Lead with customer pain/benefit\n2. Use PAS framework\n3. Action-oriented CTAs\n4. A/B headline variants\n5. Adapt tone: B2B formal vs B2C casual' },
  { id: 'customer-support', name: 'Support Agent', description: 'Empathetic support with escalation awareness.', category: 'Support', tags: ['support', 'customer'], content: "# Customer Support Directive\n\n1. Acknowledge and validate the concern\n2. Diagnose root cause from context\n3. Provide step-by-step resolution\n4. Set clear timeline expectations\n5. Escalate if: data loss, enterprise SLA, security" },
  { id: 'research-assistant', name: 'Research Assistant', description: 'Deep-dive research with citations and summaries.', category: 'Productivity', tags: ['research', 'citations'], content: '# Research Directive\n\n1. Search multiple sources\n2. Cross-validate facts across 3+ sources\n3. Cite all sources with URLs\n4. Structure: TL;DR -> Key Findings -> Details\n5. Flag conflicting information' },
  { id: 'incident-responder', name: 'Incident Responder', description: 'Runbooks, postmortem templates, and RCA workflows.', category: 'DevOps', tags: ['incident', 'oncall'], content: '# Incident Response Directive\n\n1. Severity classification (P0-P4)\n2. Timeline reconstruction from logs\n3. Root cause analysis (5 Whys)\n4. Runbook for remediation\n5. Postmortem with action items' },
  { id: 'financial-analyst', name: 'Financial Analyst', description: 'P&L analysis, cash flow modeling, due diligence.', category: 'Finance', tags: ['finance', 'modeling'], content: '# Financial Analysis Directive\n\n1. P&L breakdown with YoY variance\n2. Cash flow and burn rate modeling\n3. Unit economics (CAC, LTV, payback)\n4. Competitive benchmarking\n5. Risk sensitivity analysis' },
];

/**
 * Toolkits are curated bundles of REAL built-in tool names (see BUILTIN_TOOLS).
 * Dropping one onto an agent re-enables exactly those tools by pruning them from
 * the agent's `disabled_tools` list — names here must match BUILTIN_TOOLS exactly.
 */
export const TOOL_KITS: ToolKit[] = [
  {
    id: 'navigator',
    name: 'Code Navigator',
    description: 'Read-only exploration: browse, search, and map the codebase.',
    color: '#06b6d4',
    tools: ['read_file', 'list_dir', 'inspect_dir', 'glob_find', 'grep_search'],
  },
  {
    id: 'editor',
    name: 'Code Editor',
    description: 'Surgical source edits including patches and line-range replacement.',
    color: '#f97316',
    tools: ['read_file', 'write_file', 'edit_file', 'line_edit', 'replace_lines', 'apply_patch'],
  },
  {
    id: 'files',
    name: 'File Management',
    description: 'Full CRUD over workspace files, including safe deletion.',
    color: '#8b5cf6',
    tools: ['read_file', 'write_file', 'delete_file', 'list_dir', 'inspect_dir'],
  },
  {
    id: 'shell',
    name: 'Shell & Terminal',
    description: 'Execute bash commands and inspect exit codes.',
    color: '#22d3ee',
    tools: ['run_command'],
  },
  {
    id: 'testing',
    name: 'Test Runner',
    description: 'Run project test suites and analyze pass/fail statistics.',
    color: '#10b981',
    tools: ['run_test', 'run_command', 'todo_write'],
  },
  {
    id: 'git',
    name: 'Git Workflow',
    description: 'Inspect working tree, diffs, and commit history.',
    color: '#ef4444',
    tools: ['git_status', 'git_diff', 'git_log'],
  },
  {
    id: 'planning',
    name: 'Planner & Tracker',
    description: 'Maintain TODOs, manage sub-contexts, and finalize cleanly.',
    color: '#a78bfa',
    tools: ['todo_write', 'context_manage', 'ask_user', 'finish_task'],
  },
  {
    id: 'toolbelt',
    name: 'Skills & MCP Access',
    description: 'Discover and activate skills and request MCP approvals.',
    color: '#f59e0b',
    tools: ['mcp_inspect', 'mcp_approve', 'skill_list', 'skill_use'],
  },
  {
    id: 'autonomy',
    name: 'Full Autonomy',
    description: 'Unlock every built-in tool for unsupervised operation.',
    color: '#ec4899',
    tools: [
      'read_file', 'write_file', 'edit_file', 'line_edit', 'replace_lines',
      'apply_patch', 'delete_file', 'list_dir', 'inspect_dir', 'run_command',
      'run_test', 'glob_find', 'grep_search', 'git_status', 'git_diff',
      'git_log', 'ask_user', 'context_manage', 'finish_task', 'todo_write',
      'mcp_inspect', 'mcp_approve', 'skill_list', 'skill_use',
    ],
  },
];
