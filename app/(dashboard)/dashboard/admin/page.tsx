"use client";

import { useAlerts } from "@/app/queries/alerts";
import { useReports } from "@/app/queries/reports";
import { useRegions } from "@/app/queries/regions";
import { useFloodRequestAnalytics } from "@/app/queries/flood-requests";
import { PageHeader, StatCard, SectionCard, AlertRow, EmptyState, LoadingRows } from "@/app/(dashboard)/_components/DashboardUI";
import ResponseAnalytics from "@/app/(dashboard)/_components/ResponseAnalytics";
import SensorGauges from "@/app/(dashboard)/_components/SensorGauges";
import FloodRiskBanner from "@/app/(dashboard)/_components/FloodRiskBanner";
import RainfallChart from "@/app/(dashboard)/_components/RainfallChart";
import WeatherForecast from "@/app/(dashboard)/_components/WeatherForecast";

const ic = (d: string) => <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d={d} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;

export default function AdminOverview() {
  const alerts = useAlerts();
  const reports = useReports();
  const regions = useRegions();
  const sosAnalytics = useFloodRequestAnalytics();

  const alertList: Array<Record<string, unknown>> = Array.isArray(alerts.data) ? alerts.data : [];
  const reportList: Array<Record<string, unknown>> = Array.isArray(reports.data) ? reports.data : [];
  const regionList: Array<Record<string, unknown>> = Array.isArray(regions.data) ? regions.data : [];

  const activeAlerts = alertList.filter((a) => a.status !== "resolved").length;
  const pendingReports = reportList.filter((r) => r.status === "pending").length;

  const sosStats = sosAnalytics.data || {
    total: 0,
    pending: 0,
    assigned: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    avgResolutionMinutes: 0,
  };

  return (
    <div>
      <PageHeader title="Authority Overview" subtitle="Monitor alerts, reports, and regional risk in real time."
        action={
          <div className="flex gap-2">
            <a href="/dashboard/admin/alerts" className="btn-primary hidden sm:inline-flex px-5 py-2.5 text-[14px]">Issue Alert</a>
          </div>
        } />

      {/* Flood Risk Assessment — top priority for authorities */}
      <FloodRiskBanner city="Kathmandu" />

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Alerts" value={activeAlerts} accent="#dc2626" loading={alerts.isLoading}
          icon={ic("M15 7a5 5 0 00-10 0c0 5.5-2 7-2 7h14s-2-1.5-2-7")} />
        <StatCard label="Pending Reports" value={pendingReports} accent="#ca8a04" loading={reports.isLoading}
          icon={ic("M5 3h7l3 3v11H5zM12 3v3h3")} />
        <StatCard label="Regions Covered" value={regionList.length} accent="#0369a1" loading={regions.isLoading}
          icon={ic("M10 2a6 6 0 016 6c0 4-6 10-6 10S4 12 4 8a6 6 0 016-6z")} />
        <StatCard label="Response Efficiency" value={`${sosStats.avgResolutionMinutes} min`} accent="#16a34a" loading={sosAnalytics.isLoading}
          icon={ic("M12 8v4l3 3M3 12a9 9 0 1018 0 9 9 0 00-18 0")} />
      </div>

      {/* SOS Operations Subpanel */}
      <SectionCard title="Emergency Response (SOS) Status Dashboard" className="mb-6"
        action={<a href="/dashboard/admin/requests" className="text-[12px] text-accent hover:underline">SOS Operations Command →</a>}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
            <span className="block text-[11px] uppercase font-bold text-red-400">Stranded Residents</span>
            <span className="block text-2xl font-[650] text-red-500 mt-1 tabular-nums">
              {sosAnalytics.isLoading ? "..." : sosStats.pending}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
            <span className="block text-[11px] uppercase font-bold text-orange-400">Assigned / Dispatched</span>
            <span className="block text-2xl font-[650] text-orange-500 mt-1 tabular-nums">
              {sosAnalytics.isLoading ? "..." : sosStats.assigned}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-sky-500/5 border border-sky-500/10">
            <span className="block text-[11px] uppercase font-bold text-sky-400">Active Rescues</span>
            <span className="block text-2xl font-[650] text-sky-500 mt-1 tabular-nums">
              {sosAnalytics.isLoading ? "..." : sosStats.inProgress}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
            <span className="block text-[11px] uppercase font-bold text-emerald-400">Resolved Rescues</span>
            <span className="block text-2xl font-[650] text-emerald-500 mt-1 tabular-nums">
              {sosAnalytics.isLoading ? "..." : sosStats.completed}
            </span>
          </div>
        </div>
      </SectionCard>

      {/* Weather Intelligence — Rainfall + Forecast */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <RainfallChart city="Kathmandu" />
        <WeatherForecast city="Kathmandu" />
      </div>

      {/* Analytics + Sensors */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <ResponseAnalytics />
        <SensorGauges />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Active Alerts"
          action={<a href="/dashboard/admin/alerts" className="text-[12px] text-accent hover:underline">Manage →</a>}>
          {alerts.isLoading ? <LoadingRows /> : alertList.length === 0 ? <EmptyState message="No active alerts." /> : (
            <div className="flex flex-col gap-1">
              {alertList.slice(0, 6).map((a) => (
                <AlertRow key={String(a.id)} title={String(a.title)} region={a.regionName as string} severity={a.severity as string}
                  time={a.createdAt ? new Date(a.createdAt as string).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : undefined} />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Report Queue"
          action={<a href="/dashboard/admin/reports" className="text-[12px] text-accent hover:underline">Review →</a>}>
          {reports.isLoading ? <LoadingRows /> : reportList.length === 0 ? <EmptyState message="No community reports yet." /> : (
            <div className="flex flex-col gap-1">
              {reportList.slice(0, 6).map((r) => (
                <AlertRow key={String(r.id)} title={String(r.description ?? "Flood report").slice(0, 48)}
                  region={(r.location as string) ?? (r.userName as string)} severity={r.severity as string}
                  time={typeof r.status === "string" ? r.status : undefined} />
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

