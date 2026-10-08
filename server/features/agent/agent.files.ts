import fs from 'node:fs';
import path from 'node:path';

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
  // Code & Data
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
  document: ['doc', 'docx', 'txt', 'rtf', 'log'],
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

const IGNORED_NAMES = new Set(['.git', 'node_modules', '.DS_Store', 'Thumbs.db']);

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
          });
        } catch {}
      }
    }
  }

  walk(normalizedRoot);

  // Sort files: artifacts and markdown first, then by modified time descending
  result.sort((a, b) => {
    // Put artifacts folder at the top
    const aIsArtifact = a.dir.startsWith('artifacts');
    const bIsArtifact = b.dir.startsWith('artifacts');
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
