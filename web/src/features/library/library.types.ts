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

/** Serialize a drag payload onto the DataTransfer in both readable forms. */
export function writeLibDragPayload(dt: DataTransfer, payload: LibDragPayload): void {
  const json = JSON.stringify(payload);
  dt.setData(LIB_DRAG_KEY, json);
  dt.setData('text/plain', json);
  dt.effectAllowed = 'copy';
}

/** Read and validate a drag payload. Returns null for foreign drags. */
export function readLibDragPayload(dt: DataTransfer | null): LibDragPayload | null {
  if (!dt) return null;
  const raw = dt.getData(LIB_DRAG_KEY) || dt.getData('text/plain');
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
