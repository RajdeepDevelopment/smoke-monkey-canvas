import React, { useState } from 'react';
import { X, Wrench, Check } from 'lucide-react';
import { BUILTIN_TOOLS } from '../common/tools-and-policies.js';
import type { SpaceAgentEntity } from '../agent/agent.types.js';

interface ToolsModalProps {
  isOpen: boolean;
  agent: SpaceAgentEntity | null;
  onSaveDisabledTools: (agentId: string, disabledTools: string[]) => Promise<void>;
  onClose: () => void;
}

export const ToolsModal: React.FC<ToolsModalProps> = ({
  isOpen,
  agent,
  onSaveDisabledTools,
  onClose,
}) => {
  if (!isOpen || !agent) return null;

  let currentDisabled: string[] = [];
  try {
    if (agent.disabled_tools) {
      currentDisabled = JSON.parse(agent.disabled_tools);
    }
  } catch {
    currentDisabled = [];
  }

  const [disabledTools, setDisabledTools] = useState<string[]>(currentDisabled);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [loading, setLoading] = useState(false);

  const categories = ['All', 'Filesystem', 'Terminal', 'Search', 'Git', 'Agent', 'Skills & MCP'];

  const toggleTool = (toolName: string) => {
    setDisabledTools((prev) =>
      prev.includes(toolName) ? prev.filter((t) => t !== toolName) : [...prev, toolName]
    );
  };

  const handleEnableAll = () => setDisabledTools([]);
  const handleDisableAll = () => setDisabledTools(BUILTIN_TOOLS.map((t) => t.name));

  const filteredTools =
    activeCategory === 'All'
      ? BUILTIN_TOOLS
      : BUILTIN_TOOLS.filter((t) => t.category === activeCategory);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSaveDisabledTools(agent.id, disabledTools);
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update tools configuration');
    } finally {
      setLoading(false);
    }
  };

  const activeCount = BUILTIN_TOOLS.length - disabledTools.length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wrench size={20} color="#10b981" />
            <span className="modal-title">Agent Tool Access Controls</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', margin: 0 }}>
              Control which tools <strong>{agent.name}</strong> is permitted to execute. Disabled tools will not be exposed to the model.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: 11, padding: '3px 8px' }}
                onClick={handleEnableAll}
                title="Enable all 24 tools"
              >
                Enable All
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: 11, padding: '3px 8px' }}
                onClick={handleDisableAll}
                title="Disable all tools"
              >
                Disable All
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '1px solid',
                  borderColor: activeCategory === cat ? '#10b981' : 'hsl(var(--border))',
                  background: activeCategory === cat ? 'rgba(16, 185, 129, 0.15)' : 'hsl(var(--card))',
                  color: activeCategory === cat ? '#10b981' : 'hsl(var(--muted-foreground))',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Tools Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxHeight: 340, overflowY: 'auto' }}>
            {filteredTools.map((tool) => {
              const isEnabled = !disabledTools.includes(tool.name);
              return (
                <div
                  key={tool.name}
                  onClick={() => toggleTool(tool.name)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: `1px solid ${isEnabled ? 'rgba(16, 185, 129, 0.35)' : 'hsl(var(--border))'}`,
                    background: isEnabled ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    cursor: 'pointer',
                    opacity: isEnabled ? 1 : 0.6,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      border: `1.5px solid ${isEnabled ? '#10b981' : 'hsl(var(--muted-foreground))'}`,
                      background: isEnabled ? '#10b981' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 2,
                      flexShrink: 0,
                    }}
                  >
                    {isEnabled && <Check size={11} color="#ffffff" strokeWidth={3} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                        {tool.name}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          padding: '1px 5px',
                          borderRadius: 3,
                          background: isEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                          color: isEnabled ? '#10b981' : 'hsl(var(--muted-foreground))',
                          fontWeight: 500,
                        }}
                      >
                        {isEnabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <div style={{ fontSize: 10.5, color: 'hsl(var(--muted-foreground))', marginTop: 2, lineHeight: 1.3 }}>
                      {tool.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <div style={{ marginRight: 'auto', fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
            Enabled: <strong style={{ color: '#10b981' }}>{activeCount}</strong> / {BUILTIN_TOOLS.length} tools
          </div>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{ background: '#10b981' }}
            disabled={loading}
            onClick={handleSave}
          >
            {loading ? 'Saving…' : 'Save Tool Access'}
          </button>
        </div>
      </div>
    </div>
  );
};
