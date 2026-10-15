import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="brand" style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#2563eb' }}>
        Campus Placement Intelligence
      </div>
      {user && (
        <div className="nav-links" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span>Role: <strong style={{ textTransform: 'capitalize' }}>{user.role}</strong></span>
          <button className="btn" onClick={logout} style={{ padding: '0.4rem 0.8rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}