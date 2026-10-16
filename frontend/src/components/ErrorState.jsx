// ErrorState component  [P1]
import React from 'react';
import Button from './Button';

/**
 * @param {string}   message    - error description to show
 * @param {function} [onRetry]  - if provided, shows a retry button
 */
export default function ErrorState({ message, onRetry }) {
  return (
    <div className="empty-state" role="alert">
      <div className="empty-state-icon" aria-hidden="true">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p className="empty-state-title">Something went wrong</p>
      <p className="empty-state-desc">{message || 'An unexpected error occurred.'}</p>
      {onRetry && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Button variant="secondary" onClick={onRetry}>Try again</Button>
        </div>
      )}
    </div>
  );
}
