import React, { useState, useEffect } from 'react';
import {
  X,
  Bot,
  ShieldCheck,
  Check,
  Sparkles,
  Clock,
  Folder,
  FolderOpen,
  HardDrive,
  Smartphone,
  ChevronUp,
  ChevronDown,
  Plus,
} from 'lucide-react';
import type { SpaceAgentEntity, AgentRecord } from './agent.types.js';
import { PROVIDER_CATALOG, getProvider, getDefaultModelForProvider } from '../common/provider-catalog.js';
import { BrandIcons } from '../common/brand-icons.js';
import { isTauri, pickNativeDirectory } from '../../config/desktop.bridge.js';
import { useIsMobile } from '../common/use-mobile.js';

export interface ClockTimeItem {
  id: string;
  hour12: number; // 1-12
  minute: number; // 0-59
  ampm: 'AM' | 'PM';
}

export type ScheduleDays = 'daily' | 'weekdays' | 'weekends';

function parseSingleCronTime(cronPart: string): { hour12: number; minute: number; ampm: 'AM' | 'PM'; days: ScheduleDays } | null {
  const match = cronPart.trim().match(/^(\d+)\s+(\d+)\s+\*\s+\*\s+(\*|1-5|6,0)$/);
  if (!match) return null;
  const min = parseInt(match[1], 10);
  const h24 = parseInt(match[2], 10);
  const dayPart = match[3];
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 || 12;
  const days: ScheduleDays = dayPart === '1-5' ? 'weekdays' : dayPart === '6,0' ? 'weekends' : 'daily';
  return { hour12: h12, minute: min, ampm, days };
}

function parseCronSchedule(cron: string): {
  type: 'clock' | 'interval';
  times: ClockTimeItem[];
  days: ScheduleDays;
  intervalPreset: string;
} {
  if (!cron) {
    return {
      type: 'clock',
      times: [{ id: 't1', hour12: 12, minute: 30, ampm: 'PM' }],
      days: 'daily',
      intervalPreset: '*/30 * * * *',
    };
  }

  const parts = cron.split(/[;\n]/).map((s) => s.trim()).filter(Boolean);
  const parsedTimes: ClockTimeItem[] = [];
  let detectedDays: ScheduleDays = 'daily';
  let allMatched = true;

  for (let i = 0; i < parts.length; i++) {
    const res = parseSingleCronTime(parts[i]);
    if (res) {
      parsedTimes.push({
        id: `t_${i}_${res.hour12}_${res.minute}_${res.ampm}`,
        hour12: res.hour12,
        minute: res.minute,
        ampm: res.ampm,
      });
      detectedDays = res.days;
    } else {
      allMatched = false;
      break;
    }
  }

  if (allMatched && parsedTimes.length > 0) {
    return {
      type: 'clock',
      times: parsedTimes,
      days: detectedDays,
      intervalPreset: '*/30 * * * *',
    };
  }

  return {
    type: 'interval',
    times: [{ id: 't1', hour12: 12, minute: 30, ampm: 'PM' }],
    days: 'daily',
    intervalPreset: cron,
  };
}

function buildCronFromSchedule(
  type: 'clock' | 'interval',
  times: ClockTimeItem[],
  days: ScheduleDays,
  intervalPreset: string
): string {
  if (type === 'interval') return intervalPreset;
  const dayPart = days === 'weekdays' ? '1-5' : days === 'weekends' ? '6,0' : '*';
  if (!times || times.length === 0) {
    return `0 9 * * ${dayPart}`;
  }
  return times
    .map((t) => {
      const h24 = t.ampm === 'PM' ? (t.hour12 % 12) + 12 : t.hour12 % 12;
      return `${t.minute} ${h24} * * ${dayPart}`;
    })
    .join('; ');
}

function describeCronMulti(cron: string): string {
  if (!cron) return 'No schedule configured';
  if (cron === '*/5 * * * *') return 'Runs every 5 minutes';
  if (cron === '*/15 * * * *') return 'Runs every 15 minutes';
  if (cron === '*/30 * * * *') return 'Runs every 30 minutes';
  if (cron === '0 * * * *') return 'Runs once every hour at minute :00';
  if (cron === '0 */3 * * *') return 'Runs every 3 hours';
  if (cron === '0 */6 * * *') return 'Runs every 6 hours';
  if (cron === '0 */12 * * *') return 'Runs every 12 hours';

  const parts = cron.split(/[;\n]/).map((s) => s.trim()).filter(Boolean);
  const timeLabels: string[] = [];
  let dayPart = '*';

  for (const p of parts) {
    const res = parseSingleCronTime(p);
    if (!res) return `Schedule: ${cron}`;
    const mStr = res.minute < 10 ? `0${res.minute}` : String(res.minute);
    timeLabels.push(`${res.hour12}:${mStr} ${res.ampm}`);
    dayPart = res.days === 'weekdays' ? '1-5' : res.days === 'weekends' ? '6,0' : '*';
  }

  const daysLabel = dayPart === '1-5' ? 'Weekdays (Mon–Fri)' : dayPart === '6,0' ? 'Weekends (Sat–Sun)' : 'Daily';
  if (timeLabels.length === 1) {
    return `Runs ${daysLabel} at ${timeLabels[0]}`;
  }
  return `Runs ${daysLabel} • ${timeLabels.length} times a day (${timeLabels.join(', ')})`;
}

