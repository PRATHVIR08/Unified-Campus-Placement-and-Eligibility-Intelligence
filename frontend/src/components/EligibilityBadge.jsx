// EligibilityBadge component  [P1]
// Uses the shared Badge component — no color, shape/fill distinguishes eligibility.
import React from 'react';
import Badge from './Badge';

/**
 * @param {string} status  - 'eligible', 'not eligible', 'pending', etc.
 */
export default function EligibilityBadge({ status }) {
  return <Badge status={status || 'Unknown'} />;
}