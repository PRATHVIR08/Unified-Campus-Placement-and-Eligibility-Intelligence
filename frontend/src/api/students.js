// Students API Client [P1]
import { apiClient } from './client';

export async function getStudentProfile() {
  return apiClient('/students/profile');
}

export async function updateStudentProfile(profileData) {
  return apiClient('/students/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
}
