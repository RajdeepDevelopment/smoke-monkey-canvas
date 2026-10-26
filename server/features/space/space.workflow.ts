import type { AgentDb } from '../agent/agent.db.js';
import type { AgentRecord } from '../agent/agent.types.js';
import { checkAgentConfigStatus } from '../agent/agent.config-check.js';
import type { SpaceDb } from './space.db.js';
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

export function buildSpaceWorkflow(db: AgentDb, spaceDb: SpaceDb): SpaceWorkflow {
  const zones = spaceDb.getZones();
  const agents = db.getAllAgents();
  const connections = db.getAgentConnections();
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
): string {
  if (workflow.totalZones === 0 && !workspacePrompt?.prompt.trim()) return '';

  const route = workflow.routes.find((r) => r.agentId === agentId);
  const all = [
    ...workflow.zones.flatMap((z) => z.members),
    ...workflow.unassignedAgents,
  ];
  const capabilityById = new Map(all.map((c) => [c.id, c]));
  const zone = route?.zoneId ? workflow.zones.find((z) => z.id === route.zoneId) : null;
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

  const lines: string[] = [
    '## LIVE SPACE HIERARCHY & ROLE WORKFLOW',
    `This section is generated from the live canvas on every run (${workflow.totalZones} zones, ${workflow.totalAgents} agents). Agent skills, MCP servers, provider readiness and positions can change at any time; trust this live snapshot over assumptions.`,
    '',
    '### ORGANIZATION CHART',
    chart.join('\n'),
    '',
    '### YOUR POSITION',
    `- Reporting chain: ${renderChain(route, workflow)}`,
  ];

  if (zone) {
    if (zone.responsibilities) {
      lines.push(`- Your zone responsibilities: ${cleanLine(zone.responsibilities, 900)}`);
    }
    if (zone.workflowInstructions) {
      lines.push(`- Zone workflow instructions: ${cleanLine(zone.workflowInstructions, 900)}`);
    }
    if (zone.project.repoUrl) lines.push(`- Project repository: ${cleanLine(zone.project.repoUrl, 300)}`);
    if (zone.project.workingDir) lines.push(`- Project working folder: ${cleanLine(zone.project.workingDir, 300)}`);
    if (zone.project.brief) lines.push(`- Project brief: ${cleanLine(zone.project.brief, 700)}`);
    lines.push(`- Delegation policy: ${zone.delegationPolicy}`);
  } else {
    lines.push('- You are not currently inside a role zone. Treat other unassigned agents as peers and ask the user which zone you should join before delegating cross-functional work.');
  }

  lines.push(
    '',
    '### DELEGATION & COMMUNICATION RULES',
    ...(route?.zoneId
      ? [
          `- **Hierarchy Authority & Tier Order**: Canvas vertical position dictates authority. Higher tiers on the top (L0/L1, e.g. CTO / Engineering Lead) are SENIORS (Managers); lower tiers below (L2+, e.g. Engineers / Specialists) are JUNIORS (Subordinates). Directives and assigned tasks flow DOWNWARD; status reports and escalations flow UPWARD.`,
          `- **Work Acceptance Protocol**: When you receive delegated tasks or instructions from a senior manager above you in the reporting line, that work MUST BE ACCEPTED and given highest priority. Execute the directives faithfully, verify quality against requirements, and return structured deliverables back up to the delegating senior.`,
          `- **Subordinate Delegation Boundaries**: Subordinates / Juniors do not assign tasks to superiors. Juniors report deliverables and escalate blocking decisions upward to their manager. Only seniors have the authority to assign work downward to direct reports.`,
          `- Directly connected delegation targets (use \`delegate_task\`): downward — ${fmtTargets(route.reportIds.filter((id) => connected.has(id)))}; peers — ${fmtTargets(route.peerIds.filter((id) => connected.has(id)))}; upward — ${fmtTargets(route.managerIds.filter((id) => connected.has(id)))}.`,
          `- Hierarchy contacts not yet wired on the canvas: ${fmtTargets(pending)}. Do not call \`delegate_task\` for a person who is not in the connected list; instead ask your manager or the user to connect them.`,
          manager
            ? `- Your direct manager is **${manager.name}**${manager.role ? ` (${manager.role})` : ''}. Escalate blockers, scope conflicts and anything requiring cross-team decisions upward to them.`
            : '- You are at the top of this reporting line (Executive / Lead). Set technical direction, delegate downward to your leads and engineers, and escalate only high-level decisions that require the user.',
          '- Delegate to the lowest-level qualified person who owns the work. Never bypass a direct report to micromanage their team unless the task is urgent or the intermediate lead is unavailable.',
          '- Choose a target by current capabilities (skills, MCPs, specialty and readiness), not only by title. Never delegate to an agent marked NOT READY; reassign or do the work yourself when no ready target exists.',
          route.reportIds.length > 0
            ? '- For multi-part work, use the parallel `tasks` array on \`delegate_task\` to brief several direct reports at once, with non-overlapping scopes and explicit acceptance criteria.'
            : '- If you have no direct reports and the work needs another specialty, coordinate with a peer or escalate to your manager.',
          '- When you receive delegated work: confirm scope, execute, and return a concise result with evidence (files, commands, test output) to the delegating manager.',
          '- Do not create circular delegation (A → B → A). If a subordinate delegates back to you, resolve it yourself or reassign it.',
        ]
      : [
          '- No zone-based delegation route is active yet. Work within your current configuration and coordinate only with directly connected peers.',
        ]),
    '- Report final accountability, risks and unresolved blockers explicitly in your run summary so the workspace panel and the user can follow the chain.',
  );

  const workspaceInstruction = workspacePrompt?.prompt.trim();
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
  const workflow = buildSpaceWorkflow(db, spaceDb);
  const route = workflow.routes.find((candidate) => candidate.agentId === agentId);
  const zone = route?.zoneId ? spaceDb.getZone(route.zoneId) : null;
  let spaceId = zone?.spaceId ?? spaceDb.getAgentSpaceId(agentId);

  // Self-heal membership if agent is physically inside a role zone that has a spaceId
  if (!spaceId) {
    const agent = db.getAgent(agentId);
    if (agent && typeof agent.pos_x === 'number' && typeof agent.pos_y === 'number') {
      const zones = spaceDb.getZones();
      const containingZone = zones.find(
        (z) =>
          z.spaceId &&
          agent.pos_x! >= z.x - 30 &&
          agent.pos_x! <= z.x + z.width + 30 &&
          agent.pos_y! >= z.y - 30 &&
          agent.pos_y! <= z.y + z.height + 30,
      );
      if (containingZone?.spaceId) {
        spaceId = containingZone.spaceId;
        try {
          spaceDb.setAgentSpace(agentId, spaceId);
        } catch {}
      }
    }
  }

  const workspacePrompt = spaceId ? spaceDb.getWorkspacePrompt(spaceId) : null;
  return renderAgentWorkflowBlock(agentId, workflow, workspacePrompt);
}
