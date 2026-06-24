import { apiClient } from './api-client';

export interface EvacuationRoute {
  id: string;
  regionId: string;
  shelterName: string;
  capacity: number;
  routeData?: {
    instructions?: string;
    coordinates?: { lat: number; lng: number };
  } | null;
  regionName?: string;
}

export const evacuationService = {
  getAll: () =>
    apiClient.get<EvacuationRoute[]>('/evacuation-routes'),

  getById: (id: string) =>
    apiClient.get<EvacuationRoute>(`/evacuation-routes/${id}`),

  create: (data: { regionId: string; shelterName: string; capacity: number; routeData?: any }) =>
    apiClient.post<EvacuationRoute>('/evacuation-routes', data),

  update: (id: string, data: { regionId?: string; shelterName?: string; capacity?: number; routeData?: any }) =>
    apiClient.patch<EvacuationRoute>(`/evacuation-routes/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/evacuation-routes/${id}`),
};
