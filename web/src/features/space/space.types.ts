import type { PromptPreset } from '../library/library.types.js';
import type { Node, Edge } from '@xyflow/react';
import type { SpaceAgentEntity } from '../agent/agent.types.js';
import type { StockMcp, McpReadiness } from '../mcp/mcp.types.js';
import type { ThreadProcessNodeData } from './thread-process-node.js';
import type { ThreadEdgeData } from './thread-edge.js';

import type { AgentAssetsNodeData } from './agent-assets-node.js';
import type { PeerEdgeData } from './agent-peer-edge.js';

export type ZoneShape = 'rectangle' | 'circle';
export type ZoneDelegationPolicy = 'auto' | 'down' | 'up' | 'both' | 'peers';

export interface GroupWorkspaceZone {
  id: string;
  name: string;
  description?: string;
  roleTitle?: string;
  level?: number;
  parentZoneId?: string | null;
  responsibilities?: string;
  workflowInstructions?: string;
  delegationPolicy?: ZoneDelegationPolicy;
  repoUrl?: string;
  workingDir?: string;
  projectBrief?: string;
  /** Workspace-wide operating prompt injected into every agent run in this space. */
  workflowPrompt?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  shape: ZoneShape;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * A hierarchical designation placed inside a visual Office Space.
 * Agents physically inside the zone inherit its role, level and project context.
 */
export interface RoleZone extends GroupWorkspaceZone {
  roleTitle: string;
  level: number;
  delegationPolicy: ZoneDelegationPolicy;
  /** Visual Office Space this zone belongs to. */
  spaceId?: string | null;
}

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

export interface SpaceContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  flowX: number;
  flowY: number;
}

/** Node data is the agent plus UI-only extras the canvas attaches. */
export type AgentNodeData = SpaceAgentEntity & {
  /** Personalities resolved from `personalities` ids for display. */
  personalityItems?: PromptPreset[];
  /** Output styles resolved from `output_styles` ids for display. */
  outputStyleItems?: PromptPreset[];
  /** Count of active / visible running threads in space map */
  activeThreadsCount?: number;
  /** Callback to toggle threads visibility in canvas */
  onToggleThreads?: (agentId: string) => void;
  /** Unread deliverables count */
  unreadAssetsCount?: number;
  /** Callback to toggle deliverables thread in canvas */
  onToggleAssets?: (agentId: string) => void;
  /** Whether this agent is currently placed inside an office space pod */
  inWorkspaceZone?: boolean;
  workspaceZoneId?: string;
  workspaceZoneColor?: string;
  workspaceZoneName?: string;
  workspaceZoneRole?: string;
  workspaceZoneLevel?: number;
  workspaceZoneParentId?: string | null;
  workspaceZoneWidth?: number;
  workspaceZoneHeight?: number;
  /** Hierarchical designation inherited from the zone the agent sits inside. */
  roleZoneId?: string;
  roleZoneName?: string;
  roleZoneRole?: string;
  roleZoneLevel?: number;
  roleZoneColor?: string;
  roleZoneSpaceId?: string | null;
  podMemberCount?: number;
  podDensity?: 'standard' | 'compact' | 'mini' | 'micro';
  podScale?: number;
  podAvatarSize?: number;
  podCardWidth?: number;
  podCardHeight?: number;
};

export interface AssetsEdgeData {
  [key: string]: unknown;
  unreadCount: number;
  totalCount: number;
  isExpanded?: boolean;
  onEdgeClick?: () => void;
}

/**
 * Strict Z-index stacking hierarchy for the canvas.
 * Agents MUST always sit above connection lines and hierarchy arrows so they
 * can be freely dragged, hovered and clicked without edges stealing mouse events.
 */
export const WORKSPACE_ZONE_Z = 1;  // Office space room backdrops (lowest canvas layer)
export const ROLE_ZONE_Z = 2;       // Role zone department backdrops
export const HIERARCHY_EDGE_Z = 5;  // Zone-to-zone arrows sit ON TOP of zones, BEHIND agents
export const CONNECTOR_EDGE_Z = 6;  // Thread/assets connection edges ON TOP of zones, BEHIND agents
export const PEER_EDGE_Z = 6;       // Peer connection lines ON TOP of zones, BEHIND agents
export const THREAD_NODE_Z = 15;    // Interactive thread & assets beacon nodes
export const AGENT_NODE_Z = 20;     // Agent cards and avatars (ABOVE all edges and zones)
export const AGENT_ACTIVE_Z = 50;   // Selected or actively dragged agent elevation

