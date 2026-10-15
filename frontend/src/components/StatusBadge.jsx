import React from 'react';

export default function StatusBadge({ text }) {
  return (
    <span style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600', background: '#dcfce7', color: '#16a34a' }}>
      {text || 'Active'}
    </span>
  );
}