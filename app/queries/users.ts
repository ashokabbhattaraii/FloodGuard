import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/app/services/api-client';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.get('/users'),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { role?: string; status?: string } }) =>
      apiClient.patch(`/users/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}
