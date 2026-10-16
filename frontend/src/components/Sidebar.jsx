// Sidebar / Authenticated Layout  [P1]
// Left sidebar on desktop, collapsible top bar on mobile.
// Shows user name from AuthContext (skeleton if loading), role-based nav links.
import React, { useState, useEffect, useId } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Skeleton from './Skeleton';
import Button from './Button';

/* ---- Nav config by role ---------------------------------------- */
const STUDENT_NAV = [
  {
    label: 'Workspace',
    items: [
      { to: '/',            label: 'Dashboard',       icon: <HomeIcon /> },
      { to: '/drives',      label: 'Job Drives',      icon: <BriefcaseIcon /> },
      { to: '/applications',label: 'My Applications', icon: <FileTextIcon /> },
      { to: '/profile',     label: 'My Profile',      icon: <UserIcon /> },
    ],
  },
];

const OFFICER_NAV = [
  {
    label: 'Management',
    items: [
      { to: '/officer',          label: 'Dashboard',      icon: <HomeIcon /> },
      { to: '/officer/companies',label: 'Companies',      icon: <BuildingIcon /> },
      { to: '/officer/drives',   label: 'Drive Manager',  icon: <BriefcaseIcon /> },
    ],
  },
];

function getNavGroups(role) {
  if (role === 'officer' || role === 'admin') return OFFICER_NAV;
  return STUDENT_NAV;
}

/* ---- Icons (inline SVG, no CDN) --------------------------------- */
function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function BriefcaseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}
function FileTextIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function BuildingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22V12h6v10" /><line x1="9" y1="7" x2="9" y2="7.01" />
      <line x1="15" y1="7" x2="15" y2="7.01" /><line x1="9" y1="12" x2="9" y2="12.01" />
    </svg>
  );
}
function LayersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6"  y1="20" x2="6"  y2="14" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6"  x2="21" y2="6"  />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
function LogOutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

/* ---- Sidebar nav item ------------------------------------------- */
function SideNavItem({ to, label, icon, onClick }) {
  return (
    <NavLink
      to={to}
      end={to === '/' || to === '/officer'}
      className={({ isActive }) =>
        `sidebar-nav-item${isActive ? ' active' : ''}`
      }
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

/* ---- Main Sidebar component ------------------------------------- */
export default function Sidebar({ open, onClose }) {
  const { user, role, profile, loading, signOut } = useAuth();

  const navGroups = getNavGroups(role);

  const displayName = profile?.name || user?.email?.split('@')[0] || null;
  const avatarChar  = displayName ? displayName[0].toUpperCase() : '?';
  const displayRole = role || 'student';

  const handleSignOut = async () => {
    try { await signOut(); } catch { /* Supabase not connected yet */ }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Navigation">
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-name">Campus Placement</div>
          <div className="sidebar-brand-sub">Intelligence Portal</div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="sidebar-section-label">{group.label}</div>
              {group.items.map((item) => (
                <SideNavItem
                  key={item.to}
                  {...item}
                  onClick={onClose}
                />
              ))}
            </div>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar" aria-hidden="true">
              {loading ? '?' : avatarChar}
            </div>
            <div className="sidebar-user-info">
              {loading ? (
                <>
                  <Skeleton type="text" width="80%" />
                  <Skeleton type="text" width="50%" style={{ marginTop: 4 }} />
                </>
              ) : (
                <>
                  <div className="sidebar-user-name">{displayName || 'Unnamed user'}</div>
                  <div className="sidebar-user-role">{displayRole}</div>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            className="sidebar-nav-item btn-ghost"
            onClick={handleSignOut}
            style={{ width: '100%' }}
          >
            <LogOutIcon />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
