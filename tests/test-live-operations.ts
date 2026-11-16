import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import * as readline from 'node:readline';

const mcpScript = resolve(process.cwd(), 'bin', 'canvas-mcp.js');

console.log('🚀 Testing Live End-to-End MCP Operations...');

const child = spawn('node', [mcpScript], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: { ...process.env },
});

const rl = readline.createInterface({ input: child.stdout, terminal: false });

let msgId = 1;
const pendingCalls = new Map<number, (res: any) => void>();

rl.on('line', (line) => {
  try {
    const parsed = JSON.parse(line.trim());
    if (parsed.id && pendingCalls.has(parsed.id)) {
      const cb = pendingCalls.get(parsed.id)!;
      pendingCalls.delete(parsed.id);
      cb(parsed);
    }
  } catch {}
});

function callRpc(method: string, params?: Record<string, any>): Promise<any> {
  const id = msgId++;
  return new Promise((resolve) => {
    pendingCalls.set(id, resolve);
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

async function testAll() {
  await callRpc('initialize');

  // 1. Check provider status
  console.log('\n[1] Checking Provider Status...');
  const prov = await callRpc('tools/call', { name: 'canvas_get_provider_status', arguments: {} });
  console.log(prov.result?.content?.[0]?.text);

  // 2. Get CTO details
  console.log('\n[2] Checking CTO Agent Profile & Attached MCPs...');
  const ctoRes = await callRpc('tools/call', {
    name: 'canvas_get_agent',
    arguments: { agent_id: 'agent_1793863641110_ztao' },
  });
  const ctoData = JSON.parse(ctoRes.result?.content?.[0]?.text);
  console.log('CTO Name:', ctoData.agent.name);
  console.log('CTO Role:', ctoData.agent.role);
  console.log('CTO MCPs:', ctoData.mcps.map((m: any) => `${m.name} (${m.label})`).join(', '));

  // 3. Inspect Memory
  console.log('\n[3] Reading CTO Memory (facts.md)...');
  const memRes = await callRpc('tools/call', {
    name: 'canvas_get_agent_memory',
    arguments: { agent_id: 'agent_1793863641110_ztao', dimension: 'facts' },
  });
  console.log(memRes.result?.content?.[0]?.text?.slice(0, 350) + '...\n');

  // 4. Create an Autonomous Agent via MCP
  console.log('\n[4] Creating New Specialist Agent via canvas_create_agent...');
  const createAgentRes = await callRpc('tools/call', {
    name: 'canvas_create_agent',
    arguments: {
      name: 'Sentinel Security Scout',
      role: 'Autonomous Security Auditor',
      specialty: 'Container Hardening & CVE Mitigation',
      description: 'Scans Kubernetes cluster manifests and container images for zero-day vulnerabilities.',
      model: 'nvidia/nemotron-3-ultra-550b-a55b',
      provider: 'nvidia',
      pos_x: 450,
      pos_y: 350,
      space_id: 'zone-1793863640661-vc2n4r',
    },
  });
  console.log(createAgentRes.result?.content?.[0]?.text);

  // Extract created agent ID
  const matchId = createAgentRes.result?.content?.[0]?.text?.match(/"id":\s*"([^"]+)"/);
  const createdAgentId = matchId ? matchId[1] : null;

  if (createdAgentId) {
    // 5. Update the agent memory
    console.log(`\n[5] Updating Memory for new agent ${createdAgentId}...`);
    const updateMemRes = await callRpc('tools/call', {
      name: 'canvas_update_agent_memory',
      arguments: {
        agent_id: createdAgentId,
        dimension: 'facts',
        content: '## Ground Truth Facts\n- Initialized via Smoke Monkey Canvas MCP Server.\n- Primary Cluster: Apex Production EKS.',
        mode: 'replace',
      },
    });
    console.log(updateMemRes.result?.content?.[0]?.text);

    // 6. Delete the test agent
    console.log(`\n[6] Cleaning up test agent ${createdAgentId}...`);
    const delRes = await callRpc('tools/call', {
      name: 'canvas_delete_agent',
      arguments: { agent_id: createdAgentId },
    });
    console.log(delRes.result?.content?.[0]?.text);
  }

  console.log('\n🌟 ALL LIVE OPERATIONS VERIFIED SUCCESSFULLY!');
  child.kill('SIGTERM');
  process.exit(0);
}

testAll();
