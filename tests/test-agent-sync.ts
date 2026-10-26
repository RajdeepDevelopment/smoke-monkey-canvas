import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CoreDatabase } from '../server/features/core/database.db.js';
import { AgentDb } from '../server/features/agent/agent.db.js';
import { SpaceDb } from '../server/features/space/space.db.js';
import {
  ensureAgentWorkspace,
  readAgentMcpManifest,
  readAgentSkillManifest,
  reconcileAgentWorkspaceRuntime,
} from '../server/features/agent/agent.manifest.js';
import { setupAgentWorkspaceWatcher, unwatchAgentWorkspace } from '../server/features/agent/agent.files.js';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-sync-'));
const coreDb = new CoreDatabase(path.join(root, 'canvas.db'));
const agentDb = new AgentDb(coreDb);
const spaceDb = new SpaceDb(coreDb);

const created = new Date(Date.now() - 10_000).toISOString();
const mkAgent = (id: string, name: string, dir: string) =>
  agentDb.createAgent({
    id,
    name,
    model: 'test/model',
    provider: 'ollama',
    system_prompt: 'original prompt',
    status: 'idle',
    working_dir: dir,
    cron_schedule: null,
    cron_enabled: 0,
    pos_x: 0,
    pos_y: 0,
    last_run_at: null,
    next_run_at: null,
    created_at: created,
  });

const writeAgentSkill = (ws: ReturnType<typeof ensureAgentWorkspace>, name: string) => {
  const existing = readAgentSkillManifest(ws);
  const next = [...existing.filter((e) => e.name !== name), { name, description: `${name} desc`, content: `body of ${name}`, enabled: true, source: 'agent' as const }];
  fs.writeFileSync(ws.skillsFile, JSON.stringify({ skills: next }, null, 2));
};

const writeAgentMcp = (ws: ReturnType<typeof ensureAgentWorkspace>, name: string) => {
  const existing = readAgentMcpManifest(ws);
  const next = [...existing.filter((e) => e.name !== name), { key: name, name, label: name, command: 'node', args: ['server.js'], enabled: true, source: 'agent' as const }];
  fs.writeFileSync(ws.mcpFile, JSON.stringify({ mcp_servers: next }, null, 2));
};

