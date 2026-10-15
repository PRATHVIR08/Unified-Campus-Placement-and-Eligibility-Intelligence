// Applications API Client [P1]
import { apiClient } from './client';

export async function applyForDrive(driveId) {
  return apiClient('/applications', {
    method: 'POST',
    body: JSON.stringify({ driveId }),
  });
}

export async function fetchMyApplications() {
  return apiClient('/applications/my');
}

export async function updateApplicationStatus(applicationId, status) {
  return apiClient(`/applications/${applicationId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
