import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { evacuationService } from '@/app/services/evacuation';

export function useEvacuationRoutes() {
  return useQuery({
    queryKey: ['evacuation-routes'],
    queryFn: evacuationService.getAll,
  });
}

export function useEvacuationRoute(id: string) {
  return useQuery({
    queryKey: ['evacuation-routes', id],
    queryFn: () => evacuationService.getById(id),
    enabled: !!id,
  });
}

export function useCreateEvacuationRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: evacuationService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evacuation-routes'] });
    },
  });
}

export function useUpdateEvacuationRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      evacuationService.update(id, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['evacuation-routes'] });
      qc.invalidateQueries({ queryKey: ['evacuation-routes', variables.id] });
    },
  });
}

export function useDeleteEvacuationRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: evacuationService.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evacuation-routes'] });
    },
  });
}
