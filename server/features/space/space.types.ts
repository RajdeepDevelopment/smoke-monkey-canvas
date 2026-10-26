export interface SpaceCoordinates {
  x: number;
  y: number;
}

export type ZoneShape = 'rectangle' | 'circle';
export type ZoneDelegationPolicy = 'auto' | 'down' | 'up' | 'both' | 'peers';

export interface SpaceZone {
  id: string;
  name: string;
  roleTitle: string;
  description: string | null;
  responsibilities: string | null;
  workflowInstructions: string | null;
  level: number;
  parentZoneId: string | null;
  /** Visual Office Space this designation zone is placed inside (client geometry). */
  spaceId: string | null;
  color: string;
  shape: ZoneShape;
  width: number;
  height: number;
  x: number;
  y: number;
  repoUrl: string | null;
  workingDir: string | null;
  projectBrief: string | null;
  delegationPolicy: ZoneDelegationPolicy;
  createdAt: string;
  updatedAt: string;
}

export type SpaceZoneInput = Partial<Omit<SpaceZone, 'createdAt' | 'updatedAt'>> & {
  id?: string;
  name: string;
};

export interface WorkflowAgentCapability {
  id: string;
  name: string;
  role: string | null;
  specialty: string | null;
  description: string | null;
  status: string;
  model: string;
  provider: string;
  workingDir: string | null;
  skills: string[];
  mcps: string[];
  isConfigured: boolean;
  configIssues: string[];
}

export interface WorkflowTreeZone {
  id: string;
  name: string;
  roleTitle: string;
  level: number;
  parentZoneId: string | null;
  color: string;
  responsibilities: string | null;
  workflowInstructions: string | null;
  project: {
    repoUrl: string | null;
    workingDir: string | null;
    brief: string | null;
  };
  delegationPolicy: ZoneDelegationPolicy;
  members: WorkflowAgentCapability[];
  childZoneIds: string[];
}

export interface WorkflowDelegationRoute {
  agentId: string;
  zoneId: string | null;
  zoneRole: string | null;
  policy: ZoneDelegationPolicy | null;
  managerIds: string[];
  reportIds: string[];
  peerIds: string[];
  escalationIds: string[];
  blockedIds: string[];
  connectedIds: string[];
}

export interface SpaceWorkflow {
  generatedAt: string;
  totalAgents: number;
  totalZones: number;
  zones: WorkflowTreeZone[];
  unassignedAgents: WorkflowAgentCapability[];
  routes: WorkflowDelegationRoute[];
  connections: Array<{ sourceAgentId: string; targetAgentId: string }>;
}

export interface SpaceWorkspacePrompt {
  spaceId: string;
  name: string | null;
  prompt: string;
  updatedAt: string | null;
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
