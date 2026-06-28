'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/app/services/auth';
import { config } from '@/app/config';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  [key: string]: unknown;
}

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(config.auth.tokenKey);
    if (!token) {
      setLoading(false);
      return;
    }
    authService.getMe()
      .then((data) => setUser(data))
      .catch(() => localStorage.removeItem(config.auth.tokenKey))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authService.login({ email, password });
    localStorage.setItem(config.auth.tokenKey, data.access_token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(config.auth.tokenKey);
    setUser(null);
    router.push('/login');
  }, [router]);

  return { user, loading, login, logout, isAuthenticated: !!user };
}
