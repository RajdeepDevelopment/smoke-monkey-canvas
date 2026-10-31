import React from 'react';
import {
  type EdgeProps,
  EdgeLabelRenderer,
  getSmoothStepPath,
} from '@xyflow/react';
import { edgePropsEqual } from './edge-memo.js';
import type { HierarchyEdgeData } from './space.types.js';

const HierarchyConnectionEdgeBase: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}) => {
  const edgeData = (data as unknown as HierarchyEdgeData) || {};
  const color = edgeData.color || '#8b5cf6';
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 12,
  });

  return (
    <>
      {/* Background glow when selected */}
      <path
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={selected ? 8 : 4}
        strokeOpacity={selected ? 0.25 : 0.08}
        style={{ pointerEvents: 'none', filter: `drop-shadow(0 0 6px ${color})` }}
      />
      {/* Solid crisp org-chart connector line */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={selected ? 2.6 : 2}
        strokeOpacity={selected ? 1 : 0.85}
        style={{ pointerEvents: 'none' }}
      />
      {/* Superior branch junction dot */}
      <circle cx={sourceX} cy={sourceY} r={3} fill={color} opacity={0.9} style={{ pointerEvents: 'none' }} />
      {/* Subordinate downward arrowhead */}
      <polygon
        points={`${targetX},${targetY} ${targetX - 4.5},${targetY - 7} ${targetX + 4.5},${targetY - 7}`}
        fill={color}
        opacity={0.95}
        style={{ pointerEvents: 'none' }}
      />
      {/* Reporting badge (visible when selected or hovered) */}
      {selected && (
        <EdgeLabelRenderer>
          <div
            className="hierarchy-edge-label nodrag nopan"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              borderColor: `color-mix(in srgb, ${color} 52%, hsl(var(--border)))`,
              background: `color-mix(in srgb, ${color} 18%, hsl(var(--card)))`,
              color: `color-mix(in srgb, ${color} 75%, hsl(var(--foreground)))`,
              boxShadow: `0 4px 12px rgba(0,0,0,0.35)`,
            }}
            title={edgeData.label}
          >
            <span className="hierarchy-edge-level">L{edgeData.level ?? ''}</span>
            <span>{edgeData.label || 'reports to'}</span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
export const HierarchyConnectionEdge = React.memo(HierarchyConnectionEdgeBase, edgePropsEqual);
