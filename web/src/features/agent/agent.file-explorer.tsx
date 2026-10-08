import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Folder,
  FolderOpen,
  File,
  FileText,
  FileCode,
  Image as ImageIcon,
  Film,
  Music,
  Search,
  Grid,
  List as ListIcon,
  RefreshCw,
  Download,
  ExternalLink,
  Edit3,
  Save,
  Eye,
  Code as CodeIcon,
  ZoomIn,
  ZoomOut,
  ChevronRight,
  ArrowLeft,
  Check,
  Copy,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { AgentService } from './agent.service.js';
import type {
  SpaceAgentEntity,
  WorkspaceFileItem,
  WorkspaceFileCategory,
  WorkspaceFilesResponse,
} from './agent.types.js';
import { MermaidDiagram } from './mermaid-diagram.js';

interface AgentFileExplorerProps {
  agent: SpaceAgentEntity;
  onFilesCountChange?: (count: number) => void;
}

type ViewMode = 'grid' | 'list';

export const AgentFileExplorer: React.FC<AgentFileExplorerProps> = ({
  agent,
  onFilesCountChange,
}) => {
  const [data, setData] = useState<WorkspaceFilesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<WorkspaceFileCategory | 'all'>('all');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Selected file preview
  const [selectedFile, setSelectedFile] = useState<WorkspaceFileItem | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editContent, setEditContent] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [docTab, setDocTab] = useState<'preview' | 'source'>('preview');

  // Image zoom state
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Load files from backend
  const loadFiles = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      setError(null);
      try {
        const res = await AgentService.fetchWorkspaceFiles(agent.id);
        setData(res);
        onFilesCountChange?.(res.totalFiles);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load workspace files';
        if (!isSilent) setError(msg);
      } finally {
        if (!isSilent) setLoading(false);
      }
    },
    [agent.id, onFilesCountChange],
  );

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // WebSocket Live Real-Time Synchronizer
  useEffect(() => {
    const handleWsMessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (
          (msg.type === 'agent_files_updated' ||
            msg.type === 'agent_manifest_updated' ||
            msg.type === 'agent_updated') &&
          (msg.agentId === agent.id || msg.data?.id === agent.id)
        ) {
          loadFiles(true);
        }
      } catch {}
    };

    window.addEventListener('message', handleWsMessage);
    // Also listen to custom ws-event if canvas ws dispatches to window
    const customListener = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (
        customEvent.detail?.type === 'agent_files_updated' &&
        customEvent.detail?.agentId === agent.id
      ) {
        loadFiles(true);
      }
    };
    window.addEventListener('smoke:ws:agent_files_updated', customListener);

    return () => {
      window.removeEventListener('message', handleWsMessage);
      window.removeEventListener('smoke:ws:agent_files_updated', customListener);
    };
  }, [agent.id, loadFiles]);

  // Load file content when text/markdown file is selected
  useEffect(() => {
    if (!selectedFile) {
      setFileContent(null);
      setIsEditing(false);
      return;
    }

    const { category, path } = selectedFile;
    if (
      category === 'markdown' ||
      category === 'code' ||
      category === 'document' ||
      category === 'data'
    ) {
      setLoadingContent(true);
      AgentService.fetchWorkspaceFileContent(agent.id, path)
        .then((res) => {
          setFileContent(res.content);
          setEditContent(res.content);
        })
        .catch(() => {
          setFileContent('');
          setEditContent('');
        })
        .finally(() => setLoadingContent(false));
    } else {
      setFileContent(null);
      setIsEditing(false);
      setZoomLevel(1);
    }
  }, [agent.id, selectedFile]);

  // Distinct folders list
  const availableFolders = useMemo(() => {
    if (!data?.files) return [];
    const set = new Set<string>();
    for (const f of data.files) {
      if (f.dir) {
        const topDir = f.dir.split('/')[0];
        set.add(topDir);
      }
    }
    return Array.from(set).sort();
  }, [data]);

  // Filtered files
  const filteredFiles = useMemo(() => {
    if (!data?.files) return [];
    return data.files.filter((file) => {
      if (selectedCategory !== 'all' && file.category !== selectedCategory) {
        return false;
      }
      if (selectedFolder !== 'all') {
        if (!file.dir.startsWith(selectedFolder)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = file.name.toLowerCase().includes(q);
        const matchesPath = file.path.toLowerCase().includes(q);
        const matchesExt = file.extension.toLowerCase().includes(q);
        if (!matchesName && !matchesPath && !matchesExt) return false;
      }
      return true;
    });
  }, [data, selectedCategory, selectedFolder, searchQuery]);

  // Save edited file content
  const handleSaveContent = async () => {
    if (!selectedFile) return;
    setSaving(true);
    try {
      await AgentService.updateWorkspaceFileContent(agent.id, selectedFile.path, editContent);
      setFileContent(editContent);
      setIsEditing(false);
      loadFiles(true);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyContent = () => {
    if (fileContent != null) {
      navigator.clipboard.writeText(fileContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getCategoryIcon = (category: WorkspaceFileCategory, size = 18) => {
    switch (category) {
      case 'image':
        return <ImageIcon size={size} style={{ color: '#38bdf8' }} />;
      case 'markdown':
        return <FileText size={size} style={{ color: '#a78bfa' }} />;
      case 'pdf':
        return <FileText size={size} style={{ color: '#f87171' }} />;
      case 'code':
        return <FileCode size={size} style={{ color: '#34d399' }} />;
      case 'data':
        return <FileSpreadsheet size={size} style={{ color: '#fbbf24' }} />;
      case 'video':
        return <Film size={size} style={{ color: '#f43f5e' }} />;
      case 'audio':
        return <Music size={size} style={{ color: '#ec4899' }} />;
      default:
        return <File size={size} style={{ color: '#94a3b8' }} />;
    }
  };

  const rawUrl = selectedFile
    ? AgentService.getWorkspaceFileRawUrl(agent.id, selectedFile.path)
    : '';

  return (
    <div
      className="agent-files-workspace"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        background: '#090d16',
        color: '#f8fafc',
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* ── Toolbar / Header ────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '12px 16px',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Left: Breadcrumbs & stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 200 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 12,
              color: '#38bdf8',
              fontWeight: 500,
            }}
          >
            <FolderOpen size={14} />
            <span>Workspace Files</span>
            <span
              style={{
                background: 'rgba(56, 189, 248, 0.25)',
                color: '#fff',
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 10,
                fontWeight: 600,
              }}
            >
              {data?.totalFiles || 0}
            </span>
          </div>

          {selectedFolder !== 'all' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                color: '#94a3b8',
              }}
            >
              <ChevronRight size={12} />
              <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{selectedFolder}/</span>
              <button
                type="button"
                onClick={() => setSelectedFolder('all')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 2,
                }}
                title="Clear folder filter"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Center: Search input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 6,
            padding: '4px 10px',
            flex: '1 1 200px',
            maxWidth: 320,
          }}
        >
          <Search size={13} style={{ color: '#64748b' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files by name or ext..."
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              color: '#f8fafc',
              fontSize: 12,
              width: '100%',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Right: Controls & View Mode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onClick={() => loadFiles()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 6,
              color: '#cbd5e1',
              padding: '5px 10px',
              fontSize: 11,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Reload files from workspace"
          >
            <RefreshCw size={12} className={loading ? 'spin' : ''} />
            <span className="hide-mobile">Sync</span>
          </button>

          <div
            style={{
              display: 'flex',
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 6,
              padding: 2,
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              style={{
                background: viewMode === 'grid' ? 'rgba(56, 189, 248, 0.2)' : 'none',
                border: 'none',
                color: viewMode === 'grid' ? '#38bdf8' : '#64748b',
                padding: '4px 7px',
                borderRadius: 4,
                cursor: 'pointer',
              }}
              title="Grid / Thumbnail View (Finder)"
            >
              <Grid size={13} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{
                background: viewMode === 'list' ? 'rgba(56, 189, 248, 0.2)' : 'none',
                border: 'none',
                color: viewMode === 'list' ? '#38bdf8' : '#64748b',
                padding: '4px 7px',
                borderRadius: 4,
                cursor: 'pointer',
              }}
              title="List View"
            >
              <ListIcon size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter Bar: Category & Folder pills ──────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 16px',
          background: 'rgba(10, 16, 29, 0.85)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: 11, color: '#64748b', marginRight: 4 }}>Filter:</span>

        {[
          { id: 'all', label: 'All Files', icon: null },
          { id: 'image', label: 'Images', icon: <ImageIcon size={12} /> },
          { id: 'markdown', label: 'Markdown', icon: <FileText size={12} /> },
          { id: 'pdf', label: 'PDFs', icon: <FileText size={12} /> },
          { id: 'code', label: 'Code & Scripts', icon: <FileCode size={12} /> },
          { id: 'data', label: 'Data', icon: <FileSpreadsheet size={12} /> },
          { id: 'video', label: 'Videos', icon: <Film size={12} /> },
        ].map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 9px',
                fontSize: 11,
                borderRadius: 14,
                border: `1px solid ${
                  isActive ? 'rgba(56, 189, 248, 0.45)' : 'rgba(255, 255, 255, 0.08)'
                }`,
                background: isActive ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                color: isActive ? '#38bdf8' : '#94a3b8',
                cursor: 'pointer',
                fontWeight: isActive ? 600 : 400,
                transition: 'all 0.15s ease',
              }}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          );
        })}

        {availableFolders.length > 0 && (
          <>
            <span
              style={{
                height: 14,
                width: 1,
                background: 'rgba(255, 255, 255, 0.1)',
                margin: '0 4px',
              }}
            />
            <span style={{ fontSize: 11, color: '#64748b' }}>Folders:</span>
            {availableFolders.map((folder) => {
              const isFolderActive = selectedFolder === folder;
              return (
                <button
                  key={folder}
                  type="button"
                  onClick={() =>
                    setSelectedFolder(isFolderActive ? 'all' : folder)
                  }
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 8px',
                    fontSize: 11,
                    borderRadius: 6,
                    border: `1px solid ${
                      isFolderActive ? 'rgba(167, 139, 250, 0.45)' : 'rgba(255, 255, 255, 0.08)'
                    }`,
                    background: isFolderActive
                      ? 'rgba(167, 139, 250, 0.15)'
                      : 'rgba(255, 255, 255, 0.02)',
                    color: isFolderActive ? '#c4b5fd' : '#94a3b8',
                    cursor: 'pointer',
                  }}
                >
                  <Folder size={11} />
                  <span>{folder}/</span>
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* ── Main Workspace Body (Explorer + Preview) ───────────────────── */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* LEFT PANE: File List / Grid */}
        <div
          style={{
            flex: selectedFile ? '0 0 45%' : '1 1 100%',
            maxWidth: selectedFile ? '50%' : '100%',
            overflowY: 'auto',
            padding: 16,
            borderRight: selectedFile ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
            transition: 'all 0.2s ease',
            display: selectedFile && window.innerWidth < 768 ? 'none' : 'block',
          }}
        >
          {loading && !data && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 20px',
                color: '#64748b',
                gap: 12,
              }}
            >
              <RefreshCw size={24} className="spin" style={{ color: '#38bdf8' }} />
              <span>Scanning agent workspace...</span>
            </div>
          )}

          {error && (
            <div
              style={{
                padding: 16,
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 8,
                color: '#fca5a5',
                fontSize: 13,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Error loading files</div>
              <div>{error}</div>
            </div>
          )}

          {!loading && filteredFiles.length === 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 20px',
                color: '#64748b',
                textAlign: 'center',
                gap: 10,
              }}
            >
              <Folder size={36} style={{ opacity: 0.35 }} />
              <div style={{ fontSize: 14, fontWeight: 500, color: '#94a3b8' }}>
                No matching workspace files found
              </div>
              <div style={{ fontSize: 12, maxWidth: 300 }}>
                Files created by the agent during tasks (markdown, images, charts, exports) will
                appear here automatically in real time.
              </div>
            </div>
          )}

          {/* GRID VIEW (Finder Thumbnail Style) */}
          {viewMode === 'grid' && filteredFiles.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: selectedFile
                  ? 'repeat(auto-fill, minmax(130px, 1fr))'
                  : 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: 12,
              }}
            >
              {filteredFiles.map((file) => {
                const isSelected = selectedFile?.path === file.path;
                const fileRawUrl = AgentService.getWorkspaceFileRawUrl(agent.id, file.path);

                return (
                  <div
                    key={file.path}
                    onClick={() => setSelectedFile(file)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: 10,
                      overflow: 'hidden',
                      background: isSelected
                        ? 'rgba(56, 189, 248, 0.12)'
                        : 'rgba(15, 23, 42, 0.65)',
                      border: `1px solid ${
                        isSelected
                          ? 'rgba(56, 189, 248, 0.5)'
                          : 'rgba(255, 255, 255, 0.06)'
                      }`,
                      cursor: 'pointer',
                      transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: isSelected
                        ? '0 0 16px rgba(56, 189, 248, 0.2)'
                        : '0 4px 12px rgba(0, 0, 0, 0.2)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {/* Thumbnail Area */}
                    <div
                      style={{
                        height: 96,
                        width: '100%',
                        background: 'rgba(0, 0, 0, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                    >
                      {file.category === 'image' ? (
                        <img
                          src={fileRawUrl}
                          alt={file.name}
                          loading="lazy"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                          }}
                        >
                          {getCategoryIcon(file.category, 30)}
                          <span
                            style={{
                              fontSize: 9,
                              textTransform: 'uppercase',
                              fontWeight: 700,
                              color: '#94a3b8',
                              background: 'rgba(255, 255, 255, 0.06)',
                              padding: '1px 5px',
                              borderRadius: 4,
                            }}
                          >
                            {file.extension}
                          </span>
                        </div>
                      )}

                      {/* Folder tag */}
                      {file.dir && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 6,
                            left: 6,
                            background: 'rgba(0, 0, 0, 0.65)',
                            backdropFilter: 'blur(4px)',
                            padding: '1px 5px',
                            borderRadius: 4,
                            fontSize: 9,
                            color: '#94a3b8',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                          }}
                        >
                          <Folder size={9} />
                          <span>{file.dir.split('/')[0]}</span>
                        </div>
                      )}
                    </div>

                    {/* Meta info */}
                    <div style={{ padding: '8px 10px' }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: isSelected ? '#38bdf8' : '#f1f5f9',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginBottom: 3,
                        }}
                        title={file.name}
                      >
                        {file.name}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: 10,
                          color: '#64748b',
                        }}
                      >
                        <span>{formatBytes(file.size)}</span>
                        <span>{file.extension.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* LIST VIEW (Finder Details Style) */}
          {viewMode === 'list' && filteredFiles.length > 0 && (
            <div
              style={{
                borderRadius: 8,
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                background: 'rgba(15, 23, 42, 0.5)',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      background: 'rgba(0, 0, 0, 0.25)',
                      color: '#94a3b8',
                      textAlign: 'left',
                    }}
                  >
                    <th style={{ padding: '8px 12px', fontWeight: 500 }}>Name</th>
                    <th style={{ padding: '8px 12px', fontWeight: 500 }}>Folder</th>
                    <th style={{ padding: '8px 12px', fontWeight: 500 }}>Kind</th>
                    <th style={{ padding: '8px 12px', fontWeight: 500 }}>Size</th>
                    <th style={{ padding: '8px 12px', fontWeight: 500 }}>Modified</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map((file) => {
                    const isSelected = selectedFile?.path === file.path;
                    return (
                      <tr
                        key={file.path}
                        onClick={() => setSelectedFile(file)}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                          background: isSelected
                            ? 'rgba(56, 189, 248, 0.12)'
                            : 'transparent',
                          cursor: 'pointer',
                          color: isSelected ? '#38bdf8' : '#e2e8f0',
                        }}
                      >
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {getCategoryIcon(file.category, 15)}
                            <span style={{ fontWeight: isSelected ? 600 : 400 }}>
                              {file.name}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '8px 12px', color: '#94a3b8' }}>
                          {file.dir || '.'}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#64748b', textTransform: 'capitalize' }}>
                          {file.category}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#94a3b8' }}>
                          {formatBytes(file.size)}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#64748b', fontSize: 11 }}>
                          {new Date(file.mtime).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RIGHT PANE: Document, Media & Image Viewer */}
        {selectedFile && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              background: '#0b101c',
              overflow: 'hidden',
            }}
          >
            {/* Viewer Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                background: 'rgba(15, 23, 42, 0.85)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                gap: 12,
              }}
            >
              {/* Left: Close/Back & File info */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  minWidth: 0,
                  flex: '1 1 auto',
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 6,
                    color: '#94a3b8',
                    padding: '4px 8px',
                    fontSize: 11,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                  title="Close preview"
                >
                  <ArrowLeft size={12} />
                  <span className="show-mobile">Back</span>
                </button>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    minWidth: 0,
                    flex: '1 1 auto',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                    {getCategoryIcon(selectedFile.category, 16)}
                  </div>
                  <div style={{ minWidth: 0, flex: '1 1 auto', overflow: 'hidden' }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#f8fafc',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={selectedFile.name}
                    >
                      {selectedFile.name}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: '#64748b',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={`${selectedFile.path} • ${formatBytes(selectedFile.size)}`}
                    >
                      {selectedFile.path} • {formatBytes(selectedFile.size)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {/* Markdown mode toggles */}
                {selectedFile.category === 'markdown' && (
                  <div
                    style={{
                      display: 'flex',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 6,
                      padding: 2,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setDocTab('preview');
                        setIsEditing(false);
                      }}
                      style={{
                        background:
                          docTab === 'preview' && !isEditing
                            ? 'rgba(56, 189, 248, 0.2)'
                            : 'none',
                        border: 'none',
                        color:
                          docTab === 'preview' && !isEditing ? '#38bdf8' : '#94a3b8',
                        padding: '3px 8px',
                        fontSize: 11,
                        borderRadius: 4,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Eye size={11} />
                      <span>Preview</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDocTab('source');
                        setIsEditing(false);
                      }}
                      style={{
                        background:
                          docTab === 'source' && !isEditing
                            ? 'rgba(56, 189, 248, 0.2)'
                            : 'none',
                        border: 'none',
                        color:
                          docTab === 'source' && !isEditing ? '#38bdf8' : '#94a3b8',
                        padding: '3px 8px',
                        fontSize: 11,
                        borderRadius: 4,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <CodeIcon size={11} />
                      <span>Source</span>
                    </button>
                  </div>
                )}

                {/* Edit / Save for text-based files */}
                {(selectedFile.category === 'markdown' ||
                  selectedFile.category === 'code' ||
                  selectedFile.category === 'document') && (
                  <>
                    {isEditing ? (
                      <button
                        type="button"
                        onClick={handleSaveContent}
                        disabled={saving}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          background: 'rgba(16, 185, 129, 0.2)',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          borderRadius: 6,
                          color: '#34d399',
                          padding: '4px 10px',
                          fontSize: 11,
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        <Save size={12} />
                        <span>{saving ? 'Saving...' : 'Save'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: 6,
                          color: '#94a3b8',
                          padding: '4px 8px',
                          fontSize: 11,
                          cursor: 'pointer',
                        }}
                      >
                        <Edit3 size={11} />
                        <span>Edit</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleCopyContent}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 6,
                        color: copied ? '#34d399' : '#94a3b8',
                        padding: '4px 8px',
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                      title="Copy file text"
                    >
                      {copied ? <Check size={11} /> : <Copy size={11} />}
                    </button>
                  </>
                )}

                {/* External Link & Download */}
                <a
                  href={rawUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 6,
                    color: '#94a3b8',
                    padding: '4px 8px',
                    fontSize: 11,
                    textDecoration: 'none',
                  }}
                  title="Open file in new tab"
                >
                  <ExternalLink size={11} />
                </a>

                <a
                  href={rawUrl}
                  download={selectedFile.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    background: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: 6,
                    color: '#38bdf8',
                    padding: '4px 8px',
                    fontSize: 11,
                    textDecoration: 'none',
                    fontWeight: 500,
                  }}
                  title="Download file"
                >
                  <Download size={11} />
                </a>
              </div>
            </div>

            {/* Viewer Content Area */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: 16,
                position: 'relative',
              }}
            >
              {loadingContent && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#64748b',
                    gap: 8,
                  }}
                >
                  <RefreshCw size={18} className="spin" style={{ color: '#38bdf8' }} />
                  <span>Loading document...</span>
                </div>
              )}

              {/* IMAGE VIEWER */}
              {selectedFile.category === 'image' && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100%',
                    gap: 16,
                  }}
                >
                  {/* Zoom controls toolbar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: 'rgba(0, 0, 0, 0.6)',
                      backdropFilter: 'blur(8px)',
                      padding: '4px 12px',
                      borderRadius: 20,
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.max(0.25, z - 0.25))}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: 4,
                      }}
                      title="Zoom Out"
                    >
                      <ZoomOut size={14} />
                    </button>
                    <span style={{ fontSize: 11, color: '#f8fafc', minWidth: 40, textAlign: 'center' }}>
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: 4,
                      }}
                      title="Zoom In"
                    >
                      <ZoomIn size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(1)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#38bdf8',
                        cursor: 'pointer',
                        fontSize: 10,
                        marginLeft: 4,
                      }}
                    >
                      Reset
                    </button>
                  </div>

                  <div
                    style={{
                      borderRadius: 8,
                      overflow: 'hidden',
                      boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.5) 100%)',
                      maxWidth: '100%',
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: 'center center',
                      transition: 'transform 0.15s ease',
                    }}
                  >
                    <img
                      src={rawUrl}
                      alt={selectedFile.name}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '70vh',
                        display: 'block',
                        objectFit: 'contain',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* VIDEO VIEWER */}
              {selectedFile.category === 'video' && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                  }}
                >
                  <video
                    controls
                    autoPlay
                    src={rawUrl}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '75vh',
                      borderRadius: 8,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                    }}
                  />
                </div>
              )}

              {/* AUDIO VIEWER */}
              {selectedFile.category === 'audio' && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    gap: 16,
                  }}
                >
                  <Music size={48} style={{ color: '#ec4899', opacity: 0.8 }} />
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{selectedFile.name}</div>
                  <audio controls src={rawUrl} style={{ width: '80%', maxWidth: 400 }} />
                </div>
              )}

              {/* PDF VIEWER */}
              {selectedFile.category === 'pdf' && (
                <div style={{ height: '100%', minHeight: '65vh', width: '100%' }}>
                  <iframe
                    src={rawUrl}
                    title={selectedFile.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      minHeight: 560,
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 8,
                    }}
                  />
                </div>
              )}

              {/* MARKDOWN VIEWER */}
              {selectedFile.category === 'markdown' && !loadingContent && (
                <>
                  {isEditing ? (
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      style={{
                        width: '100%',
                        height: '100%',
                        minHeight: 480,
                        background: '#070a13',
                        color: '#f8fafc',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        borderRadius: 8,
                        padding: 16,
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: 13,
                        lineHeight: 1.6,
                        resize: 'none',
                        outline: 'none',
                      }}
                    />
                  ) : docTab === 'source' ? (
                    <pre
                      style={{
                        margin: 0,
                        padding: 16,
                        background: '#070a13',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: 8,
                        color: '#cbd5e1',
                        fontSize: 12,
                        fontFamily: 'ui-monospace, monospace',
                        lineHeight: 1.6,
                        overflowX: 'auto',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {fileContent}
                    </pre>
                  ) : (
                    <div
                      className="markdown-rich-container"
                      style={{
                        color: '#e2e8f0',
                        lineHeight: 1.7,
                        fontSize: 14,
                        maxWidth: 820,
                        margin: '0 auto',
                      }}
                    >
                      <ReactMarkdown
                        components={{
                          code({ className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            const lang = match ? match[1] : '';
                            const codeString = String(children).replace(/\n$/, '');

                            // MERMAID DIAGRAM HANDLER
                            if (lang === 'mermaid') {
                              return <MermaidDiagram code={codeString} />;
                            }

                            // Standard code block
                            if (match) {
                              return (
                                <pre
                                  style={{
                                    background: 'rgba(0, 0, 0, 0.45)',
                                    padding: 12,
                                    borderRadius: 8,
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    overflowX: 'auto',
                                    fontSize: 12,
                                  }}
                                >
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                </pre>
                              );
                            }

                            // Inline code
                            return (
                              <code
                                style={{
                                  background: 'rgba(56, 189, 248, 0.12)',
                                  color: '#38bdf8',
                                  padding: '2px 5px',
                                  borderRadius: 4,
                                  fontSize: '0.9em',
                                }}
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          },
                          img({ src, alt }) {
                            // If relative image path in markdown, resolve through agent raw files endpoint!
                            const imageSrc =
                              src && !src.startsWith('http') && !src.startsWith('/')
                                ? AgentService.getWorkspaceFileRawUrl(agent.id, src)
                                : src;

                            return (
                              <img
                                src={imageSrc}
                                alt={alt}
                                style={{
                                  maxWidth: '100%',
                                  borderRadius: 8,
                                  margin: '12px 0',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                }}
                              />
                            );
                          },
                          table({ children }) {
                            return (
                              <div style={{ overflowX: 'auto', margin: '14px 0' }}>
                                <table
                                  style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: 6,
                                  }}
                                >
                                  {children}
                                </table>
                              </div>
                            );
                          },
                          th({ children }) {
                            return (
                              <th
                                style={{
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  padding: '8px 12px',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  textAlign: 'left',
                                  fontWeight: 600,
                                }}
                              >
                                {children}
                              </th>
                            );
                          },
                          td({ children }) {
                            return (
                              <td
                                style={{
                                  padding: '8px 12px',
                                  border: '1px solid rgba(255, 255, 255, 0.06)',
                                }}
                              >
                                {children}
                              </td>
                            );
                          },
                          blockquote({ children }) {
                            return (
                              <blockquote
                                style={{
                                  margin: '12px 0',
                                  padding: '8px 16px',
                                  borderLeft: '4px solid #38bdf8',
                                  background: 'rgba(56, 189, 248, 0.06)',
                                  borderRadius: '0 8px 8px 0',
                                  color: '#cbd5e1',
                                }}
                              >
                                {children}
                              </blockquote>
                            );
                          },
                        }}
                      >
                        {fileContent || ''}
                      </ReactMarkdown>
                    </div>
                  )}
                </>
              )}

              {/* CODE / TEXT VIEWER */}
              {(selectedFile.category === 'code' ||
                selectedFile.category === 'document' ||
                selectedFile.category === 'data') &&
                !loadingContent && (
                  <>
                    {isEditing ? (
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        style={{
                          width: '100%',
                          height: '100%',
                          minHeight: 480,
                          background: '#070a13',
                          color: '#f8fafc',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          borderRadius: 8,
                          padding: 16,
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          fontSize: 12,
                          lineHeight: 1.6,
                          resize: 'none',
                          outline: 'none',
                        }}
                      />
                    ) : (
                      <pre
                        style={{
                          margin: 0,
                          padding: 16,
                          background: '#070a13',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: 8,
                          color: '#cbd5e1',
                          fontSize: 12,
                          fontFamily: 'ui-monospace, monospace',
                          lineHeight: 1.6,
                          overflowX: 'auto',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {fileContent}
                      </pre>
                    )}
                  </>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
