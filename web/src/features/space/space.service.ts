import type { SpaceAgentEntity } from '../agent/agent.types.js';
import { getWsUrl } from '../../config/desktop.bridge.ts';

const API_BASE = '/api';

export class SpaceService {
  static async fetchSpaceAgents(): Promise<SpaceAgentEntity[]> {
    const res = await fetch(`${API_BASE}/space`);
    if (!res.ok) {
      throw new Error(`Failed to load space entities: ${res.statusText}`);
    }
    return res.json();
  }

  static async updateNodePosition(id: string, posX: number, posY: number): Promise<void> {
    await fetch(`${API_BASE}/space/nodes/${id}/position`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posX, posY }),
    });
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
