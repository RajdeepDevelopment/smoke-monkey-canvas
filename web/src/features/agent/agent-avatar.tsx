import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import NiceAvatar from 'react-nice-avatar';
import type { AvatarFullConfig, HairStyle } from 'react-nice-avatar';
import {
  Check,
  Palette,
  Shuffle,
  X,
  RotateCcw,
  Sparkles,
  Smile,
  Glasses,
  User,
  Trash2,
  Brain,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { useSpaceStore, type AgentMood } from '../space/space.store.js';
import {
  BG_COLORS,
  BG_GRADIENTS,
  FACE_COLORS,
  HAIR_COLORS,
  HAIR_STYLES_MAN,
  HAIR_STYLES_WOMAN,
  SHIRT_COLORS,
  createAvatarConfig,
  getAgentAvatarConfig,
  randomAvatarSeed,
  saveAgentAvatarConfig,
  type AgentAvatarConfig,
} from './agent-avatar.service.js';

interface AgentAvatarProps {
  agentId: string;
  seed?: string;
  size?: number;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
  moodOverride?: AgentMood;
}

const AvatarFace: React.FC<{
  avatar: AvatarFullConfig;
  size: number;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
  mood?: AgentMood;
  moodDetail?: string;
}> = ({ avatar, size, className = '', onClick, title, mood = 'idle', moodDetail }) => (
  <div
    className={`agent-avatar-root mood-${mood} ${className}`.trim()}
    style={{
      width: size,
      height: size,
      minWidth: size,
      minHeight: size,
      borderRadius: '50%',
      overflow: 'visible',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      position: 'relative',
      cursor: 'inherit',
      userSelect: 'none',
    }}
    onClick={onClick}
    title={title || (mood !== 'idle' ? `${mood.toUpperCase()}: ${moodDetail || ''}` : undefined)}
  >
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <NiceAvatar shape="circle" style={{ width: '100%', height: '100%', pointerEvents: onClick ? 'auto' : 'none' }} {...avatar} />
    </div>

    {/* Floating Dynamic Mood Indicator Badge */}
    {mood !== 'idle' && (
      <div
        className={`agent-mood-badge mood-${mood}`}
        title={moodDetail || mood}
        style={{
          position: 'absolute',
          top: -2,
          right: -2,
          zIndex: 15,
        }}
      >
        {mood === 'thinking' && (
          <span className="mood-badge-icon thinking" title={moodDetail || 'Thinking & reasoning...'}>
            <Brain size={Math.max(10, Math.round(size * 0.22))} />
          </span>
        )}
        {mood === 'working' && (
          <span className="mood-badge-icon working" title={moodDetail || 'Executing task...'}>
            <Zap size={Math.max(10, Math.round(size * 0.22))} />
          </span>
        )}
        {mood === 'completed' && (
          <span className="mood-badge-icon completed" title={moodDetail || 'Task completed!'}>
            <Sparkles size={Math.max(11, Math.round(size * 0.24))} />
          </span>
        )}
        {mood === 'error' && (
          <span className="mood-badge-icon error" title={moodDetail || 'Execution failed'}>
            <AlertTriangle size={Math.max(10, Math.round(size * 0.22))} />
          </span>
        )}
      </div>
    )}
  </div>
);

export const AgentAvatar: React.FC<AgentAvatarProps> = React.memo(
  ({ agentId, seed: propSeed, size = 40, className = '', onClick, title, moodOverride }) => {
    const [config, setConfig] = useState<AgentAvatarConfig>(() =>
      getAgentAvatarConfig(agentId, propSeed)
    );

    // Optimized selector: ONLY re-render this avatar when this specific agent's mood changes
    const moodState = useSpaceStore((s) => s.agentMoods[agentId]);
    const currentMood: AgentMood = moodOverride || moodState?.mood || 'idle';
    const moodDetail = moodState?.detail;

    useEffect(() => {
      setConfig(getAgentAvatarConfig(agentId, propSeed));
    }, [agentId, propSeed]);

    useEffect(() => {
      const handleUpdate = (e: Event) => {
        const detail = (e as CustomEvent<{ agentId: string; config: AgentAvatarConfig }>).detail;
        if (detail && detail.agentId === agentId) {
          setConfig(detail.config);
        }
      };
      window.addEventListener('sm-agent-avatar-updated', handleUpdate);
      return () => window.removeEventListener('sm-agent-avatar-updated', handleUpdate);
    }, [agentId]);

    // Compute dynamic facial expression based on live agent phase
    const dynamicAvatar = useMemo<AvatarFullConfig>(() => {
      const base = config.avatar;
      if (!base) return base;

      if (currentMood === 'thinking') {
        return {
          ...base,
          eyeStyle: 'oval', // Focused inquiring gaze
          mouthStyle: 'peace', // Neutral concentrated mouth line
          eyeBrowStyle: 'up',
        };
      }
      if (currentMood === 'working') {
        return {
          ...base,
          eyeStyle: 'circle', // Alert, active eyes
          mouthStyle: 'smile', // Confident working smile
          eyeBrowStyle: 'up',
        };
      }
      if (currentMood === 'completed') {
        return {
          ...base,
          eyeStyle: 'smile', // Happy closed crescent smile eyes ^^
          mouthStyle: 'laugh', // Wide cheerful happy smile :D
          eyeBrowStyle: 'upWoman',
        };
      }
      if (currentMood === 'error') {
        return {
          ...base,
          eyeStyle: 'oval',
          mouthStyle: 'peace',
        };
      }
      return base;
    }, [config.avatar, currentMood]);

    const resolvedTitle = title || (currentMood !== 'idle' ? `${currentMood.toUpperCase()}: ${moodDetail || ''}` : undefined);

    return (
      <AvatarFace
        avatar={dynamicAvatar}
        size={size}
        className={className}
        onClick={onClick}
        title={resolvedTitle}
        mood={currentMood}
        moodDetail={moodDetail}
      />
    );
  }
);

// ── Avatar Picker / Face Customizer Modal ──────────────────────────────────────

interface AvatarPickerModalProps {
  isOpen: boolean;
  agentId: string;
  agentName: string;
  onClose: () => void;
  onSaved?: (newConfig: AgentAvatarConfig) => void;
}

const HAIR_LABELS: Record<HairStyle, string> = {
  normal: 'Normal',
  thick: 'Thick',
  mohawk: 'Mohawk',
  womanLong: 'Long',
  womanShort: 'Short',
};

const EYE_OPTIONS = [
  { value: 'circle', label: 'Round' },
  { value: 'oval', label: 'Oval' },
  { value: 'smile', label: 'Smile' },
] as const;

const BROW_OPTIONS = [
  { value: 'up', label: 'Straight' },
  { value: 'upWoman', label: 'Arched' },
] as const;

const MOUTH_OPTIONS = [
  { value: 'laugh', label: 'Laugh' },
  { value: 'smile', label: 'Smile' },
  { value: 'peace', label: 'Peace' },
] as const;

const NOSE_OPTIONS = [
  { value: 'short', label: 'Short' },
  { value: 'long', label: 'Long' },
  { value: 'round', label: 'Round' },
] as const;

const GLASSES_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'round', label: 'Round' },
  { value: 'square', label: 'Square' },
] as const;

