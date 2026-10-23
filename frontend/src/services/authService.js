import { apiClient } from '../api/client';
import { requireSupabase } from '../lib/supabaseClient';

export async function signUp({ name, email, usn, password }) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: { full_name: name.trim(), usn: usn.trim().toUpperCase() } },
  });
  if (error) throw new Error(error.message);

  // Supabase may require email confirmation before it provides a session.
  // When a session is available, provision the matching student row now.
  if (data.session) await apiClient('/auth/provision', { method: 'POST' });
  return data;
}

export async function signIn({ email, password }) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw new Error(error.message);
  await apiClient('/auth/provision', { method: 'POST' });
  return data;
}

export async function signOut() {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw new Error(error.message);
}

export async function provisionStudentProfile() {
  return apiClient('/auth/provision', { method: 'POST' });
}

export async function getSession() {
  const { data, error } = await requireSupabase().auth.getSession();
  if (error) throw new Error(error.message);
  return data.session;
}

export function onAuthStateChange(callback) {
  const { data } = requireSupabase().auth.onAuthStateChange((_event, session) => {
    // Let Supabase release its auth lock before callback code calls getSession.
    setTimeout(() => callback(session), 0);
  });
  return () => data.subscription.unsubscribe();
}
