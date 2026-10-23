// Role comes from the Express API, which loads it from PostgreSQL.
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as authService from '../services/authService';
import { getCurrentUser } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const sessionVersion = useRef(0);

  const applySession = useCallback(async (session) => {
    const version = ++sessionVersion.current;
    if (!session?.user) {
      setUser(null);
      setRole(null);
      setProfile(null);
      return;
    }

    setRole(null);
    try {
      await authService.provisionStudentProfile();
      const result = await getCurrentUser();
      if (version !== sessionVersion.current) return;
      const databaseUser = result.user;
      setUser({ ...session.user, ...databaseUser });
      setRole(databaseUser.role);
      setProfile(databaseUser);
    } catch {
      // Do not enter the app until the backend has resolved the database role.
      if (version !== sessionVersion.current) return;
      setUser(null);
      setRole(null);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const syncSession = async (session) => {
      if (mounted) await applySession(session);
    };
    let unsubscribe = () => {};
    try {
      unsubscribe = authService.onAuthStateChange((session) => { void syncSession(session); });
    } catch {
      // Keep the app loadable when environment values have not been configured.
    }

    authService.getSession()
      .then(syncSession)
      .catch(() => syncSession(null))
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; unsubscribe(); };
  }, [applySession]);

  const signIn = useCallback(async (credentials) => {
    const result = await authService.signIn(credentials);
    await applySession(result.session);
    return result;
  }, [applySession]);

  const signUp = useCallback((details) => authService.signUp(details), []);

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
