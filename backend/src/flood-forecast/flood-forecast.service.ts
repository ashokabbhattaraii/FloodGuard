import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WeatherService } from '../weather/weather.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AlertsService } from '../alerts/alerts.service';

export interface FloodPrediction {
  regionId: string;
  regionName: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100
  predictedFloodTime?: string;
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
  estimatedPeakTime?: string;
  estimatedPeakLevel?: number;
}

@Injectable()
export class FloodForecastService {
  constructor(
    private prisma: PrismaService,
    private weather: WeatherService,
    private notifications: NotificationsService,
    private alerts: AlertsService,
  ) {}

  /**
   * Comprehensive flood forecast for a region
   */
  async forecastForRegion(regionId: string): Promise<FloodPrediction> {
    const region = await this.prisma.region.findUnique({
      where: { id: regionId },
      include: {
        sensors: {
          where: { isActive: true },
          orderBy: { lastUpdated: 'desc' },
        },
      },
    });

    if (!region) throw new Error('Region not found');

    // Get weather forecast
    const weatherData = await this.weather.getHourlyRainfall({
      lat: String(region.centerLat),
      lon: String(region.centerLng),
    });

    // Analyze sensor data
    const sensorAnalysis = this.analyzeSensors(region.sensors);

    // Calculate weather risk score (0-40)
    const weatherScore = this.calculateWeatherScore(weatherData);

    // Calculate sensor risk score (0-40)
    const sensorScore = this.calculateSensorScore(sensorAnalysis);

    // Calculate geographic risk score (0-20)
    const geoScore = this.calculateGeographicScore(region);

    // Combined risk score
    const totalScore = weatherScore + sensorScore + geoScore;

    // Determine risk level
    const riskLevel = this.scoreToRiskLevel(totalScore);

    // Calculate confidence based on data availability
    const confidence = this.calculateConfidence(
      region.sensors.length,
      weatherData.maxProbability,
    );

    // Predict flood timing if high risk
    const prediction = this.predictFloodTiming(
      weatherData,
      sensorAnalysis,
      totalScore,
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      riskLevel,
      weatherScore,
      sensorScore,
      sensorAnalysis,
    );

    // Check if automatic alert should be triggered
    const alertThresholdReached = totalScore >= 70;

    return {
      regionId,
      regionName: region.name,
      riskLevel,
      confidence,
      predictedFloodTime: prediction.timing,
      estimatedPeakTime: prediction.peakTime,
      estimatedPeakLevel: prediction.peakLevel,
      factors: {
        weather: {
          score: weatherScore,
          rainfall24h: weatherData.accumulation.next24h,
          rainfall48h: weatherData.accumulation.total48h,
          intensity: this.getRainfallIntensity(weatherData.accumulation.next6h),
        },
        sensors: {
          score: sensorScore,
          avgWaterLevel: sensorAnalysis.avgLevel,
          criticalSensors: sensorAnalysis.criticalCount,
          trend: sensorAnalysis.trend,
        },
        geographic: {
          score: geoScore,
          elevation: region.area ? 'Low-lying area' : 'Unknown',
          drainageCapacity: this.estimateDrainageCapacity(region),
        },
      },
      recommendations,
      alertThresholdReached,
    };
  }

  /**
   * Monitor all regions and auto-generate alerts
   */
  async monitorAllRegions() {
    const regions = await this.prisma.region.findMany({
      where: { centerLat: { not: null }, centerLng: { not: null } },
    });

    const predictions: FloodPrediction[] = [];

    for (const region of regions) {
      try {
        const forecast = await this.forecastForRegion(region.id);
        predictions.push(forecast);

        // Auto-generate alert if threshold reached
        if (forecast.alertThresholdReached) {
          await this.autoGenerateAlert(forecast);
        }

        // Update region risk level
        if (forecast.riskLevel !== region.riskLevel) {
          await this.prisma.region.update({
            where: { id: region.id },
            data: { riskLevel: forecast.riskLevel as any },
          });
        }
      } catch (error) {
        console.error(`Forecast error for region ${region.name}:`, error);
      }
    }

    return predictions;
  }

