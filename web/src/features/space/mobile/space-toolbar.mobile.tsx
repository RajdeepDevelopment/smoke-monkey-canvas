import React, { useState } from 'react';
import { Plus, Maximize2, ShieldCheck, Sun, Moon, Check, Bot } from 'lucide-react';
import type { SpaceAgentEntity } from '../../agent/agent.types.js';
import { type ThemeMode, THEMES } from '../space.toolbar.js';

interface SpaceToolbarMobileProps {
  agents: SpaceAgentEntity[];
  currentTheme: ThemeMode;
  onSelectTheme: (theme: ThemeMode) => void;
  onOpenSettings: () => void;
  onAddAgent: () => void;
  onFitView: () => void;
}

export const SpaceToolbarMobile: React.FC<SpaceToolbarMobileProps> = React.memo(({
  agents,
  currentTheme,
  onSelectTheme,
  onOpenSettings,
  onAddAgent,
  onFitView,
}) => {
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const runningCount = agents.filter((a) => a.status === 'running').length;

  return (
    <header className="space-toolbar-mobile nodrag nopan">
      <div className="mobile-toolbar-left">
        <div className="mobile-brand-mascot" title="Smoke Monkey Canvas">
          <img
            src="/smoke-monkey-mascot.png"
            alt="Smoke Monkey"
            style={{ width: 26, height: 26, borderRadius: 6, objectFit: 'contain' }}
          />
        </div>
        <div className="mobile-agent-pill" title={`${agents.length} Agents configured`}>
          <Bot size={12} />
          <span>{agents.length}</span>
          {runningCount > 0 && (
            <span className="mobile-running-dot" title={`${runningCount} Running`} />
          )}
        </div>
      </div>

      <div className="mobile-toolbar-actions">
        {/* Quick Add Agent */}
        <button
          type="button"
          className="mobile-tool-btn primary"
          onClick={onAddAgent}
          title="Add New Agent"
          aria-label="Add Agent"
        >
          <Plus size={15} />
        </button>

        {/* API Keys / Credentials */}
        <button
          type="button"
          className="mobile-tool-btn"
          onClick={onOpenSettings}
          title="API Keys & Settings"
          aria-label="API Keys"
        >
          <ShieldCheck size={15} color="#10b981" />
        </button>

        {/* Theme Picker */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className={`mobile-tool-btn ${isThemeMenuOpen ? 'active' : ''}`}
            onClick={() => setIsThemeMenuOpen((prev) => !prev)}
            title="Switch Workspace Theme"
            aria-label="Workspace Theme"
          >
            {currentTheme.startsWith('theme-light') ? (
              <Sun size={15} color="#f59e0b" />
            ) : (
              <Moon size={15} color="#8b5cf6" />
            )}
          </button>

          {isThemeMenuOpen && (
            <div className="mobile-theme-dropdown" onClick={(e) => e.stopPropagation()}>
              <div className="mobile-dropdown-title">Themes</div>
              {THEMES.map((t) => {
                const isActive = currentTheme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`mobile-theme-opt ${isActive ? 'selected' : ''}`}
                    onClick={() => {
                      onSelectTheme(t.id);
                      setIsThemeMenuOpen(false);
                    }}
                  >
                    <span>{t.icon} {t.name.replace(/^[^\s]+\s*/, '')}</span>
                    {isActive && <Check size={12} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Fit View */}
        <button
          type="button"
          className="mobile-tool-btn"
          onClick={onFitView}
          title="Fit Agents into View"
          aria-label="Fit View"
        >
          <Maximize2 size={14} />
        </button>
      </div>
    </header>
  );
});
