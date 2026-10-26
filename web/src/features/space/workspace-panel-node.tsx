import React from 'react';
import { SpaceWorkspacePanel } from './space.workspace-panel.js';
import type { WorkspacePanelNodeData } from './space.types.js';

export const WorkspacePanelNode: React.FC<{
  data: WorkspacePanelNodeData;
  selected?: boolean;
}> = React.memo(({ data, selected }) => (
  <div className={`workspace-panel-node ${selected ? 'selected' : ''}`}>
    <SpaceWorkspacePanel
      space={data.space}
      agents={data.agents}
      zones={data.zones}
      onClose={data.onClose}
      onCreateZone={data.onCreateZone}
      onEditZone={data.onEditZone}
      onRemoveZone={data.onRemoveZone}
      onFocusZone={data.onFocusZone}
      onOpenAgent={data.onOpenAgent}
      onSaveWorkflowPrompt={data.onSaveWorkflowPrompt}
      embedded
    />
  </div>
));
