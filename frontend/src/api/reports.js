// Reports API Client [P1]
import { apiClient } from './client';

export async function fetchDepartmentSummary() {
  return apiClient('/reports/department-summary');
}

export async function fetchFunnelMetrics() {
  return apiClient('/reports/funnel-metrics');
}
