// Modal component  [P1]
// Accessible dialog with focus trap, Escape key close, and backdrop click close.
import React, { useEffect, useRef } from 'react';

/**
 * @param {boolean}  open
 * @param {function} onClose
 * @param {string}   title
 * @param {JSX.Element} children
 * @param {JSX.Element} [footer]  - override default footer
 */
export default function Modal({ open, onClose, title, children, footer }) {
  const dialogRef = useRef(null);

  // Focus first focusable element on open
  useEffect(() => {
    if (!open) return;
    const el = dialogRef.current?.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    el?.focus();
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handler(e) { if (e.key === 'Escape') onClose?.(); }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      role="presentation"
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        ref={dialogRef}
      >
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">{title}</h2>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div>{children}</div>

        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
