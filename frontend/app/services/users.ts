import { apiClient } from './api-client';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  regionId?: string;
  isApproved: boolean;
  approvedAt?: string;
  createdAt: string;
}

export const usersService = {
  getAll: () => apiClient.get<User[]>('/users'),

  getOne: (id: string) => apiClient.get<User>(`/users/${id}`),

  getPendingVolunteers: () => apiClient.get<User[]>('/users/pending/volunteers'),

  update: (id: string, data: Partial<User>) =>
    apiClient.patch<User>(`/users/${id}`, data),

  delete: (id: string) => apiClient.delete<{ deleted: boolean }>(`/users/${id}`),

  approveVolunteer: (id: string) =>
    apiClient.patch<User>(`/users/${id}/approve`, {}),

  rejectVolunteer: (id: string) =>
    apiClient.delete<{ deleted: boolean; message: string }>(`/users/${id}/reject`),
};
