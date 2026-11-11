// Auth API Client [P1]
import { apiClient } from './client';

export async function login(credentials) {
  return apiClient('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export async function register(details) {
  return apiClient('/auth/register', {
    method: 'POST',
    body: JSON.stringify(details),
  });
}

export async function getCurrentUser(accessToken) {
  return apiClient('/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function verifyPortal(accessToken, portal) {
  return apiClient('/auth/verify-portal', {
    method: 'POST',
    body: JSON.stringify({ portal }),
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
