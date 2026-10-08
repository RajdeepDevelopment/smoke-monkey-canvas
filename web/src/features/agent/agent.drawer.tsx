import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Play,
  Square,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Terminal,
  History,
  Sparkles,
  Plus,
  Folder,
  FolderOpen,
  HardDrive,
  Smartphone,
  Trash2,
  AlertTriangle,
  ChevronDown,
  FileText,
  Brain,
  GitBranch,
  Zap,
  Code2,
  Edit3,
  Save,
  ExternalLink,
} from 'lucide-react';
import type {
  SpaceAgentEntity,
  RunRecord,
  ChatSessionRecord,
  ActiveRunRecord,
  AttachmentSource,
  AgentManifestInfo,
  AgentPolicyEntry,
} from './agent.types.js';
import { AgentService } from './agent.service.js';
import { ChatPanel, ChatComposer, applyChatEvent, SyntheticTransport } from '@smoke-monkey/ui';
import '@smoke-monkey/ui/ui.css';
import type { ChatMessage, MessagePart, ToolCall } from '@smoke-monkey/ui';
import { useSpaceStore } from '../space/space.store.js';
import { ChatVoiceButton } from '../voice/chat-voice-button.js';
import { useIsMobile } from '../common/use-mobile.js';
import { AgentDrawerMobile } from './mobile/agent-drawer.mobile.js';
import { AgentFileExplorer } from './agent.file-explorer.js';

export interface LiveLogEvent {
  eventType: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

interface AgentDrawerProps {
  agent: SpaceAgentEntity | null;
  liveEvents?: LiveLogEvent[];
  canvasTheme?: string; // e.g. 'theme-dark-midnight' — maps to SM chat theme
  onRunNow: (agentId: string, customPrompt?: string) => Promise<void>;
  onStopNow?: (agentId: string) => Promise<void>;
  onConfigureMcp?: (agentId: string, mcpName?: string) => void;
  onClose: () => void;
}

/** Map the canvas theme class → SM chat built-in theme */
function toSmTheme(canvasTheme?: string): 'dark' | 'midnight' | 'mono' | 'light' | 'solar' | 'paper' {
  if (!canvasTheme) return 'dark';
  if (canvasTheme.includes('nebula')) return 'midnight';
  if (canvasTheme.includes('carbon')) return 'mono';
  if (canvasTheme.includes('light-studio')) return 'light';
  if (canvasTheme.includes('light-paper')) return 'paper';
  if (canvasTheme.includes('light-pastel')) return 'solar';
  return 'dark'; // default for theme-dark-midnight
}

/** Badge styling per attachment origin shown in the Connected Components card. */
const SOURCE_META: Record<AttachmentSource, { label: string; color: string }> = {
  canvas: { label: 'Managed', color: '#38bdf8' },
  user: { label: 'You', color: '#34d399' },
  agent: { label: 'Agent', color: '#fbbf24' },
};

/** Parse the raw `agents.policies` column until `/manifest` supplies sources. */
const parseFallbackPolicies = (raw: string | null | undefined): AgentPolicyEntry[] => {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [{ text: raw.trim(), source: 'user' }];
    return parsed
      .map((p): AgentPolicyEntry | null => {
        if (typeof p === 'string') return p.trim() ? { text: p.trim(), source: 'user' } : null;
        if (p && typeof p === 'object' && typeof (p as AgentPolicyEntry).text === 'string') {
          const entry = p as AgentPolicyEntry;
          return {
            text: entry.text,
            source:
              entry.source === 'canvas' || entry.source === 'agent' ? entry.source : 'user',
          };
        }
        return null;
      })
      .filter((p): p is AgentPolicyEntry => p !== null);
  } catch {
    return raw.trim() ? [{ text: raw.trim(), source: 'user' }] : [];
  }
};

const SourceBadge: React.FC<{ source?: AttachmentSource }> = ({ source }) => {
  const src: AttachmentSource = source ?? 'canvas';
  const meta = SOURCE_META[src] ?? SOURCE_META.canvas;
  const title =
    src === 'canvas'
      ? 'Added via the app and refreshed every run'
      : src === 'user'
        ? 'Attached by you from the input box'
        : 'Added by the agent itself during a run';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 7px',
        borderRadius: 9999,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        color: meta.color,
        background: `${meta.color}1f`,
        border: `1px solid ${meta.color}55`,
        whiteSpace: 'nowrap',
      }}
      title={title}
    >
      {meta.label}
    </span>
  );
};







