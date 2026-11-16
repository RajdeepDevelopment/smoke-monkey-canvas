import { AgentDb } from '../server/features/agent/agent.db.js';
import { resolveAgentWorkspace } from '../server/features/agent/agent.prompt.js';
import { join, resolve } from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const db = new AgentDb();
const ctoId = 'agent_1793863641110_ztao';
const spaceId = 'zone-1793863640661-vc2n4r';
const cto = db.getAgent(ctoId);
if (!cto) {
  console.error('CTO not found!');
  process.exit(1);
}

const rootDir = process.cwd();
const mcpScript = resolve(rootDir, 'bin', 'canvas-mcp.js');

const mcpConfig = {
  command: 'node',
  args: [mcpScript, '--space-id', spaceId],
};

db.upsertAgentMcp({
  id: 'mcp_sm_canvas_cto',
  agent_id: ctoId,
  mcp_name: 'smoke-monkey-canvas',
  label: 'Smoke Monkey Canvas Architecture',
  config_json: JSON.stringify(mcpConfig),
  enabled: 1,
  source: 'canvas',
});

console.log('✅ Upserted agent_mcps record in DB for CTO');

// Also update .smoke-agent/mcp/mcp.json
const ws = resolveAgentWorkspace(cto);
const mcpJsonPath = join(ws, '.smoke-agent', 'mcp', 'mcp.json');
if (existsSync(mcpJsonPath)) {
  const mcpData = JSON.parse(readFileSync(mcpJsonPath, 'utf8'));
  mcpData.mcp_servers = mcpData.mcp_servers || {};
  mcpData.mcp_servers['smoke-monkey-canvas'] = {
    key: 'smoke-monkey-canvas',
    name: 'smoke-monkey-canvas',
    label: 'Smoke Monkey Canvas Architecture',
    description: 'Control, query, hire, modify, and architect multi-agent spaces, zones, agents, memories, credentials, and hierarchy in Smoke Monkey Canvas.',
    command: 'node',
    args: [mcpScript, '--space-id', spaceId],
    stock: true,
    enabled: true,
    source: 'canvas',
    attachment_id: 'mcp_sm_canvas_cto',
  };
  mcpData.updated_at = new Date().toISOString();
  writeFileSync(mcpJsonPath, JSON.stringify(mcpData, null, 2), 'utf8');
  console.log('✅ Updated mcp.json in workspace for CTO');
}

// Update memory/facts.md to record the Canvas MCP capability
const memoryDir = join(ws, '.smoke-agent', 'memory');
const factsPath = join(memoryDir, 'facts.md');
if (existsSync(factsPath)) {
  let facts = readFileSync(factsPath, 'utf8');
  if (!facts.includes('smoke-monkey-canvas')) {
    facts += `\n\n## Canvas Architecture Tooling (MCP)
- **Attached MCP**: \`smoke-monkey-canvas\` (Scoped to active company space \`${spaceId}\`)
- **Capabilities**: Can autonomously create/update zones (\`canvas_create_zone\`, \`canvas_update_zone\`), hire squad members (\`canvas_create_agent\`), assign agents to zones (\`canvas_move_agent_to_zone\`), configure provider API keys (\`canvas_set_api_key\`), inspect credentials (\`canvas_get_provider_status\`), and cascade architectural memory down the engineering tree (\`canvas_cascade_memory\`).
- **Leadership Boundary**: Zero-coding governance applies. Use Canvas MCP tools to architect, expand squads, and assign tickets; do not write application code directly.
`;
    writeFileSync(factsPath, facts, 'utf8');
    console.log('✅ Updated facts.md for CTO');
  }
}

console.log('🎉 CTO Marcus Chen is now fully equipped with the Smoke Monkey Canvas Architecture MCP!');
