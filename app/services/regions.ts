import { apiClient } from './api-client';

export const regionsService = {
  getAll: () =>
    apiClient.get('/regions'),
  getStatus: (id: string) =>
    apiClient.get(`/regions/${id}/status`),
  create: (data: { name: string; coordinates?: unknown }) =>
    apiClient.post('/regions', data),
};
