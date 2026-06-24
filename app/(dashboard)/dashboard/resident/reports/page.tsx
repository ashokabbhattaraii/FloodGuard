'use client';

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { reportsService } from '@/app/services';
import {
  EmptyState,
  LoadingRows,
  PageHeader,
  SectionCard,
  StatCard,
} from '@/app/(dashboard)/_components/DashboardUI';

const LocationPicker = dynamic(() => import('@/app/_components/ui/LocationPicker'), { ssr: false });

const statusColor: Record<string, string> = {
  pending: '#ca8a04',
  verified: '#16a34a',
  rejected: '#dc2626',
  resolved: '#16a34a',
};

const severityOptions: { value: string; label: string; hint: string; color: string }[] = [
  { value: 'low', label: 'Low', hint: 'Minor waterlogging', color: '#16a34a' },
  { value: 'medium', label: 'Medium', hint: 'Road disruption', color: '#0369a1' },
  { value: 'high', label: 'High', hint: 'Residential flooding', color: '#f97316' },
  { value: 'critical', label: 'Critical', hint: 'Life threatening', color: '#dc2626' },
];

const severityColor = (s?: string) => severityOptions.find((o) => o.value === s)?.color ?? '#0369a1';
const PAGE_SIZE = 6;

type ReportStatus = string;

type Report = {
  id: string;
  description: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  waterLevel?: number;
  severity?: string;
  status: ReportStatus;
  createdAt: string;
};

