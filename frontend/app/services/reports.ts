import { apiClient } from './api-client';

export const reportsService = {
  getAll: (params?: { regionId?: string; status?: string }) =>
    apiClient.get('/reports', params),
  create: (data: { description: string; location?: string; severity?: string; regionId?: string; photoUrl?: string; waterLevel?: number; latitude?: number; longitude?: number }) =>
    apiClient.post('/reports', data),
  update: (id: string, data: { status: string }) =>
    apiClient.patch(`/reports/${id}`, data),
};
