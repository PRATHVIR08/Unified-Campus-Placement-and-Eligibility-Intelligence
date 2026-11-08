import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as authService from '../services/authService';
import { getCurrentUser } from '../api/auth';

const AuthContext = createContext(null);
const VALID_ROLES = ['STUDENT', 'OFFICER', 'RECRUITER', 'ADMIN'];

export function getDashboardPath(role) {
  if (role === 'OFFICER' || role === 'ADMIN') return '/officer';
  if (role === 'RECRUITER') return '/officer/drives';
  return '/';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const sessionVersion = useRef(0);
  const requiresExplicitSignIn = useRef(
    new URLSearchParams(window.location.search).has('email_confirmed')
  );

  const applySession = useCallback(async (session) => {
    if (session?.user && requiresExplicitSignIn.current) return;
    const version = ++sessionVersion.current;
    if (!session?.user) {
      setUser(null);
      setRole(null);
      setProfile(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (!session.access_token) throw new Error('Supabase session has no access token');
      const response = await getCurrentUser(session.access_token);
      if (version !== sessionVersion.current) return;

      const backendProfile = response.user;
      const normalizedRole = String(backendProfile?.role || '').toUpperCase();
      if (!backendProfile?.id || !VALID_ROLES.includes(normalizedRole)) {
        throw new Error('The authenticated profile has no valid role');
      }

      const nextProfile = {
        id: backendProfile.id,
        email: backendProfile.email,
        fullName: backendProfile.fullName,
        role: normalizedRole,
      };
      setUser(nextProfile);
      setRole(normalizedRole);
      setProfile(nextProfile);
      setLoading(false);
    } catch (sessionError) {
      if (version !== sessionVersion.current) return;
      setUser(null);
      setRole(null);
      setProfile(null);
      setError(sessionError);
      setLoading(false);
      throw sessionError;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const handleSessionError = (sessionError) => {
      if (!mounted) return;
      sessionVersion.current += 1;
      setError(sessionError);
      setUser(null);
      setRole(null);
      setProfile(null);
      setLoading(false);
    };
    const syncSession = async (session) => {
      if (mounted) await applySession(session);
    };
    const unsubscribe = authService.onAuthStateChange((session) => {
      void syncSession(session).catch(handleSessionError);
    });

    authService.getSession()
      .then(syncSession)
      .catch(handleSessionError)
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; unsubscribe(); };
  }, [applySession]);

  const signIn = useCallback(async (credentials) => {
    const result = await authService.signIn(credentials);
    requiresExplicitSignIn.current = false;
    await applySession(result.session);
    return result;
  }, [applySession]);

  const signUp = useCallback(async (details) => {
    return authService.signUp(details);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authService.signOut();
    } finally {
      sessionVersion.current += 1;
      setUser(null);
      setRole(null);
      setProfile(null);
      setError(null);
      setLoading(false);
    }
  }, []);

  const value = { user, role, profile, loading, error, signIn, signUp, signOut };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
