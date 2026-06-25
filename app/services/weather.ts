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
    precipitation_probability_max?: number[];
    weather_code: number[];
    wind_speed_10m_max: number[];
  };
  units: Record<string, string>;
}

export interface RainfallData {
  lat: number;
  lon: number;
  hourly: {
    time: string[];
    precipitation: number[];
    precipitation_probability: number[];
    weather_code: number[];
    temperature_2m: number[];
  };
  accumulation: {
    next6h: number;
    next12h: number;
    next24h: number;
    total48h: number;
  };
  peakRainfall: {
    time: string | null;
    amount: number;
  };
  maxProbability: number;
  floodRisk: {
    level: string;
    score: number;
    factors: string[];
  };
}

export const weatherService = {
  getCurrent: (params: { city?: string; lat?: string; lon?: string }) =>
    apiClient.get<WeatherData>('/weather', params),
  getForecast: (params: { city?: string; lat?: string; lon?: string }) =>
    apiClient.get<ForecastData>('/weather/forecast', params),
  getRainfall: (params: { city?: string; lat?: string; lon?: string }) =>
    apiClient.get<RainfallData>('/weather/rainfall', params),
};
