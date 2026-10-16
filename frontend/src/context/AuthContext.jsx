// AuthContext  [P1]
// Provides: user, role, profile, loading, signIn, signUp, signOut
// Role and profile come from the session/profiles table — never from user input.
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [role, setRole]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ----------------------------------------------------------------
  // On mount: check existing session and subscribe to auth changes.
  // ----------------------------------------------------------------
  useEffect(() => {
    let unsubscribe = () => {};

    async function init() {
      try {
        const session = await authService.getSession();
        applySession(session);
      } catch {
        // getSession is a no-op until Supabase is connected → session is null
        setUser(null);
        setRole(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }

    // Subscribe to future auth state changes
    unsubscribe = authService.onAuthStateChange((session) => {
      applySession(session);
    });

    init();
    return () => unsubscribe();
  }, []);

  /**
   * Apply a session object to state.
   *
   * TODO (Supabase): when a real session arrives, fetch the profile row from
   *   the "profiles" table using session.user.id to get the role.
   *   Example:
   *     const { data } = await supabase
   *       .from('profiles')
   *       .select('*')
   *       .eq('id', session.user.id)
   *       .single();
   *     setRole(data.role);
   *     setProfile(data);
   */
  function applySession(session) {
    if (session?.user) {
      setUser(session.user);
      // Role will be populated from the profiles table — placeholder until then.
      setRole(session.user.role ?? null);
      setProfile(session.user.profile ?? null);
    } else {
      setUser(null);
      setRole(null);
      setProfile(null);
    }
  }

  // ----------------------------------------------------------------
  // Exposed methods
  // ----------------------------------------------------------------
  const signIn = useCallback(async ({ email, password }) => {
    const result = await authService.signIn({ email, password });
    // The onAuthStateChange callback will update state automatically once Supabase is connected.
    return result;
  }, []);

  const signUp = useCallback(async ({ name, email, usn, password }) => {
    // Role is always 'student' — never passed from the form.
    const result = await authService.signUp({ name, email, usn, password });
    return result;
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