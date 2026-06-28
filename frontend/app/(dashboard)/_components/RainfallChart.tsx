"use client";

import { useRainfall } from "@/app/queries/weather";

export default function RainfallChart({ city = "Kathmandu" }: { city?: string }) {
  const { data, isLoading, isError } = useRainfall(city);

  if (isLoading) {
    return (
      <div className="surface-card rounded-[12px] p-5">
        <div className="h-5 w-48 rounded bg-[var(--accent-soft)] animate-pulse mb-4" />
        <div className="h-[200px] rounded-[10px] bg-[var(--accent-soft)] animate-pulse" />
      </div>
    );
  }

  if (isError || !data?.hourly) return null;

  const { hourly, accumulation } = data;
  const next24Times = hourly.time.slice(0, 24);
  const next24Rain = hourly.precipitation.slice(0, 24);
  const next24Prob = hourly.precipitation_probability.slice(0, 24);
  const maxRain = Math.max(...next24Rain, 2);

  return (
    <div className="surface-card rounded-[12px] p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-[#0369a1]">
            <path d="M10 3v10M7 10l3 3 3-3M5 16h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h3 className="text-[14px] font-[650] text-app">24h Rainfall Forecast</h3>
        </div>
        <span className="text-[11px] text-app-muted">{city}</span>
      </div>

      <p className="text-[11px] text-app-muted mb-4">
        Expected accumulation: <span className="font-semibold text-app">{accumulation.next24h}mm</span> over 24 hours
      </p>

      {/* Bar chart */}
      <div className="flex items-end gap-[2px] h-[140px] mb-2">
        {next24Rain.map((rain, i) => {
          const height = Math.max((rain / maxRain) * 100, 2);
          const prob = next24Prob[i] || 0;
          const isHeavy = rain > 5;
          const isMod = rain > 2;
          const color = isHeavy ? "#dc2626" : isMod ? "#0369a1" : rain > 0.1 ? "#0ea5e9" : "var(--accent-soft)";

          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
              {/* Tooltip on hover */}
              <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 pointer-events-none">
                <div className="bg-[#1a1a2e] text-white text-[10px] px-2 py-1 rounded-[6px] whitespace-nowrap shadow-lg">
                  <div className="font-semibold">{rain.toFixed(1)}mm</div>
                  <div className="text-[9px] opacity-70">{prob}% chance</div>
                </div>
              </div>
              <div
                className="w-full rounded-t-[3px] transition-all duration-300 min-h-[2px]"
                style={{ height: `${height}%`, background: color, opacity: prob > 30 ? 1 : 0.5 }}
              />
            </div>
          );
        })}
      </div>

      {/* Time labels */}
      <div className="flex justify-between text-[9px] text-app-muted px-0.5">
        {next24Times.filter((_, i) => i % 6 === 0).map((t) => (
          <span key={t}>{new Date(t).toLocaleTimeString([], { hour: "2-digit", hour12: true })}</span>
        ))}
      </div>

      {/* Probability line */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold text-app-muted">Precipitation Probability</p>
        </div>
        <div className="flex items-end gap-[2px] h-[40px]">
          {next24Prob.map((prob, i) => (
            <div key={i} className="flex-1 flex items-end h-full">
              <div
                className="w-full rounded-t-[2px]"
                style={{ height: `${prob}%`, background: prob > 70 ? "rgba(3,105,161,0.5)" : "rgba(3,105,161,0.2)" }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[9px] text-app-muted mt-1">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-app-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[#dc2626]" /> Heavy (&gt;5mm/h)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[#0369a1]" /> Moderate (2-5mm/h)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[#0ea5e9]" /> Light (&lt;2mm/h)
        </span>
      </div>
    </div>
  );
}
