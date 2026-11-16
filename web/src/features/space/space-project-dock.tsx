import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Rocket,
  Sparkles,
  RefreshCw,
  X,
  ChevronDown,
  FolderOpen,
  Folder,
  GitBranch,
  Layers,
  FileText,
  CheckCircle2,
  AlertCircle,
  Maximize2,
  Trash2,
  Upload,
  Cpu,
  Key,
  ShieldCheck,
  ShieldAlert,
  Terminal,
  ExternalLink,
  Square,
  Clock,
} from 'lucide-react';
import { SpaceService } from './space.service.js';
import { PROVIDER_CATALOG } from '../common/provider-catalog.js';
import { useSpaceStore } from './space.store.js';

// ── Types ──────────────────────────────────────────────────────────────────────

export type DockStatus = 'idle' | 'exploring' | 'building' | 'synced' | 'deployed' | 'error';

export interface AttachedFile {
  filename: string;
  relativePath?: string;
  content: string;
  chars: number;
}

export interface RuntimeEvent {
  id: string;
  type: 'step' | 'thought' | 'tool' | 'text' | 'system' | 'error';
  title?: string;
  content: string;
  timestamp: string;
  status?: 'running' | 'success' | 'error';
  toolName?: string;
  args?: any;
  result?: any;
}

export interface SpaceProjectDockProps {
  spaceId: string;
  companyName: string;
  color: string;
  repoUrl?: string;
  workingDir?: string;
  projectBrief?: string;
  spaceWidth?: number;
  spaceHeight?: number;
  hasAgents?: boolean;
  isCenteredMode?: boolean;
  configuredKeys?: Record<string, boolean>;
  onDismissToSide?: () => void;
  onCenterDock?: () => void;
  onUpdateSpace: (updates: { repoUrl?: string; workingDir?: string; projectBrief?: string }) => void;
  onOpenDrawer?: (agent: any) => void;
}

// ── Constants & Limits ────────────────────────────────────────────────────────

export const MAX_TOKENS = 60_000;
export const CHARS_PER_TOKEN = 4;
export const MAX_CHARS = MAX_TOKENS * CHARS_PER_TOKEN; // 240,000 chars

const TECH_STACK_OPTIONS = [
  'Node.js', 'TypeScript', 'Python', 'React', 'Next.js',
  'PostgreSQL', 'MongoDB', 'Docker', 'Go', 'Rust', 'FastAPI', 'Express',
];

const PROJECT_TYPE_OPTIONS = [
  'SaaS / Cloud Platform',
  'E-Commerce & Retail',
  'FinTech & Banking',
  'AI / ML Platform',
  'Healthcare & Life Sciences',
  'Gaming Studio',
  'Mobile Application',
  'Developer Tooling',
  'Agency & Client Services',
  'Internal Operations',
];

// ── Progress Dots ─────────────────────────────────────────────────────────────

const ProgressDots: React.FC = () => (
  <span className="spd-progress-dots">
    <span />
    <span />
    <span />
  </span>
);

// ── Main Component ────────────────────────────────────────────────────────────

