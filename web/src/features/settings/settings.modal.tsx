import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Key, Check } from 'lucide-react';
import { BrandIcons } from '../common/brand-icons.js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [keys, setKeys] = useState<Record<string, { masked: string; isSet: boolean }>>({});
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/settings/keys')
      .then((r) => r.json())
      .then(setKeys)
      .catch((err) => console.error('Failed to load settings keys:', err));
  }, []);

  const handleChange = (key: string, val: string) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/settings/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      setSavedSuccess(true);

      // Refresh masked keys
      const refreshed = await fetch('/api/settings/keys').then((r) => r.json());
      setKeys(refreshed);
      setFormData({});
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error saving settings');
    } finally {
      setLoading(false);
    }
  };

  const KEY_FIELDS = [
    { id: 'NVIDIA_API_KEY', label: 'NVIDIA Hosted NIM Key', provider: 'nvidia', placeholder: 'nvapi-...' },
    { id: 'ANTHROPIC_API_KEY', label: 'Anthropic Claude Key', provider: 'anthropic', placeholder: 'sk-ant-...' },
    { id: 'OPENAI_API_KEY', label: 'OpenAI API Key', provider: 'openai', placeholder: 'sk-proj-...' },
    { id: 'GEMINI_API_KEY', label: 'Google Gemini API Key', provider: 'gemini', placeholder: 'AIzaSy...' },
    { id: 'GROQ_API_KEY', label: 'Groq API Key', provider: 'groq', placeholder: 'gsk_...' },
    { id: 'OPENROUTER_API_KEY', label: 'OpenRouter Unified Key', provider: 'openrouter', placeholder: 'sk-or-...' },
    { id: 'FIRECRAWL_API_KEY', label: 'Firecrawl Web Scraper Key', provider: 'firecrawl', placeholder: 'fc-...' },
    { id: 'TAVILY_API_KEY', label: 'Tavily Search API Key', provider: 'tavily', placeholder: 'tvly-...' },
    { id: 'GITHUB_TOKEN', label: 'GitHub Personal Access Token', provider: 'github', placeholder: 'ghp_...' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={20} color="#10b981" />
            <span className="modal-title">Secure API Keys & Credentials</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4, background: 'rgba(125,125,125,0.08)', padding: 10, borderRadius: 8 }}>
              🔒 <strong>Encrypted Local Storage:</strong> Keys are saved directly into your local SQLite database (<code>~/.smoke-monkey/canvas.db</code>) and injected securely into agent execution runs. They are never sent to third-party tracking servers.
            </div>

            {savedSuccess && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                <Check size={14} />
                <span>API Keys securely updated!</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {KEY_FIELDS.map((f) => {
                const Icon = BrandIcons[f.provider];
                const keyInfo = keys[f.id];
                const isConfigured = keyInfo?.isSet;

                return (
                  <div key={f.id} className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        {Icon && <Icon size={14} />}
                        <span>{f.label}</span>
                      </label>
                      {isConfigured ? (
                        <span style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Check size={11} /> {keyInfo?.masked}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>Not set</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="password"
                        className="form-input"
                        style={{ flex: 1 }}
                        placeholder={isConfigured ? `Configured (${keyInfo?.masked}). Enter new to overwrite.` : f.placeholder}
                        value={formData[f.id] || ''}
                        onChange={(e) => handleChange(f.id, e.target.value)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Close
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              <Key size={14} />
              <span>{loading ? 'Saving…' : 'Save Credentials'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
