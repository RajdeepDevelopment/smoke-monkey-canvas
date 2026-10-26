import React, { useState, useEffect, useMemo } from 'react';
import { Handle, Position, NodeResizeControl } from '@xyflow/react';
import ReactMarkdown from 'react-markdown';
import {
  Clock,
  MessageSquare,
  Zap,
  Square,
  Terminal,
  FileCode,
  FilePlus,
  FileEdit,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  Maximize2,
  Minimize2,
  X,
  Sparkles,
  Search,
  Code,
  Eye,
  Activity,
  Cpu,
  ChevronDown,
  ChevronRight,
  GripVertical,
} from 'lucide-react';
import type { LiveLogEvent, RunEventRecord } from '../agent/agent.types.js';
import { AgentService } from '../agent/agent.service.js';
import { useSpaceStore } from './space.store.js';

export interface ThreadProcessNodeData {
  [key: string]: unknown;
  runId: string;
  agentId: string;
  agentName: string;
  triggerType: 'cron' | 'manual' | 'chat';
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string | null;
  taskPrompt?: string;
  summary?: string | null;
  error?: string | null;
  isExpanded: boolean;
  onToggleExpand: (runId: string) => void;
  onClose?: (runId: string) => void;
  onOpenDrawer?: (agentId: string) => void;
  onStopRun?: (agentId: string, runId: string) => void;
}

export interface ProcessToolStep {
  id: string;
  toolName: string;
  status: 'running' | 'completed' | 'failed';
  targetSummary: string;
  args?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  timestamp: string;
}

export interface FileProgressionItem {
  id: string;
  path: string;
  fileName: string;
  action: 'added' | 'modified' | 'explored' | 'searched';
  toolName: string;
  stepNumber: number;
  timestamp: string;
}

/** Extract clean file target from tool arguments */
function extractFileTarget(_toolName: string, args?: Record<string, unknown>): string | null {
  if (!args || typeof args !== 'object') return null;
  const rawPath =
    args.targetFile ||
    args.TargetFile ||
    args.filePath ||
    args.path ||
    args.AbsolutePath ||
    args.file ||
    args.SearchPath ||
    args.DirectoryPath;

  if (typeof rawPath === 'string' && rawPath.trim()) {
    return rawPath.trim();
  }
  return null;
}

/** Extract clean target summary string safely handling strings, arrays, or objects */
function extractTargetSummary(toolName: string, args?: Record<string, unknown>): string {
  if (!args || typeof args !== 'object') return toolName;

  const file = extractFileTarget(toolName, args);
  if (file && typeof file === 'string') {
    const match = file.match(/^.*[\\/]([^\\/]+)$/);
    return match ? match[1] : file;
  }

  // Check common command / query / url keys
  const candidates = [
    args.command,
    args.CommandLine,
    args.query,
    args.Query,
    args.url,
    args.Url,
    args.path,
    args.pattern,
    args.task,
    args.prompt,
    args.Prompt,
  ];

  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) {
      const trimmed = c.trim();
      const match = trimmed.match(/^.*[\\/]([^\\/]+)$/);
      return match ? match[1] : trimmed.length > 32 ? trimmed.slice(0, 32) + '...' : trimmed;
    }
    if (Array.isArray(c)) {
      const joined = c.filter((x) => typeof x === 'string').join(' ').trim();
      if (joined) {
        return joined.length > 32 ? joined.slice(0, 32) + '...' : joined;
      }
    }
  }

  // First string key
  for (const val of Object.values(args)) {
    if (typeof val === 'string' && val.trim().length > 0 && val.length < 200) {
      const trimmed = val.trim();
      const match = trimmed.match(/^.*[\\/]([^\\/]+)$/);
      return match ? match[1] : trimmed.length > 32 ? trimmed.slice(0, 32) + '...' : trimmed;
    }
  }

  return toolName;
}

