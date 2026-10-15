import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import StudentDashboard from './pages/student/StudentDashboard';
import DriveList from './pages/student/DriveList';
import MyApplications from './pages/student/MyApplications';
import Profile from './pages/student/Profile';

function SidebarLayout() {
  const { logout } = useAuth();

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-brand">CampusConnect</div>
        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
          Workspace
        </div>
        <ul className="sidebar-menu">
          <li><NavLink to="/" end>Dashboard</NavLink></li>
          <li><NavLink to="/drives">Job Drives</NavLink></li>
          <li><NavLink to="/applications">My Applications</NavLink></li>
          <li><NavLink to="/profile">My Profile</NavLink></li>
        </ul>
        <div style={{ marginTop: 'auto' }}>
          <button 
            onClick={logout} 
            style={{ width: '100%', padding: '0.6rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        <header className="topbar">
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Workspace / Navigation</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Academic Year 2026-27</span>
            <span style={{ background: '#f1f5f9', padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: '600' }}>
              Student
            </span>
          </div>
        </header>

        <div className="content-body">
          <Routes>
            <Route path="/" element={<StudentDashboard />} />
            <Route path="/drives" element={<DriveList />} />
            <Route path="/applications" element={<MyApplications />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { user } = useAuth();
  if (!user) return <Login />;
  return <SidebarLayout />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}