import type { ChatRequest, ChatTransport, ChatStreamEvent, ChatPromptResponse } from '@smoke-monkey/ui';
import { AgentService } from './agent.service.js';
import { getWsUrl } from '../../config/desktop.bridge.ts';

export class CanvasAgentTransport implements ChatTransport {
  private agentId: string;
  private socket: WebSocket | null = null;

  constructor(agentId: string) {
    this.agentId = agentId;
  }

  async *send(request: ChatRequest): AsyncGenerator<ChatStreamEvent> {
    const prompt = request.text || 'Execute operations.';
    const sessionId = request.conversationId || `session_${this.agentId}_default`;

    // 1. Trigger run on backend harness
    const { run } = await AgentService.triggerRun(this.agentId, prompt, sessionId);
    const runId = run.id;

    // 2. Connect to WebSocket stream
    const wsUrl = getWsUrl();
    const socket = new WebSocket(wsUrl);
    this.socket = socket;

    const eventQueue: ChatStreamEvent[] = [
      { type: 'message:start', messageId: runId } as unknown as ChatStreamEvent,
    ];
    let resolveWait: (() => void) | null = null;
    let isDone = false;

    socket.onmessage = (msgEvt) => {
      try {
        const data = JSON.parse(msgEvt.data);
        if (data.type === 'chat_stream_event' && data.agentId === this.agentId) {
          eventQueue.push(data.streamEvent as ChatStreamEvent);
          if (data.streamEvent.type === 'message:complete' || data.streamEvent.type === 'error') {
            isDone = true;
          }
          resolveWait?.();
          resolveWait = null;
        } else if (data.type === 'run_completed' && data.agentId === this.agentId) {
          eventQueue.push({ type: 'message:complete' } as unknown as ChatStreamEvent);
          isDone = true;
          resolveWait?.();
          resolveWait = null;
        } else if (data.type === 'run_failed' && data.agentId === this.agentId) {
          eventQueue.push({
            type: 'error',
            error: {
              code: 'run_failed',
              layer: 'run',
              severity: 'error',
              message: data.data?.error || 'Run failed',
              retryable: false,
            },
          } as unknown as ChatStreamEvent);
          isDone = true;
          resolveWait?.();
          resolveWait = null;
        }
      } catch (err) {
        console.error('[CanvasAgentTransport] Error processing WS event:', err);
      }
    };

    socket.onerror = () => {
      isDone = true;
      resolveWait?.();
      resolveWait = null;
    };

    socket.onclose = () => {
      isDone = true;
      resolveWait?.();
      resolveWait = null;
    };

    try {
      while (!isDone || eventQueue.length > 0) {
        if (eventQueue.length > 0) {
          yield eventQueue.shift()!;
        } else if (!isDone) {
          await new Promise<void>((resolve) => {
            resolveWait = resolve;
          });
        }
      }
    } finally {
      if (this.socket === socket) {
        this.socket.close();
        this.socket = null;
      }
    }
  }

  async abort(): Promise<void> {
    await AgentService.stopAgent(this.agentId).catch(() => {});
  }

  async respond(response: ChatPromptResponse): Promise<void> {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(response));
    }
  }
}
