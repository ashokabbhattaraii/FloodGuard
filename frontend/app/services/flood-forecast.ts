import { apiClient } from './api-client';

export interface FloodPrediction {
  regionId: string;
  regionName: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  predictedFloodTime?: string;
  estimatedPeakTime?: string;
  estimatedPeakLevel?: number;
  factors: {
    weather: {
      score: number;
      rainfall24h: number;
      rainfall48h: number;
      intensity: string;
    };
    sensors: {
      score: number;
      avgWaterLevel: number;
      criticalSensors: number;
      trend: 'rising' | 'stable' | 'falling';
    };
    geographic: {
      score: number;
      elevation: string;
      drainageCapacity: string;
    };
  };
  recommendations: string[];
  alertThresholdReached: boolean;
}

export const floodForecastService = {
  getRegionForecast: (regionId: string) =>
    apiClient.get<FloodPrediction>(`/flood-forecast/region/${regionId}`),

  getAllForecasts: () =>
    apiClient.get<FloodPrediction[]>('/flood-forecast/all'),
};
