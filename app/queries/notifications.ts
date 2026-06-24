import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '@/app/services/notifications';

/** Poll the unread count frequently so the badge stays live. */
export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationsService.unreadCount,
    refetchInterval: 20000,
    refetchOnWindowFocus: true,
  });
}

/** Full notification list (fetched when the panel is opened, then polled). */
export function useNotifications(enabled = true) {
  return useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: notificationsService.getAll,
    enabled,
    refetchInterval: enabled ? 30000 : false,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsService.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
