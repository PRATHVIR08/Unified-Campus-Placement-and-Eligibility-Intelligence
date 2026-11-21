// ProtectedRoute  [P1]
// Redirects unauthenticated users to /login and shows a spinner while loading.
// Shows a recoverable error banner when the backend is unreachable (5xx/network).
import React from 'react';
import { Navigate } from 'react-router-dom';
import { getDashboardPath, useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

/**
 * @param {string[]} [allowedRoles]  - if provided, also enforces role check
 * @param {JSX.Element} children
 */
export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, role, loading, error } = useAuth();

  if (loading) {
    return (
      <div className="spinner-center" style={{ height: '100vh' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  // Server is reachable but returned a 5xx, or fetch() itself failed
  // (network down, backend not running). Do NOT redirect to /login — that
  // would silently swallow the real problem. Show a recoverable message.
  if (error?.isServerUnavailable) {
    return (
      <div
        className="spinner-center"
        style={{ height: '100vh', flexDirection: 'column', gap: '1rem', padding: '2rem', textAlign: 'center' }}
      >
        <p style={{ fontSize: '1.1rem', color: 'var(--color-error, #e53e3e)', maxWidth: 480 }}>
          Server is not reachable. Please try again.
        </p>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-muted, #718096)', maxWidth: 480 }}>
          The backend API could not be reached. This is usually a temporary issue.
          Check that the backend is running and the database is accessible, then refresh the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{ padding: '0.5rem 1.25rem', cursor: 'pointer', borderRadius: 6 }}
        >
          Retry
        </button>
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
