import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { floodRequestsService } from '@/app/services/flood-requests';

export function useFloodRequests(params?: { status?: string; type?: string }) {
  return useQuery({
    queryKey: ['flood-requests', 'all', params],
    queryFn: () => floodRequestsService.getAll(params),
  });
}

export function useMyFloodRequests() {
  return useQuery({
    queryKey: ['flood-requests', 'my'],
    queryFn: () => floodRequestsService.getMy(),
  });
}

export function useUnclaimedFloodRequests() {
  return useQuery({
    queryKey: ['flood-requests', 'unclaimed'],
    queryFn: () => floodRequestsService.getUnclaimed(),
  });
}

export function useAssignedToMeFloodRequests() {
  return useQuery({
    queryKey: ['flood-requests', 'assigned-to-me'],
    queryFn: () => floodRequestsService.getAssignedToMe(),
  });
}

export function useFloodRequestAnalytics() {
  return useQuery({
    queryKey: ['flood-requests', 'analytics-summary'],
    queryFn: () => floodRequestsService.getAnalytics(),
  });
}

export function useCreateFloodRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: floodRequestsService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['flood-requests'] });
    },
  });
}

export function useUpdateFloodRequestStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      floodRequestsService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['flood-requests'] });
    },
  });
}

export function useClaimFloodRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => floodRequestsService.claim(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['flood-requests'] });
    },
  });
}

export function useAssignFloodRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, volunteerId }: { id: string; volunteerId: string }) =>
      floodRequestsService.assign(id, volunteerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['flood-requests'] });
    },
  });
}
