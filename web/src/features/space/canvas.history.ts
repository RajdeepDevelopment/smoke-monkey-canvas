import { useSyncExternalStore } from 'react';
import type { SpaceAgentEntity, AgentConnectionRecord } from '../agent/agent.types.js';
import type { GroupWorkspaceZone, RoleZone } from './space.types.js';
import { SpaceService } from './space.service.js';
import { AgentService } from '../agent/agent.service.js';
import { useSpaceStore } from './space.store.js';
import { CanvasPositionSync } from './canvas.sync.js';

export type CanvasAction =
  | {
      type: 'MOVE_NODES';
      description: string;
      before: Array<{ id: string; posX: number; posY: number; spaceId?: string | null }>;
      after: Array<{ id: string; posX: number; posY: number; spaceId?: string | null }>;
    }
  | {
      type: 'MOVE_SPACE';
      description: string;
      spaceId: string;
      before: { x: number; y: number };
      after: { x: number; y: number };
      agentsBefore?: Array<{ id: string; posX: number; posY: number; spaceId?: string | null }>;
      agentsAfter?: Array<{ id: string; posX: number; posY: number; spaceId?: string | null }>;
      roleZonesBefore?: Array<{ id: string; x: number; y: number }>;
      roleZonesAfter?: Array<{ id: string; x: number; y: number }>;
    }
  | {
      type: 'RESIZE_SPACE';
      description: string;
      spaceId: string;
      before: { width: number; height: number; x?: number; y?: number };
      after: { width: number; height: number; x?: number; y?: number };
    }
  | {
      type: 'ADD_SPACE';
      description: string;
      space: GroupWorkspaceZone;
    }
  | {
      type: 'DELETE_SPACE';
      description: string;
      space: GroupWorkspaceZone;
      roleZones?: RoleZone[];
      zonesDeleted?: boolean;
      agents?: SpaceAgentEntity[];
      deleteAgentFiles?: boolean;
      memberAgents?: Array<{ id: string; posX: number; posY: number; spaceId?: string | null }>;
    }
  | {
      type: 'MOVE_ROLE_ZONE';
      description: string;
      zoneId: string;
      before: { x: number; y: number; spaceId?: string | null };
      after: { x: number; y: number; spaceId?: string | null };
      subtreeBefore?: Array<{ id: string; x: number; y: number }>;
      subtreeAfter?: Array<{ id: string; x: number; y: number }>;
      agentsBefore?: Array<{ id: string; posX: number; posY: number; spaceId?: string | null }>;
      agentsAfter?: Array<{ id: string; posX: number; posY: number; spaceId?: string | null }>;
    }
  | {
      type: 'RESIZE_ROLE_ZONE';
      description: string;
      zoneId: string;
      before: { width: number; height: number; x: number; y: number };
      after: { width: number; height: number; x: number; y: number };
    }
  | {
      type: 'ADD_ROLE_ZONE';
      description: string;
      zone: RoleZone;
    }
  | {
      type: 'DELETE_ROLE_ZONE';
      description: string;
      zone: RoleZone;
    }
  | {
      type: 'ADD_AGENT';
      description: string;
      agent: SpaceAgentEntity;
    }
  | {
      type: 'DELETE_AGENT';
      description: string;
      agent: SpaceAgentEntity;
      connections?: AgentConnectionRecord[];
    }
  | {
      type: 'ADD_CONNECTION';
      description: string;
      connection: AgentConnectionRecord;
    }
  | {
      type: 'DELETE_CONNECTION';
      description: string;
      connection: AgentConnectionRecord;
    }
  | {
      type: 'BATCH';
      description: string;
      actions: CanvasAction[];
    };

const MAX_HISTORY_STEPS = 50;

export interface HistorySnapshot {
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
  lastUndoAction: CanvasAction | null;
  lastRedoAction: CanvasAction | null;
}

const INITIAL_SNAPSHOT: HistorySnapshot = {
  canUndo: false,
  canRedo: false,
  undoCount: 0,
  redoCount: 0,
  lastUndoAction: null,
  lastRedoAction: null,
};

class CanvasHistoryManager {
  private undoStack: CanvasAction[] = [];
  private redoStack: CanvasAction[] = [];
  private listeners = new Set<() => void>();
  private isExecuting = false;
  private currentSnapshot: HistorySnapshot = INITIAL_SNAPSHOT;

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private updateSnapshot(): void {
    this.currentSnapshot = {
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      lastUndoAction: this.undoStack[this.undoStack.length - 1] ?? null,
      lastRedoAction: this.redoStack[this.redoStack.length - 1] ?? null,
    };
  }

  public getSnapshot = (): HistorySnapshot => {
    return this.currentSnapshot;
  };

