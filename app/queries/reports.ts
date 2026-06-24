import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsService } from '@/app/services/reports';

export function useReports(params?: { regionId?: string; status?: string }) {
  return useQuery({
    queryKey: ['reports', params],
    queryFn: () => reportsService.getAll(params),
  });
}

export function useCreateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reportsService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  });
}

export function useUpdateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      reportsService.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  });
}
