import React, { useState } from 'react';
import { X, ShieldCheck, ShieldAlert, Plus, Check } from 'lucide-react';
import { STOCK_POLICIES } from '../common/tools-and-policies.js';
import type { SpaceAgentEntity } from '../agent/agent.types.js';

interface PolicyModalProps {
  isOpen: boolean;
  agent: SpaceAgentEntity | null;
  onSavePolicies: (agentId: string, policies: string[]) => Promise<void>;
  onClose: () => void;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({
  isOpen,
  agent,
  onSavePolicies,
  onClose,
}) => {
  if (!isOpen || !agent) return null;

  let currentPolicies: string[] = [];
  try {
    if (agent.policies) {
      currentPolicies = JSON.parse(agent.policies);
    }
  } catch {
    if (agent.policies) currentPolicies = [agent.policies];
  }

  const [selectedPolicies, setSelectedPolicies] = useState<string[]>(currentPolicies);
  const [customPolicyInput, setCustomPolicyInput] = useState('');
  const [loading, setLoading] = useState(false);

  const togglePolicy = (ruleText: string) => {
    setSelectedPolicies((prev) =>
      prev.includes(ruleText) ? prev.filter((p) => p !== ruleText) : [...prev, ruleText]
    );
  };

  const handleAddCustom = () => {
    const trimmed = customPolicyInput.trim();
    if (!trimmed) return;
    if (!selectedPolicies.includes(trimmed)) {
      setSelectedPolicies((prev) => [...prev, trimmed]);
    }
    setCustomPolicyInput('');
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSavePolicies(agent.id, selectedPolicies);
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save policies');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={20} color="#8b5cf6" />
            <span className="modal-title">Agent Boundary & Guardrail Policies</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginTop: 0, marginBottom: 14 }}>
            Enforce behavioral boundaries on <strong>{agent.name}</strong>. Attached policies are strictly injected into the system prompt to prevent errors, data leaks, and destructive mutations.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
            {STOCK_POLICIES.map((p) => {
              const active = selectedPolicies.includes(p.rule);
              return (
                <div
                  key={p.id}
                  onClick={() => togglePolicy(p.rule)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: `1px solid ${active ? '#8b5cf6' : 'hsl(var(--border))'}`,
                    background: active ? 'rgba(139, 92, 246, 0.12)' : 'hsl(var(--card))',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: `1.5px solid ${active ? '#8b5cf6' : 'hsl(var(--muted-foreground))'}`,
                      background: active ? '#8b5cf6' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 2,
                      flexShrink: 0,
                    }}
                  >
                    {active && <Check size={13} color="#ffffff" strokeWidth={3} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))' }}>{p.name}</span>
                      <span
                        style={{
                          fontSize: 9,
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: 'hsl(var(--muted-foreground))',
                          fontWeight: 500,
                        }}
                      >
                        {p.category}
                      </span>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'hsl(var(--muted-foreground))', lineHeight: 1.4 }}>
                      {p.rule}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Custom policies added */}
            {selectedPolicies
              .filter((p) => !STOCK_POLICIES.some((sp) => sp.rule === p))
              .map((customText, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #8b5cf6',
                    background: 'rgba(139, 92, 246, 0.15)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <ShieldAlert size={14} color="#a78bfa" />
                    <span>{customText}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePolicy(customText)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'hsl(var(--muted-foreground))',
                      cursor: 'pointer',
                      padding: 2,
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
          </div>

          {/* Add Custom Policy Input */}
          <div style={{ marginTop: 14 }}>
            <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>
              Add Custom Boundary Instruction
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-input"
                style={{ flex: 1 }}
                placeholder="e.g. Always generate responses strictly in valid JSON"
                value={customPolicyInput}
                onChange={(e) => setCustomPolicyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustom();
                  }
                }}
              />
              <button
                type="button"
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={handleAddCustom}
              >
                <Plus size={14} />
                <span>Add</span>
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{ background: '#8b5cf6' }}
            disabled={loading}
            onClick={handleSave}
          >
            {loading ? 'Saving…' : `Apply Policies (${selectedPolicies.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};