export const ThreadProcessNode: React.FC<{ data: ThreadProcessNodeData }> = React.memo(({ data }) => {
  const {
    runId,
    agentId,
    agentName,
    triggerType = 'manual',
    status: initialStatus,
    startedAt,
    completedAt,
    summary: initialSummary,
    error: initialError,
    isExpanded,
    onToggleExpand,
    onClose,
    onOpenDrawer,
    onStopRun,
  } = data;

  const [liveStatus, setLiveStatus] = useState<'running' | 'completed' | 'failed'>(initialStatus);
  const [summary, setSummary] = useState<string | null>(initialSummary || null);
  const [error, setError] = useState<string | null>(initialError || null);
  const [events, setEvents] = useState<LiveLogEvent[]>([]);
  const [liveStreamText, setLiveStreamText] = useState<string>('');
  const [liveThoughts, setLiveThoughts] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'pipeline' | 'files' | 'chat' | 'logs'>('pipeline');
  const [selectedToolStep, setSelectedToolStep] = useState<ProcessToolStep | null>(null);
  const [customSize, setCustomSize] = useState<{ width: number; height: number } | null>(null);

  // Sync initial status changes
  useEffect(() => {
    setLiveStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    if (initialSummary) setSummary(initialSummary);
  }, [initialSummary]);

  // Initial fetch of run details & past events
  useEffect(() => {
    let cancelled = false;
    AgentService.fetchRunDetails(runId)
      .then((details) => {
        if (cancelled) return;
        if (details.status) setLiveStatus(details.status as any);
        if (details.summary) setSummary(details.summary);
        if (details.error) setError(details.error);

        if (Array.isArray(details.events)) {
          const mapped: LiveLogEvent[] = details.events.map((ev: RunEventRecord) => {
            let payload: Record<string, unknown> = {};
            try {
              payload = JSON.parse(ev.payload_json);
            } catch {
              payload = {};
            }
            return {
              eventType: ev.event_type,
              payload,
              timestamp: ev.created_at,
            };
          });
          setEvents(mapped);
        }
      })
      .catch(() => {
        // Fallback: run may be brand new in memory
      });

    return () => {
      cancelled = true;
    };
  }, [runId]);

  // Real-time WebSocket listener for this run
  useEffect(() => {
    const unsub = useSpaceStore.getState().addWsListener((msg: any) => {
      if (!msg) return;

      // Check run status updates
      if (msg.runId === runId || (msg.data && msg.data.runId === runId)) {
        if (msg.type === 'run_completed') {
          setLiveStatus('completed');
          if (msg.data?.summary) setSummary(msg.data.summary);
        } else if (msg.type === 'run_failed') {
          setLiveStatus('failed');
          if (msg.data?.error) setError(msg.data.error);
        } else if (msg.type === 'run_event') {
          const evData = msg.data as LiveLogEvent;
          if (evData) {
            setEvents((prev) => [...prev, evData]);

            // Handle text streams
            if (evData.eventType === 'text.delta' && evData.payload?.delta) {
              setLiveStreamText((prev) => prev + String(evData.payload.delta));
            } else if (evData.eventType === 'text.thought' && evData.payload?.delta) {
              setLiveThoughts((prev) => prev + String(evData.payload.delta));
            }
          }
        }
      }
    });

    return unsub;
  }, [runId]);

  // Parse events into sequential tool calls pipeline
  const toolSteps = useMemo<ProcessToolStep[]>(() => {
    const stepsMap = new Map<string, ProcessToolStep>();
    const ordered: ProcessToolStep[] = [];

    events.forEach((ev, idx) => {
      const type = ev.eventType;
      const payload = ev.payload || {};

      if (type === 'tool.started' || type === 'tool:start') {
        const toolCallId = (typeof payload.toolCallId === 'string' && payload.toolCallId) ? payload.toolCallId : `step_${idx}`;
        const toolName = (typeof payload.toolName === 'string' && payload.toolName) ? payload.toolName : 'tool';
        const args = (payload.args || payload.input || {}) as Record<string, unknown>;
        const targetSummary = extractTargetSummary(toolName, args);

        const step: ProcessToolStep = {
          id: toolCallId,
          toolName,
          status: 'running',
          targetSummary,
          args,
          timestamp: ev.timestamp,
        };
        stepsMap.set(toolCallId, step);
        ordered.push(step);
      } else if (type === 'tool.completed' || type === 'tool:result') {
        const toolCallId = payload.toolCallId as string;
        if (toolCallId && stepsMap.has(toolCallId)) {
          const existing = stepsMap.get(toolCallId)!;
          existing.status = 'completed';
          existing.result = payload.result;
        }
      } else if (type === 'tool.failed' || type === 'tool:error') {
        const toolCallId = payload.toolCallId as string;
        if (toolCallId && stepsMap.has(toolCallId)) {
          const existing = stepsMap.get(toolCallId)!;
          existing.status = 'failed';
          existing.error = String(payload.error || 'Failed');
        }
      }
    });

    return ordered;
  }, [events]);

  // Parse events into the File Progression Graph ("one file to one file is adding, which are all files exploring")
  const fileProgression = useMemo<FileProgressionItem[]>(() => {
    const items: FileProgressionItem[] = [];
    const seenPaths = new Set<string>();

    toolSteps.forEach((step, idx) => {
      const filePath = extractFileTarget(step.toolName, step.args);
      if (!filePath || typeof filePath !== 'string') return;

      const tName = (step.toolName || '').toLowerCase();
      let action: FileProgressionItem['action'] = 'explored';

      if (tName.includes('write') || tName.includes('create') || tName.includes('add')) {
        action = 'added';
      } else if (tName.includes('replace') || tName.includes('edit') || tName.includes('modify')) {
        action = 'modified';
      } else if (tName.includes('search') || tName.includes('grep') || tName.includes('find') || tName.includes('list')) {
        action = 'searched';
      } else {
        action = 'explored';
      }

      const match = filePath.match(/^.*[\\/]([^\\/]+)$/);
      const fileName = match ? match[1] : filePath;
      const key = `${action}:${filePath}`;

      if (!seenPaths.has(key)) {
        seenPaths.add(key);
        items.push({
          id: `file_${idx}_${fileName}`,
          path: filePath,
          fileName,
          action,
          toolName: step.toolName,
          stepNumber: idx + 1,
          timestamp: step.timestamp,
        });
      }
    });

    return items;
  }, [toolSteps]);

  // Smart default tab: if there are no tool steps or files, but chat output is present, switch to chat tab
  useEffect(() => {
    if (
      activeTab === 'pipeline' &&
      toolSteps.length === 0 &&
      fileProgression.length === 0 &&
      (liveStreamText || summary || initialSummary)
    ) {
      setActiveTab('chat');
    }
  }, [toolSteps.length, fileProgression.length, liveStreamText, summary, initialSummary, activeTab]);

  // Short run ID label
  const safeRunId = typeof runId === 'string' ? runId : String(runId || '');
  const shortRunId = safeRunId.includes('_') ? `#${safeRunId.split('_').slice(-2).join('_')}` : safeRunId;

  // Icons based on trigger type
  const TriggerIcon =
    triggerType === 'cron'
      ? Clock
      : triggerType === 'chat'
        ? MessageSquare
        : Zap;

  // Active theme color
  const accentColor =
    liveStatus === 'running'
      ? triggerType === 'cron'
        ? '#f59e0b'
        : '#38bdf8'
      : liveStatus === 'failed'
        ? '#ef4444'
        : '#10b981';

  // ── 1. Compact View (Floating Beacon Dot in Canvas) ──────────────────────
  if (!isExpanded) {
    return (
      <div
        className={`thread-process-beacon-dot ${liveStatus} ${triggerType}`}
        onClick={() => onToggleExpand(runId)}
        title={`Click to open graphical process map for ${agentName} (${triggerType})`}
      >
        <Handle type="target" position={Position.Left} id="thread-target" style={{ opacity: 0 }} />
        <Handle type="source" position={Position.Right} id="thread-source" style={{ opacity: 0 }} />

        {/* Pulsing radar waves when running */}
        {liveStatus === 'running' && (
          <div className="beacon-radar-wave" style={{ borderColor: accentColor }} />
        )}

        <div className="beacon-core-pill" style={{ borderColor: `${accentColor}77` }}>
          <div className="beacon-indicator" style={{ backgroundColor: accentColor }}>
            <TriggerIcon size={12} color="#000" />
          </div>

          <div className="beacon-info">
            <span className="beacon-title">
              {triggerType === 'cron' ? 'Cron Job' : 'Agent Thread'}
            </span>
            <span className="beacon-run-id">{shortRunId}</span>
          </div>

          <div className="beacon-status-badge" style={{ color: accentColor }}>
            {liveStatus === 'running' ? (
              <>
                <span className="beacon-pulse-dot" style={{ backgroundColor: accentColor }} />
                <span>Running</span>
              </>
            ) : liveStatus === 'failed' ? (
              <span style={{ color: '#ef4444' }}>Failed</span>
            ) : (
              <span style={{ color: '#10b981' }}>Done</span>
            )}
          </div>

          <div className="beacon-expand-hint" title="Expand Graphical Process">
            <Maximize2 size={11} />
          </div>
        </div>
      </div>
    );
  }

  // ── 2. Expanded View (Full Graphical Process & File Flow Inspector) ──────
  return (
    <div
      className={`thread-process-expanded-card ${liveStatus} ${triggerType}`}
      style={{
        width: customSize?.width ? `${customSize.width}px` : undefined,
        height: customSize?.height ? `${customSize.height}px` : undefined,
      }}
    >
      {/* Target Handle: Connects graphical line directly to this navbar */}
      <Handle
        type="target"
        position={Position.Left}
        id="thread-target"
        style={{ top: 17, opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="thread-source"
        style={{ top: 17, opacity: 0 }}
      />

      {/* Minimalist Top Bar: 4-Part Segmented Navigation + Dedicated Drag Handle Grip + Action Icons */}
      <div className="thread-minimal-topbar">
        {/* Dedicated Drag Handle Grip */}
        <div className="thread-drag-handle" title="Hold and drag to move process thread in space">
          <GripVertical size={13} className="drag-grip-icon" />
        </div>

        <div className="thread-nav-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'pipeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('pipeline')}
            title="Execution Pipeline"
          >
            <Activity size={12} />
            <span className="tab-text">Pipeline <span className="tab-badge">{toolSteps.length}</span></span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
            title="Files Explored & Added"
          >
            <FolderOpen size={12} />
            <span className="tab-text">Files <span className="tab-badge">{fileProgression.length}</span></span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
            title="Chat & Output"
          >
            <MessageSquare size={12} />
            <span className="tab-text">
              Chat
              {(liveStreamText || summary) && (
                <span className="tab-badge chat-active-dot">●</span>
              )}
            </span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
            title="Event Stream"
          >
            <Code size={12} />
            <span className="tab-text">Events <span className="tab-badge">{events.length}</span></span>
          </button>
        </div>

        <div className="thread-topbar-actions nodrag">
          {liveStatus === 'running' && onStopRun && (
            <button
              type="button"
              className="btn-topbar-action stop"
              onClick={(e) => {
                e.stopPropagation();
                onStopRun(agentId, runId);
              }}
              title="Stop Execution"
            >
              <Square size={11} fill="currentColor" />
            </button>
          )}

          {onOpenDrawer && (
            <button
              type="button"
              className="btn-topbar-action"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDrawer(agentId);
              }}
              title="Open full Drawer & Terminal"
            >
              <Terminal size={12} />
            </button>
          )}

          <button
            type="button"
            className="btn-topbar-action"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(runId);
            }}
            title="Minimize to Dot"
          >
            <Minimize2 size={12} />
          </button>

          {onClose && (
            <button
              type="button"
              className="btn-topbar-action close"
              onClick={(e) => {
                e.stopPropagation();
                onClose(runId);
              }}
              title="Dismiss View"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>


      {/* ── TAB 1: Graphical Tool Calls Pipeline (Vertical DAG Flow) ── */}
      {activeTab === 'pipeline' && (
        <div className="thread-tab-content pipeline-view nodrag nowheel">
          <div className="pipeline-header-bar">
            <span className="pipeline-hint">
              Vertical execution flow ({toolSteps.length} tool calls):
            </span>
            {liveStatus === 'running' && (
              <span className="live-executing-tag" style={{ color: accentColor }}>
                <span className="pulse-dot" style={{ backgroundColor: accentColor }} />
                <span>Active Process</span>
              </span>
            )}
          </div>

          {toolSteps.length === 0 ? (
            <div className="empty-pipeline-state">
              <Cpu size={24} className="empty-icon" />
              <span>{liveStatus === 'running' ? 'Initializing agent loop & preparing tool calls...' : 'No tool calls executed in this run.'}</span>
            </div>
          ) : (
            <div className="pipeline-vertical-dag">
              {toolSteps.map((step, idx) => {
                const isSelected = selectedToolStep?.id === step.id;
                const isLast = idx === toolSteps.length - 1;

                return (
                  <div key={step.id} className={`dag-step-row ${step.status} ${isSelected ? 'expanded' : ''}`}>
                    {/* Left Rail / Timeline with glowing node and connector line */}
                    <div className="dag-rail-col">
                      <div className={`dag-node-dot ${step.status}`}>
                        {step.status === 'running' ? (
                          <div className="dag-pulse-ring" />
                        ) : step.status === 'completed' ? (
                          <CheckCircle2 size={11} color="#10b981" />
                        ) : (
                          <AlertCircle size={11} color="#ef4444" />
                        )}
                      </div>
                      {!isLast && <div className={`dag-rail-line ${step.status}`} />}
                    </div>

                    {/* Step Card with Header & Inline Expandable Inspector */}
                    <div className="dag-card-wrapper">
                      <button
                        type="button"
                        className={`dag-card-header ${step.status} ${isSelected ? 'active' : ''}`}
                        onClick={() => setSelectedToolStep(isSelected ? null : step)}
                      >
                        <div className="dag-header-left">
                          <span className="dag-step-index">#{idx + 1}</span>
                          <span className="dag-tool-title">{step.toolName}</span>
                          {step.targetSummary && (
                            <span className="dag-target-badge" title={step.targetSummary}>
                              {step.targetSummary}
                            </span>
                          )}
                        </div>

                        <div className="dag-header-right">
                          <span className={`dag-status-pill ${step.status}`}>
                            {step.status}
                          </span>
                          <span className="dag-toggle-arrow">
                            {isSelected ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          </span>
                        </div>
                      </button>

                      {/* Inline Collapsible Details */}
                      {isSelected && (
                        <div className="dag-inline-inspector">
                          <div className="dag-inspector-block">
                            <span className="dag-block-label">Inputs / Arguments:</span>
                            <pre className="dag-code-pre">
                              {JSON.stringify(step.args || {}, null, 2)}
                            </pre>
                          </div>

                          {step.result !== undefined && (
                            <div className="dag-inspector-block">
                              <span className="dag-block-label">Result:</span>
                              <pre className="dag-code-pre result">
                                {typeof step.result === 'string'
                                  ? step.result
                                  : JSON.stringify(step.result, null, 2)}
                              </pre>
                            </div>
                          )}

                          {step.error && (
                            <div className="dag-inspector-block error">
                              <span className="dag-block-label">Error:</span>
                              <div className="dag-error-text">{step.error}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: File Exploration & Addition Progression (Vertical Tree) ── */}
      {activeTab === 'files' && (
        <div className="thread-tab-content files-view nodrag nowheel">
          <div className="files-header-bar">
            <span className="files-header-text">
              Workspace files accessed ({fileProgression.length}):
            </span>
            <div className="files-summary-counts">
              <span className="count-chip added">
                + {fileProgression.filter((f) => f.action === 'added').length}
              </span>
              <span className="count-chip modified">
                ✍ {fileProgression.filter((f) => f.action === 'modified').length}
              </span>
              <span className="count-chip explored">
                👁 {fileProgression.filter((f) => f.action === 'explored').length}
              </span>
            </div>
          </div>

          {fileProgression.length === 0 ? (
            <div className="empty-files-state">
              <FolderOpen size={24} className="empty-icon" />
              <span>No workspace files accessed or modified yet.</span>
            </div>
          ) : (
            <div className="files-vertical-tree">
              {fileProgression.map((item, idx) => {
                const isLast = idx === fileProgression.length - 1;
                const FileActionIcon =
                  item.action === 'added'
                    ? FilePlus
                    : item.action === 'modified'
                      ? FileEdit
                      : item.action === 'searched'
                        ? Search
                        : Eye;

                return (
                  <div key={item.id} className={`tree-file-row ${item.action}`}>
                    <div className="tree-rail-col">
                      <div className={`tree-node-dot ${item.action}`}>
                        <FileActionIcon size={10} />
                      </div>
                      {!isLast && <div className="tree-rail-line" />}
                    </div>

                    <div className="tree-card-wrapper" title={item.path}>
                      <div className="tree-file-header">
                        <div className="tree-file-left">
                          <FileCode size={13} className="tree-file-icon" />
                          <span className="tree-file-name">{item.fileName}</span>
                          <span className="tree-step-tag">Step #{item.stepNumber}</span>
                        </div>
                        <span className={`tree-action-pill ${item.action}`}>
                          {item.action.toUpperCase()}
                        </span>
                      </div>
                      <div className="tree-file-path">{item.path}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: Chats, Stream & Thought Output (Below Section) ────── */}
      {activeTab === 'chat' && (
        <div className="thread-tab-content chat-view nodrag nowheel">
          {/* Agent Thoughts if any */}
          {liveThoughts && (
            <div className="thought-stream-card nodrag">
              <div className="thought-header">
                <Sparkles size={12} color="#a855f7" />
                <span>Agent Reasoning Stream:</span>
              </div>
              <div className="thought-content">{liveThoughts}</div>
            </div>
          )}

          {/* Live text output or summary */}
          <div className="chat-stream-card nodrag">
            <div className="chat-stream-header">
              <MessageSquare size={12} color={accentColor} />
              <span>Response & Output:</span>
            </div>

            <div className="chat-stream-body">
              {liveStreamText || summary ? (
                <div className="thread-markdown-prose">
                  <ReactMarkdown>{liveStreamText || summary || ''}</ReactMarkdown>
                </div>
              ) : error ? (
                <div className="error-text">Execution Error: {error}</div>
              ) : (
                <div className="stream-placeholder">
                  {liveStatus === 'running'
                    ? 'Awaiting agent generation stream...'
                    : 'No text response produced for this execution.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: Live Event Logs Stream ────────────────────────────── */}
      {activeTab === 'logs' && (
        <div className="thread-tab-content logs-view nodrag nowheel">
          <div className="logs-terminal-stream nodrag nowheel">
            {events.length === 0 ? (
              <div className="empty-logs">Awaiting execution events...</div>
            ) : (
              events.map((ev, i) => (
                <div key={i} className="log-line">
                  <span className="log-time">
                    {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : '--:--:--'}
                  </span>
                  <span className="log-type">{ev.eventType}</span>
                  <span className="log-data">
                    {JSON.stringify(ev.payload || {}).slice(0, 140)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Bottom Footer Info */}
      <div className="thread-card-footer">
        <div className="footer-left">
          <span className="footer-status-dot" style={{ backgroundColor: accentColor }} />
          <span className="footer-status-text">
            {liveStatus === 'running'
              ? 'Agent currently running in space'
              : liveStatus === 'completed'
                ? 'Execution finished successfully'
                : 'Execution failed'}
          </span>
        </div>

        <div className="footer-right">
          <span className="footer-time">
            {completedAt
              ? `Done: ${new Date(completedAt).toLocaleTimeString()}`
              : `Started: ${startedAt ? new Date(startedAt).toLocaleTimeString() : 'Just now'}`}
          </span>
        </div>
      </div>

      {/* ── Corner Resize Handle via NodeResizeControl ─────────────────── */}
      <NodeResizeControl
        position="bottom-right"
        minWidth={460}
        minHeight={260}
        maxWidth={1200}
        maxHeight={850}
        onResize={(_e, params) => {
          setCustomSize({
            width: Math.round(params.width),
            height: Math.round(params.height),
          });
        }}
      >
        <div
          className="thread-process-resize-grip nodrag nopan"
          title="Drag corner to resize process inspector window"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M9 1L1 9M9 5L5 9M9 9L9 9.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </NodeResizeControl>
    </div>
  );
});
