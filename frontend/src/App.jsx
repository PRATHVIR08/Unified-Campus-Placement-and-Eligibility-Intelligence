// App.jsx  [P1]
// Root router — keeps all existing route paths intact.
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, getDashboardPath, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import Spinner from './components/Spinner';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';

// Pages — student
import Login          from './pages/Login';
import StudentDashboard from './pages/student/StudentDashboard';
import DriveList      from './pages/student/DriveList';
import DriveDetails   from './pages/student/DriveDetails';
import MyApplications from './pages/student/MyApplications';
import Profile        from './pages/student/Profile';

// Pages — officer
import OfficerDashboard from './pages/officer/OfficerDashboard';
import Companies        from './pages/officer/Companies';
import DriveManage      from './pages/officer/DriveManage';

const STUDENT = ['STUDENT'];
const DRIVE_MANAGERS = ['OFFICER', 'ADMIN', 'RECRUITER'];
const STAFF = ['OFFICER', 'ADMIN'];

/* ---- Authenticated app layout ----------------------------------- */
function AuthenticatedLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { role } = useAuth();

  return (
    <div className="app-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        {/* Mobile top bar */}
        <div className="mobile-topbar">
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={sidebarOpen}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6"  x2="21" y2="6"  />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="mobile-topbar-title">Campus Placement</span>
        </div>

        <div className="content-body">
          <Routes>
            {/* Student routes */}
            <Route path="/" element={<ProtectedRoute allowedRoles={STUDENT}><StudentDashboard /></ProtectedRoute>} />
            <Route path="/drives" element={<ProtectedRoute allowedRoles={STUDENT}><DriveList /></ProtectedRoute>} />
            <Route path="/drives/:id" element={<ProtectedRoute allowedRoles={STUDENT}><DriveDetails /></ProtectedRoute>} />
            <Route path="/applications" element={<ProtectedRoute allowedRoles={STUDENT}><MyApplications /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute allowedRoles={STUDENT}><Profile /></ProtectedRoute>} />

            {/* Staff and recruiter management routes */}
            <Route path="/officer" element={<ProtectedRoute allowedRoles={STAFF}><OfficerDashboard /></ProtectedRoute>} />
            <Route path="/officer/companies" element={<ProtectedRoute allowedRoles={DRIVE_MANAGERS}><Companies /></ProtectedRoute>} />
            <Route path="/officer/drives" element={<ProtectedRoute allowedRoles={DRIVE_MANAGERS}><DriveManage /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to={getDashboardPath(role)} replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

/* ---- Root app with auth gate ------------------------------------ */
function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="spinner-center" style={{ height: '100vh' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*"      element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return <AuthenticatedLayout />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <AppContent />
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}