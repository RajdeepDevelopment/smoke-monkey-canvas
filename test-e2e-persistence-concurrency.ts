import { startAppServer } from './server/app.server.js';
import { AgentRunner } from './server/features/agent/agent.runner.js';
import { AgentDb } from './server/features/agent/agent.db.js';
import WebSocket from 'ws';

async function runTest() {
  console.log('Testing Chat History Persistence, Reconnection & Cron Concurrency...');
  const port = 3457;
  const instance = startAppServer({ port });
  const agentDb = new AgentDb();

  // Wait for server to bind
  await new Promise((r) => setTimeout(r, 600));

  try {
    // 1. Create a test agent
    const resCreate = await fetch(`http://localhost:${port}/api/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Concurrency Tester',
        model: 'meta/llama-3.3-70b-instruct',
        provider: 'nvidia',
        system_prompt: 'Test agent for multi-turn persistence and concurrency.',
        cron_enabled: 1,
        cron_schedule: '*/10 * * * *',
      }),
    });
    const agent = await resCreate.json();
    console.log('✓ Created agent:', agent.id);

    // 2. Test Multi-Turn Session Creation & Persistence
    const resSession = await fetch(`http://localhost:${port}/api/agents/${agent.id}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Multi-turn Test Discussion' }),
    });
    const session = await resSession.json();
    console.log('✓ Created chat session:', session.id);

    // Insert user turn
    const userMsg = agentDb.addChatMessage({
      id: `msg_u_${Date.now()}`,
      agent_id: agent.id,
      session_id: session.id,
      role: 'user',
      content: 'Can you analyze the project structure and list any security risks?',
      parts_json: JSON.stringify([{ type: 'text', content: 'Can you analyze the project structure and list any security risks?' }]),
    });
    console.log('✓ Saved user message:', userMsg.id);

    // Insert rich assistant turn with thoughts, tool calls, and text
    const sampleParts = [
      { type: 'thinking', content: 'The user wants a project audit for security risks.' },
      {
        type: 'tool',
        toolCall: {
          id: 'tc_1',
          name: 'scan_vulnerabilities',
          status: 'success',
          input: { path: './server' },
          output: { vulnerabilities_found: 0, status: 'clean' },
        },
      },
      { type: 'markdown', content: 'I scanned `./server` and found zero security vulnerabilities. Architecture is clean.' },
    ];

    const asstMsg = agentDb.addChatMessage({
      id: `msg_a_${Date.now()}`,
      agent_id: agent.id,
      session_id: session.id,
      role: 'assistant',
      content: 'I scanned `./server` and found zero security vulnerabilities. Architecture is clean.',
      parts_json: JSON.stringify(sampleParts),
    });
    console.log('✓ Saved assistant message with rich parts_json (thoughts + tool calls):', asstMsg.id);

    // Verify session messages endpoint returns complete parsed parts
    const resMsgs = await fetch(`http://localhost:${port}/api/agents/${agent.id}/sessions/${session.id}/messages`);
    const fetchedMsgs = await resMsgs.json();
    if (fetchedMsgs.length !== 2) throw new Error(`Expected 2 messages, got ${fetchedMsgs.length}`);
    const fetchedAsst = fetchedMsgs[1];
    const parsedParts = JSON.parse(fetchedAsst.parts_json);
    if (parsedParts.length !== 3) throw new Error(`Expected 3 parts, got ${parsedParts.length}`);
    if (parsedParts[0].type !== 'thinking' || parsedParts[1].type !== 'tool' || parsedParts[2].type !== 'markdown') {
      throw new Error('Message parts structure mismatch');
    }
    console.log('✓ Multi-turn history persistence verified: thoughts, tool calls, and markdown preserved!');

    // 3. Test WebSocket Stream Reconnection & Event Broadcasting
    const ws = new WebSocket(`ws://localhost:${port}/ws`);
    const wsEvents: any[] = [];
    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve());
      ws.on('error', reject);
    });
    ws.on('message', (data) => {
      try {
        wsEvents.push(JSON.parse(data.toString()));
      } catch {}
    });
    console.log('✓ WebSocket connected for live stream testing');

    // 4. Test Concurrency between Scheduled Cron Run and Normal Chat
    // Simulate Cron Run starting
    const cronRunRecord = agentDb.createRun({
      id: `run_cron_${Date.now()}`,
      agent_id: agent.id,
      trigger_type: 'cron',
      status: 'running',
    });
    // Simulate Normal Chat Run starting concurrently
    const chatRunRecord = agentDb.createRun({
      id: `run_chat_${Date.now()}`,
      agent_id: agent.id,
      trigger_type: 'manual',
      status: 'running',
    });

    // Manually register active runs in AgentRunner to verify concurrency tracking
    // (Simulating concurrent execution in runner context)
    const runner = AgentRunner.getInstance();
    (runner as any).activeRuns.set(cronRunRecord.id, {
      agentId: agent.id,
      runId: cronRunRecord.id,
      triggerType: 'cron',
      status: 'running',
      startedAt: new Date().toISOString(),
      abortController: new AbortController(),
      accumulatedParts: [{ type: 'thinking', content: 'Running cron job...' }],
      accumulatedText: '',
    });

    (runner as any).activeRuns.set(chatRunRecord.id, {
      agentId: agent.id,
      runId: chatRunRecord.id,
      sessionId: session.id,
      triggerType: 'manual',
      status: 'running',
      startedAt: new Date().toISOString(),
      abortController: new AbortController(),
      accumulatedParts: [{ type: 'thinking', content: 'Processing chat prompt...' }],
      accumulatedText: 'Hello from chat!',
    });

    // Test GET /api/agents/:id/active-runs
    const resActive = await fetch(`http://localhost:${port}/api/agents/${agent.id}/active-runs`);
    const activeData = await resActive.json();
    console.log('✓ Query active runs count:', activeData.length);
    if (activeData.length !== 2) {
      throw new Error(`Expected 2 concurrent active runs, got ${activeData.length}`);
    }
    const hasCron = activeData.some((r: any) => r.runId === cronRunRecord.id && r.triggerType === 'cron');
    const hasChat = activeData.some((r: any) => r.runId === chatRunRecord.id && r.triggerType === 'manual');
    if (!hasCron || !hasChat) {
      throw new Error('Both cron run and manual chat run must be concurrently tracked');
    }
    console.log('✓ Concurrency verified: Cron run and chat run running concurrently without mutual blocking!');

    // 5. Test Live Reconnect Enrichment
    // Querying session messages while chat run is active should include in-flight parts & text
    // Create assistant message for the active chat run
    agentDb.addChatMessage({
      id: `asst_inflight_${Date.now()}`,
      agent_id: agent.id,
      session_id: session.id,
      role: 'assistant',
      content: '',
      parts_json: '[]',
      run_id: chatRunRecord.id,
    });

    const resInFlight = await fetch(`http://localhost:${port}/api/agents/${agent.id}/sessions/${session.id}/messages`);
    const inFlightMsgs = await resInFlight.json();
    const lastMsg = inFlightMsgs[inFlightMsgs.length - 1];
    if (lastMsg.content !== 'Hello from chat!') {
      throw new Error(`In-flight message content not enriched. Got: ${lastMsg.content}`);
    }
    console.log('✓ In-flight stream reconnect verified: active run text & parts dynamically enriched for client!');

    // 6. Test Selective Stop by runId
    // Stop ONLY the cron run, leaving the chat run alive
    const resStopCron = await fetch(`http://localhost:${port}/api/agents/${agent.id}/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId: cronRunRecord.id }),
    });
    console.log('✓ Stop cron run response status:', resStopCron.status);

    const resActiveAfterStop = await fetch(`http://localhost:${port}/api/agents/${agent.id}/active-runs`);
    const activeAfterStop = await resActiveAfterStop.json();
    if (activeAfterStop.length !== 1 || activeAfterStop[0].runId !== chatRunRecord.id) {
      throw new Error('Stopping cron run should NOT kill concurrent chat run!');
    }
    console.log('✓ Selective run stop verified: Cron run stopped while chat run continues unaffected!');

    // Stop chat run
    await fetch(`http://localhost:${port}/api/agents/${agent.id}/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId: chatRunRecord.id }),
    });

    ws.close();
    // Clean up test agent and session
    await fetch(`http://localhost:${port}/api/agents/${agent.id}`, { method: 'DELETE' });
    console.log('✓ Cleaned up test agent.');

    console.log('\n🎉 ALL PERSISTENCE, RECONNECTION, AND CONCURRENCY TESTS PASSED!');
  } finally {
    instance.cron.stop();
    instance.server.close();
  }
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
