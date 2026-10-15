// Job Drives API Client [P1]
import { apiClient } from './client';

export async function fetchAllDrives() {
  return apiClient('/drives');
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
