import { apiClient } from './client';

export async function fetchSkills() {
  return apiClient('/skills');
}
