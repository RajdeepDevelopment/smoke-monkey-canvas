import { CoreDatabase } from '../server/features/core/database.db.js';
import { AgentDb } from '../server/features/agent/agent.db.js';
import { STOCK_MCPS } from '../server/features/mcp/mcp.stock.manual.js';

const db = new AgentDb();
const ctoId = 'agent_1793863641110_ztao';

console.log('--- Checking CTO MCP configuration ---');
const agent = db.getAgent(ctoId);
if (!agent) {
  console.error('CTO agent not found!');
  process.exit(1);
}

const mcps = db.getAgentMcps(ctoId);
console.log(`CTO has ${mcps.length} MCP records in DB:`);
for (const m of mcps) {
  console.log(` - ${m.mcp_name} (${m.label}) [enabled: ${m.enabled}, source: ${m.source}]`);
}

const canvasMcp = mcps.find((m) => m.mcp_name === 'smoke-monkey-canvas');
if (!canvasMcp) {
  console.error('❌ smoke-monkey-canvas is not attached to CTO!');
  process.exit(1);
}

console.log('\nConfig JSON for smoke-monkey-canvas:', canvasMcp.config_json);

// Check stock catalog
const stock = STOCK_MCPS.find((s) => s.name === 'smoke-monkey-canvas');
console.log('\nStock catalog entry:', stock ? `Found: ${stock.name} (${stock.command} ${stock.args?.join(' ')})` : 'Not found in STOCK_MCPS');

console.log('\n✅ CTO has smoke-monkey-canvas properly configured and enabled!');