  private notify(): void {
    this.updateSnapshot();
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('[CanvasHistory] Listener error:', err);
      }
    }
  }

  public get canUndo(): boolean {
    return this.currentSnapshot.canUndo;
  }

  public get canRedo(): boolean {
    return this.currentSnapshot.canRedo;
  }

  public get undoCount(): number {
    return this.currentSnapshot.undoCount;
  }

  public get redoCount(): number {
    return this.currentSnapshot.redoCount;
  }

  public get lastUndoAction(): CanvasAction | null {
    return this.currentSnapshot.lastUndoAction;
  }

  public get lastRedoAction(): CanvasAction | null {
    return this.currentSnapshot.lastRedoAction;
  }

  /**
   * Push an action to the history stack and clear the redo stack.
   */
  public push(action: CanvasAction): void {
    if (this.isExecuting) return; // Do not record actions triggered by undo/redo itself
    this.undoStack.push(action);
    if (this.undoStack.length > MAX_HISTORY_STEPS) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.notify();
  }

  /**
   * Clear all history stacks.
   */
  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }

  /**
   * Execute an undo step.
   * Returns a description string of what was undone, or null if nothing to undo.
   */
  public async undo(
    refreshSpace?: () => Promise<void>,
    setConnections?: (updater: (prev: AgentConnectionRecord[]) => AgentConnectionRecord[]) => void,
    setAgents?: (updater: (prev: SpaceAgentEntity[]) => SpaceAgentEntity[]) => void,
  ): Promise<string | null> {
    if (!this.canUndo || this.isExecuting) return null;
    const action = this.undoStack[this.undoStack.length - 1];
    if (!action) return null;
    this.isExecuting = true;

    try {
      await this.applyAction(action, 'undo', refreshSpace, setConnections, setAgents);
      this.undoStack.pop();
      this.redoStack.push(action);
      this.notify();
      return action.description;
    } catch (err) {
      console.error('[CanvasHistory] Undo failed:', err);
      return null;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Execute a redo step.
   * Returns a description string of what was redone, or null if nothing to redo.
   */
  public async redo(
    refreshSpace?: () => Promise<void>,
    setConnections?: (updater: (prev: AgentConnectionRecord[]) => AgentConnectionRecord[]) => void,
    setAgents?: (updater: (prev: SpaceAgentEntity[]) => SpaceAgentEntity[]) => void,
  ): Promise<string | null> {
    if (!this.canRedo || this.isExecuting) return null;
    const action = this.redoStack[this.redoStack.length - 1];
    if (!action) return null;
    this.isExecuting = true;

    try {
      await this.applyAction(action, 'redo', refreshSpace, setConnections, setAgents);
      this.redoStack.pop();
      this.undoStack.push(action);
      this.notify();
      return action.description;
    } catch (err) {
      console.error('[CanvasHistory] Redo failed:', err);
      return null;
    } finally {
      this.isExecuting = false;
    }
  }

  private async applyAction(
    action: CanvasAction,
    direction: 'undo' | 'redo',
    refreshSpace?: () => Promise<void>,
    setConnections?: (updater: (prev: AgentConnectionRecord[]) => AgentConnectionRecord[]) => void,
    setAgents?: (updater: (prev: SpaceAgentEntity[]) => SpaceAgentEntity[]) => void,
  ): Promise<void> {
    const store = useSpaceStore.getState();

    switch (action.type) {
      case 'MOVE_NODES': {
        const targetPositions = direction === 'undo' ? action.before : action.after;
        for (const p of targetPositions) {
          store.updateNodePositionLocally(p.id, p.posX, p.posY);
        }
        CanvasPositionSync.queueNodePositionsBatch(targetPositions, true);
        break;
      }

      case 'MOVE_SPACE': {
        const targetPos = direction === 'undo' ? action.before : action.after;
        store.updateWorkspaceZone(action.spaceId, { x: targetPos.x, y: targetPos.y });

        const agents = direction === 'undo' ? action.agentsBefore : action.agentsAfter;
        if (agents && agents.length > 0) {
          for (const a of agents) {
            store.updateNodePositionLocally(a.id, a.posX, a.posY);
          }
          CanvasPositionSync.queueNodePositionsBatch(agents, true);
        }

        const roleZones = direction === 'undo' ? action.roleZonesBefore : action.roleZonesAfter;
        if (roleZones && roleZones.length > 0) {
          for (const rz of roleZones) {
            store.updateRoleZone(rz.id, { x: rz.x, y: rz.y });
          }
        }
        break;
      }

      case 'RESIZE_SPACE': {
        const target = direction === 'undo' ? action.before : action.after;
        store.updateWorkspaceZone(action.spaceId, target);
        break;
      }

      case 'ADD_SPACE': {
        if (direction === 'undo') {
          await SpaceService.deleteWorkspaceSpace(action.space.id);
          store.setWorkspaceZones(store.workspaceZones.filter((z) => z.id !== action.space.id));
        } else {
          const restored = await SpaceService.createWorkspaceSpace(action.space);
          store.setWorkspaceZones([...store.workspaceZones.filter((z) => z.id !== restored.id), restored]);
          if (action.space.workflowPrompt) {
            try {
              await SpaceService.saveWorkspacePrompt(restored.id, restored.name, action.space.workflowPrompt);
            } catch (err) {
              console.warn('[CanvasHistory] Failed to restore workspace prompt:', err);
            }
          }
        }
        break;
      }

      case 'DELETE_SPACE': {
        if (direction === 'undo') {
          const restoredSpace = await SpaceService.createWorkspaceSpace(action.space);
          store.setWorkspaceZones([...store.workspaceZones.filter((z) => z.id !== restoredSpace.id), restoredSpace]);
          if (action.space.workflowPrompt) {
            try {
              await SpaceService.saveWorkspacePrompt(
                restoredSpace.id,
                restoredSpace.name,
                action.space.workflowPrompt,
              );
            } catch (err) {
              console.warn('[CanvasHistory] Failed to restore workspace prompt:', err);
            }
          }
          if (action.roleZones && action.roleZones.length > 0) {
            if (action.zonesDeleted === false) {
              const reattached: RoleZone[] = [];
              for (const rz of action.roleZones) {
                const updated = await SpaceService.updateZone(rz.id, { spaceId: restoredSpace.id });
                reattached.push(updated);
              }
              const reattachedIds = new Set(reattached.map((z) => z.id));
              store.setRoleZones([...store.roleZones.filter((z) => !reattachedIds.has(z.id)), ...reattached]);
            } else {
              const restoredZones: RoleZone[] = [];
              const zonesByLevel = [...action.roleZones].sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
              for (const rz of zonesByLevel) {
                restoredZones.push(await SpaceService.createZone(rz));
              }
              const restoredIds = new Set(restoredZones.map((z) => z.id));
              store.setRoleZones([...store.roleZones.filter((z) => !restoredIds.has(z.id)), ...restoredZones]);
            }
          }
          if (action.agents && action.agents.length > 0) {
            const restoredAgents: SpaceAgentEntity[] = [];
            for (const ag of action.agents) {
              try {
                restoredAgents.push(await AgentService.createAgent(ag));
              } catch (err) {
                console.warn(`[CanvasHistory] Failed to restore agent ${ag.id}:`, err);
              }
            }
            if (restoredAgents.length > 0 && setAgents) {
              const restoredIds = new Set(restoredAgents.map((a) => a.id));
              setAgents((prev) => [...prev.filter((a) => !restoredIds.has(a.id)), ...restoredAgents]);
            }
          }
          if (action.memberAgents && action.memberAgents.length > 0) {
            for (const ma of action.memberAgents) {
              store.updateNodePositionLocally(ma.id, ma.posX, ma.posY);
            }
            CanvasPositionSync.queueNodePositionsBatch(action.memberAgents, true);
            try {
              await SpaceService.setWorkspaceAgents(restoredSpace.id, action.memberAgents.map((ma) => ma.id));
            } catch (err) {
              console.warn('[CanvasHistory] Failed to restore space agent memberships:', err);
            }
          }
        } else {
          await SpaceService.deleteWorkspaceSpace(
            action.space.id,
            action.zonesDeleted === false ? { deleteZones: false } : undefined,
          );
          if (action.zonesDeleted === false && action.roleZones && action.roleZones.length > 0) {
            const detachedIds = new Set(action.roleZones.map((z) => z.id));
            store.setRoleZones(
              store.roleZones.map((z) => (detachedIds.has(z.id) ? { ...z, spaceId: null } : z)),
            );
          } else {
            const removedZoneIds = new Set((action.roleZones || []).map((z) => z.id));
            store.setRoleZones(store.roleZones.filter((z) => !removedZoneIds.has(z.id)));
          }
          store.setWorkspaceZones(store.workspaceZones.filter((z) => z.id !== action.space.id));
          if (action.agents && action.agents.length > 0) {
            const removedAgentIds = new Set(action.agents.map((a) => a.id));
            for (const ag of action.agents) {
              await AgentService.deleteAgent(ag.id, { deleteFiles: action.deleteAgentFiles }).catch((err) => {
                console.warn(`[CanvasHistory] Failed to re-delete agent ${ag.id}:`, err);
              });
            }
            setAgents?.((prev) => prev.filter((a) => !removedAgentIds.has(a.id)));
          }
        }
        break;
      }

      case 'MOVE_ROLE_ZONE': {
        const target = direction === 'undo' ? action.before : action.after;
        store.updateRoleZone(action.zoneId, target);

        const subtree = direction === 'undo' ? action.subtreeBefore : action.subtreeAfter;
        if (subtree && subtree.length > 0) {
          for (const cz of subtree) {
            store.updateRoleZone(cz.id, { x: cz.x, y: cz.y });
          }
        }

        const agents = direction === 'undo' ? action.agentsBefore : action.agentsAfter;
        if (agents && agents.length > 0) {
          for (const a of agents) {
            store.updateNodePositionLocally(a.id, a.posX, a.posY);
          }
          CanvasPositionSync.queueNodePositionsBatch(agents, true);
        }
        break;
      }

      case 'RESIZE_ROLE_ZONE': {
        const target = direction === 'undo' ? action.before : action.after;
        store.updateRoleZone(action.zoneId, target);
        break;
      }

      case 'ADD_ROLE_ZONE': {
        if (direction === 'undo') {
          await SpaceService.deleteZone(action.zone.id);
          store.setRoleZones(store.roleZones.filter((z) => z.id !== action.zone.id));
        } else {
          const restored = await SpaceService.createZone(action.zone);
          store.setRoleZones([...store.roleZones.filter((z) => z.id !== restored.id), restored]);
        }
        break;
      }

      case 'DELETE_ROLE_ZONE': {
        if (direction === 'undo') {
          const restored = await SpaceService.createZone(action.zone);
          store.setRoleZones([...store.roleZones.filter((z) => z.id !== restored.id), restored]);
        } else {
          await SpaceService.deleteZone(action.zone.id);
          store.setRoleZones(store.roleZones.filter((z) => z.id !== action.zone.id));
        }
        break;
      }

      case 'ADD_AGENT': {
        if (direction === 'undo') {
          await AgentService.deleteAgent(action.agent.id);
          if (setAgents) {
            setAgents((prev) => prev.filter((a) => a.id !== action.agent.id));
          }
          if (refreshSpace) await refreshSpace().catch(() => {});
        } else {
          const restored = await AgentService.createAgent(action.agent);
          if (setAgents) {
            setAgents((prev) => [...prev.filter((a) => a.id !== restored.id), restored as SpaceAgentEntity]);
          }
          if (refreshSpace) await refreshSpace().catch(() => {});
        }
        break;
      }

      case 'DELETE_AGENT': {
        if (direction === 'undo') {
          const restored = await AgentService.createAgent(action.agent);
          if (setAgents) {
            setAgents((prev) => [...prev.filter((a) => a.id !== restored.id), restored as SpaceAgentEntity]);
          }
          if (action.connections && action.connections.length > 0) {
            for (const c of action.connections) {
              await AgentService.createConnection(c.source_agent_id, c.target_agent_id).catch((err) => {
                console.warn('[CanvasHistory] Failed to restore agent connection:', err);
              });
            }
          }
          if (refreshSpace) await refreshSpace().catch(() => {});
        } else {
          await AgentService.deleteAgent(action.agent.id);
          if (setAgents) {
            setAgents((prev) => prev.filter((a) => a.id !== action.agent.id));
          }
          if (refreshSpace) await refreshSpace().catch(() => {});
        }
        break;
      }

      case 'ADD_CONNECTION': {
        if (direction === 'undo') {
          await AgentService.deleteConnection(action.connection.id);
          if (setConnections) {
            setConnections((prev) => prev.filter((c) => c.id !== action.connection.id));
          }
        } else {
          const restored = await AgentService.createConnection(
            action.connection.source_agent_id,
            action.connection.target_agent_id,
          );
          if (setConnections) {
            setConnections((prev) => [...prev.filter((c) => c.id !== restored.id), restored]);
          }
        }
        break;
      }

      case 'DELETE_CONNECTION': {
        if (direction === 'undo') {
          const restored = await AgentService.createConnection(
            action.connection.source_agent_id,
            action.connection.target_agent_id,
          );
          if (setConnections) {
            setConnections((prev) => [...prev.filter((c) => c.id !== restored.id), restored]);
          }
        } else {
          await AgentService.deleteConnection(action.connection.id);
          if (setConnections) {
            setConnections((prev) => prev.filter((c) => c.id !== action.connection.id));
          }
        }
        break;
      }

      case 'BATCH': {
        const subActions =
          direction === 'undo' ? [...action.actions].reverse() : action.actions;
        for (const sub of subActions) {
          await this.applyAction(sub, direction, refreshSpace, setConnections, setAgents);
        }
        break;
      }
    }
  }
}

export const CanvasHistory = new CanvasHistoryManager();

/**
 * React hook to subscribe to CanvasHistory changes.
 */
export function useCanvasHistoryState(): HistorySnapshot {
  return useSyncExternalStore(
    CanvasHistory.subscribe,
    CanvasHistory.getSnapshot,
    CanvasHistory.getSnapshot,
  );
}
