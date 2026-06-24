'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRegions } from '@/app/queries/regions';
import { useWeather } from '@/app/queries/weather';
import { useEvacuationRoutes } from '@/app/queries/evacuation';
import { useReports } from '@/app/queries/reports';
import { useFloodRequests } from '@/app/queries/flood-requests';
import Link from 'next/link';

// Dynamically import map with SSR disabled to prevent Leaflet window reference errors
const AdvancedMap = dynamic(() => import('@/app/_components/ui/AdvancedMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[580px] rounded-2xl bg-[var(--accent-soft)] flex items-center justify-center flex-col gap-2">
      <div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin" />
      <span className="text-xs text-app-muted">Loading Map Component...</span>
    </div>
  ),
});

const riskColors: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#a855f7',
  low: '#22c55e',
};

const riskInfo = [
  { level: 'Critical', color: '#ef4444', desc: 'Immediate evacuation recommended. Water levels exceeding safe thresholds.', action: 'Evacuate immediately to designated shelters.' },
  { level: 'High', color: '#f97316', desc: 'Significant flooding expected. Prepare for possible evacuation.', action: 'Pack essentials, stay alert for evacuation orders.' },
  { level: 'Moderate', color: '#a855f7', desc: 'Rising water levels detected. Monitor updates closely.', action: 'Avoid low-lying areas, secure valuables.' },
  { level: 'Low', color: '#22c55e', desc: 'Normal conditions. No immediate flood threat.', action: 'No action needed. Stay informed.' },
];

type MapTab = 'map' | 'info';

