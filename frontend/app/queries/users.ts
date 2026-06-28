import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '@/app/services/users';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: usersService.getAll,
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => usersService.getOne(id),
    enabled: !!id,
  });
}

export function usePendingVolunteers() {
  return useQuery({
    queryKey: ['users', 'pending-volunteers'],
    queryFn: usersService.getPendingVolunteers,
    refetchInterval: 30000,
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      usersService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersService.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useApproveVolunteer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersService.approveVolunteer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useRejectVolunteer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersService.rejectVolunteer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
