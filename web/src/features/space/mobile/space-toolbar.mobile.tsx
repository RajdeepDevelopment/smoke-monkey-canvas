import React, { useState } from 'react';
import { Plus, Maximize2, ShieldCheck, Sun, Moon, Check, Bot, LayoutGrid, Undo2, Redo2 } from 'lucide-react';
import type { SpaceAgentEntity } from '../../agent/agent.types.js';
import { type ThemeMode, THEMES } from '../space.toolbar.js';

interface SpaceToolbarMobileProps {
  agents: SpaceAgentEntity[];
  currentTheme: ThemeMode;
  onSelectTheme: (theme: ThemeMode) => void;
  onOpenSettings: () => void;
  onAddAgent: () => void;
  onFitView: () => void;
  onAutoArrange?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export const SpaceToolbarMobile: React.FC<SpaceToolbarMobileProps> = React.memo(({
  agents,
  currentTheme,
  onSelectTheme,
  onOpenSettings,
  onAddAgent,
  onFitView,
  onAutoArrange,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
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
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <t.icon size={12} style={{ flexShrink: 0 }} />
                      <span>{t.name}</span>
                    </span>
                    {isActive && <Check size={12} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Undo */}
        {onUndo && (
          <button
            type="button"
            className="mobile-tool-btn"
            onClick={onUndo}
            disabled={!canUndo}
            style={{ opacity: canUndo ? 1 : 0.4, cursor: canUndo ? 'pointer' : 'not-allowed' }}
            title="Undo (Ctrl+Z / ⌘Z)"
            aria-label="Undo"
          >
            <Undo2 size={14} />
          </button>
        )}

        {/* Redo */}
        {onRedo && (
          <button
            type="button"
            className="mobile-tool-btn"
            onClick={onRedo}
            disabled={!canRedo}
            style={{ opacity: canRedo ? 1 : 0.4, cursor: canRedo ? 'pointer' : 'not-allowed' }}
            title="Redo (Ctrl+Y / ⌘⇧Z)"
            aria-label="Redo"
          >
            <Redo2 size={14} />
          </button>
        )}

        {/* Auto-Arrange */}
        {onAutoArrange && (
          <button
            type="button"
            className="mobile-tool-btn"
            onClick={onAutoArrange}
            title="Auto-Arrange Canvas"
            aria-label="Auto-Arrange Canvas"
          >
            <LayoutGrid size={14} />
          </button>
        )}

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
