import React, { useState } from 'react';
import {
  type EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
} from '@xyflow/react';
import { edgePropsEqual } from './edge-memo.js';
import { X } from 'lucide-react';

export interface PeerEdgeData {
  [key: string]: unknown;
  connectionId?: string;
  sourceAgentId?: string;
  targetAgentId?: string;
  sourceAgentName?: string;
  targetAgentName?: string;
  targetRole?: string;
  targetSpecialty?: string;
  isInPod?: boolean;
  isActivelyCalling?: boolean;
  activeTaskTitle?: string;
  podName?: string;
  podColor?: string;
  onDisconnect?: (connectionId?: string, sourceId?: string, targetId?: string) => void;
}

const AgentPeerEdgeBase: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
  data,
}) => {
  const edgeData = (data as unknown as PeerEdgeData) || {};
  const [hovered, setHovered] = useState(false);
  const isInPod = Boolean(edgeData.isInPod);
  const isActivelyCalling = Boolean(edgeData.isActivelyCalling);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.4,
  });

  // Active calling glow (emerald green #10b981) vs standard resting pod/purple
  const strokeColor = isActivelyCalling
    ? '#10b981'
    : (edgeData.podColor || '#8b5cf6');

  // Peer connections are visible with resting styling; badge displays during active delegation or hover
  const isBadgeVisible = isActivelyCalling || hovered || selected;

  return (
    <>
      {/* Hit-testing path for hover disclosure */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      {/* Background glow stroke */}
      <path
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={isActivelyCalling ? 7 : (hovered ? 6 : 3)}
        strokeOpacity={isActivelyCalling ? 0.65 : (hovered ? 0.35 : 0.15)}
        style={{
          filter: `drop-shadow(0 0 ${isActivelyCalling ? '14px' : '6px'} ${strokeColor})`,
          transition: 'stroke-opacity 0.25s ease, stroke-width 0.25s ease',
          pointerEvents: 'none',
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
          strokeWidth: isActivelyCalling ? 3 : (hovered ? 2.5 : 1.75),
          strokeDasharray: isActivelyCalling ? '6, 4' : '4, 4',
          opacity: isActivelyCalling ? 1 : (hovered ? 0.9 : (isInPod ? 0.45 : 0.6)),
          animation: isActivelyCalling
            ? 'peerDashFlow 0.65s linear infinite'
            : (hovered ? 'peerDashFlow 2s linear infinite' : undefined),
          transition: 'opacity 0.25s ease, stroke-width 0.25s ease',
          pointerEvents: 'none',
        }}
      />

      {/* Floating interactive badge */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: isBadgeVisible ? 'all' : 'none',
            zIndex: isActivelyCalling ? 30 : 10,
            opacity: isBadgeVisible ? 1 : 0,
            transition: 'opacity 0.2s ease, transform 0.2s ease',
          }}
          className="nodrag nopan"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div
            className={`peer-edge-pill ${hovered ? 'hovered' : ''} ${isActivelyCalling ? 'is-calling' : ''}`}
            title={`Peer Delegation Link: ${edgeData.sourceAgentName || 'Agent'} ➔ ${edgeData.targetAgentName || 'Peer'}${edgeData.targetRole ? ` (${edgeData.targetRole})` : ''}`}
          >
            <span className="peer-pill-icon">{isActivelyCalling ? '⚡' : '🤝'}</span>
            <div className="peer-pill-text">
              <span className="peer-pill-title">
                {isActivelyCalling
                  ? (edgeData.activeTaskTitle ? `Delegating: ${edgeData.activeTaskTitle}` : 'Calling Peer')
                  : (edgeData.targetRole ? edgeData.targetRole : 'Peer Delegate')}
              </span>
            </div>
            {edgeData.onDisconnect && (
              <button
                type="button"
                className="peer-pill-disconnect-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  edgeData.onDisconnect?.(
                    edgeData.connectionId,
                    edgeData.sourceAgentId,
                    edgeData.targetAgentId,
                  );
                }}
                title="Disconnect peer delegation link"
              >
                <X size={11} />
              </button>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
export const AgentPeerEdge = React.memo(AgentPeerEdgeBase, edgePropsEqual);
