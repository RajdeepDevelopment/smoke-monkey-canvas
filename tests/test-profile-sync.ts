import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import {
  isSystemPromptStale,
  reconcileSystemPromptWithProfile,
} from '../server/features/agent/agent.prompt.js';
import { CoreDatabase } from '../server/features/core/database.db.js';
import { AgentDb } from '../server/features/agent/agent.db.js';
import { AgentRunner } from '../server/features/agent/agent.runner.js';
import { CUSTOM_AGENT_TOOLS } from '../server/features/agent/agent.custom-tools.js';
import { ensureAgentWorkspace } from '../server/features/agent/agent.manifest.js';

const pass = (msg: string) => console.log(`PASS  ${msg}`);

async function runTests() {
  console.log('--- Testing System Prompt Staleness Detection & Profile Reconciliation ---');

  // 1. isSystemPromptStale
  const stalePrompt = `You are Employee Self-Service Answer Desk (agent name: "People Ops Concierge").\n\n## MISSION\nBe the fast answer desk.`;
  assert(
    isSystemPromptStale(stalePrompt, { name: 'Smoke Monkey Canvas Outreach Agent' }),
    'Should detect name mismatch in "agent name: ..." format',
  );
  pass('isSystemPromptStale detects name mismatch');

  const matchingPrompt = `You are Smoke Monkey Canvas Outreach Specialist (agent name: "Smoke Monkey Canvas Outreach Agent").\n\n## MISSION\nOutreach.`;
  assert(
    !isSystemPromptStale(matchingPrompt, { name: 'Smoke Monkey Canvas Outreach Agent' }),
    'Should not report stale when names match',
  );
  pass('isSystemPromptStale returns false when names match');

  // 2. reconcileSystemPromptWithProfile with full sections
  const oldFullPrompt = `You are Employee Self-Service Answer Desk (agent name: "People Ops Concierge").

## MISSION
Be the fast, accurate answer desk for people questions.

## STANDING RESPONSIBILITIES
1. Answer HR questions with the exact policy reference
2. Escalate sensitive issues to the right team
3. Log recurring questions to improve self-help

## EXTERNAL MCP SERVERS ATTACHED TO THIS RUN
- gmail — Read, search, send Gmail threads
- slack-mcp — Post channel notifications

## SKILLS ATTACHED TO THIS RUN
Skill names: Knowledge Base & Help Center Authoring.

## OPERATING PRINCIPLES
- You are an autonomous AI specialist. Complete the requested work end-to-end.`;

  const newProfile = {
    name: 'Smoke Monkey Canvas Outreach Agent',
    role: 'Smoke Monkey Canvas Outreach & Campaign Specialist',
    description: 'Specialized in personalized email outreach campaigns for Smoke Monkey Canvas.',
    specialty: 'Email Marketing Campaign Management, Gmail MCP Integration, Lead Outreach Sequences',
  };

  const reconciled = reconcileSystemPromptWithProfile(oldFullPrompt, newProfile);

  assert(reconciled.includes('agent name: "Smoke Monkey Canvas Outreach Agent"'), 'Contains new agent name');
  assert(reconciled.includes('Smoke Monkey Canvas Outreach & Campaign Specialist'), 'Contains new role');
  assert(reconciled.includes('Specialized in personalized email outreach campaigns for Smoke Monkey Canvas.'), 'Contains new description');
  assert(reconciled.includes('1. Email Marketing Campaign Management'), 'Specialty converted to numbered responsibilities');
  assert(reconciled.includes('2. Gmail MCP Integration'), 'Specialty item 2 present');
  assert(reconciled.includes('## EXTERNAL MCP SERVERS ATTACHED TO THIS RUN'), 'Preserved external MCP section');
  assert(reconciled.includes('## SKILLS ATTACHED TO THIS RUN'), 'Preserved skills section');
  assert(reconciled.includes('## OPERATING PRINCIPLES'), 'Preserved operating principles');
  assert(!reconciled.includes('People Ops Concierge'), 'Old agent name completely purged');
  assert(!reconciled.includes('Answer HR questions'), 'Old HR responsibilities completely purged');
  pass('reconcileSystemPromptWithProfile cleanly replaces old persona while preserving MCPs and skills');

  // 3. update_agent_profile tool end-to-end
  const coreDb = CoreDatabase.getInstance();
  const agentDb = new AgentDb(coreDb);
  const runner = AgentRunner.getInstance();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-profile-test-'));

  const testAgentId = `test_profile_${Date.now()}`;
  const initialAgent = agentDb.createAgent({
    id: testAgentId,
    name: 'People Ops Concierge',
    model: 'nvidia/nemotron-3-ultra-550b-a55b',
    provider: 'nvidia',
    system_prompt: oldFullPrompt,
    cron_schedule: null,
    cron_enabled: 0,
    pos_x: 100,
    pos_y: 100,
    status: 'idle',
    last_run_at: null,
    next_run_at: null,
    working_dir: path.join(tempDir, 'agent_workspace'),
    role: 'Employee Self-Service Answer Desk',
    description: 'Answers employee questions about policies.',
    specialty: 'HR Self-Service Concierge',
  });

  const ws = ensureAgentWorkspace(
    initialAgent.working_dir!,
    initialAgent.id,
    initialAgent.name,
    initialAgent.system_prompt,
  );
  fs.writeFileSync(ws.systemPromptFile, initialAgent.system_prompt + '\n', 'utf8');

  // Execute update_agent_profile
  const updateProfileTool = CUSTOM_AGENT_TOOLS.find((t) => t.name === 'update_agent_profile')!;
  assert(updateProfileTool, 'update_agent_profile tool exists');

  const updateResult = await updateProfileTool.execute(
    {
      target_agent_id: initialAgent.id,
      name: 'Smoke Monkey Canvas Outreach Agent',
      role: 'Smoke Monkey Canvas Outreach & Campaign Specialist',
      description: 'Specialized in personalized email outreach campaigns for Smoke Monkey Canvas.',
      specialty: 'Email Marketing Campaign Management, Gmail MCP Integration, Lead Outreach Sequences',
    },
    { agentId: initialAgent.id, runId: 'run_test_profile' } as any,
  );

  if (!(updateResult as any).success) {
    console.error('updateProfileTool failed:', updateResult);
  }
  assert((updateResult as any).success, 'update_agent_profile tool succeeded');

  // Verify DB agent updated
  const updatedDbAgent = agentDb.getAgent(initialAgent.id)!;
  assert.strictEqual(updatedDbAgent.name, 'Smoke Monkey Canvas Outreach Agent');
  assert.strictEqual(updatedDbAgent.role, 'Smoke Monkey Canvas Outreach & Campaign Specialist');
  assert(updatedDbAgent.system_prompt.includes('Smoke Monkey Canvas Outreach Agent'), 'DB system_prompt updated with new name');
  assert(!updatedDbAgent.system_prompt.includes('People Ops Concierge'), 'DB system_prompt no longer contains old name');
  pass('update_agent_profile updates agent record and system_prompt in DB');

  // Verify disk system_prompt.md updated
  const diskPrompt = fs.readFileSync(ws.systemPromptFile, 'utf8');
  assert(diskPrompt.includes('Smoke Monkey Canvas Outreach Agent'), 'system_prompt.md on disk updated with new name');
  assert(!diskPrompt.includes('People Ops Concierge'), 'system_prompt.md on disk no longer contains old name');
  pass('update_agent_profile updates system_prompt.md in agent workspace');

  // Verify disk identity.md updated
  const identityDisk = fs.readFileSync(ws.memoryFiles['identity.md'], 'utf8');
  assert(identityDisk.includes('Smoke Monkey Canvas Outreach Agent'), 'identity.md on disk updated');
  pass('update_agent_profile updates identity.md in memory folder');

  // 4. Runtime self-healing in runAgent
  // Put a stale agent in DB
  const staleAgent = agentDb.createAgent({
    id: 'test_agent_stale_1',
    name: 'Senior Frontend Engineer',
    model: 'nvidia/nemotron-3-ultra-550b-a55b',
    provider: 'nvidia',
    system_prompt: `You are Database Administrator (agent name: "DBA Specialist").\n\n## MISSION\nManage Postgres.\n\n## OPERATING PRINCIPLES\n- Work autonomously.`,
    cron_schedule: null,
    cron_enabled: 0,
    pos_x: 200,
    pos_y: 200,
    status: 'idle',
    last_run_at: null,
    next_run_at: null,
    working_dir: path.join(tempDir, 'stale_workspace'),
    role: 'Senior Frontend Engineer',
    description: 'Build React UI components and canvas interactions.',
    specialty: 'React, Canvas Rendering, WebGL',
  });

  const staleWs = ensureAgentWorkspace(staleAgent.working_dir!, staleAgent.id, staleAgent.name, staleAgent.system_prompt);
  fs.writeFileSync(staleWs.systemPromptFile, staleAgent.system_prompt + '\n', 'utf8');

  // Reconcile via runner or isSystemPromptStale check
  assert(isSystemPromptStale(staleAgent.system_prompt, staleAgent), 'Stale agent prompt is detected');
  const healed = reconcileSystemPromptWithProfile(staleAgent.system_prompt, staleAgent);
  assert(healed.includes('agent name: "Senior Frontend Engineer"'), 'Healed prompt includes correct agent name');
  assert(healed.includes('React, Canvas Rendering, WebGL'), 'Healed prompt includes specialty');
  assert(!healed.includes('DBA Specialist'), 'DBA Specialist purged');
  pass('Runtime prompt self-healing reconciles stale identity');

  // Clean up
  try {
    agentDb.deleteAgent(testAgentId);
    agentDb.deleteAgent('test_agent_stale_1');
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {}

  console.log('All profile sync tests passed successfully! ✅');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
