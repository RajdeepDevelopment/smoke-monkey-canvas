import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  workspacePrompt,
  scriptLibraryBlock,
  automationLibraryBlock,
  COMMON_DIR,
  MANIFEST_DIR,
  SMOKE_AGENTS_ROOT,
  type AgentWorkspace,
  type CommonRegistryPaths,
} from './agent.manifest.js';
import { personalityPrompt, outputStylePrompt, parseIdList } from './agent.presets.js';
import type { AgentPolicyEntry, AgentRecord } from './agent.types.js';
import { detectGitRepository, ensureRepoMemory, repoMemoryPrompt } from './agent.repo-memory.js';

/**
 * Resolve the designated working directory for an agent. The runner and the
 * manifest preview MUST agree on this path, so it lives in one place.
 */
export const resolveAgentWorkspace = (agent: Pick<AgentRecord, 'working_dir' | 'name' | 'id'>): string => {
  const explicit = agent.working_dir ? agent.working_dir.trim() : '';
  if (explicit) return explicit;
  const safeName =
    agent.name.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'agent';
  return join(homedir(), '.smoke-agents', `${safeName}-${agent.id}`);
};

/** Path map for the shared registry without writing it (preview-safe). */
export const commonRegistryPaths = (): CommonRegistryPaths => {
  const dir = join(homedir(), SMOKE_AGENTS_ROOT, COMMON_DIR);
  return {
    dir,
    mcpFile: join(dir, 'mcp.json'),
    envFile: join(dir, 'env.json'),
    readmeFile: join(dir, 'README.md'),
  };
};

/**
 * Merge the app-managed policies (from the DB) with policies the agent wrote
 * into its own `policies/policies.json` during a run. Deduped by text; the
 * DB entry wins if both name the same boundary.
 */
export const mergeEffectivePolicies = (
  dbPolicies: AgentPolicyEntry[],
  manifestPolicies: AgentPolicyEntry[],
): AgentPolicyEntry[] => {
  const seen = new Set(dbPolicies.map((p) => p.text));
  const agentPolicies = manifestPolicies.filter((p) => p.source === 'agent' && !seen.has(p.text));
  return [...dbPolicies, ...agentPolicies];
};

export const buildPolicyGuidance = (entries: AgentPolicyEntry[]): string => {
  if (entries.length === 0) return '';
  return `## STRICT AGENT POLICIES & BOUNDARY CONSTRAINTS:\nYou MUST follow these operational boundaries at all times:\n${entries
    .map((p, i) => `${i + 1}. ${p.text}`)
    .join('\n')}`;
};

export const buildDisabledToolsBlock = (disabledTools: string[]): string => {
  if (disabledTools.length === 0) return '';
  return `## DISABLED TOOLS:\nYou MUST NOT call the following tools under any circumstances: ${disabledTools.join(', ')}`;
};

export const buildResourceConstraintsBlock = (workspace: string, memoryLimitMb: number): string =>
  [
    `## RESOURCE ENVELOPE & RUNTIME CONSTRAINTS:`,
    `- Designated Working Directory: "${workspace}"`,
    `- Maximum RAM Allocation Limit: ${memoryLimitMb} MB`,
    `- Device Profile: ${memoryLimitMb <= 512 ? 'Mobile / Resource-Constrained Embedded Edge' : 'Standard / High-Performance Workstation'}`,
    `- Always keep memory usage minimal, free unused data buffers, stream large files instead of loading into memory, and keep all output assets inside the designated working directory.`,
    `- SELF-LEARNING, EVERY RUN: when you automate a repetitive task, you MUST end the run by saving the script into "${join(workspace, MANIFEST_DIR, 'automation')}" and adding its entry (file, purpose, whenToUse, cron) to "${join(workspace, MANIFEST_DIR, 'automation', 'index.json')}". A script saved anywhere else, or saved without its index.json entry, is an INCOMPLETE task — the next run cannot find it and will rebuild everything from scratch.`,
  ].join('\n');

export interface EffectivePromptInput {
  /** Raw DB policies (canvas + user) merged with agent-written policies. */
  policyEntries: AgentPolicyEntry[];
  disabledTools: string[];
  resolvedWorkspace: string;
  memoryLimitMb: number;
  personalities: string | null | undefined;
  outputStyles: string | null | undefined;
  manifest: AgentWorkspace;
  common: CommonRegistryPaths;
  agentId: string;
  agentName?: string;
}

/**
 * Assemble the ordered sub-prompt chain. This is THE single source of truth:
 * the run pipeline uses it directly, and the agent-box preview renders the
 * exact same output, so the UI can never disagree with what a run will send.
 *
 * Order (first is highest precedence): policies → disabled tools → resource
 * envelope → voice → format → workspace/memory → repository memory → script library → automation
 * library (always last).
 */
export const buildSubPrompts = (input: EffectivePromptInput): string[] => {
  const blocks: string[] = [];
  const policyGuidance = buildPolicyGuidance(input.policyEntries);
  if (policyGuidance) blocks.push(policyGuidance);
  const disabledBlock = buildDisabledToolsBlock(input.disabledTools);
  if (disabledBlock) blocks.push(disabledBlock);
  blocks.push(buildResourceConstraintsBlock(input.resolvedWorkspace, input.memoryLimitMb));
  const voice = personalityPrompt(parseIdList(input.personalities));
  if (voice) blocks.push(voice);
  const format = outputStylePrompt(parseIdList(input.outputStyles));
  if (format) blocks.push(format);
  blocks.push(workspacePrompt(input.manifest, input.common, input.agentId));

  // Shared repository memory if working in a git repository
  const repoInfo = detectGitRepository(input.resolvedWorkspace);
  if (repoInfo) {
    const repoPaths = ensureRepoMemory(input.common.dir, repoInfo, input.agentId, input.agentName || 'Agent');
    blocks.push(repoMemoryPrompt(repoInfo, repoPaths));
  }

  blocks.push(scriptLibraryBlock(input.manifest));
  blocks.push(automationLibraryBlock(input.manifest));
  return blocks;
};

/** Full system prompt as assembled for a run: base prompt + every sub-prompt. */
export const buildEffectiveSystemPrompt = (
  baseSystemPrompt: string,
  input: EffectivePromptInput,
): string => [baseSystemPrompt, ...buildSubPrompts(input)].filter(Boolean).join('\n\n');
