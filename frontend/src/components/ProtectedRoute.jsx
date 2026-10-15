import React from 'react';
import { useAuth } from '../context/AuthContext';

// Protected Route Guard Component [P1]
// Checks authentication and required role
export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-spinner">Loading authentication...</div>;
  }

  if (!user) {
    return <div className="auth-error">Access Denied: Please log in.</div>;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <div className="auth-error">Access Restricted: Insufficient permissions.</div>;
  }

  return children;
}
