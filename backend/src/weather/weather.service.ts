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
      `${this.baseUrl}/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,wind_speed_10m_max&timezone=auto&forecast_days=7`,
    );
    const data = await res.json();

    return {
      lat: Number(lat),
      lon: Number(lon),
      daily: data.daily,
      units: data.daily_units,
    };
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
