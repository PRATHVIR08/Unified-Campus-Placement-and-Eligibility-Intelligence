// Spinner component  [P1]
import React from 'react';

/** @param {'sm'|'md'|'lg'} size */
export default function Spinner({ size = 'sm', className = '' }) {
  return (
    <span
      className={`spinner ${size === 'lg' ? 'spinner-lg' : ''} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
