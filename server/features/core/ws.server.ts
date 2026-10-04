import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'node:http';

export interface WebSocketMessage {
  type: string;
  agentId?: string;
  runId?: string;
  data?: unknown;
  streamEvent?: unknown;
  [key: string]: unknown;
}

export class CoreWsServer {
  private static instance: CoreWsServer | null = null;
  private wss: WebSocketServer | null = null;
  private clients = new Set<WebSocket>();

  static getInstance(): CoreWsServer {
    if (!CoreWsServer.instance) {
      CoreWsServer.instance = new CoreWsServer();
    }
    return CoreWsServer.instance;
  }

  init(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', (err) => {
        console.error('[WsServer] Client connection error:', err);
        this.clients.delete(ws);
      });

      ws.send(JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() }));
    });

    console.log('[WsServer] WebSocket service attached to /ws');
  }

  broadcast(message: WebSocketMessage): void {
    const payload = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(payload);
        } catch (err) {
          console.error('[WsServer] Broadcast failure to client:', err);
        }
      }
    }
  }
}
