'use client';

import { useRegions, useCreateRegion } from '@/app/queries/regions';
import { useState } from 'react';

const RISK_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#0369a1',
  low: '#16a34a',
};

export default function RegionManagement() {
  const { data: regions, isLoading } = useRegions();
  const createRegion = useCreateRegion();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createRegion.mutateAsync({ name: name.trim() });
    setName('');
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-app">Region Management</h1>
        <button className="btn-primary px-4 py-2 text-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Region'}
        </button>
      </div>

      {showForm && (
        <div className="surface-card rounded-[12px] p-5 flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs text-app-muted mb-1">Region Name</label>
            <input
              className="w-full rounded-[8px] border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-app focus:outline-none focus:ring-2 focus:ring-accent/40"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. River Basin Valley"
            />
          </div>
          <button
            className="btn-primary px-4 py-2 text-sm"
            disabled={createRegion.isPending || !name.trim()}
            onClick={handleCreate}
          >
            {createRegion.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="surface-card rounded-[12px] p-5 animate-pulse h-[180px]" />
          ))}
        </div>
      ) : !regions || (regions as Array<Record<string, unknown>>).length === 0 ? (
        <div className="surface-card rounded-[12px] p-10 text-center text-app-muted">
          No regions have been configured yet. Click &quot;Add Region&quot; to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(regions as Array<Record<string, unknown>>).map((r: Record<string, unknown>) => {
            const risk = (r.riskLevel as string) || 'low';
            const color = RISK_COLORS[risk] || RISK_COLORS.low;
            const sensorCount = Array.isArray(r.sensors) ? r.sensors.length : 0;
            const alertCount = Array.isArray(r.alerts) ? r.alerts.length : 0;
            const updatedAt = r.updatedAt ? new Date(r.updatedAt as string) : null;
            const timeAgo = updatedAt ? getTimeAgo(updatedAt) : '—';

            return (
              <div
                key={r.id as string}
                className="relative overflow-hidden surface-card rounded-[12px] p-5 transition-all duration-200"
                style={{ background: `linear-gradient(135deg, ${color}08 0%, var(--card-bg) 60%)` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-app">{r.name as string}</h3>
                  <span
                    className="px-2.5 py-1 rounded-[6px] text-[11px] font-medium capitalize"
                    style={{ backgroundColor: `${color}1a`, color }}
                  >
                    {risk}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-app-muted">Sensors</div>
                    <div className="text-lg font-bold text-app">{sensorCount}</div>
                  </div>
                  <div>
                    <div className="text-xs text-app-muted">Active Alerts</div>
                    <div className="text-lg font-bold text-app">{alertCount}</div>
                  </div>
                  <div>
                    <div className="text-xs text-app-muted">Updated</div>
                    <div className="text-sm text-app-muted">{timeAgo}</div>
                  </div>
                </div>
                <p className="text-xs text-app-muted">
                  {alertCount > 0
                    ? `⚠ ${alertCount} active alert${alertCount > 1 ? 's' : ''} in this region.`
                    : '✓ All systems normal. Routine monitoring active.'}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