  private analyzeSensors(sensors: any[]) {
    if (sensors.length === 0) {
      return {
        avgLevel: 0,
        criticalCount: 0,
        trend: 'stable' as const,
        maxLevel: 0,
      };
    }

    const levels = sensors.map((s) => s.currentValue / s.threshold);
    const avgLevel = levels.reduce((a, b) => a + b, 0) / levels.length;
    const criticalCount = sensors.filter((s) => s.currentValue >= s.threshold).length;
    const maxLevel = Math.max(...sensors.map((s) => s.currentValue));

    // Determine trend (simplified - in production, analyze historical data)
    let trend: 'rising' | 'stable' | 'falling' = 'stable';
    if (avgLevel > 0.8) trend = 'rising';
    else if (avgLevel < 0.3) trend = 'falling';

    return { avgLevel, criticalCount, trend, maxLevel };
  }

  private calculateWeatherScore(weatherData: any): number {
    let score = 0;

    const { next6h, next12h, next24h, total48h } = weatherData.accumulation;

    // Immediate threat (6h) - highest weight
    if (next6h > 50) score += 20;
    else if (next6h > 30) score += 15;
    else if (next6h > 20) score += 10;
    else if (next6h > 10) score += 5;

    // 24h accumulation
    if (next24h > 100) score += 15;
    else if (next24h > 70) score += 10;
    else if (next24h > 40) score += 6;
    else if (next24h > 20) score += 3;

    // Prolonged rainfall (48h)
    if (total48h > 150) score += 5;
    else if (total48h > 100) score += 3;

    return Math.min(score, 40);
  }

  private calculateSensorScore(analysis: any): number {
    let score = 0;

    // Average water level
    if (analysis.avgLevel > 0.9) score += 20;
    else if (analysis.avgLevel > 0.75) score += 15;
    else if (analysis.avgLevel > 0.6) score += 10;
    else if (analysis.avgLevel > 0.4) score += 5;

    // Critical sensors
    if (analysis.criticalCount > 0) score += 10;

    // Rising trend
    if (analysis.trend === 'rising') score += 10;

    return Math.min(score, 40);
  }

  private calculateGeographicScore(region: any): number {
    let score = 0;

    // Population density risk
    if (region.population && region.area) {
      const density = region.population / region.area;
      if (density > 5000) score += 10; // High density
      else if (density > 2000) score += 6;
      else if (density > 1000) score += 3;
    }

    // Low-lying areas (simplified)
    if (region.riskLevel === 'critical' || region.riskLevel === 'high') {
      score += 5;
    }

    // Existing risk level
    if (region.riskLevel === 'critical') score += 5;

    return Math.min(score, 20);
  }

