// StatusBadge component  [P1]
// Uses the shared Badge component — no color, shape/fill distinguishes status.
import React from 'react';
import Badge from './Badge';

/**
 * @param {string} status  - application/interview/offer status string
 */
export default function StatusBadge({ status }) {
  return <Badge status={status || 'Unknown'} />;
}