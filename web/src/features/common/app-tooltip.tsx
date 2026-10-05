import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface TooltipProps {
  content: React.ReactNode;
  shortcut?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  children: React.ReactElement;
  className?: string;
}

interface ActiveTooltipState {
  text: string;
  shortcut?: string;
  x: number;
  y: number;
  side: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Ensure tooltip text is concise, clean, and strictly 2 to 3 words.
 */
export function cleanTooltipText(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.trim();

  // Strip anything after separators like " — ", " - ", " : ", " (", " • "
  const sepIdx = cleaned.search(/\s+[—–:-]\s+|\s*[\(•]/);
  if (sepIdx > 0) {
    cleaned = cleaned.substring(0, sepIdx).trim();
  }

  // Remove trailing punctuation
  cleaned = cleaned.replace(/[.,:;!?]+$/, '').trim();

  // Enforce 2-3 words maximum
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length > 3) {
    return words.slice(0, 3).join(' ');
  }
  return cleaned;
}

/**
 * Universal Global Tooltip Component
 * Automatically hooks into all `title` and `data-tooltip` elements
 * in the DOM to replace native browser tooltips with a sleek,
 * glassmorphic desktop tooltip after holding for at least 1.5s.
 */
export const GlobalTooltipProvider: React.FC = () => {
  const [active, setActive] = useState<ActiveTooltipState | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentTargetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handlePointerEnter = (e: PointerEvent) => {
      const target = (e.target as HTMLElement | null)?.closest?.(
        '[data-tooltip]',
      ) as HTMLElement | null;

      if (!target) return;

      const rawText = target.getAttribute('data-tooltip') || '';
      const text = cleanTooltipText(rawText);
      if (!text) return;

      currentTargetRef.current = target;
      const shortcut = target.getAttribute('data-tooltip-shortcut') || undefined;
      const requestedSide = (target.getAttribute('data-tooltip-side') || 'top') as
        | 'top'
        | 'bottom'
        | 'left'
        | 'right';

      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      // Only show after user holds hover for at least 1.5 seconds (1500ms)
      timeoutRef.current = setTimeout(() => {
        if (currentTargetRef.current !== target) return;

        const rect = target.getBoundingClientRect();
        let side = requestedSide;

        // Auto-flip if overflowing viewport
        if (side === 'top' && rect.top < 45) side = 'bottom';
        if (side === 'bottom' && rect.bottom > window.innerHeight - 45) side = 'top';
        if (side === 'left' && rect.left < 80) side = 'right';
        if (side === 'right' && rect.right > window.innerWidth - 80) side = 'left';

        let x = rect.left + rect.width / 2;
        let y = rect.top;

        if (side === 'top') {
          y = rect.top - 8;
        } else if (side === 'bottom') {
          y = rect.bottom + 8;
        } else if (side === 'left') {
          x = rect.left - 8;
          y = rect.top + rect.height / 2;
        } else if (side === 'right') {
          x = rect.right + 8;
          y = rect.top + rect.height / 2;
        }

        // Clamp inside window horizontal boundaries
        x = Math.max(16, Math.min(window.innerWidth - 16, x));

        setActive({
          text,
          shortcut,
          x,
          y,
          side,
        });
      }, 1500);
    };

    const handlePointerLeave = (e: PointerEvent) => {
      const leavingTarget = (e.target as HTMLElement | null)?.closest?.(
        '[data-tooltip]',
      ) as HTMLElement | null;

      if (leavingTarget && currentTargetRef.current === leavingTarget) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        currentTargetRef.current = null;
        setActive(null);
      }
    };

    const handleDismiss = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      currentTargetRef.current = null;
      setActive(null);
    };

    document.addEventListener('pointerenter', handlePointerEnter, true);
    document.addEventListener('pointerleave', handlePointerLeave, true);
    document.addEventListener('scroll', handleDismiss, true);
    window.addEventListener('keydown', handleDismiss, true);

    return () => {
      document.removeEventListener('pointerenter', handlePointerEnter, true);
      document.removeEventListener('pointerleave', handlePointerLeave, true);
      document.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('keydown', handleDismiss, true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!active) return null;

  let transform = 'translate(-50%, -100%)';
  if (active.side === 'bottom') transform = 'translate(-50%, 0)';
  if (active.side === 'left') transform = 'translate(-100%, -50%)';
  if (active.side === 'right') transform = 'translate(0, -50%)';

  return createPortal(
    <div
      className="global-glass-tooltip"
      style={{
        position: 'fixed',
        left: `${active.x}px`,
        top: `${active.y}px`,
        transform,
        zIndex: 999999,
        pointerEvents: 'none',
      }}
    >
      <div className="tooltip-glass-box">
        <span className="tooltip-text">{active.text}</span>
        {active.shortcut && (
          <kbd className="tooltip-kbd">{active.shortcut}</kbd>
        )}
      </div>
      <div className={`tooltip-glass-arrow side-${active.side}`} />
    </div>,
    document.body,
  );
};

/**
 * Declarative Tooltip wrapper
 */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  shortcut,
  side = 'top',
  children,
}) => {
  if (typeof content !== 'string') {
    return children;
  }

  return React.cloneElement(
    children,
    {
      'data-tooltip': content,
      ...(shortcut ? { 'data-tooltip-shortcut': shortcut } : {}),
      'data-tooltip-side': side,
    } as React.HTMLAttributes<HTMLElement>,
  );
};
