import { apiClient } from './api-client';

interface LoginResponse {
  access_token: string;
  user: { id: string; email: string; name: string; role: string };
}

interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  [key: string]: unknown;
}

export const authService = {
  login: (data: { email: string; password: string }) =>
    apiClient.post<LoginResponse>('/auth/login', data),
  register: (data: { email: string; password: string; name: string; role?: string }) =>
    apiClient.post<LoginResponse>('/auth/register', data),
  getMe: () =>
    apiClient.get<UserResponse>('/auth/me'),
};
