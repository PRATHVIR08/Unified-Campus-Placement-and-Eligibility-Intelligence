import React from 'react';
import { useAuth } from '../context/AuthContext';

// Navigation Bar Component [P1]
export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="nav-brand">Campus Placement Intelligence</div>
      <div className="nav-links">
        {user ? (
          <>
            <span className="user-badge">{user.role}</span>
            <button onClick={logout} className="btn-logout">Logout</button>
          </>
        ) : (
          <span>Please Log In</span>
        )}
      </div>
    </nav>
  );
}