export interface GroupWorkspaceNodeData {
  [key: string]: unknown;
  id: string;
  name: string;
  description?: string;
  roleTitle?: string;
  level?: number;
  parentZoneId?: string | null;
  responsibilities?: string;
  workflowInstructions?: string;
  delegationPolicy?: ZoneDelegationPolicy;
  repoUrl?: string;
  workingDir?: string;
  projectBrief?: string;
  width: number;
  height: number;
  color: string;
  shape: 'rectangle' | 'circle';
  memberAgents: Array<SpaceAgentEntity>;
  workspaceZoneCount?: number;
  isWorkspaceOpen?: boolean;
  onOpenWorkspace?: (id: string) => void;
  onUpdateZone?: (
    id: string,
    updates: Partial<{
      name: string;
      color: string;
      width: number;
      height: number;
      shape: 'rectangle' | 'circle';
      x: number;
      y: number;
      roleTitle: string;
      level: number;
      parentZoneId: string | null;
      responsibilities: string;
      workflowInstructions: string;
      delegationPolicy: ZoneDelegationPolicy;
      repoUrl: string;
      workingDir: string;
      projectBrief: string;
      workflowPrompt: string;
    }>,
  ) => void;
  onRemoveZone?: (id: string) => void;
  onEditZone?: (id: string) => void;
  onAlignZoneMembers?: (zoneId: string) => void;
  onInterconnectPeers?: (agentIds: string[], zoneName: string) => void;
  onOpenDrawer?: (agent: SpaceAgentEntity) => void;
  onRunAgent?: (agentId: string) => void;
  onEditAgent?: (agent: SpaceAgentEntity) => void;
  stockMcps?: StockMcp[];
  mcpReadiness?: Record<string, McpReadiness>;
  configuredKeys?: Record<string, boolean>;
  connectingMcpName?: string | null;
  onConnectMcp?: (mcp: StockMcp, agentId?: string) => void;
  onRemoveMcp?: (mcpName: string, affectedAgentIds: string[]) => Promise<void> | void;
}

export interface HierarchyEdgeData {
  [key: string]: unknown;
  label?: string;
  color?: string;
  level?: number;
}

export interface RoleZoneNodeData {
  [key: string]: unknown;
  id: string;
  name: string;
  description?: string;
  roleTitle: string;
  level: number;
  parentZoneId?: string | null;
  spaceId?: string | null;
  color: string;
  shape: ZoneShape;
  width: number;
  height: number;
  memberCount: number;
  memberNames: string[];
  onEditZone?: (id: string) => void;
  onRemoveZone?: (id: string) => void;
  onResizeZone?: (id: string, width: number, height: number, x: number, y: number) => void;
}

export interface WorkspacePanelNodeData {
  [key: string]: unknown;
  space: GroupWorkspaceZone;
  agents: SpaceAgentEntity[];
  zones: RoleZone[];
  onClose: () => void;
  onCreateZone: () => void;
  onEditZone: (zone: RoleZone) => void;
  onRemoveZone: (id: string) => void;
  onFocusZone: (zone: RoleZone) => void;
  onOpenAgent: (agent: SpaceAgentEntity) => void;
  onSaveWorkflowPrompt?: (spaceId: string, prompt: string) => void;
}

export interface AgentSkeletonNodeData {
  [key: string]: unknown;
  name: string;
  role?: string | null;
  provider?: string;
  model?: string;
  isAvatar?: boolean;
  zoneColor?: string;
  phase?: 'provisioning' | 'attaching_mcps' | 'attaching_skills' | 'ready';
}

export type AgentNode = Node<AgentNodeData, 'crabAgent'>;
export type AgentSkeletonNode = Node<AgentSkeletonNodeData, 'agentSkeleton'>;
export type ThreadProcessNode = Node<ThreadProcessNodeData, 'threadProcess'>;
export type AgentAssetsNode = Node<AgentAssetsNodeData, 'agentAssets'>;
export type GroupWorkspaceNode = Node<GroupWorkspaceNodeData, 'groupWorkspace'>;
export type RoleZoneNode = Node<RoleZoneNodeData, 'roleZone'>;
export type WorkspacePanelNode = Node<WorkspacePanelNodeData, 'workspacePanel'>;
export type CanvasNode =
  | AgentNode
  | AgentSkeletonNode
  | ThreadProcessNode
  | AgentAssetsNode
  | GroupWorkspaceNode
  | RoleZoneNode
  | WorkspacePanelNode;
export type CanvasEdge =
  | Edge<ThreadEdgeData, 'threadEdge'>
  | Edge<AssetsEdgeData, 'assetsEdge'>
  | Edge<PeerEdgeData, 'peerEdge'>
  | Edge<HierarchyEdgeData, 'hierarchyEdge'>;

