import React from 'react';
import {
  type EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
} from '@xyflow/react';
import { edgePropsEqual } from './edge-memo.js';
import { Activity, Clock, MessageSquare, Zap } from 'lucide-react';
import { CONNECTOR_EDGE_Z } from './space.types.js';

export interface ThreadEdgeData {
  [key: string]: unknown;
  status: 'running' | 'completed' | 'failed';
  triggerType?: 'cron' | 'manual' | 'chat';
  title?: string;
  isExpanded?: boolean;
  onEdgeClick?: () => void;
}

const ThreadConnectionEdgeBase: React.FC<EdgeProps> = ({
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
  const edgeData = (data ?? {}) as Partial<ThreadEdgeData>;
  const isRunning = edgeData.status === 'running';
  const isFailed = edgeData.status === 'failed';
  const triggerType = edgeData.triggerType || 'manual';

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.35,
  });

  // Edge coloring based on state
  const strokeColor = isRunning
    ? triggerType === 'cron'
      ? '#f59e0b' // Amber for cron
      : '#38bdf8' // Cyan for active run
    : isFailed
      ? '#ef4444' // Red for failed
      : '#10b981'; // Emerald for completed

  const TriggerIcon =
    triggerType === 'cron'
      ? Clock
      : triggerType === 'chat'
        ? MessageSquare
        : Zap;

  return (
    <>
      {/* Background glow stroke */}
      <path
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={isRunning ? 8 : 4}
        strokeOpacity={isRunning ? 0.25 : 0.12}
        style={{
          filter: isRunning ? `drop-shadow(0 0 8px ${strokeColor})` : undefined,
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
          strokeWidth: isRunning ? 2.5 : 2,
          strokeDasharray: isRunning ? '6, 6' : undefined,
          animation: isRunning ? 'threadDashFlow 1.2s linear infinite' : undefined,
          transition: 'stroke 0.3s ease',
        }}
      />

      {/* Glowing Particle when active */}
      {isRunning && (
        <circle r="4" fill={strokeColor} style={{ filter: `drop-shadow(0 0 6px ${strokeColor})` }}>
          <animateMotion dur="2.4s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}

      {/* Clickable Badge on the Edge (Only when running or expanded, offset towards target thread to prevent avatar collision) */}
      {(isRunning || edgeData.isExpanded) && (
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
              className={`thread-edge-pill ${isRunning ? 'running' : ''} ${edgeData.isExpanded ? 'expanded' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                edgeData.onEdgeClick?.();
              }}
              title={
                isRunning
                  ? `Active thread: ${triggerType === 'cron' ? 'Cron Execution' : 'Agent Run'}. Click to inspect graphical process.`
                  : 'Click to inspect execution process flow'
              }
            >
              {isRunning ? (
                <span className="thread-pill-pulse-dot" style={{ backgroundColor: strokeColor }} />
              ) : (
                <TriggerIcon size={11} color={strokeColor} />
              )}
              <span className="thread-pill-text">
                {isRunning
                  ? triggerType === 'cron'
                    ? 'Cron Active'
                    : 'Thread Active'
                  : 'Process Flow'}
              </span>
              <Activity size={10} className="thread-pill-act-icon" />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
export const ThreadConnectionEdge = React.memo(ThreadConnectionEdgeBase, edgePropsEqual);
