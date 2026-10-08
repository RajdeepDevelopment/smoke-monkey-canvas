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
  working_dir?: string | null;
  max_memory_mb?: number | null;
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
