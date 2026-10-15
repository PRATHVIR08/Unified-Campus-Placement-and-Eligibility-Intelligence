import React from 'react';

// Application Status Badge Component [P1]
export default function StatusBadge({ status }) {
  const getBadgeClass = () => {
    switch (status) {
      case 'offered':
      case 'accepted':
        return 'badge-success';
      case 'in_interview':
      case 'shortlisted':
        return 'badge-warning';
      case 'rejected':
        return 'badge-danger';
      default:
        return 'badge-default';
    }
  };

  return <span className={`status-badge ${getBadgeClass()}`}>{status || 'applied'}</span>;
}