  private scoreToRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 70) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  private calculateConfidence(sensorCount: number, weatherProb: number): number {
    let confidence = 50; // Base confidence

    // More sensors = higher confidence
    if (sensorCount >= 5) confidence += 25;
    else if (sensorCount >= 3) confidence += 15;
    else if (sensorCount >= 1) confidence += 10;

    // Weather probability
    if (weatherProb > 80) confidence += 20;
    else if (weatherProb > 60) confidence += 15;
    else if (weatherProb > 40) confidence += 10;
    else confidence += 5;

    return Math.min(confidence, 100);
  }

  private predictFloodTiming(
    weatherData: any,
    sensorAnalysis: any,
    totalScore: number,
  ) {
    if (totalScore < 50) {
      return { timing: undefined, peakTime: undefined, peakLevel: undefined };
    }

    const peakRainfall = weatherData.peakRainfall;
    const hoursUntilPeak = peakRainfall.time
      ? Math.round(
          (new Date(peakRainfall.time).getTime() - Date.now()) / (1000 * 60 * 60),
        )
      : null;

    // Estimate flood arrival (rain + drainage delay)
    const drainageDelay = sensorAnalysis.avgLevel > 0.7 ? 1 : 2; // hours
    const floodArrival = hoursUntilPeak ? hoursUntilPeak + drainageDelay : null;

    let timing: string | undefined;
    if (floodArrival !== null) {
      if (floodArrival <= 3) timing = 'Imminent (within 3 hours)';
      else if (floodArrival <= 6) timing = 'Within 6 hours';
      else if (floodArrival <= 12) timing = 'Within 12 hours';
      else if (floodArrival <= 24) timing = 'Within 24 hours';
      else timing = 'Beyond 24 hours';
    }

    return {
      timing,
      peakTime: peakRainfall.time,
      peakLevel: sensorAnalysis.maxLevel + peakRainfall.amount * 0.1, // Simplified estimate
    };
  }

  private generateRecommendations(
    riskLevel: string,
    weatherScore: number,
    sensorScore: number,
    sensorAnalysis: any,
  ): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'critical') {
      recommendations.push('IMMEDIATE ACTION: Evacuate low-lying areas now');
      recommendations.push('Move to higher ground or designated shelters');
      recommendations.push('Avoid all travel through affected areas');
      recommendations.push('Emergency services on high alert');
    } else if (riskLevel === 'high') {
      recommendations.push('Prepare for possible evacuation');
      recommendations.push('Move vehicles and valuables to higher ground');
      recommendations.push('Avoid unnecessary travel');
      recommendations.push('Stay informed of latest updates');
      recommendations.push('Keep emergency supplies ready (food, water, medications)');
    } else if (riskLevel === 'medium') {
      recommendations.push('Monitor weather and water levels closely');
      recommendations.push('Prepare emergency supplies and evacuation plan');
      recommendations.push('Secure outdoor items that could float away');
      recommendations.push('Stay alert for further warnings');
    } else {
      recommendations.push('Continue normal activities with awareness');
      recommendations.push('Review your family emergency plan');
      recommendations.push('Keep informed of weather updates');
    }

    // Add sensor-specific recommendations
    if (sensorAnalysis.criticalCount > 0) {
      recommendations.push(
        `${sensorAnalysis.criticalCount} water level sensor(s) above threshold`,
      );
    }

    // Add weather-specific recommendations
    if (weatherScore > 25) {
      recommendations.push('Heavy rainfall expected - ensure drainage is clear');
    }

    return recommendations;
  }

  private getRainfallIntensity(mm6h: number): string {
    if (mm6h > 50) return 'Extreme';
    if (mm6h > 30) return 'Very Heavy';
    if (mm6h > 15) return 'Heavy';
    if (mm6h > 5) return 'Moderate';
    return 'Light';
  }

  private estimateDrainageCapacity(region: any): string {
    // Simplified estimation based on region characteristics
    if (region.riskLevel === 'critical') return 'Poor - flood-prone area';
    if (region.riskLevel === 'high') return 'Limited - prone to flooding';
    if (region.riskLevel === 'medium') return 'Moderate';
    return 'Good';
  }

  private async autoGenerateAlert(forecast: FloodPrediction) {
    // Check if alert already exists for this region
    const existingAlert = await this.prisma.alert.findFirst({
      where: {
        regionId: forecast.regionId,
        status: 'active',
        severity: forecast.riskLevel === 'critical' ? 'critical' : 'high',
      },
    });

    if (existingAlert) {
      console.log(`Alert already exists for region ${forecast.regionName}`);
      return;
    }

    // Create new alert
    const severity = forecast.riskLevel === 'critical' ? 'critical' : 'high';
    const title = `${severity.toUpperCase()}: Flood Risk - ${forecast.regionName}`;
    const description = `
Flood forecast indicates ${forecast.riskLevel} risk (${forecast.confidence}% confidence).

${forecast.predictedFloodTime ? `Expected timing: ${forecast.predictedFloodTime}` : ''}

Key Factors:
- Rainfall (24h): ${forecast.factors.weather.rainfall24h}mm
- Water Level: ${(forecast.factors.sensors.avgWaterLevel * 100).toFixed(0)}% of capacity
- Trend: ${forecast.factors.sensors.trend}

IMMEDIATE ACTIONS:
${forecast.recommendations.slice(0, 3).join('\n')}

Stay alert and follow official guidance.
    `.trim();

    try {
      await this.alerts.create(
        {
          regionId: forecast.regionId,
          severity: severity as any,
          title,
          description,
        },
        'system-auto', // System-generated alert
      );

      console.log(`Auto-generated alert for ${forecast.regionName}: ${severity}`);
    } catch (error) {
      console.error(`Failed to create alert for ${forecast.regionName}:`, error);
    }
  }
}
