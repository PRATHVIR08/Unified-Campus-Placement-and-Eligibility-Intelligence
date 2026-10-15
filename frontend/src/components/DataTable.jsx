import React from 'react';

export default function DataTable({ columns, data }) {
  return (
    <div className="table-container" style={{ background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
            {columns.map((col, idx) => (
              <th key={idx} style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#64748b' }}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data && data.length > 0 ? (
            data.map((row, rIdx) => (
              <tr key={rIdx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                {columns.map((col, cIdx) => (
                  <td key={cIdx} style={{ padding: '12px 16px', fontSize: '0.9rem' }}>{row[col.accessor]}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                No records found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}