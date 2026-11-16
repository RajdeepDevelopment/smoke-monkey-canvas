import { CoreDatabase } from '../server/features/core/database.db.js';
import { AgentDb } from '../server/features/agent/agent.db.js';
import {
  isSystemPromptStale,
  reconcileSystemPromptWithProfile,
  resolveAgentWorkspace,
} from '../server/features/agent/agent.prompt.js';
import { ensureAgentWorkspace } from '../server/features/agent/agent.manifest.js';
import fs from 'node:fs';

const coreDb = CoreDatabase.getInstance();
const db = new AgentDb(coreDb);

const agents = db.listAgents();
console.log(`Checking ${agents.length} agent(s) for prompt staleness...`);

let healedCount = 0;
for (const agent of agents) {
  if (isSystemPromptStale(agent.system_prompt, agent)) {
    console.log(`Healing stale prompt for agent ${agent.name} (${agent.id})...`);
    const healedPrompt = reconcileSystemPromptWithProfile(agent.system_prompt, agent);
    db.updateAgent(agent.id, { system_prompt: healedPrompt });

    try {
      const wsPath = resolveAgentWorkspace(agent);
      const ws = ensureAgentWorkspace(wsPath, agent.id, agent.name, healedPrompt);
      if (ws.systemPromptFile) {
        fs.writeFileSync(ws.systemPromptFile, `${healedPrompt}\n`, 'utf8');
        console.log(`Updated workspace system_prompt.md at ${ws.systemPromptFile}`);
      }
    } catch (err) {
      console.warn(`Failed to update workspace for ${agent.id}:`, err);
    }
    healedCount++;
  } else {
    console.log(`Agent ${agent.name} (${agent.id}) prompt is up to date.`);
  }
}

console.log(`Done! Healed ${healedCount} agent(s).`);
