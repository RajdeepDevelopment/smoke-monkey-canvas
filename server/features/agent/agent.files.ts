import fs from 'node:fs';
import path from 'node:path';
import { ensureAgentWorkspace, reconcileAgentWorkspaceRuntime } from './agent.manifest.js';
import { resolveAgentWorkspace } from './agent.prompt.js';

export type WorkspaceFileCategory =
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'markdown'
  | 'code'
  | 'document'
  | 'data'
  | 'other';

export interface WorkspaceFileItem {
  path: string; // Relative to workspace root, e.g. "artifacts/digest.md"
  name: string; // "digest.md"
  dir: string; // "artifacts" or ""
  extension: string; // "md"
  size: number;
  mtime: string;
  isDirectory: boolean;
  category: WorkspaceFileCategory;
  mimeType: string;
  isDeliverable?: boolean;
}

export interface WorkspaceFilesResult {
  workspace: string;
  totalFiles: number;
  totalSize: number;
  files: WorkspaceFileItem[];
}

const MIME_TYPES: Record<string, string> = {
  // Images
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  avif: 'image/avif',
  // Videos
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
  // Audio
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  flac: 'audio/flac',
  // Documents
  pdf: 'application/pdf',
  md: 'text/markdown; charset=utf-8',
  markdown: 'text/markdown; charset=utf-8',
  mdown: 'text/markdown; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  log: 'text/plain; charset=utf-8',
  rtf: 'application/rtf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ppt: 'application/vnd.ms-powerpoint',
  // Code & Data
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  json: 'application/json; charset=utf-8',
  jsonl: 'application/x-ndjson; charset=utf-8',
  csv: 'text/csv; charset=utf-8',
  tsv: 'text/tab-separated-values; charset=utf-8',
  js: 'application/javascript; charset=utf-8',
  mjs: 'application/javascript; charset=utf-8',
  ts: 'text/typescript; charset=utf-8',
  tsx: 'text/typescript-jsx; charset=utf-8',
  jsx: 'text/jsx; charset=utf-8',
  html: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  scss: 'text/x-scss; charset=utf-8',
  py: 'text/x-python; charset=utf-8',
  sh: 'text/x-sh; charset=utf-8',
  bash: 'text/x-sh; charset=utf-8',
  zsh: 'text/x-sh; charset=utf-8',
  sql: 'text/x-sql; charset=utf-8',
  yaml: 'text/yaml; charset=utf-8',
  yml: 'text/yaml; charset=utf-8',
  toml: 'text/x-toml; charset=utf-8',
  xml: 'application/xml; charset=utf-8',
};

const CATEGORIES: Record<WorkspaceFileCategory, string[]> = {
  image: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico', 'avif'],
  video: ['mp4', 'webm', 'mov', 'mkv', 'avi'],
  audio: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'],
  pdf: ['pdf'],
  markdown: ['md', 'markdown', 'mdown', 'mkd'],
  code: [
    'ts', 'tsx', 'js', 'jsx', 'json', 'py', 'sh', 'bash', 'zsh',
    'html', 'css', 'scss', 'rs', 'go', 'yaml', 'yml', 'sql',
    'toml', 'xml', 'dockerfile', 'java', 'c', 'cpp', 'h'
  ],
  data: ['csv', 'tsv', 'xlsx', 'xls', 'parquet', 'jsonl'],
  document: ['doc', 'docx', 'txt', 'rtf', 'log', 'pptx', 'ppt'],
  other: [],
};

export function getFileCategory(ext: string): WorkspaceFileCategory {
  const cleanExt = ext.toLowerCase().replace(/^\./, '');
  for (const [category, extensions] of Object.entries(CATEGORIES)) {
    if (extensions.includes(cleanExt)) {
      return category as WorkspaceFileCategory;
    }
  }
  return 'other';
}

export function getFileMimeType(ext: string): string {
  const cleanExt = ext.toLowerCase().replace(/^\./, '');
  return MIME_TYPES[cleanExt] || 'application/octet-stream';
}

export function safeResolveWorkspacePath(workspaceRoot: string, relativePath: string): string | null {
  if (!workspaceRoot) return null;
  const normalizedRoot = path.resolve(workspaceRoot);
  const targetPath = path.resolve(normalizedRoot, relativePath || '.');

  // Guard against path traversal outside workspace
  if (!targetPath.startsWith(normalizedRoot)) {
    return null;
  }
  return targetPath;
}

