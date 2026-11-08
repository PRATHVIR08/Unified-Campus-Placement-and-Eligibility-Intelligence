// ProtectedRoute  [P1]
// Redirects unauthenticated users to /login and shows a spinner while loading.
import React from 'react';
import { Navigate } from 'react-router-dom';
import { getDashboardPath, useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

/**
 * @param {string[]} [allowedRoles]  - if provided, also enforces role check
 * @param {JSX.Element} children
 */
export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="spinner-center" style={{ height: '100vh' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to={getDashboardPath(role)} replace />;
  }

  return children;
}
