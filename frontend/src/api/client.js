// API client: attaches a JWT from local login or the active Supabase session.

import { supabase } from '../lib/supabaseClient';

const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export const AUTH_TOKEN_KEY = 'campus_placement_token';

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token) {
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  else localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

async function getAccessToken() {
  if (supabase) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);
    if (data?.session?.access_token) return data.session.access_token;
  }
  return getAuthToken();
}

export async function apiClient(endpoint, options = {}) {
  const token = await getAccessToken();
  const headers = {
    ...(options.body && { 'Content-Type': 'application/json' }),
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  let response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Cannot reach the backend API at ${BASE_URL}. Start the backend with "npm --prefix backend start" and retry.`);
    }
    throw error;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }

  return data;
}
