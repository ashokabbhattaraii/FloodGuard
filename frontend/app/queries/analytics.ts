import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/app/services/analytics';

export function useAnalyticsKpis(period: '7D' | '30D' | '90D') {
  return useQuery({
    queryKey: ['analytics', 'kpis', period],
    queryFn: () => analyticsService.getKpis(period),
  });
}

export function useAnalyticsAlertsByDay(period: '7D' | '30D' | '90D', regionId?: string) {
  return useQuery({
    queryKey: ['analytics', 'alerts-by-day', period, regionId],
    queryFn: () => analyticsService.getAlertsByDay(period, regionId),
  });
}

export function useAnalyticsSeverityBreakdown(period: '7D' | '30D' | '90D', regionId?: string) {
  return useQuery({
    queryKey: ['analytics', 'severity-breakdown', period, regionId],
    queryFn: () => analyticsService.getSeverityBreakdown(period, regionId),
  });
}

export function useAnalyticsTopRegions(period: '7D' | '30D' | '90D', limit?: number) {
  return useQuery({
    queryKey: ['analytics', 'top-regions', period, limit],
    queryFn: () => analyticsService.getTopRegions(period, limit),
  });
}