const HAT_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'beanie', label: 'Beanie' },
  { value: 'turban', label: 'Turban' },
] as const;

const SHIRT_OPTIONS = [
  { value: 'short', label: 'Tee' },
  { value: 'polo', label: 'Polo' },
  { value: 'hoody', label: 'Hoodie' },
] as const;

const EAR_OPTIONS = [
  { value: 'small', label: 'Small' },
  { value: 'big', label: 'Big' },
] as const;

type AvatarTab = 'base' | 'features' | 'outfit' | 'theme';

const TABS: Array<{ id: AvatarTab; label: string; icon: React.FC<{ size?: number }> }> = [
  { id: 'base', label: 'Face & Hair', icon: User },
  { id: 'features', label: 'Expression', icon: Smile },
  { id: 'outfit', label: 'Outfit & Gear', icon: Glasses },
  { id: 'theme', label: 'Backdrop & DNA', icon: Sparkles },
];

function OptionChips<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | undefined;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="avatar-field">
      <div className="avatar-field-header">
        <span className="avatar-field-label">{label}</span>
      </div>
      <div className="avatar-chip-row">
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              className={`avatar-chip ${isSelected ? 'is-selected' : ''}`}
              aria-pressed={isSelected}
              onClick={() => onChange(option.value)}
            >
              {isSelected && <span className="avatar-chip-dot" />}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ColorSwatches({
  label,
  value,
  colors,
  onChange,
  gradient = false,
}: {
  label: string;
  value: string | undefined;
  colors: readonly string[];
  onChange: (color: string) => void;
  gradient?: boolean;
}) {
  return (
    <div className="avatar-field">
      <span className="avatar-field-label">{label}</span>
      <div className="avatar-swatch-row">
        {colors.map((color) => {
          const isSelected = value === color;
          return (
            <button
              key={color}
              type="button"
              className={`avatar-swatch ${isSelected ? 'is-selected' : ''}`}
              style={{ background: color }}
              aria-label={`${label}: ${color}`}
              aria-pressed={isSelected}
              title={gradient ? 'Gradient' : color}
              onClick={() => onChange(color)}
            >
              {isSelected && <Check size={12} color="#ffffff" className="swatch-check" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  isOpen,
  agentId,
  agentName,
  onClose,
  onSaved,
}) => {
  const [activeTab, setActiveTab] = useState<AvatarTab>('base');
  const [draft, setDraft] = useState<AgentAvatarConfig>(() =>
    getAgentAvatarConfig(agentId, agentName)
  );
  const [seedInput, setSeedInput] = useState<string>(agentName || agentId);

  useEffect(() => {
    if (isOpen) {
      const cfg = getAgentAvatarConfig(agentId, agentName || agentId);
      setDraft(cfg);
      setSeedInput(cfg.seed);
    }
  }, [isOpen, agentId, agentName]);

  const isGradient = useMemo(
    () => Boolean(draft.avatar.bgColor && draft.avatar.bgColor.includes('gradient')),
    [draft.avatar.bgColor]
  );

  if (!isOpen) return null;

  const patch = (partial: Partial<AvatarFullConfig>) => {
    setDraft((current) => ({ ...current, avatar: { ...current.avatar, ...partial } }));
  };

  const applySeed = (seed: string) => {
    setSeedInput(seed);
    if (seed.trim()) {
      setDraft(createAvatarConfig(seed));
    }
  };

  const handleShuffle = () => {
    const seed = randomAvatarSeed();
    setSeedInput(seed);
    setDraft(createAvatarConfig(seed));
  };

  const handleClearAccessories = () => {
    patch({
      glassesStyle: 'none',
      hatStyle: 'none',
    });
  };

  const handleResetToDefault = () => {
    applySeed(agentId);
  };

  const handleSexChange = (sex: 'man' | 'woman') => {
    const allowed = sex === 'man' ? HAIR_STYLES_MAN : HAIR_STYLES_WOMAN;
    const currentHair = draft.avatar.hairStyle;
    const hairStyle: HairStyle = currentHair && allowed.includes(currentHair) ? currentHair : 'normal';
    patch({
      sex,
      hairStyle,
      eyeBrowStyle: sex === 'woman' ? 'upWoman' : draft.avatar.eyeBrowStyle,
    });
  };

  const handleSave = () => {
    const seed = seedInput.trim() || draft.seed;
    const nextConfig: AgentAvatarConfig = { ...draft, seed };
    saveAgentAvatarConfig(agentId, nextConfig);
    onSaved?.(nextConfig);
    onClose();
  };

  const hairOptions = (draft.avatar.sex === 'woman' ? HAIR_STYLES_WOMAN : HAIR_STYLES_MAN).map(
    (style) => ({ value: style, label: HAIR_LABELS[style] })
  );

  return createPortal(
    <div className="avatar-picker-backdrop nodrag nopan" onClick={onClose}>
      <div className="avatar-picker-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="avatar-picker-header">
          <div className="avatar-picker-heading">
            <Palette size={18} color="#a78bfa" />
            <span>Customize Agent Avatar</span>
          </div>
          <button type="button" className="avatar-picker-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Hero Preview Card */}
        <div className="avatar-preview-section">
          <div className="avatar-preview-card">
            <div className="avatar-preview-face-wrap">
              <AvatarFace avatar={draft.avatar} size={82} className="avatar-hero-preview" />
            </div>
            <div className="avatar-preview-meta">
              <div className="avatar-preview-title-row">
                <span className="avatar-preview-name">{agentName || 'Agent Avatar'}</span>
                <span className="avatar-preview-badge">Live Preview</span>
              </div>
              <div className="avatar-preview-actions">
                <button
                  type="button"
                  className="avatar-action-btn primary"
                  onClick={handleShuffle}
                  title="Generate a completely new random avatar"
                >
                  <Shuffle size={13} />
                  <span>Randomize</span>
                </button>
                <button
                  type="button"
                  className="avatar-action-btn secondary"
                  onClick={handleClearAccessories}
                  title="Remove glasses and hats"
                >
                  <Trash2 size={12} />
                  <span>Clear Gear</span>
                </button>
                <button
                  type="button"
                  className="avatar-action-btn subtle"
                  onClick={handleResetToDefault}
                  title="Reset to default face generated from agent ID"
                >
                  <RotateCcw size={12} />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Category Tabs */}
          <div className="avatar-tabs-bar">
            {TABS.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`avatar-tab-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <TabIcon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Body Content */}
        <div className="avatar-picker-body">
          {activeTab === 'base' && (
            <div className="avatar-tab-pane">
              <OptionChips
                label="Face Character"
                value={draft.avatar.sex}
                options={[
                  { value: 'man', label: 'Man / Masculine' },
                  { value: 'woman', label: 'Woman / Feminine' },
                ]}
                onChange={handleSexChange}
              />
              <ColorSwatches
                label="Skin Tone"
                value={draft.avatar.faceColor}
                colors={FACE_COLORS}
                onChange={(faceColor) => patch({ faceColor })}
              />
              <OptionChips
                label="Hair Style"
                value={draft.avatar.hairStyle}
                options={hairOptions}
                onChange={(hairStyle) => patch({ hairStyle })}
              />
              <ColorSwatches
                label="Hair Color"
                value={draft.avatar.hairColor}
                colors={HAIR_COLORS}
                onChange={(hairColor) => patch({ hairColor })}
              />
              <OptionChips
                label="Ear Size"
                value={draft.avatar.earSize}
                options={EAR_OPTIONS}
                onChange={(earSize) => patch({ earSize })}
              />
            </div>
          )}

          {activeTab === 'features' && (
            <div className="avatar-tab-pane">
              <OptionChips
                label="Eyes Expression"
                value={draft.avatar.eyeStyle}
                options={EYE_OPTIONS}
                onChange={(eyeStyle) => patch({ eyeStyle })}
              />
              <OptionChips
                label="Eyebrows"
                value={draft.avatar.eyeBrowStyle}
                options={BROW_OPTIONS}
                onChange={(eyeBrowStyle) => patch({ eyeBrowStyle })}
              />
              <OptionChips
                label="Mouth & Smile"
                value={draft.avatar.mouthStyle}
                options={MOUTH_OPTIONS}
                onChange={(mouthStyle) => patch({ mouthStyle })}
              />
              <OptionChips
                label="Nose Shape"
                value={draft.avatar.noseStyle}
                options={NOSE_OPTIONS}
                onChange={(noseStyle) => patch({ noseStyle })}
              />
            </div>
          )}

          {activeTab === 'outfit' && (
            <div className="avatar-tab-pane">
              <OptionChips
                label="Eyewear / Glasses"
                value={draft.avatar.glassesStyle}
                options={GLASSES_OPTIONS}
                onChange={(glassesStyle) => patch({ glassesStyle })}
              />
              <OptionChips
                label="Headwear / Hat"
                value={draft.avatar.hatStyle}
                options={HAT_OPTIONS}
                onChange={(hatStyle) => patch({ hatStyle })}
              />
              <OptionChips
                label="Shirt Style"
                value={draft.avatar.shirtStyle}
                options={SHIRT_OPTIONS}
                onChange={(shirtStyle) => patch({ shirtStyle })}
              />
              <ColorSwatches
                label="Shirt Color"
                value={draft.avatar.shirtColor}
                colors={SHIRT_COLORS}
                onChange={(shirtColor) => patch({ shirtColor })}
              />
            </div>
          )}

          {activeTab === 'theme' && (
            <div className="avatar-tab-pane">
              <div className="avatar-field">
                <span className="avatar-field-label">Solid Background Colors</span>
                <div className="avatar-swatch-row">
                  {BG_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`avatar-swatch ${!isGradient && draft.avatar.bgColor === color ? 'is-selected' : ''}`}
                      style={{ background: color }}
                      aria-label={`Background ${color}`}
                      aria-pressed={!isGradient && draft.avatar.bgColor === color}
                      onClick={() => patch({ bgColor: color, isGradient: false })}
                    >
                      {!isGradient && draft.avatar.bgColor === color && (
                        <Check size={12} color="#ffffff" className="swatch-check" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="avatar-field">
                <span className="avatar-field-label">Vibrant Gradients</span>
                <div className="avatar-swatch-row">
                  {BG_GRADIENTS.map((gradient) => (
                    <button
                      key={gradient}
                      type="button"
                      className={`avatar-swatch is-gradient ${isGradient && draft.avatar.bgColor === gradient ? 'is-selected' : ''}`}
                      style={{ background: gradient }}
                      aria-label="Gradient background"
                      aria-pressed={isGradient && draft.avatar.bgColor === gradient}
                      onClick={() => patch({ bgColor: gradient, isGradient: true })}
                    >
                      {isGradient && draft.avatar.bgColor === gradient && (
                        <Check size={12} color="#ffffff" className="swatch-check" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="avatar-field">
                <span className="avatar-field-label">Avatar DNA Seed (Deterministic Key)</span>
                <div className="avatar-seed-row">
                  <input
                    type="text"
                    className="avatar-seed-input"
                    value={seedInput}
                    onChange={(e) => setSeedInput(e.target.value)}
                    placeholder="Enter any word or phrase..."
                  />
                  <button
                    type="button"
                    className="avatar-action-btn primary"
                    onClick={() => applySeed(seedInput)}
                  >
                    Generate
                  </button>
                </div>
                <span className="avatar-seed-hint">
                  Any seed produces a repeatable face across canvas sessions.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="avatar-picker-footer">
          <button
            type="button"
            className="avatar-reset-link nodrag nopan"
            onClick={handleResetToDefault}
          >
            <RotateCcw size={12} />
            <span>Reset to Default</span>
          </button>
          <div className="avatar-footer-actions">
            <button type="button" className="avatar-secondary-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="avatar-primary-btn" onClick={handleSave}>
              <Check size={15} />
              <span>Save Avatar</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
