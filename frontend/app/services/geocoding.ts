import { apiClient } from './api-client';

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

export const geocodingService = {
  search: (q: string, limit?: number) =>
    apiClient.get<GeocodingResult[]>('/geocoding/search', { q, limit: limit?.toString() }),
  reverse: (lat: number, lon: number) =>
    apiClient.get<ReverseGeocodingResult>('/geocoding/reverse', { lat: lat.toString(), lon: lon.toString() }),
};

/** OpenStreetMap tile URL for use with map libraries (Leaflet, etc.) */
export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
