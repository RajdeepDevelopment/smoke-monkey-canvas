/**
 * trigger-ceo-directive.ts
 *
 * Triggers the CEO agent via API and watches the run and any sub-delegations to the CTO.
 */

const API_BASE = 'http://localhost:3333';
const CEO_ID = 'agent_1793472686800_02pi';

async function main() {
  console.log('=== Triggering CEO Directive via API ===\n');

  const prompt = `Executive Directive: Ensure all developers have full project context and distribute explicit code module ownership across the engineering team so that any incoming bugs are immediately routed to and managed by the designated module owner. Please delegate this to CTO Marcus Chen to establish the module ownership matrix and cascade it down to the engineering leads.`;

  console.log('Sending prompt to CEO (Elena Vance):');
  console.log(prompt, '\n');

  const res = await fetch(`${API_BASE}/api/agents/${CEO_ID}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Failed to trigger run:', res.status, errText);
    process.exit(1);
  }

  const { run } = await res.json() as any;
  console.log(`✓ Run created: ${run.id} (status: ${run.status})`);
  console.log(`Watching run events and status...\n`);

  const startTime = Date.now();
  let lastEventCount = 0;

  while (Date.now() - startTime < 180000) {
    await new Promise((r) => setTimeout(r, 2000));

    const { DatabaseSync } = await import('node:sqlite');
    const { join } = await import('node:path');
    const { homedir } = await import('node:os');
    const db = new DatabaseSync(join(homedir(), '.smoke-monkey', 'canvas.db'));
    const row = db.prepare('SELECT id, status, summary, error FROM runs WHERE id = ?').get(run.id) as any;
    const latestEvent = db.prepare('SELECT event_type, created_at, payload_json FROM run_events WHERE run_id = ? ORDER BY created_at DESC LIMIT 1').get(run.id) as any;

    const eventDesc = latestEvent ? ` | latest: ${latestEvent.event_type}` : '';
    console.log(`[${Math.round((Date.now() - startTime) / 1000)}s] Run status: ${row?.status || 'unknown'}${eventDesc}`);

    // Check if sub-delegations were created
    const subRuns = db.prepare('SELECT id, agent_id, status FROM runs WHERE session_id LIKE ?').all(`%${run.id}%`) as any[];
    if (subRuns.length > 0) {
      console.log(`  Sub-delegations (${subRuns.length}):`, subRuns.map((s: any) => `${s.agent_id}: ${s.status}`).join(', '));
    }

    if (row && (row.status === 'completed' || row.status === 'failed')) {
      console.log('\n=== RUN FINISHED ===');
      console.log('Status:', row.status);
      console.log('Summary:', row.summary || '(none)');
      if (row.error) console.error('Error:', row.error);
      break;
    }
  }
}

main().catch(console.error);
