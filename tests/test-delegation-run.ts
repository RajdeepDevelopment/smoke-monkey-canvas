import { AgentRunner } from '../server/features/agent/agent.runner.js';
import { AgentDb } from '../server/features/agent/agent.db.js';

async function test() {
  const runner = AgentRunner.getInstance();
  const db = runner.getDb();

  const ciso = db.listAgents().find((a: any) => a.name.includes('Evan Cross'));
  const soc = db.listAgents().find((a: any) => a.name.includes('Tariq Mason'));

  if (!ciso || !soc) {
    console.error('Agents not found');
    process.exit(1);
  }

  console.log(`Testing delegation from ${ciso.name} (${ciso.id}) to ${soc.name} (${soc.id})`);

  const prompt = `Please delegate a quick 1-line health check to ${soc.name} using delegate_task with target_agent_id="${soc.id}". When done, summarize their response.`;

  console.log('Starting runner.runAgentAndWait on caller...');
  const run = await runner.runAgentAndWait(ciso.id, 'manual', prompt, `test_session_${Date.now()}`);
  console.log('Caller run completed:', run.status, run.summary || run.error);
  process.exit(0);
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
