import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import * as readline from 'node:readline';

const mcpScript = resolve(process.cwd(), 'bin', 'canvas-mcp.js');

console.log('🧪 Starting Collision Protection & Algorithmic Layout Test...');

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
  } catch (err) {
    console.error('Non-JSON output on stdout:', line);
  }
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
  // 1. Initialize
  const initRes = await callRpc('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' },
  });
  console.log('✅ Initialized MCP Server:', initRes.result.serverInfo.name);

  // 2. Create a test space
  const spaceRes = await callRpc('tools/call', {
    name: 'canvas_create_space',
    arguments: {
      name: 'Collision & Sizing Test Space',
      role_title: 'Global Office',
      width: 4800,
      height: 1800,
      x: 0,
      y: 0,
    },
  });
  const space = parseMcpJson(spaceRes);
  const spaceId = space.id;
  console.log('✅ Created test space:', spaceId);

  try {
    // 3. Create Zone 1 at Tier 1 (x: 100, y: 440, width: 600, height: 280)
    const z1Res = await callRpc('tools/call', {
      name: 'canvas_create_zone',
      arguments: {
        space_id: spaceId,
        name: 'Office of the CTO',
        roleTitle: 'Chief Technology Officer',
        level: 1,
        x: 100,
        y: 440,
        width: 600,
        height: 280,
      },
    });
    const z1 = parseMcpJson(z1Res);
    console.log(`✅ Zone 1 created at (${z1.x}, ${z1.y}), width: ${z1.width}`);

    // 4. Create Zone 2 at the EXACT SAME coordinates (x: 100, y: 440) -> Must auto-reposition!
    const z2Res = await callRpc('tools/call', {
      name: 'canvas_create_zone',
      arguments: {
        space_id: spaceId,
        name: 'Security Operations & CISO',
        roleTitle: 'Chief Information Security Officer',
        level: 1,
        x: 100,
        y: 440,
        width: 600,
        height: 280,
      },
    });
    const z2 = parseMcpJson(z2Res);
    console.log(`🛡️ Zone 2 requested at (100, 440), resolved to: (${z2.x}, ${z2.y}), width: ${z2.width}`);
    if (z2.x >= z1.x + z1.width) {
      console.log('  🎯 PASS: Zone 2 was safely positioned without overlapping Zone 1!');
    } else {
      console.error('  ❌ FAIL: Zone 2 collided with Zone 1!');
      process.exit(1);
    }

    // 5. Create Agent 1 in Zone 2
    const a1Res = await callRpc('tools/call', {
      name: 'canvas_create_agent',
      arguments: {
        space_id: spaceId,
        zone_id: z2.id,
        name: 'Agent Alpha',
        role: 'SecOps Lead',
        pos_x: z2.x + 50,
        pos_y: z2.y + 75,
      },
    });
    const a1 = parseMcpJson(a1Res);
    console.log(`✅ Agent 1 created at (${a1.pos_x}, ${a1.pos_y})`);

    // 6. Create Agent 2 in Zone 2 with the EXACT SAME coordinates -> Must auto-station at slot 1!
    const a2Res = await callRpc('tools/call', {
      name: 'canvas_create_agent',
      arguments: {
        space_id: spaceId,
        zone_id: z2.id,
        name: 'Agent Beta',
        role: 'Threat Hunter',
        pos_x: z2.x + 50,
        pos_y: z2.y + 75,
      },
    });
    const a2 = parseMcpJson(a2Res);
    console.log(`🛡️ Agent 2 requested at (${z2.x + 50}, ${z2.y + 75}), resolved to: (${a2.pos_x}, ${a2.pos_y})`);
    if (a2.pos_x >= a1.pos_x + 200) {
      console.log('  🎯 PASS: Agent 2 was safely placed at distinct slot without stacking on Agent 1!');
    } else {
      console.error('  ❌ FAIL: Agent 2 stacked on top of Agent 1!');
      process.exit(1);
    }

    // 7. Run canvas_audit_ui with auto_fix: true
    console.log('🔍 Running canvas_audit_ui with auto_fix: true...');
    const auditRes = await callRpc('tools/call', {
      name: 'canvas_audit_ui',
      arguments: {
        space_id: spaceId,
        auto_fix: true,
      },
    });
    const reportText = auditRes.result.content[0].text;
    console.log(reportText);

    if (reportText.includes('✅ PASS') && reportText.includes('Score: 100/100')) {
      console.log('🎉 100/100 AUDIT PASS CONFIRMED! Zero zone overlaps, zero agent collisions!');
    } else {
      console.error('❌ Audit did not achieve 100/100 PASS!');
      process.exit(1);
    }

  } finally {
    // Clean up test space
    console.log('🧹 Cleaning up test space...');
    await callRpc('tools/call', {
      name: 'canvas_delete_space',
      arguments: { space_id: spaceId },
    });
    child.kill();
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Test crashed:', err);
  child.kill();
  process.exit(1);
});
