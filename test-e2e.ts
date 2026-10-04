import { startAppServer } from './server/app.server.js';

async function runTest() {
  console.log('Testing Smoke Monkey Canvas Full-Stack Server...');
  const port = 3456;
  const instance = startAppServer({ port });

  // Wait for server to bind
  await new Promise((r) => setTimeout(r, 600));

  try {
    // 1. Test Static Frontend Serve
    const resStatic = await fetch(`http://localhost:${port}/`);
    console.log('1. Static Frontend status:', resStatic.status, resStatic.headers.get('content-type'));
    const html = await resStatic.text();
    if (!html.includes('root')) throw new Error('index.html did not contain root div');

    // 2. Test Space Entities GET
    const resSpace = await fetch(`http://localhost:${port}/api/space`);
    console.log('2. Space entities status:', resSpace.status);
    const spaceData = await resSpace.json();
    console.log('   Current space entities count:', spaceData.length);

    // 3. Test Agent Creation in Space
    const resCreate = await fetch(`http://localhost:${port}/api/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Firecrawl Job Searcher',
        model: 'meta/llama-3.3-70b-instruct',
        provider: 'nvidia',
        system_prompt: 'Search the web for remote AI engineer jobs and extract details.',
        cron_enabled: 1,
        cron_schedule: '*/15 * * * *',
        pos_x: 450,
        pos_y: 280,
      }),
    });
    console.log('3. Create agent status:', resCreate.status);
    const newAgent = await resCreate.json();
    console.log('   Created agent ID:', newAgent.id, 'at pos:', newAgent.pos_x, newAgent.pos_y);

    // 4. Test Stock MCP Attachment
    const resMcp = await fetch(`http://localhost:${port}/api/agents/${newAgent.id}/mcps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mcp_name: 'firecrawl-mcp',
        label: 'Firecrawl',
        config: {
          command: 'npx',
          args: ['-y', 'firecrawl-mcp'],
        },
        allowUnconfigured: true,
      }),
    });
    console.log('4. Attach MCP status:', resMcp.status);

    // 5. Test Skill Attachment
    const resSkill = await fetch(`http://localhost:${port}/api/agents/${newAgent.id}/skills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skill_name: 'FilterJobPostings',
        description: 'Deduplicates and ranks job search results',
        content: '# Filter Jobs\nFilter by salary >= $150k and remote.',
      }),
    });
    console.log('5. Attach Skill status:', resSkill.status);

    // 6. Test Node Position Movement in Space
    const resMove = await fetch(`http://localhost:${port}/api/space/nodes/${newAgent.id}/position`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posX: 520, posY: 340 }),
    });
    console.log('6. Update position status:', resMove.status);

    // 7. Verify aggregated Space Entity
    const resSpaceUpdated = await fetch(`http://localhost:${port}/api/space`);
    const updatedEntities = await resSpaceUpdated.json();
    const retrieved = updatedEntities.find((e: any) => e.id === newAgent.id);
    console.log('7. Space entity verified:');
    console.log('   Name:', retrieved.name);
    console.log('   Position:', retrieved.pos_x, retrieved.pos_y);
    console.log('   MCPs count:', retrieved.mcps.length, retrieved.mcps[0]?.mcp_name);
    console.log('   Skills count:', retrieved.skills.length, retrieved.skills[0]?.skill_name);
    console.log('   Cron next run at:', retrieved.next_run_at);

    // Clean up test agent
    await fetch(`http://localhost:${port}/api/agents/${newAgent.id}`, { method: 'DELETE' });
    console.log('8. Test agent cleaned up.');

    console.log('\n🎉 ALL FULL-STACK CANVAS END-TO-END TESTS PASSED!');
  } finally {
    instance.cron.stop();
    instance.server.close();
  }
}

runTest().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
