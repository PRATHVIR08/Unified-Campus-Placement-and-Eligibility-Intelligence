// Job Drives API Client [P1]
import { apiClient } from './client';

export async function fetchAllDrives(params) {
  const query = params?.toString?.();
  return apiClient(`/drives${query ? `?${query}` : ''}`);
}

// Student pages need the full active drive set for accurate browsing and stats.
// Keep requests bounded while following the API's pagination metadata.
export async function fetchAllStudentDrives(params) {
  const queryParams = new URLSearchParams(params?.toString?.() || '');
  queryParams.set('limit', '100');

  const drives = [];
  let page = 1;
  let total = Infinity;
  while (drives.length < total) {
    queryParams.set('page', String(page));
    const response = await fetchAllDrives(queryParams);
    const pageDrives = response?.data || [];
    drives.push(...pageDrives);
    if (!response?.pagination || pageDrives.length === 0) break;
    total = Number(response.pagination.total);
    if (!Number.isFinite(total)) break;
    page += 1;
  }
  return drives;
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

export async function updateDrive(id, driveData) {
  return apiClient(`/drives/${id}`, {
    method: 'PUT',
    body: JSON.stringify(driveData),
  });
}

export async function updateDriveStatus(id, status) {
  return apiClient(`/drives/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function deleteDrive(id) {
  return apiClient(`/drives/${id}`, { method: 'DELETE' });
}
