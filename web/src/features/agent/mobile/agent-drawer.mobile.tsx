import React, { useRef, useEffect } from 'react';
import {
  X,
  Play,
  Square,
  MessageSquare,
  Terminal,
  History,
  FolderOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  Cpu,
} from 'lucide-react';
import type { SpaceAgentEntity, RunRecord, ChatSessionRecord } from '../agent.types.js';
import type { LiveLogEvent } from '../agent.drawer.js';
import type { ChatMessage } from '@smoke-monkey/ui';
import { ChatVoiceButton } from '../../voice/chat-voice-button.js';
import { AgentFileExplorer } from '../agent.file-explorer.js';

export interface AgentDrawerMobileProps {
  agent: SpaceAgentEntity;
  activeTab: 'chat' | 'terminal' | 'history' | 'files';
  setActiveTab: (tab: 'chat' | 'terminal' | 'history' | 'files') => void;
  filesCount?: number;
  messages: ChatMessage[];
  isStreaming: boolean;
  running: boolean;
  composerText: string;
  setComposerText: (text: string) => void;
  onSendMessage: (text: string) => void;
  onRunNow: (agentId: string, customPrompt?: string) => Promise<void>;
  onStopNow?: (agentId: string) => Promise<void>;
  onClose: () => void;
  liveEvents?: LiveLogEvent[];
  runs?: RunRecord[];
  chatSessions?: ChatSessionRecord[];
  activeSessionId?: string;
  onSelectSession?: (sessionId: string) => void;
  onNewSession?: () => void;
  onSelectRun?: (runId: string) => void;
}

