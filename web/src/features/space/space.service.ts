import type { SpaceAgentEntity } from '../agent/agent.types.js';
import type { RoleZone, SpaceWorkflow, SpaceWorkspacePrompt } from './space.types.js';
import { getWsUrl, getApiBaseUrl } from '../../config/desktop.bridge.ts';

const API_BASE = {
  toString() {
    return getApiBaseUrl();
  },
  [Symbol.toPrimitive]() {
    return getApiBaseUrl();
  },
};

export class SpaceService {
  static async fetchSpaceAgents(): Promise<SpaceAgentEntity[]> {
    const res = await fetch(`${API_BASE}/space`);
    if (!res.ok) {
      throw new Error(`Failed to load space entities: ${res.statusText}`);
    }
    return res.json();
  }

  static async updateNodePosition(
    id: string,
    posX: number,
    posY: number,
    spaceId?: string | null,
  ): Promise<void> {
    await fetch(`${API_BASE}/space/nodes/${id}/position`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posX, posY, ...(spaceId !== undefined ? { spaceId } : {}) }),
    });
  }

  static async setWorkspaceAgents(spaceId: string, agentIds: string[]): Promise<void> {
    const res = await fetch(`${API_BASE}/space/workspaces/${encodeURIComponent(spaceId)}/agents`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentIds }),
    });
    if (!res.ok) {
      throw new Error(`Failed to sync workspace agents: ${res.statusText}`);
    }
  }

  static async fetchZones(): Promise<RoleZone[]> {
    const res = await fetch(`${API_BASE}/space/zones`);
    if (!res.ok) {
      throw new Error(`Failed to load workspace zones: ${res.statusText}`);
    }
    return res.json();
  }

  static async createZone(zone: RoleZone): Promise<RoleZone> {
    const res = await fetch(`${API_BASE}/space/zones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(zone),
    });
    if (!res.ok) {
      throw new Error(`Failed to create workspace zone: ${res.statusText}`);
    }
    return res.json();
  }

  static async createZonesBatch(zones: Partial<RoleZone>[]): Promise<RoleZone[]> {
    const res = await fetch(`${API_BASE}/space/zones/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zones }),
    });
    if (!res.ok) {
      throw new Error(`Failed to batch create workspace zones: ${res.statusText}`);
    }
    return res.json();
  }

  static async updateZone(id: string, updates: Partial<RoleZone>): Promise<RoleZone> {
    const res = await fetch(`${API_BASE}/space/zones/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      throw new Error(`Failed to update workspace zone: ${res.statusText}`);
    }
    return res.json();
  }

  static async deleteZone(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/space/zones/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      throw new Error(`Failed to delete workspace zone: ${res.statusText}`);
    }
  }

  static async fetchWorkflow(): Promise<SpaceWorkflow> {
    const res = await fetch(`${API_BASE}/space/workflow`);
    if (!res.ok) {
      throw new Error(`Failed to load workspace workflow: ${res.statusText}`);
    }
    return res.json();
  }

  static async fetchWorkspacePrompt(spaceId: string): Promise<SpaceWorkspacePrompt> {
    const res = await fetch(`${API_BASE}/space/workspaces/${encodeURIComponent(spaceId)}/prompt`);
    if (!res.ok) {
      throw new Error(`Failed to load workspace prompt: ${res.statusText}`);
    }
    return res.json();
  }

  static async saveWorkspacePrompt(
    spaceId: string,
    name: string,
    prompt: string,
  ): Promise<SpaceWorkspacePrompt> {
    const res = await fetch(`${API_BASE}/space/workspaces/${encodeURIComponent(spaceId)}/prompt`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, prompt }),
    });
    if (!res.ok) {
      throw new Error(`Failed to save workspace prompt: ${res.statusText}`);
    }
    return res.json();
  }

  static connectWebSocket(onMessage: (msg: { type: string; agentId?: string; runId?: string; data?: unknown }) => void): () => void {
    const wsUrl = getWsUrl();

    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isDisposed = false;

    function connect() {
      if (isDisposed) return;
      try {
        ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            onMessage(data);
          } catch (e) {
            console.error('[SpaceWs] Failed to parse message:', e);
          }
        };

        ws.onclose = () => {
          if (!isDisposed) {
            reconnectTimeout = setTimeout(connect, 2000);
          }
        };

        ws.onerror = (err) => {
          console.warn('[SpaceWs] WebSocket encountered an error:', err);
          ws?.close();
        };
      } catch (err) {
        console.error('[SpaceWs] Failed establishing connection:', err);
        if (!isDisposed) {
          reconnectTimeout = setTimeout(connect, 3000);
        }
      }
    }

    connect();

    return () => {
      isDisposed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }
}
