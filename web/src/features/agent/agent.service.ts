import type {
  AgentRecord,
  SpaceAgentEntity,
  RunRecord,
  RunEventRecord,
  ChatSessionRecord,
  ChatMessageRecord,
} from './agent.types.js';

const API_BASE = '/api';

export class AgentService {
  static async createAgent(data: Partial<AgentRecord>): Promise<SpaceAgentEntity> {
    const res = await fetch(`${API_BASE}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create agent');
    }
    return res.json();
  }

  static async updateAgent(id: string, patch: Partial<AgentRecord>): Promise<AgentRecord> {
    const res = await fetch(`${API_BASE}/agents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update agent');
    }
    return res.json();
  }

  static async deleteAgent(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/agents/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete agent');
  }

  static async triggerRun(
    id: string,
    prompt?: string,
    sessionId?: string,
    msgIds?: { userMsgId?: string; assistantMsgId?: string },
  ): Promise<{ success: boolean; run: RunRecord }> {
    const res = await fetch(`${API_BASE}/agents/${id}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        sessionId,
        userMsgId: msgIds?.userMsgId,
        assistantMsgId: msgIds?.assistantMsgId,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to trigger run');
    }
    return res.json();
  }

  static async clearMemory(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/agents/${id}/clear-memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to clear memory');
  }

  static async stopAgent(id: string, runId?: string): Promise<void> {
    const res = await fetch(`${API_BASE}/agents/${id}/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to stop agent');
    }
  }

  static async fetchActiveRuns(agentId: string): Promise<import('./agent.types.js').ActiveRunRecord[]> {
    const res = await fetch(`${API_BASE}/agents/${agentId}/active-runs`);
    if (!res.ok) throw new Error('Failed to fetch active runs');
    return res.json();
  }

  static async addMcp(
    agentId: string,
    mcpData: {
      mcp_name: string;
      label?: string;
      config?: Record<string, unknown>;
      enabled?: number;
      allowUnconfigured?: boolean;
    }
  ): Promise<void> {
    const res = await fetch(`${API_BASE}/agents/${agentId}/mcps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mcpData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to attach MCP');
    }
  }

  static async deleteMcp(agentId: string, mcpId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/agents/${agentId}/mcps/${mcpId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete MCP');
  }

  static async addSkill(agentId: string, skillData: { skill_name: string; description?: string; content: string }): Promise<void> {
    const res = await fetch(`${API_BASE}/agents/${agentId}/skills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(skillData),
    });
    if (!res.ok) throw new Error('Failed to attach Skill');
  }

  static async deleteSkill(agentId: string, skillId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/agents/${agentId}/skills/${skillId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete Skill');
  }

  static async fetchAgentRuns(agentId: string, triggerType?: string): Promise<RunRecord[]> {
    const query = triggerType ? `?trigger_type=${encodeURIComponent(triggerType)}` : '';
    const res = await fetch(`${API_BASE}/agents/${agentId}/runs${query}`);
    if (!res.ok) throw new Error('Failed to fetch runs');
    return res.json();
  }

  static async fetchAgentSessions(agentId: string): Promise<ChatSessionRecord[]> {
    const res = await fetch(`${API_BASE}/agents/${agentId}/sessions`);
    if (!res.ok) throw new Error('Failed to fetch chat sessions');
    return res.json();
  }

  static async createAgentSession(agentId: string, title?: string): Promise<ChatSessionRecord> {
    const res = await fetch(`${API_BASE}/agents/${agentId}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error('Failed to create chat session');
    return res.json();
  }

  static async fetchSessionMessages(agentId: string, sessionId: string): Promise<ChatMessageRecord[]> {
    const res = await fetch(`${API_BASE}/agents/${agentId}/sessions/${sessionId}/messages`);
    if (!res.ok) throw new Error('Failed to fetch session messages');
    return res.json();
  }

  static async deleteAgentSession(agentId: string, sessionId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/agents/${agentId}/sessions/${sessionId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete chat session');
  }

  static async fetchRunDetails(runId: string): Promise<RunRecord & { events: RunEventRecord[] }> {
    const res = await fetch(`${API_BASE}/agents/runs/${runId}`);
    if (!res.ok) throw new Error('Failed to fetch run details');
    return res.json();
  }

  static async fetchAgent(id: string): Promise<AgentRecord> {
    const res = await fetch(`${API_BASE}/agents/${id}`);
    if (!res.ok) throw new Error('Failed to fetch agent');
    return res.json();
  }

  static async updateAgentPolicies(id: string, policies: string[]): Promise<AgentRecord> {
    return this.updateAgent(id, { policies: JSON.stringify(policies) });
  }

  static async updateAgentDisabledTools(id: string, disabled_tools: string[]): Promise<AgentRecord> {
    return this.updateAgent(id, { disabled_tools: JSON.stringify(disabled_tools) });
  }
}