export const AgentDrawerMobile: React.FC<AgentDrawerMobileProps> = React.memo(({
  agent,
  activeTab,
  setActiveTab,
  messages,
  isStreaming,
  running,
  composerText,
  setComposerText,
  onSendMessage,
  onRunNow,
  onStopNow,
  onClose,
  liveEvents = [],
  runs = [],
  filesCount,
  onSelectRun,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll messages
  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (activeTab === 'terminal') {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, liveEvents, activeTab]);

  const shortId = agent.id.includes('_') ? `#${agent.id.split('_').pop()}` : `#${agent.id}`;

  const handleSend = () => {
    const text = composerText.trim();
    if (!text || running || isStreaming) return;
    onSendMessage(text);
    setComposerText('');
  };

  return (
    <div className="agent-mobile-container" onClick={(e) => e.stopPropagation()}>
      {/* 
        Top Padding Backdrop: deliberately ignores click so tapping the 
        top gap does NOT close the sheet as requested by user.
      */}
      <div 
        className="agent-mobile-top-scrim" 
        onClick={(e) => {
          e.stopPropagation();
          // DO NOT close when clicking top - only cross button closes
        }} 
      />

      {/* Mobile Drawer Sheet */}
      <section 
        className="agent-mobile-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`Agent ${agent.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Pill / Top Grabber */}
        <div className="agent-mobile-grabber-row">
          <div className="agent-mobile-pill" />
        </div>

        {/* Header Bar */}
        <div className="agent-mobile-header">
          <div className="agent-mobile-header-left">
            <div className="agent-mobile-mascot-wrap">
              <img
                src="/smoke-monkey-mascot.png"
                alt="Agent Mascot"
                className="agent-mobile-mascot"
              />
              <span className={`agent-mobile-status-dot ${agent.status}`} />
            </div>
            <div className="agent-mobile-title-col">
              <div className="agent-mobile-name-row">
                <span className="agent-mobile-name">{agent.name}</span>
                <span className="agent-mobile-id-badge">{shortId}</span>
              </div>
              <div className="agent-mobile-meta-row">
                <span className="agent-mobile-model-tag">
                  <Cpu size={10} />
                  <span>{agent.model.split('/').pop()}</span>
                </span>
                <span className="agent-mobile-status-text">{agent.status}</span>
              </div>
            </div>
          </div>

          <div className="agent-mobile-header-actions">
            {/* Run / Stop toggle */}
            {running || isStreaming ? (
              <button
                type="button"
                className="agent-mobile-btn stop"
                onClick={() => onStopNow?.(agent.id)}
                title="Stop Agent Execution"
              >
                <Square size={12} fill="currentColor" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                className="agent-mobile-btn run"
                onClick={() => onRunNow(agent.id)}
                title="Run Agent Task"
              >
                <Play size={12} fill="currentColor" />
                <span>Run</span>
              </button>
            )}

            {/* MANDATORY CROSS BUTTON IN TOP-RIGHT */}
            <button
              type="button"
              className="agent-mobile-close-btn"
              onClick={onClose}
              title="Close Drawer"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <nav className="agent-mobile-tabs">
          <button
            type="button"
            className={`agent-mobile-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <MessageSquare size={13} />
            <span>Chat</span>
            {messages.length > 0 && <span className="tab-badge">{messages.length}</span>}
          </button>
          <button
            type="button"
            className={`agent-mobile-tab-btn ${activeTab === 'terminal' ? 'active' : ''}`}
            onClick={() => setActiveTab('terminal')}
          >
            <Terminal size={13} />
            <span>Terminal</span>
            {liveEvents.length > 0 && <span className="tab-badge">{liveEvents.length}</span>}
          </button>
          <button
            type="button"
            className={`agent-mobile-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={13} />
            <span>History</span>
            {runs.length > 0 && <span className="tab-badge">{runs.length}</span>}
          </button>
          <button
            type="button"
            className={`agent-mobile-tab-btn ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            <FolderOpen size={13} />
            <span>Files</span>
            {filesCount != null && filesCount > 0 && <span className="tab-badge">{filesCount}</span>}
          </button>
        </nav>

        {/* Content Body */}
        <div className="agent-mobile-body">
          {/* TAB 1: CHAT */}
          {activeTab === 'chat' && (
            <div className="agent-mobile-chat-view">
              {/* Message Feed */}
              <div className="agent-mobile-messages-scroll">
                {messages.length === 0 ? (
                  <div className="agent-mobile-empty-chat">
                    <img src="/smoke-monkey-mascot.png" alt="Mascot" style={{ width: 44, height: 44, opacity: 0.8 }} />
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#f8fafc', marginTop: 10 }}>
                      Ready to collaborate
                    </div>
                    <div style={{ fontSize: 11.5, color: '#94a3b8', maxWidth: 240, textAlign: 'center', marginTop: 4 }}>
                      Send an instruction or ask {agent.name} to perform a task.
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isUser = msg.role === 'user';
                    return (
                      <div
                        key={msg.id}
                        className={`agent-mobile-msg-row ${isUser ? 'user' : 'assistant'}`}
                      >
                        {!isUser && (
                          <div className="agent-msg-avatar">
                            <img src="/smoke-monkey-mascot.png" alt="Bot" style={{ width: 18, height: 18 }} />
                          </div>
                        )}
                        <div className={`agent-mobile-bubble ${isUser ? 'user' : 'assistant'}`}>
                          {/* Message Content */}
                          <div className="agent-bubble-text">{msg.content}</div>

                          {/* Render Tool Calls if present */}
                          {msg.toolCalls && msg.toolCalls.length > 0 && (
                            <div className="agent-bubble-tools">
                              {msg.toolCalls.map((tc) => (
                                <div key={tc.id} className="mobile-tool-chip">
                                  <span className="tool-indicator">⚡</span>
                                  <span className="tool-name">{tc.name || (tc as any).title}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {msg.status === 'streaming' && (
                            <span className="agent-streaming-cursor" />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Composer */}
              <div className="agent-mobile-composer-box">
                <div className="agent-mobile-composer-row">
                  <textarea
                    className="agent-mobile-input"
                    placeholder={`Message ${agent.name}...`}
                    value={composerText}
                    onChange={(e) => setComposerText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    rows={1}
                  />

                  {/* Voice Button */}
                  <ChatVoiceButton
                    currentValue={composerText}
                    onValueChange={setComposerText}
                    disabled={running || isStreaming}
                  />

                  {/* Send Button */}
                  <button
                    type="button"
                    className="agent-mobile-send-btn"
                    disabled={!composerText.trim() || running || isStreaming}
                    onClick={handleSend}
                    title="Send message"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TERMINAL */}
          {activeTab === 'terminal' && (
            <div className="agent-mobile-terminal-view">
              <div className="agent-terminal-header">
                <span className="terminal-dot red" />
                <span className="terminal-dot yellow" />
                <span className="terminal-dot green" />
                <span className="terminal-title">live-stream.log</span>
              </div>
              <div className="agent-terminal-content">
                {liveEvents.length === 0 ? (
                  <div className="terminal-empty-text">No active telemetry events recorded yet.</div>
                ) : (
                  liveEvents.map((evt, idx) => (
                    <div key={idx} className="terminal-line">
                      <span className="term-ts">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                      <span className="term-type">[{evt.eventType}]</span>
                      <span className="term-body">{JSON.stringify(evt.payload)}</span>
                    </div>
                  ))
                )}
                <div ref={terminalEndRef} />
              </div>
            </div>
          )}

          {/* TAB 3: HISTORY */}
          {activeTab === 'history' && (
            <div className="agent-mobile-history-view">
              <div className="history-section-title">Past Executions ({runs.length})</div>
              {runs.length === 0 ? (
                <div className="history-empty">No run history recorded for this agent yet.</div>
              ) : (
                <div className="history-list">
                  {runs.map((r) => (
                    <div
                      key={r.id}
                      className="history-item-card"
                      onClick={() => onSelectRun?.(r.id)}
                    >
                      <div className="history-item-top">
                        <span className={`status-badge ${r.status}`}>
                          {r.status === 'completed' ? (
                            <CheckCircle2 size={12} color="#10b981" />
                          ) : (
                            <AlertCircle size={12} color="#ef4444" />
                          )}
                          <span>{r.status}</span>
                        </span>
                        <span className="history-item-time">
                          <Clock size={11} />
                          {new Date(r.started_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="history-item-summary">
                        {r.summary || r.task_prompt || 'Task execution'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: WORKSPACE FILES */}
          {activeTab === 'files' && (
            <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
              <AgentFileExplorer agent={agent} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
});
