import { Injectable } from '@nestjs/common';

export interface GeocodingResult {
  lat: number;
  lon: number;
  displayName: string;
  country: string;
  state?: string;
  city?: string;
}

export interface ReverseGeocodingResult {
  lat: number;
  lon: number;
  displayName: string;
  address: {
    country?: string;
    state?: string;
    county?: string;
    city?: string;
    town?: string;
    village?: string;
    road?: string;
    postcode?: string;
  };
}

@Injectable()
export class GeocodingService {
  private readonly baseUrl = 'https://nominatim.openstreetmap.org';
  private readonly headers = {
    'User-Agent': 'FloodGuard/1.0 (flood monitoring app)',
  };

  async search(query: string, limit = 5): Promise<GeocodingResult[]> {
    const res = await fetch(
      `${this.baseUrl}/search?q=${encodeURIComponent(query)}&format=json&limit=${limit}&addressdetails=1`,
      { headers: this.headers },
    );
    const data = await res.json();

    return data.map((item: any) => ({
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      displayName: item.display_name,
      country: item.address?.country || '',
      state: item.address?.state,
      city: item.address?.city || item.address?.town || item.address?.village,
    }));
  }

  async reverse(lat: string, lon: string): Promise<ReverseGeocodingResult> {
    const res = await fetch(
      `${this.baseUrl}/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
      { headers: this.headers },
    );
    const data = await res.json();

    return {
      lat: parseFloat(data.lat),
      lon: parseFloat(data.lon),
      displayName: data.display_name,
      address: {
        country: data.address?.country,
        state: data.address?.state,
        county: data.address?.county,
        city: data.address?.city || data.address?.town || data.address?.village,
        town: data.address?.town,
        village: data.address?.village,
        road: data.address?.road,
        postcode: data.address?.postcode,
      },
    };
  }
}
