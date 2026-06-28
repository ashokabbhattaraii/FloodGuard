import { apiClient } from './api-client';

export const regionsService = {
  getAll: () => apiClient.get('/regions'),

  getOne: (id: string) => apiClient.get(`/regions/${id}`),

  getStatus: (id: string) => apiClient.get(`/regions/${id}/status`),

  create: (data: {
    name: string;
    description?: string;
    coordinates?: unknown;
    centerLat?: number;
    centerLng?: number;
    population?: number;
    area?: number;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    adminId?: string;
  }) => apiClient.post('/regions', data),

  update: (
    id: string,
    data: {
      name?: string;
      description?: string;
      coordinates?: unknown;
      centerLat?: number;
      centerLng?: number;
      population?: number;
      area?: number;
      riskLevel?: 'low' | 'medium' | 'high' | 'critical';
      adminId?: string;
    }
  ) => apiClient.put(`/regions/${id}`, data),

  delete: (id: string) => apiClient.delete(`/regions/${id}`),

  // Volunteers
  getVolunteers: (regionId: string) => apiClient.get(`/regions/${regionId}/volunteers`),

  assignVolunteer: (regionId: string, userId: string) =>
    apiClient.post(`/regions/${regionId}/volunteers`, { userId }),

  removeVolunteer: (regionId: string, userId: string) =>
    apiClient.delete(`/regions/${regionId}/volunteers/${userId}`),

  // Sensors
  getSensors: (regionId: string) => apiClient.get(`/regions/${regionId}/sensors`),

  createSensor: (
    regionId: string,
    data: {
      type: 'water_level' | 'rainfall';
      name: string;
      latitude?: number;
      longitude?: number;
      threshold: number;
      currentValue: number;
      unit?: string;
    }
  ) => apiClient.post(`/regions/${regionId}/sensors`, data),

  updateSensor: (
    regionId: string,
    sensorId: string,
    data: {
      name?: string;
      latitude?: number;
      longitude?: number;
      threshold?: number;
      currentValue?: number;
      isActive?: boolean;
    }
  ) => apiClient.put(`/regions/${regionId}/sensors/${sensorId}`, data),

  deleteSensor: (regionId: string, sensorId: string) =>
    apiClient.delete(`/regions/${regionId}/sensors/${sensorId}`),
};
