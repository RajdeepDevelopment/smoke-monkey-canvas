import type { EdgeProps } from '@xyflow/react';

function edgeDataEqual(
  prev: Record<string, unknown> | undefined,
  next: Record<string, unknown> | undefined,
) {
  if (prev === next) return true;
  if (!prev || !next) return false;
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const key of keys) {
    const prevValue = prev[key];
    const nextValue = next[key];
    if (typeof prevValue === 'function' || typeof nextValue === 'function') continue;
    if (prevValue !== nextValue) return false;
  }
  return true;
}

export function edgePropsEqual(prev: EdgeProps, next: EdgeProps) {
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const key of keys) {
    if (key === 'data') continue;
    const prevValue = (prev as Record<string, unknown>)[key];
    const nextValue = (next as Record<string, unknown>)[key];
    if (typeof prevValue === 'function' || typeof nextValue === 'function') continue;
    if (prevValue !== nextValue) return false;
  }
  return edgeDataEqual(
    prev.data as Record<string, unknown> | undefined,
    next.data as Record<string, unknown> | undefined,
  );
}
