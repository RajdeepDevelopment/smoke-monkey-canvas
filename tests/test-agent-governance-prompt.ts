import { CoreDatabase } from '../server/features/core/database.db.js';
import { SpaceDb } from '../server/features/space/space.db.js';
import { AgentDb } from '../server/features/agent/agent.db.js';
import { buildAgentTeamWorkflowBlock } from '../server/features/space/space.workflow.js';
import { buildEffectiveSystemPrompt, resolveAgentWorkspace } from '../server/features/agent/agent.prompt.js';
import { ensureAgentWorkspace } from '../server/features/agent/agent.manifest.js';

const coreDb = CoreDatabase.getInstance();
const db = new AgentDb(coreDb);
const spaceDb = new SpaceDb(coreDb);

// Create a test space
const testSpace = spaceDb.createWorkspaceSpace({
  name: 'Sechpoint Deep Packet Inspection Tech',
  roleTitle: 'Corporate HQ',
  width: 5000,
  height: 1800,
  x: 0,
  y: 0,
});

// Create test CEO agent
const testAgent = db.createAgent({
  id: 'test_ceo_' + Date.now(),
  name: 'Elena Rostova, CEO',
  model: 'meta/llama-3.3-70b-instruct',
  provider: 'nvidia',
  system_prompt: 'You are the Chief Executive Officer leading Sechpoint DPI Technologies.',
  cron_schedule: null,
  cron_enabled: 0,
  pos_x: 2750,
  pos_y: 80,
  status: 'idle',
  role: 'Chief Executive Officer',
  specialty: 'Enterprise Strategy',
  description: 'CEO',
  working_dir: '/tmp',
  last_run_at: null,
  next_run_at: null,
});
spaceDb.setAgentSpace(testAgent.id, testSpace.id);

const ws = ensureAgentWorkspace(resolveAgentWorkspace(testAgent), testAgent.id, testAgent.name, testAgent.system_prompt);

const teamWorkflow = buildAgentTeamWorkflowBlock(testAgent.id, db, spaceDb);
const effective = buildEffectiveSystemPrompt(testAgent.system_prompt, {
  policyEntries: [],
  disabledTools: [],
  resolvedWorkspace: '/tmp',
  memoryLimitMb: 1024,
  personalities: null,
  outputStyles: null,
  manifest: ws,
  common: { dir: '/tmp', mcpFile: '', envFile: '', readmeFile: '' },
  agentId: testAgent.id,
  agentName: testAgent.name,
  teamWorkflow,
});

console.log('testSpace.id:', testSpace?.id);
console.log('teamWorkflow has testSpace.id?:', teamWorkflow.includes(testSpace.id));
if (!teamWorkflow.includes(testSpace.id)) {
  console.log('teamWorkflow head:\n', teamWorkflow.slice(0, 500));
}
console.log('✅ Has Canvas Governance Block:', effective.includes('SMOKE MONKEY CANVAS GOVERNANCE & LIVE MULTI-AGENT CONTROL'));
console.log('✅ Has Action Mandate for adding agents:', effective.includes('YOU MUST DIRECTLY INVOKE THE CANVAS MCP TOOLS IN YOUR ACTIVE TURN!'));
console.log('✅ Has Part-of-Canvas awareness:', effective.includes('where you are stationed'));
console.log('✅ Has Home Space Scope ID:', effective.includes(testSpace.id));

// Extract the Governance block to display
const match = effective.match(/## 🎨 SMOKE MONKEY CANVAS GOVERNANCE[\s\S]*?(?=##|$)/);
if (match) {
  console.log('\n--- EXTRACTED GOVERNANCE PROMPT BLOCK ---\n' + match[0]);
}

// Clean up
db.deleteAgent(testAgent.id);
spaceDb.deleteWorkspaceSpace(testSpace.id);
console.log('\n🎉 Test completed successfully!');
process.exit(0);
