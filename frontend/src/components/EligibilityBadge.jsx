import React from 'react';

export default function EligibilityBadge({ status }) {
  const getStyle = () => {
    switch (status?.toLowerCase()) {
      case 'eligible':
        return { background: '#dcfce7', color: '#16a34a' };
      case 'pending':
        return { background: '#fef9c3', color: '#ca8a04' };
      default:
        return { background: '#fee2e2', color: '#dc2626' };
    }
  };

  return (
    <span style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600', ...getStyle() }}>
      {status || 'Unknown'}
    </span>
  );
}