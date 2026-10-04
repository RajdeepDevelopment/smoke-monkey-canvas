import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  /** Body text. Keep it specific about what is lost — deletion is not undoable here. */
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Shows the danger treatment. Use for anything that removes data. */
  tone?: 'default' | 'danger';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * In-app replacement for `window.confirm`.
 *
 * Native dialogs block the main thread, cannot be styled, and are dismissed
 * unpredictably in an embedded canvas surface — which made agent deletion look
 * broken. This renders through the same `.modal-*` primitives as the rest of the
 * app so it is themed, focusable and escape-closable like every other modal.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  busy = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const accent = tone === 'danger' ? 'hsl(var(--destructive))' : 'hsl(var(--primary))';

  return (
    <div className="modal-overlay" onClick={busy ? undefined : onCancel}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 420 }}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={20} color={accent} />
            <span className="modal-title">{title}</span>
          </div>
          <button className="modal-close-btn" onClick={onCancel} disabled={busy} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: 'hsl(var(--muted-foreground))' }}>
            {message}
          </p>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            className="btn-primary"
            onClick={onConfirm}
            disabled={busy}
            style={tone === 'danger' ? { background: accent } : undefined}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};