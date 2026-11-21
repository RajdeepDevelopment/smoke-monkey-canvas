import assert from 'node:assert/strict';
import type { ToolContext, ToolDefinition } from 'smoke-monkey-harness';

process.env.SMOKE_CANVAS_DB = ':memory:';
process.env.CANVAS_SPACE_ID = '';
process.env.SPACE_ID = '';

const [{ CUSTOM_AGENT_TOOLS }, { CoreDatabase }, { SpaceDb }, { AgentDb }] = await Promise.all([
  import('../server/features/agent/agent.custom-tools.js'),
  import('../server/features/core/database.db.js'),
  import('../server/features/space/space.db.js'),
  import('../server/features/agent/agent.db.js'),
]);

const coreDb = CoreDatabase.getInstance(':memory:');
const spaceDb = new SpaceDb(coreDb);
const agentDb = new AgentDb(coreDb);

spaceDb.createWorkspaceSpace({ id: 'scope-test-alpha', name: 'Scope Test Alpha' });
spaceDb.createWorkspaceSpace({ id: 'scope-test-beta', name: 'Scope Test Beta' });
spaceDb.updateWorkspaceSpace('scope-test-beta', { x: 10000 });

for (const [id, name] of [
  ['scope-agent-alpha', 'Alpha Agent'],
  ['scope-agent-beta', 'Beta Agent'],
] as const) {
  agentDb.createAgent({
    id,
    name,
    model: 'test-model',
    provider: 'test',
    system_prompt: '',
    cron_schedule: null,
    cron_enabled: 0,
    pos_x: 0,
    pos_y: 0,
    status: 'idle',
    last_run_at: null,
    next_run_at: null,
  });
}
spaceDb.setAgentSpace('scope-agent-alpha', 'scope-test-alpha');
spaceDb.setAgentSpace('scope-agent-beta', 'scope-test-beta');
agentDb.updateAgent('scope-agent-beta', { pos_x: 11000 });
assert.equal(spaceDb.getAgentSpaceId('scope-agent-alpha'), 'scope-test-alpha');
assert.equal(spaceDb.getAgentSpaceId('scope-agent-beta'), 'scope-test-beta');

type AgentToolContext = ToolContext & { agentId?: string; spaceId?: string };

function getTool(name: string): ToolDefinition {
  const tool = CUSTOM_AGENT_TOOLS.find((candidate) => candidate.name === name);
  assert.ok(tool, `missing canvas tool: ${name}`);
  return tool;
}

function execute(name: string, args: Record<string, unknown>, agentId?: string) {
  const workspacePath = process.cwd();
  const context: AgentToolContext = {
    sessionId: 'scope-test-session',
    runId: 'scope-test-run',
    workspaceDir: workspacePath,
    workspacePath,
    userId: agentId ?? 'scope-test-user',
    abortSignal: new AbortController().signal,
    ...(agentId ? { agentId, spaceId: spaceDb.getAgentSpaceId(agentId) ?? undefined } : {}),
  };
  return getTool(name).execute(args, context);
}

const originalFetch = globalThis.fetch;
let signalPositionsRequest!: () => void;
let releasePositionsRequest!: () => void;
let signalTimeout: ReturnType<typeof setTimeout> | undefined;
const positionsRequestStarted = new Promise<void>((resolve) => {
  signalPositionsRequest = resolve;
});
const positionsRequestGate = new Promise<void>((resolve) => {
  releasePositionsRequest = resolve;
});

globalThis.fetch = (async (input) => {
  if (String(input).endsWith('/api/space/nodes/positions')) {
    signalPositionsRequest();
    await positionsRequestGate;
  }
  return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
}) as typeof fetch;

let alphaAuditPromise: ReturnType<typeof execute> | undefined;
try {
  alphaAuditPromise = execute('canvas_audit_ui', { auto_fix: true }, 'scope-agent-alpha');
  await Promise.race([
    positionsRequestStarted,
    new Promise<never>((_, reject) => {
      signalTimeout = setTimeout(() => reject(new Error('auto-fix did not reach its awaited update')), 5000);
    }),
  ]);
  if (signalTimeout) clearTimeout(signalTimeout);

  const betaSpace = await execute('canvas_get_space', {}, 'scope-agent-beta');
  assert.match(betaSpace.content?.[0]?.text ?? '', /Scope Test Beta/);

  releasePositionsRequest();
  if (signalTimeout) clearTimeout(signalTimeout);
  const alphaAudit = await alphaAuditPromise;
  const auditText = alphaAudit.content?.map((item) => item.text || '').join('\n') || '';
  assert.match(auditText, /Target Space\*\*: "Scope Test Alpha"/);
  assert.doesNotMatch(auditText, /Scope Test Beta/);

  const unscopedDelete = await execute('canvas_delete_space', {});
  const deleteText = unscopedDelete.content?.[0]?.text || '';
  assert.match(deleteText, /space_id is required/i);
  assert.doesNotMatch(deleteText, /cannot delete spaces/i);

  const crossSpaceRead = await execute('canvas_get_space', { space_id: 'scope-test-beta' }, 'scope-agent-alpha');
  assert.match(crossSpaceRead.content?.[0]?.text || '', /Cross-space operations.*forbidden/);
  console.log('Per-call MCP scopes remain isolated across awaited tool work.');
} finally {
  releasePositionsRequest();
  globalThis.fetch = originalFetch;
  await alphaAuditPromise?.catch(() => {});
  coreDb.db.close();
}
