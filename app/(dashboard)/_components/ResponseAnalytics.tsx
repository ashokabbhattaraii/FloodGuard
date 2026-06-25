"use client";

import { useAlerts } from "@/app/queries/alerts";
import { useReports } from "@/app/queries/reports";

type Alert = { id: string; status: string; severity: string; createdAt: string; resolvedAt?: string };
type Report = { id: string; status: string; createdAt: string };

function minutesBetween(a: string, b: string): number {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000));
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h ${minutes % 60}m`;
  return `${Math.round(minutes / 1440)}d`;
}

export default function ResponseAnalytics() {
  const alerts = useAlerts();
  const reports = useReports();

  const alertList: Alert[] = Array.isArray(alerts.data) ? (alerts.data as Alert[]) : [];
  const reportList: Report[] = Array.isArray(reports.data) ? (reports.data as Report[]) : [];

  const resolvedAlerts = alertList.filter((a) => a.status === "resolved" && a.resolvedAt);
  const avgResolution = resolvedAlerts.length > 0
    ? Math.round(resolvedAlerts.reduce((sum, a) => sum + minutesBetween(a.createdAt, a.resolvedAt!), 0) / resolvedAlerts.length)
    : 0;

  const totalAlerts = alertList.length;
  const activeAlerts = alertList.filter((a) => a.status === "active").length;
  const resolutionRate = totalAlerts > 0 ? Math.round((resolvedAlerts.length / totalAlerts) * 100) : 0;

  const pendingReports = reportList.filter((r) => r.status === "pending").length;
  const verifiedReports = reportList.filter((r) => r.status === "verified").length;
  const reportVerificationRate = reportList.length > 0 ? Math.round((verifiedReports / reportList.length) * 100) : 0;

  const severityCounts = {
    critical: alertList.filter((a) => a.severity === "critical").length,
    high: alertList.filter((a) => a.severity === "high").length,
    medium: alertList.filter((a) => a.severity === "medium").length,
    low: alertList.filter((a) => a.severity === "low").length,
  };
  const maxSev = Math.max(...Object.values(severityCounts), 1);

  const isLoading = alerts.isLoading || reports.isLoading;

  if (isLoading) {
    return (
      <div className="surface-card rounded-[12px] p-5">
        <div className="h-5 w-44 rounded bg-[var(--accent-soft)] animate-pulse mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-[10px] bg-[var(--accent-soft)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="surface-card rounded-[12px] p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[14px] font-[650] text-app">Response Performance</h3>
        <span className="text-[10px] text-app-muted">All time</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <MetricBox label="Avg Resolution" value={formatDuration(avgResolution)} color="#16a34a" />
        <MetricBox label="Resolution Rate" value={`${resolutionRate}%`} color="#0369a1" />
        <MetricBox label="Active Alerts" value={String(activeAlerts)} color="#dc2626" />
        <MetricBox label="Report Verification" value={`${reportVerificationRate}%`} color="#ca8a04" />
      </div>

      <div className="mb-4">
        <p className="text-[11px] font-semibold text-app-muted uppercase mb-2">Alert Severity Distribution</p>
        <div className="flex flex-col gap-2">
          {([
            { key: "critical", label: "Critical", color: "#dc2626" },
            { key: "high", label: "High", color: "#f97316" },
            { key: "medium", label: "Medium", color: "#0369a1" },
            { key: "low", label: "Low", color: "#16a34a" },
          ] as const).map((s) => (
            <div key={s.key} className="flex items-center gap-3">
              <span className="text-[10px] w-12 text-app-muted">{s.label}</span>
              <div className="flex-1 h-[6px] rounded-full bg-[var(--accent-soft)] overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${(severityCounts[s.key] / maxSev) * 100}%`, background: s.color }} />
              </div>
              <span className="text-[11px] font-semibold tabular-nums w-6 text-right text-app">{severityCounts[s.key]}</span>
            </div>
          ))}
        </div>
      </div>

      {pendingReports > 0 && (
        <div className="px-3 py-2.5 rounded-[8px] bg-[rgba(202,138,4,0.06)] border border-[rgba(202,138,4,0.15)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="text-[#ca8a04] shrink-0">
              <path d="M10 3v8M10 14v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span className="text-[11px] font-medium text-[#ca8a04]">{pendingReports} report{pendingReports > 1 ? "s" : ""} awaiting review</span>
          </div>
          <a href="/dashboard/admin/reports" className="text-[10px] text-accent hover:underline">Review →</a>
        </div>
      )}
    </div>
  );
}

function MetricBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-3 rounded-[10px] border border-app bg-[var(--glass-bg-2)]">
      <p className="text-[10px] text-app-muted font-medium uppercase">{label}</p>
      <p className="text-[20px] font-[650] mt-1 tabular-nums leading-none" style={{ color }}>{value}</p>
    </div>
  );
}
