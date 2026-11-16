import { AgentRunner } from '../server/features/agent/agent.runner.js';

const runner = AgentRunner.getInstance();
const db = runner.getDb();

// Fix all dangling tools
const cleaned = db.cleanupStaleChatMessageTools();
console.log('Cleaned stale chat message tools:', cleaned);

// Specifically inspect msg_asst_run_1793868175608_l7qyo
const msg = db.getChatMessage('msg_asst_run_1793868175608_l7qyo');
if (msg && msg.parts_json) {
  const parts = JSON.parse(msg.parts_json);
  console.log('Parts of msg_asst_run_1793868175608_l7qyo:', parts.map((p: any) => ({
    type: p.type,
    name: p.toolCall?.name,
    status: p.toolCall?.status,
    error: p.toolCall?.error,
  })));
}

process.exit(0);
