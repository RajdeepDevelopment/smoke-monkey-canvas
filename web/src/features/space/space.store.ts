import { create } from 'zustand';
import { applyNodeChanges, type NodeChange } from '@xyflow/react';
import type { SpaceAgentEntity, AgentRecord, LiveLogEvent } from '../agent/agent.types.js';
import type { AgentNode } from './space.types.js';
import type { ThemeMode } from './space.toolbar.js';
import { SpaceService } from './space.service.js';

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

export interface SpaceStoreState {
  // Theme state
  currentTheme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;

  // Drawer state (Isolated from canvas re-renders)
  activeDrawerAgentId: string | null;
  drawerWidth: number;
  isDrawerResizing: boolean;
  setActiveDrawerAgentId: (updater: string | null | ((current: string | null) => string | null)) => void;
  setDrawerWidth: (width: number) => void;
  setIsDrawerResizing: (resizing: boolean) => void;

  // Live streaming events (Isolated in store to prevent entire canvas re-renders)
  liveEvents: LiveLogEvent[];
  appendLiveEvent: (event: LiveLogEvent) => void;
  clearLiveEvents: () => void;

  // WebSocket event distribution
  addWsListener: (fn: (msg: any) => void) => () => void;
  broadcastWsMessage: (msg: any) => void;

  // Agents & nodes
  agents: SpaceAgentEntity[];
  nodes: AgentNode[];
  setAgents: (updater: SpaceAgentEntity[] | ((prev: SpaceAgentEntity[]) => SpaceAgentEntity[])) => void;
  setNodes: (updater: AgentNode[] | ((prev: AgentNode[]) => AgentNode[])) => void;
  onNodesChange: (changes: NodeChange<AgentNode>[]) => void;
  updateAgentStatus: (agentId: string, status: AgentRecord['status'], lastRunAt?: string) => void;
  updateAgentCron: (agentId: string, nextRunAt?: string) => void;
  updateNodePositionLocally: (agentId: string, posX: number, posY: number) => void;

  // Voice Command Queue
  pendingVoicePrompt: { agentId: string; text: string; autoSend?: boolean; forceNewChat?: boolean } | null;
  setPendingVoicePrompt: (prompt: { agentId: string; text: string; autoSend?: boolean; forceNewChat?: boolean } | null) => void;
}

const wsListeners = new Set<(msg: any) => void>();

export const useSpaceStore = create<SpaceStoreState>((set) => ({
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
    set({ currentTheme: theme });
  },

  // Drawer
  activeDrawerAgentId: null,
  drawerWidth: getInitialDrawerWidth(),
  isDrawerResizing: false,
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

  // Agents & Nodes
  agents: [],
  nodes: [],

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

  onNodesChange: (changes: NodeChange<AgentNode>[]) => {
    set((state) => {
      const nextNodes = applyNodeChanges<AgentNode>(changes, state.nodes);

      // Persist node position on drag end to backend without wiping nodes
      for (const change of changes) {
        if (change.type === 'position' && change.position && change.dragging === false) {
          const { x, y } = change.position;
          SpaceService.updateNodePosition(change.id, x, y);
        }
      }

      return { nodes: nextNodes };
    });
  },

  updateAgentStatus: (agentId: string, status: AgentRecord['status'], lastRunAt?: string) => {
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId ? { ...a, status, last_run_at: lastRunAt ?? a.last_run_at } : a,
      ),
      nodes: state.nodes.map((n) =>
        n.id === agentId
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
        n.id === agentId
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
}));
