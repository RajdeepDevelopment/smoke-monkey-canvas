import { SpaceService } from './space.service.js';
import type { GroupWorkspaceZone, RoleZone } from './space.types.js';

interface NodePositionDelta {
  id: string;
  posX: number;
  posY: number;
  spaceId?: string | null;
}

class CanvasPositionSyncManager {
  private pendingNodes = new Map<string, NodePositionDelta>();
  private pendingSpaces = new Map<string, Partial<GroupWorkspaceZone>>();
  private pendingRoleZones = new Map<string, Partial<RoleZone>>();
  private pendingViewport: { x: number; y: number; zoom: number } | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly debounceMs = 600;

  /**
   * Queue a canvas viewport update ({x, y, zoom}) to be synced to the backend.
   */
  queueViewportUpdate(
    viewport: { x: number; y: number; zoom: number },
    flushNow = false,
  ): void {
    this.pendingViewport = {
      x: Math.round(viewport.x * 100) / 100,
      y: Math.round(viewport.y * 100) / 100,
      zoom: Math.round(viewport.zoom * 1000) / 1000,
    };
    if (flushNow) {
      this.flush();
    } else {
      this.scheduleDebounce();
    }
  }

  /**
   * Queue an agent node position change to be flushed with debounce.
   * If flushNow is true (e.g. on drag stop), sends immediately.
   */
  queueNodePosition(
    id: string,
    posX: number,
    posY: number,
    spaceId?: string | null,
    flushNow = false,
  ): void {
    const roundedX = Math.round(posX);
    const roundedY = Math.round(posY);
    this.pendingNodes.set(id, {
      id,
      posX: roundedX,
      posY: roundedY,
      ...(spaceId !== undefined ? { spaceId } : {}),
    });

    if (flushNow) {
      this.flush();
    } else {
      this.scheduleDebounce();
    }
  }

  /**
   * Queue multiple agent node positions (e.g. when moving a containing pod).
   */
  queueNodePositionsBatch(
    positions: NodePositionDelta[],
    flushNow = false,
  ): void {
    for (const p of positions) {
      this.pendingNodes.set(p.id, {
        id: p.id,
        posX: Math.round(p.posX),
        posY: Math.round(p.posY),
        ...(p.spaceId !== undefined ? { spaceId: p.spaceId } : {}),
      });
    }

    if (flushNow) {
      this.flush();
    } else {
      this.scheduleDebounce();
    }
  }

  /**
   * Queue a workspace room / pod position/size update.
   */
  queueSpaceUpdate(
    id: string,
    updates: Partial<GroupWorkspaceZone>,
    flushNow = false,
  ): void {
    const existing = this.pendingSpaces.get(id) || {};
    this.pendingSpaces.set(id, { ...existing, ...updates });

    if (flushNow) {
      this.flush();
    } else {
      this.scheduleDebounce();
    }
  }

  /**
   * Queue a role zone position/size update.
   */
  queueRoleZoneUpdate(
    id: string,
    updates: Partial<RoleZone>,
    flushNow = false,
  ): void {
    const existing = this.pendingRoleZones.get(id) || {};
    this.pendingRoleZones.set(id, { ...existing, ...updates });

    if (flushNow) {
      this.flush();
    } else {
      this.scheduleDebounce();
    }
  }

  private scheduleDebounce(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.flush();
    }, this.debounceMs);
  }

  /**
   * Immediately send all accumulated deltas to the backend database.
   */
  flush(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // 1. Flush Node Positions
    if (this.pendingNodes.size > 0) {
      const deltas = Array.from(this.pendingNodes.values());
      this.pendingNodes.clear();
      SpaceService.updateNodePositionsBatch(deltas).catch((err) => {
        console.warn('[CanvasSync] Failed to persist node positions:', err);
      });
    }

    // 2. Flush Workspace Spaces
    if (this.pendingSpaces.size > 0) {
      const spaceDeltas = Array.from(this.pendingSpaces.entries());
      this.pendingSpaces.clear();
      for (const [id, updates] of spaceDeltas) {
        SpaceService.updateWorkspaceSpace(id, updates).catch((err) => {
          console.warn(`[CanvasSync] Failed to persist workspace space ${id}:`, err);
        });
      }
    }

    // 3. Flush Role Zones
    if (this.pendingRoleZones.size > 0) {
      const zoneDeltas = Array.from(this.pendingRoleZones.entries());
      this.pendingRoleZones.clear();
      for (const [id, updates] of zoneDeltas) {
        SpaceService.updateZone(id, updates).catch((err) => {
          console.warn(`[CanvasSync] Failed to persist role zone ${id}:`, err);
        });
      }
    }

    // 4. Flush Viewport
    if (this.pendingViewport) {
      const vp = this.pendingViewport;
      this.pendingViewport = null;
      SpaceService.updateCanvasViewport(vp).catch((err) => {
        console.warn('[CanvasSync] Failed to persist canvas viewport:', err);
      });
    }
  }
}

export const CanvasPositionSync = new CanvasPositionSyncManager();

// Flush any debounced geometry changes before the tab goes away. Without this a
// quick refresh/close inside the debounce window silently loses the last drag.
if (typeof window !== 'undefined') {
  const flushPending = () => CanvasPositionSync.flush();
  window.addEventListener('pagehide', flushPending);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPending();
  });
}
