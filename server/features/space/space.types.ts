export interface SpaceCoordinates {
  x: number;
  y: number;
}

export interface SpaceNodeRecord {
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
  created_at: string;
}

export interface SpaceAgentEntity extends SpaceNodeRecord {
  mcps: Array<{
    id: string;
    agent_id: string;
    mcp_name: string;
    label: string;
    config_json: string;
    enabled: number;
    created_at: string;
  }>;
  skills: Array<{
    id: string;
    agent_id: string;
    skill_name: string;
    description: string | null;
    content: string;
    enabled: number;
    created_at: string;
  }>;
  latestRun: {
    id: string;
    agent_id: string;
    trigger_type: string;
    status: string;
    summary: string | null;
    error: string | null;
    started_at: string;
    completed_at: string | null;
  } | null;
}
