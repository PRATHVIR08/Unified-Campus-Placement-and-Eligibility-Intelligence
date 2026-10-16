// Auth Service Abstraction  [P1]
// ---------------------------------------------------------------
// Replace the bodies of the functions below when Supabase is ready.
// Do NOT change the function signatures — they are used by AuthContext.
// ---------------------------------------------------------------

/**
 * TODO: Replace with Supabase sign-up when connecting auth.
 *
 * import { supabase } from '../lib/supabaseClient';
 *
 * async function signUp({ name, email, usn, password }) {
 *   const { data, error } = await supabase.auth.signUp({
 *     email,
 *     password,
 *     options: {
 *       data: {
 *         full_name: name,   // stored in auth.users.raw_user_meta_data
 *         usn,               // stored in auth.users.raw_user_meta_data
 *       },
 *     },
 *   });
 *   if (error) throw new Error(error.message);
 *
 *   // Also insert into your custom "profiles" table:
 *   // await supabase.from('profiles').insert({ id: data.user.id, usn, name, role: 'student' });
 *
 *   return data;
 * }
 */
export async function signUp({ name, email, usn, password }) {
  return Promise.reject(new Error('Auth service is not connected yet'));
}

/**
 * TODO: Replace with Supabase sign-in when connecting auth.
 *
 * import { supabase } from '../lib/supabaseClient';
 *
 * async function signIn({ email, password }) {
 *   const { data, error } = await supabase.auth.signInWithPassword({ email, password });
 *   if (error) throw new Error(error.message);
 *   return data;
 * }
 */
export async function signIn({ email, password }) {
  return Promise.reject(new Error('Auth service is not connected yet'));
}

/**
 * TODO: Replace with Supabase sign-out when connecting auth.
 *
 * import { supabase } from '../lib/supabaseClient';
 *
 * async function signOut() {
 *   const { error } = await supabase.auth.signOut();
 *   if (error) throw new Error(error.message);
 * }
 */
export async function signOut() {
  return Promise.reject(new Error('Auth service is not connected yet'));
}

/**
 * TODO: Replace with Supabase session retrieval when connecting auth.
 *
 * import { supabase } from '../lib/supabaseClient';
 *
 * async function getSession() {
 *   const { data: { session } } = await supabase.auth.getSession();
 *   return session;   // null if not logged in
 * }
 */
export async function getSession() {
  // Resolves to null (not logged in) until Supabase is connected.
  return null;
}

/**
 * TODO: Replace with Supabase auth state listener when connecting auth.
 *
 * import { supabase } from '../lib/supabaseClient';
 *
 * function onAuthStateChange(callback) {
 *   const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
 *     callback(session);
 *   });
 *   return () => subscription.unsubscribe();  // return unsubscribe function
 * }
 *
 * The callback receives the Supabase Session object or null.
 * AuthContext uses the session to derive the user, role, and profile.
 * Role comes from the "profiles" table, never from the JWT/user-metadata directly.
 */
export function onAuthStateChange(callback) {
  // No-op until Supabase is connected — returns a no-op unsubscribe function.
  return () => {};
}
