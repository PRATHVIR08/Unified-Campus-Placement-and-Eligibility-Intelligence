import React, { useState } from 'react';

export default function Profile() {
  const [profile, setProfile] = useState({
    name: 'Alex Johnson',
    email: 'alex.student@campus.edu',
    department: 'Computer Science',
    degree: 'B.Tech',
    cgpa: '8.4',
    graduation_year: '2026',
    backlogs: '0',
  });

  const [saved, setSaved] = useState(false);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
    setSaved(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaved(true);
  };

  return (
    <div style={{ maxWidth: '700px' }}>
      <h1 style={{ marginBottom: '0.5rem', color: '#1e293b' }}>My Profile & Academic Record</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Update your personal and academic details below.</p>

      {saved && (
        <div style={{ background: '#dcfce7', color: '#166534', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.5rem', border: '1px solid #bbf7d0' }}>
          Profile updated successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ background: 'white', padding: '2rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#334155' }}>Full Name</label>
            <input type="text" name="name" value={profile.name} onChange={handleChange} style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#334155' }}>Institutional Email</label>
            <input type="email" name="email" value={profile.email} disabled style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#94a3b8' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#334155' }}>Department</label>
            <input type="text" name="department" value={profile.department} onChange={handleChange} style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#334155' }}>Degree</label>
            <input type="text" name="degree" value={profile.degree} onChange={handleChange} style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#334155' }}>CGPA (0-10)</label>
            <input type="number" step="0.1" name="cgpa" value={profile.cgpa} onChange={handleChange} style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#334155' }}>Graduation Year</label>
            <input type="number" name="graduation_year" value={profile.graduation_year} onChange={handleChange} style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#334155' }}>Backlogs</label>
            <input type="number" name="backlogs" value={profile.backlogs} onChange={handleChange} style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
          </div>
        </div>

        <div>
          <button type="submit" style={{ background: '#2563eb', color: 'white', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}