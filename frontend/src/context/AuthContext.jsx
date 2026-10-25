import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as authService from '../services/authService';

const AuthContext = createContext(null);

function mapSupabaseUser(supabaseUser) {
  const validRoles = ['student', 'officer', 'admin'];
  const metadata = supabaseUser.user_metadata || {};
  const role = validRoles.includes(supabaseUser.app_metadata?.role)
    ? supabaseUser.app_metadata.role
    : 'student';
  const name = metadata.full_name || metadata.name || supabaseUser.email?.split('@')[0] || 'Student';
  const user = { ...supabaseUser, name, role, usn: metadata.usn };
  return {
    user,
    role,
    profile: { ...metadata, ...user, name, email: supabaseUser.email, role },
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const sessionVersion = useRef(0);
  const requiresExplicitSignIn = useRef(
    new URLSearchParams(window.location.search).has('email_confirmed')
  );

  const applySession = useCallback((session) => {
    if (session?.user && requiresExplicitSignIn.current) return;
    const version = ++sessionVersion.current;
    if (!session?.user) {
      if (version !== sessionVersion.current) return;
      setUser(null);
      setRole(null);
      setProfile(null);
      return;
    }

    const state = mapSupabaseUser(session.user);
    setUser(state.user);
    setRole(state.role);
    setProfile(state.profile);
  }, []);

  useEffect(() => {
    let mounted = true;
    const syncSession = async (session) => {
      if (mounted) await applySession(session);
    };
    const unsubscribe = authService.onAuthStateChange((session) => { void syncSession(session); });

    authService.getSession()
      .then(syncSession)
      .catch(() => syncSession(null))
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; unsubscribe(); };
  }, [applySession]);

  const signIn = useCallback(async (credentials) => {
    const result = await authService.signIn(credentials);
    requiresExplicitSignIn.current = false;
    applySession(result.session);
    return result;
  }, [applySession]);

  const signUp = useCallback(async (details) => {
    return authService.signUp(details);
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setUser(null);
    setRole(null);
    setProfile(null);
  }, []);

  const value = { user, role, profile, loading, signIn, signUp, signOut };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
