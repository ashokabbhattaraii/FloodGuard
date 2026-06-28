import { useQuery } from '@tanstack/react-query';
import { floodForecastService } from '@/app/services/flood-forecast';

export function useRegionForecast(regionId: string) {
  return useQuery({
    queryKey: ['flood-forecast', regionId],
    queryFn: () => floodForecastService.getRegionForecast(regionId),
    enabled: !!regionId,
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 240000, // 4 minutes
  });
}

export function useAllForecasts() {
  return useQuery({
    queryKey: ['flood-forecast', 'all'],
    queryFn: floodForecastService.getAllForecasts,
    refetchInterval: 300000,
    staleTime: 240000,
  });
}
