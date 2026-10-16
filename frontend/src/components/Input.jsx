// Input component  [P1]
// Accessible labeled input with hint, error, show/hide toggle, and required indicator.
import React, { useId, useState } from 'react';

/**
 * @param {string}  label
 * @param {string}  hint        - small helper text below label
 * @param {string}  error       - validation error (shown in red-ish outline, no red color)
 * @param {boolean} required
 * @param {boolean} showToggle  - adds show/hide button for password fields
 */
export default function Input({
  label,
  hint,
  error,
  required,
  showToggle,
  type = 'text',
  className = '',
  id: idProp,
  ...props
}) {
  const autoId = useId();
  const id = idProp || autoId;
  const hintId = hint  ? `${id}-hint`  : undefined;
  const errId  = error ? `${id}-error` : undefined;

  const [visible, setVisible] = useState(false);
  const inputType = showToggle ? (visible ? 'text' : 'password') : type;

  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`field ${className}`}>
      {label && (
        <label htmlFor={id} className={`field-label${required ? ' field-label-required' : ''}`}>
          {label}
        </label>
      )}
      {hint && (
        <span id={hintId} className="field-hint">{hint}</span>
      )}
      <div className="input-wrapper">
        <input
          id={id}
          type={inputType}
          aria-describedby={describedBy}
          aria-invalid={!!error}
          aria-required={required}
          className={`input${error ? ' input-error' : ''}`}
          {...props}
        />
        {showToggle && (
          <button
            type="button"
            className="input-suffix"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 0 }}
            onClick={() => setVisible(v => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
          >
            {visible ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>
      {error && (
        <span id={errId} className="field-error" role="alert">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </span>
      )}
    </div>
  );
}
