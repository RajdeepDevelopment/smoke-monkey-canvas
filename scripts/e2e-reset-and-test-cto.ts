/**
 * e2e-reset-and-test-cto.ts
 *
 * 1. Cleans up all previous agents, runs, messages, sessions, spaces, and zones.
 * 2. Deploys fresh "Apex Cloud Technologies" software company preset.
 * 3. Configures smoke-monkey-desktop as the project for the CTO and squads.
 * 4. Runs CTO Marcus Chen to ingest the project, deconstruct modules, memorize to facts.md,
 *    and cascade memory and responsibilities to lower layers.
 * 5. Asks questions to the other agents (Engineering Manager, Tech Lead) to verify they
 *    can directly answer with deep knowledge of the project.
 */

import { existsSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { CoreDatabase } from '../server/features/core/database.db.js';
import { AgentDb } from '../server/features/agent/agent.db.js';
import { SpaceDb } from '../server/features/space/space.db.js';
import { AgentRunner } from '../server/features/agent/agent.runner.js';
import { COMPANY_PRESETS } from '../web/src/features/library/data/companies.data.js';
import { layoutCompany } from '../web/src/features/library/library.data.js';
import { buildCompanyAgentPrompt } from '../web/src/features/library/data/company-workflows.engine.js';
import { ENTERPRISE_AGENT_TEMPLATES } from '../web/src/features/agent/agent.templates.js';

const PROJECT_PATH =
  process.env.SMOKE_PROJECT_PATH ||
  '/Users/rajdeepsadhu/Desktop/Testing/RAG/smoke-monkey-desktop';

async function main() {
  if (process.env.SMOKE_E2E_ALLOW_RESET !== '1') {
    console.error(
      'Refusing to run: this script deletes ALL agents, runs, sessions, spaces, zones, and disk memory.\n' +
        'Set SMOKE_E2E_ALLOW_RESET=1 to confirm you are running against a disposable database.',
    );
    process.exit(1);
  }
  console.log('===========================================================');
  console.log('🚀 E2E Software Company CTO Onboarding & Knowledge Cascade');
  console.log('===========================================================\n');

  const coreDb = CoreDatabase.getInstance();
  const db = coreDb.db;
  const agentDb = new AgentDb();
  const spaceDb = new SpaceDb();
  const runner = AgentRunner.getInstance();

  // ──────────────────────────────────────────────────────────────────────────
  // Step 1: Delete all previous agents, runs, spaces, zones, and messages
  // ──────────────────────────────────────────────────────────────────────────
  console.log('🧹 Step 1: Deleting all existing agents, spaces, and zones...');

  db.exec(`
    DELETE FROM run_events;
    DELETE FROM runs;
    DELETE FROM chat_messages;
    DELETE FROM chat_sessions;
    DELETE FROM agent_connections;
    DELETE FROM agent_skills;
    DELETE FROM agent_mcps;
    DELETE FROM agent_cron_jobs;
    DELETE FROM agent_file_compaction;
    DELETE FROM agent_todo_history;
    DELETE FROM space_agent_memberships;
    DELETE FROM space_workspace_prompts;
    DELETE FROM space_zones;
    DELETE FROM workspace_spaces;
    DELETE FROM agents;
  `);

  console.log('✓ All previous database records cleared.');

  // Clean local .smoke-agent working memory if present
  const agentMemoryDir = join(homedir(), '.smoke-monkey', 'agents');
  if (existsSync(agentMemoryDir)) {
    try {
      rmSync(agentMemoryDir, { recursive: true, force: true });
      console.log('✓ Cleared agent disk memory cache.');
    } catch {}
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Step 2: Deploy new Software Company (Apex Cloud Technologies - Mid Scale)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n🏢 Step 2: Deploying new Software Company (Apex Cloud Technologies)...');

  const company = COMPANY_PRESETS.find((c) => c.id === 'company-saas-cloud')!;
  const scaleKey = 'mid';
  const scaleConfig = company.scales[scaleKey];
  const layout = layoutCompany(company, scaleKey);

  // 2a. Create Workspace Space
  const spaceInput = {
    name: layout.space.name,
    description: layout.space.description,
    category: layout.space.category,
    width: layout.space.width,
    height: layout.space.height,
    color: layout.space.color,
    shape: layout.space.shape,
    workflowPrompt: layout.space.workflowPrompt,
    workflowInstructions: layout.space.workflowInstructions,
    responsibilities: layout.space.responsibilities,
    x: 0,
    y: 0,
  };
  const createdSpace = spaceDb.createWorkspaceSpace(spaceInput);
  console.log(`✓ Created workspace space: "${createdSpace.name}" (${createdSpace.id})`);

  // 2b. Create Zones with project working dir assigned
  console.log(`Creating ${layout.zones.length} role zones...`);
  const createdZonesMap = new Map<string, any>();

  for (const z of layout.zones) {
    const isTechLeadershipOrDev =
      z.roleTitle === 'CTO' ||
      z.roleTitle === 'Engineering Manager' ||
      z.roleTitle === 'Tech Lead' ||
      z.roleTitle === 'DevOps Lead' ||
      z.roleTitle === 'QA Manager';

    const createdZone = spaceDb.createZone({
      id: z.id,
      name: z.name,
      roleTitle: z.roleTitle,
      responsibilities: z.responsibilities,
      workflowInstructions: z.workflowInstructions,
      level: z.level,
      parentZoneId: z.parentZoneId,
      spaceId: createdSpace.id,
      color: z.color,
      shape: z.shape,
      width: z.width,
      height: z.height,
      x: z.x,
      y: z.y,
      delegationPolicy: z.delegationPolicy,
      // Assign smoke-monkey-desktop to tech zones
      workingDir: isTechLeadershipOrDev ? PROJECT_PATH : null,
      repoUrl: isTechLeadershipOrDev ? PROJECT_PATH : null,
      projectBrief: isTechLeadershipOrDev
        ? 'Smoke Monkey Desktop: High-performance monorepo desktop application with Electron/Tauri frontend, local agent runtime, and multi-agent canvas.'
        : null,
    });
    createdZonesMap.set(z.id, createdZone);
  }
  console.log(`✓ Created ${createdZonesMap.size} role zones.`);

  // 2c. Provision Agents
  console.log(`Provisioning ${layout.agents.length} enterprise agents...`);
  const templateMap = new Map<string, any>();
  for (const t of ENTERPRISE_AGENT_TEMPLATES) {
    templateMap.set(t.id, t);
  }

  const createdAgents: Record<string, any> = {};

  for (const pa of layout.agents) {
    const agentName = pa.agentName || pa.roleTitle || 'Specialist';
    const roleTitle = pa.roleTitle || 'Team Member';
    const targetZone = layout.zones.find((z) => z.id === pa.zoneId);
    const parentZone = targetZone?.parentZoneId ? layout.zones.find((z) => z.id === targetZone.parentZoneId) : null;
    const level = targetZone ? targetZone.level : 2;

    const template =
      templateMap.get(pa.agentTemplateId) ||
      ENTERPRISE_AGENT_TEMPLATES.find(
        (t) => (pa.agentName && t.name.toLowerCase() === pa.agentName.toLowerCase()) || t.role === pa.roleTitle,
      ) ||
      ENTERPRISE_AGENT_TEMPLATES[0];

    const tailoredSystemPrompt = buildCompanyAgentPrompt({
      company,
      scale: scaleKey,
      agentName,
      roleTitle,
      level,
      zoneName: targetZone ? targetZone.name : 'Unassigned Zone',
      zoneResponsibilities: targetZone?.responsibilities,
      zoneInstructions: targetZone?.workflowInstructions,
      parentZoneName: parentZone?.name,
      parentZoneRoleTitle: parentZone?.roleTitle,
      baseSystemPrompt: template.system_prompt,
    });

    const isTech = ['CTO', 'Engineering Manager', 'Tech Lead', 'DevOps Lead', 'QA Manager', 'Senior Dev'].some((r) =>
      roleTitle.includes(r),
    );

    const agentId = `agent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const created = agentDb.createAgent({
      id: agentId,
      name: agentName,
      model: 'nvidia/nemotron-3-ultra-550b-a55b',
      provider: 'nvidia',
      system_prompt: tailoredSystemPrompt,
      pos_x: Math.round(pa.x),
      pos_y: Math.round(pa.y),
      role: roleTitle,
      specialty: template.specialty || null,
      description: template.description || null,
      working_dir: isTech ? PROJECT_PATH : null,
    });

    spaceDb.updateNodePosition(created.id, Math.round(pa.x), Math.round(pa.y), createdSpace.id);

    createdAgents[roleTitle] = createdAgents[roleTitle] || [];
    createdAgents[roleTitle].push(created);

    if (agentName.includes('Marcus Chen') || roleTitle.includes('Chief Technology Officer')) {
      createdAgents['CTO_AGENT'] = created;
    } else if (agentName.includes('David Kim') || roleTitle.includes('Engineering Manager')) {
      createdAgents['EM_AGENT'] = created;
    } else if (agentName.includes('Devon Reed') || roleTitle.includes('Technical Lead')) {
      createdAgents['TECH_LEAD_AGENT'] = created;
    }
  }

  console.log(`✓ Provisioned all agents.`);
  const ctoAgent = createdAgents['CTO_AGENT'];
  const emAgent = createdAgents['EM_AGENT'];
  const techLeadAgent = createdAgents['TECH_LEAD_AGENT'];

  console.log(`  - CTO: ${ctoAgent.name} (${ctoAgent.id})`);
  console.log(`  - Engineering Manager: ${emAgent.name} (${emAgent.id})`);
  console.log(`  - Tech Lead: ${techLeadAgent.name} (${techLeadAgent.id})`);

  // Wire connections between CTO and EM, and EM and Tech Lead
  agentDb.createAgentConnection(ctoAgent.id, emAgent.id);
  agentDb.createAgentConnection(emAgent.id, techLeadAgent.id);
  console.log(`✓ Wired management reporting lines: CTO -> EM -> Tech Lead.`);

  // ──────────────────────────────────────────────────────────────────────────
  // Step 3: Run CTO Marcus Chen with project smoke-monkey-desktop
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n===========================================================');
  console.log('🧠 Step 3: Triggering CTO Marcus Chen for Project Ingestion');
  console.log(`Target Repository: ${PROJECT_PATH}`);
  console.log('===========================================================\n');

  const ctoPrompt = `EXECUTIVE DIRECTIVE FOR CTO:
We have just onboarded our flagship software project: "${PROJECT_PATH}".
Please execute your CTO repository ingestion and architectural mastery protocol:

1. READ & EXPLORE THE CODEBASE:
   - Deeply inspect the repository directory layout, package.json, pnpm-workspace.yaml, apps/, packages/, server/, and architecture documentation.
   - Understand the system topology, tech stack, and core service boundaries.

2. MODULE-WISE & FEATURE-WISE DECOMPOSITION:
   - Partition the entire project into distinct functional modules and feature domains (e.g., Desktop Client, Core Server & API, Shared Packages, Infra & Scripts).
   - Document the responsibility of each module.

3. ARCHITECTURAL MEMORY COMMITMENT:
   - Commit verified system architecture, tech stack details, and module boundaries into facts.md using manage_agent_memory(action: 'append_fact').
   - Record operational and procedural guidelines into procedural.md using manage_agent_memory(action: 'append_procedure').

4. CASCADE MEMORY & DEFINE RESPONSIBILITIES FOR LOWER TIERS:
   - Define exact responsibilities for Engineering Manager David Kim, Tech Lead Devon Reed, and the developer squads.
   - Instruct how the managers, leads, and developers will collaborate (sprint ticketing, mandatory upfront ETA commitments, 85%+ test coverage, and PR reviews).
   - Explicitly instruct Engineering Manager David Kim on what module schemas and procedures he and his squads must memorize.

5. DELEGATION:
   - Delegate the module breakdown and execution mandates to Engineering Manager David Kim using delegate_task.

Remember: As CTO, you do NOT write application code; you architect, decompose, configure memory, and delegate downward!`;

  console.log('Starting CTO Agent Run...');
  const ctoRun = await runner.runAgent(ctoAgent.id, 'manual', ctoPrompt);
  console.log(`✓ CTO Run initialized: ${ctoRun.id} (status: ${ctoRun.status})`);
  console.log('Streaming CTO progress...\n');

  const startTime = Date.now();
  let completed = false;
  let lastEventId = 0;

  while (Date.now() - startTime < 300000) {
    await new Promise((r) => setTimeout(r, 2000));
    const runRow = db.prepare('SELECT id, status, summary, error FROM runs WHERE id = ?').get(ctoRun.id) as any;
    const newEvents = db
      .prepare('SELECT id, event_type, created_at, payload_json FROM run_events WHERE run_id = ? AND id > ? ORDER BY id ASC')
      .all(ctoRun.id, lastEventId) as any[];

    for (const ev of newEvents) {
      lastEventId = ev.id;
      try {
        const payload = JSON.parse(ev.payload_json || '{}');
        if (ev.event_type === 'tool_call') {
          console.log(`  🔧 [TOOL CALL] ${payload.name || payload.toolName || 'tool'}:`, JSON.stringify(payload.args || payload.arguments || payload.input || {}));
        } else if (ev.event_type === 'tool_result') {
          const preview = String(payload.result || payload.output || payload.summary || JSON.stringify(payload)).slice(0, 180);
          console.log(`  ✅ [TOOL RESULT]: ${preview.replace(/\n/g, ' ')}`);
        } else if (ev.event_type === 'agent_thought') {
          console.log(`  💭 [THOUGHT]: ${(payload.thought || payload.content || '').slice(0, 140).replace(/\n/g, ' ')}...`);
        } else if (ev.event_type === 'sub_delegation') {
          console.log(`  🤝 [SUB-DELEGATION]: ${JSON.stringify(payload)}`);
        } else if (ev.event_type !== 'assistant_chunk') {
          console.log(`  ⚡ [${ev.event_type}]`);
        }
      } catch {
        console.log(`  ⚡ [${ev.event_type}]`);
      }
    }

    if (runRow?.status === 'completed' || runRow?.status === 'failed') {
      completed = true;
      console.log('\n=== CTO RUN FINISHED ===');
      console.log('Status:', runRow.status);
      console.log('Summary:\n', runRow.summary || '(no summary)');
      if (runRow.error) console.error('Error:', runRow.error);
      break;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Step 4: Verify Memory Files Created / Updated by CTO
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n===========================================================');
  console.log('📑 Step 4: Verifying CTO Institutional Memory Files');
  console.log('===========================================================\n');

  // Check CTO memory files
  const ctoWorkspaceDir = join(homedir(), '.smoke-monkey', 'agents', ctoAgent.id);
  const possiblePaths = [
    join(ctoWorkspaceDir, '.smoke-agent', 'memory'),
    join(PROJECT_PATH, '.smoke-agent', 'memory'),
    join(process.cwd(), '.smoke-agent', 'memory'),
  ];

  let foundMemory = false;
  for (const mPath of possiblePaths) {
    if (existsSync(mPath)) {
      console.log(`Found memory directory at: ${mPath}`);
      const files = readdirSync(mPath);
      for (const f of files) {
        const fPath = join(mPath, f);
        const content = readFileSync(fPath, 'utf8');
        console.log(`\n--- [${f}] (${content.length} bytes) ---`);
        console.log(content.slice(0, 500) + (content.length > 500 ? '\n...(truncated)...' : ''));
      }
      foundMemory = true;
      break;
    }
  }

  if (!foundMemory) {
    console.log('Checking database chat messages & events for CTO memory outputs...');
    const msgs = db
      .prepare('SELECT role, content FROM chat_messages WHERE agent_id = ? ORDER BY id DESC LIMIT 2')
      .all(ctoAgent.id) as any[];
    for (const m of msgs) {
      console.log(`\n[${m.role.toUpperCase()} MESSAGE]:\n${m.content.slice(0, 800)}...`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Step 5: Ask Questions to Other Agents (Engineering Manager & Tech Lead)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n===========================================================');
  console.log('❓ Step 5: Questioning Other Agents to Verify Direct Answers');
  console.log('===========================================================\n');

  // Question 1: Ask Engineering Manager David Kim
  console.log(`Asking Engineering Manager (${emAgent.name}):`);
  const emQuestion = `Hello David. As Engineering Manager for our software project, what is the architectural breakdown and module structure of "smoke-monkey-desktop"? What are your responsibilities, and how will your tech leads and developers collaborate on sprint deliverables and ETAs?`;
  console.log(`Q: "${emQuestion}"\n`);

  const emRun = await runner.runAgentAndWait(emAgent.id, 'manual', emQuestion);
  console.log(`\n=== ENGINEERING MANAGER (${emAgent.name}) DIRECT ANSWER ===`);
  const emReply = db
    .prepare('SELECT content FROM chat_messages WHERE run_id = ? AND role = \x27assistant\x27 ORDER BY id DESC LIMIT 1')
    .get(emRun.id) as any;
  console.log(emReply?.content || emRun.summary || '(No content returned)');

  // Question 2: Ask Tech Lead Devon Reed
  console.log(`\n-----------------------------------------------------------`);
  console.log(`Asking Tech Lead (${techLeadAgent.name}):`);
  const leadQuestion = `Hello Devon. As Tech Lead in Core Application Engineering, what is the codebase structure, tech stack, and module organization of smoke-monkey-desktop? What are the key directories, and how does your squad ensure code quality and test coverage?`;
  console.log(`Q: "${leadQuestion}"\n`);

  const leadRun = await runner.runAgentAndWait(techLeadAgent.id, 'manual', leadQuestion);
  console.log(`\n=== TECH LEAD (${techLeadAgent.name}) DIRECT ANSWER ===`);
  const leadReply = db
    .prepare('SELECT content FROM chat_messages WHERE run_id = ? AND role = \x27assistant\x27 ORDER BY id DESC LIMIT 1')
    .get(leadRun.id) as any;
  console.log(leadReply?.content || leadRun.summary || '(No content returned)');

  console.log('\n===========================================================');
  console.log('🎉 E2E CTO Onboarding and Direct Agent Verification Completed!');
  console.log('===========================================================');
}

main().catch((err) => {
  console.error('Fatal error during execution:', err);
  process.exit(1);
});
