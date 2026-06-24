import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsService } from '@/app/services/alerts';

export function useAlerts(regionId?: string) {
  return useQuery({
    queryKey: ['alerts', regionId],
    queryFn: () => alertsService.getAll(regionId),
  });
}

export function useAlert(id: string) {
  return useQuery({
    queryKey: ['alerts', id],
    queryFn: () => alertsService.getOne(id),
    enabled: !!id,
  });
}

export function useCreateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: alertsService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
}

export function useUpdateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      alertsService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
}
