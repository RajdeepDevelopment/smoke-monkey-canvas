/**
 * Agent Avatar Service
 *
 * Renders deterministic character avatars for agents using react-nice-avatar,
 * the React port of Codennnn/vue-color-avatar (Micah Lanier's avatar system).
 * Avatars are generated fully offline from a seed, so every agent keeps the
 * same face across sessions while different agents get different faces.
 */

import { genConfig, type AvatarFullConfig, type HairStyle } from 'react-nice-avatar';

export interface AgentAvatarConfig {
  seed: string;
  avatar: AvatarFullConfig;
}

export const FACE_COLORS = ['#F9C9B6', '#AC6651'] as const;

export const HAIR_COLORS = [
  '#000',
  '#fff',
  '#77311D',
  '#FC909F',
  '#D2EFF3',
  '#506AF4',
  '#F48150',
] as const;

export const SHIRT_COLORS = ['#9287FF', '#6BD9E9', '#FC909F', '#F4D150', '#77311D'] as const;

export const BG_COLORS = [
  '#E0DDFF',
  '#D2EFF3',
  '#FFEDEF',
  '#FFEBA4',
  '#F4D150',
  '#6BD9E9',
  '#FC909F',
  '#9287FF',
] as const;

export const BG_GRADIENTS = [
  'linear-gradient(45deg, #178bff 0%, #ff6868 100%)',
  'linear-gradient(45deg, #176fff 0%, #68ffef 100%)',
  'linear-gradient(90deg, #36cd1c 0%, #68deff 100%)',
  'linear-gradient(45deg, #3e1ccd 0%, #ff6871 100%)',
  'linear-gradient(45deg, #56b5f0 0%, #45ccb5 100%)',
] as const;

export const HAIR_STYLES_MAN: HairStyle[] = ['normal', 'thick', 'mohawk'];
export const HAIR_STYLES_WOMAN: HairStyle[] = ['normal', 'womanLong', 'womanShort'];

const STORAGE_PREFIX = 'sm_agent_avatar_';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function createAvatarConfig(seed: string): AgentAvatarConfig {
  const cleanSeed = seed.trim() || 'smoke-monkey';
  return { seed: cleanSeed, avatar: genConfig(cleanSeed) };
}

export function randomAvatarSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function getAgentAvatarConfig(agentId: string, defaultSeed?: string): AgentAvatarConfig {
  const fallbackSeed = (defaultSeed || agentId).trim() || agentId;

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${agentId}`);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isRecord(parsed)) {
        const seed =
          typeof parsed.seed === 'string' && parsed.seed.trim() ? parsed.seed : fallbackSeed;
        const base = genConfig(seed);
        if (isRecord(parsed.avatar)) {
          return { seed, avatar: { ...base, ...(parsed.avatar as AvatarFullConfig) } };
        }
        return { seed, avatar: base };
      }
    }
  } catch {
    // Ignore malformed storage entries and fall back to a generated avatar.
  }

  return createAvatarConfig(fallbackSeed);
}

export function saveAgentAvatarConfig(agentId: string, config: AgentAvatarConfig): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${agentId}`, JSON.stringify(config));
    window.dispatchEvent(
      new CustomEvent('sm-agent-avatar-updated', { detail: { agentId, config } })
    );
  } catch (err) {
    console.error('Failed to save agent avatar config:', err);
  }
}
