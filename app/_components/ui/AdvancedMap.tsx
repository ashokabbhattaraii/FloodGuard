'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { routingService, formatDistance, formatDuration, haversineDistance, resolveShelterCoords } from '@/app/services/routing';
import { NEPAL_MAP_OPTIONS, KATHMANDU_CENTER, MAP_MAX_ZOOM } from '@/app/lib/map-config';

interface MapProps {
  role?: 'resident' | 'volunteer' | 'admin';
  shelters?: any[];
  reports?: any[];
  requests?: any[];
  regions?: any[];
  /** Tailwind height class for the map canvas when not in fullscreen mode */
  heightClass?: string;
  onClaimRequest?: (requestId: string) => Promise<void>;
}

type BaseLayer = 'street' | 'satellite' | 'topo';

const BASE_LAYERS: Record<BaseLayer, { url: string; attribution: string; label: string; subdomains: string; className: string }> = {
  street: {
    // Clean, uncluttered street style (CartoDB Voyager) — keeps the focus on data markers
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors © CARTO',
    label: 'Street',
    subdomains: 'abcd',
    className: 'fg-tiles-street',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics',
    label: 'Satellite',
    subdomains: 'abc',
    className: 'fg-tiles-raw',
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap (CC-BY-SA)',
    label: 'Terrain',
    subdomains: 'abc',
    className: 'fg-tiles-street',
  },
};

const RISK_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#a855f7',
  moderate: '#a855f7',
  low: '#22c55e',
};

