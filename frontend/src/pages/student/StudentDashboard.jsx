import React from 'react';

export default function Dashboard() {
  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Dashboard</h1>
      
      <div className="hero-banner">
        <div style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem', opacity: 0.9 }}>
          Your Career Journey Starts Here
        </div>
        <h1>Build your future. Discover your next opportunity.</h1>
        <p>Explore job opportunities matched to your academic profile.</p>
        <button className="banner-btn">Explore Job Drives &rarr;</button>
      </div>

      {/* Stats Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
          <h4 style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: '500' }}>Total Job Drives</h4>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem' }}>6</div>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
          <h4 style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: '500' }}>Eligible Opportunities</h4>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem', color: '#16a34a' }}>6</div>
        </div>
      </div>
    </div>
  );
}