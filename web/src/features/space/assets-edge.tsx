import React from 'react';
import {
  type EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
} from '@xyflow/react';
import { Sparkles } from 'lucide-react';
import { type AssetsEdgeData, CONNECTOR_EDGE_Z } from './space.types.js';

export const AssetsConnectionEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}) => {
  const edgeData = (data as unknown as AssetsEdgeData) || { unreadCount: 0, totalCount: 0 };
  const unreadCount = edgeData.unreadCount || 0;
  const hasUnread = unreadCount > 0;

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.35,
  });

  // Assets theme: Violet / Purple
  const strokeColor = hasUnread ? '#a855f7' : '#8b5cf6';

  return (
    <>
      {/* Background glow stroke */}
      <path
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={hasUnread ? 8 : 4}
        strokeOpacity={hasUnread ? 0.28 : 0.12}
        style={{
          filter: hasUnread ? `drop-shadow(0 0 8px ${strokeColor})` : undefined,
          transition: 'all 0.3s ease',
        }}
      />

      {/* Main Connection Edge */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth: hasUnread ? 2.5 : 2,
          strokeDasharray: hasUnread ? '5, 5' : undefined,
          animation: hasUnread ? 'threadDashFlow 1.6s linear infinite' : undefined,
          transition: 'stroke 0.3s ease',
        }}
      />

      {/* Glowing Particle when there are unread deliverables */}
      {hasUnread && (
        <circle r="4" fill={strokeColor} style={{ filter: `drop-shadow(0 0 6px ${strokeColor})` }}>
          <animateMotion dur="2.8s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}

      {/* Clickable Badge on the Edge (Only when unread deliverables exist, offset towards target node to avoid avatar overlap) */}
      {hasUnread && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              zIndex: CONNECTOR_EDGE_Z,
              transform: `translate(-50%, -50%) translate(${sourceX + (targetX - sourceX) * 0.65}px,${sourceY + (targetY - sourceY) * 0.65}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <button
              type="button"
              className={`thread-edge-pill assets-edge-pill has-unread ${edgeData.isExpanded ? 'expanded' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                edgeData.onEdgeClick?.();
              }}
              title={`${unreadCount} unread deliverables await review. Click to inspect.`}
            >
              <span className="thread-pill-pulse-dot" style={{ backgroundColor: '#c084fc' }} />
              <span className="thread-pill-text">
                Deliverables ({unreadCount})
              </span>
              <Sparkles size={10} className="thread-pill-act-icon" />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
