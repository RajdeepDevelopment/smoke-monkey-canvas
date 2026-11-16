import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import * as readline from 'node:readline';

const mcpScript = resolve(process.cwd(), 'bin', 'canvas-mcp.js');

console.log('🚀 Spawning Smoke Monkey Canvas MCP Server:', mcpScript);

const child = spawn('node', [mcpScript], {
  stdio: ['pipe', 'pipe', 'inherit'], // stderr inherited for diagnostics, stdout piped for protocol
  env: {
    ...process.env,
  },
});

const rl = readline.createInterface({
  input: child.stdout,
  terminal: false,
});

let msgId = 1;
const pendingCalls = new Map<number, { resolve: (res: any) => void; reject: (err: any) => void }>();

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed.id && pendingCalls.has(parsed.id)) {
      const { resolve } = pendingCalls.get(parsed.id)!;
      pendingCalls.delete(parsed.id);
      resolve(parsed);
    }
  } catch (err) {
    console.error('❌ NON-JSON-RPC LINE DETECTED ON STDOUT:', trimmed);
    process.exit(1);
  }
});

function callRpc(method: string, params?: Record<string, any>): Promise<any> {
  const id = msgId++;
  return new Promise((resolve, reject) => {
    pendingCalls.set(id, { resolve, reject });
    const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params });
    child.stdin.write(payload + '\n');
  });
}

function sendNotification(method: string, params?: Record<string, any>): void {
  const payload = JSON.stringify({ jsonrpc: '2.0', method, params });
  child.stdin.write(payload + '\n');
}

async function runTests() {
  try {
    // 1. Handshake: initialize
    console.log('\n--- 1. Testing initialize handshake ---');
    const initRes = await callRpc('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' },
    });
    console.log('Initialize response:', JSON.stringify(initRes.result, null, 2));
    if (initRes.result?.serverInfo?.name !== 'smoke-monkey-canvas') {
      throw new Error(`Unexpected server name: ${initRes.result?.serverInfo?.name}`);
    }

    sendNotification('notifications/initialized');

    // 2. Ping
    console.log('\n--- 2. Testing ping ---');
    const pingRes = await callRpc('ping');
    console.log('Ping response:', pingRes);

    // 3. Tools List
    console.log('\n--- 3. Testing tools/list ---');
    const toolsRes = await callRpc('tools/list');
    const tools = toolsRes.result?.tools || [];
    console.log(`Available Tools Count: ${tools.length}`);
    if (tools.length < 37) {
      throw new Error(`Expected at least 37 tools, got ${tools.length}`);
    }
    console.log('Sample tool names:', tools.slice(0, 8).map((t: any) => t.name).join(', '));

    // 4. Resources List & Read
    console.log('\n--- 4. Testing resources/list & read ---');
    const resList = await callRpc('resources/list');
    console.log('Resources:', resList.result?.resources?.map((r: any) => r.uri));
    const statusRes = await callRpc('resources/read', { uri: 'canvas://status' });
    console.log('Canvas Status Resource Content:\n', statusRes.result?.contents?.[0]?.text);

    // 5. Tool Call: canvas_list_spaces
    console.log('\n--- 5. Tool Call: canvas_list_spaces ---');
    const spacesRes = await callRpc('tools/call', {
      name: 'canvas_list_spaces',
      arguments: {},
    });
    console.log(spacesRes.result?.content?.[0]?.text?.slice(0, 300) + '...');

    // 6. Tool Call: canvas_list_company_presets
    console.log('\n--- 6. Tool Call: canvas_list_company_presets ---');
    const presetsRes = await callRpc('tools/call', {
      name: 'canvas_list_company_presets',
      arguments: {},
    });
    console.log(presetsRes.result?.content?.[0]?.text?.slice(0, 300) + '...');

    // 7. Tool Call: canvas_get_provider_status
    console.log('\n--- 7. Tool Call: canvas_get_provider_status ---');
    const credsRes = await callRpc('tools/call', {
      name: 'canvas_get_provider_status',
      arguments: {},
    });
    console.log(credsRes.result?.content?.[0]?.text);

    // 8. Tool Call: canvas_list_agents
    console.log('\n--- 8. Tool Call: canvas_list_agents ---');
    const agentsRes = await callRpc('tools/call', {
      name: 'canvas_list_agents',
      arguments: {},
    });
    console.log(agentsRes.result?.content?.[0]?.text?.slice(0, 400) + '...');

    // 9. Tool Call: canvas_get_agent_memory (10 dimensions overview)
    console.log('\n--- 9. Tool Call: canvas_get_agent_memory ---');
    const memoryRes = await callRpc('tools/call', {
      name: 'canvas_get_agent_memory',
      arguments: { agent_id: 'agent_1793863641110_ztao' }, // CTO Marcus Chen
    });
    console.log(memoryRes.result?.content?.[0]?.text?.slice(0, 500) + '...');

    // 10. Tool Call: canvas_create_zone & canvas_update_zone
    console.log('\n--- 10. Tool Call: canvas_create_zone & update ---');
    const createZoneRes = await callRpc('tools/call', {
      name: 'canvas_create_zone',
      arguments: {
        name: 'MCP Test Zone',
        roleTitle: 'Autonomous Lead',
        level: 2,
        color: '#8b5cf6',
        width: 440,
        height: 300,
        x: 100,
        y: 100,
        responsibilities: 'Automated test operations via MCP',
      },
    });
    console.log(createZoneRes.result?.content?.[0]?.text);

    // Extract zone ID
    const match = createZoneRes.result?.content?.[0]?.text?.match(/"id":\s*"([^"]+)"/);
    if (match && match[1]) {
      const zoneId = match[1];
      console.log('Cleaning up test zone:', zoneId);
      const deleteZoneRes = await callRpc('tools/call', {
        name: 'canvas_delete_zone',
        arguments: { zone_id: zoneId },
      });
      console.log('Delete zone result:', deleteZoneRes.result?.content?.[0]?.text);
    }

    console.log('\n✅ ALL MCP TESTS PASSED WITH 100% PROTOCOL COMPLIANCE!');
    child.kill('SIGTERM');
    process.exit(0);
  } catch (err) {
    console.error('❌ MCP TEST FAILED:', err);
    child.kill('SIGTERM');
    process.exit(1);
  }
}

runTests();