function formatTime(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncate(val: string, max = 180) {
  if (val.length <= max) return val;
  return val.slice(0, max - 1) + '…';
}

export function ReportsPageContent() {
  const searchParams = useSearchParams();
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');

  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [waterLevel, setWaterLevel] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'success' | 'denied'>('idle');

  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('all');
  const [page, setPage] = useState(1);

  const fetchReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const data = await reportsService.getAll();
      setReports(Array.isArray(data) ? (data as Report[]) : []);
    } catch {
      setReports([]);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchReports();
    });
  }, [fetchReports]);

  // Check query params on mount
  useEffect(() => {
    if (latParam && lngParam) {
      const parsedLat = parseFloat(latParam);
      const parsedLng = parseFloat(lngParam);
      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        setLatitude(parsedLat);
        setLongitude(parsedLng);
        setLocation(`Map Pin Selection (${parsedLat.toFixed(5)}, ${parsedLng.toFixed(5)})`);
        setGpsStatus('success');
      }
    }
  }, [latParam, lngParam]);

  const detectLocation = useCallback(() => {
    if (latParam && lngParam) return; // Skip automatic location detect if prefilled from map
    if (!navigator.geolocation) {
      setGpsStatus('denied');
      return;
    }

    setGpsStatus('loading');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLat = pos.coords.latitude;
        const nextLon = pos.coords.longitude;

        setLatitude(nextLat);
        setLongitude(nextLon);
        setGpsStatus('success');

        fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${nextLat}&lon=${nextLon}&format=json`
        )
          .then((r) => r.json())
          .then((data: unknown) => {
            const displayName =
              typeof data === 'object' &&
              data !== null &&
              'display_name' in data &&
              typeof (data as { display_name?: unknown }).display_name === 'string'
                ? ((data as { display_name?: string }).display_name as string | undefined)
                : undefined;

            if (displayName) {
              setLocation((prev) => (prev ? prev : displayName.split(',').slice(0, 3).join(',').trim()));
            }
          })
          .catch(() => {});
      },
      () => setGpsStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    queueMicrotask(detectLocation);
  }, [detectLocation]);

  const stats = useMemo(() => {
    const total = reports.length;
    const pending = reports.filter((r) => r.status === 'pending').length;
    const verified = reports.filter((r) => r.status === 'verified' || r.status === 'resolved').length;

    const latest =
      reports
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.createdAt;

    return { total, pending, verified, latest };
  }, [reports]);

  const availableStatuses = useMemo(() => {
    const set = new Set<ReportStatus>();
    reports.forEach((r) => set.add(r.status));
    return Array.from(set).sort((a, b) => String(a).localeCompare(String(b)));
  }, [reports]);

  const sortedFiltered = useMemo(() => {
    const filtered = statusFilter === 'all' ? reports : reports.filter((r) => r.status === statusFilter);
    return filtered.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [reports, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const visibleReports = sortedFiltered.slice(pageStart, pageStart + PAGE_SIZE);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const desc = description.trim();
    if (!desc) {
      setError('Description is required.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await reportsService.create({
        description: desc,
        location: location.trim() || undefined,
        severity,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        waterLevel: waterLevel ? parseFloat(waterLevel) : undefined,
      });

      setSuccess('Flood report submitted. You can track it in the list below.');
      setDescription('');
      setWaterLevel('');
      await fetchReports();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : undefined;
      setError(msg || 'Failed to submit. Ensure you are logged in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Flood Reports"
        subtitle="Submit an incident and track its status"
        action={<span className="text-[12px] font-medium text-app-muted">{stats.latest ? `Latest: ${formatTime(stats.latest)}` : 'No submissions yet'}</span>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total reports"
          value={stats.total}
          accent="#0369a1"
          loading={loadingReports}
          icon={
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M6 2h8l2 2v14H4V4l2-2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M7.5 8.5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M7.5 12h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          }
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          accent={statusColor.pending}
          loading={loadingReports}
          icon={
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M10 2.5 18 7v6l-8 4.5L2 13V7l8-4.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
          }
        />
        <StatCard
          label="Verified / Resolved"
          value={stats.verified}
          accent={statusColor.verified}
          loading={loadingReports}
          icon={
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M16.5 6.5 8.5 14.5 3.5 9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <StatCard
          label="Latest"
          value={stats.latest ? formatTime(stats.latest).split(' ').slice(1).join(' ') : '—'}
          accent="#16a34a"
          loading={false}
          icon={
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M3 10h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M10 3v14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ── Submit form ─────────────────────────── */}
        <SectionCard title="Submit a flood report" className="lg:col-span-7">
          {success && (
            <div className="mb-4 px-4 py-2.5 rounded-[10px] bg-[rgba(22,163,74,0.1)] border border-[rgba(22,163,74,0.22)] text-[#16a34a] text-sm">
              {success}
            </div>
          )}
          {error && (
            <div className="mb-4 px-4 py-2.5 rounded-[10px] bg-[rgba(220,38,38,0.1)] border border-[rgba(220,38,38,0.22)] text-[#dc2626] text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-x-5 gap-y-4">
            {/* Left column — location */}
            <div className="space-y-4">
              <div className="rounded-[10px] border border-app bg-[var(--accent-soft)] p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke={gpsStatus === 'success' ? '#16a34a' : 'currentColor'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 3a3 3 0 1 1 0 6a3 3 0 0 1 0-6Z" />
                      <path d="M10 9c3.5 0 6 2.2 6 5v3H4v-3c0-2.8 2.5-5 6-5Z" />
                    </svg>
                    <p className="text-xs text-app-muted truncate">
                      {gpsStatus === 'idle' && 'Auto-detect location'}
                      {gpsStatus === 'loading' && 'Detecting location…'}
                      {gpsStatus === 'success' && 'Location detected'}
                      {gpsStatus === 'denied' && 'Location access denied'}
                    </p>
                  </div>
                  <button type="button" onClick={detectLocation} className="min-h-9 px-3 rounded-[8px] text-[11px] text-accent hover:bg-[var(--glass-bg-2)] shrink-0">
                    {gpsStatus === 'success' ? 'Refresh' : 'Detect'}
                  </button>
                </div>

                <div className="mt-3">
                  <LocationPicker
                    latitude={latitude ?? 27.7172}
                    longitude={longitude ?? 85.324}
                    onChange={(lat, lng) => {
                      setLatitude(lat);
                      setLongitude(lng);
                    }}
                    height="200px"
                    color="#a855f7"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-app font-semibold mb-1.5 block">Location name / address</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Kathmandu, Ward 10"
                  className="form-control px-4 py-2.5 text-sm"
                />
                <p className="text-[10px] text-app-muted mt-1">Auto-filled from GPS (you can edit).</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-app font-semibold mb-1.5 block">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={latitude ?? ''}
                    onChange={(e) => setLatitude(e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="27.7172"
                    className="form-control px-3 py-2.5 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-app font-semibold mb-1.5 block">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={longitude ?? ''}
                    onChange={(e) => setLongitude(e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="85.3240"
                    className="form-control px-3 py-2.5 text-sm font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Right column — details */}
            <div className="space-y-4">
              <div>
                <label className="text-xs text-app font-semibold mb-1.5 block">Estimated water level (meters)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={waterLevel}
                  onChange={(e) => setWaterLevel(e.target.value)}
                  placeholder="e.g. 1.5"
                  className="form-control px-4 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-app font-semibold mb-1.5 block">Impact severity</label>
                <div className="grid grid-cols-2 gap-2">
                  {severityOptions.map((o) => {
                    const active = severity === o.value;
                    return (
                      <button
                        type="button"
                        key={o.value}
                        onClick={() => setSeverity(o.value)}
                        aria-pressed={active}
                        title={o.hint}
                        className="group relative rounded-[10px] px-3 py-2 text-left transition-all duration-200 border min-h-[58px]"
                        style={{
                          borderColor: active ? o.color : 'var(--border)',
                          background: active ? `${o.color}16` : 'var(--glass-bg-2)',
                        }}
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: o.color, boxShadow: active ? `0 0 8px 1px ${o.color}` : 'none' }} />
                          <span className="text-[13px] font-medium" style={{ color: active ? o.color : 'var(--text)' }}>{o.label}</span>
                        </span>
                        <span className="block text-[10px] text-app-muted mt-0.5 leading-tight truncate">{o.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs text-app font-semibold mb-1.5 block">Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What happened? (damage, road conditions, people affected…)"
                  rows={3}
                  required
                  className="form-control px-4 py-2.5 text-sm resize-none min-h-[104px]"
                />
              </div>
            </div>

            {/* Full-width submit */}
            <button
              type="submit"
              disabled={submitting}
              className="md:col-span-2 btn-primary w-full px-6 py-3 text-sm"
            >
              {submitting ? (
                <svg className="animate-spin h-4 w-4 relative" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : null}
              <span className="relative">{submitting ? 'Submitting…' : 'Submit Flood Report'}</span>
            </button>
          </form>
        </SectionCard>

        {/* ── My reports ──────────────────────────── */}
        <SectionCard
          title="My reports"
          className="lg:col-span-5"
          action={
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as ReportStatus | 'all');
                setPage(1);
              }}
              className="form-control min-h-10 w-full sm:w-auto px-3 py-2 text-sm capitalize"
            >
              <option value="all">All statuses</option>
              {availableStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          }
        >
          {loadingReports ? (
            <LoadingRows count={4} />
          ) : sortedFiltered.length === 0 ? (
            <EmptyState
              message={
                statusFilter === 'all'
                  ? 'No reports yet. Submit your first flood report.'
                  : 'No reports match this status.'
              }
            />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-3">
                {visibleReports.map((r) => {
                  const c = statusColor[r.status] ?? '#0369a1';
                  const sev = severityColor(r.severity);
                  return (
                    <div
                      key={r.id}
                      className="group relative pl-4 pr-4 py-4 rounded-[10px] border border-app bg-[var(--glass-bg-2)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] transition-all duration-200 overflow-hidden"
                    >
                      {/* severity accent bar */}
                      <span className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r" style={{ background: sev }} />

                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c }} />
                            <p className="text-app font-medium text-[14px] truncate">
                              {r.location ? r.location : 'Unspecified location'}
                            </p>
                          </div>
                          <p className="text-app-muted text-[12px] mt-1 truncate">{formatTime(r.createdAt)}</p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {r.severity ? (
                            <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-[6px]" style={{ background: `${sev}1f`, color: sev }}>
                              {r.severity}
                            </span>
                          ) : null}
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-[6px] capitalize" style={{ background: `${c}22`, color: c }}>
                            {r.status}
                          </span>
                        </div>
                      </div>

                      <p className="text-app text-[13px] mt-3 line-clamp-2 leading-relaxed">{truncate(r.description, 180)}</p>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                        {typeof r.waterLevel === 'number' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] font-medium" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)' }}>
                            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                              <path d="M3 12c1.4 1.1 2.8 1.1 4.2 0 1.5-1.1 3-1.1 4.5 0 1.4 1.1 2.9 1.1 4.3 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                              <path d="M5 8.5c1.1.9 2.2.9 3.3 0 1.1-.9 2.2-.9 3.3 0 1.1.9 2.2.9 3.4 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.65" />
                            </svg>
                            {r.waterLevel}m water level
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] font-mono text-app-muted bg-[var(--accent-soft)]">
                          <svg width="13" height="13" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                            <path d="M10 2.5a5.5 5.5 0 0 1 5.5 5.5c0 4.5-5.5 9.5-5.5 9.5S4.5 12.5 4.5 8A5.5 5.5 0 0 1 10 2.5Z" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M10 6.5a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4Z" stroke="currentColor" strokeWidth="1.5" />
                          </svg>
                          {typeof r.latitude === 'number' && typeof r.longitude === 'number'
                            ? `${r.latitude.toFixed(3)}, ${r.longitude.toFixed(3)}`
                            : 'No coordinates'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-app">
                <p className="text-[12px] text-app-muted">
                  Showing {pageStart + 1}-{Math.min(pageStart + visibleReports.length, sortedFiltered.length)} of {sortedFiltered.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((v) => Math.max(1, v - 1))}
                    disabled={safePage === 1}
                    className="min-h-10 px-3 rounded-[8px] border border-app text-[12px] font-medium text-app-muted hover:text-app hover:bg-[var(--accent-soft)] disabled:opacity-45 disabled:pointer-events-none"
                  >
                    Previous
                  </button>
                  <span className="min-h-10 px-3 rounded-[8px] border border-app bg-[var(--glass-bg-2)] text-[12px] font-semibold text-app flex items-center">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
                    disabled={safePage === totalPages}
                    className="min-h-10 px-3 rounded-[8px] border border-app text-[12px] font-medium text-app-muted hover:text-app hover:bg-[var(--accent-soft)] disabled:opacity-45 disabled:pointer-events-none"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
            )}
          </SectionCard>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin" />
      </div>
    }>
      <ReportsPageContent />
    </Suspense>
  );
}
