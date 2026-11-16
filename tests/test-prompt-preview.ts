import { buildAgentWorkspace, writeCommonAgentRegistry } from '../server/features/agent/agent.manifest.js';
import { buildSubPrompts } from '../server/features/agent/agent.prompt.js';
import { AgentDb } from '../server/features/agent/agent.db.js';
import { homedir } from 'node:os';
import { join } from 'node:path';

const db = new AgentDb();
const configuredAgentId = process.env.SMOKE_AGENT_ID;
const elena = configuredAgentId
  ? db.getAgent(configuredAgentId)
  : db.getAllAgents().find((a) => a.name.includes('Elena')) ?? db.getAllAgents()[0];
if (!elena) {
  console.error('No agent found (set SMOKE_AGENT_ID to target a specific agent)');
  process.exit(1);
}

const workingDir = elena.working_dir || process.cwd();
const commonRoot = process.env.SMOKE_COMMON_DIR || join(homedir(), '.smoke-agents', '.smoke-common');
const ws = buildAgentWorkspace(workingDir);
const common = writeCommonAgentRegistry(commonRoot, [], []);

const subPrompts = buildSubPrompts({
  policyEntries: [],
  disabledTools: [],
  resolvedWorkspace: workingDir,
  memoryLimitMb: 1024,
  personalities: elena.personalities,
  outputStyles: elena.output_styles,
  manifest: ws,
  common,
  agentId: elena.id,
  agentName: elena.name,
});

console.log(`Generated ${subPrompts.length} sub-prompts.`);
console.log('\n=== PREVIEW OF MEMORY PROMPT BLOCK (First 1500 chars) ===\n');
console.log(subPrompts[1].slice(0, 1500));
console.log('\n=== CHECKING ALL 10 DIMENSIONS IN THE PROMPT ===\n');
const expected = [
  'facts.md', 'semantic.md', 'associative.md', 'procedural.md',
  'reflective.md', 'prospective.md', 'identity.md', 'preferences.md',
  'working.md', 'episodic.md'
];
for (const file of expected) {
  const found = subPrompts[1].includes(file);
  console.log(`- ${file}: ${found ? '✅ INCLUDED WITH CONTENT' : '❌ MISSING'}`);
}
process.exit(0);
