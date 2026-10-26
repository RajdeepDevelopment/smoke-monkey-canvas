import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  FolderOpen,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Film,
  Eye,
  Check,
  CheckCheck,
  Minimize2,
  Maximize2,
  X,
  Sparkles,
  ExternalLink,
  GripVertical,
  Download,
} from 'lucide-react';
import { AgentService } from '../agent/agent.service.js';
import type { WorkspaceFileItem } from '../agent/agent.types.js';
import { useSpaceStore } from './space.store.js';
import { MarkdownProse } from '../common/markdown-prose.js';

export interface AgentAssetsNodeData {
  [key: string]: unknown;
  agentId: string;
  agentName: string;
  isExpanded: boolean;
  onToggleExpand: (agentId: string) => void;
  onClose?: (agentId: string) => void;
  onOpenDrawer?: (agentId: string) => void;
}

const INTERNAL_SYSTEM_FILENAMES = new Set([
  'session.md',
  'manifest.json',
  'mcp.json',
  'policies.json',
  'skills.json',
  'runtime.json',
  'checkpoints.json',
  'system_prompt.md',
  'connections.md',
  'policies.md',
  'project.md',
  'user.md',
  'semantic.md',
  'episodic.md',
  'working.md',
  'facts.md',
  'preferences.md',
  'procedural.md',
  'associative.md',
  'identity.md',
  'prospective.md',
  'reflective.md',
  'index.json',
  'index.md',
  'readme.md',
  'contributing.md',
  'license.md',
  'changelog.md',
  'code_of_conduct.md',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'pnpm-lock.yaml',
  'yarn.lock',
]);

const INTERNAL_DIR_NAMES = new Set([
  'memory',
  'context',
  'state',
  'mcp',
  'skills',
  'policies',
  'automation',
  'logs',
  'node_modules',
]);

const DELIVERABLE_EXTENSIONS = new Set([
  'xlsx', 'xls', 'csv', 'tsv', 'parquet',
  'docx', 'doc', 'pdf', 'rtf', 'pptx', 'ppt',
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico', 'avif',
  'mp4', 'webm', 'mov', 'avi', 'mp3', 'wav',
  'md', 'markdown',
  'json', 'jsonl', 'txt',
]);

