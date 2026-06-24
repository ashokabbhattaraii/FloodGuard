import { apiClient } from './api-client';

export interface WeatherData {
  lat: number;
  lon: number;
  temperature: number;
  apparentTemperature?: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  precipitation: number;
  units: Record<string, string>;
  time: string;
}

export interface ForecastData {
  lat: number;
  lon: number;
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    weather_code: number[];
    wind_speed_10m_max: number[];
  };
  units: Record<string, string>;
}

export const weatherService = {
  getCurrent: (params: { city?: string; lat?: string; lon?: string }) =>
    apiClient.get<WeatherData>('/weather', params),
  getForecast: (params: { city?: string; lat?: string; lon?: string }) =>
    apiClient.get<ForecastData>('/weather/forecast', params),
};
