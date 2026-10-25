import { requireSupabase, supabase } from '../lib/supabaseClient';

export async function signUp({ name, email, usn, password }) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/login?email_confirmed=1`,
      data: {
        full_name: name.trim(),
        usn: usn.trim().toUpperCase(),
      },
    },
  });

  if (error) throw new Error(error.message);
  const confirmationRequired = !data.session;
  if (data.session) {
    const { error: signOutError } = await client.auth.signOut();
    if (signOutError) throw new Error(signOutError.message);
  }

  return { source: 'supabase', ...data, session: null, confirmationRequired };
}

export async function signIn({ email, password }) {
  const { data, error } = await requireSupabase().auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) throw new Error(error.message);
  return { source: 'supabase', ...data };
}

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function getSession() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw new Error(error.message);

  const url = new URL(window.location.href);
  if (url.searchParams.has('email_confirmed')) {
    if (data.session) {
      const { error: signOutError } = await client.auth.signOut();
      if (signOutError) throw new Error(signOutError.message);
    }
    url.searchParams.delete('email_confirmed');
    url.searchParams.delete('code');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    return null;
  }

  return data.session;
}

export function onAuthStateChange(callback) {
  if (!supabase) return () => {};
  const client = supabase;
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => callback(session), 0);
  });

  return () => data.subscription.unsubscribe();
}