export function isUserDeliverableAsset(file: WorkspaceFileItem): boolean {
  if (typeof file.isDeliverable === 'boolean') {
    return file.isDeliverable;
  }
  const name = (file.name || '').toLowerCase();
  const ext = (file.extension || '').toLowerCase().replace(/^\./, '');
  const normPath = (file.path || '').replace(/\\/g, '/').toLowerCase();

  // 1. Never dotfiles
  if (name.startsWith('.')) return false;

  // 2. Never internal agent system files
  if (INTERNAL_SYSTEM_FILENAMES.has(name)) return false;

  // 3. Never run logs, execution traces, or debug outputs
  if (
    normPath.includes('/runs/') ||
    normPath.startsWith('.smoke/') ||
    normPath.includes('/logs/') ||
    normPath.startsWith('logs/')
  ) {
    return false;
  }

  // 4. Check directory segments
  const segments = normPath.split('/');
  const isInsideArtifacts =
    segments.includes('artifacts') ||
    segments.includes('deliverables') ||
    segments.includes('output') ||
    segments.includes('outputs') ||
    segments.includes('exports') ||
    segments.includes('reports');

  for (const seg of segments) {
    if (INTERNAL_DIR_NAMES.has(seg)) return false;
  }

  if (segments.includes('.smoke-agent') && !isInsideArtifacts) {
    return false;
  }

  // 5. Must match a user deliverable extension
  if (!DELIVERABLE_EXTENSIONS.has(ext)) return false;

  // 6. JSON files must be intentional exports/layouts in output folders
  if (ext === 'json') {
    if (!isInsideArtifacts) {
      const isDataExport =
        name.includes('export') ||
        name.includes('report') ||
        name.includes('data') ||
        name.includes('layout') ||
        name.includes('metrics') ||
        name.includes('result') ||
        name.includes('chart');
      if (!isDataExport) return false;
    }
  }

  // 7. Markdown files in .smoke-agent must be in artifacts
  if (ext === 'md' || ext === 'markdown') {
    if (segments.includes('.smoke-agent') && !isInsideArtifacts) {
      return false;
    }
  }

  // 8. Plain text files must look like deliverables
  if (ext === 'txt') {
    if (!isInsideArtifacts) {
      const isDoc =
        name.includes('report') ||
        name.includes('summary') ||
        name.includes('notes') ||
        name.includes('export');
      if (!isDoc) return false;
    }
  }

  return true;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const AgentAssetsNode: React.FC<{ data: AgentAssetsNodeData }> = React.memo(({ data }) => {
  const {
    agentId,
    agentName,
    isExpanded,
    onToggleExpand,
    onClose,
    onOpenDrawer,
  } = data;

  const [files, setFiles] = useState<WorkspaceFileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'all' | 'images' | 'documents' | 'data'>('all');
  const [previewFile, setPreviewFile] = useState<WorkspaceFileItem | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);

  const reviewedAssets = useSpaceStore((s) => s.reviewedAssets);
  const markAssetReviewed = useSpaceStore((s) => s.markAssetReviewed);
  const markAllAssetsReviewed = useSpaceStore((s) => s.markAllAssetsReviewed);
  const setAgentUnreadAssetsCount = useSpaceStore((s) => s.setAgentUnreadAssetsCount);

  // Fetch agent workspace files
  const fetchFiles = useCallback(async () => {
    try {
      const res = await AgentService.fetchWorkspaceFiles(agentId);
      if (Array.isArray(res.files)) {
        setFiles(res.files);
      }
    } catch {
      // Ignored if agent workspace is fresh
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchFiles();
    const interval = setInterval(fetchFiles, 8000);
    return () => clearInterval(interval);
  }, [fetchFiles]);

  // Filter deliverables/assets: only real outputs created for the user
  const allDeliverables = useMemo(() => {
    return files.filter((f) => {
      if (f.isDirectory) return false;
      return isUserDeliverableAsset(f);
    });
  }, [files]);

  // Determine unread status
  const unreadAssets = useMemo(() => {
    return allDeliverables.filter((f) => {
      const key = `${agentId}:${f.path}`;
      const reviewedAt = reviewedAssets[key];
      if (!reviewedAt) return true;
      if (f.mtime && new Date(f.mtime).getTime() > new Date(reviewedAt).getTime()) {
        return true;
      }
      return false;
    });
  }, [allDeliverables, agentId, reviewedAssets]);

  // Keep agent unread count synced for agent card badge
  useEffect(() => {
    setAgentUnreadAssetsCount(agentId, unreadAssets.length);
  }, [agentId, unreadAssets.length, setAgentUnreadAssetsCount]);

  const imagesList = useMemo(() => unreadAssets.filter((f) => {
    const cleanExt = (f.extension || '').toLowerCase().replace(/^\./, '');
    return f.category === 'image' || ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif', 'bmp', 'ico', 'avif'].includes(cleanExt);
  }), [unreadAssets]);

  const docsList = useMemo(() => unreadAssets.filter((f) => {
    const cleanExt = (f.extension || '').toLowerCase().replace(/^\./, '');
    return f.category === 'document' || f.category === 'pdf' || f.category === 'markdown' ||
      ['md', 'markdown', 'pdf', 'docx', 'doc', 'txt', 'rtf', 'pptx', 'ppt'].includes(cleanExt);
  }), [unreadAssets]);

  const dataList = useMemo(() => unreadAssets.filter((f) => {
    const cleanExt = (f.extension || '').toLowerCase().replace(/^\./, '');
    return f.category === 'data' || ['xlsx', 'xls', 'csv', 'tsv', 'parquet', 'json', 'jsonl'].includes(cleanExt);
  }), [unreadAssets]);

  const displayedAssets = useMemo(() => {
    if (activeTab === 'images') return imagesList;
    if (activeTab === 'documents') return docsList;
    if (activeTab === 'data') return dataList;
    return unreadAssets;
  }, [activeTab, unreadAssets, imagesList, docsList, dataList]);

  // Handle previewing asset
  const handleOpenPreview = async (file: WorkspaceFileItem) => {
    setPreviewFile(file);
    markAssetReviewed(agentId, file.path);

    const cleanExt = (file.extension || '').toLowerCase().replace(/^\./, '');
    const isTextFormat = ['md', 'markdown', 'txt', 'json', 'csv', 'tsv'].includes(cleanExt);
    if (isTextFormat) {
      setLoadingPreview(true);
      try {
        const contentRes = await AgentService.fetchWorkspaceFileContent(agentId, file.path);
        setPreviewContent(contentRes.content);
      } catch {
        setPreviewContent('Unable to preview file content.');
      } finally {
        setLoadingPreview(false);
      }
    } else {
      setPreviewContent(null);
    }
  };

  const handleMarkSingleReviewed = (file: WorkspaceFileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    markAssetReviewed(agentId, file.path);
  };

  const handleMarkAllReviewed = () => {
    const paths = unreadAssets.map((f) => f.path);
    markAllAssetsReviewed(agentId, paths);
  };

  // ── 1. Compact View (Floating Beacon Dot in Canvas) ──────────────────────
  if (!isExpanded) {
    return (
      <div
        className="thread-process-beacon-dot assets-beacon"
        onClick={() => onToggleExpand(agentId)}
        title={`Click to open unread generated assets for ${agentName} (${unreadAssets.length} unread)`}
      >
        <Handle type="target" position={Position.Left} id="assets-target" style={{ opacity: 0 }} />
        <Handle type="source" position={Position.Right} id="assets-source" style={{ opacity: 0 }} />

        {unreadAssets.length > 0 && (
          <div className="beacon-radar-wave" style={{ borderColor: '#a855f7' }} />
        )}

        <div className="beacon-core-pill" style={{ borderColor: 'rgba(168, 85, 247, 0.45)' }}>
          <div className="beacon-indicator" style={{ backgroundColor: '#a855f7' }}>
            <Sparkles size={12} color="#fff" />
          </div>

          <div className="beacon-info">
            <span className="beacon-title">Assets Queue</span>
            <span className="beacon-run-id">{unreadAssets.length} unread</span>
          </div>

          <div className="beacon-status-badge" style={{ color: '#c084fc' }}>
            {unreadAssets.length > 0 ? (
              <>
                <span className="beacon-pulse-dot" style={{ backgroundColor: '#a855f7' }} />
                <span>Pending Review</span>
              </>
            ) : (
              <span style={{ color: '#10b981' }}>All Reviewed</span>
            )}
          </div>

          <div className="beacon-expand-hint" title="Expand Assets Stream">
            <Maximize2 size={11} />
          </div>
        </div>
      </div>
    );
  }

  // ── 2. Expanded View (Full Unread Assets Review Node) ─────────────────────
  return (
    <div className="thread-process-expanded-card agent-assets-card">
      <Handle
        type="target"
        position={Position.Left}
        id="assets-target"
        style={{ top: 17, opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="assets-source"
        style={{ top: 17, opacity: 0 }}
      />

      {/* Minimalist Top Bar */}
      <div className="thread-minimal-topbar">
        {/* Visual Drag Handle Grip */}
        <div className="thread-drag-handle" title="Hold and drag to move assets thread in space">
          <GripVertical size={13} className="drag-grip-icon" />
        </div>

        {/* Navigation Tabs (draggable on hold) */}
        <div className="thread-nav-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
            title="All Unreviewed Deliverables"
          >
            <Sparkles size={12} />
            <span className="tab-text">
              All <span className="tab-badge">{unreadAssets.length}</span>
            </span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'images' ? 'active' : ''}`}
            onClick={() => setActiveTab('images')}
            title="Unreviewed Images"
          >
            <ImageIcon size={12} />
            <span className="tab-text">
              Images <span className="tab-badge">{imagesList.length}</span>
            </span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
            onClick={() => setActiveTab('documents')}
            title="Unreviewed Documents & Markdowns"
          >
            <FileText size={12} />
            <span className="tab-text">
              Docs <span className="tab-badge">{docsList.length}</span>
            </span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'data' ? 'active' : ''}`}
            onClick={() => setActiveTab('data')}
            title="Unreviewed Data & Spreadsheets"
          >
            <FileSpreadsheet size={12} />
            <span className="tab-text">
              Data <span className="tab-badge">{dataList.length}</span>
            </span>
          </button>
        </div>

        {/* Topbar Actions */}
        <div className="thread-topbar-actions nodrag">
          {unreadAssets.length > 0 && (
            <button
              type="button"
              className="btn-topbar-action"
              onClick={handleMarkAllReviewed}
              title="Mark all as reviewed"
            >
              <CheckCheck size={13} color="#10b981" />
            </button>
          )}

          {onOpenDrawer && (
            <button
              type="button"
              className="btn-topbar-action"
              onClick={() => onOpenDrawer(agentId)}
              title="Open full workspace files explorer"
            >
              <ExternalLink size={12} />
            </button>
          )}

          <button
            type="button"
            className="btn-topbar-action"
            onClick={() => onToggleExpand(agentId)}
            title="Minimize to Dot"
          >
            <Minimize2 size={12} />
          </button>

          {onClose && (
            <button
              type="button"
              className="btn-topbar-action close"
              onClick={() => onClose(agentId)}
              title="Dismiss View"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Assets Body Stream */}
      <div className="thread-tab-content assets-stream-content nodrag nowheel">
        {loading && unreadAssets.length === 0 ? (
          <div className="empty-files-state">
            <span>Loading workspace deliverables...</span>
          </div>
        ) : displayedAssets.length === 0 ? (
          <div className="empty-assets-state">
            <CheckCheck size={26} color="#10b981" className="empty-icon" />
            <span className="empty-title">
              {unreadAssets.length === 0 ? 'All Deliverables Reviewed' : 'No Deliverables In Category'}
            </span>
            <span className="empty-sub">
              {unreadAssets.length === 0
                ? 'No pending deliverables for this agent. Generated documents, spreadsheets (Excel/CSV), charts and images will appear here.'
                : 'No unreviewed deliverables match this tab.'}
            </span>
            {onOpenDrawer && (
              <button
                type="button"
                className="btn-open-explorer-hint"
                onClick={() => onOpenDrawer(agentId)}
              >
                <FolderOpen size={12} />
                <span>Open Files Explorer</span>
              </button>
            )}
          </div>
        ) : (
          <div className="assets-vertical-grid">
            {displayedAssets.map((asset) => {
              const ext = (asset.extension || '').toLowerCase().replace(/^\./, '');
              const isImg = asset.category === 'image' || ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif', 'bmp', 'ico', 'avif'].includes(ext);
              const isDoc = ['md', 'markdown', 'pdf', 'docx', 'doc', 'txt', 'rtf', 'pptx', 'ppt'].includes(ext);
              const isData = ['xlsx', 'xls', 'csv', 'tsv', 'parquet', 'json', 'jsonl'].includes(ext);
              const isVideo = ['mp4', 'webm', 'mov', 'avi'].includes(ext);
              const rawUrl = AgentService.getWorkspaceFileRawUrl(agentId, asset.path);

              return (
                <div
                  key={asset.path}
                  className={`asset-item-card ${previewFile?.path === asset.path ? 'selected' : ''}`}
                  onClick={() => handleOpenPreview(asset)}
                  title="Click to preview & mark as reviewed"
                >
                  {/* Left Thumbnail / Icon */}
                  <div className="asset-thumb-wrap">
                    {isImg ? (
                      <img src={rawUrl} alt={asset.name} className="asset-img-thumb" loading="lazy" />
                    ) : isDoc ? (
                      <div className="asset-icon-box doc">
                        <FileText size={16} />
                        <span className="asset-ext-tag">{ext.toUpperCase()}</span>
                      </div>
                    ) : isData ? (
                      <div className="asset-icon-box data">
                        <FileSpreadsheet size={16} />
                        <span className="asset-ext-tag">{ext.toUpperCase()}</span>
                      </div>
                    ) : isVideo ? (
                      <div className="asset-icon-box video">
                        <Film size={16} />
                        <span className="asset-ext-tag">VIDEO</span>
                      </div>
                    ) : (
                      <div className="asset-icon-box other">
                        <FolderOpen size={16} />
                        <span className="asset-ext-tag">{ext.toUpperCase()}</span>
                      </div>
                    )}
                  </div>

                  {/* Center Details */}
                  <div className="asset-info-col">
                    <div className="asset-title-row">
                      <span className="asset-name" title={asset.path || asset.name}>
                        {asset.name}
                      </span>
                      <span className="unread-pulse-badge">New</span>
                    </div>

                    <div className="asset-meta-row">
                      <span className="asset-size">{formatBytes(asset.size)}</span>
                      {asset.dir && (
                        <>
                          <span className="asset-sep">•</span>
                          <span className="asset-dir" title={asset.dir}>
                            {asset.dir.replace(/^\.smoke-agent\/?/, '')}
                          </span>
                        </>
                      )}
                      <span className="asset-sep">•</span>
                      <span className="asset-time">
                        {asset.mtime ? new Date(asset.mtime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                      </span>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="asset-actions-row">
                    <button
                      type="button"
                      className="btn-asset-action preview"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenPreview(asset);
                      }}
                      title="Inspect & Review"
                    >
                      <Eye size={12} />
                    </button>

                    <button
                      type="button"
                      className="btn-asset-action check"
                      onClick={(e) => handleMarkSingleReviewed(asset, e)}
                      title="Mark as Reviewed"
                    >
                      <Check size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Footer */}
      <div className="thread-card-footer">
        <div className="footer-left">
          <span className="footer-status-dot" style={{ backgroundColor: '#a855f7' }} />
          <span className="footer-status-text">
            {unreadAssets.length} {unreadAssets.length === 1 ? 'deliverable' : 'deliverables'} pending review
          </span>
        </div>

        <div className="footer-right">
          <span className="footer-time">
            Agent Deliverables Queue
          </span>
        </div>
      </div>

      {/* Companion Side Deck Inspector (Docked to the right of the card) */}
      {previewFile && (
        <div className="asset-side-preview-deck nodrag nowheel" onClick={(e) => e.stopPropagation()}>
          {/* Deck Header */}
          <div className="deck-header">
            <div className="deck-header-left">
              <div className="deck-icon-bubble">
                {['xlsx', 'xls', 'csv', 'tsv', 'parquet', 'json', 'jsonl'].includes((previewFile.extension || '').toLowerCase().replace(/^\./, '')) ? (
                  <FileSpreadsheet size={15} color="#10b981" />
                ) : ['docx', 'doc', 'md', 'markdown', 'pdf', 'txt', 'rtf', 'pptx', 'ppt'].includes((previewFile.extension || '').toLowerCase().replace(/^\./, '')) ? (
                  <FileText size={15} color="#38bdf8" />
                ) : (
                  <FolderOpen size={15} color="#a855f7" />
                )}
              </div>
              <div className="deck-title-col">
                <span className="deck-title" title={previewFile.name}>
                  {previewFile.name}
                </span>
                <div className="deck-meta-tags">
                  <span className="deck-tag">{formatBytes(previewFile.size)}</span>
                  <span className="deck-tag ext">
                    {(previewFile.extension || '').toUpperCase().replace(/^\./, '')}
                  </span>
                </div>
              </div>
            </div>

            <div className="deck-header-right">
              <button
                type="button"
                className="btn-deck-action system-app"
                onClick={() => AgentService.openFileWithSystem(agentId, previewFile.path)}
                title="Open in System Default Application (Excel, Numbers, etc.)"
              >
                <ExternalLink size={12} />
                <span>System App</span>
              </button>

              <a
                href={AgentService.getWorkspaceFileRawUrl(agentId, previewFile.path)}
                download={previewFile.name}
                className="btn-deck-action download"
                title="Download File"
              >
                <Download size={13} />
              </a>

              <button
                type="button"
                className="btn-deck-action close"
                onClick={() => setPreviewFile(null)}
                title="Close Inspector"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Deck Body */}
          <div className="deck-body">
            {previewFile.category === 'image' || ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif', 'bmp'].includes((previewFile.extension || '').toLowerCase().replace(/^\./, '')) ? (
              <div className="deck-image-viewport">
                <img
                  src={AgentService.getWorkspaceFileRawUrl(agentId, previewFile.path)}
                  alt={previewFile.name}
                  className="deck-image-content"
                />
              </div>
            ) : previewContent !== null ? (
              <div className="deck-markdown-viewport">
                {loadingPreview ? (
                  <div className="preview-loading">Loading markdown document...</div>
                ) : (
                  <MarkdownProse
                    resolveImageUrl={(src) => AgentService.getWorkspaceFileRawUrl(agentId, src)}
                  >
                    {previewContent}
                  </MarkdownProse>
                )}
              </div>
            ) : (
              <div className="deck-office-viewport">
                <div className={`office-card-hero ${['xlsx', 'xls', 'csv', 'tsv'].includes((previewFile.extension || '').toLowerCase().replace(/^\./, '')) ? 'excel' : 'doc'}`}>
                  {['xlsx', 'xls', 'csv', 'tsv'].includes((previewFile.extension || '').toLowerCase().replace(/^\./, '')) ? (
                    <FileSpreadsheet size={44} className="office-hero-icon" />
                  ) : (
                    <FileText size={44} className="office-hero-icon" />
                  )}
                  <span className="office-card-name">{previewFile.name}</span>
                  <span className="office-card-path">{previewFile.path}</span>
                  <div className="office-badge-pill">
                    {['xlsx', 'xls'].includes((previewFile.extension || '').toLowerCase().replace(/^\./, ''))
                      ? 'Microsoft Excel Spreadsheet'
                      : ['docx', 'doc'].includes((previewFile.extension || '').toLowerCase().replace(/^\./, ''))
                      ? 'Microsoft Word Document'
                      : 'Binary Workspace Deliverable'}
                  </div>
                </div>

                <div className="office-actions-stack">
                  <button
                    type="button"
                    className="btn-office-primary"
                    onClick={() => AgentService.openFileWithSystem(agentId, previewFile.path)}
                  >
                    <ExternalLink size={14} />
                    <span>
                      {['xlsx', 'xls'].includes((previewFile.extension || '').toLowerCase().replace(/^\./, ''))
                        ? 'Open in Microsoft Excel / Numbers'
                        : ['docx', 'doc'].includes((previewFile.extension || '').toLowerCase().replace(/^\./, ''))
                        ? 'Open in Microsoft Word / Pages'
                        : 'Open in System Default Application'}
                    </span>
                  </button>

                  <a
                    href={AgentService.getWorkspaceFileRawUrl(agentId, previewFile.path)}
                    download={previewFile.name}
                    className="btn-office-secondary"
                  >
                    <Download size={14} />
                    <span>Download File ({formatBytes(previewFile.size)})</span>
                  </a>
                </div>

                <p className="office-tip-text">
                  Binary formats are launched with your local system application (macOS, Windows, or Linux) for rich viewing and editing.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
