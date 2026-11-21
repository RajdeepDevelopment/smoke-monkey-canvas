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
  /** Preset ids from PERSONALITY_PRESETS. JSON array, like `policies`. */
  personalities?: string | null;
  /** Preset ids from OUTPUT_STYLE_PRESETS. JSON array, like `policies`. */
  output_styles?: string | null;
  role?: string | null;
  description?: string | null;
  specialty?: string | null;
  working_dir?: string | null;
  max_memory_mb?: number | null;
  created_at: string;
  feature_ownership_json?: string | null;  // JSON: FeatureOwnership[]
  owned_space_id?: string | null;
  agent_tier?: 'architect' | 'manager' | 'leaf' | null;
  last_sync_at?: string | null;
}

export interface AgentConnectionRecord {
  id: string;
  source_agent_id: string;
  target_agent_id: string;
  created_at: string;
}

export type AttachmentSource = 'canvas' | 'user' | 'agent';

export interface AgentPolicyEntry {
  /** The policy/constraint text, rendered into the agent's system prompt. */
  text: string;
  /** Who added this policy: canvas (platform-managed), user (input box), or agent (self-added during a run). */
  source: AttachmentSource;
}

/** Parse the `agents.policies` JSON column into entries. Accepts legacy arrays
 * of plain strings (treated as `user`-added) and arrays of `{text, source}`. */
export const parsePolicies = (raw: string | null | undefined): AgentPolicyEntry[] => {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return raw.trim() ? [{ text: raw.trim(), source: 'user' }] : [];
    return parsed
      .map((p): AgentPolicyEntry | null => {
        if (typeof p === 'string') {
          const text = p.trim();
          return text ? { text, source: 'user' } : null;
        }
        if (p && typeof p === 'object') {
          const o = p as { text?: unknown; source?: unknown };
          const text = typeof o.text === 'string' ? o.text.trim() : '';
          if (!text) return null;
          const src =
            o.source === 'canvas' || o.source === 'agent' || o.source === 'user'
              ? o.source
              : 'user';
          return { text, source: src };
        }
        return null;
      })
      .filter((p): p is AgentPolicyEntry => p !== null);
  } catch {
    return raw.trim() ? [{ text: raw.trim(), source: 'user' }] : [];
  }
};

export const stringifyPolicies = (entries: AgentPolicyEntry[]): string => JSON.stringify(entries);

export interface AgentMcpRecord {
  id: string;
  agent_id: string;
  mcp_name: string;
  label: string;
  config_json: string;
  enabled: number;
  created_at: string;
  /** Origin of this attachment: canvas (managed), user (input box), or agent (self-added). */
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

export interface RunRecord {
  id: string;
  agent_id: string;
  trigger_type: string; // 'cron' | 'manual'
  status: string; // 'running' | 'completed' | 'failed'
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

export type CronJobSource = 'user' | 'agent' | 'system';

export interface AgentCronJobRecord {
  id: string;
  agent_id: string;
  name: string;
  prompt: string;
  cron_schedule: string;
  enabled: number;
  last_run_at: string | null;
  next_run_at: string | null;
  last_status?: 'completed' | 'failed' | 'running' | null;
  last_error?: string | null;
  created_by: CronJobSource;
  /**
   * Set once a user edits a system-seeded default job via the API (not when
   * the sync logic itself writes to it). ensureDefaultAgentCronJobs() skips
   * re-overwriting a job once this is set, instead of silently reverting the
   * user's edit on every server restart / cron sync. See #10.
   */
  user_modified?: number;
  created_at: string;
  updated_at: string;
}

export interface AgentCronJobInput {
  name: string;
  prompt: string;
  cron_schedule: string;
  enabled?: boolean | number;
  created_by?: CronJobSource;
}

export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TodoPriority = 'high' | 'medium' | 'low';

export interface AgentTodoItem {
  content: string;
  status: TodoStatus;
  priority?: TodoPriority;
  section?: string;
}

export interface AgentTodoRecord {
  id: string;
  agent_id: string;
  task_date: string; // YYYY-MM-DD
  run_id?: string | null;
  session_id?: string | null;
  content: string;
  status: TodoStatus;
  priority: TodoPriority;
  section?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  metadata_json?: string | null;
}

export interface AgentTodoDaySummary {
  date: string;
  agentId: string;
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  cancelled: number;
  completionRate: number; // 0 - 100
  sections: string[];
  specializations: string[];
  crossedMidnight?: boolean;
  todos: AgentTodoRecord[];
}

export interface FeatureOwnership {
  feature_id: string;
  feature: string;
  folders: string[];
  key_files: string[];
  description: string;
  complexity?: 'high' | 'medium' | 'low';
}

export type ExploreSessionStatus = 'pending' | 'exploring' | 'complete' | 'building' | 'built' | 'failed';

export interface ExploreFeature {
  id: string;
  name: string;
  description: string;
  folders: string[];
  key_files: string[];
  complexity: 'high' | 'medium' | 'low';
  suggested_agent_name: string;
}

export interface ExploreZonePlan {
  name: string;
  role_title: string;
  description?: string;
  color?: string;
  sub_zones?: Array<{
    name: string;
    role_title?: string;
    features: string[];  // feature IDs
  }>;
}

export interface ExploreManagerPlan {
  name: string;
  zone: string;
  manages_features: string[];  // feature IDs
  description?: string;
}

export interface ExploreReport {
  company_name: string;
  company_type: 'software_product' | 'agency' | 'internal_tooling' | 'non_tech';
  tech_stack: string[];
  project_summary: string;
  features: ExploreFeature[];
  zones_plan: ExploreZonePlan[];
  managers_plan: ExploreManagerPlan[];
  required_mcps: string[];
  agent_count_estimate: number;
  explore_summary: string;
}

export interface ExploreSessionRecord {
  id: string;
  space_id: string;
  status: ExploreSessionStatus;
  brief_markdown: string | null;
  attached_docs_json: string;  // JSON: Array<{filename: string, content: string}>
  git_url: string | null;
  git_local_path: string | null;
  tech_stack_json: string;  // JSON: string[]
  explore_report_json: string | null;  // JSON: ExploreReport
  explorer_agent_id: string | null;
  architect_agent_id?: string | null;
  provider?: string | null;
  model?: string | null;
  sync_interval_hours: number;
  created_at: string;
  completed_at: string | null;
}

