// API client: uses the active Supabase access token for protected API requests.

const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
import { requireSupabase } from '../lib/supabaseClient';

export async function apiClient(endpoint, options = {}) {
  const { data: { session }, error: sessionError } = await requireSupabase().auth.getSession();
  if (sessionError) throw new Error(sessionError.message);

  const headers = {
    ...(options.body && { 'Content-Type': 'application/json' }),
    ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }

  return data;
}
