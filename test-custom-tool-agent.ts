import http from 'node:http';
import { createAgent } from 'smoke-monkey-harness';
import { CUSTOM_AGENT_TOOLS } from './server/features/agent/agent.custom-tools.js';

/**
 * End-to-end proof that an agent built through the real agent API can actually
 * USE a canvas custom tool.
 *
 * A mock OpenAI/Ollama-compatible endpoint records the `tools` array the model
 * is handed. The mock only ever calls `canvas_ping` because that is what the
 * user asked — if the custom tool were not exposed, the harness would reject the
 * call as "unexposed" and the run would fail.
 */
async function main() {
  const toolsPerCall: string[][] = [];
  let calls = 0;

  const mock = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const parsed = JSON.parse(raw || '{}');
      toolsPerCall.push((parsed.tools || []).map((t: any) => t.function.name));

      const toolAlreadyReturned = (parsed.messages || []).some((m: any) => m.role === 'tool');
      calls++;

      const message = toolAlreadyReturned
        ? { role: 'assistant', content: '', tool_calls: [{ function: { name: 'finish_task', arguments: { summary: 'canvas_ping verified via agent API' } } }] }
        : { role: 'assistant', content: '', tool_calls: [{ function: { name: 'canvas_ping', arguments: { message: 'e2e-check' } } }] };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ model: 'mock', message }));
    });
  });

  await new Promise<void>((r) => mock.listen(0, '127.0.0.1', () => r()));
  const port = (mock.address() as { port: number }).port;
  process.env.LLM_BASE_URL = `http://127.0.0.1:${port}`;

  const agent = createAgent({
    provider: 'ollama', // non-streaming, mock speaks /api/chat
    model: 'mock-model',
    workspacePath: process.cwd(),
    autoApprove: true,
    sessionId: 'custom-tool-e2e',
  });
  for (const tool of CUSTOM_AGENT_TOOLS) agent.registerTool(tool);

  const started: any[] = [];
  const completed: any[] = [];
  agent.on('tool.started', (e) => started.push(e.data));
  agent.on('tool.completed', (e) => completed.push(e.data));

  const result = await agent.run('Please check the canvas_ping tool');

  mock.close();

  const pingStart = started.find((s) => s.toolName === 'canvas_ping');
  const pingDone = completed.find((c) => c.toolName === 'canvas_ping');
  const firstTurnTools = toolsPerCall[0] ?? [];

  const checks: Record<string, boolean> = {
    'LLM was told about canvas_ping': firstTurnTools.includes('canvas_ping'),
    'LLM was also given built-ins (read_file)': firstTurnTools.includes('read_file'),
    'agent actually called canvas_ping': Boolean(pingStart),
    'tool.started carried the presentation': Boolean(pingStart?.presentation?.icon),
    'tool completed successfully': pingDone?.result?.success === true,
    'tool returned our payload': String(pingDone?.result?.output || '').includes('e2e-check'),
    'run finished completed': result.status === 'completed',
  };

  let failed = 0;
  for (const [label, ok] of Object.entries(checks)) {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
    if (!ok) failed++;
  }

  console.log('\nLLM calls:', calls);
  console.log('tools exposed on turn 1:', firstTurnTools.join(', '));
  console.log('canvas_ping presentation seen by UI:', JSON.stringify(pingStart?.presentation));
  console.log('canvas_ping result:', JSON.stringify(pingDone?.result));
  console.log('run status:', result.status, '| round-trip tool result message present:', result.messages.some((m: any) => m.role === 'tool'));

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAgent used the custom tool end-to-end.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