function getPromptSummary(prompt?: string): string {
  if (!prompt) return 'Autonomous AI specialist agent ready to assist.';
  // 1. If there's an explicit MISSION heading, use the mission text
  const missionMatch = prompt.match(/##\s*MISSION\s+([^\n#]+)/i);
  if (missionMatch && missionMatch[1]?.trim()) {
    return missionMatch[1].trim();
  }
  // 2. Otherwise take the first introductory sentence before any markdown headings or extra lines
  const firstSection = prompt.split(/\n##|\n\n/)[0]?.trim() || '';
  if (firstSection) {
    const matchSentence = firstSection.match(/^([^.!?]+[.!?])/);
    if (matchSentence && matchSentence[1] && matchSentence[1].length > 15) {
      return matchSentence[1].trim();
    }
    return firstSection.length > 180 ? firstSection.slice(0, 177) + '…' : firstSection;
  }
  return prompt.length > 180 ? prompt.slice(0, 177) + '…' : prompt;
}

export const AgentDrawer: React.FC<AgentDrawerProps> = React.memo(({
  agent,
  liveEvents: liveEventsProp,
  canvasTheme,
  onRunNow,
  onStopNow,
  onConfigureMcp,
  onClose,
}) => {
  if (!agent) return null;

  const storeLiveEvents = useSpaceStore((s) => s.liveEvents);
  const liveEvents = liveEventsProp ?? storeLiveEvents;

  const [activeTab, setActiveTab] = useState<'chat' | 'terminal' | 'history' | 'files'>('chat');
  const [workspaceFilesCount, setWorkspaceFilesCount] = useState<number>(0);

  useEffect(() => {
    AgentService.fetchWorkspaceFiles(agent.id)
      .then((res) => setWorkspaceFilesCount(res.totalFiles))
      .catch(() => {});
  }, [agent.id]);

  const [promptInput, setPromptInput] = useState('');
  const [composerText, setComposerText] = useState('');
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const isMobile = useIsMobile();
  const pendingVoicePrompt = useSpaceStore((s) => s.pendingVoicePrompt);
  const setPendingVoicePrompt = useSpaceStore((s) => s.setPendingVoicePrompt);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSessionRecord[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>(`session_${agent.id}_default`);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'sessions' | 'cron'>('all');
  const [running, setRunning] = useState(false);
  const [useSynthetic, setUseSynthetic] = useState(false);
  const [pastRunEvents, setPastRunEvents] = useState<LiveLogEvent[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [isEntering, setIsEntering] = useState(true);
  const [manifest, setManifest] = useState<AgentManifestInfo | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // ── First-Class Reconnecting Multi-Turn Chat & Concurrency State ──
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeRuns, setActiveRuns] = useState<ActiveRunRecord[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [viewingCronRunId, setViewingCronRunId] = useState<string | null>(null);
  const [viewingHistoryRunId, setViewingHistoryRunId] = useState<string | null>(null);

  // ── Memory & Repository Inspection / Editing State ──
  const [selectedMemoryFile, setSelectedMemoryFile] = useState<string | null>(null);
  const [memoryModalContent, setMemoryModalContent] = useState<string>('');
  const [isEditingMemory, setIsEditingMemory] = useState(false);
  const [isSavingMemory, setIsSavingMemory] = useState(false);

  const [selectedRepoFile, setSelectedRepoFile] = useState<string | null>(null);
  const [repoFileContent, setRepoFileContent] = useState<string>('');
  const [isEditingRepoFile, setIsEditingRepoFile] = useState(false);
  const [isSavingRepoFile, setIsSavingRepoFile] = useState(false);

  // Clear entrance animation class after initial slide-in
  useEffect(() => {
    const t = setTimeout(() => setIsEntering(false), 260);
    return () => clearTimeout(t);
  }, []);

  const syntheticTransport = useMemo(() => new SyntheticTransport(), []);

  // ── Drag Resizing State (managed via Zustand for zero canvas flicker) ──
  const drawerRef = useRef<HTMLDivElement>(null);
  const MIN_DRAWER_WIDTH = 440;
  const drawerWidth = useSpaceStore((s) => s.drawerWidth);
  const isResizing = useSpaceStore((s) => s.isDrawerResizing);
  const setIsResizing = useSpaceStore((s) => s.setIsDrawerResizing);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    let lastClampedWidth = drawerWidth;
    let rafId: number | null = null;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = window.innerWidth - moveEvent.clientX;
      const maxWidth = window.innerWidth - 60;
      lastClampedWidth = Math.max(MIN_DRAWER_WIDTH, Math.min(maxWidth, newWidth));
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (drawerRef.current) {
          drawerRef.current.style.width = `${lastClampedWidth}px`;
        }
      });
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      const finalWidth = Math.max(
        MIN_DRAWER_WIDTH,
        Math.min(window.innerWidth - 60, window.innerWidth - upEvent.clientX),
      );

      if (drawerRef.current) {
        drawerRef.current.style.width = `${finalWidth}px`;
      }

      useSpaceStore.setState({
        drawerWidth: finalWidth,
        isDrawerResizing: false,
      });

      try {
        localStorage.setItem('sm_canvas_drawer_width', String(finalWidth));
      } catch {}
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [drawerWidth, setIsResizing]);

  useEffect(() => {
    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // ── Keyboard Shortcuts (Escape to Close Drawer) ──
  useEffect(() => {
    if (!agent) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.querySelector('.modal-backdrop, [role="dialog"]')) return;
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [agent.id, onClose]);

  // Active runs categorized
  const activeCronRuns = useMemo(
    () => activeRuns.filter((r) => r.triggerType === 'cron'),
    [activeRuns]
  );

  const isAgentActive =
    agent.status === 'running' || running || isStreaming || activeRuns.length > 0;

  // ── Merged manifest: agent-added attachments + effective system prompt ──
  const refreshManifest = useCallback(() => {
    AgentService.fetchAgentManifest(agent.id).then(setManifest).catch(() => {});
  }, [agent.id]);

  const handleSaveMemoryFile = useCallback(async () => {
    if (!agent || !selectedMemoryFile) return;
    setIsSavingMemory(true);
    try {
      await AgentService.updateMemoryFile(agent.id, selectedMemoryFile, memoryModalContent);
      setIsEditingMemory(false);
      refreshManifest();
    } catch (e: any) {
      alert(e.message || 'Failed to save memory file');
    } finally {
      setIsSavingMemory(false);
    }
  }, [agent, selectedMemoryFile, memoryModalContent, refreshManifest]);

  const handleSaveRepoFile = useCallback(async () => {
    if (!agent || !selectedRepoFile) return;
    setIsSavingRepoFile(true);
    try {
      await AgentService.updateRepoMemoryFile(agent.id, selectedRepoFile, repoFileContent);
      setIsEditingRepoFile(false);
      refreshManifest();
    } catch (e: any) {
      alert(e.message || 'Failed to save repo memory file');
    } finally {
      setIsSavingRepoFile(false);
    }
  }, [agent, selectedRepoFile, repoFileContent, refreshManifest]);

  useEffect(() => {
    let mounted = true;
    AgentService.fetchAgentManifest(agent.id)
      .then((m) => {
        if (mounted) setManifest(m);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [agent.id, agent.mcps.length, agent.skills.length]);

  const displayMcps = manifest?.mcps ?? agent.mcps;
  const displaySkills = manifest?.skills ?? agent.skills;
  const displayPolicies: AgentPolicyEntry[] =
    manifest?.policies ?? parseFallbackPolicies(agent.policies);

  const unconfiguredMcps = useMemo(() => {
    return (displayMcps || []).filter((m) => {
      const raw = m as { isConfigured?: boolean; missingKeys?: string[] };
      return raw.isConfigured === false || (raw.missingKeys && raw.missingKeys.length > 0);
    });
  }, [displayMcps]);
  const hasUnconfiguredMcps = unconfiguredMcps.length > 0;

  // ── Polling: Keep active runs & agent status updated ──
  useEffect(() => {
    let mounted = true;
    const checkActive = async () => {
      try {
        const [runsList, currentAgent] = await Promise.all([
          AgentService.fetchActiveRuns(agent.id),
          AgentService.fetchAgent(agent.id),
        ]);
        if (!mounted) return;
        setActiveRuns(runsList);
        if (currentAgent && currentAgent.status !== 'running' && runsList.length === 0) {
          setRunning(false);
          if (!viewingHistoryRunId && !viewingCronRunId) {
            setIsStreaming(false);
          }
        }
      } catch {}
    };

    checkActive();
    const interval = setInterval(checkActive, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [agent.id, viewingHistoryRunId, viewingCronRunId]);

  // ── Load Conversation Session with Rich Parts & Live Reconnect ──
  const loadSession = useCallback(async (sessionId: string) => {
    try {
      setActiveSessionId(sessionId);
      setViewingCronRunId(null);
      setViewingHistoryRunId(null);
      setSelectedRunId(null);

      const [msgs, currentActiveRuns] = await Promise.all([
        AgentService.fetchSessionMessages(agent.id, sessionId),
        AgentService.fetchActiveRuns(agent.id).catch(() => [] as ActiveRunRecord[]),
      ]);
      setActiveRuns(currentActiveRuns);

      // Deduplicate consecutive identical user messages if any duplicate was recorded
      const sanitizedMsgs: typeof msgs = [];
      for (const m of msgs) {
        const last = sanitizedMsgs[sanitizedMsgs.length - 1];
        if (last && last.role === 'user' && m.role === 'user' && last.content === m.content) {
          continue;
        }
        sanitizedMsgs.push(m);
      }

      const chatMessages: ChatMessage[] = sanitizedMsgs.map((m) => {
        let parts: MessagePart[] = [];
        if (m.parts_json) {
          try {
            parts = JSON.parse(m.parts_json);
          } catch {
            parts = [{ type: 'markdown', content: m.content || '' }];
          }
        } else if (m.content) {
          parts = [{ type: 'markdown', content: m.content }];
        }

        const toolCalls: ToolCall[] = [];
        for (const p of parts) {
          if (p.type === 'tool' && (p as any).toolCall) {
            toolCalls.push((p as any).toolCall);
          }
        }

        return {
          id: m.id,
          conversationId: sessionId,
          role: m.role as 'user' | 'assistant' | 'system',
          status: 'complete',
          content: m.content,
          parts,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          createdAt: m.created_at,
        };
      });

      // Detect if there is a live active run currently executing for this session
      const matchingActiveRun = currentActiveRuns.find(
        (r) =>
          r.sessionId === sessionId ||
          (r.triggerType !== 'cron' && (!r.sessionId || r.sessionId === sessionId))
      );

      if (matchingActiveRun) {
        setActiveRunId(matchingActiveRun.runId);
        setIsStreaming(true);
        if (chatMessages.length > 0) {
          const last = chatMessages[chatMessages.length - 1];
          if (last.role === 'assistant') {
            last.status = 'streaming';
          }
        }
      } else {
        setActiveRunId(null);
        setIsStreaming(false);
      }

      setMessages(chatMessages);
    } catch (err) {
      console.error('Failed to load session messages:', err);
    }
  }, [agent.id]);

  // ── Load Run Details (for Cron Jobs or Past Archived Runs) ──
  const loadRun = useCallback(async (runId: string, isLiveCron = false) => {
    try {
      setSelectedRunId(runId);
      const details = await AgentService.fetchRunDetails(runId);
      const rawEvents = details.events || [];
      const converted: LiveLogEvent[] = rawEvents.map((e) => {
        let payload: Record<string, unknown> = {};
        try {
          payload = JSON.parse(e.payload_json);
        } catch {
          payload = {};
        }
        return {
          eventType: e.event_type,
          payload,
          timestamp: e.created_at || new Date().toISOString(),
        };
      });
      setPastRunEvents(converted);

      const convId = `run-${runId}`;
      const chatMessages: ChatMessage[] = [];

      // 1. User turn (task prompt or cron trigger)
      const promptText =
        details.task_prompt ||
        (details.trigger_type === 'cron' ? 'Scheduled cron trigger' : 'Execute agent task');
      chatMessages.push({
        id: `msg-user-${runId}`,
        conversationId: convId,
        role: 'user',
        status: 'complete',
        content: promptText,
        parts: [{ type: 'text', content: promptText }],
        createdAt: details.started_at || new Date().toISOString(),
      });

      // 2. Chronological parts (thoughts, tool calls, markdown deltas)
      const parts: MessagePart[] = [];
      const toolMap = new Map<string, ToolCall>();

      for (const evt of converted) {
        const p = evt.payload;
        if (evt.eventType === 'text.thought') {
          const delta = String(p.delta ?? '');
          if (delta) {
            const last = parts[parts.length - 1];
            if (last && last.type === 'thinking') {
              last.content += delta;
            } else {
              parts.push({ type: 'thinking', content: delta });
            }
          }
        } else if (evt.eventType === 'tool.started') {
          const toolId = String(p.toolCallId || `tc_${parts.length}`);
          const toolCall: ToolCall = {
            id: toolId,
            name: String(p.toolName || 'tool'),
            status: 'running',
            input: p.args ?? p.input,
            startedAt: evt.timestamp,
          };
          toolMap.set(toolId, toolCall);
          parts.push({ type: 'tool', toolCall });
        } else if (evt.eventType === 'tool.completed') {
          const toolId = String(p.toolCallId || '');
          let toolCall = toolMap.get(toolId);
          if (!toolCall) {
            toolCall = {
              id: toolId || `tc_${parts.length}`,
              name: String(p.toolName || 'tool'),
              status: 'success',
              input: p.args ?? p.input,
              output: p.result,
              completedAt: evt.timestamp,
            };
            toolMap.set(toolCall.id, toolCall);
            parts.push({ type: 'tool', toolCall });
          } else {
            toolCall.status = 'success';
            toolCall.output = p.result;
            toolCall.completedAt = evt.timestamp;
          }
        } else if (evt.eventType === 'tool.failed') {
          const toolId = String(p.toolCallId || '');
          let toolCall = toolMap.get(toolId);
          if (!toolCall) {
            toolCall = {
              id: toolId || `tc_${parts.length}`,
              name: String(p.toolName || 'tool'),
              status: 'error',
              input: p.args ?? p.input,
              error: {
                code: 'tool_failed',
                layer: 'tool',
                severity: 'error',
                message: String(p.error || 'Execution failed'),
                retryable: false,
              },
              completedAt: evt.timestamp,
            };
            toolMap.set(toolCall.id, toolCall);
            parts.push({ type: 'tool', toolCall });
          } else {
            toolCall.status = 'error';
            toolCall.error = {
              code: 'tool_failed',
              layer: 'tool',
              severity: 'error',
              message: String(p.error || 'Execution failed'),
              retryable: false,
            };
            toolCall.completedAt = evt.timestamp;
          }
        } else if (evt.eventType === 'text.delta') {
          const delta = String(p.delta ?? '');
          if (delta) {
            const last = parts[parts.length - 1];
            if (last && last.type === 'markdown') {
              last.content += delta;
            } else {
              parts.push({ type: 'markdown', content: delta });
            }
          }
        }
      }

      const streamedText = parts
        .filter((p) => p.type === 'markdown')
        .map((p) => (p as { type: 'markdown'; content: string }).content)
        .join('');

      const finalText =
        streamedText.trim() ||
        details.summary ||
        (details.error
          ? `**Execution Failed**: ${details.error}`
          : details.status === 'completed'
          ? 'Task completed successfully.'
          : '');

      if (finalText && !streamedText.includes(finalText)) {
        parts.push({ type: 'markdown', content: finalText });
      }

      const isStillRunning = details.status === 'running' || isLiveCron;

      chatMessages.push({
        id: `msg-assistant-${runId}`,
        conversationId: convId,
        role: 'assistant',
        status: isStillRunning ? 'streaming' : details.status === 'failed' ? 'error' : 'complete',
        content: finalText,
        parts,
        toolCalls: Array.from(toolMap.values()),
        createdAt: details.completed_at || details.started_at || new Date().toISOString(),
      });

      setMessages(chatMessages);

      if (isLiveCron || details.status === 'running') {
        setViewingCronRunId(runId);
        setViewingHistoryRunId(null);
        setIsStreaming(true);
      } else {
        setViewingCronRunId(null);
        setViewingHistoryRunId(runId);
        setIsStreaming(false);
      }
    } catch (err) {
      console.error('Failed to load run details:', err);
    }
  }, []);

  // ── Reactive WebSocket Listener: Live Streaming Reconnection & Reduction ──
  useEffect(() => {
    const unsubscribe = useSpaceStore.getState().addWsListener((data: any) => {
      if (!data || data.agentId !== agent.id) return;

      if (data.type === 'chat_stream_event') {
        const { sessionId, runId, triggerType } = data;
        const rawEvent = data.event || data.streamEvent;
        if (!rawEvent) return;

        const isCurrentSession =
          !viewingCronRunId &&
          !viewingHistoryRunId &&
          (sessionId === activeSessionId || (!sessionId && activeRunId === runId));
        const isCurrentCron = Boolean(viewingCronRunId && viewingCronRunId === runId);

        if (isCurrentSession || isCurrentCron) {
          if (rawEvent.type === 'message:start') {
            setIsStreaming(true);
          }

          setMessages((prev) => {
            const lastAsst = [...prev].reverse().find((m) => m.role === 'assistant');
            // If the message in state has a matching id, use it.
            // If not, map to the last assistant message id so applyChatEvent finds the target!
            const targetId =
              prev.some((m) => m.id === rawEvent.messageId)
                ? rawEvent.messageId
                : (lastAsst?.id || rawEvent.messageId || 'asst_fallback');

            const event = {
              ...rawEvent,
              messageId: targetId,
            };

            return applyChatEvent(prev, event, targetId);
          });

          if (
            rawEvent.type === 'message:complete' ||
            rawEvent.type === 'message:stop' ||
            rawEvent.type === 'error'
          ) {
            setIsStreaming(false);
            setActiveRunId(null);
            void AgentService.fetchActiveRuns(agent.id).then(setActiveRuns).catch(() => {});
            void AgentService.fetchAgentSessions(agent.id).then(setChatSessions).catch(() => {});
            void AgentService.fetchAgentRuns(agent.id).then(setRuns).catch(() => {});
          }
        } else if (triggerType === 'cron') {
          // Alert user that a background cron job has started
          void AgentService.fetchActiveRuns(agent.id).then(setActiveRuns).catch(() => {});
        }
      } else if (data.type === 'agent_manifest_updated' || data.type === 'agent_updated') {
        refreshManifest();
      } else if (data.type === 'run_completed' || data.type === 'run_failed') {
        void AgentService.fetchActiveRuns(agent.id).then(setActiveRuns).catch(() => {});
        void AgentService.fetchAgentRuns(agent.id).then(setRuns).catch(() => {});
        // The run may have added MCP servers, skills, or policies of its own —
        // pull the merged manifest so the agent box reflects them immediately.
        refreshManifest();
        if (activeRunId === data.runId || viewingCronRunId === data.runId || !activeRunId) {
          setIsStreaming(false);
          setActiveRunId(null);
        }
        setMessages((prev) => {
          const lastAsst = [...prev].reverse().find((m) => m.role === 'assistant');
          if (!lastAsst || lastAsst.status !== 'streaming') return prev;
          return prev.map((m) =>
            m.id === lastAsst.id
              ? {
                  ...m,
                  status: data.type === 'run_completed' ? 'complete' : 'error',
                  content: data.data?.summary || m.content,
                }
              : m
          );
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [agent.id, activeSessionId, viewingCronRunId, viewingHistoryRunId, activeRunId, refreshManifest]);

  // ── Initialize Agent Data & Default Session on Mount ──
  useEffect(() => {
    setPastRunEvents([]);
    setSelectedRunId(null);
    setViewingCronRunId(null);
    setViewingHistoryRunId(null);
    setRuns([]);
    setChatSessions([]);
    setRunning(false);

    const defaultSid = `session_${agent.id}_default`;
    setActiveSessionId(defaultSid);

    AgentService.fetchAgentRuns(agent.id)
      .then(setRuns)
      .catch((err) => console.error('Failed to load runs:', err));

    AgentService.fetchAgentSessions(agent.id)
      .then((loadedSessions) => {
        setChatSessions(loadedSessions);
        const targetSid = loadedSessions.length > 0 ? loadedSessions[0].id : defaultSid;
        void loadSession(targetSid);
      })
      .catch(() => {
        void loadSession(defaultSid);
      });
  }, [agent.id, loadSession]);

  // ── Send Message in Active Chat Session ──
  const handleSendMessage = useCallback(
    async (text: string, overrideSessionId?: string) => {
      if (!text.trim() || isStreaming) return;
      if (hasUnconfiguredMcps) {
        alert(
          `Cannot start run: The following attached MCP servers require credentials:\n• ${unconfiguredMcps
            .map((m) => `${m.label || m.mcp_name} (missing ${((m as { missingKeys?: string[] }).missingKeys || ['credentials']).join(', ')})`)
            .join('\n• ')}\n\nPlease configure credentials before starting a run.`
        );
        return;
      }
      const userText = text.trim();
      const currentSessionId = overrideSessionId || activeSessionId;

      const userMsgId = `user_${Date.now()}`;
      const assistantMsgId = `asst_${Date.now()}`;

      const userMsg: ChatMessage = {
        id: userMsgId,
        conversationId: currentSessionId,
        role: 'user',
        status: 'complete',
        content: userText,
        parts: [{ type: 'text', content: userText }],
        createdAt: new Date().toISOString(),
      };

      const placeholderAsst: ChatMessage = {
        id: assistantMsgId,
        conversationId: currentSessionId,
        role: 'assistant',
        status: 'streaming',
        content: '',
        parts: [],
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg, placeholderAsst]);
      setIsStreaming(true);

      if (useSynthetic) {
        try {
          const gen = syntheticTransport.send({ prompt: userText } as any);
          for await (const evt of gen) {
            setMessages((prev) => applyChatEvent(prev, evt as any, assistantMsgId));
          }
        } catch (err) {
          console.error('Synthetic stream failed:', err);
        } finally {
          setIsStreaming(false);
        }
        return;
      }

      try {
        const res = await AgentService.triggerRun(agent.id, userText, currentSessionId, {
          userMsgId,
          assistantMsgId,
        });
        if (res && res.run && res.run.id) {
          setActiveRunId(res.run.id);
        }
        AgentService.fetchAgentSessions(agent.id).then(setChatSessions).catch(() => {});
      } catch (err) {
        console.error('Failed to trigger run:', err);
        setIsStreaming(false);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  status: 'error',
                  content: err instanceof Error ? err.message : 'Execution failed to start',
                  parts: [
                    {
                      type: 'markdown',
                      content: `**Error:** ${
                        err instanceof Error ? err.message : 'Execution failed to start'
                      }`,
                    },
                  ],
                }
              : m
          )
        );
      }
    },
    [agent.id, activeSessionId, isStreaming, useSynthetic, syntheticTransport]
  );

  // ── Handle incoming voice command from Canvas Agent Popover ──
  useEffect(() => {
    if (!pendingVoicePrompt || pendingVoicePrompt.agentId !== agent.id) return;
    const promptText = pendingVoicePrompt.text?.trim();
    const autoSend = pendingVoicePrompt.autoSend ?? true;
    const forceNewChat = pendingVoicePrompt.forceNewChat ?? false;
    setPendingVoicePrompt(null);

    setActiveTab('chat');
    if (!promptText) return;

    if (forceNewChat) {
      void (async () => {
        try {
          const sessionName = promptText.length > 25 ? promptText.slice(0, 25) + '…' : promptText;
          const newSession = await AgentService.createAgentSession(agent.id, `Voice: ${sessionName}`);
          const sid = newSession.id;
          setChatSessions((prev) => [newSession, ...prev.filter((s) => s.id !== newSession.id)]);
          setActiveSessionId(sid);
          setViewingCronRunId(null);
          setViewingHistoryRunId(null);
          setSelectedRunId(null);
          setMessages([]);
          setIsStreaming(false);

          if (autoSend) {
            void handleSendMessage(promptText, sid);
          } else {
            setComposerText(promptText);
          }
        } catch (err) {
          console.error('Failed to create new chat session for voice prompt:', err);
          if (autoSend) {
            void handleSendMessage(promptText);
          } else {
            setComposerText(promptText);
          }
        }
      })();
    } else {
      if (autoSend) {
        void handleSendMessage(promptText);
      } else {
        setComposerText(promptText);
      }
    }
  }, [pendingVoicePrompt, agent.id, handleSendMessage, setPendingVoicePrompt]);

  // ── Stop Execution (Chat Run or Cron Run) ──
  const handleStopCurrent = useCallback(async () => {
    const targetRunId = viewingCronRunId || activeRunId;
    try {
      await AgentService.stopAgent(agent.id, targetRunId || undefined);
      setIsStreaming(false);
      setActiveRunId(null);
      if (onStopNow) {
        await onStopNow(agent.id);
      }
      const updated = await AgentService.fetchActiveRuns(agent.id).catch(() => []);
      setActiveRuns(updated);
    } catch (err) {
      console.error('Failed to stop run:', err);
    }
  }, [agent.id, viewingCronRunId, activeRunId, onStopNow]);

  const handleNewChat = useCallback(async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const newSession = await AgentService.createAgentSession(agent.id, 'New Discussion');
      const sid = newSession.id;
      setChatSessions((prev) => [newSession, ...prev.filter((s) => s.id !== newSession.id)]);
      setActiveSessionId(sid);
      setViewingCronRunId(null);
      setViewingHistoryRunId(null);
      setSelectedRunId(null);
      setMessages([]);
      setIsStreaming(false);
      setActiveTab('chat');
    } catch (err) {
      console.error('Failed to create new chat session:', err);
    }
  }, [agent.id]);

  const handleDeleteSession = useCallback(
    async (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation();
      if (!confirm('Are you sure you want to delete this conversation?')) return;
      try {
        await AgentService.deleteAgentSession(agent.id, sessionId);
        setChatSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (activeSessionId === sessionId) {
          const remaining = chatSessions.filter((s) => s.id !== sessionId);
          const nextId = remaining.length > 0 ? remaining[0].id : `session_${agent.id}_default`;
          void loadSession(nextId);
        }
      } catch (err) {
        console.error('Failed to delete session:', err);
      }
    },
    [agent.id, activeSessionId, chatSessions, loadSession]
  );

  const handleExecutePrompt = async () => {
    if (isAgentActive) return;
    setRunning(true);
    try {
      await onRunNow(agent.id, promptInput.trim() || undefined);
      setPromptInput('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error executing agent');
    } finally {
      setRunning(false);
    }
  };

  // Scroll terminal logs on update
  useEffect(() => {
    if (activeTab === 'terminal') {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveEvents, pastRunEvents, activeTab]);

  // Active events for terminal tab
  const activeEvents = liveEvents.length > 0 ? liveEvents : pastRunEvents;

  // ── Terminal Aggregator ──
  const terminalEntries = useMemo(() => {
    const entries: Array<{
      id: string;
      type: 'step' | 'thought' | 'output' | 'tool_start' | 'tool_success' | 'tool_fail' | 'event';
      title?: string;
      text: string;
    }> = [];

    for (let i = 0; i < activeEvents.length; i++) {
      const evt = activeEvents[i];
      const p = evt.payload;
      const eventType = evt.eventType;
      const last = entries[entries.length - 1];

      if (eventType === 'text.thought') {
        const delta = String(p.delta ?? '');
        if (last && last.type === 'thought') {
          last.text += delta;
        } else {
          entries.push({
            id: `thought_${i}`,
            type: 'thought',
            title: 'Thinking Process',
            text: delta,
          });
        }
      } else if (eventType === 'text.delta') {
        const delta = String(p.delta ?? '');
        if (last && last.type === 'output') {
          last.text += delta;
        } else {
          entries.push({
            id: `output_${i}`,
            type: 'output',
            title: 'Assistant Stream',
            text: delta,
          });
        }
      } else if (eventType === 'step.started') {
        entries.push({
          id: `step_${i}`,
          type: 'step',
          text: `Step ${p.step || 1} initialized`,
        });
      } else if (eventType === 'tool.started') {
        entries.push({
          id: `tool_s_${i}`,
          type: 'tool_start',
          title: String(p.toolName || 'tool'),
          text: JSON.stringify(p.args || p.input || {}),
        });
      } else if (eventType === 'tool.completed') {
        entries.push({
          id: `tool_c_${i}`,
          type: 'tool_success',
          title: String(p.toolName || 'tool'),
          text: typeof p.result === 'string' ? p.result : JSON.stringify(p.result || {}),
        });
      } else if (eventType === 'tool.failed') {
        entries.push({
          id: `tool_f_${i}`,
          type: 'tool_fail',
          title: String(p.toolName || 'tool'),
          text: String(p.error || 'Execution failed'),
        });
      } else {
        entries.push({
          id: `evt_${i}`,
          type: 'event',
          text: `[${eventType}] ${JSON.stringify(p)}`,
        });
      }
    }

    return entries;
  }, [activeEvents]);

  const chatSuggestions = useMemo(
    () => [
      'Find all deprecated express endpoints, update them, and run tests.',
      'Scrape web targets with attached MCP claws and summarize insights.',
      'Inspect codebase architecture and suggest optimizations.',
    ],
    []
  );

  const shortId = agent.id.includes('_') ? `#${agent.id.split('_').pop()}` : `#${agent.id}`;

  if (isMobile) {
    return (
      <AgentDrawerMobile
        agent={agent}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        messages={messages}
        isStreaming={isStreaming}
        running={running}
        composerText={composerText}
        setComposerText={setComposerText}
        onSendMessage={(text) => void handleSendMessage(text)}
        onRunNow={onRunNow}
        onStopNow={onStopNow}
        onClose={onClose}
        liveEvents={liveEvents}
        runs={runs}
        chatSessions={chatSessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onSelectRun={loadRun}
        filesCount={workspaceFilesCount}
      />
    );
  }

  return (
    <div
      ref={drawerRef}
      className={`slide-drawer ${isEntering ? 'drawer-entering' : ''} ${
        isResizing ? 'is-resizing' : ''
      }`}
      style={{ width: `${drawerWidth}px` }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Portalled Transparent Overlay during drag */}
      {isResizing &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999999,
              cursor: 'col-resize',
              userSelect: 'none',
              pointerEvents: 'all',
            }}
          />,
          document.body
        )}

      {/* Draggable Left Resize Handle */}
      <div
        className={`drawer-resize-handle ${isResizing ? 'resizing' : ''}`}
        onMouseDown={handleResizeStart}
        title="Drag left edge to resize drawer width"
      >
        <div className="drawer-resize-bar" />
      </div>

      {/* Header */}
      <div className="drawer-header">
        <div className="drawer-title-group">
          <img
            src="/smoke-monkey-mascot.png"
            alt="Mascot"
            style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'contain', flexShrink: 0 }}
          />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 3,
              minWidth: 0,
              flex: 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
              <span
                title={agent.name}
                style={{
                  fontWeight: 700,
                  fontSize: 14.5,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  minWidth: 0,
                  flex: 1,
                  color: 'hsl(var(--foreground))',
                  letterSpacing: '-0.01em',
                }}
              >
                {agent.name}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span
                className="agent-id-pill"
                title={`Agent ID: ${agent.id}`}
                style={{
                  fontSize: 9.5,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  padding: '1.5px 6px',
                  borderRadius: 4,
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'rgba(255, 255, 255, 0.75)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  letterSpacing: '0.02em',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.2,
                }}
              >
                {shortId}
              </span>
              <span className={`status-pill ${agent.status}`}>{agent.status}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            className="drawer-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              void handleNewChat(e);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Start fresh chat session"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 11px',
              borderRadius: 7,
              fontSize: 11.5,
              fontWeight: 600,
              background: 'rgba(255, 255, 255, 0.07)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              color: 'hsl(var(--foreground))',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <Plus size={13} />
            <span>New Chat</span>
          </button>
          {isAgentActive && (
            <button
              type="button"
              className="crab-btn-stop"
              style={{ padding: '5px 11px', fontSize: 11.5, borderRadius: 7, flexShrink: 0, whiteSpace: 'nowrap' }}
              onClick={(e) => {
                e.stopPropagation();
                void handleStopCurrent();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              title="Stop Agent Execution Immediately"
            >
              <Square size={11} fill="currentColor" />
              <span>Stop Agent</span>
            </button>
          )}
          <button
            type="button"
            className="modal-close-btn"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Close Drawer"
            style={{ flexShrink: 0 }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Sub-header Context Bar: Working Directory & RAM Envelope */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 16px',
          background: 'hsl(var(--muted) / 0.35)',
          borderBottom: '1px solid hsl(var(--border) / 0.5)',
          fontSize: '11px',
          color: 'hsl(var(--muted-foreground))',
          gap: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <Folder size={12} color="#60a5fa" style={{ flexShrink: 0 }} />
          <span
            style={{
              fontSize: '10.5px',
              fontFamily: 'ui-monospace, monospace',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
            title={`Working Directory: ${
              agent.working_dir ||
              `~/.smoke-agents/${agent.name.toLowerCase().replace(/[^a-z0-9_-]+/g, '-') || 'agent'}`
            }`}
          >
            {agent.working_dir ||
              `~/.smoke-agents/${
                agent.name.toLowerCase().replace(/[^a-z0-9_-]+/g, '-') || 'agent'
              }`}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            flexShrink: 0,
            fontWeight: 600,
            color: (agent.max_memory_mb || 1024) <= 512 ? '#10b981' : 'hsl(var(--foreground))',
          }}
        >
          {(agent.max_memory_mb || 1024) <= 512 ? (
            <Smartphone size={11} color="#10b981" />
          ) : (
            <HardDrive size={11} />
          )}
          <span style={{ fontSize: '11px' }}>{agent.max_memory_mb || 1024} MB RAM</span>
        </div>
      </div>

      {/* Tabs + engine toggle */}
      <div className="drawer-tabs">
        <button
          className={`drawer-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MessageSquare size={13} />
            <span>Agent Chat</span>
          </div>
        </button>
        <button
          className={`drawer-tab-btn ${activeTab === 'terminal' ? 'active' : ''}`}
          onClick={() => setActiveTab('terminal')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Terminal size={13} />
            <span>Raw Terminal</span>
          </div>
        </button>
        <button
          className={`drawer-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('history');
            AgentService.fetchAgentRuns(agent.id).then(setRuns).catch(() => {});
            AgentService.fetchAgentSessions(agent.id).then(setChatSessions).catch(() => {});
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <History size={13} />
            <span>
              History ({chatSessions.length + runs.filter((r) => r.trigger_type === 'cron').length})
            </span>
          </div>
        </button>
        <button
          className={`drawer-tab-btn ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('files');
            AgentService.fetchWorkspaceFiles(agent.id)
              .then((res) => setWorkspaceFilesCount(res.totalFiles))
              .catch(() => {});
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <FolderOpen size={13} />
            <span>Files ({workspaceFilesCount})</span>
          </div>
        </button>

        {activeTab === 'chat' && (
          <button
            type="button"
            onClick={() => setUseSynthetic((v) => !v)}
            style={{
              marginLeft: 'auto',
              alignSelf: 'center',
              fontSize: 10,
              padding: '3px 9px',
              borderRadius: 10,
              border: `1px solid ${
                useSynthetic ? 'rgba(251,191,36,0.35)' : 'rgba(16,185,129,0.35)'
              }`,
              background: useSynthetic ? 'rgba(251,191,36,0.08)' : 'rgba(16,185,129,0.08)',
              color: useSynthetic ? '#fbbf24' : '#10b981',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            title={
              useSynthetic
                ? 'Using offline demo — click to switch to live harness'
                : 'Using live NVIDIA harness — click for demo mode'
            }
          >
            {useSynthetic ? '⚡ Demo' : '🟢 Live'}
          </button>
        )}
      </div>

      {/* Drawer Content */}
      <div
        className={`drawer-content${activeTab !== 'chat' && activeTab !== 'files' ? ' scrollable' : ''}`}
        style={{
          padding: activeTab === 'chat' || activeTab === 'files' ? 0 : 16,
          gap: activeTab !== 'chat' && activeTab !== 'files' ? 12 : 0,
          height: activeTab === 'files' ? '100%' : undefined,
          display: activeTab === 'files' ? 'flex' : undefined,
          flexDirection: activeTab === 'files' ? 'column' : undefined,
          overflow: activeTab === 'files' ? 'hidden' : undefined,
        }}
      >
        {/* TAB 1: SMOKE MONKEY CHAT PANEL */}
        {activeTab === 'chat' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              width: '100%',
              position: 'relative',
            }}
          >
            {/* Banner: Viewing Live Scheduled Cron Run */}
            {viewingCronRunId && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 14px',
                  background: 'rgba(251, 191, 36, 0.12)',
                  borderBottom: '1px solid rgba(251, 191, 36, 0.25)',
                  fontSize: 12,
                  color: '#fef08a',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Clock size={13} color="#fbbf24" />
                  <span>
                    Live Stream: Scheduled Cron Job <strong>#{viewingCronRunId.slice(-6)}</strong>
                  </span>
                  {isStreaming && (
                    <span
                      style={{
                        fontSize: 10,
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: '#fbbf24',
                        color: '#000',
                        fontWeight: 700,
                      }}
                    >
                      STREAMING
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setViewingCronRunId(null);
                    setViewingHistoryRunId(null);
                    void loadSession(activeSessionId);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    background: 'rgba(251, 191, 36, 0.2)',
                    border: '1px solid rgba(251, 191, 36, 0.4)',
                    borderRadius: 4,
                    color: '#fff',
                    padding: '3px 8px',
                    fontSize: 11,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  ← Back to Chat
                </button>
              </div>
            )}

            {/* Banner: Viewing Archived Run */}
            {viewingHistoryRunId && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 14px',
                  background: 'rgba(139, 92, 246, 0.12)',
                  borderBottom: '1px solid rgba(139, 92, 246, 0.25)',
                  fontSize: 12,
                  color: '#c4b5fd',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <History size={13} color="#a78bfa" />
                  <span>
                    Viewing Archived Run <strong>#{viewingHistoryRunId.slice(-6)}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setViewingCronRunId(null);
                    setViewingHistoryRunId(null);
                    void loadSession(activeSessionId);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    background: 'rgba(139, 92, 246, 0.2)',
                    border: '1px solid rgba(139, 92, 246, 0.4)',
                    borderRadius: 4,
                    color: '#f8fafc',
                    padding: '3px 8px',
                    fontSize: 11,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  ← Back to Live Chat
                </button>
              </div>
            )}

            {/* Banner: Background Concurrent Cron Job Alert */}
            {!viewingCronRunId && !viewingHistoryRunId && activeCronRuns.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 14px',
                  background: 'rgba(251, 191, 36, 0.12)',
                  borderBottom: '1px solid rgba(251, 191, 36, 0.3)',
                  fontSize: 11.5,
                  color: '#fef08a',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: '#fbbf24',
                      boxShadow: '0 0 8px #fbbf24',
                    }}
                  />
                  <span>
                    Scheduled Cron Job <strong>#{activeCronRuns[0].runId.slice(-6)}</strong> is
                    running concurrently in background
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void loadRun(activeCronRuns[0].runId, true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    background: 'rgba(251, 191, 36, 0.22)',
                    border: '1px solid rgba(251, 191, 36, 0.45)',
                    borderRadius: 4,
                    color: '#fff',
                    padding: '3px 8px',
                    fontSize: 11,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Watch Live Stream →
                </button>
              </div>
            )}

            {/* Banner: Unconfigured MCP Warning */}
            {hasUnconfiguredMcps && (
              <div className="drawer-unconfigured-banner">
                <div className="unconfigured-banner-icon">
                  <AlertTriangle size={14} color="#f59e0b" />
                </div>
                <div className="unconfigured-banner-content">
                  <span className="unconfigured-banner-title">Credentials Required:</span>
                  <span className="unconfigured-banner-desc">
                    {unconfiguredMcps.map((m) => m.label || m.mcp_name).join(', ')} cannot run until configured.
                  </span>
                </div>
                <button
                  type="button"
                  className="unconfigured-banner-btn"
                  onClick={() =>
                    onConfigureMcp?.(
                      agent.id,
                      unconfiguredMcps[0]?.mcp_name || unconfiguredMcps[0]?.label,
                    )
                  }
                >
                  Configure
                </button>
              </div>
            )}

            {/* Reconnecting ChatPanel */}
            <div
              data-sm-chat=""
              className={`relative flex h-full w-full flex-col overflow-hidden bg-bg text-ink-primary ${
                toSmTheme(canvasTheme) !== 'dark' ? `smc-${toSmTheme(canvasTheme)}` : ''
              }`}
              style={{ flex: 1, minHeight: 0 }}
            >
              <ChatPanel
                messages={messages}
                isStreaming={isStreaming}
                onSend={handleSendMessage}
                onStop={isStreaming ? handleStopCurrent : undefined}
                placeholder={`Message ${agent.name}…`}
                hideComposer={Boolean(viewingHistoryRunId || viewingCronRunId)}
                columnMaxWidth="100%"
                autoScroll={true}
                composer={
                  <ChatComposer
                    value={composerText}
                    onChange={setComposerText}
                    onSubmit={(text) => {
                      void handleSendMessage(text);
                      setComposerText('');
                    }}
                    onStop={isStreaming ? handleStopCurrent : undefined}
                    isStreaming={isStreaming}
                    placeholder={`Message ${agent.name}… (or click 🎙️ to speak)`}
                    toolbar={
                      <ChatVoiceButton
                        currentValue={composerText}
                        onValueChange={setComposerText}
                        disabled={isStreaming}
                      />
                    }
                  />
                }
                empty={
                  <div className="agent-empty-hero">
                    <div className="hero-mascot-glow">
                      <img
                        src="/smoke-monkey-mascot.png"
                        alt="Smoke Monkey"
                        className="hero-mascot-img"
                      />
                    </div>
                    <h2 className="hero-agent-title">{agent.name}</h2>
                    <p className="hero-agent-desc">
                      {getPromptSummary(manifest?.system_prompt ?? agent.system_prompt)}
                    </p>

                    {(manifest?.system_prompt ?? agent.system_prompt) && (manifest?.system_prompt ?? agent.system_prompt).length > 60 && (
                      <div className="hero-directives-wrapper">
                        <button
                          type="button"
                          className="hero-directives-btn"
                          onClick={() => setShowFullPrompt((v) => !v)}
                        >
                          <FileText size={12} />
                          <span>{showFullPrompt ? 'Hide Directives' : 'View Full Directives'}</span>
                          <ChevronDown
                            size={12}
                            style={{
                              transform: showFullPrompt ? 'rotate(180deg)' : 'none',
                              transition: 'transform 0.15s ease',
                            }}
                          />
                        </button>
                        {showFullPrompt && (
                          <div className="hero-directives-scrollbox">
                            <pre className="hero-directives-code">{manifest?.system_prompt ?? agent.system_prompt}</pre>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="hero-suggestions-title">Try Asking</div>
                    <div className="hero-suggestions-list">
                      {chatSuggestions.map((sug, i) => (
                        <button
                          key={i}
                          type="button"
                          className="hero-suggestion-btn"
                          onClick={() => handleSendMessage(sug)}
                        >
                          <Sparkles size={13} color="#06b6d4" />
                          <span>{sug}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                }
              />
            </div>
          </div>
        )}

        {/* TAB 2: RAW SYSTEM TERMINAL */}
        {activeTab === 'terminal' && (
          <>
            <div className="drawer-prompt-box">
              <input
                className="form-input"
                style={{ flex: 1 }}
                placeholder="Optional manual prompt (defaults to agent directives)"
                value={promptInput}
                disabled={isAgentActive}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleExecutePrompt();
                }}
              />
              <ChatVoiceButton
                currentValue={promptInput}
                onValueChange={setPromptInput}
                disabled={isAgentActive}
              />
              {isAgentActive ? (
                <button
                  className="crab-btn-stop"
                  style={{ width: 'auto', padding: '0 16px', background: '#dc2626' }}
                  onClick={handleStopCurrent}
                >
                  <Square size={13} fill="currentColor" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  className="crab-btn-run"
                  style={{ width: 'auto', padding: '0 16px' }}
                  onClick={handleExecutePrompt}
                >
                  <Play size={13} fill="currentColor" />
                  <span>Run</span>
                </button>
              )}
            </div>

            <div className="log-terminal">
              {terminalEntries.length === 0 ? (
                <div
                  style={{
                    color: 'hsl(var(--muted-foreground))',
                    fontStyle: 'italic',
                    padding: 10,
                  }}
                >
                  Awaiting agent execution events… Click &quot;Run&quot; or send a prompt to stream
                  live output.
                </div>
              ) : (
                terminalEntries.map((item) => {
                  if (item.type === 'step') {
                    return (
                      <div
                        key={item.id}
                        className="log-entry"
                        style={{
                          color: '#a78bfa',
                          fontWeight: 700,
                          fontSize: 11,
                          marginTop: 8,
                          marginBottom: 4,
                          borderLeft: '2px solid #8b5cf6',
                          paddingLeft: 8,
                        }}
                      >
                        ▶ {item.text}
                      </div>
                    );
                  }
                  if (item.type === 'thought') {
                    return (
                      <div
                        key={item.id}
                        className="log-entry thought"
                        style={{
                          color: '#38bdf8',
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.5,
                          background: 'rgba(56, 189, 248, 0.04)',
                          borderLeft: '2px solid #0284c7',
                          padding: '6px 8px',
                          borderRadius: 4,
                          marginBottom: 6,
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 10.5,
                            color: '#0284c7',
                            marginBottom: 2,
                          }}
                        >
                          💭 THOUGHT PROCESS
                        </div>
                        {item.text}
                      </div>
                    );
                  }
                  if (item.type === 'output') {
                    return (
                      <div
                        key={item.id}
                        className="log-entry"
                        style={{
                          color: '#f8fafc',
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.5,
                          background: 'rgba(255, 255, 255, 0.03)',
                          borderLeft: '2px solid #10b981',
                          padding: '6px 8px',
                          borderRadius: 4,
                          marginBottom: 6,
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 10.5,
                            color: '#10b981',
                            marginBottom: 2,
                          }}
                        >
                          🤖 AGENT RESPONSE
                        </div>
                        {item.text}
                      </div>
                    );
                  }
                  if (item.type === 'tool_start') {
                    return (
                      <div
                        key={item.id}
                        className="log-entry tool"
                        style={{ color: '#fbbf24', padding: '2px 0' }}
                      >
                        ⚡ [Tool Invoked] {item.title} ({item.text.slice(0, 160)})
                      </div>
                    );
                  }
                  if (item.type === 'tool_success') {
                    return (
                      <div
                        key={item.id}
                        className="log-entry success"
                        style={{ color: '#34d399', padding: '2px 0' }}
                      >
                        ✓ [Tool Finished] {item.title}
                      </div>
                    );
                  }
                  if (item.type === 'tool_fail') {
                    return (
                      <div
                        key={item.id}
                        className="log-entry error"
                        style={{ color: '#f87171', padding: '2px 0' }}
                      >
                        ✗ [Tool Failed] {item.title}: {item.text}
                      </div>
                    );
                  }
                  return (
                    <div key={item.id} className="log-entry" style={{ color: '#94a3b8' }}>
                      {item.text}
                    </div>
                  );
                })
              )}
              <div ref={terminalEndRef} />
            </div>

            {/* Connected Components Card (merged, source-aware) */}
            <div className="drawer-summary-card">
              <div className="drawer-summary-title">Connected Components</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="drawer-summary-line">
                  <strong>Agent ID:</strong>{' '}
                  <span style={{ fontFamily: 'monospace', opacity: 0.85 }}>{agent.id}</span>
                </div>
                <div className="drawer-summary-line">
                  <strong>Model:</strong> {agent.model} ({agent.provider})
                </div>
                <div className="drawer-summary-line">
                  <strong>Cron Schedule:</strong>{' '}
                  {agent.cron_enabled && agent.cron_schedule ? agent.cron_schedule : 'Disabled'}
                </div>

                {(
                  [
                    {
                      title: 'MCP Servers',
                      empty: 'No MCP servers attached',
                      items: displayMcps.map((m) => ({
                        id: m.id,
                        name: m.label || m.mcp_name,
                        sub: m.mcp_name,
                        source: m.source,
                        hint: m.mcp_name,
                      })),
                    },
                    {
                      title: 'Skills',
                      empty: 'No skills attached',
                      items: displaySkills.map((s) => ({
                        id: s.id,
                        name: s.skill_name,
                        sub: s.description ?? undefined,
                        source: s.source,
                        hint: s.description ?? s.skill_name,
                      })),
                    },
                    {
                      title: 'Policies',
                      empty: 'No policies enforced',
                      items: displayPolicies.map((p, i) => ({
                        id: `pol_${i}`,
                        name: p.text,
                        source: p.source,
                        hint: p.text,
                      })),
                    },
                  ] as Array<{
                    title: string;
                    empty: string;
                    items: Array<{
                      id: string;
                      name: string;
                      sub?: string;
                      source?: AttachmentSource;
                      hint?: string;
                    }>;
                  }>
                ).map((group) => (
                  <div key={group.title}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                      <strong style={{ fontSize: 12 }}>{group.title}</strong>
                      <span style={{ fontSize: 11, opacity: 0.55 }}>({group.items.length})</span>
                    </div>
                    {group.items.length === 0 ? (
                      <div style={{ fontSize: 12, opacity: 0.5, paddingLeft: 2 }}>{group.empty}</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {group.items.map((it) => (
                          <div
                            key={it.id}
                            title={it.hint}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              justifyContent: 'space-between',
                              background: 'rgba(255, 255, 255, 0.03)',
                              border: '1px solid rgba(255, 255, 255, 0.07)',
                              borderRadius: 8,
                              padding: '5px 8px',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'baseline',
                                gap: 6,
                                minWidth: 0,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 12,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {it.name}
                              </span>
                              {it.sub && it.sub !== it.name && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    opacity: 0.5,
                                    fontFamily: 'monospace',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {it.sub}
                                </span>
                              )}
                            </div>
                            <SourceBadge source={it.source} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Effective system prompt preview — same builder as the runner */}
                <details
                  style={{
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 8,
                    padding: '6px 8px',
                    background: 'rgba(255, 255, 255, 0.02)',
                  }}
                >
                  <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                    Effective system prompt{' '}
                    {manifest
                      ? `(${manifest.effective_system_prompt.length} chars)`
                      : '(loading…)'}
                  </summary>
                  <div style={{ fontSize: 10.5, opacity: 0.6, margin: '6px 0' }}>
                    Exactly what the next run will send: base prompt + policies + disabled tools +
                    resource envelope + presets + workspace.{' '}
                    {manifest ? `Workspace: ${manifest.workspace}` : ''}
                  </div>
                  <pre
                    style={{
                      maxHeight: 260,
                      overflow: 'auto',
                      fontSize: 11,
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      opacity: 0.85,
                      fontFamily: 'monospace',
                      margin: 0,
                      background: 'rgba(0, 0, 0, 0.25)',
                      borderRadius: 6,
                      padding: '8px 10px',
                    }}
                  >
                    {manifest?.effective_system_prompt ?? 'Loading…'}
                  </pre>
                </details>
              </div>
            </div>

            {/* Self-Built Automations */}
            <div className="drawer-summary-card" style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div className="drawer-summary-title" style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                  <Zap size={14} color="#f59e0b" />
                  <span>Self-Built Automations</span>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 7px',
                    borderRadius: 12,
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#fbbf24',
                    fontWeight: 600,
                  }}
                >
                  {manifest?.automations?.length ?? 0} Scripts
                </span>
              </div>
              <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 8 }}>
                Reusable scripts built and registered by this agent during runs to prevent re-solving tasks from scratch.
              </div>
              {(!manifest?.automations || manifest.automations.length === 0) ? (
                <div style={{ fontSize: 11.5, opacity: 0.5, fontStyle: 'italic', padding: '6px 0' }}>
                  No self-built automations registered yet. Saved scripts appear here automatically.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {manifest.automations.map((auto, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.07)',
                        borderRadius: 8,
                        padding: '8px 10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Code2 size={13} color="#f59e0b" />
                          <strong style={{ fontSize: 12, fontFamily: 'monospace' }}>{auto.file}</strong>
                        </div>
                        {auto.cron && (
                          <span
                            style={{
                              fontSize: 10,
                              padding: '1px 5px',
                              borderRadius: 4,
                              background: 'rgba(56, 189, 248, 0.15)',
                              color: '#38bdf8',
                              fontFamily: 'monospace',
                            }}
                          >
                            ⏱ {auto.cron}
                          </span>
                        )}
                      </div>
                      {auto.purpose && (
                        <div style={{ fontSize: 11, opacity: 0.85 }}>{auto.purpose}</div>
                      )}
                      {auto.whenToUse && (
                        <div style={{ fontSize: 10.5, color: '#94a3b8' }}>
                          <span style={{ color: '#fbbf24' }}>When to use:</span> {auto.whenToUse}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Human Memory Matrix (10 Specialized Dimensions) */}
            <div className="drawer-summary-card" style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div className="drawer-summary-title" style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                  <Brain size={14} color="#a855f7" />
                  <span>Human Memory Matrix</span>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 7px',
                    borderRadius: 12,
                    background: 'rgba(168, 85, 247, 0.15)',
                    color: '#c084fc',
                    fontWeight: 600,
                  }}
                >
                  10 Dimensions
                </span>
              </div>
              <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 8 }}>
                Persistent cognitive memory: semantic knowledge, autobiographical episodes, prospective intentions, reflections, workflows, and identity.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {(manifest?.memory_files ?? []).map((mem) => {
                  const categoryColors: Record<string, { bg: string; text: string }> = {
                    Semantic: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa' },
                    Episodic: { bg: 'rgba(236, 72, 153, 0.15)', text: '#f472b6' },
                    Procedural: { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399' },
                    'Working Memory': { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24' },
                    Prospective: { bg: 'rgba(20, 184, 166, 0.15)', text: '#2dd4bf' },
                    Reflective: { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc' },
                    Associative: { bg: 'rgba(99, 102, 241, 0.15)', text: '#818cf8' },
                    Facts: { bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80' },
                    Preferences: { bg: 'rgba(249, 115, 22, 0.15)', text: '#fb923c' },
                    Identity: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171' },
                  };
                  const color = categoryColors[mem.category] || { bg: 'rgba(255,255,255,0.1)', text: '#fff' };

                  return (
                    <div
                      key={mem.file}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.07)',
                        borderRadius: 8,
                        padding: '6px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                        <span
                          style={{
                            fontSize: 10,
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: color.bg,
                            color: color.text,
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        >
                          {mem.category}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{ fontSize: 11.5, fontFamily: 'monospace', fontWeight: 600 }}>{mem.file}</span>
                          <span style={{ fontSize: 10, opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {mem.purpose}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <span style={{ fontSize: 10, opacity: 0.5 }}>
                          {mem.sizeBytes > 0 ? `${(mem.sizeBytes / 1024).toFixed(1)} KB` : 'empty'}
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            setSelectedMemoryFile(mem.file);
                            setIsEditingMemory(false);
                            try {
                              const res = await AgentService.fetchMemoryFile(agent.id, mem.file);
                              setMemoryModalContent(res.content);
                            } catch {
                              setMemoryModalContent(mem.snippet || '');
                            }
                          }}
                          style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: 4,
                            color: '#fff',
                            fontSize: 10.5,
                            padding: '2px 7px',
                            cursor: 'pointer',
                          }}
                        >
                          Inspect
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Shared Cross-Agent Repository Memory */}
            {manifest?.repository_memory && (
              <div className="drawer-summary-card" style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div className="drawer-summary-title" style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                    <GitBranch size={14} color="#10b981" />
                    <span>Shared Repository Memory</span>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      padding: '2px 7px',
                      borderRadius: 12,
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#34d399',
                      fontWeight: 600,
                    }}
                  >
                    {manifest.repository_memory.metadata?.repo_slug || 'Linked Git Repo'}
                  </span>
                </div>
                <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 8 }}>
                  Cross-agent knowledge base for this Git repository. All agents working here share architectural insights, feature descriptions, explore maps, and task history.
                </div>
                {manifest.repository_memory.metadata?.remote_url && (
                  <div style={{ fontSize: 10.5, opacity: 0.75, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ExternalLink size={11} />
                    <span style={{ fontFamily: 'monospace' }}>{manifest.repository_memory.metadata.remote_url}</span>
                    {manifest.repository_memory.metadata.branch && (
                      <span style={{ marginLeft: 6, opacity: 0.6 }}>({manifest.repository_memory.metadata.branch})</span>
                    )}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 8 }}>
                  {[
                    { key: 'insights', label: '🧠 insights.md', desc: 'Architecture & conventions' },
                    { key: 'features', label: '📋 features.md', desc: 'Feature catalog & specs' },
                    { key: 'explore', label: '🗺️ explore.md', desc: 'Codebase navigation' },
                    { key: 'history', label: '📜 history.md', desc: 'Cross-agent task log' },
                  ].map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => {
                        setSelectedRepoFile(f.key);
                        setIsEditingRepoFile(false);
                        const mem = manifest.repository_memory as any;
                        setRepoFileContent(mem?.[f.key] || '');
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 6,
                        padding: '6px 8px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#34d399' }}>{f.label}</span>
                      <span style={{ fontSize: 10, opacity: 0.55 }}>{f.desc}</span>
                    </button>
                  ))}
                </div>
                {manifest.repository_memory.metadata?.contributing_agents && manifest.repository_memory.metadata.contributing_agents.length > 0 && (
                  <div style={{ fontSize: 10.5, opacity: 0.65, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    Contributing Agents: {manifest.repository_memory.metadata.contributing_agents.map((a) => `${a.agent_name} (${a.task_count} runs)`).join(', ')}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* TAB 3: EXECUTION & CHAT HISTORY */}
        {activeTab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Filter Toggle Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px',
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: 12,
              }}
            >
              <button
                type="button"
                onClick={() => setHistoryFilter('all')}
                style={{
                  flex: 1,
                  padding: '5px 8px',
                  borderRadius: 6,
                  border: 'none',
                  background:
                    historyFilter === 'all' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                  color: historyFilter === 'all' ? '#fff' : 'rgba(255, 255, 255, 0.6)',
                  fontWeight: historyFilter === 'all' ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                All ({chatSessions.length + runs.filter((r) => r.trigger_type === 'cron').length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('sessions')}
                style={{
                  flex: 1,
                  padding: '5px 8px',
                  borderRadius: 6,
                  border: 'none',
                  background:
                    historyFilter === 'sessions' ? 'rgba(96, 165, 250, 0.18)' : 'transparent',
                  color: historyFilter === 'sessions' ? '#60a5fa' : 'rgba(255, 255, 255, 0.6)',
                  fontWeight: historyFilter === 'sessions' ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                💬 Chats ({chatSessions.length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('cron')}
                style={{
                  flex: 1,
                  padding: '5px 8px',
                  borderRadius: 6,
                  border: 'none',
                  background:
                    historyFilter === 'cron' ? 'rgba(251, 191, 36, 0.18)' : 'transparent',
                  color: historyFilter === 'cron' ? '#fbbf24' : 'rgba(255, 255, 255, 0.6)',
                  fontWeight: historyFilter === 'cron' ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                ⏰ Cron Jobs ({runs.filter((r) => r.trigger_type === 'cron').length})
              </button>
            </div>

            {/* SECTION 1: INTERACTIVE CHAT SESSIONS */}
            {(historyFilter === 'all' || historyFilter === 'sessions') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '2px 4px',
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#60a5fa',
                    }}
                  >
                    💬 Agent Chat Sessions ({chatSessions.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleNewChat}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#60a5fa',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '2px 4px',
                    }}
                  >
                    + Start New
                  </button>
                </div>

                {chatSessions.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      color: 'hsl(var(--muted-foreground))',
                      padding: '16px 12px',
                      fontSize: 12,
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: 8,
                    }}
                  >
                    No interactive conversations recorded yet. Send a message in Agent Chat to
                    start.
                  </div>
                ) : (
                  chatSessions.map((session) => {
                    const isCurrent =
                      activeSessionId === session.id &&
                      !viewingCronRunId &&
                      !viewingHistoryRunId;
                    return (
                      <div
                        key={session.id}
                        className="drawer-history-card"
                        style={{
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          border: isCurrent ? '1px solid #3b82f6' : undefined,
                          background: isCurrent ? 'rgba(59, 130, 246, 0.08)' : undefined,
                        }}
                        onClick={() => {
                          void loadSession(session.id);
                          setActiveTab('chat');
                        }}
                        title="Resume this conversation thread"
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 5,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              minWidth: 0,
                            }}
                          >
                            <MessageSquare
                              size={13}
                              color="#60a5fa"
                              style={{ flexShrink: 0 }}
                            />
                            <span
                              style={{
                                fontWeight: 600,
                                fontSize: 13,
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {session.title || 'Discussion'}
                            </span>
                            {isCurrent && (
                              <span
                                style={{
                                  fontSize: 9.5,
                                  padding: '1px 5px',
                                  borderRadius: 4,
                                  background: '#3b82f6',
                                  color: '#fff',
                                  fontWeight: 600,
                                }}
                              >
                                Active
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              flexShrink: 0,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 11,
                                color: 'hsl(var(--muted-foreground))',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3,
                              }}
                            >
                              <Clock size={11} />
                              {new Date(session.updated_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteSession(e, session.id)}
                              title="Delete conversation"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'hsl(var(--muted-foreground))',
                                cursor: 'pointer',
                                padding: 2,
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {session.last_message && (
                          <div
                            style={{
                              fontSize: 11.5,
                              color: 'hsl(var(--muted-foreground))',
                              lineHeight: 1.35,
                              textOverflow: 'ellipsis',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              marginBottom: 6,
                            }}
                          >
                            {session.last_message}
                          </div>
                        )}

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: 11,
                            color: '#60a5fa',
                            fontWeight: 600,
                          }}
                        >
                          <span>
                            {session.message_count
                              ? `${session.message_count} messages`
                              : 'Multi-turn chat'}
                          </span>
                          <span>Resume Conversation →</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* SECTION 2: SCHEDULED CRON JOB RUNS */}
            {(historyFilter === 'all' || historyFilter === 'cron') && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  marginTop: historyFilter === 'all' ? 10 : 0,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '2px 4px',
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#fbbf24',
                    }}
                  >
                    ⏰ Scheduled Cron Runs (
                    {runs.filter((r) => r.trigger_type === 'cron').length})
                  </span>
                </div>

                {runs.filter((r) => r.trigger_type === 'cron').length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      color: 'hsl(var(--muted-foreground))',
                      padding: '16px 12px',
                      fontSize: 12,
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: 8,
                    }}
                  >
                    No scheduled cron executions recorded yet.
                  </div>
                ) : (
                  runs
                    .filter((r) => r.trigger_type === 'cron')
                    .map((r) => {
                      const isRunActive = activeRuns.some((ar) => ar.runId === r.id);
                      return (
                        <div
                          key={r.id}
                          className="drawer-history-card"
                          style={{
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            border:
                              selectedRunId === r.id || viewingCronRunId === r.id
                                ? '1px solid #fbbf24'
                                : undefined,
                            background:
                              selectedRunId === r.id || viewingCronRunId === r.id
                                ? 'rgba(251, 191, 36, 0.08)'
                                : undefined,
                          }}
                          onClick={async () => {
                            await loadRun(r.id, isRunActive);
                            setActiveTab('chat');
                          }}
                          title="Click to view scheduled task log and tool executions"
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: 6,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  background: 'rgba(251, 191, 36, 0.18)',
                                  color: '#fbbf24',
                                  border: '1px solid rgba(251, 191, 36, 0.35)',
                                }}
                              >
                                Cron Job
                              </span>
                              {isRunActive ? (
                                <span
                                  style={{
                                    fontSize: 9.5,
                                    padding: '1px 5px',
                                    borderRadius: 4,
                                    background: '#fbbf24',
                                    color: '#000',
                                    fontWeight: 700,
                                  }}
                                >
                                  RUNNING NOW
                                </span>
                              ) : r.status === 'completed' ? (
                                <CheckCircle2 size={13} color="#059669" />
                              ) : (
                                <AlertCircle size={13} color="#dc2626" />
                              )}
                              <span style={{ fontWeight: 600, fontSize: 12.5 }}>
                                {isRunActive
                                  ? 'Executing live...'
                                  : r.status === 'completed'
                                  ? 'Executed Successfully'
                                  : 'Execution Failed'}
                              </span>
                            </div>
                            <span
                              style={{
                                fontSize: 11,
                                color: 'hsl(var(--muted-foreground))',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Clock size={11} />
                              {new Date(r.started_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: 'hsl(var(--card-foreground))',
                              lineHeight: 1.4,
                            }}
                          >
                            {r.summary || r.error || (isRunActive ? 'Executing tools and steps in background...' : 'Scheduled execution finished')}
                          </div>
                          <div
                            style={{
                              marginTop: 6,
                              fontSize: 11,
                              color: '#fbbf24',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <span>
                              {isRunActive ? 'Watch Live Stream →' : 'View Run & Tool Logs →'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: WORKSPACE FILES EXPLORER & VIEWER */}
        {activeTab === 'files' && (
          <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
            <AgentFileExplorer agent={agent} onFilesCountChange={setWorkspaceFilesCount} />
          </div>
        )}

        {/* Memory File Modal */}
        {selectedMemoryFile && createPortal(
          <div className="modal-overlay" onClick={() => setSelectedMemoryFile(null)}>
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: 780,
                width: '92vw',
                maxHeight: '85vh',
                background: '#13141f',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 12,
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(99, 102, 241, 0.2)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                className="modal-header"
                style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: 'rgba(99, 102, 241, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Brain size={18} color="#818cf8" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="modal-title" style={{ fontSize: 14, fontWeight: 700, color: '#f3f4f6', fontFamily: 'monospace' }}>
                        {selectedMemoryFile}
                      </span>
                      <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 10, background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', fontWeight: 600 }}>
                        Cognitive Dimension
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)', marginTop: 2 }}>
                      {manifest?.memory_files?.find((m) => m.file === selectedMemoryFile)?.purpose || 'Agent persistent memory'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsEditingMemory(!isEditingMemory)}
                    style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px' }}
                  >
                    {isEditingMemory ? <FileText size={13} /> : <Edit3 size={13} />}
                    <span>{isEditingMemory ? 'Preview' : 'Edit'}</span>
                  </button>
                  {isEditingMemory && (
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={isSavingMemory}
                      onClick={handleSaveMemoryFile}
                      style={{
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '5px 12px',
                        background: '#4f46e5',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      <Save size={13} />
                      <span>{isSavingMemory ? 'Saving...' : 'Save'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="modal-close-btn"
                    onClick={() => setSelectedMemoryFile(null)}
                    style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.6)', cursor: 'pointer', padding: 4 }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="modal-body" style={{ flex: 1, minHeight: 320, maxHeight: '65vh', overflowY: 'auto', padding: 16 }}>
                {isEditingMemory ? (
                  <textarea
                    value={memoryModalContent}
                    onChange={(e) => setMemoryModalContent(e.target.value)}
                    style={{
                      width: '100%',
                      height: '100%',
                      minHeight: 360,
                      background: '#0d0e15',
                      color: '#e2e8f0',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 8,
                      padding: '12px 14px',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: 12.5,
                      lineHeight: 1.5,
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                    placeholder="Write memory markdown notes..."
                  />
                ) : (
                  <pre
                    style={{
                      margin: 0,
                      padding: 14,
                      background: '#0d0e15',
                      borderRadius: 8,
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      color: '#e2e8f0',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: 12,
                      lineHeight: 1.55,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      maxHeight: '100%',
                      overflowY: 'auto',
                    }}
                  >
                    {memoryModalContent || '/* Empty memory file. Click Edit to add context or guidance. */'}
                  </pre>
                )}
              </div>
              <div
                style={{
                  padding: '10px 18px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 11,
                  color: 'rgba(255, 255, 255, 0.45)',
                }}
              >
                <span>Stored in: <code style={{ color: '#a5b4fc' }}>.smoke-agent/memory/{selectedMemoryFile}</code></span>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedMemoryFile(null)}
                  style={{ fontSize: 11, padding: '3px 10px' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Shared Repository Memory Modal */}
        {selectedRepoFile && createPortal(
          <div className="modal-overlay" onClick={() => setSelectedRepoFile(null)}>
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: 780,
                width: '92vw',
                maxHeight: '85vh',
                background: '#13141f',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 12,
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(16, 185, 129, 0.2)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                className="modal-header"
                style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: 'rgba(16, 185, 129, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <GitBranch size={18} color="#10b981" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="modal-title" style={{ fontSize: 14, fontWeight: 700, color: '#f3f4f6', fontFamily: 'monospace' }}>
                        {selectedRepoFile}.md
                      </span>
                      <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 10, background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontWeight: 600 }}>
                        {manifest?.repository_memory?.metadata?.repo_slug || 'Shared Repo Memory'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)', marginTop: 2 }}>
                      {selectedRepoFile === 'insights'
                        ? 'Architectural conventions, design decisions, and pitfalls'
                        : selectedRepoFile === 'features'
                        ? 'Feature catalog, business logic specs, and status'
                        : selectedRepoFile === 'explore'
                        ? 'Codebase navigation paths, entrypoints, and mental models'
                        : 'Cross-agent chronological task log and history'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsEditingRepoFile(!isEditingRepoFile)}
                    style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px' }}
                  >
                    {isEditingRepoFile ? <FileText size={13} /> : <Edit3 size={13} />}
                    <span>{isEditingRepoFile ? 'Preview' : 'Edit'}</span>
                  </button>
                  {isEditingRepoFile && (
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={isSavingRepoFile}
                      onClick={handleSaveRepoFile}
                      style={{
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '5px 12px',
                        background: '#059669',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      <Save size={13} />
                      <span>{isSavingRepoFile ? 'Saving...' : 'Save'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="modal-close-btn"
                    onClick={() => setSelectedRepoFile(null)}
                    style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.6)', cursor: 'pointer', padding: 4 }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="modal-body" style={{ flex: 1, minHeight: 320, maxHeight: '65vh', overflowY: 'auto', padding: 16 }}>
                {isEditingRepoFile ? (
                  <textarea
                    value={repoFileContent}
                    onChange={(e) => setRepoFileContent(e.target.value)}
                    style={{
                      width: '100%',
                      height: '100%',
                      minHeight: 360,
                      background: '#0d0e15',
                      color: '#e2e8f0',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 8,
                      padding: '12px 14px',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: 12.5,
                      lineHeight: 1.5,
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                    placeholder="Write repository memory markdown..."
                  />
                ) : (
                  <pre
                    style={{
                      margin: 0,
                      padding: 14,
                      background: '#0d0e15',
                      borderRadius: 8,
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      color: '#e2e8f0',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: 12,
                      lineHeight: 1.55,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      maxHeight: '100%',
                      overflowY: 'auto',
                    }}
                  >
                    {repoFileContent || '/* Empty repository memory file. Click Edit to add context or guidance. */'}
                  </pre>
                )}
              </div>
              <div
                style={{
                  padding: '10px 18px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 11,
                  color: 'rgba(255, 255, 255, 0.45)',
                }}
              >
                <span>Shared across all agents working on this Git repository</span>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedRepoFile(null)}
                  style={{ fontSize: 11, padding: '3px 10px' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
});
