import { AgentRunner } from '../server/features/agent/agent.runner.js';

const runner = AgentRunner.getInstance();
const cleaned = runner.getDb().cleanupStaleChatMessageTools();
console.log('Cleaned stale chat message tools count:', cleaned);
process.exit(0);
