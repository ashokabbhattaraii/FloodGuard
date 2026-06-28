'use client';

import { useState, useEffect } from 'react';
import { alertsService } from '@/app/services';

interface Alert { id: string; title: string; severity: string; regionName: string; createdAt: string; status: string; description?: string; }

const severityColors: Record<string, string> = { critical: '#dc2626', high: '#f97316', medium: '#0369a1', low: '#16a34a' };
const filters = ['all', 'critical', 'high', 'medium', 'low'] as const;

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins} min ago`;
  return `${Math.round(mins / 60)} hr ago`;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  useEffect(() => {
    alertsService.getAll()
      .then(data => { setAlerts(Array.isArray(data) ? data as Alert[] : []); setLoading(false); })
      .catch(() => { setAlerts([]); setError(true); setLoading(false); });
  }, []);

  const filtered = activeFilter === 'all' ? alerts : alerts.filter(a => a.severity === activeFilter);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-app">Flood Alerts</h1>

      {error && (
        <div className="px-4 py-2 rounded-xl bg-[rgba(245,166,35,0.08)] border border-[rgba(245,166,35,0.2)] text-[#f5a623] text-xs">
          Could not load alerts — please check your connection and try again.
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {filters.map(f => (
          <button key={f} onClick={() => setActiveFilter(f)} className="min-h-10 px-4 py-2 rounded-[10px] text-sm font-medium border transition-all" style={activeFilter === f ? { background: f === 'all' ? 'var(--accent)' : `${severityColors[f]}20`, color: f === 'all' ? '#ffffff' : severityColors[f], borderColor: f === 'all' ? 'var(--accent)' : `${severityColors[f]}55` } : { background: 'var(--glass-bg-2)', color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Alerts list */}
      {loading ? (
        <div className="space-y-4">{[1,2,3,4].map(i => <div key={i} className="h-24 rounded-[12px] bg-[var(--accent-soft)] animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-app-muted text-sm py-8 text-center">No alerts matching this filter</p>
      ) : (
        <div className="space-y-4">
          {filtered.map(a => (
            <div key={a.id} className="surface-card rounded-[12px] p-5 hover:border-[var(--accent)] transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-1 rounded-[6px] text-[11px] font-medium" style={{ background: `${severityColors[a.severity] ?? 'var(--text-muted)'}26`, color: severityColors[a.severity] ?? 'var(--text-muted)' }}>
                      {a.severity?.toUpperCase()}
                    </span>
                    <span className="text-app-muted text-xs">{a.createdAt ? timeAgo(a.createdAt) : ''}</span>
                  </div>
                  <h3 className="text-app font-medium">{a.title}</h3>
                </div>
                <span className="text-app-muted text-xs whitespace-nowrap">{a.regionName}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
