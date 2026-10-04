import React, { useState, useEffect, useMemo } from 'react';
import { Clock, ChevronUp, ChevronDown, Check, Calendar, Zap } from 'lucide-react';

export interface ClockTimeState {
  hour12: number;
  minute: number;
  ampm: 'AM' | 'PM';
  days: 'daily' | 'weekdays' | 'weekends';
}

export const AnalogClockFace: React.FC<{ hour: number; minute: number; size?: number }> = ({
  hour,
  minute,
  size = 80,
}) => {
  const hourAngle = ((hour % 12) + minute / 60) * 30;
  const minuteAngle = minute * 6;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 120 120">
        {/* Clock Outer Rim */}
        <circle cx="60" cy="60" r="56" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2.5" />
        <circle
          cx="60"
          cy="60"
          r="49"
          fill="transparent"
          stroke="hsl(var(--border) / 0.5)"
          strokeWidth="1"
          strokeDasharray="2 3"
        />

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

        {/* Numbers 12, 3, 6, 9 */}
        <text x="60" y="29" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="hsl(var(--foreground))">
          12
        </text>
        <text x="96" y="63.5" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="hsl(var(--foreground))">
          3
        </text>
        <text x="60" y="99" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="hsl(var(--foreground))">
          6
        </text>
        <text x="24" y="63.5" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="hsl(var(--foreground))">
          9
        </text>

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
          style={{ transition: 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />

        {/* Minute Hand (Emerald Accent) */}
        <line
          x1="60"
          y1="60"
          x2="60"
          y2="21"
          stroke="#10b981"
          strokeWidth="2.4"
          strokeLinecap="round"
          transform={`rotate(${minuteAngle} 60 60)`}
          style={{ transition: 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />

        {/* Center Pivot Point */}
        <circle cx="60" cy="60" r="4.5" fill="#10b981" stroke="hsl(var(--card))" strokeWidth="1.5" />
      </svg>
    </div>
  );
};

export function parseCronToSchedulerState(cron: string): {
  mode: 'manual' | 'clock' | 'interval' | 'custom';
  time: ClockTimeState;
  intervalValue: string;
} {
  const trimmed = (cron || '').trim();
  const defaultTime: ClockTimeState = { hour12: 9, minute: 0, ampm: 'AM', days: 'daily' };

  if (!trimmed) {
    return { mode: 'manual', time: defaultTime, intervalValue: '0 */4 * * *' };
  }

  const commonIntervals = [
    '*/5 * * * *',
    '*/15 * * * *',
    '*/30 * * * *',
    '0 * * * *',
    '0 */2 * * *',
    '0 */3 * * *',
    '0 */4 * * *',
    '0 */6 * * *',
    '0 */12 * * *',
    '0 0 * * *',
  ];
  if (commonIntervals.includes(trimmed)) {
    return { mode: 'interval', time: defaultTime, intervalValue: trimmed };
  }

  const match = trimmed.match(/^(\d{1,2})\s+(\d{1,2})\s+\*\s+\*\s+(\*|1-5|6,0)$/);
  if (match) {
    const minute = parseInt(match[1], 10);
    const hour24 = parseInt(match[2], 10);
    const dayStr = match[3];
    const ampm: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM';
    let hour12 = hour24 % 12;
    if (hour12 === 0) hour12 = 12;
    const days: 'daily' | 'weekdays' | 'weekends' =
      dayStr === '1-5' ? 'weekdays' : dayStr === '6,0' ? 'weekends' : 'daily';

    return {
      mode: 'clock',
      time: { hour12, minute, ampm, days },
      intervalValue: '0 */4 * * *',
    };
  }

  return { mode: 'custom', time: defaultTime, intervalValue: '0 */4 * * *' };
}

export function buildCronFromClock(time: ClockTimeState): string {
  let h24 = time.hour12 % 12;
  if (time.ampm === 'PM') h24 += 12;
  const dayStr = time.days === 'weekdays' ? '1-5' : time.days === 'weekends' ? '6,0' : '*';
  return `${time.minute} ${h24} * * ${dayStr}`;
}

export function describeCron(cron: string): string {
  const trimmed = (cron || '').trim();
  if (!trimmed) return 'Manual / On-demand (No automated schedule)';
  if (trimmed === '*/5 * * * *') return 'Runs every 5 minutes';
  if (trimmed === '*/15 * * * *') return 'Runs every 15 minutes';
  if (trimmed === '*/30 * * * *') return 'Runs every 30 minutes';
  if (trimmed === '0 * * * *') return 'Runs once every hour at minute :00';
  if (trimmed === '0 */2 * * *') return 'Runs every 2 hours';
  if (trimmed === '0 */3 * * *') return 'Runs every 3 hours';
  if (trimmed === '0 */4 * * *') return 'Runs every 4 hours';
  if (trimmed === '0 */6 * * *') return 'Runs every 6 hours';
  if (trimmed === '0 */12 * * *') return 'Runs every 12 hours';
  if (trimmed === '0 0 * * *') return 'Runs daily at midnight (12:00 AM)';

  const match = trimmed.match(/^(\d{1,2})\s+(\d{1,2})\s+\*\s+\*\s+(\*|1-5|6,0)$/);
  if (match) {
    const minute = parseInt(match[1], 10);
    const hour24 = parseInt(match[2], 10);
    const dayStr = match[3];
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    let hour12 = hour24 % 12;
    if (hour12 === 0) hour12 = 12;
    const timeStr = `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
    const dayDesc =
      dayStr === '1-5' ? 'weekdays (Mon–Fri)' : dayStr === '6,0' ? 'weekends (Sat–Sun)' : 'daily';
    return `Runs ${dayDesc} at ${timeStr}`;
  }

  return `Custom cron expression: ${trimmed}`;
}

const INTERVAL_OPTIONS = [
  { label: 'Every 5m', cron: '*/5 * * * *' },
  { label: 'Every 15m', cron: '*/15 * * * *' },
  { label: 'Every 30m', cron: '*/30 * * * *' },
  { label: 'Hourly (:00)', cron: '0 * * * *' },
  { label: 'Every 4 Hours', cron: '0 */4 * * *' },
  { label: 'Every 12 Hours', cron: '0 */12 * * *' },
  { label: 'Daily Midnight', cron: '0 0 * * *' },
];

const TIME_PRESETS = [
  { label: '9:00 AM', h: 9, m: 0, a: 'AM' as const },
  { label: '12:00 PM', h: 12, m: 0, a: 'PM' as const },
  { label: '2:30 PM', h: 2, m: 30, a: 'PM' as const },
  { label: '6:00 PM', h: 6, m: 0, a: 'PM' as const },
];

interface AgentClockSchedulerProps {
  cron: string;
  onChange: (newCron: string) => void;
}

export const AgentClockScheduler: React.FC<AgentClockSchedulerProps> = ({ cron, onChange }) => {
  const parsed = useMemo(() => parseCronToSchedulerState(cron), [cron]);

  const [activeTab, setActiveTab] = useState<'clock' | 'interval' | 'manual' | 'custom'>(parsed.mode);
  const [clockTime, setClockTime] = useState<ClockTimeState>(parsed.time);
  const [customInput, setCustomInput] = useState<string>(cron || '');

  // Keep internal state synced when external cron changes
  useEffect(() => {
    setActiveTab(parsed.mode);
    setClockTime(parsed.time);
    setCustomInput(cron || '');
  }, [cron, parsed.mode, parsed.time]);

  const updateClockTime = (updates: Partial<ClockTimeState>) => {
    const nextTime = { ...clockTime, ...updates };
    setClockTime(nextTime);
    const newCron = buildCronFromClock(nextTime);
    onChange(newCron);
  };

  const selectInterval = (intervalCron: string) => {
    onChange(intervalCron);
  };

  const handleTabChange = (tab: 'clock' | 'interval' | 'manual' | 'custom') => {
    setActiveTab(tab);
    if (tab === 'manual') {
      onChange('');
    } else if (tab === 'clock') {
      onChange(buildCronFromClock(clockTime));
    } else if (tab === 'interval') {
      onChange(parsed.intervalValue || '0 */4 * * *');
    } else if (tab === 'custom') {
      onChange(customInput.trim() || '0 */4 * * *');
    }
  };

  const description = describeCron(cron);

  return (
    <div className="lib-scheduler-widget">
      {/* Scheduler Header & Mode Selector Tabs */}
      <div className="lib-scheduler-modes">
        <button
          type="button"
          className={`lib-sched-mode-btn ${activeTab === 'manual' ? 'active' : ''}`}
          onClick={() => handleTabChange('manual')}
        >
          <span>Manual</span>
        </button>
        <button
          type="button"
          className={`lib-sched-mode-btn ${activeTab === 'clock' ? 'active' : ''}`}
          onClick={() => handleTabChange('clock')}
        >
          <Clock size={11} />
          <span>Clock Time</span>
        </button>
        <button
          type="button"
          className={`lib-sched-mode-btn ${activeTab === 'interval' ? 'active' : ''}`}
          onClick={() => handleTabChange('interval')}
        >
          <Zap size={11} />
          <span>Interval</span>
        </button>
        <button
          type="button"
          className={`lib-sched-mode-btn ${activeTab === 'custom' ? 'active' : ''}`}
          onClick={() => handleTabChange('custom')}
        >
          <span>Syntax</span>
        </button>
      </div>

      {/* ── Mode 1: Manual / Off ── */}
      {activeTab === 'manual' && (
        <div className="lib-sched-manual-box">
          <div className="lib-sched-manual-text">
            <span>Runs only when manually triggered on canvas. No automated cron loop.</span>
          </div>
          <button
            type="button"
            className="lib-sched-enable-btn"
            onClick={() => handleTabChange('clock')}
          >
            <Clock size={11} /> Enable Scheduled Execution
          </button>
        </div>
      )}

      {/* ── Mode 2: Interactive Clock Time ── */}
      {activeTab === 'clock' && (
        <div className="lib-sched-clock-panel">
          {/* Main Visual Row: SVG Clock Face + Digital Steppers */}
          <div className="lib-clock-visual-row">
            <AnalogClockFace hour={clockTime.hour12} minute={clockTime.minute} size={78} />

            <div className="lib-clock-controls">
              <div className="lib-clock-digits-box">
                {/* Hour Stepper */}
                <div className="lib-stepper-col">
                  <button
                    type="button"
                    className="lib-stepper-btn"
                    onClick={() => {
                      const nextH = clockTime.hour12 >= 12 ? 1 : clockTime.hour12 + 1;
                      updateClockTime({ hour12: nextH });
                    }}
                    title="Increase Hour"
                  >
                    <ChevronUp size={13} />
                  </button>
                  <span className="lib-digit-display">{String(clockTime.hour12).padStart(2, '0')}</span>
                  <button
                    type="button"
                    className="lib-stepper-btn"
                    onClick={() => {
                      const nextH = clockTime.hour12 <= 1 ? 12 : clockTime.hour12 - 1;
                      updateClockTime({ hour12: nextH });
                    }}
                    title="Decrease Hour"
                  >
                    <ChevronDown size={13} />
                  </button>
                </div>

                <span className="lib-clock-colon">:</span>

                {/* Minute Stepper */}
                <div className="lib-stepper-col">
                  <button
                    type="button"
                    className="lib-stepper-btn"
                    onClick={() => {
                      const nextM = (clockTime.minute + 5) % 60;
                      updateClockTime({ minute: nextM });
                    }}
                    title="Increase Minute (+5)"
                  >
                    <ChevronUp size={13} />
                  </button>
                  <span className="lib-digit-display">{String(clockTime.minute).padStart(2, '0')}</span>
                  <button
                    type="button"
                    className="lib-stepper-btn"
                    onClick={() => {
                      const nextM = (clockTime.minute - 5 + 60) % 60;
                      updateClockTime({ minute: nextM });
                    }}
                    title="Decrease Minute (-5)"
                  >
                    <ChevronDown size={13} />
                  </button>
                </div>

                {/* AM / PM Toggle */}
                <div className="lib-ampm-col">
                  <button
                    type="button"
                    className={`lib-ampm-btn ${clockTime.ampm === 'AM' ? 'active' : ''}`}
                    onClick={() => updateClockTime({ ampm: 'AM' })}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    className={`lib-ampm-btn ${clockTime.ampm === 'PM' ? 'active' : ''}`}
                    onClick={() => updateClockTime({ ampm: 'PM' })}
                  >
                    PM
                  </button>
                </div>
              </div>

              {/* Quick Time Pills */}
              <div className="lib-time-presets">
                {TIME_PRESETS.map((p) => {
                  const isMatch =
                    clockTime.hour12 === p.h && clockTime.minute === p.m && clockTime.ampm === p.a;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      className={`lib-time-preset-pill ${isMatch ? 'active' : ''}`}
                      onClick={() =>
                        updateClockTime({ hour12: p.h, minute: p.m, ampm: p.a })
                      }
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Days Recurrence Selector */}
          <div className="lib-sched-days-row">
            <span className="lib-sched-sublabel">
              <Calendar size={10} /> Repeat:
            </span>
            <div className="lib-days-pills">
              <button
                type="button"
                className={`lib-day-pill ${clockTime.days === 'daily' ? 'active' : ''}`}
                onClick={() => updateClockTime({ days: 'daily' })}
              >
                Everyday
              </button>
              <button
                type="button"
                className={`lib-day-pill ${clockTime.days === 'weekdays' ? 'active' : ''}`}
                onClick={() => updateClockTime({ days: 'weekdays' })}
              >
                Weekdays (Mon–Fri)
              </button>
              <button
                type="button"
                className={`lib-day-pill ${clockTime.days === 'weekends' ? 'active' : ''}`}
                onClick={() => updateClockTime({ days: 'weekends' })}
              >
                Weekends
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mode 3: Repeating Interval Presets ── */}
      {activeTab === 'interval' && (
        <div className="lib-sched-interval-grid">
          {INTERVAL_OPTIONS.map((item) => {
            const isMatch = cron.trim() === item.cron;
            return (
              <button
                key={item.cron}
                type="button"
                className={`lib-interval-pill ${isMatch ? 'active' : ''}`}
                onClick={() => selectInterval(item.cron)}
              >
                <span>{item.label}</span>
                {isMatch && <Check size={11} />}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Mode 4: Custom Cron Syntax ── */}
      {activeTab === 'custom' && (
        <div className="lib-sched-custom-box">
          <input
            type="text"
            className="lib-field-input"
            value={customInput}
            placeholder="e.g. 0 */4 * * * or 30 14 * * 1-5"
            onChange={(e) => {
              setCustomInput(e.target.value);
              onChange(e.target.value);
            }}
          />
          <span className="lib-sched-hint">
            Standard 5-part cron: <code>minute hour day month day-of-week</code>
          </span>
        </div>
      )}

      {/* Human Readable Status Preview Bar */}
      {cron.trim() && (
        <div className="lib-sched-summary-bar">
          <Clock size={11} className="lib-sched-summary-icon" />
          <span className="lib-sched-summary-text">{description}</span>
          <code className="lib-sched-summary-cron">{cron.trim()}</code>
        </div>
      )}
    </div>
  );
};
