'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';

// Fix for default marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface RegionMapSelectorProps {
  initialCenter?: { lat: number; lng: number };
  initialBounds?: number[][];
  onCenterChange?: (lat: number, lng: number) => void;
  onBoundsChange?: (bounds: number[][]) => void;
  existingRegions?: Array<{
    id: string;
    name: string;
    centerLat?: number;
    centerLng?: number;
    coordinates?: any;
    riskLevel?: string;
  }>;
}

export default function RegionMapSelector({
  initialCenter = { lat: 27.7172, lng: 85.3240 }, // Kathmandu, Nepal default
  initialBounds,
  onCenterChange,
  onBoundsChange,
  existingRegions = [],
}: RegionMapSelectorProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Dynamically import leaflet-draw to ensure it loads after Leaflet
    import('leaflet-draw');

    // Initialize map
    const map = L.map('region-map').setView([initialCenter.lat, initialCenter.lng], 12);
    mapRef.current = map;

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    // Add initial center marker
    const marker = L.marker([initialCenter.lat, initialCenter.lng], {
      draggable: true,
      title: 'Region Center (drag to move)',
    }).addTo(map);
    markerRef.current = marker;

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      onCenterChange?.(pos.lat, pos.lng);
    });

    // Add click to place marker
    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      onCenterChange?.(e.latlng.lat, e.latlng.lng);
    });

    // Load initial bounds if provided
    if (initialBounds && initialBounds.length > 0) {
      const polygon = L.polygon(initialBounds as [number, number][], {
        color: '#7c7cff',
        fillColor: '#7c7cff',
        fillOpacity: 0.2,
        weight: 2,
      }).addTo(map);
      polygonRef.current = polygon;
      map.fitBounds(polygon.getBounds());
    }

    // Display existing regions
    existingRegions.forEach((region) => {
      // Show center marker
      if (region.centerLat && region.centerLng) {
        const color = getRiskColor(region.riskLevel);
        const regionMarker = L.circleMarker([region.centerLat, region.centerLng], {
          radius: 8,
          fillColor: color,
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8,
        }).addTo(map);

        regionMarker.bindPopup(`
          <div style="font-family: system-ui; font-size: 13px;">
            <strong>${region.name}</strong><br/>
            <span style="color: ${color}; text-transform: capitalize;">
              ${region.riskLevel || 'Unknown'} Risk
            </span>
          </div>
        `);
      }

      // Show boundary if available
      if (region.coordinates?.coordinates?.[0]) {
        const coords = region.coordinates.coordinates[0];
        const color = getRiskColor(region.riskLevel);
        L.polygon(
          coords.map((c: number[]) => [c[1], c[0]]), // GeoJSON is [lng, lat], Leaflet is [lat, lng]
          {
            color: color,
            fillColor: color,
            fillOpacity: 0.1,
            weight: 2,
            dashArray: '5, 5',
          }
        ).addTo(map);
      }
    });

    // Add drawing controls (only if leaflet-draw is loaded)
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    // Check if L.Control.Draw exists
    if (!(L.Control as any).Draw) {
      console.warn('Leaflet Draw not loaded yet');
      return () => { map.remove(); };
    }

    const drawControl = new (L.Control as any).Draw({
      position: 'topright',
      draw: {
        polygon: {
          allowIntersection: false,
          drawError: {
            color: '#e74c3c',
            message: 'Shape edges cannot cross',
          },
          shapeOptions: {
            color: '#7c7cff',
            fillColor: '#7c7cff',
            fillOpacity: 0.2,
            weight: 2,
          },
        },
        rectangle: {
          shapeOptions: {
            color: '#7c7cff',
            fillColor: '#7c7cff',
            fillOpacity: 0.2,
            weight: 2,
          },
        },
        circle: false,
        circlemarker: false,
        marker: false,
        polyline: false,
      },
      edit: {
        featureGroup: drawnItems,
        remove: true,
      },
    });
    map.addControl(drawControl);

    map.on(L.Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;

      // Remove previous polygon
      if (polygonRef.current) {
        map.removeLayer(polygonRef.current);
      }
      drawnItems.clearLayers();

      drawnItems.addLayer(layer);
      polygonRef.current = layer;

      // Get bounds as GeoJSON coordinates
      const latlngs = layer.getLatLngs()[0];
      const bounds = latlngs.map((ll: L.LatLng) => [ll.lng, ll.lat]);
      bounds.push(bounds[0]); // Close the polygon
      onBoundsChange?.(bounds);
    });

    map.on(L.Draw.Event.DELETED, () => {
      polygonRef.current = null;
      onBoundsChange?.([]);
    });

    return () => {
      map.remove();
    };
  }, [mounted]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !mapRef.current) return;

    setSearching(true);
    try {
      // Use Nominatim (free, no API key needed) - Search in Nepal
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=np&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lon);

        mapRef.current?.setView([latNum, lngNum], 13);
        markerRef.current?.setLatLng([latNum, lngNum]);
        onCenterChange?.(latNum, lngNum);

        // Show popup
        markerRef.current?.bindPopup(display_name).openPopup();
      } else {
        alert('Location not found. Try "Kathmandu", "Pokhara", or "Biratnagar"');
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  if (!mounted) {
    return (
      <div className="w-full h-[500px] rounded-[12px] bg-[var(--border)] animate-pulse"></div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search location in Nepal (e.g., Kathmandu, Pokhara)"
          className="flex-1 rounded-[8px] border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-app focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        <button
          onClick={handleSearch}
          disabled={searching || !searchQuery.trim()}
          className="px-4 py-2 rounded-[8px] bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
        >
          {searching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Instructions */}
      <div className="text-xs text-app-muted space-y-1 bg-[var(--accent)]/5 p-3 rounded-[8px]">
        <p>📍 <strong>Click map</strong> or <strong>drag marker</strong> to set region center</p>
        <p>🗺️ Use <strong>drawing tools</strong> (top right) to draw region boundaries</p>
        <p>🔍 <strong>Search</strong> for Nepali cities above</p>
        <p>👁️ Existing regions shown with colored markers</p>
      </div>

      {/* Map Container */}
      <div
        id="region-map"
        className="w-full h-[400px] rounded-[12px] overflow-hidden border border-[var(--border)]"
        style={{ zIndex: 1 }}
      />
    </div>
  );
}

function getRiskColor(risk?: string): string {
  switch (risk) {
    case 'critical':
      return '#dc2626';
    case 'high':
      return '#f97316';
    case 'medium':
      return '#0369a1';
    case 'low':
      return '#16a34a';
    default:
      return '#6b7280';
  }
}
