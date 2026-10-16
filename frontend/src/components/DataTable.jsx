// DataTable component  [P1]
// Sticky header, row hover, horizontal scroll, proper empty state.
import React from 'react';
import EmptyState from './EmptyState';

/**
 * @param {{ header: string, accessor: string|function }[]} columns
 * @param {object[]} data
 * @param {string} [emptyTitle]
 * @param {string} [emptyDescription]
 */
export default function DataTable({
  columns = [],
  data = [],
  emptyTitle = 'No records found',
  emptyDescription = 'There is no data to display yet.',
  className = '',
}) {
  return (
    <div className={`table-container ${className}`} style={{ overflowX: 'auto' }}>
      <table className="table" aria-label="Data table">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} scope="col">{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((row, rIdx) => (
              <tr key={row.id ?? rIdx}>
                {columns.map((col, cIdx) => (
                  <td key={cIdx}>
                    {typeof col.accessor === 'function'
                      ? col.accessor(row)
                      : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} style={{ padding: 0, border: 'none' }}>
                <EmptyState title={emptyTitle} description={emptyDescription} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}