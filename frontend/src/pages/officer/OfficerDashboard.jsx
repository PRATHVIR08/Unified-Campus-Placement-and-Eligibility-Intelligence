import React from 'react';
import DataTable from '../../components/DataTable';
import EligibilityBadge from '../../components/EligibilityBadge';

export default function OfficerDashboard() {
  const columns = [
    { header: 'Student Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'CGPA', accessor: 'cgpa' },
    { header: 'Eligibility Status', accessor: 'statusComponent' }
  ];

  const mockData = [
    { name: 'Alex Johnson', email: 'alex@uni.edu', cgpa: '8.8', statusComponent: <EligibilityBadge status="Eligible" /> },
    { name: 'Sarah Williams', email: 'sarah@uni.edu', cgpa: '6.4', statusComponent: <EligibilityBadge status="Not Eligible" /> }
  ];

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem', color: '#1e293b' }}>Placement Officer Dashboard</h1>
      <DataTable columns={columns} data={mockData} />
    </div>
  );
}