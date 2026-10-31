import React from 'react';
import { Loader2, Sparkles, Cpu, Wrench, ShieldCheck } from 'lucide-react';
import { BrandIcons } from '../common/brand-icons.js';
import type { AgentSkeletonNodeData } from '../space/space.types.js';

export const AgentSkeletonNode: React.FC<{ data: AgentSkeletonNodeData }> = React.memo(({ data }) => {
  const ProviderIcon = data.provider ? BrandIcons[data.provider] : null;
  const isAvatar = data.isAvatar !== false; // Inside zones, agents are avatars by default

  const providerLabel =
    data.provider === 'nvidia' ? 'NVIDIA NIM'
    : data.provider === 'openai' ? 'OpenAI'
    : data.provider === 'anthropic' ? 'Anthropic'
    : data.provider === 'gemini' ? 'Google Gemini'
    : data.provider === 'groq' ? 'Groq'
    : data.provider === 'openrouter' ? 'OpenRouter'
    : data.provider || 'AI';

  const rawSlug = data.model ? (data.model.includes('/') ? data.model.split('/').pop()! : data.model) : 'Model';
  const formattedModel = rawSlug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // ── Inside a Zone / Pod: Render Avatar Shimmer Stage ──
  if (isAvatar) {
    return (
      <div
        className="crab-pod-avatar-node skeleton-pod-avatar-node nodrag nopan"
        style={{
          '--pod-accent': data.zoneColor || '#38bdf8',
          width: '210px',
        } as React.CSSProperties}
      >
        <div className="skeleton-shimmer-sweep" />

        {/* Top provider & model badge */}
        <div className="pod-top-provider-badge skeleton-pod-provider">
          <span className="provider-icon-wrap">
            {ProviderIcon ? <ProviderIcon size={11} /> : <Cpu size={11} />}
          </span>
          <span className="provider-name">{providerLabel}</span>
          <span className="provider-dot">·</span>
          <span className="model-name-short">
            {formattedModel.length > 13 ? formattedModel.slice(0, 12) + '…' : formattedModel}
          </span>
        </div>

        {/* Central Avatar Stage */}
        <div className="pod-avatar-stage">
          <div className="pod-avatar-disc skeleton-avatar-disc">
            <Loader2 size={24} className="skeleton-spin-icon" />
          </div>
        </div>

        {/* Name, Role & Status */}
        <div className="pod-avatar-meta">
          <span className="pod-avatar-name skeleton-avatar-name" title={data.name}>
            {data.name}
          </span>
          {data.role && (
            <span className="pod-avatar-role skeleton-avatar-role" title={data.role}>
              {data.role}
            </span>
          )}
          <div className="status-pill running skeleton-status-pill">
            <Loader2 size={10} className="skeleton-spin-icon" />
            <span>Deploying</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Outside any zone: Render Full Crab Card Shimmer ──
  const phaseLabel =
    data.phase === 'attaching_mcps'
      ? 'Configuring tools & MCPs...'
      : data.phase === 'attaching_skills'
      ? 'Injecting knowledge & skills...'
      : 'Provisioning AI specialist...';

  return (
    <div className="crab-agent-node agent-skeleton-node nodrag nopan">
      <div className="crab-body skeleton-crab-body">
        <div className="skeleton-shimmer-sweep" />

        {/* Header */}
        <div className="crab-header">
          <div className="crab-title-group">
            <div className="crab-avatar-wrap skeleton-avatar">
              <Loader2 size={16} className="skeleton-spin-icon" />
            </div>
            <div className="crab-title-col">
              <div className="crab-title-row">
                <span className="crab-name skeleton-name">{data.name}</span>
                <span className="crab-id-chip skeleton-chip">deploying</span>
              </div>
              {data.role && (
                <span className="crab-role-subtitle skeleton-role">{data.role}</span>
              )}
            </div>
          </div>
          <div className="status-pill running skeleton-status-pill">
            <Loader2 size={11} className="skeleton-spin-icon" />
            <span>Deploying</span>
          </div>
        </div>

        {/* Model Bar Skeleton */}
        <div className="crab-model-bar skeleton-model-bar">
          <div className="model-bar-left">
            {ProviderIcon && <ProviderIcon size={14} className="skeleton-provider-icon" />}
            <span className="skeleton-model-text">
              {providerLabel} · {formattedModel}
            </span>
          </div>
          <span className="skeleton-badge">Readying</span>
        </div>

        {/* Prompt Preview Lines Shimmer */}
        <div className="skeleton-prompt-box">
          <div className="skeleton-line skeleton-line-full" />
          <div className="skeleton-line skeleton-line-partial" />
        </div>

        {/* Meta Grid Shimmer */}
        <div className="skeleton-meta-grid">
          <div className="skeleton-meta-item">
            <Wrench size={12} className="skeleton-icon-dim" />
            <div className="skeleton-line-sm" />
          </div>
          <div className="skeleton-meta-item">
            <ShieldCheck size={12} className="skeleton-icon-dim" />
            <div className="skeleton-line-sm" />
          </div>
        </div>

        {/* Footer with phase indicator */}
        <div className="skeleton-footer">
          <Sparkles size={12} className="skeleton-sparkle" />
          <span className="skeleton-phase-text">{phaseLabel}</span>
        </div>
      </div>
    </div>
  );
});
