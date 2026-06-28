import { useQuery } from '@tanstack/react-query';
import { weatherService } from '@/app/services/weather';

export function useWeather(city = 'Kathmandu') {
  return useQuery({
    queryKey: ['weather', city],
    queryFn: () => weatherService.getCurrent({ city }),
    enabled: !!city,
    refetchInterval: 60000,
  });
}

export function useForecast(city = 'Kathmandu') {
  return useQuery({
    queryKey: ['forecast', city],
    queryFn: () => weatherService.getForecast({ city }),
    enabled: !!city,
    refetchInterval: 300000,
  });
}

export function useRainfall(city = 'Kathmandu') {
  return useQuery({
    queryKey: ['rainfall', city],
    queryFn: () => weatherService.getRainfall({ city }),
    enabled: !!city,
    refetchInterval: 300000,
  });
}
