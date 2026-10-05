import React, { useState } from 'react';
import { Plus, Bot, Clock, Maximize2, ShieldCheck, Sun, Moon, Check } from 'lucide-react';
import type { SpaceAgentEntity } from '../agent/agent.types.js';

export type ThemeMode =
  | 'theme-light-studio'
  | 'theme-light-paper'
  | 'theme-light-pastel'
  | 'theme-dark-midnight'
  | 'theme-dark-carbon'
  | 'theme-dark-nebula';

export interface ThemeOption {
  id: ThemeMode;
  name: string;
  type: 'light' | 'dark';
  icon: string;
}

export const THEMES: ThemeOption[] = [
  // 3 Light Modes
  { id: 'theme-light-studio', name: '☀️ Studio White', type: 'light', icon: '☀️' },
  { id: 'theme-light-paper', name: '📜 Warm Paper', type: 'light', icon: '📜' },
  { id: 'theme-light-pastel', name: '🌸 Pastel Sky', type: 'light', icon: '🌸' },
  // 3 Dark Modes
  { id: 'theme-dark-midnight', name: '🌌 Cyber Midnight', type: 'dark', icon: '🌌' },
  { id: 'theme-dark-carbon', name: '⬛ Obsidian Carbon', type: 'dark', icon: '⬛' },
  { id: 'theme-dark-nebula', name: '🔮 Deep Nebula', type: 'dark', icon: '🔮' },
];

interface SpaceToolbarProps {
  agents: SpaceAgentEntity[];
  currentTheme: ThemeMode;
  onSelectTheme: (theme: ThemeMode) => void;
  onOpenSettings: () => void;
  onAddAgent: () => void;
  onFitView: () => void;
}

function areToolbarPropsEqual(prev: SpaceToolbarProps, next: SpaceToolbarProps) {
  if (prev.currentTheme !== next.currentTheme) return false;
  if (prev.agents.length !== next.agents.length) return false;

  for (let i = 0; i < prev.agents.length; i++) {
    const p = prev.agents[i];
    const n = next.agents[i];
    if (!n || p.id !== n.id || p.status !== n.status || p.cron_enabled !== n.cron_enabled) {
      return false;
    }
  }
  return true;
}

