import { apiClient } from './api-client';

export const floodRequestsService = {
  getAll: (params?: { status?: string; type?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.type) qs.set('type', params.type);
    return apiClient.get<any[]>(`/flood-requests?${qs.toString()}`);
  },
  getMy: () => apiClient.get<any[]>('/flood-requests/my'),
  getById: (id: string) => apiClient.get<any>(`/flood-requests/${id}`),
  create: (data: any) => apiClient.post<any>('/flood-requests', data),
  update: (id: string, data: any) => apiClient.patch<any>(`/flood-requests/${id}`, data),

  // Volunteer endpoints
  getUnclaimed: () => apiClient.get<any[]>('/flood-requests/unclaimed'),
  getAssignedToMe: () => apiClient.get<any[]>('/flood-requests/assigned-to-me'),
  claim: (id: string) => apiClient.patch<any>(`/flood-requests/${id}/claim`, {}),
  assign: (id: string, volunteerId: string) => apiClient.patch<any>(`/flood-requests/${id}/assign`, { volunteerId }),

  // Analytics
  getAnalytics: () => apiClient.get<any>('/flood-requests/analytics/summary'),
};
