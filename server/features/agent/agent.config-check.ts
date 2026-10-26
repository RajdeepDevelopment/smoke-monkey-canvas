import type { AgentDb } from './agent.db.js';
import { CoreDatabase } from '../core/database.db.js';
import { computeReadiness } from '../mcp/mcp.readiness.js';
import type { AgentMcpRecord } from './agent.types.js';

export interface AgentConfigStatus {
  isConfigured: boolean;
  reasons: string[];
}

/**
 * Validates whether an agent has all required configuration (provider API keys,
 * attached MCP server credentials, etc.) to be eligible to execute tasks.
 */
export function checkAgentConfigStatus(agentId: string, db: AgentDb): AgentConfigStatus {
  const agent = db.getAgent(agentId);
  if (!agent) {
    return { isConfigured: false, reasons: ['Agent record not found in database'] };
  }

  const reasons: string[] = [];
  const coreDb = CoreDatabase.getInstance();

  // 1. Check provider API key
  const provider = agent.provider || 'nvidia';
  const keyMap: Record<string, string> = {
    nvidia: 'NVIDIA_API_KEY',
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    gemini: 'GEMINI_API_KEY',
  google: 'GEMINI_API_KEY',
    openrouter: 'OPENROUTER_API_KEY',
    groq: 'GROQ_API_KEY',
    xai: 'XAI_API_KEY',
    deepseek: 'DEEPSEEK_API_KEY',
    qwen: 'DASHSCOPE_API_KEY',
    mistral: 'MISTRAL_API_KEY',
    together: 'TOGETHER_API_KEY',
    cerebras: 'CEREBRAS_API_KEY',
    cohere: 'COHERE_API_KEY',
    fireworks: 'FIREWORKS_API_KEY',
    omniroute: 'OMNIROUTE_API_KEY',
  };
  const keyName = keyMap[provider] || `${provider.toUpperCase()}_API_KEY`;
  let apiKey = coreDb.getSetting(keyName) || process.env[keyName];
  if (!apiKey && provider === 'qwen') {
    apiKey = coreDb.getSetting('QWEN_API_KEY') || process.env.QWEN_API_KEY;
  }
  if (!apiKey && provider === 'omniroute') {
    apiKey = 'omniroute';
  }
  if (!apiKey && provider === 'nvidia') {
    apiKey = coreDb.getSetting('NVIDIA_API_KEY') || process.env.NVIDIA_API_KEY;
  }

  if (!apiKey) {
    reasons.push(`Missing API key for provider "${provider}" (${keyName})`);
  }

  // 2. Check attached enabled MCP servers
  const mcps = db.getAgentMcps(agentId).filter((m: AgentMcpRecord) => m.enabled === 1);
  for (const m of mcps) {
    let cfg: Record<string, unknown> = {};
    try {
      cfg = JSON.parse(m.config_json);
    } catch {}
    const env = (cfg.env as Record<string, string>) || {};
    const readiness = computeReadiness(m.mcp_name, env);
    if (!readiness.configured) {
      reasons.push(
        readiness.state === 'needs-oauth'
          ? `MCP server "${m.label || m.mcp_name}" requires an OAuth connection`
          : readiness.state === 'needs-provider-auth'
          ? `MCP server "${m.label || m.mcp_name}" is connected to MCP.ai but still needs its provider account login`
          : `MCP server "${m.label || m.mcp_name}" requires missing credential(s): ${readiness.missingKeys.join(', ')}`,
      );
    }
  }

  return {
    isConfigured: reasons.length === 0,
    reasons,
  };
}