export const SpaceToolbar: React.FC<SpaceToolbarProps> = React.memo(({
  agents,
  currentTheme,
  onSelectTheme,
  onOpenSettings,
  onAddAgent,
  onFitView,
}) => {
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const runningCount = agents.filter((a) => a.status === 'running').length;
  const scheduledCount = agents.filter((a) => a.cron_enabled === 1).length;

  const currentThemeObj = THEMES.find((t) => t.id === currentTheme) || THEMES[0];

  return (
    <div className="space-toolbar">
      {/* Brand with pulled Smoke Monkey Mascot */}
      <div className="toolbar-brand" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <img
          src="/smoke-monkey-mascot.png"
          alt="Smoke Monkey"
          className="toolbar-mascot"
          style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'contain', flexShrink: 0 }}
        />
        <span style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap' }}>Smoke Monkey Canvas</span>
      </div>

      {/* Agents Count */}
      <div className="toolbar-stat" style={{ flexShrink: 0 }}>
        <Bot size={13} />
        <span>{agents.length} Agents</span>
      </div>

      {/* Running Count */}
      {runningCount > 0 && (
        <div
          className="toolbar-stat"
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#10b981',
            fontWeight: 600,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <span className="status-dot-pulse" style={{ width: 7, height: 7, background: '#10b981' }} />
          <span>{runningCount} Running</span>
        </div>
      )}

      {/* Scheduled Count */}
      {scheduledCount > 0 && (
        <div className="toolbar-stat" style={{ background: 'rgba(245, 158, 11, 0.18)', color: '#f59e0b', flexShrink: 0 }}>
          <Clock size={12} />
          <span>{scheduledCount} Scheduled</span>
        </div>
      )}

      {/* Add Agent Button */}
      <button
        className="toolbar-btn"
        onClick={onAddAgent}
        data-tooltip="Add Agent"
        data-tooltip-shortcut="⌘N"
        data-tooltip-side="bottom"
        style={{ flexShrink: 0 }}
      >
        <Plus size={14} />
        <span className="toolbar-btn-label">Add Agent</span>
      </button>

      {/* API Keys / Secure Credentials Button */}
      <button
        className="toolbar-icon-btn"
        onClick={onOpenSettings}
        data-tooltip="API Keys"
        data-tooltip-shortcut="⌘,"
        data-tooltip-side="bottom"
        style={{ flexShrink: 0 }}
      >
        <ShieldCheck size={15} color="#10b981" />
      </button>

      {/* 6-Theme Dropdown (3 Light Modes, 3 Dark Modes) */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          className="toolbar-icon-btn theme-toggle-btn"
          onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
          data-tooltip="Switch Theme"
          data-tooltip-side="bottom"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999 }}
        >
          {currentThemeObj.type === 'light' ? <Sun size={13} color="#f59e0b" /> : <Moon size={13} color="#8b5cf6" />}
          <span className="toolbar-theme-label" style={{ fontSize: 11, fontWeight: 600 }}>
            {currentThemeObj.name.replace(/^[^\s]+\s*/, '')}
          </span>
        </button>

        {isThemeMenuOpen && (
          <div
            className="theme-dropdown-menu"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              minWidth: 230,
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 12,
              padding: 6,
              boxShadow: '0 16px 36px -4px rgba(0, 0, 0, 0.45)',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                padding: '6px 8px 4px',
                color: 'hsl(var(--muted-foreground))',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Sun size={11} color="#f59e0b" />
              <span>Light Modes (3)</span>
            </div>
            {THEMES.filter((t) => t.type === 'light').map((t) => {
              const isActive = currentTheme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: 7,
                    border: isActive ? '1px solid #2563eb' : '1px solid transparent',
                    background: isActive ? 'rgba(37, 99, 235, 0.12)' : 'transparent',
                    color: isActive ? '#3b82f6' : 'hsl(var(--foreground))',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: 12,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.12s ease',
                  }}
                  onClick={() => {
                    onSelectTheme(t.id);
                    setIsThemeMenuOpen(false);
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span>{t.icon}</span>
                    <span>{t.name.replace(/^[^\s]+\s*/, '')}</span>
                  </span>
                  {isActive && <Check size={13} color="#3b82f6" />}
                </button>
              );
            })}

            <div
              style={{
                height: 1,
                background: 'hsl(var(--border))',
                margin: '4px 0',
              }}
            />

            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                padding: '4px 8px 4px',
                color: 'hsl(var(--muted-foreground))',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Moon size={11} color="#8b5cf6" />
              <span>Dark Modes (3)</span>
            </div>
            {THEMES.filter((t) => t.type === 'dark').map((t) => {
              const isActive = currentTheme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: 7,
                    border: isActive ? '1px solid #06b6d4' : '1px solid transparent',
                    background: isActive ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
                    color: isActive ? '#06b6d4' : 'hsl(var(--foreground))',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: 12,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.12s ease',
                  }}
                  onClick={() => {
                    onSelectTheme(t.id);
                    setIsThemeMenuOpen(false);
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span>{t.icon}</span>
                    <span>{t.name.replace(/^[^\s]+\s*/, '')}</span>
                  </span>
                  {isActive && <Check size={13} color="#06b6d4" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Fit View Button */}
      <button
        className="toolbar-icon-btn"
        onClick={onFitView}
        data-tooltip="Fit all agents into view"
        data-tooltip-shortcut="Space"
        data-tooltip-side="bottom"
      >
        <Maximize2 size={13} />
      </button>
    </div>
  );
}, areToolbarPropsEqual);
