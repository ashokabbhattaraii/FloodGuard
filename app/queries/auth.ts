import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/app/services/auth';
import { config } from '@/app/config';

export function useAuth() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authService.getMe(),
    retry: false,
    enabled: typeof window !== 'undefined' && !!localStorage.getItem(config.auth.tokenKey),
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      localStorage.setItem(config.auth.tokenKey, data.access_token);
      qc.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authService.register,
    onSuccess: (data) => {
      if (data?.access_token) {
        localStorage.setItem(config.auth.tokenKey, data.access_token);
      }
      qc.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}
