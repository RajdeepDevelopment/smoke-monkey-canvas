import { buildAgentWorkspace, memoryMatrixContentBlock } from '../server/features/agent/agent.manifest.js';

const ws = buildAgentWorkspace('/Users/rajdeepsadhu/.smoke-agents/elena-vance-ceo-agent_1793863640670_z78d');
const text = memoryMatrixContentBlock(ws);
console.log('Total characters in memory block:', text.length);
console.log('\n--- SAMPLE PREVIEW ---');
console.log(text.slice(0, 1200));
process.exit(0);
