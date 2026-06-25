import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { regionsService } from '@/app/services/regions';

export function useRegions() {
  return useQuery({
    queryKey: ['regions'],
    queryFn: regionsService.getAll,
    refetchInterval: 120000,
  });
}

export function useRegionStatus(id: string) {
  return useQuery({
    queryKey: ['regions', id, 'status'],
    queryFn: () => regionsService.getStatus(id),
    enabled: !!id,
  });
}

export function useCreateRegion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: regionsService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['regions'] }),
  });
}
