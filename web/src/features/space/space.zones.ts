interface ZoneGeometry {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  level?: number;
  parentZoneId?: string | null;
}

export function sortZonesByHierarchy<T extends ZoneGeometry>(zones: T[]): T[] {
  return [...zones].sort(
    (a, b) =>
      (b.level ?? 0) - (a.level ?? 0) ||
      a.width * a.height - b.width * b.height,
  );
}

export function resolveZoneAt<T extends ZoneGeometry>(
  x: number,
  y: number,
  zones: T[],
): T | null {
  const matches = zones.filter((zone) => zoneContainsPoint(zone, x, y));
  if (matches.length === 0) return null;
  matches.sort(
    (a, b) =>
      (b.level ?? 0) - (a.level ?? 0) ||
      a.width * a.height - b.width * b.height,
  );
  return matches[0];
}

export function getZoneAncestors<T extends ZoneGeometry>(
  zone: T,
  zones: T[],
): T[] {
  const byId = new Map(zones.map((z) => [z.id, z]));
  const ancestors: T[] = [];
  const visited = new Set<string>([zone.id]);
  let current = zone.parentZoneId ? byId.get(zone.parentZoneId) : undefined;
  while (current && !visited.has(current.id)) {
    ancestors.push(current);
    visited.add(current.id);
    current = current.parentZoneId ? byId.get(current.parentZoneId) : undefined;
  }
  return ancestors;
}

export function getZoneDescendants<T extends ZoneGeometry>(
  zoneId: string,
  zones: T[],
): T[] {
  const descendants: T[] = [];
  const visited = new Set<string>([zoneId]);
  const stack = [zoneId];
  while (stack.length > 0) {
    const currentId = stack.pop()!;
    for (const zone of zones) {
      if (zone.parentZoneId !== currentId || visited.has(zone.id)) continue;
      visited.add(zone.id);
      descendants.push(zone);
      stack.push(zone.id);
    }
  }
  return descendants;
}

export function findNearestAncestorWithMembers<T extends ZoneGeometry>(
  zone: T,
  zones: T[],
  agents: Array<{ id: string; pos_x: number; pos_y: number }>,
): T | null {
  const agentIds = new Set(agents.map((agent) => agent.id));
  for (const ancestor of getZoneAncestors(zone, zones)) {
    const hasMember = agents.some((agent) => {
      const resolved = resolveZoneAt(agent.pos_x, agent.pos_y, zones);
      return resolved?.id === ancestor.id && agentIds.has(agent.id);
    });
    if (hasMember) return ancestor;
  }
  return null;
}

export function zoneContainsPoint(zone: ZoneGeometry, x: number, y: number): boolean {
  // 1. Direct point inside zone with 24px boundary tolerance
  const pad = 24;
  if (
    x >= zone.x - pad &&
    x <= zone.x + zone.width + pad &&
    y >= zone.y - pad &&
    y <= zone.y + zone.height + pad
  ) {
    return true;
  }

  // 2. Avatar or card center footprint check
  const centerX = x + 100;
  const centerY = y + 80;
  return (
    centerX >= zone.x &&
    centerX <= zone.x + zone.width &&
    centerY >= zone.y &&
    centerY <= zone.y + zone.height
  );
}
