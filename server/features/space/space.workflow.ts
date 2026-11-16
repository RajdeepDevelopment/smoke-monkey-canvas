import type { AgentDb } from '../agent/agent.db.js';
import type { AgentRecord } from '../agent/agent.types.js';
import { checkAgentConfigStatus } from '../agent/agent.config-check.js';
import type { SpaceDb } from './space.db.js';
import {
  lookupDedicatedCompanyWorkflow,
  DEDICATED_COMPANY_WORKFLOWS,
  type CompanyWorkflowDefinition,
} from './company-workflows.data.js';
import type {
  SpaceWorkspacePrompt,
  SpaceWorkflow,
  SpaceZone,
  WorkflowAgentCapability,
  WorkflowDelegationRoute,
  WorkflowTreeZone,
  ZoneDelegationPolicy,
} from './space.types.js';

export function isPointInZone(
  agentX: number,
  agentY: number,
  zoneX: number,
  zoneY: number,
  zoneW: number,
  zoneH: number,
): boolean {
  if (
    agentX >= zoneX - 30 &&
    agentX <= zoneX + zoneW &&
    agentY >= zoneY - 30 &&
    agentY <= zoneY + zoneH
  ) {
    return true;
  }

  const podCenterX = agentX + 60;
  const podCenterY = agentY + 50;
  if (
    podCenterX >= zoneX &&
    podCenterX <= zoneX + zoneW &&
    podCenterY >= zoneY &&
    podCenterY <= zoneY + zoneH
  ) {
    return true;
  }

  const cardCenterX = agentX + 180;
  const cardCenterY = agentY + 80;
  if (
    cardCenterX >= zoneX &&
    cardCenterX <= zoneX + zoneW &&
    cardCenterY >= zoneY &&
    cardCenterY <= zoneY + zoneH
  ) {
    return true;
  }

  const cardW = 300;
  const cardH = 150;
  const overlapX = Math.max(0, Math.min(agentX + cardW, zoneX + zoneW) - Math.max(agentX, zoneX));
  const overlapY = Math.max(0, Math.min(agentY + cardH, zoneY + zoneH) - Math.max(agentY, zoneY));
  return overlapX * overlapY >= 4000;
}

export function resolveAgentZone(agent: AgentRecord, zones: SpaceZone[]): SpaceZone | null {
  const matches = zones.filter((zone) =>
    isPointInZone(agent.pos_x, agent.pos_y, zone.x, zone.y, zone.width, zone.height),
  );
  if (matches.length === 0) return null;
  matches.sort((a, b) => b.level - a.level || a.width * a.height - b.width * b.height);
  return matches[0];
}

