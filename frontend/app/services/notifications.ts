import { apiClient } from './api-client';

export type NotificationType = 'alert' | 'request' | 'report' | 'shelter' | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  severity: string;
  readAt: string | null;
  createdAt: string;
}

export const notificationsService = {
  getAll: () => apiClient.get<AppNotification[]>('/notifications'),
  unreadCount: () => apiClient.get<{ count: number }>('/notifications/unread-count'),
  markRead: (id: string) => apiClient.patch<{ success: boolean }>(`/notifications/${id}/read`, {}),
  markAllRead: () => apiClient.patch<{ success: boolean }>('/notifications/read-all', {}),
  remove: (id: string) => apiClient.delete<{ success: boolean }>(`/notifications/${id}`),
};
