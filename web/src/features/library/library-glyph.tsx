import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { githubOwner, githubOwnerAvatarUrl } from './library.icons.js';
import { getBrandIcon } from '../common/brand-icons.js';

interface GlyphProps {
  icon: LucideIcon;
  /** Accent colour driving the tile gradient and glyph stroke. */
  color: string;
  size?: number;
  className?: string;
  /** Renders a flat rounded square instead of the tinted gradient tile. */
  plain?: boolean;
}

/**
 * Draws an icon inside a rounded, tinted tile.
 *
 * The tinted plate is the point: a column of bare lucide outlines reads as
 * loose glyphs, but the same outlines on coloured tiles read as a designed
 * icon set. Emoji were previously used here and were removed because they
 * render differently per platform and cannot inherit the section accent.
 */
export const LibGlyph: React.FC<GlyphProps> = ({
  icon: Icon,
  color,
  size = 14,
  className = '',
  plain = false,
}) => (
  <span
    className={`lib-glyph ${plain ? 'lib-glyph-plain' : ''} ${className}`.trim()}
    style={
      {
        '--gc': color,
        width: size + 10,
        height: size + 10,
      } as React.CSSProperties
    }
  >
    <Icon size={size} strokeWidth={2} />
  </span>
);

interface GhAvatarProps {
  /** `owner/repo` (or a bare owner). The owner avatar is loaded from GitHub. */
  repo: string;
  /** Lucide glyph shown if the live avatar fails to load (offline, rate-limit). */
  fallbackIcon: LucideIcon;
  /** Accent colour for the fallback tile. */
  color: string;
  size?: number;
  className?: string;
  /** Direct avatar URL from GitHub API (e.g. data.owner.avatar_url) */
  avatarUrl?: string;
}

/**
 * The real GitHub project logo (brand icon or owner avatar) for a curated plugin.
 *
 * Checks for a recognized vector brand icon first (Anthropic, OpenAI, Gemini, etc.),
 * then loads the real GitHub owner avatar, and falls back to the category glyph.
 */
export const GhAvatar: React.FC<GhAvatarProps> = ({
  repo,
  fallbackIcon: Fallback,
  color,
  size = 26,
  className = '',
  avatarUrl,
}) => {
  const [failed, setFailed] = React.useState(false);

  // Clean repo string in case it's a full URL or has leading/trailing slashes
  const cleanedRepo = React.useMemo(() => {
    return (repo || '')
      .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
      .replace(/\.git$/i, '')
      .replace(/^\/+|\/+$/g, '')
      .trim();
  }, [repo]);

  const parts = cleanedRepo.split('/');
  const owner = parts[0] || githubOwner(repo);
  const repoName = parts[1] || '';

  // Reset failure state when repo or avatarUrl changes
  React.useEffect(() => {
    setFailed(false);
  }, [cleanedRepo, avatarUrl]);

  // Check if owner or repo name matches any known brand
  const brandIcon = React.useMemo(() => {
    return (
      (owner && getBrandIcon(owner, Math.round(size * 0.72))) ||
      (repoName && getBrandIcon(repoName, Math.round(size * 0.72))) ||
      (cleanedRepo && getBrandIcon(cleanedRepo, Math.round(size * 0.72))) ||
      null
    );
  }, [owner, repoName, cleanedRepo, size]);

  const imageSrc = avatarUrl || githubOwnerAvatarUrl(cleanedRepo || repo, Math.max(size * 2, 64));

  return (
    <span
      className={`lib-gh-avatar ${failed && !brandIcon ? 'lib-gh-avatar-fallback' : ''} ${className}`.trim()}
      style={
        {
          '--gc': color,
          width: size,
          height: size,
        } as React.CSSProperties
      }
      title={cleanedRepo || repo || undefined}
    >
      {brandIcon ? (
        brandIcon
      ) : failed ? (
        <Fallback size={Math.round(size * 0.55)} strokeWidth={2} />
      ) : (
        <img
          src={imageSrc}
          alt={owner}
          loading="lazy"
          referrerPolicy="no-referrer"
          draggable={false}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
};