import React from 'react';
import type { LucideIcon } from 'lucide-react';

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