const IGNORED_NAMES = new Set(['.git', 'node_modules', '.DS_Store', 'Thumbs.db', '.smoke']);

/**
 * Filenames that are internal to the agent harness/framework and should
 * NEVER be considered user-facing deliverables.
 */
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
  // Spreadsheets and data exports (Excel, CSV, TSV)
  'xlsx', 'xls', 'csv', 'tsv', 'parquet',
  // Documents and presentations
  'docx', 'doc', 'pdf', 'rtf', 'pptx', 'ppt',
  // Images, charts, visual diagrams
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico', 'avif',
  // Media deliverables
  'mp4', 'webm', 'mov', 'avi', 'mp3', 'wav',
  // Markdown reports/deliverables
  'md', 'markdown',
  // Data formats (conditionally)
  'json', 'jsonl', 'txt',
]);

/**
 * Identifies whether a file is a user-facing deliverable / output asset
 * created by the agent for the user, rather than internal configuration,
 * framework plumbing, memory, prompts, or repository code.
 */
export function isDeliverableAsset(file: {
  path: string;
  name: string;
  dir?: string;
  extension?: string;
}): boolean {
  const name = (file.name || '').toLowerCase();
  const ext = (file.extension || '').toLowerCase().replace(/^\./, '');
  const normPath = (file.path || '').replace(/\\/g, '/').toLowerCase();

  // 1. Exclude dotfiles (e.g. .gitignore, .DS_Store, .env)
  if (name.startsWith('.')) return false;

  // 2. Exclude known internal framework filenames
  if (INTERNAL_SYSTEM_FILENAMES.has(name)) return false;

  // 3. Exclude paths inside execution run logs, tool dumps, etc.
  if (normPath.includes('/runs/') || normPath.startsWith('.smoke/') || normPath.includes('/logs/') || normPath.startsWith('logs/')) {
    return false;
  }

  // 4. Check segments for internal agent directories
  const segments = normPath.split('/');
  const isInsideArtifacts =
    segments.includes('artifacts') ||
    segments.includes('deliverables') ||
    segments.includes('output') ||
    segments.includes('outputs') ||
    segments.includes('exports') ||
    segments.includes('reports');

  for (const seg of segments) {
    if (INTERNAL_DIR_NAMES.has(seg)) {
      return false;
    }
  }

  // If inside `.smoke-agent` but not inside `artifacts`, it is an internal file
  if (segments.includes('.smoke-agent') && !isInsideArtifacts) {
    return false;
  }

  // 5. Must have an allowed extension
  if (!DELIVERABLE_EXTENSIONS.has(ext)) {
    return false;
  }

  // 6. JSON files are only deliverables if inside artifacts/output directories,
  // or named as data/report/export/layout/metrics
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

  // 7. Markdown files inside .smoke-agent must be in artifacts
  if (ext === 'md' || ext === 'markdown') {
    if (segments.includes('.smoke-agent') && !isInsideArtifacts) {
      return false;
    }
  }

  // 8. Plain text files (.txt) must be inside artifacts or look like a report/summary
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

export function scanAgentWorkspaceFiles(workspaceRoot: string): WorkspaceFilesResult {
  const result: WorkspaceFileItem[] = [];
  if (!workspaceRoot || !fs.existsSync(workspaceRoot)) {
    return {
      workspace: workspaceRoot,
      totalFiles: 0,
      totalSize: 0,
      files: [],
    };
  }

  const normalizedRoot = path.resolve(workspaceRoot);

  function walk(currentDir: string) {
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (IGNORED_NAMES.has(entry.name)) continue;

      const fullPath = path.join(currentDir, entry.name);
      const relPath = path.relative(normalizedRoot, fullPath).replace(/\\/g, '/');
      const relDir = path.dirname(relPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() || entry.isSymbolicLink()) {
        try {
          const stat = fs.statSync(fullPath);
          const ext = path.extname(entry.name).toLowerCase().replace(/^\./, '');
          const category = getFileCategory(ext);
          const mimeType = getFileMimeType(ext);
          const isDeliverable = isDeliverableAsset({
            path: relPath,
            name: entry.name,
            dir: relDir === '.' ? '' : relDir,
            extension: ext,
          });

          result.push({
            path: relPath,
            name: entry.name,
            dir: relDir === '.' ? '' : relDir,
            extension: ext,
            size: stat.size,
            mtime: stat.mtime.toISOString(),
            isDirectory: false,
            category,
            mimeType,
            isDeliverable,
          });
        } catch {}
      }
    }
  }

  walk(normalizedRoot);

  // Sort files: deliverables first, then artifacts, then by modified time descending
  result.sort((a, b) => {
    // Deliverables at the top
    if (a.isDeliverable && !b.isDeliverable) return -1;
    if (!a.isDeliverable && b.isDeliverable) return 1;

    // Artifacts folder next
    const aIsArtifact = a.dir.includes('artifacts');
    const bIsArtifact = b.dir.includes('artifacts');
    if (aIsArtifact && !bIsArtifact) return -1;
    if (!aIsArtifact && bIsArtifact) return 1;

    // Then newest first
    return new Date(b.mtime).getTime() - new Date(a.mtime).getTime();
  });

  const totalSize = result.reduce((acc, f) => acc + f.size, 0);

  return {
    workspace: normalizedRoot,
    totalFiles: result.length,
    totalSize,
    files: result,
  };
}

