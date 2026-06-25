"use client";

import { useAuth } from "@/app/queries/auth";
import { useAlerts } from "@/app/queries/alerts";
import { useReports } from "@/app/queries/reports";
import { useWeather } from "@/app/queries/weather";
import { useEvacuationRoutes } from "@/app/queries/evacuation";
import { PageHeader, StatCard, SectionCard, AlertRow, EmptyState, LoadingRows } from "@/app/(dashboard)/_components/DashboardUI";
import NearestShelterCard from "@/app/_components/ui/NearestShelterCard";
import WeatherForecast from "@/app/(dashboard)/_components/WeatherForecast";
import SensorGauges from "@/app/(dashboard)/_components/SensorGauges";
import PreparednessTips from "@/app/(dashboard)/_components/PreparednessTips";
import FloodRiskBanner from "@/app/(dashboard)/_components/FloodRiskBanner";
import RainfallChart from "@/app/(dashboard)/_components/RainfallChart";

const ic = (d: string) => <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d={d} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;

function num(v: unknown): number | null {
  return typeof v === "number" && !Number.isNaN(v) ? v : null;
}

/* WMO weather interpretation codes → human description (Open-Meteo). */
function wmoDescription(code: number | null): string {
  if (code === null) return "—";
  const map: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Rime fog",
    51: "Light drizzle", 53: "Drizzle", 55: "Dense drizzle",
    56: "Freezing drizzle", 57: "Freezing drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain",
    66: "Freezing rain", 67: "Freezing rain",
    71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
    80: "Light showers", 81: "Showers", 82: "Violent showers",
    85: "Snow showers", 86: "Snow showers",
    95: "Thunderstorm", 96: "Thunderstorm w/ hail", 99: "Severe thunderstorm",
  };
  return map[code] ?? "—";
}

