import { config } from '@/app/config';

class ApiClient {
  private baseUrl = config.api.baseUrl;

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(config.auth.tokenKey);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `Request failed with status ${res.status}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  }

  get<T>(endpoint: string, params?: Record<string, string | undefined>): Promise<T> {
    const url = params ? `${endpoint}?${this.buildParams(params)}` : endpoint;
    return this.request<T>(url);
  }

  post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) });
  }

  patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(data) });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  private buildParams(params: Record<string, string | undefined>): string {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) sp.set(k, v); });
    return sp.toString();
  }
}

export const apiClient = new ApiClient();
