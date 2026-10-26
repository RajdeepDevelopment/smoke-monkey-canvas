import React, { useState } from 'react';
import {
  type EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
} from '@xyflow/react';
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
  podName?: string;
  podColor?: string;
  onDisconnect?: (connectionId?: string, sourceId?: string, targetId?: string) => void;
}

export const AgentPeerEdge: React.FC<EdgeProps> = ({
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

  // Active calling glow (emerald/cyan) vs standard pod/purple
  const strokeColor = isActivelyCalling
    ? '#10b981'
    : (edgeData.podColor || '#8b5cf6');

  // Inside pod: only show if actively calling each other or hovered/selected
  const isVisible = !isInPod ? true : (isActivelyCalling || hovered || selected);

  return (
    <>
      {/* Invisible wider hit-testing path so hovering near line triggers reveal (Miro pattern) */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={36}
        className="nodrag nopan"
        style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      {/* Background glow stroke */}
      <path
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={isActivelyCalling ? 6 : (hovered ? 8 : 4)}
        strokeOpacity={isVisible ? (isActivelyCalling ? 0.45 : (hovered ? 0.38 : 0.15)) : 0}
        style={{
          filter: `drop-shadow(0 0 ${isActivelyCalling ? '12px' : '8px'} ${strokeColor})`,
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
          strokeWidth: isActivelyCalling ? 2.5 : (hovered ? 2.5 : 2),
          strokeDasharray: isActivelyCalling ? '4, 4' : '5, 5',
          opacity: isVisible ? 1 : 0,
          animation: isActivelyCalling
            ? 'peerDashFlow 0.75s linear infinite'
            : 'peerDashFlow 1.8s linear infinite',
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
            pointerEvents: isVisible ? 'all' : 'none',
            opacity: isVisible ? 1 : 0,
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
                  ? 'Calling Peer'
                  : (edgeData.targetRole ? edgeData.targetRole : 'Peer Delegate')}
              </span>
            </div>
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
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
