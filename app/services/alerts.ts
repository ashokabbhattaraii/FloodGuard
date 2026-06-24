import { apiClient } from './api-client';

export const alertsService = {
  getAll: (regionId?: string) =>
    apiClient.get('/alerts', regionId ? { regionId } : undefined),
  getOne: (id: string) =>
    apiClient.get(`/alerts/${id}`),
  create: (data: { title: string; description: string; severity: string; regionId: string }) =>
    apiClient.post('/alerts', data),
  update: (id: string, data: Record<string, unknown>) =>
    apiClient.patch(`/alerts/${id}`, data),
};
