import React, { useState } from 'react';

export default function DriveList() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const drives = [
    {
      id: 1,
      company: 'Infosys',
      role: 'Systems Engineer',
      package: '₹3.6 LPA',
      minCgpa: '6',
      backlogs: 'None',
      deadline: '2026-11-15',
      departments: 'CSE, ISE, IT, ECE',
      eligible: true,
      initial: 'I',
      logoBg: '#dbeafe',
      logoColor: '#1d4ed8'
    },
    {
      id: 2,
      company: 'TCS',
      role: 'Assistant System Engineer',
      package: '₹3.8 LPA',
      minCgpa: '6',
      backlogs: 'None',
      deadline: '2026-11-20',
      departments: 'CSE, ISE, IT, ECE, EEE',
      eligible: true,
      initial: 'T',
      logoBg: '#fef3c7',
      logoColor: '#b45309'
    },
    {
      id: 3,
      company: 'Wipro',
      role: 'Project Engineer',
      package: '₹3.5 LPA',
      minCgpa: '6.5',
      backlogs: 'None',
      deadline: '2026-11-25',
      departments: 'CSE, ISE, IT',
      eligible: true,
      initial: 'W',
      logoBg: '#e0e7ff',
      logoColor: '#4338ca'
    },
    {
      id: 4,
      company: 'Accenture',
      role: 'Associate Software Engineer',
      package: '₹4.5 LPA',
      minCgpa: '7',
      backlogs: 'None',
      deadline: '2026-11-30',
      departments: 'CSE, ISE',
      eligible: false,
      initial: 'A',
      logoBg: '#fce7f3',
      logoColor: '#be185d'
    }
  ];

  const filteredDrives = drives.filter(d => 
    d.company.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Unique Drive List Header */}
      <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', padding: '2rem', borderRadius: '12px', color: 'white', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Campus Placement Drives</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
          Explore all active company recruitment drives, review eligibility requirements, and submit applications.
        </p>
        
        {/* Search Input inside Banner */}
        <div style={{ maxWidth: '400px' }}>
          <input 
            type="text" 
            placeholder="Search by company or role..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: 'none', outline: 'none', fontSize: '0.9rem' }}
          />
        </div>
      </div>

      {/* Drives Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {filteredDrives.map((drive) => (
          <div key={drive.id} style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: drive.logoBg, color: drive.logoColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem' }}>
                  {drive.initial}
                </div>
                <span style={{ background: drive.eligible ? '#dcfce7' : '#fee2e2', color: drive.eligible ? '#166534' : '#991b1b', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600' }}>
                  {drive.eligible ? '✓ Eligible' : '✕ Not Eligible'}
                </span>
              </div>

              <h3 style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: '700' }}>{drive.company}</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>{drive.role}</p>

              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Annual Package</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#0f172a', marginTop: '0.2rem' }}>{drive.package}</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: '#475569', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Minimum CGPA:</span>
                  <span style={{ fontWeight: '600' }}>{drive.minCgpa}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Backlogs allowed:</span>
                  <span style={{ fontWeight: '600' }}>{drive.backlogs}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Application Deadline:</span>
                  <span style={{ fontWeight: '600' }}>{drive.deadline}</span>
                </div>
                <div style={{ marginTop: '0.25rem' }}>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Eligible branches:</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: '500', color: '#1e293b' }}>{drive.departments}</span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => alert(`Applied for ${drive.company}`)}
              disabled={!drive.eligible}
              style={{ 
                width: '100%', 
                background: drive.eligible ? '#2563eb' : '#94a3b8', 
                color: 'white', 
                border: 'none', 
                padding: '0.65rem', 
                borderRadius: '6px', 
                cursor: drive.eligible ? 'pointer' : 'not-allowed', 
                fontWeight: '600',
                fontSize: '0.9rem' 
              }}
            >
              {drive.eligible ? 'Apply for Drive →' : 'Criteria Not Met'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}