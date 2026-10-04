import React, { useState, useEffect } from 'react';
import { X, Sparkles, Upload, FolderUp, Check, Search, BookOpen } from 'lucide-react';
import type { SkillInput } from './skill.types.js';

interface StockSkillItem {
  id: string;
  category: string;
  name: string;
  description: string | null;
  content: string;
}

interface SkillModalProps {
  isOpen: boolean;
  agentId: string | null;
  onAttach: (agentId: string, skillData: SkillInput) => Promise<void>;
  onClose: () => void;
}

export const CATEGORY_META: Record<string, { icon: string }> = {
  All: { icon: '✨' },
  'Architecture & Planning': { icon: '📐' },
  'Backend & APIs': { icon: '⚡' },
  'DevOps & CI/CD': { icon: '🚀' },
  'Frontend & UI': { icon: '🎨' },
  'Observability & Debugging': { icon: '🔍' },
  'Performance & Optimization': { icon: '⚡' },
  'QA & Testing': { icon: '🧪' },
  'Review & Code Quality': { icon: '📋' },
  'Security & Hardening': { icon: '🛡️' },
  'Marketing & SEO': { icon: '📈' },
  'Web Scraping & Crawling': { icon: '🕸️' },
};

export const SkillModal: React.FC<SkillModalProps> = ({ isOpen, agentId, onAttach, onClose }) => {
  if (!isOpen || !agentId) return null;

  const [activeTab, setActiveTab] = useState<'stock' | 'upload'>('stock');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [stockSkills, setStockSkills] = useState<StockSkillItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Upload Form State
  const [uploadCategory, setUploadCategory] = useState('Backend & APIs');
  const [uploadName, setUploadName] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadContent, setUploadContent] = useState('');
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/skills/categories')
      .then((r) => r.json())
      .then((cats) => {
        setCategories(cats);
        if (cats.length > 0) setUploadCategory(cats[0]);
      })
      .catch(() => {});

    fetch('/api/skills/stock')
      .then((r) => r.json())
      .then(setStockSkills)
      .catch(() => {});
  }, [isOpen]);

  // Handle single file upload
  const handleSingleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target?.result || '');
      setUploadContent(text);

      // Parse frontmatter
      const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
      if (match) {
        const fm = match[1];
        const nameMatch = fm.match(/name:\s*(.+)/);
        const descMatch = fm.match(/description:\s*(.+)/);
        if (nameMatch) setUploadName(nameMatch[1].trim().replace(/^['"]|['"]$/g, ''));
        if (descMatch) setUploadDesc(descMatch[1].trim().replace(/^['"]|['"]$/g, ''));
      } else {
        const baseName = file.name.replace(/\.(md|markdown|txt)$/i, '');
        setUploadName(baseName);
        setUploadDesc(`Custom skill imported from ${file.name}`);
      }
      setUploadStatus(`Loaded file: ${file.name}`);
    };
    reader.readAsText(file);
  };

  // Handle folder upload (directory of skills)
  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let foundSkill = false;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.name.toLowerCase() === 'skill.md' || file.name.toLowerCase().endsWith('.md')) {
        const text = await file.text();
        setUploadContent(text);

        const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
        if (match) {
          const fm = match[1];
          const nameMatch = fm.match(/name:\s*(.+)/);
          const descMatch = fm.match(/description:\s*(.+)/);
          if (nameMatch) setUploadName(nameMatch[1].trim().replace(/^['"]|['"]$/g, ''));
          if (descMatch) setUploadDesc(descMatch[1].trim().replace(/^['"]|['"]$/g, ''));
        } else {
          setUploadName(file.webkitRelativePath.split('/')[0] || file.name);
          setUploadDesc(`Skill folder: ${file.webkitRelativePath}`);
        }
        setUploadStatus(`Extracted ${file.name} from folder`);
        foundSkill = true;
        break;
      }
    }
    if (!foundSkill) {
      alert('No SKILL.md or Markdown file found in selected folder.');
    }
  };

  // Submit Uploaded Skill
  const handleSaveAndAttachUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadName.trim() || !uploadContent.trim()) {
      alert('Please provide skill name and content.');
      return;
    }

    setLoading(true);
    try {
      // 1. Save to stock_skills so it appears for all agents next time
      await fetch('/api/skills/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: uploadName.trim(),
          category: uploadCategory,
          description: uploadDesc.trim(),
          content: uploadContent.trim(),
        }),
      });

      // 2. Attach to this agent
      await onAttach(agentId, {
        skill_name: uploadName.trim(),
        description: uploadDesc.trim(),
        content: uploadContent.trim(),
      });

      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error attaching uploaded skill');
    } finally {
      setLoading(false);
    }
  };

  // Attach from Stock
  const handleAttachStock = async (skill: StockSkillItem) => {
    setLoading(true);
    try {
      await onAttach(agentId, {
        skill_name: skill.name,
        description: skill.description || skill.name,
        content: skill.content,
      });
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error attaching skill');
    } finally {
      setLoading(false);
    }
  };

  const filteredStock = stockSkills.filter((s) => {
    const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} color="#8b5cf6" />
            <span className="modal-title">Attach Skill Directive to Agent Claw</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: 10, padding: '14px 24px 0', borderBottom: '1px solid var(--dock-border)' }}>
          <button
            type="button"
            className={`btn-secondary ${activeTab === 'stock' ? 'selected' : ''}`}
            style={{
              borderBottom: activeTab === 'stock' ? '2px solid #8b5cf6' : 'none',
              borderRadius: '8px 8px 0 0',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onClick={() => setActiveTab('stock')}
          >
            <BookOpen size={14} />
            <span>10-Category Stock Skills ({stockSkills.length})</span>
          </button>
          <button
            type="button"
            className={`btn-secondary ${activeTab === 'upload' ? 'selected' : ''}`}
            style={{
              borderBottom: activeTab === 'upload' ? '2px solid #8b5cf6' : 'none',
              borderRadius: '8px 8px 0 0',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onClick={() => setActiveTab('upload')}
          >
            <FolderUp size={14} />
            <span>Upload Local Skill / Folder</span>
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {activeTab === 'stock' ? (
            <>
              {/* Category Filter Pills (High-contrast with icons) */}
              <div className="category-filter-bar">
                <button
                  type="button"
                  className={`category-pill-btn ${selectedCategory === 'All' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('All')}
                >
                  <span className="category-pill-icon">{CATEGORY_META['All']?.icon || '✨'}</span>
                  <span className="category-pill-label">All</span>
                  <span className="category-pill-badge">{stockSkills.length}</span>
                </button>
                {categories.map((c) => {
                  const count = stockSkills.filter((s) => s.category === c).length;
                  const icon = CATEGORY_META[c]?.icon || '⚡';
                  return (
                    <button
                      key={c}
                      type="button"
                      className={`category-pill-btn ${selectedCategory === c ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(c)}
                    >
                      <span className="category-pill-icon">{icon}</span>
                      <span className="category-pill-label">{c}</span>
                      <span className="category-pill-badge">{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Search Bar */}
              <div style={{ position: 'relative', marginTop: 8 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-muted)' }} />
                <input
                  className="form-input"
                  style={{ paddingLeft: 30, width: '100%' }}
                  placeholder="Search skills by name or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Skills List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {filteredStock.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'var(--dock-bg)',
                      border: '1px solid var(--card-border)',
                      borderRadius: 10,
                      gap: 12,
                    }}
                  >
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-main)' }}>{s.name}</span>
                        <span style={{ fontSize: 10, color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.12)', padding: '2px 6px', borderRadius: 4 }}>
                          {s.category}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.description}</div>
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ background: '#8b5cf6', padding: '6px 12px', fontSize: 11, whiteSpace: 'nowrap' }}
                      disabled={loading}
                      onClick={() => handleAttachStock(s)}
                    >
                      Attach
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <form onSubmit={handleSaveAndAttachUpload} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* File / Folder Pickers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label
                  style={{
                    border: '1px dashed var(--card-border)',
                    borderRadius: 10,
                    padding: '16px 12px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'var(--dock-bg)',
                  }}
                >
                  <Upload size={18} color="#8b5cf6" style={{ margin: '0 auto 6px' }} />
                  <div style={{ fontSize: 12, fontWeight: 600 }}>Upload SKILL.md File</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Single .md or SKILL.md</div>
                  <input type="file" accept=".md,.markdown,.txt" style={{ display: 'none' }} onChange={handleSingleFileUpload} />
                </label>

                <label
                  style={{
                    border: '1px dashed var(--card-border)',
                    borderRadius: 10,
                    padding: '16px 12px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'var(--dock-bg)',
                  }}
                >
                  <FolderUp size={18} color="#8b5cf6" style={{ margin: '0 auto 6px' }} />
                  <div style={{ fontSize: 12, fontWeight: 600 }}>Upload Skill Folder</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Folder with SKILL.md & scripts</div>
                  <input
                    type="file"
                    // @ts-expect-error webkitdirectory attribute
                    webkitdirectory=""
                    directory=""
                    style={{ display: 'none' }}
                    onChange={handleFolderUpload}
                  />
                </label>
              </div>

              {uploadStatus && (
                <div style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Check size={12} /> {uploadStatus}
                </div>
              )}

              {/* Category Picker */}
              <div className="form-group">
                <label className="form-label">Assign to Category (For Stock Reusability)</label>
                <select className="form-select" value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Skill Name */}
              <div className="form-group">
                <label className="form-label">Skill Name</label>
                <input
                  className="form-input"
                  placeholder="e.g. CodeReview or FirecrawlJobSearch"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  required
                />
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  className="form-input"
                  placeholder="One-line summary of when/how to use"
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                />
              </div>

              {/* Markdown Content */}
              <div className="form-group">
                <label className="form-label">Skill Markdown Instructions (SKILL.md)</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: 120, fontFamily: 'monospace', fontSize: 12 }}
                  value={uploadContent}
                  onChange={(e) => setUploadContent(e.target.value)}
                  placeholder="# Skill Directive Steps..."
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ background: '#8b5cf6' }} disabled={loading}>
                  {loading ? 'Uploading & Attaching…' : 'Save to Stock & Attach to Claw'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
