import { useQuery } from '@tanstack/react-query';
import { weatherService } from '@/app/services/weather';

export function useWeather(city = 'Kathmandu') {
  return useQuery({
    queryKey: ['weather', city],
    queryFn: () => weatherService.getCurrent({ city }),
    enabled: !!city,
  });
}

export function useForecast(city = 'Kathmandu') {
  return useQuery({
    queryKey: ['forecast', city],
    queryFn: () => weatherService.getForecast({ city }),
    enabled: !!city,
  });
}
