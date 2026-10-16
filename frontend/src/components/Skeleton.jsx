// Skeleton component  [P1]
// Use instead of content while loading.
import React from 'react';

/**
 * @param {'text'|'text-lg'|'card'} type
 * @param {number} [count=1]  - number of skeleton lines/blocks
 * @param {string} [width]    - CSS width (default 100%)
 */
export default function Skeleton({ type = 'text', count = 1, width, style }) {
  const items = Array.from({ length: count });
  return (
    <>
      {items.map((_, i) => (
        <div
          key={i}
          className={`skeleton skeleton-${type}`}
          style={{ width: width || '100%', ...style }}
          aria-hidden="true"
        />
      ))}
    </>
  );
}

/** Pre-built skeleton for a typical stat card grid */
export function StatsSkeleton({ count = 4 }) {
  return (
    <div className="stats-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="stat-card">
          <Skeleton type="text" width="60%" />
          <Skeleton type="text-lg" width="40%" style={{ marginTop: 8 }} />
        </div>
      ))}
    </div>
  );
}

/** Pre-built skeleton for a table */
export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="table-container">
      <table className="table" aria-hidden="true">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}><Skeleton type="text" width="60%" /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}><Skeleton type="text" width={`${55 + Math.random() * 30}%`} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