export default function MapPage() {
  const { data: regions = [], isLoading: loadingRegions } = useRegions() as any;
  const { data: weather } = useWeather('Kathmandu');
  const { data: shelters = [] } = useEvacuationRoutes() as any;
  const { data: reports = [] } = useReports() as any;
  const { data: requests = [] } = useFloodRequests() as any;

  const [tab, setTab] = useState<MapTab>('map');

  // Aggregate metrics
  const totalShelters = Array.isArray(shelters) ? shelters.length : 0;
  const activeSOS = Array.isArray(requests) ? requests.filter((r: any) => r.status !== 'completed' && r.status !== 'cancelled').length : 0;
  const recentReports = Array.isArray(reports) ? reports.length : 0;
  const highRiskCount = Array.isArray(regions)
    ? (regions as any[]).filter((r) => ['critical', 'high'].includes((r.riskLevel || '').toLowerCase())).length
    : 0;

  const tabs: { key: MapTab; label: string; icon: string }[] = [
    { key: 'map', label: 'Live Map', icon: 'M9 20l-5.5 2.7V5.3L9 2.6m0 17.4l6-2.7m-6 2.7V2.6m6 14.7l5.5 2.7V5.3L15 2.6m0 14.7V2.6m-6 0l6 2.7' },
    { key: 'info', label: 'Dashboard Info', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-app">Interactive Flood Map</h1>
          <p className="text-sm text-app-muted">Real-time situational dashboard of flood alerts, shelters, and emergency SOS requests.</p>
        </div>

        {weather && (
          <div className="surface-card rounded-xl px-4 py-2 flex items-center gap-3 text-xs border border-app shadow-sm">
            <span className="font-semibold text-app">🌤️ Kathmandu:</span>
            <span className="text-app">{weather.temperature ?? 28}°C</span>
            <span className="text-app-muted">•</span>
            <span className="text-app-muted capitalize">{getWeatherCondition(weather.weatherCode)}</span>
            <span className="text-app-muted">•</span>
            <span className="text-app-muted">Humidity: {weather.humidity ?? 80}%</span>
          </div>
        )}
      </div>

      {/* Tab switcher */}
      <div className="inline-flex items-center gap-1 p-1 rounded-[12px] surface-card border border-app shadow-sm">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-[9px] text-[13px] font-semibold transition-all ${
              tab === t.key ? 'bg-accent text-white shadow' : 'text-app-muted hover:text-app'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d={t.icon} />
            </svg>
            {t.label}
          </button>
        ))}
      </div>

      {/* ============ MAP TAB ============ */}
      {tab === 'map' && (
        <AdvancedMap
          role="resident"
          shelters={shelters}
          reports={reports}
          requests={requests}
          regions={regions}
          heightClass="h-[calc(100vh-230px)] min-h-[560px]"
        />
      )}

      {/* ============ DASHBOARD INFO TAB ============ */}
      {tab === 'info' && (
        <div className="space-y-6">
          {/* Stats Summary Panel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="surface-card rounded-2xl p-5 border border-app shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-app-muted font-medium">Safe Shelters</span>
                <span className="p-1.5 rounded-lg bg-[#0369a1]1a text-[#0369a1]">🏢</span>
              </div>
              <p className="text-2xl font-bold text-[#0369a1]">{totalShelters}</p>
              <p className="text-[11px] text-app-muted mt-1">Designated safe evacuation centers</p>
            </div>

            <div className="surface-card rounded-2xl p-5 border border-app shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-app-muted font-medium">Active SOS Alerts</span>
                <span className="p-1.5 rounded-lg bg-[#ef4444]1a text-[#ef4444]">🆘</span>
              </div>
              <p className="text-2xl font-bold text-[#ef4444]">{activeSOS}</p>
              <p className="text-[11px] text-[#ef4444] font-medium mt-1">Requires immediate response</p>
            </div>

            <div className="surface-card rounded-2xl p-5 border border-app shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-app-muted font-medium">Community Reports</span>
                <span className="p-1.5 rounded-lg bg-[#a855f7]1a text-[#a855f7]">🌊</span>
              </div>
              <p className="text-2xl font-bold text-[#a855f7]">{recentReports}</p>
              <p className="text-[11px] text-app-muted mt-1">Crowdsourced water level reports</p>
            </div>

            <div className="surface-card rounded-2xl p-5 border border-app shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-app-muted font-medium">High-Risk Zones</span>
                <span className="p-1.5 rounded-lg bg-[#f97316]1a text-[#f97316]">⚠️</span>
              </div>
              <p className="text-2xl font-bold text-[#f97316]">{highRiskCount}</p>
              <p className="text-[11px] text-app-muted mt-1">Regions at critical / high risk</p>
            </div>
          </div>

          {/* Region risk summary grid */}
          <div className="surface-card rounded-2xl p-6 border border-app shadow-sm">
            <h2 className="text-lg font-bold text-app mb-4">Region Risk Summary</h2>
            {loadingRegions ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-28 rounded-2xl bg-[var(--accent-soft)] animate-pulse border border-app" />
                ))}
              </div>
            ) : regions.length === 0 ? (
              <div className="rounded-2xl p-6 text-center text-app-muted text-xs border border-dashed border-app">
                No active regions monitored.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(regions as any[]).map((r: any) => {
                  const color = riskColors[r.riskLevel] || '#8b8ba3';
                  return (
                    <div key={r.id} className="rounded-2xl p-4 space-y-3 border border-app shadow-sm hover:scale-[1.01] transition-transform duration-200 bg-app/5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-app">{r.name}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase" style={{ color, background: `${color}18` }}>
                          {r.riskLevel}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-app-muted">
                        <span>Sensors: {r.sensors?.length ?? 0} active</span>
                        <span>Alerts: {r.alerts?.length ?? 0} current</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-[var(--border-soft)]">
                        <Link href={`/dashboard/resident/reports?lat=${r.coordinates?.lat ?? ''}&lng=${r.coordinates?.lng ?? ''}`} className="text-[11px] text-accent hover:underline font-semibold">
                          Report Flood →
                        </Link>
                        <Link href={`/dashboard/resident/requests?lat=${r.coordinates?.lat ?? ''}&lng=${r.coordinates?.lng ?? ''}`} className="text-[11px] text-red-500 hover:underline font-semibold">
                          Request SOS →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Legend / Risk Levels Explanation */}
          <div className="surface-card rounded-2xl p-6 border border-app shadow-sm">
            <h2 className="text-lg font-bold text-app mb-4">Understanding Risk Levels & Guidelines</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {riskInfo.map((r) => (
                <div key={r.level} className="rounded-xl border border-app p-4 space-y-2 bg-app/5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full animate-pulse" style={{ background: r.color }} />
                    <span className="text-sm font-bold" style={{ color: r.color }}>{r.level}</span>
                  </div>
                  <p className="text-xs text-app-muted leading-relaxed">{r.desc}</p>
                  <p className="text-[11px] text-app"><strong>Action Protocol:</strong> {r.action}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getWeatherCondition(code?: number): string {
  if (code === undefined) return 'Clear';
  if (code === 0) return 'Clear';
  if (code >= 1 && code <= 3) return 'Partly Cloudy';
  if (code >= 45 && code <= 48) return 'Foggy';
  if (code >= 51 && code <= 67) return 'Rainy';
  if (code >= 80 && code <= 82) return 'Rain Showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Overcast';
}
