import { Injectable } from '@nestjs/common';

@Injectable()
export class WeatherService {
  private readonly baseUrl = 'https://api.open-meteo.com/v1';
  private readonly geocodeUrl = 'https://geocoding-api.open-meteo.com/v1';

  async getCurrentWeather(params: {
    lat?: string;
    lon?: string;
    city?: string;
  }) {
    let lat = params.lat;
    let lon = params.lon;

    if (params.city && (!lat || !lon)) {
      const geo = await this.geocodeCity(params.city);
      lat = geo.lat;
      lon = geo.lon;
    }

    if (!lat || !lon) throw new Error('lat/lon or city is required');

    const res = await fetch(
      `${this.baseUrl}/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,precipitation&timezone=auto`,
    );
    const data = await res.json();

    return {
      lat: Number(lat),
      lon: Number(lon),
      temperature: data.current?.temperature_2m,
      apparentTemperature: data.current?.apparent_temperature,
      humidity: data.current?.relative_humidity_2m,
      windSpeed: data.current?.wind_speed_10m,
      weatherCode: data.current?.weather_code,
      precipitation: data.current?.precipitation,
      units: data.current_units,
      time: data.current?.time,
    };
  }

  async getForecast(params: { lat?: string; lon?: string; city?: string }) {
    let lat = params.lat;
    let lon = params.lon;

    if (params.city && (!lat || !lon)) {
      const geo = await this.geocodeCity(params.city);
      lat = geo.lat;
      lon = geo.lon;
    }

    if (!lat || !lon) throw new Error('lat/lon or city is required');

    const res = await fetch(
      `${this.baseUrl}/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code,wind_speed_10m_max&timezone=auto&forecast_days=7`,
    );
    const data = await res.json();

    return {
      lat: Number(lat),
      lon: Number(lon),
      daily: data.daily,
      units: data.daily_units,
    };
  }

  async getHourlyRainfall(params: {
    lat?: string;
    lon?: string;
    city?: string;
  }) {
    let lat = params.lat;
    let lon = params.lon;

    if (params.city && (!lat || !lon)) {
      const geo = await this.geocodeCity(params.city);
      lat = geo.lat;
      lon = geo.lon;
    }

    if (!lat || !lon) throw new Error('lat/lon or city is required');

    const res = await fetch(
      `${this.baseUrl}/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation,precipitation_probability,weather_code,temperature_2m&timezone=auto&forecast_hours=48`,
    );
    const data = await res.json();

    const hourly = data.hourly || {};
    const times: string[] = hourly.time || [];
    const precip: number[] = hourly.precipitation || [];
    const probabilities: number[] = hourly.precipitation_probability || [];

    const total48h = precip.reduce((s: number, v: number) => s + v, 0);
    const next6h = precip.slice(0, 6).reduce((s: number, v: number) => s + v, 0);
    const next12h = precip.slice(0, 12).reduce((s: number, v: number) => s + v, 0);
    const next24h = precip.slice(0, 24).reduce((s: number, v: number) => s + v, 0);
    const peakHour = precip.indexOf(Math.max(...precip));
    const maxProbability = Math.max(...probabilities, 0);

    const floodRisk = this.assessFloodRisk(next6h, next12h, next24h, total48h, maxProbability);

    return {
      lat: Number(lat),
      lon: Number(lon),
      hourly: {
        time: times,
        precipitation: precip,
        precipitation_probability: probabilities,
        weather_code: hourly.weather_code || [],
        temperature_2m: hourly.temperature_2m || [],
      },
      accumulation: {
        next6h: Math.round(next6h * 10) / 10,
        next12h: Math.round(next12h * 10) / 10,
        next24h: Math.round(next24h * 10) / 10,
        total48h: Math.round(total48h * 10) / 10,
      },
      peakRainfall: {
        time: times[peakHour] || null,
        amount: precip[peakHour] || 0,
      },
      maxProbability,
      floodRisk,
    };
  }

  private assessFloodRisk(
    next6h: number,
    next12h: number,
    next24h: number,
    total48h: number,
    maxProbability: number,
  ): { level: string; score: number; factors: string[] } {
    let score = 0;
    const factors: string[] = [];

    if (next6h > 30) { score += 40; factors.push('Extreme rainfall expected within 6 hours'); }
    else if (next6h > 20) { score += 30; factors.push('Very heavy rainfall within 6 hours'); }
    else if (next6h > 10) { score += 20; factors.push('Heavy rainfall within 6 hours'); }
    else if (next6h > 5) { score += 10; factors.push('Moderate rainfall within 6 hours'); }

    if (next24h > 80) { score += 30; factors.push('Extreme 24h accumulation forecast'); }
    else if (next24h > 50) { score += 20; factors.push('Very high 24h accumulation'); }
    else if (next24h > 30) { score += 15; factors.push('High 24h rainfall accumulation'); }

    if (total48h > 120) { score += 20; factors.push('Prolonged heavy rainfall over 48h'); }
    else if (total48h > 80) { score += 10; factors.push('Sustained rainfall over 48h period'); }

    if (maxProbability > 90) { score += 10; factors.push('Very high precipitation probability'); }

    let level: string;
    if (score >= 60) level = 'critical';
    else if (score >= 40) level = 'high';
    else if (score >= 20) level = 'medium';
    else level = 'low';

    if (factors.length === 0) factors.push('No significant rainfall expected');

    return { level, score: Math.min(score, 100), factors };
  }

  private async geocodeCity(
    city: string,
  ): Promise<{ lat: string; lon: string }> {
    const res = await fetch(
      `${this.geocodeUrl}/search?name=${encodeURIComponent(city)}&count=1`,
    );
    const data = await res.json();
    if (!data.results?.length) throw new Error(`City "${city}" not found`);
    return {
      lat: String(data.results[0].latitude),
      lon: String(data.results[0].longitude),
    };
  }
}