export default function ResidentOverview() {
  const auth = useAuth();
  const alerts = useAlerts();
  const reports = useReports();
  const weather = useWeather("Kathmandu");
  const shelters = useEvacuationRoutes();
  const shelterCount = Array.isArray(shelters.data) ? shelters.data.length : 0;

  const w = weather.data;
  const temp = num(w?.temperature);
  const feels = num(w?.apparentTemperature);
  const humidity = num(w?.humidity);
  const wind = num(w?.windSpeed);
  const rain = num(w?.precipitation) ?? 0;
  const condition = wmoDescription(num(w?.weatherCode));
  const cityName = "Kathmandu";

  const alertList: Array<Record<string, unknown>> = Array.isArray(alerts.data) ? alerts.data : [];
  const reportList: Array<Record<string, unknown>> = Array.isArray(reports.data) ? reports.data : [];
  const activeAlerts = alertList.filter((a) => a.status !== "resolved").length;
  const criticalCount = alertList.filter((a) => a.severity === "critical" || a.severity === "high").length;

  const firstName = (auth.data?.name as string | undefined)?.split(" ")[0] ?? "there";
  const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div>
      <PageHeader title={`Welcome back, ${firstName}`} subtitle={date} />

      {/* Flood Risk Assessment Banner — most prominent element */}
      <FloodRiskBanner city="Kathmandu" />

      {/* Active alert status */}
      <div className="rounded-[12px] p-5 mb-6 flex items-center gap-4 border relative overflow-hidden shadow-[var(--shadow-card)]"
        style={{ background: criticalCount > 0 ? "rgba(220,38,38,0.08)" : "rgba(22,163,74,0.08)", borderColor: criticalCount > 0 ? "rgba(220,38,38,0.3)" : "rgba(22,163,74,0.3)" }}>
        <span className="relative flex w-3 h-3 shrink-0">
          <span className="animate-ping absolute inset-0 rounded-full opacity-60" style={{ background: criticalCount > 0 ? "#dc2626" : "#16a34a" }} />
          <span className="relative rounded-full w-3 h-3" style={{ background: criticalCount > 0 ? "#dc2626" : "#16a34a" }} />
        </span>
        <div>
          <p className="text-[15px] font-semibold text-app">
            {criticalCount > 0 ? `${criticalCount} high-priority alert${criticalCount > 1 ? "s" : ""} in your area` : "No active threats in your area"}
          </p>
          <p className="text-[13px] text-app-muted mt-0.5">Response monitoring updated just now</p>
        </div>
      </div>

      {/* Weather hero card */}
      <div className="surface-card rounded-[12px] p-6 mb-6 relative overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-accent">{ic("M6 16a4 4 0 01-1-7.9A5 5 0 0116 7a3.5 3.5 0 013 5.5")}</span>
            <h2 className="text-[14px] font-medium text-app">Current Weather · {cityName}</h2>
          </div>
          <span className="text-[12px] text-app-muted capitalize px-3 py-1 rounded-[100px] glass-1">{condition}</span>
        </div>

        {weather.isLoading ? (
          <div className="h-24 rounded-[12px] bg-[var(--accent-soft)] animate-pulse" />
        ) : weather.isError || temp === null ? (
          <EmptyState message="Weather data unavailable right now." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-5 items-end">
            <div>
              <p className="text-[clamp(36px,5vw,52px)] font-[700] leading-none text-app tabular-nums">{Math.round(temp)}<span className="text-[24px] text-app-muted">°C</span></p>
              <p className="text-[12px] text-app-muted mt-2 capitalize">{condition}</p>
            </div>
            <WeatherStat label="Feels like" value={feels !== null ? `${Math.round(feels)}°C` : "—"} />
            <WeatherStat label="Humidity" value={humidity !== null ? `${humidity}%` : "—"} />
            <WeatherStat label="Wind" value={wind !== null ? `${wind.toFixed(1)} km/h` : "—"} />
            <WeatherStat label="Rain (1h)" value={`${rain} mm`} accent={rain > 0 ? "#0369a1" : undefined} />
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Alerts" value={activeAlerts} accent="#dc2626" loading={alerts.isLoading}
          icon={ic("M15 7a5 5 0 00-10 0c0 5.5-2 7-2 7h14s-2-1.5-2-7")} />
        <StatCard label="My Reports" value={reportList.length} accent="#0369a1" loading={reports.isLoading}
          icon={ic("M5 3h7l3 3v11H5zM12 3v3h3")} />
        <StatCard label="Region Status" value={criticalCount > 0 ? "High" : "Safe"} accent={criticalCount > 0 ? "#ca8a04" : "#16a34a"}
          icon={ic("M10 2a6 6 0 016 6c0 4-6 10-6 10S4 12 4 8a6 6 0 016-6z")} />
        <StatCard label="Safe Shelters" value={shelterCount} accent="#16a34a" loading={shelters.isLoading}
          icon={ic("M10 3l7 6v8H3V9l7-6z")} />
      </div>

      {/* Rainfall forecast — full width for maximum visibility */}
      <div className="mb-6">
        <RainfallChart city="Kathmandu" />
      </div>

      {/* 7-Day forecast + Sensor readings */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <WeatherForecast city="Kathmandu" />
        <SensorGauges />
      </div>

      {/* Alerts + quick actions */}
      <div className="grid lg:grid-cols-3 gap-6">
        <SectionCard title="Active Alerts" className="lg:col-span-2"
          action={<a href="/dashboard/resident/alerts" className="text-[12px] text-accent hover:underline">View all →</a>}>
          {alerts.isLoading ? (
            <LoadingRows />
          ) : alertList.length === 0 ? (
            <EmptyState message="No active alerts. You're all clear." />
          ) : (
            <div className="flex flex-col gap-1">
              {alertList.slice(0, 5).map((a) => (
                <AlertRow key={String(a.id)} title={String(a.title)} region={a.regionName as string} severity={a.severity as string}
                  time={a.createdAt ? new Date(a.createdAt as string).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : undefined} />
              ))}
            </div>
          )}
        </SectionCard>

        <div className="flex flex-col gap-6">
        <NearestShelterCard />
        <SectionCard title="Quick Actions">
          <div className="flex flex-col gap-2.5">
            <a href="/dashboard/resident/reports" className="flex items-center gap-3 px-4 py-3.5 rounded-[10px] border border-app bg-[var(--glass-bg-2)] hover:bg-[var(--accent-soft)] transition-all text-[14px] text-app">
              <span className="text-accent">{ic("M10 4v12M4 10h12")}</span> Submit a flood report
            </a>
            <a href="/dashboard/resident/map" className="flex items-center gap-3 px-4 py-3.5 rounded-[10px] border border-app bg-[var(--glass-bg-2)] hover:bg-[var(--accent-soft)] transition-all text-[14px] text-app">
              <span className="text-accent">{ic("M7 3L3 5v12l4-2 6 2 4-2V3l-4 2-6-2z")}</span> Open flood map
            </a>
            <a href="/dashboard/resident/evacuation" className="flex items-center gap-3 px-4 py-3.5 rounded-[10px] border border-app bg-[var(--glass-bg-2)] hover:bg-[var(--accent-soft)] transition-all text-[14px] text-app">
              <span className="text-accent">{ic("M10 3l7 6v8H3V9l7-6z")}</span> Find shelters
            </a>
          </div>
        </SectionCard>
        </div>
      </div>

      {/* Preparedness checklist */}
      <div className="mt-6">
        <PreparednessTips />
      </div>
    </div>
  );
}

function WeatherStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <p className="text-[11px] text-app-muted">{label}</p>
      <p className="text-[18px] font-[600] mt-1 tabular-nums" style={{ color: accent ?? "var(--text)" }}>{value}</p>
    </div>
  );
}
