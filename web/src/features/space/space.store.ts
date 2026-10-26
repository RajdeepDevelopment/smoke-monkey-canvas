import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, type NodeChange, type EdgeChange } from '@xyflow/react';
import type { SpaceAgentEntity, AgentRecord, LiveLogEvent } from '../agent/agent.types.js';
import type { CanvasNode, CanvasEdge, GroupWorkspaceZone, RoleZone } from './space.types.js';
import type { ThemeMode } from './space.toolbar.js';
import { SpaceService } from './space.service.js';

export type { GroupWorkspaceZone, RoleZone } from './space.types.js';

const MIN_DRAWER_WIDTH = 440;

function getInitialDrawerWidth(): number {
  try {
    const saved = localStorage.getItem('sm_canvas_drawer_width');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= MIN_DRAWER_WIDTH) {
        return Math.min(parsed, Math.max(MIN_DRAWER_WIDTH, window.innerWidth - 60));
      }
    }
  } catch {}
  return 540;
}

function getInitialTheme(): ThemeMode {
  try {
    return (localStorage.getItem('sm_canvas_theme') as ThemeMode) || 'theme-dark-carbon';
  } catch {
    return 'theme-dark-carbon';
  }
}

function loadReviewedAssets(): Record<string, string> {
  try {
    const raw = localStorage.getItem('sm_reviewed_assets');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveReviewedAssets(data: Record<string, string>) {
  try {
    localStorage.setItem('sm_reviewed_assets', JSON.stringify(data));
  } catch {}
}

export interface DrawerCaller {
  id: string;
  name: string;
  role?: string | null;
  taskTitle?: string;
}

function normalizeWorkspaceZone(raw: Partial<GroupWorkspaceZone>): GroupWorkspaceZone {
  return {
    id: raw.id || `zone-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: raw.name || 'Team Zone',
    description: raw.description,
    roleTitle: raw.roleTitle || raw.name || 'Team Member',
    level: typeof raw.level === 'number' ? raw.level : 0,
    parentZoneId: raw.parentZoneId ?? null,
    responsibilities: raw.responsibilities,
    workflowInstructions: raw.workflowInstructions,
    delegationPolicy: raw.delegationPolicy || 'auto',
    repoUrl: raw.repoUrl,
    workingDir: raw.workingDir,
    projectBrief: raw.projectBrief,
    workflowPrompt: raw.workflowPrompt,
    x: typeof raw.x === 'number' ? raw.x : 0,
    y: typeof raw.y === 'number' ? raw.y : 0,
    width: typeof raw.width === 'number' ? raw.width : 720,
    height: typeof raw.height === 'number' ? raw.height : 520,
    color: raw.color || '#3b82f6',
    shape: raw.shape === 'circle' ? 'circle' : 'rectangle',
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function normalizeRoleZone(raw: Partial<RoleZone>): RoleZone {
  return {
    ...normalizeWorkspaceZone(raw),
    roleTitle: raw.roleTitle || raw.name || 'Team Member',
    level: typeof raw.level === 'number' ? raw.level : 0,
    parentZoneId: raw.parentZoneId ?? null,
    delegationPolicy: raw.delegationPolicy || 'auto',
    spaceId: raw.spaceId ?? null,
  };
}

function loadWorkspaceZones(): GroupWorkspaceZone[] {
  try {
    const raw = localStorage.getItem('sm_canvas_workspace_zones');
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeWorkspaceZone);
  } catch {
    return [];
  }
}

function saveWorkspaceZones(zones: GroupWorkspaceZone[]) {
  try {
    localStorage.setItem('sm_canvas_workspace_zones', JSON.stringify(zones));
  } catch {}
}

const THREAD_POSITIONS_KEY = 'sm_canvas_thread_positions';
const ASSETS_POSITIONS_KEY = 'sm_canvas_assets_positions';
const PANEL_POSITIONS_KEY = 'sm_canvas_panel_positions';
const CANVAS_VIEWPORT_KEY = 'sm_canvas_viewport';

type CanvasPoint = { x: number; y: number };

function loadPositionMap(key: string): Record<string, CanvasPoint> {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, CanvasPoint> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, Partial<CanvasPoint>>)) {
      if (v && typeof v.x === 'number' && typeof v.y === 'number') out[k] = { x: v.x, y: v.y };
    }
    return out;
  } catch {
    return {};
  }
}

function savePositionMap(key: string, map: Record<string, CanvasPoint>) {
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch {}
}

function loadCanvasViewport(): { x: number; y: number; zoom: number } | null {
  try {
    const raw = localStorage.getItem(CANVAS_VIEWPORT_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof (parsed as { x?: unknown }).x !== 'number' ||
      typeof (parsed as { y?: unknown }).y !== 'number' ||
      typeof (parsed as { zoom?: unknown }).zoom !== 'number'
    ) {
      return null;
    }
    return parsed as { x: number; y: number; zoom: number };
  } catch {
    return null;
  }
}

export type AgentMood = 'idle' | 'thinking' | 'working' | 'completed' | 'error';

export interface AgentMoodState {
  mood: AgentMood;
  detail?: string;
  updatedAt: number;
}

export interface SpaceStoreState {
  // Agent dynamic moods & expressions (Optimized per-agent live state)
  agentMoods: Record<string, AgentMoodState>;
  setAgentMood: (agentId: string, mood: AgentMood, detail?: string, durationMs?: number) => void;

  // Theme state
  currentTheme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;

  // Drawer state (Isolated from canvas re-renders)
  activeDrawerAgentId: string | null;
  drawerWidth: number;
  isDrawerResizing: boolean;
  drawerCallerStack: DrawerCaller[];
  setActiveDrawerAgentId: (updater: string | null | ((current: string | null) => string | null)) => void;
  setDrawerWidth: (width: number) => void;
  setIsDrawerResizing: (resizing: boolean) => void;
  pushDrawerCaller: (caller: DrawerCaller) => void;
  popDrawerCaller: () => DrawerCaller | undefined;
  clearDrawerCallers: () => void;

  // Live streaming events (Isolated in store to prevent entire canvas re-renders)
  liveEvents: LiveLogEvent[];
  appendLiveEvent: (event: LiveLogEvent) => void;
  clearLiveEvents: () => void;

  // WebSocket event distribution
  addWsListener: (fn: (msg: any) => void) => () => void;
  broadcastWsMessage: (msg: any) => void;

  // Agents, nodes & edges
  agents: SpaceAgentEntity[];
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  setAgents: (updater: SpaceAgentEntity[] | ((prev: SpaceAgentEntity[]) => SpaceAgentEntity[])) => void;
  setNodes: (updater: CanvasNode[] | ((prev: CanvasNode[]) => CanvasNode[])) => void;
  setEdges: (updater: CanvasEdge[] | ((prev: CanvasEdge[]) => CanvasEdge[])) => void;
  onNodesChange: (changes: NodeChange<CanvasNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<CanvasEdge>[]) => void;
  updateAgentStatus: (agentId: string, status: AgentRecord['status'], lastRunAt?: string) => void;
  updateAgentCron: (agentId: string, nextRunAt?: string) => void;
  updateNodePositionLocally: (agentId: string, posX: number, posY: number) => void;

  // Thread Process visualization state
  expandedThreads: Record<string, boolean>;
  toggleThreadExpanded: (runId: string) => void;
  setThreadExpanded: (runId: string, expanded: boolean) => void;
  visibleAgentThreads: Record<string, boolean>;
  toggleAgentThreadsVisible: (agentId: string) => void;
  threadPositions: Record<string, { x: number; y: number }>;
  setThreadPosition: (threadId: string, pos: { x: number; y: number }) => void;

  // Canvas viewport & workspace-panel placement (survives page refresh)
  canvasViewport: { x: number; y: number; zoom: number } | null;
  setCanvasViewport: (v: { x: number; y: number; zoom: number }) => void;
  panelPositions: Record<string, { x: number; y: number }>;
  setPanelPosition: (spaceId: string, pos: { x: number; y: number }) => void;

  // Assets Review Thread state
  reviewedAssets: Record<string, string>;
  markAssetReviewed: (agentId: string, path: string) => void;
  markAllAssetsReviewed: (agentId: string, paths: string[]) => void;
  expandedAssetsThreads: Record<string, boolean>;
  toggleAssetsThreadExpanded: (agentId: string) => void;
  setAssetsThreadExpanded: (agentId: string, expanded: boolean) => void;
  visibleAssetsThreads: Record<string, boolean>;
  toggleAssetsThreadVisible: (agentId: string) => void;
  assetsPositions: Record<string, { x: number; y: number }>;
  setAssetsPosition: (agentId: string, pos: { x: number; y: number }) => void;
  agentUnreadAssetsCounts: Record<string, number>;
  setAgentUnreadAssetsCount: (agentId: string, count: number) => void;

  // Pod Member Card/Avatar Expanded state
  podCardExpandedAgents: Record<string, boolean>;
  setPodCardExpanded: (agentId: string, expanded: boolean) => void;

  // Voice Command Queue
  pendingVoicePrompt: { agentId: string; text: string; autoSend?: boolean; forceNewChat?: boolean } | null;
  setPendingVoicePrompt: (prompt: { agentId: string; text: string; autoSend?: boolean; forceNewChat?: boolean } | null) => void;

  // Office Spaces & Group Workspace Zones
  workspaceZones: GroupWorkspaceZone[];
  setWorkspaceZones: (zones: GroupWorkspaceZone[]) => void;
  addWorkspaceZone: (zone: Omit<GroupWorkspaceZone, 'id'> & { id?: string }) => GroupWorkspaceZone;
  updateWorkspaceZone: (id: string, updates: Partial<GroupWorkspaceZone>) => void;
  removeWorkspaceZone: (id: string) => void;

  // Hierarchical designation zones placed inside visual spaces
  roleZones: RoleZone[];
  setRoleZones: (zones: RoleZone[]) => void;
  addRoleZone: (zone: Omit<RoleZone, 'id'> & { id?: string }) => RoleZone;
  addRoleZonesBatch: (zones: (Omit<RoleZone, 'id'> & { id?: string })[]) => Promise<RoleZone[]>;
  updateRoleZone: (id: string, updates: Partial<RoleZone>) => void;
  removeRoleZone: (id: string) => void;
}

/** Determine if an agent card or pod is inside or substantially overlapping a workspace room zone */
export function isAgentInZone(
  agentX: number,
  agentY: number,
  zoneX: number,
  zoneY: number,
  zoneW: number,
  zoneH: number,
): boolean {
  // 1. Top-left corner comfortably within zone (with generous 30px boundary tolerance)
  if (
    agentX >= zoneX - 30 &&
    agentX <= zoneX + zoneW &&
    agentY >= zoneY - 30 &&
    agentY <= zoneY + zoneH
  ) {
    return true;
  }

  // 2. Pod mode center check (approx 100x80px footprint)
  const podCenterX = agentX + 60;
  const podCenterY = agentY + 50;
  if (
    podCenterX >= zoneX &&
    podCenterX <= zoneX + zoneW &&
    podCenterY >= zoneY &&
    podCenterY <= zoneY + zoneH
  ) {
    return true;
  }

  // 3. Card mode center check (approx 360x160px footprint)
  const cardCenterX = agentX + 180;
  const cardCenterY = agentY + 80;
  if (
    cardCenterX >= zoneX &&
    cardCenterX <= zoneX + zoneW &&
    cardCenterY >= zoneY &&
    cardCenterY <= zoneY + zoneH
  ) {
    return true;
  }

  // 4. Substantial 2D overlap check
  const cardW = 300;
  const cardH = 150;
  const overlapX = Math.max(0, Math.min(agentX + cardW, zoneX + zoneW) - Math.max(agentX, zoneX));
  const overlapY = Math.max(0, Math.min(agentY + cardH, zoneY + zoneH) - Math.max(agentY, zoneY));
  return overlapX * overlapY >= 4000;
}

const wsListeners = new Set<(msg: any) => void>();
const moodTimers = new Map<string, ReturnType<typeof setTimeout>>();

// State tracking for active workspace zone dragging
let activeDraggedZoneId: string | null = null;
let activeDraggedMemberIds = new Set<string>();

export const useSpaceStore = create<SpaceStoreState>((set) => ({
  // Agent dynamic moods & expressions (Per-agent live state with debounce/auto-revert)
  agentMoods: {},
  setAgentMood: (agentId, mood, detail, durationMs) => {
    const existingTimer = moodTimers.get(agentId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      moodTimers.delete(agentId);
    }

    set((state) => {
      const current = state.agentMoods[agentId];
      if (current && current.mood === mood && current.detail === detail) {
        return state;
      }
      return {
        agentMoods: {
          ...state.agentMoods,
          [agentId]: {
            mood,
            detail,
            updatedAt: Date.now(),
          },
        },
      };
    });

    if (durationMs && durationMs > 0 && mood !== 'idle') {
      const timer = setTimeout(() => {
        moodTimers.delete(agentId);
        set((state) => ({
          agentMoods: {
            ...state.agentMoods,
            [agentId]: {
              mood: 'idle',
              updatedAt: Date.now(),
            },
          },
        }));
      }, durationMs);
      moodTimers.set(agentId, timer);
    }
  },

  // WebSocket listeners
  addWsListener: (fn) => {
    wsListeners.add(fn);
    return () => {
      wsListeners.delete(fn);
    };
  },
  broadcastWsMessage: (msg) => {
    for (const fn of wsListeners) {
      try {
        fn(msg);
      } catch (err) {
        console.error('[SpaceStore] Error in WS listener:', err);
      }
    }
  },
  // Theme
  currentTheme: getInitialTheme(),
  setTheme: (theme: ThemeMode) => {
    localStorage.setItem('sm_canvas_theme', theme);
    // Suppress the site-wide `transition: all` for the swap so every token
    // doesn't animate at once (see "THEME SWITCH GUARD" in space.scss).
    const root = document.documentElement;
    root.classList.add('is-theme-switching');
    set({ currentTheme: theme });
    window.setTimeout(() => root.classList.remove('is-theme-switching'), 80);
  },

  // Drawer
  activeDrawerAgentId: null,
  drawerWidth: getInitialDrawerWidth(),
  isDrawerResizing: false,
  drawerCallerStack: [],
  setActiveDrawerAgentId: (updater) => {
    set((state) => ({
      activeDrawerAgentId: typeof updater === 'function' ? updater(state.activeDrawerAgentId) : updater,
    }));
  },
  setDrawerWidth: (width: number) => {
    const clamped = Math.max(MIN_DRAWER_WIDTH, Math.min(window.innerWidth - 60, width));
    try {
      localStorage.setItem('sm_canvas_drawer_width', String(clamped));
    } catch {}
    set({ drawerWidth: clamped });
  },
  setIsDrawerResizing: (resizing: boolean) => {
    set({ isDrawerResizing: resizing });
  },
  pushDrawerCaller: (caller) => {
    set((state) => ({
      drawerCallerStack: [...state.drawerCallerStack, caller],
    }));
  },
  popDrawerCaller: () => {
    let popped: DrawerCaller | undefined;
    set((state) => {
      if (state.drawerCallerStack.length === 0) return state;
      const next = [...state.drawerCallerStack];
      popped = next.pop();
      return { drawerCallerStack: next };
    });
    return popped;
  },
  clearDrawerCallers: () => {
    set({ drawerCallerStack: [] });
  },

  // Live streaming events
  liveEvents: [],
  appendLiveEvent: (event: LiveLogEvent) => {
    set((state) => ({
      liveEvents: [...state.liveEvents, event],
    }));
  },
  clearLiveEvents: () => {
    set({ liveEvents: [] });
  },

  // Voice Command Queue
  pendingVoicePrompt: null,
  setPendingVoicePrompt: (prompt) => {
    set({ pendingVoicePrompt: prompt });
  },

  // Agents, Nodes & Edges
  agents: [],
  nodes: [],
  edges: [],

  setAgents: (updater) => {
    set((state) => ({
      agents: typeof updater === 'function' ? updater(state.agents) : updater,
    }));
  },

  setNodes: (updater) => {
    set((state) => ({
      nodes: typeof updater === 'function' ? updater(state.nodes) : updater,
    }));
  },

  setEdges: (updater) => {
    set((state) => ({
      edges: typeof updater === 'function' ? updater(state.edges) : updater,
    }));
  },

  onNodesChange: (changes: NodeChange<CanvasNode>[]) => {
    set((state) => {
      let nextNodes = applyNodeChanges<CanvasNode>(changes, state.nodes);

      // Persist node position on drag end to backend without wiping nodes
      const nextThreadPositions = { ...state.threadPositions };
      let threadPosChanged = false;
      const nextAssetsPositions = { ...state.assetsPositions };
      let assetsPosChanged = false;
      let nextAgents = state.agents;
      let agentsChanged = false;
      let nextWorkspaceZones = state.workspaceZones;
      let workspaceZonesChanged = false;
      let nextRoleZones = state.roleZones;
      let roleZonesChanged = false;

      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          const draggedSpace = state.workspaceZones.find((z) => z.id === change.id);
          const draggedRoleZone = state.roleZones.find((z) => z.id === change.id);
          if (draggedRoleZone) {
            // Hierarchical zone drag: positioning and bounds are handled by the canvas.
            continue;
          }
          if (draggedSpace) {
            // Workspace space moved! Group move: translate all contained member agents with the room
            const prevZoneNode = state.nodes.find((n) => n.id === change.id);
            const zone = draggedSpace;
            const zoneW = zone?.width ?? 720;
            const zoneH = zone?.height ?? 520;

            if (prevZoneNode) {
              const dx = change.position.x - prevZoneNode.position.x;
              const dy = change.position.y - prevZoneNode.position.y;

              // If starting a drag, discover and lock the member agents in this pod
              if (activeDraggedZoneId !== change.id) {
                activeDraggedZoneId = change.id;
                activeDraggedMemberIds = new Set<string>();
                for (const n of state.nodes) {
                  if (
                    !n.id.startsWith('zone-') &&
                    !n.id.startsWith('rz-') &&
                    !n.id.startsWith('thread-') &&
                    !n.id.startsWith('assets-') &&
                    !n.id.startsWith('workspace-panel-') &&
                    !state.roleZones.some((z) => z.id === n.id) &&
                    !state.workspaceZones.some((z) => z.id === n.id)
                  ) {
                    if (isAgentInZone(n.position.x, n.position.y, prevZoneNode.position.x, prevZoneNode.position.y, zoneW, zoneH)) {
                      activeDraggedMemberIds.add(n.id);
                    }
                  }
                }
              }

              if (dx !== 0 || dy !== 0) {
                const roleZoneNodes = new Set(
                  nextRoleZones.filter((z) => z.spaceId === change.id).map((z) => z.id),
                );
                if (roleZoneNodes.size > 0) {
                  nextRoleZones = nextRoleZones.map((z) =>
                    roleZoneNodes.has(z.id) ? { ...z, x: z.x + dx, y: z.y + dy } : z,
                  );
                  nextNodes = nextNodes.map((n) =>
                    roleZoneNodes.has(n.id)
                      ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } }
                      : n,
                  );
                  roleZonesChanged = true;
                }

                if (activeDraggedMemberIds.size > 0) {
                  // Translate member agents and their attached thread & asset nodes
                  nextNodes = nextNodes.map((n) => {
                    if (activeDraggedMemberIds.has(n.id)) {
                      return {
                        ...n,
                        position: {
                          x: n.position.x + dx,
                          y: n.position.y + dy,
                        },
                      };
                    }
                    if (n.id.startsWith('thread-') && activeDraggedMemberIds.has((n.data as any)?.agentId)) {
                      const threadKey = n.id.replace('thread-', '');
                      const shiftedPos = {
                        x: n.position.x + dx,
                        y: n.position.y + dy,
                      };
                      nextThreadPositions[threadKey] = shiftedPos;
                      threadPosChanged = true;
                      return {
                        ...n,
                        position: shiftedPos,
                      };
                    }
                    if (n.id.startsWith('assets-') && activeDraggedMemberIds.has((n.data as any)?.agentId)) {
                      const shiftedPos = {
                        x: n.position.x + dx,
                        y: n.position.y + dy,
                      };
                      nextAssetsPositions[(n.data as any).agentId] = shiftedPos;
                      assetsPosChanged = true;
                      return {
                        ...n,
                        position: shiftedPos,
                      };
                    }
                    return n;
                  });

                  // Keep nextAgents in sync in-memory during drag
                  nextAgents = nextAgents.map((a) => {
                    if (activeDraggedMemberIds.has(a.id)) {
                      return { ...a, pos_x: a.pos_x + dx, pos_y: a.pos_y + dy };
                    }
                    return a;
                  });
                  agentsChanged = true;
                }
              }
            }

            // Drag completed or mouse released: persist positions to SQLite and localStorage
            if (change.dragging === false) {
              const { x, y } = change.position;
              nextWorkspaceZones = nextWorkspaceZones.map((z) =>
                z.id === change.id ? { ...z, x, y } : z
              );
              workspaceZonesChanged = true;

              // Collect all member agents: tracked drag members + any agents inside new zone bounds
              const finalMemberIds = new Set<string>(activeDraggedMemberIds);
              for (const n of nextNodes) {
                if (
                  !n.id.startsWith('zone-') &&
                  !n.id.startsWith('rz-') &&
                  !n.id.startsWith('thread-') &&
                  !n.id.startsWith('assets-') &&
                  !n.id.startsWith('workspace-panel-') &&
                  !state.roleZones.some((z) => z.id === n.id) &&
                  !state.workspaceZones.some((z) => z.id === n.id)
                ) {
                  if (isAgentInZone(n.position.x, n.position.y, x, y, zoneW, zoneH)) {
                    finalMemberIds.add(n.id);
                  }
                }
              }

              if (finalMemberIds.size > 0) {
                nextAgents = nextAgents.map((a) => {
                  if (finalMemberIds.has(a.id)) {
                    const agentNode = nextNodes.find((n) => n.id === a.id);
                    const finalX = agentNode?.position.x ?? a.pos_x;
                    const finalY = agentNode?.position.y ?? a.pos_y;
                    SpaceService.updateNodePosition(a.id, finalX, finalY, change.id);
                    return { ...a, pos_x: finalX, pos_y: finalY };
                  }
                  return a;
                });
                agentsChanged = true;
              }

              if (roleZonesChanged) {
                for (const z of nextRoleZones) {
                  if (z.spaceId === change.id) void SpaceService.updateZone(z.id, { x: z.x, y: z.y });
                }
              }

              // Reset active zone drag tracking
              activeDraggedZoneId = null;
              activeDraggedMemberIds.clear();
            }
          } else if (
            !change.id.startsWith('thread-') &&
            !change.id.startsWith('assets-') &&
            !change.id.startsWith('workspace-panel-')
          ) {
            // Agent position changed! Move connected thread & assets nodes by the same delta
            const prevAgentNode = state.nodes.find((n) => n.id === change.id);
            if (prevAgentNode) {
              const dx = change.position.x - prevAgentNode.position.x;
              const dy = change.position.y - prevAgentNode.position.y;

              if (dx !== 0 || dy !== 0) {
                nextNodes = nextNodes.map((n) => {
                  if (n.id.startsWith('thread-') && (n.data as any)?.agentId === change.id) {
                    const threadKey = n.id.replace('thread-', '');
                    const shiftedPos = {
                      x: n.position.x + dx,
                      y: n.position.y + dy,
                    };
                    nextThreadPositions[threadKey] = shiftedPos;
                    threadPosChanged = true;
                    return {
                      ...n,
                      position: shiftedPos,
                    };
                  }
                  if (n.id.startsWith('assets-') && (n.data as any)?.agentId === change.id) {
                    const shiftedPos = {
                      x: n.position.x + dx,
                      y: n.position.y + dy,
                    };
                    nextAssetsPositions[change.id] = shiftedPos;
                    assetsPosChanged = true;
                    return {
                      ...n,
                      position: shiftedPos,
                    };
                  }
                  return n;
                });
              }
            }

            if (change.dragging === false) {
              const { x, y } = change.position;
              nextAgents = nextAgents.map((a) => (a.id === change.id ? { ...a, pos_x: x, pos_y: y } : a));
              agentsChanged = true;
              SpaceService.updateNodePosition(change.id, x, y);
            }
          } else if (change.id.startsWith('thread-')) {
            // Individual thread node moved
            if (change.dragging === false) {
              const { x, y } = change.position;
              const threadKey = change.id.replace('thread-', '');
              nextThreadPositions[threadKey] = { x, y };
              threadPosChanged = true;
            }
          } else if (change.id.startsWith('assets-')) {
            // Individual assets node moved
            if (change.dragging === false) {
              const { x, y } = change.position;
              const agentKey = change.id.replace('assets-', '');
              nextAssetsPositions[agentKey] = { x, y };
              assetsPosChanged = true;
            }
          }
        }
      }

      if (workspaceZonesChanged) {
        saveWorkspaceZones(nextWorkspaceZones);
      }
      if (threadPosChanged) {
        savePositionMap(THREAD_POSITIONS_KEY, nextThreadPositions);
      }
      if (assetsPosChanged) {
        savePositionMap(ASSETS_POSITIONS_KEY, nextAssetsPositions);
      }

      return {
        nodes: nextNodes,
        ...(threadPosChanged ? { threadPositions: nextThreadPositions } : {}),
        ...(assetsPosChanged ? { assetsPositions: nextAssetsPositions } : {}),
        ...(workspaceZonesChanged ? { workspaceZones: nextWorkspaceZones } : {}),
        ...(roleZonesChanged ? { roleZones: nextRoleZones } : {}),
        ...(agentsChanged ? { agents: nextAgents } : {}),
      };
    });
  },

  onEdgesChange: (changes: EdgeChange<CanvasEdge>[]) => {
    set((state) => ({
      edges: applyEdgeChanges<CanvasEdge>(changes, state.edges),
    }));
  },

  // Thread Process visualization state
  expandedThreads: {},
  threadPositions: loadPositionMap(THREAD_POSITIONS_KEY),
  setThreadPosition: (threadId: string, pos: { x: number; y: number }) => {
    set((state) => {
      const next = {
        ...state.threadPositions,
        [threadId]: pos,
      };
      savePositionMap(THREAD_POSITIONS_KEY, next);
      return { threadPositions: next };
    });
  },

  // Canvas viewport & workspace-panel placement (survives page refresh)
  canvasViewport: loadCanvasViewport(),
  setCanvasViewport: (v: { x: number; y: number; zoom: number }) => {
    try {
      localStorage.setItem(CANVAS_VIEWPORT_KEY, JSON.stringify(v));
    } catch {}
    set({ canvasViewport: v });
  },
  panelPositions: loadPositionMap(PANEL_POSITIONS_KEY),
  setPanelPosition: (spaceId: string, pos: { x: number; y: number }) => {
    set((state) => {
      const next = {
        ...state.panelPositions,
        [spaceId]: pos,
      };
      savePositionMap(PANEL_POSITIONS_KEY, next);
      return { panelPositions: next };
    });
  },
  toggleThreadExpanded: (runId: string) => {
    set((state) => ({
      expandedThreads: {
        ...state.expandedThreads,
        [runId]: !state.expandedThreads[runId],
      },
    }));
  },
  setThreadExpanded: (runId: string, expanded: boolean) => {
    set((state) => ({
      expandedThreads: {
        ...state.expandedThreads,
        [runId]: expanded,
      },
    }));
  },
  visibleAgentThreads: {},
  toggleAgentThreadsVisible: (agentId: string) => {
    set((state) => ({
      visibleAgentThreads: {
        ...state.visibleAgentThreads,
        [agentId]: state.visibleAgentThreads[agentId] === false ? true : false,
      },
    }));
  },

  // Reviewed assets tracking
  reviewedAssets: loadReviewedAssets(),
  markAssetReviewed: (agentId, path) => {
    set((state) => {
      const next = {
        ...state.reviewedAssets,
        [`${agentId}:${path}`]: new Date().toISOString(),
      };
      saveReviewedAssets(next);
      return { reviewedAssets: next };
    });
  },
  markAllAssetsReviewed: (agentId, paths) => {
    set((state) => {
      const now = new Date().toISOString();
      const next = { ...state.reviewedAssets };
      paths.forEach((p) => {
        next[`${agentId}:${p}`] = now;
      });
      saveReviewedAssets(next);
      return { reviewedAssets: next };
    });
  },

  // Assets Thread visualization state
  expandedAssetsThreads: {},
  assetsPositions: loadPositionMap(ASSETS_POSITIONS_KEY),
  setAssetsPosition: (agentId, pos) => {
    set((state) => {
      const next = {
        ...state.assetsPositions,
        [agentId]: pos,
      };
      savePositionMap(ASSETS_POSITIONS_KEY, next);
      return { assetsPositions: next };
    });
  },
  toggleAssetsThreadExpanded: (agentId) => {
    set((state) => ({
      expandedAssetsThreads: {
        ...state.expandedAssetsThreads,
        [agentId]: !state.expandedAssetsThreads[agentId],
      },
    }));
  },
  setAssetsThreadExpanded: (agentId, expanded) => {
    set((state) => ({
      expandedAssetsThreads: {
        ...state.expandedAssetsThreads,
        [agentId]: expanded,
      },
    }));
  },
  visibleAssetsThreads: {},
  toggleAssetsThreadVisible: (agentId) => {
    set((state) => ({
      visibleAssetsThreads: {
        ...state.visibleAssetsThreads,
        [agentId]: state.visibleAssetsThreads[agentId] === false ? true : false,
      },
    }));
  },
  agentUnreadAssetsCounts: {},
  setAgentUnreadAssetsCount: (agentId, count) => {
    set((state) => ({
      agentUnreadAssetsCounts: {
        ...state.agentUnreadAssetsCounts,
        [agentId]: count,
      },
    }));
  },

  podCardExpandedAgents: {},
  setPodCardExpanded: (agentId, expanded) => {
    set((state) => ({
      podCardExpandedAgents: {
        ...state.podCardExpandedAgents,
        [agentId]: expanded,
      },
    }));
  },

  updateAgentStatus: (agentId: string, status: AgentRecord['status'], lastRunAt?: string) => {
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId ? { ...a, status, last_run_at: lastRunAt ?? a.last_run_at } : a,
      ),
      nodes: state.nodes.map((n) =>
        n.id === agentId && n.type === 'crabAgent'
          ? {
              ...n,
              data: {
                ...n.data,
                status,
                last_run_at: lastRunAt ?? n.data.last_run_at,
              },
            }
          : n,
      ),
    }));
  },

  updateAgentCron: (agentId: string, nextRunAt?: string) => {
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId ? { ...a, next_run_at: nextRunAt ?? a.next_run_at } : a,
      ),
      nodes: state.nodes.map((n) =>
        n.id === agentId && n.type === 'crabAgent'
          ? {
              ...n,
              data: {
                ...n.data,
                next_run_at: nextRunAt ?? n.data.next_run_at,
              },
            }
          : n,
      ),
    }));
  },

  updateNodePositionLocally: (agentId: string, posX: number, posY: number) => {
    set((state) => {
      const node = state.nodes.find((n) => n.id === agentId);
      if (!node || (Math.abs(node.position.x - posX) < 1 && Math.abs(node.position.y - posY) < 1)) {
        return state;
      }
      return {
        agents: state.agents.map((a) => (a.id === agentId ? { ...a, pos_x: posX, pos_y: posY } : a)),
        nodes: state.nodes.map((n) =>
          n.id === agentId ? { ...n, position: { x: posX, y: posY } } : n,
        ),
      };
    });
  },

  // Hierarchical designation zones (server-authoritative)
  roleZones: [],
  setRoleZones: (zones) => {
    set({ roleZones: zones.map(normalizeRoleZone) });
  },
  addRoleZone: (zone) => {
    const newZone = normalizeRoleZone({
      ...zone,
      id: zone.id || `rz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    });
    set((state) => ({ roleZones: [...state.roleZones, newZone] }));
    void SpaceService.createZone(newZone).then((saved) => {
      set((state) => ({
        roleZones: state.roleZones.map((z) => (z.id === saved.id ? normalizeRoleZone(saved) : z)),
      }));
    }).catch(() => {});
    return newZone;
  },
  addRoleZonesBatch: async (zones) => {
    const newZones = zones.map((zone) =>
      normalizeRoleZone({
        ...zone,
        id: zone.id || `rz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      }),
    );
    set((state) => ({ roleZones: [...state.roleZones, ...newZones] }));
    try {
      const savedList = await SpaceService.createZonesBatch(newZones);
      const savedMap = new Map(savedList.map((z) => [z.id, normalizeRoleZone(z)]));
      set((state) => ({
        roleZones: state.roleZones.map((z) => savedMap.get(z.id) ?? z),
      }));
      return savedList;
    } catch {
      return newZones;
    }
  },
  updateRoleZone: (id, updates) => {
    let next: RoleZone | undefined;
    set((state) => {
      const roleZones = state.roleZones.map((z) => {
        if (z.id !== id) return z;
        next = normalizeRoleZone({ ...z, ...updates });
        return next;
      });
      return { roleZones };
    });
    if (next) void SpaceService.updateZone(id, updates).catch(() => {});
  },
  removeRoleZone: (id) => {
    set((state) => ({ roleZones: state.roleZones.filter((z) => z.id !== id) }));
    void SpaceService.deleteZone(id).catch(() => {});
  },

  // Office Spaces & Group Workspace Zones
  workspaceZones: loadWorkspaceZones(),
  setWorkspaceZones: (zones) => {
    const normalized = zones.map(normalizeWorkspaceZone);
    saveWorkspaceZones(normalized);
    set({ workspaceZones: normalized });
  },
  addWorkspaceZone: (zone) => {
    const newZone = normalizeWorkspaceZone({
      ...zone,
      id: zone.id || `zone-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    });
    set((state) => {
      const next = [...state.workspaceZones, newZone];
      saveWorkspaceZones(next);
      return { workspaceZones: next };
    });
    if (newZone.workflowPrompt) {
      void SpaceService.saveWorkspacePrompt(newZone.id, newZone.name, newZone.workflowPrompt).catch(() => {});
    }
    return newZone;
  },
  updateWorkspaceZone: (id, updates) => {
    set((state) => {
      const nextZones = state.workspaceZones.map((z) => (z.id === id ? { ...z, ...updates } : z));
      saveWorkspaceZones(nextZones);
      return { workspaceZones: nextZones };
    });
    if (updates.workflowPrompt !== undefined || updates.name !== undefined) {
      const current = useSpaceStore.getState().workspaceZones.find((z) => z.id === id);
      if (current) {
        void SpaceService.saveWorkspacePrompt(current.id, current.name, current.workflowPrompt || '').catch(() => {});
      }
    }
  },
  removeWorkspaceZone: (id) => {
    set((state) => {
      const next = state.workspaceZones.filter((z) => z.id !== id);
      saveWorkspaceZones(next);
      return { workspaceZones: next };
    });
  },
}));

