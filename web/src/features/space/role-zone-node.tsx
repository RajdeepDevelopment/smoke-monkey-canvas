import React from 'react';
import { Handle, NodeResizeControl, Position } from '@xyflow/react';
import { Maximize2, Pencil, Trash2, Users } from 'lucide-react';
import type { RoleZoneNodeData } from './space.types.js';

export const RoleZoneNode: React.FC<{ data: RoleZoneNodeData; selected?: boolean }> = React.memo(
  ({ data, selected }) => {
    const color = data.color || '#8b5cf6';
    const isCircle = data.shape === 'circle';

    return (
      <div
        className={`role-zone-node role-zone-drag-surface ${selected ? 'selected' : ''} ${isCircle ? 'is-circle' : ''}`}
        style={{
          ['--role-zone-color' as string]: color,
          borderColor: selected ? color : `color-mix(in srgb, ${color} 58%, hsl(var(--border)))`,
          background: `linear-gradient(135deg, color-mix(in srgb, ${color} 18%, transparent), color-mix(in srgb, ${color} 6%, transparent) 55%, color-mix(in srgb, ${color} 13%, transparent))`,
        }}
      >
        <Handle
          type="target"
          position={Position.Top}
          id="role-zone-parent"
          className="role-zone-hierarchy-handle"
          isConnectable={true}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="role-zone-child"
          className="role-zone-hierarchy-handle"
          isConnectable={true}
        />

        <div className="role-zone-label" title={data.description}>
          <div className="role-zone-label-main">
            <span className="role-zone-level">L{data.level}</span>
            <span className="role-zone-role">{data.roleTitle}</span>
            <span className="role-zone-divider" />
            <span className="role-zone-name">{data.name}</span>
            <span className="role-zone-members">
              <Users size={10} />
              {data.memberCount}
            </span>
            <button
              type="button"
              className="role-zone-action"
              title="Edit zone designation"
              onClick={(event) => {
                event.stopPropagation();
                data.onEditZone?.(data.id);
              }}
              onPointerDown={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <Pencil size={11} />
            </button>
            <button
              type="button"
              className="role-zone-action danger"
              title="Delete zone"
              onClick={(event) => {
                event.stopPropagation();
                data.onRemoveZone?.(data.id);
              }}
              onPointerDown={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <Trash2 size={11} />
            </button>
          </div>
          <div className="role-zone-label-purpose">
            {data.description || `Owns ${data.roleTitle} outcomes`}
          </div>
        </div>

        {data.memberCount === 0 ? (
          <div className="role-zone-empty-hint">
            <div className="role-zone-avatar-slot">
              <Users size={16} />
            </div>
            <span className="role-zone-slot-text">Drop agent to assign {data.roleTitle}</span>
          </div>
        ) : (
          <div className="role-zone-empty-hint role-zone-assigned-hint">
            <div className="role-zone-avatar-slot filled">
              <Users size={16} />
            </div>
            <span className="role-zone-slot-text">{data.memberNames?.join(', ') || `${data.memberCount} Agents Assigned`}</span>
          </div>
        )}

        {!isCircle && (
          <NodeResizeControl
            position="bottom-right"
            minWidth={240}
            minHeight={140}
            maxWidth={2200}
            maxHeight={1600}
            onResizeEnd={(_event, params) => {
              data.onResizeZone?.(
                data.id,
                Math.round(params.width),
                Math.round(params.height),
                Math.round(params.x),
                Math.round(params.y),
              );
            }}
          >
            <div className="role-zone-resize-handle" title="Resize designation zone">
              <Maximize2 size={9} />
            </div>
          </NodeResizeControl>
        )}
      </div>
    );
  },
);
