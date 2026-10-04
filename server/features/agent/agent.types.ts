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

export interface AgentMcpRecord {
  id: string;
  agent_id: string;
  mcp_name: string;
  label: string;
  config_json: string;
  enabled: number;
  created_at: string;
}

export interface AgentSkillRecord {
  id: string;
  agent_id: string;
  skill_name: string;
  description: string | null;
  content: string;
  enabled: number;
  created_at: string;
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
