import { apiClient } from './api-client';

export const analyticsService = {
  getKpis: (period: '7D' | '30D' | '90D') =>
    apiClient.get<any>(`/analytics/kpis?period=${period}`),

  getAlertsByDay: (period: '7D' | '30D' | '90D', regionId?: string) => {
    const qs = new URLSearchParams({ period });
    if (regionId) qs.set('regionId', regionId);
    return apiClient.get<any>(`/analytics/alerts-by-day?${qs.toString()}`);
  },

  getSeverityBreakdown: (period: '7D' | '30D' | '90D', regionId?: string) => {
    const qs = new URLSearchParams({ period });
    if (regionId) qs.set('regionId', regionId);
    return apiClient.get<any>(`/analytics/severity-breakdown?${qs.toString()}`);
  },

  getTopRegions: (period: '7D' | '30D' | '90D', limit?: number) => {
    const qs = new URLSearchParams({ period });
    if (limit) qs.set('limit', String(limit));
    return apiClient.get<any>(`/analytics/top-regions?${qs.toString()}`);
  },
};