async function main() {
  // ── Agent A: self-authored config ──────────────────────────────────────────
  const dirA = path.join(root, 'agent-a');
  const a = mkAgent('agent_a', 'Agent A', dirA);
  const wsA = ensureAgentWorkspace(dirA, a.id, a.name, a.system_prompt);

  writeAgentSkill(wsA, 'A Custom Skill');
  writeAgentMcp(wsA, 'a-custom-mcp');
  fs.writeFileSync(wsA.systemPromptFile, 'prompt updated by agent A\n');

  const broadcasts: { type: string; agentId?: string }[] = [];
  const wsServer = { broadcast: (msg: { type: string; agentId?: string }) => broadcasts.push(msg) };

  const before = { skills: agentDb.getAgentSkills(a.id).length, mcps: agentDb.getAgentMcps(a.id).length };
  reconcileAgentWorkspaceRuntime({ agentId: a.id, ws: wsA, db: agentDb, wsServer });

  const skillsAfter = agentDb.getAgentSkills(a.id);
  const mcpsAfter = agentDb.getAgentMcps(a.id);
  const promptAfter = agentDb.getAgent(a.id)?.system_prompt;

  // Idempotency: a second reconcile must not duplicate rows.
  reconcileAgentWorkspaceRuntime({ agentId: a.id, ws: wsA, db: agentDb, wsServer });
  const skillsAfter2 = agentDb.getAgentSkills(a.id);
  const mcpsAfter2 = agentDb.getAgentMcps(a.id);

  // ── Agent B: peer configured by someone else (files written to its folder) ──
  const dirB = path.join(root, 'agent-b');
  const b = mkAgent('agent_b', 'Agent B', dirB);
  const wsB = ensureAgentWorkspace(dirB, b.id, b.name, b.system_prompt);
  writeAgentSkill(wsB, 'B Skill From Peer');
  reconcileAgentWorkspaceRuntime({ agentId: b.id, ws: wsB, db: agentDb, wsServer });

  // ── Read path: /space (what the canvas agent box renders) ───────────────────
  const entities = spaceDb.getAllSpaceEntities();
  const boxA = entities.find((e) => e.id === a.id);
  const boxB = entities.find((e) => e.id === b.id);

  // ── Removal: Agent A removes previous skill, leaving 'another-skill' ───────
  fs.writeFileSync(
    wsA.skillsFile,
    JSON.stringify({ skills: [{ name: 'another-skill', description: 'x', content: '', enabled: true, source: 'agent' }] }, null, 2),
  );
  reconcileAgentWorkspaceRuntime({ agentId: a.id, ws: wsA, db: agentDb, wsServer });
  const skillsAfterRemoval = agentDb.getAgentSkills(a.id).filter((s) => s.skill_name === 'A Custom Skill');

  // ── Specific User Bug: Agent C starts with 3 skills, removes 2, keeps 1 ───
  const dirC = path.join(root, 'agent-c');
  const c = mkAgent('agent_c', 'Agent C', dirC);
  const wsC = ensureAgentWorkspace(dirC, c.id, c.name, c.system_prompt);

  agentDb.addAgentSkill({ id: 'c_s1', agent_id: c.id, skill_name: 'skill-alpha', description: null, content: '', enabled: 1 });
  agentDb.addAgentSkill({ id: 'c_s2', agent_id: c.id, skill_name: 'skill-beta', description: null, content: '', enabled: 1 });
  agentDb.addAgentSkill({ id: 'c_s3', agent_id: c.id, skill_name: 'skill-gamma', description: null, content: '', enabled: 1 });

  // Agent edits skills.json, keeping ONLY skill-gamma (removing skill-alpha and skill-beta)
  fs.writeFileSync(
    wsC.skillsFile,
    JSON.stringify({ skills: [{ name: 'skill-gamma', description: 'kept skill', enabled: true }] }, null, 2),
  );
  reconcileAgentWorkspaceRuntime({ agentId: c.id, ws: wsC, db: agentDb, wsServer });

  const skillsAfterCPrune = agentDb.getAgentSkills(c.id);
  const alphaRemoved = !skillsAfterCPrune.some((s) => s.skill_name === 'skill-alpha');
  const betaRemoved = !skillsAfterCPrune.some((s) => s.skill_name === 'skill-beta');
  const gammaKept = skillsAfterCPrune.some((s) => s.skill_name === 'skill-gamma') && skillsAfterCPrune.length === 1;

  // Agent C now removes the last skill (0 skills remaining in skills.json)
  fs.writeFileSync(wsC.skillsFile, JSON.stringify({ skills: [] }, null, 2));
  reconcileAgentWorkspaceRuntime({ agentId: c.id, ws: wsC, db: agentDb, wsServer });
  const skillsAfterAllPruned = agentDb.getAgentSkills(c.id);

  // ── Agent D: raw array format `["direct-skill-1", "direct-skill-2"]` ───────
  const dirD = path.join(root, 'agent-d');
  const d = mkAgent('agent_d', 'Agent D', dirD);
  const wsD = ensureAgentWorkspace(dirD, d.id, d.name, d.system_prompt);
  fs.writeFileSync(wsD.skillsFile, JSON.stringify(['direct-skill-1', 'direct-skill-2'], null, 2));
  reconcileAgentWorkspaceRuntime({ agentId: d.id, ws: wsD, db: agentDb, wsServer });
  const skillsD = agentDb.getAgentSkills(d.id);

  // ── Agent E: live watcher test (file edited asynchronously on disk) ──────────
  const dirE = path.join(root, 'agent-e');
  const e = mkAgent('agent_e', 'Agent E', dirE);
  const wsE = ensureAgentWorkspace(dirE, e.id, e.name, e.system_prompt);
  agentDb.addAgentSkill({ id: 'e_s1', agent_id: e.id, skill_name: 'live-skill-1', description: null, content: '', enabled: 1 });
  agentDb.addAgentSkill({ id: 'e_s2', agent_id: e.id, skill_name: 'live-skill-2', description: null, content: '', enabled: 1 });

  let liveBroadcastFired = false;
  const liveWsServer = {
    broadcast: (msg: any) => {
      broadcasts.push(msg);
      if (msg.type === 'agent_skills_updated' || msg.type === 'agent_files_updated') {
        liveBroadcastFired = true;
      }
    },
  };

  setupAgentWorkspaceWatcher(e.id, agentDb, liveWsServer);
  // Modify skillsFile on disk asynchronously via standard write (simulating agent terminal command)
  fs.writeFileSync(wsE.skillsFile, JSON.stringify({ skills: [{ name: 'live-skill-1', enabled: true }] }, null, 2));

  // Wait 450ms for debounced watcher to trigger and reconcile
  await new Promise((resolve) => setTimeout(resolve, 500));
  const skillsEAfter = agentDb.getAgentSkills(e.id);
  unwatchAgentWorkspace(e.id);

  const checks: Record<string, boolean> = {
    'agent-added skill imported to DB': skillsAfter.some((s) => s.skill_name === 'A Custom Skill' && s.source === 'agent'),
    'agent-added MCP imported to DB': mcpsAfter.some((m) => m.mcp_name === 'a-custom-mcp' && m.source === 'agent'),
    'agent-added skill is enabled': (skillsAfter.find((s) => s.skill_name === 'A Custom Skill')?.enabled ?? 0) === 1,
    'system_prompt.md synced to DB': promptAfter === 'prompt updated by agent A',
    'reconcile is idempotent (skills)': skillsAfter2.length === skillsAfter.length,
    'reconcile is idempotent (mcps)': mcpsAfter2.length === mcpsAfter.length,
    'no rows existed before import': before.skills === 0 && before.mcps === 0,
    'peer-added skill reconciled': agentDb.getAgentSkills(b.id).some((s) => s.skill_name === 'B Skill From Peer'),
    'box (space) shows agent-added skill': Boolean(boxA?.skills.some((s) => s.skill_name === 'A Custom Skill')),
    'box (space) shows agent-added MCP': Boolean(boxA?.mcps.some((m) => m.mcp_name === 'a-custom-mcp')),
    'box (space) shows peer-added skill': Boolean(boxB?.skills.some((s) => s.skill_name === 'B Skill From Peer')),
    'UI sync broadcast emitted': broadcasts.some((m) => m.type === 'agent_updated' && m.agentId === a.id),
    'agent_skills_updated broadcast emitted': broadcasts.some((m) => m.type === 'agent_skills_updated'),
    'removal still prunes DB row': skillsAfterRemoval.length === 0,
    '3 skills down to 1: alpha removed': alphaRemoved,
    '3 skills down to 1: beta removed': betaRemoved,
    '3 skills down to 1: gamma kept': gammaKept,
    'prune down to 0 skills (empty list)': skillsAfterAllPruned.length === 0,
    'raw array of skill names imported': skillsD.length === 2 && skillsD.some((s) => s.skill_name === 'direct-skill-1'),
    'live watcher reconciled skill removal': skillsEAfter.length === 1 && skillsEAfter[0].skill_name === 'live-skill-1',
    'live watcher fired broadcast': liveBroadcastFired,
  };

  let failed = 0;
  for (const [label, ok] of Object.entries(checks)) {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
    if (!ok) failed++;
  }

  console.log('\nbroadcasts:', broadcasts.map((b) => b.type).join(', '));
  console.log('agent A skills:', skillsAfter.map((s) => `${s.skill_name}(${s.source})`).join(', '));
  console.log('agent A mcps:', mcpsAfter.map((m) => `${m.mcp_name}(${m.source})`).join(', '));

  fs.rmSync(root, { recursive: true, force: true });

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll agent-config sync checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
