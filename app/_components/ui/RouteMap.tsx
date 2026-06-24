'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  routingService,
  formatDistance,
  formatDuration,
  haversineDistance,
  type RouteResult,
  type RouteProfile,
  type LatLng,
} from '@/app/services/routing';
import { NEPAL_MAP_OPTIONS, MAP_MAX_ZOOM } from '@/app/lib/map-config';

interface RouteMapProps {
  /** Destination coordinates (the SOS request or evacuation center) */
  destination: LatLng;
  /** Label shown on the destination marker */
  destinationLabel: string;
  /** Optional fixed origin. If omitted, the volunteer's live GPS is used. */
  origin?: LatLng | null;
  /** Marker accent colour for the destination */
  color?: string;
  height?: string;
}

const MANEUVER_ICONS: Record<string, string> = {
  depart: 'M12 2v20M5 9l7-7 7 7',
  arrive: 'M12 21s-6-5.7-6-10a6 6 0 1112 0c0 4.3-6 10-6 10z',
  turn: 'M9 18l6-6-6-6',
  continue: 'M12 5v14M5 12h14',
  roundabout: 'M12 3a9 9 0 109 9',
  merge: 'M8 6l4 4 4-4',
};

export default function RouteMap({
  destination,
  destinationLabel,
  origin = null,
  color = '#7c7cff',
  height = '420px',
}: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const originMarkerRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);

  const [leafletReady, setLeafletReady] = useState(false);
  const [userPos, setUserPos] = useState<LatLng | null>(origin);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [profile, setProfile] = useState<RouteProfile>('driving');
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState(true);
  const [liveTracking, setLiveTracking] = useState(false);

  /* ---------- Load Leaflet ---------- */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).L) {
      setLeafletReady(true);
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setLeafletReady(true);
    document.body.appendChild(script);
  }, []);

  /* ---------- Init map ---------- */
  useEffect(() => {
    if (!leafletReady || !mapRef.current || mapInstance.current) return;
    const L = (window as any).L;

    const map = L.map(mapRef.current, { zoomControl: false, ...NEPAL_MAP_OPTIONS }).setView(
      [destination.lat, destination.lng],
      14,
    );
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', {
      maxZoom: MAP_MAX_ZOOM,
      subdomains: 'abcd',
      attribution: '© OpenStreetMap contributors © CARTO',
    }).addTo(map);

    routeLayerRef.current = L.layerGroup().addTo(map);
    mapInstance.current = map;

    // Destination marker
    const destIcon = L.divIcon({
      className: 'route-dest-marker',
      html: `<div class="relative flex items-center justify-center w-7 h-7">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style="background:${color}"></span>
        <span class="relative inline-flex rounded-full h-4 w-4 border-2 border-white" style="background:${color}"></span>
      </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    destMarkerRef.current = L.marker([destination.lat, destination.lng], { icon: destIcon })
      .addTo(map)
      .bindPopup(`<strong class="text-xs">${destinationLabel}</strong>`)
      .openPopup();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [leafletReady]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- Acquire GPS if no fixed origin ---------- */
  const locateOnce = useCallback(() => {
    if (origin) {
      setUserPos(origin);
      return;
    }
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setError('Could not get your location. Enable location access to get directions.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [origin]);

  useEffect(() => {
    locateOnce();
  }, [locateOnce]);

  /* ---------- Live tracking ---------- */
  useEffect(() => {
    if (!liveTracking || origin) return;
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    watchIdRef.current = id;
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [liveTracking, origin]);

  /* ---------- Fetch route whenever origin / profile changes ---------- */
  useEffect(() => {
    if (!userPos) return;
    let cancelled = false;
    setLoadingRoute(true);
    setError(null);
    routingService
      .getRoute(userPos, destination, profile)
      .then((r) => {
        if (!cancelled) setRoute(r);
      })
      .catch((e) => {
        if (!cancelled) {
          setRoute(null);
          setError(e.message || 'Unable to calculate a route right now.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingRoute(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userPos, profile, destination.lat, destination.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- Draw route + origin marker ---------- */
  useEffect(() => {
    if (!mapInstance.current || !leafletReady) return;
    const L = (window as any).L;
    const map = mapInstance.current;
    const layer = routeLayerRef.current;
    layer.clearLayers();

    if (userPos) {
      const youIcon = L.divIcon({
        className: 'route-origin-marker',
        html: `<div class="relative flex items-center justify-center w-6 h-6">
          <span class="absolute inline-flex h-full w-full rounded-full opacity-40" style="background:#10b981"></span>
          <span class="relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-white" style="background:#10b981"></span>
        </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      originMarkerRef.current = L.marker([userPos.lat, userPos.lng], { icon: youIcon })
        .addTo(layer)
        .bindPopup('<strong class="text-xs">Your location</strong>');
    }

    if (route && route.coordinates.length) {
      // Casing under-line for contrast
      L.polyline(route.coordinates, { color: '#0b0b2a', weight: 8, opacity: 0.35 }).addTo(layer);
      L.polyline(route.coordinates, {
        color,
        weight: 5,
        opacity: 0.95,
        lineJoin: 'round',
      }).addTo(layer);
      map.fitBounds(L.latLngBounds(route.coordinates).pad(0.15));
    } else if (userPos) {
      map.fitBounds(
        L.latLngBounds([
          [userPos.lat, userPos.lng],
          [destination.lat, destination.lng],
        ]).pad(0.25),
      );
    }
  }, [route, userPos, leafletReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const straightLine = userPos ? haversineDistance(userPos, destination) : null;

  const profiles: { key: RouteProfile; label: string; icon: string }[] = [
    { key: 'driving', label: 'Drive', icon: 'M5 13l1.5-4.5A2 2 0 018.4 7h7.2a2 2 0 011.9 1.5L19 13M5 13h14v4H5z' },
    { key: 'cycling', label: 'Cycle', icon: 'M6 17a3 3 0 100-6 3 3 0 000 6zm12 0a3 3 0 100-6 3 3 0 000 6zM9 17l3-7 2 4h3' },
    { key: 'walking', label: 'Walk', icon: 'M13 4a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM11 21l1-6 3 2v4M9 12l2-4 3 3' },
  ];

  return (
    <div className="surface-card rounded-2xl overflow-hidden border border-app">
      <style jsx global>{`
        [data-theme='dark'] .leaflet-tile {
          filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%) !important;
        }
        .leaflet-container {
          background: var(--bg) !important;
          font-family: var(--font-premium) !important;
        }
        .leaflet-popup-content-wrapper {
          background: var(--bg-elevated) !important;
          border: 1px solid var(--border) !important;
          border-radius: 10px !important;
          color: var(--text) !important;
        }
      `}</style>

      {/* Summary header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 border-b border-app bg-app/5">
        <div className="flex items-center gap-4">
          {route ? (
            <>
              <div>
                <span className="block text-[10px] uppercase font-bold text-app-muted tracking-wide">ETA</span>
                <span className="text-[17px] font-bold text-app">{formatDuration(route.duration)}</span>
              </div>
              <div className="w-px h-8 bg-[var(--border)]" />
              <div>
                <span className="block text-[10px] uppercase font-bold text-app-muted tracking-wide">Distance</span>
                <span className="text-[17px] font-bold text-app">{formatDistance(route.distance)}</span>
              </div>
            </>
          ) : (
            <div>
              <span className="block text-[10px] uppercase font-bold text-app-muted tracking-wide">Distance (direct)</span>
              <span className="text-[15px] font-bold text-app">
                {loadingRoute ? 'Calculating route…' : straightLine ? formatDistance(straightLine) : 'Awaiting location…'}
              </span>
            </div>
          )}
        </div>

        {/* Travel mode toggle */}
        <div className="flex items-center gap-1 p-1 rounded-[10px] bg-app/10 border border-app">
          {profiles.map((p) => (
            <button
              key={p.key}
              onClick={() => setProfile(p.key)}
              title={p.label}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[7px] text-[12px] font-semibold transition-all ${
                profile === p.key ? 'bg-accent text-white shadow' : 'text-app-muted hover:text-app'
              }`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={p.icon} />
              </svg>
              <span className="hidden sm:inline">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="relative">
        <div ref={mapRef} style={{ height }} className="w-full z-10" />

        {/* Action overlay */}
        <div className="absolute top-3 left-3 z-[999] flex flex-col gap-2">
          <button
            onClick={() => {
              setLiveTracking((v) => !v);
              if (!liveTracking) locateOnce();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-semibold border shadow-md transition-all ${
              liveTracking
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'glass-2 text-app border-[var(--border)] hover:bg-[var(--accent-soft)]'
            }`}
          >
            <span className={`relative flex h-2 w-2 ${liveTracking ? '' : 'opacity-60'}`}>
              {liveTracking && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            {liveTracking ? 'Live tracking on' : 'Live tracking'}
          </button>
          <button
            onClick={locateOnce}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-semibold glass-2 text-app border border-[var(--border)] shadow-md hover:bg-[var(--accent-soft)] transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Recenter on me
          </button>
        </div>

        {!leafletReady && (
          <div className="absolute inset-0 bg-app/80 backdrop-blur-md z-[1000] flex flex-col items-center justify-center gap-2">
            <div className="w-7 h-7 rounded-full border-4 border-accent border-t-transparent animate-spin" />
            <p className="text-xs text-app-muted">Loading directions map…</p>
          </div>
        )}
      </div>

      {/* Error / external links */}
      <div className="p-3.5 border-t border-app space-y-3">
        {error && (
          <div className="px-3 py-2 rounded-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[12px]">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={routingService.googleMapsLink(userPos, destination)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] bg-accent text-white text-[12.5px] font-semibold shadow hover:brightness-95 transition-all"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21s-6-5.7-6-10a6 6 0 1112 0c0 4.3-6 10-6 10z" />
              <circle cx="12" cy="11" r="2" />
            </svg>
            Open in Google Maps
          </a>
          <a
            href={routingService.osmLink(userPos, destination)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] border border-app text-app text-[12.5px] font-semibold hover:bg-[var(--accent-soft)] transition-all"
          >
            Open in OpenStreetMap
          </a>
          {route && (
            <button
              onClick={() => setShowSteps((v) => !v)}
              className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12.5px] font-semibold text-app-muted hover:text-app transition-all"
            >
              {showSteps ? 'Hide' : 'Show'} turn-by-turn ({route.steps.length})
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={showSteps ? 'rotate-180 transition-transform' : 'transition-transform'}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          )}
        </div>

        {/* Turn-by-turn list */}
        {route && showSteps && route.steps.length > 0 && (
          <ol className="max-h-[260px] overflow-y-auto rounded-[10px] border border-app divide-y divide-[var(--border-soft)]">
            {route.steps.map((step, i) => (
              <li key={i} className="flex items-center gap-3 px-3 py-2.5">
                <span className="shrink-0 w-7 h-7 rounded-full bg-[var(--accent-soft)] flex items-center justify-center text-accent">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={MANEUVER_ICONS[step.type] || MANEUVER_ICONS.continue} />
                  </svg>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-app font-medium leading-snug">{step.instruction}</p>
                </div>
                {step.distance > 0 && (
                  <span className="shrink-0 text-[11.5px] text-app-muted font-medium">{formatDistance(step.distance)}</span>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
