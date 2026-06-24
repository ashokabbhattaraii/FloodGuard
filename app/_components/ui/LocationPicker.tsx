'use client';

import { useEffect, useRef, useState } from 'react';
import { NEPAL_MAP_OPTIONS, MAP_MAX_ZOOM } from '@/app/lib/map-config';

interface LocationPickerProps {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
  height?: string;
  color?: string;
}

/**
 * Click-to-select location map. Drop / drag a pin anywhere, search for a
 * place, or use the device GPS. Reports the chosen coordinates via onChange.
 */
export default function LocationPicker({
  latitude,
  longitude,
  onChange,
  height = '300px',
  color = '#0369a1',
}: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);

  /* Load Leaflet */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).L) {
      setLoaded(true);
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setLoaded(true);
    document.body.appendChild(script);
  }, []);

  /* Init map */
  useEffect(() => {
    if (!loaded || !mapRef.current || mapInstance.current) return;
    const L = (window as any).L;

    const map = L.map(mapRef.current, { zoomControl: true, ...NEPAL_MAP_OPTIONS }).setView([latitude, longitude], 14);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', {
      maxZoom: MAP_MAX_ZOOM,
      subdomains: 'abcd',
      attribution: '© OpenStreetMap contributors © CARTO',
    }).addTo(map);

    const icon = L.divIcon({
      className: 'picker-marker',
      html: `<div class="relative flex items-center justify-center w-7 h-7">
        <span class="absolute inline-flex h-full w-full rounded-full opacity-40" style="background:${color}"></span>
        <span class="relative inline-flex rounded-full h-4 w-4 border-2 border-white" style="background:${color}"></span>
      </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const marker = L.marker([latitude, longitude], { draggable: true, icon }).addTo(map);
    marker.on('dragend', () => {
      const { lat, lng } = marker.getLatLng();
      onChangeRef.current(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
    });
    map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      onChangeRef.current(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
    });

    markerRef.current = marker;
    mapInstance.current = map;
    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Sync external coordinate changes (e.g. typed into inputs) onto the marker */
  useEffect(() => {
    if (!mapInstance.current || !markerRef.current) return;
    const current = markerRef.current.getLatLng();
    if (Math.abs(current.lat - latitude) > 1e-6 || Math.abs(current.lng - longitude) > 1e-6) {
      markerRef.current.setLatLng([latitude, longitude]);
      mapInstance.current.panTo([latitude, longitude]);
    }
  }, [latitude, longitude]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(search)}`,
      );
      const data = await res.json();
      if (data?.length) {
        const lat = Number(data[0].lat);
        const lng = Number(data[0].lon);
        onChangeRef.current(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
        mapInstance.current?.flyTo([lat, lng], 15, { animate: true, duration: 1 });
      } else {
        alert('Location not found.');
      }
    } catch {
      alert('Search failed. Check your connection.');
    } finally {
      setSearching(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        onChangeRef.current(lat, lng);
        mapInstance.current?.flyTo([lat, lng], 15, { animate: true, duration: 1 });
      },
      () => alert('Could not access your location.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="rounded-[10px] overflow-hidden border border-app">
      <style jsx global>{`
        [data-theme='dark'] .picker-tiles {
          filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
        }
        .leaflet-container { background: var(--bg) !important; font-family: var(--font-premium) !important; }
      `}</style>

      <div className="flex items-center gap-2 p-2 bg-app/5 border-b border-app">
        <form onSubmit={handleSearch} className="flex items-center gap-1.5 flex-1 min-w-0">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search a place to pin…"
            className="form-control flex-1 min-w-0 py-1.5 px-2.5 bg-app/5 border-app rounded-[8px] text-[13px]"
          />
          <button type="submit" disabled={searching} className="px-3 py-1.5 rounded-[8px] bg-accent text-white text-[12px] font-semibold shrink-0 disabled:opacity-60">
            {searching ? '…' : 'Find'}
          </button>
        </form>
        <button type="button" onClick={useMyLocation} className="px-3 py-1.5 rounded-[8px] border border-app text-app text-[12px] font-semibold shrink-0 hover:bg-[var(--accent-soft)] transition-all">
          📍 My location
        </button>
      </div>

      <div className="relative">
        <div ref={mapRef} style={{ height }} className="w-full z-10" />
        {!loaded && (
          <div className="absolute inset-0 bg-app/80 backdrop-blur-md z-[1000] flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        )}
        {loaded && (
          <div className="absolute bottom-2 left-2 z-[999] glass-2 rounded-[8px] px-2.5 py-1 border border-app text-[11px] text-app font-medium tabular-nums">
            📌 {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </div>
        )}
      </div>
      <p className="text-[11px] text-app-muted px-2.5 py-1.5 bg-app/5 border-t border-app">
        Click the map or drag the pin to set the exact shelter location.
      </p>
    </div>
  );
}
