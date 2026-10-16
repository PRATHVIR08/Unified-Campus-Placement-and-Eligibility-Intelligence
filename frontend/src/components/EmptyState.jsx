// EmptyState component  [P1]
import React from 'react';

/**
 * @param {JSX.Element} [icon]
 * @param {string}      title
 * @param {string}      description
 * @param {JSX.Element} [action]  - optional Button element
 */
export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state" role="status">
      {icon && (
        <div className="empty-state-icon" aria-hidden="true">
          {icon}
        </div>
      )}
      <p className="empty-state-title">{title}</p>
      {description && <p className="empty-state-desc">{description}</p>}
      {action && <div style={{ marginTop: 'var(--space-4)' }}>{action}</div>}
    </div>
  );
}
