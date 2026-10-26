import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getBrandIcon } from '../common/brand-icons.js';
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
  Folder,
  FolderOpen,
  HardDrive,
  Smartphone,
  Trash2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  Brain,
  GitBranch,
  Zap,
  Code2,
  Edit3,
  Save,
  ExternalLink,
  ArrowLeft,
  MessageSquarePlus,
  Radio,
  FlaskConical,
  Plus,
  Pause,
  RotateCw,
} from 'lucide-react';
import { AnalogClockFace } from './agent.clock.js';
import type {
  SpaceAgentEntity,
  RunRecord,
  RunEventRecord,
  ChatSessionRecord,
  ActiveRunRecord,
  AttachmentSource,
  AgentManifestInfo,
  AgentPolicyEntry,
  AgentCronJobRecord,
} from './agent.types.js';
import { AgentService } from './agent.service.js';
import { McpService } from '../mcp/mcp.service.js';
import type { McpReadiness } from '../mcp/mcp.types.js';
import { ChatPanel, ChatComposer, applyChatEvent, SyntheticTransport } from '@smoke-monkey/ui';
import '@smoke-monkey/ui/ui.css';
import type { ChatMessage, MessagePart, ToolCall, AgentTodo, ContextState } from '@smoke-monkey/ui';
import { useSpaceStore } from '../space/space.store.js';
import { ChatVoiceButton } from '../voice/chat-voice-button.js';
import { useIsMobile } from '../common/use-mobile.js';
import { AgentDrawerMobile } from './mobile/agent-drawer.mobile.js';
import { AgentFileExplorer } from './agent.file-explorer.js';
import { AgentAvatar, AvatarPickerModal } from './agent-avatar.js';
import ReactMarkdown from 'react-markdown';

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

