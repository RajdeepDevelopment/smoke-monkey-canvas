import type {
  AgentRecord,
  AgentManifestInfo,
  SpaceAgentEntity,
  RunRecord,
  RunEventRecord,
  ChatSessionRecord,
  ChatMessageRecord,
  WorkspaceFilesResponse,
  WorkspaceFileContentResponse,
  AgentConnectionRecord,
  AgentCronJobRecord,
} from './agent.types.js';

import { getApiBaseUrl } from '../../config/desktop.bridge.ts';

const API_BASE = {
  toString() {
    return getApiBaseUrl();
  },
  [Symbol.toPrimitive]() {
    return getApiBaseUrl();
  },
};

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

  static async deleteAgent(id: string, options?: { deleteFiles?: boolean }): Promise<void> {
    const query = options?.deleteFiles ? '?deleteFiles=true' : '';
    const res = await fetch(`${API_BASE}/agents/${id}${query}`, { method: 'DELETE' });
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

  static async fetchActiveDelegations(): Promise<import('./agent.types.js').ActiveDelegationRecord[]> {
    const res = await fetch(`${API_BASE}/agents/active-delegations`);
    if (!res.ok) return [];
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

  /** Merged, source-aware attachments + the exact effective system prompt for the next run. */
  static async fetchAgentManifest(id: string): Promise<AgentManifestInfo> {
    const res = await fetch(`${API_BASE}/agents/${id}/manifest`);
    if (!res.ok) throw new Error('Failed to fetch agent manifest');
    return res.json();
  }

  static async updateAgentPolicies(id: string, policies: string[]): Promise<AgentRecord> {
    return this.updateAgent(id, { policies: JSON.stringify(policies) });
  }

  static async updateAgentDisabledTools(id: string, disabled_tools: string[]): Promise<AgentRecord> {
    return this.updateAgent(id, { disabled_tools: JSON.stringify(disabled_tools) });
  }

  static async attachPersonality(agentId: string, presetId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/agents/${agentId}/personalities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: presetId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to set personality');
    }
  }

  static async attachOutputStyle(agentId: string, presetId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/agents/${agentId}/output-styles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: presetId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to set output style');
    }
  }

  static async fetchRepoMemory(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/agents/${id}/repo-memory`);
    if (!res.ok) throw new Error('Failed to fetch repo memory');
    return res.json();
  }

  static async updateRepoMemoryFile(id: string, file: string, content: string): Promise<any> {
    const res = await fetch(`${API_BASE}/agents/${id}/repo-memory/${file}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error('Failed to update repo memory file');
    return res.json();
  }

  static async fetchMemoryFile(id: string, file: string): Promise<{ file: string; content: string; path: string }> {
    const res = await fetch(`${API_BASE}/agents/${id}/memory/${file}`);
    if (!res.ok) throw new Error('Failed to fetch memory file');
    return res.json();
  }

  static async updateMemoryFile(id: string, file: string, content: string): Promise<any> {
    const res = await fetch(`${API_BASE}/agents/${id}/memory/${file}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error('Failed to update memory file');
    return res.json();
  }

  static async fetchWorkspaceFiles(agentId: string): Promise<WorkspaceFilesResponse> {
    const res = await fetch(`${API_BASE}/agents/${agentId}/files`);
    if (!res.ok) throw new Error('Failed to fetch workspace files');
    return res.json();
  }

  static async fetchWorkspaceFileContent(
    agentId: string,
    path: string,
  ): Promise<WorkspaceFileContentResponse> {
    const res = await fetch(
      `${API_BASE}/agents/${agentId}/files/content?path=${encodeURIComponent(path)}`,
    );
    if (!res.ok) throw new Error('Failed to fetch workspace file content');
    return res.json();
  }

  static getWorkspaceFileRawUrl(agentId: string, path: string): string {
    return `${API_BASE}/agents/${agentId}/files/raw?path=${encodeURIComponent(path)}`;
  }

  static async updateWorkspaceFileContent(
    agentId: string,
    path: string,
    content: string,
  ): Promise<{ success: boolean; path: string }> {
    const res = await fetch(`${API_BASE}/agents/${agentId}/files/content`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content }),
    });
    if (!res.ok) throw new Error('Failed to update workspace file');
    return res.json();
  }

  static async openFileWithSystem(agentId: string, path: string): Promise<{ success: boolean; path: string }> {
    const res = await fetch(`${API_BASE}/agents/${agentId}/files/open-system`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    if (!res.ok) throw new Error('Failed to open file with system application');
    return res.json();
  }

  static async fetchConnections(agentId?: string): Promise<AgentConnectionRecord[]> {
    const url = agentId ? `${API_BASE}/agents/connections?agentId=${encodeURIComponent(agentId)}` : `${API_BASE}/agents/connections`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch agent connections');
    const data = await res.json();
    return data.connections || [];
  }

  static async createConnection(sourceAgentId: string, targetAgentId: string): Promise<AgentConnectionRecord> {
    const res = await fetch(`${API_BASE}/agents/connections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceAgentId,
        targetAgentId,
        source_agent_id: sourceAgentId,
        target_agent_id: targetAgentId,
      }),
    });
    if (!res.ok) {
      let errorMsg = 'Failed to create agent connection';
      try {
        const text = await res.text();
        const json = JSON.parse(text);
        errorMsg = json.error || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }
    const text = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Unexpected server response: ${text.slice(0, 100)}`);
    }
    return data.connection || data;
  }

  static async deleteConnection(connectionId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/agents/connections/${connectionId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      let errorMsg = 'Failed to delete connection';
      try {
        const text = await res.text();
        const json = JSON.parse(text);
        errorMsg = json.error || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }
  }

  static async deleteConnectionBetween(sourceAgentId: string, targetAgentId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/agents/connections`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceAgentId,
        targetAgentId,
        source_agent_id: sourceAgentId,
        target_agent_id: targetAgentId,
      }),
    });
    if (!res.ok) {
      let errorMsg = 'Failed to delete connection between agents';
      try {
        const text = await res.text();
        const json = JSON.parse(text);
        errorMsg = json.error || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }
  }

  // ── Scheduled Cron Automations ─────────────────────────────────────────────
  static async fetchCronJobs(agentId: string): Promise<AgentCronJobRecord[]> {
    const res = await fetch(`${API_BASE}/agents/${agentId}/cron-jobs`);
    if (!res.ok) throw new Error('Failed to fetch agent cron jobs');
    return res.json();
  }

  static async createCronJob(
    agentId: string,
    data: { name: string; prompt: string; cron_schedule: string; enabled?: boolean; source?: string; scheduled_at?: string; delay_minutes?: number }
  ): Promise<AgentCronJobRecord> {
    const res = await fetch(`${API_BASE}/agents/${agentId}/cron-jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create cron job');
    }
    return res.json();
  }

  static async updateCronJob(
    agentId: string,
    jobId: string,
    patch: Partial<{ name: string; prompt: string; cron_schedule: string; enabled: boolean; scheduled_at?: string }>
  ): Promise<AgentCronJobRecord> {
    const res = await fetch(`${API_BASE}/agents/${agentId}/cron-jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update cron job');
    }
    return res.json();
  }

  static async deleteCronJob(agentId: string, jobId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/agents/${agentId}/cron-jobs/${jobId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete cron job');
  }

  static async runCronJobNow(agentId: string, jobId: string): Promise<{ success: boolean; result?: any }> {
    const res = await fetch(`${API_BASE}/agents/${agentId}/cron-jobs/${jobId}/run`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to run cron job');
    }
    return res.json();
  }
}