function connectionKey(a: string, b: string): string {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

function cleanLine(value: string | null | undefined, max = 240): string {
  if (!value) return '';
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1)}…`;
}

function findAncestorWithMembers(
  zone: SpaceZone,
  zoneMap: Map<string, SpaceZone>,
  membersByZone: Map<string, AgentRecord[]>,
  visited = new Set<string>(),
): SpaceZone | null {
  if (visited.has(zone.id)) return null;
  visited.add(zone.id);
  if (!zone.parentZoneId) return null;
  const parent = zoneMap.get(zone.parentZoneId);
  if (!parent) return null;
  if ((membersByZone.get(parent.id)?.length ?? 0) > 0) return parent;
  return findAncestorWithMembers(parent, zoneMap, membersByZone, visited);
}

function collectDescendantMembers(
  zone: SpaceZone,
  zonesByParent: Map<string, SpaceZone[]>,
  membersByZone: Map<string, AgentRecord[]>,
  visited = new Set<string>(),
): AgentRecord[] {
  if (visited.has(zone.id)) return [];
  visited.add(zone.id);
  const result: AgentRecord[] = [];
  for (const child of zonesByParent.get(zone.id) ?? []) {
    const members = membersByZone.get(child.id) ?? [];
    if (members.length > 0) {
      result.push(...members);
    } else {
      result.push(...collectDescendantMembers(child, zonesByParent, membersByZone, visited));
    }
  }
  return result;
}

function resolveAllowedIds(
  policy: ZoneDelegationPolicy,
  managerIds: string[],
  reportIds: string[],
  peerIds: string[],
): string[] {
  const ids = new Set<string>();
  if (policy === 'down') {
    reportIds.forEach((id) => ids.add(id));
    peerIds.forEach((id) => ids.add(id));
  } else if (policy === 'up') {
    managerIds.forEach((id) => ids.add(id));
  } else if (policy === 'peers') {
    peerIds.forEach((id) => ids.add(id));
  } else if (policy === 'both') {
    managerIds.forEach((id) => ids.add(id));
    reportIds.forEach((id) => ids.add(id));
    peerIds.forEach((id) => ids.add(id));
  } else {
    reportIds.forEach((id) => ids.add(id));
    peerIds.forEach((id) => ids.add(id));
    managerIds.forEach((id) => ids.add(id));
  }
  return [...ids];
}

function buildCapabilities(
  agents: AgentRecord[],
  db: AgentDb,
): Map<string, WorkflowAgentCapability> {
  const capabilities = new Map<string, WorkflowAgentCapability>();
  for (const agent of agents) {
    const config = checkAgentConfigStatus(agent.id, db);
    const mcps = db
      .getAgentMcps(agent.id)
      .filter((m) => m.enabled === 1)
      .map((m) => m.label || m.mcp_name);
    const skills = db
      .getAgentSkills(agent.id)
      .filter((s) => s.enabled === 1)
      .map((s) => s.skill_name);
    capabilities.set(agent.id, {
      id: agent.id,
      name: agent.name,
      role: agent.role ?? null,
      specialty: agent.specialty ?? null,
      description: agent.description ?? null,
      status: agent.status,
      model: agent.model,
      provider: agent.provider,
      workingDir: agent.working_dir ?? null,
      skills,
      mcps,
      isConfigured: config.isConfigured,
      configIssues: config.reasons,
    });
  }
  return capabilities;
}

export function buildSpaceWorkflow(
  db: AgentDb,
  spaceDb: SpaceDb,
  targetSpaceId?: string | null,
): SpaceWorkflow {
  // Isolate zones: if targetSpaceId is specified, fetch only zones belonging to that company space
  const zones = targetSpaceId ? spaceDb.getZones(targetSpaceId) : spaceDb.getZones();
  const allAgents = db.getAllAgents();
  const connections = db.getAgentConnections();

  // Isolate agents: if targetSpaceId is specified, include only agents that belong to this space
  let agents: AgentRecord[];
  if (targetSpaceId) {
    const memberIds = new Set(spaceDb.getSpaceAgentIds(targetSpaceId));
    const targetSpace = spaceDb.getWorkspaceSpace(targetSpaceId);
    agents = allAgents.filter((agent) => {
      if (memberIds.has(agent.id)) return true;
      if (typeof agent.pos_x === 'number' && typeof agent.pos_y === 'number') {
        if (resolveAgentZone(agent, zones) !== null) return true;
        if (
          targetSpace &&
          agent.pos_x >= targetSpace.x - 30 &&
          agent.pos_x <= targetSpace.x + targetSpace.width + 30 &&
          agent.pos_y >= targetSpace.y - 30 &&
          agent.pos_y <= targetSpace.y + targetSpace.height + 30
        ) {
          return true;
        }
      }
      return false;
    });
  } else {
    agents = allAgents;
  }

  const zoneMap = new Map(zones.map((z) => [z.id, z]));
  const zonesByParent = new Map<string, SpaceZone[]>();
  for (const zone of zones) {
    const parentId = zone.parentZoneId ?? '__root__';
    const list = zonesByParent.get(parentId) ?? [];
    list.push(zone);
    zonesByParent.set(parentId, list);
  }

  const capabilities = buildCapabilities(agents, db);
  const membersByZone = new Map<string, AgentRecord[]>();
  const agentZone = new Map<string, SpaceZone>();
  const unassigned: AgentRecord[] = [];
  for (const agent of agents) {
    const zone = resolveAgentZone(agent, zones);
    if (!zone) {
      unassigned.push(agent);
      continue;
    }
    agentZone.set(agent.id, zone);
    const list = membersByZone.get(zone.id) ?? [];
    list.push(agent);
    membersByZone.set(zone.id, list);
  }

  const pairKeys = new Set(
    connections.map((c) => connectionKey(c.source_agent_id, c.target_agent_id)),
  );
  const isConnected = (a: string, b: string) => pairKeys.has(connectionKey(a, b));

  const routes: WorkflowDelegationRoute[] = [];
  for (const agent of agents) {
    const zone = agentZone.get(agent.id) ?? null;
    if (!zone) {
      routes.push({
        agentId: agent.id,
        zoneId: null,
        zoneRole: null,
        policy: null,
        managerIds: [],
        reportIds: [],
        peerIds: [],
        escalationIds: [],
        blockedIds: [],
        connectedIds: [],
      });
      continue;
    }

    const managerZone = findAncestorWithMembers(zone, zoneMap, membersByZone);
    const managerIds = (managerZone ? membersByZone.get(managerZone.id) ?? [] : [])
      .map((a) => a.id)
      .filter((id) => id !== agent.id);
    const reportIds = collectDescendantMembers(zone, zonesByParent, membersByZone)
      .map((a) => a.id)
      .filter((id) => id !== agent.id);
    const peerIds = (membersByZone.get(zone.id) ?? [])
      .map((a) => a.id)
      .filter((id) => id !== agent.id);
    const allowedIds = resolveAllowedIds(zone.delegationPolicy, managerIds, reportIds, peerIds);
    routes.push({
      agentId: agent.id,
      zoneId: zone.id,
      zoneRole: zone.roleTitle,
      policy: zone.delegationPolicy,
      managerIds,
      reportIds,
      peerIds,
      escalationIds: managerIds,
      blockedIds: [],
      connectedIds: allowedIds.filter((id) => capabilities.has(id) && isConnected(agent.id, id)),
    });
  }

  const treeZones: WorkflowTreeZone[] = zones.map((zone) => ({
    id: zone.id,
    name: zone.name,
    roleTitle: zone.roleTitle,
    level: zone.level,
    parentZoneId: zone.parentZoneId,
    color: zone.color,
    responsibilities: zone.responsibilities,
    workflowInstructions: zone.workflowInstructions,
    project: {
      repoUrl: zone.repoUrl,
      workingDir: zone.workingDir,
      brief: zone.projectBrief,
    },
    delegationPolicy: zone.delegationPolicy,
    members: (membersByZone.get(zone.id) ?? [])
      .map((a) => capabilities.get(a.id))
      .filter((c): c is WorkflowAgentCapability => Boolean(c)),
    childZoneIds: (zonesByParent.get(zone.id) ?? []).map((z) => z.id),
  }));

  return {
    generatedAt: new Date().toISOString(),
    totalAgents: agents.length,
    totalZones: zones.length,
    zones: treeZones,
    unassignedAgents: unassigned
      .map((a) => capabilities.get(a.id))
      .filter((c): c is WorkflowAgentCapability => Boolean(c)),
    routes,
    connections: connections.map((c) => ({
      sourceAgentId: c.source_agent_id,
      targetAgentId: c.target_agent_id,
    })),
  };
}

export interface CompanyOperatingModel {
  industry: string;
  tenets: string[];
  qualityGates: string[];
  executionRules: string[];
}

export function resolveCompanyOperatingModel(
  space?: { name?: string; description?: string; category?: string } | null,
  promptText?: string,
): CompanyOperatingModel {
  const text = `${space?.name ?? ''} ${space?.category ?? ''} ${space?.description ?? ''} ${promptText ?? ''}`.toLowerCase();

  if (text.includes('fintech') || text.includes('bank') || text.includes('trading') || text.includes('ledger') || text.includes('risk') || text.includes('aegis')) {
    return {
      industry: 'FinTech, Institutional Banking & Quantitative Trading',
      tenets: [
        'Zero tolerance for mathematical or accounting error — every ledger operation must follow double-entry reconciliation.',
        'Four-Eyes Principle: Critical ledger balance alterations, risk threshold adjustments, and model deployments require dual authorization.',
        'Strict regulatory compliance: Align with SOX, PCI-DSS, AML/BSA, and Basel III capital adequacy covenants.',
      ],
      qualityGates: [
        'Transaction idempotency verification: all payment APIs must handle network retries without duplicate charging.',
        'Real-time VaR and exposure limits: trading positions must remain within assigned risk mandates.',
        'Audit vault immutability: record every state change with complete non-repudiation timestamps.',
      ],
      executionRules: [
        'Never commit financial calculations without automated unit verification.',
        'Compliance and Risk Leads hold absolute veto authority over non-compliant actions.',
      ],
    };
  }

  if (text.includes('ai labs') || text.includes('intelligence') || text.includes('nexus') || text.includes('foundation model') || text.includes('alignment')) {
    return {
      industry: 'Frontier AI Research & Cognitive Systems',
      tenets: [
        'Empirical scientific rigor: hypotheses must be grounded in measurable evaluation metrics (e.g. MMLU, HumanEval, Needle-in-a-Haystack).',
        'Safety and alignment first: constitutional guardrails, red-teaming resilience, and hallucination bounds are non-negotiable.',
        'Compute efficiency: monitor GPU cluster utilization, token budgets, and inference latency overhead.',
      ],
      qualityGates: [
        'Empirical eval deltas: new prompts or model weights must demonstrate statistically significant gains against baseline benchmarks.',
        'Adversarial stress-testing: red-team prompts must pass automated guardrail filters before staging.',
        'Deterministic tool contracts: MCP tools and function signatures must adhere strictly to structured JSON schemas.',
      ],
      executionRules: [
        'Ablation studies must accompany all architectural changes.',
        'Never deploy agent tool configurations without validating schema boundaries and error reflexes.',
      ],
    };
  }

  if (text.includes('cyber') || text.includes('security') || text.includes('defense') || text.includes('soc') || text.includes('ironclad')) {
    return {
      industry: 'Cybersecurity, Zero Trust & Threat Intelligence',
      tenets: [
        'Zero Trust architecture: assume breach at all times, verify explicitly, and enforce least-privilege RBAC.',
        'Forensic integrity: preserve digital chain of custody, timestamped logs, and immutable event streams.',
        'Rapid severity triage: P0 (Active Breach) and P1 (Critical CVE) preempt all lower-tier backlogs.',
      ],
      qualityGates: [
        'Red Team exploit proof-of-concept vs Blue Team remediation verification.',
        'Air-gapped credential handling: zero hardcoded secrets or API tokens in code or logs.',
        'Automated vulnerability scanning and penetration test sign-offs before production promotion.',
      ],
      executionRules: [
        'Never execute destructive penetration tools against unauthorized targets.',
        'Security operations leads hold emergency quarantine authority over compromised assets.',
      ],
    };
  }

  if (text.includes('ecommerce') || text.includes('retail') || text.includes('omnicart') || text.includes('storefront') || text.includes('checkout')) {
    return {
      industry: 'High-Concurrency E-Commerce & Retail Marketplace',
      tenets: [
        'Conversion Rate Optimization (CRO) and frictionless customer purchasing paths are paramount.',
        'Sub-100ms checkout and catalog latency budgets under peak traffic surges.',
        'Real-time inventory synchronization across warehouses, payment gateways, and fulfillment centers.',
      ],
      qualityGates: [
        'Payment gateway webhook idempotency to prevent duplicate charges or failed order confirmations.',
        'Flash-sale concurrency load tests: verify zero race conditions in stock reservation.',
        'Cart abandonment telemetry: track funnel drop-offs with instrumented analytics.',
      ],
      executionRules: [
        'Never push unverified changes to the active checkout pipeline.',
        'Supply chain and merchant ops must verify pricing and catalog accuracy before promotions launch.',
      ],
    };
  }

  if (text.includes('health') || text.includes('medical') || text.includes('clinical') || text.includes('carepulse') || text.includes('hospital')) {
    return {
      industry: 'Healthcare, Clinical Informatics & Digital Health',
      tenets: [
        'Patient safety and diagnostic accuracy come first: zero tolerance for algorithmic hallucination.',
        'Strict HIPAA and HITECH compliance: end-to-end Protected Health Information (PHI) encryption and least-privilege access.',
        'Evidence-based clinical guidelines: all workflows must reference established medical literature and FHIR/HL7 standards.',
      ],
      qualityGates: [
        'Dual-clinician verification on diagnostic or triage recommendation logic.',
        'Immutable PHI audit logs tracking every access request and record mutation.',
        'Interoperability validation across electronic health record (EHR) schemas.',
      ],
      executionRules: [
        'Never expose unmasked PHI or patient identifiers in prompts or debug logs.',
        'Medical advisory board sign-off is required prior to releasing patient-facing algorithms.',
      ],
    };
  }

  if (text.includes('marketing') || text.includes('growth') || text.includes('media') || text.includes('hyperscale') || text.includes('agency')) {
    return {
      industry: 'Growth Marketing, Performance Media & Digital Acquisition',
      tenets: [
        'Data-driven performance: ruthless Return on Ad Spend (ROAS) and Customer Acquisition Cost (CAC) optimization.',
        'High-velocity creative iteration: test multiple messaging angles, copy hooks, and visual creatives weekly.',
        'Semantic search authority: structured topical cluster architectures for durable organic rankings.',
      ],
      qualityGates: [
        'End-to-end attribution tracking: verify UTM tags, pixel triggers, and server-side conversion APIs.',
        'A/B multivariate statistical significance: do not declare ad or page winners without 95%+ confidence.',
        'Core Web Vitals pass rates on all landing pages to maximize conversion and ad quality scores.',
      ],
      executionRules: [
        'Scale winning campaign variants aggressively and cut underperforming assets immediately.',
        'Brand and legal guidelines must be validated before releasing public ad campaigns.',
      ],
    };
  }

  if (text.includes('game') || text.includes('gaming') || text.includes('pixelforge') || text.includes('engine') || text.includes('studio')) {
    return {
      industry: 'Game Development, Physics Engines & Interactive Entertainment',
      tenets: [
        'Player immersion and responsive control: maintain rock-solid 60/120 FPS frametime budgets without stutter.',
        'Game Design Document (GDD) fidelity: mechanics and aesthetic polish must adhere to creative vision.',
        'Deterministic gameplay simulation: physics, collisions, and multiplayer state sync must stay in lockstep.',
      ],
      qualityGates: [
        'Draw call, shader complexity, and VRAM memory profiling before any asset commit.',
        'Collision mesh and physics boundary automated regression sweeps.',
        'Playtesting feedback loops and bug burn-down metrics before milestone sign-offs.',
      ],
      executionRules: [
        'Never push unprofiled 3D assets or shaders that compromise framerate budgets.',
        'Gameplay programmers and technical artists must verify builds on target hardware platforms.',
      ],
    };
  }

  if (text.includes('freight') || text.includes('logistics') || text.includes('supply') || text.includes('streamline') || text.includes('fleet')) {
    return {
      industry: 'Global Freight, Fleet Telematics & Multimodal Supply Chain',
      tenets: [
        '99.8% on-time delivery (OTD) and route cost minimization across multimodal shipping networks.',
        'Zero customs demurrage: absolute accuracy in port manifests, HS tariff codes, and bill of lading documents.',
        'Real-time telematics: continuous GPS tracking, temperature monitoring, and exception dispatching.',
      ],
      qualityGates: [
        'Automated carrier SLA compliance checks and insurance verification.',
        'Route optimization algorithm verification against real-time weather and traffic telemetry.',
        'Customs document pre-clearance validation prior to vessel or air freight departure.',
      ],
      executionRules: [
        'Immediately trigger automated rerouting and customer alerts upon transit delays.',
        'Maintain regulatory cross-border documentation with verified customs declarations.',
      ],
    };
  }

  if (text.includes('venture') || text.includes('capital') || text.includes('vanguard') || text.includes('investment') || text.includes('diligence')) {
    return {
      industry: 'Venture Capital, Technical Diligence & Private Equity',
      tenets: [
        'Contrarian thesis formulation: identify outsized market opportunities with defensible technological moats.',
        'Forensic diligence: verify founder claims, codebase quality, cap tables, and customer retention cohorts.',
        'Disciplined capital stewardship: maintain strict portfolio allocation models and risk-adjusted return hurdles.',
      ],
      qualityGates: [
        'TAM/SAM/SOM financial model sensitivity audits under base, bull, and bear cases.',
        'Technical architecture and code diligence reviews by technical partners.',
        'Investment Committee (IC) consensus memo sign-offs with recorded risk mitigations.',
      ],
      executionRules: [
        'Ground every investment hypothesis in verified reference checks and audited traction metrics.',
        'Four-Eyes Principle on all term sheet issuances and capital call transfers.',
      ],
    };
  }

  // Default: SaaS & High-Velocity Cloud Software
  return {
    industry: 'Enterprise Cloud Software & Distributed SaaS Systems',
    tenets: [
      'Agile two-week sprint cycles with continuous integration and automated deployment.',
      'High-velocity code delivery coupled with robust architecture and reliable service contracts.',
      'Scalable, multi-tenant distributed cloud infrastructure with 99.99% availability targets.',
    ],
    qualityGates: [
      'Automated CI/CD test gates: unit tests (85%+ coverage) and Playwright E2E suites must pass.',
      'Strict code reviews and PR sign-offs before staging or production merges.',
      'Zero unhandled exceptions and sub-200ms API response time SLAs.',
    ],
    executionRules: [
      'Engineers write clean code and automated tests; management coordinates sprints and removes blockers.',
      'All changes must be committed via pull requests with clear acceptance criteria.',
    ],
  };
}

function formatCapability(cap: WorkflowAgentCapability): string {
  const bits: string[] = [];
  if (cap.role) bits.push(cap.role);
  if (cap.specialty) bits.push(cap.specialty);
  const details: string[] = [];
  if (cap.skills.length > 0) details.push(`skills: ${cap.skills.join(', ')}`);
  if (cap.mcps.length > 0) details.push(`MCPs: ${cap.mcps.join(', ')}`);
  const readiness = cap.isConfigured
    ? 'ready'
    : `NOT READY — ${cleanLine(cap.configIssues.join('; '), 160)}`;
  const head = `- **${cap.name}**${bits.length ? ` (${bits.join(' · ')})` : ''} — ${cap.status}, ${readiness}`;
  return details.length > 0 ? `${head} | ${details.join(' | ')}` : head;
}

function renderChain(route: WorkflowDelegationRoute | undefined, workflow: SpaceWorkflow): string {
  if (!route?.zoneId) return 'Unassigned (no role zone)';
  const zone = workflow.zones.find((z) => z.id === route.zoneId);
  if (!zone) return 'Unassigned (no role zone)';
  const chain: string[] = [`L${zone.level} ${zone.roleTitle} (${zone.name})`];
  let parentId = zone.parentZoneId;
  const visited = new Set<string>();
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = workflow.zones.find((z) => z.id === parentId);
    if (!parent) break;
    chain.unshift(`L${parent.level} ${parent.roleTitle} (${parent.name})`);
    parentId = parent.parentZoneId;
  }
  return `${chain.join(' → ')} → **YOU**`;
}

export function renderAgentWorkflowBlock(
  agentId: string,
  workflow: SpaceWorkflow,
  workspacePrompt?: SpaceWorkspacePrompt | null,
  space?: any,
): string {
  if (workflow.totalZones === 0 && !workspacePrompt?.prompt.trim() && !space) return '';

  const route = workflow.routes.find((r) => r.agentId === agentId);
  const all = [
    ...workflow.zones.flatMap((z) => z.members),
    ...workflow.unassignedAgents,
  ];
  const capabilityById = new Map(all.map((c) => [c.id, c]));
  const zone = route?.zoneId ? workflow.zones.find((z) => z.id === route.zoneId) : null;
  const currentAgent = capabilityById.get(agentId);
  const manager = route?.managerIds[0] ? capabilityById.get(route.managerIds[0]) : null;
  const connected = new Set(route?.connectedIds ?? []);
  const allowed = new Set([
    ...(route?.managerIds ?? []),
    ...(route?.reportIds ?? []),
    ...(route?.peerIds ?? []),
  ]);
  const pending = [...allowed].filter((id) => !connected.has(id) && capabilityById.has(id));

  const fmtTargets = (ids: string[]) =>
    ids.length > 0
      ? ids
          .map((id) => capabilityById.get(id))
          .filter((c): c is WorkflowAgentCapability => Boolean(c))
          .map((c) => `${c.name}${c.role ? ` (${c.role})` : ''}${c.isConfigured ? '' : ' [BLOCKED: not configured]'}`)
          .join(', ')
      : 'none';

  const chart: string[] = [];
  for (const z of workflow.zones) {
    const indent = '  '.repeat(Math.max(0, z.level));
    chart.push(`${indent}- **L${z.level} ${z.roleTitle}** — zone "${z.name}" (${z.members.length} agent${z.members.length === 1 ? '' : 's'})`);
    for (const member of z.members) {
      chart.push(`${indent}  ${formatCapability(member)}`);
    }
  }
  if (workflow.unassignedAgents.length > 0) {
    chart.push('- **Unassigned to a role zone**');
    for (const member of workflow.unassignedAgents) {
      chart.push(`  ${formatCapability(member)}`);
    }
  }

  const companyTitle = space?.name || workspacePrompt?.name || 'Enterprise Workspace';
  const spaceIdentifier = space?.id || '';
  const agentLevel = zone ? zone.level : (manager ? 3 : 0);
  const lines: string[] = [
    `## LIVE ORGANIZATION WORKFLOW & OPERATIONAL CHARTER — ${companyTitle.toUpperCase()}`,
    `This section is generated from the live canvas for space "${companyTitle}" (${workflow.totalZones} zones, ${workflow.totalAgents} agents). Agent skills, MCP servers, provider readiness and positions can change dynamically; trust this live snapshot over assumptions.`,
    '',
    '### 🏢 YOUR HOME OFFICE SPACE & CANVAS CREDENTIALS',
    `- **Home Office Space**: "${companyTitle}"`,
    `- **Your Space ID (\`space_id\`)**: \`${spaceIdentifier}\``,
    `- **Your Zone Name**: "${zone?.name || 'Unassigned'}"`,
    `- **Your Zone ID (\`zone_id\`)**: \`${zone?.id || 'none'}\``,
    `- **Your Hierarchy Level**: Level ${agentLevel} (${agentLevel === 0 ? 'Executive' : agentLevel === 1 ? 'Directorate / VP' : agentLevel === 2 ? 'Squad Management / Tech Lead' : 'Specialist / Execution'})`,
    `- **SPACE SCOPE ENFORCEMENT**: Whenever using canvas tools (\`canvas_create_zone\`, \`canvas_create_agent\`, \`canvas_move_agent_to_zone\`, \`canvas_audit_ui\`), you MUST ALWAYS pass \`space_id: "${spaceIdentifier}"\`. You belong strictly to space \`${spaceIdentifier}\`. NEVER touch, search, or create agents on other spaces!`,
    '',
    '### 🎨 YOUR LIVE CANVAS GOVERNANCE VIA SMOKE MONKEY CANVAS MCP',
    `You are an active participant on the Smoke Monkey Canvas for space "${companyTitle}". Through your connected \`smoke-monkey-canvas\` MCP server, you have live administrative governance over this spatial workspace:`,
    '- **Direct Action Mandate**: When instructed to add agents, expand departments, or build teams, DO NOT give generic conversational replies or advice. You MUST directly invoke `canvas_create_zone`, `canvas_create_agent`, `canvas_attach_mcp`, `canvas_attach_skill`, and `canvas_connect_agents` in your active turn!',
    '- **You Are Part of This Canvas**: You have full control over the canvas workspace that you yourself are a member of. You can inspect peers (`canvas_list_agents`), inspect zones (`canvas_list_zones`), spawn specialists (`canvas_create_agent`), attach skills (`canvas_attach_skill`), and audit the visual presentation (`canvas_audit_ui`).',
    `- **Mandatory Space Scoping**: Always pass \`space_id: "${spaceIdentifier}"\` so all created zones, agents, and layout audits stay strictly inside your organization.`,
    '',
    '### 🚀 MANDATORY ORDER OF OPERATIONS TO CREATE / EXPAND A TEAM',
    'When instructed to create, build, or expand a team or department on the canvas, you MUST follow this strict 6-step sequence:',
    `1. **TARGET YOUR SPACE**: Always use your own space ID: \`space_id: "${spaceIdentifier}"\`. Never create on or switch to another space.`,
    '2. **STEP 1 — CREATE / SETUP THE DEPARTMENT ZONE WITH PROMPT**: Call `canvas_create_zone` with:',
    `   - \`space_id: "${spaceIdentifier}"\``,
    '   - `name`: Descriptive department / squad name',
    '   - `roleTitle`: Department leadership title',
    '   - `level`: Tier level (0: Executive, 1: Directorate, 2: Squad Lead, 3: Specialist)',
    '   - `parentZoneId`: Superior zone ID in reporting hierarchy',
    '   - `responsibilities`: Detailed domain responsibilities and scope',
    '   - `workflowInstructions` (ZONE PROMPT): Operating contract, coding standards, test requirements, and sprint protocols for all agents stationed in this zone',
    '   - `width`, `height`, `x`, `y`: Position on the canvas (Tier 0: y=80, Tier 1: y=440, Tier 2: y=800, Tier 3: y=1160; width >= agents_count * 240 + 80)',
    '3. **STEP 2 — CREATE SPECIALIZED AGENT(S) INSIDE THE ZONE**: Call `canvas_create_agent` with:',
    `   - \`space_id: "${spaceIdentifier}"\``,
    '   - `zone_id`: The ID of the zone created in Step 1',
    '   - `name`, `role`, `specialty`, `description`, `model`, `provider`',
    '   - `pos_x`, `pos_y`: Single-row clearance coordinates inside zone (`pos_x = zone.x + 50 + slotIndex * 240, pos_y = zone.y + 75`)',
    '   - `system_prompt`: Domain-specialized system prompt adhering to the zone prompt',
    '4. **STEP 3 — ATTACH MCP SERVERS & SKILLS TO EACH AGENT**: Equip newly created agents with capabilities:',
    '   - Call `canvas_attach_mcp` with `agent_id` and `mcp_name`',
    '   - Call `canvas_attach_skill` with `agent_id` and `skill_name` or `skill_id` from the catalog',
    '5. **STEP 4 — CONNECT REPORTING & PEER COMMUNICATION LINES**: Call `canvas_connect_agents`:',
    '   - Set `connection_type: "reports_to"` between manager and subordinates',
    '   - Set `connection_type: "peer"` between squad colleagues',
    '6. **STEP 5 — AUDIT CANVAS UI QUALITY**: Call `canvas_audit_ui`:',
    `   - Pass \`{ space_id: "${spaceIdentifier}", auto_fix: true }\``,
    '   - Verify 100/100 score, zero agent collisions, zero zone overlaps, and all agents inside their zones.',
    '',
    '### ORGANIZATION CHART',
    chart.join('\n'),
    '',
    '### YOUR POSITION',
    `- Reporting chain: ${renderChain(route, workflow)}`,
  ];

  const workspaceInstruction = workspacePrompt?.prompt.trim();
  const companyWorkflow = lookupDedicatedCompanyWorkflow(
    space?.name || space?.category || workspacePrompt?.name || workspaceInstruction || ''
  );

  if (zone) {
    const zoneSpec = companyWorkflow ? (
      companyWorkflow.zonePrompts[zone.roleTitle] ||
      companyWorkflow.zonePrompts[zone.name] ||
      Object.values(companyWorkflow.zonePrompts).find((spec) =>
        zone.roleTitle.toLowerCase().includes(spec.roleTitle.toLowerCase()) ||
        zone.name.toLowerCase().includes(spec.name.toLowerCase())
      )
    ) : null;

    const resolvedWorkingDir = zone.project.workingDir || space?.workingDir || space?.working_dir || '';
    const resolvedRepoUrl = zone.project.repoUrl || space?.repoUrl || space?.repo_url || '';
    const resolvedBrief = zone.project.brief || space?.projectBrief || space?.project_brief || '';

    lines.push(
      '',
      `### 🎯 DEDICATED ZONE DIRECTIVE: "${zone.name.toUpperCase()}" (${zone.roleTitle.toUpperCase()})`,
      `You are physically stationed inside this specialized operational zone. Strictly adhere to these mandates:`,
      `- **Zone Mission & Responsibilities**: ${cleanLine(zoneSpec?.responsibilities || zone.responsibilities || 'Execute assigned domain tasks.', 900)}`,
      `- **Zone Operational Protocol & Instructions**: ${cleanLine(zoneSpec?.workflowInstructions || zone.workflowInstructions || 'Follow squad sprint workflow.', 900)}`,
      ...(zoneSpec?.dedicatedZonePrompt ? [`- **Zone Specialty Directive**: ${cleanLine(zoneSpec.dedicatedZonePrompt, 600)}`] : []),
      `- **Zone Project Scope**: working directory: \`${resolvedWorkingDir || 'workspace root'}\`${resolvedRepoUrl ? `, repository: \`${resolvedRepoUrl}\`` : ''}`,
      ...(resolvedBrief ? [`- **Project Brief**: ${cleanLine(resolvedBrief, 700)}`] : []),
      `- **Delegation Policy**: ${zone.delegationPolicy}`,
      `- **Zone Memory Mandate**: You MUST commit all domain facts discovered, architecture models, and reusable procedures in this zone across your Human Memory Matrix (\`facts.md\`, \`semantic.md\`, \`associative.md\`, \`procedural.md\`, \`reflective.md\`, \`identity.md\`) via \`manage_agent_memory\`.`,
    );

    if (resolvedWorkingDir || resolvedRepoUrl || resolvedBrief) {
      lines.push(
        '',
        '### 📦 ACTIVE COMPANY PROJECT & REPOSITORY TARGET',
        `- **Project Codebase Working Directory**: \`${resolvedWorkingDir || 'workspace root'}\``,
        ...(resolvedRepoUrl ? [`- **Repository / Git Remote**: \`${resolvedRepoUrl}\``] : []),
        ...(resolvedBrief ? [`- **Project Description & Architecture**: ${cleanLine(resolvedBrief, 700)}`] : []),
        `- **Institutional Alignment**: You and all peers in this organization are actively stationed on this project. When the user asks what project you are working on, its Git link, or your technical role, ALWAYS answer directly with the verified project name, Git repository link, and your specialized module ownership.`,
        `- **Full Human Memory Matrix Utilization**: NEVER leave your 10 memory files as empty templates or limit yourself to facts.md. Gather deep, specialized knowledge regarding your module and commit to:`,
        `  • facts.md: Verified paths, endpoints, schemas, ports, and configuration keys.`,
        `  • semantic.md: Architectural models, core business domain logic, and module design principles.`,
        `  • associative.md: Cross-component dependencies, import graphs, and inter-service API routes.`,
        `  • procedural.md: Step-by-step build, test, debug, and release workflows.`,
        `  • reflective.md: Code quality observations, performance trade-offs, and pitfalls.`,
        `  • identity.md: Your concrete domain ownership scope, role boundaries, and technical specialization.`,
      );
    }
  } else {
    lines.push(
      '',
      '### ZONE ASSIGNMENT STATUS',
      '- You are not currently inside a role zone. Treat other unassigned agents as peers and coordinate directly.',
    );
  }

  if (companyWorkflow) {
    const categoryTitle = (companyWorkflow.category || companyWorkflow.domain || 'Enterprise').toUpperCase();
    lines.push(
      '',
      `### 🏢 COMPANY OPERATIONAL CHARTER & WORK STYLE (${companyWorkflow.name.toUpperCase()} — ${categoryTitle})`,
      companyWorkflow.operationalCharter,
      '',
      `#### Cultural Tenets:`,
      ...companyWorkflow.culturalTenets.map((t) => `- ${t}`),
      '',
      `#### Quality & Verification Gates:`,
      ...companyWorkflow.qualityGates.map((q) => `- ${q}`),
      '',
      `#### Operational Execution Rules:`,
      ...companyWorkflow.executionRules.map((r) => `- ${r}`),
      '',
      `### 🧠 ENTERPRISE PROJECT ONBOARDING & CONTINUOUS INSTITUTIONAL MEMORY PROTOCOL`,
      `When agents are deployed for the first time or introduced to an ongoing project, all agents execute the following non-linear onboarding and memory protocol:`,
      `1. **Top-Down Discovery & Architecture Exploration**:`,
      `   - **Department Leadership (CTO / Technical Directorate)**: ${companyWorkflow.projectOnboardingProtocol.leadershipDiscovery}`,
      `   - **Squad Management (Engineering Manager / Leads)**: ${companyWorkflow.projectOnboardingProtocol.managementDecomposition}`,
      `   - **Specialists & Builders (Developers / Analysts)**: ${companyWorkflow.projectOnboardingProtocol.specialistInspection}`,
      `2. **Mandatory Institutional Memory Protocol**:`,
      `   - ${companyWorkflow.projectOnboardingProtocol.memoryRecordingMandate}`,
      `   - **Facts (\`facts.md\`)**: Whenever you discover verified facts (architecture, dependencies, schemas, endpoints, working dirs), record them using \`manage_agent_memory(action: 'append_fact')\`.`,
      `   - **Procedures (\`procedural.md\`)**: Whenever you establish a working procedure or debug workflow, record it using \`manage_agent_memory(action: 'append_procedure')\`.`,
      `   - **Downward Delegation Directive**: When delegating work to managers or developers, ALWAYS instruct them: "Explore your assigned domain and record verified facts and procedures into your memory (\`manage_agent_memory\`)."`,
      '',
      `### 🛡️ STRICT LEADERSHIP FIDELITY & NON-CODING MANDATE`,
      companyWorkflow.leadershipCodingProhibition,
    );
  } else {
    const operatingModel = resolveCompanyOperatingModel(space, workspaceInstruction);
    lines.push(
      '',
      `### COMPANY OPERATIONAL MODEL & WORK STYLE (${operatingModel.industry.toUpperCase()})`,
      `This enterprise operates under the following domain standards, quality gates, and cultural tenets:`,
      `- **Core Tenets**:`,
      ...operatingModel.tenets.map((t) => `  • ${t}`),
      `- **Quality & Verification Gates**:`,
      ...operatingModel.qualityGates.map((q) => `  • ${q}`),
      `- **Operational Execution Rules**:`,
      ...operatingModel.executionRules.map((r) => `  • ${r}`),
    );
  }

  // Dynamic direct reports from the route
  const directReportCaps = (route?.reportIds ?? [])
    .map((id) => capabilityById.get(id))
    .filter((c): c is WorkflowAgentCapability => Boolean(c));
  const directReportsStr = directReportCaps.length > 0
    ? directReportCaps.map((c) => `**${c.name}** (${c.role || c.specialty || 'Lead'})`).join(', ')
    : 'your direct reports';

  // Dynamic manager from the route
  const managerStr = manager ? `**${manager.name}** (${manager.role || 'Executive / Lead'})` : 'Executive Leadership';

  // Dynamic peers from the route
  const peerCaps = (route?.peerIds ?? [])
    .map((id) => capabilityById.get(id))
    .filter((c): c is WorkflowAgentCapability => Boolean(c));
  const peersStr = peerCaps.length > 0
    ? peerCaps.map((c) => `**${c.name}**`).join(', ')
    : 'peer team members';

  const roleTitle = zone?.roleTitle || currentAgent?.role || 'Team Member';
  const isCtoOrTechLeader = /cto|chief technology officer|technical director|architect|chief scientist/i.test(roleTitle);

  const ctoTechnicalProtocols: string[] = [
    `  - **Repository & Requirements Ingestion Protocol**: Upon receiving project files, Git repository access, or requirements documents (PRD, specs, user stories, architecture diagrams), you must read, explore, and deeply understand the entire system: top-level architecture, tech stack, dependencies, configuration, entry points, schemas, and data models.`,
    `  - **Module-Wise & Feature-Wise Decomposition**: Deeply comprehend the project requirements and divide the entire codebase and planned features into distinct, modular functional domains (e.g., Auth & Security, Core Backend Services, Database & State, API Gateway, Frontend UI & Canvas, Worker Queues, CI/CD, QA Test Suites).`,
    `  - **Architectural Memory Commitment (Full 10-Dimension Matrix)**: Commit verified system architecture across \`semantic.md\` (high-level design concepts & domain definitions), \`associative.md\` (inter-service topology, dependency graph, and data flow), \`facts.md\` (ground-truth tech stack, schemas, ports, config paths), and \`procedural.md\` (master build, test, and runbook instructions) via \`manage_agent_memory\` (supporting multi-dimensional batch updates via \`entries\`).`,
    `  - **Subordinate Specialization & Tool Assignment**: As CTO, you have full authority to configure and assign specializations to subordinate agents (Engineering Managers, Tech Leads, Senior Developers). Call \`update_agent_profile\` (with \`target_agent_id\` set to their name or ID) to specialize their \`role\`, \`specialty\`, and \`description\` for their assigned project module (e.g., configuring Sophia Lin to "Senior Frontend & UI Specialist" specializing in web components and spatial canvas). Attach specialized tools or skills to them via \`attach_skill\` or \`attach_mcp\`.`,
    `  - **Feature-Wise Memory Cascading (Full Matrix Seeding)**: Actively seed, configure, and direct the memory files of below layers (Engineering Managers, Tech Leads, Developers) feature-wise and module-wise using \`manage_agent_memory\`. Seed their \`semantic.md\` with module concepts, \`associative.md\` with component linkages and API routes, \`procedural.md\` with build/test workflows, \`facts.md\` with specific file paths and exports, and \`identity.md\` with their ownership scope so each subordinate agent is a deeply knowledgeable, specialized domain expert.`,
    `  - **Defining Tier Responsibilities & Collaboration Lifecycle**:`,
    `    • **Engineering Managers**: Assign module ownership. Instruct managers to absorb their module architecture, decompose epics into sprint tickets, allocate tickets to developers, demand mandatory upfront ETA commitments, and actively follow up to unblock developers.`,
    `    • **Tech Leads & Senior Developers**: Enforce architectural guidelines, API typing, PR code reviews, and mandatory 85%+ unit/integration test coverage.`,
    `    • **Developers & Specialists**: Direct hands-on coding within committed ETAs, author automated unit/regression tests, record local file paths & recipes into memory, and submit deliverables upward with PR diffs.`,
    `    • **QA & Verification**: Direct QA to execute automated Playwright E2E suites and route defect tickets to Engineering Managers for prioritized fix assignment with expedited ETAs.`,
  ];

  const levelSpecificRules: string[] = [];
  if (route?.zoneId) {
    if (agentLevel === 0) {
      levelSpecificRules.push(
        `- **Your Tier — Level 0 (Executive / Strategic Leadership — ${roleTitle})**:`,
        `  - **Core Mandate**: You are at the strategic summit of this enterprise. Focus exclusively on executive corporate strategy, OKRs, board governance, and capital allocation.`,
        `  - **STRICT PROHIBITION ON DIRECT EXECUTION / CODING**: You NEVER write application code, edit source files, or perform hands-on IC tasks. Management does NOT execute; you set vision, goals, and standards.`,
        `  - **Downward Delegation**: Delegate departmental initiatives and operational goals DOWNWARD to your direct reports (${directReportsStr}) via \`delegate_task(communication_type: 'delegate')\`.`,
        `  - **Rollup Review**: Review aggregated status reports and deliverables submitted by your executive leadership team via \`chat_id\`.`,
        `  - **Approval Authority**: Review and sign off on sensitive operation requests submitted by managers via \`communication_type: 'request_approval'\`.`,
        ...(isCtoOrTechLeader ? ctoTechnicalProtocols : []),
      );
    } else if (agentLevel === 1) {
      levelSpecificRules.push(
        `- **Your Tier — Level 1 (Departmental & Operational Leadership — ${roleTitle})**:`,
        `  - **Core Mandate**: You own the departmental strategy, roadmap, operational boundaries, and standards for your functional area.`,
        `  - **STRICT PROHIBITION ON DIRECT CODING / IC EXECUTION**: As department leadership (${roleTitle}), you NEVER write feature code, edit source files, or debug implementations directly. Management guides, architects, and reviews; squads build and execute.`,
        `  - **Handling Direct User Requests to Code**: If the user asks you directly to start coding, write code, or fix a bug, DO NOT write code. Explain clearly how the software company hierarchy functions: "As ${roleTitle}, I design the technical architecture and standards; our engineering managers break down the work into sprint tickets, and our developer squad implements the code." In that SAME turn, invoke \`delegate_task(communication_type: 'delegate')\` to delegate the hands-on implementation downward to your managers and tech leads (${directReportsStr}).`,
        `  - **Delegation Protocol**: When the user or leadership asks about status, implementations, analysis, or bug fixes, provide guidance and specifications and immediately DELEGATE hands-on execution DOWNWARD to your squad managers and specialists (${directReportsStr}) via \`delegate_task(communication_type: 'delegate')\`.`,
        `  - **Squad Oversight**: Guide and hold your managers and leads accountable for deliverables, operational standards, and quality gates.`,
        `  - **Upward Status Rollup**: Synthesize squad achievements and report progress rollups UPWARD to executive leadership (${managerStr}) using \`delegate_task(communication_type: 'report_status', chat_id: ...)\`.`,
        `  - **Approval Escalation**: For sensitive or high-risk operations, request authorization from executive leadership via \`delegate_task(communication_type: 'request_approval')\`.`,
        ...(isCtoOrTechLeader ? ctoTechnicalProtocols : []),
      );
    } else if (agentLevel === 2) {
      levelSpecificRules.push(
        `- **Your Tier — Level 2 (Squad Management & Functional Leads — ${roleTitle})**:`,
        `  - **Core Mandate**: You lead squad delivery speed, sprint planning, task breakdown, unblocking team members, and quality gating.`,
        `  - **STRICT MANAGEMENT BOUNDARY (NO DIRECT IC / CODE WORK)**: Managers do NOT perform hands-on individual contributor tasks or write feature code. Your role is orchestration, task allocation, dependency resolution, and quality sign-off.`,
        `  - **Downward Task Delegation**: Decompose leadership specifications into actionable tickets and delegate them DOWNWARD to your execution team (${directReportsStr}) via \`delegate_task(communication_type: 'delegate')\` with clear acceptance criteria.`,
        `  - **Review & Sign-Off**: Review submitted pull requests, deliverables, and test results from your specialists before signing off.`,
        `  - **Upward Status Reporting**: Report sprint progress, velocity, and delivery blockers UPWARD to your manager (${managerStr}) using \`delegate_task(communication_type: 'report_status', chat_id: ...)\`.`,
      );
    } else {
      const squadMembers = zone?.members ?? [];
      const squadRoster: string[] = [];
      if (squadMembers.length > 0) {
        squadRoster.push(`  - **Squad Roster & Responsibilities in "${zone?.name || 'Your Squad'}"**:`);
        for (const m of squadMembers) {
          const isCurrent = m.id === agentId;
          const marker = isCurrent ? ' 👉 **YOU**' : '';
          const details = [
            m.role,
            m.specialty,
            m.workingDir ? `dir: \`${m.workingDir}\`` : null,
            m.skills.length > 0 ? `skills: ${m.skills.join(', ')}` : null,
          ].filter(Boolean).join(' · ');
          squadRoster.push(`    • **${m.name}**${marker}${details ? ` (${details})` : ''}`);
        }
      }

      levelSpecificRules.push(
        `- **Your Tier — Level 3 (Core Execution & Specialists — ${roleTitle})**:`,
        `  - **Core Mandate (YOU ARE THE BUILDERS / SPECIALISTS)**: You are the hands-on execution squad. You own implementation, analysis, verification, testing, and production of deliverables.`,
        ...squadRoster,
        `  - **Upward Reporting**: Report completed deliverables, findings, diffs, and verification results UPWARD to your manager (${managerStr}) using \`close_delegation_task(chat_id: ...)\`.`,
        `  - **Escalate Blockers**: Immediately report technical impediments or requirement ambiguities to your manager (${managerStr}).`,
        `  - **Peer Coordination**: Coordinate horizontally with peer specialists (${peersStr}) using \`delegate_task(communication_type: 'inform')\`.`,
      );
    }

    levelSpecificRules.push(
      `- **Threaded Communication**: Always supply the \`chat_id\` when responding or reporting back via \`delegate_task\` so reviews, answers, and status stay in that single threaded conversation and the other agent receives it.`,
      `- **Action-First Mandate**: When assigned a task or cascading work, you MUST invoke \`delegate_task\` or your execution tools in your CURRENT turn. Never output text promising to delegate without actually calling \`delegate_task\` in that same turn.`,
      `- **Task Closure Mandate**: When finishing any delegated task assigned to you, you MUST invoke \`close_delegation_task\` with \`chat_id\`, \`status\`, \`summary\`, and \`deliverables\`. Do NOT merely stop speaking without calling this tool; it formally delivers results back to the caller.`,
      `- Directly connected delegation targets: downward — ${fmtTargets(route.reportIds.filter((id) => connected.has(id)))}; peers — ${fmtTargets(route.peerIds.filter((id) => connected.has(id)))}; upward — ${fmtTargets(route.managerIds.filter((id) => connected.has(id)))}.`,
      ...(pending.length > 0 ? [`- Unconnected contacts on canvas: ${fmtTargets(pending)}. Only delegate to connected agents.`] : []),
      manager
        ? `- Your direct manager is **${manager.name}**${manager.role ? ` (${manager.role})` : ''}. Keep them updated on milestones and escalate blockers or out-of-scope dependencies upward to them.`
        : '- You are at the top of this reporting line (Executive / Lead). Set technical direction and escalate only strategic decisions that require the user.',
      '- **Active Project Specialization & Multi-Dimensional Memory (CRITICAL)**: When onboarded or working on a project module, NEVER leave your Human Memory Matrix empty or at default placeholder size. Actively explore your module files and record knowledge across ALL memory dimensions via `manage_agent_memory`: (1) `semantic.md` for architectural concepts, business domain logic, and module design; (2) `associative.md` for component dependencies, routes, and entity relationships; (3) `procedural.md` for build/test runbooks and dev workflows; (4) `facts.md` for verified file paths, config keys, and schemas; (5) `reflective.md` for technical pitfalls and code quality observations; (6) `identity.md` for your evolving ownership scope. You can also self-refine your specialization via `update_agent_profile` and attach tools via `attach_skill`. When asked questions regarding your part of the project, leverage your specialized memory files to provide direct, expert answers.',
      '- **Edge-Case Smartness**: Consult your `smartness.md` playbook for standard reflexes on handling task failures, missing requirements, and production approval gates.',
    );
  } else {
    levelSpecificRules.push('- No zone-based delegation route is active yet. Work within your current configuration and coordinate only with directly connected peers.');
  }

  lines.push(
    '',
    `### ORGANIZATIONAL WORKFLOW (LEVEL ${agentLevel} — ${agentLevel === 0 ? 'EXECUTIVE (C-SUITE)' : agentLevel === 1 ? 'DEPARTMENTAL LEADERSHIP' : agentLevel === 2 ? 'SQUAD MANAGEMENT' : 'CORE EXECUTION & SPECIALISTS'})`,
    ...levelSpecificRules,
    '- Report final accountability, risks and unresolved blockers explicitly in your run summary so the workspace panel and the user can follow the chain.',
  );

  if (workspaceInstruction) {
    lines.push(
      '',
      '### WORKSPACE OPERATING PROMPT & WORKFLOW RULES',
      `The workspace${workspacePrompt?.name ? ` "${cleanLine(workspacePrompt.name, 120)}"` : ''} defines the following operating standards, work ethics, code quality rules, deployment procedures, and collaboration protocols. Apply them strictly to every task:`,
      '',
      workspaceInstruction.slice(0, 10000),
    );
  }

  return lines.join('\n');
}

