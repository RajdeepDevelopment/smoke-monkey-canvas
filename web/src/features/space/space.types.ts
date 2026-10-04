import type { PromptPreset } from '../library/library.types.js';
import type { Node } from '@xyflow/react';
import type { SpaceAgentEntity } from '../agent/agent.types.js';

export interface SpaceContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  flowX: number;
  flowY: number;
}

/** Node data is the agent plus UI-only extras the canvas attaches. */
export type AgentNodeData = SpaceAgentEntity & {
  /** Personalities resolved from `personalities` ids for display. */
  personalityItems?: PromptPreset[];
  /** Output styles resolved from `output_styles` ids for display. */
  outputStyleItems?: PromptPreset[];
};

export type AgentNode = Node<AgentNodeData, 'crabAgent'>;