function formatFriendlyCronSchedule(schedule: string, nextRunAt?: string | null): string {
  const isOnce = schedule === 'once' || schedule.startsWith('once');
  if (isOnce) {
    if (nextRunAt) {
      const d = new Date(nextRunAt);
      return `One-time (at ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })})`;
    }
    return 'One-time deferred task';
  }

  const parts = schedule.trim().split(/\s+/);
  if (parts.length >= 5) {
    const minPart = parts[0];
    const hrPart = parts[1];
    const dow = parts[4];

    const toTimeStr = (hStr: string, mStr: string) => {
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10) || 0;
      const ampm = h >= 12 ? 'PM' : 'AM';
      let h12 = h % 12;
      if (h12 === 0) h12 = 12;
      return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
    };

    if (hrPart.includes(',')) {
      const hours = hrPart.split(',');
      const times = hours.map((h) => toTimeStr(h, minPart));
      if (times.length === 2) {
        return `Twice Daily (${times[0]} & ${times[1]})`;
      }
      return `Multiple Daily (${times.join(', ')})`;
    }

    if (!isNaN(parseInt(hrPart, 10)) && !isNaN(parseInt(minPart, 10))) {
      const timeStr = toTimeStr(hrPart, minPart);
      if (dow === '1-5') return `Weekdays (${timeStr})`;
      if (dow === '6,0' || dow === '0,6') return `Weekends (${timeStr})`;
      return `Daily (${timeStr})`;
    }

    if (hrPart === '*' && !isNaN(parseInt(minPart, 10))) {
      return `Hourly at :${minPart.padStart(2, '0')}`;
    }
  }

  return schedule;
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

  const [activeTab, setActiveTab] = useState<'chat' | 'terminal' | 'history' | 'files' | 'cron'>('chat');
  const [workspaceFilesCount, setWorkspaceFilesCount] = useState<number>(0);
  const [cronJobs, setCronJobs] = useState<AgentCronJobRecord[]>([]);
  const [loadingCronJobs, setLoadingCronJobs] = useState(false);
  const [isAddingJob, setIsAddingJob] = useState(false);
  const [newJobName, setNewJobName] = useState('');
  const [newJobPrompt, setNewJobPrompt] = useState('');
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [cronActionError, setCronActionError] = useState<string | null>(null);
  const [mcpStatus, setMcpStatus] = useState<Record<string, McpReadiness>>({});

  useEffect(() => {
    let cancelled = false;
    McpService.fetchStatus()
      .then((status) => {
        if (!cancelled && status) setMcpStatus(status);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const unconfiguredAgentMcps = useMemo(() => {
    if (!agent?.mcps || agent.mcps.length === 0) return [];
    return agent.mcps.filter((m) => {
      if (!m.enabled) return false;
      const readiness = mcpStatus[m.mcp_name];
      return readiness && !readiness.configured;
    });
  }, [agent?.mcps, mcpStatus]);


  // Interactive Clock & Schedule Builder State (matching agent.modal.tsx)
  const [clockHour12, setClockHour12] = useState<number>(12);
  const [clockMinute, setClockMinute] = useState<number>(30);
  const [clockAmPm, setClockAmPm] = useState<'AM' | 'PM'>('PM');
  const [clockRepeat, setClockRepeat] = useState<'everyday' | 'weekdays' | 'weekends' | 'once'>('everyday');
  const [showRawCron, setShowRawCron] = useState(false);
  const [rawCronValue, setRawCronValue] = useState('30 12 * * *');
  const [timePickerInputValue, setTimePickerInputValue] = useState('12:30');

  useEffect(() => {
    let hour24 = clockHour12;
    if (clockAmPm === 'PM' && hour24 < 12) hour24 += 12;
    if (clockAmPm === 'AM' && hour24 === 12) hour24 = 0;

    let dayPart = '* * *';
    if (clockRepeat === 'weekdays') dayPart = '* * 1-5';
    else if (clockRepeat === 'weekends') dayPart = '* * 6,0';

    if (clockRepeat === 'once') {
      setRawCronValue('once');
    } else {
      setRawCronValue(`${clockMinute} ${hour24} ${dayPart}`);
    }

    const h24Str = String(hour24).padStart(2, '0');
    const mStr = String(clockMinute).padStart(2, '0');
    setTimePickerInputValue(`${h24Str}:${mStr}`);
  }, [clockHour12, clockMinute, clockAmPm, clockRepeat]);

  const clockSummaryText = useMemo(() => {
    const mStr = String(clockMinute).padStart(2, '0');
    const timeLabel = `${clockHour12}:${mStr} ${clockAmPm}`;
    if (clockRepeat === 'once') return `Runs Once at ${timeLabel}`;
    if (clockRepeat === 'weekdays') return `Runs Weekdays at ${timeLabel}`;
    if (clockRepeat === 'weekends') return `Runs Weekends at ${timeLabel}`;
    return `Runs Daily at ${timeLabel}`;
  }, [clockHour12, clockMinute, clockAmPm, clockRepeat]);

  const handleTimeInputPicker = (val: string) => {
    if (!val) return;
    setTimePickerInputValue(val);
    const [hStr, mStr] = val.split(':');
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10) || 0;
    const ampm: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    setClockHour12(h);
    setClockMinute(m);
    setClockAmPm(ampm);
  };

  const loadCronJobs = useCallback(async () => {
    if (!agent?.id) return;
    try {
      setLoadingCronJobs(true);
      const jobs = await AgentService.fetchCronJobs(agent.id);
      setCronJobs(jobs);
    } catch (err) {
      console.error('Failed to load cron jobs:', err);
    } finally {
      setLoadingCronJobs(false);
    }
  }, [agent?.id]);

  useEffect(() => {
    loadCronJobs();
  }, [loadCronJobs]);

  const handleToggleJob = async (job: AgentCronJobRecord) => {
    if (!agent?.id) return;
    const newEnabled = job.enabled === 1 ? false : true;
    try {
      setCronActionError(null);
      await AgentService.updateCronJob(agent.id, job.id, { enabled: newEnabled });
      await loadCronJobs();
    } catch (err: any) {
      console.error('Failed to toggle cron job:', err);
      setCronActionError(err?.message || 'Failed to toggle task');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!agent?.id) return;
    try {
      setCronActionError(null);
      await AgentService.deleteCronJob(agent.id, jobId);
      setDeletingJobId(null);
      await loadCronJobs();
    } catch (err: any) {
      console.error('Failed to delete cron job:', err);
      setCronActionError(err?.message || 'Failed to delete task');
    }
  };

  const handleRunJobNow = async (job: AgentCronJobRecord) => {
    if (!agent?.id) return;
    try {
      setCronActionError(null);
      setRunningJobId(job.id);
      await AgentService.runCronJobNow(agent.id, job.id);
      await loadCronJobs();
      AgentService.fetchAgentRuns(agent.id).then(setRuns).catch(() => {});
    } catch (err: any) {
      console.error('Failed to run cron job now:', err);
      setCronActionError(err?.message || 'Failed to trigger task execution');
    } finally {
      setRunningJobId(null);
    }
  };

  const handleStartEditJob = (job: AgentCronJobRecord) => {
    setEditingJobId(job.id);
    setIsAddingJob(true);
    setNewJobName(job.name);
    setNewJobPrompt(job.prompt);
    setCronActionError(null);

    if (job.cron_schedule === 'once' || job.cron_schedule.startsWith('once')) {
      setClockRepeat('once');
      if (job.next_run_at) {
        const d = new Date(job.next_run_at);
        let h = d.getHours();
        const m = d.getMinutes();
        const ampm: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
        if (h === 0) h = 12;
        else if (h > 12) h -= 12;
        setClockHour12(h);
        setClockMinute(m);
        setClockAmPm(ampm);
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        setTimePickerInputValue(`${hh}:${mm}`);
      }
    } else {
      setRawCronValue(job.cron_schedule);
      const parts = job.cron_schedule.split(' ');
      if (parts.length >= 5) {
        const minStr = parts[0];
        const hrStr = parts[1];
        const dowStr = parts[4];
        if (dowStr === '1-5') setClockRepeat('weekdays');
        else if (dowStr === '0,6' || dowStr === '6,0' || dowStr === '6-0') setClockRepeat('weekends');
        else setClockRepeat('everyday');

        const parsedMin = parseInt(minStr, 10);
        if (!isNaN(parsedMin)) setClockMinute(parsedMin);

        const firstHr = parseInt(hrStr.split(',')[0], 10);
        if (!isNaN(firstHr)) {
          let h12 = firstHr;
          const ampm: 'AM' | 'PM' = h12 >= 12 ? 'PM' : 'AM';
          if (h12 === 0) h12 = 12;
          else if (h12 > 12) h12 -= 12;
          setClockHour12(h12);
          setClockAmPm(ampm);
          setTimePickerInputValue(`${String(firstHr).padStart(2, '0')}:${String(parsedMin || 0).padStart(2, '0')}`);
        }
      }
    }
  };

  const handleCancelForm = () => {
    setIsAddingJob(false);
    setEditingJobId(null);
    setNewJobName('');
    setNewJobPrompt('');
    setCronActionError(null);
  };

  const handleSaveJob = async () => {
    if (!agent?.id || !newJobName.trim() || !newJobPrompt.trim()) return;

    let cronSchedule = rawCronValue.trim();
    let scheduledAt: string | undefined = undefined;

    if (clockRepeat === 'once') {
      cronSchedule = 'once';
      let h24 = clockHour12;
      if (clockAmPm === 'PM' && h24 < 12) h24 += 12;
      if (clockAmPm === 'AM' && h24 === 12) h24 = 0;
      const now = new Date();
      const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h24, clockMinute, 0);
      if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
      }
      scheduledAt = target.toISOString();
    }

    try {
      setCronActionError(null);
      if (editingJobId) {
        await AgentService.updateCronJob(agent.id, editingJobId, {
          name: newJobName.trim(),
          prompt: newJobPrompt.trim(),
          cron_schedule: cronSchedule,
          scheduled_at: scheduledAt,
        });
      } else {
        await AgentService.createCronJob(agent.id, {
          name: newJobName.trim(),
          prompt: newJobPrompt.trim(),
          cron_schedule: cronSchedule,
          scheduled_at: scheduledAt,
          enabled: true,
        });
      }
      handleCancelForm();
      await loadCronJobs();
    } catch (err: any) {
      setCronActionError(err?.message || (editingJobId ? 'Failed to update task' : 'Failed to schedule task'));
    }
  };

  useEffect(() => {
    AgentService.fetchWorkspaceFiles(agent.id)
      .then((res) => setWorkspaceFilesCount(res.totalFiles))
      .catch(() => {});
  }, [agent.id]);

  const [promptInput, setPromptInput] = useState('');
  const [composerText, setComposerText] = useState('');
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
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
  const terminalContainerRef = useRef<HTMLDivElement>(null);

  // ── Caller Navigation Stack for Delegated Tasks ──
  const drawerCallerStack = useSpaceStore((s) => s.drawerCallerStack);
  const handleGoBackToCaller = useCallback(() => {
    const caller = useSpaceStore.getState().popDrawerCaller();
    if (caller) {
      useSpaceStore.getState().setActiveDrawerAgentId(caller.id);
    }
  }, []);

  // ── First-Class Reconnecting Multi-Turn Chat & Concurrency State ──
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [todos, setTodos] = useState<AgentTodo[]>([]);
  const [contexts, setContexts] = useState<ContextState | null>(null);
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
      setTodos([]);
      setContexts(null);

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
      setTodos([]);
      setContexts(null);

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
        // Run-level status rail state recorded by harness todo_write/context_manage
        if (evt.eventType === 'todo.updated') {
          if (Array.isArray(p.todos)) setTodos(p.todos as AgentTodo[]);
        } else if (evt.eventType === 'context.updated') {
          setContexts({
            active: Array.isArray(p.active) ? p.active : [],
            count: Number(p.count ?? 0),
            maxActive: Number(p.maxActive ?? 0),
          });
        } else if (evt.eventType === 'text.thought') {
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

          // Run-level status rail updates (task list + sub-contexts) — these
          // don't touch the transcript, they live pinned above it.
          if (rawEvent.type === 'todos:updated') {
            setTodos(Array.isArray(rawEvent.todos) ? (rawEvent.todos as AgentTodo[]) : []);
          } else if (rawEvent.type === 'context:updated') {
            setContexts({
              active: Array.isArray(rawEvent.active) ? rawEvent.active : [],
              count: Number(rawEvent.count ?? 0),
              maxActive: Number(rawEvent.maxActive ?? 0),
            });
          }

          setMessages((prev) => {
            if (String(rawEvent.type ?? '').startsWith('prompt:') && !rawEvent.prompt) {
              return prev;
            }

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
      } else if (
        data.type === 'agent_manifest_updated' ||
        data.type === 'agent_updated' ||
        data.type === 'agent_files_updated' ||
        data.type === 'agent_skills_updated' ||
        data.type === 'agent_mcps_updated' ||
        data.type === 'agent_cron_jobs_updated'
      ) {
        refreshManifest();
        loadCronJobs();
        AgentService.fetchWorkspaceFiles(agent.id)
          .then((res) => setWorkspaceFilesCount(res.totalFiles))
          .catch(() => {});
      } else if (data.type === 'run_completed' || data.type === 'run_failed') {
        void AgentService.fetchActiveRuns(agent.id).then(setActiveRuns).catch(() => {});
        void AgentService.fetchAgentRuns(agent.id).then(setRuns).catch(() => {});
        loadCronJobs();
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
          `Cannot start run: The following attached MCP servers need setup:\n• ${unconfiguredMcps
            .map((m) => {
              const raw = m as { missingKeys?: string[]; readinessState?: string };
              const need =
                raw.readinessState === 'needs-provider-auth'
                  ? 'provider account login'
                  : `missing ${(raw.missingKeys || ['credentials']).join(', ')}`;
              return `${m.label || m.mcp_name} (${need})`;
            })
            .join('\n• ')}\n\nPlease finish setup before starting a run.`
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
          setTodos([]);
          setContexts(null);
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
      setTodos([]);
      setContexts(null);
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

  // Scroll terminal logs container internally on update without shifting parent drawer elements
  useEffect(() => {
    if (activeTab === 'terminal' && terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [liveEvents, pastRunEvents, activeTab]);

  // Auto-load latest run events for the Terminal tab if no live/past events exist in memory
  useEffect(() => {
    if (activeTab === 'terminal' && liveEvents.length === 0 && pastRunEvents.length === 0 && runs.length > 0) {
      AgentService.fetchRunDetails(runs[0].id)
        .then((details) => {
          if (Array.isArray(details.events) && details.events.length > 0) {
            const converted: LiveLogEvent[] = details.events.map((e: RunEventRecord) => {
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
          }
        })
        .catch(() => {});
    }
  }, [activeTab, liveEvents.length, pastRunEvents.length, runs]);

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
      } else if (eventType === 'run_completed') {
        if (p.summary && typeof p.summary === 'string' && !entries.some((e) => e.type === 'output')) {
          entries.push({
            id: `output_summary_${i}`,
            type: 'output',
            title: 'Execution Summary',
            text: p.summary,
          });
        }
      } else {
        entries.push({
          id: `evt_${i}`,
          type: 'event',
          text: `[${eventType}] ${JSON.stringify(p)}`,
        });
      }
    }

    // If there are no stream output events recorded, but there is a recent run summary (or latestRun), surface it
    if (!entries.some((e) => e.type === 'output')) {
      const fallbackSummary =
        (selectedRunId ? runs.find((r) => r.id === selectedRunId)?.summary : null) ||
        agent.latestRun?.summary ||
        runs[0]?.summary;
      if (fallbackSummary && typeof fallbackSummary === 'string' && fallbackSummary.trim()) {
        entries.push({
          id: 'latest_run_summary',
          type: 'output',
          title: 'Recent Session Output',
          text: fallbackSummary.trim(),
        });
      }
    }

    return entries;
  }, [activeEvents, selectedRunId, runs, agent.latestRun]);

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
      className={`slide-drawer ap-agent-drawer ${isEntering ? 'drawer-entering' : ''} ${
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
          {/* Combined Collab Avatar: Agent Face + Smoke Monkey Mascot Overlay */}
          <div
            className="drawer-collab-avatar"
            title={`${agent.name} × Smoke Monkey (Click to customize face)`}
            onClick={() => setShowAvatarPicker(true)}
            style={{ cursor: 'pointer' }}
          >
            <div className="drawer-collab-disc">
              <AgentAvatar
                agentId={agent.id}
                size={34}
                className="drawer-collab-agent-avatar"
              />
            </div>
            <div className="drawer-collab-mascot-badge" title="Smoke Monkey Canvas Engine">
              <img
                src="/smoke-monkey-mascot.png"
                alt="Smoke Monkey"
                className="drawer-collab-mascot-img"
              />
            </div>
          </div>
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
              <span className="agent-id-pill ap-id-pill" title={`Agent ID: ${agent.id}`}>
                {shortId}
              </span>
              <span className={`status-pill ${agent.status}`}>
                <span className="status-dot" aria-hidden="true" />
                {agent.status}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            className="drawer-action-btn ap-ghost-btn"
            onClick={(e) => {
              e.stopPropagation();
              void handleNewChat(e);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Start fresh chat session"
          >
            <MessageSquarePlus size={13} />
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
            aria-label="Close agent drawer"
            style={{ flexShrink: 0 }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Delegation Navigation Bar: Return to caller agent */}
      {drawerCallerStack.length > 0 && (
        <div className="drawer-delegation-banner">
          <button
            type="button"
            className="drawer-delegation-back-btn"
            onClick={handleGoBackToCaller}
            title={`Return to ${drawerCallerStack[drawerCallerStack.length - 1].name}`}
          >
            <ArrowLeft size={13} />
            <span>
              Back to <strong>{drawerCallerStack[drawerCallerStack.length - 1].name}</strong>
            </span>
          </button>
          <div className="drawer-delegation-info">
            <span className="drawer-delegation-badge">Delegated Session</span>
            {drawerCallerStack[drawerCallerStack.length - 1].taskTitle && (
              <span
                className="drawer-delegation-task"
                title={drawerCallerStack[drawerCallerStack.length - 1].taskTitle}
              >
                "{drawerCallerStack[drawerCallerStack.length - 1].taskTitle}"
              </span>
            )}
          </div>
        </div>
      )}

      {/* Sub-header Context Bar: Working Directory & RAM Envelope */}
      <div className="drawer-context-bar">
        <div className="ap-context-item ap-context-path">
          <Folder size={12} aria-hidden="true" />
          <span
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
        <div className={`ap-context-item ap-context-ram${(agent.max_memory_mb || 1024) <= 512 ? ' is-edge' : ''}`}>
          {(agent.max_memory_mb || 1024) <= 512 ? <Smartphone size={11} /> : <HardDrive size={11} />}
          <span>{agent.max_memory_mb || 1024} MB</span>
        </div>
      </div>

      {/* Tabs + engine toggle */}
      <div className="drawer-tabs">
        <button
          className={`drawer-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
          title="Agent Chat"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
            <MessageSquare size={13} />
            <span>Chat</span>
          </div>
        </button>
        <button
          className={`drawer-tab-btn ${activeTab === 'terminal' ? 'active' : ''}`}
          onClick={() => setActiveTab('terminal')}
          title="Raw Terminal"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
            <Terminal size={13} />
            <span>Terminal</span>
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
            <span>History</span>
            <span className="ap-tab-count">{chatSessions.length + runs.filter((r) => r.trigger_type === 'cron').length}</span>
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
            <span>Files</span>
            <span className="ap-tab-count">{workspaceFilesCount}</span>
          </div>
        </button>
        <button
          className={`drawer-tab-btn ${activeTab === 'cron' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('cron');
            loadCronJobs();
            AgentService.fetchAgentRuns(agent.id).then(setRuns).catch(() => {});
          }}
          title="Scheduled Cron Automations"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
            <Clock size={13} />
            <span>Cron Jobs</span>
            <span className="ap-tab-count">{cronJobs.length}</span>
          </div>
        </button>

        {activeTab === 'chat' && (
          <button
            type="button"
            className={`ap-live-toggle${useSynthetic ? ' is-demo' : ''}`}
            onClick={() => setUseSynthetic((v) => !v)}
            title={
              useSynthetic
                ? 'Using offline demo — click to switch to live harness'
                : 'Using live harness — click for demo mode'
            }
          >
            {useSynthetic ? <FlaskConical size={11} /> : <Radio size={11} />}
            <span>{useSynthetic ? 'Demo' : 'Live'}</span>
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
                  <span className="unconfigured-banner-title">MCP Setup Required:</span>
                  <span className="unconfigured-banner-desc">
                    {unconfiguredMcps.map((m) => (
                      <span
                        key={m.id || m.mcp_name}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          background: 'rgba(245, 158, 11, 0.2)',
                          border: '1px solid rgba(245, 158, 11, 0.4)',
                          borderRadius: 4,
                          padding: '1px 6px',
                          marginRight: 6,
                          fontSize: 11,
                          fontWeight: 500,
                        }}
                      >
                        <span>{m.label || m.mcp_name}</span>
                        <button
                          type="button"
                          title={`Remove ${m.label || m.mcp_name} from agent`}
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await AgentService.deleteMcp(agent.id, m.id || m.mcp_name);
                              setManifest((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      mcps: prev.mcps.filter(
                                        (it) => it.id !== m.id && it.mcp_name !== m.mcp_name,
                                      ),
                                    }
                                  : prev,
                              );
                              refreshManifest();
                            } catch (err) {
                              console.error('Failed to remove MCP', err);
                            }
                          }}
                          style={{
                            all: 'unset',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            opacity: 0.7,
                            transition: 'opacity 0.15s, color 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '1';
                            e.currentTarget.style.color = '#ef4444';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '0.7';
                            e.currentTarget.style.color = 'inherit';
                          }}
                          aria-label={`Remove ${m.label || m.mcp_name}`}
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                    cannot run until credentials or login are finished.
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
              style={{
                flex: 1,
                minHeight: 0,
                '--current-agent-name': JSON.stringify(agent.name),
              } as React.CSSProperties}
            >
              <ChatPanel
                messages={messages}
                isStreaming={isStreaming}
                onSend={handleSendMessage}
                onStop={isStreaming ? handleStopCurrent : undefined}
                rail={{ todos, contexts }}
                placeholder={`Message ${agent.name}…`}
                hideComposer={Boolean(viewingHistoryRunId || viewingCronRunId)}
                columnMaxWidth="800px"
                innerClassName="px-4 sm:px-8 py-4"
                composerClassName="px-4 sm:px-8 pb-4"
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
                    placeholder={`Message ${agent.name}…`}
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
                      <div
                        className="hero-collab-avatar-stage"
                        title={`${agent.name} × Smoke Monkey (Click to customize face)`}
                        onClick={() => setShowAvatarPicker(true)}
                        style={{ cursor: 'pointer' }}
                      >
                        <AgentAvatar
                          agentId={agent.id}
                          size={76}
                          className="hero-collab-agent-avatar"
                        />
                        <div className="hero-collab-mascot-badge" title="Smoke Monkey Canvas Engine">
                          <img
                            src="/smoke-monkey-mascot.png"
                            alt="Smoke Monkey"
                            className="hero-collab-mascot-img"
                          />
                        </div>
                      </div>
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

            <div className="log-terminal" ref={terminalContainerRef}>
              {terminalEntries.length === 0 ? (
                <div
                  style={{
                    color: 'hsl(var(--muted-foreground))',
                    fontStyle: 'italic',
                    padding: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Terminal size={14} />
                  <span>Awaiting agent execution events… Click &quot;Run&quot; or send a prompt to stream live output.</span>
                </div>
              ) : (
                terminalEntries.map((item) => {
                  if (item.type === 'step') {
                    return (
                      <div
                        key={item.id}
                        className="log-entry step"
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
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            fontWeight: 600,
                            fontSize: 10.5,
                            color: '#0284c7',
                            marginBottom: 3,
                          }}
                        >
                          <span>💭</span>
                          <span>THOUGHT PROCESS</span>
                        </div>
                        {item.text}
                      </div>
                    );
                  }
                  if (item.type === 'output') {
                    return (
                      <div
                        key={item.id}
                        className="log-entry output"
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontWeight: 700,
                            fontSize: 11,
                            color: '#34d399',
                            marginBottom: 6,
                            letterSpacing: '0.03em',
                            textTransform: 'uppercase',
                          }}
                        >
                          <span>🤖</span>
                          <span>Agent Response</span>
                        </div>
                        <div className="terminal-markdown-prose">
                          <ReactMarkdown>{item.text}</ReactMarkdown>
                        </div>
                      </div>
                    );
                  }
                  if (item.type === 'tool_start') {
                    return (
                      <div
                        key={item.id}
                        className="log-entry tool"
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
                                alignItems: 'center',
                                gap: 6,
                                minWidth: 0,
                              }}
                            >
                              {group.title === 'MCP Servers' && (
                                <span
                                  style={{
                                    width: 16,
                                    height: 16,
                                    minWidth: 16,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: 0.95,
                                  }}
                                >
                                  {getBrandIcon(`${it.name} ${it.sub || ''}`, 14) || (
                                    <span style={{ fontSize: 11, opacity: 0.5 }}>◆</span>
                                  )}
                                </span>
                              )}
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <SourceBadge source={it.source} />
                              {group.title === 'MCP Servers' && (
                                <button
                                  type="button"
                                  className="drawer-component-remove-btn"
                                  title={`Remove ${it.name} from agent`}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      await AgentService.deleteMcp(agent.id, it.id || it.sub || it.name);
                                      setManifest((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              mcps: prev.mcps.filter(
                                                (m) => m.id !== it.id && m.mcp_name !== it.sub && m.mcp_name !== it.name,
                                              ),
                                            }
                                          : prev,
                                      );
                                      refreshManifest();
                                    } catch (err) {
                                      console.error('Failed to remove MCP', err);
                                    }
                                  }}
                                  style={{
                                    all: 'unset',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 20,
                                    height: 20,
                                    borderRadius: 4,
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.color = '#f87171';
                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                    e.currentTarget.style.transform = 'scale(1.1)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.color = '#94a3b8';
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.transform = 'scale(1)';
                                  }}
                                  aria-label={`Remove ${it.name}`}
                                >
                                  <X size={12} />
                                </button>
                              )}
                              {group.title === 'Skills' && (
                                <button
                                  type="button"
                                  className="drawer-component-remove-btn"
                                  title={`Remove skill ${it.name} from agent`}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      await AgentService.deleteSkill(agent.id, it.id);
                                      setManifest((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              skills: prev.skills.filter((s) => s.id !== it.id),
                                            }
                                          : prev,
                                      );
                                      refreshManifest();
                                    } catch (err) {
                                      console.error('Failed to remove skill', err);
                                    }
                                  }}
                                  style={{
                                    all: 'unset',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 20,
                                    height: 20,
                                    borderRadius: 4,
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.color = '#f87171';
                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                    e.currentTarget.style.transform = 'scale(1.1)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.color = '#94a3b8';
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.transform = 'scale(1)';
                                  }}
                                  aria-label={`Remove skill ${it.name}`}
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>
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
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('cron');
                      loadCronJobs();
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#fbbf24',
                      fontSize: 11,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontWeight: 600,
                    }}
                  >
                    Manage Automations →
                  </button>
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

        {/* TAB 5: DEDICATED CRON JOBS & AUTOMATION SCHEDULER */}
        {activeTab === 'cron' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header Card */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 10,
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(245, 158, 11, 0.03) 100%)',
                border: '1px solid rgba(251, 191, 36, 0.22)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: 'rgba(251, 191, 36, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fbbf24',
                  }}
                >
                  <Clock size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>
                    Scheduled Automations & Cron
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.6)' }}>
                    Autonomous recurring schedules and one-time deferred tasks for {agent.name}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    loadCronJobs();
                    AgentService.fetchAgentRuns(agent.id).then(setRuns).catch(() => {});
                  }}
                  title="Refresh automations"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    background: 'rgba(255, 255, 255, 0.04)',
                    color: 'rgba(255, 255, 255, 0.8)',
                    cursor: 'pointer',
                  }}
                >
                  <RotateCw size={13} className={loadingCronJobs ? 'animate-spin' : ''} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isAddingJob) {
                      handleCancelForm();
                    } else {
                      setEditingJobId(null);
                      setNewJobName('');
                      setNewJobPrompt('');
                      setCronActionError(null);
                      setIsAddingJob(true);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '5px 11px',
                    borderRadius: 6,
                    border: '1px solid rgba(251, 191, 36, 0.4)',
                    background: isAddingJob
                      ? 'rgba(251, 191, 36, 0.25)'
                      : 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.1) 100%)',
                    color: '#fbbf24',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isAddingJob ? <X size={13} /> : <Plus size={13} />}
                  <span>{isAddingJob ? 'Close' : 'New Task'}</span>
                </button>
              </div>
            </div>

            {/* Unconfigured MCPs Paused Banner */}
            {unconfiguredAgentMcps.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: 'rgba(239, 68, 68, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#f87171',
                      flexShrink: 0,
                    }}
                  >
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>⏸ Cron Automations Paused</span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: 'rgba(239, 68, 68, 0.25)',
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                        }}
                      >
                        {unconfiguredAgentMcps.length} UNCONFIGURED MCP{unconfiguredAgentMcps.length > 1 ? 'S' : ''}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#e2e8f0', marginTop: 2, lineHeight: 1.35 }}>
                      Scheduled daily cron jobs (Workspace Compactor, EOD Summary, Self-Refinement) will not run until required MCP credentials are configured ({unconfiguredAgentMcps.map((m) => m.mcp_name).join(', ')}).
                    </div>
                  </div>
                </div>

                {onConfigureMcp && (
                  <button
                    type="button"
                    onClick={() => onConfigureMcp(agent.id, unconfiguredAgentMcps[0]?.mcp_name)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '6px 12px',
                      borderRadius: 6,
                      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                      border: '1px solid rgba(254, 202, 202, 0.3)',
                      color: '#fff',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      flexShrink: 0,
                      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    <span>Connect MCP</span>
                  </button>
                )}
              </div>
            )}

            {/* Inline Creation / Edit Form with Interactive Clock */}
            {isAddingJob && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  padding: 14,
                  borderRadius: 10,
                  background: '#141624',
                  border: '1px solid rgba(251, 191, 36, 0.35)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fbbf24' }}>
                    {editingJobId ? '✏️ Edit Scheduled Automation' : '✨ Schedule New Agent Task'}
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                </div>

                {cronActionError && (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      color: '#fca5a5',
                      fontSize: 11.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <AlertTriangle size={13} />
                    <span>{cronActionError}</span>
                  </div>
                )}

                {/* Task Name */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.6)' }}>
                    Task Name
                  </label>
                  <input
                    type="text"
                    value={newJobName}
                    onChange={(e) => setNewJobName(e.target.value)}
                    placeholder="e.g. Daily Memory Review & Compactor, 12 PM Sanity Check"
                    style={{
                      padding: '7px 10px',
                      borderRadius: 6,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#fff',
                      fontSize: 12,
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Interactive Clock & Schedule Box matching agent.modal.tsx */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.7)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Clock size={12} color="#fbbf24" />
                      <span>Execution Schedule</span>
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        onClick={() => { setClockHour12(9); setClockMinute(0); setClockAmPm('AM'); }}
                        style={{
                          padding: '2px 7px',
                          fontSize: 10,
                          borderRadius: 4,
                          border: clockHour12 === 9 && clockMinute === 0 && clockAmPm === 'AM' ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.08)',
                          background: clockHour12 === 9 && clockMinute === 0 && clockAmPm === 'AM' ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.03)',
                          color: clockHour12 === 9 && clockMinute === 0 && clockAmPm === 'AM' ? '#fbbf24' : 'rgba(255,255,255,0.6)',
                          cursor: 'pointer',
                        }}
                      >
                        9:00 AM
                      </button>
                      <button
                        type="button"
                        onClick={() => { setClockHour12(12); setClockMinute(30); setClockAmPm('PM'); }}
                        style={{
                          padding: '2px 7px',
                          fontSize: 10,
                          borderRadius: 4,
                          border: clockHour12 === 12 && clockMinute === 30 && clockAmPm === 'PM' ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.08)',
                          background: clockHour12 === 12 && clockMinute === 30 && clockAmPm === 'PM' ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.03)',
                          color: clockHour12 === 12 && clockMinute === 30 && clockAmPm === 'PM' ? '#fbbf24' : 'rgba(255,255,255,0.6)',
                          cursor: 'pointer',
                        }}
                      >
                        12:30 PM
                      </button>
                      <button
                        type="button"
                        onClick={() => { setClockHour12(6); setClockMinute(0); setClockAmPm('PM'); }}
                        style={{
                          padding: '2px 7px',
                          fontSize: 10,
                          borderRadius: 4,
                          border: clockHour12 === 6 && clockMinute === 0 && clockAmPm === 'PM' ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.08)',
                          background: clockHour12 === 6 && clockMinute === 0 && clockAmPm === 'PM' ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.03)',
                          color: clockHour12 === 6 && clockMinute === 0 && clockAmPm === 'PM' ? '#fbbf24' : 'rgba(255,255,255,0.6)',
                          cursor: 'pointer',
                        }}
                      >
                        6:00 PM (EOD)
                      </button>
                    </div>
                  </div>

                  {/* Analog Clock Face & Digital Steppers Row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(0, 0, 0, 0.25)', padding: 12, borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <AnalogClockFace hour={clockHour12} minute={clockMinute} />
                      <span style={{ fontSize: 10.5, color: '#fbbf24', fontWeight: 700 }}>
                        {clockHour12}:{String(clockMinute).padStart(2, '0')} {clockAmPm}
                      </span>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {/* Hour Stepper */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '3px 8px' }}>
                          <button
                            type="button"
                            onClick={() => setClockHour12((h) => (h >= 12 ? 1 : h + 1))}
                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: 1 }}
                          >
                            <ChevronUp size={14} />
                          </button>
                          <span style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace', minWidth: 28, textAlign: 'center', color: '#fff' }}>
                            {String(clockHour12).padStart(2, '0')}
                          </span>
                          <button
                            type="button"
                            onClick={() => setClockHour12((h) => (h <= 1 ? 12 : h - 1))}
                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: 1 }}
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>

                        <span style={{ fontSize: 22, fontWeight: 700, color: '#fbbf24' }}>:</span>

                        {/* Minute Stepper */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '3px 8px' }}>
                          <button
                            type="button"
                            onClick={() => setClockMinute((m) => (m + 5) % 60)}
                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: 1 }}
                          >
                            <ChevronUp size={14} />
                          </button>
                          <span style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace', minWidth: 28, textAlign: 'center', color: '#fff' }}>
                            {String(clockMinute).padStart(2, '0')}
                          </span>
                          <button
                            type="button"
                            onClick={() => setClockMinute((m) => (m - 5 + 60) % 60)}
                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: 1 }}
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>

                        {/* AM / PM Toggle */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <button
                            type="button"
                            onClick={() => setClockAmPm('AM')}
                            style={{
                              padding: '2px 8px',
                              borderRadius: 4,
                              border: 'none',
                              background: clockAmPm === 'AM' ? '#fbbf24' : 'rgba(255,255,255,0.08)',
                              color: clockAmPm === 'AM' ? '#000' : 'rgba(255,255,255,0.7)',
                              fontWeight: 700,
                              fontSize: 10,
                              cursor: 'pointer',
                            }}
                          >
                            AM
                          </button>
                          <button
                            type="button"
                            onClick={() => setClockAmPm('PM')}
                            style={{
                              padding: '2px 8px',
                              borderRadius: 4,
                              border: 'none',
                              background: clockAmPm === 'PM' ? '#fbbf24' : 'rgba(255,255,255,0.08)',
                              color: clockAmPm === 'PM' ? '#000' : 'rgba(255,255,255,0.7)',
                              fontWeight: 700,
                              fontSize: 10,
                              cursor: 'pointer',
                            }}
                          >
                            PM
                          </button>
                        </div>

                        {/* Direct Time Input */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginLeft: 6 }}>
                          <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.5)' }}>Direct Time Input:</span>
                          <input
                            type="time"
                            value={timePickerInputValue}
                            onChange={(e) => handleTimeInputPicker(e.target.value)}
                            style={{
                              padding: '4px 6px',
                              fontSize: 11,
                              borderRadius: 6,
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.12)',
                              color: '#fff',
                              height: 30,
                              width: 100,
                            }}
                          />
                        </div>
                      </div>

                      {/* Minute Quick Jump */}
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginRight: 2 }}>Minute:</span>
                        {[0, 15, 30, 45].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setClockMinute(m)}
                            style={{
                              padding: '2px 6px',
                              borderRadius: 4,
                              border: clockMinute === m ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.08)',
                              background: clockMinute === m ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.03)',
                              color: clockMinute === m ? '#fbbf24' : 'rgba(255,255,255,0.7)',
                              fontSize: 10,
                              fontFamily: 'monospace',
                              cursor: 'pointer',
                            }}
                          >
                            :{String(m).padStart(2, '0')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Repeat Frequency */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>
                      Repeat Schedule:
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => setClockRepeat('everyday')}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 6,
                          border: clockRepeat === 'everyday' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                          background: clockRepeat === 'everyday' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.02)',
                          color: clockRepeat === 'everyday' ? '#34d399' : 'rgba(255,255,255,0.7)',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                        }}
                      >
                        <span>📅 Every day</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setClockRepeat('weekdays')}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 6,
                          border: clockRepeat === 'weekdays' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                          background: clockRepeat === 'weekdays' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.02)',
                          color: clockRepeat === 'weekdays' ? '#34d399' : 'rgba(255,255,255,0.7)',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                        }}
                      >
                        <span>💼 Weekdays</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setClockRepeat('weekends')}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 6,
                          border: clockRepeat === 'weekends' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                          background: clockRepeat === 'weekends' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.02)',
                          color: clockRepeat === 'weekends' ? '#34d399' : 'rgba(255,255,255,0.7)',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                        }}
                      >
                        <span>🏖️ Weekends</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setClockRepeat('once')}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 6,
                          border: clockRepeat === 'once' ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                          background: clockRepeat === 'once' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.02)',
                          color: clockRepeat === 'once' ? '#38bdf8' : 'rgba(255,255,255,0.7)',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                        }}
                      >
                        <span>⏳ One-Time</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Bar matching Screenshot 2 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 6,
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      fontSize: 11.5,
                      color: '#34d399',
                      fontWeight: 600,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={13} color="#10b981" />
                      <span>{clockSummaryText}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowRawCron(!showRawCron)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: 10.5,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      <span>{showRawCron ? '▾ Hide cron syntax' : '▸ Edit raw cron syntax'}</span>
                    </button>
                  </div>

                  {/* Raw Cron syntax input if expanded */}
                  {showRawCron && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.5)' }}>Raw Cron Expression:</span>
                      <input
                        type="text"
                        value={rawCronValue}
                        onChange={(e) => setRawCronValue(e.target.value)}
                        style={{
                          padding: '6px 8px',
                          fontSize: 11.5,
                          fontFamily: 'monospace',
                          borderRadius: 6,
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: '#fff',
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Agent Prompt Instructions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.6)' }}>
                    Instructions / Prompt for Agent
                  </label>
                  <textarea
                    rows={4}
                    value={newJobPrompt}
                    onChange={(e) => setNewJobPrompt(e.target.value)}
                    placeholder="Enter the prompt that will trigger this agent (e.g. Review memory files and compress to ~60 lines; compile EOD summary into eod_reports/YYYY-MM-DD.md; inspect git commit changes)..."
                    style={{
                      padding: '8px 10px',
                      borderRadius: 6,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#fff',
                      fontSize: 11.5,
                      lineHeight: 1.5,
                      resize: 'vertical',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Form Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      background: 'transparent',
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: 11.5,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveJob}
                    disabled={!newJobName.trim() || !newJobPrompt.trim()}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 6,
                      border: 'none',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      color: '#000',
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: !newJobName.trim() || !newJobPrompt.trim() ? 'not-allowed' : 'pointer',
                      opacity: !newJobName.trim() || !newJobPrompt.trim() ? 0.5 : 1,
                    }}
                  >
                    {editingJobId ? 'Save Changes' : 'Schedule Automation'}
                  </button>
                </div>
              </div>
            )}

            {/* List of Scheduled Automations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255, 255, 255, 0.6)' }}>
                  Configured Automations ({cronJobs.length})
                </span>
              </div>

              {cronJobs.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    color: 'rgba(255, 255, 255, 0.5)',
                    padding: '24px 16px',
                    fontSize: 12,
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: 8,
                    border: '1px dashed rgba(255, 255, 255, 0.1)',
                  }}
                >
                  No scheduled automations configured yet. Click "+ New Task" above or schedule tasks via chat!
                </div>
              ) : (
                cronJobs.map((job) => {
                  const source = (job.created_by || 'user').toLowerCase();
                  const badge =
                    source === 'system'
                      ? { label: 'SYSTEM', bg: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }
                      : source === 'agent'
                      ? { label: 'AGENT', bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }
                      : { label: 'USER', bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' };

                  const isOnce = job.cron_schedule === 'once' || job.cron_schedule.startsWith('once');
                  const friendlyTiming = formatFriendlyCronSchedule(job.cron_schedule, job.next_run_at);

                  return (
                    <div
                      key={job.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        padding: '12px 14px',
                        borderRadius: 10,
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: job.enabled === 1 ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0.05)',
                        opacity: job.enabled === 1 ? 1 : 0.65,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {/* Top Row: Title, Badges & Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: 9.5,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: badge.bg,
                              color: badge.color,
                              border: badge.border,
                            }}
                          >
                            {badge.label}
                          </span>
                          <span
                            style={{
                              fontSize: 9.5,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '2px 6px',
                              borderRadius: 4,
                              background:
                                job.enabled === 1
                                  ? unconfiguredAgentMcps.length > 0
                                    ? 'rgba(245, 158, 11, 0.15)'
                                    : 'rgba(34, 197, 94, 0.15)'
                                  : 'rgba(156, 163, 175, 0.15)',
                              color:
                                job.enabled === 1
                                  ? unconfiguredAgentMcps.length > 0
                                    ? '#fbbf24'
                                    : '#4ade80'
                                  : '#9ca3af',
                              border:
                                job.enabled === 1
                                  ? unconfiguredAgentMcps.length > 0
                                    ? '1px solid rgba(245, 158, 11, 0.35)'
                                    : '1px solid rgba(34, 197, 94, 0.3)'
                                  : '1px solid rgba(156, 163, 175, 0.3)',
                            }}
                          >
                            {job.enabled === 1
                              ? unconfiguredAgentMcps.length > 0
                                ? '⏸ Paused (Unconfigured MCPs)'
                                : '● Active'
                              : '⏸ Paused'}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                            {job.name}
                          </span>
                        </div>

                        {/* Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => handleRunJobNow(job)}
                            disabled={runningJobId === job.id}
                            title={
                              unconfiguredAgentMcps.length > 0
                                ? 'Warning: agent has unconfigured MCP credentials'
                                : 'Execute this task immediately now'
                            }
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '3px 8px',
                              borderRadius: 5,
                              border: '1px solid rgba(251, 191, 36, 0.4)',
                              background: 'rgba(251, 191, 36, 0.12)',
                              color: '#fbbf24',
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: runningJobId === job.id ? 'wait' : 'pointer',
                            }}
                          >
                            <Zap size={11} className={runningJobId === job.id ? 'animate-spin' : ''} />
                            <span>{runningJobId === job.id ? 'Running...' : 'Run Now'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleJob(job)}
                            title={job.enabled === 1 ? 'Pause task' : 'Activate task'}
                            style={{
                              padding: '4px 7px',
                              borderRadius: 5,
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              background: 'rgba(255, 255, 255, 0.04)',
                              color: 'rgba(255, 255, 255, 0.75)',
                              fontSize: 10.5,
                              cursor: 'pointer',
                            }}
                          >
                            {job.enabled === 1 ? <Pause size={12} /> : <Play size={12} />}
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleStartEditJob(job)}
                            title="Edit scheduled task configuration"
                            style={{
                              padding: '4px 7px',
                              borderRadius: 5,
                              border: editingJobId === job.id ? '1px solid rgba(251, 191, 36, 0.6)' : '1px solid rgba(255, 255, 255, 0.12)',
                              background: editingJobId === job.id ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                              color: editingJobId === job.id ? '#fbbf24' : 'rgba(255, 255, 255, 0.75)',
                              fontSize: 10.5,
                              cursor: 'pointer',
                            }}
                          >
                            <Edit3 size={12} />
                          </button>

                          {/* Delete Button with Inline Confirmation */}
                          {job.created_by !== 'system' && (
                            deletingJobId === job.id ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteJob(job.id)}
                                  title="Confirm delete"
                                  style={{
                                    padding: '3px 7px',
                                    borderRadius: 4,
                                    border: 'none',
                                    background: '#ef4444',
                                    color: '#fff',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Delete?
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingJobId(null)}
                                  title="Cancel delete"
                                  style={{
                                    padding: '3px 5px',
                                    borderRadius: 4,
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    background: 'transparent',
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    fontSize: 10,
                                    cursor: 'pointer',
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeletingJobId(job.id)}
                                title="Delete task"
                                style={{
                                  padding: '4px 7px',
                                  borderRadius: 5,
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  color: '#ef4444',
                                  fontSize: 10.5,
                                  cursor: 'pointer',
                                }}
                              >
                                <Trash2 size={12} />
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      {/* Details Row: Timing & Next/Last Run */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          flexWrap: 'wrap',
                          fontSize: 11,
                          color: 'rgba(255, 255, 255, 0.65)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} color="#fbbf24" />
                          <span style={{ color: '#fbbf24', fontWeight: 600 }}>{friendlyTiming}</span>
                          {!isOnce && (
                            <code style={{ fontSize: 9.5, opacity: 0.6, background: 'rgba(0,0,0,0.3)', padding: '1px 4px', borderRadius: 3 }}>
                              {job.cron_schedule}
                            </code>
                          )}
                        </div>

                        {job.next_run_at && job.enabled === 1 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ opacity: 0.5 }}>Next:</span>
                            <span style={{ color: '#38bdf8' }}>
                              {new Date(job.next_run_at).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        )}

                        {job.last_run_at && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ opacity: 0.5 }}>Last:</span>
                            <span>
                              {new Date(job.last_run_at).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Prompt Snippet Box */}
                      <div
                        style={{
                          padding: '7px 10px',
                          borderRadius: 6,
                          background: 'rgba(0, 0, 0, 0.35)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          fontSize: 11,
                          lineHeight: 1.45,
                          color: 'rgba(255, 255, 255, 0.85)',
                          fontFamily: 'system-ui, sans-serif',
                        }}
                      >
                        <span style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(251, 191, 36, 0.8)', textTransform: 'uppercase', marginRight: 6 }}>
                          Agent Task:
                        </span>
                        {job.prompt}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Past Executions History Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#fbbf24',
                  }}
                >
                  ⏰ Past Cron Execution History ({runs.filter((r) => r.trigger_type === 'cron').length})
                </span>
              </div>

              {runs.filter((r) => r.trigger_type === 'cron').length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    color: 'rgba(255, 255, 255, 0.45)',
                    padding: '16px 12px',
                    fontSize: 11.5,
                    background: 'rgba(255, 255, 255, 0.02)',
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
                              : '1px solid rgba(255, 255, 255, 0.07)',
                          background:
                            selectedRunId === r.id || viewingCronRunId === r.id
                              ? 'rgba(251, 191, 36, 0.08)'
                              : 'rgba(255, 255, 255, 0.02)',
                        }}
                        onClick={async () => {
                          await loadRun(r.id, isRunActive);
                          setActiveTab('chat');
                        }}
                        title="Click to view full execution log and chat transcript"
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 4,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span
                              style={{
                                fontSize: 9.5,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                padding: '2px 6px',
                                borderRadius: 4,
                                background: 'rgba(251, 191, 36, 0.18)',
                                color: '#fbbf24',
                                border: '1px solid rgba(251, 191, 36, 0.35)',
                              }}
                            >
                              Cron Execution
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
                                RUNNING
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: 9.5,
                                  padding: '1px 5px',
                                  borderRadius: 4,
                                  background: r.error ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                                  color: r.error ? '#ef4444' : '#4ade80',
                                }}
                              >
                                {r.error ? 'FAILED' : 'SUCCESS'}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.45)' }}>
                            {new Date(r.started_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {r.task_prompt && (
                          <div
                            style={{
                              fontSize: 11,
                              color: 'rgba(255, 255, 255, 0.85)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {r.task_prompt}
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
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

      {showAvatarPicker && (
        <AvatarPickerModal
          isOpen={showAvatarPicker}
          agentId={agent.id}
          agentName={agent.name}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}
    </div>
  );
});
