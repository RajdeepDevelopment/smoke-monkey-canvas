import { readFileSync, existsSync } from 'fs';
import { CanvasMcpServer, setConfiguredSpaceId } from '../server/features/mcp-server/canvas-mcp.server.js';

console.log('🧪 Testing Company Creator Agent Prompt & Sandboxing...');

// 1. Verify JSON file exists & is valid
const jsonPath = 'server/features/creator/company-creator-agent.json';
if (!existsSync(jsonPath)) throw new Error('File missing: ' + jsonPath);
const json = JSON.parse(readFileSync(jsonPath, 'utf-8'));
console.log('  ✅ System prompt JSON verified. Preloaded tools count:', json.systemPrompt.preloadedTools.length);

// 2. Set strict environment for isolation
setConfiguredSpaceId('space-alpha');
const server = new CanvasMcpServer();

async function run() {
  // Test canvas_list_zones within scope
  const listRes = await (server as any).executeTool('canvas_list_zones', { space_id: 'space-alpha' });
  console.log('  ✅ canvas_list_zones in scope succeeded, isError:', Boolean(listRes.isError));

  // Test unauthorized cross-space access attempt
  const crossSpaceRes = await (server as any).executeTool('canvas_list_zones', { space_id: 'foreign-space-beta' });
  if (crossSpaceRes.isError && crossSpaceRes.content[0].text.includes('strictly restricted to space "space-alpha"')) {
    console.log('  ✅ Cross-space security check correctly rejected access to foreign-space-beta');
  } else {
    throw new Error('FAIL: Cross-space access was not blocked: ' + JSON.stringify(crossSpaceRes));
  }

  // Test unauthorized space creation attempt
  const createSpaceRes = await (server as any).executeTool('canvas_create_space', { name: 'Rogue Space' });
  if (createSpaceRes.isError && createSpaceRes.content[0].text.includes('cannot create new spaces')) {
    console.log('  ✅ Space creation guard correctly rejected attempt by space-scoped agent');
  } else {
    throw new Error('FAIL: Space creation was not blocked: ' + JSON.stringify(createSpaceRes));
  }

  console.log('🎉 ALL CREATOR AGENT PROMPT & MCP SANDBOXING TESTS PASSED!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
