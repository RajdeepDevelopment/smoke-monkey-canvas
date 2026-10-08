import type { StockMcp } from '../mcp/mcp.types.js';
import type { AgentTemplate } from '../agent/agent.templates.js';

export type LibraryTab = 'mcp' | 'skills' | 'agents' | 'tools' | 'personality' | 'output';

export type PluginCategory =
  | 'Skills'
  | 'MCP Servers'
  | 'MCP Registries'
  | 'Plugin Marketplace'
  | 'Coding Agents'
  | 'Agent Runtimes'
  | 'Agent Memory'
  | 'Observability'
  | 'Knowledge & RAG';

/**
 * Display order for the plugin category filter. Kept next to the union so the
 * sidebar filter cannot drift out of sync with the category set.
 */
export const PLUGIN_CATEGORY_ORDER: readonly PluginCategory[] = [
  'Skills',
  'MCP Servers',
  'MCP Registries',
  'Plugin Marketplace',
  'Coding Agents',
  'Agent Runtimes',
  'Agent Memory',
  'Observability',
  'Knowledge & RAG',
];

/**
 * A widely used GitHub-hosted agent plugin or skill pack. Star counts are a
 * point-in-time snapshot taken from the GitHub API, not a live lookup.
 */
export interface LibraryPlugin {
  /** `owner/repo`, used as a stable id and displayed as the item name. */
  repo: string;
  stars: number;
  /** SPDX id as reported by GitHub, normalised for display. */
  license: string;
  description: string;
  category: PluginCategory;
  /** Optional npm package, only set where the published name is confirmed. */
  npmPackage?: string;
  /** Short, concrete note on what attaching this gives the agent. */
  usage: string;
}

export interface StockSkillItem {
  id: string;
  name: string;
  description: string;
  category: string;
  content: string;
  tags: string[];
  /** Present when this skill was derived from a curated GitHub plugin. */
  plugin?: LibraryPlugin;
  isCustom?: boolean;
}

/**
 * A toolkit is a named bundle of real built-in tool names. Dropping one onto an
 * agent re-enables its tools by removing them from the agent's `disabled_tools`.
 */
export interface ToolKit {
  id: string;
  name: string;
  description: string;
  color: string;
  tools: string[];
  isCustom?: boolean;
}

/** Discriminant for what is being dragged out of the library. */
export type LibItemKind = 'mcp' | 'skill' | 'agent' | 'toolkit' | 'personality' | 'outputStyle';

/** A personality or output-style option from the server preset catalogue. */
export interface PromptPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  directive: string;
  isCustom?: boolean;
}

export interface LibDragPayload {
  kind: LibItemKind;
  mcp?: StockMcp;
  skill?: StockSkillItem;
  agent?: AgentTemplate;
  toolkit?: ToolKit;
  preset?: PromptPreset;
}

/**
 * Custom MIME key. The browser only exposes `text/plain` to drop targets, so the
 * payload is mirrored there and re-read via `getData(LIB_DRAG_KEY)` first.
 */
export const LIB_DRAG_KEY = 'application/x-smoke-monkey-library';

/**
 * In-memory active drag tracking.
 * In Safari, Tauri (macOS WKWebView), and secure WebView contexts, custom MIME types
 * are often stripped from `dataTransfer.types` during dragover, and `getData()` may be
 * blocked or empty. Maintaining in-memory state ensures 100% reliable drag detection
 * and payload retrieval across all environments.
 */
let activeDragPayload: LibDragPayload | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('dragend', () => {
    activeDragPayload = null;
  });
  window.addEventListener('drop', () => {
    setTimeout(() => {
      activeDragPayload = null;
    }, 50);
  });
}

export function setActiveDragPayload(payload: LibDragPayload | null): void {
  activeDragPayload = payload;
}

export function getActiveDragPayload(): LibDragPayload | null {
  return activeDragPayload;
}

/**
 * Universal check for whether the current drag operation originated from the library.
 * Checks in-memory drag state first, then falls back to inspect dataTransfer.types safely.
 */
export function isLibDrag(dt?: DataTransfer | null): boolean {
  if (activeDragPayload !== null) return true;
  if (!dt) return false;
  try {
    const types = dt.types ? Array.from(dt.types) : [];
    return (
      types.includes(LIB_DRAG_KEY) ||
      types.some(
        (t) =>
          typeof t === 'string' &&
          (t.toLowerCase().includes('smoke-monkey') || t === 'application/x-smoke-monkey-library'),
      )
    );
  } catch {
    return false;
  }
}

/** Serialize a drag payload onto the DataTransfer in both readable forms and track in-memory. */
export function writeLibDragPayload(dt: DataTransfer, payload: LibDragPayload): void {
  activeDragPayload = payload;
  const json = JSON.stringify(payload);
  try {
    dt.setData(LIB_DRAG_KEY, json);
  } catch {}
  try {
    dt.setData('text/plain', json);
  } catch {}
  try {
    dt.effectAllowed = 'copy';
  } catch {}
}

/** Read and validate a drag payload. Uses in-memory payload or deserializes from DataTransfer. */
export function readLibDragPayload(dt: DataTransfer | null): LibDragPayload | null {
  if (activeDragPayload) {
    const cached = activeDragPayload;
    return cached;
  }
  if (!dt) return null;
  let raw = '';
  try {
    raw = dt.getData(LIB_DRAG_KEY) || dt.getData('text/plain');
  } catch {}
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LibDragPayload;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!['mcp', 'skill', 'agent', 'toolkit', 'personality', 'outputStyle'].includes(parsed.kind)) return null;
    return parsed;
  } catch {
    return null;
  }
}

