// Auth API Client [P1]
import { apiClient } from './client';

export async function login(credentials) {
  return apiClient('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export async function getCurrentUser() {
  return apiClient('/auth/me');
}