const AnalogClockFace: React.FC<{ hour: number; minute: number }> = ({ hour, minute }) => {
  const hourAngle = ((hour % 12) + minute / 60) * 30;
  const minuteAngle = minute * 6;

  return (
    <div style={{ position: 'relative', width: 92, height: 92, flexShrink: 0 }}>
      <svg width="92" height="92" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="56" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2.5" />
        <circle cx="60" cy="60" r="49" fill="transparent" stroke="hsl(var(--border) / 0.5)" strokeWidth="1" strokeDasharray="2 3" />

        {/* 12 Hour Ticks */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => {
          const isMajor = i % 3 === 0;
          return (
            <line
              key={deg}
              x1="60"
              y1={isMajor ? '11' : '13'}
              x2="60"
              y2="18"
              stroke={isMajor ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground) / 0.5)'}
              strokeWidth={isMajor ? '2.5' : '1.2'}
              transform={`rotate(${deg} 60 60)`}
            />
          );
        })}

        {/* Markers 12, 3, 6, 9 */}
        <text x="60" y="29" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="hsl(var(--foreground))">12</text>
        <text x="96" y="63.5" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="hsl(var(--foreground))">3</text>
        <text x="60" y="99" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="hsl(var(--foreground))">6</text>
        <text x="24" y="63.5" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="hsl(var(--foreground))">9</text>

        {/* Hour Hand */}
        <line
          x1="60"
          y1="60"
          x2="60"
          y2="36"
          stroke="hsl(var(--foreground))"
          strokeWidth="3.6"
          strokeLinecap="round"
          transform={`rotate(${hourAngle} 60 60)`}
          style={{ transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />

        {/* Minute Hand */}
        <line
          x1="60"
          y1="60"
          x2="60"
          y2="21"
          stroke="#10b981"
          strokeWidth="2.4"
          strokeLinecap="round"
          transform={`rotate(${minuteAngle} 60 60)`}
          style={{ transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />

        {/* Center Pivot */}
        <circle cx="60" cy="60" r="4.5" fill="#10b981" stroke="hsl(var(--card))" strokeWidth="1.5" />
      </svg>
    </div>
  );
};

interface AgentModalProps {
  isOpen: boolean;
  agent?: SpaceAgentEntity | null;
  initialData?: Partial<AgentRecord> | null;
  initialCoords?: { x: number; y: number } | null;
  initialSection?: 'general' | 'directory' | 'schedule';
  onSave: (data: Partial<AgentRecord>) => Promise<void>;
  onOpenKeys: () => void;
  onClose: () => void;
}

export const AgentModal: React.FC<AgentModalProps> = ({
  isOpen,
  agent,
  initialData,
  initialCoords,
  initialSection = 'general',
  onSave,
  onOpenKeys,
  onClose,
}) => {
  if (!isOpen) return null;

  const isMobile = useIsMobile();
  const defaultName = agent?.name || initialData?.name || 'Job & Web Crawler';
  const defaultProvider = agent?.provider || initialData?.provider || 'nvidia';
  const defaultModel =
    agent?.model === 'meta/llama-3.3-70b-instruct'
      ? 'nvidia/nemotron-3-super-120b-a12b'
      : agent?.model || initialData?.model || 'nvidia/nemotron-3-super-120b-a12b';
  const defaultPrompt =
    agent?.system_prompt ||
    initialData?.system_prompt ||
    'You are an autonomous AI specialist agent in Smoke Monkey Canvas. Periodically check web targets, analyze results with attached MCPs, and summarize findings in clean markdown.';
  const defaultCronEnabled = agent
    ? agent.cron_enabled === 1
    : initialData?.cron_schedule !== undefined
      ? !!initialData.cron_schedule
      : true;
  const defaultCronSchedule = agent?.cron_schedule || initialData?.cron_schedule || '30 12 * * *';
  const defaultWorkingDir = agent?.working_dir || initialData?.working_dir || '';
  const defaultMaxMemoryMb = agent?.max_memory_mb || initialData?.max_memory_mb || 1024;

  const initSchedule = parseCronSchedule(defaultCronSchedule);

  const [name, setName] = useState(defaultName);
  const [provider, setProvider] = useState(defaultProvider);
  const [model, setModel] = useState(defaultModel);
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [customModelId, setCustomModelId] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(defaultPrompt);
  const [workingDir, setWorkingDir] = useState(defaultWorkingDir);
  const [maxMemoryMb, setMaxMemoryMb] = useState<number>(defaultMaxMemoryMb);
  const [cronEnabled, setCronEnabled] = useState(defaultCronEnabled);
  const [cronSchedule, setCronSchedule] = useState(defaultCronSchedule);
  const [loading, setLoading] = useState(false);
  const [keysStatus, setKeysStatus] = useState<Record<string, { isSet: boolean }>>({});
  const [inlineApiKey, setInlineApiKey] = useState('');
  const [showAdvancedCron, setShowAdvancedCron] = useState(false);

  // Multi-Time Clock Scheduling State
  const [scheduleType, setScheduleType] = useState<'clock' | 'interval'>(initSchedule.type);
  const [scheduledTimes, setScheduledTimes] = useState<ClockTimeItem[]>(initSchedule.times);
  const [activeTimeId, setActiveTimeId] = useState<string>(initSchedule.times[0]?.id || 't1');
  const [scheduleDays, setScheduleDays] = useState<ScheduleDays>(initSchedule.days);
  const [intervalPreset, setIntervalPreset] = useState<string>(initSchedule.intervalPreset);

  // Local Directory Discovery & Validation State
  const [localDirs, setLocalDirs] = useState<Array<{ id: string; label: string; path: string }>>([]);
  const [resolvedPathInfo, setResolvedPathInfo] = useState<{
    resolved: string;
    exists: boolean;
    isDirectory: boolean;
  } | null>(null);

  useEffect(() => {
    setName(defaultName);
    setProvider(defaultProvider);
    setModel(defaultModel);
    setIsCustomModel(false);
    setCustomModelId('');
    setSystemPrompt(defaultPrompt);
    setWorkingDir(defaultWorkingDir);
    setMaxMemoryMb(defaultMaxMemoryMb);
    setCronEnabled(defaultCronEnabled);
    setCronSchedule(defaultCronSchedule);

    const sched = parseCronSchedule(defaultCronSchedule);
    setScheduleType(sched.type);
    setScheduledTimes(sched.times);
    setActiveTimeId(sched.times[0]?.id || 't1');
    setScheduleDays(sched.days);
    setIntervalPreset(sched.intervalPreset);
  }, [isOpen, agent, initialData]);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/settings/keys')
      .then((r) => r.json())
      .then(setKeysStatus)
      .catch(() => {});

    fetch('/api/settings/local-dirs')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.directories)) {
          setLocalDirs(data.directories);
        }
      })
      .catch(() => {});
  }, [isOpen]);

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
        .then(setResolvedPathInfo)
        .catch(() => {});
    }, 200);
    return () => clearTimeout(timer);
  }, [workingDir]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialSection === 'directory' || initialSection === 'schedule') {
      const targetId = initialSection === 'directory' ? 'agent-modal-directory-section' : 'agent-modal-schedule-section';
      setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [isOpen, initialSection]);

  const handleBrowseLocalDirectory = async () => {
    try {
      if (isTauri()) {
        const nativeDir = await pickNativeDirectory('Select Agent Working Directory');
        if (nativeDir) {
          setWorkingDir(nativeDir);
          return;
        }
      }

      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
        if (dirHandle?.name) {
          setWorkingDir((prev) => {
            if (prev && !prev.endsWith('/') && !prev.endsWith('\\')) {
              return `${prev}/${dirHandle.name}`;
            }
            return dirHandle.name;
          });
        }
      } else {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        (fileInput as any).webkitdirectory = true;
        fileInput.onchange = (evt: any) => {
          const files = evt.target.files;
          if (files && files.length > 0) {
            const rel = files[0].webkitRelativePath;
            const topDir = rel.split('/')[0];
            if (topDir) setWorkingDir(topDir);
          }
        };
        fileInput.click();
      }
    } catch {
      // User cancelled picker
    }
  };

  const activeTime = scheduledTimes.find((t) => t.id === activeTimeId) || scheduledTimes[0] || {
    id: 't1',
    hour12: 12,
    minute: 30,
    ampm: 'PM' as const,
  };

  const updateActiveTime = (updates: Partial<ClockTimeItem>) => {
    setScheduledTimes((prev) => {
      const next = prev.map((t) => (t.id === activeTime.id ? { ...t, ...updates } : t));
      const newCron = buildCronFromSchedule(scheduleType, next, scheduleDays, intervalPreset);
      setCronSchedule(newCron);
      return next;
    });
  };

  const handleAddRunTime = () => {
    const last = scheduledTimes[scheduledTimes.length - 1];
    let nextHour = last ? ((last.hour12 + 3) % 12 || 12) : 18;
    let nextAmpm: 'AM' | 'PM' = last ? (last.ampm === 'AM' && last.hour12 >= 9 ? 'PM' : last.ampm) : 'PM';
    let nextMin = last ? last.minute : 0;
    const newId = `t_${Date.now()}`;
    const newTime: ClockTimeItem = {
      id: newId,
      hour12: nextHour,
      minute: nextMin,
      ampm: nextAmpm,
    };
    const nextList = [...scheduledTimes, newTime];
    setScheduledTimes(nextList);
    setActiveTimeId(newId);
    const newCron = buildCronFromSchedule(scheduleType, nextList, scheduleDays, intervalPreset);
    setCronSchedule(newCron);
  };

  const handleRemoveRunTime = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (scheduledTimes.length <= 1) return;
    const nextList = scheduledTimes.filter((t) => t.id !== id);
    setScheduledTimes(nextList);
    if (activeTimeId === id) {
      setActiveTimeId(nextList[0].id);
    }
    const newCron = buildCronFromSchedule(scheduleType, nextList, scheduleDays, intervalPreset);
    setCronSchedule(newCron);
  };

  const handleDaysChange = (days: ScheduleDays) => {
    setScheduleDays(days);
    const newCron = buildCronFromSchedule(scheduleType, scheduledTimes, days, intervalPreset);
    setCronSchedule(newCron);
  };

  const handleScheduleTypeChange = (type: 'clock' | 'interval') => {
    setScheduleType(type);
    const newCron = buildCronFromSchedule(type, scheduledTimes, scheduleDays, intervalPreset);
    setCronSchedule(newCron);
  };

  const handleIntervalPresetChange = (preset: string) => {
    setScheduleType('interval');
    setIntervalPreset(preset);
    setCronSchedule(preset);
  };

  const timeInputValue = `${String(
    activeTime.ampm === 'PM' ? (activeTime.hour12 % 12) + 12 : activeTime.hour12 % 12
  ).padStart(2, '0')}:${String(activeTime.minute).padStart(2, '0')}`;

  const handleTimeInputPicker = (val: string) => {
    if (!val) return;
    const [hStr, mStr] = val.split(':');
    const h24 = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (isNaN(h24) || isNaN(m)) return;
    const ampm: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 || 12;
    updateActiveTime({ hour12: h12, minute: m, ampm });
  };

  // Handle Provider Change: dynamically update models
  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    setIsCustomModel(false);
    setInlineApiKey('');
    const newDefaultModel = getDefaultModelForProvider(newProvider);
    setModel(newDefaultModel);
  };

  const currentProviderConfig = getProvider(provider);
  const currentKeyName = currentProviderConfig.apiKeyName;
  const isKeyless = provider === 'omniroute';
  const isKeyConfigured = isKeyless || !!keysStatus[currentKeyName]?.isSet;
  const ProviderIcon = BrandIcons[provider] || Bot;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Strict API Key Validation (bypass for keyless/offline providers)
    if (!isKeyless && !isKeyConfigured && !inlineApiKey.trim()) {
      alert(
        `Provider "${currentProviderConfig.name}" requires an API key (${currentKeyName}).\n\nPlease enter the API key in the field below or configure it in Settings before saving.`
      );
      return;
    }

    setLoading(true);
    try {
      if (inlineApiKey.trim()) {
        await fetch('/api/settings/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [currentKeyName]: inlineApiKey.trim() }),
        });
      }

      const finalModel = isCustomModel && customModelId.trim() ? customModelId.trim() : model;
      await onSave({
        name,
        model: finalModel,
        provider,
        system_prompt: systemPrompt,
        cron_enabled: cronEnabled ? 1 : 0,
        cron_schedule: cronEnabled ? cronSchedule : null,
        pos_x: agent?.pos_x ?? initialCoords?.x ?? 300,
        pos_y: agent?.pos_y ?? initialCoords?.y ?? 220,
        policies: initialData?.policies || agent?.policies,
        working_dir: workingDir.trim() || null,
        max_memory_mb: Number(maxMemoryMb) || 1024,
      });
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error saving agent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`modal-overlay ${isMobile ? 'is-mobile-overlay' : ''}`} onClick={onClose}>
      <div
        className={`modal-content ${isMobile ? 'is-mobile-modal' : ''}`}
        onClick={(e) => e.stopPropagation()}
        style={!isMobile ? { maxWidth: 660, maxHeight: '90vh' } : undefined}
      >
        {isMobile && <div className="modal-sheet-handle" />}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/smoke-monkey-mascot.png" alt="Mascot" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'contain' }} />
            <span className="modal-title">{agent ? 'Configure Agent' : 'Create New Agent in Space'}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="modal-body" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {/* Agent Name */}
            <div className="form-group">
              <label className="form-label">Agent Name</label>
              <input
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Job Search Monitor"
                required
              />
            </div>

            {/* Provider and Dynamic Model Selection */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 14 }}>
              {/* Provider Field */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ProviderIcon size={14} />
                    <span>LLM Provider</span>
                  </label>
                  <button
                    type="button"
                    onClick={onOpenKeys}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: 11,
                      color: isKeyless ? '#10b981' : isKeyConfigured ? '#10b981' : '#f59e0b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                    }}
                  >
                    {isKeyless ? <Check size={11} /> : isKeyConfigured ? <Check size={11} /> : <ShieldCheck size={11} />}
                    <span>{isKeyless ? 'Free / Keyless' : isKeyConfigured ? 'Key active' : 'Set key'}</span>
                  </button>
                </div>
                <select
                  className="form-select"
                  value={provider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                >
                  {PROVIDER_CATALOG.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Model Dropdown */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={14} color="var(--accent)" />
                  <span>Respective Model</span>
                </label>
                {!isCustomModel ? (
                  <select
                    className="form-select"
                    value={model}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setIsCustomModel(true);
                      } else {
                        setModel(e.target.value);
                      }
                    }}
                  >
                    {currentProviderConfig.models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label} {m.isDefault ? '★' : ''}
                      </option>
                    ))}
                    <option value="__custom__">+ Enter Custom Model ID...</option>
                  </select>
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      className="form-input"
                      placeholder="custom/model-id"
                      value={customModelId}
                      onChange={(e) => setCustomModelId(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '6px 10px', fontSize: 11 }}
                      onClick={() => setIsCustomModel(false)}
                    >
                      Presets
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Prompt for API key directly if not configured */}
            {!isKeyConfigured && (
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  marginBottom: 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#f59e0b', marginBottom: 6 }}>
                  <ShieldCheck size={14} />
                  <span>API Key Required: {currentKeyName}</span>
                </div>
                <input
                  type="password"
                  className="form-input"
                  placeholder={`Enter ${currentKeyName} to authenticate with ${currentProviderConfig.name}`}
                  value={inlineApiKey}
                  onChange={(e) => setInlineApiKey(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Model Description Helper */}
            {!isCustomModel && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: -6, fontStyle: 'italic' }}>
                💡 {currentProviderConfig.models.find((m) => m.id === model)?.description}
              </div>
            )}

            {/* System Directives & Prompt */}
            <div className="form-group">
              <label className="form-label">System Directives & Mission</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="What should this autonomous agent do?"
                required
              />
            </div>

            {/* Working Directory & RAM Resource Limits */}
            <div id="agent-modal-directory-section" style={{ borderTop: '1px solid hsl(var(--border) / 0.7)', paddingTop: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                  <HardDrive size={14} color="#3b82f6" />
                  <span>Workspace Directory & Resource Envelope</span>
                </span>
                <span style={{ fontSize: 11, color: maxMemoryMb <= 512 ? '#10b981' : 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {maxMemoryMb <= 512 && <Smartphone size={12} color="#10b981" />}
                  {maxMemoryMb <= 512 ? 'Mobile / Edge Mode' : 'Desktop / Cloud Standard'}
                </span>
              </div>

              <div className="cron-builder-card" style={{ gap: 12 }}>
                {/* 1. Working Directory Input & Local Browser */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Folder size={13} color="#60a5fa" />
                      <span>Agent Root Working Directory</span>
                    </label>
                    <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
                      Points where code, tools & assets reside
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      className="form-input"
                      style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace', flex: 1 }}
                      value={workingDir}
                      onChange={(e) => setWorkingDir(e.target.value)}
                      placeholder="e.g. /Users/name/projects/my-agent or leave blank for ~/.smoke-agents/<id>"
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleBrowseLocalDirectory}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 12px',
                        fontSize: 11.5,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        height: 38,
                        background: 'hsl(var(--background) / 0.8)',
                      }}
                      title="Open native file picker to choose a local directory from your computer"
                    >
                      <FolderOpen size={13} color="#3b82f6" />
                      <span>Browse Folder</span>
                    </button>
                  </div>

                  {/* Local Directory Quick Presets */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
                    <button
                      type="button"
                      className={`cron-preset-pill ${!workingDir ? 'active' : ''}`}
                      style={{ padding: '3px 9px', fontSize: 10.5 }}
                      onClick={() => setWorkingDir('')}
                      title="Auto-create dedicated ~/.smoke-agents/<id> folder"
                    >
                      ✨ Auto-Sandbox
                    </button>
                    {localDirs.length > 0 ? (
                      localDirs.map((dir) => (
                        <button
                          key={dir.id}
                          type="button"
                          className={`cron-preset-pill ${workingDir === dir.path ? 'active' : ''}`}
                          style={{ padding: '3px 9px', fontSize: 10.5 }}
                          onClick={() => setWorkingDir(dir.path)}
                          title={dir.path}
                        >
                          📁 {dir.label}
                        </button>
                      ))
                    ) : (
                      <>
                        <button
                          type="button"
                          className={`cron-preset-pill ${workingDir === './' ? 'active' : ''}`}
                          style={{ padding: '3px 9px', fontSize: 10.5 }}
                          onClick={() => setWorkingDir('./')}
                          title="Set to Current Workspace root"
                        >
                          📁 Project Root (./)
                        </button>
                        <button
                          type="button"
                          className={`cron-preset-pill ${workingDir === '~' ? 'active' : ''}`}
                          style={{ padding: '3px 9px', fontSize: 10.5 }}
                          onClick={() => setWorkingDir('~')}
                          title="Home Directory"
                        >
                          🏠 Home (~)
                        </button>
                        <button
                          type="button"
                          className={`cron-preset-pill ${workingDir === '~/Desktop' ? 'active' : ''}`}
                          style={{ padding: '3px 9px', fontSize: 10.5 }}
                          onClick={() => setWorkingDir('~/Desktop')}
                          title="Desktop folder"
                        >
                          🖥️ Desktop
                        </button>
                      </>
                    )}
                  </div>

                  {/* Path Status & Live Validation */}
                  <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginTop: 5 }}>
                    {resolvedPathInfo ? (
                      resolvedPathInfo.exists && resolvedPathInfo.isDirectory ? (
                        <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Check size={12} color="#10b981" />
                          <span>Local directory confirmed: <code style={{ color: '#10b981' }}>{resolvedPathInfo.resolved}</code></span>
                        </span>
                      ) : (
                        <span style={{ color: '#60a5fa', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Sparkles size={12} color="#60a5fa" />
                          <span>Will be auto-created on launch: <code style={{ color: '#60a5fa' }}>{resolvedPathInfo.resolved}</code></span>
                        </span>
                      )
                    ) : workingDir ? (
                      <span>📁 Agent assets, files & executions point to: <code>{workingDir}</code></span>
                    ) : (
                      <span>✨ Auto-default: Will create and use an isolated folder at <code>~/.smoke-agents/{name.toLowerCase().replace(/[^a-z0-9_-]+/g, '-') || 'agent'}</code></span>
                    )}
                  </div>
                </div>

                {/* 2. RAM / Memory Limit */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Smartphone size={13} color={maxMemoryMb <= 512 ? '#10b981' : '#f59e0b'} />
                      <span>Max RAM Allocation (Mobile & Edge Restriction)</span>
                    </label>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)' }}>
                      {maxMemoryMb} MB RAM
                    </span>
                  </div>

                  <div className="cron-preset-grid">
                    <button
                      type="button"
                      className={`cron-preset-pill ${maxMemoryMb === 256 ? 'active' : ''}`}
                      onClick={() => setMaxMemoryMb(256)}
                    >
                      📱 256 MB (Mobile Lite)
                    </button>
                    <button
                      type="button"
                      className={`cron-preset-pill ${maxMemoryMb === 512 ? 'active' : ''}`}
                      onClick={() => setMaxMemoryMb(512)}
                    >
                      📱 512 MB (Mobile Edge)
                    </button>
                    <button
                      type="button"
                      className={`cron-preset-pill ${maxMemoryMb === 1024 ? 'active' : ''}`}
                      onClick={() => setMaxMemoryMb(1024)}
                    >
                      💻 1024 MB (1 GB Std)
                    </button>
                    <button
                      type="button"
                      className={`cron-preset-pill ${maxMemoryMb === 2048 ? 'active' : ''}`}
                      onClick={() => setMaxMemoryMb(2048)}
                    >
                      🚀 2048 MB (2 GB)
                    </button>
                    <button
                      type="button"
                      className={`cron-preset-pill ${maxMemoryMb === 4096 ? 'active' : ''}`}
                      onClick={() => setMaxMemoryMb(4096)}
                    >
                      ⚡ 4096 MB (4 GB)
                    </button>
                  </div>

                  <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginTop: 6 }}>
                    <span>Capping memory ensures agents run smoothly without overloading mobile phones or lightweight SBCs.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scheduled Execution: Proper Visual Clock UI */}
            <div id="agent-modal-schedule-section" style={{ borderTop: '1px solid hsl(var(--border) / 0.7)', paddingTop: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                  <Clock size={15} color="#f59e0b" />
                  <span>Scheduled Execution & Clock</span>
                </span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    checked={cronEnabled}
                    onChange={(e) => setCronEnabled(e.target.checked)}
                  />
                  <span>Enable Periodic Schedule</span>
                </label>
              </div>

              {cronEnabled && (
                <div className="cron-builder-card" style={{ gap: 14 }}>
                  {/* Schedule Mode Selector Tabs */}
                  <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid hsl(var(--border) / 0.6)', paddingBottom: 10 }}>
                    <button
                      type="button"
                      className={`cron-preset-pill ${scheduleType === 'clock' ? 'active' : ''}`}
                      style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600 }}
                      onClick={() => handleScheduleTypeChange('clock')}
                    >
                      🕒 Run at Specific Clock Times
                    </button>
                    <button
                      type="button"
                      className={`cron-preset-pill ${scheduleType === 'interval' ? 'active' : ''}`}
                      style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600 }}
                      onClick={() => handleScheduleTypeChange('interval')}
                    >
                      ⏱️ Repeating Interval (every X mins)
                    </button>
                  </div>

                  {/* Mode 1: Run at Specific Clock Times (Primary & Recommended) */}
                  {scheduleType === 'clock' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {/* Times in a Day Header & Multi-Time Pills */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--foreground))', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span>Execution Times in a Day:</span>
                            <span style={{ fontSize: 11, fontWeight: 500, color: 'hsl(var(--muted-foreground))' }}>
                              ({scheduledTimes.length} {scheduledTimes.length === 1 ? 'run' : 'runs'} configured)
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={handleAddRunTime}
                            className="btn-secondary"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '4px 10px',
                              fontSize: 11,
                              borderRadius: 6,
                              height: 28,
                              background: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              color: 'var(--accent)',
                              cursor: 'pointer',
                            }}
                            title="Add another execution time in the day (e.g. Morning 9 AM, Noon 12:30 PM, Evening 6:15 PM)"
                          >
                            <Plus size={13} />
                            <span>Add Time in Day</span>
                          </button>
                        </div>

                        {/* List of Time Chips */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                          {scheduledTimes.map((t) => {
                            const isSelected = t.id === activeTime.id;
                            const mStr = t.minute < 10 ? `0${t.minute}` : String(t.minute);
                            const label = `${t.hour12}:${mStr} ${t.ampm}`;
                            return (
                              <div
                                key={t.id}
                                onClick={() => setActiveTimeId(t.id)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '5px 11px',
                                  borderRadius: 8,
                                  cursor: 'pointer',
                                  fontSize: 12,
                                  fontWeight: isSelected ? 700 : 500,
                                  background: isSelected ? 'hsl(var(--foreground))' : 'hsl(var(--card))',
                                  color: isSelected ? 'hsl(var(--background))' : 'hsl(var(--foreground))',
                                  border: isSelected ? '1px solid hsl(var(--foreground))' : '1px solid hsl(var(--border))',
                                  boxShadow: isSelected ? '0 0 0 2px hsl(var(--accent) / 0.3)' : 'none',
                                  transition: 'all 0.15s ease',
                                }}
                                title={`Click to edit ${label} on clock`}
                              >
                                <Clock size={12} color={isSelected ? 'hsl(var(--background))' : '#10b981'} />
                                <span>{label}</span>
                                {scheduledTimes.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleRemoveRunTime(t.id, e)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      padding: '0 0 0 4px',
                                      color: isSelected ? 'hsl(var(--background) / 0.8)' : 'hsl(var(--muted-foreground))',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                    }}
                                    title="Remove this execution time"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Interactive Clock Editor Box for the Selected Time */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 16,
                          padding: '14px 16px',
                          background: 'hsl(var(--background) / 0.65)',
                          borderRadius: 10,
                          border: '1px solid hsl(var(--border) / 0.8)',
                        }}
                      >
                        {/* Visual SVG Clock Face */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                          <AnalogClockFace hour={activeTime.hour12} minute={activeTime.minute} />
                          <span style={{ fontSize: 10.5, color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>
                            {activeTime.hour12}:{activeTime.minute < 10 ? `0${activeTime.minute}` : activeTime.minute} {activeTime.ampm}
                          </span>
                        </div>

                        {/* Digital Steppers & Native Time Picker */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            {/* Hour Stepper */}
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                background: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: 8,
                                padding: '4px 8px',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  const nextH = activeTime.hour12 >= 12 ? 1 : activeTime.hour12 + 1;
                                  updateActiveTime({ hour12: nextH });
                                }}
                                style={{ background: 'none', border: 'none', color: 'hsl(var(--muted-foreground))', cursor: 'pointer', padding: 2 }}
                                title="Increase Hour"
                              >
                                <ChevronUp size={14} />
                              </button>
                              <span style={{ fontSize: 22, fontWeight: 700, fontFamily: 'ui-monospace, monospace', minWidth: 28, textAlign: 'center' }}>
                                {String(activeTime.hour12).padStart(2, '0')}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const nextH = activeTime.hour12 <= 1 ? 12 : activeTime.hour12 - 1;
                                  updateActiveTime({ hour12: nextH });
                                }}
                                style={{ background: 'none', border: 'none', color: 'hsl(var(--muted-foreground))', cursor: 'pointer', padding: 2 }}
                                title="Decrease Hour"
                              >
                                <ChevronDown size={14} />
                              </button>
                            </div>

                            <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>:</span>

                            {/* Minute Stepper */}
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                background: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: 8,
                                padding: '4px 8px',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  const nextM = (activeTime.minute + 5) % 60;
                                  updateActiveTime({ minute: nextM });
                                }}
                                style={{ background: 'none', border: 'none', color: 'hsl(var(--muted-foreground))', cursor: 'pointer', padding: 2 }}
                                title="Increase Minute (+5)"
                              >
                                <ChevronUp size={14} />
                              </button>
                              <span style={{ fontSize: 22, fontWeight: 700, fontFamily: 'ui-monospace, monospace', minWidth: 28, textAlign: 'center' }}>
                                {String(activeTime.minute).padStart(2, '0')}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const nextM = (activeTime.minute - 5 + 60) % 60;
                                  updateActiveTime({ minute: nextM });
                                }}
                                style={{ background: 'none', border: 'none', color: 'hsl(var(--muted-foreground))', cursor: 'pointer', padding: 2 }}
                                title="Decrease Minute (-5)"
                              >
                                <ChevronDown size={14} />
                              </button>
                            </div>

                            {/* AM / PM Segmented Buttons */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 2 }}>
                              <button
                                type="button"
                                className={`cron-preset-pill ${activeTime.ampm === 'AM' ? 'active' : ''}`}
                                style={{ padding: '3px 10px', fontSize: 11, fontWeight: 700 }}
                                onClick={() => updateActiveTime({ ampm: 'AM' })}
                              >
                                AM
                              </button>
                              <button
                                type="button"
                                className={`cron-preset-pill ${activeTime.ampm === 'PM' ? 'active' : ''}`}
                                style={{ padding: '3px 10px', fontSize: 11, fontWeight: 700 }}
                                onClick={() => updateActiveTime({ ampm: 'PM' })}
                              >
                                PM
                              </button>
                            </div>

                            {/* Native HTML5 Time Input Picker */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginLeft: 10 }}>
                              <span style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>Direct Time Input:</span>
                              <input
                                type="time"
                                className="form-input"
                                style={{
                                  padding: '4px 8px',
                                  fontSize: 12,
                                  fontFamily: 'ui-monospace, monospace',
                                  width: 115,
                                  height: 34,
                                  borderRadius: 6,
                                  background: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                }}
                                value={timeInputValue}
                                onChange={(e) => handleTimeInputPicker(e.target.value)}
                              />
                            </div>
                          </div>

                          {/* Quick Minute Jumps (:00, :15, :30, :45) */}
                          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                            <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginRight: 4 }}>Minute:</span>
                            {[0, 15, 30, 45].map((m) => (
                              <button
                                key={m}
                                type="button"
                                className={`cron-preset-pill ${activeTime.minute === m ? 'active' : ''}`}
                                style={{ padding: '3px 8px', fontSize: 11 }}
                                onClick={() => updateActiveTime({ minute: m })}
                              >
                                :{String(m).padStart(2, '0')}
                              </button>
                            ))}
                          </div>

                          {/* Quick Preset Times */}
                          <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginRight: 4 }}>Presets:</span>
                            {[
                              { h: 9, m: 0, a: 'AM' as const, label: '9:00 AM' },
                              { h: 12, m: 30, a: 'PM' as const, label: '12:30 PM' },
                              { h: 3, m: 0, a: 'PM' as const, label: '3:00 PM' },
                              { h: 6, m: 15, a: 'PM' as const, label: '6:15 PM' },
                              { h: 9, m: 0, a: 'PM' as const, label: '9:00 PM' },
                            ].map((item) => (
                              <button
                                key={item.label}
                                type="button"
                                className={`cron-preset-pill ${activeTime.hour12 === item.h && activeTime.minute === item.m && activeTime.ampm === item.a ? 'active' : ''}`}
                                style={{ padding: '3px 8px', fontSize: 11 }}
                                onClick={() => updateActiveTime({ hour12: item.h, minute: item.m, ampm: item.a })}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Day Recurrence Options */}
                      <div>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'hsl(var(--foreground))', display: 'block', marginBottom: 6 }}>
                          Repeat Schedule:
                        </span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            className={`cron-preset-pill ${scheduleDays === 'daily' ? 'active' : ''}`}
                            onClick={() => handleDaysChange('daily')}
                          >
                            📅 Every Day
                          </button>
                          <button
                            type="button"
                            className={`cron-preset-pill ${scheduleDays === 'weekdays' ? 'active' : ''}`}
                            onClick={() => handleDaysChange('weekdays')}
                          >
                            💼 Weekdays (Mon–Fri)
                          </button>
                          <button
                            type="button"
                            className={`cron-preset-pill ${scheduleDays === 'weekends' ? 'active' : ''}`}
                            onClick={() => handleDaysChange('weekends')}
                          >
                            🏖️ Weekends (Sat–Sun)
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mode 2: Repeating Interval Mode */}
                  {scheduleType === 'interval' && (
                    <div>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: 'hsl(var(--foreground))', display: 'block', marginBottom: 6 }}>
                        Select Repeating Frequency:
                      </span>
                      <div className="cron-preset-grid">
                        <button
                          type="button"
                          className={`cron-preset-pill ${cronSchedule === '*/15 * * * *' ? 'active' : ''}`}
                          onClick={() => handleIntervalPresetChange('*/15 * * * *')}
                        >
                          Every 15 mins
                        </button>
                        <button
                          type="button"
                          className={`cron-preset-pill ${cronSchedule === '*/30 * * * *' ? 'active' : ''}`}
                          onClick={() => handleIntervalPresetChange('*/30 * * * *')}
                        >
                          Every 30 mins
                        </button>
                        <button
                          type="button"
                          className={`cron-preset-pill ${cronSchedule === '0 * * * *' ? 'active' : ''}`}
                          onClick={() => handleIntervalPresetChange('0 * * * *')}
                        >
                          Hourly (:00)
                        </button>
                        <button
                          type="button"
                          className={`cron-preset-pill ${cronSchedule === '0 */3 * * *' ? 'active' : ''}`}
                          onClick={() => handleIntervalPresetChange('0 */3 * * *')}
                        >
                          Every 3 Hours
                        </button>
                        <button
                          type="button"
                          className={`cron-preset-pill ${cronSchedule === '0 */6 * * *' ? 'active' : ''}`}
                          onClick={() => handleIntervalPresetChange('0 */6 * * *')}
                        >
                          Every 6 Hours
                        </button>
                        <button
                          type="button"
                          className={`cron-preset-pill ${cronSchedule === '0 */12 * * *' ? 'active' : ''}`}
                          onClick={() => handleIntervalPresetChange('0 */12 * * *')}
                        >
                          Every 12 Hours
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Human-Readable Schedule Card */}
                  <div className="cron-readable-summary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock size={14} color="#10b981" />
                    <span style={{ fontWeight: 600 }}>{describeCronMulti(cronSchedule)}</span>
                  </div>

                  {/* Advanced Raw Cron Syntax Accordion */}
                  <div style={{ marginTop: 2 }}>
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        fontSize: 11,
                        color: 'hsl(var(--muted-foreground))',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                      onClick={() => setShowAdvancedCron((prev) => !prev)}
                    >
                      {showAdvancedCron ? 'Hide Advanced Cron Syntax' : 'Edit Raw 5-Part Cron Syntax'}
                    </button>

                    {showAdvancedCron && (
                      <div style={{ marginTop: 8 }}>
                        <input
                          className="form-input"
                          style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}
                          value={cronSchedule}
                          onChange={(e) => setCronSchedule(e.target.value)}
                          placeholder="e.g. 30 12 * * *; 15 18 * * *"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={`modal-footer ${isMobile ? 'is-mobile-footer' : ''}`} style={{ flexShrink: 0 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving…' : agent ? 'Update Agent' : 'Create Agent in Space'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
