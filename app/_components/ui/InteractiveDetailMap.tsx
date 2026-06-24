'use client';

import { useEffect, useRef, useState } from 'react';
import { NEPAL_MAP_OPTIONS, MAP_MAX_ZOOM } from '@/app/lib/map-config';

interface InteractiveDetailMapProps {
  latitude: number;
  longitude: number;
  title: string;
  color?: string;
  zoom?: number;
}

export default function InteractiveDetailMap({
  latitude,
  longitude,
  title,
  color = '#0ea5e9',
  zoom = 15,
}: InteractiveDetailMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);

  // Load Leaflet resources dynamically
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ((window as any).L) {
      setLoaded(true);
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    script.onload = () => {
      setLoaded(true);
    };
    document.body.appendChild(script);
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!loaded || !mapRef.current || leafletInstance.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Fix default marker icon path issue in Leaflet
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
      ...NEPAL_MAP_OPTIONS,
    }).setView([latitude, longitude], zoom);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', {
      maxZoom: MAP_MAX_ZOOM,
      subdomains: 'abcd',
      attribution: '© OpenStreetMap contributors © CARTO',
    }).addTo(map);

    leafletInstance.current = map;

    // Create a pulsing divIcon marker
    const customIcon = L.divIcon({
      className: 'detail-pulse-marker',
      html: `
        <div class="relative flex items-center justify-center w-6 h-6">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style="background-color: ${color};"></span>
          <span class="relative inline-flex rounded-full h-3.5 w-3.5 border border-white" style="background-color: ${color};"></span>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const marker = L.marker([latitude, longitude], { icon: customIcon })
      .addTo(map)
      .bindPopup(`<strong class="text-xs text-app">${title}</strong>`)
      .openPopup();

    const circle = L.circle([latitude, longitude], {
      color,
      fillColor: color,
      fillOpacity: 0.1,
      radius: 150,
    }).addTo(map);

    markerRef.current = marker;
    circleRef.current = circle;

    return () => {
      if (leafletInstance.current) {
        leafletInstance.current.remove();
        leafletInstance.current = null;
      }
    };
  }, [loaded]);

  // Update map center/marker position when coordinates change
  useEffect(() => {
    if (!leafletInstance.current) return;

    const L = (window as any).L;
    if (!L) return;

    const map = leafletInstance.current;
    map.setView([latitude, longitude], zoom);

    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
      markerRef.current.getPopup().setContent(`<strong class="text-xs text-app">${title}</strong>`);
      markerRef.current.openPopup();
    }

    if (circleRef.current) {
      circleRef.current.setLatLng([latitude, longitude]);
      circleRef.current.setStyle({ color, fillColor: color });
    }
  }, [latitude, longitude, title, color, zoom]);

  const handleCenter = () => {
    if (!leafletInstance.current) return;
    leafletInstance.current.flyTo([latitude, longitude], zoom, {
      animate: true,
      duration: 1.0,
    });
  };

  return (
    <div className="relative w-full h-[320px] rounded-xl overflow-hidden border border-app bg-app/10">
      <style jsx global>{`
        [data-theme='dark'] .leaflet-tile {
          filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%) !important;
        }
        .leaflet-container {
          background: var(--bg) !important;
        }
      `}</style>

      {/* Map Target */}
      <div ref={mapRef} className="w-full h-full z-10" />

      {/* Recenter control */}
      {loaded && (
        <button
          onClick={handleCenter}
          className="absolute bottom-3 right-3 z-[999] px-2.5 py-1.5 rounded-[8px] bg-[var(--chrome-bg)] border border-app shadow-md text-[11px] font-bold text-app hover:bg-[var(--accent-soft)] transition-all"
        >
          Center Pin
        </button>
      )}

      {/* Loading Overlay */}
      {!loaded && (
        <div className="absolute inset-0 bg-app/80 backdrop-blur-md z-[1000] flex flex-col items-center justify-center gap-2">
          <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <p className="text-[10px] text-app-muted">Loading interactive pin map...</p>
        </div>
      )}
    </div>
  );
}
