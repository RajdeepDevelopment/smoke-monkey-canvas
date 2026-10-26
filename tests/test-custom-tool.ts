import { buildToolRegistry, createAgent } from 'smoke-monkey-harness';
import {
  CUSTOM_AGENT_TOOLS,
  CUSTOM_AGENT_TOOL_NAMES,
} from '../server/features/agent/agent.custom-tools.js';

async function main() {
  // ── Runtime path #1: the exact API the runner uses ─────────────────────────
  // createAgent(...) then registerTool(...) for each canvas tool. No LLM call is
  // made — construction + registration is what runs on every agent run.
  const runtimeAgent = createAgent({
    provider: 'ollama',
    model: 'qwen3:8b',
    workspacePath: process.cwd(),
    autoApprove: true,
  });
  for (const tool of CUSTOM_AGENT_TOOLS) runtimeAgent.registerTool(tool);

  const runtimePresentations = runtimeAgent.getToolPresentations();
  const runtimePresentation = runtimePresentations['canvas_ping'];

  // ── Runtime path #2: the event the runner forwards to the websocket ────────
  // The harness emits tool.started with the registered presentation; the runner
  // reads e.data.presentation and broadcasts it. Capture that here.
  let startedPresentation: unknown = null;
  runtimeAgent.on('tool.started', (e) => {
    startedPresentation = (e.data as { presentation?: unknown }).presentation;
  });
  runtimeAgent.events.emitToolStarted(
    'test-session',
    'test-run',
    'tc_1',
    'canvas_ping',
    { message: 'hi' },
    runtimePresentation,
  );

  // ── Registry parity check (same registry buildToolRegistry produces) ───────
  const registry = buildToolRegistry();
  for (const tool of CUSTOM_AGENT_TOOLS) registry.register(tool);

  const names = registry.getAll().map((t) => t.name);
  const hasCustom = names.includes('canvas_ping');
  const presentations = registry.getPresentations();
  const presentation = presentations['canvas_ping'];

  const result = await registry.execute(
    'canvas_ping',
    { message: 'hello from canvas' },
    {
      sessionId: 'test-session',
      runId: 'test-run',
      workspaceDir: process.cwd(),
      workspacePath: process.cwd(),
      userId: 'test-user',
      abortSignal: new AbortController().signal,
    },
  );

  const parsed = typeof result.output === 'string' ? JSON.parse(result.output) : result.output;

  const checks = {
    'custom tool registered': hasCustom,
    'built-ins preserved (read_file)': names.includes('read_file'),
    'built-ins preserved (run_command)': names.includes('run_command'),
    'presentation exposed to UI': Boolean(presentation?.icon && presentation?.label),
    'execute succeeded': result.success === true,
    'echoed input message': parsed?.message === 'hello from canvas',
    'returned workspace path': parsed?.workspace === process.cwd(),
    // Runtime-path assertions
    'runtime createAgent().registerTool() exposes presentation': Boolean(
      runtimePresentation?.icon && runtimePresentation?.label,
    ),
    'runtime tool.started event carries presentation': Boolean(
      (startedPresentation as { icon?: string } | null)?.icon,
    ),
  };

  let failed = 0;
  for (const [label, ok] of Object.entries(checks)) {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
    if (!ok) failed++;
  }

  console.log('\ntotal tools registered:', names.length);
  console.log('custom tool names:', CUSTOM_AGENT_TOOL_NAMES.join(', '));
  console.log('presentation:', JSON.stringify(presentation));
  console.log('runtime presentation:', JSON.stringify(runtimePresentation));
  console.log('runtime tool.started presentation:', JSON.stringify(startedPresentation));
  console.log('result:', JSON.stringify(result));

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll custom-tool operation checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
