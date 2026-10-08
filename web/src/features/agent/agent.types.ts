export interface AgentRecord {
  id: string;
  name: string;
  model: string;
  provider: string;
  system_prompt: string;
  cron_schedule: string | null;
  cron_enabled: number;
  pos_x: number;
  pos_y: number;
  status: 'idle' | 'running' | 'scheduled' | 'error';
  last_run_at: string | null;
  next_run_at: string | null;
  disabled_tools?: string | null;
  policies?: string | null;
  /** Preset ids from PERSONALITY_PRESETS, stored as a JSON array string. */
  personalities?: string | null;
  /** Preset ids from OUTPUT_STYLE_PRESETS, stored as a JSON array string. */
  output_styles?: string | null;
  working_dir?: string | null;
  max_memory_mb?: number | null;
  created_at: string;
}

export type AttachmentSource = 'canvas' | 'user' | 'agent';

/** One enforced boundary with its origin, as returned by `GET /agents/:id/manifest`. */
export interface AgentPolicyEntry {
  text: string;
  source: AttachmentSource;
}

export interface AgentMcpRecord {
  id: string;
  agent_id: string;
  mcp_name: string;
  label: string;
  config_json: string;
  enabled: number;
  created_at: string;
  /** Origin: `canvas` (managed), `user` (attached from the input box), `agent` (self-added during a run). */
  source?: AttachmentSource;
}

export interface AgentSkillRecord {
  id: string;
  agent_id: string;
  skill_name: string;
  description: string | null;
  content: string;
  enabled: number;
  created_at: string;
  source?: AttachmentSource;
}

export interface AgentAutomationEntry {
  file?: string;
  purpose?: string;
  whenToUse?: string;
  cron?: string;
  created?: string;
  updated?: string;
  notes?: string;
}

export interface AgentMemoryFileInfo {
  file: string;
  name: string;
  category: string;
  purpose: string;
  path: string;
  exists: boolean;
  sizeBytes: number;
  updatedAt: string | null;
  snippet: string;
}

export interface AgentRepoMemoryInfo {
  dir: string;
  metadata?: {
    repo_key: string;
    repo_slug: string;
    repo_name: string;
    owner?: string;
    remote_url?: string;
    root_path: string;
    branch?: string;
    created_at: string;
    updated_at: string;
    contributing_agents: Array<{
      agent_id: string;
      agent_name: string;
      last_run_at: string;
      task_count: number;
    }>;
  } | null;
  insights?: string;
  features?: string;
  explore?: string;
  history?: string;
  files?: Record<string, string>;
}

/** Response of `GET /api/agents/:id/manifest` — merged, source-aware view. */
export interface AgentManifestInfo {
  agent_id: string;
  agent_name: string;
  workspace: string;
  updated_at: string;
  system_prompt?: string;
  mcps: AgentMcpRecord[];
  skills: AgentSkillRecord[];
  policies: AgentPolicyEntry[];
  automations?: AgentAutomationEntry[];
  memory_files?: AgentMemoryFileInfo[];
  repository_memory?: AgentRepoMemoryInfo | null;
  /** The exact system prompt the next run will send (base + every block). */
  effective_system_prompt: string;
}

export interface RunRecord {
  id: string;
  agent_id: string;
  trigger_type: string;
  status: string;
  task_prompt: string | null;
  summary: string | null;
  error: string | null;
  started_at: string;
  completed_at: string | null;
  session_id?: string | null;
}

export interface RunEventRecord {
  id?: number;
  run_id: string;
  agent_id: string;
  event_type: string;
  payload_json: string;
  created_at: string;
}

export interface ChatSessionRecord {
  id: string;
  agent_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  last_message?: string | null;
}

export interface ChatMessageRecord {
  id: string;
  session_id: string;
  agent_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  parts_json: string | null;
  run_id: string | null;
  created_at: string;
}
export interface SpaceAgentEntity extends AgentRecord {
  [key: string]: unknown;
  mcps: AgentMcpRecord[];
  skills: AgentSkillRecord[];
  latestRun: RunRecord | null;
}

export interface LiveLogEvent {
  eventType: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface ActiveRunRecord {
  runId: string;
  agentId: string;
  triggerType: 'cron' | 'manual';
  sessionId: string;
  status: string;
  startedAt: string;
  taskPrompt: string;
  accumulatedText: string;
  partsCount: number;
}

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
  path: string;
  name: string;
  dir: string;
  extension: string;
  size: number;
  mtime: string;
  isDirectory: boolean;
  category: WorkspaceFileCategory;
  mimeType: string;
}

export interface WorkspaceFilesResponse {
  workspace: string;
  totalFiles: number;
  totalSize: number;
  files: WorkspaceFileItem[];
}

export interface WorkspaceFileContentResponse {
  path: string;
  name: string;
  extension: string;
  category: WorkspaceFileCategory;
  mimeType: string;
  size: number;
  mtime: string;
  content: string;
}


