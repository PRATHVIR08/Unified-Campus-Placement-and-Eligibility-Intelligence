// Badge component  [P1]
// Distinguishable without color: filled=positive, outlined=pending, dimmed=negative.
import React from 'react';

/**
 * Maps semantic status strings to badge variants.
 * Add or change mappings here — keep the badge-* classes in main.css.
 */
const POSITIVE_STATUSES = ['selected', 'offer_accepted', 'eligible', 'placed', 'active'];
const NEGATIVE_STATUSES = ['rejected', 'withdrawn', 'not eligible', 'not_eligible', 'inactive', 'closed'];

function getVariant(status) {
  const s = (status || '').toLowerCase();
  if (POSITIVE_STATUSES.includes(s)) return 'positive';
  if (NEGATIVE_STATUSES.includes(s)) return 'negative';
  return 'pending';
}

/**
 * @param {string} status  - semantic status label
 * @param {'positive'|'pending'|'negative'} [variant] - override auto-detection
 */
export default function Badge({ status, variant, className = '' }) {
  const v = variant || getVariant(status);
  const label = status || '—';

  return (
    <span className={`badge badge-${v} ${className}`}>
      {label}
    </span>
  );
}