// ── Watcher Registry ─────────────────────────────────────────────────────────

const activeWatchers = new Map<string, { watcher: fs.FSWatcher; timer?: NodeJS.Timeout }>();

export function watchAgentWorkspace(
  agentId: string,
  workspaceRoot: string,
  onFileChange: () => void,
): void {
  if (!workspaceRoot || !fs.existsSync(workspaceRoot)) return;
  const normalizedRoot = path.resolve(workspaceRoot);

  // If already watching this agent workspace, keep it
  if (activeWatchers.has(agentId)) {
    return;
  }

  try {
    const watcher = fs.watch(normalizedRoot, { recursive: true }, (_eventType, filename) => {
      if (filename && (filename.includes('.git') || filename.includes('node_modules') || filename.endsWith('.DS_Store'))) {
        return;
      }
      const entry = activeWatchers.get(agentId);
      if (entry) {
        if (entry.timer) clearTimeout(entry.timer);
        entry.timer = setTimeout(() => {
          onFileChange();
        }, 300);
      }
    });

    activeWatchers.set(agentId, { watcher });
  } catch (err) {
    // If recursive fs.watch is not supported on this platform, fail gracefully
    console.warn(`[agent.files] Watcher could not be started for ${agentId}:`, err);
  }
}

export function unwatchAgentWorkspace(agentId: string): void {
  const entry = activeWatchers.get(agentId);
  if (entry) {
    if (entry.timer) clearTimeout(entry.timer);
    try {
      entry.watcher.close();
    } catch {}
    activeWatchers.delete(agentId);
  }
}

/**
 * Setup a proactive file watcher on an agent's workspace.
 * When files are changed (via agent tool execution, peer agent write, or manual terminal operation),
 * it reconciles runtime changes (system prompt, skills, MCPs) and broadcasts live websocket updates.
 */
export function setupAgentWorkspaceWatcher(
  agentId: string,
  db: any,
  wsServer: { broadcast: (msg: any) => void },
): void {
  const agent = db.getAgent(agentId);
  if (!agent) return;
  const workspaceRoot = resolveAgentWorkspace(agent);
  if (!workspaceRoot) return;

  try {
    if (!fs.existsSync(workspaceRoot)) {
      fs.mkdirSync(workspaceRoot, { recursive: true });
    }
  } catch {}

  watchAgentWorkspace(agent.id, workspaceRoot, () => {
    try {
      const ws = ensureAgentWorkspace(workspaceRoot, agent.id, agent.name, agent.system_prompt);
      reconcileAgentWorkspaceRuntime({ agentId: agent.id, ws, db, wsServer });
    } catch (err) {
      console.warn(`[agent.files] Live watcher reconciliation error for ${agent.id}:`, err);
    }
    try {
      wsServer.broadcast({
        type: 'agent_files_updated',
        agentId: agent.id,
        data: { timestamp: new Date().toISOString() },
      });
    } catch {}
  });
}

/**
 * Initialize file watchers for all existing agents on startup.
 */
export function initAllAgentWatchers(db: any, wsServer: { broadcast: (msg: any) => void }): void {
  try {
    const agents = db.getAllAgents();
    for (const agent of agents) {
      setupAgentWorkspaceWatcher(agent.id, db, wsServer);
    }
  } catch (err) {
    console.warn('[agent.files] Failed to initialize agent workspace watchers:', err);
  }
}
