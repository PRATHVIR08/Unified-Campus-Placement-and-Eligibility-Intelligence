import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [role, setRole] = useState('student');
  const { login } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    login({ role });
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
      <div style={{ background: 'white', padding: '2.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%', maxWidth: '380px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center', color: '#1e293b' }}>Portal Login</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>Select Role</label>
            <select 
              value={role} 
              onChange={(e) => setRole(e.target.value)}
              style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
            >
              <option value="student">Student</option>
              <option value="officer">Placement Officer</option>
            </select>
          </div>
          <button type="submit" style={{ width: '100%', padding: '0.7rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
            Login
          </button>
        </form>
      </div>
    </div>
  );
}