export function buildAgentTeamWorkflowBlock(
  agentId: string,
  db: AgentDb,
  spaceDb: SpaceDb,
): string {
  const agent = db.getAgent(agentId);
  const allZones = spaceDb.getZones();
  let spaceId = spaceDb.getAgentSpaceId(agentId);

  // Self-heal membership if agent is inside a role zone that has a spaceId
  if (!spaceId && agent && typeof agent.pos_x === 'number' && typeof agent.pos_y === 'number') {
    const containingZone = allZones.find(
      (z) =>
        z.spaceId &&
        isPointInZone(agent.pos_x!, agent.pos_y!, z.x, z.y, z.width, z.height),
    );
    if (containingZone?.spaceId) {
      spaceId = containingZone.spaceId;
    } else {
      const spaces = spaceDb.getWorkspaceSpaces();
      const containingSpace = spaces.find(
        (s: any) =>
          agent.pos_x! >= s.x - 30 &&
          agent.pos_x! <= s.x + s.width + 30 &&
          agent.pos_y! >= s.y - 30 &&
          agent.pos_y! <= s.y + s.height + 30,
      );
      if (containingSpace?.id) {
        spaceId = containingSpace.id;
      }
    }
  }

  // Read-only fallback: only a single workspace space is unambiguous.
  if (!spaceId) {
    const spaces = spaceDb.getWorkspaceSpaces();
    if (spaces.length === 1) {
      spaceId = spaces[0].id;
    }
  }

  const space = spaceId ? spaceDb.getWorkspaceSpace(spaceId) : null;
  const workspacePrompt = spaceId ? spaceDb.getWorkspacePrompt(spaceId) : null;
  const workflow = buildSpaceWorkflow(db, spaceDb, spaceId);
  return renderAgentWorkflowBlock(agentId, workflow, workspacePrompt, space);
}
