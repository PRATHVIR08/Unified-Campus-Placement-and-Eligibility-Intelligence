import { apiClient } from './client';

export async function fetchFilterOptions() {
  return apiClient('/job-drives/filter-options');
}

export async function fetchSavedFilters() {
  return apiClient('/students/me/filters');
}

export async function saveFilter(payload) {
  return apiClient('/students/me/filters', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateSavedFilter(id, payload) {
  return apiClient(`/students/me/filters/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteSavedFilter(id) {
  return apiClient(`/students/me/filters/${id}`, { method: 'DELETE' });
}
