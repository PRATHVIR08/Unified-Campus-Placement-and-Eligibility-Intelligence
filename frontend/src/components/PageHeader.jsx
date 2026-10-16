// PageHeader component  [P1]
import React from 'react';

/**
 * @param {string}      title
 * @param {string}      [description]
 * @param {JSX.Element} [actions]  - buttons/controls on the right
 */
export default function PageHeader({ title, description, actions }) {
  return (
    <div className="page-header">
      <div className="page-header-content">
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && (
        <div className="page-header-actions">{actions}</div>
      )}
    </div>
  );
}
