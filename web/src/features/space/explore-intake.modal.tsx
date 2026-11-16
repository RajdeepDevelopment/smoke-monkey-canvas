import { useCallback, useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen,
  FileText,
  FolderOpen,
  GitBranch,
  Layers,
  Loader2,
  Rocket,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { SpaceService } from './space.service.js';

interface AttachedDoc {
  filename: string;
  content: string;
}

interface ExploreIntakeModalProps {
  spaceId: string;
  companyName: string;
  onClose: () => void;
  onExploreStarted: (sessionId: string, explorerAgentId: string) => void;
}

const TECH_STACK_OPTIONS = [
  'Node.js', 'TypeScript', 'Python', 'React', 'Vue', 'Next.js',
  'PostgreSQL', 'SQLite', 'MongoDB', 'Redis', 'Docker', 'GraphQL',
  'REST API', 'Go', 'Rust', 'FastAPI', 'Express', 'TailwindCSS',
];

export function ExploreIntakeModal({
  spaceId,
  companyName,
  onClose,
  onExploreStarted,
}: ExploreIntakeModalProps) {
  const [briefMarkdown, setBriefMarkdown] = useState('');
  const [attachedDocs, setAttachedDocs] = useState<AttachedDoc[]>([]);
  const [gitUrl, setGitUrl] = useState('');
  const [gitLocalPath, setGitLocalPath] = useState('');
  const [selectedStack, setSelectedStack] = useState<string[]>([]);
  const [syncInterval, setSyncInterval] = useState(3);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(
      (f) =>
        f.name.endsWith('.md') ||
        f.name.endsWith('.txt') ||
        f.name.endsWith('.rst') ||
        f.name.endsWith('.json'),
    );
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        setAttachedDocs((prev) => {
          if (prev.some((d) => d.filename === file.name)) return prev;
          return [...prev, { filename: file.name, content }];
        });
      };
      reader.readAsText(file);
    });
  }, []);

  const handleFileInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        setAttachedDocs((prev) => {
          if (prev.some((d) => d.filename === file.name)) return prev;
          return [...prev, { filename: file.name, content }];
        });
      };
      reader.readAsText(file);
    });
  }, []);

  const removeDoc = (filename: string) => {
    setAttachedDocs((prev) => prev.filter((d) => d.filename !== filename));
  };

  const toggleStack = (tech: string) => {
    setSelectedStack((prev) =>
      prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech],
    );
  };

  const handleSubmit = async () => {
    if (!briefMarkdown.trim() && attachedDocs.length === 0 && !gitUrl.trim() && !gitLocalPath.trim()) {
      setError('Please add a project brief, attach documentation files, or provide a Git/local repository path.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await SpaceService.startExplore({
        space_id: spaceId,
        company_name: companyName,
        brief_markdown: briefMarkdown.trim() || undefined,
        attached_docs: attachedDocs.length > 0 ? attachedDocs : undefined,
        git_url: gitUrl.trim() || undefined,
        git_local_path: gitLocalPath.trim() || undefined,
        tech_stack: selectedStack.length > 0 ? selectedStack : undefined,
        sync_interval_hours: syncInterval,
      });
      onExploreStarted(result.session.id, result.explorerAgentId);
    } catch (err) {
      setError(String(err));
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--bg-primary, #0f1117)',
          border: '1px solid var(--border-primary, #2a2d3e)',
          borderRadius: 16,
          width: '92vw',
          maxWidth: 880,
          maxHeight: '92vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 28px 90px rgba(0,0,0,0.75)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-primary, #2a2d3e)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'rgba(15, 17, 23, 0.85)',
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
            }}
          >
            <Rocket size={19} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary, #e2e8f0)' }}>
              Project Explore & Intake — {companyName}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', marginTop: 2 }}>
              Phase 1: Explore project documentation, codebases, and plan dedicated feature teams
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted, #94a3b8)',
              padding: 6,
              borderRadius: 6,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* Project Brief */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-primary, #e2e8f0)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <BookOpen size={14} color="#818cf8" /> Project Brief / Company Details (Markdown)
              </label>
              <button
                type="button"
                onClick={() => setPreviewMode((p) => !p)}
                style={{
                  background: 'none',
                  border: '1px solid var(--border-primary, #2a2d3e)',
                  borderRadius: 6,
                  padding: '3px 10px',
                  fontSize: 11,
                  cursor: 'pointer',
                  color: 'var(--text-secondary, #94a3b8)',
                }}
              >
                {previewMode ? 'Edit Mode' : 'Markdown Preview'}
              </button>
            </div>
            {previewMode ? (
              <div
                style={{
                  minHeight: 160,
                  maxHeight: 240,
                  overflowY: 'auto',
                  border: '1px solid var(--border-primary, #2a2d3e)',
                  borderRadius: 10,
                  padding: '12px 16px',
                  color: 'var(--text-primary, #e2e8f0)',
                  background: 'var(--bg-secondary, #161b2e)',
                  whiteSpace: 'pre-wrap',
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                {briefMarkdown || (
                  <span style={{ color: 'var(--text-muted, #64748b)', fontStyle: 'italic' }}>
                    Nothing entered yet. Switch to Edit Mode to write your brief.
                  </span>
                )}
              </div>
            ) : (
              <textarea
                value={briefMarkdown}
                onChange={(e) => setBriefMarkdown(e.target.value)}
                placeholder={`# ${companyName} Project Brief

## Overview & Vision
Describe the product, company objectives, core user problems, and architecture.

## Target Modules & Features
- Authentication & RBAC
- Core Engine & Workflows
- Billing & Stripe Integration
- Real-time Notifications

The Explore Agent will read this documentation, map folder boundaries, and plan dedicated feature agents.`}
                style={{
                  width: '100%',
                  minHeight: 160,
                  maxHeight: 240,
                  background: 'var(--bg-secondary, #161b2e)',
                  border: '1px solid var(--border-primary, #2a2d3e)',
                  borderRadius: 10,
                  padding: '12px 16px',
                  color: 'var(--text-primary, #e2e8f0)',
                  fontSize: 13,
                  fontFamily: 'monospace',
                  lineHeight: 1.6,
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            )}
          </div>

          {/* Drag & Drop Zone */}
          <div>
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-primary, #e2e8f0)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 8,
              }}
            >
              <FileText size={14} color="#818cf8" /> Drag & Drop Documentation (.md, .txt, .json)
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? '#6366f1' : 'var(--border-primary, #2a2d3e)'}`,
                borderRadius: 10,
                padding: '20px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: isDragging ? 'rgba(99,102,241,0.1)' : 'var(--bg-secondary, #161b2e)',
              }}
            >
              <Upload size={24} color={isDragging ? '#6366f1' : '#64748b'} />
              <div style={{ fontSize: 13, color: 'var(--text-muted, #94a3b8)', textAlign: 'center' }}>
                Drag & drop markdown files here or <span style={{ color: '#818cf8', fontWeight: 600 }}>browse files</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted, #64748b)' }}>
                Supports README.md, architecture docs, API specs, and project notes
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.txt,.rst,.json"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileInput}
              />
            </div>

            {attachedDocs.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {attachedDocs.map((doc) => (
                  <div
                    key={doc.filename}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: 'var(--bg-secondary, #161b2e)',
                      border: '1px solid var(--border-primary, #2a2d3e)',
                      borderRadius: 8,
                      padding: '8px 12px',
                    }}
                  >
                    <FileText size={14} color="#818cf8" />
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary, #e2e8f0)', fontWeight: 500 }}>
                      {doc.filename}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted, #64748b)' }}>
                      {(doc.content.length / 1024).toFixed(1)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => removeDoc(doc.filename)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#ef4444',
                        padding: 4,
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Git Repository & Local Working Directory */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-primary, #e2e8f0)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 6,
                }}
              >
                <GitBranch size={14} color="#818cf8" /> Git Repository URL
              </label>
              <input
                value={gitUrl}
                onChange={(e) => setGitUrl(e.target.value)}
                placeholder="https://github.com/organization/repository"
                style={{
                  width: '100%',
                  background: 'var(--bg-secondary, #161b2e)',
                  border: '1px solid var(--border-primary, #2a2d3e)',
                  borderRadius: 8,
                  padding: '9px 12px',
                  color: 'var(--text-primary, #e2e8f0)',
                  fontSize: 13,
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-primary, #e2e8f0)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 6,
                }}
              >
                <FolderOpen size={14} color="#818cf8" /> Local Working Directory
              </label>
              <input
                value={gitLocalPath}
                onChange={(e) => setGitLocalPath(e.target.value)}
                placeholder="/Users/username/workspace/project"
                style={{
                  width: '100%',
                  background: 'var(--bg-secondary, #161b2e)',
                  border: '1px solid var(--border-primary, #2a2d3e)',
                  borderRadius: 8,
                  padding: '9px 12px',
                  color: 'var(--text-primary, #e2e8f0)',
                  fontSize: 13,
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Tech Stack Chips */}
          <div>
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-primary, #e2e8f0)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 8,
              }}
            >
              <Layers size={14} color="#818cf8" /> Detected / Preferred Tech Stack
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TECH_STACK_OPTIONS.map((tech) => {
                const active = selectedStack.includes(tech);
                return (
                  <button
                    key={tech}
                    type="button"
                    onClick={() => toggleStack(tech)}
                    style={{
                      padding: '4px 10px',
                      fontSize: 12,
                      borderRadius: 16,
                      border: `1px solid ${active ? '#6366f1' : 'var(--border-primary, #2a2d3e)'}`,
                      background: active ? 'rgba(99,102,241,0.18)' : 'transparent',
                      color: active ? '#a5b4fc' : 'var(--text-secondary, #94a3b8)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {tech}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3-Hour Sync Phase Configuration */}
          <div
            style={{
              background: 'rgba(99, 102, 241, 0.05)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: 10,
              padding: '12px 16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#c7d2fe' }}>
                  Phase 3: Agent Drift & Folder Sync Cron
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)', marginTop: 2 }}>
                  Every {syncInterval} hours, leaf agents verify whether their owned folders changed and update their cognitive memories.
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#a5b4fc' }}>
                Every {syncInterval}h
              </div>
            </div>
            <input
              type="range"
              min={1}
              max={12}
              value={syncInterval}
              onChange={(e) => setSyncInterval(Number(e.target.value))}
              style={{ width: '100%', marginTop: 10, accentColor: '#6366f1' }}
            />
          </div>

          {error && (
            <div
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid #ef4444',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 13,
                color: '#f87171',
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-primary, #2a2d3e)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 17, 23, 0.85)',
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)' }}>
            {attachedDocs.length > 0 && `${attachedDocs.length} doc(s) attached · `}
            {selectedStack.length > 0 && `${selectedStack.length} tech(s) · `}
            Sync: every {syncInterval}h
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 18px',
                fontSize: 13,
                borderRadius: 8,
                cursor: 'pointer',
                background: 'none',
                border: '1px solid var(--border-primary, #2a2d3e)',
                color: 'var(--text-secondary, #94a3b8)',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                padding: '8px 22px',
                fontSize: 13,
                borderRadius: 8,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                background: isSubmitting ? '#374151' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none',
                color: '#fff',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                opacity: isSubmitting ? 0.7 : 1,
                boxShadow: isSubmitting ? 'none' : '0 4px 14px rgba(99,102,241,0.35)',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Starting Explorer...
                </>
              ) : (
                <>
                  <Rocket size={14} /> Initiate Explore Phase
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
