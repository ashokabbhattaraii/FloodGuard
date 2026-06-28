"use client";

import { useForecast } from "@/app/queries/weather";

const wmoIcon: Record<number, string> = {
  0: "M10 4a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 2v1M10 7v1M14 4h1M5 4H4M12.5 1.5l-.7.7M7.5 6.5l-.7.7M12.5 6.5l.7.7M7.5 1.5l.7.7",
  1: "M10 4a1.5 1.5 0 110 3 1.5 1.5 0 010-3z",
  2: "M6 8a4 4 0 01-.6-5A4.5 4.5 0 0114 5.5 3 3 0 0114 10H5",
  3: "M5 9a3 3 0 013-3 3 3 0 015.5-1A2.5 2.5 0 0115 9H5",
  61: "M7 12v2M10 13v2M13 12v2M5 9a3 3 0 013-3 3 3 0 015.5-1A2.5 2.5 0 0115 9H5",
  63: "M6 12v2M9 11v3M12 12v2M15 11v3M5 8a3 3 0 013-3 3 3 0 015.5-1A2.5 2.5 0 0115 8H5",
  65: "M5 12v2M8 11v3M11 12v2M14 11v3M5 8a3 3 0 013-3 3 3 0 015.5-1A2.5 2.5 0 0115 8H5",
  80: "M7 12v1.5M10 13v1.5M5 9a3 3 0 013-3 3 3 0 015.5-1A2.5 2.5 0 0115 9H5",
  95: "M9 12l1.5 3L12 12M5 9a3 3 0 013-3 3 3 0 015.5-1A2.5 2.5 0 0115 9H5",
};

function getIconPath(code: number): string {
  if (code <= 1) return wmoIcon[0];
  if (code <= 2) return wmoIcon[2];
  if (code <= 3) return wmoIcon[3];
  if (code >= 95) return wmoIcon[95];
  if (code >= 80) return wmoIcon[80];
  if (code >= 65) return wmoIcon[65];
  if (code >= 63) return wmoIcon[63];
  if (code >= 51) return wmoIcon[61];
  return wmoIcon[3];
}

function dayName(dateStr: string, index: number): string {
  if (index === 0) return "Today";
  if (index === 1) return "Tmrw";
  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" });
}

export default function WeatherForecast({ city = "Kathmandu" }: { city?: string }) {
  const { data, isLoading, isError } = useForecast(city);

  if (isLoading) {
    return (
      <div className="surface-card rounded-[12px] p-5">
        <div className="h-5 w-32 rounded bg-[var(--accent-soft)] animate-pulse mb-4" />
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-24 rounded-[10px] bg-[var(--accent-soft)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data?.daily) {
    return null;
  }

  const { daily } = data;
  const maxRain = Math.max(...daily.precipitation_sum, 5);
  const totalWeekRain = daily.precipitation_sum.reduce((s: number, v: number) => s + v, 0);
  const heavyDays = daily.precipitation_sum.filter((r: number) => r > 10).length;

  return (
    <div className="surface-card rounded-[12px] p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-accent">
            <path d="M6 8a4 4 0 01-.6-5A4.5 4.5 0 0114 5.5 3 3 0 0114 10H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h3 className="text-[14px] font-[650] text-app">7-Day Weather Forecast</h3>
        </div>
        <span className="text-[11px] text-app-muted">{city}</span>
      </div>

      {/* Week summary */}
      <div className="flex items-center gap-4 mb-4 text-[11px] text-app-muted">
        <span>Total rain: <span className="font-semibold text-app">{totalWeekRain.toFixed(1)}mm</span></span>
        {heavyDays > 0 && (
          <span className="text-[#dc2626] font-medium">{heavyDays} heavy rain day{heavyDays > 1 ? "s" : ""}</span>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {daily.time.map((date: string, i: number) => {
          const rain = daily.precipitation_sum[i];
          const high = Math.round(daily.temperature_2m_max[i]);
          const low = Math.round(daily.temperature_2m_min[i]);
          const code = daily.weather_code[i];
          const prob = daily.precipitation_probability_max?.[i];
          const rainHeight = Math.max((rain / maxRain) * 100, 4);
          const isHeavy = rain > 10;
          const isRainy = rain > 2;

          return (
            <div key={date} className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-[10px] transition-colors ${isHeavy ? "bg-[rgba(220,38,38,0.06)] border border-[rgba(220,38,38,0.15)]" : isRainy ? "bg-[rgba(3,105,161,0.06)]" : ""}`}>
              <span className="text-[10px] font-medium text-app-muted">{dayName(date, i)}</span>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={isHeavy ? "text-[#dc2626]" : "text-app-muted"}>
                <path d={getIconPath(code)} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[12px] font-semibold text-app tabular-nums">{high}°</span>
                <span className="text-[10px] text-app-muted tabular-nums">{low}°</span>
              </div>
              <div className="w-full mt-1">
                <div className="w-full h-[4px] rounded-full bg-[var(--accent-soft)] overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${rainHeight}%`, background: isHeavy ? "#dc2626" : isRainy ? "#0369a1" : "var(--accent-soft)" }} />
                </div>
                <span className={`block text-center text-[9px] mt-0.5 tabular-nums font-medium ${isHeavy ? "text-[#dc2626]" : isRainy ? "text-accent" : "text-app-muted"}`}>
                  {rain.toFixed(1)}mm
                </span>
                {prob !== undefined && (
                  <span className="block text-center text-[8px] text-app-muted tabular-nums">{prob}%</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Warning messages */}
      {daily.precipitation_sum.some((r: number) => r > 20) && (
        <div className="mt-3 px-3 py-2 rounded-[8px] bg-[rgba(220,38,38,0.06)] border border-[rgba(220,38,38,0.15)] flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="shrink-0 text-[#dc2626]">
            <path d="M10 3v8M10 14v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span className="text-[11px] text-[#dc2626] font-medium">Very heavy rainfall forecast — elevated flood risk, prepare for possible evacuation</span>
        </div>
      )}
      {!daily.precipitation_sum.some((r: number) => r > 20) && daily.precipitation_sum.some((r: number) => r > 10) && (
        <div className="mt-3 px-3 py-2 rounded-[8px] bg-[rgba(3,105,161,0.06)] border border-[rgba(3,105,161,0.15)] flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="shrink-0 text-accent">
            <path d="M10 3v8M10 14v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span className="text-[11px] text-accent font-medium">Heavy rainfall expected — monitor water levels closely</span>
        </div>
      )}
    </div>
  );
}