const SpaceProjectDockComponent: React.FC<SpaceProjectDockProps> = ({
  spaceId,
  companyName,
  color,
  repoUrl: initialRepoUrl,
  workingDir: initialWorkingDir,
  projectBrief: initialProjectBrief,
  spaceWidth = 720,
  spaceHeight = 520,
  hasAgents = false,
  isCenteredMode = false,
  configuredKeys = {},
  onDismissToSide,
  onCenterDock,
  onUpdateSpace,
  onOpenDrawer,
}) => {
  // Mode: local folder vs git repo
  const [sourceType, setSourceType] = useState<'folder' | 'git'>(
    initialWorkingDir && !initialRepoUrl ? 'folder' : initialRepoUrl ? 'git' : 'folder',
  );

  const hasConfig = !!(initialRepoUrl || initialWorkingDir || initialProjectBrief);
  const [isOpen, setIsOpen] = useState(isCenteredMode ? true : !hasConfig);

  // Tab State: 'config' vs 'runtime'
  const [activeTab, setActiveTab] = useState<'config' | 'runtime'>('config');

  // Form state
  const [repoUrl, setRepoUrl] = useState(initialRepoUrl ?? '');
  const [workingDir, setWorkingDir] = useState(initialWorkingDir ?? '');
  const [projectBrief, setProjectBrief] = useState(initialProjectBrief ?? '');
  const [projectType, setProjectType] = useState(PROJECT_TYPE_OPTIONS[0]);
  const [techStack, setTechStack] = useState<string[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // Local Directory Discovery & Absolute Path Resolution State
  const [localDirs, setLocalDirs] = useState<Array<{ id: string; label: string; path: string }>>([]);
  const [resolvedPathInfo, setResolvedPathInfo] = useState<{
    raw: string;
    resolved: string;
    exists: boolean;
    isDirectory: boolean;
    autoDiscovered?: boolean;
    suggestions?: string[];
  } | null>(null);

  // AI Provider & Model state
  const [localConfiguredKeys, setLocalConfiguredKeys] = useState<Record<string, boolean>>({});
  const [selectedProvider, setSelectedProvider] = useState<string>(() => {
    const configuredProv = PROVIDER_CATALOG.find((p) => configuredKeys?.[p.apiKeyName]);
    return configuredProv ? configuredProv.id : 'gemini';
  });

  const currentProviderOption =
    PROVIDER_CATALOG.find((p) => p.id === selectedProvider) || PROVIDER_CATALOG[0];

  const [selectedModel, setSelectedModel] = useState<string>(() => {
    const defM = currentProviderOption.models.find((m) => m.isDefault);
    return defM ? defM.id : currentProviderOption.models[0]?.id || '';
  });

  const handleProviderSelect = (provId: string) => {
    setSelectedProvider(provId);
    const prov = PROVIDER_CATALOG.find((p) => p.id === provId);
    if (prov && prov.models.length > 0) {
      const defM = prov.models.find((m) => m.isDefault) || prov.models[0];
      setSelectedModel(defM.id);
    }
    setInlineApiKey('');
    setShowKeyChange(false);
  };

  // Inline API Key Management state
  const [inlineApiKey, setInlineApiKey] = useState('');
  const [showKeyChange, setShowKeyChange] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [keySaveSuccess, setKeySaveSuccess] = useState(false);
  const [keySaveError, setKeySaveError] = useState<string | null>(null);

  const activeKeyName = currentProviderOption.apiKeyName;
  const isKeyConfigured = Boolean(
    localConfiguredKeys[activeKeyName] ?? configuredKeys?.[activeKeyName],
  );

  const handleSaveApiKey = async () => {
    const trimmed = inlineApiKey.trim();
    if (!trimmed || isSavingKey) return;
    setIsSavingKey(true);
    setKeySaveError(null);
    try {
      const res = await fetch('/api/settings/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [activeKeyName]: trimmed }),
      });
      if (res.ok) {
        setLocalConfiguredKeys((prev) => ({ ...prev, [activeKeyName]: true }));
        setInlineApiKey('');
        setShowKeyChange(false);
        setKeySaveSuccess(true);
        setTimeout(() => setKeySaveSuccess(false), 3500);
      } else {
        const text = await res.text();
        setKeySaveError(text || 'Failed to save key');
      }
    } catch (err: any) {
      setKeySaveError(err?.message || 'Network error saving key');
    } finally {
      setIsSavingKey(false);
    }
  };

  // Status / session state
  const [status, setStatus] = useState<DockStatus>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [isInitialized, setIsInitialized] = useState(hasConfig);

  // Runtime Process Monitoring State
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [runStartTime, setRunStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [exploreReport, setExploreReport] = useState<any>(null);
  const [buildStats, setBuildStats] = useState<{ zonesCreated: number; agentsCreated: number; mcpsAttached: number } | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [runtimeEvents, setRuntimeEvents] = useState<RuntimeEvent[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const termLogsRef = useRef<HTMLDivElement>(null);

  // Buffer fast-streaming text/thought deltas via requestAnimationFrame to prevent DOM thrashing
  const pendingThoughtRef = useRef<{ delta: string; ts: string } | null>(null);
  const pendingTextRef = useRef<{ delta: string; ts: string } | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const flushDeltas = useCallback(() => {
    rafIdRef.current = null;
    const thought = pendingThoughtRef.current;
    const text = pendingTextRef.current;
    pendingThoughtRef.current = null;
    pendingTextRef.current = null;

    if (!thought && !text) return;

    setRuntimeEvents((prev) => {
      let next = prev;
      if (thought && thought.delta) {
        const last = next[next.length - 1];
        if (last && last.type === 'thought') {
          next = [
            ...next.slice(0, -1),
            { ...last, content: last.content + thought.delta },
          ];
        } else {
          next = [
            ...next,
            {
              id: `thought_${Date.now()}_${Math.random()}`,
              type: 'thought',
              title: 'Agent Reasoning',
              content: thought.delta,
              timestamp: thought.ts,
            },
          ];
        }
      }
      if (text && text.delta) {
        const last = next[next.length - 1];
        if (last && last.type === 'text') {
          next = [
            ...next.slice(0, -1),
            { ...last, content: last.content + text.delta },
          ];
        } else {
          next = [
            ...next,
            {
              id: `text_${Date.now()}_${Math.random()}`,
              type: 'text',
              content: text.delta,
              timestamp: text.ts,
            },
          ];
        }
      }
      return next;
    });
  }, []);

  const scheduleFlush = useCallback(() => {
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(flushDeltas);
    }
  }, [flushDeltas]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Dynamic build phase calculation based on real-time tool events
  const currentBuildPhase = useMemo(() => {
    if (status === 'deployed') return 6;
    if (status !== 'building') return 1;

    const hasSubmitBuild = runtimeEvents.some((e) => e.toolName === 'submit_build_complete');
    if (hasSubmitBuild) return 6;

    const hasAudit = runtimeEvents.some(
      (e) => e.toolName === 'canvas_audit_ui' || e.toolName === 'canvas_check_layout',
    );
    if (hasAudit) return 5;

    const hasAttachMcp = runtimeEvents.some(
      (e) => e.toolName === 'canvas_attach_mcp' || e.toolName === 'connect_mcp',
    );
    if (hasAttachMcp) return 4;

    const hasMemory = runtimeEvents.some(
      (e) =>
        e.toolName === 'canvas_update_agent_memory' ||
        e.toolName === 'canvas_cascade_memory' ||
        e.toolName === 'manage_agent_memory',
    );
    if (hasMemory) return 3;

    const hasAgents = runtimeEvents.some(
      (e) => e.toolName === 'canvas_create_agent' || e.toolName === 'canvas_connect_agents',
    );
    if (hasAgents) return 2;

    return 1;
  }, [status, runtimeEvents]);

  // Polling ref
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dirInputRef = useRef<HTMLInputElement>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  // Fetch local server directories on mount
  useEffect(() => {
    fetch('/api/settings/local-dirs')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.directories)) {
          setLocalDirs(data.directories);
        }
      })
      .catch(() => {});
  }, []);

  // Debounced absolute path resolution
  useEffect(() => {
    if (!workingDir.trim()) {
      setResolvedPathInfo(null);
      return;
    }
    const timer = setTimeout(() => {
      fetch('/api/settings/resolve-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: workingDir.trim() }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data && typeof data.resolved === 'string') {
            setResolvedPathInfo(data);
          }
        })
        .catch(() => {});
    }, 150);
    return () => clearTimeout(timer);
  }, [workingDir]);

  // Auto-scroll terminal log directly without triggering parent container reflow or page jumps
  useEffect(() => {
    if (autoScroll && termLogsRef.current) {
      termLogsRef.current.scrollTop = termLogsRef.current.scrollHeight;
    }
  }, [runtimeEvents, autoScroll]);

  // Track elapsed run time
  const isBusy = status === 'exploring' || status === 'building';
  useEffect(() => {
    if (isBusy && !runStartTime) {
      setRunStartTime(Date.now());
    } else if (!isBusy) {
      setRunStartTime(null);
    }
  }, [isBusy, runStartTime]);

  useEffect(() => {
    if (!isBusy || !runStartTime) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - runStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [runStartTime, isBusy]);

  // Reactive WebSocket listener for real-time agent output & lifecycle
  useEffect(() => {
    const unsub = useSpaceStore.getState().addWsListener((msg: any) => {
      if (!msg) return;

      const isCurrentAgent = activeAgentId && (msg.agentId === activeAgentId || msg.data?.agentId === activeAgentId);

      if (isCurrentAgent) {
        const ts = msg.data?.timestamp
          ? new Date(msg.data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        if (msg.type === 'run_event') {
          const { eventType, payload } = msg.data || {};

          if (eventType === 'step.started') {
            flushDeltas();
            setRuntimeEvents((prev) => [
              ...prev,
              {
                id: `step_${Date.now()}_${Math.random()}`,
                type: 'step',
                title: `Step ${payload?.step || ''}`,
                content: `Step ${payload?.step || ''} started`,
                timestamp: ts,
                status: 'running',
              },
            ]);
          } else if (eventType === 'text.thought') {
            const delta = payload?.delta || '';
            if (delta) {
              if (!pendingThoughtRef.current) {
                pendingThoughtRef.current = { delta, ts };
              } else {
                pendingThoughtRef.current.delta += delta;
              }
              scheduleFlush();
            }
          } else if (eventType === 'tool.started') {
            flushDeltas();
            setRuntimeEvents((prev) => [
              ...prev,
              {
                id: `tool_${payload?.toolCallId || Date.now()}`,
                type: 'tool',
                toolName: payload?.toolName || 'tool',
                args: payload?.args,
                content: `Executing tool: ${payload?.toolName || 'tool'}`,
                timestamp: ts,
                status: 'running',
              },
            ]);
          } else if (eventType === 'tool.completed') {
            flushDeltas();
            const toolId = payload?.toolCallId;
            setRuntimeEvents((prev) =>
              prev.map((ev) =>
                ev.id === `tool_${toolId}`
                  ? {
                      ...ev,
                      status: 'success',
                      result: payload?.result,
                      content: `✓ Completed: ${ev.toolName || 'tool'}`,
                    }
                  : ev,
              ),
            );
          } else if (eventType === 'tool.failed') {
            flushDeltas();
            const toolId = payload?.toolCallId;
            setRuntimeEvents((prev) =>
              prev.map((ev) =>
                ev.id === `tool_${toolId}`
                  ? {
                      ...ev,
                      status: 'error',
                      content: `✖ Failed ${ev.toolName || 'tool'}: ${payload?.error || ''}`,
                    }
                  : ev,
              ),
            );
          } else if (eventType === 'text.delta') {
            const delta = payload?.delta || '';
            if (delta) {
              if (!pendingTextRef.current) {
                pendingTextRef.current = { delta, ts };
              } else {
                pendingTextRef.current.delta += delta;
              }
              scheduleFlush();
            }
          }
        }
      }

      // Explore / Build Lifecycle events
      if (sessionId && msg.sessionId === sessionId) {
        if (msg.type === 'explore_started' && msg.explorerAgentId) {
          setActiveAgentId(msg.explorerAgentId);
          setStatus('exploring');
          setStatusMsg('Company Creator agent is exploring codebase...');
        } else if (msg.type === 'build_started' && msg.architectAgentId) {
          setActiveAgentId(msg.architectAgentId);
          setStatus('building');
          setStatusMsg('Architect agent is deploying team on canvas...');
        } else if (msg.type === 'build_complete') {
          stopPolling();
          setStatus('deployed');
          setStatusMsg('Company team successfully deployed on Canvas!');
          setLastSynced(new Date());
          if (msg.stats) {
            setBuildStats(msg.stats);
          }
          setRuntimeEvents((prev) => [
            ...prev,
            {
              id: `bld_done_${Date.now()}`,
              type: 'system',
              content: `🎉 Build Complete: ${msg.summary || 'All company agents and zones deployed to Canvas.'}`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            },
          ]);
          void useSpaceStore.getState().reloadCanvasData();
        } else if (msg.type === 'explore_complete') {
          setStatus('synced');
          setStatusMsg('Exploration complete! Team hierarchy planned.');
          if (msg.report) setExploreReport(msg.report);
        } else if (msg.type === 'explore_failed' || msg.type === 'build_failed') {
          setStatus('error');
          setStatusMsg(msg.error || 'Agent encountered an error');
          setRuntimeEvents((prev) => [
            ...prev,
            {
              id: `err_${Date.now()}`,
              type: 'error',
              content: `Error: ${msg.error || 'Execution failed'}`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            },
          ]);
        }
      }
    });

    return unsub;
  }, [activeAgentId, sessionId]);

  // Polling logic
  const startPolling = useCallback((sid: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const session = await SpaceService.getExploreSession(sid);
        const s = session?.status ?? session?.session?.status;
        if (session?.explorer_agent_id && !activeAgentId) {
          setActiveAgentId(session.explorer_agent_id);
        }
        if (session?.explore_report_json && !exploreReport) {
          try {
            setExploreReport(JSON.parse(session.explore_report_json));
          } catch {}
        }

        if (s === 'built' || s === 'deployed') {
          stopPolling();
          setStatus('deployed');
          setStatusMsg('Company team successfully deployed on Canvas!');
          setLastSynced(new Date());
          void useSpaceStore.getState().reloadCanvasData();
          setRuntimeEvents((prev) => [
            ...prev,
            {
              id: `poll_done_${Date.now()}`,
              type: 'system',
              content: `🎉 Company team successfully deployed to Canvas!`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            },
          ]);
        } else if (s === 'building' || s === 'build') {
          setStatus('building');
          setStatusMsg('Architect agent is deploying company agents & zones...');
        } else if (s === 'completed' || s === 'complete') {
          setStatus((prev) => (prev === 'building' || prev === 'deployed' ? prev : 'synced'));
          setStatusMsg((prev) => (prev.includes('deploying') || prev.includes('deployed') ? prev : 'Team structure planned. Ready to deploy agents.'));
          setLastSynced(new Date());
          if (session?.explore_report_json) {
            try {
              setExploreReport(JSON.parse(session.explore_report_json));
            } catch {}
          }
        } else if (s === 'failed' || s === 'error') {
          stopPolling();
          setStatus('error');
          setStatusMsg(session?.error ?? 'Exploration failed. Please try again.');
        } else {
          setStatus('exploring');
          setStatusMsg('Company Creator agent is exploring project...');
        }
      } catch (err: any) {
        stopPolling();
        setStatus('error');
        setStatusMsg(err?.message ?? 'Failed to get session status.');
      }
    }, 2500);
  }, [stopPolling, activeAgentId, exploreReport]);

  // Rehydrate existing explore/build session on mount or spaceId change
  useEffect(() => {
    if (!spaceId) return;

    let isMounted = true;

    async function rehydrateSession() {
      try {
        const sessions = await SpaceService.listExploreSessions(spaceId);
        if (!isMounted || !Array.isArray(sessions) || sessions.length === 0) return;

        // Take the latest session for this space
        const session = sessions[0];
        if (!session || !session.id) return;

        setSessionId(session.id);

        // Restore inputs if not already filled by user
        if (session.brief_markdown) {
          setProjectBrief((prev) => prev || session.brief_markdown);
        }
        if (session.git_url) {
          setRepoUrl((prev) => prev || session.git_url);
          setSourceType('git');
        } else if (session.git_local_path) {
          setWorkingDir((prev) => prev || session.git_local_path);
          setSourceType('folder');
        }
        if (session.tech_stack_json) {
          try {
            const parsedStack = JSON.parse(session.tech_stack_json);
            if (Array.isArray(parsedStack) && parsedStack.length > 0) {
              setTechStack((prev) => (prev.length === 0 ? parsedStack : prev));
            }
          } catch {}
        }
        if (session.attached_docs_json) {
          try {
            const parsedDocs = JSON.parse(session.attached_docs_json);
            if (Array.isArray(parsedDocs) && parsedDocs.length > 0) {
              setAttachedFiles((prev) => (prev.length === 0 ? parsedDocs : prev));
            }
          } catch {}
        }
        if (session.provider) {
          setSelectedProvider(session.provider);
        }
        if (session.model) {
          setSelectedModel(session.model);
        }

        const activeAgent = session.architect_agent_id || session.explorer_agent_id;
        if (activeAgent) {
          setActiveAgentId(activeAgent);
        }

        if (session.explore_report_json) {
          try {
            setExploreReport(JSON.parse(session.explore_report_json));
          } catch {}
        }

        const s = session.status;
        if (s === 'exploring') {
          setStatus('exploring');
          setStatusMsg('Company Creator agent is exploring codebase...');
          setActiveTab('runtime');
          startPolling(session.id);
        } else if (s === 'building') {
          setStatus('building');
          setStatusMsg('Architect agent is deploying team on canvas...');
          setActiveTab('runtime');
          startPolling(session.id);
        } else if (s === 'synced' || s === 'complete' || s === 'completed') {
          setStatus('synced');
          setStatusMsg('Exploration complete! Team hierarchy planned.');
          setActiveTab('runtime');
          setLastSynced(new Date(session.updated_at || Date.now()));
        } else if (s === 'built' || s === 'deployed') {
          setStatus('deployed');
          setStatusMsg('Company team successfully deployed on Canvas!');
          setActiveTab('runtime');
          setLastSynced(new Date(session.updated_at || Date.now()));
        } else if (s === 'failed') {
          setStatus('error');
          setStatusMsg('Session encountered an issue.');
        }

        // Fetch reconstructed terminal logs
        try {
          const eventsData = await SpaceService.getExploreEvents(session.id);
          if (isMounted && Array.isArray(eventsData?.events) && eventsData.events.length > 0) {
            setRuntimeEvents(eventsData.events);
          }
        } catch (e) {
          console.warn('[SpaceProjectDock] Could not load historical runtime events:', e);
        }
      } catch (err) {
        console.warn('[SpaceProjectDock] Failed to rehydrate session:', err);
      }
    }

    void rehydrateSession();

    return () => {
      isMounted = false;
    };
  }, [spaceId, startPolling]);

  // Compute total characters and estimated tokens
  const totalChars = attachedFiles.reduce((acc, f) => acc + f.chars, 0);
  const estimatedTokens = Math.round(totalChars / CHARS_PER_TOKEN);
  const tokenPct = Math.min(100, Math.round((estimatedTokens / MAX_TOKENS) * 100));
  const isOverTokenLimit = estimatedTokens > MAX_TOKENS;

  // Initialize Team
  const handleInitialize = useCallback(async () => {
    if (status === 'exploring' || status === 'building') return;
    if (isOverTokenLimit) {
      setStatus('error');
      setStatusMsg(`Attached files exceed 60,000 token limit (${estimatedTokens.toLocaleString()} tokens). Remove some files to proceed.`);
      return;
    }
    if (!isKeyConfigured) {
      setStatus('error');
      setStatusMsg(`Missing API key for ${currentProviderOption.name} (${activeKeyName}). Enter your key to proceed.`);
      return;
    }

    const effectiveWorkingDir = resolvedPathInfo?.resolved || workingDir;

    setStatus('exploring');
    setStatusMsg('Company Creator agent is analyzing project...');
    setIsOpen(true);
    setActiveTab('runtime'); // Automatically switch to runtime process view!

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setRuntimeEvents([
      {
        id: `sys_${Date.now()}_1`,
        type: 'system',
        content: `🚀 Initializing Company Creator Agent for "${companyName}"...`,
        timestamp: now,
      },
      {
        id: `sys_${Date.now()}_2`,
        type: 'system',
        content: `📦 Sandboxing to Canvas Space: "${companyName}" (${spaceId})`,
        timestamp: now,
      },
      {
        id: `sys_${Date.now()}_3`,
        type: 'system',
        content: `🧠 AI Intelligence Model: ${selectedModel} via ${currentProviderOption.name}`,
        timestamp: now,
      },
      ...(effectiveWorkingDir
        ? [
            {
              id: `sys_${Date.now()}_4`,
              type: 'system' as const,
              content: `📂 Attached Absolute Project Folder: ${effectiveWorkingDir}`,
              timestamp: now,
            },
          ]
        : []),
      ...(sourceType === 'git' && repoUrl
        ? [
            {
              id: `sys_${Date.now()}_5`,
              type: 'system' as const,
              content: `🌐 Remote Git Repository: ${repoUrl}`,
              timestamp: now,
            },
          ]
        : []),
      {
        id: `sys_${Date.now()}_6`,
        type: 'system',
        content: `⚡ Autonomous exploration loop started. Reading codebase architecture...`,
        timestamp: now,
      },
    ]);

    onUpdateSpace({
      repoUrl: sourceType === 'git' ? repoUrl : undefined,
      workingDir: sourceType === 'folder' ? effectiveWorkingDir : undefined,
      projectBrief,
    });

    try {
      const { session, explorerAgentId } = await SpaceService.startExplore({
        space_id: spaceId,
        company_name: companyName,
        brief_markdown: projectBrief ? `[Type: ${projectType}]\n\n${projectBrief}` : `[Type: ${projectType}]`,
        git_url: sourceType === 'git' && repoUrl ? repoUrl : undefined,
        git_local_path: sourceType === 'folder' && effectiveWorkingDir ? effectiveWorkingDir : undefined,
        tech_stack: techStack.length ? techStack : undefined,
        attached_docs: attachedFiles.map((f) => ({ filename: f.filename, content: f.content })),
        provider: selectedProvider,
        model: selectedModel,
      });
      const sid = session?.id ?? session?.session_id ?? session?._id;
      setSessionId(sid);
      if (explorerAgentId) {
        setActiveAgentId(explorerAgentId);
      }
      setIsInitialized(true);
      startPolling(sid);
    } catch (err: any) {
      stopPolling();
      setStatus('error');
      setStatusMsg(err?.message ?? 'Failed to start explore.');
      setRuntimeEvents((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          type: 'error',
          content: `Failed to start explorer agent: ${err?.message || 'Unknown error'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
      ]);
    }
  }, [
    status,
    isOverTokenLimit,
    estimatedTokens,
    isKeyConfigured,
    currentProviderOption.name,
    activeKeyName,
    spaceId,
    companyName,
    projectBrief,
    projectType,
    sourceType,
    repoUrl,
    workingDir,
    resolvedPathInfo,
    techStack,
    attachedFiles,
    selectedProvider,
    selectedModel,
    onUpdateSpace,
    startPolling,
    stopPolling,
  ]);

  // Sync Up
  const handleSync = useCallback(async () => {
    if (status === 'exploring' || status === 'building') return;
    if (!sessionId) {
      handleInitialize();
      return;
    }
    setStatus('exploring');
    setStatusMsg('Re-syncing project drift...');
    setActiveTab('runtime');
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setRuntimeEvents((prev) => [
      ...prev,
      {
        id: `sync_${Date.now()}`,
        type: 'system',
        content: `🔄 Drift Sync Triggered: Inspecting file changes and updating agent memories...`,
        timestamp: now,
      },
    ]);
    try {
      await SpaceService.syncExplore(sessionId);
      startPolling(sessionId);
    } catch (err: any) {
      setStatus('error');
      setStatusMsg(err?.message ?? 'Sync failed.');
    }
  }, [status, sessionId, handleInitialize, startPolling]);

  // Accept & Deploy Team
  const handleAccept = useCallback(async () => {
    if (!sessionId) return;
    setStatus('building');
    setStatusMsg('Deploying team hierarchy on canvas...');
    setActiveTab('runtime');
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setRuntimeEvents((prev) => [
      ...prev,
      {
        id: `build_${Date.now()}`,
        type: 'system',
        content: `🏗 Phase 2 Initiated: Architect Agent deploying complete department hierarchy to Canvas...`,
        timestamp: now,
      },
    ]);
    try {
      const res = await SpaceService.acceptExploreReport(sessionId, {
        provider: selectedProvider,
        model: selectedModel,
      });
      if (res?.architectAgentId) {
        setActiveAgentId(res.architectAgentId);
      }
      startPolling(sessionId);
    } catch (err: any) {
      stopPolling();
      setStatus('error');
      setStatusMsg(err?.message ?? 'Failed to deploy team.');
    }
  }, [sessionId, selectedProvider, selectedModel, startPolling, stopPolling]);

  // Stop Active Agent
  const handleStopActiveAgent = useCallback(async () => {
    if (!activeAgentId) return;
    try {
      await fetch(`/api/agents/${encodeURIComponent(activeAgentId)}/stop`, { method: 'POST' });
      setStatus('idle');
      setStatusMsg('Agent execution stopped.');
      stopPolling();
      setRuntimeEvents((prev) => [
        ...prev,
        {
          id: `stop_${Date.now()}`,
          type: 'error',
          content: `🛑 Agent run manually stopped by user.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      console.warn('Failed to stop agent:', err);
    }
  }, [activeAgentId, stopPolling]);

  // Open Full SmokeMonkey Terminal Drawer
  const handleOpenAgentDrawer = useCallback(() => {
    if (!activeAgentId) return;
    const allAgents = useSpaceStore.getState().agents;
    const target = allAgents.find((a) => a.id === activeAgentId) || {
      id: activeAgentId,
      name: status === 'building' ? `Architect — ${companyName}` : `Explorer — ${companyName}`,
      model: selectedModel,
      provider: selectedProvider,
      status: 'working',
    };
    useSpaceStore.getState().setActiveDrawerAgentId(activeAgentId);
    onOpenDrawer?.(target as any);
  }, [activeAgentId, status, companyName, selectedModel, selectedProvider, onOpenDrawer]);

  // Multiple File Processing (MD, TXT, JSON, YAML)
  const processFiles = useCallback((files: FileList | File[]) => {
    const newItems: AttachedFile[] = [];
    const readPromises: Promise<void>[] = [];

    Array.from(files).forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isDoc = ['md', 'markdown', 'txt', 'json', 'yaml', 'yml', 'toml', 'ts', 'js', 'py', 'sh'].includes(ext);
      // Skip binary files or single files larger than 1MB
      if (!isDoc && file.size > 1024 * 1024) return;

      const p = new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const content = typeof reader.result === 'string' ? reader.result : '';
          const rel = (file as any).webkitRelativePath || file.name;
          newItems.push({
            filename: file.name,
            relativePath: rel !== file.name ? rel : undefined,
            content,
            chars: content.length,
          });
          resolve();
        };
        reader.onerror = () => resolve();
        reader.readAsText(file);
      });
      readPromises.push(p);
    });

    Promise.all(readPromises).then(() => {
      if (newItems.length) {
        setAttachedFiles((prev) => {
          const map = new Map<string, AttachedFile>();
          prev.forEach((f) => map.set(f.filename, f));
          newItems.forEach((f) => map.set(f.filename, f));
          return Array.from(map.values());
        });
      }
    });
  }, []);

  // Drag & drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files?.length) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      processFiles(e.target.files);
    }
  }, [processFiles]);

  // Folder Browsing Picker: calls backend native OS picker first, then falls back to browser picker
  const handleFolderBrowse = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/browse-directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.path) {
          setWorkingDir(data.path);
          setSourceType('folder');
          return;
        }
        if (data.cancelled) {
          // User intentionally closed or cancelled the native dialog
          return;
        }
      }
    } catch {
      // Native picker not available, fall back to browser picker
    }

    try {
      if ('showDirectoryPicker' in window) {
        const handle = await (window as any).showDirectoryPicker();
        if (handle?.name) {
          setWorkingDir(handle.name);
          setSourceType('folder');
        }
      } else {
        dirInputRef.current?.click();
      }
    } catch {
      // User cancelled
    }
  }, []);

  const handleDirInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const rel = (files[0] as any).webkitRelativePath;
      const topDir = rel ? rel.split('/')[0] : '';
      if (topDir) {
        setWorkingDir(topDir);
        setSourceType('folder');
      }
      // Also automatically ingest top-level markdown documentation files found in folder
      const docFiles = Array.from(files).filter((f) => {
        const name = f.name.toLowerCase();
        return name.endsWith('.md') || name === 'package.json' || name === 'cargo.toml';
      }).slice(0, 10);
      if (docFiles.length > 0) {
        processFiles(docFiles);
      }
    }
  }, [processFiles]);

  const removeFile = useCallback((filename: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.filename !== filename));
  }, []);

  const toggleTech = useCallback((tech: string) => {
    setTechStack((prev) =>
      prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech],
    );
  }, []);

  // Status badge label
  const statusLabel = (): string => {
    if (status === 'idle') return 'Ready';
    if (status === 'exploring') return 'Exploring';
    if (status === 'building') return 'Deploying';
    if (status === 'synced') return lastSynced ? `Planned ${formatTime(lastSynced)}` : 'Planned';
    if (status === 'deployed') return 'Deployed Live';
    if (status === 'error') return 'Error';
    return 'Ready';
  };

  // Pipeline phases computation
  const getPipelinePhases = () => {
    const phases = [
      { id: 1, label: 'Ingesting Brief & Docs', sub: 'Parsing requirements & workspace files' },
      { id: 2, label: 'Scanning Code Architecture', sub: 'Reading directories & API contracts' },
      { id: 3, label: 'Feature Boundary Mapping', sub: 'Isolating backend, frontend & data squads' },
      { id: 4, label: 'Role & Clearance Planning', sub: 'Specifying agent clearance & manager hierarchy' },
      { id: 5, label: 'Team Synthesis & Ready', sub: 'Master report synthesized for canvas deployment' },
    ];

    let currentStep = 1;
    if (status === 'synced' || status === 'building' || status === 'deployed') {
      currentStep = 5;
    } else if (status === 'exploring') {
      const toolEvents = runtimeEvents.filter((e) => e.type === 'tool' || e.type === 'step');
      if (toolEvents.length > 8) currentStep = 4;
      else if (toolEvents.length > 4) currentStep = 3;
      else if (toolEvents.length > 1) currentStep = 2;
      else currentStep = 1;
    }
    return { currentStep, phases };
  };

  // Responsive Dimensions based on Space Node Size (proportional expansion)
  const dynamicCenteredWidth = Math.min(1800, Math.max(580, Math.round(spaceWidth * 0.88)));
  const dynamicCenteredMaxHeight = Math.max(480, spaceHeight - 56);
  const isWideLayout = isCenteredMode && dynamicCenteredWidth >= 760;
  // Side dock expands in width and height proportional to the workspace space size
  const dynamicSideWidth = Math.min(680, Math.max(340, Math.round(spaceWidth * 0.32)));
  const dynamicSideMaxHeight = Math.max(460, spaceHeight - 32);

  return (
    <div
      className={`spd-outer nodrag nopan ${isCenteredMode ? 'is-centered' : 'is-side'} ${isWideLayout ? 'is-wide-layout' : ''}`}
      style={{
        ['--spd-color' as any]: color,
        width: isCenteredMode ? `${dynamicCenteredWidth}px` : `${dynamicSideWidth}px`,
        maxHeight: isCenteredMode ? `${dynamicCenteredMaxHeight}px` : `${dynamicSideMaxHeight}px`,
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* ── Top Header Bar ── */}
      <div
        className="spd-header nodrag nopan"
        onClick={(e) => {
          e.stopPropagation();
          if (!isCenteredMode) {
            setIsOpen((v) => !v);
          }
        }}
      >
        <div className="spd-header-left">
          <div className="spd-header-icon" style={{ background: `${color}1a`, color, borderColor: `${color}40` }}>
            {isBusy ? <RefreshCw size={13} className="spd-spinning" /> : <Rocket size={13} />}
          </div>
          <div className="spd-header-titles">
            <span className="spd-header-title">
              {isCenteredMode ? `Launch AI Team · ${companyName}` : `${companyName} Project`}
            </span>
            {isCenteredMode && (
              <span className="spd-header-subtitle">
                Autonomous Company Creator agent explores code architecture &amp; deploys specialized team
              </span>
            )}
          </div>
        </div>

        {/* Tab Switcher: Setup & Config vs Live Runtime Process */}
        <div className="spd-tab-switcher nodrag nopan">
          <button
            type="button"
            className={`spd-tab-btn ${activeTab === 'config' ? 'active' : ''} nodrag nopan`}
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab('config');
            }}
          >
            <Layers size={11} />
            <span>Setup &amp; Config</span>
          </button>
          <button
            type="button"
            className={`spd-tab-btn ${activeTab === 'runtime' ? 'active' : ''} nodrag nopan`}
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab('runtime');
            }}
          >
            <Terminal size={11} />
            <span>Live Runtime Process</span>
            {isBusy && <span className="spd-live-dot" />}
          </button>
        </div>

        <div className="spd-header-right">
          {/* Status badge */}
          <span className={`spd-status-badge ${status}`}>{statusLabel()}</span>

          {/* Sync Button */}
          {isInitialized && (
            <button
              type="button"
              className="spd-header-action-btn sync-btn nodrag nopan"
              title="Re-sync project changes & drift"
              onClick={(e) => {
                e.stopPropagation();
                handleSync();
              }}
            >
              <RefreshCw size={11} className={isBusy ? 'spd-spinning' : ''} />
              <span>Sync</span>
            </button>
          )}

          {/* In side mode when no agents: button to center back into space */}
          {!isCenteredMode && !hasAgents && onCenterDock && (
            <button
              type="button"
              className="spd-header-action-btn nodrag nopan"
              title="Expand inside space room"
              onClick={(e) => {
                e.stopPropagation();
                onCenterDock();
              }}
            >
              <Maximize2 size={11} />
            </button>
          )}

          {/* In centered mode: Close / Cross button to dismiss to side */}
          {isCenteredMode && onDismissToSide && (
            <button
              type="button"
              className="spd-close-btn nodrag nopan"
              title="Dock to side panel"
              onClick={(e) => {
                e.stopPropagation();
                onDismissToSide();
              }}
            >
              <X size={13} />
            </button>
          )}

          {/* In side mode: Collapse / Expand Chevron */}
          {!isCenteredMode && (
            <button
              type="button"
              className={`spd-chevron-btn ${isOpen ? 'open' : ''} nodrag nopan`}
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen((v) => !v);
              }}
            >
              <ChevronDown size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Hidden file inputs ── */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />
      <input
        ref={dirInputRef}
        type="file"
        // @ts-expect-error webkitdirectory attribute
        webkitdirectory=""
        directory=""
        style={{ display: 'none' }}
        onChange={handleDirInputChange}
      />

      {/* ── Body: Tab 1 Setup & Config vs Tab 2 Live Runtime Process ── */}
      {isOpen && (
        <div className="spd-body nodrag nopan">
          {activeTab === 'config' ? (
            <div className="spd-layout-columns">
              {/* ── Left / Primary Column ── */}
              <div className="spd-col-primary">
                {/* Project Source: Local Folder vs Git URL */}
                <div className="spd-field">
                  <div className="spd-field-header">
                    <label className="spd-label">
                      <span>Project Location</span>
                    </label>
                    {/* Minimalist Segmented Switch */}
                    <div className="spd-source-segmented">
                      <button
                        type="button"
                        className={`spd-seg-btn ${sourceType === 'folder' ? 'active' : ''} nodrag nopan`}
                        onClick={(e) => { e.stopPropagation(); setSourceType('folder'); }}
                      >
                        <FolderOpen size={10} />
                        <span>Local Folder</span>
                      </button>
                      <button
                        type="button"
                        className={`spd-seg-btn ${sourceType === 'git' ? 'active' : ''} nodrag nopan`}
                        onClick={(e) => { e.stopPropagation(); setSourceType('git'); }}
                      >
                        <GitBranch size={10} />
                        <span>Git Repo</span>
                      </button>
                    </div>
                  </div>

                  {sourceType === 'folder' ? (
                    <>
                      <div className="spd-input-with-action">
                        <input
                          className="spd-input nodrag nopan"
                          type="text"
                          placeholder="/Users/.../project-folder or ./my-app"
                          value={workingDir}
                          onChange={(e) => setWorkingDir(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        />
                        <button
                          type="button"
                          className="spd-input-action-btn nodrag nopan"
                          title="Browse directory on computer"
                          onClick={(e) => { e.stopPropagation(); handleFolderBrowse(); }}
                        >
                          <FolderOpen size={12} />
                          <span>Browse</span>
                        </button>
                      </div>

                      {/* Prominent Absolute Filesystem Path Display */}
                      {workingDir.trim() && resolvedPathInfo && (
                        <div className={`spd-resolved-path-bar ${resolvedPathInfo.exists ? 'is-valid' : 'is-warning'} nodrag nopan`}>
                          <div className="spd-path-row">
                            <Folder size={12} className="spd-path-icon" />
                            <span className="spd-path-title">Absolute Project Path:</span>
                            <code className="spd-path-text" title={resolvedPathInfo.resolved}>
                              {resolvedPathInfo.resolved}
                            </code>
                          </div>
                          <div className="spd-path-meta-row">
                            <span className={`spd-path-pill ${resolvedPathInfo.exists ? 'exists' : 'missing'}`}>
                              {resolvedPathInfo.exists
                                ? (resolvedPathInfo.autoDiscovered
                                    ? '✓ Auto-discovered on Disk'
                                    : (resolvedPathInfo.isDirectory ? '✓ Valid Directory on Disk' : '✓ Valid File'))
                                : '⚠ Path not found on server'}
                            </span>
                            {resolvedPathInfo.exists && resolvedPathInfo.resolved !== workingDir && (
                              <button
                                type="button"
                                className="spd-use-absolute-btn nodrag nopan"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setWorkingDir(resolvedPathInfo.resolved);
                                }}
                                title="Use this resolved absolute path"
                              >
                                Set as Working Dir
                              </button>
                            )}
                          </div>
                          {!resolvedPathInfo.exists && (
                            <div className="spd-path-help-hint">
                              <span>Looked inside canvas root, parent folder, and desktop.</span>
                              {resolvedPathInfo.suggestions && resolvedPathInfo.suggestions.length > 0 && (
                                <div className="spd-suggestions-row">
                                  <span className="spd-suggest-label">Did you mean:</span>
                                  {resolvedPathInfo.suggestions.map((sug) => (
                                    <button
                                      key={sug}
                                      type="button"
                                      className="spd-suggestion-chip nodrag nopan"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setWorkingDir(sug);
                                      }}
                                    >
                                      {sug.split(/[/\\]/).pop()}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Quick Local Directory Presets */}
                      {localDirs.length > 0 && (
                        <div className="spd-dir-presets-wrap nodrag nopan">
                          <span className="spd-dir-presets-label">Quick Root:</span>
                          <div className="spd-dir-presets-list">
                            {localDirs.map((dir) => (
                              <button
                                key={dir.id}
                                type="button"
                                className={`spd-dir-preset-chip ${workingDir === dir.path || resolvedPathInfo?.resolved === dir.path ? 'active' : ''} nodrag nopan`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setWorkingDir(dir.path);
                                  setSourceType('folder');
                                }}
                                title={dir.path}
                              >
                                <Folder size={9} />
                                <span>{dir.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <input
                      className="spd-input nodrag nopan"
                      type="url"
                      placeholder="https://github.com/organization/repository"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                  )}
                </div>

                {/* Project Archetype */}
                <div className="spd-field">
                  <label className="spd-label">
                    <Layers size={11} className="spd-field-icon" />
                    <span>Project Archetype</span>
                  </label>
                  <select
                    className="spd-type-select nodrag nopan"
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    {PROJECT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* AI Architecture Engine & Model Selection */}
                <div className="spd-field">
                  <label className="spd-label">
                    <Cpu size={11} className="spd-field-icon" />
                    <span>AI Architecture Engine</span>
                  </label>

                  <div className="spd-ai-selection-grid">
                    {/* Provider Dropdown */}
                    <div className="spd-ai-field">
                      <span className="spd-sublabel">Provider</span>
                      <select
                        className="spd-type-select nodrag nopan"
                        value={selectedProvider}
                        onChange={(e) => handleProviderSelect(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        {PROVIDER_CATALOG.map((p) => {
                          const isSet = Boolean(localConfiguredKeys[p.apiKeyName] ?? configuredKeys?.[p.apiKeyName]);
                          return (
                            <option key={p.id} value={p.id}>
                              {p.name} {isSet ? '✓' : '(Needs Key)'}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Model Dropdown */}
                    <div className="spd-ai-field">
                      <span className="spd-sublabel">Model</span>
                      <select
                        className="spd-type-select nodrag nopan"
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        {currentProviderOption.models.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* API Key Status / Inline Configuration Card */}
                  {!isKeyConfigured || showKeyChange ? (
                    <div className="spd-key-card missing nodrag nopan">
                      <div className="spd-key-card-header">
                        <div className="spd-key-card-title">
                          <Key size={12} className="spd-key-card-icon" />
                          <span>{currentProviderOption.name} API Key ({activeKeyName})</span>
                        </div>
                        {isKeyConfigured && (
                          <button
                            type="button"
                            className="spd-key-close-btn nodrag nopan"
                            onClick={() => setShowKeyChange(false)}
                            title="Cancel"
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>
                      <span className="spd-key-card-hint">
                        Enter key below to authorize the Creator agent directly in this dock:
                      </span>
                      <div className="spd-key-input-row">
                        <input
                          type="password"
                          className="spd-input spd-key-input nodrag nopan"
                          placeholder={`Paste ${activeKeyName}...`}
                          value={inlineApiKey}
                          onChange={(e) => setInlineApiKey(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveApiKey();
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        />
                        <button
                          type="button"
                          className="spd-key-save-btn nodrag nopan"
                          disabled={!inlineApiKey.trim() || isSavingKey}
                          onClick={handleSaveApiKey}
                        >
                          {isSavingKey ? (
                            <RefreshCw size={11} className="spd-spinning" />
                          ) : (
                            <ShieldCheck size={11} />
                          )}
                          <span>{isSavingKey ? 'Saving...' : 'Save & Connect'}</span>
                        </button>
                      </div>
                      {keySaveError && (
                        <span className="spd-key-error-text">{keySaveError}</span>
                      )}
                    </div>
                  ) : (
                    <div className="spd-key-card ready nodrag nopan">
                      <div className="spd-key-ready-info">
                        <ShieldCheck size={13} className="spd-key-ready-icon" />
                        <span className="spd-key-ready-label">
                          {currentProviderOption.name} Key Active
                        </span>
                      </div>
                      <button
                        type="button"
                        className="spd-key-change-btn nodrag nopan"
                        onClick={() => setShowKeyChange(true)}
                        title="Update API Key"
                      >
                        Change
                      </button>
                    </div>
                  )}

                  {keySaveSuccess && (
                    <div className="spd-key-success-pill">
                      <CheckCircle2 size={11} />
                      <span>API key configured and active!</span>
                    </div>
                  )}
                </div>

                {/* Multi-File Drag & Drop Zone with 60k Token Limit Indicator */}
                <div className="spd-field">
                  <div className="spd-field-header">
                    <label className="spd-label">
                      <FileText size={11} className="spd-field-icon" />
                      <span>Documentation Files ({attachedFiles.length})</span>
                    </label>
                    {/* Token Budget Meter */}
                    <div className={`spd-token-badge ${isOverTokenLimit ? 'over-limit' : tokenPct > 75 ? 'warning' : 'ok'}`}>
                      <span>{estimatedTokens.toLocaleString()} / {MAX_TOKENS.toLocaleString()} tokens ({tokenPct}%)</span>
                    </div>
                  </div>

                  <div
                    className={`spd-dropzone nodrag nopan ${isDragOver ? 'drag-over' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                  >
                    <div className="spd-dz-content">
                      <div className="spd-dz-icon-wrap" style={{ color }}>
                        <Upload size={16} />
                      </div>
                      <div className="spd-dz-text">
                        <span className="spd-dz-primary">Drop multiple .MD or doc files here (or click)</span>
                        <span className="spd-dz-hint">Specs, architecture docs, README, package.json · Up to 60k tokens</span>
                      </div>
                    </div>
                  </div>

                  {/* Token Progress Bar */}
                  {attachedFiles.length > 0 && (
                    <div className="spd-token-progress-bar">
                      <div
                        className={`spd-token-progress-fill ${isOverTokenLimit ? 'over-limit' : tokenPct > 75 ? 'warning' : 'ok'}`}
                        style={{ width: `${Math.min(100, tokenPct)}%` }}
                      />
                    </div>
                  )}

                  {/* Over Limit Warning */}
                  {isOverTokenLimit && (
                    <div className="spd-limit-warning">
                      <AlertCircle size={12} />
                      <span>Token limit exceeded (60k max). Remove files to avoid overloading the AI agent.</span>
                    </div>
                  )}

                  {/* Attached file pills (multiple files supported with location) */}
                  {attachedFiles.length > 0 && (
                    <div className="spd-attached-files">
                      {attachedFiles.map((f) => {
                        const fileTokens = Math.round(f.chars / CHARS_PER_TOKEN);
                        const fullLoc = f.relativePath || (resolvedPathInfo?.resolved ? `${resolvedPathInfo.resolved}/${f.filename}` : f.filename);
                        return (
                          <div key={f.filename} className="spd-file-pill" title={`Path: ${fullLoc}`}>
                            <FileText size={10} style={{ color }} />
                            <span className="spd-file-name">{f.relativePath || f.filename}</span>
                            <span className="spd-file-tokens">~{fileTokens.toLocaleString()}t</span>
                            <button
                              type="button"
                              className="spd-file-remove-btn nodrag nopan"
                              onClick={(e) => { e.stopPropagation(); removeFile(f.filename); }}
                              title="Remove file"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Right / Secondary Column (expands on wide view) ── */}
              <div className="spd-col-secondary">
                {/* Tech Stack Chips */}
                <div className="spd-field">
                  <label className="spd-label">
                    <Sparkles size={11} className="spd-field-icon" />
                    <span>Core Technologies</span>
                  </label>
                  <div className="spd-chips-wrap">
                    {TECH_STACK_OPTIONS.map((tech) => {
                      const selected = techStack.includes(tech);
                      return (
                        <button
                          key={tech}
                          type="button"
                          className={`spd-chip-pill ${selected ? 'is-selected' : ''} nodrag nopan`}
                          onClick={(e) => { e.stopPropagation(); toggleTech(tech); }}
                          onPointerDown={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <span>{tech}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Project Brief */}
                <div className="spd-field">
                  <label className="spd-label">
                    <span>Project Overview &amp; Key Goals</span>
                  </label>
                  <textarea
                    className="spd-textarea nodrag nopan"
                    placeholder="Describe your architecture, goals, microservices, key features, or business requirements..."
                    value={projectBrief}
                    onChange={(e) => setProjectBrief(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    rows={isWideLayout ? 4 : 2}
                  />
                </div>

                {/* Status Alert Banner */}
                {statusMsg && (
                  <div className={`spd-status-banner ${status}`}>
                    {status === 'synced' ? (
                      <CheckCircle2 size={13} className="spd-banner-icon" />
                    ) : status === 'error' ? (
                      <AlertCircle size={13} className="spd-banner-icon" />
                    ) : (
                      <RefreshCw size={13} className="spd-banner-icon spd-spinning" />
                    )}
                    <span className="spd-banner-text">{statusMsg}</span>
                    {isBusy && <ProgressDots />}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="spd-actions-row">
                  {status === 'synced' && sessionId ? (
                    <button
                      type="button"
                      className="spd-btn spd-btn-deploy nodrag nopan"
                      onClick={(e) => { e.stopPropagation(); handleAccept(); }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <CheckCircle2 size={14} />
                      <span>Deploy Team on Canvas</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="spd-btn spd-btn-primary nodrag nopan"
                      disabled={isBusy || isOverTokenLimit || !isKeyConfigured}
                      title={
                        !isKeyConfigured
                          ? `Configure API key for ${currentProviderOption.name} (${activeKeyName}) to launch`
                          : isOverTokenLimit
                          ? 'Token limit exceeded (60k max). Remove files to launch'
                          : undefined
                      }
                      onClick={(e) => { e.stopPropagation(); handleInitialize(); }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      {isBusy ? (
                        <>
                          <RefreshCw size={13} className="spd-spinning" />
                          <span>Analyzing Architecture <ProgressDots /></span>
                        </>
                      ) : !isKeyConfigured ? (
                        <>
                          <ShieldAlert size={14} />
                          <span>Configure {currentProviderOption.name} Key to Launch</span>
                        </>
                      ) : (
                        <>
                          <Rocket size={14} />
                          <span>{isInitialized ? 'Re-Initialize AI Company' : 'Launch Company Creator Agent'}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ── Tab 2: Smoke Monkey Live Runtime Process Inspector ── */
            <div className="spd-runtime-view nodrag nopan">
              {/* Active Agent Live Status Banner */}
              <div className="spd-runtime-status-bar">
                <div className="spd-rt-agent-info">
                  <div className="spd-rt-avatar" style={{ background: `${color}25`, borderColor: `${color}60` }}>
                    <Cpu size={15} style={{ color }} />
                  </div>
                  <div className="spd-rt-titles">
                    <div className="spd-rt-name-row">
                      <span className="spd-rt-agent-name">
                        {status === 'building' ? `Architect — ${companyName}` : `Explorer — ${companyName}`}
                      </span>
                      <span className={`spd-rt-state-badge ${isBusy ? 'running' : status === 'synced' ? 'complete' : 'idle'}`}>
                        {isBusy ? (
                          <>
                            <span className="spd-pulsing-dot" />
                            <span>RUNNING</span>
                          </>
                        ) : status === 'synced' ? (
                          <>
                            <CheckCircle2 size={10} />
                            <span>PLANNED</span>
                          </>
                        ) : status === 'error' ? (
                          <>
                            <AlertCircle size={10} />
                            <span>ERROR</span>
                          </>
                        ) : (
                          <span>READY</span>
                        )}
                      </span>
                    </div>
                    <div className="spd-rt-meta-row">
                      <span className="spd-rt-model-tag">{selectedModel}</span>
                      <span className="spd-rt-sep">·</span>
                      <span className="spd-rt-provider-tag">{currentProviderOption.name}</span>
                      {elapsedSeconds > 0 && (
                        <>
                          <span className="spd-rt-sep">·</span>
                          <span className="spd-rt-timer">
                            <Clock size={10} />
                            {formatSeconds(elapsedSeconds)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="spd-rt-controls">
                  {activeAgentId && (
                    <button
                      type="button"
                      className="spd-rt-action-btn primary nodrag nopan"
                      onClick={handleOpenAgentDrawer}
                      title="Open full SmokeMonkey Drawer on Canvas"
                    >
                      <ExternalLink size={11} />
                      <span>Open in Drawer</span>
                    </button>
                  )}
                  {isBusy && (
                    <button
                      type="button"
                      className="spd-rt-action-btn danger nodrag nopan"
                      onClick={handleStopActiveAgent}
                      title="Stop running agent"
                    >
                      <Square size={10} />
                      <span>Stop</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 5-Phase Pipeline Progress Tracker */}
              <div className="spd-pipeline-tracker">
                {getPipelinePhases().phases.map((p) => {
                  const isDone = p.id < getPipelinePhases().currentStep || status === 'synced';
                  const isActive = p.id === getPipelinePhases().currentStep && isBusy;
                  return (
                    <div
                      key={p.id}
                      className={`spd-pipe-step ${isDone ? 'done' : isActive ? 'active' : 'pending'}`}
                    >
                      <div className="spd-pipe-indicator">
                        {isDone ? (
                          <CheckCircle2 size={12} className="spd-pipe-icon done" />
                        ) : isActive ? (
                          <RefreshCw size={12} className="spd-pipe-icon active spd-spinning" />
                        ) : (
                          <span className="spd-pipe-num">{p.id}</span>
                        )}
                      </div>
                      <div className="spd-pipe-content">
                        <span className="spd-pipe-label">{p.label}</span>
                        <span className="spd-pipe-sub">{p.sub}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Report Ready Summary Card (When complete) */}
              {status === 'synced' && (
                <div className="spd-report-ready-card">
                  <div className="spd-rrc-header">
                    <CheckCircle2 size={16} color="#10b981" />
                    <div className="spd-rrc-titles">
                      <span className="spd-rrc-title">Architecture Exploration Complete</span>
                      <span className="spd-rrc-desc">
                        {exploreReport?.project_summary || 'Features, zones, and clearance boundaries synthesized.'}
                      </span>
                    </div>
                  </div>

                  <div className="spd-rrc-metrics">
                    <div className="spd-metric-pill">
                      <span className="val">{exploreReport?.features?.length || 0}</span>
                      <span className="lbl">Features</span>
                    </div>
                    <div className="spd-metric-pill">
                      <span className="val">{exploreReport?.zones_plan?.length || 0}</span>
                      <span className="lbl">Zones Planned</span>
                    </div>
                    <div className="spd-metric-pill">
                      <span className="val">{exploreReport?.agent_count_estimate || exploreReport?.features?.length || 0}</span>
                      <span className="lbl">Agents Estimated</span>
                    </div>
                  </div>

                  <div className="spd-rrc-actions">
                    <button
                      type="button"
                      className="spd-btn-deploy nodrag nopan"
                      onClick={handleAccept}
                    >
                      <Rocket size={15} />
                      <span>Deploy Autonomous Team on Canvas Now</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Live Team Deployment Progress Card (When building) */}
              {status === 'building' && (
                <div className="spd-building-card">
                  <div className="spd-bld-header">
                    <div className="spd-bld-spinner-wrap">
                      <Sparkles size={16} className="spd-sparkle-spin" />
                    </div>
                    <div className="spd-bld-titles">
                      <span className="spd-bld-title">Architect Agent Deploying Team Hierarchy...</span>
                      <span className="spd-bld-desc">
                        Creating department zones, specializing engineers, injecting deep memory contracts, and running spatial layout audits.
                      </span>
                    </div>
                  </div>

                  <div className="spd-building-steps-bar">
                    <div className={`spd-bld-step ${currentBuildPhase > 1 ? 'completed' : currentBuildPhase === 1 ? 'active' : ''}`}>
                      <span className={`bld-dot ${currentBuildPhase === 1 ? 'pulse' : ''}`} />
                      <span>1. Hierarchical Zones</span>
                    </div>
                    <span className="spd-bld-arr">→</span>
                    <div className={`spd-bld-step ${currentBuildPhase > 2 ? 'completed' : currentBuildPhase === 2 ? 'active' : ''}`}>
                      <span className={`bld-dot ${currentBuildPhase === 2 ? 'pulse' : ''}`} />
                      <span>2. Leadership & Leaf Agents</span>
                    </div>
                    <span className="spd-bld-arr">→</span>
                    <div className={`spd-bld-step ${currentBuildPhase > 3 ? 'completed' : currentBuildPhase === 3 ? 'active' : ''}`}>
                      <span className={`bld-dot ${currentBuildPhase === 3 ? 'pulse' : ''}`} />
                      <span>3. Deep Memory Injection</span>
                    </div>
                    <span className="spd-bld-arr">→</span>
                    <div className={`spd-bld-step ${currentBuildPhase > 4 ? 'completed' : currentBuildPhase === 4 ? 'active' : ''}`}>
                      <span className={`bld-dot ${currentBuildPhase === 4 ? 'pulse' : ''}`} />
                      <span>4. MCP Tool Protocol</span>
                    </div>
                    <span className="spd-bld-arr">→</span>
                    <div className={`spd-bld-step ${currentBuildPhase > 5 ? 'completed' : currentBuildPhase === 5 ? 'active' : ''}`}>
                      <span className={`bld-dot ${currentBuildPhase === 5 ? 'pulse' : ''}`} />
                      <span>5. Spatial Layout Audit</span>
                    </div>
                    <span className="spd-bld-arr">→</span>
                    <div className={`spd-bld-step ${currentBuildPhase === 6 ? 'active' : ''}`}>
                      <span className={`bld-dot ${currentBuildPhase === 6 ? 'pulse' : ''}`} />
                      <span>6. Deploy Verification</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Team Deployed Live Success Card */}
              {status === 'deployed' && (
                <div className="spd-deployed-card">
                  <div className="spd-dep-header">
                    <div className="spd-dep-icon-wrap">
                      <CheckCircle2 size={18} color="#10b981" />
                    </div>
                    <div className="spd-dep-titles">
                      <span className="spd-dep-title">Company Team Successfully Deployed Live to Canvas!</span>
                      <span className="spd-dep-desc">
                        {buildStats
                          ? `Created ${buildStats.zonesCreated} department zones, hired ${buildStats.agentsCreated} specialized feature engineers, and attached ${buildStats.mcpsAttached} tool integrations.`
                          : 'All feature owners, reporting hierarchy, and 3-hour drift sync routines are active on the canvas.'}
                      </span>
                    </div>
                  </div>

                  <div className="spd-dep-actions">
                    <button
                      type="button"
                      className="spd-btn-view-canvas nodrag nopan"
                      onClick={() => {
                        onDismissToSide?.();
                      }}
                      title="Dock to side and inspect deployed team"
                    >
                      <Sparkles size={14} />
                      <span>View Live Team on Canvas</span>
                    </button>

                    <button
                      type="button"
                      className="spd-btn-sync-drift nodrag nopan"
                      onClick={handleSync}
                      title="Inspect git diff / code changes and update agent memory"
                    >
                      <RefreshCw size={13} />
                      <span>Sync Code Drift</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Smoke Monkey Monospace Live Terminal Console */}
              <div className="spd-terminal-window">
                <div className="spd-term-header">
                  <div className="spd-term-dots">
                    <span className="dot red" />
                    <span className="dot yellow" />
                    <span className="dot green" />
                  </div>
                  <div className="spd-term-title">
                    <Terminal size={11} />
                    <span>SMOKE MONKEY AGENT RUNTIME OUTPUT</span>
                  </div>
                  <div className="spd-term-actions">
                    <button
                      type="button"
                      className={`spd-term-btn ${autoScroll ? 'active' : ''} nodrag nopan`}
                      onClick={() => setAutoScroll((v) => !v)}
                      title="Toggle auto-scroll to bottom"
                    >
                      Auto-Scroll
                    </button>
                    <button
                      type="button"
                      className="spd-term-btn nodrag nopan"
                      onClick={() => setRuntimeEvents([])}
                      title="Clear terminal output"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>

                <div className="spd-term-logs" ref={termLogsRef}>
                  {runtimeEvents.length === 0 ? (
                    <div className="spd-term-empty">
                      <Terminal size={18} />
                      <span>Ready. Launch the Creator Agent from the Setup tab to monitor real-time thoughts, tool calls, and architecture steps.</span>
                    </div>
                  ) : (
                    runtimeEvents.map((ev) => (
                      <div key={ev.id} className={`spd-term-line ${ev.type} ${ev.status || ''}`}>
                        <span className="spd-line-ts">[{ev.timestamp}]</span>
                        {ev.type === 'step' ? (
                          <div className="spd-line-step-wrap">
                            <span className="spd-tag-step">{ev.title || 'STEP'}</span>
                            <span className="spd-step-text">{ev.content}</span>
                          </div>
                        ) : ev.type === 'thought' ? (
                          <div className="spd-line-thought">
                            <span className="spd-thought-header">🧠 AGENT REASONING:</span>
                            <span className="spd-thought-body">{ev.content}</span>
                          </div>
                        ) : ev.type === 'tool' ? (
                          <div className="spd-line-tool">
                            <span className="spd-tool-call">
                              ⚙ {ev.status === 'success' ? '✓' : ev.status === 'error' ? '✖' : '▶'} {ev.toolName || 'tool'}
                            </span>
                            {ev.args && (
                              <span className="spd-tool-args">{JSON.stringify(ev.args)}</span>
                            )}
                            {ev.result && (
                              <span className="spd-tool-result">➜ {typeof ev.result === 'object' ? JSON.stringify(ev.result) : String(ev.result)}</span>
                            )}
                          </div>
                        ) : ev.type === 'error' ? (
                          <span className="spd-line-content error">
                            ✖ {ev.content}
                          </span>
                        ) : (
                          <span className="spd-line-content text">
                            {ev.content}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                  <div ref={terminalEndRef} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const SpaceProjectDock = React.memo(SpaceProjectDockComponent);

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(d: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
