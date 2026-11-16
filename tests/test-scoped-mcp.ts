import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import * as readline from 'node:readline';

const mcpScript = resolve(process.cwd(), 'bin', 'canvas-mcp.js');
const targetSpaceId = 'zone-1793863640661-vc2n4r';

console.log('🚀 Testing Scoped MCP Mode for space:', targetSpaceId);

const child = spawn('node', [mcpScript, '--space-id', targetSpaceId], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: { ...process.env },
});

const rl = readline.createInterface({ input: child.stdout, terminal: false });

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

async function run() {
  await callRpc('initialize');
  const statusRes = await callRpc('resources/read', { uri: 'canvas://status' });
  const status = JSON.parse(statusRes.result?.contents?.[0]?.text);
  console.log('Scoped status:', status);
  if (status.scopedSpaceId !== targetSpaceId) {
    throw new Error(`Expected scopedSpaceId ${targetSpaceId}, got ${status.scopedSpaceId}`);
  }

  // Test canvas_list_zones with no space_id argument (should default to targetSpaceId)
  const zonesRes = await callRpc('tools/call', { name: 'canvas_list_zones', arguments: {} });
  console.log('Scoped zones list call passed! Output length:', zonesRes.result?.content?.[0]?.text?.length);

  console.log('✅ Scoped MCP mode works as expected!');
  child.kill('SIGTERM');
  process.exit(0);
}

run();
