import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'node:http';
import type { WebSocketBroadcaster } from './runner.js';

export class CanvasWebSocketManager implements WebSocketBroadcaster {
  private wss: WebSocketServer | null = null;
  private clients = new Set<WebSocket>();

  init(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', (err) => {
        console.error('[WebSocket] Client error:', err);
        this.clients.delete(ws);
      });

      // Send initial welcome/ping
      ws.send(JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() }));
    });

    console.log('[WebSocket] Server initialized on path /ws');
  }

  broadcast(message: { type: string; agentId: string; runId?: string; data?: unknown }): void {
    const serialized = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(serialized);
        } catch (err) {
          console.error('[WebSocket] Failed to send message to client:', err);
        }
      }
    }
  }
}
