// Companies API Client
import { apiClient } from './client';

export async function fetchCompanies() {
  return apiClient('/companies');
}

export async function createCompany(companyData) {
  return apiClient('/companies', {
    method: 'POST',
    body: JSON.stringify(companyData),
  });
}