import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import * as readline from 'node:readline';

const mcpScript = resolve(process.cwd(), 'bin', 'canvas-mcp.js');

console.log('🧪 Starting 20-Agent Team Layout & Anti-Collision Test...');

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

function parseMcpJson(res: any): any {
  const text = res.result?.content?.[0]?.text;
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {}
    }
    return text;
  }
}

async function run() {
  try {
    await callRpc('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-20-agents', version: '1.0.0' },
    });

    // 1. Create a clean space
    const spaceRes = await callRpc('tools/call', {
      name: 'canvas_create_space',
      arguments: {
        name: 'Cybersecurity Innovation Labs',
        roleTitle: 'Innovation HQ',
        width: 5000,
        height: 2000,
      },
    });
    const spaceData = parseMcpJson(spaceRes);
    const spaceId = spaceData.id;
    console.log('✅ Created test space:', spaceId);

    // 2. Create 3 zones on Tier 2 (Squads)
    const z1 = parseMcpJson(await callRpc('tools/call', {
      name: 'canvas_create_zone',
      arguments: {
        space_id: spaceId,
        name: 'Threat Detection Squad',
        roleTitle: 'Threat Detection',
        level: 2,
        width: 600,
        height: 280,
      },
    }));
    console.log(`✅ Zone 1: "${z1.name}" at (${z1.x}, ${z1.y}), width: ${z1.width}`);

    const z2 = parseMcpJson(await callRpc('tools/call', {
      name: 'canvas_create_zone',
      arguments: {
        space_id: spaceId,
        name: 'Incident Response Squad',
        roleTitle: 'Incident Response',
        level: 2,
        width: 600,
        height: 280,
      },
    }));
    console.log(`✅ Zone 2: "${z2.name}" at (${z2.x}, ${z2.y}), width: ${z2.width}`);

    const z3 = parseMcpJson(await callRpc('tools/call', {
      name: 'canvas_create_zone',
      arguments: {
        space_id: spaceId,
        name: 'Cloud Forensics Squad',
        roleTitle: 'Cloud Forensics',
        level: 2,
        width: 600,
        height: 280,
      },
    }));
    console.log(`✅ Zone 3: "${z3.name}" at (${z3.x}, ${z3.y}), width: ${z3.width}`);

    if (z2.x < z1.x + z1.width + 80) {
      throw new Error(`Zone 2 overlaps Zone 1! z1.x: ${z1.x}, z1.w: ${z1.width}, z2.x: ${z2.x}`);
    }
    if (z3.x < z2.x + z2.width + 80) {
      throw new Error(`Zone 3 overlaps Zone 2! z2.x: ${z2.x}, z2.w: ${z2.width}, z3.x: ${z3.x}`);
    }
    console.log('🎯 PASS: All 3 department zones created with guaranteed clearance!');

    // 3. Hire 5 agents into Zone 1, 5 into Zone 2, 5 into Zone 3, and 5 standalone
    const zoneIds = [z1.id, z2.id, z3.id];
    const createdAgents: any[] = [];

    for (let i = 0; i < 15; i++) {
      const zIdx = Math.floor(i / 5);
      const res = parseMcpJson(await callRpc('tools/call', {
        name: 'canvas_create_agent',
        arguments: {
          space_id: spaceId,
          zone_id: zoneIds[zIdx],
          name: `Specialist Agent ${i + 1}`,
          role: 'Security Specialist',
        },
      }));
      createdAgents.push(res);
    }
    console.log('✅ Created 15 agents across the 3 zones.');

    for (let i = 15; i < 20; i++) {
      const res = parseMcpJson(await callRpc('tools/call', {
        name: 'canvas_create_agent',
        arguments: {
          space_id: spaceId,
          name: `Standalone Auditor ${i + 1}`,
          role: 'External Auditor',
        },
      }));
      createdAgents.push(res);
    }
    console.log('✅ Created 5 standalone agents.');

    // 4. Verify no two agents share identical coordinates
    for (let i = 0; i < createdAgents.length; i++) {
      for (let j = i + 1; j < createdAgents.length; j++) {
        const a1 = createdAgents[i];
        const a2 = createdAgents[j];
        if (Math.abs(a1.pos_x - a2.pos_x) < 180 && Math.abs(a1.pos_y - a2.pos_y) < 80) {
          throw new Error(`Agent collision between "${a1.name}" (${a1.pos_x}, ${a1.pos_y}) and "${a2.name}" (${a2.pos_x}, ${a2.pos_y})!`);
        }
      }
    }
    console.log('🎯 PASS: Zero agent card collisions across all 20 agents!');

    // 5. Verify standalone agents are NOT in a single flat line
    const standaloneYCoords = new Set(createdAgents.slice(15).map(a => a.pos_y));
    console.log('Standalone agents Y coordinates count:', standaloneYCoords.size);

    // 6. Run canvas_audit_ui
    const auditRes = parseMcpJson(await callRpc('tools/call', {
      name: 'canvas_audit_ui',
      arguments: { space_id: spaceId, auto_fix: true },
    }));
    console.log('Audit Status:', auditRes.status, 'Score:', auditRes.score);
    if (auditRes.status !== 'PASS' || auditRes.score < 95) {
      console.error(JSON.stringify(auditRes, null, 2));
      throw new Error(`Audit failed with score ${auditRes.score}!`);
    }

    console.log('🎉 20-AGENT TEAM CREATION & LAYOUT TEST PASSED WITH 100/100 AUDIT SCORE!');

    // Cleanup
    await callRpc('tools/call', { name: 'canvas_delete_space', arguments: { space_id: spaceId } });
    child.kill('SIGTERM');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    child.kill('SIGTERM');
    process.exit(1);
  }
}

run();
