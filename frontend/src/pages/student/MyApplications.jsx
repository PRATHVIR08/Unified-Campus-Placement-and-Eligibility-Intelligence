import React, { useState } from 'react';

export default function MyApplications() {
  const [applications, setApplications] = useState([
    { id: 1, company_name: 'TechCorp Solutions', role: 'Software Engineer', applied_date: '2026-04-10', status: 'SHORTLISTED' },
    { id: 2, company_name: 'DataSystems Inc', role: 'Data Analyst', applied_date: '2026-04-12', status: 'APPLIED' },
  ]);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'SHORTLISTED': return { bg: '#e0f2fe', color: '#0369a1' };
      case 'SELECTED': return { bg: '#dcfce7', color: '#166534' };
      case 'REJECTED': return { bg: '#fee2e2', color: '#991b1b' };
      case 'WITHDRAWN': return { bg: '#f1f5f9', color: '#475569' };
      default: return { bg: '#fef9c3', color: '#854d0e' }; // APPLIED
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem', color: '#1e293b' }}>My Applications</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Track the status of your submitted job applications.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {applications.map((app) => {
          const badgeStyle = getStatusStyle(app.status);
          return (
            <div key={app.id} style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ color: '#0f172a', marginBottom: '0.25rem' }}>{app.company_name} - {app.role}</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0.25rem 0' }}>Applied on: {app.applied_date}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ background: badgeStyle.bg, color: badgeStyle.color, padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: '600' }}>
                  {app.status}
                </span>
                {app.status === 'APPLIED' && (
                  <button style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}>
                    Withdraw
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}