// Job Drives API Client [P1]
import { apiClient } from './client';

export async function fetchAllDrives(params) {
  const query = params?.toString?.();
  return apiClient(`/drives${query ? `?${query}` : ''}`);
}

export async function fetchDriveById(id) {
  return apiClient(`/drives/${id}`);
}

export async function createDrive(driveData) {
  return apiClient('/drives', {
    method: 'POST',
    body: JSON.stringify(driveData),
  });
}