export default function AdvancedMap({
  role = 'resident',
  shelters = [],
  reports = [],
  requests = [],
  regions = [],
  heightClass = 'h-[580px]',
  onClaimRequest,
}: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const leafletInstance = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const zonesLayerRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const tempMarkerRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);

  const [loaded, setLoaded] = useState(false);
  const [filterShelters, setFilterShelters] = useState(true);
  const [filterRequests, setFilterRequests] = useState(true);
  const [filterReports, setFilterReports] = useState(true);
  const [filterZones, setFilterZones] = useState(true);
  const [activeRegion, setActiveRegion] = useState('all');
  const [baseLayer, setBaseLayer] = useState<BaseLayer>('street');
  const [fullscreen, setFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [nearest, setNearest] = useState<{ name: string; distance: number; duration: number } | null>(null);
  const [routing, setRouting] = useState(false);

  const REGIONS = {
    kathmandu: { lat: 27.7172, lng: 85.324, zoom: 13 },
    pokhara: { lat: 28.2096, lng: 83.9856, zoom: 13 },
    terai: { lat: 27.2, lng: 85.0, zoom: 10 },
  };

  // Resolve a shelter's coordinates as accurately as possible (shared helper).
  const shelterCoords = useCallback((shelter: any) => resolveShelterCoords(shelter), []);

  /* ---------- Load Leaflet ---------- */
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

  /* ---------- Init Map ---------- */
  useEffect(() => {
    if (!loaded || !mapRef.current || leafletInstance.current) return;
    const L = (window as any).L;
    if (!L) return;

    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const map = L.map(mapRef.current, { zoomControl: false, ...NEPAL_MAP_OPTIONS }).setView(KATHMANDU_CENTER, 13);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const base = BASE_LAYERS[baseLayer];
    tileLayerRef.current = L.tileLayer(base.url, { maxZoom: MAP_MAX_ZOOM, attribution: base.attribution, subdomains: base.subdomains, className: base.className }).addTo(map);

    zonesLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    leafletInstance.current = map;

    map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;
      if (tempMarkerRef.current) map.removeLayer(tempMarkerRef.current);
      const popupContent = `
        <div class="p-3 text-app space-y-2 max-w-[200px]">
          <h4 class="text-xs font-bold border-b border-[var(--border)] pb-1 mb-2">Selected Location</h4>
          <p class="text-[10px] text-app-muted">Lat: ${lat.toFixed(5)}<br/>Lng: ${lng.toFixed(5)}</p>
          <div class="flex flex-col gap-1.5 pt-1">
            <a href="/dashboard/resident/reports?lat=${lat}&lng=${lng}" class="px-2.5 py-1 text-center rounded-[6px] bg-accent text-white text-[11px] font-bold hover:brightness-95 transition-all">Report Flood Here</a>
            <a href="/dashboard/resident/requests?lat=${lat}&lng=${lng}" class="px-2.5 py-1 text-center rounded-[6px] border border-[var(--border)] text-app text-[11px] font-medium hover:bg-[var(--accent-soft)] transition-all">Request SOS Here</a>
          </div>
        </div>`;
      tempMarkerRef.current = L.marker([lat, lng]).addTo(map).bindPopup(popupContent).openPopup();
    });

    return () => {
      if (leafletInstance.current) {
        leafletInstance.current.remove();
        leafletInstance.current = null;
      }
    };
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- Switch base layer ---------- */
  useEffect(() => {
    if (!leafletInstance.current) return;
    const L = (window as any).L;
    if (tileLayerRef.current) leafletInstance.current.removeLayer(tileLayerRef.current);
    const base = BASE_LAYERS[baseLayer];
    tileLayerRef.current = L.tileLayer(base.url, { maxZoom: MAP_MAX_ZOOM, attribution: base.attribution, subdomains: base.subdomains, className: base.className }).addTo(leafletInstance.current);
    tileLayerRef.current.bringToBack();
  }, [baseLayer]);

  /* ---------- Draw region risk zones ---------- */
  useEffect(() => {
    if (!leafletInstance.current || !zonesLayerRef.current) return;
    const L = (window as any).L;
    const layer = zonesLayerRef.current;
    layer.clearLayers();
    if (!filterZones) return;

    regions.forEach((r: any) => {
      const c = r.coordinates;
      if (!c?.lat || !c?.lng) return;
      const color = RISK_COLORS[(r.riskLevel || '').toLowerCase()] || '#8b8ba3';
      L.circle([c.lat, c.lng], {
        color,
        fillColor: color,
        fillOpacity: 0.12,
        weight: 1.5,
        radius: 2500,
      })
        .addTo(layer)
        .bindPopup(
          `<div class="p-2.5 text-app min-w-[180px]">
            <h4 class="text-xs font-bold">${r.name}</h4>
            <p class="text-[10px] mt-1" style="color:${color}"><strong>Risk: ${(r.riskLevel || 'unknown').toUpperCase()}</strong></p>
            <p class="text-[10px] text-app-muted mt-0.5">${r.sensors?.length ?? 0} sensors • ${r.alerts?.length ?? 0} alerts</p>
          </div>`,
        );
    });
  }, [regions, filterZones, loaded]);

  /* ---------- Plot markers ---------- */
  useEffect(() => {
    if (!leafletInstance.current || !markersLayerRef.current) return;
    const L = (window as any).L;
    if (!L) return;
    const markersLayer = markersLayerRef.current;
    markersLayer.clearLayers();

    const createPulsingIcon = (color: string) =>
      L.divIcon({
        className: 'custom-pulse-marker',
        html: `<div class="relative flex items-center justify-center w-6 h-6">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style="background-color:${color};"></span>
          <span class="relative inline-flex rounded-full h-3.5 w-3.5 border border-white" style="background-color:${color};"></span>
        </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

    if (filterShelters) {
      shelters.forEach((shelter) => {
        const { lat, lng } = shelterCoords(shelter);
        const rd = typeof shelter.routeData === 'string' ? safeParse(shelter.routeData) : shelter.routeData;
        const cur = rd?.currentCount ?? 0;
        const pct = Math.min(Math.round((cur / (shelter.capacity || 1)) * 100), 100);
        const popupHtml = `
          <div class="p-3 text-app space-y-2 min-w-[220px]">
            <span class="px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase" style="color:#0369a1;background:#0369a126;">Evacuation Center</span>
            <h4 class="text-xs font-bold text-app mt-1 mb-1">${shelter.shelterName}</h4>
            <div class="text-[10px] text-app-muted"><strong>Capacity:</strong> ${shelter.capacity} people</div>
            <div class="space-y-1">
              <div class="flex justify-between text-[9px] font-bold text-app"><span>Occupancy</span><span>${pct}%</span></div>
              <div class="h-1 rounded-full bg-[var(--accent-soft)] overflow-hidden"><div class="h-full bg-[#0369a1]" style="width:${pct}%;"></div></div>
            </div>
            <button onclick="window.fgRouteTo?.(${lat},${lng},'${(shelter.shelterName || '').replace(/'/g, '')}')" class="w-full mt-1 py-1 px-3 bg-accent text-white text-[11px] font-bold rounded-[6px] hover:brightness-95 transition-all">Get Directions</button>
          </div>`;
        L.marker([lat, lng], { icon: createPulsingIcon('#0369a1') }).addTo(markersLayer).bindPopup(popupHtml);
      });
    }

    if (filterRequests) {
      requests.forEach((req) => {
        if (!req.latitude || !req.longitude) return;
        const colorMap: Record<string, string> = { critical: '#dc2626', high: '#f97316', medium: '#ca8a04', low: '#16a34a' };
        const pColor = colorMap[req.priority] || '#8b8ba3';
        const popupHtml = `
          <div class="p-3 text-app space-y-2 min-w-[220px]">
            <div class="flex justify-between items-center">
              <span class="px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase" style="color:${pColor};background-color:${pColor}1a;">SOS: ${req.priority}</span>
              <span class="text-[9px] font-medium text-app-muted uppercase">${req.status}</span>
            </div>
            <h4 class="text-xs font-bold text-app mt-1">${req.title}</h4>
            <p class="text-[10px] text-app-muted leading-relaxed">${req.description || 'No description provided.'}</p>
            <div class="text-[10px] text-app-muted border-t border-[var(--border-soft)] pt-1.5 mt-1.5 space-y-0.5">
              <div><strong>Location:</strong> ${req.location || 'Unknown'}</div>
              <div><strong>People Count:</strong> ${req.peopleCount || 1}</div>
              ${req.contactPhone ? `<div><strong>Contact:</strong> ${req.contactPhone}</div>` : ''}
            </div>
            <button onclick="window.fgRouteTo?.(${req.latitude},${req.longitude},'${(req.title || '').replace(/'/g, '')}')" class="w-full mt-1 py-1 px-3 border border-[var(--border)] text-app text-[11px] font-bold rounded-[6px] hover:bg-[var(--accent-soft)] transition-all">Get Directions</button>
            ${
              role === 'volunteer' && req.status === 'pending'
                ? `<button onclick="window.claimSOSRequest?.('${req.id}')" class="w-full mt-1.5 py-1 px-3 bg-accent text-white text-[11px] font-bold rounded-[6px] hover:brightness-95 transition-all">Claim SOS Request</button>`
                : ''
            }
          </div>`;
        L.marker([req.latitude, req.longitude], { icon: createPulsingIcon(pColor) }).addTo(markersLayer).bindPopup(popupHtml);
      });
    }

    if (filterReports) {
      reports.forEach((rep) => {
        if (!rep.latitude || !rep.longitude) return;
        const popupHtml = `
          <div class="p-3 text-app space-y-2 min-w-[220px]">
            <span class="px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase" style="color:#a855f7;background:#a855f726;">Flood Report</span>
            <h4 class="text-xs font-bold text-app mt-1 mb-1">${rep.description}</h4>
            <div class="text-[10px] text-app-muted border-t border-[var(--border-soft)] pt-1.5 mt-1.5 space-y-0.5">
              ${rep.waterLevel ? `<div><strong>Estimated Water Level:</strong> ${rep.waterLevel}m</div>` : ''}
              <div><strong>Status:</strong> <span class="capitalize font-bold text-app">${rep.status}</span></div>
            </div>
          </div>`;
        L.marker([rep.latitude, rep.longitude], { icon: createPulsingIcon('#a855f7') }).addTo(markersLayer).bindPopup(popupHtml);
      });
    }
  }, [filterShelters, filterRequests, filterReports, shelters, requests, reports, role, shelterCoords]);

  /* ---------- Window bridges for popup buttons ---------- */
  useEffect(() => {
    (window as any).fgRouteTo = (lat: number, lng: number, name: string) => routeToPoint({ lat, lng }, name);
    if (onClaimRequest) {
      (window as any).claimSOSRequest = (id: string) => onClaimRequest(id).catch(console.error);
    }
    return () => {
      delete (window as any).fgRouteTo;
      delete (window as any).claimSOSRequest;
    };
  }, [onClaimRequest]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- Routing on the map ---------- */
  const routeToPoint = useCallback((dest: { lat: number; lng: number }, name: string) => {
    if (!navigator.geolocation) {
      alert('Geolocation is not available.');
      return;
    }
    setRouting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const from = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        try {
          const r = await routingService.getRoute(from, { lat: dest.lat, lng: dest.lng });
          const L = (window as any).L;
          const layer = routeLayerRef.current;
          layer.clearLayers();
          L.polyline(r.coordinates, { color: '#0b0b2a', weight: 8, opacity: 0.35 }).addTo(layer);
          L.polyline(r.coordinates, { color: 'var(--accent)', weight: 5, opacity: 0.95 }).addTo(layer);
          L.marker([from.lat, from.lng]).addTo(layer).bindPopup('Your location');
          leafletInstance.current.fitBounds(L.latLngBounds(r.coordinates).pad(0.15));
          setNearest({ name, distance: r.distance, duration: r.duration });
        } catch {
          alert('Could not calculate a route to this location.');
        } finally {
          setRouting(false);
        }
      },
      () => {
        setRouting(false);
        alert('Could not access your location for directions.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  /* ---------- Route to nearest shelter (resident) ---------- */
  const routeToNearestShelter = useCallback(() => {
    if (!shelters.length) {
      alert('No evacuation centers available.');
      return;
    }
    if (!navigator.geolocation) return;
    setRouting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const from = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        let best: any = null;
        let bestD = Infinity;
        shelters.forEach((s) => {
          const c = shelterCoords(s);
          const d = haversineDistance(from, c);
          if (d < bestD) {
            bestD = d;
            best = { ...c, name: s.shelterName };
          }
        });
        setRouting(false);
        if (best) routeToPoint({ lat: best.lat, lng: best.lng }, best.name);
      },
      () => {
        setRouting(false);
        alert('Could not access your location.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [shelters, shelterCoords, routeToPoint]);

  const clearRoute = () => {
    routeLayerRef.current?.clearLayers();
    setNearest(null);
  };

  /* ---------- Location search (Nominatim) ---------- */
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !leafletInstance.current) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(searchQuery)}`,
      );
      const data = await res.json();
      if (data?.length) {
        const { lat, lon } = data[0];
        leafletInstance.current.flyTo([Number(lat), Number(lon)], 14, { animate: true, duration: 1.2 });
        const L = (window as any).L;
        if (tempMarkerRef.current) leafletInstance.current.removeLayer(tempMarkerRef.current);
        tempMarkerRef.current = L.marker([Number(lat), Number(lon)])
          .addTo(leafletInstance.current)
          .bindPopup(`<strong class="text-xs">${data[0].display_name}</strong>`)
          .openPopup();
      } else {
        alert('Location not found.');
      }
    } catch {
      alert('Search failed. Check your connection.');
    } finally {
      setSearching(false);
    }
  };

  const handleFlyTo = (regionKey: string) => {
    setActiveRegion(regionKey);
    if (!leafletInstance.current) return;
    const map = leafletInstance.current;
    if (regionKey === 'all') {
      map.setView([27.7172, 85.324], 13);
    } else {
      const coord = (REGIONS as any)[regionKey];
      if (coord) map.flyTo([coord.lat, coord.lng], coord.zoom, { animate: true, duration: 1.5 });
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation || !leafletInstance.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        leafletInstance.current.flyTo([latitude, longitude], 15, { animate: true, duration: 1.2 });
        const L = (window as any).L;
        if (L) {
          L.circle([latitude, longitude], { color: 'var(--accent)', fillColor: 'var(--accent)', fillOpacity: 0.15, radius: 150 }).addTo(markersLayerRef.current);
        }
      },
      () => alert('Could not retrieve your current location.'),
    );
  };

  // Recalculate map size after fullscreen toggle
  useEffect(() => {
    if (leafletInstance.current) {
      setTimeout(() => leafletInstance.current.invalidateSize(), 250);
    }
  }, [fullscreen]);

  return (
    <div
      ref={containerRef}
      className={`surface-card rounded-2xl overflow-hidden relative border border-app pointer-events-none ${
        fullscreen ? 'fixed inset-3 z-[2000] rounded-2xl' : ''
      }`}
    >
      <style jsx global>{`
        [data-theme='dark'] .fg-tiles-street {
          filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%) !important;
        }
        [data-theme='dark'] .fg-tiles-raw {
          filter: brightness(85%) !important;
        }
        .leaflet-container {
          background: var(--bg) !important;
          font-family: var(--font-premium) !important;
        }
        .leaflet-popup-content-wrapper {
          background: var(--bg-elevated) !important;
          border: 1px solid var(--border) !important;
          border-radius: 12px !important;
          box-shadow: var(--shadow-card) !important;
          color: var(--text) !important;
          padding: 0 !important;
          overflow: hidden;
        }
        .leaflet-popup-content { margin: 0 !important; line-height: inherit !important; }
        .leaflet-popup-tip { background: var(--bg-elevated) !important; border: 1px solid var(--border) !important; }
      `}</style>

      {/* Top-left: Search + Layers */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2.5 w-[270px] max-w-[calc(100vw-2rem)] pointer-events-auto">
        <form onSubmit={handleSearch} className="glass-2 rounded-xl p-1.5 border border-[var(--border)] shadow-lg flex items-center gap-1.5">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search place or address…"
            className="bg-transparent text-xs text-app px-2 py-1 outline-none flex-1 min-w-0"
          />
          <button type="submit" disabled={searching} className="px-2.5 py-1.5 rounded-lg bg-accent text-white text-[11px] font-bold shrink-0 disabled:opacity-60 hover:brightness-95">
            {searching ? '…' : 'Go'}
          </button>
        </form>

        <div className="glass-2 rounded-xl p-3 border border-[var(--border)] shadow-lg space-y-2">
          <h4 className="text-[11px] font-bold text-app uppercase tracking-wider mb-1 border-b border-[var(--border-soft)] pb-1">Map Layers</h4>
          {[
            { state: filterZones, set: setFilterZones, label: '⬣ Risk Zones' },
            { state: filterShelters, set: setFilterShelters, label: '🏢 Evacuation Centers' },
            { state: filterRequests, set: setFilterRequests, label: '🆘 SOS Requests' },
            { state: filterReports, set: setFilterReports, label: '🌊 Community Reports' },
          ].map((row) => (
            <label key={row.label} className="flex items-center gap-2 text-xs text-app cursor-pointer hover:opacity-80 transition-opacity">
              <input type="checkbox" className="rounded accent-accent" checked={row.state} onChange={() => row.set(!row.state)} />
              {row.label}
            </label>
          ))}
        </div>

        {/* Region jump */}
        <div className="glass-2 rounded-xl p-2.5 border border-[var(--border)] shadow-lg flex flex-col gap-2">
          <span className="text-[11px] font-bold text-app">Jump:</span>
          <div className="flex gap-1 flex-wrap">
            {['kathmandu', 'pokhara', 'terai'].map((reg) => (
              <button
                key={reg}
                onClick={() => handleFlyTo(reg)}
                className={`px-2.5 py-1.5 text-[10px] font-semibold rounded-md capitalize transition-all ${
                  activeRegion === reg ? 'bg-accent text-white' : 'bg-transparent text-app hover:bg-[var(--accent-soft)]'
                }`}
              >
                {reg}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top-right: tools */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2 items-end pointer-events-auto">
        <div className="flex gap-2 flex-wrap justify-end">
          {role === 'resident' && (
            <button
              onClick={routeToNearestShelter}
              disabled={routing}
              className="px-3 h-10 rounded-xl glass-2 border border-[var(--border)] shadow-lg flex items-center gap-1.5 text-app text-[11px] font-semibold hover:bg-[var(--accent-soft)] transition-all disabled:opacity-60"
              title="Route to nearest shelter"
            >
              🏢 {routing ? 'Routing…' : 'Nearest Shelter'}
            </button>
          )}
          <button onClick={() => setFullscreen((v) => !v)} className="w-10 h-10 rounded-xl glass-2 border border-[var(--border)] shadow-lg flex items-center justify-center hover:bg-[var(--accent-soft)] text-app transition-all" title="Fullscreen">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              {fullscreen ? <path d="M9 9H5V5M15 9h4V5M9 15H5v4M15 15h4v4" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
            </svg>
          </button>
          <button onClick={handleLocateMe} className="w-10 h-10 rounded-xl glass-2 border border-[var(--border)] shadow-lg flex items-center justify-center hover:bg-[var(--accent-soft)] text-app transition-all" title="Locate Me">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
            </svg>
          </button>
        </div>

        {/* Base layer switcher */}
        <div className="glass-2 rounded-xl p-1 border border-[var(--border)] shadow-lg flex gap-1">
          {(Object.keys(BASE_LAYERS) as BaseLayer[]).map((key) => (
            <button
              key={key}
              onClick={() => setBaseLayer(key)}
              className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all ${
                baseLayer === key ? 'bg-accent text-white' : 'text-app hover:bg-[var(--accent-soft)]'
              }`}
            >
              {BASE_LAYERS[key].label}
            </button>
          ))}
        </div>
      </div>

      {/* Route info banner */}
      {nearest && (
        <div className="absolute bottom-4 right-4 z-[1000] glass-2 rounded-xl p-3 border border-[var(--border)] shadow-lg max-w-[240px] pointer-events-auto">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase font-bold text-app-muted tracking-wide">Route to</p>
              <p className="text-[12.5px] font-bold text-app line-clamp-1">{nearest.name}</p>
              <p className="text-[12px] text-accent font-semibold mt-1">
                {formatDistance(nearest.distance)} • {formatDuration(nearest.duration)}
              </p>
            </div>
            <button onClick={clearRoute} className="text-app-muted hover:text-app text-xs transition-colors" title="Clear route">✕</button>
          </div>
        </div>
      )}

      {/* Helper */}
      <div className="absolute bottom-4 left-4 z-[1000] glass-2 rounded-xl p-2.5 border border-[var(--border)] shadow-lg max-w-[260px] pointer-events-auto">
        <p className="text-[10px] text-app-muted leading-tight">
          💡 <strong className="text-app">Tip:</strong> Click the map to geotag a report or SOS. Use popups to get live directions.
        </p>
      </div>

      <div ref={mapRef} className={`w-full ${fullscreen ? 'h-full' : heightClass} z-10 pointer-events-auto`} />

      {!loaded && (
        <div className="absolute inset-0 bg-app/80 backdrop-blur-md z-[1000] flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin" />
          <p className="text-xs text-app-muted">Initializing OpenStreetMap Engine…</p>
        </div>
      )}
    </div>
  );
}

function safeParse(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
